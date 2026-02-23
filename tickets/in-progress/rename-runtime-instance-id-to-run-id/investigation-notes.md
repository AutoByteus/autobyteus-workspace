# Investigation Notes

## Ticket

- Name: `Rename Runtime Instance ID to Run ID (Agent + Agent Team)`
- Branch: `codex/rename-agent-instance-id-to-run-id`
- Investigation timestamp: `2026-02-23`

## Sources Consulted

- Local branch/status checks:
  - `git rev-parse --abbrev-ref HEAD`
  - `git -C autobyteus-server-ts status --short`
  - `git -C autobyteus-web status --short`
  - `git -C autobyteus-ts status --short`
- Targeted source scans:
  - `rg -n "agentInstanceId|agentTeamInstanceId|AgentInstanceId|AgentTeamInstanceId" ...`
  - `rg -n "AgentInstanceManager|AgentTeamInstanceManager" ...`
  - `rg -n "agentInstance|agentTeamInstance|AgentInstance|AgentTeamInstance" ...`
- Core backend files reviewed:
  - `autobyteus-server-ts/src/agent-execution/services/agent-instance-manager.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`
  - `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`
  - `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`
  - `autobyteus-server-ts/src/api/graphql/schema.ts`
  - `autobyteus-server-ts/src/api/graphql/converters/agent-run-converter.ts`
  - `autobyteus-server-ts/src/api/graphql/converters/agent-team-run-converter.ts`
  - `autobyteus-server-ts/src/run-history/services/run-history-service.ts`
  - `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
  - `autobyteus-server-ts/src/run-history/services/run-continuation-service.ts`
  - `autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`
- Core frontend files reviewed:
  - `autobyteus-web/graphql/queries/agentRunQueries.ts`
  - `autobyteus-web/graphql/mutations/agentMutations.ts`
  - `autobyteus-web/graphql/mutations/agentTeamRunMutations.ts`
  - `autobyteus-web/stores/agentRunStore.ts`
  - `autobyteus-web/stores/agentTeamRunStore.ts`
  - `autobyteus-web/stores/applicationRunStore.ts`
  - `autobyteus-web/components/agents/RunningAgentCard.vue`
- Docs touched in prior implementation:
  - `autobyteus-server-ts/docs/modules/agent_execution.md`
  - `autobyteus-server-ts/docs/modules/agent_team_execution.md`
  - `autobyteus-web/docs/agent_teams.md`

## Key Findings

1. Runtime manager symbols were renamed to run semantics in backend code:
- `AgentRunManager` in `agent-instance-manager.ts`
- `AgentTeamRunManager` in `agent-team-instance-manager.ts`
- runtime methods now use `*Run` naming (`createAgentRun`, `restoreAgentRun`, `terminateAgentRun`, `createTeamRun`, `createTeamRunWithId`, `terminateTeamRun`, `listActiveRuns`).

2. GraphQL runtime object/resolver and operation names were renamed:
- Agent: `AgentRun`, `AgentRunResolver`, `agentRun`, `agentRuns`, `terminateAgentRun`
- Team: `AgentTeamRun`, `AgentTeamRunResolver`, `agentTeamRun`, `agentTeamRuns`, `createAgentTeamRun`, `terminateAgentTeamRun`

3. Frontend runtime GraphQL usage and stores were updated to `Run` operations:
- `GetAgentRuns`, `TerminateAgentRun`
- `CreateAgentTeamRun`, `TerminateAgentTeamRun`
- `RunningAgentCard.vue` switched to `GetAgentRunsQuery` typing.

4. Exact runtime-ID rename target appears clean in production code paths:
- No matches found for `agentInstanceId`, `agentTeamInstanceId`, `AgentInstanceId`, `AgentTeamInstanceId` in `autobyteus-server-ts/src`, selected frontend runtime paths, and `autobyteus-ts/src`.

5. File-path rename policy currently mixed:
- Code symbol/API rename is present.
- File names were kept mostly as-is (`agent-instance-manager.ts`, `agent-team-instance-manager.ts`, `agent-run.ts`, etc.), which aligns with user preference to avoid broad file rename impact.

6. Documentation drift exists and must be corrected:
- Some docs currently reference renamed filenames that do not exist, e.g. `agent-run-manager.ts` and `agent-team-run-manager.ts` in server docs.

7. Validation status from earlier run (already executed in this branch):
- Targeted server unit tests passed (agent stream handlers and external-channel runtime tests).
- Targeted frontend tests passed after `nuxi prepare` for `agentRunStore` and `agentTeamRunStore`.
- Full server typecheck/build reported existing baseline issues unrelated to this rename (rootDir include + unresolved module typing chain).
- Frontend GraphQL codegen depends on schema endpoint alignment; mismatch can fail until schema source reflects renamed operations.

## Current Naming Constraints Observed

- Definition IDs remain definition-scoped and correctly named in source usage:
  - `agentDefinitionId`
  - `teamDefinitionId` (or `agentTeamDefinitionId` in definition-domain contexts)
- Runtime IDs are now generally run-scoped (`runId`, `teamId`, run history IDs) in touched code.

## Open Unknowns / Decisions Needed

1. Should file names be fully renamed from `*instance*` to `*run*`?
- User preference currently: no mass file rename unless necessary.
- Keeping file names avoids broad import/path churn and merge conflicts.

2. Should non-ID wording in UI/docs (`instance`, `running instances`) be fully converted to `run` in this ticket?
- This is semantic cleanup and may have larger UX/content impact.
- Acceptance criterion focuses on runtime IDs and API semantics; docs should still be made internally consistent.

3. External API consumer coordination:
- This ticket is treated as breaking rename. Consumers and schema/codegen endpoints must be updated in lockstep.

## Implications For Requirements/Design

- Scope should remain `Large` due cross-layer impact (backend managers/services, GraphQL schema/resolvers, WebSocket/runtime-adjacent services, frontend stores/components, tests, docs).
- Keep file names stable in this ticket unless a concrete bug or maintenance blocker proves rename is required.
- Enforce hard no-compat posture for `*Instance*` runtime identifiers in production paths.

## Refinement Pass (`2026-02-23`) - Memory API Alignment

### Additional Sources Consulted

- Targeted scans and reads:
  - `rg -n "agentId|selectedAgentId|getAgentMemoryView|listAgentMemorySnapshots" autobyteus-server-ts/src/agent-memory-view autobyteus-server-ts/src/api/graphql/{types,converters} autobyteus-web/{graphql,stores,types,components/memory}`
  - `autobyteus-server-ts/src/agent-memory-view/domain/models.ts`
  - `autobyteus-server-ts/src/agent-memory-view/store/memory-file-store.ts`
  - `autobyteus-server-ts/src/agent-memory-view/services/agent-memory-index-service.ts`
  - `autobyteus-server-ts/src/agent-memory-view/services/agent-memory-view-service.ts`
  - `autobyteus-server-ts/src/api/graphql/types/memory-index.ts`
  - `autobyteus-server-ts/src/api/graphql/types/memory-view.ts`
  - `autobyteus-server-ts/src/api/graphql/converters/memory-index-converter.ts`
  - `autobyteus-server-ts/src/api/graphql/converters/memory-view-converter.ts`
  - `autobyteus-web/graphql/queries/agentMemoryIndexQueries.ts`
  - `autobyteus-web/graphql/queries/agentMemoryViewQueries.ts`
  - `autobyteus-web/stores/agentMemoryIndexStore.ts`
  - `autobyteus-web/stores/agentMemoryViewStore.ts`
  - `autobyteus-web/components/memory/MemoryIndexPanel.vue`
  - `autobyteus-web/components/memory/MemoryInspector.vue`
  - memory unit/component/store tests in server/web.

### Additional Findings

1. Memory storage semantics are run-scoped, but naming is still `agentId`:
- memory folder layout uses runtime run directories under `memory/agents/<id>/...`.
- this `<id>` is a run identifier in the current architecture (not a definition ID).

2. Backend memory domain/service and GraphQL API still expose `agentId`:
- domain models: `MemorySnapshotSummary.agentId`, `AgentMemoryView.agentId`.
- service/store methods: `getAgentMemoryView(agentId)`, `readWorkingContextSnapshot(agentId)`, etc.
- GraphQL contract: `getAgentMemoryView(agentId: String!)`, `listAgentMemorySnapshots.entries[].agentId`.

3. Frontend memory surface still consumes `agentId`:
- queries, stores (`selectedAgentId`), and memory components use `agentId` naming in variables/state/UI text.

4. This is a terminology consistency gap, not a lifecycle behavior gap:
- existing logic can stay the same; required change is naming (`agentId -> runId`) across memory API boundaries and consumer state identifiers.

5. Existing non-memory `agentId` usages should remain unchanged where they represent stable agent identity, ownership, or member identity:
- examples include artifact ownership and team member identity payloads.
- rename must stay scoped to runtime-run semantics.

### Refined Implications

- Requirements must be refined to include memory index/view API renames:
  - `listAgentMemorySnapshots -> listRunMemorySnapshots`
  - `getAgentMemoryView(agentId) -> getRunMemoryView(runId)`
  - memory summary/view fields `agentId -> runId`
  - frontend memory store state `selectedAgentId -> selectedRunId`
- Scope remains `Large`; no file-path renames required.

## Refinement Pass (`2026-02-23`) - Runtime Module/Path Naming Cleanup

### Additional Sources Consulted

- Targeted scans and reads:
  - `rg --files autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-web | rg 'instance|Instance'`
  - `rg -n "agent-instance|agent-team-instance|agentRunQueries|agentTeamRunMutations|terminateTeamInstance|createTeamInstance" autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-web`
  - `autobyteus-server-ts/src/agent-execution/services/agent-instance-manager.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`
  - `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`
  - `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`
  - `autobyteus-server-ts/src/api/graphql/converters/agent-run-converter.ts`
  - `autobyteus-server-ts/src/api/graphql/converters/agent-team-run-converter.ts`
  - `autobyteus-web/graphql/queries/agentRunQueries.ts`
  - `autobyteus-web/graphql/mutations/agentTeamRunMutations.ts`
  - `autobyteus-web/stores/agentTeamRunStore.ts`
  - `autobyteus-web/components/workspace/running/RunningAgentsPanel.vue`
  - `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`

### Additional Findings

1. Runtime manager symbols are already `Run`-named, but server module paths remain `instance`-named:
- `src/agent-execution/services/agent-instance-manager.ts`
- `src/agent-team-execution/services/agent-team-instance-manager.ts`
- `src/api/graphql/types/agent-run.ts`
- `src/api/graphql/types/agent-team-run.ts`
- `src/api/graphql/converters/agent-run-converter.ts`
- `src/api/graphql/converters/agent-team-run-converter.ts`

2. Frontend runtime GraphQL document module paths still use `instance` naming:
- `autobyteus-web/graphql/queries/agentRunQueries.ts`
- `autobyteus-web/graphql/mutations/agentTeamRunMutations.ts`

3. A small frontend runtime method-call drift still exists:
- `agentTeamRunStore` exposes `terminateTeamRun(...)`, but some components still call `terminateTeamInstance(...)`.

4. Broader `instance` wording exists in UI selection/event names and in application-run feature files, but that is larger than manager/module cleanup and can be staged separately.

### Refined Implications

- Renaming runtime module/file paths for server and frontend runtime entry modules improves consistency and discoverability, and directly addresses residual naming drift in production code paths.
- This rename is still non-behavioral and can remain in this ticket scope with import/callsite updates plus targeted tests.
- Scope remains `Large`; refine design/plan to include `Rename/Move` tasks for server runtime manager/graphql modules and frontend runtime GraphQL documents.

## Refinement Pass (`2026-02-23`) - Frontend Runtime Internal Naming Alignment

### Additional Sources Consulted

- Targeted scans and reads:
  - `rg -n "selectedInstanceId|selectInstance\\(|createInstanceFromTemplate|removeInstance\\(|activeInstance\\(|instancesByDefinition|RunningInstanceRow|instance-selected|instance-created|instanceId" autobyteus-web/{stores,components,pages,docs,types}`
  - `autobyteus-web/stores/agentSelectionStore.ts`
  - `autobyteus-web/stores/agentContextsStore.ts`
  - `autobyteus-web/stores/agentTeamContextsStore.ts`
  - `autobyteus-web/stores/runHistoryStore.ts`
  - `autobyteus-web/components/workspace/running/RunningAgentsPanel.vue`
  - `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - `autobyteus-web/components/workspace/running/RunningInstanceRow.vue`
  - `autobyteus-web/components/workspace/running/RunningAgentGroup.vue`
  - `autobyteus-web/components/workspace/running/RunningTeamGroup.vue`

