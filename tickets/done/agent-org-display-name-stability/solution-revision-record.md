# Solution Revision Record — Agent Org Display-Name Stability

## Revision Index

| Revision ID | Phase (`Requirements`/`Evidence`/`Design`/`Mixed`) | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial user report, two supplied screenshots, and current-source investigation | ASM-001, UNK-001, RSK-001–003 | N/A | Requirements Ready for Approval; design N/A | BEH-001–003; REQ-001–006; AC-001–005; SCN-001–003 | Root cause established; proposed no-provisional-label baseline awaits explicit user approval |
| SR-002 | Evidence | User question about whether initial backend data is incomplete and how the later lookup works | N/A | Requirements Ready for Approval; design N/A | Requirements Ready for Approval; design N/A | BEH-001–003; no intended-behavior change | Confirmed two-phase payload/query flow; approval impact unchanged |
| SR-003 | Mixed | User directed an API-sufficient response with no per-member display reads and requested an Agent Team list comparison | UNK-001, RSK-001–003 | Requirements Ready for Approval with frontend-loading proposal; design N/A | Revised Requirements Ready for Approval; design N/A | BEH-001–003; REQ-001–006; AC-001–005; SCN-001–003; DEC-001–002 | Replaced frontend-only hydration masking with one complete server projection per list/detail view; revised baseline awaits approval |
| SR-004 | Requirements | User chose Org/Team-local role/member names for Agent Org list and detail after the Team comparison | ASM-002, UNK-001, RSK-001–003 | SR-003 API-enriched definition-name baseline Ready for Approval; design N/A | Revised role-name requirements Ready for Approval; design N/A | BEH-001–003; REQ-001–006; AC-001–005; SCN-001–003; DEC-001–002 | Existing Org payload is sufficient for labels; no referenced definition-name replacement or list display lookup; baseline awaits approval |
| SR-005 | Design | User explicitly approved SR-004 and directed implementation-equivalent behavior to Agent Team role presentation | UNK-001 resolved for design; RSK-001–003 controlled | SR-004 Ready for Approval; design N/A | Requirements Approved; Architecture Design Complete (`Medium`/`Low`) | BEH-001–003; REQ-001–006; AC-001–005; SCN-001–003 | Clean-cut frontend design uses role labels, existing endpoint catalog for detail topology, and retains full reference validation only for structural consumers |

## Revision Entries

### SR-001 — Stable Agent Org member-name presentation baseline

- Phase and classification (`Initial Baseline`/`Refinement`/`Design Impact`/`Requirement Gap`/`Unclear`): Initial Baseline; new requirement relative to the prior ticket's approved pending-fallback presentation.
- Triggering user feedback, Product package, investigation evidence, or role/report/round: User reported visible list alias-to-name and detail opaque-ref-to-name substitution and requested a ticket based on `personal`, root-cause analysis, and correct fix design. Two screenshots demonstrate the list transition.
- Triggering finding IDs: ASM-001, UNK-001, RSK-001–003.
- Prior authoritative requirements/design status (`N/A` for baseline or not-yet-created design): N/A for this package. Historical `readable-org-catalog-member-names` package is complete and approved but does not authorize this new loading behavior.
- Current authoritative requirements/design status: `requirements-doc.md` Ready for Approval; `design-spec.md` N/A until explicit approval.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001–003; REQ-001–006; AC-001–005; SCN-001–003; DEC-001.
- Scenario-basis or scenario-validity changes: Cold list and detail are Supported Normal Scenarios; reload/context/failure lifecycle is a Supported Explicit Edge Scenario. Pending presentation changes from semantic fallback content to neutral loading; settled failure fallback remains supported.
- Why this baseline or revision was recorded: The current implementation fulfills the old exact-name requirement but leaks two different identity fields into successive frames. The new request changes intended presentation and must be approved before technical design.
- Canonical requirements, investigation and design sections changed: Created full `requirements-doc.md` and `investigation-notes.md`; design not yet applicable.
- Supplemental artifacts added, changed or removed: Added checksummed copies of both user screenshots as current-state evidence. Linked prior completed package as historical evidence only.
- Prototype evidence or product decisions incorporated: No Product Design request or prototype. Recommended member-region-only neutral loading is DEC-001 pending user approval.
- Intended behavior changed: `Yes` — pending/unresolved member labels will no longer be shown as humanized roles or refs; they become neutral loading until settlement.
- Approval impact, exact approved requirements baseline and user-approval reference: Approval required for SR-001; no approval recorded yet.
- Behavior-defining supplement versions and approval references: N/A.
- Affected design/review basis invalidated or rebuilt: No design exists for this package. The prior package remains historically correct for its approved scope; this new package supersedes only its visible pending-fallback allowance when implemented.
- Post-design task-size/risk classification and rationale changes (`N/A` before design completion): N/A.
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: None; routine user approval hold is not a downstream handoff.
- Downstream and architecture-review impact: Architecture and implementation are blocked on explicit user approval. Task size/risk will be classified only after design.
- Remaining gaps, assumptions or blocked decisions: User approval of REQ-001–006/AC-001–005 and DEC-001; architecture owner/snapshot strategy; detail browser confirmation of ASM-001.
- Next action: Present concise findings and the proposed member-region loading behavior to the user for explicit approval. After approval, complete architecture investigation and `design-spec.md`.

