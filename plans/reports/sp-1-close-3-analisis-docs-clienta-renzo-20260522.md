# SP-1-CLOSE-3 — Análisis cruzado docs Renzo V1 + correcciones Bea + RoadMap

**Fecha**: 22-05-2026 18:00
**Autor**: Javi HP (orquestación) + análisis cruzado de:

- [`docs/Informes de programacion/documentacion sistema  LinkStation V1.pdf`](../../docs/Informes%20de%20programacion/documentacion%20sistema%20%20automatiza%20formacion%20V1.pdf) (Renzo V1, 16 módulos)
- [`docs/Docs-entrega-clienta/Correcciones_aclaraciones Bea documentacion sistema  LinkStation V1.pdf`](../../docs/Docs-entrega-clienta/Correcciones_aclaraciones%20Bea%20documentacion%20sistema%20%20automatiza%20formacion%20V1.pdf) (Bea, 14 puntos)
- [`plans/RoadMap.md`](../RoadMap.md) (estado al cierre Sprint 0)

**Sustituye al SP-1-CLOSE-3 original** (test manual del dev), que queda absorbido por SP-4B phase-01 (Renzo). Este reporte cumple la función de "cierre dirigido al producto" del Sprint 0: revisar contra los docs autoritarios qué se mantiene, qué se ajusta y qué se incorpora al MVP.

## 1. Resumen Renzo V1 (estado actual del producto)

Auditoría funcional de 16 módulos: **80 funcionalidades 100% operativas / 8 con limitaciones / 14 no implementadas**.

### 1.1 Seguridad — TODOS cubiertos por Sprint 0 ✅

| Hallazgo Renzo                            | Cubierto por                                                  |
| ----------------------------------------- | ------------------------------------------------------------- |
| Claves service_role expuestas             | 1-03 (rotación VPS) + 1-04 (sacar JWTs hardcoded del código)  |
| Fuga de datos entre tenants (RLS débil)   | 1-16..1-21 (RLS hardening completo)                           |
| Escalada admin via `user_metadata`        | 1-19 (admin a `app_metadata`)                                 |
| Webhooks sin HMAC                         | 1-12..1-15 (Retell, WhatsApp, Zoho, HubSpot)                  |
| Widget público sin allowlist + rate-limit | 1-27 (allowed_domains + rate-limit Redis) — nuevo en Sprint 0 |

### 1.2 Lógica de negocio (bugs funcionales)

| Hallazgo Renzo                                                                                           | Estado plan         | Acción                                                        |
| -------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------- |
| 🔴 BullMQ worker no corre en VPS → secuencia congelada tras paso 1                                       | ✅ Cubierto         | 1-01/1-02 fix worker + pre-deploy systemd VPS (1-05 diferida) |
| 🔴 `qualification_rules` texto libre + estados desincronizados (`SCHEDULING` vs `qualified` vs etiqueta) | 🟡 Parcial Sprint 1 | NEW-02 enum unificado estados (nuevo)                         |
| 🟡 Round Robin OK pero sin reglas avanzadas país+curso+origen                                            | 🟡 Falta UI/lógica  | NEW-08 reglas avanzadas                                       |

### 1.3 Bugs por módulo identificados por Renzo