### Additional Findings

1. Backend runtime and GraphQL module/path naming is now aligned to `Run`.

2. Frontend runtime internals still expose `instance` terminology in active agent/team runtime flow:
- selection store API/state: `selectedInstanceId`, `selectInstance(...)`.
- runtime context store APIs: `createInstanceFromTemplate`, `removeInstance`, `activeInstance`, `instancesByDefinition`.
- runtime component/event names: `RunningInstanceRow`, `instance-selected`, `instance-created`, `instanceId` payload keys.

3. Separate application feature uses `instanceId` terminology (`pages/applications/**`, `stores/application*`, `types/application/*`):
- this appears to be an application-domain concept and is not part of agent/team runtime run naming scope unless explicitly expanded.

### Refined Implications

- Another requirement-driven refinement round is needed for frontend runtime internals so agent/team runtime naming is fully consistent end-to-end.
- Keep application-domain `instance` wording out of this refinement scope unless user requests expanding scope.

## Refinement Pass (`2026-02-23`) - Runtime ID Symbol Normalization (`agentId/teamId` -> `runId/teamRunId`)

### Additional Sources Consulted

- Targeted scans and reads:
  - `rg -n "\\.agentId\\b|\\bagentId:\\s|\\bteamId:\\s|\\bteamId\\b" autobyteus-web/{stores,types,services,components,composables,pages} autobyteus-server-ts/src/{services/agent-streaming,api/graphql,run-history,agent-memory-view}`
  - `autobyteus-web/types/agent/AgentRunState.ts`
  - `autobyteus-web/stores/agentRunStore.ts`
  - `autobyteus-web/stores/agentContextsStore.ts`
  - `autobyteus-web/types/agent/AgentTeamContext.ts`
  - `autobyteus-web/stores/agentTeamContextsStore.ts`
  - `autobyteus-web/stores/agentTeamRunStore.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
  - `autobyteus-server-ts/src/api/graphql/converters/agent-run-converter.ts`

### Additional Findings

1. Frontend runtime core context state still uses `agentId` for run identity:
- `AgentRunState.agentId` stores the runtime execution ID and is used as run key in orchestration paths.

2. Frontend team runtime context still uses `teamId` as run identity:
- `AgentTeamContext.teamId` and related store/orchestration variables are execution IDs (team run IDs), not definition IDs.

3. Backend runtime streaming and converter internals still use `agentId`/`teamId` variable names in run-oriented paths:
- these are largely local naming choices and can be normalized without public API behavior changes.

4. Non-runtime `agentId`/`teamId` usages are still valid and should remain unchanged:
- artifact ownership fields and external-channel mapping fields represent entity identity, not run identity.

## Refinement Pass (`2026-02-23`) - Team Run-History Runtime Identity Deep Cleanup

### Additional Sources Consulted

- Targeted code scans:
  - `rg -n "teamId|memberAgentId|teamRunId|memberRunId" autobyteus-server-ts/src/run-history autobyteus-server-ts/src/api/graphql/types/{agent-team-run.ts,team-run-history.ts} autobyteus-web/{graphql/queries/runHistoryQueries.ts,stores/runHistoryStore.ts,services/agentStreaming/TeamStreamingService.ts}`
  - `rg -n "agentInstanceId|agentTeamInstanceId|AgentInstanceManager|AgentTeamInstanceManager" autobyteus-server-ts/src autobyteus-web`
- Core files updated/reviewed:
  - `autobyteus-server-ts/src/run-history/domain/team-models.ts`
  - `autobyteus-server-ts/src/run-history/store/team-run-manifest-store.ts`
  - `autobyteus-server-ts/src/run-history/store/team-run-index-store.ts`
  - `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
  - `autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`
  - `autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts`
  - `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts`
  - `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/{agent-stream-handler.ts,agent-team-stream-handler.ts,models.ts}`
  - `autobyteus-web/graphql/queries/runHistoryQueries.ts`
  - `autobyteus-web/stores/runHistoryStore.ts`
  - `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`

