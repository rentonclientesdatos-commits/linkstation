import { z } from "zod";

/**
 * Esquema de fila para importación de campañas Jorklif (Cobranza y Cotizaciones).
 */
export const JorklifLeadRowSchema = z.object({
  cliente_nombre: z.string().min(1, "El nombre del cliente o empresa es obligatorio"),
  contacto_nombre: z.string().optional().default(""),
  telefono: z.string().min(8, "Teléfono inválido (debe tener al menos 8 dígitos)"),
  tipo_gestion: z
    .enum(["COBRANZA", "COTIZACION", "SERVICIO_TECNICO", "ARRIENDO_GRUAS"])
    .default("COBRANZA"),
  numero_documento: z.string().optional().default(""),
  monto_total: z.number().nonnegative().optional().default(0),
  dias_mora: z.number().int().nonnegative().optional().default(0),
  descripcion: z.string().optional().default(""),
  vendedor_responsable: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
});

export type JorklifLeadRow = z.infer<typeof JorklifLeadRowSchema>;

export interface JorklifImportError {
  row: number;
  field: string;
  message: string;
  value?: unknown;
}

export interface JorklifImportResult {
  success: boolean;
  totalRows: number;
  inserted: number;
  skipped: number;
  errors: JorklifImportError[];
  campaignName: string;
  error?: string;
}

export interface JorklifCampaignLeadItem {
  id: string;
  tenant_id: string;
  cliente_nombre: string;
  contacto_nombre: string;
  telefono: string;
  email?: string;
  tipo_gestion: "COBRANZA" | "COTIZACION" | "SERVICIO_TECNICO" | "ARRIENDO_GRUAS";
  numero_documento: string;
  monto_total: number;
  dias_mora: number;
  descripcion: string;
  vendedor_responsable: string;
  campana: string;
  current_stage: string;
  estado_llamada: "PENDIENTE" | "EN_LLAMADA" | "COMPLETADA" | "PROMESA_PAGO" | "NO_CONTESTA" | "ERROR";
  fecha_promesa_pago?: string;
  duracion_segundos?: number;
  resumen_llamada?: string;
  grabacion_url?: string;
  fecha_creacion: string;
  last_interaction_at?: string;
}
