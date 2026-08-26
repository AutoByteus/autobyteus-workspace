# Provider Composition Transition Inventory

Status: Normative implementation and proof supplement. Revised by SR-002 from the current tree to close ARCH-REV-001 AR-001–AR-003.

## Add — Production

| Path | Exact Responsibility |
| --- | --- |
| `autobyteus-server-ts/src/compositions/create-process-agent-provider-factory-builder.ts` | accept the host's exact workspace-manager identity, select the remaining eighteen process leaves, and return one frozen `AgentProviderFactoryBuilder`; expose neither the record nor lookup access |
| `autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts` | validate/freeze the exact process input and create a fresh complete AutoByteus/Codex/Claude factory set for one definition-service/issuer pair |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-authority.ts` | issuer, run-session releaser, issued resource, construction assembly, full authority, and authority-factory contracts |
| `autobyteus-server-ts/src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.ts` | one execution-family construction transaction, capability ledger, readiness, admission, revocation, and close owner |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts` | exact K0–K8 application kernel construction, ownership transfer, reverse partial unwind, and fixed construction abort |

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
| `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts` | receive the exact host-selected workspace manager, builder, and its own completed authority; remove provider constructors/ambient workspace or session lookup; close the general authority after Team/Agent runs |
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
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | remove ambient/broad MCP lookup and revoke the exact member run via required propagated releaser |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-configured-member-registry.ts` | propagate the required releaser into configured member handles |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.ts` | propagate the required releaser into task-Agent member handles |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | remain Host/Authority-internal low-level mechanics; align issue/revoke primitives to the immutable issued-resource contract; expose no execution-facing broad manager |

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

## Add — Durable Tests

