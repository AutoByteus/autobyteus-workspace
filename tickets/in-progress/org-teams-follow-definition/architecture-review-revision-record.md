# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-005) | SR-002, SR-004, SR-005 | N/A | Fail (Design Impact; one Requirement Gap) | AR-001..AR-006 |
| ARCH-REV-002 | Round 2 / SR-006, SR-007 resubmission | SR-006, SR-007 | Fail | Fail (Design Impact) | AR-001, AR-002 (narrowed), AR-007 (new); AR-003..AR-006 resolved |
| ARCH-REV-003 | Round 3 / SR-008 resubmission | SR-008 | Fail | Fail (Design Impact) | AR-001 (narrowed); AR-002, AR-007 resolved |
| ARCH-REV-004 | Round 4 / SR-009 resubmission | SR-009 | Fail | Fail (Design Impact) | AR-001 (one mapping: `P` itself) |
| ARCH-REV-005 | Round 5 / SR-010 resubmission | SR-010 | Fail | Pass | AR-001 (resolved) |
| ARCH-REV-006 | Round 6 / SR-011 storage contract | SR-011 | Pass | Fail (Design Impact) | AR-008, AR-009 (new) |
| ARCH-REV-007 | Round 7 / SR-012 contract alignment | SR-012 | Fail | Pass | AR-008, AR-009 (resolved) |
| ARCH-REV-008 | Round 8 / SR-013 after CRR-001 CR-001 | SR-013 | Pass | Fail (Design Impact) | AR-010 (new) |
| ARCH-REV-009 | Round 9 / SR-014 resubmission | SR-014 | Fail | Pass | AR-010 (resolved) |
| ARCH-REV-010 | Round 10 / SR-015 after CRR-004 A-1 | SR-015 | Pass | Pass | None |
| ARCH-REV-011 | Round 11 / SR-016 after delivery DR-001 | SR-016 | Pass | Fail (Design Impact) | AR-011 (new) |

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

### ARCH-REV-003 — Re-review of SR-008

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-review-report.md`
- Review round and trigger: round 3; Solution Designer resubmission at SR-008 (commit `c89b409455`) after ARCH-REV-002
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design.md`; AR-001, AR-002, AR-007
- Relevant solution revision IDs: SR-008
- Prior authoritative decision: Fail
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - AR-002 and AR-007 resolved.
  - AR-001's realization is now right (option (i), team-space trees, IF-06 withdrawn), but the translator's application is stated as four call sites. `delegate_task` (CM-1 refusal escapes), the received-message sender address (`reachingAddressOf`) and the send result's `agentAddress` are untranslated (MP-05, MP-06).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Still open (narrowed, Medium) | R-1' | Team-space trees match `team-run-execution-tree-schema.ts:47,54-55`; translator correct; missing surfaces at `catalog-delegation.ts:104-111` with `team-execution-index.ts:147-153`, `message-recipient-resolution.ts:96-115`, `root-communication-engine.ts:370` |
| AR-002 | Open (Medium) | Resolved | R-3'' | Per-unit `openViewSnapshotConnection`s, post-base relay queued per connection, re-open on in-band snapshot, exactly-once test |
| AR-007 | Open (High) | Resolved | R-7, R-4 (a) revised, R-5 rows | All three Org routes kept as container edges; files move with folders; saved references keep the Org owner form; no trace rewriting |

