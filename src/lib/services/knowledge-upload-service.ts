/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * knowledge-upload-service.ts
 *
 * Core upload logic extracted from the "use server" boundary so it can be
 * called from both Server Actions (knowledge.ts) and API Routes (route.ts)
 * without hitting Next.js Server Action serialization restrictions on FormData.
 */

import { getAdminSupabaseClient, getActiveTenantId } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/actions/session";
import { KnowledgeBaseService } from "@/lib/services/knowledge-base";
import OpenAI from "openai";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Tenant resolution
// ---------------------------------------------------------------------------
async function resolveTenantId(explicitTenantId?: string): Promise<string | null> {
  if (explicitTenantId) return explicitTenantId;
  const fromCookie = await getActiveTenantId();
  if (fromCookie) return fromCookie;
  try {
    const session = await getSessionContext();
    if (session?.tenantId) return session.tenantId;
  } catch {
    // session unavailable
  }
  return null;
}

// ---------------------------------------------------------------------------
// PDF text extraction (3 strategies + raw fallback)
// ---------------------------------------------------------------------------
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Strategy 1: PDFParse v2 class
  try {
    const pdfModule = await import("pdf-parse");
    const PDFParseClass = (pdfModule as any).PDFParse || (pdfModule as any).default?.PDFParse;
    if (typeof PDFParseClass === "function") {
      const parser = new PDFParseClass({ data: buffer });
      const parsePromise = parser.getText();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("PDF extraction timeout")), 8000)
      );
      const res: any = await Promise.race([parsePromise, timeoutPromise]);
      try { await parser.destroy(); } catch { /* ignore */ }
      if (res?.text && res.text.trim().length > 0) return res.text;
    }
  } catch (e: any) {
    console.warn("⚠️ [PDF_EXTRACT] Strategy 1 warning:", e?.message || e);
  }

  // Strategy 2: Legacy function fallback
  try {
    const pdfModule = await import("pdf-parse");
    const legacyFunc =
      typeof (pdfModule as any).default === "function"
        ? (pdfModule as any).default
        : typeof pdfModule === "function"
          ? pdfModule
          : null;
    if (typeof legacyFunc === "function") {
      const res = await legacyFunc(buffer);
      if (res?.text && res.text.trim().length > 0) return res.text;
    }
  } catch (e: any) {
    console.warn("⚠️ [PDF_EXTRACT] Strategy 2 warning:", e?.message || e);
  }

  // Strategy 3: Text stream extraction
  try {
    const raw = buffer.toString("latin1");
    const streamMatches = raw.match(/BT[\s\S]*?ET/g);
    if (streamMatches && streamMatches.length > 0) {
      const extracted = streamMatches
        .map((s) => s.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ$€.,:\-\s\n]/g, " "))
        .join("\n")
        .replace(/\s+/g, " ")
        .trim();
      if (extracted.length > 20) return extracted;
    }
  } catch (e: any) {
    console.warn("⚠️ [PDF_EXTRACT] Strategy 3 warning:", e?.message || e);
  }

  // Strategy 4: Raw UTF-8 cleanup
  return buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\táéíóúÁÉÍÓÚñÑ]/g, " ");
}

// ---------------------------------------------------------------------------
// Vector indexing
// ---------------------------------------------------------------------------
async function indexKnowledgeText(
  tenantId: string,
  documentId: string,
  documentName: string,
  fileKey: string,
  text: string,
  supabase: any
) {
  if (!text || text.trim().length === 0) return;

  const chunkSize = 1200;
  const overlap = 150;
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize));
    if (i + chunkSize >= text.length) break;
  }

  console.log(`[KNOWLEDGE] 🧩 ${chunks.length} chunks for: ${documentName}`);

  let apiKey: string | null = process.env.OPENAI_API_KEY || null;
  const isInvalid = (k: string | null) =>
    !k || k === "your_api_key_here" || k.includes("REPLACE") || k.startsWith("placeholder") || k.length < 20;

  if (isInvalid(apiKey)) {
    const { data: variants } = await supabase
      .from("ai_agent_variants")
      .select("api_key")
      .eq("tenant_id", tenantId)
      .not("api_key", "is", null)
      .limit(1);
    const dbKey = (variants as any)?.[0]?.api_key;
    if (!isInvalid(dbKey)) {
      apiKey = dbKey;
    } else {
      const { data: globalVariants } = await supabase
        .from("ai_agent_variants")
        .select("api_key")
        .not("api_key", "is", null)
        .limit(1);
      const gKey = (globalVariants as any)?.[0]?.api_key;
      apiKey = isInvalid(gKey) ? null : gKey;
    }
  }

  if (apiKey && !isInvalid(apiKey)) {
    try {
      const openai = new OpenAI({ apiKey, maxRetries: 0, timeout: 8000 });
      const batchSize = 100;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize).filter((c) => c.trim().length >= 10);
        if (batch.length === 0) continue;
        const embedRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: batch.map((c) => c.replace(/\n/g, " ")),
        });
        const batchToInsert = batch.map((chunk, index) => ({
          content: chunk,
          embedding: embedRes.data[index].embedding,
          metadata: { knowledge_base_id: documentId, source_name: documentName, file_key: fileKey },
          knowledgeBaseId: documentId,
        }));
        await KnowledgeBaseService.addEmbeddingsBatch(tenantId, batchToInsert);
      }
      console.log(`[KNOWLEDGE] ✅ Embeddings OK for: ${documentName}`);
    } catch (e: any) {
      console.warn(`[KNOWLEDGE] ⚠️ Embeddings skipped (${e?.message || e})`);
    }
  } else {
    console.warn("[KNOWLEDGE] Skipping embeddings: no valid OpenAI API Key.");
  }
}

