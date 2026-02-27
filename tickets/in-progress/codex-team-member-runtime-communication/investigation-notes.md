# Investigation Notes

## Ticket

- `codex-team-member-runtime-communication`

## Investigation Status

- Stage: `Re-investigation In Progress (Stage 0 Re-entry, Round 11)`
- Last Updated: `2026-02-27`

## Stage 0 Re-Entry Trigger (T-125)

- Trigger: user validation reported Codex team runs selected on `Temp Workspace` are not shown under that workspace in history, and left tree appears as generic `Agent` runs.
- Classification: `Unclear` (cross-layer behavior mismatch between team runtime persistence, team history grouping, and existing seeded run-history noise).
- Immediate action: keep code edit lock, trace workspace-root persistence path for Codex team member bindings and verify team history projection grouping contract before Stage 1 requirement/design updates.

## Stage 0 Re-Entry Trigger (T-115)

- Trigger: user added new requirement that team runs must support Codex runtime selection in frontend config, with Codex model selection and per-member thinking-config support when Codex is selected.
- Classification: `Requirement Gap`.
- Immediate action: keep code edit lock, refresh frontend/backend contract investigation for team runtime-kind-driven model/config loading, then update requirements/design/runtime-model artifacts before reopening Stage 5.

## Stage 0 Re-Entry Trigger (T-098)

- Trigger: user requested to return to investigation again and continue workflow-driven improvements before further implementation.
- Classification: `Design Impact`.
- Immediate action: keep code edit lock, refresh the exact front-end coupling hotspot scope, then revalidate requirements/design/runtime-model artifacts before reopening Stage 5.

## Stage 0 Re-Entry Trigger (T-091)

- Trigger: user requested explicit return to investigation phase again and asked to continue workflow-driven architecture improvements before further implementation.
- Classification: `Design Impact`.
- Immediate action: keep code edit lock, refresh findings on remaining decoupling hotspots, then revalidate requirements/design/runtime-model path.

## Stage 0 Re-Entry Trigger (T-085)

- Trigger: user requested explicit return to investigation stage to continue workflow-driven improvements, with focus on shared app-server topology (one process, many threads) for codex team runtime.
- Classification: `Requirement Gap`.
- Immediate action: keep code edit lock, complete investigation-backed design update for shared-process runtime manager before runtime-model/review reruns.

## Stage 0 Re-Entry Trigger (T-084)

- Trigger: user requested internet-backed investigation on Codex App Server MCP/skills configuration and explicitly requested return to investigation stage.
- Classification: `Unclear` (cross-cutting runtime-configuration/design clarification before requirements/design re-entry).
- Immediate action: keep code edit lock, document official Codex MCP/skills/app-server configuration model, and map delta versus current server integration.

## Stage 0 Re-Entry Trigger (T-071)

- Trigger: user requested rollback to investigation again after review finding `P2` on `WorkspaceAgentRunsTreePanel.vue` over-coupling.
- Classification: `Design Impact`.
- Immediate action: refine refactor to-do into concrete module boundaries before runtime-model/regression gates restart.

## Stage 0 Re-Entry Trigger (T-068)

- Trigger: user-requested additional code-review round identified unresolved design-impact hotspots and requested rollback to investigation/design.
- Classification: `Design Impact`.
- Immediate action: keep code edit lock, capture concrete SoC findings with file/line evidence, and refresh design basis before any further implementation.

## Stage 0 Re-Entry Trigger (T-057)

- Trigger: user requested requirements-stage reset to enforce explicit team-only `send_message_to` exposure semantics and flagged oversized Codex runtime hotspot for refactor.
- Classification: `Requirement Gap`.
- Immediate action: keep code edit lock, update requirements/design/runtime-model artifacts first, then reopen implementation only after Stage 4 revalidation.

## Stage 0 Re-Entry Trigger (T-023)

- Trigger: user requested return to investigation phase again from Stage 5 before continuing implementation.
- Classification: `Unclear` (explicit process reset for deeper clarity).
- Immediate action: lock code edits, re-open investigation, and document unresolved wiring gaps before any requirements/design/runtime-review revalidation.

## Stage 0 Re-Entry Trigger (T-017)

- Trigger: user-requested rollback from Stage 5 to Stage 0 before continuing implementation.
- Classification: `Unclear` (requested process reset).
- Immediate action: lock code edits and refresh investigation with concrete implementation-edge mapping before re-entering requirements/design/runtime-review gates.

