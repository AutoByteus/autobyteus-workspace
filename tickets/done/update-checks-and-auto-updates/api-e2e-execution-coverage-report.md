# API/E2E Execution Coverage Report — update-checks-and-auto-updates

The run record and the result. The plan is in `api-e2e-coverage-investigation.md`; the history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/tickets/in-progress/update-checks-and-auto-updates/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after the code reviewer's implementation-review pass (CRR-002) of code `985246c53b`
- Prior round reviewed: None for this ticket (209's suite in the base is revised here)
- Deviations from the investigation's plan, and why:
  - **API-01f.** `agent-runtimes-running-agents` failed intermittently. The cause is a pre-existing test race (the base fails it too), fixed as a baseline fix in its own commit.
  - **API-20..22.** First-tick timing in the new runtime suite was made deterministic. The vendor commands' timeouts share the fake clock.
  - **API-13.** Added: one combined run of all changed suites.
  - **API-36.** The GitHub wait was put into the instance's own gate file while it was stopped. A real GitHub throttle during a connected window (CR-001's exact timing) cannot be induced safely. That timing is covered by IMP-13 (card re-read on open) and API-07 (the wait learned from a 503).
  - **API-38** (real throttling of the git endpoint) was not run, as planned.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/tickets/in-progress/update-checks-and-auto-updates/evidence/` (files `API-*`; probe scripts in `evidence/API-probe-scripts/`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `985246c53b` (HEAD `48fe98d65d`, reviewer docs only after it) + this round's test changes | macOS 26.5.2 arm64 | Node 22.23.1, Vitest 4.0.18 | Server E2E with `env -i PATH HOME=<resolved temp> TMPDIR`; GitHub and vendor sources controlled in-process; fake `setTimeout`/`Date` advancing with real time |
| ENV-2 | packaged build from `48fe98d65d` (code `985246c53b`), `build:electron:mac`, ad-hoc, 1.5.9-beta.2 | macOS 26.5.2 arm64 | `isolated-app start --from-worktree --data-root /private/tmp/a210/rootA --test-update-feed http://127.0.0.1:59808` (A1 iso-59809-246d, A2 iso-59908-394c, A3 iso-60666-dc1f) | Own data root; real `github.com` git service and release redirect, real Claude and Antigravity version sources, unauthenticated (REST budget 60/60 at start); scripted runtime CLIs through the data root's `.env`; window 1200×768; en |
| ENV-3 | worktree `autobyteus-server-ts/dist` from the same build | macOS 26.5.2 arm64 | standalone remote node R: `env -i PATH HOME TMPDIR node dist/app.js --port 60748 --data-dir /private/tmp/a210/rootR/server-data`, no embedded flag | Runtime commands are logging wrappers around the scripted CLIs; bound to a desktop window of A3 |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | — | server typecheck | Reused IMP-01 | — | Pass | (IMP-01) | — | Server `src` unchanged since `95a608c456` |
| API-R02 | AC-001..011, 017..020, 022 (unit) | server unit (pass, records, gate, owners, runtimes, settings, GraphQL) | Reused IMP-02, IMP-03 | — | Pass | (IMP-02, IMP-03) | — | same |
| API-R03 | AC-003, REQ-002, QR-001 | counting transport, 100 sources | Reused IMP-10 | — | Pass | (IMP-10) | — | same |
| API-R04 | AC-012..015, 021 (shell) | Electron tests, typecheck | Reused IMP-05, IMP-06 | — | Pass | (IMP-05, IMP-06) | — | Shell unchanged since `802ffd917a` |
| API-R05 | AC-002, 006..011, 015..017, 022 (web); CR-001, CR-002 | web unit/component | Reused IMP-07, IMP-13 | — | Pass | (IMP-07, IMP-13) | — | IMP-13 reran every web suite touching IR-002's files at `985246c53b` |
| API-R06 | REQ-018, AC-016 | guards, exact strings en/zh-CN | Reused IMP-08, IMP-11 | — | Pass | (IMP-08, IMP-11) | — | the guards also ran in the build (exit 0) |
| API-01a..e | preserved check/update behavior | existing server E2E | Shared `tests/e2e/helpers/github-head-read-stub.ts`; stubs of `github-skill-sources-graphql`, `skill-name-catalog-graphql`, `agent-packages-graphql`, live-refresh answer the head read; 40-hex fixture SHAs; harness Codex stub answers the release redirect | ENV-1 | Pass | `API-01-existing-e2e-suites.log` | before: 6 suites stale; after: `29 passed`, `9 passed`, `8 passed`, `8 passed \| 2 skipped`, `13 passed` | Before the fix the stale stubs let checks reach real `github.com` (network leakage in tests) |
| API-01f | REQ-021 (preserved) | running agents block Update (Brief Studio + standalone) | `test:integration:prepare`; run suite | ENV-1 | Pass (after a baseline fix) | `API-01-existing-e2e-suites.log` | HEAD 3/5 and base 2/5 fail `Timed out waiting for Codex has an update again`; after the fix 6/6 `4 passed` | Pre-existing race, cause in the test. RA-03's update re-check (AR-006) stays checking until Codex's sign-in is read, and RA-04's Check skips a checking row. The test now presses Check again (TESTING Rule 9 baseline fix, own commit) |
| API-02, API-12 | AC-001, AC-005, AC-022 (node), REQ-002; 209 gate file | real server chain | `vitest run tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` | ENV-1 | Pass | `API-02-12-update-notifications-live.log`, `…-receipt.json` | `✓ API-02, API-12 …`; due pass = exactly 2 `POST https://github.com/<repo>.git/git-upload-pack`; no `api.github.com`/`codeload` | Defaults 30/30/60, switches off, `desktopEmbeddedNode: false`, `githubWaitUntil: null` with a 209 `{ blockedUntil }` file |
| API-03 | RUS-001 | restart | same file | ENV-1 | Pass | same | `✓ API-03 …` | 0 requests at the first tick after restart |
| API-04 | 209 AC-008, AC-012 | newer revision; offline | same | ENV-1 | Pass | same | `["POST github.com offline","POST github.com offline"]` | Records byte-identical after the offline pass |
| API-05 | 209 AC-005/009/011 | manual update, Clear | same | ENV-1 | Pass | same | archives `["import","import","user-update-package","user-update-skill"]` | Manual update: `outcome: null` |
| API-06 | AC-017, AC-005 | checks off with switches on | same | ENV-1 | Pass | same | `✓ API-06 …` | No checks/updates over ticks and a restart; on-open check notifies, not applied |
| API-08 | AC-010, AC-006 (server) | automatic packages | same | ENV-1 | Pass | same | `AUTO_UPDATED`, `read: false`; head read then `GET …/tar.gz/<d>` | `update_settings_changed` frame on switch-on |
| API-09 | AC-007 (server), AC-008b | automatic skill source with local edit + added file | same | ENV-1 | Pass | same | `SKILL.md` without `LOCAL EDIT`; `LOCAL-ADDED.txt` gone | — |
| API-10 | AC-009, REQ-009 | automatic failure | same | ENV-1 | Pass | same | `AUTO_FAILED`, reason `…at least one directory…`; no retry within the interval; one retry after, `read: true` | Package files unchanged |
| API-11 | AC-002 (server), REQ-001 | intervals | same | ENV-1 | Pass | same | `UPDATE_CHECK_INTERVAL_OUT_OF_RANGE` for 14 and 1441; 15 → only the package checked at +19 min | — |
| API-07 | AC-004 (server), REQ-004, QR-003 | `web` gate | same | ENV-1 | Pass | same | `… → 503 throttled` only; gate file `{ api: null, web: <ISO> }`; `githubWaitUntil` = it; 0 requests after a restart; both checked after the time | Manual check refused at once |
| API-17, API-18 | 209 CR-001, AC-011 | unreadable skill registry; removal | same | ENV-1 | Pass | same | `✓ API-17 …`, `✓ API-18 …` | 3/3 runs; mutation control (pass ignores the switch) fails 10 cases |
| API-20 | AC-018, AC-005 (runtimes), AR-007 | runtime background check, embedded node | `vitest run tests/e2e/update-notifications/agent-runtime-update-notifications.e2e.test.ts` | ENV-1 | Pass | `API-20-22-agent-runtime-update-notifications.log`, `…-receipt.json` | Codex 0.150.0→0.163.0, Claude 2.1.200→2.1.304; none for Antigravity (up to date) or Grok (not installed); app-server requests `[]` | 6 runs pass after the timing fix |
| API-21 | AC-019, REQ-021 | runtime Update from the notification | same | ENV-1 | Pass | same | refusal `AGENT_RUNTIME_AGENTS_RUNNING`; Antigravity `HANDLED 1.5.0`; Claude failure `Claude is up to date!`, record kept | — |
| API-22 | AC-020, REQ-022, REQ-009 | automatic runtime update | same | ENV-1 | Pass | same | Codex `AUTO_WAITING` (read kept, `outcomeAt` unchanged over ticks); after the agent ends `AUTO_UPDATED 0.163.0` | Mutation (agents ignored) fails API-21/22 only |
| API-13 | regression | all changed E2E files together | one vitest command (8 files) | ENV-1 | Pass | `API-13-combined-e2e.log` | `Test Files  8 passed (8)`, `Tests  86 passed \| 2 skipped (88)` | — |
| API-30 | AC-001, AC-005, AC-018, REQ-002, REQ-003 | packaged instance A, real GitHub, scripted runtimes | Import `AutoByteus/autobyteus-agents`, `blader/humanizer`; set older installed revisions and a last check 40 min ago; `.env` runtime overrides; start; wait | ENV-2 | Pass | `API-30-first-tick.txt`, `API-30-panel-first-tick.png` | First tick 21:15:58 (91 s after start): package `a8a09f3e→d705e9a3`, skill `6be1fa4→8c307f3`, Codex 0.150.0→0.164.0, Claude 2.1.200→2.1.309, Antigravity 1.4.3→1.4.6, Grok 1.0.62→1.0.70; REST `used: 4` = the imports | Runtime rows confirmed scripted before any runtime update |
| API-31 | AC-008a, AC-010, AC-006 | panel package switch | Toggle → confirmation → Cancel; toggle → Turn on | ENV-2 | Pass | `API-31-32-automatic-packages-skills.txt`, `API-31-*.png` | After Cancel: `checked: false`, node `agentPackages: False`; on 21:17:53 → `AUTO_UPDATED d705e9a` 21:18:00; row "Updated automatically to d705e9a" + compare link | Confirmation above the panel (REQ-024) |
| API-32 | AC-007, AC-008b, AC-011 | card skill switch | Edit README, add file; card → confirmation → Turn on | ENV-2 | Pass | same file, `API-32-*.png` | `AUTO_UPDATED 8c307f3` 21:19:01; old generation gone; panel shows both switches on | No confirmation at update time |
| API-33 | AC-019, AC-020 | runtime rows | Running Codex agent; blocked row; Antigravity manual success; Grok manual failure; runtime switch on; agent ends | ENV-2 | Pass | `API-33-runtimes.txt`, `API-33-*.png` | "Update unavailable while 1 agent is running." (`aria-disabled`, opacity 0.5, press no-op); "Updated to 1.5.0"; "Update failed. Nothing was changed."; Codex `AUTO_WAITING` + "It will be updated automatically once no agent is running."; Codex "Updated automatically to 0.164.0 · From 0.150.0" | Claude `AUTO_FAILED` once, not retried |
| API-34 | AC-012, AC-015, net.isOnline | app periodic check | 14 min refused, 15 min saved; 1.6.0 published after launch | ENV-2 | Pass | `API-34-35-app-schedule.txt`, `API-34-*.png` | feed: launch 21:14:37.456, periodic 21:29:37.455; "Update available", Last Checked 23:29:37; app row | `net.isOnline()` reported online in the packaged build: escalation trigger not fired |
| API-35 | AC-013, RUS-004 | app check off | Switch off; stop; start | ENV-2 | Pass | same, `API-35-*.png` | no feed request at launch; 0 `[updater]` lines; "Automatic checks are off", "Never"; manual Check → 1 request | — |
| API-36 | AC-004 (UI), CR-001 | card banner | Own gate file `web` +2 h; start; open card | ENV-2 | Pass | `API-36-card-wait-banner.txt`, `API-36-card-github-wait-banner.png` | "GitHub asked this node to wait until Sat 01:30 AM." | See Deviations |
| API-37 | AC-022 | remote node R | Desktop window bound to R; card; R's runtime invocations | ENV-3 | Pass | `API-37-remote-node.txt`, `API-37-remote-node-window-card.png` | `desktopEmbeddedNode: false`; R card: no runtime switch, interval or "Agent runtimes:" line; only start-up capability probes, no update-check command in 6 min | The card's "Automatic updates: … each runtime's own update command" line matches VIS-037 |
| API-38 | REQ-004 (real GitHub) | git endpoint throttling | — | — | Not Tested | — | — | Cannot be induced without abusive volume |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-30, API-02, API-R02 | Proven | — |
| AC-002 | Yes | API-34 (UI refusal 14 / save 15), API-11, API-R05 | Proven | — |
| AC-003 | Yes | API-R03 (100 sources), API-02 (one head read per source), API-30 (GitHub's REST counter: 0 from the pass) | Proven | — |
| AC-004 | Yes | API-07, API-36, API-R02, API-R05 | Proven (throttle emulated; real throttling not induced, API-38) | — |
| AC-005 | Yes | API-02, API-06, API-20, API-30 | Proven | — |
| AC-006 | Yes | API-31, API-08 | Proven | — |
| AC-007 | Yes | API-32, API-09; the skill-update notice to running agents: same pipeline as a manual update (reused tests) | Proven (notice not re-run live) | — |
| AC-008 | Yes | API-31 (a), API-32 + API-09 (b), API-R05 | Proven | — |
| AC-009 | Yes | API-10, API-33 (runtime), API-R02 | Proven | — |
| AC-010 | Yes | API-31 (7 s after Turn on), API-08 | Proven | — |
| AC-011 | No | API-32 (card ↔ panel), API-08 (`update_settings_changed`), API-R05 | Proven | — |
| AC-012 | Yes | API-34 | Proven | — |
| AC-013 | Yes | API-35, API-R04 | Proven | — |
| AC-014 | Yes | API-R04 (schedule skip rules: busy, offline); API-34 (online path in a packaged build) | Proven by Electron tests; busy/offline not re-run live | — |
| AC-015 | Yes | API-34, API-35, API-R04, API-R05 | Proven ("Check failed" state by tests) | — |
| AC-016 | No | API-36/37 (card text en), API-34 (Settings → Updates description), API-R06 (exact strings en/zh-CN) | Proven | — |
| AC-017 | Yes | API-06, API-R05 | Proven | — |
| AC-018 | Yes | API-30, API-20 | Proven | — |
| AC-019 | Yes | API-33, API-21 | Proven | — |
| AC-020 | Yes | API-33, API-22 | Proven | — |
| AC-021 | Yes | API-R04; API-34/35 feed logs (metadata only, no download) | Proven | — |
| AC-022 | Yes | API-37, API-02 (non-embedded node has no runtime kind), API-R05 | Proven | — |
| REQ-024 | No | API-31 screenshot (confirmation above the dimmed panel at 1200 px) | Proven | — |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | all ACs above | AC-014 busy/offline and AC-007's running-agent notice only by tests | — |
| Changed-boundary execution directness | 85% | 96% | API-02..22 (real server chain), API-30..37 (packaged shell, real GitHub git service) | — | — |
| Cross-boundary integration realism and mock gap | 80% | 94% | Real GitHub, Claude and Antigravity sources in ENV-2 | Throttling and offline emulated at `fetch` | — (cannot be induced safely) |
| Environment, configuration, identity, and fixture fidelity | 85% | 93% | Real repositories, packaged build, own data roots | Scripted runtime CLIs (necessary: no real vendor update on this machine); shaped installed revisions (ASM-001); ad-hoc build | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 94% | restarts, failures, throttle, offline, retry rules, waiting, a 209 gate file | Real throttling (API-38) | — |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | API-30..37 | zh-CN only by string comparison (IMP-11) | — |
| Durable regression coverage quality and relevance | 80% | 96% | New runtime suite; revised 209 suite; 6 stale suites fixed; mutation controls; 3–6 stable runs each | — | — |

- Overall post-repository confidence: 81%
- Overall final confidence: 94.7% (simple average)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94.7%). The gap is bounded:
  - GitHub's real throttling of the git endpoint cannot be induced safely;
  - the busy/offline skips of the app schedule are proven by Electron tests only;
  - a live download would touch the installed app's update caches (209 API-14 precedent).
