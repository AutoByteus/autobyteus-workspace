# Design Spec

## Solution And Approval Basis

- Package: `APP-STARTUP-LATENCY-20260918-001`
- Current solution revision: `SR-011`
- Approved requirements: cumulative `SR-010`, explicitly confirmed by the user on 2026-09-19 after the token-row clarification (“yessss”).
- Design status: `Ready for repeated independent architecture review`
- Classification: `Medium / High`
- Canonical evidence: `investigation-notes.md`

`ARCH-REV-006 / ARCH-F-004` confirmed the approved `SR-010` policy but found that root identity in the current token failure map is not a semantic data-rejection discriminator. `SR-011` preserves the approved behavior and revises only the interface design: the repository types the approved malformed/conflicting attribution-data rejection; the transition separates typed warnings from all structural/operational fatal failures; the coordinator aggregates them with fatal precedence. The existing implementation remains held until repeated review passes.

## Current-State Read

Startup runs pending app-data migrations and then builds one shared Team/AgentOrg `RootRunPackageReadinessIndex` before the HTTP server listens. Historical base behavior crossed the structural boundary by enumerating every member trace and attachment locator. `IR-001` removes that recurring 5.5-GiB audit; `IR-002` preserves exact request-time Team/Org owner/path/file checks and corrects Team `400`/`404` outcomes. Those reviewed changes remain authoritative.

The unreleased flat-family migration already has the needed lifecycle boundaries:

1. `AgentOrgHistoryCandidatePlanner` discovers roots and omits a root whose required execution tree is absent.
2. Locator/runtime conversion operates on emitted plans.
3. `AgentOrgTokenAttributionTransition` enumerates roots and calls `AgentOrgTokenAttributionRepository.convertRoot()` separately for each root.
4. `convertRoot()` uses a database transaction, so malformed/conflicting rows roll back token changes for that root.
5. The transition currently catches root-ID validation, family collision, current Org-tree read/validation and every repository exception into one root-keyed `failures` map; root-keying does not identify semantic cause. Global token-root discovery throws.
6. The repository can distinguish approved malformed/conflicting attribution data at its exact checks, but currently throws generic `Error` for both those cases and database/concurrency/reread/unknown failures.
7. `TokenUsageRunStore.assertAgentOrgRecordsReady()` prevents an affected Org from resuming when its token ownership is not current.
8. Paired Team/Org history-index commit/reread is attempt-wide.
9. The generic runner terminal-skips both `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` but retries `FAILED`.

`IR-003` already distinguishes missing-tree warnings. The remaining defect is twofold: the transition map mixes approved token-data rejection with root structural/operational faults, and the coordinator maps them all to `FAILED_TOKEN`. A typed cause boundary must originate where token-data semantics are known, not be inferred by the coordinator.

## Task Size And Architectural Risk

- Task size: `Medium`.
- Size basis: cumulative ticket spans readiness, exact attachment access and migration lifecycle. The incremental `SR-011` change is confined to a small migration-local typed token-data rejection, transition result split, coordinator aggregation and focused tests/docs; no new migration, schema, runner or conversion stage is added.
- Architectural risk: `High`.
- Risk basis: a terminal warning suppresses future automatic retries. A typed token-data warning can leave an affected Org locally unavailable after earlier filesystem effects; this must be explicit, guarded and tested. Attempt-wide fatal precedence must not be weakened.
- Escalation trigger: return to Solution Designer if implementation would reclassify any additional per-root category, bypass `AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY`, change conversion order/shared runner/status schema, add repair/fallback behavior, or weaken structural/access checks.

## Architecture Investigation Evidence

