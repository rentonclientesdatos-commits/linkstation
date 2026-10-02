"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function DashboardShell({
  isAdmin,
  isSuperAdmin,
  children,
}: {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-background text-foreground flex h-screen overflow-hidden transition-all duration-500">
      <Sidebar
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="bg-background flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-500">
        <Topbar title="Panel General" onMenuClick={() => setMobileOpen(true)} />
        {/* Sprint 3 SP-4-WCAG-10: id="main-content" target del skip-link. tabIndex=-1 permite que el foco lo reciba programáticamente. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 pb-24 focus:outline-none md:p-6 md:pb-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
