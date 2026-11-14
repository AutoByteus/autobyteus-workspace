# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative; this file keeps the history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-007, round 1 | SR-053, IR-004, CRR-007 | N/A | Fail / 61% |
| API-REV-002 | Code Reviewer, `code-review-report.md` CRR-011, round 2 | SR-054, ARCH-REV-029, IR-005 … IR-007, CRR-008 … CRR-011 | Fail / 61% | Fail / 66% |
| API-REV-003 | Code Reviewer, `code-review-report.md` CRR-015, round 3 | SR-055 … SR-057, CR-461-017 … CR-461-029, CRR-012 … CRR-015 | Fail / 66% | Fail / 71% |
| API-REV-004 | Code Reviewer, `code-review-report.md` CRR-018 and CRR-020, round 4 | SR-058 … SR-070, IR-011 … IR-016, CRR-016 … CRR-020 | Fail / 71% | Fail / 70% |
| API-REV-005 | Code Reviewer, `code-review-report.md` CRR-023, round 5 | SR-071, IR-017, IR-018, CRR-021 … CRR-023 | Fail / 70% | Fail / 75% |
| API-REV-006 | Code Reviewer, `code-review-report.md` CRR-026, round 6 | SR-072 … SR-074, IR-019, IR-020, CRR-024 … CRR-026 | Fail / 75% | Fail / 78% |
| API-REV-007 | Code Reviewer, `code-review-report.md` CRR-029, round 7 (merged state) | SR-075, SR-076, IR-021, IR-022, CRR-027 … CRR-029 | Fail / 78% | Fail / 84% |
| API-REV-008 | Code Reviewer, `code-review-report.md` CRR-032, round 8 | SR-077, IR-023, IR-024 (code `fdf5ad8380`), CRR-030 … CRR-032 | Fail / 84% | Fail / 86% |
| API-REV-009 | Code Reviewer, `code-review-report.md` CRR-035, round 9 | SR-078, IR-025, IR-026 (code `f92881dd13`), CRR-033 … CRR-035 | Fail / 86% | Fail / 89% |
| API-REV-010 | Code Reviewer, `code-review-report.md` CRR-038, round 10 | SR-079, IR-027, IR-028 (code `15c41ad242`), CRR-036 … CRR-038 | Fail / 89% | Fail / 88% |
| API-REV-011 | Code Reviewer, `code-review-report.md` CRR-040, round 11 | SR-080, CR-461-076 (code `a4641a0985`), CRR-039, CRR-040 | Fail / 88% | Fail / 87% |
| API-REV-012 | Code Reviewer, `code-review-report.md` CRR-042, round 12 | CR-461-077 (code `5b455a9ec7`), CRR-041, CRR-042 | Fail / 87% | Fail / 87% |

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

### API-REV-005: round 5; the phone, the peer cases, SR-071 end to end; F-14 … F-22 rechecked; F-19b, F-23 … F-36

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-023 (code `56e4ce773b`, docs `bc96cddb14`), API/E2E round 5.
- Triggering finding or case IDs:
  - round 4's Next Round;
  - the rechecks F-14, F-16 … F-22, SDV-01 … 03;
  - the new checks C17-02, CR-461-042 and SR-071's refusals end to end.
- Related revision IDs: SR-071, IR-017, IR-018, CRR-021 … CRR-023
- Why this revision was recorded: the fix round's validation and the new checks
- Coverage decisions or durable test paths changed:
  - **Web:**
    - the phone probe's lost import and call of the stopped-delegator cases put back;
    - the phone cases check REQ-002 "once" and record the node's reads on failure;
    - SDV-04 added.
  - **Peer suite:**
    - RC-43, RC-44 added;
    - the suite moved to the contract (Task-entry links, `delegatingRun`, launches per SR-038, TC-13 logs).
  - **Stories:** drivers for the regenerated model.
  - **CPW-M7** added (C17-02).
  - **EXC-005:** its stopped-team step moved to SR-071.
  - **Own-run rewrites** of the batch R5-A … R5-C suites.
