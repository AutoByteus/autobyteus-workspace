# Investigation Notes — autobyteus-515

## Investigation Meta

- Package identifier: `native-tool-search-515`
- Request / ticket: Project Task `autobyteus-515` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), assigned by `/project_task_manager` on 2026-11-17
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515`
- Repository mode: `Git`
- Task worktree / branch: the root above, `codex/native-tool-search-515`
- Resolved base remote / branch / revision: `origin/personal` at `4cbf9e7881` (fetched 2026-11-17)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from the fetched base; `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` and the server `tsc` build run in the worktree for the measurement scripts (no source change)
- Bootstrap blocker: none
- Current solution revision ID: `SR-002`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`, templates (2026-11-17). Architecture phase: `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `TESTING.md`, `GLOSSARY.md` (2026-11-17)
- Investigation status: requirements and architecture investigation complete; feasibility measured on real providers

## Initial Request And Clarifications

- Original request (founder, 2026-11-17, relayed by the autobyteus-380 Solution Designer): "we also need a tool search for our own runtime as well ... it is important because it is related to token saving."
- Task direction (autobyteus-515): native agents can have tools that are not sent up front but found by search and then called; rarely used tools cost no prompt tokens; adding one does not invalidate the prompt cache; works across the native runtime's providers, not only Anthropic; decide which tools stay listed; measure tokens per request before and after on a real agent; investigation and design first, then a recommendation, a size and a measured saving; **build after the founder agrees**; release only on his word.
- Relations named by the Task: 380 (not a prerequisite), 324 (live tool list updates), 460 (no native system-prompt change for cache reasons), 496 (`search_memory` given to every agent), 512 FU-002 (the Model Router carries `search_memory` too).

## Product And Domain Understanding

- Product area: the AutoByteus native runtime (`autobyteus-ts` agent loop) and the server's tool exposure for native runs (`autobyteus-server-ts/src/agent-execution/backends/autobyteus/`).
- Terms used here: a **listed tool** is sent in full (description + argument schema) in the `tools` of every request. A **searchable tool** belongs to the agent and can run, but its definition is not sent until the agent searches for it. **Search** returns matching tools' definitions as a tool result, appended to the conversation.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts:143-147`, `llm-phase-tools.ts` | Which tools a native request carries | Every LLM call builds `toolSchemas` from **all** `context.state.toolInstances` names via `ToolSchemaProvider.buildSchema(toolNames, provider)`; no filtering | Target: send only listed tools |
| 2026-11-17 | Code | `autobyteus-ts/src/tools/usage/providers/tool-schema-provider.ts` | Per-provider formats | Anthropic formatter, Gemini formatter, OpenAI formatter for every other provider (OpenAI Responses, Mistral, Ollama and all OpenAI-compatible) | — |
| 2026-11-17 | Code | `autobyteus-ts/src/agent/loop/conversation-request.ts`, `llm-request-assembler.ts:100-105`, `llm-request-prefix-digest.ts` | Cache and reasoning binding | `tools` are part of the request prefix; the prefix digest (leading system run + tool schemas) binds retained provider reasoning: a tool list change removes retained reasoning as well as the provider cache | A searchable design must keep `tools` byte-stable |
| 2026-11-17 | Code | `autobyteus-ts/src/agent/loop/tool-phase.ts:65-225` | How a call runs | Each invocation: malformed-args admission → `ToolInvocationPipeline.process` (preprocessors may rewrite name/args) → approval (when not auto) → `context.getTool(name)` from **toolInstances** (not from the schemas sent) → `prepareExecution` → execute; lifecycle events use the (preprocessed) name | A searchable tool stays in `toolInstances`; only its schema is withheld. The pipeline is an existing place to turn a proxy call into the real tool's invocation |
| 2026-11-17 | Code | `autobyteus-ts/src/agent/agent.ts:59-85` `replaceTools` | Live tool changes (324) on native | Replaces `toolInstances` from the next LLM call; the tool list sent changes, so the cached prefix is rebuilt | Searchable additions must not change `tools` |
| 2026-11-17 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.ts`, `shared/runtime-agent-tool-exposure.ts` | Which tools a native agent gets | Native defaults `run_bash, read_file, edit_file, write_file` + the definition's `toolNames` + automatic `send_message_to`, `delegate_task` (+ `get_handoff_rules` when Team-scoped) + platform-given `search_memory` | — |
| 2026-11-17 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts` | Tool instances | Server-bound instances for collaboration, Task and discovery tools; others from the registry | No change needed to resolution; exposure gains a listed/searchable split |
| 2026-11-17 | Doc | `tickets/done/live-tool-list-updates/requirements-doc.md` REQ-001, REQ-006 | Live tool updates | A running native run takes a changed tool list at its next LLM call and gets one short notice of tools now available / no longer available | The notice can announce a new searchable tool without a prefix change |
| 2026-11-17 | Data | `evidence/dump-agent-tool-schemas.mjs` → `evidence/agent-tool-schemas-2026-11-17.json` | Size of the tools real agents send today | PM on native: 17 tools, 31,458 JSON characters; Daily Assistant (`autobyteus-daily-assistant`): 21 tools, 33,147. Largest: `generate_speech` 6,059, `delegate_task` 4,270, `update_task` 4,115, `edit_file` 2,839 | — |
| 2026-11-17 | Runtime | `evidence/measure-request-tokens.mjs` on `deepseek-v4-flash` → `evidence/request-tokens-deepseek-2026-11-17.json` | Tokens per request, provider-reported | See Runtime Findings RF-002 | — |
| 2026-11-17 | Data | `evidence/tool_usage_census.py` on the desktop's `server-data` | How often agents use each tool | See RF-003 | Basis for which tools stay listed |
| 2026-11-17 | Data | `run_metadata.json` counts on the desktop and nodes 8001/8003 (read-only) | Which providers native agents use | Desktop, newest 400 runs: native = memory compactor (DeepSeek, 102), Daily Assistant `daily-assistant` (DeepSeek, 9 recent; 101 runs with tool calls overall), skill optimizer (Qwen/DeepSeek), media/infographics agents (Gemini via RPA endpoint), one Qwen and one DeepSeek-pro run. No recent native run on Anthropic or OpenAI. Node 8001: native = Daily Assistant and memory compactor on DeepSeek. The PM runs on Claude, Codex or Antigravity, not native | The provider-neutral path is the one in real use |
| 2026-11-17 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts:262-300` | Price of a cached token | `deepseek-v4-flash`: input $0.22/M, cache read $0.007/M (3.2 %); `deepseek-v4-pro`: $0.66/M, cache read $0.022/M | Money saving per request is small when the prefix is cached; see RF-005 |
| 2026-11-17 | Web | Anthropic "Tool search tool" (`platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool`), claude-api skill `shared/tool-use-concepts.md`, `agent-design.md`, `cost-optimization.md` | Anthropic native support | Deferred tools (`defer_loading: true`) are sent in `tools` but excluded from the prompt prefix; a **custom client tool** may return `tool_reference` blocks in its `tool_result`, which the API expands into full definitions inline; cache preserved; Claude 4.5+ models; at least one tool non-deferred. Guidance: keep the 3–5 most used tools non-deferred; search pays once schemas pass ~10K tokens | Native option for Anthropic |
| 2026-11-17 | Web | OpenAI "Tool search" guide (`developers.openai.com/api/docs/guides/tools-tool-search.md`) | OpenAI native support | Responses API only, `gpt-5.4` and later: `{"type":"tool_search","execution":"client"}`; the app returns `tool_search_output` with full definitions; loaded tools are injected at the end of the context (cache preserved) and callable natively; not in Chat Completions | Native option for OpenAI only; every OpenAI-compatible provider uses Chat Completions |
| 2026-11-17 | Web | Gemini, xAI, DeepSeek, Kimi, Qwen, GLM, MiniMax, Mistral, Ollama, LM Studio documentation (none found offering a tool search feature in their chat APIs) | Native support elsewhere | No built-in tool search found for these providers' APIs (`Read`, not exhaustive). Grok Build's `search_tool` is a CLI feature, not the xAI API | A provider-neutral mechanism is required for every provider except Anthropic and new OpenAI models |
| 2026-11-17 | Runtime | `evidence/probe-search-then-call.mjs` → `evidence/probe-search-then-call-2026-11-17.json` | Can models search then call, per provider, without changing `tools` | See RF-004 | Feasibility of REQ-004/REQ-005 |
| 2026-11-17 | Doc | 380 investigation notes (attached to the Task), Source Log rows of 2026-11-17 | Why the founder raised it | `update_task` ≈1,000 tokens; giving it to every delegator would cost every agent that much per request and a cache rewrite when added mid-run | This ticket makes such additions cheap on native |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Every LLM call of a native agent | `LlmPhase.beginCall` → all tool instances' schemas → `tools` of the request | Every tool's full definition is sent in every request, used or not | `llm-phase.ts:143-147` | `Read` + `Measured` (RF-002) |
| BEH-002 | Contract | A tool call from the model | `ToolPhase` runs any tool in `toolInstances` by name, after preprocessors and approval | Runs only the agent's own tools; unknown names get "not found or configured" | `tool-phase.ts:115-132` | `Read` |
| BEH-003 | System | The agent definition's tools change during a run (324) | `replaceTools` → next call sends the new list + a "tools updated" notice | The cached prefix is rebuilt and prefix-bound reasoning dropped | `agent.ts`, 324 REQ-001/006, `llm-request-assembler.ts` | `Read` |
| BEH-004 | System | External runtimes (Claude Agent SDK, Codex, Grok Build) | AutoByteus Agent Tools reach them as MCP tools, deferred behind the runtime's own search | Unchanged by this ticket | 380 notes (324 `Measured` probes) | `Measured` in 324 |
| BEH-005 | System | Automatic compaction on native | Old conversation is summarized; tool results in the compacted part are gone | A definition found by search before compaction is not in the conversation afterwards | `llm-phase-compaction.ts` | `Read` |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `LlmPhase.beginCall` + `ToolSchemaProvider` | Builds the request's tools from all instances | Must send listed tools + the search tools only | Where the listed/searchable split is decided (agent config vs runtime) |
| `ToolPhase` + `ToolInvocationPipeline` | Runs calls; preprocessors can rewrite a call | A found tool runs like a listed one (args check, approval, events) | Unwrap a proxy call before approval so the user sees the real tool |
| Memory ingestion (`ingestAssistantToolResponse`, tool results) | Stores the model's calls and results for later requests | The history must stay valid for the provider (the call the model made, with a matching result) | Whether history keeps the proxy call or the real name (Gemini pairs `functionResponse.name` with the call) |
| Server exposure (`buildRuntimeAgentToolExposure`) | Names the tools of a run, runtime-neutral | Which tools are searchable is a rule on these names | Native-only: external runtimes already defer |
| 324 notice | Announces tool changes to the agent | A searchable tool added mid-run is announced, `tools` unchanged | Reuse the notice; do not edit the search tool's description mid-run |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Tool definitions (descriptions, argument schemas) of `autobyteus-ts` and the server's Agent Tools: read, not changed.
- New: the definitions of the search tool (and a call tool, if chosen) as the agent sees them.

### Structural Surfaces

- `autobyteus-ts` agent loop: request tool set (`llm-phase.ts`), tool execution (`tool-phase.ts`, invocation pipeline), memory ingestion of calls/results.
- Server: native tool exposure (listed vs searchable), 324 tool-change notice.
- Existing surfaces that can support it: `toolInstances` already hold every tool; the invocation pipeline can rewrite calls; the 324 notice exists.

### Potential Structural Impacts To Investigate

- API or external-contract change: the agent-visible tool surface on native (new search tool); no REST/GraphQL change expected.
- Persistence: none expected (no stored field; listed/searchable is computed). To confirm in design.
- Concurrency/lifecycle: none beyond the existing tool-change path.
- Confirmed absent: security boundary change (a searchable tool is one the agent already has; search cannot reach other tools).

## Runtime, Probe, Or Reproduction Findings

All on 2026-11-17, against real provider APIs through the native runtime's own LLM classes (`autobyteus-ts/dist`), keys from the test vault; no user data changed.

| ID | Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- | --- |
| RF-001 | `node evidence/dump-agent-tool-schemas.mjs <worktree> <out>` | PM and Daily Assistant tool sets as the native runtime resolves them (defaults + definition + automatic + platform-given) | PM 17 tools / 31,458 JSON chars; Daily Assistant 21 tools / 33,147. Base tools (`run_bash`, `read_file`, `write_file`, `edit_file`) alone: 8,743 chars | `Measured` | Size of today's cost | `evidence/agent-tool-schemas-2026-11-17.json` |
| RF-002 | `AUTOBYTEUS_TEST_VAULT=… node evidence/measure-request-tokens.mjs <worktree> <schemas> <out> deepseek-v4-flash` | One minimal request per tool set; tokens as DeepSeek reports them (no-tool request = 47) | **PM**: all 7,536 → rarely-used searchable ("usage" rule) 4,544 → only base tools listed 2,415. **Daily Assistant**: all 8,186 → 3,972 → 2,427. Tool share: PM 7,489 → 4,497 (−40 %) → 2,368 (−68 %); DA 8,139 → 3,925 (−52 %) → 2,380 (−71 %). Both reduced sets include the search and call tools | `Measured` | The saving per request is about 3,000–5,800 tokens | `evidence/request-tokens-deepseek-2026-11-17.json` |
| RF-003 | `python3 -I evidence/tool_usage_census.py ~/.autobyteus/server-data …` | Share of runs that called each tool, all runtimes | `daily-assistant` (101 of 127 runs native): `run_bash` 83 %, `open_tab` 36 %, `screenshot` 27 %, `run_script` 22 %, `read_url` 17 %, `generate_image` 13 %, `search_web` 13 %, `edit_file` 11 %, `read_file` 10 %, `write_file` 8 %; `generate_speech` 3 %, `download_media` 3 %, `edit_image` 2 %, `send_message_to` 1 %, `delegate_task` 0 %, `search_memory` 0 %. PM (13 runs, Claude/Codex/AGY): `list_project_tasks` 92 %, `list_projects` 85 %, `send_message_to` 69 %, `delegate_task` 54 %, `list_available_agents` 54 %, `update_task` 31 %, `create_task` 31 %, `search_project_tasks` 31 %, `get_project_task` 23 %, `search_memory` 15 %, `create_project` 15 %, `update_project` 8 %, `list_peer_nodes` 8 % | `Measured` | Most tools of a definition are used in a minority of runs; each agent's frequent tools differ | census output in this table |
| RF-004 | `PROBE_REPS=3 AUTOBYTEUS_TEST_VAULT=… node evidence/probe-search-then-call.mjs <worktree> <schemas> <out>` | PM-like agent, 9 listed tools, 8 searchable (incl. `update_task`); task "close autobyteus-77 as DONE with a comment". Mode *proxy*: `search_tools` + `call_tool{name, arguments}`. Mode *direct*: `search_tools` only; the found tool is called by its own (undeclared) name. Up to 6 rounds; stub results for other tools | See RF-004 table below | `Measured` | Feasibility of search-then-call per provider | `evidence/probe-search-then-call-2026-11-17.json` |
| RF-005 | Arithmetic from RF-002 and the price table | DeepSeek V4 Flash | Saving per request (PM, base rule): 5,121 tokens = $0.0011 uncached, $0.000036 when read from cache. A run of 50 requests with a warm cache saves ≈ $0.002–$0.06 depending on the miss rate. On Anthropic Opus 5.5 ($4/M, cache read $0.40/M): $0.020 uncached, $0.002 cached per request | `Measured` inputs, arithmetic | The **token** saving is large; the **money** saving on cache-friendly DeepSeek is small unless the cache misses. The value is larger on providers without caching (Ollama/LM Studio: prompt processing time and small context windows) and expensive ones | — |

### RF-004 per provider

Three episodes per mode and provider (`PROBE_REPS=3`). "Tokens" = provider-reported prompt tokens of one minimal request with no tools / the PM's 17 tools / 9 listed + `search_tools` + `call_tool`.

| Model (provider) | Proxy: correct `update_task` via `call_tool` | Direct: correct call of the undeclared `update_task` | Rounds (proxy) | Tokens none / all / reduced | Note |
| --- | --- | --- | --- | --- | --- |
| `deepseek-v4-flash` (DeepSeek) | 3/3 | 3/3 | 2, 3, 3 | 77 / 7,566 / 4,574 | Main native provider |
| `deepseek-v4-pro` (DeepSeek) | 3/3 | 3/3 | 2, 2, 2 | 130 / 7,629 / 4,637 | — |
| `gemini-3.8-flash` (Gemini, Vertex Express) | 3/3 | 3/3 | 2, 2, 2 | 48 / 6,434 / 3,880 | AI Studio attempt hit a per-minute 429 quota; rerun on Vertex Express |
| `glm-5.3` (GLM) | 3/3 | **0/3** | 2, 2, 2 | 59 / 7,256 / 4,318 | Direct: searched, then never called the tool; once delegated the work and told the user the Task was closed |
| `grok-4.7` (xAI) | 3/3 | **0/3** | 2, 2, 2 | 1,293 / 8,729 / 5,702 | Direct: searched, then tried `run_bash` repeatedly |
| `gpt-5.4-mini` (OpenAI Responses) | 3/3 | **0/3** | 4, 3, 3 | 56 / 6,048 / 3,639 | Direct: searched, then delegated / searched again |
| `claude-sonnet-5-5` (Anthropic) | 3/3 | 3/3 | 2, 2, 2 | not comparable (Anthropic `input_tokens` excludes cached tokens) | — |
| `kimi-k3` (Kimi) | — | — | — | — | Not reachable: the test vault's Kimi account is suspended (429) |

Proxy total: 21/21 correct across 7 providers. Direct: 9/9 on DeepSeek, Gemini and Anthropic; 0/9 on GLM, Grok and OpenAI.

- Temporary diagnostics: none; no source file was changed. The measurement scripts are evidence, not product code.
- Reproduction for implementation to start from: `evidence/probe-search-then-call.mjs` (search-then-call on every provider) and `evidence/measure-request-tokens.mjs` (before/after tokens per request).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Founder, 2026-11-17 | Tool search on our own runtime, for token saving; important | Direct (relayed) | REQ-001…REQ-003 | — |
| Task autobyteus-515 | Across providers; adding a tool keeps the cache; decide listed vs searchable; measure on a real agent; build after his agreement | Direct | REQ-004…REQ-009, DEC-001 | His agreement to the design |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Provider prompt caches (Anthropic, OpenAI, DeepSeek, Gemini implicit, GLM, Kimi) | Provider docs; claude-api skill | Prefix match; `tools` come first; a tool list change invalidates the whole cached prefix; appended conversation content does not | skill text, docs | Per-provider cache behavior not re-measured here except DeepSeek cache reads in RF-004 rounds |
| Anthropic tool search (custom) | Docs, 2026-11 | `defer_loading` + `tool_reference` from a client tool | Docs | Not probed here; not used by native runs today |
| OpenAI Responses tool search (client) | Docs, 2026-11 | `gpt-5.4`+ only | Docs | Not probed here |

## Persisted Data And State Facts

- Affected stored subject: none expected. Listed/searchable is derived from the tool names at run time; the conversation stores the search call and its result like any tool call.
- Must be preserved: existing runs' memory and their restore; a restored run gets the current split.
- Remaining evidence gap: none for requirements.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/dump-agent-tool-schemas.mjs` + `agent-tool-schemas-2026-11-17.json` | Solution Designer | Real agents' native tool definitions | REQ-001, REQ-008 | AC-001, AC-008 | Final for SR-001 | Evidence |
| `evidence/measure-request-tokens.mjs` + `request-tokens-deepseek-2026-11-17.json` | Solution Designer | Tokens per request before/after, provider-reported | REQ-008 | AC-008 | Final for SR-001 | Evidence; reused by the evaluation |
| `evidence/tool_usage_census.py` | Solution Designer | Tool usage shares per agent | DEC-001 | — | Final | Evidence |
| `evidence/probe-search-then-call.mjs` + `probe-search-then-call-2026-11-17.json` | Solution Designer | Search-then-call feasibility per provider | REQ-004, REQ-005, DEC-002, DEC-003 | AC-003, AC-004 | Final for SR-001 | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Real cache-hit rate of native runs: the desktop's token ledger has no native rows (`token_usage_ledger_events` empty for `autobyteus`), run files keep no usage | Converts the token saving into money | The evaluation records cache reads per request (AC-008) | Open |
| U-002 | Unknown | Whether weaker or local models (Ollama, LM Studio, Qwen) search reliably | REQ-005 | Evaluation on at least one local or small model when available; the probe covers the vault's providers | Open |
| R-001 | Risk | A search costs one extra request per needed tool per conversation (and again after compaction) | Short runs that need a searchable tool pay a round trip | Keep each agent's frequent tools listed (DEC-001); measured in the evaluation (task success, requests per task) | Addressed in requirements |
| R-002 | Risk | Calling an undeclared function name (direct mode) is not a documented provider contract | A provider may reject it later | DEC-003: use a declared call tool | Addressed |

