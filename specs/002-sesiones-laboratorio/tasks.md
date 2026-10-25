# Tareas: Sesiones de laboratorio

**Entrada**: Documentos de diseño en `specs/002-sesiones-laboratorio/`

**Requisitos previos**: `plan.md`, `spec.md`, `data-model.md`, `api-contract.md`

**Pruebas**: Obligatorias según la constitución del proyecto. Escribir las pruebas backend con Jest y Supertest y las pruebas pertinentes de Angular antes del código de producción, y verificar que fallen por el motivo esperado.

**Organización**: Las tareas se agrupan por fase del flujo docente-estudiante.

## Fase A: Docente backend — creación de sesiones con materia, actividad y cupos

- [ ] T101 [P] [US1] Escribir pruebas de integración para crear una sesión de laboratorio como docente autenticado en `backend/tests/integration/sesiones.test.js`.
- [ ] T102 [US1] Implementar la creación de sesión con materia, actividad, fecha, inicio y fin, y con cupos por defecto igual a la capacidad del laboratorio.
- [ ] T103 [US1] Añadir validación de cupos (enteros positivos no superiores a la capacidad) y exigir actividad obligatoria.
- [ ] T104 [US1] Añadir verificación de solapamiento de sesiones activas del mismo laboratorio.

## Fase B: Docente frontend — panel de sesiones

- [ ] T201 [P] [US1] Escribir pruebas de Angular para el panel docente de sesiones (crear, listar y cancelar).
- [ ] T202 [US1] Implementar el panel docente en `frontend/src/app/features/sesiones/`.

## Fase C: Estudiante con inscripción y cupos

- [ ] T301 [P] [US2] Escribir pruebas de inscripción del estudiante (cupo disponible, sesión llena y doble inscripción).
- [ ] T302 [US2] Implementar el flujo de inscripción con control de cupos y liberación en cancelación.

## Fase D: Campo de actividad en la reserva

- [ ] T401 [P] [US2] Escribir pruebas para registrar la actividad asociada a la reserva/sesión.
- [ ] T402 [US2] Implementar el campo de actividad en el flujo de reserva.

## Casos límite

- [ ] T501 Sesión llena: no admite más inscripciones.
- [ ] T502 Sesión cancelada: no admite inscripciones y libera cupos.
- [ ] T503 Doble inscripción: el estudiante no puede inscribirse dos veces en la misma sesión.
- [ ] T504 Materia de otro docente: el docente solo puede usar materias asociadas a él.
- [ ] T505 Solapamiento: dos sesiones activas del mismo laboratorio con intervalos que se cruzan.
- [ ] T506 Concurrencia sobre cupos: como máximo una inscripción efectiva en solicitudes simultáneas.

## Preguntas abiertas

- Si en esta etapa no se modifican los endpoints actuales de reservas, ¿la inscripción del estudiante se resuelve con el endpoint existente `POST /api/reservas` (usando `sesionLaboratorioId`), o se incorpora un endpoint específico de inscripción sin alterar el existente?
- La colección `sesiones` descrita en la decisión (1) ya existe en el código como `sesioneslaboratorio` con campos `capacidadMax`/`inscritosCount` y estado (`disponible`, `llena`, `finalizada`); ¿cambia la semántica a `cupos`, `abierta` y `cancelada`, o se mantiene la nomenclatura actual?
- ¿El campo `materia` de la sesión es texto libre (nombre) o referencia a la colección `materias`?
- ¿El campo `fecha` de la sesión es una fecha independiente o se deriva de `inicio`?
