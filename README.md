# Sistema de Reservas de Laboratorios

Proyecto para la asignatura de Programación Móvil.

## Integrantes
- Miguel Viñamagua
- Andrea Bowen

## Descripción
Sistema para la gestión y reserva de laboratorios académicos.

## Datos de prueba

Desde `backend`, configura `MONGODB_URI` en `.env` y registra al menos un usuario
con `SEED_USERS` ejecutando `npm run seed`. Después ejecuta `npm run seed:labs`
para crear laboratorios de prueba y reservas asociadas a ese usuario. El seed de
laboratorios puede ejecutarse más de una vez sin duplicar laboratorios por nombre
ni reservas de prueba.