- Cases added, changed, removed, or rechecked:
  - Pass:
    - API-B01 desktop (SDV-01 … 04);
    - API-P01 / API-P02 new cases RC-43, RC-44;
    - CPW 14/14;
    - SR-071 (S20, U9, U10, EXC R-12 live and stopped);
    - API-E02 §5.2 11/11 and §5.3 9/9.
  - Fail:
    - API-B01 phone (F-32 … F-34);
    - the peer suite 42/44 (F-35, F-36);
    - API-E02 §5.1 24/28 (K-13, F-30);
    - API-E01 rewrites (F-19b, F-23 … F-29, F-31).
  - Next Round: in the investigation.
- Commands, environment, fixture, or broader-validation delta:
  - one server build (`56e4ce773b`) and one phone bundle;
  - the discovery run was loaded, so each candidate was confirmed in a targeted run;
  - the peer receipt and node logs hold peer signatures: kept in `/tmp`, records extracted with signature fields redacted.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-14 rows at every depth, team view | Local Fix | Resolved (desktop) | API-B01 SDV-02 |
| F-16 a delegated team's catalog for `delegate_task` | Local Fix | Resolved | `delegated-launch-config-defaults` (targeted) |
| F-17 reopen events | Local Fix | Resolved | `task-reactivation` CANCELLED journeys |
| F-18 R-7 / R-8 order | Unclear → SR-071 | Resolved | S20, U9 |
| F-19 team run ID; delegate texts | Unclear → SR-071 | `TARGET_IS_TEAM_RUN` resolved (live and stopped); the cross-root text open as F-19b | U10, EXC-005 |
| F-20 a copy without its conversation | Local Fix | Resolved | EXC-007 |
| F-21 the org view's statuses | Local Fix | Resolved | API-E02 §5.3 9/9 |
| F-22 a delegated worker listed top level | Local Fix | Resolved on the desktop; on the phone see F-33 | SDV-01, SDV-02 |

- Canonical artifacts and sections updated:
  - the coverage investigation (meta, the round-5 plan, deferred, ambiguities);
  - the execution report (all sections);
  - the progress log;
  - `evidence/api-e2e/*r5*`.
- Prior result and confidence: Fail / 70%
- Current result and confidence: Fail / 75%
- New or remaining failure IDs: F-19b, F-23, F-24, F-25, F-26, F-27, F-28, F-29, F-30, F-31, F-32, F-33, F-34, F-35, F-36; K-13
- Recommended owner:
  - Implementation Engineer: the Local Fix findings;
  - Solution Designer: the Unclear findings and K-13;
  - each confirmed by failure-origin review.
- Remaining risks, blocked evidence, or untested scope: the "Next Round" list in the investigation.

### API-REV-006: round 6; the round-5 rechecks, the Team tab, AC-001 on a real runtime; F-37 … F-46, K-14

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-026 (code `958cb22462`, docs `a2e2d00c1b`), API/E2E round 6.
- Triggering finding or case IDs:
  - the round-5 rechecks;
  - SR-072 … SR-074 (the Team tab; F-23, F-24, F-27, F-30, F-31, F-32, F-36, K-13);
  - the decision-only expectation changes;
  - the Next Round list.
- Related revision IDs: SR-072 … SR-074, IR-019, IR-020, CRR-024 … CRR-026
- Why this revision was recorded: the fix round's validation and the new checks
- Coverage decisions or durable test paths changed:
  - new suites `team-tab-subtree-messages` and `delegated-run-outlives-delegator-live` (gated, test vault);
  - the decided expectations encoded;
  - the stale rewrites of the report's list;
  - the remaining stale suites listed with causes.
- Cases added, changed, removed, or rechecked:
  - Pass:
    - Team tab;
    - the peer suite 44/44;
    - API-L01 2/2;
    - API-I01 (in scope);
    - stories §5.2 12/12, §5.3 9/9;
    - phone MSP-50, MSP-52.
  - Fail:
    - stories §5.1 26/28 (K-14, F-45);
    - phone MSP-51 (F-44);
    - desktop SDV-01 (F-46, 4 of 4);
    - API-E01 (F-37, F-38, F-42, F-43; Unclear F-39, F-40, F-41).
  - Next Round: in the investigation.
- Commands, environment, fixture, or broader-validation delta:
  - one server build and one phone bundle from `958cb22462`;
  - the stories fixture regenerated (49 states);
  - the test vault for API-L01 (key values never printed);
  - a temporary diagnostic in `project-task-tool-manifest.ts`, removed.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-19b | Local Fix | Resolved | EXC-005 |
