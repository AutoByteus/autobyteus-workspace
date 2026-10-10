# Design Spec — anthropic-incomplete-content-block

## Solution And Approval Basis

- Current solution revision ID: `SR-008` (SR-007 passed ARCH-REV-002. SR-008 narrows the AutoByteus proxy adapter to a compile-only edit, by user decision; affects Step 2 only)
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-005 text plus the SR-006 REQ-002 clarification. Approved by the user on 2026-10-10 in the desktop conversation: "follow your design suggestions and use design principles to guide you thanks". This covers DEC-001 = C, DEC-002 = Claude Code style, DEC-003 = refactor all AutoByteus-runtime providers now, and DEC-004 = two delivery steps.
- Behavior-defining supplements and their approval references: None (probe artifacts are evidence only).
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block/tickets/in-progress/anthropic-incomplete-content-block/investigation-notes.md`
- Authorities read (design reading gate; 2026-10-10): `references/architecture-design.md`, `design-principles.md`, repository `DESIGN.md` (and its linked Data Migration Guideline section 2), `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md`, and `TESTING.md` for verification planning. No package-level `DESIGN.md` exists under `autobyteus-ts`. `design-examples.md` was not needed.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

The AutoByteus runtime turn loop (`AgentTurnRunner`) calls `LlmPhase`, which streams through `BaseLLM.streamMessages` into a provider adapter (`llm/api/*-llm.ts`). `LlmPhase` feeds the chunks to `LlmStreamingResponseHandler`, which emits UI segments and, at `finalize()`, builds `ToolInvocation`s. It then ingests the response into memory and returns `final` or `tool_invocations`. On any stream error it rolls the request back to its recovery snapshot (investigation BEH-003/BEH-006, AF-005, AF-006).

Three verified gaps (BEH-001, BEH-008, BEH-009, BEH-010):

1. **Output limit.** `AnthropicLLM` hardcodes `max_tokens = config.maxTokens ?? 8192`. Opus 5.5's limit is 128,000. Other adapters send nothing when unconfigured, so the provider's own default applies.
2. **No finish contract.** No streaming adapter reports how a response ended. Non-streaming paths compute a coarse `completionStatus` that only compaction reads (AF-002, AF-003). `AnthropicLLM` therefore treats a legitimate `max_tokens` stop (no `content_block_stop` for the open block) as a protocol error (probe).
3. **Unsafe tool-call build.** The shared handler executes tool calls whose arguments are cut off or invalid, using `{}` (AF-010).

Constraints to respect:
- Rollback semantics (AF-006).
- Prefix-bound signed thinking: a native turn is stored only when complete.
- CON-001: do not move the compaction trigger (AF-014).
- Compaction report contract (`completion_status`/`completion_reason`) consumed by the server and web (AF-003).
- Gemini drops mid-conversation SYSTEM messages (AF-007).
- History replay ignores unknown trace types (AF-008).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence: Changes span the LLM layer (a shared response contract in `response-types.ts`, `BaseLLM`, and all 7 streaming adapter implementations: Anthropic, OpenAI Responses, OpenAI-compatible (covering DeepSeek, Kimi, Qwen, GLM, MiniMax, Grok, LM Studio), Gemini, Mistral, Ollama, and the AutoByteus proxy). They also span the agent loop (`LlmPhase`, `AgentTurnRunner`, `AgentTurn`, `ToolPhase`, the stream handler, the event rename) and memory (a recovery-note writer). About 20 source files plus tests.
- Architectural risk: `High`
- Risk rationale and supporting evidence: It changes a shared contract that every provider implements (the terminal chunk/finish), agent-loop control flow (a new same-turn continuation kind and LLM-call identity), the tool-execution admission rule, and what is persisted in working-context history (a new hidden note with a new raw-trace type). The blast radius is every AutoByteus-runtime agent.
- Escalation trigger if implementation or validation discovers new impact: A provider rejects the catalog maximum (RSK-004); restore or provenance validation rejects the recovery note; any need to change the compaction report contract or the server/web stream protocol; any need to persist or replay a truncated provider-native turn. Return a `Design Impact` to the Solution Designer.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Live probe | `probes/max-tokens-400.out.json` | `max_tokens` stop leaves the open `tool_use` without `content_block_stop` | D-03 (classify, don't throw) | Refusal shape (ASM-002) |
| Claude Code binary | investigation Source Log (Agent SDK 0.3.280) | Per-model output limits; `max_output_tokens_recovery` with a meta note, 3 attempts; context-window stop surfaces as an error; malformed-call retry text | D-01, D-05, D-06, D-07 | — |
| Code audit | AF-001..AF-015 | Stream boundary, missing finish, call-id collision, renderer SYSTEM drop, replay ignores unknown traces, tool-phase pre-execution failures | D-02..D-09 | ASM-003 (proxy) |
| Rate-limit docs | platform.claude.com/docs/en/api/rate-limits | `max_tokens` has no OTPM cost | D-01 | — |
| SDK guard | `@anthropic-ai/sdk` `calculateNonstreamingTimeout` | Non-streaming above ~21k throws | D-01 exception for Anthropic non-streaming | — |

## Intended Change

Design decisions (referenced as D-xx below):

- **D-01 Real output limit.** One pure resolver gives the request output limit: the configured `maxTokens`, otherwise the model's `maxOutputTokens`, otherwise `null`. `BaseLLM` exposes it; every adapter uses it for both streaming and non-streaming requests. When it returns `null`, the adapter omits the parameter (provider default). Two exceptions:
  - Anthropic requires `max_tokens`. Streaming with a `null` result throws a clear configuration error; this cannot happen for catalog models.
  - Anthropic non-streaming keeps `configured ?? 8192` (REQ-007).
  
  Nothing is written into `config.maxTokens` (CON-001). The adapters' `protected maxTokens` fields (`AnthropicLLM`, `MistralLLM`, `OpenAIResponsesLLM`) are removed in Step 1. They would be parallel to the resolver.
- **D-02 Normalized finish contract.** A provider-neutral `LlmResponseFinish { reason, providerReason }`, with `reason` ∈ `stop | tool_calls | output_limit | content_filter | context_window_exceeded | other`. Every adapter yields exactly one terminal chunk (`is_complete: true`), last, carrying `usage` (nullable) and `finish` (nullable = unreported). Non-streaming `CompleteResponse` carries the same `finish`. `completionStatus`/`completionReason` become read-only projections of `finish` for the compaction report contract (AR-004).

  | `finish` | `completionStatus` |
  | --- | --- |
  | `null` (unreported) | `unknown` |
  | `stop` | `complete` |
  | `tool_calls`, `output_limit`, `content_filter`, `context_window_exceeded` | `incomplete` |
  | `other` (reported but unmapped) | `incomplete` |

  - **Why `other` → `incomplete`:** an unrecognized stop is not evidence of a complete answer, so the compaction guard (`direct-llm-compression-strategy.ts:63`) rejects it and its existing fallback runs (EVD-001). This matches today's treatment of Gemini `OTHER`/`LANGUAGE`. Unlisted reasons that were `unknown` before (rare, provider-specific strings) are now rejected too: a deliberate tightening.
  - Non-streaming refusal content (OpenAI chat `message.refusal`, Responses refusal parts) maps to `content_filter`. Function-call output maps to `tool_calls`. This preserves today's "non-text output → incomplete".
  - **`completionReason`** = `finish.providerReason`: the provider's raw stop string (Anthropic `stop_reason`; OpenAI-compatible `finish_reason`; Gemini `finishReason`; Mistral `finishReason`; Ollama `done_reason`).
  - For OpenAI Responses, `providerReason` is `response.status` when the status is `completed`, and `incomplete_details.reason` when incomplete (e.g. `max_output_tokens`). The visible `completion_reason` in the compaction report changes from `incomplete` to the specific reason. This is accepted as more informative; it is a string field with no consumer logic in the server or web.
- **D-03 Anthropic stream end (AR-003).**
  - At `message_delta`: record `stop_reason` and usage only; yield nothing terminal.
  - At `message_stop`:
    1. map the recorded stop reason to the finish;
    2. when the finish is `stop` or `tool_calls`, complete the native turn (the assembler stays strict and unchanged) and yield the native-turn chunk if it has `tool_use`;
    3. then yield the **single terminal chunk** (`is_complete: true`, usage, finish) as the last chunk.
  - For terminal stops (`max_tokens`, `refusal`, `model_context_window_exceeded`, `pause_turn`), build no native turn.
  - These remain protocol errors and throw (REQ-006): an unstopped block under `stop`/`tool_calls`, and a stream that ends without `message_stop`. The latter yields no terminal chunk.
- **D-04 LlmPhase classification (AR-001).** On the terminal finish:
  - `output_limit` — settle as output-limited:
    1. commit the request input (`releaseRequest()`, no rollback);
    2. if the partial **text** is non-empty, ingest exactly one plain ASSISTANT message with `content = text` and **no reasoning** (`CompleteResponse({ content: text, reasoning: null, providerNativeAssistantTurn: null })`). With empty text, ingest nothing, so the working context never gets an empty or reasoning-only assistant message;
    3. **discard partial reasoning**: it is not added to the working context and no reasoning raw trace is written. The live UI already showed it as a reasoning segment, which ends normally. After a history reload it does not reappear (accepted, Key Tradeoffs);
    4. discard all tool calls and finalize their segments as failed "discarded" (`finalizeOutputLimited`);
    5. emit the usage notification as usual;
    6. run the compaction **threshold evaluation** as for `tool_invocations`, but **never** the `after_final_response` compaction execution, because the turn is not final;
    7. return `output_limited`.
  - `content_filter` or `context_window_exceeded`: the existing provider-failure path (rollback, error notification) with a clear message naming the reason; no tool runs.
  - Anything else: unchanged.
- **D-05 Recovery policy (Claude Code style) and runner contract (AR-006).** `AgentTurnRunner` owns a bounded loop with a local `consecutiveOutputLimitStops` counter. The counter resets after any other LLM outcome. On `output_limited`:
  - **Below the limit (counter ≤ 3 after increment):**
    1. call `MemoryManager.appendOutputLimitRecoveryNote({ turnId, content })`;
    2. call `turn.beginContinuation()` (D-08);
    3. set `nextInput = { llmUserMessage: null, turnId, sourceEvent: nextInput.sourceEvent }`. This is built by the runner itself and bypasses the input pipeline: no input processors, no user-message notification. The previous `sourceEvent` is carried only to satisfy the type and is **not** re-applied as a status event;
    4. `continue`. The loop's `buildLlmPhaseReadyEvent` then applies `TurnContinuationReadyEvent`.
  - **Exhaustion (4th consecutive):** reuse the existing `final`/`isError` sequence exactly:
    1. `notifyAgentErrorOutputGeneration({ code: 'LLM_OUTPUT_LIMIT_EXHAUSTED', message, classification: { scope: 'turn', effect: 'diagnostic', turnId } })`;
    2. `applyStatusEvent(new LLMCompleteResponseReceivedEvent(errorResponse, true, turnId))`;
    3. `llmResponsePipeline.processFinalResponse(errorResponse, …, { isError: true, turnId })`;
    4. `notifyAgentTurnCompleted(turnId)`;
    5. return `{ kind: 'completed' }`.
    
    `errorResponse = new CompleteResponse({ content: buildOutputLimitExhaustedMessage(limit) })`. The error text is not ingested into memory. History ends with the last kept text (if any), which is valid for the next user message.
  - **Note texts** come from one policy file and have three variants:
    - tool call cut: "System note: your previous response hit the output limit of N tokens while generating a `write_file` tool call; the call was discarded and not executed. Break the work into smaller pieces (for example, write a large file in several smaller parts) and continue. Do not apologize or recap."
    - text cut with kept text: "System note: output token limit hit. Resume directly from where your previous message stopped — no apology, no recap. Break remaining work into smaller pieces."
    - nothing kept (reasoning only): "System note: your previous response hit the output limit of N tokens before producing any visible output, so nothing was kept. Answer again from the start, breaking the work into smaller pieces."
- **D-06 Hidden note persistence.** A USER-role working-context message (it works on every renderer, AF-007), linked to a raw trace of the new type `output_limit_recovery`, which history replay ignores (AF-008). It is recorded before the next request's recovery checkpoint, so a failed retry keeps it.
- **D-07 Malformed tool calls.** The stream handler never invents `{}`. Invalid or non-object arguments produce a `ToolInvocation` marked with `argumentsParseError` (arguments `{}` as the history placeholder). `ToolPhase` rejects such an invocation first (before preprocessing and approval) with the error result: "Your tool call was malformed and could not be parsed (<parse error>). Please retry." The turn then continues through the normal tool-result continuation.
- **D-08 Turn-owned LLM call identity and continuation rule (AR-002).**
  - `AgentTurn` owns two things.
    - **The call sequence:** `nextLlmCallSequence()` is allocated by `LlmPhase` once per LLM request attempt, before `prepareRequest`. This gives a unique `llmCallId`/`requestId` for the recovery snapshot and the token-usage idempotency key. A `compaction_blocked` attempt consumes a number, so `call_sequence` may have gaps. It is recorded metadata only (no ordering consumer was found in the server or web).
    - **The continuation flag:** `beginContinuation()` / `isContinuation` is set by `AgentTurnRunner` only when it actually starts a same-turn continuation: after tool results are ingested (where the tool continuation is built today) or after a recovery note is recorded.
  - `LLMRequestAssembler` receives `isTurnContinuation = turn.isContinuation` (renamed from `isToolContinuation`). This keeps pre-request compaction off for tool and recovery continuations.
  - A `compaction_blocked` first call followed by the user's authorized compaction retry is **not** a continuation, so the authorized compaction still runs, exactly as today.
- **D-09 Event rename.** `ToolContinuationReadyEvent` becomes `TurnContinuationReadyEvent`, because it now covers tool and recovery continuations (AF-012).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-012; AC-001, AC-002, AC-009, AC-013 | Agent request without configured limit | 8192 hardcoded (Anthropic) | Model's real maximum | DS-002 |
| BEH-002 | System | REQ-002, REQ-003, REQ-005; AC-003, AC-004, AC-006 | Provider stops at the output limit mid tool call | Opaque error, rollback | Discard, hidden note, auto-continue ≤3, then a clear error | DS-001 → DS-003 |
| BEH-003 | System | REQ-004, REQ-005; AC-005, AC-006 | Output limit inside text | Opaque error (Anthropic); silent truncation (others) | Keep the text, resume note, auto-continue ≤3 | DS-001 → DS-003 |
| BEH-004 | System | REQ-001, REQ-012 | Configured `max_tokens` | Sent unchanged | Preserved | DS-002 |
| BEH-005 | Contract | REQ-006; AC-007 | Protocol violation | Fail and roll back | Preserved | DS-006 |
| BEH-006 | System | REQ-003, REQ-005, REQ-008; AC-006, AC-009 | Failure or recovery | Rollback keeps history | Preserved; truncated output never stored as a native turn | DS-001, DS-003 |
| BEH-007 | System | REQ-007; AC-008 | Anthropic non-streaming | 8192 | Preserved (bounded) | DS-002 |
| BEH-008 | Contract | REQ-009, REQ-010; AC-010, AC-011 | Each provider's stream end | Not reported | Normalized finish on the terminal chunk | DS-001, DS-005 |
| BEH-009 | System | REQ-011; AC-012 | Invalid tool-call arguments | Executed with `{}` | Not executed; error result asks for a retry | DS-004 |
| BEH-010 | System | REQ-012; AC-013 | Unconfigured non-Anthropic request | Provider default | Model's real maximum when known | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/max-tokens-tool-use-probe.cjs`, `probes/max-tokens-400.out.json` | Live reproduction | REQ-002, AC-003 | Event shape for the Anthropic fixtures | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` that exposes a `Larger Requirement` (approved refactor).
- Current design issue found: `Yes`
- Structural triggers that fire, each with evidence:
  - **Repeated coordination trigger:** truncation handling is absent from every adapter, and the only completion classification is duplicated per adapter in non-streaming paths only (AF-002, AF-003). Fix: one finish contract; the policy lives in the agent loop.
  - **Authoritative-boundary trigger:** the agent loop would need provider-specific knowledge (e.g., Anthropic `stop_reason`) to decide recovery. Fix: adapters translate at their boundary; `LlmPhase` reads only the neutral finish.
  - **Shared-structure tightness trigger:** `CompleteResponse.completionStatus` is a lossy projection (tool calls and truncation both map to "incomplete"). Fix: store `finish` once, and derive the status.
  - **Missing invariant:** "never execute a tool call without valid arguments" is not enforced (AF-010).
  - **Naming drift:** `ToolContinuationReadyEvent` would cover non-tool continuations (AF-012).
  - Ruled out — **Responsibility overload:** `LlmPhase` (386 lines) grows by one branch; the recovery policy and note texts go in their own file so it does not absorb policy.
- Root cause classification: `Missing Invariant` (provider-neutral end-of-response contract and tool-argument validity) together with `Duplicated Policy Or Coordination`.
- Refactor needed now: `Yes`
- Evidence: investigation Source Log, AF-001..AF-015, probe.
- Design response: D-01..D-09.
- Refactor rationale: Without a shared finish contract each provider would need its own recovery. Without the invariant, any provider can run a broken tool call.
- Intentional deferrals and residual risk:
  - The AutoByteus proxy cannot report a finish until upstream does (ASM-003).
  - Gemini `MALFORMED_FUNCTION_CALL` (no call emitted) maps to `other`, with no retry nudge.
  - `eager_input_streaming` (progress for large tool inputs) is a follow-up.

## Terminology

- **Finish**: `LlmResponseFinish`, the provider-neutral record of how one response ended.
- **Output-limited response**: a response whose finish reason is `output_limit`.
- **Recovery note**: the hidden USER-role instruction recorded after an output-limited response.
- **Turn continuation**: any LLM call in a turn after its first one (tool-result or recovery continuation).

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- In scope: `completion-status.ts` (both helpers), the `{}` argument fallback, stored `completionStatus`/`completionReason` fields (replaced by `finish` plus derived projections), the `toolInvocationBatches.length + 1` call-id derivation, the `ToolContinuationReadyEvent` name, the hardcoded Anthropic streaming 8192 default, and dead accumulators (see the Removal Plan).

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: The agent working-context snapshot (`working_context_snapshot.json`) and raw traces (`raw_traces_active.jsonl`) per agent run. New entries only: a USER message and one `output_limit_recovery` raw trace per recovery.
- Relevant change: A new raw-trace type value. No change to existing fields or shapes.
- Normal reader/writer behavior and representative evidence: Raw-trace readers accept any `trace_type` string; history replay ignores unknown types (AF-008); the working-context snapshot stores ordinary USER messages with `rawTraceIds` provenance (AF-009).
- Required semantics and invariants under direct use: Existing histories (including the user's stuck run, whose snapshot ends with a valid tool call and result) are read unchanged.
- Decision: `Not Affected` for existing data. New data is additive and readable by current readers.
- Data Migration Guideline section 2 answers:
  1. No migration is needed; tolerant readers absorb the change.
  2. Availability is unaffected.
  3. Inspected: the user's snapshot and raw traces.
  4. Nothing is converted.
  5. The existing atomic snapshot writer suffices.
  6. No legacy interpretation exists.
  7. One trace and one message per recovery.
  8. No cross-package typed references; the server replay ignores the type.
  9. Tests: AC-005, AC-006, plus a replay-ignores test.
  10. Independent review by the architecture reviewer.
- Acceptance criteria supported: AC-006, AC-009.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002, BEH-003, BEH-008 | User/agent message starts a turn | Turn completes, continues, or ends with an error | `AgentTurnRunner` | Where the finish decides the outcome |
| DS-002 | Primary End-to-End | BEH-001, BEH-004, BEH-007, BEH-010 | Adapter builds a request | Provider receives the output-limit parameter | Provider adapter via `BaseLLM` | Real output limit (Step 1) |
| DS-003 | Bounded Local | BEH-002, BEH-003, BEH-006 | `output_limited` outcome | Next LLM call or final error | `AgentTurnRunner` | Bounded recovery loop |
| DS-004 | Primary End-to-End | BEH-009 | Tool-call deltas complete | Error tool result in history, turn continues | `LlmStreamingResponseHandler` → `ToolPhase` | Malformed calls never run |
| DS-005 | Return-Event | BEH-008 | Provider terminal event | Terminal `ChunkResponse` with `finish` | Each adapter, at the `BaseLLM` boundary | The contract every provider implements |
| DS-006 | Bounded Local | BEH-005, BEH-002 | Anthropic stream events | Finish plus optional native turn | `AnthropicLLM` | Truncation vs protocol violation |

## Primary Execution Spine(s)

- DS-001: `User/Agent message -> AgentTurnRunner -> LlmPhase -> BaseLLM.streamMessages -> Provider adapter -> Provider stream -> terminal ChunkResponse(finish) -> LlmPhase outcome -> AgentTurnRunner (ToolPhase | recovery | final)`
- DS-002: `LlmPhase -> BaseLLM.streamMessages -> Adapter request build -> BaseLLM.resolveMaxOutputTokens -> resolveRequestMaxOutputTokens(model, config) -> provider parameter (max_tokens / max_output_tokens / maxOutputTokens / num_predict)`
- DS-004: `Provider tool-call deltas -> LlmStreamingResponseHandler.finalize -> ToolInvocation(argumentsParseError) -> AgentTurnRunner -> ToolPhase (reject) -> ToolResultEvent(error) -> MemoryManager -> continuation LLM call`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The turn runner runs an LLM phase. The adapter streams chunks; the last one carries the normalized finish. `LlmPhase` turns the finish into an outcome: `final`, `tool_invocations` or `output_limited` (content filter and context-window stops go down the existing failure path). The runner executes tools, recovers, or completes | Turn, LLM call, Response finish | `AgentTurnRunner` | Finish mapping (adapters), note texts (policy file) |
| DS-002 | Every adapter asks `BaseLLM` for the request's output limit; the resolver returns the configured value, else the model's maximum, else null (omit) | Model, Config, Request | Adapter | Resolver |
| DS-003 | After an output-limited response, the runner checks its consecutive counter. Below 3, it records a hidden note and runs another LLM call in the same turn. At the limit, it ends the turn with a clear error | Recovery attempt, Note | `AgentTurnRunner` | `MemoryManager.appendOutputLimitRecoveryNote`, policy file |
| DS-004 | The handler marks unparsable arguments instead of inventing `{}`. The tool phase rejects the marked invocation before preprocessing and approval with a retry message. The normal tool-result continuation follows | Tool call, Tool result | `ToolPhase` | — |
| DS-005 | Each adapter translates its provider's end signal (`stop_reason`, `finish_reason`, `response.incomplete`, `finishReason`, `done_reason`) through its own mapping table into `LlmResponseFinish`, emitted once on the last chunk | Finish | Adapter | — |
| DS-006 | The Anthropic adapter records `stop_reason` and usage at `message_delta`. At `message_stop` it maps the finish, completes the native turn only for `stop`/`tool_calls` and yields it, then yields the single terminal chunk last. An unstopped block under `stop`/`tool_calls`, or a missing `message_stop`, throws | Native turn | `AnthropicLLM` | `AnthropicAssistantTurnAssembler` (unchanged) |

## Spine Actors / Main-Line Nodes

`AgentTurnRunner`, `LlmPhase`, `BaseLLM`, provider adapters, `LlmStreamingResponseHandler`, `ToolPhase`, `MemoryManager`, `AgentTurn`.

## Ownership Map

- `AgentTurnRunner`: turn sequencing and the recovery loop (counter, limit, note recording, exhaustion error).
- `LlmPhase`: one LLM call — request assembly, stream consumption, finish classification, memory settlement per outcome (commit vs rollback), segment finalization mode.
- `AgentTurn`: turn state, now including the LLM call sequence.
- `BaseLLM`: the stream boundary and its contract (single terminal chunk with finish; finish passed to after-hooks); exposes `resolveMaxOutputTokens()`.
- Provider adapters: translation of provider requests and end signals, including their finish mapping table and parameter naming.
- `LlmStreamingResponseHandler`: tool-call assembly from deltas (validity marking) and segment lifecycle (normal, failed, output-limited).
- `ToolPhase`: admission of invocations to execution (rejects malformed ones).
- `MemoryManager`: persistence of the recovery note (raw trace plus working-context message).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `BaseLLM.resolveMaxOutputTokens()` | `resolveRequestMaxOutputTokens` (pure function) | Gives adapters one call with their own model/config | Provider-specific parameter naming or exceptions |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api/completion-status.ts` (`completionFromReason`, `responsesCompletion`, `CompletionMetadata`) | The coarse status is replaced by the finish | Per-adapter finish mapping plus `llm-response-finish.ts` | In This Change | Update all adapter call sites |
| Stored `CompleteResponse.completionStatus/completionReason` fields and constructor params | Parallel representation of `finish` | `finish`, plus read-only `completionStatus`/`completionReason` getters | In This Change | Getters serve the compaction report contract |
| `buildInvocation` `{}` fallback for unparsable/non-object arguments | Violates the new invariant | `argumentsParseError` marker | In This Change | |
| `llmCallSequence = toolInvocationBatches.length + 1` | Not unique once recovery calls exist | `AgentTurn.nextLlmCallSequence()` | In This Change | |
| `ToolContinuationReadyEvent` name | Misnamed | `TurnContinuationReadyEvent` | In This Change | 5 source files (including local naming in `agent-input-pipeline.ts`) and 7 test files; no server/web references |
| `AnthropicLLM` streaming `config.maxTokens ?? 8192` | Wrong default | Resolver | In This Change (Step 1) | Non-streaming keeps 8192 explicitly |
| `protected maxTokens` fields in `AnthropicLLM`, `MistralLLM`, `OpenAIResponsesLLM` | Parallel to the resolver | `BaseLLM.resolveMaxOutputTokens()` | In This Change (Step 1) | Review residual note |
| `sawToolUse`/`completedNativeTurn` pair in `AnthropicLLM` | Replaced by the `message_stop` received check plus finish-gated assembly | D-03 | In This Change | The no-`message_stop` failure is kept |
| Gemini streaming `accumulatedContent`/`accumulatedReasoning` | Dead: written but never read (AF-013) | — | In This Change | |
| OpenAI Responses streaming `accumulatedContent`/`accumulatedReasoning` | Dead: written but never read (AF-013) | — | In This Change | Confirm no read with tsc/grep |
| Gemini multiple `is_complete` chunks per stream | Violates the single-terminal contract | One terminal chunk at stream end | In This Change | |

## Return Or Event Spine(s) (If Applicable)

DS-005: `provider end event -> adapter mapping table -> terminal ChunkResponse{is_complete, usage, finish} -> BaseLLM.streamMessages (records finish for after-hooks) -> LlmPhase`.

UI segment events: for an output-limited response, text and reasoning segments end normally; tool segments end with `failed: true` and the error "Discarded: the output limit was reached before this tool call was complete." The recovery note emits no UI event. Exhaustion emits the existing turn error notification.

## Bounded Local / Internal Spines (If Applicable)

- DS-003, parent `AgentTurnRunner`: `LlmPhase outcome -> (output_limited) -> ++consecutive <= MAX_OUTPUT_LIMIT_RECOVERIES ? appendOutputLimitRecoveryNote -> turn.beginContinuation() -> nextInput{llmUserMessage:null, turnId, sourceEvent(carried, not re-applied)} -> TurnContinuationReadyEvent -> LlmPhase : exhaustion sequence (D-05) -> (other outcome) reset counter`. It matters because it bounds cost and is the only place retries happen.
- DS-006, parent `AnthropicLLM`: `message_start -> blocks -> message_delta (record stop_reason, usage) -> message_stop -> finish = map(stop_reason) -> [stop|tool_calls] assembler.complete() -> native-turn chunk -> terminal chunk {is_complete, usage, finish} (last)`. No `message_stop` → throw, with no terminal chunk. It matters because it separates truncation from protocol violation and keeps the single-terminal-chunk contract.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `resolveRequestMaxOutputTokens` | DS-002 | Adapters via `BaseLLM` | One rule: configured, else model maximum, else null | Avoid per-adapter drift | Duplicated defaults per adapter |
| Finish mapping tables (one per adapter) | DS-005 | Each adapter | Raw provider reason to normalized reason | Provider knowledge stays in its adapter | Provider knowledge leaking into the agent loop |
| `output-limit-recovery.ts` policy | DS-003 | `AgentTurnRunner` | `MAX_OUTPUT_LIMIT_RECOVERIES = 3`, note builders, exhaustion message | Keeps policy text out of the phase and runner | `LlmPhase` bloat |
| `MemoryManager.appendOutputLimitRecoveryNote` | DS-003 | `AgentTurnRunner` | Raw trace plus USER message with provenance | The memory owner persists | Runner writing memory internals |

## Ownership Boundaries

- Adapters are the only place that knows provider stop vocabularies; above `BaseLLM`, only `LlmResponseFinish` exists.
- `LlmPhase` decides the per-call settlement (commit vs rollback) but never retries. `AgentTurnRunner` decides retries but never touches stream or memory internals beyond `MemoryManager`'s public method.
- `ToolPhase` is the only execution admission point. The handler marks invalid invocations but does not decide their result.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `BaseLLM.streamMessages` | Adapter `_streamMessagesToLLM`, finish mapping | `LlmPhase`, compaction, others | Reading provider-specific fields from chunks | Extend `ChunkResponse.finish` |
| `MemoryManager` | Raw-trace store, working-context provenance | `AgentTurnRunner`, `LlmPhase` | The runner appending raw traces or messages directly | Add a named method (`appendOutputLimitRecoveryNote`) |
| `ToolPhase.run` | Preprocessing, approval, execution | `AgentTurnRunner` | Executing invocations elsewhere | — |
| `AgentTurn` | LLM call sequence | `LlmPhase` | Recomputing the sequence from batches | — |

## Dependency Rules

- `agent/*` may depend on `llm/utils/llm-response-finish.ts`; never on `llm/api/*` adapters or provider vocabularies.
- Adapters depend on `llm/utils/llm-response-finish.ts` and `BaseLLM`; never on `agent/*`.
- `AgentTurnRunner` depends on `output-limit-recovery.ts` and `MemoryManager`; `LlmPhase` uses `output-limit-recovery.ts` only for the discarded-segment error text (or receives it from there).
- `token-budget.ts` is unchanged (CON-001). It may use the resolver only if its semantics stay identical; the default is to leave it untouched.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `resolveRequestMaxOutputTokens(model, config): number \| null` | Output limit | Configured, else model maximum, else null | `LLMModel`, `LLMConfig` | New file `llm/utils/max-output-tokens.ts` |
| `BaseLLM.resolveMaxOutputTokens(): number \| null` | Same | Thin delegate | — | protected |
| `ChunkResponse.finish: LlmResponseFinish \| null` | Response end | Set only on the terminal chunk | — | |
| `CompleteResponse.finish: LlmResponseFinish \| null` | Response end | Non-streaming and assembled responses | — | `completionStatus`/`completionReason` getters derived |
| `LlmPhaseOutcome` `{ kind: 'output_limited'; response; truncatedToolNames: string[]; outputTokenLimit: number \| null }` | Call outcome | Tells the runner what was cut | — | `truncatedToolNames` empty means text cut |
| `MemoryManager.appendOutputLimitRecoveryNote({ turnId, content })` | Recovery note | Raw trace `output_limit_recovery` plus USER message linked by `rawTraceIds` | turnId | |
| `AgentTurn.nextLlmCallSequence(): number` | LLM call identity | Monotonic per request attempt (allocated by `LlmPhase` before assembly) | — | Gaps after `compaction_blocked` are fine |
| `AgentTurn.beginContinuation()` / `isContinuation` | Continuation state | Set by the runner when it starts a tool or recovery continuation; read for `isTurnContinuation` | — | Not set by a `compaction_blocked` retry |
| `ToolInvocation.argumentsParseError: string \| null` | Invocation validity | Why the arguments are unusable | — | Constructor option |
| `LlmStreamingResponseHandler.finalizeOutputLimited(reason)` | Segment lifecycle | Text ends normally, tool segments fail, no invocations | — | |
| `TurnContinuationReadyEvent(turnId)` | Status event | Renamed | turnId | |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| resolver | Yes | Yes | Low | — |
| `finish` | Yes | Yes | Low | `null` = unreported; `other` = reported but unmapped |
| `output_limited` outcome | Yes | Yes | Low | — |
| `appendOutputLimitRecoveryNote` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Finish | `LlmResponseFinish`, `LlmFinishReason` | Yes | Low | — |
| Continuation event | `ToolContinuationReadyEvent` → `TurnContinuationReadyEvent` | Yes | Was High | Rename |
| Request flag | `isToolContinuation` → `isTurnContinuation` | Yes | Was Medium | Rename |
| Policy file | `output-limit-recovery.ts` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Model output limit | `LLMModel.maxOutputTokens` (catalog/live metadata) | Reuse | Already authoritative | — |
| Completion classification | `completion-status.ts` | Replace | Lossy and non-streaming only | — |
| Same-turn continuation | Turn loop with `llmUserMessage: null` | Reuse | Same mechanism as tool continuation | — |
| Hidden instruction persistence | Operation-boundary note precedent | Extend (pattern) | Same idea, but USER role (Gemini) and its own trace type | — |
| Pre-execution tool failure | `ToolPhase` error `ToolResultEvent` | Reuse | Same as unknown tool | — |
| Segment failure | `finalizeFailed` | Extend | A new mode keeps text | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` | Finish contract, resolver, adapters | DS-002, DS-005, DS-006 | Adapters, `BaseLLM` | Extend | |
| `autobyteus-ts/src/agent/loop` | Classification, recovery loop, policy | DS-001, DS-003, DS-004 | `AgentTurnRunner`, `LlmPhase`, `ToolPhase` | Extend | |
| `autobyteus-ts/src/agent/streaming/handlers` | Tool-call validity, segment modes | DS-004 | Handler | Extend | |
| `autobyteus-ts/src/memory` | Note persistence | DS-003 | `MemoryManager` | Extend | |
| `autobyteus-server-ts`, `autobyteus-web` | — | — | — | Unchanged | Replay ignores the new trace type; the compaction report contract is unchanged |

## Draft File Responsibility Mapping

See the Final File Responsibility Mapping; no draft-to-final changes were needed beyond moving note texts out of `LlmPhase` into the policy file.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| End-of-response classification (7 adapters) | `llm/utils/llm-response-finish.ts` (type plus `buildFinish(reason, raw)`) | llm | One contract | Yes | Yes (status derived) | A home for provider tables |
| Output-limit default (7 adapters) | `llm/utils/max-output-tokens.ts` | llm | One rule | Yes | Yes | Provider parameter naming |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `LlmResponseFinish` | Yes | Yes | Low | `null` vs `other` meanings documented |
| `CompleteResponse` | Yes | Yes | Medium (getters) | Getters are pure projections, not stored |
| `ChunkResponse.finish` | Yes | Yes | Low | Terminal chunk only |
| `ToolInvocation.argumentsParseError` | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/llm/utils/llm-response-finish.ts` (Add) | llm | Contract | `LlmFinishReason`, `LlmResponseFinish`, `buildFinish` | One contract | — |
| `src/llm/utils/max-output-tokens.ts` (Add) | llm | Contract | `resolveRequestMaxOutputTokens` | One rule | — |
| `src/llm/utils/response-types.ts` (Modify) | llm | Contract | `finish` on both types; derived status getters | Existing home | finish |
| `src/llm/base.ts` (Modify) | llm | `BaseLLM` | `resolveMaxOutputTokens()`; after-hook response gets finish | Existing boundary | both |
| `src/llm/api/completion-status.ts` (Remove) | llm | — | — | — | — |
| `src/llm/api/anthropic-llm.ts` (Modify) | llm | Adapter | D-01, D-03; finish table; non-streaming finish | Adapter | both |
| `src/llm/api/openai-responses-llm.ts` (Modify) | llm | Adapter | `max_output_tokens` via resolver; `response.incomplete` → finish (`max_output_tokens`→output_limit, `content_filter`→content_filter); `response.failed` → throw; `response.completed` → stop/tool_calls; single terminal chunk; remove dead accumulators | Adapter | both |
| `src/llm/api/openai-compatible-llm.ts` + `openai-compatible-request-builder.ts` (Modify) | llm | Adapter | Builder takes the resolved limit (`max_completion_tokens` as today); stream records `finish_reason` (`stop`, `tool_calls`/`function_call`, `length`→output_limit, `content_filter`) and yields one terminal chunk at stream end with usage (if any) and finish; non-streaming finish | Adapter | both |
| `src/llm/api/grok-llm.ts`, `deepseek-llm.ts`, `kimi-llm.ts`, `qwen-llm.ts`, `glm-llm.ts`, `minimax-llm.ts`, `lmstudio-llm.ts` | llm | Subclasses | Inherit; verify no overrides of max-token params (Grok copies config, so check that path) | — | — |
| `src/llm/api/gemini-llm.ts` (Modify) | llm | Adapter | `maxOutputTokens` via resolver; `finishReason` (`STOP`→stop or tool_calls when calls were emitted, `MAX_TOKENS`→output_limit, safety/recitation/blocklist/prohibited/SPII/image-*→content_filter, others→other); single terminal chunk; remove dead accumulators | Adapter | both |
| `src/llm/api/mistral-llm.ts` (Modify) | llm | Adapter | `maxTokens` via resolver; `finishReason` (`length`→output_limit, `model_length`→context_window_exceeded, `tool_calls`, `stop`, `error`→throw) | Adapter | both |
| `src/llm/api/ollama-llm.ts` (Modify) | llm | Adapter | `num_predict` via resolver; `done_reason` (`stop`, `length`→output_limit) | Adapter | both |
| `src/llm/api/autobyteus-llm.ts` (Modify, compile-only) | llm | Adapter | Only what the new `CompleteResponse` constructor requires (replace `completionStatus`/`completionReason` arguments; finish stays `null`). No finish mapping and no terminal-chunk work. The whole remote AutoByteus provider is being removed in a separate follow-up ticket (user, 2026-10-10: the remote server no longer exists) | Adapter | finish |
| `src/agent/loop/output-limit-recovery.ts` (Add) | agent/loop | Policy | `MAX_OUTPUT_LIMIT_RECOVERIES`, `buildOutputLimitRecoveryNote({toolNames, limit})`, `buildOutputLimitExhaustedMessage(limit)`, discarded-segment text | Policy texts | — |
| `src/agent/loop/llm-phase.ts` (Modify) | agent/loop | `LlmPhase` | Read the terminal finish; D-04 branches; `output_limited` outcome; uses `turn.nextLlmCallSequence()` and `isTurnContinuation` | Owner | finish |
| `src/agent/loop/agent-turn-runner.ts` (Modify) | agent/loop | Runner | DS-003 loop; `TurnContinuationReadyEvent` | Owner | — |
| `src/agent/agent-turn.ts` (Modify) | agent | Turn | `nextLlmCallSequence()` | State owner | — |
| `src/agent/llm-request-assembler.ts` (Modify) | agent | Assembler | `isToolContinuation` → `isTurnContinuation` | — | — |
| `src/agent/events/agent-events.ts`, `src/agent/status/status-deriver.ts` (Modify) | agent | Events | Rename | — | — |
| `src/agent/streaming/handlers/llm-streaming-response-handler.ts` (Modify) | agent/streaming | Handler | `argumentsParseError` marking; `finalizeOutputLimited` | Owner | — |
| `src/agent/tool-invocation.ts` (Modify) | agent | Value | `argumentsParseError` | — | — |
| `src/agent/loop/tool-phase.ts` (Modify) | agent/loop | `ToolPhase` | Reject a malformed invocation first, with the CC retry text | Owner | — |
| `src/memory/output-limit-recovery-trace.ts` (Add) | memory | — | `OUTPUT_LIMIT_RECOVERY_TRACE_TYPE` | Mirrors `operation-boundary-trace.ts` | — |
| `src/memory/memory-manager.ts` (Modify) | memory | `MemoryManager` | `appendOutputLimitRecoveryNote` | Owner | — |
| `src/memory/compaction/direct-llm-compression-strategy.ts` | memory | — | Unchanged (reads the derived getters) | — | — |

## Applied Patterns (If Any)

- Adapter (per-provider finish tables).
- Bounded retry loop inside the turn runner, with a small policy module.

## Target Subsystem / Folder / File Mapping

As in the Final File Responsibility Mapping; all paths are under `autobyteus-ts/src`. No new folders. The existing `llm/utils`, `llm/api`, `agent/loop` and `memory` placement already matches ownership.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `llm/utils` | Off-spine contract | Yes | Low | Provider-neutral types only |
| `llm/api` | Persistence-Provider (adapters) | Yes | Low | Provider tables stay inside adapter files |
| `agent/loop` | Main-line control | Yes | Low | Policy file sits beside its owner |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Finish contract | `yield new ChunkResponse({ content: '', is_complete: true, usage, finish: buildFinish('output_limit', 'max_tokens') })` as the last chunk | `LlmPhase` checking `event.delta.stop_reason === 'max_tokens'` | Keeps provider vocabulary at the adapter |
| Output-limited settlement | `releaseRequest(); if (text) memory.ingestAssistantResponse(new CompleteResponse({ content: text, reasoning: null })); handler.finalizeOutputLimited(DISCARDED_TEXT); notifyUsage(); evaluateCompactionThreshold(); return { kind: 'output_limited', ... }` (no `after_final_response` execution; partial reasoning is dropped) | Restoring the snapshot (drops the user's message and the kept text), or storing the native turn with a cut `tool_use` | History stays valid and append-only |
| Recovery note | USER message "System note: …" plus an `output_limit_recovery` trace | SYSTEM message (Gemini drops it); a `user` trace (shows as a chat bubble on reload) | AF-007, AF-008 |
| Malformed call | `new ToolInvocation(name, {}, id, turnId, ctx, { argumentsParseError: 'Unexpected end of JSON input' })` → `ToolPhase` error result | `JSON.parse` failure → `{}` → executed | REQ-011 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `completionFromReason` alongside `finish` | Fewer edits | Rejected | Remove the file; per-adapter tables |
| Keep stored `completionStatus` fields plus a new `finish` | Avoids touching the compaction readers | Rejected | Store `finish` only; status/reason are derived getters (the compaction report contract is unchanged) |
| Keep the `{}` fallback behind a flag | Caution | Rejected | Marker plus rejection |
| Keep the old event name as an alias | Test churn | Rejected | Rename everywhere |

## Derived Layering (If Useful)

N/A — the spines and ownership are sufficient.

## Change / Refactor Sequence

**Step 1 (Delivery Slice 1: unblocks the stuck run; REQ-001, REQ-007, REQ-012; AC-001, AC-008, AC-009, AC-013)**

1. Add `max-output-tokens.ts` and `BaseLLM.resolveMaxOutputTokens()`. Remove the adapters' `protected maxTokens` fields.
2. Use them in every adapter's request build: Anthropic streaming (throw if null), Anthropic non-streaming stays `configured ?? 8192`, OpenAI Responses, the OpenAI-compatible builder (including Grok's config copy path), Gemini, Mistral and Ollama. The AutoByteus proxy is unchanged (the remote server decides).
3. Add request-parameter unit tests per adapter.
4. This slice goes through review, validation and delivery and can be released on its own. The user verifies AC-009 on the stuck run after release. Until Step 2 lands, a response that exceeds even the real limit still fails as it does today (accepted, DEC-004).

**Step 2 (Delivery Slice 2: the refactor; REQ-002..REQ-006, REQ-009..REQ-011; AC-002..AC-007, AC-010..AC-012)**

1. Add `llm-response-finish.ts`; add `finish` to `ChunkResponse` and `CompleteResponse` (derived getters); remove `completion-status.ts`; `BaseLLM` passes the finish to after-hooks.
2. Adapters: finish tables and the single terminal chunk (DS-005); Anthropic D-03; remove dead accumulators.
3. Handler: the `argumentsParseError` marker and `finalizeOutputLimited`. `ToolInvocation` field. `ToolPhase` rejection (DS-004).
4. `AgentTurn.nextLlmCallSequence()` (per attempt) and `beginContinuation()`/`isContinuation` (D-08); the `isTurnContinuation` rename; the event rename.
5. Policy file; `MemoryManager.appendOutputLimitRecoveryNote` plus the trace constant.
6. `LlmPhase` classification and `output_limited` settlement; `AgentTurnRunner` recovery loop.
7. Tests (see Guidance). Remove everything listed in the Removal Plan.

## Key Tradeoffs

- **Regenerate vs resume a cut tool call:** we regenerate (the cut call is discarded) because a partial `tool_use` and prefix-bound thinking cannot be stored or replayed. Text is kept and resumed as in Claude Code.
- **Commit input on output-limited:** the user's message and kept text are committed rather than rolled back. History stays append-only, and the note follows them.
- **Derived getters for `completionStatus`/`completionReason`:** these keep the compaction report contract (server/web) and the compaction code (owned by another in-flight ticket) unchanged, with no stored duplicate.
- **Explicit catalog maximum vs provider default:** explicit is deterministic and matches "always the model's real limit". The cost is a dependency on catalog accuracy (RSK-004).
- **`context_window_exceeded` → error, not recovery** (Claude Code parity; SR-006).
- **Partial reasoning of an output-limited response is dropped** rather than persisted (AR-001). Persisting it as a reasoning-only assistant message breaks Anthropic replay. It is visible live but not after a reload. Persisting it as a separate trace-only record would add machinery for little value.
- **AC-005 observable (AR-006):** "the final turn output contains both parts" is satisfied by the conversation: both text parts appear as consecutive assistant text segments, live and in replayed history (from their `assistant` raw traces), and the working context holds both assistant messages. The final `CompleteResponse` passed to the response processors (`ASSISTANT_COMPLETE`) carries only the last part, as with any multi-call turn.
- **`other` → `incomplete`** in the completion projection: a deliberate tightening (AR-004).

## Risks

- RSK-004 (extended by review): a wrong catalog `maxOutputTokens` causes provider 400s. OpenAI-compatible providers now always receive `max_completion_tokens` for known-limit models: one that ignores the name keeps its own default (REQ-012 unmet for it), and one that rejects it returns a 400. Mitigation: per-adapter request tests; implementation verifies each OpenAI-compatible subclass's parameter name against its provider docs; a **real-provider smoke test** (test vault, see Guidance) for every provider with a key; a configured value still overrides.
- ASM-003 (proxy): moot. The remote AutoByteus server no longer exists, and the provider is being removed in a follow-up ticket (`follow-up-autobyteus-provider-removal.md`). If that removal lands first, drop the compile-only edit.
- Some OpenAI-compatible providers may emit `finish_reason` only in a chunk without choices, or omit it. Unmapped or missing means `null`/`other`, so the behavior is unchanged (no recovery) — acceptable.
- Recovery cost: up to 3 extra calls of up to the full output limit each. This is bounded and matches Claude Code.
- ASM-003: no recovery through the AutoByteus proxy.
- Merge overlap with the compaction ticket is minimal (only `response-types.ts` is shared conceptually; their files are unchanged).

## Guidance For Implementation

- Tests (TESTING.md: core library tests `pnpm -C autobyteus-ts test`; server tests for integration where touched):
  - **Adapter unit tests with recorded event sequences:**
    - Anthropic: the probe shape (no block stop, `max_tokens`); a large `write_file` happy path with many `input_json_delta`s; `refusal`; `end_turn` with an unstopped block (protocol error); no `message_stop`.
    - OpenAI Responses: `response.incomplete` with `max_output_tokens`; `response.failed`.
    - OpenAI-compatible: `length` mid tool call; usage-chunk ordering.
    - Gemini: `MAX_TOKENS`, `SAFETY`.
    - Mistral: `length`, `model_length`.
    - Ollama: `length`.
    - Request-parameter tests for every adapter (AC-001, AC-008, AC-013).
  - **Agent-level tests with a scripted LLM:**
    - AC-003 (cut `write_file` → no execution → note → second response runs).
    - AC-005 (text resume).
    - AC-006 (4 consecutive → 3 recoveries, then an error; history valid; next user message valid).
    - AC-004 and context-window (error and rollback).
    - AC-012 (malformed → error result → continuation).
    - Unique `llmCallId`s and token-usage idempotency keys across recovery calls.
  - **Memory:** the note is persisted with an `output_limit_recovery` trace and survives snapshot restore. The snapshot serializer requires `composed_user` provenance for USER messages, so verify the note round-trips. A server replay test confirms the trace is not shown.
  - **Review-driven tests:**
    - AR-001: a tool-cut response with reasoning but no text produces no assistant message, and the next request is valid on the Anthropic renderer and on one reasoning-emitting OpenAI-style renderer.
    - AR-002: a `compaction_blocked` first call followed by an authorized retry still runs pre-request compaction; `llmCallId`s stay unique.
    - AR-003: the Anthropic adapter yields exactly one terminal chunk, and it is last (after the native-turn chunk).
    - AR-004: an output-limited non-streaming compaction summary still yields `completionStatus === 'incomplete'` and is rejected; plus the projection table.
    - AR-006: the exhaustion sequence emits the error notification, `LLMCompleteResponseReceivedEvent(isError)` and turn completion, and no note is appended on exhaustion.
  - **Real-provider credentials (user direction, 2026-10-10):** for real API testing, import `/Users/normy/.autobyteus/server-data/.env` into a **test-owned vault** with the sole importer, e.g. `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:<absolute test-owned db> --dry-run`, then rerun without `--dry-run` with the TTY confirmation (`script -q /dev/null …` on macOS). The target is the `databaseUrl` of an isolated instance from `pnpm --silent isolated-app start --build` (then `isolated-app restart`), or the dedicated real-provider test database. Never target the user's running app database or edit `.env` files (TESTING.md rules 2 and 4). Keys are never logged.
  - **Live (optional, on the user's credits, isolated per TESTING.md):** Opus 5.5 large `write_file` through an isolated desktop instance; forced recovery with a small configured `max_tokens`.
- Do not change `token-budget.ts` semantics (CON-001), the compaction files, or the server/web contracts.
- Keep `AnthropicAssistantTurnAssembler` strict; call `complete()` only for `stop`/`tool_calls`.
- The note must not contain provider-specific wording; the tool names come from the discarded invocations' names (the handler knows them even when arguments are cut).
- If any provider's real stream deviates from the mapping tables, record it and map conservatively to `other` (no recovery) rather than guessing.
