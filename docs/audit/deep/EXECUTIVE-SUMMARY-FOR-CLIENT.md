---
title: "Informe Ejecutivo — Auditoría de Seguridad y Calidad"
date: 2026-05-19
project: linkstation / LinkStation
audience: Cliente (no técnico)
confidentiality: Confidencial — solo para el equipo responsable del proyecto
---

# Informe Ejecutivo — Auditoría de Seguridad y Calidad

**Proyecto:** Plataforma de automatización de formación  
**Fecha del informe:** Mayo 2026  
**Tipo de análisis:** Auditoría completa de código — seguridad, funcionamiento, accesibilidad

---

## Qué hemos hecho

Se ha realizado una revisión exhaustiva de toda la plataforma digital: el sistema de llamadas automáticas, la inteligencia artificial de cualificación, la gestión de leads, la seguridad de los datos y la accesibilidad para personas con discapacidad. El análisis ha cubierto aproximadamente 15.000 líneas de código y 50 archivos de base de datos.

El equipo de auditoría no ha realizado cambios en el sistema. Este informe describe únicamente lo encontrado.

---

## Resumen de lo que hemos encontrado

La plataforma tiene **tres tipos de problemas** que conviene entender claramente:

**1. Problemas de seguridad urgentes** — Hay puertas abiertas que permitirían a un tercero malintencionado ver datos de sus clientes, borrar información o hacerse pasar por administrador. Algunos de estos problemas son explotables desde un navegador normal sin conocimientos técnicos avanzados.

**2. Funcionalidades que no funcionan en producción** — El flujo de seguimiento automático de varios días (el que llama al lead el día 1, al día 2, al día 3…) está técnicamente roto. Los leads reciben el primer contacto pero nunca los siguientes. El sistema de cualificación automatizada también tiene errores que hacen que se apliquen criterios incorrectos.

**3. Incumplimiento de accesibilidad** — La plataforma no cumple los estándares europeos WCAG 2.1 de accesibilidad (normativa obligatoria para aplicaciones de uso profesional en la UE). Los usuarios con discapacidad visual, motora o cognitiva no pueden usar partes importantes de la herramienta.

---

## Los 5 riesgos críticos explicados sin tecnicismos

### Riesgo 1 — Las claves de acceso a la base de datos están escritas en el código

Imagine que la llave de su caja fuerte está escrita en un papel pegado en la puerta de su oficina. Así es como están guardadas actualmente las contraseñas que dan acceso a toda la base de datos de la plataforma: escritas directamente en el código del programa, visible para cualquier persona con acceso al repositorio de código.

**¿Qué puede ocurrir?** Cualquier persona que haya tenido acceso al repositorio de código (un desarrollador pasado, un contratista, etc.) tiene acceso potencial a toda la base de datos de producción: leads de todos sus clientes, configuraciones, conversaciones.

**Solución:** Cambiar estas contraseñas ahora mismo y guardarlas en un lugar seguro separado del código. Esto se puede hacer en menos de una hora.

### Riesgo 2 — Cualquier usuario registrado puede ver y borrar datos de cualquier otro cliente

Si tiene varios clientes usando la plataforma (o en el futuro tiene más), el sistema actualmente no separa correctamente los datos entre ellos. Un usuario del Cliente A puede acceder a los leads del Cliente B cambiando un valor en su navegador con dos clics.

Más grave aún: hay una forma de escalar permisos a administrador del sistema completo que cualquier usuario registrado puede ejecutar desde la consola del navegador. Una vez como administrador, puede borrar todos los clientes del sistema o modificar la configuración de cualquiera.

**¿Qué puede ocurrir?** En un escenario de uso malintencionado por parte de un usuario insatisfecho o un competidor con una cuenta registrada: pérdida total de los datos de leads de cualquier cliente, o toma de control del panel de administración.

**Solución:** Requiere entre 1 y 2 días de trabajo de desarrollo. Es la corrección más urgente junto a la primera.

### Riesgo 3 — Varias páginas de la plataforma están completamente abiertas a internet sin contraseña

Hay siete funciones del sistema de automatización (que activan llamadas, modifican flujos de trabajo, envían mensajes de WhatsApp) que son accesibles desde internet sin ninguna contraseña o sesión. Adicionalmente, hay una página de prueba que en producción puede crear leads y activar llamadas reales a números de teléfono sin ningún control.

**¿Qué puede ocurrir?** Alguien puede activar el sistema de envío de recordatorios WhatsApp para todos sus leads a cualquier hora del día sin estar autenticado. También puede leer información de nombres y estados de los leads sin iniciar sesión.

**Solución:** Añadir contraseña a estas páginas. Cada corrección individual tarda entre 30 minutos y 2 horas. Son 10 puntos a corregir.

### Riesgo 4 — El flujo de seguimiento de varios días nunca se ejecuta

El sistema está diseñado para hacer un seguimiento automático de varios días: llamar el día 1, enviar WhatsApp el día 2, verificar en el CRM el día 3. Actualmente, solo se ejecuta el primer paso. Todos los pasos posteriores fallan silenciosamente — el lead queda "congelado" después del primer contacto sin que el operador lo sepa.

