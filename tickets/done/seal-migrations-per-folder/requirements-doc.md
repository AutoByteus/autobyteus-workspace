# Requirements Document: seal-migrations-per-folder

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-002
- Package: `seal-migrations-per-folder`; Project Task autobyteus-280 (autobyteus-204 waits for it)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's decision of 2026-10-23
- Requirements owner: Solution Designer; date 2026-10-23
- Approved by and reference:
  - `User`: the direction ("scope the dirty code inside each migration folder itself … we don't compromise our production code") and the sharing decision ("if migrations need the same helper … they share because it belongs to the migration code themselves … not the applications").
  - The rest by the Solution Designer within that direction, with the user informed in the same conversation.

## Problem And Desired Outcome

- **Problem:** migration code and production code depend on each other.
  - Migrations import production code: 74 modules, some pulling in most of the server (S-07), plus the core library (S-08). Changing production code breaks old migrations (autobyteus-197 DI-001, DI-002).
  - Production code asks about specific migrations (5 files) and imports a legacy constant.
- **Desired outcome:**
  - a sealed migration area: one folder per migration, plus one frozen layer only migrations use;
  - no imports between production code and the migration area, in either direction, enforced by a test;
  - every migration behaves exactly as before;
  - a migration can later be retired by deleting its folder and the frozen files no other migration uses;
  - the guideline states the rule.

## Behavior

| BEH | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Migrations use production code | Migrations use only the runner contract, the database client and the frozen layer | Every migration's result on every released input |
| BEH-002 | Production code reads named migration statuses (G-1, G-2, a warning, the GraphQL special case) | Production code asks the runner whether a **capability** is ready; migrations declare which capability they hold back | G-2's protection of token-usage history and existing-run restore while that migration is pending |
| BEH-003 | G-1: the whole server refuses to start while the custom-provider migration is pending | Only custom providers are unavailable while it is pending; the server starts | Custom providers work once it has succeeded |
| BEH-004 | The 205 migration deletes every `server_helper` run | It deletes only Skill Improvement helper runs | Everything else it deletes |
| BEH-005 | No written rule | The guideline states the sealing rule, the Django/Rails reasoning and the retirement steps | — |

## Scope Guardrail

### In-Scope Use Cases

| UC | Use case |
| --- | --- |
| UC-001 | Startup runs pending migrations, with results identical to before |
| UC-002 | Production features gated on a pending migration (G-1, G-2) |
| UC-003 | Settings → migrations: list and manual retry |
| UC-004 | Retiring a migration later (structure only; no retirement here) |

### Out Of Scope

- Retiring any migration, a minimum version, the backup-and-fresh-start step (autobyteus-204).
- Prisma SQL migrations.
- Changing what any migration converts, apart from the 205 repair.

### Non-Goals

- Making migrations smaller or faster.

### Preserved Behavior Boundary

All migrations' outputs, ledger statuses and item details on every released input shape; G-2's protection; all production behavior when no migration is pending.

### Prerequisites

None.

## Requirements

| REQ | Requirement |
| --- | --- |
| REQ-001 | Every registered migration lives in its own folder under the migration area. Code that only it uses lives in that folder |
| REQ-002 | Code shared by several migrations lives in one frozen layer inside the migration area. It holds frozen copies of the production and core-library code the migrations use today, limited to what they use, plus the existing old data shapes. Only migrations import it |
| REQ-003 | Migration code (folders and the frozen layer) imports nothing from production code or from `autobyteus-ts`. It may import only the runner contract, the database client, node APIs and third-party libraries |
| REQ-004 | Production code imports nothing from migration folders or the frozen layer. It may use only the runner (statuses, manual run, capability readiness) |
| REQ-005 | An architecture test fails on any import that breaks REQ-003 or REQ-004. A test or script lists the frozen-layer files that no registered migration imports |
| REQ-006 | A migration may declare capabilities it holds back while it has not succeeded. Production code asks the runner about a capability, never about a migration id. G-2 maps to a token-usage-history capability with unchanged behavior. G-1 maps to a custom-provider capability: while pending, custom providers report unavailable and the server starts. The run-tree warning and the GraphQL special case are removed (a manual retry of any migration rebuilds the run-package readiness index) |
| REQ-007 | Every migration produces the same files, database rows, ledger status and item details as before on every released input shape. The existing migration tests pass with unchanged assertions |
| REQ-008 | 205 repair: `20261020_remove_skill_improvement_data` identifies helper runs only by the improver agent id, the `improverRunId`/`evolverRunId` the records name, and the improver session files, never by `server_helper` alone. A beta.5-era compactor run carrying `server_helper` survives. The next release's notes say plainly that installs which already ran it cannot get those runs back |
| REQ-009 | `autobyteus-ts/src/memory/migration/` moves into the migration area and is deleted from the library (its only user is a migration, S-08) |
| REQ-010 | The Data Migration Guideline states: the sealing rule; the reasoning (Django historical models, Rails migration-local models: a migration never uses the app's current classes); sharing only within the migration area; capability readiness instead of migration-id checks; and how to retire a migration (delete its folder, its tests and its registry line, then the frozen files the test reports unused). The retention window is left for the user to set at the first retirement (autobyteus-204) |
| REQ-011 | Each migration's tests live in one folder named after it, so that retirement deletes them together |

## Acceptance Criteria

| AC | REQ | Expected outcome |
| --- | --- | --- |
| AC-001 | REQ-001..005 | The architecture test passes, and fails when a cross-boundary import is added (a negative test). The unused-frozen-files report is empty |
| AC-002 | REQ-007, REQ-011 | All migration suites (unit, integration, startup e2e) pass with unchanged assertions, in their new folders |
| AC-003 | REQ-006 | With the token-usage migration pending (a fixture), history reads and existing-run restore refuse as today; once it has succeeded, they work |
| AC-004 | REQ-006 | With the custom-provider migration pending (a fixture): the server starts; listing shows only built-in models; a run start with a custom model is refused with `CUSTOM_PROVIDERS_MIGRATION_PENDING` while a built-in run starts; a Settings custom-provider create/update/delete is refused with the code |
| AC-005 | REQ-008 | Fixtures: a beta.5-era compactor run carrying `server_helper` survives; Skill Improvement data is deleted as before; an M3 failure for a session-only helper run leaves its session file and the next start deletes both; an unreadable session file is preserved. `release-notes.md` carries the REQ-008 sentence |
| AC-006 | REQ-009 | The library no longer contains `memory/migration/`; its tests moved; the library builds |
| AC-007 | REQ-010 | The guideline contains the rule and the retirement steps |

## Decisions

| DEC | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Share frozen helpers between migrations? | The user: yes, inside the migration area only (about 12,000 lines, against about 114,000 for strict copies, S-03/S-04) | User | Decided |
| DEC-002 | How does production code learn that a gated migration is pending? | A capability declared by the migration and answered by the runner. Production names a current concept and never a migration. When the migration is retired its declaration goes, and the capability is always ready | Solution Designer | Decided |
| DEC-003 | G-1 whole-server block | Narrow it to the custom-provider capability (guideline §1 "gate narrowly"; the user's rule "the application starts normally"). This only changes behavior when that migration has failed | Solution Designer | Decided |
| DEC-004 | Retention window | Not needed until the first retirement; the guideline states the steps, and the user sets the window in autobyteus-204 | Solution Designer | Decided |
| DEC-005 | Database client | Migrations keep using the current Prisma client: the schema is deployed before app-data migrations (guideline §4, deployment order), so it is the contract | Solution Designer | Decided |
