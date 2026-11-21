# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-007) | SR-005, SR-006, SR-007 | N/A | Fail (Design Impact) | AR-001..AR-006 |
| ARCH-REV-002 | Round 2 / SR-008 resubmission | SR-008 | Fail (Design Impact) | Pass | AR-001..AR-006 (resolved) |
| ARCH-REV-003 | Round 3 / SR-009 after CRR-002 | SR-009 | Pass | Fail (Design Impact) | AR-007, AR-008, AR-009 (new) |
| ARCH-REV-004 | Round 4 / SR-010 resubmission | SR-010 | Fail (Design Impact) | Pass | AR-007, AR-008, AR-009 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review of team-run-follows-definition

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/design-review-report.md`
- Review round and trigger: round 1; Solution Designer handoff, Architecture Design Complete at SR-007 (commit `ae125b7f85`)
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design.md`; none
- Relevant solution revision IDs: SR-005, SR-006, SR-007
- Prior authoritative decision: N/A
- Current authoritative decision: Fail (Design Impact)
- Baseline established:
  - Approved basis confirmed. Committer, persistence lock, lazy-start, restore and notice paths verified against base `a07767f4d0`.
  - Six design findings: the leaving member's run-ID paths (AR-001); scope discriminator (AR-002); same-address replacement (AR-003); open Team view not updated (AR-004); refusal entry forms (AR-005); member-context ownership (AR-006).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (High), AR-002 (Medium), AR-003 (Medium), AR-004 (High), AR-005 (Medium), AR-006 (Low)
- Material classification changes: None (Large / High preserved; AR-004 adds web/stream surfaces)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: N-1..N-5 in the report

