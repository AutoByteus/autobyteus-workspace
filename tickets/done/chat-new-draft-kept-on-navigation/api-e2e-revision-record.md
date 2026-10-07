# API/E2E Revision Record

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer — implementation-handoff.md, round 1 | SR-005, IR-001 | N/A | Fail / 91% (F-001) |
| API-REV-002 | Implementation Engineer — Local Fix IR-002 (after CRR-001), round 2 | SR-005, IR-002, CRR-001 | Fail / 91% (F-001) | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: live Draft-rows probe; sent agent row reads "Empty draft" (F-001)

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` (IR-001, commit `eef9633f5`), round 1
- Triggering finding or case IDs: N/A (baseline)
- Related revision IDs: SR-005; IR-001; ARCH-REV N/A; CRR N/A; DR N/A
- Why recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-web/tests/e2e/chat-draft-rows-live-probe.mjs` (cases D00–D14).
  - Added the `test:e2e:chat-draft-rows-live` script in `autobyteus-web/package.json`.
  - Existing unit tests were judged Still Valid and run.
- Cases added, changed, removed, or rechecked: D00–D14 added.
- Commands, environment, fixture, or broader-validation delta:
  - focused web tests (34 files / 235 Pass);
  - the full web suite (10 baseline-only failing files);
  - server prebuild/build;
  - live probe runs 1–3 plus a send-row sampling run (real Codex, owned data root).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: the coverage investigation (all sections), the execution coverage report (all sections), the ledger
- Prior result and confidence: N/A
- Current result and confidence: Fail, 91%
- New or remaining failure IDs: F-001. On an agent send the sent row reads "Empty draft" for about 200–300 ms, or for the whole send when it is slow, before the run opens. This breaks TR-004 (cases D00, D07; also visible in D09).
- Recommended owner: `implementation_engineer` (preliminary `Local Fix`; Code Reviewer failure-origin review to confirm)
- Remaining risks, blocked evidence, or untested scope:
  - D07's post-send checks were last proven in live-run-2 on the same product code, because live-run-3 stops at the new TR-004 assertion.
  - The packaged Electron shell was not run (unchanged).

### API-REV-002 — Recheck after the F-001 Local Fix (IR-002): Pass

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` / `implementation-revision-record.md` (IR-002, commit `9e902002d`), after Code Review `code-review-report.md` (CRR-001: failure origin confirmed); round 2
- Triggering finding or case IDs: F-001 (D00, D07, D09)
- Related revision IDs: SR-005; IR-002; CRR-001; DR N/A
- Why recorded: rerun after rework
- Coverage decisions or durable test paths changed: D09 in `autobyteus-web/tests/e2e/chat-draft-rows-live-probe.mjs` now asserts that the in-flight sent row keeps its text and stays unselected while another draft is open. No other test changes.
- Cases added, changed, removed, or rechecked: F-001 was rechecked first (D00, D07, D09, and D06 for the failed-send return), then all cases D00–D14 were rerun.
- Commands, environment, fixture, or broader-validation delta:
  - focused web tests @ `9e902002d` (32 files / 165 Pass);
  - full web suite (same 10 baseline-only files; 3783 pass);
  - live probe live-run-4 (same owned setup).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-001 / D00 (seed agent send: "Empty draft" for 293 ms) | Local Fix → implementation_engineer (CRR-001 confirmed) | Resolved: the row keeps its text until the run opens (341 ms), then leaves | `api-e2e-evidence/live-run-4/chat-draft-rows-live-evidence.json` `D00.details.sendRowSamples` |
| F-001 / D07 (re-entered agent send: "Empty draft" for 201 ms) | same | Resolved: text kept until 721 ms (agent) and 1801 ms (team); post-send checks pass | same, `D07.details.sendRowSamples` |
| F-001 / D09 ("Empty draft" during a held send; the row vanished early once another draft was opened) | same | Resolved: during the send the rows read [sent text, Q]; the sent row keeps its text, unselected, until it is finished | same, `D09.details.during` / `opened` |
| D06 recheck (`clearStarting` now resets `sentText`) | — | Still passes: the failed send returns the draft to its typed text with every field intact | same, `D06` |

- Canonical artifacts and sections updated: the execution coverage report (meta, ledger reconciliation, matrix, repository execution, scorecard, results); the ledger; the investigation meta
- Prior result and confidence: Fail, 91%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: N/A. Next: Delivery (`Not Required — direct low-risk route` test review).
- Remaining risks, blocked evidence, or untested scope:
  - The packaged Electron shell was not run; it is unchanged and the renderer is web-equivalent.
  - The probe needs a logged-in runtime CLI.
