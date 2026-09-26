# Solution Revision Record — Runtime-specific stopped-run model switching

## Revision Index
| ID | Phase | Trigger | Prior status | Current status | Result |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | User request 2026-09-25 + current-code investigation | N/A for this package; earlier separate `stopped-run-compatible-model` completed | Ready for Approval | Proposed runtime-specific replacement rule; no design or implementation authorization |
| SR-002 | Requirements | Explicit user approval 2026-09-25 | Ready for Approval | Approved | Same requirements baseline authorized for architecture design |
| SR-003 | Design | Post-approval architecture investigation | Approved / design N/A | Approved / Architecture Design Complete | Medium size, High architectural risk; independent review route required |
| SR-004 | Evidence | User's delivery-build model-picker screenshot and request to reproduce, 2026-09-25 | Approved / reviewed design; delivery verification pending | Same approved/reviewed basis; presentation diagnosis recorded | 11 runtime IDs plus saved ID visible in scrollable UI; mixed fallback label/duplicate canonical label explained; proposed UX refinement awaits user direction |
| SR-005 | Requirements | User directs removal of duplicate Claude `default` at backend provider-catalog boundary, 2026-09-25 | SR-002 Approved / SR-003 reviewed design; delivery verification pending | Revised requirements Ready for Approval / design Needs Revision for delta | Backend-owned alias normalization proposal, with historical saved-ID preservation; no implementation handoff yet |
| SR-006 | Requirements | User approves the presented SR-005 correction and requests principled revised design plus additional review | Ready for Approval / design Needs Revision | Revised requirements Approved / design in progress | REQ-008/AC-010–011 and focused REQ-002/AC-001 qualification authorized; delivery verification not complete |
| SR-007 | Design | Post-approval architecture investigation AE-12–15 and cumulative design refactor | Requirements Approved / design Needs Revision | Requirements Approved / Architecture Design Complete; repeat review pending | Backend-owned catalog normalization, exact saved-current resolution, self-contained run options; Medium/High |
| SR-008 | Review recovery / evidence | ARCH-REV-002 Fail DR-001 and user request to inspect actual history | SR-007 design review pending | Requirements Approved / design Needs Revision; actual-data evidence recorded | One Agent and four Team indexed Claude runs store exact `default`; launch/application current-value gap remains to resolve |
| SR-009 | Design recovery | Resolve DR-001 with authoritative exact-current boundary for launch/application consumers | Requirements Approved / design Needs Revision | Requirements Approved / Architecture Design Complete; repeat review pending | Backend offered/current semantics extended to definition→Run and Application readiness; Medium/High retained |

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

## SR-004 — Delivery-build model-picker evidence clarification
- Classification: Evidence-only clarification for the user's diagnostic request. No current requirements/design revision or implementation authorization; presentation refinement is only a proposal pending user direction.
- Trigger: second user screenshot `ctx_18a73639261d__image.png` and explicit request to test the delivered Electron/backend/frontend because “Saved / runtime-offered” and the apparently short Claude list looked strange.
- Prior/current status: SR-002 requirements Approved and SR-003 design Architecture Design Complete/reviewed Pass remain unchanged. Delivery remains in explicit user-verification hold; no `Delivery Completed` receipt was received.
- Affected evidence/IDs: `investigation-notes.md` E16–E19 and delivery-build section; `model-picker-verification-investigation.md`; explanatory relation to BEH-001/005, REQ-002/007, AC-001/009. No changes to those authoritative intended-behavior IDs or supplements. No Product-owned artifact.
- Finding: the running SDK catalog and backend options expose 11 exact Claude IDs, and the packaged Electron dropdown contains all 11 plus one saved historical ID. The rest are behind scroll. The mixed fallback group is a frontend projection of unmatched exact IDs; `default` is an SDK alias folded in the launch display grouping, while saved `claude-fable-5-1` is no longer catalog-offered. The offered `claude-fable-5-1[1m]` renders the same canonical label as the saved ID. This is a presentation ambiguity, not proof of missing eligibility.
- Approval impact: no renewed approval needed for the diagnosis. A more explicit saved-versus-offered presentation and distinct aliases/IDs would change the intended UX specification and is not marked approved by the user's request to investigate. Preserve fixed runtime, current catalog choices, saved fallback, Save validation and history.
- Design/review/routing impact: none now; no duplicate architecture handoff. If the user requests a correction, classify its exact intended-behavior delta and follow the solution recovery/approval path before changing the authoritative package. Independent review artifacts remain ARCH-REV-001 for SR-003 only, not a future changed basis.
- Remaining gaps: no new provider continuation test or Save was performed; full downstream test coverage remains in API/E2E reports. Await user decision on whether to refine the picker before treating delivery as accepted.

