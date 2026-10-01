---
title: "Sprint Validación Pre-MVP (SP-4B) — Equipo Renzo"
sprint_id: SP-4B
version_target: v0.3.0 (MVP GA — detonado por el cierre de este sprint, rebajado desde v0.4.0)
branch: feature/sprint-03b-validacion-pre-mvp
assigned_to: Renzo + equipo de desarrollo Renzo
created: 22-05-2026 17:00 por Javi HP
last_updated: 24-05-2026 (estructura ampliada tras research R3 — phase-03 dividida en 03a+03b, phase-04 expandida con 5 subdominios)
status: 🔘 Pendiente (arranca tras Sprint 3 que cierra con v0.3.0-rc.1)
position: entre Sprint 3 (Hardening, v0.3.0-rc.1) y Sprint 4 (Sheets, v0.4.0)
---

# Sprint Validación Pre-MVP — overview

Sprint de validación independiente cuya función es **re-testear en el VPS de Renzo todo lo que los Sprints 0..3 entregaron**, con foco en:

1. Reproducir cada test automatizado en entorno cercano a producción.
2. Validar con browser real (Playwright) flujos E2C local + flujos E2E contra VPS.
3. Ejecutar checklist manual con instrucciones explícitas para el tester (humano).
4. Documentar **hotfixes detectados** durante esta validación y aplicarlos en este mismo sprint.
5. Cerrar con PR `feature/sprint-03b-validacion-pre-mvp` → `developer`, bump SemVer a **v0.4.0** (MVP GA).

> **Razón de existir** (decisión 22-05-2026): los `SP-N-CLOSE-1..5` de cada sprint son rápidos y los ejecuta Javi HP en local. Antes del MVP necesitamos una pasada de QA dedicada en VPS por un equipo distinto (Renzo) con tiempo real para encontrar regresiones, problemas de despliegue y bugs que solo aparecen fuera del entorno del autor.

---

## Asignación

- **Lead**: Renzo.
- **Equipo**: equipo de desarrollo de Renzo (tester(s) humano(s) + Renzo como dev).
- **Capacidad**: 8h/día (estimación inicial **40-55h** total — revisada 22-05-2026 desde 24-40h iniciales).
- **Razón del aumento**: SP-4B ahora **absorbe los `SP-N-CLOSE-3` (test manual del dev) de Sprints 1, 2, 2B y 3**. Esos manuales (~2h cada uno) se integran en el bloque 4 de cada phase de este sprint (~8h adicionales). Más overhead por re-test E2E VPS de los nuevos sprints (2B Dashboard KPIs).
- **Branch**: `feature/sprint-03b-validacion-pre-mvp` desde `developer` tras el cierre de Sprint 3.

---

## Estructura (5 fases)

Una fase por cada sprint anterior, más una de cierre. Cada fase se **rellena al cerrar el sprint anterior correspondiente** (auto-fill — ver sección "Mecánica de auto-fill" más abajo).

| Fase | Archivo                                                                | Cubre                                                                         | Estado inicial                                 |
| ---- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| 01   | [phase-01-validacion-sprint-0.md](phase-01-validacion-sprint-0.md)     | Sprint 0 — Hotfixes seguridad (SP-1)                                          | 📝 Llenado al cierre Sprint 0 (22-05-2026)     |
| 02   | [phase-02-validacion-sprint-1.md](phase-02-validacion-sprint-1.md)     | Sprint 1 — Capa de datos (SP-2) + **manual humano** (antes CLOSE-3)           | 🔘 Plantilla vacía                             |
| 03a  | [phase-03a-validacion-sprint-2.md](phase-03a-validacion-sprint-2.md)   | Sprint 2 (HubSpot+Zoho v0.2.7) + **manual humano** + BUG-2-01 regression      | 📝 Llenado al cierre Sprint 2 (24-05-2026)     |
| 03b  | [phase-03b-validacion-sprint-2b.md](phase-03b-validacion-sprint-2b.md) | Sprint 2B (Dashboard KPIs Overview v0.2.8) + **manual humano**                | 🔘 Skeleton (auto-fill SP-3B-CLOSE-5)          |
| 04   | [phase-04-validacion-sprint-3.md](phase-04-validacion-sprint-3.md)     | Sprint 3 — Hardening (SP-4) — v0.3.0-rc.1 + **manual humano** (5 subdominios) | 🔘 Skeleton expandido (auto-fill SP-4-CLOSE-5) |
| 05   | [phase-05-cierre-sprint.md](phase-05-cierre-sprint.md)                 | PR a `developer` + bump v0.3.0 GA                                             | 🔘 Plantilla estándar                          |

