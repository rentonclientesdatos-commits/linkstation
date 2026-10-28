"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Settings2,
  Sun,
  Moon,
  Globe2,
  Timer,
  Rocket,
  Save,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrchestratorConfig, saveOrchestratorConfig } from "@/lib/actions/orchestrator-config";
import { runSystemDeployment } from "@/lib/actions/system";
import { toast } from "@/components/ui/toast";

interface OrchestratorConfigDrawerProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
}

const DAYS_MAP = [
  { value: 1, label: "L", full: "Lunes" },
  { value: 2, label: "M", full: "Martes" },
  { value: 3, label: "X", full: "Miércoles" },
  { value: 4, label: "J", full: "Jueves" },
  { value: 5, label: "V", full: "Viernes" },
  { value: 6, label: "S", full: "Sábado" },
  { value: 0, label: "D", full: "Domingo" },
];

const COUNTRIES = [
  { value: "España", flag: "🇪🇸", prefix: "+34", tz: "Europe/Madrid" },
  { value: "México", flag: "🇲🇽", prefix: "+52", tz: "America/Mexico_City" },
  { value: "Chile", flag: "🇨🇱", prefix: "+56", tz: "America/Santiago" },
  { value: "Colombia", flag: "🇨🇴", prefix: "+57", tz: "America/Bogota" },
  { value: "Perú", flag: "🇵🇪", prefix: "+51", tz: "America/Lima" },
  { value: "Argentina", flag: "🇦🇷", prefix: "+54", tz: "America/Buenos_Aires" },
  { value: "Uruguay", flag: "🇺🇾", prefix: "+598", tz: "America/Montevideo" },
  { value: "USA", flag: "🇺🇸", prefix: "+1", tz: "America/New_York" },
  { value: "Portugal", flag: "🇵🇹", prefix: "+351", tz: "Europe/Lisbon" },
];

