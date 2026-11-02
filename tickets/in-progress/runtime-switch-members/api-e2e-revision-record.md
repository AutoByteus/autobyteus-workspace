# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | implementation IR-001 (`implementation-revision-record.md`), code review CRR-001 | N/A | Fail / 82% |

## Revision Entries

### API-REV-001 — Baseline: server and live surfaces pass, rendered Org and copy surfaces fail

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001 Pass), round 1.
- Triggering finding or case IDs: reviewer's bullets (a)–(e); findings F-1 (RSM-02, RSM-03, API-07) and F-2 (RSM-04) arose in execution.
- Related upstream revision IDs: implementation IR-001, code review CRR-001.
- Why this baseline was recorded: first validation of the Large + High package after source review.
- Coverage decisions or durable test paths changed: added `runtime-switch-members-extended-built-server.e2e.test.ts` (EX-01..04), `runtime-switch-members-live.e2e.test.ts` (LV-01..03, gated), `runtime-switch-members-probe.mjs` (RSM-01..05) with its package script, `org-member-pending-runtime-switch.test.mjs` (red); updated two waits in `delegated-launch-defaults-probe.mjs` (obsolete locked-runtime assertion).
- Cases added, changed, removed, or rechecked: R0, EX-01..04, LV-01..03, RSM-01..05, DCP-001..005 (before and after), API-06, API-07, X-A..X-C.
- Commands, environment, fixture, or broader-validation delta: browser and live broader validation executed (see the report's Cases).

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: investigation, report, progress log (all created this round).
- Prior result and confidence: N/A
- Current result and confidence: Fail / 82% overall (post-repository 83%)
- New or remaining failure IDs: F-1 (RSM-02, RSM-03, API-07), F-2 (RSM-04); pre-existing P-1 (FU-C2, API-06) out of scope
- Recommended owner: implementation_engineer (both `Local Fix`), after code reviewer's failure-origin review
- Remaining risks, blocked evidence, or untested scope: AC-003 and AC-009 not re-run by me (covered by implementation checks); live Grok/Antigravity not exercised; journal and memory-search reads of a switched member not exercised beyond the chat.
