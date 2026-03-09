# API / E2E Testing

- Ticket: `team-agent-instruction-composition`
- Status: `Pass`
- Last Updated: `2026-03-09`

## Scenario Matrix

| Scenario ID | Acceptance Criteria | Scenario | Evidence | Result |
| --- | --- | --- | --- | --- |
| S7-001 | AC-001 | GraphQL create-team-run persists team instructions and agent instructions into member-runtime metadata | `tests/e2e/run-history/team-run-history-graphql.e2e.test.ts` | Passed |
| S7-002 | AC-004 | Existing team member projection / manifest contract remains valid after member-runtime bootstrap changes | `tests/e2e/run-history/team-member-projection-contract.e2e.test.ts` | Passed |
| S7-003 | AC-002 | Codex runtime maps explicit `Team Instruction` and `Agent Instruction` sections plus separate `Runtime Instruction` guidance into the thread start payload | `tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts` | Passed |
| S7-004 | AC-003 | Claude runtime maps explicit `<team_instruction>`, `<agent_instruction>`, and `<runtime_instruction>` sections into turn input | `tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.test.ts`, `tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts` | Passed |
| S7-005 | AC-005 | Missing instruction sources degrade predictably without fabricated persona text | `tests/unit/runtime-execution/member-runtime/member-runtime-instruction-composer.test.ts` | Passed |
| S7-006 | AC-006 | Old adapter-owned hard-coded primary prompt blocks are removed from Codex and Claude | Source diff + `tests/unit/runtime-execution/codex-app-server/codex-send-message-tooling.test.ts`, `tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-team-metadata.test.ts` | Passed |
| S7-007 | Validation Extension | Broader Claude backend runtime, adapter, model-catalog, and live-E2E surfaces remain green after the instruction-composition refactor | `tests/unit/runtime-execution/claude-agent-sdk/*.test.ts`, `tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts`, `tests/unit/runtime-management/model-catalog/claude-runtime-model-provider.test.ts`, `tests/e2e/runtime/claude-*.test.ts` | Passed |
| S7-008 | Validation Extension | Broader Codex backend runtime, adapter, model-catalog, projection, and live-E2E surfaces remain green after the instruction-composition refactor plus the merged Codex stabilization fixes | `tests/unit/runtime-execution/codex-app-server/*.test.ts`, `tests/unit/runtime-execution/adapters/codex-app-server-runtime-adapter.test.ts`, `tests/unit/runtime-management/model-catalog/codex-runtime-model-provider.test.ts`, `tests/unit/run-history/projection/codex-thread-run-projection-provider.test.ts`, `tests/e2e/runtime/codex-*.test.ts` | Passed |
| S7-009 | Validation Extension | With `RUN_CODEX_E2E=1`, live Codex backend runtime suites execute and the merged branch remains green end-to-end | `tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`, `tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`, serialized Codex backend sweep under `RUN_CODEX_E2E=1` | Passed |
| S7-010 | Validation Extension | Frontend streaming/rendering keeps the conversation grid and activity panel aligned when a placeholder tool name is later resolved to `send_message_to` | `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts`, `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts`, `autobyteus-web/services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts`, `autobyteus-web/stores/__tests__/agentActivityStore.spec.ts` | Passed |
| S7-011 | Validation Extension | Wording-only runtime prompt refinement remains aligned across the shared composer and both Claude/Codex renderers | `tests/unit/runtime-execution/member-runtime/member-runtime-instruction-composer.test.ts`, `tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.test.ts`, `tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts` | Passed |

## Executed Commands

