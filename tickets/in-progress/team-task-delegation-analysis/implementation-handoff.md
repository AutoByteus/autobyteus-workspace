# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/design-spec.md`
- Frontend requirement gap analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/frontend-task-team-ui-requirement-gap.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/design-review-report.md`
- Latest code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/code-review-report.md`
- API/E2E coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/api-e2e-coverage-investigation.md`
- API/E2E execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/api-e2e-execution-coverage-report.md`

## What Changed

Implemented the reviewed team-task delegation design and the follow-up CR-001 / CR-002 / CR-003 rework in `autobyteus-server-ts`.

- Preserved the clean model-facing `delegate_task({ target: { kind: "member" | "team", name }, description, reference_files? })` surface with no `member_name` compatibility shorthand.
- Preserved explicit task target and execution unions so records distinguish member targets from team targets, and task-agent execution from task-team execution.
- Added task-team runtime identity/request support, task-team run identity materialization, task-team settlement coordination, and topology-derived delegation target rosters separate from communication recipients.
- Replaced the broad `TaskTeamDirectory` shape with `TaskTeamActiveRunDirectory`, an active-only child-run resolver with bind/resolve/unbind APIs and no starting status, settled tombstones, task-id index, or history role.
- Added `TaskDelegationToolRunRouter` as the single tool run/service binding owner. `TaskDelegationToolService` is now a thin adapter and no longer depends directly on `TeamRunService`, `TaskTeamActiveRunDirectory`, or `TaskDelegationRunRegistry`.
- Split task result submission paths so router-selected parent task-team ingress submission calls `TaskDelegationService.submitTaskTeamIngressResult`, while task-agent submission calls `submitTaskAgentResult`; `TaskDelegationService` no longer repeats current-vs-parent run selection.
- Split the mixed backend runtime ownership model by lifecycle subject: persistent members, task-agent instances, and task-team instances are now separate registries composed by `MixedTeamManager`.
- Removed the catch-all `mixed-team-member-registry.ts`; `MixedTeamManager` now owns cross-kind command routing, status aggregation, and termination order.
- Updated `TeamMemberDeliveryCoordinator` / recipient resolution to depend on a persistent-member registry interface plus task-agent delivery access rather than a mixed catch-all registry.
- Removed the unused `TaskDelegationLedger.hasOpenWorkBlockingTaskTeamSettlement` helper instead of leaving dead settlement policy.
- Added unit coverage for `TaskDelegationToolRunRouter` and `TaskTeamActiveRunDirectory`; updated existing narrow unit/integration coverage for the new owners.
- Applied the CR-004 Local Fix from code review round 3: `flattenTaskDelegationIdentity` now flattens task execution identity only from `payload.execution` and target identity only from `payload.target`, while retaining only the current top-level `payload.taskId` fallback. The legacy top-level `payload.taskAgentInstance`, `payload.taskTeamInstance`, and `payload.member` flattening fallbacks are removed.
- Applied the round 6 CR-005 / AR-003 / AR-004 implementation rework:
  - Added backend task-team scoped event stamping on `TeamRunEvent.taskTeamInstance`, `prefixMixedSubTeamEvent`, `MixedTaskTeamMemberHandle`, command-status overlays, and websocket flattening for all task-scoped child event kinds.
  - Added task-team scoped approval/deny routing through `task_team_run_id` plus relative child selector before ordinary persistent-member approval routing.
  - Added frontend task execution projection owners for shared lifecycle/status, task-team root projection, task-team child clone/context projection, and projection-first event routing.
  - Added transient task-team root nodes distinct from structural `agent_team` nodes, task-scoped child clones with scoped route/path/run semantics, provisional child `AgentContext.state.runId` promotion, and malformed scoped-event drop behavior.
  - Generalized active execution UI from task-agent-only cards to task-agent/task-team cards, added task-team lifecycle/timeline rendering in monitor tiles, and hid composer for task-team root/child projection focus.
  - Preserved existing member-target task-agent projection behavior while allowing nested task-agent projections inside task-team child members to carry parent task-team identity.
- Applied the code review round 7 CR-006 / CR-007 Local Fix:
  - Separated task-team lifecycle projection status from child runtime status so child/root `idle` no longer regresses an accepted task-team execution to active/running, and root `offline` maps to settled.
  - Wired terminal task-team cleanup from projection routing through `TeamStreamingService`; cleanup cascades through task-team root, scoped child nodes, scoped child contexts, nested task-agent nodes, and nested task-agent contexts while preserving structural nodes/contexts.
  - Scheduled cleanup on a later task turn after terminal/settled state is written so the active execution surface can render the terminal state at least once.
  - Updated stale websocket approval unit expectations for the new `taskTeamRunId` argument and added positive/negative task-team scoped approval/denial command tests using `task_team_run_id` plus relative child selectors.
  - Restored direct task-agent instance composer targeting while continuing to suppress composer targeting for task-team root/child projections.

