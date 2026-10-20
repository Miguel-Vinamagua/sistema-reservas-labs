# Research: Sistema de reservas de laboratorios

## Decision: MongoDB transaction with per-laboratory write guard

**Decision**: For each booking attempt, start a transaction, atomically update a guard field on the laboratory document only if it is still active, check for an active overlapping reservation, and create the reservation in the same transaction. Use Mongoose transaction support so transient write conflicts retry the transaction. Keep the requested reservation compound index `{ laboratorio: 1, inicio: 1, fin: 1 }`.

**Rationale**: A query followed by an insert is vulnerable to a race: two requests may both see no overlap and insert separate reservation documents. The compound index can support the lookup but cannot enforce non-overlap for arbitrary intervals. MongoDB atomicity applies at the document level; forcing concurrent booking attempts for a laboratory to write the same laboratory document serializes those attempts. On retry, a request can observe and reject the reservation committed by the earlier attempt. MongoDB transactions require a replica set or sharded cluster, so local and CI test services must be transaction-capable.

**Alternatives considered**:
- Rely on the overlap query plus insert and the compound index: rejected because concurrent requests can both pass the query.
- Use a transaction without a shared write: rejected because the competing transactions insert different reservation documents and the predicate read does not itself prevent a phantom overlapping insert.
- Embed all intervals in each laboratory: rejected because it changes the requested separate reservation collection and makes per-laboratory documents grow with reservation history.
- Use fixed slots and a unique index: rejected because the feature allows arbitrary start/end times rather than a fixed slot grid.

**Sources**:
- [MongoDB: Atomicity and Transactions](https://www.mongodb.com/docs/manual/core/transactions/#transactions-and-atomicity)
- [MongoDB: Write Operation Atomicity](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/)
- [MongoDB: Unique Indexes](https://www.mongodb.com/docs/manual/core/index-unique/)
- [MongoDB: Transaction Production Considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/#in-progress-transactions-and-write-conflicts)
- [Mongoose: Transactions](https://mongoosejs.com/docs/transactions.html)

## Decision: Local credentials with signed JWTs

**Decision**: The API authenticates users using a normalized unique email and bcrypt password hash in `usuarios`. Successful login returns a short-lived JWT signed with `JWT_SECRET`; authenticated middleware verifies the token and exposes its trusted ID and role. Public account registration remains out of scope.

**Rationale**: Signed tokens provide a verifiable request principal without trusting client-supplied IDs or roles, while bcrypt prevents storage of clear-text passwords. Role assignment remains a trusted provisioning responsibility.

**Alternatives considered**:
- Accept identity from request bodies: rejected because callers could impersonate another user or administrator.
- Add public account registration: rejected; users and roles are provisioned by a trusted process.

## Decision: MongoDB service for tests

**Decision**: Configure the GitHub Actions MongoDB service as a single-node replica set, initialize it before running Jest, and set `MONGODB_URI` to use the `reservas_test` database and replica set.

**Rationale**: Reservation concurrency correctness uses a transaction. A standalone MongoDB service cannot execute transactions, even though it is sufficient for basic CRUD tests.

**Alternatives considered**:
- Run a standalone MongoDB container: rejected because transaction-based reservation tests would fail.
- Use a production/shared database for tests: rejected; tests must use a separate isolated `reservas_test` database.

## Decision: API timestamps

**Decision**: Persist reservation start and end as BSON date instants; accept and return ISO 8601 date-time values with an explicit offset. Convert university-local user input at the boundary.

**Rationale**: Instants compare consistently across clients and daylight-saving/time-zone boundaries while the product continues to present the university's local time.

**Alternatives considered**:
- Store date and clock strings independently: rejected because comparisons across dates and time zones become error-prone.
- Accept timestamps without a zone: rejected because the instant would be ambiguous.
