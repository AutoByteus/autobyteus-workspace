# API/E2E Revision Record

The history of this ticket's API/E2E results. The investigation and the execution report remain the current truth.

### API-REV-001: round 1 (CRR-002): AC-005 proven on Linux; G-5 rendered; three failures (F-1 … F-3)

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-002 Pass; code `cc8dbce099`), API/E2E round 1.
- Triggering finding or case IDs: none (the first round). The reviewer's list: AC-005 on Linux, FU-020 on real-shaped data with C-6's timing, G-5 with its browser render, FU-036 on the org and collaboration streams, the FU-030 text assertions, G-1/G-2.
- Why this revision was recorded: the baseline result.
- Coverage decisions or durable test paths changed:
  - added: `delegated-run-own-attachment-links-startup.e2e.test.ts` (ALM-1), `run-stream-early-command.e2e.test.ts` (RSE-1), the G5 probe cases;
  - updated: LTI-1 (asserts G-2); 13 tests this ticket made untrue (FU-011 harnesses, FU-020 route, G-5 codes, FU-030 texts), listed in the report.

#### Prior Failure Resolution

None (the first round).

- Canonical artifacts and sections updated: the coverage investigation; the execution report; the progress log; `evidence/api-e2e/API-r1-runs.txt` and screenshots; `follow-ups.md` (FU-500-09, FU-500-10).
- Prior result and confidence: none.
- Current result and confidence: `Fail` / 86%.
- New or remaining failure IDs: F-1 (E-002: a retired agent's run gets the G-5 refusal), F-2 (the inherited-layer delegation refusal has no FU-030 next step), F-3 (SCP-E2E-006: the native mate gets no answer after a restart).
- Recommended owner: the Code Reviewer, for failure-origin review (preliminary: F-1 Design Impact, F-2 Local Fix, F-3 Unclear).
- Remaining risks, blocked evidence, or untested scope:
  - quiet macOS for the watcher (Not Tested: load 60–100 all day);
  - LE-F1 live on Claude (Next Round);
  - M-6 cold cache (no sudo);
  - the founder's own data (his approval).
