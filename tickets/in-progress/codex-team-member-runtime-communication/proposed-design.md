# Proposed Design Document

## Design Version

- Current Version: `v10`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v10 | Stage 0 re-entry round 11 (`Unclear`) | Added Codex team workspace-root persistence design boundary so member bindings and team manifest retain workspace-root paths when input only provides `workspaceId`. | Pending next review cycle |
| v9 | Stage 0 re-entry round 10 (`Requirement Gap`) | Added team runtime-kind selector architecture for team config so runtime-specific model catalogs/config schemas load deterministically and launch payload uses uniform team runtime kind. | Pending next review cycle |
| v8 | Stage 0 re-entry round 8 (`Design Impact`) | Refined decoupling design for remaining hotspots: explicit shared-process manager delivery criteria, history panel prop-contract simplification, and final run-history store boundary split aligned to updated `<=500 effective-line` review threshold. | Pending next review cycle |
| v7 | Process-topology requirement gap (`Requirement Gap`) | Added shared-process Codex app-server topology requirement and refactor plan for single process + multi-thread session manager; removed per-run subprocess topology from target architecture. | Pending next review cycle |
| v6 | User rollback to investigation from finding-1 (`Design Impact`) | Refined refactor to-do into concrete module boundaries for history panel container/sections/composables, store read-model/action split, and explicit relay ownership lifecycle wiring. | Pending next review cycle |
| v5 | Additional code-review reopen (`Design Impact`) | Added second-phase boundary split plan for remaining hotspots: `runHistoryStore` decomposition, `WorkspaceAgentRunsTreePanel` decomposition, codex runtime service split (`session`/`tool relay`/`model catalog`), and explicit relay-handler ownership lifecycle extraction. | Pending next review cycle |
| v4 | Stage 0 re-entry (`Requirement Gap`) | Added explicit team-scoped `send_message_to` availability requirement coverage and codex runtime hotspot refactor boundary extraction (`C-021`). | Pending next review cycle |
| v3 | Stage 5.5 re-entry (`Design Impact`) | Refactor boundary update to reduce hotspot file complexity: extracted GraphQL mutation runtime logic into `team-run-mutation-service.ts`; extracted run-history manifest/team-node/team-open logic into dedicated frontend helper modules. | 6/7 |
| v2 | Requirements refinement (`Requirement Gap`) | Added explicit agent-to-agent `send_message_to` runtime design: inter-agent relay boundary, envelope contract, deterministic failure semantics, and decoupling from frontend user ingress. | Pending next review cycle |
| v1 | Initial draft | Defined runtime-aware team-member orchestration architecture for Codex-backed team runs, including persistence, routing, streaming, and continuation boundaries. | 1 |

## Stage 2 Revalidation Notes (After Stage 0 Re-Entry Round 2)

1. Round 2 investigation confirms unresolved implementation seams map directly to existing change inventory entries: resolver runtime-mode split (`C-001`), stream-handler runtime-mode split (`C-008`), and frontend reopen runtime hydration (`C-010`).
2. No architecture direction changes are required; `v2` remains valid and no version bump is needed.
3. Separation-of-concerns boundary remains unchanged: user-ingress API path stays in resolver; agent-to-agent tool path stays in orchestrator + inter-agent relay boundary.

## Stage 2 Re-Entry Notes (After Stage 5.5 Design-Impact Reopen)

1. User review feedback identified unresolved SoC risk in hotspot files (`runHistoryStore.ts`, `agent-team-run.ts`), requiring structural refactor rather than incremental in-place edits.
2. Architecture direction remains unchanged, but boundary extraction is now mandatory: GraphQL resolver stays contract-only while runtime mutation flow moves into dedicated service; frontend run-history store keeps orchestration shell while manifest/team-node/team-open logic moves to focused helper modules.
3. Design version bumped to `v3`; behavior and requirement coverage remain unchanged (`R-001..R-016`), but implementation boundaries are updated for maintainability and reviewability.

## Stage 2 Re-Entry Notes (After Additional Review Round Design-Impact Reopen)

1. Prior refactor reduced hotspots but did not complete separation for frontend run-history interaction boundary and codex relay ownership boundary.
2. `runHistoryStore.ts` and `WorkspaceAgentRunsTreePanel.vue` remain oversized mixed-concern modules; design must split container/orchestration concerns from data/projection/action concerns.
3. Constructor-driven global relay handler ownership in `TeamMemberRuntimeOrchestrator` is now treated as a boundary defect; ownership must move to explicit runtime bootstrap/lifecycle wiring.
4. Design version bumped to `v5`; no behavioral requirement expansion is needed (`R-001..R-017` unchanged).

## Stage 2 Re-Entry Notes (After Finding-1 Rollback To Investigation)

1. User requested explicit return to Stage 0 and stronger design guidance from the panel over-coupling finding.
2. Design now requires concrete sub-module targets (not only high-level split intent) before Stage 3 runtime modeling resumes.
3. Design version bumped to `v6`; behavior requirements remain unchanged (`R-001..R-017`).

## Stage 2 Re-Entry Notes (After Process-Topology Clarification)

1. Investigation confirmed architecture mismatch: current codex runtime path creates one app-server subprocess per run/member session.
2. Requirement `R-018` now mandates one shared long-lived app-server process with per-agent/member thread isolation.
3. Design version bumped to `v7`; runtime process manager extraction is required before runtime-model/review reruns.

## Stage 2 Re-Entry Notes (After Stage 0 Re-Entry Round 8)

