# Implementation Handoff — anthropic-incomplete-content-block

Current round: **IR-003, the CR-001 Local Fix (commit repackaging) on IR-002, Step 2 of DEC-004 (the refactor)**. Step 1 (IR-001, real output limits) passed code review (CRR-001) and API/E2E (API-REV-001); it stays as described below and is the base of Step 2.

## Upstream Artifact Package

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block/tickets/in-progress/anthropic-incomplete-content-block/`.

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Large/High) and passed (ARCH-REV-002 on SR-007; ARCH-REV-003 on SR-008). `get_handoff_rules` (2026-10-10) matched "implementation is complete … Large or High … ready for independent source review" → `/software_engineering_team/code_reviewer`.
- Requirements doc: `requirements-doc.md` (Approved 2026-10-10; SR-008)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-001..SR-008)
- Design spec: `design-spec.md` (Ready, SR-008)
- Supplemental task artifacts:
  - `probes/max-tokens-tool-use-probe.cjs`, `probes/max-tokens-400.out.json` (design evidence)
  - Step 1 smoke: `probes/output-limit-smoke.e2e.test.ts`, `probes/output-limit-smoke-results.jsonl`
  - Step 2 smoke: `probes/finish-smoke.e2e.test.ts`, `probes/finish-smoke-results.jsonl`
  - Runner for both: `probes/output-limit-smoke-runner.mjs [<worktree>] [<spec path>]`
  - `follow-up-autobyteus-provider-removal.md` (SR-008 follow-up)
  - `approval-request.md`, `handoff-architecture-design-complete.md`
- Design review report: `design-review-report.md` (Pass, ARCH-REV-003)
- Architecture review revision record: `architecture-review-revision-record.md` (ARCH-REV-001..003)
- Step 1 downstream results (informational): `code-review-report.md` (Pass, CRR-001), `api-e2e-execution-coverage-report.md` (Pass, API-REV-001, 95%)
- Triggering rework report: N/A (Step 2 is the second planned delivery slice, not rework)

## Current Implementation Summary

- Implementation cycle: `Initial` (Step 2 initial round; Step 1 unchanged)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-003` (IR-001 = Step 1; IR-002 = Step 2; IR-003 = CR-001 commit repackaging, same tree)
- Related solution revision IDs: `SR-007`, `SR-008`
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001` (Step 1 Pass; informational), `CRR-003` (Step 2 Local Fix CR-001), `CRR-004` (Step 2 Pass; informational)
- Related API/E2E revision IDs: `API-REV-001` (Step 1 Pass; informational)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001` (CRR-003). The CRR-001 non-blocking nit (`=new Set(` spacing in `anthropic-llm.ts`) is fixed in Step 2.

### Workspaces and commits

- **Step 1**:
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block`, branch `codex/anthropic-incomplete-content-block`, base `origin/personal` @ `d28c56d5d`.
  - Commits `a5965885d` (Step 1), `6610540a2` (Gemini single-attempt baseline fix), `e1da24211`.
  - API/E2E added `9dc55702f` and `1c694cfea`.
- **Step 2**:
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block-step2`, branch `codex/anthropic-incomplete-content-block-step2`, stacked on the Step 1 head `1c694cfea`.
  - Review diff: `1c694cfea..2a65f40fa`. CR-001 rewrote the commits; the tree is identical to the reviewed `caad03939`.
    - `4a10aeac9` test(agent): back the runtime integration test with a capture-capable store (**baseline fix**, TESTING.md rule 9). It touches only `agent-runtime.test.ts`.
    - `2a65f40fa` feat(agent): recover from output-limit truncation; never run cut or malformed tool calls (Step 2). It now also holds the `completion-status.ts` removal and the `completion-status.test.ts` → `nonstreaming-finish.test.ts` rename.
- Ticket artifacts live, uncommitted, in the Step 1 worktree's ticket folder (above).

### What Step 2 implements

