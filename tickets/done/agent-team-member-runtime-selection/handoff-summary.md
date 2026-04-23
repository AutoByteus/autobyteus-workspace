# Handoff Summary

## Status

- Ticket: `agent-team-member-runtime-selection`
- Last Updated: `2026-04-23`
- Current Status: `Finalized`

## Delivered

- Added a server-owned mixed-runtime team orchestration path selected by `TeamBackendKind`, while keeping `RuntimeKind` member-local.
- Added `MixedTeamManager` / `MixedTeamRunBackend` so mixed teams run over per-member `AgentRun`s instead of delegating through legacy runtime-specific team managers.
- Added `MemberTeamContextBuilder` and `InterAgentMessageRouter` as the runtime-neutral communication/bootstrap spine for Codex, Claude, and mixed AutoByteus members.
- Updated AutoByteus mixed standalone bootstrap so communication context is injected through `initialCustomData`, task-management tools are stripped in mixed teams, and rejected teammate deliveries surface as real `send_message_to` failures.
- Added durable top-level mixed-runtime API/websocket validation plus corroborating backend/service regressions, including the new top-level runtime-selection integration harness.
- Added fully live mixed AutoByteus+Codex GraphQL/WebSocket create / terminate / restore / resumed-delivery proof, plus the directly related fixes for mixed-member `memoryDir` provisioning and the live Codex `send_message_to` dynamic-tool contract.
- Closed the remaining frontend app gap by adding per-member runtime override selectors, mixed-runtime launch-readiness gating, mixed temp-team materialization, first-send promotion to permanent backend runs, reopen/hydration preservation of divergent runtime/model overrides, and durable CR-003 stale member-only `llmConfig` cleanup coverage.
- Closed `CR-004` by repairing mixed-team reopen/hydration reconstruction so the reopened default runtime/model/config tuple is derived from one compatible dominant runtime cohort instead of a false split-runtime vote, while preserved divergent member overrides remain explicit.
- Completed the required delivery integration refresh against the latest tracked base:
  - bootstrap base: `origin/personal`
  - local checkpoint commit: `90bc9dcb` (`chore(checkpoint): preserve agent-team-member-runtime-selection candidate`)
  - integrated base commit: `76bbc1a0` (`origin/personal`)
  - integration merge commit: `342be6b0` (`Merge remote-tracking branch 'origin/personal' into codex/agent-team-member-runtime-selection`)
  - integration refresh required reconciling latest-base conflicts in:
    - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`
    - `autobyteus-server-ts/src/agent-execution/domain/agent-run-config.ts`
    - `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts`
    - `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts`
    - `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts`
  - final integrated worktree also removed duplicate merge residues in the same runtime-selection path before the last rerun.

## Verification

- Review artifact: `tickets/done/agent-team-member-runtime-selection/review-report.md` is the authoritative `Pass` (`round 9`).
- Validation artifact: `tickets/done/agent-team-member-runtime-selection/validation-report.md` is the authoritative `Pass` (`round 4`).
- Delivery-stage post-integration reruns on `2026-04-23`:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/integration/api/runtime-selection-top-level.integration.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts tests/integration/agent-team-execution/claude-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/claude-team-run-backend.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts`
  - Result: `Pass` (`13` files / `67` tests)
  - Final current-state rerun: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/integration/api/runtime-selection-top-level.integration.test.ts tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/claude-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/claude-team-run-backend.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts`
  - Final current-state result: `Pass` (`11` files / `52` tests)
- Earlier evidence-expansion follow-up rerun recorded on `2026-04-23`:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-ts exec vitest run tests/integration/agent/agent-single-flow.test.ts tests/integration/agent-team/agent-team-single-flow.test.ts`
  - Result: `Pass` (`2` files / `2` tests)
- Round-5 focused reruns recorded on `2026-04-23`:
  - Focused unit batch: `cd /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts && pnpm exec vitest run tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts tests/unit/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.test.ts`
    - Result: `Pass` (`2` files / `2` tests)
  - Live mixed runtime GraphQL/WebSocket E2E: `cd /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts && set -a && source ../autobyteus-ts/.env.test && source ./.env && set +a && export RUN_LMSTUDIO_E2E=1 && export RUN_CODEX_E2E=1 && pnpm exec vitest run tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts`
    - Result: `Pass` (`1` file / `1` test)
  - Live AutoByteus restore regression: `cd /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts && set -a && source ../autobyteus-ts/.env.test && source ./.env && set +a && export RUN_LMSTUDIO_E2E=1 && pnpm exec vitest run tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts -t 'creates a real team, approves a tool call, restores it, and continues on the same websocket'`
    - Result: `Pass` (`1` passed / `1` skipped)
  - Live Codex inter-agent roundtrip regression: `cd /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts && set -a && source ../autobyteus-ts/.env.test && source ./.env && set +a && export RUN_CODEX_E2E=1 && pnpm exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts -t 'routes live inter-agent send_message_to ping->pong->ping roundtrip in codex team runtime'`
    - Result: `Pass` (`1` passed / `4` skipped)
