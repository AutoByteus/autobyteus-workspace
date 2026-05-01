# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; fresh superrepo ticket/worktree created after user instructed not to continue the existing `rpa-llm-session-resume` ticket. Dedicated RPA task worktree also created for this refactor.
- Current Status: Deep investigation complete for the small refactor; requirements refined to design-ready.
- Investigation Goal: Define a targeted refactor that removes visible implementation-specific RPA cache-miss prompt text and moves AutoByteus/RPA visible prompt composition ownership to the RPA server.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: Source changes are expected in one server-ts input processor plus one RPA server cache-miss formatter/service path and their tests. The existing transcript contract, logical conversation id, and provider clients remain intact.
- Scope Summary: Remove AutoByteus-provider special system-prompt prepend from server-ts; make RPA server cache-miss prompt construction neutral, deterministic, and based only on the message array.
- Primary Questions Resolved:
  - First-run old behavior: RPA server previously received one `user_message` and submitted it directly.
  - Current duplicate/wrapper cause: server-ts embeds system prompt into first user content while RPA server also receives a system role message and adds visible resume wrapper/role labels on cache miss.
  - Target classifier: no explicit first-run/resume visible classification; cache hit vs cache miss is enough, and cache-miss visible shape is derived from message array content.

## Request Context

User requested a fresh ticket on 2026-04-30 and explicitly said not to continue the existing `rpa-llm-session-resume` ticket. Through follow-up clarification, user emphasized:

- no weird/internal visible resume messages;
- first-run visible message format should not change;
- AutoByteus provider/server-ts first-turn system prompt insertion was likely an old workaround;
- now that the RPA server receives `messages`, the RPA server should decide how to build one browser-visible user input;
- first run is also a cache miss, so the server should not need a special first-run vs resume flag;
- cache-miss construction should include tool calls/results when they appear in the message array.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git superrepo plus separate RPA workspace git repository.
- Task Workspace Root: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup`.
- Task Artifact Folder: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup/tickets/done/rpa-visible-resume-prompt-cleanup`.
- Current Branch: `codex/rpa-visible-resume-prompt-cleanup`.
- Current Worktree / Working Directory: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin` completed during bootstrap.
- Task Branch: `codex/rpa-visible-resume-prompt-cleanup` from `origin/personal` @ `9068aa22e7d0f796087d49635c44c26d4ec25b6e`.
- RPA Task Workspace Root: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-visible-resume-prompt-cleanup`.
- RPA Task Branch: `codex/rpa-visible-resume-prompt-cleanup` from `origin/codex/rpa-llm-session-resume` @ `e6170b530cb83ae4da1c1e019c73d1b63556c1fd`.
- Expected Base Branch (if known): superrepo `personal`; RPA prior session-resume branch until that feature lands in RPA main.
- Expected Finalization Target (if known): superrepo `personal`; RPA target should follow repo release/integration owner decision.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Do not edit the finalized `rpa-llm-session-resume` ticket. The original RPA checkout is dirty; use the dedicated RPA task worktree.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-30 | Command | `git -C autobyteus-workspace-superrepo-rpa-llm-session-resume status --short --branch` after restore | Honor user instruction not to continue old ticket | Old dedicated ticket worktree restored clean with ticket under `tickets/done/rpa-llm-session-resume` | No |
| 2026-04-30 | Command | `git fetch origin`; `git worktree add -b codex/rpa-visible-resume-prompt-cleanup ... origin/personal` | Bootstrap fresh superrepo task context | Fresh worktree created from `origin/personal` | No |
| 2026-04-30 | Command | `git -C autobyteus_rpa_llm_workspace fetch origin`; `git worktree add -b codex/rpa-visible-resume-prompt-cleanup ... origin/codex/rpa-llm-session-resume` | Bootstrap RPA implementation context | Fresh RPA worktree created from prior transcript-contract branch | No |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` | Check user-reported system prompt customization | `isFirstUserTurn && isAutobyteusModel` prepends `context.llmInstance?.systemMessage ?? context.config?.systemPrompt` to first user message content | Remove this provider-specific branch |
| 2026-04-30 | Code | `autobyteus-ts/src/agent/llm-request-assembler.ts` | Check structured system message path | `ensureSystemPrompt(...)` appends a `MessageRole.SYSTEM` when working context is empty | RPA server can use structured system message on cache miss |
| 2026-04-30 | Code | `autobyteus-ts/src/llm/prompt-renderers/autobyteus-prompt-renderer.ts` | Check payload sent to RPA server | Renderer includes system/user/assistant/tool messages and renders tool payloads into content before transport | RPA server should flatten only content, not parse tools |
| 2026-04-30 | Code | `autobyteus_rpa_llm_server/services/llm_conversation_payload.py` | Locate visible resume wrapper | `build_resume_prompt(...)` adds visible preamble and labels every role, including `System:` | Replace with neutral cache-miss input builder |
| 2026-04-30 | Code | `autobyteus_rpa_llm_server/services/llm_service.py` | Check cache hit/miss routing | `created=True` chooses `prepared_payload.resume_prompt`; cache hit chooses `current_message.content` | Keep cache hit; rename/reframe cache-miss content |
| 2026-04-30 | Test | `autobyteus-server-ts/tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.ts` | Check existing tests for server-ts workaround | Test currently expects AutoByteus first-turn system prepend | Update expectation for ownership cleanup |
| 2026-04-30 | Test | `autobyteus_rpa_llm_server/tests/services/test_llm_service.py` | Check existing RPA cache hit/miss tests | Existing tests assert no `Current user request:` but still allow wrapper/preamble and `System:` | Add/update tests for no preamble, no `System:`, first-call shape |

## Current Behavior / Current Flow

- Current first user input path:
  1. `UserInputMessageEventHandler` receives `UserMessageReceivedEvent`.
  2. It applies sorted input processors from `context.config.inputProcessors`.
  3. `UserInputContextBuildingProcessor` formats context/user requirement and, for first-turn AutoByteus models, prepends the system prompt into `message.content`.
  4. `MemoryIngestInputProcessor` ingests the processed user input into memory.
  5. `LLMUserMessageReadyEventHandler` calls `LLMRequestAssembler.prepareRequest(...)`.
  6. `LLMRequestAssembler.ensureSystemPrompt(...)` also inserts a structured `system` message if working context is empty.
  7. `AutobyteusPromptRenderer` sends structured messages to the RPA server.
- Current RPA cache-miss path:
  1. `LLMService.send_message/stream_message` calls `prepare_conversation_payload(...)`.
  2. `_get_or_create_session(...)` returns `created=True` for cache miss.
  3. `_build_llm_user_message(..., resume=True)` uses `prepared_payload.resume_prompt`.
  4. `build_resume_prompt(...)` prepends visible remote browser session recreation wording and labels roles, including `System:`.
- Current problem summary: ownership is split. server-ts mutates first user content for AutoByteus/RPA, while RPA server now has the structured information needed to compose the browser-visible first input itself.


## Refactor Safety Guardrails

- `UserInputContextBuildingProcessor` has several existing responsibilities that are not part of this cleanup and must be preserved:
  - resolving local/absolute/URL context file paths safely;
  - building readable context blocks from attached context files;
  - applying sender-type headers such as `**[User Requirement]**`, `**[Tool Execution Result]**`, `**[Message From Agent]**`, and `**[System Notification]**`;
  - preserving processed context files on the message;
  - preserving current input-pipeline ordering and memory ingestion behavior.
- The intended server-ts change is narrow: remove the AutoByteus-provider-specific first-turn system-prompt prepend from the final user message content. Do not delete or redesign the processor.
- Existing tests around context files and formatted user requirement blocks are regression guards and should remain meaningful after the patch.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup/autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` | User input/context formatting | Contains AutoByteus-provider-specific system prompt prepend | Remove provider-specific RPA prompt composition from this processor |
| `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup/autobyteus-ts/src/agent/llm-request-assembler.ts` | Build LLM request messages from working context | Inserts structured system role message when needed | Leave unchanged; RPA server can consume this structured message |
| `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup/autobyteus-ts/src/llm/prompt-renderers/autobyteus-prompt-renderer.ts` | Render AutoByteus RPA conversation payload | Converts tool payloads to content and includes role/content messages | Leave unchanged for this small refactor |
| `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-visible-resume-prompt-cleanup/autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_conversation_payload.py` | Validate current message and build cache-miss prompt | Adds visible resume wrapper and `System:` labels | Replace with neutral cache-miss browser input builder |
| `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-visible-resume-prompt-cleanup/autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_service.py` | RPA LLM session cache and invocation routing | `created` selects resume prompt vs current content | Keep routing, but use renamed cache-miss content |