1. Round-8 findings confirm design backlog remains architectural: shared-process manager is still pending, history panel coupling now concentrates in container-to-section prop contract, and run-history store remains multi-concern.
2. No requirement-ID expansion is needed; existing `R-018` still anchors process topology while decoupling deltas remain in change inventory.
3. Design version bumped to `v8` with tightened done criteria for `C-022/C-023/C-026` and explicit review-threshold alignment (`<=500 effective lines` for hotspot modules unless justified by clear single concern).

## Stage 2 Re-Entry Notes (After Stage 0 Re-Entry Round 9)

1. Round-9 investigation reconfirmed that the active blocking design issue is `C-023` contract fanout between panel container and workspace section component.
2. Existing composable extractions remain valid; this pass focuses on typed section bindings and container responsibility narrowing without behavior changes.
3. Design version remains `v8`; no architecture-direction or requirement mapping changes are needed.

## Stage 2 Re-Entry Notes (After Stage 0 Re-Entry Round 10)

1. Requirement gap `R-019` adds explicit team runtime selector behavior for team config UX and launch payload normalization.
2. Design now requires runtime-capability-aware team model loading and removal of member-level runtime override controls in team config UI path.
3. Design version bumped to `v9`; this remains within current team runtime boundaries.

## Stage 2 Re-Entry Notes (After Stage 0 Re-Entry Round 11)

1. Investigation confirmed Codex team create path can persist `workspaceRootPath = null` when member payload provides only `workspaceId`.
2. Design now requires deterministic workspace-root resolution at codex member binding creation time (resolve from workspace manager by `workspaceId` when explicit root path is absent), and propagation into team manifest write path.
3. Design version bumped to `v10`; behavior scope expansion is limited to workspace grouping parity for existing team history UX.

## Artifact Basis

- Investigation Notes: `tickets/in-progress/codex-team-member-runtime-communication/investigation-notes.md`
- Requirements: `tickets/in-progress/codex-team-member-runtime-communication/requirements.md`
- Requirements Status: `Refined`

## Summary

Current team execution paths are autobyteus-team-native and team-run-ID scoped, while Codex runtime is run-session scoped and currently optimized for single-agent runs. This design adds a dedicated team-member runtime orchestration boundary so Codex-backed team members become first-class, targetable runtime sessions while preserving existing non-Codex team behavior. In v7, the runtime topology is explicitly shared-process (`one codex app-server process`) plus per-run/member thread isolation. In v2, design explicitly separates:
- user-originated team messaging ingress, and
- agent-originated inter-agent `send_message_to` tool delivery ingress.
In v9, team config runtime kind is elevated to first-class UI/store state so runtime-specific model catalogs/config schemas are loaded deterministically for team/global/member model configuration.
In v10, codex team member bindings must carry resolved workspace-root paths so workspace history grouping stays aligned with selected workspace.

## Goals

- Add member-level runtime kind and runtime binding support for team runs.
- Persist enough member runtime metadata to restore Codex-backed team members deterministically.
- Route team send-message and tool approval actions to targeted member runtime sessions.
- Route inter-agent `send_message_to` envelopes between codex member runtime sessions with deterministic recipient resolution and sender-visible failure semantics.
- Stream Codex member runtime events through team websocket with stable member identity metadata.
- Ensure Codex `send_message_to` tool is exposed only for team-bound member sessions.
- Enforce shared-process Codex app-server lifecycle with multi-thread run/member routing (no per-run subprocess in target state).
- Expose one team runtime selector in team config and load runtime-scoped model/config options from that selection.
- Preserve non-Codex team behavior.
- Keep agent-to-agent tool path decoupled from frontend GraphQL user-message ingress.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove impacted assumptions that all team runtime commands are team-run-ID-scoped implicit autobyteus paths.

## Requirements And Use Cases

| Requirement | Description | Acceptance Criteria | Use Case IDs |
| --- | --- | --- | --- |
| R-001 | Member runtime kind input support. | AC-001 | UC-001 |
| R-002 | Persist member runtime binding metadata. | AC-002 | UC-001, UC-005 |
| R-003 | Deterministic Codex member session initialization. | AC-003 | UC-001 |
| R-004 | Targeted message routing to member runtime session. | AC-004 | UC-002 |
| R-005 | Targeted tool approval routing. | AC-005 | UC-003 |
| R-006 | Stable websocket identity mapping. | AC-006 | UC-004 |
| R-007 | Deterministic continuation/restore. | AC-007 | UC-005 |
| R-008 | Non-Codex no-regression. | AC-008 | UC-006 |
| R-009 | Deterministic routing/session error behavior. | AC-009 | UC-007 |
| R-010 | No legacy compatibility wrappers. | AC-010 | UC-001, UC-002, UC-003, UC-005 |
| R-011 | Support core-library-equivalent `send_message_to` contract in codex team runtime. | AC-011 | UC-008 |
| R-012 | Deterministic recipient resolution for `recipient_name`. | AC-012 | UC-008, UC-010 |
| R-013 | Preserve inter-agent envelope metadata during delivery. | AC-013 | UC-009 |
| R-014 | Recipient runtime normalization into standard reasoning/input pipeline. | AC-014 | UC-009 |
| R-015 | Deterministic sender-visible failure outcomes for inter-agent delivery failures. | AC-015 | UC-010 |
| R-016 | Strict decoupling of inter-agent tool path from frontend user-ingress path. | AC-016 | UC-008, UC-009, UC-010 |
| R-017 | Team-scoped dynamic tool availability for `send_message_to` only when team metadata exists. | AC-017 | UC-011 |
| R-018 | Shared-process runtime topology for Codex app-server with one thread per agent/member run. | AC-018 | UC-012 |
| R-019 | Team runtime selector drives runtime-specific model catalogs/config schemas and uniform runtime launch payload. | AC-019 | UC-015 |
| R-020 | Codex team workspace-root persistence parity when team launch uses `workspaceId` only. | AC-020 | UC-016 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Team GraphQL create/send entrypoints currently call `AgentTeamRunManager` directly. | `src/api/graphql/types/agent-team-run.ts` | Final ownership split between resolver and new team-runtime orchestration layer. |
| Current Naming Conventions | Stable naming uses `teamRunId`, `memberRouteKey`, `memberRunId`; single-agent runtime uses `runtimeKind` + `runtimeReference`. | `src/run-history/utils/team-member-run-id.ts`, `src/run-history/domain/models.ts` | Whether team-member runtime metadata should mirror run-manifest naming exactly. |
| Impacted Modules / Responsibilities | Team run manager currently builds autobyteus-only `AgentConfig`; team stream handler assumes autobyteus team event stream. | `src/agent-team-execution/services/agent-team-run-manager.ts`, `src/services/agent-streaming/agent-team-stream-handler.ts` | Best place to host Codex team member event aggregation. |
| Data / Persistence / External IO | Team manifest does not persist runtime kind/reference per member; strict validation exists. | `src/run-history/domain/team-models.ts`, `src/run-history/store/team-run-manifest-store.ts` | Migration behavior for existing manifests without runtime fields. |

