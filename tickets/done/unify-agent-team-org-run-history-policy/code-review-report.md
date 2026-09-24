# Code Review Report — unified collaboration run-history catalog

## Review Round Meta

- Review Entry Point: `Implementation Review`; round 3; current revision `CRR-003`.
- Trigger: `/implementation_engineer` IR-002 source rework at `49ce0d173` (handoff `ba28b4bb7`) after API-REV-001 F-001 and CRR-002 CR-001. IR-001 and CRR-001 are historical; CRR-002 Fail is the prior authoritative review result.
- Requirements: `requirements-doc.md` (approved SR-002); investigation: `investigation-notes.md`; solution history: `solution-revision-record.md`; current design: `design-spec.md` (SR-005, no intended-behavior change).
- Design review: `design-review-report.md` (ARCH-REV-003 Pass on SR-005; DR-001 remains resolved); architecture history: `architecture-review-revision-record.md`.
- Implementation: `implementation-handoff.md`, `implementation-revision-record.md` (IR-002). Behavior-defining supplements: `N/A — not applicable`.
- Coverage investigation: `api-e2e-coverage-investigation.md`; execution report: `api-e2e-execution-coverage-report.md`; ledger: `api-e2e-test-case-ledger.md`; API/E2E revision: `api-e2e-revision-record.md` (API-REV-001). Delivery revision: N/A. Failure evidence: `/tmp/api-e2e-unified-history/l03.log`, `l03-diagnostic.log`, `l03-probe.mjs`.
- Canonical report: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/code-review-report.md`.
- Revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/code-review-revision-record.md`.
- Prior review rounds: CRR-001 (source Pass), CRR-002 (API/E2E failure-origin Fail — Design Impact); latest authoritative round: 3.

## Routing Classification Review

- Task size: `Medium`; architectural risk: `High`; selected route: independent implementation-source review before API/E2E. Classification remains confirmed. This round rechecks CR-001 and the IR-002 delta, retaining round-1 evidence only where unchanged.

## Review Scope And Evidence

- Rechecked the cumulative approved package, the CRR-002 failure and the six-file source/test delta in `b68847a8c..49ce0d173`. Traced the supported imported Memory Team-list and Team-run-list path from web/store and GraphQL source resolution to the explorer, admitted root read, tree-scoped location projection, memory files and returned cards. Examined the affected tests and compared the new projection with the pre-existing general location API. Unchanged run-history core, manager, strict-store, repair and migration checks retain CRR-001/API-REV-001 evidence; no new source change touches those paths.
- Independent focused checks: two affected unit files passed (7 tests); `tsc -p tsconfig.build.json --noEmit --pretty false` passed; `git diff --check b68847a8c..49ce0d173` passed. The test primes readiness, instruments each separate request, checks two reads for two admitted roots, compares real SHA-256 hashes of all fixture files and exercises nested/configured/task-path parity against the old API without an additional read.
- This source pass does not claim a fresh API/E2E result. API-REV-001 remains Fail until rerun on the reviewed correction. The Org root memory source exists only on the separate unmerged memory branch; its integration remains conditional N/A in this worktree.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved basis: index-authoritative admitted rows, no read-time writes/tree projection, explicit lifecycle row updates, direct use of existing current arrays, and explicit local offline repair; Team/Org missing and corrupt-index policy is approved. ARCH-REV-002's PM-001 is the supported concurrent workspace archive/message-restore path, not a hypothetical race.
- Behavior basis status: `Confirmed` under SR-005. The unqualified AC-003 applies to the present Team imported-Memory path; only the absent Org adapter is conditional on its branch merge. SR-005 and ARCH-REV-003 corrected the design-route gap identified in CRR-002 without changing approved intent.