### Additional Findings

1. Team run-history backend domain/store/service still carried runtime IDs under legacy names:
- `teamId` and `memberAgentId` were still used as runtime run identifiers in team run manifest/index/history internals.

2. The highest-value cleanup was in team run-history and team member projection surfaces:
- converting canonical runtime symbols to `teamRunId` and `memberRunId` removed remaining definition-vs-runtime ambiguity in those flows.

3. Compatibility constraint exists for persisted historic manifest/index payloads:
- old persisted keys (`teamId`, `memberAgentId`) may still exist on disk.
- current refinement keeps read-side fallback only for these persisted payloads while writing canonical run-named keys.

4. Frontend team run-history consumption needed matching contract updates:
- GraphQL run-history query selection and store typings/parsers now use `memberRunId`.
- parser keeps read fallback for historic payload keys to avoid breaking existing local history data.

5. Streaming layers were mostly semantically correct but still had local variable naming drift:
- runtime-local variables using `agent_id` payload now normalized to `memberRunId` semantics in frontend team streaming, and handler-local run naming tightened on backend.

### Verification Outcome

- Targeted backend pass:
  - `pnpm --dir autobyteus-server-ts exec vitest --run tests/e2e/run-history/team-run-history-graphql.e2e.test.ts tests/e2e/agent-team-execution/send-message-to-team-graphql-contract.e2e.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/services/agent-streaming/agent-stream-handler.test.ts`
