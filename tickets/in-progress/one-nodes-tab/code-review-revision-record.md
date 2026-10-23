# Code Review Revision Record — one-nodes-tab

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record indexes the completed review results.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail — Local Fix (implementation) | CR-001, CR-002, CR-003, CR-004 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002), Targeted Delta Review | Fail | Pass | CR-001, CR-002, CR-003, CR-004 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 3 (API-REV-001, NP-07) | Pass | Fail — implementation defect (Local Fix) | CR-005 |
| CRR-004 | `code-review-report.md` | Implementation Review, round 4 (IR-003), Targeted Delta Review | Fail | Pass | CR-005 (resolved) |
| CRR-005 | `api-e2e-test-review-report.md` | Proportional test-code review, round 1 (API-REV-002) | Pass (CRR-004, source) | Fail — Local Fix (API/E2E) | TR-001, TR-002 |

## Revision Entries

### CRR-001 — Initial source review of IR-001

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: `SR-006`, `SR-007`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `N/A`
- Current authoritative result: `Fail`, Local Fix owned by implementation; score 8.9/10.
- What changed in the review result and why: first result. The behavior paths, server boundaries and persisted-data decision hold. Four bounded findings:
  - CR-003: `nodeListStore` ↔ `nodeChangeDialogStore` cycle, and the partial result is not where the design places it;
  - CR-001: dead `loaded`/`loadError`;
  - CR-002: Change address probes twice after A1;
  - CR-004: the baseline-fix commit carries the ticket's removals.
- Supported product scenario / material-premise basis changes: none. A1–A4 accepted (A1 required by AC-707/TR-711); design § Run Rules `changeAddress` row to reconcile at docs sync.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002, CR-003, CR-004
- Material score or classification changes: N/A (first result)
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: Electron shell, Docker node, and server integration/E2E not yet exercised (API/E2E stage).

### CRR-002 — Delta review of the CRR-001 fixes (IR-002)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. The delta `780e846d4a..23f3feb193` stays within the prior findings' files (web stores, connector, a new wiring file, three components, specs). No server, Electron, shared-interface or data-shape change. The rebuilt `e16d848e0f` has the same tree as `5fc0ad389a`.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002); CR-001…CR-004
- Relevant solution revision IDs: `SR-006`, `SR-007`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-001`, `IR-002`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Fail` (CRR-001)
- Current authoritative result: `Pass`, 9.3/10, every category ≥ 9.0
- What changed in the review result and why: all four findings are verified resolved in the code and the history (below). Unaffected checks carry forward from CRR-001: server, Electron, persisted data and the behavior trace.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-003 | Open (Medium) | Resolved | IR-002, `23f3feb193` | No store imports `nodeChangeDialogStore` (grep); the dialog store → `nodeListStore` one way; `nodeListStore` holds `unfinished` + `setUnfinishedStep`/`unfinishedStepOf`/`changeSubjectOf` and runs rename/change address via the connector; connector wiring in `services/nodeCollaboration/windowNodeCollaborationConnector.ts`; `addNode` returns `confirm`, `AddNodePanel` opens the dialog; `NodeList` cancels on unmount |
| CR-001 | Open (Low) | Resolved | IR-002 | `loaded`/`loadError` removed; `load()` throws and keeps the last list; `open` catches it; the connector's `loadPeers` failure goes to `request`'s catch (row re-asked) or `runWithoutConfirmation`'s failure |
| CR-002 | Open (Low) | Resolved | IR-002 | `planChangeAddress` → `[changeAddressHere(address)]`; `resolve` no longer branches on `changeAddress`; the spec asserts no `resolveAddress` call and that a refusal keeps `address`/`loopbackInContainer` |
| CR-004 | Open (Low) | Resolved | IR-002 | `9457972953` = 1 file (`project-task-index-status.test.ts`); `e16d848e0f` tree equals `5fc0ad389a` (removals included) |

- New or remaining finding IDs: none
- Material score or classification changes: 8.9 → 9.3; Ownership 8.3 → 9.2; Cleanup 8.6 → 9.3; API/E2E Readiness 8.8 → 9.3
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (an informational notice to implementation)
- Remaining risks or uncertainty: the Electron shell, a Docker node (AC-704/707) and the server integration/E2E suites are not yet exercised. Docs sync should update the design's § Run Rules `changeAddress` row.

### CRR-003 — Failure origin of API-07 / NP-07

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`; API-07 / NP-07
- Relevant solution revision IDs: `SR-006`, `SR-007`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Pass` (CRR-002)
- Current authoritative result: `Fail`, origin implementation defect, CR-005 (Local Fix, implementation)
- What changed in the review result and why: the row's "not finished" line drops the failed step's `name`, so `PEER_NAME_TAKEN` reads "mu already has a node named ." (`nodeRowStatus.ts:144`, `NodeRow.vue:172`, `nodeConnectionErrorText.ts:67`). The dialog and details pass the name and are correct. This was a source-review gap; it was detectable in round 1.
- Supported product scenario / material-premise basis changes: none. The name race is the design's explicit edge (§ Naming Rule 4).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001…CR-004 | Resolved | Resolved | CRR-002 | unchanged |

- New or remaining finding IDs: CR-005
- Material score or classification changes: Runtime Correctness 9.2 → 8.8 until CR-005 is fixed
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: none beyond CRR-002's.

### CRR-004 — Delta review of the CR-005 fix (IR-003)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/code-review-report.md`
- Review entry point and round: Implementation Review, round 4
- Review scope: `Targeted Delta Review`. `71fd1a5235..02fd7bcd9a` touches only `nodeRowStatus.ts`, `NodeRow.vue` and their specs.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-003); CR-005
- Relevant solution revision IDs: `SR-006`, `SR-007`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-003`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Fail` (CRR-003)
- Current authoritative result: `Pass`, 9.3/10
- What changed in the review result and why: CR-005 is fixed at the line's source. The partial line carries the failed step's name, and the row passes it to `failureText`. Specs cover VIS-015 with `PEER_NAME_TAKEN`.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-005 | Open (Low) | Resolved | IR-003, `02fd7bcd9a` | `nodeRowStatus.ts` `lineOf` adds `stepName`; `NodeRow.vue:172` passes `name: line.stepName`; new specs in `NodeRow.spec.ts` and `nodeRowStatus.spec.ts`; IMP-12 4736 passed, IMP-13 guards pass |

- New or remaining finding IDs: none
- Material score or classification changes: Runtime Correctness 8.8 → 9.2
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (an informational notice to implementation)
- Remaining risks or uncertainty: none beyond CRR-002's. Rerun the web suite and API-07.

### CRR-005 — Proportional review of the durable API/E2E probes

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review): `remote-nodes-page-probe.mjs` (replaced), `nodes-docker-address-probe.mjs` (added), `package.json` script
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002, Pass)
- Relevant solution revision IDs: `SR-006`, `SR-007`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-003`
- Relevant API/E2E revision IDs: `API-REV-001`, `API-REV-002`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: source review `Pass` (CRR-004); no prior test review
- Current authoritative result: `Fail`, two Low test-code Local Fixes in `nodes-docker-address-probe.mjs`
- What changed in the review result and why:
  - TR-001: ND-05's name assertion is bypassed by operator precedence.
  - TR-002: ND-02's gateway precondition failed silently in run 1 (`timeout`) and is not asserted, so the comment's "visibly changes it back" is not what the test proves.
  - The page probe has no findings.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None (first test review). CR-001…CR-005 remain resolved.

- New or remaining finding IDs: TR-001, TR-002
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: none for the product; rerun API-08 after the fix.
