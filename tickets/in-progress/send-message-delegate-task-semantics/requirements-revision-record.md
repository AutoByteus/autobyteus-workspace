# Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial user request plus current backend/task-message contract investigation | N/A | Ready for Approval | BEH-001–BEH-007; REQ-001–REQ-011; AC-001–AC-011; DEC-001 | Coherent requirements baseline and orchestration decision table created; user decision/approval pending |
| RER-002 | User explicitly requested a visualized requirement | Ready for Approval | Draft — Requirements Visualization Needed | REQ-001–REQ-007, REQ-010; AC-001–AC-008; DEC-001 | Focused exploratory visualizer brief added; cross-team Product Prototyper handoff required before user decision/approval |
| RER-003 | Product Design & Prototyping returned review-ready `SMDS-RV-001` / `VIS-R04` | Draft — Requirements Visualization Needed | Ready for Approval | REQ-001–REQ-007, REQ-010; AC-001–AC-008; DEC-001 | Exploratory visualizer evidence reconciled and review URL presented; DEC-001 and explicit approval remain pending |
| RER-004 | User emphasized intuitive, straightforward, ambiguity-free LLM instruction design | Ready for Approval | Ready for Approval | REQ-012; AC-012; QR-005 | Cognitive clarity and production-copy hygiene made explicit and testable; DEC-001 and complete-package approval remain pending |
| RER-005 | User preferred the earlier prompt structure and requested explicit `forked`/`spawned` instance terminology analysis | Ready for Approval | Ready for Approval | REQ-002, REQ-013; AC-013 | `Spawned fresh task instance` selected as the accurate mental model; unqualified `forked` wording rejected because no live-state clone is established |
| RER-006 | User requested verification of message/delegation returned instance identities | Ready for Approval | Ready for Approval — Scope Decision Needed | BEH-008; DEC-002 | Confirmed current public asymmetry: message result discards resolved existing AgentRun ID while delegation exposes fresh task ingress ID; optional output-contract expansion awaits user decision |
| RER-007 | User selected the existing message `result` slot for exact receiving AgentRun identity | Ready for Approval — Scope Decision Needed | Ready for Approval | BEH-008; REQ-014; AC-014; DEC-002 | DEC-002 Option A approved: successful message output returns the exact existing receiver while delegation continues returning the spawned task ingress |
| RER-008 | User requested an explicit AgentTeam delegation/packet-ingress explanation | Ready for Approval | Ready for Approval | REQ-015; AC-015 | Four outcomes made mandatory: existing Agent, existing Team coordinator, fresh task Agent, and fresh task Team coordinator |
| RER-009 | User clarified that `target_agent_run_id` replaces `result` rather than nesting beneath it | Ready for Approval | Ready for Approval | BEH-008; REQ-014; AC-014; DEC-002 | Message output contract refined to flat top-level identity with no dot notation; rejection returns a null identity |

## Revision Entries

### RER-001 — Initial Message-vs-Delegation Semantic Baseline

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: User reported that planners exposed to both tools treat `delegate_task` and `send_message_to` as interchangeable and may call both for one assignment. Static source and approved-contract investigation confirmed distinct configured-ingress versus fresh-task-execution semantics and an under-specified decision boundary in current Agent-facing copy.
- Prior authoritative status (`N/A` for `RER-001`): N/A
- Current authoritative status: Ready for Approval
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-001–BEH-007; REQ-001–REQ-011; AC-001–AC-011; SCN-001–SCN-007; DEC-001
- Why this baseline or revision was recorded: Establish a precise non-interchangeability rule without accidentally removing the currently approved exact-run clarification capability.
- Canonical artifact sections changed: All initial sections of `requirements-doc.md`; complete evidence baseline in `investigation-notes.md`.
- Supplemental artifacts added, changed, or removed: Added `orchestration-decision-table.md` as a proposed behavior-defining supplement.
- Prototype evidence or product decisions incorporated: Prototype not applicable. Incorporated current shared prompt/tool descriptions, backend routing/activation behavior, and the prior user-approved universal task-delegation interaction contract.
- User approval impact: Explicit approval is required. DEC-001 asks whether genuine post-delegation exact-run clarification remains allowed (recommended) or all delegator-to-assignee ordinary follow-up is prohibited (broader change).
- Downstream architecture impact: No architecture handoff until DEC-001 is resolved and intended behavior is approved. The approved package will constrain architecture to prompt/tool/docs/verification semantics while preserving runtime APIs and lifecycle unless Option B is chosen and requirements are revised.
- Remaining gaps, assumptions, or blocked decisions: DEC-001; confirmation that “synchronous” is organizational shorthand rather than a transport timing requirement.
- Next action or recipient: User review and explicit decision/approval.

