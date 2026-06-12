# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-context-files-ui-disappear/tickets/team-context-files-ui-disappear/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-context-files-ui-disappear/tickets/team-context-files-ui-disappear/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-context-files-ui-disappear/tickets/team-context-files-ui-disappear/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-context-files-ui-disappear/tickets/team-context-files-ui-disappear/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-context-files-ui-disappear/tickets/team-context-files-ui-disappear/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-context-files-ui-disappear/tickets/team-context-files-ui-disappear/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review-passed handoff from `code_reviewer` requesting API/E2E coverage investigation and execution for the team context-file UI disappearance bug.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is a bug fix for team member sends with context files. The runtime/backend receipt path already works; the UI must keep sent context-file previews/chips after the internal team member-input echo and after hydration from projection data. The protocol must distinguish internal team/member accepted-input echoes (`MEMBER_INPUT_MESSAGE`) from true external-channel user messages (`EXTERNAL_USER_MESSAGE`). Backend member-input event construction must preserve canonical `ContextFile.toDict()` references (`uri`, `file_type`, `file_name`, `metadata`) into websocket `context_file_paths`, and frontend member-input reconciliation must not erase richer local `contextFilePaths` when an incoming deduped echo has no attachment metadata. User-message projection hydration must map `media.images`, `media.audio`, and `media.video` into `UserMessage.contextFilePaths`. Independent-agent sends and true external-channel routing must remain valid.

