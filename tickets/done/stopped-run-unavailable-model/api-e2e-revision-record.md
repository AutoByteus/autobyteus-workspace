# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md`, CRR-002 (round 2, Pass) | SR-006, ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002 | N/A | Pass / 95.3% |

## Revision Entries

### API-REV-001 — baseline: built-server coverage of the native model hand-over

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md`, CRR-002; API round API-001
- Triggering finding or case IDs: coverage the implementation left to API/E2E: AC-002, AC-008, AC-007, AC-006 end to end
- Related revision IDs: SR-006, ARCH-REV-002, IR-001/IR-002, CRR-001/CRR-002
- Why this baseline was recorded: first API/E2E round of the ticket
- Coverage decisions or durable test paths changed: new `native-model-handover-built-server.e2e.test.ts` (MH-01..MH-06); new helper `tests/e2e/helpers/org-run-tree.ts`; three stale Org-member switch suites repaired as a baseline fix (cause: the tests read the Org's own file, which holds only units); the code review's unit-test tightening taken
- Cases added, changed, removed, or rechecked: added MH-01..MH-06, MH-MUT; AC007 sweep of the existing suites (67/70 first, 13/13 of the three after repair); reused IMP-02/03/04/06
- Commands, environment, fixture, or broader-validation delta: built `dist`; clean `env -i` environment; scripted LM Studio endpoint with removable models; a custom OpenAI-compatible endpoint for verified capacities. Isolated desktop instance not used (reason in the report)

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution report, progress log, `follow-ups.md`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.3%
- New or remaining failure IDs: none; FU-001 is a follow-up (LM Studio models have no verified capacity in the real catalog)
- Recommended owner: `/code_reviewer` for the test-code review
- Remaining risks, blocked evidence, or untested scope: the rendered Settings view and AC-011 (user check on a beta); a delegated copy's native hand-over only by existing suites and units; no live check of a long history on a small window
