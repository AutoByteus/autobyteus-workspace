# API/E2E Coverage Investigation — phone-background-tasks-473 (autobyteus-473): the phone's Activity shows the open agent's background tasks; a late viewer sees current tasks

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001; REQ-001…004, AC-001…005)
- Investigation Notes / Solution Revision Record / Design Spec: `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`
- Design Review Report: `design-review-report.md` (R-1, R-2)
- Implementation Handoff: `implementation-handoff.md` (IR-001, assumptions 1–6)
- Code Review Report: `code-review-report.md` (CRR-001, Pass; C-03 / RSK-001 accepted)
- API/E2E Revision Record: `api-e2e-revision-record.md`; current revision `API-REV-001`
- Current Investigation Round: 1
- Trigger: Code Reviewer CRR-001 Pass; code `f33b3c772a`, handoff `66f87db2b5` + `9b921e9489`, base `origin/personal` @ `931a1feeb6`

## Current Requirement And Design Basis

An event-stream run's background-task view now carries its current tasks (`current()` on the inspection contract: Claude running and ended, Antigravity running only, AutoByteus every task its manager knows, `[]` before the manager exists), exposed as `AgentBackgroundTaskEventStream.tasks`. The web store seeds them (`seedTasks`: add unknown tasks, end a running task the answer shows ended, never replace an ended one) through the shared composable the desktop panel uses. The phone's Activity shows a "Background tasks" section above the tool calls (description or command, status, end summary, start time, newest first, live, read-only); no section for runtimes that report none.

## Supported Scenarios And Real Usage

- From the requirements: UC-001 (phone Activity section), UC-002 (a late viewer sees running tasks).
- Real-use scenarios added:
  - RU-01: the owner's Android app paired with a node; a Claude agent the owner asked to run a command in the background; the owner opens the run's Activity on the phone later.
  - RU-02: while Activity is open, the agent starts another background command (another client sends it).
  - RU-03: the phone loses its connection while a task ends, then comes back (`online` re-read, the reconnect repair).
  - RU-04: the desktop window of that node is reloaded while the task runs.
- Technically possible but unsupported: none recorded.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Changed Boundary | Repository Evidence | Material Risk Not Exercised | Candidate Broader Validation |
| --- | --- | --- | --- | --- | --- |
| Server domain / API | Yes | `current()` per runtime, GraphQL `tasks` | IMP-02, IMP-03, IMP-04 (AutoByteus end to end, scripted model) | Claude's `current()` with the real CLI's frames | live Claude run |
| Web store / composable | Yes | `seedTasks`, seeding in the shared composable | IMP-06, IMP-12 | — | — |
| Phone UI | Yes | `MobileActivity`, `MobileBackgroundTasks` | IMP-11 (MSP-44…46, scripted AGY in Chrome) | the Android app's WebView; a real runtime; offline/online | emulator |
| Desktop panel | Yes (seeding) | the shared composable | IMP-11 MSP-46 (AGY) | a Claude run's view after a reload | browser desktop window |
| Android shell | No | — | — | — | — |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-background-tasks-473`, branch `codex/phone-background-tasks-473`
- Testing guideline: `TESTING.md` (Gates and real-provider runs: run them when the change needs real-provider proof; signed-in CLIs need the real HOME, USER, LOGNAME; Android emulators: own AVD, own port, headless, deleted afterwards; browser probes: a node told the frontend's exact origin, the dev proxy with `AUTOBYTEUS_DEVELOPMENT_OWNER_CREDENTIAL`)
- The repository's live Claude suites (`tests/e2e/runtime/claude-*-background-task.e2e.test.ts`) use the local Claude login, model `haiku`, runtime `claude_agent_sdk` (`RUN_CLAUDE_E2E=1`); the same login and model are used here (a few cents; each run adds its sessions to the user's Claude history, reported)
- Changed build-input paths (`git diff --name-only 931a1feeb6...HEAD` vs TESTING.md's list): `autobyteus-web/generated/**` (`generated/graphql.ts`) → a fresh-start build case is required (FS-01)
- Secrets: the local Claude login (not read, not printed); no keys

| Component | Start / Setup | Readiness | Stop / Cleanup |
| --- | --- | --- | --- |
| Server `dist` and phone bundle of this branch | `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web` | build logs | — |
| Debug APK | `./gradlew :app:assembleDebug` (no Android change) | APK | — |
| Host node | `dist/app.js`, temp data root, launch credential, real HOME/USER/LOGNAME for the Claude login, `AUTOBYTEUS_ALLOWED_ORIGINS` = the dev frontend | `/rest/health` | SIGTERM, root removed |
| Emulator | own AVD (android-35), headless, port 5640, `adb root` for input | boot | killed, AVD deleted |
| Desktop window | `nuxt dev` of this worktree with the node's credential on the dev proxy; headless Chrome | dev server ready | stopped |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Decision | Action |
| --- | --- | --- | --- |
| server unit tests of the registry, monitor, AutoByteus backend, AgentRun, GraphQL view; BGT-01 e2e | `current()` per runtime, the GraphQL field | Still Valid | Reuse (IMP-02…04) |
| `agentBackgroundTaskStore.spec.ts`, `BackgroundTaskPanel.inspection.spec.ts`, `MobileActivity.backgroundTasks.spec.ts` | seeding rule, panel late viewer, phone section | Still Valid | Reuse (IMP-06, IMP-12) |
| MSP-44…46 | phone and desktop on scripted AGY | Still Valid | Reuse (IMP-11); rerun in the full phone probe |
| `test:e2e:background-tasks-panel` and the rest of the phone probe | preserved panel, Codex snapshot, tool calls | Still Valid | Run (AC-005) |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Planned Steps | Why |
| --- | --- | --- | --- | --- | --- |
| R-IMP | AC-004; AC-001…003 on AGY in Chrome | server, web | Reused | IMP-01…12 | — |
| FS-01 | build | fresh clone | Fresh-start | TESTING.md Fresh-start build: `git clone --no-local`, `pnpm install --frozen-lockfile`, the web build's checks that read `generated/graphql.ts` (`codegen:check` against the built server, `typecheck`) | `generated/graphql.ts` is a build input |
| API-01 | AC-001, AC-002, REQ-001 | Android app (emulator), Claude run on a host node | Temporary Probe | a Claude `haiku` run asked to run a command in the background that fails after a delay (`exit 3`); the phone opens Activity after it started: listed running, with its command; then ended with "exit code 3"; with Activity open the run is asked (from another client) for a second background command: it appears live, newest first | AC-001's stated verification |
| API-02 | AC-003 | desktop window (`nuxt dev`, headless Chrome) | Temporary Probe | the Claude run with a running background task; the desktop window opens it, then reloads: the Progress/Activity panel lists it running | a Claude run's `current()` through the panel |
| API-03 | the reconnect repair | Android app | Temporary Probe | Activity open on a running task; airplane mode on before it ends; off after: the row ends on the `online` re-read | the reviewer's item 3 |
| API-04 | AC-005 | existing suites | Existing Test | full `test:e2e:mobile-shell`; `test:e2e:background-tasks-panel` | preserved |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None planned (the Android and live-Claude journeys need an emulator and a signed-in CLI; MSP-44…46 are the durable cases).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Only The User Can Check? |
| --- | --- | --- |
| Antigravity missed end (C-03 / RSK-001) | accepted residual; noted if seen | No |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`; reroute required: `No`
