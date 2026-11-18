# DEL-01 post-integration checks (delivery, 2026-10-30)

State: ticket branch `codex/stored-runtime-names` after merging `origin/personal` @ `6b34f900b6` (merge commit `9f8634f0fd`, no conflicts; 20 incoming commits: Docker node in-place update, release scripts, remote-access route policy; none touch app-data migrations, agent-memory, compaction payloads or raw-trace code).

| Check | Command | Result |
| --- | --- | --- |
| Install and generated packages | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | done |
| Production typecheck | `pnpm exec tsc --noEmit -p tsconfig.build.json` (server) | exit 0 |
| Migration, architecture, memory, backend and streaming suites (API-01 command) | `pnpm exec vitest run tests/app-data-migrations tests/architecture tests/unit/agent-memory tests/unit/agent-execution/backends tests/unit/services/agent-streaming --no-watch` | `Test Files  203 passed \| 4 skipped (207)`, `Tests  2076 passed \| 6 skipped (2082)` (identical to API-01) |
| Library memory suite | `pnpm exec vitest run tests/unit/memory --no-watch` (autobyteus-ts) | `Test Files  42 passed (42)`, `Tests  312 passed (312)` (identical to API-01) |
| Server build | `pnpm build` (autobyteus-server-ts) | exit 0, bootstrap smoke passed |
| Built-server migration E2E and Memory Sync E2E (API-02/03/06) | `env -i PATH HOME=<tmp> pnpm exec vitest run tests/e2e/app-data-migrations/raw-trace-manifest-runtime-names-startup.e2e.test.ts tests/e2e/memory-sync/raw-trace-manifest-runtime-names-sync.e2e.test.ts --no-watch` | `Test Files  2 passed (2)`, `Tests  3 passed (3)` |
