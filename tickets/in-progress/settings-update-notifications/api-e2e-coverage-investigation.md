# API/E2E Coverage Investigation — settings-update-notifications

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/settings-update-notifications/requirements-doc.md` (SR-004, Approved)
- Investigation Notes: `.../investigation-notes.md` (AF-01..AF-14)
- Solution Revision Record: `.../solution-revision-record.md` (SR-001..SR-004)
- Design Spec (required on every route): `.../design-spec.md` (SR-004, Ready)
- Supplemental Task Artifacts: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md` + `visual-references/VIS-001..028` (design repository `288ef06`); `follow-ups.md` (FU-001, FU-002)
- Design Review Report: `.../design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Handoff: `.../implementation-handoff.md` (IR-002)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-002, Pass, 9.3/10)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer's implementation-review pass (CRR-002) of code head `c42bf2abc4`, ticket commit `d76332c669`, 2026-10-20
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this round

(Paths starting with `...` are in `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/tickets/in-progress/settings-update-notifications/`.)

## Current Requirement And Design Basis

- Each node checks its imported GitHub agent packages and skill sources in the background: a first pass 60 s after start, then every 30 min, each source at most once per 6 h (any check counts). The checks stop at a GitHub rate limit, and the stop is persisted across restarts. They run only while the per-node `ENABLE_UPDATE_CHECKS` setting is on (absent = on). They contact only `api.github.com`, never download anything, and make no noise when they fail (REQ-001..003, 013, 015, 020; DS-001, DS-006).
- Any check (background, on-open, row) reconciles one notification record per source (DS-007): a newer revision creates or replaces a waiting, unread record; reaching it by any path marks it handled; Clear deletes only handled records; removing a source deletes its record; a failed check keeps the record and the row's Update (REQ-004..010; DEC-015). Read, handled and cleared states persist in `<app-data>/update-notifications/notifications.json`.
- Changes reach open windows over `/ws/update-notifications`; the web Notification Center (pill on the Settings row, strip icon, floating panel) shows the rows, marks them read when opened and runs each kind's existing Update (package Update; skill Update after the existing confirmation; app Download → Install and restart). It never opens by itself (REQ-007, 011, 017; UI/UX spec).
- The desktop shell keeps the app record in `userData/app-update-notification.json`. The self-opening `AppUpdateNotice` card is removed, and startup-check errors are quiet. An isolated `e2e` instance checks a loopback generic feed only with `AUTOBYTEUS_ELECTRON_TEST_UPDATE_FEED_URL` (`isolated-app start --test-update-feed <url>`), with `releasePageUrl = null` (REQ-012, 019; DEC-001, DEC-016, DEC-017).
- Design escalation trigger still open: "electron-updater cannot check a generic test feed in a packaged isolated build".
- CR-001 (resolved): an unreadable skill-source registry hides only skill records and leaves package notifications working (`UPDATE_NOTIFICATIONS_SOURCE_UNAVAILABLE:<kind>`).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001..SCN-008.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - RUS-001 — app restart inside the 6 h window. Trigger: the user quits and relaunches. Expected: the scheduler's first pass makes no GitHub request for a recently checked source, and the records keep their read state (REQ-002, REQ-010).
  - RUS-002 — the user turns Update checks off, restarts, and later turns them back on. Expected: no automatic request while off (including after the restart), and the next tick after turning it on checks again (AC-015 "turning it back on resumes").
  - RUS-003 — RSC-001 from code review: a skill-source registry that cannot be read leaves package notifications working (CR-001).
  - RUS-004 — the app was downloaded and the user quits instead of pressing Install. The existing `autoInstallOnAppQuit = true` is preserved behavior; I record what happens, but it is not a new requirement.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded upstream.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-008 background checks (scheduler, 6 h, setting, gate) | Added | REQ-001..003, 013; DS-001, DS-006 | Unit tests use fake owners. Add an E2E over the real composition, owners, transport and gate; then a real-GitHub isolated instance |
| BEH-009 notification records, live feed, read/handled/cleared, panel | Added | REQ-004..011, 016, 017; DS-002, DS-003, DS-005, DS-007 | Real HTTP/GraphQL/WS E2E across restarts; isolated-instance UI journey |
| BEH-010 failed check keeps a known update | Changed | REQ-006; AF-06 | E2E offline pass; unit tests reused |
| BEH-001/003 on-open checks create notifications | Changed | DEC-011 | E2E manual check; instance Agent Packages open |
| BEH-002/003 update pipelines (+ per-package serialization) | Preserved | REQ-007, 015 | E2E update → handled; instance Update from the panel; IMP-03 reused |
| BEH-004/005/006 app update announced in the notification; card removed | Changed / Removed | REQ-012; DEC-001, DEC-016 | Packaged isolated instance with a test feed |
| BEH-007 isolated instances quiet unless opted in | Preserved + Added opt-in | REQ-019 | Instance without the flag (quiet), instance with the flag (checks) |
| Mobile client shows no notifications | Added gate | REQ-017, AC-018 | No existing test asserts the mobile gate. Add a durable web test |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Reconcile rules, scheduler, gate, capability, serialization | IMP-02, IMP-03, IMP-04, IMP-11 (unit, fake owners and transports) | Scheduler + real owners + real transport/gate together; restart semantics in one process lifecycle | Server E2E (real studio server) |
| API / transport / contract | Yes | GraphQL query/mutations, `/ws/update-notifications`, gate in `publicGitHubRequest` | GraphQL schema test (in-process `graphql()`), ws only via composition unit | Real HTTP GraphQL + WebSocket frames from a real check | Server E2E |
| Frontend component / state | Yes | Stores, panel, pill, card, confirmation | IMP-07 (component/store), IMP-10 rendered dev check | Desktop window with the real shell IPC and app row | Isolated desktop instance |
| Browser integration / user journey | Yes | Panel journeys | IMP-10 (browser, dev stack) | — (reused) | — |
| Authentication / session / permissions | Minor | ws remote-access auth reused | existing route pattern | None material | — |
| Desktop renderer / web-equivalent UI | Yes | Panel in the Electron window | IMP-10 browser | Embedded server binding, live update in the packaged app | Isolated desktop instance |
| Desktop shell / Electron-specific integration | Yes | `AppUpdater` record, generic test feed, IPC intents, launch profile | IMP-05 (mocked electron-updater), IMP-06 | Packaged `app.isPackaged` path; electron-updater generic provider against a real feed; MacUpdater/Squirrel download | Packaged isolated instance with `--test-update-feed` |
| Process / lifecycle | Yes | Scheduler start/close in `buildStudioServer`; restarts | unit (fake timers) | Real server start/close/restart | Server E2E + instance restart |
| Persisted-data transition | Yes (new files only) | `notifications.json`, `rate-limit.json`, `app-update-notification.json` | store/gate/record unit tests | Persistence across a real server restart | Server E2E restart; instance restart |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | GitHub REST (`api.github.com`), codeload, electron-updater feed | Controlled fetch in tests | Real GitHub answers (shape, headers, revisions); real hosts contacted | Isolated instance with real public repositories (ASM-001) + a connection log |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications`, branch `codex/settings-update-notifications`
- Project type and runtime stack: pnpm monorepo. Fastify/GraphQL/WS server (`autobyteus-server-ts`, Node 22, Prisma SQLite), Nuxt 3 web (`autobyteus-web`), Electron desktop shell (electron-builder, electron-updater)
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/TESTING.md` (root only; no closer `TESTING*.md` under the changed packages)
- Conflicting, missing, or unclear project instructions:
  - TESTING.md says nothing about update caches. The local worktree build has the installed app's bundle id (`com.autobyteus.app`) and updater cache names (`autobyteus-updater`, `com.autobyteus.app.ShipIt`). A real download through MacUpdater/Squirrel would write into the installed app's caches, which currently hold a staged update (`ShipItState.plist`, `autobyteus-updater/pending`, 2026-10-20 12:59). Under Rule 2, the app-download journey runs on a copy of the worktree build with its own bundle id and updater cache name, re-signed ad hoc. Deviation recorded in the report.
  - `docs/isolated-app-instances.md` names the browser-automation launcher; I use `playwright-core` `connectOverCDP` on the instance's `controlPort` (the same CDP endpoint, attach-only, never launching a browser).
- Required environment variables or secrets available: `N/A`. No secrets are needed: GitHub is used unauthenticated, as the product does.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, rules | Server E2E `vitest run <file>` with a clean env; isolated instance `isolated-app start --build/--from-worktree`; Rules 1–9; "Rerun by impact" |
| `docs/isolated-app-instances.md` | Isolated instance lifecycle | `--test-update-feed http://127.0.0.1:<port>` (generic feed: `latest-mac.yml` + artifacts); startup check 8 s after launch; no Release page link under the feed; `restart` keeps the option; stop/list cleanup |
| `autobyteus-web/package.json` | Build | `build:electron:mac` (guards, prepare-server, generate, transpile, electron-builder `--mac`; identity null → ad-hoc) |
| `autobyteus-server-ts/vitest.config.ts`, `tests/setup/*` | Server test harness | forks pool, Prisma global setup; e2e inherits the shell → run with `env -i` |
| `tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts` | Pattern | Real studio server via `startStudioE2eRuntimeServer`; only GitHub hosts controlled by a `fetch` stub that passes other URLs through |
| `autobyteus-server-ts/docs/modules/update_notifications.md` | Feature contract | Constants, records, gate file, owner-unavailable rule |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Packaged worktree build | worktree root | `pnpm -C autobyteus-web build:electron:mac` (built from `d76332c669` = code `c42bf2abc4`) | ~5.5 min; ad-hoc signed | `exit 0`; `electron-dist/mac-arm64/AutoByteus.app` | Build output is untracked; left in place |
| Isolated instance (real GitHub + test feed) | worktree root | `pnpm --silent isolated-app start --from-worktree --test-update-feed http://127.0.0.1:<feed>` | Own ports and data root | `start` JSON (`/rest/health` + window) | `isolated-app stop <id>`; `list` without it |
| Isolated instance (app download) | worktree root | `isolated-app start --app <temp copy with own bundle id> --test-update-feed …` | Copy in `/tmp/sun-api-e2e/` | same | stop; remove copy, its caches and its ShipIt dir |
| Generic update feed | `/tmp/sun-api-e2e/feed` | ticket-owned `node feed-server.mjs` on a free loopback port | Serves `latest-mac.yml`, the zip; logs every request | HTTP 200 on `/latest-mac.yml` | kill the owned pid |
| Connection monitor | — | ticket-owned sampler: `lsof -nP -a -p <pid> -iTCP` every 250 ms for the server and Electron main pids | No root needed | first sample | stops with the run |
| Server E2E | `autobyteus-server-ts` | `env -i PATH HOME=<tmp> TMPDIR pnpm exec vitest run tests/e2e/update-notifications --no-watch` | Test-owned temp data root; GitHub hosts controlled | vitest result | test removes its temp root |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| A real public GitHub agent package at an older installed revision | Imported through the instance UI from `https://github.com/AutoByteus/autobyteus-agents` (public; installed at HEAD `074dc24…`). Then, with the instance stopped, its own registry record is set to an older installed revision (`99c58fd…`) and a last check 7 h ago (ASM-001 "older installed revision in the isolated instance's test data") | Only the instance's own data root; the real repository is read-only | Data root removed with `stop` |
| A real public GitHub skill source at an older revision | Same, `https://github.com/blader/humanizer` (HEAD `8c307f3…`, older `6be1fa4…`) | same | same |
| App update offer | Ticket-owned generic feed offering `1.5.8` with release notes; zip = the same build | Loopback only | Feed stopped; files removed |
| Server E2E GitHub | Controlled `fetch` for `api.github.com`/`codeload.github.com` (fixture repos `un-e2e/agents`, `un-e2e/skills`) | No network | Temp root removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` (new files only; tolerant readers, exact writers)
- Design-spec and implementation-handoff references: design spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Representative existing-data setup and required behavior: existing package and skill registries, created by the real importers, must produce records at the first reconcile with no migration. The new files must survive a restart, and an unreadable skill registry must leave package records working (CR-001).
- Evidence planned: API-02/03/05 (server restart over the same data root), API-09 (registries written by a real import, then reconciled), reused IMP-02/IMP-11 (store, gate, owner-unavailable).
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/update-notifications/*.test.ts` | DS-007 table, owner-unavailable (CR-001), store, scheduler (fake owners/timers), capability | REQ-001..013; AC-008..015 | Still Valid | IMP-02, IMP-11 | Reuse |
| `tests/unit/integrations/github/github-rate-limit-gate.test.ts` | 403/429 headers, persistence, refusal, codeload not gated | REQ-003, AC-013 | Still Valid | IMP-02 | Reuse |
| `tests/unit/api/graphql/update-notifications-schema.test.ts` | Renderer documents over the real schema; CR-001 GraphQL | REQ-004, 009, 013 | Still Valid | IMP-11 | Reuse |
| `tests/unit/compositions/update-notifications-composition.test.ts` | Wiring with fakes | DS-001/002 | Still Valid | IMP-02 | Reuse |
| `tests/unit/agent-packages/*`, `tests/unit/skills/*` | Split, serialization race, projection, listener, `canUpdate` | BEH-002, 010 | Still Valid | IMP-02, IMP-03 | Reuse |
| `tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts` DCF-E2E-005 | GitHub package updates only on Update | REQ-015 | Still Valid (unchanged by this ticket) | — | Out Of Scope, used as a pattern |
| `tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts` | Skill check/update through GraphQL | BEH-003 | Still Valid | IMP-04 covered unit only; this file was not in IMP runs | Run as a regression (API-01b) |
| `autobyteus-web/electron/updater/__tests__/*`, `launch-profile/__tests__/*` | Record, re-check before download, release page, test-feed parsing | REQ-012, 019; AC-003 link, AC-007 | Still Valid | IMP-05 | Reuse |
| `autobyteus-web/scripts/isolated-app/__tests__/cli.node-test.mjs`, `electron-launch/__tests__/*` | `--test-update-feed` parsing, env passing | REQ-019 | Still Valid | IMP-06 | Reuse |
| `autobyteus-web/components/notifications/__tests__/*`, `stores/__tests__/*`, `components/settings/__tests__/UpdateChecksCard.spec.ts`, `components/skills/SkillSourceRow.spec.ts`, `__tests__/app.spec.ts` | Panel, stores, card, row `canUpdate`, card removed | AC-002, 006, 009..011, 016 | Still Valid | IMP-07 | Reuse; extend `app.spec.ts` for the mobile gate |
| Removed `components/app/__tests__/AppUpdateNotice.spec.ts` | Self-opening card | Removed by DEC-001 | Stale / Remove (already removed by implementation) | design Removal Plan | None |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | — | server `src` typecheck | Reused | IMP-11 (typecheck at `c42bf2abc4`) | Ran on the validated code commit |
| API-R02 | AC-008..015 (unit), CR-001 | server notification/gate/owners unit | Reused | IMP-02 + IMP-11 | IMP-11 reran the changed service's tests at `c42bf2abc4`; the other IMP-02 files exercise no changed code (`git diff --name-only 71cfcd7d32 c42bf2abc4` = service, its test, the schema test, the doc) |
| API-R03 | BEH-002 | package serialization race | Reused | IMP-03 | Code unchanged since `da74c13406` (`agent-package-service.ts` not in later diffs) |
| API-R04 | AC-003 link, AC-007, AC-017 (shell) | Electron main tests | Reused | IMP-05 | No `autobyteus-web` file changed after `71cfcd7d32` |
| API-R05 | REQ-019 | isolated-app / launch env scripts | Reused | IMP-06 | same |
| API-R06 | AC-002, 006, 009..011, 016, 018 (browser) | web unit/component | Reused | IMP-07 | same |
| API-R07 | AC-019 | localization/web guards | Reused | IMP-08; also re-run by `build:electron:mac` | same |
| API-R08 | AC-002, 004, 010, 011, 016, 018 (browser), 019 | rendered browser check | Reused | IMP-10 | Web code unchanged since that check |
| API-01 | regression | whole server unit suite at the head | Existing Test | `pnpm -C autobyteus-server-ts test:unit` | IMP-04 ran on `71cfcd7d32`; rerun once on the validated commit as the green-suite check |
| API-01b | BEH-001/003 preserved | existing package/skill GitHub E2E | Existing Test | `vitest run tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts` (clean env) | Owners changed (split, listener, serialization); these real-schema suites were not in IMP runs |
| API-02 | AC-001 (server), AC-004 (feed), AC-014, AC-017, AC-021 (server) | real studio HTTP/GraphQL/WS + composition + owners + gate + store | Durable | `update-notifications-live.e2e.test.ts` "background pass" | The real scheduler → owners → transport → reconcile → hub chain has never run end to end |
| API-03 | AC-009, AC-010, AC-014, RUS-001 | restart over the same data root | Durable | same file, "restart" | Persistence across a real server restart |
| API-04 | AC-008, AC-012 | on-open manual check; offline background pass | Durable | same file | Same record replaced; failed check keeps the update |
| API-05 | AC-005 (server), AC-009, AC-011, AC-017 | update → handled; Clear; removal; restart | Durable | same file | The handled/clear lifecycle through the panel's mutations |
| API-06 | AC-015, RUS-002 | setting off/on, across restart | Durable | same file | No automatic request while off; resumes |
| API-07 | AC-013 | rate-limit stop through the real transport and scheduler, across restart, resume after reset | Durable | same file | Gate + scheduler + owners together |
| API-08 | AC-018 (mobile) | web `app.vue` mobile gate | Durable | `autobyteus-web/__tests__/app.spec.ts` new case | No test covered the mobile gate |
| API-09 | AC-001, AC-002, AC-004, AC-021, AC-017 | packaged isolated instance + real GitHub repos + connection log | Journey | Import both via UI; shape older installed revision + 7 h old check in the instance's own data; restart; wait on Settings; observe pill/panel/compare link; sample connections | The real-GitHub, real-shell proof the requirements ask for |
| API-10 | AC-005, AC-006, AC-017 | Update from the panel in the instance (real GitHub archive) | Journey | Package Update → progress → handled, row up to date; skill Update → confirmation; Cancel changes nothing; confirm → handled | Real pipeline from the notification |
| API-11 | AC-009, AC-010 | instance restart persistence | Journey | Restart; read and handled states kept; Clear; restart; stays cleared | Shell + node persistence in the product |
| API-12 | AC-015, AC-016 | Update checks card in the instance | Journey | Turn off; restart; wait past 60 s with no `api.github.com` connection; open Agent Packages → notification created; text check en | Real setting in the product |
| API-13 | AC-003, REQ-019, escalation trigger | packaged generic test feed | Journey | Instance with `--test-update-feed`; app row current → new, notes, no Release page link; no card; feed log shows only metadata before any press | Open design escalation trigger |
| API-14 | AC-007, RUS-004 | app Download via MacUpdater/Squirrel | Journey | Copy with own bundle id; Download → progress → "Install and restart" offered; zip requested only after the press | Real shell download path without touching the user's caches |
| API-15 | AC-003 alternate, BEH-007 | instance without the opt-in | Journey | `isolated-app start --from-worktree`; `getAppUpdateState` = disabled; no app row; no feed contact | Quiet default |
| API-16 | AC-012 | offline in an isolated instance | Journey | — | Planned only as a feasibility check (see Not Tested); not run |
| API-17 | CR-001, QR-005 | real server start with an unreadable skill registry | Durable | `update-notifications-live.e2e.test.ts` (added during the run) | RUS-003 at the real server boundary (unit/GraphQL-only before) |
| API-18 | AC-011 | source removal at the real server | Durable | same file (added during the run) | Removal through the renderer's documents |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-02..API-07, API-17, API-18 | `autobyteus-server-ts/tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` (builds the GraphQL schema once per process: type-graphql rebuild trap, FU-004) | First test of the real server chain (composition, scheduler timer, owners, transport/gate, store, hub, GraphQL documents of the renderer) with controlled GitHub; runs ungated and offline |
| API-08 | `autobyteus-web/__tests__/app.spec.ts` (new case) | AC-018 mobile has no test |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron (electron-builder, electron-updater MacUpdater + Squirrel.Mac), embedded server.
- Testing guideline, README, or development instructions used: TESTING.md (Rules 1–9), `docs/isolated-app-instances.md`.
- Web-equivalent behavior: the panel, rows and card. Reused IMP-10 browser check; re-observed in the packaged window.
- Shell-specific or lifecycle behavior: the packaged `app.isPackaged` startup check against a generic feed, IPC intents (mark read, clear), the app record in `userData`, MacUpdater download, restart persistence.
- Chosen validation approach and why it fits the project: isolated instances of the current worktree build (TESTING "desktop-shell behavior … + an isolated desktop instance").
- Server/frontend setup when browser validation is used: N/A (packaged instance).
- How the run avoids disturbing an already-running desktop application: only isolated instances started by this run, on their own ports and data roots. The other worktree's instance `iso-56551-47f6` is left alone. The download journey uses a copy with its own bundle id and updater cache, so the installed app's staged update is not touched. "Install and restart" is not pressed in an instance, because ShipIt would relaunch the app outside the `e2e` profile against the user's real data.

