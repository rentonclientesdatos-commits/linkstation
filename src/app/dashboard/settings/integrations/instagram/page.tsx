"use client";

import { useState, useEffect } from "react";
import { useTenantStore } from "@/store/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  Instagram,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Zap,
  MessageCircle,
  Users,
  RefreshCw,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InstagramConfig {
  pageAccessToken: string;
  igAccountId: string;
  pageId: string;
  webhookVerifyToken: string;
  aiEnabled: boolean;
  leadAdsEnabled: boolean;
  connectedAt?: string;
}

const DEFAULT_VERIFY_TOKEN = "linkstation_ig_webhook_2026";

export default function InstagramSettingsPage() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const [config, setConfig] = useState<InstagramConfig>({
    pageAccessToken: "",
    igAccountId: "",
    pageId: "",
    webhookVerifyToken: DEFAULT_VERIFY_TOKEN,
    aiEnabled: true,
    leadAdsEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/instagram`
      : "https://your-domain.com/api/webhooks/instagram";

  // ── Load existing config ───────────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/tenant/instagram-config?tenantId=${tenantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.config) setConfig((prev) => ({ ...prev, ...data.config }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  // ── Save config ────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/tenant/instagram-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, config }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error saving");
      toast({
        variant: "success",
        title: "✅ Configuración guardada",
        description: "Instagram conectado correctamente.",
      });
      setConfig((prev) => ({ ...prev, connectedAt: new Date().toISOString() }));
    } catch (err) {
      toast({ variant: "error", title: "Error al guardar", description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  // ── Test connection ────────────────────────────────────────────────────────
  async function handleTest() {
    if (!config.pageAccessToken) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/tenant/instagram-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageAccessToken: config.pageAccessToken }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, message: `Cuenta: ${data.name || data.id} ✅` });
        if (data.igAccountId && !config.igAccountId) {
          setConfig((prev) => ({
            ...prev,
            igAccountId: data.igAccountId,
            pageId: data.pageId || "",
          }));
        }
      } else {
        setTestResult({ ok: false, message: data.error || "Token inválido" });
      }
    } catch {
      setTestResult({ ok: false, message: "Error de conexión" });
    } finally {
      setTesting(false);
    }
  }

  // ── Copy to clipboard ──────────────────────────────────────────────────────
  async function copyToClipboard(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 shadow-lg shadow-pink-500/20">
          <Instagram className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Instagram Integration</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Automatiza DMs y captura leads de Instagram con IA
          </p>
        </div>
        {config.connectedAt && (
          <div className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            Conectado
          </div>
        )}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FeatureCard
          icon={<MessageCircle className="h-5 w-5 text-purple-400" />}
          title="DM Automation"
          description="La IA responde automáticamente los mensajes directos de Instagram"
          enabled={config.aiEnabled}
          onToggle={() => setConfig((p) => ({ ...p, aiEnabled: !p.aiEnabled }))}
        />
        <FeatureCard
          icon={<Users className="h-5 w-5 text-pink-400" />}
          title="Lead Ads"
          description="Captura leads de anuncios de Instagram directamente en el sistema"
          enabled={config.leadAdsEnabled}
          onToggle={() => setConfig((p) => ({ ...p, leadAdsEnabled: !p.leadAdsEnabled }))}
        />
      </div>

      {/* Main Form */}
      <form
        onSubmit={handleSave}
        className="bg-card border-border space-y-6 rounded-2xl border p-6"
      >
        <h2 className="text-base font-semibold">Credenciales de Meta / Instagram</h2>

        {/* Page Access Token */}
        <div className="space-y-2">
          <Label htmlFor="pageAccessToken">
            Page Access Token <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="pageAccessToken"
                type={showToken ? "text" : "password"}
                placeholder="EAAxxxxxx..."
                value={config.pageAccessToken}
                onChange={(e) => setConfig((p) => ({ ...p, pageAccessToken: e.target.value }))}
                className="pr-10 font-mono text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing || !config.pageAccessToken}
              className="shrink-0"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              <span className="ml-1.5">Probar</span>
            </Button>
          </div>
          {testResult && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                testResult.ok
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {testResult.ok ? (
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              )}
              {testResult.message}
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Token de larga duración (60 días) de tu Página de Facebook conectada a Instagram.{" "}
            <a
              href="https://developers.facebook.com/tools/explorer/"
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex items-center gap-1 underline underline-offset-2"
            >
              Obtener en Graph Explorer <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

        {/* IG Account ID + Page ID */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="igAccountId">
              Instagram Account ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="igAccountId"
              placeholder="17841xxxxxxxxxx"
              value={config.igAccountId}
              onChange={(e) => setConfig((p) => ({ ...p, igAccountId: e.target.value }))}
              className="font-mono text-xs"
              required
            />
            <p className="text-muted-foreground text-xs">
              ID numérico de tu cuenta de Instagram Business
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pageId">Facebook Page ID</Label>
            <Input
              id="pageId"
              placeholder="123456789"
              value={config.pageId}
              onChange={(e) => setConfig((p) => ({ ...p, pageId: e.target.value }))}
              className="font-mono text-xs"
            />
            <p className="text-muted-foreground text-xs">
              Requerido para Lead Ads. Se obtiene con "Probar token".
            </p>
          </div>
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Guardar configuración
            </>
          )}
        </Button>
      </form>

      {/* Webhook Setup Guide */}
      <div className="bg-card border-border space-y-5 rounded-2xl border p-6">
        <div className="flex items-center gap-2">
          <RefreshCw className="text-primary h-4 w-4" />
          <h2 className="text-base font-semibold">Configurar Webhook en Meta</h2>
        </div>

        <div className="space-y-4">
          {/* Webhook URL */}
          <div className="space-y-1.5">
            <Label>URL del Webhook</Label>
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 rounded-lg px-3 py-2 text-xs break-all">
                {webhookUrl}
              </code>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => copyToClipboard(webhookUrl, "url")}
              >
                {copied === "url" ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Verify Token */}
          <div className="space-y-1.5">
            <Label>Token de verificación</Label>
            <div className="flex items-center gap-2">
              <Input
                value={config.webhookVerifyToken}
                onChange={(e) => setConfig((p) => ({ ...p, webhookVerifyToken: e.target.value }))}
                className="flex-1 font-mono text-xs"
                placeholder="linkstation_ig_webhook_2026"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => copyToClipboard(config.webhookVerifyToken, "token")}
              >
                {copied === "token" ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Step-by-step guide */}
        <div className="bg-muted/50 space-y-3 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-blue-400" />
            Pasos para activar el webhook
          </div>
          <ol className="text-muted-foreground list-inside list-decimal space-y-2 text-xs">
            <li>
              Ve a{" "}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-0.5 underline underline-offset-2"
              >
                developers.facebook.com/apps <ExternalLink className="h-3 w-3" />
              </a>{" "}
              → selecciona tu app
            </li>
            <li>
              Panel izquierdo → <strong>Webhooks</strong> → Añadir suscripción para{" "}
              <code>instagram</code>
            </li>
            <li>Pega la URL del webhook y el token de verificación de arriba</li>
            <li>
              Activa las suscripciones: <code>messages</code>, <code>messaging_postbacks</code>
            </li>
            <li>
              Para Lead Ads: añade suscripción para <code>page</code> → campo <code>leadgen</code>
            </li>
            <li>
              En <strong>Instagram</strong> → <strong>Configuración de la plataforma</strong> →
              conecta tu cuenta de Instagram Business
            </li>
          </ol>
        </div>

        <a
          href="https://developers.facebook.com/docs/messenger-platform/instagram"
          target="_blank"
          rel="noreferrer"
          className="text-primary flex items-center gap-1 text-xs hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Documentación oficial: Messenger API para Instagram
        </a>
      </div>
    </div>
  );
}

// ─── Feature Toggle Card ───────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
        enabled
          ? "border-purple-500/40 bg-purple-500/5 shadow-sm shadow-purple-500/10"
          : "border-border bg-card hover:border-border/80 hover:bg-card/80"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
            enabled ? "bg-purple-500/15" : "bg-muted"
          )}
        >
          {icon}
        </div>
        <div
          className={cn(
            "mt-0.5 h-5 w-9 rounded-full transition-all duration-300",
            enabled ? "bg-purple-500" : "bg-muted-foreground/30"
          )}
        >
          <div
            className={cn(
              "m-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-300",
              enabled ? "translate-x-4" : "translate-x-0"
            )}
          />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>
      </div>
    </button>
  );
}
