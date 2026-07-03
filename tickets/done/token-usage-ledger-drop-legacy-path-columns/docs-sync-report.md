# Docs Sync Report

## Scope

- Ticket: `token-usage-ledger-drop-legacy-path-columns`
- Trigger: Delivery-stage docs synchronization after code review round 3 passed following API/E2E durable coverage-code updates.
- Bootstrap base reference: `origin/personal` at `289173a6e4d0f17376c7e2df9c422fbd3f5a4f63`
- Integrated base reference used for docs sync: `origin/personal` at `75a42b9ccca76bcdb8e224a00c5950e9a108bc2e`
- Post-integration verification reference: ticket branch `codex/token-usage-ledger-drop-legacy-path-columns` at merge commit `44f001e9757092a5f641ba225fd7cb325e281fac`

## Why Docs Were Updated

- Summary: The implementation completes the Token Usage ledger expand/backfill/contract sequence by adding a guarded startup app-data migration that physically drops obsolete `team_run_path_json` and `member_path_json` columns after execution-address backfill terminal success. Long-lived docs still described physical removal as future work and needed to be updated to the final contract.
- Why this should live in long-lived project docs: Future maintainers need to understand that `root_team_run_id` + `execution_address_json` are now both the logical and post-startup physical hierarchy contract, and that the physical drop is guarded app-data migration work rather than an unconditional Prisma SQL migration.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-server-ts/docs/modules/token_usage.md` | Canonical Token Usage module contract, migration sequence, and coverage notes. | `Updated` | Replaced future-contract wording with the implemented guarded legacy-path-column drop migration contract and coverage. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-server-ts/docs/ARCHITECTURE.md` | Startup sequence and app-data migration ordering. | `Updated` | Clarified app-data migrations may include guarded local schema contracts after data repair. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md` | Startup ordering design note. | `No change` | Existing text already states app-data migrations run after configuration/schema expansion and before runtime/API reads expose partially migrated data. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md` | Checked for stale legacy Token Usage hierarchy field references. | `No change` | Prior ticket already updated the durable prototype to recursive `children` + `executionAddress`; no UI/query shape changed in this ticket. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md` | Checked for stale legacy Token Usage hierarchy field references. | `No change` | Prior ticket already records backend-owned `executionAddress` hierarchy; no UI/query shape changed in this ticket. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-server-ts/docs/modules/token_usage.md` | Module contract / migration notes / coverage notes | Documented `20260703_drop_token_usage_legacy_path_columns`, guarded `PRAGMA table_info` drop behavior, prerequisite backfill status, row-count/final-schema summary, and physical-schema E2E coverage. | Makes the final Token Usage ledger schema contract durable outside ticket artifacts. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-server-ts/docs/ARCHITECTURE.md` | Startup architecture note | Clarified that required app-data migrations can perform guarded local schema contracts after schema expansion/data repair. | Prevents future migration-ordering mistakes around data repair vs. schema contract. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Token Usage physical schema contract | After required startup migrations, `team_run_path_json` and `member_path_json` are physically absent; `root_team_run_id` + `execution_address_json` are the hierarchy source. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md` |
| Guarded app-data schema cleanup | SQLite lacks `DROP COLUMN IF EXISTS`, so the migration inspects schema, drops only present obsolete columns, skips already-absent columns, and requires terminal-success backfill. | `design-spec.md`, implementation file, coverage reports | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| Coverage boundary | Destructive schema-drop E2E uses an isolated temp SQLite/runtime setup and verifies schema absence, data/index preservation, app-data status/logs, and GraphQL stats after drop. | `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, code review report | `autobyteus-server-ts/docs/modules/token_usage.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Physical `token_usage_ledger_events.team_run_path_json` | `root_team_run_id` + `execution_address_json` | `autobyteus-server-ts/docs/modules/token_usage.md` |
| Physical `token_usage_ledger_events.member_path_json` | `execution_address_json` member segments plus scalar route/display fields | `autobyteus-server-ts/docs/modules/token_usage.md` |
| Future-contract deferral wording | Implemented guarded app-data contract migration `20260703_drop_token_usage_legacy_path_columns` | `autobyteus-server-ts/docs/modules/token_usage.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `Updated`
- Rationale: Durable docs still described physical legacy path-column removal as a future phase; this ticket implements that phase, so no-impact was not appropriate.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Browser-rendered app-data migration settings UI was not updated because this ticket does not change UI/query shape; app-data migration status/log behavior is covered by API/E2E startup probes and durable E2E assertions.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
