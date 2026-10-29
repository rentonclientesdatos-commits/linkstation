"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  RefreshCw,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Inbox,
  Send,
  Zap,
  Globe,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  tenant_id: string;
  workflow_id: string | null;
  step_number: number;
  action_type: string;
  result: string;
  error_message: string | null;
  metadata: Record<string, any>;
  executed_at: string;
  lead_id: string | null;
}

interface WorkflowLogsDrawerProps {
  tenantId: string;
  workflowId: string;
  isOpen: boolean;
  onClose: () => void;
  currentWebhookUrl?: string;
}

export function WorkflowLogsDrawer({
  tenantId,
  workflowId,
  isOpen,
  onClose,
  currentWebhookUrl,
}: WorkflowLogsDrawerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<"inbound" | "all">("inbound");
  const [filterResult, setFilterResult] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/orchestration/logs?tenantId=${tenantId}&workflowId=${workflowId}&limit=50`
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch orchestration logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, workflowId]);

  useEffect(() => {
    if (!isOpen) return;
    fetchLogs();
  }, [isOpen, fetchLogs]);

  // Auto-refresh interval (every 3 seconds)
  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, fetchLogs]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  // Filter logs based on tab and status
  const inboundLogs = logs.filter(
    (l) => l.action_type === "WEBHOOK_TRIGGER" || l.action_type === "ULTRAVOX_TOOL" || l.step_number === 0
  );

  const displayedLogs = (activeTab === "inbound" ? inboundLogs : logs).filter((l) => {
    if (filterResult === "ALL") return true;
    return l.result === filterResult;
  });

  const curlExample = currentWebhookUrl
    ? `curl -X POST "${currentWebhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"nombre": "Cliente Prueba", "telefono": "+56912345678", "email": "test@ejemplo.com"}'`
    : "";

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="relative flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#0c0c0f]/95 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-right duration-300"
        style={{
          boxShadow: "-12px 0 48px rgba(0,0,0,0.7), inset 1px 0 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Logs del Sistema & Entradas
                </h3>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  </span>
                  En Vivo
                </span>
              </div>
              <p className="text-[10px] text-white/40 font-medium">
                Monitorea peticiones de formularios, webhooks y llamadas en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-bold transition-all",
                autoRefresh
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-white/40 hover:text-white"
              )}
              title={autoRefresh ? "Auto-refresh activo (cada 3s)" : "Pausado"}
            >
              <Activity className={cn("h-3 w-3", autoRefresh && "animate-pulse")} />
              <span>{autoRefresh ? "Auto (3s)" : "Manual"}</span>
            </button>

            {/* Manual refresh button */}
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/60 transition-all hover:bg-white/10 hover:text-white"
              title="Actualizar ahora"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin text-orange-400")} />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 p-2 text-white/40 transition-all hover:bg-white/5 hover:text-white"
              title="Cerrar panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs and Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-black/40 px-6 py-2.5">
          <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1 border border-white/[0.06]">
            <button
              onClick={() => setActiveTab("inbound")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all",
                activeTab === "inbound"
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "text-white/40 hover:text-white"
              )}
            >
              <Inbox className="h-3 w-3" />
              Entradas ({inboundLogs.length})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all",
                activeTab === "all"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                  : "text-white/40 hover:text-white"
              )}
            >
              <Send className="h-3 w-3" />
              Todos los Eventos ({logs.length})
            </button>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <button
              onClick={() => setFilterResult("ALL")}
              className={cn(
                "rounded-md px-2 py-0.5 font-bold transition-all",
                filterResult === "ALL"
                  ? "bg-white/20 text-white"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterResult("SUCCESS")}
              className={cn(
                "rounded-md px-2 py-0.5 font-bold transition-all",
                filterResult === "SUCCESS"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-emerald-400/60 hover:text-emerald-300"
              )}
            >
              ✓ Exitosos
            </button>
            <button
              onClick={() => setFilterResult("FAILED")}
              className={cn(
                "rounded-md px-2 py-0.5 font-bold transition-all",
                filterResult === "FAILED"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "text-rose-400/60 hover:text-rose-300"
              )}
            >
              ⚠ Errores
            </button>
          </div>
        </div>

        {/* Logs List Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {displayedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <Inbox className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Aún no hay peticiones registradas
              </h4>
              <p className="text-xs text-white/40 max-w-sm mb-5 leading-relaxed">
                Cuando tu formulario o webhook externo envíe datos a LinkStation, aparecerán aquí en vivo con todo su detalle JSON.
              </p>

              {currentWebhookUrl && (
                <div className="w-full text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">
                      Prueba tu webhook enviando un test cURL
                    </span>
                    <button
                      onClick={() => copyToClipboard(curlExample, "curl-test")}
                      className="flex items-center gap-1 text-[9px] font-bold text-white/50 hover:text-white"
                    >
                      {copiedId === "curl-test" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      Copiar cURL
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-xl border border-white/5 bg-black/60 p-3 font-mono text-[10px] text-orange-300/80">
                    {curlExample}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            displayedLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isSuccess = log.result === "SUCCESS";
              const payload = log.metadata?.payload || log.metadata?.parameters || log.metadata || {};
              const method = log.metadata?.method || "POST";
              const path = log.metadata?.path ? `/${log.metadata.path}` : "";
              const callerPhone = log.metadata?.lead_phone || payload.telefono || payload.phone || payload.celular || "";
              const callerName = log.metadata?.lead_name || payload.nombre || payload.name || "";

              return (
                <div
                  key={log.id}
                  className={cn(
                    "rounded-2xl border transition-all duration-200 overflow-hidden",
                    isSuccess
                      ? "border-emerald-500/20 bg-emerald-500/[0.03] hover:border-emerald-500/40"
                      : "border-rose-500/25 bg-rose-500/[0.03] hover:border-rose-500/50"
                  )}
                >
                  {/* Summary Bar */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="flex items-center justify-between p-3.5 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      {/* Status Icon */}
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                          isSuccess
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        )}
                      >
                        {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[8px] font-black uppercase",
                              log.action_type === "WEBHOOK_TRIGGER"
                                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                : log.action_type === "ULTRAVOX_TOOL"
                                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                                : "bg-white/10 text-white/60"
                            )}
                          >
                            {method} {log.action_type === "WEBHOOK_TRIGGER" ? path || "Webhook" : log.action_type}
                          </span>

                          {callerName && (
                            <span className="text-xs font-bold text-white">
                              {callerName}
                            </span>
                          )}

                          {callerPhone && (
                            <span className="font-mono text-[10px] text-white/50">
                              {callerPhone}
                            </span>
                          )}
                        </div>

                        {log.error_message && (
                          <p className="mt-0.5 text-[10px] font-medium text-rose-300/90">
                            ⚠ {log.error_message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1 text-[9px] text-white/40">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(log.executed_at).toLocaleTimeString("es-CL")}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-white/40" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-white/40" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.06] bg-black/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider text-white/40">
                          Payload JSON recibido ({Object.keys(payload).length} campos)
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(JSON.stringify(payload, null, 2), log.id);
                          }}
                          className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold text-white/60 hover:bg-white/10 hover:text-white"
                        >
                          {copiedId === log.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copiar JSON
                            </>
                          )}
                        </button>
                      </div>

                      <pre className="max-h-60 overflow-y-auto rounded-xl border border-white/5 bg-black/80 p-3 font-mono text-[10px] leading-relaxed text-emerald-400/90 break-all">
                        {JSON.stringify(payload, null, 2)}
                      </pre>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[9px] text-white/30">
                        <span>ID Evento: <code className="font-mono text-white/50">{log.id.slice(0, 8)}</code></span>
                        {log.lead_id && (
                          <span>• Lead ID: <code className="font-mono text-white/50">{log.lead_id.slice(0, 8)}</code></span>
                        )}
                        <span>• Fecha: {new Date(log.executed_at).toLocaleString("es-CL")}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