- Targeted frontend pass:
  - `pnpm --dir autobyteus-web test:nuxt stores/__tests__/runHistoryStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts stores/__tests__/agentTeamRunStore.spec.ts`
- Full-suite reruns:
  - frontend full: passed (`138` nuxt files / `648` tests + electron `5` files / `32` tests)
  - backend full: passed on rerun (`203` files passed, `3` skipped; `877` tests passed, `8` skipped) after transient timeout flake in two integration tests that passed on immediate isolated rerun.

## Refinement Pass (`2026-02-23`) - Memory Manifest And Runtime Context Verification

### Additional Sources Consulted

- Targeted scans and reads:
  - `rg -n "runId|agentId|teamId|teamRunId|manifest" autobyteus-web/{types,stores,components/memory} autobyteus-server-ts/src/{agent-memory-view,run-history/store,api/graphql/types,api/graphql/converters}`
  - `autobyteus-web/types/memory.ts`
  - `autobyteus-web/stores/agentMemoryViewStore.ts`
  - `autobyteus-web/stores/agentMemoryIndexStore.ts`
  - `autobyteus-server-ts/src/agent-memory-view/domain/models.ts`
  - `autobyteus-server-ts/src/run-history/store/run-manifest-store.ts`
  - `autobyteus-server-ts/src/run-history/store/team-run-manifest-store.ts`

### Additional Findings

1. Memory index/view contracts are run-aligned in active frontend + backend paths:
- backend memory domain models and GraphQL memory resolvers expose `runId`.
- frontend memory types/stores/components select and query by `runId`.

2. Team run persistence still uses `teamId` naming in manifest/index schema:
- `team-run-manifest-store.ts` and `team-run-index-store.ts` persist `teamId` fields.
- this is semantically runtime team-run identity, but persisted-schema naming has not been migrated to `teamRunId`.

3. Runtime `Instance` identifiers/managers are removed from production source paths:
- no `agentInstanceId`/`agentTeamInstanceId`/`AgentInstanceManager`/`AgentTeamInstanceManager` matches in `autobyteus-server-ts/src` and `autobyteus-web` source paths.

4. Frontend runtime context integrity gap identified and fixed during this pass:
- `applicationRunStore` still initialized team context with `teamId`; fixed to `teamRunId`.
- related runtime tests and fixtures were updated accordingly.

### Refined Implications

- Ticket scope is clean for `Instance -> Run` runtime terminology in active backend/frontend runtime execution paths.
- If strict persistence-schema naming parity is required (`teamId -> teamRunId` in run-history manifest/index), that should be handled as a follow-up migration ticket to avoid silent on-disk compatibility risk.

### Refined Implications

- Add a focused implementation pass to normalize runtime-ID symbols in active frontend/server runtime internals:
  - `AgentRunState.agentId -> runId`
  - team runtime context and orchestration symbols -> `teamRunId`
  - local backend run-oriented variable naming cleanup (`agentId/teamId` -> run semantics) where safe.
- Keep this pass non-behavioral; no API contract redesign.

## Refinement Pass (`2026-02-23`) - Final Frontend/Backend Runtime ID Drift Sweep

### Additional Sources Consulted

- Branch/status + scoped scans:
  - `git branch --show-current`
  - `git status --short`
  - `rg -n "agentInstanceId|agentTeamInstanceId|AgentInstanceId|AgentTeamInstanceId|AgentInstanceManager|AgentTeamInstanceManager|createAgentInstance|createAgentTeamInstance" autobyteus-web/{components,stores,services,graphql,types,pages,composables,utils} autobyteus-server-ts/src`
  - `rg -n "selectedAgentId|selectedTeamId|currentAgentId|const agentId = .*runId|const teamId = .*runId" autobyteus-web/{components,stores,services,graphql,types,pages,composables,utils} autobyteus-server-ts/src`
- Frontend runtime files reviewed/updated:
  - `autobyteus-web/components/workspace/running/RunningAgentsPanel.vue`
  - `autobyteus-web/components/layout/RightSideTabs.vue`
  - `autobyteus-web/components/progress/ActivityFeed.vue`
  - `autobyteus-web/components/progress/ProgressPanel.vue`
  - `autobyteus-web/components/workspace/agent/ArtifactsTab.vue`
  - `autobyteus-web/components/conversation/ToolCallIndicator.vue`
  - `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`
  - `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts`
  - `autobyteus-web/stores/runHistoryStore.ts`
