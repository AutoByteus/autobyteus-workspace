# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Complete for design handoff.
- Investigation Goal: Determine whether `autobyteus-ts` tool/schema construction, request payloads, rendering, and parsing follow current OpenAI-compatible best practices, and identify concrete changes needed to improve tool-call reliability for local OpenAI-compatible models such as LM Studio/Qwen.
- Scope Classification (`Small`/`Medium`/`Large`): Medium-to-Large.
- Scope Classification Rationale: Requires source investigation across provider request building, tool schema ownership, parser behavior, model/tool-call compatibility, Terminal-Bench conventions, and official OpenAI-compatible guidance.
- Scope Summary: Investigated schema rendering, transport payload shape, parser behavior, LM Studio history rendering, Terminal-Bench practices, and design changes needed.
- Primary Questions Resolved:
  - What schema payload does `autobyteus-ts` send for `run_bash`? It sends the OpenAI-compatible function-tool envelope, but without strict-schema best-practice constraints.
  - Does it comply with OpenAI-compatible tool schemas? The envelope is correct; strict/best-practice schema quality is incomplete.
  - Does runtime parse native tool calls or prompt-template textual formats? Default `api_tool_call` parses native streamed `tool_calls`; legacy text parsers are separate modes.
  - What does Terminal-Bench use? Multiple agent harness protocols; no single universal model tool schema. MCP-Terminus uses OpenAI-compatible native tools; Terminus/Naive use JSON/XML command batches.
  - Why does `[TOOL_CALL]` appear as text? Most likely because LM Studio renderer injects prior structured tool history as `[TOOL_CALL]` text in native API mode, conditioning the model to reproduce it.

## Request Context

