# Code Review Revision Record — `active-run-skill-update-notice`

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review / IR-001 implementation complete | N/A | Fail (Local Fix) | CR-001, CR-002, CR-003, CR-004 |
| CRR-002 | `code-review-report.md` | Implementation Review round 2 / IR-002 local fixes | Fail (Local Fix) | Pass | CR-001…CR-004 resolved |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 APE-001 | Pass | Fail (Local Fix: implementation defect) | CR-005 (new) |
| CRR-004 | `code-review-report.md` | Implementation Review round 4 / IR-003 (CR-005) | Fail (Local Fix) | Pass | CR-005 resolved |
| CRR-005 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-002 Pass | Pass (CRR-004) | Pass | None |

## Revision Entries

### CRR-001 — Initial source review: sound mechanism; first-input wait and definition-based re-resolution

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-001…SR-004
- Relevant architecture-review revision IDs: ARCH-REV-001…ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, Local Fix
- What changed in the review result and why:
  - Baseline established.
  - The preface port, forwarded-only settlement, busy versus idle delivery, restore diff, native history (N-1) and web label are correct.
  - Reruns: autobyteus-ts 5/5; server 8 files / 75 tests; typecheck clean.
  - CR-001: new runs' first input waits for full skill hashing (DESIGN.md Rule 3).
  - CR-002: re-resolution reads the current agent definition, so a definition edit or delete leads to false "no longer available" notices and missed updates (REQ-009, DEC-011).
  - CR-003: `memory-manager.ts` is 512 effective lines (over the 500 limit).
  - CR-004: an unreachable preface settlement in uncertain reconciliation.
- Supported product scenario / material-premise basis changes: new premise CR-P-01 (Reachable, Supported Normal). C-05…C-07 rejected (accepted risks; application scope recorded as a follow-up note).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001 (Medium), CR-002 (Medium), CR-003 (Low), CR-004 (Low).
- Material score or classification changes: baseline 9.1/10. Runtime Correctness 8.3, API/E2E Readiness 8.8 and Cleanup 8.8 are below the bar. Large / High confirmed.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - application execution scope runs are not tracked (follow-up for the Solution Designer);
  - `ALL_INSTALLED` cost measured on a synthetic set only;
  - AC-010, ACP/Grok live and multi-member live cases are left to API/E2E.

### CRR-002 — IR-002 resolves CR-001…CR-004; Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/code-review-report.md` (§ Round 2; findings marked resolved; scorecard; Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review` (the delta stays within the files and behavior of CR-001…CR-004; the ports and spines are unchanged)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` § CRR-001 Resolution / `implementation-revision-record.md` IR-002 (`d32e55270`, `4bd93a32f`); CR-001…CR-004
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-001, Local Fix)
- Current authoritative result: `Pass`
- What changed in the review result and why: all four findings were verified as resolved in code, and their tests exist. Reruns: autobyteus-ts 5/5; server 7 files / 74 tests; typecheck clean. New non-blocking note R-1: a test-only `tracker` field on `SkillUpdateNotices`.
- Supported product scenario / material-premise basis changes: CR-P-01 resolved.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Medium) | Resolved | IR-002 | `restoring` set keyed by run; `takePreface` waits only for restores; integration tests for the new-run first input not delayed and the restored first input carrying the notice |
| CR-002 | Open (Medium) | Resolved | IR-002 | `RunSkillSource` bound at tracking; `refreshSkillDirs` uses it with the current catalog; integration test covers definition edit and delete |
| CR-003 | Open (Low) | Resolved | IR-002 | `memory-manager.ts` 495 effective lines; public `appendRawTrace` used |
| CR-004 | Open (Low) | Resolved | IR-002 | Dead settlement and comment removed |

- New or remaining finding IDs: none open. Non-blocking: R-1; C-06 follow-up for the designer.
- Material score or classification changes: 9.1 → 9.3; Runtime Correctness 8.3 → 9.2; API/E2E Readiness 8.8 → 9.2; Cleanup 8.8 → 9.2. Large / High unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (primary); `/software_engineering_team/implementation_engineer` (informational)
- Remaining risks or uncertainty:
  - AC-010 desktop journey;
  - ACP/Grok live;
  - a live multi-member or delegated-restore case;
  - the `ALL_INSTALLED` cost on a realistic set;
  - application execution scopes not tracked (follow-up).

