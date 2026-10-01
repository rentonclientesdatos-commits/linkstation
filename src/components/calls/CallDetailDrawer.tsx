"use client";

import { useEffect, useState } from "react";
import {
  X,
  Phone,
  Clock,
  Calendar,
  User,
  Bot,
  FileText,
  Volume2,
  Sparkles,
  Layers,
  Code,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  MessageCircle,
} from "lucide-react";
import {
  UltravoxCallItem,
  CallMessageItem,
  fetchUltravoxCallDetail,
} from "@/lib/actions/ultravox-calls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CallDetailDrawerProps {
  call: UltravoxCallItem | null;
  onClose: () => void;
}

export function CallDetailDrawer({ call, onClose }: CallDetailDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<CallMessageItem[]>([]);
  const [activeTab, setActiveTab] = useState<"transcript" | "variables" | "json">("transcript");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!call?.callId) return;
    setLoading(true);
    fetch(`/api/lead-calls/${encodeURIComponent(call.callId)}`)
      .then((res) => res.json())
      .then((res) => {
        if (res?.success && res?.data) {
          setMessages(res.data.messages || []);
        }
      })
      .catch((err) => console.error("Error loading call detail:", err))
      .finally(() => setLoading(false));
  }, [call?.callId]);

  if (!call) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(call.rawCall || call, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins}:${remaining.toString().padStart(2, "0")}`;
  };

  const variableEntries = Object.entries(call.toolData || call.variables || {});

  const cleanPhone = (phone?: string) => {
    if (!phone) return "";
    return phone.replace(/[^\d+]/g, "");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="flex-1 cursor-pointer" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  {call.toolName || call.agentName}
                </h2>
                {call.toolCategory === "arriendo_gruas" && (
                  <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs">
                    Arriendo de Grúas
                  </Badge>
                )}
                {call.toolCategory === "servicio_tecnico" && (
                  <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs">
                    Servicio Técnico
                  </Badge>
                )}
                {call.toolCategory === "cotizacion" && (
                  <Badge className="border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs">
                    Cotización
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={
                    call.status === "completed" || call.ended
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs"
                  }
                >
                  {call.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">ID: {call.callId}</p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 gap-2 border-b border-border bg-muted/10 p-4 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Fecha</p>
              <p className="font-semibold text-foreground">
                {new Date(call.created).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Duración</p>
              <p className="font-semibold text-foreground">
                {formatSeconds(call.durationSeconds)} ({call.durationSeconds}s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Contacto</p>
              {cleanPhone(call.callerId) ? (
                <a
                  href={`https://wa.me/${cleanPhone(call.callerId)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 truncate flex items-center gap-1 hover:underline"
                >
                  <MessageCircle className="h-3 w-3" />
                  {call.callerId}
                </a>
              ) : (
                <p className="font-semibold text-foreground truncate">
                  {call.callerId || "Desconocido"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Audio Player if available */}
        {call.recordingUrl && (
          <div className="border-b border-border bg-blue-500/5 px-6 py-3">
            <div className="flex items-center gap-3">
              <Volume2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Grabación de Audio
              </span>
            </div>
            <audio controls className="mt-2 h-9 w-full rounded-lg" src={call.recordingUrl}>
              Tu navegador no soporta el reproductor de audio.
            </audio>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border px-6 pt-2">
          <button
            onClick={() => setActiveTab("transcript")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === "transcript"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            Transcripción & Diálogo
          </button>
          <button
            onClick={() => setActiveTab("variables")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === "variables"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            Variables Capturadas ({variableEntries.length})
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === "json"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code className="h-4 w-4" />
            Payload JSON
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Box (Always displayed at top of content) */}
          {call.summary && (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                <Sparkles className="h-4 w-4" />
                Resumen Ejecutivo de la IA
              </div>
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                {call.summary}
              </p>
            </div>
          )}

          {/* TAB 1: TRANSCRIPT */}
          {activeTab === "transcript" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Transcripción Completa
              </h3>

              {loading ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mr-2" />
                  Cargando mensajes...
                </div>
              ) : messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No hay mensajes de transcripción detallados disponibles para esta llamada.
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 text-sm ${
                        m.role === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          m.role === "agent"
                            ? "bg-blue-600 text-white"
                            : m.role === "user"
                            ? "bg-purple-600 text-white"
                            : "bg-amber-600 text-white"
                        }`}
                      >
                        {m.role === "agent" ? (
                          <Bot className="h-4 w-4" />
                        ) : m.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Wrench className="h-4 w-4" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                          m.role === "agent"
                            ? "bg-muted/80 text-foreground rounded-tl-sm border border-border"
                            : m.role === "user"
                            ? "bg-blue-600 text-white rounded-tr-sm"
                            : "bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className="text-[10px] font-bold uppercase opacity-75">
                            {m.role === "agent"
                              ? call.agentName
                              : m.role === "user"
                              ? "Cliente"
                              : `Herramienta: ${m.toolName || "Tool"}`}
                          </span>
                          {m.timestamp && (
                            <span className="text-[10px] opacity-60">
                              {new Date(m.timestamp).toLocaleTimeString()}
                            </span>
                          )}
                        </div>

                        <p className="whitespace-pre-line leading-relaxed">{m.text}</p>

                        {/* Tool Arguments/Results if any */}
                        {m.toolArguments && (
                          <div className="mt-2 rounded bg-black/20 p-2 text-xs font-mono">
                            <span className="text-[10px] uppercase font-bold text-amber-400">
                              Parámetros:
                            </span>
                            <pre className="mt-1 overflow-x-auto">
                              {JSON.stringify(m.toolArguments, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VARIABLES CAPTURADAS */}
          {activeTab === "variables" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Variables Extraídas de la Llamada
                </h3>
                <Badge variant="outline" className="text-xs">
                  {variableEntries.length} detectadas
                </Badge>
              </div>

              {variableEntries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No se extrajeron variables estructuradas adicionales en esta llamada.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {variableEntries.map(([k, v]) => (
                    <div
                      key={k}
                      className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-blue-500/40 hover:shadow-sm"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {k.replace(/_/g, " ")}
                      </span>
                      <span className="mt-2 text-sm font-semibold text-foreground break-words">
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: JSON */}
          {activeTab === "json" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Payload Crudo de Ultravox
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyJson}
                  className="h-8 gap-2 text-xs"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar JSON"}
                </Button>
              </div>

              <pre className="max-h-[500px] overflow-auto rounded-xl border border-border bg-muted/40 p-4 text-xs font-mono text-foreground/90">
                {JSON.stringify(call.rawCall || call, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
