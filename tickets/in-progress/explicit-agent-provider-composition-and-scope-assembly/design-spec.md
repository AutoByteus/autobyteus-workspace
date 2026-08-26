# Design Spec

## Current-State Read

The finalized outer architecture is healthy: Studio and standalone have explicit composition roots; `GeneralProcessRunSupervisor` and `ApplicationExecutionScope` own separate mutable execution families; the scope exposes seven narrow capabilities. ARCH-REV-005 and IR-002 close the Mixed Team manager/member construction family. CRR-003 then traced API-REV-001's deterministic failures one level deeper: each `RootTeamRun` still constructs task identity through the process allocator, all three provider families can construct a context-path resolver backed by the process Team manager, and governed direct `AgentRunManager` fixtures still select an optional resource/activation sidecar chain. The first two are supported production boundary violations masked by host startup order; the third is transition incompleteness, not a product defect.

## Intended Change

Keep the passed outer scope and sound Host/Authority/provider/kernel/Mixed Team implementation. Complete each execution family at the authoritative command boundaries:

1. Build one `AgentRunIdentityAllocator` from the exact family Agent manager plus the existing stored-only V2 Team-tree reader, derive one `TaskTeamRunIdentityFactory` from that same allocator, freeze them as `TaskExecutionIdentityCapabilities`, and require the pair through `AgentTeamRunManager -> RootTeamRun -> TaskDelegationService`.
2. Build one `AgentRunProviderInputNormalizer` from the execution root's explicit path roots and stored-only Team-tree reader. Host composition passes `memoryDir` plus the narrow context-path environment to both execution roots; neither receives broad AppConfig for this selection. Require the normalizer at `AgentRunManager`, pass it into each `AgentRun`, and normalize a copied provider dispatch immediately before backend invocation. Remove context-owner resolution from AutoByteus, Codex, and Claude provider code. At the sibling process REST composition edge, build one explicit stored-tree owner resolver and share it across context-file finalization/read so transport does not select either mutable Team manager.
3. Make `AgentRunManager` a complete lifecycle consumer rather than an infrastructure assembler: require all three backend factories, activation registry, memory recorder, provider-input normalizer, and run-session releaser. General and application roots construct their exact resource/activation graphs explicitly; direct tests use an isolated explicit fixture.

No manager is unified, no execution-family router or late binding is added, and RootTeamRun remains the sole task lifecycle/state/persistence/event owner.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | Intent / Criteria | Trigger | Current Evidence | Approved Outcome | Target Path / Spines |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001–002; AC-001–003 | host boot/close | MCP runtime/roots | same routes; explicit Host and two authorities | DS-001, DS-002, DS-008 |
| BEH-002 | System | REQ-003–004; AC-004–005 | Agent/Team create, restore, task delegation | scope/supervisor/root task constructors | shared builder; fresh exact factories; one family task-identity pair | DS-001–DS-004, DS-009 |
| BEH-003 | Contract | REQ-005; AC-005–007 | provider needs tools or context upload/finalization/input maps a locator | all three provider sources + context REST | narrow issuer/resource/adapter plus explicit stored-owner REST and one pre-provider context normalization | DS-003, DS-004, DS-006, DS-010, DS-011 |
| BEH-004 | Operational | REQ-006; AC-008–009 | provider prep failure | manager/bootstrap trace | immediate per-run revocation | DS-005 |
| BEH-005 | System | REQ-007; AC-005, AC-010–011 | scope/general build/close | manager/root sources | complete resource/activation graph + kernel reverse unwind | DS-002, DS-007, DS-008 |
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
- Evidence: IR-002 closes Mixed Team member construction, while CRR-003 proves that RootTeamRun task identity and provider context mapping still reacquire process managers and that the exact direct-manager transition is incomplete.
- Design response: preserve Host/Authority/Issuer, fixed builder, narrow failure releaser, private kernel, and required Mixed Team callback; extend one complete execution family through RootTeamRun task identity, AgentRun provider-input normalization, and explicit AgentRunManager infrastructure.
- Refactor rationale: each added boundary owns concrete policy/state/lifecycle; none is pass-through-only.
- Deferral: logical application-agent addressing is separately approved. Unrelated provider-local defaults remain outside supported roots, but Agent Tools releaser selection is not a provider-local default and receives no exception in Mixed Team execution.

## Terminology

- **Host:** process owner of Agent Tools MCP endpoint/catalog/registry/dispatcher.
- **Authority:** trusted execution-family owner of issued capability identity, admission, revocation, and close.
- **Authority assembly:** construction-only `ASSEMBLING` transaction that exposes revocation needed by run-resource construction and can only complete once into the full Authority or abort; it never issues sessions or escapes the kernel builder.
- **Issuer:** narrow provider-facing capability that issues one resource.
- **Issued session:** immutable allocated identity plus provider-neutral descriptor.
- **Provider builder:** fixed-purpose constructor policy; not a lookup container.
- **Kernel:** complete private mutable implementation owned by the scope.
- **Task execution identity capabilities:** one immutable pair containing the exact family Agent-run allocator and the task-Team identity factory derived from that allocator; it owns no lifecycle or lookup.
- **Provider-input normalizer:** one execution-family-bound, provider-neutral transformation that copies an admitted message and replaces only resolvable finalized/draft context-file locators with existing local paths immediately before backend dispatch.
- **Context-file path environment:** one frozen `{appDataDir, baseUrl}` value created at a composition edge; it owns validation of the two shared context-path leaves and is not a configuration service.

## Design Reading Order

