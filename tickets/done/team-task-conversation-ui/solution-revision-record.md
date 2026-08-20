# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | User request, investigation, and initial interpretation round | N/A | `Initial Baseline` | Superseded and withdrawn by SR-003 pending full user review |
| SR-002 | User pane-placement clarification after initial handoff | BEH-002; REQ-004–REQ-006; AC-005–AC-006 | `Clarification` | Superseded and withdrawn by SR-003 pending full user review |
| SR-003 | User process correction after SR-002 handoff | N/A | `Approval Correction` | Review handoff withdrawn; complete package reopened for user review |
| SR-004 | User prototype review and explicit requirements approval | BEH-001–BEH-006; REQ-003–REQ-014; AC-001–AC-014 | `UI Fidelity And Approval` | Requirements/UI behavior approved; aligned solution package awaits final user review before any handoff |
| SR-005 | User authorization to finish solution alignment while retaining the final-review gate | BEH-001–BEH-006; REQ-001–REQ-015; AC-001–AC-015 | `Final Design Alignment` | Complete cumulative solution package ready for final user review; no downstream handoff sent |

## Revision Entries

### SR-001 — Initial task lifecycle thread baseline (later withdrawn)

- Triggering role, report path, and round: User request plus two clarification/approval turns on 2026-08-20; initial solution baseline.
- Triggering finding IDs: N/A
- Prior authoritative result: `N/A`
- Current authoritative result at that round: The solution designer recorded the requirements/UI package as approved and ready for architecture review. SR-003 corrects that classification: the complete package was not yet approved and the handoff is withdrawn.
- Why this baseline or revision entry is recorded: Establish the first complete solution package for displaying task submissions, review comments, revision cycles, update-owned references, and accepted/done state without changing Messages or the current task/reference interaction.
- Resolution:
  - preserve the current description-first task row, initial reference rows, resizable split, right-side detail, and existing reference viewer;
  - add ordered nested selectable submission/review/revision/resubmission/acceptance/interruption rows under each task;
  - show the selected task/update's full content on the right and preserve owner-aware reference return behavior;
  - derive user-meaningful task status from the authoritative record;
  - make no Messages production change;
  - remove the complete Technical details disclosure, technical rows, raw JSON builder, and technical-only UI keys.
- Approved behavior or requirement IDs affected: BEH-001–BEH-006; REQ-001–REQ-015; AC-001–AC-015.
- Canonical artifacts and sections updated:
  - `requirements.md` — complete then-proposed behavior and acceptance basis;
  - `investigation-notes.md` — current code/data paths, evidence, invariants, and approval record;
  - `design-spec.md` — task-only presentation projection, selection, rendering, removal, file mapping, and sequence.
- Supplemental artifacts updated, added, or removed: `ui-ux-spec.md` added and refined with approved nested-row wireframes and complete Technical details removal.
- Downstream and architecture-review impact: Architecture review should validate the tight lifecycle-item presentation model, exact item/reference selection ownership, clean technical-details removal, and explicit no-change boundary around Messages before implementation.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: No requirement gap. Proportionate residual risks are live selection retention, navigator density for long histories, task-Team attribution at Team granularity, localization alignment, and prevention of incidental Messages refactoring.

### SR-002 — Lock timeline to the left pane

- Triggering role, report path, and round: User clarification in the task conversation after the SR-001 architecture-review handoff; second solution round.
- Triggering finding IDs: BEH-002; REQ-004–REQ-006; AC-005–AC-006
- Prior authoritative result: `SR-001` already placed nested lifecycle rows in the left navigator and selected content in the right pane, but the pane ownership needed stronger wording to prevent an implementation or review interpretation that could put a timeline on the right.
- Current authoritative result: The complete timeline is permanently owned by the left task navigator. Activating a left-side item changes only the right-side detail/reference content. The right pane must never render, duplicate, or relocate the lifecycle list.
- Why this revision is recorded: The user explicitly reiterated the two-panel mental model: left is the task timeline/navigation surface; right is the selected detail surface.
- Resolution:
  - strengthen requirements and acceptance criteria with explicit left-only timeline placement;
  - add a non-negotiable pane-ownership section to `ui-ux-spec.md`;
  - constrain navigator/detail component responsibilities and coverage in `design-spec.md`;
  - retain every SR-001 scope decision, including unchanged Messages and complete Technical details removal.
