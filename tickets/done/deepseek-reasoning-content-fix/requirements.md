# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — design rework after architecture review round 2.

## Goal / Problem Statement

Fix DeepSeek thinking-mode continuation failures where the API returns `reasoning_content` and later rejects the next request with:

`400 The reasoning_content in the thinking mode must be passed back to the API.`

The fix must preserve provider-returned assistant reasoning through Autobyteus' working context for normal and tool-call assistant replies, while avoiding accidental `reasoning_content` emission to OpenAI-compatible providers that do not support DeepSeek's extension field.

## Investigation Findings

- DeepSeek's official thinking-mode documentation says returned assistant `reasoning_content` must be passed back during multi-turn conversation.
- `Message.reasoning_content` already exists as the canonical internal replay field, and snapshot serialization already preserves it.
- Prior renderer-only work was incomplete because tool-call turns store an assistant `ToolCallPayload` message through `MemoryManager.ingestToolIntents(...)` while the final `CompleteResponse` is not appended to the working context when tool calls exist.
- Current code wires `OpenAICompatibleLLM` to `new OpenAIChatRenderer()` by default; `DeepSeekLLM` currently inherits that default renderer. If `OpenAIChatRenderer` emits `reasoning_content` unconditionally, strict OpenAI-compatible providers such as custom endpoints or LM Studio can receive an unknown field.
- Existing code already has a precedent for provider/client renderer override: `LMStudioLLM` assigns `this._renderer` after `super(...)` depending on tool-call mode.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed
- Evidence basis: `WorkingContextSnapshot.appendToolCalls(...)` needs to preserve the assistant envelope (`content`, `reasoning_content`) for tool-call turns. Separately, OpenAI-compatible rendering needs a provider-specific renderer seam so DeepSeek gets replayed reasoning while default OpenAI-compatible clients do not.
- Requirement or scope impact: Scope includes memory/snapshot/handler preservation plus a concrete provider-specific renderer seam: default `OpenAIChatRenderer` omits DeepSeek's extension field; `DeepSeekChatRenderer` emits `reasoning_content`; `DeepSeekLLM` wires only that renderer.

## Recommendations

- Keep memory provider-neutral: store `reasoning_content` on `Message` whenever the assistant reply has it, including assistant tool-call messages.
- Choose one concrete provider-gating seam: add a named `DeepSeekChatRenderer` under `src/llm/prompt-renderers/` that extends `OpenAIChatRenderer` and owns DeepSeek's outbound `reasoning_content` emission policy.
- Keep the default base renderer conservative: `OpenAIChatRenderer` must omit `reasoning_content` by default for all generic OpenAI-compatible clients.
- Wire DeepSeek explicitly: `DeepSeekLLM` must set `this._renderer = new DeepSeekChatRenderer()` after `super(...)`.
- Leave default OpenAI-compatible paths off: `OpenAICompatibleLLM`, `OpenAICompatibleEndpointLLM`, and `LMStudioLLM` API-tool-call mode must continue to use `new OpenAIChatRenderer()` unless a future explicit provider contract is designed.
- Do not reconstruct reasoning in `OpenAICompatibleRequestBuilder`, kwargs, raw traces, or provider-specific memory branches.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

The behavior is narrow but crosses agent stream orchestration, memory working-context mutation, and provider-specific rendering configuration.

## In-Scope Use Cases

- UC-001: DeepSeek thinking-mode non-tool multi-turn conversation replays assistant `reasoning_content` through the configured DeepSeek client path.
- UC-002: DeepSeek thinking-mode tool-continuation turn replays assistant `reasoning_content` on the same assistant message as `tool_calls` through the configured DeepSeek client path.
- UC-003: Default OpenAI-compatible clients do not emit DeepSeek's `reasoning_content` extension even if internal memory contains it.
- UC-004: Working-context snapshot serialization preserves assistant `reasoning_content` with and without `ToolCallPayload`.

## Out of Scope

- Disabling DeepSeek thinking mode.
- Sending `reasoning_content` from every OpenAI-compatible provider by default.
- Adding custom-endpoint UI/configuration for DeepSeek-style reasoning replay. Custom OpenAI-compatible endpoints remain generic non-emitting unless a future task defines explicit provider capability configuration.
- Raw trace schema expansion for reasoning.
- Request-builder reconstruction of provider-specific fields.

## Functional Requirements

