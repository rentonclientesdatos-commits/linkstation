import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { TenantConfig } from "@/types/tenant";

interface TenantState extends TenantConfig {
  isConfigured: boolean;
  setTenant: (config: TenantConfig) => void;
  clearTenant: () => void;
}

const DEFAULT_STATE: TenantConfig = {
  tenantId: "",
  tenantName: "",
  config: {},
  isAdmin: false,
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
          isConfigured: !!config.tenantId,
        }),

      clearTenant: () => set({ ...DEFAULT_STATE, isConfigured: false }),
    }),
    {
      name: "linkstation-tenant",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
