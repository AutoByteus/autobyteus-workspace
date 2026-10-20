# API/E2E Execution Coverage Report — settings-update-notifications

The run record and the result. The plan is in `api-e2e-coverage-investigation.md`; the history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/tickets/in-progress/settings-update-notifications/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after the code reviewer's implementation-review pass (CRR-002) of code `c42bf2abc4`
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - API-16 (offline in an isolated instance) did not run. The embedded server's `fetch` does not honour proxy variables, so only a host-network change (root, pf) could take the instance offline. API-04 proves the offline behavior through the real server and owners.
  - Two cases were added during the run: API-17 (CR-001 at the real server: an unreadable skill registry at start) and API-18 (removal at the real server).
  - API-14 ran on a copy of the worktree build with its own bundle id and updater cache name, re-signed ad hoc. The stock identity shares `com.autobyteus.app.ShipIt` and `autobyteus-updater` with the installed app, which holds a staged real update (Rule 2). App code is unchanged.
  - In the isolated instance the sources were imported through the renderer's GraphQL documents (a public API) rather than by typing into Agent Packages, so AC-001's "without opening Agent Packages or Skills" holds. The older installed revisions were then set in the instance's own registries (ASM-001).
  - Window automation used `playwright-core` `connectOverCDP` on the instance's control port (attach-only), not the browser-automation launcher.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/tickets/in-progress/settings-update-notifications/evidence/` (files `API-*`; probe scripts in `evidence/API-probe-scripts/`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `c42bf2abc4` (HEAD `d76332c669`; later `43b639f211` adds only reviewer docs) + this round's test changes | macOS 26 arm64 | Node 22.23.1, Vitest 4.0.18 (server forks pool, Prisma test setup); web Nuxt test env | Server E2E with `env -i PATH HOME=<resolved temp> TMPDIR`; GitHub hosts controlled by a `fetch` stub, all other HTTP real; fake `setTimeout`/`Date` (advancing with real time) |
