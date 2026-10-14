import { ReactNode, Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getAdminStatus, getSuperAdminStatus } from "@/lib/actions/auth";
import { getActiveTenantConfig } from "@/lib/actions/tenant";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let isAdmin = false;
  let isSuperAdmin = false;
  let activeTenant = null;
  try {
    isAdmin = await getAdminStatus();
    isSuperAdmin = await getSuperAdminStatus();
    activeTenant = await getActiveTenantConfig();
  } catch (e) {
    console.error("[DashboardLayout] auth status error:", e);
    isAdmin = false;
    isSuperAdmin = false;
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f1f5f9]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      }
    >
      <DashboardShell
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        activeTenant={activeTenant}
      >
        {children}
      </DashboardShell>
    </Suspense>
  );
}