export function OrchestratorConfigDrawer({ tenantId, isOpen, onClose }: OrchestratorConfigDrawerProps) {
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("20:00");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [pacingMinutes, setPacingMinutes] = useState(60);
  const [messagesPerSlot, setMessagesPerSlot] = useState(10);
  const [reminderHours, setReminderHours] = useState(24);
  const [country, setCountry] = useState("España");
  const [savingConfig, setSavingConfig] = useState(false);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      if (!tenantId) return;
      const res = await getOrchestratorConfig(tenantId);
      if (res.success && res.data) {
        setStartTime(res.data.timezone_rules.start || "09:00");
        setEndTime(res.data.timezone_rules.end || "20:00");
        setWorkingDays(res.data.timezone_rules.working_days || [1, 2, 3, 4, 5]);
        setPacingMinutes(res.data.scheduling?.slot_pacing_minutes || 60);
        setMessagesPerSlot(res.data.scheduling?.messages_per_slot || 10);
        setReminderHours(res.data.scheduling?.reminder_hours || 24);
        if (res.data.timezone_rules?.country) {
          setCountry(res.data.timezone_rules.country);
        }
      }
    }
    if (isOpen) {
      loadConfig();
    }
  }, [tenantId, isOpen]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await saveOrchestratorConfig(
        {
          timezone_rules: {
            start: startTime,
            end: endTime,
            working_days: workingDays,
            phone_prefix_map: {
              "+34": "Europe/Madrid",
              "+56": "America/Santiago",
              "+52": "America/Mexico_City",
              "+57": "America/Bogota",
              "+51": "America/Lima",
              "+54": "America/Argentina/Buenos_Aires",
              "+598": "America/Montevideo",
              "+1": "America/New_York",
              "+44": "Europe/London",
            },
            country: country,
          },
          scheduling: {
            slot_pacing_minutes: pacingMinutes,
            messages_per_slot: messagesPerSlot,
            reminder_hours: reminderHours,
            reminder_template: "appointment_reminder_es",
          },
        },
        tenantId
      );

      if (res.success) {
        toast({
          variant: "success",
          title: "Configuración guardada",
          description: `Parámetros globales y país base (${country}) actualizados con éxito.`,
        });
      } else {
        toast({
          variant: "error",
          title: "Error al guardar",
          description: res.error || "No se pudo guardar la configuración.",
        });
      }
    } catch (err: unknown) {
      toast({
        variant: "error",
        title: "Error inesperado",
        description: err instanceof Error ? err.message : "Error al guardar.",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      await handleSaveConfig();
      const res = await runSystemDeployment();
      if (res.success) {
        toast({ variant: "success", title: "Sistema desplegado", description: res.message });
      } else {
        toast({ variant: "error", title: "Error al desplegar", description: res.error });
      }
    } catch (error: unknown) {
      toast({
        variant: "error",
        title: "Error inesperado",
        description: error instanceof Error ? error.message : "Error de despliegue",
      });
    } finally {
      setDeploying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over panel */}
      <div
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-[#0c0c10]/95 shadow-2xl backdrop-blur-3xl animate-in slide-in-from-right duration-300"
        style={{
          boxShadow: "-20px 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide text-white uppercase">
                Ajustes del Sistema
              </h2>
              <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                Motor de Automatización Global
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.06] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 scrollbar-thin">
          {/* Status summary card */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-[11px] font-black tracking-wider text-emerald-300 uppercase">
                Motor Operativo en Producción
              </span>
            </div>
            <p className="mt-1 text-[11px] text-white/50 leading-relaxed">
              Las reglas configuradas aplican automáticamente a llamadas de voz, WhatsApp templates y condiciones horarias de los leads.
            </p>
          </div>

          {/* Horario de Atención */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black tracking-widest text-white/60 uppercase">
                Horario de Contacto Permitido
              </label>
              <span className="text-[10px] font-mono text-cyan-400">
                {startTime} - {endTime}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 transition-all focus-within:border-emerald-500/40">
                <Sun className="h-4 w-4 shrink-0 text-emerald-400" />
                <div className="flex-1">
                  <span className="block text-[9px] font-bold text-white/30 uppercase">Inicio</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-transparent text-xs font-black text-white [color-scheme:dark] outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 transition-all focus-within:border-blue-500/40">
                <Moon className="h-4 w-4 shrink-0 text-blue-400" />
                <div className="flex-1">
                  <span className="block text-[9px] font-bold text-white/30 uppercase">Cierre</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-transparent text-xs font-black text-white [color-scheme:dark] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Días Laborables */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-white/40" />
              <label className="text-[10px] font-black tracking-widest text-white/60 uppercase">
                Días de Operación Semanal
              </label>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_MAP.map((d) => {
                const isActive = workingDays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      const updated = isActive
                        ? workingDays.filter((x) => x !== d.value)
                        : [...workingDays, d.value].sort();
                      setWorkingDays(updated);
                    }}
                    className={cn(
                      "flex h-11 flex-col items-center justify-center rounded-xl border text-[11px] font-black transition-all",
                      isActive
                        ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300 shadow-sm shadow-cyan-500/20"
                        : "border-white/[0.06] bg-white/[0.02] text-white/30 hover:border-white/10 hover:text-white/60"
                    )}
                    title={d.full}
                  >
                    <span>{d.label}</span>
                    <span className="text-[8px] opacity-40 font-normal">
                      {isActive ? "ON" : "·"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* País del Cliente (Base Horaria) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe2 className="h-3.5 w-3.5 text-white/40" />
              <label className="text-[10px] font-black tracking-widest text-white/60 uppercase">
                País Base del Negocio
              </label>
            </div>
            <div className="relative">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-white/[0.08] bg-[#14141c] px-4 py-3 text-xs font-bold text-white outline-none transition-all focus:border-cyan-500/50"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-[#14141c] text-white">
                    {c.flag} {c.value} ({c.prefix} · {c.tz})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed">
              El orquestador calcula en tiempo real el huso horario exacto de cada lead según su prefijo telefónico.
            </p>
          </div>

          {/* Pacing & Control */}
          <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Timer className="h-4 w-4" />
              <span className="text-[10px] font-black tracking-widest uppercase">
                Control de Pacing & Recordatorios
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-white/40 uppercase">Ventana</label>
                <div className="relative">
                  <input
                    type="number"
                    value={pacingMinutes}
                    onChange={(e) => setPacingMinutes(parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-xs font-black text-white outline-none focus:border-cyan-500/50"
                  />
                  <span className="absolute right-2 top-2 text-[9px] text-white/30">min</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-white/40 uppercase">Límite</label>
                <div className="relative">
                  <input
                    type="number"
                    value={messagesPerSlot}
                    onChange={(e) => setMessagesPerSlot(parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-xs font-black text-white outline-none focus:border-cyan-500/50"
                  />
                  <span className="absolute right-2 top-2 text-[9px] text-white/30">msg</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-white/40 uppercase">Recordatorio</label>
                <div className="relative">
                  <input
                    type="number"
                    value={reminderHours}
                    onChange={(e) => setReminderHours(parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-xs font-black text-white outline-none focus:border-cyan-500/50"
                  />
                  <span className="absolute right-2 top-2 text-[9px] text-white/30">hrs</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="space-y-2 border-t border-white/[0.06] bg-black/40 p-5">
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-[11px] font-black tracking-widest text-white uppercase transition-all hover:bg-white/10 active:scale-[0.99] disabled:opacity-40"
          >
            <Save className={cn("h-4 w-4", savingConfig && "animate-spin")} />
            {savingConfig ? "Guardando..." : "Guardar Ajustes"}
          </button>

          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-[11px] font-black tracking-widest text-black uppercase shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
          >
            <Rocket className={cn("h-4 w-4 text-black", deploying && "animate-bounce")} />
            {deploying ? "Desplegando Sistema..." : "Desplegar Sistema a Producción"}
          </button>
        </div>
      </div>
    </div>
  );
}
