# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/design-review-report.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/code-review-report.md`
- API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/api-e2e-validation-report.md`
- Delivery hold report for AE2E-022: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/delivery-hold-ae2e-022-20260605.md`
- Delivery hold report for DI-001: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/delivery-hold-di-001-20260606.md`

## Current Implementation Basis

This handoff reflects the architecture-review round 8 DI-001 design as authoritative over older implementation, code-review, API/E2E, and delivery artifacts that mentioned row actions, persistent composer cards, or runtime-posted system messages for target UI notification.

Implemented user-facing entrypoint behavior:

- The only manual self-evolution entrypoint is a composer-adjacent CTA with visible copy `Self improve` / `自我改进`.
- Target scope is exposed through tooltip and accessibility copy, not by changing the visible button label:
  - standalone scope: `this run`;
  - team/member scope: `this member's run`.
- Run-history rows no longer expose self-evolution sparkle/star actions or row-owned eligibility/start behavior.
- The composer CTA is hidden when the global capability is disabled, hidden for temporary/helper runs, and hidden until backend eligibility for the selected source run/member is positive.
- Ineligible, old, and pre-snapshot runs do not show technical backend reasons in the chat UI.
- A successful start shows only a short transient toast/status. The composer area does not persist an evolution record id, helper-run navigation button, or green started card.
- The start path remains identity-only: standalone uses `runId`, team/member uses `teamRunId + memberRunId`; no start-time config override is accepted.

Implemented active-target notification behavior:

- Active idle standalone target UI notification is emitted by `SelfEvolutionTargetNotificationService` as a local runtime-neutral `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` on the target `AgentRun`.
- The service no longer calls `activeRun.postUserMessage(new AgentInputUserMessage(..., SenderType.SYSTEM))` merely to render a Web UI notification segment. Runtime/model-consumed skill refresh instruction is not part of the MVP notification path.
- The emitted event shape uses `sender_id: 'system.self_evolution'`, the target `runId`, `statusHint: null`, and concise no-path/no-ID content.
- Standalone `SYSTEM_TASK_NOTIFICATION` websocket messages dispatch through the same `SystemTaskNotificationSegment` conversation path used by team streaming.
- The shared frontend handler lives in `autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts` and is exported through the agent-streaming handler barrel for standalone and team services.
- Active-target notification copy is concise and omits raw skill paths, evolution record IDs, helper run IDs, and implementation details:
  - `Self improve finished for this run.`
  - `Future runs will use any updated skill guidance. No changes may have been made.`

Core backend behavior remains as previously reviewed:

- Self-evolution config remains runtime/run-launch owned only and snapshots into run/member metadata.
- Manual starts use the run/member metadata snapshot and enforce the global capability gate.
- Executable MVP strategies remain `manual_only` trigger plus visible single-agent `run_bash` evolver with `autoExecuteTools: true`.
- The evolver may edit only configured skill roots/packages and primary `SKILL.md` paths.
- Prompt-facing evidence remains anonymized/minimized through the work-history projector; raw trace paths and raw source/target run IDs are not prompt-facing.
- There is no MVP product change-recorder/audit service and no MVP metrics/reporting service.

## Round 7 Rework Inventory

Frontend CTA and row cleanup:

- Modified `autobyteus-web/components/workspace/self-evolution/SelfEvolutionComposerCta.vue`:
  - visible copy changed to concise `Self improve`;
  - hidden-by-default for absent/negative eligibility;
  - generic toast copy for eligibility races instead of backend technical reasons;
  - transient success toast only;
  - removed persistent started-state/card/open-link behavior.
- Deleted obsolete `autobyteus-web/components/workspace/self-evolution/SelfEvolutionStartedState.vue`.
- Kept the active composer wiring in:
  - `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`;
  - `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`.
- Kept run-history row action removal in:
  - `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`;
  - `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`;
  - `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts`.

Streaming/notification path:

- Added `autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts`.
- Modified `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts` so team-specific handlers no longer own system-task notification rendering.
- Modified `autobyteus-web/services/agentStreaming/handlers/index.ts` to export the shared notification handler.
- Modified `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` to dispatch standalone `SYSTEM_TASK_NOTIFICATION` events into conversation segments.
- Modified `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-notification-service.ts` to use concise notification copy without record IDs or raw paths.

## Round 8 DI-001 Rework Inventory

- Replaced the stale runtime-coupled notification implementation in `SelfEvolutionTargetNotificationService` with `activeRun.emitLocalEvent({ eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: activeRun.runId, payload: { sender_id: 'system.self_evolution', content: message }, statusHint: null })`.
- Removed the self-evolution target-notification service imports and usage of `AgentInputUserMessage` / `SenderType.SYSTEM` for UI notification rendering.
- Kept team-member active notification/reload as `next_run_only` in the MVP.
- Kept notification copy concise and removed runtime/model refresh wording; next-run correctness remains the MVP baseline.
- Expanded server notification tests to cover mocked active idle standalone AutoByteus, Codex, and Claude runtime kinds, asserting local event emission and no runtime-posted system message.
- Expanded frontend stream coverage so standalone and team stream services both prove `SYSTEM_TASK_NOTIFICATION` payloads render as `system_task_notification` conversation segments.

