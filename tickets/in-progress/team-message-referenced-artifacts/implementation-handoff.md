# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/design-spec.md`
- Runtime parser evidence note: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/runtime-investigation-message-reference-parser.md`
- AutoByteus runtime investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/runtime-investigation-autobyteus-reference-files.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/design-review-report.md`
- Prior code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/review-report.md`
- Prior API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/api-e2e-validation-report.md`

## What Changed

- Per the user's checkpoint request, committed the pre-Round-3/Round-4 implementation state first: `46cb7895 Checkpoint team message referenced artifacts`.
- Reworked message-file references to the authoritative Round 4 explicit-reference design:
  - `send_message_to` now accepts optional `reference_files` in Codex, Claude, and AutoByteus/native paths.
  - `content` remains the natural, detailed, self-contained message body; schema and runtime instructions now show email-like examples that may naturally mention important paths while also listing those files in `reference_files`.
  - `reference_files` is the structured attachment/reference list for Sent/Received Artifacts registration, not a replacement for explaining the handoff.
- Added shared server validation/normalization for explicit reference lists:
  - omitted/empty lists become `[]`;
  - strings are trimmed, path separators normalized, and duplicates removed within one tool call;
  - malformed/non-string/relative/URL/protocol/null-byte/route-template-shaped entries fail the whole tool call before delivery with concise `[message-file-reference]` diagnostics.
- Added native AutoByteus validation/normalization and propagation for the same public contract.
- Runtime delivery now carries `referenceFiles` through `InterAgentMessageDeliveryRequest` and emits `INTER_AGENT_MESSAGE.payload.reference_files`.
- Recipient runtime input appends a generated **Reference files:** block when explicit refs exist. This block supplements the self-contained body like an email attachment/index list.
- Local Fix for code-review finding `CR-004-001`: native/AutoByteus agent-recipient routing now constructs `InterAgentMessage` with the original natural `event.content` and carries `event.referenceFiles` separately. `InterAgentMessageReceivedEventHandler` remains the single owner that appends the generated **Reference files:** block for native agent LLM input, preventing duplicate blocks. Sub-team `postMessage` routing still receives the generated block directly because that path does not have an `InterAgentMessage.referenceFiles` hop.
- User-requested Artifacts tab UI polish:
  - Sent/Received groups now render the direction once in the group heading as `To <agent>` or `From <agent>` instead of repeating `Sent to ...` / `Received from ...` under every file.
  - Message-reference rows in grouped Sent/Received sections now show only file names, reducing visual noise for large handoffs.
  - Section headings and counterpart names use darker gray weights for better legibility.
- Round 6 Local Fixes for code-review findings `CR-006-001` through `CR-006-003`:
  - `AutoByteusTeamRunBackend` now owns one native `AgentTeamEventStream` bridge per backend/team run. Native events are converted, enriched, processed through `AgentRunEventPipeline` exactly once, collected into a processed `TeamRunEvent` batch, then fanned out to all registered listeners. Listener subscription no longer creates another native stream or another pipeline pass.
  - `RunFileChangeProjectionStore.writeProjection(...)` now writes `file_changes.json` atomically with same-directory temp-file-plus-rename semantics so readers do not observe partial JSON.
  - The existing Agent Artifacts read/content authority now resolves AutoByteus team-member `file_changes.json` projections for active team members through `RunFileChangeService.getProjectionForTeamMemberRun(...)` and for historical team runs through team metadata plus `TeamMemberMemoryLayout`. This covers GraphQL `getRunFileChanges(runId)` and REST `/runs/:runId/file-change-content` for AutoByteus member run ids.
  - Added deterministic multi-subscriber fanout coverage, atomic-write coverage, active/historical team-member projection-service coverage, and GraphQL+REST integration coverage for historical AutoByteus team-member file artifacts.