| F-23 | Unclear → SR-072 | Resolved as decided | reactivation step 11; S10 |
| F-24 | Unclear → SR-072 | Resolved (as base) | TKD's deleted-Task step; U11 |
| F-25 | Local Fix (data loss) | Resolved | SID-2 |
| F-26 | Design Impact → SR-072/074 | Resolved | TT-1, TT-2 |
| F-27 | Unclear → SR-072 | Resolved as decided | RS-03 |
| F-28 | Local Fix | Resolved | lazy activation DTL-004 |
| F-29 | Local Fix | Resolved | SCP-E2E-006 |
| F-30 | Unclear → SR-072 | Resolved | S26; change feed |
| F-31 | Unclear → SR-072 (user-confirmed) | Resolved as decided | SRE-01..03 |
| F-32 | Unclear → SR-073 | Resolved as decided (open the team first) | MSP-51 (its row shows) |
| F-33, F-34 | Local Fix | Resolved | MSP-50, MSP-52 |
| F-35 | Local Fix | Resolved | RC-25 |
| F-36 | Unclear → SR-072 | Resolved as decided | RC-33 |
| K-13 | Contract model | Resolved | §5.1 S23, S24 |

- Canonical artifacts and sections updated:
  - the coverage investigation (meta, the round-6 plan, deferred, ambiguities);
  - the execution report;
  - the progress log;
  - `evidence/api-e2e/*r6*`.
- Prior result and confidence: Fail / 75%
- Current result and confidence: Fail / 78%
- New or remaining failure IDs: F-37, F-38, F-39, F-40, F-41, F-42, F-43, F-44, F-45, F-46; K-14
- Recommended owner:
  - Implementation Engineer: F-37, F-38, F-42, F-43, F-44, F-45, F-46;
  - Solution Designer: F-39, F-40, F-41, K-14;
  - each confirmed by failure-origin review.
- Remaining risks, blocked evidence, or untested scope: the "Next Round" list in the investigation.

### API-REV-007: round 7 on the merged state; F-37 … F-46 rechecked; F-43 remains; F-47, K-15, Q-1

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-029 (merged state `a529abcbdd`), API/E2E round 7.
- Triggering finding or case IDs:
  - the round-6 rechecks;
  - SR-075 (F-39, F-40, F-41, K-14), SR-076 (TDR-001);
  - the phone renumbering (MSP-53 … 55);
  - the merge's autobyteus-460 skill reload;
  - the Next Round list.