Behavior -> spines -> Host/Authority and provider boundaries -> kernel/lifecycle -> transition inventory.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove old Runtime/session-scope/session-manager composition shapes.
- No alias, wrapper, dual path, or legacy fallback is allowed.
- Provider-local defaults outside supported roots are not declared legacy; architecture enforcement prevents their application/general root use. The Mixed Team releaser fallback, cached/default factory, optional callback, and built-in default manager are in the governed execution chain and are removed without alias or replacement fallback.

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
| DS-003 | Primary End-to-End | 002,003,006 | application Agent command | provider thread/session | scope / AgentRunManager | exact application issuer, resources, normalizer |
| DS-004 | Primary End-to-End | 002,003,006 | general Agent/Team command | provider thread/session | supervisor / AgentRunManager | exact general issuer, resources, normalizer |
| DS-005 | Return-Event | 004 | post-issue prep failure | revoked session + claim outcome | AgentRunManager | closes resource gap |
| DS-006 | Bounded Local | 003 | issue input | provider-specific MCP config | Authority + adapter | translation boundary |
| DS-007 | Bounded Local | 005 | validate the exact ten-field scope build input | complete kernel transfer or reverse authority unwind | kernel builder | revised exact K0–K8 assembly invariant |
| DS-008 | Return-Event | 001,005,006 | host close | process MCP Host close | host composition | safe lifetime order |
| DS-009 | Primary End-to-End | 002,006 | application/general `delegate_task` | prepared Agent or task Team identity inside the same root | RootTeamRun / TaskDelegationService | no process allocator fallback |
| DS-010 | Bounded Local | 003,006 | admitted Agent input with context locators | provider-formatted input | AgentRun | one copied, exact-family normalization before provider |
| DS-011 | Primary End-to-End | 003,006 | user sends an uploaded Team-member attachment | finalized/readable locator and provider dispatch | context REST composition + AgentRun | stored owner projection bridges transport to exact execution input without manager selection |

## Primary Execution Spine(s)

- DS-001: `buildStudioServer -> AgentToolsMcpHost + AgentProviderFactoryBuilder -> GeneralProcessRunSupervisor -> ApplicationPlatformRuntime -> ApplicationExecutionScope -> configured HTTP/WS surfaces`.
- DS-002: `startStandaloneApplicationHost -> same process owners -> GeneralProcessRunSupervisor -> selected ApplicationPlatformRuntime -> ApplicationExecutionScope -> listen/recover`.
- DS-003: `application command -> orchestration capability -> ApplicationExecutionScope -> scope-owned Agent/Team manager -> AgentRun exact normalizer -> factory bound to application Authority issuer/releaser -> provider or Mixed Team backend`.
- DS-004: `general GraphQL/run command -> GeneralProcessRunSupervisor service -> process-owned Agent/Team manager -> AgentRun exact normalizer -> factory bound to general Authority issuer/releaser -> provider or Mixed Team backend`.
- DS-009: `root-local task command -> TaskDelegationService -> required TaskExecutionIdentityCapabilities -> exact family Agent allocator or derived task-Team factory -> durable mutation -> live RootTeamRun commit`.
- DS-010: `AgentRun admitted dispatch -> copy message/context files -> exact ContextFileLocalPathResolver over stored V2 Team trees -> replace only resolved local URIs -> AutoByteus/Codex/Claude formatter`.
- DS-011: `Team send -> launch/restore durably establishes V2 tree -> /context-files/finalize -> explicit REST layout/stored owner resolver -> durable file + locator -> DS-010 provider dispatch`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | Studio creates process infrastructure once, then two non-identical execution authorities/families, then exposes existing routes. | composition, Host, builder, supervisor, platform, scope | Studio root | definitions/config |
| DS-002 | Standalone repeats the ownership shape for one selected app without mode-switch assembly. | standalone root, Host, builder, supervisor, platform, scope | standalone root | CLI/static/watch |
| DS-003/004 | Run owner obtains exact provider factories and constructs one Mixed Team factory with the same execution Authority's releaser plus a required callback binding the complete execution-family dependencies; recursive managers cannot select or lose authority. | command, scope/supervisor, manager, backend, provider | execution owner | provider adapters |
| DS-005 | Failed preparation cleans run/backend and revokes all sessions for the claimed run before claim completion. | manager, releaser, claim | AgentRunManager | aggregate errors |
| DS-006 | Authority issues/records resource; adapter converts descriptor without exposing trust controls. | authority, issued resource, adapter | Authority | registry/catalog |
| DS-007 | Kernel builder validates input, begins the construction-only authority, builds plain graph objects, completes the authority, builds factories/Agent/Team graphs, freezes one kernel, and transfers it once; failure aborts/closes only the acquired authority in reverse. | builder, authority assembly, full authority, kernel | kernel builder | factories/stores |
| DS-008 | Outer owners quiesce ingress, stop Teams/Agents, close scoped authorities, then process Host. | lifecycle, scope/supervisor, Host | host root | error aggregation |
| DS-009 | Each RootTeamRun owns task sequencing and consumes the immutable identity pair selected by its execution root; Agent and nested task-Team allocation never searches for a manager. | RootTeamRun, task service, identity pair | RootTeamRun | durable V2 tree collision reader |
| DS-010 | AgentRun retains the original admitted/observed message, creates one provider copy at actual dispatch, resolves supported context locators against the durable current Team tree, and gives providers only the copy. | AgentRun, normalizer, provider adapter | AgentRun | context layout/tree read model |
| DS-011 | The UI launches/restores the Team before finalizing the attachment; the process route uses only explicit roots and the durable V2 owner projection, returns the unchanged locator contract, and later input normalization resolves the same stored owner. | Team send, launch/restore, context REST, stored tree, AgentRun | context REST registration + AgentRun | draft cleanup and safe file move |

## Spine Actors / Main-Line Nodes

Composition roots, AgentToolsMcpHost, AgentProviderFactoryBuilder, GeneralProcessRunSupervisor, ApplicationPlatformRuntime, ApplicationExecutionScope, process context REST composition, AgentRunManager, provider backend/client, scoped Authority.

## Ownership Map

