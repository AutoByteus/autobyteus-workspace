# API/E2E Coverage Investigation — Part 1: the restart reminder

> Rename note (implementation, IR-006, delivery DR-003): part 2's phone probe case is now **MSP-73** (it was MSP-59, then MSP-67; autobyteus-483 and autobyteus-522 took those IDs on later bases). Rows below that say MSP-67 for part 2's case mean MSP-73; evidence file names keep the ID they were recorded under.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved; SR-003 clarifications)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-003)
- Design Spec: `design-spec.md` (Ready, SR-003, part 1)
- Supplemental Task Artifacts: `architecture-design-handoff.md` (no behavior-defining supplements)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md` (after the first result)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer, CRR-001 Pass (2026-11-17); code reviewed `4cbf9e7881..d5e9f350cf`
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/` unless they start with the ticket folder's files.

## Current Requirement And Design Basis

Part 1 (UC-001). While the node runs, `BusyRunRecorder` keeps `<appData>/restart-resume/busy-runs.json` as the live list of root-held runs that are mid-turn or idle with a running background task (checked every 2 s, written on change, `shutdownAt` added at a graceful stop; Codex idle runs only at the graceful stop). At the next start, `RestartResumer.takePreviousSession()` gives each entry a cause (`update`: release differs; `restart`: `shutdownAt` present; `unexpected_stop`: none), stores all as pending reminders in `restart-reminders.json`, removes the record and prunes closed-Task and non-present roots. A reminder (`[Platform notice — application restarted]`, DEC-003 text with date and UTC) is delivered once: as the preface of the run's next input, or for update entries by the wake after recovery (claim, post first-input-only, settle). Critical criteria: AC-001 (before/after; three causes), AC-002, AC-004 (exactly once; closed/archived get none). AC-003 per runtime.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 to SCN-004 (part 1). SCN-005/006 belong to part 2 (not built).
- Real-use scenarios added:
  - RU-01: the desktop app's own quit and relaunch (the app stops its embedded server): the cause must read "a restart", which needs the app's quit to reach the server's graceful cleanup.
  - RU-02: an idle run with no background task (control): never recorded, never reminded.
  - RU-03: a second input after the reminder carries none (told once).
  - RU-04: a record written by the release before this change (mid-turn entries, no `backgroundTasks`/`shutdownAt`) read by this build (persisted-data direct use).
