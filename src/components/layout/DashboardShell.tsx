"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useTenantStore } from "@/store/tenant";
import { Tenant } from "@/types/tenant";

export function DashboardShell({
  isAdmin,
  isSuperAdmin,
  activeTenant,
  children,
}: {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  activeTenant?: Tenant | null;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const setTenant = useTenantStore((s) => s.setTenant);
  const currentTenantId = useTenantStore((s) => s.tenantId);

  // Sincronizar SIEMPRE el tenant verificado por el servidor con el store del cliente
  useEffect(() => {
    if (activeTenant && activeTenant.id !== currentTenantId) {
      setTenant({
        tenantId: activeTenant.id,
        tenantName: activeTenant.name,
        config: activeTenant.config,
        isAdmin,
        businessType: activeTenant.business_type,
      });
    }
  }, [activeTenant, currentTenantId, isAdmin, setTenant]);

  return (
    <div
      className="flex h-screen overflow-hidden transition-all duration-500"
      style={{ background: "#030712" }}
    >
      <Sidebar
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar title="Panel General" onMenuClick={() => setMobileOpen(true)} />
        {/* Sprint 3 SP-4-WCAG-10: id="main-content" target del skip-link. tabIndex=-1 permite que el foco lo reciba programáticamente. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 pb-24 focus:outline-none md:p-5 md:pb-6 custom-scrollbar"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 10% 0%, rgba(0,229,255,0.025) 0%, transparent 60%), " +
              "radial-gradient(ellipse 50% 40% at 90% 100%, rgba(139,92,246,0.03) 0%, transparent 60%)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