- Composition roots own process assembly and close ordering.
- Composition roots are the only execution-host AppConfig selectors; they project explicit memory/app-data/base-URL values into each execution owner.
- Host owns process MCP infrastructure.
- Authority owns trusted scoped capabilities.
- Builder owns provider-construction policy only.
- Execution owners own mutable run families.
- AgentRunManager owns claim/preparation/failure cleanup.
- AgentRun owns command admission/dispatch and the single provider-input copy/normalization point; providers own formatting only.
- Context REST registration owns process transport composition for explicit path roots and one stored Team-owner projection; read/finalization services consume that projection and do not choose an execution manager.
- `AgentTeamRunManager` fixes one immutable `TaskExecutionIdentityCapabilities` identity for every RootTeamRun it creates/restores; RootTeamRun continues to own all task lifecycle/state/persistence/event sequencing.
- Each execution owner selects one `AgentToolMcpRunSessionReleaser`, binds one complete manager-construction callback over its Agent/memory/activity/context/workspace identities, constructs one `MixedTeamRunBackendFactory`, and injects it into its Team manager; neither factory nor recursive manager may infer missing dependencies.
- Kernel builder owns one construction attempt.
- Scope owns capability admission and full application kernel lifecycle.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind | Why | Must Not Own |
| --- | --- | --- | --- |
| existing application scope capability objects | ApplicationExecutionScope | narrow caller contracts | raw managers/provider construction |
| `routeDependencies` | AgentToolsMcpHost | transport registrar integration | execution/session policy |
| `AgentToolMcpSessionIssuer` | scoped Authority | minimum provider privilege | revocation/close/routes |
| context-file HTTP handlers | context REST composition | transport/status mapping | Team-manager selection or path authority defaults |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| old MCP Runtime symbol/file | mixed lifecycle/name | Host | In This Change | clean rename |
| application session scope + scoped manager | overlapping trusted owner | Authority/ports | In This Change | no alias |
| duplicated root provider construction | repeated/default policy | builder | In This Change | exact roots |
| broad manager in providers | excess privilege | issuer/resource | In This Change | adapters retained |
| Root task `AgentRunIdentityAllocator.getInstance()` and `TaskTeamRunIdentityFactory` default allocator | RootTeamRun task authority can silently cross execution families | required immutable task-identity pair selected by the execution root | In This Change | stored-only current V2 tree breaks Agent-before-Team construction cycle |
| provider-local `ContextFileLocalPathResolver` construction in AutoByteus/Codex/Claude | duplicate transform and implicit process Team-owner selection | one required `AgentRunProviderInputNormalizer` before backend dispatch | In This Change | providers keep only vendor formatting |
| `AgentRunManager` optional factories/activation/sidecar/recorder construction | lifecycle owner also selects infrastructure and direct fixtures reach ambient process state | complete required manager input assembled by each execution root | In This Change | no test-driven production optionality |
| Mixed Team ambient releaser fallback, cached zero-argument factory, default manager construction, and manager default factory | lower layer can select or lose the execution family | required root-selected releaser + required root-owned manager-construction capability -> required factory -> required manager input | In This Change | callback carries complete general/application identities; `getInstance` becomes lookup-only |
| partial kernel/tuple/8 args/non-null capture | incomplete assembly contract | kernel builder/result | In This Change | private only |

## Return Or Event Spine(s)

- DS-005: `provider error -> AgentRunManager cleanup -> run-session releaser -> Authority ledger/registry revoke -> claim failure/quarantine -> aggregate error`.
- DS-008: lifecycle errors are accumulated at their owner and returned without skipping later required cleanup.

## Bounded Local / Internal Spines

- Authority assembly: `begin -> expose releaser -> complete exactly once` or `abort`; no issuer exists while incomplete.
- Authority: `assert open/readiness -> create registry session -> record ledger -> return issued resource`; insertion failure revokes before return.
- Kernel builder: `K0 validate -> K1 begin authority -> K2 stored-tree/context/resource/publication prerequisites -> K3 complete authority -> K4 provider factories -> K5 complete Agent graph + identity pair -> K6 Team graph consuming that pair -> K7 freeze kernel -> K8 transfer`; failure reverses the exact construction ledger.
- Mixed Team construction: `execution owner -> exact authority.runSessions + exact execution-family dependency closure -> new MixedTeamRunBackendFactory(required releaser, required createTeamManager) -> AgentTeamRunManager(required factory) -> backend factory invokes root callback -> MixedTeamManager -> configured/task registries -> member handle`; recursive roots reuse the same callback, every arrow preserves one family, and no inner node performs lookup.
- Root task identity: `execution root -> stored-only Team tree reader + exact Agent manager/metadata -> AgentRunIdentityAllocator -> TaskTeamRunIdentityFactory -> frozen TaskExecutionIdentityCapabilities -> AgentTeamRunManager -> RootTeamRun -> TaskDelegationService`; both fields are required, immutable, and carried by identity.
- Provider input: `execution root -> explicit context path roots + stored-only Team tree reader -> ContextFileOwnerResolver -> ContextFileLocalPathResolver -> AgentRunProviderInputNormalizer -> AgentRun -> provider`; AutoByteus/Codex/Claude contain no context-owner construction.
- Context REST: `register routes -> snapshot explicit roots -> stored-only Team locations -> one ContextFileOwnerResolver -> finalization/read -> locator/file response`; upload/finalization/read leaves cannot select a live Team manager.
- Claude session: `first query -> issue -> cache descriptor -> query`; supported retry reuses it.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk if Main Line |
| --- | --- | --- | --- | --- | --- |
| catalog/schema/dispatcher | 001,002,006 | Host | route/tool mechanics | existing subsystem | leaks process infra |
| provider materializers | 003,004,006 | provider backend | descriptor adaptation | existing adapters | mixes trust/vendor shape |
| definitions/workspace/skills | 003,004 | builder/providers | named process collaborators | required inputs | hidden globals/defaults |
| typed authority assembly + fixed construction ledger | 007 | kernel builder | resolves the real publication/resource construction cycle and partial unwind | exact lifecycle | generic container/deferred-binding risk |
| stored V2 Team-tree reader | 009,010,011 | task identity, provider input, and context REST | current durable identity/physical-location projection without a mutable Team manager | existing read model; durability precedes admission | manager router or stale parallel identity model |
| context-file layout/owner/read/finalization | 010,011 | AgentRun and REST composition | safe path mapping, durable owner projection, file move/read | existing context subsystem | transport becomes execution owner |
| provider-input normalizer | 003,004,010 | AgentRun | copy and localize supported context locators once | provider-neutral shared transform | provider-policy blob |
| error aggregation | 005,007,008 | lifecycle owners | preserve primary + cleanup failure | fail visibly | swallowed cleanup |

## Ownership Boundaries

The Host is authoritative above registry/catalog/dispatcher. The scoped Authority is authoritative above its ledger and low-level session service. Execution owners see Authority ports, not Host internals, and are the only run-resource, task-identity, provider-input, Mixed Team releaser, and manager-dependency selection points. `AgentRunManager` consumes the complete family but cannot invent it. RootTeamRun consumes an immutable identity pair but still owns task lifecycle. Providers see only issuer/resource plus already-normalized input; they do not see Team managers, the scope, or the normalizer. The backend factory receives the fixed releaser plus one required root-owned manager-construction capability; it supplies per-Team context/callback inputs and cannot construct a default manager. Scope callers see scope capabilities, never kernel managers. Composition callers use the fixed builder, never provider internals.

## Boundary Encapsulation Map

