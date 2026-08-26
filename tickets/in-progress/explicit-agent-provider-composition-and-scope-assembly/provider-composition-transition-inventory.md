# Provider Composition Transition Inventory

Status: Normative implementation and proof supplement. Revised by SR-005 from IR-001 current source to close CRR-001 CR-001 and ARCH-REV-004 AR-004 while preserving the accepted Host/Authority/provider/kernel architecture.

## Add — Production

| Path | Exact Responsibility |
| --- | --- |
| `autobyteus-server-ts/src/compositions/create-process-agent-provider-factory-builder.ts` | accept the host's exact workspace-manager identity, select the remaining eighteen process leaves, and return one frozen `AgentProviderFactoryBuilder`; expose neither the record nor lookup access |
| `autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts` | validate/freeze the exact process input and create a fresh complete AutoByteus/Codex/Claude factory set for one definition-service/issuer pair |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-authority.ts` | issuer, run-session releaser, issued resource, construction assembly, full authority, and authority-factory contracts |
| `autobyteus-server-ts/src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.ts` | one execution-family construction transaction, capability ledger, readiness, admission, revocation, and close owner |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts` | exact K0–K8 application kernel construction, including the required Mixed Team callback over graph-local Agent/memory/activity/context/workspace identities; ownership transfer, reverse partial unwind, and fixed construction abort |

## Rename / Move

| Current | Target | Reason |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-runtime.ts` | `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-host.ts` | name the process endpoint/catalog/registry/dispatcher owner truthfully and remove execution-family state |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tools-mcp-runtime.test.ts` | `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tools-mcp-host.test.ts` | align the test with the process owner |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/application-agent-tool-mcp-session-scope.test.ts` | `autobyteus-server-ts/tests/unit/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.test.ts` | cover the unified trusted owner and construction assembly |

## Modify — Production

| Path | Exact Change |
| --- | --- |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` | select one workspace manager; create the Host and process builder once; pass the same workspace and builder identities to the general supervisor and application platform; create/complete the general authority; preserve unwind/close order |
| `autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts` | perform the identical explicit workspace/builder/authority ownership composition for standalone without a mode-switch builder |
| `autobyteus-server-ts/src/application-platform/runtime/build-application-platform-runtime.ts` | replace the mixed session factory with authority factory + provider builder, create one scope, and invoke scope construction abort on later platform assembly failure |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope-contracts.ts` | make authority factory and provider builder required build inputs; preserve the seven outward capabilities byte/semantically |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope.ts` | remove all provider/internal construction, `BuiltKernel`, tuple/eight-argument assembly, and later-bound session capture; accept one complete private kernel and delegate construction abort/normal lifecycle |
| `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts` | receive the exact host-selected workspace manager, builder, and completed authority; create explicit general memory/activity/context dependencies; supply the required Mixed Team manager-construction callback binding the general Agent manager and factory-owned releaser; remove provider/session/member ambient lookup; close the general authority after Team/Agent runs |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | export only exact collaborator type aliases and `createDefaultCompactionAgentRunner`; retain current low-level defaults but let the governed builder pass every option explicitly |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | consume the narrow run-session releaser in governed construction and revoke pre-attachment sessions on failed create/restore before claim completion; preserve primary-plus-cleanup evidence |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts` | replace broad session-manager/session-scope access with the exact run-session releaser |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | replace broad/default MCP manager with issuer; preserve issuance timing and translate the issued descriptor through the existing Codex adapter |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts` | expose the named provider-specific `CodexAgentToolsMcpConfig` adaptation from the provider-neutral descriptor |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts` | replace broad/default MCP manager with the execution issuer, require the process workspace-skill materializer for its fresh cleanup, and propagate the issuer into each session-state input |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-state-input.ts` | replace optional broad session-service dependency with the exact required issuer in the governed session dependency shape |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | construct provider MCP state from the issuer and preserve lazy first-query/retry/session lifecycle |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts` | issue/cache `IssuedAgentToolMcpSession` through issuer only; expose the cached descriptor to query construction |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.ts` | expose the named Claude provider-config adaptation from the descriptor |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | accept and propagate only the run-session releaser for defensive member cleanup |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | make both `agentToolMcpRunSessionReleaser` and typed `createTeamManager(MixedTeamManagerConstructionInput)` required/non-null; pass the factory-owned releaser plus context/sub-Team/callback inputs on every root/recursive manager creation; remove process service import/fallback, cached instance/getter, optional callback, and built-in default manager |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | remove ambient/broad MCP lookup and revoke the exact member run via required propagated releaser |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-configured-member-registry.ts` | propagate the required releaser into configured member handles |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.ts` | propagate the required releaser into task-Agent member handles |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | require/non-null-check `mixedTeamRunBackendFactory`; remove default constructor/options and factory selection; keep `initializeProcessInstance` as the only process creation entry; make `getInstance()` no-argument lookup-only and fail before initialization |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | remain Host/Authority-internal low-level mechanics; align issue/revoke primitives to the immutable issued-resource contract; remove the now-unused process-global run-session releaser getter export |