## SR-005 — Proposed backend-owned Claude alias normalization
- Phase/classification: Requirements revision / `Requirement Gap` relative to the previously approved “all raw runtime-catalog IDs appear” wording. No revised-design or implementation result is claimed.
- Trigger: user first said the `default` row should not appear when it points to a listed concrete model (E20), then corrected our frontend-hiding interpretation: the **Claude backend provider catalog should filter it** because the frontend only displays that catalog (E21). This supersedes the SR-004 tentative recommendation to relabel `default` in the UI.
- Prior/current status: prior REQ-001–007/AC-001–009/SCN-001–006 approved at SR-002 and implemented/reviewed under SR-003; delivery still awaits explicit user verification. Revised `requirements-doc.md` is **Ready for Approval** for REQ-008/AC-010–011/SCN-007 and a focused qualification to REQ-002/AC-001. `design-spec.md` is **Needs Revision** for this delta. Prior approval/review cannot authorize a contradictory backend-catalog filter.
- Affected behavior and authority: BEH-001/005; REQ-002/004/005/008; AC-001/010/011; SCN-001–003/007. Investigation E20–E21/AE-10–11 and `model-picker-verification-investigation.md` support the proposed scope. No Product supplement. Existing saved exact `default` identity, same-model settings and normal continuation are preserved, not silently migrated.
- Supported scenario: current SDK reports `default` aliasing listed `opus` for the same unambiguous canonical model, so serving both is a real user-visible duplicate. A historical run saved as exact `default` is an existing persisted-data edge; the backend currently validates Save against the same catalog list, so alias removal without compatibility would regress it. No-sibling/ambiguous SDK discovery remains offered rather than guessing a replacement.
- Approval impact: the user explicitly supplied the desired correction and backend ownership, but the complete REQ-008/AC-010–011 baseline including compatibility safeguards is presented for explicit approval before revising the technical design or forwarding work. No assumption that user verification of the current Electron build is complete.
- Design/review/routing: SR-003 body remains historical reviewed authority for the old basis only. After approval, revise architecture at the backend catalog/selection/Save boundaries, reclassify the completed solution and repeat applicable independent review before implementation. No duplicate review/implementation handoff in this approval hold.
- Next action: present the precise revised behavior to the user and wait for approval or correction.

## SR-006 — Explicit approval of Claude backend-catalog correction
- Classification: Requirements approval of the SR-005 proposed delta, not approval of existing Electron build or implementation.
- User reply after the precise REQ-008/AC-010–011 proposal: “please update the design follow design principelsa afterwards send for additional review. because i think some refactoring is needed here. backend provide, frontend display”. This accepts the presented backend-provided/frontend-displayed behavior, no-sibling safeguard and saved exact-current continuity, then asks for revised design and independent review.
- Prior/current: Ready for Approval and design Needs Revision → revised `requirements-doc.md` Approved and architecture investigation/design authorized. Original SR-002 runtime-capacity approval remains in force.
- Affected IDs: BEH-001/005, REQ-002/004/005/008, AC-001/010/011, SCN-001–003/007; existing other IDs unchanged. Behavior-defining supplements/Product spec: N/A; screenshot and reproduction report remain evidence only.
- Review impact: ARCH-REV-001 applies only to SR-003/SR-002; repeat independent review required for the new design. Delivery remains in explicit user-verification hold, not completed.

## SR-007 — Revised architecture design for backend-provided choices
- Classification: Design Impact resolved after SR-006; no new intended-behavior change. Approval basis remains SR-006 for REQ-008 and SR-002 for the original external capacity rule.
- Trigger/evidence: AE-12–15 establish the Claude SDK raw adapter, ClaudeModelCatalog pass-through, ModelCatalogService snapshot/selection consumers, RunModelSelectionService shared catalog validation, frontend alias folding and missing saved-current schema when a row is filtered.
- Prior/current: design Needs Revision for Claude delta → `design-spec.md` Architecture Design Complete, repeat architecture review pending. Affected design sections: supported paths, spines, catalog/selection ownership, DTOs, frontend display, clean-cut removal, data transition, sequence and validation.
- Design decision: ClaudeModelCatalog alone normalizes offered rows from raw SDK evidence; ModelCatalogService supplies one offered/current catalog view; RunModelSelectionService validates new targets from offered rows and unchanged current from exact raw row, and returns self-contained current/replacement descriptors; Web renders those choices and their schema without alias folding or a second stopped-run provider-catalog intersection. Saved `default` remains exact, no migration.
- Classification: `task_size=Medium`, `architectural_risk=High`. Several existing backend/GraphQL/Web contracts and tests change, but no new runtime/storage/writer; shared catalog consumers, persisted exact-current behavior and GraphQL shape require review.
- Prior review: ARCH-REV-001 Pass is historical and not a pass for SR-007. Supplemental evidence `model-picker-verification-investigation.md` is still relevant. Independent current review report: N/A — not yet applicable. Product artifact: N/A — not requested.
- Remaining risks: audit launch/platform saved-`default` consumers, verify backend normalization/GraphQL/Web current-schema alignment and fresh Save behavior; provider continuation matrix remains downstream validation work. No implementation or delivery completion claimed.
- Handoff: `get_handoff_rules` selected only `/architecture_reviewer` for Medium/High revised design; `architecture-design-revision-result.md` is the complete package. Message acceptance is recorded by the handoff tool result, not inferred from this design record.

