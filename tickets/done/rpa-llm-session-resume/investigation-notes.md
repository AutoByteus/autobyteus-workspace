# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated superrepo worktree/branch created before deep investigation. A clean dedicated RPA workspace branch/worktree was also created because the user's referenced RPA checkout is dirty and the likely design spans that repository.
- Current Status: Deep code investigation complete; requirements refined and approved by user; design spec produced and ready for architecture review.
- Investigation Goal: Determine why AutoByteus RPA LLM-backed chats cannot continue after AutoByteus server/agent restart and design a durable session/context resume path across `autobyteus-ts`, `autobyteus-server-ts`, and `autobyteus_rpa_llm_workspace`.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The change spans a TypeScript SDK/runtime boundary and a Python FastAPI service boundary, but it is bounded to the AutoByteus RPA LLM text transport and does not require replacing broader memory, run-history, or UI-integrator systems.
- Scope Summary: Replace transient AutoByteus RPA LLM single-message/session behavior with stable run-scoped conversation identity and transcript-backed resume when the RPA server lacks an active session.
- Primary Questions Resolved:
  - Current LLM invocation path from server-ts/autobyteus-ts to RPA LLM server: GraphQL/server run restore -> AutoByteus agent runtime -> LLM request assembler -> AutobyteusLLM -> AutobyteusClient -> RPA FastAPI server.
  - Current identity sent to RPA LLM server: random `AutobyteusLLM.conversationId`, generated per LLM object construction.
  - Current history availability after restart: restored working context is available in `MemoryManager` through `WorkingContextSnapshotRestoreStep`.
  - Current RPA server contract: `/send-message` and `/stream-message` accept only a single `user_message` plus current media arrays.
  - Narrowest clean target: stable logical `conversation_id` plus message transcript payload; RPA server chooses current-message-only active path vs synthesized resume prompt missing-session path.

## Request Context

