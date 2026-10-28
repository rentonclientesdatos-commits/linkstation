"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTenantStore } from "@/store/tenant";
import { setTenantCookies, getTenants, getActiveTenantConfig } from "@/lib/actions/tenant";
import { cn } from "@/lib/utils";
import { ChevronDown, Building2, Check, Plus } from "lucide-react";
import { Tenant } from "@/types/tenant";

export function TenantSelector({ collapsed, isAdmin }: { collapsed: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const { tenantName, setTenant } = useTenantStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTenants() {
      if (!isAdmin) {
        // Tenant Admin: cargar únicamente su propio tenant
        if (!tenantName) {
          const myTenant = await getActiveTenantConfig();
          if (myTenant) {
            setTenant({
              tenantId: myTenant.id,
              tenantName: myTenant.name,
              config: myTenant.config,
              isAdmin: false,
              businessType: myTenant.business_type,
            });
          }
        }
        setLoading(false);
        return;
      }

      // Super Admin: cargar todos los tenants de clientes
      const data = await getTenants();
      const clientTenants = data.filter((t) => !t.is_admin);
      setTenants(clientTenants);
      setLoading(false);

      const cookieTenantId =
        typeof document !== "undefined"
          ? document.cookie
              .split("; ")
              .find((c) => c.startsWith("esden-tenant-id="))
              ?.split("=")[1]
          : undefined;

      if (!tenantName && cookieTenantId) {
        const active = clientTenants.find((t) => t.id === cookieTenantId);
        if (active) {
          setTenant({
            tenantId: active.id,
            tenantName: active.name,
            config: active.config,
            isAdmin: true,
            businessType: active.business_type,
          });
        }
      } else if (!tenantName && !cookieTenantId && clientTenants.length > 0) {
        const first = clientTenants[0];
        setTenant({
          tenantId: first.id,
          tenantName: first.name,
          config: first.config,
          isAdmin: true,
          businessType: first.business_type,
        });
        setTenantCookies(first.id, first.name).then(() => router.refresh());
      } else if (tenantName && !cookieTenantId) {
        const active = clientTenants.find((t) => t.name === tenantName);
        if (active) {
          setTenantCookies(active.id, active.name).then(() => router.refresh());
        }
      }
    }
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function handleSelect(t: Tenant) {
    if (!isAdmin) return;
    setTenant({
      tenantId: t.id,
      tenantName: t.name,
      config: t.config,
      isAdmin: true,
      businessType: t.business_type,
    });
    // Set a cookie with the tenant_id so server components can use it for RLS
    await setTenantCookies(t.id, t.name);
    setIsOpen(false);
    router.push("/dashboard");
    router.refresh();
  }

  if (collapsed) {
    return (
      <div className="flex justify-center border-b border-white/[0.06] px-2 py-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#00e5ff] shadow-[0_0_10px_rgba(0,229,255,0.15)] transition-all hover:border-cyan-400/40 hover:bg-white/[0.06]">
          <Building2 className="h-4 w-4" />
        </div>
      </div>
    );
  }

  // Vista para Tenant Admin: solo muestra su negocio sin opción a desplegar otros clientes
  if (!isAdmin) {
    return (
      <div className="relative border-b border-white/[0.06] px-3 py-2.5">
        <label className="mb-1.5 block text-[9px] font-semibold tracking-wider text-slate-400/70 uppercase">
          Tu Negocio
        </label>
        <div className="flex w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-left text-xs">
          <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-[#00e5ff]" />
          <span className="flex-1 truncate font-medium text-slate-200">
            {tenantName || (loading ? "Cargando..." : "Mi Negocio")}
          </span>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-emerald-400 uppercase">
            Activo
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-b border-white/[0.06] px-3 py-2.5">
      <label className="mb-1.5 block text-[9px] font-semibold tracking-wider text-slate-400/70 uppercase">
        Cliente Activo
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-left text-xs transition-all duration-200 hover:border-cyan-400/35 hover:bg-white/[0.06]"
      >
        {(() => {
          const activeTenantObj = tenants.find((t) => t.name === tenantName);
          const logo = (activeTenantObj?.config as Record<string, unknown>)?.logo_url as
            | string
            | undefined;
          if (logo) {
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-4 w-4 flex-shrink-0 rounded-sm object-contain" />
            );
          }
          return <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-[#00e5ff]" />;
        })()}
        <span className="flex-1 truncate font-medium text-slate-200">
          {tenantName || (loading ? "Cargando..." : "Seleccionar...")}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180 text-cyan-400"
          )}
        />
      </button>

      {isOpen && (
        <div className="custom-scrollbar absolute right-2 left-2 z-50 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-white/[0.12] bg-[#070c1d]/95 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(0,229,255,0.1)] backdrop-blur-2xl">
          <div className="space-y-0.5">
            {tenants.map((t) => {
              const logo = (t.config as Record<string, unknown>)?.logo_url as string | undefined;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition",
                    tenantName === t.name
                      ? "border border-cyan-400/30 bg-[rgba(0,229,255,0.12)] font-semibold text-[#00e5ff]"
                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt=""
                      className="h-4 w-4 flex-shrink-0 rounded-sm object-contain"
                    />
                  ) : (
                    <Building2 className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                  )}
                  <span className="flex-1 truncate">{t.name}</span>
                  {tenantName === t.name && <Check className="h-3.5 w-3.5 text-[#00e5ff]" />}
                </button>
              );
            })}
          </div>
          {isAdmin && (
            <div className="mt-1 border-t border-white/[0.08] pt-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/dashboard/settings");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-[#00e5ff] transition hover:bg-white/[0.06]"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar nuevo cliente
              </button>
            </div>
          )}
          {tenants.length === 0 && !loading && (
            <div className="px-3 py-2 text-xs font-medium text-slate-400 italic">
              No hay clientes configurados
            </div>
          )}
        </div>
      )}
    </div>
  );
}
