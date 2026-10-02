export interface Tenant {
  id: string;
  name: string;
  username?: string;
  supabase_url: string;
  supabase_anon_key: string;
  client_email?: string;
  is_admin?: boolean;
  auth_user_id?: string;
  api_type?: "internal" | "client";
  business_type?: "restaurant" | "sales" | "other" | string;
  config: Record<string, unknown>;
  api_key?: string | null;
  daily_spend_limit?: number;
  monthly_spend_limit?: number;
  current_daily_spend?: number;
  current_monthly_spend?: number;
  last_spend_reset?: string;
  created_at?: string;
  updated_at?: string;
}

export interface KpiPart {
  id: string; // 'a', 'b', 'c', etc.
  targetCol: string;
  calcType: "count" | "sum" | "avg";
  condCol?: string;
  condOp?: "=" | "!=" | "ILIKE" | ">" | "<";
  condVal?: string;
  isExtraTarget?: boolean;
  isExtraCond?: boolean;
}

export interface KpiConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  size: "3" | "4" | "6" | "8" | "9" | "12";
  staticKey?: string;
  isVisible?: boolean;
  suffix?: string;
  group?: string;

  // Advanced Calculation Mode
  isAdvanced?: boolean;
  formula?: string; // e.g. "a / b" or "a - b"
  parts?: Record<string, KpiPart>;

  // Legacy / Simple mode (Backward Compatibility)
  calcType?: "count" | "sum" | "avg";
  targetCol?: string;
  isExtraTarget?: boolean;
  condCol?: string;
  isExtraCond?: boolean;
  condOp?: "=" | "!=" | "ILIKE" | ">" | "<";
  condVal?: string;

  hasDenominator?: boolean;
  denomCalcType?: "count" | "sum" | "avg";
  denomTargetCol?: string;
  denomIsExtraTarget?: boolean;
  denomCondCol?: string;
  denomIsExtraCond?: boolean;
  denomCondOp?: "=" | "!=" | "ILIKE" | ">" | "<";
  denomCondVal?: string;

  isPercentage?: boolean;
  valType?: "duration";
  order?: number;
}

export interface ChartConfig {
  id: string;
  type: "area" | "bar" | "donut" | "vertical-bar" | "heatmap" | "funnel";
  title: string;
  dataKey: string; // The key in the fetched results (static chart map key OR "table.column" for dynamic)
  xKey?: string; // table.column to group/label by (X-axis) — used in dynamic mode
  yKey?: string; // table.column or metric for the value axis (Y-axis) — used in dynamic mode
  calcType?: "count" | "sum" | "avg"; // How to aggregate the Y-axis value
  condCol?: string; // Optional conditional filter column
  condOp?: "=" | "!=" | "ILIKE" | ">" | "<"; // Operator for the filter
  condVal?: string; // Value for the filter
  size: "4" | "6" | "8" | "12";
  isVisible?: boolean;
  isDonut?: boolean;
  centerLabel?: string;

  // Advanced Calculation Mode (similar to KpiConfig)
  isAdvanced?: boolean;
  formula?: string;
  parts?: Record<string, KpiPart>;
  order?: number;
}

export interface TenantModuleDefinition {
  id: string;
  label: string;
  description: string;
  iconName?: string;
  defaultEnabled: boolean;
}

export const SYSTEM_MODULES: TenantModuleDefinition[] = [
  { id: "dashboard", label: "Dashboard & Métricas", description: "Métricas principales, llamadas y estadísticas", defaultEnabled: true },
  { id: "ai_agents", label: "Constructor & Agentes IA", description: "Agentes inteligentes, prompts y chatbot", defaultEnabled: true },
  { id: "voice_agents", label: "Llamadas y Agentes de Voz", description: "Historial de llamadas de voz y Ultravox", defaultEnabled: true },
  { id: "whatsapp", label: "WhatsApp & Conversaciones", description: "Bandeja de chats de WhatsApp y métricas", defaultEnabled: true },
  { id: "leads", label: "Gestión de Leads", description: "Historial, prospectos y detalles comerciales", defaultEnabled: true },
  { id: "calendar", label: "Calendario y Citas", description: "Agenda de citas y reuniones", defaultEnabled: true },
  { id: "campaigns", label: "Campañas de Marketing", description: "Creación y seguimiento de campañas", defaultEnabled: true },
  { id: "restaurant", label: "Pedidos & Mesas", description: "Comandas, mesas y carta de restaurante", defaultEnabled: false },
  { id: "simulator", label: "Simulador & Logs", description: "Pruebas interactivas de agentes y logs", defaultEnabled: false },
  { id: "costs", label: "Análisis de Costes", description: "Consumo de tokens, minutos y gastos", defaultEnabled: false },
  { id: "integrations", label: "Integraciones (Sheets / CRM)", description: "Conexión con Google Sheets y CRMs", defaultEnabled: true },
  { id: "docs", label: "Documentación y Ayuda", description: "Guías de usuario y soporte", defaultEnabled: true },
];

export interface TenantConfigData {
  dashboard_title?: string;
  primary_color?: string;
  logo_url?: string;
  headers?: string[];
  business_type?: "restaurant" | "sales" | "other" | string;
  kpis?: KpiConfig[];
  visible_modules?: string[];
  [key: string]: unknown;
}

export interface TenantConfig {
  tenantId: string;
  tenantName: string;
  config?: TenantConfigData | Record<string, unknown>;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  businessType?: string;
  logoUrl?: string;
}
