# Solution Revision Record — Runtime-specific stopped-run model switching

## Revision Index
| ID | Phase | Trigger | Prior status | Current status | Result |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | User request 2026-09-25 + current-code investigation | N/A for this package; earlier separate `stopped-run-compatible-model` completed | Ready for Approval | Proposed runtime-specific replacement rule; no design or implementation authorization |
| SR-002 | Requirements | Explicit user approval 2026-09-25 | Ready for Approval | Approved | Same requirements baseline authorized for architecture design |
| SR-003 | Design | Post-approval architecture investigation | Approved / design N/A | Approved / Architecture Design Complete | Medium size, High architectural risk; independent review route required |

## SR-001 — Runtime-specific eligibility proposal
- Classification: Initial Baseline / Requirement Gap relative to prior RER-004.
- Trigger: user asks that every runtime-provided external model be switchable, except AutoByteus remains restricted; screenshot of Claude Team picker showing only saved model.
- Prior authority: separate completed `tickets/done/stopped-run-compatible-model/requirements-doc.md`, approved 2026-09-08, applies non-decreasing verified capacity to all runtimes. It is not edited retroactively.
- Current authority: `requirements-doc.md` Ready for Approval; `investigation-notes.md` current evidence; design N/A — not yet applicable.
- Affected IDs: BEH-001–006; SCN-001–006; REQ-001–007; AC-001–009; DEC-001–003.
- Scenario validity: SCN-001–004 supported normal, SCN-005–006 supported explicit edges. New external smaller/unknown model eligibility is proposed, not approved.
- Intended behavior changed: **Yes**. External runtime capacity restriction would be removed; AutoByteus rule/lifecycle/history boundary preserved. Org parity and external runtime-normal compaction/rejection caveat are included for user decision.
- Approval impact: no new approval received. Prior RER-004 approval cannot authorize this policy. Behavior-defining supplements: N/A. Screenshot is evidence only.
- Design/review/routing: N/A until approval; no task-size/risk classification yet. Independent review artifacts: N/A — not applicable yet.
- Handoff-rule outcome: no matching rule for a Ready-for-Approval requirements hold; `requirements-review-result.md` records the rule check and returns the decision to the user.
- Worktree/base: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch`, `codex/runtime-specific-stopped-model-switch`, refreshed `origin/personal` at `a2694ed453e353550d8b345fa82ef489634dcaf2`; finalization target `origin/personal` subject to delivery.
- Remaining gap: explicit user decision on DEC-001–003; actual small-window provider continuation unverified and must be validated downstream. No Product Design request.
- Next action: present concise analysis and proposed approval basis to the user; hold architecture/implementation.

## SR-002 — Explicit approval of runtime-specific eligibility
- Classification: Requirements approval; no new behavior beyond the presented SR-001 baseline.
- User reply: “yes. basically no need to consider context sidze for those runtime. because its handled by those runtimes right? it should not be blcoked by our platform”. It answered the immediately preceding approval question covering stopped Agent/Team/Org Settings, smaller/unknown external model capacities, AutoByteus exception, and provider-native context-management/failure caveat.
- Prior requirements/design status: Ready for Approval / N/A. Current: Approved / architecture investigation pending.
- Affected IDs: DEC-001–003 resolved; REQ-001–007, AC-001–009, SCN-001–006, BEH-001–006 approved without semantic edits.
- Scenario validity: unchanged. No Product supplement or visual reference approval is implied; both N/A.
- Intended behavior changed from prior delivered package: Yes, as fully recorded in SR-001; this reply authorizes the current new baseline.
- Approval basis: `requirements-doc.md` at SR-001 plus the explicit 2026-09-25 user reply quoted above. Behavior-defining supplements: N/A. User screenshot remains current-state evidence only.
- Design/review/routing: affected design not yet created; old ticket's design/reviews do not approve this delta. Task size/risk N/A until design completion.
- Remaining risk: actual smaller-window external provider behavior requires validation; approval removes *our* capacity gate and does not guarantee every provider inference succeeds.
- Next action: architecture investigation/design, classification and applicable review/implementation route.

## SR-003 — Completed architecture design
- Phase/classification: Design, no intended-behavior change.
- Trigger: SR-002 approved requirements; architecture investigation AE-01–AE-09 in `investigation-notes.md`.
- Prior authoritative status: requirements Approved; design N/A. Current: requirements Approved on same SR-002 basis; `design-spec.md` Ready — Architecture Design Complete.
- Affected IDs: BEH-001–006, REQ-001–007, AC-001–009, SCN-001–006 mapped without redefinition.
- Canonical sections: investigation architecture findings/persisted-state evidence; design policy, production paths, owners, API shape, removal, migration decision, validation and risks. Supplements: no new behavior-defining supplement; screenshot/prior ticket remain evidence only. Product prototype: N/A.
- Approval impact: none. Exact approval remains user's 2026-09-25 SR-002 reply. Design/review basis: this new design is unreviewed; old ticket's review not reused as approval.
- Classification: `task_size=Medium` for bounded changes across existing server selection/GraphQL/Web/docs/tests; `architectural_risk=High` for shared GraphQL option contract and all-run-kind selection eligibility plus provider-boundary uncertainty. See `design-spec.md` for evidence and escalation.
- Persisted data: directly usable, no migration; local key/size inventory and current readers/writers recorded in AE-07.
- Open risk: actual smaller-window external runtime continuation may compact/reject; validation must be truthful and preserve history. No universal provider guarantee.
- Handoff: `get_handoff_rules` selected the High-risk completed-design route to `/architecture_reviewer` only; result file `architecture-design-result.md` contains the full cumulative context.
- Next action: apply handoff rules to completed design package, then stop after successful required handoff.

## Informational architecture-review receipt — ARCH-REV-001
- Received 2026-09-25 from `/architecture_reviewer`; this is a **Pass notification**, not a new solution revision, requirement change, or design finding.
- Canonical report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-review-report.md`.
- Review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/architecture-review-revision-record.md`.
- Reviewed basis: approved SR-002 requirements and SR-003 design; `task_size=Medium`, `architectural_risk=High` retained; no blocking findings. Residual provider/GraphQL/UI-catalog validation risks remain downstream.
- Reviewer reports its primary Pass handoff succeeded to `/implementation_engineer`; Solution Designer does **not** duplicate-forward or reopen unchanged requirements/design.