- Confidence-limiting residual risks: as above.

## Broader Validation Decision

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (packaged isolated instances, a standalone remote node) + `Live API` (real studio server E2E)
- Confidence gap addressed and the gain:
  - the packaged schedule and `net.isOnline()` (escalation trigger);
  - real GitHub git-service answers;
  - automatic updates through real pipelines;
  - the runtime category with real vendor processes and a running agent;
  - the remote-node rule.
- Browser validation needed: No further browser run (IMP-12 covers the browser window; the desktop window was driven directly).

## Desktop Application Validation

- Approach executed: isolated instances on an own data root (`--data-root`, `--test-update-feed`, `restart`, stop/start).
- Cases:
  - **Web-equivalent:** API-31/32 (switches, card).
  - **Shell:** API-34/35 (schedule, IPC `set-auto-check`, quiet launch with the switch off) and API-30/33 (the embedded-node env and own-node runtime rows).
  - **Remote node:** API-37.
- Effect on any already-running desktop application: `None`. No download was pressed; the scripted runtimes were confirmed before any runtime update; other worktrees' instance records were left alone.
- Not directly proven: the app schedule's busy/offline skips live (Electron tests).

## Persisted-Data Transition Checks

- Approved: `Directly Usable — No Migration` (notification file), `Discard or Rebuild` (old gate file), new keys and files nothing.
- Representative existing data:
  - a 209 `{ blockedUntil }` file with a future time (API-12, not blocked);
  - 209-shape records (IMP-02);
  - records with outcomes across restarts (API-05..07, API-35).
