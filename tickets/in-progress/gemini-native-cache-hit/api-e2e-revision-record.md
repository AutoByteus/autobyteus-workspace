# API/E2E Revision Record — gemini-native-cache-hit

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer / implementation-handoff.md / round 1 | SR-002, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: AGY cache-read accounting and Gemini 3.1 Pro pricing proven at server boundaries

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md`, round 1 (direct Small/Low route)
- Triggering finding or case IDs: N/A (initial validation)
- Related revision IDs: SR-002, IR-001; architecture review and code review N/A
- Why this baseline was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - Added `tests/e2e/runtime/agy-token-usage-transport.e2e.test.ts`, `tests/e2e/token-usage/gemini-native-pricing-graphql.e2e.test.ts` and `tests/e2e/token-usage/agy-token-usage-upgrade-continuation.e2e.test.ts`.
  - Updated `tests/fixtures/agy-failure-cli.mjs` (`usage_report` route) and `agy-stream-event-converter.test.ts` (AE-007).
  - Baseline fix to `token-usage-unit-prices-graphql` and `token-usage-ledger-provider-semantics` (facet cleanup).
  - Updated `TESTING.md`.
  - Commits: `88e5c6002`, `871f01cb3`.
- Cases added, changed, removed, or rechecked: AE-001..AE-007 added; TP-001 and TP-002 temporary
- Commands, environment, fixture, or broader-validation delta: the gated fake-CLI route replays the recorded AGY 1.2.16 usage; Live API probe TP-002 on the installed `agy` 1.3.2

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all sections), execution coverage report, test-case ledger
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: None. The pre-existing base failures are handled:
  - the token-usage analytics leak is fixed (`871f01cb3`);
  - the `autobyteus-ts` Gemini retry timeout (OBS-002) is already reported.
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope:
  - AC-003's live Token Meter rendering (user verification);
  - no live AGY run with cache reads > 0 through the server (covered by replay plus the investigation's direct 1.3.2 probe);
  - future AGY usage-format changes.
