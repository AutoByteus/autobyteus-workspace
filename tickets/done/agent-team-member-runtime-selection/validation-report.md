# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/tickets/in-progress/agent-team-member-runtime-selection/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/tickets/in-progress/agent-team-member-runtime-selection/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/tickets/in-progress/agent-team-member-runtime-selection/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/tickets/in-progress/agent-team-member-runtime-selection/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/tickets/in-progress/agent-team-member-runtime-selection/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/tickets/in-progress/agent-team-member-runtime-selection/review-report.md`
- Current Validation Round: `4`
- Trigger: `code_reviewer` round-9 pass package on `2026-04-23`, after `CR-004` repaired mixed-team reopen/hydration default-tuple truth in the shared frontend reconstruction owner.
- Prior Round Reviewed: `3`
- Latest Authoritative Round: `4`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | Review-passed package handed to API/E2E, then scope expanded to add top-level mixed-runtime API coverage and regression checks | `N/A` | `0` | `Pass` | `No` | Added top-level GraphQL/WebSocket integration coverage with controlled runtime doubles, reran broader server regressions, copied requested worktree env files, and passed `autobyteus-ts` live single-agent + agent-team flows. |
| `2` | User raised the bar to strict fully live mixed-runtime E2E | `Yes` — round-1 live-mixed proof gap was rechecked and closed | `3` | `Pass` | `No` | Repaired live Codex E2E query drift, fixed Codex `send_message_to` dynamic-tool contract, fixed mixed backend member `memoryDir` provisioning for live AutoByteus members, added a fully live mixed GraphQL/WebSocket E2E, and reran focused live AutoByteus/Codex prerequisite suites. |
| `3` | User-reported frontend mixed-runtime launch UX gap returned through solution/design/implementation/review and came back review-passed in round 7 | `Yes` — the app-level inability to choose per-member runtimes was rechecked and closed | `0` | `Pass` | `No` | Validated the reviewed frontend per-member runtime override UX, unresolved-row readiness blocking, mixed temp-context materialization, mixed launch payload fanout, frontend reopen/hydration reconstruction coverage, and browser-driven local app launch behavior on the ticket branch. |
| `4` | `code_reviewer` round-9 pass package after `CR-004` repaired mixed-team reopen/hydration truth | `Yes` — the CR-004 split-dominance reopen bug was rechecked and closed | `0` | `Pass` | `Yes` | Revalidated the shared frontend reconstruction owner, reran focused frontend and top-level server suites, and proved in the live app that a freshly launched mixed team can be reopened from persisted history with a coherent default runtime/model tuple and preserved divergent member override. |

## Validation Basis

- Approved scope requires mixed-team create/restore/delivery behavior while keeping `TeamBackendKind` team-owned and `RuntimeKind` member-owned.
- Implementation handoff `Legacy / Compatibility Removal Check` reported no compatibility wrappers in scope; validation spot-checks matched that.
- Round 1 user requests required durable top-level coverage for mixed AutoByteus+Codex teams plus regression checks for standalone agent and existing non-mixed team flows.
- Round 1 user requests also required direct `autobyteus-ts` flow validation for both single-agent and agent-team paths and asked for worktree env parity with the main repo before running those flows.
- Round 2 user requests explicitly rejected “API integration over doubles” as sufficient E2E proof and required a fully live mixed-runtime create -> stop -> restore -> continue validation from the endpoint layer.
- After manual app validation exposed that the frontend still could not launch mixed-runtime teams truthfully, the user explicitly expanded the ticket close condition to include the app UX itself. Round 3 therefore validated the reviewed frontend mixed-runtime runtime-selection slice in addition to retaining the earlier server/API proof.
- Round 4 was triggered by `CR-004`, which showed that reopen/hydration could still synthesize a default runtime/model pair that no real reopened team member used. Round 4 therefore revalidated mixed-team reopen/hydration truth from the reviewed shared reconstruction owner and from a live browser-driven history reopen of a real mixed team.
- The authoritative sign-off now depends on both:
  - retained round-2 live GraphQL/WebSocket proof for real AutoByteus+Codex mixed-runtime create/restore/delivery, and
  - round-4 proof that the reviewed frontend can truthfully configure, gate, materialize, launch, and reopen/hydrate a mixed-runtime team from the app.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified during the reopened-scope loop: `solution_designer`

