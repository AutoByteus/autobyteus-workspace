# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/requirements-doc.md` (status `Approved`, `SR-008` basis, `APPROVAL-PROJ-TASKS-20260927-002`)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/investigation-notes.md` (incl. "UX Analysis For SR-005/SR-006" and "Simplification")
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/solution-revision-record.md` (`SR-005`–`SR-007`)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-spec.md` (`SR-008`, `Ready`)
- Supplemental Task Artifacts Reviewed: None define behavior. Context only: the released predecessor, and the downstream reports for the `SR-004` implementation.
- Relevant Solution Revision IDs: `SR-004` (server design, unchanged), `SR-005`, `SR-006`, `SR-007`, `SR-008`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: `3`
- Trigger: `handoff-to-architecture-review-sr-008.md`, which resolves `AR-001`/`AR-002` of `ARCH-REV-002`. Round 2 was triggered by `handoff-to-architecture-review-sr-007.md`, the web revision made after the user rejected DR-001 (`a0fd103af`).
- Prior Review Round Reviewed: Round 2 (`ARCH-REV-002`, Fail: `AR-001`, `AR-002`). Round 1 was `ARCH-REV-001`, Pass on `SR-003` + `SR-004`.
- Latest Authoritative Round: `3`
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks` @ `a0fd103af`. Files read:
  - The delivered two-pane web components (`pages/projects.vue`, `ProjectListPane`, `ProjectTasksPanel`, `ProjectTaskRow`) and `ProjectDetail.vue`. The delete message already uses `project.openTaskCount` (L230–240), which closes round 1 Residual note 1.
  - Shell layout: `layouts/default.vue` (the `AppLeftPanel` has a user drag handle on `md`+), `composables/useLeftPanel.ts` (clamped 260–520 px), `utils/layout/responsiveLayoutPolicy.ts` (left default 320, max 520, `WORKSPACE_CENTER_MIN_WIDTH_PX` 480, md breakpoint 768), `electron/shell/workspace-shell-window.ts` (1200×800, no `minWidth`).
  - `@container` query precedent: `TokenUsageAnalyticsSummaryCards.vue`, `GeminiConfigurationOptionCard.vue`, `WorkspaceStableExecutionRow.vue`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: The package still changes a released persisted shape, a released GraphQL contract and released UI. The `SR-007` delta is web-only.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. The `SR-008` requirements header, baseline, supersession list (now including `REQ-007`), Preserved Behavior Boundary, `SCN-002`, `DEC-016` and Readiness are consistent with the approved direction (`AR-002` resolved).
- Approved requirements / intended behavior understood:
  - the released grid, with "N open tasks · N workspaces" on each card;
  - a separate full-width Project page with "← Projects";
  - plain Tasks/Workspaces tabs;
  - a three-column board (To Do, In Progress, Done) with name and count per column, and description-only cards clamped to 3 lines;
  - search across columns and no status filter;
  - page scroll only, with columns stacking on narrow windows;
  - not squeezed at the 1200×800 default;
  - no human status changes;
  - server, storage and GraphQL unchanged.
- Relevant existing behavior confirmed: The released files exist at `e06080b00`. The delivered components to be removed exist. The shell left panel is user-resizable up to 520 px and stays docked while the center keeps at least 480 px.
- Scope guardrail confirmed: As in round 1. `DEC-012` is revised to A and `DEC-013` to board.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass — `DS-002` switches columns on the board's own width (`@container project-task-board (min-width: 752px)`), stacked by default (`AR-001` resolved) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass (`DS-003` unchanged; the count comes from `openTaskCount`) | Confirmed | — |
| BEH-003 | User/Operational | Pass | Pass | Pass (flat `/projects*` routes; the existing prefix gates are unchanged) | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass (`DS-004` released navigation; `ProjectsList` force-loads on mount, so card counts are fresh after Back) | Confirmed | — |
| BEH-005 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass (unchanged) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None. The requirements-document coherence defects from round 2 are corrected in `SR-008` (`AR-002` resolved).

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | `Behavior Change` after user verification | — |
| Root cause explicit and evidence-backed | Pass | A layout width problem, measured (about 560 px), not an ownership defect | — |
| Refactor decision explicit | Pass | Clean-cut replacement; no refactor | — |
| Reflected in the design | Pass | Removal plan and restore list | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade Vs Owner | Naming | Ownership | Off-Spine Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Task writes (unchanged) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Board view | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Delete cascade (unchanged) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Grid ↔ Project page | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Search / group (bounded) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server boundaries (`ProjectTaskService`, `ProjectStore`) | Pass | Pass | Pass | Pass | Unchanged from `ARCH-REV-001` |
| `projectTaskStore` | Pass | Pass | Pass | Pass | `ProjectTaskBoard` replaces `ProjectTasksPanel` as the consumer |
| `projectStore.setOpenTaskCount` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| web Projects | Pass | Pass | Pass | Pass | Reintroducing a list pane or nested route is forbidden |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Server/GraphQL (unchanged) | Pass | Pass | Pass | Low | Pass |
| `ProjectTaskBoard { projectId }` / `ProjectTaskCard { task }` → `open` / `ProjectCard { project }` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Sound | New Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Released grid, card and routes | Pass | Pass | N/A | Pass | Restored from `e06080b00` |
| Store, dialog, Workspaces panel, `taskSummary` | Pass | Pass | N/A | Pass | — |
| `line-clamp-*` | Pass | Pass | N/A | Pass | — |
| Width-responsive switching | Pass | Pass | N/A | Pass | Plain-CSS `@container` pattern, as in `GeminiConfigurationOptionCard.vue` L223–224 (verified); no plugin added; viewport breakpoints are forbidden for this switch |

## Subsystem / Capability-Area Allocation Verdict

| Area | Clear | Sound | Supports Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| web `pages/projects/`, `components/projects/`, i18n, specs, e2e | Pass | Pass | Pass | Pass | Server has no change |

## Reusable Owned Structures Verdict

| Logic | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Grouping / count line | Pass | N/A | Pass | Pass | Local to the board and card |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Board view state `{ TODO, IN_PROGRESS, DONE }` | Pass | Pass | Pass | N/A | Pass | Computed, local |

## File Responsibility Mapping Verdict

| File group | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Restored pages, `ProjectsList`, `ProjectCard` | Pass | Pass | N/A | Pass | — |
| `ProjectDetail` (reworked) | Pass | Pass | N/A | Pass | — |
| `ProjectTaskBoard`, `ProjectTaskCard` | Pass | Pass | N/A | Pass | The container is the wrapper and the grid is its child, so the query styles the child correctly |
| i18n, specs, e2e probe | Pass | Pass | N/A | Pass | Width guards: the default panel (side by side, at least 240 px); the 520 px panel and a 1000 px window (at least 240 px or stacked); narrow (stacked) |

## Subsystem / Folder / File Placement Verdict

| Path | Clear | Matches Boundary | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Existing folders; no nested route | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Scope | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `pages/projects.vue`, `ProjectListPane`/`Item` and spec | Pass | Pass | Pass | Pass | — |
| `ProjectTasksPanel`/`Row`, their spec, status filter | Pass | Pass | Pass | Pass | — |
| Stale i18n keys (both locales) | Pass | N/A | Pass | Pass | Round 1 note 3 is covered |
| `max-w-[1100px]` wrapper | Pass | Pass | Pass | Pass | — |
| Two-pane e2e cases | Pass | Pass | Pass | Pass | Restored v1.4.86 journeys plus board cases |

## Legacy / Backward-Compatibility Verdict

| Area | Retention Exists | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Two-pane UI / list view | No | Pass | Pass | Toggles and alternatives are rejected |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `projects.json` | Directly Usable — No Migration (unchanged) | Pass | Pass | N/A | Pass | `SR-007` has no persistence change |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Restore → remove → rework → add → i18n → e2e | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Card line, page top, board, layout classes | Yes | Pass | Pass | Pass | The layout example now shows the container query and names `md:grid-cols-3` as the avoided shape |

## Material Premise Validation

### `P-001` — With a supported wider left panel or a mid-size window, the board keeps three columns below the non-squeezed width

- Round 2: `Reachable`. The full witness is kept in `ARCH-REV-002`: the left-panel drag to 520 px (`useLeftPanel.ts` clamp) and a resized window (no `minWidth`) leave the board about 578 px, which gave about 193 px columns under `md:grid-cols-3`.
- Round 3: the consequence is removed. Three columns now require at least 752 px of **board** width (3 × 240 + 2 × 16), and below that the columns stack.
  - At the default 1200×800 window: 1200 − 326 − 64 ≈ 810 px of board width, so three columns of about 259 px.
  - At the 520 px panel or a 1000 px window: about 578 px, so the columns stack.
  - The e2e probe guards both cases in the real shell.
- Review consequence: `AR-001` resolved.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed on `SR-008`, both round 2 findings are resolved, and no in-scope machinery depends on an unsupported premise. The design is ready for implementation.

## Findings

None open. Resolved in round 3, with details in `architecture-review-revision-record.md` › `ARCH-REV-003`:
- `AR-001` (Medium) — board-width layout rule.
- `AR-002` (Low) — requirements coherence.

## Classification

N/A (Pass).

## Recommended Recipient

`/implementation_engineer`; `/solution_designer` receives an informational notification.

## Residual Risks

- Delivery DR-001 (`a0fd103af`) must not be finalized. The revised implementation replaces its web UI.
- Round 1 notes:
  - Note 1 is resolved in code (`openTaskCount` for the delete count). The admission ticket must revisit it once Tasks can be Done.
  - Note 2 is obsolete.
  - Notes 3 and 4 are covered by the removal plan.
- Test churn from restoring the released specs and probe cases. Restore them with `git show e06080b00:<path>`.
- Page scroll with 100+ To Do cards scrolls the toolbar away. The user accepted this.
- `investigation-notes.md` L199 still carries the superseded "~720 px / ~220 px" estimate. The SR-008 reconciliation (L235) and the design are authoritative. This is editorial only.
- `container-type: inline-size` must sit on a wrapper whose width comes from its parent (block layout), not on the grid itself.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (`P-001` is resolved by the design)
- Notes: Round 3 was a narrow re-review of the board layout rule, the e2e width guards and the requirements coherence. All other verdicts carry forward from round 2.
