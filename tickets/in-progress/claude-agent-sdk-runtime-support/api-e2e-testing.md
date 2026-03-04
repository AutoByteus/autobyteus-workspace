# API/E2E Testing

- Stage: `7`
- Date: `2026-03-04`
- Result: `Pass`

## Scope

Validated API/E2E acceptance behavior for Claude runtime support, external-member runtime routing, Codex-vs-Claude live E2E parity, team run continuation/run-history behavior, and strict continuation send/receive checks (`send -> receive`, `continue -> send -> receive`).

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
15. `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
16. `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
17. `pnpm -C autobyteus-server-ts test`
18. `pnpm -C autobyteus-web test`

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
- Strict continuation checks: Claude live E2E now enforces `send -> non-empty READY`, then `continue -> send -> non-empty READY` and post-continue team websocket professor output assertions.
- Latest live Claude rerun: `13/13 passed`; latest live Codex rerun: `13/13 passed`.
- Latest full backend rerun: `246 passed / 7 skipped`, `1070 passed / 34 skipped`.
- Latest full frontend rerun: `test:nuxt 143 files / 708 passed` + `test:electron 6 files / 38 passed`.
- No Stage 7 blockers remain.

## Notes

- Web tests require generated `.nuxt` artifacts; running `nuxt prepare` is required in a clean worktree.

## Re-Entry Delta (2026-03-02, R-013 listener continuity)

### Additional Commands

19. `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
20. `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`
21. `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
22. `pnpm -C autobyteus-server-ts test`
23. `pnpm -C autobyteus-web test`

### Delta Results

- Live Claude team continuation scenario that previously failed now passes with explicit continue/send websocket assertions (`2/2`).
- Live Claude runtime GraphQL suite remains green after the listener lifecycle fix (`11/11`).
- Live Codex runtime/team suites remain green after the shared runtime listener lifecycle change (`13/13`).
- Full backend suite pass (latest): `246 passed / 7 skipped`, `1072 passed / 34 skipped`.
- Full frontend suite pass (latest): `test:nuxt 143 files / 708 tests` and `test:electron 6 files / 38 tests`.

## Re-Entry Delta (2026-03-02, R-014 team-tooling parity evidence refresh)

### Additional Commands

24. `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
25. `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
26. `pnpm -C autobyteus-server-ts test --run`
27. `pnpm -C autobyteus-web test`

### Delta Results

- Live Claude team E2E passed with real `send_message_to` ping->pong->ping relay assertions and continuation workspace mapping checks (`2/2`).
- Live Codex team E2E passed with matching routing + continuation assertions (`2/2`).
- Latest full backend suite pass: `247 files passed / 7 skipped`, `1081 passed / 34 skipped`.
- Latest full frontend suite pass: `test:nuxt 143 files / 708 tests` and `test:electron 6 files / 38 tests`.

## Re-Entry Delta (2026-03-02, R-015..R-017 V2-only control-binding fix + quota block)

### Additional Commands

28. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.test.ts tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts`
29. `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts -t "routes live inter-agent send_message_to ping->pong->ping roundtrip in Claude team runtime"`
30. `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
31. `pnpm -C autobyteus-server-ts build`
32. `pnpm -C autobyteus-server-ts test`
33. `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`

### Delta Results

- V2 runtime crash fixed: `TypeError: Cannot read properties of undefined (reading 'sdkMcpServerInstances')` no longer reproduces after bound control-method invocation patch.
- Codex live runtime/team suites remain green (`13/13`), confirming no regression in existing runtime.
- Backend build + full backend suite are green (`248 files passed / 7 skipped`, `1087 passed / 34 skipped`).
- Live Claude E2E currently fails on provider quota output (`You've hit your limit · resets 8pm (Europe/Berlin)`), which prevents token-based scenario assertions from completing.
- Stage 7 remains `Blocked` until quota reset, then live Claude command (33) must be rerun to close the gate.

## Re-Entry Delta (2026-03-02, quota reset verification closure)

### Additional Commands

34. `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts --reporter=verbose`
35. `RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
36. `pnpm -C autobyteus-server-ts test`
37. `pnpm -C autobyteus-web test`

### Delta Results

- Live Claude quota window cleared and both live suites now pass end-to-end.
- `tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`: `11/11` passed.
- `tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`: `2/2` passed.
- Combined live Claude runtime matrix: `13/13` passed.

## Re-Entry Delta (2026-03-02, post-reset full confidence rerun)

### Additional Commands

35. `RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
36. `pnpm -C autobyteus-server-ts test`
37. `pnpm -C autobyteus-web test`

### Delta Results

- Live Codex+Claude runtime/team matrix rerun passed: `4 files`, `26/26 tests`.
- Full backend suite rerun passed: `248 files passed / 7 skipped`, `1087 passed / 34 skipped`.
- Full frontend suite rerun passed: `test:nuxt 143 files / 708 tests` and `test:electron 6 files / 38 tests`.

## Re-Entry Delta (2026-03-04, Claude streaming-cadence investigation + verification)

### Additional Commands

38. `CLAUDE_AGENT_SDK_AUTH_MODE=cli node --input-type=module (...) unstable_v2_createSession + session.stream() chunk probe`
39. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts`
40. `RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`

### Delta Results

- Live SDK probe confirms current Claude V2 session stream shape is coarse-grained (`system`, `assistant`, `result`) with no token-level `stream_event` deltas exposed by default session path.
- Claude runtime unit suite passed after cadence fix (`21/21`), including:
  - stream-event delta priority over assistant/result snapshots,
  - snapshot-suffix reconciliation to avoid duplicate full-buffer flush behavior.
- Live runtime/team/run-history matrix rerun passed after implementation: `5 files`, `37 passed / 1 skipped`.
- Codex live runtime/team scenarios remain green in the same matrix run, confirming no cross-runtime regression.
