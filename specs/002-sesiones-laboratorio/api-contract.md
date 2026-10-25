# Contrato REST: Sesiones, reservas y horarios

Base path: `/api`. Los endpoints descritos requieren autenticación JWT salvo que se indique lo contrario. La identidad y el rol provienen del token verificado, nunca de valores confiados en el cuerpo.

Todos los instantes se transmiten como fechas ISO-8601 y se presentan al usuario en `America/Guayaquil`. En cada consulta, el servidor utiliza la hora actual; no se requieren tareas programadas para expirar sesiones.

## Laboratorios

### `GET /api/laboratorios`

Lista laboratorios del catálogo según las reglas de acceso existentes. Cada elemento puede incluir `ocupado` y `ocupadoHasta`, calculados a partir de sesiones no canceladas ni finalizadas cuyo intervalo contiene la hora actual.

## Sesiones de laboratorio

### `POST /api/sesiones-laboratorio`

Solo docente. Crea una sesión.

**Request**

```json
{
  "laboratorioId": "66a000000000000000000001",
  "materia": "Física",
  "actividad": "Práctica de óptica",
  "inicio": "2026-11-02T15:00:00-05:00",
  "fin": "2026-11-02T17:00:00-05:00",
  "capacidadMax": 20
}
```

Si `capacidadMax` se omite, el servidor usa la capacidad del laboratorio; el docente puede reducirla, pero no superarla. El servidor deriva el docente autenticado y establece `inscritosCount: 0` y `estado: "disponible"`.

**201** devuelve la sesión creada con identificador, laboratorio, docente, materia, actividad, fecha, inicio, fin, `capacidadMax`, `inscritosCount` y `estado`.

**Errores**: `400` por datos inválidos; `401` sin identidad autenticada; `403` por rol no permitido; `404` si el laboratorio no existe; `409` si el laboratorio está inactivo o el horario se solapa con otra sesión activa del mismo laboratorio.

### `GET /api/sesiones-laboratorio`

Estudiantes autenticados consultan las sesiones elegibles para reservar. La respuesta incluye sesiones `disponible` con cupos y cuyo fin todavía no ha llegado; no incluye sesiones llenas, canceladas o terminadas.

Cada resultado contiene laboratorio (nombre y ubicación), docente (identificador y nombre institucional visible), materia, actividad, fecha, inicio, fin, `capacidadMax`, `inscritosCount`, cupos libres calculables como `capacidadMax - inscritosCount` y `estado`.

### `GET /api/sesiones-laboratorio/horarios`

Estudiantes autenticados consultan sesiones en curso o futuras no canceladas. Incluye sesiones disponibles y llenas; excluye las canceladas y todas aquellas con `fin <= ahora`. Orden ascendente por `inicio` y, para desempate, por identificador.

Cada resultado incluye laboratorio, ubicación, docente, materia, actividad, fecha, inicio, fin, `inscritosCount`, `capacidadMax` y estado efectivo. Fechas/horas se muestran en `America/Guayaquil`. El cliente vuelve a consultar periódicamente para retirar las sesiones terminadas.

### `GET /api/sesiones-laboratorio/mias`

Solo docente. Devuelve las sesiones creadas por el docente autenticado, incluyendo su estado actual. Las sesiones cuyo fin ya llegó se exponen como `finalizada`.

### `PATCH /api/sesiones-laboratorio/:id/cancelar`

Solo docente propietario. Cancela una sesión propia que aún admita cancelación. Devuelve la sesión con estado `cancelada`. La consecuencia de la cancelación sobre reservas ya creadas queda sujeta a la pregunta abierta de la especificación.

## Reservas del estudiante

### `POST /api/reservas`

Estudiante. Registra una reserva para la sesión seleccionada.

**Request**

```json
{
  "sesionLaboratorioId": "66a000000000000000000099"
}
```

El servidor obtiene el estudiante del token. La operación solo se acepta si la sesión está `disponible`, no ha terminado y quedan cupos. Se rechaza una reserva activa duplicada de la misma sesión o que se solape con otra reserva activa del estudiante. El incremento de `inscritosCount`, la eventual transición a `llena` y la inserción de la reserva deben ser atómicos ante concurrencia.

**201** devuelve `id`, `sesionLaboratorio`, `usuario` y estado persistido `activa`.

**Errores**: `400` por identificador inválido; `401` sin autenticación; `403` por rol no permitido; `404` si la sesión no existe; `409` por sesión no disponible, llena, cancelada o terminada, reserva duplicada, solapamiento o capacidad agotada.

### `GET /api/reservas`

Estudiante. Devuelve el historial de reservas propias, ordenado por inicio de sesión. Cada elemento incluye la sesión relacionada y los datos necesarios para mostrar laboratorio, ubicación, materia, actividad, fecha y horario. El estado expuesto es `cancelada` si la reserva se canceló; si sigue activa pero su sesión terminó, se expone `finalizada`; en otro caso, `activa`.

### `PATCH /api/reservas/:id/cancelar`

Estudiante propietario. Cancela una reserva activa si la hora actual es anterior a `fin` de la sesión. Libera exactamente un cupo y devuelve estado `cancelada`. Si la sesión estaba `llena`, vuelve a `disponible`. No se permite cancelar una reserva ajena, ya cancelada o cuyo horario terminó.

## Formato de error

```json
{
  "error": {
    "code": "RESERVATION_CONFLICT",
    "message": "La sesión no está disponible para esta reserva."
  }
}
```

| HTTP | Uso |
|---|---|
| `400` | Datos inválidos, fecha mal formada o identificador inválido. |
| `401` | No hay identidad autenticada válida. |
| `403` | El rol no puede ejecutar la operación. |
| `404` | Laboratorio, sesión o reserva no encontrados. |
| `409` | Capacidad agotada, duplicidad, solapamiento, sesión no reservable o reserva no cancelable. |
| `500` | Error inesperado. |

## Estados

- Sesión `disponible`: acepta reservas si quedan cupos y no terminó.
- Sesión `llena`: `inscritosCount` alcanzó `capacidadMax`; no acepta reservas.
- Sesión `cancelada`: no acepta reservas.
- Sesión `finalizada`: su fin llegó; no acepta reservas y se excluye de horarios.
- Reserva `activa`: reserva persistida vigente.
- Reserva `cancelada`: reserva cancelada, conservada en el historial.
- Reserva `finalizada`: representación efectiva en el historial de una reserva activa cuya sesión terminó.

## Compatibilidad y pruebas afectadas

El contrato reemplaza el cuerpo antiguo de reserva con `laboratorioId`, `inicio` y `fin` por `sesionLaboratorioId`. Las pruebas de integración existentes de reservas deben continuar cubriendo sus casos, pero crear sesiones vinculadas y utilizar el nuevo cuerpo. Las pruebas unitarias del seed que modelan reservas con laboratorio y horario directos también deben adaptarse; ninguna prueba se elimina. Los nuevos escenarios cubren duplicidad, solapamiento, fin alcanzado, cancelación con liberación y concurrencia.
