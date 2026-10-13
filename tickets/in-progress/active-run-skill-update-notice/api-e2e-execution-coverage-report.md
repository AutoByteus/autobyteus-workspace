# API/E2E Execution Coverage Report — `active-run-skill-update-notice`

## Execution Round Meta

- Upstream package (all in `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/`):
  - `requirements-doc.md` (SR-003), `investigation-notes.md`, `solution-revision-record.md`, `solution-handoff.md`, `design-spec.md` (SR-004), `follow-up-tasks.md`;
  - `design-review-report.md` (ARCH-REV-003 Pass), `architecture-review-revision-record.md`;
  - `implementation-handoff.md` (IR-003, § CRR-003 Resolution), `implementation-revision-record.md`, `implementation-evidence/`;
  - `code-review-report.md` (CRR-004 Pass, § Round 4), `code-review-revision-record.md`.
- Coverage investigation: `api-e2e-coverage-investigation.md` (§ Round 2 Delta); ledger: `api-e2e-test-case-ledger.md`; revision record: `api-e2e-revision-record.md`.
- Current API/E2E Revision ID: `API-REV-002`; round 2; trigger CRR-004 Pass; prior round API-REV-001 (Fail, APE-001).
- Code under test: `codex/active-run-skill-update-notice` at `f181b9b13`:
  - fix `53074d2ac`;
  - docs `f181b9b13`;
  - on top of the API/E2E test commit `c9e100778` and the product at `4bd93a32f`.
- Evidence: round 1 in `api-e2e-evidence/`; round 2 in `api-e2e-evidence/rerun/`.

## Routing Classification

- Large / High; Reviewed route; successful output to Code Review; proportional test-code review `Required`.

## Investigation And Execution Basis

- Round 2 investigation: written before execution (§ Round 2 Delta). Plan followed: `Yes`.
- Round 2 scope:
  - the full APE-001 measurement, rerun;
  - Linux inotify measured (new);
  - a proportional rerun of the changed-detection paths.
- Round-1 evidence for boundaries the delta does not touch remains valid.

## Prior Failure Resolution

| Failure | Round 1 | Round 2 Evidence | Result |
| --- | --- | --- | --- |
| APE-001 (QR-002, REQ-012, DS-001): watch handles not released when the last run using a skill ends | probe 31 → 31 after `syncWatchedFolders([])`; desktop +703, none released after terminate (1,005 at 60 s) | probe 31 → **0**; Linux inotify 68 → 34 → **0**; desktop 768 → **55** (baseline 59) within about 2 s of Terminate, twice, 0 skill-folder handles left | **Resolved** |

## Test-Case Ledger Reconciliation

- Reconciled: `Yes`; last event 23; nothing running.

| Case ID | Round | Final Result | Evidence |
| --- | --- | --- | --- |
| REPO-001…005 (autobyteus-ts, typecheck, server unit, integration baseline, web) | 1 | Pass | `ts-*.log`, `typecheck.log`, `server-*.log`, `web-nuxt.log` |
| SUN-E2E-001…003 | 1 (×3) | Pass | `sun-e2e-run{1,2,3}.log` |
| LIVE-001 Codex, Claude, Grok, AutoByteus | 1 | Pass | `live-*.log` |
| REG-001 AGY families (34 tests) | 1 | Pass | `reg-agy-families.log` |
| DESK-001 AC-010 PR-merge journey, QR-001 | 1 | Pass | `desktop/ac010-human-journey.mp4` |
| DESK-002 app restart | 1 | Pass | `desktop/ac003-app-restart.mp4` |
| MEAS-001 R-5 release | 1 | Fail → superseded by MEAS-002 | `desktop/meas-001-fd-samples.txt` |
| RR-001 probe, fresh build | 2 | Pass | `rerun/ape-001-unwatch-probe-output-f181b9b13.json` |
| RR-002 pre-fix control | 2 | Pass (defect reproduced on old code) | `rerun/control-prefix-macos-probe.json` |
| RR-003 Linux inotify, fixed and pre-fix | 2 | Pass | `rerun/linux-inotify-probe-output.txt` |
| RR-004 notice unit + integration (4 files / 33 tests), typecheck | 2 | Pass | `rerun/sun-unit-integration.log`, `rerun/typecheck.log` |
| RR-005 server unit (683 files / 5399 tests) | 2 | Pass | `rerun/server-unit.log` |
| RR-006 roots + transport E2E (5/5) | 2 | Pass | `rerun/sun-transport-rerun.log` |
| RR-007 live Codex | 2 | Pass | `rerun/live-codex-rerun.log` |
| MEAS-002 desktop release, notice, re-watch | 2 | Pass | `rerun/desktop/` |

