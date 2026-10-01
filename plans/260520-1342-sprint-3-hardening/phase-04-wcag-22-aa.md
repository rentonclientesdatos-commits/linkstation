---
title: "Phase 04 — WCAG 2.2 AA Refactor (4-05) — 24 findings DA-5"
sprint: 4
phase: 4
tasks: [4-05]
effort: 28-40h
status: pending
agents: [af-agents:uxui, af-agents:code]
---

# Phase 04 — WCAG 2.2 AA Refactor

## Context Links

- Plan overview: [plan.md](plan.md)
- RoadMap: [RoadMap.md](../RoadMap.md) línea 332 (4-05)
- Fuente de verdad: [DA-5-accessibility.md](../../docs/audit/deep/DA-5-accessibility.md) — 24 findings completos
- Researcher report: [researcher-wcag-hardening-d-20260520.md](../reports/researcher-wcag-hardening-d-20260520.md) — sección 1
- Deep findings: [DEEP-FINDINGS-SUMMARY.md](../../docs/audit/deep/DEEP-FINDINGS-SUMMARY.md) — DA-5 summary

## Overview

- **Priority:** P1
- **Status:** Pendiente
- **Descripción:** Corregir los 24 findings de accesibilidad identificados en el audit DA-5. La app actualmente es NON-COMPLIANT con WCAG 2.1 AA. El objetivo es alcanzar Lighthouse a11y score ≥ 90 y resolver todos los findings Critical antes del lanzamiento v0.3.0.

## Key Insights

- **shadcn Dialog ya está en el proyecto** — migrar los 4 modales manuales resuelve 3 findings Critical (DA-5-013, 014, 023) con un cambio de componente
- **sonner** para toasts: resolver DA-5-024 (alert() → toast) y DA-5-022 (confirm() → modal)
- **Quick wins**: DA-5-017 (skip link), DA-5-007 (autocomplete), DA-5-015 (tr tabIndex), DA-5-006 (div→button), DA-5-002 (aria-hidden) = ~3h para 5 findings
- **DA-5-012** (AIAgentInbox responsive 3 columnas): esfuerzo L (8-12h) — última prioridad, puede cortarse si sprint tensiona
- DA-5-010 (contraste opacity fraccional): afecta 25+ ubicaciones — trabajo mecánico pero extenso (~3-4h)
- Los tests E2E de accesibilidad (Ph1) verifican estos fixes — Ph4 debe completarse para que Ph1 WCAG tests sean válidos

## Requirements

### Funcionales — por severidad

**Critical (6 findings — OBLIGATORIOS para v0.3.0):**

- DA-5-003: Labels con htmlFor/id en CreateLeadDialog (9 campos)
- DA-5-013: Focus trap modales AIAgentInbox (3 modales inline)
- DA-5-014: Focus trap + Escape en modal HistorialTable
- DA-5-015: `<tr>` teclado-accesibles en HistorialTable
- DA-5-023: `role="dialog"` + `aria-modal` en 4 modales
- Resolver también DA-5-021 (alert() → errores inline con ARIA) — High pero ligado a Critical

**High (9 findings — requeridos para score ≥ 90):**

- DA-5-001: alt descriptivo imágenes de lead
- DA-5-004: `<tr onClick>` semántica interactiva
- DA-5-006: `<div onClick>` → `<button>` en agents
- DA-5-008: estados llamada con icono (no solo color)
- DA-5-010: contraste opacity fraccional (25+ ubicaciones)
- DA-5-012: responsive AIAgentInbox (P2 — puede cortarse)
- DA-5-016: outline-none + ring invisible (187 inputs)
- DA-5-017: skip to main content
- DA-5-018: títulos de página únicos por ruta

**Medium (6 findings) + Low (1):** Completar tras Critical + High.

### No funcionales

- Sin regresiones visuales en componentes modificados
- Verificación con `@axe-core/playwright` en E2E (Ph1) y Lighthouse CLI manual

## Architecture

### Componentes afectados (agrupados para implementación eficiente)

