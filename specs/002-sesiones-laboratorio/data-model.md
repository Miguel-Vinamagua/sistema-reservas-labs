# Modelo de datos: Sesiones y reservas

MongoDB almacena las entidades del sistema. El modelo de reserva de la especificación 001 queda reemplazado: una reserva nueva referencia una sesión, no directamente un laboratorio ni horas de reserva independientes.

## SesionLaboratorio (`sesiones`)

| Campo | Tipo | Reglas |
|---|---|---|
| `_id` | ObjectId | Identificador generado por MongoDB. |
| `laboratorio` | ObjectId | Requerido; referencia a `Laboratorio`. |
| `docente` | ObjectId | Requerido; referencia a `Usuario` docente. |
| `materia` | String | Requerido; materia de la sesión. |
| `fecha` | Date | Requerido; fecha local de la sesión. |
| `inicio` | Date | Requerido; instante de inicio. |
| `fin` | Date | Requerido; instante de fin posterior a `inicio`. |
| `actividad` | String | Requerido; no puede estar vacío después de normalizar espacios. |
| `capacidadMax` | Number | Requerido; entero positivo, no superior a la capacidad del laboratorio. Por defecto, la capacidad del laboratorio. |
| `inscritosCount` | Number | Contador de reservas activas que ocupan cupo; inicial 0. |
| `estado` | String | `disponible`, `llena`, `cancelada` o `finalizada`; inicialmente `disponible`. |

`disponible` significa que la sesión acepta reservas mientras `inscritosCount < capacidadMax`. Al alcanzar el límite, pasa a `llena`. Si se libera un cupo mediante cancelación antes de terminar, vuelve a `disponible`. Una sesión cancelada o finalizada no acepta nuevas reservas.

## Reserva (`reservas`)

| Campo | Tipo | Reglas |
|---|---|---|
| `_id` | ObjectId | Identificador generado por MongoDB. |
| `sesionLaboratorio` | ObjectId | Requerido; referencia a `SesionLaboratorio`. |
| `usuario` | ObjectId | Requerido; referencia al usuario estudiante autenticado. |
| `estado` | String | Estado persistido `activa` o `cancelada`; inicialmente `activa`. La respuesta del historial puede exponer `finalizada` como estado efectivo si la sesión referenciada terminó. |
| `createdAt`, `updatedAt` | Date | Timestamps para trazabilidad. |

Una reserva no duplica laboratorio, fecha, inicio ni fin: esos datos se leen de `sesionLaboratorio`. El sistema conserva las reservas canceladas para mantener el historial. Una reserva activa consume un cupo; una cancelada no.

La unicidad lógica requerida es una sola reserva activa por combinación de sesión y usuario. La garantía debe cubrir solicitudes simultáneas, además de validarse en la regla de negocio. Las reservas canceladas no deben impedir que el estudiante vuelva a reservar una sesión que siga elegible, salvo que una política posterior defina lo contrario.

## Materia (`materias`)

| Campo | Tipo | Reglas |
|---|---|---|
| `_id` | ObjectId | Identificador generado por MongoDB. |
| `nombre` | String | Requerido; nombre de la materia. |
| `codigo` | String | Requerido; código de la materia. |
| `docente` | ObjectId | Requerido; referencia al docente asociado. |

## Relaciones

- Un laboratorio puede tener muchas sesiones.
- Un docente puede crear muchas sesiones y estar asociado a muchas materias.
- Una sesión pertenece a un laboratorio y a un docente y tiene una materia.
- Una reserva pertenece a exactamente una sesión y a exactamente un estudiante.
- Una sesión admite como máximo `capacidadMax` reservas activas.

## Reglas de integridad y ciclo de vida

1. El servidor valida que laboratorio y docente existan, que el laboratorio esté activo y que la materia pertenezca al docente.
2. `fin` debe ser posterior a `inicio`; no se crean sesiones con inicio pasado.
3. No se permiten sesiones activas solapadas del mismo laboratorio.
4. El servidor solo crea una reserva si la sesión es `disponible`, todavía no terminó y conserva cupos.
5. El servidor rechaza una segunda reserva activa del mismo usuario para la misma sesión y cualquier solapamiento con otra reserva activa de ese usuario.
6. El incremento de `inscritosCount`, la transición a `llena` cuando corresponde y el alta de la reserva forman una operación atómica frente a solicitudes concurrentes.
7. Cancelar una reserva propia antes de `fin` actualiza su estado, decrementa `inscritosCount` una sola vez y transiciona de `llena` a `disponible` cuando se libera capacidad.
8. En cada consulta, sesiones con `fin <= ahora` se tratan como finalizadas. La consulta de horarios las excluye; el historial de reservas las presenta con estado efectivo `finalizada`. No se requieren tareas programadas.
9. Las fechas y horas se presentan en `America/Guayaquil`; los instantes almacenados y transmitidos deben conservar el momento correcto independientemente de la zona del navegador.

## Sustitución del modelo 001 y compatibilidad

El modelo antiguo de reserva tenía laboratorio, usuario e intervalos propios (`inicio`, `fin`). El modelo actual asocia la reserva a `sesionLaboratorio` y `usuario`; horario y laboratorio se obtienen mediante la referencia a sesión.

La transición debe conservar registros y pruebas existentes:

- Las pruebas del modelo deben exigir `sesionLaboratorio` y `usuario`, y verificar la unicidad lógica de reservas activas.
- Las pruebas de integración de reservas deben crear sesiones relacionadas y enviar `sesionLaboratorioId`.
- Las pruebas del seed que esperan `laboratorio`/`inicio`/`fin` deben migrar sus fixtures y expectativas al esquema sesión-reserva, conservando cobertura de idempotencia.
- Los registros legados sin sesión correspondiente no se deben convertir inventando una sesión ni exponerse como reservas nuevas; su retención, lectura histórica o archivo queda pendiente de la política de migración.

La implementación actual del repositorio usa `cupos` y `abierta` donde este diseño establece `capacidadMax` y `disponible`. La alineación debe hacerse explícitamente y cubrirse con pruebas; no se deben mezclar ambos vocabularios en el contrato público.
