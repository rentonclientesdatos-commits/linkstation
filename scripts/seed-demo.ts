/**
 * Seed demo — LinkStation
 *
 * Crea DOS tenants:
 *  1. "LinkStation"          → cliente principal (B2B)
 *  2. "Demo - Sandbox"       → sandbox de pruebas (B2C)
 *
 * Uso:
 *   npx tsx scripts/seed-demo.ts
 *
 * Requisitos:
 *   - Supabase local corriendo (npm run db:up)
 *   - .env.local con DEMO_USER_PASSWORD (admin) — viewer se crea con
 *     show-demo-credentials.ts.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@linkstation.local";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[seed-demo] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 12) {
  console.error("[seed-demo] DEMO_USER_PASSWORD must be at least 12 chars in .env.local");
  process.exit(1);
}
// Aviso sin bloquear si pinta débil (mismo criterio que set-admin-user.ts)
if (
  DEMO_PASSWORD.length < 16 ||
  !/[A-Z]/.test(DEMO_PASSWORD) ||
  !/[a-z]/.test(DEMO_PASSWORD) ||
  !/[0-9]/.test(DEMO_PASSWORD) ||
  !/[^A-Za-z0-9]/.test(DEMO_PASSWORD)
) {
  console.warn(
    `[seed-demo] ⚠️ AVISO: password ${DEMO_PASSWORD.length} chars. Recomendado 16+ con mezcla May/min/núm/símbolo.`
  );
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- Catalogos B2C ----------
const NOMBRES_PERSONA = [
  "Carlos",
  "Maria",
  "Javier",
  "Ana",
  "Luis",
  "Carmen",
  "Miguel",
  "Laura",
  "Antonio",
  "Elena",
  "Jose",
  "Cristina",
  "Manuel",
  "Patricia",
  "Francisco",
  "Lucia",
  "David",
  "Isabel",
  "Pedro",
  "Sofia",
];
const APELLIDOS = [
  "Garcia",
  "Rodriguez",
  "Martinez",
  "Lopez",
  "Sanchez",
  "Gonzalez",
  "Fernandez",
  "Perez",
  "Martin",
  "Ruiz",
  "Hernandez",
  "Jimenez",
  "Diaz",
  "Moreno",
  "Alvarez",
  "Romero",
  "Alonso",
  "Gutierrez",
];
const PAISES = ["Spain", "Mexico", "Argentina", "Colombia", "Chile", "Peru", "Ecuador", "Uruguay"];
const ORIGENES = [
  "facebook_ads",
  "google_ads",
  "organico_web",
  "referido",
  "instagram_ads",
  "linkedin_ads",
  "tiktok_ads",
];
const TIPOS_LEAD_B2C = ["frio", "templado", "caliente", "muy_caliente"];

// ---------- Catalogos B2B (organizaciones formativas) ----------
const NOMBRES_ORG = [
  "Academia Demo Madrid",
  "Centro Formativo Barcelona Pro",
  "Instituto Demo Valencia",
  "Escuela Demo Sevilla",
  "Academia Bilbao Plus",
  "Centro Demo Malaga",
  "Instituto Online Murcia",
  "Escuela Digital Zaragoza",
  "Academia Palma Tech",
  "Centro Formacion Canarias",
  "Instituto Demo Granada",
  "Escuela Online Alicante",
  "Academia Vigo Plus",
  "Centro Demo Toledo",
  "Instituto Salamanca Online",
];
const TIPOS_ORG = ["academia", "universidad", "instituto", "centro_formacion", "escuela_negocios"];
const ORIGENES_B2B = [
  "evento_formativo",
  "referido_partner",
  "linkedin_outreach",
  "web_directa",
  "feria_sector",
  "publicidad_b2b",
];
const TIPOS_LEAD_B2B = [
  "prospect_frio",
  "interesado",
  "oportunidad",
  "cliente_actual",
  "renovacion_pendiente",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function phone(country: string): string {
  const prefijos: Record<string, string> = {
    Spain: "+34",
    Mexico: "+52",
    Argentina: "+54",
    Colombia: "+57",
    Chile: "+56",
    Peru: "+51",
    Ecuador: "+593",
    Uruguay: "+598",
  };
  return `${prefijos[country] ?? "+34"} ${rand(600000000, 999999999)}`;
}
function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400000).toISOString();
}
function daysFromNow(d: number): string {
  return new Date(Date.now() + d * 86400000).toISOString();
}

async function clearTenant(tenantId: string) {
  const tables = [
    "chat_messages",
    "conversaciones_whatsapp",
    "llamadas",
    "intentos_llamadas",
    "intentos",
    "notificaciones",
    "lead_cualificacion",
    "lead_programas",
    "agendamientos",
    "appointments",
    "lead",
    "campanas",
    "programas",
    "advisors",
    "voice_agents",
    "ai_agent_variants",
    "ai_agents",
  ];
  for (const t of tables) {
    await admin.from(t).delete().eq("tenant_id", tenantId);
  }
}

async function upsertTenant(
  nameKey: string,
  name: string,
  clientEmail: string,
  dashboardTitle: string
): Promise<string> {
  const { data: existing } = await admin
    .from("tenants")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (existing) {
    await clearTenant(existing.id);
    return existing.id;
  }
  const { data, error } = await admin
    .from("tenants")
    .insert({
      name,
      supabase_url: SUPABASE_URL,
      supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "demo-key",
      client_email: clientEmail,
      config: {
        headers: [],
        dashboard_title: dashboardTitle,
        primary_color: "#4f46e5",
        demo_key: nameKey,
        test_orchestrator_enabled: true,
      },
    })
    .select("id")
    .single();
  if (error) {
    console.error(`FAIL tenant ${name}:`, error.message);
    process.exit(1);
  }
  return data.id;
}

async function ensureAuthUser(
  email: string,
  password: string,
  metadata: Record<string, unknown>
): Promise<string | null> {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { 
      user_metadata: metadata,
      app_metadata: metadata
    });
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
    app_metadata: metadata,
  });
  if (error) {
    console.error(`createUser ${email}:`, error.message);
    return null;
  }
  return data?.user?.id ?? null;
}

// ============================================================
// TENANT 1: LINKSTATION (B2B — organizaciones)
// ============================================================
async function seedLinkStation(): Promise<{ id: string; leadsCount: number }> {
  console.log("\n========== TENANT 1: LinkStation (B2B) ==========");

  const tenantId = await upsertTenant(
    "linkstation",
    "LinkStation",
    "admin@linkstation.ai",
    "LinkStation — CRM Comercial"
  );
  console.log(`tenant_id: ${tenantId}`);

  // Asignar al admin (Beatriz) — usuario auth principal del cliente
  const beatrizId = await ensureAuthUser(DEMO_EMAIL, DEMO_PASSWORD!, {
    is_admin: true,
    tenant_id: tenantId,
    full_name: "Beatriz",
  });
  if (beatrizId) await admin.from("tenants").update({ auth_user_id: beatrizId }).eq("id", tenantId);

  // Advisors (equipo comercial interno de LinkStation)
  const { data: advisors } = await admin
    .from("advisors")
    .insert([
      {
        tenant_id: tenantId,
        name: "Beatriz CEO",
        email: "beatriz@linkstation.ai",
        phone: phone("Spain"),
        is_active: true,
        origins: ["evento_formativo"],
        campaigns: ["Q1 2026"],
        countries: ["ES"],
        courses: [],
      },
      {
        tenant_id: tenantId,
        name: "Sergio Ventas",
        email: "sergio@linkstation.ai",
        phone: phone("Spain"),
        is_active: true,
        origins: ["linkedin_outreach"],
        campaigns: [],
        countries: ["ES", "MX"],
        courses: [],
      },
      {
        tenant_id: tenantId,
        name: "Lucia Comercial Latam",
        email: "lucia@linkstation.ai",
        phone: phone("Mexico"),
        is_active: true,
        origins: ["referido_partner"],
        campaigns: [],
        countries: ["MX", "CO", "AR"],
        courses: [],
      },
    ])
    .select("id, name");

  // Programas / Servicios que ofrece AF a sus academias clientes
  const { data: programas } = await admin
    .from("programas")
    .insert([
      {
        tenant_id: tenantId,
        name: "CRM + Workflow Orchestrator",
        category: "Producto SaaS",
        precio: 499,
        duracion_meses: 12,
        activo: true,
      },
      {
        tenant_id: tenantId,
        name: "Asistente IA Whatsapp",
        category: "Producto SaaS",
        precio: 199,
        duracion_meses: 12,
        activo: true,
      },
      {
        tenant_id: tenantId,
        name: "Onboarding + Setup Inicial",
        category: "Servicio",
        precio: 1200,
        duracion_meses: 1,
        activo: true,
      },
      {
        tenant_id: tenantId,
        name: "Consultoria Funnel",
        category: "Servicio",
        precio: 800,
        duracion_meses: 1,
        activo: true,
      },
    ])
    .select("id, name");

  // Campanas comerciales B2B
  const { data: campanas } = await admin
    .from("campanas")
    .insert([
      {
        tenant_id: tenantId,
        nombre: "Outbound LinkedIn Q1 2026",
        activa: true,
        fecha_inicio: daysAgo(30),
      },
      {
        tenant_id: tenantId,
        nombre: "Inbound Web Demo Request",
        activa: true,
        fecha_inicio: daysAgo(60),
      },
      {
        tenant_id: tenantId,
        nombre: "Feria Expoformacion 2026",
        activa: true,
        fecha_inicio: daysAgo(15),
      },
      { tenant_id: tenantId, nombre: "Partner Referrals", activa: true, fecha_inicio: daysAgo(45) },
    ])
    .select("id, nombre");

  // AI Agents (Comercial IA de AF)
  const { data: aiAgents } = await admin
    .from("ai_agents")
    .insert([
      {
        tenant_id: tenantId,
        name: "BDR Bot - Cualificacion B2B",
        type: "QUALIFY",
        status: "ACTIVE",
        description: "Cualifica academias prospect via web/whatsapp",
      },
      {
        tenant_id: tenantId,
        name: "Onboarding Bot - Setup",
        type: "FOLLOWUP",
        status: "ACTIVE",
        description: "Acompaña en setup inicial de la plataforma",
      },
    ])
    .select("id, name");
  if (aiAgents) {
    await admin.from("ai_agent_variants").insert(
      aiAgents.map((a) => ({
        agent_id: a.id,
        tenant_id: tenantId,
        version_label: "v1.0",
        prompt_text: `Prompt comercial B2B para ${a.name}. Sector: formacion ES+Latam.`,
        is_active: true,
        model_provider: "openai",
        model_name: "gpt-5.4-mini",
      }))
    );
  }

  // ---------- LEADS B2B: organizaciones formativas ----------
  const advisorIds = (advisors ?? []).map((a) => a.id);
  const leads = NOMBRES_ORG.map((orgName, i) => {
    const pais = i < 11 ? "Spain" : pick(["Mexico", "Colombia", "Argentina", "Chile"]);
    const contactoNombre = pick(NOMBRES_PERSONA);
    const contactoApellido = pick(APELLIDOS);
    const tipoOrg = pick(TIPOS_ORG);
    const numAlumnos = rand(150, 3500);
    return {
      tenant_id: tenantId,
      id_lead_externo: `LS-ORG-${100 + i}`,
      nombre: orgName, // nombre de la organizacion
      apellido: `${contactoNombre} ${contactoApellido}`, // contacto principal (campo aprovechado para B2B)
      telefono: phone(pais),
      email: `contacto@${orgName.toLowerCase().replace(/\s+/g, "")}.demo`,
      pais,
      tipo_lead: pick(TIPOS_LEAD_B2B),
      origen: pick(ORIGENES_B2B),
      campana: pick(campanas ?? [{ id: null, nombre: "Sin campana" }]).nombre,
      status: pick(["PENDING", "CONTACTED", "QUALIFIED", "CLIENTE", "REJECTED"]),
      is_ai_enabled: true,
      advisor_id: advisorIds.length > 0 ? pick(advisorIds) : null,
      metadata: {
        lead_type: "organization",
        organization_name: orgName,
        tipo_organizacion: tipoOrg,
        num_alumnos_anuales: numAlumnos,
        num_empleados: rand(10, 200),
        website: `https://${orgName.toLowerCase().replace(/\s+/g, "")}.demo`,
        contact_person: {
          name: contactoNombre,
          surname: contactoApellido,
          role: pick([
            "CEO",
            "Director Comercial",
            "Responsable Marketing",
            "Director Academico",
            "Coordinador IT",
          ]),
          email: `${contactoNombre.toLowerCase()}.${contactoApellido.toLowerCase()}@${orgName.toLowerCase().replace(/\s+/g, "")}.demo`,
          phone: phone(pais),
        },
        notas_internas: pick([
          "Interes confirmado en demo",
          "Necesita aprobacion direccion",
          "Cliente del competidor X",
          "Renovacion en 3 meses",
          "Decision Q2",
        ]),
      },
      fecha_ingreso_crm: daysAgo(rand(0, 120)),
    };
  });
  const { data: leadsInserted, error: leadsErr } = await admin
    .from("lead")
    .insert(leads)
    .select("id");
  if (leadsErr) {
    console.error("FAIL leads B2B:", leadsErr.message);
  }
  const leadsCount = leadsInserted?.length ?? 0;
  console.log(`  ${leadsCount} organizaciones + contactos`);

  if (leadsInserted && leadsInserted.length > 0) {
    // Cualificaciones B2B
    await admin.from("lead_cualificacion").insert(
      leadsInserted.slice(0, 12).map((l) => ({
        tenant_id: tenantId,
        id_lead: l.id,
        cualificacion: pick(["CUALIFICADO", "NO_CUALIFICADO", "PENDIENTE"]),
        motivo_anulacion: null,
        anios_experiencia: rand(2, 25),
        nivel_estudios: pick(["empresa_consolidada", "startup", "scaleup", "centenaria"]),
      }))
    );

    // Llamadas comerciales
    await admin.from("llamadas").insert(
      leadsInserted.slice(0, 10).flatMap((l, i) =>
        Array.from({ length: rand(1, 3) }, () => ({
          tenant_id: tenantId,
          id_lead: l.id,
          id_llamada_retell: `ls_call_${i}_${Math.random().toString(36).slice(2, 8)}`,
          tipo_agente: pick(["humano", "ia"]),
          nombre_agente: pick([
            "Beatriz CEO",
            "Sergio Ventas",
            "Lucia Comercial Latam",
            "BDR Bot - Cualificacion B2B",
          ]),
          estado_llamada: pick(["completada", "no_contestada", "buzon"]),
          razon_termino: pick([
            "demo_agendada",
            "info_enviada",
            "no_interes_actual",
            "decision_pendiente",
          ]),
          fecha_inicio: daysAgo(rand(0, 60)),
          duracion_segundos: rand(180, 1800),
          url_grabacion: `https://demo-recordings.local/af_${Math.random().toString(36).slice(2, 8)}.mp3`,
          resumen: pick([
            "Demo agendada para semana siguiente",
            "Pendiente confirmacion direccion",
            "Cliente solicita propuesta personalizada",
            "Comparativa con competidor en marcha",
          ]),
        }))
      )
    );

    // Citas (demos comerciales)
    const ags = leadsInserted.slice(0, 8).map((l, i) => ({
      tenant_id: tenantId,
      id_lead: l.id,
      advisor_id: advisorIds.length > 0 ? pick(advisorIds) : null,
      fecha_agendada_cliente: i < 4 ? daysFromNow(rand(1, 21)) : daysAgo(rand(1, 30)),
      fecha_agendada_lead: i < 4 ? daysFromNow(rand(1, 21)) : daysAgo(rand(1, 30)),
      confirmado: i < 4 ? Math.random() > 0.3 : true,
      meeting_link: `https://meet.google.com/af-demo-${Math.random().toString(36).slice(2, 8)}`,
      notas: pick([
        "Demo plataforma 30 min",
        "Propuesta comercial",
        "Onboarding kickoff",
        "Renovacion contrato",
      ]),
    }));
    await admin.from("agendamientos").insert(ags);

    // Notificaciones internas
    await admin.from("notificaciones").insert(
      leadsInserted.slice(0, 8).map((l) => ({
        tenant_id: tenantId,
        id_lead: l.id,
        tipo: pick([
          "demo_proxima",
          "renovacion_pendiente",
          "lead_calificado",
          "propuesta_enviada",
        ]),
        titulo: pick([
          "Demo programada hoy",
          "Renovacion en 30 dias",
          "Nuevo lead cualificado",
          "Propuesta lista para revision",
        ]),
        mensaje: "Notificacion demo del CRM de LinkStation",
        leida: Math.random() > 0.4,
      }))
    );
  }

  return { id: tenantId, leadsCount };
}

// ============================================================
// TENANT 2: DEMO - SANDBOX (B2C — leads tipicos para sandbox)
// ============================================================
async function seedDemoAcademia(): Promise<{ id: string; leadsCount: number }> {
  console.log("\n========== TENANT 2: Demo - Sandbox (B2C sandbox) ==========");

  const tenantId = await upsertTenant(
    "demo",
    "Demo - Sandbox",
    "demo@linkstation.local",
    "Demo - Sandbox"
  );
  console.log(`tenant_id: ${tenantId}`);

  const { data: advisors } = await admin
    .from("advisors")
    .insert([
      {
        tenant_id: tenantId,
        name: "Patricia Asesor",
        email: "patricia@linkstation.local",
        phone: phone("Spain"),
        is_active: true,
        origins: ["facebook_ads"],
        campaigns: ["Q1 2026"],
        countries: ["ES"],
        courses: [],
      },
      {
        tenant_id: tenantId,
        name: "Carlos Asesor",
        email: "carlos@linkstation.local",
        phone: phone("Spain"),
        is_active: true,
        origins: ["google_ads"],
        campaigns: [],
        countries: ["ES", "MX"],
        courses: [],
      },
      {
        tenant_id: tenantId,
        name: "Maria Asesor",
        email: "maria@linkstation.local",
        phone: phone("Mexico"),
        is_active: true,
        origins: ["instagram_ads"],
        campaigns: [],
        countries: ["MX", "CO"],
        courses: [],
      },
      {
        tenant_id: tenantId,
        name: "Javier Asesor",
        email: "javier@linkstation.local",
        phone: phone("Argentina"),
        is_active: true,
        origins: ["referido"],
        campaigns: [],
        countries: ["AR", "CL"],
        courses: [],
      },
    ])
    .select("id");

  const { data: programas } = await admin
    .from("programas")
    .insert([
      {
        tenant_id: tenantId,
        name: "Master IA Aplicada",
        category: "Tecnologia",
        precio: 4900,
        duracion_meses: 9,
        activo: true,
      },
      {
        tenant_id: tenantId,
        name: "Bootcamp Full-Stack Developer",
        category: "Desarrollo",
        precio: 3500,
        duracion_meses: 6,
        activo: true,
      },
      {
        tenant_id: tenantId,
        name: "Curso Marketing Digital",
        category: "Marketing",
        precio: 1200,
        duracion_meses: 3,
        activo: true,
      },
      {
        tenant_id: tenantId,
        name: "Master Ciencia de Datos",
        category: "Tecnologia",
        precio: 5500,
        duracion_meses: 10,
        activo: true,
      },
      {
        tenant_id: tenantId,
        name: "Programa Cybersecurity",
        category: "Seguridad",
        precio: 4200,
        duracion_meses: 8,
        activo: true,
      },
      {
        tenant_id: tenantId,
        name: "Diploma UX/UI Design",
        category: "Diseño",
        precio: 2800,
        duracion_meses: 5,
        activo: true,
      },
    ])
    .select("id");

  const { data: campanas } = await admin
    .from("campanas")
    .insert([
      { tenant_id: tenantId, nombre: "Black Friday 2026", activa: true, fecha_inicio: daysAgo(15) },
      { tenant_id: tenantId, nombre: "Nuevo Curso IA", activa: true, fecha_inicio: daysAgo(30) },
      { tenant_id: tenantId, nombre: "Beca Latam 2026", activa: true, fecha_inicio: daysAgo(45) },
      {
        tenant_id: tenantId,
        nombre: "Open Day Marketing",
        activa: false,
        fecha_inicio: daysAgo(90),
      },
    ])
    .select("id, nombre");

  const { data: aiAgents } = await admin
    .from("ai_agents")
    .insert([
      {
        tenant_id: tenantId,
        name: "Virginia (Cualificacion)",
        type: "QUALIFY",
        status: "ACTIVE",
        description: "Cualifica leads de programas formativos",
      },
      {
        tenant_id: tenantId,
        name: "Sofia (Followup)",
        type: "FOLLOWUP",
        status: "ACTIVE",
        description: "Seguimiento post-llamada",
      },
    ])
    .select("id, name");
  if (aiAgents) {
    await admin.from("ai_agent_variants").insert(
      aiAgents.map((a) => ({
        agent_id: a.id,
        tenant_id: tenantId,
        version_label: "v1.0",
        prompt_text: `Placeholder prompt para ${a.name}.`,
        is_active: true,
        model_provider: "openai",
        model_name: "gpt-5.4-mini",
      }))
    );
  }

  await admin.from("voice_agents").insert([
    {
      tenant_id: tenantId,
      name: "Maria (Voice Demo)",
      status: "ACTIVE",
      provider: "RETELL",
      provider_agent_id: "agent_demo_local",
      voice_id: "voice_demo",
      from_number: "+34900000001",
      prompt_text_retell: "Voice prompt demo placeholder.",
    },
  ]);

  // Leads B2C (personas)
  const advisorIds = (advisors ?? []).map((a) => a.id);
  const leads = Array.from({ length: 40 }, (_, i) => {
    const pais = pick(PAISES);
    const nombre = pick(NOMBRES_PERSONA);
    const apellido = pick(APELLIDOS);
    return {
      tenant_id: tenantId,
      id_lead_externo: `DEMO-${1000 + i}`,
      nombre,
      apellido,
      telefono: phone(pais),
      email: `${nombre.toLowerCase()}.${apellido.toLowerCase()}.${i}@demo.linkstation.local`,
      pais,
      tipo_lead: pick(TIPOS_LEAD_B2C),
      origen: pick(ORIGENES),
      campana: pick(campanas ?? [{ id: null, nombre: "Sin campana" }]).nombre,
      status: pick(["PENDING", "CONTACTED", "QUALIFIED", "ENROLLED", "REJECTED"]),
      is_ai_enabled: Math.random() > 0.2,
      advisor_id: advisorIds.length > 0 && Math.random() > 0.3 ? pick(advisorIds) : null,
      metadata: { lead_type: "person", USER_NAME: nombre, demo: true },
      fecha_ingreso_crm: daysAgo(rand(0, 90)),
    };
  });
  const { data: leadsInserted } = await admin.from("lead").insert(leads).select("id");
  const leadsCount = leadsInserted?.length ?? 0;
  console.log(`  ${leadsCount} leads (personas)`);

  if (!leadsInserted || leadsInserted.length === 0) return { id: tenantId, leadsCount: 0 };

  // Lead-programas
  if (programas) {
    await admin.from("lead_programas").insert(
      leadsInserted.slice(0, 25).map((l) => ({
        tenant_id: tenantId,
        id_lead: l.id,
        id_programa: pick(programas).id,
        estado: pick(["INTERESADO", "INSCRITO", "MATRICULADO", "DESCARTADO"]),
      }))
    );
  }

  // Cualificaciones
  await admin.from("lead_cualificacion").insert(
    leadsInserted.slice(0, 30).map((l) => {
      const cualif = pick(["CUALIFICADO", "NO_CUALIFICADO", "PENDIENTE", "SI", "NO"]);
      return {
        tenant_id: tenantId,
        id_lead: l.id,
        cualificacion: cualif,
        motivo_anulacion:
          cualif === "NO" || cualif === "NO_CUALIFICADO"
            ? pick([
                "No interesado",
                "Sin presupuesto",
                "Lead duplicado",
                "No contesta",
                "Fuera de target",
              ])
            : null,
        anios_experiencia: rand(0, 15),
        nivel_estudios: pick(["secundaria", "bachillerato", "fp", "grado", "master", "doctorado"]),
      };
    })
  );

  // Llamadas
  await admin.from("llamadas").insert(
    leadsInserted.slice(0, 30).flatMap((l, i) =>
      Array.from({ length: rand(1, 3) }, () => ({
        tenant_id: tenantId,
        id_lead: l.id,
        id_llamada_retell: `call_demo_${i}_${Math.random().toString(36).slice(2, 8)}`,
        tipo_agente: pick(["ia", "humano"]),
        nombre_agente: pick(["Virginia IA", "Patricia Asesor", "Carlos Asesor"]),
        estado_llamada: pick(["completada", "no_contestada", "buzon", "rechazada", "en_curso"]),
        razon_termino: pick([
          "finalizada_ok",
          "no_contesta",
          "rechaza",
          "buzon_voz",
          "agendamiento",
        ]),
        fecha_inicio: daysAgo(rand(0, 30)),
        duracion_segundos: rand(15, 600),
        url_grabacion: `https://demo-recordings.local/call_${Math.random().toString(36).slice(2, 8)}.mp3`,
        resumen: pick([
          "Interesado en master IA",
          "Pidio info de becas",
          "Lead frio",
          "Agendamiento confirmado",
        ]),
      }))
    )
  );

  // WhatsApp
  await admin.from("conversaciones_whatsapp").insert(
    leadsInserted.slice(0, 20).map((l) => ({
      tenant_id: tenantId,
      id_lead: l.id,
      id_conversacion_chatwoot: `cw_${Math.random().toString(36).slice(2, 10)}`,
      opt_in_whatsapp: Math.random() > 0.2,
      estado: pick(["ACTIVA", "CERRADA", "PENDIENTE"]),
      fecha_ultimo_mensaje: daysAgo(rand(0, 5)),
    }))
  );
  await admin.from("chat_messages").insert(
    leadsInserted.slice(0, 20).flatMap((l) =>
      Array.from({ length: rand(3, 8) }, (_, i) => ({
        tenant_id: tenantId,
        lead_id: l.id,
        direction: i % 2 === 0 ? "INBOUND" : "OUTBOUND",
        message_type: "TEXT",
        content: pick([
          "Hola, me interesa el master de IA",
          "¿Cual es el precio?",
          "¿Hay becas?",
          "Si, agendemos una llamada",
          "¿Cuando empieza?",
        ]),
        sent_by: i % 2 === 0 ? "Lead" : "Virginia IA",
        status: "DELIVERED",
        created_at: daysAgo(rand(0, 30)),
      }))
    )
  );

  // Citas
  await admin.from("agendamientos").insert(
    leadsInserted.slice(0, 12).map((l, i) => {
      const fecha = i < 6 ? daysFromNow(rand(1, 14)) : daysAgo(rand(1, 30));
      return {
        tenant_id: tenantId,
        id_lead: l.id,
        advisor_id: advisorIds.length > 0 ? pick(advisorIds) : null,
        fecha_agendada_cliente: fecha,
        fecha_agendada_lead: fecha,
        confirmado: i < 6 ? Math.random() > 0.3 : true,
        meeting_link: `https://meet.google.com/demo-${Math.random().toString(36).slice(2, 8)}`,
        notas: pick([
          "Primera llamada de info",
          "Revision de programa",
          "Cierre venta",
          "Followup",
        ]),
      };
    })
  );

  // Notificaciones
  await admin.from("notificaciones").insert(
    leadsInserted.slice(0, 15).map((l) => ({
      tenant_id: tenantId,
      id_lead: l.id,
      tipo: pick(["nuevo_lead", "llamada_perdida", "cita_proxima", "tarea_pendiente"]),
      titulo: pick(["Nuevo lead asignado", "Llamada perdida", "Cita en 1 hora", "Tarea pendiente"]),
      mensaje: "Notificacion demo del sandbox",
      leida: Math.random() > 0.5,
    }))
  );

  return { id: tenantId, leadsCount };
}

async function main() {
  console.log(`[seed-demo] Supabase: ${SUPABASE_URL}`);

  const ls = await seedLinkStation();
  const demo = await seedDemoAcademia();

  console.log("\n=====================================================");
  console.log("SEED COMPLETADO — 2 tenants");
  console.log("=====================================================");
  console.log(`[1] LinkStation           (B2B) ${ls.leadsCount} organizaciones   id=${ls.id}`);
  console.log(`[2] Demo - Academia       (B2C) ${demo.leadsCount} personas       id=${demo.id}`);
  console.log("");
  console.log(`Login admin: ${DEMO_EMAIL}  (password en .env.local DEMO_USER_PASSWORD)`);
  console.log(`  full_name: Beatriz   tenant default: LinkStation`);
  console.log("App URL:     http://localhost:8500");
  console.log("Studio URL:  http://localhost:8300");
  console.log("=====================================================\n");
}

main().catch((err) => {
  console.error("[seed-demo] error:", err);
  process.exit(1);
});