### CRR-003 — APE-001 failure origin: skill folder watch handles not released (implementation defect)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/code-review-report.md` (§ API/E2E Failure-Origin Review (Round 3); CR-005; Classification; Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-001); APE-001; QR-002, REQ-012, AC-008, DS-001
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-002)
- Current authoritative result: `Fail`, origin implementation defect (Local Fix)
- What changed in the review result and why:
  - The reviewer reproduced the probe: 31 handles are still open after `syncWatchedFolders([])` and released only on `close()`.
  - Root cause: chokidar 4 `unwatch(dir)` closes only that path's closers and ignores descendants (`index.js:365–389, 746–760`).
  - Re-add restores events (`_removeIgnoredPath`), so the defect is only the missing release.
  - Limited review gap: OS-level release evidence was not required in rounds 1–2.
- Supported product scenario / material-premise basis changes: none (run end is a Supported Normal Scenario).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001…CR-004 | Resolved (CRR-002) | Resolved (unchanged) | IR-002 | API/E2E passed the related scenarios (new-run first input, definition-bound re-resolution, history, restore) |

- New or remaining finding IDs: CR-005 (Medium, open). R-1 and C-06 remain non-blocking notes.
- Material score or classification changes: round-2 Pass superseded; Runtime Correctness rationale invalidated by CR-005. Large / High unchanged.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: API/E2E must rerun APE-001 after the fix (probe plus desktop handle samples). The test commit `c9e100778` waits for proportional review.

### CRR-004 — IR-003 resolves CR-005 (per-folder watches); Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/code-review-report.md` (§ Round 4; CR-005 resolved; scorecard; Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 4
- Review scope: `Targeted Delta Review` (only the watcher and its tests changed)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` § CRR-003 Resolution / `implementation-revision-record.md` IR-003 (`53074d2ac`, `f181b9b13`); CR-005
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001 (rerun pending)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-003, Local Fix)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - Per-folder chokidar watches are closed when a folder leaves the watch set, so its handles are released with no gap for folders in use.
  - Reruns: 4 files / 33 tests, including the real-chokidar descriptor-release test on macOS; typecheck clean.
  - The implementer's probe on the fixed build shows 31 → 0.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-005 | Open (Medium) | Resolved | IR-003 | `skill-folder-watcher.ts` per-folder watches plus `closeWatch`; unit (fake and real chokidar with descriptor counts) and integration (AC-008/R-5 closed watches) pass; probe 31 → 0 |
| CR-001…CR-004 | Resolved | Resolved (unchanged) | IR-002 | No change in round 4 |

- New or remaining finding IDs: none open. Non-blocking R-1 and C-06 remain.
- Material score or classification changes: round-2 scores restored (9.3); Runtime Correctness 9.2. Large / High unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (primary); `/software_engineering_team/implementation_engineer` (informational)
- Remaining risks or uncertainty:
  - desktop handle samples and Linux inotify release are to be re-measured by API/E2E;
  - test-code review is pending after a passing run.

### CRR-005 — Proportional test-code review after API-REV-002; Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-002 Pass); API/E2E commit `c9e100778` plus the IR-001…IR-003 durable test changes
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001, IR-002, IR-003
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-004 implementation review)
- Current authoritative result: `Pass` (test review)
- What changed in the review result and why: all changed durable tests are coherent, ID-named and requirement-aligned. They use real triggers and isolate config folders. The scripted fixture routes are additive and read-only. No findings.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (no prior test-review findings). CR-001…CR-005 remain resolved; API/E2E verified APE-001 on macOS, Linux and desktop.

- New or remaining finding IDs: None. Non-blocking: R-1, C-06.
- Material score or classification changes: N/A. Large / High unchanged.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - Linux is proven by a container probe only;
  - application execution scopes are not tracked (C-06, follow-up);
  - R-1 optional cleanup.