Localization/docs/tests:

- Updated EN/ZH localization for the concise CTA, scoped tooltip/aria copy, generic ineligible toast, and transient started toast.
- Removed stale row-action and persistent-started-state localization keys; added a cleanup regression test.
- Updated durable docs to describe the composer-only CTA, hidden ineligible state, transient start status, row-action removal, and standalone/team notification segment rendering.
- Added/updated focused tests for:
  - concise standalone and team/member CTA copy/scope;
  - hidden ineligible/pre-snapshot CTA without technical chat copy;
  - generic ineligible start-race toast;
  - no persistent started-state/open-helper UI;
  - standalone and team system-task notification segment dispatch;
  - local runtime-neutral active-target notification event emission for AutoByteus/Codex/Claude without runtime-posted `SenderType.SYSTEM`;
  - concise active-target notification copy without IDs/paths;
  - stale localization key cleanup.

## Key Files Or Areas

Server implementation and tests:

- `autobyteus-server-ts/src/self-evolution/domain/models.ts`
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts`
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-record-lifecycle.ts`
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-skill-target-resolver.ts`
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-evidence-builder.ts`
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-work-history-projector.ts`
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-notification-service.ts`
- `autobyteus-server-ts/src/self-evolution/services/strategies/single-agent-evolver-strategy.ts`
- `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-effective-config-resolver.test.ts`
- `autobyteus-server-ts/tests/self-evolution/manual-trigger-strategy.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-graphql-converters.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-graphql-resolver.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-work-history-projector.test.ts`
- `autobyteus-server-ts/tests/self-evolution/single-agent-evolver-strategy.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-target-notification-service.test.ts`

Frontend implementation and tests:

- `autobyteus-web/stores/selfEvolutionStore.ts`
- `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue`
- `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`
- `autobyteus-web/components/workspace/config/MemberOverrideItem.vue`
- `autobyteus-web/components/workspace/config/MemberOverrideTree.vue`
- `autobyteus-web/components/workspace/self-evolution/SelfEvolutionComposerCta.vue`
- `autobyteus-web/components/workspace/self-evolution/selfEvolutionComposerCtaTarget.ts`
- `autobyteus-web/components/workspace/self-evolution/__tests__/SelfEvolutionComposerCta.spec.ts`
- `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`
- `autobyteus-web/components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts`
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts`
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
- `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
- `autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts`
- `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts`
- `autobyteus-web/services/agentStreaming/handlers/index.ts`
- `autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts`
- `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
- `autobyteus-web/localization/messages/en/workspace.ts`
- `autobyteus-web/localization/messages/zh-CN/workspace.ts`
- `autobyteus-web/localization/messages/__tests__/workspaceHistorySelfEvolutionCleanup.spec.ts`

Docs:

- `autobyteus-server-ts/docs/modules/self_evolution.md`
- `autobyteus-web/docs/agent_execution_architecture.md`
- `autobyteus-web/docs/skills.md`
- `autobyteus-web/docs/settings.md`
- `autobyteus-web/docs/agent_management.md`
- `autobyteus-web/docs/agent_teams.md`

## Important Assumptions / Constraints

- The feature remains globally disabled by default.
- Launch-form self-evolution controls are runtime/run-launch controls only; no agent/team definition config fields are introduced.
- Old runs without effective-config snapshots remain ineligible and are hidden by the composer CTA.
- UI copy must not imply helper completion proves a quality improvement.
- Manual Git inspection/revert remains the MVP review surface for direct skill edits.
- Exact historical skill binding snapshots remain deferred as an accepted MVP risk.
- Delivery still owns branch refresh/rebase against `origin/personal`.

## Task Design Health Assessment Implementation Check

- Change posture: Local Fix / UX behavior correction after architecture-review round 7 plus DI-001 notification-boundary correction after architecture-review round 8.
- Root-cause classification: Boundary Or Ownership Issue for DI-001; the UI notification segment must not depend on runtime/model command injection.
- Refactor needed now: Yes, bounded cleanup of obsolete row-entrypoint/persistent-started-state surfaces plus replacing runtime-posted notification with local run-event emission.
- Design impact routed: Yes, UX entrypoint and notification ownership questions were routed to `solution_designer`; implementation waited for architecture-review round 7 and round 8 passes before proceeding.
- Current implementation matches reviewed design: Yes.
- Boundary notes: `SelfEvolutionService` remains the lifecycle boundary; frontend CTA consumes backend eligibility/start boundaries and does not infer eligibility from local row state. `SelfEvolutionTargetNotificationService` owns target notification outcome and emits a local run event; runtime backends do not own UI notification rendering. `SYSTEM_TASK_NOTIFICATION` rendering is owned by one shared frontend streaming handler used by standalone and team services.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No` for the user-facing manual entrypoint; row actions and persistent composer start card were removed.
- Dead/obsolete code removed in scope: `Yes` — stale row-action wiring, started-state component, old localization keys, and row-owned self-evolution test mocks were removed.
- Shared structures remain tight: `Yes` — the shared system-task notification handler owns only segment rendering and stays transport-agnostic between standalone/team streams.
- Changed source implementation files stayed within guardrails: `Yes`; no changed source implementation file exceeds 500 effective non-empty lines.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility`
- Branch: `codex/self-evolving-harness-feasibility`
- Recorded base/finalization branch: `origin/personal`; delivery owns refresh/rebase later.

## Local Implementation Checks Run

Current architecture-review round 8 DI-001 implementation pass:

- Passed: `pnpm -C autobyteus-server-ts exec vitest run tests/self-evolution/self-evolution-target-notification-service.test.ts`
- Passed: `pnpm -C autobyteus-web test:nuxt --run services/agentStreaming/__tests__/AgentStreamingService.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
- Passed: `pnpm -C autobyteus-server-ts exec vitest run tests/self-evolution/self-evolution-effective-config-resolver.test.ts tests/self-evolution/manual-trigger-strategy.test.ts tests/self-evolution/self-evolution-graphql-converters.test.ts tests/self-evolution/self-evolution-graphql-resolver.test.ts tests/self-evolution/self-evolution-work-history-projector.test.ts tests/self-evolution/single-agent-evolver-strategy.test.ts tests/self-evolution/self-evolution-service.integration.test.ts tests/self-evolution/self-evolution-target-notification-service.test.ts`
- Passed: `pnpm -C autobyteus-web test:nuxt --run components/workspace/self-evolution/__tests__/SelfEvolutionComposerCta.spec.ts components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts localization/messages/__tests__/workspaceHistorySelfEvolutionCleanup.spec.ts services/agentStreaming/__tests__/AgentStreamingService.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
- Passed: `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web audit:localization-literals`
- Passed: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- Passed: `git diff --check`

Prior architecture-review round 7 implementation pass:

- Passed: `pnpm -C autobyteus-web test:nuxt --run components/workspace/self-evolution/__tests__/SelfEvolutionComposerCta.spec.ts components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts localization/messages/__tests__/workspaceHistorySelfEvolutionCleanup.spec.ts services/agentStreaming/__tests__/AgentStreamingService.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
- Passed: `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web audit:localization-literals`
- Passed: `pnpm -C autobyteus-server-ts exec vitest run tests/self-evolution/self-evolution-effective-config-resolver.test.ts tests/self-evolution/manual-trigger-strategy.test.ts tests/self-evolution/self-evolution-graphql-converters.test.ts tests/self-evolution/self-evolution-graphql-resolver.test.ts tests/self-evolution/self-evolution-work-history-projector.test.ts tests/self-evolution/single-agent-evolver-strategy.test.ts tests/self-evolution/self-evolution-service.integration.test.ts tests/self-evolution/self-evolution-target-notification-service.test.ts`
- Passed: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- Passed: `git diff --check`

