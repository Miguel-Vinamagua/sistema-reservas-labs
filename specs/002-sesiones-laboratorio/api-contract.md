# Contrato REST: Sesiones de laboratorio

## Base path: `/api`. El login emite un JWT firmado; los endpoints protegidos reciben `Authorization: Bearer <token>`. El ID y el rol provienen de las credenciales verificadas y del token firmado; nunca se aceptan como autoridad desde el cuerpo de la solicitud.

## Sesiones de laboratorio

### `POST /api/sesiones-laboratorio`

Solo docente. Crea una sesión de laboratorio.

**Request**

```json
{
  "laboratorioId": "66a000000000000000000001",
  "materia": "Física",
  "actividad": "Práctica de óptica",
  "inicio": "2026-11-02T15:00:00-05:00",
  "fin": "2026-11-02T17:00:00-05:00",
  "cupos": 20
}
```

El servidor asigna cupos por defecto igual a la capacidad del laboratorio; el docente puede reducir cupos pero no superarlos. La sesión se crea con estado `abierta`.

**201** devuelve la sesión creada con id, laboratorio, materia, actividad, inicio, fin, cupos y estado.

**Errores**: `400` con `VALIDATION_ERROR` (datos inválidos, actividad vacía, cupos no válidos); `401` sin autenticación; `403` con `FORBIDDEN` si el rol no es docente; `404` con `LABORATORY_NOT_FOUND`; `409` con `LABORATORY_INACTIVE` o `SESSION_TIME_CONFLICT` para solapamientos.

### `GET /api/sesiones-laboratorio`

Disponible para estudiante y docente. Lista las sesiones disponibles para inscribirse.

**200** devuelve la lista de sesiones con laboratorio, materia, actividad, inicio, fin, cupos e inscripción.

### `GET /api/sesiones-laboratorio/mias`

Solo docente. Lista las sesiones creadas por el docente autenticado.

**200** devuelve la lista de sesiones del docente con su estado.

### `PATCH /api/sesiones-laboratorio/:id/cancelar`

Solo docente. Cancela una sesión activa del docente autenticado.

**200** devuelve la sesión con estado `cancelada`.

## Inscripción de estudiantes (sin modificar los endpoints actuales de reservas)

### `POST /api/reservas`

Estudiante. Registra la reserva del estudiante sobre la sesión seleccionada ("Reservar cupo"); el cupo se consume y la sesión pasa a `llena` cuando se agotan los cupos.

### `PATCH /api/reservas/:id/cancelar`

Estudiante. Cancela la reserva propia; libera el cupo en la sesión.

## Errores

Todos los errores usan la respuesta consistente:

```json
{
  "error": {
    "code": "SESSION_TIME_CONFLICT",
    "message": "El laboratorio ya tiene una sesión programada en ese horario."
  }
}
```

| HTTP | Uso |
|---|---|
| `400` | Datos inválidos, fechas mal formadas, rango no válido o identificador mal formado. |
| `401` | No hay identidad autenticada válida. |
| `403` | El rol no puede ejecutar la operación solicitada. |
| `404` | Laboratorio, sesión o reserva no encontrados. |
| `409` | Solapamiento, laboratorio inactivo, sesión llena o reserva no cancelable. |
| `500` | Error inesperado. |

## Estado de sesión

- `abierta`: la sesión admite inscripciones mientras queden cupos.
- `llena`: no admite más inscripciones.
- `cancelada`: no admite inscripciones y libera cupos.