- Approved transition followed: `Yes`. Version-specific branch or fallback observed: `No`.

## Compatibility / Legacy Scope Check

- Backward compatibility in requirements/design: `No`. In implementation: `No` (the REST metadata path is gone from checks and updates: every check and update in API-02..12 and API-30..32 used the head read).
- Durable coverage retained only for compatibility: `No`. The 209 assertions that SR-005 replaced (6 h cadence, REST checks, `{ blockedUntil }`, REST 403) were rewritten.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/helpers/github-head-read-stub.ts` | Added | API-01a..e, API-02..12 | `ls-refs` HEAD answer; Codex release redirect |
| `autobyteus-server-ts/tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` | Updated (rewritten to SR-005) | API-02..12, 17, 18 | Schema built once per process (209 FU-004) |
| `autobyteus-server-ts/tests/e2e/update-notifications/agent-runtime-update-notifications.e2e.test.ts` | Added | API-20..22 | Embedded node; scripted CLIs; deterministic first tick |
| `tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts`, `tests/e2e/skills/skill-name-catalog-graphql.e2e.test.ts`, `tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts`, `tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts` | Updated (stubs; 40-hex fixture SHAs) | API-01a..d | Assertions unchanged |
| `tests/e2e/helpers/agent-runtimes-e2e-harness.ts`, `tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` | Updated (Codex redirect; RA-04 baseline fix in its own commit) | API-01e, API-01f | — |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| GitHub (server E2E) | `fetch` stub for `api.github.com`, `github.com`, `codeload.github.com` | Deterministic revisions, offline, throttling | Real answers covered in ENV-2 |
| Vendor runtimes | `agent-runtimes-fake-cli.mjs` (E2E and ENV-2/3) | A real vendor update would change this machine | Vendor behavior beyond the scripted answers |
| Vendor version sources (E2E) | `installVendorSourceStub` | Deterministic | Real sources in ENV-2 |
| Time (E2E) | Vitest fake `setTimeout`/`Date` | Intervals of 30–60 min | Real 60–120 s first tick and 15-min app interval in ENV-2 |
| App update feed | Loopback generic feed | No test release on GitHub | Real feed: user's beta |
| GitHub wait (API-36) | Instance's own gate file | Real throttling cannot be induced | Learning from a 503 proven in API-07 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Instances iso-59809-246d, iso-59908-394c, iso-60666-dc1f | Yes | `isolated-app stop` (all `forced: false`); `list` shows none of them | Done |
| Remote node R, feed server, connection samplers | Yes | Killed; R's port closed | Done |
| Data roots `/private/tmp/a210/rootA`, `rootR`, workspace | Yes | Removed | Done |
| Temporary diagnostics: debug lines in RA-04 and in the new suites, mutations in `update-pass.ts` and `agent-runtime-status-service.ts` | Yes | Restored; `git status` shows no `src` change | Done |
| Base check (`git checkout d2820672c3 -- autobyteus-server-ts/src` + two test files) | Yes | `git checkout HEAD -- …` and this round's test versions restored | Done |
| Scratch under `/tmp/a210` (logs, scripts, fake runtime state) | Yes | Scripts kept as evidence; scratch removed at hand-off | Done |
| Real network | — | GitHub REST: 4 requests (the two imports; counter `used: 4`); git service and release redirect (quota-free); Claude and Antigravity version sources | — |

## Preliminary Classification (On `Fail`)

N/A

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: None. Not tested: API-38 (real throttling).
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review)
- Notes:
  - **Escalation triggers.** `net.isOnline()` behaved correctly in the packaged build. The head read worked for both real repositories.
  - **Pre-existing test race.** It was found in `agent-runtimes-running-agents` RA-04 and is fixed in its own baseline commit.
  - **Observation for Product (not a defect).** A remote node's card still says "Automatic updates: GitHub downloads and each runtime's own update command", as approved in VIS-037, although that node runs no runtime updates.
  - **Follow-ups.** None new.
