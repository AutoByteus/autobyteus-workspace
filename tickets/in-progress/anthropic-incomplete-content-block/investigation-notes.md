# Investigation Notes

## Investigation Meta

- Package identifier: `anthropic-incomplete-content-block`
- Request / ticket: Project Task `project_task_3c6c098c-2a8b-4f46-b020-1c2f30eeb5f9` ("Anthropic content block is incomplete" on `write_file`), from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block` / `codex/anthropic-incomplete-content-block`
- Resolved base remote / branch / revision: `origin/personal` @ `d28c56d5d` (refreshed with `git fetch origin` on 2026-10-10 before creating the worktree)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree created with `git worktree add -b codex/anthropic-incomplete-content-block … origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-008`
- Authorities read (requirements reading gate; file and date): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-10); repo `AGENTS.md`; claude-api skill (streaming, tool use, `max_tokens`, eager input streaming guidance) (2026-10-10)
- Investigation status: Requirements and architecture investigation complete (AF-001..AF-015, plus the ARCH-REV-001 findings recorded in SR-007).

## Initial Request And Clarifications

- Original request: On the native AutoByteus runtime with `claude-opus-5-5`, `write_file` keeps failing with "Error in Anthropic streaming: Error: Anthropic content block is incomplete." It happens again on "continue", so the user's team run is blocked. Find and fix the root cause. Large tool inputs must work. A real truncation must be handled clearly and recoverably, without corrupting the stored provider-native history. The affected run must be able to continue. Add tests.
- Clarifications received: The Project Task Manager relayed a finding from the Anthropic prompt-caching team's Solution Designer (2026-10-10). Their live probe showed `max_tokens` truncation mid-`tool_use` with no `content_block_stop`. They suggested raising the default output limit and handling `stop_reason=max_tokens` gracefully. Both are treated here as unverified leads; both were confirmed below.
- User-supplied facts and constraints: Screenshot `ctx_20bd5a89c118__22.png`; resumed after release v1.4.99-beta.9 (merge 46e94fdea). Coordinate through the Project Task Manager with the caching team copy (`software_engineering_team_28d0db6ae79c427ab1ce157295fc766c`, now on compaction cache reuse `project_task_1c0ac46f-…`) if changes overlap.
- Initial ambiguity: How a real truncation should be surfaced, and whether the agent itself should be told about it. See DEC-001 in the requirements.

## Product And Domain Understanding

- Product area: autobyteus-ts native LLM adapter for Anthropic (`AnthropicLLM` streaming path) and the agent LLM phase that consumes it.
- Affected actors or systems: Users running AutoByteus-runtime agents and teams on Claude models; the agent loop (tool execution, memory and working context).
- Existing user or operational purpose: Agents write files and run tools through Claude's native tool calls.
- Relevant terminology: `max_tokens` is Anthropic's per-response output cap, and adaptive thinking counts toward it. `stop_reason` is the reason the response ended. A provider-native assistant turn is the signed Anthropic block list stored for tool-use turns and replayed in later requests.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-10 | User | Screenshot `…/context/ctx_20bd5a89c118__22.png` | Symptom | `write_file` fails twice with the exact error string; the run is Idle | — |
| 2026-10-10 | Code | `autobyteus-ts/src/llm/api/anthropic-assistant-turn-assembler.ts` l.55-69 | Error origin | `complete()` throws `Anthropic content block is incomplete.` for any block without `content_block_stop` | — |
| 2026-10-10 | Code | `autobyteus-ts/src/llm/api/anthropic-llm.ts` l.242, 320-381 | Request and stream handling | `maxTokens = config.maxTokens ?? 8192`. `message_stop` always calls `nativeTurnAssembler.complete()`. `message_delta.stop_reason` is never read. All errors are rewrapped as `Error in Anthropic streaming: ${e}` | — |
| 2026-10-10 | Code | `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts` | Model limits | Opus 5.5 static metadata: 1M context, **128,000 max output**. `defaultConfig` sets no `maxTokens`. All Anthropic catalog entries carry an output limit (128k, or 64k for Sonnet 4.6) | — |
| 2026-10-10 | Code | `autobyteus-ts/src/agent/token-budget.ts` l.54-57 | Input budget | When `config.maxTokens` is null, the budget already reserves `model.maxOutputTokens` (128k) for output. The adapter actually sends 8192, so the two disagree | Design |
| 2026-10-10 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts` l.186-339 | Failure handling | On any stream error, the phase restores the request snapshot (rollback), finalizes segments as failed, emits an error to the user and ends the turn (`final`, `isError`). Nothing from the failed response is stored | — |
| 2026-10-10 | Code | `autobyteus-ts/src/agent/streaming/handlers/llm-streaming-response-handler.ts` l.88-115 | Tool invocation build | If tool-call JSON is unparsable, it logs and uses `{}` arguments. **A truncated tool call that reaches `finalize()` would be executed with empty arguments** | Design must prevent this |
| 2026-10-10 | Code | `autobyteus-ts/src/llm/converters/anthropic-tool-call-converter.ts` | Tool deltas | Tool deltas stream to the handler before the turn is known to be complete | Design |
| 2026-10-10 | Code | `autobyteus-ts/src/memory/llm-request-recovery.ts` | Rollback semantics | Restores the working context and compaction state to the pre-request snapshot and writes an `llm_request_recovery` raw trace | — |
| 2026-10-10 | Code | `autobyteus-ts/src/llm/api/anthropic-native-assistant-turn.ts`, `anthropic-native-history-policy.ts` | Native history | A stored native turn requires complete blocks (`tool_use.input` must be an object). Thinking blocks are bound to the prefix | A truncated turn cannot be stored as a valid native turn |
| 2026-10-10 | Command | `git log -S "config.maxTokens ?? 8192"` and `git log -S "Anthropic content block is incomplete"` | Regression origin | The 8192 default dates from `240d72207`. The throw was introduced in `704e2108e` (Opus 5.5 signed-turn support). `80845f45e` (caching) only changed an import in the assembler | Not a caching regression |
| 2026-10-10 | Data | `~/.autobyteus/server-data/memory/agent_teams/software_engineering_team_107698504f764520931548e969e11f08/solution_designer_08a92ade04734555bd597d1fa89dc54e/raw_traces_active.jsonl` (rows 194-199) | The user's run | `turn_0005:llm:19` was rolled back after ~72 s (ts 1791564389→1791564461). After "continue", `turn_0006:llm:1` was rolled back after ~72 s (1791564468→1791564541). Both used the `LlmPhase.stream` recovery | ~72 s is consistent with roughly 8k output tokens |
| 2026-10-10 | Data | Same run, `working_context_snapshot.json` (132 messages) | Can the run continue? | The working context ends with a valid assistant `run_bash` tool call plus its tool result. Neither failed attempt left partial output. The "continue" message is in the raw trace but was rolled back from the working context (existing rollback semantics) | The run can continue once requests succeed |
| 2026-10-10 | Command | `probes/max-tokens-tool-use-probe.cjs` (live, Opus 5.5, streaming, adaptive thinking, `max_tokens=400`) | Reproduce | Events: `message_start`, `content_block_start #0 tool_use`, `message_delta stop_reason=max_tokens`, `message_stop`. **There is no `content_block_stop`**. Only 18 chars of `input_json` arrived (the parameter is buffered by the API) | Root cause confirmed |
| 2026-10-10 | Web | https://platform.claude.com/docs/en/api/rate-limits | Is a large `max_tokens` safe? | "The `max_tokens` parameter does not factor into OTPM rate limit calculations, so there is no rate limit downside to setting a higher `max_tokens` value." | Supports a higher default |
| 2026-10-10 | Doc | claude-api skill: `shared/model-migration.md`, `shared/tool-use-concepts.md` | Contract | Every current model streams up to 128K output. Non-streaming requests above ~16K risk SDK timeouts. When `stop_reason` is `max_tokens`/`refusal` and a `tool_use` is present, do not run the tools | Requirements and preserved behavior |
| 2026-10-10 | Code | `node_modules/@anthropic-ai/sdk/client.js` `calculateNonstreamingTimeout` | SDK limit | Non-streaming requests throw `Streaming is required…` above ~21,333 `max_tokens` unless an explicit timeout is set | The non-streaming path must keep a bounded default |
| 2026-10-10 | Code | `autobyteus-server-ts/src/agent-execution/compaction/compaction-llm-factory.ts` | Compaction calls | Compaction sets `maxTokens` explicitly (requested or 8192, capped by the model) | Unaffected |
| 2026-10-10 | Code | Claude Agent SDK 0.3.280 bundled Claude Code binary `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk-darwin-arm64@0.3.280/.../claude` (strings) | How Claude Code sets the output limit | `dXe(model)` = env `CLAUDE_CODE_MAX_OUTPUT_TOKENS` capped at the model's `upperLimit`, otherwise the model's `default`, both from a built-in model table. Opus 5.5 is `default:128000, upper:128000`. Opus 5 / 4.8 / 4.7 / 4.6, Sonnet 5, Fable 5/5.1 are `default:64000, upper:128000`. Sonnet 4.6 is 32000/128000; Haiku 4.5 32000/64000; claude-3-5-* 8192/8192. The unknown-model fallback is 32000/128000 | Our proposed default (the catalog maximum) equals Claude Code for Opus 5.5 and is at or above its default elsewhere; REQ-001 |
| 2026-10-10 | Code | Same binary: `stop_reason==="max_tokens"` branch, constants `uxt`, `Gi=3`, transition `max_output_tokens_recovery` | What Claude Code does on truncation | It does not fail at once. It appends a hidden (meta) user message: "Output token limit hit. Resume directly — no apology, no recap of what you were doing. Pick up mid-thought if that is where the cut happened. Break remaining work into smaller pieces." It then continues the turn automatically, up to 3 recovery attempts. Only after that does it show "Claude's response exceeded the N output token maximum. To configure this behavior, set the CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable." | Adds option C to DEC-001; DEC-001 |
| 2026-10-10 | Code | `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` `_streamMessagesToLLM` (l.154+) | Other providers: finish handling | `chunk.choices[0].finish_reason` is never read; usage chunk marks `is_complete`. Covers DeepSeek, Kimi, Qwen, GLM, MiniMax, LM Studio, Grok, OpenAI-compatible endpoints | BEH-008 |
| 2026-10-10 | Code | `openai-responses-llm.ts` `_streamMessagesToLLM` (l.216-415) | OpenAI | Only `response.completed` is handled; `response.incomplete` (e.g. `max_output_tokens`) and `response.failed` are ignored. A truncated stream yields its partial function-call deltas and no completion chunk | BEH-008 |
| 2026-10-10 | Code | `gemini-llm.ts` `_streamMessagesToLLM` (l.235-300) | Gemini | `candidates[0].finishReason` is ignored in streaming (`MAX_TOKENS`, `SAFETY`, `MALFORMED_FUNCTION_CALL`, …); the non-streaming path classifies them | BEH-008 |
| 2026-10-10 | Code | `mistral-llm.ts`, `ollama-llm.ts`, `autobyteus-llm.ts` streaming | Others | No finish reason surfaced (only `is_complete`/usage) | BEH-008 |
| 2026-10-10 | Code | `agent/streaming/handlers/llm-streaming-response-handler.ts` `buildInvocation` (l.88-115) | Shared tool-call handling | Invalid JSON arguments are logged and replaced by `{}`, and the invocation is recorded and executed | BEH-009 |
| 2026-10-10 | Code | Claude Code binary constant `lwr` | Malformed tool-call practice | "Your tool call was malformed and could not be parsed. Please retry." (also `axt`: "The previous response failed to produce a valid tool call. Please retry the tool call now.") | REQ-011 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | An agent on the native runtime with a Claude model makes a tool call whose generated output (thinking plus tool input) exceeds 8,192 tokens, such as a long `write_file` | The request is sent with `max_tokens=8192`. The API stops with `max_tokens`. The `tool_use` block never receives `content_block_stop`. `message_stop` triggers `complete()`, which throws | User sees "Error in Anthropic streaming: Error: Anthropic content block is incomplete." The request is rolled back and the turn ends. Retrying regenerates the same oversized call and fails the same way | Probe, code, user run traces | High |
| BEH-002 | System | Any streamed Claude response truncated by `max_tokens` (or cut by `refusal`) while a block is open, including a text-only response | `complete()` throws for every unstopped block, including text and thinking blocks | Since `704e2108e`, a truncated text answer fails with the same opaque error instead of being delivered partially (the behavior before that commit) | Code trace; inferred from the probe's missing stop for the open block | Medium. Text-only truncation is not live-probed; the code path is the same |
| BEH-003 | System | Stream failure during an LLM request | The LLM phase rolls the working context back to the pre-request snapshot and emits a turn error | Stored history (including signed native turns) is unchanged. The next user message produces a valid request | `llm-phase.ts`, `llm-request-recovery.ts`, user run snapshot | High |
| BEH-004 | System | Explicit user/agent `max_tokens` configuration | `LLMConfig.maxTokens` is respected when set | Configured value is sent | `anthropic-llm.ts` l.242, `llm-config-overrides.ts` | High |
| BEH-005 | System | Non-streaming Anthropic call (`sendMessages`) | Same `max_tokens` default (8192). The SDK rejects about 21k or more without an explicit timeout | Works at 8192 | `anthropic-llm.ts` l.288-318, SDK `calculateNonstreamingTimeout` | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `anthropic-llm.ts` `_streamMessagesToLLM` | Streams events, feeds the assembler, yields text, reasoning, tool deltas and usage | Must not fail opaquely on truncation, and must name the cause | Where `stop_reason` is captured, and how truncation is classified before or at `message_stop` |
| `anthropic-assistant-turn-assembler.ts` | Builds a signed native turn from events; strict on incomplete blocks | A truncated turn must never become a stored native turn | Keep it strict, or let it report "truncated" distinctly |
| `llm-streaming-response-handler.ts` | Turns tool deltas into `ToolInvocation`s at `finalize()`, using `{}` when arguments are unparsable | A truncated tool call must never execute | The truncation must surface as a failure before `finalize()` runs |
| `llm-phase.ts` | Rolls back on stream error; reports an error code and message to the user | Gives "recoverable, history not corrupted" for free | The error code/message is not preserved through the `Error in Anthropic streaming:` rewrap |
| `token-budget.ts` | Reserves `min(config.maxTokens, model.maxOutputTokens)`, otherwise the model's output limit | Input budget already assumes a 128k output reservation | Raising the adapter default makes request and budget consistent |
| `extractProviderErrorEvidence` | Reads `message`, `code` and `status` from the error | A typed error with a `code` can surface a stable code to the UI | Design |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: the model catalog's `maxOutputTokens` (static metadata, which the Anthropic Models API `max_tokens` can refresh live).
- Existing readers, writers, or contracts that consume them: `LLMModel.maxOutputTokens`, `token-budget.ts`, compaction LLM factory.
- Evidence paths: `anthropic-supported-model-definitions.ts`, `metadata/anthropic-model-metadata-provider.ts`.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries: `AnthropicLLM` (provider adapter), `AnthropicAssistantTurnAssembler`, the LLM phase error path (provider-neutral), `ProviderErrorEvidence`.
- Existing structural surfaces that can support the approved behavior: request rollback (`LlmRequestRecoveryBoundary`) and the error-notification path already give a recoverable failure that leaves history intact.
- Evidence paths: as listed in the Source Log.

