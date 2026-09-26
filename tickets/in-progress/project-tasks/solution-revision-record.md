# Solution Revision Record

Package identifier: `PROJ-TASKS-20260926-001` — `project-tasks`.
The current `requirements-doc.md`, `investigation-notes.md` and, once created, `design-spec.md` remain authoritative.

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
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