## Key Files Or Areas

- Task target/execution model:
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-target.ts`
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-execution-instance.ts`
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts`
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-ledger.ts`
- Task-team runtime support:
  - `autobyteus-server-ts/src/agent-team-execution/domain/task-team-instance.ts`
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-run-identity-factory.ts`
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-active-run-directory.ts`
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-settlement-coordinator.ts`
- Task-tool routing and lifecycle service:
  - `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-run-router.ts`
  - `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-service.ts`
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts`
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts`
- Mixed backend runtime ownership:
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-persistent-member-registry.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-agent-instance-registry.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-instance-registry.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-config-resolver.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- Tool/prompt surface and rosters:
  - `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts`
  - `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts`
  - `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/delegation-target-roster-builder.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts`
- Streaming websocket flattening:
  - `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/team-command-selector-parser.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/team-tool-approval-command-handler.ts`
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts`
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
- Frontend task-team projection and routing:
  - `autobyteus-web/types/agent/AgentTeamContext.ts`
  - `autobyteus-web/types/segments.ts`
  - `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts`
  - `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts`
  - `autobyteus-web/services/agentStreaming/teamTaskTeamChildProjection.ts`
  - `autobyteus-web/services/agentStreaming/teamTaskExecutionEventRouter.ts`
  - `autobyteus-web/services/agentStreaming/teamStreamGenericMessageDispatcher.ts`
  - `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
  - `autobyteus-web/services/agentStreaming/teamStreamMemberContextResolver.ts`
  - `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts`
  - `autobyteus-web/services/agentStreaming/protocol/teamStreamIdentityTypes.ts`
  - `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
  - `autobyteus-web/services/agentStreaming/handlers/toolLifecycleParsers.ts`
- Frontend active execution UI:
  - `autobyteus-web/components/workspace/team/TeamActiveTaskExecutionsBar.vue`
  - `autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue`
  - `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
  - `autobyteus-web/utils/teamActiveExecutionMembers.ts`
  - `autobyteus-web/utils/teamUserMessageTarget.ts`
  - `autobyteus-web/stores/agentTeamContextsStore.ts`
  - `autobyteus-web/localization/messages/en/workspace.ts`
  - `autobyteus-web/localization/messages/zh-CN/workspace.ts`
- Added/updated tests:
  - `autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-tool-run-router.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/task-team-active-run-directory.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts`
  - `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`
  - `autobyteus-web/services/agentStreaming/__tests__/teamTaskTeamExecutionProjection.spec.ts`
  - `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
  - `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskExecutionsBar.spec.ts`
  - `autobyteus-web/components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts`
  - `autobyteus-web/utils/__tests__/teamActiveExecutionMembers.spec.ts`
  - `autobyteus-web/utils/__tests__/teamUserMessageTarget.spec.ts`
  - `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`

## Important Assumptions

- Task-team child runs remain task-scoped runtime instances, not top-level `AgentTeamRunManager` active/history runs.
- `TaskTeamActiveRunDirectory` is used only as active runtime fallback resolution/settlement support. It is not used as a topology source, roster source, lifecycle ledger, tombstone store, or history mechanism.
- `agent-team-execution/domain/task-team-instance.ts` remains runtime-domain only and does not import from `agent-team-execution/task-delegation/*`.
- Team-target result submission is ingress-only: the mixed task-team handle injects `taskTeamInstance` only for the task-team ingress member route.
- Frontend task-team projection routing is explicit-stamp-only: task-scoped child events must carry `task_team_run_id` and relative child route/path fields. Source-path-only task-team association was not implemented and malformed scoped payloads are dropped/logged.
- Task-team terminal cleanup intentionally runs on a later task turn after the settled/failed/offline projection update, preserving one visible terminal state update before active-surface removal.
- API/E2E remains paused until this rework passes code review again.

## Known Risks