- Round 5 AutoByteus runtime parity fix:
  - `AutoByteusTeamRunBackend` now processes converted native team member stream events through the default `AgentRunEventPipeline` before team listener fanout.
  - Converted native `INTER_AGENT_MESSAGE` events are enriched in the AutoByteus team bridge with `team_run_id`, canonical receiver run/name, canonical sender run/name when resolvable, message type/content, and existing `reference_files`.
  - The converter remains conversion-only; provenance enrichment stays in the AutoByteus team bridge where team/member/run context is available.
  - No duplicate inter-agent source event is synthesized. The fanout publishes the converted source event once plus derived sidecar events such as `FILE_CHANGE` and `MESSAGE_FILE_REFERENCE_DECLARED`.
  - `RunFileChangeService` can now observe AutoByteus team run fanout for `FILE_CHANGE` events so AutoByteus team member `file_changes.json` projections are persisted under the existing member memory layout.
- `MessageFileReferenceProcessor` now reads only `INTER_AGENT_MESSAGE.payload.reference_files` and no longer scans `payload.content`.
- Deleted the free-text Markdown/content path parser: `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-paths.ts`.
- Preserved the previously approved team-level Artifacts model:
  - one canonical projection at `agent_teams/<teamRunId>/message_file_references.json`;
  - deterministic dedupe by `teamRunId + senderRunId + receiverRunId + normalizedPath`;
  - team-level content endpoint `/team-runs/:teamRunId/message-file-references/:referenceId/content`;
  - frontend **Agent Artifacts**, **Sent Artifacts**, and **Received Artifacts** split with no raw-path linkification.
- Kept the prior API/E2E Local Fix: active projection/content reads await pending same-team `MessageFileReferenceService` updates so immediate opens can resolve just-declared references.
- Updated docs for the explicit `reference_files` contract, no content-scanning fallback, and self-contained body + attachment-list guidance.

## Key Files Or Areas

