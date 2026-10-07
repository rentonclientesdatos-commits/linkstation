"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  setTenantCookies,
} from "@/lib/actions/tenant";
import { useTenantStore } from "@/store/tenant";
import { Tenant } from "@/types/tenant";
import { toast } from "@/components/ui/toast";
import {
  ShieldCheck,
  Building2,
  Plus,
  Search,
  Utensils,
  HeartPulse,
  GraduationCap,
  ShoppingBag,
  Home,
  Wrench,
  Globe,
  Mail,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Lock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BUSINESS_TYPES = [
  { id: "todos", label: "Todos", icon: Globe, color: "text-muted-foreground" },
  {
    id: "restaurante",
    label: "Restaurante",
    icon: Utensils,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  },
  {
    id: "salud",
    label: "Salud / Clínica",
    icon: HeartPulse,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  },
  {
    id: "educacion",
    label: "Educación",
    icon: GraduationCap,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  },
  {
    id: "retail",
    label: "Retail / Comercio",
    icon: ShoppingBag,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
  },
  {
    id: "inmobiliaria",
    label: "Inmobiliaria",
    icon: Home,
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/30",
  },
  {
    id: "servicios",
    label: "Servicios",
    icon: Wrench,
    color: "text-pink-500 bg-pink-500/10 border-pink-500/30",
  },
  {
    id: "general",
    label: "General",
    icon: Globe,
    color: "text-slate-500 bg-slate-500/10 border-slate-500/30",
  },
];

export default function SuperAdminPage() {
  const router = useRouter();
  const { setTenant } = useTenantStore();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("todos");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    client_email: "",
    password: "",
    business_type: "restaurante",
    supabase_url: "",
    supabase_anon_key: "",
  });

  // Load tenants
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getTenants();
      setTenants(data);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error cargando clientes",
        description: "No se pudieron obtener los datos. Verifica tus permisos.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.client_email?.toLowerCase().includes(search.toLowerCase()) ||
        t.username?.toLowerCase().includes(search.toLowerCase());

      const tenantType =
        (t.business_type as string) ||
        ((t.config as Record<string, unknown>)?.business_type as string) ||
        "general";

      // Normalize match (restaurant / restaurante)
      const normalizedType = tenantType === "restaurant" ? "restaurante" : tenantType;

      const matchesType = selectedType === "todos" || normalizedType === selectedType;

      return matchesSearch && matchesType;
    });
  }, [tenants, search, selectedType]);

  // Statistics
  const stats = useMemo(() => {
    const total = tenants.length;
    let restaurants = 0;
    let salud = 0;
    let educacion = 0;
    let otros = 0;
    let withAdminUser = 0;

    tenants.forEach((t) => {
      const type = (t.business_type ||
        (t.config as Record<string, unknown>)?.business_type ||
        "general") as string;
      if (type === "restaurant" || type === "restaurante") restaurants++;
      else if (type === "salud") salud++;
      else if (type === "educacion") educacion++;
      else otros++;

      if (t.auth_user_id) withAdminUser++;
    });

    return { total, restaurants, salud, educacion, otros, withAdminUser };
  }, [tenants]);

  // All available module IDs in the app (used to show all sidebar items when Super Admin accesses a tenant)
  const ALL_MODULE_IDS = [
    "dashboard",
    "ai_agents",
    "leads",
    "calendar",
    "restaurant",
    "campaigns",
    "simulator",
    "costs",
    "integrations",
    "docs",
  ];

  // Switch to tenant view as Developer
  const handleAccessAsTenant = async (tenant: Tenant) => {
    // Inject all module IDs so the sidebar shows every section when Super Admin views a client
    const configWithAllModules = {
      ...(tenant.config as Record<string, unknown>),
      visible_modules: ALL_MODULE_IDS,
    };

    setTenant({
      tenantId: tenant.id,
      tenantName: tenant.name,
      config: configWithAllModules,
      isAdmin: true,
      businessType: tenant.business_type,
    });
    await setTenantCookies(tenant.id, tenant.name);
    toast({
      title: `Entrando como ${tenant.name}`,
      description: "Has cambiado el contexto activo del Dashboard.",
      variant: "info",
    });
    router.push("/dashboard");
  };

  // Open Create Modal
  const openCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    setFormData({
      name: "",
      username: "",
      client_email: "",
      password: "",
      business_type: "restaurante",
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const openEditModal = (t: Tenant) => {
    setModalMode("edit");
    setEditingId(t.id);
    const bType =
      t.business_type ||
      ((t.config as Record<string, unknown>)?.business_type as string) ||
      "general";
    const normalizedBType = bType === "restaurant" ? "restaurante" : bType;

    setFormData({
      name: t.name,
      username: t.username || "",
      client_email: t.client_email || "",
      password: "",
      business_type: normalizedBType,
      supabase_url: t.supabase_url || "",
      supabase_anon_key: t.supabase_anon_key || "",
    });
    setShowModal(true);
  };

  // Handle Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Nombre requerido", variant: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        const res = await createTenant({
          name: formData.name.trim(),
          username: formData.username.trim() || undefined,
          client_email: formData.client_email.trim() || undefined,
          password: formData.password || undefined,
          business_type: formData.business_type,
          supabase_url: formData.supabase_url || "https://placeholder.supabase.co",
          supabase_anon_key: formData.supabase_anon_key || "placeholder-anon-key-placeholder",
          is_admin: false,
        });

        if (res.error) {
          toast({
            title: "Error creando cliente",
            description: res.error,
            variant: "error",
          });
        } else {
          toast({
            title: "¡Cliente creado exitosamente!",
            description: `Se ha registrado ${formData.name} correctamente.`,
            variant: "success",
          });
          setShowModal(false);
          loadData();
        }
      } else if (modalMode === "edit" && editingId) {
        const res = await updateTenant(editingId, {
          name: formData.name.trim(),
          username: formData.username.trim() || undefined,
          client_email: formData.client_email.trim() || undefined,
          password: formData.password || undefined,
          business_type: formData.business_type,
        });

        if (res.error) {
          toast({
            title: "Error actualizando cliente",
            description: res.error,
            variant: "error",
          });
        } else {
          toast({
            title: "Cliente actualizado",
            description: `Cambios guardados para ${formData.name}.`,
            variant: "success",
          });
          setShowModal(false);
          loadData();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast({
        title: "Error inesperado",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Tenant
  const handleDeleteTenant = async (id: string, name: string) => {
    if (
      !confirm(
        `¿Estás completamente seguro de eliminar el cliente "${name}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      await deleteTenant(id);
      toast({
        title: "Cliente eliminado",
        description: `Se eliminó "${name}".`,
        variant: "success",
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar";
      toast({
        title: "Error al eliminar",
        description: msg,
        variant: "error",
      });
    }
  };

  const getBadgeForType = (typeRaw?: string) => {
    const type = typeRaw === "restaurant" ? "restaurante" : typeRaw || "general";
    const found = BUSINESS_TYPES.find((b) => b.id === type) || BUSINESS_TYPES[7];
    const Icon = found.icon;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold capitalize transition-colors",
          found.color
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {found.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="via-background to-card relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-0.5 text-xs font-bold tracking-wider text-amber-500 uppercase">
                <ShieldCheck className="h-3.5 w-3.5" /> Super Admin Developer
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
                <Sparkles className="h-3 w-3" /> Multi-Tenant V2
              </span>
            </div>
            <h1 className="text-foreground text-2xl font-black tracking-tight md:text-3xl">
              Panel de Control Global de Clientes
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Como Super Admin tienes visión y control total sobre todos los clientes (tenants), sus
              tipos de negocio y sus administradores. Cada cliente accede de forma aislada a su
              propio dashboard.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="border-border bg-card/60 text-foreground hover:bg-accent inline-flex items-center justify-center rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition disabled:opacity-50"
              title="Refrescar lista"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Actualizar
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:opacity-95 active:scale-[0.98]"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo Cliente
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <div className="text-muted-foreground flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase">Total Clientes</span>
            <Building2 className="text-primary h-4 w-4" />
          </div>
          <div className="text-foreground mt-2 text-2xl font-black">{stats.total}</div>
          <p className="text-muted-foreground mt-1 text-xs">
            {stats.withAdminUser} con cuenta admin activa
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-bold tracking-wider uppercase">Restaurantes</span>
            <Utensils className="h-4 w-4" />
          </div>
          <div className="text-foreground mt-2 text-2xl font-black">{stats.restaurants}</div>
          <p className="text-muted-foreground mt-1 text-xs">Módulo de mesas y pedidos activo</p>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-bold tracking-wider uppercase">Salud & Clínicas</span>
            <HeartPulse className="h-4 w-4" />
          </div>
          <div className="text-foreground mt-2 text-2xl font-black">{stats.salud}</div>
          <p className="text-muted-foreground mt-1 text-xs">Citas y pacientes</p>
        </div>

        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <div className="text-muted-foreground flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase">Educación / Otros</span>
            <GraduationCap className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-foreground mt-2 text-2xl font-black">
            {stats.educacion + stats.otros}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">Sectores corporativos y retail</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-primary w-full rounded-xl border py-2 pr-4 pl-10 text-sm focus:ring-1 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Business Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {BUSINESS_TYPES.map((bt) => {
            const isSelected = selectedType === bt.id;
            return (
              <button
                key={bt.id}
                onClick={() => setSelectedType(bt.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent border"
                )}
              >
                {bt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tenants Table / List */}
      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-border bg-muted/40 text-muted-foreground border-b text-[11px] font-bold tracking-wider uppercase">
              <tr>
                <th className="px-4 py-3.5">Cliente / Empresa</th>
                <th className="px-4 py-3.5">Tipo de Negocio</th>
                <th className="px-4 py-3.5">Admin Email</th>
                <th className="px-4 py-3.5">Estado Auth</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-muted-foreground py-12 text-center">
                    <RefreshCw className="text-primary mx-auto mb-2 h-6 w-6 animate-spin" />
                    Cargando clientes...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted-foreground py-12 text-center">
                    <Building2 className="text-muted-foreground/40 mx-auto mb-2 h-8 w-8" />
                    No se encontraron clientes con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const bType =
                    t.business_type ||
                    ((t.config as Record<string, unknown>)?.business_type as string) ||
                    "general";
                  const logo = (t.config as Record<string, unknown>)?.logo_url as
                    | string
                    | undefined;

                  return (
                    <tr key={t.id} className="group hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="border-border bg-muted/50 text-foreground flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border font-bold">
                            {logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={logo}
                                alt=""
                                className="h-8 w-8 rounded-lg object-contain"
                              />
                            ) : (
                              <span>{t.name.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="text-foreground group-hover:text-primary font-bold transition-colors">
                              {t.name}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {t.username ? `@${t.username}` : `ID: ${t.id.slice(0, 8)}...`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">{getBadgeForType(bType)}</td>

                      <td className="px-4 py-4">
                        {t.client_email ? (
                          <div className="text-foreground/80 flex items-center gap-1.5">
                            <Mail className="text-muted-foreground h-3.5 w-3.5" />
                            <span>{t.client_email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs italic">
                            Sin email configurado
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {t.auth_user_id ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
                            <CheckCircle2 className="h-3 w-3" /> Vinculado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
                            <AlertCircle className="h-3 w-3" /> Pendiente
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAccessAsTenant(t)}
                            className="bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95"
                            title="Entrar al dashboard como este cliente"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Acceder
                          </button>

                          <button
                            onClick={() => openEditModal(t)}
                            className="border-border text-muted-foreground hover:bg-accent hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-lg border transition"
                            title="Editar información y tipo de negocio"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteTenant(t.id, t.name)}
                            className="border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive inline-flex h-8 w-8 items-center justify-center rounded-lg border transition"
                            title="Eliminar cliente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear / Editar Cliente */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="border-border bg-card animate-in fade-in zoom-in-95 w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl duration-200">
            <div className="border-border flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <Building2 className="text-primary h-5 w-5" />
                <h2 className="text-foreground text-lg font-bold">
                  {modalMode === "create" ? "Registrar Nuevo Cliente" : "Editar Cliente"}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="text-muted-foreground mb-1.5 block text-xs font-bold tracking-wider uppercase">
                  Nombre del Cliente / Empresa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Trattoria Bella Italia, Clínica Santa Fe..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-border bg-background text-foreground focus:border-primary focus:ring-primary w-full rounded-xl border px-3.5 py-2 text-sm focus:ring-1 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground mb-1.5 block text-xs font-bold tracking-wider uppercase">
                    Tipo de Negocio *
                  </label>
                  <select
                    value={formData.business_type}
                    onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                    className="border-border bg-background text-foreground focus:border-primary focus:ring-primary w-full rounded-xl border px-3.5 py-2 text-sm focus:ring-1 focus:outline-none"
                  >
                    <option value="restaurante">Restaurante</option>
                    <option value="salud">Salud / Clínica</option>
                    <option value="educacion">Educación</option>
                    <option value="retail">Retail / Comercio</option>
                    <option value="inmobiliaria">Inmobiliaria</option>
                    <option value="servicios">Servicios</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-muted-foreground mb-1.5 block text-xs font-bold tracking-wider uppercase">
                    Slug / Usuario
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: trattoria-italia"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="border-border bg-background text-foreground focus:border-primary focus:ring-primary w-full rounded-xl border px-3.5 py-2 text-sm focus:ring-1 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-border/60 border-t pt-4">
                <div className="text-primary mb-3 flex items-center gap-1.5 text-xs font-bold">
                  <Lock className="h-3.5 w-3.5" />
                  <span>CREDENCIALES DE ACCESO PARA EL CLIENTE</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-muted-foreground mb-1 block text-xs font-medium">
                      Email del Administrador del Negocio
                    </label>
                    <input
                      type="email"
                      placeholder="admin@cliente.com"
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      className="border-border bg-background text-foreground focus:border-primary focus:ring-primary w-full rounded-xl border px-3.5 py-2 text-sm focus:ring-1 focus:outline-none"
                    />
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      El dueño del negocio iniciará sesión con este correo y solo verá los datos de
                      su empresa.
                    </p>
                  </div>

                  <div>
                    <label className="text-muted-foreground mb-1 block text-xs font-medium">
                      {modalMode === "create"
                        ? "Contraseña Inicial"
                        : "Nueva Contraseña (dejar en blanco para no cambiar)"}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="border-border bg-background text-foreground focus:border-primary focus:ring-primary w-full rounded-xl border px-3.5 py-2 text-sm focus:ring-1 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-border flex items-center justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="border-border text-muted-foreground hover:bg-accent hover:text-foreground rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground rounded-xl px-5 py-2 text-sm font-bold shadow transition hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Guardando..."
                    : modalMode === "create"
                      ? "Crear Cliente"
                      : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