- Backend runtime files reviewed/updated:
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
  - `autobyteus-server-ts/src/external-channel/services/channel-binding-target-options-service.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/default-channel-ingress-route-dependencies.ts`
  - `autobyteus-server-ts/src/run-history/services/run-continuation-service.ts`
  - `autobyteus-server-ts/tests/e2e/run-history/run-history-graphql.e2e.test.ts`

### Additional Findings

1. No legacy runtime `Instance` identifiers remain in active frontend/backend source paths:
- scoped source scan returned no `agentInstanceId`/`agentTeamInstanceId`/`AgentInstanceManager`/`AgentTeamInstanceManager` in production source folders.

2. Residual runtime-local variable drifts existed and were cleaned:
- frontend locals holding run identifiers still used `selectedAgentId`, `selectedTeamId`, `currentAgentId`, and `agentId = runId` in a few runtime components/handlers.
- normalized these to run semantics (`selectedAgentRunId`, `selectedTeamRunId`, `currentAgentRunId`, `agentRunId`, `teamRunId`).

3. Backend runtime manager/service internals had parameter naming drift:
- run-oriented manager/service signatures and locals still used `agentId/teamId` for runtime execution identifiers.
- normalized runtime-local parameter names to run semantics (`runId` / `teamRunId`) in active runtime services.

4. `restoreAgentRun` runtime options were aligned to run semantics:
- changed option key from `agentId` to `runId` in `AgentRunManager.restoreAgentRun(...)` and updated `RunContinuationService` callsite.
- updated the affected run-history e2e mock that asserted legacy `options.agentId`.

5. Full validation after this pass is green:
- frontend full suite passed.
- backend full suite passed after fixing the e2e mock mismatch; file-indexer timeout remains known-transient and passed on rerun.

### Refined Implications

- Frontend + backend runtime code paths are now materially cleaner for run-vs-definition terminology without requiring additional file renames.
- Remaining `agentId`/`teamId` usages are intentionally out-of-scope identity domains (core contracts, external-channel binding fields, artifacts/token usage, and application-domain instance concepts) unless explicitly expanded in a separate ticket.

## Verification Pass (`2026-02-23`) - Run-vs-Definition Concept Separation Audit

### Sources Consulted

- Concept-separation scans:
  - `rg -n "runId\s*:\s*.*DefinitionId|agentDefinitionId\s*:\s*.*runId|teamDefinitionId\s*:\s*.*runId|agentTeamDefinitionId\s*:\s*.*runId" autobyteus-web/{components,stores,services,graphql,types,pages,composables,utils} autobyteus-server-ts/src`
  - `rg -n "runId\s*=\s*.*DefinitionId|DefinitionId\s*=\s*.*runId|agentId\s*=\s*.*runId|teamId\s*=\s*.*runId" autobyteus-web/{components,stores,services,graphql,types,pages,composables,utils} autobyteus-server-ts/src`
- Runtime API surface inspection:
  - `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`
  - `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`
  - `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts`
  - `autobyteus-web/graphql/mutations/agentMutations.ts`
  - `autobyteus-web/graphql/mutations/agentTeamRunMutations.ts`
  - `autobyteus-web/graphql/queries/runHistoryQueries.ts`
  - `autobyteus-web/stores/agentActivityStore.ts`
  - `autobyteus-web/stores/agentTodoStore.ts`

### Findings

1. No direct concept-mixing assignments were found in active frontend/backend source:
- No matches where `runId` is assigned from `*DefinitionId` or where `*DefinitionId` is assigned from `runId`.

2. Runtime semantics are mostly correct, but naming is not fully explicit everywhere:
- Several runtime API/store fields still use `agentId`/`teamId` names while representing runtime execution IDs.

3. Remaining runtime naming ambiguity hotspots:
- Agent runtime GraphQL input/result fields still use `agentId`:
  - `autobyteus-server-ts/src/api/graphql/types/agent-run.ts` (`SendAgentUserInputInput`, `SendAgentUserInputResult`, `ApproveToolInvocationInput`).
- Team runtime GraphQL input/result/history fields still use `teamId`/`agentId`:
  - `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`
  - `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts`
- Frontend GraphQL docs still consume these runtime fields as `agentId`/`teamId`:
  - `autobyteus-web/graphql/mutations/agentMutations.ts`
  - `autobyteus-web/graphql/mutations/agentTeamRunMutations.ts`
  - `autobyteus-web/graphql/queries/runHistoryQueries.ts`
- Frontend runtime activity/todo stores are keyed by runtime IDs but named `*ByAgentId`:
  - `autobyteus-web/stores/agentActivityStore.ts`
  - `autobyteus-web/stores/agentTodoStore.ts`

### Conclusion

- Concept mapping is currently safe (no detected `runId`/definition-ID cross-assignment bugs), but strict naming clarity is not yet complete.
- To make runtime-vs-definition terminology fully crystal-clear, a final API/store naming pass is still needed for the remaining runtime `agentId/teamId` surfaces above.

## No-Legacy Enforcement Pass (`2026-02-23`) - Team Manifest/Index Fallback Removal

### Sources Consulted

- Backend team run-history stores:
  - `autobyteus-server-ts/src/run-history/store/team-run-manifest-store.ts`
  - `autobyteus-server-ts/src/run-history/store/team-run-index-store.ts`
- Frontend team resume manifest parsing:
  - `autobyteus-web/stores/runHistoryStore.ts`
