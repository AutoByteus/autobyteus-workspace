# AutoByteus Server TS - Agent Notes

## Testing

- Run all tests:
  - `pnpm -C autobyteus-server-ts exec vitest`
- Run integration tests only:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/integration --no-watch`
- Run a single test file:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts --no-watch`

Notes:
- Use `vitest run` with `--no-watch` to avoid watch mode.
