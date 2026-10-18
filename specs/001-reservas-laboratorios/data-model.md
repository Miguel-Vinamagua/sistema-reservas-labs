# Modelo de datos: Sistema de reservas de laboratorios

Los modelos Mongoose definen las colecciones; no se usan migraciones. `ObjectId` identifica documentos y las fechas de reserva se almacenan como instantes BSON Date.

## Usuario (`usuarios`)

Representa a un principal conocido por la integración de identidad institucional. La integración aprovisiona o resuelve el usuario; esta funcionalidad no crea credenciales.

| Campo | Tipo | Reglas |
|---|---|---|
| `_id` | ObjectId | Identificador que se correlaciona con la identidad institucional. |
| `rol` | string | Requerido; uno de `estudiante`, `docente`, `administrador`. |

No almacenar contraseñas ni aceptar el rol desde el cuerpo de una solicitud. La identidad y el rol usados en operaciones provienen de contexto de autenticación confiable del servidor.

## Laboratorio (`laboratorios`)

| Campo | Tipo | Reglas |
|---|---|---|
| `_id` | ObjectId | Identificador generado por MongoDB. |
| `nombre` | string | Requerido; nombre visible que distingue los espacios en la lista. |
| `capacidad` | number | Entero positivo. |
| `ubicacion` | string | Requerida y no vacía. |
| `activo` | boolean | Requerido; valor inicial `true`. |
| `reservationRevision` | number | Campo técnico para serializar los intentos de reserva concurrentes; valor inicial `0`, incremento atómico dentro de cada transacción de reserva. No se expone en la API. |
| `createdAt`, `updatedAt` | Date | Marcas de tiempo gestionadas por Mongoose. |

Desactivar cambia `activo` a `false`; no elimina el laboratorio ni sus reservas. Al iniciar una reserva, la actualización del guard exige que `activo` siga siendo `true`. El campo `reservationRevision` es el punto de escritura compartido que hace que las transacciones concurrentes de reserva y desactivación entren en conflicto y se reintenten.

## Reserva (`reservas`)

| Campo | Tipo | Reglas |
|---|---|---|
| `_id` | ObjectId | Identificador generado por MongoDB. |
| `laboratorio` | ObjectId | Requerido; referencia a `Laboratorio`. |
| `usuario` | ObjectId | Requerido; referencia a `Usuario` que creó la reserva. |
| `inicio` | Date | Requerido; debe ser anterior a `fin`. |
| `fin` | Date | Requerido; debe ser posterior a `inicio`. |
| `estado` | string | Requerido; uno de `activa`, `cancelada`; valor inicial `activa`. |
| `createdAt`, `updatedAt` | Date | Marcas de tiempo gestionadas por Mongoose. |

**Índice requerido**: `{ laboratorio: 1, inicio: 1, fin: 1 }`.

**Búsqueda de conflicto**: mismo `laboratorio`, `estado: "activa"`, `inicio < nuevoFin`, `fin > nuevoInicio`. Las consultas se ejecutan dentro de la transacción después de actualizar el guard del laboratorio. Intervalos contiguos (fin existente igual a inicio nuevo, o fin nuevo igual a inicio existente) no se solapan.

## Relaciones y ciclo de vida

- Un usuario puede tener muchas reservas; cada reserva pertenece a un usuario.
- Un laboratorio puede tener muchas reservas; cada reserva referencia un laboratorio.
- Reservar crea una reserva `activa`; cancelar una propia cambia `activa` a `cancelada`.
- Una reserva cancelada se conserva y se excluye de la búsqueda de conflictos.
- No hay operación de reactivación o reprogramación en el alcance.
- Los laboratorios desactivados no admiten nuevas reservas; las existentes se conservan.

## Reglas de validación

- Rechazar fecha anterior a la fecha local actual de la universidad.
- Rechazar `fin <= inicio`.
- Rechazar reserva para laboratorio inexistente o inactivo.
- Rechazar solapamiento con una reserva activa del mismo laboratorio.
- Rechazar la cancelación si la reserva no existe, no está activa o no pertenece al principal autenticado.
- Rechazar la creación, edición o desactivación de laboratorios salvo que el rol autenticado sea `administrador`.
