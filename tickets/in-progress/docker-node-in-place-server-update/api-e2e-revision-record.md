# API/E2E Revision Record — autobyteus-305

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` (CRR-001 Pass), round 1 | SR-005, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Build step 1 (signed server package) baseline validation

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, CRR-001 Pass; API/E2E round 1.
- Triggering finding or case IDs: none (first validation). Hints from the implementation handoff's "Downstream Coverage Hints".
- Related revision IDs: SR-005, ARCH-REV-002, IR-001, CRR-001.
- Why this baseline was recorded: first completed API/E2E result for build step 1.
- Coverage decisions or durable test paths changed: `prisma-engine-discovery.docker.mjs` moved from `Still Valid` to `Needs Update` after its round-1 run. Stage API003's pre-fix-baseline precondition is bound to the `/app` layout. The probe was updated in commit `4c356d69b7`.
- Cases added, changed, removed, or rechecked: API-01..API-05 reused (IMP-01..IMP-11). API-10 ran twice: Fail on `30aaef9284` (test precondition), Pass on `4c356d69b7`. API-11, API-12 (phases A and B), API-13, API-14 and API-15 Pass. API-16 (GitHub release) not run: user-only.
- Commands, environment, fixture, or broader-validation delta: the launcher journey ran on a test-owned `docker:dind` daemon with a registry inside it, because `upgrade --all` reaches every launcher-labelled container, including the user's nodes. The PowerShell parse ran in `mcr.microsoft.com/dotnet/sdk:8.0` (arm64).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-10 round 1, stage API003 `'bundled' !== 'cache'` (same round) | Cause in the test: a layout-bound precondition (`evidence/API-10-cause.log`), not a product defect | Probe updated, `4c356d69b7` | API-10 round 2 |

- Canonical artifacts and sections updated: all four API/E2E artifacts created.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: code reviewer (test-code review of `4c356d69b7`)
- Remaining risks, blocked evidence, or untested scope: the GitHub part of AC-011 is proven only by the first release, which needs the user's request.
