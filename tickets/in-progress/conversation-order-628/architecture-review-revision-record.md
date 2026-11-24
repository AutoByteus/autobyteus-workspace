# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete, revised SR-004 (2026-11-23) | SR-001…SR-004 | N/A | Fail (Design Impact; Requirement Gap) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / Design revised SR-005 (2026-11-23) | SR-005 | Fail | Pass | AR-001, AR-002 (resolved) |
| ARCH-REV-003 | Round 3 / Design revised SR-006 after implementation's Design Impact (2026-11-23) | SR-006 | Pass | Pass | None (N-4, N-5 non-blocking) |

## Revision Entries

### ARCH-REV-001 — Baseline review: D-3's contract covers one of three stream shapes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628/tickets/in-progress/conversation-order-628/design-review-report.md`
- Review round and trigger: round 1; `handoff-design-revised-sr-004.md` (documents at `fe77389ced`). SR-001…SR-003 went direct at Medium/Low, so this round reviews the cumulative package.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` and `requirements-doc.md` at SR-004; N/A.
- Relevant solution revision IDs: SR-001, SR-002, SR-003, SR-004.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail`.
- What changed in the review result or what baseline was established: baseline.
  - D-1 and D-2 pass; D-2's rule still holds under D-3's trace `ts` change.
  - AR-001 (Design Impact): `occurred_at` is designed on `AgentPresentationMessage`, which only the Org/collaboration stream embeds. `/ws/agent` (standalone, delegated, snapshot turn frames, peer-run relay) sends `ServerMessage` from its own mapper. `/ws/agent-team` sends its own strict DTOs, and the founder's run is a Team member.
  - AR-001 also: the stamp point `dispatchProcessedAgentRunEvents` misses `AGENT_INPUT_STATE` (two sites) and the canonical `AGENT_STATUS`; the field is required on variants with no reader; the own-send placeholder is undefined for an empty conversation.
  - AR-002 (Requirement Gap, editorial): the approved requirements and the design still state the SR-001 scope ("the shown times stay as they are", baseline SR-001, traceability without REQ-004), contradicting REQ-004.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001, AR-002.
- Material classification changes: None (Large / High).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: the user row's stored (`forwardedAt`) and live (`received_at`) times differ slightly; both are the server's.

### ARCH-REV-002 — D-3 per stream boundary: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628/tickets/in-progress/conversation-order-628/design-review-report.md`
- Review round and trigger: round 2; `handoff-design-revised-sr-005.md` (branch head `b45ef33694`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` D-3 and `requirements-doc.md` at SR-005; AR-001, AR-002.
- Relevant solution revision IDs: SR-005.
- Prior authoritative decision: Fail (ARCH-REV-001).
- Current authoritative decision: Pass.
- What changed in the review result: AR-001 and AR-002 are resolved.
  - **Three boundaries.** `/ws/agent` (mapper, parser, snapshot turn frames, peer relay), the Team member DTOs and the Org presentation message.
  - **One field definition.** `serverTimeSchema` lives in agent-presentation-contracts; the Team DTOs inherit it through the shared payload schemas (verified at `team-agent-message-dtos.ts:17-59`).
  - **One stamping delivery method** covers all four AgentRun deliveries.
  - **The field only on timed messages,** each with its web reader; `accepted_at` on pending entries.
  - **An own send is `null` until confirmed,** walked per stream (including a new run's first message and reconnect).
  - **The requirements text is aligned with REQ-004.**
  - Precision notes for implementation:
    - N-1: `applyPendingUserMessage` keeps `existing.timestamp`, so it must take `accepted_at` when null; `/ws/agent` has no user echo.
    - N-2: the compaction row time is `occurred_at`, not `provider_timestamp`.
  - Editorial: N-3, leftover FU-001 mentions in the design spec.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (blocking) | Resolved | SR-005 D-3 (boundaries table, Data Contract, per-stream validation) | `team-agent-message-dtos.ts:17-59`; `agent-run.ts:222-226,524-545` (all covered by the named method) |
| AR-002 | Open (blocking) | Resolved | SR-005 requirements-doc (baseline, Out of Scope, Non-Goals, BEH-003, Traceability); design-spec approval line, D-1 left-alone list | Read; leftover mentions are N-3 |

- New or remaining finding IDs: None blocking; N-1, N-2, N-3 non-blocking.
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: N-1, N-2; rule 12 (contract `dist/`, fresh-start build, build-only release run).

### ARCH-REV-003 — The external user trace at admission time: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628/tickets/in-progress/conversation-order-628/design-review-report.md`
- Review round and trigger: round 3; SR-006 section of `design-spec.md` (branch head `d035533502`), after implementation found that an external notice's delivery time can precede the user trace's `forwardedAt` (MSP-105, 3/3 after a reopen).
- Triggering role, report path, and finding IDs: Solution Designer (from implementation's Design Impact); `design-spec.md` SR-006; N/A.
- Relevant solution revision IDs: SR-006.
- Prior authoritative decision: Pass (ARCH-REV-002).
- Current authoritative decision: Pass.
- What changed in the review result: SR-006 is verified. `forwardedAt` is stamped when the observers are notified (`agent-run-command-observer-dispatch.ts:31`); `acceptedAt` is stamped at admission (`agent-run-input-admission-state.ts:120`), before the preface is taken. So `u.ts ≤ n.ts` by construction. The round-1 basis statement claiming the opposite order was wrong and is corrected in the report. Non-blocking: N-4 (`forwardedAt` loses its only reader in `src`: remove it); N-5 (D-2's sentence about own-turn notices to be updated; the new outcome matches live).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) | Resolved | — | Unchanged by SR-006 |
| AR-002 | Resolved (ARCH-REV-002) | Resolved | — | Unchanged by SR-006 |

- New or remaining finding IDs: None blocking; N-4, N-5 non-blocking (N-1, N-2 from round 2 still apply to implementation).
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: rule 12 as before.
