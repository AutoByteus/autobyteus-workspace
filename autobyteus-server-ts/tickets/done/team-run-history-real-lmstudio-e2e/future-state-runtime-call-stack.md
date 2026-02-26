# Future-State Runtime Call Stack

Version: `v1`
Date: `2026-02-21`

## UC-001: Env-gated LM Studio e2e selection

Primary Path:
1. `tests/e2e/run-history/team-run-history-graphql.e2e.test.ts:hasLmstudioConfig()` checks `LMSTUDIO_HOSTS` or `LMSTUDIO_MODEL_ID`.
2. `tests/e2e/run-history/team-run-history-graphql.e2e.test.ts:runLmstudioIt(...)` resolves to `it` or `it.skip`.
3. Vitest executes or skips real-provider test accordingly.

Fallback/Error Path:
1. No LM Studio env config -> `it.skip` branch.
2. Deterministic mocked e2e tests still execute and protect baseline behavior.

## UC-002: Real terminate/continue recall flow (no mocks)

Primary Path:
1. `tests/e2e/run-history/team-run-history-graphql.e2e.test.ts:resolveLmstudioModelIdentifier()`
2. `autobyteus-ts/llm/llm-factory.js:LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO)`
3. GraphQL create mutations create prompt/agent/team definition + team instance.
4. `src/api/graphql/types/agent-team-instance.ts:sendMessageToTeam(...)` sends initial memory token prompt.
5. Memory artifacts written under `memory/agents/<memberAgentId>/`.
6. `src/api/graphql/types/agent-team-instance.ts:terminateAgentTeamRun(...)` terminates team runtime.
7. `src/api/graphql/types/agent-team-instance.ts:sendMessageToTeam(...)` with existing `teamId` routes to
8. `src/run-history/services/team-run-continuation-service.ts:continueTeamRun(...)`
9. `src/run-history/services/team-run-continuation-service.ts:restoreTeamRuntime(...)`
10. Restored team handles recall prompt and emits assistant response.
11. Projection query verifies post-continue recall content and active run-history status.

Fallback/Error Path:
1. Model discovery returns empty set -> test exits early with assertion failure on model identifier.
2. Team restoration fails -> GraphQL send returns `success=false`, test fails.
3. Recall output does not include token -> token mention delta assertion fails.