User reports intermittent `run_bash` behavior in `autobyteus-ts`: sometimes the UI records successful structured `run_bash` calls, and sometimes the assistant message contains plain text such as `[TOOL_CALL] run_bash {"command":"ls -la ..."}`. Environment cited by user: Software Engineering Team using LM Studio with model `qwen3.6-35b-a3b-nvfp4` through an OpenAI-compatible endpoint. User asks for a heavy investigation into schema best practices, terminal-benchmark conventions, and whether current implementation is correct.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo; `autobyteus-ts` is a subdirectory of `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` rather than an independent Git repository.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation`
- Current Branch: `codex/autobyteus-ts-tool-schema-best-practices`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-09.
- Task Branch: `codex/autobyteus-ts-tool-schema-best-practices`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Work only in the dedicated task worktree above, not in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-09 | Command | `pwd`, `git status --short --branch`, `git remote -v`, `git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repository and branch context | Monorepo on `personal`, default tracked remote `origin/personal` | No |
| 2026-05-09 | Command | `git fetch origin --prune`; `git worktree add -b codex/autobyteus-ts-tool-schema-best-practices /Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices origin/personal` | Create mandatory dedicated task worktree | Worktree created at latest `origin/personal` (`263e89c5`) | No |
| 2026-05-09 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design reference | Design must be spine-first, ownership-led, and avoid compatibility dual paths | No |
| 2026-05-09 | Code | `autobyteus-ts/src/utils/tool-call-format.ts` | Determine default tool-call mode | `DEFAULT_TOOL_CALL_FORMAT` is `api_tool_call` | No |
| 2026-05-09 | Code | `autobyteus-ts/src/agent/context/agent-config.ts` | Determine prompt manifest behavior | In `api_tool_call`, `ToolManifestInjectorProcessor` is removed from system prompt processors | No |
| 2026-05-09 | Code | `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Trace LLM request assembly | Builds stream kwargs with `logicalConversationId`; passes `tools` when handler returns schemas; uses LLM renderer for history | Yes: filter internal kwargs and set tool-choice policy here or nearby |
| 2026-05-09 | Code | `autobyteus-ts/src/agent/streaming/handlers/streaming-handler-factory.ts` | Trace handler/schema selection | In `api_tool_call`, builds tool schemas and uses `ApiToolCallStreamingResponseHandler` | No |
| 2026-05-09 | Code | `autobyteus-ts/src/tools/usage/providers/tool-schema-provider.ts` | Trace provider formatter selection | Non-Anthropic/Gemini providers, including LM Studio, use `OpenAiJsonSchemaFormatter` | Yes: add capability/options for OpenAI-compatible strict normalization |
| 2026-05-09 | Code | `autobyteus-ts/src/tools/usage/formatters/openai-json-schema-formatter.ts` | Inspect schema formatter | Emits `{ type:'function', function:{ name, description, parameters } }`; no `strict`, no schema normalization | Yes |
| 2026-05-09 | Code | `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | Inspect reported tool schema | `command` required; `cwd`, `timeout_seconds`, `background` optional | Yes: optional fields matter for strict mode |
| 2026-05-09 | Code | `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | Inspect provider request construction | Spreads all kwargs into provider params; does not map `temperature`/`top_p`; streaming path does not explicitly pass `tool_choice` except by spread | Yes |
| 2026-05-09 | Code | `autobyteus-ts/src/llm/api/lmstudio-llm.ts`; `autobyteus-ts/src/llm/prompt-renderers/lmstudio-chat-renderer.ts` | Inspect LM Studio-specific rendering | LM Studio always uses renderer that turns `ToolCallPayload` into `[TOOL_CALL] name args` text and tool results into `[TOOL_RESULT]` user text | Yes: likely direct cause |
| 2026-05-09 | Code | `autobyteus-ts/src/llm/prompt-renderers/openai-chat-renderer.ts` | Check if structured history support already exists | Renderer already emits `assistant.tool_calls` and `role:'tool'` messages for tool payloads | Yes: reuse instead of reimplementing |
| 2026-05-09 | Code | `autobyteus-ts/src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts` | Inspect API parser behavior | Consumes `chunk.tool_calls`; textual content remains text | Yes: add diagnostic, not fallback execution |
| 2026-05-09 | Code | `autobyteus-ts/tests/integration/helpers/lmstudio-llm-helper.ts` | Inspect current benchmark/test workaround | `requireToolChoice` monkey-patches `streamUserMessage` to inject `tool_choice:'required'`; `temperature` is set on config but not mapped in provider | Yes: replace with policy/request builder |
| 2026-05-09 | Command | `pnpm install --offline --ignore-scripts` | Prepare local test/probe deps | Completed successfully | No |
| 2026-05-09 | Probe | `node --loader ts-node/esm /tmp/autobyteus_schema_probe.mjs` from `autobyteus-ts` | Print actual LM Studio schema for `run_bash` | OpenAI envelope present; no `additionalProperties:false`; no `strict:true`; only `command` required | Yes |
| 2026-05-09 | Command | `pnpm exec vitest run tests/unit/llm/api/openai-compatible-llm.test.ts tests/unit/llm/prompt-renderers/lmstudio-chat-renderer.test.ts tests/unit/agent/streaming/handlers/streaming-handler-factory.test.ts tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts` | Establish existing test baseline | 4 files / 31 tests passed; existing tests currently lock old LM Studio text renderer behavior | Yes: update tests with new expected behavior |
| 2026-05-09 | Command | `pnpm exec tsc -p tsconfig.build.json --noEmit` | Typecheck baseline | Passed with no output | No |
| 2026-05-09 | Web | OpenAI function-calling docs: https://developers.openai.com/api/docs/guides/function-calling | Official best-practice source | `tool_choice` supports auto/required/forced forms; strict mode recommended; strict requires `additionalProperties:false` for every object and all properties required; optional fields can use nullable type | Yes |
| 2026-05-09 | Web | LM Studio tool-use docs: https://lmstudio.ai/docs/developer/openai-compat/tools | Official LM Studio OpenAI-compatible guidance | Tools use OpenAI-compatible format; parsed tool calls are returned in `choices[0].message.tool_calls`; examples include `additionalProperties:false`; multi-turn examples append assistant `tool_calls` and `role:'tool'` messages | Yes |
| 2026-05-09 | Web | Qwen function-calling docs: https://qwen.readthedocs.io/en/stable/framework/function_call.html | Qwen-specific tool-calling guidance | Qwen docs use OpenAI-compatible tools; warn against stopword/ReAct templates for Qwen3 reasoning models; examples use no-think mode via `enable_thinking:false`; OpenAI-compatible responses include `tool_calls` and tool results use `tool_call_id` | Yes |
| 2026-05-09 | Repo | `/tmp/terminal-bench-source` cloned from https://github.com/harbor-framework/terminal-bench at `1a6ffa9` | Inspect Terminal-Bench agent action formats | Terminal-Bench agents use multiple protocols; see details below | No |

## Current Behavior / Current Flow

### Tool exposure spine

1. `resolveToolCallFormat()` defaults to `api_tool_call`.
2. `AgentConfig` removes `ToolManifestInjectorProcessor` in API mode, so textual tool manifests are not injected into the system prompt by default.
3. `LLMUserMessageReadyEventHandler` collects tool names from agent state/config and calls `StreamingResponseHandlerFactory.create(...)`.
4. `StreamingResponseHandlerFactory` builds schemas using `ToolSchemaProvider` for API mode and returns `ApiToolCallStreamingResponseHandler`.
5. `ToolSchemaProvider` chooses `OpenAiJsonSchemaFormatter` for LM Studio/OpenAI-compatible providers.

### Request spine

1. `LLMRequestAssembler` renders conversation history using the LLM renderer (`(llmInstance as any)._renderer`).
2. `LLMUserMessageReadyEventHandler` passes `streamKwargs` containing `logicalConversationId` and, when tools exist, `tools`.
3. `OpenAICompatibleLLM` builds request params by spreading all kwargs into the provider request object.
4. `OpenAICompatibleLLM` adds max tokens and `extraParams`, but not configured temperature/top-p/penalties/stop sequences.

### Tool-call return spine

1. OpenAI-compatible streaming code emits `ChunkResponse` objects with `tool_calls` when provider deltas contain `delta.tool_calls`.
2. `ApiToolCallStreamingResponseHandler` creates segment/tool invocation events from streamed native tool-call deltas.
3. Text content is passed through as assistant text; API mode does not parse textual `[TOOL_CALL]` fallback syntax.

### Tool-history continuation spine

1. Successful native tool calls are stored in working context as `ToolCallPayload` / `ToolResultPayload`.
2. `OpenAIChatRenderer` can render these as structured `assistant.tool_calls` and `role:'tool'` messages.
3. `LMStudioChatRenderer` currently intercepts those same payloads and flattens them into content strings: `[TOOL_CALL] ...`, `[TOOL_RESULT] ...`, `[TOOL_ERROR] ...`.
4. `LMStudioLLM` always installs `LMStudioChatRenderer`, so native API mode is contaminated by text-style tool history.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change + Refactor.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Shared Structure Looseness; Duplicated Policy Or Coordination.
- Refactor posture evidence summary: A schema-only local fix is insufficient because the direct screenshot symptom matches LM Studio history-rendering contamination. Provider request construction and tool-choice policy are also cross-cutting and currently duplicated/ad hoc.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Plain assistant text can contain `[TOOL_CALL] run_bash {...}` while other turns produce successful `run_bash` activity entries | Native tool mode is intermittently bypassed or model is being conditioned to output text tool syntax | Yes |
| `lmstudio-chat-renderer.ts` | Prior tool calls are rendered as `[TOOL_CALL] ${name} ${JSON.stringify(args)}` | Exact text pattern in screenshot is framework-generated history text | Yes |
| Schema probe | `run_bash` schema is OpenAI envelope but no `additionalProperties:false` / `strict` | Schema is acceptable minimum, not best-practice strict | Yes |
| `openai-compatible-llm.ts` | Provider params include `...kwargs`; config fields not mapped | Internal fields can leak; deterministic config may be ignored | Yes |
| LM Studio helper tests | Tool choice is forced by monkey-patching | Tool-choice policy belongs in framework config/request assembly | Yes |
| Terminal-Bench source | Multiple action protocols exist, but MCP-Terminus uses native OpenAI tool calls cleanly | Do not mix Terminal-Bench text templates with native tool-call mode | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `src/utils/tool-call-format.ts` | Global tool-call mode selection | Defaults to `api_tool_call` | Preserve; use as mode boundary |
| `src/agent/context/agent-config.ts` | Agent settings and prompt processors | Suppresses tool manifest in API mode | Extend with optional API tool-choice/schema policy or reference a dedicated policy type |
| `src/agent/handlers/llm-user-message-ready-event-handler.ts` | Prepares LLM stream call and streaming handler | Owns attaching `tools`; currently always includes `logicalConversationId` | Should attach tool-choice policy and keep internal kwargs separate |
| `src/agent/streaming/handlers/streaming-handler-factory.ts` | Chooses parser/API handler and builds tool schemas | Clean mode decision point | Extend schema build options if needed |
| `src/tools/usage/providers/tool-schema-provider.ts` | Maps tool definitions to provider schema | Provider selection is centralized | Add OpenAI-compatible schema options/capabilities here |
| `src/tools/usage/formatters/openai-json-schema-formatter.ts` | OpenAI-compatible tool envelope | No normalization/strict support | Add normalizer or delegate to one |
| `src/utils/parameter-schema.ts` | Tool argument schema model | Produces JSON Schema from internal definitions | May need optional-null support if strict mode is in scope |
| `src/llm/api/openai-compatible-llm.ts` | OpenAI-compatible sync/stream calls | Request assembly is ad hoc and leaks kwargs | Replace inline construction with request builder |
| `src/llm/api/lmstudio-llm.ts` | LM Studio provider class | Forces LM Studio text renderer | Should use structured renderer in native API mode |
| `src/llm/prompt-renderers/lmstudio-chat-renderer.ts` | LM Studio history renderer | Converts tool payloads to textual `[TOOL_CALL]` history | Keep only for legacy text modes or remove from native path |
| `src/llm/prompt-renderers/openai-chat-renderer.ts` | OpenAI-compatible message renderer | Already supports structured tool calls and tool results | Reuse for LM Studio API mode |
| `src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts` | Native tool-call stream parser | Parses `tool_calls`; text stays text | Add diagnostic for text-shaped tool calls in API mode |
| `tests/unit/llm/prompt-renderers/lmstudio-chat-renderer.test.ts` | Current renderer regression tests | Locks old textual behavior | Update/split tests by mode |
| `tests/integration/helpers/lmstudio-llm-helper.ts` | LM Studio integration helper | Monkey-patches `tool_choice` | Replace after policy support |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-09 | Probe | `node --loader ts-node/esm /tmp/autobyteus_schema_probe.mjs` from `autobyteus-ts` | `run_bash` schema printed with `type:'function'`, function name/description/parameters. `parameters.required` is only `['command']`; no `additionalProperties:false`; no `strict:true`. | Envelope is correct; strict/best-practice constraints missing. |
| 2026-05-09 | Test | `pnpm exec vitest run tests/unit/llm/api/openai-compatible-llm.test.ts tests/unit/llm/prompt-renderers/lmstudio-chat-renderer.test.ts tests/unit/agent/streaming/handlers/streaming-handler-factory.test.ts tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts` | 4 files / 31 tests passed | Current behavior is internally consistent but existing tests will need updates to reflect safer native API behavior. |
| 2026-05-09 | Build | `pnpm exec tsc -p tsconfig.build.json --noEmit` | Passed | Baseline typecheck clean. |

### Actual `run_bash` schema observed

```json
[
  {
    "type": "function",
    "function": {
      "name": "run_bash",
      "description": "Execute a shell command in a working directory. If cwd is omitted, the workspace root is used. If cwd is provided, it may be absolute or workspace-root-relative. For nested targets, reuse the same cwd on every command that should run there. The result includes effectiveCwd so you can confirm where the command actually ran.",
      "parameters": {
        "type": "object",
        "properties": {
          "command": { "description": "Shell command to execute.", "type": "string" },
          "cwd": { "description": "Optional working-directory path ...", "type": "string" },
          "timeout_seconds": { "description": "Maximum execution time for a foreground command in seconds.", "type": "integer", "default": 30 },
          "background": { "description": "Whether to start the command asynchronously and return a process handle.", "type": "boolean", "default": false }
        },
        "required": ["command"]
      }
    }
  }
]
```

## External / Public Source Findings

### OpenAI function-calling best practices

Source: https://developers.openai.com/api/docs/guides/function-calling

- OpenAI's function-calling guide documents `tool_choice` modes: auto, required, forced specific function, and allowed-tools variants.
- OpenAI recommends strict mode for reliable schema adherence.
- Strict mode requires `additionalProperties:false` on every object schema and all fields listed in `required`; optional values can be represented with nullable types.
- Chat Completions remains non-strict by default if strict is omitted.

Implication for Autobyteus: current schema envelope is correct, but best-practice strict readiness is incomplete. We should at least add `additionalProperties:false`, and only enable `strict:true` when optional/null requirements are implemented safely.

### LM Studio OpenAI-compatible tool-use guidance

Source: https://lmstudio.ai/docs/developer/openai-compat/tools

- LM Studio documents OpenAI-compatible `/v1/chat/completions` tool use with `tools` as an array of function definitions.
- LM Studio returns parsed tool calls in `choices[0].message.tool_calls` and uses `finish_reason:'tool_calls'` when parsed successfully.
- Examples include `additionalProperties:false` in tool schemas.
- Multi-turn examples append the assistant tool-call request message with `tool_calls` and append the tool result as a `role:'tool'` message with `tool_call_id`.
- LM Studio itself may internally inject prompt-template tool instructions for model templates and may return normal content when it cannot parse model output.

Implication for Autobyteus: LM Studio API consumers should use structured OpenAI-compatible messages. Autobyteus should not pre-flatten structured tool history into `[TOOL_CALL]` text in native API mode.

### Qwen function-calling guidance

Source: https://qwen.readthedocs.io/en/stable/framework/function_call.html

- Qwen docs describe OpenAI-compatible tool definitions with `type:'function'` and a JSON Schema `parameters` field.
- Qwen-Agent is described as the canonical function-calling implementation for Qwen3; it wraps OpenAI-compatible APIs and uses templates transparently.
- Docs warn against stopword/ReAct prompt templates for Qwen3 reasoning models because thoughts can contain stop words and cause unexpected tool-call behavior.
- vLLM examples use OpenAI-compatible `tools`, parsed `tool_calls`, `tool_call_id` for results, and `chat_template_kwargs: { enable_thinking: false }` in no-think mode.

Implication for Autobyteus: do not mix ReAct/text stopword-style actions into native tool-calling. Allow provider/model-specific extra-body settings through clean request config when users need no-think behavior.

### Terminal-Bench action/tool formats

Source repo: https://github.com/harbor-framework/terminal-bench, local clone `/tmp/terminal-bench-source` at `1a6ffa9`.

Key inspected files:

- `terminal_bench/agents/naive_agent.py`: uses a Pydantic `CommandResponse` with `commands: list[str]`; LLM output is validated as JSON and commands are sent to tmux.
- `terminal_bench/agents/terminus_2/terminus_2.py`: uses `TerminusJSONPlainParser` or `TerminusXMLPlainParser` and sends command batches as keystrokes.
- `terminal_bench/agents/prompt-templates/terminus-json-plain.txt`: asks model to output JSON with `analysis`, `plan`, `commands` array of `{ keystrokes, duration }`, and `task_complete`; extra text before/after JSON generates warnings but is tolerated.
- `terminal_bench/agents/mcp_agents/mcp_terminus.py`: converts MCP tools to OpenAI tools, calls LiteLLM `completion(..., tools=openai_tools, tool_choice='auto')`, appends provider `message.tool_calls`, calls MCP tools, and appends `role:'tool'` results.
- `docker/mcp-server/server/server.py`: terminal MCP server exposes `keystrokes` and `capture-pane` tools with Pydantic input schemas.

Implication for Autobyteus: Terminal-Bench benchmarks agent harnesses, not one model-native schema. It is acceptable for an agent to use JSON/XML textual command batches, but if Autobyteus selects native OpenAI-compatible tool mode it must keep native tool schemas, native tool-call parsing, and native history representation coherent.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Live LM Studio is useful for end-to-end reproduction but was not required to find the framework-level issues.
- Required config, feature flags, env vars, or accounts: `AUTOBYTEUS_STREAM_PARSER` default is `api_tool_call`; LM Studio tests may use `LMSTUDIO_HOSTS` / `LMSTUDIO_MODEL_ID` if run live.
- External repos, samples, or artifacts cloned/downloaded for investigation: `/tmp/terminal-bench-source` from `https://github.com/harbor-framework/terminal-bench`, commit `1a6ffa9`.
- Setup commands that materially affected the investigation: `pnpm install --offline --ignore-scripts` in `autobyteus-ts`.
- Cleanup notes for temporary investigation-only setup: `/tmp/autobyteus_schema_probe.mjs` and `/tmp/terminal-bench-source` are temporary investigation artifacts outside the repository.