- **Finish contract (D-02)**: `llm/utils/llm-response-finish.ts`.
  - `LlmFinishReason`, `LlmResponseFinish { reason, providerReason }`.
  - `buildFinish`, `mapProviderFinish(table, raw)`: unreported → `null`, unmapped → `other`, own keys only.
  - `withToolCallsFinish`.
  - `completionStatusOf`, the D-02 projection table.
- **Response types**: `ChunkResponse.finish` (terminal chunk only); `CompleteResponse.finish`.
  - `completionStatus` and `completionReason` are now read-only getters; the stored fields and constructor params are gone.
  - `completion-status.ts` is removed.
  - `BaseLLM.streamMessages` passes the terminal finish to after-hooks.
- **Adapters (DS-005)**: each has its own finish table and yields exactly one terminal chunk, last, with usage and finish. Non-streaming responses carry the same finish (refusal → `content_filter`; function-call output → `tool_calls`).
  - Anthropic (D-03/DS-006):
    - `stop_reason` and usage are recorded at `message_delta`.
    - At `message_stop`: map the finish; complete the strict assembler only for `stop`, `tool_calls` or unreported; yield the native turn; then yield the terminal chunk last.
    - A stream without `message_stop` throws, and no terminal chunk is yielded.
    - `sawToolUse`/`completedNativeTurn` are removed.
  - OpenAI Responses:
    - `response.completed` → `stop`, `tool_calls` or `content_filter` by its output.
    - `response.incomplete` → finish from `incomplete_details.reason` (`max_output_tokens` → `output_limit`, `content_filter` → `content_filter`).
    - `response.failed` → throws.
    - Dead accumulators removed.
  - OpenAI-compatible:
    - The last `finish_reason` and the last usage (including a usage-only chunk) go into one terminal chunk at stream end.
    - Base table: `stop`, `tool_calls`, `function_call`, `length`, `content_filter`.
    - GLM extends it with Z.ai's documented `sensitive` → `content_filter` and `model_context_window_exceeded` → `context_window_exceeded`.
  - Gemini:
    - One terminal chunk instead of one per usage-bearing chunk, using the last usage.
    - Table per the design: `STOP`, `MAX_TOKENS`, and safety/recitation/blocklist/prohibited/SPII/`IMAGE_*` → `content_filter`.
    - A blocked prompt maps to `content_filter`.
    - Dead accumulators removed.
  - Mistral: `length` → `output_limit`, `model_length` → `context_window_exceeded`; `error` → throws.
  - Ollama: `done_reason` `stop`/`length`; dead accumulators removed (touched file).
  - AutoByteus proxy: compile-only constructor edit (SR-008).
- **LlmPhase (D-04)**, on the terminal finish:
  - `content_filter` / `context_window_exceeded`: throw a coded error (`LLM_RESPONSE_REFUSED` / `LLM_CONTEXT_WINDOW_EXCEEDED`, naming the provider reason) into the existing rollback and error-notification path.
  - `output_limit`, settled in order:
    1. `releaseRequest()`.
    2. Ingest one plain assistant message with the partial text only (no reasoning, no native turn); ingest nothing if the text is empty.
    3. `finalizeOutputLimited` (text segment ends normally; tool segments fail with "Discarded: …"; no invocations).
    4. End the reasoning segment normally.
    5. Usage notification.
    6. Compaction threshold evaluation only (no `after_final_response` execution).
    7. Return `{ kind: 'output_limited', response, truncatedToolNames, outputTokenLimit }`.
- **AgentTurnRunner (D-05)**:
  - A local `consecutiveOutputLimitStops` counter, reset after any other outcome.
  - At or below 3: `appendOutputLimitRecoveryNote`, then `turn.beginContinuation()`, then a runner-built `nextInput { llmUserMessage: null, turnId, sourceEvent (carried, not re-applied) }`, then `continue`.
  - On the 4th consecutive: an `LLM_OUTPUT_LIMIT_EXHAUSTED` error notification, then the shared `completeWithFinalResponse(errorResponse, isError=true)`. That is the existing final/isError sequence, now one method used by both paths. The error is not ingested.