| Boundary | Internals | Required Callers | Forbidden Bypass | Fix if Thin |
| --- | --- | --- | --- | --- |
| Host | registry/catalog/dispatcher/service | route registrars/composition | direct registry/catalog getter | add exact Host operation |
| Authority | ledger/session service/readiness | execution owner/manager | raw service plus Authority | add narrow issuer/releaser |
| Builder | provider dependencies/constructors | supervisor/kernel builder | direct provider constructors | extend named builder input/output |
| AgentRun | admitted command/provider dispatch | AgentRunManager/Team members/services | provider-specific context-owner lookup or caller-side normalization | extend exact AgentRun command dependency |
| RootTeamRun | task lifecycle/state/persistence/events | Team manager/member tools | process identity allocator or task service lookup | require root identity capability while keeping commands local |
| context REST composition | AppConfig root snapshot + stored owner resolver | route registrar | read/finalization defaults or mutable Team manager | pass one explicit resolver to both services |
| Mixed Team factory | one execution-family releaser + recursive Team backend construction + invocation of required root manager-construction capability | supervisor/kernel builder through required Team manager input | process releaser getter, cached/default factory, built-in default manager, optional callback, lazy manager construction | require both exact inputs; never add lookup |
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

The existing publication/session construction cycle remains solved by one typed construction transaction. `AgentToolMcpSessionAuthorityFactory.begin({scopeIdentity})` returns only `runSessions`, `complete(...)`, and `abort()`, cannot issue sessions, follows `ASSEMBLING -> COMPLETED | ABORTED`, and never leaves the private kernel builder.

`ApplicationExecutionScopeBuildInput` has exactly ten required top-level fields and eleven required leaves: `scopeIdentity`, `memoryDir`, `contextFilePathEnvironment` (`appDataDir`, `baseUrl`), canonical Agent/Team definition services, authority factory, provider builder, workspace manager, publication binding reader, and delivery sink. `contextFilePathEnvironment` is one cohesive immutable value because draft-path resolution needs application data and configured-origin identity while final-path resolution reuses the already-required `memoryDir`; it is not a general configuration bag.

| Phase | Main Work | Owned Closeable / Transfer Rule |
| --- | --- | --- |
| K0 | validate every top-level field and both context-path leaves | none |
| K1 | begin scoped authority assembly | ledger owns `assembly.abort` |
| K2 | build one stored-only V2 Team-tree location reader; exact context-file layout, owner resolver, local-path resolver, and provider-input normalizer; memory, run-file, relay, resource, activation, stores, and publication prerequisites | plain non-started objects; no closer |
| K3 | complete authority with publication capability and current no-op external readiness callback | atomically replace abort with full `authority.close` |
| K4 | create fresh provider factory set from canonical Agent definitions + authority issuer | plain factories; no closer |
| K5 | build the complete Agent graph: required-factory/activation/recorder/normalizer/releaser `AgentRunManager`, metadata/history, one explicit `AgentRunIdentityAllocator` over the same stored-only Team reader, one derived immutable `TaskExecutionIdentityCapabilities`, and Agent services | no run admitted; no closer |
| K6 | build activity/context services and Team graph; require the K5 task-identity capability at `AgentTeamRunManager`; use the existing required Mixed Team callback for exact graph-local Agent/memory/activity/context/workspace/releaser identities | no Team admitted; no closer |
| K7 | build shutdown, stream and projection owners; freeze the complete kernel plus fixed `abortConstruction` | ledger still owns authority |
| K8 | transfer complete kernel to scope | clear builder ledger; kernel/scope exclusively owns authority |

No K2/K4–K7 constructor starts a listener, run, session, worker, or background loop. There remains exactly one construction closeable, with its incomplete-to-complete disposer replacement. A future closeable changes this inventory; it must not be hidden behind a generic disposer-registration hook.

Before the platform runtime is returned, a scope-constructor or later platform-assembly failure invokes the fixed idempotent construction abort once. After return, only normal quiesce/close is legal. Cleanup preserves the original error when cleanup succeeds; if cleanup also fails, all reverse disposers run and `AggregateError` contains the primary at index 0 followed by cleanup errors in actual reverse order.

## Exact Task Identity Boundary

The execution family owns identity allocation; `RootTeamRun` continues to own task commands, state, persistence, events, and settlement. The narrow immutable construction value is:

```ts
export type TaskExecutionIdentityCapabilities = Readonly<{
  agentRuns: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
  taskTeams: Pick<TaskTeamRunIdentityFactory, "create">;
}>;
```

`createTaskExecutionIdentityCapabilities(agentRuns)` validates the allocator, creates exactly one `TaskTeamRunIdentityFactory(agentRuns)`, freezes the pair, and exposes no manager, registry, lookup, or mutation method. `TaskTeamRunIdentityFactory` requires the allocator; its test-only token generator may remain an explicit second constructor argument, but allocator omission/defaulting is removed.

Each supported root constructs one `AgentRunIdentityAllocator` with canonical Agent definitions, its exact `AgentRunManager`, its metadata service, `memoryDir`, and `createStoredTeamRunExecutionTreeLocationService(memoryDir)`. The stored-only V2 read is sufficient and intentionally avoids a manager cycle:

1. both maintained hosts rebuild `TeamRunPackageCatalog` before constructing execution owners, so stored enumeration filters incomplete/unadmitted roots;
2. fresh root creation durably writes tree/tasks/messages and admits the package before `RootTeamRun` materialization/registration;
3. restore requires and loads an admitted stored V2 package before materialization;
4. task activation durably commits the next tree before changing live root state;
5. indeterminate finalization fail-stops the root rather than allowing later allocation from ambiguous state.

The same allocator identity is passed to the execution family's `AgentRunProvisioningService`, `AgentRunService`, `TeamRunService`, and `createTaskExecutionIdentityCapabilities`; the same capability identity is then required through `AgentTeamRunManagerOptions -> RootTeamRun options -> TaskDelegationServiceOptions`. `TaskDelegationService` uses `taskExecutionIdentity.agentRuns` for Agent tasks and `.taskTeams` for nested task Teams. Neither it nor `TaskTeamRunIdentityFactory` imports/calls `AgentRunIdentityAllocator.getInstance()`.

This preserves the existing RootTeamRun-local task spine while making general and application allocator/factory identities observably non-identical. It adds no task router, manager map, application ID lookup, compatibility path, or new lifecycle owner.

