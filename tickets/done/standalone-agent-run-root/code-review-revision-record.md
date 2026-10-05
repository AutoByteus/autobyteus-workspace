# Code Review Revision Record — standalone-agent-run-root

The latest `code-review-report.md` or `api-e2e-test-review-report.md` remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail (Local Fix) | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002, CR-001 fix) | Fail (Local Fix) | Pass | CR-001 |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 3 (API-REV-001, F-01) | Pass | Fail (Local Fix, implementation defect) | CR-002 |
| CRR-004 | `code-review-report.md` | Implementation Review, round 4 (IR-003, CR-002 fix) | Fail (Local Fix) | Pass | CR-002 |
| CRR-005 | `code-review-report.md` | API/E2E Failure-Origin Review, round 5 (API-REV-002, F-02) | Pass | Fail (Design Impact) | F-02 (no source finding) |
| CRR-006 | `code-review-report.md` | Implementation Review, round 6 (IR-004, SR-006 § 11) | Fail (Design Impact) | Pass | None |
| CRR-007 | `api-e2e-test-review-report.md` | Proportional test-code review after API/E2E Pass (API-REV-003) | Pass (CRR-006) | Not Applicable | None |
| CRR-008 | `code-review-report.md` | Implementation Review, round 7 (delivery re-entry, IR-005, DR-001) | Not Applicable (CRR-007) | Pass | None |
| CRR-009 | `api-e2e-test-review-report.md` | Proportional test-code review after API/E2E Pass (API-REV-004, DR-001 re-entry) | Pass (CRR-008) | Not Applicable | None |

## Revision Entries

### CRR-001 — Initial implementation review of IR-001

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs:
  - Triggered by `/implementation_engineer`.
  - Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/implementation-handoff.md`.
- Relevant solution revision IDs: SR-002, SR-004, SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`; classification `Local Fix`.
- What changed in the review result and why: this is the initial baseline.
  - REQ-001–REQ-009 are implemented and traced end to end.
  - One promoted finding remains. CR-001: collaboration-stream child commands now call `ensureHostReady`, so after a host crash every child action restores the host first, and a restore failure blocks the child action. This contradicts the design's "Child commands are unchanged" and AC-010.
- Supported product scenario / material-premise basis changes:
  - SC-01–SC-07 recorded.
  - CG-01 promoted.
  - CG-02 (process bindings), CG-03 (refetch coalescing timing), CG-04 (fail-stop re-registration), CG-06 (Team builder) and CG-07 (frozen migration header) rejected.
  - CG-05 (roll-up freshness while only children report) held for evidence.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001 (new, open)
- Material score or classification changes: initial scorecard 9.1/10. Ownership 8.8, API/E2E Readiness 8.8 and Runtime Correctness 8.7 are below 9.0 because of CR-001.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - AC-001 live-provider E2E not yet executed.
  - CG-05 roll-up freshness.
  - `tokenUsageMeterStore.ts` at 492 effective lines.
  - Team collaborator registry restore not checked live.

### CRR-002 — Targeted delta review of the CR-001 fix (IR-002)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`.
  - The delta is `7ef6f828a..c0e8ce7fd`: 4 files (stream handler, websocket composition, module doc, handler test), all within CR-001.
  - No shared interface or spine change outside the handler's own constructor `Pick`.
- Triggering role, report path, and finding or scenario IDs:
  - Triggered by `/implementation_engineer`.
  - Handoff: `implementation-handoff.md` (Rework, IR-002).
  - Finding: CR-001. Scenario: SC-04.
- Relevant solution revision IDs: SR-002, SR-005
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (Local Fix, CRR-001)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - Collaboration-stream child commands now use `getActive(hostRunId) ?? readyRoot(hostRunId)`, which restores the base semantics.
  - A crashed host is no longer restarted for a child send, interrupt or approval, and `connect` still makes the host ready (AR-001).
  - The two new unit tests cover the crash case and the no-active-root fallback.
  - My re-run passed: 6 files, 46 tests.
- Supported product scenario / material-premise basis changes: none. SC-04 is now satisfied, and CG-05 is still held as a residual risk.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Medium, Local Fix) | Resolved | IR-002, `c0e8ce7fd` | See the evidence list below |

