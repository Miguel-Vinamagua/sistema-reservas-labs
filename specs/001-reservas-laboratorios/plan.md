# Implementation Plan: Sistema de reservas de laboratorios

**Branch**: `001-reservas-laboratorios` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-reservas-laboratorios/spec.md`

## Summary

Build a university laboratory booking web application with an Angular standalone frontend and a Node.js 20/Express REST backend. Persist users, laboratories, and reservations in MongoDB through Mongoose models, with no database migrations. Enforce ownership, roles, valid time ranges, active laboratory status, and overlap rules on the server. To prevent two simultaneous requests from booking overlapping ranges, serialize booking attempts per laboratory using a transaction and a write to that laboratory document before checking for conflicts and inserting the reservation.

## Technical Context

**Language/Version**: JavaScript on Node.js 20; TypeScript for Angular (version selected by the project scaffold)

**Primary Dependencies**: Express, Mongoose, Angular with standalone components, Jest, Supertest

**Storage**: MongoDB; Mongoose models define the `usuarios`, `laboratorios`, and `reservas` collections. No migration tooling.

**Testing**: Backend unit/integration tests with Jest and Supertest against a dedicated `reservas_test` database; frontend tests for user-visible behavior. GitHub Actions provisions MongoDB as a replica set so backend tests can exercise transactions.

**Target Platform**: Browser-based university application and Node.js 20 server; GitHub Actions CI

**Project Type**: Web application (`backend/` + `frontend/`)

**Performance Goals**: Not specified by the feature. The laboratory catalog, own-reservations view, and booking response should remain usable for ordinary university workloads; establish measured latency targets only if operational requirements are supplied.

**Constraints**:
- Read the database connection string only from `MONGODB_URI`; do not commit secrets.
- Keep Express application construction in `backend/src/app.js` and process startup/database connection in `backend/src/server.js`, allowing Supertest to import the app without starting a listener.
- Trust identity and role supplied by the university's existing authentication integration; this feature does not implement login or public account registration.
- Enforce reservation overlap with active reservations for the same laboratory where existing `inicio < nuevoFin` and existing `fin > nuevoInicio`.
- Use a compound reservation index on `laboratorio`, `inicio`, and `fin`; this index supports the conflict lookup but does not itself prevent concurrent overlaps.
- CI and any transaction-backed test database must support MongoDB transactions (replica set); a standalone MongoDB service is insufficient.
- Store reservation instants as BSON dates and accept/return ISO 8601 timestamps with offsets at the API boundary. Interpret user-entered dates and times in the university's local time zone, as stated in the specification.

**Scale/Scope**: Three collections and the reservation/catalog flows in the specification. No payments, email notifications, reports, login/registration, or reservation rescheduling.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / constraint | Gate | Plan |
|---|---|---|
| Specification first | PASS | This plan and design artifacts derive from the active feature specification. |
| Test-driven development | PASS | Define backend Jest/Supertest tests and relevant frontend tests before production implementation tasks; execute the overlap and permissions cases against the test database. |
| Business rules enforced by backend | PASS | Express services enforce ownership, administrator privileges, date/time validity, laboratory status, and overlap constraints; frontend validation is supplemental. |
| GitHub Flow and peer review | PASS | Implementation remains on the feature branch and is integrated through a reviewed pull request. |
| Conventional commits | PASS | Implementation commits use the constitution's allowed conventional prefixes. |
| CI quality gate | PASS | GitHub Actions runs the backend test suite with a transaction-capable MongoDB service and frontend checks before merge. |
| Secret/configuration hygiene | PASS | `MONGODB_URI` is environment-provided; only a non-secret example may be documented. |
| Angular / Express / MongoDB constraints | PASS | The selected stack and server-side data access match the constitution. |
| Spanish documentation | PASS | User-facing project and run documentation will be written in Spanish. |

## Project Structure

### Documentation (this feature)

```text
specs/001-reservas-laboratorios/
├── plan.md
├── research.md
├── data-model.md
├── api-contract.md
├── quickstart.md
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
│       │   ├── laboratorios/
│       │   └── reservas/
│       └── shared/
└── ...

.github/
└── workflows/
```

**Structure Decision**: Use the requested two-project web layout. The backend has a separately importable Express app, Mongoose models, route handlers and small business-rule services. The Angular project uses standalone components grouped around laboratory and reservation journeys. Keep the structure shallow and add further layers only when implementation needs them.

## Phase 0: Research

See [research.md](./research.md). The main design risk is concurrent booking: an overlap query followed by an insert is not sufficient by itself. Serialize booking attempts by updating a guard field on the same active laboratory document inside a MongoDB transaction, then query and insert within that transaction. Retry transaction write conflicts through Mongoose's transaction helper.

## Phase 1: Design & Contracts

- [Data model](./data-model.md): Mongoose collection shapes, references, validation, indexes, and reservation lifecycle.
- [REST API contract](./api-contract.md): authenticated user/admin operations, request/response shape, and error behavior.
- [Quickstart](./quickstart.md): local configuration and end-to-end validation including replica-set test setup.

### Constitution Check (post-design)

| Gate | Result | Design evidence |
|---|---|---|
| TDD and rule coverage | PASS | The quickstart and contracts identify acceptance cases for valid/invalid bookings, conflicts, ownership, roles, cancellation, and deactivation; implementation tasks must add tests first. |
| Backend enforcement | PASS | Mutating routes require authenticated identity/role context; services enforce all booking invariants independently of Angular. |
| Overlap correctness under concurrency | PASS | A per-laboratory guard write and overlap lookup run in one transaction; CI uses a replica set and tests concurrent attempts. |
| Required stack and separation | PASS | Angular standalone frontend, Node.js 20/Express API, Mongoose models, `app.js`/`server.js` separation. |
| CI, secrets, and Spanish documentation | PASS | MongoDB-backed CI, environment-only `MONGODB_URI`, and Spanish quickstart/user guidance. |

No constitution violations or unresolved technical-context clarifications remain.

## Complexity Tracking

No constitution violations. The per-laboratory transaction guard is required to uphold the specified no-overlap invariant under concurrent booking requests; the requested compound index alone is not a uniqueness constraint for arbitrary time intervals.
