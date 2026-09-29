/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/supabase/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    let payload: {
      toolName?: string;
      name?: string; // Fallback
      parameters?: Record<string, unknown>;
      args?: Record<string, unknown>; // Fallback
      callId?: string;
      call?: {
        callId?: string;
        systemMetadata?: Record<string, string>;
        templateContext?: Record<string, string>;
      };
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const toolName = payload.toolName || payload.name;
    const args = payload.parameters || payload.args || {};
    const call = payload.call;

    console.log(`[ULTRAVOX TOOLS] Incoming function call: ${toolName}`, args);

    const supabase = await getAdminSupabaseClient();

    const metadata = call?.systemMetadata || call?.templateContext || {};
    const leadId = metadata.lead_id;
    const tenantId = metadata.tenant_id;

    if (!leadId || !tenantId) {
      console.warn("[ULTRAVOX TOOLS] Missing lead_id or tenant_id in call metadata.");
    }

    switch (toolName) {
      case "book_appointment":
      case "agendar_cita":
        return await handleBookAppointment(supabase, tenantId, leadId, args);

      case "cancel_appointment":
      case "cancelar_cita":
        return await handleCancelAppointment(supabase, tenantId ?? "", args);

      case "reschedule_appointment":
      case "reprogramar_cita":
        return await handleRescheduleAppointment(supabase, tenantId ?? "", args);

      case "check_availability":
      case "consultar_disponibilidad":
        return await handleCheckAvailability(supabase, tenantId, args);

      case "get_lead_info":
      case "consultar_datos":
        return await handleGetLeadInfo(supabase, leadId);

      default:
        console.warn(`[ULTRAVOX TOOLS] Unknown tool called: ${toolName}`);
        return NextResponse.json({ error: "Tool implementation not found" }, { status: 404 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[ULTRAVOX TOOLS CRITICAL ERROR]:", errorMessage);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

async function handleBookAppointment(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  leadId: string,
  args: Record<string, unknown>
) {
  const date = args.date as string;
  const time = args.time as string | undefined;
  const notes = args.notes as string | undefined;

  const { data: lead } = await supabase
    .from("lead")
    .select("*, lead_programas (id_programa, programas (nombre))")
    .eq("id", leadId)
    .single();

  const leadData = lead as any;
  const programId = leadData?.lead_programas?.[0]?.id_programa;
  const programName = leadData?.lead_programas?.[0]?.programas?.nombre;

  let scheduledAt = date;
  if (time) {
    const timeStr = time.includes(":")
      ? time.split(":").length === 2
        ? `${time}:00`
        : time
      : `${time}:00:00`;
    scheduledAt = `${date}T${timeStr}Z`;
  }

  const { data: allAdvisors } = await supabase
    .from("advisors")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  let selectedAdvisor = null;
  if (allAdvisors && allAdvisors.length > 0) {
    selectedAdvisor =
      allAdvisors.find(
        (a) => a.specialties?.includes(programId) || a.specialties?.includes(programName)
      ) || null;
    if (!selectedAdvisor)
      selectedAdvisor =
        allAdvisors.find((a) => a.handled_lead_types?.includes(leadData?.tipo_lead)) || null;
    if (!selectedAdvisor) selectedAdvisor = allAdvisors[0] || null;
  }

  let overlaps = 0;
  if (selectedAdvisor) {
    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("advisor_id", selectedAdvisor.id)
      .eq("scheduled_at", scheduledAt)
      .neq("status", "CANCELLED");
    overlaps = count || 0;
  }

  const { AppointmentService } = await import("@/lib/services/appointment-service");

  let appointmentData: any = null;
  try {
    appointmentData = await AppointmentService.bookAppointment(tenantId, leadId, date, time, notes);
  } catch (e) {
    throw e;
  }

  if (appointmentData?.scheduled_at && appointmentData?.id) {
    try {
      const { getOrchestratorConfigForTenant } = await import("@/lib/actions/orchestrator-config");
      const { enqueueLeadStep } = await import("@/lib/core/queue/lead-sequence-queue");

      const config = await getOrchestratorConfigForTenant(tenantId);
      const reminderLeadTimeHours = config.scheduling?.reminder_hours || 24;

      const appointmentTime = new Date(appointmentData.scheduled_at as string).getTime();
      const reminderTime = appointmentTime - reminderLeadTimeHours * 60 * 60 * 1000;
      const now = Date.now();
      const delayMs = Math.max(0, reminderTime - now);

      if (delayMs > 0 || Math.abs(reminderTime - now) < 1000 * 60 * 5) {
        await enqueueLeadStep(
          {
            leadId,
            tenantId,
            action: "APPOINTMENT_REMINDER",
            appointmentId: appointmentData.id as string,
            template: config.scheduling?.reminder_template || "appointment_reminder_es",
          },
          delayMs
        );
      }
    } catch (reminderErr) {
      console.error("Failed to queue reminder:", reminderErr);
    }
  }

  return NextResponse.json({
    success: true,
    message: "Cita agendada correctamente",
    appointment_id: appointmentData?.id,
    advisor_name: selectedAdvisor?.name || "Sin asignar",
    is_overlap: (overlaps || 0) > 0,
  });
}

async function handleCancelAppointment(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  args: Record<string, unknown>
) {
  const { AppointmentService } = await import("@/lib/services/appointment-service");
  const appointmentId = args.appointmentId as string;
  if (!appointmentId)
    return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });

  try {
    const result = await AppointmentService.cancelAppointment(appointmentId, tenantId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function handleRescheduleAppointment(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  args: Record<string, unknown>
) {
  const { AppointmentService } = await import("@/lib/services/appointment-service");
  const appointmentId = args.appointmentId as string;
  const newDate = args.newDate as string;
  const newTime = args.newTime as string | undefined;

  if (!appointmentId || !newDate)
    return NextResponse.json({ error: "appointmentId and newDate are required" }, { status: 400 });

  try {
    const result = await AppointmentService.rescheduleAppointment(
      appointmentId,
      tenantId,
      newDate,
      newTime
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function handleCheckAvailability(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  args: Record<string, unknown>
) {
  const { AppointmentService } = await import("@/lib/services/appointment-service");
  const date = args.date as string;
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  try {
    const result = await AppointmentService.checkAvailability(tenantId, date);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function handleGetLeadInfo(supabase: SupabaseClient<Database>, leadId: string) {
  const { data, error } = await supabase
    .from("lead")
    .select("nombre, apellido, email, pais, lead_programas (id_programa, programas (nombre))")
    .eq("id", leadId)
    .single();

  if (error) throw error;
  const leadData = data as any;
  const programName = leadData.lead_programas?.[0]?.programas?.nombre || "Sin programa definido";

  return NextResponse.json({
    lead_name: leadData.nombre,
    full_name: `${leadData.nombre} ${leadData.apellido || ""}`.trim(),
    email: leadData.email,
    country: leadData.pais,
    program_of_interest: programName,
    status: "INTERESADO_ALTA_PRIORIDAD",
  });
}
