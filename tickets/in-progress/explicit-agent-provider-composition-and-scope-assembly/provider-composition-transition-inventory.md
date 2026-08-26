# Provider Composition Transition Inventory

Status: Normative cumulative implementation and proof supplement. SR-006 starts from current HEAD `3806ca36e46495ba28d5957a330a502eb22bd973`, where the accepted SR-005 Host/Authority/provider/kernel/Mixed Team transition is already implemented. “Retain” rows are current accepted source, not new SR-006 edits; “Add” and “Modify” rows are the exact remaining transition for CRR-003 CR-002–CR-004.

## Retain — Accepted Production Additions At Current HEAD

| Path | Exact Responsibility |
| --- | --- |
| `autobyteus-server-ts/src/compositions/create-process-agent-provider-factory-builder.ts` | accepted: bind the host workspace identity plus eighteen named process leaves into one fixed provider builder |
| `autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts` | accepted: exact provider construction policy and fresh execution factory set |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-authority.ts` | accepted: issuer, releaser, issued resource, Authority/assembly contracts |
| `autobyteus-server-ts/src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.ts` | accepted: one execution-family trusted session owner |

## Add — SR-006 Production

| Path | Exact Responsibility |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/input/agent-run-provider-input-normalizer.ts` | copy one claimed backend dispatch and resolve supported context locators through one explicitly rooted provider-neutral resolver immediately before backend invocation |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-execution-identity-capabilities.ts` | validate/freeze the exact Agent allocator plus one task-Team factory derived from that same allocator; no lifecycle/lookup |
| `autobyteus-server-ts/src/context-files/domain/context-file-path-environment.ts` | validate/freeze the exact app-data root + absolute HTTP(S) configured base URL shared across execution/context composition; no AppConfig import |

## Retain — Accepted Rename / Move At Current HEAD

| Pre-IR-001 Path | Current Target Path | Reason |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-runtime.ts` | `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-host.ts` | existing ticket clean rename to process endpoint/catalog/registry/dispatcher owner |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tools-mcp-runtime.test.ts` | `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tools-mcp-host.test.ts` | align test with owner |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/application-agent-tool-mcp-session-scope.test.ts` | `autobyteus-server-ts/tests/unit/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.test.ts` | cover unified trusted Authority |

## Modify — Production

