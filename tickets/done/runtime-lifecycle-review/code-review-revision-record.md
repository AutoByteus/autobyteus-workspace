# Code Review Revision Record — runtime-lifecycle-review

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record indexes each completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 | N/A | Fail | CR-001, CR-002, CR-003 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (targeted delta) / IR-002, SR-012 | Fail | Pass | CR-001, CR-002, CR-003 (all resolved) |
| CRR-003 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-001 Pass | Pass (CRR-002) | Pass | None (FU-007 follow-up) |

## Revision Entries

### CRR-001 — Initial implementation review of IR-001

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-010, SR-011
- Relevant architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail
- What changed in the review result and why: baseline. Structure, ownership, boundaries, legacy removal and sizes pass. A read-only probe showed Claude 2.1.302 `auth status --json` exits 1 when signed out, so the Claude row shows "Sign-in unknown" instead of AC-009's "Not signed in" + hint (CR-001). An unreachable fail-open catch remains around the running-agent count (CR-002). The table/stacked switch deviates from the approved spec's 640 px rule and needs the requirements owner's record (CR-003).
- Supported product scenario / material-premise basis changes: new premise CR-P1 (Claude signed-out exit code), Supported Normal, Reachable.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001 (Local Fix), CR-002 (Local Fix), CR-003 (Requirement Gap, confirmation only)
- Material score or classification changes: Runtime Correctness 8.0, API/E2E Readiness 8.5, Cleanup 8.8; classification Large/High confirmed
- Recommended recipient: `/software_engineering_team/implementation_engineer` (CR-001, CR-002); `/software_engineering_team/solution_designer` (CR-003)
- Remaining risks or uncertainty: `codex login` browser opening and Grok signed-in output unverified until delivery; AR-008 live Application team count left to API/E2E.

### CRR-002 — Targeted delta review of IR-002

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review` — `git diff 8a2db203dc 52aa663edd` changes two source files and two test files, all within CR-001/CR-002; no web, interface, composition or shared change. CR-003 closed upstream without code change.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002); Solution Designer SR-012 (CR-003)
- Relevant solution revision IDs: SR-012
- Relevant architecture-review revision IDs: N/A (no design change requiring review)
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-001)
- Current authoritative result: Pass
- What changed in the review result and why: all three findings resolved; scores for API/E2E Readiness, Runtime Correctness and Cleanup raised to ≥ 9.0; other categories carried forward (code unchanged).
- Supported product scenario / material-premise basis changes: CR-P1 resolved (real Claude 2.1.302 signed out → signedOut, IMP-11).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002, `52aa663edd`; SR-012 design-spec line 219 | `readLoggedIn()` reads JSON on any exit; fake signed out = JSON + exit 1; new cases; IMP-11 real binary `exitCode=1` → `signedOut`; IMP-12 17 files / 149 tests, typecheck clean |
| CR-002 | Open (Local Fix) | Resolved | IR-002 | catch removed; new test: count error throws from `startUpdate`, no process created |
| CR-003 | Open (Requirement Gap) | Resolved | SR-012 | requirements-doc "UI note (SR-010)" item (3) records the container-width switch |

- New or remaining finding IDs: None
- Material score or classification changes: overall 9.0 → 9.4; all categories ≥ 9.0; Large/High confirmed
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: `codex login` browser opening and Grok signed-in output unverified until delivery; AR-008 live Application team count left to API/E2E.

### CRR-003 — Proportional test-code review after API-REV-001

- Canonical review report updated: `api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review) — six durable test paths added in `76570a40e4` plus the web `package.json` probe script
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-10, API-11, API-20)
- Relevant solution revision IDs: SR-012
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002, implementation review)
- Current authoritative result: Pass
- What changed in the review result and why: tests are coherent, requirement-aligned, isolated and reuse one fake CLI and harness; the fakes match the real signed-out answers including Claude's exit 1. One repository-wide probe pattern (deleting an existing output folder) recorded as FU-007 rather than a finding.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None (first test review; implementation findings CR-001…CR-003 were resolved in CRR-002).

- New or remaining finding IDs: None
- Material score or classification changes: None; Large/High carried
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: user-only delivery checks (real desktop, one real update, real signed-in outputs incl. `grok models`, browser opening for `codex login` / `grok login --oauth`, a real remote node window).
