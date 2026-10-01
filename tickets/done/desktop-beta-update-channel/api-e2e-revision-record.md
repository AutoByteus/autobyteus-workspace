# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer` / `code-review-report.md` / CRR-002 (implementation review round 2 pass) | SR-002, SR-004, ARCH-REV-002, IR-002, CRR-002 | N/A | Fail / 76% |
| API-REV-002 | `/code_reviewer` / `code-review-report.md` / CRR-004 (implementation re-review round 4 pass) | SR-005, ARCH-REV-003, IR-003, CRR-003, CRR-004 | Fail / 76% | Pass / 92% |

## Revision Entries

### API-REV-001 — Initial baseline: channel behavior validated; `downloaded` lock bypass found

- **Trigger:** `/code_reviewer`, `code-review-report.md`, CRR-002 (round 2 pass).
- **Triggering finding or scenario IDs:** none (initial validation).
- **Related revisions:** SR-002 (requirements), SR-004 (design), ARCH-REV-002, IR-001/IR-002, CRR-001/CRR-002.
- **Why recorded:** the first completed API/E2E result.
- **Durable coverage added:**
  - `scripts/tests/test_release_channel_workflow_steps.py`
  - `scripts/tests/test_desktop_release_beta.py`
  - `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_upgrade_all_follows_the_beta_track_after_a_one_time_switch`
  - Nothing was removed.
- **Scenarios:**
  - REPO-01..06
  - DUR-01..04
  - E2E-UNK
  - E2E-01..08, including E2E-07b
  - BR-01, BR-02
  - CLI-01, GH-01
  - CI-01 (not tested)
- **Environment:**
  - Electron 42.4.1 runtime harness with the real electron-updater 6.8.3 against a local GitHub-shaped feed.
  - Real electron-builder 25.1.8 output.
  - nuxt dev and the browser; real bash/git sandboxes.

#### Prior Failure Resolution

None.

- **Canonical artifacts updated:**
  - `api-e2e-coverage-investigation.md` (all sections)
  - `api-e2e-execution-coverage-report.md`
  - `api-e2e-test-case-ledger.md`
  - `api-e2e-evidence/`
- **Prior result and confidence:** N/A.
- **Current result and confidence:** Fail, 76%.
- **New failure IDs:** API-F-001. After a real download, a manual "Check for updates" moves the status out of `downloaded`. `set-channel('stable')` is then accepted while the update stays staged (AC-008 / REQ-007 / ARCH-001). Preliminary classification: `Design Impact`.
- **Recommended recipient:** `/code_reviewer` (failure-origin review).
- **Remaining risks and untested scope:**
  - CI-01: a real beta publication (GitHub flags/assets, Android/iOS, Docker digests) is a delivery follow-up on the first beta.
  - Signed-build install of a staged update.
  - PowerShell help render.

### API-REV-002 — Rerun after SR-005/IR-003: staged-update lock verified; Pass

- **Triggering role, report and round:** `/code_reviewer`, `code-review-report.md`, CRR-004 (round 4 implementation re-review pass).
- **Triggering finding or scenario IDs:** API-F-001 / CR-002 (E2E-07b, BR-02).
- **Related revisions:** SR-005 (design), ARCH-REV-003, IR-003, CRR-003 (failure origin), CRR-004.
- **Why recorded:** a rerun after the Design Impact fix: the sticky `updateStaged` flag and the shared `isAppUpdateChannelLocked` rule.
- **Coverage decisions and durable test paths:**
  - No change to the API/E2E-owned durable tests.
  - The implementation-owned regression spec (`appUpdater.spec.ts` `it.each` through the real `app-update:check` handler) was executed green.
- **Scenarios:**
  - Rechecked first: E2E-07, E2E-07b, BR-02.
  - Added: E2E-07c (a failed check after the download).
  - BR-02 extended with the store's IPC-rejection catch path.
  - Re-run: E2E-01..06, E2E-08, REPO-02..06.
  - Carried from round 1: E2E-UNK, CLI-01, GH-01 (inputs unchanged by IR-003).
- **Commands, environment and fixture delta:**
  - The harness gained a `feed-down` op (feed returns 503), `updateStaged` in its snapshots, and reads the saved builder `.yml` instead of a rebuilt one.
  - E2E-07b no longer quits normally; the round-1 ShipIt observation is not repeated.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-F-001 / E2E-07b: after a download, Check (`available`) → `set-channel('stable')` was accepted while the update stayed staged | Design Impact (confirmed CRR-003 → SR-005) | **Resolved.** Check gives `available` with `updateStaged:true`; `set-channel('stable')` returns `accepted:false, persisted:false`; the channel, file and policy stay beta. | `harness-results/E2E-07b-downloaded-then-check-then-opt-out.json`, `round2/harness-summary.txt` |
| API-F-001 / failed-check variant (named in round 1, not executed) | Design Impact | **Resolved.** E2E-07c: feed 503 → `error` with `updateStaged:true` → `set-channel` refused. | `harness-results/E2E-07c-downloaded-then-failed-check.json` |
| API-F-001 / BR-02: after Check in `downloaded`, the About switch was re-enabled and sent `set-channel:stable` | Design Impact | **Resolved.** The switch stays disabled and the hint stays visible after Check (`available`), after a failed check (`error`), and after an IPC rejection. `set-channel` is never sent. Check and Download stay available. | `round2/br02-browser-staged-lock.json`, `round2/br02-about-staged-lock-after-checks.png` |

- **Canonical artifacts updated:**
  - `api-e2e-execution-coverage-report.md` (rewritten to round 2)
  - `api-e2e-coverage-investigation.md` (round 2 section)
  - `api-e2e-test-case-ledger.md` (events 29–36)
  - `api-e2e-evidence/round2/`
  - `api-e2e-evidence/harness/`
  - `api-e2e-evidence/harness-results/`
- **Evidence note:** the round-1 E2E-07b JSON at its canonical path was overwritten by this rerun. The round-1 observation is preserved in ledger event 20 and in API-REV-001.
- **Prior result and confidence:** Fail, 76%.
- **Current result and confidence:** Pass, 92%. No category is below 90%. The 95% target is not met; the gap is CI-01.
- **New or remaining failure IDs:** None.
- **Recommended recipient:** `/code_reviewer`, for proportional test-code review.
- **Remaining risks, blocked evidence and untested scope:**
  - CI-01, the first real beta publication, for delivery to verify. It covers AC-001, AC-012 and AC-013/014.
  - Signed-build install of a staged update.
  - PowerShell help render.
  - P-007 (accepted).