- **Policy (D-05/D-06)**: `agent/loop/output-limit-recovery.ts` holds `MAX_OUTPUT_LIMIT_RECOVERIES = 3`, the three note variants, the exhaustion message, and the discarded-segment text.
- **Memory (D-06)**:
  - `MemoryManager.appendOutputLimitRecoveryNote({ turnId, content })` writes an `output_limit_recovery` raw trace (`memory/output-limit-recovery-trace.ts`) and a USER working-context message linked by `rawTraceIds` (composed-user provenance).
  - It is recorded before the next request's checkpoint.
- **Malformed calls (D-07)**:
  - `ToolInvocation.argumentsParseError` (constructor option).
  - The handler marks invalid-JSON and non-object arguments (`{}` is only the history placeholder); empty arguments stay valid.
  - `ToolPhase` rejects a marked call first, before preprocessing, approval and execution, with "Your tool call was malformed and could not be parsed (<error>). Please retry." (`buildMalformedToolCallError`).
- **Turn identity (D-08)**:
  - `AgentTurn.nextLlmCallSequence()`, allocated per request attempt in `LlmPhase` before assembly.
  - `beginContinuation()`/`isContinuation`, set by the runner only when it starts a tool continuation or a recovery continuation.
  - `LlmRequestAssemblyIdentity.isToolContinuation` is renamed `isTurnContinuation`.
- **Rename (D-09)**: `ToolContinuationReadyEvent` → `TurnContinuationReadyEvent` (source and tests).

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - Step 2 changes the shared finish contract every adapter implements.
  - It changes agent-loop control flow (a new outcome kind, same-turn recovery continuations, turn-owned call identity), the tool-execution admission rule, and working-context content (a hidden note with a new raw-trace type).
  - About 23 source files: 3 new, 19 modified, 1 removed. 47 files including tests.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (Large/High)
- New design impact or escalation trigger: `None`. No escalation trigger fired:
  - no provider rejected the catalog maximum;
  - the note round-trips through snapshot provenance validation, and replay ignores its trace;
  - no compaction file, compaction report contract or server/web stream protocol changed;
  - no truncated native turn is persisted or replayed.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001, BEH-004, BEH-007, BEH-010 | Real output limits (Step 1) | `max-output-tokens.ts`, `BaseLLM.resolveMaxOutputTokens()`, adapters | IR-001; CRR-001 and API-REV-001 Pass |
