# Application Execution Scope Exact Transition Inventory

## Status

`Design-ready` normative implementation and proof inventory for SR-003. Paths are relative to repository root.

## Production Source Inventory

### Add

| Path | Target responsibility / proof |
| --- | --- |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope-contracts.ts` | exact 8-field scope build input, seven capability contracts, and immutable Agent/Team launch/input result types; imports/references no live run aggregate; outer platform build type remains with its builder |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope.ts` | one concrete graph-local execution owner; exact current graph construction; sole application-boundary live run resolution/input/Team-snapshot projection; frozen capabilities/results; admission, staged unwind, assembly abort, idempotent close |

### Rename / Move

| Current path | Target path | Target responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/application-platform/runtime/application-run-shutdown-coordinator.ts` | `autobyteus-server-ts/src/application-platform/execution/application-execution-shutdown-coordinator.ts` | retain exact idempotent Team-before-Agent sequencing and error aggregation under the scope owner; no old-path alias |

### Modify

| Path | Exact change / capability/input disposition |
| --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | export named `CreateTeamRunFromRootConfigInput`; use it on the unchanged method |
| `autobyteus-server-ts/src/application-orchestration/services/application-published-artifact-relay-service.ts` | export exact binding-reader and delivery-sink ports; constructor consumes those ports; behavior unchanged |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` | replace `AgentRunService`/`TeamRunService` with exact capabilities; consume frozen Agent identity/Team member projection; remove `ConfiguredExecutionNode` imports and local recursive `configuredAgents`; retain display-name/public binding mapping |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | replace Agent/Team/projection/memory concrete dependencies with four exact capabilities; call `postAgentInput`/`postTeamInput`; map immutable dispositions to the exact existing unavailable/rejection messages; retain authorization and target-member selection |
| `autobyteus-server-ts/src/application-orchestration/services/application-bound-run-lifecycle-gateway.ts` | replace Agent/Team service types with capabilities; retain subject dispatch |
| `autobyteus-server-ts/src/application-agent-streaming/services/application-agent-stream-runtime-source.ts` | implement exact streaming contract; require injected managers; delete Agent singleton import/fallback |
| `autobyteus-server-ts/src/application-agent-streaming/services/application-agent-streaming-service.ts` | depend on the streaming contract, not concrete runtime source |
| `autobyteus-server-ts/src/application-agent-streaming/services/application-agent-stream-subscription.ts` | depend on the streaming contract, not concrete runtime source |
| `autobyteus-server-ts/src/application-platform/runtime/create-application-orchestration-services.ts` | remove run factory and all ambient readiness getters; accept prebuilt stores, exact capabilities, named readiness inputs and `SkillService`; construct/return the exact 12-field sibling-owner assembly |
| `autobyteus-server-ts/src/application-platform/runtime/build-application-platform-runtime.ts` | export/use exact `ApplicationPlatformBuildInput`; construct four orchestration stores, derive identity, create scope, create orchestration assembly, abort scope on later pre-publication failure, wire readiness/lifecycle; remove workspace getter |
| `autobyteus-server-ts/src/application-platform/runtime/application-platform-lifecycle-contracts.ts` | remove `agentToolsSessionManager` and `runShutdownCoordinator`; add exact `executionReadiness: Pick<ApplicationExecutionToolReadiness,"assertReady">` and `executionLifecycle: ApplicationExecutionLifecycle` |
| `autobyteus-server-ts/src/application-platform/runtime/application-platform-lifecycle.ts` | call readiness assert during prepare; call `quiesce` first and `close` at current run/session position; preserve every outer stop step and aggregation |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` | resolve/pass all seven named process readiness/workspace inputs in private Studio application assembly; preserve definitions -> MCP -> general -> platform order/unwind |
| `autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts` | resolve/pass the same seven named process inputs; preserve selected set and host/process close order |

### Remove

| Path | Why / replacement |
| --- | --- |
| `autobyteus-server-ts/src/application-platform/runtime/create-application-run-services.ts` | exact graph construction moves into the concrete scope; no wrapper or compatibility export |

### Confirm No Production Change

| Path/area | Reason |
| --- | --- |
| `application-platform-runtime.ts` and `application-platform-runtime-contracts.ts` | four public projections remain byte/type compatible |
| Agent/Team manager and backend implementations | exact existing construction arguments are moved, not behaviorally altered |
| Agent Tools route/catalog/registry | process-owned transport remains one shared runtime |
| public SDK/contracts, packages, DB schemas/migrations | explicitly out of scope / Not Affected |
| `GeneralProcessRunSupervisor` and RootTeamRun task capability files | separate passed owners remain unchanged |

## Durable Test Source Inventory

### Rename / Replace

| Current path | Target path | Exact proof |
| --- | --- | --- |
| `autobyteus-server-ts/tests/unit/application-platform/application-run-services.test.ts` | `autobyteus-server-ts/tests/unit/application-platform/application-execution-scope.test.ts` | no live run on construction; exact manager/session/activation identity reaches all capabilities; Agent/Team create returns deeply frozen copied projections; nested configured-Team flattening excludes task nodes; restore-aware Agent/Team input maps accepted/rejected/not-available and preserves thrown errors; root/member Team target reaches the private `RootTeamRun`; no live aggregate escapes; admission; unwind; process owners remain open |
| `autobyteus-server-ts/tests/unit/application-platform/application-run-shutdown-coordinator.test.ts` | `autobyteus-server-ts/tests/unit/application-platform/application-execution-shutdown-coordinator.test.ts` | exact Team-before-Agent order, continuation, aggregation, idempotence under new path/name |

### Modify

| Path | Exact update / proof |
| --- | --- |
| `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` | update AFB-004 authoritative construction path, exact occurrence counts, platform/scope required-input omission fixtures, process selector rules, consumer import rules, host field/order assertions, old-path absence/new-path presence |
| `autobyteus-server-ts/tests/unit/application-platform/application-platform-runtime-isolation.test.ts` | supply named process inputs; assert one scope per runtime indirectly through identity/projections and no eager run; public four-field runtime unchanged |
| `autobyteus-server-ts/tests/unit/application-platform/application-platform-lifecycle.test.ts` | replace session/shutdown leaves with readiness/lifecycle doubles; prove quiesce first, close at exact position, idempotence/error aggregation |
| `autobyteus-server-ts/tests/unit/application-agent-streaming/application-agent-runtime-source.test.ts` | required exact managers only; prove no fallback path and Agent/Team attachment behavior |
| `autobyteus-server-ts/tests/unit/application-agent-streaming/application-agent-stream-subscription.test.ts` | type fixture against streaming capability; behavior assertions unchanged |
| `autobyteus-server-ts/tests/unit/application-orchestration/application-run-binding-launch-service.test.ts` | provide immutable Agent/Team launch projections (no `RootTeamRun` fixture); retain Agent/preset/configured binding IDs, recursive member addresses, display names, and public runtimeKind fields |
| `autobyteus-server-ts/tests/unit/application-orchestration/application-orchestration-host-service.test.ts` | provide four capability doubles; assert accepted/rejected/not-available disposition maps to unchanged exact errors; retain terminate/artifact/memory outcomes |
| `autobyteus-server-ts/tests/unit/application-orchestration/application-team-input-root-dispatch.test.ts` | replace direct `RootTeamRun` fixture with Team capability double; prove host selects exact member run ID or `null` for root/coordinator and validates unknown members before the capability call; private root dispatch itself is proved in the scope test |
| `autobyteus-server-ts/tests/unit/application-orchestration/application-execution-event-journal-recovery.test.ts` | update lifecycle construction to readiness/lifecycle projections; retain recovery ordering |
| `autobyteus-server-ts/tests/unit/application-orchestration/application-published-artifact-relay-service.test.ts` | use narrow accept-only delivery sink fixture; retain relay command assertions |
| `autobyteus-server-ts/tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts` | mock/provide all named process inputs; preserve definition/MCP/general/platform/listen/recover/close order |
| `autobyteus-server-ts/tests/integration/application-backend/application-engine-test-runtime.ts` | update reusable test runtime constructors to exact capability doubles |
| `autobyteus-server-ts/tests/integration/application-backend/application-agent-communication-ws.integration.test.ts` | update exact streaming/host capability construction; preserve realtime path |
| `autobyteus-server-ts/tests/integration/application-backend/application-context-capabilities.integration.test.ts` | update launch/host capability construction; preserve worker capability launch/input/artifact behavior |
| `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` | update launch/host capability construction; preserve imported package behavior |

No separate persistent architecture fixture files exist: AFB synthetic positive/negative fixtures are generated inside `application-framework-boundaries.test.ts` and are modified there.

## AFB-004 Normative Changes

1. Change the sole nested graph-construction authority from `src/application-platform/runtime/create-application-run-services.ts` to `src/application-platform/execution/application-execution-scope.ts`.
2. Move all 22 current `CONSTRUCTION_OBLIGATIONS`, exact required object/positional inputs, current occurrence count `1`, and the Codex deliberately process-scoped positions 0/2 exemption to the new importer. Tighten the moved list by requiring `workspaceManager` on `PublishedArtifactPublicationService` and positional argument 0 on `ClaudeSessionManager`.
3. Add three defaulting-owner obligations at the same sole construction authority, bringing the nested total to 25:
   - `AgentMemoryLocationService.argument[0].memoryDir`;
   - `RunFileChangeService.argument[0].memoryDir` and `.workspaceManager`;
   - `AgentRunHistoryCatalogService.argument[1].agentDefinitionService` and `.agentRunManager` (its positional memory directory remains compile-time required).
4. Add exact required-input obligations:
   - `ApplicationExecutionScope.create`: all eight `ApplicationExecutionScopeBuildInput` fields; exactly one production occurrence in `build-application-platform-runtime.ts`.
   - `createApplicationOrchestrationServices`: all 26 non-selection fields in `ApplicationOrchestrationAssemblyInput`; exactly one production occurrence in `build-application-platform-runtime.ts`. `selectedApplicationIds` remains the only optional policy field.
   - `buildApplicationPlatformRuntime`: all twelve required non-selection fields; exactly two production occurrences, one in each named host root. `selectedApplicationIds` remains required only for the standalone occurrence and absent for Studio.
5. Synthetic fixtures for every new required property cover complete positive shape plus omitted, explicit `null`, explicit `undefined`, and opaque spread rejection.
6. Add process-selector rules for workspace/model/runtime/provider/Codex getters and `LLMFactory.requireCurrentModelIdentifier`: zero assembly-level occurrences/imports below the two host roots; exact one named resolution path in each host call site as applicable. Reusable backend-local deliberately process-scoped defaults remain exempt only in their existing provider-owned files; application construction must supply every graph-sensitive input listed above.
7. Add current-tree import/shape rules:
   - the three orchestration consumers import scope contracts, not Agent/Team services/managers, projection service, memory service, `AgentRun`, or `RootTeamRun`;
   - `application-execution-scope-contracts.ts` has zero imports/references of the live aggregate identifiers `AgentRun` and `RootTeamRun` in any outward signature; names such as `CreateAgentRunInput` are explicitly not a match;
   - `application-run-binding-launch-service.ts` has no configured-tree node imports or local `configuredAgents` helper and consumes only the immutable Team launch projection;
   - governed application orchestration source has zero calls to `resolveAgentRun`, `resolveActiveTeamRun`, `postUserMessage`, `postMessage`, or `getExecutionTreeSnapshot`;
   - `application-execution-scope.ts` is the sole application-boundary implementation and has exactly one source occurrence/call path for each of those five operations; both Team create commands share that one private projector;
   - scope contract/implementation/consumer shapes contain `postAgentInput`, `postTeamInput`, `ApplicationAgentLaunchResult`, `ApplicationTeamLaunchResult`, and `ApplicationExecutionInputDisposition` with the exact normative fields/discriminants;
   - streaming service/subscription import the streaming contract, not the concrete runtime source;
   - lifecycle contracts contain `executionReadiness` and `executionLifecycle`, not `agentToolsSessionManager`/`runShutdownCoordinator`;
   - orchestration assembly result has the exact 12 fields and none of the removed execution leaves;
   - old run-services and old shutdown paths do not exist; target paths do.
8. Add synthetic type/AST fixtures that fail when either outward Agent/Team capability returns `AgentRun`/`RootTeamRun`, when a consumer imports those aggregates, or when a consumer calls a forbidden live-run method; aligned positive fixtures use only the immutable command/result shapes.
9. Preserve the two named general-process exemptions and all AFB-001/002/003/005 behavior.

## Verification Matrix

| Level | Exact tests/scenarios | Required result |
| --- | --- | --- |
| Source/architecture | architecture boundary test plus `git diff --check`, typecheck | all exact inputs/occurrences/import directions/removals pass |
| Focused unit | all renamed/modified unit files above | contracts, identity, immutable projections/dispositions, no live aggregate escape, restore-aware input, root/member dispatch, admission, unwind, lifecycle, and existing consumer behavior pass |
| Focused integration | four modified integration files above plus `standalone-application-server.integration.test.ts` | worker/WS/launch/artifact and standalone behavior pass |
| Maintained package characterization | `brief-package-team-prompt.integration.test.ts`, `brief-studio-team-config.integration.test.ts`, `standalone-package-portable-defaults.integration.test.ts` | package prompt/config/default behavior unchanged |
| Realistic API/E2E Studio | real Agent and nested Team launch/input, streaming, task delegation, publication/projection, multi-app isolation, reentry, close | same exact scope identity and no cross-app leakage |
| Realistic API/E2E standalone | selected Brief/Socratic launch/input, Agent Tools, streaming, task delegation, publication/projection, restart/recovery, close | current standalone behavior and scope cleanup unchanged |
| General-process separation | public CRUD-created Agent/Team launched through Studio general run path while an application run also exists | shared canonical definitions; non-identical managers/sessions; both close in host order |

API/E2E owns the final durable-coverage validity/edit decision. This matrix states behavioral proof, not permission to preselect downstream test edits beyond the source transitions already forced by TypeScript/constructor changes.