| Evidence | Observation | Decision |
| --- | --- | --- |
| Exact Electron timing and readiness probe (`E-001`–`E-006`) | ~27 seconds and ~5.5 GiB are attributable to readiness-owned trace scan | Preserve structural-only `IR-001`; no historical payload scan |
| Context-file sources/tests and `CRR-001` (`E-007`–`E-018`) | Exact access already owns safety; Team had a bounded status-mapping gap | Preserve `IR-002`; no API redesign |
| P01/three-launch evidence (`E-019`–`E-022`) | `FAILED` retry mutates only ledger metadata repeatedly; actual profile has 518 skipped/current and eight missing-tree roots | Terminal warning is required for the actual profile |
| Planner/source proof (`E-025`) | Missing-tree root has no plan/effect | Preserve `IR-003` missing-tree warning |
| Startup runner/host (`E-026`) | This migration's `FAILED` is logged/retried but does not itself abort host construction | Classify by safe normal operation and authority scope, not listen success alone |
| Token repository/run-store (`E-027`) | Approved malformed/conflicting attribution data is detected inside the root transaction; rollback and local restore guard are established | Type that exact data rejection at origin; retain local unavailability |
| Global owners (`E-028`) | Token discovery/database and paired history-index failures are attempt-wide | Keep fatal/retryable; fatal dominates warnings |
| `ARCH-REV-005 / ARCH-F-003` and approval (`E-029`) | Review required concrete categories/effects; user approved the bounded result | No generic framework or additional warning inference |
| `ARCH-REV-006 / ARCH-F-004 / MP-004` (`E-030`) | Current root-keyed map mixes data rejection with structural/SQL/concurrency/reread/unknown failures | Add one migration-local typed data rejection and separate transition warning/fatal maps |

## Intended Change

1. Preserve `DS-001` structural-only readiness and `DS-003` exact attachment access exactly as reviewed/implemented.
2. Preserve `IR-003`'s dedicated missing-execution-tree warning/no-plan outcome.
3. Add a migration-local `AgentOrgTokenAttributionDataRejection` (or equivalent discriminated result) in the token repository module. Throw it only for approved source-data conditions: unexpected claimant, unparseable/malformed/non-object identity summary, or conflicting legacy attribution tuple. Do not type database query/update failure, precondition change, strict reread failure or unknown errors as data rejection.
4. Revise `AgentOrgTokenAttributionTransition.execute()` to return `{ warnings, failures, changed }`: catch only the typed data rejection into `warnings`; catch every root-ID, family/tree structural, SQL-operational, concurrency/precondition, reread and unknown exception into `failures`; keep global root discovery as a throw.
5. In the coordinator, add both warning and fatal root IDs to the existing blocked/failure dependency map so neither can enter history completion/cleanup. Record warnings with one explicit warning disposition and fatal roots with `FAILED_TOKEN`. Dependency propagation remains fatal; therefore a warning root that makes another candidate incomplete cannot produce terminal warning-only status.
6. Aggregate public status locally:
   - no warning/fatal -> `SUCCEEDED`;
   - missing-tree and/or typed token-data warning, with no fatal -> `SUCCEEDED_WITH_WARNINGS`;
   - any fatal -> `FAILED`, regardless of warnings.
7. Preserve exact failed item details and `failedCount`; do not report warning roots as migrated.
8. Preserve affected-root enforcement: an Org with rejected token conversion continues to fail `assertAgentOrgRecordsReady()` locally. No retry fallback or compatibility read is added.
9. Keep all unsupported per-root locator/runtime/write/reread/cleanup/dependency, malformed tree/sidecar/family and unknown candidate failures fatal.
10. Reuse the generic runner's existing terminal skip. Update the existing migration in place; do not create another migration.

## Relevant Behavior And Production-Path Map

