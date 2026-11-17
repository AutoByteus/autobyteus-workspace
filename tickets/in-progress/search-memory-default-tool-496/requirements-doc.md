# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003` (AC-003 clarified within REQ-003; approval basis SR-001 unchanged)
- Package identifier: `search-memory-default-tool-496`
- Request / ticket: Project Task `autobyteus-496` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`): memory search (`search_memory`) as a default tool the platform gives to every agent
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), carrying the founder's direction and decision of 2026-11-16
- Requirements owner: Solution Designer
- Date: 2026-11-16
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's conversation message of 2026-11-16 that reports DEC-001…DEC-009, and the message to the PM with the same content
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- **Problem:** `search_memory` reaches an agent only when its own `agent-config.json` lists it. Five agent definitions in the public package list it today. No definition in the private package does, and neither do the built-in agents. The self-improving program (autobyteus-482) needs every agent to see what it did before, without each package author having to add the tool. The tool searches every run on the node today, including the founder's private runs (Daily Assistant, Bible Study Group, Job Search team and others). Giving that same tool to every agent would expose his private work to every agent.
- **Affected actors or systems:** every agent run on every runtime (AutoByteus native, Claude Agent SDK, Codex, Antigravity, Grok Build, DeepSeek Harness); package authors; the founder as the owner of private runs.
- **Desired outcome:** every agent gets `search_memory` from the platform. The default tool searches only that agent's own earlier runs. An agent can switch it off. Agents that list the tool explicitly keep today's node-wide search. No new run's private work becomes visible to another agent.
- **Observable definition of success:** a new run of any agent, on any runtime, lists `search_memory` without any package change. Its searches return only runs of the same agent definition. An agent whose config switches it off has no such tool. The five agents that list it explicitly search exactly as before.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | An agent has `search_memory` only when its definition's `toolNames` lists it. 5 of 163 package agent configs on this node list it. | Every agent run on every runtime gets `search_memory`, unless its definition switches it off. | The native defaults (`run_bash`, `read_file`, `edit_file`, `write_file`) and the automatic collaboration tools are unchanged. | IN-001, IN-002, IN-004 |
| BEH-002 | Contract | SCN-001, SCN-003 | Every search covers all runs on the node except the asking run itself. | A platform-given search covers only the runs of the asking agent's own definition, except the asking run. | — | IN-005, IN-006, PR-001 |
| BEH-003 | Contract | SCN-004 | Explicitly listed: node-wide search. | Unchanged: an agent whose definition lists `search_memory` still searches all runs on the node. | Today's node-wide search for the five explicit agents. | IN-004, IN-012 |
| BEH-004 | Contract | SCN-003 | `wordsNotFound` and `note` are computed over the whole index, whatever the agent may see. | They are computed over the runs the search covers. | Node-wide behavior for an explicit agent. | IN-007 |
| BEH-005 | System | SCN-005 | There is no switch: an agent without the tool in `toolNames` simply has none. | `memorySearchEnabled: false` in `agent-config.json` turns the platform-given tool off. The Model Router ships with it off. | Explicit listing still gives the tool. | IN-009, IN-010 |
| BEH-006 | System | SCN-006 | Tool-list changes reach running runs (autobyteus-324); restored runs whose tools differ from their seen record get one notice. | The same paths carry the new default: a run restored after the upgrade gets the tool and the existing one-line notice. A definition change (switch, explicit listing) reaches running runs, including a scope change. | No system-prompt text is added for any run. | IN-003, IN-011 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Any agent run | Learn from its own earlier work | Has `search_memory` over its own earlier runs | Small prompt cost; no system-prompt change |
| Founder | Owns private runs (journals, Bible study, job search) | No new path from another agent to his private work | His words: never expose his private data to other agents |
| Package author | Configures agents | No per-package edit needed; can switch it off | One config field, written only when off |
| Explicit node-wide agents (PM, deep-researcher, agent-package-creator, marketing-content-creator, article-writer) | Find earlier work across agents | Unchanged | Their existing exposure is reported to the founder (FU-001) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent with no explicit listing searches its own earlier runs with the platform-given `search_memory`, on any runtime | SCN-001, SCN-002, SCN-003 |
| UC-002 | An agent that lists `search_memory` explicitly searches all runs on the node, as today | SCN-004 |
| UC-003 | A package author switches the platform-given tool off for one agent | SCN-005 |
| UC-004 | Existing and running runs receive the tool, or a changed switch or scope, through the existing tool-list paths | SCN-006 |

### Out Of Scope

- Narrowing or removing node-wide search for agents that list the tool explicitly (FU-001: the founder's decision).
- Marking runs or agents as private, and any per-Project or per-team scope.
- An editor UI toggle or personal setting for the switch (FU-002).
- Semantic memory and reflection folders: they stay opt-in per agent (DEC-007, FU-003).
- The Memory page's own search (user-facing GraphQL `memorySearch`): stays node-wide, since the user owns all runs.
- Building the memory index automatically. It stays the user's action on the Memory page.
- Direct file access: agents with `run_bash`/`read_file` (or a runtime's own shell) can already read any file under the memory folder. That is the existing file-access model, unchanged here.

### Non-Goals

- Changing search ranking, chunking, cards or the quality-check gates.
- A general per-tool "default tools" switch mechanism.

### Preserved Behavior Boundary

- BEH-003 / REQ-004 / AC-005: explicit listing keeps the node-wide search and its result shape.
- BEH-001 preserved column: the native default tools and the automatic collaboration tools are unchanged.
- The Memory page search and index lifecycle are unchanged.
- The asking run is still left out of its own results.
- The tool-list update and notice mechanisms (autobyteus-324) are reused unchanged.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Every agent run, on every runtime and every run kind (standalone, team member, Org member, delegated copy, application-launched), has `search_memory` without any package change, unless its definition switches it off. | BEH-001 | Must | Founder's direction | N/A | Task description; founder's decision comment |
| REQ-002 | A platform-given `search_memory` covers only runs of the asking agent's own definition (the same definition ID: standalone runs, team- and Org-member runs and delegated copies of that definition). The asking run itself is left out. A run whose definition is not recorded is never covered. | BEH-002 | Must (privacy) | Never expose the founder's private data to other agents | N/A (exact filtering, no uncertain technology) | DEC-001, DEC-008 |
| REQ-003 | Everything a scoped search reports is derived only from the covered runs: results, snippets, journal paths, `wordsNotFound` and `note`. A scoped search must not reveal whether any word or run exists outside its scope. A covered run must not be dropped because of runs outside the scope (no cap applied before the scope). | BEH-002, BEH-004 | Must (privacy, correctness) | `wordsNotFound` is a membership oracle; candidate caps of 4,000 chunks and 300 cards are node-wide | N/A | DEC-006, IN-007 |
| REQ-004 | An agent whose definition lists `search_memory` in `toolNames` searches all runs on the node, exactly as today. | BEH-003 | Must (preserved) | Existing agents depend on cross-agent search | N/A | DEC-002 |
| REQ-005 | `memorySearchEnabled: false` in a definition's `agent-config.json` removes the platform-given tool. Absent or `true` means on. The field is written to the file only when false. Saving the agent in the app keeps it. Explicit listing still gives the tool. | BEH-005 | Must | Per-agent off switch | N/A | DEC-003 |
| REQ-006 | The built-in Model Router ships with `memorySearchEnabled: false`. The Daily Assistant keeps it on. | BEH-005 | Should | A one-shot routing helper does not need it; per-call prompt cost | N/A | DEC-003 |
| REQ-007 | No system-prompt text is added for any run. The tool's one description is scope-neutral, at most 900 characters, and the result names the scope it searched. | BEH-006 | Must | Prompt and cache cost; autobyteus-460 precedent | Measured: today's description is ≈1,400 characters | DEC-005 |
| REQ-008 | Existing runs get the tool when they next start or restore. A running run gets a change of the switch or of the explicit listing, including a scope change, at once on runtimes that take tool changes live and at the next turn on Codex and Grok. Delivery reuses the existing tool-list update and notice paths. A scope narrowing takes effect from the next call on every runtime. | BEH-006 | Must | autobyteus-324 contract; privacy for narrowing | N/A | DEC-004 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001, SCN-001 | A definition with no `search_memory` in `toolNames` and no switch; a run is created on each runtime | The run's tool exposure contains `search_memory`. Native: the agent's tool instances include it. MCP runtimes: `tools/list` of the run's Agent Tools session includes it. | — | Server unit tests of the exposure rule and native resolver; MCP catalog/session test |
| AC-002 | REQ-002 | BEH-002, SCN-001, SCN-003 | Indexed runs of definitions A and B (standalone, team member, delegated copy) with matching text; a run of A searches | Only runs of definition A appear (not the asking run). Runs of B and folder-only runs never appear. | A record without a definition ID is excluded | Memory search unit tests with a temp index |
| AC-003 | REQ-003 | BEH-004, SCN-003 | A word occurs only in B's journals; A's run searches for it | A's result has no runs, `wordsNotFound` names the word, and `note` says it is not found. Same for meaning matches: B's cards are never matched. While the index or the meaning index is being built, A's `coverage` contains no counts of journal files (SR-003 clarification). | — | Unit tests (text and meaning) |
| AC-004 | REQ-003 | SCN-003 | More than 4,000 matching chunks / 300 nearer cards belong to B; A has one match | A's match is returned | — | Unit test with a small candidate cap or a crowding fixture |
| AC-005 | REQ-004 | BEH-003, SCN-004 | A definition lists `search_memory` | It searches all runs, as today (the existing tests stay green); the result names the node scope | — | Existing memory tool tests plus a scope assertion |
| AC-006 | REQ-005 | BEH-005, SCN-005 | `memorySearchEnabled: false` in agent-config.json | No `search_memory` in the exposure or tool list. With the tool also listed explicitly, it is present with node scope. Saving the definition in the app keeps the field; a definition without the field has no new key written. | — | Config read/write and update unit tests |
| AC-007 | REQ-006 | BEH-005 | Built-in templates | The Model Router has no `search_memory`; the Daily Assistant has it with own scope | — | Template/exposure unit test |
| AC-008 | REQ-007 | BEH-006 | Any run | System prompts are byte-identical to before for the same definition. The tool description is ≤ 900 characters, and the result carries `scope`. | — | Prompt composer tests unchanged; contract unit test of length |
| AC-009 | REQ-008 | BEH-006, SCN-006 | A running run; its definition gains `search_memory` explicitly, then loses it, then gets `memorySearchEnabled: false` | Its next search is node-wide, then own-scope, then the tool is gone with the "No longer available" notice. This holds on native too, where the tool instance is kept. | — | Tool-list-update integration test (native + one MCP runtime) |
| AC-010 | REQ-001, REQ-002 | SCN-001 | Real runtime check | A real native run and a real Claude (or Codex) run each call `search_memory` and get own-scope results | — | API/E2E: a gated runtime run or an isolated app instance |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Any agent | Recall its own earlier work | The agent calls `search_memory` | Memory index built | Agent asks → search over its definition's runs → pointers → agent reads lines | Own earlier runs found | Index not built: the existing coverage note | Supported Normal Scenario | Founder's direction; autobyteus-482 | REQ-001–003, AC-001–004, AC-010 |
| SCN-002 | System | Agent on Claude/Codex/AGY/Grok/DeepSeek | Same as SCN-001 | MCP `tools/call` | Same | Same, through the Agent Tools MCP endpoint | Same | — | Supported Normal Scenario | Task: "does the tool reach them the same way" | REQ-001, AC-001, AC-010 |
| SCN-003 | Contract | Founder's privacy rule | Another agent must not see private work | Any default-scope search | Private runs indexed (Daily Assistant measured) | Search whose words match only private runs | No result, no hint | — | Supported Explicit Edge Scenario (security) | Founder's words; PR-001 | REQ-002, REQ-003, AC-002–004 |
| SCN-004 | System | PM and other explicit agents | Find earlier work across agents | `search_memory` listed in config | — | As today | As today | — | Supported Normal Scenario | Their skills (IN-012) | REQ-004, AC-005 |
| SCN-005 | Operational | Package author | A helper does not need search | Edit agent-config.json | — | Set `memorySearchEnabled: false` | Tool absent | — | Supported Normal Scenario | Task: "a pure helper may not need it" | REQ-005, REQ-006, AC-006, AC-007 |
| SCN-006 | Operational | Platform (upgrade, definition change) | Runs get the tool without a manual restart | Server upgrade restart, restore; definition save | Runs exist | Restore → tool present + one notice; save → live apply | Tool or scope current | Codex/Grok: at next turn | Supported Normal Scenario | autobyteus-324 docs | REQ-008, AC-009 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. N/A: not applicable. There is no UI change; the tool-list "Tools updated" card already exists.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, REQ-003 | Privacy | 0 runs, words or hints from outside the scope in any default-scope result | All run kinds | AC-002–AC-004 |
| QR-002 | REQ-007 | Performance (prompt) | Description ≤ 900 characters; no system-prompt change | All runtimes | AC-008 |
| QR-003 | REQ-004 | Compatibility | The node-wide search is unchanged for explicit agents | — | AC-005; the memory-search quality check is not needed (no ranking change) |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`, two derived or optional items:
  - the memory index's run records (`runs.record` JSON in the disposable `memory-search.sqlite`) gain the run's agent definition ID;
  - `agent-config.json` may hold `memorySearchEnabled: false`.
