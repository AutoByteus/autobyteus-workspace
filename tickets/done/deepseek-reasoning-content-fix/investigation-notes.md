# Investigation Notes

## Investigation Status

- Bootstrap Status: Pass
- Current Status: Design reworked after architecture review round 2; ready for re-review.
- Investigation Goal: Confirm DeepSeek `reasoning_content` replay requirements, identify the full memory-to-render gap, and choose a concrete provider-gating seam that does not break other OpenAI-compatible LLMs.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The bug is narrow but crosses provider response extraction, agent stream orchestration, memory working-context mutation, provider payload rendering, and test coverage.
- Scope Summary: Preserve assistant reasoning provider-neutrally in memory, but emit DeepSeek's `reasoning_content` extension only from an explicit DeepSeek renderer path.
- Primary Questions Resolved:
  - DeepSeek requires returned `reasoning_content` replay in multi-turn thinking-mode conversations.
  - Tool-call turns drop reasoning today unless the assistant envelope is carried into `MemoryManager.ingestToolIntents(...)`.
  - Unconditional renderer emission risks breaking strict OpenAI-compatible providers.
  - The concrete gating seam will be a named `DeepSeekChatRenderer` subclass/variant that extends `OpenAIChatRenderer` and emits DeepSeek `reasoning_content`; `DeepSeekLLM` assigns that renderer while default OpenAI-compatible clients keep `OpenAIChatRenderer`.

## Request Context

User asked to pick up prior junior work in:

`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/deepseek-reasoning-content-fix/`

Initial prior work identified the renderer omission but scoped the fix too narrowly. A later user challenge asked whether the design could break other OpenAI-compatible LLMs. Architecture review round 2 failed because the provider-gating seam was ambiguous and stale unconditional wording remained.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/deepseek-reasoning-content-fix`
- Current Branch: `fix/deepseek-reasoning-content`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-05-11; branch base matched `origin/personal` at `f706e9878c651251ac362afff297b703b48dc9b0` before ticket edits.
- Task Branch: `fix/deepseek-reasoning-content`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal` / `origin/personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Current source/test implementation was produced before `DeepSeekChatRenderer` provider gating and must be reworked; do not treat the stale implementation handoff or code-review report as current approval.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-11 | Command | `git status --short --branch; git worktree list --porcelain` | Bootstrap branch/worktree state | Worktree is on dedicated ticket branch `fix/deepseek-reasoning-content`. | No |
| 2026-05-11 | Command | `git fetch origin --prune` | Refresh tracked remote refs | Fetch succeeded; base matched `origin/personal`. | No |
| 2026-05-11 | Web | `https://api-docs.deepseek.com/guides/thinking_mode` | Verify DeepSeek contract | DeepSeek thinking-mode docs require multi-turn pass-back of returned `reasoning_content`. | No |
| 2026-05-11 | Code | `autobyteus-ts/src/llm/utils/messages.ts` | Verify internal shape | `Message` has `reasoning_content`; `toDict()` serializes it. | No new internal field needed. |
| 2026-05-11 | Code | `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | Check default renderer wiring | Constructor assigns `this._renderer = new OpenAIChatRenderer()`. This generic renderer must remain non-emitting for DeepSeek reasoning extension fields. | Implementation must preserve generic non-emission. |
| 2026-05-11 | Code | `autobyteus-ts/src/llm/api/deepseek-llm.ts` | Find provider-specific renderer owner | `DeepSeekLLM` extends `OpenAICompatibleLLM` and currently does not override `_renderer`. | It must assign `new DeepSeekChatRenderer()`. |
| 2026-05-11 | Code | `autobyteus-ts/src/llm/api/lmstudio-llm.ts` | Check renderer override precedent | `LMStudioLLM` already replaces protected `_renderer` after `super(...)`. | Supports using same pattern for `DeepSeekLLM`. |
| 2026-05-11 | Code | `autobyteus-ts/src/llm/api/openai-compatible-endpoint-llm.ts` | Check custom endpoint path | It inherits generic `OpenAICompatibleLLM` renderer. | Must remain non-emitting in this task. |
| 2026-05-11 | Code | `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Trace stream orchestration | Handler accumulates `completeResponseText`/`completeReasoningText`; tool-call turns call `ingestToolIntents` and later skip appending `CompleteResponse` to working context. | Pass assistant envelope into memory when tool calls exist. |
| 2026-05-11 | Code | `autobyteus-ts/src/memory/memory-manager.ts` | Inspect memory facade | `ingestToolIntents` is the correct boundary to extend with assistant envelope options. | Keep handler from touching snapshot internals. |
| 2026-05-11 | Code | `autobyteus-ts/src/memory/working-context-snapshot.ts` | Inspect canonical message append | `appendToolCalls` must construct one assistant message with `content`, `reasoning_content`, and `ToolCallPayload`. | Update snapshot append API. |
| 2026-05-11 | Code | `autobyteus-ts/src/llm/prompt-renderers/openai-chat-renderer.ts` | Inspect current implementation state | Current draft helper attaches reasoning whenever present in the base renderer; after provider compatibility concern this must move behind the DeepSeek-specific renderer seam. | Make base renderer non-emitting and put reasoning attachment behind `DeepSeekChatRenderer`. |
| 2026-05-11 | Doc | `tickets/done/deepseek-reasoning-content-fix/design-review-report.md` | Read architecture review round 2 findings | Review failed due ambiguous gating seam, stale unconditional wording, and stale implementation artifacts. | This rework chooses the seam and updates artifacts. |
| 2026-05-11 | Command/Test | `pnpm --dir autobyteus-ts exec vitest run tests/unit/llm/api/openai-compatible-llm.test.ts tests/unit/memory/working-context-snapshot-serializer.test.ts` | Baseline earlier related tests | Existing adjacent tests passed; they did not cover DeepSeekChatRenderer emission or default non-emission. | Add tests per updated ACs. |
| 2026-05-11 | Probe | One-off Node/ts-node memory-to-render probe | Confirm renderer-only fix was insufficient | Assistant tool-call message omitted `reasoning_content` because memory dropped it before rendering. | Memory path must be fixed. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `LLMUserMessageReadyEventHandler` streams a user turn through an `OpenAICompatibleLLM`/`DeepSeekLLM` instance.
- Current execution flow for the failing tool-continuation path:
  1. `OpenAICompatibleLLM._streamMessagesToLLM(...)` extracts streamed DeepSeek `reasoning_content` into `ChunkResponse.reasoning`.
  2. `LLMUserMessageReadyEventHandler` accumulates reasoning and content.
  3. `ApiToolCallStreamingResponseHandler` parses tool calls.
  4. Tool calls are stored via `MemoryManager.ingestToolIntents(...)`.
  5. The final `CompleteResponse` is not appended to working context when parsed tool calls exist.
  6. Therefore the assistant tool-call message must receive the accumulated content/reasoning at the `ingestToolIntents` boundary.
