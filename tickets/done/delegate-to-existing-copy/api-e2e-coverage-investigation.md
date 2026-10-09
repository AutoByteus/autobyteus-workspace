# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md` (SR-001..SR-006)
- Design Spec (required on every route): `.../design-spec.md` (SR-006, Ready)
- Supplemental Task Artifacts: None (`N/A — not applicable`); product design `N/A — not applicable`
- Design Review Report: `.../design-review-report.md` (Pass, round 3)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md` (ARCH-REV-001..003)
- Implementation Handoff: `.../implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-001, Pass, 9.3/10, no findings)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `.../api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-001` (in progress)
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: code_reviewer pass CRR-001 → API/E2E
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file, round 1

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the durable test changes)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

- A copy (Agent run or Team run) has one **current** Task: its open entry, else its latest-linked entry (`TaskExecutionResourceService`).
- `delegate_task({target_team_run_id | target_agent_run_id, task_id})` assigns a new Task to an existing copy of the sender's root when the sender made the copy's most recent assignment and the copy's current Task is closed. The copy is woken/restored with its conversation and receives the Task as a `task_assignment` message (`New Task assigned to you: <taskId>. …`). Results name IDs explicitly (`delegated`, `target_kind`, `target_agent_run_id` | `target_team_run_id` + `target_team_coordinator_agent_run_id`, `task_id`), refusals are `{delegated:false, message}` with nothing changed.
- DONE/CANCELLED (first or repeated) stops only copies whose current Task is that Task.
- Reopen + message reaches only the copy's current Task; an older Task gets the AC-010 hint.
- A → B → A appends a second period entry in A's file (earlier closed period kept).
- `send_message_to(target_agent_run_id=<team run ID>)` → `TARGET_IS_TEAM_RUN` naming the coordinator (same-root and cross-root).
- `list_project_tasks`: `assignments` (open) + `closedAssignments` (every closed period) with explicit IDs, or `assignmentsUnavailable`.
- Persisted data `Directly Usable — No Migration`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-006 at the real wire; SCN-007/SCN-008 (tool texts) by contract tests (repository) and the PTM skill diff review.
- Real-use scenarios added from investigating the implemented behavior:
  - RU-1: PTM issues `create_or_update_task(A, DONE)` and `delegate_task(target_*, B)` as **parallel tool calls in one turn** (models do batch tool calls). Trigger: one Manager turn with two concurrent MCP calls. Needs a fixture route that issues the actor's calls concurrently (`CALL_TOOLS:[…]`).
  - RU-2: PTM in a new chat finds the copy of a DONE Task with `list_project_tasks` (`closedAssignments`) and delegates the follow-up with that ID (SCN-006 → SCN-001 chained).
  - RU-3: a copy whose start failed (member model not offered by its runtime — the real start-failure path used by `project-change-feed`) appears in `assignments` with `outcome: failed`; the PTM cancels the Task and tries to give the copy a follow-up → "never started" refusal.
  - RU-4: copy whose saved conversation was lost (memory folder removed while the copy is stopped) → `TASK_EXECUTION_CONTEXT_UNAVAILABLE`-style refusal before any commit.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none recorded upstream. Out of scope per requirements: UI assignment, description-only existing-copy delegation, multi-open Tasks, downgrade after reuse.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 explicit result IDs | Changed (clean break) | REQ-001, DEC-008 | Assert exact key sets at the MCP wire for agent and team results and refusals |