- Server send-message contracts and validation:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-dynamic-tool-registration.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-argument-parser.ts`
  - `autobyteus-server-ts/src/services/message-file-references/message-file-reference-explicit-paths.ts`
- Server delivery/event/reference path:
  - `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts`
  - `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-processor.ts`
  - `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-payload-builder.ts`
  - `autobyteus-server-ts/src/services/message-file-references/*`
- AutoByteus/native runtime:
  - `autobyteus-ts/src/agent/message/send-message-to.ts`
  - `autobyteus-ts/src/agent/message/inter-agent-message.ts`
  - `autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts`
  - `autobyteus-ts/src/agent-team/events/agent-team-events.ts`
  - `autobyteus-ts/src/agent-team/handlers/inter-agent-message-request-event-handler.ts`
- AutoByteus team bridge/runtime parity:
  - `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/publish-processed-team-agent-events.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
  - `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts`
  - `autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-store.ts`
  - `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts`
  - `autobyteus-server-ts/src/run-history/services/team-run-metadata-service.ts`
- Frontend typing/docs/UI:
  - `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
  - `autobyteus-web/components/workspace/agent/ArtifactList.vue`
  - `autobyteus-web/components/workspace/agent/ArtifactItem.vue`
  - `autobyteus-web/localization/messages/en/workspace.ts`
  - `autobyteus-web/localization/messages/zh-CN/workspace.ts`
  - `autobyteus-web/docs/agent_artifacts.md`
- Tests added/updated:
  - `autobyteus-server-ts/tests/unit/agent-team-execution/send-message-to-tool-argument-parser.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/events/message-file-reference-processor.test.ts`
  - `autobyteus-server-ts/tests/integration/api/message-file-references-api.integration.test.ts`
  - `autobyteus-server-ts/tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts`
  - `autobyteus-server-ts/tests/integration/api/run-file-changes-api.integration.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/services/run-file-change-projection-service.test.ts`
  - `autobyteus-server-ts/tests/unit/services/run-file-changes/run-file-change-projection-store.test.ts`
  - `autobyteus-web/components/workspace/agent/__tests__/ArtifactList.spec.ts`
  - `autobyteus-ts/tests/unit/agent/message/send-message-to.test.ts`
  - `autobyteus-ts/tests/unit/agent/handlers/inter-agent-message-event-handler.test.ts`
  - `autobyteus-ts/tests/unit/agent-team/handlers/inter-agent-message-request-event-handler.test.ts`

## Important Assumptions

- Only accepted inter-agent messages are in scope as the source for message-file references.
- `reference_files` paths are references to local server/runtime filesystem paths; no bytes are uploaded or copied during delivery.
- File existence/readability checks remain deferred to the persisted-reference content endpoint.
- Paths mentioned only in `content` intentionally do not create Artifacts-tab rows.
- Historical backfill of old message text remains out of scope.
- AutoByteus file-change persistence uses existing `RunFileChangeService` projection ownership and is attached only for AutoByteus team runs because those native team members are not separate server `AgentRun` objects.
- AutoByteus team-member Agent Artifact hydration uses the member run id as the run identity and resolves member memory via active team config or historical team metadata.

## Known Risks

- Agents can still omit `reference_files`; schema and runtime instruction examples now mitigate this by showing complete content plus explicit reference lists.
- Invalid `reference_files` entries reject the whole delivery. This is intentional fail-fast behavior from the reviewed design.
- Referenced content can become unavailable later if the file is deleted, becomes unreadable, or is a directory; the content endpoint returns graceful errors.
- Server project-level `typecheck` remains known-broken by repo config (`tests` included while `rootDir` is `src`); `build:full` passes.
- AutoByteus live `FILE_CHANGE` paths are built by the existing `FileChangePayloadBuilder`; in normal launched team runs workspace IDs are available for relative path canonicalization. The team-run persistence path also canonicalizes against member workspace root metadata before writing `file_changes.json`.
- Historical AutoByteus team-member file-change lookup scans team-run metadata by member run id. This keeps the existing run-scoped GraphQL/REST authority intact without adding a receiver-scoped or team-member-specific compatibility route.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior change plus bounded refactor of an additive feature, followed by bounded AutoByteus runtime parity and Round 6 Local Fix work.
- Reviewed root-cause classification: Boundary Or Ownership Issue plus Legacy/Compatibility Pressure for the old content-scanning source; Round 5 parity issue is a Local Implementation Defect in the AutoByteus team bridge bypassing the default event pipeline; Round 6 findings were Local Fixes for bridge fanout ownership, atomic projection persistence, and existing read/content authority completeness.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now for the Round 4 replacement and Round 6 bridge/read-authority corrections; no architecture redesign required for Round 5/Round 6.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: The implementation uses `reference_files` as the sole declaration authority, deletes the free-text parser, keeps projection/content authority under `services/message-file-references`, leaves frontend conversation rendering/linkification unchanged, restores AutoByteus parity by processing each converted native source event once through the default pipeline before fanout, writes file-change projections atomically, and routes AutoByteus member Agent Artifact GraphQL/REST reads through the existing run-file-change projection/content service boundary.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: `message-file-reference-paths.ts` was deleted. Grep evidence below shows no remaining production/test references to the old parser fallback or receiver-scoped authority.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts`
- Branch: `codex/team-message-referenced-artifacts`
- Base/finalization target: `origin/personal` -> `personal`
- Checkpoint commit before Round 3/Round 4 implementation: `46cb7895 Checkpoint team message referenced artifacts`
- `autobyteus-server-ts` builds against `autobyteus-ts/dist`, so `pnpm -C autobyteus-ts build` was run before the final server build.
- Round 5 AutoByteus runtime parity implementation was performed after commit `e6af228c Fix native reference file block duplication`.
- Round 6 Local Fix implementation builds on reviewed commit `deca3046 Restore AutoByteus team artifact event parity`; final fix commit is recorded in the code-review handoff message.

## Local Implementation Checks Run

Implementation-scoped checks only; API/E2E validation remains downstream.

- Passed: backend targeted unit/integration suite
  ```bash
  pnpm -C autobyteus-server-ts exec vitest run \
    tests/unit/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.test.ts \
    tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts \
    tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.test.ts \
    tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.test.ts \
    tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts \
    tests/unit/agent-execution/events/message-file-reference-processor.test.ts \
    tests/unit/agent-team-execution/send-message-to-tool-argument-parser.test.ts \
    tests/unit/agent-team-execution/inter-agent-message-runtime-builders.test.ts \
    tests/unit/agent-team-execution/member-run-instruction-composer.test.ts \
    tests/unit/agent-team-execution/publish-processed-team-agent-events.test.ts \
    tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts \
    tests/unit/services/message-file-references/message-file-reference-content-service.test.ts \
    tests/unit/services/message-file-references/message-file-reference-identity.test.ts \
    tests/unit/services/message-file-references/message-file-reference-service.test.ts \
    tests/integration/api/message-file-references-api.integration.test.ts
  ```
  Result: `Test Files 15 passed (15); Tests 39 passed (39)`.
- Passed: AutoByteus team runtime parity targeted suite
  ```bash
  pnpm -C autobyteus-server-ts exec vitest run \
    tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts \
    tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts \
    tests/unit/agent-team-execution/publish-processed-team-agent-events.test.ts \
    tests/unit/services/run-file-changes/run-file-change-service.test.ts \
    tests/unit/agent-execution/events/message-file-reference-processor.test.ts \
    tests/unit/agent-execution/events/file-change-event-processor.test.ts
  ```
  Result: `Test Files 6 passed (6); Tests 42 passed (42)`.
- Passed: AutoByteus/native focused tests
  ```bash
  pnpm -C autobyteus-ts exec vitest run \
    tests/unit/agent/message/send-message-to.test.ts \
    tests/unit/agent/message/inter-agent-message.test.ts \
    tests/unit/agent/handlers/inter-agent-message-event-handler.test.ts \
    tests/unit/agent-team/handlers/inter-agent-message-request-event-handler.test.ts \
    tests/unit/agent/agent.test.ts
  ```
  Result: `Test Files 5 passed (5); Tests 29 passed (29)`.
- Passed: AutoByteus/native generated `Reference files:` invariant recheck after Round 5
  ```bash
  pnpm -C autobyteus-ts exec vitest run \
    tests/unit/agent/handlers/inter-agent-message-event-handler.test.ts \
    tests/unit/agent-team/handlers/inter-agent-message-request-event-handler.test.ts
  ```
  Result: `Test Files 2 passed (2); Tests 11 passed (11)`.
- Passed: frontend targeted Nuxt/Vitest regression
  ```bash
  NUXT_TEST=true pnpm -C autobyteus-web exec vitest run \
    components/workspace/agent/__tests__/ArtifactList.spec.ts \
    components/workspace/agent/__tests__/ArtifactsTab.spec.ts \
    components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts \
    stores/__tests__/messageFileReferencesStore.spec.ts \
    services/agentStreaming/__tests__/TeamStreamingService.spec.ts \
    services/runHydration/__tests__/messageFileReferenceHydrationService.spec.ts \
    components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts
  ```
  Result: `Test Files 7 passed (7); Tests 48 passed (48)`.
- Passed: native package build
  - Command: `pnpm -C autobyteus-ts build`
  - Result: passed (`[verify:runtime-deps] OK`).
- Passed: server build
  - Command: `pnpm -C autobyteus-server-ts build:full`
  - Result: passed.
- Passed: frontend boundary guard
  - Command: `pnpm -C autobyteus-web guard:web-boundary`
  - Result: passed.
- Passed: whitespace hygiene
  - Command: `git diff --check`
  - Result: no output.
- Passed: parser/content-scanning/receiver-scope grep evidence
  ```bash
  git grep -n "extractMessageFileReferencePathCandidates\|isValidMessageFileReferencePathCandidate\|message-file-reference-paths" -- autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-server-ts/docs autobyteus-web/docs autobyteus-ts/src autobyteus-ts/tests autobyteus-ts/docs
  git grep -n "payload\.content.*reference\|reference.*payload\.content\|MessageFileReferenceProcessor.*content" -- autobyteus-server-ts/src autobyteus-server-ts/tests
  git grep -n "getMessageFileReferences(teamRunId, receiverRunId)\|members/:receiverRunId/message-file-references\|entriesByReceiver\|Referenced Artifacts\|message_file_references.json.*receiver" -- autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-web
  ```
  Result: no matches for all three grep checks.
- Passed: changed source size guard
  - Result: no changed source implementation file over 500 effective non-empty lines.

- Passed: Round 6 backend targeted suite covering the code-review failed command plus new atomic/read-authority tests
  ```bash
  pnpm -C autobyteus-server-ts exec vitest run \
    tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts \
    tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts \
    tests/unit/agent-team-execution/publish-processed-team-agent-events.test.ts \
    tests/unit/services/run-file-changes/run-file-change-service.test.ts \
    tests/unit/services/run-file-changes/run-file-change-projection-store.test.ts \
    tests/unit/run-history/services/run-file-change-projection-service.test.ts \
    tests/unit/agent-execution/events/message-file-reference-processor.test.ts \
    tests/unit/agent-execution/events/file-change-event-processor.test.ts --reporter=dot
  ```
  Result: `Test Files 8 passed (8); Tests 51 passed (51)`.
- Passed: AutoByteus team-member Agent Artifacts GraphQL/REST integration
  ```bash
  pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/run-file-changes-api.integration.test.ts --reporter=dot
  ```
  Result: `Test Files 1 passed (1); Tests 5 passed (5)`.
- Passed: server build after Round 6
  - Command: `pnpm -C autobyteus-server-ts build:full`
  - Result: passed.
- Passed: AutoByteus/native generated `Reference files:` invariant recheck after Round 6
  ```bash
  pnpm -C autobyteus-ts exec vitest run \
    tests/unit/agent/handlers/inter-agent-message-event-handler.test.ts \
    tests/unit/agent-team/handlers/inter-agent-message-request-event-handler.test.ts --reporter=dot
  ```
  Result: `Test Files 2 passed (2); Tests 11 passed (11)`.
- Passed: whitespace hygiene after Round 6
  - Command: `git diff --check`
  - Result: no output.
- Passed: Artifacts tab UI polish focused tests
  ```bash
  NUXT_TEST=true pnpm -C autobyteus-web exec vitest run \
    components/workspace/agent/__tests__/ArtifactList.spec.ts \
    components/workspace/agent/__tests__/ArtifactsTab.spec.ts --reporter=dot
  ```
  Result: `Test Files 2 passed (2); Tests 8 passed (8)`.
- Passed: whitespace hygiene after UI polish
  - Command: `git diff --check`
  - Result: no output.

## Downstream Validation Hints / Suggested Scenarios

- Codex team runtime: call `send_message_to` with a self-contained body that mentions an important absolute path and `reference_files` listing that same file; verify accepted delivery, generated **Reference files:** recipient block, `INTER_AGENT_MESSAGE.payload.reference_files`, one team-level projection row, immediate content open, and no raw-path linkification.
- Claude team runtime: same scenario through the Claude first-party send-message tool/MCP path.
- AutoByteus/native or mixed AutoByteus member: same scenario through native `SendMessageTo` and server-backed communication context.
- AutoByteus team runtime: verify native `write_file` emits `FILE_CHANGE`, persists the professor/member `file_changes.json`, and does not require converter-owned provenance logic.
- AutoByteus team runtime with multiple subscribers (projection service plus UI/websocket): verify each native source event is processed once before fanout and every subscriber receives the same derived `FILE_CHANGE` batch.
- AutoByteus team-member Agent Artifacts: verify GraphQL `getRunFileChanges(memberRunId)` hydrates rows and REST `/runs/:memberRunId/file-change-content?path=...` serves content for active and historical team-member projections.
- AutoByteus team runtime: verify native `send_message_to.reference_files` emits one converted `INTER_AGENT_MESSAGE`, one derived `MESSAGE_FILE_REFERENCE_DECLARED`, and persists team-level `message_file_references.json`.
- Negative scenario: body contains `/absolute/path/report.md` but `reference_files` is omitted; conversation text remains plain and no `MESSAGE_FILE_REFERENCE_DECLARED`/Artifacts row is created.
- Negative validation: malformed `reference_files` rejects the whole tool call before delivery.
- Persistence/reopen: verify `agent_teams/<teamRunId>/message_file_references.json` is the only message-reference projection and `getMessageFileReferences(teamRunId)` hydrates Sent/Received views.
- UI visual check: in Sent/Received Artifacts, verify the group header shows `To <agent>` / `From <agent>` once and individual rows do not repeat the direction label.

## API / E2E / Executable Validation Still Required

Yes. Downstream API/E2E validation should cover realistic Codex, Claude, and AutoByteus/native accepted delivery paths, REST/GraphQL content behavior, persistence after restart/historical load, frontend Artifacts-tab behavior, and graceful content failures.
