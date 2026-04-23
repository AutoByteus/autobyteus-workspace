# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/tickets/in-progress/agent-team-member-runtime-selection/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/tickets/in-progress/agent-team-member-runtime-selection/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/tickets/in-progress/agent-team-member-runtime-selection/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/tickets/in-progress/agent-team-member-runtime-selection/design-review-report.md`
- Review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/tickets/in-progress/agent-team-member-runtime-selection/review-report.md`

## What Changed

- Preserved the prior backend ownership decisions from rounds 1-3:
  - `TeamBackendKind` remains team-boundary-only.
  - member `runtimeKind` remains member-local only.
  - `MemberTeamContextBuilder` / `MemberTeamContext` still own standalone mixed-member bootstrap data.
  - `AutoByteusAgentRunBackendFactory` still owns mixed AutoByteus task-management tool stripping.
- Kept the `CR-001` / `CR-002` local-fix corrections in place:
  - mixed standalone AutoByteus `send_message_to` now fails when `deliverInterAgentMessage(...)` rejects;
  - stale durable server integration suites were updated to `teamBackendKind` and direct mixed durable coverage was added.
- Implemented the remaining frontend mixed-runtime runtime-selection slice from the reviewed design:
  - added per-member `runtimeKind` override support to frontend `TeamRunConfig.memberOverrides`;
  - added a shared runtime-scoped model-loading helper for runtime-aware selector behavior;
  - added explicit unresolved member-row warning behavior when a member runtime override makes the inherited team-default model invalid;
  - added a shared `teamRunLaunchReadiness` utility and made `teamRunConfigStore.launchReadiness` the authoritative workspace Run-button boundary;
  - kept `RunConfigPanel` thin by consuming only the store readiness boundary for Run gating / blocking feedback;
  - added a shared `teamRunMemberConfigBuilder` so temporary team contexts, launch payload fanout, and application launch helpers resolve member runtime/model/config from one owner after readiness passes.
- Updated frontend restore/reconstruction so mixed runtime metadata now reconstructs member runtime overrides instead of collapsing to one dominant runtime-only shape.
- Added the explicit frontend tests called out by architecture review for:
  - unresolved-row warning behavior,
  - `teamRunConfigStore.launchReadiness`,
  - Run-button gating in `RunConfigPanel`,
  - mixed frontend launch payload fanout,
  - mixed temporary team context materialization.
- Fixed review finding `CR-003`:
  - invalid explicit member-model cleanup now clears member-only `llmConfig` before falling back to inherited-global mode;
  - both invalidation paths are covered: direct runtime-override cleanup and reactive effective-runtime cleanup;
  - the durable frontend regressions now prove the cleaned row shape feeds launch-readiness/materialization without leaking stale config onto the inherited global model.
- Fixed review finding `CR-004`:
  - reopen/hydration reconstruction now derives the default team runtime/model/config from one coherent compatible member cohort instead of independently voting runtime and model across all members;
  - once the dominant default runtime is chosen, default model/config selection is constrained to real members inside that runtime, preventing synthesized invalid runtime/model pairs;
  - the durable reconstruction regression now proves mixed metadata with split runtime/model dominance reopens into a launch-ready config instead of `TEAM_MODEL_UNAVAILABLE`.

## Key Files Or Areas

### Frontend mixed-runtime UI / readiness / materialization
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/composables/useRuntimeScopedModelSelection.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/MemberOverrideItem.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/RunConfigPanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/stores/teamRunConfigStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/utils/teamRunLaunchReadiness.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/utils/teamRunMemberConfigBuilder.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/utils/teamRunConfigUtils.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/types/agent/TeamRunConfig.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/stores/agentTeamContextsStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/stores/agentTeamRunStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/utils/application/applicationLaunch.ts`

### Frontend durable tests added / updated
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/stores/__tests__/teamRunConfigStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts`

### Prior backend / server-runtime-selection files remain authoritative in this package
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/src/agent-team-execution/domain/team-backend-kind.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts`

## Important Assumptions

- Workspace Run gating is authoritative only through `teamRunConfigStore.launchReadiness`; `RunConfigPanel` must remain a thin consumer.
- `teamRunLaunchReadiness` stays responsible only for readiness / blocking-state evaluation; `teamRunMemberConfigBuilder` stays responsible only for post-readiness member materialization.
- A member runtime override without a compatible explicit model is allowed to exist in the config buffer, but it is unresolved and launch-blocking until the user fixes it or clears the runtime override.
- Temporary team creation and temporary-team launch fanout both rely on the shared frontend materialization owner and must not reintroduce per-caller mixed-runtime fallback logic.
- Reopen/hydration truth remains authoritative in `reconstructTeamRunConfigFromMetadata(...)`; hydration/open callers must keep consuming that shared owner rather than independently rebuilding team defaults.

## Known Risks

