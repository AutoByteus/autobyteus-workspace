# API/E2E Coverage Investigation — task-run-resources-workspace-cleanup

(`T` = `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup`; `W` = worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup`)

## Investigation Meta

- Requirements Doc: `T/requirements-doc.md` (Approved SD-AP-001; SR-008; REQ-010/AC-011 moved out to `delegated-row-clean-style`, delivered `24e00db81`)
- Investigation Notes: `T/investigation-notes.md`
- Solution Revision Record: `T/solution-revision-record.md` (SR-001–SR-008)
- Design Spec: `T/design-spec.md`
- Supplemental Task Artifacts: UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md` @ `a38bd6e` (Motion, Accessibility, TR-001–TR-005, VIS-001–008); `T/solution-design-handoff.md`; `T/product-design-request.md`; `T/implementation-evidence/org-leave-motion/`
- Design Review Report: `T/design-review-report.md`
- Architecture Review Revision Record: `T/architecture-review-revision-record.md` (ARCH-REV-002, ARCH-REV-003)
- Implementation Handoff: `T/implementation-handoff.md`
- Implementation Revision Record: `T/implementation-revision-record.md` (IR-001 `af690af33`, IR-002 `489268fc7`)
- Code Review Report: `T/code-review-report.md` (CRR-002 Pass 9.35)
- Code Review Revision Record: `T/code-review-revision-record.md`
- API/E2E Revision Record: `T/api-e2e-revision-record.md` (created after this round)
- Current API/E2E Revision ID: `API-REV-003`
- API/E2E Test-Case Ledger: `T/api-e2e-test-case-ledger.md`
- Current Investigation Round: 3
- Trigger: CRR-005 Pass (IR-003 CSS fix for API-F-001; IR-004 per-root closed index, SR-009)
- Prior rounds: 1 (Fail, API-F-001), 2 (IR-003, Pass, superseded by IR-004 before handoff)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of API/E2E-authored durable tests)
- Proportional test-code review decision: `Required` if durable coverage is added/updated (planned: yes)

## Current Requirement And Design Basis

Closure (DONE) of a Task removes every agent run resource of that Task (assigned, delegated, broughtIn; Team runs with members; nested sub-delegations) from the Workspaces tree of its host root. This applies:

- live, while the root is open, with a 200 ms ease-out leave, or an instant removal under reduced motion;
- after reload, restart and Task delete;
- when the root was inactive at DONE time;
- for standalone Agent, Agent Team and Agent Org roots.

The following are preserved:

- non-Task rows (description-only delegation, `@` collaborators);
- other Tasks' runs;
- reopen + redelegate;
- data on disk;
- the Manager's Team-tab messages.

When a run closes:

- an open closed-run conversation returns to the root run;
- the root run row becomes selected;
- focus on a leaving row moves to the run row.

Design (SR-008):

- the shared `listClosedTaskExecutions` lists closure;
- the root scope publishes a `task_executions_closed` event (Team: `TASK_EXECUTIONS_CLOSED`) before stopping;
- snapshots and stored reads carry `closed_task_executions` / `closedTaskExecutions`;
- the Org history item carries `closed_task_executions` (SP-3);
- web contexts filter only listings and keep the tree and messages.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (live DONE), SCN-002 (reload/restart), SCN-003 (DONE while root inactive), SCN-004 (non-Task work unchanged), across the Agent, Team and Org roots.
- Real-use triggers from investigation:
  - The only status writer is the agent tool `create_or_update_task` (GraphQL `updateProjectTask` has no status field; requirements: "no user control for Task status"). DONE is therefore driven by a Manager agent's real tool call over scoped MCP.
  - SCN-003 ("Projects UI or another Manager") is realized as *another Manager root* marking DONE while the host root is stopped.
  - A worker's sub-delegation (`delegated`) and a brought-in helper (`broughtIn` via `send_message_to` of an available agent) are produced by the task workers' own tool calls.
  - A Task delete uses GraphQL `deleteProjectTask` (Projects UI path).