| BEH-002 existing-copy assignment | Added | REQ-002/003 | Real-runtime journey in all three roots |
| BEH-003 one current Task, refusals, A→B→A | Changed | REQ-004/005/007, AC-018 | Every AC-006..010/018 refusal at the wire, Task files byte-identical |
| BEH-004 DONE releases only current-Task copies | Changed | REQ-006 | Repeated DONE/CANCELLED of A with process liveness + snapshot + frames |
| BEH-005 team run ID refused by `send_message_to` | Added | REQ-009 | Same-root and cross-root sender |
| BEH-006 assignment views | Changed | REQ-010 | `list_project_tasks` over MCP |
| BEH-008 board / run tree | Preserved views, new trigger | REQ-008 | GraphQL root + `/ws/projects` + run-tree snapshot; browser tree + board |
| Restart persistence | Preserved/extended | AC-011 | Real backend restart (browser probe owns a built backend) |
| QR-001 concurrency | Changed | QR-001, MP-003 | Parallel calls at the wire, both orders |
| Persisted data | Preserved (relaxed rule) | REQ-013 | Multi-entry files written and reloaded after a real restart |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Task side current entry, eligibility, release filter | Unit suites (Task side, current entry) | none material | — |
| API / transport / contract | Yes | MCP `delegate_task`, `send_message_to`, `list_project_tasks` | Unit tool tests; integration lifecycle suite | Real scoped MCP + root wiring + exact delivery not exercised end to end | Live API (server E2E, scripted AGY) |
| Frontend component / state | No code change | Existing tree/board consume reopened event + TaskRootView | Existing probes for reactivation | New trigger (assignment) of the reopened event and board root switch to B not rendered before | Browser probe |
| Browser integration / user journey | Yes (REQ-008) | Run tree + board | None for this flow | Row reappearing live/reload/restart | Browser probe |
| Authentication / session / permissions | Yes (assigner-only) | Sender identity per root | Unit | Real sender identities in 3 roots | Live API |
| Desktop renderer / web-equivalent UI | Yes (same as browser) | — | — | — | Browser probe (web-equivalent) |
| Desktop shell / Electron-specific | No | — | — | — | None |
| Process / lifecycle | Yes | Stop/restore of copies, AGY processes | Unit with fakes; backends test with real registries | Real process stop/restart and conversation resume | Live API + restart |
| Persisted-data transition | Yes (direct use) | Multi-entry files | Unit schema tests | Reload by a real restarted backend | Browser probe restart |
| Worker / queue / distributed coordination | Yes | Root command queue vs Task serialization | Unit QR-001 orders | Wire-level parallel calls | Live API |
| External integration | No | Agents repo skill text only | Diff review | — | None |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy` (branch `codex/delegate-to-existing-copy`)
- Project type: pnpm monorepo; Node 22; server `autobyteus-server-ts` (Fastify/GraphQL/WS, Vitest), web `autobyteus-web` (Nuxt; probes in `tests/e2e/*.mjs` with Playwright-core + Chrome).
- Testing guideline: `TESTING.md` (repo root; no closer `TESTING*.md` under `autobyteus-server-ts` or `autobyteus-web`). Section "Project Task Agent Run Resources And Projects Migration Regressions" defines the layers for this area.
- Conflicting/missing instructions: none. Note: the guideline lists the existing-copy unit suites but no server E2E or browser case for it yet (added by this round).
- Secrets: none needed (scripted AGY). Optional real Claude case needs a logged-in `claude` (available: `/Users/normy/.local/bin/claude`).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, gated scripted-AGY server E2E, browser probes, rules | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/<file> --no-watch`; `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS` for machine-independent runs; browser probe `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir <fresh>` needs a current server build; never use user app/data |
| `autobyteus-server-ts/AGENTS.md` | Server test commands | `vitest run … --no-watch` |
| `tests/e2e/helpers/studio-runtime-test-server.ts` | In-process Studio server for E2E | One server per file; no in-process restart → restart proof via the browser probe's real built backend |
| `tests/fixtures/agy-failure-cli.mjs` | Scripted AGY actor (`AGY_FAKE_CASE=linked_skills`) | `CALL_TOOL:{…}` calls one MCP tool and replies `CALLED:<result>`; no concurrent-call route (needed for RU-1) |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server (server E2E) | `autobyteus-server-ts` | started by the suite (`startStudioE2eRuntimeServer`, port 0) | temp data dir under `os.tmpdir()` | listen + GraphQL | suite `afterAll`: terminate roots, `app.close()`, `rm` data dir |
| Built backend + Nuxt dev + headless Chrome (browser probe) | `autobyteus-web` | `pnpm -C autobyteus-web test:e2e:task-closure-tree --cases … --output-dir <fresh>` | free ports, private data root, process groups | probe readiness (`listening`, GraphQL, Nuxt 200) | probe `finally` stops groups, removes data root; `evidence.cleanup` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team/Org definitions, Projects, Tasks | Public GraphQL mutations (as the sibling suites) | test-owned data dir only | removed with the data dir |
| Manager identity (assigner) and non-assigner | Root's configured Manager; teammate / Task copy / other root's Manager | real scoped MCP sender identity | — |
| Damaged Task file | Overwrite one Task's `agent_run_resources.json` with invalid JSON | test-owned data only; repaired before the end | removed with data dir |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing data: current-format single-entry files created by the normal spawn path in the same journey (the format is unchanged); multi-entry files (A → B → A) are written by the new path and read back by the restarted backend.
- Evidence planned: exact file content (two entries for one copy in A: earlier closed, last open) after AC-018; reload after real restart (browser probe BR-015) with the copy still current in B and visible.
- Migration-specific scenarios: N/A.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/projects/task-execution-existing-copy-assignment.test.ts` | Task-side eligibility, append, A→B→A, DONE of A, QR-001 orders | REQ-003..007, AC-018 | Still Valid | read + code review | Run |
| `tests/unit/projects/task-execution-current-entry.test.ts` | current-entry rule | DS-004 | Still Valid | — | Run |
| `tests/unit/agent-collaboration/root-task-existing-copy-assignment.test.ts` | runtime sequencing/refusals/QR-001 | DS-002 | Still Valid | — | Run |
| `tests/unit/agent-collaboration/task-reactivation-backends.test.ts` | real registries, 3 roots | AC-002/003/008 | Still Valid | — | Run |
| Team/Org/standalone root unit suites (existing-copy cases) | real exact delivery per root | REQ-003 | Still Valid | — | Run |
| `tests/unit/agent-communication/global-agent-run-message-router.test.ts` | TARGET_IS_TEAM_RUN | AC-012 | Still Valid | — | Run |
| `tests/unit/agent-tools/task-delegation/*`, LLM contract test | parser/result/text | AC-001/014/015 | Still Valid | — | Run |
| `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | lifecycle via tools | AC-016 | Still Valid (updated in `1aa02f256`) | diff | Run |
| `tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts` | reactivation in 3 roots; updated for explicit Team result | AC-016 | Still Valid (assertion updates match DEC-008) | diff `1aa02f256` | Run (gated) |
| `tests/e2e/projects/{project-task-boundaries,project-change-feed,ad-hoc-task-delegation,delegated-team-lazy-member-activation,task-copy-idle-lifetime,task-closure-root-visibility,project-task-context-files-delegation}.e2e.test.ts` | preserved Task/delegation behavior | AC-016 | Still Valid (mechanical updates checked against DEC-008) | diff | Run (gated) |
| `tests/e2e/runtime/{mixed-task-delegation,agent-initiated-collaborators,standalone-agent-collaborator-mention}.e2e.test.ts` | live-model delegation; result fields updated | AC-001/016 | Still Valid (to execute; gates checked) | diff | Run where the gate's provider is available |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` BR-001..011 | closure/reactivation in the tree | AC-016, REQ-008 preserved | Still Valid | — | Run; extend |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` | board roots | REQ-008 preserved | Still Valid | — | Run board-root cases if time allows (regression) |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| EXC-E2E-001/002/003 | Full existing-copy journey per root (Agent, Team, Org): explicit IDs, busy refusal, AC-008 refusals, non-assigner, A DONE → B to Team copy by `target_team_run_id` and C→D to Agent copy by `target_agent_run_id`, conversation continued, reopened event, board root B, A unchanged; repeated DONE/CANCELLED of A never stops it; B DONE stops it; AC-010 hint; AC-018 A→B→A file shape; AC-013 views; AC-012 same-root | AC-001..010, 012, 013, 018; REQ-008 (server views) | `autobyteus-server-ts/tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` (new) | No real-wire coverage exists for the feature |
| EXC-E2E-004 | QR-001 parallel `DONE(A)` + `delegate_task(target, B)` in one Manager turn, staggered both ways, Team and Agent copies | QR-001, MP-003 | same file + fixture route `CALL_TOOLS:[…]` in `tests/fixtures/agy-failure-cli.mjs` | Residual window only provable at the wire |
| EXC-E2E-005 | Cross-root sender: `send_message_to(team run ID)` from another root's Manager; `delegate_task(target_*, …)` naming another root's copy | AC-012, AC-008 | same file | Cross-root directory path |
| EXC-E2E-006 | Never-started copy (real start failure), lost conversation, damaged Task data (`assignmentsUnavailable` + refusal, recovery after repair) | AC-009, AC-013, REQ-005 | same file | Requirement-listed refusals at the wire |
| BR-012..BR-014 | Run tree: copy row returns live on assignment, stays on repeated DONE of A, leaves on DONE of B; board: B's root = copy live, A's root closed | REQ-008, AC-002/004/005 | `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` (extend) | Rendered visibility for a new trigger |
| BR-015 | Real backend restart after A DONE, assignment of B to the stopped copy, restart again: row and board root persist; conversation continued | AC-011, REQ-008, REQ-013 | same probe | Restart only provable with a real backend |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Evidence | Notes |
| --- | --- | --- | --- | --- |
| DOC-1 | `TESTING.md` | Document the new server E2E and BR-012..015 | TESTING.md "Project Task …" section | Guideline completeness |
| FIX-1 | `tests/fixtures/agy-failure-cli.mjs` | Add `CALL_TOOLS:[…]` concurrent-call route (linked_skills) without changing existing routes | RU-1 | Run the AGY native-argument regression after (fixture coexistence rule) |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts typecheck` | worktree | src compiles | Pass | `api-e2e-evidence/repo-001-typecheck.log` |
| 2 | `vitest run tests/unit/projects tests/unit/agent-collaboration tests/unit/agent-tools tests/unit/agent-communication tests/unit/agent-team-execution tests/unit/agent-org-execution tests/unit/standalone-agent-run-root` | server | unit layers of the change | Pass (139 files, 1115 tests) | `repo-002-focused-unit.log` |
| 3 | `vitest run tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/integration/standalone-agent-run-root/native-root-termination.integration.test.ts` | server | integration | Pass (17 tests) | `repo-003-focused-integration.log` |
| 4 | `test:unit` + `test:integration:prepare` + `test:integration` (full baseline) | server | regression | Pass (unit 5160; integration 338 passed + the 2 documented known-exception failures) | `repo-004-*.log` |
| 5 | new `task-existing-copy-assignment.e2e.test.ts` (gated scripted AGY) | server | AC-level wire | 6 Pass, EXC-E2E-006 Fail (F-001) | `exc-e2e-final.log`, `exc-e2e-final/` |
| 6 | `tests/e2e/projects` (gated, 11 existing files) | server | AC-016 preserved | Pass (49 passed, 2 skipped; idle-lifetime intermittent O-001, passed alone) | `e2e-prj-existing.log`, `e2e-idle-lifetime-rerun*.log` |
| 7 | `agy-native-tool-arguments-transport.e2e.test.ts` + `agy-failure-cli-routing.test.ts` | server | fixture coexistence | Pass | `e2e-agy-native-args.log` |
| 8 | live-model runtime E2E | server | updated live assertions | mixed-task-delegation Pass 4/4 (LM Studio + Codex + Claude); Claude collaborator suites: changed-helper cases pass, unrelated base-stale `@` cases fail (O-003) | `e2e-live-*.log` |
| 9 | browser probe BR-001..BR-016 | web | REQ-008 rendered, restart, damaged data | Pass (BR-015 rerun after a probe fix) | `browser-task-closure-tree/`, `browser-existing-copy/` |

## Test-Case Ledger Decision

- Ledger required: `Yes` — many independent cases, long-running gated suites and browser probes, interruption risk.
- Canonical ledger path: `.../api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | Unit/integration cover every rule with fakes and real registries | No real-wire proof | Server E2E |
| Changed-boundary execution directness | 70% | Lifecycle and roots exercised in-process | MCP wire, processes not exercised | Server E2E |
| Cross-boundary integration realism and mock gap | 70% | Real registries in backends test | Fake adapters/ports elsewhere | Server E2E + live suites |
| Environment, configuration, identity, and fixture fidelity | 80% | Real root builders | Real sender identities via MCP | Server E2E |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | QR-001 orders in unit | Restart, real race, damaged load | E2E + probe restarts |
| User-surface, browser, and desktop-shell confidence | 0% | None | Rendering untested | Browser probe |
| Durable regression coverage quality and relevance | 85% | Focused suites | No E2E | New suite |

- Overall post-repository confidence: ~64%. Critical AC directly proven: `No` (no wire proof). Broader validation: `Required`.
- Final scores after broader validation: see the execution report (92%, `Fail` on F-001).

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API` (real HTTP/WS/scoped MCP server E2E with the scripted AGY actor) + `Browser` (web-equivalent tree/board, real built backend with restarts)
- Gap: the feature is not exercised through the real MCP wire, roots, delivery and process lifecycle; restart and rendered visibility are untested.
- Browser rationale: REQ-008 is a rendered user outcome; restart needs a real backend process.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Packaged Electron shell | No shell change | None | — |
| Downgrade after reuse | Unsupported scenario (design) | Recorded | — |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| F-001: a copy whose start failed at activation is not in the root tree, so `resolveExistingCopy` gives "not a delegated copy in this run" before the Task-side never-started rule (AC-009) | `Local Fix` (confirmed as CR-001) — **resolved in round 2** (`88e59f500`) | Round 1: EXC-E2E-006, 3/3 runs. Round 2: passes (`round-2/exc-e2e-final/…json`) | implementation_engineer (done) |

Round 2 (investigation update):
- Added EXC-E2E-008, a gated real-model case. It closes the remaining gap: an existing-copy assignment had not been shown with a real model recalling its earlier conversation (AC-002).
- Re-scoped the rerun to the changed not-in-tree refusal path plus its neighbours. Round-1 results stand for suites that do not exercise it.

Execution evidence also changed one plan item. The damaged-data case moved to the browser probe (BR-016), because damage is detected only at load.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added + updated; none removed)
- Post-repository confidence: ~64%; final: 92% (execution report)
- Broader validation decision: `Required` — executed
- Reroute Required Before Validation Execution: `No`
