# API/E2E Revision Record — fastify5-and-spreadsheet-parser

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution report (`api-e2e-execution-coverage-report.md`) are authoritative; this file records each round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-002 (Pass), round 1 | SR-004, ARCH-REV-002, IR-002, CRR-002 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: live base-vs-branch HTTP, packaged app and server container validation

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-002), round 1
- Triggering finding or case IDs: the implementation handoff's "API / E2E … Still Required" (E2E folder, AC-003/004/005/006 probes, AC-007/AC-014 packaged app, AC-008 container)
- Related revision IDs: SR-004, ARCH-REV-002, IR-002, CRR-001, CRR-002
- Why this baseline was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/integration/api/studio-server-http-contract.integration.test.ts` (`8e5967e393`): GraphiQL removal, non-loopback GraphQL classification, MCP gateway CORS contract on the real studio server over HTTP. It is proven discriminating on base and by a `cors: false` mutation.
  - Updated `autobyteus-server-ts/tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts` (`09baa03b86`, baseline fix per TESTING.md Rule 9): the failure in FU-004 was caused by the test, not by the change.
- Cases added, changed, removed, or rechecked: API-R1..R6 (reused implementation checks), API-01, API-03, API-03b, API-04, API-05, API-06, API-07, API-08
- Commands, environment, fixture, or broader-validation delta: clean `env -i` for every vitest and server run; base clone for comparisons; LAN address `192.168.2.158` as the non-loopback client; packaged app and server image built from a clean clone of `4dcdceea11`; LM Studio local model for the run journey; generated spreadsheet fixtures only

#### Prior Failure Resolution

None. This is the first round.

- Canonical artifacts and sections updated: coverage investigation (all), execution report (all), test progress log, `follow-ups.md` (FU-004 causes, FU-008 added)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95% overall; no category below 95%
- New or remaining failure IDs: none
- Recommended owner: code reviewer, for the proportional test-code review
- Remaining risks, blocked evidence, or untested scope: Termux (user-only, no AC); the mobile web viewer not driven in a phone browser; FU-008 (deprecation warning); OBS-1 (base GraphQL-WS handshake was broken and the branch fixes it, with no product consumer)
