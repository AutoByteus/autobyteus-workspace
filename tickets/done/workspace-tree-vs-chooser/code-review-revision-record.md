# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review / IR-001 (Full Review) | N/A | Fail (9.3/10): Local Fix → Implementation | CR-001, CR-002, CR-003 |
| CRR-002 | `code-review-report.md` | Implementation Review / IR-002 (Targeted Delta Review) | Fail (CRR-001) | Pass (9.4/10) | CR-001, CR-002, CR-003 resolved |
| CRR-003 | `api-e2e-test-review-report.md` | API/E2E Test-Code Review / API-REV-001 Pass | Pass (CRR-002, source) | Pass | None |

## Revision Entries

### CRR-001 — A removed folder with a stopped Org run stays in the Workspaces view

- Canonical review report updated: `code-review-report.md` (new)
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001); SCN-D2; AC-002
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-001 (`a5fc23849e`, `0d3c31c4ae`)
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail` (9.3/10; Runtime Correctness 8.9)
- What changed in the review result and why: the read window, the view rules, the patch rebuild, the Runs view, last activity and the chooser Remove match DS-001…DS-007. The finding is that Org history creates a history-only folder node for a root with no registered folder, which `hasListedRun` keeps, so a removed folder with a stopped Org run stays in the left panel (AC-002). Agent and Team runs of a removed folder leave. Reproduced with a temporary spec (reverted). Two minor cleanups: a stale owner name in a comment, and a dead mock in a touched spec.
- Supported product scenario / material-premise basis changes: SCN-D2 promoted (removal of a folder whose runs are stopped but not archived; the guard allows it). C-05 (poll cost) held for API/E2E's budget.

#### Prior Finding Resolution

None

- New or remaining finding IDs: CR-001, CR-002, CR-003
- Material score or classification changes: N/A (first result). Large/High is confirmed.
- Recommended recipient: Implementation Engineer
- Remaining risks or uncertainty:
  - The uncapped poll's cost is not yet measured (API/E2E).
  - Whether an Org run's folder can be unregistered by anything but Remove was not established. CR-001 tells implementation to return a `Design Impact` if it can.

### CRR-002 — Org runs join only registered folders; Pass

- Canonical review report updated: `code-review-report.md` (Round 2; Review Round Meta; Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. `git diff c20d13fa02 71ce23ced8` stays within the findings' files and behavior
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002); CR-001…CR-003
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-002 (`71ce23ced8`)
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-001 `Fail`
- Current authoritative result: `Pass` (9.4/10)
- What changed in the review result and why: `projectWorkspaceHistoryByWorkspace` no longer creates history-only nodes, so a removed folder leaves the Workspaces view whatever runs it has. The tests cover each kind and the rebuild, and IMP-08 shows red/green. The "No workspace" bucket it fed is removed cleanly. Those runs stay in the store and the Runs view.
- Supported product scenario / material-premise basis changes: C-09 rejected (no requirement to list folder-less Org runs in the Workspaces view; they stay reachable).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002 | Diff; `runHistoryListedFolders.spec.ts` new cases; `evidence/implementation/IMP-08-cr001-red-green.log` (3 failed → 12 passed); `agent-org-run-service.ts:142-143` |
| CR-002 | Open (Local Fix) | Resolved | IR-002 | `runListStore.ts:14` |
| CR-003 | Open (Local Fix) | Resolved | IR-002 | The regressions spec mock is removed |

- New or remaining finding IDs: None
- Material score or classification changes: Fail → Pass, 9.3 → 9.4. Large/High stays.
- Recommended recipient: API/E2E Engineer; informational to the Implementation Engineer
- Remaining risks or uncertainty:
  - The 250 ms budget for the uncapped poll is unmeasured (C-05, API/E2E).
  - Org runs without a root folder now show only in the Runs view.

### CRR-003 — Test review of API/E2E round 1: Pass

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E Test-Code Review, round 1
- Review scope: `N/A` (proportional test review of `25769bc969` and `450fe43929`)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-001 `Pass`, 93%); API-02…API-08, API-10
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-002 `Pass` (source); no prior test review
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The new read-budget probe measures the app's own poll queries, per build, against the design's budget, and checks the read's content.
  - The WVC cases enter through real triggers and assert what the user sees plus server and disk state (the window on the wire, the toasts, the registry, the files, history per run kind).
  - PLN-08's stale expectation was replaced. The baseline fixes follow current code.
  - Non-blocking notes: fixed waits for absence, WVC-003's whole-stack counts, and the budget delta applying in every view.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None

- New or remaining finding IDs: None
- Material score or classification changes: N/A. Large/High stays.
- Recommended recipient: Delivery Engineer
- Remaining risks or uncertainty:
  - API-09 is Not Tested.
  - The budget was measured at a load average of about 70.
  - FU-001…FU-005.