### RER-002 — Requirements Visualization Request

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user explicitly asked Requirements Engineering to send the requirement to Product Prototyper because they want to see the visualized requirement.
- Prior authoritative status (`N/A` for `RER-001`): Ready for Approval under RER-001; DEC-001 open.
- Current authoritative status: Draft — Requirements Visualization Needed.
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: REQ-001–REQ-007, REQ-010; AC-001–AC-008; SCN-001–SCN-006; DEC-001.
- Why this baseline or revision was recorded: The user's chosen evidence path changed from direct prose review to an interactive exploratory visualization intended to clarify execution identity and the allowed relationship between messaging and delegation.
- Canonical artifact sections changed: Requirements document status, visualization fields, supplements, readiness; investigation prototype decision/source log/inventory.
- Supplemental artifacts added, changed, or removed: Added `requirements-visualization-brief.md`.
- Prototype evidence or product decisions incorporated: No returned prototype evidence yet. The brief requests a requirements visualizer, not a final product prototype or final UI/UX specification.
- User approval impact: No approval inferred. Requirements Engineering must present the returned review URL, record the user's DEC-001 choice and any refinements, then seek explicit requirements approval.
- Downstream architecture impact: Architecture handoff remains blocked until visualization review and explicit approval are complete.
- Remaining gaps, assumptions, or blocked decisions: Product Prototyper visualizer return; DEC-001; user approval.
- Next action or recipient: Dynamic handoff to Product Design & Prototyping using the returned `Requirements Visualization Needed` rule.

### RER-003 — Requirements Visualization Return

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: Product Design & Prototyping returned `SMDS-RV-001` / `VIS-R04` in its separate repository with a runnable review URL, scenario coverage, visual references, and validation evidence.
- Prior authoritative status (`N/A` for `RER-001`): Draft — Requirements Visualization Needed under RER-002.
- Current authoritative status: Ready for Approval.
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: REQ-001–REQ-007, REQ-010; BEH-001–BEH-005; AC-001–AC-008; SCN-001–SCN-006; DEC-001.
- Why this baseline or revision was recorded: Reconcile the externally owned exploratory evidence into the canonical package before user review while preserving the boundary between requirements clarification and final UI/UX specification.
- Canonical artifact sections changed: Requirements document status, interaction evidence, supplemental artifacts, traceability, and readiness; investigation status, source log, prototype findings, and supplement inventory.
- Supplemental artifacts added, changed, or removed: Linked the Product-owned `requirements-visualization-review.md`, prototype ticket, validation evidence, and non-normative visual-reference directory; no Product artifact was copied into the requirements workspace.
- Prototype evidence or product decisions incorporated: VIS-R04 visually distinguishes mounted/configured execution messaging, fresh task execution creation, incorrect duplicate logical-address resend, exact-run clarification, formal lifecycle, and delegation failure. It compares DEC-001 Option A and Option B but does not choose between them.
- User approval impact: No approval inferred. The user must choose DEC-001 and explicitly approve the intended behavior and behavior-defining decision table.
- Downstream architecture impact: No architecture handoff until user decision and approval. The visualizer adds explanatory evidence only and does not change architecture scope.
- Remaining gaps, assumptions, or blocked decisions: DEC-001; explicit requirements approval.
- Next action or recipient: User review at `http://127.0.0.1:4179`, followed by Requirements Engineering integration of the decision and approval status.

