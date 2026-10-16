"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MenuProduct,
  Ingredient,
  StockMovement,
  MenuCategory,
  StockUnit,
  StockMovementType,
} from "@/types/pedidos";
import { StockAlertBanner } from "./StockAlertBanner";
import { MenuProductCard } from "./MenuProductCard";
import { MenuProductModal } from "./MenuProductModal";
import { IngredientsTable } from "./IngredientsTable";
import { StockMovementsLog } from "./StockMovementsLog";
import {
  UtensilsCrossed,
  Boxes,
  History,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  ChefHat,
  Database,
  Filter,
  FileUp,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

interface InventoryPanelProps {
  tenantId: string;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ tenantId }) => {
  const [activeTab, setActiveTab] = useState<"menu" | "ingredients" | "movements">("menu");
  const [menu, setMenu] = useState<MenuProduct[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<
    { id: string; name: string; file_url: string | null }[]
  >([]);
  const [_isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<{ count: number; error?: string } | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Filters for Menu
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchMenu, setSearchMenu] = useState<string>("");

  // Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuProduct | null>(null);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [menuRes, ingRes, movRes, kbRes] = await Promise.all([
        fetch(`/api/restaurant/menu?tenantId=${tenantId}`),
        fetch(`/api/restaurant/ingredients?tenantId=${tenantId}`),
        fetch(`/api/restaurant/stock?tenantId=${tenantId}`),
        fetch(`/api/restaurant/knowledge-base?tenantId=${tenantId}`),
      ]);

      if (menuRes.ok) {
        const mData = await menuRes.json();
        setMenu(mData.data || []);
      }
      if (ingRes.ok) {
        const iData = await ingRes.json();
        setIngredients(iData.data || []);
      }
      if (movRes.ok) {
        const moData = await movRes.json();
        setMovements(moData.data || []);
      }
      if (kbRes.ok) {
        const kbData = await kbRes.json();
        setKnowledgeItems(kbData.data || []);
      }
    } catch (e) {
      console.error("[InventoryPanel] Error loading inventory data:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Helper para resolver URL de imagen de KB
  const getKbImageUrl = (kbId?: string) => {
    if (!kbId) return undefined;
    const item = knowledgeItems.find((k) => k.id === kbId);
    return item?.file_url || undefined;
  };

  // ─── PDF PARSER: Cargar carta desde PDF con AI ───────────────────────────
  // Flujo: PDF → Supabase Storage directo (sin pasar por Vercel) → API recibe path
  const handleLoadFromPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    // Reset input so the same file can be re-uploaded if needed
    e.target.value = "";

    setIsParsing(true);
    setParseResult(null);

    try {
      // ── PASO 1: Subir PDF directo a Supabase Storage (evita límite 4.5MB de Vercel) ──
      const supabase = getSupabaseClient();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `menu-uploads/${tenantId}/${Date.now()}_${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("knowledge_base")
        .upload(storagePath, file, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        setParseResult({
          count: 0,
          error: `Error al subir el PDF: ${uploadError.message}`,
        });
        return;
      }

      // ── PASO 2: Llamar al API con solo el path (request liviano) ──
      const res = await fetch("/api/restaurant/parse-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, storagePath }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setParseResult({ count: 0, error: data.error || "Error al procesar el PDF" });
        return;
      }

      setParseResult({ count: data.inserted });
      await loadData();
    } catch (err) {
      setParseResult({
        count: 0,
        error: err instanceof Error ? err.message : "Error inesperado",
      });
    } finally {
      setIsParsing(false);
      // Auto-clear result after 6 seconds
      setTimeout(() => setParseResult(null), 6000);
    }
  };

  // Seed data si no hay nada cargado aún
  const handleSeedDemoData = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      // 1. Insumos básicos
      const sampleIngredients = [
        {
          name: "Carne de Vacuno",
          unit: "kg" as StockUnit,
          stockCurrent: 15,
          stockMin: 3,
          costPerUnit: 7500,
        },
        {
          name: "Pan de Hamburguesa Brioche",
          unit: "unidad" as StockUnit,
          stockCurrent: 45,
          stockMin: 10,
          costPerUnit: 450,
        },
        {
          name: "Queso Cheddar",
          unit: "kg" as StockUnit,
          stockCurrent: 4,
          stockMin: 1.5,
          costPerUnit: 6000,
        },
        {
          name: "Papas Fritas Rústicas",
          unit: "kg" as StockUnit,
          stockCurrent: 20,
          stockMin: 5,
          costPerUnit: 1800,
        },
        {
          name: "Cerveza Artesanal IPA",
          unit: "unidad" as StockUnit,
          stockCurrent: 24,
          stockMin: 8,
          costPerUnit: 1600,
        },
        {
          name: "Vino Cabernet Sauvignon",
          unit: "unidad" as StockUnit,
          stockCurrent: 12,
          stockMin: 4,
          costPerUnit: 4800,
        },
      ];

      const createdIngs: Ingredient[] = [];
      for (const ing of sampleIngredients) {
        const res = await fetch("/api/restaurant/ingredients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId, ...ing }),
        });
        if (res.ok) {
          const d = await res.json();
          if (d.data) createdIngs.push(d.data);
        }
      }

      // 2. Platos con receta BOM
      const carne = createdIngs.find((i) => i.name.includes("Carne"));
      const pan = createdIngs.find((i) => i.name.includes("Pan"));
      const queso = createdIngs.find((i) => i.name.includes("Queso"));
      const papas = createdIngs.find((i) => i.name.includes("Papas"));
      const ipa = createdIngs.find((i) => i.name.includes("IPA"));
      const vino = createdIngs.find((i) => i.name.includes("Vino"));

      const sampleMenu = [
        {
          name: "Hamburguesa Doble Cheddar",
          category: "principal" as MenuCategory,
          price: 9900,
          description:
            "Doble carne vacuna artesanal, abundante cheddar fundido y pan brioche tostado con papas.",
          preparationTime: 18,
          allergens: ["Gluten", "Lácteos"],
          recipe: [
            ...(carne ? [{ ingredientId: carne.id, quantity: 0.25 }] : []),
            ...(pan ? [{ ingredientId: pan.id, quantity: 1 }] : []),
            ...(queso ? [{ ingredientId: queso.id, quantity: 0.08 }] : []),
          ],
        },
        {
          name: "Porción Papas Rústicas con Trufa",
          category: "entrante" as MenuCategory,
          price: 5900,
          description:
            "Papas cortadas a mano crujientes con toque de sal marina y hierbas provenzales.",
          preparationTime: 12,
          allergens: [],
          recipe: papas ? [{ ingredientId: papas.id, quantity: 0.35 }] : [],
        },
        {
          name: "Cerveza Artesanal IPA 500cc",
          category: "bebida" as MenuCategory,
          price: 4500,
          description: "Cerveza lupulada fresca servida en copa fría.",
          preparationTime: 3,
          allergens: ["Gluten"],
          recipe: ipa ? [{ ingredientId: ipa.id, quantity: 1 }] : [],
        },
        {
          name: "Copa Vino Reserva Cabernet",
          category: "bebida" as MenuCategory,
          price: 5200,
          description: "Vino tinto valle del Maipo con notas a frutos rojos y roble.",
          preparationTime: 3,
          allergens: [],
          recipe: vino ? [{ ingredientId: vino.id, quantity: 0.2 }] : [],
        },
      ];

      for (const prod of sampleMenu) {
        await fetch("/api/restaurant/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId, ...prod }),
        });
      }

      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers para Productos
  const handleSaveProduct = async (payload: {
    id?: string;
    name: string;
    description?: string;
    category: MenuCategory;
    price: number;
    isActive: boolean;
    preparationTime: number;
    allergens: string[];
    imageKnowledgeBaseId?: string | null;
    recipe: { ingredientId: string; quantity: number }[];
  }) => {
    if (payload.id) {
      await fetch("/api/restaurant/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, tenantId }),
      });
    } else {
      await fetch("/api/restaurant/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, tenantId }),
      });
    }
    await loadData();
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("¿Deseas eliminar este plato de la carta?")) return;
    await fetch(`/api/restaurant/menu?id=${id}&tenantId=${tenantId}`, {
      method: "DELETE",
    });
    await loadData();
  };

  const handleToggleProductActive = async (product: MenuProduct) => {
    await fetch("/api/restaurant/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: product.id,
        tenantId,
        isActive: !product.isActive,
      }),
    });
    await loadData();
  };

  // Handlers para Ingredientes
  const handleCreateIngredient = async (input: {
    name: string;
    unit: StockUnit;
    stockCurrent: number;
    stockMin: number;
    costPerUnit: number;
  }) => {
    await fetch("/api/restaurant/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, ...input }),
    });
    await loadData();
  };

  const handleUpdateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    await fetch("/api/restaurant/ingredients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, tenantId, ...updates }),
    });
    await loadData();
  };

  const handleAdjustStock = async (
    id: string,
    movementType: StockMovementType,
    quantity: number,
    reason: string
  ) => {
    await fetch("/api/restaurant/ingredients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        tenantId,
        action: "adjust",
        movementType,
        quantity,
        reason,
      }),
    });
    await loadData();
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!confirm("¿Eliminar este insumo? Los platos con esta receta no podrán descontarlo."))
      return;
    await fetch(`/api/restaurant/ingredients?id=${id}&tenantId=${tenantId}`, {
      method: "DELETE",
    });
    await loadData();
  };

  // KPIs
  const totalProducts = menu.length;
  const availableProducts = menu.filter((p) => p.stockStatus !== "agotado").length;
  const lowStockIngredients = ingredients.filter(
    (i) => i.stockStatus === "bajo" || i.stockStatus === "agotado"
  );

  // Filtrado de platos
  const filteredMenu = menu.filter((p) => {
    const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
    const matchesSearch =
      searchMenu === "" ||
      p.name.toLowerCase().includes(searchMenu.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchMenu.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="w-full space-y-6">
      {/* Top Banner Alertas de Stock */}
      <StockAlertBanner
        lowStockItems={lowStockIngredients}
        onRestockClick={() => {
          setActiveTab("ingredients");
        }}
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Platos en Carta
            </span>
            <UtensilsCrossed className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-1 font-mono text-2xl font-extrabold text-white">{totalProducts}</p>
          <span className="text-[11px] font-medium text-emerald-400">
            {availableProducts} disponibles para IA
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Insumos Registrados
            </span>
            <Boxes className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-1 font-mono text-2xl font-extrabold text-white">{ingredients.length}</p>
          <span className="text-[11px] text-slate-400">Control de recetas BOM</span>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Insumos Críticos
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-1 font-mono text-2xl font-extrabold text-amber-400">
            {lowStockIngredients.length}
          </p>
          <span className="text-[11px] text-slate-400">Bajo umbral de alerta</span>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Movimientos Stock
            </span>
            <History className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-1 font-mono text-2xl font-extrabold text-white">{movements.length}</p>
          <span className="text-[11px] text-slate-400">Auditoría inmutable</span>
        </div>
      </div>

      {/* Main Container Header: Tab Switcher & Global Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-1">
          <button
            onClick={() => setActiveTab("menu")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "menu"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Carta de Platos ({totalProducts})
          </button>

          <button
            onClick={() => setActiveTab("ingredients")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "ingredients"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            Insumos & Recetas ({ingredients.length})
          </button>

          <button
            onClick={() => setActiveTab("movements")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "movements"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Historial de Stock
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Resultado del parsing */}
          {parseResult && (
            <span
              className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                parseResult.error
                  ? "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {parseResult.error ? parseResult.error : `${parseResult.count} platos cargados ✓`}
            </span>
          )}

          {/* Botón Cargar Carta desde PDF (siempre visible en tab menu) */}
          {activeTab === "menu" && (
            <>
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleLoadFromPdf}
              />
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={isParsing}
                className="flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Subí el PDF de tu carta y la IA extrae todos los platos automáticamente"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Procesando carta...
                  </>
                ) : (
                  <>
                    <FileUp className="h-3.5 w-3.5" />
                    Cargar Carta desde PDF
                  </>
                )}
              </button>
            </>
          )}

          {/* Demo fallback solo cuando está vacío */}
          {totalProducts === 0 && ingredients.length === 0 && !isParsing && (
            <button
              onClick={handleSeedDemoData}
              className="flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
              title="Carga datos de ejemplo para ver cómo funciona el panel"
            >
              <Database className="h-3.5 w-3.5" /> Demo
            </button>
          )}

          <button
            onClick={handleRefresh}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            title="Actualizar datos"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          {activeTab === "menu" && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" /> Nuevo Plato
            </button>
          )}
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === "menu" && (
        <div className="space-y-4">
          {/* Sub-header: Categories and Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "Todos" },
                { id: "entrante", label: "Entrantes" },
                { id: "principal", label: "Principales" },
                { id: "postre", label: "Postres" },
                { id: "bebida", label: "Bebidas" },
                { id: "especial", label: "Especiales" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedCategory === cat.id
                      ? "border border-slate-700 bg-slate-800 text-white"
                      : "border border-transparent bg-slate-950/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px]">
              <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar plato..."
                value={searchMenu}
                onChange={(e) => setSearchMenu(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-1.5 pr-3 pl-9 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Grid de Platos */}
          {filteredMenu.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-12 text-center">
              <ChefHat className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <h4 className="text-sm font-bold text-white">No hay platos en esta vista</h4>
              <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
                Crea tu primer plato con receta BOM o usa &quot;Cargar Carta Demo Fudo&quot; para
                comenzar con productos de ejemplo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredMenu.map((prod) => (
                <MenuProductCard
                  key={prod.id}
                  product={prod}
                  imageUrl={getKbImageUrl(prod.imageKnowledgeBaseId)}
                  onEdit={(p) => {
                    setEditingProduct(p);
                    setIsProductModalOpen(true);
                  }}
                  onDelete={handleDeleteProduct}
                  onToggleActive={handleToggleProductActive}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "ingredients" && (
        <IngredientsTable
          ingredients={ingredients}
          onCreateIngredient={handleCreateIngredient}
          onUpdateIngredient={handleUpdateIngredient}
          onAdjustStock={handleAdjustStock}
          onDeleteIngredient={handleDeleteIngredient}
        />
      )}

      {activeTab === "movements" && <StockMovementsLog movements={movements} />}

      {/* Modal Crear / Editar Plato */}
      <MenuProductModal
        product={editingProduct}
        availableIngredients={ingredients}
        knowledgeItems={knowledgeItems}
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
      />
    </div>
  );
};
