# Solution Revision Record

Package identifier: `PROJ-TASKS-20260926-001` — `project-tasks`.
The current `requirements-doc.md`, `investigation-notes.md` and, once created, `design-spec.md` remain authoritative.

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-008 | Mixed | `ARCH-REV-002` round 2 Fail | `AR-001`, `AR-002` | Requirements Approved; design Ready (SR-007, review Fail) | Requirements Approved (editorially corrected); design Ready — Architecture Design Complete (`Medium`/`High`) | `REQ-006` (narrow clarified), `AC-002`, `SCN-002`, `DEC-016`, approval metadata; board layout rule; e2e guard | Board switches on its own width (752 px); requirements metadata coherent; re-review |
| SR-007 | Mixed | User simplification instruction (2026-09-27) + design revision | N/A | Requirements Approved (SR-006); design Needs Revision | Requirements Approved; design Ready — Architecture Design Complete (`Medium`/`High`) | `REQ-006`, `DEC-014`–`DEC-016`, UI rules; web design | Clean board; web design revised; re-review |
| SR-006 | Requirements | User delegated the detailed UX choice (2026-09-27); UX analysis recorded | N/A | Ready for Approval | Approved | `DEC-014`, `DEC-015` resolved; `DEC-016` added; UI normative rules | Approved `APPROVAL-PROJ-TASKS-20260927-002`; design revision next |
| SR-005 | Requirements | User rejected the delivered two-pane UI in testing (2026-09-27) | N/A | Requirements Approved (SR-003); design Ready (SR-004); delivery awaiting verification | Requirements Ready for Approval; design Needs Revision; delivery on hold | `REQ-006`, `REQ-007`, `REQ-009`, `REQ-016`; `AC-002`, `AC-005`, `AC-007`, `AC-011`; `SCN-007`; `DEC-012`→A, `DEC-013`→board; new `DEC-014`, `DEC-015` | Released grid + full-width Project page with Back + three-column board; renewed approval pending |
| SR-004 | Design | Architecture investigation and design after approval | N/A | Requirements Approved; design N/A | Requirements Approved; design Ready — Architecture Design Complete (`task_size=Medium`, `architectural_risk=High`) | unchanged | `design-spec.md` created; routed per handoff rules |
| SR-003 | Requirements | User approval 2026-09-26 "B + list, rest as recommended" | N/A | Draft | Approved | `REQ-006`, `REQ-009`, `REQ-016`, `AC-011` concretised; `DEC-005`, `DEC-009`, `DEC-010`, `DEC-012`, `DEC-013` resolved | Approved (`APPROVAL-PROJ-TASKS-20260926-001`) |
| SR-002 | Requirements | User feedback round 1 (2026-09-26): no title, no human status changes, navigation question | N/A | Ready for Approval | Draft | `REQ-001`–`REQ-016` (`REQ-004` withdrawn), `AC-001`–`AC-012` rewritten, `SCN-007` added, `SCN-X01` rejected, `DEC-012`/`DEC-013` added | Model simplified; navigation and layout decisions opened |
| SR-001 | Requirements | User request 2026-09-26 (Tasks in Projects; no admission) | N/A | N/A | Ready for Approval | `BEH-001`–`BEH-006`, `REQ-001`–`REQ-014`, `AC-001`–`AC-012`, `SCN-001`–`SCN-008`, `DEC-001`–`DEC-011` | Baseline presented for approval |

## Revision Entries

### SR-001 — Project Tasks baseline

