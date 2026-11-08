# API/E2E Test Review Report — small-follow-ups-batch-426 (autobyteus-426), ticket round 2 (items 9, 20–23)

The test review of ticket round 1 (CRR-006, Pass; `mobile-shell-probe.mjs` MSP-07/12/13/17/18/19, `project-task-boundaries.e2e.test.ts`, three baseline fixes) is recorded in `code-review-revision-record.md`. Its report text is in git history at `17281c492d`. This report holds the latest result: the test review of ticket round 2.

## Review Meta

- Review Round: 2 (the proportional test-code review of ticket round 2, after a passing API/E2E run)
- Trigger: API-REV-003 Pass. Head `5d247c7b4e`; product `a3bc0525cd`; probes `94d7dca6b4`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` § Round 2 Requirements (REQ-009, 020–023; AC-009a…d, AC-020…023; DEC-017)
- Investigation Notes Reviewed As Context: `investigation-notes.md` § Round 2 Investigation
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-009…SR-014)
- Design Spec Reviewed As Context: `design-spec.md` § Round 2 Design
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-004)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-008, 009)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-005)
- Original Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/code-review-report.md` (CRR-007 Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-008`
- Coverage Investigation: `api-e2e-coverage-investigation.md` (ticket round 2)
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` § Ticket Round 2 (Cases, Acceptance-Criteria Proof)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-003)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass (API-REV-003)
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none (CRR-006 had none)
- Project testing guideline applied: `TESTING.md`. Applied here: § Test layers (phone-bundle cases for renderer behavior the phone also offers; MSP-20 covers the phone list); § Rules 2 (isolated, probe-owned nodes), 6 (assertions first) and 9. No conflict and no discrepancy.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (`94d7dca6b4`) | MSP-20 (REQ-009; AC-009a…d, desktop Runs view and phone list); MSP-02 (a) (REQ-009 replaces 277 DEC-013 for a row under a root that is not open); MSP-12 (AC-009c: no status read on the run screen, a view or while hidden); the phone network log records `runIds` | The phone bundle and the desktop window against one probe-owned node | MSP-20 builds its own hub (two children, then a third) through the product's GraphQL and tool calls, and drives the children's turns over the hub's real collaboration socket |
| `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs` | Updated (`94d7dca6b4`) | NP-13 (REQ-020; AC-020 (2), change address) | Nodes page against probe-owned nodes | Control case: a plain HTTP server keeps "isn't an AutoByteus node". The address is unchanged afterwards |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | MSP-20 has a header comment and six numbered steps (quiet polls, hidden or background, idle → running → idle, open run, third child, stop), each with a labelled `[ok, label]` assertion naming its AC |
| Assertions prove approved requirements, not incidental details | Pass | AC-009a: each poll sends a status read and no `GetAgentRunCollaboration` view read; the hub's answer is ≤ 2 KB and a read of ≤ 10 children is ≤ 2 KB; state changes appear within ≤ 2 polls (desktop) and one poll (phone) with 0 view reads. AC-009b: the third child within one poll with exactly 1 view re-read per surface; offline within one poll after the stop. AC-009c: 0 status reads on a run screen and in the background, and one read soon after the page shows. AC-009d: the open run is not in the read. NP-13 checks the exact REQ-020 sentence and an unchanged address. MSP-02 (a) is updated to REQ-009 instead of the superseded DEC-013 |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | Reuses `toList`, `ensureUnfolded`, `rowsOf`, `openRow`, `showOlder`, `stack.agentCall`, `pickId`, `desktopRunsView` and `phoneNet`. The local `follow`, `openDesktop` and `count` helpers serve MSP-20's repeated measurements. NP-13's `tryAddress` serves both of its addresses |
| Isolation and determinism fit the boundary | Pass | Probe-owned nodes, fresh contexts, its own hub and agent definition. Timing bounds come from the requirement (one poll = 7 s, two polls = 12 s against the 5 s poll) with 200 ms sampling. The quiet-poll window is 15.5 s, so ≥ 2 reads is a safe floor. Non-blocking note on NP-13 below |
| Large files remain coherent | Pass | MSP-20 is long but it is one behavior across two surfaces, and it is navigable through its numbered steps |
| No stale, duplicated, disabled or compatibility-only tests | Pass | MSP-02's DEC-013 assertion (`unselectedSeen.length === 1`, updated only once the root is opened) is replaced, because REQ-009 changed that behavior. The probe's header comments follow |
| Coverage agrees with the investigation and the evidence | Pass | Matches T2-01 (20/20, 0 view reads on unchanged polls, bytes recorded) and T2-02 (13/13). AC-020 (3) is proven by the web spec and the server E2E, because the real page cannot reach it (the window's own row check is refused first; DEC-017, FU-004). AC-020 (1) is the server E2E, which ran 2/2 |
| Callers and fixtures exercise an independently established scenario | Pass | SCN-009 and SCN-020 come from the requirements. Children are delegated by the hub's own `delegate_task`, turns are sent through the hub's collaboration socket as another window would, and the stop goes through `terminateAgentRun`. The long tool call (`CALL_TOOLS` with `delayMs`) is the scripted runtime's normal turn, chosen because Stop generation leaves a scripted agent in `error` |
| Each test enters through the real trigger and follows the actor's steps | Pass | The user watches the Runs view and the phone list (unfolded hub rows); the node-side events are real. The background state uses the same `visibilitychange` simulation as MSP-12 (the page's own listener), which is the probe's established way to hide a page. NP-13 uses the row's own Change address editor |

Non-blocking note (not a finding): NP-13 depends on `lvh.me` resolving to this machine through public DNS. The server E2E `peer-host-refused` skips with its reason when it does not; NP-13 would fail with "the refused name's text: null". A precondition check that names the cause would make such a failure self-explanatory. It resolved here (T2-04), and the dependency is documented in the case comment.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-004 stands.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (MSP-20 new; MSP-02 (a), MSP-12, network log) and `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs` (NP-13 new), both in `94d7dca6b4`
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: Medium / High is unchanged. Residuals for delivery:
  - The Workspaces tree has no probe step of its own; it shares the section load, collaboration store and row component with the Runs view, and its specs cover it.
  - AC-020 (3) is proven at spec and server level (DEC-017, FU-004).
  - Signing, notarization and other-OS builds need the release runner.