## Findings From Code / Docs / Data / Logs

1. **Schema envelope is not the primary defect.** The schema sent for `run_bash` follows the OpenAI-compatible top-level shape LM Studio expects.
2. **Schema is still weaker than current best practice.** Missing `additionalProperties:false` and lack of strict-mode readiness can reduce parser/model reliability and schema validation quality.
3. **LM Studio renderer is the strongest root-cause match.** The literal screenshot pattern `[TOOL_CALL] run_bash {...}` is exactly how `LMStudioChatRenderer` renders previous tool calls.
4. **Structured rendering already exists.** `OpenAIChatRenderer` can emit the correct `assistant.tool_calls` / `tool` messages and should be reused for LM Studio native mode.
5. **Request payload assembly is too permissive.** Internal kwargs leak to providers, and LLMConfig generation controls are not consistently applied.
6. **Tool-choice policy is ad hoc.** Existing helper monkey-patching proves the need for a formal policy layer.
7. **No safe fallback should execute text tools in API mode.** A fallback parser could hide provider/model problems and create dual semantics; diagnostics are safer and align with the team design principle against compatibility dual paths.

## Constraints / Dependencies / Compatibility Facts

- No backward-compatibility dual paths should be introduced for an in-scope replacement; if API-mode LM Studio text history is wrong, replace it rather than parsing both.
- Must distinguish provider-native tool calls from textual tool-call templates.
- Strict mode cannot be enabled safely unless optional/null schema semantics are represented correctly.
- LM Studio and Qwen model/template behavior can vary by version and model. Autobyteus can control request/history shape but cannot guarantee local model parser success.

