# Investigation Notes

## Ticket
- Name: `rename-runtime-instance-id-to-run-id`
- Stage: `Understanding Pass`
- Date: `2026-02-25`

## Sources Consulted
- Local ticket baseline:
  - `tickets/in-progress/rename-runtime-instance-id-to-run-id/requirements.md`
- Server runtime/GraphQL/runtime-history modules:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/api/graphql/types/agent-instance.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/api/graphql/types/agent-team-instance.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/api/graphql/types/agent-run-history.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/api/graphql/types/team-run-history.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/api/graphql/types/memory-index.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/api/graphql/types/memory-view.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/api/graphql/types/agent-artifact.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/api/graphql/schema.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/agent-execution/services/agent-instance-manager.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/run-history/services/run-history-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/run-history/services/run-continuation-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`
- Server persistence/external-channel modules:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/prisma/schema.prisma`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/agent-artifacts/domain/models.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/agent-artifacts/repositories/sql/agent-artifact-repository.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/token-usage/domain/models.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-record-repository.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/external-channel/runtime/default-channel-ingress-route-dependencies.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/external-channel/services/channel-binding-target-options-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/external-channel/providers/sql-channel-binding-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/external-channel/providers/sql-channel-message-receipt-provider.ts`
- Frontend runtime modules:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/stores/agentSelectionStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/stores/runTreeStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/stores/activeContextStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/stores/agentMemoryIndexStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/stores/agentMemoryViewStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/components/AppLeftPanel.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/components/workspace/running/RunningAgentsPanel.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/graphql/queries/runHistoryQueries.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/graphql/mutations/runHistoryMutations.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/graphql/queries/agentMemoryIndexQueries.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/graphql/queries/agentMemoryViewQueries.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/graphql/queries/agentArtifactQueries.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-web/types/memory.ts`
- Historical reference branch (without checkout):
  - Top-level submodule pointers in `codex/rename-agent-instance-id-to-run-id`
  - Server commit `5a7362aa2347cbba9626a53842b7351c27e9f26d`
  - Web commit `cb8298cd1614d25529f64be0f5070bfc429f8a75`

## Key Findings
1. Runtime manager and GraphQL module naming is still `instance` in active server paths:
- `agent-instance-manager.ts`, `agent-team-instance-manager.ts`
- `api/graphql/types/agent-instance.ts`, `agent-team-instance.ts`
- schema imports still bind `AgentInstanceResolver`/`AgentTeamInstanceResolver`.

2. Runtime GraphQL payload/argument naming remains mixed (`agentId`/`teamId`) where semantics are run identity:
- `getRunProjection(agentId)`, `getRunResumeConfig(agentId)`, `deleteRunHistory(agentId)`.
- `getTeamRunResumeConfig(teamId)`, `deleteTeamRunHistory(teamId)`.
- Internal domain fields in run-history GraphQL DTOs still use `agentId`/`teamId` for run IDs.

3. Memory APIs still expose agent-oriented names for run folders:
- server: `listAgentMemorySnapshots`, `getAgentMemoryView(agentId)`.
- frontend documents/stores/types mirror these names.

4. Agent artifact runtime contracts still use `agentId` end-to-end:
- GraphQL `agentArtifacts(agentId)`.
- domain model + SQL repository + service interfaces use `agentId`.

5. Token usage persistence contract still uses `agentId` field names at ORM/domain boundary:
- Prisma model field `agentId @map("agent_id")`.
- repository/domain service APIs consume `agentId`.

6. External-channel runtime contracts are still agent/team ID named where they represent runtime run IDs:
- runtime dispatch facade and target models use `agentId` / `teamId`.
- receipt lookup and callback publishing rely on `agentId`.
- SQL provider contracts and Prisma channel tables use field names mapped to `agent_id`/`team_id` columns.

7. Frontend runtime internals still use `instance` semantics:
- `selectedInstanceId`, `selectInstance`, `instance-selected`, `instance-created`.
- run tree selection, run opening coordinator, and running/history panels depend on these keys.

8. There is a valid prior rename reference commit in personal branch history. It can be used as file-level reference, but cannot be blindly applied because enterprise branch contains later team-memory/distributed-runtime updates.

## Constraints
- Must keep behavioral semantics unchanged (rename/refactor only).
- Must preserve DB physical columns (`agent_id`, `team_id`) with Prisma `@map` compatibility.
- Must not rename core `autobyteus-ts` APIs per ticket direction.
- No backward-compat aliases; active runtime paths should be run-named only.

## Unknowns / Risks
1. GraphQL rename ripple into generated types (`autobyteus-web/generated/graphql.ts`) requires codegen and may surface unrelated schema drift.
2. Server file-path rename can cause stale JS import references in tests/integration fixtures.
3. External-channel path has broad type fan-out; partial rename can break ingress/callback flow at compile time.
4. Existing baseline branch may have unrelated type/test failures; validation should use targeted tests plus project typechecks where feasible.