| Path | Exact Change |
| --- | --- |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` | preserve one Host/builder/workspace identity and two execution owners; snapshot AppConfig once and pass explicit memory/context path values to general/application assembly; preserve unwind/close order |
| `autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts` | same explicit composition for standalone, without a mode-switch builder |
| `autobyteus-server-ts/src/application-platform/runtime/build-application-platform-runtime.ts` | pass required frozen `{appDataDir, baseUrl}` beside existing `memoryDir`; preserve one scope and construction abort |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope-contracts.ts` | add required `contextFilePathEnvironment`; preserve seven outward capabilities exactly |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts` | revise accepted K0–K8 assembly with stored Team reader, context normalizer, complete Agent graph, task identity, Team graph, transfer/unwind |
| `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts` | replace broad AppConfig input with required `memoryDir` + context-path environment; construct exact context normalizer, memory recorder/resource manager/activation registry, complete Agent manager, allocator/task capability, required Team manager, and existing Mixed callback from general identities; no unrelated singleton initialization |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | require all three factories, activation registry, memory recorder, provider-input normalizer, and run-session releaser; remove every construction/default/getter branch for those fields; inject normalizer into every run; preserve failure revocation |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | require normalizer; normalize only a copied claimed dispatch immediately before backend invocation; retain original admission/observer/memory/correlation behavior |
| `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` | remove local-path resolver import/field/REST-locator policy; retain provider workspace-relative/absolute/URL validation and prompt/media behavior over the copied normalized message |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts` | remove local resolver construction/options; retain text/image/file/data/remote formatting for already-normalized input |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-state-input.ts` | remove `contextFileLocalPathResolver`; retain exact issuer and current session dependencies |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | remove resolver field/default and format already-normalized input; preserve lazy MCP/query/retry lifecycle |
| `autobyteus-server-ts/src/context-files/store/context-file-layout.ts` | accept required `{appDataDir, memoryDir}` rather than reading AppConfig; preserve safe draft/final path rules |
| `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` | accept one required named input containing layout, owner resolver, and base URL; remove AppConfig/default constructor reads; preserve same-origin/loopback/route/file-existence semantics |
| `autobyteus-server-ts/src/context-files/services/context-file-owner-resolver.ts` | require named async/sync Team-location read capability; remove default active/process Team-location construction |
| `autobyteus-server-ts/src/context-files/services/context-file-read-service.ts` | require the exact owner resolver; remove default construction; preserve draft/final reads and deletion |
| `autobyteus-server-ts/src/context-files/services/context-file-finalization-service.ts` | require the exact owner resolver; remove default construction; preserve atomic move/copy, dedupe, locator, and cleanup behavior |
| `autobyteus-server-ts/src/run-history/services/team-run-execution-tree-location-service.ts` | require non-empty `memoryDir` at `createStoredTeamRunExecutionTreeLocationService`; preserve broader unrelated service construction |
| `autobyteus-server-ts/src/api/rest/context-files.ts` | snapshot current AppConfig roots once; construct one explicit layout and one stored-only owner resolver; pass the same resolver to finalization/read; preserve REST behavior |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | require non-empty `memoryDir`, required Mixed backend factory, and `taskExecutionIdentity`; remove AppConfig memory-root fallback; pass the same identity into every fresh/restored root; preserve lookup-only process access |
| `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts` | require/carry task identity into its task service; preserve sole task lifecycle/state/persistence/event ownership |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service-contract.ts` | replace optional allocator/factory fields with one required `taskExecutionIdentity` |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | consume the required pair; remove global allocator/default Team-factory selection |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-run-identity-factory.ts` | require Agent allocator; retain optional explicit token generator only for deterministic testing; remove global allocator import/default |

## Retain / Verify — Accepted Production Files With No SR-006 Source Edit

| Path | Preserved Responsibility / Proof |
| --- | --- |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope.ts` | complete private kernel and existing capability/lifecycle delegation |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts` | narrow releaser and exact attach/detach behavior |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | explicit builder collaborator mapping |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | exact issuer timing/config adaptation |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts` | descriptor-to-Codex config adaptation |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts` | issuer/session ownership; no context-owner construction |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts` | issuer-only issue/cache behavior |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.ts` | descriptor-to-Claude config adaptation |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | required execution-family releaser and exact dependencies |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | SR-005 required releaser + required manager callback; no default/cache/getter |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | exact member run releaser/graph-local manager behavior |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-configured-member-registry.ts` | exact propagation |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.ts` | exact propagation |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | Host/Authority-internal mechanics and absent process releaser getter |

## Retain — Accepted Removals At Current HEAD

| Item | Exact Replacement |
| --- | --- |
| prior application session scope/scoped session manager and old MCP Runtime symbols | Host + scoped Authority + narrow ports; no alias |
| scope partial kernel/tuple/eight constructor args | complete private kernel + fixed abort |
| direct supported-root provider construction/defaults | fixed provider builder |
| broad MCP manager imports, process releaser getter, cached/default Mixed factory, optional callback, default Mixed manager, lazy/default Team manager | accepted exact Authority releaser/callback/factory/manager chain |

## Remove — SR-006 Paths / Symbols / Branches

| Item | Exact Replacement |
| --- | --- |
| `AgentRunManager` optional factories, activation registry, run-file/artifact sidecars, memory-recorder defaults/getters | exact seven-field input from each root |
| provider-local `ContextFileLocalPathResolver` use in AutoByteus/Codex/Claude | AgentRun provider-input normalizer |
| default/no-argument `ContextFileLayout` and `ContextFileLocalPathResolver` construction | explicit roots/origin at caller |
| default/no-argument `ContextFileOwnerResolver` and default owner resolver in context read/finalization | one route- or execution-root-owned stored Team projection |
| `TaskDelegationService` optional allocator/Team factory and `TaskTeamRunIdentityFactory` default allocator | required task-identity pair |

Low-level provider constructor defaults outside supported roots remain outside this ticket's root-construction prohibition. Agent Tools authority, task identity, provider context ownership, and Agent manager infrastructure are not exempt and have no default/fallback in governed production paths.

## Retain — Accepted Durable Additions At Current HEAD

| Path | Required Proof |
| --- | --- |
| `autobyteus-server-ts/tests/fixtures/agent-tool-mcp-run-session-releaser-fixtures.ts` | accepted exact no-op/recording narrow releasers |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-provider-factory-builder.test.ts` | accepted nineteen process leaves/two execution inputs, mapping and identity matrix |

## Add — SR-006 Durable Tests / Fixtures