- Contrived (not tested): two tabs racing DONE; forcing stop failure by killing internals of the real roots. AC-003 is instead proven where real failures can be injected (unit tests on all 3 adapters) plus a real-boundary check that publication precedes stop.

## Changed Behavior Summary

| Behavior / Boundary | Change | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Task side `closedAgentRunsIn` | Added | design Ownership Map | Unit (existing) + real E2E through restart and Task delete |
| `listClosedTaskExecutions` + scope publication before stop | Added | SP-1, EV-1 | Unit (existing, 3 adapters) + real-boundary stream ordering |
| Agent/Org `closed_task_executions` + `task_executions_closed`; Team snapshot field + `TASK_EXECUTIONS_CLOSED` | Added (contracts) | Interface Boundary Mapping | Contract tests + real wire frames |
| Stored reads: Agent inspection, Team resume config `closedTaskExecutions`, Org inspection and history item | Added | SP-2, SP-3 | Real GraphQL after stop/restart/Task delete |
| Web listing filters, selection/focus fallback, leave motion | Added | LS-1, REQ-009, REQ-002 | Web unit + real browser against a real backend |
| Execution tree, messages, files | Preserved | BEH-006 | Real E2E: tree retains nodes; messages kept; files on disk |
| Non-Task rows, other Tasks, reopen | Preserved | REQ-006 | Real E2E |
| `generated/graphql.ts` hand edit | Changed | C-07 | Codegen against a live server |

## Changed Surface And Boundary Classification

| Surface | Affected | Changed Boundary | Repository Evidence | Material Risk Not Exercised | Candidate |
| --- | --- | --- | --- | --- | --- |
| Domain / backend | Yes | Task closure read, scope publication | Unit with fakes/doubles | The real composed chain `create_or_update_task` → release → active root → publisher has no repository test | Real Studio HTTP/WS/scoped MCP E2E |
| API / transport / contract | Yes | Stream events and snapshots, GraphQL fields | Contract tests, projector unit tests | Real wire frames, real ordering, codegen fidelity | Real server E2E; codegen |
| Frontend component / state | Yes | Contexts, stores, tree components | Web unit/component (jsdom; real TransitionGroup in one spec) | Real CSS motion; real stream → store → DOM | Browser |
| Browser integration / user journey | Yes | Live removal, selection/focus fallback, reload | Org temporary browser check only (implementation) | Agent and Team trees never rendered; no real backend | Browser on a real built backend + Nuxt |
| Auth / session | No | — | — | — | — |
| Desktop renderer (web-equivalent) | Yes | Same renderer | — | — | Browser |
| Desktop shell | No | No preload/IPC/window/packaging change | — | — | Not required |
| Process / lifecycle | Yes | Restart, stopped root, stop after DONE | Unit | Real restart with the same data | Real server E2E (close + new server on the same data) |
| Persisted-data transition | No (`Not Affected`) | Reads existing `agent_run_resources.json` | — | Existing data readable by the current reader (directly usable) | Covered by restart E2E |
| Worker / distributed | No | — | — | — | — |
| External integration | Partly | AGY CLI as the external actor | — | Live model inference not required for this boundary | Scripted AGY CLI (documented TESTING.md fixture) |

## Project Execution Discovery

- Worktree `W`, branch `codex/task-run-resources-workspace-cleanup`, HEAD `489268fc7`, base `5c74fed71`.
- Stack: Node/pnpm monorepo; Fastify + type-graphql server (`autobyteus-server-ts`); Nuxt 3 web; zod contracts packages; Vitest; Playwright-core probes.
- Testing guideline: `W/TESTING.md` (no closer `TESTING*.md`). Also read: root `AGENTS.md`, `DESIGN.md`, `README.md` § Local full-stack development, `docs/isolated-app-instances.md`, `scripts/development/{run-dev,development-runtime}.mjs`, `autobyteus-web/codegen.ts`.
- Conflicts or discrepancies:
  - `pnpm dev` uses fixed ports 8000/3000. To avoid collisions with other active work, I launch the same built entry (`node autobyteus-server-ts/dist/app.js --host --port --data-dir`) with the same environment keys on free ports and a private temp data root, then point Nuxt dev at it with the same `BACKEND_*` variables. This is the documented launcher's command line, not a parallel setup.
  - Isolated desktop instances strip the server environment, so the scripted AGY CLI cannot be injected there. Paid inference is not needed for this boundary.
