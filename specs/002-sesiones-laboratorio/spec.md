# Especificación: Sesiones de laboratorio

**Rama**: `002-sesiones-laboratorio`
**Fecha**: 2026-10-25
**Estado**: Borrador
**Entrada**: Completar el ciclo de sesiones de laboratorio para docentes y estudiantes, incluyendo inscripción, consulta de horarios e historial de reservas.

## Contexto y alcance

El sistema contempla tres roles. El administrador mantiene la gestión de laboratorios. El docente consulta laboratorios activos, crea sesiones asociadas a una materia y actividad, y gestiona sus propias sesiones. El estudiante consulta las sesiones programadas por docentes, reserva un cupo, consulta y cancela sus reservas, y revisa la programación académica.

La sesión es la unidad seleccionable y reservable. El estudiante no crea fechas ni horarios de reserva: elige una sesión ya programada. Las horas mostradas al usuario se interpretan y presentan en la zona `America/Guayaquil`.

## Cambios respecto a 001

- El modelo de reserva de `specs/001-reservas-laboratorios/spec.md`, que asociaba directamente una reserva con un laboratorio, una fecha y horas de inicio y fin, se reemplaza por una reserva asociada obligatoriamente a una sesión y al estudiante que la realiza. El laboratorio y el horario se obtienen de la sesión referenciada.
- La reserva mantiene su identidad e historial; no se borran las reservas antiguas ni sus pruebas. Los datos legados se migrarán o transformarán mediante una tarea explícita, conservando su información y evitando que registros sin sesión válida se presenten como reservas de sesiones nuevas.
- Las pruebas que verifican el modelo antiguo, los cuerpos de reserva con `laboratorioId`/`inicio`/`fin` y los fixtures del seed deben actualizarse para usar `sesionLaboratorioId` y sesiones relacionadas. Se conservan y adaptan las pruebas existentes; no se eliminan para hacer pasar la nueva implementación.
- Los nombres de campos de sesión establecidos para esta especificación son `capacidadMax`, `inscritosCount` y `estado`. El estado de una sesión con cupos se denomina `disponible`; al ocupar todos los cupos pasa a `llena`.
- El flujo de administración de laboratorios se mantiene fuera de este alcance.

## Historias de usuario y pruebas

### US1 — Docente programa sesiones (Prioridad: P1)

Un docente autenticado selecciona un laboratorio activo, materia y actividad, y programa fecha, inicio, fin y cupos. Puede consultar sus sesiones y cancelar una propia.

**Prueba independiente**: un docente puede crear y consultar una sesión válida y cancelar una sesión propia; otro rol no puede realizar operaciones reservadas al docente.

**Criterios de aceptación**:

1. La creación válida produce una sesión `disponible`; si no se especifican cupos, `capacidadMax` se asigna con la capacidad del laboratorio.
2. Los cupos deben ser enteros positivos y no superar la capacidad del laboratorio.
3. `fin` debe ser posterior a `inicio`, la sesión no puede programarse en el pasado y la actividad no puede estar vacía.
4. No se admiten sesiones activas solapadas en el mismo laboratorio.
5. El docente solo puede gestionar sus propias sesiones y usar materias asociadas a él.

### US2 — Estudiante reserva una sesión disponible (Prioridad: P1)

El estudiante abre la pestaña **Laboratorios**, consulta sesiones creadas por docentes, elige una y presiona **Reservar cupo**. El sistema registra la reserva asociada a esa sesión y al estudiante autenticado.

**Prueba independiente**: con una sesión disponible y cupos, un estudiante puede reservar; se actualizan el contador y el estado. Al alcanzar la capacidad, la sesión deja de admitir reservas.

**Criterios de aceptación**:

1. Cada elemento reservable muestra laboratorio, ubicación, materia, docente, actividad, fecha, horario y cupos libres/total.
2. No se admite una segunda reserva activa del mismo estudiante para la misma sesión.
3. No se admite una reserva si el horario se solapa con otra reserva activa del estudiante.
4. No se admite reservar sesiones canceladas, llenas o cuya hora de fin haya llegado.
5. Cuando `inscritosCount` alcanza `capacidadMax`, la sesión pasa a `llena` y la acción de reserva se desactiva; el backend sigue rechazando solicitudes.
6. Solicitudes simultáneas no pueden superar `capacidadMax` ni registrar más reservas efectivas que los cupos disponibles.

### US3 — Estudiante consulta y cancela sus reservas (Prioridad: P1)

El estudiante consulta el historial de sus reservas y puede cancelar una reserva antes de que termine la sesión.

**Prueba independiente**: el estudiante ve únicamente sus reservas con sus datos de sesión y puede cancelar una reserva propia elegible, liberando el cupo.

**Criterios de aceptación**:

1. El historial muestra los estados `activa`, `cancelada` o `finalizada`. `finalizada` indica que la sesión vinculada ya terminó; no requiere que la reserva se elimine.
2. Cancelar antes de que termine la sesión cambia la reserva a `cancelada` y libera el cupo.
3. Si la sesión estaba `llena`, liberar un cupo devuelve su estado a `disponible`.
4. No se puede cancelar una reserva ajena ni una reserva de una sesión cuyo fin ya llegó.

### US4 — Estudiante consulta horarios (Prioridad: P2)

