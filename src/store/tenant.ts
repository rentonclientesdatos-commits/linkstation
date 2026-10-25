import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { TenantConfig } from "@/types/tenant";

interface TenantState extends TenantConfig {
  isConfigured: boolean;
  setTenant: (config: TenantConfig) => void;
  setRestaurantRole: (role: "admin" | "mesero" | "cajero" | "cocina") => void;
  clearTenant: () => void;
}

const DEFAULT_STATE: TenantConfig = {
  tenantId: "",
  tenantName: "",
  config: {},
  isAdmin: false,
  restaurantRole: "admin",
};

/**
 * Zustand store for multi-tenant configuration.
 * Persists to sessionStorage so credentials clear on tab close.
 * In the V2 centralized SaaS model, we only need tenantId + tenantName.
 * All DB access uses the central Supabase instance with RLS enforcing isolation.
 */
export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      isConfigured: false,

      setTenant: (config) =>
        set({
          ...config,
          restaurantRole:
            config.restaurantRole ||
            ((config.config as Record<string, unknown>)?.restaurant_role as "admin" | "mesero" | "cajero" | "cocina") ||
            "admin",
          isConfigured: !!config.tenantId,
        }),

      setRestaurantRole: (role) =>
        set((state) => ({
          ...state,
          restaurantRole: role,
          config: {
            ...((state.config as Record<string, unknown>) || {}),
            restaurant_role: role,
          },
        })),

      clearTenant: () => set({ ...DEFAULT_STATE, isConfigured: false }),
    }),
    {
      name: "linkstation-tenant",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
