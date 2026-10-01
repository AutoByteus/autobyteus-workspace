# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer` CRR-001 Pass, round 1 | SR-001..SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail / 92% |
| API-REV-002 | `/code_reviewer` CRR-003 Pass, round 2 (SR-004 clarification) | SR-004, ARCH-REV-003 (N-4), IR-002, CRR-003 | Fail / 92% | Pass / 95% |

## Revision Entries

### API-REV-001 — Initial baseline: live AGY cleanup and Org/Team recovery; AC-B1 second-Terminate alternate fails

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-001), round 1
- Triggering finding or scenario IDs: N/A (initial)
- Related revision IDs: SR-001..SR-003, ARCH-REV-001/002, IR-001, CRR-001
- Why recorded: first completed API/E2E validation
- Coverage changes:
  - Added `autobyteus-server-ts/tests/e2e/runtime/agy-runtime-stop-recovery-live.e2e.test.ts` (opt-in `RUN_AGY_RECOVERY_E2E=1`).
  - Updated `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-live.e2e.test.ts`: daemon-stop assertions for AC-A1/A2; the write-step check no longer depends on the file location.
- Scenarios:
  - LIVE-BG-001, LIVE-BG-003, LIVE-ORG-B1, LIVE-ORG-B3+A2, LIVE-ORG-R7, LIVE-TEAM-D4, LIVE-SHUTDOWN-A2 and LIVE-REG-B4;
  - UNIT-001, E2E-REG-001 and TSC-001.
- Environment: real `agy` 1.2.12, `gemini-3.8-flash-high`, in-process studio server, temp app data

#### Prior Failure Resolution

None.

- Canonical artifacts updated: investigation, execution report, ledger (events 1–14), `evidence/`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 92%
- New failure IDs: **F-API-B1-ALT**. A second Terminate of an already-terminated Org or Team returns `success:false` "…run not found." instead of AC-B1's "harmless no-op success". Scenarios: LIVE-ORG-B1, LIVE-ORG-R7, LIVE-TEAM-D4. Preliminary classification: `Design Impact` (alternatively `Local Fix`).
- Recommended recipient: `/code_reviewer` (failure-origin review)
- Remaining risks / untested scope:
  - Linux not exercised (macOS only);
  - single model;
  - AGY crash orphans (DEC-001) not exercised;
  - Windows is out of scope.

### API-REV-002 — Round 2: AC-B1 second-Terminate assertions aligned to SR-004; full live rerun; Linux helper check

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-003), round 2
- Triggering finding or scenario IDs: F-API-B1-ALT; LIVE-ORG-B1, LIVE-ORG-R7, LIVE-TEAM-D4
- Related revision IDs: SR-004 (user-approved option (b)), ARCH-REV-003 (N-4), IR-002 (no code change), CRR-003
- Why recorded: the requirements clarification changed the expected outcome of an existing assertion. The source is unchanged at `299875113`, with no src, unit or architecture diff (verified).
- Coverage changes: `agy-runtime-stop-recovery-live.e2e.test.ts`. The three soft second-Terminate `success:true` assertions are replaced with hard assertions: the existing `{success:false, "…not found."}` response plus an unchanged stopped state (Org config/inspection equal to the post-Terminate state; Team inactive).
- Scenarios rechecked: the whole recovery file (5 cases), for a clean pass of the durable file as it will be reviewed. Added the temporary PROBE-LINUX-A1 for REQ-A1's Linux clause.
- Commands and environment: as round 1, plus a disposable `node:22-bookworm` container for the Linux probe

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-API-B1-ALT (LIVE-ORG-B1, LIVE-ORG-R7, LIVE-TEAM-D4): second Terminate returned `success:false` "…not found." against the SR-001 AC-B1 alternate | Design Impact (preliminary); code review confirmed a requirement-level ambiguity, and the user resolved it as SR-004 option (b) | Resolved. SR-004 makes the observed behavior the approved behavior. The assertions now check it, and the round 2 rerun passes 5/5. The round 1 evidence showed the same response and state. | ledger 15; `evidence/live-org-b1.json`, `live-org-r7.json`, `live-team-d4.json`, `live-recovery-round2.log`; `evidence/round1-*.json` |

- Canonical artifacts updated: execution report (round 2 authoritative), investigation (reroute table and decision), ledger (events 15–16), `evidence/`
- Prior result and confidence: Fail, 92%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended recipient: `/code_reviewer` (proportional test-code review)
- Remaining risks:
  - single live model;
  - Linux proven at the helper level only (no real AGY on Linux);
  - AGY crash orphans (DEC-001), Windows (DEC-003) and self-detaching commands (DEC-002) are documented limits;
  - live suites are opt-in.
