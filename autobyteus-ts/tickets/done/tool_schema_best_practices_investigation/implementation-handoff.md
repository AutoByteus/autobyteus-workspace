# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-review-report.md`
- Tool-choice design rework decision: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-rework-tool-choice-policy.md`
- API tool-continuation design rework decision: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-rework-api-tool-continuation.md`
- API tool-continuation probe output: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/api-tool-continuation-render-probe-output.json`
- Investigation/current-state compliance test: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance.test.ts`
- Generated compliance report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance-report.json`
- Non-OpenAI provider-native renderer investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/non-openai-api-mode-provider-investigation.md`
- Non-OpenAI provider renderer probe output: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/probes/non-openai-api-renderer-probe-output.json`

## What Changed

- Added recursive OpenAI-compatible tool schema normalization for object closure (`additionalProperties:false`) through the OpenAI formatter path.
- Kept OpenAI function-tool `strict:true` off by default; the normalizer rejects accidental strict enablement until nullable-required optional-field semantics are implemented.
- Added `OpenAICompatibleRequestBuilder` and routed sync/stream `OpenAICompatibleLLM` calls through it.
  - Maps `LLMConfig` controls (`temperature`, `topP`, penalties, stop sequences, max tokens, `extraParams`).
  - Filters internal kwargs such as `logicalConversationId`.
  - Attaches `tools` and explicit lower-level `kwargs.tool_choice` consistently when tools are present.
- Changed LM Studio native `api_tool_call` rendering to use `OpenAIChatRenderer` structured history.
- Replaced the old native-contaminating `LMStudioChatRenderer` with explicitly text-parser-scoped `LMStudioTextToolHistoryRenderer`.
- Added API-mode text-shaped tool-call diagnostics for `[TOOL_CALL] ...` content with zero parsed native tool calls; no fallback execution was added.
- Removed/de-scoped the public `AgentConfig.apiToolChoicePolicy` API after Round-2 design review. The default agent/server path now emits no `tool_choice`; lower-level direct LLM callers/tests can still pass explicit `kwargs.tool_choice` through `OpenAICompatibleRequestBuilder`.
- Added the Round-4 native API tool-result continuation split:
  - `api_tool_call` mode now enqueues an internal `ToolContinuationReadyEvent` after tool results and renders the existing working context without appending a synthetic aggregate user message.
  - Native OpenAI-compatible continuation requests now carry structured `assistant.tool_calls` plus matching `role:"tool"` messages only.
  - Legacy `xml` / `json` / `sentinel` parser modes retain the aggregate textual `SenderType.TOOL` continuation path.
- Added Kimi provider-safe request normalization for `kimi-k2.5`/`kimi-k2.6` temperature constraints surfaced by live OpenAI-compatible integration smoke coverage.

## Key Files Or Areas

- `src/tools/usage/formatters/openai-tool-schema-normalizer.ts`
- `src/tools/usage/formatters/openai-json-schema-formatter.ts`
- `src/tools/usage/providers/tool-schema-provider.ts`
- `src/llm/api/openai-compatible-request-builder.ts`
- `src/llm/api/openai-compatible-llm.ts`
- `src/llm/api/kimi-llm.ts`
- `src/llm/api/lmstudio-llm.ts`
- `src/llm/prompt-renderers/lmstudio-text-tool-history-renderer.ts`
- Removed: `src/llm/prompt-renderers/lmstudio-chat-renderer.ts`
- Removed: `src/agent/context/api-tool-choice-policy.ts`
- `src/agent/context/agent-config.ts`
- `src/agent/events/agent-events.ts`
- `src/agent/events/agent-input-event-queue-manager.ts`
- `src/agent/factory/agent-factory.ts`
- `src/agent/handlers/llm-user-message-ready-event-handler.ts`
- `src/agent/handlers/tool-result-event-handler.ts`
- `src/agent/llm-request-assembler.ts`
- `src/agent/status/status-deriver.ts`
- `src/agent/streaming/handlers/api-tool-call-text-diagnostic.ts`
- Targeted unit coverage added/updated under `tests/unit/...`, including `run_bash` OpenAI-compatible schema coverage.

## Important Assumptions

- `additionalProperties:false` is safe for existing `ParameterSchema`-generated OpenAI-compatible tool schemas.
- Full strict mode remains out of scope because optional arguments still need nullable-required conversion before `strict:true` can be enabled safely.
- `extraParams` is the intended path for provider-specific request body extensions such as LM Studio/Qwen chat-template options.
- Direct lower-level LLM tests/callers may still pass `tools`/`tool_choice` kwargs; no public agent-level tool-choice policy is part of this ticket.
- In native API mode, `MemoryIngestToolResultProcessor` remains the owner that appends structured `ToolResultPayload` records before the continuation event; `ToolResultEventHandler` only records the continuation boundary and triggers the next LLM leg.

## Known Risks

- Provider-specific support for forced `tool_choice` can vary; the default agent/server path intentionally leaves `tool_choice` unset. Direct lower-level callers that pass `kwargs.tool_choice` own provider compatibility.
- Text parser modes for LM Studio retain legacy text history only through the explicitly named text renderer; native API mode is tested against accidental reuse.
- Framework request/history fixes improve native tool-call correctness but do not guarantee any local model always emits parseable native tool calls.
- Native API continuation now avoids duplicate provider-visible tool-result text, but downstream API/E2E should still refresh live LM Studio/OpenAI-compatible continuation behavior because prior validation artifacts predate this Round-4 correction.
- A broader exploratory unit slice including all prompt renderer tests surfaced an existing unrelated failure in `tests/unit/llm/prompt-renderers/anthropic-prompt-renderer.test.ts` (`system` expected vs `user` rendered). No Anthropic prompt-renderer code was changed in this ticket.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix + Behavior Change + Refactor.
- Reviewed root-cause classification: Boundary Or Ownership Issue; Shared Structure Looseness; Duplicated Policy Or Coordination.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: Implemented the requested boundary repairs in schema formatting, request construction, native/text renderer separation, diagnostics, and native API no-user-message tool continuation without adding parser fallback execution; Round-2 rework removed the unowned public agent tool-choice API.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No` for native API mode; text history and aggregate textual tool-result continuation are retained only for explicitly selected legacy text-parser modes.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`; removed `LMStudioChatRenderer` and its old test, replaced by scoped renderer/test.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`; largest changed source file is `llm-user-message-ready-event-handler.ts` at ~388 effective non-empty lines, and changed source deltas were assessed against the reviewed continuation/refactor scope.
- Notes: No API-mode fallback parser/executor for `[TOOL_CALL]` text was introduced. No API-mode synthetic `role:"user"` aggregate tool-result message is appended during native continuation.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts`
- Branch: `codex/autobyteus-ts-tool-schema-best-practices`
- No dependency changes were made.

## Local Implementation Checks Run

Implementation-scoped checks:

1. `pnpm exec vitest run tests/unit/agent/handlers/tool-result-event-handler.test.ts tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts tests/unit/agent/events/agent-events.test.ts tests/unit/agent/events/agent-input-event-queue-manager.test.ts tests/unit/agent/factory/agent-factory.test.ts tests/unit/agent/status/status-deriver.test.ts tests/unit/agent/handlers/user-input-message-event-handler.test.ts tests/unit/agent/context/agent-config.test.ts tests/unit/llm/api/openai-compatible-request-builder.test.ts tests/unit/llm/api/openai-compatible-llm.test.ts tests/unit/llm/api/kimi-llm.test.ts tests/unit/llm/api/lmstudio-llm.test.ts tests/unit/tools/usage/providers/run-bash-openai-schema.test.ts tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance.test.ts`
   - Result: Pass, 14 test files / 79 tests.
2. `pnpm exec vitest run tests/integration/agent/runtime/agent-runtime.test.ts`
   - Result: Pass, 1 file / 4 tests.
3. `pnpm exec tsc -p tsconfig.build.json --noEmit`
   - Result: Pass.
4. `git diff --check`
   - Result: Pass.

Additional exploratory check:

- `pnpm exec vitest run tests/unit/llm/api tests/unit/llm/prompt-renderers tests/unit/tools/usage/formatters tests/unit/tools/usage/providers tests/unit/agent/context tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts tests/unit/agent/streaming/handlers/api-tool-call-text-diagnostic.test.ts`
  - Result: Failed in unrelated existing `tests/unit/llm/prompt-renderers/anthropic-prompt-renderer.test.ts`; changed-path tests in that command passed.

## Downstream Validation Hints / Suggested Scenarios

- Inspect generated `run_bash` schema under `LMSTUDIO` and verify `function.parameters.additionalProperties === false`, optional fields remain optional, and `function.strict` is absent.
- Capture an LM Studio native API request after a prior tool call/result and verify history uses `assistant.tool_calls` and `role:'tool'`, not `[TOOL_CALL]` / `[TOOL_RESULT]` content.
- Confirm the default agent/server API path passes `tools` but no `tool_choice`; direct LLM/request-builder tests should remain the place to exercise explicit `kwargs.tool_choice`.
- Simulate/model-return `[TOOL_CALL] run_bash {...}` text in API mode and verify diagnostic emission, assistant-text retention, and zero tool execution.
- Validate that XML/JSON/sentinel text parser modes still work intentionally when selected.

## API / E2E / Executable Validation Still Required

- Prior live provider smoke checks were run earlier in this ticket and are recorded below, but they predate the Round-4 native API continuation correction.
- API/E2E engineer should refresh realistic provider/request capture and end-to-end tool-call scenarios after code review, including LM Studio native API continuation, OpenAI-compatible providers, and selected legacy parser modes.

## Code Review Local Fix Addendum - CR-001

- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/review-report.md`
- Finding addressed: `CR-001` stale executable ticket compliance test asserted the pre-fix closed-object-schema gap.
- Fix applied: updated `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance.test.ts` into current-state regression coverage.
  - It now expects OpenAI-compatible envelope pass.
  - It now expects closed object schemas to pass with zero issues, including `run_bash` and `additionalProperties:false`.
  - It still documents the intentional strict-mode deferral: `strict:true` is not enabled and optional fields are not strict-ready.
