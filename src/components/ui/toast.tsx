"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, "variant">> {
  id: string;
  title?: string;
  description?: string;
  duration: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  push: (opts: ToastOptions | string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let externalPush: ((opts: ToastOptions | string) => string) | null = null;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback<ToastContextValue["push"]>(
    (opts) => {
      const normalized: ToastOptions =
        typeof opts === "string" ? { description: opts } : opts || {};
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const safeTitle =
        typeof normalized.title === "string"
          ? normalized.title
          : normalized.title
            ? String(normalized.title)
            : undefined;
      const safeDescription =
        typeof normalized.description === "string"
          ? normalized.description
          : normalized.description
            ? typeof normalized.description === "object" &&
              normalized.description !== null &&
              "message" in (normalized.description as Record<string, unknown>)
              ? String((normalized.description as Record<string, unknown>).message)
              : JSON.stringify(normalized.description)
            : undefined;

      const item: ToastItem = {
        id,
        title: safeTitle,
        description: safeDescription,
        variant: normalized.variant ?? "info",
        duration: normalized.duration ?? 5000,
      };
      setToasts((prev) => [...prev, item]);
      if (item.duration > 0) {
        setTimeout(() => dismiss(id), item.duration);
      }
      return id;
    },
    [dismiss]
  );

  React.useEffect(() => {
    externalPush = push;
    return () => {
      externalPush = null;
    };
  }, [push]);

  const value = React.useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      toast: (opts: ToastOptions | string) => {
        if (externalPush) return externalPush(opts);
        if (typeof window !== "undefined") {
          // Last resort fallback to avoid swallowing errors silently
          console.warn("[toast] called outside ToastProvider:", opts);
        }
        return "";
      },
      dismiss: () => {},
    };
  }
  return { toast: ctx.push, dismiss: ctx.dismiss };
}

/**
 * Imperative API for callsites without easy access to hooks.
 * Requires <ToastProvider /> mounted somewhere in the tree.
 */
export const toast = (opts: ToastOptions | string): string => {
  if (externalPush) return externalPush(opts);
  if (typeof window !== "undefined") {
    console.warn("[toast] No ToastProvider mounted yet:", opts);
  }
  return "";
};

const VARIANT_STYLES: Record<
  ToastVariant,
  { wrap: string; icon: React.ReactNode; role: "status" | "alert" }
> = {
  success: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100",
    icon: (
      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
    ),
    role: "status",
  },
  error: {
    wrap: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100",
    icon: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />,
    role: "alert",
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100",
    icon: (
      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
    ),
    role: "alert",
  },
  info: {
    wrap: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-100",
    icon: <Info className="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />,
    role: "status",
  },
};

function Toaster() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) return null;
  const { toasts, dismiss } = ctx;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-4 sm:right-4 sm:bottom-4 sm:left-auto sm:items-end"
    >
      {toasts.map((t) => {
        const cfg = VARIANT_STYLES[t.variant];
        return (
          <div
            key={t.id}
            role={cfg.role}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ring-1 ring-black/5 transition-all",
              cfg.wrap
            )}
          >
            <div className="mt-0.5 shrink-0">{cfg.icon}</div>
            <div className="flex-1 text-sm">
              {t.title && <div className="leading-tight font-semibold">{t.title}</div>}
              {t.description && (
                <div className={cn("leading-snug", t.title ? "mt-0.5 opacity-90" : "")}>
                  {t.description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar notificación"
              className="-mt-1 -mr-1 rounded-md p-1 text-current/70 transition hover:text-current focus-visible:ring-2 focus-visible:ring-current/40 focus-visible:outline-none"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
