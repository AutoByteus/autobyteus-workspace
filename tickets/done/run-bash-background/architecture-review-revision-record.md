# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large, High), 2026-11-10 | SR-001, SR-002, SR-003 | N/A | Fail (Design Impact) | AR-001 to AR-008 |
| ARCH-REV-002 | Round 2 / SR-004 revision for ARCH-REV-001, 2026-11-10 | SR-004 | Fail | Fail (Design Impact, narrow) | AR-003, AR-007 (reduced), AR-010 (new) |
| ARCH-REV-003 | Round 3 / SR-005 revision for ARCH-REV-002, 2026-11-10 | SR-005 | Fail | Pass | AR-003, AR-007, AR-010 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review: sound ownership, wrapper contract and delivery rules need revision

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background/tickets/in-progress/run-bash-background/design-review-report.md`
- Review round and trigger: round 1; handoff `architecture-design-handoff.md` from the Solution Designer
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` (SR-003); N/A
- Relevant solution revision IDs: SR-001, SR-002, SR-003
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`, classification `Design Impact`
- What changed in the review result or what baseline was established: baseline. Behavior basis confirmed; classification Large/High confirmed. Ownership, boundaries, capability reuse, persisted-data decision (Directly Usable — No Migration) and removal plan pass. Findings: AR-001 background-form trap never runs (probe); AR-002 `kill <pid>` of `&` jobs leaves descendants against REQ-011/REQ-007 (probe); AR-003 wrapper code runs in the user's shell state (`set -e`, `set -x`, EXIT trap, `sh` path; probes); AR-004 call-return output boundary and frame channel undefined; AR-005 per-call vs per-job output file; AR-006 REQ-015 timing; AR-007 taken-but-undelivered ends and app-quit suppression rule; AR-008 stale text after SR-003.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001, AR-002, AR-003, AR-004, AR-005, AR-006, AR-007, AR-008
- Material classification changes: None
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: residual R-1 to R-5 in the report; AR-002 may become a requirement change for the user

### ARCH-REV-002 — SR-004 re-review: most findings resolved, three small items remain

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background/tickets/in-progress/run-bash-background/design-review-report.md`
- Review round and trigger: round 2; Solution Designer's SR-004 revision for ARCH-REV-001 (`architecture-design-handoff.md` "Round 2 (SR-004)")
- Triggering role, report path, and finding IDs: Solution Designer, `solution-revision-record.md` SR-004; AR-001 to AR-008
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: Fail (ARCH-REV-001)
- Current authoritative decision: Fail, `Design Impact`, narrow (no structural change needed)
- What changed in the review result: the wrapper contract is now concrete (skeletons for both forms, fds 62/63, per-stream call boundary, grammar), the delivery rules are explicit, and the user approved the `&`-job narrowing (DEC-012). The designer's 11-case probe reproduces here on bash 3.2.57. A reviewer case built from the probe's own skeleton shows a remaining gap: with `IFS=$'\n\t'` and two jobs, no end is reported (MP-009). The DS-006 arrow chain contradicts its return rules, and DEC-013's still-running list has no interface.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open | Resolved | SR-004; design-spec Command Wrapper Contract (background form) | Probe case 8 rerun: nothing left after `kill <pid>`; form matches the kill probe's |
| AR-002 | Open | Resolved (requirement narrowed by the user) | SR-004; requirements DEC-012, REQ-007, REQ-011, AC-010; design R-F | DEC-012 recorded with the user's words; probe case 11 shows the accepted behavior |
| AR-003 | Open | Partially resolved; still open (IFS) | SR-004; Command Wrapper Contract rules | Cases 2-6 pass on rerun; reviewer strict-mode case fails (MP-009) |
| AR-004 | Open | Resolved | SR-004; fds 62/63, call boundary rule, grammar ≤ 2,048 bytes | Probe case 6 (`exec >/dev/null 2>&1`) rerun: frames and marker arrive |
| AR-005 | Open | Resolved | SR-004; `BackgroundOutputLog` row, `BackgroundTaskStart`, notice example | One log per call, shared-tail wording |
| AR-006 | Open | Resolved | SR-004; DS-003 300 ms settle | Probe case 10: pid gone 13 ms after `kill` |
| AR-007 | Open | Partially resolved; still open (state chain text) | SR-004; DS-006 return rules; manager `reportable: false` | design-spec line 194 contradicts line 195 |
| AR-008 | Open | Resolved | SR-004; Terminology, P3 and rejection rows, types row, `manager.run`, outcome variants, requirements header | Checked in the current artifacts |

- New or remaining finding IDs: AR-003 (IFS), AR-007 (chain text), AR-010 (new: still-running list interface)
- Material classification changes: AR-002 resolved by a user-approved requirement change instead of a design mechanism
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: residual R-6 (fd 62/63 inheritance; check the WSL bridge in implementation), R-7, R-8, R-9 in the report

### ARCH-REV-003 — SR-005 re-review: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background/tickets/in-progress/run-bash-background/design-review-report.md`
- Review round and trigger: round 3; Solution Designer's SR-005 revision for ARCH-REV-002 (`architecture-design-handoff.md` "Round 3 (SR-005)")
- Triggering role, report path, and finding IDs: Solution Designer, `solution-revision-record.md` SR-005; AR-003, AR-007, AR-010
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: Fail (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result: the three remaining items are resolved in the canonical artifacts. The probe's 12 cases reproduce on bash 3.2.57, and the reviewer's strict-mode and `IFS=,` cases pass on the SR-005 skeleton. Non-blocking R-6/R-7 are recorded in the design's Risks; R-8 and R-9 wording is fixed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-003 | Partially resolved (IFS open) | Resolved | SR-005; design-spec contract `builtin unset IFS` and rules; R-0 list; probe case 12 | Probe case 12 rerun: 3 and 7 reported; reviewer strict-mode case: 3 and 7, no wrapper text in stderr; `IFS=,` three-job case: running jobs reported |
| AR-007 | Partially resolved (chain text) | Resolved | SR-005; DS-006 chain | Chain, state list (Idle, Pending, Settling, InFlight) and return rules agree: failed / not accepted → Pending; cancelled / release → drop |
| AR-010 | Open (new in round 2) | Resolved | SR-005; capability `listRunning()`, `AgentRun.listRunningBackgroundTasks()`, `BackgroundTaskStart.startedAt` | Interface Boundary Mapping, facades and file mapping name one owner (`manager.list()`); service does not derive the set from events |

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: implementation engineer (primary); Solution Designer (informational)
- Remaining risks or uncertainty: R-0 (WSL and Linux bash tests), R-6 (WSL bridge with inherited fds), R-7, R-B and the design's other accepted risks; ASM-002 in live E2E
