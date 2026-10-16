"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  FileText,
  Wine,
  Utensils,
  Plus,
  Minus,
  Check,
  ExternalLink,
  Sparkles,
  ShoppingBag,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderItem } from "@/types/pedidos";
import { formatCLP } from "@/lib/mock-pedidos-data";

export interface KnowledgeMenuDocument {
  id: string;
  name: string;
  description: string;
  fileUrl: string;
  type: "comida" | "tragos" | "general";
  itemsCount: number;
  items: Array<{
    id: string;
    name: string;
    category: "entrante" | "principal" | "postre" | "bebida" | "especial";
    price: number;
    description?: string;
  }>;
}

interface PDFMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tableNumber: number;
  currentItems: OrderItem[];
  onUpdateItems: (newItems: OrderItem[]) => void;
}

export const PDFMenuModal: React.FC<PDFMenuModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  tableNumber,
  currentItems,
  onUpdateItems,
}) => {
  const [documents, setDocuments] = useState<KnowledgeMenuDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state for items in order to allow quick additions/removals
  const [orderItems, setOrderItems] = useState<OrderItem[]>(currentItems);

  // Sync with currentItems when opening
  useEffect(() => {
    if (isOpen) {
      setOrderItems(currentItems);
      setSearchQuery("");
      setSelectedCategory("all");
    }
  }, [isOpen, currentItems]);

  // Fetch knowledge base documents with items
  useEffect(() => {
    if (!isOpen || !tenantId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(`/api/restaurant/knowledge-menus?tenantId=${tenantId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al consultar las cartas en la base de conocimiento");
        return res.json();
      })
      .then((data: { documents?: KnowledgeMenuDocument[] }) => {
        if (!isMounted) return;
        const docs = data.documents || [];
        setDocuments(docs);
        if (docs.length > 0 && !selectedDocId) {
          // Select first document by default
          setSelectedDocId(docs[0].id);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Error al cargar las cartas");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, tenantId]);

  const activeDoc = useMemo(() => {
    return documents.find((d) => d.id === selectedDocId) || documents[0] || null;
  }, [documents, selectedDocId]);

  // Filter items in active document by search query and category
  const filteredItems = useMemo(() => {
    if (!activeDoc) return [];
    return activeDoc.items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === "all" || item.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [activeDoc, searchQuery, selectedCategory]);

  // Map of item name -> quantity in current order
  const itemQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const oi of orderItems) {
      map[oi.name.toLowerCase().trim()] = (map[oi.name.toLowerCase().trim()] || 0) + oi.quantity;
    }
    return map;
  }, [orderItems]);

  const handleAddItem = (dish: {
    id: string;
    name: string;
    category: OrderItem["category"];
    price: number;
    description?: string;
  }) => {
    const cleanName = dish.name.trim();
    const existingIndex = orderItems.findIndex(
      (i) => i.name.toLowerCase().trim() === cleanName.toLowerCase()
    );

    let updated: OrderItem[];
    if (existingIndex >= 0) {
      updated = orderItems.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      const newItem: OrderItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        category: dish.category,
        quantity: 1,
        unitPrice: dish.price,
      };
      updated = [...orderItems, newItem];
    }
    setOrderItems(updated);
    onUpdateItems(updated);
  };

  const handleRemoveItem = (dishName: string) => {
    const cleanName = dishName.trim().toLowerCase();
    const existingIndex = orderItems.findIndex(
      (i) => i.name.toLowerCase().trim() === cleanName
    );

    if (existingIndex < 0) return;

    let updated: OrderItem[];
    if (orderItems[existingIndex].quantity > 1) {
      updated = orderItems.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: item.quantity - 1 } : item
      );
    } else {
      updated = orderItems.filter((_, idx) => idx !== existingIndex);
    }
    setOrderItems(updated);
    onUpdateItems(updated);
  };

  const totalQuantity = useMemo(() => {
    return orderItems.reduce((acc, i) => acc + i.quantity, 0);
  }, [orderItems]);

  const totalAmount = useMemo(() => {
    return orderItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  }, [orderItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                Carta Digital & Pedido
                <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400">
                  Mesa {tableNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona la carta en PDF para cargar lo que está pidiendo el cliente.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SELECTOR DE DOCUMENTOS PDF (TABS PRINCIPALES) */}
        <div className="border-b border-slate-800/80 bg-slate-950/40 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="mr-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Cartas PDF:
            </span>

            {isLoading && documents.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                <span>Cargando cartas desde la base de conocimiento...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>No se encontraron cartas en PDF cargadas.</span>
              </div>
            ) : (
              documents.map((doc) => {
                const isSelected = activeDoc?.id === doc.id;
                const isTrago = doc.type === "tragos";

                return (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setSelectedCategory("all");
                    }}
                    className={cn(
                      "group relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                      isSelected
                        ? isTrago
                          ? "border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30"
                          : "border border-indigo-500/40 bg-indigo-500/15 text-indigo-300 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                        : "border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:bg-slate-850 hover:text-slate-200"
                    )}
                  >
                    {isTrago ? (
                      <Wine className={cn("h-4 w-4", isSelected ? "text-amber-400" : "text-slate-400")} />
                    ) : (
                      <FileText
                        className={cn("h-4 w-4", isSelected ? "text-indigo-400" : "text-slate-400")}
                      />
                    )}

                    <span className="capitalize">{doc.name}</span>

                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        isSelected
                          ? isTrago
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-indigo-500/20 text-indigo-300"
                          : "bg-slate-800 text-slate-500"
                      )}
                    >
                      {doc.itemsCount}
                    </span>
                  </button>
                );
              })
            )}

            {activeDoc?.fileUrl && (
              <a
                href={activeDoc.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 transition-colors hover:text-indigo-400"
              >
                <span>Ver PDF original</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* SEARCH & CATEGORY BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Buscar en ${activeDoc?.name || "la carta"} (ej. mojito, hamburguesa, gin)...`}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pr-4 pl-9 text-xs text-white placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-white"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Categorías */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {[
              { id: "all", label: "Todos" },
              { id: "principal", label: "Principales" },
              { id: "entrante", label: "Entrantes" },
              { id: "bebida", label: "Tragos / Bebidas" },
              { id: "postre", label: "Postres" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "border border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ITEMS LIST */}
        <div className="flex-1 overflow-y-auto p-6">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <AlertCircle className="mb-2 h-8 w-8 text-rose-400" />
              <p className="text-sm font-medium text-rose-300">{error}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Search className="mb-2 h-8 w-8 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">
                {searchQuery
                  ? `No se encontraron resultados para "${searchQuery}"`
                  : "No hay productos en esta categoría"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Prueba con otro término de búsqueda o selecciona otra carta arriba.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
                const inOrderQty = itemQuantities[item.name.toLowerCase().trim()] || 0;
                const isDrink = item.category === "bebida";

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex flex-col justify-between rounded-xl border p-3.5 transition-all",
                      inOrderQty > 0
                        ? "border-indigo-500/50 bg-indigo-950/20 shadow-md ring-1 ring-indigo-500/30"
                        : "border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-950"
                    )}
                  >
                    <div className="mb-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-200 text-sm leading-snug">
                          {item.name}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            isDrink
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-indigo-500/20 text-indigo-300"
                          )}
                        >
                          {item.category}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-slate-800/60 pt-2.5">
                      <span className="text-sm font-extrabold text-emerald-400">
                        {formatCLP(item.price)}
                      </span>

                      {/* Botón / Contador de cantidad */}
                      {inOrderQty > 0 ? (
                        <div className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/60 p-0.5">
                          <button
                            onClick={() => handleRemoveItem(item.name)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-slate-300 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
                            title="Quitar 1"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[20px] text-center text-xs font-bold text-white">
                            {inOrderQty}
                          </span>
                          <button
                            onClick={() => handleAddItem(item)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white transition-colors hover:bg-indigo-500"
                            title="Agregar otro"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddItem(item)}
                          className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 transition-all hover:border-indigo-500 hover:bg-indigo-600 hover:text-white"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Agregar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER BAR WITH ORDER SUMMARY */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">En pedido:</span>
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">
                  {totalQuantity} {totalQuantity === 1 ? "ítem" : "ítems"}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-slate-500">Total mesa:</span>
                <span className="text-base font-black text-emerald-400">
                  {formatCLP(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500"
          >
            <Check className="h-4 w-4" />
            <span>Confirmar y Volver a la Mesa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
