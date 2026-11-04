"use server";

import { getAdminSupabaseClient, getActiveTenantId } from "@/lib/supabase/server";

// ─── Interfaces ───────────────────────────────────────────────────

export interface Advisor {
  id: string;
  tenant_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  specialty?: string | null;
  countries?: string[] | null;
  origins?: string[] | null;
  campaigns?: string[] | null;
  courses?: string[] | null;
  handled_lead_types?: string[] | null;
  specialties?: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface AvailabilitySlot {
  id: string;
  advisor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  lead_id: string;
  advisor_id?: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes?: string | null;
  reminder_scheduled_at?: string | null;
  reminder_sent_at?: string | null;
  ab_variant?: string | null;
  agent_used?: string | null;
  advisors?: { name: string } | null;
  lead?: { nombre: string; apellido: string; telefono: string } | null;
}

interface TenantConfig {
  scheduling?: {
    reminders?: {
      enabled: boolean;
      lead_time_minutes: number;
      repetitions: number;
      mode: "manual" | "ai";
      template: string;
    };
  };
}

// ─── Advisors ─────────────────────────────────────────────────────

export async function getAdvisors() {
  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No hay un cliente seleccionado." };

  const supabase = await getAdminSupabaseClient();
  const { data, error } = await supabase
    .from("advisors" as never)
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) return { error: error.message };
  return { success: true, data: data as unknown as Advisor[] };
}

export async function saveAdvisor(advisor: Partial<Advisor>) {
  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No hay un cliente seleccionado." };

  const supabase = await getAdminSupabaseClient();
  const payload: Record<string, unknown> = { ...advisor, tenant_id: tenantId };

  let { data, error } = await (supabase.from("advisors" as any) as any)
    .upsert(payload)
    .select()
    .single();

  // If Supabase schema cache does not have handled_lead_types or specialties columns,
  // gracefully remove them and fallback so the advisor is saved without blocking the user.
  if (
    error &&
    (error.code === "PGRST204" ||
      error.message?.includes("schema cache") ||
      error.message?.includes("handled_lead_types") ||
      error.message?.includes("specialties"))
  ) {
    const fallbackPayload: Record<string, unknown> = { ...payload };
    delete fallbackPayload.handled_lead_types;
    delete fallbackPayload.specialties;
    delete fallbackPayload.specialty;

    // If courses is empty but specialties has values, save them into courses
    if (
      (!fallbackPayload.courses ||
        (Array.isArray(fallbackPayload.courses) && fallbackPayload.courses.length === 0)) &&
      advisor.specialties
    ) {
      fallbackPayload.courses = advisor.specialties;
    }

    const retry = await (supabase.from("advisors" as any) as any)
      .upsert(fallbackPayload)
      .select()
      .single();

    if (!retry.error) {
      data = retry.data;
      error = null;
    } else {
      error = retry.error;
    }
  }

  if (error) return { error: error.message };
  return { success: true, data: data as unknown as Advisor };
}

export async function deleteAdvisor(id: string) {
  const supabase = await getAdminSupabaseClient();
  const { error } = await supabase
    .from("advisors" as never)
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Availability ─────────────────────────────────────────────────

export async function getAdvisorSlots(advisorId: string | null) {
  const tenantId = await getActiveTenantId();
  const supabase = await getAdminSupabaseClient();

  let query = supabase.from("availability_slots" as never).select("*");

  if (advisorId) {
    query = query.eq("advisor_id", advisorId);
  } else {
    // General slots for the tenant
    if (!tenantId) return { error: "No hay un cliente seleccionado para ver horario general." };
    query = query.eq("tenant_id", tenantId).is("advisor_id", null);
  }

  const { data, error } = await query.order("day_of_week");

  if (error) return { error: error.message };

  // Extraer solo la parte HH:MM para el frontend
  const formattedData = (data as unknown as AvailabilitySlot[]).map((slot) => {
    const extractTime = (t: string) => {
      if (!t) return t;
      if (t.includes("T")) {
        const dateObj = new Date(t);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString().substr(11, 5);
        }
      }
      // Si viene con formato "HH:MM:SS" (ej. "20:00:00"), recortar a "HH:MM"
      if (/^\d{2}:\d{2}:\d{2}/.test(t)) {
        return t.substring(0, 5);
      }
      return t;
    };
    return {
      ...slot,
      start_time: extractTime(slot.start_time),
      end_time: extractTime(slot.end_time),
    };
  });

  return { success: true, data: formattedData };
}