- REQ-001: `WorkingContextSnapshot` must preserve assistant `reasoning_content` provider-neutrally for normal assistant messages and assistant tool-call messages.
- REQ-002: `MemoryManager.ingestToolIntent(s)` must accept explicit assistant envelope options and pass them to `WorkingContextSnapshot.appendToolCalls(...)` without callers bypassing the memory boundary.
- REQ-003: `LLMUserMessageReadyEventHandler` must pass accumulated assistant content and reasoning into `MemoryManager.ingestToolIntents(...)` when streamed tool calls are parsed.
- REQ-004: Default `OpenAIChatRenderer.render(...)` must omit `reasoning_content` for assistant messages even when internal `Message.reasoning_content` is present.
- REQ-005: `DeepSeekChatRenderer.render(...)` must emit `reasoning_content` only when the rendered message is an assistant message and source `Message.reasoning_content` is non-null/non-undefined.
- REQ-006: `DeepSeekLLM` must explicitly configure provider reasoning replay by using `new DeepSeekChatRenderer()` for its renderer.
- REQ-007: Default OpenAI-compatible paths (`OpenAICompatibleLLM`, `OpenAICompatibleEndpointLLM`, and LM Studio API-tool-call mode) must not emit `reasoning_content` unless a future explicit provider-capability design opts them in.
- REQ-008: User, system, and tool-result messages must not receive synthetic `reasoning_content` during rendering.
- REQ-009: Validation must include deterministic tests for default non-emission, DeepSeek renderer selection emission, actual `DeepSeekLLM` configured emission, and memory-to-render tool-continuation preservation.
- REQ-010: The live DeepSeek integration test may be conditional on `DEEPSEEK_API_KEY`; deterministic tests remain the primary always-runnable regression guard.

## Acceptance Criteria

- AC-001: `new OpenAIChatRenderer().render(...)` omits `reasoning_content` for assistant messages even when internal `Message.reasoning_content` is present.
- AC-002: `new DeepSeekChatRenderer().render(...)` includes `reasoning_content` for non-tool assistant messages and assistant tool-call messages when internal reasoning is present.
- AC-003: A unit test of the actual configured `DeepSeekLLM` path proves the request payload sent through `sendMessages(...)` or the configured internal renderer includes `reasoning_content` for assistant messages with reasoning.
- AC-004: A unit test of the default `OpenAICompatibleLLM` path proves the request payload omits `reasoning_content` for the same internal assistant message shape.
- AC-005: A deterministic tool-continuation test simulates accumulated assistant content/reasoning plus parsed tool calls, then proves working-context memory preserves `reasoning_content` and the DeepSeek/DeepSeek render path emits it while the default render path omits it.
- AC-006: Snapshot append/serialization tests prove assistant tool-call messages preserve `reasoning_content` without schema migration.
- AC-007: Existing relevant `OpenAICompatibleLLM` reasoning extraction tests still pass.
- AC-008: `pnpm --dir autobyteus-ts exec vitest run` for the added/changed deterministic tests passes locally.
- AC-009: `pnpm --dir autobyteus-ts run build` succeeds or any unrelated pre-existing build blocker is documented.
- AC-010: The live DeepSeek integration test is skipped when credentials are absent or passes when configured; it is not the sole acceptance evidence.

## Constraints / Dependencies

- `Message.reasoning_content` remains the single canonical internal replay field.
- `OpenAIChatRenderer` owns generic OpenAI-compatible payload formatting and must not depend on memory, raw traces, or agent handlers.
- `DeepSeekChatRenderer` owns the DeepSeek-specific extension of the OpenAI-compatible payload shape.
- `DeepSeekLLM` is the provider client that owns selecting the DeepSeek-specific renderer.
- `OpenAICompatibleRequestBuilder` must remain a params assembler and must not reconstruct missing message fields.
- Current ticket branch/worktree: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on `fix/deepseek-reasoning-content`.

## Assumptions

- DeepSeek accepts `reasoning_content` in assistant messages on its OpenAI-compatible chat endpoint for thinking-mode continuation.
- Other OpenAI-compatible providers may reject unknown fields; therefore default non-emission is required.
- Replacing the protected `_renderer` in `DeepSeekLLM` with `new DeepSeekChatRenderer()` after `super(...)` is acceptable because `LMStudioLLM` already uses the same established pattern.

## Risks / Open Questions

- Custom OpenAI-compatible endpoints that are actually DeepSeek-like will remain generic non-emitting in this task; a future explicit provider-capability configuration can select a DeepSeek-style renderer if needed.
- Live DeepSeek behavior and model availability can change; deterministic tests must protect the internal contract.
- Existing implementation and code-review artifacts created before `DeepSeekChatRenderer` provider gating are stale and must be reworked before further review.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 |
| --- | --- | --- | --- | --- |
| REQ-001 | Yes | Yes | No | Yes |
| REQ-002 | No | Yes | No | Yes |
| REQ-003 | No | Yes | No | No |
| REQ-004 | Yes | Yes | Yes | No |
| REQ-005 | Yes | Yes | Yes | No |
| REQ-006 | Yes | Yes | No | No |
| REQ-007 | No | No | Yes | No |
| REQ-008 | Yes | Yes | Yes | No |
| REQ-009 | Yes | Yes | Yes | Yes |
| REQ-010 | Yes | Yes | No | No |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Guards default OpenAI-compatible non-emission. |
| AC-002 | Guards DeepSeek-specific renderer behavior. |
| AC-003 | Guards actual DeepSeek client wiring. |
| AC-004 | Guards actual default OpenAI-compatible client behavior. |
| AC-005 | Guards the full tool-continuation memory-to-render spine. |
| AC-006 | Guards persistence of the canonical internal field. |
| AC-007 | Prevents regression in response-side reasoning extraction. |
| AC-008 | Establishes deterministic local regression coverage. |
| AC-009 | Establishes TypeScript/build compatibility. |
| AC-010 | Provides optional live provider evidence only. |

## Approval Status

Refined after architecture review round 2 fail. Ready for architecture review round 3.