| Behavior | Requirements / ACs | Existing owner | Approved target path |
| --- | --- | --- | --- |
| `BEH-001` | `REQ-001`, `REQ-002`; `AC-001`–`AC-003` | `RootRunPackageReadinessIndex` | Structural Team/Org admission only -> listen; no trace scan (`DS-001`) |
| `BEH-002` | `REQ-003`, `REQ-004`; `AC-004` | context-file REST/resolver/layout/read service | Exact request -> owner/path/file validation -> bytes or narrow local error (`DS-003`) |
| `BEH-003` | `REQ-005`–`REQ-007`, `REQ-010`; `AC-005`, `AC-006`, `AC-009` | planner, token transition/repository, flat-family coordinator, token run store | Missing-tree/no-plan or typed token-data rejection after rollback -> warning detail -> terminal status; affected Org locally guarded (`DS-002`) |
| `BEH-004` | `REQ-008`, `REQ-009`, `REQ-011`; `AC-007`, `AC-008` | migration coordinator and attempt-wide owners | Any attempt-fatal/global authority failure -> overall `FAILED`; unsupported categories remain fatal; readiness never repeats migration audit (`DS-002` -> `DS-001`) |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Status / applicability |
| --- | --- | --- |
| `validation/electron-fresh-start-timing.json`; readiness cold probe files | Startup root-cause/timing/read evidence | Complete; evidence only |
| `code-review-report.md`; `code-review-revision-record.md` | `CRR-001` attachment finding and `CRR-003` requirement-gap origin | Complete; evidence only |
| API/E2E execution/revision reports; `p01-preservation-result.json`; `three-launch-summary.json` | Existing failed-ledger and protected-state proof | Historical Fail; P01 must rerun first |
| `design-review-report.md`; `architecture-review-revision-record.md` | `ARCH-REV-003`–`ARCH-REV-006`, including current `ARCH-F-004` | Current Fail / Design Impact basis; `SR-011` awaits repeated review |
| `implementation-handoff.md`; `implementation-revision-record.md` | Cumulative `IR-001`–`IR-003` source/test evidence | Preserve; `IR-003` is historical implementation, not current authority |
| Private exact migration log cited in `E-021` | Proves the actual eight causes | Private, unattached, uncommitted |

## Task Design Health Assessment

- Change posture: `Performance` plus `Refactor`.
- Root causes: `Boundary Or Ownership Issue` and `Duplicated Policy Or Coordination`.
- Refactor needed now: `Yes`, but only within existing owners.
- Health decision: retain one lifecycle owner per concern. Readiness validates current structure; migration converts/classifies one-time persisted data; exact access validates one requested attachment; token run store guards an affected Org. Use existing root/attempt failure separation rather than introduce a generic framework.
- Intentional deferral: repair of missing-tree sources or token rows and warning classification for any other per-root stage.

## Terminology

- **Root warning:** an identified root-local limitation that does not invalidate the attempt-wide authorities or unrelated application operation, remains visible in details, and is terminal under the approved policy.
- **Missing-tree warning:** root rejected before `HistoryCandidatePlan`; no candidate effects.
- **Typed token-data warning:** repository-classified malformed/conflicting attribution data rejected inside the root transaction; affected Org remains locally non-resumable through the existing readiness guard. Root-keyed structural/operational errors are not this warning.
- **Attempt-fatal failure:** inability to establish or publish an attempt-wide required authority, or any still-unsupported item failure; requires correction/retry and dominates warnings.
- **Terminal warning:** top-level `SUCCEEDED_WITH_WARNINGS`; runner skips later execution while retaining item details.

## Persisted Data / State Transition Decision

- Decision: `Migration Required — Existing Migration Outcome Correction; No New Migration`.
- Schema/layout change: none.
- Shared runner/status change: none.
- Conversion-order change: none.
- One corrected retry may update valid targets plus migration ledger/log.
- Missing-tree roots stay byte-identical.
- Typed token-data warning commits no token-row changes for that root; earlier migration filesystem effects are not claimed rolled back. The root remains locally blocked from restore.
- After terminal status, later startups perform no migration-owned write for this migration.
- Attempt-fatal outcomes remain retryable.

### Migration Plan

1. Preserve the existing migration ID and runner contract.
2. Keep `missingExecutionTreeWarnings` and no-plan behavior from `IR-003`.
3. Add `AgentOrgTokenAttributionDataRejection` in the repository module and use it only at explicit token-data validation checks. Generic Prisma/SQL, precondition, reread and unknown exceptions remain untyped/fatal.
4. Return separate transition `warnings` and `failures` maps. Catch only the typed data rejection into `warnings`; all other per-root exceptions enter `failures`; global discovery still throws.
5. In the coordinator, block warning and fatal root IDs from completion/dependency processing, but record distinct warning/fatal dispositions. Any propagated dependency failure is fatal.
6. Count missing-tree plus typed token-data dispositions as warnings; count every other `FAILED_*` disposition in fatal count.
7. Derive final status with fatal precedence.
8. Keep warning error text explicit about unchanged missing-tree roots and locally unavailable token roots; never say all roots migrated.
9. Reuse terminal skip on subsequent starts.