## Current State (As-Is)

- Team member configs do not carry runtime kind.
- Team create/continue flow is autobyteus-team-centric.
- Team ingress routes by `teamRunId`; member runtime session targeting is not first-class.
- Team manifests/history lack member runtime metadata.
- Frontend team config/override model does not include per-member runtime kind.

## Target State (To-Be)

- Team member configs carry runtime kind (`autobyteus` or `codex_app_server`).
- Codex-backed team members are created/restored as deterministic member runtime sessions keyed by persisted `memberRunId`.
- Team send/approval commands route through a dedicated team-runtime command service that resolves target member binding and dispatches to the correct member session.
- Team websocket handling for Codex-backed teams streams member runtime events with `agent_name` and `agent_id=memberRunId`.
- Team manifest/history persist member runtime kind/reference for continuation and frontend resume context.
- Codex runtime uses one shared long-lived app-server process in this node; each agent/member run is isolated by `threadId` within that process.
- Team config selects one runtime kind and all team/global/member model/config selections are validated against that runtime catalog.
- Non-Codex teams continue through current autobyteus team path.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Add runtime-aware team-member orchestration boundary while keeping existing autobyteus team path as a separate clean branch.`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - `complexity`: isolates Codex-member logic from autobyteus team manager internals.
  - `testability`: enables focused unit/e2e tests for routing + restoration without mocking autobyteus team internals.
  - `operability`: keeps runtime ownership in runtime services and avoids hidden implicit session behavior.
  - `evolution cost`: supports future mixed-runtime extension without reopening resolver-level hacks.
- Layering fitness assessment (are current layering and interactions still coherent?): `No`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add`, `Modify`, `Remove`

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Extend `AgentTeamRunManager` directly with Codex member session logic and streaming. | Fewer files changed initially. | Blurs responsibilities; makes autobyteus manager runtime-specific and hard to test. | Rejected | Violates separation-of-concerns and increases patch-on-patch risk. |
| B | Add dedicated team-runtime orchestration/services and keep manager focused on autobyteus team execution. | Clear boundaries, easier validation, lower regression risk for non-codex teams. | More initial structural changes. | Chosen | Better long-term architecture and cleaner runtime abstraction usage. |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `src/api/graphql/types/agent-team-run.ts` | same | Add member runtime kind fields and route create/send through runtime-aware team orchestration service. | GraphQL API, create/send behavior | No legacy field aliases. |
| C-002 | Add | N/A | `src/agent-team-execution/services/team-member-runtime-orchestrator.ts` | Centralize Codex-backed member session create/restore/send/approve/terminate orchestration. | Team execution/runtime boundary | New canonical team-member runtime service. |
| C-003 | Add | N/A | `src/agent-team-execution/services/team-runtime-binding-registry.ts` | Track active team runtime mode + member binding lookup for routing and streaming. | In-memory runtime state | Team-run keyed binding index. |
| C-004 | Modify | `src/runtime-execution/runtime-composition-service.ts`, `src/runtime-execution/runtime-adapter-port.ts`, `src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts` | same | Support deterministic member run-ID session creation/restore for team members. | Runtime composition/adapters | Keep runtime abstraction boundary. |
| C-005 | Modify | `src/run-history/domain/team-models.ts`, `src/run-history/store/team-run-manifest-store.ts`, `src/run-history/services/team-run-history-service.ts` | same | Persist and validate member runtime kind/reference metadata. | Team history persistence | Schema update in-place; no compatibility wrapper mode. |
| C-006 | Modify | `src/run-history/services/team-run-continuation-service.ts` | same | Restore Codex member sessions via orchestrator before routing resumed turn. | Continuation path | Deterministic binding-first restore flow. |
| C-007 | Add | N/A | `src/services/agent-streaming/team-codex-runtime-event-bridge.ts` | Aggregate member Codex runtime events and attach member identity metadata. | Team websocket streaming | Uses existing runtime-event mapper. |
| C-008 | Modify | `src/services/agent-streaming/agent-team-stream-handler.ts` | same | Branch connection/message handling by team runtime mode (autobyteus vs codex-members). | Team websocket behavior | Preserve existing autobyteus path unchanged. |
| C-009 | Modify | `autobyteus-web/types/agent/TeamRunConfig.ts`, `autobyteus-web/components/workspace/config/MemberOverrideItem.vue`, `autobyteus-web/stores/agentTeamRunStore.ts` | same | Align member override boundary to model/config-only behavior and propagate team runtime kind from root config into team create payload. | Frontend team config + launch payload | Runtime kind is team-level, not per-member override. |
| C-010 | Modify | `autobyteus-web/stores/runHistoryStore.ts`, `autobyteus-web/generated/graphql.ts` | same | Parse/preserve member runtime metadata when reopening team runs. | Frontend history/resume behavior | Remove hardcoded `DEFAULT_AGENT_RUNTIME_KIND` assignment for team members. |
| C-011 | Modify | `src/api/graphql/types/team-run-history.ts` | same | Expose member runtime metadata needed by frontend resume parsing. | GraphQL history query | Keep payload explicit. |
| C-012 | Remove | Implicit team-mode fallback assumptions in routing logic that can silently misroute member-targeted codex commands | Replaced by explicit target-member binding resolution and deterministic error path | Eliminate ambiguous legacy behavior. | Runtime/team routing | Enforced by R-009/R-010. |
| C-013 | Add | N/A | `src/runtime-execution/codex-app-server/team-codex-inter-agent-message-relay.ts` | Isolate codex-specific inter-agent envelope transport from orchestration and API layers. | Runtime integration boundary | No frontend/API imports allowed. |
| C-014 | Modify | `src/runtime-execution/runtime-command-ingress-service.ts`, `src/runtime-execution/runtime-adapter-port.ts`, `src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts` | same | Add runtime command for inter-agent envelope delivery keyed by recipient member run ID. | Runtime ingress/adapters | Deterministic error mapping required. |
| C-015 | Modify | `src/agent-team-execution/services/team-member-runtime-orchestrator.ts` | same | Add `relayInterAgentMessage(...)` path with recipient resolution + error classification and keep it isolated from user-ingress GraphQL path. | Team runtime orchestration | Enforces SoC for tool path. |
| C-016 | Add/Modify | `src/api/graphql/types/agent-team-run.ts` | `src/api/graphql/services/team-run-mutation-service.ts` + resolver slimming | Extract team mutation runtime orchestration from resolver into dedicated service to keep resolver at API-boundary concern only. | Backend API boundary | Reduces resolver from ~726 lines to ~212 lines. |
| C-017 | Add/Modify | `autobyteus-web/stores/runHistoryStore.ts` | `autobyteus-web/stores/runHistory{Types,Manifest,TeamHelpers}.ts` + trimmed store | Extract run-history manifest parsing, team-node projection, and team-open reconstruction helpers from store orchestration shell. | Frontend state boundary | Reduces run-history store from ~1464 lines to ~988 lines. |
| C-021 | Add/Modify | `src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` | same + extracted codex helper modules | Reduce codex runtime hotspot complexity by extracting inter-agent relay tool parsing/response helpers and team-scoped dynamic-tool registration helpers into dedicated modules while preserving behavior. | Runtime integration boundary | Keeps team-only tool exposure rule explicit and testable. |
| C-022 | Add/Modify | `autobyteus-web/stores/runHistoryStore.ts` | split into `runHistoryReadModelStore.ts` + `runHistoryActions.ts` + slim orchestration store | Separate read-model/projection concerns from mutation/open/delete/select workflows and workspace side effects. | Frontend state boundary | Target: store shell `<=500` effective lines with one orchestration concern; read-model/action logic extracted to dedicated modules. |
| C-023 | Add/Modify | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | split into container + `WorkspaceTreeSection.vue` + `TeamTreeSection.vue` + action composables + typed section action adapter | Separate rendering tree hierarchy from action handlers (terminate/delete/create workspace), avatar cache logic, and bootstrap load lifecycle while shrinking prop fanout. | Frontend UI boundary | Target: panel shell `<=400` lines and section API reduced to focused typed contracts instead of callback fanout. |
| C-024 | Add/Modify | `src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` | split into `codex-runtime-session-service.ts` + `codex-runtime-approval-relay.ts` + `codex-model-catalog.ts` | Separate session lifecycle from approval/tool relay path and model catalog mapping to reduce cross-surface churn. | Runtime integration boundary | Preserve existing external service contract while moving responsibilities into focused modules. |
| C-025 | Add/Modify | `src/agent-team-execution/services/team-member-runtime-orchestrator.ts` + runtime composition bootstrap | explicit relay-handler registration lifecycle module (`team-codex-relay-wiring.ts`) | Remove constructor side-effect ownership and make relay-handler bind/unbind explicit at composition boundary. | Runtime ownership boundary | Prevent hidden global handler overwrite and support deterministic teardown in tests/runtime restart paths. |
| C-026 | Add/Modify | `src/runtime-execution/codex-app-server/{codex-app-server-client.ts,codex-app-server-runtime-service.ts,codex-thread-history-reader.ts}` | add `codex-app-server-process-manager.ts` and refactor services to shared transport/client lifecycle | Replace per-run subprocess spawning with one shared app-server process and per-thread session routing. | Runtime process topology | Must preserve deterministic error/recovery semantics for active runs after process failure/restart and remove ad-hoc per-read ephemeral process spawn. |
| C-027 | Add/Modify | `autobyteus-web/types/agent/TeamRunConfig.ts`, `autobyteus-web/components/workspace/config/{TeamRunConfigForm.vue,MemberOverrideItem.vue}`, `autobyteus-web/stores/{agentTeamRunStore.ts,agentTeamContextsStore.ts}` | promote runtime kind to team-level config and runtime-capability-aware model loading | Align team UI/runtime payload with backend single-runtime rule while enabling Codex model + per-member thinking-config selection when Codex runtime is selected. | Frontend team config boundary | Remove member runtime selector from team override path and keep overrides scoped to model/config/auto-execute. |
| C-028 | Modify | `src/agent-team-execution/services/team-member-runtime-orchestrator.ts`, `src/api/graphql/services/team-run-mutation-service.ts` | ensure codex member bindings always persist resolved workspace root path (explicit path or resolved from workspaceId) before team manifest/history write | Prevent team-history workspace grouping drift (`workspaceRootPath=null`) for Codex team runs launched with `workspaceId` only. | Backend team runtime persistence boundary | Must preserve existing explicit `workspaceRootPath` precedence and non-codex behavior. |