| Path | Required Proof |
| --- | --- |
| `autobyteus-server-ts/tests/fixtures/agent-run-manager-infrastructure-fixtures.ts` | explicit test-only memory recorder, resource/activation graph, caller-selected releaser, and identity normalizer; no process getter/broad bag; recording variants remain test-local |
| `autobyteus-server-ts/tests/unit/agent-execution/input/agent-run-provider-input-normalizer.test.ts` | real temp roots: draft Agent/Team, final standalone/Team member including nested address, absolute/file/remote/data/missing inputs, null/empty array preservation, source/copy object non-identity, metadata copy, file type/name preservation against constructor inference, exact origin/loopback behavior |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation/task-execution-identity-capabilities.test.ts` | same allocator identity reaches Agent and nested Team allocation; frozen/no manager surface; missing/null/undefined rejection |
| `autobyteus-server-ts/tests/unit/context-files/context-file-path-environment.test.ts` | exact two-field frozen trimmed value; app-data missing/blank and base URL missing/relative/non-HTTP(S)/invalid rejection |

## Modify — Durable Tests And Fixtures

Every path below is an exact edit target; there are no wildcard “relevant test” rows.

### CRR-003 deterministic eight-file rerun

| Path | Required Update / Preserved Proof |
| --- | --- |
| `autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.integration.test.ts` | pass complete explicit infrastructure/normalizer/releaser; preserve provider routing, create/restore, eviction, termination and cleanup |
| `autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts` | complete fixture; preserve real memory layout |
| `autobyteus-server-ts/tests/integration/agent-execution/agent-run-prompt-fallback.integration.test.ts` | complete fixture; preserve instruction/description fallback |
| `autobyteus-server-ts/tests/integration/agent-execution/claude-session-manager.integration.test.ts` | remove resolver fixture; pass already-normalized inputs; preserve real session behavior |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts` | preserve issuer/session propagation; no context resolver |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | preserve lazy issue/retry/revocation with normalized inputs |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | remove resolver dependency fixture; preserve content/session/lifecycle and absolute reference output |
| `autobyteus-server-ts/tests/unit/application-orchestration/application-team-input-root-dispatch.test.ts` | supply exact task identity to direct RootTeamRun and normalizer to direct AgentRun; prove application task dispatch never touches process managers |

### Existing ticket Authority/provider/kernel/Mixed Team coverage

| Path | Required Update / Preserved Proof |
| --- | --- |
| `autobyteus-server-ts/tests/architecture/agent-provider-composition-boundaries.test.ts` | extend accepted guard with cumulative exact occurrence/omission/global-import closure for manager, task identity, context normalization, Mixed Team, and kernel privacy |
| `autobyteus-server-ts/tests/unit/application-platform/application-execution-scope-kernel-builder.test.ts` | revise accepted K0–K8 proof for exact context roots/stored reader reuse/task identity/complete manager, unwind/transfer and application family identity |
| `autobyteus-server-ts/tests/unit/application-platform/application-execution-scope.test.ts` | exact context path input + complete kernel; outward capabilities/lifecycle unchanged |
| `autobyteus-server-ts/tests/unit/application-platform/application-platform-runtime-isolation.test.ts` | non-identical general/application authorities, managers, task identities and normalizers under shared process infra |
| `autobyteus-server-ts/tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts` | explicit context/resource/normalizer/task identities; lookup-before-init failure; Team-before-Agent-before-Authority close |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts` | complete seven-field fixture; failure revocation and primary/cleanup evidence |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` | complete manager fixture; provider create/restore |
| `autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | update both live direct-manager constructions to the complete explicit infrastructure/normalizer input; preserve real Codex memory and same-turn steering persistence |
| `autobyteus-server-ts/tests/unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts` | direct AgentRun normalizer + issuer; preserve admission |
| `autobyteus-server-ts/tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts` | one builder identity and close order |
| `autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts` | complete manager fixture; live AutoByteus behavior |
| `autobyteus-server-ts/tests/unit/agent-team-execution/agent-team-run-manager-lifecycle.test.ts` | required backend + task identity; lookup lifecycle |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-task-notification-projection.test.ts` | required releaser + direct AgentRun normalizer; projection behavior |

### Retain / Rerun — No Planned SR-006 Durable Source Edit

These accepted tests remain mandatory evidence but need no representation-only edit. If implementation compilation proves a source change necessary, it is Design Impact against this exact inventory rather than permission for opportunistic churn.

