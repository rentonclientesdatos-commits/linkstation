/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { getTenants, createTenant, updateTenant, deleteTenant } from "@/lib/actions/tenant";
import { useTenantStore } from "@/store/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Shield,
  Globe,
  Building2,
  Zap,
  ChevronDown,
  Utensils,
  Briefcase,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tenant } from "@/types/tenant";
import { SYSTEM_MODULES } from "@/types/tenant";
import { toast } from "@/components/ui/toast";
import { KpiBuilder } from "./KpiBuilder";
import { IntegrationsManager } from "./IntegrationsManager";
import { LogoUploader } from "@/components/settings/LogoUploader";
import { getSuperAdminStatus } from "@/lib/actions/auth";

export default function SettingsPage() {
  const { setTenant: setActiveTenant } = useTenantStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<
    Partial<Tenant> & {
      password?: string;
      api_type?: "internal" | "client";
      business_type?: string;
    }
  >({
    name: "",
    username: "",
    client_email: "",
    password: "",
    supabase_url: "",
    supabase_anon_key: "",
    api_type: "internal" as "internal" | "client",
    is_admin: false,
    business_type: "restaurant",
    config: {},
  });
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    getSuperAdminStatus().then((superAdmin) => {
      setIsSuperAdmin(superAdmin);
      if (superAdmin) {
        loadTenants();
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function loadTenants() {
    setLoading(true);
    const data = await getTenants();
    setTenants(data);
    setLoading(false);
  }

  async function handleSaveNew(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedConfig =
        typeof editForm.config === "string"
          ? JSON.parse(editForm.config || "{}")
          : editForm.config || {};
      const configObj = {
        ...parsedConfig,
        business_type: editForm.business_type || "restaurant",
      };
      const result = await createTenant({
        ...editForm,
        config: configObj,
        business_type: editForm.business_type || "restaurant",
      });

      if (result.error) {
        toast({ variant: "error", title: "Error al crear cliente", description: result.error });
        return;
      }

      setShowNewForm(false);
      setEditForm({
        name: "",
        username: "",
        client_email: "",
        password: "",
        is_admin: false,
        business_type: "restaurant",
        config: {},
        api_type: "internal",
        supabase_url: "",
        supabase_anon_key: "",
      });
      await loadTenants();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast({ variant: "error", title: "Error crítico", description: msg });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    try {
      const parsedConfig =
        typeof editForm.config === "string"
          ? JSON.parse(editForm.config || "{}")
          : editForm.config || {};
      const configObj = {
        ...parsedConfig,
        business_type: editForm.business_type || "restaurant",
      };
      const tenantObj = tenants.find((t) => t.id === id);

      const result = await updateTenant(id, {
        ...editForm,
        config: configObj,
        business_type: editForm.business_type || "restaurant",
        auth_user_id: tenantObj?.auth_user_id,
      });

      if (result.error) {
        toast({
          variant: "error",
          title: "Error al actualizar cliente",
          description: result.error,
        });
        return;
      }

      setIsEditing(null);
      loadTenants();

      // Update the active store if this is the currently active client
      if (result.data) {
        const updated = result.data;
        const configToStore =
          typeof updated.config === "string" ? JSON.parse(updated.config) : updated.config;
        setActiveTenant({
          tenantId: updated.id,
          tenantName: updated.name || "",
          config: configToStore || {},
          isAdmin: !!updated.is_admin,
          businessType: updated.business_type,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast({ variant: "error", title: "Error crítico", description: msg });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar este cliente?")) return;
    try {
      await deleteTenant(id);
      loadTenants();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast({ variant: "error", title: "Error al eliminar cliente", description: msg });
    }
  }

  function startEdit(t: Tenant) {
    setIsEditing(t.id);
    setEditForm({
      name: t.name,
      username: t.username || "",
      client_email: t.client_email || "",
      password: "",
      is_admin: !!t.is_admin,
      supabase_url: t.supabase_url || "",
      supabase_anon_key: t.supabase_anon_key || "",
      api_type: t.supabase_url ? "client" : "internal",
      business_type:
        ((t.config as Record<string, unknown>)?.business_type as string) ||
        t.business_type ||
        "restaurant",
      config: t.config as Record<string, unknown>,
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Configuración de Clientes
        </h1>
        <p className="mt-2 text-base font-medium text-slate-500">
          Gestiona los clientes del sistema centralizado. Cada cliente tiene su propio espacio de
          datos aislado por Row Level Security.
        </p>
      </div>

      {/* Clients List - Exclusivo para Renton Super Admin */}
      {isSuperAdmin && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
          <h2 className="text-lg text-[11px] font-bold tracking-widest text-slate-700 uppercase dark:text-slate-300">
            Clientes Activos
          </h2>
          {!showNewForm && (
            <Button
              onClick={() => {
                setShowNewForm(true);
                setEditForm({
                  name: "",
                  username: "",
                  client_email: "",
                  password: "",
                  is_admin: false,
                  business_type: "restaurant",
                  config: {},
                  api_type: "internal",
                  supabase_url: "",
                  supabase_anon_key: "",
                });
              }}
              title="Añadir nuevo cliente"
              aria-label="Añadir nuevo cliente"
              className="rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-900 uppercase dark:text-slate-200">
                  Cliente
                </th>
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-900 uppercase dark:text-slate-200">
                  Infraestructura
                </th>
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-900 uppercase dark:text-slate-200">
                  Email de Acceso
                </th>
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-900 uppercase dark:text-slate-200">
                  Tipo Negocio
                </th>
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-900 uppercase dark:text-slate-200">
                  Nivel
                </th>
                <th className="px-6 py-4 pr-8 text-right text-[10px] font-black tracking-widest text-slate-900 uppercase dark:text-slate-200">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="animate-pulse px-6 py-12 text-center font-bold text-slate-400"
                  >
                    Sincronizando infraestructura...
                  </td>
                </tr>
              )}

              {!loading && tenants.length === 0 && !showNewForm && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center font-bold text-slate-400">
                    <Globe className="mx-auto mb-4 h-12 w-12 text-slate-100" />
                    No se han detectado clientes configurados.
                  </td>
                </tr>
              )}

              {/* New Tenant Form */}
              {showNewForm && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <div className="animate-in slide-in-from-top border-b border-blue-100 bg-blue-50/30 p-8 duration-300">
                      <form onSubmit={handleSaveNew} className="space-y-6">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="flex items-center gap-2 text-sm font-black tracking-widest text-blue-600 uppercase">
                            Configurar Nuevo Entorno
                          </h3>
                          <div className="flex items-center gap-3">
                            {/* Role Toggle for New Form */}
                            <button
                              type="button"
                              onClick={() =>
                                setEditForm({ ...editForm, is_admin: !editForm.is_admin })
                              }
                              className={cn(
                                "flex h-9 items-center gap-2 rounded-xl border px-3 text-[10px] font-black tracking-widest uppercase shadow-sm transition-all",
                                editForm.is_admin
                                  ? "border-blue-600 bg-blue-600 text-white shadow-blue-500/20"
                                  : "border-slate-200 bg-white text-slate-400"
                              )}
                              title="Cambiar rol (Admin / Cliente)"
                            >
                              {editForm.is_admin ? (
                                <>
                                  <Shield className="h-3 w-3" /> Admin
                                </>
                              ) : (
                                <>
                                  <Building2 className="h-3 w-3" /> Cliente
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowNewForm(false)}
                              title="Cerrar formulario"
                              aria-label="Cerrar formulario de nuevo cliente"
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 shadow-sm transition-all hover:text-red-500"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-[11px] font-black tracking-[0.1em] text-slate-500 uppercase">
                              Nombre del Proyecto
                            </Label>
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="h-12 rounded-xl bg-white focus:ring-blue-100"
                              placeholder="Ej: Proyecto México"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[11px] font-black tracking-[0.1em] text-slate-500 uppercase">
                              Nombre de Usuario
                            </Label>
                            <Input
                              value={editForm.username}
                              onChange={(e) =>
                                setEditForm({ ...editForm, username: e.target.value })
                              }
                              className="h-12 rounded-xl bg-white focus:ring-blue-100"
                              placeholder="Ej: juan.perez"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[11px] font-black tracking-[0.1em] text-slate-500 uppercase">
                              Email de Acceso
                            </Label>
                            <Input
                              value={editForm.client_email}
                              onChange={(e) =>
                                setEditForm({ ...editForm, client_email: e.target.value })
                              }
                              className="h-12 rounded-xl bg-white focus:ring-blue-100"
                              placeholder="cliente@ejemplo.com"
                              type="email"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[11px] font-black tracking-[0.1em] text-slate-500 uppercase">
                              Contraseña
                            </Label>
                            <Input
                              value={editForm.password}
                              onChange={(e) =>
                                setEditForm({ ...editForm, password: e.target.value })
                              }
                              className="h-12 rounded-xl bg-white focus:ring-blue-100"
                              placeholder="••••••••"
                              type="password"
                              required={!isEditing}
                            />
                          </div>

                          {/* Business Type Selector */}
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-[11px] font-black tracking-[0.1em] text-slate-500 uppercase">
                              Tipo de Negocio / Industria
                            </Label>
                            <div className="relative">
                              <select
                                value={editForm.business_type || "restaurant"}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, business_type: e.target.value })
                                }
                                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-bold text-slate-800 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                              >
                                <option value="restaurant">
                                  🍽️ Restaurante (Mesas, Carta y Pedidos)
                                </option>
                                <option value="sales">💼 Ventas / Servicios (General)</option>
                                <option value="other">🏢 Otro Tipo de Negocio</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                                <ChevronDown className="h-4 w-4" />
                              </div>
                            </div>
                            <p className="text-[10px] font-medium text-slate-400">
                              {editForm.business_type === "restaurant"
                                ? "Activa la sección de Pedidos & Mesas y adapta los agentes con protocolo de reservas y carta de platos."
                                : "Oculta la sección de Pedidos & Mesas. Adapta los agentes para cualificación y agendamiento general de ventas."}
                            </p>
                          </div>

                          {/* Custom Logo Uploader */}
                          <div className="rounded-2xl border border-blue-100 bg-white/80 p-5 shadow-sm md:col-span-2 dark:border-slate-800 dark:bg-slate-900">
                            <LogoUploader
                              value={(() => {
                                try {
                                  const conf =
                                    typeof editForm.config === "string"
                                      ? JSON.parse(editForm.config || "{}")
                                      : editForm.config || {};
                                  return (conf as Record<string, any>).logo_url || "";
                                } catch {
                                  return "";
                                }
                              })()}
                              businessType={editForm.business_type}
                              businessName={editForm.name}
                              onChange={(logoUrl) => {
                                const current =
                                  typeof editForm.config === "string"
                                    ? JSON.parse(editForm.config || "{}")
                                    : editForm.config || {};
                                setEditForm({
                                  ...editForm,
                                  config: { ...current, logo_url: logoUrl },
                                });
                              }}
                            />
                          </div>

                          {/* ── MÓDULOS VISIBLES (Para Nuevo Cliente) ── */}
                          {!(
                            (editForm.name && editForm.name.toUpperCase().includes("RENTON")) ||
                            (editForm.username && editForm.username.toLowerCase() === "renton")
                          ) && (
                            <div className="space-y-4 md:col-span-2">
                              <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-6 shadow-sm dark:border-violet-900/30 dark:bg-violet-900/10">
                                <div className="mb-4 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                    <h3 className="text-sm font-black tracking-tight text-violet-700 uppercase dark:text-violet-300">
                                      Módulos Visibles para este Cliente
                                    </h3>
                                  </div>
                                  <span className="rounded-full bg-violet-200/60 px-2.5 py-0.5 text-[9px] font-black tracking-widest text-violet-800 uppercase dark:bg-violet-800/40 dark:text-violet-300">
                                    Control Super Admin
                                  </span>
                                </div>
                                <p className="mb-4 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                  Define qué secciones del menú lateral podrá ver este usuario o empresa cliente.
                                  Los módulos desactivados no aparecerán en su Sidebar.
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {SYSTEM_MODULES.map((mod) => {
                                    const currentModules = (() => {
                                      try {
                                        const conf =
                                          typeof editForm.config === "string"
                                            ? JSON.parse(editForm.config || "{}")
                                            : editForm.config || {};
                                        const vm = (conf as Record<string, unknown>).visible_modules;
                                        if (Array.isArray(vm)) return vm as string[];
                                        return SYSTEM_MODULES.filter((m) => m.defaultEnabled).map(
                                          (m) => m.id
                                        );
                                      } catch {
                                        return SYSTEM_MODULES.filter((m) => m.defaultEnabled).map(
                                          (m) => m.id
                                        );
                                      }
                                    })();
                                    const isEnabled = currentModules.includes(mod.id);
                                    return (
                                      <label
                                        key={mod.id}
                                        className={cn(
                                          "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all duration-150 hover:shadow-sm",
                                          isEnabled
                                            ? "border-violet-300 bg-violet-50 dark:border-violet-700/50 dark:bg-violet-900/20"
                                            : "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950 opacity-60"
                                        )}
                                      >
                                        <div className="relative mt-0.5 flex-shrink-0">
                                          <input
                                            type="checkbox"
                                            checked={isEnabled}
                                            onChange={() => {
                                              const newModules = isEnabled
                                                ? currentModules.filter((m) => m !== mod.id)
                                                : [...currentModules, mod.id];
                                              const current =
                                                typeof editForm.config === "string"
                                                  ? JSON.parse(editForm.config || "{}")
                                                  : editForm.config || {};
                                              setEditForm({
                                                ...editForm,
                                                config: { ...current, visible_modules: newModules },
                                              });
                                            }}
                                            className="sr-only"
                                          />
                                          <div
                                            className={cn(
                                              "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all",
                                              isEnabled
                                                ? "border-violet-500 bg-violet-500"
                                                : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
                                            )}
                                          >
                                            {isEnabled && (
                                              <Check
                                                className="h-3 w-3 text-white"
                                                strokeWidth={3}
                                              />
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p
                                            className={cn(
                                              "text-[11px] font-black tracking-tight",
                                              isEnabled
                                                ? "text-violet-700 dark:text-violet-300"
                                                : "text-slate-400"
                                            )}
                                          >
                                            {mod.label}
                                          </p>
                                          <p className="mt-0.5 text-[9px] text-slate-400 leading-tight">
                                            {mod.description}
                                          </p>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                                {/* Quick actions */}
                                <div className="mt-3 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current =
                                        typeof editForm.config === "string"
                                          ? JSON.parse(editForm.config || "{}")
                                          : editForm.config || {};
                                      setEditForm({
                                        ...editForm,
                                        config: {
                                          ...current,
                                          visible_modules: SYSTEM_MODULES.map((m) => m.id),
                                        },
                                      });
                                    }}
                                    className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-violet-600 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-400"
                                  >
                                    ✓ Activar todos
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current =
                                        typeof editForm.config === "string"
                                          ? JSON.parse(editForm.config || "{}")
                                          : editForm.config || {};
                                      setEditForm({
                                        ...editForm,
                                        config: { ...current, visible_modules: [] },
                                      });
                                    }}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-400 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                                  >
                                    × Desactivar todos
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* API Type Selector */}
                          {!editForm.is_admin && (
                            <div className="space-y-4 border-t border-blue-100/30 pt-4 md:col-span-2">
                              <Label className="text-[11px] font-black tracking-[0.1em] text-slate-500 uppercase">
                                Infraestructura de Datos
                              </Label>
                              <div className="flex gap-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditForm({
                                      ...editForm,
                                      api_type: "internal",
                                      supabase_url: "",
                                      supabase_anon_key: "",
                                    })
                                  }
                                  className={cn(
                                    "flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all",
                                    editForm.api_type === "internal"
                                      ? "border-blue-600 bg-blue-600/5 text-blue-600 shadow-lg shadow-blue-500/10"
                                      : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "flex h-8 w-8 items-center justify-center rounded-xl",
                                      editForm.api_type === "internal"
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-50 text-slate-300"
                                    )}
                                  >
                                    <Globe className="h-4 w-4" />
                                  </div>
                                  <span className="mt-1 text-center text-[10px] font-black tracking-widest uppercase">
                                    API Interna
                                    <br />
                                    (Centralizada)
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditForm({ ...editForm, api_type: "client" })}
                                  className={cn(
                                    "flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all",
                                    editForm.api_type === "client"
                                      ? "border-blue-600 bg-blue-600/5 text-blue-600 shadow-lg shadow-blue-500/10"
                                      : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "flex h-8 w-8 items-center justify-center rounded-xl",
                                      editForm.api_type === "client"
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-50 text-slate-300"
                                    )}
                                  >
                                    <Shield className="h-4 w-4" />
                                  </div>
                                  <span className="mt-1 text-center text-[10px] font-black tracking-widest uppercase">
                                    API del Cliente
                                    <br />
                                    (Supabase Externo)
                                  </span>
                                </button>
                              </div>

                              {editForm.api_type === "client" && (
                                <div className="animate-in fade-in grid grid-cols-1 gap-4 pt-4 duration-300 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label className="text-[11px] font-black tracking-[0.1em] text-blue-600 uppercase">
                                      Supabase URL
                                    </Label>
                                    <Input
                                      value={editForm.supabase_url}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, supabase_url: e.target.value })
                                      }
                                      className="h-11 border-blue-100 bg-white font-bold"
                                      placeholder="https://xyz.supabase.co"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[11px] font-black tracking-[0.1em] text-blue-600 uppercase">
                                      Anon Key
                                    </Label>
                                    <Input
                                      value={editForm.supabase_anon_key}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          supabase_anon_key: e.target.value,
                                        })
                                      }
                                      className="h-11 border-blue-100 bg-white font-bold"
                                      placeholder="eyJhb..."
                                      required
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Additional Config */}
                          {!editForm.is_admin && (
                            <div className="space-y-6 pt-4 md:col-span-2">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label className="text-[11px] font-black tracking-[0.1em] text-slate-500 uppercase">
                                    Título Dashboard
                                  </Label>
                                  <Input
                                    value={(() => {
                                      try {
                                        const conf =
                                          typeof editForm.config === "string"
                                            ? JSON.parse(editForm.config || "{}")
                                            : editForm.config || {};
                                        return (conf as Record<string, any>).dashboard_title || "";
                                      } catch {
                                        return "";
                                      }
                                    })()}
                                    onChange={(e) => {
                                      const current =
                                        typeof editForm.config === "string"
                                          ? JSON.parse(editForm.config || "{}")
                                          : editForm.config || {};
                                      setEditForm({
                                        ...editForm,
                                        config: { ...current, dashboard_title: e.target.value },
                                      });
                                    }}
                                    className="h-11 rounded-xl bg-white"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[11px] font-black tracking-[0.1em] text-slate-500 uppercase">
                                    Headers
                                  </Label>
                                  <Input
                                    value={(() => {
                                      try {
                                        const conf =
                                          typeof editForm.config === "string"
                                            ? JSON.parse(editForm.config || "{}")
                                            : editForm.config || {};
                                        return ((conf as Record<string, any>).headers || []).join(
                                          ", "
                                        );
                                      } catch {
                                        return "";
                                      }
                                    })()}
                                    onChange={(e) => {
                                      const current =
                                        typeof editForm.config === "string"
                                          ? JSON.parse(editForm.config || "{}")
                                          : editForm.config || {};
                                      const headers = e.target.value
                                        .split(",")
                                        .map((s: string) => s.trim())
                                        .filter((s: string) => s !== "");
                                      setEditForm({ ...editForm, config: { ...current, headers } });
                                    }}
                                    className="h-11 rounded-xl bg-white"
                                  />
                                </div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <KpiBuilder
                                  kpis={(editForm.config as Record<string, any>)?.kpis || []}
                                  onChange={(kpis) => {
                                    const current = (editForm.config as Record<string, any>) || {};
                                    setEditForm({ ...editForm, config: { ...current, kpis } });
                                  }}
                                />
                              </div>

                              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <h3 className="mb-6 flex items-center gap-2 text-sm font-black tracking-tight text-slate-900 uppercase dark:text-white">
                                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />{" "}
                                  Servidodes Externos e Integraciones
                                </h3>
                                <IntegrationsManager
                                  tenantId={isEditing || undefined}
                                  config={(editForm.config as Record<string, unknown>) || {}}
                                  onChange={(newConf) => {
                                    setEditForm({ ...editForm, config: newConf as any });
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3 pt-6">
                          <Button
                            type="submit"
                            disabled={saving}
                            className="h-12 rounded-xl bg-blue-600 px-8 font-black text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {saving ? "Desplegando..." : "Desplegar Cliente"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowNewForm(false)}
                            className="h-12 rounded-xl font-bold text-slate-400 hover:bg-slate-100"
                          >
                            Descartar
                          </Button>
                        </div>
                      </form>
                    </div>
                  </td>
                </tr>
              )}

              {tenants.map((t) => (
                <tr
                  key={t.id}
                  className={cn(
                    "transition-all duration-300",
                    isEditing === t.id ? "bg-blue-50/50" : "hover:bg-slate-50/50"
                  )}
                >
                  {isEditing === t.id ? (
                    <td colSpan={6} className="p-8">
                      <div className="mb-8 flex items-center justify-between gap-6">
                        <h3 className="flex items-center gap-2 text-sm font-black tracking-widest text-slate-900 uppercase dark:text-white">
                          <Edit2 className="h-4 w-4 text-blue-600" /> Editando:{" "}
                          <span className="text-blue-600">{t.name}</span>
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditForm({ ...editForm, is_admin: !editForm.is_admin })
                            }
                            className={cn(
                              "flex h-8 items-center gap-2 rounded-lg border px-3 text-[10px] font-black tracking-widest uppercase shadow-sm transition-all",
                              editForm.is_admin
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-400"
                            )}
                          >
                            {editForm.is_admin ? "Admin" : "Cliente"}
                          </button>
                          <button
                            onClick={() => handleUpdate(t.id)}
                            className="flex h-8 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-[10px] font-bold tracking-widest text-white uppercase shadow-lg transition-all hover:bg-emerald-700"
                          >
                            <Check className="h-3 w-3" /> Guardar
                          </button>
                          <button
                            onClick={() => setIsEditing(null)}
                            className="flex h-8 items-center gap-2 rounded-lg border border-slate-100 bg-white px-4 text-[10px] font-bold tracking-widest text-slate-400 uppercase transition-all hover:bg-slate-50"
                          >
                            <X className="h-3 w-3" /> Cancelar
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                            Nombre del Proyecto
                          </Label>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="h-11 border-slate-200 bg-white font-bold dark:border-slate-800 dark:bg-slate-950"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                            Usuario
                          </Label>
                          <Input
                            value={editForm.username}
                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                            className="h-11 border-slate-200 bg-white font-bold dark:border-slate-800 dark:bg-slate-950"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                            Email
                          </Label>
                          <Input
                            value={editForm.client_email}
                            onChange={(e) =>
                              setEditForm({ ...editForm, client_email: e.target.value })
                            }
                            className="h-11 border-slate-200 bg-white font-bold dark:border-slate-800 dark:bg-slate-950"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                            Pass
                          </Label>
                          <Input
                            value={editForm.password}
                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                            className="h-11 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                            type="password"
                            placeholder="Opcional"
                          />
                        </div>

                        {/* Business Type Selector for Edit */}
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                            Tipo de Negocio / Industria
                          </Label>
                          <div className="relative">
                            <select
                              value={editForm.business_type || "restaurant"}
                              onChange={(e) =>
                                setEditForm({ ...editForm, business_type: e.target.value })
                              }
                              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-bold text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                            >
                              <option value="restaurant">
                                🍽️ Restaurante (Mesas, Carta y Pedidos)
                              </option>
                              <option value="sales">💼 Ventas / Servicios / General</option>
                              <option value="other">🏢 Otro Tipo de Negocio</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                              <ChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                          <p className="text-[10px] font-medium text-slate-400">
                            {editForm.business_type === "restaurant"
                              ? "Habilita la sección de Pedidos & Mesas en el dashboard y en los agentes."
                              : "Oculta la sección de Pedidos & Mesas para este cliente."}
                          </p>
                        </div>

                        {/* Custom Logo Uploader for Edit */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2 dark:border-slate-800 dark:bg-slate-900">
                          <LogoUploader
                            value={(() => {
                              try {
                                const conf =
                                  typeof editForm.config === "string"
                                    ? JSON.parse(editForm.config || "{}")
                                    : editForm.config || {};
                                return (conf as Record<string, any>).logo_url || "";
                              } catch {
                                return "";
                              }
                            })()}
                            businessType={editForm.business_type}
                            businessName={editForm.name}
                            onChange={(logoUrl) => {
                              const current =
                                typeof editForm.config === "string"
                                  ? JSON.parse(editForm.config || "{}")
                                  : editForm.config || {};
                              setEditForm({
                                ...editForm,
                                config: { ...current, logo_url: logoUrl },
                              });
                            }}
                          />
                        </div>

                        {/* ── MÓDULOS VISIBLES (Control Super Admin para cualquier cliente) ── */}
                        {!(
                          (editForm.name && editForm.name.toUpperCase().includes("RENTON")) ||
                          (editForm.username && editForm.username.toLowerCase() === "renton")
                        ) && (
                          <div className="space-y-4 md:col-span-2">
                            <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-6 shadow-sm dark:border-violet-900/30 dark:bg-violet-900/10">
                              <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <LayoutGrid className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                  <h3 className="text-sm font-black tracking-tight text-violet-700 uppercase dark:text-violet-300">
                                    Módulos Visibles para este Cliente
                                  </h3>
                                </div>
                                <span className="rounded-full bg-violet-200/60 px-2.5 py-0.5 text-[9px] font-black tracking-widest text-violet-800 uppercase dark:bg-violet-800/40 dark:text-violet-300">
                                  Control Super Admin
                                </span>
                              </div>
                              <p className="mb-4 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                Selecciona qué secciones del menú lateral puede ver este usuario. Aunque tenga rol de Admin en su empresa, sus accesos estarán restringidos a los módulos activos aquí.
                              </p>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {SYSTEM_MODULES.map((mod) => {
                                  const currentModules = (() => {
                                    try {
                                      const conf =
                                        typeof editForm.config === "string"
                                          ? JSON.parse(editForm.config || "{}")
                                          : editForm.config || {};
                                      const vm = (conf as Record<string, unknown>).visible_modules;
                                      if (Array.isArray(vm)) return vm as string[];
                                      // Si no existe, todos enabled por defecto
                                      return SYSTEM_MODULES.filter(m => m.defaultEnabled).map(m => m.id);
                                    } catch {
                                      return SYSTEM_MODULES.filter(m => m.defaultEnabled).map(m => m.id);
                                    }
                                  })();
                                  const isEnabled = currentModules.includes(mod.id);
                                  return (
                                    <label
                                      key={mod.id}
                                      className={cn(
                                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all duration-150 hover:shadow-sm",
                                        isEnabled
                                          ? "border-violet-300 bg-violet-50 dark:border-violet-700/50 dark:bg-violet-900/20"
                                          : "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950 opacity-60"
                                      )}
                                    >
                                      <div className="relative mt-0.5 flex-shrink-0">
                                        <input
                                          type="checkbox"
                                          checked={isEnabled}
                                          onChange={() => {
                                            const newModules = isEnabled
                                              ? currentModules.filter((m) => m !== mod.id)
                                              : [...currentModules, mod.id];
                                            const current =
                                              typeof editForm.config === "string"
                                                ? JSON.parse(editForm.config || "{}")
                                                : editForm.config || {};
                                            setEditForm({
                                              ...editForm,
                                              config: { ...current, visible_modules: newModules },
                                            });
                                          }}
                                          className="sr-only"
                                        />
                                        <div
                                          className={cn(
                                            "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all",
                                            isEnabled
                                              ? "border-violet-500 bg-violet-500"
                                              : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
                                          )}
                                        >
                                          {isEnabled && (
                                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={cn(
                                          "text-[11px] font-black tracking-tight",
                                          isEnabled ? "text-violet-700 dark:text-violet-300" : "text-slate-400"
                                        )}>
                                          {mod.label}
                                        </p>
                                        <p className="mt-0.5 text-[9px] text-slate-400 leading-tight">
                                          {mod.description}
                                        </p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                              {/* Quick actions */}
                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current =
                                      typeof editForm.config === "string"
                                        ? JSON.parse(editForm.config || "{}")
                                        : editForm.config || {};
                                    setEditForm({
                                      ...editForm,
                                      config: { ...current, visible_modules: SYSTEM_MODULES.map(m => m.id) },
                                    });
                                  }}
                                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-violet-600 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-400"
                                >
                                  ✓ Activar todos
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current =
                                      typeof editForm.config === "string"
                                        ? JSON.parse(editForm.config || "{}")
                                        : editForm.config || {};
                                    setEditForm({
                                      ...editForm,
                                      config: { ...current, visible_modules: [] },
                                    });
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-400 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                                >
                                  × Desactivar todos
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {!editForm.is_admin && (
                          <div className="space-y-4 border-t border-slate-100 pt-4 md:col-span-2">
                            <Label className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                              Infraestructura
                            </Label>
                            <div className="flex gap-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditForm({
                                    ...editForm,
                                    api_type: "internal",
                                    supabase_url: "",
                                    supabase_anon_key: "",
                                  })
                                }
                                className={cn(
                                  "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border-2 text-[9px] font-black tracking-widest uppercase transition-all",
                                  editForm.api_type === "internal"
                                    ? "border-blue-600 bg-blue-600/5 text-blue-600"
                                    : "border-slate-100 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950"
                                )}
                              >
                                <Globe className="h-3 w-3" /> Interna
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditForm({ ...editForm, api_type: "client" })}
                                className={cn(
                                  "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border-2 text-[9px] font-black tracking-widest uppercase transition-all",
                                  editForm.api_type === "client"
                                    ? "border-blue-600 bg-blue-600/5 text-blue-600"
                                    : "border-slate-100 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950"
                                )}
                              >
                                <Shield className="h-3 w-3" /> Externa
                              </button>
                            </div>
                            {editForm.api_type === "client" && (
                              <div className="animate-in fade-in grid grid-cols-2 gap-4 duration-300">
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                                    URL
                                  </Label>
                                  <Input
                                    value={editForm.supabase_url}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, supabase_url: e.target.value })
                                    }
                                    className="h-10 border-blue-100 bg-white"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                                    Key
                                  </Label>
                                  <Input
                                    value={editForm.supabase_anon_key}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        supabase_anon_key: e.target.value,
                                      })
                                    }
                                    className="h-10 border-blue-100 bg-white"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {!editForm.is_admin && (
                        <div className="mt-6 space-y-6 border-t border-slate-100 pt-6 md:col-span-2">
                          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-inner">
                            <h3 className="mb-6 flex items-center gap-2 text-sm font-black tracking-tight text-slate-900 uppercase">
                              <Zap className="h-4 w-4 text-blue-600" /> Integraciones de Voz y
                              Mensajería
                            </h3>
                            <IntegrationsManager
                              tenantId={isEditing || undefined}
                              config={(editForm.config as Record<string, unknown>) || {}}
                              onChange={(newConf) => {
                                setEditForm({ ...editForm, config: newConf as any });
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            {((t.config as Record<string, unknown>)?.logo_url as
                              | string
                              | undefined) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={(t.config as Record<string, unknown>)?.logo_url as string}
                                alt={t.name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-50 text-blue-600 dark:bg-slate-800">
                                {((t.config as Record<string, unknown>)?.business_type ||
                                  t.business_type) === "restaurant" ? (
                                  <Utensils className="h-5 w-5 text-amber-600" />
                                ) : ((t.config as Record<string, unknown>)?.business_type ||
                                    t.business_type) === "sales" ? (
                                  <Briefcase className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <Building2 className="h-5 w-5 text-blue-600" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                              {t.name}
                            </span>
                            {t.username && (
                              <span className="text-[10px] text-slate-500">@{t.username}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold">
                        {t.is_admin ? (
                          <span className="flex items-center gap-1.5 tracking-widest text-blue-600 uppercase">
                            <Shield className="h-3 w-3" /> Sistema Central
                          </span>
                        ) : t.supabase_url ? (
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 tracking-widest text-emerald-600 uppercase">
                              <Globe className="h-3 w-3" /> API del Cliente
                            </span>
                            <span className="max-w-[120px] truncate font-mono text-[9px] text-slate-400">
                              {t.supabase_url}
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5 tracking-widest text-slate-400 uppercase">
                            <Globe className="h-3 w-3" /> API Interna
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {t.client_email || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {((t.config as Record<string, unknown>)?.business_type ||
                          t.business_type) === "sales" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700 uppercase dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <Briefcase className="h-3 w-3" /> Ventas
                          </span>
                        ) : ((t.config as Record<string, unknown>)?.business_type ||
                            t.business_type) === "other" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-700 uppercase dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                            <Building2 className="h-3 w-3" /> General
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[9px] font-black text-amber-700 uppercase dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                            <Utensils className="h-3 w-3" /> Restaurante
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const isRenton =
                            t.name?.toUpperCase().includes("RENTON") ||
                            t.username?.toLowerCase() === "renton";
                          if (isRenton) {
                            return (
                              <span className="rounded-full border border-violet-200 bg-violet-100/70 px-2.5 py-1 text-[9px] font-black tracking-wide text-violet-700 uppercase dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                                👑 Renton Admin
                              </span>
                            );
                          }
                          return t.is_admin ? (
                            <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-black text-blue-600 uppercase">
                              Admin Cliente
                            </span>
                          ) : (
                            <span className="rounded-full border border-slate-100 bg-slate-50 px-2 py-1 text-[9px] font-black text-slate-400 uppercase">
                              Cliente
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 pr-8 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(t)}
                            title="Editar cliente"
                            aria-label={`Editar cliente ${t.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {!(
                            t.name?.toUpperCase().includes("RENTON") ||
                            t.username?.toLowerCase() === "renton"
                          ) && (
                            <button
                              onClick={() => handleDelete(t.id)}
                              title="Eliminar cliente"
                              aria-label={`Eliminar cliente ${t.name}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {!isSuperAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Panel de Integraciones y Ajustes
              </h2>
              <p className="text-xs text-slate-400">
                Gestiona las integraciones activas para tu cuenta y negocio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Alert */}
      <div className="relative flex items-center gap-6 overflow-hidden rounded-3xl bg-blue-600 p-8 text-white shadow-xl shadow-blue-100">
        <Shield className="h-10 w-10 text-blue-100 opacity-50" />
        <div className="space-y-1">
          <h4 className="text-xs font-black tracking-[0.2em] uppercase">
            Protocolo de Seguridad Centralizada
          </h4>
          <p className="max-w-2xl text-sm leading-relaxed font-medium text-blue-100">
            Cada entorno cargado aquí utiliza un túnel seguro. Los administradores centralizados
            pueden gestionar KPIs y flujos sin comprometer la integridad de los datos de cada
            cliente.
          </p>
        </div>
      </div>
    </div>
  );
}