## v9 Refactor To-Do Breakdown (Implementation-Ready Boundaries)

| Change ID | Concrete Deliverables | Done Criteria |
| --- | --- | --- |
| C-022 | Add `runHistoryReadModelStore.ts` (query/projection/getters only). Add `runHistoryActions.ts` (open/delete/select/workspace action flows). Keep `runHistoryStore.ts` as thin facade wiring existing API surface. | `runHistoryStore.ts` keeps orchestration only, remains `<=500` effective lines, and avoids embedding projection/mutation details; tests split by read-model vs action behavior. |
| C-023 | Split `WorkspaceAgentRunsTreePanel.vue` into: container shell, `WorkspaceTreeSection.vue`, `TeamTreeSection.vue`, `useRunHistoryPanelActions.ts`, `useRunHistoryAvatarState.ts`, and a typed section action adapter object. | Container owns section composition + emits + minimal bootstrap; section contract avoids high callback fanout and is independently testable. |
| C-024 | Extract codex runtime service internals into `codex-runtime-session-service.ts`, `codex-runtime-approval-relay.ts`, and `codex-model-catalog.ts` with stable facade methods retained in runtime service entrypoint. | `codex-app-server-runtime-service.ts` becomes orchestration facade; session/relay/model logic each isolated in dedicated module with focused unit coverage. |
| C-025 | Add explicit relay lifecycle module `team-codex-relay-wiring.ts`; remove constructor-side `setInterAgentRelayHandler(...)` mutation from orchestrator. | Handler registration and teardown happen in one composition bootstrap path; no global runtime handler mutation during orchestrator instantiation. |
| C-026 | Add `codex-app-server-process-manager.ts` with singleton process ownership, health/restart handling, and request multiplexing for all codex run threads (including history-reader operations). | Process count remains one per server node during concurrent codex runs; each run/member maintains distinct `threadId` identity and routing; no per-read helper subprocesses remain. |
| C-027 | Add team runtime selector in team config form, runtime-capability gating, runtime-scoped model loading, and payload normalization to selected team runtime for all members. | Team UI can select Codex runtime and Codex models/config; runtime change invalidates incompatible member model/config overrides; launch payload always sends one uniform runtime kind. |
| C-028 | Resolve member binding workspace root from `workspaceId` when explicit root is absent and persist it into codex member bindings/team manifest paths. | `listTeamRunHistory` returns non-null workspace-root paths for codex team rows/member rows when workspace was selected by ID; team rows render under selected workspace bucket. |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| GraphQL Team Resolver | API contract and request normalization | input parsing, response mapping | runtime session lifecycle internals | Delegates to orchestration services. |
| Team Member Runtime Orchestrator | Runtime-aware team-member execution for codex path | create/restore/send/approve member sessions, binding lifecycle | websocket transport serialization | Uses runtime composition/ingress only. |
| Inter-Agent Relay Boundary (Codex) | Codex-specific inter-agent envelope transport | recipient-session envelope dispatch and runtime error normalization | GraphQL/front-end payload interpretation | Invoked only via orchestrator tool path. |
| Team Runtime Binding Registry | Team->member runtime routing index | active team runtime mode + member binding lookup | persistence/history IO | In-memory active state only. |
| Team History/Continuation | Durable team-member binding and restore metadata | manifest read/write/validation | live websocket dispatch | Source of truth for continuation. |
| Team Stream Handler + Codex Event Bridge | Team websocket command + event routing | codex member event aggregation, autobyteus passthrough | business rule persistence decisions | Keeps frontend protocol stable. |
| Frontend Team Runtime Config Boundary | Team runtime selection and runtime-scoped model/config loading | team-level runtime kind + capability gating + runtime-scoped provider/schema selection | backend runtime lifecycle/orchestration logic | Keeps team UI behavior aligned with backend uniform-runtime constraint. |
| Codex Relay Wiring Lifecycle | Runtime ownership wiring for inter-agent relay handler | explicit bind/unbind ownership at composition/bootstrap | business routing logic | Prevents hidden constructor-level global handler mutation. |
| Codex App-Server Process Manager | Shared runtime transport/process ownership | one long-lived codex app-server process, health state, request multiplexing | team/business routing policies | Enforces `R-018` topology without per-run subprocess churn. |
| Frontend Run-History Read Model | Run/team history projection and query-backed state | tree projection/read model/cache shape | destructive actions/workspace mutation side effects | Keeps derived tree concerns isolated from mutation flows. |
| Frontend History Panel Container | UI composition and event routing | section composition, event emit surface | direct backend IO and large inline mutation flows | Delegates actions to composables/services. |
| Frontend Team Config/History | Runtime selection input and resume projection consumption | member runtime override + manifest parsing | backend session lifecycle logic | Keeps UI data explicit. |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `src/api/graphql/types/agent-team-run.ts` | Modify | API | Team create/send contract updates and delegation to orchestrator | `createAgentTeamRun`, `sendMessageToTeam` | Team GraphQL input/output | Team orchestrator, history service |
| `src/agent-team-execution/services/team-member-runtime-orchestrator.ts` | Add | Application/runtime orchestration | Codex-member session lifecycle and target routing | `createTeam`, `restoreTeam`, `sendToMember`, `approveForMember` | normalized team/member runtime commands | runtime composition/ingress, binding registry |
| `src/runtime-execution/codex-app-server/team-codex-inter-agent-message-relay.ts` | Add | Runtime integration | Codex inter-agent envelope transport | `deliverInterAgentMessage` | sender/recipient envelope -> codex runtime dispatch | codex runtime service, runtime adapter port |
| `src/agent-team-execution/services/team-runtime-binding-registry.ts` | Add | Application state | Active team runtime mode and member-binding lookup | `upsertTeamBindings`, `getBinding`, `getTeamMode`, `removeTeam` | team/member lookup records | none (in-memory) |
| `src/services/agent-streaming/team-codex-runtime-event-bridge.ts` | Add | Streaming | member runtime event fan-in and identity tagging | `subscribeTeam`, `unsubscribeTeam` | codex runtime events -> `ServerMessage` stream | codex runtime service, runtime-event mapper |
| `src/services/agent-streaming/agent-team-stream-handler.ts` | Modify | Streaming | Runtime-mode-aware team websocket command/event handling | `connect`, `handleMessage`, `disconnect` | websocket messages | team manager, binding registry, event bridge |
| `src/run-history/domain/team-models.ts` | Modify | Domain | Team member runtime metadata shape | type updates | in-memory manifest model | N/A |
| `src/run-history/store/team-run-manifest-store.ts` | Modify | Infra/persistence | Team manifest validation/normalization for runtime fields | `readManifest`, `writeManifest` | JSON manifest IO | filesystem |
| `src/run-history/services/team-run-continuation-service.ts` | Modify | Application | runtime-aware team restore and continued send path | `continueTeamRun` | continue input/output | orchestrator, history service |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Modify | Frontend model | member runtime override contract | type definitions | UI config object | N/A |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | Modify | Frontend UI | Per-member model/config override under selected team runtime | component props/events | user-selected override payload | runtime-scoped provider/schema selection from team config |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Modify | Frontend state | Include member runtime kind in create payload | `sendMessageToFocusedMember` | GraphQL mutation variables | team/run config stores |
| `autobyteus-web/stores/runHistoryStore.ts` | Modify | Frontend state | Parse persisted member runtime metadata on reopen | `openTeamMemberRun` | manifest->member config mapping | team history GraphQL |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` + `autobyteus-web/types/agent/TeamRunConfig.ts` | Modify | Frontend UI/model | Team runtime selector and runtime-capability-aware model loading | component props/events + config type | runtime change -> provider reload + override sanitization | runtime capabilities store, llm provider store |
| `autobyteus-web/stores/runHistoryReadModelStore.ts` + `runHistoryActions.ts` | Add | Frontend state | Read-model/projection ownership vs mutation/open/delete ownership split | `getTreeNodes`, `getTeamNodes`, `openTeamMemberRun`, `deleteRun`, `deleteTeamRun` | query payloads + UI action commands | apollo client + existing helper modules |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` + section components/composables | Modify/Add | Frontend UI | Render tree composition only; actions and avatar fallback logic extracted | component props/events only | row selection/action dispatch events | run-history action composables |
| `src/runtime-execution/codex-app-server/codex-runtime-session-service.ts` + `codex-runtime-approval-relay.ts` + `codex-model-catalog.ts` | Add | Runtime integration | Session lifecycle, relay approval handling, model-list mapping split from monolith | `createRunSession`, `restoreRunSession`, `sendTurn`, relay handlers, model list mapping | codex rpc inputs/outputs | codex client + helper modules |
| `src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts` | Add | Runtime integration | Shared codex app-server process lifecycle and request multiplexing for all codex run threads in this node. | `ensureStarted`, `getClient`, `markUnhealthy`, `close` | rpc requests/responses, process health state | codex launch config, codex app-server client |
| `src/runtime-execution/codex-app-server/team-codex-relay-wiring.ts` | Add | Runtime composition | Explicit lifecycle bind/unbind of inter-agent relay handler | `bindRelay`, `unbindRelay` | orchestrator/runtime service coupling API | runtime composition bootstrap + orchestrator |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: runtime selection remains in config components/stores; websocket parsing remains in streaming service.
- Non-UI scope: team runtime orchestration is separated from resolver, persistence, and streaming transport.
- Integration/infrastructure scope: manifest storage remains strict schema boundary; runtime adapters stay under runtime-execution.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | N/A | `team-member-runtime-orchestrator.ts` | Explicitly states ownership of member runtime orchestration. | Avoids overloading `AgentTeamRunManager`. |
| File | N/A | `team-runtime-binding-registry.ts` | Communicates in-memory routing index role clearly. | Distinct from persisted manifest store. |
| File | N/A | `team-codex-runtime-event-bridge.ts` | Makes bridge role explicit and codex-scoped. | Keeps generic mapper separate. |
| API field | none | `runtimeKind` on team member config | Aligns with existing single-agent runtime terminology. | No aliasing required. |
| API field | none | `runtimeReference` on team member binding | Aligns with run manifest naming and continuation semantics. | Optional for non-codex. |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `AgentTeamRunManager` | autobyteus-team creation and lifecycle | Yes (for autobyteus path) | N/A | C-002 |
| `agent-team-run.ts` resolver | API contract shell + delegation only | Yes | N/A | C-016 |
| `runHistoryStore.ts` orchestration shell | store orchestration + helper delegation + action side effects | No | Split | C-022 |
| `WorkspaceAgentRunsTreePanel.vue` | tree rendering + action handling + bootstrap fetch lifecycle | No | Split | C-023 |
| `WorkspaceHistoryWorkspaceSection.vue` | section render plus broad callback contract surface | No | Split | C-023 |
| `TeamMemberRuntimeOrchestrator` | member runtime orchestration + relay-handler global ownership wiring | No | Move | C-025 |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Team runtime routing | High | Add dedicated orchestrator + binding registry instead of embedding codex logic into manager/handler | Change | Avoids tight coupling and duplicated branching. |
| Team websocket codex events | Medium | Separate codex event bridge from generic handler | Change | Keeps handler readable and testable. |
| Frontend team config | Medium | Extend member override model rather than ad-hoc payload mutation | Change | Ensures explicit typed config flow. |
| Frontend run-history panel | High | Split tree rendering shell from destructive-action/workspace-create/bootstrap side-effect handlers | Change | Reduces UI container coupling and makes state-action tests focused. |
| Codex relay ownership wiring | High | Move relay-handler bind/unbind to runtime composition lifecycle instead of orchestrator constructor side effect | Change | Prevents hidden global handler overwrite. |

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Route codex team sends by forcing `runId=teamRunId` into codex adapter | High | Resolve member binding first and dispatch to member `runId=memberRunId` session | Structural fix | Prevents wrong-session routing ambiguity. |
| Keep frontend team reopen `runtimeKind=autobyteus` hardcoded | High | Parse runtime metadata from manifest for each member | Structural fix | Required for codex continuation correctness. |
| Add conditional compatibility wrappers for missing runtime metadata | Medium | Require manifest schema update and strict validation for impacted path | Structural fix | Matches no-legacy policy. |
| Route agent-to-agent tool messaging through `sendMessageToTeam` GraphQL path | High | Keep tool path in orchestrator + inter-agent relay boundary with dedicated envelope contract | Structural fix | Preserves separation of concerns and runtime decoupling. |
| Keep relay handler ownership in orchestrator constructor | High | Register/unregister handler in explicit runtime composition lifecycle module | Structural fix | Prevents hidden global mutation and ownership ambiguity. |
| Keep run-history view + mutation + bootstrap in single panel/store modules | High | Split read-model, action service/composable, and panel sections by concern | Structural fix | Reduces file hotspots and cross-reference churn. |
| Spawn one codex app-server subprocess per member run/session | High | Use shared process manager with one long-lived codex app-server process and thread-based isolation | Structural fix | Aligns runtime topology with `R-018` and avoids process explosion. |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `team-member-runtime-orchestrator.ts` | runtime composition/ingress, team history, binding registry | resolver, continuation, stream handler | Medium | Keep narrow interface and avoid importing websocket layer. |
| `team-codex-runtime-event-bridge.ts` | codex runtime service, event mapper | team stream handler | Low | One-way dependency into bridge only. |
| `runHistoryStore.ts` (web) | GraphQL team resume payload | team context hydration | Medium | Centralize manifest parsing and runtime metadata normalization in one parser function. |
| `runHistoryReadModelStore.ts` / `runHistoryActions.ts` (web) | GraphQL query/mutation + helper projections | history panel container/sections | Low | Keep read-model pure and route side effects through action layer only. |
| `WorkspaceAgentRunsTreePanel.vue` (container) | read-model store + action composables | panel section components | Low | Container emits events only; row sections remain presentational. |
| `team-codex-relay-wiring.ts` | runtime composition bootstrap + orchestrator + runtime service | runtime startup/shutdown lifecycle | Medium | Single ownership point for bind/unbind; forbid constructor side-effect binding. |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules: `GraphQL/API -> Application Services -> Runtime/Persistence Adapters` and `Streaming Handler -> Streaming Bridge -> Runtime Service`.
- Temporary boundary violations and cleanup deadline: none planned.

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Implicit team command routing assumptions that treat `teamRunId` as codex member run session id | Replace with explicit member binding resolution path; remove ambiguous fallback branch | No dual-path compatibility fallback retained for impacted codex team routing path | Unit tests for invalid target/member binding + routing correctness |
| Frontend hardcoded team member runtime default (`DEFAULT_AGENT_RUNTIME_KIND`) during reopen | Replace with parsed member runtime metadata from manifest | Prevents hidden autobyteus default drift for codex runs | Store tests for reopen mapping |

