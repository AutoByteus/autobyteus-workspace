# Code Review Revision Record

The latest `code-review-report.md` or `api-e2e-test-review-report.md` is authoritative for its current result. This record keeps the initial baseline and each later review delta.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `tickets/in-progress/cross-scope-agent-mentions/code-review-report.md` | Implementation Review / IR-001 initial handoff (`a7b4ae621`) | N/A | Fail (Local Fix) | CR-001 |
| CRR-002 | `tickets/in-progress/cross-scope-agent-mentions/code-review-report.md` | Implementation Review round 2 / IR-002 (`c8cd16a2b`) | Fail (Local Fix) | Fail (Local Fix) | CR-001 (resolved), CR-002 (new) |
| CRR-003 | `tickets/in-progress/cross-scope-agent-mentions/code-review-report.md` | Implementation Review round 3 / IR-003 (`5dcc5dc82`) | Fail (Local Fix) | Pass | CR-002 (resolved) |
| CRR-004 | `tickets/in-progress/cross-scope-agent-mentions/code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 failure | Pass | Fail (Design Impact + Local Fix) | CR-003, CR-004, DI-001 (new) |
| CRR-005 | `tickets/in-progress/cross-scope-agent-mentions/code-review-report.md` | Implementation Review round 5 / IR-004 (`bcff48200`, SR-010) | Fail (Design Impact + Local Fix) | Pass | CR-003, CR-004, DI-001 (resolved) |
| CRR-006 | `tickets/in-progress/cross-scope-agent-mentions/api-e2e-test-review-report.md` | Proportional API/E2E test-code review / API-REV-002 pass | N/A (first test review) | Fail (Local Fix) | TR-001 |
| CRR-007 | `tickets/in-progress/cross-scope-agent-mentions/api-e2e-test-review-report.md` | Proportional test-code re-review / API-REV-003 (TR-001 fix) | Fail (Local Fix) | Pass | TR-001 (resolved) |
| CRR-008 | `tickets/in-progress/cross-scope-agent-mentions/api-e2e-test-review-report.md` | Evidence addendum / API-REV-004 (real Electron journeys) | Pass | Pass (no durable test change) | — (OBS-D3 held) |

## Revision Entries

### CRR-001 — Initial implementation review: strong baseline; one delete-under-live-Agent-root gap

- Canonical review report updated: `code-review-report.md` (created).
- Review entry point and round: Implementation Review, round 1.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-001). Scenarios RS-001–RS-006.
- Relevant solution revision IDs: `SR-007` (design), `SR-004` (requirements).
- Relevant architecture-review revision IDs: `ARCH-REV-002`.
- Relevant implementation revision IDs: `IR-001`.
- Relevant API/E2E revision IDs: `N/A`.
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: N/A.
- Current authoritative result: `Fail`, classified `Local Fix`, routed to the implementation engineer. Score 9.3/10; API/E2E Readiness is 8.8 and Runtime Correctness 8.6.
- What changed in the review result and why: this is the initial baseline. BEH-001–013 are confirmed against the code. Server typecheck is clean, and the focused server (82) and web (46) suites pass. CR-001 was promoted: after a host crash (the design keeps the Agent root alive), `deleteRun` removes the run directory under the live root and its children.
- Supported product scenario / material-premise basis changes: RS-003 (host crash, then history delete) was added as a Supported Explicit Edge Scenario. Candidates C-02 to C-08 were rejected with reasons: pre-existing, not reachable, or contrived. C-02 is kept as a residual risk.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001.
- Material score or classification changes: N/A (baseline).
- Recommended recipient: `/software_engineering_team/implementation_engineer`.
- Remaining risks or uncertainty:
  - C-02: collaborator task-Team members cannot message teammates by address. This is pre-existing and design-preserved, and API/E2E should observe it.
  - AGY/ACP live exposure, VIS-007 live, and Team/Org `@` rendering are not yet exercised.

### CRR-002 — Focused re-review of the CR-001 fix: resolved, but the guard over-blocks cleanup of any crashed standalone run

- Canonical review report updated: `code-review-report.md` (round 2).
- Review entry point and round: Implementation Review, round 2 (focused on commit `c8cd16a2b`).
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-002). CR-001; RS-003.
- Relevant solution revision IDs: `SR-007`, `SR-004`.
- Relevant architecture-review revision IDs: `ARCH-REV-002`.
- Relevant implementation revision IDs: `IR-002`.
- Relevant API/E2E revision IDs: `N/A`.
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: `Fail` (CRR-001, Local Fix, CR-001).
- Current authoritative result: `Fail`, classified `Local Fix` (CR-002), routed to the implementation engineer. Score 9.3/10; API/E2E Readiness is 8.8 and Runtime Correctness 8.8.
- What changed in the review result and why:
  - CR-001 is resolved. A liveness port blocks delete, archive and cancel while a root is registered, and the tests prove that `collaboration/` survives.
  - The guard is keyed on "root registered". `onHostPublished` → `ensureRoot` registers a root for every eligible run, so after any host runtime exit (collaborators or not) the history row is inactive and has no Stop button, yet delete and archive are refused with "Terminate it".
  - That regresses preserved behavior B-003, promoted as CR-002 (C-09).
- Supported product scenario / material-premise basis changes: C-09 was added under RS-003 (host exit, then history cleanup, including runs with no collaborators).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (CRR-001) | Resolved | IR-002, `c8cd16a2b` | `standalone-run-liveness.ts`; the catalog delete, archive and cancel guards use `isLive`; `agent-run-collaboration-root.test.ts` (crash → delete/archive refused, `collaboration_tree.json` kept) and `agent-run-history-catalog-service.test.ts` pass (24/24 on the affected suites); typecheck is clean |

- New or remaining finding IDs: CR-002.
- Material score or classification changes: Runtime Correctness rose from 8.6 to 8.8. The classification stays `Local Fix`.
- Recommended recipient: `/software_engineering_team/implementation_engineer`.
- Remaining risks or uncertainty: unchanged from CRR-001 (C-02; AGY/ACP; VIS-007 live).

### CRR-003 — Focused re-review of the CR-002 fix: Pass

- Canonical review report updated: `code-review-report.md` (round 3).
- Review entry point and round: Implementation Review, round 3 (focused on commit `5dcc5dc82`).
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-003). CR-002; RS-003.
- Relevant solution revision IDs: `SR-007`, `SR-004`.
- Relevant architecture-review revision IDs: `ARCH-REV-002`.
- Relevant implementation revision IDs: `IR-003`.
- Relevant API/E2E revision IDs: `N/A`.
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: `Fail` (CRR-002, Local Fix, CR-002).
- Current authoritative result: `Pass`. Score 9.4/10, with every category at 9.0 or above.
- What changed in the review result and why: `releaseForHistory` ends a lingering Agent root through its owner (as Stop does) before delete, archive or prepared-run cancel. It refuses only when the host is active or the root cannot end. The tests cover the crash with a child, the crash without collaborators, archive, a root that fails to end, an active host, and no root.
- Supported product scenario / material-premise basis changes: C-10 (host wake racing with Delete) was added and rejected as artificial timing.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-002) | Resolved | IR-002, IR-003 | Nothing is deleted under a live root: the root is ended first (`agent-run-collaboration-root.test.ts`) |
| CR-002 | Open (CRR-002) | Resolved | IR-003, `5dcc5dc82` | `standalone-run-liveness.ts#releaseForHistory`; `endRegisteredRoot` → `terminateRoot`; 34/34 affected tests; typecheck is clean |

