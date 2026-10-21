# Tareas: Sistema de reservas de laboratorios

**Entrada**: Documentos de diseño en `specs/001-reservas-laboratorios/`

**Requisitos previos**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `api-contract.md`, `quickstart.md`

**Pruebas**: Obligatorias según la constitución del proyecto. Escribir las pruebas backend con Jest/Supertest y las pruebas pertinentes de Angular antes del código de producción, y verificar que fallen por el motivo esperado.

**Organización**: Las tareas se agrupan por historia de usuario para conservar incrementos que puedan verificarse de forma independiente.

## Fase 1: Preparación (Infraestructura compartida)

**Propósito**: Inicializar los dos proyectos de aplicación y la estructura de CI.

- [X] T001 Crear el paquete del backend con Node.js 20 y las carpetas de código fuente y pruebas en `backend/package.json` y `backend/src/`
- [X] T002 [P] Preparar la aplicación Angular con componentes standalone en `frontend/` y ubicar su código fuente en `frontend/src/app/`
- [ ] T003 [P] Añadir ejemplos no secretos de variables de entorno para `MONGODB_URI` y el origen de la API en `backend/.env.example` y `frontend/.env.example`
- [ ] T004 [P] Crear la estructura inicial del flujo de GitHub Actions para validar el backend y el frontend en `.github/workflows/ci.yml`

## Fase 2: Fundamentos (Requisitos previos bloqueantes)

**Propósito**: Preparar la base de datos compartida, el ciclo de vida de la aplicación, el principal autenticado y la infraestructura de pruebas de CI requeridos por todas las historias.

- [X] T005 Configurar la conexión de Mongoose usando únicamente `MONGODB_URI` y hacer que el inicio falle con un error claro si falta la variable en `backend/src/config/database.js`
- [X] T006 Crear la aplicación Express importable sin abrir un puerto de escucha en `backend/src/app.js`
- [X] T007 Crear el arranque del servidor para que se conecte a MongoDB antes de empezar a escuchar y gestione los errores de inicio en `backend/src/server.js`
- [ ] T008 [P] Implementar la validación de solicitudes y respuestas JSON de error consistentes para `400`, `401`, `403`, `404`, `409` y `500` en `backend/src/middleware/error-handler.js`
- [X] T009 [P] Implementar middleware de autorización que lea el principal autenticado y su rol del contexto de solicitud confiable, nunca de campos del cuerpo, en `backend/src/middleware/authorization.js`
- [X] T010 [P] Crear el cliente compartido de API de Angular y el servicio de presentación de errores en `frontend/src/app/core/api/` y `frontend/src/app/core/errors/`
- [X] T011 Configurar Jest, Supertest, el aislamiento de la base de datos de pruebas y la limpieza posterior para usar la base `reservas_test` en `backend/jest.config.js` y `backend/tests/setup.js`
- [ ] T012 Configurar GitHub Actions para iniciar MongoDB como replica set de un solo nodo, inicializarlo, establecer `MONGODB_URI` para `reservas_test` y ejecutar las comprobaciones del backend y del frontend en `.github/workflows/ci.yml`

**Punto de control**: Ambas aplicaciones arrancan de forma independiente; Supertest puede importar la aplicación Express sin abrir un puerto y CI dispone de MongoDB compatible con transacciones.

## Fase 3: Historia de usuario 1 - Consultar laboratorios y reservar un espacio (Prioridad: P1) 🎯 MVP

**Objetivo**: Estudiantes y docentes pueden consultar la capacidad y ubicación de laboratorios activos y crear reservas válidas sin conflictos.

**Prueba independiente**: Con un laboratorio activo y un usuario de prueba autenticado, consultar su capacidad y ubicación, crear una reserva válida y comprobar que se rechacen fechas no válidas, rangos de horas inválidos, intervalos superpuestos y solicitudes conflictivas simultáneas.

### Pruebas de la historia de usuario 1

> Escribir primero las pruebas y verificar que fallen antes de implementar el modelo, la ruta, el servicio o la interfaz correspondiente.