| Timestamp | Command | Result |
| --- | --- | --- |
| 2026-03-09 | `pnpm exec vitest run tests/e2e/run-history/team-run-history-graphql.e2e.test.ts tests/e2e/run-history/team-member-projection-contract.e2e.test.ts` | Passed |
| 2026-03-09 | `pnpm exec vitest run tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.test.ts tests/unit/runtime-execution/member-runtime/member-runtime-instruction-composer.test.ts` | Passed |
| 2026-03-09 | `pnpm exec vitest run tests/unit/runtime-execution/member-runtime/member-runtime-instruction-composer.test.ts tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.test.ts tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts tests/e2e/run-history/team-run-history-graphql.e2e.test.ts` | Passed |
| 2026-03-09 | `pnpm exec vitest run $(rg --files tests | rg 'claude|codex' | rg '\.test\.ts$')` | Passed |
| 2026-03-09 | `RUN_CODEX_E2E=1 pnpm exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t 'returns non-empty run projection conversation for completed codex runs|restores a terminated codex run in the same workspace after continueRun'` | Passed |
| 2026-03-09 | `RUN_CODEX_E2E=1 pnpm exec vitest run --maxWorkers 1 $(rg --files tests | rg 'codex' | rg '\.test\.ts$')` | Passed |
| 2026-03-09 | `RUN_CLAUDE_E2E=1 pnpm exec vitest run --maxWorkers 1 $(rg --files tests | rg 'claude' | rg '\.test\.ts$')` | Passed |
| 2026-03-09 | `pnpm exec vitest run services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts stores/__tests__/agentActivityStore.spec.ts` | Passed |
| 2026-03-09 | `pnpm exec vitest run tests/unit/runtime-execution/member-runtime/member-runtime-instruction-composer.test.ts tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.test.ts tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts` | Passed |
| 2026-03-09 | `RUN_CODEX_E2E=1 pnpm exec vitest run --maxWorkers 1 $(rg --files tests | rg 'codex' | rg '\.test\.ts$')` | Passed (`12` files, `70` tests) |
| 2026-03-09 | `RUN_CLAUDE_E2E=1 pnpm exec vitest run --maxWorkers 1 $(rg --files tests | rg 'claude' | rg '\.test\.ts$')` | Passed (`12` files, `87` tests) |

## Notes

- The new API/E2E coverage exercises the real GraphQL team-run creation path and validates the persisted member-runtime metadata contract.
- The refinement pass explicitly revalidated prompt formatting at the runtime edge: Codex now receives Markdown section headers, and Claude now receives separate XML tags.
- The broader backend sweep passed for all runnable Claude/Codex suites before live opt-in; the remaining gap was explicit live Codex validation.
- Live Codex validation was rerun on the merged branch with `RUN_CODEX_E2E=1`, including the restore/projection regression target and the full serialized Codex sweep. That path is now green: `12` Codex test files passed with `70` tests passed.
- Live Claude validation was then executed on the merged branch with `RUN_CLAUDE_E2E=1`. That path is also green: `12` Claude test files passed with `87` tests passed, including both single-agent and team-runtime live suites.
- The user-reported frontend regression was a placeholder-resolution bug, not a disagreement about the real tool identity: `unknown_tool` could be upgraded in the activity store, but the main conversation segment was keeping the placeholder. Focused frontend regression tests now cover that upgrade path across segment start/end, lifecycle updates, error handling, and activity-store state.
- The latest wording-only refinement makes the runtime guidance explicitly conditional: it now describes how to use `send_message_to` if the agent chooses to use it, without implying that runtime policy overrides the agent-authored collaboration instructions.
- The latest user-requested serialized live rerun reconfirmed both opt-in runtime transports after the wording-only refinement and the frontend placeholder fix: Codex remained green at `12/12` files and `70/70` tests, and Claude remained green at `12/12` files and `87/87` tests.
- Codex still emits external warnings during live runs, including shell-snapshot cleanup warnings and personality fallback warnings, but those no longer cause backend failures on the merged branch.
- Claude live runs still emit non-fatal warnings such as missing prompt-file fixtures and missing archived memory files during history restoration, but those did not cause backend failures on the merged branch.
- Current strongest non-live validation path is hybrid: GraphQL/API E2E proves persisted metadata contract, while runtime unit/integration tests prove the exact outbound prompt sections built from that metadata.
- A stricter black-box backend E2E that asserts exact prompt text would require one of two additions: a test-only fake runtime transport that captures outbound payloads during a GraphQL run, or explicit server-side debug telemetry exposing the composed prompt for assertions.
- External runtime process startup was intentionally mocked at the runtime composition boundary in `S7-001` so the test could validate server behavior deterministically without depending on a live Codex or Claude runtime process.
