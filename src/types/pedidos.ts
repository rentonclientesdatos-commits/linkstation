export type TableStatus = "disponible" | "reservada" | "ocupada" | "mantenimiento";
export type ReservationSource = "whatsapp" | "voice" | "web" | "manual";
export type OrderStatus = "pendiente" | "en_preparacion" | "servido" | "pagado";
export type TableShape = "round" | "square" | "rectangle";

export interface Zone {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  category: "entrante" | "principal" | "postre" | "bebida" | "especial";
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface IAConversationSummary {
  channel: ReservationSource;
  timestamp: string;
  summary: string;
  guestsCount: number;
  dietaryRestrictions?: string[];
  specialRequests?: string;
  aiAgentName: string;
  confidenceScore: number;
  keyTopics: string[];
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  isVip?: boolean;
  notes?: string;
}

export interface Table {
  id: string;
  number: number;
  name: string;
  capacity: number;
  zone: string; // Dynamic Zone ID (e.g. "terraza", "salon_principal", "vip", "pub_bar", etc.)
  status: TableStatus;
  position: { x: number; y: number }; // Percentage (0-100) on canvas
  shape: TableShape;
  currentReservationId?: string;
}

export interface Reservation {
  id: string;
  tableId: string;
  tableNumber: number;
  customer: CustomerInfo;
  dateTime: string;
  guestsCount: number;
  status: TableStatus;
  orderStatus: OrderStatus;
  iaSummary: IAConversationSummary;
  items: OrderItem[];
  totalAmount: number;
  createdVia: ReservationSource;
}

export interface DeliveryOrder {
  id: string;
  customer: CustomerInfo & { address: string };
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  source: ReservationSource;
  notes?: string;
}

export interface ClosedSale {
  id: string;
  ticketNumber: string;
  tableId: string;
  tableNumber: number;
  tableName: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  tipAmount: number;
  totalAmount: number;
  netAmount: number;
  ivaAmount: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  closedAt: string;
  closedBy?: string;
  zone?: string;
}

export interface RestaurantState {
  zones: Zone[];
  tables: Table[];
  reservations: Record<string, Reservation>;
  orders: DeliveryOrder[];
  closedSales?: ClosedSale[];
}

// -------------------------------------------------------------
// INVENTARIO & CARTA (Fudo POS Omnicanal)
// -------------------------------------------------------------

export type MenuCategory = "entrante" | "principal" | "postre" | "bebida" | "especial";
export type StockUnit = "unidad" | "kg" | "gr" | "lt" | "ml";
export type StockMovementType = "venta" | "merma" | "reposicion" | "ajuste_manual";
export type StockStatus = "disponible" | "bajo" | "agotado";

export interface RecipeItem {
  id?: string;
  ingredientId: string;
  ingredientName?: string;
  quantity: number;
  unit?: StockUnit;
}

export interface MenuProduct {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: MenuCategory;
  price: number;
  isActive: boolean;
  preparationTime?: number;
  allergens?: string[];
  imageKnowledgeBaseId?: string;
  recipe?: RecipeItem[];
  stockStatus?: StockStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Ingredient {
  id: string;
  tenantId: string;
  name: string;
  unit: StockUnit;
  stockCurrent: number;
  stockMin: number;
  costPerUnit: number;
  stockStatus: StockStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  ingredientId: string;
  ingredientName?: string;
  movementType: StockMovementType;
  quantity: number;
  reason?: string;
  orderId?: string;
  reservationId?: string;
  createdAt: string;
}
