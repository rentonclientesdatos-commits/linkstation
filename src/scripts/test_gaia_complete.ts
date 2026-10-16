import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testGaia() {
  console.log("=== TEST COMPLETO GAÏA / REFORMA ===\n");

  // 1. Tenant
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, config")
    .ilike("name", "%reforma%")
    .maybeSingle();

  if (!tenant) {
    console.log("❌ Tenant reforma no encontrado");
    return;
  }
  const tenantId = tenant.id;
  console.log(`✅ Tenant: "${tenant.name}" (${tenantId})`);

  const config = tenant.config as any;
  const businessType = config?.business_type || "NO DEFINIDO";
  const hasWA = !!config?.whatsapp?.accessToken;
  console.log(`   business_type: ${businessType}`);
  console.log(`   WhatsApp config: ${hasWA ? "✅ OK" : "❌ FALTA"}`);

  // 2. Knowledge base - PDFs
  const { data: kbItems } = await supabase
    .from("knowledge_base")
    .select("id, name, description, file_url, file_key, created_at")
    .eq("tenant_id", tenantId);

  console.log(`\n📚 BASE DE CONOCIMIENTO (${(kbItems || []).length} ítems):`);
  if (!kbItems?.length) {
    console.log("   ⚠️  Sin ítems en knowledge base");
  } else {
    for (const item of kbItems) {
      const hasFile = !!item.file_url || !!item.file_key;
      let publicUrl = item.file_url || "";
      if (!publicUrl && item.file_key) {
        const { data: urlData } = supabase.storage
          .from("knowledge_base")
          .getPublicUrl(item.file_key);
        publicUrl = urlData?.publicUrl || "";
      }
      console.log(`   ${hasFile ? "✅" : "⚠️ "} "${item.name}"`);
      if (publicUrl) console.log(`      URL: ${publicUrl.substring(0, 80)}...`);
    }
  }

  // 3. Menu items (platos cargados)
  const { data: menuItems } = await supabase
    .from("restaurant_menu_items")
    .select("id, name, category, price, is_active")
    .eq("tenant_id", tenantId)
    .order("category");

  console.log(`\n🍽️  CARTA DE PLATOS (${(menuItems || []).length} ítems en DB):`);
  if (!menuItems?.length) {
    console.log("   ⚠️  Sin platos cargados — el botón 'Cargar Carta desde PDF' está listo para usarse");
  } else {
    const byCategory: Record<string, typeof menuItems> = {};
    for (const item of menuItems) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    }
    for (const [cat, items] of Object.entries(byCategory)) {
      console.log(`   [${cat.toUpperCase()}] ${items.length} platos`);
      for (const p of items.slice(0, 3)) {
        console.log(`     - ${p.name} | $${p.price} | ${p.is_active ? "activo" : "inactivo"}`);
      }
      if (items.length > 3) console.log(`     ... y ${items.length - 3} más`);
    }
  }

  // 4. AI Agent
  const { data: agents } = await supabase
    .from("ai_agents")
    .select("id, name")
    .eq("tenant_id", tenantId);

  const agentIds = (agents || []).map((a: any) => a.id);
  console.log(`\n🤖 AGENTES IA (${agentIds.length}):`);
  for (const a of agents || []) {
    console.log(`   - ${a.name} (${a.id})`);
  }

  // 5. Variant con API key
  if (agentIds.length > 0) {
    const { data: variant } = await supabase
      .from("ai_agent_variants")
      .select("id, model_name, is_active, api_key, prompt_text")
      .in("agent_id", agentIds)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (variant) {
      console.log(`\n⚙️  VARIANT ACTIVA:`);
      console.log(`   model: ${variant.model_name}`);
      console.log(`   api_key: ${variant.api_key ? "✅ OK (" + variant.api_key.substring(0, 8) + "...)" : "❌ FALTA"}`);
      console.log(`   prompt length: ${variant.prompt_text?.length || 0} chars`);
    } else {
      console.log("\n❌ Sin variant activa");
    }
  }

  // 6. WABA configuration
  const { data: waba } = await supabase
    .from("waba_configurations")
    .select("id, phone_number_id, is_active, waba_id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .maybeSingle();

  console.log(`\n📱 WABA CONFIGURATION:`);
  if (waba) {
    console.log(`   ✅ phone_number_id: ${waba.phone_number_id}`);
    console.log(`   ✅ waba_id: ${waba.waba_id}`);
  } else {
    console.log(`   ⚠️  Sin WABA config activa (usando config de tenant)`);
    if (hasWA) console.log(`   ✅ Credentials en tenant.config.whatsapp`);
  }

  // 7. Leads recientes
  const { data: leads } = await supabase
    .from("lead")
    .select("id, nombre, telefono, is_ai_enabled")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(3);

  console.log(`\n👥 LEADS RECIENTES (últimos 3):`);
  for (const l of leads || []) {
    console.log(`   - ${l.nombre || "Sin nombre"} | ${l.telefono} | AI: ${l.is_ai_enabled ? "✅" : "❌"}`);
  }

  console.log("\n=== FIN TEST ===");
}

testGaia().catch(console.error);
