# Requirements

- Status: `Design-ready`
- Ticket: `remove-file-persistence-provider`
- Last Updated: `2026-04-09`
- Scope Classification: `Medium`

## Goal

Remove the obsolete global persistence-profile contract so persistence behavior is owned by each subsystem directly. Token usage must remain database-backed only. Active build/runtime/test/bootstrap surfaces must stop exposing or depending on `PERSISTENCE_PROVIDER` and the file-profile build output.

## Problem Statement

The repo still advertises a global `PERSISTENCE_PROVIDER` switch and a dedicated file-profile build/runtime path. That model is no longer truthful. Agent definitions, team definitions, MCP configs, and other file-backed data are already persisted according to their own subsystem logic rather than a real file-vs-database switch. Token usage is the only active subsystem still honoring the generic selector, and it still contains a file-based persistence option that the user no longer wants. The remaining profile/build machinery adds misleading configuration, obsolete startup branching, and extra test/deployment complexity.

## In-Scope Use Cases

- `UC-001`: Server startup initializes runtime config and migrations without a user-selectable global persistence profile.
- `UC-002`: Token usage persistence and token-usage statistics use the database-backed implementation only.
- `UC-003`: Electron, Docker, and Android bootstrap flows generate truthful server runtime env/config without `PERSISTENCE_PROVIDER` or `dist-file`.

## Requirements

| Requirement ID | Description | Rationale | Covered Use Case(s) |
| --- | --- | --- | --- |
| `R-001` | Active runtime/server startup code must stop reading or deriving behavior from `PERSISTENCE_PROVIDER`. | Persistence is now subsystem-owned, so a global persistence profile is misleading. | `UC-001`, `UC-003` |
| `R-002` | Token usage persistence must support database-backed storage only; file-based token usage persistence must be removed from active code paths. | User confirmed token storage should stay in the database. | `UC-002` |
| `R-003` | SQLite database URL initialization and Prisma startup migration behavior must be driven by database configuration, not by a file persistence profile. | Token usage remains DB-backed and startup must stay truthful. | `UC-001` |
| `R-004` | The dedicated file-profile build/package/runtime path (`build:file`, `build:file:package`, `dist-file`, related Android launch path) must be removed from active project tooling. | The file build exists only to support the obsolete persistence profile. | `UC-003` |
| `R-005` | Active env templates, Electron bootstrap env generation, Docker scripts, and docs/tests must reflect the simplified contract and no longer advertise `PERSISTENCE_PROVIDER`. | User-facing and developer-facing surfaces must match real behavior. | `UC-001`, `UC-003` |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Description | Validation Intent |
| --- | --- | --- | --- |
| `AC-001` | `R-001` | No active runtime path under `autobyteus-server-ts/src` depends on `PERSISTENCE_PROVIDER`. | source scan + targeted tests |
| `AC-002` | `R-002` | Token usage runtime code no longer contains an active file persistence provider/selection path; token usage still persists and reads through the SQL-backed implementation. | token-usage tests |
| `AC-003` | `R-003` | Server config still derives a SQLite `DATABASE_URL` when needed, and startup migration flow no longer skips Prisma based on file-profile selection. | app-config + startup validation |
| `AC-004` | `R-004` | `autobyteus-server-ts/package.json` no longer exposes `build:file` / `build:file:package`, Android helpers no longer build/run `dist-file`, and obsolete file-profile build artifacts are removed. | source scan + build check |
| `AC-005` | `R-005` | Electron bootstrap env, Docker/bootstrap scripts, env examples, and active docs/tests no longer set or document `PERSISTENCE_PROVIDER`. | source scan + targeted tests/docs review |

## Requirement To Use Case Coverage

| Requirement ID | Covered Use Case(s) |
| --- | --- |
| `R-001` | `UC-001`, `UC-003` |
| `R-002` | `UC-002` |
| `R-003` | `UC-001` |
| `R-004` | `UC-003` |
| `R-005` | `UC-001`, `UC-003` |

## Acceptance Criteria To Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Server source no longer exposes a runtime persistence-profile selector. |
| `AC-002` | Token-usage persistence still works while file token storage is gone. |
| `AC-003` | Standard database bootstrap remains correct for SQLite/default runtime. |
| `AC-004` | Android/build tooling no longer depends on file-profile outputs. |
| `AC-005` | Bootstrap/config/docs/test surfaces are truthful after simplification. |

## Constraints / Dependencies

- Prisma remains the database layer for token-usage persistence.
- SQLite remains the default local database path strategy when `DB_TYPE=sqlite`.
- File-backed persistence that is subsystem-owned today stays file-backed; this ticket is not migrating those concerns into the database.

## Assumptions

- The user-confirmed target is database-only token usage storage with no file fallback.
- No active in-scope runtime behavior still requires a generic file persistence profile after the obsolete build/runtime scaffolding is removed.

## Risks

- Android tooling currently depends on `build:file` / `dist-file`; script changes must be validated so the standard build artifact is sufficient.
- Some docs/tests may still describe the legacy profile contract and need cleanup to avoid drift.

## Open Questions

- Whether any Android-specific packaging constraint appears during validation once the file-profile build is removed. Current investigation found no active product requirement that still justifies keeping it.