- Generated report refreshed: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance-report.json`
  - `reportPurpose`: `current_state_regression_after_tool_schema_best_practices_fix`
  - `criteria.closedObjectSchemas.passed`: `true`
  - `criteria.closedObjectSchemas.issueCount`: `0`
  - `runBash.closedObjectSchemas`: `true`

### Local Fix Checks Run

1. `pnpm exec vitest run tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance.test.ts`
   - Result: Pass, 1 file / 3 tests.
2. `pnpm exec vitest run tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance.test.ts tests/unit/tools/usage/providers/run-bash-openai-schema.test.ts tests/unit/tools/usage/formatters/openai-json-schema-formatter.test.ts tests/unit/tools/usage/providers/tool-schema-provider.test.ts`
   - Result: Pass, 4 files / 9 tests.
3. `pnpm exec tsc -p tsconfig.build.json --noEmit`
   - Result: Pass.
4. `git diff --check`
   - Result: Pass.

## User-Requested Live Provider Smoke Addendum

- Copied `.env.test` from the main repo into this worktree for live provider smoke testing:
  - Source: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test`
  - Destination: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/.env.test`
  - File mode set to `600`; `.env.test` is gitignored by `autobyteus-ts/.gitignore`.
- Live smoke coverage was run as implementation-scoped confidence only, not API/E2E validation sign-off.
- Initial smoke result surfaced a Kimi provider-safe request issue: the centralized request builder now maps the generic default `LLMConfig.temperature` into requests, but `kimi-k2.6` rejects that generic default.
- Fix applied: `KimiLLM` now normalizes `kimi-k2.5`/`kimi-k2.6` request temperature to provider-accepted defaults unless the per-request kwargs explicitly provide `temperature`:
  - normal non-tool requests: `temperature: 1`
  - tool workflow requests/continuations: `temperature: 0.6`
  - existing tool-workflow `thinking:{type:'disabled'}` normalization is retained.
- Unit coverage updated in `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tests/unit/llm/api/kimi-llm.test.ts`.

### Checks After Kimi Smoke Fix

1. `pnpm exec vitest run tests/unit/llm/api/kimi-llm.test.ts tests/unit/llm/api/openai-compatible-request-builder.test.ts`
   - Result: Pass, 2 files / 10 tests.
2. `pnpm exec vitest run tests/integration/llm/api/kimi-llm.test.ts`
   - Result: Pass, 1 file / 5 tests.
3. `pnpm exec vitest run tests/integration/llm/api/openai-compatible-llm.test.ts tests/integration/llm/api/deepseek-llm.test.ts tests/integration/llm/api/kimi-llm.test.ts tests/integration/llm/api/glm-llm.test.ts tests/integration/llm/api/grok-llm.test.ts tests/integration/llm/api/openai-llm.test.ts tests/integration/agent/handlers/api-tool-call-handler-live.test.ts`
   - Result: 6 files passed, 1 file failed; 25 tests passed, 1 test failed.
   - Passing live smoke areas: generic OpenAI-compatible base, OpenAI, OpenAI live agent handler, Kimi, GLM, Grok.
   - Remaining failure: `tests/integration/llm/api/deepseek-llm.test.ts` tool-call continuation fails because the configured model reports `400 deepseek-reasoner does not support this tool_choice` for `tool_choice:'required'`.
   - Non-tool DeepSeek completion/stream/public send/public stream tests passed.
   - Implementation note: this DeepSeek result appears to be a provider/model capability constraint around forced `tool_choice` on `deepseek-reasoner`, not a schema-closure or request-builder regression; downstream API/E2E should decide whether to use a different DeepSeek model/policy for forced native tool-call validation.
4. `pnpm exec tsc -p tsconfig.build.json --noEmit`
   - Result: Pass.
5. `git diff --check`
   - Result: Pass.

## Round-2 Tool-Choice Public API Rework Addendum

- Rework decision artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-rework-tool-choice-policy.md`
- Latest architecture review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-review-report.md`
- Finding addressed: public `AgentConfig.apiToolChoicePolicy` was not product/server-backed and is not needed for the observed runtime improvement.
- Fix applied:
  - Removed `src/agent/context/api-tool-choice-policy.ts`.
  - Removed `apiToolChoicePolicy` from `AgentConfig`, constructor, copy behavior, and public context exports.
  - Removed `LLMUserMessageReadyEventHandler` logic that read agent config and injected `streamKwargs.tool_choice`.
  - Updated handler unit coverage to assert the default agent API path passes `tools` but no `tool_choice`.
  - Kept `OpenAICompatibleRequestBuilder` support for explicit lower-level direct-caller/test `kwargs.tool_choice`.
  - Removed AgentConfig-based `tool_choice` usage from LM Studio integration helpers/tests.
  - Updated durable docs under `docs/` so they no longer document `AgentConfig.apiToolChoicePolicy`.

### Rework Checks Run

1. `pnpm exec vitest run tests/unit/agent/context/agent-config.test.ts tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts tests/unit/llm/api/openai-compatible-request-builder.test.ts tests/unit/llm/api/openai-compatible-llm.test.ts`
   - Result: Pass, 4 files / 25 tests.
2. `pnpm exec vitest run tests/unit/tools/usage/formatters/openai-json-schema-formatter.test.ts tests/unit/tools/usage/providers/tool-schema-provider.test.ts tests/unit/tools/usage/providers/run-bash-openai-schema.test.ts tests/unit/llm/api/openai-compatible-request-builder.test.ts tests/unit/llm/api/openai-compatible-llm.test.ts tests/unit/llm/api/kimi-llm.test.ts tests/unit/llm/api/lmstudio-llm.test.ts tests/unit/llm/prompt-renderers/openai-chat-renderer.test.ts tests/unit/llm/prompt-renderers/lmstudio-text-tool-history-renderer.test.ts tests/unit/agent/context/agent-config.test.ts tests/unit/agent/streaming/handlers/api-tool-call-text-diagnostic.test.ts tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance.test.ts`
   - Result: Pass, 13 files / 53 tests.
3. `pnpm exec tsc -p tsconfig.build.json --noEmit`
   - Result: Pass.
4. `git diff --check`
   - Result: Pass.
5. `rg -n "apiToolChoicePolicy|ApiToolChoicePolicy|resolveApiToolChoicePolicy|api-tool-choice-policy|AgentConfig\\.apiToolChoicePolicy" src tests docs`
   - Result: No matches.

## DeepSeek Integration Test Local Fix Addendum

- User feedback identified that `tests/integration/llm/api/deepseek-llm.test.ts` still forced `tool_choice:'required'` for `deepseek-v4-flash`, even after the product/agent path removed forced tool choice.
- Fix applied:
  - Removed `tool_choice:'required'` from the DeepSeek tool-schema integration path.
  - Renamed the case to verify DeepSeek accepts tools without forced `tool_choice` and continues only if the model elects to make a native tool call.
  - Added `additionalProperties:false` to the local `echo_number` tool schema.
- Checks run:
  1. `pnpm exec vitest run tests/integration/llm/api/deepseek-llm.test.ts`
     - Result: Pass, 1 file / 5 tests.
  2. `pnpm exec vitest run tests/integration/llm/api/openai-compatible-llm.test.ts tests/integration/llm/api/deepseek-llm.test.ts tests/integration/llm/api/kimi-llm.test.ts tests/integration/llm/api/glm-llm.test.ts tests/integration/llm/api/grok-llm.test.ts tests/integration/llm/api/openai-llm.test.ts tests/integration/agent/handlers/api-tool-call-handler-live.test.ts`
     - Result: Pass, 7 files / 26 tests.
  3. `pnpm exec vitest run tests/unit/llm/api/openai-compatible-request-builder.test.ts tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts tests/unit/tools/usage/providers/run-bash-openai-schema.test.ts`
     - Result: Pass, 3 files / 12 tests.
  4. `pnpm exec tsc -p tsconfig.build.json --noEmit`
     - Result: Pass.
  5. `git diff --check`
     - Result: Pass.

## Round-4 Native API Tool-Result Continuation Addendum

- Rework decision artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-rework-api-tool-continuation.md`
- Latest architecture review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-review-report.md`
- Finding addressed: native `api_tool_call` continuation previously sent tool results twice to OpenAI-compatible providers: once correctly as structured `role:"tool"` messages and once incorrectly as an aggregate synthetic `role:"user"` message.
- Fix applied:
  - Added internal `ToolContinuationReadyEvent`.
  - Updated `ToolResultEventHandler` to centralize the native-vs-legacy continuation decision:
    - native `api_tool_call`: record a `tool_continuation` boundary and enqueue `ToolContinuationReadyEvent`;
    - legacy `xml` / `json` / `sentinel`: keep the aggregate textual `SenderType.TOOL` continuation.
  - Updated `LLMUserMessageReadyEventHandler` and `LLMRequestAssembler` with a typed native continuation path that renders current working context without appending a new user message.
  - Registered the new event in `AgentFactory`, allowed it on the continuation queue, and updated status derivation.
  - Updated durable docs that describe tool continuation and memory boundaries.
  - Updated the LM Studio full tool-roundtrip integration fixture to expect `ToolContinuationReadyEvent` in native mode.
- Coverage added/updated:
  - `tests/unit/agent/handlers/tool-result-event-handler.test.ts`: native branch enqueues `ToolContinuationReadyEvent`; legacy branch still enqueues aggregate user continuation.
  - `tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts`: AC-008-style request assembly proves rendered OpenAI-compatible payload contains `assistant.tool_calls` and matching `role:"tool"` message and no user message starting `The following tool executions have completed...`.
  - `tests/unit/agent/events/agent-events.test.ts`, `tests/unit/agent/events/agent-input-event-queue-manager.test.ts`, `tests/unit/agent/factory/agent-factory.test.ts`, and `tests/unit/agent/status/status-deriver.test.ts`: event/queue/registry/status support.

### Round-4 Checks Run

1. `pnpm exec vitest run tests/unit/agent/handlers/tool-result-event-handler.test.ts tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts tests/unit/agent/events/agent-events.test.ts tests/unit/agent/events/agent-input-event-queue-manager.test.ts tests/unit/agent/factory/agent-factory.test.ts tests/unit/agent/status/status-deriver.test.ts tests/unit/agent/handlers/user-input-message-event-handler.test.ts tests/unit/agent/context/agent-config.test.ts tests/unit/llm/api/openai-compatible-request-builder.test.ts tests/unit/llm/api/openai-compatible-llm.test.ts tests/unit/llm/api/kimi-llm.test.ts tests/unit/llm/api/lmstudio-llm.test.ts tests/unit/tools/usage/providers/run-bash-openai-schema.test.ts tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance.test.ts`
   - Result: Pass, 14 files / 79 tests.
2. `pnpm exec vitest run tests/integration/agent/runtime/agent-runtime.test.ts`
   - Result: Pass, 1 file / 4 tests.
3. `pnpm exec tsc -p tsconfig.build.json --noEmit`
   - Result: Pass.
4. `git diff --check`
   - Result: Pass.

## Code Review Local Fix Addendum - CR-002

- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/review-report.md`
- Finding addressed: `CR-002` native tool-result rejection could mutate provider-visible memory before active-batch identity validation.
- Fix applied:
  - Reordered `ToolResultEventHandler` so active-batch/identity acceptance now happens before configured tool-result processors run.
  - In native `api_tool_call` mode, a tool result with no active batch is rejected before processor side effects because no batch can validate the provider `tool_call_id`.
  - Missing invocation IDs, unknown invocation IDs, turn mismatches, in-turn duplicates, and late duplicates are rejected before raw trace writes, working-context `ToolResultPayload` writes, or `ToolContinuationReadyEvent` enqueue.
  - Accepted results run configured processors only after validation, with the accepted `toolInvocationId` and turn ID normalized before and after each processor call so side-effecting processors cannot change the provider-visible identity.
  - Logging and terminal lifecycle notifications now occur after processor execution only for accepted native results or supported legacy no-active-batch results.
