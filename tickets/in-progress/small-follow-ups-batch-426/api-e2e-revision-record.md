# API/E2E Revision Record — small-follow-ups-batch-426

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code reviewer, `code-review-report.md` CRR-002 Pass; round 1 | SR-006; ARCH-REV-002…004; IR-002; CRR-002 | N/A | Fail / 76% |
| API-REV-002 | code reviewer, `code-review-report.md` CRR-005 Pass; round 1 rerun | SR-008; IR-003, IR-004; CRR-003…CRR-005 | Fail / 76% | Pass / 95% |
| API-REV-003 | code reviewer, `code-review-report.md` CRR-007 Pass; ticket round 2 (items 9, 20–23) | round-2 SRs; IR-005; CRR-006, CRR-007 | Pass / 95% (round 1) | Pass / 95% |

## Revision Entries

### API-REV-001 — Round 1: D-02 open-phone Check and D-03 user-visible restore fail; everything else proven

- Triggering role, report path, and round: code reviewer, `tickets/in-progress/small-follow-ups-batch-426/code-review-report.md` (CRR-002), round 1
- Triggering finding or case IDs: the reviewer's owed checks (B04, NVP-05, the mobile-shell phone-bundle cases, emulator AC-004/005/007, the full server E2E suite, the fresh-start build)
- Related revision IDs: SR-004…SR-006, ARCH-REV-002…004, IR-001/IR-002, CRR-001/CRR-002
- Why recorded: baseline
- Coverage decisions or durable test paths changed:
  - `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`: MSP-17/18/19 added; MSP-13 and MSP-07 updated; per-case expected browser lines replace the app-wide feed exemption; a `failedRequests` log added (`903387bc78`).
  - `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` API-AGG updated to REQ-008 (`903387bc78`).
  - Baseline fixes, none caused by this ticket: `023a9a3ff9` (B04 fixture `GetProjects`), `898fbd2a31` (NVP: allowed window origin; one-source Memory page), `0bce7bac01` (skill-notice suites' inline-code text).
- Cases added, changed, removed, or rechecked: API-01…API-11, API-05b; Reused API-R1…R5 (IMP-03/04/05/06/09/10/11/12/13/14)
- Commands, environment, fixture, or broader-validation delta: ENV-1…ENV-6 in the execution report (emulator `autobyteus277_api35`; test-owned Docker node with this worktree's server package; fresh clone)

#### Prior Failure Resolution

None (baseline).

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-003), `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 76%
- New or remaining failure IDs:
  - F-API-001: D-02. A Check on an open phone does not see its own read's refusal or failure (AC-002, AC-003).
  - F-API-002: D-03. The restored URL is dropped by the web shell to the run list; a share-started task re-handles the old pairing link (AC-004).
- Recommended owner: failure-origin review (code reviewer), then the Solution Designer (both preliminary `Design Impact`)
- Remaining risks, blocked evidence, or untested scope:
  - Signing, notarization and other-OS desktop builds need the runner.
  - "Not connected → no Clipboard" and "no read on open" are covered by specs only.
  - FU-003 is outside the ticket.

### API-REV-002 — Round 1 rerun after SR-008: D-02 credential check and D-03 re-delivery rule pass

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-005), round 1 rerun at head `d115f1601d` (last code commit `c8b4b659cd`)
- Triggering finding or case IDs: F-API-001, F-API-002 (API-REV-001); CRR-003's failure-origin result; SR-008
- Related revision IDs: SR-008, IR-003, IR-004, CRR-003, CRR-004, CRR-005
- Why recorded: rerun after rework
- Coverage decisions or durable test paths changed: `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`: operation names from the query text; MSP-12 asserts the poll sends no `PhoneCredentialCheck`; MSP-13/18 record each credential check's answer
- Cases added, changed, removed, or rechecked:
  - Rerun by impact (investigation § Round 2 Rerun Plan): API-01, API-04 (all cases), API-02, API-03, API-08 (AC-004a: Runs A–D).
  - Still valid, not rerun: API-05, API-05b, API-06, API-07, API-09, API-10, API-11, API-R1…R5.
- Commands, environment, fixture, or broader-validation delta: phone bundle and debug APK rebuilt on `d115f1601d`; same emulator AVD and hold stack; server dist unchanged (no server source change)

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-API-001 (MSP-13, MSP-18: an open phone's Check did not see its own read's refusal or failure) | Design Impact | SR-008: the outcome comes from the phone's own credential check (`PhoneCredentialCheck`); the history read is content only | API-04 (r2) MSP-13, MSP-18, MSP-12 |
| F-API-002 (API-08: the restored URL dropped to the list; a share-started task re-ran its expired pairing link) | Design Impact | SR-008: a recreated activity does not re-run the share that started it; REQ-003 narrowed to AC-004a (non-run pages) with AC-004b (run screens) in round 2 (DEC-013) | API-08 (r2) Runs A–D |

- Canonical artifacts and sections updated: the execution report (Round, Cases (r2), Acceptance-Criteria Proof, Scorecard, Durable Coverage, Result), the investigation (Meta, Round 2 Rerun Plan), the progress log, `evidence/api-e2e/` (`*-r2*`)
- Prior result and confidence: Fail, 76%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: code reviewer (proportional test-code review; High risk)
- Remaining risks, blocked evidence, or untested scope:
  - AC-004b (run screens) is round 2.
  - The connection sheet says "Not reachable" while Phone Access is off (known, accepted).
  - Signing, notarization and other-OS builds need the runner.
  - FU-001…FU-003 are outside the ticket.

### API-REV-003 — Ticket round 2 (items 9, 20–23): D-09 poll, D-20 refused name, D-21/22/23 pass

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-007, Full Review of IR-005); ticket round 2 at head `a3bc0525cd` (base `d785ded109`, last code commit `736b51f87a`)
- Triggering finding or case IDs: the reviewer's owed checks (AC-009a/b/c probes with bytes and view reads, AC-020 Nodes page step, `peer-host-refused` ran or skipped, the full server E2E, the fresh-start build)
- Related revision IDs: IR-005, CRR-006, CRR-007 and round 2's solution revisions
- Why recorded: new round
- Coverage decisions or durable test paths changed (`94d7dca6b4`):
  - `mobile-shell-probe.mjs`: MSP-20 new; MSP-02 part (a) updated (REQ-009 replaces 277 DEC-013); MSP-12 counts status reads; the phone network log records `runIds`.
  - `remote-nodes-page-probe.mjs`: NP-13 new.
- Cases added, changed, removed, or rechecked:
  - Run: T2-01 (full mobile-shell, 20/20), T2-02 (Nodes page, 13/13), T2-03 (token probe 12-07, 12-20, today), T2-04 (full server E2E), T2-04b (57 gated model-free files), T2-05 (fresh-start build).
  - Reused: T2-R1…R4 (IMP-R2-01, 03, 05, 04).
- Commands, environment, fixture, or broader-validation delta: server dist and phone bundle rebuilt on `a3bc0525cd`. One debug run was interrupted by the app restart and discarded; its temp data root was removed.

#### Prior Failure Resolution

None (round 1 ended Pass; no open failure).

- Canonical artifacts and sections updated: the investigation's § Ticket Round 2, the execution report's § Ticket Round 2, the progress log (`T2-*`), `evidence/api-e2e/T2-*`
- Prior result and confidence: Pass, 95% (round 1)
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: code reviewer (proportional test-code review; High risk)
- Remaining risks, blocked evidence, or untested scope:
  - The Workspaces tree is covered by shared code and specs, not by its own probe step.
  - AC-020 (3) through the page is not reachable (DEC-017 / FU-004); it is spec- and server-proven.
  - Signing, notarization and other-OS builds need the runner.
