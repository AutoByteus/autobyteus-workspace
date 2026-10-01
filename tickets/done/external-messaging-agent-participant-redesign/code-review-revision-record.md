# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record is the concise chronological history.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001, commit `a1478259d`) | N/A | Fail — Local Fix → `/implementation_engineer` | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002 Local Fix, commit `e9bbb28ab`) | Fail — Local Fix | Pass → `/api_e2e_engineer` | CR-001 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 3 (API-REV-001 G-01, commit `e9bbb28ab`) | Pass | Fail — Local Fix → `/implementation_engineer` (implementation defect + earlier review gap) | CR-002 (new) |
| CRR-004 | `code-review-report.md` | Implementation Review, round 4 (IR-003 Local Fix, commit `40f769e0d`) | Fail — Local Fix | Pass → `/api_e2e_engineer` | CR-002 (resolved) |
| CRR-005 | `api-e2e-test-review-report.md` | Proportional API/E2E Test-Code Review, round 1 (API-REV-002 Pass, commit `40f769e0d`) | N/A (first test review) | Not Applicable → `/delivery_engineer` | None |

## Revision Entries

### CRR-001 — Initial implementation review of the messaging removal

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-001; DV-1 to DV-8 flagged for review)
- Relevant solution revision IDs: `SR-014`, `SR-016`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `N/A`
- Current authoritative result: `Fail` / `Local Fix`
- What changed in the review result and why: this is the initial baseline.
  - The messaging removal is complete and correct:
    - The behavior map is confirmed.
    - The REQ-120 gate and residue searches, re-run by the reviewer, are clean.
    - Server src tsc passes.
    - The changed server tests (18 files/153 tests) and web tests (10 files/120 tests) pass.
    - Gateway imports resolve.
    - Contract `dist/` is consistent.
    - The lockfile diff is removal-only.
  - The review fails on CR-001: 64 out-of-scope generated SDK `dist/` files were committed.
- Supported product scenario / material-premise basis changes: None. MP-001 to MP-003 are confirmed unchanged. DV-1 is confirmed as correct preservation of non-messaging behavior (C-02).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001
- Material score or classification changes: Cleanup Completeness 8.0; overall 9.4/10; `Local Fix`
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - A pre-existing Docker all-in-one build gap affects AC-117 proof.
  - Release workflow edits can't be exercised without a tag.
  - Non-blocking upstream note: the design removal-plan row and AE-06 misattribute `onAcceptedExternalUserMessage`.

### CRR-002 — CR-001 recheck after IR-002 (Pass)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-002), finding CR-001
- Relevant solution revision IDs: `SR-014`, `SR-016`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001`, `IR-002`
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Fail` / `Local Fix` (CRR-001)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - IR-002 untracked the two SDK `dist/` folders and amended `a1478259d` to `e9bbb28ab`.
  - `git diff a1478259d e9bbb28ab` changes only those 64 files (1701 deletions), so all round-1 source, test, gate and residue evidence remains valid for `e9bbb28ab`.
  - The added-file set is now exactly the 6 designed additions.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (CRR-001) | Resolved | IR-002; commit `e9bbb28ab` | `git diff --shortstat a1478259d HEAD` = 64 files, 1701 deletions, all under SDK `dist/`. `git ls-files` of both `dist/` folders = 0. The `^A` set = migration, its unit test, Prisma SQL, 3× `superseded.md`. |

- New or remaining finding IDs: None
- Material score or classification changes:
  - Separation of Concerns: 9.0 → 9.5
  - Cleanup Completeness: 8.0 → 9.0
  - Overall: 9.4 → 9.45
  - Classification: N/A (Pass)
- Recommended recipient: `/api_e2e_engineer` (primary); `/implementation_engineer` (informational)
- Remaining risks or uncertainty:
  - The pre-existing Docker all-in-one build gap affects AC-117 proof.
  - Release workflows can't be exercised without a tag.
  - Non-blocking DV-1 upstream artifact note.
  - The pre-existing `.gitignore` gap for the SDK `dist/` folders: delivery should confirm the final added-file set.

### CRR-003 — Failure-origin review of API/E2E G-01 (tracked messaging runtime-data file)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-001), failing scenario G-01
- Relevant solution revision IDs: `SR-014`, `SR-016`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001`, `IR-002`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Pass` (CRR-002)
- Current authoritative result: `Fail` (failure-origin confirmed) / `Local Fix` → `/implementation_engineer`
- What changed in the review result and why:
  - G-01 is confirmed. `autobyteus-server-ts/external-channel/gateway-callback-outbox.json` is tracked: accidental runtime data committed in `76bd9107d`, and the only path-level REQ-120 hit.
  - In the documented default dev layout (`README.md` L49; `AppConfig` data dir = package root), the approved cleanup migration deletes it. The G-01 probe shows ` D` in `git status`.
  - Origin: an implementation defect (missed removal item), plus an earlier review gap. The CRR-001/CRR-002 gates were content-only `git grep` with no tracked-path listing.
  - The test, fixture, environment and execution were all valid. No design or requirement change is needed.
