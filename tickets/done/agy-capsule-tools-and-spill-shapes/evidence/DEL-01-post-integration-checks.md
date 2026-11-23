# DEL-01 post-integration checks (delivery, 2026-11-23)

State: `codex/agy-capsule-tools-and-spill-shapes` @ `2a83598268`. `origin/personal` @ `19e4dce128` had no commits beyond the ticket's base (`git rev-list --count HEAD..origin/personal` is 0), so no merge was needed and the checks below are on the integrated state.

| Check | Command | Result |
| --- | --- | --- |
| Install, generated packages | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | done |
| Server typecheck | `pnpm exec tsc --noEmit -p tsconfig.build.json` | exit 0 |
| Antigravity backend unit suite | `env -i … pnpm exec vitest run tests/unit/agent-execution/backends/antigravity --no-watch` | `Test Files  25 passed \| 4 skipped (29)`, `Tests  395 passed \| 6 skipped (401)` (identical to API/E2E) |
| Server build | `pnpm build` | exit 0, bootstrap smoke passed |
| Scripted-Antigravity e2e files, solo, load average about 55 | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/<file>.e2e.test.ts --no-watch` | `agy-capsule-tool-registry` 3 passed \| 1 skipped (the skipped one is the gated live case); `agy-native-tool-result-content-scripted-agy` 4; `agy-native-tool-arguments-transport` 4; `agy-linked-skills-transport` 10; `work-journal-agy-schema-reads-scripted-agy` 1; zero `AGY_CAPSULE_TOOL_NOT_IN_REGISTRY` lines in any output; no hook or discovery timeout |
| Live real-`agy` case | not rerun by delivery | API/E2E ran it twice on the host login (`API-03-live-built-server.log`); it adds conversations to the user's `agy` history, so delivery relies on its log |
| Fresh-start build (TESTING.md) | not required | no build input changed (server `src/` and tests, one fixture, a module doc) |
| Secret Gate, hygiene, licensing | see the release/deployment report | pass |
