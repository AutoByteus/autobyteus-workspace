# API/E2E Coverage Investigation — update-checks-and-auto-updates

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

(Paths starting with `...` are in `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/tickets/in-progress/update-checks-and-auto-updates/`.)

- Requirements Doc: `.../requirements-doc.md` (SR-005, Approved)
- Investigation Notes: `.../investigation-notes.md` (AF-01..AF-15, probes)
- Solution Revision Record: `.../solution-revision-record.md` (SR-001..SR-005)
- Design Spec: `.../design-spec.md` (SR-005, Ready)
- Supplemental Task Artifacts: UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/ui-ux-spec.md` + `visual-references/VIS-001..037` (design repository `5f5fb4c`)
- Design Review Report: `.../design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Handoff: `.../implementation-handoff.md` (IR-002)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-002, Pass, 9.3/10)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: the code reviewer's implementation-review pass (CRR-002) of code `985246c53b`; ticket commits `53932f6a59` and `48fe98d65d` (the reviewer's documents)
- Prior Investigation Reviewed: None for this ticket. This ticket's base already contains 209's `update-notifications-live.e2e.test.ts`, which this round revises.
- Latest Authoritative Investigation: this round

## Current Requirement And Design Basis

- **Node checks.** Each node checks imported GitHub agent packages and skill sources (and, on the desktop's embedded node only, the four agent runtimes) at per-kind intervals:
  - defaults 30/30/60 min, range 15..1440;
  - a source is due at `lastCheckedAt + interval + jitter`, with jitter a per-process random value below `min(interval/5, 5 min)`;
  - a scheduler tick runs 60 s + 0–60 s after start, then 60 s after each pass;
  - the `UpdatePass` checks due sources one at a time, then applies automatic updates for kinds whose switch is on (all off by default), through the owners' own update methods, and records outcomes (`AUTO_UPDATED` / `AUTO_FAILED` / `AUTO_WAITING`).
- **Quota-free transport.** GitHub checks use one quota-free `POST https://github.com/<o>/<r>.git/git-upload-pack` (`ls-refs`); imports keep the REST metadata. The Codex latest version is read from the `github.com/openai/codex/releases/latest` redirect.
- **Gate.** The gate has two families, `api` and `web`, persisted as `{ api, web }`. A `web` refusal (429/503) stops the GitHub kinds and shows "GitHub asked this node to wait until HH:MM." in the Update checks card.
- **Shell.** The shell checks the app at launch (8 s), then at its own interval (default 60 min, 15..1440). It skips the check when off, busy or offline (`net.isOnline()`). Periodic failures are quiet. It never downloads or installs by itself.
- **Web.** The approved Notification Center:
  - top-right panel, a card per category, an "Update automatically" switch;
  - a danger confirmation for packages and skill sources;
  - outcome rows and the "N updated" entry;
  - the runtime category only in the embedded node's own window.
- **Settings pages.** The rebuilt Update checks card (intervals, switches, contacts, wait banner); Settings → Updates (switch, interval, truthful status).
- **Escalation triggers to watch:**
  - the head read fails for a supported repository form;
  - an automatic update cannot run through the owner's update;
  - Electron `net.isOnline()` misreports in a packaged build.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-011.
- Real-use scenarios added:
  - RUS-001: a restart inside a kind's interval makes no automatic request. Trigger: quit and relaunch.
  - RUS-002: the user turns a kind's automatic switch off after outcomes were recorded; nothing more is applied (AC-010 alternate).
  - RUS-003 (CR-001): the user opens the Update checks card after the node has learned a GitHub wait; the banner shows.
  - RUS-004: the user turns the app's automatic check off and relaunches; no launch or periodic request; "Check for Updates" still works.
- Contrived scenarios (not tested): none recorded upstream.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 per-kind intervals, jitter, 1-minute tick | Changed | REQ-001, 003; DS-001, DS-007 | Revise the 209 E2E timing; instance with real GitHub |
| BEH-006 quota-free head read, gate families, banner | Changed | REQ-002, 004; DS-006 | E2E stubs need the git POST; banner live check (CR-001) |
| BEH-004 automatic updates and outcomes | Added | REQ-005..009; DS-002, DS-008 | New E2E cases; instance journeys AC-006, 007, 008, 010 |
| BEH-005 switches in panel and card, confirmation | Added | REQ-007, 010, 024 | Instance journey; web tests reused |
| BEH-002/007 app periodic check, switch, status | Changed | REQ-012..015, 023, 025 | Instance with `--test-update-feed`; Electron tests reused |
| BEH-008 runtime category, background check, automatic runtime update | Added | REQ-020..022 | New runtime E2E with scripted CLIs; instance with scripted CLIs |
| AC-022 non-embedded node shows no runtime parts and makes no runtime checks | Added | DEC-020, AR-005 | A standalone server of this worktree as a remote node |
| Existing check/update E2E suites (GitHub stubs answer only REST) | Preserved behavior, changed transport | REQ-002 | Needs Update: stubs |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Pass, records, outcomes, settings, gate, runtime service | IMP-02, IMP-03, IMP-10 (unit, partly fake owners) | The real chain in one server; outcomes after real pipelines | Server E2E (revised + new) |
| API / transport / contract | Yes | GraphQL settings/mutations, feed message, git POST, release redirect | IMP-02 GraphQL schema tests | Real HTTP/WS server; real GitHub answers to the git POST | Server E2E; instance + real GitHub |
| Frontend component / state | Yes | Panel, switch, card, Settings → Updates | IMP-07, IMP-12, IMP-13 | Desktop-only app parts and the runtime category in a real window | Isolated instance |
| Browser integration / user journey | Yes | Panel journeys | IMP-12 (dev stack) | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Panel in the Electron window | IMP-12 browser | Own-node runtime rows | Isolated instance |
| Desktop shell / Electron-specific | Yes | `AppUpdateCheckSchedule`, IPC, `net.isOnline()`, embedded-node env | IMP-05/06 (mocked electron-updater, timers) | Packaged schedule against a real feed; `net.isOnline()` (escalation trigger) | Packaged isolated instance + test feed |
| Process / lifecycle | Yes | Scheduler start/close, restarts, vendor processes | unit | Real server restarts; real vendor processes (scripted) | Server E2E; instance |
| Persisted-data transition | Yes | Records with outcome fields; gate file `{ api, web }`; shell settings file | unit store/gate tests | Restart persistence end to end; 209 `{ blockedUntil }` file in a real start | Server E2E |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes | `github.com` git service, release redirect, codeload, vendor version sources, electron-updater feed | IMP-00 probe; IMP-10 counting transport | Real GitHub answers in a running product; real throttling (cannot be induced safely) | Instance + real public repositories |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates`, branch `codex/update-checks-and-auto-updates`
- Project type and runtime stack: as in 209 (pnpm monorepo; Fastify/GraphQL/WS server; Nuxt web; Electron shell)
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/TESTING.md`; no closer guideline
- Conflicting, missing, or unclear project instructions:
  - **Update caches.** As in 209, the worktree build has the installed app's bundle id and update caches, and the user's caches hold a staged update (209 API-14). No download is pressed in this round: AC-021 and the download journey are unchanged from 209.
  - **Scripted runtimes in an isolated instance.** The embedded server's environment is the system baseline. Runtime overrides (`CODEX_APP_SERVER_COMMAND`, `CLAUDE_CODE_EXECUTABLE_PATH`, `ANTIGRAVITY_CLI_COMMAND`, `GROK_BUILD_COMMAND`, `FAKE_RUNTIME_STATE_DIR`, `CLAUDE_CONFIG_DIR`) are written to the instance's own data-root `.env`, which the server loads (dotenv) as its AutoByteus settings.
    - Before any automatic runtime update is switched on, all four rows must show the scripted versions (codex 0.150.0, claude 2.1.200, agy 1.4.3, grok 1.0.62). Otherwise a real vendor update could run on this machine.
- Required environment variables or secrets available: `N/A` (no secrets)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Layers, rules | As in 209; "Rerun by impact"; clean env for E2E |
| `docs/isolated-app-instances.md` | Instances | `--from-worktree`, `--data-root`, `--keep`, `--test-update-feed`, `restart`, `stop` |
| `autobyteus-server-ts/tests/e2e/helpers/agent-runtimes-e2e-harness.ts`, `tests/fixtures/agent-runtimes-fake-cli.mjs` | Scripted runtimes | `prepareFakeRuntimes` in `vi.hoisted`; state files; Codex app-server keeps turns running |
| `autobyteus-server-ts/tests/unit/update-notifications/update-check-request-budget.test.ts` | ls-refs answer shape | `0050<sha> HEAD symref-target:refs/heads/main\n0000` |
| `autobyteus-server-ts/package.json` `test:integration:prepare` | Builds the Brief Studio importable package | Needed by `agent-runtimes-running-agents.e2e.test.ts` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Packaged build | worktree | `pnpm -C autobyteus-web build:electron:mac` (from `48fe98d65d` = code `985246c53b`) | ad-hoc signed, 1.5.9-beta.2 | exit 0 | untracked output |
| Isolated instance A (own node) | worktree | `isolated-app start --from-worktree --data-root <own> --test-update-feed http://127.0.0.1:<feed>` | runtime overrides in `<data-root>/server-data/.env` | `start` JSON | `stop`; remove own data root |
| Standalone remote node R | `autobyteus-server-ts` | `node dist/app.js --port <free> --data-dir <own>` (no embedded flag) with logging runtime wrappers | worktree `dist` from the build | `/rest/health` | kill owned pid; remove dir |
| Feed server, connection sampler, CDP driver | `/tmp/a210/scripts` | 209's probe scripts | loopback | — | kill |
| Server E2E | `autobyteus-server-ts` | `env -i PATH HOME=<tmp> TMPDIR vitest run <files> --no-watch` | test-owned data | vitest | test removes its temp root |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Real public GitHub package and skill source at an older revision | Import through the renderer's GraphQL (`AutoByteus/autobyteus-agents`, `blader/humanizer`). Then, in the instance's own registries: an older installed revision and a last check 40 min ago (ASM-001, as 209) | Real repositories read-only | Data root removed |
| Scripted runtimes | `agent-runtimes-fake-cli.mjs` linked as the four commands; state dir owned by the run; `codex-update-to` = the real latest Codex (0.164.0) | Never the real CLIs (checked first) | Removed |
| A running Codex agent | Agent definition + `createAgentRun` (scripted Codex keeps the turn running) | No model calls | Terminated; instance stopped |
| App update offer | Generic feed: first the running version, later 1.6.0 | Loopback | Stopped |
| GitHub wait for CR-001 | The instance's own `rate-limit.json` `{ api: null, web: <future> }` written while stopped | A real wait cannot be induced safely | Data root removed |

## Persisted Data Transition Coverage Basis

- Approved decisions:
  - `Directly Usable — No Migration` for the notification file (rows without outcome fields);
  - `Discard or Rebuild` for the old gate file;
  - new keys and files need nothing.
- Evidence planned:
  - the revised E2E starts its first server on a 209-shape gate file `{ blockedUntil: <future> }` and must not be blocked;
  - restart persistence of outcomes;
  - reused store/gate unit tests (IMP-02).
- Migration scenarios: N/A.

## Existing Durable Coverage Inventory

Run on `48fe98d65d` before any change (`/tmp/a210/inv-*.log`):

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` (209) | 6 h cadence, REST checks, `{ blockedUntil }`, 403 stop | 209 REQ-002/003 replaced by REQ-001/002/004 | Needs Update (cadence, transport, gate; add automation) | imports removed constants; fails at API-02 | Rewrite to SR-005 (API-02..API-12) |
| `tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts` | Check/update/offline/runtime prep through GraphQL | BEH-003 preserved | Needs Update (stub answers REST only) | 2 + 16 cases `CHECK_FAILED` | Add the head read to its stub (API-01a) |
| `tests/e2e/skills/skill-name-catalog-graphql.e2e.test.ts` | GitHub update adding a duplicate rolls back | preserved | Needs Update (stub) | 1 case | Stub (API-01b) |
| `tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Check/update/rollback through GraphQL | preserved | Needs Update (stub) | 3 cases | Stub (API-01c) |
| `tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts` DCF-E2E-005 | Package updates only on Update | preserved (REQ-005 default off) | Needs Update (stub) | 1 case | Stub (API-01d) |
| `tests/e2e/helpers/agent-runtimes-e2e-harness.ts` + `tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` | Runtime page checks/updates | preserved | Needs Update (Codex source moved to the github.com redirect) | AR-01, AR-03, AR-11 fail; Codex read real GitHub (`0.164.0`) | Harness stub (API-01e) |
| `tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` | Update refused while agents run | REQ-021 | Still Valid (unverified) | Skipped: Brief Studio not built | `test:integration:prepare`, then run (API-01f) |
| `tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts` | Skill-update notices (gated live AGY) | AC-007 notice | Out Of Scope here (gated live suite; pipeline unchanged) | skipped by its gate | None |
| Unit/Electron/web tests (IMP-02, 03, 05, 07, 10, 13) | Pass, records, schedule, components | all | Still Valid | IMP rows | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01..R07 | as their IMP rows | unit/Electron/web/guards/budget/strings | Reused | IMP-01..03, IMP-05..11, IMP-13 | Rerun by impact: after `62082fc36e` only two web files changed, covered by IMP-13 |
| API-01a..e | preserved check/update behavior | existing server E2E | Durable (update) | Add the head read and Codex redirect to the stubs; run each file | Stale stubs, and network leakage to real `github.com` |
| API-01f | REQ-021 | running-agents E2E | Existing Test | `test:integration:prepare`, then run | `runUpdate`/`beginUpdate` refactor |
| API-02 | AC-001 (server), AC-003 (shape), AC-005, AC-017, REQ-002 | real server chain | Durable | revised `update-notifications-live`: due after interval + jitter, one git POST per source, no REST | SR-005 cadence and transport |
| API-03 | RUS-001, REQ-010 (209) | restart | Durable | same file | — |
| API-04 | AC-008 (209), AC-012 (209) | newer revision; offline | Durable | same file | — |
| API-05 | 209 AC-005/009/011 | manual update, Clear | Durable | same file | — |
| API-06 | AC-017, 209 AC-015 | Update checks off | Durable | same file (with automatic switches on) | DEC-013 |
| API-07 | AC-004 (server), REQ-004 | `web` gate | Durable | 503/429 on the git POST → stop; `{ api, web }` file; `githubWaitUntil`; restart; resume | Families |
| API-08 | AC-010, AC-006 (server), REQ-008 | automatic packages | Durable | switch on while waiting → next tick updates through the pipeline → `AUTO_UPDATED` unread; `markAllRead` | DS-002 |
| API-09 | AC-007 (server), AC-008b | automatic skill source with local edit and added file | Durable | edit, add a file → update replaces both → `AUTO_UPDATED` | DEC-019 |
| API-10 | AC-009, REQ-009 | automatic failure | Durable | invalid upstream package → `AUTO_FAILED`, unchanged, no retry or new unread within the interval, one retry after | DS-008 |
| API-11 | AC-002 (server) | intervals | Durable | `setUpdateCheckInterval` 14 → refused; 15 → next pass uses it | — |
| API-12 | persisted transition | 209 gate file | Durable | first start on `{ blockedUntil }` future → not blocked | Discard or Rebuild |
| API-20 | AC-018, AC-005 (runtimes) | runtime background check, embedded node | Durable | new `agent-runtime-update-notifications.e2e.test.ts`: first tick → notifications for outdated scripted runtimes, none for up to date / not installed; nothing updated | — |
| API-21 | AC-019 | panel's runtime Update | Durable | `updateAgentRuntime` → handled; refused with a running Codex agent | — |
| API-22 | AC-020 | automatic runtime update | Durable | switch on with a running agent → `AUTO_WAITING` (once unread); agent ends → `AUTO_UPDATED`; a failing vendor update → `AUTO_FAILED` | — |
| API-13 | regression | all changed server E2E files in one run | Existing Test | one vitest command (8 files) | Interference between suites (added during the run) |
| API-30 | AC-001, AC-005, AC-018 | packaged instance A: real GitHub, scripted runtimes | Journey | Import, shape, start; first tick creates package, skill and runtime notifications; nothing updated | Real product |
| API-31 | AC-008a, AC-010, AC-006 | panel switch with confirmation | Journey | Cancel → off; Confirm → package updated within ~1 min, "Updated automatically" row, compare link | — |
| API-32 | AC-007, AC-008b, AC-011 | skill switch in the card; panel shows the same state | Journey | Local edit + added file; on → replaced; panel switch on | — |
| API-33 | AC-019, AC-020 | runtime rows | Journey | Running Codex agent → Update unavailable; runtime switch on → waiting text; agent ends → updated automatically | — |
| API-34 | AC-012, AC-015, net.isOnline | app periodic check | Journey | Feed first offers the running version; interval 15 min; publish 1.6.0; found without a click | Escalation trigger |
| API-35 | AC-013, RUS-004 | app check off | Journey | Switch off; restart; feed log silent over launch and later; Check for Updates works | — |
| API-36 | AC-004 UI, CR-001 | card banner | Journey | Instance stopped; own gate file `web` future; start; open the card → banner | RUS-003 |
| API-37 | AC-022 | remote node R | Journey | R without the embedded flag; window of A bound to R: no runtime category, switch, interval or contact line; R's runtime wrappers never invoked | — |
| API-38 | real git endpoint throttling | — | Not Tested | — | Cannot be induced without hammering GitHub |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why |
| --- | --- | --- |
| API-20..API-22 | `autobyteus-server-ts/tests/e2e/update-notifications/agent-runtime-update-notifications.e2e.test.ts` | The runtime kind end to end, with scripted CLIs and a real running agent |
| API-01a..e | `autobyteus-server-ts/tests/e2e/helpers/github-head-read-stub.ts` (shared answer builder) | One ls-refs answer for every suite's stub |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-02..API-12 | `tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` | SR-005 cadence, transport, gate, automation | Keep the schema-once rule (FU-004 of 209) |
| API-01a..d | the four GitHub suites | Answer the head read | Behavior assertions unchanged |
| API-01e | `tests/e2e/helpers/agent-runtimes-e2e-harness.ts` | Codex `releases/latest` redirect | `CODEX_RELEASES_URL` changes |

## Durable Coverage To Remove

None. The 209 assertions that SR-005 replaced (6 h cadence, REST checks, `{ blockedUntil }`, REST 403 stop) are rewritten in place (Durable Coverage To Update).

## Desktop Application Validation Plan

- Shell-specific behavior: the app schedule (launch, periodic, skip, off), `net.isOnline()`, the embedded-node env, IPC `set-auto-check`, quiet periodic errors. Web-equivalent behavior: panel, switches, card.
- Approach: packaged isolated instances (TESTING "desktop-shell behavior … + an isolated desktop instance").
- Avoiding disturbance: only instances this run starts; no download pressed; scripted runtimes only (checked before switching automatic runtime updates on).

## Live Environment And Fixture Plan

- Startup order: feed → instance A (prepared data root) → sampler → CDP steps; later the standalone node R.
- Real `github.com` git service and release redirect (quota-free); real Claude and Antigravity version sources (read-only).
- Evidence: DOM/state JSON, screenshots, GraphQL snapshots, feed log, connection log, fake-CLI state and invocation logs.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Real throttling of the git endpoint (API-38) | Would need a request volume GitHub treats as abuse | Low: gate families tested with 429/503 answers | No | None |
| Running agents receiving the skill-update notice after an automatic skill update (AC-007 second half) | Same pipeline as a manual update; the live notice suite is gated (AGY) | Low | No | None |
| `net.isOnline()` reporting offline in a packaged build | Needs the host offline (root) | Low: a misreport only means a quiet failed check | No | None |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added and updated)
- Reroute Required Before Validation Execution: `No`
- Notes: The packaged build and the inventory runs (read-only) happened before this plan.