## Open Unknowns / Risks

- Whether all OpenAI-compatible providers accepted by Autobyteus tolerate `additionalProperties:false` equally. This is expected for JSON Schema tools, but tests should cover supported providers where mocks exist.
- Whether object-form `tool_choice` is accepted by all OpenAI-compatible providers. LM Studio historically may support only string values in some versions; policy must be provider-capability aware or allow string-only defaults.
- Whether strict mode should land in this implementation ticket or be split into a second ticket after `ParameterSchema` supports strict optional fields.

## Notes For Architecture Reviewer

The recommended implementation is not a broad rewrite, but it crosses several ownership boundaries. Please review especially:

- Whether `AgentConfig` is the right public owner for API tool-choice policy, or whether a dedicated `ToolCallPolicy` owned by the request handler is cleaner.
- Whether LM Studio should simply use `OpenAIChatRenderer` in all modes, or whether `LMStudioChatRenderer` should be retained behind explicit legacy text parser modes.
- Whether strict mode should be designed now but gated off by default until optional fields are nullable-required.

## Test-Driven Schema Compliance Addendum

After the user clarified that this investigation should validate generated schemas by running tests/probes rather than relying on source reading alone, I added and ran an investigation-only Vitest compliance check:

- Test file: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance.test.ts`
- Generated report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance-report.json`
- Command run: `pnpm exec vitest run tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance.test.ts`
- Result: passed as an investigation/reporting test: 1 test file, 3 tests passed.

