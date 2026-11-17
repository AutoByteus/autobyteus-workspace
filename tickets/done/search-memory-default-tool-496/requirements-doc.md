# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `search-memory-default-tool-496`
- Request / ticket: Project Task `autobyteus-496` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`): memory search (`search_memory`) as a default tool for every agent
- Requested by: `/project_task_manager`, for the founder; revised by the user directly in the Solution Designer's conversation (2026-11-17)
- Requirements owner: Solution Designer
- Date: 2026-11-17
- Approved by and reference: `User`. Reference: the user's message of 2026-11-17 in the Solution Designer's conversation: "in this ticket … I want to make it simple, simple means that we don't have to care about privacy for now … Simply make each agent able to have this tool because we will try to optimize in the future."
- Exact approved requirements baseline: this document at SR-004 (replaces SR-001 to SR-003; those versions are in git history up to `cf29ff1cd8`)
- Behavior-defining supplements: none

## Problem And Desired Outcome

- **Problem:** `search_memory` reaches an agent only when its own `agent-config.json` lists it: 5 of 163 package agent configs on this node. The self-improving program (autobyteus-482) needs every agent to be able to find earlier work, without each package author adding the tool.
- **Desired outcome:** every agent run, on every runtime, has `search_memory` from the platform, unchanged in what it does. It searches every run on the node except the asking run, as it does today for the agents that list it.
- **Observable definition of success:** a new or restored run of any agent definition lists `search_memory` without any package change, and the tool works as it does today.
- **User's direction for later work (not this ticket):** search will grow to cover semantic memory as well as work journals, and memory that belongs to an agent, an agent team, and the whole node. With good embeddings, the agent's own memory is expected to rank first by relevance. Privacy limits and scopes are to be designed then (FU-001, FU-004).

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | An agent has `search_memory` only when its definition's `toolNames` lists it | Every agent run on every runtime has it | The native defaults and the automatic collaboration tools are unchanged; the tool's search, result and description are unchanged | IN-001, IN-002, IN-004 |
| BEH-006 | System | SCN-006 | Tool-list changes reach running runs (autobyteus-324); a restored run whose tools differ from its seen record gets one notice | The same paths deliver the new default. A run restored after the upgrade gets the tool and the one-line "tools updated" notice. | No system-prompt text is added | IN-003 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Any agent run | Find earlier work | Has `search_memory` | — |
| Founder / user | Wants every agent able to learn from earlier work; privacy deferred | Simple change now | Decided by the user, 2026-11-17 |
| Package author | Configures agents | No per-package edit needed | Listing the tool explicitly stays harmless |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Any agent, with no package change, searches memory with `search_memory` on any runtime | SCN-001, SCN-002 |
| UC-004 | Existing runs receive the tool through the existing tool-list paths | SCN-006 |

### Out Of Scope

- Any privacy limit or scope on what a search returns (per agent, team, Project or node): deferred by the user's decision (FU-001, FU-004).
- A per-agent off switch (FU-002).
- Searching semantic memory, team memory or global memory (FU-004).
- Changing the tool's description, result or ranking.
- Semantic memory and reflection folders staying opt-in (FU-003).

### Non-Goals

- Reducing prompt size.

### Preserved Behavior Boundary

- The `search_memory` behavior and result for agents that list it today (node-wide, minus the asking run).
- The native default tools and the automatic collaboration tools.
- The Memory page search.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID.
- A finding that would add a privacy limit, scope or switch is a `Requirement Gap` (the user deferred them), not a correction.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Every agent run, on every runtime and every run kind, has `search_memory` without any package change. A definition that also lists it gets it once. | BEH-001 | Must | Founder's direction; user's decision | N/A | Task; user 2026-11-17 |
| REQ-002 | The tool's search, result and description are unchanged. | BEH-001 | Must | Simplest; preserved behavior | N/A | User 2026-11-17 |
| REQ-003 | Existing runs get it at their next start or restore, through the existing tool-list paths. No system-prompt text is added. | BEH-006 | Must | No restart of conversations needed beyond the upgrade | N/A | DEC-004 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001, SCN-001, SCN-002 | A definition without `search_memory` in `toolNames`; a run on each runtime | The run's exposure lists `search_memory`. Native: the agent's tool instances include it. MCP runtimes: the run's Agent Tools `tools/list` includes it. | A definition that lists it gets it exactly once | Server unit tests: exposure rule, native resolver, MCP catalog |
| AC-002 | REQ-002 | BEH-001 | A run with the default tool calls it | Same result as an explicitly listed tool today | — | Existing memory tool tests stay green |
| AC-003 | REQ-003 | BEH-006, SCN-006 | A restored run whose seen record lacks the tool | It gets the tool and the one notice "Now available: search_memory". System prompts are unchanged. | — | Existing tool-list update tests plus one case |
| AC-004 | REQ-001 | SCN-001 | Real runtime check | A real native run and a real Claude (or Codex) run, from a definition without the tool listed, call `search_memory` and get results | — | API/E2E: gated runtime run or isolated app instance |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Any agent (native) | Find earlier work | Calls `search_memory` | Memory index built | As today | Results | Index not built: the existing coverage note | Supported Normal Scenario | Founder's direction | REQ-001, AC-001, AC-004 |
| SCN-002 | System | Agent on Claude/Codex/AGY/Grok/DeepSeek | Same | MCP `tools/call` | Same | Through the Agent Tools MCP endpoint | Same | — | Supported Normal Scenario | Task question | REQ-001, AC-001, AC-004 |
| SCN-006 | Operational | Platform (upgrade restart, restore) | Runs get the tool | Restore | Runs exist | Restore → tool + one notice | Tool present | Codex/Grok: at next turn | Supported Normal Scenario | autobyteus-324 docs | REQ-003, AC-003 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. N/A: not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002 | Compatibility | Explicit agents see no change | — | AC-002 |
| QR-002 | REQ-001 | Privacy | **Accepted by the user:** every agent can find every run on the node, including private runs (Daily Assistant, Bible Study Group, job search) | Until FU-001/FU-004 | Stated in the result to the PM |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. The per-run seen-tool-names record gains the name through the existing notice path.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Agent Tools MCP endpoint | `tools/list` follows the session's exposure | agent_tools_mcp_server.md | None |
| Provider prompt cache | A tool-list change misses the cache once | Provider behavior | One miss per run at the upgrade restore |

## Supplemental Artifacts

None.

## Assumptions

None.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What may a platform-given search see? | Privacy | Own runs (SR-001 to SR-003) or node-wide as today | The user: keep it simple, no privacy for now; search will later cover agent, team and global memory, where the own memory should rank first. **Node-wide, unchanged.** | User | Decided (2026-11-17) |
| DEC-003 | Per-agent off switch? | Pure helpers | Config switch or none | Simplest is none. Every agent, including the Model Router, gets it. A switch is a follow-up (FU-002). **None in this ticket.** | Solution Designer, within the user's "simply make each agent able to have this tool" | Decided |
| DEC-004 | Do running conversations get it? | The PM asked for "without a restart" | New runs only, or next start/restore | The existing paths, no new code; the upgrade restarts the server. **Next start or restore, with the one notice.** | Solution Designer | Decided |
| DEC-005 | Shorten the description? | Prompt cost | Keep, or ≤ 900 characters | It no longer has to explain a scope, and its text is accurate for node-wide search. **Unchanged** (about 1,400 characters). | Solution Designer | Decided |
| DEC-007 | Semantic and reflection folders? | Task question | Opt-in today | **Unchanged** (FU-003); search over semantic memory is FU-004 | Solution Designer | Decided |
| DEC-009 | Same way on all runtimes? | Task question | One shared exposure rule | **Yes, through the shared rule** | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-004 | SCN-001, SCN-002 |
| REQ-002 | UC-001 | BEH-001 | AC-002 | SCN-001 |
| REQ-003 | UC-004 | BEH-006 | AC-003 | SCN-006 |

## Architecture Phase Input

- Add the name in the shared exposure rule; nothing else changes.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible: `Yes`
- Content ready for approval: `Yes`

### Approved Basis Ready For Design

- Approval recorded: `Yes` (the user, 2026-11-17)
- Approved requirements package ready for architecture design: `Yes`
