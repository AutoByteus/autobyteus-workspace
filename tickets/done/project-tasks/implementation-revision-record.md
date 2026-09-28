# Implementation Revision Record

Package: `PROJ-TASKS-20260926-001` — `project-tasks`. The current code and `implementation-handoff.md` remain authoritative; this record indexes implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer` — `design-review-report.md` round 1 (`ARCH-REV-001`, Pass) | N/A | `Initial Baseline` | `SR-003`, `SR-004`, `ARCH-REV-001`; `CRR-*` N/A; `API-REV-*` N/A; `DR-*` N/A | Implemented in `8d3de39a6` (server) and `e8fca7771` (web); ready for code review |
| IR-002 | `/architecture_reviewer` — `design-review-report.md` round 3 (`ARCH-REV-003`, Pass) after the user rejected `DR-001` in verification | N/A (user verification rejection; `ARCH-REV-002` `AR-001`/`AR-002` resolved in design) | `Design Impact` (upstream, resolved as `SR-005`–`SR-008`) | `SR-005`–`SR-008`, `ARCH-REV-002`, `ARCH-REV-003`, `CRR-001`, `CRR-002`, `API-REV-001`, `DR-001` | Web UI replaced in `ae0cd4755`; server unchanged; back to code review |

## Revision Entries

### IR-001 — Description-only Project Tasks and the two-pane Projects page

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md`, round 1 (`ARCH-REV-001` Pass)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Design Change Sequence steps 1–8 are implemented. Step 9, the e2e probe, is partly done: the released cases are adapted to the two panes and all 13 pass; new Task-specific browser cases are left to API/E2E. Step 10 (docs sync) belongs to delivery; only the `docs/projects.md` file list was corrected to drop the removed components (review note 3).
- Related solution revision IDs: `SR-003` (requirements), `SR-004` (design)
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-006`; `REQ-001`–`REQ-016` (`REQ-004` withdrawn); `AC-001`–`AC-012`; `QR-001`–`QR-003`.
- Implementation delta: see `implementation-handoff.md` › Reviewed Behavior Implementation Trace and Key Files.
- Changed files or areas:
  - Server:
    - `autobyteus-server-ts/src/projects/{domain/models.ts,domain/project-errors.ts,stores/project-store.ts,services/project-service.ts,services/project-task-service.ts}`
    - `src/api/graphql/{schema.ts,types/projects.ts,types/project-tasks.ts}`
  - Web:
    - `autobyteus-web/pages/projects.vue`, `pages/projects/{index,[id]}.vue`
    - `components/projects/*` (6 new; `ProjectDetail` reworked; `ProjectsList`/`ProjectCard` removed)
    - `stores/{projectTaskStore,projectStore}.ts`
    - `utils/projects/*` (4 new)
    - `graphql/**/project*`, `generated/graphql.ts`, `types/project.ts`
    - `localization/messages/{en,zh-CN}/projects.ts`
    - `docs/projects.md` (file list only)
    - `tests/e2e/projects-feature-probe.mjs`
  - Plus specs.
- Local validation and result:
  - Server: 8 changed-area files pass, and the released `tests/e2e/projects` passes with the `ENABLE_*` environment variables scrubbed.
  - Web: Projects components, stores and utils pass: 62 plus 37 tests. Adjacent suites pass.
  - Full web suite: 3208 passed; 13 failed in 6 files, identical on base `e06080b00`.
  - Both localization guards pass.
  - `vue-tsc` shows no errors in changed files.
  - The adapted e2e probe passes 13/13.
  - Live dev-app check in en and zh-CN.
- Next recipient or routing: per `get_handoff_rules` (Medium/High → code review).
- Remaining limitations or risks: see `implementation-handoff.md` › Known Risks.
- Downstream review status: `CRR-001` Pass (round 1, no findings); package routed by `/code_reviewer` to `/api_e2e_engineer`.

### IR-002 — Released grid, full-width Project page and three-column Task board (SR-008)

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md`, round 3 (`ARCH-REV-003` Pass, SR-008). The user rejected delivery candidate `DR-001` (`a0fd103af`) in verification as "super squeezed", which led to SR-005–SR-008 and approval `APPROVAL-PROJ-TASKS-20260927-002`.
- Triggering finding IDs: N/A. This is a user rejection plus a redesign; `ARCH-REV-002` `AR-001`/`AR-002` were design findings, resolved in SR-008.
- Classification: `Design Impact` (upstream-owned, already resolved); this entry implements the revised design.
- Prior authoritative result: `IR-001` two-pane web UI. `pages/projects.vue` held the list pane beside the Project detail, the Project detail was capped at `max-w-[1100px]`, and Tasks were a list with a status filter.
- Current authoritative result: the SR-004 server, storage, GraphQL, `projectTaskStore`, `ProjectTaskDialog` and `ProjectWorkspacesPanel` are unchanged. The web UI now works as follows:
  - **Grid:** the released grid is restored from `e06080b00`. The card's bottom line is "N open tasks · N workspaces", with singular, plural and none forms.
  - **Project page:** `/projects/<id>` is a full-width Project page with "← Projects", a two-line description, and Tasks (default) / Workspaces tabs.
  - **Board:** `ProjectTaskBoard` has search + New task and To Do / In Progress / Done columns with filtered counts, newest first. Empty columns show "No tasks", and one no-match state has Clear search. The page scrolls; there is no per-column scroll.
  - **Width switch:** the columns sit side by side only when the board's own container is at least 752 px wide (scoped `@container project-task-board`); otherwise they stack.
  - **Card:** `ProjectTaskCard` shows the description only (`line-clamp-3 whitespace-pre-line break-words`), and its accessible name is the summary.