CR-001 verification evidence:
- `agent-collaboration-stream-handler.ts` `handleMessage` now uses `this.roots.getActive(...) ?? await this.readyRoot(...)`.
- `api/websocket/index.ts` injects `getActive`.
- The test "takes child commands on the active root without restarting a crashed host (CR-001)" passes: `ensureHostReady` is not called, and both commands are accepted.
- The fallback test passes.
- The docs were updated.

- New or remaining finding IDs: none
- Material score or classification changes: overall score 9.1 → 9.3.
  - Ownership 8.8 → 9.3.
  - API/E2E Readiness 8.8 → 9.2.
  - Runtime Correctness 8.7 → 9.2.
  - Every category is now at or above 9.0. There is no classification (Pass).
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - The AC-001 live-provider E2E is not yet executed.
  - CG-05 roll-up freshness while only children report usage.
  - `tokenUsageMeterStore.ts` is at 492 effective lines.
  - Team collaborator registry restore after Stop not checked live.
  - The live host-crash → child-command path was not re-run live; it is covered by the unit test.

### CRR-003 — Failure-origin review of API/E2E F-01 (AC-007, standalone collaborator earlier events)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs:
  - Triggered by `/api_e2e_engineer`.
  - Report: `api-e2e-execution-coverage-report.md` (API-REV-001).
  - Finding F-01, scenario AE-10, AC-007.
- Relevant solution revision IDs: SR-002, SR-005
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002)
- Current authoritative result: `Fail`; `Local Fix`; implementation defect.
- What changed in the review result and why:
  - A standalone child's browse subject is `{kind:'run'}` (`agentRunCollaborationStore.ts:271`). That calls `GetRunEventMonitorActiveTracePage(childRunId)`, which the server rejects because a child is not a top-level run package.
  - The existing server query `agentRunCollaborationMemberEventMonitorActiveTracePage` works, but the web never calls it.
  - The defect is pre-existing, but AC-007 and the D-R6 docs now require the page to work.
  - Review gap acknowledged: BEH-008 was not traced forward from the collaborator conversation entry surface.
- Supported product scenario / material-premise basis changes:
  - SC-06 is re-confirmed as a Supported Normal Scenario on standalone collaborator pages.
  - O-01 (Org Stop on Codex under load) is held for evidence and not attributed to the branch.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved | Resolved (live-confirmed) | IR-002, API-REV-001 | API/E2E SC-04 live on Claude: a child send and an interrupt reached the child without a host restart |

- New or remaining finding IDs: CR-002 (new, open)
- Material score or classification changes: Runtime Correctness corrected to 8.5 (CR-002). Classification `Local Fix`.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - O-01 (held).
  - CG-05 (held).
  - AGY, Grok and LM Studio runtimes, and the live Team-member earlier page, not run.
  - TESTING.md path sync (delivery).

### CRR-004 — Targeted delta review of the CR-002 fix (IR-003)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/code-review-report.md`
- Review entry point and round: Implementation Review, round 4
- Review scope: `Targeted Delta Review`.
  - The delta is `dd97ff02c..782ec9f11`: 8 web files, with no server change.
  - The new subject variant is handled by both consumers through exhaustive switches. The Org, Team and host producers are unchanged.
- Triggering role, report path, and finding or scenario IDs:
  - Triggered by `/implementation_engineer`.
  - Handoff: `implementation-handoff.md` (Rework, IR-003).
  - Finding CR-002, from F-01 (AE-10, AC-007).
- Relevant solution revision IDs: SR-002, SR-005
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-003)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - Standalone children now browse through the `standaloneMember` subject, which calls the existing `agentRunCollaborationMemberEventMonitorActiveTracePage`. The host keeps `run`.
  - Durable tests cover the store subject, the service routing for all four subjects, and the "From <Sender>:" rendering.
  - My re-run of the focused web specs passed: 8 files, 64 tests.
- Supported product scenario / material-premise basis changes: none. SC-06 is satisfied at the unit level; the live rerun is AE-10.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-002 | Open (High, Local Fix) | Resolved | IR-003, `782ec9f11` | See the evidence list below |
| CR-001 | Resolved | Resolved | IR-002, API-REV-001 | Unchanged |