## Data-Flow Spine Inventory

| Spine | Scope | Trigger | Terminal output | Owner |
| --- | --- | --- | --- | --- |
| `DS-001` | Main-line startup | normal process launch | one structural readiness generation | readiness index |
| `DS-002` | Migration-local lifecycle | pending/failed flat-family record | `SUCCEEDED`, `SUCCEEDED_WITH_WARNINGS`, or `FAILED` | flat-family migration coordinator |
| `DS-003` | Main-line request | exact attachment GET | bytes or narrow local error | context-file transport/services |

## Spine Narratives

- `DS-001`: migration runner completes/records outcomes -> structural Team/Org package validation -> one process-local generation -> server listen. Raw traces are absent from this spine.
- `DS-002`: planner returns plans/missing-tree warnings -> existing locator/runtime stages -> repository emits typed data rejection or ordinary fatal error -> transition separates warning/failure maps (global discovery throws) -> existing history-index/cleanup stages -> coordinator aggregates warnings versus fatal with fatal precedence -> shared runner records/terminal-skips.
- `DS-003`: parse explicit owner descriptor -> resolve exact current execution -> validate stored filename/safe child/file -> stream or return precise `400`/`404`; unexpected faults propagate.

## Ownership And Boundary Map

| Owner | Owns | Must not own |
| --- | --- | --- |
| `RootRunPackageReadinessIndex` | current structural Team/Org admission | raw-trace/attachment audit or migration repair |
| `AgentOrgHistoryCandidatePlanner` | source discovery, strict plan creation, missing-tree/no-plan warning | token classification or public status |
| `AgentOrgTokenAttributionTransition` | root enumeration, per-root continuation, typed-warning versus fatal-result separation, global discovery throw | inventing data semantics or top-level status |
| `AgentOrgTokenAttributionRepository` | transactional root token conversion and exact typed classification of approved attribution-data rejection | filesystem migration, top-level status or typing operational faults as data |
| Flat-family migration coordinator | disposition scope, counts/details, fatal precedence, public result | token SQL internals, shared runner special case |
| `TokenUsageRunStore` | exact affected-Org readiness enforcement | migration retry/status |
| Context-file services/routes | exact attachment owner/path/file access | global history admission |

## Dependency Rules

- Repository alone types the approved attribution-data rejection at its explicit validation checks.
- Transition returns separate `warnings` and `failures`; coordinator must not reinterpret error messages or root keys.
- Coordinator may classify only missing-tree and typed token-data warning dispositions as nonfatal; both warning/fatal root IDs still block completion and dependency closure.
- Preserve repository transaction semantics and the token run-store guard. Change only the repository error type, transition result shape and coordinator consumption defined here; any broader signature/behavior change is Design Impact.
- Any fatal disposition forces overall `FAILED`.
- No layer may infer warning scope from message text, path shape, `failedCount`, or catch-all exception handling.
- No readiness/access owner may query migration warning state to bypass its own strict checks.

## Interface Boundary Mapping

| Interface | Input / output | Revised responsibility |
| --- | --- | --- |
| `AgentOrgHistoryCandidatePlanner.plan()` | plans, fatal failures, missing-tree warnings | unchanged from `IR-003` |
| `AgentOrgTokenAttributionRepository.convertRoot()` | count or typed `AgentOrgTokenAttributionDataRejection`; other exceptions ordinary | type only approved claimant/identity/conflict data rejection inside transaction |
| `AgentOrgTokenAttributionTransition.execute(plans, blocked)` | `{ warnings, failures, changed }` or global-discovery throw | typed rejection -> warnings; every structural/operational/unknown root error -> failures; discovery throw remains fatal |
| flat-family coordinator disposition recording | disposition, item/root, reason | use distinct typed token-data warning versus fatal token dispositions |
| `result()` | migration execution result | warning-only terminal, fatal precedence, truthful counts/details |
| `TokenUsageRunStore.assertAgentOrgRecordsReady()` | exact Org/root IDs | preserve local rejection for incompatible token ownership |

