# Provider Composition Transition Inventory

Status: Normative implementation and proof supplement.

## Add

| Path | Responsibility |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts` | exact immutable builder, named process dependencies, fresh execution factory set |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-authority.ts` | issuer, releaser, issued-resource, factory contracts |
| `autobyteus-server-ts/src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.ts` | one execution-family ledger/readiness/admission/revocation/close owner |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts` | private complete kernel assembly and reverse partial unwind |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-provider-factory-builder.test.ts` | builder identity/dependency/freshness proof |
| `autobyteus-server-ts/tests/architecture/agent-provider-composition-boundaries.test.ts` | forbidden import/default/old-symbol/escape-hatch guards |

## Rename / Move

| Current | Target | Reason |
| --- | --- | --- |
| `src/agent-tools/mcp/agent-tools-mcp-runtime.ts` | `src/agent-tools/mcp/agent-tools-mcp-host.ts` | name the process endpoint/catalog owner truthfully |
| `tests/unit/agent-tools/mcp/agent-tools-mcp-runtime.test.ts` | `tests/unit/agent-tools/mcp/agent-tools-mcp-host.test.ts` | align test subject |
| `tests/unit/agent-tools/mcp/application-agent-tool-mcp-session-scope.test.ts` | `tests/unit/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.test.ts` | test the unified trusted owner |

## Modify — Production