- Registry splitting touched mixed-backend command routing and delivery dependencies. Unit/integration checks passed, but code review should specifically inspect task-agent recovery, task-team cleanup, and cross-kind termination order.
- Multiple simultaneous team-task runs rely on `taskTeamRunId`-specific routing and active-directory cleanup. Unit tests cover bind/unbind and parent cleanup; API/E2E should still validate the full sequential and concurrent runtime behavior.
- Frontend task-team terminal cleanup is now scheduled after the terminal/settled projection update instead of leaving settled roots active indefinitely. There is still no durable history surface in this implementation; API/E2E should verify the one-turn settled/accepted visibility is sufficient for the product path.
- Full frontend `nuxi typecheck` still reports broad pre-existing repository type errors outside touched task-team projection files; this local fix relied on targeted frontend vitest coverage instead of treating the broad typecheck as a gate.
- API/E2E coverage was not owned or executed by this implementation pass.
- Full `pnpm typecheck` using `tsconfig.json` remains affected by the repository's pre-existing `rootDir: src` plus `include: ["src", "tests"]` TS6059 configuration issue. Implementation used `tsconfig.build.json` and package build for source-level validation.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger requirement / feature plus required rework after design-impact code review findings; CR-004, CR-006, and CR-007 were bounded Local Fixes.
- Reviewed root-cause classification: Boundary or ownership issue, duplicated coordination ownership, file responsibility drift, and shared-structure looseness.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A; the revised design was implementable without another design gap.
- Evidence / notes: CR-001 is addressed by owned mixed registries and `MixedTeamManager` composition; CR-002 is addressed by `TaskDelegationToolRunRouter`; CR-003 is addressed by `TaskTeamActiveRunDirectory` active-only bind/resolve/unbind behavior. CR-004 is addressed by removing the legacy websocket flattening fallback branches and adding tests that current target/execution shapes flatten while legacy top-level identity fields do not. CR-005 / AR-003 / AR-004 are addressed by backend task-team scoped stamping, projection-first frontend routing, task-team root/child projection owners, and task-team scoped approval routing. CR-006 is addressed by terminal cleanup/status separation and cascade cleanup tests. CR-007 is addressed by updated approval command expectations and task-team scoped approval/denial tests.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Removed `mixed-team-member-registry.ts`, removed `TaskTeamDirectory`, removed settled tombstones/starting state/task-id index from the task-team active resolver, removed inline run binding from `TaskDelegationToolService`, removed unused task-team settlement ledger helper, removed legacy websocket task-delegation flattening fallbacks for `payload.taskAgentInstance`, `payload.taskTeamInstance`, and `payload.member`, and replaced `TeamTaskAgentActivityBar.vue` with generalized `TeamActiveTaskExecutionsBar.vue`. Current changed source files are below the 500 line guardrail; extracted `teamStreamGenericMessageDispatcher.ts` and `team-tool-approval-command-handler.ts` to keep changed dispatch files below the guardrail.

## Environment Or Dependency Notes

- Build/checks ran from `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis`.
- `pnpm -C autobyteus-web exec nuxi prepare` generated `.nuxt` test/type metadata before frontend vitest/typecheck attempts.
- `pnpm -C autobyteus-server-ts run build` completed successfully and regenerated Prisma client.
- Prisma printed normal migration/generation output and Node printed SQLite experimental warnings during tests; neither affected pass/fail.

## Local Implementation Checks Run

Implementation-scoped checks only; no API/E2E environment bring-up or coverage classification was performed.

- `git diff --check` — passed.
- Changed source file size guard script — passed; max changed source file was 430 effective nonempty lines.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/task-team-active-run-directory.test.ts tests/unit/agent-tools/task-delegation/task-delegation-tool-run-router.test.ts tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts tests/unit/agent-team-execution/task-delegation-service.test.ts` — passed: 5 files, 23 tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/member-run-instruction-composer.test.ts tests/unit/agent-team-execution/member-team-context-builder.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — passed: 3 files, 15 tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts` — passed: 4 files, 27 tests.
- `pnpm -C autobyteus-server-ts run build` — passed, including shared package preparation, Prisma generate, `tsc -p tsconfig.build.json`, managed messaging asset copy, and built-in agents bootstrap smoke check.