- [ ] T013 [P] [US1] Escribir pruebas de contrato con Supertest para consultar laboratorios activos y verificar los campos de la respuesta en `backend/tests/integration/laboratories.test.js`
- [ ] T014 [P] [US1] Escribir pruebas de reservas con Supertest para el éxito, fechas pasadas, `fin <= inicio`, laboratorio inactivo o inexistente, intervalos superpuestos y contiguos en `backend/tests/integration/reservations.test.js`
- [ ] T015 [P] [US1] Escribir una prueba de integración que demuestre que solicitudes simultáneas de reservas superpuestas crean como máximo una reserva activa en `backend/tests/integration/reservation-concurrency.test.js`
- [ ] T016 [P] [US1] Escribir pruebas de Angular para el renderizado del catálogo de laboratorios, la validación y el envío del formulario de reserva y los errores de API en `frontend/src/app/features/laboratorios/` y `frontend/src/app/features/reservas/`

### Implementación de la historia de usuario 1

- [X] T017 [P] [US1] Crear el modelo Usuario en la colección `usuarios` con el enum de rol obligatorio `estudiante`, `docente`, `administrador` en `backend/src/models/usuario.model.js`
- [X] T018 [P] [US1] Crear el modelo Laboratorio con `nombre` y `ubicacion` obligatorios y no vacíos, `capacidad` entero positivo, `activo` con valor predeterminado `true` y `reservationRevision` con valor predeterminado `0` en `backend/src/models/laboratorio.model.js`
- [X] T019 [P] [US1] Crear el modelo Reserva con referencias ObjectId obligatorias `laboratorio` y `usuario`, campos Date obligatorios `inicio` y `fin` donde `fin > inicio`, y enum `estado` `activa` o `cancelada` con valor predeterminado `activa` en `backend/src/models/reserva.model.js`
- [X] T020 [US1] Añadir el índice compuesto `{ laboratorio: 1, inicio: 1, fin: 1 }` al modelo Reserva en `backend/src/models/reserva.model.js`
- [X] T021 [US1] Implementar la consulta de laboratorios activos y las comprobaciones de existencia de laboratorios en `backend/src/services/laboratorio.service.js`
- [X] T022 [US1] Implementar la creación de reservas con validación de fecha local de la universidad, búsqueda estricta de intervalos superpuestos, escritura de control del laboratorio activo e inserción de la reserva dentro de una transacción Mongoose reintentable en `backend/src/services/reserva.service.js`
- [X] T023 [US1] Implementar `GET /api/laboratorios` y `POST /api/reservas` con acceso autenticado para estudiantes y docentes en `backend/src/routes/laboratorios.routes.js` y `backend/src/routes/reservas.routes.js`
- [X] T024 [US1] Montar las rutas `/api/laboratorios` y `/api/reservas` en la aplicación Express en `backend/src/app.js`
- [X] T025 [US1] Crear el catálogo de laboratorios standalone y mostrar el nombre, la capacidad y la ubicación de cada laboratorio activo en `frontend/src/app/features/laboratorios/`
- [X] T026 [US1] Crear el formulario de reserva standalone que envíe `laboratorioId`, `inicio` y `fin` a `POST /api/reservas` y muestre errores de validación o conflicto en `frontend/src/app/features/reservas/`

**Punto de control**: La historia de usuario 1 funciona de extremo a extremo, incluido el rechazo seguro ante reservas superpuestas simultáneas mediante transacciones.

## Fase 4: Historia de usuario 2 - Consultar y cancelar reservas propias (Prioridad: P2)

**Objetivo**: Estudiantes y docentes pueden consultar únicamente sus propias reservas y cancelar una reserva activa de su propiedad.

**Prueba independiente**: Preparar reservas para dos usuarios autenticados, verificar que cada uno solo vea las propias, cancelar una reserva propia, comprobar que deje de bloquear el horario y verificar que se rechace el intento de cancelar una reserva ajena.

### Pruebas de la historia de usuario 2

> Escribir primero las pruebas y verificar que fallen antes de implementar.

- [X] T027 [P] [US2] Escribir pruebas con Supertest para filtrar las reservas propias, cancelar con éxito, manejar reservas ya canceladas y rechazar la cancelación de la reserva de otro usuario en `backend/tests/integration/reservations.test.js`
- [X] T028 [P] [US2] Escribir pruebas de Angular para mostrar la lista de reservas propias, el estado vacío, la confirmación de cancelación y el estado cancelado actualizado en `frontend/src/app/features/reservas/`

### Implementación de la historia de usuario 2