## Re-Entry Focus

1. Confirm whether runtime/member-binding persistence contract needs additional normalization rules before coding resumes.
2. Confirm exact ownership boundary between resolver, team runtime orchestration, and websocket stream bridging for codex-member teams.
3. Confirm inter-agent tool path contract wiring point in codex runtime service (`send_message_to` envelope ingress) and failure-code mapping.
4. Confirm why implementation required broad file inspection and capture concrete unresolved seams, so Stage 2/3 updates can be narrowly scoped.

## Implementation-Edge Findings (Stage 0 Re-Entry)

1. Team manifest schema is strict and currently rejects runtime fields unless domain + store validation are updated together (`team-models.ts`, `team-run-manifest-store.ts`, `team-member-run-manifest-store.ts`).
2. Resolver currently assumes `AgentTeamRunManager` is the only team runtime owner; codex-member mode requires a separate orchestration path (`agent-team-run.ts` + new orchestrator service) to avoid coupling codex member sessions to autobyteus team object lifecycle.
3. Continuation path (`team-run-continuation-service.ts`) currently restores only via `AgentTeamRunManager.createTeamRunWithId(...)`; codex-member resume needs member-session restore through runtime composition and session binding before dispatch.
4. Team websocket handler (`agent-team-stream-handler.ts`) currently depends on `getTeamEventStream`; codex-member mode needs a dedicated runtime-event bridge subscribed per member session.
5. Runtime ingress contract lacks an inter-agent envelope command; adding `relayInterAgentMessage` impacts `runtime-adapter-port.ts`, `runtime-command-ingress-service.ts`, and codex adapter/service integration.
6. Frontend reopen flow (`runHistoryStore.ts`) hardcodes team member runtime kind to `autobyteus`; manifest parsing must hydrate per-member runtime kind/reference to avoid resume drift for codex teams.

## Sources Consulted

### Ticket Artifacts

- `tickets/in-progress/codex-team-member-runtime-communication/requirements.md`
- `autobyteus-server-ts/tickets/codex-runtime-server-owned-redesign/proposed-design.md`
- `autobyteus-server-ts/tickets/codex-runtime-server-owned-redesign/proposed-design-based-runtime-call-stack.md`

### Web/External References