## Compatibility / Legacy Scope Check

- No compatibility mechanisms. The fix removes the use of chokidar `unwatch`; nothing is retained for the old shape.

## Changed Boundary And Evidence Matrix (round 2)

| Case | Requirement | Boundary | Mode | Result | Key Observation |
| --- | --- | --- | --- | --- | --- |
| RR-001 | QR-002 | watcher → OS handles (macOS) | probe on the built `dist` | Pass | `{afterWatch:31, afterSyncEmpty:0, afterRewatch:31, afterSecondSyncEmpty:0, afterClose:0}` |
| RR-002 | measurement validity | the same, old code | control | Pass | the old watcher gives 31 → 31 → 31 → 31; only `close()` releases, so the probe detects the defect |
| RR-003 | QR-002 on Linux | watcher → inotify | Docker `node:22-slim`, linux 6.12 arm64 | Pass | fixed: two folders 68 → one kept 34 → empty 0 → re-watch 34 → 0; changes in the kept and re-watched folders still reported. Pre-fix: 68 → 67 → 66 → 67 → 67 |
| RR-006 | AC-003, AC-005b, AC-007 | detection at the wire through the new watcher, including the new GitHub generation folder | gated scripted AGY | Pass | 5/5 |
| RR-007 | AC-001/002 | live runtime | live Codex | Pass | busy notice in-turn; re-read; idle combined |
| MEAS-002 | QR-002, R-5, AC-002 | full product | isolated desktop, human-like, recorded | Pass | see below |

## Broader Validation Decision And Execution

- Decision: `Required`, executed (Project Desktop Validation).
- Isolated instance `iso-56918-0731`, built at `f181b9b13`; the packaged `skill-folder-watcher.js` contains `closeWatch`.
- Skill sources:
  - the same 5 real sources as round 1, registered read-only (72 skills);
  - a test-owned source `rerun-probe` (73 total).
- Daily Assistant (`ALL_INSTALLED`) on Codex GPT-6.1-Sol (low). Clicks and typing only.

| Step | Expected | Observed | Result |
| --- | --- | --- | --- |
| Baseline | — | 59 handles | — |
| Chat 1 asks for the probe marker | bounded watch | 59 → 769 (+710), stable at +6.6 s; answered RP-REV-1 | Pass (R-5 cost unchanged from round 1) |
| Skill edited while idle; next message | one notice, re-read | one "SKILL UPDATED" notice (`rerun-probe … : SKILL.md`), `cat` of the current path, RP-REV-2 | Pass |
| Terminate chat 1 | handles released | 768 → 55 within about 2 s of the click; 0 handles under any skill folder | **Pass (APE-001 resolved)** |
| Chat 2 (re-watch after release) | watch resumes | 55 → 769; RP-REV-2 | Pass |
| `SKILL.md` and a reference edited; next message | one notice, both files | one notice listing `SKILL.md, references/notes.md`; re-read; RP-REV-3 | Pass |
| Terminate chat 2 | handles released | 769 → 56; 0 skill-folder handles | Pass |

- The user's repositories had the same `git status` before and after; no files changed in `~/.codex/skills`.

## Desktop Application Validation

- Rendering is unchanged from round 1: a single "SKILL UPDATED" segment per notice.
- Screenshots: `rerun/desktop/d05-notice-after-fix.png`, `d06-rewatch-notice.png`, `d07-after-terminate.png`.
- Recording: `meas-002-handle-release.mp4`.

## Platform / Runtime Targets