- [X] T029 [US2] Implementar la consulta de reservas propias, filtrada exclusivamente por el ObjectId del usuario autenticado, y los datos visibles del laboratorio relacionado en `backend/src/services/reserva.service.js`
- [X] T030 [US2] Implementar la cancelación como una transición de `activa` a `cancelada` condicionada a la propiedad y al estado activo en `backend/src/services/reserva.service.js`
- [X] T031 [US2] Añadir las rutas `GET /api/reservas` y `PATCH /api/reservas/:id/cancelar` usando el principal autenticado en `backend/src/routes/reservas.routes.js`
- [X] T032 [US2] Crear la vista standalone de reservas propias con laboratorio, fecha, hora, estado, estado vacío y acción de cancelación en `frontend/src/app/features/reservas/`

**Punto de control**: La historia de usuario 2 no muestra reservas de otros usuarios y excluye las reservas canceladas de futuras comprobaciones de conflictos.

## Fase 5: Historia de usuario 3 - Administrar laboratorios (Prioridad: P3)

**Objetivo**: Los administradores pueden crear, editar y desactivar laboratorios; quienes no sean administradores no pueden realizar estas operaciones.

**Prueba independiente**: Con identidades de prueba de administrador, estudiante y docente, crear un laboratorio, editar su capacidad y ubicación, desactivarlo sin eliminar sus reservas existentes y verificar que un usuario no administrador no pueda modificar el catálogo.

### Pruebas de la historia de usuario 3

> Escribir primero las pruebas y verificar que fallen antes de implementar.

- [X] T033 [P] [US3] Escribir pruebas con Supertest para crear, editar y desactivar como administrador, validar capacidad y ubicación, conservar reservas existentes y prohibir acciones de usuarios no administradores en `backend/tests/integration/laboratories-admin.test.js`
- [X] T034 [P] [US3] Escribir pruebas de Angular para los controles de administración exclusivos del administrador, los formularios de creación y edición, la desactivación y los errores de validación en `frontend/src/app/features/laboratorios/`

### Implementación de la historia de usuario 3

- [X] T035 [US3] Implementar la creación de laboratorios exclusiva del administrador con validación de nombre y ubicación no vacíos y capacidad entera positiva en `backend/src/services/laboratorio.service.js`
- [X] T036 [US3] Implementar la edición de `nombre`, `capacidad` y `ubicacion` exclusiva del administrador, rechazando cuerpos vacíos y campos desconocidos en `backend/src/services/laboratorio.service.js`
- [X] T037 [US3] Implementar la desactivación irreversible exclusiva del administrador, conservando el laboratorio y sus reservas existentes en `backend/src/services/laboratorio.service.js`
- [X] T038 [US3] Añadir las rutas `POST /api/laboratorios`, `PATCH /api/laboratorios/:id` y `PATCH /api/laboratorios/:id/desactivar`, protegidas por autorización de administrador en `backend/src/routes/laboratorios.routes.js`
- [X] T039 [US3] Crear controles de administración standalone y formularios para crear, editar y desactivar laboratorios en `frontend/src/app/features/laboratorios/`

**Punto de control**: Los administradores mantienen el catálogo; los usuarios que no son administradores no pueden modificarlo y los laboratorios desactivados rechazan nuevas reservas sin perder las existentes.

## Fase 6: Refinamiento y aspectos transversales

**Propósito**: Verificar los controles de calidad integrados y documentar cómo ejecutar la aplicación.

- [ ] T040 [P] Escribir en español las instrucciones de configuración, integración de autenticación y ejecución en `README.md`
- [ ] T041 Verificar que las solicitudes y respuestas del frontend y backend coincidan con el contrato REST en `specs/001-reservas-laboratorios/api-contract.md`
- [ ] T042 Ejecutar los escenarios de extremo a extremo de `specs/001-reservas-laboratorios/quickstart.md` contra el replica set `reservas_test`
- [ ] T043 Ejecutar todas las pruebas backend con Jest/Supertest, las pruebas de Angular y el flujo de GitHub Actions; resolver los fallos sin omitir los controles de calidad

## Autenticación y roles del backend