CR-004 Local Fix checks run after code review round 3:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — passed: 2 files, 13 tests.
- `git diff --check` — passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts run build` — passed, including shared package preparation, Prisma generate, `tsc -p tsconfig.build.json`, managed messaging asset copy, and built-in agents bootstrap smoke check.
- CR-004 source size check: `team-run-event-websocket-message-mapper.ts` is 142 effective nonempty lines.

Round 6 CR-005 / AR-003 / AR-004 rework checks:

- `pnpm -C autobyteus-web exec nuxi prepare` — passed.
- `pnpm -C autobyteus-web exec vitest run services/agentStreaming/__tests__/teamTaskTeamExecutionProjection.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts utils/__tests__/teamActiveExecutionMembers.spec.ts components/workspace/team/__tests__/TeamActiveTaskExecutionsBar.spec.ts components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts` — passed: 5 files, 45 tests.
- `pnpm -C autobyteus-web run guard:web-boundary` — passed.
- `pnpm -C autobyteus-web run guard:localization-boundary` — passed.
- `pnpm -C autobyteus-web run audit:localization-literals` — passed with zero unresolved findings.
- `pnpm -C autobyteus-web exec nuxi typecheck --pretty false` — failed on broad pre-existing repository type issues; filtered output for touched task-team projection/routing/UI files was empty after fixes.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts tests/unit/agent-team-execution/task-team-active-run-directory.test.ts tests/unit/agent-tools/task-delegation/task-delegation-tool-run-router.test.ts` — passed: 3 files, 17 tests.
- `pnpm -C autobyteus-server-ts run build` — passed, including shared package preparation, Prisma generate, `tsc -p tsconfig.build.json`, managed messaging asset copy, and built-in agents bootstrap smoke check.
- `git diff --check` — passed.


Code review round 7 CR-006 / CR-007 Local Fix checks:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` — passed: 1 file, 25 tests.
- `pnpm -C autobyteus-web exec vitest run services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/agentStreaming/__tests__/teamTaskTeamExecutionProjection.spec.ts services/agentStreaming/__tests__/teamStreamMemberContextResolver.spec.ts utils/__tests__/teamActiveExecutionMembers.spec.ts utils/__tests__/teamUserMessageTarget.spec.ts components/workspace/team/__tests__/TeamActiveTaskExecutionsBar.spec.ts` — passed: 6 files, 53 tests.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/team/__tests__/TeamActiveTaskExecutionsBar.spec.ts utils/__tests__/teamUserMessageTarget.spec.ts` — passed: 4 files, 25 tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts tests/unit/agent-tools/task-delegation/task-delegation-tool-run-router.test.ts tests/unit/agent-team-execution/task-team-active-run-directory.test.ts` — passed: 3 files, 17 tests.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts run build` — passed, including shared package preparation, Prisma generate, `tsc -p tsconfig.build.json`, managed messaging asset copy, and built-in agents bootstrap smoke check.
- `git diff --check` — passed.
- Changed source file size guard script — passed; all checked changed source files remain below 500 effective nonempty lines (overall max: `agent-team-stream-handler.ts` at 430; CR-006 frontend max: `TeamStreamingService.ts` at 410).
- `pnpm -C autobyteus-web exec nuxi typecheck` — failed on broad pre-existing repository type errors outside this local fix path (examples include build script type-only imports, unrelated component test prop types, missing generated/store modules, and existing store/test type issues).

## Downstream Coverage Hints / Suggested Scenarios

- API/E2E should validate model-facing `delegate_task` schema/catalog exposure no longer exposes `member_name` and requires `target.kind`/`target.name`.
- API/E2E should validate a parent PM delegates to an `agent_team` target and that the task-team ingress coordinator receives the packet.
- API/E2E should validate task-team ingress `submit_task_result` routes to the parent ledger through `TaskDelegationToolRunRouter`, not to the child team ledger.
- API/E2E should validate child team members can call task tools through active-directory fallback while the task-scoped child team run is active.
- API/E2E should validate revision delivery back to the same task-team ingress and acceptance settlement of only the task-scoped child team run.
- API/E2E should validate sequential team-task delegation: after one task-team run settles, the parent team can delegate another task to the same logical team.
- API/E2E should validate cleanup: active child team runs resolve while active and do not resolve after settlement/parent termination.
- API/E2E should validate frontend visible projection: parent PM delegates to `SoftwareEngineeringTeam`, websocket `TASK_DELEGATION_EVENT` creates `SoftwareEngineeringTeam · task_0001`, child scoped events update `task-team-run/child` projections, and the structural `SoftwareEngineeringTeam` node/context remain unchanged.
- API/E2E should validate concurrent same-logical-team task-team executions: explicitly stamped child events route to the matching `task_team_run_id`; malformed task-team scoped child events missing `task_team_run_id` do not update either task-team or structural member.
- API/E2E should validate task-team scoped tool approval/denial payloads include `task_team_run_id` plus relative child selector and route to the child run, not the structural member.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. API/E2E coverage investigation and execution are still required and should be owned by `api_e2e_engineer` after this rework passes code review. This implementation pass updated source, unit tests, and narrow integration lifecycle tests only.