export async function saveAdvisorSlots(
  advisorId: string | null,
  slots: Partial<AvailabilitySlot>[]
) {
  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No hay un cliente seleccionado." };

  const supabase = await getAdminSupabaseClient();

  // 1. Delete existing
  if (advisorId) {
    await supabase
      .from("availability_slots" as never)
      .delete()
      .eq("advisor_id", advisorId);
  } else {
    await supabase
      .from("availability_slots" as never)
      .delete()
      .eq("tenant_id", tenantId)
      .is("advisor_id", null);
  }

  if (slots.length === 0) return { success: true };

  // 2. Insert new
  const { error } = await supabase.from("availability_slots" as never).insert(
    slots.map((s) => {
      const formatTime = (t: string | undefined) => {
        if (!t) return "";
        if (t.includes("T")) return t;
        // Si viene solo como "HH:MM", lo convertimos a un timestamp válido genérico
        return `2000-01-01T${t}:00Z`;
      };
      return {
        ...s,
        start_time: formatTime(s.start_time),
        end_time: formatTime(s.end_time),
        advisor_id: advisorId || null,
        tenant_id: tenantId,
      };
    }) as never
  );

  if (error) {
    console.error("❌ Error saving slots:", error);
    return { error: error.message };
  }

  return { success: true };
}

// ─── Appointments ─────────────────────────────────────────────────

export async function getAppointments(options?: {
  from?: string;
  to?: string;
  advisorId?: string;
  status?: string;
}) {
  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No hay un cliente seleccionado." };

  const supabase = await getAdminSupabaseClient();

  // Build base query WITHOUT the lead join (PostgREST can't always resolve 'lead' relationship)
  // We'll enrich with lead data manually below.
  let query = supabase
    .from("appointments" as never)
    .select("*, advisors(name)")
    .eq("tenant_id", tenantId)
    .order("scheduled_at", { ascending: true });

  if (options?.from) query = query.gte("scheduled_at", options.from);
  if (options?.to) query = query.lte("scheduled_at", options.to);
  if (options?.advisorId) query = query.eq("advisor_id", options.advisorId);
  if (options?.status) query = query.eq("status", options.status);

  const { data, error } = await query;
  if (error) return { error: error.message };

  const appointments = (data as unknown as Appointment[]) || [];

  if (appointments.length === 0) {
    return { success: true, data: appointments };
  }

  // Enrich with lead data via a separate query (avoids schema cache relationship issues)
  const leadIds = [...new Set(appointments.map((a) => a.lead_id).filter(Boolean))];
  const { data: leads } = await supabase
    .from("lead" as never)
    .select("id, nombre, apellido, telefono")
    .in("id", leadIds as string[]);

  const leadMap = new Map(
    (
      (leads as unknown as { id: string; nombre: string; apellido: string; telefono: string }[]) ||
      []
    ).map((l) => [l.id, l])
  );

  const enriched = appointments.map((apt) => ({
    ...apt,
    lead: apt.lead_id ? leadMap.get(apt.lead_id) || null : null,
  }));

  return { success: true, data: enriched };
}

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  const supabase = await getAdminSupabaseClient();
  const { error } = await supabase
    .from("appointments" as never)
    .update({ status, updated_at: new Date().toISOString() } as never)
    .eq("id", appointmentId);

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Appointment Tools (for AI Agents) ───────────────────────────

export async function createAppointment(data: {
  lead_id: string;
  advisor_id?: string | null;
  scheduled_at: string;
  duration_minutes?: number;
  status?: string;
  agent_used?: string;
  ab_variant?: string;
}) {
  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No hay un cliente seleccionado." };

  const supabase = await getAdminSupabaseClient();

  // Fetch tenant config for reminders
  let leadTimeMinutes = 60; // Default
  const { data: tenant } = await supabase
    .from("tenants")
    .select("config")
    .eq("id", tenantId)
    .single();
  const config = (tenant as { config: TenantConfig } | null)?.config;
  if (config?.scheduling?.reminders?.enabled) {
    leadTimeMinutes = config.scheduling.reminders.lead_time_minutes || 60;
  }

  // Calculate reminder time
  const scheduledDate = new Date(data.scheduled_at);
  const reminderDate = new Date(scheduledDate.getTime() - leadTimeMinutes * 60000);

  const { data: res, error } = await supabase
    .from("appointments" as never)
    .insert({
      ...data,
      tenant_id: tenantId,
      duration_minutes: data.duration_minutes || 30,
      status: data.status || "PENDING",
      reminder_scheduled_at: reminderDate.toISOString(),
    } as never)
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, data: res as unknown };
}

