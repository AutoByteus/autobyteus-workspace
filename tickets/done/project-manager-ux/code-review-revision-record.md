# Code Review Revision Record — `project-manager-ux`

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review / IR-001 from `/implementation_engineer` | N/A | Pass | CR-001 (non-blocking) |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 Fail (F-001 RELEASE-BUILD) from `/api_e2e_engineer` | Pass | Fail — Local Fix | CR-002 (new, blocking); CR-001 (open) |
| CRR-003 | `code-review-report.md` | Implementation Review (Targeted Delta) / IR-002 Local Fix from `/implementation_engineer` | Fail — Local Fix | Pass | CR-002 resolved; CR-001 resolved |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-002 Pass from `/api_e2e_engineer` | Pass (CRR-003, source) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review: live Projects pages, Task roots, Temp tasks, F-006 (IR-001)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`; `implementation-handoff.md`; SCN-002..006, A-1
- Relevant solution revision IDs: `SR-003`, `SR-005`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001` (commit `4d469b0c5`)
- Relevant API/E2E revision IDs: `N/A`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: `N/A`
- Current authoritative result: `Pass`, 9.4/10
- What changed in the review result and why: initial baseline.
  - BEH-001..006 confirmed; AR-001, AR-002 and AR-003 implemented as specified.
  - A-1, the row restructure and the post-admission status forwarding were checked and accepted.
  - Reviewer reran the focused suites: server 191/191, web 115/115.
- Supported product scenario / material-premise basis changes:
  - A-1 recorded as a supported scenario; P-001..P-005 confirmed.
  - Candidates C-001..C-006 and C-008 rejected; C-007 promoted as non-blocking CR-001.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001 (non-blocking, Low: displaced `forget()` doc comment)
- Material score or classification changes: N/A (baseline)
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - Publication volume is a watch item.
  - Org selection edge cases are not exercised.
  - AC-012/013 breadth, real-provider status transitions, `/ws/projects` auth, and multi-window or node switching are left for API/E2E.

### CRR-002 — Failure origin of F-001: the release build is blocked by the localization literal audit

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/code-review-report.md` (section "API/E2E Failure-Origin Review (Round 2)", CR-002, Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`; `api-e2e-execution-coverage-report.md`; F-001 / RELEASE-BUILD; O-1 (observation)
- Relevant solution revision IDs: `SR-003`, `SR-005`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001` (commit `4d469b0c5`)
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: CRR-001 `Pass`
- Current authoritative result: `Fail`, classified `Local Fix` → `/implementation_engineer`
- What changed in the review result and why:
  - I reproduced the failure: the audit exits 1 with M-015 for runtime-built keys in `ProjectTaskWorkers.vue:37` and `TempTaskBoard.vue:37`. Both files are new in `4d469b0c5`.
  - The governing contract is `autobyteus-web/docs/localization.md` › "Required Validation"; the audit is wired into every `build:electron*` script.
  - Origin: an implementation defect. The round-1 review missed it although it was reasonably detectable: the mandatory localization checks were neither run nor required.
  - The round-1 API/E2E Readiness rationale is corrected.
- Supported product scenario / material-premise basis changes:
  - Added the desktop release scenario plus the localization contract.
  - O-1 (an intermittent PMU-002 click) is `Hold for Evidence`; it is not attributed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (non-blocking) | Still open; fix in the same pass | IR-001 | `task-agent-resource-service.ts:151-152` unchanged |

- New or remaining finding IDs: CR-002 (blocking, new); CR-001 (non-blocking, open)
- Material score or classification changes: the API/E2E Readiness rationale drops below 9.0 until CR-002 is fixed; route changes to `Local Fix`
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - O-1 is unexplained (1 in 15 runs).
  - The desktop real-product journey is still blocked until the build passes.

### CRR-003 — Delta review of IR-002: literal localization keys and the doc comment restored

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/code-review-report.md` (section "Implementation Review (Round 3)", Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review`. The change stays within CR-002 and CR-001's files and behavior: `taskRootPresentation.ts`, `ProjectTaskWorkers.vue`, `TempTaskBoard.vue`, one spec, and a comment move.
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`; `implementation-handoff.md` (IR-002 section); CR-002, CR-001
- Relevant solution revision IDs: `SR-003`, `SR-005`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-002` (commit `8ef467696`)
- Relevant API/E2E revision IDs: `API-REV-001` (triggered the fix)
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: CRR-002 `Fail` (Local Fix)
- Current authoritative result: `Pass`, 9.4/10
- What changed in the review result and why: both findings are resolved, and I verified them myself:
  - `guard:localization-boundary` passes;
  - `audit:localization-literals` reports zero unresolved findings;
  - no runtime-built ``t(`…`)`` keys remain in any changed web source;
  - the key maps are typed by the state, kind and lane unions;
  - the catalog-presence spec covers en and zh-CN;
  - the specs pass 85/85.
- Supported product scenario / material-premise basis changes: None. O-1 is still held for evidence.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-002 | Open (blocking) | Resolved | IR-002, API-REV-001 F-001 | Audit exit 0 with zero findings; guard passes; key scan clean; specs 85/85 |
| CR-001 | Open (non-blocking) | Resolved | IR-002 | `forget()` doc comment directly above `forget()` |

- New or remaining finding IDs: None
- Material score or classification changes:
  - API/E2E Readiness is back to 9.3; Naming is 9.3 and Cleanup is 9.4.
  - The route returns to API/E2E.
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - `build:electron:mac` was not rerun in review; the F-001 recheck belongs to API/E2E.
  - O-1 is unexplained.
  - The residual risks from round 1 still apply.

### CRR-004 — Proportional review of the API/E2E durable test changes (API-REV-002)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`; `api-e2e-execution-coverage-report.md` (Pass, 96%); SCN-002..006, F-001 (resolved), O-1 (explained)
- Relevant solution revision IDs: `SR-003`, `SR-005`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-002` (commit `8ef467696`)
- Relevant API/E2E revision IDs: `API-REV-001`, `API-REV-002`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: CRR-003 `Pass` (source review; `code-review-report.md` stays authoritative for source)
- Current authoritative result: `Pass`
- What changed in the review result and why: first proportional test review. I reviewed:
  - the new `project-change-feed.e2e.test.ts`;
  - the probe additions (PMU-008..012, browser-error assertions, failure capture, warm-up);
  - the `package.json` script;
  - the `TESTING.md` section.

  Real triggers are used throughout, and the assertions are requirement-level. The warm-up is a justified harness measure (forced-cold 12/12; the packaged app is clean) and does not hide product behavior.
- Supported product scenario / material-premise basis changes: O-1 is reclassified from `Hold for Evidence` to a resolved harness effect. Evidence: reloads recorded in the cold-cache runs only; the forced-cold rerun with the warm-up passes; the packaged desktop journey is clean.

#### Prior Finding Resolution

None (no prior test-review findings; source findings CR-001/CR-002 were resolved in CRR-003).

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - Minor test-code notes: an overstated comment, two unused locals, and an unasserted Org row selection in PMU-012.
  - API/E2E residual risks are carried forward: real-provider `error` status; AC-004 in the desktop journey; the Server Settings toggle (outside scope).
