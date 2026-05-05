# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/tickets/in-progress/team-communication-messages-ui/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/tickets/in-progress/team-communication-messages-ui/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/tickets/in-progress/team-communication-messages-ui/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/tickets/in-progress/team-communication-messages-ui/design-review-report.md`
- Upstream reroute evidence: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/team-message-referenced-artifacts/api-e2e-design-impact-reroute-artifacts-tab-ownership.md`
- Upstream validation evidence: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/team-message-referenced-artifacts/api-e2e-validation-report.md`

## What Changed

Reworked the current in-ticket implementation to match the authoritative Round 3 Team Communication design, label-hierarchy addendum, and reference-viewer maximize UX addendum.

- Added derived event authority:
  - Added `AgentRunEventType.TEAM_COMMUNICATION_MESSAGE` and `ServerMessageType.TEAM_COMMUNICATION_MESSAGE`.
  - Added `TeamCommunicationMessageProcessor`, registered in the default `AgentRunEventPipeline`.
  - The processor consumes accepted raw `INTER_AGENT_MESSAGE` events and emits one normalized message-centric `TEAM_COMMUNICATION_MESSAGE` per accepted message, with `referenceFiles` as child rows.
  - It does not emit per-file sidecar/reference events and does not scan message prose.
- Repointed persistence/live consumers:
  - `TeamCommunicationService` now persists only normalized `TEAM_COMMUNICATION_MESSAGE` team events.
  - Raw `INTER_AGENT_MESSAGE` remains conversation-display input only.
  - Frontend `TeamStreamingService` routes `TEAM_COMMUNICATION_MESSAGE` to `teamCommunicationStore.upsertFromBackendPayload(...)`; `INTER_AGENT_MESSAGE` no longer upserts the Team Communication store.
- Reworked Team tab UI:
  - Removed the redundant internal Team header.
  - Added Activity-style collapsible `Task Plan` and `Messages` sections; `Messages` is expanded by default.
  - Empty `Task Plan` remains compact and does not consume the primary Team tab height.
  - `TeamCommunicationPanel` now uses an Artifacts-like left message/reference list plus right selected message/file detail pane, with a resizable divider.
  - Left list hierarchy is `Sent` / `Received` -> counterpart member name -> message -> reference file. It intentionally avoids redundant `To <agent>` / `From <agent>` group labels.
  - `TeamCommunicationReferenceViewer` now owns maximize/restore for selected reference-file previews using the Artifacts viewer interaction pattern without importing `ArtifactContentViewer` or artifact display-mode state.
  - Raw/Preview controls remain available while maximized, and Escape restores the normal Team tab split.
- Preserved already-approved ownership cleanup:
  - Agent Artifacts remains produced/touched files only.
  - Team Communication owns inter-agent messages and explicit reference files.
  - Old message-file-reference route/store/event surfaces remain absent.
- Updated durable docs to describe `INTER_AGENT_MESSAGE -> TeamCommunicationMessageProcessor -> TEAM_COMMUNICATION_MESSAGE -> TeamCommunicationService/store` and the revised left-list hierarchy.
- Updated tests for the derived-event boundary, compact Team tab UI, constrained split behavior, and reference-viewer maximize/restore controls.

## Key Files Or Areas

Backend event/projection flow:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-server-ts/src/agent-execution/events/default-agent-run-event-pipeline.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-server-ts/src/agent-execution/events/processors/team-communication/team-communication-message-event-processor.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-server-ts/src/services/team-communication/team-communication-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-server-ts/src/services/agent-streaming/models.ts`

Frontend live/store/UI:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-web/services/agentStreaming/handlers/teamHandler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-web/stores/teamCommunicationStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-web/components/workspace/team/TeamOverviewPanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue`

