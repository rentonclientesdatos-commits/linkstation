import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://api-db.linkstation.ai";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(url, anonKey);

const tenantId = "47e84fa2-73f3-4e23-9267-1e49d4442f70";
const from = "2026-04-19T05:10:39.230Z";
const to = "2026-05-20T03:59:59.999Z";

async function main() {
  // 1. Without date filter
  const { data: noDate, error: err1 } = await supabase
    .from("lead_cualificacion")
    .select("id, id_lead")
    .eq("tenant_id", tenantId);
  console.log("Without date filter:", noDate, err1);

  // 2. With date filter gte/lte
  const { data: withDate, error: err2 } = await supabase
    .from("lead_cualificacion")
    .select("id, id_lead")
    .eq("tenant_id", tenantId)
    .gte("fecha_creacion", from)
    .lte("fecha_creacion", to);
  console.log("With date filter:", withDate, err2);
}

main().catch(console.error);