- Current provider-gating flow:
  - `OpenAICompatibleLLM` default renderer construction is `new OpenAIChatRenderer()`.
  - `DeepSeekLLM` currently inherits that default.
  - `LMStudioLLM` shows an established pattern of assigning `this._renderer` after `super(...)`.
- Ownership or boundary observations:
  - Memory owns canonical history; renderer owns provider payload formatting.
  - DeepSeek-specific output policy belongs to `DeepSeekLLM`/renderer configuration, not memory and not request builder.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture evidence summary: The memory/snapshot API needs a small assistant-envelope extension; the renderer boundary needs a named DeepSeek-specific renderer; `DeepSeekLLM` needs explicit DeepSeek renderer wiring.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `working-context-snapshot.ts` | Non-tool assistant append preserves reasoning; tool-call append needs envelope support. | Missing invariant in one append path. | Extend `appendToolCalls`. |
| `memory-manager.ts` | Handler calls memory facade, not snapshot directly. | `ingestToolIntents` is the right boundary. | Add explicit options. |
| `openai-compatible-llm.ts` | Default renderer is `new OpenAIChatRenderer()`. | Default must remain non-emitting. | Keep base renderer default non-emitting and add a DeepSeek-specific renderer. |
| `deepseek-llm.ts` | DeepSeek does not currently opt in. | Provider-specific client must own renderer selection. | Assign DeepSeek-specific renderer. |
| `lmstudio-llm.ts` | Existing protected renderer override pattern exists. | DeepSeek can use same pattern without broad constructor refactor. | Use after-super assignment. |
| Architecture review round 2 | Ambiguous seam and stale wording blocked implementation readiness. | Design must choose one seam and remove contradictions. | Completed in revised design. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/prompt-renderers/openai-chat-renderer.ts` | Generic OpenAI-compatible chat payload formatting | Must remain non-emitting for `reasoning_content` while allowing reuse by a provider-specific renderer. | Generic renderer owns only the common payload shape. |
| `autobyteus-ts/src/llm/api/deepseek-llm.ts` | DeepSeek provider client | Must configure `new DeepSeekChatRenderer()`. | DeepSeek owns provider renderer selection. |
| `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | Base OpenAI-compatible client | Default `new OpenAIChatRenderer()` should remain generic/non-emitting. | No DeepSeek extension by default. |
| `autobyteus-ts/src/llm/api/openai-compatible-endpoint-llm.ts` | User-configured OpenAI-compatible endpoint | Inherits generic non-emitting renderer. | No implicit DeepSeek behavior. |
| `autobyteus-ts/src/llm/api/lmstudio-llm.ts` | LM Studio provider client | Existing renderer override pattern; API-tool mode should keep generic renderer. | Do not emit DeepSeek field to LM Studio. |
| `autobyteus-ts/src/memory/memory-manager.ts` | Memory mutation facade | Needs assistant-envelope options for tool intent ingestion. | Preserve authoritative boundary. |
| `autobyteus-ts/src/memory/working-context-snapshot.ts` | Canonical working-context messages | Needs assistant tool-call envelope support. | Store full assistant message. |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Turn stream orchestration | Owns accumulated content/reasoning and parsed tool-call timing. | Pass envelope to memory. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-11 | Test | `pnpm --dir autobyteus-ts exec vitest run tests/unit/llm/api/openai-compatible-llm.test.ts tests/unit/memory/working-context-snapshot-serializer.test.ts` | 11 adjacent tests passed before rework. | Existing behavior baseline is stable but coverage insufficient. |
| 2026-05-11 | Probe | One-off ts-node script using `MemoryManager`, `ToolInvocation`, `CompleteResponse({ reasoning })`, and `OpenAIChatRenderer` | Tool-call working-context message rendered without reasoning because memory dropped it. | Memory path must preserve assistant envelope. |

