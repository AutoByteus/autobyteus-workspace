# API-REV-004 — Migration Binding Resolution Evidence

## Result

`Pass`. IR-003 resolves `CR-005` / `API-E2E-F-001` at the strengthened built-server production-upgrade boundary.

## Preserved Regression Boundary

Neither API-REV-003 durable test changed during this rerun:

- `hierarchical-team-run-config-graphql.e2e.test.ts`: SHA-256 `bc4fda79a1de7551793c8c6ca3edc952799004f00cd6556ec34f4da2475b2712`
- `team-run-v1-production-upgrade.e2e.test.ts`: SHA-256 `3413ed1fd7f44526c9c29cd87a492b6283700bfb6af73b2281e943096f1f968f`

The production fixture still requires:

- different complete root and nested direct-coordinator configurations;
- root `llmConfig: { temperature: 0.15 }` and nested `llmConfig: null`;
- exact non-null `applicationBinding` `{ applicationId: "synthetic-migration-application", bindingId: "synthetic-migration-binding" }`;
- a non-empty accepted task with submission and acceptance review;
- a non-empty handoff and two-way communication;
- complete root/nested Team and Agent snapshots;
- startup admission, warning isolation, restart/idempotence, retry, and overlap rejection.

## Execution

Working directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-server-ts`

1. `pnpm run build:full` — Pass.
2. `pnpm exec vitest run tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts --no-watch` — Pass, 1 file / 7 tests.
3. `pnpm exec vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` — Pass, 1 file / 4 tests.
4. Durable-test hash comparison, `git diff --check`, owned artifact scan, and live-process scan — Pass.

The two cohorts that failed in API-REV-003 now pass the exact non-null binding assertion without changing or weakening the test. The remaining two recovery/collision cohorts also pass.

## Evidence

- `api-rev-004-server-build-full.txt`
- `api-rev-004-hierarchical-graphql-lifecycle-e2e.txt`
- `api-rev-004-v2-production-upgrade-full.txt`
- `api-rev-004-static-and-cleanup-audit.txt`

No API/E2E-owned runtime, database, or built-server process remained after execution.