- Related revision IDs: SR-075, SR-076, IR-021, IR-022, CRR-027 … CRR-029
- Why this revision was recorded: the fix round's validation on the merged state
- Coverage decisions or durable test paths changed: the decided expectations; 8 stale suites rewritten; the merged skill suite adapted to rule 2; the restore helper; the stories driver (S26's refusal).
- Cases added, changed, removed, or rechecked:
  - Pass:
    - phone MSP-53 … 55;
    - desktop SDV-01 … 04;
    - peer 44/44;
    - API-L01 2/2;
    - the merge check;
    - stories §5.2 12/12, §5.3 9/9.
  - Fail:
    - R7-A (F-47, F-43);
    - R7-B (F-43; stale suites);
    - stories §5.1 S26 (K-15, the model).
- Commands, environment, fixture, or broader-validation delta:
  - a frozen install and rebuilt outputs after the merge;
  - the stories fixture regenerated.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-37 | Local Fix | Resolved (coordinator and member) | reactivation step 12 |
| F-38 | Local Fix | Resolved (`recipient_address` path); see F-47 for the run-ID path | TKD-AGY-001 |
| F-39 | Unclear → SR-075 | Behaves as decided | DCM-002/005/006/008, EX-03 |
| F-40 | Unclear → SR-075 | Behaves as decided | member-contact-host |
| F-41 | Unclear → SR-075 | Resolved (own stream) | DTL-003 |
| F-42 (+TDR-001) | Local Fix; SR-076 | Resolved | TDR-001, TDR-002 ×3 |
| F-43 | Local Fix | **Remains** | DTL-005 Org |
| F-44 | Local Fix | Resolved | MSP-54 |
| F-45 | model gap (CR-461-063) | Resolved | S27 |
| F-46 | Local Fix | Resolved | SDV-01 |
| K-14 | contract model | Resolved | S27 |

- Canonical artifacts and sections updated:
  - the coverage investigation (meta, the round-7 plan, deferred, ambiguities);
  - the execution report;
  - the progress log;
  - `evidence/api-e2e/*r7*`.
- Prior result and confidence: Fail / 78%
- Current result and confidence: Fail / 84%
- New or remaining failure IDs: F-43, F-47; K-15; Q-1
- Recommended owner:
  - Implementation Engineer: F-43, F-47;
  - Solution Designer: K-15, Q-1;
  - each confirmed by failure-origin review.
- Remaining risks, blocked evidence, or untested scope: the "Next Round" list in the investigation.

### API-REV-008: round 8; CR-461-067, round 23's changes, the stale suites; F-43, F-47, K-15 resolved; F-49 … F-52

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-032 at `fdf5ad8380`, docs head `392a1b447d`), API/E2E round 8
- Triggering finding or case IDs: CR-461-067; C23-02 (DS-7); round 23's changes (DTL-005 in every root, F-47 on both run-ID forms, S26/S27 and TAU-2 per SR-077); the Next Round list of API-REV-007
- Related revision IDs: SR-077, IR-023, IR-024, CRR-030 … CRR-032
- Why this revision was recorded: recheck of round 7's findings on the fix, the new CR-461-067 coverage, and the stale suites
- Coverage decisions or durable test paths changed:
  - added `projects/delegator-view-follows-child` (FOLLOW-A, FOLLOW-T, FOLLOW-S, FOLLOW-E);
  - replaced `run-history/standalone-unreadable-tree-containment` (its premise and trigger are removed by 461; it now checks rule 7 on a delegated run's unreadable own file);
  - rewrote to 461's shapes and rules: task-agent-own-run-startup, collaborators-to-delegated-runs-startup, team-run-v1-production-upgrade, open-task-tree-upgrade-startup (the hand-built 469 entries dropped: 461's migration converts them, API-E03), unclean-shutdown-delegated-team-restore, closed-run-attachments, task-copy-idle-lifetime (the polled background read; REQ-001 for the root-stop copy), delegated-copy-project-folder DCF-02, model-routing-delegation MR-02, task-existing-copy-assignment TKD, the stories harness and fixture (SR-077), the restore helper's diagnostics.
- Cases added, changed, removed, or rechecked: R8-A … R8-K and the stories; see the progress log
- Commands, environment, fixture, or broader-validation delta: ENV-1 and ENV-4 only; the browser, phone, peer and live reruns wait for the fix

#### Prior Failure Resolution

| Prior ID | Classification | Now | Proven By |
| --- | --- | --- | --- |
| F-43 | Local Fix | Resolved | DTL-005 agent/team/Org |
| F-47 | Local Fix | Resolved | EXC-001 … 003 (`target_team_run_id`), TKD (`target_agent_run_id`) |
| K-15 | contract model | Resolved (SR-077) | S26, §5.1 28 of 28 |
| Q-1 | Unclear | Decided (SR-077); tested: see F-49 | TAU-2 |
| F-48 (candidate) | — | Withdrawn: test construction (the own streams were followed late) | idle-lifetime, FOLLOW-S, FOLLOW-E |

- Canonical artifacts and sections updated:
  - the coverage investigation (meta, the round-8 plan, deferred, ambiguities);
  - the execution report;
  - the progress log;
  - `evidence/api-e2e/*r8*`.
- Prior result and confidence: Fail / 84%
- Current result and confidence: Fail / 86%
- New or remaining failure IDs: F-49 (a: Unclear, b: Local Fix), F-50 (Local Fix), F-51 (Unclear), F-52 (Local Fix); observations O-8a, O-8b, O-8c
- Recommended owner:
  - Implementation Engineer: F-49 (b), F-50, F-52;
  - Solution Designer: F-49 (a), F-51;
  - each confirmed by failure-origin review.
- Remaining risks, blocked evidence, or untested scope: the "Next Round" list in the investigation.

