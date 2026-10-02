/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMemo, useState } from "react";
import { CRMSection } from "./integrations/crm-section";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Key,
  Phone,
  Mic,
  PhoneCall,
  Zap,
  RefreshCw,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Search,
  FileDown,
  ExternalLink,
  TestTube,
} from "lucide-react";
import { syncUltravoxResources } from "@/lib/actions/ultravox-sync";
import { syncWhatsAppTemplates } from "@/lib/actions/whatsapp-sync";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

interface TelephonyConfig {
  provider?: string;
  credentials?: {
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
  };
}

interface WhatsAppTemplate {
  name: string;
  language: string;
  status: string;
}

interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  verifyToken: string;
  templates?: WhatsAppTemplate[];
  lastSync?: string;
}

interface IntegrationsManagerProps {
  tenantId?: string;
  config: Record<string, unknown>;
  onChange: (newConfig: Record<string, unknown>) => void;
}

export function IntegrationsManager({ tenantId, config, onChange }: IntegrationsManagerProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingWA, setIsSyncingWA] = useState(false);
  // Sprint 3 NEW-12: buscador integraciones. Filtra secciones por título/keywords.
  const [searchFilter, setSearchFilter] = useState("");

  /** Devuelve true si la sección debe mostrarse según el filtro de búsqueda actual. */
  const matchesFilter = useMemo(() => {
    const term = searchFilter.trim().toLowerCase();
    if (!term) return () => true;
    return (keywords: string) => keywords.toLowerCase().includes(term);
  }, [searchFilter]);

  // ── WhatsApp Config ──
  const whatsapp = (config?.whatsapp as WhatsAppConfig) || {
    accessToken: "",
    phoneNumberId: "",
    wabaId: "",
    verifyToken: "",
  };


  // ── Ultravox AI Config ──
  const ultravox = (config?.ultravox as { api_key?: string }) || {};
  const ultravoxApiKey = ultravox.api_key || "";

  // ── Telephony Config ──
  const telephony = (config?.telephony as TelephonyConfig) || {};

  const updateField = (category: string, fields: Record<string, unknown>) => {
    const categoryData = { ...((config[category] as Record<string, unknown>) || {}), ...fields };



    if (category === "ultravox" && (categoryData as Record<string, unknown>).apiKey) {
      const data = categoryData as Record<string, unknown>;
      data.api_key = data.apiKey;
      delete data.apiKey;
    }

    onChange({
      ...config,
      [category]: categoryData,
    });
  };

  const handleSync = async (apiKey: string) => {
    if (!apiKey) {
      toast({
        variant: "warning",
        title: "API Key requerida",
        description: "Introduce una API Key antes de sincronizar.",
      });
      return;
    }
    setIsSyncing(true);
    try {
      const res = await syncUltravoxResources(apiKey);
      if (!res.success) {
        toast({
          variant: "error",
          title: "Error al sincronizar con Ultravox",
          description: res.error,
        });
      }
    } catch {
      toast({ variant: "error", title: "Fallo crítico en la conexión con Ultravox" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleWASync = async () => {
    if (!tenantId) {
      toast({
        variant: "warning",
        title: "Guarda el cliente primero",
        description: "Debes guardar el cliente antes de sincronizar sus plantillas.",
      });
      return;
    }
    if (!whatsapp.accessToken || !whatsapp.wabaId) {
      toast({
        variant: "warning",
        title: "Datos requeridos",
        description: "Se requiere Access Token y WABA ID para sincronizar.",
      });
      return;
    }

    setIsSyncingWA(true);
    try {
      const res = await syncWhatsAppTemplates(tenantId, whatsapp);
      if (res.success && res.data) {
        updateField("whatsapp", {
          templates: res.data,
          lastSync: new Date().toISOString(),
        });
      } else {
        toast({ variant: "error", title: "Error al sincronizar con Meta", description: res.error });
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast({ variant: "error", title: "Error de conexión", description: error.message });
    } finally {
      setIsSyncingWA(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 space-y-12 duration-700">
      {/* ── SP-4-NEW-12: buscador integraciones ── */}
      <div className="sticky top-0 z-10 -mx-2 bg-gradient-to-b from-white via-white/95 to-transparent px-2 pt-2 pb-3 backdrop-blur-sm dark:from-slate-950 dark:via-slate-950/95">
        <label className="relative block">
          <span className="sr-only">Buscar integración</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Buscar integración (retell, whatsapp, crm, sheets...)"
            className="h-10 rounded-xl border-slate-200 bg-white pl-9 text-sm dark:border-slate-800 dark:bg-slate-950"
          />
        </label>
      </div>



      {/* ── SECTION: ULTRAVOX AI ── */}
      {matchesFilter("ultravox voz voice agent realtime inference web-native") && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-600">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase dark:text-white">
                  Ultravox AI Integration
                </h3>
                <p className="text-left text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Web-native Realtime Voice Inference
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSync(ultravoxApiKey)}
              disabled={isSyncing || !ultravoxApiKey}
              className="h-8 gap-2 rounded-lg border-purple-100 bg-purple-50 text-[10px] font-black tracking-widest text-purple-600 uppercase hover:bg-purple-100"
            >
              <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
              {isSyncing ? "Sincronizando..." : "Sincronizar Recursos"}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-left text-[10px] font-black tracking-widest text-slate-500 uppercase">
                <Key className="h-3 w-3" /> API Key
              </Label>
              <Input
                value={ultravoxApiKey}
                onChange={(e) => updateField("ultravox", { api_key: e.target.value })}
                type="password"
                placeholder="Ultravox API Secret"
                className="h-11 rounded-xl border-slate-200 bg-white font-mono text-xs dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: TELEPHONY (Hidden for now as per user request) ── */}
      {matchesFilter("telephony telefonía external voice connectors outbound") && (
        <div className="hidden space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-600">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase dark:text-white">
                  Telephony Settings
                </h3>
                <p className="text-left text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  External Voice Connectors (Outbound Streams)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2 text-left">
              <Label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                Provider
              </Label>
              <select
                title="Telephony Provider"
                value={telephony.provider || "twilio"}
                onChange={(e) => updateField("telephony", { provider: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="twilio">Twilio (Recomendado)</option>
                <option value="telnyx">Telnyx</option>
                <option value="plivo">Plivo</option>
                <option value="custom">Personalizado (Custom SIP / Trunk)</option>
              </select>
            </div>
            <div className="space-y-2 text-left">
              <Label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                {telephony.provider === "custom"
                  ? "Custom API Endpoint / SIP URI"
                  : "Account SID / API Key"}
              </Label>
              <Input
                value={telephony.credentials?.accountSid || ""}
                onChange={(e) =>
                  updateField("telephony", {
                    credentials: { ...(telephony.credentials || {}), accountSid: e.target.value },
                  })
                }
                placeholder={
                  telephony.provider === "custom" ? "https://api.miproveedor.com..." : "AC..."
                }
                className="h-11 rounded-xl border-slate-200 bg-white font-mono text-xs dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
            <div className="space-y-2 text-left">
              <Label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                {telephony.provider === "custom"
                  ? "Custom Secret / Bearer Token"
                  : "Auth Token / API Secret"}
              </Label>
              <Input
                value={telephony.credentials?.authToken || ""}
                onChange={(e) =>
                  updateField("telephony", {
                    credentials: { ...(telephony.credentials || {}), authToken: e.target.value },
                  })
                }
                type="password"
                placeholder="••••••••"
                className="h-11 rounded-xl border-slate-200 bg-white font-mono text-xs dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
            <div className="space-y-2 text-left">
              <Label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                Default From Number
              </Label>
              <Input
                value={telephony.credentials?.fromNumber || ""}
                onChange={(e) =>
                  updateField("telephony", {
                    credentials: { ...(telephony.credentials || {}), fromNumber: e.target.value },
                  })
                }
                placeholder="+1..."
                className="h-11 rounded-xl border-slate-200 bg-white text-xs font-bold dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: CRM WEBHOOKS ⭐ NUEVO ── */}
      {matchesFilter("crm webhooks hubspot zoho salesforce integraciones") && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-600/20 bg-orange-600/10 text-orange-600">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase dark:text-white">
                  CRM Webhook (Ingesta Inmediata)
                </h3>
                <p className="text-left text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Entrada instantánea de leads desde Zoho, HubSpot, etc.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3 rounded-xl border border-dashed border-slate-200 bg-slate-950/5 p-4 dark:border-slate-800">
              <div>
                <p className="mb-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">
                  Endpoint URL (POST)
                </p>
                <code className="font-mono text-[10px] break-all text-orange-600 select-all dark:text-orange-400">
                  https://app.rentoncallapp.com/api/webhooks/crm
                </code>
              </div>
              <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                <p className="mb-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">
                  Cabeceras Obligatorias
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-slate-500 uppercase">Key</span>
                    <code className="font-mono text-[10px] font-black">x-tenant-id</code>
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-[8px] font-bold text-slate-500 uppercase">
                      Value (Tu ID de Cliente)
                    </span>
                    <code className="truncate font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      {tenantId || "ID_DEL_CLIENTE"}
                    </code>
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-[9px] leading-relaxed font-bold text-slate-400 uppercase">
                  💡 Configura una &quot;Función&quot; o &quot;Webhook&quot; en Zoho que dispare un
                  JSON con: <br />
                  <span className="font-mono text-[8px] text-slate-900 italic dark:text-white">
                    {
                      '{ "nombre": "...", "telefono": "...", "email": "...", "id_lead_externo": "..." }'
                    }
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: GOOGLE SHEETS (NEW) ── */}
      {matchesFilter("google sheets drive spreadsheets") && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-green-500/20 bg-green-500/10 text-green-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase dark:text-white">
                  Google Sheets / Drive
                </h3>
                <p className="text-left text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Exportación automática de leads a Excel en la nube
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!tenantId) {
                  toast({
                    variant: "warning",
                    title: "Guarda el cliente primero",
                    description: "Debes guardar el cliente antes de conectar con Google.",
                  });
                  return;
                }
                window.location.href = `/api/integrations/google/auth?tenantId=${tenantId}`;
              }}
              className="h-8 gap-2 rounded-lg border-slate-200 bg-white text-[10px] font-black tracking-widest text-slate-600 uppercase hover:bg-slate-50"
            >
              <RefreshCw className="h-3 w-3" />
              {(config?.google as { connected?: boolean })?.connected
                ? "Reconectar Google"
                : "Conectar Google"}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                Spreadsheet ID
              </Label>
              <Input
                value={(config?.google as { spreadsheetId?: string })?.spreadsheetId || ""}
                onChange={(e) => updateField("google", { spreadsheetId: e.target.value })}
                placeholder="ID de la hoja de cálculo (de la URL)"
                className="h-11 rounded-xl border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-950"
              />
              <p className="text-[9px] font-medium text-slate-400">
                Ejemplo: 1abc123... (se encuentra en la URL del documento)
              </p>
            </div>
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                Nombre de la Pestaña
              </Label>
              <Input
                value={(config?.google as { sheetName?: string })?.sheetName || "Leads"}
                onChange={(e) => updateField("google", { sheetName: e.target.value })}
                placeholder="Hoja1"
                className="h-11 rounded-xl border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          </div>

          {(config?.google as { connected?: boolean })?.connected && (
            <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-3 dark:border-green-900/30 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-[10px] font-bold tracking-tight text-green-700 uppercase dark:text-green-400">
                Cuenta de Google vinculada correctamente
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION: PDF.CO ── */}
      {matchesFilter("pdf cotizacion documento pdf.co generar reporte") && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600">
                <FileDown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase dark:text-white">
                  pdf.co — Generador de PDF
                </h3>
                <p className="text-left text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Cotizaciones y documentos automáticos vía WhatsApp
                </p>
              </div>
            </div>
            <a
              href="https://app.pdf.co"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-400"
            >
              <ExternalLink className="h-3 w-3" />
              Ir a pdf.co
            </a>
          </div>

          {/* API Key */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-rose-500" />
              <Label className="text-[11px] font-black tracking-widest text-slate-500 uppercase dark:text-slate-400">
                API Key de pdf.co
              </Label>
            </div>
            <Input
              type="password"
              value={((config?.pdfco as Record<string, string>) || {}).api_key || ""}
              onChange={(e) => updateField("pdfco", { api_key: e.target.value })}
              placeholder="Tu API Key de pdf.co (ej: abc123@example.com_...)"
              className="font-mono text-sm"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Crea tu cuenta gratuita en{" "}
              <a
                href="https://app.pdf.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-500 underline underline-offset-2"
              >
                app.pdf.co
              </a>{" "}
              y copia tu API Key desde el Dashboard → Account.
            </p>
          </div>

          {/* Test button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={async () => {
                const apiKey = ((config?.pdfco as Record<string, string>) || {}).api_key;
                if (!apiKey) {
                  toast({ variant: "warning", title: "API Key requerida", description: "Introduce tu API Key de pdf.co primero." });
                  return;
                }
                try {
                  const res = await fetch("/api/pdf/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      html_template: "<html><body><h1>✅ pdf.co funcionando!</h1><p>Generado correctamente.</p></body></html>",
                      filename: "test-pdfco.pdf",
                      paper_size: "A4",
                      variables: {},
                    }),
                  });
                  const data = await res.json() as { success?: boolean; url?: string; error?: string };
                  if (data.success && data.url) {
                    toast({ variant: "success", title: "✅ pdf.co conectado", description: "PDF de prueba generado con éxito." });
                    window.open(data.url, "_blank");
                  } else {
                    toast({ variant: "error", title: "Error pdf.co", description: data.error || "Error desconocido" });
                  }
                } catch {
                  toast({ variant: "error", title: "Error de conexión con pdf.co" });
                }
              }}
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 transition-all hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-400 dark:hover:bg-rose-900/20"
            >
              <TestTube className="h-4 w-4" />
              Probar conexión (genera PDF de prueba)
            </button>
          </div>

          {/* Info card */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
            <p className="text-[10px] font-black tracking-widest text-amber-600 uppercase dark:text-amber-400">
              ¿Cómo usarlo?
            </p>
            <ol className="mt-2 space-y-1 text-[11px] text-amber-700/80 dark:text-amber-300/60 list-decimal list-inside">
              <li>Configura la API Key arriba y guarda.</li>
              <li>En el Constructor de IA, agrega el nodo <strong>"Generar PDF"</strong>.</li>
              <li>Escribe tu plantilla HTML con <code className="font-mono bg-amber-100/50 px-1 rounded">&#123;&#123;variables&#125;&#125;</code>.</li>
              <li>El nodo expone la URL del PDF como <code className="font-mono bg-amber-100/50 px-1 rounded">&#123;&#123;pdf_url&#125;&#125;</code>.</li>
              <li>Pasa esa variable al nodo <strong>Agente de Texto IA</strong> o <strong>Plantilla WhatsApp</strong>.</li>
            </ol>
          </div>
        </div>
      )}

      <div className="flex items-start gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-left dark:border-blue-900/30 dark:bg-blue-900/10">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-500/20">
          <Zap className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <h4 className="text-[10px] font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
            Orquestación Multi-Agente
          </h4>
          <p className="text-[11px] leading-relaxed font-medium text-blue-700/70 dark:text-blue-300/60">
            Estas credenciales permiten al orquestador central disparar llamadas y mensajes
            automáticos bajo la identidad de este cliente.
          </p>
        </div>
      </div>

      <CRMSection />
    </div>
  );
}
