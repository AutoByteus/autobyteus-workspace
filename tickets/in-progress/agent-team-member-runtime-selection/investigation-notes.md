# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Completed
- Investigation Goal: Determine whether agent-team runs can support selecting different runtimes for different members, and quantify current support status plus design impact.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale:
  - Current architecture intentionally enforces one runtime per team run.
  - Supporting mixed-runtime teams would affect frontend config, GraphQL launch, backend orchestration, persistence/restore, streaming, and reopen/history hydration.
- Scope Summary:
  - As of 2026-04-19, mixed-runtime team members are not supported. The codebase explicitly blocks them and prior design work intentionally converged on a single-runtime-per-team model.
- Primary Questions To Resolve:
  1. Does the current product/config contract allow different runtime selection per team member?
  2. Which authoritative owners currently assume one runtime per team run?
  3. Was per-member runtime selection intentionally removed or rejected in prior work?
  4. If supported in future, what minimum architecture changes would be required?

## Request Context

- User asked: "Could you check whether we can support that for agent team, we can select different runtime for different member? can we support that? it will make things more convenient. thanks a lot"

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection/tickets/in-progress/agent-team-member-runtime-selection`
- Current Branch: `codex/agent-team-member-runtime-selection`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection`
- Bootstrap Base Branch: `personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-04-19
- Task Branch: `codex/agent-team-member-runtime-selection`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `origin/personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents:
  - Dedicated task worktree/branch created before deeper investigation.
  - This is a feasibility/design-impact assessment, not an implementation ticket yet.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-19 | Command | `git fetch origin personal` | Refresh base before creating task branch/worktree | Refresh succeeded | No |
| 2026-04-19 | Command | `git branch codex/agent-team-member-runtime-selection origin/personal && git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection codex/agent-team-member-runtime-selection` | Create dedicated task worktree/branch | Dedicated worktree created successfully | No |
| 2026-04-19 | Code | `autobyteus-web/types/agent/TeamRunConfig.ts`, `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`, `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | Verify current frontend team config shape | Frontend has one team `runtimeKind`; member overrides no longer include runtime override support | No |
| 2026-04-19 | Code | `autobyteus-web/stores/agentTeamRunStore.ts`, `autobyteus-web/utils/application/applicationLaunch.ts`, `autobyteus-web/utils/teamRunConfigUtils.ts` | Verify launch payload and reopen behavior | Launch writes the same team runtime to every member; reopen collapses runtime to a dominant team value | No |
| 2026-04-19 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Verify backend acceptance/rejection and restore flow | Mixed-runtime launch is rejected; restore infers team runtime from first member metadata | No |
| 2026-04-19 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts`, `team-run-context.ts`, `services/agent-team-run-manager.ts`, `backends/*team-run-backend-factory.ts` | Verify runtime ownership boundaries | Team-run domain and manager choose one runtime/backend per team run | No |
| 2026-04-19 | Code | `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts`, `services/team-run-history-service.ts`, `services/team-member-run-view-projection-service.ts` | Check persistence and projection assumptions | Per-member runtime is persisted, but restore/reopen/orchestration still assume one governing runtime owner | No |
| 2026-04-19 | Code | `autobyteus-server-ts/tests/integration/agent-team-execution/team-run-service.integration.test.ts` | Confirm mixed-runtime rejection is covered by test | Integration test expects `[MIXED_TEAM_RUNTIME_UNSUPPORTED]` | No |
| 2026-04-19 | Doc | `tickets/done/runtime-decoupling-refactor/proposed-design.md`, `tickets/done/runtime-decoupling-refactor/code-review.md` | Check whether per-member runtime override removal was intentional | Prior design explicitly removed legacy per-member runtime override semantics and enforced team-level runtime model | No |
| 2026-04-19 | Doc | `tickets/in-progress/codex-team-member-runtime-communication/requirements.md`, `proposed-design.md`, `implementation-plan.md` | Check latest team-runtime product/design direction | Current accepted direction is single runtime per team run; mixed-runtime explicitly deferred as a future phase | No |
| 2026-04-19 | Doc | `autobyteus-server-ts/tickets/codex-runtime-server-owned-redesign/requirements.md`, `tickets/done/application-bundle-import-ecosystem/requirements.md` | Cross-check broader runtime roadmap assumptions | Other tickets also describe current system as team-level runtime only | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Frontend team config starts at `TeamRunConfig` / `TeamRunConfigForm`, which exposes one team `runtimeKind`.
- Current execution flow:
  - `TeamRunConfig.runtimeKind` -> launch store builds `memberConfigs` with the same runtime for every member -> GraphQL `createAgentTeamRun` -> `TeamRunService.resolveTeamRuntimeKind(...)` validates one runtime -> `AgentTeamRunManager` picks one backend factory for the whole team run.
