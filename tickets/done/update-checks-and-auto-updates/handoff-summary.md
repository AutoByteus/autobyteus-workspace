# Handoff Summary — update-checks-and-auto-updates

## Ticket

- Package: `update-checks-and-auto-updates`, Project Task `autobyteus-210`. Users learn of updates in time: frequent quota-free checks with per-kind intervals, agent runtimes as a kind, opt-in automatic updates, and a periodic app check.
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed.
  - Architecture review ARCH-REV-001..002.
  - Code review CRR-002 Pass, 9.3/10, after CR-001 and CR-002 were fixed at `985246c53b`.
  - API/E2E API-REV-001 Pass, 94.7%.
  - Test-code review CRR-003 Pass.
- Prerequisite PRQ-001 (autobyteus-282, clean-checkout build fix) was raised in DR-001 and landed on `personal` `bf087d3166`.
- Revisions: SR-001..SR-006, IR-001..002, CRR-001..003, API-REV-001, DR-001 (Blocked), DR-002
- Archived ticket folder: `tickets/done/update-checks-and-auto-updates/` on `personal`

## What Changed

- Server (`95a608c456`):
  - **Checks.** A package or skill source check is one quota-free `ls-refs` head read on github.com, with no REST quota. Intervals are per kind, 15 min to 24 h (default 30 min; runtimes 60 min).
  - **GitHub waits.** The gate keeps separate `api` and `web` waits, learned from GitHub's throttling and kept across restarts.
  - **Agent runtimes.** They are a notification kind, checked only on the desktop's own node. Their update is refused while agents of that runtime run.
  - **Automatic updates.** They are opt-in, off by default per kind. A package or skill update replaces local changes after a one-time confirmation. Results are announced as notifications, a failure is retried at most once per interval, and the app is never updated automatically.
  - **Codex version.** It is read from the github.com release redirect.
- Desktop shell (`802ffd917a`): a periodic app check besides the launch check. It is skipped while busy or offline, can be switched off, and has its own interval. Settings → Updates shows the true state.
- Web (`25609abdf7`, `985246c53b`):
  - the Update checks card, with intervals, the three automatic switches and the GitHub wait banner;
  - automatic switches in the Notification Center sections, with their explanation;
  - runtime rows;
  - en and zh-CN strings.
- Tests (`821563587d`, `baff097813`, `5faba271f5`):
  - the rewritten `update-notifications-live.e2e.test.ts` and the new `agent-runtime-update-notifications.e2e.test.ts`;
  - the shared `github-head-read-stub.ts`;
  - four existing suites' stubs;
  - the RA-04 baseline fix.
- Docs: six long-lived docs, see `docs-sync-report.md`.

## Integration

- Round 1 (DR-001):
  - checkpoint `298b847557`;
  - merge of `origin/personal` `1c9edce551` (69 commits) as `4c2b43a3d7`, with no conflicts;
  - the server checks failed on the base's missing frozen migration modules (`evidence/DEL-01..03`). Delivery routed this as prerequisite PRQ-001.
- Round 2 (DR-002): merge of `origin/personal` `bf087d3166`, which includes autobyteus-282, as `f72210da3e`. No conflicts. Nothing in the merge touches this ticket's files.
- Rerun on the merged state, after `pnpm install`, server prebuild and `test:integration:prepare` (exit 0):

| ID | Command | Result | Evidence |
| --- | --- | --- | --- |
| DEL-11 | `pnpm -C autobyteus-server-ts typecheck` | Pass | `evidence/DEL-11-server-typecheck.log` |
| DEL-12 | the 8 changed server E2E files (API-13's command) | Pass, 86 passed, 2 skipped, the same as API-13 | `evidence/DEL-12-server-e2e-combined.log` |
| DEL-13 | `pnpm -C autobyteus-server-ts test:unit` | Pass, 810 files, 6717 tests | `evidence/DEL-13-server-unit.log` |
| DEL-14 | `pnpm -C autobyteus-web test:nuxt --run` | Pass, 681 files, 4858 tests | `evidence/DEL-14-web-unit.log` |
| DEL-15 | `pnpm -C autobyteus-web test:electron --run` | 236 of 237 passed. The one failure is `managedExtensionService.spec.ts`, a 5 s timeout under load. It passes 3/3 alone, touches no file of this ticket, and passed in round 1 (FU-002) | `evidence/DEL-15-electron.log` |
| DEL-16 | `tsc -p electron/tsconfig.json --noEmit` | Pass | `evidence/DEL-16-electron-typecheck.log` |
| DEL-17 | web boundary and localization guards | Pass | `evidence/DEL-17-web-guards.log` |

## Verification

- Judged from the evidence: sufficient. Every critical acceptance criterion is directly proven, and no user check is needed.
- Files opened:
  - `API-30` (first tick): six `WAITING` records without a click. GitHub's REST counter shows `used 4`, which are only the two imports.
  - `API-31-32`: the confirmation, Cancel, `Updated automatically to d705e9a`, and the skill's local edit and added file replaced.
  - `API-33`: "Update unavailable while 1 agent is running.", the automatic Codex update after the agent ends, and Claude's failure recorded once.
  - `API-34-35`: 14 min refused and 15 saved, then a periodic feed request 15:00 after launch that found 1.6.0. Off: no request at launch.
  - `API-36`: the wait banner.
  - `API-37`: the remote node has no runtime parts.
  - The server E2E logs: 12/12 three times and 3/3 four times.
  - Two screenshots: the confirmation dialog and the runtime rows.
- Confidence: 94.7%, no category below 90%. The gap is bounded:
  - real GitHub throttling of the git endpoint cannot be induced (API-38);
  - the app schedule's busy/offline skip is proven by Electron tests only;
  - the skill-update notice to running agents after an automatic update uses the manual pipeline and was not rerun live.

## Release

- Beta `v1.5.9-beta.3` (DR-003) was published completely. The Task's done-when asked for a beta and the user's check; DR-002 had recorded `No release` in error.
- The user's check was accepted on that beta, relayed, with no item-level results (`release-deployment-report.md`, Verification).

## Residual Risks And Follow-ups

- FU-001, not urgent: a remote node's card says "each runtime's own update command", as approved in VIS-037. The Solution Designer sends it.
- FU-002, not urgent: the intermittent timeout of the `managedExtensionService` Electron test under full-suite load.
- Rollback: revert the merge on `personal`. No data migration is involved. The persisted-data decisions are: the notification file is directly usable, the old gate file is discarded or rebuilt, and the new keys and files need nothing.
  - Older builds reading the new shapes, such as outcome fields and the `{ api, web }` gate file, was not checked.
  - `RELEASE.md` (Rollback) does not require rollback compatibility for such changes.
