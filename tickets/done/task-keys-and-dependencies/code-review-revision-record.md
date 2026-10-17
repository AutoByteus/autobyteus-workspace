# Code Review Revision Record — task-keys-and-dependencies

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record keeps the chronological history.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-002 from `/software_engineering_team/implementation_engineer`) | N/A | Fail — `Local Fix` | CR-001, CR-002 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2, targeted delta (IR-003 Local Fix) | Fail — `Local Fix` | Pass | CR-001, CR-002 (resolved) |
| CRR-003 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review, round 1 (API-REV-001 Pass) | Pass (CRR-002, source review) | Pass | None |
| CRR-004 | `code-review-report.md` | Implementation Review, round 3, targeted delta (IR-004, delivery re-entry DR-001) | Pass (CRR-002) | Pass | None |
| CRR-005 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review, round 2 (API-REV-002 Pass, integrated state) | Pass (CRR-003) | Pass | None |

## Revision Entries

### CRR-001 — Initial full review of IR-002 (SR-001 + SR-002 + SR-003)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-002)
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Relevant architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-001`, `IR-002`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: N/A
- Current authoritative result: `Fail` (Local Fix), score 9.3 / 10
- What changed in the review result and why: initial baseline. Behavior basis confirmed for BEH-001–BEH-011. Two bounded findings:
  - CR-001: tool `update_task depends_on` stores duplicates (REQ-007 / REQ-020), confirmed by a temporary probe that was then deleted;
  - CR-002: stale "the key is display only" wording in the server module doc and the web type comment.
- Supported product scenario / material-premise basis changes: none. MP-001–MP-004 confirmed. CAND-003–CAND-007 rejected (unsupported timing, not reachable, or matching the approved design / spec / writer policy).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002
- Material score or classification changes: N/A (baseline); Runtime Correctness 8.5
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: the picker's Enter-while-closed behavior matches the approved prototype (residual, not a finding); the Task service is at 499 effective lines; `generated/graphql.ts` regeneration follow-up.

### CRR-002 — Targeted delta review of the IR-003 Local Fix

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. IR-003 touches only `task-dependency-writes.ts` (`idsOf`), one test case, the server module doc "Key" bullet and the web `taskKey` comment. The changed-file set is unchanged and no spine, interface or data shape changed.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-003); CR-001, CR-002
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Relevant architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-003`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `CRR-001` Fail (Local Fix)
- Current authoritative result: `Pass`, 9.4 / 10
- What changed in the review result and why: both findings resolved and verified in code. The reviewer reran `tests/unit/agent-tools/project-tasks` plus the two Project dependency test files (136 tests pass) and the server typecheck (passes).
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-003 | `task-dependency-writes.ts:36` returns `normalizeDependsOn(ids)`; new test "collapses repeated references to one Task…" checks one stored ID and one `dependsOn` key on create and update; tests pass in the reviewer's rerun |
| CR-002 | Open (Local Fix, minor) | Resolved | IR-003 | `docs/modules/projects.md:148-152` and `autobyteus-web/types/project.ts` `taskKey` comment reworded: stored identity vs. agent-facing / URL ID |

- New or remaining finding IDs: none
- Material score or classification changes: Runtime Correctness 8.5 → 9.2; Naming 9.0 → 9.1; API/E2E Readiness 9.0 → 9.2; overall 9.3 → 9.4; decision Fail → Pass
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: unchanged from CRR-001 (picker Enter-while-closed matches the prototype; Task service at 499 lines; `generated/graphql.ts` regeneration follow-up; server and web ship together).

### CRR-003 — Proportional review of API/E2E durable test changes

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/api-e2e-test-review-report.md`
- Review entry point and round: successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-001); TKD-API-001, TKD-AGY-001, PT-E2E-017 plus the updated cases
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Relevant architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-003`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: CRR-002 Pass (source review)
- Current authoritative result: `Pass` (test review)
- What changed in the review result and why: 7 durable test files reviewed (2 added server cases, 1 added browser case, updated assertions in 4 files). They are requirement-aligned, enter through real triggers, and updated expectations follow the approved behavior without weakening any check.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: OBS-001–004 (execution report); FU-API-001–003 out of scope.

### CRR-004 — Targeted delta review of IR-004 (integration with `origin/personal@66429d6f31`)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/code-review-report.md`
- Review entry point and round: Implementation Review, round 3 (delivery re-entry)
- Review scope: `Targeted Delta Review`. The ticket's source file set and per-file line delta are identical after both merges; only web `docs/projects.md` changed (delivery docs sync). The conflict resolution, auto-merged docs and three baseline test commits were checked individually.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-004); `delivery-revision-record.md` DR-001
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Relevant architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-004`
- Relevant API/E2E revision IDs: `API-REV-001` (prior state; revalidation required)
- Relevant delivery revision IDs: `DR-001`
- Prior authoritative result: CRR-002 Pass (source); CRR-003 Pass (tests)
- Current authoritative result: `Pass`, 9.4 / 10
- What changed in the review result and why: the integration preserves the reviewed delta and adds the base's Project tools beside it. Three baseline test fixes are sound. The reviewer reran the server typecheck, agent-tools + projects unit tests (60 files / 554) and the architecture tests (44).
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None (no open findings).

- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: team-run-v1 upgrade e2e 3/4 and task-copy-idle-lifetime are reported with causes outside this ticket (delivery owns their disposition); previous residuals unchanged.

### CRR-005 — Proportional test review of the integrated state (API-REV-002)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/api-e2e-test-review-report.md`
- Review entry point and round: successful API/E2E test-code review, round 2
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-002)
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Relevant architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-004`
- Relevant API/E2E revision IDs: `API-REV-002`
- Relevant delivery revision IDs: `DR-001`
- Prior authoritative result: CRR-003 Pass (test review)
- Current authoritative result: `Pass`
- What changed in the review result and why: no new API/E2E durable tests; the three IR-004 baseline test fixes (`fa49138794`, `9eeb58fb9d`, `361eea070d`) are sound and do not weaken their checks. The ledger check was proven by API/E2E with a temporary, reverted edit, because the file's remaining 3/4 failures, caused by another migration, stop the run before it.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: team-run-v1 upgrade e2e 3/4 (flat-team-families migration owner); FU-API-004 (PMU-021 socket error on reload) and FU-API-005 (task-copy-idle-lifetime timing), both with causes outside this ticket.