The Codex and Claude backend-factory constructor files remain low-level provider constructors and do not need semantic edits: `agent-provider-factory-builder.ts` supplies every governed argument explicitly. Their existing defaults remain available only to unrelated low-level/test construction under the approved scope guardrail.

## Remove

| Path / Symbol | Exact Replacement |
| --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/application-agent-tool-mcp-session-scope.ts` | scoped Authority ledger |
| `autobyteus-server-ts/src/agent-tools/mcp/scoped-agent-tool-mcp-session-manager.ts` | full Authority plus separate issuer/releaser ports |
| `AgentToolsMcpRuntime`, `createAgentToolsMcpRuntime`, `ApplicationAgentToolsSessionFactory`, `generalProcessSessionManager` | Host, authority factory, and explicit root composition; no alias |
| scope `BuiltKernel`, `buildScope` tuple, eight constructor parameters, and `sessionManager!` | complete private kernel and fixed `abortConstruction` |
| direct provider construction and positional provider defaults in the two supported execution roots | `AgentProviderFactoryBuilder.createForExecution` |
| broad `AgentToolMcpSessionManager` imports from governed provider, run-cleanup, and mixed-Team files | issuer or run-session releaser, according to responsibility |
| `getAgentToolMcpRunSessionReleaser`, `getMixedTeamRunBackendFactory`, its cached instance, optional factory releaser/callback, built-in default `MixedTeamManager`, and `AgentTeamRunManager`'s default/lazy factory construction | exact execution-owner Authority releaser + required typed root construction capability -> required Mixed Team factory -> required Team manager; process manager lookup only after explicit initialization |

## Add — Durable Tests

| Path | Required Proof |
| --- | --- |
| `autobyteus-server-ts/tests/fixtures/agent-tool-mcp-run-session-releaser-fixtures.ts` | exact frozen no-op releaser and recording releaser with ordered run/owner observations; no broad manager, singleton, or optional fallback |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-provider-factory-builder.test.ts` | all nineteen process leaves and two execution inputs required/non-null; exact constructor mapping; shared/fresh identity matrix; two calls are isolated |
| `autobyteus-server-ts/tests/unit/application-platform/application-execution-scope-kernel-builder.test.ts` | K0–K8 cut points, completion replacement, transfer, constructor/outer abort, reverse disposal, idempotency, error ordering, and application root-to-configured/task-member identity through the required Mixed Team callback |
| `autobyteus-server-ts/tests/architecture/agent-provider-composition-boundaries.test.ts` | exact root/helper occurrence rules, old-symbol closure, least-privilege propagation, Mixed Team factory/manager construction closure, kernel privacy, and synthetic omission/null/undefined fixtures |

## Modify — Durable Tests And Fixtures

These rows are the closed source-edit inventory produced by the current-tree symbol/construction audit. There are no wildcard or “relevant test” rows.

