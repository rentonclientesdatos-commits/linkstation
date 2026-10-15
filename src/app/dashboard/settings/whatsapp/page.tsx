/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

/**
 * SPRINT 5.7 — WhatsApp Templates Admin Panel
 * src/app/dashboard/settings/whatsapp/page.tsx
 *
 * Allows administrators to:
 *  1. View and configure WABA credentials
 *  2. Sync templates from Meta Cloud API to the database
 *  3. Map template parameter positions to lead fields
 *  4. View delivery logs
 *  5. Manage opt-out blacklist
 */

import { useEffect, useState, useTransition } from "react";
import {
  RefreshCw,
  Settings,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  Eye,
  Ban,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  syncWhatsAppTemplatesToDB,
  getWhatsAppTemplates,
  updateVariableMapping,
  getWhatsAppLogs,
  saveWABAConfig,
  getWABAConfig,
  addToOptOutList,
  removeFromOptOutList,
  getOptOutList,
} from "@/lib/actions/whatsapp";
import { getAllTrackedVariables } from "@/lib/actions/inbox";
import type { WhatsAppDBTemplate } from "@/lib/integrations/whatsapp/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "credentials" | "templates" | "logs" | "optout";

const LEAD_FIELDS = [
  { value: "nombre", label: "Nombre" },
  { value: "apellido", label: "Apellido" },
  { value: "nombre_completo", label: "Nombre completo" },
  { value: "email", label: "Email" },
  { value: "telefono", label: "Teléfono" },
  { value: "nombre_programa", label: "Nombre del programa" },
  { value: "estado", label: "Estado del lead" },
  { value: "fecha_cita", label: "Fecha de cita (ISO)" },
  { value: "fecha_cita_formateada", label: "Fecha de cita (formateada)" },
  { value: "hora_cita", label: "Hora de cita" },
  { value: "fecha_hora_cita", label: "Fecha y hora de cita" },
  { value: "nombre_asesor", label: "Nombre del asesor" },
  { value: "origen", label: "Origen del lead" },
  { value: "ciudad", label: "Ciudad" },
];

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    APPROVED: {
      icon: <CheckCircle2 size={12} />,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      label: "Aprobada",
    },
    PENDING: {
      icon: <Clock size={12} />,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      label: "Pendiente",
    },
    REJECTED: {
      icon: <XCircle size={12} />,
      color: "text-red-400 bg-red-500/10 border-red-500/20",
      label: "Rechazada",
    },
    PAUSED: {
      icon: <AlertCircle size={12} />,
      color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
      label: "Pausada",
    },
    sent: {
      icon: <CheckCircle2 size={12} />,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      label: "Enviado",
    },
    delivered: {
      icon: <CheckCircle2 size={12} />,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      label: "Entregado",
    },
    read: {
      icon: <Eye size={12} />,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      label: "Leído",
    },
    failed: {
      icon: <XCircle size={12} />,
      color: "text-red-400 bg-red-500/10 border-red-500/20",
      label: "Fallido",
    },
    queued: {
      icon: <Clock size={12} />,
      color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
      label: "En cola",
    },
  };

  const def = map[status] ?? {
    icon: null,
    color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    label: status,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase",
        def.color
      )}
    >
      {def.icon}
      {def.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Template Card with mapping editor
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  onMappingSaved,
  dynamicFields,
}: {
  template: WhatsAppDBTemplate;
  onMappingSaved: () => void;
  dynamicFields: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>(template.variable_mapping ?? {});
  const [saving, setSaving] = useState(false);

  // Detect variable indices from components
  const indices = new Set<string>();
  template.components.forEach((comp) => {
    const text = (comp as unknown as { text?: string }).text ?? "";
    const matches = [...text.matchAll(/\{\{([^}]+)\}\}/g)];
    matches.forEach((m) => indices.add(m[1]));
  });
  const sortedIndices = [...indices].sort((a, b) => Number(a) - Number(b));

  async function handleSave() {
    setSaving(true);
    const result = await updateVariableMapping(template.id, mapping);
    setSaving(false);
    if (result.success) {
      toast({ variant: "success", title: "Mapeo guardado" });
      onMappingSaved();
    } else {
      toast({ variant: "error", title: "Error al guardar", description: result.error });
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:border-white/5 dark:bg-white/3 dark:hover:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-mono text-sm font-bold text-slate-900 dark:text-white">
              {template.name}
            </span>
            <StatusBadge status={template.status} />
            <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
              {template.category}
            </span>
            <span className="text-[10px] text-slate-600">{template.language}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">ID Meta: {template.meta_id}</p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Expandir"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
          {sortedIndices.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              Esta plantilla no tiene variables parametrizadas.
            </p>
          ) : (
            <>
              <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
                Mapeo de variables → Campo del lead
              </p>
              <div className="space-y-2">
                {sortedIndices.map((idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 rounded bg-white/5 px-2 py-1 text-center font-mono text-xs text-emerald-400">
                      {`{{${idx}}}`}
                    </span>
                    <select
                      id={`template-${template.id}-var-${idx}`}
                      title={`Mapear variable {{${idx}}} a campo del lead`}
                      aria-label={`Campo del lead para variable {{${idx}}}`}
                      value={mapping[idx] ?? ""}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [idx]: e.target.value }))}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      <option value="">— Seleccionar campo —</option>
                      <optgroup label="Campos Estándar">
                        {LEAD_FIELDS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </optgroup>
                      {dynamicFields.length > 0 && (
                        <optgroup label="Variables de IA">
                          {dynamicFields.map((f) => (
                            <option key={f} value={f}>
                              {f} (IA)
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                ))}
              </div>
              <Button
                id={`save-mapping-${template.id}`}
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="mt-2 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <Save size={13} />
                {saving ? "Guardando..." : "Guardar mapeo"}
              </Button>
            </>
          )}

          {/* Preview of components */}
          <div className="mt-3 space-y-1">
            <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
              Componentes
            </p>
            {template.components.map((comp, i) => {
              const c = comp as unknown as { type: string; text?: string; format?: string };
              return (
                <div key={i} className="rounded bg-slate-100 px-3 py-2 dark:bg-black/20">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">{c.type}</span>
                  {c.text && (
                    <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">{c.text}</p>
                  )}
                  {c.format && !c.text && (
                    <p className="mt-0.5 text-xs text-slate-500 italic">{c.format}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Credentials Tab
// ---------------------------------------------------------------------------

function CredentialsTab() {
  const [form, setForm] = useState({
    wabaId: "",
    phoneNumberId: "",
    accessToken: "",
    displayName: "",
    webhookVerifyToken: "",
    appSecret: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getWABAConfig().then((res) => {
      if (res.success && res.data) {
        setForm((prev) => ({
          ...prev,
          wabaId: res.data!.wabaId,
          phoneNumberId: res.data!.phoneNumberId,
          displayName: res.data!.displayName ?? "",
          webhookVerifyToken: res.data!.webhookVerifyToken ?? "",
          // appSecret: never pre-fill for security (write-only field)
        }));
      }
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.wabaId || !form.phoneNumberId) {
      toast({
        variant: "error",
        title: "Campos requeridos",
        description: "WABA ID y Phone Number ID son obligatorios.",
      });
      return;
    }
    setSaving(true);
    const result = await saveWABAConfig(form);
    setSaving(false);
    if (result.success) {
      toast({
        variant: "success",
        title: "Configuración guardada",
        description: "Credenciales WABA actualizadas correctamente.",
      });
      setForm((prev) => ({ ...prev, accessToken: "", appSecret: "" })); // clear sensitive fields
    } else {
      toast({ variant: "error", title: "Error al guardar", description: result.error });
    }
  }

  if (loading)
    return <div className="py-8 text-center text-sm text-slate-500">Cargando configuración...</div>;

  return (
    <form onSubmit={handleSave} className="max-w-lg space-y-5">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300">
        <strong>Seguridad:</strong> El Access Token y App Secret se guardan en la base de datos.
        Nunca los compartas ni los incluyas en logs.
      </div>

      {[
        { id: "wabaId", label: "WABA ID (Messaging Account ID)", placeholder: "1664890428604716", required: true },
        { id: "phoneNumberId", label: "Phone Number ID", placeholder: "1348363005028713", required: true },
        {
          id: "accessToken",
          label: "Access Token",
          placeholder: "EAABs... (dejar vacío para mantener el actual)",
          required: false,
        },
        {
          id: "appSecret",
          label: "App Secret (Meta) — para verificación HMAC",
          placeholder: "dejar vacío para mantener el actual",
          required: false,
        },
        {
          id: "displayName",
          label: "Nombre de pantalla (opcional)",
          placeholder: "Mi Empresa S.L.",
          required: false,
        },
        {
          id: "webhookVerifyToken",
          label: "Webhook Verify Token (opcional)",
          placeholder: "my_random_token",
          required: false,
        },
      ].map(({ id, label, placeholder, required }) => (
        <div key={id} className="space-y-1.5">
          <Label
            htmlFor={`cred-${id}`}
            className="text-xs font-semibold tracking-widest text-slate-400 uppercase"
          >
            {label}
          </Label>
          <Input
            id={`cred-${id}`}
            type={id === "accessToken" || id === "appSecret" ? "password" : "text"}
            placeholder={placeholder}
            required={required}
            value={form[id as keyof typeof form]}
            onChange={(e) => setForm((prev) => ({ ...prev, [id]: e.target.value }))}
            className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-500/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600"
          />
          {id === "appSecret" && (
            <p className="text-[10px] text-slate-500">
              Encontralo en: Meta for Developers → Tu App → Configuración → Básica → App Secret.
              Cada cliente con distinta app Meta tiene su propio secret.
            </p>
          )}
        </div>
      ))}

      <Button
        id="save-waba-credentials"
        type="submit"
        disabled={saving}
        className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
      >
        <Save size={14} />
        {saving ? "Guardando..." : "Guardar credenciales"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function WhatsAppSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("templates");
  const [isPending, startTransition] = useTransition();
  const [templates, setTemplates] = useState<WhatsAppDBTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof getWhatsAppLogs>>["data"]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [optOutList, setOptOutList] = useState<Awaited<ReturnType<typeof getOptOutList>>["data"]>(
    []
  );
  const [loadingOptOut, setLoadingOptOut] = useState(false);
  const [newOptOutPhone, setNewOptOutPhone] = useState("");
  const [addingOptOut, setAddingOptOut] = useState(false);
  const [dynamicFields, setDynamicFields] = useState<string[]>([]);

  useEffect(() => {
    loadTemplates();
    getAllTrackedVariables().then((res) => {
      if (res.success && res.data) setDynamicFields(res.data);
    });
  }, []);

  useEffect(() => {
    if (activeTab === "logs" && !logs?.length) loadLogs();
    if (activeTab === "optout" && !optOutList?.length) loadOptOut();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function loadTemplates() {
    setLoadingTemplates(true);
    const res = await getWhatsAppTemplates();
    if (res.success && res.data) setTemplates(res.data);
    setLoadingTemplates(false);
  }

  async function loadLogs() {
    setLoadingLogs(true);
    const res = await getWhatsAppLogs({ limit: 50 });
    if (res.success) setLogs(res.data);
    setLoadingLogs(false);
  }

  async function loadOptOut() {
    setLoadingOptOut(true);
    const res = await getOptOutList();
    if (res.success) setOptOutList(res.data);
    setLoadingOptOut(false);
  }

  function handleSync() {
    startTransition(async () => {
      const result = await syncWhatsAppTemplatesToDB();
      if (result.success) {
        toast({
          variant: "success",
          title: "Plantillas sincronizadas",
          description: `Se sincronizaron ${result.count} plantillas desde Meta.`,
        });
        await loadTemplates();
      } else {
        toast({ variant: "error", title: "Error al sincronizar", description: result.error });
      }
    });
  }

  async function handleAddOptOut(e: React.FormEvent) {
    e.preventDefault();
    if (!newOptOutPhone.trim()) return;
    setAddingOptOut(true);
    const res = await addToOptOutList(newOptOutPhone.trim(), "admin_manual");
    setAddingOptOut(false);
    if (res.success) {
      toast({ variant: "success", title: "Número añadido a la blacklist" });
      setNewOptOutPhone("");
      await loadOptOut();
    } else {
      toast({ variant: "error", title: "Error", description: res.error });
    }
  }

  async function handleRemoveOptOut(phone: string) {
    const res = await removeFromOptOutList(phone);
    if (res.success) {
      toast({ variant: "success", title: "Número eliminado de la blacklist" });
      await loadOptOut();
    } else {
      toast({ variant: "error", title: "Error", description: res.error });
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "templates", label: "Plantillas", icon: <MessageSquare size={15} /> },
    { id: "credentials", label: "Credenciales", icon: <Settings size={15} /> },
    { id: "logs", label: "Logs de envío", icon: <Eye size={15} /> },
    { id: "optout", label: "Opt-Out", icon: <Ban size={15} /> },
  ];

  return (
    <div className="w-full space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#25d366]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.12 1.528 5.853L0 24l6.327-1.496C8.047 23.457 9.985 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.637-.51-5.14-1.397l-.368-.218-3.754.887.929-3.654-.24-.376C2.51 15.612 2 13.862 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              WhatsApp <span className="text-emerald-600 dark:text-emerald-400">WABA</span>
            </h1>
            <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
              Configuración de plantillas y canal de salida
            </p>
          </div>
        </div>

        {activeTab === "templates" && (
          <Button
            id="sync-whatsapp-templates"
            onClick={handleSync}
            disabled={isPending}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <RefreshCw size={14} className={cn(isPending && "animate-spin")} />
            {isPending ? "Sincronizando..." : "Sincronizar desde Meta"}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/5 dark:bg-white/3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`whatsapp-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-all",
              activeTab === tab.id
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
                : "text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-300"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "credentials" && <CredentialsTab />}

      {activeTab === "templates" && (
        <div className="space-y-3">
          {loadingTemplates ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-white/3"
                />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center dark:border-white/10">
              <MessageSquare size={32} className="mb-3 text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">
                No hay plantillas sincronizadas
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Haz clic en &quot;Sincronizar desde Meta&quot; para importar tus plantillas
                aprobadas.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                {templates.length} plantilla{templates.length !== 1 ? "s" : ""} encontrada
                {templates.length !== 1 ? "s" : ""}
              </p>
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onMappingSaved={loadTemplates}
                  dynamicFields={dynamicFields}
                />
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <div className="space-y-3">
          {loadingLogs ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-white/3"
                />
              ))}
            </div>
          ) : !logs?.length ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center dark:border-white/10">
              <Eye size={32} className="mb-3 text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">No hay logs de envío</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-white/5 dark:bg-white/3">
                    <th className="px-4 py-3 text-left font-semibold tracking-widest text-slate-500 uppercase">
                      Teléfono
                    </th>
                    <th className="px-4 py-3 text-left font-semibold tracking-widest text-slate-500 uppercase">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left font-semibold tracking-widest text-slate-500 uppercase">
                      Message SID
                    </th>
                    <th className="px-4 py-3 text-left font-semibold tracking-widest text-slate-500 uppercase">
                      Error
                    </th>
                    <th className="px-4 py-3 text-left font-semibold tracking-widest text-slate-500 uppercase">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 hover:bg-slate-50 dark:border-white/3 dark:hover:bg-white/3"
                    >
                      <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">
                        {log.phone_to}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                        {log.message_sid ?? "—"}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-red-400">
                        {log.error_message ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(log.created_at).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "optout" && (
        <div className="space-y-6">
          {/* Add form */}
          <form onSubmit={handleAddOptOut} className="flex max-w-lg items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="optout-phone"
                className="text-xs font-semibold tracking-widest text-slate-400 uppercase"
              >
                Añadir número a la blacklist
              </Label>
              <Input
                id="optout-phone"
                type="tel"
                placeholder="+34612345678"
                value={newOptOutPhone}
                onChange={(e) => setNewOptOutPhone(e.target.value)}
                className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600"
              />
            </div>
            <Button
              id="add-optout-number"
              type="submit"
              disabled={addingOptOut || !newOptOutPhone.trim()}
              className="gap-2 bg-red-600 text-white hover:bg-red-500"
            >
              <Ban size={14} />
              {addingOptOut ? "Añadiendo..." : "Añadir"}
            </Button>
          </form>

          {/* List */}
          {loadingOptOut ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-white/3"
                />
              ))}
            </div>
          ) : !optOutList?.length ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center dark:border-white/10">
              <Ban size={28} className="mb-3 text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">Blacklist vacía</p>
              <p className="mt-1 text-xs text-slate-600">
                Ningún número está en la lista de exclusión.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {optOutList.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/5 dark:bg-white/3"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                      {entry.phone}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {entry.reason ?? "Sin motivo"} ·{" "}
                      {new Date(entry.opted_out_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveOptOut(entry.phone)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
                    title="Eliminar de la blacklist"
                  >
                    <RotateCcw size={12} />
                    Re-optar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