```
Orden de implementación recomendado:

1. QUICK WINS (3-4h total) — alto impacto, bajo riesgo
   - DashboardShell.tsx: skip link (DA-5-017)
   - login/page.tsx + reset-password: autocomplete (DA-5-007)
   - HistorialTable.tsx: tabIndex en <tr> (DA-5-015 + DA-5-004 parcial)
   - agents/page.tsx:263: div→button (DA-5-006)
   - Sidebar.tsx: aria-hidden SVGs (DA-5-002)

2. SISTEMA TOASTS + SONNER (3-4h)
   - Instalar sonner via shadcn
   - Reemplazar todos los alert() por toast.error()/toast.success()
   - Reemplazar window.confirm() por modal de confirmación reutilizable
   → Resuelve DA-5-024, DA-5-022, DA-5-021 (parcial)

3. MIGRAR MODALES A shadcn Dialog (8-12h)
   - CreateLeadDialog.tsx → usar <Dialog> de shadcn/radix
   - HistorialTable.tsx modal → usar <Dialog> de shadcn/radix
   - AIAgentInbox.tsx 3 modales inline → usar <Dialog>
   → Resuelve DA-5-013, DA-5-014, DA-5-023 (Critical)
   → Añadir htmlFor/id en CreateLeadDialog (DA-5-003)

4. CONTRASTE Y VISUAL (4-6h)
   - globals.css: nueva variable --secondary-text
   - Buscar/reemplazar text-*-foreground/XX → text-[--secondary-text]
   - Añadir iconos a badges de estado llamada (DA-5-008)
   - WhatsApp dot: aria-label (DA-5-009)
   → Resuelve DA-5-010, DA-5-008, DA-5-009

5. TÍTULOS Y METADATA (2h)
   - Exportar metadata en cada page.tsx del dashboard
   → Resuelve DA-5-018

6. RESTO MEDIUM/LOW (3-4h)
   - DA-5-005: jerarquía headings
   - DA-5-011: tamaños texto mínimos
   - DA-5-019: aria-label en icon-only buttons
   - DA-5-020: lang="en" en bloques inglés
   - DA-5-016: ring visible en inputs nativos

7. DA-5-012: RESPONSIVE AIAgentInbox (8-12h) — última prioridad
   - Layout 3 columnas → responsive con drawer en mobile
   - CORTAR si sprint tensiona
```

## Related Code Files

### Modificar

- `src/components/layout/DashboardShell.tsx` — DA-5-017 skip link
- `src/app/layout.tsx` — DA-5-018 metadata root, DA-5-017 id="main-content"
- `src/app/login/page.tsx` — DA-5-007 autocomplete, DA-5-021 role=alert
- `src/app/auth/reset-password/page.tsx` — DA-5-007
- `src/app/globals.css` — DA-5-010 --secondary-text variable
- `src/components/historial/HistorialTable.tsx` — DA-5-004, 014, 015, 016
- `src/components/historial/CreateLeadDialog.tsx` — DA-5-003, 021, 023
- `src/components/historial/DuplicateLeadDialog.tsx` — DA-5-023
- `src/components/agents/AIAgentInbox.tsx` — DA-5-001, 009, 012, 013, 016
- `src/app/dashboard/agents/page.tsx` — DA-5-005, 006
- `src/app/dashboard/calendar/page.tsx` — DA-5-005, 019, 022
- `src/app/dashboard/settings/IntegrationsManager.tsx` — DA-5-020
- `src/components/layout/Sidebar.tsx` — DA-5-002
- Todas las `src/app/dashboard/*/page.tsx` — DA-5-018 metadata
- `src/components/historial/` — DA-5-008 badges de estado

### Crear

- `src/components/ui/confirm-dialog.tsx` — hook `useConfirmDialog` centralizado
- `src/app/dashboard/agents/page.tsx` — metadata export
- (todos los page.tsx del dashboard) — metadata exports

## Implementation Steps — detallados por DA-5-XXX

### GRUPO 1: Quick wins

**DA-5-017 — Skip link (30min)**

```tsx
// DashboardShell.tsx — añadir como primer hijo
<a
  href="#main-content"
  className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:rounded-xl focus:px-4 focus:py-2"
>
  Saltar al contenido principal
</a>
// Añadir id="main-content" al <main>
```

**DA-5-007 — autocomplete (15min)**

```tsx
// login/page.tsx
<Input type="email" autoComplete="email" ... />
<Input type="password" autoComplete="current-password" ... />
// reset-password
<Input type="password" autoComplete="new-password" ... />
```

**DA-5-015 — tr teclado (45min)**

```tsx
// HistorialTable.tsx — cada <tr onClick>
<tr
  tabIndex={0}
  role="button"
  aria-label={`Ver detalle de ${row.nombre}`}
  onClick={handleClick}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
>
```

**DA-5-006 — div→button (30min)**

