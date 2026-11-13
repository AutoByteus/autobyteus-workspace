# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative; this file keeps the history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-007, round 1 | SR-053, IR-004, CRR-007 | N/A | Fail / 61% |
| API-REV-002 | Code Reviewer, `code-review-report.md` CRR-011, round 2 | SR-054, ARCH-REV-029, IR-005 … IR-007, CRR-008 … CRR-011 | Fail / 61% | Fail / 66% |
| API-REV-003 | Code Reviewer, `code-review-report.md` CRR-015, round 3 | SR-055 … SR-057, CR-461-017 … CR-461-029, CRR-012 … CRR-015 | Fail / 66% | Fail / 71% |
| API-REV-004 | Code Reviewer, `code-review-report.md` CRR-018 and CRR-020, round 4 | SR-058 … SR-070, IR-011 … IR-016, CRR-016 … CRR-020 | Fail / 71% | Fail / 70% |

## Revision Entries

### API-REV-001: baseline; the contract's stories, the migration start and the stopped-delegator views

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-007 at `bc223a8ae0`), API/E2E round 1
- Triggering finding or case IDs: the review's API/E2E items (removed events, removed restore mutations, SCN-005/AC-007 journeys, C3-06, the migration on real starts) and the design's Validation list
- Related revision IDs: SR-053, IR-004, CRR-007
- Why this baseline was recorded: first validation of the package
- Coverage decisions or durable test paths changed: added the stories acceptance test and its model export, the built-server migration start, the stopped-delegator views probe, the member-message restore helper, the in-process run-history helper; updated the harnesses, the in-process suites and six suites that used the removed restore mutations (report, "Durable Coverage Changed")
- Cases added, changed, removed, or rechecked: API-E02 Fail, API-E03 Pass, API-B01 Fail, API-B02 Pass, API-E01 triaged (six files updated and passing), API-R01/R02 reused; API-I01, API-B03, API-L01, API-F01 deferred to after the fix round
- Commands, environment, fixture, or broader-validation delta: ENV-1 (built servers, clean env, scripted AGY), ENV-2 (probe-owned browser stack)

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Fail / 61%
- New or remaining failure IDs: F-1, F-2, F-3 (`Local Fix`), F-4 (`Unclear`), F-5 (`Design Impact`)
- Recommended owner: Implementation Engineer (F-1 … F-3), Solution Designer (F-5; K-1 … K-11 contract-model notes); F-4 for the failure-origin review
- Remaining risks, blocked evidence, or untested scope: the stale baseline suites (API-E01), the web probes naming removed events (API-B03), integration, the real runtime, the fresh-start build, the phone layout; observation O-1 (a child command loads a stopped delegator's root, so `agentRunCollaborationStatuses.isActive` answers `true`)

### API-REV-002: round 2 on the fixes and SR-054; new delivery, team-copy, team-view and phone findings

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-011 at `f75cf6b96b`, code `9f4709571b`), API/E2E round 2
- Triggering finding or case IDs:
  - CR-461-009 (F-1), CR-461-010/-015 (F-2), CR-461-011 (F-3), CR-461-014, CR-461-016;
  - the contract settled F-4 and F-5 (SR-054);
  - O-1 (held in CRR-008);
  - the restore path in 33 files; child reads by the child's own identity.
