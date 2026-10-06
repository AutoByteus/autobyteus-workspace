# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md`, round 1 | SR-001, ARCH-REV-001, IR-001, CRR-001 | N/A | Fail / 90% |
| API-REV-002 | `/code_reviewer`, `code-review-report.md` (CRR-003), round 2 | SR-002, ARCH-REV-002, IR-002, CRR-003 | Fail / 90% | Pass / 96% |

## Revision Entries

### API-REV-001: Baseline validation; server fix proven, Team-member UI hydration gap found

- Triggering role, report path, and round: `/code_reviewer`, `tickets/in-progress/run-file-change-live-projection-ownership/code-review-report.md`, round 1
- Triggering finding or case IDs: CRR-001 Pass; AC-006 and ASM-001 left for API/E2E
- Related revision IDs: SR-001, ARCH-REV-001, IR-001, CRR-001
- Why this baseline was recorded: first API/E2E validation of the reviewed package
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts` (E-001..E-004)
  - Updated `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (multi-image gated `image_done` mode)
  - Updated `autobyteus-server-ts/tests/integration/api/run-file-changes-api.integration.test.ts` (I-001: 409 → 200)
- Cases added, changed, removed, or rechecked: R-001, R-002, E-001..E-006, I-001, B-001..B-004 (new)
- Commands, environment, fixture, or broader-validation delta: fake AGY CLI real-server E2E; base-source mutation check; browser on a test-owned built backend + Nuxt stack (`api-e2e-evidence/browser/launch.mjs`)

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `api-e2e-coverage-investigation.md` (all)
  - `api-e2e-execution-coverage-report.md` (all)
  - `api-e2e-test-case-ledger.md` (all)
  - `api-e2e-evidence/`
- Prior result and confidence: N/A
- Current result and confidence: Fail / 90%
- New or remaining failure IDs: B-003, B-004 (Team-member Artifacts empty after reload and for historical Team runs; server returns every entry)
- Recommended owner: Solution Designer (`Requirement Gap`: ASM-001 disproven), via code-review failure-origin review
- Remaining risks, blocked evidence, or untested scope:
  - The pre-existing integration failure "hydrates historical AutoByteus team-member file changes" is probably a stale fixture (E-004 passes on the real path).
  - Real `agy` and model not exercised.
  - RSK-001 wording.

### API-REV-002: Re-validation against SR-002; Pass

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-003, targeted delta), round 2
- Triggering finding or case IDs: B-003, B-004 (round-1 failures); SR-002 amended AC-003, AC-004 and ASM-001
- Related revision IDs: SR-002, ARCH-REV-002, IR-002, CRR-003
- Why recorded: the user chose Option 2 (split). Team-member UI reload/history hydration is now the follow-up ticket.
- Coverage decisions or durable test paths changed: none since API-REV-001 (same three uncommitted paths)
- Cases added, changed, removed, or rechecked:
  - Rechecked: E-001..E-004, R-001 on HEAD `20258294c`
  - Added: B-005 (standalone UI history: stop through the UI, fresh load, reopen; 3/3 listed and previewed)
  - B-003/B-004 reclassified as Out Of Scope
- Commands, environment, fixture, or broader-validation delta: `launch.mjs historical` stack (owned; cleaned)

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| B-003 (Team-member Artifacts empty after reload) | Requirement Gap (ASM-001) | Out of scope by SR-002 (user decision, Option 2); follow-up ticket | requirements-doc § Revision SR-002; `browser/12-team-after-reload.png` |
| B-004 (Team-member Artifacts empty for historical Team) | Requirement Gap (ASM-001) | Same | `browser/13-team-historical-member-empty.png` |

- Canonical artifacts and sections updated:
  - `api-e2e-execution-coverage-report.md` (meta, ledger reconciliation, matrix, scorecard, journey, result)
  - `api-e2e-coverage-investigation.md` (meta, Round 2 Delta)
  - `api-e2e-test-case-ledger.md` (events 15–18)
- Prior result and confidence: Fail / 90%
- Current result and confidence: Pass / 96%
- New or remaining failure IDs: none in scope
- Recommended owner: `/code_reviewer` for proportional test-code review
- Remaining risks, blocked evidence, or untested scope:
  - Team-member UI hydration (follow-up ticket)
  - the stale-seed integration case (pre-existing)
  - real `agy` and model not exercised
  - RSK-001
