# Tests — linkstation

Carpeta de tests E2E (Playwright) del proyecto.

## Estructura

```
tests/
└── e2e/
    ├── core/                # tests transversales (smoke, auth, RLS multi-tenant)
    │   └── smoke.spec.ts    # baseline mínimo: la app responde y no leakea auth
    ├── sprint-0/            # tests específicos del cierre Sprint 0 (SP-1-CLOSE-2)
    └── sprint-N/            # cierre de cada sprint
```

## Comandos

| Comando                       | Qué hace                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `npm run test:e2e`            | Ejecuta todos los tests (modo headless). Requiere `npm run dev` corriendo en paralelo |
| `npm run test:e2e:ui`         | Abre el UI mode de Playwright (interactivo, ideal para depurar)                       |
| `npm run test:e2e:headed`     | Ejecuta tests con browser visible                                                     |
| `npm run test:e2e:report`     | Abre el último HTML report                                                            |
| `npm run test:e2e -- smoke`   | Ejecuta solo los tests con `smoke` en el nombre o ruta                                |
| `npm run test:e2e -- --debug` | Modo debug (pausa, inspector abierto)                                                 |

## Setup local (primera vez)

```powershell
# 1. Arrancar dev server (terminal 1)
npm run db:up
npm run dev

# 2. En otra terminal: ejecutar tests
npm run test:e2e
```

Si los browsers no están instalados (primera vez en una máquina nueva):

```powershell
npx playwright install chromium
```

En máquinas que ya tienen Playwright de otros proyectos, los browsers se reusan automáticamente del cache compartido (`~\AppData\Local\ms-playwright\`).

## Convenciones

1. **Un test por escenario funcional**, no por archivo. Un archivo agrupa tests relacionados.
2. **Test IDs**: usar `data-testid` en componentes UI para selectores estables. Evitar selectores por texto en español (rompen si se traduce).
3. **Tags**: `@core`, `@sprint-0`, `@critical`, `@slow`. Permite ejecutar subsets con `--grep`.
4. **No mocks de Supabase**: integración con BD real (regla CLAUDE.md). Usar tenant de test/seed-demo.
5. **Reset entre tests**: limpiar cookies y estado con `context.clearCookies()` cuando el test asume "no autenticado".
6. **Screenshots/trace**: ya configurados — solo se generan en fallo (no contaminan el repo).

## Output

- `test-results/` — videos, screenshots, traces de fallos (gitignored)
- `playwright-report/` — HTML report (gitignored)

Ambos se regeneran en cada ejecución.

## Cuándo se ejecutan los tests

- **Local manual**: cuando el dev quiere validar antes de un push, o al cerrar fase.
- **Pre-push hook**: NO — son lentos (políticamente local-first). Solo typecheck/lint/build en pre-push.
- **SP-X-CLOSE-2**: cierre de cada sprint, ejecuta el conjunto completo + tests específicos del sprint.
- **CI (Sprint 3+)**: cuando se active GitHub Actions, ejecutará el conjunto core en PRs a `developer`.

## Próximos hitos

- **Sprint 0 SP-1-CLOSE-2**: añadir tests de endpoints protegidos (`/api/orchestration/*` debe responder 401 sin auth) + RLS multi-tenant (cookie `af-tenant-id` manipulada no debe dar acceso cross-tenant).
- **Sprint 3 (hardening)**: añadir firefox + webkit projects, integrar axe-core para WCAG 2.2 AA, ampliar fixtures de login/tenant.
