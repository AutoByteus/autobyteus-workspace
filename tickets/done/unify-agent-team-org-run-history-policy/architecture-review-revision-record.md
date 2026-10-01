# Architecture Review Revision Record — Unified Team/Org run-history policy

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete | SR-001–SR-003 | N/A | Fail — Design Impact | DR-001 |
| ARCH-REV-002 | Round 2 / revised design after DR-001 | SR-001–SR-004 | Fail — Design Impact | Pass | DR-001 resolved |
| ARCH-REV-003 | Round 3 / API-REV-001 F-001 and CRR-002 CR-001 design recovery | SR-001–SR-005 | Pass (SR-004 only) | Pass (SR-005 design only) | CR-001/F-001 design gap addressed |

## Revision Entries

### ARCH-REV-001 — Initial independent design-review baseline

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/design-review-report.md`
- Review round and trigger: 1; `SR-003` Architecture Design Complete from Solution Designer.
- Triggering role, report path, and finding IDs: Solution Designer; `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/solution-handoff.md`; DR-001.
- Relevant solution revision IDs: SR-001–SR-003; approved requirements at SR-002.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail — Design Impact`.
- What changed in the review result or what baseline was established: Confirmed the approved policy and most target boundaries, but found the Team archive/unarchive manager-gate claim inconsistent with current code and supported concurrent archive/restore lifecycle. Design must make its gate and lock order actionable before implementation.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: DR-001.
- Material classification changes: None; `task_size=Medium`, `architectural_risk=High` remain justified.
- Recommended recipient: `/solution_designer`.
- Remaining risks or uncertainty: No executable-test claim; conditional unmerged memory-source integration; repair cannot recreate lost index-only facts.

### ARCH-REV-002 — Team archive transition-gate correction verified

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/design-review-report.md`
- Review round and trigger: 2; Solution Designer's SR-004 revised architecture package after ARCH-REV-001/DR-001.
- Triggering role, report path, and finding IDs: Solution Designer; `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/solution-handoff.md`; DR-001.
- Relevant solution revision IDs: SR-001–SR-004; approved baseline remains SR-002.
- Prior authoritative decision: `Fail — Design Impact` (ARCH-REV-001).
- Current authoritative decision: `Pass`.
- What changed in the review result or what baseline was established: SR-004 identifies the supported workspace Archive/message-triggered Restore overlap and specifies core queue → Team per-root manager transition lane → inside-lane inactive check → full tree/index transaction and compensation. It generalizes the existing Team deletion gate, matches Org’s queue/lane order, and includes deterministic both-order interleaving tests. No approved behavior changed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| DR-001 | Open / blocking Design Impact | Resolved | ARCH-REV-001, SR-004; BEH-002, REQ-002/004, AC-002, DS-003 | Current Team `setArchived` and manager lane confirmed as the original gap; revised `design-spec.md` user-path section, DS-003, shared-core contract, interface/removal/file mapping and change sequence explicitly specify gate scope/order and deterministic Restore-first/Archive-first tests. |

- New or remaining finding IDs: None.
- Material classification changes: None; `task_size=Medium`, `architectural_risk=High` remain justified.
- Recommended recipient: `/implementation_engineer` for primary pass handoff; `/solution_designer` for informational pass notification after it succeeds.
- Remaining risks or uncertainty: No executed tests in design worktree; conditional unmerged memory-source integration; repair cannot recreate lost index-only facts. These are explicit implementation/validation constraints, not review blockers.

### ARCH-REV-003 — Current Team imported-Memory read-bound design verified

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/design-review-report.md`
- Review round and trigger: 3; SR-005 design recovery after API-REV-001/F-001 and CRR-002/CR-001.
- Triggering role, report path, and finding IDs: Solution Designer; `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/solution-handoff.md`; downstream API-REV-001/F-001 and CRR-002/CR-001.
- Relevant solution revision IDs: SR-001–SR-005; approved requirements remain SR-002.
- Prior authoritative decision: `Pass` on SR-004 design (ARCH-REV-002), not on the current Team Memory path.
- Current authoritative decision: `Pass` on SR-005 design only; downstream code/API-E2E Fail results remain current until corrected and revalidated.
- What changed in the review result or what baseline was established: Confirmed the exposed imported-Memory Team list/run-list user path and N+N² current source behavior. SR-005 makes the current Team correction mandatory: pass each already-read validated root tree through tree-scoped member-location projection in the existing location owner, preserving nested member/path/card semantics and imported read-only behavior. The absent Org adapter remains conditional; no approved intent or persisted format changed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| DR-001 | Resolved in ARCH-REV-002 | Remains resolved | SR-004, ARCH-REV-002 | SR-005 does not change the Team archive/restore queue → manager-lane contract; IR-001 and focused integration evidence subsequently exercised it. |
| CR-001 / F-001 | Open downstream Design Impact / API-E2E Fail | Design-route gap addressed; implementation and validation still open | CRR-002, API-REV-001, SR-005, PM-002 | Revised `design-spec.md` DS-004, user-path, tree-scoped API/interface/file map and both-endpoint actual-hash test intent; source and measured 12/3 path independently confirmed. |

- New or remaining architecture-review finding IDs: None.
- Material classification changes: None; `task_size=Medium`, `architectural_risk=High` remain justified.
- Recommended recipient: `/implementation_engineer` for primary SR-005 reviewed-design correction; `/solution_designer` informational after primary handoff succeeds.
- Remaining risks or uncertainty: SR-005 is not yet implemented; API-REV-001 and CRR-002 remain Fail. Actual byte identity must be proven with before/after hashes, not the L-03 hard-coded flag. Conditional Org source is not in this branch.