- Secrets: none needed (no provider inference).

| Instruction / Config | Purpose | Learned |
| --- | --- | --- |
| `TESTING.md` | Test map and rules | Web tests `pnpm -C autobyteus-web test:nuxt`. Server: build with `prebuild` + `build` before built-process checks. Scripted AGY CLI: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`. Browser probes use their own Nuxt. Never touch the user's app. |
| `TESTING.md` § Scoped Org History | Precedent | `controlled-org-publication-http.e2e.test.ts`: real HTTP/WS/scoped MCP with a scripted actor calling actual tools |
| `scripts/development/development-runtime.mjs` | Real local stack | Backend env keys `APP_ENV`, `DB_TYPE`, `DATABASE_URL`, `AUTOBYTEUS_SERVER_HOST`, `AUTOBYTEUS_{LOG,MEMORY,TEMP_WORKSPACE}_DIR`; frontend `BACKEND_NODE_BASE_URL`, `BACKEND_*_WS_ENDPOINT` |
| `autobyteus-web/codegen.ts` | Codegen | Schema from `BACKEND_GRAPHQL_BASE_URL`; documents `graphql/**/*.ts` |

| Component | Working Dir | Start | Notes | Readiness | Stop |
| --- | --- | --- | --- | --- | --- |
| Built backend | `W/autobyteus-server-ts` | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <tmp>` with the AGY fixture env | Private SQLite in the temp data root | log `Server listening` + GraphQL 200 | SIGTERM owned PID; remove the temp root |
| Nuxt dev | `W/autobyteus-web` | `pnpm exec nuxi dev --host 127.0.0.1 --port <free>` with `BACKEND_*` → the backend | Own process group | HTTP 200 | Kill the owned process group |
| Studio E2E server (vitest) | `W/autobyteus-server-ts` | `startStudioE2eRuntimeServer` in-process | Temp data dir | — | `app.close()` + rm |

| Data / Fixture | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| Agent/Team/Org definitions, Projects, Tasks | Public GraphQL mutations | Private data root | Removed with the root |
| Manager/worker behavior | Scripted AGY CLI (`AGY_FAKE_CASE=linked_skills`) calls real scoped MCP tools when a message contains `CALL_TOOL:{…}` | No provider calls | Child processes end per turn; roots terminated |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Validity | Action |
| --- | --- | --- | --- | --- |
| Contracts `closed-task-executions.test.mjs`, `team-task-executions-closed.test.mjs` | Field, event, correlation | Interfaces | Still Valid | Run |
| Contracts `root-execution-view-dtos.test.mjs` (7 failing) | Stale `schema_version`/`task_records` fixtures | Unrelated | Out Of Scope (pre-existing; identical 7 failures on base `5c74fed71`, verified) | None |
| Server unit: `task-agent-resources`, `task-agent-resource-tree-scope` (publication before stop, failed stop still published, ×3 adapters), `standalone-agent-run-root`, `agent-org-run-inspection`, `team-execution-view-projector`, `team-run-history-service`, `collaboration-root-history-*` | Closure owners | AC-001–004 | Still Valid | Run |
| Server integration `task-delegation-tool-lifecycle`, `native-root-termination` | Delegation lifecycle | AC-006 | Still Valid | Run |
| Web: `agentRunCollaborationClosure`, `agentRunCollaborationStoreClosure`, `runHistoryTeamExecutionRowsClosure`, `agentOrgClosure`, `teamRunContextHydrationService`, `taskExecutionClosure`, `useLeavingTreeRows`, `AgentRunTaskRowsLeave` | Listing, fallback, motion | AC-001, 004, 009, 010 | Still Valid | Run |
| Web probes `agent-org-task-team-disclosure`, `task-agent-peer-sidebar`, `nested-team-hierarchy` | Tree rows (fixtures updated for the new field) | Regression | **Needs Update** (revised during execution). Absence was asserted immediately after a collapse, but the approved design animates collapse with the same 200 ms `tree-row` leave ("TransitionGroup also animates rows removed by collapsing a Team", design Risks; accepted residual in CRR-002). The assertions themselves stay unchanged; they now wait up to 1.5 s for the leave to settle. | Updated; rerun Pass |
| Server `controlled-org-publication-http.e2e`, `scoped-org-history-graphql.e2e` | Org publication/history | Regression of the Org root and history | Still Valid | Run |