### ARCH-REV-002 — Re-review of SR-008

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/design-review-report.md`
- Review round and trigger: round 2; Solution Designer resubmission at SR-008 (commit `a54485a260`) after ARCH-REV-001 Fail
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design.md`; AR-001..AR-006
- Relevant solution revision IDs: SR-008
- Prior authoritative decision: Fail (Design Impact)
- Current authoritative decision: Pass
- What changed:
  - Basis reconfirmed (requirements unchanged).
  - The skill's updated design principles and report template were applied (The Approach, Principle 13 empty indirection check, Principle 16, Case 10).
  - All six findings verified against the code at `a07767f4d0`.
  - New premise MP-04 rejected as Not Reachable: Team definitions are validated with `own_team`, so followed runs have no external `to`.
  - The round-1 ruling on the copy mount path holds, with a corrected rationale (N-7: copy trees are in team space; the formula always gives `/`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-008 § Member States And Call-Site Rules | Rule table covers `root-communication-engine.ts:127` (split `maySend`/`isCurrentAgent` on `root-communication-port.ts:50`), `executeAgentCommand` `root-team-run.ts:321-339` incl. `isLiveAgent`/`requireContainingTeamRun`, log owner (`:134`), statuses; the receiver path `reserveRecipientInput` (`team-communication-port.ts:62`) stays current-only; visibility: "Leaving" until stopped |
| AR-002 | Open (Medium) | Resolved | SR-008 D-SCOPE | `copiedFrom` recorded at creation via `CreateTeamRunInput` (`team-run-service.ts:63-77`); creation only through `DelegatedRunStarter.startTeam` (`task-delegation.ts:253`, `remote-team-run-starter.ts:34`); mutators spread the tree so it is kept; peer path noted (N-6) |
| AR-003 | Open (Medium) | Resolved | SR-008 Address reuse and rejoin | Registry keyed by run ID; rejoin while leaving cancels the leave; web keys contexts by run ID (`teamExecutionViewState.ts:127-146`) |
| AR-004 | Open (High) | Resolved | SR-008 DS-007 | In-band snapshot re-open is the existing mode-switch mechanism (`team-view-session.ts:115-160`); web accepts it (`TeamStreamingService.ts:312-329`) and plans contexts and focus (`teamExecutionViewState.ts:240-300`); the forced re-enter is noted for implementation |
| AR-005 | Open (Medium) | Resolved | SR-008 call-site table | Former-member refusal in both `resolveMessageRecipient` steps and `deliverToRunId` |
| AR-006 | Open (Low) | Resolved | SR-008 One owner of member runtime contexts | `replace(committedTree, leaving)` sole creator, retained contexts kept by run ID; `applyMembership` handles only |

- New or remaining finding IDs: None
- Material classification changes: None (Large / High)
- Recommended recipient: implementation, per the handoff rules
- Remaining risks or uncertainty: N-5..N-10 and the `TeamViewSession` re-enter note in the report; real-runtime E2E per the Verification Intent

### ARCH-REV-003 — Re-review of SR-009 (after the failure-origin review CRR-002)

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/design-review-report.md`
- Review round and trigger: round 3; Solution Designer resubmission at SR-009 (commit `889acfc318`) after `/code_reviewer` CRR-002 (CR-002 Design Impact, CR-001 Local Fix, O-1, O-2)
- Triggering role, report path, and finding IDs: code reviewer, `code-review-report.md`, CR-001, CR-002; Solution Designer, SR-009
- Relevant solution revision IDs: SR-009
- Prior authoritative decision: Pass (ARCH-REV-002)
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - Read against the implementation (`6b46ec5bdd`).
  - Accepted: SR-009's rendered surface, the stored marker, `ownsAgentRun`, O-1/O-2 and the panel removal.
  - New findings AR-007 (the marker on a stopped run), AR-008 (the release sequence's owner and order), AR-009 (delegated Team rows built from a second source).
- Review gap acknowledged: ARCH-REV-001/002 accepted `TeamMembersPanel.vue` as the rendered member list without checking that anything mounts it, and judged N-8 "brief and expected". CR-002 found it. From now on, a UI surface the design names is checked for a mounting importer.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001..AR-006 | Resolved (ARCH-REV-002) | Resolved; AR-004's surface superseded by SR-009 DS-007 | SR-009 | AR-004's intent (the open view learns about member changes) holds; its rendered-surface mapping was wrong (CR-002), now the run-tree rows |
| N-8 (note) | Open note | Superseded by SR-009; follow-on gaps AR-007, AR-009 | SR-009 DS-007 | `run-tree-view.ts:150-205`, `run-tree-records.ts:79-93` |

- New or remaining finding IDs: AR-007 (Medium), AR-008 (Medium), AR-009 (Medium)
- Material classification changes: None (Large / High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: CR-001 as an implementation Local Fix; O-1 warn-once reset; N-5..N-10

### ARCH-REV-004 — Re-review of SR-010

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/design-review-report.md`
- Review round and trigger: round 4; Solution Designer resubmission at SR-010 (commit `30ebc16223`) after ARCH-REV-003 Fail
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design.md`; AR-007, AR-008, AR-009
- Relevant solution revision IDs: SR-010
- Prior authoritative decision: Fail (Design Impact)
- Current authoritative decision: Pass
- What changed:
  - The three findings were verified against the code.
  - Confirmed that a stopped run's view snapshot already shows no leaving members (`stored-team-package-snapshot.ts:11`), matching the new reading rule.
  - New premise MP-07 (rejoin during a stop's finish) rejected as Not Reachable (artificial timing); a guard is suggested in N-12.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-007 | Open (Medium) | Resolved | SR-010 DS-007, visibility line | `teamMemberRowsOf(ownTeam, isLive)`: leaving reads as former outside a live run; `isLiveTeamRun` from the active root directory (`active-collaboration-root-directory.ts:55-170`); unregister calls `runPartsChanged` (manager `:172,216,376`); restore follow clears stale markers |
| AR-008 | Open (Medium) | Resolved | SR-010 DS-004, ownership map, AR-006 bullets, interface table | Marker = removed with a live execution, written from `liveExecutionIds` under the lock; manager only stops and notifies (`released` → `memberStopped`); committer owns write → replace → `removeStoppedHandle` → `runPartsChanged` → event; `release` removed; indeterminate write fail-stops, definite failure healed by the next plan |
| AR-009 | Open (Medium) | Resolved | SR-010 DS-007, file mapping | `run-tree-records.ts:79-93` reads the child's `ownTreeOf` through the same `teamMemberRowsOf`; `agentsOf` keeps its meaning for messages and history |

- New or remaining finding IDs: None
- Material classification changes: None (Large / High)
- Recommended recipient: implementation, per the handoff rules (with CR-001 as a Local Fix in the same round)
- Remaining risks or uncertainty: N-12, N-13, N-14; N-5, N-6, N-7, N-9, N-10