User report (2026-04-29): The AutoByteus server-ts / AutoByteus agent uses an AutoByteus RPA model backed by `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace`, similarly to AutoByteus LLM. After chatting for a few messages, shutting down/restarting the server/agent prevents continuing the chat. The server-side LLM instance is considered new because an in-memory session id is gone. `autobyteus-ts` can reconstruct local context from memory, but the client currently sends only the newest user message to the RPA LLM server, so the RPA server treats the post-restart request as a new conversation.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume`
- Task Artifact Folder: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/tickets/done/rpa-llm-session-resume`
- Current Branch: `codex/rpa-llm-session-resume`
- Current Worktree / Working Directory: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-04-29; stale `origin/codex/run-history-show-team-run-id` was pruned.
- Task Branch: `codex/rpa-llm-session-resume` created from `origin/personal` at commit `b7a4e1465b6c0ff684d9cfcefdc26d0b58753835`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- RPA Workspace Context: Original referenced checkout `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace` was on `main` at `8e04d46a9c1fc871aa5c493f614c2274af4d992e`, behind `origin/main`, and contained many modified/untracked files. A clean task worktree was created at `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-llm-session-resume` on `codex/rpa-llm-session-resume` from `origin/main` commit `ad2266da8caa7f82c0b36707c8471d509e0eca2d`.
- Bootstrap Blockers: None for investigation/design. Implementation must avoid the dirty original RPA checkout.
- Notes For Downstream Agents: Coordinate cross-repo edits explicitly. Superrepo artifacts live in the superrepo task worktree; RPA implementation edits should use the clean RPA task worktree.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-29 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && ls -la` in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo` | Bootstrap workspace and repo state | Current repo root is superrepo on branch `personal` tracking `origin/personal`; `.codex/` is untracked; project contains `autobyteus-ts` and `autobyteus-server-ts`. | No |
| 2026-04-29 | Command | `git fetch origin --prune` in superrepo | Refresh tracked remote refs before worktree creation | Fetch completed; one stale remote-tracking branch was pruned. | No |
| 2026-04-29 | Command | `git symbolic-ref refs/remotes/origin/HEAD; git branch -vv --no-abbrev; git worktree list --porcelain` in superrepo | Resolve base branch and existing worktrees | `origin/HEAD` points to `origin/personal`; no matching task worktree existed. | No |
| 2026-04-29 | Command | `git worktree add -b codex/rpa-llm-session-resume ../autobyteus-workspace-superrepo-rpa-llm-session-resume origin/personal` | Create dedicated superrepo ticket branch/worktree | Dedicated worktree created at `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume`. | No |
| 2026-04-29 | Code | `autobyteus-ts/src/llm/api/autobyteus-llm.ts` | Inspect RPA LLM TypeScript client owner | Constructor creates random `conversationId`; `_sendMessagesToLLM` and `_streamMessagesToLLM` render messages then send only `rendered[0]` content/media to `AutobyteusClient`. | Yes, modify |
| 2026-04-29 | Code | `autobyteus-ts/src/llm/prompt-renderers/autobyteus-prompt-renderer.ts` | Verify payload collapse behavior | Renderer scans from the end and returns only the latest `MessageRole.USER` message; all prior restored context is discarded for RPA transport. | Yes, replace renderer shape |
| 2026-04-29 | Code | `autobyteus-ts/src/clients/autobyteus-client.ts` | Inspect HTTP contract | `sendMessage`/`streamMessage` post `conversation_id`, `model_name`, `user_message`, and current media arrays to `/send-message`/`/stream-message`; media normalization is latest-message-only. | Yes, replace text LLM request object |
| 2026-04-29 | Code | `autobyteus-ts/src/agent/llm-request-assembler.ts` | Confirm local context availability before transport | `prepareRequest` appends the current user message to working context and returns full `memoryManager.getWorkingContextMessages()`. | No |
| 2026-04-29 | Code | `autobyteus-ts/src/memory/memory-manager.ts`; `autobyteus-ts/src/memory/working-context-snapshot.ts`; `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts` | Inspect memory/working-context ownership | Working context contains system/user/assistant/tool messages and can be persisted/restored through `WorkingContextSnapshotStore`. | No |
| 2026-04-29 | Code | `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`; `autobyteus-ts/src/memory/memory-manager.ts`; prompt renderers under `autobyteus-ts/src/llm/prompt-renderers/` | Verify tool-call history shape | When parsed tool invocations exist, the raw assistant response is not appended as normal assistant content (`appendToWorkingContext: false`); instead `MemoryManager.ingestToolIntents` appends an assistant `ToolCallPayload`, and `ingestToolResult` appends a separate `tool` message with `ToolResultPayload`. Snapshot serialization preserves `tool_payload`. Existing non-RPA renderers textualize or map these payloads. | Design must require AutoByteus RPA renderer to include tool payload context. |
| 2026-04-29 | Code | `autobyteus-ts/src/agent/bootstrap-steps/agent-bootstrapper.ts`; `working-context-snapshot-restore-step.ts`; `memory/restore/working-context-snapshot-bootstrapper.ts` | Verify restored agents load context | Default bootstrap includes restore step; snapshot bootstrapper reads persisted snapshot when valid before fallback compaction snapshot building. | No |
| 2026-04-29 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Inspect restore lifecycle | `restoreAgentRun` uses run metadata, preserved run id, memory dir, and config to restore the run. | No |
| 2026-04-29 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Inspect AutoByteus standalone backend restore | `restoreBackend` builds a fresh `AgentConfig`/LLM instance, sets memory dir, and calls `agentFactory.restoreAgent(context.runId, built.agentConfig, memoryDir)`. This fresh LLM object causes the random Autobyteus conversation id reset. | No direct server-ts change expected |
| 2026-04-29 | Code | `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Inspect invocation boundary where stable logical identity is available | Handler has `context.agentId` and calls `llmInstance.streamMessages(request.messages, request.renderedPayload, streamKwargs)`. This is the right place to add a generic logical conversation id kwarg for AutoByteusLLM. | Yes, modify |
| 2026-04-29 | Command | `git -C /home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace status --short --branch` | Inspect referenced RPA checkout state | Original RPA checkout was dirty and behind remote; not safe for implementation edits. | No |
| 2026-04-29 | Command | `git -C .../autobyteus_rpa_llm_workspace fetch origin --prune` and `git worktree add -b codex/rpa-llm-session-resume ../autobyteus_rpa_llm_workspace-rpa-llm-session-resume origin/main` | Create clean RPA investigation/implementation workspace | Clean RPA worktree created from `origin/main` at `ad2266da...`. | No |
| 2026-04-29 | Code | `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-llm-session-resume/autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/api/schemas.py` | Inspect RPA server request schema | `SendUserMessageRequest` contains only `conversation_id`, `model_name`, `user_message`, and latest media arrays. | Yes, replace schema |
| 2026-04-29 | Code | `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-llm-session-resume/autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/api/endpoints.py` | Inspect endpoint routing | `/send-message` and `/stream-message` pass the single-message fields directly to `LLMService`; `/cleanup` uses `conversation_id`. | Yes, update endpoints |
| 2026-04-29 | Code | `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-llm-session-resume/autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_service.py` | Inspect RPA session owner | `LLMService` owns in-memory `self.conversations`; missing key creates `RPALLMFactory.create_llm(model_name)`; no message history or model mismatch handling exists. | Yes, modify |
| 2026-04-29 | Code | `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-llm-session-resume/autobyteus_rpa_llm/autobyteus_rpa_llm/llm/rpa_base_llm.py` | Inspect RPA instance state | `_user_message_count` lives in RPA LLM instance and is used to compute current UI response turn index. New instance resets to first turn. | Design must not rely on old count |
| 2026-04-29 | Code | RPA UI integrators including `chatgpt_ui_integrator.py`, `gemini_studio_ui_integrator.py`, `claude_ui_integrator.py` | Inspect whether exact history replay is natural | Integrators start new browser/UI conversation on first use and use message indices/counters to locate responses. They do not expose a native history-loading API. | Resume prompt synthesis is preferable |
| 2026-04-29 | Code | RPA server tests `autobyteus_rpa_llm_server/tests/services/test_llm_service.py` and `tests/e2e/test_endpoints.py` | Identify validation seams | Service tests already monkeypatch factory and media storage for isolated LLM behavior; new resume tests can use the same pattern without live browser dependencies. | Yes, extend tests |
| 2026-04-29 | User clarification | Conversation design discussion | Move tool XML rendering ownership back to TypeScript | User clarified that `autobyteus-ts` already owns/renderers the tool-call XML format; the RPA server should not need parser or sentinel knowledge. RPA server job is active-session latest-message routing or cache-miss flattening of already-rendered role/content messages into one user message. | Update requirements/design: `AutobyteusPromptRenderer` renders structured tool payloads into XML/result content; RPA server flatten-only. |
| 2026-04-29 | User clarification | Conversation design discussion | Refine resume prompt shape | User clarified that cache-miss resume should not introduce a separate `Current user request:` section; it should preserve the original role-ordered message look as much as possible, with the only difference being multiple messages flattened into one RPA user message. The current user turn is represented by the final `User` block. | Update design/requirements to specify flattened transcript shape and forbid a separate current-request heading. |
| 2026-04-29 | User clarification + code read | `autobyteus-ts/src/llm/utils/messages.ts`; `autobyteus-ts/src/memory/memory-manager.ts`; `autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts`; XML usage formatters | Refine tool-call resume design | Earlier clarification established that tool-call information must survive resume and that current memory has structured `ToolCallPayload` / `ToolResultPayload`; XML parser/usage format supports canonical `<tool name="..."><arguments><arg name="...">...</arg></arguments></tool>` shape plus sentinel wrappers for large content/patch examples. Later clarification moved XML rendering ownership to TypeScript because RPA server should not need parser/sentinel knowledge. | Final design: `AutobyteusPromptRenderer` renders structured tool payloads into XML/result content; RPA server flattens already-rendered messages only. |
| 2026-04-30 | Implementation design-impact clarification | Message from `implementation_engineer_6d431c2e3e6e5d07` relaying user clarification | Tighten logical conversation id contract | User clarified that the RPA conversation id should always be provided by the caller. Agent-driven calls use stable `agentId` / restored run identity; direct non-agent callers must provide their own stable id. `AutobyteusLLM` fallback UUID behavior is not desired and conflicts with clean-cut/no-compatibility design. | Update requirements/design to require `kwargs.logicalConversationId`, reject missing id, and forbid generated fallback UUIDs. |
| 2026-04-29 | Code | `autobyteus-ts/tests/unit/llm/prompt-renderers/autobyteus-prompt-renderer.test.ts`; `tests/unit/clients/autobyteus-client.test.ts`; `tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts` | Identify TypeScript validation seams | Existing unit tests can be updated/extended to cover transcript rendering, request object payload, and logical conversation id propagation. | Yes, extend tests |
| 2026-04-29 | Other | User confirmation in current conversation | Confirm requirements direction before design handoff | User agreed with sending messages/context to the RPA server and letting the server decide active-session vs resume usage. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: In server UI/API, a restored run posts a user message to `AgentRunService.resolveAgentRun(...).postUserMessage(...)`; internally the AutoByteus agent receives `LLMUserMessageReadyEvent`.
- Current execution flow:
  1. `autobyteus-server-ts` restores an AutoByteus run by run id and memory dir.
  2. `autobyteus-ts` bootstraps the agent and restores working-context snapshot.
  3. `LLMRequestAssembler` assembles full context messages including the new user message.
  4. `AutobyteusPromptRenderer` returns only the latest user message.
  5. `AutobyteusLLM` sends `conversation_id = randomUUID()` plus that latest message through `AutobyteusClient`.
  6. RPA server `LLMService` looks up its in-memory `conversations[conversation_id]`; if absent, creates a fresh RPA LLM instance.
  7. The fresh RPA LLM instance starts a new browser/UI conversation and receives only the latest user message.
- Ownership or boundary observations:
  - `autobyteus-server-ts` already owns durable run metadata and restore entrypoints.
  - `autobyteus-ts` memory owns the authoritative restored transcript.
  - `AutobyteusLLM` currently owns a transient remote conversation id that must be removed; the remote conversation id must come from explicit `kwargs.logicalConversationId` for every AutoByteus RPA text call.
  - RPA server `LLMService` owns process-local active RPA sessions and is the right owner to decide active-session vs resume-bootstrap behavior because only it knows whether a conversation id exists in its cache.
- Current behavior summary: Restored context exists locally but is discarded at the AutoByteus RPA LLM transport boundary, and the remote key changes on every LLM object reconstruction.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Agent LLM invocation owner | Has `context.agentId`, assembled messages, and stream kwargs. | Add required stable logical conversation id to kwargs here; do not make server-ts bypass LLM internals. |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | Builds full LLM request from memory | Already returns full working context. | Reuse; no need for new memory owner. |
| `autobyteus-ts/src/llm/prompt-renderers/autobyteus-prompt-renderer.ts` | Renders messages for AutoByteus RPA LLM | Currently drops all but latest user message. | Replace with transcript/current-message rendering. |
| `autobyteus-ts/src/llm/api/autobyteus-llm.ts` | AutoByteus RPA LLM transport owner | Generates transient id and sends only latest user message. | Use logical id when provided; send message payload; track used ids for cleanup. |
| `autobyteus-ts/src/clients/autobyteus-client.ts` | HTTP client boundary for RPA LLM server | Positional single-message methods. | Replace with request-object methods for text LLM calls. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Durable run create/restore service | Uses stable run id and memory dir. | No primary change expected; tests may use existing restore behavior. |
| `autobyteus_rpa_llm_server/api/schemas.py` | FastAPI request/response DTOs | Text LLM request is single-message only. | Replace with message-list request contract. |
| `autobyteus_rpa_llm_server/services/llm_service.py` | RPA server active session owner | Uses in-memory dict only; no resume context. | Add session record/model safety and resume prompt path here. |
| `autobyteus_rpa_llm/llm/rpa_base_llm.py` | RPA LLM instance state | `_user_message_count` resets per new instance. | Resume must be a first-turn synthetic prompt for new instances. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-29 | Static trace | Followed restore path through `AgentRunService.restoreAgentRun` -> `AutoByteusAgentRunBackendFactory.restoreBackend` -> `AgentFactory.restoreAgent` -> `WorkingContextSnapshotRestoreStep` -> `LLMUserMessageReadyEventHandler` -> `AutobyteusLLM` -> RPA server `LLMService` | Restored memory and stable run id exist before the transport, but the transport uses a random id and latest-user-only payload. | Fix belongs at AutoByteus LLM transport boundary plus RPA server session owner. |
| 2026-04-29 | Setup | Created clean RPA worktree from `origin/main` | Avoids dirty original checkout. | Downstream implementation can edit RPA repo safely. |

## External / Public Source Findings

No public web sources were needed. All relevant behavior was in local source.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For validation, use unit/service mocks instead of live browser/RPA where possible. Existing Python `test_llm_service.py` monkeypatch patterns are suitable.
- Required config, feature flags, env vars, or accounts: Live E2E still requires `AUTOBYTEUS_API_KEY`; unit/service resume tests should not require it.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Superrepo and RPA worktree creation commands listed in Source Log.
- Cleanup notes for temporary investigation-only setup: None; both task worktrees are intended durable task workspaces until delivery.

## Findings From Code / Docs / Data / Logs

- `autobyteus-ts` has a correct local context reconstruction path; the defect is not missing local memory. Tool-call history is reconstructed as structured `ToolCallPayload` / `ToolResultPayload`, not necessarily as the original raw XML assistant text in working context.
- The AutoByteus RPA prompt renderer intentionally models RPA LLM as stateful remote UI by sending only latest user message; that design fails when the remote session id changes or the server cache is empty.
- RPA server is the right place for active vs resume decision because the TypeScript client cannot know whether the server process/cache still has `conversation_id` active.
- Exact browser session persistence is not currently supported by RPA core/server APIs; resume-by-synthetic-prompt is the clean bounded behavior.

## Constraints / Dependencies / Compatibility Facts

- Clean-cut contract replacement is preferred: remove old single-message text LLM path in source/tests instead of maintaining dual behavior.
- Multimedia image/audio session APIs already use a separate `session_id`; this change is specific to text LLM `/send-message` and `/stream-message`.
- RPA server active sessions remain in-memory; this design does not make browser UI sessions durable across RPA server process restart.
- The existing `MemoryManager` compaction path should remain authoritative for transcript size; do not add an independent RPA-specific memory selection policy.

## Open Unknowns / Risks

- OQ-001: Whether model mismatch should reject or cleanup-and-replace. Requirements recommend explicit reject for safety.
- OQ-002: Whether historical media references should be included, redacted, or counted only. Requirements recommend not embedding historical data URIs.
- OQ-003: Whether any external consumers call RPA server text endpoints or `AutobyteusLLM` directly. The team design policy rejects compatibility wrappers for this in-scope internal contract; direct consumers must update and provide an explicit stable logical conversation id.

## Notes For Architect Reviewer

Focus review on the ownership split:

- `autobyteus-ts` owns stable logical identity propagation from agent run context and transcript rendering from authoritative memory.
- RPA server `LLMService` owns active-session detection and missing-session resume prompt synthesis.
- RPA core/UI integrators should not be asked to persist or replay history turn-by-turn.