### SR-002 — Initial-payload and asynchronous lookup clarification

- Phase and classification (`Initial Baseline`/`Refinement`/`Design Impact`/`Requirement Gap`/`Unclear`): Evidence-only clarification.
- Triggering user feedback, Product package, investigation evidence, or role/report/round: User asked why a later lookup is necessary and whether the frontend initially lacks data sent by the backend.
- Triggering finding IDs: N/A.
- Prior authoritative requirements/design status (`N/A` for baseline or not-yet-created design): Requirements Ready for Approval; design N/A.
- Current authoritative requirements/design status: Requirements Ready for Approval; design N/A.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001–003 evidence/rationale only; no normative ID changed.
- Scenario-basis or scenario-validity changes: None.
- Why this baseline or revision was recorded: Exact source inspection confirmed the initial `agentOrgDefinitions` member payload has only role/ref/type/scope, while authoritative Agent/Team names arrive through a second asynchronous set of exact GraphQL reads.
- Canonical requirements, investigation and design sections changed: Extended `investigation-notes.md` source log, technical facts, and requirement implications. Requirements text remains unchanged.
- Supplemental artifacts added, changed or removed: None.
- Prototype evidence or product decisions incorporated: None.
- Intended behavior changed: `No`.
- Approval impact, exact approved requirements baseline and user-approval reference: No change; SR-001 still awaits explicit user approval.
- Behavior-defining supplement versions and approval references: N/A.
- Affected design/review basis invalidated or rebuilt: N/A; design has not started.
- Post-design task-size/risk classification and rationale changes (`N/A` before design completion): N/A.
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: No matching rule; routine approval conversation remains with the user.
- Downstream and architecture-review impact: Architecture must compare a frontend readiness/snapshot correction with a broader resolved backend projection after approval; no option is yet authoritative.
- Remaining gaps, assumptions or blocked decisions: SR-001 approval and DEC-001 remain pending.
- Next action: Answer the current-data-flow question, then obtain explicit approval or requested revisions.

### SR-003 — API-first Agent Org view projections and Agent Team comparison

