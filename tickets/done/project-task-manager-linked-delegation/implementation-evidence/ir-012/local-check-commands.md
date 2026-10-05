# IR-012 Local Implementation Checks

These are local implementation checks only, not API/E2E sign-off. All commands were run from the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation` on commit `4b04d9097` (parent `ccb5fbe3c`).

| # | Command | Result | Log |
| --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json` | exit 0 | `tsc-build.log` |
| 2 | SR-021 §4 greps: `rg -n "projects/" src/{agent-collaboration,agent-team-execution,agent-org-execution,standalone-agent-run-root,agent-execution}` and `rg -n "task-lifetime-gate\|active-collaboration-root-directory\|root-task-" src/projects` | both: no matches (exit 1) | `dependency-greps.log` |
| 3 | Focused changed/added suites (26 files): gate, dispatch races, tree scope, quiet generation, recipient resolution, lifecycle, `tests/unit/projects`, `tests/unit/agent-tools/{project-tasks,task-delegation}`, LLM contract, GraphQL Project schema, supervisor ownership, standalone host lifecycle, Native/Task integration, `tests/architecture` | 26 files / 275 tests Pass | `focused.log` |
| 4 | `pnpm exec vitest run tests/e2e/projects` (narrow Task-service singleton consumers) | 3 files / 14 tests Pass | `e2e-projects.log` |
| 5 | Wide: `pnpm exec vitest run tests/unit tests/architecture tests/integration/agent-team-execution` | 664 files / 4846 tests: 4758 Pass, 82 Fail (29 files), 6 Skip | `wide-unit.log`, `wide-failed-files.txt` |
| 6 | The same 29 failing files re-run alone on the current tree | 82 Fail / 109 Pass, deterministic | `failed-rerun.log` |
| 7 | The same 29 files on unchanged HEAD `ccb5fbe3c` (temporary detached worktree; package `node_modules` symlinked; removed afterwards) | 82 Fail / 109 Pass. Failing test names are byte-identical to #6 | `baseline-head-failed-files.log`, `*.names` |
| 8 | `git diff --check` over changed src/tests and prompt doc | exit 0 | — |

## Mutation check (SR-022a)

`withLiveLease` was temporarily changed to record on every accepted operation, i.e. the old sender recording. The Native/Task integration then failed 2 tests on the new "sender link stays `admitted`" assertion. The source was restored, and run #3 is on the restored source.

## Not run

No paid/live provider, packaged app, Electron or user-profile operations. No API/E2E environment bring-up, no web suites and no full `pnpm build`; the production typecheck (#1) covers compile.