| ENV-2 | packaged build from `d76332c669` (code `c42bf2abc4`), `pnpm -C autobyteus-web build:electron:mac`, ad-hoc signed, 1.5.7-beta.4 | macOS 26 arm64 | `electron-dist/mac-arm64/AutoByteus.app` via `isolated-app start --from-worktree` | Own data root and ports; real `api.github.com` / `codeload.github.com`, unauthenticated (IP budget 57/60 at start); generic test feed `http://127.0.0.1:58466` (1.5.8 + notes); window 1200×768; en |
| ENV-3 | same build, copied | macOS 26 arm64 | `/tmp/sun-api-e2e/copy/AutoByteus.app`, bundle id `com.autobyteus.app.apie2e`, `updaterCacheDirName: autobyteus-updater-apie2e`, re-signed ad hoc | Feed `http://127.0.0.1:61163` serving a zip of the same copy (529,270,970 bytes) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | — | server typecheck | Reused IMP-11 | — | Pass | (IMP-11) | — | Ran on `c42bf2abc4`, the validated code |
| API-R02 | AC-008..015 unit, CR-001 | server unit (fake owners/transports) | Reused IMP-02 + IMP-11 | — | Pass | (IMP-02, IMP-11) | — | `git diff --name-only 71cfcd7d32 c42bf2abc4` touches only the notification service (rerun in IMP-11), its tests and one doc |
| API-R03 | BEH-002 | package serialization race | Reused IMP-03 | — | Pass | (IMP-03) | — | `agent-package-service.ts` unchanged after `da74c13406` |
| API-R04 | AC-003 link, AC-007, AC-017 (shell) | Electron main tests | Reused IMP-05 | — | Pass | (IMP-05) | — | No `autobyteus-web` file changed after `71cfcd7d32` |
| API-R05 | REQ-019 | isolated-app/launch scripts | Reused IMP-06 | — | Pass | (IMP-06) | — | same |
| API-R06 | AC-002, 006, 009..011, 016, 018 browser | web unit/component | Reused IMP-07 | — | Pass | (IMP-07) | — | same |
| API-R07 | AC-019 | web/localization guards | Reused IMP-08 | — | Pass | (IMP-08) | — | same; the guards also ran inside `build:electron:mac` (ENV-2 build, exit 0) |
| API-R08 | AC-002, 004, 010, 011, 016, 018 browser, 019 | rendered browser check | Reused IMP-10 | — | Pass | (IMP-10) | — | Web code unchanged since |
| API-01 | regression | whole server unit suite | `pnpm -C autobyteus-server-ts test:unit` | ENV-1 | Pass | `API-01-server-unit-excerpt.log` | `Test Files  757 passed \| 4 skipped (761)`, `Tests  6224 passed \| 7 skipped (6231)` | Validated commit |
| API-01b | BEH-001/002/003 preserved | existing GitHub package/skill server E2E | `vitest run tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts` (clean env), 8 runs on HEAD, 8 on base | ENV-1 | Pass (in-scope) | `API-01b-existing-github-e2e.log` | `Tests  45 passed \| 2 skipped (47)` (HEAD, 5 of 8 runs); DCF-E2E-002 `new agent and Team listed: not met within 5000 ms` on HEAD 3/8 and base `3d4d9d0a95` 1/8 | DCF-E2E-002 is a pre-existing macOS watcher-timing failure. Same assertion on the base source; it passes alone 2/2; watcher and definition code are untouched by this ticket. Out of scope → FU-003. The GitHub skill (29) and package (8) suites passed in every run |
| API-02 | AC-001, AC-004, AC-014, AC-017, AC-021 (server) | real studio HTTP/GraphQL/WS, composition, scheduler timer, owners, gate, store | `env -i PATH HOME=<tmp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/update-notifications --no-watch` | ENV-1 | Pass | `API-02-07-server-e2e.log`, `API-02-07-server-e2e-receipt.json` (`api02`, `requests`) | `✓ API-02 …`; receipt `passRequests` = the 4 `api.github.com` URLs, none `codeload` | First pass after start makes no request (sources just checked by import). The due tick checks packages then skills; 2 waiting unread records; the open feed gets `update_notifications_changed`; installed files unchanged |
| API-03 | AC-009, AC-010, AC-014 | restart over the same data root | same file | ENV-1 | Pass | same | `✓ API-03 …`; receipt `api03.afterRestart` read `true` | Only `clearUpdateNotification` and `markUpdateNotificationsRead` mutations exist (no dismiss/skip); first pass after the restart makes 0 requests |
| API-04 | AC-008, AC-012 | on-open check; offline background pass | same file | ENV-1 | Pass | same | `✓ API-04 …`; receipt `api04.offlineRequests` answered `offline` | One package record, now C, unread again; offline pass leaves the records byte-identical; rows `CHECK_FAILED` with `canUpdate: true` |
| API-05 | AC-005 (server), AC-009, AC-011, AC-017 | update → handled; Clear; restart | same file | ENV-1 | Pass | same | `✓ API-05 …` | A waiting record refuses Clear with `Only an updated notification can be cleared.`; archives only for `import, import, user-update-package, user-update-skill`; a cleared record is still gone after the restart |
| API-06 | AC-015 | setting off/on across a restart | same file | ENV-1 | Pass | same | `✓ API-06 …` | Off: 0 requests on a due tick and after a restart (`SERVER_SETTING` false); the on-open check still notifies; on: the next tick checks only the due source |
| API-07 | AC-013 | rate limit through the real transport + scheduler | same file | ENV-1 | Pass | same | `✓ API-07 …`; receipt `api07.gateFile.blockedUntil` | 403 + `x-ratelimit-remaining: 0` stops the pass at its first request; `rate-limit.json` = reset time; a manual check fails at once with no request; 0 requests after a restart before the reset; after the reset nothing is due (failed and refused checks count, REQ-002); 6 h later both are checked |
| API-17 | CR-001, QR-005 | real server start with a `{not json` skill registry | same file | ENV-1 | Pass | same | `✓ API-17 …` | Server starts; only the package record is listed; `skillSourceRegistryError` set; after the fix the skill record is listed again, waiting and unread |
| API-18 | AC-011 | source removal | same file | ENV-1 | Pass | same | `✓ API-18 …` | `notifications.json` = `[]` |
| API-08 | AC-018 (mobile), REQ-017 | web `app.vue` gate | `pnpm -C autobyteus-web exec vitest run __tests__/app.spec.ts` | ENV-1 | Pass | `API-08-web-mobile-gate.log` | `Tests  6 passed (6)`; mutation control `1 failed \| 5 passed` | Mobile: no `NotificationCenter`, feed `enabled` false; browser window: mounted, feed true |
| API-13 | AC-003, REQ-019, design escalation trigger | packaged isolated build + generic test feed | Feed server; `isolated-app start --from-worktree --keep --test-update-feed http://127.0.0.1:58466`; CDP state; click pill; expand app row | ENV-2 | Pass | `API-13-test-feed-app-row.txt`, `API-13-pill-app-update.png`, `API-13-panel-app-row-details.png` | `[updater] Found version 1.5.8 (url: AutoByteus-1.5.8-mac.zip)`; feed log has only `/latest-mac.yml`; `releasePageUrl: null`; `appUpdateNoticePresent: false`; `toasts: []` | Escalation trigger does not fire: electron-updater checks a generic feed in a packaged isolated build. Row `1.5.7-beta.4 → 1.5.8`, notes in details, no Release page link, Download; opening marks the shell record read |
| API-09 | AC-001, AC-002, AC-004, AC-021, AC-017 | packaged instance + real GitHub + connection log | Import `AutoByteus/autobyteus-agents` and `blader/humanizer` (renderer GraphQL); stop; set older installed revisions (`99c58fd…`, `6be1fa4…`) and last check 7 h ago in the instance's registries; start A2 on Settings with a window marker; wait for the pass; Back to Workspace; open panel; expand; GET compare links; `lsof` sampler on server + main pids | ENV-2 | Pass | `API-09-real-github-background-pass.txt`, `API-09-pill-3-updates-unread.png`, `API-09-panel-three-kinds.png`, `API-09-panel-details-compare.png` | Records `99c58fd -> 074dc24`, `6be1fa4 -> 8c307f3` found 13:30:55/56 (≈60 s after start); pill `3 updates`, `rgb(3, 105, 161)`, same `marker-1792503003944`; compare links `200` with GitHub "Comparing …" titles; non-loopback connections: `140.82.121.5:443` (lb-…github.com) only during the pass | No page of Agent Packages / Skills was opened; no dialog, toast or card. While the window stays on the Settings page there is no Settings row, so no pill (see AC-004 note) |
| API-10 | AC-005, AC-006, AC-017 | Update from the panel, real archives | Click skill Update → confirmation → Cancel; Update → confirm; package Update; poll row transitions (100 ms) | ENV-2 | Pass | `API-10-update-from-panel.txt`, `API-10-skill-confirmation.png`, `API-10-panel-handled-rows.png` | Cancel: still `installedRevision 6be1fa4…`, no new connection; `updating … Updating…` → `handled … Updated to 8c307f3`; `handled … Updated to 074dc24`; package row `UP_TO_DATE`; folder inode `563423567 → 563523858` | Confirmation shows the existing warning and `6be1fa4e0c → 8c307f367c`; codeload `140.82.121.10` contacted only after the press |
| API-11 | AC-009, AC-010, AC-004 live | live change from another client; instance restarts | GraphQL Clear of the handled skill from the shell while the panel is open; `isolated-app restart`; open; UI Clear package; restart | ENV-2 | Pass | `API-11-restart-persistence.txt`, `API-11-after-restart-panel.png` | Row removed live, same marker; after restart: app `waiting`, `read: true`, same `foundAt`; package `HANDLED 074dc24`; skill absent; after UI Clear + restart: `updateNotifications: []`, `notifications.json` `[]` | Soft pill `rgb(224, 242, 254)` once read |
| API-12 | AC-015, AC-016 | Update checks card in the product | Settings → Server Settings, real click on the switch; stop; reshape both sources due/outdated; start A3; 79 s; open Agent Packages; switch on; restart | ENV-2 | Pass | `API-12-update-checks-setting.txt`, `API-12-update-checks-card-on.png`, `API-12-update-checks-card-off.png`, `API-12-agent-packages-on-open-checks-off.png` | Card text = REQ-014 description; `aria-checked` `true → false`; `.env` `ENABLE_UPDATE_CHECKS=false`; 79 s with no non-loopback connection and `[]`; on-open → `AGENT_PACKAGE 99c58fd -> 074dc24`; on + restart → only `SKILL_SOURCE` found at 13:39:12 | zh-CN text and the audit come from reused IMP-08/IMP-10 |
| API-14 | AC-007, RUS-004 | Download via MacUpdater + Squirrel.Mac | Copy with own identity; feed B; open panel; click Download; poll; do not press Install; stop | ENV-3 | Pass | `API-14-app-download.txt`, `API-14-app-row-downloaded.png` | Transitions `Downloading 0%` → `Downloading 100%` → `downloaded … Install and restart …`; `updateStaged: true`; zip GET at 14:08:27.962 after the press at 14:08:27.3; user cache listing identical before/after | Toast `Update downloaded. Restart to install.` is the existing feedback for the user's action (REQ-012). After stop: no relaunch, no ShipIt state, copy unchanged. Install not pressed (see Acceptance-Criteria Proof) |
| API-15 | AC-003 alternate, BEH-007 | instance without opt-in | `isolated-app start --from-worktree`; state at 20 s | ENV-2 | Pass | `API-15-no-opt-in.txt`, `API-15-no-opt-in-quiet.png` | `"status": "disabled"`, `"notification": null`, `pills: []`, 0 `[updater]` lines | — |
| API-16 | AC-012 (instance) | offline instance | — | — | Not Tested | — | — | Needs a host network change (root); see Deviations. Proven by API-04 |

