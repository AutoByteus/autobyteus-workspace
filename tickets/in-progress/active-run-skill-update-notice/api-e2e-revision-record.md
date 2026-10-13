# API/E2E Revision Record — `active-run-skill-update-notice`

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer / `code-review-report.md` / CRR-002 Pass | SR-003, SR-004, ARCH-REV-003, IR-001, IR-002, CRR-001, CRR-002 | N/A | Fail / 92% (APE-001) |
| API-REV-002 | Code Reviewer / `code-review-report.md` / CRR-004 Pass (round 4) | IR-003, CRR-003, CRR-004 | Fail / 92% | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline: roots, GitHub generations, Grok live, desktop AC-010 journey; handle release failure

- Trigger: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-002 (Pass).
- Durable coverage changed (`c9e100778`):
  - new `agy-skill-update-notice-roots.e2e.test.ts` (SUN-E2E-001…003);
  - `skill-update-notice-live.e2e.test.ts` gains `grok_build`;
  - fixture route `ECHO_INPUT`.
- Cases: REPO-001…005, SUN-E2E-001…003 ×3, LIVE-001 (4 runtimes), REG-001, DESK-001, DESK-002, MEAS-001.
- Environment: live models (Codex, Claude, Grok, AutoByteus/OpenAI); isolated desktop instances built from the worktree; the user's real skill sources registered read-only for R-5.

#### Prior Failure Resolution

None.

- Prior result: N/A. Current result: **Fail, 92%**.
- New failure IDs: **APE-001**. The watch handles of skill folders are not released when the last run using them ends. `syncWatchedFolders` → chokidar `unwatch(dirs)` keeps per-file handles until `close()`. This falls short of QR-002 and REQ-012 (DS-001).
- Recommended owner: implementation engineer (preliminary `Local Fix`), via code-review failure-origin review.
- Remaining risks: Linux not run; application execution scopes not tracked (follow-up, out of scope).

### API-REV-002 — APE-001 rerun after the per-folder watch fix

- Trigger: `/software_engineering_team/code_reviewer`, `code-review-report.md` § Round 4, CRR-004 (Pass; CR-005 = APE-001 resolved by `53074d2ac`).
- Code under test: `f181b9b13`.
- Durable coverage changed by API/E2E: none. Reviewed instead: the implementation's updated watcher unit test (real-chokidar release) and the service integration test.
- Cases:
  - RR-001 probe;
  - RR-002 pre-fix control;
  - RR-003 Linux inotify (Docker);
  - RR-004 notice suites and typecheck;
  - RR-005 server unit;
  - RR-006 roots and transport E2E;
  - RR-007 live Codex;
  - MEAS-002 desktop (`iso-56918-0731`).

#### Prior Failure Resolution

| Failure | Status | Evidence |
| --- | --- | --- |
| APE-001 | Resolved | probe 31 → 0; Linux inotify 68 → 34 → 0 (pre-fix 66–67 kept); desktop 768 → 55 and 769 → 56 on Terminate, 0 skill-folder handles; notices and re-watch still work |

- Prior result: Fail, 92%. Current result: **Pass, 96%**.
- New failures: none.
- Remaining risks:
  - Linux is proven by a container probe, not a Linux desktop build;
  - the Linux unit test asserts closes only;
  - application execution scopes are not tracked (C-06 follow-up).
