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

### API-REV-002: round 2 (CRR-003): F-1 and F-2 resolved against SR-010; Pass

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` round 2 (CRR-003 Pass on IR-002 DN-9; head `81a504de13`, code `a811f94348`), API/E2E round 2.
- Triggering finding or case IDs: F-1, F-2 (round 1); the corrected requirements SR-010 (CR-591-002, CR-591-003) and SR-011.
- Why this revision was recorded: the rerun after the requirements were corrected and the continuation implemented.
- Coverage decisions or durable test paths changed:
  - `remote-delegation-two-server.e2e.test.ts`: RC-11 asserts the closed run left the delegator's tree; RC-51 (agent) and RC-53 (Team) test the continuation by the assigner's message, another sender's refusal and `delegate_task`'s local refusal for the same Task; RC-52 asserts `rfOutcome` (a Task's reopen alone still stops) and adds rg (the continuation while beta is down); RC-11/RC-23/RC-49 assert the delegator's local text;
  - `mobile-closed-delegation-cases.mjs`: MSP-93's row returns through the assigner's message.

#### Prior Failure Resolution

- F-1: resolved (SR-010): on A the closed run leaves the delegating run's tree, as a local one, and its Task's page shows it `offline` (RC-11, RC-51).
- F-2: resolved (IR-002, DN-9): the assigner's message continues the closed remote run after a reopen ("open" confirmed first; listed again; woken with its conversation) for an agent and a Team; `delegate_task` with the same Task gets the local refusal; another sender is refused CLOSED; B unreachable answers "… continues with its conversation (its Task is open again) but did not receive this message; send it again." with "open" owed and delivered on B's return. A Task's reopen alone does not prevent the close (REQ-002 corrected).
- Rerun delta: r5 failed only on my round-1 wording for the delegator's message to a closed run (it now gets the local `assertReopenable` text); r6 53/53; MSP-93 Pass; CPW 14/14.

- Canonical artifacts and sections updated: the execution report (Round, Routing, Environments, Cases, Round 2 Resolution, AC proof, scorecard, Durable Coverage, Cleanup, Result); the investigation (Round 2 Updates); the progress log; `evidence/api-e2e/API-r2-*`.
- Prior result and confidence: `Fail` / 89%
- Current result and confidence: `Pass` / 95%
- New or remaining failure IDs: none
- Recommended owner: the Code Reviewer, for the proportional test-code review of `52a1507b80` and round 2's test commit, then delivery.
- Remaining risks, blocked evidence, or untested scope:
  - a real runtime as the mid-turn member (Not Tested);
  - AC-004's alternate column still awaits alignment with REQ-002 (wording; RC-52 tests REQ-002);
  - FU-591-01 (the contract stories stop early, base-side).
