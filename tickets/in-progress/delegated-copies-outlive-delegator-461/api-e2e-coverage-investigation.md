# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/`; the ticket folder is `tickets/in-progress/delegated-copies-outlive-delegator-461/`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-018 baseline; TC-12 exception SR-035)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (through SR-053)
- Design Spec: `design-spec.md` (DS-1 … DS-11; Validation in DS-10 item 9)
- Supplemental Task Artifacts: `target-collaboration-contract.md` (revision 8, the authority), `evidence/collaboration-model/{model.py,stories.py,walkthrough.py}`, `collaboration-walkthrough.md`, `evidence/data-model-validation/`
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-004)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-007, round 4, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- API/E2E Revision Record: `api-e2e-revision-record.md` (created after the first result)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-007 at `bc223a8ae0`, from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

Code under test: branch `codex/delegated-copies-outlive-delegator-461`, base `origin/personal` `827f1e68dc`, head `bc223a8ae0` (code `a54e78ccb7`).

## Current Requirement And Design Basis

A delegated run (agent or team, local or on a peer) is an ordinary run with its own root, idle shutdown, Stop and restart resume. Nothing hosts it. The delegation is stored once per side as `delegatedFrom`: on the Task entry and on the run's own file. The in-memory `DelegationTree` relates runs for messages, views, token totals, restart and the run list. Stop stops a run's own parts only (REQ-001). A message wakes a stopped receiver (REQ-003). Opening a view never starts a run (REQ-004). The Task rules are unchanged (REQ-005). One startup migration converts existing data (REQ-011).

Since SR-045/046/048 a view's stream lives with the open view: a stopped Team or Org view is served from its stored file ("stored mode") and switches to live with one in-band snapshot when a message to one of its own members restores the run. The GraphQL `restoreAgentTeamRun` / `restoreAgentOrgRun` were removed (CR-461-008). The hosting events (`task_execution_started`, `TASK_EXECUTIONS_CLOSED`, `…_REOPENED`, `closed_task_executions`, `closedTaskExecutionsDigest`) are replaced by `CHILD_RUNS_CHANGED` / `child_runs_changed`.

Acceptance criteria to prove: AC-001 … AC-015 (requirements); the design's Validation list (DS-10 item 9): the contract's stories against the server, one check per §5 case ID, TC-13, AR-017 interleavings, the migration's shapes and a start on converted data.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 … SCN-010 (all `Supported Normal`, SCN-006 `Supported Explicit Edge`).
- Real-use scenarios added from the implemented behavior:
  - RU-1: a stopped Team or Org run is continued by the user's message to one of its members on its open view (the product's only restore path since CR-461-008).
  - RU-2: the agent-run view's WebSocket closes normally (1000), e.g. a server restart or a network handover; the view reconnects (C3-06).
  - RU-3: a stopped delegator's view is open in the phone layout while its child works.
