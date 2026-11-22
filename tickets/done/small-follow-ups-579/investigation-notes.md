# Investigation Notes

## Investigation Meta

- Package identifier: `small-follow-ups-579` (autobyteus-579)
- Request / ticket: Project Task `autobyteus-579`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-579`
- Repository mode: `Git`
- Task worktree / branch: the path above, branch `codex/small-follow-ups-579`
- Resolved base: `origin/personal` @ `f2c0d2a902` (fetched 2026-11-22)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile` and `prepare:shared` passed (`/tmp/579-install.log`, `/tmp/579-prepare.log`)
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read: requirements and design gates (read in this conversation), `DESIGN.md`, `TESTING.md` (rule 9; "File watching on a busy Mac"; "Test-only runtime CLI settings")
- Investigation status: complete for I-1, I-3, I-4, I-5, I-6. For I-2 the cause is measured in implementation (the measurement is the task; DEC-002).

## Source Log

| Date | Type | Source | Finding |
| --- | --- | --- | --- |
| 2026-11-22 | Code | `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts:12, 46-74` | `fileContent` returns `jsonError(message)` for "Workspace not found", `WorkspaceAccessError`, "file not found", permission and access-denied, and for unexpected errors. The rest of the resolver throws `Error("Workspace not found")` for writes (`:36-42`); `workspace.ts:125` uses `GraphQLError` with `extensions.code`. |
| 2026-11-22 | Code | `autobyteus-web/stores/fileExplorerContentActions.ts:358-383` | Takes `data.fileContent` as text. A GraphQL error is already shown as `file.error` (`:373, 378-381`). |
| 2026-11-22 | Code | `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue:23-26` | The error state (`role="alert"`) shows `activeFileErrorMessage` |
| 2026-11-22 | Code | `autobyteus-web/stores/fileExplorerTreeActions.ts:133-142` | `folderChildren` is always JSON, so its `error` key is parsed (unchanged) |
| 2026-11-22 | Command | `grep -rln fileContent` over `.ts`, `.vue`, `.swift`, `.kt`, `.graphql` | Readers: the web store, the web demo (`demo/graphql/files.ts:9-16`, `WORKSPACE_NOT_FOUND` as JSON), and server tests (`file-operations-graphql.e2e.test.ts:178`, `file-explorer-path-boundary.e2e.test.ts:211-213`, `semantic-memory-workspace-access.test.ts:83-84`). No native phone client. |
| 2026-11-22 | Doc | `TESTING.md:189-211` and `tests/helpers/os-latency-under-load.ts` | The shared limits; the `ENVIRONMENT`/`INCONCLUSIVE` labels |
| 2026-11-22 | Code | `tests/integration/file-explorer/file-system-watcher.integration.test.ts:30-57` | After a time-out, a probe with a fresh `fs.watch` and a sentinel decides `ENVIRONMENT` (no event) or `INCONCLUSIVE` (event) |
| 2026-11-22 | Code | `tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts:150-190` | `osFileEvents` (a pre-armed raw watch, used by `DCF-E2E-007`) labels `ENVIRONMENT`; `waitFor` (`:183-190`) throws a plain `not met within` used by DCF-E2E-002 (`:351-421`) and -003 (`:436-447`) |
| 2026-11-22 | Code | `tests/unit/file-explorer/watcher/chokidar-watcher-runtime-links.test.ts:20-55` | `waitFor` returns a boolean, then `expect(…).toBe(true)` gives no cause |
| 2026-11-22 | Code | `tests/unit/agent-execution/backends/claude/claude-provider-turn-race.test.ts:83-88` | `settle()` is 20 rounds of flush plus a 1 ms timer, used before each assertion |
| 2026-11-22 | Code | `tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts:46-66, 121-126` | `fake.dispose()` (`prepareFakeRuntimes`) after `fastify.close()`; the scripted CLI children the server started (login or hang modes) can still write into the fake state folder (599 FU-002) |
| 2026-11-22 | Code | `tests/e2e/agent-team-runs/team-run-config-graphql.e2e.test.ts:185-195` | `server.stop().catch(() => server.child.kill("SIGKILL"))`, then `removeOwnedTestRuntime` without waiting for the child's exit |
| 2026-11-22 | Doc | `TESTING.md:276-300` | Codex and Antigravity homes documented; Claude not |
| 2026-11-22 | Evidence | 576 `follow-ups.md` FU-001…003; 583 `follow-ups.md` FU-002…004; 599 `follow-ups.md` FU-002, FU-003 | The measured failures named in the Task |

## Persisted Data And State Facts

- None affected.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Where each I-2 test spends its time on a busy host | Measured in implementation per DEC-002 | Open (implementation) |
| RSK-001 | Risk | The founder's Mac is under heavy load (fseventsd at 20–24 GB earlier), so results vary | Measure per phase; classify by cause, not by one run | Accepted |

## Supplemental Artifact Inventory

None.

## Notes For Architecture Design

- I-1: the resolver throws `GraphQLError` (as `workspace.ts` does) for every refusal; the web needs no new parsing.
- I-3: one shared probe helper, extracted from the integration test, used by three test files.