// ---------------------------------------------------------------------------
// Bucket helper
// ---------------------------------------------------------------------------
async function ensureKnowledgeBucket(supabase: any) {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (!error && buckets) {
      const exists = buckets.some((b: any) => b.name === "knowledge_base" || b.id === "knowledge_base");
      if (!exists) {
        await supabase.storage.createBucket("knowledge_base", {
          public: true,
          fileSizeLimit: 52428800, // 50 MB
        });
      }
    }
  } catch (err) {
    console.warn("⚠️ [KNOWLEDGE] Bucket check note:", err);
  }
}

export interface KnowledgeUploadPayload {
  tenant_id?: string;
  name?: string;
  description?: string;
  fileName: string;
  fileType?: string;
  fileBase64?: string;
  buffer?: Buffer;
}

// ---------------------------------------------------------------------------
// Core upload processor from buffer & metadata
// ---------------------------------------------------------------------------
export async function processKnowledgeUploadFromPayload(payload: KnowledgeUploadPayload) {
  const supabase = await getAdminSupabaseClient();
  const tenantId = await resolveTenantId(payload.tenant_id);

  if (!tenantId) return { success: false, error: "No se pudo identificar el tenant actual." };

  const fileName = payload.fileName || "documento";
  const fileType = payload.fileType || "application/octet-stream";
  const name = payload.name || fileName;
  const description = payload.description || "";

  let buffer: Buffer;
  if (payload.buffer && Buffer.isBuffer(payload.buffer)) {
    buffer = payload.buffer;
  } else if (payload.fileBase64) {
    buffer = Buffer.from(payload.fileBase64, "base64");
  } else {
    return { success: false, error: "No se proporcionó ningún contenido de archivo." };
  }

  if (buffer.length === 0) {
    return { success: false, error: "El archivo está vacío." };
  }

  try {
    await ensureKnowledgeBucket(supabase);

    const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");

    const { data: existing } = await (supabase.from("knowledge_base" as any) as any)
      .select("id, file_key")
      .eq("tenant_id", tenantId)
      .eq("content_hash", contentHash)
      .maybeSingle();

    const fileKey =
      existing?.file_key ||
      `kb/${tenantId}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    // Upload to storage
    let fileUrl = "";
    try {
      const { data: storageData, error: storageErr } = await supabase.storage
        .from("knowledge_base")
        .upload(fileKey, buffer, { contentType: fileType, upsert: true });
      if (!storageErr && storageData) {
        const { data: publicUrlData } = supabase.storage.from("knowledge_base").getPublicUrl(fileKey);
        fileUrl = publicUrlData?.publicUrl || `/storage/${fileKey}`;
      } else {
        fileUrl = `/storage/${fileKey}`;
      }
    } catch (storageException) {
      console.warn("⚠️ [KNOWLEDGE] Storage upload note:", storageException);
      fileUrl = `/storage/${fileKey}`;
    }

    let documentId: string;
    let documentData: any;

    if (existing) {
      documentId = existing.id;
      const { data: updated, error: updateErr } = await (supabase.from("knowledge_base" as any) as any)
        .update({ name: name, description: description, file_url: fileUrl, updated_at: new Date().toISOString() })
        .eq("id", documentId)
        .select()
        .single();
      if (updateErr) throw updateErr;
      documentData = updated;
      try {
        await (supabase.from("knowledge_base_embeddings" as any) as any)
          .delete()
          .eq("knowledge_base_id", documentId);
      } catch { /* non-blocking */ }
    } else {
      const { data: inserted, error: insertErr } = await (supabase.from("knowledge_base" as any) as any)
        .insert({ tenant_id: tenantId, name: name, description: description, file_key: fileKey, file_url: fileUrl, content_hash: contentHash })
        .select()
        .single();
      if (insertErr) throw insertErr;
      documentData = inserted;
      documentId = inserted.id;
    }

    // Text extraction + vectorization
    try {
      const isPdf = fileType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf");
      const text = isPdf ? await extractTextFromPdf(buffer) : buffer.toString("utf-8");
      await indexKnowledgeText(tenantId, documentId, documentData.name || fileName, fileKey, text, supabase);
    } catch (idxError) {
      console.warn("⚠️ [KNOWLEDGE_INDEXING] Saved but indexing skipped:", idxError);
    }

    return { success: true, data: documentData };
  } catch (error: any) {
    console.error("❌ [UPLOAD_KNOWLEDGE] Critical Error:", error);
    return { success: false, error: error?.message || error?.name || "Error desconocido al procesar el documento" };
  }
}

// ---------------------------------------------------------------------------
// Main upload function from FormData (for Server Action compatibility)
// ---------------------------------------------------------------------------
export async function processKnowledgeUpload(formData: FormData) {
  const explicitTenantId = (formData.get("tenant_id") as string) || undefined;
  const file = formData.get("file") as File;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!file) return { success: false, error: "No se proporcionó ningún archivo." };

  const buffer = Buffer.from(await file.arrayBuffer());

  return processKnowledgeUploadFromPayload({
    tenant_id: explicitTenantId,
    name: name || file.name,
    description: description || "",
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    buffer,
  });
}
