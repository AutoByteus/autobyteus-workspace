# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/tickets/done/rpa-llm-session-resume/requirements.md`
- Upstream Investigation Notes: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/tickets/done/rpa-llm-session-resume/investigation-notes.md`
- Reviewed Design Spec: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/tickets/done/rpa-llm-session-resume/design-spec.md`
- Current Review Round: 5
- Trigger: 2026-04-30 design-impact rework requiring `AutobyteusLLM` to reject missing/invalid `kwargs.logicalConversationId` and removing all generated fallback UUID / instance-identity behavior for AutoByteus RPA text calls.
- Prior Review Round Reviewed: 4
- Latest Authoritative Round: 5
- Current-State Evidence Basis: Re-reviewed the updated requirements, investigation notes, and design spec. Checked the explicit identity requirement, legacy removal policy, ownership map, interface boundary mapping, migration sequence, examples, and implementation guidance. Prior code evidence remains valid: current/legacy `AutobyteusLLM` used constructor-time random identity, `LLMUserMessageReadyEventHandler` has `context.agentId`, server-ts restore preserves the run id, and RPA `LLMService` owns process-local sessions keyed by `conversation_id`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review | N/A | No | Pass | No | Design was actionable; residual implementation risks recorded. |
| 2 | User clarification on cache-miss split/current-message semantics | No unresolved findings from round 1 | No | Pass | No | Clarified `current_message_index` as active selector and cache-miss split point. |
| 3 | User clarification on structured tool payload transport and server-side XML rendering | No unresolved findings from round 2 | No | Pass | No | Superseded by round 4; server-side XML rendering is no longer target ownership. |
| 4 | User correction: TypeScript renders tool XML/result records; RPA server flattens rendered transcript only | No unresolved findings from round 3 | No | Pass | No | Superseded by round 5 only for identity fallback behavior. |
| 5 | User clarification: explicit logical id is required and fallback UUID is forbidden | No unresolved findings from round 4 | No | Pass | Yes | Updated design cleanly removes transient identity fallback for both agent and direct non-agent calls. |

## Reviewed Design Spec