- Phase and classification: `Initial Baseline`
- Trigger: the user's request after the Projects release (v1.4.86), plus investigation of the released Projects code at `origin/personal@e06080b00` and the exploratory board `VIS-024`/`VIS-025`.
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Ready for Approval`; design N/A
- Affected IDs: listed in the index. This package supersedes released `REQ-014`/`AC-012` of `PROJ-CONCEPT-20260926-001` and extends that package's `REQ-009` (Project deletion scope).
- Scenario-basis changes: `SCN-008` is classified Supported Explicit Edge, because released Project data exists on the user's node.
- Canonical sections: all sections created.
- Supplements: none; exploratory evidence linked.
- Intended behavior changed: `N/A` (baseline)
- Approval impact: pending explicit approval; `DEC-011` confirms that task admission is excluded.
- Design and review impact: N/A
- Next action: present to the user for approval.

### SR-002 — Round-1 refinement: description-only, agent-owned status, navigation

- Phase and classification: `Refinement`
- Trigger: user feedback 2026-09-26. Titles are hard for users, so Tasks use a description only. Humans do not move Tasks, because agents manage status. The scope is create, view, edit, delete and search Tasks, delete Project (cascade), and not-done counts. The user asked how navigation between Projects and Tasks works.
- Prior status: `Ready for Approval` (SR-001) → current: `Draft`
- Changes:
  - `REQ-001` has no title (the description is required).
  - `REQ-002` is new: the summary is the first description line.
  - `REQ-003`: status exists, but there is no user-facing change.
  - `REQ-004` is withdrawn.
  - Layout moved to `DEC-013`.
  - `REQ-016` is new (navigation, `DEC-012`).
  - ACs rewritten.
  - `SCN-007` added (switching Projects).
  - `SCN-X01` (human status change) classified Technically Possible but Unsupported.
  - `DEC-003`/`DEC-004`/`DEC-006`/`DEC-007`/`DEC-011` resolved in conversation; `DEC-002`/`DEC-008` superseded.
- Consequence surfaced to the user: until Task admission ships, every Task is To Do. That motivates `DEC-013`: a list with status now rather than a board with two empty columns.
- Intended behavior changed: `Yes` (pre-approval).
- Approval impact: none yet; approval is pending on `DEC-012`/`DEC-013`.
- Next action: user chooses `DEC-012` (navigation A/B/C) and `DEC-013` (list vs board), then formal approval.

### SR-003 — Approval: two-pane Projects page + Task list

- Phase and classification: `Refinement` + approval
- Trigger: the user asked which UI is user-friendly and clean. The Solution Designer recommended B + list, with evidence that Settings already uses a two-pane layout and that a board would show two permanently empty columns. The user replied "B + list, rest as recommended" (2026-09-26).
- Prior status: `Draft` → current: `Approved`
- Changes:
  - `REQ-006` is now a list with status label, summary, updated time and status filter.
  - `REQ-009` refers to the list pane.
  - `REQ-016` defines the two-pane page and replaces the released card grid and Project page.
  - `AC-011` is concrete.
  - `DEC-005`/`DEC-009`/`DEC-010`/`DEC-012`/`DEC-013` resolved.
  - The UI section now lists the normative clean-layout rules the user accepted.
- Intended behavior changed: `Yes` (pre-approval refinement, now approved)
- Approval: `APPROVAL-PROJ-TASKS-20260926-001`. Basis `SR-003`, with `REQ-001`–`REQ-016` (`REQ-004` withdrawn) and `AC-001`–`AC-012`.
- Next action: architecture investigation and design.

### SR-004 — Architecture design for Project Tasks

- Phase and classification: `Design` — initial design baseline
- Trigger: approval `APPROVAL-PROJ-TASKS-20260926-001`; architecture findings recorded in `investigation-notes.md`.
- Prior status: requirements Approved, design N/A → requirements Approved (unchanged), design `Ready`.
- Key decisions:
  - Tasks are embedded in `projects.json` Project rows. The released data is directly usable, with no migration.
  - A new `ProjectTaskService` owns Task invariants. It is additive to GraphQL (`ProjectTask`, `projectTasks`, create/update/delete, `Project.openTaskCount`) and adds no status mutation.
  - The web uses a two-pane parent route `pages/projects.vue`. `ProjectsList`/`ProjectCard` are removed. `ProjectDetail` gets tabs; the Workspaces section is extracted; Task list and dialog components are added; `projectTaskStore` is new.
- Intended behavior changed: `No`
- Approval impact: the `SR-003` approval stands.
- Classification: `task_size=Medium` (within the Projects subsystem; about 25 files). `architectural_risk=High`, because the released persisted shape and GraphQL contract gain fields and the released UI is replaced.
- Handoff: `get_handoff_rules` → the Large-or-High rule → `/architecture_reviewer`; result file `handoff-to-architecture-review-sr-004.md`.
- Next action: architecture review.

#### SR-004 review outcome (informational)

- 2026-09-26: `/architecture_reviewer` `ARCH-REV-001` (round 1) returned **Pass** for `SR-003` + `SR-004`, with no findings. Six non-blocking implementation notes are in `design-review-report.md`, including `P-001` (single source for the delete-confirmation count).
- The reviewer handed the package to `/implementation_engineer`.
- No Solution Designer re-handoff and no new SR round: the solution basis is unchanged.

### SR-005 — Requirement change after user testing: released grid, full-width Project page, three-column board

- Phase and classification: `Requirement Gap` (the user changed intended behavior)
- Trigger: on 2026-09-27 the user tested the delivered build, which was awaiting verification (delivery DR-001; `handoff-summary.md` "Awaiting explicit user verification"). The user said: "the UI looks terrible… three-column view… not accepted… project page should be the same as the earlier… back button… top left… tasks should be in three columns… everything looks so squeezed."
- Prior status: requirements `Approved` (SR-003), design `Ready` (SR-004), implementation and reviews passed, delivery awaiting verification.
- Current status: requirements `Ready for Approval`, design `Needs Revision`, downstream delivery on hold. Nothing is merged or released.
- Changes:
  - `DEC-012` B → A;
  - `DEC-013` list → three-column board (the user accepts that only To Do is populated until admission);
  - `REQ-006` is now a full-width board with no drag and no move;
  - `REQ-007` searches across columns and drops the status filter;
  - `REQ-009` puts the count on the card;
  - `REQ-016` restores the released grid and adds a separate full-width Project page with a top-left Back control;
  - `AC-002`, `AC-005`, `AC-007`, `AC-011` and `SCN-007` rewritten;
  - UI normative rules replaced;
  - new `DEC-014` (workspaces placement) and `DEC-015` (card count).
- Unchanged:
  - the storage model (Tasks embedded in `projects.json`);
  - the server and GraphQL surface;
  - description-only Tasks;
  - agent-owned status;
  - cascade delete;
  - search;
  - the flag.
- Intended behavior changed: `Yes`
- Approval impact: `APPROVAL-PROJ-TASKS-20260926-001` is superseded for the listed IDs. Renewed explicit approval is required before the design revision.
- Design and review impact:
  - `design-spec.md` (SR-004) web page structure is invalidated: nested route, list pane, and list layout.
  - The server design remains valid.
  - `ARCH-REV-001` Pass covers only SR-004, so re-review is required after the design revision.
- Next action: user approves `SR-005` (with `DEC-014`/`DEC-015`); then design revision SR-006 and routing per handoff rules.

### SR-006 — UX analysis and renewed approval

- Phase and classification: `Refinement` + renewed approval
- Trigger: after SR-005 the user asked for deep UX thinking, then said "after you do a deep thinking and validate by yourself… pick the best user experience… then continue the work" (2026-09-27).
- Prior status: requirements `Ready for Approval` → current: `Approved`
- Changes:
  - `DEC-014`: tabs Tasks | Workspaces (n).
  - `DEC-015`: keep the card count.
  - `DEC-016`, new: the board detail choices.
  - The UI normative rules were rewritten.
  - A UX analysis with measured evidence was added to `investigation-notes.md`.
- Intended behavior changed: `Yes` (it refines SR-005 within the user-fixed direction).
- Approval: `APPROVAL-PROJ-TASKS-20260927-002`. The direction is fixed by the user; the detailed UX was explicitly delegated. The basis is `SR-006` requirements.
- Design and review impact:
  - The `SR-004` web design is invalidated; the server design stays valid.
  - The design revision `SR-007` requires architecture re-review.
- Next action: design revision.

### SR-007 — Simplified UI and web design revision

- Phase and classification: `Mixed`. Requirements refinement within the approved direction and the delegated UX authority, plus a design revision.
- Trigger: user, 2026-09-27: "Don't make the UI complicated. The UI should stay clean enough."
- Requirements changes:
  - `REQ-006` cards are description-only, with page scroll.
  - `DEC-014` uses plain tabs.
  - `DEC-015` merges the count into the card's bottom line.
  - `DEC-016` is simplified.
  - UI rules rewritten.
- These changes remove elements the user did not ask for and add no new behavior. They stay within `APPROVAL-PROJ-TASKS-20260927-002`, which delegated the detailed UX under the user's own simplicity constraint.
- Design changes (`design-spec.md` rewritten as SR-007):
  - Server, storage and GraphQL are unchanged from SR-004 (reviewed Pass).
  - The web restores the released grid and the full-page Project route.
  - The two-pane components, the list and the status filter are removed.
  - A new board and card replace the list panel and rows.
- Classification: package `task_size=Medium`, `architectural_risk=High`. That is unchanged for the package as a whole, because it still carries the persisted-shape and GraphQL additions. The revision itself is web-only.
- Handoff: `/architecture_reviewer`, per the rules (Large or High); result file `handoff-to-architecture-review-sr-007.md`.
- Downstream: the delivered `a0fd103af` candidate was rejected in user verification. Delivery DR-001 must not finalize it; the revised package re-enters implementation after review.

### SR-008 — Resolve ARCH-REV-002 (board-width layout rule; requirements coherence)

- Phase and classification: `Mixed` — `Design Impact` (`AR-001`) + editorial requirements coherence (`AR-002`)
- Trigger: `/architecture_reviewer` `ARCH-REV-002` round 2, Fail (`design-review-report.md`).
- AR-001 (verified: `LEFT_PANEL_MAX_WIDTH_PX = 520`; no window `minWidth`):
  - The columns switch on the board's own width, using a plain-CSS `@container project-task-board (min-width: 752px)`, following the `GeminiConfigurationOptionCard.vue` precedent.
  - The minimum column width is 240 px. This reconciles the earlier 220/720 estimate.
  - The e2e probe adds reduced-width cases: the left panel at 520 px at 1200×800, and a 1000 px window. Columns must be at least 240 px or stacked.
  - `REQ-006`, `AC-002` and `DEC-016` now state "narrow" as the board's available width. This is a clarification of the approved "stack on narrow" behavior, not new behavior.
- AR-002 (requirements coherence):
  - The approval header now names `APPROVAL-PROJ-TASKS-20260927-002` and the `SR-008` basis, with the current `DEC-012` = A and `DEC-013` = board.
  - The supersession list includes `REQ-007`.
  - The Preserved Behavior Boundary now describes the released grid and page as kept.
  - `SCN-002` is updated for the board.
  - The `DEC-016` cell is a single line.
- Intended behavior changed: `No`
- Approval impact: `APPROVAL-PROJ-TASKS-20260927-002` stands; no renewed approval is needed.
- Classification: unchanged, `Medium`/`High`.
- Handoff: `/architecture_reviewer` for the narrow re-review; result file `handoff-to-architecture-review-sr-008.md`.
- Downstream: delivery candidate `a0fd103af` (DR-001) must still not be finalized.

#### SR-008 review outcome (informational)

- 2026-09-27: `/architecture_reviewer` `ARCH-REV-003` (round 3) returned **Pass** for `SR-004` + `SR-008`.
  - `AR-001` and `AR-002` are resolved and verified.
  - The reviewer handed the package to `/implementation_engineer`.
- Editorial evidence clarification, no behavior or design change: the reviewer noted that `investigation-notes.md` still carried the superseded ~720/~220 estimate. That line now points to the authoritative 240 px / 752 px reconciliation.
- No new SR round and no re-handoff.
