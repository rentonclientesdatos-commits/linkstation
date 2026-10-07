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
  moduleId?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Super Admin",
    href: "/dashboard/super-admin",
    icon: <ShieldCheck className="h-5 w-5 text-amber-500" strokeWidth={1.8} />,
    superAdminOnly: true,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" strokeWidth={1.8} />,
    moduleId: "dashboard",
  },
  {
    label: "Constructor & IA",
    href: "/dashboard/onboarding",
    icon: <Workflow className="h-5 w-5" strokeWidth={1.8} />,
    moduleId: "ai_agents",
    subItems: [
      {
        label: "Constructor",
        href: "/dashboard/onboarding",
        icon: <PlusCircle className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "Agentes AI",
        href: "/dashboard/agents",
        icon: <Bot className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "Knowledge Base",
        href: "/dashboard/knowledge",
        icon: <BookOpen className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "Agentes de Voz",
        href: "/dashboard/voice-agents",
        icon: <Mic className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "Chatbot Web",
        href: "/dashboard/web-chatbot",
        icon: <Globe className="h-4 w-4" strokeWidth={1.8} />,
      },
    ],
  },
  {
    label: "Leads",
    href: "/dashboard/historial",
    icon: <Users className="h-5 w-5" strokeWidth={1.8} />,
    moduleId: "leads",
    subItems: [
      {
        label: "Resumen Leads",
        href: "/dashboard/historial",
        icon: <LayoutDashboard className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "Conversaciones whatsapp",
        href: "/dashboard/conversaciones",
        icon: <MessageSquare className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "Lead Llamadas",
        href: "/dashboard/lead-llamadas",
        icon: <PhoneCall className="h-4 w-4" strokeWidth={1.8} />,
      },
    ],
  },
  {
    label: "Calendario",
    href: "/dashboard/calendar",
    icon: <Calendar className="h-5 w-5" strokeWidth={1.8} />,
    moduleId: "calendar",
  },
  {
    label: "Pedidos & Mesas",
    href: "/dashboard/pedidos",
    icon: <Utensils className="h-5 w-5" strokeWidth={1.8} />,
    restaurantOnly: true,
    moduleId: "restaurant",
  },
  {
    label: "Campañas",
    href: "/dashboard/campanas",
    icon: <Megaphone className="h-5 w-5" strokeWidth={1.8} />,
    moduleId: "campaigns",
    subItems: [
      {
        label: "Métricas y Estado",
        href: "/dashboard/campanas",
        icon: <LayoutDashboard className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "Constructor",
        href: "/dashboard/campanas/nuevo",
        icon: <PlusCircle className="h-4 w-4" strokeWidth={1.8} />,
      },
    ],
  },
  {
    label: "Métricas",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" strokeWidth={1.8} />,
    moduleId: "dashboard",
    subItems: [
      {
        label: "Llamadas",
        href: "/dashboard/minutos",
        icon: <Clock className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "Whatsapp",
        href: "/dashboard/whatsapp",
        icon: <MessageCircle className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "Lista de Leads",
        href: "/dashboard/historial",
        icon: <History className="h-4 w-4" strokeWidth={1.8} />,
      },
    ],
  },
  {
    label: "Pruebas y Logs",
    href: "/dashboard/simulator",
    icon: <FlaskConical className="h-5 w-5" strokeWidth={1.8} />,
    moduleId: "simulator",
    subItems: [
      {
        label: "Simulador",
        href: "/dashboard/simulator",
        icon: <FlaskConical className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "Playground",
        href: "/dashboard/playground",
        icon: <Terminal className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "Auditoría Logs",
        href: "/dashboard/logs",
        icon: <Terminal className="h-4 w-4" strokeWidth={1.8} />,
      },
    ],
  },
  {
    label: "Negocio",
    href: "/dashboard/costs",
    icon: <DollarSign className="h-5 w-5" strokeWidth={1.8} />,
    moduleId: "costs",
    subItems: [
      {
        label: "Análisis de Costes",
        href: "/dashboard/costs",
        icon: <DollarSign className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "Admin Panel",
        href: "/dashboard/admin",
        icon: <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />,
        superAdminOnly: true,
      },
    ],
  },
  {
    label: "Ajustes",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" strokeWidth={1.8} />,
    moduleId: "integrations",
    subItems: [
      {
        label: "Clientes y Config.",
        href: "/dashboard/settings",
        icon: <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} />,
        superAdminOnly: true,
      },
      {
        label: "Google Sheets",
        href: "/dashboard/settings/integrations/google-sheets",
        icon: <Sheet className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "Zoho CRM",
        href: "/dashboard/settings/integrations/zoho-pull",
        icon: <RefreshCw className="h-4 w-4" strokeWidth={1.8} />,
      },
      {
        label: "WhatsApp WABA",
        href: "/dashboard/settings/whatsapp",
        icon: <MessageSquare className="h-4 w-4" strokeWidth={1.8} />,
      },
    ],
  },
  {
    label: "Docs",
    href: "/dashboard/docs",
    icon: <BookOpen className="h-5 w-5" strokeWidth={1.8} />,
    moduleId: "docs",
  },
  {
    label: "Doc Admin",
    href: "/dashboard/docs-admin",
    icon: <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />,
    superAdminOnly: true,
    moduleId: "docs",
  },
  {
    label: "Docs Clientes",
    href: "/dashboard/docs-clientes",
    icon: <BookOpen className="h-5 w-5" strokeWidth={1.8} />,
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
  const businessType =
    ((tenantConfig as Record<string, unknown>)?.business_type as string | undefined) ||
    storeBusinessType;
  // If businessType is not specified (legacy), default to restaurant; otherwise check explicitly
  const isRestaurant =
    !businessType || businessType === "restaurant" || businessType === "restaurante";

  const visibleModules = (tenantConfig as Record<string, unknown>)?.visible_modules as
    | string[]
    | undefined;

  const filterNavItem = (item: NavItem): NavItem | null => {
    // 1. Super Admin restringido estrictamente al Super Admin global
    if (item.superAdminOnly && !isSuperAdmin) return null;

    // 2. Control de adminOnly
    if (item.adminOnly && !isAdmin && !isSuperAdmin) return null;

    // 3. Negocio tipo restaurante
    if (item.restaurantOnly && !isRestaurant) return null;

    // 4. Módulos asignados por el Super Admin
    if (!isSuperAdmin && item.moduleId && visibleModules && Array.isArray(visibleModules)) {
      if (!visibleModules.includes(item.moduleId)) {
        return null;
      }
    }

    let filteredSubItems: NavItem[] | undefined = undefined;
    if (item.subItems) {
      filteredSubItems = item.subItems
        .map(filterNavItem)
        .filter((sub): sub is NavItem => sub !== null);

      if (filteredSubItems.length === 0 && item.subItems.length > 0) {
        return null;
      }
    }

    // Si es Ajustes y no es Super Admin, redirigir al primer subItem visible (ej: WhatsApp WABA o Sheets)
    const activeHref =
      !isSuperAdmin && item.label === "Ajustes" && filteredSubItems?.[0]
        ? filteredSubItems[0].href
        : item.href;

    return {
      ...item,
      href: activeHref,
      subItems: filteredSubItems,
    };
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
      <div key={item.label} className="space-y-1">
        <div
          className={cn(
            "group flex items-center gap-1 rounded-xl px-1 text-sm font-semibold transition-all duration-200",
            isActive && !hasSubItems
              ? "bg-grad-primary text-primary-foreground shadow-primary/30 shadow-lg"
              : "text-foreground/60 hover:bg-card/60 hover:text-foreground",
            depth > 0 && !collapsed && "ml-4"
          )}
        >
          {/* Main Link Area (Icon + Label) */}
          <Link
            href={item.href}
            className="flex flex-1 items-center gap-3 px-2 py-2.5 outline-none"
            onClick={() => {
              if (!isExpanded && hasSubItems) toggleExpand(item.label);
            }}
          >
            <span className="relative flex-shrink-0">
              {item.icon}
              {item.href === "/dashboard/settings" && !isConfigured && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
              )}
            </span>
            {!collapsed && <span className="flex-1">{item.label}</span>}
          </Link>

          {/* Expand Toggle (Chevron Area) */}
          {!collapsed && hasSubItems && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleExpand(item.label);
              }}
              className="mr-1 rounded-lg p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              title={isExpanded ? "Contraer" : "Expandir"}
              aria-label={isExpanded ? "Contraer submenú" : "Expandir submenú"}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </button>
          )}
        </div>

        {hasSubItems && isExpanded && !collapsed && (
          <div className="space-y-1">
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
      {/* ── MOBILE: Overlay backdrop ───────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* ── DESKTOP Sidebar / MOBILE Drawer ───────────────────────── */}
      <aside
        className={cn(
          "border-border bg-grad-surface relative hidden h-screen flex-col border-r transition-all duration-300 lg:flex",
          collapsed ? "w-16" : "w-64",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:flex max-lg:w-72 max-lg:shadow-2xl",
          mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
          "max-lg:transition-transform max-lg:duration-300"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "border-border flex h-16 items-center justify-between border-b px-4 transition-all md:h-20"
          )}
        >
          {!collapsed ? (
            <div className="flex items-center overflow-hidden px-1">
              {((tenantConfig as Record<string, unknown>)?.logo_url as string | undefined) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(tenantConfig as Record<string, unknown>)?.logo_url as string}
                  alt="Logo del Negocio"
                  className="h-10 w-auto max-w-[200px] object-contain transition-all sm:h-12"
                />
              ) : (
                <NextImage
                  src="/logo-login.png"
                  alt="LinkStation"
                  width={260}
                  height={130}
                  className="h-10 w-auto object-contain sm:h-12"
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
                  className="h-8 w-8 rounded-md object-contain"
                />
              ) : (
                <NextImage
                  src="/favicon-renton.png"
                  alt="LinkStation"
                  width={40}
                  height={40}
                  className="mx-auto h-9 w-9 object-contain"
                />
              )}
            </div>
          )}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="text-muted-foreground/50 hover:bg-card flex h-9 w-9 items-center justify-center rounded-xl transition-all lg:hidden"
              title="Cerrar menú"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {isAdmin && <TenantSelector collapsed={collapsed} isAdmin={isAdmin} />}

        <nav className="mt-2 flex-1 space-y-1.5 overflow-y-auto p-3">
          {visibleNavItems.map((item) => (
            <NavLink key={item.label} item={item} />
          ))}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground/40 hover:bg-card hover:text-foreground m-3 hidden items-center justify-center rounded-xl py-2.5 transition lg:flex"
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          <svg
            className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </aside>

      {/* ── MOBILE: Bottom Navigation Bar ─────────────────────────── */}
      <nav className="border-border bg-card/95 pb-safe fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t px-1 backdrop-blur-md lg:hidden">
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
                active ? "text-primary" : "text-muted-foreground/40"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                  active ? "bg-primary/10" : ""
                )}
              >
                {item.icon}
              </span>
              <span className="text-[9px] font-black tracking-tight uppercase">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