- Unsupported/contrived: none recorded.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 update restart, mid-turn | Changed (reminder text, background line) | design DS-002/003 | built-server E2E with a release-stamped previous session |
| BEH-002 update restart, idle with a background task | Added | DS-001..003 | same |
| BEH-003 graceful non-update restart | Added (reminder with next input) | DS-004 | built-server E2E (SIGTERM) and the desktop app's quit/relaunch |
| BEH-004 crash / kill | Added | DS-001, DS-004 | built-server E2E (SIGKILL), record age |
| Startup order (take before listen) | Changed | `server-runtime.ts` | every restart case; startup E2E suites |
| `busy-runs.json` shape | Changed (Directly Usable) | design | DRO E2E (old-shape record) |
| `restart-reminders.json` | Added | design | E2E reads it between sessions |
| `AgentRun.hasRunningBackgroundTasks()` | Added facade | design | per runtime: native, AGY (scripted), Claude (live), Codex (inspection) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence | Material Risk Not Exercised | Candidate Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | recorder, cause rule, reminder service, resumer | IMP-02 (119 tests, one integration through a real `AgentRun`) | real process restarts, real file timing, real runtimes | built-server E2E |
| API / transport / contract | Yes | what the model/runtime receives as input; `SYSTEM_TASK_NOTIFICATION` | unit | the real dispatch to each runtime | E2E reading what the model/CLI receives |
| Frontend component / state | No | — | — | — | — |
| Browser / user journey | Yes (existing notice card shows the reminder) | none changed | — | the reminder in the real conversation after a real app restart | isolated desktop instance |
| Desktop shell / lifecycle | Yes (indirect) | the app's quit must reach the server's graceful cleanup | none | cause wording after a real quit | isolated desktop instance (`restart`) |
| Process / lifecycle | Yes | graceful stop write, crash, startup order | unit with fakes | SIGTERM/SIGKILL of the real server | built-server E2E |
| Persisted-data transition | Yes | `busy-runs.json` (Directly Usable), new reminders file | unit | old-shape record through the built server | DRO E2E |
| Worker / distributed | Yes | delegated runs resumed bottom-up; closed-Task fence | unit; DRO E2E | — | DRO E2E |
| External integration | Yes | Claude CLI, Codex app-server, AGY | unit | real runtimes report background tasks | per-runtime E2E |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice`, branch `codex/background-task-restart-notice`
- Stack: pnpm monorepo, Node 22.23.1 (TESTING.md: Node 22), vitest 4
- Testing guideline: `/TESTING.md` (re-read 2026-11-17; new since my last ticket: both typechecks for any TypeScript change; Node 22; gated clients updated when what they rely on changes)
- Changed build-input paths: `None` (src, tests, docs only). No fresh-start build case.
- Secrets available: test vault READY (values never read); Claude and Codex CLIs signed in on this machine

| Instruction / Configuration Path | Purpose | Learned |
| --- | --- | --- |
| `/TESTING.md` | guideline | both typechecks; `test:integration:prepare` + `test:integration`; built suites need `pnpm -C autobyteus-server-ts build`; E2E with `env -i`; one heavy run at a time; isolated instance for the real journey |
| `autobyteus-server-ts/tests/e2e/helpers/built-studio-roots.ts` | built-server pattern | `dist/app.js --data-dir <root> --host 127.0.0.1 --port 0` with `builtServerLaunchEnvironment()`; restart = stop and start on the same root |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | scripted AGY | `BACKGROUND_STEP:{"seconds":N}` leaves a daemon step open (a background task); `ECHO_INPUT` replies with the exact input |
| `autobyteus-server-ts/scripts/write-release-identity.mjs` | release stamp | `dist/release-identity.json` decides the update cause |
| `docs/isolated-app-instances.md` | desktop | `start --build`, `restart`, `stop`; test vault for real models |

| Component | Working Directory | Setup | Notes | Readiness | Cleanup |
| --- | --- | --- | --- | --- | --- |
| Server build (this branch) | worktree | `pnpm -C autobyteus-server-ts test:integration:prepare` | also integration prerequisites | `check` passes | untracked outputs |
| Base build (before) | own worktree at `4cbf9e7881` | `git worktree add`, `pnpm install --frozen-lockfile`, server build | release stamp 1.5.13-beta.8 | `dist/app.js` | worktree removed after |
| Built server sessions | test-owned data root | spawned by the suite | own ports, DB, HOME | GraphQL answers | SIGTERM/SIGKILL; root removed |
| Previous release (update) | copy of `dist/` inside the server package, stamped `1.5.13-beta.7` | made by the suite | the only difference that decides the cause is the stamp | GraphQL answers | removed |
| Scripted LM Studio model | in the suite | `LMSTUDIO_HOSTS` | records what the model received | catalog | closed |
| Isolated desktop instance | worktree | `isolated-app start --build` with the test vault | real app quit/relaunch | `start` receipt | `stop`, `list` empty |

| Data / Identity | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| Agent definitions, runs | GraphQL on each test node | test-owned data root | root removed |
| Previous-release record (RU-04) | DRO fixtures (hand-built released shapes) | never real data | removed |
| Provider keys | test vault (read-only) | never logged | — |

## Persisted Data Transition Coverage Basis

- `busy-runs.json`: `Directly Usable — No Migration`. Representative old data: the DRO E2E's hand-built released record (mid-turn entries, no new fields) read by the built server; IMP-02's reader test.
- `restart-reminders.json`: `Not Affected` (new transient). Evidence: read between sessions in the E2E.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/restart-resume/*`, `tests/integration/restart-resume/restart-reminder-preface.integration.test.ts`, startup-order and facade tests | recorder, cause, service, resumer, preface | REQ-001..005, AC-004 (local) | Still Valid | IMP-02 | reuse |
| `tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts` (DRO-1, DRO-3) | built server reads a released busy-run record: P resumed (update entry), closed-Task P not resumed | REQ-005, BEH-001, persisted shape | Still Valid (its record is the old shape; the resumer changed) | not run on this branch | run |
| `tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts` | SIGTERM with a busy run, relaunch on the same data | graceful write + take at relaunch | Still Valid | not run | run |
| Server `test:integration` (full) | regression | — | Still Valid | not run | run |
| Server unit (full) | regression | — | Still Valid | IMP-03 at `d5e9f350cf` (4 failures in the unrelated watcher test, FU-001) | reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | — | server typecheck | Reused | IMP-01 | ran on `d5e9f350cf`; no code change since |
| API-R02 | REQ-001..005 local | restart-resume units + integration | Reused | IMP-02 | same |
| API-R03 | regression | server unit full | Reused | IMP-03 | same; its 4 failures are FU-001 with a recorded cause |
| API-01 | regression | server in-process integration | Existing Test | `pnpm -C autobyteus-server-ts test:integration` | never run on this branch |
| API-02 | — | web typecheck (TESTING.md: both typechecks) | Existing Test | `pnpm -C autobyteus-web typecheck` | not run by implementation |
| API-03 | REQ-005, BEH-001, RU-04 | built server, released record | Existing Test | DRO E2E (`RUN_AGY_FAILURE_E2E=1`, scripted AGY) | old-shape record through the new take |
| API-04 | REQ-001, BEH-003 | built server SIGTERM + relaunch | Existing Test | busy-run-stop-now E2E | graceful write and take |
| API-05..API-11 | AC-001 (after), AC-002, AC-003 (native, AGY), AC-004 (exactly once, input vs wake), crash timing, RU-02, RU-03 | built server sessions, scripted LM Studio model and scripted AGY | Durable | new `tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` (gate `RUN_RESTART_REMINDER_E2E=1`) | real processes, real files, real restarts; reads what the model and the CLI received |
| API-12 | AC-001 (before) | same scenarios on the base build | Temporary Probe | the new suite with `RESTART_REMINDER_SERVER_DIR=<base build>` | the base cannot carry the new suite; its failures are the before evidence |
| API-13 | AC-003 (Claude, live) | built server + real Claude CLI | Durable (gated live) | case in a live file | a real runtime reports a background task |
| API-14 | AC-003 (Codex, graceful stop) | built server + real Codex app-server | Durable (gated live) or Not Tested | case in the live file, if Codex leaves a background terminal on request | the Codex inspection path is async and bounded |
| API-15 | AC-001 user journey, RU-01 | isolated desktop instance, real model | Journey | native agent idle on a background command; `isolated-app restart`; next message; reminder card; the agent acts | real app quit reaches the graceful path; the success definition |
| API-16 | AC-003 (Grok Build / DeepSeek ACP) | — | Not runnable as live | — | `dsh` not installed; ACP backends report no background tasks by construction (unit), so a mid-turn ACP run takes the same path as any mid-turn run (API-08) |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why |
| --- | --- | --- |
| API-05..11 | `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` | no test restarts a real node to prove the record, the cause and the delivery |
| API-13/14 | same file, live cases RR-07/RR-08 under `RUN_RESTART_REMINDER_LIVE_E2E=1` (changed at execution: they share the file's node and restart helpers) | real runtimes' background-task facts across a restart |

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Shell: Electron with the embedded server; web-equivalent part: the existing system notice card.
- Shell-specific: the app's quit and relaunch stopping and starting its server (cause wording).
- Approach: isolated instance of this worktree's build; driven like a user through browser automation attached to its control port; `isolated-app restart` for the quit/relaunch.
- Never touches the user's app or data.

## Live Environment And Fixture Plan

- Order (one heavy run at a time): this build → integration → typechecks → DRO and busy-run E2E → new suite → base build and probe → live runtimes → desktop.
- Evidence: model/CLI inputs, record and reminder files between sessions, WS frames, server log lines, screenshots.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| Grok Build / DeepSeek (ACP) live | `dsh` not installed; ACP reports no background tasks by construction | low: same mid-turn path | No | — |
| Power loss | not reproducible; a SIGKILL is the same "no graceful end" for the record | low | No | — |
| Part 2 (status shown, AC-005/006) | built (IR-003/IR-004); see the Part 2 section | BTS-01..05, PBS-01, TS-008, MSP-59, P2-10 | Yes | round 3 (API-REV-003) |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable coverage added: `Yes`
- Reroute Required: `No` (before execution)
- Updated after execution (round 1): F-1 found by RR-02 (after a forced kill the background command keeps running while the reminder says it was stopped): `Requirement Gap`, routed through the failure-origin review. FU-002 recorded (pre-existing turn-id reuse after a restore makes the reminder card show twice). API-01's watcher failures traced to a saturated `fseventsd` (environment).

## Round 2 Plan (API-REV-002)

- Trigger: CRR-003 Pass; IR-002 `b78555d7bb` (DEC-008). Changed paths since round 1 (`cf5ce8d109..92f4a1b3a6`): `restart-notice.ts`, its unit test, RR-02's assertion in my suite (by the implementation engineer), ticket documents.
- Stale tests made untrue by the change: searched `autobyteus-server-ts/tests`, `autobyteus-ts/tests`, `autobyteus-web`, `test-support` (gated files included) for the old line and the unexpected-stop cause; only RR-02 asserted the old line (rewritten, reviewed correct).
- Rerun: RR-01..08 (every case builds a reminder through the changed function), API-03 DRO (its update wake builds one), both typechecks.
- Still valid: API-04 (delivers no reminder), API-12 (base unchanged), API-15 (only the restart text, unchanged, reproved by RR-01/07/08).
- New: API-18 (RR-09), the reviewer's optional live check: a native agent on a real model after a kill reacts to the DEC-008 line.

# Part 2 — Show an agent with a running background task (round 3, API-REV-003)

## Basis

- Trigger: code reviewer, CRR-006 Pass (part 2: CRR-005 full review, round 5 CR-002 fix). Code `895cf3992d..ce06c415cc`.
- Requirements: REQ-006, REQ-007, AC-005, AC-006, DEC-004 (wording and styling), DEC-005 (delivered at once). Design `design-spec.md` "Part 2" (SR-006), the example sequence (SR-006) and the display rule. Implementation handoff (IR-003/IR-004), its Checks IMP-05..IMP-15 and Downstream Coverage Hints.
- What must be proven: every status route (stream, collaboration presentation and the Org view's status list, `/ws/run-status` per agent and summed per run state, team stream, peer summary) carries `background_tasks_running`; the web shows an idle agent with tasks as "Background task running" / "N background tasks running" with a steady blue dot and no Stop, a turn as "Running", back to Idle at the end; Team row busy > background > error > idle > offline; zh-CN; snapshots on reload/reconnect; Codex idle with a background terminal stays Idle, ACP unchanged; a message is delivered at once.

## Real-use scenarios

- SCN-005, SCN-006 (designer). Added: RU-05 a user reloads the window or the client reconnects while a task runs; RU-06 a second background task (the count text); RU-07 a Team with members in different states; RU-08 the user's language is Chinese; RU-09 a delegator on another node watching its peer run.

## Changed surfaces

- Contracts (three packages, strict schemas: a required field on every status shape): build input → fresh-start build proof.
- Server domain and five routes; six backends (boolean removed; part 1's recorder now reads the derivation → part 1's restart suite reruns).
- Web desktop and phone status surfaces, localization.
- What test clients rely on changed (`AGENT_STATUS` gained a required field): searched every test folder, gated files included: the probes that build status frames (`background-agent-renderer-contention.page.vue`, `agent-org-draft-retention.page.vue`, `interrupt-result-presentation-probe.mjs`) carry the count; the server E2E files that read statuses compare status words only (e.g. `delegated-team-lazy-member-activation` maps `{status}` before `toEqual`); the web unit fixtures were updated by the implementation (IMP-12).

## Planned Cases (part 2)

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| P2-R01 | wire schemas | contract packages, both typechecks, remote-collaboration units | Reused | IMP-15 | ran at the final code (after CR-002) |
| P2-01 | regression | server unit (full) | Existing Test | `pnpm -C autobyteus-server-ts test:unit` | IMP-07 was before the fixture fixes; IMP-08 a subset |
| P2-02 | regression | server integration (full) | Existing Test | `test:integration:prepare`, `test:integration` | IMP-09 before `2990b6a8ac` |
| P2-03 | regression, AC-005/006 (web) | web unit (full) | Existing Test | `pnpm -C autobyteus-web test:nuxt run` | IMP-12 before the web fix `e259944b13` |
| P2-04 | localization, boundaries | web guards | Existing Test | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | cheap; after the last web commit |
| P2-05 | regression | server E2E suite | Existing Test | `pnpm test:e2e` | requested; every status route changed |
| P2-06 | build input | fresh clone, frozen install, the desktop release job's build | Existing Test | TESTING.md "Fresh-start build" (macOS arm64) | contract packages changed |
| P2-07 | REQ-006 per route and runtime, AC-006, RU-05/06/07 | in-process server, real routes, strict feed parsing | Durable | new `tests/e2e/runtime/background-task-status-count.e2e.test.ts`: BTS-01 native sequence, feed, reconnect, message at once, counts 2/1/0; BTS-02 Team sum; BTS-03 Antigravity; BTS-04 Claude (live); BTS-05 Codex (live, count 0) | no test drives the count through the real routes per runtime |
| P2-08 | AC-005 desktop and phone | browser probe and phone probe (changed by this ticket) | Existing Test | `test:e2e:team-status-live --cases TS-008`; `mobile-shell-probe.mjs --cases=MSP-59` | rerun at the final code |
| P2-09 | probes this ticket changed | `interrupt-result-presentation-probe`, the renderer-contention and Org draft-retention probes | Existing Test | their package scripts | their fixtures and probes changed |
| P2-10 | AC-005/006 user journey, RU-05/06/08 | isolated desktop instance, native agent on a real model | Journey | list row and header "Background task running", steady blue dot, no Stop; a message while the task runs (header "Running", then back); two tasks "2 background tasks running"; reload; zh-CN; Idle at the end; the Background Tasks panel header (the implementer's "Current count unavailable" note) | the real app |
| P2-11 | RU-09 peer | two built nodes paired, delegation to the peer, the peer run idle with a task | Durable or Journey | decided after reading the two-node suite | the peer summary route |
| P2-12 | part 1 regression | restart suite RR-01..09 | Existing Test | as round 2 | the recorder now reads the derivation |
| P2-13 | ACP unchanged | — | Not runnable live | — | `dsh` not installed; ACP reports `unsupported` → 0 (unit) |

## Part 2 outcome (round 3)

- Executed as planned, with these differences:
  - P2-11 became durable (PBS-01).
  - P2-07a was added: a failed Team member and a direct read of the presentation route were tried live. Neither was reachable or meaningful, and the reasons are in the report.
  - P2-13 is Not Tested.
- Result: Pass, 94%. See `api-e2e-execution-coverage-report.md`, section "Part 2".

# Part 2 on the merged base (round 4, API-REV-004)

## Basis

- Trigger: CRR-008 Pass (targeted delta `b9caddc57e..a9e5676630`). The merge `990ff9a3d4` brings in origin/personal at `ff13782f36` (71 commits: autobyteus-483 end reasons and exit codes, 458 phone run Settings, 515 native tool search). `ca1979b206` adds 483's fields to the test doubles. IR-005 is the implementer's evidence: IMP-16..IMP-20.
- What the merge touches in my earlier cases:
  - 483 changes the background-task domain, the native, Claude and AGY task ends, and the background task view. These are the count's inputs, so BTS-01..04, the end paths and RR (whose recorder reads the same tasks) are affected.
  - 458 adds a phone Settings screen that uses the phone status-line builder.
  - The contract packages were rebuilt, so the built servers are rebuilt too (PBS-01, RR).
  - 515 changes what the native requests carry; my scripted model ignores the tool list, and BTS-01 shows the effect.

## Planned cases

| Case | Covers | Surface | Kind | Command | Why |
| --- | --- | --- | --- | --- | --- |
| R4-R01 | typechecks, contract tests, server unit, server integration, web unit, fresh-start build, TS-008, MSP-59 (483) | — | Reused | IMP-16..IMP-20 | ran at `ca1979b206`; the only later commit is docs |
| R4-01 | part 2 on the merge: native, Team, AGY | in-process server | Existing durable | BTS-01..03 | the reviewer asked for them |
| R4-02 | 483's ends beside the count: exit code, signal, run_ended; the view and the notice keep the end | in-process server, native | Durable (new BTS-06) | BTS-06 | the reviewer asked for it; no case had combined the ends with the count |
| R4-03 | Claude's ends (483 changed them) with the count | live Claude | Existing durable | BTS-04 | `claude-background-task-end.ts` changed |
| R4-04 | peer route on the merged build | two built nodes | Existing durable | PBS-01 | contracts rebuilt |
| R4-05 | phone: run screen, row and the 458 Settings screen | phone probe | Durable (MSP-73 (was MSP-67) extended) | `mobile-shell-probe.mjs --cases=MSP-73` | the Settings screen had not been exercised end to end |
| R4-06 | 483's panel shows the end beside part 2's header | browser probe | Existing | `background-tasks-panel-probe.mjs` (483) | the panel and the header read the same tasks |
| R4-07 | part 1 on the merge | restart suite RR-01..09 | Existing durable | as round 2 | the recorder reads 483's tasks |
| R4-08 | typecheck of my changed suites | server tests | Existing | `pnpm -C autobyteus-server-ts typecheck` | BTS-06 added |
| R4-09 | Codex | live Codex | Not rerun | — | the Codex task code did not change in the merge; only `codex-thread-bootstrapper.ts` (515) |

## Round 4 outcome

- Executed as planned. Pass, 94%. See the report section "Part 2 on the merged base".
