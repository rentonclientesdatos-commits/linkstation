/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Phone,
  MessageSquare,
  Paperclip,
  Send,
  Bot,
  User,
  Check,
  CheckCheck,
  Loader2,
  Zap,
  Archive,
  Star,
  PlusCircle,
  Filter,
  GitBranch,
  X,
  ChevronDown,
  Trash2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  getInboxLeads,
  getChatHistory,
  sendManualMessage,
  toggleLeadAI,
  updateLeadSegment,
  assignAgentToLead,
  deleteLead,
  deleteChatHistory,
  updateLeadInfo,
  deleteLeadFacts,
  getAgentTrackedVariables,
  type InboxLead,
  type ChatMessage,
} from "@/lib/actions/inbox";
import { getAIAgents } from "@/lib/actions/agents";
import { AIAgent } from "@/types/database";
import { getOrchestratorConfig, saveOrchestratorConfig } from "@/lib/actions/orchestrator-config";
import { getWhatsAppTemplates } from "@/lib/actions/orchestration";
import { AgentFlowBuilder } from "@/components/orchestrator/AgentFlowBuilder";
import { useTenantStore } from "@/store/tenant";
import { CreateLeadDialog } from "@/components/historial/CreateLeadDialog";
import { getSupabaseClient } from "@/lib/supabase/client";
import { LeadProfileModal } from "./LeadProfileModal";
import type { LucideIcon } from "lucide-react";
import { resolveCountryFromPhone } from "@/lib/utils/location-client";
import { getActiveTenantConfig, updateTenantConfig } from "@/lib/actions/tenant";

