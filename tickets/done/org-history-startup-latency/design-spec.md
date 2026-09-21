# Design spec — ORG-HISTORY-LATENCY-20260917-001

## Status and authority

`DS-REV-002`, Architecture Design Complete, `SR-004`, 2026-09-18. This supersedes frontend-only `DS-001` for the residual cold-start defect; it retains the already-integrated independent frontend family publication and its tests. Requirements SR-001 were explicitly approved SR-002 and remain unchanged in intent. The user's reopen/reproduce request is evidence that the delivered result did not meet that approved intent, not a new behavior request.

Workspace/base/target are authoritative in `bootstrap-handoff.md`. Evidence is authoritative in `investigation-notes.md`, especially E-007–010 and `validation/reopen-r1`. This design does not claim implementation or acceptance.

## Problem and completed root-cause assessment

The previous implementation removed a real frontend barrier: workspace and AgentOrg responses now publish their accepted slices/navigation projections independently. A warm browser against the latest-base Electron backend confirms that path: AgentOrg history appeared 35.4 ms after Team.

The residual cold-start delay is upstream. Before listening, `server-runtime.ts` completes a shared `RootRunPackageReadinessIndex.rebuild()`. On the first AgentOrg history read, `AgentOrgRunHistoryCatalogService.ensureInitialized()` unconditionally invokes `AgentOrgRunPackageCatalog.rebuild()` again. That second generation scans and strictly validates both Team and AgentOrg root packages. The exact packaged owner took 26.657 seconds on the real package population. Team history uses `TeamRunPackageCatalog.awaitReady()` and does not repeat the scan.

Root cause classification: **Local Implementation Defect / initialization asymmetry**. Refactor posture: **not needed**. The correct contract already exists; AgentOrg uses the wrong method. This is not a data, migration, schema, polling, frontend rendering or index-format defect.

## Approved behavior and production-path map

| Authority | Supported trigger and desired result | Target lifecycle |
|---|---|---|
| BEH-001, SCN-001, REQ-001, AC-001 | Cold app start with existing Agent/Team/AgentOrg history: each family becomes available without duplicate readiness or unrelated family/enrichment work. | server prerequisite readiness → listen → first mixed history read → AgentOrg catalog awaits existing generation → reads admitted Org trees/index → GraphQL response → existing independent frontend publication → sidebar. |
| BEH-002, SCN-002, REQ-002, AC-002 | Quiet/focused refresh retains family errors and newer-request ownership. | Existing frontend generation/error branches unchanged; server catalog remains initialized after first read. |
| REQ-003, AC-003 | Preserve strict admission, identities, rows, selection, status/reconnect behavior and durable content. | Readiness/index/tree owners unchanged; only repeated generation creation is removed. |

## Intended technical change

During first AgentOrg history catalog initialization, call the existing package catalog's `awaitReady()` operation instead of `rebuild()`.

`awaitReady()` is the correct two-state contract:

1. If startup (or another same-process owner) has completed the shared readiness generation, it returns without beginning a new scan.
2. If no generation exists, it lazily starts/awaits one, so isolated services and tests still receive strict package validation.

After readiness, preserve the existing AgentOrg catalog sequence: read the current persisted index; read each admitted AgentOrg tree; project rows; write the derived index; mark initialized. Preserve its existing queue so concurrent first reads still share one catalog initialization. Do not remove or bypass server startup readiness.

## Architecture spine and owners

1. `server-runtime.ts` remains readiness prerequisite owner and rebuilds once before HTTP listen.
2. `RootRunPackageReadinessIndex` remains the process-global generation owner keyed by resolved memory directory, including revision stabilization, diagnostics, strict Team/AgentOrg validation and lazy `awaitReady()` behavior.
3. `AgentOrgRunPackageCatalog` remains the AgentOrg-family facade; reuse its existing `awaitReady()` method.
4. `AgentOrgRunHistoryCatalogService` remains AgentOrg catalog/index projection owner; change only the readiness entry operation.
5. `CollaborationRootHistoryService` remains mixed read facade; it still reads each admitted Org execution tree and sorts results.
6. Existing GraphQL resolver and frontend `runHistoryLoadActions` remain unchanged. The frontend fix is necessary and preserved, but is no longer the residual-fix site.

There is no new module, cache, background job, endpoint, timer, timeout, migration or scheduling framework.

## Interfaces, identity and concurrency

- `AgentOrgRunPackageCatalog.awaitReady(): Promise<void>`: existing interface; exact replacement for forced `rebuild()` in first catalog initialization.
- `AgentOrgRunPackageCatalog.rebuild()`: remains available for explicit callers that actually own a new validation generation; it is not called by normal AgentOrg history initialization.
- `AgentOrgRunHistoryCatalogService.listRows()/initialize()`: signatures and return semantics unchanged.
- Root identities remain opaque `orgRunId` / `teamRunId`; no ID translation or ownership change.
- Existing catalog `withQueue()` continues to serialize concurrent initialization and mutations. Shared readiness's own `rebuildPromise`/mutation revision logic remains authoritative.
- A readiness error must still reject initialization/query; do not convert it to empty history or fall back to unvalidated index rows.

## Off-spine and preserved concerns

| Concern | Decision |
|---|---|
| Strict package admission/diagnostics | Preserve exactly; reuse the completed/lazily-created generation, never bypass it. |
| AgentOrg derived index write | Preserve existing post-read write and queue; no index-only redesign. |
| Active AgentOrg snapshots | Preserve `CollaborationRootHistoryService` active-manager preference and inactive tree reads. |
| Frontend independent publication | Preserve current source/tests; do not revert or add a timeout/poll workaround. |
| Startup app-data migration | No change; the unrelated failed migration warning is not this defect. |
| User data | Read only in validation copies/isolated runtime; no repair/reset/backfill. |
| Logging/telemetry | No new persistent logging. Validation may use metadata-only timings. |

