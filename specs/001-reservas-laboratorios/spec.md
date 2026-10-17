# Feature Specification: Sistema de reservas de laboratorios

**Feature Branch**: `001-reservas-laboratorios`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Sistema de reservas de laboratorios de la universidad. Usuarios: estudiantes/docentes y administrador. Un usuario puede: ver la lista de laboratorios con su capacidad y ubicación, reservar un laboratorio indicando fecha, hora de inicio y hora de fin, ver sus reservas y cancelar las suyas. Reglas: no se permite reservar un laboratorio en un horario que se cruce con otra reserva; la hora de fin debe ser posterior a la de inicio; no se puede reservar en fechas pasadas. El administrador puede crear, editar y desactivar laboratorios. Fuera de alcance: pagos, notificaciones por correo y reportes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar laboratorios y reservar un espacio (Priority: P1)

Un estudiante o docente consulta los laboratorios disponibles, compara su capacidad y ubicación, y reserva uno indicando una fecha y un horario.

**Why this priority**: La reserva de espacios es el propósito principal del sistema y permite a los usuarios organizar actividades académicas.

**Independent Test**: Con al menos un laboratorio activo, un usuario puede consultar sus datos y completar una reserva en un horario libre y futuro.

**Acceptance Scenarios**:

1. **Given** que existen laboratorios activos, **When** un usuario consulta la lista, **Then** cada laboratorio muestra su capacidad y ubicación.
2. **Given** que un laboratorio está activo y no tiene una reserva que se cruce en el horario elegido, **When** el usuario envía una fecha, hora de inicio y hora de fin válidas, **Then** la reserva queda registrada y asociada a ese usuario.
3. **Given** que el horario elegido se cruza con una reserva existente del mismo laboratorio, **When** el usuario intenta reservarlo, **Then** el sistema rechaza la solicitud y no crea otra reserva.
4. **Given** que la hora de fin no es posterior a la hora de inicio o que la fecha es anterior a la fecha actual, **When** el usuario intenta reservar, **Then** el sistema rechaza la solicitud e informa que debe corregir los datos.
5. **Given** que dos reservas del mismo laboratorio terminan y comienzan a la misma hora, respectivamente, **When** se solicita la segunda reserva, **Then** el sistema la permite porque los horarios no se superponen.

---

### User Story 2 - Consultar y cancelar reservas propias (Priority: P2)

Un estudiante o docente revisa las reservas que ha realizado y puede cancelar una reserva propia.

**Why this priority**: Permite al usuario verificar sus compromisos y liberar un laboratorio cuando ya no lo necesita.

**Independent Test**: Con reservas asociadas a más de un usuario, cada usuario consulta únicamente sus reservas y cancela una propia; una reserva cancelada deja de impedir una nueva reserva para el mismo horario.

**Acceptance Scenarios**:

1. **Given** que el usuario tiene reservas registradas, **When** consulta sus reservas, **Then** ve sus fechas, horarios y laboratorios reservados, sin ver las reservas privadas de otros usuarios.
2. **Given** que el usuario selecciona una reserva propia activa, **When** confirma su cancelación, **Then** la reserva queda cancelada y el horario puede volver a reservarse.
3. **Given** que una reserva pertenece a otro usuario, **When** el usuario intenta cancelarla, **Then** el sistema rechaza la acción y la reserva permanece sin cambios.

---

### User Story 3 - Administrar laboratorios (Priority: P3)

El administrador mantiene el catálogo de laboratorios, creando nuevos espacios, actualizando sus datos o desactivándolos cuando dejan de estar disponibles para nuevas reservas.

**Why this priority**: Un catálogo actualizado es necesario para que las reservas reflejen los espacios que la universidad ofrece.

**Independent Test**: Un administrador crea un laboratorio, modifica sus datos y lo desactiva; los usuarios pueden reservarlo mientras está activo y no pueden crear nuevas reservas cuando está desactivado.

**Acceptance Scenarios**:

1. **Given** que el administrador proporciona los datos requeridos de un laboratorio, **When** lo crea, **Then** el laboratorio aparece en el catálogo activo con capacidad y ubicación.
2. **Given** que existe un laboratorio, **When** el administrador edita su capacidad o ubicación, **Then** los datos actualizados se muestran en el catálogo.
3. **Given** que existe un laboratorio activo, **When** el administrador lo desactiva, **Then** deja de ofrecerse para nuevas reservas y sus reservas existentes se conservan.
4. **Given** que un usuario intenta reservar un laboratorio desactivado, **When** envía la solicitud, **Then** el sistema la rechaza.
5. **Given** que un usuario que no es administrador intenta crear, editar o desactivar un laboratorio, **When** realiza la acción, **Then** el sistema la rechaza y el catálogo no cambia.

### Edge Cases

