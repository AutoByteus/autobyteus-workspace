# API/E2E Testing

- Stage: `7`
- Date: `2026-02-28`
- Result: `Pass`

## Scope

Validated API/E2E acceptance behavior for Claude runtime support, external-member runtime routing, Codex-vs-Claude live E2E parity, and team run continuation/run-history behavior.

## Commands Executed

1. `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts tests/e2e/agent-team-execution/send-message-to-team-graphql-contract.e2e.test.ts`
2. `pnpm -C autobyteus-web exec nuxt prepare`
3. `pnpm -C autobyteus-web exec vitest run components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts stores/__tests__/runtimeCapabilitiesStore.spec.ts`
4. `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
5. `CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts tests/e2e/agent-team-execution/send-message-to-team-graphql-contract.e2e.test.ts tests/unit/runtime-management/runtime-kind.test.ts tests/unit/runtime-management/runtime-capability-service.test.ts tests/unit/runtime-management/model-catalog/runtime-model-catalog-service.test.ts tests/unit/runtime-management/model-catalog/claude-runtime-model-provider.test.ts tests/unit/runtime-execution/runtime-adapter-registry.test.ts tests/unit/runtime-execution/runtime-command-ingress-service.test.ts tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts tests/unit/runtime-execution/external-runtime-event-source-registry.test.ts tests/unit/run-history/projection/run-projection-provider-registry.test.ts tests/unit/run-history/team-member-run-projection-service.test.ts tests/unit/run-history/team-run-history-service.test.ts tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
6. `pnpm -C autobyteus-web test`
7. `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`
8. `RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts test`
9. `pnpm -C autobyteus-web test`
10. `rg --line-number "\bit\(" autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts | wc -l`
11. `rg --line-number "\bit\(" autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts autobyteus-server-ts/tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts | wc -l`
12. `RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts test`
13. `pnpm -C autobyteus-web test`
14. `RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`

## Results

- Server e2e contracts: `4 passed`
- Web runtime config/capability tests: `14 passed`
- Live Codex runtime e2e: `13 passed`
- Expanded Claude runtime-enabled matrix: `56 passed`
- Live Claude runtime e2e: `2 passed` (`lists Claude runtime models from live SDK metadata`, `creates and terminates a Claude runtime run through GraphQL`)
- Codex-vs-Claude live E2E parity count: `13 == 13` (`11 runtime GraphQL + 2 team` on each runtime)
- Final full backend with both live runtime flags: `250 files passed / 3 skipped`, `1095 passed / 8 skipped`
- Final full frontend suite gate: `test:nuxt 143 files / 706 passed` + `test:electron 6 files / 38 passed`
- Focused team routing + continuation/run-history rerun: `3 files passed`, `8 passed / 1 skipped`
- No Stage 7 blockers remain.

## Notes

- Web tests require generated `.nuxt` artifacts; running `nuxt prepare` is required in a clean worktree.