## Validation Surfaces / Modes

- GraphQL mutation endpoint integration (`createAgentRun`, `createAgentTeamRun`, `terminateAgentTeamRun`, `restoreAgentTeamRun`)
- WebSocket integration (`/ws/agent/:runId`, `/ws/agent-team/:teamRunId`)
- Durable top-level integration with real server/API plumbing and controlled in-process runtime doubles (supplemental proof)
- Fully live GraphQL/WebSocket E2E against real AutoByteus LM Studio runtime
- Fully live GraphQL/WebSocket E2E against real Codex app-server runtime
- Fully live GraphQL/WebSocket E2E for mixed AutoByteus+Codex team creation, delivery, terminate, restore, and resumed delivery
- REST external-channel regression (`/api/channel-ingress/v1/messages`) from round 1
- Direct `autobyteus-ts` LM Studio integration flows for single-agent and agent-team execution
- Narrow unit validation for the repaired Codex tool-spec contract and mixed backend member memory layout
- `autobyteus-web` durable frontend validation for:
  - per-member runtime override UI,
  - mixed-runtime launch readiness,
  - mixed member materialization,
  - mixed launch payload fanout,
  - reopen/hydration reconstruction,
  - row-owner cleanup for stale member-only `llmConfig`,
  - dominant-cohort default tuple reconstruction for reopen/hydration
- Browser-driven executable validation against the live ticket-branch dev stack on `http://127.0.0.1:3000` + `http://127.0.0.1:8000` using `open_tab` and `run_script`
- Browser-driven live mixed-team history reopen/hydration after a real mixed launch using `runHistory.openTeamMemberRun(...)` on persisted server metadata

## Platform / Runtime Targets

- `RuntimeKind.AUTOBYTEUS`
- `RuntimeKind.CODEX_APP_SERVER`
- `RuntimeKind.CLAUDE_AGENT_SDK` at the frontend config/readiness layer
- `TeamBackendKind.AUTOBYTEUS`
- `TeamBackendKind.CODEX_APP_SERVER`
- `TeamBackendKind.MIXED`
- `autobyteus-ts` LM Studio runtime configured through the worktree `.env.test`
- Local Node/Vitest integration environment with SQLite test database and file-backed run metadata
- Real LM Studio-discovered AutoByteus text model and real Codex-discovered tool-capable model selected at runtime in live E2E
- Nuxt frontend workspace run-config UX and temp-team launch materialization on the ticket branch dev server

## Lifecycle / Upgrade / Restart / Migration Checks

- Round 1 proved mixed team terminate/restore lifecycle via top-level GraphQL create -> websocket delivery -> metadata refresh -> GraphQL terminate -> GraphQL restore -> post-restore delivery using controlled runtime doubles.
- Round 2 proved the same lifecycle fully live: GraphQL create -> real cross-runtime delivery in both directions -> GraphQL terminate -> GraphQL restore -> real cross-runtime delivery in both directions again.
- Round 2 asserted persisted member metadata after restore for runtime kind, model identifier, workspace root path, member route key, and Codex thread identity reuse.
- Round 3 proved the frontend config layer preserves mixed-runtime truth at the launch boundary instead of collapsing all members to one runtime.
- Round 3 retained durable reopen/hydration proof that frontend reconstruction preserves divergent member runtime overrides from persisted metadata.
- Round 4 proved a stronger app-level reopen case: after a real mixed browser launch promoted to a permanent backend team run, removing the local team context and reopening from run history reconstructed a coherent default `codex_app_server / gpt-5.4` tuple while preserving the divergent reviewer `autobyteus` override.
- Existing AutoByteus-only live team GraphQL/WebSocket restore flow still passes after the mixed-runtime fixes.
- Existing channel-ingress regression suite from round 1 still covers terminated-run restore for standalone agent and same-runtime team bindings.

## Coverage Matrix