- Ownership or boundary observations:
  - Runtime ownership is currently team-wide, not member-owned.
  - Runtime-specific team behavior is encapsulated behind one backend/manager pair per team run (`AutoByteus`, `Codex`, or `Claude`).
  - Restore/reopen paths further reinforce the same assumption by reducing runtime to one governing value.
- Current behavior summary:
  - Mixed-runtime team runs are intentionally unsupported today.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Frontend team config contract | `TeamRunConfig` has one `runtimeKind`; `MemberConfigOverride` has no runtime field | UI/state model is team-runtime-owned today |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Team launch payload builder | Every member payload gets `runtimeKind: teamRuntimeKind` | Launch path normalizes to one runtime before GraphQL |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | History/reopen config reconstruction | Reopen picks a dominant runtime across members and stores it as one team runtime | Frontend reopen cannot faithfully represent mixed-runtime teams today |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Team launch/restore owner | Explicit mixed-runtime rejection; restore derives team runtime from first member metadata | Backend service is authoritative blocker today |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts` | Team domain config | Singular `runtimeKind` at team config level | Core domain still models one runtime owner for the team |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-context.ts` | Active team context | Singular `runtimeKind` and one runtime-context union per team | Runtime context shape is not hybrid/mixed today |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Team backend factory owner | Resolves exactly one backend factory from `config.runtimeKind` | Manager cannot supervise multiple runtime backends in one team run |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/*`, `backends/claude/*`, `backends/autobyteus/*` | Runtime-specific team backends/managers | Each backend assumes the whole team run belongs to its own runtime | Mixed-runtime would need a new hybrid orchestration boundary |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts` | Persisted member metadata | Member runtimeKind is stored per member | Persistence already has some raw data needed for mixed-runtime, but restore logic does not honor it end-to-end |
| `tickets/done/runtime-decoupling-refactor/*` | Prior design record | Per-member runtime override support was intentionally removed from frontend model | Current single-runtime direction is deliberate, not accidental |
| `tickets/in-progress/codex-team-member-runtime-communication/*` | Current team-runtime product/design direction | Single runtime per run is current requirement; mixed-runtime deferred | Any change here is a new phase, not completion of an existing promise |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-19 | Probe | `autobyteus-server-ts/tests/integration/agent-team-execution/team-run-service.integration.test.ts` | Test asserts mixed runtime creation throws `[MIXED_TEAM_RUNTIME_UNSUPPORTED]` | Unsupported behavior is deliberate and regression-tested |
| 2026-04-19 | Probe | Code inspection of restore/reopen paths | Backend restore uses first member runtime; frontend reopen uses dominant runtime | Even persisted member runtime metadata cannot round-trip as mixed-runtime today |

## External / Public Source Findings

- None needed; this was an internal codebase/design assessment.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None
- Required config, feature flags, env vars, or accounts: None
- External repos, samples, or artifacts cloned/downloaded for investigation: None
- Setup commands that materially affected the investigation:
  - `git fetch origin personal`
  - `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-member-runtime-selection codex/agent-team-member-runtime-selection`
- Cleanup notes for temporary investigation-only setup: None

## Findings From Code / Docs / Data / Logs

1. Frontend contract currently enforces a team-level runtime model.
   - Evidence: `TeamRunConfig.runtimeKind` is team-wide; `MemberConfigOverride` no longer includes runtime override support.
2. Launch path intentionally normalizes every member to the selected team runtime.
   - Evidence: `agentTeamRunStore` sets `runtimeKind: teamRuntimeKind` for all `memberConfigs`.
3. Backend explicitly rejects mixed-runtime requests.
   - Evidence: `resolveTeamRuntimeKind(...)` throws `[MIXED_TEAM_RUNTIME_UNSUPPORTED]` when more than one runtime appears.
4. Team orchestration is structurally single-runtime.
   - Evidence: `TeamRunConfig`, `TeamRunContext`, `TeamRun`, and `AgentTeamRunManager` all choose one runtime/backend for the whole team run.
5. Restore and reopen do not preserve mixed-runtime truth.
   - Evidence: backend restore uses the first member’s runtime as governing runtime; frontend reopen reconstructs one dominant runtime.
6. Prior design history shows this was an intentional cleanup decision, not a missing implementation detail.
   - Evidence: runtime-decoupling artifacts explicitly removed legacy per-member runtime-kind compatibility behavior and codex-team-member-runtime-communication artifacts document mixed-runtime as deferred future work.

## Constraints / Dependencies / Compatibility Facts

- The current stable product contract is one runtime per team run.
- Supporting per-member runtime selection would require a new hybrid team-runtime orchestration owner rather than extending the current one-backend-per-team contract with small patches.
- History/reopen must be redesigned together with launch/orchestration; changing only the UI or only the backend would leave the system inconsistent.
- Existing run-history metadata already stores per-member runtime kind, which helps, but it is not sufficient because the governing restore/orchestration boundaries still collapse to one runtime.

## Open Unknowns / Risks

- Coordinator/default-target semantics across runtimes are not yet defined.
- Cross-runtime `send_message_to`, approval flows, and capability gating would need explicit product rules.
- Mixed-runtime teams may significantly increase operational/test complexity relative to the current single-runtime model.
- A partial implementation that only adds UI selectors without hybrid orchestration would create a misleading product surface.

## Notes For Architect Reviewer

- Current answer is clear: **not supported today**.
- Feasibility answer is also clear: **possible, but requires a deliberate Large redesign** centered on replacing single-runtime team ownership with hybrid per-member runtime orchestration and aligned restore/reopen behavior.


## Follow-Up Evaluation (2026-04-20) — Separate Higher-Level Mixed Team Manager

### Additional Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-20 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`, `agent-execution/domain/agent-run.ts`, `agent-execution/domain/agent-run-config.ts` | Evaluate whether a higher-level mixed team manager can delegate member creation to `AgentRunManager` | `AgentRunManager` already creates/restores individual runs across AutoByteus/Codex/Claude; `AgentRun` exposes generic message/approval/interrupt/terminate/event APIs that a mixed team coordinator can consume | No |
| 2026-04-20 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`, `agent-run-event-message-mapper.ts`, `agent-team-execution/domain/team-run-event.ts` | Check whether team streaming can stay mostly generic with a mixed team backend | Team streaming already listens to generic `TeamRunEvent` and re-emits member-tagged agent events (`agent_name`, `agent_id=memberRunId`); this is favorable for a mixed coordinator | No |
| 2026-04-20 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts`, `backends/claude/claude-team-manager.ts` | Compare current runtime-specific team managers to proposed mixed-manager approach | Codex/Claude team managers already act like per-member run coordinators internally (`ensureMemberReady`, member-run map, route to target member), so their internal pattern is close to the desired hybrid shape | No |
| 2026-04-20 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.ts` | Assess AutoByteus fit for the mixed-manager approach | AutoByteus current team backend is native-team-oriented rather than pure per-member-agent-run coordination; mixed mode would likely bypass native team backend and use individual AutoByteus agent runs instead | No |

### Follow-Up Findings

1. The user's idea is technically viable and is likely the cleanest architecture direction for mixed-runtime support: add a separate higher-level `MixedTeamManager` / `MixedTeamRunBackend` rather than teaching the existing Codex/Claude/AutoByteus team backends to manage each other.
2. `AgentRunManager` is already a runtime-neutral factory/registry for individual member runs across supported runtimes, so a mixed team manager can use it as the lower-level execution owner.
3. Codex and Claude team managers already resemble this pattern internally because they lazily create/restore one `AgentRun` per member and route messages/approvals/inter-agent delivery to the chosen member run.
4. The biggest architecture changes are therefore above the existing runtime-specific team backends:
   - team config and launch contract,
   - team runtime domain/context model,
   - team manager/backend selection,
   - restore/history/reopen logic.
5. Team streaming/event mapping appears comparatively reusable because it already consumes generic `TeamRunEvent` payloads and decorates outgoing websocket messages with `memberName`/`memberRunId` rather than assuming one concrete runtime protocol at that boundary.
6. AutoByteus is still the hardest part. Current AutoByteus team backend creates a native team runtime. If mixed mode is implemented via per-member `AgentRunManager`, mixed AutoByteus members would likely run as individual AutoByteus agent runs, not through the existing native `AutoByteus` team backend. That is feasible, but it means mixed mode would not simply "reuse" the current AutoByteus team backend semantics.
7. Net evaluation: this idea avoids large invasive rewrites inside Codex/Claude team backends, but it is still a large cross-cutting change overall because the current top-level team architecture is explicitly single-runtime.

### Design Implication Summary

- Recommended direction if mixed runtime is pursued:
  - keep existing `CodexTeamRunBackend`, `ClaudeTeamRunBackend`, and `AutoByteusTeamRunBackend` for single-runtime teams;
  - add a new parallel `MixedTeamRunBackend` / `MixedTeamManager` for mixed-runtime teams;
  - let the mixed manager own member registry, routing, approvals, inter-agent delivery, status aggregation, and event fan-in;
  - delegate actual member execution to `AgentRunManager` using per-member `AgentRunConfig.runtimeKind`.
- Main shared-layer work remains substantial because `TeamRunConfig`, `TeamRunContext`, `AgentTeamRunManager`, `TeamRunService`, and frontend reopen/history/config paths currently assume one governing runtime per team run.


## Follow-Up Evaluation (2026-04-20) — Elevate AutoByteus Team Orchestration To `autobyteus-server-ts`

### Additional Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-20 | Code | `autobyteus-ts/src/agent-team/agent-team.ts`, `autobyteus-ts/src/agent-team/handlers/inter-agent-message-request-event-handler.ts`, `autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts` | Understand how native AutoByteus team runtime currently owns inter-agent messaging | Library team runtime owns native event queues, node readiness, and inter-agent delivery semantics; `send_message_to` equivalent is embedded in library team orchestration, not server-owned | No |
| 2026-04-20 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Check how server currently adapts library team behavior | Server AutoByteus team backend is mostly an adapter over library-native team runtime and forwards inter-agent delivery via `team.postMessage(...)` with transformed input | No |
| 2026-04-20 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`, `autobyteus-agent-run-backend.ts` | Check whether server already has the primitives to run AutoByteus members as individual `AgentRun`s | Server already supports standalone AutoByteus `AgentRun` creation/restore with generic run APIs and event conversion; this is suitable for a server-owned mixed-team orchestration path | No |

### Follow-Up Findings

1. Elevating mixed-team orchestration into `autobyteus-server-ts` would likely make mixed-runtime support easier, especially for `send_message_to`, because the server is already the place where Codex, Claude, and AutoByteus are normalized behind `AgentRunManager` / `AgentRun` / streaming contracts.
2. The existing library `autobyteus-ts` team runtime is valuable for native AutoByteus-only teams and CLI usage, but it is structurally the wrong ownership layer for cross-runtime team orchestration because it does not know about Codex/Claude server runtime boundaries.
3. Current AutoByteus server team backend is mostly a compatibility adapter over the library team runtime. That adapter shape is useful for preserving existing single-runtime AutoByteus teams, but it does not provide the cleanest foundation for mixed-runtime teams.
4. If mixed-runtime support is the goal, the strongest server-owned direction is:
   - keep library-native `AgentTeam` for pure AutoByteus team execution,
   - add server-owned mixed team orchestration in `autobyteus-server-ts`,
   - run AutoByteus members in mixed teams as standalone AutoByteus `AgentRun`s through `AgentRunManager`,
   - own cross-runtime `send_message_to` at the server mixed-team layer rather than inside the library team runtime.
5. Moving the entire existing AutoByteus team implementation out of the library and into the server is possible, but that is a broader migration than is strictly required for mixed-runtime support. It would affect native AutoByteus-only team behavior and CLI paths, so it should be treated as a separate modernization decision, not assumed mandatory for mixed runtime.
6. Net recommendation: server-own the new mixed-runtime orchestration path first; only fully migrate native AutoByteus team runtime out of the library if the broader product direction is to make the server the single authoritative owner for all team execution modes.


## 2026-04-20 Additional finding — AutoByteus `send_message_to` is hard-wired to native teamContext

- Source: `autobyteus-ts/src/agent/message/send-message-to.ts`
  - `SendMessageTo._execute(...)` reads `context.customData.teamContext`
  - requires `teamContext.teamManager.dispatchInterAgentMessageRequest(...)`
  - returns an error when no `teamContext` is present
- Source: `autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts`
  - recipient-side display name resolution uses `teamContext.teamManager.resolveMemberNameByAgentId(...)`
- Source: `autobyteus-ts/src/agent-team/bootstrap-steps/agent-configuration-preparation-step.ts`
  - native team path injects shared `teamContext` into each agent `initialCustomData`
- Source: `autobyteus-ts/src/agent-team/system-prompt-processor/team-manifest-injector-processor.ts`
  - team manifest prompt injection also depends on `customData.teamContext`
- Source: `autobyteus-ts/src/task-management/tools/task-tools/assign-task-to.ts`
  - task delegation tool also depends on `teamContext.teamManager.dispatchInterAgentMessageRequest(...)`
- Source: `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`
  - standalone AutoByteus `AgentRun` creation currently builds `initialCustomData` without injecting `config.teamContext`
  - therefore standalone AutoByteus agent runs do not automatically receive the native teamContext contract today

Implication:
- A server-owned mixed-team path cannot reuse the current AutoByteus `send_message_to` behavior unchanged unless it either:
  1. injects a compatibility `teamContext/teamManager` facade into standalone AutoByteus agent runs, or
  2. refactors AutoByteus `send_message_to` and related team-dependent features to depend on a smaller runtime-neutral inter-agent transport contract.


## 2026-04-20 Additional finding — `AgentRunBackend` is a general runtime-neutral control surface, but intentionally minimal

- Source: `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend.ts`
  - `AgentRunBackend` defines a shared interface across runtimes:
    - `getContext()`
    - `isActive()`
    - `getPlatformAgentRunId()`
    - `getStatus()`
    - `subscribeToEvents(...)`
    - `postUserMessage(...)`
    - `approveToolInvocation(...)`
    - `interrupt(...)`
    - `terminate()`
- Source: `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`
  - `AgentRun` is a thin wrapper/delegator over `AgentRunBackend`
  - mixed orchestration can therefore treat member runs uniformly at this surface
- Source: `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
  - manager selects runtime-specific backend factories by `runtimeKind`
  - creates one generic `AgentRun` wrapper over the runtime backend
- Source: backend implementations:
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend.ts`
  - all conform to the same minimal lifecycle/message/event contract

Important nuance:
- The abstraction is general at the command surface, but not fully runtime-pure everywhere.
- `postUserMessage(...)` currently takes `AgentInputUserMessage` from `autobyteus-ts`, so the shared input shape is still anchored on an AutoByteus message type.
- `subscribeToEvents(...)` listener type is declared as `(event: unknown) => void`, even though implementations emit normalized `AgentRunEvent` values after runtime-specific conversion.
- Runtime-specific data still exists behind `getContext().runtimeContext`, so the common interface is deliberately a thin common-denominator control boundary, not a full runtime-independent domain model.


## 2026-04-21 Additional finding — team context is central, but current code mixes data context and imperative capability context

### Native AutoByteus library team context
- Source: `autobyteus-ts/src/agent-team/context/agent-team-context.ts`
  - `AgentTeamContext` contains:
    - `teamId`
    - `config` (`AgentTeamConfig`)
    - `state` (`AgentTeamRuntimeState`)
    - getters for `teamManager`, `taskPlan` (via `state`), `statusManager`, `eventStore`, `multiplexer`, `agents`, `coordinatorAgent`
- Source: `autobyteus-ts/src/agent-team/context/agent-team-runtime-state.ts`
  - runtime state includes:
    - `finalAgentConfigs`
    - `teamManager`
    - `taskNotifier`
    - `inputEventQueues`
    - `statusManagerRef`
    - `multiplexerRef`
    - `eventStore`
    - `statusDeriver`
    - `taskPlan`
- Source: `autobyteus-ts/src/agent-team/bootstrap-steps/agent-configuration-preparation-step.ts`
  - during native team bootstrap, each agent receives the same shared `AgentTeamContext` reference via `finalConfig.initialCustomData.teamContext = context`
- Source: `autobyteus-ts/src/agent/factory/agent-factory.ts`
  - `config.initialCustomData` is copied into `AgentRuntimeState.customData`, which is then exposed to tools/processors via `AgentContext.customData`

Implication:
- Native AutoByteus `teamContext` is a large live object reference, not a small DTO.
- It mixes:
  - team metadata/config
  - mutable runtime state
  - imperative routing/services through `teamManager`
  - task-plan access through `state.taskPlan`

### Server team context
- Source: `autobyteus-server-ts/src/agent-team-execution/domain/team-run-context.ts`
  - `TeamRunContext` contains:
    - `runId`
    - `runtimeKind`
    - `coordinatorMemberName`
    - `config`
    - `runtimeContext`
- runtime-specific `runtimeContext` types (`codex-team-run-context.ts`, `claude-team-run-context.ts`, `autobyteus-team-run-context.ts`) primarily carry `memberContexts`, where each member context holds:
  - `memberName`
  - `memberRouteKey`
  - `memberRunId`
  - runtime-specific platform session/thread/native id
  - for Codex/Claude, the member `AgentRunConfig`

Implication:
- Server `TeamRunContext` is mostly a data envelope / directory, not a full imperative team object.
- Codex/Claude team `send_message_to` already follows this split:
  - `teamContext` is used for identity, membership, teammate list, teamRunId
  - the actual delivery capability comes from a separate `InterAgentMessageDeliveryHandler`

### Customization path
- Current native AutoByteus injection gives every agent the same shared `AgentTeamContext` object.
- However the bootstrap step iterates per member, so the code can inject a member-specific wrapper/facade instead of the raw shared context.
- Important implementation detail: `AgentConfig.copy()` deep-clones `initialCustomData`, so any live object with functions should be injected **after** the copy step. The current bootstrap step already does this correctly.

### Architectural takeaway
- For mixed-runtime teams, the clean design is not “one huge mutable teamContext everywhere”.
- The cleaner split is:
  - shared team data / directory context
  - per-member view (`currentMemberName`, `memberRunId`, runtime kind)
  - injected imperative capabilities (`interAgentMessaging`, `memberDirectory`, `taskPlanAccess`) as narrow ports
- AutoByteus native code currently expects the older large-object style; Codex/Claude server code already resembles the smaller-data-plus-capability split.


## Follow-Up Evaluation (2026-04-23) — Narrow mixed-team v1 to communication and inject custom AutoByteus context

### Additional Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-23 | Code | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`, `team-run-service.ts`, `backends/*team-run-backend-factory.ts` | Confirm where a new mixed-team backend would plug in | Team backend selection remains centralized in `AgentTeamRunManager`, and `TeamRunService` is the current place that collapses member runtimes to one runtime kind | No |
| 2026-04-23 | Code | `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`, `autobyteus-ts/src/agent/message/multimodal-message-builder.ts` | Verify what content actually reaches each runtime model on recipient delivery | Codex, Claude, and AutoByteus mixed delivery all depend on `AgentInputUserMessage.content`; metadata alone is not sufficient to expose sender identity to the recipient model | No |
| 2026-04-23 | Code | `autobyteus-ts/src/agent-team/system-prompt-processor/team-manifest-injector-processor.ts`, `autobyteus-ts/src/agent-team/bootstrap-steps/agent-configuration-preparation-step.ts` | Check whether teammate guidance can be driven from a smaller communication context | Native team bootstrap can inject per-agent custom data after config copy, and teammate manifest generation can be redirected to a smaller communication-focused context if introduced | No |
| 2026-04-23 | Code | `autobyteus-ts/src/agent/message/send-message-to.ts`, `autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts`, `autobyteus-ts/src/agent-team/context/team-manager.ts` | Confirm the minimum AutoByteus native communication surfaces that still depend on raw team manager/state | Communication currently needs outbound dispatch and sender-name resolution; native `TeamManager` does not yet expose `resolveMemberNameByAgentId`, so a new communication contract or a small team-manager extension is required | No |

### Follow-Up Findings

1. Narrowing mixed-team v1 to communication materially reduces scope. The critical backend work becomes:
   - selecting a mixed team orchestration backend,
   - creating/routing member `AgentRun`s,
   - delivering canonical inter-agent messages,
   - injecting communication-only team context into AutoByteus mixed members.
2. Task-plan support is the main reason the native AutoByteus `teamContext` stays large. If task-plan tools are explicitly out of scope, the mixed path only needs communication-focused data and capabilities.
3. AutoByteus mixed members can receive a custom context through `initialCustomData`; the hard part is the shape, not the injection mechanism itself.
4. Delivered inter-agent message metadata is not enough by itself, because all three runtimes ultimately feed only `AgentInputUserMessage.content` to the model. The mixed router therefore needs a canonical content formatter that embeds sender identity into model-visible text.
5. The cleanest AutoByteus communication refactor is to give communication consumers one smaller `communicationContext` contract rather than continuing to bind them directly to raw native `teamManager` ownership.
6. Native AutoByteus communication can keep working if native team bootstrap injects a member-scoped wrapper that still exposes the old native context for task-plan tools while also attaching the new communication contract for communication consumers.
7. Keeping the old runtime-specific team managers in the repo is acceptable for now as long as mixed-team routing never delegates through them.

### Design Implication Summary

- Recommended mixed-team v1 scope:
  - backend/server-owned mixed team manager,
  - communication-only support,
  - AutoByteus communication-context injection,
  - no mixed-task-plan support,
  - old single-runtime managers remain but are not called by mixed teams.
- Recommended AutoByteus direction:
  - add a communication-specific subcontext/contract for communication consumers,
  - inject that contract into native and mixed paths,
  - leave task-plan-dependent native surfaces untouched for now.


## Follow-Up Evaluation (2026-04-23) — Architecture review-driven selector/bootstrap/tool-exposure revision

### Additional Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-23 | Doc | `tickets/in-progress/agent-team-member-runtime-selection/design-review-report.md` | Review blocking architecture feedback after round-1 design review | Review failed on three specific gaps: overloaded team selector subject, same-runtime-only Codex/Claude member bootstrap assumptions, and unnamed mixed AutoByteus task-tool suppression owner | No |
| 2026-04-23 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts`, `agent-team-execution/domain/team-run.ts` | Check whether team-boundary runtime naming exists outside `TeamRunConfig` / `TeamRunContext` | Team boundary also exposes `runtimeKind` on `TeamRunBackend` and `TeamRun`, so the selector split must reach those files too | No |
| 2026-04-23 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts`, `backends/claude/claude-team-manager.ts` | Verify how same-runtime team managers currently provision member `AgentRunConfig` | Both managers currently pass the full runtime-specific `TeamRunContext` into standalone member `AgentRunConfig.teamContext`; a clean runtime-neutral member bootstrap contract must replace that boundary | No |
| 2026-04-23 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`, `agent-team-execution/backends/codex/codex-team-thread-bootstrap-strategy.ts`, `agent-execution/backends/claude/backend/claude-session-bootstrapper.ts`, `agent-team-execution/backends/claude/claude-team-session-bootstrap-strategy.ts` | Check exact ownership of Codex/Claude team-member bootstrap wiring | Runtime bootstrappers currently import team-owned strategies that key off same-runtime `teamContext.runtimeKind`; runtime-specific member communication/bootstrap logic belongs more cleanly under runtime backends with a runtime-neutral member-team contract | No |
| 2026-04-23 | Code | `autobyteus-ts/src/tools/registry/tool-registry.ts`, `autobyteus-ts/src/tools/registry/tool-definition.ts`, `autobyteus-ts/src/tools/tool-category.ts`, `autobyteus-ts/src/tools/register-tools.ts` | Find a concrete owner/seam for suppressing mixed-incompatible AutoByteus tools before exposure | Tool definitions already carry category metadata and current task-plan tools are registered through the standard registry, so `AutoByteusAgentRunBackendFactory` can authoritatively filter `ToolCategory.TASK_MANAGEMENT` before creating tool instances | No |

### Follow-Up Findings

1. The team selector split affects more than `TeamRunConfig`, `TeamRunContext`, `TeamRunService`, and `AgentTeamRunManager`; it also affects `TeamRunBackend` and `TeamRun`, which still speak in terms of team `runtimeKind` today.
2. Current same-runtime Codex/Claude team managers build standalone member runs by passing the whole runtime-specific `TeamRunContext` through `AgentRunConfig.teamContext`. That is the wrong subject for mixed-member bootstrap. A separate runtime-neutral **member-team context** is the clean design seam.
3. Current Codex/Claude team bootstrap/send-message helper files sit under `agent-team-execution/backends/*`, but they are actually runtime-specific member communication/bootstrap owners. Moving those boundaries under the runtime backend areas makes the ownership model clearer and removes same-runtime team ownership assumptions from the runtime bootstrap layer.
4. The exact mixed AutoByteus tool-filtering seam is now clear: `AutoByteusAgentRunBackendFactory` is the authoritative runtime bootstrap owner, and `defaultToolRegistry` / `ToolDefinition.category` already provide the data needed to filter `ToolCategory.TASK_MANAGEMENT` before tool instantiation and therefore before tool manifest/schema exposure.

### Design Implication Summary

- Replace the overloaded team `runtimeKind` boundary with a dedicated `TeamBackendKind` (or equivalent team-orchestration selector) that lives only at the team boundary.
- Introduce a runtime-neutral `MemberTeamContext` for standalone team members and route both mixed-team members and same-runtime Codex/Claude members through that bootstrap contract.
- Retire the current team-owned Codex/Claude bootstrap strategy files in favor of runtime-owned team-member communication/bootstrap files under the respective runtime backend folders.
- Make `AutoByteusAgentRunBackendFactory` plus a dedicated mixed-tool policy helper the named owner that strips `ToolCategory.TASK_MANAGEMENT` tools from mixed AutoByteus standalone members before exposure.