## Existing Capability Reuse / New Structure Decision

No new subsystem or generic result framework is required. Reuse:

- existing `SUCCEEDED_WITH_WARNINGS` status and runner terminal skip;
- existing planner missing-tree warning collection;
- existing per-root SQL transaction and explicit data validation sites;
- existing transition root loop/global discovery throw;
- existing affected-Org readiness guard.

The new production representation is deliberately local: one typed token-data rejection in the repository module, separate transition warning/failure maps, and one coordinator warning disposition/count branch. Do not change shared `AppDataMigrationExecutionResult` or create a generic error taxonomy.

## Final File Responsibility Mapping

| File | Responsibility under `SR-011` |
| --- | --- |
| `src/run-history/services/root-run-package-readiness-index.ts` | preserved structural-only readiness (`IR-001`) |
| deleted `src/run-history/services/root-package-context-file-validation.ts` | remains deleted |
| `src/app-data-migrations/.../agent-org-history-candidate-plan.ts` | preserve `IR-003` exact missing-tree/no-plan warning |
| `src/app-data-migrations/.../agent-org-token-attribution-repository.ts` | add narrow typed data rejection at explicit claimant/identity/conflict checks; leave SQL/precondition/reread/unknown errors ordinary/fatal |
| `src/app-data-migrations/.../agent-org-token-attribution-transition.ts` | separate typed warnings from all other root failures; preserve global discovery throw |
| `src/app-data-migrations/.../agent-org-flat-team-families-v1-app-data-migration.ts` | block both maps; aggregate only typed warning plus missing-tree as nonfatal; retain fatal precedence/dependency closure |
| `src/token-usage/providers/token-usage-run-store.ts` | unchanged affected-Org guard |
| `src/context-files/services/context-file-owner-resolver.ts`; `src/api/rest/context-files.ts` | preserve exact `IR-002` behavior |
| flat-family migration tests | add typed data-warning/rollback/local-guard, root structural/SQL/concurrency/reread fatal controls and fatal precedence; preserve missing-tree and fatal controls |
| app-data migration runner tests | terminal skip with typed token-data warning; runner production unchanged |
| canonical AgentOrg/run-history docs | explain two warning categories, affected-root limitation, attempt-fatal precedence and no recurring scan |

## Concrete Examples

| Condition | Item outcome | Overall result when otherwise clean | Runtime consequence |
| --- | --- | --- | --- |
| Legacy Team root lacks required execution tree before plan | warning detail; not migrated | `SUCCEEDED_WITH_WARNINGS` | source unchanged; unrelated app normal |
| One Org/root attribution data is malformed/conflicting and repository throws typed data rejection; transaction rolls back | typed token-data warning; not token-migrated | `SUCCEEDED_WITH_WARNINGS` | affected Org restore rejects with existing readiness error; unrelated app normal |
| Root-ID/family/tree validation, SQL/query/update/precondition/reread or unknown per-root error | root fatal | `FAILED` | retry required; never enters warning map |
| Token root discovery/database access throws | attempt-fatal | `FAILED` | retry required; fatal dominates warnings |
| Paired history-index commit/reread fails | attempt-fatal | `FAILED` | retry required; global authority not established |
| Per-root runtime/locator/cleanup/dependency fault | unsupported fatal | `FAILED` | current behavior preserved pending separate approval |
| Valid candidate | migrated/skipped as today | `SUCCEEDED` if no warnings/fatal | normal operation |

## Backward-Compatibility Rejection Log