### Potential Structural Impacts To Investigate

- API or external-contract change: Internal shared contract `ChunkResponse`/`CompleteResponse` `finish` (autobyteus-ts). No server/web contract change.
- Persistence schema or invariant change: None. Nothing new is persisted, and truncated output is never stored.
- Security or privacy boundary change: None.
- Concurrency or lifecycle change: None.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: Structural refactoring is in scope after DEC-003: a provider-neutral finish contract across all adapters, agent-loop recovery, the tool-admission invariant and turn-owned LLM-call identity (see design-spec.md). No deployment or migration change.
- Confirmed absent, present, or unknown: Confirmed absent for persistence, security and migration.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| `node probes/max-tokens-tool-use-probe.cjs <autobyteus-ts> 400` | Opus 5.5, streaming, adaptive thinking, a forced long `write_file`, `max_tokens=400` | `message_start` → `content_block_start #0 tool_use` → `message_delta stop_reason=max_tokens output_tokens=400` → `message_stop`, with no `content_block_stop` | Truncation is a normal API outcome (HTTP 200, `stop_reason=max_tokens`), not a protocol violation. It must be classified, not thrown as "incomplete block" | `probes/max-tokens-400.out.json` |
| Raw trace timing of the user's run | Two failed `write_file` attempts | About 72 s each, then rollback | Consistent with hitting the 8192-token cap at roughly 110 tok/s; deterministic on retry | user run `raw_traces_active.jsonl` rows 197, 199 |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User via the Project Task Manager | Large `write_file` must work on Opus 5.5. A real truncation must be clear and recoverable. The stuck run must continue | Strong (explicit) | REQ-001..REQ-006 | DEC-001: should the agent itself also be told? |
| Caching-team Solution Designer (relayed) | Same root cause; suggests catalog `maxOutputTokens` and graceful `max_tokens` handling | Medium (independent live probe) | Confirms REQ-001/REQ-002 | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Anthropic Messages streaming | Live API, 2026-10-10 | On `max_tokens`, an open block gets no `content_block_stop`; `message_delta.stop_reason` carries the reason | Probe | Refusal mid-block is assumed to behave the same (claude-api guidance) and was not probed |
| Anthropic output limits | Opus 5.5 128K output; streaming required above ~16K | The default may be the model's own output limit on streaming requests | claude-api skill, catalog | — |
| Anthropic rate limits | Docs, 2026-10-10 | `max_tokens` does not count toward OTPM | Web source | — |
| `@anthropic-ai/sdk` | 0.128.0 installed (0.132.1 declared) | Non-streaming requests above ~21,333 `max_tokens` throw without a timeout | SDK source | — |