## Runtime / Probe Findings

No live browser reproduction was run for design. Code inspection is sufficient for the design because the visible wrapper string is static and localized in `llm_conversation_payload.py`.

## External / Public Source Findings

Not used.

## Reproduction / Environment Setup

- No live browser/RPA server setup was required for design.
- RPA source workspace was isolated in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-visible-resume-prompt-cleanup`.

## Findings From Code / Docs / Data / Logs

- `UserInputContextBuildingProcessor` branch:
  - `if (isFirstUserTurn && isAutobyteusModel)`
  - `finalContent = `${systemPrompt}\n\n${formattedMessage}``
- `LLMRequestAssembler.ensureSystemPrompt(...)` branch:
  - if no existing working-context messages, append `new Message(MessageRole.SYSTEM, { content: systemPrompt })`.
- `build_resume_prompt(...)` current output starts with:
  - `You are continuing an AutoByteus conversation after the remote browser-backed LLM session was recreated.`
  - `Use the role-ordered transcript below as prior context and answer the final User block.`
  - `Do not replay prior turns or re-execute historical tool calls unless needed for the answer.`
- Git history for RPA commit `e6170b5` shows `llm_conversation_payload.py` was added by the transcript-resume implementation. Before that implementation, RPA service accepted a single `user_message` and directly built `LLMUserMessage(content=user_message, ...)`.

## Constraints / Dependencies / Compatibility Facts

- The clean target should not add compatibility heuristics for old memory snapshots where first user content may already include system prompt. The team design principle rejects compatibility wrappers unless explicitly required.
- The RPA repo main branch does not yet include the prior transcript-contract implementation in this checkout; this ticket's RPA worktree is based on `origin/codex/rpa-llm-session-resume`.

## Open Unknowns / Risks

- OQ-001: Final RPA merge base may need adjustment if `origin/codex/rpa-llm-session-resume` lands into `origin/main` before implementation begins.
- OQ-002: Existing in-progress runs from before the cleanup could have embedded system prompt in user history. No compatibility deduplication is designed.

## Notes For Architect Reviewer

- This is a small ownership correction, not a redesign of logical conversation id or transcript transport.
- Key review point: approve moving RPA-visible prompt composition from server-ts provider-specific input processing into RPA server cache-miss message construction.
