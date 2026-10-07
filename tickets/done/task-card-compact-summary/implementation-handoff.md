# Implementation Handoff — `task-card-compact-summary`

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct implementation route (Small/Low; no independent architecture review). Routing comes from `get_handoff_rules` at handoff time.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/requirements-doc.md` (SR-002, user-approved 2026-10-07)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/design-spec.md` (SR-002)
- Supplemental task artifacts:
  - Evidence screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/evidence/temp-tasks-full-content-2026-10-07.png`
  - Prior UI/UX spec, unchanged: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/ui-ux-spec.md`
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable` (direct route)
- Triggering rework report: N/A (initial implementation)

## Current Implementation Summary

Task cards on Project boards and on Temp tasks are compact again, however long the description is.

1. **Clamp works.** The conflicting `block` utility is removed from both clamped spans in `ProjectTaskRow.vue`, so `line-clamp-2` applies to both the summary and the preview. `break-words` is added to the preview.
2. **Bounded card text.** `utils/projects/taskSummary.ts` is now the single owner of card text derivation:
   - `taskSummary` (unchanged rule).
   - `taskPreview`, moved out of the component.
   - `boundTaskText(text, max)`: cuts at a word boundary, never splits a surrogate pair, and ends with "…" within `max`.
   - `taskCardSummary` and `taskCardPreview`, each at most `TASK_CARD_TEXT_MAX_CHARS = 300`.
   - `taskSummaryLabel`, at most `TASK_SUMMARY_LABEL_MAX_CHARS = 120`.
3. **Bounded one-line labels.** The card link's `aria-label` and the Task page's delete confirmation use `taskSummaryLabel`.
4. **Unchanged.** Board and Temp search still match the full description; both Task pages show the full text; short descriptions render exactly as before.

**Implementation metadata**
- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - The change touches one component's classes and computed text, the summary utility (+ tests), one argument in the detail component, a new row spec, the browser probe (PMU-013) and docs.
  - There is no server, contract, data, store or ownership change.
  - The escalation trigger did not fire: the clamp is reliable in Chromium 154 (computed `-webkit-line-clamp: 2`, height exactly 2 lines). No summary string is needed by the server or agents.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (see the self-review checks below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Compact cards (REQ-001, REQ-002; AC-001..003, 005, 006) | Board / Temp board → `components/projects/ProjectTaskRow.vue` → `utils/projects/taskSummary.ts` (`taskCardSummary`, `taskCardPreview`, `taskSummaryLabel`); delete confirmation in `components/projects/ProjectTaskDetail.vue` | Unit tests (utility 14, row 5) and browser PMU-013 pass at 1440 and 1024 on both boards. A mutation run restoring the old row fails PMU-013 (the summary measured 58,752 px tall with `display: block`). |
| BEH-002/003 | Unchanged: full text on the Task pages; search matches the full description (REQ-003; AC-004) | No change to `ProjectTaskBoard.vue` / `TempTaskBoard.vue` search, `ProjectTaskDetail.vue` description or `TempTaskDetail.vue` | PMU-013: searching `brief9999` (the last word of the 10,000-word brief) finds the card. Both Task pages show the complete 98,889-character description. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. DEC-002 (titles) is not touched. The Product design copy of `ProjectTaskRow.vue` (in `autobyteus-web-design`) is Product-owned and not changed, as the design spec says.

## Key Files Or Areas

- `autobyteus-web/utils/projects/taskSummary.ts`: text derivation owner (modified)
- `autobyteus-web/utils/projects/__tests__/taskSummary.spec.ts`: bounds, word boundaries, surrogate pairs, 10,000-word and multi-line fixtures, short text unchanged (modified)
- `autobyteus-web/components/projects/ProjectTaskRow.vue`: clamped spans without `block`; bounded text; `aria-label` = label; `data-testid="project-task-row-preview"` added (modified)
- `autobyteus-web/components/projects/ProjectTaskDetail.vue`: the delete message uses `taskSummaryLabel` (modified)
- `autobyteus-web/components/projects/__tests__/ProjectTaskRow.spec.ts`: both task shapes, no conflicting display utility, short text unchanged (new)
- `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs`: PMU-013 compact cards (modified)
- `autobyteus-web/docs/projects.md` (card text paragraph, PMU-013) and `TESTING.md` (PMU-001..013) (modified)

## Important Assumptions

- The preview trims each line before joining. Rendering is unchanged, because whitespace collapses in these spans, and the short-text rendering is asserted in the unit tests and in PMU-013.
- The 300-character bound is more than two lines at the widest lane. At 1440 px a lane fits about 95 characters per line, and the rendered summary is still clamped at exactly 2 lines (48 px), so the CSS clamp, not the cut, decides what is visible.

## Known Risks

- The card height bound in PMU-013 is 200 px. Measured heights are 76–156 px: 156 px is the Temp multi-line card with the root line. A Project Task with context files adds the file-count line; the fixtures have none.
- `-webkit-line-clamp` is Chromium-supported, so Electron is covered by the browser probe. The packaged desktop was not run (optional per the design).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix`
- Reviewed root-cause classification: `Local Implementation Defect` (conflicting utilities) plus a missing bound on derived labels
- Reviewed refactor decision: `No Refactor Needed`, beyond moving the preview derivation into the utility (done)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the mutation run confirms the root cause; with `block` restored, the computed display is `block` and the height is unbounded.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes`. The inline preview derivation is replaced by `taskPreview`, and the conflicting `block` utilities are removed.
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (`taskSummary.ts` 43 lines; `ProjectTaskRow.vue` about 60 lines)

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (presentation only; summaries are never stored)

## Environment Or Dependency Notes

- In the fresh worktree, `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-web exec nuxi prepare` were needed before the Nuxt unit tests ran. `.nuxt` is generated and untracked.
- The server was built (`prebuild` + `build`) for the probe.
- The untracked `autobyteus-application-*-sdk*/dist/` folders are build output and are not committed.

## Local Implementation Checks Run

- `pnpm test:nuxt components/projects utils/projects stores/__tests__/projectTaskStore.spec.ts stores/__tests__/projectLiveChanges.spec.ts pages --run`: 26 files, 185 pass, 1 fail. The failure, `pages/__tests__/org-definition-navigation.spec.ts`, also fails on the base (seen and verified on the base checkout during project-manager-ux).
- New and changed specs: `taskSummary.spec.ts` (14) and `ProjectTaskRow.spec.ts` (5) pass.
- `pnpm guard:localization-boundary`: Passed. `pnpm audit:localization-literals`: Passed with zero unresolved findings.
- `npx vue-tsc --noEmit`: no errors in changed files (all 388 are pre-existing, outside these files).
- Lightweight self-review (direct route):
  - The diff matches the design file mapping; there are no out-of-scope edits.
  - Search and the Task pages are untouched.
  - No `block` remains beside `line-clamp`.
  - The bounding helper never exceeds `max`, cuts at word boundaries, and handles a single long word and surrogate pairs.
  - Labels are bounded; short text is identical.
  - No new localization keys; no persisted or contract change.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Project board cards, Temp tasks board cards, the Project Task page delete confirmation, and the Project and Temp Task pages (full text).
- Approved references: requirements AC-001..006; the UI/UX spec VIS-001..018 for short text (unchanged).
- Existing design system and adjacent surfaces reviewed: `ProjectTaskRow` is shared by both boards; the root line and file-count line are unchanged.
- Rendered surface used: `pnpm -C autobyteus-web test:e2e:project-manager-ux` (TESTING.md). It runs a real built backend in a private temp data root, Nuxt dev and headless Chrome 154. Agents are the scripted AGY CLI calling the real tools.
- States, layouts, viewports and interactions inspected (PMU-013):
  - Fixtures: a 98,889-character single paragraph, a 35,939-character multi-line brief, and a short two-line Task.
  - Surfaces: the Project board and Temp tasks, at 1440×900 and 1024×768.
  - Summary: 48 px at a 24 px line height (2 lines). Preview: 40 px at 20 px (2 lines).
  - Short text: 1 line each, unchanged.
  - Rows: 76–156 px. Accessible names: 116–118 characters ending with "…" for long text; full text for short text.
  - Search beyond the visible lines; delete confirmation 194 characters; full text on both Task pages.
- Visual or interaction issues found and corrected: none beyond the fix itself. The screenshots show 2-line bold summaries and 2-line grey previews with the clamp ellipsis at both widths.
- Supporting evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/implementation-evidence/ir-001/browser-probe/`
  - Full run PMU-001..013: **Pass, 13/13**.
  - `evidence.json` holds the PMU-013 measurements.
  - Screenshots: `pmu-013-board-{1440,1024}.png`, `pmu-013-temp-board-{1440,1024}.png`, `pmu-013-delete-confirmation.png`.
  - The full run's PMU-013 used a 160 px row bound, since relaxed to 200 px (see Known Risks).
- Mutation check: PMU-013 run against the base row component → Fail ("summary within 2 lines": 58,752 px, `display: block`).
- Not verified: the packaged Electron app, zh-CN rendering (no copy change), and reduced motion (not affected).

## Downstream Coverage Hints / Suggested Scenarios

- A Project Task with context files plus a long description: the file-count line stays visible under the clamped text.
- Narrow layout (390 px; PMU-007 covers narrow boards in general) with long descriptions.
- Non-Latin long text (CJK without spaces): the hard cut path in `boundTaskText`, rendered.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-001..006 at API/E2E level with the extended probe (`test:e2e:project-manager-ux`, PMU-013, plus a regression run of PMU-001..012), optionally in the packaged desktop.
