import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthServiceRoleKey } from "@/lib/auth-config";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      getAuthServiceRoleKey()
    );

    const { data: docs, error } = await supabase
      .from("knowledge_base")
      .select("id, name, description, file_url, file_key, metadata, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[knowledge-menus] Error fetching docs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const documents = (docs || []).map((doc) => {
      let publicUrl = doc.file_url || "";
      if ((!publicUrl || publicUrl.startsWith("/")) && doc.file_key) {
        try {
          const { data: urlData } = supabase.storage
            .from("knowledge_base")
            .getPublicUrl(doc.file_key);
          if (urlData?.publicUrl) publicUrl = urlData.publicUrl;
        } catch {
          /* ignore */
        }
      }

      const meta = (doc.metadata as Record<string, unknown>) || {};
      const items = (meta.menu_items as Array<{
        id: string;
        name: string;
        category: "entrante" | "principal" | "postre" | "bebida" | "especial";
        price: number;
        description?: string;
      }>) || [];

      const docNameLower = (doc.name || "").toLowerCase();
      let type: "comida" | "tragos" | "general" = "general";
      if (
        docNameLower.includes("trago") ||
        docNameLower.includes("bebida") ||
        docNameLower.includes("coctel") ||
        docNameLower.includes("bar")
      ) {
        type = "tragos";
      } else if (
        docNameLower.includes("comida") ||
        docNameLower.includes("plato") ||
        docNameLower.includes("carta")
      ) {
        type = "comida";
      }

      return {
        id: doc.id,
        name: doc.name,
        description: doc.description || "",
        fileUrl: publicUrl,
        type,
        itemsCount: items.length,
        items,
      };
    });

    return NextResponse.json({ documents });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, documentId, items } = body;

    if (!tenantId || !documentId || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "tenantId, documentId and items array are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      getAuthServiceRoleKey()
    );

    // Get current doc metadata
    const { data: doc, error: fetchErr } = await supabase
      .from("knowledge_base")
      .select("id, metadata")
      .eq("id", documentId)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchErr || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const currentMeta = (doc.metadata as Record<string, unknown>) || {};
    const updatedMeta = {
      ...currentMeta,
      menu_items: items,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from("knowledge_base")
      .update({ metadata: updatedMeta })
      .eq("id", documentId)
      .eq("tenant_id", tenantId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: items.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