export async function cancelAppointment(appointmentId: string, reason?: string) {
  const supabase = await getAdminSupabaseClient();
  const { error } = await supabase
    .from("appointments" as never)
    .update({
      status: "CANCELLED",
      notes: reason ? `Cancelado por IA: ${reason}` : "Cancelado por IA",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", appointmentId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function rescheduleAppointment(appointmentId: string, newDate: string) {
  const supabase = await getAdminSupabaseClient();

  const tenantId = await getActiveTenantId();
  let leadTimeMinutes = 60;
  if (tenantId) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("config")
      .eq("id", tenantId)
      .single();
    const config = (tenant as { config: TenantConfig } | null)?.config;
    if (config?.scheduling?.reminders?.enabled) {
      leadTimeMinutes = config.scheduling.reminders.lead_time_minutes || 60;
    }
  }

  // Calculate new reminder time
  const scheduledDate = new Date(newDate);
  const reminderDate = new Date(scheduledDate.getTime() - leadTimeMinutes * 60000);

  const { error } = await supabase
    .from("appointments" as never)
    .update({
      scheduled_at: newDate,
      reminder_scheduled_at: reminderDate.toISOString(),
      status: "PENDING", // Back to pending if rescheduled
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", appointmentId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function checkAvailability(tenantId: string, date: string, advisorId?: string | null) {
  const supabase = await getAdminSupabaseClient();

  // 1. Get configured day availability
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sunday, 1=Monday...

  let query = supabase
    .from("availability_slots" as never)
    .select("*")
    .eq("day_of_week", dayOfWeek);

  if (advisorId) {
    query = query.eq("advisor_id", advisorId);
  } else {
    query = query.eq("tenant_id", tenantId).is("advisor_id", null);
  }

  const { data: slots, error: slotErr } = await query;

  if (slotErr) return { error: slotErr.message };

  if (!slots || (slots as unknown[]).length === 0) {
    return {
      success: true,
      available: false,
      message: "No hay disponibilidad configurada para este día.",
    };
  }

  // 2. Get existing appointments for that day
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  let aptQuery = supabase
    .from("appointments" as never)
    .select("scheduled_at, duration_minutes")
    .neq("status", "CANCELLED")
    .gte("scheduled_at", dayStart.toISOString())
    .lte("scheduled_at", dayEnd.toISOString());

  if (advisorId) {
    aptQuery = aptQuery.eq("advisor_id", advisorId);
  } else {
    aptQuery = aptQuery.eq("tenant_id", tenantId).is("advisor_id", null);
  }

  const { data: existing, error: aptErr } = await aptQuery;

  if (aptErr) return { error: aptErr.message };

  return {
    success: true,
    config: (slots as unknown[])[0],
    busy_slots: (
      (existing as unknown as { scheduled_at: string; duration_minutes: number | null }[]) || []
    ).map((e) => ({
      start: e.scheduled_at,
      end: new Date(
        new Date(e.scheduled_at).getTime() + (e.duration_minutes || 30) * 60000
      ).toISOString(),
    })),
  };
}

// ─── AB Metrics ───────────────────────────────────────────────────

export async function getABMetrics(agentId?: string) {
  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No hay un cliente seleccionado." };

  const supabase = await getAdminSupabaseClient();
  let query = supabase
    .from("orchestration_logs")
    .select("ab_variant, result, action_type, agent_used, executed_at")
    .eq("tenant_id", tenantId)
    .not("ab_variant", "is", null);

  if (agentId) query = query.eq("agent_used", agentId);

  const { data, error } = await query;
  if (error) return { error: error.message };

  const stats = { A: { total: 0, success: 0 }, B: { total: 0, success: 0 } };
  const rows = (data ?? []) as Array<{ ab_variant: string | null; result: string }>;
  rows.forEach((row) => {
    const v = row.ab_variant as "A" | "B";
    if (v !== "A" && v !== "B") return;
    stats[v].total++;
    if (row.result === "SUCCESS") stats[v].success++;
  });

  return {
    success: true,
    data: {
      variantA: {
        total: stats.A.total,
        successRate: stats.A.total > 0 ? Math.round((stats.A.success / stats.A.total) * 100) : 0,
      },
      variantB: {
        total: stats.B.total,
        successRate: stats.B.total > 0 ? Math.round((stats.B.success / stats.B.total) * 100) : 0,
      },
      raw: data,
    },
  };
}

export async function deleteAppointment(appointmentId: string) {
  const supabase = await getAdminSupabaseClient();
  const { error } = await supabase
    .from("appointments" as never)
    .delete()
    .eq("id", appointmentId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteAppointmentsBulk(appointmentIds: string[]) {
  const supabase = await getAdminSupabaseClient();
  const { error } = await supabase
    .from("appointments" as never)
    .delete()
    .in("id", appointmentIds);

  if (error) return { error: error.message };
  return { success: true };
}