| Scenario ID | Coverage Intent | Requirements / AC |
| --- | --- | --- |
| `S-001` | Top-level standalone agent GraphQL create + websocket send still works | Regression guard for untouched single-agent flow |
| `S-002` | Top-level same-runtime AutoByteus team GraphQL create + websocket send still selects native team backend | R-001 / R-010 regression |
| `S-003` | Top-level mixed AutoByteus+Codex GraphQL create/restore/delivery still works through the server boundary with controlled doubles | AC-001, AC-002, AC-003, AC-004 |
| `S-004` | Existing channel-ingress agent/team end-to-end flows still pass after runtime-selection changes | Regression guard for external surfaces |
| `S-005` | Existing same-runtime and mixed backend/service integration suites still pass | AC-001, AC-002, AC-003, AC-004, regression |
| `S-006` | `autobyteus-ts` single-agent runtime still completes a real start -> tool-call -> completion -> stop flow | Regression guard for standalone runtime/library flow |
| `S-007` | `autobyteus-ts` agent-team runtime still completes a real team start -> worker delivery -> tool-call -> idle -> shutdown flow | Regression guard for non-mixed team manager/runtime flow |
| `S-008` | Codex `send_message_to` dynamic tool spec uses the live contract field `inputSchema` | Round-2 prerequisite fix for live Codex team runtime |
| `S-009` | Mixed backend factory assigns `memberRunId` + `memoryDir` for live mixed members | Round-2 prerequisite fix for live mixed AutoByteus member creation |
| `S-010` | Live AutoByteus team GraphQL/WebSocket create -> tool approval -> restore still works | Regression guard for existing live same-runtime team E2E |
| `S-011` | Live Codex team inter-agent `send_message_to` ping->pong->ping roundtrip still works | Regression guard for existing live Codex team E2E |
| `S-012` | Fully live mixed AutoByteus+Codex GraphQL/WebSocket create + cross-runtime delivery works in both directions | AC-001, AC-003, AC-004 |
| `S-013` | Fully live mixed terminate/restore preserves runtime kind, model, workspace, member route identity, and resumed Codex thread context | AC-002, AC-004 |
| `S-014` | Frontend team-run form exposes per-member runtime override controls and runtime-scoped model catalogs | Frontend design steps 1, 3, 4 |
| `S-015` | Frontend readiness blocks mixed launch when an inherited global model is invalid for a divergent member runtime and surfaces a truthful warning | Frontend design steps 2, 3, 4 |
| `S-016` | Frontend temp-team creation materializes divergent member runtime/model/config correctly from the reviewed shared builder | Frontend design steps 4, 5 |
| `S-017` | Frontend browser launch -> send path promotes a temp mixed team to a permanent server run without collapsing member runtime identity | Frontend design steps 5, AC-001 |
| `S-018` | Frontend reopen/hydration reconstruction preserves divergent member runtime overrides from persisted metadata | Frontend design step 6, AC-002 |
| `S-019` | Reviewed CR-003 cleanup prevents stale member-only `llmConfig` from leaking into inherited-global readiness/materialization | CR-003, frontend design steps 2, 4, 5 |
| `S-020` | Browser-driven live mixed launch followed by run-history reopen/hydration reconstructs one truthful dominant default tuple and keeps the divergent member runtime/model override intact | CR-004, frontend design step 6, AC-002 |

## Test Scope

- Retained the round-1 top-level durable API integration file as supplemental boundary proof.
- Retained the round-2 fully live mixed-runtime E2E file as the authoritative server/API proof for create/restore/delivery.
- Revalidated the reviewed frontend reconstruction owner with its focused durable regression and reran the top-level runtime-selection integration suite to ensure earlier server/API coverage still stayed green after the frontend-only CR-004 fix.
- Performed browser-driven executable validation against the ticket-branch dev stack to prove the app now:
  - renders per-member runtime selectors,
  - truthfully blocks unresolved mixed rows,
  - allows launch once the divergent member has a compatible explicit model,
  - creates a temp mixed team locally,
  - promotes that mixed team to a permanent backend run when the first message is sent,
  - and can reopen that persisted mixed team from run history without synthesizing a false default runtime/model pair.

## Validation Setup / Environment

- Repository: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection`
- Primary package under active validation: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts`
- Additional packages validated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web`
- Test runner: `vitest`
- Browser/dev-stack validation target: `http://127.0.0.1:3000/workspace`
- Local backend/dev-stack target: `http://127.0.0.1:8000`

## Scenarios Checked

