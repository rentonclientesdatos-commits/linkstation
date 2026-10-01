#!/usr/bin/env node
// Genera los 11 secretos del Vault para el deploy Supabase self-hosted + dev.dash en VPS.
// Uso: node infra/supabase-vps/scripts/generate-vault.mjs
// Output: infra/supabase-vps/.vault/secrets.env (gitignoreado)
//
// IMPORTANTE: si ya tienes datos cifrados con un ENCRYPTION_KEY existente (Sprint 1
// tabla integrations.tokens_encrypted), PASA --keep-encryption-key=<valor> para no
// romper la descifrabilidad tras restaurar snapshot.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VAULT_DIR = path.resolve(__dirname, "..", ".vault");
const OUT_FILE = path.join(VAULT_DIR, "secrets.env");

// ---------- helpers ----------
const b64url = (buf) =>
  Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const randUrlsafe = (bytes) => b64url(crypto.randomBytes(bytes));
const randAscii = (chars) => {
  // ASCII imprimible sin caracteres confusos (sin O, 0, l, 1, I) — fácil de copiar
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  const buf = crypto.randomBytes(chars * 2);
  for (let i = 0; out.length < chars && i < buf.length; i++) {
    const idx = buf[i] % alphabet.length;
    out += alphabet[idx];
  }
  return out;
};

const signHS256 = (payload, secret) => {
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const sig = b64url(
    crypto.createHmac("sha256", secret).update(data).digest()
  );
  return `${data}.${sig}`;
};

// ---------- parse flags ----------
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, ...v] = a.slice(2).split("=");
      return [k, v.join("=") || true];
    })
);

// ---------- generate ----------
const POSTGRES_PASSWORD = randAscii(32);
const JWT_SECRET = randUrlsafe(48); // 48 bytes = 64 chars b64url, muy por encima del mínimo 32
const DASHBOARD_PASSWORD = randAscii(24);
const VAULT_ENC_KEY = randAscii(32); // Supabase exige EXACTAMENTE 32 chars
const SECRET_KEY_BASE = randUrlsafe(48); // Phoenix Realtime exige ≥64 chars
const LOGFLARE_API_KEY = randUrlsafe(24);
const CRON_SECRET = randUrlsafe(32);
const NEXTAUTH_SECRET = randUrlsafe(32);
const ENCRYPTION_KEY = args["keep-encryption-key"] || randAscii(32);

// JWTs ANON_KEY y SERVICE_ROLE_KEY firmados con JWT_SECRET (10 años de validez)
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 10 * 365 * 24 * 60 * 60;
const ANON_KEY = signHS256(
  { role: "anon", iss: "supabase", iat, exp },
  JWT_SECRET
);
const SERVICE_ROLE_KEY = signHS256(
  { role: "service_role", iss: "supabase", iat, exp },
  JWT_SECRET
);

// ---------- write ----------
const ts = new Date().toISOString();
const out = `# ==============================================================================
# Vault VPS — Supabase self-hosted + dev.dash (Dokploy)
# Generado: ${ts}
# Generado por: infra/supabase-vps/scripts/generate-vault.mjs
# Gitignoreado: SÍ (este directorio .vault/ tiene su propio .gitignore)
# ==============================================================================
# NUNCA commitear este fichero. NUNCA pegarlo en chat/Slack/email.
# Si lo pierdes, regenerar es OK siempre que NO haya datos cifrados con
# ENCRYPTION_KEY (Sprint 1 tabla integrations) ya en producción — en ese caso
# usar --keep-encryption-key=<valor-existente> al regenerar.
# ==============================================================================

# ------------------------------------------------------------------------------
# BLOQUE 1 — Para pegar en Dokploy → service "supabase" → tab Environment
# ------------------------------------------------------------------------------

# Postgres
POSTGRES_HOST=supabase-db
POSTGRES_DB=postgres
POSTGRES_PORT=5432
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# JWT
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# URLs (placeholders — los subdominios se activan más adelante)
SITE_URL=https://dev.linkstation.ai
API_EXTERNAL_URL=https://supabase.linkstation.ai
STUDIO_URL=https://studio.linkstation.ai

# Studio admin (acceso vía SSH tunnel hasta que se exponga subdominio)
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}

# Secretos auxiliares
VAULT_ENC_KEY=${VAULT_ENC_KEY}
SECRET_KEY_BASE=${SECRET_KEY_BASE}
LOGFLARE_API_KEY=${LOGFLARE_API_KEY}

# ------------------------------------------------------------------------------
# BLOQUE 2 — Para pegar en Dokploy → service "dev.dash" → tab Environment
# (se reusan ANON_KEY, SERVICE_ROLE_KEY, POSTGRES_PASSWORD del bloque 1
#  + secretos propios de dev.dash de abajo)
# ------------------------------------------------------------------------------

# Reusados del bloque Supabase (mismos valores):
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
#   SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
#   DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@supabase-db:5432/postgres

# Propios de dev.dash:
CRON_SECRET=${CRON_SECRET}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# ------------------------------------------------------------------------------
# Checksum (para verificar integridad al copiar)
# ------------------------------------------------------------------------------
# Total secretos: 11
# JWT signatures verificables con: jwt.io (pegar ANON_KEY + JWT_SECRET → debe decir "Signature Verified")
`;

fs.writeFileSync(OUT_FILE, out, { mode: 0o600 });
console.log(`✅ Vault generado: ${OUT_FILE}`);
console.log(`   Permisos: 600 (solo lectura para el owner)`);
console.log(`   Total secretos: 11`);
console.log(``);
console.log(`📋 Bloque para Dokploy → service supabase → tab Environment:`);
console.log(``);
console.log(out.split("# BLOQUE 1 —")[1].split("# BLOQUE 2")[0].trim());
console.log(``);
console.log(`💡 El fichero completo (con bloque dev.dash) está en:`);
console.log(`   ${OUT_FILE}`);