- Phase and classification (`Initial Baseline`/`Refinement`/`Design Impact`/`Requirement Gap`/`Unclear`): Mixed requirements/evidence refinement; user-directed intended-behavior and contract change.
- Triggering user feedback, Product package, investigation evidence, or role/report/round: After learning that the Org payload lacks referenced definition names and the client runs concurrent exact queries, the user stated that the backend API should contain enough data and rejected the second per-member request design. The user then requested investigation of the Agent Team list and its API.
- Triggering finding IDs: UNK-001, RSK-001–003 revised for the API projection boundary.
- Prior authoritative requirements/design status (`N/A` for baseline or not-yet-created design): SR-001/SR-002 requirements were Ready for Approval and proposed frontend member-region loading around the existing two-phase hydration. No design existed.
- Current authoritative requirements/design status: `requirements-doc.md` SR-003 is Ready for Approval; `design-spec.md` remains N/A until explicit approval.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001–003; REQ-001–006; AC-001–005; SCN-001–003; DEC-001–002.
- Scenario-basis or scenario-validity changes: Supported scenarios remain the same. Their data contract changes: list and detail each settle from one purpose-built aggregate response, with no per-member display-name follow-ups. Initial load is aggregate loading; same-context Reload retains the last complete view until atomic replacement.
- Why this baseline or revision was recorded: The user made response sufficiency an explicit product/system constraint. The Agent Team list confirms an existing one-list-response pattern: Team cards render directly from the Team catalog response without chip-level lookups, although those chips are local member roles rather than referenced Agent names. The Agent Team detail uses multiple datasets behind a loading gate and is not adopted as the API topology.
- Canonical requirements, investigation and design sections changed: Revised problem/outcome, behavior table, scope, functional requirements, acceptance criteria, UI/API constraints, decisions, risks, requirement implications, and approval request; expanded investigation with Team list/detail frontend and server evidence. Design remains intentionally absent before approval.
- Supplemental artifacts added, changed or removed: No new binary artifact; source paths for the Team page, list, card, store, query, detail, resolver, converter, and admission flow were added as evidence.
- Prototype evidence or product decisions incorporated: No Product Design request or prototype. Existing loading/reload patterns are sufficient context for requirements; the core decision is API/read-model ownership.
- Intended behavior changed: `Yes` — the frontend must not perform per-member Agent/Team display queries. One catalog response supplies all list-card display data, and one detail response supplies all detail-visible resolved member data. The list response remains minimal rather than including the full detail graph.
- Approval impact, exact approved requirements baseline and user-approval reference: SR-001 was never approved. Explicit user approval is required for the complete revised SR-003 baseline; no approval is inferred from the design-direction statements alone.
- Behavior-defining supplement versions and approval references: N/A.
- Affected design/review basis invalidated or rebuilt: No design or downstream review exists. The earlier frontend-only option is rejected and must not be used as the architecture basis.
- Post-design task-size/risk classification and rationale changes (`N/A` before design completion): N/A.
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: Current rules evaluated after SR-003 persistence; no rule matches a routine requirements approval hold. Result context is persisted in `requirements-approval-request.md`; no downstream message was sent.
- Downstream and architecture-review impact: After approval, architecture must define distinct catalog/detail read projections, server-side validated reference resolution, frontend query/store consumption, and removal/narrowing of client display hydration. Task size/risk remains unclassified until design completion.
- Remaining gaps, assumptions or blocked decisions: Explicit approval of SR-003, especially DEC-002's one-purpose-built-response-per-view boundary; detailed server projection/service ownership; browser verification of ASM-001.
- Next action: Present the Agent Team comparison and revised API-first baseline to the user for explicit approval. After approval, complete architecture investigation and `design-spec.md`.

### SR-004 — Local role/member names become authoritative browsing labels

- Phase and classification (`Initial Baseline`/`Refinement`/`Design Impact`/`Requirement Gap`/`Unclear`): Requirements refinement; explicit user change to the intended settled label identity.
- Triggering user feedback, Product package, investigation evidence, or role/report/round: After confirming that Agent Teams and Agent Orgs both have local member roles, the user directed that Agent Org list and detail display the role/member name and stated that referenced Agent/Team names and temporary extra wording are unnecessary.
- Triggering finding IDs: ASM-002, UNK-001, RSK-001–003 revised for safe reference-reader narrowing.
- Prior authoritative requirements/design status (`N/A` for baseline or not-yet-created design): SR-003 was Ready for Approval and proposed server-enriched referenced definition names. It was not approved. No design existed.
- Current authoritative requirements/design status: `requirements-doc.md` SR-004 is Ready for Approval; `design-spec.md` remains N/A until explicit approval.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001–003; REQ-001–006; AC-001–005; SCN-001–003; DEC-001–002.
- Scenario-basis or scenario-validity changes: The same list/detail/reload scenarios remain supported. Their semantic outcome changes: local role/member names remain stable from first render; referenced definition settlement never renames them.
- Why this baseline or revision was recorded: The Agent Team comparison exposed two legitimate identities—local role versus referenced definition name. The user selected the local role. Because `members[].memberName` already exists in the Agent Org response, the prior API enrichment is unnecessary for direct member labels.
- Canonical requirements, investigation and design sections changed: Replaced the API-first resolved-name problem/outcome, behaviors, scope, requirements, ACs, scenarios, UI rules, contracts, decisions, risks, implications, architecture inputs, and approval request with the role-name baseline. Extended investigation to separate display-only hydration from full-graph structural consumers.
- Supplemental artifacts added, changed or removed: Existing screenshots were reinterpreted as showing desired initial role labels followed by undesired definition-name replacement; no new binary evidence added.
- Prototype evidence or product decisions incorporated: No Product Design request or prototype. Existing list/detail layouts remain; only label semantics and request ownership change.
- Intended behavior changed: `Yes` — exact referenced Agent/Team definition names are no longer displayed as Agent Org browsing member labels. Direct labels use humanized Org `memberName`; Team coordinator/nested labels use Team-local member roles. The list performs no display-name reference queries.
- Approval impact, exact approved requirements baseline and user-approval reference: SR-003 was never approved. Explicit approval of the complete SR-004 baseline is required; the user's direction establishes DEC-001 but does not by itself approve every preservation/edge requirement.
- Behavior-defining supplement versions and approval references: N/A.
- Affected design/review basis invalidated or rebuilt: No design or review existed. Any future design must not implement SR-003's resolved-name API projections without a new requirement change.
- Post-design task-size/risk classification and rationale changes (`N/A` before design completion): N/A.
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: Current rules evaluated after SR-004 persistence; no rule matches a routine requirements approval hold. Result context is in `requirements-approval-request.md`; no downstream message was sent.
- Downstream and architecture-review impact: After approval, architecture should focus on a shared formatter, presentational list chips, membership-aware detail row mapping, and safe narrowing/removal of display-only reference requests while retaining evidenced validation/topology consumers.
- Remaining gaps, assumptions or blocked decisions: Explicit approval of humanized `memberName` formatting and DEC-002; exact non-label consumers of full reference loading; browser confirmation of ASM-001.
- Next action: Present SR-004 for explicit approval. After approval, complete architecture investigation and `design-spec.md`.

