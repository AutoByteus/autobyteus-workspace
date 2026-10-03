# API/E2E Test-Case Ledger
Round 1; canonical coverage investigation/report/revision in this ticket. Required for multiple cases and long packaged build. Initialized before execution.

| Case | Plan | Criteria | Result |
| --- | --- | --- | --- |
| R-001 | Narrow six store/component suites | AC-001–004 | Pass |
| R-002 | Broader package/catalog regression + guards | AC-002,003 | Pass |
| E-001 | Rebuild/start owned packaged app | Fidelity | Pass |
| E-002 | First Team/member discovery and scopes | AC-003 | Pass |
| E-003 | Warm v1 → edit v2 → Team Reload only | AC-001 | Pass |
| E-004 | Repeat v3, scoped/shared identities/navigation | AC-002 | Pass |
| E-005 | Required Agent read failure then retry | AC-004 | Pass |
| E-006 | Source preservation + owned cleanup | AC-003 | Pass |

## Execution Events

- R-001 Started: narrow six suites.

- R-001 Completed: exit=0; narrow-tests.log.

- R-002 Started: package/catalog suites + guards.

- R-002 Completed: suites exit=0; broader-tests.log; guards/diff output recorded in orchestration.

- E-001 Started: pnpm --silent isolated-app start --build.

- E-007 planned: separately record cleanup terminal result; E-006 preserves API/source checks.

- E-001 Build/start command finished exit=0; start.json/build.log.

- E-001 Checkpoint: changed packaged build succeeded, build instance iso-55136-5802 stopped gracefully; durable probe will own new instance using rebuilt worktree artifact.

- 2026-10-03T08:39:16.277Z E-001 Started: owned current-worktree packaged instance; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:39:20.658Z E-001 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:39:20.660Z E-002 Started: first discovery with empty renderer catalogs; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:39:50.663Z E-002 Completed: Fail; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:39:50.987Z E-007 Started: owned process/port/data/fixture cleanup; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:39:51.821Z E-007 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:40:13.283Z E-001 Started: owned current-worktree packaged instance; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:40:17.537Z E-001 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:40:17.538Z E-002 Started: first discovery with empty renderer catalogs; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:40:47.540Z E-002 Completed: Fail; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:40:47.642Z E-007 Started: owned process/port/data/fixture cleanup; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:40:48.486Z E-007 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:10.557Z E-001 Started: owned current-worktree packaged instance; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:14.652Z E-001 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:14.653Z E-002 Started: first discovery with empty renderer catalogs; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:15.738Z E-002 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:15.738Z E-003 Started: completed edit v2; Team Reload only; scoped/shared views; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:16.403Z E-003 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:16.404Z E-004 Started: completed edit v3; Team Reload only; scoped/shared views; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:17.078Z E-004 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:17.079Z E-005 Started: required Agent HTTP read failure; existing error and same-button retry; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:18.012Z E-005 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:18.013Z E-006 Started: API identity/scope and source-preservation checks; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:18.015Z E-006 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:18.016Z E-007 Started: owned process/port/data/fixture cleanup; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:41:18.853Z E-007 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:33.368Z E-001 Started: owned current-worktree packaged instance; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:38.916Z E-001 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:38.917Z E-002 Started: first discovery with empty renderer catalogs; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:39.773Z E-002 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:39.774Z E-003 Started: completed edit v2; Team Reload only; scoped/shared views; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:40.441Z E-003 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:40.442Z E-004 Started: completed edit v3; Team Reload only; scoped/shared views; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:41.099Z E-004 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:41.101Z E-005 Started: required Agent HTTP read failure; existing error and same-button retry; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:42.058Z E-005 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:42.059Z E-006 Started: API identity/scope and source-preservation checks; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:42.063Z E-006 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:42.064Z E-007 Started: owned process/port/data/fixture cleanup; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

- 2026-10-03T08:42:43.009Z E-007 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/api-e2e/product/evidence.json.

## Reconciliation
Final R-001/002 and E-001–007 Pass. Preliminary E-002 harness attempts failed, repaired, and same IDs rerun Pass; full evidence retained. No running/interrupted/unstarted case. E-007 last terminal event Pass: exact owned stop/ports/root/fixture/record cleanup. Reconciled into api-e2e-execution-coverage-report.md round1/API-REV-001.
