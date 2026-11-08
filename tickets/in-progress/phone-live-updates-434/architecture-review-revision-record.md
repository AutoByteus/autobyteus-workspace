# Architecture Review Revision Record — autobyteus-434

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1, SR-002 "Architecture Design Complete" handoff | SR-001, SR-002 | N/A | Fail (Design Impact) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2, SR-003 revision for ARCH-REV-001 | SR-003 | Fail | Fail (Design Impact) | AR-001 (c remains), AR-002 (resolved) |
| ARCH-REV-003 | Round 3, SR-004 revision for ARCH-REV-002 | SR-004 | Fail | Pass | AR-001 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review: scheduler sound; agent re-sync and Org/collaboration adoption not concrete

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/design-review-report.md`
- Review round and trigger: round 1; Solution Designer handoff `handoff-sr-002.md` (2026-11-08)
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` at SR-002; N/A
- Relevant solution revision IDs: SR-001, SR-002
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`, classified `Design Impact`
- What changed in the review result or what baseline was established: Baseline. Confirmed the behavior basis, the Medium/High classification, the scheduler's ownership, `pageResumeSignal`, the server identity fix (DS-004) and `Directly Usable — No Migration`. Raised AR-001: the agent re-sync has no outcome under continuous deltas, its inputs and commit content are unstated, and its "reconnected" trigger is imprecise. Raised AR-002: for Org and collaboration the success point, the Org re-sync of an open socket, and the `connect()`/`requestRecovery()` entry points are not defined. Settled the design's deferred error-clearing check by evidence.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001, AR-002 (plus non-blocking N-1…N-3)
- Material classification changes: None (`task_size: Medium`, `architectural_risk: High` confirmed)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: ASM-001 (Android WebView visibility); FU-001; desktop re-sync cost on many kept streams (DEC-003 approved); P-002 (Unclear, server open-then-1011 loop)

### ARCH-REV-002 — Re-review of SR-003: AR-002 resolved; AR-001 open on owner-initiated agent connects

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/design-review-report.md`
- Review round and trigger: round 2; Solution Designer handoff `handoff-sr-003.md` (2026-11-08)
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` at SR-003; AR-001, AR-002, N-1…N-3
- Relevant solution revision IDs: SR-003
- Prior authoritative decision: Fail (ARCH-REV-001)
- Current authoritative decision: `Fail`, classified `Design Impact`
- What changed in the review result: AR-002, N-1, N-2 and N-3 are verified against the per-owner table and the code. AR-001 (a) and (b) are verified. AR-001 (c) is reopened with new evidence: `reconcileDiscoveredActiveRuns` (`runHistoryLoadActions.ts:323-329`) is the live owner-initiated connect, run after every history read (desktop polls every 5 s). With `DISCONNECTED` while waiting, it now pre-empts the scheduler's catch-up (P-004, Reachable). The agent success point is also undefined for owner-initiated opens (P-005, Unclear). The design's cited "active-run recovery" caller is dead code (only its spec imports it).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (a, b, c) | (a) Resolved, (b) Resolved, (c) Still open | SR-003; design-spec DS-003, per-owner table agent row | (a) catch-up before open: no socket, so no live events (DS-003, step-5 test). (b) `loadRunStoredState`; defaults match `runProjectionConversation.ts:344-348` / `AgentRunConfig`; commit keeps config/status. (c) P-004: `runHistoryLoadActions.ts:147, 323-329`, `RunSectionPanel.vue:387`, `useRunHistorySectionLoad.ts:50, 60-66`; P-005: agent row "socket open after the catch-up" vs bounded spine `idle` |
| AR-002 | Open (a, b, c) | Resolved | SR-003; per-owner table, common rules, bounded local spine | (a) success at the snapshot for Team/Org/collaboration (`TeamStreamingService.ts:351`, Org `:325`, collaboration `:201`); pre-success failures count; first step 1 s. (b) Org retire → `reopenOwned(null)` meets `ownsOperation(null)` (`:372-375`). (c) `connect()`→`startOver()`, `requestRecovery` guard→`isWaiting()`; `DISCONNECTED` while waiting; `RECONNECTING` read only in transport and tests |
| N-1 | Open | Resolved | Ownership Map | Recorded with citations |
| N-2 | Open | Resolved | Files | No-growth / ≤ 500 constraints with named extraction |
| N-3 | Open | Resolved | Ownership Map | Stated |

- New or remaining finding IDs: AR-001 (c1, c2); non-blocking N-4…N-7
- Material classification changes: None (Medium / High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: the agent read-to-open window (accepted, equal to the open path); ASM-001; FU-001; DEC-003 desktop cost

### ARCH-REV-003 — Re-review of SR-004: Agent Connect Rule resolves AR-001 (c); Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/design-review-report.md`
- Review round and trigger: round 3; Solution Designer handoff `handoff-sr-004.md` (2026-11-08)
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` at SR-004; AR-001 (c1, c2), N-4…N-7
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: Fail (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result: verified the Agent Connect Rule against `agentRunStore.ts:293-375` and `runHistoryLoadActions.ts:288-345`:
  - A history read during a wait now triggers the catch-up attempt (P-004 resolved).
  - Every agent socket open calls `connected()` (P-005 resolved).
  - `isRecovering()` covers held (N-4); `dropConnection` rejects pending admissions and interrupts (N-6); every attempt exit ends in one scheduler call (N-7); FU-002 records the dead coordinator (N-5).
  - Added non-blocking N-8 (stale wording superseded by the rule) and N-9 (redundant load on open while waiting, accepted).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | (c) Still open | Resolved | SR-004; Agent Connect Rule, per-owner agent row, DS-003, step-5 tests | `requestConnect()` state table (waiting → `attemptNow`; held/attempting/connected → nothing; idle → plain connect); "every socket open → `connected()`"; the only plain connect is from `idle`; `disconnectAgentStream` deletes the map entry (`agentRunStore.ts:372-373`), so no disposed reconnection is reused |
| N-4…N-7 | Open (non-blocking) | Resolved | SR-004 changes table | `isRecovering()`, FU-002, `dropConnection`, single scheduler call per exit |

- New or remaining finding IDs: none blocking; non-blocking N-8, N-9
- Material classification changes: None (Medium / High)
- Recommended recipient: Implementation Engineer (primary); Solution Designer (informational)
- Remaining risks or uncertainty: agent read-to-open window (accepted); ASM-001; FU-001; DEC-003 desktop cost