| Behavior | Status | Implemented production path and lifecycle evidence |
| --- | --- | --- |
| BEH-001 | Confirmed | Mixed history → family `listCatalogRows` → `CollaborationRunHistoryCatalogCore` → strict index read and readiness admission; the Org first-read tree scan/index rewrite and Team tolerant normal read are removed. |
| BEH-002 | Confirmed | Create/restore publishes package before family row event; event writes use family queue. Team and Org archive/delete take queue → exact-root manager inactive lane → tree/index transaction, readback and compensation; Team archive/unarchive now checks managed state inside the lane. |
| BEH-003 | Confirmed in current Team source | Both Team list methods use the catalog owner and read each admitted root once; the already-read tree is passed through tree-scoped member-location projection, preserving paths and cards. Org owner query is read-only, but its separate memory-source adapter has not merged; conditional change is N/A, not silently credited. |
| BEH-004 | Confirmed | Missing index reads empty; strict parse failure propagates without overwrite; tree-only roots stay unlisted. Offline repair projects only admitted missing IDs after strict index reads and is unreachable from startup, GraphQL and explorer code. |

## Supported Product Scenario And Reachability Gate

| Scenario / premise | Kind, independent trigger and goal | Forward path / lifecycle / consequence | Evidence and validity | Use |
| --- | --- | --- | --- | --- |
| SCN-001 | User opens workspace collaboration history to see retained runs | Workspace history → mixed history → family catalogs → admitted rows → visible detail trees | Requirements BEH-001, REQ-001/005; code; `Supported Normal Scenario` | Use |
| SCN-002 / PM-001 | User manages a stopped Team from workspace history while another message submission restores it; AC-002 expressly requires serialized lifecycle writes | Archive/unarchive → history catalog queue → manager lane; restore → same manager lane → row event after lane release. A stale outside-lane check would archive a managed run. | Requirements BEH-002/AC-002; ARCH-REV-002 PM-001; UI/GraphQL path in design review; `Supported Normal Scenario` | Use |
| SCN-003 | User inspects an imported memory folder | Explorer → family source → catalog rows and one-root tree read; must not mutate imported files | Requirements BEH-003/REQ-005; `Supported Explicit Edge Scenario` | Use, conditional Org adapter N/A |
| SCN-004 | Operator explicitly repairs an exceptional missing local row/index | Offline CLI → owned profile → strict index/readiness → missing-root projection → dry-run or backed-up write/readback | Approved DEC-001–003; `Supported Explicit Edge Scenario` | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Independent basis and forward consequence | Evidence | Disposition / response |
| --- | --- | --- | --- | --- |
| C-01 | The offline repair applies Team before Org, so a hypothetical later Org failure could leave a prior Team repair complete. | SCN-004 authorizes a per-family offline operation, not a cross-family atomic transaction. A specific combined exceptional failure would need independent evidence before it could require new cross-family machinery. | SR-004 Explicit repair design expressly permits per-family verification and no all-or-nothing claim; code reports backup on a write/readback failure. | Reject as a source finding; no score deduction or new machinery. |
| C-02 | The conditional Org memory source is absent on this branch. | SCN-003 is approved, but design explicitly defers that adapter to the separate branch merge. | SR-005 file map/sequence; current branch inventory. | Reject as a defect in this worktree; retain merge obligation. |

For the historical CRR-001 source review, no new material premise was promoted. AR-P/PM-001 remains supported and is addressed by the implementation.

### CRR-002 failure-origin candidate gate and CRR-003 resolution

| Candidate | Observation | Independent trigger, forward path and consequence | Evidence | Disposition / response |
| --- | --- | --- | --- | --- |
| C-03 | The IR-001 Team memory explorer read each root tree once, then rescanned all roots for every root's member targets. | SCN-003: a user selects an imported Memory source and opens Agent Teams or Team runs. The old resolver → explorer → builder → unscoped location lookup yielded 12 post-readiness reads for 3 roots (N+N²), violating AC-003. | Approved REQ-005/AC-003 and SCN-003; API-REV-001 L-03 and old source. SR-005/ARCH-REV-003 make the present Team correction mandatory. | **Promoted in CRR-002; resolved in CRR-003.** Current explorer passes each already-read tree to `buildFromTree` → `listTeamMemberLocationsFromTree` → pure `listAgentsInTree`; no per-root unscoped lookup remains. |

The L-03 probe's `allFileBytesUnchanged` field was hard-coded `true`; it did not prove byte identity. The IR-002 test instead compares actual SHA-256 hashes before and after both list requests. This is source-review evidence; independent API/E2E revalidation remains required. No new material candidate is promoted in CRR-003.

## Structural / Design Checks

