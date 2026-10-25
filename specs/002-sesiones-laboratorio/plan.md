# Implementation Plan: Sesiones de laboratorio

**Branch**: `002-sesiones-laboratorio` | **Date**: 2026-10-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-sesiones-laboratorio/spec.md`

## Summary

Plan para incorporar al sistema de reservas de laboratorios el rol docente con gestión de sesiones de laboratorio (materia, actividad, fecha y horario, cupos) y la inscripción de estudiantes con control de cupos, manteniendo las reglas de negocio y la arquitectura existente del backend y el frontend.

## Technical Context

**Language/Version**: JavaScript on Node.js 20; TypeScript for Angular (version selected by the project scaffold)

**Primary Dependencies**: Express, Mongoose, Angular with standalone components, Jest, Supertest

**Storage**: MongoDB; Mongoose models define the `sesiones` and `materias` collections; no migration tooling.

**Testing**: Backend unit/integration tests with Jest and Supertest against the dedicated `reservas_test` database; frontend tests for user-visible behavior with Angular/Karma/Jasmine.

**Target Platform**: Browser-based university application and Node.js 20 server; GitHub Actions CI

**Performance Goals**: Not specified by the feature.

**Constraints**:

- En esta etapa no se modifican los endpoints actuales de reservas.
- Las reglas de negocio DEBEN aplicarse en el backend; el frontend PUEDE mejorar la experiencia pero NO DEBE reemplazar la validación del servidor.
- El acceso a datos y las reglas de negocio DEBEN implementarse en el servidor; el frontend DEBE comunicarse con el backend mediante su API y no conectarse directamente a MongoDB.
- Los secretos y cadenas de conexión DEBEN proveerse mediante variables de entorno fuera del control de versiones.

**Scale/Scope**: Collections for sessions and subjects plus the authentication, session and enrollment flows in the specification. No public account registration, payments, email notifications, reports, or reservation rescheduling in this stage.

## Constitution Check

| Principle / constraint | Gate | Plan |
|---|---|---|
| Specification first | PASS | This plan and design artifacts derive from the active feature specification. |
| Test-driven development | PASS | Define backend Jest/Supertest tests and relevant frontend tests before production implementation tasks; execute session, quota and concurrency cases against the test database. |
| Backend enforcement | PASS | Express services enforce session rules, quotas and overlaps; frontend validation is supplemental. |
| GitHub Flow and peer review | PASS | Implementation remains on the feature branch and is integrated through a reviewed pull request. |
| Conventional commits | PASS | Implementation commits use the constitution's allowed conventional prefixes. |
| CI quality gate | PASS | GitHub Actions runs the backend test suite with a transaction-capable MongoDB service and frontend checks before merge. |
| Secret/configuration hygiene | PASS | `MONGODB_URI` is environment-provided; only a non-secret example may be documented. |
| Angular / Express / MongoDB constraints | PASS | The selected stack and server-side data access match the constitution. |
| Spanish documentation | PASS | Documentation will be written in Spanish. |

## Project Structure

### Documentation (this feature)

```text
specs/002-sesiones-laboratorio/
├── plan.md
├── data-model.md
├── api-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── services/
└── tests/
    ├── integration/
    └── unit/

frontend/
├── src/
│   └── app/
│       ├── core/
│       ├── features/
│       └── shared/
```

**Structure Decision**: Reuse the existing two-project layout. Keep the backend layered as models, routes, services and controllers; keep the Angular frontend standalone components grouped by feature. Add session and materia handling within the existing modules before introducing new layers.

## Phase 0: Research

See [research.md](../001-reservas-laboratorios/research.md) for prior decisions about reservation concurrency and transactions. New research may be required for quota concurrency behavior in this feature.

## Phase 1: Design & Contracts

- [Data model](./data-model.md): Mongoose collection shapes, references, validation and session lifecycle.
- [REST API contract](./api-contract.md): authenticated session creation, listing, cancellation and student enrollment contracts.

### Constitution Check (post-design)

| Principle / constraint | Gate | Design evidence |
|---|---|---|
| Specification first | PASS | This plan and design artifacts derive from the active feature specification. |
| TDD and rule coverage | PASS | The design identifies acceptance cases for session creation, quotas, overlaps, enrollment and concurrency; implementation tasks must add tests first. |
| Backend enforcement | PASS | Express services enforce session rules, quotas and overlaps; frontend validation is supplemental. |
| Overlap correctness under concurrency | PASS | Existing reservation concurrency mechanism is reused for quota control; CI uses a replica set. |
| Required stack and separation | PASS | Angular standalone frontend, Node.js 20/Express API, Mongoose models, `app.js`/`server.js` separation. |
| CI, secrets, and Spanish documentation | PASS | MongoDB-backed CI, environment-only `MONGODB_URI`, Spanish documentation. |

No constitution violations or unresolved technical-context clarifications remain.

## Complexity Tracking

No constitution violations. The quota concurrency requirement is handled with the existing reservation concurrency mechanism; no new architectural layer is required in this stage.
