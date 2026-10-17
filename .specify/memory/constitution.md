<!--
Sync Impact Report
- Version change: uninitialized template → 1.0.0 (initial constitution)
- Modified principles: previously undefined principle 1 → I. Specification-First;
  previously undefined principle 2 → II. Test-Driven Development;
  previously undefined principle 3 → III. Backend Business-Rule Enforcement;
  previously undefined principle 4 → IV. GitHub Flow and Peer Review;
  previously undefined principle 5 → V. Conventional Commits.
- Added principles: VI. Continuous Integration Quality Gate;
  VII. Secret and Configuration Hygiene; VIII. Simplicity and Spanish Documentation.
- Added sections: Technology and Security Constraints; Development Workflow.
- Removed sections: None.
- Follow-up TODO: Confirm the original ratification date.
-->
# Constitución del Sistema de reservas de laboratorios — UTMACH

## Principios fundamentales

### I. Especificación primero
Toda funcionalidad y todo cambio de comportamiento DEBE comenzar con una especificación escrita que defina su propósito, requisitos y criterios de aceptación antes de implementarse.

### II. Desarrollo guiado por pruebas (INNEGOCIABLE)
Las pruebas DEBEN escribirse antes del código de producción, siguiendo el ciclo Rojo-Verde-Refactorizar. Las pruebas del backend DEBEN usar Jest y Supertest, y el comportamiento relevante del frontend también DEBE tener pruebas.

### III. Reglas de negocio en el backend
Las reglas de negocio DEBEN aplicarse en el backend y estar cubiertas por pruebas. En particular, el backend DEBE rechazar reservas solapadas para el mismo laboratorio y periodo. La validación del frontend PUEDE mejorar la experiencia, pero NO DEBE reemplazar la del servidor.

### IV. GitHub Flow y revisión por pares
El trabajo DEBE realizarse en ramas cortas asociadas a una tarea e integrarse mediante Pull Request. Un compañero DEBE revisar y aprobar cada Pull Request antes de fusionarlo.

### V. Commits convencionales
Los mensajes de commit DEBEN usar los prefijos `feat`, `fix`, `docs`, `test` o `chore`, seguidos de una descripción concisa.

### VI. Puerta de calidad con integración continua
El pipeline de GitHub Actions DEBE pasar antes de fusionar un Pull Request. Un pipeline que falla DEBE corregirse, no omitirse.

### VII. Higiene de secretos y configuración
Los secretos y las cadenas de conexión a la base de datos NO DEBEN subirse al repositorio. Los valores específicos de cada entorno se proveen fuera del control de versiones; el repositorio solo PUEDE contener un archivo `.env.example` con valores de ejemplo sin secretos reales.

### VIII. Simplicidad y documentación en español
El código DEBE favorecer el diseño más simple que cumpla los requisitos especificados. La documentación del proyecto y la guía técnica dirigida a usuarios DEBEN estar escritas en español.

## Restricciones de tecnología y seguridad
La aplicación DEBE usar Angular en el frontend, Node.js con Express en el backend y MongoDB con Mongoose para la persistencia. El acceso a datos y las reglas de negocio DEBEN implementarse en el servidor; el frontend DEBE comunicarse con el backend mediante su API y no conectarse directamente a MongoDB.

## Flujo de desarrollo
Cada tarea DEBE referenciar su especificación y criterios de aceptación. Los cambios DEBEN enviarse como Pull Requests enfocados desde ramas cortas, recibir aprobación de un compañero y pasar el pipeline de GitHub Actions antes de fusionarse. Quienes revisan DEBEN verificar la cobertura de la especificación, las pruebas de reglas del backend, la higiene de secretos y la documentación en español.

## Gobernanza
Esta constitución rige las prácticas de desarrollo del proyecto y prevalece sobre convenciones informales. Las enmiendas DEBEN proponerse mediante un Pull Request que explique el motivo y el impacto. Cualquier excepción DEBE justificarse y aprobarse en el Pull Request correspondiente. El versionado es semántico: MAYOR para cambios incompatibles en principios o gobernanza, MENOR para principios nuevos o requisitos ampliados, y PARCHE para aclaraciones.

**Versión**: 1.0.0 | **Ratificada**: 2026-10-17 | **Última enmienda**: 2026-10-17