## Persisted Data And State Facts

- Affected stored or external subject: Agent working context and raw traces (memory), including stored provider-native Anthropic turns.
- Location and representative shape: `memory/agent_teams/<team>/<member>/working_context_snapshot.json`, `raw_traces_active.jsonl`.
- Approximate volume: Per run.
- Current readers and writers: MemoryManager and the LLM phase.
- Current unknown/extra-field behavior: N/A.
- Required semantics or data that must be preserved: All committed history, including signed thinking and native turns, must stay byte-identical and valid for replay. A truncated response must never be stored as a native turn.
- Acceptable loss, reset, rebuild, or regeneration: The truncated output itself (it is regenerated on the next attempt).
- Privacy, retention, compliance, downtime, or operational constraints: None.
- Remaining evidence gap: None. The user's run snapshot is valid today.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- Remaining fields: N/A — not applicable.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/max-tokens-tool-use-probe.cjs` | Solution Designer | Live reproduction of `max_tokens` truncation mid-`tool_use` | Evidence | REQ-002, AC-003 | Current | Evidence only; no approval needed |
| `probes/max-tokens-400.out.json` | Solution Designer | Captured event sequence | Evidence | REQ-002 | Current | Evidence only |
| `/tmp/sd-cc-strings/caps-wide.txt` (disposable extract, not promoted) | Solution Designer | Claude Code model table excerpt | Evidence | REQ-001, DEC-001 | Disposable | Evidence only; findings recorded in the Source Log |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Event shape for `refusal` mid-`tool_use` (no stop expected) | Handling must cover it the same way | Design treats any unstopped block with a terminal `stop_reason` generically | Accepted |
| UNK-002 | Unknown | Exact design-spec size the user's agent was writing | Whether 128k is enough | The spec is a document of a few thousand words, far below 128k tokens | Low risk |
| ASM-003 | Assumption | The AutoByteus LLM server proxy (`autobyteus-llm.ts`) does not report finish reasons | — | Moot: the user confirmed on 2026-10-10 that the remote server no longer exists; the provider's removal is a follow-up ticket requested from the Project Task Manager | Closed (out of scope) |
| RSK-004 | Risk | Sending the catalog maximum explicitly (REQ-012) relies on accurate catalog/live `maxOutputTokens`; a wrong value could cause a provider 400 where omission worked before | Regressions for some providers | Request-param unit tests per adapter; real-provider smoke where keys exist; a configured `max_tokens` still overrides | Open |
| RSK-001 | Risk | The caching team's ongoing compaction-cache work may touch `anthropic-llm.ts` | Merge overlap | 2026-10-10, relayed by the Project Task Manager from `project_task_1c0ac46f`: their work does not touch `anthropic-llm.ts` or `anthropic-assistant-turn-assembler.ts` (their "assembler" is `LLMRequestAssembler`). There is no merge-order dependency; whichever lands second rebases | Resolved |
| CON-001 | Constraint (relayed, verified against `token-budget.ts` l.54-57) | The compaction trigger budget reserves `min(config.maxTokens, model.maxOutputTokens)`, which is 128k for Opus 5.5 when `config.maxTokens` is unset | Writing a different value into `config.maxTokens` would move the compaction trigger | Design must derive the default output limit from the catalog at request-build time without writing it into `config.maxTokens` (or write exactly the catalog value) | Design constraint |
| EVD-001 | Evidence (relayed) | A truncated compaction summary delivered as partial text (DEC-002 "deliver partial") is rejected by the compaction parser as a failed attempt, and the existing fallback runs | DEC-002 is safe for compaction | Caching team confirmation | Recorded |
| RSK-002 | Risk | Without `eager_input_streaming`, a large tool input is buffered server-side, so the UI shows no progress for minutes while `write_file` content is generated | UX, not correctness | Out of scope; separate-ticket candidate | Recorded |
| RSK-003 | Risk | Other providers' streaming adapters build `{}`-argument invocations from truncated tool calls and do not detect truncation | Same class of bug elsewhere | Verified 2026-10-10 (see Source Log). In scope since DEC-003 (refactor all AutoByteus-runtime providers now): addressed by REQ-009..REQ-012 and design D-02/D-07 | Resolved by scope decision |

