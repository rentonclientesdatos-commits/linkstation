// Aplica una migración SQL al VPS vía pg-meta REST.
// Uso: SVC=<jwt> node scripts/apply-vps-migration.mjs <ruta-sql>
// El JWT se lee de la env SVC; NUNCA se imprime.
import { readFileSync } from "node:fs";

const ENDPOINT = "https://dev.linkstation.ai/supabase/pg/query";
const svc = process.env.SVC;
const sqlPath = process.argv[2];

if (!svc) {
  console.error("ERROR: falta env SVC (service_role JWT)");
  process.exit(2);
}
if (!sqlPath) {
  console.error("ERROR: falta ruta del .sql");
  process.exit(2);
}

const query = readFileSync(sqlPath, "utf8");

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${svc}`,
    apikey: svc,
  },
  body: JSON.stringify({ query }),
});

const text = await res.text();
let parsed;
try {
  parsed = JSON.parse(text);
} catch {
  parsed = text;
}

if (parsed && parsed.error) {
  console.error(`❌ ${sqlPath}\n   ${parsed.error?.slice?.(0, 400) ?? parsed.error}`);
  process.exit(1);
}
console.log(`✅ ${sqlPath} aplicada (HTTP ${res.status})`);
