# API/E2E Revision Record — `workspace-history-group-archive`

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer — Implementation Complete, round 1 | SR-003, IR-001 | N/A | Pass / 95.4% |

## Revision Entries

### API-REV-001 — Baseline: group-archive wire coverage, live desktop validation, baseline test repair

- Triggering role, report path, and round: implementation_engineer, `implementation-handoff.md` (IR-001, commit `9faa6bc75`), round 1.
- Triggering finding or case IDs: N/A (initial validation). The handoff requested coverage hints 1–6.
- Related revision IDs: SR-003; IR-001; architecture/code review N/A (direct `Medium` + `Low` route).
- Why recorded: first completed API/E2E result.
- Coverage decisions or durable test paths changed:
  - `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts`:
    - API-001..004 added;
    - harness: schema built once, services delegated per test;
    - commit `85d2ec346`.
  - Baseline fixes (TESTING rule 9), test-only, in commit `dc70e7f44`, labelled as a baseline fix:
    - `tests/unit/api/graphql/converters/workspace-converter.test.ts`;
    - `tests/unit/api/graphql/types/projects.test.ts`;
    - `tests/unit/api/graphql/studio-application-api-services.test.ts`;
    - `tests/unit/api/graphql/types/memory-view-member-resolver.test.ts`;
    - `tests/integration/run-history/memory-layout-and-projection.integration.test.ts`;
    - `tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts`;
    - `tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` (all under `autobyteus-server-ts`);
    - `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts`.
- Cases added, changed, removed, or rechecked:
  - Added: API-001..004 (durable) and LIVE-01..06 (temporary, isolated desktop instance).
  - Rechecked: existing per-run archive E2E cases, plus the web feature and per-run specs.
- Commands, environment, fixture, or broader-validation delta:
  - Isolated instance `iso-55378-bafd` (`--from-worktree`), with the fake AGY CLI configured through the data-root `.env`.
  - Seeded through the product GraphQL (`api-e2e-evidence/live-seed.mjs`).
  - Cleaned up afterwards: instance stopped, data root removed, temp workspace deleted.
  - Final suites: server affected suites 343/343; web full 3960 pass / 0 fail.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `api-e2e-coverage-investigation.md` (all sections);
  - `api-e2e-execution-coverage-report.md` (all sections);
  - `api-e2e-test-case-ledger.md` (events 1–13).
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 95.4% (no category below 90%)
- New or remaining failure IDs: none
- Recommended owner: Delivery (next stage). Non-blocking observations go to the Solution Designer:
  - AC-005 wording vs QR-003;
  - live run beyond the cap shown as a `local` row;
  - an archived open run stays open, as with per-run archive;
  - token-usage numbers follow the host locale.
- Remaining risks, blocked evidence, or untested scope: the AC-006 partial-failure toast, the REQ-006 pending state and the AC-010 UI race are proven by specs and the server case only, not rendered live.