export default function AIAgentInbox() {
  // --- Tenant Context ---
  const tenantName = useTenantStore((s) => s.tenantName) || "ESDEN";
  const tenantId = useTenantStore((s) => s.tenantId);

  // --- State ---

  const [leads, setLeads] = useState<InboxLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<InboxLead | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentFlow, setCurrentFlow] = useState<{ nodes: any[]; edges: any[] }>({
    nodes: [],
    edges: [],
  });
  const [loadingFlow, setLoadingFlow] = useState(false);

  // View Management
  const [activeView, setActiveView] = useState<"INBOX" | "LOGIC">("INBOX");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Config
  const [segmentations, setSegmentations] = useState<string[]>([
    "PUESTO 1",
    "REVISADO",
    "CUALIFICADO",
    "SIN INTERÃ‰S",
  ]);
  const [isEditingSegments, setIsEditingSegments] = useState(false);

  // Filters
  const [segmentFilter, setSegmentFilter] = useState<string | null>(null);
  const [aiFilter, setAiFilter] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<AIAgent[]>([]);
  const [isAssigningAgent, setIsAssigningAgent] = useState(false);
  const [trackedVariables, setTrackedVariables] = useState<string[]>([]);
  const [isSyncingVars, setIsSyncingVars] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "LEAD" | "CHAT";
    includeFacts: boolean;
  }>({
    isOpen: false,
    type: "LEAD",
    includeFacts: true,
  });

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);

  // AI Typing Indicator State
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(interval);
  }, []);

  // --- Data Loading ---
  const loadLeads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Pass tenantId from state to ensure we bypass any cookie lag
      const currentTenantId = useTenantStore.getState().tenantId;
      const res = await getInboxLeads(currentTenantId || undefined);
      if (res.success && typeof res.data !== "undefined") {
        const newLeads = res.data;
        setLeads(newLeads);

        // ðŸ”„ Sync selectedLead if it's currently open
        if (selectedLeadRef.current) {
          const updatedLead = newLeads.find((l) => l.id === selectedLeadRef.current?.id);
          if (updatedLead) {
            // Only update if there's an actual change in metadata or status
            if (
              JSON.stringify(updatedLead.metadata) !==
                JSON.stringify(selectedLeadRef.current.metadata) ||
              updatedLead.tipo_lead !== selectedLeadRef.current.tipo_lead ||
              updatedLead.segmentacion !== selectedLeadRef.current.segmentacion
            ) {
              setSelectedLead(updatedLead);
            }
          }
        }
      } else if (res.error) {
        console.error("[INBOX] Error loading leads:", res.error);
      }
    } catch (error) {
      console.error("[INBOX] Critical exception in loadLeads:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadChat = useCallback(async (leadId: string) => {
    setLoadingChat(true);
    const activeTenantId = tenantId || useTenantStore.getState().tenantId;
    const res = await getChatHistory(leadId, activeTenantId || undefined);
    if (res.success && typeof res.data !== "undefined") {
      setMessages(res.data);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setLoadingChat(false);
  }, []);

  const loadFlow = useCallback(async () => {
    setLoadingFlow(true);
    try {
      const res = await getOrchestratorConfig();
      if (res.success && res.data?.flow_graph) {
        setCurrentFlow(res.data.flow_graph);
      }
    } finally {
      setLoadingFlow(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    const res = await getWhatsAppTemplates();
    if (res.success && typeof res.data !== "undefined") {
      setTemplates(res.data);
    }
    setLoadingTemplates(false);
  }, []);

  const loadAvailableAgents = useCallback(async () => {
    const res = await getAIAgents();
    if (res.success && res.data) {
      setAvailableAgents(res.data);
    }
  }, []);

  // Initial Load & Polling Fallback
  useEffect(() => {
    if (!tenantId) return;

    // Initial Fetch
    const runInitialFetch = async () => {
      try {
        // Fetch config
        getActiveTenantConfig()
          .then((config) => {
            if (config?.config?.segmentations) {
              setSegmentations(config.config.segmentations as string[]);
            }
          })
          .catch((e) => console.error(e));

        await Promise.all([loadLeads(), loadTemplates(), loadAvailableAgents()]);
      } catch (err) {
        console.error("[INBOX] Initial fetch failed:", err);
      }
    };
    runInitialFetch();

    // ðŸ›¡ï¸ Polling Fallback: Check for new messages/leads every 30 seconds
    // Use a recursive timeout to prevent overlapping requests if the network is slow
    let timerId: NodeJS.Timeout;
    const poll = async () => {
      console.log("[POLLING] Syncing inbox...");
      await loadLeads(true); // Silent update
      timerId = setTimeout(poll, 10000);
    };

    timerId = setTimeout(poll, 10000);

    return () => clearTimeout(timerId);
  }, [tenantId, loadLeads, loadTemplates, loadAvailableAgents]);

  useEffect(() => {
    if (activeView === "LOGIC") {
      const timer = setTimeout(() => loadFlow(), 0);
      return () => clearTimeout(timer);
    }
  }, [activeView, loadFlow]);

  // Load chat + tracked variables when selection changes
  const lastSelectedId = useRef<string | null>(null);
  useEffect(() => {
    if (selectedLead && selectedLead.id !== lastSelectedId.current) {
      lastSelectedId.current = selectedLead.id;
      setTimeout(() => loadChat(selectedLead.id), 0);
      // Load the configured tracked variables for this lead's agent
      getAgentTrackedVariables(selectedLead.ai_agent_id || null).then((res) => {
        if (res.success && res.data) setTrackedVariables(res.data);
        else setTrackedVariables([]);
      });
    } else if (!selectedLead) {
      if (lastSelectedId.current !== null) {
        lastSelectedId.current = null;
        setTimeout(() => setMessages([]), 0);
        setTrackedVariables([]);
      }
    }
  }, [selectedLead, loadChat]);

  // --- Actions ---
  const handleSyncVariables = async () => {
    if (!selectedLead || !tenantId) return;
    setIsSyncingVars(true);
    try {
      const { runManualAnalysis } = await import("@/lib/actions/analysis");
      const res = await runManualAnalysis(selectedLead.id, tenantId);
      if (res.success && res.data) {
        // Update selectedLead locally with the new metadata
        const updatedMetadata = res.data.extracted_data || {};
        const updatedLead = {
          ...selectedLead,
          metadata: {
            ...(selectedLead.metadata || {}),
            ...updatedMetadata,
          },
        };
        setSelectedLead(updatedLead);
        // Also update the lead in the main leads list
        setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? updatedLead : l)));
      }
    } catch (e) {
      console.error("Failed to sync variables manually:", e);
    } finally {
      setIsSyncingVars(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedLead || !messageText.trim()) return;
    setSending(true);
    const res = await sendManualMessage(selectedLead.id, messageText.trim(), "TEXT");
    if (res.success && res.data) {
      // Capture data to ensure TypeScript knows it's not undefined inside the callback
      const newMessage = res.data;

      // No need to manually update messages if realtime is working,
      // but keeping it for immediate feedback feeling.
      setMessages((prev: ChatMessage[]) => {
        if (prev.find((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      setMessageText("");
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setSending(false);
  };

  // --- Realtime Subscription ---
  // Use a ref so the Supabase callback always has the latest selectedLead
  // without needing to re-subscribe on every lead change (stale closure fix)
  const selectedLeadRef = useRef<InboxLead | null>(null);
  useEffect(() => {
    selectedLeadRef.current = selectedLead;
  }, [selectedLead]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    // Use tenantId from React state (same as dependency array) to avoid stale store snapshot
    const activeTenantId = tenantId || useTenantStore.getState().tenantId;
    if (!activeTenantId) return;

    console.log(`[REALTIME] Subscribing for tenant: ${activeTenantId}`);

    // -- 1. New or Updated chat messages
    const messageChannel = supabase
      .channel(`inbox:chat_summaries:${activeTenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_summaries",
          filter: `tenant_id=eq.${activeTenantId}`,
        },
        (payload) => {
          const row = payload.new as { summary: string; lead_id: string };
          const newSummary = row.summary;
          const leadId = row.lead_id;

          if (selectedLeadRef.current?.id === leadId) {
            const lines = newSummary.split("\n").filter((l: string) => l.trim());
            const messages: ChatMessage[] = lines
              .map((line, idx) => {
                const match = line.match(/^\[(.*?)\] (.*?): (.*)$/);
                if (match) {
                  const [, time, role, content] = match;
                  return {
                    id: `sum-${leadId}-${idx}`,
                    tenant_id: activeTenantId,
                    lead_id: leadId,
                    direction: role === "Usuario" ? "INBOUND" : "OUTBOUND",
                    message_type: "TEXT",
                    content: content,
                    sent_by: role === "Usuario" ? null : "AI_AGENT",
                    status: "READ",
                    created_at: new Date().toISOString(),
                    metadata: { time_label: time },
                  } as ChatMessage;
                }
                return null;
              })
              .filter((m) => m !== null) as ChatMessage[];

            setMessages(messages);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
          }

          // Update the preview in the leads list
          const lines = newSummary.split("\n").filter((l: string) => l.trim());
          const lastLine = lines[lines.length - 1];
          const lastMatch = lastLine?.match(/^\[(.*?)\] (.*?): (.*)$/);

          if (lastMatch) {
            const [, , , content] = lastMatch;
            setLeads((prev) => {
              const updated = prev.map((l) =>
                l.id === leadId
                  ? { ...l, last_message: content, last_message_time: new Date().toISOString() }
                  : l
              );
              return [...updated].sort(
                (a, b) =>
                  new Date(b.last_message_time || 0).getTime() -
                  new Date(a.last_message_time || 0).getTime()
              );
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `tenant_id=eq.${activeTenantId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          console.log("[REALTIME] New message detected:", newMsg.id);

          if (selectedLeadRef.current?.id === newMsg.lead_id) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              const updated = [...prev, newMsg];
              setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
              return updated;
            });
          }

          // Update lead preview in sidebar; if lead not found, force reload
          setLeads((prev) => {
            const leadExists = prev.find((l) => l.id === newMsg.lead_id);
            if (!leadExists) {
              console.log("[REALTIME] Message for unknown lead, forcing reload:", newMsg.lead_id);
              loadLeads(true);
              return prev;
            }
            const updated = prev.map((l) =>
              l.id === newMsg.lead_id
                ? { ...l, last_message: newMsg.content, last_message_time: newMsg.created_at }
                : l
            );
            return [...updated].sort(
              (a, b) =>
                new Date(b.last_message_time || 0).getTime() -
                new Date(a.last_message_time || 0).getTime()
            );
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `tenant_id=eq.${activeTenantId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as ChatMessage;
          if (selectedLeadRef.current?.id === updatedMsg.lead_id) {
            setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
          }
        }
      )
      .subscribe();

    // -- 2. New leads (e.g. from WhatsApp inbound)
    const newLeadChannel = supabase
      .channel(`inbox:new_leads:${activeTenantId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead", filter: `tenant_id=eq.${activeTenantId}` },
        (payload) => {
          const newLead = payload.new as Record<string, unknown>;
          console.log("[REALTIME] New lead:", newLead.id);

          let phone = (newLead.telefono as string) || null;
          if (phone && !phone.startsWith("+")) phone = "+" + phone;

          const inboxLead: InboxLead = {
            id: newLead.id as string,
            tenant_id: activeTenantId as string,
            nombre: (newLead.nombre as string) || null,
            apellido: (newLead.apellido as string) || null,
            telefono: phone,
            foto_url: (newLead.photo_url as string) || (newLead.foto_url as string) || null,
            is_ai_enabled: (newLead.is_ai_enabled as boolean) ?? true,
            ai_agent_id: ((newLead.metadata as Record<string, unknown>)?.ai_agent_id as string) || (newLead.ai_agent_id as string) || null,
            last_message: "Nueva conversacion",
            last_message_time: (newLead.fecha_creacion as string) || new Date().toISOString(),
            created_at: (newLead.fecha_creacion as string) || null,
            tipo_lead: (newLead.tipo_lead as string) || "SIN CALIFICAR",
            pais: (newLead.pais as string) || resolveCountryFromPhone(phone) || "Identificando...",
            origen: (newLead.origen as string) || "WHATSAPP_INBOUND",
            campana: (newLead.campana as string) || "General",
            segmentacion: null,
            metadata: (newLead.metadata as Record<string, unknown>) || {},
            unread_count: 1,
          };

          setLeads((prev) => {
            if (prev.find((l) => l.id === inboxLead.id)) return prev;
            return [inboxLead, ...prev];
          });
        }
      )
      .subscribe();

    // -- 3. Lead updates (metadata, ai_enabled, segmentation)
    const leadUpdateChannel = supabase
      .channel(`inbox:lead_updates:${activeTenantId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lead", filter: `tenant_id=eq.${activeTenantId}` },
        (payload) => {
          const updated = payload.new as Partial<InboxLead>;
          console.log("[REALTIME] Lead updated:", updated.id);

          setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));

          if (selectedLeadRef.current?.id === updated.id) {
            setSelectedLead((prev) => (prev ? { ...prev, ...updated } : (updated as InboxLead)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(newLeadChannel);
      supabase.removeChannel(leadUpdateChannel);
    };
  }, [tenantId, loadLeads]); // Re-subscribe when tenantId changes or becomes available

  const handleSendTemplate = async (templateName: string) => {
    if (!selectedLead) return;
    setSending(true);

    // Find template to get its language and variables
    const tpl = templates.find((t) => t.name === templateName);
    const lang = tpl?.language || "es";
    const mapping = tpl?.variable_mapping || {};

    // Detect variables in BODY and HEADER (Case-insensitive)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bodyComponent = tpl?.components?.find((c: any) => c.type?.toUpperCase() === "BODY");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headerComponent = tpl?.components?.find((c: any) => c.type?.toUpperCase() === "HEADER");

    const bodyText = bodyComponent?.text || "";
    const headerText = headerComponent?.text || "";

    const buildParams = (text: string) => {
      const matches = [...text.matchAll(/\{\{([^}]+)\}\}/g)];
      if (matches.length === 0) return null;

      const params = [];
      for (const m of matches) {
        const varName = m[1];
        const fieldKey = mapping[varName];
        let val = "";

        if (fieldKey) {
          if (fieldKey === "nombre") val = selectedLead.nombre || "";
          else if (fieldKey === "apellido") val = selectedLead.apellido || "";
          else if (fieldKey === "nombre_completo")
            val = `${selectedLead.nombre || ""} ${selectedLead.apellido || ""}`.trim();
          else if (fieldKey === "telefono") val = selectedLead.telefono || "";
          else if (fieldKey === "email") val = selectedLead.email || "";
          else if (fieldKey === "estado") val = selectedLead.tipo_lead || "";
          else if (fieldKey === "origen") val = selectedLead.origen || "";
          else if (fieldKey === "ciudad") val = selectedLead.pais || "";
          else {
            const meta = (selectedLead.metadata as Record<string, unknown>) || {};
            val = (meta[fieldKey] as string) || "";
          }
        } else {
          // Fallbacks if not mapped
          if (varName === "1" || varName.toLowerCase() === "nombre")
            val = selectedLead.nombre || "Cliente";
          else if (varName === "2") {
            const meta = (selectedLead.metadata as Record<string, unknown>) || {};
            val = (meta.course_name as string) || (meta.curso as string) || "nuestro programa";
          } else if (varName === "3") {
            const meta = (selectedLead.metadata as Record<string, unknown>) || {};
            val =
              (meta.appointment_date as string) || (meta.fecha_cita as string) || "prÃ³ximamente";
          }
        }
        const paramObj: any = { type: "text", text: val || "â€”" };
        // Si la variable es texto (ej: {{nombre}}) y no un nÃºmero (ej: {{1}}),
        // Meta exige incluir el parameter_name en el payload.
        if (isNaN(Number(varName))) {
          paramObj.parameter_name = varName;
        }
        params.push(paramObj);
      }
      return params;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const components: any[] = [];

    // 1. Handle Header Parameters
    const headerParams = buildParams(headerText);
    if (headerParams) {
      components.push({ type: "header", parameters: headerParams });
    }

    // 2. Handle Body Parameters
    const bodyParams = buildParams(bodyText);
    if (bodyParams) {
      components.push({ type: "body", parameters: bodyParams });
    } else if (!bodyComponent && selectedLead.nombre) {
      // Saftey fallback if template cache has no components at all but might have {{1}}
      components.push({ type: "body", parameters: [{ type: "text", text: selectedLead.nombre }] });
    }

    // Generate fully mapped text to save to DB so UI shows the mapped version
    let fullMappedText = bodyText;
    if (bodyParams) {
      const matches = [...bodyText.matchAll(/\{\{([^}]+)\}\}/g)];
      matches.forEach((m, i) => {
        const val = bodyParams[i]?.text || "";
        fullMappedText = fullMappedText.replace(m[0], val);
      });
    }

    console.log(`[TEMPLATE DEBUG] Sending components:`, JSON.stringify(components, null, 2));

    const res = await sendManualMessage(
      selectedLead.id,
      templateName,
      "TEMPLATE",
      lang,
      components,
      fullMappedText
    );
    if (res.success && res.data) {
      const newMessage = res.data;
      setMessages((prev: ChatMessage[]) => {
        if (prev.find((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      setIsTemplateModalOpen(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } else if (res.error) {
      toast({ variant: "error", title: "No se pudo enviar el mensaje", description: res.error });
    }
    setSending(false);
  };

  const handleToggleAI = async () => {
    if (!selectedLead) return;
    const newState = !selectedLead.is_ai_enabled;
    const res = await toggleLeadAI(selectedLead.id, newState);
    if (res.success) {
      const updated = { ...selectedLead, is_ai_enabled: newState };
      setSelectedLead(updated);
      setLeads((prev: InboxLead[]) => prev.map((l) => (l.id === selectedLead.id ? updated : l)));
    } else {
      toast({
        variant: "error",
        title: "No se pudo cambiar el estado de la IA",
        description: res.error,
      });
    }
  };

  const handleAssignAgent = async (agentId: string | null) => {
    if (!selectedLead) return;
    setIsAssigningAgent(true);
    const res = await assignAgentToLead(selectedLead.id, agentId);
    if (res.success) {
      const updated = { ...selectedLead, ai_agent_id: agentId };
      setSelectedLead(updated);
      setLeads((prev: InboxLead[]) => prev.map((l) => (l.id === selectedLead.id ? updated : l)));
    } else {
      toast({ variant: "error", title: "No se pudo asignar el agente", description: res.error });
    }
    setIsAssigningAgent(false);
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    setDeleteModal({ isOpen: true, type: "LEAD", includeFacts: true });
  };

  const handleDeleteChat = async () => {
    if (!selectedLead) return;
    setDeleteModal({ isOpen: true, type: "CHAT", includeFacts: false });
  };

  const confirmDelete = async () => {
    if (!selectedLead) return;
    setLoadingChat(true);

    if (deleteModal.type === "LEAD") {
      const res = await deleteLead(selectedLead.id);
      if (res.success) {
        setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
        setSelectedLead(null);
        toast({ variant: "success", title: "Lead eliminado" });
      } else {
        toast({ variant: "error", title: "Error al eliminar lead", description: res.error });
      }
    } else {
      // Delete Chat
      const res = await deleteChatHistory(selectedLead.id);
      if (res.success) {
        setMessages([]);
        // If requested, also delete facts
        if (deleteModal.includeFacts) {
          await deleteLeadFacts(selectedLead.id);
          setSelectedLead((prev) => (prev ? { ...prev, metadata: {} } : null));
        }
        toast({ variant: "success", title: "Chat vaciado" });
      } else {
        toast({ variant: "error", title: "Error al vaciar chat", description: res.error });
      }
    }

    setLoadingChat(false);
    setDeleteModal((prev) => ({ ...prev, isOpen: false }));
  };

  // --- Render Helpers ---
  const formatTime = (ts?: string) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  };

  if (activeView === "LOGIC") {
    return (
      <div className="bg-background flex h-screen flex-col">
        <div className="border-border bg-card/40 flex h-16 items-center justify-between border-b px-8">
          <div className="flex items-center gap-3">
            <GitBranch className="text-primary h-5 w-5" />
            <h2 className="text-foreground text-sm font-black tracking-widest uppercase">
              Constructor de LÃ³gica IA
            </h2>
          </div>
          <button
            title="Cerrar constructor de lÃ³gica"
            onClick={() => setActiveView("INBOX")}
            className="hover:bg-card bg-card/40 border-border flex h-10 w-10 items-center justify-center rounded-full border transition-all"
          >
            <X className="text-foreground h-5 w-5" />
          </button>
        </div>
        <div className="relative flex-1">
          {loadingFlow ? (
            <div className="bg-background/50 absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-xl">
              <Loader2 className="text-primary mb-4 h-12 w-12 animate-spin" />
              <p className="text-muted-foreground/60 text-[10px] font-black tracking-[0.3em] uppercase">
                Cargando Red Neuronal...
              </p>
            </div>
          ) : (
            <AgentFlowBuilder
              agentName={`Agente de Texto ${tenantName}`}
              initialFlow={currentFlow}
              onClose={() => setActiveView("INBOX")}
              onSave={async (flow) => {
                console.log("[SAVE] Executing saveOrchestratorConfig...", flow);
                const res = await saveOrchestratorConfig({
                  flow_graph: flow,
                });

                if (res.success) {
                  setCurrentFlow(flow);
                  setActiveView("INBOX");
                  toast({ variant: "success", title: "Flujo guardado" });
                } else {
                  toast({
                    variant: "error",
                    title: "Error al guardar flujo",
                    description: res.error,
                  });
                }
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // Compute AI Typing state
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const isAITyping =
    selectedLead?.is_ai_enabled &&
    lastMessage?.direction === "INBOUND" &&
    now - new Date(lastMessage.created_at).getTime() < 15000;

  return (
    <div className="text-foreground selection:bg-primary/30 flex h-full overflow-hidden font-sans">
      {/* â”€â”€â”€ COLUMN 1: CONVERSATION LIST (Standard 320px) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="border-border bg-card/40 z-20 flex w-80 flex-shrink-0 flex-col border-r backdrop-blur-3xl">
        <div className="border-border bg-card/20 flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-3">
            <h2 className="text-foreground dark:text-primary text-sm font-black tracking-widest uppercase">
              Conversaciones
            </h2>
            <div className="bg-background/80 text-foreground/60 dark:text-primary border-border dark:border-primary/20 rounded-full border px-2 py-0.5 text-[10px] font-black">
              {leads.length}
            </div>
          </div>
          <div className="relative flex items-center gap-1">
            <button
              title="Filtrar"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-all",
                isFilterOpen || segmentFilter || aiFilter !== null
                  ? "bg-primary text-primary-foreground border-primary/20"
                  : "bg-card border-border text-muted-foreground hover:bg-card/60"
              )}
            >
              <Filter className="h-3.5 w-3.5" />
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="bg-card border-border absolute top-full right-0 z-50 mt-2 w-56 space-y-4 rounded-2xl border p-4 shadow-2xl"
                >
                  <div className="space-y-2">
                    <p className="text-muted-foreground/60 px-1 text-[9px] font-black tracking-widest uppercase">
                      SegmentaciÃ³n
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {["PUESTO 1", "REVISADO", "CUALIFICADO", "SIN INTERÃ‰S"].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSegmentFilter(segmentFilter === s ? null : s)}
                          className={cn(
                            "rounded-md border px-2 py-1 text-[9px] font-bold transition-all",
                            segmentFilter === s
                              ? "bg-primary border-primary/20 text-primary-foreground"
                              : "bg-card/40 border-border text-muted-foreground hover:bg-card/60"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-muted-foreground/60 px-1 text-[9px] font-black tracking-widest uppercase">
                      Estado de Agente
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => setAiFilter(aiFilter === true ? null : true)}
                        className={cn(
                          "rounded-md border px-2 py-1 text-center text-[9px] font-bold transition-all",
                          aiFilter === true
                            ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-500"
                            : "bg-card/40 border-border text-muted-foreground hover:bg-card/60"
                        )}
                      >
                        IA ACTIVA
                      </button>
                      <button
                        onClick={() => setAiFilter(aiFilter === false ? null : false)}
                        className={cn(
                          "rounded-md border px-2 py-1 text-center text-[9px] font-bold transition-all",
                          aiFilter === false
                            ? "border-amber-500/40 bg-amber-500/20 text-amber-500"
                            : "bg-card/40 border-border text-muted-foreground hover:bg-card/60"
                        )}
                      >
                        IA PAUSADA
                      </button>
                    </div>
                  </div>

                  {(segmentFilter || aiFilter !== null) && (
                    <button
                      onClick={() => {
                        setSegmentFilter(null);
                        setAiFilter(null);
                      }}
                      className="bg-card border-border hover:bg-card/60 text-muted-foreground w-full rounded-xl border py-2 text-[9px] font-black tracking-widest uppercase transition-all"
                    >
                      Limpiar Filtros
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              title="Nuevo Prospecto"
              onClick={() => setIsCreateLeadModalOpen(true)}
              className="bg-primary/10 border-primary/20 hover:bg-primary/20 flex h-8 w-8 items-center justify-center rounded-lg border transition-all"
            >
              <PlusCircle className="text-primary h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-card border-border border-b p-4">
          <div className="group relative">
            <Search className="text-muted-foreground/20 group-focus-within:text-primary absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 transition-colors" />
            <input
              placeholder="Buscar prospectos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background/50 border-border focus:ring-primary/20 placeholder:text-muted-foreground/40 text-foreground h-10 w-full rounded-xl border pr-4 pl-11 text-[13px] font-medium transition-all focus:ring-2 focus:outline-none"
            />
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-50/30 dark:bg-black/5">
          {loading ? (
            <div className="flex justify-center py-20 opacity-30">
              <Loader2 className="text-primary h-6 w-6 animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<MessageSquare className="h-12 w-12" />}
                title="AÃºn no hay conversaciones"
                description="Cuando un lead inicie un chat por WhatsApp o web, aparecerÃ¡ aquÃ­. Puedes crear un lead manualmente para arrancar."
                action={
                  <Button size="sm" onClick={() => setIsCreateLeadModalOpen(true)}>
                    <PlusCircle className="h-4 w-4" />
                    Crear lead manualmente
                  </Button>
                }
              />
            </div>
          ) : (
            (() => {
              const filtered = leads.filter((lead) => {
                const matchesSearch =
                  !searchQuery ||
                  (lead.nombre || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (lead.apellido || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (lead.telefono || "").includes(searchQuery);
                const matchesSegment = !segmentFilter || lead.segmentacion === segmentFilter;
                const matchesAI = aiFilter === null || lead.is_ai_enabled === aiFilter;
                return matchesSearch && matchesSegment && matchesAI;
              });
              if (filtered.length === 0) {
                return (
                  <div className="p-6">
                    <EmptyState
                      size="sm"
                      icon={<Search className="h-10 w-10" />}
                      title="Sin resultados"
                      description="NingÃºn lead coincide con los filtros actuales."
                      action={
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSearchQuery("");
                            setSegmentFilter(null);
                            setAiFilter(null);
                          }}
                        >
                          Limpiar filtros
                        </Button>
                      }
                    />
                  </div>
                );
              }
              return filtered.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={cn(
                    "group border-border/20 relative flex w-full items-center gap-4 border-b px-6 py-4 text-left transition-all",
                    selectedLead?.id === lead.id ? "bg-primary/10" : "hover:bg-card/40"
                  )}
                >
                  {selectedLead?.id === lead.id && (
                    <div className="bg-primary absolute top-3 bottom-3 left-0 w-1 rounded-r-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.6)]" />
                  )}

                  <div className="bg-card border-border relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border shadow-sm transition-transform duration-300 group-hover:scale-105">
                    {lead.foto_url ? (
                      <Image
                        src={lead.foto_url}
                        alt={lead.nombre || ""}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="text-muted-foreground/20 h-6 w-6" />
                    )}
                    <div
                      className="border-background absolute right-1 bottom-1 h-2.5 w-2.5 rounded-full border-2 bg-emerald-500"
                      title="WhatsApp Activo"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center justify-between">
                      <p className="text-foreground truncate text-[13px] font-black tracking-tight">
                        {lead.nombre || lead.apellido
                          ? `${lead.nombre || ""} ${lead.apellido || ""}`
                          : lead.telefono || "Sin Nombre"}
                      </p>
                      <span className="text-muted-foreground text-[9px] font-bold tracking-tighter uppercase">
                        {formatTime(lead.last_message_time || undefined)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "truncate text-[11px] font-medium",
                        lead.unread_count ? "text-primary font-black" : "text-muted-foreground/60"
                      )}
                    >
                      {lead.last_message || "Esperando interacciÃ³n..."}
                    </p>
                  </div>
                </button>
              ));
            })()
          )}
        </div>
      </div>

      {/* â”€â”€â”€ COLUMN 2: MAIN CHAT AREA (Flexible Container) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-background border-border relative z-10 flex min-w-0 flex-1 flex-col border-r shadow-2xl">
        <div
          className={cn(
            "border-border bg-card/60 flex h-16 items-center justify-between border-b backdrop-blur-3xl transition-all duration-300",
            showDetails ? "px-4" : "px-8"
          )}
        >
          <div className={cn("flex items-center", showDetails ? "gap-3" : "gap-6")}>
            {selectedLead ? (
              <>
                <div className="bg-card border-border group flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border shadow-sm">
                  {selectedLead.foto_url ? (
                    <Image
                      src={selectedLead.foto_url}
                      alt=""
                      width={40}
                      height={40}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      unoptimized
                    />
                  ) : (
                    <User className="text-muted-foreground/20 h-5 w-5" />
                  )}
                </div>

                <div className="flex min-w-0 flex-col gap-0">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <h2 className="text-foreground shrink truncate text-[15px] leading-tight font-black tracking-tight">
                      {selectedLead.nombre
                        ? `${selectedLead.nombre} ${selectedLead.apellido || ""}`
                        : selectedLead.telefono}
                    </h2>
                    {selectedLead.segmentacion && (
                      <div
                        className={cn(
                          "flex-shrink-0 rounded-md border px-1.5 py-0.5 text-[8px] font-black tracking-[0.1em] uppercase",
                          selectedLead.segmentacion === "CUALIFICADO"
                            ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-500"
                            : selectedLead.segmentacion === "REVISADO"
                              ? "border-blue-500/40 bg-blue-500/20 text-blue-500"
                              : selectedLead.segmentacion === "PUESTO 1"
                                ? "bg-primary/20 border-primary/40 text-primary"
                                : "border-slate-200 bg-slate-100 text-slate-500 dark:border-white/20 dark:bg-white/10 dark:text-slate-500 dark:text-white/40"
                        )}
                      >
                        {selectedLead.segmentacion}
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground/60 flex items-center gap-2">
                    <span className="truncate text-[9px] font-bold tracking-wider">
                      {selectedLead.telefono}
                    </span>
                    {!showDetails && (
                      <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                        <div className="h-1 w-1 rounded-full bg-emerald-500" />
                        <span className="truncate text-[8px] font-black tracking-widest text-emerald-500/70 uppercase">
                          WhatsApp Cloud API
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4 opacity-10">
                <div className="h-10 w-10 rounded-2xl border border-dashed border-white/20" />
                <div className="space-y-1.5">
                  <div className="h-3 w-32 rounded-full bg-white/10" />
                  <div className="h-2 w-24 rounded-full bg-white/5" />
                </div>
              </div>
            )}
          </div>

          {selectedLead && (
            <div className={cn("flex items-center", showDetails ? "gap-2" : "gap-4")}>
              {/* AGENT TOGGLE */}
              <button
                onClick={handleToggleAI}
                title={selectedLead?.is_ai_enabled ? "Pausar Agente IA" : "Activar Agente IA"}
                className={cn(
                  "flex h-9 items-center justify-center overflow-hidden border shadow-lg transition-all",
                  showDetails ? "w-9 rounded-xl px-0" : "gap-2 rounded-xl px-3",
                  selectedLead?.is_ai_enabled
                    ? "bg-primary border-primary/20 text-primary-foreground"
                    : "animate-pulse border-amber-500/20 bg-amber-500 text-white"
                )}
              >
                <Zap className="h-3.5 w-3.5" />
                {!showDetails && (
                  <span className="text-[9px] font-black tracking-widest uppercase">
                    {selectedLead?.is_ai_enabled ? "Agente IA: ON" : "Agente IA: PAUSA"}
                  </span>
                )}
              </button>

              {/* AGENT SELECTOR */}
              <div className="group/agent relative">
                <select
                  value={selectedLead?.ai_agent_id || ""}
                  disabled={isAssigningAgent}
                  onChange={(e) => handleAssignAgent(e.target.value || null)}
                  title="Vincular este lead a un agente especÃ­fico"
                  className={cn(
                    "bg-card/40 border-border text-primary focus:border-primary/20 h-9 cursor-pointer appearance-none rounded-xl border text-[9px] font-black tracking-widest uppercase transition-all focus:outline-none disabled:opacity-50",
                    showDetails
                      ? "flex w-9 items-center justify-center px-0 text-center"
                      : "px-4 pr-8"
                  )}
                >
                  {availableAgents.map((agent) => (
                    <option key={agent.id} value={agent.id} className="bg-slate-900">
                      {agent.name}
                    </option>
                  ))}
                </select>
                {!showDetails && (
                  <ChevronDown className="text-primary pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 transition-transform group-hover/agent:scale-110" />
                )}
              </div>

              <button
                onClick={handleDeleteChat}
                title="Vaciar conversaciÃ³n"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 transition-all hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => setShowDetails(!showDetails)}
                title={showDetails ? "Ocultar detalles" : "Mostrar detalles"}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition-all",
                  showDetails
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-card border-border text-muted-foreground hover:bg-card/60"
                )}
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Messages Window */}
        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-12">
          {!selectedLead ? (
            <div className="flex h-full flex-col items-center justify-center text-center opacity-20">
              <Bot className="text-primary mb-6 h-16 w-16" />
              <h2 className="text-foreground text-2xl font-black tracking-tighter uppercase">
                AI Omnichannel
              </h2>
              <p className="text-muted-foreground mt-2 text-[9px] font-black tracking-[0.3em] uppercase">
                Selecciona un chat para comenzar
              </p>
            </div>
          ) : loadingChat ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessageBubble key={msg.id} message={msg} templates={templates} />
              ))}
              {isAITyping && (
                <div className="animate-in fade-in slide-in-from-bottom-2 flex w-full justify-start duration-300">
                  <div className="flex max-w-[85%] items-end gap-4">
                    <div className="bg-primary/20 border-primary/40 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl border">
                      <Bot className="text-primary h-4 w-4" />
                    </div>
                    <div className="bg-card/60 border-border flex h-11 items-center gap-1 rounded-2xl rounded-bl-sm border px-5 py-4 shadow-sm">
                      <span className="bg-primary/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]"></span>
                      <span className="bg-primary/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]"></span>
                      <span className="bg-primary/60 h-1.5 w-1.5 animate-bounce rounded-full"></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Area */}
        {selectedLead && (
          <div className="bg-card/80 border-border border-t p-8 backdrop-blur-2xl">
            <div className="mx-auto max-w-5xl space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsTemplateModalOpen(true);
                    loadTemplates();
                  }}
                  className="flex h-9 items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 text-[9px] font-black tracking-widest text-emerald-400 uppercase transition-all hover:bg-emerald-500/20"
                >
                  <Star className="h-3.5 w-3.5" /> Enviar Plantilla Meta
                </button>
                <button
                  title="AÃ±adir nota privada"
                  className="bg-card border-border hover:bg-card/60 text-muted-foreground/60 flex h-9 items-center gap-2 rounded-xl border px-4 text-[9px] font-black tracking-widest uppercase transition-all"
                >
                  <Archive className="h-3.5 w-3.5" /> Nota Privada
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    selectedLead.is_ai_enabled
                      ? "El agente IA estÃ¡ respondiendo... (Pausa para responder tÃº)"
                      : "Escribe tu mensaje aquÃ­..."
                  }
                  className={cn(
                    "bg-background border-border focus:ring-primary/20 custom-scrollbar text-foreground max-h-40 min-h-[60px] w-full resize-none rounded-2xl border px-6 py-4 pr-32 text-[14px] font-medium transition-all focus:ring-2 focus:outline-none",
                    selectedLead.is_ai_enabled && "cursor-not-allowed opacity-50"
                  )}
                  readOnly={selectedLead.is_ai_enabled}
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <button
                    disabled={sending || !messageText.trim() || selectedLead.is_ai_enabled}
                    onClick={handleSendMessage}
                    className="bg-primary shadow-primary/20 flex h-10 items-center gap-2 rounded-xl px-5 shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-20"
                  >
                    <span className="text-primary-foreground text-[10px] font-black tracking-widest uppercase">
                      Enviar
                    </span>
                    <Send className="text-primary-foreground h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€â”€ COLUMN 3: LEAD DETAILS (Fixed Right Sidebar) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {selectedLead && showDetails && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="border-border bg-card relative z-30 flex h-full w-80 flex-shrink-0 flex-col overflow-hidden border-l"
          >
            <div className="border-border bg-card/20 flex h-16 items-center justify-between border-b px-8">
              <span className="text-primary text-[11px] font-black tracking-widest uppercase">
                Detalles del Lead
              </span>
              <button
                title="Cerrar detalles"
                onClick={() => setShowDetails(false)}
                className="text-muted-foreground/40 hover:text-primary hover:bg-card flex h-8 w-8 items-center justify-center rounded-lg transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
              {/* Profile Header */}
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="bg-card border-primary/20 h-24 w-24 rounded-[32px] border-2 p-1 shadow-2xl">
                  <div className="h-full w-full overflow-hidden rounded-[28px]">
                    {selectedLead.foto_url ? (
                      <Image
                        src={selectedLead.foto_url}
                        alt=""
                        width={96}
                        height={96}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User className="text-muted-foreground/20 h-8 w-8" />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-foreground text-[16px] font-black tracking-tight">
                    {selectedLead.nombre
                      ? `${selectedLead.nombre} ${selectedLead.apellido || ""}`
                      : selectedLead.telefono}
                  </h3>
                  <p className="text-foreground/50 mt-1 text-[10px] font-bold tracking-[0.2em] uppercase">
                    {selectedLead.tipo_lead || "LEAD SIN REVISAR"}
                  </p>
                </div>
              </div>

              {/* Segmentation Panel */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-muted-foreground/40 text-[10px] font-black tracking-widest uppercase">
                      SegmentaciÃ³n
                    </p>
                    <button
                      onClick={() => setIsEditingSegments(!isEditingSegments)}
                      className="text-primary hover:text-primary/80 text-[9px] font-bold uppercase transition-colors"
                    >
                      {isEditingSegments ? "Guardar" : "Editar"}
                    </button>
                  </div>

                  {isEditingSegments ? (
                    <div className="space-y-2">
                      {segmentations.map((seg, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            value={seg}
                            onChange={(e) => {
                              const newSegs = [...segmentations];
                              newSegs[idx] = e.target.value;
                              setSegmentations(newSegs);
                            }}
                            placeholder="Nombre del segmento"
                            title={`Editar segmento ${seg}`}
                            className="bg-card border-border focus:ring-primary/50 flex-1 rounded-lg border px-3 py-2 text-[10px] font-bold focus:ring-1 focus:outline-none"
                          />
                          <button
                            onClick={() =>
                              setSegmentations(segmentations.filter((_, i) => i !== idx))
                            }
                            title={`Eliminar segmento ${seg}`}
                            aria-label={`Eliminar segmento ${seg}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setSegmentations([...segmentations, "NUEVO SEGMENTO"])}
                          className="bg-card border-border text-muted-foreground hover:bg-card/60 flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-dashed text-[9px] font-black uppercase"
                        >
                          <PlusCircle className="h-3 w-3" /> AÃ±adir
                        </button>
                        <button
                          onClick={async () => {
                            const cleanSegs = segmentations
                              .map((s) => s.trim().toUpperCase())
                              .filter(Boolean);
                            setSegmentations(cleanSegs);
                            setIsEditingSegments(false);
                            if (tenantId) {
                              await updateTenantConfig(tenantId, { segmentations: cleanSegs });
                            }
                          }}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 flex-1 rounded-lg text-[9px] font-black uppercase"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {segmentations.map((seg) => (
                        <button
                          key={seg}
                          onClick={async () => {
                            console.log("Segmenting lead:", selectedLead.id, "to:", seg);

                            // OPTIMISTIC UI: Update immediately
                            const previousSegment = selectedLead.segmentacion;

                            // Functional updates to avoid closure issues
                            setSelectedLead((prev: InboxLead | null) =>
                              prev ? { ...prev, segmentacion: seg } : null
                            );
                            setLeads((prev: InboxLead[]) =>
                              prev.map((l) =>
                                l.id === selectedLead.id ? { ...l, segmentacion: seg } : l
                              )
                            );

                            const res = await updateLeadSegment(selectedLead.id, seg);

                            if (!res.success) {
                              setSelectedLead((prev: InboxLead | null) =>
                                prev ? { ...prev, segmentacion: previousSegment } : null
                              );
                              setLeads((prev: InboxLead[]) =>
                                prev.map((l) =>
                                  l.id === selectedLead.id
                                    ? { ...l, segmentacion: previousSegment }
                                    : l
                                )
                              );
                              toast({
                                variant: "error",
                                title: "Error al guardar segmentaciÃ³n",
                                description: res.error,
                              });
                            }
                          }}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-[9px] font-black tracking-widest uppercase transition-all",
                            selectedLead.segmentacion === seg
                              ? "bg-primary border-primary/20 text-primary-foreground shadow-primary/20 shadow-lg"
                              : "bg-card/40 border-border text-muted-foreground hover:bg-card/60"
                          )}
                        >
                          {seg}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <DetailField
                  label="TelÃ©fono"
                  value={selectedLead.telefono || "Desconocido"}
                  icon={Phone}
                  copyable
                  editable
                  onSave={async (newVal) => {
                    const res = await updateLeadInfo(selectedLead.id, { telefono: newVal });
                    if (res.success) {
                      const updated = { ...selectedLead, telefono: newVal };
                      setSelectedLead(updated);
                      setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? updated : l)));
                    } else {
                      toast({
                        variant: "error",
                        title: "Error al actualizar telÃ©fono",
                        description: res.error,
                      });
                    }
                  }}
                />
                <DetailField
                  label="PaÃ­s"
                  value={
                    selectedLead.pais ||
                    resolveCountryFromPhone(selectedLead.telefono) ||
                    "Identificando..."
                  }
                  icon={Star}
                />
                <DetailField
                  label="Origen"
                  value={selectedLead.origen || "CampaÃ±a OrgÃ¡nica"}
                  icon={GitBranch}
                />
              </div>

              {/* Captured Variables (Live Memory) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground/40 text-[10px] font-black tracking-widest uppercase">
                      Variables Capturadas
                    </p>
                    <span className="animate-pulse rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black tracking-tighter text-emerald-500 uppercase">
                      Live
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {typeof selectedLead.metadata?.last_fact_update === "string" && (
                      <span className="text-muted-foreground/20 text-[8px] font-bold italic">
                        v
                        {new Date(
                          selectedLead.metadata.last_fact_update as string
                        ).toLocaleTimeString()}
                      </span>
                    )}
                    <button
                      onClick={async () => {
                        if (
                          confirm(
                            "Â¿EstÃ¡s seguro de que deseas borrar todas las variables capturadas para este lead? Esto reiniciarÃ¡ la memoria de la IA."
                          )
                        ) {
                          const res = await deleteLeadFacts(selectedLead.id);
                          if (res.success) {
                            const updated = { ...selectedLead, metadata: {} };
                            setSelectedLead(updated);
                            setLeads((prev) =>
                              prev.map((l) => (l.id === selectedLead.id ? updated : l))
                            );
                          } else {
                            toast({
                              variant: "error",
                              title: "Error al borrar variables",
                              description: res.error,
                            });
                          }
                        }
                      }}
                      className="group flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-500 transition-all hover:bg-emerald-500/20"
                    >
                      <Trash2 className="h-3 w-3 transition-transform group-hover:scale-110" />
                      <span className="text-[9px] font-black tracking-widest uppercase">
                        Depurar
                      </span>
                    </button>
                  </div>
                </div>

                {/* Build unified list: all metadata keys + pending tracked vars */}
                {(() => {
                  // 1. Create a normalized copy of metadata (uppercase keys)
                  const meta: Record<string, unknown> = {};
                  if (selectedLead.metadata) {
                    Object.entries(selectedLead.metadata).forEach(([k, val]) => {
                      meta[k.toUpperCase()] = val;
                    });
                  }

                  // 2. Map known equivalents
                  if (meta.ESTADO_CONVERSACION && !meta.CONVERSATION_STATUS) {
                    meta.CONVERSATION_STATUS = meta.ESTADO_CONVERSACION;
                  }
                  if (meta.MOTIVOS_DESCARTE && !meta.MOTIVO_DESCARTE) {
                    meta.MOTIVO_DESCARTE = meta.MOTIVOS_DESCARTE;
                  }
                  if (meta.FECHA_DE_AGENDA && !meta.FECHA_AGENDA) {
                    meta.FECHA_AGENDA = meta.FECHA_DE_AGENDA;
                  }

                  // 3. Fallbacks and defaults requested by the user
                  // Show the external CRM lead ID under ID_LEAD, showing "null" if not present
                  if (!meta.ID_LEAD) {
                    meta.ID_LEAD = selectedLead.id_lead_externo || "null";
                  }
                  // If there is no discard reason, show "null"
                  if (!meta.MOTIVO_DESCARTE) {
                    meta.MOTIVO_DESCARTE = "null";
                  }
                  // If no Q&A topic, show "null"
                  if (!meta.QA_TOPIC) {
                    meta.QA_TOPIC = "null";
                  }

                  const SKIP_KEYS = new Set(["LAST_FACT_UPDATE", "META_ID", "RAW", "MEDIA_URL"]);

                  // 4. All captured keys from normalized metadata (excluding system keys)
                  const rawKeys = Object.keys(meta).filter(
                    (k) => !SKIP_KEYS.has(k) && String(meta[k]).trim() !== ""
                  );

                  const capturedKeys: string[] = [];
                  const seenKeys = new Set<string>();
                  rawKeys.forEach((k) => {
                    if (!seenKeys.has(k.toUpperCase())) {
                      capturedKeys.push(k.toUpperCase());
                      seenKeys.add(k.toUpperCase());
                    }
                  });

                  // 5. Pending tracked vars (those NOT already in normalized metadata)
                  const pendingVars = trackedVariables
                    .map((v) =>
                      v
                        .replace(/^{{|\}}$/g, "")
                        .trim()
                        .toUpperCase()
                    )
                    .filter((k) => {
                      const value = meta[k];
                      return (
                        !value ||
                        String(value).trim() === "" ||
                        String(value).toLowerCase() === "pendiente..."
                      );
                    });

                  console.log("[DEBUG SIDEBAR DETAILED] Selected Lead:", selectedLead.nombre, {
                    metaKeys: Object.keys(meta),
                    metaValues: Object.values(meta),
                    trackedVariables,
                    capturedKeys,
                    pendingVars,
                  });

                  const hasAnything = capturedKeys.length > 0 || pendingVars.length > 0;

                  if (!hasAnything) {
                    return (
                      <div className="bg-card border-border rounded-2xl border border-dashed p-4 text-center">
                        <p className="text-muted-foreground/20 text-[9px] font-bold tracking-widest uppercase">
                          Sin datos capturados aÃºn
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {/* Captured (green) */}
                      {capturedKeys.map((key) => (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] px-4 py-3 transition-colors hover:bg-emerald-500/10"
                        >
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-[8px] font-black tracking-tighter text-emerald-500/50 uppercase">
                              {"{{"}
                              {key.replace(/^\{\{|\}\}$/g, "")}
                              {"}}"}
                            </span>
                            <span className="truncate text-[11px] font-bold text-emerald-400">
                              {String(meta[key])}
                            </span>
                          </div>
                          <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/20">
                            <Check className="h-2.5 w-2.5 text-emerald-500" />
                          </div>
                        </div>
                      ))}

                      {/* Pending tracked vars (gray) */}
                      {pendingVars.map((key) => (
                        <div
                          key={key}
                          className="bg-card border-border flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors"
                        >
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-muted-foreground/20 text-[8px] font-black tracking-tighter uppercase">
                              {"{{"}
                              {key}
                              {"}}"}
                            </span>
                            <span className="text-muted-foreground/20 truncate text-[11px] font-bold italic">
                              Pendiente...
                            </span>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={handleSyncVariables}
                        disabled={isSyncingVars}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-2.5 text-[9px] font-black tracking-widest text-emerald-500 uppercase transition-all hover:bg-emerald-500/10 disabled:opacity-50"
                      >
                        {isSyncingVars ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                            Sincronizando con IA...
                          </>
                        ) : (
                          <>
                            <Zap className="h-3 w-3 animate-pulse fill-emerald-500/20 text-emerald-500" />
                            Actualizar Variables con IA
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setIsProfileModalOpen(true)}
                        className="border-border text-muted-foreground/40 hover:bg-card/60 hover:text-primary w-full rounded-xl border border-dashed py-2 text-[9px] font-black tracking-widest uppercase transition-all"
                      >
                        Ver Perfil Completo
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Automation Timeline */}
              <div className="space-y-6 pt-4">
                <p className="px-1 text-[10px] font-black tracking-widest text-slate-400 uppercase dark:text-white/20">
                  Progreso de AutomatizaciÃ³n
                </p>
                <div className="space-y-4">
                  <TimelineItem
                    label="Entrada CRM"
                    time={selectedLead.created_at || "Hace 2h"}
                    status="COMPLETO"
                    icon={Bot}
                    active
                  />
                  <TimelineItem
                    label="Llamada de CualificaciÃ³n"
                    time="Hace 1h"
                    status={
                      messages.some(
                        (m) => m.message_type === "SYSTEM_LOG" && m.content.includes("Llamada")
                      )
                        ? "COMPLETO"
                        : "PENDIENTE"
                    }
                    icon={Phone}
                    active={messages.some(
                      (m) => m.message_type === "SYSTEM_LOG" && m.content.includes("Llamada")
                    )}
                  />
                  <TimelineItem
                    label="Mensaje de Bienvenida"
                    time="Hace 30m"
                    status="COMPLETO"
                    icon={Send}
                    active
                  />
                  <TimelineItem
                    label="CualificaciÃ³n WhatsApp"
                    time="En curso"
                    status="PROCESANDO"
                    icon={Zap}
                    active
                    isLast
                  />
                </div>
              </div>
            </div>

            <div className="border-border bg-card/40 space-y-4 border-t p-8">
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary h-12 w-full rounded-xl border text-[10px] font-black tracking-widest uppercase shadow-sm transition-all"
              >
                Ver Perfil Completo
              </button>
              <button
                onClick={handleDeleteLead}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 text-[10px] font-black tracking-widest text-red-500 uppercase shadow-sm transition-all hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Eliminar Lead Completamente</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€â”€ LEAD PROFILE MODAL â”€â”€â”€ */}
      <AnimatePresence>
        {isProfileModalOpen && selectedLead && (
          <LeadProfileModal
            lead={selectedLead}
            onClose={() => setIsProfileModalOpen(false)}
            onUpdate={(updated) => {
              setSelectedLead(updated);
              setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
            }}
          />
        )}
      </AnimatePresence>

      {/* â”€â”€â”€ TEMPLATE SELECTOR MODAL â”€â”€â”€ */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
              onClick={() => setIsTemplateModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border-border text-foreground relative w-full max-w-xl space-y-8 rounded-[40px] border p-10 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight uppercase">Plantillas Meta</h3>
                  <p className="text-muted-foreground/40 text-[11px] font-bold tracking-widest uppercase">
                    VerificaciÃ³n Cloud API de WhatsApp
                  </p>
                </div>
                <button
                  title="Cerrar modal"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="hover:bg-card flex h-12 w-12 items-center justify-center rounded-2xl"
                >
                  <X className="text-muted-foreground/40 h-6 w-6" />
                </button>
              </div>

              <div className="custom-scrollbar grid max-h-[500px] grid-cols-1 gap-4 overflow-y-auto pr-2">
                {loadingTemplates ? (
                  <div className="flex flex-col items-center py-20 opacity-30">
                    <Loader2 className="text-primary mb-2 h-8 w-8 animate-spin" />
                    <p className="text-[10px] font-black tracking-widest uppercase">
                      Sincronizando con Meta...
                    </p>
                  </div>
                ) : templates.length > 0 ? (
                  templates.map(
                    (tpl: {
                      id: string;
                      name: string;
                      category: string;
                      language: string;
                      status?: string;
                    }) => (
                      <TemplateCard
                        key={tpl.id}
                        name={tpl.name}
                        description={`CategorÃ­a: ${tpl.category} | Idioma: ${tpl.language}`}
                        onClick={() => handleSendTemplate(tpl.name)}
                        status={tpl.status}
                      />
                    )
                  )
                ) : (
                  <div className="py-10 text-center opacity-30">
                    <p className="text-xs font-bold">No se encontraron plantillas sincronizadas.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isCreateLeadModalOpen && (
        <CreateLeadDialog
          onClose={() => setIsCreateLeadModalOpen(false)}
          onSuccess={() => {
            loadLeads();
          }}
        />
      )}

      {/* â”€â”€â”€ DELETE CONFIRMATION MODAL â”€â”€â”€ */}
      <AnimatePresence>
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
              onClick={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border-border relative w-full max-w-md space-y-8 rounded-[40px] border p-10 shadow-2xl"
            >
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
                  <Trash2 className="h-8 w-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-foreground text-xl font-black tracking-tight uppercase">
                    {deleteModal.type === "LEAD" ? "Eliminar Lead" : "Vaciar ConversaciÃ³n"}
                  </h3>
                  <p className="text-muted-foreground/40 text-xs leading-relaxed font-bold tracking-widest uppercase">
                    {deleteModal.type === "LEAD"
                      ? "Â¿EstÃ¡s seguro de que deseas borrar este lead completamente? Se eliminarÃ¡n todos sus mensajes y datos de memoria."
                      : "Â¿Deseas vaciar todos los mensajes de esta conversaciÃ³n?"}
                  </p>
                </div>
              </div>

              {deleteModal.type === "CHAT" && (
                <div
                  onClick={() =>
                    setDeleteModal((prev) => ({ ...prev, includeFacts: !prev.includeFacts }))
                  }
                  className={cn(
                    "group flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all",
                    deleteModal.includeFacts
                      ? "bg-primary/10 border-primary/20"
                      : "bg-background border-border hover:bg-card/60"
                  )}
                >
                  <div className="space-y-0.5">
                    <p
                      className={cn(
                        "text-[10px] font-black tracking-widest uppercase",
                        deleteModal.includeFacts ? "text-primary" : "text-muted-foreground/60"
                      )}
                    >
                      Borrar Memoria IA
                    </p>
                    <p className="text-muted-foreground/20 text-[9px] font-medium">
                      Eliminar variables capturadas (Facts)
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border transition-all",
                      deleteModal.includeFacts
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-card border-border"
                    )}
                  >
                    {deleteModal.includeFacts && <Check className="h-3 w-3" />}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  onClick={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                  className="bg-card border-border text-muted-foreground/60 hover:bg-card/60 h-14 rounded-2xl border text-[10px] font-black tracking-widest uppercase transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="h-14 rounded-2xl bg-red-600 text-[10px] font-black tracking-widest text-white uppercase shadow-lg shadow-red-600/20 transition-all hover:bg-red-500"
                >
                  {deleteModal.type === "LEAD" ? "Eliminar Todo" : "Confirmar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.35);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}

// --- Sub-components ---
function TimelineItem({
  label,
  time,
  status,
  icon: Icon,
  active,
  isLast,
}: {
  label: string;
  time: string;
  status: string;
  icon: LucideIcon;
  active?: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="relative flex gap-4">
      {!isLast && (
        <div
          className={cn(
            "absolute top-8 bottom-0 left-4 w-[1px]",
            active ? "bg-primary/20" : "bg-white/5"
          )}
        />
      )}
      <div
        className={cn(
          "z-10 flex h-8 w-8 items-center justify-center rounded-xl border transition-all",
          active
            ? "bg-primary/10 border-primary/20 text-primary"
            : "bg-card border-border text-muted-foreground/20"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 pb-4">
        <div className="mb-1 flex items-center justify-between">
          <p
            className={cn(
              "text-[11px] font-black tracking-widest uppercase",
              active ? "text-foreground" : "text-muted-foreground/40"
            )}
          >
            {label}
          </p>
          <span
            className={cn(
              "text-[9px] font-bold uppercase",
              active ? "text-primary/60" : "text-muted-foreground/20"
            )}
          >
            {status}
          </span>
        </div>
        <p className="text-muted-foreground/40 text-[10px] font-medium">{time}</p>
      </div>
    </div>
  );
}

function TemplateCard({
  name,
  description,
  status,
  onClick,
}: {
  name: string;
  description: string;
  status?: string;
  onClick: () => void;
}) {
  return (
    <button
      title={`Usar plantilla ${name}`}
      onClick={onClick}
      className="bg-card border-border hover:border-primary/40 hover:bg-primary/5 group flex w-full flex-col gap-3 rounded-3xl border p-6 text-left transition-all"
    >
      <div className="flex items-center justify-between">
        <span className="text-primary text-[10px] font-black tracking-widest uppercase">
          {name}
        </span>
        {status && (
          <span
            className={cn(
              "rounded-md border px-1.5 py-0.5 text-[8px] font-black tracking-tighter uppercase",
              status === "APPROVED"
                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-500"
                : "bg-card border-border text-muted-foreground/20"
            )}
          >
            {status}
          </span>
        )}
        <Send className="text-muted-foreground/20 group-hover:text-primary h-3.5 w-3.5 transition-colors" />
      </div>
      <p className="text-muted-foreground/60 group-hover:text-foreground text-[12px] leading-relaxed font-medium transition-colors">
        {description}
      </p>
    </button>
  );
}

function DetailField({
  label,
  value,
  icon: Icon,
  copyable,
  editable,
  onSave,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  copyable?: boolean;
  editable?: boolean;
  onSave?: (val: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    await onSave(editValue);
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <div className="group space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground/40 h-3 w-3" />
          <span className="text-muted-foreground/40 text-[10px] font-black tracking-widest uppercase">
            {label}
          </span>
        </div>
        {editable && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-primary text-[9px] font-black tracking-widest uppercase opacity-0 transition-opacity group-hover:opacity-100"
          >
            Editar
          </button>
        )}
      </div>
      <div
        className={cn(
          "bg-card border-border group-hover:bg-card flex w-full items-center justify-between rounded-2xl border p-4 transition-colors",
          copyable && !isEditing && "cursor-pointer"
        )}
      >
        {isEditing ? (
          <div className="flex flex-1 items-center gap-3">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={`Editar ${label.toLowerCase()}...`}
              aria-label={`Editar ${label}`}
              className="text-foreground flex-1 border-none bg-transparent text-sm font-bold focus:outline-none"
              autoFocus
            />
            <button
              disabled={isSaving}
              title="Guardar cambios"
              onClick={handleSave}
              className="bg-primary/20 text-primary hover:bg-primary/30 flex h-7 w-7 items-center justify-center rounded-lg disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
            </button>
            <button
              title="Cancelar"
              onClick={() => {
                setIsEditing(false);
                setEditValue(value);
              }}
              className="bg-card text-muted-foreground/60 hover:bg-card/60 flex h-7 w-7 items-center justify-center rounded-lg"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <>
            <span className="text-foreground/80 text-sm font-bold">{value}</span>
            {copyable && (
              <Paperclip className="text-muted-foreground/20 group-hover:text-primary h-3 w-3 transition-colors" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface MetaTemplate {
  name: string;
  components?: Array<{
    type: string;
    text?: string;
  }>;
}

function ChatMessageBubble({
  message,
  templates = [],
}: {
  message: ChatMessage;
  templates?: MetaTemplate[];
}) {
  const isOut = message.direction === "OUTBOUND";
  const isBot =
    message.sent_by?.toLowerCase().includes("agente") ||
    message.sent_by?.toLowerCase().includes("agent") ||
    message.sent_by === "AI_AGENT" ||
    message.message_type === "TEMPLATE";
  const time = new Date(message.created_at).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // --- Template Parsing ---
  const isTemplate = message.message_type === "TEMPLATE";
  let displayContent = message.content;

  if (isTemplate) {
    // Try to find the template in the loaded list to get the actual body text
    const template = templates.find((t) => t.name === message.content);
    if (template) {
      // Meta structure: components[type=BODY].text
      const bodyComp = template.components?.find((c) => c.type === "BODY");
      if (bodyComp?.text) {
        displayContent = bodyComp.text;
      }
    }
  }

  if (message.message_type === "SYSTEM_LOG") {
    return (
      <div className="my-6 flex justify-center">
        <div className="bg-card border-border text-muted-foreground/40 group/log hover:bg-card flex max-w-md items-center gap-4 rounded-2xl border px-5 py-3 text-[10px] font-bold tracking-widest transition-all">
          <div className="bg-border/20 h-[1px] w-6 rounded-full" />
          <div className="flex items-center gap-2">
            <Zap className="text-primary/20 group-hover/log:text-primary/40 h-3 w-3 transition-colors" />
            <span className="leading-tight uppercase">{message.content}</span>
          </div>
          <div className="bg-border/20 h-[1px] w-6 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group animate-in fade-in slide-in-from-bottom-2 flex duration-500",
        isOut ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative flex max-w-[65%] flex-col gap-2",
          isOut ? "items-end" : "items-start"
        )}
      >
        {/* Meta Indicator */}
        <div
          className={cn(
            "mb-1 flex items-center gap-2 px-2",
            isOut ? "flex-row-reverse" : "flex-row"
          )}
        >
          {isOut ? (
            <>
              <span className="text-muted-foreground/40 text-[9px] font-black tracking-[0.2em] uppercase">
                {isTemplate ? "Plantilla Meta" : isBot ? "Neural Agent" : "Asesor Senior"}
              </span>
              {isBot ? (
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-md border",
                    isTemplate
                      ? "border-emerald-500/20 bg-emerald-500/20 text-emerald-500"
                      : "bg-primary/20 border-primary/20 text-primary"
                  )}
                >
                  <Bot className="h-2.5 w-2.5" />
                </div>
              ) : (
                <User className="text-muted-foreground/40 h-3 w-3" />
              )}
            </>
          ) : (
            <span className="text-muted-foreground/40 text-[9px] font-black tracking-[0.2em] uppercase">
              Prospecto Validado
            </span>
          )}
        </div>

        <div
          className={cn(
            "group/bubble relative rounded-[28px] px-6 py-4 shadow-lg transition-all duration-300",
            isOut
              ? "bg-primary text-primary-foreground rounded-tr-none font-medium shadow-[0_10px_40px_rgba(var(--primary-rgb),0.2)]"
              : isTemplate
                ? "text-foreground rounded-tl-none border border-emerald-500/20 bg-emerald-500/10"
                : "bg-card border-border text-foreground hover:border-primary/20 rounded-tl-none border"
          )}
        >
          {isTemplate && (
            <div className="mb-2 flex items-center gap-2 border-b border-emerald-500/10 pb-2 text-[9px] font-black tracking-widest text-emerald-500/50 uppercase">
              <Star className="h-3 w-3" />
              <span>Contenido de Plantilla</span>
            </div>
          )}
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{displayContent}</p>

          {/* Status Icons */}
          <div
            className={cn(
              "mt-3 flex items-center gap-2 border-t border-white/[0.05] pt-2",
              isOut ? "justify-end" : "justify-start"
            )}
          >
            <span className="text-[9px] font-bold tracking-widest uppercase tabular-nums opacity-30">
              {time}
            </span>
            {isOut && (
              <div className="ml-1 flex items-center">
                {message.status === "READ" ? (
                  <CheckCheck className="h-3 w-3 text-emerald-400 opacity-80" />
                ) : (
                  <Check className="h-3 w-3 opacity-40" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
