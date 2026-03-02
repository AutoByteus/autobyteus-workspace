# Implementation Progress

- Ticket: `claude-agent-sdk-runtime-support`
- Started: `2026-02-28`
- Current Stage: `10`
- Overall Status: `Completed (all Stage 7 live-Claude gates revalidated after quota reset)`

## Batch Status

| Batch | Description | Status |
| --- | --- | --- |
| A | Runtime core contracts and registries | Completed |
| B | Claude runtime service + adapter | Completed |
| C | Model catalog + projection | Completed |
| D | Team runtime decoupling | Completed |
| E | Frontend runtime option support | Completed |
| F | Verification and stabilization | Completed |
| G | Codex parity closure + final regression validation | Completed |
| H | External runtime listener continuity across restore | Completed |
| I | Claude SDK tooling hardening + runtime decoupling refactor | Completed |
| J | Claude V2-only runtime migration + legacy turn-path retirement | Completed |

## Change Tracking

| Change ID | Type | Target | Build State | Test State | Notes |
| --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `runtime-kind.ts` | Done | Done | Added `claude_agent_sdk` runtime kind |
| C-002 | Modify | `runtime-capability-service.ts` | Done | Done | Descriptor-based capability probes (`CODEX_APP_SERVER_ENABLED`, `CLAUDE_AGENT_SDK_ENABLED`) |
| C-003 | Add | `external-runtime-event-source-port.ts` | Done | Done | Runtime-neutral external event source contract |
| C-004 | Add | `external-runtime-event-source-registry.ts` | Done | Done | Runtime-kind dispatch + codex/claude source registration |
| C-005 | Add | `claude-agent-sdk-runtime-service.ts` | Done | Done | Session lifecycle, stream events, model/session APIs |
| C-006 | Add | `claude-agent-sdk-runtime-adapter.ts` | Done | Done | Runtime adapter integration |
| C-007 | Modify | `runtime-adapter-registry.ts` | Done | Done | Default registry includes Claude adapter |
| C-008 | Modify | `agent-stream-handler.ts` | Done | Done | Generic external runtime stream path via source registry |
| C-009 | Modify | team runtime event bridge | Done | Done | Runtime-neutral bridge (`team-external-runtime-event-bridge.ts`) |
| C-010 | Modify | `agent-team-stream-handler.ts` | Done | Done | Runtime-neutral external member mode handling |
| C-011 | Modify | `team-runtime-binding-registry.ts` | Done | Done | Mode rename to `external_member_runtime` |
| C-012 | Modify | `team-run-mutation-service.ts` | Done | Done | Runtime-neutral mode resolution and branch routing |
| C-013 | Modify | `team-member-runtime-orchestrator.ts` | Done | Done | External runtime sessions + codex relay isolation |
| C-014 | Modify | `run-projection-provider-registry.ts` | Done | Done | Registered Claude projection provider |
| C-015 | Add | `claude-session-run-projection-provider.ts` | Done | Done | Claude session transcript projection |
| C-016 | Modify | `team-member-run-projection-service.ts` | Done | Done | Runtime-kind projection provider fallback |
| C-017 | Modify | `runtime-model-catalog-service.ts` | Done | Done | Registered Claude model provider |
| C-018 | Add | `claude-runtime-model-provider.ts` | Done | Done | Claude model listing/reload provider |
| C-019 | Modify | web `AgentRunConfig` type | Done | Done | Added `claude_agent_sdk` union value + runtime guard |
| C-020 | Modify | web `AgentRunConfigForm.vue` | Done | Done | Added Claude runtime option + generic normalization |
| C-021 | Modify | web `TeamRunConfigForm.vue` | Done | Done | Added Claude runtime option + generic normalization |
| C-022 | Modify | tests (server/web) | Done | Done | Updated runtime-kind/mode/capability/projection/config-form expectations |
| C-023 | Modify | `team-run-history-service.ts` | Done | Done | Wired external-member activity checks into singleton |
| C-024 | Modify | `team-run-continuation-service.test.ts` | Done | Done | Fixed manifest fixture shape for stricter external-runtime branching semantics |
| C-025 | Add | Claude runtime unit suites | Done | Done | Added runtime-layer coverage for Claude runtime service, adapter, and external runtime event-source registry |
| C-026 | Modify | `claude-agent-sdk-runtime-service.ts` | Done | Done | Fixed Claude stream delta normalization to preserve intentional whitespace |
| C-027 | Modify | Verification matrix | Done | Done | Expanded Claude-enabled verification to include runtime-layer suites plus full backend/frontend and live Codex reruns |
| C-028 | Modify | Claude runtime regression tests | Done | Done | Added unit coverage for resume-by-session-id behavior and live GraphQL assertion preventing fallback to legacy model IDs |
| C-029 | Modify | `claude-agent-sdk-runtime-service.ts` | Done | Done | Fixed first-turn restore semantics to avoid placeholder resume IDs for team external-member runs |
| C-030 | Modify | `team-member-runtime-orchestrator.ts` | Done | Done | Persist refreshed external runtime reference into team binding registry after member sends |
| C-031 | Add | Claude parity team E2E suite | Done | Done | Added `claude-team-external-runtime.e2e.test.ts` to mirror Codex team live parity coverage |
| C-032 | Modify | Team stream reconnect behavior (web) | Done | Done | Reconnect stale/disconnected team websocket streams after send and sync `isSubscribed` on connect/disconnect callbacks |
| C-033 | Modify | `claude-agent-sdk-runtime-service.ts` | Done | Done | Added live Claude assistant chunk (`assistant.message.content[].text`) and `result` fallback normalization to prevent empty assistant output |
| C-034 | Modify | Claude live runtime E2E assertions | Done | Done | Hardened live tests to require non-empty assistant output content for single-agent and team-member turns |
| C-035 | Modify | `agent-team-stream-handler.ts` | Done | Done | Added external-member runtime bridge subscription refresh after member sends so post-continue events reach reattached sockets |
| C-036 | Modify | Claude continuation live E2E assertions | Done | Done | Enforced send->receive and continue->send->receive checks with explicit non-empty `READY` output assertions |
| C-037 | Modify | team stream handler unit + Claude team E2E | Done | Done | Updated unit expectations for resubscribe behavior and added strict post-continue websocket professor output checks |
| C-038 | Modify | external runtime services listener lifecycle | Done | Done | Added `runId`-keyed deferred listener continuity across close/restore in Claude and Codex runtime services |
| C-039 | Modify | runtime service tests + live continuation verification | Done | Done | Added listener continuity unit coverage and reran live Claude/Codex runtime-team E2E plus full backend/frontend suites |
| C-040 | Modify | Claude runtime executable resolution | Done | Done | Added runtime metadata/env/default executable resolver and passed `pathToClaudeCodeExecutable` for Claude turn/query calls |
| C-041 | Modify | Claude model-discovery SDK interop | Done | Done | Wired executable path into query-control model discovery to avoid bundled `cli.js` resolution failure |
| C-042 | Modify | Claude runtime unit tests | Done | Done | Added assertions for executable-path propagation on turn execution + model discovery |
| C-043 | Refactor | Claude runtime module boundaries | Done | Done | Split oversized Claude runtime service into focused modules; reduced main service file below hard size-review threshold |
| C-044 | Modify | Frontend test setup stability | Done | Done | Hardened websocket test setup fetch binding (`$fetch`) to prevent intermittent post-teardown failures in full Nuxt suite |
| C-045 | Modify | Claude team metadata guidance + tests | Done | Done | Strengthened teammate-aware `send_message_to` instructions and added focused unit coverage for metadata/prompt composition |
| C-046 | Modify | `claude-runtime-v2-control-interop.ts` + unit test | Done | Done | Fixed V2 `setMcpServers` invocation to preserve control-object method binding (`this`) and added regression test that fails on unbound call |

