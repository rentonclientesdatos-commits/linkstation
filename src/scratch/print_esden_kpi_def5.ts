import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fromZonedTime } from "date-fns-tz";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://api-db.linkstation.ai";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(url, key);

async function main() {
  const tenantId = "47e84fa2-73f3-4e23-9267-1e49d4442f70";

  // Fetch the confirmed appointment
  const { data: appts, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "CONFIRMED");

  if (error || !appts || appts.length === 0) {
    console.error("Error or no appts:", error);
    return;
  }

  const appt = appts[0];
  console.log(`Original scheduled_at: ${appt.scheduled_at}`);

  // Lead requested 9 AM. Since the lead is in Bolivia, let's fix it to 9 AM Bolivia time
  // 2026-05-19 09:00 in America/La_Paz is 13:00 UTC
  const fixedIso = "2026-05-19T13:00:00.000Z";

  const { error: updErr } = await supabase
    .from("appointments")
    .update({ scheduled_at: fixedIso })
    .eq("id", appt.id);

  if (updErr) {
    console.error("Failed to update appointment:", updErr);
    return;
  }
  console.log(`Updated appointment ${appt.id} to ${fixedIso}`);

  // Update lead metadata FECHA_AGENDA
  const { data: lead } = await supabase
    .from("lead")
    .select("id, metadata")
    .eq("id", appt.lead_id)
    .single();

  if (lead) {
    const meta = lead.metadata || {};
    meta.FECHA_AGENDA = fixedIso;

    await supabase.from("lead").update({ metadata: meta }).eq("id", lead.id);

    console.log(`Updated lead ${lead.id} metadata.FECHA_AGENDA to ${fixedIso}`);
  }
}

main().catch(console.error);