```tsx
// agents/page.tsx:263
<button
  type="button"
  className="w-full text-left cursor-pointer ..."
  onClick={() => setSelectedAgent(agent)}
  aria-pressed={selectedAgent?.id === agent.id}
>
```

**DA-5-002 — aria-hidden SVGs (20min)**

```tsx
// Sidebar.tsx
<svg aria-hidden="true" focusable="false" ...>
// Botón colapsar: aria-label="Colapsar sidebar"
<button aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"} title="...">
```

### GRUPO 2: Sistema toasts sonner

```bash
npx shadcn@latest add sonner
```

En `layout.tsx` añadir `<Toaster />`.

Reemplazar todas las instancias de `alert(...)` por:

```typescript
import { toast } from "sonner";
// ANTES: alert("Error: Nombre y Teléfono son obligatorios")
// DESPUÉS:
toast.error("Nombre y Teléfono son obligatorios");
```

Crear `src/components/ui/confirm-dialog.tsx`:

```tsx
// Hook reutilizable para reemplazar window.confirm()
export function useConfirmDialog() {
  const [state, setState] = useState({ open: false, resolve: null });

  const confirm = (message: string) =>
    new Promise((resolve) => {
      setState({ open: true, message, resolve });
    });

  const ConfirmDialog = () => (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) state.resolve?.(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar acción</DialogTitle>
        </DialogHeader>
        <p>{state.message}</p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              state.resolve?.(false);
              setState((s) => ({ ...s, open: false }));
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              state.resolve?.(true);
              setState((s) => ({ ...s, open: false }));
            }}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, ConfirmDialog };
}
```

### GRUPO 3: Migrar modales a shadcn Dialog

```bash
npx shadcn@latest add dialog
```

Para CADA modal manual (`fixed inset-0 z-[100]`):

1. Reemplazar estructura con `<Dialog>` + `<DialogContent>` + `<DialogHeader>` + `<DialogTitle>`
2. Radix automáticamente añade: `role="dialog"`, `aria-modal="true"`, focus trap, Escape handler
3. El `<DialogTitle>` sirve como `aria-labelledby` automáticamente

Estructura target:

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="...">
    <DialogHeader>
      <DialogTitle id="create-lead-title">Agregar Nuevo Lead</DialogTitle>
    </DialogHeader>
    {/* formulario con labels htmlFor */}
  </DialogContent>
