/**
 * set-admin-user.ts — Crea / actualiza el usuario admin del CRM contra una instancia Supabase.
 *
 * Diseñado para ejecutarse contra LOCAL o VPS cambiando las env vars de conexión.
 * NO siembra datos demo (eso lo hace seed-demo.ts). Solo gestiona el usuario admin.
 *
 * Uso:
 *   # Local (lee .env.local por defecto)
 *   npx tsx scripts/set-admin-user.ts
 *
 *   # VPS — pasar SUPABASE_URL + SERVICE_ROLE explícitas
 *   SUPABASE_URL_OVERRIDE=https://supabase.dev.example \
 *   SUPABASE_SERVICE_ROLE_KEY_OVERRIDE=eyJ... \
 *   NEW_ADMIN_EMAIL=admin@example.com \
 *   NEW_ADMIN_PASSWORD='Strong#Pwd!2026' \
 *   npx tsx scripts/set-admin-user.ts
 *
 * Variables (todas opcionales con defaults sensatos):
 *   SUPABASE_URL_OVERRIDE          — si presente, sobrescribe NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY_OVERRIDE — idem
 *   NEW_ADMIN_EMAIL                — default: "admin@linkstation.ai"
 *   NEW_ADMIN_PASSWORD             — default: lee de .env.local NEW_ADMIN_PASSWORD o falla
 *   NEW_ADMIN_FULL_NAME            — default: "Admin"
 *   TENANT_NAME                    — default: "LinkStation"
 *   LEGACY_USERS_TO_DELETE         — CSV de emails a borrar.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL_OVERRIDE ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEW_EMAIL = process.env.NEW_ADMIN_EMAIL ?? "admin@linkstation.ai";
const NEW_PASSWORD = process.env.NEW_ADMIN_PASSWORD;
const NEW_FULL_NAME = process.env.NEW_ADMIN_FULL_NAME ?? "Admin";
const TENANT_NAME = process.env.TENANT_NAME ?? "LinkStation";
const LEGACY_USERS = (
  process.env.LEGACY_USERS_TO_DELETE ?? "demo@af.local,viewer@af.local,demo@af.com,admin@linkstation.ai"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[set-admin-user] Falta SUPABASE_URL / SERVICE_ROLE_KEY (.env.local o overrides).");
  process.exit(1);
}
if (!NEW_PASSWORD) {
  console.error("[set-admin-user] Falta NEW_ADMIN_PASSWORD (env var o .env.local). Aborta.");
  process.exit(1);
}

// Aviso de robustez sin bloquear (usuario es responsable de la password que elija)
function warnIfWeak(pwd: string) {
  const warns: string[] = [];
  if (pwd.length < 12) warns.push(`length=${pwd.length} < 12`);
  if (!/[A-Z]/.test(pwd)) warns.push("sin mayúsculas");
  if (!/[a-z]/.test(pwd)) warns.push("sin minúsculas");
  if (!/[0-9]/.test(pwd)) warns.push("sin números");
  if (!/[^A-Za-z0-9]/.test(pwd)) warns.push("sin símbolos");
  if (warns.length) {
    console.warn(
      `[set-admin-user] ⚠️  AVISO password: ${warns.join(", ")}. Recomendado: 16+ chars con mezcla.`
    );
  }
}
warnIfWeak(NEW_PASSWORD);

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email: string): Promise<string | null> {
  // listUsers viene paginado; buscamos en la primera página (1000 por defecto suele bastar para demo)
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error(`  [findUser ${email}] error:`, error.message);
    return null;
  }
  return data?.users?.find((u) => u.email === email)?.id ?? null;
}

async function deleteLegacyUsers() {
  if (LEGACY_USERS.length === 0) return;
  console.log(`\n→ Borrando usuarios legacy: ${LEGACY_USERS.join(", ")}`);
  for (const email of LEGACY_USERS) {
    if (email === NEW_EMAIL) {
      console.log(`  · ${email} → SKIP (coincide con NEW_ADMIN_EMAIL)`);
      continue;
    }
    const userId = await findUserByEmail(email);
    if (!userId) {
      console.log(`  · ${email} → no existe, nada que borrar`);
      continue;
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.warn(`  · ${email} (${userId}) → fallo borrado: ${error.message}`);
    } else {
      console.log(`  · ${email} (${userId}) → borrado ✓`);
    }
  }
}

async function ensureTenant(): Promise<string | null> {
  const { data: existing } = await admin
    .from("tenants")
    .select("id")
    .eq("name", TENANT_NAME)
    .maybeSingle();
  if (existing) {
    console.log(`\n→ Tenant "${TENANT_NAME}" existe (id=${existing.id})`);
    return existing.id;
  }
  console.log(`\n→ Tenant "${TENANT_NAME}" no existe — creando…`);
  const { data, error } = await admin
    .from("tenants")
    .insert({
      name: TENANT_NAME,
      supabase_url: SUPABASE_URL,
      supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "n/a",
      client_email: NEW_EMAIL,
      config: {
        headers: [],
        dashboard_title: `${TENANT_NAME} — CRM`,
        primary_color: "#4f46e5",
        test_orchestrator_enabled: true,
      },
    })
    .select("id")
    .single();
  if (error) {
    console.error(`  [ensureTenant] error: ${error.message}`);
    return null;
  }
  console.log(`  → tenant creado id=${data.id}`);
  return data.id;
}

async function ensureAdminUser(tenantId: string | null): Promise<string | null> {
  const existingId = await findUserByEmail(NEW_EMAIL);
  // user_metadata: writable by user via supabase.auth.updateUser — útil para UI.
  // app_metadata: writable ONLY por service_role — fuente de verdad para auth checks
  //   (middleware.ts:60 lee app_metadata.is_admin para evitar privilege escalation,
  //   ver Sprint 0 tarea 1-16). Por eso seteamos AMBOS.
  const userMetadata = {
    is_admin: true,
    tenant_id: tenantId,
    full_name: NEW_FULL_NAME,
  };
  const appMetadata = {
    is_admin: true,
    tenant_id: tenantId,
  };

  if (existingId) {
    console.log(
      `\n→ Usuario "${NEW_EMAIL}" ya existe (id=${existingId}) — actualizando password + metadata`
    );
    const { error } = await admin.auth.admin.updateUserById(existingId, {
      password: NEW_PASSWORD,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: appMetadata,
    });
    if (error) {
      console.error(`  [updateUser] error: ${error.message}`);
      return null;
    }
    return existingId;
  }

  console.log(`\n→ Usuario "${NEW_EMAIL}" no existe — creando…`);
  const { data, error } = await admin.auth.admin.createUser({
    email: NEW_EMAIL,
    password: NEW_PASSWORD,
    email_confirm: true,
    user_metadata: userMetadata,
    app_metadata: appMetadata,
  });
  if (error) {
    console.error(`  [createUser] error: ${error.message}`);
    return null;
  }
  console.log(`  → usuario creado id=${data.user?.id}`);
  return data.user?.id ?? null;
}

async function linkTenantOwner(tenantId: string, userId: string) {
  const { error } = await admin.from("tenants").update({ auth_user_id: userId }).eq("id", tenantId);
  if (error) {
    console.warn(`\n[linkTenantOwner] no se pudo actualizar tenant.auth_user_id: ${error.message}`);
  } else {
    console.log(`\n→ tenant ${tenantId}.auth_user_id = ${userId} ✓`);
  }
}

async function main() {
  console.log("=====================================================");
  console.log("set-admin-user — gestión usuario admin único");
  console.log("=====================================================");
  console.log(`Supabase URL : ${SUPABASE_URL}`);
  console.log(`Nuevo admin  : ${NEW_EMAIL}  (full_name=${NEW_FULL_NAME})`);
  console.log(`Tenant       : ${TENANT_NAME}`);
  console.log(`Legacy borrar: ${LEGACY_USERS.join(", ") || "(ninguno)"}`);
  console.log("");

  await deleteLegacyUsers();

  const tenantId = await ensureTenant();
  const userId = await ensureAdminUser(tenantId);

  if (tenantId && userId) {
    await linkTenantOwner(tenantId, userId);
  }

  console.log("\n=====================================================");
  console.log(userId ? "✓ DONE" : "✗ FAILED");
  console.log("=====================================================");
  if (!userId) process.exit(1);
}

main().catch((err) => {
  console.error("[set-admin-user] excepción:", err);
  process.exit(1);
});
