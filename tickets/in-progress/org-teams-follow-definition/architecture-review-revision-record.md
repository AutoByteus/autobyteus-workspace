# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-005) | SR-002, SR-004, SR-005 | N/A | Fail (Design Impact; one Requirement Gap) | AR-001..AR-006 |
| ARCH-REV-002 | Round 2 / SR-006, SR-007 resubmission | SR-006, SR-007 | Fail | Fail (Design Impact) | AR-001, AR-002 (narrowed), AR-007 (new); AR-003..AR-006 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review of org-teams-follow-definition

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-review-report.md`
- Review round and trigger: round 1; Solution Designer handoff, SR-005 (commit `ac6e53d602`)
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design.md`; none
- Relevant solution revision IDs: SR-002, SR-004, SR-005
- Prior authoritative decision: N/A
- Current authoritative decision: Fail
- Baseline established:
  - Approved basis confirmed: container direction, DEC-001..DEC-005.
  - Six findings: AR-001 address spaces; AR-002 composed Org view; AR-003 duplicate cross-run delivery; AR-004 wake of a user-stopped unit (Requirement Gap); AR-005 migration input map (context-file references, `counterpart` lines, reader predecessors); AR-006 derived consumers including folder walkers and memory sync.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (High), AR-002 (High), AR-003 (Medium), AR-004 (Medium, Requirement Gap), AR-005 (High), AR-006 (Medium)
- Material classification changes: None (Large / High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: notes in the report (notice merge, peer version skew, port wiring on single-unit restore)

### ARCH-REV-002 — Re-review of SR-006/SR-007

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-review-report.md`
- Review round and trigger: round 2; Solution Designer resubmission (commit `6136f46350`) after ARCH-REV-001; DEC-006 decided by the user 2026-11-22
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design.md`; AR-001..AR-006
- Relevant solution revision IDs: SR-006, SR-007
- Prior authoritative decision: Fail
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - AR-003, AR-004, AR-005 and AR-006 resolved.
  - AR-001 narrowed: the behavior is right, but the realization rests on a false premise (the Team tree schema refuses prefixed members, `team-run-execution-tree-schema.ts:47,54-55`) and the Team-side inventory is missing.
  - AR-002 narrowed to the snapshot/relay consistency mechanism.
  - New AR-007: the Org REST routes the unchanged web calls (context files, message references, file-change content) are removed or orphaned.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Still open (narrowed) | R-1 | Behavior correct (Org-space resolution, example); premise "existing supported shape" false (`team-run-execution-tree-schema.ts:54-55`); Team readers not inventoried |
| AR-002 | Open (High) | Still open (narrowed, Medium) | R-3 | Relay, de-dup, triggers, commands, reconnect, example present; per-unit base consistency missing |
| AR-003 | Open (Medium) | Resolved | R-2 | `CrossRunMessageDelivery` with `same_container` admission; port answers placement, relation and Org rules only |
| AR-004 | Open (Requirement Gap) | Resolved | SR-007, DEC-006, REQ-005 | User decision quoted; R-2 restores any not-live `same_container` receiver |
| AR-005 | Open (High) | Resolved (input map) | R-4 | Context files move, owner references rewritten with a frozen visitor; whole-line mapping of `counterpart` lines; reader rule with `waiting_for_<id>` and follow-ups. The route side moved to AR-007 |
| AR-006 | Open (Medium) | Resolved | R-5, FU-001 | About 75 files with dispositions; walkers decided; memory sync excluded (FU-001) |

- New or remaining finding IDs: AR-001 (High), AR-002 (Medium), AR-007 (High, new)
- Material classification changes: None (Large / High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: N-1 (one derivation of same-container), N-2
