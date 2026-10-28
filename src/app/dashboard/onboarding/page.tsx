"use client";

import { useState } from "react";
import { SequenceCanvas } from "@/components/onboarding/SequenceCanvas";
import { WorkflowPicker } from "@/components/onboarding/WorkflowPicker";
import { OrchestratorConfigDrawer } from "@/components/onboarding/OrchestratorConfigDrawer";
import { Zap, Building2, Timer, Settings2, Sparkles, Layers } from "lucide-react";
import { useTenantStore } from "@/store/tenant";
import { ReactFlowProvider } from "@xyflow/react";

/**
 * ONBOARDING — UNIFIED FLOW ORCHESTRATOR v5.0
 * Visual Flow Builder with Top-Bar Workflow Switcher & Full-Bleed Canvas
 *
 * ✅ Full 100% Canvas Workspace (No fixed sidebar clutter)
 * ✅ Xcode / Figma style Workflow Picker Dropdown
 * ✅ Slide-over Global System Configuration Drawer
 * ✅ Live HUD & Timezone Automation
 */
export default function OnboardingPage() {
  const { tenantId, tenantName, isConfigured } = useTenantStore();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);

  if (!isConfigured || !tenantId) {
    return (
      <div className="animate-in fade-in flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 text-center duration-700">
        <div className="bg-primary/10 text-primary border-primary/20 shadow-primary/10 flex h-20 w-20 items-center justify-center rounded-3xl border shadow-xl">
          <Building2 className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight uppercase">Selecciona un Cliente</h2>
          <p className="text-muted-foreground max-w-sm opacity-60">
            Debes seleccionar un cliente en el menú lateral para gestionar sus flujos de
            automatización.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background animate-in fade-in flex h-[calc(100vh-1.5rem)] w-full flex-col overflow-hidden duration-700">
      {/* ── Top Bar with Workflow Picker & Global Actions ───── */}
      <div className="border-b border-white/[0.06] bg-[#08080c]/80 z-[60] flex shrink-0 items-center justify-between px-6 py-2.5 backdrop-blur-2xl">
        {/* Left: Branding & Workflow Picker */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-md shadow-cyan-500/10">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-sm leading-none font-black tracking-wider text-white uppercase">
                  Flow Orchestrator
                </h1>
                <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-white/50 uppercase">
                  {tenantName}
                </span>
              </div>
              <p className="text-white/30 text-[9px] font-mono tracking-widest uppercase">
                Unified Node Engine V5.0
              </p>
            </div>
          </div>

          <div className="h-5 w-px bg-white/10" />

          {/* Xcode / Figma Style Workflow Switcher */}
          <WorkflowPicker
            tenantId={tenantId}
            selectedWorkflowId={selectedWorkflowId}
            onSelect={setSelectedWorkflowId}
          />
        </div>

        {/* Right: Status Pills & Settings Button */}
        <div className="flex items-center gap-2.5">
          {/* Timezone pill */}
          <div className="flex items-center gap-1.5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-[10px] font-bold tracking-wider text-yellow-400 uppercase">
            <Timer className="h-3 w-3" />
            <span className="hidden sm:inline">Timezone Auto</span>
          </div>

          {/* Operational pill */}
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="hidden sm:inline">Live Mode</span>
          </div>

          {/* Global Config Drawer trigger button */}
          <button
            onClick={() => setIsConfigDrawerOpen(true)}
            className="group flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-black tracking-wider text-white/70 uppercase transition-all hover:border-cyan-500/40 hover:bg-white/[0.08] hover:text-white active:scale-95"
            title="Configuración de horarios, días, país y pacing"
          >
            <Settings2 className="h-3.5 w-3.5 text-cyan-400 group-hover:rotate-45 transition-transform duration-300" />
            <span>Ajustes Globales</span>
          </button>
        </div>
      </div>

      {/* ── 100% Full-Bleed Canvas Workspace ────────────────── */}
      <div className="relative flex-1 overflow-hidden bg-[#070709]">
        {selectedWorkflowId ? (
          <ReactFlowProvider key={selectedWorkflowId}>
            <SequenceCanvas tenantId={tenantId} workflowId={selectedWorkflowId} />
          </ReactFlowProvider>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center opacity-30">
            <Zap className="h-16 w-16 text-cyan-400 animate-pulse" />
            <div className="space-y-2">
              <p className="text-sm font-black tracking-widest text-white uppercase">
                Cargando Flujo de Trabajo...
              </p>
              <p className="text-xs text-white/60">Selecciona o crea un workflow en el menú superior</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Global Orchestrator Config Slide-Over Drawer ─────── */}
      <OrchestratorConfigDrawer
        tenantId={tenantId}
        isOpen={isConfigDrawerOpen}
        onClose={() => setIsConfigDrawerOpen(false)}
      />
    </div>
  );
}