- Coverage added/updated in `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tests/unit/agent/handlers/tool-result-event-handler.test.ts`:
  - Real/default `MemoryIngestToolResultProcessor` path proves native no-active-batch results do not write raw `tool_result` traces, working-context `role:tool` messages, `tool_continuation` traces, or continuation events.
  - Missing invocation ID, unknown invocation ID, and turn-mismatched native results are rejected before memory mutation.
  - In-turn duplicate native results are not ingested more than once.
  - Late duplicate native results after active-batch cleanup are not ingested and do not enqueue another continuation.
  - Accepted native result is ingested exactly once and renders as matching `assistant.tool_calls` plus `role:"tool"` history with no synthetic aggregate `role:"user"` message.

### CR-002 Local Fix Checks Run

1. `pnpm exec vitest run tests/unit/agent/handlers/tool-result-event-handler.test.ts`
   - Result: Pass, 1 file / 13 tests.
2. `pnpm exec vitest run tests/unit/agent/handlers/tool-result-event-handler.test.ts tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts tests/unit/agent/events/agent-events.test.ts tests/unit/agent/events/agent-input-event-queue-manager.test.ts tests/unit/agent/factory/agent-factory.test.ts tests/unit/agent/status/status-deriver.test.ts tests/unit/agent/handlers/user-input-message-event-handler.test.ts tests/unit/agent/context/agent-config.test.ts tests/unit/llm/api/openai-compatible-request-builder.test.ts tests/unit/llm/api/openai-compatible-llm.test.ts tests/unit/llm/api/kimi-llm.test.ts tests/unit/llm/api/lmstudio-llm.test.ts tests/unit/tools/usage/providers/run-bash-openai-schema.test.ts tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance.test.ts`
   - Result: Pass, 14 files / 86 tests.
