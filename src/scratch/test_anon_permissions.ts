import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://api-db.linkstation.ai";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(url, anonKey);
const tenantId = "47e84fa2-73f3-4e23-9267-1e49d4442f70";

async function main() {
  const tables = [
    "lead",
    "llamadas",
    "appointments",
    "lead_cualificacion",
    "conversaciones_whatsapp",
  ];
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(5);
    console.log(`Table ${table}: fetched=${data?.length} error=${error?.message || "none"}`);
  }
}

main().catch(console.error);