- New or remaining finding IDs: none.
- Material score or classification changes: API/E2E Readiness rose from 8.8 to 9.2 and Runtime Correctness from 8.8 to 9.2, and the result is now Pass.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (primary). The implementation engineer gets an informational notice.
- Remaining risks or uncertainty:
  - C-02 (task-Team address messaging, pre-existing).
  - AGY/ACP live exposure, VIS-007 live, and Team/Org `@` rendering are not yet exercised.
  - Downgrade and token roll-up are accepted residuals.

### CRR-004 — API/E2E failure-origin review: one Design Impact (collaborator task-Team handoffs) and implementation defects

- Canonical review report updated: `code-review-report.md` (round 4, failure-origin section).
- Review entry point and round: API/E2E Failure-Origin Review, round 4.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-001). F-01 to F-04, U-01.
- Relevant solution revision IDs: `SR-007`, `SR-004`.
- Relevant architecture-review revision IDs: `ARCH-REV-002`.
- Relevant implementation revision IDs: `IR-003`.
- Relevant API/E2E revision IDs: `API-REV-001`.
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: `Pass` (CRR-003).
- Current authoritative result: `Fail`. The recommended recipient is the solution designer, for the Design Impact.
- What changed in the review result and why:
  - F-01 is confirmed in the source: the Team client correlates the member-input echo by content, and the server now rewrites that content with the mention note. This is a review gap in round 1 (CR-003).
  - F-02, F-03 and F-04 are confirmed against the normative VIS-004, VIS-013 and UXJ-001/002 (CR-004).
  - U-01: live evidence shows a collaborator Team's authored address handoffs fail, so the round-1 rejected candidate C-02 is reclassified as DI-001 (Design Impact).
