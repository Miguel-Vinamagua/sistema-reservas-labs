# Tareas: Sesiones, reservas y horarios de laboratorio

**Entrada**: Especificación y diseño en `specs/002-sesiones-laboratorio/`
**Requisitos previos**: `spec.md`, `plan.md`, `data-model.md`, `api-contract.md`
**Regla TDD**: Por constitución, escribir primero pruebas que fallen por la regla esperada, después implementar, y finalmente refactorizar sin debilitar ni eliminar pruebas existentes.

## Fase A: Docente backend — creación de sesiones

- [X] T100 [P] [US1] Escribir pruebas unitarias de modelos y seed idempotente para docente y materias.
- [X] T101 [P] [US1] Escribir pruebas de integración para creación, autenticación y permisos de sesiones.
- [X] T105 [US1] Implementar modelos de materia/sesión y seed idempotente del docente y dos materias.
- [X] T102 [US1] Implementar creación de sesión con datos de docente, laboratorio, materia, actividad, horario y capacidad inicial.
- [X] T103 [US1] Validar actividad y cupos dentro de la capacidad del laboratorio.
- [X] T104 [US1] Rechazar solapamientos activos del mismo laboratorio.

## Fase B: Docente frontend — panel de sesiones

- [ ] T201 [P] [US1] Escribir pruebas Angular para carga de laboratorios/materias, creación, errores y gestión de sesiones propias.
- [ ] T202 [US1] Implementar y conectar el panel docente usando rutas, guard y servicios existentes.

## Fase C: Estudiante backend — inscripción, cancelación e historial (TDD)

### Pruebas primero

- [ ] T301 [P] [US2] Ampliar `backend/tests/integration/reservations.test.js` para reservar una sesión disponible con `sesionLaboratorioId` y para validar permisos de estudiante.
- [ ] T302 [P] [US2] Añadir pruebas de integración para sesión llena, cancelada, terminada y laboratorio inactivo.
- [ ] T303 [P] [US2] Añadir pruebas de duplicidad: segunda reserva activa para la misma pareja estudiante-sesión rechazada.
- [ ] T304 [P] [US2] Añadir pruebas de solapamiento entre reservas activas del mismo estudiante; incluir sesiones de laboratorios distintos para fijar la regla elegida.
- [ ] T305 [P] [US2] Añadir pruebas para cancelar una reserva propia antes del fin, liberar un cupo y reabrir una sesión llena.
- [ ] T306 [P] [US3] Añadir pruebas para no cancelar después del fin y para historial con estados efectivos `activa`, `cancelada` y `finalizada`.
- [ ] T307 [P] [US2] Reforzar `backend/tests/integration/reservation-concurrency.test.js` para que varias solicitudes simultáneas nunca superen `capacidadMax`.
- [ ] T308 [P] [US2] Actualizar pruebas unitarias de `Reserva` para referencias a sesión/usuario y unicidad de reservas activas sin perder los casos existentes.
- [ ] T309 [P] [US2] Actualizar `backend/tests/unit/seed-labs.test.js` para comprobar seed de sesiones y reservas bajo el nuevo esquema, conservando idempotencia y casos de conflicto.

### Implementación después de pruebas

- [ ] T310 [US2] Alinear `SesionLaboratorio` y las serializaciones al vocabulario contractual `capacidadMax`, `inscritosCount` y `estado: disponible/llena/cancelada/finalizada`, con pruebas de migración/compatibilidad explícitas.
- [ ] T311 [US2] Implementar rechazo atómico de duplicidad y solapamiento para reservas activas del estudiante.
- [ ] T312 [US2] Validar en el momento de reservar que la sesión no esté cancelada, llena ni terminada y que el laboratorio siga activo.
- [ ] T313 [US2] Garantizar atómicamente que creación de reserva, incremento de `inscritosCount` y transición a `llena` no excedan `capacidadMax`.
- [ ] T314 [US3] Implementar cancelación propia antes del fin, liberación única del cupo y transición `llena` a `disponible`.
- [ ] T315 [US3] Serializar el historial del usuario autenticado con el estado efectivo `finalizada` al terminar la sesión, sin borrar ni modificar el registro histórico de la reserva.
- [ ] T316 [US2] Migrar el seed `backend/scripts/seed-labs.js` para crear datos que referencien sesiones sin borrar reservas o pruebas; conservar idempotencia.

## Fase D: Estudiante frontend — Laboratorios, reservas y horarios (TDD)

### Pruebas primero