The compliance check registers the default tool set, builds LM Studio/OpenAI-compatible generated tool schemas through the real `ToolSchemaProvider`, and compares those generated schemas against documented criteria:

| Criterion | Status | Evidence |
| --- | --- | --- |
| Minimum OpenAI-compatible function-tool envelope | Pass | `openaiCompatibleEnvelope.passed === true`, `issueCount: 0` across 25 default tools. |
| Closed object schemas using `additionalProperties:false` | Fail / gap | `closedObjectSchemas.passed === false`, `issueCount: 28`; `run_bash` fails at `function.parameters`. |
| `strict:true` enabled | Fail / gap | `strictModeEnabled.passed === false`, `issueCount: 25`; no default LM Studio tool schema enables strict mode. |
| Strict required-field readiness | Fail / gap if strict is enabled now | `strictRequiredFieldReady.passed === false`, `issueCount: 13`; `run_bash` would need `cwd`, `timeout_seconds`, and `background` represented as required nullable/defaultable fields for OpenAI strict mode. |

Specific `run_bash` generated-schema result from the report:

```json
{
  "openaiCompatibleEnvelope": true,
  "closedObjectSchemas": false,
  "strictModeEnabled": false,
  "strictRequiredFieldReady": false,
  "firstClosedObjectIssues": [
    {
      "tool": "run_bash",
      "path": "function.parameters",
      "level": "best_practice",
      "message": "Object schema is not closed with additionalProperties:false."
    }
  ],
  "firstStrictRequiredFieldIssues": [
    {
      "tool": "run_bash",
      "path": "function.parameters",
      "level": "strict_required",
      "message": "Strict OpenAI schemas require all object properties to be listed in required; missing: cwd, timeout_seconds, background. Optional fields need nullable types if strict mode is used."
    }
  ]
}
```