### API-REV-009: round 9; F-49 … F-52 resolved; O-8b answered; reruns pass; F-53

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-035 at `f92881dd13`), API/E2E round 9
- Triggering finding or case IDs: F-50 (USR-4 and every entry point, CR-461-070, CR-461-072); F-52 (UC-1, CR-461-071); team-run-v1 ×2 (CR-461-069, CR-461-073); TAU-2 (CR-461-068, SR-078); O-8b (held in CRR-033); the waiting list's reruns
- Related revision IDs: SR-078, IR-025, IR-026, CRR-033 … CRR-035
- Why this revision was recorded: recheck of round 8's findings on the fixes, O-8b, and the reruns on the fixed code
- Coverage decisions or durable test paths changed:
  - added `projects/background-step-stop-own-view` (O-8b);
  - `projects/unclean-shutdown-delegated-team-restore`: USR-4 hard; USR-6 (agent stream), USR-7 (the delegator's tool), USR-8 (the assigner's reactivation after DONE → IN_PROGRESS);
  - `run-history/standalone-unreadable-tree-containment`: the running server's delegator view without the bad row, with a warning;
  - `app-data-migrations/task-agent-own-run-startup`: TAU-2 over three starts (SR-078), the follow-ups in `LATER`;
  - `app-data-migrations/team-run-v1-production-upgrade`: base's text, no schema field; the own file recorded beside the stored-list check.
- Cases added, changed, removed, or rechecked: R9-A … R9-E, the reruns (phone, desktop, peer suite, API-L01); see the progress log
- Commands, environment, fixture, or broader-validation delta: server and phone bundle rebuilt by this round; ENV-1 … ENV-5

#### Prior Failure Resolution

| Prior ID | Classification | Now | Proven By |
| --- | --- | --- | --- |
| F-49 | Local Fix / Unclear | Resolved (SR-078) | TAU-2 (three starts) |
| F-50 | Local Fix | Resolved | USR-4, USR-6, USR-7, USR-8 |
| F-51 | Unclear | Resolved (CR-461-073) | team-run-v1's two connects |
| F-52 | Local Fix | Resolved | UC-1, UC-2 |
| O-8b | observation (held) | Answered: parity with a user-started run | BSV |

- Canonical artifacts and sections updated: the coverage investigation (meta, deferred, ambiguities); the execution report; the progress log; `evidence/api-e2e/*r9*`.
- Prior result and confidence: Fail / 86%
- Current result and confidence: Fail / 89%
- New or remaining failure IDs: F-53 (`Unclear`: the design's predecessor set)
- Recommended owner: Solution Designer (F-53), confirmed by failure-origin review.
- Remaining risks, blocked evidence, or untested scope: the "Next Round" list in the investigation.

### API-REV-010: round 10; F-53 resolved; SR-079's late predecessors; API-E01 in full; API-B03 batch 1; F-54, F-55

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-038 at `15c41ad242`), API/E2E round 10
- Triggering finding or case IDs: F-53 (CR-461-074, SR-079); a late 20261020; a late team index v2; C27-02; the rendered connect answer (API-REV-009); the waiting list
- Related revision IDs: SR-079, IR-027, IR-028, CRR-036 … CRR-038
- Why this revision was recorded: the recheck of F-53, SR-079's late predecessors, and the waiting list (no product failure was open at the round's start)
- Coverage decisions or durable test paths changed: see the report's "Durable Coverage Changed" (LTI-1, DRO-3, SID-3, the blocked-root probe, SDV-05, E-007, ad-hoc delegation, ten web probes for rule 2)
- Cases added, changed, removed, or rechecked: R10-A; API-E01 parts 1 and 2 with the lone reruns; DRO; API-B03 batch 1; SDV-05; see the progress log
- Commands, environment, fixture, or broader-validation delta: server rebuilt by this round; HOME a resolved temp folder (a `/tmp` HOME fails the terminal case)

#### Prior Failure Resolution

| Prior ID | Classification | Now | Proven By |
| --- | --- | --- | --- |
| F-53 | Unclear (predecessor set) | Resolved (SR-079) | team-run-v1 restart-retry case |

- Canonical artifacts and sections updated: the coverage investigation (meta, deferred, ambiguities); the execution report; the progress log; `evidence/api-e2e/*r10*`.
- Prior result and confidence: Fail / 89%
- Current result and confidence: Fail / 88%
- New or remaining failure IDs: F-54 (`Local Fix`, web), F-55 (`Unclear`), O-10a (`Unclear`)
- Recommended owner: Implementation Engineer (F-54); Solution Designer (F-55, O-10a); confirmed by failure-origin review.
- Remaining risks, blocked evidence, or untested scope: the "Next Round" list in the investigation; the batch-1 triage list in the report.