- Round-3 frontend/browser validation recorded on `2026-04-23`:
  - Frontend row-owner rerun: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web exec vitest run components/workspace/config/__tests__/MemberOverrideItem.spec.ts`
    - Result: `Pass` (`1` file / `6` tests)
  - Broader frontend touched-suite rerun: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web exec vitest run components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts components/applications/__tests__/ApplicationLaunchDefaultsFields.spec.ts stores/__tests__/teamRunConfigStore.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts utils/__tests__/teamRunConfigUtils.spec.ts types/agent/__tests__/TeamRunConfig.spec.ts`
    - Result: `Pass` (`10` files / `59` tests)
  - Frontend typecheck spot-check: `cd /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web && pnpm exec nuxi typecheck 2>&1 | rg "(components/launch-config/RuntimeModelConfigFields.vue|stores/teamRunConfigStore.ts|stores/agentTeamRunStore.ts|components/workspace/config/MemberOverrideItem.vue|components/workspace/config/TeamRunConfigForm.vue|stores/agentTeamContextsStore.ts|utils/teamRunMemberConfigBuilder.ts|utils/teamRunLaunchReadiness.ts|composables/useRuntimeScopedModelSelection.ts|utils/teamRunConfigUtils.ts|components/workspace/config/RunConfigPanel.vue|utils/application/applicationLaunch.ts)"`
    - Result: `Returned no matches for touched frontend files`
  - Live browser/manual validation against restarted ticket-branch stack on `http://127.0.0.1:3000/workspace`
    - Result: `Pass` — per-member runtime override selectors rendered, unresolved mixed rows blocked **Run Team** with a warning, adding a compatible explicit divergent member model re-enabled launch, a mixed temp team materialized with divergent runtime/model pairs, and first send promoted that temp team to permanent backend run `team_article-writing-team_52bc6d30` without collapsing member runtime/model identity.
- Validation round-4 focused hydration/browser revalidation recorded on `2026-04-23`:
  - Focused frontend reconstruction rerun: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web exec vitest run utils/__tests__/teamRunConfigUtils.spec.ts`
    - Result: `Pass` (`1` file / `7` tests)
  - Top-level server/runtime-selection rerun: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts exec vitest run tests/integration/api/runtime-selection-top-level.integration.test.ts`
    - Result: `Pass` (`1` file / `3` tests)
  - Live browser validation on the ticket-branch dev stack (`http://127.0.0.1:3000/workspace` + `http://127.0.0.1:8000`)
    - Result: `Pass` — mixed runtime selection stayed launch-ready, a mixed temp team still promoted to a permanent backend run, and after removing the local team context then reopening from run history the hydrated config stayed truthful with default `codex_app_server / gpt-5.4 / temp_ws_default` plus preserved reviewer override `autobyteus / claude-4-sonnet-rpa:autobyteus@192.168.2.158:51739`.
- Latest-base recheck after the round-`9` / validation-round-`4` delivery package: `origin/personal` still matched integrated base `76bbc1a0` on `2026-04-23`, so no additional implementation reintegration or extra delivery-stage rerun was required.
- Acceptance summary: the backend and frontend now work together so the app can truthfully configure, block, materialize, launch, terminate, restore, reopen, and resume mixed-runtime teams while preserving per-member runtime kind, model identifier, workspace root path, member route identity, mixed-member memory layout, Codex thread reuse, CR-003 member-config cleanup, and the coherent reopened default runtime/model/config tuple required by `CR-004`.

## Documentation Sync

- Docs sync artifact: `tickets/done/agent-team-member-runtime-selection/docs-sync.md`
- Docs result: `Updated`
- Docs updated:
  - `autobyteus-server-ts/docs/modules/agent_team_execution.md`
  - `autobyteus-server-ts/docs/modules/codex_integration.md`
  - `autobyteus-ts/docs/agent_team_design.md`
  - `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md`
  - `autobyteus-web/docs/agent_teams.md`
- Later follow-up result: the round-`7` / round-`3` frontend close-condition package required the canonical frontend team doc to be updated, while the later round-`9` / round-`4` `CR-004` follow-up required no further long-lived doc changes because the reopen/hydration truth was already documented there.

## Release Notes

- Release notes artifact: `tickets/done/agent-team-member-runtime-selection/release-notes.md`
- Release notes status: `Updated`
- Notes: Release notes now reflect the full mixed-runtime package, including the frontend per-member runtime override launch UX, mixed launch-readiness gating, reopen/hydration preservation, and the `CR-004` default-tuple reconstruction fix alongside the previously validated backend mixed-runtime proof.

## Residual Risks

- `autobyteus-server-ts/tests/integration/api/runtime-selection-top-level.integration.test.ts` is a large single-file harness; future additions should stay selective so it does not become a catch-all integration bucket.
- The live mixed-runtime proof depends on provisioned LM Studio/Codex environment parity in the worktree (`.env.test` / `.env`) and should remain a focused regression rather than a broad always-on suite.
- The frontend mixed-runtime launch close condition is now covered on the workspace team-run path; future launch surfaces should reuse the same per-member runtime/model/readiness invariants instead of reintroducing a single-runtime assumption.
- The broad `autobyteus-server-ts` full `tsconfig.build.json` failure remains pre-existing repository noise outside this ticket scope.

## Ticket State

- Technical workflow status: `Repository finalization completed on personal`
- Ticket archive state: `Archived under tickets/done/agent-team-member-runtime-selection/ after explicit user verification on 2026-04-23.`
- User verification hold: `Released by user verification on 2026-04-23; ticket finalized.`
