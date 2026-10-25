# Modelo de datos: Sesiones de laboratorio

Los modelos Mongoose definen las colecciones; no se usan migraciones.

## SesionLaboratorio (`sesiones`)

| Campo | Tipo | Reglas |
|---|---|---|
| `_id` | ObjectId | Identificador generado por MongoDB. |
| `laboratorio` | ObjectId | Requerido; referencia a `Laboratorio`. |
| `docente` | ObjectId | Requerido; referencia a `Usuario` con rol docente. |
| `materia` | String | Requerido; nombre de la materia de la sesión. |
| `fecha` | Date | Requerido; fecha de la sesión. |
| `inicio` | Date | Requerido; fecha y hora de inicio. |
| `fin` | Date | Requerido; debe ser posterior a `inicio`. |
| `actividad` | String | Requerido; texto obligatorio dentro de la sesión. |
| `cupos` | Number | Entero positivo; por defecto la capacidad del laboratorio. |
| `estado` | String | Requerido; enum `abierta`, `llena`, `cancelada`, `finalizada`; valor inicial `abierta`. |

## Materia (`materias`)

| Campo | Tipo | Reglas |
|---|---|---|
| `_id` | ObjectId | Identificador generado por MongoDB. |
| `nombre` | String | Requerido; nombre de la materia. |
| `codigo` | String | Requerido; código de la materia. |
| `docente` | ObjectId | Requerido; docente asociado a la materia. |

## Relaciones y ciclo de vida

- Un docente puede tener muchas sesiones; cada sesión pertenece a un docente y a un laboratorio.
- Una materia pertenece a un docente.
- Una sesión inicia en estado `abierta` con cupos; al inscribirse un estudiante consume cupo; cuando se agotan los cupos la sesión pasa a `llena`; la cancelación pasa a `cancelada` y libera cupos. Al consultar las sesiones, las que superaron su hora de fin pasan a `finalizada`.

## Reglas de validación

- Cupos por defecto igual a la capacidad del laboratorio; el docente puede reducir cupos pero no superarlos.
- `fin` debe ser posterior a `inicio`; la fecha no puede ser anterior a la actual.
- Actividad obligatoria dentro de la sesión.
- No se permiten dos sesiones activas del mismo laboratorio con intervalos solapados.