- macOS 25.5 arm64, Node 22.23.1.
- Linux 6.12 arm64 (Docker `node:22-slim`, Node 22.23.3) for the watcher probe.
- Packaged AutoByteus from this worktree.
- Codex GPT-6.1-Sol.

## Lifecycle / Persisted-Data Checks

- The seen record is unchanged by the delta. Round 1's restart case remains valid.

## Durable Coverage Changed In The Codebase

| Path | Change | Owner / Commit | Result |
| --- | --- | --- | --- |
| `tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts` | Added | API/E2E, `c9e100778` | Pass (round 1 ×3; round 2 ×1) |
| `tests/e2e/runtime/skill-update-notice-live.e2e.test.ts` | Updated (Grok) | API/E2E, `c9e100778` | Pass |
| `tests/fixtures/agy-failure-cli.mjs` | Updated (`ECHO_INPUT`) | API/E2E, `c9e100778` | Pass |
| `tests/unit/skill-update-notices/skill-folder-watcher.test.ts` | Updated: per-folder fakes; a real-chokidar descriptor-release test | implementation, `53074d2ac` | Pass |
| `tests/integration/skill-update-notices/skill-update-notice-service.integration.test.ts` | Updated: open-watch accounting; R-5 closes on run end | implementation, `53074d2ac` | Pass |

- No new durable test from API/E2E in round 2. The implementation's real-chokidar test now guards the defect on macOS. Linux release was proven here by a temporary probe; a Linux CI run of that unit test would assert only the closes (noted by the code reviewer).

## Temporary Execution Methods

| Method | Result | Cleanup |
| --- | --- | --- |
| `ape-001-unwatch-probe.mjs` (round 1) on the new build | Pass | temp folder removed by the probe |
| `rerun/ape-001-linux-inotify-probe.mjs` in Docker | Pass | `--rm` container; temp folders in the container |
| pre-fix watcher transpiled to `autobyteus-server-ts/.apar-prefix-dist` | control | removed |
| isolated instance `iso-56918-0731` | — | stopped (not forced); data root removed; ports released |
| `/tmp/apar-rerun` (test-owned skill source, wrapper, samples) | — | removed; samples copied to `rerun/desktop/` |

## Dependencies Mocked Or Emulated

- Same as round 1: AGY scripted in the gated E2E; GitHub HTTP controlled in SUN-E2E-003. The desktop and live runs use real models and the real file system.

## Validation Confidence Scorecard

| Category | Score | Basis / Residual |
| --- | --- | --- |
| Requirement and AC proof | 96% | every AC passes; QR-002 now proven on macOS (probe, desktop) and Linux (probe) |
| Changed-boundary directness | 97% | the fixed watcher measured directly, plus a pre-fix control |
| Integration realism | 95% | the real product, real skills, real Codex |
| Environment fidelity | 95% | real skill sources; Linux in a container, not a Linux desktop build |
| Failure / lifecycle / recovery | 95% | release on terminate twice; re-watch after release; restart and idle shutdown from round 1 |
| User surface | 95% | notices rendered on desktop after the fix |
| Durable regression | 93% | real-chokidar release test on macOS; Linux asserts closes only |

- Overall **96%**; every category ≥ 93%; target met.

## Result Summary

| Result | Cases | Summary |
| --- | --- | --- |
| Pass | all | APE-001 resolved: a skill folder's handles (macOS) and inotify watches (Linux) are released when no run uses it. Folders still in use keep reporting changes, and re-watched folders report again. Notices are delivered as before. |
| Observations (not findings) | — | Carried from round 1: the presentation order of an idle combined notice in the web; application execution scopes not tracked (C-06, follow-up); R-1, a test-only `tracker` field (code-review note) |

## Cleanup Performed

- All round 2 owned resources removed (see Temporary Execution Methods). No user data touched.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 96%
- Broader validation: `Required`, executed (round 1: AC-010 journey, restart; round 2: release, notice and re-watch on desktop, plus Linux)
- Critical acceptance criteria lacking direct proof: none
- Next: proportional test-code review by the code reviewer of:
  - API/E2E `c9e100778`;
  - the IR-001…IR-003 durable test changes, including the real-chokidar watcher test.