## Durable Coverage To Add

| Case ID | Behavior | Evidence | Planned Path | Why Durable |
| --- | --- | --- | --- | --- |
| API-E2E-001 | The real chain: Manager `create_or_update_task` DONE over scoped MCP. It covers:<br>• publication of the closed refs (assigned, delegated, broughtIn, Team) before stop, on the real stream for all 3 root kinds;<br>• the snapshot `closed_task_executions` after reconnect;<br>• tree, messages and files retained;<br>• non-Task and other-Task runs unaffected;<br>• reopen + redelegate;<br>• stored reads after stop (Agent inspection, Team resume config, Org inspection + history item);<br>• DONE by another Manager while the host is stopped;<br>• Task delete;<br>• server restart on the same data. | AC-001–008, SP-1–3, EV-1 | `autobyteus-server-ts/tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` (gated like the other scripted-AGY suites) | No repository test composes these owners; this is the cross-root, cross-process contract most likely to regress |

## Durable Coverage To Update

| Case | Path | Update | Evidence |
| --- | --- | --- | --- |
| REG-001 | `autobyteus-web/tests/e2e/agent-org-task-team-disclosure-probe.mjs` (6 post-collapse absence checks), `task-agent-peer-sidebar-probe.mjs` (2), `nested-team-hierarchy-probe.mjs` (2) | Add a bounded `afterLeave` (1.5 s against the 200 ms leave) around the absence/count assertions that follow a collapse. Expectations unchanged. | First run failed 3/3 on immediate absence. After the update, 5/5, 3/3 and 7/7. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Proven | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-collaboration-stream-contracts test` | Agent/Org contract | 13 pass / 7 fail. The 7 are pre-existing; the base run shows the identical 7 failing names. New closure tests pass. | `REPO-contracts-*.log`, `REPO-contracts-collab-BASE-5c74fed71.log` |
| 2 | `pnpm -C autobyteus-team-stream-contracts test` | Team contract | 7/7 pass | `REPO-contracts-autobyteus-team-stream-contracts.log` |
| 3 | `pnpm -C autobyteus-server-ts prebuild && build` | Production compile + bootstrap smoke | Pass | `REPO-server-build.log` |
| 4 | Server affected suites (handoff set) | Owners | 1103 pass / 7 fail in 3 files (`memory-view-member-resolver`, `published-artifact-projection-service`, `team-run-history-catalog-service`). Neither those tests nor their subjects are touched by the diff; the same set is listed as pre-existing in the handoff and CRR. | `REPO-server-suites.clean.log` |
| 5 | `pnpm -C autobyteus-web test:nuxt --run` | Web | 3668 pass / 36 fail in 11 files, all in the handoff's pre-existing set and none in closure paths. `teamTaskApprovalHydration`'s 18 failures come from a missing `recoverableBlock` in its fixture; the implementation only added the required `closed_task_executions: []`. | `REPO-web-full.clean.log` |
| 6 | C-07 codegen against a live built server (temp output) | Hand-edited types | Pass: the three closure fields are type-identical; the only closure-related delta is a hand-added doc comment codegen does not emit. Other diff hunks are unrelated pre-existing drift (GitHub skill sources). | `C07-codegen.diff`, `C07-codegen-output.graphql.ts`, `C07-generated-impl.diff` |

## Test-Case Ledger Decision

- Required: `Yes` (multi-case, long-running, three root kinds, full-stack browser).

## Post-Repository Confidence Scorecard

| Category | Score | Supports | Remaining | Improve |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 70% | Owner unit tests per AC; contracts; codegen | No composed chain; no rendered motion or fallback | Real server E2E + browser |
| Changed-boundary directness | 70% | Units exercise owners with doubles | Wire ordering and real stored reads unproven | Real HTTP/WS/MCP |
| Integration realism / mock gap | 60% | — | Task service ↔ roots ↔ projectors ↔ web never composed | Real stack |
| Env / fixture fidelity | 85% | Production fixtures updated | — | Real data root, restart |
| Edge / lifecycle | 75% | Units: failed stop, repeated DONE, damaged Task | Restart, stopped root, Task delete at a real boundary | Real E2E |
| User surface / browser | 50% | Org-only temporary check by implementation | Agent and Team trees, AC-009/010 in a browser | Browser full stack |
| Durable regression quality | 85% | Focused new unit/component tests | No cross-root E2E | Add API-E2E-001 |

- Overall post-repository: ~71%. Below 90% → broader validation `Required` (executed; see the execution report).

## Broader Validation Decision

- Decision: `Required`.
- Modes:
  1. a real-boundary server E2E (durable) with the scripted AGY Manager;
  2. a browser full stack (real built backend + Nuxt dev + headless Chrome) with the scripted AGY Manager, for the UI ACs (AC-001/002/005 live rows, AC-009, AC-010 motion and reduced motion for the Agent and Team trees, AC-004 reload first render, AC-008 Team tab, SP-3 Org history first render).
- The desktop shell is not required: there is no shell-specific change, and the web-equivalent renderer runs against the real built backend.

## Not Tested / Infeasible / Deferred (initial)

| Behavior | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| AC-003 failing stop at a real boundary | No supported real-use way to make a real stop fail without contriving internals | Low: unit tests on all 3 adapters inject a failing stop; the real E2E proves publication precedes stop | Recorded |
| Paid live-model Manager journey | Not needed: the boundary is the tool call, and the scripted actor calls the actual tools | Low | None |

## Ambiguities Or Reroute Triggers

None so far.

## Investigation Decision

- Proceed: `Yes`. Durable coverage added (API-E2E-001) and updated (REG-001 probes). Reroute: `No` before execution.
- Post-execution (round 1):
  - **Fail.** AC-010 (REQ-002/REQ-005) under the Agent Team root: in the AC-009 journey, the leaving rows lose the 200 ms fade/collapse 4/4. A stale `tree-row-move` class's `transition: transform` overrides `.tree-row-leave-active`.
  - Everything else passes at real boundaries. Final confidence 88% (see the report).
  - Preliminary classification: `Local Fix` (implementation, web tree motion CSS/transition interaction).


## Round 2–3 Updates

- **Upstream deltas:**
  - IR-003 (`3570b8c10`): `treeRowLeave.css` rule order and transition list, plus a cascade unit test.
  - IR-004 (`50b08001d`): `TaskAgentResourceService.closedAgentRunsIn` reads a per-host-root closed index maintained in `swap()`, plus docs.
  - Behavior is unchanged; it is approved under SR-009 and ARCH-REV-004.
- **Coverage decisions:**
  - Added durable `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` (+ `test:e2e:task-closure-tree`). It promotes the round-1 temporary real-stack journeys (BR-001–BR-007). The reason: the motion and fallback behavior across the three trees has no other durable browser coverage, and round 1 showed it can regress in a way unit tests did not catch. It follows the existing full-stack probe pattern (`github-skill-sources-probe`): a built backend, its own Nuxt, Chrome and data root, and cleanup in `finally`.
  - Extended `task-closure-root-visibility.e2e.test.ts` with a repeated DONE after reopen + redelegate. That is the IR-004 re-swap path: a re-swapped Task's refs move within the index.
  - IR-004 risk mapping:
    - closure in snapshots and stored reads → API-E2E-001 steps 3–7;
    - restart rebuilding the index from disk → BR-005;
    - Org history item → API-E2E-001 (Org) + BR-007;
    - Task delete keeping closure → API-E2E-001 step 7;
    - inactive-root DONE → API-E2E-001 step 6.
- **Prior failure API-F-001:** resolved. Proven by BR-002 with the stale move class present at leave start (natural, 4 runs including the durable probe) and in a forced variant.