```text
autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts
autobyteus-server-ts/tests/unit/agent-execution/agent-run-resource-manager.test.ts
autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts
autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts
autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-termination.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts
autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts
autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts
autobyteus-server-ts/tests/integration/application-backend/standalone-application-server.integration.test.ts
autobyteus-server-ts/tests/integration/application-backend/brief-package-team-prompt.integration.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/team-run-resolver-configured-overlap.test.ts
autobyteus-server-ts/tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-sub-team-run-factory.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-native-activation.test.ts
```

### Direct AgentRun constructor closure

The following eleven durable files directly construct `AgentRun` and must pass an explicit identity or recording `providerInputNormalizer`, preserving their current subject. The application root-dispatch and mixed-member projection files are already named above but remain part of this exact set.

```text
autobyteus-server-ts/tests/e2e/agent/agent-command-correlated-status.e2e.test.ts
autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts
autobyteus-server-ts/tests/integration/agent-execution/compaction/recursive-memory-compactor-leaf.integration.test.ts
autobyteus-server-ts/tests/integration/agent-team-execution/team-agent-segment-admission.integration.test.ts
autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts
autobyteus-server-ts/tests/unit/agent-execution/agent-run.test.ts
autobyteus-server-ts/tests/unit/agent-memory/agent-run-memory-recorder.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-task-notification-projection.test.ts
autobyteus-server-ts/tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts
autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-handler.test.ts
```

### Direct Team/task identity constructor closure

| Path | Required Update / Preserved Proof |
| --- | --- |
| `autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | pass one explicit task identity to all direct managers; preserve create/restore/persistence/termination |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | pass exact identity to direct RootTeamRun; prove task Agent/Team allocation and lifecycle |
| `autobyteus-server-ts/tests/unit/agent-team-execution/root-team-run-termination.test.ts` | pass identity to direct root; preserve shutdown/settlement |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-current-invariants.test.ts` | pass required pair to every direct task service; preserve queue/persistence/fail-stop invariants |

### Context normalization and explicit path construction

