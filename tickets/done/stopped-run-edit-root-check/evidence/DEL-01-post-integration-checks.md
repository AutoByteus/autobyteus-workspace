# DEL-01 post-integration checks (delivery, 2026-11-06)

State: `codex/stopped-run-edit-root-check` after merging `origin/personal` @ `dc4e0880ac` (merge `009afa81a6`, no conflicts). The 3 incoming commits only change `RELEASE.md` (a beta release record for v1.5.12-beta.2; the build-only run before a tag is replaced by TESTING.md's Fresh-start build for changes that touch a build input) and add a ticket folder.

| Check | Command | Result |
| --- | --- | --- |
| Install, generated packages | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | done |
| Server typecheck | `pnpm exec tsc --noEmit -p tsconfig.build.json` | exit 0 |
| Unit and integration suites of the changed areas | `env -i … pnpm exec vitest run tests/unit/standalone-agent-run-root tests/unit/agent-execution tests/integration/agent-execution --no-watch` | `Test Files  170 passed \| 8 skipped (178)`, `Tests  1733 passed \| 41 skipped (1774)` |
| Server build | `pnpm build` | exit 0, bootstrap smoke passed |
| Built-server cases | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/stopped-run-edit-root-built-server.e2e.test.ts tests/e2e/runtime/runtime-switch-members-built-server.e2e.test.ts tests/e2e/projects/delegated-copy-member-contact-host.e2e.test.ts --no-watch` | `Test Files  3 passed (3)`, `Tests  6 passed (6)` |
| Fresh-start build (TESTING.md) | not required | the change touches no build input: the paths changed against the base are server `src/` and tests only (no `package.json`, lockfile, `tsconfig`, `scripts/` or workflow file) |
| Secret Gate, hygiene, licensing | see the release/deployment report | pass |