**¿Qué puede ocurrir?** Los leads que no convirtieron en el primer contacto nunca reciben el seguimiento planificado. Esta funcionalidad central de la plataforma no está operativa.

**Solución:** Un día de trabajo de desarrollo. Es una corrección técnica concreta en un archivo específico.

### Riesgo 5 — Los criterios de cualificación automática son incorrectos respecto a la especificación acordada

El motor de cualificación automática (el que decide si un lead es "apto" o "no apto") aplica criterios diferentes a los que se pactaron. Según la especificación, un técnico con 2 años de experiencia es apto; el sistema requiere 3 años. Además, el campo "cualificado" tiene tres formatos distintos en diferentes partes del sistema que no coinciden entre sí, lo que hace que algunos leads no sean correctamente marcados aunque la IA los haya evaluado bien.

**¿Qué puede ocurrir?** Leads que deberían clasificarse como aptos se descartan, y viceversa. Los datos del CRM pueden estar incorrectamente clasificados.

**Solución:** Medio día de trabajo de desarrollo para corregir los umbrales. Un poco más para unificar los formatos.

---

## Lo que está bien

La plataforma tiene elementos técnicos correctamente implementados que conviene reconocer:

- **La integración con WhatsApp funciona correctamente** — El primer contacto (el paso 1) se procesa bien. Los mensajes llegan, la IA responde y el historial se guarda.
- **El dashboard de gestión es visualmente coherente** — La interfaz de usuario está bien construida con tecnología moderna (Next.js, React, Tailwind).
- **La integración con Retell para llamadas de voz está conectada** — El puente con el proveedor de voz está implementado y funcional para el caso básico.
- **El sistema de conocimiento base (RAG)** — La búsqueda semántica para que la IA responda con documentación del cliente está correctamente integrada con la base de datos vectorial.
- **La arquitectura general es sólida** — Las tecnologías elegidas son correctas y modernas. Los problemas son de implementación, no de diseño fundamental.

---

## Plan de acción propuesto

### Esta semana (urgente)

| Acción | Tiempo estimado | Impacto |
|--------|-----------------|---------|
| Cambiar contraseñas de base de datos comprometidas | 2-4 horas | Elimina el riesgo más grave inmediatamente |
| Añadir autenticación a las páginas abiertas a internet | 1-2 días | Cierra las puertas de acceso sin control |
| Corregir la separación de datos entre clientes | 1-2 días | Evita que un cliente vea datos de otro |
| Corregir la escalada de permisos de administrador | 4 horas | Evita toma de control del sistema |

**Total esta semana: 5-8 días de trabajo de un desarrollador.**

### Este mes

| Acción | Tiempo estimado | Impacto |
|--------|-----------------|---------|
| Reparar el flujo de seguimiento de varios días | 1 día | El sistema funciona como fue diseñado |
| Corregir los criterios de cualificación | 1-2 días | Los leads se clasifican correctamente |
| Añadir validación a los webhooks externos (Retell, WhatsApp) | 2-3 días | Evita que terceros inyecten datos falsos |
| Corregir la separación de datos en base de datos (RLS) | 3-4 días | Aislamiento técnico completo multi-cliente |
| Empezar la corrección de accesibilidad (fase 1) | 3-4 días | Cumplimiento básico WCAG para modales y formularios |

**Total este mes: 10-16 días de trabajo de desarrollo.**

### Próximo trimestre

| Acción | Tiempo estimado | Impacto |
|--------|-----------------|---------|
| Completar mejoras de accesibilidad (WCAG 2.1 AA completo) | 2-3 semanas | Cumplimiento normativo europeo |
| Implementar observabilidad de costes LLM | 1 semana | Visibilidad real de costes de IA |
| Añadir tests automatizados | 2-3 semanas | Prevención de regresiones futuras |
| Mejoras de rendimiento y código | 2 semanas | Estabilidad y mantenibilidad |

**Total próximo trimestre: 8-10 semanas de trabajo de desarrollo.**

---

## Estimación de coste y tiempo

| Horizonte | Esfuerzo estimado | Prioridad |
|-----------|-------------------|-----------|
| Esta semana (seguridad urgente) | 5-8 días/dev | CRÍTICO — no puede esperar |
| Este mes (funcionalidad + seguridad) | 10-16 días/dev | ALTO — antes de escalar el sistema |
| Próximo trimestre (calidad + accesibilidad) | 40-50 días/dev | NORMAL — planificar en sprint |
| **Total global** | **55-74 días/dev** | — |

Nota: "días/dev" significa días de trabajo de un desarrollador dedicado. Con dos desarrolladores trabajando en paralelo, los plazos se reducen aproximadamente a la mitad.

---

## Siguiente paso recomendado

Antes de continuar con cualquier desarrollo de nuevas funcionalidades, se recomienda completar al menos los puntos de "Esta semana". El riesgo actual de exposición de datos de sus clientes es concreto y tratable en poco tiempo. El equipo de desarrollo puede comenzar con los tres primeros puntos de forma inmediata.

Para cualquier pregunta sobre este informe, el equipo técnico puede ampliar cualquier punto con más detalle.

---

*Informe elaborado a partir de análisis estático de código. Sin modificaciones al sistema.*
