# Sistema de reservas de laboratorios

Aplicación web para consultar laboratorios universitarios, crear reservas, consultar las reservas propias y cancelarlas. Los usuarios administradores pueden crear, editar y desactivar laboratorios. La autenticación usa contraseñas con bcrypt y tokens JWT; las reglas de reservas se validan en el backend.

## Tecnologías

- **Backend:** Node.js `>=20`, Express, Mongoose, MongoDB, bcryptjs y jsonwebtoken.
- **Frontend:** Angular 20 standalone, TypeScript, RxJS y formularios reactivos.
- **Pruebas:** Jest y Supertest para el backend; Jasmine, Karma y Chrome para el frontend.
- **Automatización:** GitHub Actions.
- **Especificación:** documentos de GitHub Spec Kit en `specs/001-reservas-laboratorios/`.

## Estructura

```text
backend/
├── src/
│   ├── config/          Conexión a MongoDB
│   ├── middleware/      Autenticación y autorización
│   ├── models/          Usuario, laboratorio y reserva
│   ├── routes/          Endpoints REST
│   └── services/        Reglas de catálogo y reservas
├── scripts/             Seed de usuarios
├── tests/               Pruebas unitarias e integración
├── .env.example         Variables de configuración de ejemplo
└── package.json         Scripts y dependencias del backend

frontend/
├── src/app/core/        API, autenticación, guardas y errores
├── src/app/features/    Laboratorios, reservas y autenticación
├── src/environments/    Configuración de la URL base de la API
└── package.json         Scripts y dependencias de Angular

specs/001-reservas-laboratorios/
├── spec.md              Requisitos y escenarios de aceptación
├── plan.md              Plan técnico
├── api-contract.md      Contrato REST
├── data-model.md        Modelo de datos
├── research.md          Decisiones técnicas
├── quickstart.md        Guía de validación
└── tasks.md             Tareas de implementación

.github/workflows/ci.yml Flujo de integración continua
```

## Requisitos previos

- Node.js 20 o posterior. El pipeline usa Node.js 22.
- npm.
- MongoDB con soporte para replica set para ejecutar las pruebas de integración y las reservas transaccionales.
- Chrome instalado para ejecutar las pruebas Angular localmente con la configuración predeterminada de Karma.

## Configuración del backend

El backend carga las variables desde `backend/.env`. El repositorio incluye `backend/.env.example` como referencia; no contiene credenciales utilizables.

Variables requeridas:

- `MONGODB_URI`: URI de conexión a MongoDB. Para pruebas debe seleccionar la base `reservas_test` y usar un replica set.
- `PORT`: puerto HTTP del backend. Si no se define, el servidor usa `3000`.
- `JWT_SECRET`: secreto usado para firmar y verificar los JWT.
- `SEED_USERS`: requerido únicamente por el script de seed; debe ser un arreglo JSON de usuarios con `correo`, `password` y `rol`.

Configura esos nombres en `backend/.env` con valores propios y fuera del control de versiones. No publiques contraseñas, URI ni secretos.

El frontend no usa un archivo `.env`; su URL base está en `frontend/src/environments/environment.ts`, en la propiedad `apiBaseUrl`.

## Instalación

Desde la raíz del repositorio:

```powershell
Push-Location backend
npm install
Pop-Location

Push-Location frontend
npm install
Pop-Location
```

## Ejecución

### Backend

Con MongoDB disponible y `backend/.env` configurado:

```powershell
Push-Location backend
npm start
Pop-Location
```

El servidor queda disponible en `http://localhost:3000` cuando `PORT` no está definido.

Para aprovisionar usuarios, configura `SEED_USERS` y ejecuta:

```powershell
Push-Location backend
npm run seed
Pop-Location
```

El seed normaliza los correos, guarda las contraseñas como hashes bcrypt y no reemplaza cuentas existentes.

### Frontend

Con el backend ejecutándose en la URL configurada en `environment.ts`:

```powershell
Push-Location frontend
npm start
Pop-Location
```

La aplicación Angular se sirve mediante el servidor de desarrollo de Angular.

## Pruebas y compilación

Backend, desde `backend/`:

```powershell
npm test
```

Las pruebas de integración necesitan MongoDB en la base `reservas_test` y un replica set. El script ejecuta Jest con `--runInBand`.

Frontend, desde `frontend/`:

```powershell
npm test -- --watch=false
npm run build
```

El comando de pruebas frontend usa Karma y abre Chrome con la configuración local. En entornos sin navegador gráfico se puede proporcionar una configuración de navegador compatible con Karma.

## Pipeline de CI

El workflow `.github/workflows/ci.yml` se ejecuta en `push` y `pull_request` hacia `main`, con permisos de solo lectura.

El job `backend`:

1. Inicia MongoDB 7 en Docker como replica set `rs0`.
2. Espera a que MongoDB esté disponible y establece el nodo primario.
3. Usa Node.js 22, ejecuta `npm ci` dentro de `backend/` y después `npm test`.
4. Define variables de prueba en el entorno del job: `MONGODB_URI`, `JWT_SECRET` y `NODE_ENV`.

El job `frontend` usa Node.js 22, ejecuta `npm ci` dentro de `frontend/`, lanza `npm test -- --watch=false --browsers=ChromeHeadless` y finalmente `npm run build`.

## Especificación

La funcionalidad y los criterios de aceptación se mantienen en `specs/001-reservas-laboratorios/`. El contrato de endpoints está en `api-contract.md`; la guía de escenarios y configuración está en `quickstart.md`.

<<<<<<< HEAD
## Descripción
Sistema para la gestión y reserva de laboratorios académicos.

## Datos de prueba

Desde `backend`, configura `MONGODB_URI` en `.env` y registra al menos un usuario
con `SEED_USERS` ejecutando `npm run seed`. Después ejecuta `npm run seed:labs`
para crear laboratorios de prueba y reservas asociadas a ese usuario. El seed de
laboratorios puede ejecutarse más de una vez sin duplicar laboratorios por nombre
ni reservas de prueba.
=======
>>>>>>> main