Unchanged row-policy and lifecycle checks retain CRR-001 evidence; the affected Memory-path check is revalidated against SR-005 and IR-002.

| Check | Result | Evidence / action |
| --- | --- | --- |
| Task design health and supplement alignment | Pass | The shared-catalog refactor retains SR-004 ownership, and the current Team Memory correction matches SR-005; no behavior supplement. |
| Spine inventory and ownership | Pass | DS-001–006 trace to family catalogs, shared core, manager lanes and offline repair without a generic mixed-subject API. |
| Off-spine concerns and existing-subsystem reuse | Pass | Core remains in run-history services; specialized tree projectors, readiness and stores remain with their owners. |
| Reusable structure and model tightness | Pass | Generic core requires only `summary`, `createdAt` and `idOf`; persisted Team/Org row types stay distinct. |
| Repeated coordination and empty indirection | Pass | One family-keyed state/queue owner; family catalogs retain real subject transaction duties. |
| Separation, dependency direction and Authoritative Boundary Rule | Pass | Mixed history calls catalogs, not index stores; core has no manager/tree dependency. Repair is offline and not a runtime fallback. |
| File responsibility, placement, layout and naming | Pass | Core, family catalogs, stores and maintenance path have distinct concerns. The existing flat run-history/services layout is justified. |
| API/query/command boundaries | Pass | Team and Org identities remain explicit; no public GraphQL schema change; queue → lane acquisition is internal to family mutations. |
| Duplication, patch complexity and cleanup | Pass | Org read-time reconciliation, pre-create `initialize`, runtime summary writer use and unused Team diagnostic adapter are removed; migration-only writer stays. |
| Tests and API/E2E readiness | Pass for source handoff | The affected seven tests and typecheck pass; current Team-list and Team-run-list checks assert the exact per-request tree-read bound, real file hashes and location parity. API/E2E still owns independent built/GraphQL revalidation. |

## Source File Size And Structure Audit

Changed implementation source remains below the 500 effective non-empty-line limit. IR-002 changes only four existing source files, each with a small focused delta (14, 8, 6 and 5 inserted/modified lines in the commit); none reaches the 220 changed-line signal. The affected location/explorer classes retain distinct projection, memory-target and orchestration responsibilities. CRR-001's larger-file audit remains valid for unchanged source. Generated distributions are not source changes.

## Legacy / Backward-Compatibility And Persisted-Data Verdict

| Check | Result | Evidence |
| --- | --- | --- |
| No runtime old-behavior alias, fallback or dual read/write | Pass | Org `initialize`/`listRows` removed; Team normal reads use strict index; no query-time reconciliation. |
| Obsolete paths removed; migration-owned history retained | Pass | Unused Team diagnostic service/test removed; historical Org summary writer and index transition remain migration-scoped. |
| Approved transition followed | Pass | `Directly Usable — No Migration`: current eight-field arrays are read by existing strict stores; representative existing-index tests preserve row facts and bytes on queries. |
| Migration/cache continuity | Pass | Direct Org-family transition invalidates both family cache views after strict paired writes. |

Dead/obsolete items requiring removal: none identified after the planned removals. Docs impact: Yes — offline repair usage is documented in `scripts/repair-collaboration-run-history-index.md`; delivery should verify run-history operational documentation remains synchronized.

## Additional Material Premise Validation

ARCH-REV-002 PM-001: **Confirmed addressed.** Team archive/unarchive now enter `withInactiveHistoryMutation` from inside the core queue. The manager checks `hasManagedTeamRun` under the same exact-root transition lane used by restore, and the lane encloses tree/index commit or compensation. Deterministic Restore-first and archive/unarchive-first integration tests exercise the supported interleaving. No new premise requires reclassification.

## Review Scorecard

- Round-3 source overall: **9.3/10 (93/100)**. The category average is descriptive, not the decision rule. The CRR-002 failure had no score; CR-001 is resolved for source review but still requires API/E2E confirmation.

