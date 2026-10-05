# IR-013 Local Implementation Checks

These are local implementation checks only, not API/E2E sign-off. All commands were run in the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation` on commit `b61b8452f` (parent `4b04d9097`).

| # | Command | Result | Log |
| --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json` | exit 0 | `tsc-build.log` |
| 2 | Design §Dependency Rules greps (3) | #1 and #2: no matches. #3: only the gate's path in `ProjectsLayout` (the single path owner) and a store comment | `dependency-greps.log` |
| 3 | Focused changed/added suites: `tests/unit/{projects,agent-collaboration,agent-tools/project-tasks,services/agent-streaming}`, the migration test, Native/Task integration, `tests/architecture`, the 2 Projects e2e files, supervisor ownership, standalone host lifecycle, history projection | 53 files / 566 tests Pass | `focused.log` |
| 4 | Wide: `pnpm exec vitest run tests/unit tests/architecture tests/integration/agent-team-execution` | 664 files / 4859 tests: 4771 Pass, 82 Fail (29 files), 6 Skip | `wide-unit.log` |
| 5 | Failing names in #4 compared with the IR-012 baseline (`../ir-012/failed-rerun.names`, proven identical on unchanged HEAD `ccb5fbe3`) | Byte-identical: no new failures, none fixed | `wide-failed.names`, `wide-failed-files.txt` |
| 6 | `git diff --check` over changed src/tests | exit 0 | — |

## Design controls covered (Guidance list)

| Control | Where |
| --- | --- |
| `agent_run_resources.json` invariants and exact atomic writes | `tests/unit/projects/task-agent-resources.test.ts` |
| Damaged file: startup non-fatal; other Tasks work; assign/DONE reject with the clear message; listing marks `assignmentsUnavailable`; unknown copies rejected; fix + restart restores | `task-agent-resources.test.ts`, `project-task-business-results.test.ts`, `task-agent-resource-tree-scope.test.ts` |
| Description-only delegation rejected up front with zero planning | `task-agent-resource-dispatch.test.ts` |
| Both-order race: owned link vs DONE; assignment link vs DONE | `task-agent-resource-dispatch.test.ts`, `task-agent-resources.test.ts` |
| Own-Task-ID `delegate_task` by an owned worker rejected (N2) | `task-agent-resource-dispatch.test.ts`; integration |
| DONE before register / after register / after commit | `task-agent-resource-dispatch.test.ts` |
| Inherited link from a closed creator rejected | `task-agent-resource-dispatch.test.ts`, `task-agent-resources.test.ts` |
| Two Tasks, one root, same helper address isolated; message-scope conflict | integration; `task-agent-resource-tree-scope.test.ts` |
| Restart → closed wake rejected; reopen lists only the new assignment; Delete keeps records and fences | `task-agent-resources.test.ts`; integration |
| Failed stop with a retained receipt: `stopped: false` and logged; repeated DONE re-invokes it until stopped; success memoized | `task-agent-resource-dispatch.test.ts`, `task-agent-resource-tree-scope.test.ts`, integration |
| Failed stop logged, not persisted | `task-agent-resources.test.ts`, `project-task-business-results.test.ts` |
| Trees carry no Task fields after a linked dispatch; dev-residue stamps dropped | integration; `task-agent-resource-tree-scope.test.ts`; projection tests |
| Migration: real-shape sample, context + drafts, dev `{taskLifetimes}` residue, invalid row/Task, duplicate, retained original, empty-source removal, the three statuses, mid-way retry, fresh / already-migrated no-op, conflict, unsafe id (N8) | `tests/unit/app-data-migrations/projects-per-folder-v1-app-data-migration.test.ts` + `tests/fixtures/projects-per-folder-v1/*.json` |
| Gate: `PROJECTS_MIGRATION_PENDING` while `projects.json` exists (existence only); after migration the list matches | `project-store-per-folder.test.ts`, `project-service.test.ts`, GraphQL e2e API-009 |
| Per-Project store: CRUD, listing rules, Delete keeps resources, interrupted Project delete (N7), unsafe ids (N5) | `project-store-per-folder.test.ts`, `project-service.test.ts` |
| No Projects import in runtime or run-history | `tests/architecture/projects-boundaries.test.ts` + grep #1 |

## Not run (owned downstream)

- Both real startup entrypoints on a rebuilt `dist/`, and real-upgrade evidence on a stopped-writer disposable copy of an installed profile.
- `tests/e2e/projects/projects-startup-no-write.e2e.test.ts` was not changed (it carries the API/E2E engineer's uncommitted edits). Its "no startup rewrite" premise conflicts with the approved SR-024 startup migration, and it only passes today because it runs the stale pre-SR-024 `dist/` build.
- No paid/live provider, packaged app, Electron or live user-profile operations.