## External / Public Source Findings

- Public source: DeepSeek official Thinking Mode guide, `https://api-docs.deepseek.com/guides/thinking_mode`
- Checked: 2026-05-11
- Relevant contract: DeepSeek thinking mode returns `reasoning_content` and requires it to be passed back in multi-turn conversations.
- Why it matters: Confirms provider-specific replay requirement and justifies DeepSeek-only renderer selection.

## Reproduction / Environment Setup

- Deterministic validation needs only Vitest, memory/file-store fixtures, and OpenAI SDK mocks.
- Live validation needs `DEEPSEEK_API_KEY` and a DeepSeek thinking model such as `deepseek-v4-flash` if available.
- No external repos were cloned.

## Findings From Code / Docs / Data / Logs

- `Message.reasoning_content` is the correct internal field.
- The memory path, not renderer state, must preserve assistant reasoning for tool-call turns.
- `OpenAIChatRenderer` must not attach `reasoning_content` by default after the provider compatibility concern.
- Concrete chosen seam: `DeepSeekChatRenderer` extends/reuses the generic OpenAI-compatible renderer and owns `reasoning_content` emission; `DeepSeekLLM` assigns `new DeepSeekChatRenderer()` after `super(...)`.

## Constraints / Dependencies / Compatibility Facts

- OpenAI SDK chat message types do not model DeepSeek's `reasoning_content`; local renderer cast/extension is required only inside the DeepSeek renderer path.
- Default OpenAI-compatible providers may reject unknown fields; default non-emission protects them.
- Custom OpenAI-compatible endpoints are not auto-detected as DeepSeek in this task.

## Open Unknowns / Risks

- Future need: explicit user-configurable reasoning replay for custom DeepSeek-compatible endpoints.
- Live DeepSeek model behavior may change; deterministic tests must be primary.

## Notes For Architect Reviewer

- DR-001 is addressed by choosing the `DeepSeekChatRenderer` + DeepSeekLLM after-super renderer override seam.
- DR-002 is addressed by rewriting stale unconditional guidance in requirements/design and marking stale implementation artifacts.
- DR-003 is addressed by workflow reset and superseding stale implementation/code-review artifacts.
