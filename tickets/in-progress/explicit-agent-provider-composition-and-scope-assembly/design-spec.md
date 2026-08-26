# Design Spec

## Current-State Read

The finalized outer architecture is healthy: Studio and standalone have explicit composition roots; `GeneralProcessRunSupervisor` and `ApplicationExecutionScope` own separate mutable execution families; the scope exposes seven narrow capabilities. Pressure remains below that boundary. Both roots repeat provider-specific construction and use positional defaults. `AgentToolsMcpRuntime` combines process endpoint/catalog infrastructure with execution-family capability issuance. Providers receive a broad session manager. Scope construction mixes public owner behavior with partial, tuple-based private assembly. Codex can issue a capability before later preparation fails, leaving a pre-attachment cleanup gap.

## Intended Change

Keep the passed outer scope, but introduce one fixed-purpose immutable provider builder; split Agent Tools MCP into process Host and execution-family Authority with issuer/releaser ports; make the run-preparation owner revoke pre-attachment sessions on failure; and move private application kernel construction/unwind into one complete builder.

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
| DS-007 | Bounded Local | 005 | scope build | complete kernel or reverse unwind | kernel builder | assembly invariant |
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
| DS-007 | Kernel builder acquires in order, transfers complete kernel once, or unwinds acquired closables in reverse. | builder, ledger, kernel | kernel builder | factories/stores |
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

- Authority: `assert open/readiness -> create registry session -> record ledger -> return issued resource`; insertion failure revokes before return.
- Kernel builder: `acquire -> record closer -> next`; success transfers; failure reverses closers.
- Claude session: `first query -> issue -> cache descriptor -> query`; supported retry reuses it.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk if Main Line |
| --- | --- | --- | --- | --- | --- |
| catalog/schema/dispatcher | 001,002,006 | Host | route/tool mechanics | existing subsystem | leaks process infra |
| provider materializers | 003,004,006 | provider backend | descriptor adaptation | existing adapters | mixes trust/vendor shape |
| definitions/workspace/skills | 003,004 | builder/providers | named process collaborators | required inputs | hidden globals/defaults |
| construction ledger | 007 | kernel builder | partial unwind | exact lifecycle | generic container risk |
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

## Dependency Rules

Allowed: composition -> Host/builder/execution owners; platform -> scope; execution owner -> builder and Authority ports; builder -> provider adapters/factories; provider -> issuer -> descriptor -> adapter; run cleanup -> releaser.

Forbidden: supported roots -> provider constructors/default globals; provider/scope -> whole Host or registry/catalog; provider -> Authority/releaser; caller -> both scope and raw manager; string/token lookup, generic container, optional dependency dictionary, manager map, later bind, compatibility alias.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| Host.routeDependencies | process MCP transport | register/dispatch | route/session token | existing wire |
| authority factory.create | execution family | create trusted authority | scopeIdentity | exact capabilities |
| issuer.issueForRun | run MCP resource | issue/record | run owner input | immutable return |
| releaser.revokeForRun | run resources | revoke exact run | runId | idempotent |
| builder.createForExecution | provider factory family | explicit construction | definition service + issuer | fixed method |
| kernelBuilder.build | app kernel | assemble/unwind | scope build input | private complete output |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| Host routes | Yes | Yes | Low | preserve |
| authority factory | Yes | Yes | Low | complete input |
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
| assembly | `kernelBuilder.build() -> CompleteKernel` | `partial bag -> tuple -> 8 args` | ownership transfer |
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

1. Add exact authority/resource and builder contracts with tests.
2. Implement Host rename/split and scoped Authority; update route callers.
3. Implement provider builder and adapt Codex/Claude to issuer/resource/provider configs.
4. Add manager failed-preparation releaser before changing roots.
5. Implement kernel builder and switch ApplicationExecutionScope atomically.
6. Switch general supervisor and both host roots to builder/authorities.
7. Remove old runtime/scope/manager/partial assembly symbols and all direct root provider construction.
8. Run occurrence guards, focused tests, full source review, API/E2E, durable-test review, delivery verification.

No temporary compatibility alias or dual public path may survive any committed implementation state.

## Key Tradeoffs

- More named contracts, but each owns or exposes one concrete responsibility and replaces broader/duplicated shapes.
- Provider-local issuer is slightly wider than passing a prebuilt config, but source timing proves provider preparation owns when issuance can occur.
- Defaults remain outside supported roots to avoid unrelated churn; hard guards prevent material regression.

## Risks

- Wrong cleanup ordering could revoke retryable Claude sessions or miss Codex pre-attachment failure.
- A poorly implemented builder could become a service locator.
- Renaming Host touches both composition roots and route tests; clean occurrence checks are mandatory.

## Guidance For Implementation

Implement exact types first. Keep all new input objects `Readonly` and complete. Use private fields and frozen outward projections. Do not expose the kernel. Preserve provider error semantics and existing retry. Aggregate cleanup errors. Treat the transition inventory and negative architecture fixtures as completion criteria, not optional cleanup.
