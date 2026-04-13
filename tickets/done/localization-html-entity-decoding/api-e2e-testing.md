Status: Pass

# Executable Validation

Targeted runtime validation was executed with an isolated Vitest config because the checked-in `autobyteus-web/vitest.config.mts` currently depends on a stale `@nuxt/test-utils` symlink in this workspace.

Command:

```bash
node /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/node_modules/.pnpm/vitest@3.2.4_@types+debug@4.1.12_@types+node@22.19.11_happy-dom@15.11.7_jiti@1.21.7_jsd_c4aeceb0540f1b53322b8b3ed72ae625/node_modules/vitest/vitest.mjs run --config <temporary-minimal-config> /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/localization/runtime/__tests__/localizationRuntime.spec.ts
```

Result:

- `1` test file passed
- `4` tests passed

# Covered Assertions

1. English entity-backed strings decode `&amp;`, `&lt;...&gt;`, `&rarr;`, `&larr;`, `&times;`.
2. Decimal and hex numeric entities decode correctly.
3. Interpolation still works before final decode.

# Residual Environment Note

The workspace has stale dependency symlinks under `autobyteus-web/node_modules/` for `vitest`, `@nuxt/test-utils`, and `vue`. No tracked source changes were made to repair those environment links for this ticket.
