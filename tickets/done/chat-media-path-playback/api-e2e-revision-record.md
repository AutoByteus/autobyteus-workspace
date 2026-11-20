# API/E2E Revision Record — autobyteus-572 (chat-media-path-playback)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md` IR-001; round 1 (direct route) | SR-003, IR-001 | N/A | Fail / 90.4% |
| API-REV-002 | Implementation Engineer, `implementation-handoff.md` IR-002 (D-7, SR-004, CRR-001); round 2 | SR-004, IR-002, CRR-001 | Fail / 90.4% | Pass / 95.1% |

## Revision Entries

### API-REV-001 — Baseline: phone media on real nodes, a broken download and Retry, zh-CN, the gate, Team references

- Triggering role, report, round: Implementation Engineer, `implementation-handoff.md` (IR-001), round 1.
- Triggering cases: the handoff's "Not run" and "Downstream Coverage Hints".
- Coverage changed: `autobyteus-web/tests/e2e/mobile-file-open-cases.mjs` gains MSP-91 and MSP-92 (`4adbafdf4d`; MSP-91 then requires Retry on the outside route, in the docs commit).
- Cases: API-01…API-07 with API-05b; API-06 and API-07 Next Round.

#### Prior Failure Resolution

None.

- Current result: Fail (AC-006 on the phone's node-file route: no Retry), 90.4%.
- New failure: MSP-91 "REQ-005, AC-006 outside: the failure offers Retry". Preliminary classification `Design Impact`; recommended owner Solution Designer, via failure-origin review.
- Remaining: the whole server suites (Next Round); FU-004 (MSP-59).

### API-REV-002 — Round 2: D-7 Retry on the phone viewer; whole phone probe and server suites

- Triggering role, report, round: Implementation Engineer, `implementation-handoff.md` (IR-002, D-7), round 2; CRR-001 classified round 1's failure `Design Impact`, resolved by SR-004.
- Coverage changed: MSP-91 taps the phone viewer's Retry outside the folder and waits until the node serves again before Retry (`9505c9039e`). The implementation added D-7 steps to MSP-89.
- Cases rerun: API-03 (MSP-91), API-05 (whole phone probe; the phone viewer changed). Run for the first time: API-06 (integration), API-07 with 07a/b/c (E2E: the full command stopped at the 2-hour limit; the rest ran in batches, the failures one at a time).

#### Prior Failure Resolution

| Prior Case / Failure | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-03 / MSP-91 "REQ-005, AC-006 outside: the failure offers Retry" | Design Impact (CRR-001) | D-7: the phone viewer's failure offers Retry; Retry loads again and plays | API-03, API-05 (MSP-89's D-7 steps) |

- Current result: Pass, 95.1%. New follow-up FU-005. Remaining: FU-004; the FSEvents-bound watcher tests and the credential warm-read time limit (outside the diff).