## Implications For Design
- Scope remains `Large` and cross-layer.
- Change strategy should be staged but atomic by boundary to avoid half-renamed contracts:
  - boundary A: runtime manager/resolver/module-path rename,
  - boundary B: run-history + memory GraphQL contracts,
  - boundary C: artifact/token-usage runtime identity contracts,
  - boundary D: external-channel run identity contracts,
  - boundary E: frontend runtime selection/events/contracts and generated GraphQL sync.

## Re-Investigation Update (2026-02-25, Round F/G)
- Active code/test scan status:
  - `autobyteus-web` runtime code + tests: no remaining runtime `instance` naming matches in `components/`, `stores/`, `services/`, `pages/`, `applications/`, `graphql/`, `types/`, `composables/`.
  - `autobyteus-server-ts` `src/` + `tests/`: no remaining runtime `instance` naming matches for manager APIs, GraphQL runtime operations, or external-channel runtime contract surfaces.
- File-path/module naming cleanup completed for remaining runtime-facing test/frontend row files:
  - `RunningInstanceRow.vue` -> `RunningAgentRunRow.vue` (+ spec rename + callsite updates).
  - server test paths migrated from `*instance*` to `*run*` naming where they validate runtime run flows.
- Validation evidence:
  - Web targeted vitest suite (71 tests) passed for renamed selection/context/runtime panel/store contracts.
  - Server targeted suites passed:
    - `tests/unit/api/graphql/types/agent-team-run-resolver.test.ts`
    - `tests/unit/external-channel/runtime/default-channel-runtime-facade.test.ts`
    - `tests/e2e/run-history/team-run-restore-lifecycle-graphql.e2e.test.ts`
  - Blocked case: `tests/e2e/run-history/team-run-restore-distributed-process-graphql.e2e.test.ts` requires seed DB file `autobyteus-server-ts/db/production.db` that is absent in this workspace, so this one distributed e2e could not be validated here.
- Remaining naming drift now concentrates in historical ticket narrative files and stale generated GraphQL output in `autobyteus-web/generated/graphql.ts`, not in active runtime code paths.
- Codegen/bootstrap blocker detail:
  - Attempted local bootstrap for GraphQL codegen refresh (`node dist/app.js --data-dir /tmp/... --port 38080`) fails before server ready due `prisma migrate deploy` schema engine error in this environment.
  - Direct manual migrate attempt (`pnpm exec prisma migrate deploy --schema prisma/schema.prisma`) reproduces the same schema engine error.
  - Fallback resolution applied: generated GraphQL file manually renamed to run semantics and validated via targeted frontend tests/build.
- Current residual scan status (`rg` high-signal patterns across web/server excluding `node_modules`, `.nuxt`, `dist`): zero matches for runtime `instance` naming.

## Re-Investigation Update (2026-02-25, Round J)
- Additional source/test sweep focused on runtime UI wording and generated client parity:
  - Updated runtime UI prop/local/comment wording from `instance` to `run` in:
    - `autobyteus-web/components/workspace/running/{RunningAgentRunRow.vue,RunningAgentGroup.vue,RunningTeamGroup.vue,RunningTeamRow.vue,RunningAgentsPanel.vue}`
    - `autobyteus-web/components/workspace/team/{TeamMembersPanel.vue,TeamWorkspaceView.vue}`
    - `autobyteus-web/stores/{agentRunStore.ts,agentRunConfigStore.ts,teamRunConfigStore.ts}`
    - `autobyteus-web/types/agent/AgentRunConfig.ts`
  - Updated server runtime local naming in:
    - `autobyteus-server-ts/src/external-channel/services/channel-binding-target-options-service.ts`
  - Updated generated GraphQL team runtime naming fallback:
    - `autobyteus-web/generated/graphql.ts` (`AgentTeamRun`, `Create/TerminateAgentTeamRun*`, `agentTeamRuns`, `createAgentTeamRun`, `terminateAgentTeamRun`).
- Validation run results for this round:
  - Passed targeted frontend suites (28 tests):
    - `RunningAgentRunRow.spec.ts`, `RunningAgentGroup.spec.ts`, `RunningTeamGroup.spec.ts`,
    - `RunConfigPanel.spec.ts`, `agentContextsStore.spec.ts`.
  - Passed targeted backend suite:
    - `tests/unit/external-channel/services/channel-binding-target-options-service.test.ts`.
  - Passed builds:
    - `pnpm -C autobyteus-web build`
    - `pnpm -C autobyteus-server-ts build`
- Full-suite status snapshot (executed for acceptance verification):
  - `pnpm -C autobyteus-web test`: fails with `29` failing tests (`704` passing), including pre-existing failures in app shell/layout/artifact/memory/workspace suites.
  - `pnpm -C autobyteus-server-ts test`: fails with `127` failing tests (`1088` passing, `7` skipped), concentrated in external-channel/run-history/memory/token-usage and related contracts.
- Final high-signal grep after Round J.1:
  - Command: `rg -n -i "AgentTeamInstance|agentTeamInstance|createAgentTeamInstance|terminateAgentTeamInstance|instanceId|selectedInstanceId|selectInstance\\(|onRunningInstance|Team Instance|agent instance|team instance|running instances" <web-active-paths> <server-active-paths>`
  - Result: no matches in active code trees (historical ticket/docs paths excluded).