| BEH-002 (REQ-002, REQ-003, REQ-005; AC-003, AC-006) | Cut tool call is discarded, hidden note added, auto-continue at most 3 times, then a clear error | Adapter terminal finish `output_limit` → `LlmPhase` settlement → `LlmStreamingResponseHandler.finalizeOutputLimited` → `AgentTurnRunner` loop → `MemoryManager.appendOutputLimitRecoveryNote` / `completeWithOutputLimitExhausted` | Agent-level tests run through the real `AnthropicLLM` (probe shape) and a scripted LLM: no execution, no stored cut call or native turn, note names the tool and the limit, exactly 3 recoveries, then `LLM_OUTPUT_LIMIT_EXHAUSTED`. Live: Opus 5.5 `write_file` cut at 400 tokens is classified (no "incomplete block" error, no native turn) |
| BEH-003 (REQ-004; AC-005) | Partial text kept (no reasoning), resume note, both parts in the conversation | Same settlement; text-only ingest via `ingestAssistantResponse` | Agent-level test: both assistant messages are in the working context and in `assistant` raw traces; no reasoning trace; the final `CompleteResponse` carries only the last part (as the SR-007 AC-005 clarification states). Server replay test: two consecutive assistant messages; the note is hidden |
| BEH-005 (REQ-006; AC-007) | Protocol violations still fail and roll back | `AnthropicLLM` stream end: strict assembler under `stop`/`tool_calls`; missing `message_stop` throws | Unit: an open block under `end_turn`/`tool_use` throws "Anthropic content block is incomplete."; a missing `message_stop` throws with no terminal chunk |
| BEH-006 (REQ-003, REQ-005, REQ-008; AC-006) | History stays valid; truncation is never stored as a native turn | Settlement commits input plus text only; the exhaustion error is not ingested | Agent-level: after exhaustion, the next user message yields a valid single-user-turn request and the turn completes normally |
| BEH-008 (REQ-009, REQ-010; AC-010, AC-011) | Normalized finish on every streaming adapter; uniform loop handling | Per-adapter tables plus a single terminal chunk | Unit (`stream-finish.test.ts`, 37 cases) for Anthropic, Responses, OpenAI-compatible (+GLM), Gemini, Mistral, Ollama. Agent-level AC-011 through the real `OpenAICompatibleLLM` (`length` mid tool call). Live: Anthropic, OpenAI, DeepSeek, GLM, Gemini and Grok each end with one terminal chunk and `output_limit` plus the raw reason |
| AC-004 (REQ-002) | Refusal / context window: clear error, no tool, no recovery | `buildResponseStopError` → existing rollback path | Agent-level: 1 LLM call, coded error naming the provider reason, `isError` final, input rolled back, no note |
| BEH-009 (REQ-011; AC-012) | Malformed call never runs; the model gets a retry error | Handler `argumentsParseError` → `ToolPhase` admission | Unit (handler, ToolPhase) plus agent-level: tool not executed; the next request carries the "malformed … Please retry." tool result; the turn continues |
| D-08 / AR-002 | Unique call ids; compaction-blocked retry still compacts | `AgentTurn.nextLlmCallSequence()` / `isContinuation` | Agent-level: `turn_0001:llm:1..4` with unique idempotency keys. Extended `agent-runtime-compaction` "recover": the retried held turn compacts again, and its usage call id is `:llm:2` (the blocked attempt consumed `:1`) |
| AR-001 | Reasoning-only cut: no assistant message; next request valid | Settlement ingests nothing when the text is empty | Agent-level on the Anthropic and OpenAI Responses renderers: no assistant message, no reasoning in the next request; the "nothing kept" variant is tested separately |
| AR-004 | Projection table; output-limited non-streaming summary is rejected | `completionStatusOf` getter; compaction code unchanged | Unit table test; `nonstreaming-finish.test.ts` (Responses `max_output_tokens` → `incomplete`); `direct-llm-compression-strategy` incomplete case now built from `finish: output_limit` and still rejected |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

All under `autobyteus-ts/src` unless noted.

- **New**:
  - `llm/utils/llm-response-finish.ts`
  - `agent/loop/output-limit-recovery.ts`
  - `memory/output-limit-recovery-trace.ts`
- **Removed**: `llm/api/completion-status.ts`.
- **LLM layer**:
  - `llm/utils/response-types.ts`, `llm/base.ts`
  - `llm/api/anthropic-llm.ts`, `openai-responses-llm.ts`, `openai-compatible-llm.ts`, `glm-llm.ts`, `gemini-llm.ts`, `mistral-llm.ts`, `ollama-llm.ts`
  - `autobyteus-llm.ts` (compile-only)
- **Agent loop**:
  - `agent/loop/llm-phase.ts`, `agent/loop/agent-turn-runner.ts`, `agent/loop/tool-phase.ts`
  - `agent/agent-turn.ts`, `agent/llm-request-assembler.ts`, `agent/tool-invocation.ts`
  - `agent/streaming/handlers/llm-streaming-response-handler.ts` (`finalizeInterrupted`/`finalizeFailed`/`finalizeOutputLimited` now share one `finalizeAbandoned`)
  - `agent/events/agent-events.ts`, `agent/status/status-deriver.ts`