- Approved behavior or requirement IDs affected: BEH-002; REQ-004–REQ-006; AC-005–AC-006.
- Canonical artifacts and sections updated: `requirements.md` goal/behavior/requirements/acceptance/approval; `investigation-notes.md` source log/risks/reviewer notes; `design-spec.md` intended change/behavior map/spine/file responsibilities/guidance; `ui-ux-spec.md` confirmed direction/pane ownership/right detail/approval.
- Supplemental artifacts updated, added, or removed: `ui-ux-spec.md` clarified; no supplement added or removed.
- Downstream and architecture-review impact: Architecture review must use SR-002 as the current round and reject any design or implementation that renders lifecycle navigation in the right pane.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: No requirement gap remains. Existing SR-001 implementation risks remain unchanged.

### SR-003 — Withdraw review pending complete user approval

- Triggering role, report path, and round: User correction in the task conversation after the SR-002 handoff; third solution round.
- Triggering finding IDs: N/A
- Prior authoritative result: SR-002 treated the full requirements/UI basis as approved and routed it to architecture review.
- Current authoritative result: The complete requirements and UI/UX proposal are `Refined — awaiting full user review`. Both earlier architecture-review handoffs are withdrawn, and no downstream review or implementation is authorized.
- Why this revision is recorded: The user explicitly stated that they want to discuss and review all artifacts, especially the UI, before anything is sent for architecture review.
- Resolution:
  - correct the requirements and UI/UX approval states;
  - distinguish individually confirmed directions from approval of the full package;
  - mark the design as retained draft material for user discussion;
  - instruct downstream roles to disregard SR-001/SR-002 handoffs until a new explicitly approved handoff is sent.
- Confirmed directions retained: Messages remain unchanged; Technical details are removed; the complete task timeline stays on the left; the right pane shows only selected detail/reference content.
- Canonical artifacts and sections updated: `requirements.md` status/supplement/approval; `investigation-notes.md` status/source log/risks/reviewer note; `design-spec.md` review state/supplement status; `ui-ux-spec.md` status/approval.
- Supplemental artifacts updated, added, or removed: `ui-ux-spec.md` approval state corrected; no supplement added or removed.
- Downstream and architecture-review impact: Stop and disregard the previously delivered review requests. Resume only after an explicit user approval and a fresh cumulative-package handoff.
- Next recipient or routing: User review; no downstream recipient yet.
- Remaining gaps or risks: The user has not yet reviewed every proposed UI state, label, interaction, or wireframe detail.

### SR-004 — Production-fidelity UI contract and explicit approval

- Triggering role, report path, and round: User review of the interactive two-task prototype and exact interaction clarification; fourth solution round on 2026-08-20.
- Triggering finding IDs: BEH-001–BEH-006; REQ-003–REQ-014; AC-001–AC-014.
- Prior authoritative result: SR-003 withdrew review and reopened the full requirements/UI basis for user discussion.
- Current authoritative result: Requirements and UI behavior are user-approved. The complete aligned solution package still requires a separate final user review before any architecture-review handoff.
- Why this revision is recorded: Visual inspection exposed fidelity errors that prose alone did not prevent. The user required the HTML to represent the eventual production UI precisely and then explicitly approved the corrected requirements behavior.
- Resolution:
  - add and iteratively correct `task-timeline-ui-prototype.html` as a production-fidelity supplemental artifact;
  - keep complete task timelines and all task/update reference navigation on the left;
  - keep the right pane mutually exclusive: one selected task/update detail or the existing reference viewer;
  - remove duplicate right-side reference cards;
  - replace invented visible `Preview`/`Raw` tabs with the production icon-only pencil/raw, eye/preview, and maximize/restore controls;
  - match the existing task divider contract (`248px` initial, `168px` minimum, `360px` maximum), initial root selection, Tasks collapse/reopen retention, and non-collapsible task groups;
  - validate 40 task-area click/state assertions plus divider boundaries without failure;
  - align requirements, investigation evidence, UI/UX contract, and technical design with those decisions.
