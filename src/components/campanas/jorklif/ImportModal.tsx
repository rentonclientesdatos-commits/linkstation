"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react";
import { importJorklifCampaignAction, downloadJorklifTemplateBase64 } from "@/lib/actions/jorklif-campaign";
import type { JorklifImportResult } from "@/lib/schemas/jorklif-campaign";
import { toast } from "@/components/ui/toast";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [campaignName, setCampaignName] = useState("Campaña Cartera & Cotizaciones Jorklif");
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<JorklifImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const base64 = await downloadJorklifTemplateBase64();
      const link = document.createElement("a");
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
      link.download = "Plantilla_Clientes_Jorklif.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        variant: "success",
        title: "Plantilla descargada",
        description: "Se ha descargado Plantilla_Clientes_Jorklif.xlsx",
      });
    } catch {
      toast({
        variant: "error",
        title: "Error",
        description: "No se pudo descargar la plantilla",
      });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        variant: "warning",
        title: "Archivo requerido",
        description: "Por favor selecciona un archivo Excel (.xlsx) o CSV.",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("campaignName", campaignName);

      const res = await importJorklifCampaignAction(formData);
      setResult(res);

      if (res.success && res.inserted > 0) {
        toast({
          variant: "success",
          title: "Importación exitosa",
          description: `Se importaron ${res.inserted} clientes listos para llamar.`,
        });
        onSuccess();
      } else {
        toast({
          variant: "error",
          title: "Aviso de importación",
          description: res.error || "No se insertaron registros nuevos.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Error al importar",
        description: err.message || "Error desconocido",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Importar Base de Datos Jorklif</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Carga clientes para Cobranza y Seguimiento de Cotizaciones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Nombre de la Campaña
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Ej. Cartera Octubre - Equipos y Repuestos"
              required
            />
          </div>

          {/* Drag & Drop Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-border hover:border-blue-500/50 rounded-2xl p-6 text-center bg-muted/20 hover:bg-blue-500/5 transition-all space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              {file ? (
                <p className="text-sm font-bold text-foreground flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              ) : (
                <>
                  <p className="text-sm font-bold text-foreground">
                    Haz clic para seleccionar tu archivo Excel (.xlsx) o CSV
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Exportación desde SAP Business One o Google Sheets
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Download Template helper */}
          <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-muted/40 border border-border">
            <span className="text-muted-foreground font-medium">¿Aún no tienes el formato exacto?</span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {downloadingTemplate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Descargar plantilla oficial
            </button>
          </div>

          {/* Result Feedback */}
          {result && (
            <div
              className={`p-4 rounded-2xl border text-sm space-y-2 ${
                result.success
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300"
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {result.success ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                {result.success ? "Carga Procesada" : "Error en la Carga"}
              </div>
              <p className="text-xs">
                Total filas: {result.totalRows} | Insertados: {result.inserted} | Omitidos: {result.skipped}
              </p>
              {result.errors.length > 0 && (
                <div className="text-[11px] max-h-24 overflow-y-auto space-y-1 mt-2 p-2 rounded-lg bg-black/10 dark:bg-black/30">
                  {result.errors.map((err, idx) => (
                    <p key={idx}>
                      Fila {err.row}: campo <span className="font-bold">{err.field}</span> - {err.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Procesar e Importar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
