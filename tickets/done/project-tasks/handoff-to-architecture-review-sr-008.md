# Handoff — Architecture Design Complete (SR-008, revision for ARCH-REV-002)

- Result classification: `Architecture Design Complete` (revised)
- Package identifier: `PROJ-TASKS-20260926-001` (`project-tasks`)
- Current solution revision: `SR-008`. It revises `SR-007` for `ARCH-REV-002` `AR-001` and `AR-002`.
- Classification: `task_size=Medium`, `architectural_risk=High` (unchanged).
- Route: `get_handoff_rules` rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/architecture_reviewer`.
- Expected output: a narrow re-review of three things: the board layout rule, the e2e width guards, and the corrected requirements metadata.

## Approval Basis

- Requirements are `Approved` under `APPROVAL-PROJ-TASKS-20260927-002`.
- `SR-008` is an editorial coherence correction plus a clarification of "narrow" as the board's available width. Intended behavior does not change, and no renewed approval is required.

## Workspace Context

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks`, branch `codex/project-tasks`, head `a0fd103af`.
- Delivery DR-001 on that head must not be finalized.
- Finalization target: `origin/personal`.

## Finding Resolution

### AR-001 — the board switches on its own width

Verified facts:
- `LEFT_PANEL_MAX_WIDTH_PX = 520` (`utils/layout/responsiveLayoutPolicy.ts:21`, clamped in `composables/useLeftPanel.ts:31`).
- The Electron window has no `minWidth`.

Design (`design-spec.md` › Ownership Map `ProjectTaskBoard`, Concrete Examples "Layout classes", Final File Mapping, Reuse Check, Change Sequence step 6, Risks, Guidance):
- The board wrapper declares `container-type: inline-size; container-name: project-task-board`.
- The columns default to a single stacked column. A scoped `@container project-task-board (min-width: 752px)` rule switches them to `repeat(3, minmax(0, 1fr))`.
- 752 px = 3 × 240 px minimum column + 2 × 16 px gap. This single rule replaces the earlier 220/720 estimate.
- The pattern follows the existing plain-CSS `@container` in `components/settings/providerApiKey/GeminiConfigurationOptionCard.vue:224`. No plugin is added.
- Viewport breakpoints for the column switch are explicitly forbidden.

E2E guards:
- Default panel at 1200×800: the columns sit side by side and each is ≥ 240 px.
- Left panel at its 520 px maximum at 1200×800, and separately a 1000×800 window: every column is ≥ 240 px, or the columns are stacked.
- Narrow window: the columns stack.

Requirements: `REQ-006`, `AC-002` and `DEC-016` now state the rule in terms of the board's available width.

### AR-002 — requirements coherence

- The header now carries the current approval and the `SR-008` basis: `DEC-012` = A, `DEC-013` = board, and `DEC-014`–`DEC-016`. The superseded `SR-003` approval is marked superseded only for the IDs that changed.
- The supersession list now includes `REQ-007`.
- The Preserved Behavior Boundary now says the released grid and Project page are kept, with the open-task count added to the card's bottom line.
- `SCN-002` describes the board and cross-column search.
- The `DEC-016` table cell is a single line.
- Readiness names `SR-008`.

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/investigation-notes.md` (see "ARCH-REV-002 evidence")
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-spec.md` (`SR-008`)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/solution-revision-record.md` (`SR-008` entry)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-review-report.md` (`ARCH-REV-002`)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/architecture-review-revision-record.md`
