"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { TenantSelector } from "./TenantSelector";
import { NavCommandPalette, FlatNavItem } from "./NavCommandPalette";

interface NavItem {
  label: string;
  href: string;
  section?: string;
  icon?: React.ReactNode;
  subItems?: NavItem[];
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  restaurantOnly?: boolean;
  tenantOnly?: string | string[];
  moduleId?: string;
}

const NAV_ITEMS: NavItem[] = [
  // ── General ──────────────────────────────────────────
  {
    label: "Super Admin",
    href: "/dashboard/super-admin",
    section: "ADMINISTRACIÓN",
    icon: <ShieldCheck className="h-4 w-4 text-amber-400" strokeWidth={1.5} />,
    superAdminOnly: true,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    section: "GENERAL",
    icon: <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "dashboard",
  },
  {
    label: "Leads",
    href: "/dashboard/historial",
    section: "GENERAL",
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
    section: "GENERAL",
    icon: <Calendar className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "calendar",
  },
  {
    label: "Pedidos & Mesas",
    href: "/dashboard/pedidos",
    section: "GENERAL",
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

  // ── IA & Automatización ──────────────────────────────
  {
    label: "Constructor & IA",
    href: "/dashboard/onboarding",
    section: "IA & AUTOMATIZACIÓN",
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
    label: "Campañas",
    href: "/dashboard/campanas",
    section: "IA & AUTOMATIZACIÓN",
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

  // ── Métricas & Logs ───────────────────────────────────
  {
    label: "Métricas",
    href: "/dashboard",
    section: "MÉTRICAS & LOGS",
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
    section: "MÉTRICAS & LOGS",
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

  // ── Gestión & Docs ────────────────────────────────────
  {
    label: "Negocio",
    href: "/dashboard/costs",
    section: "GESTIÓN & DOCS",
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
    section: "GESTIÓN & DOCS",
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
    section: "GESTIÓN & DOCS",
    icon: <BookOpen className="h-4 w-4" strokeWidth={1.5} />,
    moduleId: "docs",
  },
  {
    label: "Doc Admin",
    href: "/dashboard/docs-admin",
    section: "GESTIÓN & DOCS",
    icon: <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />,
    superAdminOnly: true,
    moduleId: "docs",
  },
  {
    label: "Docs Clientes",
    href: "/dashboard/docs-clientes",
    section: "GESTIÓN & DOCS",
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
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "Métricas",
    "Constructor & IA",
    "Leads",
  ]);
  const [activeFlyout, setActiveFlyout] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const flyoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isConfigured = useTenantStore((s) => s.isConfigured);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Global Ctrl+K / Cmd+K and Ctrl+B / Cmd+B listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    ((tenantConfig as Record<string, unknown>)?.restaurant_role as
      "admin" | "mesero" | "cajero" | undefined) ||
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
        if (item.moduleId !== "restaurant" && !item.href.startsWith("/dashboard/pedidos"))
          return null;
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

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.map(filterNavItem).filter((item): item is NavItem => item !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSuperAdmin, isAdmin, isRestaurant, restaurantRole, tenantName, tenantId, visibleModules]
  );

  // Auto-expand section containing active pathname
  useEffect(() => {
    if (!pathname) return;
    visibleNavItems.forEach((item) => {
      if (
        item.subItems?.some(
          (sub) =>
            pathname === sub.href ||
            (sub.href !== "/dashboard" && pathname.startsWith(sub.href + "/"))
        )
      ) {
        setExpandedItems((prev) => (prev.includes(item.label) ? prev : [...prev, item.label]));
      }
    });
  }, [pathname, visibleNavItems]);

  // Flattened items for command palette
  const flatNavItems: FlatNavItem[] = useMemo(() => {
    const list: FlatNavItem[] = [];
    visibleNavItems.forEach((item) => {
      const cat = item.section || "Navegación";
      if (item.subItems && item.subItems.length > 0) {
        item.subItems.forEach((sub) => {
          list.push({
            id: `${item.label}-${sub.label}-${sub.href}`,
            label: sub.label,
            category: cat,
            parentLabel: item.label,
            href: sub.href,
            icon: sub.icon || item.icon,
          });
        });
      } else {
        list.push({
          id: `${item.label}-${item.href}`,
          label: item.label,
          category: cat,
          href: item.href,
          icon: item.icon,
        });
      }
    });
    return list;
  }, [visibleNavItems]);

  // Flyout hover handlers with debounce
  const openFlyout = (label: string) => {
    if (!collapsed) return;
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
    setActiveFlyout(label);
  };

  const closeFlyoutWithDelay = () => {
    if (!collapsed) return;
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
    flyoutTimerRef.current = setTimeout(() => {
      setActiveFlyout(null);
    }, 120);
  };

  const keepFlyoutOpen = () => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
  };

  const NavItemComponent = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems.includes(item.label);
    const safePathname = pathname || "";

    const isSubActive = Boolean(
      hasSubItems &&
      item.subItems?.some(
        (sub) =>
          safePathname === sub.href ||
          (sub.href !== "/dashboard" && safePathname.startsWith(sub.href + "/"))
      )
    );

    const isDirectActive =
      safePathname === item.href ||
      (item.href !== "/dashboard" && safePathname.startsWith(item.href + "/"));

    const isActive = hasSubItems ? isSubActive : isDirectActive;
    const isFlyoutOpen = activeFlyout === item.label && collapsed;

    return (
      <div
        className="relative space-y-0.5"
        onMouseEnter={() => openFlyout(item.label)}
        onMouseLeave={closeFlyoutWithDelay}
      >
        <div
          className={cn(
            "group relative flex items-center rounded-xl text-xs font-medium transition-all duration-200 select-none",
            isActive
              ? "bg-gradient-to-r from-[rgba(0,229,255,0.13)] via-[rgba(0,229,255,0.05)] to-transparent text-[#00e5ff] border border-[rgba(0,229,255,0.22)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_12px_rgba(0,229,255,0.08)]"
              : "border border-transparent text-slate-400 hover:bg-white/[0.05] hover:text-slate-100 hover:border-white/[0.04]",
            depth > 0 && !collapsed && "ml-3",
            collapsed && "justify-center px-0 py-1"
          )}
        >
          {/* Active indicator glowing bar (macOS Tahoe style) */}
          {isActive && (
            <span
              className={cn(
                "absolute rounded-full bg-[#00e5ff] shadow-[0_0_10px_rgba(0,229,255,0.9)] transition-all duration-300",
                collapsed
                  ? "top-1/2 left-0 h-4 w-[3px] -translate-y-1/2"
                  : "top-1/2 left-1 h-3.5 w-[2.5px] -translate-y-1/2"
              )}
            />
          )}

          {/* Collapsed Mode Item or Expanded Mode Item */}
          {collapsed ? (
            <Link
              href={item.href}
              className="flex h-9 w-9 items-center justify-center rounded-xl outline-none transition-transform duration-200 hover:scale-110 active:scale-95"
              aria-label={item.label}
              onClick={() => setActiveFlyout(null)}
            >
              <span
                className={cn(
                  "relative flex items-center justify-center transition-all duration-200",
                  isActive
                    ? "text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]"
                    : "text-slate-400 group-hover:text-slate-100"
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
            </Link>
          ) : (
            <>
              {/* If item has subItems in expanded view, clicking it toggles expand accordion */}
              {hasSubItems ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(item.label)}
                  className="flex flex-1 items-center gap-2.5 px-3 py-2 text-left outline-none"
                >
                  <span
                    className={cn(
                      "relative flex-shrink-0 transition-all duration-200",
                      isActive
                        ? "text-[#00e5ff] drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]"
                        : "text-slate-400 group-hover:text-slate-200"
                    )}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={cn(
                      "flex-1 truncate tracking-wide text-[12px]",
                      isActive ? "font-semibold text-slate-100" : "text-slate-300 group-hover:text-white"
                    )}
                  >
                    {item.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                      isExpanded && "rotate-180 text-cyan-400"
                    )}
                  />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className="flex flex-1 items-center gap-2.5 px-3 py-2 outline-none"
                >
                  <span
                    className={cn(
                      "relative flex-shrink-0 transition-all duration-200",
                      isActive
                        ? "text-[#00e5ff] drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]"
                        : "text-slate-400 group-hover:text-slate-200"
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
                  <span
                    className={cn(
                      "flex-1 truncate tracking-wide text-[12px]",
                      isActive ? "font-semibold text-slate-100" : "text-slate-300 group-hover:text-white"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              )}
            </>
          )}
        </div>

        {/* ── EXPANDED SUBMENUS WITH FRAMER MOTION ─────────────── */}
        {!collapsed && hasSubItems && (
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key={`accordion-${item.label}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: "auto",
                  opacity: 1,
                  transition: {
                    height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.18, delay: 0.04 },
                  },
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                  transition: {
                    height: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.1 },
                  },
                }}
                className="ml-3.5 space-y-0.5 overflow-hidden border-l border-white/[0.08] pl-1.5"
              >
                {item.subItems?.map((subItem) => (
                  <NavItemComponent key={subItem.label} item={subItem} depth={depth + 1} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ── COLLAPSED FLYOUT / POPOVER (VisionOS Glass Style) ────────── */}
        {collapsed && (
          <AnimatePresence>
            {isFlyoutOpen && (
              <motion.div
                key={`flyout-${item.label}`}
                initial={{ opacity: 0, x: -6, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -4, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={keepFlyoutOpen}
                onMouseLeave={closeFlyoutWithDelay}
                className="absolute top-0 left-[calc(100%+12px)] z-50 min-w-[220px] rounded-2xl border border-white/[0.12] bg-[#070c1d]/95 p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(0,229,255,0.12)] backdrop-blur-3xl"
              >
                {/* Header */}
                <div className="mb-1.5 flex items-center gap-2 border-b border-white/[0.08] px-2 pt-0.5 pb-2">
                  <span className="text-[#00e5ff] drop-shadow-[0_0_6px_rgba(0,229,255,0.5)]">
                    {item.icon}
                  </span>
                  <div className="flex-1 truncate">
                    <p className="text-xs font-semibold text-slate-100">{item.label}</p>
                    {item.section && (
                      <p className="text-[9px] tracking-wider text-slate-400 uppercase">
                        {item.section}
                      </p>
                    )}
                  </div>
                </div>

                {/* Body: list of subitems or direct link description */}
                {hasSubItems ? (
                  <div className="space-y-0.5">
                    {item.subItems?.map((sub) => {
                      const isSubLinkActive = safePathname === sub.href;
                      return (
                        <Link
                          key={sub.label}
                          href={sub.href}
                          onClick={() => setActiveFlyout(null)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs transition-all",
                            isSubLinkActive
                              ? "bg-[rgba(0,229,255,0.14)] font-semibold text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                              : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                          )}
                        >
                          <span
                            className={cn(
                              "transition-colors",
                              isSubLinkActive ? "text-[#00e5ff]" : "text-slate-400"
                            )}
                          >
                            {sub.icon}
                          </span>
                          <span className="truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setActiveFlyout(null)}
                    className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-[#00e5ff]"
                  >
                    <span>Abrir {item.label}</span>
                    <span className="text-[10px] text-slate-400">→</span>
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

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
    <>
      {/* ── MOBILE: Overlay backdrop ─────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* ── DESKTOP Sidebar / MOBILE Drawer (Liquid macOS / VisionOS Island) ── */}
      <aside
        className={cn(
          "relative hidden flex-col transition-[width,transform] duration-200 ease-out select-none lg:flex transform-gpu",
          "lg:my-3 lg:ml-3 lg:h-[calc(100vh-24px)] lg:rounded-[24px]",
          "lg:border lg:border-white/[0.09]",
          "bg-[#050917]/85 backdrop-blur-xl saturate-[170%]",
          collapsed ? "lg:w-[72px]" : "lg:w-[252px]",
          // Mobile drawer modes
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:flex max-lg:w-72 max-lg:h-screen max-lg:shadow-2xl max-lg:border-r max-lg:border-white/[0.08]",
          mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
          "max-lg:transition-transform max-lg:duration-200"
        )}
        style={{
          boxShadow:
            "inset 0 1px 0 0 rgba(255, 255, 255, 0.15), inset 0 0 15px 0 rgba(0, 229, 255, 0.02), 0 16px 36px rgba(0, 0, 0, 0.55), 0 0 1px 1px rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Specular light highlight on top curve */}
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        {/* ── macOS Window Header (Traffic Lights & OS Badge) ──────── */}
        <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2">
          {/* Traffic lights */}
          <div className="group/traffic flex items-center gap-2">
            {/* Red button: minimize/close */}
            <button
              type="button"
              onClick={() => {
                if (mobileOpen && onMobileClose) onMobileClose();
                else setCollapsed(true);
              }}
              className="relative flex h-3 w-3 items-center justify-center rounded-full bg-[#ff5f56] transition-transform duration-150 hover:scale-110 active:scale-95 shadow-[0_0_8px_rgba(255,95,86,0.5)] outline-none"
              title={collapsed ? "Minimizado" : "Minimizar panel (⌘B)"}
              aria-label="Minimizar panel"
            >
              <span className="opacity-0 group-hover/traffic:opacity-100 text-[8px] font-bold text-black/80 leading-none">
                ×
              </span>
            </button>
            {/* Yellow button: toggle collapsed */}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="relative flex h-3 w-3 items-center justify-center rounded-full bg-[#ffbd2e] transition-transform duration-150 hover:scale-110 active:scale-95 shadow-[0_0_8px_rgba(255,189,46,0.5)] outline-none"
              title={collapsed ? "Expandir barra" : "Modo Dock"}
              aria-label="Modo Dock"
            >
              <span className="opacity-0 group-hover/traffic:opacity-100 text-[8px] font-bold text-black/80 leading-none">
                -
              </span>
            </button>
            {/* Green button: Fullscreen */}
            <button
              type="button"
              onClick={() => {
                if (typeof document !== "undefined") {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  } else {
                    document.exitFullscreen().catch(() => {});
                  }
                }
              }}
              className="relative flex h-3 w-3 items-center justify-center rounded-full bg-[#27c93f] transition-transform duration-150 hover:scale-110 active:scale-95 shadow-[0_0_8px_rgba(39,201,63,0.5)] outline-none"
              title="Pantalla completa"
              aria-label="Pantalla completa"
            >
              <span className="opacity-0 group-hover/traffic:opacity-100 text-[7px] font-bold text-black/80 leading-none">
                +
              </span>
            </button>
          </div>

          {/* OS status pill */}
          {!collapsed ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00e5ff] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00e5ff]" />
              </span>
              <span className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
                LS-OS v3.4
              </span>
            </div>
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00e5ff] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00e5ff]" />
            </span>
          )}

          {/* Mobile close button */}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-white/10 hover:text-white lg:hidden"
              title="Cerrar menú"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Brand / Logo Area ───────────────────────────────── */}
        <div
          className={cn(
            "flex items-center justify-between px-3 pb-2.5 pt-1",
            "border-b border-white/[0.06]"
          )}
        >
          {!collapsed ? (
            <div className="flex items-center overflow-hidden px-1 py-1">
              {((tenantConfig as Record<string, unknown>)?.logo_url as string | undefined) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(tenantConfig as Record<string, unknown>)?.logo_url as string}
                  alt="Logo del Negocio"
                  className="h-8 w-auto max-w-[170px] object-contain opacity-95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                />
              ) : (
                <NextImage
                  src="/logo-login.png"
                  alt="LinkStation"
                  width={200}
                  height={100}
                  className="h-8 w-auto object-contain opacity-95 drop-shadow-[0_0_14px_rgba(0,229,255,0.25)]"
                  priority
                />
              )}
            </div>
          ) : (
            <div className="mx-auto flex items-center justify-center py-1">
              {((tenantConfig as Record<string, unknown>)?.logo_url as string | undefined) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(tenantConfig as Record<string, unknown>)?.logo_url as string}
                  alt="Logo"
                  className="h-7 w-7 rounded-lg object-contain shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] shadow-[0_0_12px_rgba(0,229,255,0.2)]">
                  <NextImage
                    src="/favicon-renton.png"
                    alt="LinkStation"
                    width={28}
                    height={28}
                    className="h-6 w-6 object-contain opacity-95"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tenant selector if admin */}
        {isAdmin && <TenantSelector collapsed={collapsed} isAdmin={isAdmin} />}

        {/* ── Spotlight Search (⌘K) ───────────────────────────── */}
        <div className="px-2.5 pt-2.5 pb-1">
          {!collapsed ? (
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="group flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.025] px-2.5 py-1.5 text-xs text-slate-400 transition-all duration-200 hover:border-cyan-400/40 hover:bg-white/[0.06] hover:text-slate-100 hover:shadow-[0_0_20px_rgba(0,229,255,0.08)]"
              title="Spotlight Search (⌘K)"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-[#00e5ff]" />
                <span className="text-[11px] text-slate-400 group-hover:text-slate-200">
                  Spotlight Search...
                </span>
              </div>
              <kbd className="inline-flex items-center gap-0.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 group-hover:border-cyan-400/30 group-hover:text-cyan-300">
                <span className="text-[10px]">⌘</span>K
              </kbd>
            </button>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-400 transition-all duration-200 hover:border-cyan-400/40 hover:bg-white/[0.08] hover:text-[#00e5ff] hover:shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                title="Spotlight Search (⌘K)"
                aria-label="Spotlight Search (⌘K)"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Navigation List ─────────────────────────────────── */}
        <nav className="custom-scrollbar mt-1 flex-1 space-y-1 overflow-y-auto px-2.5 py-1">
          {visibleNavItems.map((item, index) => {
            const prevItem = index > 0 ? visibleNavItems[index - 1] : null;
            const isFirstOfSection = !prevItem || prevItem.section !== item.section;

            return (
              <div key={item.label} className="space-y-0.5">
                {isFirstOfSection && item.section && (
                  <>
                    {!collapsed ? (
                      <div className="px-3 pt-3 pb-1">
                        <p className="text-[9px] font-semibold tracking-[0.18em] text-slate-400/70 uppercase">
                          {item.section}
                        </p>
                      </div>
                    ) : (
                      index > 0 && <div className="mx-auto my-2 h-px w-5 bg-white/[0.08]" />
                    )}
                  </>
                )}
                <NavItemComponent item={item} />
              </div>
            );
          })}
        </nav>

        {/* ── User Profile & Session Card (macOS Style) ──────── */}
        {!collapsed ? (
          <div className="mx-2.5 mb-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2 backdrop-blur-md transition-all hover:border-white/[0.12] hover:bg-white/[0.05]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                {/* Avatar with status indicator */}
                <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent border border-cyan-400/30 text-cyan-300 font-bold text-xs shadow-[0_0_10px_rgba(0,229,255,0.15)]">
                  {tenantName ? tenantName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#050917]" />
                  </span>
                </div>
                {/* User Info */}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-semibold text-slate-100">
                    {tenantName || "Administrador"}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {isSuperAdmin ? "Super Admin" : isAdmin ? "Admin Negocio" : "Operador"}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="group/logout flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-3.5 w-3.5 transition-transform group-hover/logout:-translate-x-0.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="my-1.5 flex justify-center">
            <button
              type="button"
              onClick={handleLogout}
              className="group relative flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 transition-all hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
            </button>
          </div>
        )}

        {/* ── Collapse / Expand Controller ────────────────────── */}
        <div className="border-t border-white/[0.06] p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent py-2 text-xs font-medium text-slate-400 transition-all duration-200 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-200"
            title={collapsed ? "Expandir barra (⌘B)" : "Colapsar barra (⌘B)"}
            aria-label={collapsed ? "Expandir barra" : "Colapsar barra"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 text-slate-400 transition-colors hover:text-[#00e5ff]" />
            ) : (
              <div className="flex w-full items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <PanelLeftClose className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-400">Ocultar barra</span>
                </div>
                <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[8px] font-semibold text-slate-500">
                  ⌘B
                </kbd>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ── Command Palette (Ctrl+K) ─────────────────────────── */}
      <NavCommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        items={flatNavItems}
      />

      {/* ── MOBILE: Bottom Navigation Bar ──────────────────────── */}
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-30 flex items-center justify-around px-1 lg:hidden"
        style={{
          background: "rgba(4, 8, 20, 0.95)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(0, 229, 255, 0.12)",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.6)",
        }}
      >
        {(
          [
            NAV_ITEMS.find((n) => n.label === "Dashboard"),
            NAV_ITEMS.find((n) => n.label === "Leads"),
            NAV_ITEMS.find((n) => n.label === "Constructor & IA"),
            NAV_ITEMS.find((n) => n.label === "Métricas"),
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
                active ? "text-[#00e5ff]" : "text-slate-500"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                  active
                    ? "bg-[rgba(0,229,255,0.12)] text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                    : ""
                )}
              >
                {item.icon}
              </span>
              <span
                className={cn(
                  "text-[8px] font-bold tracking-tight uppercase",
                  active ? "text-[#00e5ff]" : "text-slate-500"
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
