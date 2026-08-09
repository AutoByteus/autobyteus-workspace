# Windows Prisma URL Regression

- Status: Engineering complete; awaiting user verification
- Scope: Small
- Base: `origin/personal` at `ed3aa8723`

## Problem

The Windows desktop release `v1.4.42` opens its Electron shell but its embedded server exits during Prisma migrations. The operational database URL is rewritten from Prisma's Windows form (`file:C:/...`) to a generic file URL (`file:///C:/...`), and Prisma reports Windows OS error 161.

## Requirements

- REQ-001: Preserve an absolute Windows SQLite path as a Prisma-compatible URL in the form `file:C:/...`.
- REQ-002: Preserve POSIX SQLite path behavior in the form `file:/...`.
- REQ-003: Continue accepting canonical absolute file URLs at importer boundaries and round-trip them to the same database path.
- REQ-004: Keep malformed, relative, query-bearing, fragment-bearing, and null-containing importer targets rejected.
- REQ-005: Add regression tests at the database-location and application configuration boundaries.

## Acceptance Criteria

- AC-001: A Windows path such as `C:\Users\tester\.autobyteus\server-data\db\production.db` produces `file:C:/Users/tester/.autobyteus/server-data/db/production.db`.
- AC-002: `ApplicationDatabaseLocation.fromAbsoluteFileUrl()` accepts a canonical Windows `file:///C:/...` input and returns the expected native path plus Prisma-compatible URL.
- AC-003: Existing focused server and Electron SQLite URL tests pass.
- AC-004: A real Prisma CLI operation can open a disposable SQLite database through the generated Windows URL.

## Coverage

| Requirement | Acceptance Criteria | Planned Evidence |
| --- | --- | --- |
| REQ-001 | AC-001, AC-004 | Database-location unit test and disposable Prisma CLI probe |
| REQ-002 | AC-003 | Database-location and app-config unit tests |
| REQ-003 | AC-002, AC-003 | Absolute URL round-trip unit tests |
| REQ-004 | AC-003 | Existing importer validation tests |
| REQ-005 | AC-001, AC-002, AC-003 | Focused Vitest suites |
