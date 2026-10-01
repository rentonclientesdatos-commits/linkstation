# TypeScript Standards — linkstation

> Regla absoluta del proyecto: **el código del repo no admite `any`**. ESLint lo bloquea (`@typescript-eslint/no-explicit-any: error`) y husky impide commitear cualquier fichero con `any` explícito.

## ¿Por qué `any` está prohibido?

`any` desactiva el sistema de tipos para esa expresión. Cualquier acceso a propiedad, llamada o asignación pasa sin verificación. Consecuencias reales que hemos sufrido en este proyecto:

- **Bugs silenciosos**: un campo renombrado del backend no rompe en compilación; explota en runtime al primer cliente real.
- **Refactors imposibles**: cambiar un schema obliga a grep manual porque el compilador no sabe quién dependía del tipo.
- **Pre-commit roto**: la regla `no-explicit-any` está como `error`, así que cualquier `any` introducido bloquea el commit (husky → lint-staged → eslint --fix → fail).

## Alternativas a `any` (uso real en el repo)

| Caso                                                             | Alternativa correcta                                                                                                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objeto con keys arbitrarias pero values uniformes                | `Record<string, T>` — ej. `Record<string, unknown>` para JSON genérico                                                                                                          |
| No sabes la forma exacta pero quieres seguridad                  | `unknown` + narrowing con `typeof`, `in`, type guards                                                                                                                           |
| Función genérica que pasa el tipo sin tocarlo                    | Generics — `function identity<T>(x: T): T { return x; }`                                                                                                                        |
| Forma parcialmente conocida (ej. tenant config desde Supabase)   | Interface + cast explícito puntual: `const wa = (cfg.whatsapp ?? {}) as { accessToken?: string; phoneNumberId?: string }`                                                       |
| Props de componente "shape libre" (ej. HealthCard genérico)      | Definir interface dedicada — `interface HealthCardProps { icon: React.ComponentType<{ className?: string }>; title: string; status: string; desc: string; isError?: boolean; }` |
| Datos de librería externa sin types                              | Crear `.d.ts` en `src/types/` con el subset que uses                                                                                                                            |
| Callback genérico (ej. handler de evento BullMQ con shape ancho) | `unknown` + type guard al inicio del handler (ver ejemplo en sección siguiente)                                                                                                 |

## Ejemplo concreto (commit 26-05-2026)

Antes (4 errores ESLint, bloqueaba commit):

```ts
interface SystemLog { id: string; ...; metadata: any; created_at: string; }
const wa = (tenantConfig as any).whatsapp || {};
const aws = (tenantConfig as any).aws || {};
function HealthCard({ icon: Icon, title, status, desc, isError }: any) { ... }
```

Después (typecheck verde + lint verde):

```ts
interface SystemLog { id: string; ...; metadata: Record<string, unknown>; created_at: string; }
const cfg = tenantConfig as Record<string, Record<string, unknown> | undefined>;
const wa = (cfg.whatsapp ?? {}) as { accessToken?: string; phoneNumberId?: string };
const aws = (cfg.aws ?? {}) as { kbId?: string };

interface HealthCardProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    status: string;
    desc: string;
    isError?: boolean;
}
function HealthCard({ icon: Icon, title, status, desc, isError }: HealthCardProps) { ... }
```

## Excepciones

Hay **dos** únicas excepciones justificadas:

1. **Tests** (`tests/**/*.spec.ts`): admitido `as any` en mocks puntuales donde la firma real del lib externo es demasiado restrictiva para el escenario. Anotar siempre con `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- razón concreta`.
2. **Workarounds documentados** con upstream bug abierto (ej. un type de un paquete npm que está mal): añadir comentario con link al issue.

Cualquier otra excepción se rechaza en code review.

## Lint baseline — política

Hasta 25-05-2026 el proyecto toleraba **114 problems en baseline** (mix de `any`, `unused-vars`, `prefer-const`, etc.). **Esa tolerancia se acaba.** A partir de Sprint 3 Hardening:

- ❌ Ningún commit nuevo puede introducir `any` (ya lo bloquea husky).
- ✅ Se abre tarea **SP-4-LINT-ZERO** (RoadMap Sprint 3) para limpiar los 114 problems del baseline en lotes.
- ✅ Cuando un fichero se toca por otra razón (bugfix, feature), **arreglar también sus warnings**. Boy scout rule.
- 🎯 Target: lint baseline 0 problems al cierre del MVP (v0.3.0 GA).

## Cómo verificar antes de commitear

```bash
# Typecheck rápido
npm run typecheck

# Lint con detalle
npm run lint

# Lint solo de tu cambio staged (lo que hace husky pre-commit)
npx lint-staged
```

Si husky bloquea tu commit por `no-explicit-any`:

1. **NO uses `--no-verify`**. Eso está prohibido salvo orden explícita del lead.
2. Lee el error. ESLint te dice fichero+línea+columna.
3. Aplica una de las alternativas de la tabla anterior.
4. `npm run typecheck` para confirmar que el tipo nuevo encaja.
5. Re-commit.

## Referencias

- ESLint rule: <https://typescript-eslint.io/rules/no-explicit-any>
- Type narrowing con `unknown`: <https://www.typescriptlang.org/docs/handbook/2/narrowing.html>
- Política global del repo: `.eslintrc.json` (rule `@typescript-eslint/no-explicit-any: error`)
- Hook husky: `.husky/pre-commit` → `lint-staged`
- Baseline cleanup: tarea `SP-4-LINT-ZERO` en `plans/RoadMap.md`