- **Memory**: `memory/memory-manager.ts` (note method; dead test-only methods removed).
- **New tests**:
  - `tests/unit/llm/utils/llm-response-finish.test.ts`
  - `tests/unit/llm/api/stream-finish.test.ts`
  - `tests/unit/llm/api/nonstreaming-finish.test.ts` (renamed from `completion-status.test.ts`, extended)
  - `tests/unit/agent/streaming/handlers/llm-streaming-response-handler-finish-modes.test.ts`
  - `tests/unit/agent/loop/tool-phase-malformed-call.test.ts`
  - `tests/unit/memory/output-limit-recovery-note.test.ts`
  - `tests/integration/agent/output-limit-recovery-flow.test.ts` (10 agent-level cases)
- **Server test**: `autobyteus-server-ts/tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts` (hidden note case).
- **Updated tests**:
  - renames: event, flag
  - Anthropic stream fixtures now end with `message_stop`
  - `finish` instead of `completionStatus` in two compaction tests
  - `toolInteractionsOf` helper in `memory-manager.test.ts`
  - AR-002 assertions in `agent-runtime-compaction.test.ts`

## Important Assumptions

- ASM-002 (refusal shape) is handled generically: any unstopped block under a terminal stop builds no native turn.
- Implementation-level choices within the design's ownership:
  - GLM's extra finish strings come from Z.ai's documented `finish_reason` values (`docs.z.ai/api-reference/llm/chat-completion`).
  - A plain `stop` with streamed tool calls is reported as `tool_calls` on every adapter. The design states this explicitly for Gemini; it is applied the same way everywhere.
  - `LlmPhase` takes `outputTokenLimit` from the pure resolver in `llm/utils`, an allowed dependency. It equals what Anthropic streaming sends.
  - Exhaustion text: "The model's response hit the output limit of N tokens 4 times in a row, so the turn stopped after 3 automatic recovery attempts. Ask for the work in smaller pieces … and send the request again." It names the limit and suggests smaller pieces (QR-002).
- The input pipeline's local `isToolContinuation` is kept. It still means a TOOL-sender tool-result continuation, the only kind that pipeline handles; recovery continuations bypass it (D-05). The D-09 rename covers the event and the assembler flag.

## Known Risks

- **Residuals carried from the design:**
  - The `other` → `incomplete` tightening for nonstandard success strings on compaction calls. No OpenAI-compatible provider in the catalog documents a success alias (DeepSeek: `stop`/`length`/`content_filter`/`tool_calls`/`insufficient_system_resource`/`aborted`; Z.ai: `stop`/`tool_calls`/`length`/`sensitive`/`model_context_window_exceeded`/`network_error`).
  - Partial reasoning is not shown after a reload.
  - Recovery cost: up to 3 extra full-limit calls per turn.
- Unmapped terminal reasons stay `other` (normal handling, no recovery): Gemini `MALFORMED_FUNCTION_CALL` (design deferral), DeepSeek `insufficient_system_resource`/`aborted`, GLM `network_error`, Anthropic `pause_turn`. A tool call cut by one of these and left with invalid JSON becomes a malformed-call retry (REQ-011), not an output-limit recovery.
- Non-streaming OpenAI Responses `failed`/`cancelled` statuses map to `other` (incomplete); only streaming `response.failed` throws (D-02/DS-005 scope).
- Live smoke not covered:
  - Kimi: account balance.
  - Qwen: no importer mapping.
  - Mistral and Ollama: no key or local server.
  - Gemini AI Studio: hit a per-minute 429 in Step 1; Vertex Express used instead.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug fix exposing an approved larger requirement.
- Reviewed root-cause classification: Missing Invariant + Duplicated Policy Or Coordination.
- Reviewed refactor decision: `Refactor Needed Now`.
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes:
  - Provider stop vocabularies now live only in adapter tables; `LlmPhase` reads only `LlmResponseFinish`.
  - The retry policy lives only in `AgentTurnRunner` plus its policy file.
  - `ToolPhase` is the only admission point.
  - Memory writes go through the new `MemoryManager` method.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no alias for the old event or flag; no stored `completionStatus` next to `finish`)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. The design's Removal Plan is done. Also removed:
  - Ollama's write-only stream accumulators;
  - `MemoryManager.getToolInteractions`, `isCompactionAwaitingUserRetry` and `requirePendingCompactionRequest`. These had no production callers; their 3 test files now use public alternatives.
