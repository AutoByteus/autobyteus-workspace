# API/E2E Coverage Investigation — list-running-agents (autobyteus-492)

## Investigation Meta

- Requirements Doc: `tickets/in-progress/list-running-agents/requirements-doc.md` (Approved, SR-006 baseline; SR-008 DEC-014)
- Investigation Notes: `tickets/in-progress/list-running-agents/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/list-running-agents/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/list-running-agents/design-spec.md` (SR-009)
- Supplemental Task Artifacts: None
- Design Review Report: `tickets/in-progress/list-running-agents/design-review-report.md` (ARCH-REV-004 Pass; the architecture reviewer's uncommitted worktree edits, left untouched)
- Architecture Review Revision Record: `tickets/in-progress/list-running-agents/architecture-review-revision-record.md` (same)
- Implementation Handoff: `tickets/in-progress/list-running-agents/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `tickets/in-progress/list-running-agents/implementation-revision-record.md`
- Code Review Report: `tickets/in-progress/list-running-agents/code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `tickets/in-progress/list-running-agents/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `tickets/in-progress/list-running-agents/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer's CRR-002 Pass on IR-002 (code `deacacf948` + `5f89ecbdf5`; documents `4531bf3453`, `548f9425b8`)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this document, round 1

## Current Requirement And Design Basis

The run ID is the address (DEC-001/002, CM-13):

- `send_message_to(target_agent_run_id)` reaches any **running** agent of this node from any sender (user-started root, Team member, Org agent, task agent, task-team member); "a different Task" is no longer refused (REQ-008, AC-005, AC-008).
- With `node`, it reaches any running agent of a paired peer through the signed `POST /rest/remote/run-messages`; the receiver's header names the sender's node so it replies with `node` (REQ-009, AC-006, DS-004/005).
- An unrelated message reaches only a running agent, never wakes one (stopped, idle-shut-down, unstarted member: refused "not running"), waits for the receiver's turn, and stays out of run views live and after reload; both agents' conversations and both message logs show it (REQ-010, REQ-011, DEC-003, DEC-014, AC-007).
- A run ID a root links but the sender is not paired with (a teammate of the delegator) goes unlinked to the same node while it runs (DS-006).
- Preserved: Task-related wake/reopen, `TASK_AGENT_RESOURCE_CLOSED`; a fenced peer run is refused CLOSED for every sender on the node that holds the Task, with or without `node` (row 13); delivered from the node that runs it or a third node while it runs (row 14, DEC-011); team-run-ID refusal with the coordinator's run ID, also from a peer (row 11, BEH-006); linked remote runs route without `node`.
- New opt-in tool `list_running_agents` lists the running Agent and Team roots a person started (not the caller's own, not Org, not delegated, not stopped), entry fields exactly per REQ-002 (`node` with `node`), filters `address`/`state`; with `node`, asked now through the signed `POST /rest/remote/running-agents`, read strictly, refusals the same as `list_available_agents` with `node`, within the 20 s bound (REQ-001…007, AC-001…004, QR-001…003).

Persisted data: `Not Affected` (existing message-log shape; run files read only).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 … SCN-006, all through agents' own tool calls (the scripted AGY CLI calls the real tool over Agent Tools MCP) on built servers.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - RU-1 (the requirements' observable definition of success, end to end): a PM-like root on alpha lists beta's running roots, picks beta's PM by name and Project, messages it with `node`; beta's PM answers with the node from its header. Trigger: the agents' own `list_running_agents` / `send_message_to` calls.
  - RU-2 (G-1 on one node): a Team member messages an unrelated standalone root while both run views are open; the user reloads the views (reconnect) and opens the Team tab (`collaborationParticipantMessages`). A Task-related message from a task agent to its delegator still shows. Trigger: agents' tool calls; the window's view sockets and Team-tab query.
  - RU-3 (row 3 senders): an Org agent and a task agent message an unrelated running root of the same node.
  - RU-4 (row 4 / row 8 targets): a never-started Team member, locally and on the peer; a root the owner stopped, locally and on the peer.
  - RU-5 (QR-003): requests to both new routes without a signature, with the owner's bearer credential, with a wrong-secret signature, and with a wrong `toNodeId`.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): MP-003 (a target stops between the running check and the reservation; design § Risks).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-002 `list_running_agents` (local, peer) | Added | REQ-001…007, DS-001/002 | New two-server cases (local list on alpha, peer list of beta, refusals, filters, strict answer audit) |
| BEH-003 unrelated local message | Changed (CONFLICT → delivered while running) | REQ-008, DS-003, PRB-002 | New cases; CPW-R2 rewritten; G-1 views |
| BEH-004 message with `node` | Added | REQ-009, DS-004…006 | New two-server cases, both directions, both logs |
| DS-006 teammate of the delegator → linked remote run | Changed (refused "not linked" → delivered unlinked while running) | design row 6 | RC-06, RC-22 assertions rewritten |
| Not-running refusal text | Changed (adds "A stopped agent is not woken", list_running_agents and node hint) | `targetAgentNotRunningText` | RC-08, RC-22, CPW-R1, CPW-R3 M-11 rewritten |
| BEH-005 wake/reopen/CLOSED, fenced peer run rows 13/14 | Preserved / extended to every sender of the Task's node | REQ-011, DEC-011 | New two-server case; RC-10/11/23 kept |
| BEH-006 team run ID, also from a peer | Preserved / extended | REQ-011, row 11 | New two-server case |
| BEH-007 waits for the receiver's turn | Preserved | REQ-010 | Covered by unit IMP-06 (reservation committed); no E2E-specific risk |
| BEH-008 `delegate_task` | Preserved | — | Existing suites unchanged |
| Tool exposure (`list_running_agents` everywhere) | Added | TESTING.md tool-exposure rule | Whole unit, integration and E2E suites; gated tool-list search |
| Contract model U9 / S27 | Changed | fixture regenerated | Gated contract-stories E2E |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | CrossRun admission, RunningAgents, listing | Unit suites (IMP-03/04/06) | Built-server composition, real runtimes' MCP tool calls | Built-server E2E (scripted AGY) |
| API / transport / contract | Yes | Two new peer routes, `send_message_to` `node`, new tool over Agent Tools MCP | In-process test with `fetch` replaced (IMP-06) | Real HTTP, the signed peer gate, two processes | Two-server E2E |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No (run views are server streams; UI out of scope) | Run-view stream frames and Team-tab query (G-1) | Unit (publishToViews) | Real view sockets and stored query | Built-server E2E over the view sockets and GraphQL |
| Authentication / session / permissions | Yes | Peer gate admission of the two new routes | None at HTTP level | Unsigned / wrongly signed requests | Two-server E2E (QR-003) |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Not-running = live status (idle shutdown, stopped, unstarted member); never woken | Unit | Real process liveness (AGY processes) | Two-server E2E (`processLive`, launches) |
| Persisted-data transition | No | `Not Affected` | — | — | — |
| Worker / queue / distributed coordination | Yes | Two-node messaging and listing | In process only | Real HTTP between two servers | Two-server E2E (and a third node for row 14) |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents`, branch `codex/list-running-agents`
- Project type and runtime stack: pnpm monorepo; Node 22.23.1 (as TESTING.md asks); server `autobyteus-server-ts` (Fastify, GraphQL, WebSockets); scripted AGY CLI runtime for agent runs.
- Project testing guideline path(s): `TESTING.md` (repository root; no closer `TESTING*.md`)
- Conflicting, missing, or unclear project instructions: TESTING.md asks for one heavy run at a time on the machine; other worktrees' agents were running vitest suites at the same time (outside my control). Recorded per case as environment load.
- Changed build-input paths: `autobyteus-server-ts/typecheck-baseline.json` only (matches `**/typecheck-baseline.json`). No release workflow reads the server's baseline (`grep typecheck .github/workflows autobyteus-server-ts/docker` finds none; the desktop job runs the web typecheck, whose baseline is unchanged). Fresh-start case API-12 runs the desktop job's TypeScript steps (web `typecheck`, `prepare-server`) in a fresh clone.
- Required environment variables or secrets available: `N/A` (scripted runtime; no provider keys)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Choosing the path | Tool exposure change | Whole server unit, whole `test:integration`, whole `pnpm test:e2e`, plus a search of gated suites for exact tool lists |
| `TESTING.md` § Environments | Built server, clean environment, Node 22 | `pnpm -C autobyteus-server-ts build`; `test:integration:prepare`; E2E with `env -i PATH HOME=<temp> TMPDIR` |
| `TESTING.md` § Runtimes without a model | Scripted AGY | `ANTIGRAVITY_CLI_COMMAND=…/agy-failure-cli.mjs RUN_AGY_FAILURE_E2E=1` |
| `TESTING.md` § Node credentials | Peer signing, owner credential attachment | `test-support/node-access/owner-credential-attachment.mjs` attaches the owner bearer to loopback `fetch`/`http.request`; an unsigned request must therefore be sent on a raw socket |
| `remote-delegation-two-server.e2e.test.ts` header | The two-server suite's run command and cases | Cases share two nodes and run in file order; `REMOTE_E2E_EVIDENCE_DIR` keeps the receipt and logs |
| `collaboration-contract-stories.e2e.test.ts` header | Contract stories | Idle grace 1 h in this suite (`AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS=3600000`), so U9's target cannot idle out between steps |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree root | `pnpm -C autobyteus-server-ts build` | ~5 min | `dist/app.js` exists, exit 0 | — |
| Brief Studio importable package | worktree root | `pnpm -C autobyteus-server-ts test:integration:prepare` | needed by the two-server suite and `test:integration` | prepare exit 0 | — |
| alpha, beta (+ gamma/delta/epsilon, + zeta for row 14) | test-owned temp roots | spawned by the suite (`dist/app.js`, own data root, ports, HOME) | scripted AGY | `/rest/health` | suite's `afterAll` (stop, remove root, leftover AGY check) |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team definitions, runs, a Project | GraphQL as the owner (the suite's helpers) | test-owned data roots only | removed by the suite; receipt and logs kept in `evidence/` |
| Pairing | `pairNodes` invite helper | no secret printed; RC-20 audits that none crosses | — |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `remote-delegation-two-server.e2e.test.ts` `liveOnlyRefusal` (:158) and RC-08 (:1161, :1168) | other root → linked remote run and bystander → alpha run refused with the old not-running text | REQ-010, REQ-012 | Needs Update | `targetAgentNotRunningText` | Text updated to the new not-running text; RC-08's forged linked `/messages` (`REMOTE_TARGET_NOT_PERMITTED`) still valid |
| same, RC-06 (:1094-1099) | Team mate → delegator's remote run refused "not linked" | DS-006, row 6 | Needs Update | design row 6 | Rewritten: delivered unlinked (`/rest/remote/run-messages`), received on beta, both logs |
| same, RC-22 (:1373-1381) | mate → remote Team coordinator refused "not linked"; other root → checker refused | DS-006; REQ-010 | Needs Update | design rows 4, 6 | Rewritten: mate delivered unlinked; other root refused with the new not-running text; "nothing sent" counts only the refused ones |
| same, RC-08 `sentRequests` | counts `runs`, `messages`, `owner-commands` | — | Needs Update | new message route | `sentRequests` also counts `/rest/remote/run-messages` |
| same, RC-20 (audit) | every captured request's path and fields | QR-002, QR-003 | Needs Update | two new routes | Adds `run-messages` and `running-agents` to the allowed paths, their exact request fields, and the strict answer fields |
| same, RC-10/RC-11/RC-23 (closed Task, fenced remote run/Team) | CLOSED for the delegator, the remote side | REQ-011 | Still Valid | — | Kept; row 13 for other senders added in the new case |
| same, `:1181`, `:1794`, `:1813` (`REMOTE_TARGET_NOT_PERMITTED` at the linked `/messages` gateway) | forged linked messages for unlinked runs | linked path unchanged | Still Valid | design § Legacy Removal Policy ("inbound not_linked stays for linked requests") | Kept |
| `collaboration-prompt-wording.e2e.test.ts` CPW-R1 (:227) | unknown run ID refusal prefix | REQ-010/012 | Needs Update | new text | Updated to the new text |
| same, CPW-R2 (:248-260) | task agent → agent of a different Task refused "different Task" | REQ-008, AC-008 | Replace | DEC-001 | Rewritten as CPW-R2: delivered to the running task agent of the other Task, which receives it |
| same, CPW-R3 M-11 (:313) | catalogue text of an unknown run ID | REQ-012 | Needs Update | result catalogue M-11 updated in unit test | Updated |
| `collaboration-contract-stories.e2e.test.ts` U9, S27 | fixture-driven | CM-13 | Still Valid (fixture regenerated, IMP-05) | idle grace 1 h | Run unchanged |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` "is consumable by the official SDK …" (found by API-04) | `send_message_to`'s exact field list without `node` | REQ-009 | Needs Update | API-04 failure `expected [ 'content', 'message_type', …(4) ] to deeply equal [ …(3) ]` | Lists `node` and asserts its description |
| `collaboration-contract-stories.e2e.test.ts` with the regenerated fixture (found by API-08) | U9's delivered message carried the refused-step ID `"x"`; O9 (in the 461 model since `7163160ece`, absent from the base fixture) had no driver | CM-13; 461 SR-081 | Needs Update | API-08 run 1 and run b | Model U9 ID `collabmsg_U9`, fixture regenerated (`--check`), O9 driver added |
| `codex-standalone-send-message-global-routing.e2e.test.ts` LIVE-002 | standalone → standalone delivered; terminated target refused `stringContaining("No running agent has the run id …")` | REQ-008/010 | Still Valid by reading (prefix kept; delivery now through the unrelated path) | assertion read | Not run: gated on a signed-in Codex CLI; the same Agent Tools MCP path is proven by the scripted runtime (see Not Tested) |
| Gated suites with exact tool lists (`toolInstances`, `enabledTools`, `tools/list`, `requestedToolNames`) | — | tool exposure | Still Valid | search: no exact list names the opt-in discovery tools; `list_running_agents` is opt-in (exposed only when selected) | None |
| `tests/unit/remote-collaboration/running-agents-messaging.test.ts` (IMP-06) and the changed unit tests | in-process scenarios | AC-001…AC-007, G-1 | Still Valid | IMP-03/04/06 on `deacacf948`; `5f89ecbdf5` changed comments and the Python model only | Reused |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | all (unit) | server unit suites | Reused | IMP-03, IMP-04, IMP-06, IMP-09 | Ran on `deacacf948`; `git diff --name-only deacacf948 5f89ecbdf5 -- autobyteus-server-ts/src` = two comment-only files (IMP-09 reran them) |
| API-02 | — | web typecheck | Reused | IMP-02 | Same reason; my changes are server E2E files, which the web typecheck does not compile |
| API-03 | — | server typecheck (src + test files incl. changed E2E files) | Existing Test | `pnpm -C autobyteus-server-ts typecheck` after my edits | E2E test files are in the test-file baseline |
| API-04 | tool exposure, all | whole server integration suite | Existing Test | `pnpm -C autobyteus-server-ts test:integration` | TESTING.md tool-exposure rule |
| API-05 | tool exposure, all | whole server E2E suite (ungated) | Existing Test | `pnpm test:e2e` (clean env) | TESTING.md tool-exposure rule |
| API-06 | AC-001…AC-008, REQ-012, QR-001…003, DS-006, rows 3/4/8/11/13/14, G-1 | two built servers over real HTTP, scripted AGY | Durable | gated `remote-delegation-two-server.e2e.test.ts` (updated + new RC-47 … RC-49) | Closes UNK-001 |
| API-07 | REQ-008/010/012, AC-008 | built-in-process Studio server, Agent Tools MCP | Durable (updated) | gated `collaboration-prompt-wording.e2e.test.ts` | Stale assertions rewritten |
| API-08 | REQ-008/010/011 (CM-13: U9, S27) | built servers, contract model | Existing Test | gated `collaboration-contract-stories.e2e.test.ts` | Fixture regenerated; U9 timing |
| API-09 | tool exposure | gated suites' exact tool lists | Existing Test (search) | `grep` for `toolInstances`, `enabledTools`, `tools/list`, `requestedToolNames`, `list_available_agents` in tests | TESTING.md |
| API-04b | — | the FSEvents-dependent integration files alone | Existing Test | rerun of API-04's watcher failures when FSEvents answers | Show they pass with the change when the machine allows |
| API-10 | — | tracked imports | Existing Test | `python3 scripts/check_repository_artifact_hygiene.py --only tracked-imports` after my commit | new test code imports |
| API-12 | build | fresh clone, desktop job's TypeScript steps | Existing Test | `git clone --no-local`, `pnpm install --frozen-lockfile`, `cd autobyteus-web && pnpm typecheck && pnpm prepare-server` | `typecheck-baseline.json` changed |

New cases inside API-06 (each its own `it`, in file order):

| Sub-case | Criteria | Steps |
| --- | --- | --- |
| RC-47 | AC-001, AC-002, AC-003, AC-005, AC-007, AC-008 (local), REQ-012 (tool text), G-1 (DEC-014), rows 3, 4 | On alpha after RC-11: a Running Scout (tools `list_peer_nodes`, `list_running_agents`) lists alpha (exact entry set and fields; caller, Org, delegated, stopped, Team member left out; filters `address`, `state`, unknown address → empty); messages `other` (AC-005 both ways, both logs); a stopped standalone root and a never-started Team member are refused not running and not woken; Org agent and task agent senders delivered; G-1: unrelated message in neither view live nor after reconnect nor in the Team tab; a Task-related message still in the delegator's view and Team tab |
| RC-48 | AC-004, AC-006, row 8, row 11, AC-007 (peer), QR-003, RU-1 | beta gets a PM root under a Project, a user-started Team (coordinator started, checker not), a stopped root; alpha's Running Scout lists beta (`node`), finds the PM by name and Project, messages it with `node`; the PM answers with the node from its header; both logs; not-running and team-run-ID refusals from the peer; unsigned / owner-bearer / wrong-signature / wrong-`toNodeId` requests to both routes |
| RC-49 | AC-008 rows 13 and 14, DEC-011 | a fresh fenced run on beta (alpha's delegator closes its Task); any other root of alpha, with and without `node`, refused CLOSED and nothing sent; beta's bystander and an agent on a third node zeta (paired with beta only) are delivered while it runs |
| RC-27/RC-28 additions | AC-004 refusals, QR-001 | `list_running_agents(node)` gives the same text as `list_available_agents(node)` for a stopped, switched-off and unpaired peer, a black-holed beta within the bound, alpha's switch off and an unknown node |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-06 RC-47, RC-48, RC-49, RC-27/28 additions | `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | The suite owns two-node behavior on built servers; the new routes and rule must stay proven over real HTTP |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-06 | two-server suite RC-06, RC-08, RC-20, RC-22, helpers | DS-006 delivery, new not-running text, new routes in the audit and in `sentRequests` | Rewritten to the new behavior, not loosened |
| API-07 | `tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` CPW-R1, CPW-R2, CPW-R3 | New not-running text; CPW-R2 asserts delivery | — |
| API-04 | `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | `node` in `send_message_to`'s fields | found by the whole run |
| API-08 | `tests/fixtures/collaboration-contract/contract-states.json`, the 461 model's `stories.py` (U9 message ID), `collaboration-contract-stories.e2e.test.ts` (O9 driver) | see inventory | found by the runs |

## Durable Coverage To Remove

| Existing Path / Test | Obsolete Assertion And Why | Requirement / AC / Design Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| CPW-R2's "You can't message this agent: it works on a different Task." | The refusal no longer exists | DEC-001, REQ-008, design removal plan (`OTHER_TASK_REFUSAL` removed) | CPW-R2 rewritten to assert delivery |
| RC-06/RC-22 "That run is on another node and is not linked with you …" | The outbound pair refusal is removed | design row 6, DS-006, removal plan | The same steps now assert delivery and both logs |

## Live Environment And Fixture Plan

- Startup order and commands: build → prepare → gated suites one at a time with `env -i PATH HOME=<fresh temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> REMOTE_E2E_EVIDENCE_DIR=<evidence>`.
- Environment choices that materially affect the run: Node 22.23.1; machine shared with other agents' test runs (load noted).
- Health / readiness checks: `/rest/health` per node (suite).
- Seed data / fixtures: GraphQL definitions and runs created by the suite.
- Requirement-linked journeys: RC-47 … RC-49 above.
- Evidence to capture: vitest output, the suite's JSON receipt (records each new case's results), both servers' logs; excerpts with the key lines.
- Owned processes and temporary state to clean up: the suite's servers and temp roots (its `afterAll` checks no AGY process is left).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Codex live LIVE-002 (`codex-standalone-send-message-global-routing.e2e.test.ts`) | Needs a signed-in Codex CLI and real Codex threads; the changed rule is server-side and reached through the same Agent Tools MCP `send_message_to` that the scripted runtime drives; its assertions remain true by reading | Low | No | None |
| Real paired user nodes (e.g. the user's Docker node) | TESTING.md forbids testing the user's nodes; two and three test-owned built servers prove the protocol | Low | No | None |
| MP-003 race | Contrived (design) | — | No | — |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: —
- Notes (round 1, updated after execution: the three test-side fixes above were found by the runs; API-04b could not run while FSEvents delivered no events; FU-005 records the environment-sensitive suites): the stale assertions are rewritten to the approved behavior before any broad run (the two stale files are kept out of broad runs until rewritten; the broad `pnpm test:e2e` skips gated suites anyway).
