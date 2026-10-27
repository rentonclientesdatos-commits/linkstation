"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Upload,
  FileText,
  Trash2,
  Search,
  Plus,
  FileUp,
  ShieldCheck,
  Loader2,
  RefreshCw,
  X,
  AlignLeft,
  BookOpen,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  getKnowledgeBase,
  createDirectTextKnowledge,
  deleteKnowledgeDocument,
} from "@/lib/actions/knowledge";
import type { KnowledgeItem } from "@/types/database";
import { toast } from "@/components/ui/toast";
import { useTenantStore } from "@/store/tenant";

export default function KnowledgeBasePage() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"file" | "text">("file");
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state for multiple files
  const [files, setFiles] = useState<File[]>([]);
  const [kbName, setKbName] = useState("");
  const [description, setDescription] = useState("");
  const [textContent, setTextContent] = useState("");
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  const loadItems = async () => {
    setLoading(true);
    const res = await getKnowledgeBase(tenantId || undefined);
    if (res.success && res.data) {
      setItems(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const res = await getKnowledgeBase(tenantId || undefined);
      if (mounted && res.success && res.data) {
        setItems(res.data);
      }
      if (mounted) setLoading(false);
    };
    init();
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  const handleUploadFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length });

      const finalName =
        files.length > 1 && kbName ? `${kbName} (${file.name})` : kbName || file.name;

      try {
        const queryParams = new URLSearchParams();
        queryParams.set("name", finalName);
        if (description) queryParams.set("description", description);
        if (tenantId) queryParams.set("tenant_id", tenantId);
        queryParams.set("fileName", file.name);
        queryParams.set("fileType", file.type || "application/octet-stream");

        const response = await fetch(`/api/knowledge/upload?${queryParams.toString()}`, {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }

        const res = await response.json();
        if (res.success) {
          successCount++;
        } else {
          errors.push(`${file.name}: ${res.error || "Error al procesar el archivo"}`);
        }
      } catch (fetchErr: unknown) {
        const err = fetchErr as Error;
        errors.push(`${file.name}: ${err?.message || "Error al subir el archivo"}`);
        console.error("[KnowledgePage] Upload fetch error:", fetchErr);
      }
    }

    if (successCount > 0) {
      await loadItems();
      if (errors.length === 0) {
        setIsUploadModalOpen(false);
        resetForm();
        toast({
          variant: "success",
          title: "Documentos procesados",
          description: `Se han indexado correctamente ${successCount} documento(s).`,
        });
      } else {
        toast({
          variant: "warning",
          title: "Subida parcial",
          description: `Se subieron ${successCount} archivos, pero hubo errores: ${errors.join(", ")}`,
        });
      }
    } else {
      toast({
        variant: "error",
        title: "Error al subir documentos",
        description: errors.join(", "),
      });
    }
    setUploading(false);
  };

  const handleCreateText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbName.trim() || !textContent.trim()) {
      toast({
        variant: "warning",
        title: "Campos incompletos",
        description: "Por favor indica un título y el contenido de texto.",
      });
      return;
    }

    setUploading(true);
    const res = await createDirectTextKnowledge({
      name: kbName.trim(),
      description: description.trim(),
      content: textContent.trim(),
      tenant_id: tenantId || undefined,
    });

    if (res.success) {
      await loadItems();
      setIsUploadModalOpen(false);
      resetForm();
      toast({
        variant: "success",
        title: "Conocimiento indexado",
        description: "El texto se ha fragmentado y guardado en la base vectorial con éxito.",
      });
    } else {
      toast({
        variant: "error",
        title: "Error al guardar texto",
        description: res.error || "Ocurrió un error al procesar el texto.",
      });
    }
    setUploading(false);
  };

  const resetForm = () => {
    setFiles([]);
    setKbName("");
    setDescription("");
    setTextContent("");
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Group items by name for the UI
  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.name]) {
        acc[item.name] = {
          name: item.name,
          description: item.description,
          ids: [item.id],
          count: 1,
          created_at: item.created_at,
          file_keys: [item.file_key],
          isText: item.file_key?.startsWith("text/") || item.file_url?.startsWith("text://"),
        };
      } else {
        acc[item.name].ids.push(item.id);
        acc[item.name].file_keys.push(item.file_key);
        acc[item.name].count += 1;
        if (new Date(item.created_at) > new Date(acc[item.name].created_at)) {
          acc[item.name].description = item.description;
          acc[item.name].created_at = item.created_at;
        }
      }
      return acc;
    },
    {} as Record<
      string,
      {
        name: string;
        description: string | null;
        ids: string[];
        count: number;
        created_at: string;
        file_keys: string[];
        isText?: boolean;
      }
    >
  );

  const displayGroups = Object.values(groupedItems)
    .filter(
      (group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="bg-[#030712] text-white selection:bg-[#00e5ff]/30 flex h-[calc(100vh-80px)] flex-col overflow-hidden transition-colors duration-500">
      {/* Header Area */}
      <div className="relative z-10 flex items-center justify-between border-b border-[rgba(0,229,255,0.1)] bg-[rgba(4,8,20,0.85)] px-8 py-5 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.3)] to-transparent" />
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(0,229,255,0.3)] bg-[rgba(0,229,255,0.1)] text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            <Database className="h-6 w-6 text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">Base de Conocimiento</h1>
            <p className="mt-1 text-xs leading-none font-bold tracking-widest text-[#00e5ff]/70 uppercase">
              Gestiona PDFs, cartas y textos de entrenamiento indexados en PGVector.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="group relative">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#00e5ff]" />
            <input
              type="text"
              placeholder="Buscar conocimientos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-64 rounded-xl border border-[rgba(0,229,255,0.18)] bg-[rgba(4,8,20,0.8)] pr-6 pl-12 text-sm text-white placeholder-slate-500 outline-none backdrop-blur-md transition-all focus:border-[rgba(0,229,255,0.5)] focus:shadow-[0_0_12px_rgba(0,229,255,0.2)]"
            />
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsUploadModalOpen(true);
            }}
            className="flex h-11 items-center gap-2 rounded-xl border border-[rgba(0,229,255,0.4)] bg-[rgba(0,229,255,0.15)] px-6 text-[11px] font-black tracking-widest text-[#00e5ff] uppercase shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all hover:bg-[rgba(0,229,255,0.25)] hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Añadir Conocimiento
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 opacity-50">
            <Loader2 className="h-8 w-8 animate-spin text-[#00e5ff]" />
            <p className="text-[10px] font-black tracking-widest text-[#00e5ff] uppercase">
              Cargando biblioteca...
            </p>
          </div>
        ) : displayGroups.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            {searchQuery ? (
              <EmptyState
                size="lg"
                icon={<Search className="h-12 w-12 text-[#00e5ff]" />}
                title="Sin coincidencias"
                description="No encontramos documentos que coincidan con tu búsqueda. Prueba con otro término."
                className="border-[rgba(0,229,255,0.1)] bg-[rgba(6,10,25,0.6)]"
              />
            ) : (
              <EmptyState
                size="lg"
                icon={<Database className="h-12 w-12 text-[#00e5ff]" />}
                title="Sin conocimientos cargados"
                description="Sube documentos o pega texto/cartas para alimentar el cerebro de tu agente."
                className="border-[rgba(0,229,255,0.1)] bg-[rgba(6,10,25,0.6)]"
                action={
                  <button
                    onClick={() => {
                      resetForm();
                      setIsUploadModalOpen(true);
                    }}
                    className="flex h-10 items-center gap-2 rounded-xl border border-[rgba(0,229,255,0.4)] bg-[rgba(0,229,255,0.15)] px-5 text-xs font-black tracking-widest text-[#00e5ff] uppercase shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all hover:bg-[rgba(0,229,255,0.25)]"
                  >
                    <Plus className="h-4 w-4" /> Añadir primer conocimiento
                  </button>
                }
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {displayGroups.map((group) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={group.name}
                className="group relative overflow-hidden rounded-[24px] border border-[rgba(0,229,255,0.12)] bg-[rgba(6,10,25,0.8)] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all hover:border-[rgba(0,229,255,0.3)] hover:shadow-[0_0_24px_rgba(0,229,255,0.15)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.25)] to-transparent" />
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(0,229,255,0.25)] bg-[rgba(0,229,255,0.08)] text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.15)]">
                    {group.isText ? (
                      <AlignLeft className="h-6 w-6" />
                    ) : (
                      <Database className="h-6 w-6" />
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 transition-all group-hover:opacity-100">
                    <button
                      onClick={async () => {
                        if (
                          confirm(
                            `¿Eliminar la entrada "${group.name}" y sus ${group.count} registro(s)?`
                          )
                        ) {
                          setLoading(true);
                          for (const id of group.ids) {
                            await deleteKnowledgeDocument(id, tenantId || undefined);
                          }
                          await loadItems();
                        }
                      }}
                      className="rounded-xl border border-transparent p-2 text-slate-400 transition-all hover:border-[rgba(255,0,85,0.3)] hover:bg-[rgba(255,0,85,0.1)] hover:text-[#ff0055]"
                      title={`Eliminar toda la base ${group.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="line-clamp-1 text-base font-bold text-white transition-colors group-hover:text-[#00e5ff]">
                    {group.name}
                  </h3>
                  <p className="line-clamp-2 h-8 text-xs leading-snug text-slate-400">
                    {group.description || "Sin descripción proporcionada."}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-[rgba(0,229,255,0.08)] pt-4">
                  <span className="rounded-full border border-[rgba(0,229,255,0.25)] bg-[rgba(0,229,255,0.08)] px-3 py-1 text-[10px] font-black tracking-widest text-[#00e5ff] uppercase">
                    {group.isText
                      ? "Texto Directo"
                      : `${group.count} ${group.count === 1 ? "Archivo" : "Archivos"}`}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#34d399]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#34d399]" />
                    Vectorizado
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL DE CARGA ── */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => !uploading && setIsUploadModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative max-h-[90vh] w-full max-w-lg space-y-6 overflow-y-auto rounded-[32px] border border-[rgba(0,229,255,0.25)] bg-[rgba(4,8,20,0.95)] p-8 shadow-[0_16px_64px_rgba(0,0,0,0.8),0_0_30px_rgba(0,229,255,0.15)] backdrop-blur-2xl"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.4)] to-transparent" />
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(0,229,255,0.3)] bg-[rgba(0,229,255,0.1)] shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                  <BookOpen className="h-7 w-7 text-[#00e5ff]" />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-white uppercase">
                  Añadir Base de Conocimiento
                </h3>
                <p className="px-4 text-xs leading-relaxed font-medium text-slate-400">
                  Alimenta la IA con documentos o texto directo que se fragmentan e indexan en
                  PGVector.
                </p>
              </div>

              {/* Selector de Pestañas */}
              <div className="flex rounded-2xl border border-[rgba(0,229,255,0.15)] bg-[rgba(6,10,25,0.8)] p-1 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setActiveTab("file")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all",
                    activeTab === "file"
                      ? "border border-[rgba(0,229,255,0.4)] bg-[rgba(0,229,255,0.18)] text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <FileUp className="h-4 w-4" />
                  Subir Archivos (PDF/TXT)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("text")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all",
                    activeTab === "text"
                      ? "border border-[rgba(0,229,255,0.4)] bg-[rgba(0,229,255,0.18)] text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <AlignLeft className="h-4 w-4" />
                  Texto / Carta Directa
                </button>
              </div>

              {activeTab === "file" ? (
                <form onSubmit={handleUploadFiles} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-muted-foreground/40 ml-4 text-[10px] font-black tracking-widest uppercase">
                      Archivos PDF / TXT
                    </label>
                    <div
                      className={cn(
                        "relative flex h-28 flex-col items-center justify-center gap-2 overflow-hidden rounded-[24px] border-2 border-dashed transition-all",
                        files.length > 0
                          ? "border-emerald-500/50 bg-emerald-500/5"
                          : "border-border hover:border-primary/20 bg-card/40"
                      )}
                    >
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.txt,.md"
                        title="Subir archivos"
                        disabled={uploading}
                        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        onChange={(e) => {
                          if (e.target.files) {
                            setFiles(Array.from(e.target.files));
                          }
                        }}
                      />
                      <Upload
                        className={cn(
                          "h-7 w-7",
                          files.length > 0 ? "text-emerald-400" : "text-muted-foreground/20"
                        )}
                      />
                      <p className="text-muted-foreground text-[10px] font-bold tracking-tight uppercase">
                        {files.length > 0
                          ? `${files.length} archivo(s) seleccionado(s)`
                          : "Click o arrastra archivos (PDF, TXT, MD)"}
                      </p>
                    </div>

                    {files.length > 0 && (
                      <div className="custom-scrollbar mt-3 max-h-28 space-y-1.5 overflow-y-auto px-1">
                        {files.map((f, i) => (
                          <div
                            key={i}
                            className="bg-card/40 border-border flex items-center justify-between rounded-xl border p-2.5 text-xs"
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <FileText className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                              <span className="text-foreground/80 truncate font-semibold">
                                {f.name}
                              </span>
                            </div>
                            {!uploading && (
                              <button
                                type="button"
                                title={`Eliminar ${f.name}`}
                                onClick={() => removeFile(i)}
                                className="text-white/20 transition-colors hover:text-red-400"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-muted-foreground/40 ml-4 text-[10px] font-black tracking-widest uppercase">
                      Nombre de la Base (Opcional)
                    </label>
                    <input
                      type="text"
                      value={kbName}
                      disabled={uploading}
                      onChange={(e) => setKbName(e.target.value)}
                      className="bg-card/40 border-border text-foreground h-11 w-full rounded-2xl border px-4 text-xs font-medium transition-all outline-none focus:border-emerald-500/40 disabled:opacity-50"
                      placeholder="Ej: Carta Restaurante Verano 2026..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-muted-foreground/40 ml-4 text-[10px] font-black tracking-widest uppercase">
                      Descripción (Opcional)
                    </label>
                    <textarea
                      value={description}
                      disabled={uploading}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-card/40 border-border text-foreground h-16 w-full resize-none rounded-2xl border p-3 text-xs font-medium transition-all outline-none focus:border-emerald-500/40 disabled:opacity-50"
                      placeholder="Breve descripción del contenido..."
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => setIsUploadModalOpen(false)}
                      className="bg-card/40 border-border hover:bg-card/60 text-foreground h-12 flex-1 rounded-2xl border text-[10px] font-black tracking-widest uppercase transition-all disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={uploading || files.length === 0}
                      className="flex h-12 flex-1 flex-col items-center justify-center rounded-2xl bg-emerald-500 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      {uploading ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>
                            Indexando ({uploadProgress.current}/{uploadProgress.total})...
                          </span>
                        </div>
                      ) : (
                        "Subir e Indexar"
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCreateText} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-muted-foreground/40 ml-4 text-[10px] font-black tracking-widest uppercase">
                      Título / Nombre del Conocimiento *
                    </label>
                    <input
                      type="text"
                      required
                      value={kbName}
                      disabled={uploading}
                      onChange={(e) => setKbName(e.target.value)}
                      className="bg-card/40 border-border text-foreground h-11 w-full rounded-2xl border px-4 text-xs font-medium transition-all outline-none focus:border-emerald-500/40 disabled:opacity-50"
                      placeholder="Ej: Carta de Comidas y Promociones"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-muted-foreground/40 ml-4 text-[10px] font-black tracking-widest uppercase">
                      Descripción Corta
                    </label>
                    <input
                      type="text"
                      value={description}
                      disabled={uploading}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-card/40 border-border text-foreground h-11 w-full rounded-2xl border px-4 text-xs font-medium transition-all outline-none focus:border-emerald-500/40 disabled:opacity-50"
                      placeholder="Ej: Platos especiales, ingredientes y horarios"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-muted-foreground/40 ml-4 text-[10px] font-black tracking-widest uppercase">
                      Contenido (Texto / Markdown) *
                    </label>
                    <textarea
                      required
                      value={textContent}
                      disabled={uploading}
                      onChange={(e) => setTextContent(e.target.value)}
                      rows={6}
                      className="bg-card/40 border-border text-foreground w-full resize-none rounded-2xl border p-3.5 font-mono text-xs font-medium transition-all outline-none focus:border-emerald-500/40 disabled:opacity-50"
                      placeholder={`### Hamburguesas:\n- Clásica: $12.00 (Carne 150g, lechuga, tomate, queso)\n- Bacon Doble: $15.50 (Doble carne, queso cheddar, bacon crujiente)\n\n### Bebidas:\n- Refresco: $3.00\n- Cerveza Artesanal: $5.00`}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => setIsUploadModalOpen(false)}
                      className="bg-card/40 border-border hover:bg-card/60 text-foreground h-12 flex-1 rounded-2xl border text-[10px] font-black tracking-widest uppercase transition-all disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={uploading || !kbName.trim() || !textContent.trim()}
                      className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-emerald-500 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      {uploading ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Vectorizando...</span>
                        </div>
                      ) : (
                        "Guardar e Indexar"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