El estudiante consulta una tabla de sesiones en curso o futuras que no estén canceladas.

**Prueba independiente**: la tabla contiene las sesiones no canceladas cuyo fin todavía no ha llegado, en orden cronológico, y excluye una sesión en el instante en que alcanza su fin.

**Criterios de aceptación**:

1. La tabla muestra laboratorio, ubicación, materia, docente, actividad, fecha, horario, cupos ocupados/total y estado.
2. Las sesiones se ordenan por fecha y hora de inicio ascendente.
3. Las sesiones con estado `cancelada` o con `fin <= hora actual` no se incluyen.
4. La pantalla vuelve a consultar periódicamente; la inclusión y exclusión se determina en cada consulta usando la hora actual, sin depender de tareas programadas.
5. Fechas y horas se presentan en `America/Guayaquil`.

## Requisitos funcionales

- **FR-001**: El docente autenticado puede crear sesiones asociadas a un laboratorio activo, a una materia propia y a su identidad autenticada.
- **FR-002**: El backend asigna `capacidadMax` por defecto a partir de la capacidad del laboratorio y valida cualquier valor explícito.
- **FR-003**: El backend rechaza sesiones con datos inválidos, actividad vacía, horario pasado, fin no posterior al inicio o solapamiento con otra sesión activa del mismo laboratorio.
- **FR-004**: El estudiante autenticado puede consultar sesiones reservables y crear una reserva enviando la sesión seleccionada; la identidad se toma de la autenticación.
- **FR-005**: El backend impide reservas duplicadas activas para la misma sesión y reservas del estudiante con horarios solapados.
- **FR-006**: El backend rechaza reservas de sesiones llenas, canceladas o terminadas, y cambia el estado a `llena` al llegar a `capacidadMax`.
- **FR-007**: El control transaccional de cupos garantiza que solicitudes concurrentes no excedan `capacidadMax`.
- **FR-008**: El estudiante puede consultar solo sus reservas, incluyendo datos de la sesión vinculada y los estados `activa`, `cancelada` y `finalizada`.
- **FR-009**: El estudiante puede cancelar una reserva propia antes del fin de la sesión; la operación libera un cupo y puede cambiar `llena` a `disponible`.
- **FR-010**: El estudiante puede consultar sesiones en curso o futuras no canceladas, en orden de inicio, con la información necesaria para organizar su horario.
- **FR-011**: La lista de horarios se calcula en cada consulta con la hora actual; la interfaz la actualiza periódicamente y excluye sesiones cuando `fin <= ahora`.
- **FR-012**: El frontend muestra validaciones, cupos libres y estados de forma coherente, pero las reglas de autorización, duplicidad, solapamiento y capacidad siempre se validan en el backend.
- **FR-013**: Los datos legados de reserva se migran o se retienen de forma segura y trazable; ninguna prueba existente se elimina para ocultar incompatibilidades.

## Entidades clave

- **SesionLaboratorio**: laboratorio, docente, materia, actividad, fecha, inicio, fin, `capacidadMax`, `inscritosCount` y `estado`.
- **Reserva**: referencia obligatoria a `SesionLaboratorio`, referencia obligatoria al estudiante y estado de reserva. `finalizada` se presenta en el historial cuando terminó la sesión vinculada.
- **Materia**: nombre, código y docente asociado.

## Criterios de éxito

- **SC-001**: El 100% de los intentos de exceder la capacidad, duplicar una reserva activa o reservar una sesión no elegible se rechaza en pruebas de aceptación.
- **SC-002**: En las pruebas de concurrencia, el total de reservas activas nunca supera `capacidadMax`.
- **SC-003**: Una cancelación elegible libera exactamente un cupo y el historial conserva la reserva como cancelada.
- **SC-004**: El estudiante puede identificar y seleccionar una sesión con todos los datos requeridos sin introducir manualmente laboratorio, fecha ni horario.
- **SC-005**: En cada consulta de horarios, el resultado excluye sesiones canceladas y sesiones cuyo fin haya llegado, y mantiene el orden cronológico.

## Supuestos

- Los estudiantes, docentes, laboratorios y materias ya están provisionados.
- Una reserva cancelada conserva su historial y no ocupa cupo.
- Los cupos ocupados se representan mediante `inscritosCount`; el total se representa mediante `capacidadMax`.
- Los endpoints y tareas de implementación se alinean con las rutas existentes cuando sea posible; cualquier modificación contractual queda documentada antes de implementarse.

## Preguntas abiertas

- ¿La regla de solapamiento de reservas del estudiante debe considerar cualquier laboratorio o solo sesiones del mismo laboratorio? La especificación exige impedir solapamiento entre reservas activas del estudiante, pero la constitución vigente nombra explícitamente el mismo laboratorio.
- Cuando un docente cancela una sesión que ya tiene reservas activas, ¿esas reservas deben pasar automáticamente a `cancelada`, mantenerse como activas con una sesión cancelada o recibir otro estado derivado?
- ¿Las operaciones de reservas deben restringirse exclusivamente al rol estudiante? Las rutas actuales permiten también al rol docente, mientras que este flujo describe al estudiante.
- ¿Qué política se aplicará a reservas históricas del modelo 001 que no puedan vincularse inequívocamente a una sesión existente: conservarlas como registros legados de solo lectura o archivarlas fuera de la colección operativa?
