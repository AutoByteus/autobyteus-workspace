# API/E2E Revision Record — autobyteus-303

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-002 (pass), round 1 | SR-005, ARCH-REV-005, IR-002, CRR-002 | N/A | Fail / 88% |

## Revision Entries

### API-REV-001 — Baseline: server E2E, real-stack page probe, live and Docker checks; three findings

- Triggering role, report path, and round: Code reviewer, `code-review-report.md` (CRR-002 Pass), API/E2E round 1.
- Triggering finding or case IDs: none (baseline).
- Related revision IDs: SR-005, ARCH-REV-003/005, IR-001/IR-002, CRR-001/CRR-002.
- Why recorded: first validation of the reviewed package.
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts`, `autobyteus-web/tests/e2e/model-routing-settings-probe.mjs`, `autobyteus-web/tests/e2e/fixtures/model-routing-provider-usage.mjs`, package script `test:e2e:model-routing-settings`; extended `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs`.
- Cases: API-00 (reused), API-01…API-12, plus diagnosis cases API-03b, API-05b, API-08b.
- Commands, environment, fixture, or broader-validation delta: clean-env server E2E; built `dist` for the probe, live node (host CLIs, test vault) and test-owned Docker node; `test:integration:prepare` for the Brief Studio E2E files.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all), execution report (all), `follow-ups.md` (FU-002), evidence `evidence/api-e2e/`.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 88%.
- New or remaining failure IDs: F-1 (timeout reported as "could not be read"; `Local Fix`), F-2 (local providers with models not listed until their catalog is loaded; `Design Impact`), F-3 (concurrent reads degrade Codex to unknown; `Design Impact`).
- Recommended owner: failure-origin review by the code reviewer; preliminary F-1 implementation engineer, F-2/F-3 Solution Designer.
- Remaining risks, blocked evidence, or untested scope: user-only checks AC-010 on the user's own windows and nodes, AC-006 used-% meaning; signed-in CLIs in Docker not run; FU-002 (pre-existing stale Agent Runtimes probe).
- Rerun plan after fixes (by impact): F-1 → API-01…05 file, API-03b probe, API-07; F-2 → API-01, API-08b, API-07; F-3 → API-01…05 file, API-05b, API-09. Live cases rerun when the service changes (API-08, API-11 quick).