### API-REV-011: round 11; F-54 resolved; API-B03 across 13 probes; API-P03; F-56, F-57, F-59 (candidate)

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-040 at `a4641a0985`), API/E2E round 11
- Triggering finding or case IDs: CR-461-076 (F-54), SR-080; API-B03 batch-1 open items and batch 2; the rest under the agreed rule
- Related revision IDs: SR-080, CRR-039, CRR-040; FU-030 (the user's wording decision)
- Why this revision was recorded: the recheck of F-54 and the web probes' rule-2 rewrite
- Coverage decisions or durable test paths changed: see the report's "Durable Coverage Changed" (SDV-06, SDV-07; PMU-004/009/019/024; PLN-06/09; the closure probe; the two seeded probes)
- Cases added, changed, removed, or rechecked: four runner scripts (`/tmp/api461/r11-web-*.sh`); see the progress log

#### Prior Failure Resolution

| Prior ID | Classification | Now | Proven By |
| --- | --- | --- | --- |
| F-54 | Local Fix (web) | Resolved | PMU-003, PMU-018, PMU-019, PLN-05; PMU 25/25 |
| F-55 | test construction (CRR-039) | Closed: SDV-05 checks base's return | SDV-05 |
| O-10a | rejected (CRR-039) | — | — |

- Canonical artifacts and sections updated: the execution report; the progress log; `follow-ups.md` FU-030 "Collected differences" (DLP-003, DLP-005, SIR-001); `evidence/api-e2e/*r11*`.
- Prior result and confidence: Fail / 88%
- Current result and confidence: Fail / 87%
- New or remaining failure IDs: F-56, F-57 (`Local Fix`, web); F-59 (candidate)
- Recommended owner: Implementation Engineer, confirmed by failure-origin review.
- Remaining risks, blocked evidence, or untested scope: the report's "Stale, rewrite waiting", "Unclassified" and Next Round notes.

### API-REV-012: round 12; F-57 and F-59 resolved; every remaining suite run; F-60 … F-66

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-042 at `5b455a9ec7`), API/E2E round 12
- Triggering finding or case IDs: CR-461-077 (F-57: RSM-04, RSM-06, DCP-001, AFS-001); F-59 (SDV-06 from the Workspace and Projects pages); the rest in one round: API-P04, API-F01, the SSR cases, the live `agent-initiated-collaborators`, the remaining stale rewrites, BR-011
- Related revision IDs: CRR-041, CRR-042; FU-030
- Why this revision was recorded: the reviewer asked for every remaining probe and suite in this round so the fixes come back together
- Coverage decisions or durable test paths changed: the report's "Durable Coverage Changed" (DLD, AFS, SSR, DCR, LRL, osfr, PLN, SDV); DLP-006 retired (DS-10 item 6)
- Cases added, changed, removed, or rechecked: runner scripts `/tmp/api461/r12-web-1.sh`, `r12-web-2.sh`, `r12-batch3.sh`, `r12-web-4.sh`, `r12-f01.sh`; API-P04 capture `/tmp/api461/p04/`
- Commands, environment, fixture, or broader-validation delta: the base worktree got its own install (its `node_modules` had been symlinks to the branch's, so the first base runs were discarded); ENV-5 (fresh clone), ENV-6 (DeepSeek through the test vault)

#### Prior Failure Resolution

| Prior ID | Classification | Now | Proven By |
| --- | --- | --- | --- |
| F-57 | Local Fix (web) | Resolved | RSM 7/7 |
| F-59 | Local Fix (web) | Resolved | SDV-06, both surfaces |
| F-56 | rejected (CRR-041) | — | — |

- Canonical artifacts and sections updated: the execution report; the progress log; `follow-ups.md` FU-030 (DLP-004, DCP-004); `evidence/api-e2e/*r12*`.
- Prior result and confidence: Fail / 87%
- Current result and confidence: Fail / 87%
- New or remaining failure IDs: F-60, F-61, F-62, F-64, F-65, F-66 (`Local Fix`); F-63 (`Unclear`, security-relevant); PLN-09 (`Unclear`)
- Recommended owner: per the failure-origin review.
- Remaining risks, blocked evidence, or untested scope: the live suite's rewrite (LE-A1 … LE-T1) and the large-hub redesign wait for the fix; BR-011 unclassified; signing and other platforms (runner only); the background-task live suites Not Tested (safety).