- Supported product scenario / material-premise basis changes: C-02 changed from Reject (pre-existing, design-preserved) to Promote (DI-001), because its consequence is now evidenced live.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved | Resolved | IR-002, IR-003 | API/E2E (AGY host crash): Delete ends the root first and the child process stops |
| CR-002 | Resolved | Resolved | IR-003 | API/E2E: archive after a crash with no collaborators ends the lingering root |

- New or remaining finding IDs: CR-003 (High), CR-004 (Medium), DI-001 (Design Impact).
- Material score or classification changes: not rescored (failure-origin round). The classification is `Design Impact`, plus `Local Fix` items.
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - The DI-001 resolution may change messaging semantics for task Teams in the Team and Org roots as well.
  - The API/E2E durable test changes are pending the proportional test-code review after a passing run.

### CRR-005 — Implementation review of SR-010 (IR-004): Pass

- Canonical review report updated: `code-review-report.md` (section "Implementation Review — Round 5").
- Review entry point and round: Implementation Review, round 5.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-004). DI-001, CR-003, CR-004.
- Relevant solution revision IDs: `SR-010` (design), `SR-008` (requirements, including RD-004).
- Relevant architecture-review revision IDs: `ARCH-REV-004`.
- Relevant implementation revision IDs: `IR-004`.
- Relevant API/E2E revision IDs: `API-REV-001` (the trigger for DI-001).
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: `Fail` (CRR-004).
- Current authoritative result: `Pass`. Score 9.3/10, with every category at 9.0 or above.
- What changed in the review result and why:
  - SR-010 hosts one instance per collaborator, added at send. The order is all-or-nothing in all three roots.
  - Message resolution reaches collaborators and their Team members (DI-001).
  - Held mention sends with a typed rejection; RD-004 sender recording and replay.
  - CR-003 and CR-004 are fixed.
  - Typecheck is clean, and the focused suites pass: server 222, web 275, autobyteus-ts 4.
- Supported product scenario / material-premise basis changes:
  - DI-001 (formerly C-02) is resolved.
  - New rejected candidates C-11 to C-15: Agent-root self-target parity, admission latency in the gate, publication failure after commit, malformed SR-007 developer packages, and the inert `hasTaskExecutionAt` leftover.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-003 | Open (CRR-004) | Resolved | IR-004, `bcff48200` | Identity-keyed `resolveTeamSend`; the TeamStreamingService specs pass |
| CR-004 | Open (CRR-004) | Resolved (live confirmation with API/E2E) | IR-004, `bcff48200` | `opensOnAppear`, `memberDisplayName.ts`, `AgentWorkspaceView.vue` controls and placeholder; `render-check-sr010/` |
| DI-001 | Open (CRR-004) | Resolved | SR-010, ARCH-REV-004, IR-004 (`33b0d1eef`) | `getMessagePlacement` in three indexes; `team-root-collaborators.test.ts`; Agent-root tests |

- New or remaining finding IDs: none.
- Material score or classification changes: the round-5 scorecard replaces the round-3 scorecard. The result is Pass.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (primary). The implementation engineer gets an informational notice.
- Remaining risks or uncertainty:
  - Admission latency inside the gate is unmeasured.
  - AGY/ACP and Org journeys have not run live.
  - The active-trace "earlier events" page still renders deliveries user-style.
  - C-11 parity and the C-15 inert leftover are left for opportunistic cleanup.
  - The API/E2E durable test review is pending.

### CRR-006 — Proportional review of API/E2E durable test changes: one reporting fix