- Dead code found elsewhere, listed as follow-up:
  - `MemoryManager.ingestToolIntent` / `ingestToolResult`: thin wrappers whose only callers are about 40 test call sites in 10 test files. Evidence: `grep -rn "\.ingestToolIntent(\|\.ingestToolResult(" autobyteus-ts/src autobyteus-server-ts/src` finds none. Kept to avoid unrelated test churn.
  - `MemoryManagerCompactionCoordinator.requirePending()`: no callers after the removal above. It sits in a compaction file this ticket must not change.
- Shared structures remain tight: `Yes`. `finish` is the single stored representation; `ToolInvocation` gains one explicit field via an options object.
- Canonical shared design guidance was reapplied: `Yes`
- Changed source files within size guardrails: `Yes`.
  - `memory-manager.ts`: 494 effective lines (was 498).
  - `llm-phase.ts`: 415 (+98/−44).
  - `openai-responses-llm.ts`: 415.
  - Handler: 401 (−17 net).
  - No file is over 500 and no delta is over 220.
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (additive: a new raw-trace type value plus a USER message per recovery)
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence:
  - The note's USER message carries composed-user provenance linked to its trace. It passes `WorkingContextSnapshotSerializer.validate` and deserializes unchanged (`output-limit-recovery-note.test.ts`).
  - Server history replay ignores the trace type (server test).
  - Existing snapshots are untouched.
- Deviation: `None`

## Environment Or Dependency Notes