| Scenario ID | Status | Evidence |
| --- | --- | --- |
| `S-001` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/tests/integration/api/runtime-selection-top-level.integration.test.ts:604-668` |
| `S-002` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/tests/integration/api/runtime-selection-top-level.integration.test.ts:671-751` |
| `S-003` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/tests/integration/api/runtime-selection-top-level.integration.test.ts:754-943` |
| `S-004` | `Pass` | Round-1 `channel-ingress.integration.test.ts` full file passed on `2026-04-23` (`12` tests). |
| `S-005` | `Pass` | Round-1 targeted server regression batch passed on `2026-04-23` (`10` files / `59` tests). |
| `S-006` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-ts/tests/integration/agent/agent-single-flow.test.ts:102-220` |
| `S-007` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-ts/tests/integration/agent-team/agent-team-single-flow.test.ts:89-260` |
| `S-008` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.test.ts:8-45` and `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.ts:12-39` |
| `S-009` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts:11-90` and `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts:89-116` |
| `S-010` | `Pass` | Live AutoByteus team GraphQL/WebSocket restore rerun passed on `2026-04-23`: `tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts -t "creates a real team, approves a tool call, restores it, and continues on the same websocket"` (`1` passed / `1` skipped). |
| `S-011` | `Pass` | Live Codex team roundtrip rerun passed on `2026-04-23`: `tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts -t "routes live inter-agent send_message_to ping->pong->ping roundtrip in codex team runtime"` (`1` passed / `4` skipped). |
| `S-012` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts:607-855` — live mixed create plus cross-runtime delivery in both directions before and after restore. |
| `S-013` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts:771-889` — persisted runtime kind, model, workspace, member route key, projection continuity, and Codex thread-id reuse asserted after restore. |
| `S-014` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/types/agent/TeamRunConfig.ts:6-24`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/MemberOverrideItem.vue:15-37`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts:200-244`, and prior browser validation showing live `override-runtime-article_writer` / `override-runtime-article_reviewer` selectors with runtime options. |
| `S-015` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/MemberOverrideItem.vue:39-41,140-182,252-270`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/RunConfigPanel.vue:125-133,296-317`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts:174-248`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts:170-204`, and prior browser warning evidence in `/Users/normy/.autobyteus/browser-artifacts/b19830-1776948320487.png`. |
| `S-016` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/stores/teamRunConfigStore.ts:49-56`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/stores/__tests__/teamRunConfigStore.spec.ts:72-124`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/stores/agentTeamContextsStore.ts:67-120`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts:67-121`, plus browser temp-team materialization with `article_writer=codex_app_server/gpt-5.4` and `article_reviewer=autobyteus/claude-4-sonnet-rpa:autobyteus@192.168.2.158:51739`. |
| `S-017` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/stores/agentTeamRunStore.ts:234-270`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts:431-637`, and browser send-path proof that a fresh mixed temp team promoted to a permanent backend run without collapsing member runtime/model identity. |
| `S-018` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/utils/teamRunConfigUtils.ts:100-145,218-304` and `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/services/runHydration/teamRunContextHydrationService.ts:202-208` — frontend reopen/hydration reconstructs dominant team defaults plus divergent member runtime overrides from persisted metadata through one shared reconstruction owner. |
| `S-019` | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts:251-389` — CR-003 cleanup prevents stale member-only `llmConfig` from surviving invalid explicit-model cleanup or leaking into inherited-global readiness/materialization. |
| `S-020` | `Pass` | Browser validation on tab `1d6e22` against `http://127.0.0.1:3000/workspace` created mixed temp team `temp-team-1776966851330-154`, promoted it to permanent backend run `team_article-writing-team_f862a93d`, removed the local context, then reopened it through `runHistory.openTeamMemberRun(...)` and verified coherent reopened defaults `codex_app_server / gpt-5.4 / temp_ws_default` with preserved reviewer override `autobyteus / claude-4-sonnet-rpa:autobyteus@192.168.2.158:51739`. |

## Passed

### Retained authoritative results from rounds 1-2
- `2026-04-23`: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-ts exec vitest run tests/unit/agent/message/send-message-to.test.ts`
  - Passed (`1` file / `7` tests).
- `2026-04-23`: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts`
  - Passed (`5` files / `35` tests).
- `2026-04-23`: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts exec vitest run tests/integration/api/runtime-selection-top-level.integration.test.ts`
  - Passed (`1` file / `3` tests).
- `2026-04-23`: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts exec vitest run tests/integration/api/runtime-selection-top-level.integration.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts`
  - Passed (`10` files / `59` tests).