- Dos usuarios intentan reservar simultáneamente el mismo laboratorio para horarios que se cruzan: solo una de las reservas puede quedar confirmada.
- Una reserva empieza exactamente cuando termina otra del mismo laboratorio: ambas son válidas, pues sus intervalos solo se tocan en el límite.
- La fecha de reserva coincide con la fecha actual: se permite si las horas cumplen las demás reglas; solo se prohíben fechas anteriores a la fecha actual.
- El administrador desactiva un laboratorio que tiene reservas futuras: las reservas existentes se conservan, pero no se aceptan nuevas reservas.
- El usuario intenta cancelar una reserva que ya está cancelada o no existe: la solicitud se rechaza sin alterar otras reservas.
- No hay laboratorios activos: el catálogo informa que no existen espacios disponibles para reservar.
- La capacidad proporcionada al crear o editar un laboratorio no es un entero positivo, o la ubicación está vacía: el sistema rechaza los datos y conserva el catálogo sin cambios.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir que estudiantes y docentes consulten los laboratorios activos con su capacidad y ubicación.
- **FR-002**: El sistema MUST permitir que estudiantes y docentes creen una reserva indicando laboratorio, fecha, hora de inicio y hora de fin.
- **FR-003**: El sistema MUST asociar cada reserva con el usuario que la creó.
- **FR-004**: El sistema MUST rechazar una reserva si la hora de fin no es posterior a la hora de inicio.
- **FR-005**: El sistema MUST rechazar una reserva si su fecha es anterior a la fecha actual.
- **FR-006**: El sistema MUST impedir que dos reservas activas del mismo laboratorio tengan intervalos de tiempo superpuestos; las reservas que solo comparten el límite entre fin e inicio no se consideran superpuestas.
- **FR-007**: El sistema MUST permitir a estudiantes y docentes consultar sus propias reservas, mostrando el laboratorio, la fecha, el horario y el estado de cada reserva.
- **FR-008**: El sistema MUST permitir a un usuario cancelar sus propias reservas y MUST impedir que cancele reservas de otros usuarios.
- **FR-009**: Una reserva cancelada MUST dejar de bloquear el horario para otras reservas.
- **FR-010**: El sistema MUST permitir al administrador crear laboratorios con capacidad positiva y ubicación.
- **FR-011**: El sistema MUST permitir al administrador editar la capacidad y ubicación de un laboratorio.
- **FR-012**: El sistema MUST permitir al administrador desactivar un laboratorio sin eliminar sus reservas existentes.
- **FR-013**: El sistema MUST rechazar nuevas reservas para laboratorios desactivados.
- **FR-014**: El sistema MUST impedir que usuarios que no sean administradores creen, editen o desactiven laboratorios.
- **FR-015**: El sistema MUST validar las reglas de reserva y los permisos al procesar cada operación, sin depender únicamente de avisos o validaciones presentados al usuario.
- **FR-016**: Los pagos, las notificaciones por correo y los reportes MUST quedar fuera del alcance de esta funcionalidad.

### Key Entities *(include if feature involves data)*

- **Usuario**: Persona que utiliza el sistema, identificada como estudiante, docente o administrador. Las reservas quedan asociadas al usuario que las realiza.
- **Laboratorio**: Espacio reservable con capacidad, ubicación y estado activo o desactivado.
- **Reserva**: Solicitud de uso de un laboratorio asociada a un usuario, con fecha, hora de inicio, hora de fin y estado activa o cancelada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En pruebas de aceptación, el 100 % de las solicitudes con fechas pasadas, horas inválidas o cruces con reservas activas del mismo laboratorio se rechazan sin crear una reserva.
- **SC-002**: En pruebas de aceptación, el 100 % de las solicitudes válidas para horarios libres de laboratorios activos se registran correctamente; las reservas cuyos horarios solo coinciden en un límite también se aceptan.
- **SC-003**: Un usuario puede identificar la capacidad y ubicación de un laboratorio y completar una reserva válida en menos de 2 minutos, en una prueba de uso guiada.
- **SC-004**: En pruebas de permisos, ningún usuario puede consultar las reservas privadas de otro usuario, cancelar reservas ajenas ni administrar laboratorios sin el rol de administrador.
- **SC-005**: En pruebas de aceptación, el 100 % de las reservas existentes se conserva tras desactivar un laboratorio y ninguna nueva reserva para ese laboratorio se acepta.

## Assumptions

- Los usuarios ya cuentan con una identidad y un rol reconocibles por el sistema; el registro de cuentas y la asignación de roles no forman parte de esta funcionalidad.
- La fecha actual se interpreta según la fecha local de la universidad. No se aceptan fechas anteriores, pero para la fecha actual no se añade una regla que exija que la hora de inicio sea futura.
- Los horarios se interpretan en la hora local de la universidad y como intervalos donde el inicio se incluye y el fin se excluye; así, una reserva puede comenzar cuando termina otra.
- Los laboratorios tienen capacidad expresada como un entero positivo y una ubicación no vacía.
- Desactivar un laboratorio impide nuevas reservas, pero no cancela ni modifica automáticamente las reservas ya creadas.
- Los usuarios pueden cancelar sus propias reservas sin una ventana límite; no se define un flujo para que el administrador cancele reservas de usuarios.
- La cancelación cambia el estado de una reserva y conserva su registro para que pueda distinguirse de una reserva activa.
