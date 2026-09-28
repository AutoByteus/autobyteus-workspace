# Handoff Summary — Project Tasks (SR-008 UI)

## Status and route
`User-verified on 2026-09-28 (refresh-4 build of 7ebec67fc): "finalize and release the next beta version". Finalization and the beta release are in progress; see release-deployment-report.md for the final state.`

- The DR-001 two-pane candidate (`a0fd103af`) was rejected in user testing on 2026-09-27 (SR-005). It is superseded and will not be finalized.
- Ticket `PROJ-TASKS-20260926-001`, classified `task_size=Medium`, `architectural_risk=High`, full independent-review route:
  - requirements re-approved (SR-006, `APPROVAL-PROJ-TASKS-20260927-002`);
  - SR-007/SR-008 design, `ARCH-REV-003` Pass;
  - IR-002;
  - source review CRR-003 Pass (9.3/10);
  - API/E2E API-REV-002 Pass (95%);
  - test-code review CRR-004 Pass.

## Integrated candidate for verification
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks`, branch `codex/project-tasks`.
- Reviewed commits:
  - `8d3de39a6`: server, unchanged since IR-001
  - `ae0cd4755`: IR-002 web (restored grid and pages, board)
  - `a85a24efd`: delivery checkpoint with the reviewed probe (E2E-028, E2E-029, header fix) and the revised ticket artifacts
- `e8fca7771`, the IR-001 web commit, is superseded by `ae0cd4755`.
- Integration:
  - `origin/personal` had advanced to `8bffda045` (v1.4.88 release and startup-admission recovery).
  - `git merge --no-edit origin/personal` produced `f3029d30d` with no conflicts.
  - None of the incoming files belong to this ticket (Projects code, probe, docs, ticket), and the server Projects code is unchanged since review.
- Post-integration checks on `f3029d30d` (logs in `delivery-logs/dr-002/`):
  - Server `tsc -p tsconfig.build.json --noEmit`: Pass.
  - Server Vitest: 11 files / 132 tests Pass. This covers Projects/Tasks units, the GraphQL schema, capability, settings, architecture boundaries, the app-data migration startup gate, and the Projects e2e API-001 to API-009 (9/9), run with inherited `ENABLE_*` variables set.
  - Web Vitest: 139 files / 858 tests Pass.
  - `guard:localization-boundary` and `audit:localization-literals` Pass.
  - Browser probe `pnpm test:e2e:projects` (full server build, live nodes): **29/29 Pass**, including the width guards E2E-027 and E2E-028 and the Back/clamp case E2E-029.

## Delivered behavior (SR-008)
- **Projects grid** (released layout). Each card shows one count line, "N open tasks · N workspaces", with singular and "No …" forms.
- **Full-width Project page** with **← Projects** at the top-left. The description is clamped to 2 lines; Edit and Delete are in the header. The Delete confirmation states the Task count, and Delete cascades to the Project's Tasks.
- **Tabs:** Tasks (default) and Workspaces (`?tab=workspaces`). The Workspaces tab is unchanged.
- **Three-column board:** To Do, In Progress, Done.
  - Cards show only the description (3 lines).
  - Search runs across all columns; there is no status filter.
  - An empty column shows "No tasks", and a search with no matches shows **Clear search**.
  - The columns sit side by side only when the board itself is at least 752 px wide, via a container query with no viewport breakpoint. Otherwise they stack.
- **Server:** unchanged since review.
  - Tasks are embedded in `projects.json`. v1.4.86 rows are Directly Usable, with no migration.
  - `openTaskCount` is available on each Project.
  - Create, edit-description and delete Task operations exist. There is deliberately no status mutation, so every Task stays `TODO`.

## Carry-forward to the Task-admission ticket (non-blocking here)
- The Project delete confirmation counts **open** Tasks. That equals all Tasks only while no status mutation exists.
- Single-file lock contention once agents write status frequently.

## Known residual items (non-blocking)
- After a Task is deleted from its dialog, focus falls to `BODY`.
- The board stacks below a window of about 1140 px with the default side panel, and about 1340 px with the 520 px panel. This is the approved stack-not-squeeze behavior.
- Task dates in the dialog follow the browser locale.
- Optional test polish: a side-panel drag helper, polling instead of a fixed settle wait, and a probe split if the file grows.
- Pre-existing base failures: web org-definition-navigation; the server app-data-migration unit failures proven base-identical in DR-001.

## How to verify
1. Open the local macOS test build of `7ebec67fc` (refresh 4, merged with `origin/personal@fcdfcd2ca`; a beta-versioned local build, `1.4.91-beta.1`): `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`, or `AutoByteus_enterprise_macos-arm64-1.4.91-beta.1.dmg` in `autobyteus-web/electron-dist/`. It is ad-hoc signed and not notarized. Quit any installed AutoByteus first.
2. **Projects** shows the familiar card grid. Each card's bottom line reads, for example, "No open tasks · 1 workspace".
3. Open a Project. The page is full-width, has **← Projects** at the top-left, and opens on the **Tasks** tab with three columns (To Do / In Progress / Done).
4. Create a Task with several lines of text. It appears in **To Do** showing its description. Open it, edit it, search for it, and delete it.
5. Open the side panel, or narrow the window. The columns stack instead of squeezing.
6. Check the **Workspaces** tab (`?tab=workspaces`) and **← Projects**. The card count updates.

## Canonical records
- Requirements, design and review: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `design-review-report.md`, `architecture-review-revision-record.md`, `handoff-to-architecture-review-sr-004.md`, `-sr-007.md`, `-sr-008.md`.
- Implementation: `implementation-handoff.md`, `implementation-revision-record.md` (IR-001, IR-002).
- Review: `code-review-report.md`, `code-review-revision-record.md` (CRR-001 to CRR-004), `api-e2e-test-review-report.md`.
- Validation: `api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-002).
- Delivery: `docs-sync-report.md`, `release-notes.md`, `release-deployment-report.md`, `delivery-revision-record.md` (DR-001 rejected, DR-002 current), `delivery-logs/dr-001/` (rejected candidate), `delivery-logs/dr-002/`.
- Long-lived docs updated: `autobyteus-web/docs/projects.md`, `autobyteus-server-ts/docs/modules/projects.md`, `autobyteus-web/AGENTS.md`.

## Pending after verification
- Archive the ticket to `tickets/done/project-tasks/` and commit.
- Re-fetch `origin/personal` and re-integrate if it moved.
- Merge into `personal` and push.
- Release: the user decides. `release-notes.md` is prepared; the choice is stable v1.4.91 or beta v1.4.91-beta.2.
- Clean up. Keep `test-results/` and the SDK `dist/` folders out of every commit.