| Path | Required Proof Update |
| --- | --- |
| `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` | preserve existing application boundary guards and delegate only the new non-overlapping provider/authority obligations to the focused architecture test |
| `autobyteus-server-ts/tests/unit/application-platform/application-execution-scope.test.ts` | use exact builder/authority-factory inputs; assert complete kernel, capability identity, lifecycle, construction abort, and no raw Team/Agent manager escape |
| `autobyteus-server-ts/tests/unit/application-platform/application-platform-runtime-isolation.test.ts` | distinct general/application authority/factory/run identities under one Host and builder |
| `autobyteus-server-ts/tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts` | explicit builder/completed authority; construct every factory with no-op releaser plus required callback; prove callback receives/uses the general factory-owned releaser and exact general Agent/memory/activity/context/workspace identities; prove `AgentTeamRunManager.getInstance()` fails before initialization and returns only the supervisor-initialized identity; preserve Team-before-Agent-before-authority close |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts` | use a fresh recording narrow releaser; prove post-issue create/restore failure revocation and primary-plus-cleanup/quarantine behavior |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-resource-manager.test.ts` | exact releaser and idempotent duplicate cleanup |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | issuer/issued descriptor plus the post-issue later-failure witness |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | explicit issuer with real descriptor-to-Codex adaptation |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` | use the explicit no-op releaser at its direct manager construction; builder-produced Codex factory preserves create/restore and cleanup |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts` | issuer propagation into every new/restored session |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | required issuer in session state while non-MCP behavior remains unchanged |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | lazy issue once, descriptor reuse on retry, and lifecycle-owned revocation |
| `autobyteus-server-ts/tests/integration/agent-execution/claude-session-manager.integration.test.ts` | explicit issuer and real descriptor-to-Claude query configuration |
| `autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` | builder-produced Claude factory preserves create/restore/session behavior |
| `autobyteus-server-ts/tests/unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts` | update direct Claude session-state fixture to the issuer contract |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts` | use a fresh recording narrow releaser; prove required propagation and exact-run revocation |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts` | use the explicit no-op releaser while preserving the memory invariant |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-termination.test.ts` | use a fresh recording narrow releaser; prove duplicate termination/revocation idempotency |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts` | configured/task registry propagation and exact member cleanup |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | Host-internal issue/revoke primitives and immutable issued resource |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | route/catalog/authentication parity through the renamed Host |
| `autobyteus-server-ts/tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts` | one builder identity and Host/supervisor/platform close order |
| `autobyteus-server-ts/tests/integration/application-backend/standalone-application-server.integration.test.ts` | preserved real standalone execution/tools/publication with explicit composition |
| `autobyteus-server-ts/tests/integration/application-backend/brief-package-team-prompt.integration.test.ts` | application graph-local Team/provider prompt path under the new issuer/releaser chain; configured Team member must use the application Agent manager/context/workspace family and never the process family |
| `autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | pass the explicit no-op releaser to both direct `AgentRunManager` constructions; preserve real Codex raw-trace and steered-input persistence without creating unrelated MCP state |
| `autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.integration.test.ts` | pass a fresh recording releaser to every direct manager; preserve provider routing, create/restore, inactive eviction, accepted/unaccepted termination, and error behavior while asserting exact-run revocation where cleanup occurs |
| `autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts` | pass the explicit no-op releaser; preserve real create/restore memory layout and avoid ambient MCP authority |
| `autobyteus-server-ts/tests/integration/agent-execution/agent-run-prompt-fallback.integration.test.ts` | pass the explicit no-op releaser; preserve fresh-definition instruction and description-fallback behavior |
| `autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts` | pass the explicit no-op releaser to the live AutoByteus publication manager; preserve LM Studio tool/publication behavior |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts` | pass the explicit no-op releaser to the direct manager fixture; preserve configured/task Team materialization, commit/settlement, cancellation, freeze, and interrupt behavior |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts` | pass the explicit no-op releaser; preserve exact configured/task AgentRun command routing and unknown-run rejection |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-run-resolver-configured-overlap.test.ts` | pass the no-op releaser and required construction callback; consume the factory-owned releaser in the real `MixedTeamManager`; preserve joined child materialization/readiness under overlapping commands |
| `autobyteus-server-ts/tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts` | pass the explicit no-op releaser and required manager-stub callback at all three direct factories; assert callback input carries the same releaser; preserve exact Team context, root mismatch, restore provenance, and external identity behavior |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts` | pass the explicit no-op releaser and required manager-stub callback at both factories; add independent omission/null/undefined rejection for both fields and prove exact releaser/callback input identity while preserving create/restore context assertions |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-sub-team-run-factory.test.ts` | pass the explicit no-op releaser and a fail-if-called required callback at both context-only backend factories; preserve configured/delegated nested physical-scope, handoff, and binding assertions |
| `autobyteus-server-ts/tests/unit/agent-team-execution/agent-team-run-manager-lifecycle.test.ts` | keep an explicit backend-factory fixture; add constructor omission/null/undefined rejection and lookup-before-initialization failure without changing root lifecycle assertions |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-native-activation.test.ts` | pass a fresh recording releaser to every direct handle; preserve native restore/create/platform-binding behavior, assert no revocation on successful activation, and record the exact run if a tested abort/teardown path revokes |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-task-notification-projection.test.ts` | pass the explicit no-op releaser; preserve task-delegation notification and ordinary member-input projection behavior |

The two renamed MCP tests in the Rename/Move table are also modified: the Host test covers only process routes/factory/close; the scoped-Authority test covers ASSEMBLING/COMPLETED/ABORTED, atomic ledger insertion, readiness, issue blocking, scoped revoke, and idempotent/aggregate close.