| Módulo                | Bug                                                                                                                                          | Estado plan      | Acción           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------- |
| Orquestador visual    | 🔴 `saveOrchestratorConfig` pierde `config` (solo guarda dibujo) + doble personalidad tabla                                                  | NO cubierto      | **NEW-01**       |
| Voice Agents (Retell) | 🔴 `gpt-4.1-mini` hardcoded rompe creación + historial Retell vacío (condición Ultravox) + multi-estados prompts solo escribe general_prompt | NO cubierto      | **NEW-03**       |
| Text Agents           | 🟡 Modelos GPT-4.1 inexistentes + variables fantasma                                                                                         | Parcial Sprint 1 | 2-35 + NEW-03    |
| Conversaciones Inbox  | 🟡 Variables `{{1}}/{{2}}` hardcoded (asume nombre/curso)                                                                                    | NO cubierto      | **NEW-07**       |
| Settings admin        | 🟡 Sin buscador, sin "Probar Conexión", borrado débil, edición inline rota                                                                   | NO cubierto      | **NEW-12**       |
| Centro de Costes      | 🟡 `growth: 5.2` hardcoded + filtro temporal ignorado + export PDF huérfano                                                                  | ✅ Cubierto      | SP-5B post-MVP   |
| Historial             | 🟡 Joins memoria escalan mal >100k + reproductor audio comentado + export CSV faltante                                                       | Parcial          | **NEW-11**       |
| Logs auditoría        | 🟡 Query limit 50 + copiar JSON huérfano                                                                                                     | NO cubierto      | Backlog post-MVP |

## 2. Aportes Bea (correcciones funcionales / nuevos requisitos MVP)

| #   | Aporte de Bea                                                                                                                  | Estado plan vs aporte                                         | Acción                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Orquestador con lógica condicional "si pasa X, hacer Y" configurable por cliente                                               | Workflow Builder lo permite, pero save roto                   | **NEW-01**                                       |
| 2   | Round Robin con casuística (asesor 1 = ES+curso A/B; asesor 2 = MX+meta) + opción agenda compartida sin asignación             | Renzo confirma estructura BD existe                           | **NEW-08**                                       |
| 3   | Costes NO en MVP                                                                                                               | ✅ Ya decidido                                                | SP-5B sigue                                      |
| 4   | Handoff humano NO sistemático — nº inválido → "ilocalizable" tipificado, no a CRM cliente                                      | Parcial (Renzo: ya hay blueprint Zoho)                        | **NEW-13** política unificada                    |
| 5   | Widget chatbot: cliente decide TODOS / sólo cualificados a su CRM + auto-purga leads no cualificados en BD interna tras X días | NO cubierto                                                   | **NEW-05**                                       |
| 6   | Resumen leads — oportunidades múltiples (mismo lead, N solicitudes con fechas) + dedup misma/sucesivos días                    | NO cubierto (modelo actual trata cada solicitud = lead nuevo) | **NEW-06**                                       |
| 7   | Inbox apagar bot: permanente vs ventana configurable + al re-encender, leer transcripción humano y guardar variables           | Parcial (pausar IA existe)                                    | **NEW-07**                                       |
| 8   | Calendario festivos (manual MVP, web post-MVP) + auto-agenda agente cuando lead dice "llámame en X" → post-MVP                 | Sólo festivos MVP                                             | **NEW-10**                                       |
| 9   | Campañas: importar leads desde Excel + filtros multi-variable sobre leads existentes + cola configurable cadencia              | NO cubierto                                                   | **NEW-09**                                       |
| 10  | Lanzador manual /calls "no entiendo qué es"                                                                                    | Mockup hardcoded (Renzo)                                      | **SACAR del MVP** → sprint refinamiento post-MVP |
| 11  | Renombrar Historial → Leads + clarificar duplicidad con Resumen de Leads                                                       | NO cubierto                                                   | **NEW-11**                                       |
| 12  | **Dashboard KPIs conjunto** (llamada + whatsapp + web) configurable                                                            | NO cubierto — GAP CRÍTICO MVP                                 | **NEW-04** sprint dedicado                       |
| 13  | Simuladores fuera del MVP                                                                                                      | Renzo dice 80% funcional                                      | **SACAR del MVP** → sprint refinamiento post-MVP |
| 14  | Centro Costes fuera del MVP                                                                                                    | ✅ Ya decidido                                                | SP-5B sigue                                      |

## 3. Decisiones aplicadas tras revisión con el usuario (22-05-2026 18:00)

### 3.1 Scope cut del MVP