| Path | Exact Change |
| --- | --- |
| `src/compositions/build-studio-server.ts` | build Host + builder; create/pass general authority; pass authority factory + builder to platform; preserve close order |
| `src/standalone-application-host/start-standalone-application-host.ts` | same explicit composition for standalone |
| `src/application-platform/runtime/build-application-platform-runtime.ts` | replace session factory input with authority factory + provider builder |
| `src/application-platform/execution/application-execution-scope-contracts.ts` | exact new build inputs; outward capabilities unchanged |
| `src/application-platform/execution/application-execution-scope.ts` | remove provider/internal assembly; accept complete kernel; lifecycle calls authority |
| `src/agent-execution/runtime/general-process-run-supervisor.ts` | receive builder + general authority; remove provider constructors/ambient workspace lookup; close owned authority after runs |
| `src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | remain Host-internal; return/align issued-resource shape; no execution-facing broad manager |
| `src/agent-execution/services/agent-run-manager.ts` | require narrow run-session releaser in supported roots; failed-preparation revocation/aggregate cleanup |
| `src/agent-execution/services/agent-run-resource-manager.ts` | narrow session cleanup dependency to releaser |
| `src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | replace broad manager with issuer; preserve issue timing; use issued descriptor |
| `src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts` | descriptor -> named Codex config adapter contract |
| `src/agent-execution/backends/claude/session/claude-session-manager.ts` | replace broad manager with issuer and pass to session state |
| `src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts` | lazy issue/cache issued resource; no authority controls |
| `src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.ts` | descriptor -> named Claude config adapter contract |
| `src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | narrow session cleanup dependency to run releaser |
| `src/agent-team-execution/backends/mixed/mixed-agent-member-handle.ts` | preserve exact run cleanup via releaser |
| `src/agent-team-execution/runtime/configured-agent-resource-registry.ts` | narrow cleanup contract where applicable |
| `src/agent-team-execution/runtime/task-agent-resource-registry.ts` | narrow cleanup contract where applicable |

## Remove

| Path / Symbol | Replacement |
| --- | --- |
| `src/agent-tools/mcp/application-agent-tool-mcp-session-scope.ts` | `ScopedAgentToolMcpSessionAuthority` ledger |
| `src/agent-tools/mcp/scoped-agent-tool-mcp-session-manager.ts` | Authority plus narrow issuer/releaser ports |
| `AgentToolsMcpRuntime`, `createAgentToolsMcpRuntime`, `ApplicationAgentToolsSessionFactory`, `generalProcessSessionManager` | Host/authority/builder composition; no alias |
| scope `BuiltKernel`, `buildScope` tuple, eight constructor values, `sessionManager!` | complete private kernel builder/result |
| direct provider construction in both roots | `AgentProviderFactoryBuilder.createForExecution` |

## Modify — Durable Tests / Fixtures

| Path | Required Proof Update |
| --- | --- |
| `tests/architecture/application-framework-boundaries.test.ts` | keep existing scope guards; add exact new construction/import obligations or delegate non-overlapping checks to the new focused architecture test |
| `tests/unit/application-platform/application-execution-scope.test.ts` | inject builder/authority factory; capability/lifecycle identity; construction cut points |
| `tests/unit/application-platform/application-platform-runtime-isolation.test.ts` | distinct authority/factory/run identities under shared Host |
| `tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts` | explicit builder/authority and close order |
| `tests/unit/agent-execution/agent-run-manager.test.ts` | post-issue create/restore failure revocation and aggregate cleanup |
| `tests/unit/agent-execution/agent-run-resource-manager.test.ts` | narrow releaser, idempotency |
| `tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | issuer/issued descriptor; post-issue later failure witness |
| `tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | real provider adaptation remains valid |
| `tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts` | lazy issuer, once-per-session, retry |
| `tests/integration/agent-execution/claude-session-manager.integration.test.ts` | provider config/materializer behavior |
| `tests/integration/agent-execution/*-agent-run-backend-factory.integration.test.ts` | explicit builder-produced factories |
| `tests/unit/agent-tools/mcp/agent-tools-mcp-host.test.ts` | process routes/factory/close only |
| `tests/unit/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.test.ts` | atomic record, block, scoped revoke, idempotent/aggregate close |
| `tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts` | host/supervisor/platform close order |
| `tests/integration/application-backend/standalone-application-server.integration.test.ts` | preserved real standalone execution/tools/publication |
| `tests/integration/application-backend/brief-package-team-prompt.integration.test.ts` | graph-local Team/provider prompt path |
| relevant mixed Team resource/manager tests | narrow releaser and exact configured/task member cleanup |

## Architecture Occurrence Guards

The focused architecture test shall enumerate the two supported roots and fail on:

1. imports or construction of provider-specific backend factories/bootstrap/session managers in the roots;
2. `undefined` in provider-construction argument positions;
3. `getWorkspaceManager`, `getAgentRunService`, `getTeamRunService`, manager singletons, or Agent Tools service/catalog/registry getters in application execution assembly;
4. the whole Host or Authority passed to provider constructors;
5. the issuer paired with a raw authority/manager at one caller;
6. old Runtime/session-manager/scope symbols after clean removal;
7. optional/generic builder inputs, string tokens, `Record<string, unknown>`, mutable registration, or a manager map;
8. `ApplicationExecutionScope` outward capability contracts exposing the private kernel/raw managers.

Positive fixtures prove exact named inputs. Negative fixtures cover missing/null/undefined builder, authority factory, issuer, and releaser obligations.

## Verification Matrix

| Proof | Required Evidence |
| --- | --- |
| Build/type/lint | affected package typecheck, lint, `git diff --check` |
| Unit | builder, Host, Authority, manager failure cleanup, kernel cut points, lifecycle |
| Integration | Codex, Claude, AutoByteus factory behavior; standalone; Brief Team prompt |
| Existing scope baseline | scope contracts, isolation, stream/publication/task cleanup |
| Realistic API/E2E | Studio and standalone Agent/Team launch, configured tools, task delegation, publication, streaming, recovery/reentry, cleanup |
| Durable-test review | added/modified repository tests receive proportional code review before delivery |

## No-Impact Inventory

- no SDK contract/package copy or generated application package change;
- no URL/GraphQL/REST/WS/worker protocol change;
- no database schema, application JSON, run history, binding, Team tree, or migration change;
- no provider selection/model/runtime behavior change;
- no execution multiplicity or definition-authority change.