## Exact Provider Input Normalization Boundary

Context-file logical locator translation is provider-neutral and belongs immediately above the provider boundary. Add `AgentRunProviderInputNormalizer` under `src/agent-execution/input/` with one operation:

```ts
normalizeForProvider(
  dispatch: AgentRunBackendInputDispatch,
): AgentRunBackendInputDispatch;
```

The normalizer receives an explicitly constructed `ContextFileLocalPathResolver` whose `ContextFileLayout` uses `{appDataDir, memoryDir}`, whose `ContextFileOwnerResolver` uses the same stored-only Team location reader as task identity, and whose URL-origin comparison uses the explicit `baseUrl`. No dependency reads `appConfigProvider` or a Team manager on this governed path.

The process context-file REST surface follows the same authority model at its own composition edge: `registerContextFileRoutes` reads current AppConfig once, projects only the `appDataDir` and `memoryDir` leaves it consumes, constructs one explicit layout and one `ContextFileOwnerResolver` over `createStoredTeamRunExecutionTreeLocationService(memoryDir)`, and passes that exact resolver to both finalization and read services. It does not construct the execution-only `{appDataDir, baseUrl}` environment or depend on an unused base URL. `ContextFileOwnerResolver`, `ContextFileReadService`, and `ContextFileFinalizationService` have no default resolver. This is not an application-scope dependency: the stored V2 tree is the shared durable owner projection, and supported Team send finalizes only after launch/restore has written or loaded that projection. The REST route therefore serves general and application executions without selecting either mutable Team manager.

For each dispatch it creates a new message and new `ContextFile` values, preserves `null` versus array, dispatch kind/turn ID, content, sender type, file type, and file name, and shallow-copies message/file metadata. After `ContextFile` construction it restores source file type/name explicitly so constructor inference cannot reclassify a field. It replaces a URI only when the current resolver returns an existing local file; otherwise it leaves the URI byte-for-byte unchanged. It never mutates the admitted message or its context files; the private provider copy remains mutable for existing AutoByteus workspace-path formatting.

`AgentRun` requires `Pick<AgentRunProviderInputNormalizer, "normalizeForProvider">`. At the last responsible moment inside `executeInputDispatch`, after admission/claim and immediately before `backend.dispatchUserInput`, it normalizes a copy. Admission, lifecycle observers, memory recording, input correlation, accepted/error semantics, and retry timing continue to use the original claimed message.

Provider responsibilities then become uniform:

- AutoByteus `UserInputContextBuildingProcessor` receives a copied, already-normalized message; it keeps workspace-relative/absolute/URL validation and provider prompt assembly but removes its `ContextFileLocalPathResolver` field/import.
- Codex `toCodexUserInput` formats already-normalized absolute paths, file URLs, data URLs and remote URLs; it removes resolver construction/options.
- Claude `ClaudeSession` formats the already-normalized message; `ClaudeSessionDependencies` and session state remove the optional resolver and default.

Missing/invalid locators retain current downstream behavior because the normalizer leaves them unchanged. Draft/final REST locators still resolve at dispatch time, preserving current file-existence timing. This is one transform at the authoritative dispatch boundary, not three provider-specific copies and not a new service chain.

## Exact AgentRunManager Construction Boundary

`AgentRunManagerOptions` becomes a recursively readonly complete record with exactly seven required, runtime-validated fields:

```ts
type AgentRunManagerOptions = Readonly<{
  autoByteusBackendFactory: AgentRunBackendFactory;
  codexBackendFactory: AgentRunBackendFactory;
  claudeBackendFactory: AgentRunBackendFactory;
  activationRegistry: AgentRunActivationRegistry;
  memoryRecorder: AgentRunMemoryRecorder;
  providerInputNormalizer: Pick<AgentRunProviderInputNormalizer, "normalizeForProvider">;
  agentToolMcpRunSessionReleaser: AgentToolMcpRunSessionReleaser;
}>;
```

The manager removes imports/default construction for provider factories, `RunFileChangeService`, published-artifact relay, `AgentRunResourceManager`, activation registry, and process memory recorder. It remains the run claim/preparation/attachment/failure-cleanup/lifecycle owner, but it no longer selects infrastructure. It passes the required normalizer into every `AgentRun` it creates/restores.

The general supervisor explicitly constructs `AgentRunMemoryRecorder -> AgentRunResourceManager -> AgentRunActivationRegistry` from its run-file service, general no-op artifact relay, exact authority releaser, and memory recorder. The exact same recorder identity is passed to the resource manager and AgentRunManager, so attachment/detachment and forwarded-command recording cannot split. The application kernel owns and proves the corresponding same-identity graph. Direct tests use an explicit narrow infrastructure fixture; production parameters never become optional to reduce test setup.

## Exact Mixed Team Releaser And Manager Boundary

The accepted SR-005 boundary remains unchanged. `MixedTeamRunBackendFactoryOptions` has exactly two required inputs: the execution-family `agentToolMcpRunSessionReleaser` and typed `createTeamManager(MixedTeamManagerConstructionInput)`. The callback consumes the factory-owned releaser and binds the root's exact Agent manager, memory location, activity inspector, member-context builder, workspace, recursive factory, task-root resolver, and callbacks. There is no default manager, cached factory/getter, ambient releaser, or optional callback.

`AgentTeamRunManagerOptions` now requires non-empty `memoryDir` and `taskExecutionIdentity` beside the already-required backend factory; the manager removes its AppConfig memory-root fallback. The manager passes the same pair into every fresh/restored `RootTeamRun`; configured child Teams and task Teams continue to reuse the Mixed Team callback. `initializeProcessInstance(options)` is the only process-manager creation entry; `getInstance()` remains no-argument lookup-only and fails before initialization.

| Family | Task Identity | Mixed Team Closure | Forbidden |
| --- | --- | --- | --- |
| general | supervisor allocator + derived task-Team factory | general Agent/memory/activity/context/workspace/authority identities | application scope or singleton lookup inside callbacks/tasks |
| application | K5 allocator + derived task-Team factory | graph-local Agent/memory/activity/context/workspace/authority identities | general process manager/getter or independently selected releaser |
| isolated test | explicit fake/real pair | explicit no-op/recording releaser + subject-specific callback | production defaults or broad fake manager |

## Durable Direct-Constructor Boundary Proof

The transition inventory owns exact current-source sets for every governed constructor, not only retired-symbol matches. It enumerates and dispositions:

- every `new/initialize AgentRunManager` site, requiring all seven fields;
- every direct `AgentRun`, requiring a normalizer;
- every `AgentTeamRunManager`, requiring backend factory and task identity;
- every direct `RootTeamRun` and `TaskDelegationService`, requiring the same task-identity pair;
- every `TaskTeamRunIdentityFactory`, requiring an allocator;
- every Mixed Team factory/manager/member construction from SR-005;
- every provider-local `ContextFileLocalPathResolver` occurrence and every affected Claude session/state, Codex mapper, and AutoByteus processor fixture.

`tests/fixtures/agent-run-manager-infrastructure-fixtures.ts` exposes explicit test-only Agent-run infrastructure fields, not a service locator or production options bag. Its default subject fixture creates a real memory recorder and activation registry backed by an `AgentRunResourceManager` with no-op run-file/artifact attachers and the caller-selected no-op/recording releaser; it also exposes an identity provider-input normalizer only for tests whose subject excludes context resolution. Tests asserting resource behavior construct recording attachers explicitly. Provider-normalization tests use real temporary roots, current context-file layouts, and stored Team V2 trees.

The architecture test derives occurrence sets, compares them with exact allowlists, checks positive required-property shape, and rejects omission, null, explicit `undefined`, casts hiding omission, ambient getter sourcing, broad-manager fakes, provider-local context resolution, or stale allowlist entries. New direct construction fails closed until its responsibility and preserved assertion are recorded.

## Dependency Rules

Allowed:

- composition -> Host, fixed provider builder, explicit memory/context path environment, execution owners;
- execution owner -> scoped Authority ports, stored-only Team-tree reader, explicit path resolver, required provider-input normalizer, complete run infrastructure;
- process context-file REST composition -> explicit AppConfig roots -> one stored-only Team-tree reader/owner resolver -> read/finalization services;
- AgentRunManager -> AgentRun with required normalizer;
- AgentTeamRunManager -> RootTeamRun with required memory root and task identity;
- RootTeamRun -> TaskDelegationService -> immutable task identity -> exact allocator/factory;
- provider backend -> already-normalized dispatch and issuer/descriptor adapter;
- run cleanup -> narrow releaser;
- required Mixed Team factory -> required root-owned manager-construction callback.

Forbidden:

- supported execution paths -> provider constructors/default globals, `AgentRunManager.getInstance()`, `AgentTeamRunManager.getInstance()`, `AgentRunIdentityAllocator.getInstance()`, `getAgentRunService()`, or `getTeamRunService()` for authority selection;
- provider code -> `ContextFileLocalPathResolver`, `ContextFileOwnerResolver`, Team-tree service/manager, AppConfig, full scope, Host, or Authority;
- context-file layout/resolver/read/finalization leaves -> AppConfig or process/application Team manager selection;
- task service/factory -> global allocator, manager, service locator, or optional identity dependency;
- AgentRunManager -> provider/resource/activation/sidecar/global-recorder construction or optional input;
- Mixed Team factory/manager -> process releaser getter, cache, default/lazy manager, optional callback, whole Host/Authority;
- caller -> both a scope capability and its raw manager;
- token lookup, generic DI/container, optional dependency dictionary, manager map, later mutable bind, compatibility alias, or execution-owner unification.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| Host.routeDependencies | process MCP transport | register/dispatch | route/session token | existing wire |
| authority factory/assembly | execution-family session trust | begin/complete/abort | scopeIdentity | fixed transaction |
| issuer / releaser | run MCP resource | issue / revoke | run owner/run ID | least privilege |
| provider builder | provider factory family | explicit construction | definition service + issuer | fixed policy |
| `AgentRunProviderInputNormalizer.normalizeForProvider` | provider-bound command copy | resolve current logical context locators once | execution-family path environment + stored Team tree | no provider dependency |
| process context-file REST composition | context-file transport/storage | build explicit layout and stored owner resolver once | AppConfig-selected roots at route registration | no mutable execution-manager dependency |
| general supervisor constructor | general execution family | assemble/own/close one complete family | seven top-level / eight-leaf narrow input | no AppConfig or application owner |
| `AgentRunManager` constructor | Agent execution family | consume complete factories/resources/normalizer/releaser | exact root-owned identities | seven required fields |
| `TaskExecutionIdentityCapabilities` | task allocation | Agent/task-Team identity allocation | exact execution family | immutable pair |
| `AgentTeamRunManager` / `RootTeamRun` | Team root/task execution | bind exact memory root and carry pair to root-local task owner | memory root + same pair identity | live task ownership unchanged |
| Mixed Team backend factory | recursive Team backend family | bind releaser + root manager construction | exact callback/releaser | no default |
| kernel builder | application kernel | K0–K8 assemble/unwind/transfer | ten top-level / eleven-leaf build input | private complete output |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| Host routes | Yes | Yes | Low | preserve |
| Authority transaction/ports | Yes | Yes | Low | preserve |
| provider builder | Yes | Yes | Low | preserve fixed input |
| provider-input normalizer | Yes per execution family | Yes | Low | one pre-provider transform |
| context-file REST composition | Yes per process route set | Yes | Low | one explicit stored-owner identity |
| general supervisor input | Yes | Yes | Low | exact roots/collaborators; no AppConfig |
| task identity pair | Yes per execution family | Yes | Low | require through Team root |
| Agent manager input | Yes | Yes | Low | remove all optional/default leaves |
| Mixed Team backend factory | Yes | Yes | Low | preserve SR-005 callback |
| kernel builder | Yes | Yes | Low | private complete result |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Risk | Action |
| --- | --- | --- | --- | --- |
| process MCP owner | AgentToolsMcpHost | Yes | Low | preserve |
| trusted scoped owner | ScopedAgentToolMcpSessionAuthority | Yes | Low | preserve |
| narrow creator | AgentToolMcpSessionIssuer | Yes | Low | preserve |
| provider policy | AgentProviderFactoryBuilder | Yes | Medium | prevent container behavior |
| provider-bound transform | AgentRunProviderInputNormalizer | Yes | Low | one dispatch-bound operation |
| task identity pair | TaskExecutionIdentityCapabilities | Yes | Low | capability, not owner/container |
| app private assembly | ApplicationExecutionScopeKernelBuilder | Yes | Low | private |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why | If New |
| --- | --- | --- | --- | --- |
| route/catalog/session mechanics | Agent Tools MCP | Preserve/tighten | already owns mechanics | N/A |
| provider adaptation | AutoByteus/Codex/Claude formatters | Reuse/narrow | format already-normalized input | N/A |
| logical context locator resolution | context-files layout/owner/local resolver | Reuse with exact inputs | existing parsing/path safety and stored-owner rules | one Agent-run normalizer; explicit REST composition |
| collision-safe identity | AgentRunIdentityAllocator + TaskTeamRunIdentityFactory | Reuse/tighten | existing algorithms; remove hidden selection | one immutable pair factory |
| run failure/resource cleanup | AgentRunManager/resource graph | Tighten | correct lifecycle ownership; move construction outward | N/A |
| Team task lifecycle | RootTeamRun/TaskDelegationService | Preserve/tighten | sole current task owner | N/A |
| Mixed Team recursion | existing factory/manager callback | Preserve | SR-005 is correct | N/A |
| outer application behavior | ApplicationExecutionScope | Preserve | passed owner | N/A |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Owners | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP | Host, authority, issuer/resource | 001–006,008 | Host/Authority | Preserve | split lifetimes |
| Agent execution | provider builder, complete manager graph, input normalizer | 003–005,010 | builder/execution root/manager/run | Extend | no provider context lookup |
| Team execution | task identity, Root task lifecycle, Mixed recursion | 006,009 | execution root/RootTeamRun | Extend boundary only | one family identity |
| Application platform execution | private kernel/scope lifecycle | 002,003,007–010 | builder/scope | Extend | outward API unchanged |
| Composition | process wiring/order/path roots | 001,002,004,008–010 | host roots + context REST edge | Modify | no mode builder |