- Supported product scenario / material-premise basis changes:
  - Added SCN-DEV (developer runs the server with the default data dir), a Supported Normal Scenario backed by README L49, `app-config.ts` L60 and the server `.gitignore`.
  - Added candidate C-10, promoted to CR-002.
  - MP-001 to MP-003 are unchanged.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-002) | Still Resolved | IR-002 | No SDK `dist/` files are tracked at `e9bbb28ab` |

- New or remaining finding IDs: CR-002 (new)
- Material score or classification changes:
  - Cleanup Completeness rationale: 9.0 → 8.5, because of the review gap and CR-002.
  - No full scorecard is repeated for a failure-origin round.
  - Classification: `Local Fix` (implementation-owned).
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - None new.
  - Non-blocking design-gate wording note: the identifier searches should explicitly include tracked file paths.
  - After the fix, the flow is a narrow source re-review (delta plus content and path gates), then API/E2E reruns R-09 and the G-01 probe.

### CRR-004 — CR-002 recheck after IR-003 (Pass)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 4 (narrow re-review after the implementation-owned fix)
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-003), finding CR-002 (API-REV-001 G-01)
- Relevant solution revision IDs: `SR-014`, `SR-016`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001`, `IR-002`, `IR-003`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `Fail` / `Local Fix` (CRR-003)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - `40f769e0d` amends `e9bbb28ab` with only `D autobyteus-server-ts/external-channel/gateway-callback-outbox.json`.
  - Reviewer-run gates on `40f769e0d`:
    - Content gate: the 4 allowed registry lines only.
    - Path gate (new; closes the CRR-003 review gap): empty.
    - Broader path scan: only unrelated MCP, application and LLM gateways.
  - The added-file set is unchanged (6 designed additions). All other round-1 and round-2 evidence remains valid.
- Supported product scenario / material-premise basis changes: None (SCN-DEV no longer produces a tracked-file deletion).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-002) | Still Resolved | IR-002 | No SDK `dist/` files tracked at `40f769e0d` |
| CR-002 | Open (CRR-003) | Resolved | IR-003; commit `40f769e0d` | `git diff --name-status e9bbb28ab 40f769e0d` = one `D` of the file. The path gate is empty, the folder is absent, and no ignore entry was added. |

- New or remaining finding IDs: None
- Material score or classification changes:
  - Cleanup Completeness: 8.5 → 9.0
  - Overall: 9.45/10
  - Classification: N/A (Pass)
- Recommended recipient: `/api_e2e_engineer` (primary; rerun the R-09 gates and the G-01 probe); `/implementation_engineer` (informational)
- Remaining risks or uncertainty:
  - None new.
  - Carried non-blocking notes:
    - the pre-existing Docker all-in-one contract-copy gap
    - release workflows can't run without a tag
    - the DV-1 design-artifact misattribution
    - the design gate should mention tracked paths
    - the SDK `dist/` `.gitignore` gap

### CRR-005 — Proportional test-code review after API-REV-002 (Not Applicable)

- Canonical review report updated: `api-e2e-test-review-report.md` (created)
- Review entry point and round: Proportional API/E2E Test-Code Review, round 1
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-002 Pass; G-01 resolved)
- Relevant solution revision IDs: `SR-014`, `SR-016`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001`, `IR-002`, `IR-003`
- Relevant API/E2E revision IDs: `API-REV-001`, `API-REV-002`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `N/A` for test review (the source review stands at `Pass`, CRR-004)
- Current authoritative result: `Not Applicable`
- What changed in the review result and why:
  - API/E2E added, updated or removed no durable test in either round.
  - I verified that HEAD is still `40f769e0d` with no tracked modification and no untracked test file outside the ticket folder.
  - The revision record and execution report agree.
  - The one-time probes match the design's REQ-120 Verification Gate.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-002) | Still Resolved | IR-002 | Unchanged commit `40f769e0d` |
| CR-002 | Resolved (CRR-004) | Still Resolved | IR-003; API-REV-002 | The G-01 round-2 probe shows binding root SKIPPED and no tracked change |

- New or remaining finding IDs: None
- Material score or classification changes: None (source review scorecard unchanged at 9.45/10)
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty (carried to delivery, non-blocking):
  - R-3 release notes
  - the published release-note wording
  - the Docker all-in-one contract-copy gap
  - the token-usage e2e order dependence
  - the SDK `dist/` `.gitignore` gap
  - DV-1 and gate-wording notes in the design artifacts
