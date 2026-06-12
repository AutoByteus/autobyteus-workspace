# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

When a user sends a message to an agent-team member with context files attached, the context files are successfully finalized, delivered to the backend runtime, and recorded in the member run trace, but the frontend conversation/monitor UI loses the sent attachment preview immediately after send. Independent-agent sends keep the sent context-file preview visible. The team flow must preserve sent-file visibility in the conversation UI without depending on the selected backend runtime.

## Investigation Findings

- The user-provided team member memory directory contains the finalized image files under `context_files/`, and `raw_traces.jsonl` for the member run records the first user trace with `media.images` pointing at `/rest/team-runs/.../context-files/...` URLs. This confirms backend/runtime receipt is working.
- The frontend message renderer (`autobyteus-web/components/conversation/UserMessage.vue`) displays sent files only from `message.contextFilePaths`.
- The team send store (`autobyteus-web/stores/agentTeamRunStore.ts`) creates a local user message with the draft/finalized attachments, assigns `messageId` and `dedupeKey`, and sends the message over `TeamStreamingService`.
- The team backend publishes a member-input echo as `EXTERNAL_USER_MESSAGE`; the frontend handler dedupes it by `message_id`/`dedupe_key` and replaces the existing local message object fields.
- The backend team member-input event builder (`autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts`) converts `AgentInputUserMessage.contextFiles` by calling `ContextFile.toDict()`, but then only recognizes `path`, `locator`, or `file_path`. `ContextFile.toDict()` actually emits `uri`, `file_type`, `file_name`, and `metadata`. Therefore the team echo's `context_file_paths` becomes empty even though the runtime received the files.
- The frontend external-user-message handler (`autobyteus-web/services/agentStreaming/handlers/externalUserMessageHandler.ts`) overwrites the local message's non-empty `contextFilePaths` with the empty echo `context_file_paths`, making attachments disappear. Independent-agent sends do not hit this team member-input echo path, so their local message remains intact.
- A secondary reload/hydration gap exists: run projection currently exposes user-message `media` but `buildConversationFromProjection` maps user messages to `contextFilePaths: []`. That can make sent user attachments missing after reload, even after the live echo issue is fixed.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Shared Structure Looseness, with a frontend reconciliation invariant gap
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely small targeted refactor/normalizer needed, not a broad subsystem refactor
- Evidence basis: `ContextFile.toDict()` emits `uri`/`file_type`; team member-input builder reads `path`/`locator`/`file_path`; frontend dedupe replacement merges the empty server echo over the richer local sent message.
- Requirement or scope impact: The fix must align the backend team echo contract with the canonical context-file shape and prevent lower-fidelity echoes/hydration from erasing sent attachment metadata.

## Recommendations

- Treat the current `MEMBER_INPUT -> EXTERNAL_USER_MESSAGE -> externalUserMessageHandler` route as a boundary/naming defect, not just a local field bug. A frontend laptop/team send is not an external-channel user message.
- Split or rename the team/local user-input echo path so internal user submissions use a clearly named message/handler such as `USER_INPUT_MESSAGE`, `MEMBER_INPUT_MESSAGE`, or `userInputMessageHandler`; keep true external-channel traffic conceptually separate.
- Fix the authoritative backend team member-input event mapping so it reads canonical `ContextFile` shapes (`uri`, `file_type`, `file_name`) and emits context-file references with non-empty locators.
- Add a frontend reconciliation invariant in the user-input echo handler: when reconciling a server echo with an existing local user message, do not replace non-empty existing `contextFilePaths` with an absent/empty incoming list. This is not a compatibility branch; it preserves richer sent-message state during live dedupe reconciliation.
- Extend hydration mapping so user-message projection media can rehydrate into `contextFilePaths` for historical/reloaded conversations.
- Add focused unit coverage for backend team member-input context-file mapping and frontend dedupe preservation, plus existing independent-agent behavior regression coverage where practical.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Sending a text message with one or more image context files to an independent agent keeps the sent-file preview visible on the user message.
- UC-002: Sending a text message with one or more image or non-image context files to an agent-team member keeps the sent-file metadata/preview visible on the user message after the live team echo arrives.
- UC-003: Team context-file visibility remains runtime-agnostic; selected backend runtime may receive the file but must not control whether the frontend displays sent-file attachments.
- UC-004: Reloading or reconnecting a run/team-member conversation reconstructs sent user attachments from projected persisted state where media/context data exists.

## Out of Scope

- Changing runtime image-processing capability or model behavior.
- Changing the context-file storage layout or REST serving routes.
- Redesigning the file explorer or artifact preview systems.
- Reworking unrelated team communication reference-file rendering.