CR-002 verification evidence:
- `agentRunCollaborationStore.ts` `childTargetFor` sets `browse: { kind: 'standaloneMember', hostRunId, memberAddress, agentRunId }`.
- `eventMonitorActiveTracePageService.ts` has an exhaustive switch, and the new query is in `runHistoryQueries.ts`.
- The new specs pass.

- New or remaining finding IDs: none
- Material score or classification changes: Runtime Correctness goes from 8.5 to 9.2, and the overall score is 9.3. There is no classification (Pass).
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - The AE-10 live rerun is pending.
  - O-01 (held).
  - CG-05 (held).
  - AGY, Grok and LM Studio runtimes not run.
  - TESTING.md path sync (delivery).

### CRR-005 — Failure-origin review of API/E2E F-02 (Org Stop on Codex)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 5
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs:
  - Triggered by `/api_e2e_engineer`.
  - Report: `api-e2e-execution-coverage-report.md` (API-REV-002).
  - Failure F-02 (from O-01), scenario AE-03 LE-O1 on Codex; AC-001 and AC-010.
- Relevant solution revision IDs: SR-002, SR-005
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-004)
- Current authoritative result: `Fail`; `Design Impact`.
- What changed in the review result and why:
  - The Org Stop fails because the shared `AgentRunRootShutdownFence` latches a permanent failure when the runtime rejects the interrupt ("no active turn": the turn has just ended) before local quiescence is observed. Every retry returns the same latched result.
  - The whole fence chain is unchanged on the branch (empty `git diff --stat` over `agent-execution/domain`, the collaboration and runtime backends, and `runtime-management`).
  - The branch-only rate (3 of 10 vs 0 of 12) probably comes from the approved REQ-005 behavior (address replies to team members now succeed, so more turns are in flight at Stop). This is unproven and noted only.
  - The fix belongs to a shared, high-risk lifecycle owner outside the approved design, so it needs a solution-owner decision.
  - Not a review gap.
- Supported product scenario / material-premise basis changes: Stopping a busy Org (SC-03 extended to Org roots) is a Supported Normal Scenario. The race is natural RPC timing, not artificial.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-002 | Resolved | Resolved (live-confirmed) | IR-003, API-REV-002 | AE-10 rerun: collaborator, host and collaborator-Team member pages render "From General Agent:"; web suites show 0 new failures |
| CR-001 | Resolved | Resolved | IR-002, API-REV-001 | Unchanged |

- New or remaining finding IDs: none in the branch source. F-02 is classified Design Impact (a pre-existing shared defect).
- Material score or classification changes: scorecard unchanged (9.3). Classification `Design Impact`.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty:
  - Which AgentRun was fenced, and race versus stale active turn, are not yet logged.
  - The same race may exist on Claude.
  - CG-05 (held).
  - AGY, Grok and LM Studio runtimes not run.
  - TESTING.md path sync (delivery).

### CRR-006 — Review of SR-006 § 11 root shutdown fence (IR-004)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/code-review-report.md`
- Review entry point and round: Implementation Review, round 6
- Review scope: `Full Re-Audit`.
  - The delta changes shared Stop-spine semantics: `470dd1d93..eccea069b`, 2 source files plus append-only tests.
  - No other source changed since CRR-004, so the earlier evidence was re-confirmed.
- Triggering role, report path, and finding or scenario IDs:
  - Triggered by `/implementation_engineer`.
  - Handoff: `implementation-handoff.md` (IR-004).
  - Basis: F-02, CRR-005, SR-006 § 11, ARCH-REV-004.
- Relevant solution revision IDs: SR-006 (requirements SR-002)
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (Design Impact, CRR-005)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - F-1 to F-4 are implemented exactly as § 11 specifies, in the owner only.
  - A rejected interrupt waits, bounded at 5 s, for local quiescence, the only success signal.
  - Only acceptance is latched, so a root-level retry reaches a fresh AgentRun attempt.
  - Diagnostics carry the turn state.
  - My re-run of the fence and termination suites passed: 8 files, 82 tests.
