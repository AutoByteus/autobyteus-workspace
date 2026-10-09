# API/E2E Revision Record — gemini-native-cache-hit

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer / implementation-handoff.md / round 1 | SR-002, IR-001 | N/A | Pass / 95% |
| API-REV-002 | User request ("start the test electron and do live check") / round 2 | SR-002, IR-001 | Pass / 95% | Pass / 96% |

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

### API-REV-002 — Live AC-003 check in an isolated desktop instance

- Triggering role, report path, and round: the user asked directly for a live Electron check; round 2
- Triggering finding or case IDs: AC-003 (previously planned as user verification)
- Related revision IDs: SR-002, IR-001; branch HEAD `78df53634` (after Delivery merged `origin/personal`; the new coverage was re-run post-merge and passed 16 files / 136 tests)
- Why recorded: new live desktop evidence; it changes the confidence and AC-003 status
- Coverage decisions or durable test paths changed: None. LV-001 is a live journey and was not added as durable automation; it uses quota and the user's AGY login.
- Cases added, changed, removed, or rechecked: LV-001 added
- Commands, environment, fixture, or broader-validation delta:
  - `pnpm --silent isolated-app start --build` (instance `iso-63523-dd36`), driven with the browser-automation launcher (attach-only); `pnpm --silent isolated-app stop iso-63523-dd36`.
  - The first build was interrupted by a power-off and redone.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: execution coverage report (round meta, ledger reconciliation, the new "Round 2 — LV-001" section, scorecard, result summary, latest result); test-case ledger (seq 15)
- Prior result and confidence: Pass, 95%
- Current result and confidence: Pass, 96%
- New or remaining failure IDs: None
- Recommended owner: N/A
- Remaining risks: future AGY usage-format changes. The explicit user acceptance at finalization still belongs to Delivery.