## Functional Requirements

- REQ-001: A sent team member user message must retain and display its attached context files in the conversation/monitor UI after the composer clears and after the backend internal user-input/member-input echo is processed.
- REQ-002: Internal team/member user-input echoes must use a distinct, accurately named protocol/handler boundary rather than the true external-channel `EXTERNAL_USER_MESSAGE` path.
- REQ-003: Team member-input event mapping must emit context-file references from canonical `ContextFile` domain objects, including objects serialized by `ContextFile.toDict()`.
- REQ-004: Frontend internal user-input echo reconciliation must preserve existing non-empty sent-message attachment metadata when an incoming deduped echo lacks attachment metadata.
- REQ-005: User-message hydration from run projections must map available user media/context references into `UserMessage.contextFilePaths` so reloaded conversations retain visible attachments.
- REQ-006: Team message attachment rendering must be runtime-independent; runtime selection must not affect frontend sent-file visibility when the backend accepted the file.
- REQ-007: The fix must preserve independent-agent context-file behavior and true external-channel message behavior.

## Acceptance Criteria

- AC-001: Given a team run with an attached image context file, when the user sends the message and the team member-input echo arrives, then the message row still includes a `Context files` section/preview for that image and the composer returns to `Context Files (0)` only for the next draft.
- AC-002: Given a team run with a non-image context file, when the user sends the message and the team member-input echo arrives, then the message row still includes a context-file chip for that file.
- AC-003: Given the same team/member run is hydrated from persisted projection data containing user-message media/context references, then the user message shows the attached context-file metadata/preview.
- AC-004: Given an independent agent run with an attached image context file, when the user sends the message, then current behavior remains unchanged and the sent-file preview still appears.
- AC-005: Given multiple backend runtimes are selected for a team member, when context-file sending succeeds, then frontend sent-file visibility remains the same across runtimes.
- AC-006: The websocket/protocol dispatch for normal team/member user-input echoes no longer routes through a handler or event type named for true external-channel messages; true external-channel messages remain supported through their external-channel path.
- AC-007: Focused unit coverage fails on the current team path before the fix and passes after the fix: backend team member-input mapping preserves `ContextFile.toDict()` references; frontend dedupe merge does not erase richer existing attachments; protocol dispatch uses the internal user-input echo path.

## Constraints / Dependencies

- Finalized uploaded context files are served through existing `/rest/runs/:runId/context-files/:storedFilename` and `/rest/team-runs/:teamRunId/members/:memberRouteKey/context-files/:storedFilename` locators.
- The frontend renderer is already built around `UserMessage.contextFilePaths`; the fix should feed this field rather than introducing a second attachment display field.
- Backend runtime delivery is already working; the fix must not change runtime adapter payload semantics except for preserving echo/projection metadata.
- Avoid compatibility wrappers or dual representations. Normalize the existing canonical shapes at the mapping boundaries.

## Assumptions

- `ContextFile.toDict()` is the canonical backend serialized shape for runtime context files.
- The backend team member-input echo is intended to be the server-confirmed representation of the user's member input and may legitimately dedupe with the local optimistic message.
- Projection user-message `media.images/audio/video` entries are valid source data for reconstructing displayable attachments.

## Risks / Open Questions

- Some provider-specific historical projections may not include user media/context references; those cannot be rehydrated without additional persistence work.
- The team event payload currently carries only `{ path, type }`; if exact original display names must be preserved beyond stored filenames, the event contract may need a later `display_name` extension.
- Need implementation confirmation on whether frontend dedupe should preserve local display names when the server echo returns only path/type.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-002 |
| REQ-002 | UC-002, UC-003 |
| REQ-003 | UC-002, UC-003 |
| REQ-004 | UC-002 |
| REQ-005 | UC-004 |
| REQ-006 | UC-003 |
| REQ-007 | UC-001 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Live team image send must keep sent attachments while clearing only the composer draft. |
| AC-002 | Live team non-image send must keep sent attachments. |
| AC-003 | Historical/reloaded user messages must display persisted context/media references. |
| AC-004 | Independent-agent regression guard. |
| AC-005 | Confirms UI visibility is not runtime-specific. |
| AC-006 | Ensures the refactor removes the misleading external-message boundary for local/team sends. |
| AC-007 | Ensures durable/focused coverage catches the exact current failure and the new boundary. |

## Approval Status

Approved by user on 2026-06-11 to kick off the refactoring design. Requirements are refined/design-ready for architecture review.
