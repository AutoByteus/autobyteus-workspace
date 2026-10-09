# AutoByteus Server TS - Agent Notes

## Testing

- Workspace testing guideline (layers, path selection, rules): [TESTING.md](../TESTING.md).
- Run all tests:
  - `pnpm -C autobyteus-server-ts exec vitest`
- Run the unit suite:
  - `pnpm -C autobyteus-server-ts test:unit`
- Run integration tests only (checks build prerequisites first; run `test:integration:prepare` once per worktree, and again after changing server or SDK source):
  - `pnpm -C autobyteus-server-ts test:integration:prepare`
  - `pnpm -C autobyteus-server-ts test:integration`
- Type-check production `src`:
  - `pnpm -C autobyteus-server-ts typecheck`
- The unit/integration baseline, environment isolation and opt-in gates are described in [TESTING.md](../TESTING.md#server-unit-and-integration-baseline).
- Run a single test file:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts --no-watch`

Notes:
- Use `vitest run` with `--no-watch` to avoid watch mode.