- `2026-04-23`: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-ts exec vitest run tests/integration/agent/agent-single-flow.test.ts tests/integration/agent-team/agent-team-single-flow.test.ts`
  - Passed (`2` files / `2` tests).
- `2026-04-23`: `cd /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts && pnpm exec vitest run tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts tests/unit/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.test.ts`
  - Passed (`2` files / `2` tests).
- `2026-04-23`: `cd /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts && set -a && source ../autobyteus-ts/.env.test && source ./.env && set +a && export RUN_LMSTUDIO_E2E=1 && export RUN_CODEX_E2E=1 && pnpm exec vitest run tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts`
  - Passed (`1` file / `1` test).
- `2026-04-23`: `cd /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts && set -a && source ../autobyteus-ts/.env.test && source ./.env && set +a && export RUN_LMSTUDIO_E2E=1 && pnpm exec vitest run tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts -t 'creates a real team, approves a tool call, restores it, and continues on the same websocket'`
  - Passed (`1` passed / `1` skipped).
- `2026-04-23`: `cd /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts && set -a && source ../autobyteus-ts/.env.test && source ./.env && set +a && export RUN_CODEX_E2E=1 && pnpm exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts -t 'routes live inter-agent send_message_to ping->pong->ping roundtrip in codex team runtime'`
  - Passed (`1` passed / `4` skipped).

### Round-3 frontend and browser validation
- `2026-04-23`: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web exec vitest run components/workspace/config/__tests__/MemberOverrideItem.spec.ts`
  - Passed (`1` file / `6` tests).
- `2026-04-23`: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web exec vitest run components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts components/applications/__tests__/ApplicationLaunchDefaultsFields.spec.ts stores/__tests__/teamRunConfigStore.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts utils/__tests__/teamRunConfigUtils.spec.ts types/agent/__tests__/TeamRunConfig.spec.ts`
  - Passed (`10` files / `59` tests).
- `2026-04-23`: live browser/manual validation against the ticket-branch stack on `http://127.0.0.1:3000/workspace`
  - Per-member runtime override selectors rendered for `article_writer` and `article_reviewer`.
  - With team default `codex_app_server / gpt-5.4` and reviewer override `claude_agent_sdk`, the app surfaced the blocking warning `Global model gpt-5.4 is unavailable for Claude Agent SDK...` and disabled **Run Team**.
  - After adding a compatible explicit divergent member model, the app re-enabled **Run Team**.
  - A mixed temp team was created locally with `article_writer=codex_app_server/gpt-5.4` and `article_reviewer=autobyteus/claude-4-sonnet-rpa:autobyteus@192.168.2.158:51739`.
  - Sending the first message promoted that mixed temp team to permanent backend run `team_article-writing-team_52bc6d30` without collapsing member runtime/model identity.

### Round-4 focused hydration revalidation
- `2026-04-23`: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web exec vitest run utils/__tests__/teamRunConfigUtils.spec.ts`
  - Passed (`1` file / `7` tests).
- `2026-04-23`: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts exec vitest run tests/integration/api/runtime-selection-top-level.integration.test.ts`
  - Passed (`1` file / `3` tests).
- `2026-04-23`: live browser validation against `http://127.0.0.1:3000/workspace` on tab `1d6e22`
  - Configured `article-writing-team` as a mixed browser launch with `article_writer=codex_app_server/gpt-5.4` and `article_reviewer=autobyteus/claude-4-sonnet-rpa:autobyteus@192.168.2.158:51739`.
  - Verified launch readiness was clean before creating the temp team.
  - Created temp team `temp-team-1776966851330-154`, sent the first message, and observed promotion to permanent backend run `team_article-writing-team_f862a93d`.
  - Removed the local team context and reopened the persisted run through `runHistory.openTeamMemberRun('team_article-writing-team_f862a93d', 'article_writer')`.
  - Verified the reopened hydrated config stayed truthful: default runtime/model/workspace reopened as `codex_app_server / gpt-5.4 / temp_ws_default`, while `article_reviewer` stayed an explicit `autobyteus` override with model `claude-4-sonnet-rpa:autobyteus@192.168.2.158:51739`.

## Failed

- None unresolved at the end of round `4`.

## Not Tested / Out Of Scope