The round 5 design keeps the round 4 ownership split: TypeScript renders the RPA transcript, including historical tool XML/result records; the RPA server routes cache hits or flattens already-rendered role/content messages on cache miss. The material change is identity: AutoByteus RPA text calls must provide a non-empty `kwargs.logicalConversationId`. `AutobyteusLLM` owns validation and translation of that logical id to the RPA HTTP `conversation_id`; it must throw before `AutobyteusClient` is called when the id is missing, empty, or not a string. Agent-driven calls satisfy the contract through `LLMUserMessageReadyEventHandler` using `context.agentId` / restored run id. Direct non-agent callers must provide their own stable logical id. Generated UUID fallback and instance identity are explicitly removed.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No unresolved prior findings | Round 1 decision was Pass with no findings. | N/A |
| 2 | N/A | N/A | No unresolved prior findings | Round 2 decision was Pass with no findings. | N/A |
| 3 | N/A | N/A | No unresolved prior findings; round 3 ownership was superseded | Round 4 corrected tool XML ownership. | N/A |
| 4 | N/A | N/A | No unresolved prior findings; stale fallback UUID notes are superseded | Requirements/design now forbid generated fallback UUIDs and require explicit `logicalConversationId`. | Implementation/docs/validation artifacts that mention direct non-agent fallback UUID behavior must be updated. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Restored agent request with explicit logical identity | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Active RPA server session | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Missing RPA server session flattened transcript resume | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Response return/memory ingestion | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | RPA session lookup/model safety | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| ID-001 | Required identity validation before transport | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` agent runtime | Pass | Pass | Pass | Pass | Correct place to supply `context.agentId` as `logicalConversationId` for agent-driven calls. |
| `autobyteus-ts` AutoByteus RPA LLM transport | Pass | Pass | Pass | Pass | Correctly owns required id validation, transcript rendering, client call, response mapping, and cleanup tracking. |
| `AutobyteusClient` HTTP transport | Pass | Pass | Pass | Pass | Remains a transport facade; it should not invent identity. |
| RPA server API DTOs/endpoints | Pass | Pass | Pass | Pass | Endpoints receive explicit `conversation_id` from TypeScript. |
| RPA server `LLMService` | Pass | Pass | Pass | Pass | Owns cache hit/miss and model safety, not caller identity generation. |
| RPA server conversation payload/helper layer | Pass | Pass | Pass | Pass | Owns current-message selection and transcript flattening only. |
| RPA UI integrators/core LLMs | Pass | Pass | Pass | Pass | Reused unchanged; they receive one `LLMUserMessage` per UI turn. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| TypeScript RPA conversation payload/request types | Pass | Pass | Pass | Pass | Provider-scoped payload file remains the right owner for role/content/media request shape. |
| TypeScript logical id resolver/validator | Pass | Pass | Pass | Pass | Should live with `AutobyteusLLM` because that adapter owns translating invocation metadata to RPA `conversation_id`. |
| TypeScript tool-payload-to-transcript rendering | Pass | Pass | Pass | Pass | Belongs in `AutobyteusPromptRenderer` / renderer-owned helpers. |
| Python current-message selection and cache-miss transcript flattening | Pass | Pass | Pass | Pass | Service-owned helper remains tool-format agnostic. |
| RPA `ConversationSession` record | Pass | Pass | Pass | Pass | Tight session record supports model mismatch guard without introducing persistence. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `logicalConversationId` kwarg | Pass | Pass | Pass | N/A | Pass | Required stable logical identity; no optional/generated fallback meaning remains. |
| `AutobyteusConversationMessage` | Pass | Pass | Pass | Pass | `content` is provider-specific rendered transcript text; it may include historical XML/result records. |
| `AutobyteusConversationPayload` | Pass | Pass | Pass | Pass | `messages` + `current_message_index` remains active selector and cache-miss final-user marker. |
| TypeScript request object / `conversationId` | Pass | Pass | Pass | Pass | Derived from required `logicalConversationId`; not generated by the adapter. |
| Python `SendUserMessageRequest` replacement | Pass | Pass | Pass | Pass | Clean-cut replacement removes `user_message`/top-level media arrays. |
| `ConversationSession` | Pass | Pass | Pass | N/A | Stores exactly active model name and live LLM instance. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| TypeScript positional `sendMessage`/`streamMessage` text calls | Pass | Pass | Pass | Pass | Request-object replacement remains explicit. |
| Python `user_message` text schema | Pass | Pass | Pass | Pass | No dual parsing branch allowed. |
| Latest-user-only renderer output | Pass | Pass | Pass | Pass | Replaced by transcript/current-message renderer. |
| Generated fallback UUID / instance identity in `AutobyteusLLM` | Pass | Pass | Pass | Pass | Explicitly removed for both agent-driven and direct non-agent calls. |
| RPA-server tool parser/XML renderer from round 3 | Pass | Pass | Pass | Pass | Superseded; server flattens rendered role/content only. |
| Raw `conversation_id -> llm` cache values | Pass | Pass | Pass | Pass | Replaced by `ConversationSession` with model guard. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api/autobyteus-conversation-payload.ts` | Pass | Pass | Pass | Pass | Owns TypeScript RPA text payload contract for rendered messages. |
| `autobyteus-ts/src/llm/prompt-renderers/autobyteus-prompt-renderer.ts` | Pass | Pass | Pass | Pass | Owns full transcript rendering, historical media references, historical tool XML, and tool result records. |
| `autobyteus-ts/src/llm/api/autobyteus-llm.ts` | Pass | Pass | Pass | Pass | Owns required `logicalConversationId` validation, client calls, response mapping, and cleanup of used explicit ids. |
| `autobyteus-ts/src/clients/autobyteus-client.ts` | Pass | Pass | Pass | Pass | Owns HTTP serialization/media normalization, not identity fallback or resume routing. |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Pass | Pass | N/A | Pass | Owns turn invocation metadata and supplies `context.agentId`. |
| `autobyteus_rpa_llm_server/.../api/schemas.py` | Pass | Pass | Pass | Pass | Owns API DTOs for rendered message payloads. |
| `autobyteus_rpa_llm_server/.../api/endpoints.py` | Pass | Pass | N/A | Pass | Thin facade after schema change. |
| `autobyteus_rpa_llm_server/.../services/llm_conversation_payload.py` | Pass | Pass | Pass | Pass | Concrete service helper owns current-message validation and role-header flattening of rendered content. |
| `autobyteus_rpa_llm_server/.../services/llm_service.py` | Pass | Pass | Pass | Pass | Existing governing session service remains main owner and delegates flattening detail. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent runtime -> LLM adapter | Pass | Pass | Pass | Pass | Handler passes logical identity through standard LLM kwargs; no server-ts bypass. |
| `AutobyteusLLM` -> renderer/client | Pass | Pass | Pass | Pass | Adapter remains the TypeScript governing boundary and must fail before client call on missing id. |
| `AutobyteusPromptRenderer` -> existing message/tool payload structures | Pass | Pass | Pass | Pass | Renderer may render `ToolCallPayload` / `ToolResultPayload` into RPA transcript content. |
| `AutobyteusClient` -> RPA server HTTP | Pass | Pass | Pass | Pass | Client must not generate identity, inspect memory, or choose resume behavior. |
| FastAPI endpoint -> `LLMService` | Pass | Pass | Pass | Pass | Endpoint must not build sessions or resume prompts. |
| `LLMService` -> payload helper/RPA LLM factory/UI-backed LLM | Pass | Pass | Pass | Pass | Service owns active/missing route and delegates role/content flattening. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent run/agent context | Pass | Pass | Pass | Pass | Server-ts should not set RPA ids directly; agent handler exposes run identity as invocation metadata. |
| `AutobyteusLLM` | Pass | Pass | Pass | Pass | Only adapter translates required logical id into RPA `conversation_id`; no fallback internals remain. |
| `AutobyteusPromptRenderer` | Pass | Pass | Pass | Pass | Tool XML rendering stays behind renderer boundary. |
| `AutobyteusClient` | Pass | Pass | Pass | Pass | HTTP serialization boundary is thin and usable. |
| RPA server `LLMService` | Pass | Pass | Pass | Pass | Endpoint and UI integrator bypass risks are explicitly forbidden. |
| RPA server payload/resume helper | Pass | Pass | Pass | Pass | Helper is internal to service ownership and must not become an identity or tool-format owner. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `logicalConversationId` kwarg | Pass | Pass | Pass | Low | Pass |
| `AutobyteusLLM.resolveConversationId(kwargs)` / equivalent validation | Pass | Pass | Pass | Low | Pass |
| `AutobyteusClient.sendMessage(request)` | Pass | Pass | Pass | Low | Pass |
| `AutobyteusClient.streamMessage(request)` | Pass | Pass | Pass | Low | Pass |
| FastAPI `/send-message` and `/stream-message` | Pass | Pass | Pass | Low | Pass |
| Rendered `messages[].content` DTO | Pass | Pass | Pass | Low | Pass |
| `LLMService.send_message/stream_message` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api` payload/adapter files | Pass | Pass | Low | Pass | Existing LLM adapter area is appropriate for RPA payload and id validation. |
| `autobyteus-ts/src/llm/prompt-renderers` | Pass | Pass | Low | Pass | Existing renderer location; renderer owns rendered transcript content. |
| `autobyteus-ts/src/clients` | Pass | Pass | Low | Pass | Existing RPA HTTP facade. |
| `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/api` | Pass | Pass | Low | Pass | DTO/endpoints stay together. |
| `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services` | Pass | Pass | Medium | Pass | Medium risk is controlled by concrete helper naming/responsibility and by forbidding identity/tool-format ownership here. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Local memory/context with structured tool payloads | Pass | Pass | N/A | Pass | Reuse existing `MemoryManager`/snapshot structures. |
| Stable run identity for agent calls | Pass | Pass | N/A | Pass | Reuse `context.agentId` / restored run id. |
| Required identity validation for RPA direct calls | Pass | Pass | N/A | Pass | `AutobyteusLLM` is the right adapter boundary to reject missing caller-supplied id. |
| RPA transcript/tool rendering | Pass | Pass | N/A | Pass | Extend existing `AutobyteusPromptRenderer`. |
| HTTP transport | Pass | Pass | N/A | Pass | Replace existing client method contract; no identity invention. |
| Active RPA sessions | Pass | Pass | N/A | Pass | Extend existing `LLMService`. |
| Cache-miss transcript flattening | Pass | Pass | Pass | Pass | New server helper is justified because no existing server owner flattens rendered messages into one RPA user message. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| TypeScript text LLM client call shape | No | Pass | Pass | Design rejects optional-history/positional compatibility. |
| Python text request schema | No | Pass | Pass | Design rejects accepting both `user_message` and `messages`. |
| Stable id without transcript | No | Pass | Pass | Rejected as insufficient. |
| Generated fallback UUID / direct-use compatibility | No | Pass | Pass | Rejected; direct non-agent callers must pass stable `logicalConversationId`. |
| Browser session persistence/replay | No | Pass | Pass | Out of scope with explicit semantic resume fallback. |
| RPA-server tool parser/XML rendering from round 3 | No | Pass | Pass | Rejected by final ownership correction. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| TypeScript payload/renderer/client/LLM/handler | Pass | Pass | Pass | Pass |
| Removal of fallback UUID and missing-id rejection | Pass | Pass | Pass | Pass |
| TypeScript tool-payload-to-XML/result content support and tests | Pass | Pass | Pass | Pass |
| Python schemas/endpoints/service/helper | Pass | Pass | Pass | Pass |
| Python flatten-only service tests | Pass | Pass | Pass | Pass |
| Cross-repo tests and endpoint payload updates | Pass | Pass | Pass | Pass |
| Dirty original RPA checkout avoidance | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| TypeScript request payload with explicit id and rendered transcript | Yes | Pass | Pass | Pass | Shows `conversation_id` derived from required logical id and rejects random UUID. |
| Missing-id bad shape | Yes | Pass | Pass | Pass | Design explicitly names missing `logicalConversationId` accepted silently as a bad shape. |
| Active-session no-duplication path | Yes | Pass | Pass | Pass | Correctly avoids replaying prior context to cached UI conversation. |
| Missing-session flattened transcript shape | Yes | Pass | Pass | Pass | Uses role headers and final `User:` block, with no `Current user request:` heading. |
| Boundary bypass avoidance | Yes | Pass | Pass | Pass | Concrete dependency rules remain clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Model mismatch final policy/status details | Same logical id with a different model must not silently mix cached browser state. | Implement explicit rejection as designed/recommended, with tests. HTTP status can be selected during implementation but must be deterministic. | Residual implementation risk, not a design blocker. |
| Historical media text representation | Historical media must not be re-uploaded, but users may benefit from deterministic textual references. | Renderer/resume builder should include only safe type/count references or equivalent deterministic text, never historical data URI replay. | Residual implementation risk, not a design blocker. |
| Current-message index validation | The split/final-current marker is central to both cache-hit and cache-miss behavior. | Implementation must reject invalid indexes and indexes that do not point to a user message; current media comes only from `messages[current_message_index]`. | Residual implementation risk, not a design blocker. |
| Missing/invalid logical id behavior | Prevents accidental transient RPA sessions and direct-call ambiguity. | `AutobyteusLLM` must throw on missing, empty, or non-string `logicalConversationId` before calling `AutobyteusClient`; tests must verify no client call occurs. | Residual implementation risk, not a design blocker. |
| Direct non-agent callers | Direct callers lose implicit transient sessions. | Document/update in-repo direct callers/tests to pass explicit stable ids. External consumers must migrate. | Accepted by clean-cut policy. |
| Tool argument XML ordering and escaping in TypeScript | Deterministic rendered transcript output is required for stable behavior and tests. | TypeScript renderer must choose and test deterministic ordering, XML escaping, and content/patch sentinel wrapping for known large text arguments. | Residual implementation risk, not a design blocker. |
| Historical tool result record format in TypeScript | The recreated RPA LLM needs old tool outcomes without re-executing old tools. | TypeScript renderer must include call id, tool name, result, and error/null status in deterministic result records. | Residual implementation risk, not a design blocker. |
| Cache-miss transcript heading shape | User explicitly rejected a special `Current user request:` heading. | Python flattening must use role headers and make the current turn the final `User:` block. | Residual implementation risk, not a design blocker. |

## Review Decision

- `Pass`: the updated design is ready for implementation/rework.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must follow round 5 as authoritative: no generated UUID fallback or instance identity for AutoByteus RPA text calls.
- `AutobyteusLLM` must validate `kwargs.logicalConversationId` as a non-empty string and throw before calling `AutobyteusClient` when invalid.
- Agent-driven calls must pass `context.agentId` / restored run id through `LLMUserMessageReadyEventHandler`; direct non-agent callers/tests must pass their own stable logical id.
- Cleanup should track and clean the explicit conversation ids actually used; duplicate cleanup attempts should be safe.
- Implementation must continue to follow round 4 tool ownership: TypeScript renderer renders tool XML/result records; RPA server must not parse tool payloads or generate tool XML.
- RPA server cache-miss handling must flatten already-rendered role/content messages only, using role headers; the current turn is the final `User:` block and there must be no separate `Current user request:` section.
- Model mismatch must be explicit and covered by tests; silent reuse is not acceptable.
- Historical media must not be replayed as attachable media. Only current user media from `messages[current_message_index]` should be materialized for UI submission.
- TypeScript tests should cover missing/empty/non-string id rejection and prove no client call occurs. Python/service tests should cover cache-hit no-duplication, flattened transcript shape, current-media-only materialization, invalid-index handling, and model mismatch behavior.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The round 5 design supersedes prior fallback-UUID behavior. It is architecturally cleaner because RPA conversation identity is always supplied by the caller boundary that owns logical continuity, while `AutobyteusLLM` remains the enforcement and translation boundary for the RPA transport.