## Architecture Investigation Findings

Authorities read for the architecture phase (2026-10-10): `.claude/skills/solution-designer/references/architecture-design.md`, `.claude/skills/solution-designer/design-principles.md`, repository `DESIGN.md`, `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md`, `TESTING.md` (layers, path choice, rules). `autobyteus-ts` has no package `DESIGN.md`/`AGENTS.md`.

| ID | Source | Finding | Design implication |
| --- | --- | --- | --- |
| AF-001 | `autobyteus-ts/src/llm/base.ts` l.105-131 | `BaseLLM.streamMessages` is the single public stream boundary. It wraps `_streamMessagesToLLM`, keeps the last `is_complete` chunk and builds a `CompleteResponse` for after-hooks (usage only) | The terminal-chunk contract (usage plus finish) is owned at this boundary, and after-hooks get the finish too |
| AF-002 | `llm/api/*-llm.ts` streaming paths | No adapter reads a finish reason. Gemini yields `is_complete` on every chunk that has `usageMetadata`; OpenAI-compatible emits `is_complete` only on its usage chunk; OpenAI Responses handles only `response.completed` | Each adapter must yield exactly one terminal chunk, last, with usage (nullable) and finish |
| AF-003 | `llm/api/completion-status.ts`; `CompleteResponse.completionStatus/completionReason` | Non-streaming paths classify via `completionFromReason`/`responsesCompletion` into a coarse status. Consumers: compaction only (`direct-llm-compression-strategy.ts`, `pending-compaction-executor.ts`, `compaction-execution.ts`) and the compaction report contract carried to the server and web (`completion_status`, `completion_reason`) | Replace with one normalized finish per adapter (both paths). Keep `completionStatus`/`completionReason` as derived read-only projections for the compaction report contract (no stored parallel fields) |
| AF-004 | `agent/loop/llm-phase.ts` l.139-140, 248-253 | `llmCallId = <turn>:llm:<toolInvocationBatches.length+1>`; token-usage idempotency key = `${agentId}:${llmCallId}` | A same-turn recovery call would reuse the id and lose its usage. The turn must own a real LLM-call sequence |
| AF-005 | `agent/loop/agent-turn-runner.ts` l.53-131; `agent/pipelines/agent-input-pipeline.ts` | The turn loop runs LlmPhase, then on tool invocations ToolPhase, then a TOOL-sender continuation (`llmUserMessage` null unless context files exist) | An output-limit recovery is another same-turn continuation: loop again with `llmUserMessage: null` after recording the note |
| AF-006 | `agent/llm-request-assembler.ts` l.42-89 | Pre-request compaction is skipped when `identity.isToolContinuation`; the user message is appended after the recovery checkpoint | The recovery note must be recorded before the next request's checkpoint (it survives a failed retry). The continuation flag must mean "not the first LLM call of the turn" |
| AF-007 | `llm/prompt-renderers/gemini-prompt-renderer.ts` l.46-52 | Mid-conversation SYSTEM messages are dropped by the Gemini renderer (Anthropic renders late SYSTEM as user text) | The recovery note must be a USER-role working-context message to work on every provider |
| AF-008 | `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` l.178-220 | History replay maps `user`, `assistant`, `reasoning`, `system_task_notification`, `provider_compaction_boundary` and tool traces; other trace types are ignored | A dedicated `output_limit_recovery` raw trace keeps the note hidden from replayed history, as Claude Code's meta messages are hidden |
| AF-009 | `memory/memory-manager.ts` l.224-241 | `appendWorkingContextUserMessage` accepts explicit `rawTraceIds` (provenance); no trace-type check | The note's USER message links to its `output_limit_recovery` trace |
| AF-010 | `agent/streaming/handlers/llm-streaming-response-handler.ts` l.88-115, 280-399, 401-440 | `buildInvocation` replaces unparsable/non-object arguments with `{}`; `finalize()` records invocations; `finalizeFailed()` fails text and tool segments | Malformed arguments become a non-executable marker; a new output-limited finalization ends text normally, fails tool segments as discarded and records no invocations |
| AF-011 | `agent/loop/tool-phase.ts` l.60-116 | The tool phase already returns an error `ToolResultEvent` before execution for preprocessing failures and unknown tools | A malformed call is rejected the same way, before preprocessing and approval |
| AF-012 | `agent/status/status-deriver.ts` l.95; `agent/events/agent-events.ts` | `ToolContinuationReadyEvent` drives the same `processing` status as a user message | Rename it to `TurnContinuationReadyEvent` because it now also covers recovery continuations (5 test files and 3 source files reference it; no server references) |
| AF-013 | `llm/api/gemini-llm.ts` l.257-287; `llm/api/openai-responses-llm.ts` l.265-301 | `accumulatedContent`/`accumulatedReasoning` are written but never read | Dead code in touched files: remove |
| AF-014 | `agent/token-budget.ts` l.54-57 | The reservation already equals the new default (configured value, or the model's maximum) | CON-001 holds: the budget does not change |
| AF-015 | `llm/api/autobyteus-llm.ts` l.97-140 | The AutoByteus proxy forwards upstream chunks; upstream finish fields are not part of its current contract | Forward a finish only if upstream provides one (`finish_reason`); otherwise `null`, meaning unreported (recovery cannot trigger) — ASM-003 |

## Requirement Implications

- The root cause is a too-low default output limit (8192) for a 128K-output model, combined with treating a legitimate `max_tokens` stop as a protocol error. Both need fixing: raising the limit fixes the user's case, and classifying the stop gives a clear, recoverable outcome for genuine truncation.
- Existing rollback already preserves history, so "never corrupt provider-native history" is met by not storing truncated output and not executing truncated tools.
- Text-only truncation is a regression since `704e2108e` and should get its partial answer back.

## Notes For Architecture Design

- Keep the assembler strict for real protocol violations: an unstopped block without a terminal `stop_reason`, or a stream that ends without `message_stop`.
- Make sure no `ToolInvocation` is built from a truncated tool call. A failure before `streamingHandler.finalize()` already guarantees this.
- Preserve the error code/message through `AnthropicLLM`'s rewrap so the UI shows the clear message.
- Choose the non-streaming default (bounded) separately from the streaming default (the model's limit).
