import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://api-db.linkstation.ai";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(url, key);

const tenantId = "47e84fa2-73f3-4e23-9267-1e49d4442f70";
const from = "2026-04-19T05:16:25.088Z";
const to = "2026-05-20T03:59:59.999Z";

async function main() {
  const table = "lead_cualificacion";
  const col = "id";
  const joinCol = "id_lead";
  const timeCol = "fecha_creacion";
  const isGrouped = false;

  let q = supabase
    .from(table)
    .select(isGrouped ? `${timeCol}, ${col}, ${joinCol}` : `${col}, ${joinCol}`)
    .eq("tenant_id", tenantId)
    .gte(timeCol, from)
    .lte(timeCol, to);

  console.log("Constructed query filters:", {
    tenant_id: tenantId,
    timeCol,
    from,
    to,
  });

  const { data, error } = await q;
  console.log("Query Result Data:", data);
  console.log("Query Result Error:", error);
}

main().catch(console.error);
