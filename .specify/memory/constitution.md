<!--
Sync Impact Report
- Version change: uninitialized template → 1.0.0 (initial constitution)
- Modified principles: previously undefined principle 1 → I. Specification-First;
  previously undefined principle 2 → II. Test-Driven Development;
  previously undefined principle 3 → III. Backend Business-Rule Enforcement;
  previously undefined principle 4 → IV. GitHub Flow and Peer Review;
  previously undefined principle 5 → V. Conventional Commits.
- Added principles: VI. Continuous Integration Quality Gate;
  VII. Secret and Configuration Hygiene; VIII. Simplicity and Spanish Documentation.
- Added sections: Technology and Security Constraints; Development Workflow.
- Removed sections: None.
- Follow-up TODO: Confirm the original ratification date.
-->
# Sistema de reservas de laboratorios — UTMACH Constitution

## Core Principles

### I. Specification-First
Every feature and behavioral change MUST begin with a written specification that
defines its purpose, requirements, and acceptance criteria before implementation.
This keeps implementation aligned with the needs of laboratory users and reviewers.

### II. Test-Driven Development (NON-NEGOTIABLE)
Tests MUST be written before production code, and development MUST follow the
Red-Green-Refactor cycle. Backend tests MUST use Jest and Supertest; the relevant
frontend behavior MUST also be covered by tests. Tests are the executable expression
of expected behavior and guard against regressions.

### III. Backend Business-Rule Enforcement
Business rules MUST be enforced in the backend and covered by tests. In particular,
the backend MUST reject overlapping reservations for the same laboratory and time
period. Frontend validation MAY improve feedback, but MUST NOT replace server-side
validation because clients cannot be trusted to enforce shared rules.

### IV. GitHub Flow and Peer Review
Work MUST be developed on short-lived branches scoped to a task and integrated
through a Pull Request. A teammate MUST review and approve each Pull Request before
it is merged. This keeps changes focused and provides an independent quality check.

### V. Conventional Commits
Commit messages MUST use the conventional type prefixes `feat`, `fix`, `docs`,
`test`, or `chore`, followed by a concise description. Consistent commit history
makes changes easier to review, understand, and trace.

### VI. Continuous Integration Quality Gate
The GitHub Actions pipeline MUST pass before a Pull Request is merged. A failing
pipeline MUST be resolved rather than bypassed, so automated checks remain a
reliable integration gate.

### VII. Secret and Configuration Hygiene
Secrets and database connection strings MUST NOT be committed to the repository.
Environment-specific values MUST be supplied outside version control; the
repository MAY contain only a `.env.example` with placeholders and no real secrets.
This reduces the risk of credential exposure.

### VIII. Simplicity and Spanish Documentation
Code MUST favor the simplest design that satisfies the specified requirements.
Project documentation and user-facing technical guidance MUST be written in Spanish.
Simple, consistent code and documentation make the system easier for the UTMACH
team to maintain.

## Technology and Security Constraints

The application stack MUST use Angular for the frontend, Node.js with Express for
the backend, and MongoDB with Mongoose for persistence. Data access and business
rules MUST be implemented on the server; the frontend MUST communicate with the
backend through its defined API rather than connecting directly to MongoDB.

## Development Workflow

Each task MUST reference its written specification and acceptance criteria. Changes
MUST be submitted as focused Pull Requests from short-lived task branches, receive
approval from a teammate, and pass the GitHub Actions pipeline before merge.
Contributors MUST include relevant automated tests and use the required conventional
commit prefixes. Reviewers MUST verify specification coverage, backend rule tests,
secret hygiene, and documentation in Spanish when applicable.

## Governance

This constitution governs project development practices and takes precedence over
conflicting informal conventions. Amendments MUST be proposed and reviewed through
a Pull Request that explains the rationale and impact. Project contributors MUST
check applicable principles during implementation and Pull Request review; any
exception MUST be explicitly justified and approved in the Pull Request.

The constitution follows semantic versioning: MAJOR for incompatible changes to
principles or governance, MINOR for new principles or materially expanded
requirements, and PATCH for clarifications and non-semantic wording changes. The
last-amended date MUST be updated whenever an amendment is accepted. Compliance is
reviewed as part of Pull Request review and the GitHub Actions quality gate.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm original adoption date | **Last Amended**: 2026-10-17
