"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowRight, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FlatNavItem {
  id: string;
  label: string;
  category: string;
  parentLabel?: string;
  href: string;
  icon?: React.ReactNode;
}

interface NavCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: FlatNavItem[];
}

export function NavCommandPalette({ isOpen, onClose, items }: NavCommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened & reset state
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter items based on query
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.parentLabel && item.parentLabel.toLowerCase().includes(q))
    );
  }, [items, query]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector<HTMLElement>(
        `[data-index="${selectedIndex}"]`
      );
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          router.push(filtered[selectedIndex].href);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, router, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:pt-20">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[rgba(0,229,255,0.25)] bg-[#050914] shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(0,229,255,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="relative flex items-center border-b border-white/[0.08] px-4 py-3.5">
              <Search className="h-5 w-5 shrink-0 text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cualquier página, herramienta o reporte..."
                className="ml-3 flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-slate-300"
                  aria-label="Borrar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="hidden items-center gap-1 rounded border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline-flex">
                  ESC
                </kbd>
              )}
            </div>

            {/* Results List */}
            <div
              ref={listRef}
              className="custom-scrollbar max-h-[380px] space-y-1 overflow-y-auto p-2"
            >
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No se encontraron páginas para &ldquo;
                  <span className="text-slate-300">{query}</span>&rdquo;
                </div>
              ) : (
                filtered.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={index}
                      type="button"
                      onClick={() => {
                        router.push(item.href);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150 outline-none",
                        isSelected
                          ? "border border-[rgba(0,229,255,0.3)] bg-[rgba(0,229,255,0.12)] text-white shadow-[0_0_15px_rgba(0,229,255,0.1)]"
                          : "border border-transparent text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                            isSelected
                              ? "bg-[rgba(0,229,255,0.2)] text-[#00e5ff]"
                              : "bg-white/[0.04] text-slate-500 group-hover:text-slate-300"
                          )}
                        >
                          {item.icon}
                        </span>

                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-medium",
                                isSelected && "font-semibold text-white"
                              )}
                            >
                              {item.label}
                            </span>
                            {item.parentLabel && (
                              <span className="text-[11px] text-slate-500">
                                en {item.parentLabel}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] tracking-wider text-slate-500 uppercase">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 pl-2">
                        {isSelected ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-[#00e5ff]">
                            Abrir <CornerDownLeft className="h-3 w-3" />
                          </span>
                        ) : (
                          <ArrowRight className="h-3.5 w-3.5 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#03060f] px-4 py-2.5 text-[11px] text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-white/[0.06] px-1 py-0.5 text-[10px] text-slate-400">
                    ↑
                  </kbd>
                  <kbd className="rounded bg-white/[0.06] px-1 py-0.5 text-[10px] text-slate-400">
                    ↓
                  </kbd>
                  Navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">
                    ↵
                  </kbd>
                  Seleccionar
                </span>
              </div>
              <span>{filtered.length} accesos disponibles</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