## Data Models (If Needed)

- Extend `TeamRunMemberBinding` with:
  - `runtimeKind: RuntimeKind`
  - `runtimeReference: RuntimeRunReference | null`
- Extend GraphQL team member config input with:
  - `runtimeKind?: string | null`
- Extend frontend team run config with:
  - `runtimeKind: AgentRuntimeKind`
- Keep frontend member overrides scoped to:
  - `llmModelIdentifier`, `llmConfig`, `autoExecuteTools`

## Error Handling And Edge Cases

- Unknown target member in codex team routing: reject with explicit deterministic code (`TEAM_MEMBER_NOT_FOUND` or equivalent).
- Missing runtime binding for target member: reject with explicit deterministic code.
- Missing active member runtime session for active codex team: reject and require restore path.
- Continuation restore partial failure (one member fails): fail continuation and terminate partially restored member sessions.
- Non-codex team path remains unchanged and bypasses codex-member orchestration service.
- `send_message_to` recipient unknown: deterministic tool-visible error to sender agent (`RECIPIENT_NOT_FOUND` equivalent).
- `send_message_to` recipient start/session failure: deterministic tool-visible error to sender agent (`RECIPIENT_UNAVAILABLE` equivalent).
- `send_message_to` delivery success: recipient envelope includes sender identity + message type + content and is normalized through recipient input pipeline.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | R-001,R-002,R-003 | Team create with member runtime kind and bindings | Yes | N/A | Yes | UC-001 |
| UC-002 | R-004 | Targeted user turn routing to codex member runtime session | Yes | Yes | Yes | UC-002 |
| UC-003 | R-005 | Targeted tool approval/denial routing | Yes | N/A | Yes | UC-003 |
| UC-004 | R-006 | Team websocket member identity mapping for codex events | Yes | N/A | Yes | UC-004 |
| UC-005 | R-002,R-007 | Persisted team continuation/restore of member sessions | Yes | Yes | Yes | UC-005 |
| UC-006 | R-008 | Non-codex team behavior preservation | Yes | N/A | Yes | UC-006 |
| UC-007 | R-009 | Deterministic invalid-target/missing-binding errors | Yes | N/A | Yes | UC-007 |
| UC-008 | R-011,R-012,R-016 | Agent-to-agent `send_message_to` dispatch and recipient resolution | Yes | N/A | Yes | UC-008 |
| UC-009 | R-013,R-014 | Recipient envelope handling and input-pipeline normalization | Yes | N/A | Yes | UC-009 |
| UC-010 | R-012,R-015,R-016 | Sender-visible deterministic failures for inter-agent delivery | Yes | N/A | Yes | UC-010 |
| UC-011 | R-017 | Team-scoped dynamic tool exposure for `send_message_to` | Yes | N/A | Yes | UC-011 |
| UC-012 | R-018 | Shared-process topology with per-agent/member thread routing | Yes | N/A | Yes | UC-012 |
| UC-015 | R-019 | Team runtime selector with runtime-scoped model/config loading and uniform member runtime payload | Yes | N/A | Yes | UC-015 |
| UC-016 | R-020 | Codex team history grouping preserves selected workspace when launch payload provides `workspaceId` only | Yes | N/A | Yes | UC-016 |