- [Codex MCP Configuration](https://developers.openai.com/codex/mcp)
- [Codex Skills](https://developers.openai.com/codex/skills)
- [Codex App Server](https://developers.openai.com/codex/app-server)
- [Codex Config Reference](https://developers.openai.com/codex/config-reference)
- [Codex Config Advanced](https://developers.openai.com/codex/config-advanced)
- [OpenAI: Unlocking Codex through Real-world Software Engineering Tasks](https://openai.com/index/introducing-codex/)

### Backend Runtime/Team Execution

- `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-command-ingress-service.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-adapter-port.ts`
- `autobyteus-server-ts/src/runtime-execution/adapters/autobyteus-runtime-adapter.ts`
- `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts`
- `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
- `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-client.ts`
- `autobyteus-server-ts/src/runtime-execution/codex-app-server/team-codex-inter-agent-message-relay.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
- `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-runtime-binding-registry.ts`

### Core Library Inter-Agent Messaging (Authoritative Semantics)

- `autobyteus-ts/src/agent/message/send-message-to.ts`
- `autobyteus-ts/src/agent-team/handlers/inter-agent-message-request-event-handler.ts`
- `autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts`
- `autobyteus-ts/src/agent-team/agent-team.ts`

### Backend Run History/Continuation

- `autobyteus-server-ts/src/run-history/domain/team-models.ts`
- `autobyteus-server-ts/src/run-history/store/team-run-manifest-store.ts`
- `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
- `autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`
- `autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts`
- `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts`

### Frontend Team Streaming/History/Config

- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- `autobyteus-web/stores/agentTeamRunStore.ts`
- `autobyteus-web/stores/agentTeamContextsStore.ts`
- `autobyteus-web/stores/runHistoryStore.ts`
- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
- `autobyteus-web/types/agent/TeamRunConfig.ts`
- `autobyteus-web/types/agent/AgentRunConfig.ts`
- `autobyteus-web/generated/graphql.ts`

### Tests

- `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-execution/runtime-command-ingress-service.test.ts`
- `autobyteus-server-ts/tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`
- Local validation probe:
  - `pnpm -C autobyteus-server-ts typecheck` -> failed because `node_modules`/`tsc` not installed yet in this worktree.

## Current-System Findings

### Entrypoints And Execution Boundaries

1. Team run creation and message entrypoints are GraphQL mutations in `agent-team-run.ts` (`createAgentTeamRun`, `sendMessageToTeam`).
2. Team runtime execution currently depends on `AgentTeamRunManager` creating autobyteus-ts `AgentTeamConfig`/`AgentConfig` objects.
3. Team websocket command handling (`agent-team-stream-handler.ts`) routes through `RuntimeCommandIngressService`, but ingress resolution is team-run scoped (`runId = teamRunId`) and assumes one runtime session per team run.
4. Single-agent runtime selection already exists (`agent-run.ts` + `RuntimeCompositionService`) and supports `runtimeKind=codex_app_server`.

### Data Model And Persistence Findings

1. `TeamMemberConfigInput` has `memberRouteKey` and `memberRunId`, but no member-level `runtimeKind`.
2. Team manifest model (`TeamRunMemberBinding`) persists member identity + model/tool/workspace config, but no runtime fields (`runtimeKind`/`runtimeReference`).
3. Team manifest validation/store is strict and would reject unknown required runtime fields unless schema is updated.
4. Team continuation restores members by replaying team member configs into `AgentTeamRunManager.createTeamRunWithId(...)`, again with no member runtime kind.

### Routing/Identity Findings

1. Team stream event conversion already forwards `agent_name` and optionally `agent_id` to frontend.
2. Frontend `TeamStreamingService` uses `agent_name` first, then `agent_id` to map events to member contexts.
3. Tool approval payloads from frontend use `agent_name`; backend accepts `agent_name | target_member_name | agent_id`.
4. Team message routing currently passes `targetMemberName` into team `postMessage(...)` and not member runtime session IDs directly.

### Runtime Layer Findings

1. Codex runtime adapter is run-session based and executes operations by `runId`; `sendTurn` does not use `targetMemberName`.
2. `RuntimeCommandIngressService` stores sessions by one `runId` key; no built-in sub-session registry for team members under one team run.
3. Team mode in autobyteus adapter delegates to team object methods (`postMessage`, `postToolExecutionApproval`, `stop`) and assumes local autobyteus team semantics.
4. Frontend team run config (`TeamRunConfig`) does not include per-member `runtimeKind` override.

### Naming/Convention Findings

1. Team identity naming is stable around `teamRunId`, `memberRouteKey`, `memberRunId`.
2. Single-agent runtime naming uses `runtimeKind` + `runtimeReference` consistently across run-history surfaces.
3. Team manifests and team frontend history parsing currently do not follow that runtime naming pattern yet.

## Confirmed Gaps Against Ticket Intent

1. No first-class member runtime kind capture path at team creation.
2. No persisted member runtime metadata for deterministic team resume under non-default runtime.
3. No explicit team-member runtime-session binding layer for codex-backed team members.
4. Team ingress is team-level session keyed; not member-runtime-session keyed.
5. Frontend team config and GraphQL generated types do not expose member runtime selection.
6. Requirements/design were too broad on member-to-member semantics and did not explicitly codify `send_message_to` tool contract parity from core library behavior.
7. Codex team-runtime plan lacked an explicit boundary/API for agent-to-agent envelope delivery (`senderAgentId`, `recipientName`, `messageType`, `content`) as a first-class orchestration path.

## Re-Investigation Findings: Team-Scoped Tool Exposure + Hotspot Refactor

1. Codex `send_message_to` exposure is currently team-gated by runtime metadata (`teamRunId`) in dynamic tool resolution, but this rule was not explicitly captured in requirements acceptance criteria.
2. Codex runtime service file size is now `1086` LOC, exceeding the previously reviewed maintainability threshold and warranting structure-preserving module extraction.
3. The clean separation path is to extract Codex inter-agent relay tool parsing/response shaping and team dynamic-tool registration helpers into dedicated modules while preserving orchestrator ownership of business routing semantics.
4. No requirement expansion is needed beyond making the team-scoped tool-availability constraint explicit and verifiable in Stage 6.

## Re-Investigation Findings: Additional Review Round (Design Impact)

1. `autobyteus-web/stores/runHistoryStore.ts` remains large (`983` LOC) and still mixes transport IO, projection construction, run/team selection orchestration, workspace-creation side effects, and formatting utilities; helper extraction reduced size but did not complete concern separation.
2. `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` is still `906` LOC and combines rendering, stateful expansion maps, avatar fallback caches, destructive actions (terminate/delete), workspace create UX, and bootstrap data loading in one component boundary.
3. `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts` constructor performs global relay ownership mutation (`setInterAgentRelayHandler`) on runtime service at construction time, which introduces hidden coupling and lifecycle ambiguity.
4. `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` still centralizes session lifecycle, approval routing, dynamic tool handling, and model catalog mapping in one class (`813` LOC), which keeps high change-surface concentration for runtime evolution.
5. Because these findings are architecture/separation concerns rather than behavior defects, this reopen is classified as `Design Impact` and requires Stage 2 design update before re-entering runtime-model/review gates.

## Re-Investigation Findings: Finding-1 Driven Refactor To-Do Refinement

1. `WorkspaceAgentRunsTreePanel.vue` coupling root cause is mixed ownership between:
   - tree rendering sections,
   - action workflows (terminate/delete/create workspace),
   - avatar cache/fallback state,
   - bootstrap loading lifecycle.
2. Refactor to-do must split panel responsibilities into:
   - container shell (data wiring + emits only),
   - workspace tree render section,
   - team tree render section,
   - action composable (`terminate/delete/create`),
   - avatar presentation/composable (cache + fallback).
3. `runHistoryStore.ts` must complete split between:
   - read-model/projection/query hydration,
   - mutation/open/delete/select workflows.
4. Relay ownership defect remains a blocking architecture item:
   - remove constructor-side runtime global mutation in orchestrator,
   - add explicit composition lifecycle bind/unbind ownership module.
5. Scope impact remains architectural only; no new runtime behavior requirement was discovered in this round.

## Re-Investigation Findings: Round 9 Execution Focus

1. `WorkspaceAgentRunsTreePanel.vue` is no longer a monolith, but still centralizes cross-section coordination through a high-fanout callback/prop contract to `WorkspaceHistoryWorkspaceSection.vue`, which keeps container/section coupling unnecessarily high.
2. Existing action/avatar/workspace-create composables are valid and should be retained; the remaining design debt is the section contract boundary, not business behavior.
3. `runHistoryStore.ts` remains above the preferred review threshold but current reopened finding is specifically panel-container coupling (`P2`), so this loop should close `C-023` first without broadening into unrelated store semantics.
4. No new requirement behavior was discovered; this is a structural refactor pass focused on typed section contracts and selection/tree-state composable extraction.

## Re-Investigation Findings: Round 10 Team Runtime Selector Gap

1. `TeamRunConfigForm.vue` currently loads providers through `llmStore.fetchProvidersWithModels()` with no runtime parameter, so it defaults to `autobyteus` and never loads Codex model catalogs for team configuration.
2. Team run config type (`TeamRunConfig`) has no global `runtimeKind`, which prevents runtime-capability-aware model loading and creates ambiguity in launch payload construction.
3. `MemberOverrideItem.vue` still exposes a per-member runtime dropdown while backend team mutation service rejects mixed-runtime team requests (`[MIXED_TEAM_RUNTIME_UNSUPPORTED]`), creating a UX/path mismatch.
4. Single-agent config (`AgentRunConfigForm.vue`) already implements the expected runtime-capability pattern (runtime selector + capability gating + runtime-driven model reload), and team config should reuse the same boundary pattern.
5. Backend capabilities and catalog queries already support the required behavior:
   - `runtimeCapabilities` exposes `codex_app_server` availability.
   - `availableLlmProvidersWithModels(runtimeKind)` returns runtime-specific model lists and config schemas.
6. Team launch payload generation in `agentTeamRunStore.ts` should use one explicit team runtime kind for all members so frontend behavior matches backend uniform-runtime enforcement.

## Re-Investigation Findings: Round 11 Team History Workspace/Label Mismatch

1. Live GraphQL inspection confirms latest user-created `Professor Student Team` rows have `workspaceRootPath = null` at team level and member level (`member.workspaceRootPath = null`), so they cannot be grouped under the selected `Temp Workspace` root.
2. Root cause is on Codex team-create path: `TeamRunMutationService.buildTeamRunManifest(...)` uses `memberBindingsOverride` returned by `createCodexMemberSessions(...)`; these bindings currently carry `workspaceRootPath` only from incoming `config.workspaceRootPath` and do not resolve from `workspaceId`.
3. Frontend team history grouping relies on concrete workspace root paths (`buildRunHistoryTeamNodes` filtered per workspace section). With null workspace roots, team rows become effectively unassigned and do not appear under normal workspace nodes.
4. The `autobyteus-run-history-*` and `codex-history-projection-e2e-*` entries shown in left tree are seeded/test history rows from earlier validation runs (`listRunHistory`), each with unresolved/missing agent definitions; this is why they render as generic `Agent`.
5. Secondary UX symptom ("left shows Agent instead of Professor") is therefore primarily visibility/routing confusion: the current team run is not attached to the selected workspace bucket, while stale seeded agent-run history remains visible.
6. Corrective direction: enforce deterministic `workspaceRootPath` persistence for Codex team member bindings (resolve from `workspaceId` when explicit root is absent), so team rows render under the selected workspace and member names (`Professor`, `Student`) are accessible in the workspace team section.

## Implications For Stage 1/2 Updates

1. Add explicit requirement coverage for team-level runtime selection and runtime-scoped model/config loading.
2. Promote runtime selection to team config boundary (`TeamRunConfig.runtimeKind`) and remove member-level runtime selection from team UI path.
3. Keep per-member override scope limited to model, thinking config, and auto-execute behavior under the selected team runtime.

## Implementation-Edge Findings (Stage 0 Re-Entry Round 2)

1. `agent-team-run.ts` is still wired to `AgentTeamRunManager` only for create/send/terminate; codex-member runtime orchestration path is not yet integrated at resolver boundary.
2. Team stream ingress (`agent-team-stream-handler.ts`) still binds to `getTeamEventStream(teamRunId)` only and has no runtime-mode branch to consume codex member-session streams.
3. New codex inter-agent relay boundary and orchestrator exist, but end-to-end path is incomplete because resolver/runtime-mode selection has not been connected for team creation/send flow.
4. Frontend/team context defaults still force member runtime kind to `autobyteus` in relevant stores, so codex-member routing intent can drift on reopen/resume unless runtime metadata hydration is completed.
5. Broad file inspection was required because the unresolved behavior is cross-layer: GraphQL input modeling, runtime session binding, stream fan-in, history manifest persistence, and frontend reopen hydration are all coupled by the same member identity contract.

## Re-Investigation Findings: Agent-To-Agent `send_message_to` Path

1. In core runtime, `send_message_to` is an agent communication tool that dispatches `InterAgentMessageRequestEvent` through team manager, not through frontend user message APIs.
2. Core team handler ensures recipient node readiness, then delivers either:
   - direct inter-agent payload (`postInterAgentMessage`) for agent recipient, or
   - user-message wrapper (`postMessage`) for sub-team recipient.
3. Receiver-side handler normalizes inter-agent payload into regular input queue flow, preserving sender metadata and message type.
4. Existing server team GraphQL/WS message ingress currently models user-to-member and approval flows, but does not yet define a dedicated codex member-to-member tool-envelope dispatch contract.
5. This is a requirements gap first, not a code-first patch: runtime behavior and acceptance criteria must explicitly distinguish:
   - user-driven team send (`sendMessageToTeam`), and
   - agent-driven inter-agent send (`send_message_to` tool path).

## Constraints

1. Runtime abstraction boundary should remain in `autobyteus-server-ts` runtime services/adapters.
2. Existing team websocket protocol (`agent_name`/`agent_id`) should stay stable for frontend compatibility.
3. Non-Codex team behavior must remain unchanged.
4. Workflow modernization policy requires clean replacement with no legacy compatibility shims.
5. Local compile/test validation requires dependency bootstrap (`pnpm install`) before Stage 5/6 verification commands can run.

## Open Unknowns

1. Should first implementation support mixed runtime members in one team, or codex-only teams first?
2. Should coordinator-only codex be allowed, or must all members be codex in scope?
3. For codex-backed teams, is full autobyteus-ts inter-member orchestration required in phase 1, or is member-targeted runtime routing sufficient first?
4. What is the canonical ownership for member runtime session lifecycle: `AgentTeamRunManager` extension vs dedicated `TeamMemberRuntimeSessionService`?
5. Do Codex tool-approval/runtime events require additional member correlation metadata beyond existing `agent_name`/`agent_id` fields?
6. Should recipient session auto-start behavior for `send_message_to` match core semantics exactly in Stage 1, or be gated as an explicit policy?
7. Should codex inter-agent delivery support agent-to-subteam path in Stage 1, or only agent-to-agent path?

## Re-Investigation Findings: Codex App Server MCP + Skills Configuration

1. Official Codex docs show MCP servers are configured in Codex config under `mcp_servers.<name>` (transport, auth, tool allow/deny filters), and App Server exposes MCP lifecycle endpoints (`mcpServerStatus/list`, `config/mcpServer/reload`) to observe/reload those definitions.
2. App Server thread APIs (`thread/start`, `thread/resume`) support `dynamicTools`, so runtime-injected tools (such as team-scoped `send_message_to`) can coexist with configured MCP tools.
3. Official skills docs show skills are discovered from configured roots and can be managed through App Server methods (`skills/list`, `skills/config/write`), which means skills are configurable for App Server sessions rather than hardcoded in server business logic.
4. Therefore, MCP/skills behavior is configuration-context scoped: if Codex CLI and App Server share the same Codex config/home context, they can share definitions; if App Server runs with a separate config context, MCP/skills must be configured in that App Server context.
5. Current repository state:
   - Team-scoped dynamic tool injection is implemented in `codex-send-message-tooling.ts` and wired in `codex-app-server-runtime-service.ts`.
   - Autobyteus runtime flow resolves `skillNames` into runtime config for local runtime, but Codex adapter path does not yet propagate skill access configuration into Codex App Server launch/session config.
6. Design implication for next stages: keep Codex runtime integration decoupled by introducing a configuration adapter boundary (Codex config/profile + optional App Server config RPC sync) instead of embedding MCP/skills business logic into team orchestration paths.

## Re-Investigation Findings: Our Codebase Runtime Behavior (Default Config + MCP Auto-Use)

1. Codex runtime availability and launch are CLI-based in this codebase:
   - capability probe runs `codex --version` (`runtime-capability-service.ts`),
   - runtime launch defaults to command `codex` with args `["app-server"]` (`codex-runtime-launch-config.ts`).
2. App-server child process environment is inherited from the server process (`codex-app-server-client.ts` uses `env: this.options.env ?? process.env`), and this repository does not inject `CODEX_HOME`/`CODEX_CONFIG` overrides in runtime-launch wiring.
3. Runtime session start/resume sends `config: null` to Codex App Server (`codex-app-server-runtime-service.ts`), so this code path does not push MCP server definitions from AutoByteus DB into Codex App Server per-thread config.
4. Therefore, in current implementation, Codex App Server MCP visibility comes from the Codex config context seen by the server process (default when no `CODEX_APP_SERVER_*`/Codex config overrides are provided).
5. Live probe evidence in this environment:
   - `codex mcp list` returned configured MCP servers (`alexa_home`, `autobyteus_image_audio`, `browser`, `ssh_remote`, `tts`);
   - direct RPC probe against `codex app-server` (`mcpServerStatus/list`) returned the same 5 server names;
   - shell environment for this session has no `CODEX_APP_SERVER_COMMAND`, `CODEX_APP_SERVER_ARGS`, `CODEX_APP_SERVER_ARGS_JSON`, `CODEX_HOME`, or `CODEX_CONFIG` set.
6. Conclusion for "our case": yes, our Codex App Server path uses Codex CLI runtime (`codex app-server`) and automatically sees MCP servers from that Codex config context; no, it does not automatically import/sync AutoByteus MCP DB configs into Codex App Server.

## Re-Investigation Findings: App-Server Process Model (Singleton Or Not)

1. The code has a singleton runtime service object (`getCodexAppServerRuntimeService()` caches one `CodexAppServerRuntimeService` instance), but that service tracks many run sessions.
2. Each run session creates its own `CodexAppServerClient`, and each client start spawns a subprocess (`spawn(command, args)`), so process lifecycle is per session, not global singleton.
3. For the same `runId`, `createRunSession`/`restoreRunSession` first close existing session, so there is at most one active Codex app-server subprocess per run ID.
4. In team codex-member mode, orchestrator loops members and restores/creates runtime sessions per member run ID; this can produce multiple concurrent Codex app-server subprocesses for one team run.
5. Run-history Codex thread reader also creates an ephemeral `CodexAppServerClient` per read call, so short-lived extra subprocesses can appear during projection hydration.
6. Conclusion: current implementation does not guarantee one singleton app-server process for all team members; it guarantees session isolation per member run ID.

## Re-Investigation Findings: Official Recommendation On Process Topology

1. Codex App Server docs describe starting one server process, then initializing once per transport connection and starting/resuming/forking threads over that same connection; this implies one long-lived server can host multiple threads.
2. App Server docs also expose `thread/loaded/list`, `thread/list`, and thread status APIs, which aligns with multi-thread management inside a process rather than one process per thread as a requirement.
3. OpenAI engineering blog explicitly describes App Server as a long-lived process with a thread manager that spins up one core session per thread within the process.
4. Therefore, official documentation does not require one subprocess per agent/thread. Per-agent subprocess is an integrator architecture choice (often for isolation/simplicity), not the mandated recommendation.

## Implications For Requirements And Design

1. Requirements need explicit `requirement_id` entries covering member runtime kind capture, persistence, restore, routing, tool approval, and stream identity mapping.
2. Design likely needs a dedicated backend boundary to manage per-member runtime sessions for team runs.
3. Team manifest domain/store + frontend manifest parsing will need schema evolution for member runtime metadata.
4. GraphQL input/output and frontend team config model need member runtime fields.
5. Runtime ingress must gain deterministic resolution of target member runtime session for send/approval paths while keeping existing non-codex team flow intact.
6. Requirements must add explicit verifiable contract for agent-to-agent `send_message_to` semantics, not only generic "member communication."
7. Design must add/clarify a dedicated inter-agent relay boundary in codex team runtime orchestration so tool-level semantics stay decoupled from GraphQL/frontend input paths.

## Scope Triage

- Classification: `Medium`
- Rationale:
  - Cross-layer impact (`autobyteus-server-ts` runtime + team execution + run history + websocket + `autobyteus-web` run config/history).
  - Public API surface changes (GraphQL team member input + history payload shape updates).
  - Persistence model changes for team manifest member bindings.
  - Requires structural runtime boundary addition for member-session orchestration, explicit agent-to-agent inter-member relay semantics, and codex runtime hotspot module extraction.

## Re-Investigation Findings: Round 8 Decoupling Check

1. `codex-app-server-runtime-service.ts` is still `813` LOC and still owns session lifecycle, thread start/resume, event normalization, approval routing, and dynamic-tool relay handling in one class; the shared-process manager requirement (`C-026`, `R-018`) is not implemented yet.
2. Process topology remains per run/member session because `startSession(...)` creates a new `CodexAppServerClient` and each client `start()` performs a new `spawn(...)`; this confirms the shared-process objective remains open, not partially complete.
3. `WorkspaceAgentRunsTreePanel.vue` is now reduced to `376` LOC and delegates mutations/avatar/workspace-create concerns into composables, but container coupling is still high due large function-prop fanout into `WorkspaceHistoryWorkspaceSection.vue`.
4. `WorkspaceHistoryWorkspaceSection.vue` currently accepts a wide callback/state prop surface, which shifts complexity from file size to cross-component contract coupling; a typed context object or scoped action adapter is likely needed to keep ownership boundaries clearer.
5. `runHistoryStore.ts` is still `601` LOC and still mixes data fetching, selection/open orchestration, creation/deletion workflows, and projection access; it has improved modular imports but remains above the updated review threshold and still carries multi-concern ownership.

## Round 8 Implications For Next Stage

1. Stage 1 requirement revalidation should explicitly confirm whether the shared-process requirement stays in-scope for this ticket closure (no down-scope drift).
2. Stage 2 design update should add concrete extraction boundaries for:
   - Codex process manager/service split,
   - history panel container contract simplification (prop fanout reduction),
   - run history store further decomposition (read/write/orchestration boundaries).
3. Stage 3/4 should be rerun after those design deltas so implementation resumes with stable architecture targets instead of incremental patching.
