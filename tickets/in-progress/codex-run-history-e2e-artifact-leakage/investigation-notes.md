# Investigation Notes

- Ticket: `codex-run-history-e2e-artifact-leakage`
- Stage: `1 - Investigation + Triage`
- Date: `2026-02-28`

## Sources Consulted

- `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
- `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
- `autobyteus-server-ts/src/run-history/services/run-history-service.ts`
- `autobyteus-server-ts/src/run-history/store/run-manifest-store.ts`
- `autobyteus-server-ts/src/config/app-config.ts`
- `autobyteus-server-ts/memory/run_history_index.json`

## Key Findings

1. **The exact prefix in UI is produced by a live Codex E2E test**
- `codex-runtime-graphql.e2e.test.ts` creates temp workspace roots with prefix:
  - `mkdtemp(path.join(os.tmpdir(), "codex-continue-workspace-e2e-"))`
- This exactly matches the polluted workspace names visible in the UI sidebar.

2. **Those runs are persisted into run-history index and remain visible**
- Evidence in `autobyteus-server-ts/memory/run_history_index.json` includes many entries with:
  - `workspaceRootPath: .../codex-continue-workspace-e2e-*`
- Run history grouping in backend (`RunHistoryService.listRunHistory`) groups by `workspaceRootPath`; therefore every persisted path appears as a workspace group in UI history.

3. **Current Codex E2E tests do not isolate app data dir / memory by default**
- Codex E2E suites build GraphQL schema directly and run against normal app services.
- They do not set an isolated per-suite app data dir (unlike some other E2E suites in this repo).
- Result: running these tests on a developer machine writes artifacts into normal local memory (`autobyteus-server-ts/memory`), which frontend then shows.

4. **This is primarily a test artifact leakage issue, not user-runtime path generation bug**
- The production runtime can still create valid run history, but tests are polluting shared persistence.
- Existing stale entries are historical garbage data from prior test executions.

## Constraints

- We must not break legitimate run-history persistence for real user runs.
- Cleanup must avoid deleting active runs or valid non-test history.

## Root Cause Hypothesis (High Confidence)

- Root Cause A: Codex live E2E tests use non-isolated persistence storage.
- Root Cause B: Test runs are not consistently deleted from run-history index/manifests.
- Combined effect creates persistent workspace groups with `codex-continue-workspace-e2e-*` names.

## Candidate Fix Directions

1. **Primary prevention**: isolate Codex E2E suites into temporary app data directory per suite (or per test).
2. **Secondary prevention**: explicit run-history cleanup in Codex E2E teardown where feasible.
3. **Remediation**: one-time cleanup utility/script for existing `codex-continue-workspace-e2e-*` historical rows/manifests.

## Open Questions

- Should remediation be automatic at server startup for known E2E prefixes, or manual/admin operation only?
- Should we keep historical test records in separate test profile instead of deleting them?

## Scope Triage

- Triage Result: `Medium`
- Rationale:
  - touches test harness behavior + run-history data hygiene,
  - requires regression tests and safe cleanup policy,
  - impacts both backend persistence behavior and user-visible workspace history.