| Módulo                 | Decisión                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simulator `/simulator` | Fuera del MVP. Sprint dedicado **post-MVP** "Refinamiento Herramientas Internas" (v0.5.2 entre Costes-LLM y Salesforce). Fase 01 Simulator (~8-10h). |
| Lanzador `/calls`      | Fuera del MVP. Misma ubicación, **fase 02** del mismo sprint (~10-12h con Retell SDK + WebSocket transcripción).                                     |
| Auto-agenda agente     | Post-MVP — ADR en sprint refinamiento o backlog.                                                                                                     |
| Festivos auto vía web  | Post-MVP — festivos manuales por país en MVP (NEW-10).                                                                                               |

### 3.2 Tareas nuevas aplicadas al MVP (TODAS las 13)

| ID     | Tarea                                                                                                                               | Sprint              | Estim  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------ |
| NEW-01 | Fix `saveOrchestratorConfig` (guardar `config` nodos) + consolidar `tenant_orchestrator_config` → `workflows`/`orchestration_rules` | Sprint 1            | 8h     |
| NEW-02 | Enum unificado estados lead/cualificación + propagación Supabase + Zoho + dashboard                                                 | Sprint 1            | 6h     |
| NEW-03 | Fix Voice Agents (modelo correcto, historial Retell, warning multi-estados)                                                         | Sprint 2            | 4h     |
| NEW-04 | Dashboard KPIs conjunto (llamada + whatsapp + web) configurable                                                                     | **Sprint 2B nuevo** | 16-24h |
| NEW-05 | Widget switch TODOS/cualificados a CRM cliente + auto-purga no cualificados                                                         | Sprint 2            | 6h     |
| NEW-06 | Modelo oportunidades múltiples + dedup mismo día/días sucesivos                                                                     | Sprint 1            | 10h    |
| NEW-07 | Inbox apagar bot ventana configurable + re-encendido lee transcripción humano                                                       | Sprint 2            | 5h     |
| NEW-08 | Round Robin avanzado reglas país+curso+origen + opción agenda compartida sin asignación                                             | Sprint 2            | 6h     |
| NEW-09 | Campañas: importar Excel + filtros multi-variable + cola configurable cadencia                                                      | Sprint 3            | 12h    |
| NEW-10 | Calendario: festivos manuales por país                                                                                              | Sprint 3            | 3h     |
| NEW-11 | Renombrar UI Historial → Leads + clarificar/consolidar con Resumen de Leads                                                         | Sprint 3            | 2h     |
| NEW-12 | Settings UX (buscador, probar conexión, confirmación borrado robusta, edición panel lateral)                                        | Sprint 3            | 6h     |
| NEW-13 | Política handoff unificada: nº inválido tipifica ilocalizable, reintentos configurables, no a CRM cliente                           | Sprint 1            | 4h     |

**Subtotal nuevas**: 88h (+88h al MVP, neto +63h tras sacar simulador + lanzador + auto-agenda).

### 3.3 Re-balanceo MVP

| Sprint           | Estim. previa | Estim. nueva | Delta | Notas                                           |
| ---------------- | ------------- | ------------ | ----- | ----------------------------------------------- |
| Sprint 0         | 115h 30min    | 115h 30min   | —     | ✅ Cerrado v0.1.0                               |
| Sprint 1         | ~177h         | ~205h        | +28h  | NEW-01, 02, 06, 13                              |
| Sprint 2         | 148h          | ~169h        | +21h  | NEW-03, 05, 07, 08                              |
| **Sprint 2B**    | —             | **16-24h**   | nuevo | NEW-04 dedicado                                 |
| Sprint 3         | 89-117h       | ~112-140h    | +23h  | NEW-09, 10, 11, 12                              |
| SP-4B Validación | 24-40h        | 40-55h       | +15h  | Absorbe CLOSE-3 manuales de Sprints 1, 2, 2B, 3 |

### 3.4 Tests manuales diferidos a SP-4B

