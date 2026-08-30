# DR-001 Integration And Post-Integration Validation Evidence

- Recorded at: 2026-08-29 UTC
- Bootstrap base: `origin/personal@9d0fd7c570d58da1af2c7a40279327c8a20a8093`
- API/E2E-passed candidate: `aa1344967d89f8a3d63f11db21220eeadfabb325`
- Latest tracked remote base after fetch: `origin/personal@e664db7cfd725bc6fa1633b71c53954a3fe66e44`
- Base advancement: 284 remote-base commits beyond the bootstrap base.
- Candidate checkpoint: Not needed; the accepted candidate and complete upstream artifact chain were already committed and the worktree was clean.
- Integration method: conflict-free merge of `origin/personal` into `requirements/token-statistics-ui-redesign`.
- Integrated revision: `a20aa43d2e855a139476f32e97ca49604665a8a2` with parents `aa1344967d89f8a3d63f11db21220eeadfabb325` and `e664db7cfd725bc6fa1633b71c53954a3fe66e44`.
- Final ahead/behind against `origin/personal` at integration time: `18 0`.

## Overlap Audit

The ticket and advanced base both touched only these paths from the ticket-owned delta:

- `autobyteus-server-ts/tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts` — the merge retained the ticket regression and added two current-base lines without conflict.
- `autobyteus-web/package.json` — the merge retained `test:e2e:token-statistics-ui` and incorporated the current `1.4.62` package/release state without conflict.

No production Token Statistics source path was changed by both lines of development. The merged result preserved the selected UI and server reconciliation source.

## Post-Integration Command

`corepack pnpm -C autobyteus-web test:e2e:token-statistics-ui -- --output-dir <isolated-output>`

The self-starting probe performs the current server production build, isolated current-schema migration/seed, live server and Nuxt startup, Chromium execution, and owned-process/temp-root cleanup.

### Attempt 1 — Environment Refresh Required

- Result: Failed before services/browser startup.
- Exact cause: the newly integrated server source imported `ajv`, while the pre-merge workspace installation had not yet materialized the latest lockfile dependency. TypeScript reported `TS2307: Cannot find module 'ajv'`.
- Classification: local dependency installation state, not implementation behavior or merge conflict.
- Resolution: `corepack pnpm install --frozen-lockfile` completed without lockfile/source changes. Expected workspace bin warnings appeared because some generated devkit outputs were not built; they did not affect this path.
- Evidence: `dr-001-post-integration-attempt-1-server-build.log`, `dr-001-post-integration-attempt-1-result.json`.

### Attempt 2 — Pass

- Result: Pass; `failures=[]`.
- Live GraphQL requests: 29. The only GraphQL error was the probe's deliberate retry fixture.
- Key retained proof:
  - six ordered/equal summary peers;
  - 29-point Tokens line with explicit axes and exact bucket rows;
  - Partial Cost selection with two known points, two separated paths, no API error, and exact unpriced/`price_missing` evidence;
  - atomic UTC range/filter requests, loading/failure/retry, and no stale result;
  - seven Detailed-usage rows with 30,071 reconciled tokens and 100% shares;
  - Run details creation-time selection/lifetime totals, one task and one model request, no view-switch refetch;
  - desktop/390px keyboard, table overflow containment, English/Simplified Chinese DOM/layout;
  - zero Blob, object URL, or download actions;
  - frontend/backend termination and isolated temp-root removal.
- Actual Electron: Not required; no preload, IPC, native window, packaging, or file boundary changed. Chromium directly exercised the changed web-equivalent renderer.
- Evidence: `dr-001-post-integration-browser-result.json`, service/build logs, and current screenshots in this directory.