- New or remaining finding IDs: AR-001 (Medium)
- Material classification changes: None (Large / High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: none beyond the report's notes

### ARCH-REV-004 — Re-review of SR-009

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-review-report.md`
- Review round and trigger: round 4; Solution Designer resubmission at SR-009 (commit `ba4fb98497`) after ARCH-REV-003
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design.md`; AR-001
- Relevant solution revision IDs: SR-009
- Prior authoritative decision: Fail
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - The ARCH-REV-003 gaps are resolved: one tool-facing boundary with an in/out surface inventory covering `delegate_task` normalization, `reachingAddressOf`, `agentAddress`, mentions and `list_available_agents`.
  - New evidence on one mapping: `fromOrgInput(P) = /`. `send_message_to(P)` reaches the coordinator today (`team-execution-index.ts:161-169`, `message-recipient-resolution.ts:51-52`) but would be refused as a root address (`team-recipient-resolver.ts:42-46`). `delegate_task(P)` is refused with the root-address error instead of the CM-1 text (`collaborator-errors.ts:81-82`), because the own-team check does not see `/` (`team-execution-index.ts:147-153`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium) | Still open (one mapping) | R-1'' | Surface inventory complete; `P` mapping wrong for both tools (MP-07; MP-05's refusal text) |

- New or remaining finding IDs: AR-001 (Medium)
- Material classification changes: None (Large / High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: none beyond earlier notes

### ARCH-REV-005 — Re-review of SR-010

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-review-report.md`
- Review round and trigger: round 5; Solution Designer resubmission at SR-010 (commit `d1f6b157f7`) after ARCH-REV-004
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design.md`; AR-001
- Relevant solution revision IDs: SR-010
- Prior authoritative decision: Fail
- Current authoritative decision: Pass
- What changed: `P` gets its meaning per surface, as today. Messages go to the coordinator (result `agentAddress` `P`, matching `memberOfInstance`'s `agent_team` placement at `team-execution-index.ts:161-169`). Delegation gets the CM-1 refusal before the root check. Mentions and `list_available_agents` show `P`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium) | Resolved | R-1''' | Per-surface table; example with `send_message_to(P)`, `delegate_task(P)` and `delegate_task(P/x)` (exact CM-1 text, `collaborator-errors.ts:81-82`), another unit allowed; tests named |

- New or remaining finding IDs: None
- Material classification changes: None (Large / High)
- Recommended recipient: implementation, per the handoff rules
- Remaining risks or uncertainty: implementation notes in the report (self target, migration §9 fixtures and registry classification, exactly-once composition test, release-note lines, FU-001)

### ARCH-REV-006 — Review of the SR-011 storage contract

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-review-report.md`
- Review round and trigger: round 6; SR-011 (commit `cacc98e99c`) adds the normative `org-container-storage-contract.md` and `contract-validation.md` at the user's request; the design structure is unchanged from SR-010
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design.md`; none
- Relevant solution revision IDs: SR-011
- Prior authoritative decision: Pass (ARCH-REV-005)
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - Most of the contract is consistent and validated; V-5's counts were re-checked read-only.
  - New AR-008: the cross-unit `counterpart` in contract §5/§9 differs from the reused writer (recorded only for unrelated pairs; the receiver line's address comes from `senderIdentity.memberAddress`, in team space; `cross-run-message-delivery.ts:214`, `root-communication-engine.ts:315`).
  - New AR-009: `applicationBinding` is on Team units but not agent units, while the design keeps it on the container; the task-records file is residue in the contract but "converted, then removed" in the design.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001..AR-007 | Resolved (ARCH-REV-005) | Resolved; the contract matches them | SR-011 contract §2–§10 | V-1..V-6; read-only re-count |

- New or remaining finding IDs: AR-008 (Medium), AR-009 (Low)
- Material classification changes: None (Large / High)
- Recommended recipient: Solution Designer; on the next pass the contract goes to implementation
- Remaining risks or uncertainty: none beyond the report's notes

### ARCH-REV-007 — Re-review of the SR-012 contract alignment

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-review-report.md`
- Review round and trigger: round 7; SR-012 (commit `cbee164d55`) aligns `org-container-storage-contract.md` and the design after ARCH-REV-006
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design.md`; AR-008, AR-009
- Relevant solution revision IDs: SR-012
- Prior authoritative decision: Fail
- Current authoritative decision: Pass
- What changed:
  - Contract §5 pins `counterpart` recording for `same_container` at both code points, with Org addresses and a live-vs-converted test.
  - §11 gives one application-ownership rule for both unit kinds; the design's Change Scope agrees.
  - The task-records residue is consistent with the design's Removal Plan.
  - New premise MP-09 (application-bound Org agent units would be collaboration-ineligible) rejected as Not Reachable: no surface creates application-bound Orgs (`api/graphql/types/agent-org-run.ts:40-45`; no application orchestration path). Kept as a residual note.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-008 | Open (Medium) | Resolved | Contract §5, §9 | Recording rule at `cross-run-message-delivery.ts:214` and `root-communication-engine.ts:315`; receiver address from the boundary's `toOrg`; test named |
| AR-009 | Open (Low) | Resolved | Contract §9, §11; design Change Scope, Removal Plan | One rule (Team unit `applicationBinding`, agent unit `applicationExecutionContext`); records file left as residue in both documents |

- New or remaining finding IDs: None
- Material classification changes: None (Large / High)
- Recommended recipient: implementation, per the handoff rules, with the contract
- Remaining risks or uncertainty: MP-09 note; earlier implementation notes

### ARCH-REV-008 — Review of SR-013 (R-8, after CRR-001 CR-001)

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-review-report.md`
- Review round and trigger: round 8; SR-013 (commit `4af1427fc3`) after the code reviewer's CRR-001 CR-001 (Design Impact). Implementation at `46e53e9ed0`.
- Triggering role, report path, and finding IDs: code reviewer, `code-review-report.md`, CR-001; Solution Designer, SR-013
- Relevant solution revision IDs: SR-013
- Prior authoritative decision: Pass (ARCH-REV-007)
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - R-8's reach rule (a contained assigner contributes its container's Org-address placements) is accepted.
  - New AR-010: R-8's delivery is given as a `same_container` admission. In the implemented code, the relation also sets `counterpart` (`root-communication-engine.ts:318-319`, `cross-run-message-delivery.ts:251-252`) and view scope (`message-view-scope.ts:27` vs `:28-33`). Today these messages are `related`.
- Review gap acknowledged: ARCH-REV-001..005 accepted "delegation origin = unit run" without tracing step-2 reach for runs those units delegate. CRR-001 found it.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001..AR-009 | Resolved | Resolved | — | Unaffected by R-8 |

- New or remaining finding IDs: AR-010 (Medium)
- Material classification changes: None (Large / High)
- Recommended recipient: Solution Designer; CR-002..CR-004 and N-1 go to implementation with the next pass
- Remaining risks or uncertainty: contract §9 wording note

### ARCH-REV-009 — Re-review of SR-014

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-review-report.md`
- Review round and trigger: round 9; SR-014 (commit `239e1dd0de`) after ARCH-REV-008
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design.md`; AR-010
- Relevant solution revision IDs: SR-014
- Prior authoritative decision: Fail
- Current authoritative decision: Pass
- What changed:
  - The delegation-chain case is `related` (the Task rule extended through `chainOf`): restored when stopped, no `counterpart`, `MessageViewScope` rule 1.
  - `same_container` applies to two units only, with one decision order.
  - The contract's §5, §9 and §10 are aligned.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-010 | Open (Medium) | Resolved | § SR-014, contract §5/§9/§10 | Related branch at `cross-run-message-delivery.ts:214`, `root-communication-engine.ts:315`; view rule `message-view-scope.ts:28-33`; live/converted identity test named |

- New or remaining finding IDs: None
- Material classification changes: None (Large / High)
- Recommended recipient: implementation, per the handoff rules, with CRR-001's CR-002..CR-004 and N-1
- Remaining risks or uncertainty: test-wording note on which views show another-unit messages

### ARCH-REV-010 — Review of SR-015 (former-member refusal for other units)

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-review-report.md`
- Review round and trigger: round 10; SR-015 (commit `be7e3110c0`) after the code reviewer's failure-origin review CRR-004 A-1 (Requirement Gap, decided as DEC-007 by the Solution Designer within REQ-002, user informed)
- Triggering role, report path, and finding IDs: code reviewer, `code-review-report.md`, A-1; Solution Designer, SR-015
- Relevant solution revision IDs: SR-015
- Prior authoritative decision: Pass (ARCH-REV-009)
- Current authoritative decision: Pass
- What changed:
  - `CollaborationTree.resolve` refuses a Team unit's former or leaving member at `P/x` with autobyteus-22's exact text. It asks the owning Team unit (`formerMemberAt`) and presents the address through `ContainedTeamAddressSpace`.
  - The test wording follows the ARCH-REV-009 note.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: None
- Material classification changes: None (Large / High)
- Recommended recipient: implementation, per the handoff rules
- Remaining risks or uncertainty: answer `formerMemberAt` from the stored tree for a non-live unit (no wake to refuse); wording suggestion only

### ARCH-REV-011 — Review of SR-016 (re-integration with autobyteus-587 and -599)

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-review-report.md`
- Review round and trigger: round 11; SR-016 (commit `7361b6627e`) after delivery DR-001 (Blocked: conflicts with `origin/personal` `f2c0d2a902`)
- Triggering role, report path, and finding IDs: delivery engineer, `release-deployment-report.md`, DR-001; Solution Designer, SR-016
- Relevant solution revision IDs: SR-016
- Prior authoritative decision: Pass (ARCH-REV-010)
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - SR-016's runtime mapping is accepted: units are ordinary runs; the container's `remoteNodeOf: null`; deleted files stay deleted; FU-003 moves onto the base's node path.
  - New AR-011: 587 is released (`11b7ed5444` in tag `v1.5.14-beta.7`) and stores absolute received-file paths into the member's folder in `referenceFiles` (`transferred-files.ts`, `root-communication-engine.ts:250-251`, `agent-org-run.ts:113`). The conversion moves those folders and keeps lines unchanged, and the Org reference route serves the stored path (`agent-org-reference-content-service.ts:71-92`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001..AR-010 | Resolved | Resolved | — | Unaffected by SR-016 |

- New or remaining finding IDs: AR-011 (Medium)
- Material classification changes: None (Large / High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: check 599 for stored paths under Org member folders outside `work_journal/`