- [ ] T401 [P] [US2] Actualizar `frontend/src/app/features/reservas/reserva-form.component.spec.ts` para seleccionar una sesión disponible, mostrar sus datos/cupos y enviar `sesionLaboratorioId`.
- [ ] T402 [P] [US2] Añadir pruebas de interfaz para sesión llena/no disponible, mensajes de duplicidad/solapamiento y acción de reserva deshabilitada.
- [ ] T403 [P] [US3] Actualizar `frontend/src/app/features/reservas/mis-reservas.component.spec.ts` para mostrar materia, actividad y estados efectiva `activa`, `cancelada` y `finalizada`, además de cancelar con confirmación.
- [ ] T404 [P] [US4] Añadir pruebas para la tabla de horarios, campos requeridos, orden cronológico, exclusión al llegar a `fin`, zona `America/Guayaquil` y refresco periódico.
- [ ] T405 [P] [US2] Actualizar las pruebas de `ReservasService`/`SesionesService` para request/response de reserva ligada a sesión y endpoint de horarios.
- [ ] T406 [P] [US2] Añadir pruebas de guards/rutas que aseguren que las pantallas de estudiante no exponen el flujo a roles no permitidos.

### Implementación después de pruebas

- [ ] T407 [US2] Reutilizar `sesiones.service.ts` para consultar sesiones disponibles y horarios; tipar los campos contractuales y el estado de sesión.
- [ ] T408 [US2] Modificar `reserva-form.component.ts` para seleccionar y reservar una sesión, presentar cupos libres y desactivar sesiones no reservables.
- [ ] T409 [US3] Modificar `reservas.service.ts` y `mis-reservas.component.ts` para enviar el ID de sesión y presentar el historial efectivo con datos completos.
- [ ] T410 [US4] Añadir la pantalla de horarios únicamente si, tras revisar componentes existentes, no hay una vista reutilizable; mostrar sesiones en curso/futuras, ordenar por inicio y refrescar periódicamente.
- [ ] T411 [US2] Actualizar `app.routes.ts` y `navbar.component.html` en escritorio y móvil para que el estudiante acceda a Laboratorios, Mis reservas y Horarios.
- [ ] T412 [US2] Alinear los guards de rutas existentes con los roles permitidos por el contrato.

## Fase E: Horarios backend y contrato (TDD)

### Pruebas primero

- [ ] T501 [P] [US4] Añadir pruebas de integración para el listado de horarios: incluye sesiones futuras/en curso y llenas, excluye canceladas y `fin <= ahora`, ordena por fecha/hora y verifica datos de laboratorio/docente/cupos.
- [ ] T502 [P] [US4] Añadir pruebas de formato/estado efectivo de fechas y horarios en `America/Guayaquil`.

### Implementación después de pruebas

- [ ] T503 [US4] Implementar el endpoint de horarios en `sesiones.routes.js` y `sesiones.controller.js`, calculado en cada consulta sin cron.
- [ ] T504 [US4] Actualizar `api-contract.md`, `data-model.md` y `plan.md` cuando se resuelvan las preguntas abiertas de comportamiento o migración.

## Migración y compatibilidad

- [ ] T601 [P] [US2] Inventariar reservas legadas con `laboratorio`/`inicio`/`fin` y definir una estrategia no destructiva de retención o transformación.
- [ ] T602 [US2] Añadir pruebas para la estrategia elegida antes de cambiar datos o inicialización del seed.
- [ ] T603 [US2] Ejecutar la migración definida sin eliminar registros históricos ni debilitar pruebas; verificar que reservas nuevas solo referencien sesiones.

## Casos de aceptación transversales

- [ ] T701 Sesión llena: rechazar reservas posteriores en frontend y backend.
- [ ] T702 Sesión cancelada: rechazar nuevas reservas.
- [ ] T703 Sesión terminada: rechazar nuevas reservas y cancelaciones tardías; historial la muestra como finalizada y horarios la excluye.
- [ ] T704 Doble reserva activa de la misma sesión: rechazarla, incluso en solicitudes simultáneas.
- [ ] T705 Solapamiento entre reservas activas de un estudiante: rechazarlo.
- [ ] T706 Concurrencia de cupos: las reservas confirmadas nunca superan `capacidadMax`.
- [ ] T707 Cancelación antes de finalizar: liberar exactamente un cupo; si la sesión estaba llena, vuelve a `disponible`.
- [ ] T708 Zona horaria: las fechas y horas de las tres pantallas del estudiante se presentan en `America/Guayaquil`.

## Preguntas abiertas

- ¿El solapamiento de reservas del estudiante se aplica a toda sesión de su agenda aunque sea de otro laboratorio, o únicamente a sesiones del mismo laboratorio, como expresa actualmente la constitución?
- ¿Qué estado y política de liberación se aplica a las reservas existentes cuando un docente cancela su sesión?
- ¿Se permite conservar una reserva cancelada y crear una nueva reserva para la misma sesión si todavía quedan cupos?
- ¿Cómo deben presentarse las reservas legadas que no puedan asociarse a una sesión sin inferir datos que no existen?
- ¿Las operaciones de reservas se limitan a estudiantes o se conserva el permiso actual de docentes?