## Architecture Investigation Findings

All `Read` on 2026-11-17 at `4cbf9e7881`.

| Finding | Source | Design consequence |
| --- | --- | --- |
| `ToolSchemaProvider` reads definitions from the global registry by name, not from instances | `tool-schema-provider.ts:21-41` | Searchable tools' definitions for search results come from the same registry; the per-agent `search_tools` definition (its description names that agent's tools) is formatted from a definition object, not by name |
| Execution, approval, preprocessors and **external results** key on the invocation's name; application agent tools return their result externally | `tool-phase.ts:90-169`, `application-agent-tool.ts` | A `call_tool` call must become the real invocation **before** `ToolPhase`; running the target inside `call_tool.execute` would ask the application for a `call_tool` result |
| No concrete invocation preprocessor exists in either package; the pipeline is configurable | `tool-invocation-pipeline.ts`, `tool-invocation-preprocessor/` | Conversion is runtime behavior, not a preprocessor |
| Invocations are built at stream end by `LlmStreamingResponseHandler`; its tool segment END carries `tool_name` and `arguments`; the web renames the card from END metadata | `llm-streaming-response-handler.ts:318-334`; web `segmentHandler.ts:395-398` | Convert there; the card shows the real tool from END on |
| One registration yields the raw-trace call and the working-context call; a result's working-context payload takes the call's name; a mismatching result name is rejected | `raw-trace-ingestion.ts:43-73`, `memory-manager.ts:280-375` | Raw traces: real tool + `called_through`; working context: the model's `call_tool` form for call and result |
| The tool-protocol repairer writes results taking `completed.toolName` before the working-context call's name, and records `toolArgs: call.arguments`; the same `repair.toolName`/`toolArgs` are then written into the **raw** recovery `tool_result` trace (corrected after ARCH-REV-001 AR-001) | `working-context-tool-protocol-repairer.ts:170-197`, `memory-manager-tool-protocol-safety.ts:63-83` | One name feeds two records: the inserted working-context result must take the working-context call's name, the raw recovery trace the real name/args from the raw call fact |
| Working-context call messages are written only at registration; restore requires a snapshot and never rebuilds calls; `WorkingContext.appendToolCalls` has no production caller (ARCH-REV-001) | `memory-manager.ts:263-296`, `working-context-snapshot-bootstrapper.ts:33-37` | No "rebuild from raw traces" path; the result-writing paths are registration, `ingestToolResults` (+ `finalizePendingToolCallsForTurn`, `memory-manager.ts:387-399`) and repair |
| Tool lifecycle state is loaded from the raw corpus when memory starts | `memory-manager.ts:127` | After a restart, the raw `called_through` tells `ingestToolResults` to name the working-context result `call_tool` |
| Anthropic native-turn assertion compares `tool_use` name and deep-equal input with the registration's specs | `memory-manager.ts:304-305` → `anthropic-native-assistant-turn.ts:54` | The specs passed are the model's form; conversion only for the exact `{name, arguments}` shape keeps them equal |
| Native provider blocks (Anthropic `tool_use`, Gemini `functionCall` part, OpenAI Responses items) travel in `nativeToolCallContext` and are replayed | `tool-call-delta.ts`, renderers | They already hold the model's form; never rewrite them |
| `Agent.replaceTools` keeps same-name instances and drops names not given | `agent.ts:59-85` | The run's `search_tools`/`call_tool` live outside `toolInstances`, so a tool change keeps them and their frozen description |
| The 324 notice is runtime-neutral: "Your tools changed. Now available: X." | `tool-list-update-notice-builder.ts:16-21` | No server notice change: on native the agent searches the named tool |
| The native `AgentConfig` is built in one place | `autobyteus-agent-run-backend-factory.ts:463` | One server change: pass the listed names |
| TESTING.md: a change to "the tools a run gets" runs the whole server unit, integration and E2E suites | `TESTING.md` "Choosing the path" | Validation plan |

## Requirement Implications

- The saving is in tokens per request (RF-002): 40–71 % of the tool share, about 3,000–5,800 tokens per request on the two real agents.
- In money, with DeepSeek's cache, the per-request saving is small (RF-005); the founder's "token saving" holds for tokens and context, and for money mainly on cache misses, uncached providers and expensive models. This is told to him honestly with the recommendation.
- Real native use is DeepSeek, Gemini (RPA endpoint) and Qwen (RF census); the provider-neutral mechanism is the one that matters.

## Notes For Architecture Design

See Architecture Investigation Findings.