| Priority | Category | Score | Why / weakness or drag | Improvement |
| --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | All six spines have clear start, owner and effect; no material gap. | None required. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Core owns row state, family catalogs own transactions, manager owns active gate; no material gap. | None required. |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Family identities and strict owner queries are explicit; no material gap. | None required. |
| 4 | Separation of Concerns and File Placement | 9.3 | Repair is outside runtime, specialized projectors stay specialized; existing flat service folder is dense but justified. | None required in scope. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | Core has a tight row constraint and no second persisted representation; no material gap. | None required. |
| 6 | Naming Quality and Local Readability | 9.2 | Names are precise; Team catalog's multi-file compensation is necessarily intricate. | Keep transaction assertions focused in later validation. |
| 7 | API/E2E Readiness | 9.2 | Current Team direct-service regression covers both list methods and imported files, but API-REV-001 remains failed until independent rerun; conditional Org merged-source coverage remains downstream. | Rerun built/GraphQL imported-source checks at the next stage. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 | The same-snapshot projection removes the N+N² path while preserving location semantics in focused tests; broader executable verification remains downstream. | Revalidate L-03 on a copied imported profile. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | Old runtime aliases/reconciliation removed; historical migration writer correctly retained. | None required. |
| 10 | Cleanup Completeness | 9.4 | Obsolete diagnostic adapter and unused paths removed; no material gap. | None required. |

## Findings

### CR-001 — Resolved for source review: current Team imported-Memory read bound

- Prior basis: C-03 / SCN-003 / REQ-005 / AC-003. CRR-002 correctly attributed the measured 12/3 reads to the pre-existing unscoped Team member-location lookup and routed the SR-004 gap upstream.
- Upstream resolution: SR-005 preserves unqualified AC-003 and makes the current Team path mandatory; ARCH-REV-003 passed that revised design. No requirement narrowing or new product behavior was introduced.
- Source resolution: `TeamMemoryExplorerService.buildGroups()` now reads each admitted root once and passes the exact validated snapshot to `TeamMemoryMemberTargetBuilder.buildFromTree`, `AgentMemoryLocationService.listTeamMemberLocationsFromTree`, and `TeamRunExecutionTreeLocationService.listAgentsInTree`. The latter reuses the existing `TeamExecutionIndex`/physical-path projection without store or manager I/O. The root-ID check prevents cross-root input; nested/configured/task-path parity and both list requests are tested. The old all-roots API remains for independent callers but is no longer on this per-root Memory path.
- Status: **Resolved for independent source review; API-REV-001 F-001 remains open until API/E2E rerun.** No new source finding is substantiated.

## Classification And Recommended Recipient

- Latest source-review decision: `Pass`; recommended primary recipient: `/api_e2e_engineer` for independent rerun. Informational pass recipient: `/implementation_engineer`, after the primary handoff succeeds.
- F-001 origin and CRR-001 review gap remain accurately recorded in CRR-002. SR-005/ARCH-REV-003 corrected the route, and IR-002 removes the observed N+N² source path; neither the failed API-REV-001 nor its two durable E2E harness edits are treated as successfully validated or proportionally reviewed yet.

## Residual Risks

- API-REV-001's prior focused repository, built GraphQL, strict-query and isolated repair checks were otherwise passing, but the prior final result remains Fail. The corrected Team imported path requires a fresh independent API/E2E run, including real hashes and per-request tree-read instrumentation; untested two-instance or compensation edges remain downstream validation concerns, not new findings here.
- The separate memory branch needs its Org source switched to the now-read-only catalog owner when merged; no current-branch file exists to edit here.
- Repair cannot reconstruct missing index-only summary/termination facts, as approved and documented.

## Latest Authoritative Result

- Review Decision: `Pass`; entry point: `Implementation Review` IR-002; task size/risk: `Medium`/`High`.
- Supported Product Scenario Gate: `Pass` (SCN-003); Material-Premise Gate: `Pass` (C-03 prior finding resolved by current source and focused tests; no new promoted candidate).
- Score Summary: 9.3/10 source scorecard; no new finding. This does not convert API-REV-001 Fail to Pass.
- Prior Finding Resolution: CR-001's design route is corrected at SR-005/ARCH-REV-003 and its current Team source path is corrected at `49ce0d173`; independent executable confirmation is pending.
- Recommended Recipient: `/api_e2e_engineer` primary to rerun affected and broader validation; `/implementation_engineer` informational after successful primary handoff. Conditional Org adapter remains N/A until its branch merges.