Development-run notes for API-02..07 (the earlier runs are not in the evidence; the final runs are):
- Run 1: API-05..07 and API-17 failed. API-05: `clearUpdateNotification` answered `Update notification not found.` for a listed, handled record. I spied on `UpdateNotificationService.clear` and saw args `["SKILL_SOURCE","SKILL_SOURCE"]`. A temporary probe (deleted) showed correct args on the process's first server build and shifted args on every later build. The cause is in type-graphql 2.0.0-rc.3: `MetadataStorage.initCache()` appends every `@Arg` to `paramsCache` on each `buildSchema()`. It is a harness artifact of the in-process "restart": production builds once, and API-11 cleared fine in the packaged app. The suite now builds the schema once per process (documented in its header); FU-004.
- Run 2: API-07 expected the skill check right after the reset. The refused manual check had counted as a check (REQ-002), so my expectation was wrong; it was corrected. API-17 failed only through API-07's state.
- Runs 4–7: 8/8 passed four times in a row (the last three are in the evidence).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-09 (real GitHub, packaged), API-02 | Proven | — |
| AC-002 | Yes | API-09, API-13, API-R08 | Proven | — |
| AC-003 | Yes | API-13, API-15, API-R04 (release link with a GitHub publish config) | Proven for the test feed and the quiet default; Release page link with the real GitHub feed: Only The User Can Check | Under the test feed the link is omitted by design (DEC-017). A real GitHub release feed for a newer version exists only in the user's beta channel; the Electron tests cover the link builder |
| AC-004 | Yes | API-09, API-11, API-02 | Proven (see note) | — |
| AC-005 | Yes | API-10, API-05, API-R02 (failure path, unit) | Proven | — |
| AC-006 | Yes | API-10, API-R06 | Proven | — |
| AC-007 | Yes | API-14, API-R04 | Proven up to "Install and restart offered"; installing on press: Only The User Can Check | Pressing Install in an isolated instance makes ShipIt relaunch the app outside the `e2e` profile, against the user's real data (Rule 2). The local build is ad hoc signed. `installUpdateAndRestart` → `quitAndInstall` only when `downloaded` is covered by IMP-05. A signed install of a real release is the user's beta check (design Risks) |
| AC-008 | Yes | API-04, API-R02 | Proven | — |
| AC-009 | Yes | API-03, API-05, API-11 | Proven | — |
| AC-010 | Yes | API-03, API-09/API-11 (pill sky-700 → sky-100, count kept), API-11 restart | Proven | — |
| AC-011 | Yes | API-05, API-18, API-11 (live removal), API-R06 | Proven | — |
| AC-012 | Yes | API-04 | Proven (real server; offline emulated at `fetch`) | — |
| AC-013 | Yes | API-07, API-R02 | Proven (real server; 403 emulated at `fetch`) | — |
| AC-014 | Yes | API-02, API-03, API-07, API-R02 | Proven | — |
| AC-015 | Yes | API-06, API-12 | Proven | — |
| AC-016 | No | API-12 (en), API-R07/API-R08 (zh-CN), docs per code review | Proven | — |
| AC-017 | Yes | API-02, API-05, API-09, API-10, API-14, API-R04 | Proven | — |
| AC-018 | Yes | API-08 (mobile), API-R08 (browser), API-13/API-15 (desktop app row) | Proven | — |
| AC-019 | No | API-R07 | Proven | — |
| AC-020 | No | Architecture review (design) | Proven upstream (not executable) | — |
| AC-021 | Yes | API-09 (connection log: only GitHub `lb-…github.com` hosts from the server; main process loopback only), API-02, API-13/API-14 feed logs | Proven | — |