## Performance / Security Considerations

- Codex team event bridge must avoid per-event deep copies; attach identity metadata minimally.
- Binding lookup must be O(1) by normalized `memberRouteKey` and fallback by member name.
- Do not log raw sensitive payloads in routing errors.

## Migration / Rollout (If Needed)

- This ticket updates team manifest schema for member runtime metadata.
- Existing historical manifests without runtime fields are out-of-scope for compatibility wrappers in impacted codex path (no-legacy policy); ticket execution assumes newly created/updated manifests for codex team-member runtime flows.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| C-001 | T-001,T-002 | GraphQL contract + resolver unit/e2e | Planned |
| C-002,C-003,C-004 | T-003,T-004,T-005 | Runtime orchestration unit/integration | Planned |
| C-005,C-006,C-011 | T-006,T-007 | History/continuation e2e | Planned |
| C-007,C-008 | T-008,T-009 | Team websocket unit/integration | Planned |
| C-009,C-010 | T-010,T-011 | Frontend store/component tests | Planned |
| C-012 | T-012 | Routing error-path tests | Planned |
| C-013,C-014,C-015 | T-013,T-014,T-015 | Inter-agent relay integration + tool-failure semantics tests | Planned |
| C-026 | T-016,T-017 | Shared-process runtime manager unit/integration + concurrent team-member E2E process-count assertion | Planned |
| C-027 | T-022 | Team runtime selector component/store tests + launch payload runtime-kind assertions | Planned |
| C-028 | T-023 | Backend unit/integration tests validating codex member binding workspace-root resolution from workspaceId path | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`) | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-02-26 | Initial draft | N/A | N/A | No | Yes | Open for review |
| 2026-02-26 | Requirement clarification (agent-to-agent semantics) | Requirement Gap | Inter-agent tool path contract was underspecified | Yes | Yes (`v2`) | Ready for next review cycle |
| 2026-02-26 | Stage 0 re-entry investigation refresh (`T-017`) | Unclear | No new architectural smell beyond already-scoped implementation-edge ownership mapping | No | No (v2 revalidated) | Ready for runtime-model revalidation |
| 2026-02-26 | Stage 0 re-entry round 10 (`T-115`) | Requirement Gap | Team config runtime selector missing; runtime-scoped model/config behavior was implicit and under-specified | Yes | Yes (`v9`) | Ready for runtime-model revalidation |
| 2026-02-27 | Stage 0 re-entry round 11 (`T-125`) | Unclear | Codex team member bindings persisted null workspace roots when launch used `workspaceId`, breaking workspace-grouped history visibility | Yes | Yes (`v10`) | Ready for runtime-model revalidation |

## Open Questions

- Is deterministic member `runId` creation best expressed via new `createAgentRunWithId` runtime-composition API, or by dedicated team-member runtime creation path in runtime service?
- Should Stage 1 inter-agent delivery enforce recipient auto-start (core parity) or fail-fast when recipient session is unavailable?
- Should `message_type` remain open string in Stage 1 or be constrained enum in runtime contract?
