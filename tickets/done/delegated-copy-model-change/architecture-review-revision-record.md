# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (2026-10-13) | SR-001..SR-004 | N/A | Fail | AR-001..AR-005 |
| ARCH-REV-002 | Round 2 / SR-005 revision for ARCH-REV-001 (2026-10-13) | SR-005 | Fail | Fail | AR-001..AR-005 resolved; AR-006 new |
| ARCH-REV-003 | Round 3 / SR-006 (AR-006) + SR-007 (user UX simplification) (2026-10-13) | SR-006, SR-007 | Fail | Pass | AR-006 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review: sound shape; Save serialization and Stop containment need rework

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change/tickets/in-progress/delegated-copy-model-change/design-review-report.md`
- Review round and trigger: Round 1; `Architecture Design Complete` from `/software_engineering_team/solution_designer`
- Triggering role, report path, and finding IDs: solution_designer, `handoff-architecture-design-complete.md`, N/A
- Relevant solution revision IDs: SR-001..SR-004
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (Design Impact)
- Baseline established:
  - Behavior basis confirmed; Large/High confirmed.
  - The persisted-data decision, the single launch rule, validation reuse and Stop through the lifecycle queue pass.
  - Findings:
    - AR-001: the Save's offline gate is not atomic against a wake (the root gate does not run operations one at a time) and is checked per agent.
    - AR-002: Stop misses root-hosted copies a copy started, and the collaborator branch stops no copies.
    - AR-003: "follows its team" uses equality instead of the recorded own-default fact.
    - AR-004: a mixed Save can partly apply.
    - AR-005: selection inheritance by extra and teammate copies is unspecified.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (High), AR-002 (High), AR-003 (Medium), AR-004 (Medium), AR-005 (Low)
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: AR-002 needs user confirmation if REQ-009's "copies it started" is narrowed; collaborator Stop is not serialized against an incoming message (acceptable, noted).

### ARCH-REV-002 — Re-review of SR-005: AR-001..AR-005 resolved; new deadlock in the Stop lease wait

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change/tickets/in-progress/delegated-copy-model-change/design-review-report.md`
- Review round and trigger: Round 2; SR-005 from `/software_engineering_team/solution_designer`
- Triggering role, report path, and finding IDs: solution_designer, `handoff-architecture-design-complete.md` (SR-005), AR-001..AR-005
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Fail` (Design Impact)
- What changed:
  - All five prior findings are verified as resolved.
  - The requirement edits are confirmed editorial.
  - One new finding (AR-006): the forced Stop waits for live leases while holding the single FIFO queue head, but deliveries hold the sender's lease while submitting further queue steps (the inner wake, helper activation). The result is a deadlock of the whole root queue.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-005 Revision Notes AR-001 | Validate first, then a `reconfigure` queue step (task copies) or a handle activation fence (collaborators): re-check stopped, re-check targets, commit, swap in `commitAfterDurability`. Stopped is per copy (`isLive`); a not-started member of a running copy gets `COPY_RUNNING`. Tests named |
| AR-002 | Open (High) | Resolved (set selection); see AR-006 for the lease wait | SR-005 AR-002 | `delegatedStopSet` by `delegatorAgentRunId` and helper `creator`, recursively over all task-execution lists, innermost first; collaborators included; the unattributed limit is stated and reported |
| AR-003 | Open (Medium) | Resolved | SR-005 AR-003 | `memberFollowsTeam`: the recorded member `launchConfiguration` is absent and there is no own selection (recorded Teams); configured-launch equality applies only for configured-placement copies |
| AR-004 | Open (Medium) | Resolved | SR-005 AR-004 | `updateStoppedRunLaunchChanges`: one `withRootTransition`, one `validateMany`, one write |
| AR-005 | Open (Low) | Resolved | SR-005 AR-005; REQ-006 wording | Extra and teammate copies project from started values; test named |

- New or remaining finding IDs: AR-006 (High)
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: unattributed older copies (stated limit).

### ARCH-REV-003 — Re-review of SR-006 + SR-007: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change/tickets/in-progress/delegated-copy-model-change/design-review-report.md`
- Review round and trigger: Round 3; SR-006 (AR-006) and SR-007 (the user-approved UX simplification) from `/software_engineering_team/solution_designer`
- Triggering role, report path, and finding IDs: solution_designer, `handoff-architecture-design-complete.md` (SR-007), AR-006
- Relevant solution revision IDs: SR-006, SR-007
- Prior authoritative decision: `Fail` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed:
  - AR-006 is verified as resolved.
  - The SR-007 requirement change is user-approved and recorded with quotes.
  - Storage and semantics are unchanged; the label, Reset and `selection: null` are removed.
  - Two non-blocking implementation notes are recorded: the stopping-mark check in `acquireAtHead`, and the stale spec body (the Revision Notes are authoritative).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-006 | Open (High) | Resolved | SR-006; design-spec Revision Notes (SR-006) | Stop marks its set as stopping; new leases on those chains are refused (`TASK_EXECUTION_STOPPING`) before any queue submission; held leases drain outside the queue; non-waiting `stop` steps run innermost first; the mark clears in `finally`; collaborators use handle fences only. Rechecked against the code: the queue head is never held while waiting, so the nested `withLiveLease(target)` / `activate` of in-flight deliveries cannot be blocked behind the Stop. The required mid-`send_message_to` test is named |

- New or remaining finding IDs: None
- Material classification changes: None (`Large` / `High`)
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational notice to `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: unattributed older copies (stated limit); the queued-wake note (benign, non-blocking)