</Dialog>
```

**DA-5-003 — htmlFor en CreateLeadDialog:**
Junto con la migración a Dialog, añadir id+htmlFor a todos los 9 campos del formulario.

### GRUPO 4: Contraste y visual

**DA-5-010 — globals.css:**

```css
:root {
  --secondary-text: #5a6475;
}
.dark {
  --secondary-text: #a8b4c8;
}
```

Buscar/reemplazar `text-muted-foreground/[0-9]` → `text-[--secondary-text]` o color fijo.

**DA-5-008 — badges estado:**

```tsx
const callStatusConfig = {
  CONTACTED: {
    label: "Contactado",
    icon: <CheckCircle />,
    className: "bg-green-100 text-green-800",
  },
  NO_CONTACT: { label: "No contactado", icon: <Clock />, className: "bg-amber-100 text-amber-800" },
  ANNULLED: { label: "Anulado", icon: <XCircle />, className: "bg-red-100 text-red-800" },
};
// Renderizar: <Badge>{config.icon} {config.label}</Badge>
```

### GRUPO 5: Títulos de página (DA-5-018)

En cada `src/app/dashboard/*/page.tsx`:

```typescript
export const metadata: Metadata = {
  title: "Historial — LinkStation",
};
// O para títulos dinámicos:
export async function generateMetadata({ params }): Promise<Metadata> {
  return { title: `Agente ${params.id} — LinkStation` };
}
```

### GRUPO 6: DA-5-012 — Responsive AIAgentInbox (si tiempo)

Convertir layout 3 columnas fijo en:

- Mobile (< md): lista conversaciones → al seleccionar → chat full-width
- Panel detalles: drawer inferior en mobile, columna derecha en desktop
- Usar patrón `useState` para `activeMobileView: 'list' | 'chat' | 'details'`

## Todo List

**Critical (obligatorio v0.3.0):**

- [ ] DA-5-017: Skip link DashboardShell.tsx
- [ ] DA-5-007: autocomplete login + reset-password
- [ ] DA-5-006: div→button agents/page.tsx:263
- [ ] DA-5-015: tr tabIndex+onKeyDown HistorialTable.tsx
- [ ] DA-5-002: aria-hidden SVGs Sidebar.tsx
- [ ] Instalar sonner via shadcn
- [ ] Reemplazar todos los alert() por toast.\*
- [ ] Crear useConfirmDialog hook
- [ ] Reemplazar todos los window.confirm() por useConfirmDialog
- [ ] Instalar Dialog via shadcn (si no instalado)
- [ ] Migrar CreateLeadDialog a shadcn Dialog
- [ ] Migrar HistorialTable modal a shadcn Dialog
- [ ] Migrar 3 modales inline AIAgentInbox a shadcn Dialog
- [ ] DA-5-003: htmlFor/id en 9 campos CreateLeadDialog
- [ ] DA-5-021: errores inline con aria-invalid + aria-describedby
- [ ] DA-5-023: verificar role=dialog en modales migrados (auto con shadcn)

**High:**

- [ ] DA-5-001: alt descriptivo imágenes lead AIAgentInbox.tsx
- [ ] DA-5-004: semántica interactiva tr HistorialTable
- [ ] DA-5-008: iconos + labels español en badges estado
- [ ] DA-5-009: aria-label punto WhatsApp
- [ ] DA-5-010: --secondary-text en globals.css + búsqueda/reemplazo 25+ ubicaciones
- [ ] DA-5-016: ring visible en inputs nativos (review outline-none instances)
- [ ] DA-5-018: metadata title en todas las pages del dashboard

**Medium/Low:**

- [ ] DA-5-005: jerarquía headings (h1→h2 en páginas internas)
- [ ] DA-5-011: text sizes mínimos (auditar text-[8px] → text-xs)
- [ ] DA-5-019: aria-label en icon-only buttons calendar
- [ ] DA-5-020: lang="en" en IntegrationsManager
- [ ] DA-5-024: sonner ya instalado — verificar Toaster en layout

**Opcional (P2):**

- [ ] DA-5-012: responsive AIAgentInbox (solo si tiempo)

**Verificación:**

- [ ] Lighthouse a11y score ≥ 90 en /dashboard, /dashboard/historial, /dashboard/agents
- [ ] `@axe-core/playwright` sin violations Critical en E2E
- [ ] Prueba manual con Tab key en todos los flujos principales
- [ ] Typecheck + build sin errores

## Success Criteria

- Lighthouse a11y score ≥ 90 en todas las rutas del dashboard
- 0 findings Critical de DA-5 sin resolver
- Todos los modales accesibles por teclado: Tab navega dentro, Escape cierra, focus vuelve al trigger
- `alert()` y `window.confirm()` = 0 ocurrencias en codebase (verificar con grep)
- Texto de contenido con contraste ≥ 4.5:1 (verificado con browser DevTools)
- Skip link visible al recibir foco, funcional

## Risk Assessment

| Riesgo                                                          | Prob  | Impacto | Mitigación                                                                                 |
| --------------------------------------------------------------- | ----- | ------- | ------------------------------------------------------------------------------------------ |
| Migración modales a Dialog rompe lógica de estado existente     | Media | Alto    | Refactor incremental por modal; tests manuales después de cada migración                   |
| DA-5-010 búsqueda/reemplazo genera regresiones visuales         | Media | Medio   | Review visual en browser tras cada bloque de cambios; no hacer todo en un solo commit      |
| DA-5-012 responsive desborda el sprint (esfuerzo L)             | Alta  | Bajo    | Marcar como P2, cortar al final sin bloquear el resto                                      |
| sonner rompe estilos existentes (zIndex, portal)                | Baja  | Bajo    | Instalar via shadcn que lo preconfigura; verificar z-index ordering                        |
| Dialog de shadcn + framer-motion (AnimatePresence) en conflicto | Media | Medio   | Eliminar AnimatePresence en modales migrados a Dialog; Dialog ya tiene animaciones propias |

## Security Considerations

- Los cambios son puramente de UI/accesibilidad — sin impacto en lógica de auth o data
- `useConfirmDialog` para acciones destructivas mejora UX y evita accidentalidad — no impacta seguridad directamente
- DA-5-021 (errores inline) mejora UX de login — no exponer información extra en mensajes de error (evitar "email no existe", usar "credenciales incorrectas")

## Next Steps

- Ph1 (Playwright) debe ejecutar sus tests WCAG solo DESPUÉS de que este phase esté completo
- DA-5-012 responsive si no se incluye → crear tech debt item para Sprint 4
- Lighthouse score ≥ 90 como gate de calidad para el PR de cierre Sprint 3
