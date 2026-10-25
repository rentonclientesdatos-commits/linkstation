import { createClient } from "@supabase/supabase-js";
import {
  RestaurantState,
  Reservation,
  DeliveryOrder,
  ReservationSource,
  MenuProduct,
} from "@/types/pedidos";
import { INITIAL_TABLES, INITIAL_ZONES } from "@/lib/mock-pedidos-data";
import { requireEnvAny } from "@/lib/env";
import { InventoryService } from "./inventory-service";

function getAdminClient() {
  const url = requireEnvAny(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  const key = requireEnvAny([
    "SUPABASE_SERVICE_ROLE_KEY",
    "SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
  ]);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export class RestaurantService {
  /**
   * Obtiene el estado actual del restaurante para un tenant (mesas, reservas, pedidos, zonas)
   */
  static async getRestaurantState(tenantId: string): Promise<RestaurantState> {
    try {
      const supabase = getAdminClient();
      const { data: tenant, error } = await supabase
        .from("tenants")
        .select("config")
        .eq("id", tenantId)
        .single();

      if (error || !tenant) {
        return {
          zones: INITIAL_ZONES,
          tables: INITIAL_TABLES,
          reservations: {},
          orders: [],
        };
      }

      const restConfig = (tenant.config as Record<string, unknown>)?.restaurant as
        | RestaurantState
        | undefined;
      if (!restConfig || !restConfig.tables) {
        return {
          zones: INITIAL_ZONES,
          tables: INITIAL_TABLES,
          reservations: {},
          orders: [],
          closedSales: [],
        };
      }

      return {
        zones: restConfig.zones || INITIAL_ZONES,
        tables: restConfig.tables || INITIAL_TABLES,
        reservations: restConfig.reservations || {},
        orders: restConfig.orders || [],
        closedSales: restConfig.closedSales || [],
      };
    } catch (e) {
      console.error("[RestaurantService] Error fetching state:", e);
      return {
        zones: INITIAL_ZONES,
        tables: INITIAL_TABLES,
        reservations: {},
        orders: [],
        closedSales: [],
      };
    }
  }

  /**
   * Guarda el estado del restaurante completo en el config del tenant
   */
  static async saveRestaurantState(tenantId: string, state: RestaurantState): Promise<boolean> {
    try {
      const supabase = getAdminClient();
      const { data: tenant } = await supabase
        .from("tenants")
        .select("config")
        .eq("id", tenantId)
        .single();

      const currentConfig = (tenant?.config as Record<string, unknown>) || {};
      const updatedConfig = {
        ...currentConfig,
        restaurant: state,
      };

      const { error } = await supabase
        .from("tenants")
        .update({ config: updatedConfig })
        .eq("id", tenantId);

      if (error) {
        console.error("[RestaurantService] Error saving state:", error);
        return false;
      }
      return true;
    } catch (e) {
      console.error("[RestaurantService] Exception saving state:", e);
      return false;
    }
  }

  /**
   * Consulta la disponibilidad de mesas en tiempo real en la sección de mesas del restaurante
   * Sin importar el porte/capacidad de la mesa
   */
  static async checkTableAvailability(
    tenantId: string,
    params?: {
      date?: string;
      time?: string;
      guests?: number;
      zonePreference?: string;
    }
  ): Promise<{
    success: boolean;
    available: boolean;
    availableCount: number;
    totalTables: number;
    message: string;
    availableTables: { number: number; name: string; zone: string; capacity: number }[];
    zones: string[];
  }> {
    try {
      const state = await this.getRestaurantState(tenantId);
      const allTables = state.tables || [];

      // Mesas disponibles sin importar la capacidad
      let availableTables = allTables.filter((t) => t.status === "disponible");

      if (params?.zonePreference) {
        const filteredByZone = availableTables.filter(
          (t) =>
            t.zone.toLowerCase().includes(params.zonePreference!.toLowerCase()) ||
            params.zonePreference!.toLowerCase().includes(t.zone.toLowerCase())
        );
        if (filteredByZone.length > 0) {
          availableTables = filteredByZone;
        }
      }

      const zoneNames = (state.zones || []).map((z) => z.name);

      if (availableTables.length === 0) {
        return {
          success: true,
          available: false,
          availableCount: 0,
          totalTables: allTables.length,
          message:
            "No quedan mesas disponibles en este momento. Todas las mesas se encuentran ocupadas o reservadas.",
          availableTables: [],
          zones: zoneNames,
        };
      }

      return {
        success: true,
        available: true,
        availableCount: availableTables.length,
        totalTables: allTables.length,
        message: `Tenemos ${availableTables.length} mesa(s) disponibles para la reserva.`,
        availableTables: availableTables.map((t) => ({
          number: t.number,
          name: t.name,
          zone: t.zone,
          capacity: t.capacity,
        })),
        zones: zoneNames,
      };
    } catch (e: unknown) {
      console.error("[RestaurantService] checkTableAvailability error:", e);
      return {
        success: false,
        available: false,
        availableCount: 0,
        totalTables: 0,
        message: "Error al consultar disponibilidad de mesas.",
        availableTables: [],
        zones: [],
      };
    }
  }

  /**
   * Realiza una reserva de mesa solicitada vía IA (WhatsApp / Voz / Web)
   */
  static async bookTableReservation(
    tenantId: string,
    params: {
      date: string;
      time: string;
      guests: number;
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      zonePreference?: string;
      notes?: string;
      source?: ReservationSource;
    }
  ): Promise<{
    success: boolean;
    message: string;
    tableNumber?: number;
    tableName?: string;
    zone?: string;
    reservation?: Reservation;
  }> {
    try {
      const state = await this.getRestaurantState(tenantId);
      const guests = Math.max(1, Number(params.guests) || 1);

      // Buscar mesas disponibles sin importar el porte/capacidad de la mesa
      const availableTables = (state.tables || []).filter(
        (t) => t.status === "disponible"
      );

      if (availableTables.length === 0) {
        return {
          success: false,
          message: "No hay mesas disponibles en este momento en el restaurante.",
        };
      }

      // Priorizar zona preferida si se especificó
      let chosenTable = availableTables[0];
      if (params.zonePreference) {
        const matchingZone = availableTables.find(
          (t) =>
            t.zone.toLowerCase().includes(params.zonePreference!.toLowerCase()) ||
            params.zonePreference!.toLowerCase().includes(t.zone.toLowerCase())
        );
        if (matchingZone) chosenTable = matchingZone;
      }

      const resId = `res-${Date.now().toString().slice(-6)}`;
      const reservation: Reservation = {
        id: resId,
        tableId: chosenTable.id,
        tableNumber: chosenTable.number,
        customer: {
          name: params.customerName,
          phone: params.customerPhone,
          email: params.customerEmail,
          notes: params.notes,
        },
        dateTime: `${params.date} ${params.time}`.trim(),
        guestsCount: guests,
        status: "reservada",
        orderStatus: "pendiente",
        createdVia: params.source || "whatsapp",
        iaSummary: {
          channel: params.source || "whatsapp",
          timestamp: new Date().toISOString(),
          aiAgentName: "Agente IA WhatsApp",
          confidenceScore: 0.98,
          guestsCount: guests,
          summary: `Reserva confirmada para ${params.customerName} (${guests} personas) para el ${params.date} a las ${params.time}. Asignada ${chosenTable.name}.`,
          specialRequests: params.notes,
          keyTopics: ["Reserva WhatsApp", `Personas: ${guests}`],
        },
        items: [],
        totalAmount: 0,
      };

      // Actualizar mesa a reservada
      const updatedTables = state.tables.map((t) =>
        t.id === chosenTable.id
          ? { ...t, status: "reservada" as const, currentReservationId: resId }
          : t
      );

      const updatedReservations = {
        ...state.reservations,
        [resId]: reservation,
      };

      const updatedState: RestaurantState = {
        ...state,
        tables: updatedTables,
        reservations: updatedReservations,
      };

      await this.saveRestaurantState(tenantId, updatedState);

      const zoneName = state.zones.find((z) => z.id === chosenTable.zone)?.name || chosenTable.zone;

      return {
        success: true,
        message: `¡Reserva confirmada con éxito! Mesa asignada: ${chosenTable.name} (${zoneName}) para ${guests} personas el ${params.date} a las ${params.time}.`,
        tableNumber: chosenTable.number,
        tableName: chosenTable.name,
        zone: zoneName,
        reservation,
      };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Error desconocido";
      console.error("[RestaurantService] bookTableReservation error:", e);
      return {
        success: false,
        message: `Error al registrar la reserva: ${errMsg}`,
      };
    }
  }

  /**
   * Registra un pedido de delivery generado por la IA vía WhatsApp
   */
  static async createDeliveryOrder(
    tenantId: string,
    params: {
      customerName: string;
      customerPhone: string;
      deliveryAddress: string;
      items: unknown[] | unknown;
      totalAmount: number;
      notes?: string;
      source?: ReservationSource;
    }
  ): Promise<{
    success: boolean;
    message: string;
    order?: DeliveryOrder;
  }> {
    try {
      const state = await this.getRestaurantState(tenantId);
      const orderId = `deliv-${Date.now().toString().slice(-6)}`;

      let parsedItems = Array.isArray(params.items) ? params.items : [];
      if (typeof params.items === "string") {
        try {
          parsedItems = JSON.parse(params.items);
        } catch {
          parsedItems = [
            {
              id: "item-1",
              name: params.items,
              quantity: 1,
              unitPrice: params.totalAmount,
              category: "principal",
            },
          ];
        }
      }

      const newOrder: DeliveryOrder = {
        id: orderId,
        customer: {
          name: params.customerName,
          phone: params.customerPhone,
          address: params.deliveryAddress,
          notes: params.notes,
        },
        items: parsedItems,
        totalAmount: Number(params.totalAmount) || 0,
        status: "pendiente",
        createdAt: new Date().toISOString(),
        source: params.source || "whatsapp",
        notes: params.notes,
      };

      const updatedOrders = [newOrder, ...state.orders];
      const updatedState: RestaurantState = {
        ...state,
        orders: updatedOrders,
      };

      await this.saveRestaurantState(tenantId, updatedState);

      return {
        success: true,
        message: `¡Pedido Delivery registrado con éxito! ID de pedido: ${orderId}. Total a pagar: $${newOrder.totalAmount}. Dirección de entrega: ${params.deliveryAddress}.`,
        order: newOrder,
      };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Error desconocido";
      console.error("[RestaurantService] createDeliveryOrder error:", e);
      return {
        success: false,
        message: `Error al registrar el pedido delivery: ${errMsg}`,
      };
    }
  }

  /**
   * Guardrail anti-prompt injection para sanitizar mensajes provenientes de clientes en WhatsApp
   */
  static sanitizeUserMessage(input: string): string {
    if (!input || typeof input !== "string") return "";

    // 1. Limitar longitud máxima para prevenir ataques DoS / Context Overflow
    let sanitized = input.trim().slice(0, 1000);

    // 2. Patrones comunes de jailbreak y prompt injection
    const injectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts|directions)/gi,
      /olvida\s+(todas\s+)?(las\s+)?(instrucciones|reglas)\s+(anteriores|previas)/gi,
      /you\s+are\s+now\s+(in\s+)?(developer\s+mode|dan|jailbreak)/gi,
      /ahora\s+eres\s+(un\s+)?(modo\s+desarrollador|sin\s+restricciones)/gi,
      /system\s+prompt/gi,
      /<\|im_start\|>/gi,
      /<\|im_end\|>/gi,
      /<\|system\|>/gi,
      /\[SYSTEM\]/gi,
    ];

    for (const pattern of injectionPatterns) {
      sanitized = sanitized.replace(pattern, "[mensaje filtrado]");
    }

    return sanitized;
  }

  /**
   * Verifica la disponibilidad de un plato antes de que la IA lo ofrezca o confirme al cliente.
   * Si está agotado por falta de stock de insumos, devuelve automáticamente alternativas recomendadas.
   */
  static async checkAndOfferProduct(
    tenantId: string,
    productIdOrName: string
  ): Promise<{
    available: boolean;
    product?: MenuProduct;
    alternatives?: MenuProduct[];
    message: string;
  }> {
    try {
      const menu = await InventoryService.getMenu(tenantId);
      const target = menu.find(
        (p) =>
          p.id === productIdOrName ||
          p.name.toLowerCase().trim() === productIdOrName.toLowerCase().trim()
      );

      if (!target) {
        return {
          available: false,
          message: `El plato "${productIdOrName}" no se encuentra en nuestra carta actual.`,
        };
      }

      if (target.stockStatus === "agotado") {
        const alternatives = await InventoryService.getAlternatives(tenantId, target.id);
        return {
          available: false,
          product: target,
          alternatives,
          message: `Lamentablemente "${target.name}" se encuentra agotado por el momento. Te puedo ofrecer como alternativa: ${
            alternatives.map((a) => a.name).join(", ") || "otros platos de nuestra carta"
          }.`,
        };
      }

      return {
        available: true,
        product: target,
        message: `"${target.name}" está disponible ($${target.price.toLocaleString("es-CL")}).`,
      };
    } catch (e) {
      console.error("[RestaurantService] checkAndOfferProduct error:", e);
      return {
        available: true,
        message: `Plato disponible sujeto a confirmación.`,
      };
    }
  }

  /**
   * Genera el contexto de la carta en tiempo real para el System Prompt del agente de WhatsApp
   */
  static async getMenuContextForIA(tenantId: string): Promise<string> {
    return InventoryService.getMenuContextForIA(tenantId);
  }
}
