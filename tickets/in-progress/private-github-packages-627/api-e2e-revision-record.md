# API/E2E Revision Record — private-github-packages-627 (autobyteus-627)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | IR-001, CRR-001 | N/A | Pass / 95% |
| API-REV-002 | Implementation engineer, IR-002 (SR-003, direct Small/Low), round 2 | SR-003, IR-002 | Pass / 95% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: private repositories on the built server and a Docker node, against real GitHub

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001 Pass), round 1; code `30fcc50ec7`.
- Triggering finding or case IDs: none (baseline); API-00 … API-10.
- Why recorded: the first completed API/E2E result.
- Coverage decisions or durable test paths changed (commit `35a2f84fbf`):
  - BS-L1 (live) and BS-E1 (emulated) in `github-private-repository-built-server.e2e.test.ts`;
  - BS-D1 in `github-private-repository-docker-node.e2e.test.ts`;
  - the emulation fixture now serves every published commit.
- Cases: API-01 … API-10 run; the implementation's unit, integration, web, guard and typecheck results reused.
- Commands, environment, fixture, or broader-validation delta: the test vault; built servers on test-owned roots; a test-owned Docker container from the user's image with this worktree's server package.

#### Prior Failure Resolution

None.

- Canonical artifacts: the coverage investigation, the execution report, `api-e2e-test-progress.md`, `evidence/API/`.
- Prior result and confidence: N/A. Current: Pass, 95%.
- New or remaining failure IDs: none.
- Recommended owner: code reviewer (test-code review), then delivery.
- Remaining risks: codeload's header support is undocumented (caught by the live cases while a token is valid); the live cases need a renewed `test.github.token` after 2026-11-25; no package-shaped private repository on real GitHub (emulated for the install).

### API-REV-002 — SR-003: the Update checks card says where the GitHub token goes (AC-008)

- Triggering role, report path, and round: implementation engineer, IR-002 (`12651e48f7`), direct Small/Low route; round 2.
- Triggering finding or case IDs: SR-003 / REQ-008 / AC-008.
- Coverage decisions or durable test paths changed: none by API/E2E. The implementation's `UpdateChecksCard.spec.ts` asserts the approved English text.
- Cases added: API-11 (text against AC-008, both catalogues; settings specs; localization guards; both typechecks). Round 1's cases still stand.

#### Prior Failure Resolution

None.

- Prior result and confidence: Pass / 95%. Current: Pass / 95%.
- Recommended owner: delivery (direct route; test-code review not required).
- Remaining risks: as API-REV-001.