- Broad `autobyteus-server-ts` full `tsconfig.build.json` failure remains pre-existing repository noise and stays out of scope for this ticket, per upstream guidance.
- `autobyteus-ts` restore/reopen lifecycle is still not covered by the two live library-flow tests rerun here; those tests prove start/process/tool/idle/stop for single-agent and agent-team execution.
- Same-socket continuity across restore is still only explicitly rechecked in the AutoByteus-only live team suite; the mixed live proof reconnects after restore on a fresh team websocket.
- A redundant round-4 rerun of the fully live mixed server E2E was attempted, but after reaching the create/restore flow it stalled in teardown. Because the current delta is frontend-only and the same suite already passed earlier on `2026-04-23`, that stalled rerun is not counted as authoritative evidence.

## Blocked

- None.

## Cleanup Performed

- Restarted the ticket-branch local dev stack on `127.0.0.1:3000` + `127.0.0.1:8000` so the browser validation used the current round-9 reviewed code instead of stale other-worktree sessions.
- Deleted the browser-created validation team runs `team_article-writing-team_f862a93d` and `team_article-writing-team_70f1e727` after the reopen proof completed.
- Test-local temp directories created by the live mixed-runtime harness are removed in the test cleanup hooks.
- No temporary validation scripts or ad-hoc probe files remain in the worktree.

## Classification

- `Pass`: no implementation/design reroute required after round-4 focused hydration revalidation.
- Workflow routing note: the reviewed package already includes the durable frontend validation changes and round-9 code review passed. No new durable validation code was added during this API/E2E round, so delivery may resume.

## Recommended Recipient

- `delivery_engineer`

## Evidence / Notes

- Round-1 top-level API proof remains at `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/tests/integration/api/runtime-selection-top-level.integration.test.ts`, but it is supplemental rather than the only mixed-runtime proof.
- Authoritative round-2 live mixed proof remains at `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts`.
- The live mixed server proof establishes all of the following with real runtime managers and real endpoint plumbing:
  - GraphQL create builds a mixed AutoByteus+Codex team,
  - distinct runtime-specific model identifiers are discovered at runtime and asserted different,
  - WebSocket team messaging triggers real cross-runtime `send_message_to` delivery in both directions,
  - GraphQL terminate + restore preserves member runtime kind, model identifier, workspace root path, and member route identity,
  - Codex restore reuses the persisted platform thread id,
  - team member projections after terminate and after restore contain both pre-restore and post-restore tokens.
- Round-3 frontend validation closed the user-facing app launch gap that remained after round 2:
  - `MemberOverrideItem` exposes per-member runtime override state and unresolved-row warning logic (`MemberOverrideItem.vue:15-79,117-182,252-330`).
  - `RunConfigPanel` gates **Run Team** on mixed-runtime-aware `teamLaunchReadiness` instead of a global-only boolean (`RunConfigPanel.vue:125-133,296-317`).
  - `agentTeamContextsStore.createRunFromTemplate()` materializes divergent member runtime/model configs through the shared builder (`agentTeamContextsStore.ts:67-120`).
  - `agentTeamRunStore.sendMessageToFocusedMember()` now builds the GraphQL `memberConfigs` from mixed-runtime-aware readiness + shared member config materialization (`agentTeamRunStore.ts:234-270`).
- Round-4 validation closes the final reopen/hydration truth gap after `CR-004`:
  - `reconstructTeamRunConfigFromMetadata()` now derives the default runtime/model/config from one compatible dominant runtime cohort instead of independently voting runtime and model across all members (`teamRunConfigUtils.ts:100-145,218-304`).
  - `teamRunContextHydrationService` still consumes that shared reconstruction owner directly on reopen (`teamRunContextHydrationService.ts:202-208`).
  - The focused durable regression in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts:180-295` proves the split-dominance reopen case stays launch-ready.
  - Browser validation on tab `1d6e22` proved that a real mixed run launched from the app reopens from persisted history with the same truthful dominant default tuple and divergent reviewer override.
- CR-003 specifically remains closed by the reviewed row-owner cleanup plus the durable proof in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts:251-389`.
- A redundant round-4 rerun of `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts` reached the live create/restore flow again but stalled in teardown, so the earlier same-day passing run remains the authoritative server-side live mixed proof for this frontend-only delta.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
