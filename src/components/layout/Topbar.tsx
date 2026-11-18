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
  const { tenantName, config, businessType: storeBusinessType, restaurantRole, setRestaurantRole } = useTenantStore();
  const businessType =
    ((config as Record<string, unknown>)?.business_type as string | undefined) ||
    storeBusinessType;
  const isRestaurant =
    !businessType || businessType === "restaurant" || businessType === "restaurante";

  const currentRole = restaurantRole || ((config as Record<string, unknown>)?.restaurant_role as "admin" | "mesero" | "cajero") || "admin";

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
    <header className="relative z-[50] flex h-14 shrink-0 items-center justify-between border-b border-[#1e2027] bg-[#0d0e12] px-4 transition-all duration-200 md:h-[52px] md:px-5">
      {/* Left: Hamburger (mobile) + Title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8a8f9d] transition-all hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <h1 className="text-xs font-semibold tracking-tight text-white md:text-sm">
            {(config?.dashboard_title as string) || title}
          </h1>
          {tenantName && (
            <span className="rounded-md border border-[#272935] bg-[#171820] px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-300">
              {tenantName}
            </span>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        {/* Restaurant Role Quick Switcher */}
        {isRestaurant && (
          <div className="hidden sm:flex items-center gap-0.5 rounded-xl border border-[#23252e] bg-[#121317] p-1">
            <span className="px-2 text-[9px] font-semibold text-[#8a8f9d] uppercase tracking-wider hidden md:inline">
              Turno:
            </span>

            {/* Admin */}
            <button
              type="button"
              onClick={() => setRestaurantRole("admin")}
              title="Vista Dueño / Administrador"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                currentRole === "admin"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-[#8a8f9d] hover:text-white"
              }`}
            >
              Admin
            </button>

            {/* Mesero */}
            <button
              type="button"
              onClick={() => setRestaurantRole("mesero")}
              title="Vista Mesero"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                currentRole === "mesero"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-[#8a8f9d] hover:text-white"
              }`}
            >
              Mesero
            </button>

            {/* Caja */}
            <button
              type="button"
              onClick={() => setRestaurantRole("cajero")}
              title="Vista Caja"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                currentRole === "cajero"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-[#8a8f9d] hover:text-white"
              }`}
            >
              Caja
            </button>

            {/* Cocina */}
            <button
              type="button"
              onClick={() => setRestaurantRole("cocina")}
              title="Vista Cocina / KDS"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                currentRole === "cocina"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-[#8a8f9d] hover:text-white"
              }`}
            >
              Cocina
            </button>
          </div>
        )}

        <ThemeToggle />

        {/* Separator */}
        <div className="mx-1 h-4 w-px bg-[#23252e]" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#8a8f9d] transition-all hover:bg-red-500/10 hover:text-red-400"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