- Supported product scenario / material-premise basis changes:
  - BEH-003a confirmed.
  - CG-08 (out-of-queue expiry) and CG-09 (stale-turn bound) rejected.
  - CG-10 (`agent-run.ts` at 498 lines) recorded as a residual risk.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-02 origin (Design Impact) | Open upstream | Implemented; live validation pending | SR-006, ARCH-REV-004, IR-004, `eccea069b` | Rule table in the report § "Round 6"; new and existing suites pass |
| CR-001, CR-002 | Resolved | Resolved | IR-002, IR-003 | Unchanged |

- New or remaining finding IDs: none
- Material score or classification changes: score 9.3, all categories at or above 9.0. No classification (Pass).
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - N-1 live validation: LE-O1 on Codex at least 10 times, and the AC-001 suites on Claude and Codex. Any F-4 warning should be recorded, and an IDENTIFIED turn at expiry means Design Impact.
  - CG-10 line pressure.
  - CG-05 (held).
  - AGY, Grok and LM Studio not run.
  - TESTING.md path sync (delivery).

### CRR-007 — Proportional API/E2E test-code review (API-REV-003 Pass)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs:
  - Triggered by `/api_e2e_engineer`.
  - Report: `api-e2e-execution-coverage-report.md` (API-REV-003, Pass, 93%).
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002, API-REV-003
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-006, implementation review)
- Current authoritative result: `Not Applicable`
- What changed in the review result and why:
  - API/E2E changed no durable test code. The probe was removed, and the diagnostic edit was reverted.
  - F-02 is validated live: LE-O1 on Codex passed 11/11, and the AC-001 suites pass on Claude and Codex.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-02 origin (Design Impact) | Implemented; live validation pending | Resolved (live-confirmed) | SR-006, IR-004, API-REV-003 | LE-O1 on Codex 11/11 (branch was 3/10 failing before the fix); 0 new server failures |

- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - CG-05.
  - `agent-run.ts` line pressure.
  - Grok environment; LM Studio not run.
  - The live rejection → quiescence path was not observed.
  - TESTING.md path sync.
  - `origin/personal` integration.

### CRR-008 — Delivery re-entry: DR-001 harness import (IR-005)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/code-review-report.md`
- Review entry point and round: Implementation Review, round 7
- Review scope: `Targeted Delta Review` (a one-line test-support import; `07ee58675..3c7b62f53`)
- Triggering role, report path, and finding or scenario IDs:
  - Triggered by `/implementation_engineer`.
  - Triggering report: `delivery-revision-record.md` DR-001, with evidence in `delivery-evidence/dr001-native-input-history.log`.
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: CRR-006 Pass; CRR-007 Not Applicable
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The workspace harness `test-support/native-input-history` imported the root fixture from the pre-IR-001 folder. It now imports from `tests/integration/standalone-agent-run-root/`.
  - The fixture members the harness uses are unchanged.
  - My re-run of `pnpm test:native-input-history` passed 2/2.
  - The round-1 cleanup check missed this out-of-package reference; that review gap is acknowledged in the report.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (no prior open findings; DR-001 resolved by IR-005).

- New or remaining finding IDs: none
- Material score or classification changes: none (score 9.3)
- Recommended recipient: `/api_e2e_engineer` (scoped rerun, then back to delivery)
- Remaining risks or uncertainty:
  - TESTING.md:222 docs sync (delivery).
  - Otherwise as in CRR-007.

### CRR-009 — Proportional test review after API-REV-004 (delivery re-entry)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 2
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs:
  - Triggered by `/api_e2e_engineer`.
  - Report: `api-e2e-execution-coverage-report.md` (API-REV-004, Pass, 93%).
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: API-REV-004
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Pass (CRR-008)
- Current authoritative result: `Not Applicable`
- What changed in the review result and why:
  - API/E2E changed no durable tests; its temporary `afterAll` edit was reverted, and nothing outside `tickets/` changed since `dc0c702dc`.
  - The IR-005 harness import is implementation-owned. It was reviewed in CRR-008 and executed 2/2.
  - The upstream Claude compaction merge was spot-checked by API/E2E with 0 new failures. Its live-model flakiness reproduces on upstream alone.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - Upstream live-model flakiness, not from this branch.
  - CG-05.
  - Grok environment; LM Studio not run.
  - `agent-run.ts` at 498 effective lines.
  - TESTING.md:222 docs sync.
