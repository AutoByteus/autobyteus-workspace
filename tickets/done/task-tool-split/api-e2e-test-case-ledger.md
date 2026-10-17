# API/E2E Test-Case Ledger

## Ledger Meta

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split
- Coverage investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/api-e2e-coverage-investigation.md
- Execution coverage report: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/api-e2e-execution-coverage-report.md
- API/E2E revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/api-e2e-revision-record.md
- Scope: many independent cases and long probes
- **Written retrospectively** after execution, from the saved logs in evidence/. It was not initialized before execution as the process requires.
- Last updated: 2026-10-15

## Planned Cases

| Case ID | Case | AC | Surface | Entry Point |
| --- | --- | --- | --- | --- |
| TYPECHECK | production typecheck | all | tsc | `pnpm -C autobyteus-server-ts typecheck` |
| UNIT-ALL | server unit suite | all | vitest | `pnpm -C autobyteus-server-ts test:unit` |
| PRES-CONTRACTS | note composer/parser | AC-005/008 | node test | `pnpm -C autobyteus-agent-presentation-contracts test` |
| E2E-UNGATED | projects e2e, ungated incl. dist-dependent | AC-003 | vitest e2e | `env -i … vitest run tests/e2e/projects` |
| E2E-AGY | projects e2e with scripted AGY | AC-001..004 | vitest e2e | same with `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=tests/fixtures/agy-failure-cli.mjs` |
| IDLE-LIFETIME | gated idle-lifetime case, repeated, branch vs base | pre-existing check | vitest e2e | that file alone |
| LIVE-CLAUDE | real Claude agents | AC-001/002/005/006 | probe | `test:e2e:cross-scope-agent-mentions --runtime claude_agent_sdk` |
| LIVE-CODEX | real Codex agents | same | probe | `--runtime codex_app_server` |
| LIVE-AGY-L | real AGY host-crash L01/L02 | none | probe | `--runtime antigravity_cli --cases L01,L02` |
| WEB-INFO-1..4 | project-manager-ux, task-closure-tree, delegated-team-default-collapse, projects-feature | none (out of scope) | browser probes | package scripts |
| COL-001 | third-party MCP collision | handoff hint | unit | catalog test |
| OLD-001 + E2E-HTTP | old name rejected over real HTTP MCP | AC-003/007 | vitest e2e | project-task-boundaries |
| NATIVE-DIRECT | native registry on dist | AC-003 | temp script | evidence/native-tool-probe.mjs |
| INTEG | server integration | regression | vitest | `test:integration` |

## Execution Events (terminal results)

| Seq | Case | Observed | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | E2E-UNGATED | 4 files / 27 tests pass after build | Pass | server-e2e-projects-ungated.log |
| 2 | E2E-AGY | 66 pass, 1 fail (idle-lifetime: 58980<59000; org worker idle timeout) | Fail (1 case) | server-e2e-projects-agy-scripted.log |
| 3 | IDLE-LIFETIME | branch rerun1 fail (model discovery timeout), rerun2 fail (worker idle timeout), rerun3 pass, alternating pair1 pass, pair2 pass, low-load runs 1,3,4 pass, run 2 fail (model discovery); base runs 1-4 pass, alt pair1 fail (model discovery), low-load base 1,3,4,5,6 pass, run 2 fail (model discovery); base alt pair2 killed by time limit, excluded | Intermittent on both | evidence/server-e2e-task-copy-idle-lifetime-rerun*.log, alt-*, lowload-*, base-*, *-summary.txt |
| 4 | LIVE-CLAUDE | 19 Pass, 0 Fail, 2 N/A | Pass | probes/cross-scope-claude.log |
| 5 | LIVE-CODEX | 19 Pass, 0 Fail, 2 N/A | Pass | probes/cross-scope-codex.log |
| 6 | LIVE-AGY-L | L01, L02 fail "Timed out waiting for focused agent idle"; screenshot shows provider error "Individual quota reached… Resets in 50h36m3s" | Blocked | probes/cross-scope-agy-L/ |
| 7 | WEB-INFO project-manager-ux | PMU-002, PMU-021 fail; 23 pass | informational | probes/project-manager-ux.log |
| 8 | WEB-INFO task-closure-tree | Pass | informational | probes/task-closure-tree.log |
| 9 | WEB-INFO delegated-team-default-collapse | Pass | informational | probes/delegated-team-default-collapse.log |
| 10 | WEB-INFO projects-feature | PT-E2E-005..011 fail (390 px layout, cascade); base fails the same | informational | probes/projects-feature.log, probes/base/ |
| 11 | WEB-INFO PMU reruns | PMU-002,021 alone pass on branch and base; full rerun branch PMU-021 fail, base PMU-021 fail | informational | probes/project-manager-ux-rerun-002-021.log, project-manager-ux-full-rerun.log, probes/base/ |
| 12 | NATIVE-DIRECT | names registered: list_projects, list_project_tasks, create_or_update_project, create_task, update_task; old name absent; create, DONE and missing-argument errors as expected | Pass | native-tool-direct-probe.log |
| 13 | COL-001 | 14/14 in catalog file | Pass | unit-mcp-catalog-collision.log |
| 14 | TYPECHECK / UNIT-ALL / PRES-CONTRACTS | pass; 694 files / 5517 tests; 20/20 | Pass | server-typecheck.log, server-unit-full.log, presentation-contracts-test.log |
| 15 | INTEG | 73 files pass; 1 file fails: 2 `agent-status-websocket` cases = documented baseline exception | Pass (baseline exception) | server-integration-full.log |
| 16 | OLD-001 + E2E-HTTP | 11/11 | Pass | server-e2e-project-task-boundaries-final.log |

## Re-entry And Reconciliation

- Last completed case: E2E-HTTP final (seq 16)
- Cases still running or not started: none
- Reconciled into report: Yes
