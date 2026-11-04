"use client";

import { Moon, Sun, Droplets, Leaf, Rocket, Monitor } from "lucide-react";
import { useTheme, Theme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, ElementType } from "react";

const THEMES: { id: Theme; name: string; icon: ElementType; color: string }[] = [
  { id: "light", name: "Día", icon: Sun, color: "bg-amber-400" },
  { id: "dark", name: "Noche", icon: Moon, color: "bg-slate-700" },
  { id: "aqua", name: "Aqua", icon: Droplets, color: "bg-cyan-400" },
  { id: "esmeralda", name: "Esmeralda", icon: Leaf, color: "bg-emerald-500" },
  { id: "space", name: "Espacio", icon: Rocket, color: "bg-indigo-600" },
  { id: "system", name: "Sistema", icon: Monitor, color: "bg-slate-400" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydration-safe mount flag: setState in effect es intencional
    // para diferir render dependiente del tema hasta cliente (evita mismatch SSR/CSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  if (!mounted) {
    return (
      <div className="relative">
        <button className="group relative flex h-10 items-center gap-2 rounded-2xl border border-[rgba(0,229,255,0.1)] bg-[rgba(255,255,255,0.03)] px-3 opacity-50 shadow-sm transition-all">
          <div className="h-4 w-4 rounded-full bg-slate-700" />
          <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
            Cargando...
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group relative flex h-10 items-center gap-2 rounded-2xl border border-[rgba(0,229,255,0.12)] bg-[rgba(255,255,255,0.03)] px-3 shadow-sm transition-all hover:border-[rgba(0,229,255,0.3)] hover:bg-[rgba(255,255,255,0.06)]",
          isOpen && "ring-primary/20 ring-2 border-[rgba(0,229,255,0.35)]"
        )}
        title="Cambiar tema visual"
        aria-label="Abrir selector de temas"
      >
        <div
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white",
            activeTheme.color
          )}
        >
          <activeTheme.icon className="h-2.5 w-2.5" />
        </div>
        <span className="text-[11px] font-black tracking-widest text-slate-300 uppercase transition-colors group-hover:text-[#00e5ff]">
          Tema: {activeTheme.name}
        </span>
      </button>

      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 absolute top-full right-0 z-[100] mt-2 w-48 overflow-hidden rounded-2xl border border-[rgba(0,229,255,0.15)] bg-[rgba(8,12,24,0.95)] shadow-2xl backdrop-blur-2xl">
          <div className="space-y-1 p-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                  theme === t.id
                    ? "bg-primary/10 text-primary"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white"
                )}
                title={`Seleccionar tema ${t.name}`}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-lg text-white",
                    t.color
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-black tracking-widest uppercase">{t.name}</span>
                {theme === t.id && <div className="bg-primary ml-auto h-1.5 w-1.5 rounded-full" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
