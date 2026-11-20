# Design Spec — autobyteus-526 round 2

- Revision `SR-002` (FU-001 revised after IR-001; FU-007 and FU-008 done at c443fa09c1..04ba12409c); requirements approved by the user (2026-11-20); design `Ready`; user approval of design: `Not required`
- Authorities: `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md`

## Task Size And Architectural Risk

- Task size: `Small` — removal of two unused components with their tests, keys and fixture part; two probes run and, if needed, their test setup aligned; one test confirmed
- Architectural risk: `Low` — no product behavior, contract, store or route change
- Escalation trigger: a remaining FU-008 failure caused by product code (not the test setup), or FU-001 failing again: report back as a Design Impact

## Intended Change And Removal Plan (Principles 7, 8)

| Item | Why | Notes |
| --- | --- | --- |
| `autobyteus-web/components/workspace/running/RunningTeamGroup.vue`, `RunningTeamRow.vue`, `__tests__/RunningTeamGroup.spec.ts`, `__tests__/RunningTeamRow.spec.ts` | Dead: mounted by no page; only their specs and one test fixture | keep `TeamMemberRow.vue` (used by `TeamTokenUsageSummary`) |
| 8 keys `workspace.components.workspace.running.RunningTeam*` in `localization/messages/{en,zh-CN}/workspace.generated.ts` | Dead with the components | follow the repo's generated-catalog convention (regenerate if a generator owns the file) |
| The `RunningTeamGroup` block of `tests/e2e/fixtures/team-activity-presentation.page.vue` and the probe steps that assert it | tests follow the code (DESIGN.md rule 11) | the probe keeps its `WorkspaceHistoryWorkspaceSection` cases; adjust `typecheck-baseline.json` if the fixture's entry changes |

FU-008: run `pnpm -C autobyteus-web test:e2e:background-contention` and `test:e2e:agent-org-draft-retention` on the base first; change only the probes' fixtures/harness when they fail for setup reasons (the 448 FU-008 row: fixture GraphQL operations and sockets the app now calls). FU-001: run the watcher test 20 times.

## Persisted Data

`Not Affected`.

## Guidance

Record each check's command and log under `evidence/`. Each round ends with cleanup and a record copy (founder's rule).

## SR-002 — FU-001: a unit test that does not wait for the OS

- Evidence (IR-001, `evidence/fu-001/`): 2/20 runs passed at load 46-161; 34 waits hit the 30 s `OS_FILE_EVENT_WAIT_MS`; a plain `fs.watch` probe measured events from 4 s to over 20 s (half over 20 s at load 91). The waits are the OS's, not the watcher's; a longer limit would move the failure, not remove it (TESTING.md "File watching on a busy Mac").
- Decision: the unit file stops depending on OS event latency. The watcher already takes its event sources as options (`agent-package-folder-watcher.ts` L108-117: `createWatcher`, `createParentFolderWatch`; one test already uses a fake at L204). Each test performs the real folder operation and then emits the event the OS would, through a small test-owned fake of each source (it records the watched paths, its `close` calls, and lets the test emit `add`/`change`/`unlink`/`addDir`/`unlinkDir`/`error`/`ready` and parent entry changes). Real OS delivery stays proven by `package-auto-refresh.integration.test.ts` (AC-001..AC-011 on real chokidar).
- Keep: every case and assertion of the file (renamed away → FOLDER_MISSING and resume, rename swap re-arm, per-folder changes, starting missing, catch-up, coverage repair, close); the `afterEach` hook back to vitest's defaults if nothing in it waits for the OS any more; `os-latency-under-load.ts` stays for the tests that still use it.
- Classification unchanged: Small / Low (test-only).
