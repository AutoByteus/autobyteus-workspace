# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-ledger-migration-cleanup/tickets/in-progress/token-statistics-ledger-migration-cleanup/design-spec.md`
- Current Review Round: 2
- Trigger: Re-review after `solution_designer` revisions for AR-001.
- Prior Review Round Reviewed: 1
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Reviewed revised requirements, investigation notes, and design spec; rechecked prior round-1 report; spot-checked current repository state for Prisma schema/migrations, startup ordering, app-data migration interfaces, and active token usage path-column references. Current branch remains `codex/token-statistics-ledger-migration-cleanup` at base `5832196cca5215f4771b29a72d4f3fe20a0a8d8b`. Current Prisma model exposes `executionAddressJson` only; old physical columns appear only in the original create migration, while startup still runs `runMigrations()` before `AppDataMigrationRunner.runPending()`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial follow-up design handoff | N/A | 1 blocking finding (`AR-001`) | Fail | No | Backfill/query design was sound, but physical old-column drop/contract wording was contradictory and could lead to an unsafe normal Prisma drop-column migration before app-data backfill. |
| 2 | Re-review after AR-001 revisions | `AR-001` | 0 | Pass | Yes | Current-ticket scope is now unambiguous: app-data backfill/correction plus active-code non-use proof only; physical column drop is deferred to future/post-backfill contract work. |

## Reviewed Design Spec