This test evidence refines the conclusion:

1. The generated schema is not fundamentally malformed. It passes the required OpenAI-compatible function-tool envelope check.
2. The generated schema does not fully follow documented best-practice / strict-readiness guidance. It omits `additionalProperties:false`, omits `strict:true`, and current optional-field representation is not strict-ready.
3. Existing schema tests are necessary but not sufficient for this question. The existing tests prove current intended formatter behavior, but they do not check the documented best-practice criteria above.

The existing baseline schema-related tests were also run:

- Command: `pnpm exec vitest run tests/unit/tools/usage/formatters/openai-json-schema-formatter.test.ts tests/unit/tools/usage/providers/tool-schema-provider.test.ts tests/unit/utils/parameter-schema.test.ts`
- Result: 3 files / 12 tests passed.
- Interpretation: current schema generation behavior is covered and stable, but those tests encode current behavior rather than industry best-practice compliance.


## Design-Impact Rework: AgentConfig Tool-Choice Public API

Implementation feedback and user questioning exposed a design-impact issue in the proposed `AgentConfig.apiToolChoicePolicy` API. The server/Electron product path currently constructs `AgentConfig` without this field and the server domain config types do not carry it. Therefore this new public field does not explain the observed runtime improvement and would add product-facing API surface without an end-to-end configuration owner.