- `autobyteus-web` full `nuxi typecheck` is still blocked by broad pre-existing unrelated frontend/build/test typing problems across many files outside this ticket slice. A final grep over the typecheck output confirmed that the touched runtime-selection frontend files are no longer in the error set.
- `autobyteus-server-ts` full build-tsconfig remains blocked by the same broad pre-existing non-ticket server/type-resolution issues already called out in prior rounds.
- The runtime-scoped frontend catalog helper currently relies on the existing provider/model store fetch boundary; future unrelated work that broadens concurrent runtime-model editing surfaces should keep the cache ownership explicit instead of reintroducing component-local ad-hoc fetch policy.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`

## Environment Or Dependency Notes

- No new package dependencies were required.
- Existing `pnpm` install state remained usable.
- `nuxi typecheck` auto-installed `vue-tsc` on demand through the existing toolchain invocation path, then reported the same broad unrelated workspace typing failures outside this ticket scope.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

### Backend / server-runtime-selection checks retained from prior local-fix round
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-ts exec tsc -p tsconfig.build.json --noEmit`
  - Passed.
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-ts exec vitest run tests/unit/agent/message/send-message-to.test.ts`
  - Passed.
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts`
  - Passed.
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts tests/integration/agent-team-execution/claude-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/claude-team-run-backend.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts`
  - Passed.

### Frontend mixed-runtime runtime-selection checks from this round
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web exec vitest run components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts components/applications/__tests__/ApplicationLaunchDefaultsFields.spec.ts stores/__tests__/teamRunConfigStore.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts utils/__tests__/teamRunConfigUtils.spec.ts types/agent/__tests__/TeamRunConfig.spec.ts`
  - Passed.
  - `10` files passed, `60` tests passed.
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web exec vitest run components/workspace/config/__tests__/MemberOverrideItem.spec.ts`
  - Passed.
  - `1` file passed, `6` tests passed.
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web exec vitest run utils/__tests__/teamRunConfigUtils.spec.ts`
  - Passed.
  - `1` file passed, `7` tests passed.
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web exec nuxi typecheck`
  - Still fails in broad unrelated existing frontend/build/test files outside this ticket slice.
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web exec nuxi typecheck 2>&1 | rg "(components/launch-config/RuntimeModelConfigFields.vue|stores/teamRunConfigStore.ts|stores/agentTeamRunStore.ts|components/workspace/config/MemberOverrideItem.vue|components/workspace/config/TeamRunConfigForm.vue|stores/agentTeamContextsStore.ts|utils/teamRunMemberConfigBuilder.ts|utils/teamRunLaunchReadiness.ts|composables/useRuntimeScopedModelSelection.ts|utils/teamRunConfigUtils.ts|components/workspace/config/RunConfigPanel.vue|utils/application/applicationLaunch.ts)"`
  - Returned no matches; the touched runtime-selection frontend files are clear of the remaining typecheck error set.
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web exec nuxi typecheck 2>&1 | rg "(components/workspace/config/MemberOverrideItem.vue|components/workspace/config/__tests__/MemberOverrideItem.spec.ts)"`
  - Returned no matches; the CR-003 fix file and its new durable regression file are clear of the remaining typecheck error set.
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web exec nuxi typecheck 2>&1 | rg "(utils/teamRunConfigUtils.ts|utils/__tests__/teamRunConfigUtils.spec.ts)"`
  - Returned no matches; the CR-004 reconstruction owner and its new durable regression file are clear of the remaining typecheck error set.

## Downstream Validation Hints / Suggested Scenarios

- Re-review the ownership watchpoints explicitly called out by architecture review:
  - `teamRunLaunchReadiness` remains distinct from `teamRunMemberConfigBuilder`.
  - `teamRunConfigStore.launchReadiness` remains the sole workspace Run-button boundary.
  - `RunConfigPanel` remains a thin readiness consumer.
  - backend ownership boundaries from prior rounds stay unchanged.
- API/E2E should now validate one fully live mixed team where members on different runtimes communicate through `send_message_to`, because the frontend is now able to create / temp-create / launch such mixed teams truthfully.
- Restore should be spot-checked with one dominant-runtime member and one divergent-runtime member to confirm frontend reopen preserves member runtime overrides and the row warning / readiness state remain truthful after hydration.
- Restore should also be spot-checked with mixed metadata where dominant runtime and dominant model would diverge if selected independently, to confirm reopen keeps a coherent compatible default tuple.

## API / E2E / Executable Validation Still Required

- Full API/E2E validation for mixed-team launch, restore, and inter-agent messaging through the external server surfaces.
- The higher-fidelity live mixed-team communication scenario previously called out by the user: boot a real mixed team, let mixed members run, and prove end-to-end `send_message_to` communication across runtime boundaries.
- Broader regression validation for unaffected frontend/server areas once the existing workspace-wide typecheck failures are addressed outside this ticket scope.
