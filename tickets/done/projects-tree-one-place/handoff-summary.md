# Handoff Summary — projects-tree-one-place (autobyteus-353: a Project lists only the runs started under it)

## Ticket

- Package: `projects-tree-one-place`; Project Task `autobyteus-353`
- Classification: `task_size=Medium`, `architectural_risk=Low`; route: direct (no architecture, source or test-code review; `Not Applicable` for this route). Implementation IR-001; API/E2E API-REV-001 Pass (95.7%, every category ≥ 95%).
- Archived ticket folder: `tickets/done/projects-tree-one-place/` on `personal`

## What Changed

- **Server.** `projectRunHistory(projectId)` lists exactly the runs in the Project's `project_runs.json` (joined with the catalog): Agent groups with the plain 6-newest cap, Team runs uncapped. Task hosts, per-root `scopes`, `agentOrgRuns`, pinning beyond the cap, `TaskExecutionResourceService.runLinksOf` and `ProjectRunLinks.runLinksOf` are removed. No stored data changes; `project_runs.json` and the run records keep their shapes.
- **Web.** Projects mode shows each listed run with its unscoped Workspaces rows; no Org group; one ancestry per run. `projectRunsStore` re-reads only on `connected`, Project added/renamed/removed, a start from this window, and archive/delete/Stop of an Agent or Team run; Task events read nothing. `taskExecutionScope.ts` and the scope props are removed.
- **User-visible:** the user's case (a Project Task Manager started in a workspace that handed out Tasks of several Projects) no longer appears under 6 Projects; every such Project shows "No runs yet". A run started under P is listed once, in P, with all its delegated work.
- Docs: server `run_history.md`, `projects.md`; web `projects.md`, `workspace_layout.md` (`docs-sync-report.md`).

## Integration

- The ticket branch was already current with `origin/personal` `f7f331d96b` (0 commits behind at delivery start), so nothing was integrated. The validated code (`60fc6161d2`, plus the removals carried in `724bc349ff`) is the code delivered; API/E2E ran on it with its own test updates (`36c258a77a`), so no rerun was needed.
- At finalization `origin/personal` had advanced to `325e0f9593` (23 commits of autobyteus-349, server run creation and startup). I merged and pushed (`6b58f3f5af`) before checking that state: a slip, recorded in the release/deployment report. Before any release step the merged state was rebuilt and rerun by impact, all Pass: server build and typecheck; server unit 7660 passed; server E2E 179 passed / 4 skipped (PRH-01…PRH-10); browser probe PLN-01…PLN-10 (`evidence/delivery/DEL-01…DEL-04`).

## Verification

- Judged from the evidence; no user check needed. Each of AC-001…AC-005 is directly proven by real-boundary cases: server E2E PRH (real GraphQL, MCP delegation, Projects files), the browser probe PLN-01…PLN-10 on a real stack, and the packaged desktop journey of the worktree build. AC-001, the user's case, was proven on a fixture of the same shape (TESTING.md Rule 2). Details: `release-deployment-report.md` § Verification.

## Release

- `Beta`, on the user's word ("i would like to release a beta for this when its finished thanks", requirements § Release Decision).
- **`v1.5.11-beta.9` released:** checks before tagging pass (licensing, hygiene, Secret Gate after one false positive from autobyteus-349's probe was allowlisted narrowly, release smoke 13/13 on five runtimes, no waiver); build-only release run success; all four workflows success; GitHub pre-release with 23/23 assets; Docker `:beta` moved, `:latest` and GitHub "Latest" (`v1.5.10`) unchanged. Desktop installs with beta updates on are offered it.

## For The Solution Designer

- No `follow-ups.md` for this ticket. Residual: 347's FU-008 (a page's run stream after a backend restart without a reload, existing). By the user's decision (DEC-001), existing managers started in a workspace leave the Projects tree.
- `tickets/done/projects-left-navigation/` keeps 347's documents as they were; its release notes' "Older runs are included" is superseded by this ticket's `release-notes.md` for a later stable release.