- **Step 2 worktree setup**: `pnpm install --frozen-lockfile`; `pnpm exec prisma generate` in `autobyteus-server-ts`. Builds left untracked `autobyteus-application-*/dist/` (not committed).
- **Real-provider credentials**: imported with the sole importer into each worktree's test-owned vault (`<worktree>/autobyteus-server-ts/db/test.db`, the tracked `.env.test` target): dry run, then the TTY `IMPORT` via `script -q /dev/null`. 10 secrets; no `.env` edited; no values logged; identifiers redacted from evidence.
- **Unintended live calls (disclosure)**: my shell profile exports provider API keys (`DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `GLM_API_KEY`, `GROK_API_KEY`, `KIMI_API_KEY`, `OPENAI_API_KEY`, …). One unsanitized `vitest run tests/integration` on the Step 2 worktree therefore ran the core `tests/integration/llm/api/*` live tests (DeepSeek, Gemini, GLM, Grok, Kimi) against real APIs with those env keys. The calls were small; several failed for provider or quota reasons. All later integration runs used `env -i PATH HOME TMPDIR`. Downstream should run core integration suites with a sanitized environment, too.
- **TESTING.md discrepancy (carried from IR-001)**: `pnpm -C autobyteus-ts test` is a stub that exits 1; use `pnpm -C autobyteus-ts exec vitest run …`.
- **Baseline failures**:
  - Fixed in Step 2, commit `4a10aeac9`: 10 of 12 `tests/integration/agent/runtime/agent-runtime.test.ts` cases failed on the base. Their `InMemoryStore` fixture did not implement `recordSystemInstructionSupply`, so bootstrap (`SystemPromptProcessingStep`) put every agent in ERROR. The fixture now uses a temp-dir `FileMemoryStore`; 12/12 pass.
  - Reported, not fixed: unrelated stale tests whose failures are identical on the Step 1 base and on Step 2 (sanitized env). They need an owner as one baseline-cleanup item:
    - `tests/integration/llm/llm-factory-metadata-resolution.test.ts` and `tests/integration/agent/read-media-file-continuation-flow.test.ts`: expect catalog model `gemini-3.5-flash`, which the catalog no longer has (`gemini-3.8-flash` replaced it).
    - `tests/integration/tools/registry/tool-definition.test.ts`: calls the removed `ToolDefinition.getUsageJson`.
    - `tests/integration/llm/utils/messages.test.ts`: `Message.toDict()` now includes `metadata: null`.
    - `tests/integration/tools/mcp/*` (4 files): need external MCP toy/pdf servers.
    - `tests/integration/tools/multimedia/download-media-tool.test.ts`: times out on a local media download.
  - Reported in IR-001, still open: the `run-bash` stdout race in `ShellCommandExecutor`. It finalizes on `exit` before buffered stdio is read.

## Local Implementation Checks Run

All on the Step 2 worktree after the rebase onto `1c694cfea`.

- `pnpm -C autobyteus-ts exec vitest run tests/unit`: 303 files / 1947 tests passed.
- `env -i PATH HOME TMPDIR pnpm -C autobyteus-ts exec vitest run` on:
  - `tests/integration/agent/output-limit-recovery-flow.test.ts`
  - `tests/integration/agent/runtime`
  - `tests/integration/agent/provider-native-tool-continuation-flow.test.ts`
  - `tests/integration/agent/memory-tool-call-flow.test.ts`

  Result: 33 passed, 1 skipped. Other credential-free integration files: failures identical to the Step 1 base (listed above).
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history tests/unit/agent-execution/compaction --no-watch`: 50 files / 246 tests passed.
- `pnpm -C autobyteus-ts build` OK; `pnpm -C autobyteus-server-ts typecheck` clean.
- `tsc -p autobyteus-ts/tsconfig.json --noEmit` (includes tests): 282 errors, the same as the base. A sorted diff shows only the renamed flag inside pre-existing `llm-request-assembler.test.ts` errors.
- Narrow live finish smoke (`probes/finish-smoke.e2e.test.ts` via the runner and the Step 2 test vault; results in `probes/finish-smoke-results.jsonl`):
  - With `max_tokens: 24`, Anthropic, OpenAI, DeepSeek, GLM, Gemini (Vertex Express) and Grok each yield exactly one terminal chunk, last, with `output_limit` and their raw reason (`max_tokens`, `max_output_tokens`, `length`, `MAX_TOKENS`).
  - Opus 5.5 `write_file` cut at 400 tokens: `output_limit`/`max_tokens`, 0 native-turn chunks, no error.
  - This is an adapter-level check, not API/E2E sign-off.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: no renderer change. The existing error display and segment events are reused; the only new UI-visible states are a failed tool segment with "Discarded: …" and the existing turn error notification.

## Downstream Coverage Hints / Suggested Scenarios

- Real-server journey (isolated instance or server E2E with the test vault), native runtime, Claude with a small configured `max_tokens` (e.g. 400):
  1. A `write_file` request is cut.
  2. The UI shows the tool segment as discarded.
  3. The turn continues automatically.
  4. The second attempt uses smaller pieces.
  5. Reloaded history shows no note and no cut call.
- Forced exhaustion (very small `max_tokens`): 3 automatic continuations, then the `LLM_OUTPUT_LIMIT_EXHAUSTED` error; the next user message works.
- Text-only truncation: the two assistant parts appear consecutively, live and after reload.
- One non-Anthropic provider through the server (DeepSeek or OpenAI) with a small limit mid tool call (AC-011).
- Compaction summary under a small limit: `completion_status` is `incomplete` with the specific `completion_reason`; the summary is rejected and the fallback runs.
- Token Meter: one usage record per LLM call across recovery calls (unique `llm_call_id`).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent code review of Step 2 (IR-002), next.
- API/E2E validation of Step 2: AC-002..AC-007 and AC-010..AC-012 through the real server path. The existing Step 1 live suite (`autobyteus-native-output-limit-live.e2e.test.ts`) may be extended.
- AC-009 user verification after release (Step 1 delivers the real limit; Step 2 adds recovery).