AC-004 note: on the Settings page itself the workspace sidebar, and with it the Settings row and its pill, is not shown. That is the existing Settings layout; the approved UI spec places the indicator only on that row. The background pass's records reached the open window while it stayed on Settings, without a reload: the pill showed `3 updates` 138 ms after "Back to Workspace", with the same window marker. A change from another client also removed a row live (API-11). This fully meets AC-004 as the approved design defines the indicator. Whether Settings pages should show the indicator too is a Product question for the Solution Designer, not a defect.

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | API-02..18, API-09..15 | AC-003 real-feed link and AC-007 signed install are user-only | The user's beta check |
| Changed-boundary execution directness | 85% | 96% | Real server chain (API-02..07); packaged shell, generic feed, MacUpdater/Squirrel (API-13/14); real GitHub (API-09/10/12) | — | — |
| Cross-boundary integration realism and mock gap | 80% | 94% | Only GitHub `fetch` is controlled in API-02..07; real GitHub, real archives, real feed in ENV-2/3 | Offline and rate limit never ran against the real network (API-04/07 emulate at `fetch`) | A safe offline host environment |
| Environment, configuration, identity, and fixture fidelity | 85% | 93% | Real public repositories; packaged build; own data roots | Older installed revisions set in the instance registries (ASM-001); the download ran on a re-identified copy; ad-hoc signature | A signed build and a test repository the user controls |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 94% | Restarts (API-03/05/06/07/11/12), failure states (API-04/07/17), cancel path (API-10), quiet default (API-15) | Panel failure path ("Update failed. Nothing was changed.") seen only in IMP-10 and unit tests | — |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | API-09..15 (real clicks in the packaged window), API-08, API-R08 | AC-004 Settings-page nuance (Product) | — |
| Durable regression coverage quality and relevance | 85% | 95% | New ungated server E2E (8 cases, 3/3 stable runs, real timer chain); mobile gate test with mutation control | The E2E rebuild workaround depends on FU-004 | FU-004 |

