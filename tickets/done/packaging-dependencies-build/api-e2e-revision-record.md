# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative; this file records the baseline or delta of each round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 (Pass), round 1 | SR-001; ARCH-REV-001; IR-001; CRR-001 | N/A | Pass / 94.2% |

## Revision Entries

### API-REV-001 — Build-only release run, override rebuild, mutations and the AC-002 measurement, baseline

- Triggering role, report path, and round: Code reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/packaging-dependencies-build/tickets/in-progress/packaging-dependencies-build/code-review-report.md`, round 1
- Triggering finding or case IDs: none (the review passed; it listed what needed the branch pushed)
- Related revision IDs: SR-001, ARCH-REV-001, IR-001, CRR-001; delivery `N/A`
- Why recorded: first validation of the approved design on the reviewed `Medium` + `High` route
- Coverage decisions or durable test paths changed: none (existing durable checks judged Still Valid and mutation-checked)
- Cases added, changed, removed, or rechecked: API-01…API-06 run, API-07 Not Tested (Docker release workflow), IMP-01…IMP-09 reused
- Commands, environment, fixture, or broader-validation delta: the branch pushed to `origin`; `release-desktop.yml` dispatched build-only (run 41282003912) on five real targets; clean-clone rebuild of an older commit with `AUTOBYTEUS_NPM_BEFORE`; an independent size measurement; mutation checks on copies

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`; `follow-ups.md` (FU-006, FU-007)
- Prior result and confidence: N/A
- Current result and confidence: Pass / 94.2% (post-repository 89.5%)
- New or remaining failure IDs: none
- Recommended owner: Code reviewer (no durable test change to review), then Delivery; the Solution Designer may restate AC-002's percentage (18.5% before `prisma generate`, 15.5% after)
- Remaining risks, blocked evidence, or untested scope: Docker release workflow on a runner (FU-007); packaged-server startup on macOS and Windows runners (FU-006); transitive packages of the override rebuild not registry-checked
