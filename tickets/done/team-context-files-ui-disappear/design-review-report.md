# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-context-files-ui-disappear/tickets/team-context-files-ui-disappear/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-context-files-ui-disappear/tickets/team-context-files-ui-disappear/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-context-files-ui-disappear/tickets/team-context-files-ui-disappear/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer` after user approved the refactoring design on 2026-06-11.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Requirements/investigation package plus direct current-code reads of `team-member-input-event-builder.ts`, `team-run-event-websocket-message-mapper.ts`, `team-member-input-message-payload.ts`, `TeamStreamingService.ts`, `externalUserMessageHandler.ts`, `runProjectionConversation.ts`, `contextAttachmentModel.ts`, `UserMessage.vue`, `ContextFile`, `ContextFileType`, raw-trace projection transformers, and relevant existing tests/docs references.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | No | Pass | Yes | Design is actionable for implementation. |

## Reviewed Design Spec

The design targets the correct boundary failure: internal team/member input echoes are currently mapped to the external-channel websocket type, a backend mapper drops canonical `ContextFile.toDict()` references, and the frontend dedupe merge replaces richer local attachments with an empty echo. The design also includes the related projection hydration gap so live and reloaded user-message display use the same `UserMessage.contextFilePaths` model.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design lines 45-54 classify the work as a bug fix with targeted refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | It names boundary/ownership, shared structure looseness, and missing merge invariant; evidence matches current code: `MEMBER_INPUT -> EXTERNAL_USER_MESSAGE`, `readContextFilePath` missing `uri`, and `externalUserMessageHandler` spreading empty attachments over local state. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says targeted refactor is needed now, not broad subsystem refactor. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Protocol split, backend canonical-field mapping, frontend member-input handler, shared projector, hydration mapping, and tests are all mapped to concrete files. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First review round. | N/A |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Live send to runtime receipt | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Accepted member-input return/event echo | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Historical projection hydration | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend agent-team execution | Pass | Pass | Pass | Pass | Event builder is the right authority for member-input payload completeness. |
| Backend agent streaming protocol | Pass | Pass | Pass | Pass | Mapper/serializer owns websocket type and payload key projection. |
| Frontend agent streaming handlers | Pass | Pass | Pass | Pass | Splitting `memberInputMessageHandler` from true external-channel handling fixes semantic ownership. |
| Frontend run hydration | Pass | Pass | Pass | Pass | Hydration belongs with projection-to-UI mapping, not renderer repair. |
| Frontend context-file utilities | Pass | Pass | Pass | Pass | Reusing `hydrateContextAttachment` avoids a second attachment model. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend payload-to-`UserMessage` projection/upsert | Pass | Pass | Pass | Pass | `userMessageProjection.ts` is justified if it stays low-level and semantic routing stays in separate handlers. |
| Backend `ContextFile` to member-input event refs | Pass | N/A | Pass | Pass | Keep local in event builder unless reuse appears. |
| Projection media to context attachments | Pass | N/A | Pass | Pass | Local hydration helper in `runProjectionConversation.ts` is sufficient. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ContextFile.toDict()` | Pass | Pass | Pass | N/A | Pass | `uri`/`file_type` are correctly treated as canonical backend shape. |
| `TeamRunMemberInputContextFile` | Pass | Pass | Pass | N/A | Pass | The design tightens this to an event ref `{ path, type }`; implementation should explicitly handle lower-case `ContextFileType` enum values from `file_type`. |
| `ContextAttachment` / `UserMessage.contextFilePaths` | Pass | Pass | Pass | N/A | Pass | Single renderer-facing representation is preserved. |
| Projection `media` | Pass | Pass | Pass | N/A | Pass | Hydration should read canonical raw-trace `media.images` plus `audio`/`video`. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Incomplete `readContextFilePath` field assumption | Pass | Pass | Pass | Pass | Replace with canonical `uri` support at event builder. |
| Lower-fidelity overwrite behavior | Pass | Pass | Pass | Pass | Replace with merge invariant in member-input echo path. |
| `MEMBER_INPUT -> EXTERNAL_USER_MESSAGE` mapping | Pass | Pass | Pass | Pass | Clean-cut protocol split; no dual emission. |
| Hardcoded user hydration `contextFilePaths: []` when media exists | Pass | Pass | Pass | Pass | Replace with projection media hydration in this change. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts` | Pass | Pass | N/A | Pass | Correct owner for context-file ref normalization. |
| `autobyteus-server-ts/src/services/agent-streaming/models.ts` / `team-run-event-websocket-message-mapper.ts` | Pass | Pass | N/A | Pass | Correct owner for adding and mapping `MEMBER_INPUT_MESSAGE`. |
| `autobyteus-server-ts/src/services/agent-streaming/team-member-input-message-payload.ts` | Pass | Pass | N/A | Pass | Should remain a thin serializer. |
| `autobyteus-web/services/agentStreaming/handlers/memberInputMessageHandler.ts` | Pass | Pass | Pass | Pass | Correct owner for internal member-input echo reconciliation. |
| `autobyteus-web/services/agentStreaming/handlers/externalUserMessageHandler.ts` | Pass | Pass | Pass | Pass | Keep for true external-channel semantics only. |
| `autobyteus-web/services/agentStreaming/handlers/userMessageProjection.ts` | Pass | Pass | Pass | Pass | Acceptable shared low-level helper, not a semantic catch-all. |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | Pass | Pass | N/A | Pass | Correct owner for historical projection mapping. |
| `UserMessage.vue` | Pass | Pass | N/A | Pass | Design correctly avoids renderer-specific repair. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend event builder | Pass | Pass | Pass | Pass | Depends on backend domain message/context-file semantics, not frontend UI model. |
| Frontend stream handlers | Pass | Pass | Pass | Pass | May share projection helper but not semantic ownership. |
| Renderer | Pass | Pass | Pass | Pass | Depends only on normalized `contextFilePaths`. |
| Runtime adapters | Pass | Pass | Pass | Pass | Explicitly not responsible for sent-file visibility. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `team-member-input-event-builder.ts` | Pass | Pass | Pass | Pass | Mapper owns canonical field conversion before websocket serialization. |
| `memberInputMessageHandler.ts` | Pass | Pass | Pass | Pass | Internal echoes no longer bypass into external-channel handler. |
| `externalUserMessageHandler.ts` | Pass | Pass | Pass | Pass | True external-channel path remains distinct. |
| `runProjectionConversation.ts` | Pass | Pass | Pass | Pass | Components need not inspect raw projection media. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `TeamStreamingService.sendMessage(...)` | Pass | Pass | Pass | Low | Pass |
| `AgentTeamStreamHandler.handleSendMessage` | Pass | Pass | Pass | Low | Pass |
| `buildTeamMemberInputEventPayload` | Pass | Pass | Pass | Low | Pass |
| `MEMBER_INPUT_MESSAGE` websocket type | Pass | Pass | Pass | Low | Pass |
| `handleMemberInputMessage` | Pass | Pass | Pass | Low | Pass |
| `handleExternalUserMessage` | Pass | Pass | Pass | Medium | Pass |
| `buildConversationFromProjection` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services` | Pass | Pass | Low | Pass | Team execution event construction belongs here. |
| `autobyteus-server-ts/src/services/agent-streaming` | Pass | Pass | Low | Pass | Websocket protocol mapping belongs here. |
| `autobyteus-web/services/agentStreaming/handlers` | Pass | Pass | Low | Pass | Handler split improves readability without artificial hierarchy. |
| `autobyteus-web/services/runHydration` | Pass | Pass | Low | Pass | Hydration remains in existing projection boundary. |
| `autobyteus-web/utils/contextFiles` | Pass | Pass | Low | Pass | Reuse existing attachment model utilities. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Attachment hydration | Pass | Pass | N/A | Pass | Reuse `hydrateContextAttachment`. |
| Member-input echo reconciliation | Pass | Pass | Pass | Pass | New split handler is justified by semantic boundary mismatch. |
| Backend context-file event refs | Pass | Pass | N/A | Pass | Extend current builder. |
| Historical hydration | Pass | Pass | N/A | Pass | Extend current mapper. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Protocol route for member input | No | Pass | Pass | Design rejects dual emitting both message types. |
| Renderer attachment model | No | Pass | Pass | Design rejects parallel `media` display path. |
| Backend empty echo behavior | No | Pass | Pass | Design fixes builder and does not rely on frontend-only masking. |
| Existing literal string/path object handling in builder | Yes | Pass | Pass | Acceptable as input normalization at the boundary if implementation still treats `uri`/`file_type` as canonical and tests actual `ContextFile` instances. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Protocol split | Pass | Pass | Pass | Pass |
| Backend context mapping | Pass | Pass | Pass | Pass |
| Frontend live merge | Pass | Pass | Pass | Pass |
| Historical hydration | Pass | Pass | Pass | Pass |
| Focused test updates | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend context-file normalization | Yes | Pass | Pass | Pass | Good exact-root-cause example. |
| Frontend dedupe merge | Yes | Pass | Pass | Pass | Clearly distinguishes empty incoming from non-empty incoming. |
| Hydration mapping | Yes | Pass | Pass | Pass | Implementation should use canonical plural `media.images`. |
| Protocol boundary naming | Yes | Pass | Pass | Pass | `MEMBER_INPUT_MESSAGE` is aligned with `TeamRunEventSourceType.MEMBER_INPUT` and is preferable to continuing `EXTERNAL_USER_MESSAGE`. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Historical projections with no media/context refs | No code can reconstruct absent metadata. | Leave as documented residual risk. | Accepted risk. |
| Exact original display names in server echoes | Server echo currently carries path/type only; display names may be inferred from stored filename. | Keep deferred unless tests/user acceptance require a `display_name` field. | Accepted risk. |
| Lower-case backend `ContextFileType` values | `ContextFile.toDict().file_type` currently emits lower-case enum values while frontend protocol examples/types often use PascalCase. | Implementation should normalize or ensure `hydrateContextAttachment` infers the correct type; include an actual `ContextFile` test. | Non-blocking implementation note. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must update both backend and frontend protocol type unions/dispatch/tests together; otherwise the clean protocol split can fail at compile-time or silently fall through to unhandled messages.
- Hydration should read the canonical raw-trace key `media.images` (plural), plus `audio` and `video`; current frontend assistant media helper appears to read `media.image`, so tests should lock the intended shape for user attachments.
- `ContextFileType` values are lower-case in `autobyteus-ts`; if the websocket payload keeps lower-case `type`, frontend hydration must still produce `ContextAttachment.type === 'Image'` for image previews. The backend or shared frontend projection helper should make this explicit rather than relying accidentally on filename inference.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed to implementation with the approved `MEMBER_INPUT_MESSAGE` protocol split, split/shared handler structure, backend canonical context-file mapping, live merge invariant, and projection hydration in this same change.
