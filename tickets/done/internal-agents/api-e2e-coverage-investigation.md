# API/E2E Coverage Investigation — autobyteus-308 (internal agents)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/internal-agents/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md` (C-01…C-08)
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001)
- Supplemental Task Artifacts: none
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: Implementation Complete (direct route, Medium / Low) from `/software_engineering_team/implementation_engineer`
- Prior Investigation Reviewed: none

Paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/internal-agents`, branch `codex/internal-agents`, code `813f7208d2`, docs `692e884b77`, base `origin/personal` `651071758f`.

## Current Requirement And Design Basis

- `"internal": true` in `agent-config.json` marks an internal agent (shared, team-local, application-owned); saving keeps it (REQ-001, AC-006).
- Setting `AUTOBYTEUS_SHOW_INTERNAL_AGENTS` (Settings card or environment variable), off by default, read on each use (REQ-002, AC-005).
- While hidden, internal agents are left out of: the visible agent list (Agents page, pickers, mobile, application resources), run history, the Memory page, collaboration eligibility (`list_available_agents`, `@` candidates and by-ID `@`, `delegate_task` addresses, peer catalog and peer delegation), and `list_agent_definitions` (REQ-003…006).
- While shown they behave like other agents, and the Agents page badges them "Internal" (REQ-007). Opening by ID always works (REQ-008).
- One owner, `InternalAgentVisibility`; no consumer reads the setting or attribute itself.

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001 (user browses/picks agents and runs), SCN-002 (agent or peer lists, mentions, delegates), SCN-003 (user toggles the setting).
- Added from investigating the implementation:
  - SCN-A1: a system-started run of an internal agent exists (e.g. the Model Router's runs); while hidden, the user opens it by ID (a link, history of another node) and the run's page still renders its agent (REQ-008 in the UI; the web resolves the agent by ID while the list leaves it out).
  - SCN-A2: the setting changes while a page is open or an agent run is live (no restart): the next list, the next tool call, the next delegation follow it.
  - SCN-A3: the environment variable is set on a node (e.g. a Docker node's env) without any Settings change.
- Contrived / unsupported: none recorded.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 visible list + badge + save | Added/Changed | DS-001 | Server E2E (GraphQL, files on disk), browser probe |
| BEH-002 run history, Memory page | Changed | DS-002 | Server E2E with a real recorded run |
| BEH-003 collaboration eligibility (local and peer) | Changed | DS-003 | Server E2E with real agent tool calls (scripted AGY); two-server E2E case |
| BEH-004 `list_agent_definitions` | Changed | DS-003 | Live agent on the AutoByteus runtime (the tool is a local tool) |
| BEH-005 setting | Added | DS-004 | Server E2E (mutation, env var), browser probe (card) |
| Normal agents, by-ID reads, built-in exclusion, Agent Runtimes etc. | Preserved | Scope Guardrail | Existing suites |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | attribute, rule, five consumers | IMP-03 unit (real policy, catalog, lister) | composition: does each served surface reach the rule? | Server E2E |
| API / transport / contract | Yes | GraphQL `agentDefinitions`, `internal` field, settings mutation, run history and memory queries, MCP tools, peer REST | unit | real HTTP/MCP/peer requests | Server E2E, two-server E2E |
| Frontend component / state | Yes | card, badge, store refresh | IMP-04 | real stack | Browser probe |
| Browser integration / user journey | Yes | toggle → lists refresh; pickers; open hidden run by ID | IMP-05 (dev stack, list + badge) | pickers, history panel, run opened by ID | Browser probe |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer | Yes (same renderer) | — | — | — | Browser probe |
| Desktop shell | No | — | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | Yes (optional key, new setting) | absent = normal/off | unit | real files of existing agents untouched | Server E2E (on-disk check) |
| Worker / distributed coordination | Yes | peer catalog and delegation | unit (`RemoteCatalogLister`) | real peer node | Two-server E2E |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/internal-agents`
- Stack: pnpm monorepo; Fastify/GraphQL server, Nuxt web.
- Testing guideline: `TESTING.md` (root). No closer `TESTING*.md`.
- Conflicts: none.
- Secrets: not needed (scripted runtimes; one live local LM Studio model).

| Instruction / Configuration Path | Purpose | Learned |
| --- | --- | --- |
| `TESTING.md` | guideline | clean env for E2E; scripted AGY (`agy-failure-cli.mjs`, `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND`) for real tool calls without a model; one local-model run at a time, unload after; browser probes own their stack; build before `dist` users |
| `tests/e2e/projects/collaboration-model-contract.e2e.test.ts` | pattern | in-process server, `CALL_TOOL:{…}` → the agent calls the real tool, `CALLED:<result>` in its conversation |
| `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | pattern | two built nodes, beta's file-authored agents written before start, RC-26 asserts beta's exact offer |
| `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | pattern | live agents per runtime |
| `autobyteus-web/tests/e2e/*-probe.mjs` | pattern | real-stack browser probes |

