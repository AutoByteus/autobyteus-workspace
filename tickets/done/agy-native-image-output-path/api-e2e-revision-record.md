# API/E2E Revision Record — agy-native-image-output-path

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `code-review-report.md` (CRR-001 Pass) / round 1 | SR-001..SR-004, ARCH-REV-001/002, IR-001, CRR-001 | N/A | Pass / 95.6% |

## Revision Entries

### API-REV-001 — Initial API/E2E baseline: native image path, fallback, containment, history, UI

- Trigger: `/code_reviewer`, `…/code-review-report.md`, round 1.
- Scenario IDs: API-E2E-001..007.
- Related revisions: SR-001..SR-004, ARCH-REV-001, ARCH-REV-002, IR-001, CRR-001.
- Why recorded: this is the first completed API/E2E validation result.
- Durable coverage changes:
  - Added `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts`.
  - Updated `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts` with history/reopen checks.
  - Updated `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` with the `image_done` case.
  - Nothing removed.
- Scenarios:
  - Added API-E2E-006 (browser) and API-E2E-007 (server-level step-output cases).
  - Extended API-E2E-003 with SCN-001.
  - Re-ran API-E2E-001/002/004/005.
- Environment:
  - Real agy 1.2.12 for the live and browser runs.
  - The documented `pnpm dev` stack for the browser run.
  - A fake AGY with a test-owned temp HOME for the deterministic suite.

#### Prior Failure Resolution

None.

- Canonical artifacts: `…/api-e2e-coverage-investigation.md`, `…/api-e2e-execution-coverage-report.md`, `…/api-e2e-test-case-ledger.md`, `…/api-e2e-evidence/`.
- Prior result and confidence: N/A.
- Current result and confidence: Pass, 95.6% (post-repository 89.3%).
- New or remaining failure IDs: None. The 10 unrelated unit failures are pre-existing and reproduce on the base source.
- Recommended recipient: `/code_reviewer` (proportional test-code review).
- Remaining risks:
  - AGY layout or wording drift (accepted in SR-002). The gated live tests detect it.
  - Only agy 1.2.12 was validated.
  - The Electron shell was not exercised; no shell change was made.

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path`
