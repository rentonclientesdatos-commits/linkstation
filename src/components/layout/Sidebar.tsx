"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/store/tenant";
import NextImage from "next/image";

import {
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Clock,
  History,
  Settings,
  X,
  ChevronDown,
  PlusCircle,
  Workflow,
  Bot,
  ShieldCheck,
  Terminal,
  Calendar,
  MessageSquare,
  FlaskConical,
  Mic,
  Globe,
  BookOpen,
  DollarSign,
  Users,
  Sheet,
  SlidersHorizontal,
  RefreshCw,
  Utensils,
  PhoneCall,
  Instagram,
  Flame,
} from "lucide-react";
import { TenantSelector } from "./TenantSelector";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  subItems?: NavItem[];
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  restaurantOnly?: boolean;
  tenantOnly?: string | string[];
  moduleId?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Super Admin",
    href: "/dashboard/super-admin",
    icon: <ShieldCheck className="h-4 w-4 text-amber-400" strokeWidth={1.5} />,
    superAdminOnly: true,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "dashboard",
  },
  {
    label: "Constructor & IA",
    href: "/dashboard/onboarding",
    icon: <Workflow className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "ai_agents",
    subItems: [
      {
        label: "Constructor",
        href: "/dashboard/onboarding",
        icon: <PlusCircle className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Agentes AI",
        href: "/dashboard/agents",
        icon: <Bot className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Knowledge Base",
        href: "/dashboard/knowledge",
        icon: <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Agentes de Voz",
        href: "/dashboard/voice-agents",
        icon: <Mic className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Chatbot Web",
        href: "/dashboard/web-chatbot",
        icon: <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
    ],
  },
  {
    label: "Leads",
    href: "/dashboard/historial",
    icon: <Users className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "leads",
    subItems: [
      {
        label: "Resumen Leads",
        href: "/dashboard/historial",
        icon: <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Conversaciones WhatsApp",
        href: "/dashboard/conversaciones",
        icon: <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Lead Llamadas",
        href: "/dashboard/lead-llamadas",
        icon: <PhoneCall className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
    ],
  },
  {
    label: "Calendario",
    href: "/dashboard/calendar",
    icon: <Calendar className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "calendar",
  },
  {
    label: "Pedidos & Mesas",
    href: "/dashboard/pedidos",
    icon: <Utensils className="h-4 w-4" strokeWidth={1.5} />,
    restaurantOnly: true,
    moduleId: "restaurant",
    subItems: [
      {
        label: "Plano & Mesas",
        href: "/dashboard/pedidos",
        icon: <Utensils className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Cocina / KDS",
        href: "/dashboard/pedidos/kds",
        icon: <Flame className="h-3.5 w-3.5 text-rose-400" strokeWidth={1.5} />,
      },
    ],
  },
  {
    label: "Campañas",
    href: "/dashboard/campanas",
    icon: <Megaphone className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "campaigns",
    subItems: [
      {
        label: "Métricas y Estado",
        href: "/dashboard/campanas",
        icon: <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Jorklif (Cartera & Cotiz)",
        href: "/dashboard/campanas/jorklif",
        icon: <PhoneCall className="h-3.5 w-3.5" strokeWidth={1.5} />,
        tenantOnly: ["jorklif", "jorklift", "45f45121-4ed4-48f1-bd13-816df3755188"],
      },
      {
        label: "Constructor",
        href: "/dashboard/campanas/nuevo",
        icon: <PlusCircle className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
    ],
  },
  {
    label: "Métricas",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "dashboard",
    subItems: [
      {
        label: "Llamadas",
        href: "/dashboard/minutos",
        icon: <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Whatsapp",
        href: "/dashboard/whatsapp",
        icon: <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Lista de Leads",
        href: "/dashboard/historial",
        icon: <History className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
    ],
  },
  {
    label: "Pruebas y Logs",
    href: "/dashboard/simulator",
    icon: <FlaskConical className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "simulator",
    subItems: [
      {
        label: "Simulador",
        href: "/dashboard/simulator",
        icon: <FlaskConical className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Playground",
        href: "/dashboard/playground",
        icon: <Terminal className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Auditoría Logs",
        href: "/dashboard/logs",
        icon: <Terminal className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
    ],
  },
  {
    label: "Negocio",
    href: "/dashboard/costs",
    icon: <DollarSign className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "costs",
    subItems: [
      {
        label: "Análisis de Costes",
        href: "/dashboard/costs",
        icon: <DollarSign className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Admin Panel",
        href: "/dashboard/admin",
        icon: <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />,
        superAdminOnly: true,
      },
    ],
  },
  {
    label: "Ajustes",
    href: "/dashboard/settings",
    icon: <Settings className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "integrations",
    subItems: [
      {
        label: "Clientes y Config.",
        href: "/dashboard/settings",
        icon: <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />,
        superAdminOnly: true,
      },
      {
        label: "Google Sheets",
        href: "/dashboard/settings/integrations/google-sheets",
        icon: <Sheet className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Zoho CRM",
        href: "/dashboard/settings/integrations/zoho-pull",
        icon: <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "WhatsApp WABA",
        href: "/dashboard/settings/whatsapp",
        icon: <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
      {
        label: "Instagram",
        href: "/dashboard/settings/integrations/instagram",
        icon: <Instagram className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
    ],
  },
  {
    label: "Docs",
    href: "/dashboard/docs",
    icon: <BookOpen className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "docs",
  },
  {
    label: "Doc Admin",
    href: "/dashboard/docs-admin",
    icon: <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />,
    superAdminOnly: true,
    moduleId: "docs",
  },
  {
    label: "Docs Clientes",
    href: "/dashboard/docs-clientes",
    icon: <BookOpen className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "docs",
  },
];

export function Sidebar({
  isAdmin,
  isSuperAdmin,
  mobileOpen,
  onMobileClose,
}: {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Métricas", "Constructor & IA"]);
  const isConfigured = useTenantStore((s) => s.isConfigured);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const tenantConfig = useTenantStore((s) => s.config);
  const storeBusinessType = useTenantStore((s) => s.businessType);
  const tenantName = useTenantStore((s) => s.tenantName);
  const tenantId = useTenantStore((s) => s.tenantId);
  const businessType =
    ((tenantConfig as Record<string, unknown>)?.business_type as string | undefined) ||
    storeBusinessType;
  const isRestaurant =
    !businessType || businessType === "restaurant" || businessType === "restaurante";

  const restaurantRole =
    useTenantStore((s) => s.restaurantRole) ||
    ((tenantConfig as Record<string, unknown>)?.restaurant_role as "admin" | "mesero" | "cajero" | undefined) ||
    "admin";

  const visibleModules = (tenantConfig as Record<string, unknown>)?.visible_modules as
    string[] | undefined;

  const filterNavItem = (item: NavItem): NavItem | null => {
    if (item.superAdminOnly && !isSuperAdmin) return null;
    if (item.adminOnly && !isAdmin && !isSuperAdmin) return null;
    if (item.restaurantOnly && !isRestaurant) return null;

    if (isRestaurant && !isSuperAdmin) {
      if (restaurantRole === "mesero") {
        if (item.moduleId !== "restaurant" && item.href !== "/dashboard/pedidos") return null;
      } else if (restaurantRole === "cocina") {
        if (item.moduleId !== "restaurant" && !item.href.startsWith("/dashboard/pedidos")) return null;
      } else if (restaurantRole === "cajero") {
        const allowedCajeroModules = ["restaurant", "whatsapp", "dashboard"];
        if (item.moduleId && !allowedCajeroModules.includes(item.moduleId)) return null;
      }
    }

    if (item.tenantOnly) {
      const currentName = (tenantName || "").toLowerCase().trim();
      const currentId = (tenantId || "").toLowerCase().trim();
      const targets = Array.isArray(item.tenantOnly) ? item.tenantOnly : [item.tenantOnly];
      const matches = targets.some((t) => {
        const target = t.toLowerCase().trim();
        return currentName.includes(target) || currentId === target;
      });
      if (!matches) return null;
    }

    if (!isSuperAdmin && item.moduleId && visibleModules && Array.isArray(visibleModules)) {
      if (!visibleModules.includes(item.moduleId)) return null;
    }

    let filteredSubItems: NavItem[] | undefined = undefined;
    if (item.subItems) {
      filteredSubItems = item.subItems
        .map(filterNavItem)
        .filter((sub): sub is NavItem => sub !== null);
      if (filteredSubItems.length === 0 && item.subItems.length > 0) return null;
    }

    const activeHref =
      !isSuperAdmin && item.label === "Ajustes" && filteredSubItems?.[0]
        ? filteredSubItems[0].href
        : item.href;

    return { ...item, href: activeHref, subItems: filteredSubItems };
  };

  const visibleNavItems = NAV_ITEMS.map(filterNavItem).filter(
    (item): item is NavItem => item !== null
  );

  const NavLink = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems.includes(item.label);
    const safePathname = pathname || "";
    const isActive =
      safePathname === item.href ||
      (item.href !== "/dashboard" && safePathname.startsWith(item.href + "/"));

    return (
      <div key={item.label} className="space-y-0.5">
        <div
          className={cn(
            "group relative flex items-center gap-1 rounded-xl text-xs font-medium transition-all duration-200",
            isActive && !hasSubItems
              ? "bg-[rgba(0,229,255,0.08)] text-[#00e5ff]"
              : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
            depth > 0 && !collapsed && "ml-3"
          )}
        >
          {/* Active indicator bar */}
          {isActive && !hasSubItems && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
          )}

          {/* Main Link Area */}
          <Link
            href={item.href}
            className="flex flex-1 items-center gap-2.5 px-3 py-2 outline-none"
            onClick={() => {
              if (!isExpanded && hasSubItems) toggleExpand(item.label);
            }}
          >
            <span
              className={cn(
                "relative flex-shrink-0 transition-all duration-200",
                isActive && !hasSubItems ? "text-[#00e5ff] drop-shadow-[0_0_6px_rgba(0,229,255,0.7)]" : "text-slate-500 group-hover:text-slate-300"
              )}
            >
              {item.icon}
              {item.href === "/dashboard/settings" && !isConfigured && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                </span>
              )}
            </span>
            {!collapsed && (
              <span className={cn("flex-1 tracking-wide", isActive && !hasSubItems && "font-semibold")}>
                {item.label}
              </span>
            )}
          </Link>

          {/* Expand Toggle */}
          {!collapsed && hasSubItems && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleExpand(item.label);
              }}
              className="mr-1.5 rounded-lg p-1.5 transition-colors hover:bg-white/5 text-slate-600 hover:text-slate-400"
              title={isExpanded ? "Contraer" : "Expandir"}
              aria-label={isExpanded ? "Contraer submenú" : "Expandir submenú"}
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </button>
          )}
        </div>

        {hasSubItems && isExpanded && !collapsed && (
          <div className="space-y-0.5 pl-1">
            {item.subItems?.map((subItem) => (
              <NavLink key={subItem.label} item={subItem} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ── MOBILE: Overlay backdrop ─────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* ── DESKTOP Sidebar / MOBILE Drawer ──────────────────── */}
      <aside
        className={cn(
          // Glass panel base
          "relative hidden h-screen flex-col transition-all duration-300 lg:flex",
          // Neon glass sidebar
          "border-r border-[rgba(0,229,255,0.07)]",
          "bg-[rgba(4,8,20,0.75)] backdrop-blur-2xl",
          // Collapsed / expanded width
          collapsed ? "w-[60px]" : "w-60",
          // Mobile: drawer
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:flex max-lg:w-72 max-lg:shadow-2xl",
          mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
          "max-lg:transition-transform max-lg:duration-300"
        )}
        style={{
          boxShadow: "inset -1px 0 0 rgba(0,229,255,0.05), 4px 0 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Subtle top glow line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.4)] to-transparent" />

        {/* Logo area */}
        <div
          className={cn(
            "flex h-16 items-center justify-between px-4 transition-all md:h-[60px]",
            "border-b border-[rgba(0,229,255,0.07)]"
          )}
        >
          {!collapsed ? (
            <div className="flex items-center overflow-hidden px-1">
              {((tenantConfig as Record<string, unknown>)?.logo_url as string | undefined) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(tenantConfig as Record<string, unknown>)?.logo_url as string}
                  alt="Logo del Negocio"
                  className="h-8 w-auto max-w-[180px] object-contain opacity-90"
                />
              ) : (
                <NextImage
                  src="/logo-login.png"
                  alt="LinkStation"
                  width={200}
                  height={100}
                  className="h-8 w-auto object-contain opacity-90"
                  priority
                />
              )}
            </div>
          ) : (
            <div className="mx-auto flex items-center justify-center">
              {((tenantConfig as Record<string, unknown>)?.logo_url as string | undefined) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(tenantConfig as Record<string, unknown>)?.logo_url as string}
                  alt="Logo"
                  className="h-7 w-7 rounded-lg object-contain"
                />
              ) : (
                <NextImage
                  src="/favicon-renton.png"
                  alt="LinkStation"
                  width={36}
                  height={36}
                  className="mx-auto h-8 w-8 object-contain opacity-90"
                />
              )}
            </div>
          )}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all lg:hidden"
              title="Cerrar menú"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {isAdmin && <TenantSelector collapsed={collapsed} isAdmin={isAdmin} />}

        {/* Nav items */}
        <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto px-2 py-2 custom-scrollbar">
          {/* Section label */}
          {!collapsed && (
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
              Navegación
            </p>
          )}
          {visibleNavItems.map((item) => (
            <NavLink key={item.label} item={item} />
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-[rgba(0,229,255,0.06)] p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-xl py-2 text-slate-600 hover:bg-white/[0.04] hover:text-slate-400 transition-all"
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            <svg
              className={cn("h-3.5 w-3.5 transition-transform duration-300", collapsed && "rotate-180")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── MOBILE: Bottom Navigation Bar ──────────────────────── */}
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-30 flex items-center justify-around px-1 lg:hidden"
        style={{
          background: "rgba(4, 8, 20, 0.9)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(0, 229, 255, 0.1)",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.5)",
        }}
      >
        {(
          [
            NAV_ITEMS.find((n) => n.label === "Métricas"),
            ...(NAV_ITEMS.find((n) => n.label === "Métricas")?.subItems?.slice(0, 3) || []),
            NAV_ITEMS.find((n) => n.label === "Ajustes"),
          ].filter(Boolean) as NavItem[]
        ).map((item) => {
          const safePathname = pathname || "";
          const active =
            safePathname === item.href ||
            (item.href !== "/dashboard" && safePathname.startsWith(item.href + "/"));
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "flex min-w-[48px] flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-all",
                active ? "text-[#00e5ff]" : "text-slate-600"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                  active
                    ? "bg-[rgba(0,229,255,0.1)] shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                    : ""
                )}
              >
                {item.icon}
              </span>
              <span
                className={cn(
                  "text-[8px] font-bold tracking-tight uppercase",
                  active ? "text-[#00e5ff]" : "text-slate-600"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