3. `pnpm exec vitest run tests/integration/agent/runtime/agent-runtime.test.ts`
   - Result: Pass, 1 file / 4 tests.
4. `pnpm exec tsc -p tsconfig.build.json --noEmit`
   - Result: Pass.
5. `git diff --check`
   - Result: Pass.
6. `rg -n "apiToolChoicePolicy|ApiToolChoicePolicy|resolveApiToolChoicePolicy|api-tool-choice-policy|AgentConfig\\.apiToolChoicePolicy" src tests docs || true`
   - Result: No matches.

## Round-6 Scope Correction Addendum - Non-OpenAI Provider-Native Renderers

Architecture review `AR-006-001` found that this handoff must not be read as claiming all provider-native `api_tool_call` renderers are solved. The implemented changes remain valid for the approved scope: OpenAI-compatible Chat providers / LM Studio native history and request/schema path, plus the shared no-synthetic-user continuation routing.

Known gaps explicitly out of current implementation scope:

- Gemini renderer still needs typed `functionCall` / `functionResponse` history for native API mode.
- Ollama renderer still needs assistant `tool_calls` plus `role:"tool"` / `tool_name` history for native API mode.
- Anthropic renderer still needs `tool_use` / `tool_result` content blocks for native API mode.
- Mistral renderer still needs assistant `tool_calls` plus `role:"tool"` / `tool_call_id` history for native API mode.
- OpenAI Responses renderer still needs `function_call` / `function_call_output` input items for native Responses API tool loops.

Do not route implementation against these gaps from this handoff unless solution design explicitly expands scope with provider-by-provider requirements and wire-format acceptance tests.


Provider-native scope rework decision: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-rework-provider-native-scope.md`
