# API/E2E Revision Record

The history of this ticket's API/E2E results. The investigation and the execution report remain the current truth.

### API-REV-001: round 1 (CRR-001): the stop, the retry, the third node and the lists proven; Fail on F-1 and F-2

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-001 Pass; head `dd5b230e7e`), API/E2E round 1.
- Triggering finding or case IDs: none (the first round); the reviewer's list AC-001 … AC-007 and mixed versions.
- Why this revision was recorded: the baseline result.
- Coverage decisions or durable test paths changed:
  - `remote-delegation-two-server.e2e.test.ts`: updated RC-09, RC-10, RC-11, RC-23, RC-35, RC-49, RC-20, the header, `CapturingProxy.answerWith`; added RC-51, RC-52, RC-53;
  - `autobyteus-web/tests/e2e/mobile-closed-delegation-cases.mjs` (MSP-93), registered in `mobile-shell-probe.mjs`;
  - `follow-ups.md`: FU-591-01.

#### Prior Failure Resolution

None (the first round).

- Canonical artifacts and sections updated: the coverage investigation; the execution report; the progress log; `evidence/api-e2e/` (`API-r1-runs.txt`, the receipt extracts, `API-r1-msp93.json`, `MSP-93-*.png`); `follow-ups.md`.
- Prior result and confidence: none.
- Current result and confidence: `Fail` / 89%.
- New or remaining failure IDs: F-1 (no row for the closed remote run under its delegating run on A: AC-001, AC-006), F-2 (the run's own reopened Task can't be given again and the assigner's message is refused; a reopen alone before delivery still stops: AC-007, AC-004).
- Recommended owner: the Code Reviewer, for failure-origin review (preliminary: both `Requirement Gap`).
- Remaining risks, blocked evidence, or untested scope:
  - a real runtime as the mid-turn member (Not Tested);
  - the contract stories stop early on a base-side fixture gap (FU-591-01).
