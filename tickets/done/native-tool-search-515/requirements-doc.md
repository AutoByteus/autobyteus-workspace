# Requirements Document — autobyteus-515: tool search on the AutoByteus native runtime

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `native-tool-search-515`
- Request / ticket: Project Task `autobyteus-515`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Requirements owner: Solution Designer
- Date: 2026-11-17
- Approved by and reference: `Solution Designer within the direction (user informed)`; the requirements stay inside the Task's direction, which hands the team the decision of which tools stay listed. The Task also requires the founder's agreement before anything is built: that agreement is asked once on the completed design (design spec, Approval Basis), with these requirements in the same message.
- Exact approved requirements baseline / solution revision: this document at `SR-001`
- Behavior-defining supplements and their approved versions: none (evidence files only)

## Problem And Desired Outcome

- Problem: on the native runtime every request carries the full definition of every tool the agent has, used or not. Measured on DeepSeek (RF-002): the Project Task Manager's 17 tools cost 7,489 tokens per request, the Daily Assistant's 21 tools 8,139. Adding a tool during a run (live tool updates, 324; `update_task` for delegators, 380) changes the tool list and rebuilds the whole cached prefix. The external runtimes (Claude Agent SDK, Codex, Grok Build) already avoid this with a tool search.
- Affected actors or systems: every agent run on the AutoByteus native runtime, on every native LLM provider; the founder, who pays for the tokens.
- Desired outcome: a native agent pays for a tool's definition only in a conversation that uses it. Tools that are not listed are found by search and then called. The tools sent in requests do not change during a run because of this, so the prompt cache stays valid.
- Observable definition of success: on the Project Task Manager and the Daily Assistant run natively on DeepSeek, the prompt tokens per request fall by the measured amounts (AC-008) while the same evaluation tasks succeed as before (AC-009); search-then-call works on every native provider the team can reach (AC-004).

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Every request sends all the agent's tools in full | Requests send the listed tools and the search tools; searchable tools are not sent | The agent keeps every tool it has; each is still callable | RF-001, RF-002, `llm-phase.ts:143-147` |
| BEH-002 | Contract | SCN-002 | A tool call runs the agent's own tool by name, after argument check and approval | A found tool runs exactly as a listed one: same argument check, same approval, the run shows the real tool and its result | Approval, events, tool cards and results are unchanged for listed tools | `tool-phase.ts` |
| BEH-003 | System | SCN-003 | A tool added during a run changes the tools sent; the cache is rebuilt; the agent gets the 324 notice | An added tool is searchable; the tools sent stay the same; the agent gets the 324 notice | The 324 notice and "Tools updated" card | 324 REQ-001/006 |
| BEH-004 | System | — | External runtimes defer Agent Tools behind their own search | Unchanged | Everything on Claude, Codex, Grok Build, Antigravity, DeepSeek harness | 324 probes |
| BEH-005 | System | SCN-004 | Compaction summarizes the old conversation | After compaction the agent can search again and call any of its tools | Compaction behavior | `llm-phase-compaction.ts` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Founder | Lower token cost on the native runtime | Measured fewer tokens per request, task success unchanged | Builds only after he agrees; releases on his word |
| Native agent | Do its work with its tools | Finds and calls any tool it has | Works on every native provider |
| User watching a run | See what the agent does | Sees the real tool in the run (not a generic wrapper) | Approval prompts name the real tool |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A native agent's requests carry only its listed tools and the search tools | SCN-001 |
| UC-002 | A native agent searches for a tool and calls it | SCN-002 |
| UC-003 | A tool is added to (or removed from) a running native agent | SCN-003 |
| UC-004 | A native agent continues after automatic compaction | SCN-004 |
| UC-005 | The team evaluates old against new on real agents | SCN-005 |

### Out Of Scope

- External runtimes (Claude Agent SDK, Codex, Grok Build, Antigravity, DeepSeek harness): they keep their own tool search.
- Provider-native tool search features (Anthropic `defer_loading` + `tool_reference`, OpenAI Responses client `tool_search`) on the native runtime: not used by native runs today (census) and not needed for REQ-005 (FU-001).
- A per-agent setting or UI to keep chosen tools listed (DEC-005; FU-002 if the evaluation shows a need).
- Shortening tool descriptions (a separate kind of saving; 496 already trimmed `search_memory`).
- The 380 decision (who gets `update_task`): this ticket only makes such an addition cheap on native.
- A system prompt change on native (460).

### Non-Goals

- No promise of a money saving of a given size: with DeepSeek's cache, a cached token costs 3 % of an uncached one, so the money saved per request is small when the cache hits (RF-005). The ticket promises the token saving and measures the cache reads.
- No semantic (embedding) search of tools.

### Preserved Behavior Boundary

