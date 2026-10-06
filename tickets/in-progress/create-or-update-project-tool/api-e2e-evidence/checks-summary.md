# API-REV-001 Executable Checks

2026-10-06; assigned worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool`, branch codex/create-or-update-project-tool, production source 3124a8bf6. Darwin arm64; Node22.23.1, pnpm10.28.2, Vitest4.0.18, Fastify4.29.1. All commands from workspace root unless noted; server Vitest cwd is autobyteus-server-ts. Current build, no installed app or release.

| Command | Exit / evidence | Log |
| --- | --- | --- |
| `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects/project-service.test.ts tests/unit/agent-tools/project-tasks tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts --no-watch` | 0; 4 files/115, no skips | focused-unit.log |
| `pnpm -C autobyteus-server-ts prebuild` | 0; current core/SDKs and Prisma generated | prebuild.log |
| `pnpm -C autobyteus-server-ts build` | 0; current dist/templates and real sanitized Manager bootstrap smoke | build.log |
| `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts --no-watch -t 'E-005:'` initial | 0; 1 passed/7 intentionally unselected; inherited catalog override observed; not final isolation evidence | E-005.log |
| Same E-005 command after harness sanitization | 0; 1 passed/7 intentionally unselected; only private 3-definition catalog | E-005-isolated.log |
| Same file command `-t 'E-006:'` | 0; 1 passed/7 intentionally unselected | E-006.log |
| Same file command `-t 'E-007:'` initial | 1; malformed test assignment physical shape, strict reader correctly rejects before mutation | E-007.log |
| Same E-007 command after fixture correction | 0; 1 passed/7 intentionally unselected | E-007-rerun.log |
| Same file command `-t 'API-MCP: selected'` | 0; 1 passed/7 intentionally unselected | E-001.log |
| Same file command `-t 'API-FILES:'` | 0; 1 passed/7 intentionally unselected | E-002.log |
| Same file command `-t 'API-MCP collision:'` | 0; 2 passed/6 intentionally unselected | E-003.log |
| Same file command `-t 'API-AGG:'` | 0; 1 passed/7 intentionally unselected | E-004.log |
| `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-tools/project-tasks tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts tests/architecture/projects-boundaries.test.ts tests/e2e/projects/project-task-boundaries.e2e.test.ts tests/e2e/projects/projects-graphql.e2e.test.ts tests/e2e/projects/projects-startup-migration.e2e.test.ts --no-watch` | 0; 14 files/194, no skips | regression.log |
| `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-mutation-node-locality.e2e.test.ts --no-watch` | 0; 1/1 no skips; two private built nodes + restart; IDs/HTTP/cleanup receipts retained | E-008.log |
| `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-tools/project-tasks tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts tests/architecture/projects-boundaries.test.ts tests/e2e/projects --no-watch` | 0; **15 files/195, no skips**, final combined current tests including tightened retained addedAt assertion | final-regression.log |
| `pnpm -C autobyteus-server-ts exec tsc -p ../tickets/in-progress/create-or-update-project-tool/api-e2e-evidence/focused-tests.tsconfig.json` | 0 initially/final; build compiler flags, enlarged rootDir, two changed E2E files; not generic tsconfig proof | test-typecheck.log, test-typecheck-final.log, focused-tests.tsconfig.json |
| `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | 0 | source-typecheck.log (empty success) |
| `node --check autobyteus-server-ts/tests/fixtures/project-mutation-http-node.mjs`; `git diff --check` | 0/0 | tool output, ledger P-004 |

No source edits. Initial fixture failure and ambient-config issue retained, corrected locally before authoritative result; no assertions removed/weakened. Filtered skips are not counted as proof; final combined run has no skips. Generic tsconfig TS6059/rootDir/config remains an upstream-known failed limitation, not rerun or claimed passed.

## Isolation and cleanup
Main harness now stashes/removes ENABLE_* and AUTOBYTEUS_* before server initialization and restores after close; real registry, GraphQL, multipart, ProjectStore and session selection are not mocked. First inherited-environment attempt observed 49 definitions; no mutation targeted their sources and no definition contents inspected. Final evidence uses only private data/catalog. Built fixture uses minimal environment/private HOME and separate SQLite migration deploy per node, never copied developer state.
Tests assert owned Studio/MCP listener closure and mkdtemp removal; built-node cleanup also asserts graceful exit0 and four listener releases. Node receipt is in E-008.log and final-regression.log. Only worktree-owned ignored Vitest DB/current build outputs remain. Generated SDK dist remains untracked/not staged. No browser/desktop/provider request, user application stop/restart, installed-data mutation, integration/push/deployment/release. Opaque history sentinel validates bytes only, not replay/inference.

Captured output retained, including failed attempt; whitespace normalized only for repository diff hygiene.