- Approved behavior or requirement IDs affected: BEH-001–BEH-006; REQ-001–REQ-015; AC-001–AC-015.
- Canonical artifacts and sections updated: `requirements.md` statuses/supplement inventory/reference rules/acceptance/approval; `investigation-notes.md` status/supplement inventory/source and runtime evidence/reviewer note; `design-spec.md` review state/pane ownership/supplements/ownership/sequence/guidance; `ui-ux-spec.md` status/fidelity contract/exact click-result table/wireframes/right detail/reference rules/approval.
- Supplemental artifacts updated, added, or removed: `task-timeline-ui-prototype.html` added and validated; `ui-ux-spec.md` remains the authoritative intended-behavior supplement.
- Downstream and architecture-review impact: Do not use the withdrawn SR-001/SR-002 handoffs. After the user's final package review and explicit instruction, a fresh handoff must include SR-004 and both supplements with the three core artifacts.
- Next recipient or routing: User final solution-package review; no downstream recipient yet.
- Remaining gaps or risks: No known requirements/UI ambiguity remains. Proportionate implementation risks remain live-selection repair, dense long histories, task-Team-level attribution, localization alignment, and avoiding incidental Messages changes.

### SR-005 — Complete implementation-ready design alignment

- Triggering role, report path, and round: User instruction in the task conversation to continue after approving the requirements/UI behavior, while explicitly retaining a final user review before architecture review; fifth solution round on 2026-08-20.
- Triggering finding IDs: BEH-001–BEH-006; REQ-001–REQ-015; AC-001–AC-015.
- Prior authoritative result: SR-004 approved the production-fidelity UI behavior and required the technical design to be aligned before a separate final package review.
- Current authoritative result: The requirements, investigation notes, UI/UX specification, prototype, and technical design are mutually aligned and ready for the user's final package review. No architecture-review handoff has been sent for this round.
- Why this revision is recorded: Implementation must not infer ordering, identity, participant, revision-label, reference-ownership, or selection-repair rules from the prototype alone.
- Resolution:
  - define a discriminated `DelegatedTaskLifecycleItem` presentation contract and exact entry/item/reference locator shapes;
  - preserve current task-group source order and durable per-task update order rather than copying Messages' newest-first sort;
  - define stable keys, result ordinals, review linkage, revised-result derivation, participant fallbacks, display status, and latest-activity derivation;
  - define exact live selection repair and single-owner left-reference/right-viewer behavior;
  - keep the user-approved production-fidelity UI contract, current split dimensions, icon-only viewer controls, and strict no-Messages/no-technical-details boundaries;
  - complete a cross-artifact consistency/static pass, 51/51 fresh browser interaction assertions, and a passing `248/168/360/248px` divider-boundary recheck.
- Approved behavior or requirement IDs affected: BEH-001–BEH-006; REQ-001–REQ-015; AC-001–AC-015.
- Canonical artifacts and sections updated: `requirements.md` task-order preservation and scenario intent; `investigation-notes.md` current status/order evidence; `design-spec.md` review state, behavior map, presentation model contract, and projection rules; `ui-ux-spec.md` selection/order contract.
- Supplemental artifacts updated, added, or removed: `ui-ux-spec.md` aligned; `task-timeline-ui-prototype.html` retained unchanged as the validated rendering contract.
- Downstream and architecture-review impact: Architecture review remains prohibited until the user reviews this complete SR-005 package and explicitly instructs the solution designer to send it. Any later handoff must include the three core artifacts, both supplements, and this revision record.
- Next recipient or routing: User final solution-package review; no downstream recipient yet.
- Remaining gaps or risks: No known requirement or design ambiguity remains. Residual implementation risks are live selection repair, task-Team attribution at Team granularity, long-history density, localization alignment, and accidental Messages changes; each has an explicit design constraint and planned coverage.
