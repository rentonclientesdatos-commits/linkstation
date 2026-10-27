"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, Plug, PlugZap, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { IntegrationRow } from "./types";

interface Props {
  provider: "hubspot" | "zoho";
  integration: IntegrationRow | null;
  otherActive: boolean;
  onChanged: () => void;
}

const PROVIDER_META: Record<"hubspot" | "zoho", { label: string; color: string }> = {
  hubspot: { label: "HubSpot", color: "text-orange-600" },
  zoho: { label: "Zoho CRM", color: "text-red-600" },
};

export function CRMProviderCard({ provider, integration, otherActive, onChanged }: Props) {
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const isConnected = integration?.is_active === true;
  const isError = integration?.healthcheck_status === "error";
  const meta = PROVIDER_META[provider];

  const handleTest = async () => {
    if (!integration?.id) return;
    setTesting(true);
    try {
      const res = await fetch(`/api/integrations/manage/${integration.id}/healthcheck`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) toast({ variant: "success", title: `${meta.label} alcanzable` });
      else toast({ variant: "error", title: `${meta.label}: ${data.error ?? "error"}` });
      onChanged();
    } catch (err) {
      toast({ variant: "error", title: `Healthcheck falló: ${(err as Error).message}` });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!integration?.id) return;
    if (!confirm(`¿Desconectar ${meta.label}? Las credenciales se eliminan localmente.`)) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/integrations/manage/${integration.id}/disconnect`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        toast({ variant: "success", title: `${meta.label} desconectado` });
        onChanged();
      } else {
        toast({ variant: "error", title: `Error: ${data.error ?? "unknown"}` });
      }
    } catch (err) {
      toast({ variant: "error", title: `Disconnect falló: ${(err as Error).message}` });
    } finally {
      setDisconnecting(false);
    }
  };

  const lastCheck =
    integration?.last_healthcheck_at &&
    new Date(integration.last_healthcheck_at).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(0,229,255,0.15)] bg-[rgba(6,10,25,0.8)] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.25)] to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Plug className={`h-4 w-4 ${meta.color}`} />
            <h4 className="text-sm font-bold text-white">{meta.label}</h4>
            {isConnected && !isError && (
              <Badge className="border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.12)] text-[#34d399] shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Conectado
              </Badge>
            )}
            {isError && (
              <Badge className="border border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.12)] text-[#fb7185] shadow-[0_0_8px_rgba(244,63,94,0.2)]">
                <AlertTriangle className="mr-1 h-3 w-3" /> Error
              </Badge>
            )}
            {!isConnected && (
              <Badge variant="outline" className="border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] text-slate-400">
                Sin conectar
              </Badge>
            )}
          </div>
          {integration?.portal_id && (
            <p className="text-xs text-slate-400">Portal ID: {integration.portal_id}</p>
          )}
          {(integration?.metadata as { api_domain?: string } | null)?.api_domain && (
            <p className="text-xs text-slate-400">
              API: {(integration?.metadata as { api_domain?: string }).api_domain}
            </p>
          )}
          {lastCheck && (
            <p className="text-[11px] text-slate-500">Último healthcheck: {lastCheck}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {!isConnected && !otherActive && (
            <a href={`/api/integrations/${provider}/auth/start`}>
              <Button size="sm" className="border border-[rgba(0,229,255,0.4)] bg-[rgba(0,229,255,0.12)] font-bold text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.2)] hover:bg-[rgba(0,229,255,0.22)] transition-all">
                <PlugZap className="mr-1 h-3 w-3" /> Conectar
              </Button>
            </a>
          )}
          {!isConnected && otherActive && (
            <div
              className="cursor-not-allowed text-xs text-slate-500"
              title="Desconecta el otro CRM antes de conectar este"
            >
              Desconecta el otro CRM primero
            </div>
          )}
          {isConnected && (
            <>
              <Button size="sm" variant="outline" onClick={handleTest} disabled={testing} className="border-[rgba(0,229,255,0.2)] bg-[rgba(0,229,255,0.05)] text-slate-200 hover:bg-[rgba(0,229,255,0.1)]">
                <RefreshCw className={`mr-1 h-3 w-3 ${testing ? "animate-spin" : ""}`} />
                Test
              </Button>
              <a href={`/api/integrations/${provider}/auth/start`}>
                <Button size="sm" variant="outline" className="w-full border-[rgba(0,229,255,0.2)] bg-[rgba(0,229,255,0.05)] text-slate-200 hover:bg-[rgba(0,229,255,0.1)]">
                  Reconectar
                </Button>
              </a>
              <Button
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="border border-[rgba(255,0,85,0.3)] bg-[rgba(255,0,85,0.1)] text-[#ff0055] hover:bg-[rgba(255,0,85,0.2)] transition-all"
              >
                Desconectar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
