# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/in-progress/token-usage-ledger-drop-legacy-path-columns/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/in-progress/token-usage-ledger-drop-legacy-path-columns/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/in-progress/token-usage-ledger-drop-legacy-path-columns/design-spec.md`
- Current Review Round: 1
- Trigger: New contract-phase design review for `token-usage-ledger-drop-legacy-path-columns`.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed current requirements, investigation notes, design spec, and upstream finalized artifacts for `token-statistics-ledger-migration-cleanup` and `token-statistics-nested-task-runs`; spot-checked current branch state at `289173a6e4d0f17376c7e2df9c422fbd3f5a4f63`, Prisma schema/migrations, app-data migration registry, backfill selected column list, app-data migration record API, startup ordering, and active old-column references.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design handoff | N/A | 0 | Pass | Yes | Guarded startup/app-data cleanup is a sound contract-phase design for this SQLite persisted local DB. |

## Reviewed Design Spec

The design covers the contract phase after the nested task statistics expand work and the execution-address backfill work. It physically removes `token_usage_ledger_events.team_run_path_json` and `member_path_json` while preserving the canonical token hierarchy contract, `root_team_run_id + execution_address_json`. Because SQLite has no `DROP COLUMN IF EXISTS` and missing-column drops fail, the design correctly places conditional DDL in a guarded startup/app-data-style cleanup rather than an unconditional Prisma SQL migration. The cleanup is ordered after `TokenUsageExecutionAddressBackfillMigration`, verifies the backfill app-data migration record is terminal-successful (`SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`) before DDL, no-ops already-absent legacy columns, and fails loudly for unrelated DDL/data-preservation errors.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements and design identify the task as Cleanup / schema contract migration after prior expand and backfill phases. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design classifies Legacy Or Compatibility Pressure / Shared Structure Looseness and cites current schema/model evidence: active code removed old fields but physical SQLite columns remain. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design explicitly calls for a small physical schema contract migration now and defers unrelated path/member concepts outside token usage. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, data-flow spines, migration strategy, guarded drop behavior, and validation plan all align with the contract-phase decision. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round for this ticket. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 / guarded physical schema contract | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 / pending backfill before contract | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 / runtime Token Statistics compatibility | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 / table, row, and index verification | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Startup/app-data migration system | Pass | Pass | Pass | Pass | Correct owner for conditional local DB cleanup after Prisma and after backfill record creation. |
| Prisma migrations | Pass | Pass | Pass | Pass | Correctly not used for unconditional raw drop because it cannot express the missing-column guard and would run before app-data backfill. |
| Token Usage persistence/statistics | Pass | Pass | Pass | Pass | Runtime query/repository behavior remains unchanged and canonical-field based. |
| Test suite | Pass | Pass | Pass | Pass | Fresh install, upgrade, drifted-schema, skipped-version, and runtime smoke coverage are all named. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Guarded legacy-column list | Pass | Pass | Pass | Pass | Fixed two-column list belongs in cleanup implementation/tests, not runtime code. |
| Full table definition for fallback rebuild | Pass | Pass | Pass | Pass | Correctly scoped to cleanup implementation/test fixture only if direct drop is unsupported. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `root_team_run_id` | Pass | Pass | Pass | N/A | Pass | Remains root grouping key. |
| `execution_address_json` | Pass | Pass | Pass | N/A | Pass | Remains canonical hierarchy address. |
| `team_run_path_json` | Pass | Pass | Pass | N/A | Pass | Removed physically; no longer a competing representation. |
| `member_path_json` | Pass | Pass | Pass | N/A | Pass | Removed physically; local path no longer competes with canonical address. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `token_usage_ledger_events.team_run_path_json` | Pass | Pass | Pass | Pass | Drop only if present; already-absent is a no-op success. |
| `token_usage_ledger_events.member_path_json` | Pass | Pass | Pass | Pass | Drop only if present; already-absent is a no-op success. |
| Old token-usage schema/test assumptions | Pass | Pass | Pass | Pass | Design requires contracted schema assertions and no old-field revival. |
| Non-token member/path concepts | Pass | N/A | Pass | Pass | Correctly out of scope because they are separate domain concepts. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/<token usage legacy path column drop migration>.ts` or equivalent guarded startup cleanup module | Pass | Pass | N/A | Pass | Correct owner for conditional DDL, prerequisite check, and summary. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | Pass | Pass | N/A | Pass | Must register cleanup after `TokenUsageExecutionAddressBackfillMigration`. |
| Server migration/runtime test files | Pass | Pass | N/A | Pass | Coverage responsibility is clear even if exact test filename is implementation-chosen. |
| Existing backfill migration file | Pass | Pass | N/A | Pass | Verify unchanged unless tests expose hidden dependency. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Guarded schema cleanup | Pass | Pass | Pass | Pass | May inspect schema and migration records; must not alter runtime hierarchy behavior. |
| App-data migration runner/backfill | Pass | Pass | Pass | Pass | Backfill remains before contract and independent of old columns. |
| Token Usage statistics provider | Pass | Pass | Pass | Pass | No removed-column read or fallback is introduced. |
| Prisma migration system | Pass | Pass | Pass | Pass | Historical migrations are not edited; no unconditional raw drop migration is added. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Guarded token-usage schema cleanup | Pass | Pass | Pass | Pass | Conditional SQLite DDL is encapsulated in the startup cleanup boundary. |
| App-data migration runner | Pass | Pass | Pass | Pass | Ordered status-recorded migrations are the right outer boundary. |
| Token Usage statistics provider | Pass | Pass | Pass | Pass | Query projection stays canonical-field based. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| Guarded cleanup `execute()` | Pass | Pass | Pass | Low | Pass |
| `TokenUsageExecutionAddressBackfillMigration.execute()` | Pass | Pass | Pass | Low | Pass |
| `tokenUsageTaskStatisticsInPeriod` | Pass | Pass | Pass | Low | Pass |
| Schema probe via `PRAGMA table_info` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/app-data-migrations/migrations/<drop migration>.ts` | Pass | Pass | Low | Pass | Correct because cleanup requires TypeScript guards and app-data order. |
| `src/app-data-migrations/app-data-migration-registry.ts` | Pass | Pass | Low | Pass | Correct registration point. |
| Test files under server test suite | Pass | Pass | Low | Pass | Exact test split can be chosen during implementation. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Conditional schema cleanup/status | Pass | Pass | Pass | Pass | Existing app-data migration system fits one-time guarded local cleanup. |
| Backfill compatibility | Pass | Pass | N/A | Pass | Reuse existing backfill; verify order and independence. |
| Runtime statistics | Pass | Pass | N/A | Pass | Keep existing provider/tree builder. |
| SQLite schema verification | Pass | Pass | Pass | Pass | Tests using `PRAGMA table_info` are appropriate. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Legacy physical token path columns | Yes, before cleanup | Pass | Pass | This ticket removes them physically. |
| Already-absent drift handling | Yes, as guarded no-op | Pass | Pass | Not compatibility for old behavior; this is safe idempotent cleanup. |
| Runtime hierarchy old-column fallback | No | Pass | Pass | Explicitly forbidden. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Expand/backfill/contract ordering | Pass | Pass | Pass | Pass |
| Guarded direct drop | Pass | Pass | Pass | Pass |
| Drifted schema where one/both old columns are absent | Pass | Pass | Pass | Pass |
| Table rebuild fallback, if required | Pass | Pass | Pass | Pass |
| Runtime statistics after contract | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Final contracted schema | Yes | Pass | Pass | Pass | Good/bad schema examples clearly show removed fields. |
| Guarded drop sequence | Yes | Pass | Pass | Pass | Migration strategy gives concrete PRAGMA/drop/no-op/final-probe steps. |
| Skipped-version order | Yes | Pass | N/A | Pass | Spine and validation plan cover pending backfill before contract. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Packaged Prisma/SQLite direct `DROP COLUMN` support | Direct drop is preferred but must work in shipped runtime, not only local shell. | Validate early; if unsupported, implement the documented table-rebuild fallback with exact non-obsolete column/index preservation. | Non-blocking implementation validation. |
| App-data migration failure is recorded rather than process-fatal in current startup behavior | Unexpected DDL errors must be visible and must not be mistaken for success. | Ensure cleanup returns `FAILED`/throws through the app-data migration framework with clear summary/log evidence for non-no-op errors. | Non-blocking implementation detail. |
| Existing tests/docs that intentionally mention deferred physical drop | Prior backfill tests/docs may contain stale assertions after this contract ticket. | Update or remove stale token-usage-specific assertions as part of implementation/delivery while preserving historical ticket artifacts. | Non-blocking cleanup. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no open design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Direct `ALTER TABLE ... DROP COLUMN` should be validated against the packaged Prisma/SQLite runtime before relying on it; fallback table rebuild must preserve all non-obsolete columns, unique constraints, indexes, defaults, and row data.
- Because the cleanup is recorded as an app-data/startup migration rather than a Prisma migration, implementation tests should exercise future/fresh startup shape (`migrate deploy` plus app-data migrations), not only Prisma migration state.
- If the prerequisite backfill record is missing or failed, the cleanup should not silently succeed; the status/log/summary should make the blocked state obvious.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Guarded app-data/startup cleanup is the correct boundary for this contract phase under the stated SQLite and startup-order constraints. Registry order plus explicit terminal-success prerequisite preserves expand/backfill/contract semantics, and the validation matrix covers fresh install, existing upgrade, drifted-schema, and skipped-version paths.
