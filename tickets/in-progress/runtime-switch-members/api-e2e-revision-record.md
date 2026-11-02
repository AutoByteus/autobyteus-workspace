# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | implementation IR-001 (`implementation-revision-record.md`), code review CRR-001 | N/A | Fail / 82% |
| API-REV-002 | code reviewer, `code-review-report.md` CRR-004 Pass, round 2 | implementation IR-002, IR-003; code review CRR-002, CRR-003, CRR-004 | Fail / 82% | Pass / 92% |

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

### API-REV-002 — Round 2: F-1, F-2 and the Org undo proven resolved; result Pass

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-004 Pass), round 2.
- Triggering finding or case IDs: F-1 (RSM-02, RSM-03, API-07), F-2 (RSM-04); reviewer's requests: replace the contract test, rerun RSM-01..05, add the Org undo, rerun by impact, add a model-only copy comparison.
- Related upstream revision IDs: implementation IR-002 (CRR-002 F-1, F-2), IR-003 (CRR-003 F-3); code review CRR-002, CRR-003, CRR-004.
- Why this revision was recorded: rerun after rework.
- Coverage decisions or durable test paths changed: rewrote `org-member-pending-runtime-switch.test.mjs` (round-1 assertions contradicted the approved wire decision); added RSM-06 and RSM-07 to `runtime-switch-members-probe.mjs`; added EX-05 to the extended built-server file; no removals.
- Cases added, changed, removed, or rechecked: added RSM-06, RSM-07, EX-05; rechecked every round-1 case (R0, EX-01..04, LV-01..03, RSM-01..05, DCP-001..005, API-06, API-07); mutations X-D (EX-05) and the IR-003 revert (RSM-07).
- Commands, environment, fixture, or broader-validation delta: server rebuilt from `d7e63493e7`; stand-in LM Studio lists two native models; scripted Antigravity lists one extra model; browser and live validation rerun.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1: Save of an Org member's switch showed a raw schema error (RSM-02, RSM-03, API-07 red) | Local Fix (implementation_engineer) | Resolved: the Org config read and Save result use the wire projection; no note after Save; the field stays off the wire | RSM-02, RSM-03, API-07 (rewritten), `agent-org-run-config-wire.test.ts` |
| F-2: saved copy row showed the previous runtime | Local Fix | Resolved: the row shows the choice at once | RSM-04, RSM-06 (comparison) |
| F-3 (CRR-003): the Org undo was refused | Local Fix | Resolved; reverting the IR-003 change makes RSM-07 fail | RSM-07, EX-05 |
| D-1: obsolete lock wait in DCP probes | stale test (mine) | fixed in round 1; still passing | DCP-001..005 |

- Canonical artifacts and sections updated: investigation (round 2 additions), report (rewritten for round 2), progress log (rows added).
- Prior result and confidence: Fail / 82%
- Current result and confidence: Pass / 92% (post-repository 88%)
- New or remaining failure IDs: none in scope; pre-existing P-1 (FU-C2, API-06) stands
- Recommended owner: none
- Remaining risks, blocked evidence, or untested scope: Grok, Antigravity and native runtimes scripted; AC-009 and a copy's undo covered only by implementation checks; journal and memory-search reads beyond the chat not exercised.