Previously passed in upstream local-fix rounds and not repeated unless listed above:

- Server focused self-evolution suites and server build/typecheck for CR-006, AE2E-019/016, CR-007, and AE2E-022.
- Web launch-config/control tests for AE2E-022.
- Web boundary/localization guards for composer-only CTA and current round 7 pass.

Known project-wide note from earlier rounds:

- Full Nuxt typecheck had existing unrelated project-wide failures before this rework. It was not used as a sign-off gate for this implementation pass; focused web guards/component tests passed.

## Suggested Downstream Review / Validation Focus

- Verify composer-visible copy is exactly `Self improve` / localized equivalent, with standalone/team-member scope only in tooltip/accessibility copy.
- Verify run-history rows do not expose self-evolution controls and no row-owned eligibility/start state remains.
- Verify old/ineligible/pre-snapshot runs are hidden by default and technical backend reasons are not shown in chat UI.
- Verify successful starts produce only transient neutral toast/status and no persistent composer card, record id, or helper navigation control.
- Verify `SelfEvolutionTargetNotificationService` emits a local `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` for active idle standalone targets across AutoByteus/Codex/Claude runtime kinds and does not call `postUserMessage(... SenderType.SYSTEM ...)` for UI notification rendering.
- Verify standalone and team `SYSTEM_TASK_NOTIFICATION` websocket payloads render as `SystemTaskNotificationSegment` conversation entries through the shared frontend handler.
- Verify active-target notification copy is concise and contains no raw skill paths, evolution record IDs, helper IDs, implementation details, or runtime/model refresh instructions.
- Verify launch-form eligibility controls still snapshot `selfEvolution` for normal UI-created standalone and team/member launches.
- Verify manual start mutations remain identity-only and gated by global capability plus run/member metadata snapshots.
- Verify prompt-facing evidence still redacts credentials/tokens/paths/run IDs while preserving explicit durable correction signals.
- Re-run API/E2E on the normal browser UI path with updated expectations: visible run-launch eligibility, composer-only `Self improve` CTA, no run-row action, visible evolver run, durable marker update applied, concise notification segment sourced from a local event, and post-evolution next-run behavior.
