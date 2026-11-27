# IMP-002 — Suites, typechecks, guards and sizes

Run on 2026-11-27 in `<worktree>` with `env -i PATH HOME TMPDIR USER`, one heavy run at a time.

| Check | Command | Result |
| --- | --- | --- |
| Web unit suite | `NUXT_TEST=true npx vitest run` (autobyteus-web) | 818 files: 817 passed, 1 failed; 6,372 tests: **6,369 passed**, 1 failed, 2 skipped; 1 unhandled error. Neither failure is this ticket's (below) |
| Web typecheck | `pnpm -C autobyteus-web typecheck` | **PASS**: production 0 errors; test files 85 in 35 files (baseline 85). A first run found one new test-file error, a fixture page constructing `TeamStreamingService` without the now-required callback, which is fixed |
| Server unit suite | `pnpm -C autobyteus-server-ts test:unit` | 1,104 files: 1,098 passed, 5 skipped, 1 failed; 9,176 tests: **9,166 passed**, 9 skipped, 1 failed. The failure was `tracked-imports.test.ts`: the new `agentOrgPendingCommands.ts` was not committed yet. After the commit it **passes** (`vitest run tests/architecture/tracked-imports.test.ts`: 2/2) |
| Server typecheck | `pnpm -C autobyteus-server-ts typecheck` | **PASS**: production 0; test files 972 in 299 (baseline 972) |
| Server build (for the probes) | `pnpm -C autobyteus-server-ts build` | exit 0, both bootstrap smokes passed |
| Web boundary guard | `pnpm -C autobyteus-web guard:web-boundary` | Passed |
| Localization boundary guard | `pnpm -C autobyteus-web guard:localization-boundary` | Passed |
| Localization literal audit | `pnpm -C autobyteus-web audit:localization-literals` | Passed with zero unresolved findings |
| AC-008 sizes | `wc -l` | `agentOrgContextsStore.ts` 482 (was 506), `agentOrgStreamingService.ts` 446 (was 506). Touched: `agentTeamRunStore.ts` 485 (was 490), `runHistoryLoadActions.ts` 493 (was 507) |
| AC-008 old name | `grep -rn agentOrgConnectionLostError` (code: `.ts`, `.vue`, `.mjs`) | 0 importers; only this ticket's docs name it |
| Whitespace | `git diff --check` | clean |

## The two web-suite failures are not this ticket's

1. **`tests/integration/app-font-size-fixed-px-audit.integration.test.ts`** flags `components/settings/nodes/NodeRow.vue:39`
   `text-[11px]`. The file came with the base's `aba07b35e3` (autobyteus-581, WIP); this ticket changes neither it nor the
   audit, so the base fails the same way.
2. **The unhandled `ReferenceError: window is not defined`** comes from Apollo Client's devtools-suggestion timer
   (`ApolloClient.js:174`, `setTimeout` 10 s after a worker's first `new ApolloClient`). It reads `window` after jsdom was
   torn down. It is attributed to `stores/__tests__/agentOrgHistoryApollo.spec.ts`, which builds its own client, and shows
   only when that worker outlives the timer. Not from this ticket's code.
