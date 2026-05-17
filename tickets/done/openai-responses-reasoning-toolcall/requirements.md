# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready; approved by user on 2026-05-17.

## Goal / Problem Statement

Fix the AutoByteus runtime failure that occurs after a successful `send_message_to` tool call when using the AutoByteus runtime with OpenAI `gpt-5.5`. The observed error is an OpenAI Responses API streaming `400`:

`Item 'fc_...' of type 'function_call' was provided without its required 'reasoning' item: 'rs_...'`.

Investigation indicates the bug is in the `autobyteus-ts` OpenAI Responses API native tool-call continuation path. The provider adapter captures OpenAI `response.output` items, but the OpenAI Responses renderer replays only `function_call`/`function_call_output` items and drops required `reasoning` output items when constructing the next request.

## Investigation Findings

- `OpenAILLM` is a thin subclass of `OpenAIResponsesLLM`; all OpenAI model calls, including `gpt-5.5`, use `src/llm/api/openai-responses-llm.ts`.
- `OpenAIResponsesLLM._streamMessagesToLLM` captures OpenAI `response.completed.response.output` and attaches the full `responseOutputItems` array to each emitted OpenAI native tool-call context.
- `OpenAIResponsesRenderer.renderToolCall` ignores `nativeToolCallContext.responseOutputItems`; it only re-renders the individual `function_call` item and then appends `function_call_output` items.
- Existing tests already contain an OpenAI `responseOutputItems` fixture with a `reasoning` item in `tests/unit/llm/api/provider-native-request-payloads.test.ts`, but assertions only check function calls and outputs, so the missing reasoning replay is not caught.
- Official OpenAI Responses/reasoning documentation says reasoning items should be passed back for subsequent turns when manually managing Responses API context, especially around function calling.
- A live scratch test using copied `autobyteus-ts/.env.test` verified current `gpt-5.5` streamed tool-call continuation can pass when OpenAI returns only a `function_call` item; this did not disprove the screenshot because the live run did not produce a `reasoning` output item.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, localized to the OpenAI Responses native tool-call continuation boundary.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, with secondary Shared Structure Looseness.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, but bounded to the OpenAI Responses provider renderer/request-owner files.
- Evidence basis: `openai-responses-llm.ts` stores `responseOutputItems`; `openai-responses-renderer.ts` never uses them. OpenAI docs require reasoning items from prior responses to be included in subsequent input when manually managing context. Existing tests include a reasoning fixture but do not assert it survives rendering.
- Requirement or scope impact: Requirements must cover preservation of OpenAI Responses output-item chains, not only function-call ids and tool outputs.

## Recommendations

- Treat the full OpenAI Responses `response.output` sequence as the authoritative prior assistant/tool-call history for OpenAI native tool continuation.
- Update `OpenAIResponsesRenderer` to render captured `responseOutputItems` once per assistant tool-call message, preserving reasoning items and original output-item order while normalizing function-call arguments from the final `ToolCallSpec`.
- Ensure OpenAI Responses requests include `reasoning.encrypted_content` when appropriate so stateless/manual context can replay encrypted reasoning items when OpenAI returns them.
- Add deterministic unit/integration coverage that fails if a reasoning item present in `responseOutputItems` is dropped from the continuation payload.
- Keep the fix local to OpenAI Responses/native tool history; do not change `send_message_to`, the UI, or non-OpenAI provider renderers unless a shared type needs semantic tightening.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: AutoByteus runtime with OpenAI `gpt-5.5` performs a native Responses API tool call and then continues after the tool result without the missing-`reasoning` `400` error.
- UC-002: OpenAI Responses renderer replays prior response output items, including `reasoning` items, in the next request when using manual context and native tool continuation.
- UC-003: Multi-tool OpenAI Responses continuations preserve call ids, ordering, reasoning items, and tool-result ordering without duplicating output items.
- UC-004: Existing non-reasoning OpenAI tool-call flows remain functional.

## Out of Scope

- UI model-selection redesign.
- Changing the `send_message_to` tool implementation unless downstream work proves it emits malformed tool results.
- Reworking provider implementations outside the OpenAI Responses/native tool-call path.
- Replacing manual context management with `previous_response_id` or a server-side OpenAI conversation state design in this ticket.
- Adding backward-compatible dual rendering that preserves the known-bad dropped-reasoning path.

## Functional Requirements