## Draft File Responsibility Mapping

| Candidate | Area | Owner | Concern | One File Why | Reuse |
| --- | --- | --- | --- | --- | --- |
| `agent-run-provider-input-normalizer.ts` | Agent input | Agent execution | copied dispatch locator normalization | one provider-neutral transform | context-file resolvers |
| `task-execution-identity-capabilities.ts` | Team tasks | execution-family construction | frozen Agent/task-Team allocation pair | one cohesive identity boundary | existing allocator/factory |
| `context-file-path-environment.ts` | context-files | execution composition | validate/freeze app-data root + configured origin | reused by the general/application roots within each maintained host | no AppConfig access; REST does not consume it |
| `agent-run-manager.ts` | Agent execution | manager | consume complete graph; claim/run lifecycle | existing lifecycle owner | existing resources |
| `application-execution-scope-kernel-builder.ts` | platform execution | kernel builder | exact K0–K8 app assembly | one attempt lifecycle | all graph-local owners |
| `general-process-run-supervisor.ts` | general execution | supervisor | exact general assembly | one family lifecycle | process infrastructure |
| `context-file-layout.ts` / resolver files | context-files | context subsystem | accept explicit execution roots/origin | existing parser/path owner | no new resolver |

## Reusable Owned Structures Check

| Structure | Shared File | Owner | Why | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| issuer/resource/releaser | authority contract | MCP | exact ports | Yes | Yes | broad manager |
| provider factory set/input | provider builder | Agent execution | roots share policy | Yes | Yes | DI container |
| task identity pair | task capability file | execution family | Agent and nested-Team allocation must share allocator | Yes | Yes | manager/service bag |
| provider dispatch normalizer | Agent input file | Agent execution | all providers share logical locator transform | Yes | Yes | processor registry |
| complete kernel | kernel builder | scope | construction/transfer | Yes | Yes | outward service bag |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Fields? | Redundant Removed? | Parallel Risk | Action |
| --- | --- | --- | --- | --- |
| Issued session | Yes | Yes | Low | no admin methods |
| Builder input/output | Yes | Yes | Low | exact named fields |
| Context path environment | Yes: app data + base URL; memory remains existing sibling field | Yes | Low | frozen value, no generic config |
| Task identity pair | Yes: Agent allocator + derived Team factory | Yes | Low | same identity through root |
| Manager options | Yes: seven required fields | Yes | Low | runtime validate each |
| Kernel | Yes | Yes | Low | private/complete |

## Final File Responsibility Mapping

The exact Add/Modify/Remove/test inventory in `provider-composition-transition-inventory.md` is authoritative. No generic `dependencies`, `services`, resolver registry, or provider registry bag is permitted.

## Applied Patterns

