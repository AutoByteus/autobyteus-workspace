# API/E2E Coverage Investigation — `reactivate-done-task-runs`

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/design-spec.md` (SR-002)
- Supplemental Task Artifacts: None
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Code review CRR-001 Pass on `3394e7078` (from `/code_reviewer`, 2026-10-07)
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

Task status belongs to the agent. After DONE, the agent moves the Task to TODO or IN_PROGRESS itself. The run that assigned the work then sends `send_message_to(target_agent_run_id=<ingress run ID>)`. That message reactivates exactly that `assigned` entry: `closedAt` goes back to `null`, `task_executions_reopened` / `TASK_EXECUTIONS_REOPENED` is published, the copy is restored with its conversation, and the message is delivered. The accepted result's message ends with "`<id>` was reactivated." (REQ-001..003, 007; DS-001, DS-L1).

The following are refused with coded guidance and change nothing (REQ-003..006, AC-005..009, 015):
- messages while the Task is DONE;
- messages from non-assigners;
- messages to helpers or to non-coordinator Team members;
- messages for a deleted Task, a never-started assignment, or a missing conversation.

Other behavior to prove:
- A later DONE closes the copy again, and the cycle repeats (REQ-009).
- `delegate_task` success results carry `target_kind` (REQ-010).
- Agent-facing texts no longer call DONE final (REQ-011).
- Rows reappear live and stay visible after reload and server restart in Agent, Team and Org roots (REQ-008).
- Persisted transition: `Directly Usable — No Migration`.

Accepted design deviation (CRR-001 C-001): release settlement lives in `RootTaskAgentResourceScope`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-005 and QR-001/QR-002.
- Real-use scenarios added from the implementation:
  - **RU-1:** the assigner messages the same reactivated worker a second time. Expected: the unchanged open path, with no reactivation note. Trigger: an agent's follow-up message.
  - **RU-2:** a configured teammate (Team root `/worker` member, Org root `/helper` member) messages the closed copy by run ID. This is the realistic non-assigner sender in Team and Org roots (QR-002). In the standalone Agent root, the only other senders are Task copies, so a copy delegated by description is used. Its first message is the send.
  - **RU-3:** a second Manager in another root sets the Task DONE while the assigner's reactivating message is in flight (QR-001). Real use: two agents act on the same Project Task, as in the existing closure suite's "DONE by another Manager".
  - **RU-4:** a server restart while the worker is closed, then the agent reopens the Task and messages (AC-011). Also a restart after reactivation, where the rows must stay visible (AC-004).
  - **RU-5:** a real-model worker (Claude Agent SDK runtime) recalls a fact from before DONE after reactivation. This is the semantic "B replies with knowledge of its earlier conversation" part of AC-001.
- Scenarios recorded as Technically Possible but Unsupported/Contrived: P-002 (two concurrent reactivating messages from the same assigner) is `Unclear` in ARCH-REV-002. It is unit-covered and not driven here.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 reactivation by the assigner's run-ID message | Added | REQ-001/002/007, DS-001 | Real HTTP/WS/MCP E2E in 3 roots for both an Agent and a Team copy; restart path in a real built backend |
| BEH-002 status only by the agent; refused while DONE | Changed (refusal text) / Preserved | REQ-003, AC-014/015 | Byte-level `task.json` and `agent_run_resources.json` checks around the refusal and the reactivation |
| BEH-003 rows reappear | Added | REQ-008, AC-004 | Wire events/snapshots (server E2E) + browser live/reload/restart (probe) |
| BEH-004 Team copy as a whole | Added | REQ-002, AC-002 | Same `teamRunId` and member run IDs; the coordinator receives the message |
| BEH-005 helpers stay closed | Preserved | REQ-004, AC-005 | Helper refusal + still in `closed_task_executions` |
| BEH-006 other senders / non-ingress refused | Changed (guidance) | REQ-005, AC-006/007, QR-002 | Teammate, Task copy and non-coordinator member cases |
| BEH-007 `target_kind` | Added | REQ-010, AC-012 | Real MCP results for agent and team; live mixed-runtime suite pins |
| BEH-008 texts / DONE unchanged | Changed / Preserved | REQ-009/011, AC-010/013 | Repeated DONE/reactivate cycle; contract tests (unit) |
| Persisted `closedAt → null` | Added transition | Design "Directly Usable — No Migration" | File checks; restart read through the normal reader |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Task side eligibility/commit, lifecycle DS-L1 | Unit suites (real registries for backends) | Real roots, the real MCP tool path, real AGY process restore | Server E2E (scripted AGY) |
| API / transport / contract | Yes | MCP tool results, WS events, GraphQL snapshots | Contract package tests, projector unit tests | Wire shape through the real server | Server E2E |
| Frontend component / state | Yes | `removeReopenedTaskExecutions` in 3 consumers | Web specs (21) | Integrated live stream → tree | Browser probe |
| Browser integration / user journey | Yes | Workspaces tree rows | Implementer's temporary self-check (deleted) | Durable coverage; restart journey | Browser probe (durable extension) |
| Authentication / session / permissions | Yes (ownership fence) | Who can reactivate | Unit | Real sender identities through the router | Server E2E |
| Desktop renderer / web-equivalent UI | Yes | Same renderer as browser | — | — | Browser probe (web-equivalent) |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Discard of released handle/TeamRun, restore, restart | Unit (backends) | Real process restart with no in-memory authority | Browser probe's real backend restart |
| Persisted-data transition | Yes | `closedAt` round-trip | Unit | Real file + restart | Server E2E + probe restart |
| Worker / queue / distributed coordination | Yes | `reopen` queue command; DONE race | Unit (QR-001) | Cross-root concurrent DONE | Server E2E (RU-3) |
| External integration | Yes (runtimes) | Restore of real runtime conversations | — | Real model continuity | Live Claude case (gated) + live mixed suite |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs` (branch `codex/reactivate-done-task-runs`, `3394e7078`)
- Stack: pnpm monorepo; Node 22.23.1; server Fastify/GraphQL/WS (Vitest); Nuxt web; stream-contract packages (node:test)
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/TESTING.md` (the same content as the superrepo root `TESTING.md`), sections "Project Task Agent Run Resources…" and "Task closure in the Workspaces tree"
- Conflicts/discrepancies:
  - `pnpm -C autobyteus-server-ts typecheck` has pre-existing TS6059 failures (handoff); the build is used instead.
  - Collaboration-contract tests have 7 pre-existing failures (`schema_version`). I reproduced them on base `cfeda548` with the same 7 failing tests.
- Secrets: not needed for the scripted AGY layers. The live Claude case uses the machine's logged-in Claude CLI; no secret values are recorded.
- The user's AutoByteus app is running (`/Applications/AutoByteus.app`, `~/.autobyteus/server-data`, port 29695). It is never touched: every layer uses a private temp data root and free ports.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Testing guideline | Unit → integration → `tests/e2e/projects` (gated `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fake>`); `test:e2e:task-closure-tree` needs a current server build; `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS …` for machine-independent runs |
| `AGENTS.md` (root), `DESIGN.md` | Repo rules | Read TESTING.md; no backward compatibility |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` header | Probe prerequisites | Built `dist/app.js`, Chrome, fresh `--output-dir`, owns its processes/data |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted actor | `AGY_FAKE_CASE=linked_skills`; `CALL_TOOL:{…}` calls the real MCP tool; resumes with `--conversation`; `AGY_FAKE_ARGV_LOG` records launches |
| Implementation handoff, Environment notes | Setup | `prebuild`, `build`; contract `dist/` is tracked |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | `autobyteus-server-ts` | `pnpm prebuild && pnpm build` | Rebuilt from `3394e7078` | Bootstrap smoke passed | — |
| In-process Studio server (E2E) | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` inside Vitest | Temp data dir, port 0 | `listen` | `app.close()`, `rm` data dir |
| Built backend + Nuxt + Chrome (probe) | `autobyteus-web` | `pnpm test:e2e:task-closure-tree --output-dir <fresh>` | Free ports, private data root | `listening`, GraphQL, frontend fetch | Probe `finally`: browser close, process groups, data root |
| Claude CLI (live case) | — | Installed `claude` 2.1.283 | Real model; small quota | Case completes | Root terminated by the test |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Definitions, Projects, Tasks, roots | Public GraphQL mutations (as in the closure suites) | Private temp data roots | Removed by the test/probe |
| Agent actions (delegate, DONE, reopen, message) | Scripted AGY actor calling the real scoped MCP tools | No provider inference | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Representative existing data:
  - entries closed by a real DONE through the current writer;
  - after a real backend restart, entries are read only through the normal reader.
- Planned evidence:
  - the `agent_run_resources.json` entry `closedAt` is `null` only for the reactivated assignment;
  - helpers stay non-null;
  - `task.json` bytes are unchanged by the reactivation;
  - after the restart, the reactivated row is visible and the restart-path reactivation works (AC-011).
- Migration scenarios: N/A
- Reroute: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/projects/task-agent-resource-reactivation.test.ts` | Task-side matrix, no status write, QR-001 ordering | REQ-001..006/009, AC-003/005/006/008..010/014/015 | Still Valid | Passed in the focused run | Keep |
| `tests/unit/agent-collaboration/root-task-reactivation.test.ts` | DS-L1 lifecycle (fakes for adapter/port) | AC-001/002/008/009, QR-001, AR-002 | Still Valid | Pass | Keep |
| `tests/unit/agent-collaboration/task-reactivation-backends.test.ts` | Real registries: discard + fresh restore per root kind | AC-001/002/005/010/011 | Still Valid | Pass | Keep |
| `tests/unit/agent-tools/**`, LLM contract tests | `target_kind`, texts, no "for good" | AC-012/013 | Still Valid | Pass | Keep |
| `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | `target_kind` expectation | AC-012 | Still Valid | 16/16 with sibling | Keep |
| `tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` | DONE closure in 3 roots; "reopen + redelegate; old runs stay closed" | AC-014 (status change alone reopens nothing) | Still Valid | Pass (3/3). It never messages a closed run after reopen, so it does not conflict with reactivation | Keep |
| `tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` | Fenced run-ID message after DONE (Task still DONE) | AC-015 shape | Still Valid | Pass (3/3); it asserts `TASK_AGENT_RESOURCE_CLOSED` while still DONE | Keep |
| `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Live spawn-result keys incl. `target_kind` | AC-012 | Still Valid (never run) | Needs live runtimes | Execute live (broader) |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` BR-001..007 | Closed rows leave and stay absent after reload/restart | AC-014 | Still Valid | BR-005 checks only closed IDs; the reactivation cases use a separate root set | Keep; extend |
| Web specs (4 changed) and contract tests | Reopened events remove refs | REQ-008 | Still Valid | 21/21; team contracts 8/8; collab new test passes | Keep |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC | Planned Artifact / Path | Why Durable |
| --- | --- | --- | --- | --- |
| E2E-RA-AGENT / E2E-RA-TEAM / E2E-RA-ORG | Full reactivation journey per root kind: `target_kind`; AC-015 refusal; status-only reopen; helper refusal; non-assigner refusal; Agent-copy reactivation (live event, snapshot, conversation, files); second message; DONE/reactivate cycle; Team copy via coordinator with member refusal; deleted Task; ad hoc TODO reactivation | AC-001..003, 005..008, 010, 012, 014, 015; QR-002 | New `autobyteus-server-ts/tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts` (gated like the sibling suites) | No server/wire-level coverage of the feature exists; a regression in any root facade or projector would go unseen |
| E2E-RA-RACE | DONE from another root racing the assigner's reactivating message | QR-001 | Same file (Agent root) | Cross-root concurrency through the real services |
| E2E-RA-LIVE-CLAUDE | Real-model worker recalls a pre-DONE fact after reactivation | AC-001 (knowledge), REQ-002 | Same file, extra gate `RUN_CLAUDE_E2E=1` | Only a real model proves semantic continuity; gated so it never runs by accident |
| BR-008 / BR-009 / BR-010 | Browser: rows reappear live after reactivation (Agent copy and Team copy), helpers stay hidden, conversation continues, fresh reload | AC-004, AC-002, AC-005 | Extend `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Durable form of the implementer's deleted temporary probe |
| BR-011 | Real backend restart: reactivated rows stay visible; then DONE → restart → reopen → message reactivates with no in-memory authority | AC-004 (restart), AC-011, AC-010 | Same probe | The only real-restart surface in the repo for this boundary |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Evidence | Notes |
| --- | --- | --- | --- | --- |
| TESTING-DOC | `TESTING.md` "Task closure in the Workspaces tree" | Name the new server E2E and the BR-008..011 cases | — | Docs for durable coverage |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm prebuild && pnpm build` | `autobyteus-server-ts` | Current build | Pass | `/tmp/rdtr-api/build.log` (copied to evidence) |
| 2 | `pnpm exec vitest run tests/unit/{projects,agent-collaboration,agent-tools,agent-team-execution,standalone-agent-run-root,agent-org-execution,services/agent-streaming,agent-communication} …backend-factory.test.ts …projects-per-folder-v1… --no-watch` | `autobyteus-server-ts` | Unit layer | Pass: 145 files / 1087 tests | `api-e2e-evidence/unit-focused.log` |
| 3 | `vitest run tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/integration/standalone-agent-run-root/native-root-termination.integration.test.ts` | same | Integration | Pass: 2 files / 16 tests | `api-e2e-evidence/integration.log` |
| 4 | `pnpm -C autobyteus-team-stream-contracts test`; `pnpm -C autobyteus-collaboration-stream-contracts test` | root | Contracts | Team 8/8. Collab 14 pass / 7 fail; base `cfeda548` fails the same 7 (13/7), so they are pre-existing | `api-e2e-evidence/*contracts.log` |
| 5 | `pnpm -C autobyteus-web test:nuxt utils/collaboration services/{teamExecution,agentCollaboration,agentOrgExecution} --run` + the 4 changed specs | root | Web state | Pass: 19 files / 131 tests; 4 / 21 | `api-e2e-evidence/web*.log` |
| 6 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… vitest run tests/e2e/projects` (`env -u AUTOBYTEUS_*`) | `autobyteus-server-ts` | Existing E2E regressions (AC-014) | Pass: 6 files / 27 tests | `api-e2e-evidence/e2e-projects-baseline.log` |
| 7 | New `task-reactivation-root-visibility.e2e.test.ts` (gated) | same | E2E-RA-* | Planned | — |
| 8 | `test:e2e:task-closure-tree --cases BR-008,BR-009,BR-010,BR-011` and the full BR-001..011 | `autobyteus-web` | Browser + restart | Planned | — |
| 9 | Live: `RUN_CLAUDE_E2E=1` E2E-RA-LIVE-CLAUDE; `mixed-task-delegation.e2e.test.ts` (LM Studio + Codex + Claude) | `autobyteus-server-ts` | Real runtimes | Planned | — |

## Test-Case Ledger Decision

- Ledger required: `Yes`. This is a multi-case run with long cases (browser restart, live models) and a risk of interruption.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard

Pre-durable-coverage baseline: unit, integration and existing E2E suites pass, but no reactivation case runs through a real root.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 60% | Unit matrix covers every AC logically | No real-root proof of AC-001..012/015 | E2E-RA-* |
| Changed-boundary execution directness | 55% | Real registries in backend unit tests | Facades, router, MCP tool, projectors never exercised together | E2E-RA-* |
| Integration realism / mock gap | 55% | — | Lifecycle unit tests use fakes for the port/adapter | E2E + probe |
| Environment / fixture fidelity | 75% | Existing E2E harness reused | — | — |
| Failure / edge / lifecycle / recovery | 60% | Unit QR-001, stop-pending, restore failure | Restart path untested end-to-end | BR-011 |
| User surface / browser | 50% | Implementer self-check only (temporary, deleted) | No durable browser coverage; restart not shown | BR-008..011 |
| Durable regression quality | 65% | Good unit suites | No durable E2E | New suite + probe cases |

- Overall: 60% (simple average). Every critical AC directly proven: No. Below 90%: all categories.

## Broader Validation Decision

- Decision: `Required`
- Selected modes:
  - Live API: the server E2E through real HTTP/WS/MCP;
  - Browser + Lifecycle: the probe with a real backend restart;
  - Live runtimes: Claude, plus the mixed LM Studio/Codex/Claude suite.
- Gap: real-root execution of the reactivation spine, rows after restart, restart-path reactivation (AC-011), and real-model continuity.
- Why it helps: each of these exercises the exact changed boundary with only the external model scripted, or not scripted at all.
- Expected confidence after: ≥ 95%
- Browser decision: Required. REQ-008 is a rendering requirement, and the restart journey has only a browser/real-process surface.

## Desktop Application Validation Decision

- Electron shell: not affected (renderer-only change; no preload/IPC/main changes). The web-equivalent browser probe proves the renderer.
- Effect on the running desktop app: None (private ports and data).

## Live Environment And Fixture Plan

- Server E2E: in-process Studio server, temp data dir, `AGY_FAKE_CASE=linked_skills`, `AGY_FAKE_ARGV_LOG` in the temp dir.
- Probe: built `dist/app.js`, Nuxt dev, headless Chrome, private data root, free ports; restart = same port and data root.
- Evidence:
  - E2E JSON receipt via `TASK_REACTIVATION_E2E_EVIDENCE_DIR`;
  - probe `evidence.json` and screenshots under `tickets/.../api-e2e-evidence/`.
- Cleanup: the test and the probe remove their own processes and data; cleanup receipts are checked.

## Temporary Executable Validation Plan

None planned. All new cases are durable.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| AC-009 never-started assignment, end-to-end | A real `start: failed` assignment needs a runtime start failure inside a successful link. The scripted actor cannot produce one without forcing internals. | Low: the refusal is decided purely on the Task side (unit, real service + store) and mapped by the same lifecycle path the E2E exercises for the other codes | None |
| `TASK_EXECUTION_CONTEXT_UNAVAILABLE` / `TASK_REACTIVATION_STOP_PENDING` end-to-end | They need a deleted conversation or a hung release (forced) | Low; unit-covered | None |
| P-002 concurrent reactivations | Unclear premise (ARCH-REV-002) | Low; unit-covered | None |

## Ambiguities Or Reroute Triggers

None.

## Execution-Time Plan Updates

- **USER-JOURNEY added** at the user's request (2026-10-07: "test it like a real user… create a test agent package"). It runs in an isolated desktop instance of this worktree's build: a test agent package imported in Settings, real Claude models, UI-only actions, and two app restarts. Receipt: `api-e2e-evidence/user-journey/journey-receipt.md`.
- **Browser-automation launcher missing.** The TESTING.md launcher (`autobyteus_mcps/browser-automation/scripts/browser`) is not on this machine. I used an equivalent attach-only CDP helper (`user-journey/ui-cdp-helper.mjs`) on the instance's reported control port.
- **Live mixed suite needs `CODEX_E2E_TOOL_MODEL`.** Its hard-coded Codex model names are not in the installed Codex model list, so it needs the existing override variable.
- **Race case: four orderings, not three.** The design allows them all; the assertions now classify by message, and the invariants are unchanged.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (completed)
- Durable coverage added/updated: `Yes`:
  - new `task-reactivation-root-visibility.e2e.test.ts`;
  - probe BR-008..BR-011;
  - `TESTING.md`.
- Post-repository confidence: 60% before the new coverage; final scores in the execution report.
- Broader validation decision: `Required`, executed: Live API, Browser + real restarts, real-model desktop journey, live mixed runtimes.
- Reroute required: `No`
