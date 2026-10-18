# Contrato REST: Sistema de reservas de laboratorios

Base path: `/api`. Los endpoints requieren un principal autenticado por la integración institucional. La API obtiene el ID y el rol del contexto de autenticación validado por el servidor; nunca los toma como autoridad desde el cuerpo de la solicitud.

Los ejemplos de campos `inicio` y `fin` usan cadenas ISO 8601 con offset. Las respuestas no incluyen secretos ni datos personales innecesarios.

## Laboratorios

### `GET /api/laboratorios`

Lista los laboratorios activos para estudiantes y docentes. El administrador recibe además los desactivados para poder mantener el catálogo; las respuestas de administrador incluyen `activo`.

**200 (ejemplo de respuesta para administrador)**

```json
{
  "data": [
    {
      "id": "66a000000000000000000001",
      "nombre": "Laboratorio de Física",
      "capacidad": 24,
      "ubicacion": "Bloque A, piso 2",
      "activo": true
    }
  ]
}
```

### `POST /api/laboratorios`

Solo administrador. Crea un laboratorio.

**Request**

```json
{
  "nombre": "Laboratorio de Física",
  "capacidad": 24,
  "ubicacion": "Bloque A, piso 2"
}
```

**201** devuelve el laboratorio creado con `id`, `nombre`, `capacidad`, `ubicacion` y `activo`.

### `PATCH /api/laboratorios/{id}`

Solo administrador. Actualiza uno o más de `nombre`, `capacidad` y `ubicacion`.

**200** devuelve el laboratorio actualizado. Se rechazan cuerpos vacíos, campos no permitidos, capacidades no enteras o no positivas, y ubicaciones vacías.

### `PATCH /api/laboratorios/{id}/desactivar`

Solo administrador. Desactiva el laboratorio sin eliminarlo ni cancelar sus reservas existentes. La operación no ofrece reactivación.

**200** devuelve el laboratorio con `activo: false`.

## Reservas

### `GET /api/reservas`

Lista solamente las reservas del principal autenticado; no acepta un `usuarioId` para seleccionar otro usuario. Cada elemento incluye el identificador y datos de presentación del laboratorio, `inicio`, `fin` y `estado`.

**200**

```json
{
  "data": [
    {
      "id": "66a000000000000000000010",
      "laboratorio": {
        "id": "66a000000000000000000001",
        "nombre": "Laboratorio de Física",
        "ubicacion": "Bloque A, piso 2"
      },
      "inicio": "2026-10-20T14:00:00-05:00",
      "fin": "2026-10-20T16:00:00-05:00",
      "estado": "activa"
    }
  ]
}
```

### `POST /api/reservas`

Estudiante o docente autenticado. El servidor asocia la reserva al principal autenticado.

**Request**

```json
{
  "laboratorioId": "66a000000000000000000001",
  "inicio": "2026-10-20T14:00:00-05:00",
  "fin": "2026-10-20T16:00:00-05:00"
}
```

El servidor valida las fechas y horas, confirma que el laboratorio está activo, incrementa el guard del laboratorio y consulta el solapamiento dentro de una transacción antes de insertar.

**201** devuelve la reserva creada con estado `activa`.

### `PATCH /api/reservas/{id}/cancelar`

Estudiante o docente autenticado. Cancela una reserva activa que pertenece al principal autenticado. No recibe campos modificables en el cuerpo.

**200** devuelve la reserva con estado `cancelada`.

## Errores

Todos los errores usan una respuesta consistente:

```json
{
  "error": {
    "code": "RESERVATION_CONFLICT",
    "message": "El laboratorio ya tiene una reserva en ese horario."
  }
}
```

| HTTP | Uso |
|---|---|
| `400` | Datos inválidos, fechas mal formadas, rango no válido o identificador mal formado. |
| `401` | No hay identidad autenticada válida. |
| `403` | El rol no puede ejecutar la operación solicitada. |
| `404` | Laboratorio o reserva no encontrados, o recurso ajeno no revelado. |
| `409` | Solapamiento, laboratorio inactivo o reserva no cancelable en su estado actual. |
| `500` | Error inesperado; la respuesta no expone trazas ni detalles internos. |

La lista de reservas ajenas se protege en la consulta; intentar cancelar una reserva ajena no la modifica y responde como recurso no disponible para ese principal.
