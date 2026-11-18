"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Users,
  Clock,
  Check,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Phone,
  Mail,
  RotateCcw,
  Save,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAdvisors,
  saveAdvisor,
  deleteAdvisor,
  getAdvisorSlots,
  saveAdvisorSlots,
  getAppointments,
  updateAppointmentStatus,
  deleteAppointment,
  deleteAppointmentsBulk,
  createAppointment,
  cancelAppointment,
  rescheduleAppointment,
  checkAvailability,
  type Advisor,
  type Appointment,
} from "@/lib/actions/scheduling";
import { getInboxLeads, type InboxLead } from "@/lib/actions/inbox";
import { getActiveTenantConfig, updateTenantConfig } from "@/lib/actions/tenant";
import {
  Wrench,
  Search,
  CalendarPlus,
  CalendarX,
  Terminal,
  Globe,
  BellRing,
  Settings2,
  Sparkles,
  MessageSquareQuote,
} from "lucide-react";
import { resolveTimezoneFromPhone } from "@/lib/utils/location-client";
import { toast } from "@/components/ui/toast";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAYS_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAYS_DB_MAP = [1, 2, 3, 4, 5, 6, 0]; // Monday=1, Sunday=0 for DB

const STATUS_CONFIG = {
  PENDING: { label: "Pendiente", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  CONFIRMED: {
    label: "Confirmada",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  CANCELLED: { label: "Cancelada", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  COMPLETED: { label: "Completada", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  NO_SHOW: { label: "No apareció", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
};

type Tab = "agenda" | "advisors" | "slots" | "tools" | "reminders";

interface TenantConfig {
  scheduling?: {
    reminders?: {
      enabled: boolean;
      lead_time_minutes: number;
      repetitions: number;
      mode: "manual" | "ai";
      template: string;
    };
    slot_duration?: number;
  };
}

export default function CalendarPage() {
  const [tab, setTab] = useState<Tab>("agenda");
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  const [editingAdvisor, setEditingAdvisor] = useState<Partial<Advisor> | null>(null);
  const [slots, setSlots] = useState<
    Record<number, { active: boolean; ranges: { id: string; start: string; end: string }[] }>
  >({}); // dayOfWeek → config
  const [slotDuration, setSlotDuration] = useState(15);
  const [saving, setSaving] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [leads, setLeads] = useState<InboxLead[]>([]);
  const [toolLog, setToolLog] = useState<{ action: string; result: unknown; time: string }[]>([]);

  // Tool states
  const [toolLeadId, setToolLeadId] = useState("");
  const [toolAdvisorId, setToolAdvisorId] = useState("");
  const [toolDate, setToolDate] = useState(new Date().toISOString().split("T")[0]);
  const [toolTime, setToolTime] = useState("10:00");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedAptIds, setSelectedAptIds] = useState<string[]>([]);
  const [reminderConfig, setReminderConfig] = useState({
    enabled: true,
    lead_time_minutes: 60,
    repetitions: 1,
    mode: "manual" as "manual" | "ai",
    template:
      "Hola {nombre}, 👋 te recordamos que tienes una cita programada con un asesor de Esden hoy a las {hora} (hora España). ¡Te esperamos!",
  });
  const [miniMonthDate, setMiniMonthDate] = useState<Date>(new Date());
  const [filterAdvisorId, setFilterAdvisorId] = useState<string>("all");
  const [selectedDayFilter, setSelectedDayFilter] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    const [advisorsRes, aptsRes, leadsRes] = await Promise.all([
      getAdvisors(),
      getAppointments(),
      getInboxLeads(),
    ]);
    if (advisorsRes.success && advisorsRes.data) {
      setAdvisors(advisorsRes.data);
    }
    if (aptsRes.success && aptsRes.data) setAppointments(aptsRes.data);
    if (leadsRes.success && leadsRes.data) setLeads(leadsRes.data);
  }, []);

  const loadSlots = useCallback(async (advisorId: string | null) => {
    const res = await getAdvisorSlots(advisorId);
    if (res.success && res.data) {
      const map: Record<
        number,
        { active: boolean; ranges: { id: string; start: string; end: string }[] }
      > = {};
      [0, 1, 2, 3, 4, 5, 6].forEach(
        (d) =>
          (map[d] = { active: false, ranges: [{ id: "default", start: "09:00", end: "20:00" }] })
      );

      if (res.data && res.data.length > 0) {
        res.data.forEach((s) => {
          if (!map[s.day_of_week].active) {
            map[s.day_of_week].active = true;
            map[s.day_of_week].ranges = [];
          }
          map[s.day_of_week].ranges.push({
            id: Math.random().toString(36).substr(2, 9),
            start: s.start_time || "09:00",
            end: s.end_time || "20:00",
          });
        });
      }
      setSlots(map);
    } else {
      // Reset if no data or error
      const map: Record<
        number,
        { active: boolean; ranges: { id: string; start: string; end: string }[] }
      > = {};
      [0, 1, 2, 3, 4, 5, 6].forEach(
        (d) =>
          (map[d] = { active: false, ranges: [{ id: "default", start: "09:00", end: "20:00" }] })
      );
      setSlots(map);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const [advisorsRes, aptsRes, leadsRes] = await Promise.all([
        getAdvisors(),
        getAppointments(),
        getInboxLeads(),
      ]);
      if (!isMounted) return;
      if (advisorsRes.success && advisorsRes.data) setAdvisors(advisorsRes.data);
      if (aptsRes.success && aptsRes.data) setAppointments(aptsRes.data);
      if (leadsRes.success && leadsRes.data) setLeads(leadsRes.data);
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const loadReminderConfig = async () => {
      const tenant = await getActiveTenantConfig();
      const config = (tenant as { config: TenantConfig } | null)?.config;
      if (config?.scheduling?.reminders) {
        setReminderConfig(config.scheduling.reminders);
      }
      if (config?.scheduling?.slot_duration) {
        setSlotDuration(Number(config.scheduling.slot_duration));
      }
    };
    void loadReminderConfig();
  }, []);

  const saveReminderConfig = async () => {
    const tenant = await getActiveTenantConfig();
    if (!tenant) return;
    setSaving(true);
    try {
      const res = await updateTenantConfig(tenant.id, {
        scheduling: {
          reminders: reminderConfig,
        },
      });
      if (res.success) {
        toast({
          variant: "success",
          title: "Configuración guardada",
          description: "Configuración de recordatorios guardada correctamente.",
        });
      } else {
        toast({ variant: "error", title: "Error al guardar", description: res.error });
      }
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!selectedAdvisor && advisors.length > 0 && tab !== "slots") {
      const first = advisors[0];
      const timer = setTimeout(() => {
        setSelectedAdvisor(first);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [advisors, selectedAdvisor, tab]);

  useEffect(() => {
    let isMounted = true;
    // In slots tab, we might have selectedAdvisor = null for "General"
    if (tab === "slots") {
      getAdvisorSlots(selectedAdvisor?.id || null).then((res) => {
        if (!isMounted) return;
        const map: Record<
          number,
          { active: boolean; ranges: { id: string; start: string; end: string }[] }
        > = {};
        [0, 1, 2, 3, 4, 5, 6].forEach(
          (d) =>
            (map[d] = { active: false, ranges: [{ id: "default", start: "09:00", end: "20:00" }] })
        );

        if (res.success && res.data && res.data.length > 0) {
          res.data.forEach((s) => {
            if (!map[s.day_of_week].active) {
              map[s.day_of_week].active = true;
              map[s.day_of_week].ranges = [];
            }
            map[s.day_of_week].ranges.push({
              id: Math.random().toString(36).substr(2, 9),
              start: s.start_time || "09:00",
              end: s.end_time || "20:00",
            });
          });
        }
        setSlots(map);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [selectedAdvisor, tab]);

  // Build week display
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek + weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Mini month calendar days calculation
  const miniYear = miniMonthDate.getFullYear();
  const miniMonth = miniMonthDate.getMonth();
  const firstDayOfMonth = new Date(miniYear, miniMonth, 1);
  const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(miniYear, miniMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(miniYear, miniMonth, 0).getDate();

  const miniCalendarDays: { day: number; currentMonth: boolean; date: Date }[] = [];
  for (let i = startDayIndex - 1; i >= 0; i--) {
    const d = new Date(miniYear, miniMonth - 1, daysInPrevMonth - i);
    miniCalendarDays.push({ day: daysInPrevMonth - i, currentMonth: false, date: d });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(miniYear, miniMonth, i);
    miniCalendarDays.push({ day: i, currentMonth: true, date: d });
  }
  const remainingCells = (7 - (miniCalendarDays.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(miniYear, miniMonth + 1, i);
    miniCalendarDays.push({ day: i, currentMonth: false, date: d });
  }

  const handleSelectMiniDate = (targetDate: Date) => {
    setSelectedDayFilter(targetDate);
    const today = new Date();
    const todayMon = new Date(today);
    todayMon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    todayMon.setHours(0, 0, 0, 0);

    const targetMon = new Date(targetDate);
    targetMon.setDate(targetDate.getDate() - ((targetDate.getDay() + 6) % 7));
    targetMon.setHours(0, 0, 0, 0);

    const diffWeeks = Math.round((targetMon.getTime() - todayMon.getTime()) / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(diffWeeks);
  };

  const getAppointmentsForDay = (date: Date) =>
    appointments.filter((apt) => {
      if (filterAdvisorId !== "all") {
        const advId = apt.advisor_id;
        if (advId !== filterAdvisorId) return false;
      }
      const aptDate = new Date(apt.scheduled_at);
      return (
        aptDate.getFullYear() === date.getFullYear() &&
        aptDate.getMonth() === date.getMonth() &&
        aptDate.getDate() === date.getDate()
      );
    });

  const displayedAppointments = appointments.filter((apt) => {
    if (filterAdvisorId !== "all") {
      const advId = apt.advisor_id;
      if (advId !== filterAdvisorId) return false;
    }
    if (selectedDayFilter) {
      const aptDate = new Date(apt.scheduled_at);
      return (
        aptDate.getFullYear() === selectedDayFilter.getFullYear() &&
        aptDate.getMonth() === selectedDayFilter.getMonth() &&
        aptDate.getDate() === selectedDayFilter.getDate()
      );
    }
    return true;
  });

  async function handleSaveAdvisor() {
    if (!editingAdvisor?.name) return;
    setSaving(true);
    const res = await saveAdvisor(editingAdvisor);
    if (res.error) {
      toast({ variant: "error", title: "Error al guardar asesor", description: res.error });
      setSaving(false);
      return;
    }
    setEditingAdvisor(null);
    await loadData();
    setSaving(false);
  }

  async function handleSaveSlots() {
    setSaving(true);
    const advisorId = selectedAdvisor?.id || null;
    const slotsToSave: {
      day_of_week: number;
      start_time: string;
      end_time: string;
      slot_duration_minutes: number;
    }[] = [];
    Object.entries(slots).forEach(([day, config]) => {
      if (config.active) {
        config.ranges.forEach((range) => {
          slotsToSave.push({
            day_of_week: parseInt(day),
            start_time: range.start,
            end_time: range.end,
            slot_duration_minutes: slotDuration,
          });
        });
      }
    });

    // 2. Save duration in tenant config
    const tenant = await getActiveTenantConfig();
    if (tenant) {
      await updateTenantConfig(tenant.id, {
        scheduling: {
          slot_duration: slotDuration,
        },
      });
    }

    const res = await saveAdvisorSlots(advisorId, slotsToSave);
    if (res.success) {
      toast({
        variant: "success",
        title: "Horarios guardados",
        description: "Horarios guardados correctamente.",
      });
      await loadSlots(advisorId); // Reload to confirm
    } else {
      toast({ variant: "error", title: "Error al guardar horarios", description: res.error });
    }
    setSaving(false);
  }

  async function handleStatusChange(aptId: string, status: string) {
    await updateAppointmentStatus(aptId, status);
    await loadData();
  }

  async function handleDeleteAppointment(aptId: string) {
    if (
      !confirm(
        "⚠️ ¿Estás seguro de que deseas eliminar permanentemente esta cita de la base de datos? Esta acción no se puede deshacer."
      )
    )
      return;
    const res = await deleteAppointment(aptId);
    if (res.success) {
      setSelectedAppointment(null);
      setSelectedAptIds((prev) => prev.filter((id) => id !== aptId));
      await loadData();
    } else {
      toast({ variant: "error", title: "Error al eliminar cita", description: res.error });
    }
  }

  async function handleDeleteSelected() {
    if (selectedAptIds.length === 0) return;
    if (
      !confirm(
        `⚠️ ¿Estás seguro de que deseas eliminar permanentemente las ${selectedAptIds.length} citas seleccionadas de la base de datos? Esta acción no se puede deshacer.`
      )
    )
      return;

    setSaving(true);
    const res = await deleteAppointmentsBulk(selectedAptIds);
    if (res.success) {
      setSelectedAptIds([]);
      await loadData();
    } else {
      toast({ variant: "error", title: "Error al eliminar citas", description: res.error });
    }
    setSaving(false);
  }

  function exportAppointmentsToCSV() {
    if (appointments.length === 0) {
      toast({
        variant: "warning",
        title: "Sin datos",
        description: "No hay citas registradas para exportar.",
      });
      return;
    }

    const headers = [
      "ID",
      "Fecha Programada",
      "Estado",
      "Lead Nombre",
      "Lead Telefono",
      "Asesor",
      "Notas",
    ];
    const rows = appointments.map((apt) => [
      apt.id,
      new Date(apt.scheduled_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
      apt.status,
      `${apt.lead?.nombre || ""} ${apt.lead?.apellido || ""}`.trim(),
      apt.lead?.telefono || "",
      apt.advisors?.name || "Sin asignar",
      (apt.notes || "").replace(/\n/g, " ").replace(/"/g, '""'),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `citas_esden_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const addLog = (action: string, result: unknown) => {
    setToolLog((prev) =>
      [{ action, result, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10)
    );
  };

  async function testCheckAvailability() {
    if (!toolAdvisorId) {
      toast({ variant: "warning", title: "Selecciona un asesor" });
      return;
    }
    setSaving(true);
    const res = await checkAvailability(toolAdvisorId, toolDate);
    addLog("checkAvailability", res);
    setSaving(false);
  }

  async function testBook() {
    if (!toolLeadId) {
      toast({ variant: "warning", title: "Selecciona un lead" });
      return;
    }
    setSaving(true);
    const scheduledAt = new Date(`${toolDate}T${toolTime}`).toISOString();
    const res = await createAppointment({
      lead_id: toolLeadId,
      advisor_id: toolAdvisorId,
      scheduled_at: scheduledAt,
      status: "PENDING",
    });
    addLog("createAppointment", res);
    if (res.success) await loadData();
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-[#090a0d] text-white">
      {/* HEADER */}
      <div className="flex flex-col gap-4 border-b border-[#23252e] bg-[#0d0e12] px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#23252e] bg-[#16171d] text-[#3b82f6]">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white uppercase">Calendario & Agendas</h1>
            <p className="text-[11px] font-medium text-[#8a8f9d]">
              Round Robin · Asesores · Citas Automáticas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[#23252e] bg-[#121317] p-1">
          {(["agenda", "advisors", "slots", "reminders", "tools"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              title={t}
              className={cn(
                "h-8 rounded-lg px-3.5 text-[11px] font-semibold whitespace-nowrap transition-all",
                tab === t
                  ? "border border-[#2d3139] bg-[#1e2027] text-white shadow-sm"
                  : "text-[#8a8f9d] hover:bg-white/[0.04] hover:text-white"
              )}
            >
              {t === "agenda"
                ? "Agenda"
                : t === "advisors"
                  ? "Asesores"
                  : t === "slots"
                    ? "Horarios"
                    : t === "reminders"
                      ? "Recordatorios"
                      : "Tools"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 md:p-8">
        {/* ── AGENDA TAB (Month + Week Split) ─────────────────────────── */}
        {tab === "agenda" && (
          <div className="flex flex-col gap-6 xl:flex-row">
            {/* LEFT SIDEBAR: Mini Month Calendar + Filters + Summary */}
            <div className="w-full shrink-0 space-y-4 xl:w-72">
              {/* Mini Month Calendar */}
              <div className="rounded-2xl border border-[#23252e] bg-[#121317] p-4 shadow-sm">
                {/* Month Navigator Header */}
                <div className="flex items-center justify-between border-b border-[#23252e] pb-3">
                  <button
                    onClick={() => {
                      const prev = new Date(miniMonthDate);
                      prev.setMonth(prev.getMonth() - 1);
                      setMiniMonthDate(prev);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#23252e] bg-[#16171d] text-[#8a8f9d] transition-all hover:bg-[#1e2027] hover:text-white"
                    title="Mes anterior"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[12px] font-bold tracking-wider text-white capitalize">
                    {miniMonthDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                  </span>
                  <button
                    onClick={() => {
                      const next = new Date(miniMonthDate);
                      next.setMonth(next.getMonth() + 1);
                      setMiniMonthDate(next);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#23252e] bg-[#16171d] text-[#8a8f9d] transition-all hover:bg-[#1e2027] hover:text-white"
                    title="Mes siguiente"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Weekdays header */}
                <div className="grid grid-cols-7 pt-3 pb-1 text-center text-[10px] font-bold text-[#8a8f9d]">
                  {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
                    <div key={i}>{d}</div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {miniCalendarDays.map((item, idx) => {
                    const isSelectedDay =
                      selectedDayFilter &&
                      item.date.toDateString() === selectedDayFilter.toDateString();
                    const isToday = item.date.toDateString() === new Date().toDateString();
                    const hasApts = appointments.some((apt) => {
                      const d = new Date(apt.scheduled_at);
                      return d.toDateString() === item.date.toDateString();
                    });

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectMiniDate(item.date)}
                        className={cn(
                          "relative mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-medium transition-all",
                          !item.currentMonth && "text-zinc-600 opacity-30",
                          item.currentMonth &&
                            !isSelectedDay &&
                            !isToday &&
                            "text-zinc-300 hover:bg-[#1a1b22] hover:text-white",
                          isToday && !isSelectedDay && "border border-blue-500/40 font-bold text-blue-400",
                          isSelectedDay && "bg-blue-600 font-bold text-white shadow-md shadow-blue-600/30"
                        )}
                        title={item.date.toLocaleDateString("es-ES")}
                      >
                        {item.day}
                        {hasApts && (
                          <span
                            className={cn(
                              "absolute bottom-1 h-1 w-1 rounded-full",
                              isSelectedDay ? "bg-white" : "bg-blue-400"
                            )}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Summary Metric Cards */}
              <div className="space-y-2.5 rounded-2xl border border-[#23252e] bg-[#121317] p-4 shadow-sm">
                <div className="text-[10px] font-bold tracking-wider text-[#8a8f9d] uppercase">
                  Resumen de Citas
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[#23252e] bg-[#16171d] p-2.5">
                    <p className="text-[10px] text-[#8a8f9d]">Total</p>
                    <p className="text-base font-bold text-white">{appointments.length}</p>
                  </div>
                  <div className="rounded-xl border border-[#23252e] bg-[#16171d] p-2.5">
                    <p className="text-[10px] text-amber-400">Pendientes</p>
                    <p className="text-base font-bold text-white">
                      {appointments.filter((a) => a.status === "PENDING").length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#23252e] bg-[#16171d] p-2.5">
                    <p className="text-[10px] text-emerald-400">Confirmadas</p>
                    <p className="text-base font-bold text-white">
                      {appointments.filter((a) => a.status === "CONFIRMED").length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#23252e] bg-[#16171d] p-2.5">
                    <p className="text-[10px] text-blue-400">Esta Semana</p>
                    <p className="text-base font-bold text-white">
                      {weekDays.reduce((acc, d) => acc + getAppointmentsForDay(d).length, 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Advisor Filter Dropdown */}
              <div className="space-y-2 rounded-2xl border border-[#23252e] bg-[#121317] p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-[#8a8f9d] uppercase">
                    Filtrar por Asesor
                  </span>
                  {filterAdvisorId !== "all" && (
                    <button
                      onClick={() => setFilterAdvisorId("all")}
                      className="text-[10px] text-blue-400 hover:underline"
                    >
                      Todos
                    </button>
                  )}
                </div>
                <select
                  value={filterAdvisorId}
                  onChange={(e) => setFilterAdvisorId(e.target.value)}
                  className="w-full rounded-xl border border-[#23252e] bg-[#16171d] px-3 py-2 text-[12px] font-medium text-zinc-200 outline-none transition-all focus:border-blue-500"
                  title="Filtrar por asesor"
                >
                  <option value="all" className="bg-[#121317] text-white">Todos los asesores</option>
                  {advisors.map((adv) => (
                    <option key={adv.id} value={adv.id} className="bg-[#121317] text-white">
                      {adv.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* RIGHT MAIN AREA: Week Grid + Appointments Table */}
            <div className="min-w-0 flex-1 space-y-5">
              {/* Week Navigator Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#23252e] bg-[#121317] p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWeekOffset((w) => w - 1)}
                    title="Semana anterior"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#23252e] bg-[#16171d] text-[#8a8f9d] transition-all hover:bg-[#1e2027] hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setWeekOffset(0);
                      setSelectedDayFilter(null);
                      setMiniMonthDate(new Date());
                    }}
                    title="Semana actual"
                    className="h-8 rounded-lg border border-[#23252e] bg-[#16171d] px-3 text-[11px] font-semibold text-zinc-300 transition-all hover:bg-[#1e2027] hover:text-white"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => setWeekOffset((w) => w + 1)}
                    title="Semana siguiente"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#23252e] bg-[#16171d] text-[#8a8f9d] transition-all hover:bg-[#1e2027] hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <h2 className="text-xs font-bold tracking-wider text-zinc-300 uppercase">
                  {weekDays[0].toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  {" — "}
                  {weekDays[6].toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </h2>

                <div className="flex items-center gap-2">
                  {selectedDayFilter && (
                    <button
                      onClick={() => setSelectedDayFilter(null)}
                      className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-400 hover:bg-blue-500/20"
                    >
                      <span>Viendo: {selectedDayFilter.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Week Grid */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
                {weekDays.map((day, i) => {
                  const dayApts = getAppointmentsForDay(day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected =
                    selectedDayFilter && day.toDateString() === selectedDayFilter.toDateString();

                  // Group by time to detect overlaps visually
                  const timeGroups: Record<string, Appointment[]> = {};
                  dayApts.forEach((apt) => {
                    const spainTime = new Date(apt.scheduled_at).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Madrid",
                    });
                    if (!timeGroups[spainTime]) timeGroups[spainTime] = [];
                    timeGroups[spainTime].push(apt);
                  });

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDayFilter(isSelected ? null : day)}
                      className={cn(
                        "min-h-[170px] cursor-pointer space-y-2 rounded-xl border p-3 transition-all",
                        isSelected
                          ? "border-blue-500 bg-[#161c2c] ring-1 ring-blue-500"
                          : isToday
                            ? "border-blue-500/40 bg-[#121622]"
                            : "border-[#23252e] bg-[#121317] hover:border-[#353945]"
                      )}
                    >
                      <div className="flex items-center justify-between border-b border-[#23252e]/60 pb-2">
                        <span className="text-[10px] font-bold tracking-wider text-[#8a8f9d] uppercase">
                          {day.toLocaleDateString("es-ES", { weekday: "short" })}
                        </span>
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                            isToday
                              ? "bg-blue-600 text-white"
                              : "text-zinc-300"
                          )}
                        >
                          {day.getDate()}
                        </span>
                      </div>

                      {dayApts.length === 0 ? (
                        <p className="pt-4 text-center text-[10px] text-[#52525b]">
                          Sin citas
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {Object.entries(timeGroups).map(([time, apts]) => {
                            const hasOverlap = apts.length > 1;
                            return apts.map((apt, idx) => {
                              const sc =
                                STATUS_CONFIG[apt.status as keyof typeof STATUS_CONFIG] ||
                                STATUS_CONFIG.PENDING;
                              return (
                                <div
                                  key={apt.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAppointment(apt);
                                  }}
                                  className={cn(
                                    "group relative cursor-pointer rounded-lg border p-2 text-[9px] font-medium transition-all hover:scale-[1.02]",
                                    sc.color,
                                    hasOverlap && "border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                                  )}
                                >
                                  {hasOverlap && idx === 0 && (
                                    <div className="absolute -top-1.5 -right-1.5 z-10 flex h-4 items-center justify-center rounded-full bg-red-500 px-1 text-[7px] font-bold text-white">
                                      CONFLICTO
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between font-bold">
                                    <span>{time} <span className="opacity-50">ES</span></span>
                                    <span className="flex items-center gap-0.5 opacity-70">
                                      <Globe className="h-2 w-2" />
                                      {new Date(apt.scheduled_at).toLocaleTimeString("es-ES", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        timeZone: resolveTimezoneFromPhone(apt.lead?.telefono),
                                      })}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 truncate font-semibold text-white">
                                    {apt.lead?.nombre} {apt.lead?.apellido}
                                  </div>
                                  <div className="truncate text-[8px] opacity-60">
                                    {apt.advisors?.name || "Sin asignar"}
                                  </div>
                                </div>
                              );
                            });
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Appointment List Table */}
              <div className="overflow-hidden rounded-2xl border border-[#23252e] bg-[#121317] shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b border-[#23252e] px-5 py-3.5">
                  {displayedAppointments.length > 0 && (
                    <input
                      type="checkbox"
                      checked={
                        displayedAppointments.slice(0, 20).length > 0 &&
                        selectedAptIds.length === displayedAppointments.slice(0, 20).length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAptIds(displayedAppointments.slice(0, 20).map((apt) => apt.id));
                        } else {
                          setSelectedAptIds([]);
                        }
                      }}
                      className="h-4 w-4 cursor-pointer rounded border-[#23252e] bg-[#16171d] text-blue-600 focus:ring-blue-500"
                      title="Seleccionar todas"
                    />
                  )}
                  <Clock className="h-4 w-4 text-[#8a8f9d]" />
                  <span className="text-[11px] font-bold tracking-wider text-zinc-300 uppercase">
                    {selectedDayFilter
                      ? `Citas del ${selectedDayFilter.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}`
                      : "Todas las Citas"}
                  </span>

                  {selectedAptIds.length > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      className="ml-auto flex h-7 items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 text-[10px] font-semibold text-rose-400 transition-all hover:bg-rose-500/20"
                      title="Eliminar citas seleccionadas"
                    >
                      <Trash2 className="h-3 w-3" /> Eliminar ({selectedAptIds.length})
                    </button>
                  )}

                  <button
                    onClick={exportAppointmentsToCSV}
                    className={cn(
                      "flex h-7 items-center gap-1.5 rounded-lg border border-[#23252e] bg-[#16171d] px-3 text-[10px] font-semibold text-zinc-200 transition-all hover:bg-[#1e2027]",
                      selectedAptIds.length === 0 && "ml-auto"
                    )}
                    title="Exportar citas a CSV"
                  >
                    <Download className="h-3 w-3" /> Exportar CSV
                  </button>
                  <span className="border-l border-[#23252e] pl-3 text-[10px] font-medium text-[#8a8f9d]">
                    {displayedAppointments.length} registros
                  </span>
                </div>

                {displayedAppointments.length === 0 ? (
                  <div className="py-14 text-center text-[#8a8f9d]">
                    <Calendar className="mx-auto mb-2 h-10 w-10 opacity-20" />
                    <p className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                      Sin citas registradas
                    </p>
                    <p className="mt-1 text-[11px] text-[#52525b]">
                      Las citas se crean automáticamente cuando el orquestador cualifica un prospecto.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#1d1f27]">
                    {displayedAppointments.slice(0, 20).map((apt) => {
                      const sc =
                        STATUS_CONFIG[apt.status as keyof typeof STATUS_CONFIG] ||
                        STATUS_CONFIG.PENDING;
                      const isSelected = selectedAptIds.includes(apt.id);
                      return (
                        <div
                          key={apt.id}
                          onClick={() => setSelectedAppointment(apt)}
                          className={cn(
                            "flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-all hover:bg-white/[0.02]",
                            isSelected && "border-l-2 border-l-blue-500 bg-blue-500/[0.04]"
                          )}
                        >
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAptIds((prev) => [...prev, apt.id]);
                                } else {
                                  setSelectedAptIds((prev) => prev.filter((id) => id !== apt.id));
                                }
                              }}
                              className="h-4 w-4 cursor-pointer rounded border-[#23252e] bg-[#16171d] text-blue-600 focus:ring-blue-500"
                              title="Seleccionar cita"
                              aria-label={`Seleccionar cita de ${apt.lead?.nombre || "prospecto"}`}
                            />
                          </div>
                          <div className="w-44 shrink-0">
                            <p className="text-xs font-semibold text-white">
                              {new Date(apt.scheduled_at).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                                timeZone: "Europe/Madrid",
                              })}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <p className="text-[10px] font-bold text-blue-400">
                                {new Date(apt.scheduled_at).toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "Europe/Madrid",
                                })}{" "}
                                ES
                              </p>
                              <div className="h-2.5 w-[1px] bg-[#23252e]" />
                              <p className="flex items-center gap-1 text-[10px] text-[#8a8f9d]">
                                <Globe className="h-2.5 w-2.5" />
                                {new Date(apt.scheduled_at).toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: resolveTimezoneFromPhone(apt.lead?.telefono),
                                })}{" "}
                                Local
                              </p>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-white">
                              {apt.lead?.nombre} {apt.lead?.apellido}
                            </p>
                            <p className="text-[10px] text-[#8a8f9d]">
                              {apt.lead?.telefono}
                            </p>
                          </div>
                          <div className="hidden w-28 truncate text-[11px] text-zinc-300 md:block">
                            {apt.advisors?.name || "Sin asignar"}
                          </div>
                          {apt.ab_variant && (
                            <span className="hidden rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold text-purple-400 sm:inline">
                              {apt.ab_variant === "A" ? "Agente A" : "Agente B"}
                            </span>
                          )}
                          <span
                            className={cn(
                              "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                              sc.color
                            )}
                          >
                            {sc.label}
                          </span>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {apt.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(apt.id, "CONFIRMED")}
                                  title="Confirmar"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 transition-all hover:bg-emerald-500/20"
                                >
                                  <Check className="h-3 w-3 text-emerald-400" />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(apt.id, "CANCELLED")}
                                  title="Cancelar"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 transition-all hover:bg-red-500/20"
                                >
                                  <X className="h-3 w-3 text-red-400" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteAppointment(apt.id)}
                              title="Eliminar definitivamente"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 transition-all hover:bg-rose-500/20"
                            >
                              <Trash2 className="h-3 w-3 text-rose-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ADVISORS TAB ───────────────────────────────────────── */}
        {tab === "advisors" && (
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                Equipo de Asesores
              </h2>
              <button
                onClick={() =>
                  setEditingAdvisor({ name: "", email: "", phone: "", is_active: true })
                }
                className="bg-primary text-primary-foreground flex h-9 items-center gap-2 rounded-xl px-4 text-[10px] font-black tracking-widest uppercase transition-all hover:scale-[1.02]"
                title="Añadir asesor"
              >
                <Plus className="h-3.5 w-3.5" /> Nuevo Asesor
              </button>
            </div>

            {/* Edit Form */}
            {editingAdvisor && (
              <div className="bg-primary/5 border-primary/20 animate-in slide-in-from-top space-y-4 rounded-3xl border p-6 duration-300">
                <h3 className="text-primary text-xs font-black tracking-widest uppercase">
                  {editingAdvisor.id ? "Editar Asesor" : "Nuevo Asesor"}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                      Nombre *
                    </label>
                    <input
                      value={editingAdvisor.name || ""}
                      onChange={(e) => setEditingAdvisor((p) => ({ ...p, name: e.target.value }))}
                      className="focus:ring-primary/30 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      placeholder="Nombre completo"
                      aria-label="Nombre del asesor"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                      Email
                    </label>
                    <input
                      value={editingAdvisor.email || ""}
                      onChange={(e) => setEditingAdvisor((p) => ({ ...p, email: e.target.value }))}
                      className="focus:ring-primary/30 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      placeholder="email@empresa.com"
                      aria-label="Email del asesor"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                      Teléfono
                    </label>
                    <input
                      value={editingAdvisor.phone || ""}
                      onChange={(e) => setEditingAdvisor((p) => ({ ...p, phone: e.target.value }))}
                      className="focus:ring-primary/30 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      placeholder="+34 600 000 000"
                      aria-label="Teléfono del asesor"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                      Países que gestiona
                    </label>
                    <input
                      value={editingAdvisor.countries?.join(", ") || ""}
                      onChange={(e) =>
                        setEditingAdvisor((p) => ({
                          ...p,
                          countries: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      className="focus:ring-primary/30 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      placeholder="México, España, etc."
                      title="Países separados por coma"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                      Orígenes de Lead
                    </label>
                    <input
                      value={editingAdvisor.origins?.join(", ") || ""}
                      onChange={(e) =>
                        setEditingAdvisor((p) => ({
                          ...p,
                          origins: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      className="focus:ring-primary/30 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      placeholder="WhatsApp, CRM, etc."
                      title="Orígenes separados por coma"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                      Campañas Específicas
                    </label>
                    <input
                      value={editingAdvisor.campaigns?.join(", ") || ""}
                      onChange={(e) =>
                        setEditingAdvisor((p) => ({
                          ...p,
                          campaigns: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      className="focus:ring-primary/30 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      placeholder="Campaña MBA 2024, etc."
                      title="Campañas separadas por coma"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                      Cursos Específicos
                    </label>
                    <input
                      value={editingAdvisor.courses?.join(", ") || ""}
                      onChange={(e) =>
                        setEditingAdvisor((p) => ({
                          ...p,
                          courses: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      className="focus:ring-primary/30 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      placeholder="Máster Big Data, etc."
                      title="Cursos separados por coma"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                      Tipos de Lead (Estado)
                    </label>
                    <input
                      value={editingAdvisor.handled_lead_types?.join(", ") || ""}
                      onChange={(e) =>
                        setEditingAdvisor((p) => ({
                          ...p,
                          handled_lead_types: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      className="focus:ring-primary/30 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      placeholder="nuevo, ilocalizable, etc."
                      title="Tipos de lead separados por coma"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                      Especialidad General
                    </label>
                    <input
                      value={editingAdvisor.specialties?.join(", ") || ""}
                      onChange={(e) =>
                        setEditingAdvisor((p) => ({
                          ...p,
                          specialties: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      className="focus:ring-primary/30 text-primary h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:ring-2 focus:outline-none dark:border-white/10 dark:bg-white/5"
                      placeholder="Especialidad técnica..."
                      title="Lista de especialidades separadas por coma"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveAdvisor}
                    disabled={saving}
                    title="Guardar asesor"
                    className="bg-primary text-primary-foreground shadow-primary/20 flex h-9 items-center gap-2 rounded-xl px-5 text-[10px] font-black tracking-widest uppercase shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" /> {saving ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    onClick={() => setEditingAdvisor(null)}
                    title="Cancelar"
                    className="h-9 rounded-xl border border-slate-200 bg-white px-5 text-[10px] font-black tracking-widest text-slate-500 uppercase transition-all hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white/40 dark:hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Advisors List */}
            <div className="space-y-3">
              {advisors.length === 0 && (
                <div className="py-20 text-center text-slate-400 dark:text-white/20">
                  <Users className="mx-auto mb-3 h-12 w-12 opacity-20" />
                  <p className="text-xs font-bold tracking-widest uppercase">
                    Sin asesores configurados
                  </p>
                  <p className="mt-1 text-[10px] opacity-60">
                    Añade asesores para que el Round Robin pueda asignarles leads.
                  </p>
                </div>
              )}
              {advisors.map((advisor) => (
                <div
                  key={advisor.id}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/[0.03]"
                >
                  <div className="bg-primary/10 border-primary/20 text-primary flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border text-sm font-black">
                    {advisor.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-white">{advisor.name}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[8px] font-black uppercase",
                          advisor.is_active
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-slate-200 text-slate-500 dark:bg-white/5 dark:text-white/20"
                        )}
                      >
                        {advisor.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-4">
                      {advisor.email && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-white/30">
                          <Mail className="h-3 w-3" />
                          {advisor.email}
                        </span>
                      )}
                      {advisor.phone && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-white/30">
                          <Phone className="h-3 w-3" />
                          {advisor.phone}
                        </span>
                      )}
                    </div>
                    {(advisor.countries?.length || 0) +
                      (advisor.origins?.length || 0) +
                      (advisor.campaigns?.length || 0) +
                      (advisor.courses?.length || 0) >
                      0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {advisor.countries?.map((c) => (
                          <span
                            key={c}
                            className="rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-bold text-blue-400 uppercase"
                          >
                            {c}
                          </span>
                        ))}
                        {advisor.origins?.map((o) => (
                          <span
                            key={o}
                            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400 uppercase"
                          >
                            {o}
                          </span>
                        ))}
                        {advisor.campaigns?.map((ca) => (
                          <span
                            key={ca}
                            className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-400 uppercase"
                          >
                            {ca}
                          </span>
                        ))}
                        {advisor.courses?.map((co) => (
                          <span
                            key={co}
                            className="rounded border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[8px] font-bold text-purple-400 uppercase"
                          >
                            {co}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedAdvisor(advisor);
                        setTab("slots");
                      }}
                      title="Editar horarios"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 transition-all hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-white/40" />
                    </button>
                    <button
                      onClick={() => setEditingAdvisor(advisor)}
                      title="Editar asesor"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 transition-all hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <Pencil className="h-3.5 w-3.5 text-slate-400 dark:text-white/40" />
                    </button>
                    <button
                      onClick={() => {
                        deleteAdvisor(advisor.id);
                        loadData();
                      }}
                      title="Eliminar asesor"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 transition-all hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SLOTS TAB ──────────────────────────────────────────── */}
        {tab === "slots" && (
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                Disponibilidad Semanal
              </h2>
              <button
                onClick={() => setTab("advisors")}
                title="Volver"
                className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-200/50 px-4 text-[10px] font-black tracking-widest text-slate-500 uppercase transition-all hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-white/40 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Volver
              </button>
            </div>

            {/* Simplified Mode Selector */}
            <div className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-200/50 p-2 dark:border-white/10 dark:bg-white/5">
              <button
                onClick={() => setSelectedAdvisor(null)}
                className={cn(
                  "h-10 flex-1 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all",
                  !selectedAdvisor
                    ? "bg-primary text-primary-foreground shadow-primary/20 shadow-lg"
                    : "text-slate-500 hover:bg-slate-200 dark:text-white/40 dark:hover:bg-white/5"
                )}
              >
                Sin Asesores (General)
              </button>
              <button
                onClick={() => advisors.length > 0 && setSelectedAdvisor(advisors[0])}
                className={cn(
                  "h-10 flex-1 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all",
                  selectedAdvisor
                    ? "bg-primary text-primary-foreground shadow-primary/20 shadow-lg"
                    : "text-slate-500 hover:bg-slate-200 dark:text-white/40 dark:hover:bg-white/5"
                )}
              >
                Con Asesores
              </button>
            </div>

            {selectedAdvisor && (
              <div className="animate-in fade-in slide-in-from-top flex flex-wrap gap-2 duration-300">
                {advisors.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAdvisor(a)}
                    className={cn(
                      "h-9 rounded-xl border px-4 text-[10px] font-bold transition-all",
                      selectedAdvisor.id === a.id
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/40"
                    )}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 dark:border-white/5 dark:bg-white/[0.02]">
              <div className="mb-2 flex items-center gap-2">
                <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
                <span className="text-primary text-[10px] font-black tracking-widest uppercase">
                  Editando: {selectedAdvisor ? `Asesor ${selectedAdvisor.name}` : "Horario General"}
                </span>
              </div>

              {/* Slot Duration Selector */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <div>
                  <p className="text-[10px] font-black tracking-widest text-slate-900 uppercase dark:text-white">
                    Duración de cada cita
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 dark:text-white/40">
                    Define cuánto tiempo dura cada hueco en la agenda
                  </p>
                </div>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                  className="focus:ring-primary h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black tracking-widest uppercase outline-none focus:ring-1 dark:border-white/10 dark:bg-black/40"
                  title="Seleccionar duración de cita"
                >
                  <option value={10}>10 Minutos</option>
                  <option value={15}>15 Minutos</option>
                  <option value={20}>20 Minutos</option>
                  <option value={30}>30 Minutos</option>
                  <option value={45}>45 Minutos</option>
                  <option value={60}>1 Hora</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-3">
                  {DAYS_FULL.map((dayLabel, i) => {
                    const dbDay = DAYS_DB_MAP[i];
                    const slotConfig = slots[dbDay] || {
                      active: false,
                      ranges: [{ id: "default", start: "09:00", end: "20:00" }],
                    };
                    const isActive = slotConfig.active;
                    return (
                      <button
                        key={i}
                        onClick={() =>
                          setSlots((s) => ({
                            ...s,
                            [dbDay]: {
                              ...slotConfig,
                              active: !isActive,
                            },
                          }))
                        }
                        title={`Toggle ${dayLabel}`}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all",
                          isActive
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-white/20 dark:hover:text-white/40"
                        )}
                      >
                        <span className="text-[9px] font-black tracking-widest uppercase">
                          {DAYS[i]}
                        </span>
                        <div
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                            isActive
                              ? "bg-primary border-primary"
                              : "border-slate-200 dark:border-white/10"
                          )}
                        >
                          {isActive && <Check className="text-primary-foreground h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Time configuration for active days */}
                <div className="space-y-3">
                  <p className="px-1 text-[10px] font-black tracking-widest text-slate-400 uppercase dark:text-white/20">
                    Horarios por Día
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {DAYS_FULL.map((dayLabel, i) => {
                      const dbDay = DAYS_DB_MAP[i];
                      const slotConfig = slots[dbDay];
                      if (!slotConfig?.active) return null;

                      return (
                        <div
                          key={dbDay}
                          className="animate-in fade-in slide-in-from-left flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 duration-300 dark:border-white/5 dark:bg-white/[0.03]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-primary text-[10px] font-black tracking-widest uppercase">
                              {DAYS[i]}
                            </span>
                            <button
                              onClick={() => {
                                setSlots((s) => {
                                  const newRanges = [
                                    ...s[dbDay].ranges,
                                    {
                                      id: Math.random().toString(36).substr(2, 9),
                                      start: "09:00",
                                      end: "20:00",
                                    },
                                  ];
                                  return { ...s, [dbDay]: { ...s[dbDay], ranges: newRanges } };
                                });
                              }}
                              className="hover:text-primary flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase transition-all"
                            >
                              <Plus className="h-3 w-3" /> Añadir
                            </button>
                          </div>

                          <div className="flex flex-col gap-2">
                            {slotConfig.ranges.map((range, rangeIndex) => (
                              <div key={range.id} className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={range.start}
                                  onChange={(e) => {
                                    setSlots((s) => {
                                      const newRanges = [...s[dbDay].ranges];
                                      newRanges[rangeIndex].start = e.target.value;
                                      return { ...s, [dbDay]: { ...s[dbDay], ranges: newRanges } };
                                    });
                                  }}
                                  className="focus:ring-primary flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-1 dark:border-white/10 dark:bg-black/20 dark:text-white"
                                  title="Hora de inicio"
                                />
                                <span className="text-[10px] font-bold text-slate-400 dark:text-white/20">
                                  A
                                </span>
                                <input
                                  type="time"
                                  value={range.end}
                                  onChange={(e) => {
                                    setSlots((s) => {
                                      const newRanges = [...s[dbDay].ranges];
                                      newRanges[rangeIndex].end = e.target.value;
                                      return { ...s, [dbDay]: { ...s[dbDay], ranges: newRanges } };
                                    });
                                  }}
                                  className="focus:ring-primary flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-1 dark:border-white/10 dark:bg-black/20 dark:text-white"
                                  title="Hora de fin"
                                />
                                {slotConfig.ranges.length > 1 && (
                                  <button
                                    onClick={() => {
                                      setSlots((s) => {
                                        const newRanges = s[dbDay].ranges.filter(
                                          (_, idx) => idx !== rangeIndex
                                        );
                                        return {
                                          ...s,
                                          [dbDay]: { ...s[dbDay], ranges: newRanges },
                                        };
                                      });
                                    }}
                                    className="p-1 text-slate-300 transition-all hover:text-red-500"
                                    title="Eliminar franja"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-6 dark:border-white/5">
                <button
                  onClick={() => loadSlots(selectedAdvisor?.id || null)}
                  title="Deshacer cambios"
                  className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-200/50 px-4 text-[10px] font-black tracking-widest text-slate-500 uppercase transition-all hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-white/40 dark:hover:bg-white/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Deshacer
                </button>
                <button
                  onClick={handleSaveSlots}
                  disabled={saving}
                  title="Guardar horarios"
                  className="bg-primary text-primary-foreground shadow-primary/20 flex h-9 items-center gap-2 rounded-xl px-6 text-[10px] font-black tracking-widest uppercase shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> {saving ? "Guardando..." : "Guardar Horarios"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOOLS TAB ─────────────────────────────────────────── */}
        {tab === "tools" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* LEFT: Configuration & Simulator */}
            <div className="space-y-6 lg:col-span-2">
              <div className="space-y-8 rounded-3xl border border-white/5 bg-white/[0.02] p-8">
                <div className="flex items-center gap-3">
                  <Wrench className="text-primary h-5 w-5" />
                  <h2 className="text-sm font-black tracking-widest uppercase">
                    Simulador de Herramientas de IA
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                      1. Seleccionar Lead
                    </label>
                    <select
                      value={toolLeadId}
                      onChange={(e) => setToolLeadId(e.target.value)}
                      title="Seleccionar Lead para la herramienta"
                      className="focus:ring-primary h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-1 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      <option value="">Seleccionar Lead...</option>
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nombre} {l.apellido} ({l.telefono})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                      2. Seleccionar Asesor
                    </label>
                    <select
                      value={toolAdvisorId}
                      onChange={(e) => setToolAdvisorId(e.target.value)}
                      title="Seleccionar Asesor para la herramienta"
                      className="focus:ring-primary h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-1 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      <option value="">Sin Asesor (Pendiente)</option>
                      {advisors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                      3. Fecha
                    </label>
                    <input
                      type="date"
                      value={toolDate}
                      onChange={(e) => setToolDate(e.target.value)}
                      title="Seleccionar Fecha"
                      className="focus:ring-primary h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-1 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                      4. Hora
                    </label>
                    <input
                      type="time"
                      value={toolTime}
                      onChange={(e) => setToolTime(e.target.value)}
                      title="Seleccionar Hora"
                      className="focus:ring-primary h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-1 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={testCheckAvailability}
                    className="group flex h-12 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 text-[10px] font-black tracking-widest uppercase transition-all hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <Search className="group-hover:text-primary h-4 w-4 text-slate-400 transition-colors dark:text-white/40" />
                    Disponibilidad
                  </button>
                  <button
                    onClick={testBook}
                    className="bg-primary text-primary-foreground shadow-primary/20 flex h-12 items-center justify-center gap-3 rounded-2xl text-[10px] font-black tracking-widest uppercase shadow-lg transition-all hover:scale-[1.02]"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Agendar Cita
                  </button>
                </div>
              </div>

              <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="space-y-4">
                  {toolLeadId ? (
                    <div className="space-y-3">
                      {appointments.filter(
                        (a) => a.lead_id === toolLeadId && a.status !== "CANCELLED"
                      ).length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic dark:text-white/20">
                          No hay citas activas para este lead.
                        </p>
                      ) : (
                        appointments
                          .filter((a) => a.lead_id === toolLeadId && a.status !== "CANCELLED")
                          .map((apt) => (
                            <div
                              key={apt.id}
                              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">
                                  {new Date(apt.scheduled_at).toLocaleString("es-ES", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                                <p className="mt-0.5 text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                                  {apt.advisors?.name}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    const res = await rescheduleAppointment(
                                      apt.id,
                                      new Date(`${toolDate}T${toolTime}`).toISOString()
                                    );
                                    addLog("rescheduleAppointment", res);
                                    await loadData();
                                  }}
                                  className="h-8 rounded-lg border border-slate-200 bg-slate-200 px-3 text-[9px] font-black tracking-widest uppercase hover:bg-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                                >
                                  Reagendar
                                </button>
                                <button
                                  title="Cancelar Cita"
                                  onClick={async () => {
                                    const res = await cancelAppointment(apt.id);
                                    addLog("cancelAppointment", res);
                                    await loadData();
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20"
                                >
                                  <CalendarX className="h-3.5 w-3.5 text-red-400" />
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 dark:text-white/20">
                      Selecciona un lead para gestionar sus citas.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Tool Definitions & Logs */}
            <div className="space-y-6">
              <div className="flex h-[500px] flex-col overflow-hidden rounded-3xl border border-white/5 bg-slate-900">
                <div className="flex items-center gap-2 border-b border-white/5 bg-slate-900/50 px-6 py-4">
                  <Terminal className="h-4 w-4 text-emerald-500" />
                  <span className="text-[10px] font-black tracking-widest text-white uppercase">
                    Logs de Ejecución
                  </span>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto p-4 font-mono text-[10px]">
                  {toolLog.length === 0 && (
                    <p className="text-white/10 italic">Esperando acciones...</p>
                  )}
                  {toolLog.map((log, i) => (
                    <div key={i} className="animate-in fade-in space-y-1 duration-300">
                      <div className="flex items-center justify-between opacity-40">
                        <span className="text-white">{log.time}</span>
                        <span className="text-primary">{log.action}()</span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-white/5 bg-black/40 p-2 text-emerald-400">
                        {JSON.stringify(log.result, null, 2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/5 dark:bg-white/[0.02]">
                <h3 className="mb-4 text-[10px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                  Herramientas para el Agente
                </h3>
                <div className="space-y-3">
                  {[
                    { name: "book_appointment", desc: "Agendar nueva cita" },
                    { name: "cancel_appointment", desc: "Cancelar cita existente" },
                    { name: "reschedule_appointment", desc: "Cambiar fecha de cita" },
                    { name: "check_availability", desc: "Consultar huecos libres" },
                  ].map((tool) => (
                    <div
                      key={tool.name}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                      <div>
                        <p className="text-[10px] font-black text-slate-700 dark:text-white/80">
                          {tool.name}
                        </p>
                        <p className="text-[9px] text-slate-500 dark:text-white/40">{tool.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REMINDERS TAB */}
        {tab === "reminders" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-4xl space-y-8 pb-20"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase dark:text-white">
                  Recordatorios Automáticos
                </h2>
                <p className="mt-1 text-xs font-bold tracking-[0.3em] text-slate-500 uppercase dark:text-white/40">
                  Configuración de avisos vía WhatsApp
                </p>
              </div>
              <button
                onClick={saveReminderConfig}
                disabled={saving}
                className="bg-primary flex h-12 items-center gap-3 rounded-2xl px-8 text-xs font-black tracking-widest text-white uppercase transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {saving ? (
                  <RotateCcw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar Cambios
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {/* Left Panel: Basic Controls */}
              <div className="space-y-6 md:col-span-1">
                <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 dark:border-white/5 dark:bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BellRing className="text-primary h-5 w-5" />
                      <span className="text-sm font-black tracking-widest text-slate-900 uppercase dark:text-white">
                        Estado
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setReminderConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
                      }
                      title={
                        reminderConfig.enabled
                          ? "Desactivar recordatorios"
                          : "Activar recordatorios"
                      }
                      className={cn(
                        "flex h-8 w-14 items-center rounded-full p-1 transition-all",
                        reminderConfig.enabled ? "bg-primary" : "bg-slate-200 dark:bg-white/10"
                      )}
                    >
                      <div
                        className={cn(
                          "h-6 w-6 rounded-full bg-white shadow-sm transition-all",
                          reminderConfig.enabled ? "translate-x-6" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-white/5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        Anticipación
                      </label>
                      <select
                        value={reminderConfig.lead_time_minutes}
                        title="Tiempo de anticipación"
                        onChange={(e) =>
                          setReminderConfig((prev) => ({
                            ...prev,
                            lead_time_minutes: parseInt(e.target.value),
                          }))
                        }
                        className="ring-primary/20 h-11 w-full rounded-xl border-none bg-slate-50 px-4 text-xs font-bold focus:ring-2 dark:bg-black/20"
                      >
                        <option value={15}>15 minutos antes</option>
                        <option value={30}>30 minutos antes</option>
                        <option value={60}>1 hora antes</option>
                        <option value={120}>2 horas antes</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        Repeticiones
                      </label>
                      <select
                        value={reminderConfig.repetitions}
                        title="Número de repeticiones"
                        onChange={(e) =>
                          setReminderConfig((prev) => ({
                            ...prev,
                            repetitions: parseInt(e.target.value),
                          }))
                        }
                        className="ring-primary/20 h-11 w-full rounded-xl border-none bg-slate-50 px-4 text-xs font-bold focus:ring-2 dark:bg-black/20"
                      >
                        <option value={1}>1 solo aviso</option>
                        <option value={2}>2 avisos</option>
                        <option value={3}>3 avisos (Insistente)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel: Content Controls */}
              <div className="space-y-6 md:col-span-2">
                <div className="space-y-8 rounded-[40px] border border-slate-200 bg-white p-8 dark:border-white/5 dark:bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-3 text-lg font-black tracking-tight text-slate-900 uppercase dark:text-white">
                      <MessageSquareQuote className="text-primary h-5 w-5" />
                      Contenido del Mensaje
                    </h3>
                    <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/5">
                      <button
                        onClick={() => setReminderConfig((prev) => ({ ...prev, mode: "manual" }))}
                        className={cn(
                          "rounded-lg px-4 py-1.5 text-[10px] font-black tracking-widest uppercase transition-all",
                          reminderConfig.mode === "manual"
                            ? "text-primary bg-white shadow-sm dark:bg-white/10"
                            : "text-slate-400"
                        )}
                      >
                        Manual
                      </button>
                      <button
                        onClick={() => setReminderConfig((prev) => ({ ...prev, mode: "ai" }))}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-4 py-1.5 text-[10px] font-black tracking-widest uppercase transition-all",
                          reminderConfig.mode === "ai"
                            ? "text-primary bg-white shadow-sm dark:bg-white/10"
                            : "text-slate-400"
                        )}
                      >
                        <Sparkles className="h-3 w-3" /> IA Decide
                      </button>
                    </div>
                  </div>

                  {reminderConfig.mode === "manual" ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <textarea
                          value={reminderConfig.template}
                          onChange={(e) =>
                            setReminderConfig((prev) => ({ ...prev, template: e.target.value }))
                          }
                          className="ring-primary/20 custom-scrollbar h-40 w-full resize-none rounded-3xl border-none bg-slate-50 p-6 text-sm leading-relaxed font-medium focus:ring-2 dark:bg-black/20"
                          placeholder="Escribe el mensaje aquí..."
                          title="Plantilla de recordatorio"
                          aria-label="Plantilla de recordatorio"
                        />
                        <div className="absolute right-4 bottom-4 flex items-center gap-2">
                          <div className="bg-primary/10 border-primary/20 text-primary rounded-full border px-3 py-1 text-[9px] font-bold tracking-widest uppercase">
                            {reminderConfig.template.length} caracteres
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="mr-2 self-center text-[10px] font-black tracking-widest text-slate-400 uppercase">
                          Variables:
                        </span>
                        {["{nombre}", "{apellido}", "{hora}", "{asesor}", "{fecha}"].map((v) => (
                          <button
                            key={v}
                            onClick={() =>
                              setReminderConfig((prev) => ({
                                ...prev,
                                template: prev.template + " " + v,
                              }))
                            }
                            className="hover:text-primary rounded-lg bg-slate-100 px-3 py-1.5 text-[9px] font-bold text-slate-600 transition-all dark:bg-white/5 dark:text-white/40"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4">
                        <Settings2 className="mt-0.5 h-4 w-4 text-amber-500" />
                        <p className="text-[10px] leading-relaxed font-bold tracking-widest text-amber-600/80 uppercase">
                          Nota: El sistema reemplazará automáticamente las variables entre llaves
                          con la información real de la cita.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-6 py-12 text-center">
                      <div className="from-primary/20 to-primary/5 relative flex h-20 w-20 items-center justify-center rounded-[32px] bg-gradient-to-br">
                        <Sparkles className="text-primary h-10 w-10 animate-pulse" />
                        <div className="bg-primary absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-lg">
                          <Terminal className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="max-w-sm space-y-2">
                        <h4 className="text-sm font-black tracking-widest text-slate-900 uppercase dark:text-white">
                          Orquestación Inteligente Activa
                        </h4>
                        <p className="text-xs leading-relaxed font-medium text-slate-500 dark:text-white/40">
                          Virginia determinará el mejor mensaje de recordatorio basándose en el
                          historial de chat y el tono de la conversación.
                        </p>
                      </div>
                      <div className="bg-primary/5 text-primary border-primary/10 rounded-2xl border px-6 py-3 text-[10px] font-bold tracking-widest uppercase">
                        Optimizado para conversión
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* APPOINTMENT DETAIL MODAL */}
      <AnimatePresence>
        {selectedAppointment && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              onClick={() => setSelectedAppointment(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#23252e] bg-[#121317] shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#23252e] bg-[#0d0e12] p-6">
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl border",
                      (
                        STATUS_CONFIG[selectedAppointment.status as keyof typeof STATUS_CONFIG] ||
                        STATUS_CONFIG.PENDING
                      ).color
                    )}
                  >
                    <CalendarPlus className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-white uppercase">
                      Detalle de la Cita
                    </h2>
                    <p className="mt-0.5 text-[10px] font-medium tracking-wider text-[#8a8f9d] uppercase">
                      ID: {selectedAppointment.id.split("-")[0]}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  title="Cerrar detalle"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8a8f9d] transition-all hover:bg-white/[0.04] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="custom-scrollbar max-h-[60vh] space-y-6 overflow-y-auto p-6">
                {/* Lead Info Section */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-[#8a8f9d] uppercase">
                    <Users className="h-3.5 w-3.5 text-blue-400" /> Información del Prospecto
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#23252e] bg-[#16171d] p-3.5">
                      <p className="mb-1 text-[10px] font-medium text-[#8a8f9d]">
                        Nombre Completo
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {selectedAppointment.lead?.nombre} {selectedAppointment.lead?.apellido}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#23252e] bg-[#16171d] p-3.5">
                      <p className="mb-1 text-[10px] font-medium text-[#8a8f9d]">
                        Teléfono
                      </p>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-blue-400" />
                        <p className="text-sm font-semibold text-white">
                          {selectedAppointment.lead?.telefono}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appointment Schedule Section */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-[#8a8f9d] uppercase">
                    <Clock className="h-3.5 w-3.5 text-blue-400" /> Horarios de la Cita
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#23252e] bg-[#16171d] p-3.5">
                      <p className="mb-1 text-[10px] font-medium text-[#8a8f9d]">
                        Hora España (ES)
                      </p>
                      <p className="text-base font-bold text-blue-400">
                        {new Date(selectedAppointment.scheduled_at).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Europe/Madrid",
                        })}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        {new Date(selectedAppointment.scheduled_at).toLocaleDateString("es-ES", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#23252e] bg-[#16171d] p-3.5">
                      <p className="mb-1 text-[10px] font-medium text-[#8a8f9d]">
                        Hora Local del Lead
                      </p>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-emerald-400" />
                        <p className="text-base font-bold text-white">
                          {new Date(selectedAppointment.scheduled_at).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: resolveTimezoneFromPhone(selectedAppointment.lead?.telefono),
                          })}
                        </p>
                      </div>
                      <p className="mt-1 text-[10px] font-medium text-[#8a8f9d]">
                        Zona: {resolveTimezoneFromPhone(selectedAppointment.lead?.telefono)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status & Advisor Section */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-[#8a8f9d] uppercase">
                      <Check className="h-3.5 w-3.5 text-blue-400" /> Estado y Asesor
                    </h3>
                    <div className="rounded-xl border border-[#23252e] bg-[#16171d] p-3.5">
                      <div
                        className={cn(
                          "mb-2.5 inline-flex rounded-md border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                          (
                            STATUS_CONFIG[
                              selectedAppointment.status as keyof typeof STATUS_CONFIG
                            ] || STATUS_CONFIG.PENDING
                          ).color
                        )}
                      >
                        {
                          (
                            STATUS_CONFIG[
                              selectedAppointment.status as keyof typeof STATUS_CONFIG
                            ] || STATUS_CONFIG.PENDING
                          ).label
                        }
                      </div>
                      <p className="mb-1 text-[10px] font-medium text-[#8a8f9d]">
                        Asesor Asignado
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#23252e] text-blue-400">
                          <Users className="h-3 w-3" />
                        </div>
                        <p className="text-sm font-semibold text-white">
                          {selectedAppointment.advisors?.name || "Sin asignar"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-[#8a8f9d] uppercase">
                      <Terminal className="h-3.5 w-3.5 text-blue-400" /> Notas del Agente
                    </h3>
                    <div className="min-h-[96px] rounded-xl border border-[#23252e] bg-[#16171d] p-3.5">
                      <p className="text-xs leading-relaxed font-normal text-zinc-300 italic">
                        {selectedAppointment.notes || "No hay notas adicionales para esta cita."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-[#23252e] bg-[#0d0e12] p-5">
                <button
                  onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 text-[11px] font-semibold text-rose-400 transition-all hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar Cita
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="h-9 rounded-xl px-4 text-[11px] font-semibold text-[#8a8f9d] transition-all hover:bg-white/[0.04] hover:text-white"
                  >
                    Cerrar Detalle
                  </button>
                  {selectedAppointment.status === "PENDING" && (
                    <button
                      onClick={() => {
                        handleStatusChange(selectedAppointment.id, "CONFIRMED");
                        setSelectedAppointment(null);
                      }}
                      className="h-9 rounded-xl bg-emerald-600 px-5 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-emerald-500"
                    >
                      Confirmar Cita
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