- Factory/builder for fixed provider construction policy.
- Authority with capability ports for trusted session lifecycle.
- Adapter for provider-neutral descriptor to vendor configuration.
- Construction transaction for K0–K8 ownership transfer.
- Last-responsible-moment normalization for one provider-neutral dispatch copy.
- Immutable cohesive capability pair for task identity allocation.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `src/agent-execution/input/agent-run-provider-input-normalizer.ts` | Add | Agent execution | copy/normalize provider-bound dispatch | provider logic, manager lookup, mutation of original |
| `src/agent-team-execution/task-delegation/task-execution-identity-capabilities.ts` | Add | Team execution construction | validate/freeze exact allocator + derived Team factory | run/task lifecycle, manager lookup |
| `src/context-files/domain/context-file-path-environment.ts` | Add | context-file composition | validate/freeze app-data root + absolute base URL | AppConfig access, memory root, service lookup |
| `src/agent-execution/services/agent-run-manager.ts` | Modify | Agent lifecycle | require complete execution inputs | default/global construction |
| `src/agent-execution/domain/agent-run.ts` | Modify | Agent run | invoke required normalizer before backend | context owner/provider branching |
| `src/agent-team-execution/services/agent-team-run-manager.ts` | Modify | Team roots | carry task capability to every root | allocator construction/default |
| `src/agent-team-execution/domain/root-team-run.ts` | Modify | Team root | pass capability to task owner | global selection |
| `src/agent-team-execution/task-delegation/{task-delegation-service-contract.ts,task-delegation-service.ts,task-team-run-identity-factory.ts}` | Modify | Team root task execution | require and consume the exact task identity pair | optional/global allocator or Team-factory selection |
| `src/agent-customization/processors/prompt/user-input-context-building-processor.ts` and Codex/Claude input/session formatters | Modify | provider formatting | consume already-normalized context inputs | context owner/resolver construction |
| `src/context-files/{store,services}` | Modify | context-files | accept explicit roots/origin for governed resolver | execution-manager selection |
| `src/api/rest/context-files.ts` | Modify | process context transport | compose one explicit layout/stored owner projection for read/finalization | AppConfig/Team-manager selection below route edge |
| `src/application-platform/execution/application-execution-scope-kernel-builder.ts` | Modify | app kernel | K0–K8 exact graph | outward API/ambient config |
| `src/agent-execution/runtime/general-process-run-supervisor.ts` | Modify | general owner | exact narrow-input general graph | AppConfig/application owner/global fallback |

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-tools/mcp` | trust infrastructure | Yes | Low | Host and Authority distinct |
| `agent-execution/input` | domain command boundary | Yes | Low | one provider-neutral transform before backend |
| `agent-team-execution/task-delegation` | root task capability/owner | Yes | Low | identity pair supports existing task owner |
| `context-files` | path/owner infrastructure | Yes | Low | keeps parsing/path safety below Agent execution |
| `application-platform/execution` | domain-control assembly | Yes | Low | scope/private kernel |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoid | Why |
| --- | --- | --- | --- |
| task allocation | `root -> required taskIdentity.agentRuns/taskTeams` | `TaskDelegationService -> AgentRunIdentityAllocator.getInstance()` | same execution family |
| context input | `AgentRun -> normalizer(copy) -> backend formatter` | each provider -> default resolver -> process Team manager | one clear spine |
| manager construction | `root builds resources -> new AgentRunManager(all seven)` | manager constructs missing factories/registry/sidecars | exact ownership |
| provider composition | `owner -> builder.createForExecution({definition, issuer})` | positional `undefined` or defaults | explicit policy |
| Mixed Team | `root dependencies + releaser -> required callback -> recursive manager` | default manager/process getter | family closure |
| assembly | `begin -> K2 graph -> complete -> kernel transfer` | partial bag/generic binder | exact lifecycle |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| global task allocator fallback | smaller constructor delta | Rejected | required immutable task capability |
| provider-local context resolver | preserve provider tests | Rejected | one required Agent-run normalizer |
| optional Agent manager infrastructure | reduce fixture setup | Rejected | explicit roots + test fixture |
| broad Team manager in normalizer/allocator | easy live lookup | Rejected | stored-only V2 reader with durability proof |
| old Runtime/manager aliases | reduce edits | Rejected | clean Host/Authority ports |
| optional Mixed Team releaser/callback/default manager | preserve low-level construction | Rejected | accepted SR-005 exact callback |
| dual old/new assembly or normalizer | transition ease | Rejected | atomic cutover |

## Derived Layering (If Useful)

Composition -> execution owner -> complete manager/root capability -> AgentRun/RootTeamRun -> provider/task operation -> provider client or durable task commit. Context-file infrastructure and stored Team read models point upward only through narrow injected operations; provider and task leaves cannot reach composition/global owners.

## Change / Refactor Sequence

1. Add exact task-identity and provider-input-normalizer contracts/tests; add explicit context path environment and resolver inputs; make the process context REST edge construct and share the explicit stored-owner projection.
2. Make `AgentRunManager`/`AgentRun` complete consumers; update both roots and every direct fixture atomically.
3. Require task identity through Team manager -> RootTeamRun -> TaskDelegationService; remove allocator/factory defaults and update direct fixtures.
4. Remove AutoByteus/Codex/Claude context resolver construction and prove formatting of already-normalized absolute, remote, data, missing, draft, final Agent, and nested Team-member inputs.
5. Align K0–K8 with the ten-field/eleven-leaf build input, stored reader reuse, Agent identity before Team manager, and existing authority unwind.
6. Preserve and re-prove SR-005 Mixed Team callbacks, issuer/releaser lifecycle, general/application non-identity, and Team-before-Agent shutdown.
7. Run source-derived occurrence/omission guards and the exact eight CRR-003 failing files first; then focused provider/Team/context coverage, complete server source review, realistic Studio/standalone API/E2E, durable-test review, and delivery verification.

No compatibility alias, dual path, initialization of unrelated globals, or migration may survive any committed state.

## Key Tradeoffs

- The scope build input adds one cohesive context-path environment instead of allowing lower layers to rediscover AppConfig; explicitness is worth the two leaf values.
- The general supervisor replaces broad AppConfig with the same explicit memory/context projection; this adds one top-level field but removes unused configuration authority from the execution owner.
- Stored-only Team-tree reads avoid an execution-manager cycle and may scan durable root packages rather than an active-manager map. Current logical context/identity operations are control-path calls, not event-stream loops; the modest read cost is preferable to a manager router. Correctness depends on existing write-before-live/fail-stop invariants, now explicit proof obligations.
- One AgentRun normalizer adds a narrow operation but deletes three provider policies and makes the provider boundary uniform.
- Complete AgentRunManager construction makes tests more explicit; the narrow fixture absorbs repetition without weakening production contracts.
- Defaults outside governed execution paths are not evidence of correctness; architecture guards enforce the supported roots while this ticket changes only the reachable authority spine.

## Risks

- Normalizing before admission would alter observer/memory semantics; it must occur only on a copied claimed dispatch immediately before backend invocation.
- A stale live-tree cache could miss a task identity collision; only the stored V2 reader is allowed, with write-before-live/fail-stop proof.
- A context resolver that still reads `appConfigProvider` or a process Team manager would preserve the defect under a new wrapper; exact constructor identity and forbidden-import guards prevent this.
- Direct fixtures could hide missing production fields inside a broad bag; the fixture exports named test infrastructure only and occurrence guards inspect constructor literals.
- Existing issuer/releaser and Mixed Team cleanup timing must remain unchanged while the execution-family graph is completed.

## Guidance For Implementation

Implement the normative contracts before callers. Keep all new inputs recursively readonly, runtime-validated, and complete. Reuse one stored-only Team location reader per execution-family construction for both identity and context-owner resolution. Build one task-identity capability and one provider-input normalizer per execution family; pass them by identity, never rediscover them. Normalize only a copy at `AgentRun`'s backend-dispatch boundary. Keep provider adapters free of context-owner/AppConfig/Team-manager imports. Require all seven `AgentRunManager` fields and the task capability at every Team-root constructor. Preserve the accepted required Mixed Team callback/releaser and Authority lifecycle. Treat the exact transition inventory, all eight CRR-003 fixture dispositions, source-derived constructor sets, ambient-getter bans, K0–K8 cuts, dual-family non-identity, RootTeamRun task lifecycle, and realistic Studio/standalone proof as completion criteria.
