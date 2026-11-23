# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (2026-11-22) | SR-001 | N/A | Fail (Design Impact) | AR-001 |
| ARCH-REV-002 | Round 2 / Design revised SR-002 (2026-11-22) | SR-002 | Fail | Pass | AR-001 (resolved) |
| ARCH-REV-003 | Round 3 / Design revised SR-004 after CRR-002 (2026-11-23) | SR-004 | Pass | Pass | None (N-3, N-4 non-blocking) |

## Revision Entries

### ARCH-REV-001 — Baseline review: the task list's re-read cannot read a stopped run

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609/tickets/in-progress/phone-web-followups-609/design-review-report.md`
- Review round and trigger: round 1; `handoff-architecture-design-complete.md` (branch at `ce5cfdb7f0`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` at SR-001; N/A.
- Relevant solution revision IDs: SR-001.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail` — `Design Impact`.
- What changed in the review result or what baseline was established: baseline. A–H and J pass, and the classification (Large / High) is confirmed. AR-001: D-I re-reads `agentBackgroundTaskView` after the run stops, but the resolver answers `unavailable/inactive` for any inactive run (`agent-background-task-view.ts:94-101`). ASM-1 holds for the backends' `list()`, not for this read, so the row never reads Stopped (AC-I), and the existing unbounded 2 s retry runs on (QR-1).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001.
- Material classification changes: None.
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: N-1 (H root resolution when the folder is not yet loaded); two `summaryArgs` consumers missing from the list; J's reachability change accepted.

### ARCH-REV-002 — The run's end applied on the web: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609/tickets/in-progress/phone-web-followups-609/design-review-report.md`
- Review round and trigger: round 2; `handoff-design-revised-sr-002.md` (branch at `510c3aba0f`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` and `requirements-doc.md` at SR-002; AR-001.
- Relevant solution revision IDs: SR-002.
- Prior authoritative decision: Fail (ARCH-REV-001).
- Current authoritative decision: Pass.
- What changed in the review result: AR-001 resolved. The panel view watches `runStopped` (Offline; the initial value never counts). On false→true, `agentBackgroundTaskStore.endRunningTasksForRunEnd(runId)` ends the running rows as `stopped`/`run_ended`. No read is made, the 2 s re-read stops while the run is stopped, and one read happens when it is live again. ASM-1 is corrected and verified (Claude, native and Antigravity end tasks with `run_ended`; the web zeroes the count on Offline; ended rows are never undone). REQ-I, QR-1 and DEC-007 are revised within the direction, and Codex snapshot lists are out of scope. N-1 (metadata root fallback) and the two E consumers are added.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (blocking) | Resolved | SR-002 D-I, DS-I, ASM-1, REQ-I, QR-1, DEC-007 | `agentBackgroundTaskStore.ts:33-44`; `agentRuntimeStatusState.ts:66,74`; run-end producers cited in the notes |

- New or remaining finding IDs: None.
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: N-2 (a list opened after the stop is not covered; outside REQ-I's wording; suggestion); C proven only by the release run's Windows job.

### ARCH-REV-003 — D-D2, a stopped call read back from the node: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609/tickets/in-progress/phone-web-followups-609/design-review-report.md`
- Review round and trigger: round 3; `handoff-design-revised-sr-004.md` (branch head `d999196dbb`), after CRR-002's failure-origin Design Impact on API-REV-001 F-1 (a stopped call reads "Failed" after a read-back).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` D-D2 and `requirements-doc.md` AC-D/DEC-010 at SR-004; `code-review-report.md` CRR-002 (F-1).
- Relevant solution revision IDs: SR-004.
- Prior authoritative decision: Pass (ARCH-REV-002).
- Current authoritative decision: Pass.
- What changed in the review result: D-D2 was reviewed against the code.
  - The interruption signals are written only on interruption paths: sequencer `TOOL_EXECUTION_INTERRUPTED` / `TURN_INTERRUPTED`, native `AgentTurnInterruptedEvent` (one caller), and the journal's texts.
  - Both replay call sites go through `createToolEvent`.
  - Every provider builds its conversation through one transformer, so removing the web's `inferToolStatus` is safe.
  - Persisted data Not Affected.
  - N-3 (non-blocking): DEC-010's premise is false. UI history reads Codex from local recorded traces, and Codex emits both interruption events, so D-D2 already covers Codex read-back; the AC-D exclusion and FU-008 should be dropped.
  - N-4 (non-blocking): the Codex and Claude runtime-native providers are imported only by their tests (dead code in a file D-A touched): remove them or record a follow-up.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) | Resolved | — | Unchanged by SR-004 |

- New or remaining finding IDs: None blocking; N-3, N-4 non-blocking.
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: N-3, N-4; Case 26 status-read listing in `recent-run-projection-policy.ts` and `run-projection-utils.ts` left to implementation as the design says.
