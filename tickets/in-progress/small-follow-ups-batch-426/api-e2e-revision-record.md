# API/E2E Revision Record — small-follow-ups-batch-426

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code reviewer, `code-review-report.md` CRR-002 Pass; round 1 | SR-006; ARCH-REV-002…004; IR-002; CRR-002 | N/A | Fail / 76% |

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