## File responsibilities and expected delta

| Path | Expected change |
|---|---|
| `autobyteus-server-ts/src/run-history/services/agent-org-run-history-catalog-service.ts` | Replace forced package `rebuild()` with `awaitReady()` during first initialization. No other catalog sequencing change. |
| `autobyteus-server-ts/tests/unit/run-history/services/agent-org-run-history-catalog-service.test.ts` | Update the package-catalog double and add durable regression: first initialization awaits readiness exactly once, never forces rebuild, reads admitted Org rows, preserves summary/index sequencing. |
| `autobyteus-server-ts/tests/unit/run-history/services/collaboration-root-history-readiness.test.ts` or nearest existing readiness integration test | Extend only if needed to prove lazy strict readiness still occurs when no startup generation exists and mixed first read retains both Team and Org. Prefer existing test rather than a new overlapping suite. |
| Existing frontend production/tests | No production change expected; rerun focused preservation coverage. If a frontend edit becomes necessary, classify Design Impact rather than silently broadening this design. |

Docs may be synchronized downstream to record readiness-generation reuse. Historical ticket evidence/artifacts remain preserved and receive cumulative revision records; do not rewrite prior IR/API/Delivery claims as if they covered this change.

## Clean-cut and compatibility decisions

- Clean cut: normal AgentOrg catalog initialization switches from `rebuild()` to `awaitReady()`; no compatibility fallback that sometimes repeats both.
- Keep explicit `rebuild()` on the catalog facade because other explicit generation owners may use it; this ticket does not prove it globally dead.
- No schema, persisted representation, transport, GraphQL, frontend DTO or API compatibility change.
- Persisted data outcome: **Directly Usable — No Migration**. Existing readiness state is in-memory and reconstructed each process start; AgentOrg history index/tree files remain current and unchanged.
- Unacceptable workaround: arbitrary frontend sleep, extra refresh, hiding loading, returning unvalidated rows, caching across processes, skipping failed diagnostics, or prewarming via a duplicate request.

## Change sequence

1. Add a failing unit regression that gives the injected package catalog distinguishable `awaitReady` and `rebuild` spies; current source must fail because it calls `rebuild`.
2. Change AgentOrg catalog initialization to await the existing readiness contract.
3. Prove initialized-generation reuse and no-generation lazy validation; retain existing summary, restore, first mixed history and strict readiness tests.
4. Run focused server tests and build. Rerun relevant frontend history publication tests unchanged as preservation, not because the fix is frontend-owned.
5. API/E2E starts an isolated server/process with process-global readiness/catalog state reset, a representative high-enough package population or deterministic delayed readiness double, and observes the **first** browser history load. A warm second read alone is insufficient.

## Verification design

### Durable source/owner checks

- First AgentOrg `listRows()` calls injected `awaitReady` once and `rebuild` zero times.
- Concurrent first reads share the existing catalog queue and do not create repeated readiness operations.
- With no initialized root readiness state, real `awaitReady()` performs one strict generation and admitted Team/Org history remains available.
- A readiness failure rejects; it is not converted to an empty successful history.
- Derived index/tree projection, restore/summary sequencing and deletion exclusion behavior remain unchanged.

### Browser/API acceptance

- Fresh isolated process, not a prewarmed catalog.
- Record server listen, first `ListWorkspaceRunHistory` completion, first `ListCollaborationRootHistory` completion, and first visible Team/AgentOrg sidebar rows.
- Use the normal frontend pointed at that server, expand the representative workspace through ordinary UI, and verify names/counts/selection.
- Demonstrate no second full readiness generation begins on the first AgentOrg history read. Prefer an explicit spy/counter/test seam in test code or bounded metadata; do not infer only from wall-clock speed.
- Preserve previous family-deferred/error/generation frontend checks and no activation/inference-on-listing evidence.
- Real-profile warm observation E-008 is diagnostic only; the reopened acceptance requires cold first-read evidence.

No universal millisecond SLA is introduced. Success means removal of the duplicate readiness generation and immediate publication after the actual family response under the approved event-order contract.

## Design health, task size and risk

- `task_size`: **Small**. One production method call in an existing owner, focused tests, and cumulative docs/evidence. Historical package size does not change implementation size.
- `architectural_risk`: **Low**. Reuses the exact readiness contract already used by Team history and the same shared state already built before listen; no public interface, storage, runtime lifecycle, security or deployment change.
- Architecture review: not required under the Small/Low direct route unless implementation exposes a need to change readiness state ownership, startup ordering, package admission, persisted indexes or frontend/runtime contracts.
- Escalation trigger: any need to skip validation, persist readiness across process boundaries, redesign index/tree reads, alter migration/startup gates, change mixed GraphQL schema, or modify family-generation/error authority is Design Impact and must return to Solution Designer.

## Tradeoffs and residual risk

The first AgentOrg catalog still reads admitted Org trees and rewrites its derived index; this bounded work is required by current correctness and is not removed. The design eliminates only the redundant full Team+Org readiness generation. A very large number of admitted Org trees could retain measurable cost; if observed after implementation, report it with timings rather than broaden this ticket into an index-only redesign. The user's exact Electron cold start should be functionally retested before finalization because prior small-fixture/warm validation missed this boundary.
