# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative; this file keeps the history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-007, round 1 | SR-053, IR-004, CRR-007 | N/A | Fail / 61% |
| API-REV-002 | Code Reviewer, `code-review-report.md` CRR-011, round 2 | SR-054, ARCH-REV-029, IR-005 … IR-007, CRR-008 … CRR-011 | Fail / 61% | Fail / 66% |

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