### RER-004 — LLM Prompt Clarity Requirement

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user emphasized that the Team collaboration system prompt is an LLM decision interface and must be intuitive, understandable, straightforward, and unambiguous.
- Prior authoritative status (`N/A` for `RER-001`): Ready for Approval under RER-003.
- Current authoritative status: Ready for Approval.
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: REQ-012; AC-012; QR-005; all existing tool-choice scenarios remain relevant.
- Why this baseline or revision was recorded: Make cognitive salience and prompt hygiene verifiable requirements rather than informal editorial preferences.
- Canonical artifact sections changed: Requirements, acceptance criteria, quality requirements, traceability, investigation intake/source log, and requirement implications.
- Supplemental artifacts added, changed, or removed: None.
- Prototype evidence or product decisions incorporated: VIS-R04's cognition-first actor story remains supporting evidence; no visualization revision is needed because the feedback governs production prompt wording.
- User approval impact: The clarity direction is captured as authoritative user feedback, but DEC-001 and explicit approval of the complete intended behavior remain pending.
- Downstream architecture impact: Architecture/design must preserve a concise two-mode mental model and validate readability/model choice behavior, while owning exact source placement and edit boundaries.
- Remaining gaps, assumptions, or blocked decisions: DEC-001; explicit complete-package approval.
- Next action or recipient: Present the simplified candidate collaboration block and obtain the user's DEC-001 choice and approval or revision feedback.

### RER-005 — Fresh Task Instance Terminology

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user preferred the earlier `Ordinary Communication` / `Dedicated Task Execution` structure and asked whether `forked` or `spawned` would more clearly signal that delegation creates a different task Agent or task AgentTeam instance.
- Prior authoritative status (`N/A` for `RER-001`): Ready for Approval under RER-004.
- Current authoritative status: Ready for Approval.
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: REQ-002, REQ-013; AC-013; SCN-002 and SCN-006.
- Why this baseline or revision was recorded: Preserve the user's preferred intuitive organization while preventing an appealing metaphor from creating a false state-inheritance contract.
- Canonical artifact sections changed: Requirements, acceptance criteria, traceability, investigation intake/source log, and requirement implications.
- Supplemental artifacts added, changed, or removed: None.
- Prototype evidence or product decisions incorporated: The visualizer's fresh-worker distinction remains consistent; no visualization revision is needed.
- User approval impact: `Spawned fresh task instance` is the recommended copy direction. DEC-001 and explicit approval of the complete intended behavior remain pending.
- Downstream architecture impact: Exact prose remains downstream-owned, but it must preserve fresh execution identity and must not promise cloning of live mounted-run state.
- Remaining gaps, assumptions, or blocked decisions: DEC-001; explicit complete-package approval.
- Next action or recipient: Present the earlier-style prompt revised with `spawned fresh task instance` language and obtain user confirmation or further edits.

### RER-006 — Tool Return Identity Investigation

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user asked whether `send_message_to` returns the exact existing receiving AgentRun ID and whether `delegate_task` returns the created task Agent identity, proposing that symmetric feedback could make the prompt and tool behavior more coherent.
- Prior authoritative status (`N/A` for `RER-001`): Ready for Approval under RER-005.
- Current authoritative status: Ready for Approval — Scope Decision Needed.
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-008; DEC-002; existing scope boundary and downstream architecture input.
- Why this baseline or revision was recorded: Distinguish current model-facing output from richer internal delivery metadata and prevent the proposed coherence improvement from being mistaken for already-supported behavior.
- Canonical artifact sections changed: Current/desired behavior, out-of-scope boundary, open decisions, downstream architecture input, readiness, investigation intake/source log, and requirement implications.
- Supplemental artifacts added, changed, or removed: None.
- Prototype evidence or product decisions incorporated: None; the exploratory visualizer illustrates execution identity but does not define public tool result schemas.
- User approval impact: DEC-002 asks whether to expand scope with a `send_message_to` success identity. No schema change is approved yet.
- Downstream architecture impact: DEC-002 Option A is a public contract change and a structural-impact trigger requiring Architecture Designer routing after requirements approval. Option B preserves the previously expected prompt/tool/docs-only scope.
- Remaining gaps, assumptions, or blocked decisions: DEC-001; DEC-002; explicit complete-package approval.
- Next action or recipient: Report the exact current outputs and obtain the user's DEC-002 choice before finalizing the prompt claim or route.