- Related revision IDs: SR-054, ARCH-REV-029, IR-005 … IR-007, CRR-008 … CRR-011
- Why this revision was recorded: rerun of the failing cases on the fixes, the regenerated contract model, the phone layout, O-1, and the suite updates
- Coverage decisions or durable test paths changed:
  - API-E02's expected states regenerated from the SR-054 model; S17, S19, S25 and O5 … O7 drivers rewritten; the Study Group removed;
  - known differences updated (K-9, K-11, K-12) and a result-mapping error fixed (S14);
  - the desktop probe gains the O-1 rendered-status samples;
  - new phone cases MSP-37 … MSP-39 (`mobile-stopped-delegator-cases.mjs`, wired into `mobile-shell-probe.mjs`);
  - helpers `own-run-reads.ts` and the own-run fallback in the harness and the AGY fixture;
  - the restore path replaced in about 25 more suites (the investigation's plan lists them);
  - every stale file now has its decision in the investigation's plan (Next Round).
- Cases added, changed, removed, or rechecked: API-E02 (Fail), API-E03 (rerun, Pass), API-B01 desktop (Fail), API-B01 phone (Fail), API-B02 (Pass), API-E01 (Next Round), API-I01, API-B03, API-L01, API-F01 (Next Round)
- Commands, environment, fixture, or broader-validation delta:
  - ENV-3 (phone, production bundle), run from a temporary probe copy because the base's probe has two `MSP-32` cases (FU-016);
  - the story nodes' log level is configurable (`CONTRACT_STORIES_LOG_LEVEL`) and the node logs are saved beside the story evidence.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1 a delegated team's outside handoff refused | Local Fix | Resolved (CR-461-009) | API-E02 §5.3 O5 |
| F-2 the team view's child selection through the team | Local Fix | Reading resolved (CR-461-010/-015); sending fails: F-8 | API-B01 SDV-02 |
| F-3 the org inspection with delegated children | Local Fix | Resolved (CR-461-011) | API-B01 SDV-03 (×3) |
| F-4 the run-ID delivery text inside a team | Unclear | Settled in the contract (SR-054: today's texts); §5.2 passes | API-E02 §5.2 U2 |
| F-5 a saved Task to a peer | Design Impact | Settled in the contract (SR-054: by description; S25 refused) | API-E02 §5.1 S17, S25 |
| O-1 a stopped delegator's root loaded by a child command | not classified | Not a finding: the rendered lists show it stopped (desktop agent and org, phone agent) | API-B01 SDV-01, SDV-03, MSP-37 |

- Canonical artifacts and sections updated: the coverage investigation (meta, plan), the execution report (all sections), the progress log, `evidence/api-e2e/*r2*`, `follow-ups.md` (FU-016)
- Prior result and confidence: Fail / 61%
- Current result and confidence: Fail / 66%
- New or remaining failure IDs: F-6, F-7 (server), F-8, F-9 (web), F-10 (web/server)
- Recommended owner: Implementation Engineer (Local Fix), confirmed by failure-origin review
- Remaining risks, blocked evidence, or untested scope:
  - the stale-suite and probe rewrites, first in the next round (the investigation lists each file);
  - then API-I01, API-L01, API-F01 on the fixed code.

### API-REV-003: round 3; the stale tests first, F-6 … F-10 rechecked, new prompt, header, mention, nesting and team-send findings

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-015 at `da80596b0a`, merged state `8a47481617`), API/E2E round 3
- Triggering finding or case IDs:
  - CR-461-017 … -021 (F-6 … F-10 answered), CR-461-022 (own-identity child reads), CR-461-023 … -029 (refactors);
  - SR-055/056 (one listed-runs poll, `runCollaborationStatuses`), SR-057 (peer children with their node, no statuses);
  - C8-09 (does a delivery error leave a sender's tool call waiting?);
  - the reviewer's order: stale tests first (autobyteus-agents-107), API-E02, API-B01, the deferred cases.
- Related revision IDs: SR-055 … SR-057, CR-461-017 … CR-461-029, CRR-012 … CRR-015
- Why this revision was recorded: the fix round's validation, the stale-test rewrites, and the prior-failure rechecks
- Coverage decisions or durable test paths changed:
  - shared harness and helpers on the new poll and own-run reads;
  - nine server suites rewritten or confirmed, one removed with its reason (`agent-run-collaboration-member-file-changes`, CR-461-022);
  - `collaboration-prompt-wording` checked against the requirements and kept (it found F-11 … F-13), strengthened, with CPW-M5 added;
  - the stories gain the SR-057 poll check, and K-9's text is corrected;
  - the desktop probe gains the F-9 Team-tab check and a strict helper step;
  - the phone cases' own-member step is fixed;
  - web probes moved to the new poll (some not yet run).
  - The investigation's plan lists every file ("Rewritten in round 3", "Next Round").
- Cases added, changed, removed, or rechecked:
  - Pass: API-E02, API-E03 (rerun), API-B01 phone (MSP-50 … 52), API-B02 (rechecked).
  - Fail: API-B01 desktop; API-E01 (CPW).
  - Partly Pass: API-E01 (the rewritten suites).
  - Next Round: API-E01 full, API-I01, API-B03, API-L01, API-F01, the rendered peer rows.
- Commands, environment, fixture, or broader-validation delta:
  - ENV-3 no longer needs a probe copy (the duplicate `MSP-32` is renumbered);
  - the phone bundle was rebuilt from this code;
  - two power-offs; the interrupted desktop run was rerun, and its leftover temp root removed.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-6 the run-ID delivery text | Local Fix | Resolved | API-E02 §5.1 S4, S7, S9 |
| F-7 a delegated team's member messaging the org; the sender's call waiting | Local Fix | Resolved; C8-09: no call left waiting | API-E02 §5.3 O6, O7 |
| F-8 the team view's message to its worker lost | Local Fix | The first message is delivered; the second is refused every time: F-15 | API-B01 SDV-02 |
| F-9 the worker's Team tab error panel | Local Fix | Resolved | API-B01 SDV-02 (`workerTeamTab`) |
| F-10 the phone's stopped team and org without their workers | Local Fix | Resolved | API-B01 phone MSP-51, MSP-52 |

- Canonical artifacts and sections updated: the coverage investigation (meta, plan, deferred, ambiguities), the execution report (all sections), the progress log, `evidence/api-e2e/*r3*`
- Prior result and confidence: Fail / 66%
- Current result and confidence: Fail / 71%
- New or remaining failure IDs: F-11, F-12, F-13 (server), F-14 (web/design), F-15 (web)
- Recommended owner: Implementation Engineer (F-11, F-12, F-13, F-15), Solution Designer (F-14; F-11 row 5 if confirmed), confirmed by failure-origin review
- Remaining risks, blocked evidence, or untested scope:
  - the remaining stale-suite and probe rewrites, first in the next round;
  - the rendered peer rows (a peer node in the browser probes);
  - then API-E01 full, API-I01, API-L01, API-F01 on the fixed code.

### API-REV-004: round 4; rules 1 and 2, DS-15, C14-01; F-11 … F-15 rechecked; F-16 … F-22

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`. API/E2E round 4:
  - started on CRR-018 (code `49f3db1047`);
  - paused while the Implementation Engineer tested;
  - continued on CRR-020 (code `262afbd6bb`).
- Triggering finding or case IDs:
  - the redesign SR-058 … SR-069:
    - rule 1, base's shapes and rows at every depth;
    - rule 2, a delegated run reached by its own path;
    - rule 3;
    - peer handles;
  - SR-070 / DS-15 and C15-03;
  - C14-01;
  - the cumulative list of CRR-018.
- Related revision IDs: SR-058 … SR-070, IR-011 … IR-016, CRR-016 … CRR-020
- Why this revision was recorded: the redesign's validation and the prior-failure recheck
- Coverage decisions or durable test paths changed:
  - the round-4 per-file plan (investigation), from a discovery run of the whole server E2E (47 files failed);
  - the shared harness and helpers moved to base's view reads and own-run reads and sends;
  - many suites updated (report, "Durable Coverage Changed");
  - two new suites (DS-15, C14-01 timing);
  - the web restore's deleted probes restored and moved to rules 1 and 2.
- Cases added, changed, removed, or rechecked:
  - Pass: CPW, API-E03, DS-15, API-C01 (measured).
  - Fail: API-E02 (F-21 at §5.3 O8), API-B01 desktop (F-14 team view, F-22; SDV-01 passes).
  - Partly: API-E01 rewrites (F-16 … F-20).
  - Next Round: the phone, the peer cases, rule 3's peer capture, the DS-15 restart and C15-03 rendered, the remaining stale suites, the deferred cases.
- Commands, environment, fixture, or broader-validation delta:
  - two server builds (`49f3db1047`, `262afbd6bb`); each finding found on the first was rechecked on the second;
  - the stories driver now reports the run stream's answer when a step gets no result;
  - the Solution Designer's commit `2211bec711` swept in five staged files of this round (content unchanged).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-11 a delegated run's prompt | Local Fix | Resolved | CPW-P1 … P3 |
| F-12 the sender address that does not reach | Local Fix | Resolved | CPW-H1 |
| F-13 `@` to a child row refused | Local Fix | Resolved (rule 2: the child's own stream) | CPW-M2, M4, M5 |
| F-14 rows at every depth | Design Impact → SR-058 | Resolved in the agent-run view; open in the team view | API-B01 SDV-01 (pass), SDV-02 (open) |
| F-15 a second message to a team child | Local Fix → rule 2 | Resolved | API-B01 SDV-02 (`helperRunId` set) |

- Canonical artifacts and sections updated: the coverage investigation (meta, planned cases, the round-4 plan, deferred, ambiguities), the execution report (all sections), the progress log, `evidence/api-e2e/*r4*`
- Prior result and confidence: Fail / 71%
- Current result and confidence: Fail / 70%
- New or remaining failure IDs: F-14 (team view), F-16, F-17, F-18, F-19, F-20, F-21, F-22
- Recommended owner: Implementation Engineer (Local Fix), Solution Designer (F-18, F-19 Unclear), confirmed by failure-origin review
- Remaining risks, blocked evidence, or untested scope: the "Next Round" list in the investigation.
