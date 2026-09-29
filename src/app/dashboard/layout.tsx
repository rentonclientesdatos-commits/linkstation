import { ReactNode, Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getAdminStatus } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let isAdmin = false;
  try {
    isAdmin = await getAdminStatus();
  } catch (e) {
    console.error("[DashboardLayout] getAdminStatus error:", e);
    // fail-safe: si no podemos determinar el status, asumimos no-admin
    isAdmin = false;
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f1f5f9]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      }
    >
      <DashboardShell isAdmin={isAdmin}>{children}</DashboardShell>
    </Suspense>
  );
}