- Validation scans:
  - `rg -n "memberAgentId|payload\\.teamId|row\\.teamId|teamRunId \\|\\| payload\\.teamId|memberRunId \\|\\| binding\\.memberAgentId" autobyteus-server-ts/src/run-history autobyteus-web/stores/runHistoryStore.ts`
  - `rg -n "\\bagentInstanceId\\b|\\bagentTeamInstanceId\\b|\\bAgentInstance\\b|\\bTeamInstance\\b" autobyteus-server-ts/src autobyteus-web`
- Targeted verification:
  - `pnpm --dir autobyteus-server-ts exec vitest --run tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`
  - `pnpm --dir autobyteus-web test:nuxt stores/__tests__/runHistoryStore.spec.ts`

### Findings

1. Legacy-read fallbacks were still present in active team run-history parsing paths:
- backend manifest/index stores accepted `teamId` and `memberAgentId` as fallback keys.
- frontend run-history store parsed `payload.teamId` and `binding.memberAgentId` as fallback keys.

2. Fallbacks are now removed from these active paths:
- backend parsers now require canonical `teamRunId` and `memberRunId`.
- frontend team manifest parser now reads only canonical `teamRunId` and `memberRunId`.

3. Validation is green for the no-legacy update:
- targeted backend team run-history e2e passed.
- targeted frontend run-history store tests passed.
- scoped residual scans for the removed fallback patterns returned no matches.

### Updated Implication

- Prior investigation note about keeping migration-safe fallback reads for `teamId/memberAgentId` is now superseded in active frontend/server runtime paths.
- The current implementation now enforces strict no-legacy behavior for team run-history runtime identifiers in code paths covered by this ticket.

## Refinement Pass (`2026-02-23`) - Streaming/WebSocket Runtime Session Naming

### Sources Consulted

- Server runtime streaming/websocket modules:
  - `autobyteus-server-ts/src/services/agent-streaming/agent-session.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/agent-session-manager.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
  - `autobyteus-server-ts/src/api/websocket/agent.ts`
- Frontend streaming facade:
  - `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