Evidence checked/reported:

- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` constructs `AgentConfig` without a tool-choice argument.
- `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-agent-config-builder.ts` constructs `AgentConfig` without a tool-choice argument.
- Server domain config types do not include tool-choice policy.
- In `autobyteus-ts`, the proposed policy defaults to `null`, so it emits no `tool_choice` unless explicitly set by tests/helpers.

Updated investigation conclusion:

- Confirmed fixes remain: schema normalization/strict-readiness, OpenAI-compatible request builder/config filtering, LM Studio native structured history, and diagnostics.
- `tool_choice` should remain supported as explicit lower-level provider request input where already available.
- A new public `AgentConfig` tool-choice policy is not justified in this ticket and should be removed/de-scoped.
- Product/server-configurable tool-choice policy should be a future ticket if required.

## Design-Impact Rework: API Tool Result Continuation User-Message Duplication

After the user asked whether the framework-level API tool mode feeds tool results back as a user message, I checked the full continuation pipeline rather than only the `OpenAIChatRenderer` unit behavior.

Evidence:

- `src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts` calls `memoryManager.ingestToolResult(...)`.
- `src/memory/memory-manager.ts` and `src/memory/working-context-snapshot.ts` append a structured `ToolResultPayload`.
- `src/llm/prompt-renderers/openai-chat-renderer.ts` renders that payload correctly as `role:'tool'` with `tool_call_id`.
- `src/agent/handlers/tool-result-event-handler.ts` also aggregates the same tool results into text and creates `AgentInputUserMessage(..., SenderType.TOOL, ...)`.
- `src/agent/handlers/user-input-message-event-handler.ts` converts that `SenderType.TOOL` message into an `LLMUserMessageReadyEvent`.
- `src/agent/llm-request-assembler.ts` always appends the incoming `LLMUserMessage` as `MessageRole.USER` before rendering the request.

Probe output was saved at:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/api-tool-continuation-render-probe-output.json`

