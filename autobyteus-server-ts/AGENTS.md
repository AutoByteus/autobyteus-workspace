# AutoByteus Server TS - Agent Notes

## Startup runbook

- Before starting frontend/backend/docker for enterprise local testing, read:
  - `/Users/normy/autobyteus_org/autobyteus-workspace/README.md` (section: `Enterprise local startup (canonical)`).
- Use that runbook as the default startup path.
- Do not default to `~/.autobyteus/server-data`; keep host backend data project-local unless a task explicitly requires a custom `--data-dir`.

## Testing

- Run all tests:
  - `pnpm -C autobyteus-server-ts exec vitest`
- Run integration tests only:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/integration --no-watch`
- Run a single test file:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts --no-watch`

Notes:
- Use `vitest run` with `--no-watch` to avoid watch mode.
