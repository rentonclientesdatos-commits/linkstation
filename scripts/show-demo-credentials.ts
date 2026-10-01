/**
 * Muestra las credenciales demo + crea un segundo usuario no-admin para
 * comparar comportamiento entre roles.
 *
 * Uso: npx tsx scripts/show-demo-credentials.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as crypto from "crypto";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@af.local";
const ADMIN_PASSWORD = process.env.DEMO_USER_PASSWORD!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

function genPassword(): string {
    const base = crypto.randomBytes(16).toString("base64").replace(/[+/=]/g, "").slice(0, 20);
    return base + "-Aa1!";
}

async function main() {
    // ---------- Buscar tenant demo ----------
    // Prioriza el tenant 'LinkStation' (cliente principal); fallback a 'Demo - Academia'
    const { data: tenants } = await admin.from("tenants").select("id, name").in("name", ["LinkStation", "Demo - Academia"]);
    if (!tenants || tenants.length === 0) { console.error("No existen tenants demo. Ejecuta npm run db:seed-demo primero."); process.exit(1); }
    const main = tenants.find((t) => t.name === "LinkStation") ?? tenants[0];
    const tenantId = main.id;

    // ---------- Usuario NO-admin (viewer) ----------
    const viewerEmail = "viewer@af.local";
    const viewerPassword = genPassword();

    // Si ya existe lo borramos para regenerar password conocida
    const { data: existingList } = await admin.auth.admin.listUsers();
    const existing = existingList?.users?.find((u) => u.email === viewerEmail);
    if (existing) {
        await admin.auth.admin.deleteUser(existing.id);
    }
    const { error: vErr } = await admin.auth.admin.createUser({
        email: viewerEmail,
        password: viewerPassword,
        email_confirm: true,
        user_metadata: { is_admin: false, tenant_id: tenantId, full_name: "Demo Viewer" },
    });
    if (vErr) { console.error("No se pudo crear viewer:", vErr.message); }

    // ---------- Resumen ----------
    console.log("\n========================================================");
    console.log("CREDENCIALES DE ACCESO — http://localhost:8500");
    console.log("========================================================\n");

    console.log("[1] ADMIN — acceso completo al dashboard");
    console.log(`    email:    ${ADMIN_EMAIL}`);
    console.log(`    password: ${ADMIN_PASSWORD}`);
    console.log(`    rol:      admin (user_metadata.is_admin=true)`);
    console.log(`    puede:    todo (gestion tenants, agentes, leads, integraciones)\n`);

    console.log("[2] VIEWER — usuario no-admin (limited)");
    console.log(`    email:    ${viewerEmail}`);
    console.log(`    password: ${viewerPassword}`);
    console.log(`    rol:      no-admin (user_metadata.is_admin=false)`);
    console.log(`    puede:    ver datos del tenant; secciones admin restringidas\n`);

    console.log("Tenant:   " + tenantId);
    console.log("\nNOTA: la app SOLO distingue admin vs no-admin (boolean flag).");
    console.log("      No hay rol 'advisor' con login propio en este momento.");
    console.log("      Los 4 advisors creados son entidades de BD (sin login).");
    console.log("========================================================\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