## Verify Unchanged — Durable Tests

| Path | Required No-Edit Proof |
| --- | --- |
| `autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | all six direct manager constructions already supply explicit fake backend factories; retain create/restore/persistence/termination behavior and include the file in the exact manager-construction occurrence set without adding a releaser or global fallback |

## Narrow Releaser Test Fixture Contract

`autobyteus-server-ts/tests/fixtures/agent-tool-mcp-run-session-releaser-fixtures.ts` is the single test-only releaser boundary for direct `AgentRunManager`, `MixedTeamRunBackendFactory`, `MixedTeamManager`, and `MixedAgentMemberHandle` sites. Each direct backend-factory test additionally supplies its own explicit subject-appropriate required manager callback; no shared broad manager-dependency fixture is introduced. It imports only `AgentToolMcpRunSessionReleaser` and `AgentToolMcpSessionOwnerIdentity`; it must not import the Host, full Authority, session service/manager, registry, process getter, or either execution root.

The fixture exports exactly these two factories:

```ts
export function createNoopAgentToolMcpRunSessionReleaser(): AgentToolMcpRunSessionReleaser;

export function createRecordingAgentToolMcpRunSessionReleaser(): Readonly<{
  releaser: AgentToolMcpRunSessionReleaser;
  getRevokedRunIds(): readonly string[];
  getRevokedOwners(): readonly Readonly<Partial<AgentToolMcpSessionOwnerIdentity>>[];
}>;
```

- The no-op releaser is frozen, returns `0` for both operations, and is used only when the test's subject does not exercise Agent Tools MCP cleanup.
- Each recording fixture owns fresh private ordered arrays, records a copied/frozen owner criterion, returns `0`, and exposes snapshots through its two getter methods. Tests cannot mutate the recorder's buffers.
- Tests whose assertions include cleanup use the recording fixture and prove the exact run ID, call count/order when material, or deliberate absence of revocation on the successful path. Tests with no MCP cleanup subject use the explicit no-op fixture so the required boundary is visible without inventing unrelated session state.
- Neither fixture factory accepts options, performs lookup, falls back to a process singleton, or exposes a broad fake manager. Every governed constructor, including context-only Mixed Team backend-factory tests, receives the non-null `agentToolMcpRunSessionReleaser` property directly from a fresh fixture selected by its Modify row.

## Current-Tree Occurrence Closure

The focused architecture test owns an exact checked allowlist, not a handwritten substring count that silently ignores new files.

1. Both host files must bind `getWorkspaceManager()` to one local, call `createProcessAgentProviderFactoryBuilder({ workspaceManager })` exactly once, pass that same workspace local to the helper, `GeneralProcessRunSupervisor`, and `buildApplicationPlatformRuntime`, and pass the same builder local to supervisor and platform.
2. The process composition helper must require/non-null-check its workspace input and construct the remaining eighteen named leaves with no null/undefined/default omission. Table-driven builder negative fixtures remove, null, and explicitly `undefined` every one of the nineteen final leaves; helper fixtures cover missing/null/undefined workspace; a second table covers both `createForExecution` inputs.
3. `GeneralProcessRunSupervisor`, `ApplicationExecutionScope`, the kernel builder's callers, and both host roots must have zero provider-specific constructor/getter calls and zero positional `undefined` provider construction.
4. The following governed production files must have zero `AgentToolMcpSessionManager`, `getAgentToolMcpSessionService`, `getAgentToolMcpRunSessionReleaser`, whole Host, or full Authority imports: Codex bootstrapper; Claude manager/session/state; `AgentRunManager`; `AgentRunResourceManager`; `MixedTeamRunBackendFactory`; `MixedTeamManager`; configured/task registries; member handle. `AgentTeamRunManager` must also have zero Mixed Team factory getter/import and no lazy factory creation. Positive type assertions require the exact issuer, releaser, required manager-construction callback, or prebound backend-factory chain named in the contract. The backend factory must contain no fallback `new MixedTeamManager`; the two maintained roots are the only production callback definitions.
5. The pre-cutover SR-002 old-symbol production occurrence set was the following exact twenty paths. Every path is dispositioned in Modify, Rename, or Remove above. On IR-001 and after the SR-005 target, old Runtime/application-scope/scoped-manager/broad-manager symbols have zero governed production occurrences outside architecture-test negative literals.

```text
autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts
autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts
autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts
autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts
autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts
autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts
autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts
autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts
autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-configured-member-registry.ts
autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.ts
autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts
autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts
autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-runtime.ts
autobyteus-server-ts/src/agent-tools/mcp/application-agent-tool-mcp-session-scope.ts
autobyteus-server-ts/src/agent-tools/mcp/scoped-agent-tool-mcp-session-manager.ts
autobyteus-server-ts/src/application-platform/execution/application-execution-scope-contracts.ts
autobyteus-server-ts/src/application-platform/execution/application-execution-scope.ts
autobyteus-server-ts/src/application-platform/runtime/build-application-platform-runtime.ts
autobyteus-server-ts/src/compositions/build-studio-server.ts
autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts
```

6. The pre-cutover SR-002 old-symbol durable-test occurrence set was the following exact eleven paths. Every path is dispositioned above; after cutover the old symbols have zero executable test occurrences outside negative architecture literals.

```text
autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts
autobyteus-server-ts/tests/integration/application-backend/standalone-application-server.integration.test.ts
autobyteus-server-ts/tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-termination.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts
autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tools-mcp-runtime.test.ts
autobyteus-server-ts/tests/unit/agent-tools/mcp/application-agent-tool-mcp-session-scope.test.ts
autobyteus-server-ts/tests/unit/application-platform/application-platform-runtime-isolation.test.ts
autobyteus-server-ts/tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts
```
7. The architecture test enumerates every durable test containing `new AgentRunManager(...)`, `AgentRunManager.initializeProcessInstance(...)`, `new MixedTeamRunBackendFactory(...)`, `new MixedTeamManager(...)`, or `new MixedAgentMemberHandle(...)`. The exact current sets are grouped below by governed constructor; a file may appear in more than one set when it deliberately constructs more than one layer.

`AgentRunManager` direct-construction tests (seven):

```text
autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts
autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.integration.test.ts
autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts
autobyteus-server-ts/tests/integration/agent-execution/agent-run-prompt-fallback.integration.test.ts
autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts
autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts
autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts
```

`MixedTeamRunBackendFactory` direct-construction tests (four):

```text
autobyteus-server-ts/tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-sub-team-run-factory.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/team-run-resolver-configured-overlap.test.ts
```

`MixedTeamManager` direct-construction tests (three):

```text
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/team-run-resolver-configured-overlap.test.ts
```

`MixedAgentMemberHandle` direct-construction tests (five):

```text
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-native-activation.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-task-notification-projection.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-termination.test.ts
```

8. Each governed releaser-bearing constructor call in those sets must contain a non-null `agentToolMcpRunSessionReleaser` supplied directly by the no-op or recording fixture required by its Modify row. Every `MixedTeamRunBackendFactory` call must also contain a non-null typed `createTeamManager` callback. Direct factory tests use an explicit stub/real callback according to their Modify row; the two production callbacks use the exact dependency map below. The focused architecture test fails if the property is omitted, null, explicitly `undefined`, cast from an omission (`as never`/`as any`), sourced from an ambient getter, or backed by a broad session manager. Table-driven synthetic fixtures cover omission/null/undefined for all four releaser-bearing constructor families and independently for the backend factory callback.
9. The architecture test derives the four direct-constructor path sets from current source and compares them with the four exact allowlists above. A newly matching test file therefore fails closed until its fixture purpose and preserved behavior are added to the Modify inventory; an allowlisted file with no matching constructor also fails as stale inventory.
10. `AgentTeamRunManager` construction is governed separately. Direct durable-test construction occurs only in the following two files, and each supplies a non-null `mixedTeamRunBackendFactory`; process initialization occurs only in the general-supervisor ownership test and supplies a real factory bound to the no-op releaser.

```text
autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/agent-team-run-manager-lifecycle.test.ts
```

```text
autobyteus-server-ts/tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts
```

The target production root set contains exactly two `new MixedTeamRunBackendFactory(...)` calls: `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts` and `autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts`. Each options literal contains exactly the required `agentToolMcpRunSessionReleaser` and `createTeamManager` fields. The callback receives one named construction input and passes `input.agentToolMcpRunSessionReleaser`, `input.context`, `input.subTeamRunFactory`, and all `input.callbacks` operations to `MixedTeamManager`.

The root-specific closed-over identities are exact:

| Root | Required Closed-Over Dependencies | Forbidden Source |
| --- | --- | --- |
| general supervisor | its initialized process `AgentRunManager`; explicit `AgentMemoryLocationService({memoryDir})`; explicit activity inspector; canonical-definition `MemberTeamContextBuilder`; exact host workspace | application scope, singleton getters inside callback, or second releaser |
| application kernel | K5 graph-local `AgentRunManager`; K2 memory location service; K6 activity inspector and member-context builder; exact platform workspace | `AgentRunManager.getInstance()`, memory/activity/context/workspace getters, general supervisor, or second releaser |

The first factory is passed to `AgentTeamRunManager.initializeProcessInstance(...)`; the second to a non-singleton `new AgentTeamRunManager(...)`. The factory file has zero self-construction/cache/getter, zero process releaser getter, and zero built-in `new MixedTeamManager(...)`. The manager file's `getInstance()` contains no `new`, accepts no options, and throws before initialization.
11. Synthetic architecture fixtures reject omission/null/undefined independently for `MixedTeamRunBackendFactory.agentToolMcpRunSessionReleaser`, `MixedTeamRunBackendFactory.createTeamManager`, and `AgentTeamRunManager.mixedTeamRunBackendFactory`; they also reject `getAgentToolMcpRunSessionReleaser()`, `getMixedTeamRunBackendFactory()`, zero-argument factory/manager construction, optional callback syntax, built-in default manager construction, and `AgentTeamRunManager.getInstance(options)`. Positive fixtures use the no-op releaser plus explicit callback and factory. A focused lifecycle test proves lookup-before-initialization failure and lookup-after-supervisor identity.
12. Root-to-member runtime proof materializes both a configured Agent and a delegated task Agent beneath an application Team and a separate general Team. It asserts each path calls only its root's exact `AgentRunManager`, memory/activity/context/workspace collaborators, and Authority releaser; recursively materialized child/task Teams reuse the same callback. The application case additionally asserts the process manager and process getters remain untouched. The realistic Brief package Team prompt path remains the application witness.
13. Scope outward contracts and runtime/orchestration files must not import the private kernel type or raw run managers. Kernel construction must not expose a generic disposer registry, incomplete result, optional dependency record, or later bind method.
14. The architecture test scans governed roots recursively and fails closed on unresolved imports or a newly matching file not present in the exact target allowlist. Low-level provider constructor tests remain outside the provider-root prohibition, but Agent Tools releaser defaults receive no low-level exception and cannot be imported by a supported root.

## Kernel Cut-Point Proof Matrix

| Cut | Injected Failure | Required Result |
| --- | --- | --- |
| K0 | any missing/null/undefined build input | throw before `begin`; no cleanup |
| K1 | authority `begin` | primary preserved; no disposer if no assembly returned |
| K2 | each plain-service constructor | `assembly.abort` once; no cleanup for later/plain objects |
| K3 | authority completion | incomplete assembly aborts once; if full authority returned then its close replaces abort exactly once |
| K4 | provider builder | full authority closes once |
| K5 | each Agent graph construction cut | full authority closes once; no run/session admission occurred |
| K6 | each Team graph construction cut | full authority closes once; no Team/run stop is invented |
| K7 | shutdown/stream/projection/kernel freeze | full authority closes once; no transfer |
| K8 | successful transfer | builder ledger is empty; scope exclusively owns construction abort and normal close |
| scope constructor | after K8, before scope returned | `kernel.abortConstruction` once |
| outer platform assembly | after scope returned, before platform returned | `scope.abortConstruction` once |
| primary + cleanup error | any owned disposer throws | all reverse disposers run; `AggregateError` has primary at index 0 then cleanup errors in actual reverse order |

## Verification Matrix

| Proof | Required Evidence |
| --- | --- |
| Build/type/lint | affected package typecheck, lint, `git diff --check` |
| Unit | builder, Host, Authority, manager failure cleanup, required Mixed Team factory/manager inputs, lookup-only process access, kernel cut points, lifecycle |
| Integration | Codex, Claude, AutoByteus factory behavior; Mixed Team create/restore identity; MCP routes; standalone; Brief Team prompt |
| Existing scope baseline | scope contracts, isolation, stream/publication/task cleanup |
| Realistic API/E2E | Studio and standalone Agent/Team launch, configured tools, task delegation, publication, streaming, recovery/reentry, cleanup |
| Durable-test review | every added/modified repository test receives proportional source review before delivery |

## No-Impact Inventory

- no SDK contract/package copy or generated application package change;
- no URL/GraphQL/REST/WS/worker protocol change;
- no database schema, application JSON, run history, binding, Team tree, or migration change;
- no provider selection/model/runtime behavior change;
- no execution multiplicity or definition-authority change.