> **Cambio 24-05-2026 (tras research R3):**
>
> - phase-03 dividida en **phase-03a** (Sprint 2, ya rellenada con v0.2.7 + bugs reales) + **phase-03b** (Sprint 2B, skeleton para auto-fill). Razón: cada sprint tiene branch + version + bugs independientes, fusionarlos creaba ambigüedad para Renzo.
> - phase-04 expandida de 70 líneas (skeleton genérico) a 270+ con 5 subdominios estructurados: Node 22 / E2E Playwright / Observabilidad / WCAG / Headers+Rate-limits + features NEW-09..12. Cada subdominio con env vars y placeholders `<!-- AUTOFILL-START -->` para que el agente que cierre Sprint 3 tenga estructura clara donde insertar.
> - Versiones corregidas: `v0.4.0-rc.1` → `v0.3.0-rc.1`, `v0.4.0 GA` → `v0.3.0 GA` (rebaja MVP confirmada en RoadMap).

---

## Estructura de cada fase `phase-NN-validacion-sprint-N.md`

Cada fase de validación tiene 6 bloques fijos:

1. **Test automático con instrucciones (código)** — `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`. Cobertura objetivo + thresholds.
2. **Test E2C local (Playwright contra `localhost:8500`)** — flujos golden path + edge cases. Comando: `npm run test:e2e`. Reportes y screenshots a `playwright-report/`.
3. **Test E2E VPS (Playwright contra URL VPS de Renzo)** — mismos flujos pero contra entorno desplegado. Variable `BASE_URL=https://<vps>.linkstation.ai`. Detecta problemas de despliegue, env vars, DNS, TLS.
4. **Test manual con instrucciones para el tester (humano)** — checklist con: qué probar, cómo, qué esperar, criterios de aceptación. Sin asumir conocimiento del código.
5. **Hotfixes encontrados** — tabla dinámica de bugs detectados durante esta fase. Cada hotfix con su propio `BUG-XXX` ID, severidad, fix aplicado, commit ref.
6. **Subida a GH** — commits incrementales sobre `feature/sprint-03b-validacion-pre-mvp` agrupados por fase. La fase queda 🔵 cuando todos sus hotfixes están a 🔵 y los 4 bloques de test pasan.

---

## Mecánica de auto-fill

Al cerrar **cualquier Sprint N** (incluido el Sprint 0 que cierra hoy), su `SP-N-CLOSE-5` lleva una subtarea **obligatoria** llamada **"Hand-off a Sprint Validación Pre-MVP"** que actualiza `phase-NN-validacion-sprint-N.md` con:

- Comandos exactos de test automático del sprint cerrado.
- Lista de specs Playwright E2C añadidas y rutas cubiertas.
- Lista de specs Playwright E2E listas para correr contra VPS.
- Checklist manual derivado de `docs/testeos-manual.md` (sección del sprint).
- Lista de bugs ya detectados y corregidos durante el cierre del sprint (referencia BUG-XXX) — para que Renzo verifique que no regresan.
- Variables de entorno necesarias en el VPS para que los tests pasen.
- Notas de despliegue (migraciones SQL pendientes, vars nuevas, etc.).

Esta regla está documentada en `CLAUDE.md` sección "Phase/Sprint Completion Protocol" y se enforzará desde el agente `roadmap-keeper` al detectar `SP-N-CLOSE-5` cerrando.

---

## Cierre del sprint (SP-4B-CLOSE-1..5)

Plantilla estándar (las 5 tareas de cierre habituales) pero con dos extras:

- **SP-4B-CLOSE-4** (corrección de bugs) está prevista como tarea **principal**, no subtarea — Renzo registra hotfixes en cada fase, no al final.
- **SP-4B-CLOSE-5** detona el bump SemVer a **v0.4.0** (MVP GA) y la promoción a `staging` (ya con orden explícita del usuario, no automática).

---

## Próximos pasos al crear este sprint

1. Crear branch `feature/sprint-03b-validacion-pre-mvp` desde `developer` (sólo cuando Sprint 3 esté mergeado).
2. Mantener `phase-01-validacion-sprint-0.md` actualizado a medida que se ejecutan los tests del Sprint 0 en VPS (la fase se llenó al cierre de Sprint 0 con la info teórica; los resultados reales se anotan cuando Renzo arranque).
3. Plantillas `phase-02..04` se rellenan automáticamente al cerrar Sprints 1, 2 y 3 respectivamente.