The probe showed the next rendered OpenAI-compatible request contains both:

1. the correct structured `role:'tool'` result message, and
2. an extra synthetic `role:'user'` message starting `The following tool executions have completed...` and repeating the same result.

Updated conclusion:

- Renderer-level behavior is correct.
- Framework-level native API continuation behavior is not fully correct/best-practice because it duplicates the tool result as user content.
- The aggregate textual continuation should remain only for legacy text/parser modes or UI/logging, while native OpenAI-compatible mode should continue from the structured assistant/tool history without appending a user message.

### Server-Side Tool Result Customization Check

The user asked whether `autobyteus-server-ts` has customization around tool results that might explain why tool results are sent back as user messages.

Checked sources:

- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-definition/domain/models.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-definition/providers/agent-definition-config.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/startup/agent-customization-loader.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-agent-config-builder.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts`
- Current runtime configs under `/Users/normy/.autobyteus/server-data/agents/*/agent-config.json`

Findings:

- Server supports `toolExecutionResultProcessorNames` as an agent-definition field and passes resolved tool result processors into `AgentConfig` for both standalone agent runs and team member agents.
- Current source does not contain active server-specific tool result processor implementations under `src/agent-customization/processors/tool-result`; that directory is absent.
- `src/startup/agent-customization-loader.ts` currently does not register tool-result processors.
- Current runtime agent configs checked under `/Users/normy/.autobyteus/server-data/agents/*/agent-config.json` all specify `toolExecutionResultProcessorNames: []`.
- A stale unit test, `tests/unit/startup/agent-customization-loader.test.ts`, imports missing tool-result processor classes (`MediaToolResultUrlTransformerProcessor`, `AgentArtifactEventProcessor`) and fails before running tests. Command: `pnpm exec vitest run tests/unit/startup/agent-customization-loader.test.ts`; result: failed with missing module for `src/agent-customization/processors/tool-result/media-tool-result-url-transformer-processor.js`.
- The active server customization that affects this issue is `UserInputContextBuildingProcessor`, a mandatory input processor. It maps `SenderType.TOOL` to the header `**[Tool Execution Result]**` and formats the message content accordingly.

Conclusion:

- The server is not currently customizing tool results through an active tool-result processor in the checked source/runtime config.
- The server does customize tool-originated `AgentInputUserMessage` content once the core framework routes tool results through the user-input pipeline.
- Therefore the root issue remains in `autobyteus-ts`: native API tool-result continuation should not be represented as a user-input message in the provider-visible OpenAI-compatible history.


## Round-6 Non-OpenAI Provider-Native Renderer Follow-Up

After the LM Studio/OpenAI-compatible Chat path was validated, the user asked whether the same issue exists for Gemini, Ollama, and other non-OpenAI-native providers. I compared official provider docs and ran a local renderer probe.

Result: the shared OpenAI-compatible Chat path is corrected, but provider-native renderers for Gemini, Ollama, Anthropic, Mistral, and OpenAI Responses still render stored `ToolCallPayload` / `ToolResultPayload` history as legacy `[TOOL_CALL]` / `[TOOL_RESULT]` text. Those providers therefore remain known gaps for native API-mode history rendering and are not solved by the current ticket.

Detailed evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/non-openai-api-mode-provider-investigation.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/probes/non-openai-api-renderer-probe.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/probes/non-openai-api-renderer-probe-output.json`

Architecture review decision `AR-006-001`: do not claim this ticket solves all provider-native API renderers. Narrow the ticket to OpenAI-compatible Chat + shared no-synthetic-user continuation, and defer non-OpenAI provider-native renderers to a separate provider-by-provider design unless the user explicitly expands scope.