- Related solution revision IDs: `SR-004` (server, kept), `SR-005`–`SR-008` (web)
- Related architecture-review revision IDs: `ARCH-REV-002` (Fail, resolved in design), `ARCH-REV-003` (Pass)
- Related code-review revision IDs: `CRR-001`, `CRR-002` (on the superseded IR-001 web UI)
- Related API/E2E revision IDs: `API-REV-001` (on the superseded IR-001 web UI)
- Related delivery revision IDs: `DR-001` (rejected in user verification; must not be finalized)
- Why this revision is recorded: it implements the approved SR-008 redesign.
- Approved behavior or requirement IDs affected: `REQ-006`, `REQ-007`, `REQ-009`, `REQ-016`; `AC-002`, `AC-005`, `AC-007`, `AC-011`, `AC-012`. Everything else is unchanged.
- Implementation delta:
  - Removed:
    - `pages/projects.vue`;
    - `ProjectListPane.vue`, `ProjectListItem.vue`, `ProjectTasksPanel.vue`, `ProjectTaskRow.vue`, and their specs;
    - `utils/projects/relativeTime.ts` and its spec (only the row used it);
    - the list-pane, list-item, panel (status filter), row, `projects.time.*` and select-prompt strings, in both locales.
  - Restored from `e06080b00`:
    - `pages/projects/index.vue`, `pages/projects/[id].vue`;
    - `ProjectsList.vue`, `ProjectCard.vue` (the card's line changed), `ProjectsList.spec.ts` (updated for the count line);
    - the `ProjectsList.*` strings.
  - Reworked: `ProjectDetail.vue` (full width, Back link with an accessible label, `h1` name, `line-clamp-2` description, board on the Tasks tab) and its spec.
  - New: `ProjectTaskBoard.vue` and `ProjectTaskCard.vue`, with specs.
  - New strings: card count keys, board keys, Back label.
  - Catalog spec updated.
- E2E probe:
  - E2E-001 to E2E-013 are back on the grid and page journeys, keeping `?tab=workspaces` for workspace operations.
  - E2E-014 to E2E-026 moved from rows to the board and cards. The status-filter checks are replaced by filtered column counts.
  - E2E-020 now covers grid → page → Back, the full-width check, the deep link, and not-found with Back.
  - E2E-023 checks that the columns stack at 700 px.
  - New E2E-027 covers the width guards in the real shell:
    - 1200×800 with the default 320 px panel: three columns of 260 px, and the long card shows exactly 3 lines;
    - the 520 px panel (dragged) at 1200×800: stacked;
    - a 1000×800 window: stacked.
- Changed files or areas: see `git show --stat ae0cd4755` (24 web paths).
- Local validation and result:
  - Projects web specs pass, as do stores, utils and catalogs.
  - The adapted probe passes 26/26.
  - Full web suite: 3213 passed; 5 failed in 5 files, and the same 5 fail at `a0fd103af` without these changes.
  - Both localization guards pass.
  - `vue-tsc` shows no errors in Projects files.
- Next recipient or routing: per `get_handoff_rules` (Medium/High → code review).
- Remaining limitations or risks: see `implementation-handoff.md` › Known Risks.