## Live Environment And Fixture Plan

- Startup order and commands: feed server → `isolated-app start --from-worktree --test-update-feed <feed>` → connection sampler → CDP driver.
- Environment choices that materially affect the run: real `api.github.com`, unauthenticated (shared IP budget; checked before the run with `/rate_limit`, which does not count); locale en.
- Health / readiness checks: `start` JSON; `/rest/health`; DOM ready.
- Seed data / fixtures: as in the data table.
- Test identities, authentication, permissions, or session state: none.
- Requirement-linked journeys or scenarios: API-09..API-15.
- DOM, screenshot, log, API, process, or other evidence to capture: DOM/state JSON per step, screenshots, GraphQL `updateNotifications` snapshots, feed request log, connection sample log, instance log excerpts.
- Owned processes and temporary state to clean up: instances (stop), feed server, sampler, `/tmp/sun-api-e2e/*` copies and caches, the copy's ShipIt/updater caches.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-012 in an isolated instance (network off) | The embedded server's `fetch` ignores proxy variables, so the instance can only be taken offline by changing host networking (pf/firewall, root), which this run must not do | Low: the failed-check path is identical code; covered by API-04 over the real server and the real owners | No | None |
| Pressing "Install and restart" in an instance (AC-007 install) | ShipIt relaunches the app outside the `e2e` profile, against the user's real data (Rule 2) | Low: `installUpdateAndRestart` → `quitAndInstall` only when `downloaded` is covered by Electron tests (IMP-05); a signed install is the user's beta check (design Risks) | Yes (signed install on a real feed) | Delivery takes it to the user |
| AC-003 Release page link with the real GitHub feed | DEC-017: no link under the test feed | Covered by Electron tests (IMP-05); real feed is the user's beta check | Yes | Delivery |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| No update indicator on Settings pages (the Settings layout has no Settings row); AC-004 is met as the approved design defines the indicator | Not a reroute; Product question noted for the Solution Designer | `evidence/API-09-real-github-background-pass.txt` (window on `#/settings` after the pass: `pills: []`) | Solution Designer (informational, via the handoff chain) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: The packaged build was made before writing this plan, from `d76332c669` (code `c42bf2abc4`). The build is the only product work started before the plan.