## Verification Log

| Timestamp | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-02-28 | `pnpm install` | Pass | Dependencies installed for workspace |
| 2026-02-28 | `pnpm -C autobyteus-server-ts build` | Pass | Includes `autobyteus-ts` prebuild + server build |
| 2026-02-28 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/runtime-kind.test.ts tests/unit/runtime-management/runtime-capability-service.test.ts tests/unit/runtime-management/model-catalog/runtime-model-catalog-service.test.ts tests/unit/runtime-management/model-catalog/claude-runtime-model-provider.test.ts tests/unit/runtime-execution/runtime-adapter-registry.test.ts tests/unit/runtime-execution/runtime-command-ingress-service.test.ts tests/unit/run-history/projection/run-projection-provider-registry.test.ts tests/unit/run-history/team-member-run-projection-service.test.ts tests/unit/run-history/team-run-history-service.test.ts tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` | Pass | 11 files, 38 tests passed |
| 2026-02-28 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts tests/e2e/agent-team-execution/send-message-to-team-graphql-contract.e2e.test.ts` | Pass | 2 files, 4 tests passed |
| 2026-02-28 | `pnpm -C autobyteus-server-ts exec vitest run` | Failed | 1 failure (`team-run-continuation-service.test.ts`) uncovered by full-suite run; fixed in C-024 |
| 2026-02-28 | `pnpm -C autobyteus-server-ts exec vitest run` | Pass | Full backend suite passed: 243 files, 1052 tests (plus 5 skipped files / 21 skipped tests) |
| 2026-02-28 | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` | Pass | Live Codex runtime E2E explicitly enabled: 13 tests passed |
| 2026-02-28 | `CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts tests/unit/runtime-management/model-catalog/claude-runtime-model-provider.test.ts tests/unit/runtime-management/runtime-capability-service.test.ts` | Pass | Explicit Claude runtime capability/model-provider verification with enable toggle |
| 2026-02-28 | `pnpm -C autobyteus-web exec nuxt prepare` | Pass | Generated `.nuxt` test prerequisites |
| 2026-02-28 | `pnpm -C autobyteus-web exec vitest run components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts stores/__tests__/runtimeCapabilitiesStore.spec.ts` | Pass | 3 files, 14 tests passed |
| 2026-02-28 | `pnpm -C autobyteus-web test` | Pass | Full frontend suite passed (`test:nuxt` 706 tests + `test:electron` 38 tests) |
| 2026-02-28 | `pnpm -C autobyteus-web test` | Failed | Non-deterministic Nuxt post-teardown `$fetch` error observed once; reproduced test:nuxt independently and reran full frontend suite to green |
| 2026-02-28 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts tests/unit/runtime-execution/external-runtime-event-source-registry.test.ts` | Pass | New Claude runtime-layer unit suites: 3 files, 14 tests passed |
| 2026-02-28 | `CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts tests/e2e/agent-team-execution/send-message-to-team-graphql-contract.e2e.test.ts tests/unit/runtime-management/runtime-kind.test.ts tests/unit/runtime-management/runtime-capability-service.test.ts tests/unit/runtime-management/model-catalog/runtime-model-catalog-service.test.ts tests/unit/runtime-management/model-catalog/claude-runtime-model-provider.test.ts tests/unit/runtime-execution/runtime-adapter-registry.test.ts tests/unit/runtime-execution/runtime-command-ingress-service.test.ts tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts tests/unit/runtime-execution/external-runtime-event-source-registry.test.ts tests/unit/run-history/projection/run-projection-provider-registry.test.ts tests/unit/run-history/team-member-run-projection-service.test.ts tests/unit/run-history/team-run-history-service.test.ts tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` | Pass | Expanded Claude runtime matrix: 16 files, 56 tests passed |
| 2026-02-28 | `pnpm -C autobyteus-server-ts exec vitest run` | Pass | Full backend suite rerun after Claude runtime-layer additions: 246 files, 1066 tests (plus 5 skipped files / 21 skipped tests) |
| 2026-02-28 | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` | Pass | Live Codex runtime E2E rerun: 2 files, 13 tests passed |
| 2026-02-28 | `pnpm -C autobyteus-web test` | Pass | Full frontend suite rerun after backend/runtime changes: `test:nuxt` 706 + `test:electron` 38 |
| 2026-02-28 | `pnpm -C autobyteus-server-ts typecheck` | Failed | Repository baseline issue (`rootDir: src` + `include: tests`) not introduced by this ticket |
| 2026-02-28 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts` | Pass | Unit/runtime checks passed; Claude e2e intentionally skipped without live flag |
| 2026-02-28 | `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts` | Pass | Live Claude GraphQL transport validated: model listing + send/terminate (`2 tests`) |
| 2026-02-28 | `RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts test` | Pass | Full backend with both live runtimes enabled: `249 files / 1083 tests`, `3 skipped files / 8 skipped tests` |
| 2026-02-28 | `pnpm -C autobyteus-web test` | Pass | Full frontend verification refresh: `test:nuxt 706` + `test:electron 38` |
| 2026-02-28 | `rg --line-number "\\bit\\(" autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts \| wc -l` | Pass | Codex live E2E count baseline confirmed: `13` |
| 2026-02-28 | `rg --line-number "\\bit\\(" autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts autobyteus-server-ts/tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts \| wc -l` | Pass | Claude live E2E count matched Codex baseline: `13` |
| 2026-02-28 | `RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts test` | Pass | Final full backend with both live runtimes: `250 files passed / 3 skipped`, `1095 tests passed / 8 skipped` |
| 2026-02-28 | `pnpm -C autobyteus-web test` | Pass | Final full frontend pass: `test:nuxt 143 files / 706 tests`, `test:electron 6 files / 38 tests` |
| 2026-02-28 | `RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts tests/e2e/run-history/team-run-history-graphql.e2e.test.ts` | Pass | Focused team routing + continuation/run-history: `3 files passed`, `8 passed / 1 skipped` |
| 2026-03-01 | `RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/run-history/team-run-history-graphql.e2e.test.ts` | Pass | Revalidated fundamental live runtime/team flows after user-reported manual symptom: `4 files passed`, `19 passed / 1 skipped` |
| 2026-03-01 | `pnpm -C autobyteus-web exec vitest run stores/__tests__/agentTeamRunStore.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Pass | New reconnect regression tests passed: `2 files`, `8 tests` |
| 2026-03-01 | `pnpm -C autobyteus-web test` | Pass | Full frontend regression rerun after reconnect fix: `test:nuxt 143 files / 708 tests` + `test:electron 6 files / 38 tests` |
| 2026-03-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts` | Pass | Added regression for real Claude chunk shape; unit suite now validates assistant content extraction |
| 2026-03-01 | `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts` | Pass | Live Claude runtime/team E2E rerun with strict non-empty assistant output assertions: `13/13` |
| 2026-03-01 | `pnpm -C autobyteus-server-ts test` | Pass | Full backend suite rerun after normalization + E2E assertion hardening: `246 passed / 7 skipped`, `1070 passed / 34 skipped` |
| 2026-03-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` | Pass | Unit verification for external-member bridge resubscribe behavior (`2/2`) |
| 2026-03-02 | `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts` | Pass | Live Claude runtime/team E2E with strict continuation send/receive checks (`13/13`) |
| 2026-03-02 | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` | Pass | Live Codex runtime/team E2E rerun for parity and guard against regressions (`13/13`) |
| 2026-03-02 | `pnpm -C autobyteus-server-ts test` | Pass | Full backend suite passed after rerun (`246 passed / 7 skipped`, `1070 passed / 34 skipped`) |
| 2026-03-02 | `pnpm -C autobyteus-web test` | Pass | Full frontend suite passed (`test:nuxt 143 files / 708 tests`, `test:electron 6 files / 38 tests`) |
| 2026-03-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts` | Pass | Runtime listener continuity unit coverage validated (`22/22`) |
| 2026-03-02 | `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts` | Pass | Previously failing live continue/send websocket assertion now passes (`2/2`) |
| 2026-03-02 | `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts` | Pass | Live Claude runtime e2e still green after listener continuity change (`11/11`) |
| 2026-03-02 | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` | Pass | Live Codex runtime/team regression guard after runtime listener lifecycle changes (`13/13`) |
| 2026-03-02 | `pnpm -C autobyteus-server-ts test` | Pass | Full backend suite passed after listener continuity change (`246 passed / 7 skipped`, `1072 passed / 34 skipped`) |
| 2026-03-02 | `pnpm -C autobyteus-web test` | Pass | Full frontend suite passed unchanged (`test:nuxt 143/708`, `test:electron 6/38`) |
| 2026-03-02 | `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts` | Pass | Live Claude team routing + continuation workspace mapping passed (`2/2`) with real `send_message_to` ping->pong->ping verification |
| 2026-03-02 | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` | Pass | Live Codex team routing + continuation workspace mapping passed (`2/2`) for parity regression guard |
| 2026-03-02 | `pnpm -C autobyteus-server-ts test --run` | Pass | Latest full backend suite: `247 files passed / 7 skipped`, `1081 tests passed / 34 skipped` |
| 2026-03-02 | `pnpm -C autobyteus-web test` | Pass | Latest full frontend suite: `test:nuxt 143 files / 708 tests`, `test:electron 6 files / 38 tests` |
| 2026-03-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.test.ts tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts` | Pass | Validated V2 control-binding fix and Claude runtime service unit coverage (`19/19`) |
| 2026-03-02 | `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts -t \"routes live inter-agent send_message_to ping->pong->ping roundtrip in Claude team runtime\"` | Failed | Runtime crash removed; failure now due provider quota response (`You've hit your limit · resets 8pm`) instead of `sdkMcpServerInstances` error |
| 2026-03-02 | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` | Pass | Live Codex runtime/team matrix still green (`13/13`) |
| 2026-03-02 | `pnpm -C autobyteus-server-ts build` | Pass | Server + dependency build passed after V2 control-binding fix |
| 2026-03-02 | `pnpm -C autobyteus-server-ts test` | Pass | Full backend suite passed (`248 files passed / 7 skipped`, `1087 passed / 34 skipped`) |
| 2026-03-02 | `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts` | Failed | 4 assertions fail only because live Claude replies with quota-limit text; no runtime wiring exceptions observed |
| 2026-03-02 | `pnpm -C autobyteus-web test` | Pass | Frontend regression rerun after backend V2 binding fix: `test:nuxt 143 files / 708 tests`, `test:electron 6 files / 38 tests` |
| 2026-03-02 | `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts --reporter=verbose` | Pass | Post-reset live Claude verification closure: `13/13` passed (`11 runtime + 2 team`) |
| 2026-03-02 | `RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts` | Pass | Full live Codex+Claude runtime/team matrix rerun: `4 files`, `26/26` |
| 2026-03-02 | `pnpm -C autobyteus-server-ts test` | Pass | Post-reset backend confidence rerun: `248 files passed / 7 skipped`, `1087 passed / 34 skipped` |
| 2026-03-02 | `pnpm -C autobyteus-web test` | Pass | Post-reset frontend confidence rerun: `test:nuxt 143 files / 708 tests`, `test:electron 6 files / 38 tests` |

## Blockers

- No open blockers for this ticket.