| Rejected mechanism | Reason |
| --- | --- |
| New corrective migration | Feature is unreleased; existing retryable migration owns the transition |
| Shared runner/status special case | Existing public status and terminal skip suffice |
| Generic source-warning framework | Broader than approved/evidenced categories |
| Cross-store preparation/transaction layer | Not needed for approved typed token-data consequence; would redesign conversion |
| Compatibility read for malformed token ownership | Would bypass explicit current readiness guard |
| Silent repair/delete of warning roots | Data mutation and new scope not approved |
| Background readiness audit/cache | Retains duplicate ownership and complexity |

## Change / Refactor Sequence

1. Preserve cumulative `IR-001`–`IR-003` source/tests/evidence and record a new implementation revision rather than overwrite history.
2. Add baseline/focused tests proving the current mixed failure map cannot distinguish data from structural/operational errors.
3. Add repository tests for each approved typed data rejection and controls proving SQL query/update, precondition change, reread mismatch and unknown errors are not typed.
4. Add transition tests proving typed rejection -> `warnings`, root-ID/family/tree/SQL/concurrency/reread/unknown -> `failures`, and global discovery -> throw.
5. Add coordinator tests proving both maps block completion, only warnings contribute nonfatal disposition, dependency propagation is fatal, and any fatal dominates mixed warnings.
6. Add end-to-end migration tests for warning-only rollback/detail/local guard/unrelated usability/terminal skip.
7. Run focused migration/runner/token tests, preserved readiness/context-file suites and server build.
8. API/E2E runs `P01` first on an isolated representative clone, then typed token-data warning/local-guard and fatal-precedence cases, then three terminal-stability launches.
9. Preserve user profile and clean only isolated fixtures/processes.

## Key Tradeoffs

- A typed token-data warning stops automatic retries and may leave that Org locally unavailable. This is intentional and user-approved: the application and unrelated roots remain usable, the limitation is explicit, and silent use is forbidden.
- Unsupported per-root conversion failures remain fatal even if the host process could listen. This conservative boundary avoids terminalizing effects whose consistency/usability is not evidenced or approved.
- No generic cross-store atomicity is added. The design uses the current transaction and local runtime guard rather than overcomplicating an unreleased outcome correction.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Typed token-data rejection accidentally treated as migrated | retain failed detail/count; explicit warning wording; readiness guard regression |
| Structural/operational root failure misclassified as data warning | typed repository error at exact checks; separate transition maps; fatal controls |
| Attempt-wide token failure misclassified as warning | preserve global discovery throw and outer fatal catch |
| Mixed warning/fatal becomes terminal | explicit `fatalFailedCount` dominance and regression |
| Earlier filesystem effects hidden | do not claim unchanged root; state affected Org locally unavailable; exact preservation inventory |
| Warning inference broadens later | dedicated dispositions only; unsupported categories remain fatal |
| Startup fix regresses | preserve zero-read suites and representative timing evidence |
| Attachment security regresses | preserve exact Team/Org `400`/`404`/unknown-error suites |

## Guidance For Implementation

- Implement the smallest owned delta across the token repository, token transition and flat-family coordinator.
- Preserve `IR-003` missing-tree behavior; do not revert or duplicate it.
- Add a migration-local typed data rejection only at explicit claimant/identity/conflict validation sites. Do not catch/wrap Prisma/SQL, precondition, reread or unknown errors as that type.
- Transition catches only the typed rejection into `warnings`; every other per-root error enters `failures`; global discovery still throws. Coordinator blocks both maps, warning-classifies only `warnings`, and retains fatal dependency propagation.
- Keep transaction semantics and `TokenUsageRunStore` readiness guard unchanged.
- Preserve `failedCount` and per-item reason. A warning status is not a migrated-item status.
- Do not reclassify `FAILED_RUNTIME`, `FAILED_HISTORY`, `FAILED_FAMILY_CONFLICT`, fatal per-root token failures or attempt-level `FAILED_TOKEN`.
- Do not use error-message parsing or absolute/relative path heuristics to determine scope.
- Use isolated database/filesystem fixtures; do not run the corrected transition on the live user profile during implementation.
- Require repeated architecture review before implementation resumes, then source review and API/E2E because cumulative risk remains High.
