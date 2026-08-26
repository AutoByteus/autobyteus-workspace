# Design Spec

## Current-State Read

The finalized outer architecture is healthy: Studio and standalone have explicit composition roots; `GeneralProcessRunSupervisor` and `ApplicationExecutionScope` own separate mutable execution families; the scope exposes seven narrow capabilities. Pressure remains below that boundary. Both roots repeat provider-specific construction and use positional defaults. `AgentToolsMcpRuntime` combines process endpoint/catalog infrastructure with execution-family capability issuance. Providers receive a broad session manager. Scope construction mixes public owner behavior with partial, tuple-based private assembly. Codex can issue a capability before later preparation fails, leaving a pre-attachment cleanup gap.

## Intended Change

Keep the passed outer scope, but introduce one fixed-purpose immutable provider builder whose nineteen process inputs have one composition owner; split Agent Tools MCP into process Host and execution-family Authority with construction-only assembly plus issuer/releaser ports; make the run-preparation owner revoke pre-attachment sessions on failure; and move private application kernel construction/unwind into one complete K0–K8 builder transaction.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | Intent / Criteria | Trigger | Current Evidence | Approved Outcome | Target Path / Spines |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001–002; AC-001–003 | host boot/close | MCP runtime/roots | same routes; explicit Host and two authorities | DS-001, DS-002, DS-008 |
| BEH-002 | System | REQ-003–004; AC-004–005 | Agent create/restore | scope/supervisor constructors | shared builder; fresh exact factories | DS-001–DS-004 |
| BEH-003 | Contract | REQ-005; AC-006–007 | provider needs tools | Codex/Claude sources | narrow issuer/resource/adapter | DS-003, DS-004, DS-006 |
| BEH-004 | Operational | REQ-006; AC-008–009 | provider prep failure | manager/bootstrap trace | immediate per-run revocation | DS-005 |
| BEH-005 | System | REQ-007; AC-010–011 | scope build/close | scope source | complete kernel + reverse unwind | DS-002, DS-007, DS-008 |
| BEH-006 | Contract | REQ-008; AC-012 | all existing consumers | passed upstream package | behavior/data unchanged | all |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `provider-composition-and-agent-tools-authority-contract.md` | exact boundary/types/lifecycle | REQ-001–007 | normative structural contract | Approved |
| `provider-composition-transition-inventory.md` | files/tests/guards | all | implementation completeness | Current |
| upstream future review + CRR-006 evidence | triggering audit | all | source evidence | Read-only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor`
- Current design issue found: `Yes`
- Root cause: boundary/ownership issue, duplicated policy/coordination, file responsibility drift.
- Refactor needed now: `Yes`
- Evidence: two roots repeat construction; one MCP object crosses process and execution lifecycles; broad manager leaks below required capability; private scope assembly is partial/positional.
- Design response: Host/Authority/Issuer split, fixed builder, narrow failure releaser, complete private kernel.
- Refactor rationale: each added boundary owns concrete policy/state/lifecycle; none is pass-through-only.
- Deferral: logical application-agent addressing is separately approved; provider-local defaults outside supported roots remain but are forbidden at these roots.

## Terminology

- **Host:** process owner of Agent Tools MCP endpoint/catalog/registry/dispatcher.
- **Authority:** trusted execution-family owner of issued capability identity, admission, revocation, and close.
- **Authority assembly:** construction-only `ASSEMBLING` transaction that exposes revocation needed by run-resource construction and can only complete once into the full Authority or abort; it never issues sessions or escapes the kernel builder.
- **Issuer:** narrow provider-facing capability that issues one resource.
- **Issued session:** immutable allocated identity plus provider-neutral descriptor.
- **Provider builder:** fixed-purpose constructor policy; not a lookup container.
- **Kernel:** complete private mutable implementation owned by the scope.

## Design Reading Order

Behavior -> spines -> Host/Authority and provider boundaries -> kernel/lifecycle -> transition inventory.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove old Runtime/session-scope/session-manager composition shapes.
- No alias, wrapper, dual path, or legacy fallback is allowed.
- Provider-local defaults outside supported roots are not declared legacy; architecture enforcement prevents their application/general root use.

## Persisted Data / State Transition Decision

- Stored subject: no new type is persisted.
- Code-model change: runtime object graph only.
- Readers/writers: unchanged.
- Required semantics/invariants: unchanged.
- Physical/operational constraints: no store access or maintenance window.
- Decision: `Not Affected`.
- Rationale: migration provides no semantic benefit and would add I/O/rollout risk.
- Supports: REQ-008, AC-012.

## Data-Flow Spine Inventory

| Spine | Scope | Behaviors | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | 001,002,006 | Studio boot | configured routes + two execution families | Studio composition | shared host/separate owners |
| DS-002 | Primary End-to-End | 001,002,005,006 | standalone boot | listening/recovered selected app | standalone composition | same boundary in second host |
| DS-003 | Primary End-to-End | 002,003,006 | application Agent command | provider thread/session | scope / AgentRunManager | exact application issuer |
| DS-004 | Primary End-to-End | 002,003,006 | general Agent/Team command | provider thread/session | supervisor / AgentRunManager | exact general issuer |
| DS-005 | Return-Event | 004 | post-issue prep failure | revoked session + claim outcome | AgentRunManager | closes resource gap |
| DS-006 | Bounded Local | 003 | issue input | provider-specific MCP config | Authority + adapter | translation boundary |
| DS-007 | Bounded Local | 005 | validate the exact nine-field scope build input | complete kernel transfer or reverse authority unwind | kernel builder | exact K0–K8 assembly invariant |
| DS-008 | Return-Event | 001,005,006 | host close | process MCP Host close | host composition | safe lifetime order |

## Primary Execution Spine(s)

- DS-001: `buildStudioServer -> AgentToolsMcpHost + AgentProviderFactoryBuilder -> GeneralProcessRunSupervisor -> ApplicationPlatformRuntime -> ApplicationExecutionScope -> configured HTTP/WS surfaces`.
- DS-002: `startStandaloneApplicationHost -> same process owners -> GeneralProcessRunSupervisor -> selected ApplicationPlatformRuntime -> ApplicationExecutionScope -> listen/recover`.
- DS-003: `application command -> orchestration capability -> ApplicationExecutionScope -> AgentRunManager -> builder-produced provider backend -> provider client`.
- DS-004: `general GraphQL/run command -> GeneralProcessRunSupervisor service -> AgentRunManager -> builder-produced provider backend -> provider client`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | Studio creates process infrastructure once, then two non-identical execution authorities/families, then exposes existing routes. | composition, Host, builder, supervisor, platform, scope | Studio root | definitions/config |
| DS-002 | Standalone repeats the ownership shape for one selected app without mode-switch assembly. | standalone root, Host, builder, supervisor, platform, scope | standalone root | CLI/static/watch |
| DS-003/004 | Run owner obtains exact factories from the builder; provider obtains only its execution issuer. | command, scope/supervisor, manager, backend, provider | execution owner | provider adapters |
| DS-005 | Failed preparation cleans run/backend and revokes all sessions for the claimed run before claim completion. | manager, releaser, claim | AgentRunManager | aggregate errors |
| DS-006 | Authority issues/records resource; adapter converts descriptor without exposing trust controls. | authority, issued resource, adapter | Authority | registry/catalog |
| DS-007 | Kernel builder validates input, begins the construction-only authority, builds plain graph objects, completes the authority, builds factories/Agent/Team graphs, freezes one kernel, and transfers it once; failure aborts/closes only the acquired authority in reverse. | builder, authority assembly, full authority, kernel | kernel builder | factories/stores |
| DS-008 | Outer owners quiesce ingress, stop Teams/Agents, close scoped authorities, then process Host. | lifecycle, scope/supervisor, Host | host root | error aggregation |

## Spine Actors / Main-Line Nodes

Composition roots, AgentToolsMcpHost, AgentProviderFactoryBuilder, GeneralProcessRunSupervisor, ApplicationPlatformRuntime, ApplicationExecutionScope, AgentRunManager, provider backend/client, scoped Authority.

## Ownership Map

- Composition roots own process assembly and close ordering.
- Host owns process MCP infrastructure.
- Authority owns trusted scoped capabilities.
- Builder owns provider-construction policy only.
- Execution owners own mutable run families.
- AgentRunManager owns claim/preparation/failure cleanup.
- Kernel builder owns one construction attempt.
- Scope owns capability admission and full application kernel lifecycle.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind | Why | Must Not Own |
| --- | --- | --- | --- |
| existing application scope capability objects | ApplicationExecutionScope | narrow caller contracts | raw managers/provider construction |
| `routeDependencies` | AgentToolsMcpHost | transport registrar integration | execution/session policy |
| `AgentToolMcpSessionIssuer` | scoped Authority | minimum provider privilege | revocation/close/routes |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| old MCP Runtime symbol/file | mixed lifecycle/name | Host | In This Change | clean rename |
| application session scope + scoped manager | overlapping trusted owner | Authority/ports | In This Change | no alias |
| duplicated root provider construction | repeated/default policy | builder | In This Change | exact roots |
| broad manager in providers | excess privilege | issuer/resource | In This Change | adapters retained |
| partial kernel/tuple/8 args/non-null capture | incomplete assembly contract | kernel builder/result | In This Change | private only |

## Return Or Event Spine(s)

- DS-005: `provider error -> AgentRunManager cleanup -> run-session releaser -> Authority ledger/registry revoke -> claim failure/quarantine -> aggregate error`.
- DS-008: lifecycle errors are accumulated at their owner and returned without skipping later required cleanup.

## Bounded Local / Internal Spines

- Authority assembly: `begin -> expose releaser -> complete exactly once` or `abort`; no issuer exists while incomplete.
- Authority: `assert open/readiness -> create registry session -> record ledger -> return issued resource`; insertion failure revokes before return.
- Kernel builder: `K0 validate -> K1 begin authority -> K2 publication/resource prerequisites -> K3 complete authority -> K4 provider factories -> K5 Agent graph -> K6 Team graph -> K7 freeze kernel -> K8 transfer`; failure reverses the exact construction ledger.
- Claude session: `first query -> issue -> cache descriptor -> query`; supported retry reuses it.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk if Main Line |
| --- | --- | --- | --- | --- | --- |
| catalog/schema/dispatcher | 001,002,006 | Host | route/tool mechanics | existing subsystem | leaks process infra |
| provider materializers | 003,004,006 | provider backend | descriptor adaptation | existing adapters | mixes trust/vendor shape |
| definitions/workspace/skills | 003,004 | builder/providers | named process collaborators | required inputs | hidden globals/defaults |
| typed authority assembly + fixed construction ledger | 007 | kernel builder | resolves the real publication/resource construction cycle and partial unwind | exact lifecycle | generic container/deferred-binding risk |
| error aggregation | 005,007,008 | lifecycle owners | preserve primary + cleanup failure | fail visibly | swallowed cleanup |

## Ownership Boundaries

The Host is authoritative above registry/catalog/dispatcher. The scoped Authority is authoritative above its ledger and low-level session service. Execution owners see Authority ports, not Host internals. Providers see only issuer/resource. Scope callers see scope capabilities, never kernel managers. Composition callers use the fixed builder, never provider internals.

## Boundary Encapsulation Map

| Boundary | Internals | Required Callers | Forbidden Bypass | Fix if Thin |
| --- | --- | --- | --- | --- |
| Host | registry/catalog/dispatcher/service | route registrars/composition | direct registry/catalog getter | add exact Host operation |
| Authority | ledger/session service/readiness | execution owner/manager | raw service plus Authority | add narrow issuer/releaser |
| Builder | provider dependencies/constructors | supervisor/kernel builder | direct provider constructors | extend named builder input/output |
| Scope | kernel/managers/authority | orchestration/stream/lifecycle | scope + raw manager | add scope capability method |

## Exact Process Provider Composition Boundary

`autobyteus-server-ts/src/compositions/create-process-agent-provider-factory-builder.ts` is the only provider-policy owner that maps process dependency provenance into the builder. Studio and standalone each bind `getWorkspaceManager()` once, call the helper once with that local, and pass the same workspace local to the helper, `GeneralProcessRunSupervisor`, and `buildApplicationPlatformRuntime`. They pass the same returned builder identity to the supervisor and platform. This removes the supervisor's ambient workspace lookup without returning a service bag from the helper.

The builder constructor input is the exact recursively readonly record in the normative authority contract:

- process workspace and skill owners;
- AutoByteus default Agent factory, LLM constructor, five processor registries, idle waiter, and compaction runner factory;
- Codex skill materializer, workspace resolver, client manager, thread manager, and thread cleanup;
- Claude workspace resolver, skill materializer, and SDK client.

Those are nineteen required leaf selections. The host supplies the already-needed workspace identity; the helper selects the other eighteen from the exact current sources in the contract. The contract's constructor map names every target option/positional argument. `createForExecution` then takes exactly the canonical `AgentDefinitionService` and one execution-family `AgentToolMcpSessionIssuer`. Every call creates fresh AutoByteus/Codex/Claude factories, Codex/Claude bootstrappers, one fresh Claude session manager, and its fresh cleanup; the shared Claude materializer is passed explicitly to both bootstrap and cleanup. It reuses only the named process identities. No supported root may call a provider constructor or provider getter.

This is a fixed composition policy, not a DI container: there are no lookup tokens, provider map, registration method, optional field, generic `dependencies` record, or mutable selection after construction. Only the top-level and nested grouping records are frozen; process service/registry instances retain their owned mutability. Runtime validation and architecture fixtures remove/null/undefined every process and execution field so TypeScript escape hatches cannot silently reactivate defaults.

## Exact Authority And Kernel Construction Boundary

The current graph has one real construction dependency: the publication service needs the activation/resource graph, while scoped session execution capabilities need the publication service. `AgentToolMcpSessionAuthorityFactory.begin({scopeIdentity})` therefore returns a typed construction-only assembly with only `runSessions`, `complete(...)`, and `abort()`. It cannot issue sessions, has the fixed state transition `ASSEMBLING -> COMPLETED | ABORTED`, and cannot leave the private kernel builder.

The kernel builder input has exactly nine required fields: `scopeIdentity`, `memoryDir`, canonical Agent/Team definition services, authority factory, provider builder, workspace manager, publication binding reader, and delivery sink. The precise construction/ownership contract is:

| Phase | Main Work | Owned Closeable / Transfer Rule |
| --- | --- | --- |
| K0 | validate all nine fields | none |
| K1 | begin scoped authority assembly | ledger owns `assembly.abort` |
| K2 | build memory, run-file, relay, resource, activation, stores, and publication prerequisites | plain non-started objects; no closer |
| K3 | complete authority with publication capability and the current no-op external readiness callback; Host/authority open checks remain internal | atomically replace abort with full `authority.close` |
| K4 | create fresh provider factory set from definition service + authority issuer | plain factories; no closer |
| K5 | build Agent manager/services with activation, memory, and authority releaser | no run admitted; no closer |
| K6 | build Team/member/registry services with the same graph-local releaser | no Team admitted; no closer |
| K7 | build shutdown, stream, projection and freeze eight owned kernel dependencies plus fixed `abortConstruction` | ledger still owns authority |
| K8 | transfer complete kernel to scope | clear builder ledger; kernel/scope exclusively owns authority |

No K2/K4–K7 constructor starts a listener, run, session, worker, or background loop. Consequently there is exactly one construction closeable, with its incomplete-to-complete disposer replacement; adding a future closeable is a design/inventory change, not a generic `registerDisposer` hook.

Before the platform runtime is returned, a scope-constructor or later platform-assembly failure invokes the fixed idempotent construction abort once. After return, only normal quiesce/close is legal. Cleanup preserves the original error if it succeeds; if cleanup also fails, all reverse disposers still run and `AggregateError` contains the primary at index 0 followed by cleanup errors in actual reverse order.

## Dependency Rules

Allowed: composition -> Host/builder/execution owners; platform -> scope; execution owner -> builder and Authority ports; builder -> provider adapters/factories; provider -> issuer -> descriptor -> adapter; run cleanup -> releaser.

Forbidden: supported roots -> provider constructors/default globals; provider/scope -> whole Host or registry/catalog; provider -> Authority/releaser; caller -> both scope and raw manager; string/token lookup, generic container, optional dependency dictionary, manager map, later bind, compatibility alias.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| Host.routeDependencies | process MCP transport | register/dispatch | route/session token | existing wire |
| authority factory.begin | execution family construction | begin one typed incomplete authority transaction | scopeIdentity | completion or abort required before escape |
| authority assembly.complete | execution family | fix publication/readiness capabilities and transfer full Authority | same scopeIdentity | one call; issuer does not exist earlier |
| issuer.issueForRun | run MCP resource | issue/record | run owner input | immutable return |
| releaser.revokeForRun | run resources | revoke exact run | runId | idempotent |
| builder.createForExecution | provider factory family | explicit construction | definition service + issuer | fixed method |
| kernelBuilder.build | app kernel | exact K0–K8 assemble/unwind/transfer | nine-field scope build input | private complete output |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| Host routes | Yes | Yes | Low | preserve |
| authority factory | Yes | Yes | Low | complete input |
| construction assembly | Yes | Yes | Low | one fixed completion; no generic deferred binding |
| issuer/releaser | Yes | Yes | Low | keep separate privileges |
| provider builder | Yes | Yes | Low | forbid token lookup/options |
| kernel builder | Yes | Yes | Low | private complete result |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Risk | Action |
| --- | --- | --- | --- | --- |
| process MCP owner | AgentToolsMcpHost | Yes | Low | replace Runtime |
| trusted scoped owner | ScopedAgentToolMcpSessionAuthority | Yes | Low | replace Scope+Manager split |
| narrow creator | AgentToolMcpSessionIssuer | Yes | Low | provider boundary |
| allocated resource | IssuedAgentToolMcpSession | Yes | Low | immutable |
| provider policy | AgentProviderFactoryBuilder | Yes | Medium | prevent container behavior |
| app private assembly | ApplicationExecutionScopeKernelBuilder | Yes | Low | private |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why | If New |
| --- | --- | --- | --- | --- |
| route/catalog/session mechanics | Agent Tools MCP | Extend | already owns mechanics | N/A |
| provider adaptation | Codex/Claude materializers | Reuse/tighten | correct vendor boundary | N/A |
| run failure cleanup | AgentRunManager/resource manager | Extend | already owns claim/resources | N/A |
| outer application behavior | ApplicationExecutionScope | Reuse | passed authoritative owner | N/A |
| provider policy | Agent execution provider area | Create New owned file | duplicated in two roots | existing roots are wrong owners |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Owners | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP | Host, authority, issuer/resource | 001–006,008 | Host/Authority | Extend | split lifetimes |
| Agent execution/providers | builder, backends, failure cleanup | 003–005 | builder/manager | Extend | exact policy |
| Application platform execution | private kernel/scope lifecycle | 002,003,007,008 | builder/scope | Extend | outer API unchanged |
| Composition | process wiring/order | 001,002,008 | host roots | Modify | no mode builder |

## Draft File Responsibility Mapping

| Candidate | Area | Owner | Concern | One File Why | Reuse |
| --- | --- | --- | --- | --- | --- |
| `agent-tools-mcp-host.ts` | MCP | Host | process mechanics/factory | one process lifecycle | existing registry/catalog |
| `agent-tool-mcp-session-authority.ts` | MCP | contracts | exact ports/resource | shared semantic boundary | existing domain types |
| `scoped-agent-tool-mcp-session-authority.ts` | MCP | Authority | ledger/admission/close | one trusted lifecycle | session service |
| `agent-provider-factory-builder.ts` | providers | Builder | construction policy | one fixed policy | provider adapters |
| `create-process-agent-provider-factory-builder.ts` | composition | Process composition | exact provider-source selection from host workspace + eighteen current sources | one provider provenance owner | current process getters/exports |
| `application-execution-scope-kernel-builder.ts` | platform execution | Kernel builder | ordered assembly/unwind | one attempt lifecycle | scope internals |

## Reusable Owned Structures Check

| Structure | Shared File | Owner | Why | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| issuer/resource/releaser | authority contract | MCP | both roots/providers share exact ports | Yes | Yes | broad manager |
| provider factory set/input | provider builder | agent execution | roots share policy | Yes | Yes | DI container |
| complete kernel | kernel builder | scope | construction/transfer | Yes | Yes | outward service bag |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Fields? | Redundant Removed? | Parallel Risk | Action |
| --- | --- | --- | --- | --- |
| Issued session | Yes | Yes | Low | no admin methods |
| Builder input/output | Yes | Yes | Low | exact named fields |
| Kernel | Yes | Yes | Low | private/complete |

## Final File Responsibility Mapping

The exact Add/Modify/Rename/Remove table in `provider-composition-transition-inventory.md` is authoritative. No generic `dependencies`, `services`, or provider registry bag is permitted.

## Applied Patterns

- Factory/builder: fixed provider construction policy.
- Authority with capability ports: trusted ledger/lifecycle with least-privilege projections.
- Adapter: provider-neutral descriptor to vendor configuration.
- Construction transaction: ordered acquisition/reverse unwind inside one kernel builder.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `src/agent-tools/mcp/agent-tools-mcp-host.ts` | File | Host | process MCP infrastructure | correct subsystem/depth | run/provider policy |
| `src/agent-tools/mcp/*session-authority*.ts` | Files | Authority | trusted scoped lifecycle/contracts | same capability area | routes/provider code |
| `src/agent-execution/providers/agent-provider-factory-builder.ts` | File | Builder | provider construction policy | provider ownership | mutable runs/lookup tokens |
| `src/compositions/create-process-agent-provider-factory-builder.ts` | File | Process composition | exact host-workspace + eighteen-leaf provider source selection | keeps globals at the composition edge | returned dependency bag/default selection |
| `src/application-platform/execution/*kernel-builder.ts` | File | Kernel builder | app private assembly | scope implementation depth | public routes/capabilities |

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-tools/mcp` | Persistence-Provider / trust infrastructure | Yes | Low | Host and authority share MCP subject but distinct files |
| `agent-execution/providers` | Off-Spine Concern | Yes | Low | exact provider construction policy |
| `application-platform/execution` | Main-Line Domain-Control | Yes | Low | scope and private kernel |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoid | Why |
| --- | --- | --- | --- |
| provider composition | `owner -> builder.createForExecution({definition, issuer})` | `new Codex...(undefined, ...)` | explicit policy |
| capability | `provider -> issuer -> descriptor` | `provider -> Runtime/Authority/manager` | least privilege |
| assembly | `begin authority -> complete with publication -> CompleteKernel` | `partial bag -> generic deferred bind -> tuple -> 8 args` | typed cycle resolution and ownership transfer |
| cleanup | `manager -> releaser.revokeForRun(runId)` | wait for whole-scope close | exact lifecycle |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| old Runtime alias | reduce rename edits | Rejected | clean Host rename |
| manager adapter around Authority | ease provider migration | Rejected | issuer/releaser directly |
| optional builder inputs/defaults | preserve constructors | Rejected | complete named input |
| dual old/new scope assembly | transition ease | Rejected | one kernel builder cutover |

## Derived Layering (If Useful)

Composition -> execution owners -> run manager -> provider factory/backend -> provider client. Agent Tools Host is process infrastructure; scoped Authority is injected at the execution-owner boundary; providers receive only a downward capability.

## Change / Refactor Sequence

1. Add exact authority/resource/assembly contracts, fixed process-input/builder contracts, and their focused tests.
2. Implement the Host rename/split plus scoped Authority transaction; update route callers while the old execution-facing shapes are removed in the same cut.
3. Add the single process-provider composition helper and fixed builder; adapt Codex/Claude to issuer/resource/provider configs and preserve AutoByteus inputs explicitly.
4. Add the manager failed-preparation releaser and exact mixed-member propagation before switching either execution root.
5. Implement K0–K8 kernel builder and switch `ApplicationExecutionScope` atomically to the one-kernel constructor.
6. Switch the general supervisor and both host roots to the same builder identity and distinct completed authorities.
7. Remove old runtime/scope/manager/partial assembly symbols and all direct root provider construction; do not leave an intermediate alias/default path.
8. Run exact occurrence allowlists, omission/null/undefined fixtures, kernel cut points, focused tests, full source review, API/E2E, durable-test review, and delivery verification.

No temporary compatibility alias or dual public path may survive any committed implementation state.

## Key Tradeoffs

- More named contracts, but each owns or exposes one concrete responsibility and replaces broader/duplicated shapes.
- Provider-local issuer is slightly wider than passing a prebuilt config, but source timing proves provider preparation owns when issuance can occur.
- Defaults remain outside supported roots to avoid unrelated churn; hard guards prevent material regression.

## Risks

- Wrong cleanup ordering could revoke retryable Claude sessions or miss Codex pre-attachment failure.
- A poorly implemented builder could become a service locator; the exact nineteen-leaf contract and recursive occurrence/fixture guards prevent that shape.
- A generic deferred capability binder would hide the construction cycle; only the fixed assembly transaction is permitted.
- Renaming Host touches both composition roots and route tests; clean occurrence checks are mandatory.

## Guidance For Implementation

Implement the exact normative contract before changing callers. Keep all new input objects recursively `Readonly`, runtime-validated, and complete. Use private fields and frozen outward projections. Do not expose the dependency record, construction assembly, or kernel. Preserve provider error semantics and existing retry. Aggregate cleanup errors in the defined order. Treat the exact transition inventory, current-tree occurrence allowlists, per-field omission fixtures, and K0–K8 cut points as completion criteria, not optional cleanup.
