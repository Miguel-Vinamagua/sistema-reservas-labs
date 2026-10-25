# Plan de implementación: Sesiones de laboratorio

**Rama**: `002-sesiones-laboratorio` | **Fecha**: 2026-10-25 | **Especificación**: [spec.md](./spec.md)

## Resumen

Completar el ciclo docente-estudiante de sesiones de laboratorio. Los docentes programan sesiones sobre laboratorios activos; los estudiantes consultan las sesiones, reservan cupos, cancelan reservas antes del fin, consultan su historial y revisan una agenda de sesiones en curso o futuras. La sesión es la unidad de programación y reserva. Las horas se presentan en `America/Guayaquil`.

## Contexto técnico

**Lenguajes y versiones**: JavaScript sobre Node.js 20; TypeScript para Angular según el proyecto.
**Dependencias principales**: Express, Mongoose, Angular standalone, Jest y Supertest.
**Persistencia**: MongoDB; colecciones de sesiones, materias, reservas, laboratorios y usuarios. No existe herramienta de migración documentada.
**Pruebas**: Jest/Supertest con base dedicada `reservas_test`; pruebas Angular de comportamiento visible.
**Plataforma**: aplicación web y servidor Node.js; CI en GitHub Actions.

## Restricciones y decisiones de diseño

- La reserva nueva referencia una sesión y al usuario; deja de almacenar laboratorio y horario como datos primarios de reserva.
- Se conservan los nombres de sesión `capacidadMax`, `inscritosCount` y `estado`; estados: `disponible`, `llena`, `cancelada`, `finalizada`.
- El backend es autoridad para permisos, solapamientos, duplicidad, tiempo de fin, cupos y consistencia transaccional. La UI solo complementa validaciones.
- La asignación y liberación del cupo, el estado de sesión y la reserva se coordinan atómicamente para impedir sobrecupo.
- La hora actual se evalúa en cada consulta; no se añaden tareas programadas. El cliente refresca periódicamente el horario.
- El frontend reutiliza rutas, servicios y componentes existentes de reservas/laboratorios cuando encajen. Una pantalla independiente de horarios solo se justifica si no existe una vista que represente ese propósito.
- Pruebas antes del código de producción, conforme a la constitución. Se adaptan pruebas antiguas; no se borran para conseguir verde.
- Los registros legados se conservan o migran con estrategia explícita y no destructiva. No se convierten intervalos antiguos en sesiones inventadas.
- Los secretos y URI se proporcionan fuera del repositorio.

## Revisión de la constitución

| Principio / restricción | Estado | Evidencia en este plan |
|---|---|---|
| Especificación primero | Cumple | El plan deriva de `spec.md` y los contratos se actualizan antes de implementación. |
| TDD | Cumple | Cada fase de implementación comienza con pruebas de regresión/aceptación que deben fallar por el motivo esperado. |
| Reglas en backend | Cumple | Autorización, solapamiento, duplicidad, fin, cupos y atomicidad se verifican en el servidor. |
| GitHub Flow y revisión | Cumple | Cambios se realizan en rama enfocada y se integran mediante PR revisado. |
| Commits convencionales | Cumple | Los commits usan prefijos convencionales definidos por la constitución. |
| CI | Cumple | La integración requiere pruebas backend y frontend verdes con MongoDB transaccional para las pruebas que lo necesiten. |
| Higiene de secretos | Cumple | No se documentan ni incorporan secretos; la configuración es externa. |
| Simplicidad, español y stack | Cumple | Se reutiliza Angular/Express/Mongoose y la documentación está en español. |

## Estructura existente prevista

```text
backend/
├── src/
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   └── services/
├── scripts/
└── tests/
    ├── unit/
    └── integration/

frontend/src/app/
├── core/
├── features/
│   ├── laboratorios/
│   ├── reservas/
│   └── sesiones/
└── shared/
```

**Decisión de estructura**: mantener las capas y módulos existentes. Adaptar `reservas.service.js`, rutas/controladores ya presentes y los servicios/componentes frontend existentes. No agregar una capa genérica nueva para horarios o reservas. Cualquier componente nuevo de tabla horaria requiere confirmar que no puede reutilizarse razonablemente una vista existente.

## Fases de trabajo

### A. Docente backend

Esta fase está marcada como completada en `tasks.md`: modelos y seed, creación de sesiones, validación de cupos y solapamiento del laboratorio.

### B. Docente frontend

Completar mediante TDD el panel existente de creación y gestión de sesiones.

### C. Estudiante backend — pruebas primero

1. Extender pruebas de integración para permisos, reserva por `sesionLaboratorioId`, sesión no disponible/terminada, duplicidad, solapamiento del estudiante, cancelación e historial.
2. Añadir prueba concurrente para el límite de `capacidadMax` y cobertura unitaria del índice/regla de unicidad.
3. Adaptar pruebas de seed del esquema antiguo sin retirar sus afirmaciones de idempotencia.
4. Solo después implementar la consistencia transaccional de reservas, cancelación, estado efectivo finalizado e historial.

### D. Estudiante frontend — pruebas primero

1. Actualizar pruebas del formulario y servicio para selección de sesiones y envío del ID de sesión.
2. Añadir pruebas para detalles/cupos, sesión llena, errores del servidor, estado del historial, cancelación confirmada y fin de sesión.
3. Añadir pruebas de pantalla de horarios, orden, campos, zona horaria, exclusión al fin y actualización periódica.
4. Solo después adaptar componentes, servicios, rutas, navegación y guards existentes.

### E. Horarios backend — pruebas primero

1. Probar antes el endpoint de agenda con sesiones pasadas, en curso, futuras, llenas y canceladas; verificar el límite temporal `fin <= ahora`.
2. Probar campos requeridos, orden y presentación horaria.
3. Implementar el listado calculado por consulta y documentar la ruta definitiva.

### F. Migración y verificación integral

1. Determinar con pruebas cómo conservar reservas legadas que contienen laboratorio/horario pero no sesión.
2. Migrar seed, fixtures y persistencia al esquema nuevo sin eliminación de datos/pruebas.
3. Ejecutar las suites completas backend y frontend; verificar que cubren la especificación y que ninguna prueba se debilitó.

## Riesgos y preguntas pendientes

- La política exacta de solapamiento entre laboratorios debe resolverse conforme a la pregunta abierta en `spec.md` y la constitución.
- La cancelación de una sesión con reservas ya creadas requiere definir el estado visible de esas reservas y el cómputo de cupos.
- El código/documentación actuales usan `cupos` y `abierta`, mientras el contrato actualizado conserva `capacidadMax` y `disponible`; la transición requiere decidir compatibilidad y migración antes de tocar producción.
- Las reservas legadas no se pueden asociar a sesiones con seguridad sin una regla de migración explícita.
- No se debe declarar completada una fase mientras las pruebas nuevas estén fallando o las existentes hayan sido quitadas.

## Complejidad

No se propone una capa arquitectónica nueva. La parte de mayor riesgo es mantener capacidad, reserva e historial consistentes con concurrencia y datos históricos, por lo que se cubre con pruebas de integración y migración antes de implementación.