Tests added/updated:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-server-ts/tests/unit/agent-execution/events/team-communication-message-event-processor.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-server-ts/tests/unit/services/team-communication/team-communication-service.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-server-ts/tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-server-ts/tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-web/stores/__tests__/teamCommunicationStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-web/components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-web/components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts`

## Important Assumptions

- `reference_files` remains the only reference declaration source; message `content` stays natural/self-contained and can mention paths without creating reference records.
- The recipient-visible generated `Reference files:` block remains a runtime input affordance and is not a second metadata source.
- Raw `INTER_AGENT_MESSAGE` remains the conversation-display event and the processor input only.
- `TEAM_COMMUNICATION_MESSAGE` is the only live Team Communication store/projection event.
- There is no compatibility branch for old `MESSAGE_FILE_REFERENCE_DECLARED`, old message-file-reference routes/stores, or Artifacts-tab Sent/Received reference rows.
- Reference maximize state is local to the Team Communication reference viewer and is not shared with Agent Artifacts maximize/zen state.

## Known Risks

- The right-side Team tab is width-constrained; the new split uses a compact default left width and resizable divider, but a manual browser/Electron review at the narrowest supported right-panel width is still recommended downstream.
- Current ticket worktree contains downstream durable validation/report artifacts from the prior pass. They were preserved; this handoff updates the implementation state for a new code-review pass before API/E2E resumes.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature/refactor rework after architecture Round 3 design correction.
- Reviewed root-cause classification: Boundary/ownership issue in the initial direct/raw Team Communication implementation path; raw message events were being treated as Team Communication store authority.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A; Round 3 addendum was implementable locally with no new design blocker.
- Evidence / notes: Store/projection consumers now use `TEAM_COMMUNICATION_MESSAGE`; raw `INTER_AGENT_MESSAGE` is processor input and conversation display only; UI matches the reviewed collapsible/split layout, label hierarchy, and Team-owned reference maximize interaction.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None.
- Legacy old-behavior retained in scope: No.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes; old message-file-reference surfaces remain absent and stale locale keys are gone.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): Yes.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: Yes.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): Yes. No changed source implementation file is above 500 effective non-empty lines.
- Notes: `TeamStreamingService.ts`, `messageTypes.ts`, and `teamCommunicationStore.ts` are existing larger files but remain below the hard guardrail; no compatibility shim was added.

## Environment Or Dependency Notes

- Dependencies were already installed in the task worktree from the previous implementation round.
- Backend Prisma generation had already been prepared; `build:full` passed after this rework.

## Local Implementation Checks Run

Passed:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/events/team-communication-message-event-processor.test.ts tests/unit/services/team-communication/team-communication-service.test.ts tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts --reporter=dot` — 3 files / 7 tests passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts --reporter=dot` — 1 file / 7 tests passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.test.ts tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.test.ts tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/unit/agent-team-execution/send-message-to-tool-argument-parser.test.ts tests/unit/agent-team-execution/inter-agent-message-runtime-builders.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts tests/unit/agent-team-execution/publish-processed-team-agent-events.test.ts tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts tests/unit/agent-execution/events/team-communication-message-event-processor.test.ts tests/unit/services/team-communication/team-communication-service.test.ts tests/unit/services/team-communication/team-communication-content-service.test.ts tests/integration/api/team-communication-api.integration.test.ts tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts tests/unit/services/run-file-changes/run-file-change-service.test.ts tests/unit/services/run-file-changes/run-file-change-projection-store.test.ts tests/unit/run-history/services/run-file-change-projection-service.test.ts tests/unit/agent-execution/events/file-change-event-processor.test.ts tests/integration/api/run-file-changes-api.integration.test.ts --reporter=dot` — 21 files / 82 tests passed.
- `pnpm -C autobyteus-server-ts build:full` — passed.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts components/workspace/team/__tests__/TeamOverviewPanel.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts stores/__tests__/teamCommunicationStore.spec.ts --reporter=dot` — 5 files / 16 tests passed.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts --reporter=dot` — 1 file / 5 tests passed.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts components/workspace/team/__tests__/TeamOverviewPanel.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts stores/__tests__/teamCommunicationStore.spec.ts --reporter=dot` — 5 files / 19 tests passed after the maximize addendum.
- `pnpm -C autobyteus-web exec vitest run components/workspace/agent/__tests__/ArtifactList.spec.ts components/workspace/agent/__tests__/ArtifactsTab.spec.ts components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts components/workspace/team/__tests__/TeamOverviewPanel.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts stores/__tests__/teamCommunicationStore.spec.ts --reporter=dot` — 8 files / 43 tests passed after the maximize addendum.
- `pnpm -C autobyteus-web guard:web-boundary` — passed.
- `pnpm -C autobyteus-web guard:localization-boundary` — passed.
- `pnpm -C autobyteus-web audit:localization-literals` — passed with zero unresolved findings and the existing module-type warning.
- `pnpm -C autobyteus-ts exec vitest run tests/unit/agent/handlers/inter-agent-message-event-handler.test.ts tests/unit/agent-team/handlers/inter-agent-message-request-event-handler.test.ts --reporter=dot` — 2 files / 11 tests passed.
- `pnpm -C autobyteus-ts build` — passed.
- `git diff --check` — passed.
- Stale surface grep: `git grep -n "MESSAGE_FILE_REFERENCE_DECLARED\|messageFileReferencesStore\|message-file-references\|MessageFileReference\|getMessageFileReferences\|message_file_references" -- . ':!tickets' ':!autobyteus-message-gateway/src/infrastructure/adapters/discord-business/discord-thread-context-resolver.ts'` — no matches.
- Raw-store-authority grep: `rg "upsertFromInterAgentPayload|INTER_AGENT_MESSAGE.*teamCommunicationStore|TeamCommunicationService.*INTER_AGENT_MESSAGE" autobyteus-server-ts/src autobyteus-web/components autobyteus-web/services autobyteus-web/stores` — no matches.
- Artifact-boundary grep for maximize addendum: `rg "ArtifactContentViewer|useArtifactContentDisplayModeStore|artifactContentDisplayMode" autobyteus-web/components/workspace/team autobyteus-web/stores/teamCommunicationStore.ts autobyteus-web/services/agentStreaming` — no matches.
- Source size guard over changed source implementation files — no files above 500 effective non-empty lines.

Not run / not claimed:

- Full web-wide `nuxi typecheck`; prior rounds recorded unrelated baseline failures. This handoff does not claim a typecheck pass.

## Downstream Validation Hints / Suggested Scenarios

- Start a team run and verify the Team tab defaults to `Messages` expanded and empty `Task Plan` compact/collapsed.
- Send `send_message_to` with natural content and `reference_files`; verify:
  - recipient conversation still shows exactly the normal inter-agent message;
  - live websocket publishes raw `INTER_AGENT_MESSAGE` for conversation and derived `TEAM_COMMUNICATION_MESSAGE` for Team Communication state;
  - Team Communication list shows `Sent` / `Received` top-level sections with counterpart names only, not repeated `To` / `From` group prefixes;
  - selecting a message shows full content in the right pane;
  - selecting a reference opens the message-owned content route in the right pane.
  - selecting a reference shows a maximize control; maximize opens a full-window Team-owned viewer, Raw/Preview controls remain available, and Escape restores the split.
- Reopen/hydrate a historical team run and verify `getTeamCommunicationMessages(teamRunId)` populates the same store shape.
- Confirm the Agent Artifacts tab still shows only produced/touched files and no Sent/Received message-reference sections.
- Confirm old `MESSAGE_FILE_REFERENCE_DECLARED` and message-file-reference route/store/event paths are absent.

## API / E2E / Executable Validation Still Required

Yes. This implementation should return through code review first, then API/E2E validation should resume against the Round 3 derived-event and Team-tab split behavior.