- Canonical review report updated: `api-e2e-test-review-report.md` (created).
- Review entry point and round: successful API/E2E test-code review, round 1.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-002, Pass, 95%).
- Relevant solution revision IDs: `SR-010`, `SR-008`.
- Relevant architecture-review revision IDs: `ARCH-REV-004`.
- Relevant implementation revision IDs: `IR-004`.
- Relevant API/E2E revision IDs: `API-REV-001`, `API-REV-002`.
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: N/A for test review. The source review result is CRR-005 Pass.
- Current authoritative result: `Fail`, classified `Local Fix`, routed to the API/E2E engineer.
- What changed in the review result and why:
  - 7 durable test paths were reviewed (2 added, 5 updated).
  - All checks pass except coverage-to-evidence agreement. The live probe records not-applicable cases (F01/L01/L02 without their environment) as `Pass` and counts them, and the coverage report's "14/14 Pass (Claude)" inherits that (TR-001).
- Supported product scenario / material-premise basis changes: none. The P01/A04 synthetic old-shape data reproduces real released predecessors.

#### Prior Finding Resolution

None (first test review). The source findings stay as recorded in CRR-005.

- New or remaining finding IDs: TR-001 (Low).
- Material score or classification changes: N/A (no scorecard for test review).
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`.
- Remaining risks or uncertainty: unchanged from CRR-005, plus the API/E2E residuals R-1 to R-5 (cosmetic host label, AR-001 reconnect restore, cross-root live run-ID reach under the preserved rule, Grok quota, application-owned runs not live).

### CRR-007 — Test-code re-review: TR-001 resolved, Pass

- Canonical review report updated: `api-e2e-test-review-report.md` (round 2).
- Review entry point and round: successful API/E2E test-code review, round 2.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-003). TR-001.
- Relevant solution revision IDs: `SR-010`, `SR-008`.
- Relevant architecture-review revision IDs: `ARCH-REV-004`.
- Relevant implementation revision IDs: `IR-004`.
- Relevant API/E2E revision IDs: `API-REV-002`, `API-REV-003`.
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: `Fail` (CRR-006, Local Fix TR-001).
- Current authoritative result: `Pass`, routed to the delivery engineer.
- What changed in the review result and why:
  - The probe now records `Not Applicable` with its reason, keeps it out of the pass count and adds a summary.
  - The coverage report counts were corrected.
  - The re-run evidence confirms the new output.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| TR-001 | Open (CRR-006) | Resolved | API-REV-003 | Probe lines 1042–1057; coverage report lines 70/190/226; `r2-browser-tr001/cross-scope-agent-mentions-evidence.json` (summary 1 Pass / 0 Fail / 1 Not Applicable) |

- New or remaining finding IDs: none.
- Material score or classification changes: none.
- Recommended recipient: `/software_engineering_team/delivery_engineer`.
- Remaining risks or uncertainty:
  - From CRR-005: admission latency (now measured as acceptable), Grok blocked by quota (R-4), application-owned runs not live (R-5), cosmetic host label (R-1), the AR-001 reconnect restore (R-2), and cross-root live run-ID reach under the preserved rule (R-3).
  - C-11 and C-15 are minor non-blocking source notes.

### CRR-008 — Evidence addendum: real Electron journeys (API-REV-004)

- Canonical review report updated: `api-e2e-test-review-report.md` (round 3 addendum).
- Review entry point and round: successful API/E2E test-code review, round 3 (evidence only).
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-004). Scenarios D0–D3, BI-1…4, RESTORE, RS-1…4.
- Relevant solution revision IDs: `SR-010`, `SR-008`.
- Relevant architecture-review revision IDs: `ARCH-REV-004`.
- Relevant implementation revision IDs: `IR-004`.
- Relevant API/E2E revision IDs: `API-REV-004`.
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: `Pass` (CRR-007).
- Current authoritative result: `Pass`. No durable test changed, and the desktop evidence is consistent.
- What changed in the review result and why:
  - Real Electron instance evidence was added: standalone, Team, a second `@`, two-way messaging, and a restart restoring 14 collaborator rows and 7 conversations.
  - The `*-error.png` files are driver retries showing correct states.
- Supported product scenario / material-premise basis changes: OBS-D3 (an unrequested focus switch, seen once, cause unknown) is `Hold for Evidence`. It drives no finding.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none.
- Material score or classification changes: none.
- Recommended recipient: `/software_engineering_team/delivery_engineer` (evidence update).
- Remaining risks or uncertainty:
  - OBS-D3 is open.
  - The residuals from CRR-007 still apply.

#### CRR-008 correction (factual, same review result)

- OBS-D3 is closed. The user confirmed a manual click in the desktop UI during D3 moved the view; it is not a product issue.
- The API/E2E artifacts were updated by the API/E2E engineer.
- The result is unchanged: `Pass`, with no open findings or observations from the desktop run.