### RER-007 — Message Result Identity Decision

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: After learning that the generic public `send_message_to.result` field is currently null despite internal receiver resolution, the user directed that the field should return the resolved AgentRun identity analogous to the identity returned by delegation.
- Prior authoritative status (`N/A` for `RER-001`): Ready for Approval — Scope Decision Needed under RER-006.
- Current authoritative status: Ready for Approval.
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-008; REQ-014; AC-014; DEC-002.
- Why this baseline or revision was recorded: Convert the investigated requirement gap into approved intended behavior while retaining the correct distinction between an existing message receiver and a newly spawned task ingress.
- Canonical artifact sections changed: Status/approval reference, current/desired behavior, scope, requirements, acceptance criteria, compatibility constraint, open decisions, traceability, architecture input, readiness, investigation intake/source log, and requirement implications.
- Supplemental artifacts added, changed, or removed: None.
- Prototype evidence or product decisions incorporated: None; the visualizer remains explanatory identity evidence and does not define wire schemas.
- User approval impact: DEC-002 is resolved as Option A. DEC-001 and explicit approval of the complete package remain pending.
- Downstream architecture impact: The approved public output-contract change is a structural-impact trigger, so the eventual approved package must route through Architecture Designer rather than direct implementation.
- Remaining gaps, assumptions, or blocked decisions: DEC-001; explicit complete-package approval.
- Next action or recipient: Confirm the exact semantic distinction and obtain the remaining decision/approval before completing the architecture-routing assessment.

### RER-008 — Agent And AgentTeam Four-Case Clarity

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user asked whether the prompt should state more clearly that delegating to an AgentTeam spawns a fresh task Team instance while its coordinator Agent receives the task.
- Prior authoritative status (`N/A` for `RER-001`): Ready for Approval under RER-007.
- Current authoritative status: Ready for Approval.
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: REQ-015; AC-015; SCN-001, SCN-002, and SCN-006.
- Why this baseline or revision was recorded: The same logical `recipient_address` is accepted by both operations, so the prompt must make the operation-specific Agent and AgentTeam outcomes directly comparable rather than leaving Team coordinator ingress implicit.
- Canonical artifact sections changed: Requirements, acceptance criteria, traceability, investigation intake/source log, and requirement implications.
- Supplemental artifacts added, changed, or removed: None.
- Prototype evidence or product decisions incorporated: VIS-R04 AgentTeam parity remains supporting evidence; no visualizer revision is required.
- User approval impact: The four-case clarity direction is captured; DEC-001 and explicit complete-package approval remain pending.
- Downstream architecture impact: Exact prompt format remains downstream-owned, but it must preserve all four observable outcomes and the distinction between spawned Team ownership and coordinator packet ingress.
- Remaining gaps, assumptions, or blocked decisions: DEC-001; explicit complete-package approval.
- Next action or recipient: Present the refined prompt text and obtain remaining user decision/approval.

### RER-009 — Flat Message Target Identity

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user clarified that they meant replacing the always-null top-level `result` field with `target_agent_run_id`, not returning `result.target_agent_run_id` through dot notation.
- Prior authoritative status (`N/A` for `RER-001`): Ready for Approval under RER-008.
- Current authoritative status: Ready for Approval.
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-008; REQ-014; AC-014; DEC-002.
- Why this baseline or revision was recorded: Preserve the simplest LLM-facing result shape and make message and delegation identity fields directly comparable.
- Canonical artifact sections changed: Status/approval reference, current/desired behavior, scope, requirements, acceptance criteria, compatibility constraint, decision record, architecture input, investigation intake/source log, and requirement implications.
- Supplemental artifacts added, changed, or removed: None.
- Prototype evidence or product decisions incorporated: None; this is a wire/result contract clarification.
- User approval impact: DEC-002 remains decided as Option A with its exact flat shape now confirmed. DEC-001 and explicit complete-package approval remain pending.
- Downstream architecture impact: The structural public-contract trigger remains; design must address removal of `result`, stable failure shape, native/MCP parity, and any strict consumers.
- Remaining gaps, assumptions, or blocked decisions: DEC-001; explicit complete-package approval.
- Next action or recipient: Present the corrected flat schema and continue the remaining requirements approval loop.