- Conclusion:
  - Rename-scope changes in this round are validated by targeted suites + builds.
  - Full-suite baseline instability remains and is broader than this ticket’s rename surface.

## Re-Investigation Update (2026-02-25, Round K/L)
- Deep backend failure re-triage reduced the remaining surface to 9 files (30 tests) and resolved all with contract-aligned updates:
  - distributed payload keys normalized to current contracts (`agentRunId`, `agentId`, `teamId`),
  - run-history GraphQL projection/query alignment (`runId`),
  - ingress route auth test setup now explicitly enables insecure gateway mode for test-only routes,
  - external-channel provider/service unit+integration suites rewritten to current APIs (legacy fallback/relink methods removed from assertions),
  - distributed restore process e2e now skips when required seed DB is absent in workspace (`db/production.db`).
- Additional full-suite-only flake investigation found two file-explorer tests failing under parallel load while passing in isolation.
  - Root cause: watcher/indexer startup/event timing sensitivity during full-suite concurrency.
  - Fixes applied:
    - increased wait budgets for watcher/indexer integration utilities,
    - added watcher warm-up handshake in `file-name-indexer.integration.test.ts` before add/rename/delete assertions.
- Current validation results (latest):
  - `pnpm -C autobyteus-server-ts test` => `311 passed`, `4 skipped`, `0 failed`.
  - `pnpm -C autobyteus-web test` => web `159/733 passed`, electron `7/38 passed`, `0 failed`.
- Naming scan status remains clean for active runtime paths (no legacy runtime `instance` naming in active web/server source trees).

## Re-Investigation Update (2026-02-25, Round M - Deep Naming Sweep)
- Deep scan scope expanded to:
  - legacy runtime naming patterns,
  - filename/module name patterns,
  - variable/type/local identifier patterns,
  - backend/frontend active code + tests,
  - cross-check against `origin/personal` references without branch checkout.
- Zero-match confirmation in active source trees (`autobyteus-server-ts` + `autobyteus-web`, excluding generated/build/docs/tickets):
  - `selectedInstanceId`, `selectInstance(`, `instance-selected`, `instance-created`,
  - `agentTeamInstance`, `createAgentTeamInstance`, `terminateAgentTeamInstance`,
  - `teamInstanceManager`, `agentInstanceManager`,
  - runtime ID fields such as `instanceId`/`teamInstance`/`agentInstance`.
- Cross-branch reference check:
  - `git grep` on `origin/personal` also shows no active runtime `instanceId`/`agentInstance`/`teamInstance` contract names for current runtime code paths.
  - one non-runtime variable (`runningInstanceProfileIds`) existed there as well and was renamed here to `runningRunProfileIds` for consistency.
- Additional cleanup applied in this round (frontend):
  - renamed remaining run-domain wording in comments/tests/local variables from `instance` to `run`,
  - normalized stream test locals from `*Instances` naming to `*Connections` where they represent connection objects, not runtime runs.
- Post-cleanup residual `instance` occurrences in web active scope: `7`, all non-runtime/object-context:
  - singleton/object instance comments,
  - chart/editor/file-explorer component object instance wording.
- Full validation rerun after Round M:
  - Backend: `pnpm -C autobyteus-server-ts test` => `311 passed`, `4 skipped`, `0 failed`.
  - Frontend Nuxt: `159` test files passed, `733` tests passed.
  - Frontend Electron: `7` test files passed, `38` tests passed.

## Re-Investigation Update (2026-02-25, Round N - Additional Deep Loop)
- Additional deep-scan matrix executed after another naming cleanup pass:
  - legacy runtime rename patterns (`instanceId`, `selectedInstanceId`, `selectInstance(`, `instance-selected`, `agentTeamInstance`, `teamInstanceManager`, etc.),
  - run/team/agent + instance co-occurrence patterns in identifiers/phrases,
  - file/path naming checks for `instance-`,
  - broad residual token inventory in active server/web code + tests.
- Applied extra low-risk naming cleanup for non-contract wording:
  - `componentUid` rename in `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`,
  - log wording `No occurrences ...` in workspace-path sanitization processor,
  - log wording `tool object` in agent/team tool-hydration error messages.
- Validation after updates:
  - Frontend full suite: Nuxt `159/159` test files and `733/733` tests passed; Electron `7/7` files and `38/38` tests passed.
  - Backend full suite first rerun produced one known flaky watcher/indexer timeout in `tests/integration/file-explorer/file-name-indexer.integration.test.ts`; isolated rerun passed, and subsequent full backend rerun passed (`311 passed`, `4 skipped`, `0 failed`).
- Final scan status:
  - zero matches for runtime rename target patterns in active source trees,
  - only two `instance-` path-string matches remain, both in MCP integration tests importing `autobyteus-ts/tools/mcp/server-instance-manager.js` (core library path retained intentionally per ticket constraint of not renaming core `autobyteus-ts` APIs),
  - excluding those intentional core-path references, `instance-` scan returns zero matches.