- Contrived / unsupported: none recorded by the designer.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Delegation, messaging, closure, Stop, idle, restart, run list, guards | IMP-19, IMP-22, IMP-26 (unit) | Whole flows across roots and processes | Server E2E (scripted AGY), stories acceptance test |
| API / transport / contract | Yes | Two stream contracts (events removed, `CHILD_RUNS_CHANGED`), GraphQL (`delegatingRun`, mutations removed) | IMP-13, IMP-25 | Real WebSocket sequences | Server E2E, browser |
| Frontend component / state | Yes | Stream lifetime, stored/live, send settlement, poll rule | IMP-23, IMP-24 | Real event sequences | Browser probes |
| Browser integration / user journey | Yes | SCN-005 / AC-007, live child rows, Task page navigation | none rendered | All | Probe-owned real stack, desktop and phone layouts |
| Authentication / session | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | as frontend | — | — | Browser probes |
| Desktop shell | No | No Electron main/preload change found in the diff | — | — | None |
| Process / lifecycle | Yes | Restart resume bottom-up, idle shutdown, startup migration | unit, migration tests | Built-server starts and restarts | Built-server E2E |
| Persisted-data transition | Yes | `20261111_delegated_runs_own_runs_v1` over Task records, run files, trees, logs, busy-run record, history rows | migration tests on fixtures | A real start on converted data | Built-server start on hand-built data of every shape (never user data) |
| Worker / queue / distributed coordination | Yes | Each run's own gate; peer delegation | unit | Two server processes | Two-server E2E |
| External integration | Partly | Real runtimes (AC-001 "real runtime") | gated live suites | A real model's turn surviving the delegator's Stop | Gated live suite with the test vault (decided after the scripted cases) |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461`
- Project type and runtime stack: pnpm monorepo; Node/TypeScript server, Nuxt web, Electron desktop.
- Testing guideline: `TESTING.md` (root). No closer `TESTING*.md`.
- Conflicting, missing, or unclear instructions: none.
- Changed build-input paths: the two stream contract packages (`autobyteus-collaboration-stream-contracts`, `autobyteus-team-stream-contracts`, src and dist), `typecheck-baseline.json`, `autobyteus-web/generated/**` → fresh-start build case API-F01.
- Required secrets: only for a gated live case (test vault); none for the scripted cases.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | layers, scripted AGY CLI, clean env, built server for built-server suites, probes own their stack, fresh-start build, migrations on hand-built data only |
| `AGENTS.md` | Repository rules | test vault for real keys |
| `autobyteus-web/tests/e2e/*.mjs` headers | Probes | `--output-dir`, `--cases`, built server `dist/app.js` |
| `tests/e2e/helpers/collaboration-root-harness.ts`, `built-studio-roots.ts` | Server E2E harnesses | Real roots on in-process or built servers with the scripted AGY CLI |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` (DS-10).
- Representative existing-data setup: hand-built data root holding every stored shape of contract §6 (E1 … E12), built from the released fixtures (`tests/fixtures/app-data-migrations/released-delegation-shape-fixtures.ts`), never user data.
- Evidence planned: the migration's own tests (implementation, reused) and a built-server start on that data root: the migration completes, every run has the contract's shape, conversations/logs/Task records intact, a second start changes nothing, an unconvertible run is preserved and reported, and the converted runs work (view, message, delegate, close).

## Existing Durable Coverage Inventory

The baseline run of the whole server E2E (API-E01, first run) gives the per-file decisions; they are recorded in the execution report's triage table. Known before the run:

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| 35 files calling `restoreAgentTeamRun` / `restoreAgentOrgRun` (handoff Known Risks + `tests/fixtures/codex-native-multi-agent-system.mjs`) | Restore a stopped Team/Org run before continuing | CR-461-008, SR-046/048 | `Needs Update` | `grep` | Restore by a message to one of the run's own members on its view stream (the product path) |
| 18 E2E files and probes naming removed events/fields | Hosting events and closed sets | SR-041 … SR-044 | `Needs Update` / `Replace` | `grep` | `CHILD_RUNS_CHANGED` / child rows from the Task entries |
| Suites asserting hosting (delegated runs inside the delegator's tree, copy records, `taskExecutions`) | Hosting model | DS-1 … DS-11 | `Needs Update` / `Stale` per case | baseline run | Per triage |
| Unit/integration (IMP-19 … IMP-26) | Every owner | all | `Still Valid` | CRR-007 | Reuse; integration rerun (API-I01) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | all (unit parts) | Server unit, migrations, architecture | Reused | IMP-26 (`a54e78ccb7`), IMP-19 | Ran on the code under test |
| API-R02 | — | Typechecks, contracts, web specs | Reused | IMP-23 … IMP-26 | Same |
| API-I01 | AC-005, AC-009, AC-012 | Server integration | Existing Test | `test:integration:prepare`, `test:integration` | Last run on `4a3f221c72`; CR-461-008 changed code after |
| API-E01 | AC-001 … AC-013 | Whole server E2E (scripted AGY) | Existing Test (rewrite) | `vitest run tests/e2e` | Baseline, then after the rewrite |
| API-E02 | AC-001 … AC-006, AC-011, AC-015 data; design Validation | The contract's stories against the server, two nodes for §5.1; files compared with `collaboration-walkthrough.md` after every step | Durable (new) | new suite | The ticket's acceptance test |
| API-E03 | AC-014 | Built server on hand-built data of every shape; second start | Durable (new or extended) | new suite | A start on converted data |
| API-B01 | AC-007, REQ-002, REQ-004 (SCN-005) | Browser: stopped delegator's views (agent-run, team, org) in stored and live modes, child rows and output live, child message wakes only the child, stopped org starting on its first input; desktop and phone | Durable probe (new or extended) | probe | No rendered check exists |
| API-B02 | C3-06 | Browser: agent-run view reconnect after a WebSocket 1000 close | Durable probe case | probe | The source cannot show it |
| API-B03 | AC-005, AC-012 | Existing web probes that name removed events | Existing Test (rewrite) | per probe | Keep the rendered coverage of closure, reopen, follow-up Task |
| API-L01 | AC-001 (real runtime) | Gated live suite or isolated instance with a real model | Journey | decided after API-E01/E02 | AC-001's verification intent names a real runtime |
| API-F01 | build inputs | Fresh clone, release desktop build | Existing (release job) | TESTING.md "Fresh-start build" | Contracts and generated types changed |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

- Add: `tests/e2e/projects/collaboration-contract-stories.e2e.test.ts` with `tests/fixtures/collaboration-contract/{export_contract_states.py,contract-states.json}` (API-E02); `tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts` (API-E03); `autobyteus-web/tests/e2e/stopped-delegator-views-probe.mjs` (API-B01, API-B02); helpers `restore-by-member-message.ts`, `e2e-run-history-services.ts`.
- Update: the harnesses and every suite using the removed restore mutations restore by a message to one of the run's own members on its view stream; in-process suites get the 461 composition's readers; stale hosting assertions are rewritten case by case (report, "API-E01 Triage").
- Remove: none decided this round.
- The stories test compares against the contract model exactly. Each difference it accepts is listed with its reason (`KNOWN_DIFFERENCES`; report K-1 … K-11), so a new difference fails the test.

## Desktop Application Validation Plan

- Web-equivalent behavior: all of this change's visible behavior (views, streams, rows).
- Shell-specific behavior: none changed.
- Approach: probe-owned real stack (built server, Nuxt dev, headless Chrome) with the scripted AGY CLI, desktop and phone (`/mobile`) layouts, as TESTING.md asks for renderer behavior the phone offers too.
- The user's running app and `~/.autobyteus` are never touched.

## Not Tested / Infeasible / Deferred

Round 1 ended at a `Fail` (report F-1 … F-5). Deferred to the round after the fixes: API-E01's remaining rewrite, API-B03, API-I01, API-L01, API-F01, and the phone layout of API-B01.

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