- Targeted tests:
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-session.test.ts`
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-session-manager.test.ts`
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-handler.test.ts`
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
  - `autobyteus-server-ts/tests/integration/agent/agent-websocket.integration.test.ts`
  - `autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.ts`
  - `autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts`

### Findings

1. Server streaming session objects still used runtime `agentId` naming:
- `AgentSession` and `AgentSessionManager` stored and queried session identity with `agentId` method/property naming even though values are run IDs.

2. Websocket route binding names were still `agentId`/`teamId`:
- route param placeholders and logging in `api/websocket/agent.ts` used instance-like naming despite runtime semantics.

3. Frontend single-agent streaming service had `connect(agentId, ...)` parameter naming:
- callsites passed run IDs, but method signature still used `agentId`.

4. `autobyteus-ts` remains the structural blocker for absolute zero mixed naming:
- core runtime entities still expose `agentId`/`teamId` heavily (agent/team runtime state, events, team manager/runtime, streaming payload conventions).
- server/frontend can reduce local naming drift, but full elimination of runtime `agentId`/`teamId` requires a coordinated core-library rename pass.

### Implications

- Frontend/server naming clarity can continue improving without waiting for core changes, but complete product-wide run terminology requires a dedicated `autobyteus-ts` migration ticket.
- Recommendation: keep current ticket focused on frontend/server cleanup; open a follow-up core ticket for `autobyteus-ts` runtime ID renaming and downstream contract propagation.

## Refinement Pass (`2026-02-23`) - Agent Artifact Runtime ID Alignment

### Sources Consulted

- Persistence schema and repository path:
  - `autobyteus-server-ts/prisma/schema.prisma`
  - `autobyteus-server-ts/src/agent-artifacts/repositories/sql/agent-artifact-repository.ts`
  - `autobyteus-server-ts/src/agent-artifacts/services/artifact-service.ts`
  - `autobyteus-server-ts/src/agent-artifacts/providers/{sql-persistence-provider.ts,file-persistence-provider.ts,persistence-provider.ts,persistence-proxy.ts}`
  - `autobyteus-server-ts/src/api/graphql/types/agent-artifact.ts`
  - `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-persistence-processor.ts`
- Frontend artifact runtime flow:
  - `autobyteus-web/graphql/queries/agentArtifactQueries.ts`
  - `autobyteus-web/stores/agentArtifactsStore.ts`
  - `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts`
  - `autobyteus-web/components/workspace/agent/{ArtifactsTab.vue,ArtifactContentViewer.vue}`
- Validation runs:
  - `pnpm --dir autobyteus-server-ts exec vitest --run tests/unit/agent-customization/processors/tool-result/agent-artifact-persistence-processor.test.ts tests/integration/agent-artifacts/services/artifact-service.integration.test.ts tests/integration/agent-artifacts/repositories/agent-artifact-repository.integration.test.ts tests/e2e/agent-artifacts/agent-artifacts-graphql.e2e.test.ts`
  - `pnpm --dir autobyteus-web test:nuxt stores/__tests__/agentArtifactsStore.spec.ts services/agentStreaming/handlers/__tests__/artifactHandler.spec.ts components/workspace/agent/__tests__/ArtifactList.spec.ts components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts components/workspace/agent/__tests__/ArtifactsTab.spec.ts`

### Findings

1. Artifact DB storage does not have a runtime-FK coupling:
- `AgentArtifact` persists runtime identity in `agent_id` column without a Prisma relation foreign key.
- Removing runtime conversation rows does not break artifact persistence integrity.

2. Backend artifact runtime surfaces were partially mixed before this refinement:
- domain/provider/GraphQL already exposed `runId`, but repo-return and test paths still carried `agentId` naming.
- GraphQL e2e tests still queried `agentArtifacts(agentId: ...)` even though resolver expects `runId`.

3. Frontend artifact runtime surfaces were partially mixed before this refinement:
- GraphQL query document and artifact store contract still used `agentId`.
- artifact handler and viewer logic still treated artifact ownership as `agentId` instead of run identity.

4. After refinement, frontend/server artifact runtime naming is run-aligned:
- backend repository/service/provider and artifact tests now use `runId`/`getByRunId` semantics at active interfaces.
- GraphQL artifact query uses `runId` argument and returns `runId`.
- frontend artifact store contract is run-based (`runId`, `artifactsByRun`, `getArtifactsForRun`, `getActiveStreamingArtifactForRun`, `fetchArtifactsForRun`).
- websocket artifact payload parsing maps protocol `agent_id` to local `runId` immediately at handler boundary.

### Implications

- Artifact runtime clarity is now consistent with this ticket’s run-vs-definition direction in frontend/server active code paths.
- Protocol wire key compatibility (`agent_id`) remains intentionally isolated at streaming boundaries until a coordinated core-library protocol rename is approved.

## Refinement Pass (`2026-02-23`) - Prisma Runtime Field Normalization (No-FK Paths)

### Sources Consulted

- Schema and migration evidence:
  - `autobyteus-server-ts/prisma/schema.prisma`
  - `autobyteus-server-ts/prisma/migrations/20260203074245_init/migration.sql`
- Backend runtime persistence modules:
  - `autobyteus-server-ts/src/agent-artifacts/repositories/sql/agent-artifact-repository.ts`
  - `autobyteus-server-ts/src/token-usage/**`
  - `autobyteus-server-ts/src/agent-customization/processors/persistence/token-usage-persistence-processor.ts`
- Validation commands:
  - `pnpm --dir autobyteus-server-ts exec prisma generate`
  - `pnpm --dir autobyteus-server-ts exec vitest --run tests/unit/agent-customization/processors/persistence/token-usage-persistence-processor.test.ts tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts tests/integration/token-usage/providers/sql-persistence-provider.integration.test.ts tests/integration/token-usage/providers/persistence-proxy.integration.test.ts tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/integration/token-usage/providers/token-usage-provider-registry.integration.test.ts tests/integration/agent-artifacts/repositories/agent-artifact-repository.integration.test.ts tests/integration/agent-artifacts/services/artifact-service.integration.test.ts tests/e2e/agent-artifacts/agent-artifacts-graphql.e2e.test.ts`

### Findings

1. `agent_artifacts.agent_id` and `token_usage_records.agent_id` are not foreign-key constrained:
- Prisma schema and migration SQL show mapped scalar fields + index only, no relation FK for these runtime IDs.
- This allows clean ORM-level naming changes (`runId`) without DB redesign.

2. Runtime naming ambiguity persisted at ORM field level:
- Even after service/store-level cleanup, Prisma models still exposed `agentId` for runtime identifiers, forcing adapter translations and mixed terminology.

3. Safe normalization path:
- Renaming Prisma model fields to `runId` while preserving `@map("agent_id")` keeps DB schema/data intact and removes runtime naming drift in active server code.
- Token usage domain/provider/repository contracts can align to `runId` end-to-end with no lifecycle behavior change.

### Implications

- Backend runtime persistence paths are cleaner and conceptually consistent after this pass:
  - runtime identity is `runId`;
  - definition identity remains `agentDefinitionId` / `teamDefinitionId`.
- No migration is required for this refinement because physical DB columns are unchanged.

## Residual Scan Pass (`2026-02-23`) - Remaining Mixed Naming Inventory

### Sources Consulted

- Scoped runtime scans:
  - `rg -n "agentInstanceId|AgentInstanceId|agentTeamInstanceId|AgentTeamInstanceId|AgentInstanceManager|AgentTeamInstanceManager|createAgentInstance|createAgentTeamInstance" autobyteus-server-ts/src autobyteus-web ...`
  - `rg -n "\bagentId\b|\bteamId\b" autobyteus-server-ts/src/{agent-execution,agent-team-execution,services,api/graphql,run-history,token-usage,agent-artifacts,agent-customization,external-channel} ...`
  - `rg -n "\bagentId\b|\bteamId\b" autobyteus-web/{stores,services,components/workspace,components/conversation,graphql,types} ...`

### Findings

1. `*Instance*` runtime identifiers are now absent in active frontend/server source paths:
- no matches for `agentInstanceId`, `agentTeamInstanceId`, `AgentInstanceManager`, `AgentTeamInstanceManager` in production paths.

2. Frontend residual runtime `agentId` naming in conversation/event-monitor flow was local and safe to normalize:
- updated local props/variables/comments to `runId` in:
  - `autobyteus-web/components/conversation/AIMessage.vue`
  - `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`
  - `autobyteus-web/components/conversation/segments/ToolCallSegment.vue`
  - `autobyteus-web/types/conversation.ts`
  - related tests.

3. Remaining backend `agentId/teamId` usage is concentrated in two categories:
- Core-boundary runtime entities from `autobyteus-ts`:
  - manager/streaming/converter code that must read `agent.agentId` / `team.teamId` / `context.agentId`.
- External-channel contract surface:
  - domain/provider/service/GraphQL setup modules still use `agentId` / `teamId` as target runtime IDs.

### Implications

- Frontend runtime naming in active workspace/conversation flows is now cleanly run-oriented.
- Remaining mixed naming is backend-heavy and mostly boundary/contract-level; a further pass is possible but should be treated as a broader breaking rename scope (especially external-channel APIs/contracts).

## Refinement Pass (`2026-02-23`) - External-Channel Runtime Contract Normalization

### Sources Consulted

- Backend external-channel modules:
  - `autobyteus-server-ts/src/external-channel/domain/models.ts`
  - `autobyteus-server-ts/src/external-channel/services/*.ts`
  - `autobyteus-server-ts/src/external-channel/providers/*.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/*.ts`
- GraphQL setup modules:
  - `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/{resolver.ts,mapper.ts}`
- Related processor boundary modules:
  - `autobyteus-server-ts/src/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.ts`
  - `autobyteus-server-ts/src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts`
- Persistence model:
  - `autobyteus-server-ts/prisma/schema.prisma`
- Validation commands:
  - `pnpm --dir autobyteus-server-ts exec prisma generate`
  - `pnpm --dir autobyteus-server-ts exec vitest --run tests/unit/external-channel tests/integration/external-channel tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts tests/unit/api/rest/channel-ingress.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts tests/unit/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.test.ts tests/unit/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.test.ts`

### Findings

1. External-channel runtime target fields were still mixed:
- active backend contracts used `agentId` / `teamId` even though these values represent runtime run IDs.

2. Normalization is safe with DB compatibility:
- Prisma fields for `ChannelBinding` and `ChannelMessageReceipt` can expose `agentRunId` / `teamRunId` while keeping DB columns unchanged via `@map("agent_id")` and `@map("team_id")`.

3. Core-boundary agent context remains a read boundary:
- `AgentContext` from `autobyteus-ts` still exposes `context.agentId`; local server logic can normalize immediately into `agentRunId` variables without changing core library contracts in this ticket.

### Implications

- External-channel runtime semantics are now run-oriented end-to-end in server active code paths.
- Persisted storage and SQL schema compatibility are preserved by ORM mapping, so this pass remains naming-only with no lifecycle behavior redesign.

## Verification Iteration (`2026-02-23`) - Application Runtime Alignment + Core-Boundary Residual Audit

### Sources Consulted

- Branch/worktree checks:
  - `git branch --show-current`
  - `git status --short`
- Scoped production-path scans:
  - `rg -n 'agentInstanceId|agentTeamInstanceId|AgentInstanceId|AgentTeamInstanceId|AgentInstanceManager|AgentTeamInstanceManager|createAgentInstance|createTeamInstance' autobyteus-server-ts/src autobyteus-web/{components,stores,services,graphql,types,pages,applications,utils,composables}`
  - `rg -n '\\binstanceId\\b|\\binstances\\b|\\?instanceId=|:instance-id=|instance-selected|instance-created|RunningInstanceRow' autobyteus-server-ts/src autobyteus-web/{components,stores,services,graphql,types,pages,applications,utils,composables}`
  - `rg -n '\\bagentId\\b|\\bteamId\\b' autobyteus-server-ts/src/{agent-execution,agent-team-execution,run-history,services/agent-streaming,api/graphql/converters,api/graphql/types} autobyteus-web/{stores,services/agentStreaming,components/workspace,graphql,types}`
- Runtime manifest/memory verification:
  - `autobyteus-server-ts/src/run-history/store/team-run-manifest-store.ts`
  - `autobyteus-server-ts/src/run-history/store/team-run-index-store.ts`
  - `autobyteus-web/stores/runHistoryStore.ts`
- Validation commands:
  - `pnpm --dir autobyteus-server-ts exec vitest --run tests/unit/agent-customization/processors/security-processor/workspace-path-sanitization-processor.test.ts`
  - `pnpm --dir autobyteus-web test:nuxt stores/__tests__/applicationRunStore.spec.ts stores/__tests__/agentContextsStore.spec.ts stores/__tests__/runHistoryStore.spec.ts components/workspace/running/__tests__/RunningAgentGroup.spec.ts components/workspace/running/__tests__/RunningTeamGroup.spec.ts components/workspace/running/__tests__/RunningAgentsPanel.spec.ts components/workspace/running/__tests__/RunningAgentsPanel.hostBoundary.spec.ts`

### Findings

1. No runtime `*Instance*` identifiers remain in active frontend/backend production source paths.
- Scoped scans returned no matches for `agentInstanceId`, `agentTeamInstanceId`, `AgentInstanceManager`, `AgentTeamInstanceManager`, or `create*Instance` APIs.

2. Team run manifest/index and frontend run-history parsing are run-named.
- `teamRunId` and `memberRunId` are canonical in active parser/store paths; no `manifest.teamId` fallback remains in active code paths.

3. Remaining `agentId/teamId` symbols in scoped runtime modules are core-boundary reads only.
- Residual hits are limited to:
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` (`agent.agentId`)
  - `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` (`team.teamId`)
  - `autobyteus-server-ts/src/api/graphql/converters/agent-run-converter.ts` (`domainAgent.agentId`)
  - `autobyteus-server-ts/src/api/graphql/converters/agent-team-run-converter.ts` (`domainTeam.teamId`)
- These are required bridge reads from `autobyteus-ts` runtime entity contracts and are outside this ticket's core-boundary exclusion.

4. Final residual wording cleanup completed in active backend processor logs.
- Updated `workspace-path-sanitization-processor.ts` local naming/log phrasing from generic `agentId` / "instances" wording to run-oriented phrasing (`agentRunId`, "occurrences").

### Implications

- Frontend + backend application layers are now run-vs-definition consistent for active runtime paths.
- Remaining runtime-id legacy terms are constrained to explicit core-boundary bridge points and do not leak into frontend/backend runtime contracts.

### Additional Constraint Confirmed

- Frontend codegen source mismatch remains:
  - `pnpm --dir autobyteus-web codegen` validates against an endpoint/schema still exposing legacy `*Instance*` and `agentId/teamId` fields.
  - Result: generated client types remain stale for run-named contracts until codegen is pointed at the updated backend schema.