Implementation handoff `Legacy / Compatibility Removal Check` was reviewed. It reports no backward-compatibility mechanisms introduced, no retained legacy old behavior, and cleanup of the old `MEMBER_INPUT -> EXTERNAL_USER_MESSAGE` mapping plus lower-fidelity overwrite behavior. Static inspection of changed files matched that report: no dual emission path for member input and no renderer-side compatibility display field were found.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Backend team `MEMBER_INPUT` events emit websocket `MEMBER_INPUT_MESSAGE` instead of `EXTERNAL_USER_MESSAGE`. | Changed / Removed old route | REQ-002, AC-006; design spec protocol split; implementation/code review reports. | Must run server and frontend dispatch coverage proving internal member input uses `MEMBER_INPUT_MESSAGE`, while external-channel messages still use `EXTERNAL_USER_MESSAGE`. |
| Backend member-input event builder preserves canonical `ContextFile.toDict()` refs. | Changed | REQ-003, AC-001/AC-002/AC-007; investigation notes root cause. | Must validate actual `ContextFile` instances and live-ish websocket payloads contain non-empty `context_file_paths` for image and non-image files. |
| Frontend member-input echo reconciliation preserves existing local attachments when incoming echo has none. | Added invariant | REQ-001/REQ-004, AC-001/AC-002. | Must validate dedupe/upsert path and UI renderability with preserved image thumbnail and non-image chip. |
| Incoming non-empty member-input attachment metadata hydrates to `ContextAttachment` types, including lower-case backend type values. | Changed | Design review residual note about lower-case `ContextFileType` values. | Must validate lower-case type hydration and rendering-dependent `ContextAttachment.type`. |
| User projection hydration maps `media.images/audio/video` to `contextFilePaths`; assistant media uses plural `media.images`. | Changed | REQ-005, AC-003; design review residual note. | Must validate projection hydration for user media and assistant plural media regression. |
| Independent-agent local send/external-message behavior remains valid. | Preserved | REQ-007, AC-004; implementation handoff. | Must run independent-agent streaming regression and local user submission/component rendering coverage. |
| True external-channel messages remain routed and projected as `EXTERNAL_USER_MESSAGE`. | Preserved / clarified | REQ-007, AC-006. | Must run server external-channel E2E/unit and frontend external-message regression coverage. |
| Runtime-specific model delivery is not changed. | Preserved | UC-003, REQ-006; runtime receipt already confirmed in upstream raw traces. | Full live multi-runtime LMStudio+Codex E2E is relevant but gated by environment; run the durable skipped/available check and use a deterministic websocket probe for the changed boundary. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-team-execution/services/team-member-input-event-builder.test.ts` | Actual `ContextFile` with lower-case `ContextFileType.IMAGE` becomes event `contextFilePaths: [{ path, type: 'Image' }]`. | REQ-003, AC-001, AC-007. | Still Valid | Directly targets the root backend mapper failure. | Run in final server focused suite. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` member-input mapping cases | `TeamRunEventSourceType.MEMBER_INPUT` converts to `ServerMessageType.MEMBER_INPUT_MESSAGE`; task-agent member input keeps concrete identity; `SEND_MESSAGE` posts to selected member. | REQ-002, AC-006, task-agent/member-input echo path. | Still Valid | Covers protocol split and task-agent/member-input echo routing at backend websocket mapper boundary. | Run in final server focused suite. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts` | Live mixed-runtime team websocket flow now waits for either team communication or `MEMBER_INPUT_MESSAGE` delivery. | UC-003, AC-005, task-agent/member-input echo path. | Still Valid but environment-gated | Test is gated by `RUN_LMSTUDIO_E2E=1`, `RUN_CODEX_E2E=1`, and local Codex/LMStudio availability; no stale assertion found. | Run to record pass/skip status; if skipped, record environment gate and compensate with deterministic probes. |
| `autobyteus-server-ts/tests/e2e/external-channel/external-channel-team-open-delivery.e2e.test.ts` | External channel team ingress/output delivery remains isolated and deduped without leaking worker output. | REQ-007 true external-channel path. | Still Valid | It validates external-channel team behavior separately from member-input protocol. | Run final server E2E focused external-channel test. |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/memberInputMessageHandler.spec.ts` | Deduped `MEMBER_INPUT_MESSAGE` with empty incoming attachments preserves richer local `contextFilePaths`; lower-case incoming image type hydrates to `Image`. | REQ-001, REQ-004, AC-001/AC-002/AC-007. | Still Valid | Directly targets frontend disappearance bug and type normalization. | Run in final web focused suite. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Team websocket dispatch routes external messages to targeted member, identity-less live events do not fallback to focused member, `MEMBER_INPUT_MESSAGE` routes to nested leaf and dedupes, task-agent work-packet echoes create transient contexts. | REQ-002, REQ-007, AC-006, task-agent/member-input echo path. | Still Valid | Covers frontend protocol dispatch for both member-input and external-channel paths. | Run in final web focused suite. |
| `autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts` | Independent-agent external user message projection and standalone `SEND_MESSAGE` identity/context serialization remain valid. | REQ-007, AC-004. | Still Valid | Preserves single-agent/external behavior outside team member-input path. | Run in final web focused suite. |
| `autobyteus-web/services/runHydration/__tests__/runProjectionConversation.spec.ts` | Projection groups replay entries; user `media.images/audio/video` hydrates to `contextFilePaths`; assistant plural `media.images` remains rendered as media segment. | REQ-005, AC-003. | Still Valid | Covers secondary reload/hydration acceptance criterion. | Run in final web focused suite. |
| `autobyteus-web/components/conversation/__tests__/UserMessage.spec.ts` | `UserMessage.vue` renders uploaded image thumbnails and non-image/text chips from `message.contextFilePaths`; error fallback works. | REQ-001, AC-001/AC-002. | Still Valid | Renderer remains data-only and displays normalized attachments if upstream handlers preserve them. | Run final web component coverage. |
| `autobyteus-web/services/runSubmission/__tests__/localUserSubmission.spec.ts` | Local optimistic submitted message receives draft/finalized attachments while composer draft clears separately. | REQ-001, AC-001, AC-004. | Still Valid | Verifies composer clearing does not erase sent message attachments. | Run final web local-submission coverage. |
| `autobyteus-web/components/agentInput/__tests__/ContextFilePathInputArea.spec.ts` | Composer/context-file selection behavior across active team members and draft finalization areas. | Draft attachment setup for AC-001/AC-002. | Still Valid, partially out of changed boundary | Relevant to upstream composer state but not the protocol echo bug. | Not required for final focused execution; existing coverage retained. |
| `autobyteus-server-ts/tests/unit/api/graphql/converters/user-input-converter.test.ts` | GraphQL user input maps context files to `AgentInputUserMessage`. | Runtime receipt/preserved context-file delivery. | Still Valid, adjacent | Validates independent backend context-file conversion but not team websocket echo. | Not required in final focused execution; covered by changed-path tests/probe. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale or obsolete durable coverage was found in the reviewed relevant inventory. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing reviewed durable coverage plus temporary probes are adequate for this API/E2E round. | N/A | No new repository-resident durable coverage will be added by API/E2E unless execution exposes a gap. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | None planned. | N/A | Existing reviewed durable coverage remains current. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TMP-BE-001` | Temporary Vitest probe under `autobyteus-server-ts/tests/.api-e2e-temp/` using `AgentTeamStreamHandler`, a fake subscribed team run, and a real `SEND_MESSAGE` payload with image and non-image context refs. | Backend websocket command-to-team-run conversion keeps image/non-image context refs; emitted `MEMBER_INPUT_MESSAGE` websocket payload includes non-empty `context_file_paths` with usable types. | This is an API/E2E execution harness combining already-reviewed durable unit boundaries; no new production contract beyond existing focused tests. The temp file will be removed after execution. |
| `TMP-FE-001` | Temporary Vitest probe under `autobyteus-web/services/.api-e2e-temp/` composing local optimistic message state, `handleMemberInputMessage`, and `UserMessage.vue` rendering. | A live-like deduped `MEMBER_INPUT_MESSAGE` echo with empty attachments does not erase an existing image thumbnail or non-image chip in rendered UI. | Crosses two existing durable web tests (handler + renderer) to provide execution evidence; it is too task-specific to keep as durable coverage unless future failures require it. The temp file will be removed after execution. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full manual browser/UI send against a running local team with real file upload and selected runtimes. | The changed bug can be proven at the websocket/handler/renderer boundaries without requiring real model/runtime execution; full runtime E2E is environment-gated and can be slow/flaky. | Low-to-medium residual integration risk around app shell/file upload wiring. | Run available durable mixed-runtime E2E to capture skip/pass. Delivery/user verification may perform manual app validation if desired. |
| Multiple selected backend runtimes with real LMStudio + Codex responses. | Existing live mixed runtime E2E is gated by environment variables and local services; this API/E2E round cannot assume LMStudio availability. | Medium for runtime-specific confidence, but upstream evidence says visibility bug is runtime-independent and runtime receipt already works. | Record skip/pass status; no reroute unless available environment fails a valid test. |
| Historical projections that contain no media/context refs. | Upstream accepted residual risk: absent metadata cannot be reconstructed. | None for current requirement because AC-003 requires projections containing media/context refs. | No follow-up. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No ambiguity or reroute trigger found during investigation. | N/A |

## Execution Plan

1. Run focused backend durable coverage: member-input event builder, agent team stream handler, and external-channel team E2E.
2. Run the environment-gated mixed-runtime E2E file to record pass/skip status for live runtime coverage.
3. Run focused frontend durable coverage: member-input handler, TeamStreamingService, AgentStreamingService, run projection hydration, local user submission, and UserMessage rendering.
4. Run temporary backend probe `TMP-BE-001`; remove its temp file immediately after execution.
5. Run temporary frontend probe `TMP-FE-001`; remove its temp file immediately after execution.
6. Run source/build sanity checks where relevant and already known feasible: backend build typecheck (`tsconfig.build.json`) and `git diff --check`. Do not treat known broad frontend/backend test typecheck blockers as final failures unless they affect the changed scope.
7. Write the execution coverage report with exact command outcomes, cleanup, and residual not-tested areas.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Current reviewed durable coverage is valid. API/E2E will add no repository-resident durable coverage in this round unless final execution uncovers a gap. Temporary probes will be used only as execution evidence and removed.