- Overall post-repository confidence: 83% (the repository evidence before this round's E2E and instance journeys)
- Overall final confidence: 94.6%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94.6%). The gap is bounded and cannot be closed safely here:
  - offline and rate-limit against the real network (needs host network control);
  - a signed install of a real release (the user's beta check).
- Confidence-limiting residual risks: as above; FU-003 (pre-existing watcher-timing flake in an unrelated suite).

## Broader Validation Decision

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (packaged isolated instances) + `Live API` (real studio server E2E)
- Confidence gap or residual risk it addresses, and the expected gain:
  - the packaged generic-feed check (escalation trigger);
  - real GitHub answers and hosts;
  - shell IPC and records in a real window;
  - live feed;
  - restart persistence;
  - the real MacUpdater/Squirrel download.
- Browser validation needed: No further browser run. IMP-10 covers the browser window, and the desktop window was driven directly.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: TESTING.md isolated instances of the worktree build (`--from-worktree`, `--data-root`, `--test-update-feed`, `restart`, `stop`). Deviation: the download journey ran on a re-identified copy (Round).
- Web-equivalent behavior: API-09..12 panel and card rows. Shell-specific behavior: API-13 (packaged feed check, IPC mark-read), API-11 (shell record across restarts, IPC clear), API-14 (download), API-15 (disabled updater).
- Effect on any already-running desktop application: `None`. Only instances this run started were used. The user's `~/Library/Caches/com.autobyteus.app.ShipIt` and `autobyteus-updater` listings are identical before, after the download and at the end (API-14).
- Behavior not directly proven and its confidence consequence: install on press (user-only); see AC-007.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Not Affected` (new files, tolerant readers)
- Representative existing data used: registries written by the real importers (ENV-2, API-02); a malformed skill registry (API-17)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-02, API-03, API-05, API-09, API-11, API-17
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: None material

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (no self-opening card in any instance; `appUpdateNoticePresent: false`)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` | Added | API-02..07, API-17, API-18 | — |
| `autobyteus-web/__tests__/app.spec.ts` (two cases + mocks for the runtime gate and the feed composable) | Updated | API-08 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| GitHub REST + codeload (API-02..07, 17, 18) | `fetch` stub for those two hosts only; other HTTP real | Deterministic revisions, offline and 403 answers, no rate-budget use | Real answers are covered by API-09/10/12 |
| Time (API-02..07) | Vitest fake `setTimeout`/`Date` with `shouldAdvanceTime` | 60 s / 30 min / 6 h | Real 60 s first pass shown in API-09/12 |
| electron-updater feed (API-13/14) | Ticket-owned generic feed on loopback | No test release on GitHub | Real GitHub feed: user's beta check |
| Installed older revision (API-09/12) | The instance's own registry set to an older real commit | GitHub imports always install HEAD | Files on disk are HEAD's; the update replaced them for real |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instances iso-58470-0628, iso-58636-d7b5, iso-59003-7a68, iso-61168-d979, iso-61323-4549 | Yes | `isolated-app stop` each; `list` empty afterwards | Done. iso-59003-7a68 reported `forced: true` (graceful quit timed out), the others `forced: false` |
| Kept data root `…/autobyteus-isolated-root-WzxLSJ` (A, A2, A3) | Yes | Removed | Done |
| Feed servers (58466, 61163), connection samplers | Yes | Killed | Done (`pgrep sun-api-e2e` empty) |
| Copy app, feed zips, temp evidence in `/tmp/sun-api-e2e` | Yes | Large files removed; scripts kept in `evidence/API-probe-scripts/` | Done |
| `~/Library/Caches/{autobyteus-updater-apie2e,com.autobyteus.app.apie2e,com.autobyteus.app.apie2e.ShipIt}`, `~/Library/HTTPStorages/com.autobyteus.app.apie2e`, `~/Library/Preferences/com.autobyteus.app.apie2e.plist` | Yes (identity invented by this run) | Removed | Done |
| Temporary diagnostics: `tests/unit/api/graphql/zz-apie2e-probe.test.ts`, `tests/e2e/zz-apie2e-probe/`, debug lines in the new E2E, `app.vue` mutation | Yes | Deleted / restored | Done (`git status` shows only the intended changes) |
| Base-source check (`git checkout 3d4d9d0a95 -- autobyteus-server-ts/src`) | Yes | `git checkout HEAD -- autobyteus-server-ts/src` | Done (no src changes in `git status`) |
| `electron-dist/` build output | Yes | Left (untracked build output) | — |
| Real GitHub requests | — | About 20 unauthenticated requests from this IP, estimated from the flows (budget 57/60 at start; the hourly window had reset to 60/60 by the end) | — |

## Preliminary Classification (On `Fail`)

N/A

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs):
  - AC-003: the Release page link with the real GitHub feed.
  - AC-007: installing on "Install and restart" with a signed build.
  - Both are for delivery to take to the user (beta check).
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review)
- Notes:
  - The design's escalation trigger (generic feed in a packaged isolated build) does not fire.
  - Product question for the Solution Designer (not a defect): there is no indicator on Settings pages (AC-004 note). The narrow-window dialog overlap from code review was not re-examined; the window here was 1200 px.
  - Follow-ups added: FU-003 (pre-existing DCF-E2E-002 watcher-timing flake), FU-004 (type-graphql schema rebuild shifts resolver args).
