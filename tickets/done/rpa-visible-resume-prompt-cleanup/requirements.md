# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

The AutoByteus RPA/browser-backed LLM cache-miss path must stop showing synthetic implementation text in the browser-visible user prompt. The previous session-resume work changed the RPA server from receiving one `user_message` to receiving `messages` plus `current_message_index`, but the cache-miss formatter now prepends visible text such as `You are continuing an AutoByteus conversation after the remote browser-backed LLM session was recreated...` and formats system messages as visible `System:` blocks. This makes normal first calls and resumed calls look like implementation artifacts.

The target behavior is simple: when the RPA server needs to start a browser session, it constructs one browser-visible user input from the message array it receives. It should not classify the call as a special visible “resume” prompt and should not add weird/meta messages.

## Investigation Findings

- Before the session-resume change, the RPA server text API accepted a single `user_message` and sent that content directly to the browser-backed LLM. Therefore first-run browser-visible formatting was governed by upstream user-message processing, not by RPA server role-label flattening.
- `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` currently has an AutoByteus-provider-specific first-turn branch that prepends the processed system prompt into the first user message content. This was a workaround for the old single-message RPA server contract.
- `autobyteus-ts/src/agent/llm-request-assembler.ts` also places the system prompt into the structured message array as a `system` role message when working context is empty.
- With the new transcript contract, keeping the server-ts AutoByteus-provider-specific prepend and also letting the RPA server flatten system messages risks duplicated system content and misplaced ownership.
- The RPA server cache-miss formatter lives in `autobyteus_rpa_llm_server/services/llm_conversation_payload.py`. Its `build_resume_prompt(...)` currently adds the visible resume preamble and labels all roles, including `System:`.
- The RPA server service uses `created=True` from `_get_or_create_session(...)` to decide whether to send `prepared_payload.resume_prompt`; cache hit still sends only `current_message.content`.
- User clarified the desired model: do not distinguish “first run” vs “cache miss resume” with a special visible prompt. On cache miss, build one user input from all messages through the current message. The message array content naturally determines whether this is first-run-shaped or contains prior turns.
- Resume may include historical tool calls/results. TypeScript already renders tool calls as canonical AutoByteus XML in assistant content and tool results as deterministic text records before transport; the RPA server must preserve those contents, not parse or regenerate them.

## Recommendations

Make a small ownership refactor:

1. Remove only the AutoByteus-provider-specific system-prompt prepend from `UserInputContextBuildingProcessor`; do not rewrite or de-scope the processor's context-file, context-block, sender-header, or message-formatting responsibilities.
2. Let the RPA server own cache-miss browser-visible input construction from the structured message payload.
3. On RPA cache hit, keep sending only `current_message.content` plus current media.
4. On RPA cache miss, build one user input from `messages[0:current_message_index + 1]`:
   - include non-empty system-role content as unlabeled preface content, never as `System:`;
   - if the only non-system message is the current user, append that current user content without a `User:` header, preserving old first-run visible shape;
   - if prior non-system messages exist, format user/assistant/tool blocks in order with `User:`, `Assistant:`, and `Tool:` headers, ending with the current `User:` block;
   - do not add resume preamble, browser-session wording, anti-replay meta instructions, `Prior transcript:`, or `Current user request:`.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- UC-001: New agent/team-member first call using an RPA/browser-backed LLM starts a browser session and shows a normal first prompt, not a resume wrapper.
- UC-002: RPA server cache miss for a restored logical conversation reconstructs prior visible conversation context in one neutral browser-visible input.
- UC-003: RPA server cache hit continues to submit only the current user message because the browser session already has context.
- UC-004: Historical assistant tool calls and tool results remain available in cache-miss reconstruction.

## Out of Scope

- Reopening or editing the finalized `rpa-llm-session-resume` ticket artifacts.
- Changing stable logical conversation id requirements.
- Persisting browser sessions in the RPA server.
- Generic provider UI redesign or provider-specific hidden system/developer instruction channels.
- Replaying historical turns as separate browser UI turns.

## Functional Requirements

