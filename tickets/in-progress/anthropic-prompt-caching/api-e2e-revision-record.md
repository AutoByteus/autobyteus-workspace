# API/E2E Revision Record — anthropic-prompt-caching

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer / `code-review-report.md` CRR-001 / round 1 | SR-005, ARCH-REV-003, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: live strict-mode validation of native Anthropic prompt caching

- Triggering role, report path, and round: code_reviewer, `code-review-report.md` (CRR-001, Pass 9.4), round 1.
- Triggering finding or case IDs: the "API/E2E … Still Required" list: AC-003, AC-004, AC-011, AC-013(a) + P-005, AC-013(b), AC-012.
- Related revision IDs: SR-005, ARCH-REV-003, IR-001, CRR-001.
- Why recorded: first completed API/E2E result.
- Durable test paths changed: added `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts` (gated `RUN_ANTHROPIC_CACHE_E2E=1`).
- Cases:
  - APC-E2E-001..005, 007, 008 executed (final run 6: 7/7 Pass).
  - APC-E2E-006 not tested: blocked by pre-existing DEF-A.
- Commands and environment:
  - repository: core typecheck, server typecheck, core unit, server unit;
  - live: run in a clean `env -i` environment against the real studio server, with a test-vault key and a strict transport wrapper.
- Execution history within the round:
  - Run 1: too little thinking was produced; DEF-A was found.
  - Runs 2 and 3: model refusal of an arithmetic-chain prompt (harness only); aborted.
  - Run 4: 6/7; DEF-B was found.
  - Run 5: interrupted by a power-off.
  - Run 6: final, 7/7.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `api-e2e-coverage-investigation.md` (results, scorecard);
  - `api-e2e-execution-coverage-report.md`;
  - `api-e2e-test-case-ledger.md`.
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: none for this change. Two pre-existing, base-identical defects were reported as separate items:
  - **DEF-A:** Stop with a pending tool approval hangs.
  - **DEF-B:** the meter drops restored-run usage through turn-id idempotency collision.
- Recommended owner: code_reviewer (proportional review of the added test). DEF-A/DEF-B go to the Solution Designer / Delivery for separate tickets.
- Remaining risks, blocked evidence, or untested scope:
  - APC-E2E-006 (DEF-A);
  - AC-005 is unit-only;
  - AC-007 is user verification (DEF-B affects restored runs);
  - P-004;
  - one cache rewrite per restore (measured: 24237 tokens).
