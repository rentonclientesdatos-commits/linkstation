# Fase 01 — App de Meta dedicada + ADR-025 + acompañamiento a clienta

## Context Links

- Plan: [plan.md](plan.md)
- ADR a aprobar: [`docs/adr/ADR-025-whatsapp-tech-provider-meta.md`](../../docs/adr/ADR-025-whatsapp-tech-provider-meta.md)
- ADR análogo: [`docs/adr/ADR-021-hubspot-public-app-multi-tenant.md`](../../docs/adr/ADR-021-hubspot-public-app-multi-tenant.md)

## Overview

- **Prioridad:** P1 (arranca primero — desbloquea App Review, que es async)
- **Estado:** Pendiente
- **Descripción:** Crear la app de Meta NUEVA dedicada al programa Tech Provider, formalizar la decisión arquitectónica (ADR-025) y entregar a la clienta el checklist de pasos que solo ella puede ejecutar (portfolio + Business Verification).

## Key Insights

- Meta **recomienda explícitamente no reutilizar la app actual**: el nombre de la app y del business portfolio son visibles al tenant durante el registro del sender, y reusar la app en producción arriesga romper la integración viva.
- El proceso de Meta (Business Verification, App Review) es **externo y asíncrono**; por eso esta fase se arranca el día 1 aunque el desarrollo real venga en fases 2-4.
- El ADR debe pasar por el proceso `af-agents:adr` antes de tocar la capa de credenciales (regla del proyecto: dependencias/decisiones de integración requieren ADR).

## Requirements

**Funcionales**

- App de Meta creada en el business portfolio de la clienta, con producto WhatsApp añadido.
- Nombre público profesional ("LinkStation").

**No funcionales**

- ADR-025 en estado `Accepted` antes de iniciar fase 2.
- Checklist de clienta entregado y confirmado.

## Architecture

No hay código en esta fase. Define la "app única multi-tenant" que las fases 2-4 consumirán vía:

- `META_APP_ID` (app dedicada)
- `META_APP_SECRET` (sustituye/coexiste con `WHATSAPP_APP_SECRET` actual)
- `META_CONFIG_ID` (Embedded Signup, fase 3)
- `META_SYSTEM_USER_TOKEN` (Business Integration System User, fase 2)

## Related Code Files

- **Crear:** `docs/adr/ADR-025-whatsapp-tech-provider-meta.md` (ya redactado en este sprint)
- **Modificar (solo placeholders, no valores):** [`.env.example`](../../.env.example) — añadir las 4 vars nuevas con placeholder
- **Crear:** `docs/integrations/whatsapp-tech-provider-setup.md` (guía de la app Meta + checklist clienta)

## Implementation Steps

1. Confirmar con la clienta el business portfolio destino (puede ser el mismo que ya usa; lo que cambia es la app).
2. Crear la app de Meta nueva dedicada + añadir producto WhatsApp.
3. Redactar/aprobar ADR-025 vía `af-agents:adr`.
4. Añadir las 4 env vars nuevas a `.env.example` (solo placeholders; valores reales por canal seguro / Easypanel).
5. Redactar `docs/integrations/whatsapp-tech-provider-setup.md` con el checklist de clienta y los pasos de Meta.
6. Entregar a la clienta el checklist de Business Verification (arrancar ya, sube límite 10→200).

## Todo List

- [ ] App de Meta dedicada creada + WhatsApp añadido
- [ ] ADR-025 `Accepted`
- [ ] 4 env vars en `.env.example`
- [ ] Guía `whatsapp-tech-provider-setup.md` creada
- [ ] Checklist clienta entregado y confirmado

## Success Criteria

- App nueva visible en el portfolio con nombre profesional.
- ADR-025 aprobado.
- Clienta con Business Verification iniciada.

## Risk Assessment

| Riesgo                                    | Mitigación                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| Clienta tarda en Business Verification    | Arrancar día 1; el desarrollo no se bloquea (límite 10 clientes basta para testing) |
| Reutilización accidental de la app actual | ADR fija explícitamente "app nueva"; revisión en code review                        |

## Security Considerations

- Los valores reales de `META_APP_SECRET` y `META_SYSTEM_USER_TOKEN` NUNCA en git ni en docs commiteables — solo `.env.example` con placeholders + canal seguro.

## Next Steps

- Desbloquea fase 2 (refactor credenciales, requiere ADR aprobado) y fase 6 (App Review, requiere app creada).