- REQ-001: When OpenAI Responses returns a prior output sequence containing a `reasoning` item and one or more `function_call` items, the next OpenAI Responses request must include the required reasoning item(s) together with the function-call item(s) and matching function-call output item(s).
- REQ-002: `OpenAIResponsesRenderer` must treat `nativeToolCallContext.responseOutputItems` as the authoritative prior OpenAI assistant output sequence when present, rendering it exactly once per assistant tool-call message.
- REQ-003: Replayed OpenAI `function_call` items must preserve provider item identity (`id`) and tool-call identity (`call_id`) while replacing stale streamed/partial arguments with the final normalized `ToolCallSpec.arguments`.
- REQ-004: Replayed OpenAI `reasoning` items must preserve provider fields required for continuation, including `id`, `summary`, `encrypted_content` when present, and `status` when present.
- REQ-005: Multiple OpenAI function calls in one assistant tool-call message must not duplicate shared `responseOutputItems`; missing function-call items not present in the captured sequence may still be rendered through the existing fallback function-call rendering path.
- REQ-006: OpenAI Responses request construction must request replayable encrypted reasoning content when the provider/manual-context mode requires it, while preserving user-supplied `include` entries.
- REQ-007: The fix must include executable validation for OpenAI Responses reasoning+tool-call continuation at renderer/request-payload level, and must document/live-gate any network OpenAI validation.
- REQ-008: Existing OpenAI and other provider native tool-call continuation tests must continue to pass.

## Acceptance Criteria

- AC-001: A unit test for `OpenAIResponsesRenderer` passes only when a `responseOutputItems` sequence containing `reasoning -> function_call` renders with the `reasoning` item before the matching `function_call` item.
- AC-002: A provider-native request-payload test verifies captured OpenAI Responses `input` includes the prior `reasoning` item and matching `function_call_output` item, with no duplicate function-call items.
- AC-003: A multi-tool OpenAI Responses test verifies that shared `responseOutputItems` attached to multiple tool calls are rendered once and that tool outputs follow in assistant call order.
- AC-004: The screenshot error string (`provided without its required 'reasoning' item`) is not observed in any focused OpenAI Responses tool-call continuation validation after the fix.
- AC-005: `pnpm exec vitest run tests/unit/llm/prompt-renderers/openai-responses-renderer.test.ts tests/unit/llm/prompt-renderers/provider-native-tool-history-renderers.test.ts tests/unit/llm/api/provider-native-request-payloads.test.ts` passes.
- AC-006: `pnpm exec vitest run tests/integration/agent/provider-native-tool-continuation-flow.test.ts` passes, with OpenAI Responses coverage updated to include reasoning replay.
- AC-007: If a live OpenAI integration test is added or run, it is gated on `OPENAI_API_KEY`, records whether OpenAI returned reasoning output items, and records skip/access failures without leaking secrets.

## Constraints / Dependencies

- Work must remain in dedicated branch/worktree `codex/openai-responses-reasoning-toolcall` at `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-responses-reasoning-toolcall`.
- `.env.test` may exist only as ignored local secret material and must not be committed or printed.
- OpenAI Responses API behavior and SDK types are authoritative for `ResponseReasoningItem`, `ResponseFunctionToolCall`, and `ResponseInputItem` shapes.
- No backward-compatibility shim should keep a rendering path that drops reasoning items when captured OpenAI output items are available.

## Assumptions

- The screenshot run is a native OpenAI Responses API tool-call continuation where the prior assistant output included a required `reasoning` item.
- Tool execution itself succeeded; the failure occurred when AutoByteus submitted the next OpenAI Responses request after tool output.
- Preserving the prior OpenAI output-item sequence is sufficient to satisfy the Responses API requirement for the observed missing-reasoning error.

## Risks / Open Questions

- Live reproduction is model/output dependent; the scratch live `gpt-5.5` runs did not trigger a reasoning item, so deterministic tests must use mocked/captured `responseOutputItems` fixtures.
- The implementation must avoid duplicating `responseOutputItems` when multiple `ToolCallSpec`s each carry the same full OpenAI output sequence.
- Adding `include: ['reasoning.encrypted_content']` by default for OpenAI Responses may modestly increase payload size; implementation should merge with existing caller-provided `include` rather than overwrite it.
- OpenAI `phase` values for assistant output items may also need preservation if present in captured output items, but phase-specific UI behavior is outside this bug unless code inspection during implementation finds it is currently dropped from `responseOutputItems` replay.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-002
- REQ-002 -> UC-001, UC-002, UC-003
- REQ-003 -> UC-001, UC-003, UC-004
- REQ-004 -> UC-001, UC-002
- REQ-005 -> UC-003
- REQ-006 -> UC-001, UC-002
- REQ-007 -> UC-001, UC-002, UC-003
- REQ-008 -> UC-004

## Acceptance-Criteria-To-Scenario Intent

- AC-001 covers the exact renderer-level missing invariant.
- AC-002 covers request-payload shape sent to OpenAI.
- AC-003 covers multi-tool deduplication and order.
- AC-004 covers the user-visible error mode.
- AC-005 covers focused unit regression safety.
- AC-006 covers agent-level native tool-continuation regression safety.
- AC-007 covers live validation transparency without relying on nondeterministic live reasoning output.

## Approval Status

Approved by user on 2026-05-17; ready for design/architecture review.
