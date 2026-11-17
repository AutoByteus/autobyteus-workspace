# Design Spec — autobyteus-515: tool search on the AutoByteus native runtime

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (design-only revision of DS-003 for ARCH-REV-001 AR-001, and R-A/R-B/R-C adopted; requirements and the founder's agreement unchanged)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at `SR-001`, approved by the Solution Designer within the Task's direction (user informed in the design approval request)
- Behavior-defining supplements and their approval references: none
- User approval of the design, when the direction requires it: `Obtained`: the founder, 2026-11-17, in the Solution Designer's conversation, after the recommendation, measured saving, size and the DeepSeek cache caveat were presented and two follow-up questions on how tool definitions reach the model were answered: "You must trust your background knowledge, you will have good design." Taken as agreement to build the design as presented (four base tools listed); the Solution Designer stated that reading in its reply, so the founder can correct it
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515/tickets/in-progress/native-tool-search-515/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `TESTING.md` (Choosing the path), `GLOSSARY.md` (2026-11-17); `references/design-examples.md` not used
- Project design-principle conflicts with the general principles, or discrepancies: none

## Current-State Read

Every LLM call of a native agent builds `tools` from **all** its tool instances (`llm-phase.ts:143-147` → `ToolSchemaProvider.buildSchema`, which reads each definition from the global registry by name, `tool-schema-provider.ts:21-41`). The same `tools` feed the compaction summary request and the prefix digest that binds retained reasoning (`llm-request-assembler.ts:100-105`, `llm-request-prefix-digest.ts`); a change to them rebuilds the provider cache and drops prefix-bound reasoning. A tool call runs in `ToolPhase` (`tool-phase.ts:65-225`): admission → invocation preprocessors → approval → `context.getTool(name)` from `toolInstances` → `prepareExecution` → execute, or wait for an **external result** keyed by the invocation (`tool-phase.ts:142-169`; application agent tools use it, `application-agent-tool.ts`). Invocations are built by `LlmStreamingResponseHandler` at stream end; its tool segment END event carries `tool_name` and `arguments`, which the web uses to (re)name the card (`llm-streaming-response-handler.ts:318-334`, web `segmentHandler.ts:395-398`). Memory stores each call twice: as raw traces (run history, journals, memory search) and as working-context messages (what the provider sees next), both built from one registration (`raw-trace-ingestion.ts:43-73`); a result must carry its call's name (`memory-manager.ts:336-349`). The server builds the native `AgentConfig` in one place (`autobyteus-agent-run-backend-factory.ts:463`) and replaces tools live through `Agent.replaceTools` (`agent.ts:59-85`, 324), which keeps the instance of a tool whose name stays. The 324 notice text ("Now available: X.") is runtime-neutral (`tool-list-update-notice-builder.ts:16-21`).

Constraints: no native system-prompt change mid-run (460); external runtimes unchanged; one provider-neutral path (DEC-002).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: one new owned module in `autobyteus-ts` (`agent/tool-search/`, 3 files), changes in the native agent loop (`llm-phase.ts`, `llm-response-stream-collector.ts`, `llm-streaming-response-handler.ts`, `tool-invocation.ts`, `agent-config.ts`, `agent-runtime-state.ts`, `agent-context.ts`, `agent-factory.ts`) and in native memory's call/result recording (`raw-trace-ingestion.ts`, `memory-manager.ts`, raw trace model, `working-context-tool-protocol-repairer.ts`, `memory-manager-tool-protocol-safety.ts`), `ToolSchemaProvider` (format given definitions), one line of policy in the server's native backend factory, the glossary; plus tests. All inside existing owners; no API, route, UI or migration.
- Architectural risk: `High`
- Risk rationale and supporting evidence: it changes the request contract sent to every native provider and the way native memory records a tool call (a raw-trace field that is persisted, and the working context sent back to providers), on which run restore, compaction and tool-protocol repair depend. Mistakes there break conversations on some providers only (Gemini pairs a function response with its call's name; Anthropic, Gemini and OpenAI Responses replay native blocks). The TESTING.md row "The tools a run gets" applies to the server part (whole server unit, integration and E2E suites).
- Escalation trigger if implementation or validation discovers new impact: a provider rejects the `call_tool` call/result pair in history; or memory has a path that writes a working-context tool result, or a raw tool result trace, other than the three in DS-003 (registration, `ingestToolResults` incl. `finalizePendingToolCallsForTurn`, the repairer with `memory-manager-tool-protocol-safety.ts`) → return a `Design Impact` before working around it.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | `llm-phase.ts:143-147`, `tool-schema-provider.ts` | All instances' registry definitions are sent | Split at this point; one owner builds the request tool set | — |
| Code read | `tool-phase.ts:115-169`, `application-agent-tool.ts` | Execution, approval and external results are keyed by the invocation's name | Turn a call-tool call into the real tool's invocation **before** `ToolPhase` (DS-002) | — |
| Code read | `raw-trace-ingestion.ts:43-73`, `memory-manager.ts:280-375` | One registration yields the raw-trace call and the working-context call; the result's working-context payload takes the call's name | The two forms diverge at registration; results are named in `ingestToolResults` and in repair (DS-003 (a)–(c)) | None (ARCH-REV-002 verified the three paths) |
| Code read | `llm-streaming-response-handler.ts:318-334`; web `segmentHandler.ts:395-398` | Segment END names the card | END reports the real tool | — |
| Code read | `agent.ts:59-85` | `replaceTools` keeps same-name instances and drops names not given | The run's search and call tools live outside `toolInstances` | — |
| Probe RF-004 | `evidence/probe-search-then-call.mjs` | Proxy call 21/21 on 7 providers; direct undeclared call failed on GLM, Grok, OpenAI | DEC-003 | Unprobed providers (U-002) |
| Probe RF-002 | `evidence/measure-request-tokens.mjs` | PM 7,489 → 2,368 tool tokens; DA 8,139 → 2,380 | DEC-001, AC-008 | — |

## Intended Change

A native agent's requests carry its four base tools plus two runtime tools, `search_tools` and `call_tool`; every other tool it has is searchable. `search_tools` returns matching tools' full definitions into the conversation. A `call_tool` call is turned into the real tool's invocation as soon as the stream ends, so approval, execution, external results, events, the run's cards, history and memory search all see the real tool; only the conversation sent back to the model keeps the call as the model made it.

## Change Scope (Mandatory)

- In scope: UC-001…UC-005. `autobyteus-ts`: the agent's request tool set, the new `agent/tool-search/` module, invocation building at stream end, the native memory's recording of a call made through `call_tool`, `ToolSchemaProvider` formatting of given definitions. `autobyteus-server-ts`: the native backend passes the listed tool names. `GLOSSARY.md`: the three terms. Evaluation script and gated live suite.
- Derived consumers, when a stored or shared structure changes: the raw `tool_call` trace gains an optional `called_through` field. Readers and writers, with the decision for each:
  - Run history replay (`raw-trace-to-historical-replay-events.ts` via `buildToolInteractions`, which lets a result trace's name and args override the call's, `tool-interaction-builder.ts:28-35`): shows the real tool **provided raw result traces keep the real name and args**, which DS-003 guarantees on every path: unchanged code.
  - Memory search and Work Journal (raw traces): real tool: unchanged.
  - Tool lifecycle state, loaded from the raw corpus when memory starts (`memory-manager.ts:127`): carries `called_through` on the call; read by `ingestToolResults` to name the working-context result (DS-003 (b)): changed reader.
  - Repairer and `memory-manager-tool-protocol-safety.ts` (DS-003 (c)): changed.
  - Compaction output validator (`working-context-compaction-output-validator.ts:222`, result name = call name inside the working context): satisfied because both are the model's form: unchanged.
  - Snapshot serializer and restore: store and load the working context as it is (restore requires a snapshot and never rebuilds calls, `working-context-snapshot-bootstrapper.ts:33-37`): unchanged.
- Deliberately left alone: external runtimes; the 324 notice text and service (runtime-neutral, already names added tools); the shared exposure rule (`runtime-agent-tool-exposure.ts`): which tools a run has is unchanged, only how native sends them; tool descriptions' length; provider-native tool search (FU-001); a per-agent listed setting (FU-002).
- Follow-ups: FU-001, FU-002 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002, REQ-005, REQ-006; AC-001, AC-006, AC-008 | Every native LLM call | All definitions sent (`llm-phase.ts:143-147`) | Listed + `search_tools` + `call_tool` only; byte-stable for the run | DS-001 |
| BEH-002 | Contract | REQ-003, REQ-004; AC-002, AC-003, AC-004 | A model call of `search_tools` or `call_tool` | `ToolPhase` runs instances by name | Search returns definitions; a call-tool call becomes the real invocation before `ToolPhase` | DS-002, DS-003 |
| BEH-003 | System | REQ-006; AC-005 | 324 tool change | `replaceTools` + notice | Added tools searchable; `tools` unchanged; notice unchanged | DS-001 |
| BEH-005 | System | REQ-007; AC-007 | Compaction | Search results compacted away | `search_tools`/`call_tool` stay listed; the working context keeps the model's `call_tool` form through compaction and repair (DS-003) | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/probe-search-then-call.mjs` | Search-then-call per provider | REQ-004, REQ-005; AC-004 | Becomes the gated live suite (same scenario) | Evidence |
| `evidence/measure-request-tokens.mjs` | Tokens per request | REQ-008; AC-008 | Basis of the evaluation's token columns | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Structural triggers that fire, each with evidence and the response:
  - *Several kinds or forms* (Principle 1): a tool call now has two entry forms (direct for listed tools, through `call_tool` for searchable ones), and the runtime has two consumers of a call (the model's conversation vs everything else). Response: one conversion point (DS-002) and one place where memory keeps the model's form (DS-003); every other consumer sees one form.
  - *Persisted-data transition* (Principle 5): optional `called_through` on raw `tool_call` traces → `Directly Usable — No Migration` below.
  - *Capability-area reuse* (Principle 4): the notice reuses 324's; definitions are formatted by `ToolSchemaProvider`'s formatters; matching is new and small.
  - *Empty indirection* (Principle 13): the new `AgentToolSearch` owns state (the frozen names, the two tool instances) and policy (which definitions a request carries); not a forwarder.
  - *Hidden dependency* (Principle 16): none added; `AgentToolSearch` is created by the agent factory and held in runtime state like `toolInstances`.
  - Ruled out: *Ambiguous boundary* (no generic selector), *Shared folder* (module under `agent/`).
- Deliberate deviations from a principle: none.
- Root cause classification: `No Design Issue Found`: the loop, memory and exposure owners absorb the feature; no existing structure is wrong for it.
- Refactor needed now: `No`
- Evidence: Current-State Read.
- Design response: extend the existing owners; add one module for the new concern.
- Refactor rationale: none needed.
- Intentional deferrals and residual risk, if any: FU-001, FU-002.

## Terminology

Added to `GLOSSARY.md` in this change:

- **Listed tool:** a tool whose full definition a native agent's requests carry: the native base tools and the runtime's `search_tools` and `call_tool`.
- **Searchable tool:** a tool a native agent has whose definition is not sent; found with `search_tools` and called with `call_tool`.
- **Tool search:** on the native runtime, `search_tools` + `call_tool`. (The external runtimes' own searches keep their names: `ToolSearch`, `tool_search`, `search_tool`.)

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: none; sending every definition is replaced for agents whose config names listed tools, and `listedToolNames: null` (every tool listed) is the library's own mode, used by callers that do not opt in, not a legacy path.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: native `raw_traces_*.jsonl` `tool_call` traces (`memory/agents/<run>/`), hundreds of runs per node; `working_context_snapshot.json`.
- Relevant code-model, serialization, semantic, or physical-store change: a `tool_call` trace of a call made through `call_tool` records the real tool name and arguments plus `called_through: "call_tool"`; the working-context snapshot holds the call as the model made it (`call_tool` with `{name, arguments}`), which its serializer already stores for any tool name.
- Normal reader/writer behavior and representative evidence: `RawTraceItem` reads named fields and ignores absent ones (`raw-trace-item.ts:60-125`); old traces lack `called_through` and mean "called directly", which is true of every existing trace.
- Required semantics and invariants under direct use: a working-context result carries the name of the working-context call it answers.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: none.
- Decision: `Directly Usable — No Migration`
- Decision rationale: additive optional field with a correct meaning when absent.
- Acceptance criteria or design constraints supported by this decision: AC-003, AC-007.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003 | `LlmPhase.beginCall` | Provider request `tools` | `AgentToolSearch` (request tool set) | The saving and the byte-stable prefix |
| DS-002 | Primary End-to-End | BEH-002 | Provider stream with a `call_tool` call | Real tool executed, result to model and UI | `LlmStreamingResponseHandler` (conversion) → `ToolPhase` | Found tools behave as listed ones |
| DS-003 | Bounded Local | BEH-002, BEH-005 | Invocation with `calledThrough` | Raw trace (real) + working context (model form) | `MemoryManager` | Provider history stays valid; history shows the real tool |
| DS-004 | Primary End-to-End | BEH-002 | Model calls `search_tools` | Definitions appended to conversation | `SearchToolsTool` | Definitions reach the model without changing `tools` |

## Primary Execution Spine(s)

- DS-001: `AgentFactory (creates AgentToolSearch from config.listedToolNames and the initial tools) -> LlmPhase.beginCall -> AgentToolSearch.requestToolSchemas(toolInstances, provider) -> ToolSchemaProvider (listed by name + the two runtime definitions) -> LLMRequestAssembler / provider stream`
- DS-002: `Provider stream -> LlmStreamingResponseHandler.finalize (call_tool → real ToolInvocation with calledThrough; END segment names the real tool) -> LlmPhase.settleCompleted (memory ingests) -> AgentTurnRunner.runToolStep (PendingToolInvocationEvent) -> ToolPhase (preprocessors → approval → context.getTool(real) → execute / external result) -> ToolResultEvent (real name) -> MemoryManager.ingestToolResults -> next request`
- DS-004: `ToolPhase -> context.getTool('search_tools') -> SearchToolsTool.execute(query) -> AgentToolSearch.search(query, toolInstances) -> result text (definitions) -> memory -> next request`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each call asks the agent's tool search for the request's tools: the listed tools the agent currently has, **in `listedToolNames` order** (not `toolInstances` order, which `replaceTools` rebuilds from the given list), then `search_tools` (its description names the searchable tools as they were when the agent started) and `call_tool`. With `listedToolNames` null, every tool is sent as today. Tools added or removed later change only what search finds; the request's tools stay byte-identical | request tool set | `AgentToolSearch` | formatting by `ToolSchemaProvider` |
| DS-002 | When the stream ends, a `call_tool` call whose arguments are **exactly** `{name: non-empty string, arguments: object}` (no other keys; this keeps the model's form derivable without loss) becomes an invocation of that tool, with the same id, marked `calledThrough: 'call_tool'`. From then on it is that tool: preprocessors, approval, `getTool`, external results, lifecycle events and the result all use the real name. A tool the agent does not have is refused by `ToolPhase` as today ("not found or configured"). Any other `call_tool` call (no name, arguments not an object, extra keys) stays a `call_tool` invocation, and the `call_tool` tool answers with how to call it. With tools not auto-executed, that answer comes after the usual approval (approval precedes `getTool`, `tool-phase.ts:107-115`): accepted | invocation | `LlmStreamingResponseHandler` (conversion, via the call-tool contract's pure function) | — |
| DS-003 | Two records per call, one rule: **raw traces always hold the real tool (name and arguments); the working context always holds the model's own form** (`call_tool` with `{name, arguments}`, its result named `call_tool`). The model's form is derived only by the call-tool contract (`toModelToolCall`), never spelled out in memory. Working-context call messages are written only at registration; three paths write results. (a) **Registration** (`normalizeNativeToolCallBatch` → `persistNormalizedToolIntents`): raw `tool_call` = real name/args + `called_through`; working-context `ToolCallSpec` = `toModelToolCall(invocation)`, and these model-form specs are the ones given to `nativeTurnMetadata` (Anthropic's assertion compares name and deep-equal input with the native `tool_use` block, `anthropic-native-assistant-turn.ts:54`: the block holds the model's `call_tool` input). (b) **`ingestToolResults`**, used live and by `finalizePendingToolCallsForTurn` (which builds its events from the raw call: real name and args): the raw `tool_result` keeps the real name; the working-context result takes the raw call's `called_through ?? toolName`. (c) **Repair** (`working-context-tool-protocol-repairer.ts` + `memory-manager-tool-protocol-safety.ts`, run on every bootstrap and before each request): the inserted working-context result takes the **working-context call's** name (`call.name`, the model's form); the raw recovery `tool_result` trace takes the **real** name and args from the raw call fact (`callFact`), not from the working-context call. So a repair carries two names: the repair record gains the raw name/args beside the working-context name. Native blocks (Anthropic `tool_use`, Gemini `functionCall` part, OpenAI Responses item) already hold the model's form and are replayed unchanged | call record | `MemoryManager` | raw-trace model, tool-protocol repair, call-tool contract |
| DS-004 | `search_tools` matches the query against the agent's searchable tools (current `toolInstances` minus listed and minus the runtime tools): an exact name first, else words in names, descriptions and argument names; at most 5 results, each with its full definition in the OpenAI function JSON form; no match says so and lists the searchable names | search | `AgentToolSearch` | — |

## Spine Actors / Main-Line Nodes

`AgentFactory`, `LlmPhase`, `AgentToolSearch`, `LlmStreamingResponseHandler`, `ToolPhase`, `MemoryManager`; server: `AutoByteusAgentRunBackendFactory`.

## Ownership Map

- `AgentToolSearch` (new, per agent, in runtime state): owns the listed-name set, the searchable names frozen at start (for `search_tools`' description), the two runtime tool instances, which definitions a request carries, and matching.
- `call-tool` contract (new): owns the `call_tool` name, its schema and both directions of the conversion: `toCalledToolInvocation(invocation) → ToolInvocation | null` (model → real, exact shape only) and `toModelToolCall(name, args, calledThrough) → {name, arguments}` (real → the model's form, used by memory).
- `LlmStreamingResponseHandler`: owns invocation building; applies the conversion when its owner says tool search is on.
- `MemoryManager`: owns both records of a call and decides which record gets which form (DS-003); it obtains the model's form only from the call-tool contract.
- Server `AutoByteusAgentRunBackendFactory`: owns native policy: `listedToolNames = AUTOBYTEUS_DEFAULT_TOOL_NAMES`.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no facade added.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| Inline schema building in `LlmPhase.beginCall` (`new ToolSchemaProvider().buildSchema(toolNames, …)`) | The request tool set has an owner | `AgentToolSearch.requestToolSchemas` | `resolveTurnToolNames` moves with it if no other caller remains (Principle 7) |

## Return Or Event Spine(s) (If Applicable)

The tool card: `call_tool` segment START (streaming, named `call_tool`) → END with the real `tool_name`/`arguments` → web renames the card → lifecycle events with the real name. The brief `call_tool` label while arguments stream is accepted (a fraction of a second).

## Bounded Local / Internal Spines (If Applicable)

DS-003 above.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Definition formatting | DS-001, DS-004 | `AgentToolSearch` | `ToolSchemaProvider.formatDefinitions(definitions, provider)` (new public method using the existing formatter choice) for the two runtime definitions; the OpenAI formatter's function part for search results | One formatter choice | A second formatter selection would drift |
| Raw trace field | DS-003 | `MemoryManager` | `called_through` read/write in `RawTraceItem` | History shows the real tool; after a restart, `ingestToolResults` and repair name the working-context result from it | — |

## Ownership Boundaries

`LlmPhase` asks `AgentToolSearch` for the request's tools and never filters itself. `ToolPhase` knows nothing of tool search: it receives real invocations, plus `search_tools`/`call_tool` resolved by `AgentContext.getTool` (instances first, then the agent's tool search's own two tools). Memory knows a call was made through `call_tool` only from `invocation.calledThrough` / the raw `called_through`, and builds the model's form only through `toModelToolCall`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentToolSearch` | frozen names, matching, runtime tool instances | `LlmPhase`, `AgentContext.getTool`, `SearchToolsTool` | `LlmPhase` filtering `toolInstances` itself | Add a method to `AgentToolSearch` |
| `MemoryManager` | working-context form of a call | `LlmPhase`, `AgentTurnRunner` | Callers re-wrapping a result's name before ingest | — |

## Dependency Rules

- `agent/tool-search` depends on `tools/` (BaseTool, registry, formatters) and `agent/tool-invocation`; `agent/loop`, `agent/streaming` and `agent/context` depend on it; it depends on none of them.
- `memory/` depends only on `ToolInvocation.calledThrough` and the call-tool contract's `toModelToolCall` (pure), not on `AgentToolSearch`.
- Collaborators: `AgentFactory` creates `AgentToolSearch` (constructor arguments: listed names, initial tool names) and stores it on `AgentRuntimeState`; `LlmPhase` passes `toolSearchEnabled` to the collector/handler as a constructor option. No process-wide binding added. `ToolSchemaProvider` keeps using the global `defaultToolRegistry` as today (unchanged lookup).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentConfig.listedToolNames: readonly string[] \| null` | agent config | Which tools are listed; null = all | tool names | Copied by `copy()` |
| `AgentToolSearch.requestToolSchemas(toolNames, provider)` | request tool set | Listed definitions + the two runtime tools, or all when off | tool names, provider | Byte-stable for a run |
| `AgentToolSearch.search(query, toolNames)` | search | Top-5 matches with definitions | free text | In-process |
| `search_tools({query})` | model-facing | Search | `query: string` | Description names searchable tools (frozen at start) |
| `call_tool({name, arguments})` | model-facing | Call a found tool | tool name + object | Converted before `ToolPhase` |
| `toCalledToolInvocation(invocation)` | call-tool contract | Model → real, pure | `ToolInvocation` | Null unless args are exactly `{name, arguments}` |
| `toModelToolCall(name, args, calledThrough)` | call-tool contract | Real → the model's form, pure | real name + args + marker | Identity when `calledThrough` is null |
| `ToolInvocation.calledThrough: string \| null` | invocation | The declared tool the model called, when not the real one | — | Only `'call_tool'` today |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `requestToolSchemas` | Yes | Yes | Low | — |
| `search` | Yes | Yes | Low | — |
| `call_tool` | Yes | Yes (`name`) | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere It Appears, Per The Glossary? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Tool search owner | `AgentToolSearch` | Yes | Yes (glossary "Tool search") | Low | — |
| Model tools | `search_tools`, `call_tool` | Yes | Yes | Low: other runtimes' names differ by design | Glossary note |
| Marker | `calledThrough` / `called_through` | Yes | New | Low | — |
| Config | `listedToolNames` | Yes | Yes ("Listed tool") | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Tell the agent about added tools | 324 tool-list-update notice | Reuse | Already names added tools, runtime-neutral | — |
| Format definitions | `ToolSchemaProvider` + formatters | Extend (`formatDefinitions`) | One formatter choice | — |
| Validate a found tool's arguments, approval, external results | `ToolPhase` | Reuse | The converted invocation is a normal invocation | — |
| Request tool set + search | — | Create New (`agent/tool-search/`) | No owner exists | `LlmPhase` owns a call, not tool exposure |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/tool-search/` | request tool set, search, runtime tools, call-tool contract | DS-001, DS-002, DS-004 | `LlmPhase`, `ToolPhase` | Create New | — |
| `autobyteus-ts/src/agent/loop`, `streaming`, `context`, `factory` | wiring | DS-001, DS-002 | — | Extend | — |
| `autobyteus-ts/src/memory/` | call records | DS-003 | `MemoryManager` | Extend | — |
| `autobyteus-server-ts/.../backends/autobyteus/` | native policy | DS-001 | factory | Extend | one argument |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction changed it).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `call_tool` name and both conversion directions | `agent/tool-search/call-tool.ts` | tool-search | Used by the handler (model → real), memory (real → model) and the tool | Yes | Yes | A second place deciding what a call means (memory must not spell out `{name, arguments}`) |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ToolInvocation.calledThrough` | Yes | Yes (the model's arguments are derived: `{name, arguments}`) | Low | Do not store the model's arguments separately |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/tool-search/agent-tool-search.ts` (new) | tool-search | `AgentToolSearch` | listed set, frozen names, request tool set, matching | One owner | formatters |
| `autobyteus-ts/src/agent/tool-search/search-tools-tool.ts` (new) | tool-search | `SearchToolsTool` | the `search_tools` BaseTool (definition + execute → `AgentToolSearch.search`) | One tool | — |
| `autobyteus-ts/src/agent/tool-search/call-tool.ts` (new) | tool-search | call-tool contract | name, schema, `toCalledToolInvocation`, `toModelToolCall`, the `call_tool` BaseTool that answers malformed calls | One contract | — |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | loop | `LlmPhase` | uses `requestToolSchemas`; passes `toolSearchEnabled` | — | — |
| `autobyteus-ts/src/agent/loop/llm-phase-tools.ts` | loop | — | removed if unused (Removal Plan) | — | — |
| `autobyteus-ts/src/agent/loop/llm-response-stream-collector.ts`, `agent/streaming/handlers/llm-streaming-response-handler.ts` | streaming | handler | apply conversion at finalize; END names the real tool | — | call-tool |
| `autobyteus-ts/src/agent/tool-invocation.ts` | agent | `ToolInvocation` | `calledThrough` | — | — |
| `autobyteus-ts/src/agent/context/agent-config.ts`, `agent-runtime-state.ts`, `agent-context.ts`, `agent/factory/agent-factory.ts` | context | — | `listedToolNames`; `toolSearch` state; `getTool` fallback to the two runtime tools; creation | — | — |
| `autobyteus-ts/src/memory/models/raw-trace-item.ts` | memory | raw trace model | read/write optional `called_through` | — | — |
| `autobyteus-ts/src/memory/raw-trace-ingestion.ts` | memory | registration | DS-003 (a): raw = real + `called_through`; working-context spec = `toModelToolCall` | — | call-tool |
| `autobyteus-ts/src/memory/memory-manager.ts` | memory | `MemoryManager` | DS-003 (a) model-form specs to `nativeTurnMetadata`; (b) `ingestToolResults` working-context result name = raw call's `called_through ?? toolName` (covers `finalizePendingToolCallsForTurn`) | — | call-tool |
| `autobyteus-ts/src/memory/working-context-tool-protocol-repairer.ts` | memory | repairer | DS-003 (c): inserted working-context result named by the working-context call; repair record carries the raw call fact's real name/args beside it | — | — |
| `autobyteus-ts/src/memory/memory-manager-tool-protocol-safety.ts` | memory | protocol safety | DS-003 (c): raw recovery `tool_result` trace written with the real name/args from the repair record's raw fields | — | — |
| `autobyteus-ts/src/tools/usage/providers/tool-schema-provider.ts` | tools | `ToolSchemaProvider` | `formatDefinitions` | — | — |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | server native backend | factory | pass `AUTOBYTEUS_DEFAULT_TOOL_NAMES` as `listedToolNames` | — | — |
| `GLOSSARY.md` | docs | — | three terms | — | — |
| `autobyteus-ts/docs/` (tool schema doc) | docs | — | how native sends tools | — | — |

## Applied Patterns (If Any)

None beyond a pure conversion function.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/tool-search/` | Folder | tool search | the three files above | An agent-runtime concern about the agent's own tools | Provider-specific code |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent/tool-search/` | Main-Line Domain-Control | Yes | Low | Three files, one concern |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| A found tool's call | Model emits `call_tool {name:"update_task", arguments:{task_id:"autobyteus-77", status:"DONE"}}` → invocation `update_task {task_id, status}`, `calledThrough:'call_tool'` → approval card "update_task" → run → raw trace `update_task` + `called_through` → working context `call_tool` call and `call_tool` result | `call_tool` runs the target inside its own `execute` (approval card says `call_tool`; an application tool's external result is requested for `call_tool`) | External results and approval key on the real name |
| Request tools for the PM on DeepSeek | `[run_bash, read_file, write_file, edit_file, search_tools("…Searchable tools: list_projects, …, search_memory…"), call_tool]` for the whole run | Rebuilding `search_tools`' name list when a tool is added | A changed description is a changed prefix |
| Search result | `Found 1 tool:\n{"name":"update_task","description":"…","parameters":{…}}` | Returning names only | The model needs the schema to call |
| A found tool's call interrupted by a restart (pending approval or running) | Before restart: raw `tool_call` `update_task {task_id, status}` + `called_through: call_tool`; working context `call_tool {name:"update_task", arguments:{…}}`. On restore, the bootstrap repair inserts a working-context result named **`call_tool`** (the working-context call's name) and writes a raw recovery `tool_result` named **`update_task`** with the real args (from the raw call fact). Run history shows `update_task` interrupted; the next request is a valid `call_tool` call/result pair on every provider | Repair writes one name into both records: either the working context gets `update_task` under a `call_tool` call (Gemini rejects, compaction validator fails) or raw traces get `call_tool {name, arguments}` (history shows `call_tool`) | The repair path is the one place a single name fed two records |
| Turn interrupted before the found tool ran | `finalizePendingToolCallsForTurn` builds the event from the raw call (`update_task`, real args) → `ingestToolResults`: raw result `update_task`; working-context result named `call_tool` (the raw call's `called_through`) | Naming the working-context result from the event | Same rule as the live path |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep sending every definition for runs started before the update | Restored runs change `tools` once | Rejected | A restored run takes the new split at its next request (Data Continuity: one cache rebuild accepted) |
| Per-provider native tool search paths | Anthropic/OpenAI have one | N/A (not compatibility; FU-001) | — |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. `autobyteus-ts`: `ToolSchemaProvider.formatDefinitions`; `ToolInvocation.calledThrough`; `agent/tool-search/` (contract, search tool, owner) with unit tests (matching, frozen description, request set, conversion).
2. Wire: `AgentConfig.listedToolNames` (+ `copy`), runtime state, factory, `AgentContext.getTool`, `LlmPhase`, handler/collector (conversion, END metadata). Tests: request `tools` byte-identical across a run with a search, a found tool's call, a `replaceTools` add/remove (AC-005, AC-006); approval card and lifecycle name the real tool (AC-003).
3. Memory: DS-003 (a) registration, (b) `ingestToolResults` / `finalizePendingToolCallsForTurn`, (c) repairer + `memory-manager-tool-protocol-safety.ts`. Tests, each asserting **both** records (raw = real name/args; working context = `call_tool` form): the live path; `finalizePendingToolCallsForTurn` for a converted call; repair on restore of a converted call pending approval or running (bootstrap repair) and after an interrupted turn; Anthropic `nativeTurnMetadata` assertion with a converted call; per provider renderer that the working context replays the `call_tool` call + result (OpenAI-compatible, Gemini name pairing, Anthropic, OpenAI Responses); restore from snapshot; compaction output validation (AC-007).
4. Server: pass `listedToolNames`; update tests asserting native request tool lists (TESTING.md "The tools a run gets": whole server unit, integration and E2E suites).
5. Gated live suite from the probe (AC-004); evaluation script (AC-008, AC-009): PM and Daily Assistant, native, DeepSeek V4 Flash, at least 5 tasks each with state-checked success, old build vs new, recording per-request prompt tokens, cache reads and request counts.
6. Docs: glossary, `autobyteus-ts/docs/tool_schema_and_configuration.md`.

## Key Tradeoffs

- Base rule (DEC-001) maximizes the saving and adds a search round trip when a conversation first needs a tool; a per-agent listed setting would remove that round trip for hot tools at the cost of a definition field and UI (FU-002, only if the evaluation shows a need).
- Proxy call (DEC-003) costs one extra declared tool (~100 tokens) and a conversion step, and works on every provider; direct calls would save the tool but failed on three providers.
- Frozen name list: a tool added mid-run is not in `search_tools`' description (the 324 notice names it instead); a removed one stays named until restart, and search no longer finds it.

## Risks

- R-001: a weaker model that does not search when a needed tool is not listed (U-002) → the evaluation and the live suite; FU-002 is the remedy.
- R-002: a result-writing path that gives the working-context result the real name (a provider error on Gemini, a compaction-validator failure), or gives a raw result trace the `call_tool` name (history shows `call_tool`) → DS-003 names the three paths and the rule; step 3 tests assert both records on each.
- R-003: the money saving on DeepSeek with a warm cache is small (RF-005) → told to the founder; the evaluation reports cache reads.

## Guidance For Implementation

- Reproduction to start from, from the investigation notes: `evidence/probe-search-then-call.mjs` (search-then-call per provider) and `evidence/measure-request-tokens.mjs` (tokens per request), both run with `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` after building `autobyteus-ts` and the server in the worktree; commands in the investigation notes RF-002/RF-004.
- Native blocks (`nativeToolCallContext`) are never rewritten: they already hold the model's `call_tool` form.
- `search_tools`' description is built once, when the agent is created, from the initial searchable names; keep its wording fixed (e.g. "Find tools that are not listed here and get their full definitions. Searchable tools: … Tools announced later are searchable too. Then call a found tool with call_tool.").