`SP-N-CLOSE-3` (test manual del dev) **eliminado** de Sprints 1, 2, 2B, 3. El trabajo lo absorbe SP-4B `phase-NN` bloque 4 (test manual del tester Renzo) que ahora pesa más (4 sprints × ~2h cada uno = +8h base + el bloque 4 ya existente).

Cierre por sprint:

- Sprint 0: ya cerrado, CLOSE-3 reemplazado por este reporte.
- Sprints 1, 2, 2B, 3: `CLOSE-3 → DIFERIDA a SP-4B phase-NN bloque 4`. Estimación cierre por sprint baja de 5h 30min → 4h 30min.

### 3.5 Sprint nuevo post-MVP "Refinamiento Herramientas Internas" (v0.5.2)

- **Ubicación**: tras SP-5B (Costes-LLM v0.5.1), antes de Sprint 5 (Salesforce v0.6.0).
- **Carpeta plan**: `plans/260522-1830-sprint-refinamiento-herramientas-post-mvp/`
- **Fases**:
  - Fase 01: Simulator persistencia BD + simulación voz (8-10h)
  - Fase 02: Lanzador `/calls` Retell SDK + WebSocket transcripción en vivo (10-12h)
  - Cierre estándar (5h 30min + bugs)
- **Branch**: `feature/sprint-refinamiento-herramientas-post-mvp` (creada tras SP-5B mergeado).

## 4. Próximos pasos

1. Aplicar todos los cambios anteriores al RoadMap (commit único en `feature/planning-update-mvp-bea-renzo`).
2. Crear archivos de planning del Sprint 2B + Sprint Refinamiento post-MVP.
3. Actualizar planes Sprint 1, 2, 3 con las nuevas tareas.
4. Actualizar SP-4B `plan.md` con nueva estimación + responsabilidades extras.
5. Actualizar `CLAUDE.md` con regla "CLOSE-3 diferido a SP-4B".
6. PR `feature/planning-update-mvp-bea-renzo` → `developer` (sin bump SemVer, sigue v0.1.0).
7. Tras merge: crear `feature/sprint-01-capa-datos` y arrancar Sprint 1.

## 5. Riesgos identificados

| Riesgo                                                                                                                                | Mitigación                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Sprint 1 sube a ~205h con un solo dev (Javi HP) → 20+ días lab → entra en pos. 02-07                                                  | Aceptable, queda margen antes de la ventana SP-4B 04-14 ago                                      |
| Sprint 2B nuevo descoordina las fechas downstream (+5 días)                                                                           | Documentadas en RoadMap. Si Renzo se libera, puede colaborar en NEW-04                           |
| NEW-04 dashboard KPIs conjunto reusa SummaryManager + ChartManager pero requiere nuevas server actions agregadas (cruzando 3 módulos) | Estim 16h piso 24h techo: si pasa de 24h, mover NEW-12 (settings UX) a backlog                   |
| NEW-09 campañas importar Excel + cola = 12h alto                                                                                      | Si Sprint 3 se desborda, NEW-09 puede partirse: importar Excel ahora, cola configurable post-MVP |
| Sprint refinamiento post-MVP (Simulator + Lanzador) puede solaparse con Salesforce                                                    | Documentado en RoadMap. Si el cliente prioriza Salesforce, mover refinamiento más adelante       |

## 6. Métricas de cierre SP-1-CLOSE-3

- ✅ Doc Renzo V1 leído completo (3112 líneas, 16 módulos).
- ✅ Doc Bea correcciones leído completo (170 líneas, 14 puntos).
- ✅ Cross-reference contra RoadMap actual: 27 ítems comparados (9 cubiertos, 13 nuevos NEW-XX, 5 explícitamente fuera MVP).
- ✅ Decisiones tomadas con el usuario (4 preguntas confirmadas).
- ⏭️ Aplicación al plan: en curso (commit siguiente).