The revised design is a follow-up to the finalized `token-statistics-nested-task-runs` ticket. It treats the merged work as the expand phase, this ticket as the backfill phase, and future physical removal of `team_run_path_json` / `member_path_json` as a separate post-backfill contract phase. The current design adds a registered app-data migration that materializes `execution_address_json` for deterministic historical token usage rows, may use task delegation records only as one-time migration input for old task-team child runs, keeps normal Token Statistics query-time hierarchy self-contained in token usage ledger fields, and adds proof that active hierarchy code ignores old path columns and that no normal Prisma drop-column migration is introduced in this ticket.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements and design classify the work as Bug Fix / Data Migration / Cleanup after the finalized runtime/API/UI behavior-change ticket. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Revised artifacts identify Legacy/Compatibility Pressure plus Missing Migration Invariant; investigation cites expand-only Prisma migration, no app-data backfill, mostly null historical `execution_address_json`, and temporarily retained ignored physical columns. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Immediate refactor is bounded to an app-data backfill/correction migration and active-code non-use proof; physical schema contraction is explicitly deferred. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Data-flow spines, removal plan, migration ordering decision, validation plan, examples, and future contract note all align on backfill now / physical drop later. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Resolved | Requirements now state the ticket implements app-data backfill/correction plus active-code non-use proof only and explicitly excludes physical column removal. Investigation notes scope summary says physical removal is future/post-backfill contract work. Design removes the prior current-scope physical-contract spine/file mapping and replaces current validation with no normal Prisma drop-column migration, old-column non-use proof, backfill summary, and self-contained query checks. The `PRAGMA table_info` absence check now appears only in the future contract note. | The blocking ambiguity is resolved; implementation should not add a normal Prisma drop-column migration in this ticket. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 / app-data backfill | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 / normal Token Statistics query | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 / backfill classifier | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 / active old-column non-use proof | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| App-data migrations | Pass | Pass | Pass | Pass | Correct owner for one-time historical data correction and recorded status/summary. |
| Token Usage domain/statistics | Pass | Pass | Pass | Pass | Canonical address shape and query-time hierarchy remain owned by Token Usage. |
| Task Delegation records | Pass | Pass | Pass | Pass | Correct as read-only migration input only; not a query-time authority. |
| Prisma schema/migrations | Pass | Pass | Pass | Pass | Current ticket explicitly avoids normal drop-column migration; future physical contract is documented separately. |
| Frontend/API | Pass | Pass | Pass | Pass | No hierarchy reconstruction or task-record joining is introduced. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Canonical execution address serialization | Pass | Pass | Pass | Pass | Reusing `token-usage/domain/execution-address.ts` prevents duplicate address JSON shapes. |
| Backfill row classification | Pass | Pass | Pass | Pass | Keeping classifier internal to the migration is sound unless tests justify extraction. |
| Task-team run index | Pass | Pass | Pass | Pass | Migration-local index keeps task-record knowledge out of runtime statistics. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `execution_address_json` | Pass | Pass | Pass | N/A | Pass | Canonical hierarchy address. |
| `root_team_run_id` | Pass | Pass | Pass | N/A | Pass | Root grouping/index key. |
| `member_route_key` / task scalar fields | Pass | Pass | Pass | N/A | Pass | Safe as display/filter/backfill inputs; not competing hierarchy authority. |
| Task record `taskRun.address` | Pass | Pass | Pass | N/A | Pass | Safe as one-time migration input only. |
| Physical legacy path columns | Pass | Pass | Pass | N/A | Pass | Temporarily retained but decommissioned as active hierarchy authority; physical drop explicitly future. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Active old path-column hierarchy authority | Pass | Pass | Pass | Pass | Current ticket proves active hierarchy paths do not read `team_run_path_json` / `member_path_json`. |
| Historical direct/member no-address rows | Pass | Pass | Pass | Pass | Backfilled to canonical member address where deterministic. |
| Historical task-team child-root rows | Pass | Pass | Pass | Pass | Corrected using task records only during migration where deterministic. |
| Physical `team_run_path_json` / `member_path_json` columns | Pass | Pass | Pass | Pass | Follow-up/future contract only; not current implementation scope. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.ts` | Pass | Pass | Pass | Pass | Correct owner for historical correction. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | Pass | Pass | N/A | Pass | Correct registration point. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/__tests__/token-usage-execution-address-backfill-migration.test.ts` | Pass | Pass | N/A | Pass | Focused coverage for migration/idempotency/summary/no-drop behavior. |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | Pass | Pass | N/A | Pass | Runtime query owner; only bounded fallback/guard adjustments if needed. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| App-data migration | Pass | Pass | Pass | Pass | May read task records and ledger rows, then write canonical token usage data. |
| Token Usage statistics provider | Pass | Pass | Pass | Pass | Must not query task records or old path columns. |
| GraphQL/frontend | Pass | Pass | Pass | Pass | Display only; no hierarchy reconstruction. |
| Future physical contract phase | Pass | Pass | Pass | Pass | Explicitly outside current scope and ordered after observed backfill. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppDataMigrationRunner` | Pass | Pass | Pass | Pass | Owns status/idempotent migration execution; token-specific policy stays inside the migration definition. |
| `TokenUsageStatisticsProvider` | Pass | Pass | Pass | Pass | Query-time hierarchy remains ledger-only. |
| Task records | Pass | Pass | Pass | Pass | Used through migration-only input boundary, not runtime query bypass. |
| Future schema contract | Pass | Pass | Pass | Pass | Not a current implementation boundary; noted for later design. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| New app-data migration `execute()` | Pass | Pass | Pass | Low | Pass |
| Raw token row scan/update helpers | Pass | Pass | Pass | Medium | Pass |
| `tokenUsageTaskStatisticsInPeriod` | Pass | Pass | Pass | Low | Pass |
| Future physical contract validation | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/app-data-migrations/migrations/...backfill...ts` | Pass | Pass | Low | Pass | Correct placement. |
| `src/app-data-migrations/app-data-migration-registry.ts` | Pass | Pass | Low | Pass | Correct existing registry. |
| `src/app-data-migrations/migrations/__tests__/...backfill...test.ts` | Pass | Pass | Low | Pass | Correct focused test location. |
| `token-usage/providers/task-statistics-tree-builder.ts` | Pass | Pass | Low | Pass | Correct runtime query owner for any fallback guard. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| App-data migration execution/status | Pass | Pass | Pass | Pass | Existing subsystem is the right owner. |
| Address normalization | Pass | Pass | N/A | Pass | Existing token usage domain structure should be reused. |
| Task delegation records | Pass | Pass | N/A | Pass | Correct as migration-only evidence. |
| Physical schema cleanup | Pass | Pass | N/A | Pass | Correctly deferred to future/post-backfill contract design. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Query-time task-record repair | No | Pass | Pass | Explicitly rejected. |
| Old path columns as active runtime/statistics authority | No | Pass | Pass | Active non-use proof is in current scope. |
| Bounded no-address fallback | Yes, intentionally | Pass | Pass | Acceptable data-visibility fallback for unreconstructable rows; no hierarchy guessing. |
| Physical old-column retention | Yes, temporarily | Pass | Pass | Explicitly current-ticket retention, future contract removal. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Expand already completed | Pass | Pass | Pass | Pass |
| App-data backfill/correction | Pass | Pass | Pass | Pass |
| Normal query remains self-contained | Pass | Pass | Pass | Pass |
| Future physical contract | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Direct member backfill | Yes | Pass | N/A | Pass | Clear one-segment address example. |
| Task-team historical correction | Yes | Pass | N/A | Pass | Clear before/input/after example. |
| Bad query-time task-record repair | Yes | Pass | Pass | Pass | Correctly rejected. |
| Current-ticket vs physical-drop shape | Yes | Pass | Pass | Pass | Good/bad example now explicitly rejects normal Prisma drop before app-data migration. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Category-specific migration summary encoding | Existing `AppDataMigrationSummary` has generic counts plus details; requirements ask for direct/task-team/task-agent/already-addressed/skip/failure counts. | Implementation should encode these counts deterministically in summary details or explicitly extend the summary shape if needed, without weakening status parsing. | Non-blocking implementation detail. |
| Future physical contract validation | Physical drop still needs SQLite/Electron sequencing and compatibility verification. | Handle in future/post-backfill contract ticket, potentially with `PRAGMA table_info` absence validation there. | Deferred by design. |

## Review Decision

Pass: the revised design is ready for implementation.

## Findings

None.

## Classification

N/A — no open design findings in the latest authoritative round.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must preserve the current scope boundary: no normal Prisma drop-column migration and no runtime/statistics/task-record query join.
- Migration should avoid heuristic reconstruction; rows without deterministic data must remain fallback rows with explicit skip reasons.
- Category counts should be visible in app-data migration status/logs without creating excessive per-row summary details for large local databases.
- Future physical removal of old columns remains a separate contract-phase responsibility after backfill has completed and been observed.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: AR-001 is resolved. Current-ticket implementation scope is unambiguous: app-data backfill/correction plus active-code non-use proof only, with Token Statistics query-time hierarchy remaining self-contained in token usage ledger data.