### SR-005 — Approved role-label architecture and redundant lookup removal

- Phase and classification (`Initial Baseline`/`Refinement`/`Design Impact`/`Requirement Gap`/`Unclear`): Design completion following explicit requirements approval.
- Triggering user feedback, Product package, investigation evidence, or role/report/round: The user explicitly approved doing Agent Org list/detail like Agent Team role presentation, using `memberName`, and removing redundant asynchronous name lookup complexity.
- Triggering finding IDs: UNK-001 resolved by view-specific consumer inventory; RSK-001–003 controlled in the design.
- Prior authoritative requirements/design status (`N/A` for baseline or not-yet-created design): SR-004 role-name requirements Ready for Approval; no design.
- Current authoritative requirements/design status: SR-004 requirements Approved by the user's 2026-09-21 message; `design-spec.md` SR-005 Ready; Architecture Design Complete.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001–003; REQ-001–006; AC-001–005; SCN-001–003; DEC-001–002.
- Scenario-basis or scenario-validity changes: None. SCN-001–003 remain approved normal/explicit-edge scenarios.
- Why this baseline or revision was recorded: Architecture investigation showed a clean cut within existing boundaries: direct roles already exist in the Org payload; an existing admitted endpoint-catalog query supplies detail-only nested/coordinator roles; only create/edit and other structural consumers need the full exact-reference graph.
- Canonical requirements, investigation and design sections changed: Recorded approval in requirements; added post-approval architecture evidence/findings; created `design-spec.md`; updated approval record and result package.
- Supplemental artifacts added, changed or removed: No new product supplement; existing screenshots remain evidence. Added `design-spec.md` and `architecture-handoff.md` as Solution Designer artifacts.
- Prototype evidence or product decisions incorporated: No Product Design request or prototype. Approved existing-layout role presentation is fully specified by requirements/source evidence.
- Intended behavior changed: `No` relative to approved SR-004. SR-005 realizes the approved intent technically.
- Approval impact, exact approved requirements baseline and user-approval reference: SR-004 explicitly approved by the user's 2026-09-21 message quoted in `requirements-doc.md` and `design-spec.md`. No renewed approval is required for SR-005 because it does not change intent.
- Behavior-defining supplement versions and approval references: N/A.
- Affected design/review basis invalidated or rebuilt: First design for this package. Earlier unapproved frontend-loading and resolved-name API proposals remain historical only.
- Post-design task-size/risk classification and rationale changes: `task_size=Medium`, `architectural_risk=Low`. Several frontend files/tests/docs change inside established ownership; an existing GraphQL query is reused; no backend schema, persistence, security, route, deployment, or ownership-boundary change.
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: Matched the direct implementation rule for `Medium`/`Low`; recipient `/software_engineering_team/implementation_engineer`; authoritative result file is `architecture-handoff.md`.
- Downstream and architecture-review impact: Low-risk Medium design is eligible for the direct implementation route under current rules; independent architecture review is not required unless rule evaluation says otherwise.
- Remaining gaps, assumptions or blocked decisions: No design blocker. API/E2E must perform browser/network verification because the local worktree lacks installed frontend dependencies and no new runtime pass is claimed.
- Next action: Apply handoff rules and route the complete package to the returned recipient.