## SR-008 — Review failure and actual-data audit
- Classification: **Design Impact** DR-001 plus evidence-only clarification of the user’s assertion about existing data. No intended-behavior change or new approval is inferred.
- Incoming report: ARCH-REV-002 in `design-review-report.md`, revision record `architecture-review-revision-record.md`; Fail on SR-007 versus SR-006. Reviewer’s MP-001/MP-002 are supported launch/application paths, not proof of currently installed affected definitions. No implementation handoff.
- User reply: “no worries, i have never selected default if you look at the all the run histories. we dont have runs using default” and “sometimes architecture review makes sense, but it didnt consider what already exists, you can find out.” This requests factual inspection; it does not expressly approve data loss or a changed preservation policy.
- Actual evidence E23: read-only current-schema scan of 460 Agent, 540 Team and 23 Org run files plus canonical indexes found one Agent and four Team indexed Claude runs with exact saved `default`, zero Org files. These could include test-generated runs; no inference about the user’s deliberate selection. AE-16 traces frontend/application consumers.
- Affected IDs: REQ-008/AC-010–011 and preserved definition/launch-default scope boundary; BEH-001/004/005 and provisional BEH-007 in review. Requirements status remains **Approved SR-006**; `design-spec.md` marked **Needs Revision** for DR-001. Prior ARCH-REV-001 Pass is SR-003-only, ARCH-REV-002 Fail is latest for SR-007. Product supplement: N/A.
- Next action: explain actual data to user; resolve authoritative offered-versus-current catalog contract for launch/application consumers before a new completed design/review handoff. No route to implementation on the failed basis.

## SR-009 — Corrected architecture after DR-001
- Classification: Design Impact resolved; **no new user-facing behavior or changed approved requirement**. Approval remains SR-006 (Claude alias normalization/saved exact-value preservation) plus SR-002 (runtime-specific capacity rule). User’s E23-triggering statement was a factual challenge, not a waiver; local data confirms five indexed `default` runs.
- Prior/current: design Needs Revision after ARCH-REV-002 Fail → `design-spec.md` Architecture Design Complete on SR-009, repeat independent review pending. ARCH-REV-002 is latest reviewed decision for SR-007 only; it does not pre-approve SR-009.
- Affected IDs: REQ-008/AC-010–011, preserved definition/launch-default boundary and provisional BEH-007; original BEH-001–006 and SCN-001–007 behavior unchanged. No Product supplement.
- Core correction: backend Claude catalog still normalizes newly offered choices, while ModelCatalogService provides exact SDK-reported descriptor lookup for any saved/effective current ID. Stopped-run view remains self-contained; Agent/Team definition/new-run/mobile and Application Launch Setup display current seeds from a separate backend descriptor query without adding `default` to offered options; application host validator uses exact current descriptor for availability/credential metadata instead of offered-only `listLlmModels`. DS-07/08, file map, rollout sequence and tests are now explicit.
- Classification: `task_size=Medium` for bounded existing subsystem/consumer changes; `architectural_risk=High` for shared catalog semantics, GraphQL/Web exact-current contract and persisted-value continuity. Local Agent/Team/Org records remain directly usable; no migration.
- Remaining risks: current installed Agent/Team definition prevalence not fully inventoried; supported paths are established by MP-001/002. Provider long-history continuation remains downstream validation.
- Handoff: see `architecture-design-recovery-result.md`; rule-based repeat architecture review required before implementation. No implementation handoff on failed SR-007 basis.

## Informational architecture-review receipt — ARCH-REV-003
- Received from `/architecture_reviewer` after SR-009 handoff; **Pass** on SR-009 design against SR-006-approved requirements, resolving prior DR-001. This is an informational review receipt, not a new solution revision or a requirement change.
- Canonical report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-review-report.md`; revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/architecture-review-revision-record.md`.
- Reviewer retained `task_size=Medium`, `architectural_risk=High`, found no new blocker, and reports its primary reviewed-package handoff succeeded to `/implementation_engineer`. Solution Designer does **not** duplicate-forward or repeat the review. No implementation, validation, user verification or delivery completion is inferred.
- Residual reviewer caution: if the cross-runtime exact-current query is used for workspace-scoped Codex catalog data, implementation should include environment in lookup/cache keys; this is a downstream verification detail, not a new approved behavior or current blocking design finding.
