# Executed commands — API-REV-001

Working directory for all commands: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path`.
`E=$PWD/tickets/in-progress/project-workspace-path/api-e2e-evidence/api-001`
`L=$PWD/tickets/in-progress/project-workspace-path/api-e2e-test-case-ledger.md`
stdout/stderr captured in the named log. Every listed command exited 0. Build outputs were removed only after all execution finished; reruns need prebuild/build.

| Log | Exact command | Result |
| --- | --- | --- |
| prebuild.log | `pnpm -C autobyteus-server-ts prebuild` | shared SDK/core + Prisma setup |
| build.log | `pnpm -C autobyteus-server-ts build` | production tsc/assets/sanitized bootstrap |
| owner.log | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-tools/project-tasks tests/unit/api/graphql/projects-schema.test.ts tests/unit/workspaces/workspace-manager.test.ts tests/unit/app-data-migrations/projects-per-folder-v1-app-data-migration.test.ts tests/unit/app-data-migrations/app-data-migration-runner.test.ts --no-watch` | 17 files / 240 pass |
| http-1.log | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts --no-watch` | 8 pass |
| graphql-1.log | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/projects-graphql.e2e.test.ts --no-watch` | 10 pass |
| nodes-1.log | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-mutation-node-locality.e2e.test.ts --no-watch` | 1 pass |
| startup-1.log | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/projects-startup-migration.e2e.test.ts --no-watch` | 5 pass |
| feed-1.log | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs PROJECT_CHANGE_FEED_E2E_EVIDENCE_DIR=$E/feed-receipt pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-change-feed.e2e.test.ts --no-watch` | 7 pass; receipt retained |
| nuxt-prepare.log | `pnpm -C autobyteus-web exec nuxt prepare` | setup pass |
| web-1.log | `pnpm -C autobyteus-web test:nuxt components/projects stores/__tests__/projectStore.spec.ts utils/projects --run` | 15 files / 119 pass |
| projects-all-1.log | `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS -u RUN_CLAUDE_E2E -u RUN_CODEX_E2E RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects --no-watch` | 8 files / 41 pass / 1 real-Claude case skipped |
| browser-1.log | `pnpm -C autobyteus-web test:e2e:projects --skip-server-build --output-dir=$E/browser-1 --ledger-file=$L` | 16 pass, no page errors |
| browser-2.log | `pnpm -C autobyteus-web test:e2e:projects --skip-server-build --output-dir=$E/browser-2 --ledger-file=$L` | 16 pass after fresh-response test refinement, no page errors |
| source-diff-check.log | `git diff --check -- TESTING.md autobyteus-server-ts autobyteus-web` | clean source/test/docs diff; raw historical logs not rewritten |

`node --check autobyteus-web/tests/e2e/projects-feature-probe.mjs` also passed before both browser runs. No live provider flags enabled, no secret import and no installed app used. Scripted AGY source untouched. No `pnpm dev` default-profile use. Browser fixture starts disposable current `dist/app.js` nodes, Prisma migration deploy, own Nuxt dev and Chrome; exact startup argv/logs/IDs in durable probe and browser receipts.
