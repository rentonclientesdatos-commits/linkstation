# Phase A — Verify VPS rebuild

**Tiempo:** 5-15 min
**Bloquea:** TODO lo demás (necesitamos saber que el commit `259b7e4` quedó verde en VPS antes de seguir).
**Status inicial:** ya verificado parcialmente (curl smoke OK al cierre de sesión anterior). Re-verificar con Playwright.

## Pre-requisitos

- Branch `developer` al día con `origin` (último commit local `259b7e4` o posterior).
- Autodeploy Dokploy habilitado.

## Pasos

### A.1 — Smoke HTTP

```bash
curl -sS -m 10 -o /dev/null -w "HTTP %{http_code}\n" "https://dev.linkstation.ai/login"
# Esperado: HTTP 200

curl -sS -m 10 -H "apikey: <ANON_KEY>" -o /dev/null -w "HTTP %{http_code}\n" \
  "https://dev.linkstation.ai/supabase/auth/v1/health"
# Esperado: HTTP 200
```

Si cualquiera no es 2xx → BLOCK, revisar logs Dokploy + reportar en execution-log.md.

### A.2 — Playwright smoke

Login + navegar a páginas problemáticas. Verificar 0 errors en consola.

```javascript
mcp__plugin_playwright_playwright__browser_navigate({
  url: "https://dev.linkstation.ai/login",
});
mcp__plugin_playwright_playwright__browser_fill_form({
  fields: [
    {
      target: "<email_ref>",
      name: "Email",
      type: "textbox",
      value: "LinkStation@gmail.com",
    },
    { target: "<pwd_ref>", name: "Contraseña", type: "textbox", value: "BeaOli#AF*2026!" },
  ],
});
mcp__plugin_playwright_playwright__browser_click({
  target: "<submit_ref>",
  element: "Iniciar sesión",
});
// Esperado: URL → /dashboard

// Navegar a /dashboard/conversaciones
mcp__plugin_playwright_playwright__browser_navigate({
  url: "https://dev.linkstation.ai/dashboard/conversaciones",
});
mcp__plugin_playwright_playwright__browser_console_messages({ level: "error" });
// Esperado: 0 errors (antes del fix: throw "Missing NEXT_PUBLIC_SUPABASE_URL")
```

Screenshot: `docs/screenshots/phaseA-vps-conversaciones-post-fix.png`.

### A.3 — Decisión

| Resultado                                          | Acción                                                                                                                                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| /conversaciones carga + 0 console errors           | ✅ Phase A DONE → proceder a Phase B                                                                                                                                                           |
| /conversaciones carga pero alerts pop-up al cargar | ✅ Phase A DONE (los alerts son bug de Phase B). Documentar y seguir.                                                                                                                          |
| /conversaciones aún "This page couldn't load"      | ❌ BLOCK. Verificar logs Dokploy. ¿Build Args aún sin NEXT_PUBLIC_SUPABASE_URL? Forzar rebuild manual desde panel Dokploy. Si tras 2 intentos sigue fallando: `git revert 259b7e4` + reportar. |
| Login falla                                        | ❌ BLOCK. Algo se rompió en el deploy. Diagnosticar antes de seguir.                                                                                                                           |

## Output

Actualizar `execution-log.md`:

```markdown
## Phase A — Verify VPS rebuild

- Started: <ts>
- Ended: <ts>
- Status: DONE | BLOCKED
- Smoke HTTP: <resultados>
- Playwright smoke: <screenshot path>
- Console errors: <count + detalles>
- Decision: <proceder | blocked>
```
