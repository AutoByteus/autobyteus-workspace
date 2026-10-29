# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-003 Pass, round 1 | IR-002, IR-003, CRR-003, SR-007 | N/A | Fail / 72% |
| API-REV-002 | Code reviewer, `code-review-report.md` CRR-005 Pass, round 2 | IR-004, SR-010, ARCH-REV-010, CRR-004, CRR-005 | Fail / 72% | Pass (API-04 owed) / 94% |

## Revision Entries

### API-REV-001 — Baseline: Codex live passes; a failed reopen is not shown on single runs

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-003 Pass), round 1
- Triggering finding or case IDs: API-05 (Fail)
- Related revision IDs: IR-002, IR-003, CRR-003, SR-007
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/runtime/tool-list-reopen-failure.e2e.test.ts`
- Cases added, changed, removed, or rechecked: API-01…API-07 planned. API-01 and API-02 reused; API-03 Pass; API-04 Blocked (Grok usage limit); API-05 Fail; API-06 and API-07 Not Tested (next round)
- Commands, environment, fixture, or broader-validation delta: baseline (see the report's Tested Builds And Environments)

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-003), `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 72%
- New or remaining failure IDs: API-05 (AC-007, single runs: the failed message is not shown)
- Recommended owner: failure-origin review by the code reviewer; preliminary `Design Impact` (Solution Designer)
- Remaining risks, blocked evidence, or untested scope: real Grok (API-04, provider limit); browser journeys API-06 and API-07

### API-REV-002 — Round 2: the failed reopen is shown; browser and Claude checks pass; real Grok owed

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-005 Pass), round 2
- Triggering finding or case IDs: API-05 (round 1 Fail)
- Related revision IDs: CRR-004 (failure origin: Design Impact), SR-010, ARCH-REV-010, IR-004, CRR-005
- Why this revision was recorded: rerun after the rework
- Coverage decisions or durable test paths changed: added `autobyteus-web/tests/e2e/tool-list-update-cases.mjs` (`TLU-001`); updated `delegated-launch-defaults-probe.mjs` (registration, `AGY_FAKE_TOOL_LOG`, `agyToolCalls`) and `autobyteus-web/package.json` (`test:e2e:tool-list-updates`)
- Cases added, changed, removed, or rechecked: API-05 rechecked first (Pass); API-06 run (Pass; the first attempt failed on the probe's label read, fixed in the probe); API-07 changed to a stream-frame check with a real Claude run (Pass); API-04 owed (Grok out of free usage; the user's credits are back tomorrow); API-01 reuses IR-004; API-02/API-03 kept from round 1
- Commands, environment, fixture, or broader-validation delta: ENV-4 (real Claude, haiku) and ENV-5 (probe stack, backend built from `5ee923081a`) added

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-05: a single run's failed reopen was not shown (no `ERROR`, no rejected ack) | Design Impact (CRR-004) | IR-004: the coordinator publishes one run `ERROR` for an input that failed before it was sent | API-05 (`API-05-round2-rerun.log`) |

- Canonical artifacts and sections updated: investigation (meta, API-07, round 2 notes), report (all sections), progress log, `follow-ups.md` (FU-003 closed, FU-004 added), `evidence/api-e2e/`
- Prior result and confidence: Fail, 72%
- Current result and confidence: Pass for every runnable case, 94%; API-04 owed
- New or remaining failure IDs: none
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: the real Grok CLI run (API-04), tomorrow; FU-004 (cosmetic, existing replay placement)
