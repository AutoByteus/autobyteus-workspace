# Architecture Review Revision Record — Runtime-specific stopped-run model switching

The latest `design-review-report.md` is authoritative. This file indexes completed review rounds.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / High-risk completed architecture design | SR-002, SR-003 | N/A | Pass | None |
| ARCH-REV-002 | Round 2 / SR-007 revised design and user-requested additional review | SR-006, SR-007 | Pass (SR-003 only) | Fail — Design Impact | DR-001 |
| ARCH-REV-003 | Round 3 / SR-009 recovery of DR-001 | SR-008, SR-009 | Fail — Design Impact | Pass | DR-001 resolved |

## Revision Entries

### ARCH-REV-001 — Initial independent architecture baseline

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-review-report.md`
- Review round and trigger: 1; Solution Designer's completed Medium-size, High-risk SR-003 package.
- Triggering role, report path, and finding IDs: Solution Designer; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/architecture-design-result.md`; none.
- Relevant solution revision IDs: SR-002 (approved behavior), SR-003 (reviewed design).
- Prior authoritative decision: N/A — no prior architecture-review result; the old completed ticket is historical evidence only.
- Current authoritative decision: **Pass**.
- What changed in the review result or what baseline was established: confirmed BEH-001–006 against approved requirements and current code; accepted one shared runtime-specific eligibility owner, narrowed GraphQL/Web option shape, native-only capacity evidence, existing stopped Save/restore boundaries and directly usable persisted data without migration. No blocking finding.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none.
- Material classification changes: none; `task_size=Medium`, `architectural_risk=High` retained.
- Recommended recipient: primary implementation recipient and then informational Solution Designer recipient, as returned by `get_handoff_rules`.
- Remaining risks or uncertainty: representative smaller-window provider continuation unverified; separate Web label/schema catalog can lag server options; GraphQL option field removal must stay synchronized and any proven external consumer contract returned for review.

### ARCH-REV-002 — Reviewed Claude normalization and saved-current reach

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-review-report.md`
- Review round and trigger: 2; Solution Designer's SR-007 Medium/High package after SR-006 approval and explicit additional-review request.
- Triggering role, report path, and finding IDs: Solution Designer; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/architecture-design-revision-result.md`; DR-001.
- Relevant solution revision IDs: SR-006 (approval), SR-007 (design). ARCH-REV-001 covered only SR-002/SR-003.
- Prior authoritative decision: Pass for SR-003, not the Claude delta.
- Current authoritative decision: **Fail — Design Impact**.
- What changed: stopped-run offered/current catalog view and richer DTO are coherent, but normalized provider snapshots and `listLlmModels` reach supported Agent/Team new-run and Application Launch Setup/readiness consumers with saved exact `default`. Their current exact-ID lookup would report it unavailable; SR-007 lacks their current-value path.

#### Prior Finding Resolution

None — ARCH-REV-001 had no findings. Its old Pass was not reused.

- New or remaining finding IDs: DR-001.
- Material classification changes: changed-basis result Pass → Fail; task size Medium and architectural risk High retained.
- Recommended recipient: `/solution_designer`; no implementation handoff.
- Remaining risks or uncertainty: installed affected application prevalence unknown; provider smaller-window continuation remains downstream validation; corrected design must retain GraphQL/Web integration checks.

### ARCH-REV-003 — Exact-current launch and application recovery verified

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-review-report.md`
- Review round and trigger: 3; Solution Designer's SR-009 Medium/High design recovery after ARCH-REV-002.
- Triggering role, report path, and finding IDs: Solution Designer; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/architecture-design-recovery-result.md`; DR-001.
- Relevant solution revision IDs: SR-008 (review feedback/data check), SR-009 (current design); approved intent remains SR-006.
- Prior authoritative decision: Fail — Design Impact (ARCH-REV-002).
- Current authoritative decision: **Pass**.
- What changed: SR-009 adds DS-07/08 and ModelCatalogService exact-current resolution for Agent/Team definition-to-Run, Web launch/application current display/schema, and application host readiness/credential metadata. Normalized provider snapshots remain newly offered choices only; stopped Save and exact saved-ID semantics remain distinct.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| DR-001 | Blocking Design Impact in ARCH-REV-002 | **Resolved** | SR-008, SR-009; REQ-008/AC-010–011 | Independently checked SR-009 DS-07/08, target contracts, owner/file map, sequence and concrete example against the current Web exact-ID and application host-validator call paths recorded in ARCH-REV-002 MP-001/002. Exact-current descriptor/query and validator method now preserve saved `default` without adding it to offered rows. E23 local run inventory is corroboration, not the reachability basis. |

- New or remaining finding IDs: none.
- Material classification changes: Fail → Pass; task size Medium and architectural risk High retained.
- Recommended recipient: primary implementation recipient, then informational Solution Designer recipient under returned rules.
- Remaining risks or uncertainty: provider continuation matrix and integrated GraphQL/Web/current-seed tests are downstream; installed definition/application prevalence unknown; workspace-scoped Codex lookup should be verified if the cross-runtime descriptor query uses it.
