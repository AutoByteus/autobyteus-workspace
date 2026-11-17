# API/E2E Revision Record

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001: Baseline. Real build-only runs (default and zh), rerun probe, nothing published

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-001, Pass, no findings), round 1
- Triggering finding or case IDs: N/A (first validation). Design Change Sequence step 6; code review's list of what only this run can prove (U-001, AC-001, AC-002, AC-006, arm64 disk guard)
- Related revision IDs: SR-003, ARCH-REV-002, IR-001, CRR-001
- Why this baseline was recorded: first completed API/E2E validation of the per-architecture Server Docker workflow
- Coverage decisions or durable test paths changed: none. IMP-01..03 reused (only `tickets/` changed since `1b113a8313`). No repository test added, updated or removed
- Cases added, changed, removed, or rechecked: added API-01..API-10. API-10 (rerun of a failed leg) was added during the round, and the investigation was updated before it ran
- Commands, environment, fixture, or broader-validation delta: build-only runs 44148955212 (default) and 44149091734 (zh) from `codex/server-docker-build-speed` at `31dfe3dad0`; rerun probe 44152041214 on the deleted throwaway branch `codex/api520-rerun-probe` (`384fe90756`); local Buildx `--dry-run` probe; Docker Hub and release snapshots before and after

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all), execution coverage report (all), test progress log, evidence `API-01`..`API-10`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95% (post-repository 57%)
- New or remaining failure IDs: none
- Recommended owner: per `get_handoff_rules` (reviewed route: code reviewer)
- Remaining risks, blocked evidence, or untested scope: AC-003's publish-only part (tags, pushed version-tag index check, `Move beta tag` with the `tree:0` checkout, upload) is first exercised at the next release (user-only: a release). OBS-1: the depth-1 build checkout is about 1.5 min slower than a full fetch (non-blocking). beta.9 attempt 2 (old workflow) had not finished when the timing table was written
