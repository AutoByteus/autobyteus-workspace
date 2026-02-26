# Investigation Notes

## Stage

- Understanding Pass: `Completed`
- Last Updated: `2026-02-21`

## Sources Consulted

- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-ts/tests/integration/helpers/lmstudio-llm-helper.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/api/graphql/types/agent-team-instance.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts test tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`
- `LMSTUDIO_HOSTS=http://127.0.0.1:1234 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts test tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`

## Key Findings

1. Existing continuation coverage gap
- Current team-history e2e coverage included mocked runtime-manager and mocked `LLMFactory` paths.
- Those tests verify control flow but do not fully verify real provider behavior after terminate/continue.

2. Real-provider test pattern exists in core library
- `autobyteus-ts` integration tests gate LM Studio runs by env and resolve model identifiers dynamically.
- The same gating/resolver approach can be reused in server e2e without branch switching.

3. Terminate/continue scenario can be verified with no mocks
- A real LM Studio test can assert:
  - persistence files are written (`raw_traces.jsonl`, `working_context_snapshot.json`),
  - team can be terminated and continued via GraphQL,
  - continued response reuses prior context by recalling a pre-terminate token.

4. Local verification result
- With `LMSTUDIO_HOSTS=http://127.0.0.1:1234`, the no-mock LM Studio continuation test passed end-to-end.

## Constraints

- Keep deterministic mocked tests for baseline CI stability.
- Add real-provider path as env-gated test, not mandatory for environments without LM Studio.
- No enterprise checkout/merge; work only in personal worktree.

## Open Questions

1. CI policy
- Should LM Studio real-provider tests run in a dedicated optional CI job or remain local/opt-in?

2. Model determinism
- If recall prompt quality degrades for some local models, should acceptance allow a softer semantic assertion?

## Implications

- Backend test strategy should contain both:
  - deterministic mocked coverage for fast/stable control-flow protection,
  - real-provider opt-in coverage for true continuation + restore behavior.