| Path | Required Proof |
| --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-provider-factory-builder.test.ts` | all nineteen process leaves and two execution inputs required/non-null; exact constructor mapping; shared/fresh identity matrix; two calls are isolated |
| `autobyteus-server-ts/tests/unit/application-platform/application-execution-scope-kernel-builder.test.ts` | K0–K8 cut points, completion replacement, transfer, constructor/outer abort, reverse disposal, idempotency, and error ordering |
| `autobyteus-server-ts/tests/architecture/agent-provider-composition-boundaries.test.ts` | exact root/helper occurrence rules, old-symbol closure, least-privilege propagation, kernel privacy, and synthetic omission/null/undefined fixtures |

## Modify — Durable Tests And Fixtures

These rows are the closed source-edit inventory produced by the current-tree symbol/construction audit. There are no wildcard or “relevant test” rows.

| Path | Required Proof Update |
| --- | --- |
| `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` | preserve existing application boundary guards and delegate only the new non-overlapping provider/authority obligations to the focused architecture test |
| `autobyteus-server-ts/tests/unit/application-platform/application-execution-scope.test.ts` | use exact builder/authority-factory inputs; assert complete kernel, capability identity, lifecycle, and construction abort |
| `autobyteus-server-ts/tests/unit/application-platform/application-platform-runtime-isolation.test.ts` | distinct general/application authority/factory/run identities under one Host and builder |
| `autobyteus-server-ts/tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts` | explicit builder/completed authority, no ambient providers, and Team-before-Agent-before-authority close |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts` | post-issue create/restore failure revocation and primary-plus-cleanup/quarantine behavior |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-resource-manager.test.ts` | exact releaser and idempotent duplicate cleanup |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | issuer/issued descriptor plus the post-issue later-failure witness |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | explicit issuer with real descriptor-to-Codex adaptation |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` | builder-produced Codex factory preserves create/restore and cleanup |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts` | issuer propagation into every new/restored session |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | required issuer in session state while non-MCP behavior remains unchanged |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | lazy issue once, descriptor reuse on retry, and lifecycle-owned revocation |
| `autobyteus-server-ts/tests/integration/agent-execution/claude-session-manager.integration.test.ts` | explicit issuer and real descriptor-to-Claude query configuration |
| `autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` | builder-produced Claude factory preserves create/restore/session behavior |
| `autobyteus-server-ts/tests/unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts` | update direct Claude session-state fixture to the issuer contract |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts` | required releaser and exact-run revocation |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts` | propagated releaser fixture while preserving memory invariant |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-termination.test.ts` | duplicate termination/revocation idempotency |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts` | configured/task registry propagation and exact member cleanup |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | Host-internal issue/revoke primitives and immutable issued resource |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | route/catalog/authentication parity through the renamed Host |
| `autobyteus-server-ts/tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts` | one builder identity and Host/supervisor/platform close order |
| `autobyteus-server-ts/tests/integration/application-backend/standalone-application-server.integration.test.ts` | preserved real standalone execution/tools/publication with explicit composition |
| `autobyteus-server-ts/tests/integration/application-backend/brief-package-team-prompt.integration.test.ts` | application graph-local Team/provider prompt path under the new issuer/releaser chain |

The two renamed MCP tests in the Rename/Move table are also modified: the Host test covers only process routes/factory/close; the scoped-Authority test covers ASSEMBLING/COMPLETED/ABORTED, atomic ledger insertion, readiness, issue blocking, scoped revoke, and idempotent/aggregate close.

## Current-Tree Occurrence Closure

The focused architecture test owns an exact checked allowlist, not a handwritten substring count that silently ignores new files.

1. Both host files must bind `getWorkspaceManager()` to one local, call `createProcessAgentProviderFactoryBuilder({ workspaceManager })` exactly once, pass that same workspace local to the helper, `GeneralProcessRunSupervisor`, and `buildApplicationPlatformRuntime`, and pass the same builder local to supervisor and platform.
2. The process composition helper must require/non-null-check its workspace input and construct the remaining eighteen named leaves with no null/undefined/default omission. Table-driven builder negative fixtures remove, null, and explicitly `undefined` every one of the nineteen final leaves; helper fixtures cover missing/null/undefined workspace; a second table covers both `createForExecution` inputs.
3. `GeneralProcessRunSupervisor`, `ApplicationExecutionScope`, the kernel builder's callers, and both host roots must have zero provider-specific constructor/getter calls and zero positional `undefined` provider construction.
4. The following governed production files must have zero `AgentToolMcpSessionManager`, `getAgentToolMcpSessionService`, whole Host, or full Authority imports: Codex bootstrapper; Claude manager/session/state; `AgentRunManager`; `AgentRunResourceManager`; `MixedTeamManager`; configured/task registries; member handle. Positive type assertions require the exact issuer or releaser chain named in the contract.
5. The current old-symbol production occurrence set is the following exact twenty paths. Every path is dispositioned in Modify, Rename, or Remove above. After cutover, old Runtime/application-scope/scoped-manager/broad-manager symbols have zero governed production occurrences.

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

6. The current old-symbol durable-test occurrence set is the following exact eleven paths. Every path is dispositioned above; after cutover the old symbols have zero test occurrences.

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
7. Scope outward contracts and runtime/orchestration files must not import the private kernel type or raw run managers. Kernel construction must not expose a generic disposer registry, incomplete result, optional dependency record, or later bind method.
8. The architecture test scans governed roots recursively and fails closed on unresolved imports or a newly matching file not present in the exact target allowlist. Low-level provider constructor tests remain outside the root prohibition but cannot be imported by a supported root.

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
| Unit | builder, Host, Authority, manager failure cleanup, kernel cut points, lifecycle |
| Integration | Codex, Claude, AutoByteus factory behavior; MCP routes; standalone; Brief Team prompt |
| Existing scope baseline | scope contracts, isolation, stream/publication/task cleanup |
| Realistic API/E2E | Studio and standalone Agent/Team launch, configured tools, task delegation, publication, streaming, recovery/reentry, cleanup |
| Durable-test review | every added/modified repository test receives proportional source review before delivery |

## No-Impact Inventory

- no SDK contract/package copy or generated application package change;
- no URL/GraphQL/REST/WS/worker protocol change;
- no database schema, application JSON, run history, binding, Team tree, or migration change;
- no provider selection/model/runtime behavior change;
- no execution multiplicity or definition-authority change.
