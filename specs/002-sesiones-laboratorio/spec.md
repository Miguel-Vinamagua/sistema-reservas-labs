# Feature Specification: Sesiones de laboratorio

**Feature Branch**: `002-sesiones-laboratorio`

**Created**: 2026-10-25

**Status**: Draft

**Input**: Contexto del cambio: el sistema pasa a operar con tres roles con comportamientos distintos. El administrador: sin cambios, gestiona laboratorios. El docente (`docente@utmachala.edu.ec`): inicia sesión, consulta los laboratorios, selecciona uno y crea una sesión de laboratorio indicando laboratorio, fecha, hora de inicio, hora de fin, materia y actividad; la sesión queda disponible para que los estudiantes se inscriban. Puede ver sus sesiones y cancelar las suyas. El estudiante: inicia sesión, ve las sesiones disponibles, selecciona una, presiona "Reservar cupo" y el sistema registra su reserva; cuando se alcanzan los cupos la sesión pasa a estado "llena" y no admite más reservas.

Decisiones ya tomadas para este cambio:

1. Nueva colección `sesiones` con laboratorio, docente, materia, fecha, inicio, fin, actividad, cupos y estado (abierta, llena, cancelada).
2. Cupos por defecto igual a la capacidad del laboratorio; el docente puede reducirlos pero no superarlos.
3. Dos sesiones activas del mismo laboratorio no pueden solaparse (intervalos con inicio incluido y fin excluido); se mantienen las reglas de fecha no pasada y fin posterior al inicio.
4. Nueva colección `materias` con nombre, código y docente asociado, cargada por seed por ahora; el docente solo puede usar sus materias.
5. La actividad es texto obligatorio dentro de la sesión.
6. Un estudiante no puede reservar dos veces la misma sesión y el control de cupos debe resistir solicitudes simultáneas.
7. En esta etapa no se modifican los endpoints actuales de reservas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Docente programa una sesión de laboratorio con materia y cupos (Priority: P1)

Un docente inicia sesión, consulta los laboratorios, selecciona uno y crea una sesión de laboratorio indicando laboratorio, fecha, hora de inicio, hora de fin, materia y actividad. La sesión queda disponible para que los estudiantes se inscriban.

**Why this priority**: Sin la programación de sesiones no existe el ciclo de materias, cupos e inscripción.

**Independent Test**: Con un docente autenticado y un laboratorio activo, el docente puede crear una sesión válida que queda registrada como disponible para inscripción.

**Acceptance Scenarios**:

1. **Given** que el docente está autenticado, **When** envía los datos de la sesión con laboratorio, materia, actividad, fecha, inicio y fin válidos, **Then** la sesión se crea con estado `abierta` y cupos iniciales.
2. **Given** que el docente define cupos, **When** los cupos son un entero positivo menor o igual a la capacidad del laboratorio, **Then** se guardan en la sesión.
3. **Given** que el docente define cupos, **When** los cupos superan la capacidad del laboratorio, **Then** la creación se rechaza.
4. **Given** que el docente registra la actividad, **When** la actividad está vacía, **Then** la creación se rechaza.

### User Story 2 - Estudiante se inscribe en una sesión disponible y el cupo se gestiona (Priority: P1)

Un estudiante inicia sesión, ve las sesiones disponibles, selecciona una, presiona "Reservar cupo" y el sistema registra su reserva. Cuando se alcanzan los cupos la sesión pasa a estado `llena` y no admite más reservas.

**Why this priority**: La inscripción con cupos es el flujo central del cambio.

**Independent Test**: Con una sesión con cupo disponible, un estudiante puede inscribirse; al alcanzarse el cupo la sesión pasa a `llena`.

**Acceptance Scenarios**:

1. **Given** que existe una sesión con estado `abierta` y cupo disponible, **When** el estudiante autenticado presiona "Reservar cupo", **Then** se registra su reserva y se consume el cupo.
2. **Given** que la sesión alcanzó sus cupos, **When** otro estudiante intenta inscribirse, **Then** la solicitud se rechaza.
3. **Given** que el estudiante ya se inscribió en la sesión, **When** intenta inscribirse nuevamente, **Then** la solicitud se rechaza.

