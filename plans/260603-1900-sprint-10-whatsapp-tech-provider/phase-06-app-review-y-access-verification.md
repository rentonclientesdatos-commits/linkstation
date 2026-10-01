# Fase 06 — App Review (2 vídeos) + Access Verification

## Context Links

- Plan: [plan.md](plan.md)
- Fase app dedicada: [phase-01](phase-01-app-meta-dedicada-adr.md)

## Overview

- **Prioridad:** P1 (arranca pronto — revisión de Meta es asíncrona y lenta)
- **Estado:** Pendiente
- **Descripción:** Gestionar el proceso de aprobación de Meta para conseguir Advanced Access a `whatsapp_business_messaging` y `whatsapp_business_management`, más la Access Verification que declara a LinkStation como Tech Provider.

## Key Insights

- Para pasar App Review hay que **subir 2 vídeos**: (1) un mensaje creado y enviado desde nuestra app y recibido en el cliente de WhatsApp; (2) la creación de una plantilla de mensaje desde nuestra app.
- Se debe **explicar cómo se usan los datos** que las permissions permiten acceder.
- Tras aprobar la app, hay que completar la **Access Verification** en App Settings (declarar Tech Provider).
- Sin App Review + Access Verification, el límite es **10 clientes/7 días**; con todo verificado sube a **200/7 días**.

## Requirements

**Funcionales**

- 2 vídeos grabados con el dashboard real (no mockups):
  - Vídeo A: enviar un mensaje desde el dashboard → recibido en WhatsApp.
  - Vídeo B: crear una plantilla de mensaje desde el dashboard.
- Texto de justificación de uso de datos para cada permission.
- Access Verification cumplimentada.

**No funcionales**

- Vídeos siguiendo el "sample submission" oficial de Meta para evitar rechazo.

## Architecture

No hay código. Depende de que las fases 3-4 estén lo bastante avanzadas para grabar los vídeos con el flujo real (envío de mensaje + gestión de plantillas, que ya existe vía `getAvailableTemplates`/`sendTemplateMessage`).

## Related Code Files

- **Usar (no modificar):** [`src/lib/integrations/whatsapp.ts`](../../src/lib/integrations/whatsapp.ts) (`sendTemplateMessage`, `getAvailableTemplates`) para grabar los vídeos
- **Usar:** [`src/lib/services/meta-templates.ts`](../../src/lib/services/meta-templates.ts) si cubre creación/gestión de plantillas
- **Crear:** `docs/integrations/whatsapp-app-review-submission.md` (guion de los vídeos + textos de justificación)

## Implementation Steps

1. Revisar el sample submission oficial de Meta para Solution Providers.
2. Preparar un entorno con el flujo de envío y gestión de plantillas funcionando (depende de fases 3-4).
3. Grabar Vídeo A (enviar mensaje desde el dashboard → recibido en WhatsApp).
4. Grabar Vídeo B (crear plantilla desde el dashboard).
5. Redactar la justificación de uso de datos por cada permission.
6. Enviar App Review desde el App Dashboard de Meta.
7. Tras aprobación, completar Access Verification (declarar Tech Provider) en App Settings.
8. Documentar en `whatsapp-app-review-submission.md` para futuras reenvíos.

## Todo List

- [ ] Sample submission de Meta revisado
- [ ] Vídeo A (envío de mensaje) grabado
- [ ] Vídeo B (creación de plantilla) grabado
- [ ] Justificación de datos por permission redactada
- [ ] App Review enviado
- [ ] App Review aprobado por Meta
- [ ] Access Verification completada
- [ ] Documentación del submission guardada

## Success Criteria

- Advanced Access a `whatsapp_business_messaging` + `whatsapp_business_management`.
- Access Verification en estado verificado.
- Límite de onboarding subido a 200/7d.

## Risk Assessment

| Riesgo                                            | Mitigación                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Rechazo por vídeos poco claros                    | Seguir literalmente el sample submission; mostrar el flujo completo sin cortes |
| Demora de Meta                                    | Arrancar en paralelo con el desarrollo (no bloquear fases 2-5)                 |
| Falta funcionalidad de plantillas para el Vídeo B | Verificar `meta-templates.ts`; si falta UI de creación, añadirla mínima        |

## Security Considerations

- En los vídeos, no exponer tokens, secretos ni datos personales reales de leads (usar datos de prueba).

## Next Steps

- App aprobada → habilita producción multi-tenant real (más allá del testing de 10 clientes).
