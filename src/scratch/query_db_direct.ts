import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://api-db.linkstation.ai";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const tenantId = "47e84fa2-73f3-4e23-9267-1e49d4442f70";

async function main() {
  const clientAnon = createClient(url, anonKey);
  const { data: tenantAnon } = await clientAnon
    .from("tenants")
    .select("config")
    .eq("id", tenantId)
    .single();

  console.log("=== WITH ANON KEY ===");
  const kpisAnon = tenantAnon?.config?.kpis || [];
  console.log(
    JSON.stringify(
      kpisAnon.find((k: any) => k.id === "def-12"),
      null,
      2
    )
  );

  const clientService = createClient(url, serviceKey);
  const { data: tenantService } = await clientService
    .from("tenants")
    .select("config")
    .eq("id", tenantId)
    .single();

  console.log("\n=== WITH SERVICE KEY ===");
  const kpisService = tenantService?.config?.kpis || [];
  console.log(
    JSON.stringify(
      kpisService.find((k: any) => k.id === "def-12"),
      null,
      2
    )
  );
}

main().catch(console.error);
