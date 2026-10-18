# Guía de validación: Sistema de reservas de laboratorios

## Requisitos previos

- Node.js 20.
- MongoDB ejecutándose como replica set para que estén disponibles las transacciones.
- Una identidad institucional de prueba con usuario estudiante/docente y otra con rol administrador, provistas por la integración de autenticación.
- Configuración de dependencias del backend y frontend implementada según [plan.md](./plan.md).

## Configuración

1. Configura `MONGODB_URI` fuera del control de versiones. En pruebas debe apuntar a la base separada `reservas_test` y a un replica set.
2. Configura la integración de autenticación para que el backend pueda validar al principal y rol de cada petición.
3. Asegura que la base de prueba no contenga datos compartidos o de producción.

Ejemplo de URI de prueba (ajusta host y replica set al entorno):

```text
mongodb://127.0.0.1:27017/reservas_test?replicaSet=rs0
```

## Validación automatizada

1. Ejecuta las pruebas backend Jest con Supertest usando `MONGODB_URI` de `reservas_test`.
2. Ejecuta las pruebas del frontend Angular.
3. Ejecuta el workflow de GitHub Actions; debe iniciar MongoDB como replica set, inicializarlo y ejecutar las pruebas antes de finalizar correctamente.

## Escenarios de aceptación

- Consultar laboratorios activos y verificar capacidad y ubicación.
- Crear una reserva futura válida; confirmar que queda asociada al principal autenticado.
- Rechazar fin anterior o igual al inicio, fecha pasada, laboratorio inactivo y reserva con solapamiento.
- Aceptar reservas contiguas (una termina a la hora exacta en que empieza la siguiente).
- Enviar solicitudes simultáneas y superpuestas al mismo laboratorio; debe confirmarse como máximo una.
- Consultar reservas con dos usuarios y comprobar que cada uno solo ve las propias.
- Cancelar una reserva propia y comprobar que deja de bloquear el horario; rechazar cancelación por usuario distinto.
- Crear, editar y desactivar laboratorios con administrador; rechazar las mismas operaciones a estudiantes/docentes y rechazar nuevas reservas al laboratorio desactivado.

Consulta [api-contract.md](./api-contract.md) para formas de petición/respuesta y [data-model.md](./data-model.md) para las reglas de persistencia.