- BEH-002 (approval, events, tool cards, results), BEH-004 (external runtimes), BEH-005 (compaction), the 324 notice and card.
- Every tool an agent has today stays callable (REQ-004).

### Prerequisites

None. The Kimi test account is suspended (external, RF-004): Kimi cannot be probed, which limits AC-004's coverage but does not block the ticket.

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status (written down / sent / delivered) |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | On the native runtime, an agent's tools are split into **listed** and **searchable**: the native base tools (`run_bash`, `read_file`, `write_file`, `edit_file`) are listed; every other tool the agent has is searchable. Requests carry the listed tools' definitions and the search tools, and no definition of a searchable tool | BEH-001 | Must | Pay for a definition only in a conversation that uses it | RF-002: PM 7,489 → 2,368 tool tokens at the start of a conversation, Daily Assistant 8,139 → 2,380 | DEC-001 |
| REQ-002 | An agent with at least one searchable tool gets a search tool and a call tool, listed. The search tool's description names the agent's searchable tools (names only) | BEH-001 | Must | The model must know what exists to search for it | RF-004: every reachable provider searched by name or words 21 of 21 times | DEC-002, DEC-003 |
| REQ-003 | The search takes words or exact tool names and returns the matching searchable tools with their full definitions (name, description, argument schema) as its result, which is appended to the conversation. An exact name returns that tool; a search that matches nothing says so and lists the searchable names | BEH-001 | Must | The definition must reach the model before it calls | RF-004 | DEC-004 |
| REQ-004 | A searchable tool is called through the call tool (tool name + arguments) and then runs exactly as a listed tool: argument validation, approval when tools are not auto-executed, run events, the tool card and its result all name the real tool. A call naming a tool the agent does not have is refused with a clear message; a malformed call (no tool name, arguments not an object) gets a message saying how to call | BEH-002 | Must | Same behavior and safety for every tool | RF-004: proxy call correct 21 of 21; direct calls of an undeclared name failed on GLM, Grok and OpenAI (and GLM then reported the work as done) | DEC-003 |
| REQ-005 | REQ-001…REQ-004 hold for every native provider (OpenAI, Anthropic, Gemini, Mistral, Ollama, DeepSeek, Grok, Kimi, Qwen, LM Studio, GLM, MiniMax, OpenAI-compatible endpoints), with no provider-specific tool search | BEH-001, BEH-002 | Must | "Not only Anthropic" | RF-004: DeepSeek V4 Flash and Pro, Gemini 3.8 Flash, GLM 5.3, Grok 4.7, GPT-5.4 mini, Claude Sonnet 5.5: 3 of 3 each. Kimi not reachable (account suspended); Mistral, Qwen, MiniMax, Ollama, LM Studio not in the test vault | DEC-002 |
| REQ-006 | Neither a search, nor a call of a found tool, nor a tool added to or removed from a running agent changes the tools or the system prompt sent in that run's later requests. A tool added during a run is searchable and announced by the existing tools-updated notice | BEH-003 | Must | "Adding one does not invalidate the prompt cache" | Search results are appended content (prefix match; provider docs) | Task |
| REQ-007 | After automatic compaction removes earlier search results, the agent can search again and call any of its tools | BEH-005 | Must | Long runs keep working | Follows from REQ-002/REQ-004 (the search and call tools stay listed) | — |
| REQ-008 | The saving is measured on real agents run natively on DeepSeek V4 Flash: prompt tokens per request, cache reads per request and requests per task, old against new | BEH-001 | Must | "Measure tokens per request before and after on a real agent" | RF-002 gives the expected size | Task |
| REQ-009 | Task success is unchanged: the same evaluation tasks succeed with the new behavior as with the old | BEH-002 | Must | "Task success unchanged" | RF-004 is the per-provider indication; the evaluation is the proof | Task |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001, SCN-001 | A native run of the PM definition | Its requests' `tools` hold the four base tools, the search tool and the call tool, and no other definition; the search tool's description names every other tool of the agent | An agent with no searchable tool gets no search or call tool | `autobyteus-ts` unit + server integration on the resolved tool set |
| AC-002 | REQ-003 | SCN-002 | The agent searches `update_task`, or words such as "close a task" | The result holds `update_task`'s full definition; a search that matches nothing says so and lists the searchable names | — | Unit |
| AC-003 | REQ-004 | BEH-002, SCN-002 | The agent calls a found tool through the call tool, with tools not auto-executed | The approval prompt, the run's tool card and the events show the real tool and its arguments; after approval it runs and its result reaches the model | A tool the agent does not have → refused with a clear message; malformed `call_tool` arguments → a message saying how to call; invalid tool arguments → the same validation error a listed tool gives | Unit + server integration; one live run |
| AC-004 | REQ-005 | SCN-002 | The probe scenario per provider | The agent searches and closes the Task correctly on each provider reachable with the test vault | A provider not reachable is recorded with the reason | Gated live suite (from `evidence/probe-search-then-call.mjs`) |
| AC-005 | REQ-006 | BEH-003, SCN-003 | A tool is added to a running native agent's definition, and later removed | The next request's `tools` and system prompt are byte-identical to the previous request's; the agent got the tools-updated notice; it can search and call the added tool; a removed tool is refused | — | Unit + server integration |
| AC-006 | REQ-006 | SCN-002 | Two consecutive requests around a search and a found tool's call | `tools` and system prompt are identical across them; on DeepSeek the later request reports cache reads covering at least the earlier prefix | — | Unit (request bytes) + live (cache reads) |
| AC-007 | REQ-007 | BEH-005, SCN-004 | A native run that found a tool, then compacted | The agent can search and call the tool after compaction | — | `autobyteus-ts` integration with a scripted model |
| AC-008 | REQ-008 | SCN-005 | The evaluation set on the PM and the Daily Assistant, native, DeepSeek V4 Flash | Per request: the first request of a conversation carries at least 5,000 fewer prompt tokens (RF-002: PM −5,121, Daily Assistant −5,759); mean prompt tokens per request over each task, cache reads and request counts are reported old against new | A smaller saving is reported as measured, with its cause | Evaluation script, isolated data |
| AC-009 | REQ-009 | SCN-005 | Same evaluation set | Every task that succeeds old also succeeds new (success judged by the resulting state, e.g. the Task closed, the file written) | A task that fails new is a failure of this AC | Evaluation script |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Native agent loop | Make an LLM request | Every turn's LLM call | A native run with tools | The request is built with the listed tools and the search tools | Fewer tokens per request | — | Supported Normal Scenario | RF-002 | REQ-001, REQ-002; AC-001 |
| SCN-002 | System | Native agent | Use a tool that is not listed | The model decides it needs a tool | The tool is searchable | Search → definitions in the conversation → call through the call tool → the tool runs (approval if required) → result | The work gets done as with a listed tool | Nothing found; wrong name; invalid arguments; denied approval | Supported Normal Scenario | RF-004 | REQ-003…REQ-006; AC-002…AC-004, AC-006 |
| SCN-003 | User | The user (or a package update) | Change a running agent's tools | Agent definition edit (324) | Run idle or busy | Save → notice → the agent searches and calls the new tool | No change to `tools`; the cache stays valid | Removal: the tool is refused | Supported Normal Scenario | 324 | REQ-006; AC-005 |
| SCN-004 | System | Native compaction | Continue a long run | Compaction threshold | Earlier search results compacted | The agent searches again when it needs a tool | Work continues | — | Supported Normal Scenario | Compaction exists | REQ-007; AC-007 |
| SCN-005 | Operational | The team | Show the saving and unchanged success | Evaluation before release | Old and new builds | Same tasks on both; tokens, cache reads, requests and success recorded | Measured saving, success unchanged | — | Supported Normal Scenario (Task direction) | Task | REQ-008, REQ-009; AC-008, AC-009 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` new UI. The run already shows tool cards; the search shows as one more tool card, and a found tool's card names the real tool (REQ-004).
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: N/A — not applicable
- Explicitly illustrative fixture content or permitted implementation variation: N/A — not applicable
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: N/A — not applicable
- Product decisions that need the user (with reasoning and recommendation): none beyond the design approval the Task requires.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-008 | Performance | First request of a conversation: ≥ 5,000 fewer prompt tokens for the PM and the Daily Assistant on DeepSeek V4 Flash | Native, these two agents | Evaluation |
| QR-002 | REQ-006, AC-005, AC-006 | Performance | `tools` and system prompt byte-identical across all requests of a run unless the agent's base tools change | Native | Unit |
| QR-003 | REQ-003 | Performance | Search runs in-process over the agent's own tools, no I/O | Native | Unit |
| QR-004 | REQ-004 | Security | The call tool reaches only tools the agent has; it adds no tool and bypasses no approval | Native | Unit |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: existing runs' memory and restore; a restored run gets the new split from its next request.
- Loss, reset, rebuild, or regeneration that is acceptable: the provider cache of a run restored after the update is rebuilt once (its tool list changes once).
- Retention, privacy, compliance, volume, downtime, or operational constraints: none.
- Unknowns requiring downstream investigation: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Provider function calling (all native providers) | A declared function (the call tool) with a free-form `arguments` object is accepted and filled correctly | RF-004 | Providers not in the vault (Mistral, Qwen, MiniMax, Ollama, LM Studio) are unprobed (U-002) |
| Provider prompt caches | Appended conversation content keeps the cached prefix | Provider docs | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/request-tokens-deepseek-2026-11-17.json` | Tokens before/after | REQ-008, AC-008 | Final | Evidence |
| `evidence/probe-search-then-call-2026-11-17.json` | Feasibility per provider | REQ-004, REQ-005, AC-004 | Final | Evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The probe's PM-like task represents how agents use searchable tools | Feasibility basis | The evaluation (AC-009) on real agents | Open |
| ASM-002 | A found definition stays in the conversation until compaction, so an agent searches once per tool per conversation | Saving and round trips | Evaluation counts requests per task | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Which tools stay listed and which are searchable? | Size of the saving vs extra search steps | (a) **Base rule**: the four native base tools listed, everything else searchable: PM −68 %, DA −71 % of tool tokens at conversation start (RF-002). (b) Usage rule, a fixed list of rarely used tools: PM −40 %, DA −52 %, but agents' frequent tools differ (PM `list_project_tasks` 92 % of runs, DA `open_tab` 36 %; RF-003), so one global list fits nobody well. (c) Per-agent "always listed" setting: right owner, but a new definition field and UI | (a). A found definition stays in the conversation, so each conversation pays for exactly the tools it uses, plus one search round trip per tool it needs (searches can return several tools at once). It is the rule the external runtimes already apply to the same Agent Tools (all deferred behind their search), and the PM works there. It needs no per-tool or per-agent list that would drift. (c) is the refinement if the evaluation shows a quality or latency problem for an agent's hot tools (FU-002) | Solution Designer (the Task hands the team this decision) | Decided |
| DEC-002 | Provider-native tool search or one mechanism for all? | Coverage, size, maintenance | Anthropic supports a custom search returning `tool_reference` blocks over `defer_loading` tools; OpenAI only on the Responses API from `gpt-5.4`; no other native provider has one (Source Log). The provider-neutral search + call tool worked on all seven reachable providers, Anthropic and OpenAI included (RF-004). Native runs today use DeepSeek, Gemini and Qwen, not Anthropic or OpenAI (census) | One provider-neutral mechanism for every provider. Two provider-native paths would add code for providers native agents do not use today, and the neutral path already works there. FU-001 records the native paths as a later option | Solution Designer | Decided |
| DEC-003 | How does a found tool become callable without changing `tools`? | Reliability and cache | *Direct*: the model calls the found tool by its own name although it is not declared: correct on DeepSeek, Gemini and Anthropic, **failed 0 of 3 on GLM, Grok and OpenAI** (GLM then delegated and told the user the Task was closed). *Proxy*: a declared call tool with `name` + `arguments`: correct 21 of 21 | Proxy. It is a declared function on every provider, so no provider has to accept an undeclared name; the runtime turns it into the real tool's invocation so validation, approval and the run's display stay those of the real tool (REQ-004) | Solution Designer | Decided |
| DEC-004 | How does search match? | Simplicity, no dependencies | Keyword match over names, descriptions and argument names, exact name first, a few results per search (as Anthropic's regex/BM25 variants and Claude Code's `select:`); embeddings would add a model dependency for tens of tools | In-process keyword match; exact names first | Solution Designer | Decided |
| DEC-005 | A per-agent setting to keep chosen tools listed now? | UI and definition surface | Not needed to meet REQ-001…009; the evaluation shows whether any agent needs it | Not in this ticket (FU-002 if the evaluation shows a need) | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-008 | SCN-001 | RF-002 |
| REQ-002 | UC-001, UC-002 | BEH-001 | AC-001 | SCN-001, SCN-002 | RF-004 |
| REQ-003 | UC-002 | BEH-001 | AC-002 | SCN-002 | RF-004 |
| REQ-004 | UC-002 | BEH-002 | AC-003 | SCN-002 | RF-004 |
| REQ-005 | UC-002 | BEH-001, BEH-002 | AC-004 | SCN-002 | RF-004 |
| REQ-006 | UC-003 | BEH-003 | AC-005, AC-006 | SCN-002, SCN-003 | — |
| REQ-007 | UC-004 | BEH-005 | AC-007 | SCN-004 | — |
| REQ-008 | UC-005 | BEH-001 | AC-008 | SCN-005 | RF-002 |
| REQ-009 | UC-005 | BEH-002 | AC-009 | SCN-005 | RF-004 |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001…SCN-005.
- Product and system constraints architecture must preserve: BEH-002, BEH-004, BEH-005; the 324 notice; no system prompt change on native (460).
- Decisions intentionally deferred to architecture design: where the listed/searchable split is decided (server exposure vs `autobyteus-ts`); how the proxy call is turned into the real invocation before approval; what memory stores for the call and its result on each provider; how the 324 notice names a searchable addition; tool names and texts.
- Technical facts architecture should verify: Gemini's pairing of a function call and its response name; retained-reasoning binding to the prefix digest; that `tools` stay byte-identical across a run.
- Known feasibility or integration risks: R-001 (round trips), U-002 (unprobed providers).

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

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes` (Solution Designer within the direction; the founder is informed with the design approval request, which the Task requires before build)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