- FR-001: Fresh ticket artifacts and implementation handoff must live under `rpa-visible-resume-prompt-cleanup`; the finalized `rpa-llm-session-resume` ticket must not be modified.
- FR-002: `UserInputContextBuildingProcessor` must not prepend system prompt content specially for AutoByteus/RPA provider first turns; the change must preserve its existing context-file resolution, readable context block construction, sender-type headers, context file path safety checks, and user/tool/agent/system input formatting behavior.
- FR-003: The RPA server cache-hit path must continue to send only the selected current user message content/media to the cached RPA LLM instance.
- FR-004: The RPA server cache-miss path must construct one browser-visible user input from the structured messages through `current_message_index`; it must not rely on a separate visible first-run/resume classification.
- FR-005: Cache-miss visible input must include system-role content as unlabeled preface content when present and must never emit a literal `System:` header.
- FR-006: Cache-miss first-call shape with only system plus current user messages must preserve old visible behavior: `<system prompt>\n\n<current user content>` when system exists, or `<current user content>` when it does not. It must not add a `User:` header in this first-call-only shape.
- FR-007: Cache-miss multi-turn shape must preserve non-system role order with role headers for `User:`, `Assistant:`, and `Tool:`, ending at the current user block.
- FR-008: Cache-miss visible input must not include implementation-specific resume preamble/instructions, remote browser session wording, `Prior transcript:`, or `Current user request:`.
- FR-009: Historical tool-call XML and tool-result records must be preserved as already-rendered content in assistant/tool blocks; the RPA server must not parse or regenerate tool payloads.
- FR-010: Tests must cover server-ts input-processor ownership cleanup and RPA server cache-hit/cache-miss visible input formatting.

## Acceptance Criteria

- AC-001: A unit test proves `UserInputContextBuildingProcessor` formats AutoByteus first-turn user content without prepending `context.llmInstance.systemMessage` or `context.config.systemPrompt`, while existing tests for context files, context blocks, sender headers, and first-turn state behavior continue to pass or are updated only for the removed prepend expectation.
- AC-002: A cache-hit RPA service test still receives exactly the current user content, with no prior transcript and no system preface.
- AC-003: A cache-miss first-call RPA service/helper test with `[system, current user]` receives exactly `<system content>\n\n<current user content>` and contains no `System:`, `User:`, or resume preamble.
- AC-004: A cache-miss first-call RPA service/helper test with `[current user]` receives exactly `<current user content>`.
- AC-005: A cache-miss multi-turn RPA service/helper test with `[system, user, assistant, tool, user]` receives unlabeled system content first, then ordered `User:`, `Assistant:`, `Tool:`, final `User:` blocks.
- AC-006: The cache-miss multi-turn content preserves rendered tool XML and tool-result records unchanged.
- AC-007: No production RPA cache-miss formatter emits `You are continuing an AutoByteus conversation`, `remote browser-backed LLM session`, `Do not replay`, `Prior transcript:`, `Current user request:`, or `System:`.
- AC-008: The old `rpa-llm-session-resume` ticket worktree remains clean and is not used for this refactor.

## Constraints / Dependencies

- Authoritative superrepo task workspace: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup`.
- Superrepo branch: `codex/rpa-visible-resume-prompt-cleanup` from `origin/personal`.
- RPA task workspace: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-visible-resume-prompt-cleanup`.
- RPA branch: `codex/rpa-visible-resume-prompt-cleanup` from `origin/codex/rpa-llm-session-resume` because the target code depends on the prior transcript-contract implementation.
- The user's original RPA checkout at `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace` is dirty and must not be used for implementation edits.

## Assumptions

- The prior RPA transcript-contract implementation is the correct base for this cleanup.
- RPA browser providers do not expose a common hidden system/developer instruction channel at the current `LLMUserMessage` boundary; visible prompt construction must therefore be explicit and neutral.
- The system prompt should remain available on cache-miss first calls through the structured `system` message, not through server-ts provider-specific user-message mutation.

## Risks / Open Questions

- OQ-001: Existing runs created before this refactor may have first user messages that already include embedded system prompt content. The clean-cut target does not add compatibility heuristics to detect/deduplicate that legacy shape.
- OQ-002: Large cache-miss transcripts still rely on existing working-context compaction; no new RPA-specific compaction is included.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 |
| --- | --- | --- | --- | --- |
| FR-001 | Yes | Yes | Yes | Yes |
| FR-002 | Yes | Yes | No | No |
| FR-003 | No | No | Yes | No |
| FR-004 | Yes | Yes | No | Yes |
| FR-005 | Yes | Yes | No | No |
| FR-006 | Yes | No | No | No |
| FR-007 | No | Yes | No | Yes |
| FR-008 | Yes | Yes | No | No |
| FR-009 | No | Yes | No | Yes |
| FR-010 | Yes | Yes | Yes | Yes |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | server-ts no longer owns RPA prompt composition |
| AC-002 | active browser session path remains unchanged |
| AC-003 | first call with system prompt preserves old visible shape |
| AC-004 | first call without system prompt preserves exact current-user shape |
| AC-005 | true cache-miss multi-turn reconstruction is neutral and ordered |
| AC-006 | tool-call/tool-result history remains intact |
| AC-007 | visible implementation wrapper is fully removed |
| AC-008 | fresh-ticket isolation |

## Approval Status

Approved by user in conversation on 2026-04-30. User clarified that this should be a fresh simple refactoring ticket, not work on the old ticket; no weird resume messages should be added; first-run visible message format should not change; AutoByteus-provider system prompt composition should move out of the server-ts user-input processor and be owned by the RPA server cache-miss message construction from the structured message array.