### User Story 3 - Docente consulta y cancela sus sesiones (Priority: P2)

El docente consulta el estado de sus sesiones y cancela una activa; la cancelación libera los cupos.

**Why this priority**: La cancelación es necesaria para liberar cupos y mantener la consistencia.

**Independent Test**: Con sesiones creadas por el docente, este puede listarlas y cancelar una activa.

**Acceptance Scenarios**:

1. **Given** que el docente tiene sesiones, **When** consulta, **Then** ve sus sesiones con materia, actividad, cupos, inscripción y estado.
2. **Given** que el docente cancela una sesión activa, **When** confirma, **Then** la sesión pasa a `cancelada` y los cupos quedan liberados.

### Edge Cases

- Sesión llena: no admite más inscripciones.
- Sesión cancelada: no admite inscripciones.
- Doble inscripción: el estudiante no puede inscribirse dos veces en la misma sesión.
- Materia de otro docente: el docente solo puede usar materias asociadas a él.
- Solapamiento: dos sesiones activas del mismo laboratorio con intervalos que se cruzan.
- Concurrencia: solicitudes simultáneas sobre cupos; como máximo una inscripción efectiva.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir que un docente autenticado cree una sesión de laboratorio indicando laboratorio, materia, actividad, fecha, hora de inicio y hora de fin.
- **FR-002**: El sistema MUST asignar cupos por defecto igual a la capacidad del laboratorio; el docente puede reducir cupos pero no superarlos.
- **FR-003**: El sistema MUST rechazar dos sesiones activas del mismo laboratorio cuyos intervalos se solapen.
- **FR-004**: El sistema MUST rechazar la creación de una sesión con fecha anterior a la actual o con fin no posterior a la inicio.
- **FR-005**: El sistema MUST permitir el alta de materias con nombre, código y docente asociado mediante seed, y MUST restringir el uso de materias asociadas a otros docentes.
- **FR-006**: El sistema MUST exigir actividad obligatoria dentro de la sesión.
- **FR-007**: El sistema MUST impedir que un estudiante se inscriba dos veces en la misma sesión.
- **FR-008**: El sistema MUST gestionar el estado de la sesión (`abierta`, `llena`, `cancelada`) y el consumo de cupos.
- **FR-009**: El sistema MUST liberar cupos cuando la sesión se cancela.
- **FR-010**: El sistema MUST resistir solicitudes simultáneas sobre cupos.

### Key Entities *(include if feature involves data)*

- **SesionLaboratorio**: laboratorio, docente, materia, fecha, inicio, fin, actividad, cupos, estado (`abierta`, `llena`, `cancelada`).
- **Materia**: nombre, código y docente asociado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En pruebas de aceptación, el 100% de las sesiones creadas con reglas válidas quedan disponibles para inscripción y respetan los cupos definidos.
- **SC-002**: En pruebas de aceptación, el 100% de las inscripciones con cupo disponible se registran; al agotarse los cupos la sesión pasa a `llena` y se rechaza la siguiente.
- **SC-003**: En pruebas de aceptación, no se permiten dobles inscripciones ni solapamientos, y el control de cupos resiste solicitudes concurrentes.

## Assumptions

- Los usuarios docente y estudiante están provisionados con credenciales.
- Las materias se cargan por seed en esta etapa.
- No se requieren notificaciones por correo en esta etapa.

## Cambios respecto a 001

- Las historias de usuario 1, 2 y 3 de `specs/001-reservas-laboratorios/spec.md` quedan reemplazadas en esta etapa por el ciclo de sesiones de laboratorio descrito en esta especificación: la US1 (consultar laboratorios y reservar) se transforma en la programación de sesiones con materia/actividad/cupo para docentes y en la inscripción de estudiantes; la US2 se mantiene en el ciclo de inscripción/cancelación de sesiones; la US3 (administrador) no presenta cambios.
- En esta etapa no se modifican los endpoints actuales de reservas.