- Data or state that must be preserved: every existing agent-config.json as it is (no new key written unless the switch is off); the index content.
- Acceptable: run records without the new field are excluded from own-scope searches until the next server start's catch-up pass rewrites them. The index is disposable and is not migrated.
- Constraints: privacy (fail closed).
- Unknowns: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Agent Tools MCP endpoint | `tools/list` and `tools/call` follow the session's exposure | docs/modules/agent_tools_mcp_server.md | None: existing |
| Provider prompt caching | A tool list change misses the cache once | Provider behavior | One miss per run at the upgrade restore |

## Supplemental Artifacts

None.

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A team or Org member's recorded `agentDefinitionId` equals the ID its run is created with (shared members resolve to the shared ID). | Own scope must cover team-member runs of the same definition | Implementation test with a team member and a standalone run of one definition | Open (design verifies) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What may a platform-given search see? | Founder's privacy rule | (a) the agent's own definition; (b) its team; (c) its Project; (d) node-wide minus a private list | (d) is opt-out privacy: a missed marking leaks, and the Daily Assistant is a built-in agent outside the private package. (c) Most runs have no Project, and Project is not recorded per run. (b) Team members of the founder's private teams would still see each other's runs, and standalone agents have no team. (a) is exact and matches semantic memory's ownership rule (one per definition, shared by its runs). It serves "see what I did before". **Own definition.** | Solution Designer | Decided |
| DEC-002 | What happens to agents that list the tool explicitly? | 5 agents rely on cross-agent search | Keep node-wide; or narrow to own | Narrowing breaks the PM's and the package creator's documented use and changes existing behavior. That is the founder's call, so it goes to him as FU-001. **Keep node-wide; report the existing exposure now.** | Solution Designer (preserve); founder (FU-001) | Decided |
| DEC-003 | Off switch: where, and what default? | Pure helpers and prompt cost | Config field; personal setting; UI toggle; none | A config field matches the `internal` precedent (file-only, written only when set). UI and personal setting are follow-up FU-002. **Default on; `memorySearchEnabled: false` to switch off; the Model Router off.** | Solution Designer | Decided |
| DEC-004 | Do running conversations get it? | The PM asked for "without a restart"; the comment says no prompt change for running conversations | (a) only new runs; (b) next start/restore plus live definition changes | (b) reuses autobyteus-324 with no new code. The upgrade restarts the server, so every run is restored. The cost is one cache miss and one short notice per run. No system-prompt text is added. **(b).** | Solution Designer | Decided |
| DEC-005 | How small can the prompt cost be? | Every call carries the tool definition | Today ≈1,400 characters | Keep the guidance that makes results usable (read the lines, cite) and drop repetition. Make it scope-neutral, so a scope change never changes the description. **≤ 900 characters; `scope` in the result.** | Solution Designer | Decided |
| DEC-006 | Must `wordsNotFound` and `note` be scoped? | Membership oracle across private runs | Scope or drop | **Scope them to the covered runs.** "Not found in your memory" is then true for "your" runs. | Solution Designer | Decided |
| DEC-007 | Do the semantic and reflection folders follow the same rule? | Task question | Semantic memory is opt-in (`semanticMemoryEnabled`, or a personal setting); the reflection skill writes inside it, else in the workspace | Making them default creates folders and adds a prompt section for every agent. That is a separate product decision with prompt cost. **Unchanged here; FU-003 for the founder.** | Solution Designer | Decided |
| DEC-008 | Runs whose definition is unknown? | Folder-only runs, records written before this change | Include or exclude | Privacy fails closed. Records are rewritten at the next server start. **Exclude.** | Solution Designer | Decided |
| DEC-009 | Does the tool reach all runtimes the same way? | Task question | All runtimes resolve their tools through one shared exposure rule; MCP runtimes use the existing `search_memory` adapter | **Yes, through the shared rule.** | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-010 | SCN-001, SCN-002 | — |
| REQ-002 | UC-001 | BEH-002 | AC-002, AC-010 | SCN-001, SCN-003 | — |
| REQ-003 | UC-001 | BEH-002, BEH-004 | AC-003, AC-004 | SCN-003 | — |
| REQ-004 | UC-002 | BEH-003 | AC-005 | SCN-004 | — |
| REQ-005 | UC-003 | BEH-005 | AC-006 | SCN-005 | — |
| REQ-006 | UC-003 | BEH-005 | AC-007 | SCN-005 | — |
| REQ-007 | UC-001 | BEH-006 | AC-008 | SCN-001 | — |
| REQ-008 | UC-004 | BEH-006 | AC-009 | SCN-006 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001 to SCN-006.
- Constraints: privacy fail-closed; no system-prompt change; reuse the autobyteus-324 paths; the explicit node-wide behavior is unchanged.
- Deferred to design: where the scope is resolved and carried; how native kept instances observe a scope change; how the index filters before its caps.
- Technical facts to verify: ASM-001; the editor save path keeps the new field.
- Risks: a scope that is stale on native after a definition change (AC-009).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; the founder's decision comment leaves these choices to the team; user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
