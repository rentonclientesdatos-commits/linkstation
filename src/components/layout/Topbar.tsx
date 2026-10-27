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
    <header
      className="relative z-[50] flex h-14 shrink-0 items-center justify-between px-4 transition-all duration-300 md:h-[52px] md:px-5"
      style={{
        background: "rgba(3, 7, 18, 0.7)",
        backdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid rgba(0, 229, 255, 0.07)",
        boxShadow: "0 1px 0 rgba(0,229,255,0.04), 0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      {/* Subtle neon top border glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.3)] to-transparent" />

      {/* Left: Hamburger (mobile) + Title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-white/5 hover:text-slate-300 lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex flex-col">
          <h1
            className="text-xs leading-tight font-bold tracking-[0.1em] uppercase md:text-sm"
            style={{ color: "#e2e8f0" }}
          >
            {(config?.dashboard_title as string) || title}
          </h1>
          {tenantName && (
            <span
              className="mt-0.5 text-[9px] leading-none font-bold tracking-[0.2em] uppercase"
              style={{
                color: "#00e5ff",
                textShadow: "0 0 8px rgba(0, 229, 255, 0.5)",
              }}
            >
              {tenantName}
            </span>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        {/* Restaurant Role Quick Switcher — neon pill style */}
        {isRestaurant && (
          <div
            className="hidden sm:flex items-center gap-0.5 p-1 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(0,229,255,0.08)",
            }}
          >
            <span className="text-[9px] font-bold text-slate-600 px-2 uppercase tracking-widest hidden md:inline">
              Turno:
            </span>

            {/* Admin */}
            <button
              type="button"
              onClick={() => setRestaurantRole("admin")}
              title="Vista Dueño / Administrador"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
              style={
                currentRole === "admin"
                  ? {
                      background: "rgba(0,229,255,0.12)",
                      color: "#00e5ff",
                      border: "1px solid rgba(0,229,255,0.2)",
                      boxShadow: "0 0 10px rgba(0,229,255,0.12)",
                    }
                  : { color: "#4b5563", border: "1px solid transparent" }
              }
            >
              👑 Admin
            </button>

            {/* Mesero */}
            <button
              type="button"
              onClick={() => setRestaurantRole("mesero")}
              title="Vista Mesero"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
              style={
                currentRole === "mesero"
                  ? {
                      background: "rgba(16,185,129,0.15)",
                      color: "#10b981",
                      border: "1px solid rgba(16,185,129,0.25)",
                      boxShadow: "0 0 10px rgba(16,185,129,0.12)",
                    }
                  : { color: "#4b5563", border: "1px solid transparent" }
              }
            >
              🍽️ Mesero
            </button>

            {/* Caja */}
            <button
              type="button"
              onClick={() => setRestaurantRole("cajero")}
              title="Vista Caja"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
              style={
                currentRole === "cajero"
                  ? {
                      background: "rgba(245,158,11,0.15)",
                      color: "#f59e0b",
                      border: "1px solid rgba(245,158,11,0.25)",
                      boxShadow: "0 0 10px rgba(245,158,11,0.12)",
                    }
                  : { color: "#4b5563", border: "1px solid transparent" }
              }
            >
              💼 Caja
            </button>

            {/* Cocina */}
            <button
              type="button"
              onClick={() => setRestaurantRole("cocina")}
              title="Vista Cocina / KDS"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
              style={
                currentRole === "cocina"
                  ? {
                      background: "rgba(255,45,85,0.15)",
                      color: "#ff2d55",
                      border: "1px solid rgba(255,45,85,0.25)",
                      boxShadow: "0 0 10px rgba(255,45,85,0.12)",
                    }
                  : { color: "#4b5563", border: "1px solid transparent" }
              }
            >
              👨‍🍳 Cocina
            </button>
          </div>
        )}

        <ThemeToggle />

        {/* Separator */}
        <div className="mx-0.5 h-5 w-px bg-[rgba(255,255,255,0.06)]" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-500 transition-all hover:bg-[rgba(255,45,85,0.08)] hover:text-[#ff2d55] md:px-2.5"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline tracking-wide">Salir</span>
        </button>
      </div>
    </header>
  );
}
