# API/E2E Revision Record — code-quality-leftovers (autobyteus-357)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-002 pass | SR-002; ARCH-REV-002; IR-001, IR-002; CRR-001, CRR-002 | N/A | `Pass` / 95.3% |

## Revision Entries

### API-REV-001 — Baseline: gated server E2E, Projects and Settings in the browser, a real local-model turn

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-002); round 1.
- Triggering finding or case IDs: the handoff's "Not run" and Downstream Coverage Hints; the review's residual risk on `CompactionAttempts`.
- Related revision IDs: SR-002, ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002.
- Why recorded: the first API/E2E round.
- Coverage decisions or durable test paths changed: three labelled baseline fixes (TESTING.md Rule 9), each for a stale expectation from an earlier ticket in the base. None of them is caused by this change.
  - `scoped-org-history-graphql.e2e.test.ts` (`e2c1b604d7`): stale since `47f44c3df6`.
  - `projects-feature-probe.mjs` PT-E2E-017 (`8e011a01bd`): stale since `cba9eca3ef`.
  - `token-usage-runtime-graphql.e2e.test.ts` (`75f2fffe57`): the local pricing policy.
- Cases:
  - API-R01/R02 reused (IMP-01…17);
  - API-01 Pass (268/269, then the fixed test 1/1);
  - API-02 Pass (17/17);
  - API-03 Pass (real LM Studio: READY, PARTIAL; Ollama ERROR);
  - API-04 Pass (a real local-model turn).
- Commands, environment, fixture, or broader-validation delta: real LM Studio (local, no credits), one run at a time, model unloaded after. Live compaction was not run, by TESTING.md.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution report, test progress log, `follow-ups.md` (FU-004).
- Prior result and confidence: N/A.
- Current result and confidence: `Pass`, 95.3%.
- New or remaining failure IDs: none.
- Recommended owner: code reviewer (test-code review).
- Remaining risks:
  - The live compaction scenario runs only when the user asks.
  - FU-004.