- [X] T044 Escribir primero pruebas de integración para login, hash bcrypt, firma JWT y autorización por roles en `backend/tests/integration/auth.test.js`
- [X] T045 Añadir correo y hash bcrypt al modelo Usuario e implementar `POST /api/auth/login` firmado mediante `JWT_SECRET` en `backend/src/models/usuario.model.js` y `backend/src/routes/auth.routes.js`
- [X] T046 Implementar middleware de autenticación JWT y autorización por roles y montar la ruta de login en `backend/src/middleware/authorization.js` y `backend/src/app.js`
- [X] T047 Añadir pruebas para aprovisionamiento idempotente de usuarios y un comando seed que valide roles, almacene hashes bcrypt y no sobrescriba cuentas existentes en `backend/scripts/seed.js`

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Preparación (Fase 1)**: Sin dependencias; crea la estructura de ambos proyectos y del flujo de CI.
- **Fundamentos (Fase 2)**: Depende de la preparación; bloquea todas las historias de usuario al establecer la base de datos, el ciclo de vida de Express, el contexto de principal confiable y la infraestructura de pruebas/CI.
- **Historias de usuario (Fases 3-5)**: Dependen de que se complete Fundamentos. Implementarlas en orden de prioridad para entregar valor de forma incremental.
- **Refinamiento (Fase 6)**: Depende de que estén completas todas las historias seleccionadas para la entrega.

### Dependencias entre historias de usuario

- **US1 (P1)**: Puede comenzar después de Fundamentos; no depende de otra historia y es el MVP.
- **US2 (P2)**: Requiere el modelo Reserva y el ciclo de vida de reservas creadas por US1.
- **US3 (P3)**: Requiere el modelo Laboratorio y la consulta del catálogo de US1.

### Dentro de cada historia de usuario

- Escribir primero las pruebas y confirmar que fallen como se espera antes de implementar código de producción (TDD).
- Crear los modelos antes que los servicios; los servicios antes que los controladores de ruta; y las rutas antes de integrar la interfaz.
- El punto de control solo se alcanza cuando el comportamiento backend y frontend de esa historia pueda verificarse de forma independiente.

## Oportunidades de paralelismo

- Las tareas de preparación T002-T004 pueden realizarse de forma independiente una vez acordada la estructura del repositorio.
- Las tareas de Fundamentos T008-T010 pueden realizarse en paralelo después de que existan las estructuras de los proyectos; la conexión de base de datos, la aplicación y el servicio de pruebas de CI pueden implementarse por separado.
- Las pruebas de US1 T013-T016 pueden escribirse en paralelo; los modelos de US1 T017-T019 también pueden desarrollarse en paralelo una vez acordadas las expectativas de las pruebas.
- Las pruebas de US2 T027-T028 pueden realizarse en paralelo; el listado/cancelación backend y la interfaz frontend pueden trabajarse en archivos distintos después de las pruebas y de completar US1.
- Las pruebas de US3 T033-T034 pueden realizarse en paralelo; la administración backend y la interfaz de gestión Angular pueden trabajarse en archivos distintos después de las pruebas y de completar US1.
- US2 y US3 pueden implementarse por colaboradores distintos después de US1, pero ambas dependen de sus modelos compartidos de reservas y laboratorios.

## Ejemplo de paralelismo: historia de usuario 1

```text
Escribir las pruebas T013-T016 en paralelo y luego comprobar que cada una falle por el comportamiento faltante esperado.
Después, implementar los modelos T017-T019 en paralelo; continuar con los servicios solo cuando existan los modelos pertinentes.
```

## Estrategia de implementación

### Primero el MVP (solo historia de usuario 1)

1. Completar las fases de Preparación y Fundamentos.
2. Completar las pruebas de US1 antes de los modelos, servicios, rutas y pantallas Angular.
3. Verificar la consulta del catálogo, una reserva válida, todos los casos de rechazo, los límites contiguos y los conflictos simultáneos.
4. Detenerse y validar el incremento US1 antes de continuar con cancelaciones y administración.

### Entrega incremental

1. Preparación + Fundamentos: establecer una base ejecutable y verificable.
2. US1: entregar consulta de laboratorios y reservas seguras ante concurrencia como MVP.
3. US2: entregar historial privado de reservas y cancelaciones.
4. US3: entregar la gestión administrativa de laboratorios.
5. Refinamiento: validar la guía integrada, la documentación en español y el control de calidad de CI.
