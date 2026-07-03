# Docs Sync Report

## Scope

- Ticket: `token-statistics-ledger-migration-cleanup`
- Trigger: Delivery-stage docs synchronization after code review round 2 passed following API/E2E durable coverage additions.
- Bootstrap base reference: `origin/personal` at `5832196cca5215f4771b29a72d4f3fe20a0a8d8b`
- Integrated base reference used for docs sync: `origin/personal` at `98db9e8bdbf05358147e68a62c0bcdd183d54bd8`
- Post-integration verification reference: ticket branch `codex/token-statistics-ledger-migration-cleanup` at merge commit `5401104af6372e36c11eeda399d638b259754388`

## Why Docs Were Updated

- Summary: The implementation adds a required startup app-data migration that backfills historical Token Usage `execution_address_json` values and corrects old task-team root attribution while leaving physical legacy path columns for a future contract phase. Long-lived docs needed to make the startup ordering, migration boundary, Token Usage hierarchy source of truth, and stale prototype expectations match the integrated implementation.
- Why this should live in long-lived project docs: Future maintainers need to understand that Token Usage hierarchy is ledger-owned (`root_team_run_id` + `execution_address_json`), that task records are migration-only input and never query-time hierarchy authority, and that physical `team_run_path_json` / `member_path_json` removal must be sequenced after app-data backfill rather than as a normal current-ticket Prisma migration.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-server-ts/docs/modules/token_usage.md` | Canonical Token Usage module contract and coverage notes. | `Updated` | Added backfill migration semantics, expand/backfill/contract sequence, app-data summary details, and coverage evidence. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-server-ts/docs/ARCHITECTURE.md` | Server startup sequence and persistence architecture. | `Updated` | Clarified required app-data migrations run after Prisma schema migrations and before runtime/API reads. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md` | Startup ordering design note. | `Updated` | Clarified app-data migrations may depend on SQL rows plus memory files and must run after config/schema expansion. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md` | Durable UI prototype still referenced old `members`/`memberPath` hierarchy expectations. | `Updated` | Replaced stale hierarchy expectations with recursive `children` + `executionAddress`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md` | Durable UI behavior matrix still referenced old `memberPathJson` authority. | `Updated` | Replaced stale scenario with backend-owned nested `executionAddress` behavior. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-server-ts/README.md` | Checked existing developer/startup migration guidance. | `No change` | Existing README notes focus on run-history migration commands; Token Usage detail belongs in module/startup docs. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-server-ts/docs/modules/README.md` | Checked module index/common TS patterns for Token Usage references. | `No change` | Existing Token Usage module link remains accurate. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-server-ts/docs/modules/token_usage.md` | Module contract / migration notes / coverage notes | Added historical execution-address backfill section, migration id, category summary, skip/fallback policy, future contract warning, and deterministic coverage statement. | Makes the Token Usage data migration and hierarchy source of truth durable outside ticket artifacts. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-server-ts/docs/ARCHITECTURE.md` | Architecture startup sequence | Added app-data migrations after Prisma and before transports; noted token usage backfill example. | Prevents future schema/data migration ordering mistakes. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md` | Design note | Clarified app-data migration ordering and rationale. | Records why memory+SQL migrations must wait for config/schema expansion. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md` | Prototype contract cleanup | Replaced `members`/`memberPath` assumptions with recursive `children`/`executionAddress`. | Removes obsolete understanding from durable UI prototype material. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md` | Behavior matrix cleanup | Replaced nested member-path scenario with nested execution-address scenario. | Aligns prototype tests with the approved backend-owned hierarchy contract. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Token Usage execution-address migration sequence | Expand added the column; this ticket backfills deterministic historical rows; physical old-column removal is a future contract phase. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md` |
| Startup migration ordering | Prisma schema migrations run before app-data migrations; app-data migrations can depend on newly expanded schema and memory files before runtime/API reads begin. | `requirements.md`, `design-spec.md`, implementation files | `autobyteus-server-ts/docs/ARCHITECTURE.md`, `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md` |
| Migration-only task-record use | Task records are allowed only during historical backfill; normal Token Statistics queries remain self-contained in token ledger data. | `design-spec.md`, `code-review-report.md`, `api-e2e-coverage-investigation.md` | `autobyteus-server-ts/docs/modules/token_usage.md` |
| UI hierarchy contract | Settings Token Statistics consumes backend recursive `children` and `executionAddress`, not legacy path fields or frontend reconstruction. | `requirements.md`, existing `token-statistics-nested-task-runs` artifacts, coverage reports | `ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md`, `ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `team_run_path_json` / `member_path_json` as Token Statistics hierarchy authority | `execution_address_json` plus `root_team_run_id` | `autobyteus-server-ts/docs/modules/token_usage.md` |
| UI `members`/`memberPath` prototype hierarchy | Recursive backend `children` rows and `executionAddress` | `ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md`, `ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md` |
| Query-time task-record hierarchy repair | One-time app-data backfill; bounded scalar fallback for unreconstructable rows | `autobyteus-server-ts/docs/modules/token_usage.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `Updated`
- Rationale: Durable docs and prototypes had real stale or incomplete migration/hierarchy information, so no-impact was not appropriate.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against ticket branch state integrated with latest `origin/personal` at `98db9e8bdbf05358147e68a62c0bcdd183d54bd8`. Handoff summary and release/deployment report can now be prepared for explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