| Path | Required Update / Preserved Proof |
| --- | --- |
| `autobyteus-server-ts/tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.ts` | remove REST-locator ownership assumptions; preserve workspace-relative/absolute/URL/media/context behavior |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-user-input-mapper.test.ts` | assert already-normalized absolute/file/data/remote/missing formatter behavior; no resolver construction |
| `autobyteus-server-ts/tests/unit/context-files/context-file-layout.test.ts` | pass explicit app-data/memory roots; preserve safe path projections |
| `autobyteus-server-ts/tests/unit/context-files/context-file-local-path-resolver.test.ts` | pass required layout/owner/base URL; preserve route/origin/existence behavior |
| `autobyteus-server-ts/tests/unit/context-files/context-file-owner-resolver.test.ts` | pass the required named locations input; preserve Agent direct and nested Team-member async/sync projection behavior |
| `autobyteus-server-ts/tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts` | replace its four no-arg layout/resolver constructions with explicit process roots; preserve storage/finalization/runtime behavior |
| `autobyteus-server-ts/tests/integration/api/rest/context-files.integration.test.ts` | preserve public REST behavior under explicit route-edge layout construction |

The tracked historical JavaScript duplicate `tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.js` is not a TypeScript construction authority and is not regenerated or edited by this refactor; downstream coverage must continue to use the maintained TypeScript source test. Removing stale generated tests is outside scope unless the repository's normal build/test ownership proves it is executable and conflicting.

## Test Fixture Contracts

### Narrow run-session releaser

The accepted `agent-tool-mcp-run-session-releaser-fixtures.ts` remains least-privilege: frozen no-op plus fresh recording releaser; no Host/Authority/service manager/getter.

### Agent-run infrastructure

`agent-run-manager-infrastructure-fixtures.ts` exports named factories, not an `AgentRunManagerOptions` pass-through and not production defaults:

```ts
createAgentRunManagerInfrastructureFixture(input: Readonly<{
  agentToolMcpRunSessionReleaser: AgentToolMcpRunSessionReleaser;
}>): Readonly<{
  activationRegistry: AgentRunActivationRegistry;
  memoryRecorder: AgentRunMemoryRecorder;
  providerInputNormalizer: Pick<AgentRunProviderInputNormalizer, "normalizeForProvider">;
}>;
```

The default fixture uses real memory recorder/resource manager/activation registry, explicit no-op run-file/artifact attachers, and an identity normalizer. Tests whose subject includes attach/detach or normalization construct recording/real inputs explicitly rather than configure a generic fixture. Every direct manager still spells all seven production fields in its constructor literal.

## Current-Tree Occurrence Closure

The focused architecture test parses governed TypeScript source, resolves imports fail-closed, derives occurrence sets, and compares them to the exact lists below. Added/missing/stale paths fail.

### Supported production roots

Exactly two production `AgentRunManager` construction/initialization sites and two production `AgentTeamRunManager` sites are allowed:

```text
autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts
autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts
```

Each Agent manager literal contains all seven exact fields; its recorder is the same identity passed into the resource manager behind its activation registry, each Team manager literal contains `memoryDir`, `mixedTeamRunBackendFactory`, and `taskExecutionIdentity`, and both roots construct the normalizer/task identity from their own explicit inputs. `agent-run-manager.ts` may contain its static initializer forwarding the already-complete options but no `new` with defaults.

Within each root, one `AgentRunIdentityAllocator` identity must be passed to `AgentRunProvisioningService`, `AgentRunService`, `TeamRunService`, and `createTaskExecutionIdentityCapabilities`; no sibling constructs or retrieves another allocator. The capability's `.agentRuns` is that identity, and its derived `.taskTeams` is the pair carried to the Team manager.

### Direct durable Agent manager set

```text
autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.integration.test.ts
autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts
autobyteus-server-ts/tests/integration/agent-execution/agent-run-prompt-fallback.integration.test.ts
autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts
autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts
autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts
autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts
```

Each constructor occurrence spells all seven fields; the three CR-004 files use the explicit infrastructure fixture, and both live Codex occurrences preserve their real recorder/resource graph while adding the identity normalizer. Any source-derived extra site fails closed.

### Direct durable AgentRun set

The exact eleven-file set is the code block under “Direct AgentRun constructor closure.” Every constructor supplies `providerInputNormalizer`. Production `new AgentRun` occurs only in `agent-run-manager.ts`, which passes its required field.

### Direct durable Team/task set

- `AgentTeamRunManager` direct tests: `agent-team-run-manager.integration.test.ts`, `agent-team-run-manager-lifecycle.test.ts`, and `general-process-run-supervisor-ownership.test.ts` process initialization; all pass memoryDir + backend factory + task identity.
- `RootTeamRun` direct tests: `task-delegation-tool-lifecycle.integration.test.ts`, `root-team-run-termination.test.ts`, `application-team-input-root-dispatch.test.ts`; all pass task identity.
- `TaskDelegationService` direct tests: only `task-delegation-current-invariants.test.ts`; all occurrences pass task identity.
- Production `TaskTeamRunIdentityFactory` construction occurs only inside `createTaskExecutionIdentityCapabilities` and requires its allocator. Direct unit construction, if added, must be allowlisted with an explicit allocator.

### Provider/context prohibitions

Production occurrences of `ContextFileLocalPathResolver` are limited to its own class and the new Agent-run normalizer. Production `ContextFileOwnerResolver` construction is limited to the normalizer assembly and process context REST registration; both pass a named stored-only locations capability with explicit non-empty `memoryDir`. AutoByteus processor, Codex mapper, Claude manager/state/session, provider builders/factories, `AgentRun`, and Team/task files have zero resolver/owner/AppConfig/Team-location imports. The normalizer has zero provider import. `ContextFileLayout`, `ContextFileLocalPathResolver`, `ContextFileOwnerResolver`, `ContextFileReadService`, and `ContextFileFinalizationService` contain no default AppConfig/Team-owner constructor path. The REST route is the only governed context-service AppConfig edge and shares one resolver identity across read/finalization.

`general-process-run-supervisor.ts` has zero AppConfig import/type/property access and requires the exact seven-top-level/eight-leaf input. Only the two maintained host composition roots project AppConfig into its explicit `memoryDir` and frozen context-path environment; their values equal those passed into application-platform construction.

Production `createContextFilePathEnvironment` calls occur exactly in `build-studio-server.ts` and `start-standalone-application-host.ts`. Each host passes one object identity to both its supervisor and application-platform build. The process REST edge instead projects only the `appDataDir` and `memoryDir` leaves it consumes; it must not construct or depend on the execution-only `baseUrl` value. The value factory has zero AppConfig/service import and no extra fields.

### Ambient authority prohibitions

Task service/factory/root files have zero `AgentRunIdentityAllocator.getInstance`, `AgentRunManager.getInstance`, `AgentTeamRunManager.getInstance`, `getAgentRunService`, and `getTeamRunService`. Application kernel/provider/context paths have the same zero process-execution getter rule. Agent manager has zero imports/getters for default provider factories, run-file service, artifact relay, resource manager construction, activation construction, or process memory recorder.

### Mixed Team and prior ticket closure

The accepted exact Mixed constructor sets and guards remain:

- backend factory tests: mixed factory integration, mixed factory unit, mixed sub-Team unit, configured-overlap unit;
- Mixed manager tests: mixed manager, member interrupt, configured overlap;
- member handle tests: cleanup, memory invariant, native activation, task notification projection, termination.

Every factory has required releaser + callback; both production callbacks consume their factory-owned releaser and complete family inputs. No cached/default factory, default manager, optional callback, process releaser getter, or manager lazy construction exists.

### Synthetic omissions

Table-driven fixtures independently reject omission, null and explicit `undefined` for:

- ten application scope top-level fields plus both leaves of `contextFilePathEnvironment`;
- seven general supervisor top-level fields plus both leaves of `contextFilePathEnvironment`;
- seven Agent manager fields;
- `AgentRun.providerInputNormalizer`;
- Team manager memoryDir, backend factory, and task identity;
- RootTeamRun/task-service task identity;
- task capability allocator;
- ContextFile layout roots and local resolver layout/owner/base URL;
- ContextFile owner locations and read/finalization owner resolver;
- context-path environment app-data/base-URL leaves and exact two-field shape;
- Mixed Team releaser/callback and Team factory requirements;
- all existing nineteen provider-process leaves, two provider-execution inputs, and Authority construction fields.

Casts hiding omission, ambient getter sourcing, broad manager fakes, generic dependency bags, unresolved governed imports, and allowlist drift fail the guard.

## Kernel Cut-Point Proof Matrix

| Cut | Injected Failure | Required Result |
| --- | --- | --- |
| K0 | any top-level or nested required input missing/null/undefined | throw before `begin`; no cleanup |
| K1 | authority begin | primary preserved; no disposer without returned assembly |
| K2 | stored reader/context normalizer or any resource/publication constructor | assembly abort once |
| K3 | authority completion | abort incomplete; if full returned, close replaces abort exactly once |
| K4 | provider builder | full authority closes once |
| K5 | manager/metadata/allocator/task capability/Agent service cut | full authority closes; no admission |
| K6 | Team graph/Mixed callback cut | full authority closes; no invented run stop |
| K7 | shutdown/stream/projection/freeze | full authority closes; no transfer |
| K8 | successful transfer | builder ledger empty; scope owns abort/normal close |
| scope/outer assembly | post-K8 failure before return | fixed abort once |
| primary + cleanup error | owned disposer throws | all cleanup attempted; primary first, reverse cleanup errors after |

## Verification Matrix

| Proof | Required Evidence |
| --- | --- |
| First focused rerun | exact eight API-REV-001 failing files all pass without initializing unrelated globals |
| Build/type/lint | affected package typecheck/lint, `git diff --check`, architecture guard |
| Unit | normalizer, task identity, complete manager options, Root task service, provider formatters, Authority, Mixed Team, K0–K8 |
| Integration | AutoByteus/Codex/Claude create/restore/input; Agent/Team task identity; context storage; MCP routes; Brief and standalone |
| Identity proof | application/general manager, allocator, task factory, normalizer, session Authority non-identity; shared canonical definitions/process infrastructure only |
| Stored-projection proof | both hosts rebuild package catalog before execution; incomplete/unadmitted roots excluded; fresh/restore/task write/admit-before-live and fail-stop ordering retained |
| Realistic API/E2E | Studio and standalone Agent/Team launch, configured/nested task delegation, logical context inputs, tools, publication, streaming, recovery/reentry, cleanup |
| Source review | complete implementation review after design; prior CRR-002 Pass is superseded by CRR-003 |
| Durable-test review | proportional re-review of all repository-resident test changes before delivery |

## No-Impact Inventory

- no SDK contract/package copy/generated application package change;
- no URL/GraphQL/REST/WS/worker protocol change;
- no database schema, application JSON, run history, binding, Team tree, task record, context locator, or migration change;
- no provider selection/model/runtime behavior change;
- no execution multiplicity, canonical definition authority, RootTeamRun lifecycle, or general/application owner unification.