| Component | Start | Readiness | Cleanup |
| --- | --- | --- | --- |
| In-process studio server | test file | listen | `close()`, temp data root removed |
| Two built nodes | `dist/app.js` via the two-server file | health | the file's cleanup |
| Probe stack | built node + Nuxt + Chrome | health | probe `finally` |
| LM Studio model | loaded on demand | — | `lms unload` |

| Data / Fixture | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| Synthesized internal agent | `agents/<id>/agent.md` + `agent-config.json {"internal": true}` written into the test-owned data root before start (as a shipped agent is) | synthesized only | data root removed |
| Normal agents | GraphQL `createAgentDefinition` | — | same |
| A recorded run of the internal agent | `createAgentRun` + one message on the scripted AGY runtime | — | same |

## Persisted Data Transition Coverage Basis

- Decision: `Directly Usable — No Migration`.
- Representative existing data: normal agents' `agent-config.json` without the key (created by the current server) are listed as before and keep no `internal` key after a save; the setting absent = off.
- Evidence planned: IA-01, IA-02.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Action |
| --- | --- | --- | --- | --- |
| unit: `internal-agents.test.ts`, `internal-agent-eligibility.test.ts`, settings, run history, memory explorer, list tool (IMP-03) | rule and consumers | AC-001…006 | Still Valid | Reuse (API-00) |
| web: `ShowInternalAgentsCard.spec.ts`, `AgentCard.spec.ts` (IMP-04) | card, badge | AC-005 | Still Valid | Reuse |
| `remote-delegation-two-server.e2e.test.ts` RC-26 | beta's exact offer | AC-003 peer | Still Valid; will hold an internal agent while hidden | Update (add an internal agent on beta, new RC-38) |
| No E2E of the visible list, history, Memory page, local collaboration with an internal agent | — | AC-001…005 | Gap | Add |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | AC-001…007 unit/web | unit, component | Reused | IMP-01, IMP-02, IMP-03, IMP-04 | `git diff --name-only 813f7208d2 692e884b77` = `tickets/` only |
| API-01 (IA-01) | AC-001, AC-007, REQ-008 | GraphQL on a real studio server | Durable | new `tests/e2e/agent-definitions/internal-agents.e2e.test.ts` | the served list |
| API-02 (IA-02) | AC-006, persisted data | GraphQL update + file on disk | Durable | same file | save keeps the attribute; a normal agent gains no key |
| API-03 (IA-03) | AC-002, REQ-008 | real run (scripted AGY), run history, Memory page, run by ID | Durable | same file | needs a real recorded run |
| API-04 (IA-04) | AC-003, AC-005 (collaboration), SCN-A2 | real agent tool calls over Agent Tools MCP (scripted AGY), `@` candidates, `@` by ID over WebSocket | Durable | same file: off → refused/absent; toggle on, no restart → listed, mention accepted, delegation starts a copy | real eligibility through every surface |
| API-05 (IA-05) | REQ-002, SCN-A3 | setting by mutation and by environment variable | Durable | same file | both setting paths, invalid value refused |
| API-06 (RC-38) | AC-003 peer, AC-005 peer | two real nodes | Durable | add an internal agent to beta + RC-38 in the two-server file | peer catalog and peer delegation |
| API-07 | AC-004 | live AutoByteus agent (local LM Studio model) with `list_agent_definitions` | Temporary Probe | live node, off → absent, on → present | the tool is a local AutoByteus tool; a durable live suite exists only behind gates |
| API-08 | AC-001, AC-005 UI, REQ-003 pickers, SCN-A1 | real stack page | Durable | new `autobyteus-web/tests/e2e/internal-agents-probe.mjs`: Basics card toggle; Agents page and badge; new-run target picker, team member picker, Org placement, featured items picker; run history panel; open the internal agent's run by URL while hidden | pickers and UI refresh |
| API-09 | regression | existing suites | Existing Test | collaboration-model-contract E2E, agent-definition E2E files, run history E2E | the policy and list changed |
| API-10 | Task: clean-clone proof | fresh clone of the branch | Other | clone, install, build, run API-00's focused tests and API-01…05 | the Task asks for it |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why |
| --- | --- | --- |
| API-01…05 | `autobyteus-server-ts/tests/e2e/agent-definitions/internal-agents.e2e.test.ts` | served surfaces with real runs and tool calls |
| API-08 | `autobyteus-web/tests/e2e/internal-agents-probe.mjs` (+ package script) | UI surfaces |

## Durable Coverage To Update

| Case ID | Existing Path | Update |
| --- | --- | --- |
| API-06 | `remote-delegation-two-server.e2e.test.ts` | beta gets a file-authored internal agent; RC-38 after RC-26 |

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| Mobile apps | same GraphQL list (API-01); no mobile UI change | Low | No | — |
| Application resolver with a shared internal agent (handoff Known Risks) | no application references one; observation for autobyteus-32 | Low now | No | note for the designer |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added and updated)
- Reroute Required: `No`
