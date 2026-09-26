# Handoff Summary — Projects concept introduction (slice 1)

## Status and route
`Awaiting explicit user verification.` This is ticket `PROJ-CONCEPT-20260926-001`, classified `task_size=Large`, `architectural_risk=High`. It took the full independent-review route: ARCH-REV-001 (Fail) → SR-003 → architecture review Pass → implementation → source review CRR-003 Pass (9.3/10, CR-001 resolved) → API/E2E API-REV-002 Pass (95%) → test-code review CRR-004 Pass (no findings).

## Integrated candidate for verification
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction`, branch `codex/projects-concept-introduction`.
- Reviewed commits: `6563fd69f` (server), `816fd4db5` (web), `63e6fb0e4` (CR-001 keyboard fix), and `04867d6aa` (delivery checkpoint: the reviewed durable tests `projects-graphql.e2e.test.ts` and `projects-feature-probe.mjs`, the `test:e2e:projects` script, and the ticket artifacts).
- Integration: `git fetch origin personal` → `origin/personal@fc2a60527` (22 commits beyond bootstrap `1676bede9`). `git merge --no-edit origin/personal` produced merge `8ee41728b` with no conflicts. The only file changed on both sides was `autobyteus-web/package.json` (the base bumped the version to 1.4.85 and this branch added a script line), and git auto-merged it.
- Post-integration checks on `8ee41728b` all passed. Logs are in `delivery-logs/`:
  - Server `npx tsc -p tsconfig.build.json --noEmit` is clean. The first run flagged `external-runtime-memory-writer.ts` `senderId`; the cause was a stale git-ignored `autobyteus-ts/dist` against the incoming base source. After `pnpm -C autobyteus-ts build` the typecheck is clean. This was not a code defect.
  - Server Vitest, 8 files / 89 tests: Projects unit, GraphQL schema/types, application-capability, server-settings, architecture boundaries, and the Projects GraphQL e2e.
  - Web Vitest, 134 files / 816 tests: projects, settings, common (SearchableSelect), `workspace/config` (the area touched by the incoming base), project store, capability factory, server-settings store, navigation, middleware, utils, and localization catalogues.
  - Browser probe `pnpm test:e2e:projects` with a full server build, two live nodes and `pnpm dev`: **13/13 Pass** (`delivery-logs/probe/result.json`, screenshots).

## Delivered behavior
- A node-scoped Projects module sits behind the default-off `ENABLE_PROJECTS` setting. You toggle it in Settings › Basics or the Advanced table, with no reload needed. Navigation and route are gated, and Projects is hidden on mobile.
- Project CRUD: names are unique case-insensitively; delete asks for confirmation and removes only the record.
- Workspace linking is described links to registered filesystem workspaces only. New folders are registered, then linked. Availability is resolved at read time: removed workspaces show as `UNREGISTERED` and are restored when the same folder is registered again. Workspace removal is never blocked.
- Shared capability mechanism: the web factory, toggle card, route and refresh tables, and the generic server boolean accessor. Applications and Skill Improvement were migrated onto it and their external behavior is unchanged.
- `SearchableSelect` supports combobox keyboard operation.
- Persisted data: the only new file is `<appDataDir>/projects/projects.json`. No existing data is affected and no migration is needed.

## Known residual risks (non-blocking, from review/validation)
- Screen-reader exposure of the teleported listbox outside the `aria-modal` subtree was not exercised.
- The "registration failed" path in the link dialog is covered by a spec only.
- Electron window creation was not executed. Browser validation used the same node-binding code path.
- The zh-CN link dialog shows pre-existing English `WorkspaceSelector` literals.
- After a mouse selection, the shared picker's trigger now shows a focus ring.
- Pre-existing base failures (identical on `1676bede9`) are unrelated to this package and were not rerun as full suites: 10 on the server, and 14 web tests in 7 files.

## How to verify
1. Use the local macOS test build: `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`, or the `.dmg` in `autobyteus-web/electron-dist/`. It is ad-hoc signed and not notarized, built from `8ee41728b` (log in `delivery-logs/electron-build-mac.log`). Alternatively, run `cd autobyteus-web && pnpm test:e2e:projects`.
2. Settings → Server Settings → Basics → turn **Projects** on. **Projects** appears in the navigation after **Nodes**.
3. Create a Project, link an existing workspace and a new folder, and edit a link description. Remove one of those workspaces in Workspaces: the link shows as **Unavailable**. Re-add the folder: it shows as available again.
4. Turn Projects off: the item disappears and `/projects` redirects to `/`. Applications and Skill Improvement toggles behave as before.

## Canonical records
- Requirements, design and history: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `design-review-report.md`, `architecture-review-revision-record.md`, `handoff-to-architecture-review-sr-002.md`, `handoff-to-architecture-review-sr-003.md`.
- Implementation: `implementation-handoff.md`, `implementation-revision-record.md`.
- Review: `code-review-report.md`, `code-review-revision-record.md`, `api-e2e-test-review-report.md`.
- Validation: `api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`. The upstream browser evidence is at `/tmp/proj-e2e-logs/r2-final/` (not durable); the durable delivery rerun evidence is in `delivery-logs/`.
- Delivery: `docs-sync-report.md`, `release-notes.md`, `release-deployment-report.md`, `delivery-revision-record.md`.
- Long-lived docs updated: `autobyteus-web/docs/projects.md` (new), `autobyteus-server-ts/docs/modules/projects.md` (new), `autobyteus-server-ts/docs/modules/README.md`, `autobyteus-web/AGENTS.md`, `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/applications.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-server-ts/docs/modules/application_capability.md`, `autobyteus-server-ts/docs/modules/skill_improvement.md`.

## Pending after verification
- Move the ticket to `tickets/done/`, commit, and push the ticket branch. Then refresh `origin/personal`, merge the branch into `personal`, and push.
- Release: this needs the user's decision. `release-notes.md` is prepared; the repo's release method is `pnpm release <x.y.z>`.
- Clean up the worktree and the local and remote ticket branches. Leave the untracked SDK `dist/` folders out of every commit.
