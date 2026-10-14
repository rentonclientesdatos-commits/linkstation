"use client";

import { useTenantStore } from "@/store/tenant";
import { logoutAction } from "@/lib/actions/auth";
import { Menu, LogOut } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface TopbarProps {
  title: string;
  onMenuClick?: () => void;
}

export function Topbar({ title, onMenuClick }: TopbarProps) {
  const { tenantName, config } = useTenantStore();

  async function handleLogout() {
    try {
      useTenantStore.getState().clearTenant();
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("linkstation-tenant");
      }
      await logoutAction();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <header className="border-border bg-card/80 relative z-[50] flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur-md transition-all duration-500 md:h-16 md:px-6">
      {/* Left: Hamburger (mobile) + Title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="text-muted-foreground hover:bg-card flex h-9 w-9 items-center justify-center rounded-xl transition-all lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-foreground text-sm leading-tight font-black tracking-tight uppercase md:text-base">
            {(config?.dashboard_title as string) || title}
          </h1>
          {tenantName && (
            <span className="text-primary mt-0.5 text-[10px] leading-none font-bold tracking-widest uppercase">
              {tenantName}
            </span>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="bg-border mx-1 h-6 w-px" />
        <button
          onClick={handleLogout}
          className="text-muted-foreground flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold transition hover:bg-red-500/10 hover:text-red-500 md:px-3"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}
