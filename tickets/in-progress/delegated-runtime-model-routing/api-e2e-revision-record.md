# API/E2E Revision Record — autobyteus-32

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` (CRR-002 Pass), round 1 | SR-017, ARCH-REV-003, IR-002, CRR-002 | N/A | Fail / 81% |

## Revision Entries

### API-REV-001 — Baseline: routing E2E, peer contract, live router checks, Docker peer; confinement fails on Codex and Claude

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-002, round 1
- Triggering finding or case IDs: the review's API/E2E asks: live confinement (Codex, Claude), a ~45 s routed delegation per runtime, the Docker peer, the 303 live-agents fold, C-05, the user's desktop check
- Related revision IDs: SR-017, ARCH-REV-003, IR-002, CRR-002
- Why recorded: the first completed validation result
- Coverage decisions or durable test paths changed:
  - added `tests/e2e/model-routing/model-routing-delegation.e2e.test.ts` (MR-01…09);
  - the scripted router in `tests/fixtures/agy-failure-cli.mjs`;
  - RC-39…41, plus older RC expectations brought to the ticket's peer contract;
  - IA-01;
  - the 303 live-agents test folded (cherry-picked) with LR-3 added.
- Cases added, changed, removed, or rechecked: as above; API-14 and API-15 Not Tested (deferred to the fixed build)
- Commands, environment, fixture, or broader-validation delta: ENV-1…ENV-5 and ENV-B (base comparison) in the report

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/*`, `follow-ups.md` (FU-007…FU-009)
- Prior result and confidence: N/A
- Current result and confidence: Fail, 81%
- New or remaining failure IDs:
  - F-1: Codex router sandbox widened by a workspace `.codex/config.toml`.
  - F-2: the Claude router has the user's claude.ai connector tools and `Skill`.
  - F-3: a failed router turn leaves routing "busy" for 40 s per delegation, with the status shown as active.
- Recommended owner: implementation engineer, through the code reviewer's failure-origin review
- Remaining risks, blocked evidence, or untested scope:
  - API-14 (UI on real data) and API-15 (desktop check preparation).
  - Claude with a user-level Write allow rule (only the user can check).
