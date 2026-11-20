# Investigation Notes — autobyteus-526 round 2

- Authorities read (2026-11-20): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md` (rule 11: tests follow the code)
- Sources: see requirements "Re-analysis" table (each row's evidence was read on `origin/personal` @ `8f2d209b2c`): `git ls-tree`/`git grep` for the components and their users; `git show b55ce60b5e` (517's watcher test change); `git log` of the probes; `autobyteus-web/tests/e2e/fixtures/team-activity-presentation.page.vue` L23-60 (mounts `WorkspaceHistoryWorkspaceSection` and `RunningTeamGroup`); `autobyteus-web/package.json` L73, L75 (probe scripts)
- Unknown: whether the two FU-008 probes still fail (to be run first, REQ-002)
