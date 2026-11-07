# API/E2E Revision Record

Ticket autobyteus-412 `node-update-failure-and-release-order`. The current coverage investigation
(`api-e2e-coverage-investigation.md`) and execution report (`api-e2e-execution-coverage-report.md`) are authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-001, SR-002, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: fresh-start build and isolated packaged desktop + Docker node journeys

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-001), round 1
- Triggering finding or case IDs: none (pass handoff); the reviewer's items 1–5 map to API-04..API-10 and API-02
- Related revision IDs: SR-001 (requirements), SR-002 (design), ARCH-REV-002, IR-001, CRR-001
- Why this baseline was recorded: first API/E2E validation of the implementation
- Coverage decisions or durable test paths changed: none. All existing durable tests stay valid; the journeys are
  temporary probes (harness kept in `evidence/API-harness/`)
- Cases added, changed, removed, or rechecked: API-01 (reused IMP-02..IMP-10), API-02 (fresh-start build), API-03
  (step tests + actionlint in the clean clone), API-04..API-10 (packaged desktop journeys)
- Commands, environment, fixture, or broader-validation delta: the packaged app built from a fresh clone of
  `405c28d45e`; isolated instance on a test-owned data root; test-owned node `ab412-e2e-node` (image built-in
  1.5.12-beta.3, updated by the card to the published 1.5.12-beta.7); logging proxy; record seeded in the RUN-01 shape

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: the coverage investigation (all), the execution report (all), the test
  progress log, `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95% (no category below 93%)
- New or remaining failure IDs: none
- Recommended owner: code reviewer per the handoff rules (no test-code changes to review), then delivery
- Remaining risks, blocked evidence, or untested scope: RSK-002, the real-tag asset order (AC-005 on GitHub), for
  delivery on the next release; RSK-001 (intended); the address vs `baseUrl` mismatch (accepted); P-003 (cosmetic);
  signing and notarization plus the Linux and Windows builds (runner only)
