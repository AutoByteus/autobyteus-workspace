# Design Spec — Universal Application Framework Latest-Personal Integration

## Current-State Read

Two valid but divergent states must be combined.

- **Latest Personal** (`8ef282b...`) owns the current repository and product baseline. It has 238 commits after the merge base, including newer readable-provider/migration startup, provider preparation/publication, unavailable-model behavior, agent activation candidates, RootTeamRun execution trees, rooted `memberAddress` identity, current session and cleanup semantics, and current serialized application contracts.
- **Finalized feature** (`a5ffd28...`) has 115 commits after the merge base and owns the proven Universal Application Dual-Host Foundation: one package in Studio and standalone, explicit host builders, one shared application platform boundary with four projections, standalone ingress, devkit workflow, package launch defaults/overrides/readiness, application-scoped Agent Tools publication, package-source cleanup, and real dual-host/Electron evidence.
- Latest Personal does not contain the dual-host foundation. Conversely, the feature's execution construction targets older run/team owners and cannot replace Personal's current implementations wholesale.
- A real isolated merge produced 177 conflicts. 139 are generated/derived or obsolete builders; about 38 are source/test conflicts. Seventy-seven canonical files changed on both sides and require semantic audit even where Git auto-merged them.

The task pressure is therefore an **integration boundary problem**, not evidence that either whole branch is wrong. The target must preserve both behavior authorities and adapt only the intersecting construction/identity seams.

## Intended Change

Create one integration commit on the dedicated latest-Personal-based ticket branch. Resolve canonical source by an explicit semantic authority matrix, remove derived/mirrored/obsolete paths, adapt the feature's application-scoped runtime construction to Personal's current run/team lifecycle and identities, regenerate package outputs, and re-prove the combined state.

No production file is changed during solution design. Implementation begins only after architecture review.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger Or Contract | Existing Evidence | Approved Change Or Preserved Outcome | Target Path / Spine IDs |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-002; AC-001, AC-002 | Integrate finalized feature onto latest Personal | Git refs, merge base, isolated trial merge | Keep Personal first-parent base and both immutable input histories | DS-001 |
| BEH-002 | User | REQ-003; AC-003, AC-004 | Run application commands from maintained folder | Package/tree comparison | Preserve devkit native workflow and build-once package behavior | DS-002, DS-003 |
| BEH-003 | System | REQ-004, REQ-005; AC-005–AC-008 | App launches agent/team and consumes return events | Personal current managers; feature final dual-host evidence | Use current Personal lifecycle/identity with exact application-scoped dependencies | DS-004–DS-006 |
| BEH-004 | User/Contract | REQ-005; AC-006, AC-009 | Evaluate package default or Studio override | Feature launch service plus Personal model availability | Preserve package baseline/sparse override and current availability blocking | DS-002, DS-003 |
| BEH-005 | Operational | REQ-002, REQ-006; AC-002, AC-010 | Resolve merge | Conflict and overlap inventories | Resolve source semantically; remove/regenerate derived output | DS-001 |
| BEH-006 | Contract | REQ-007; AC-011 | Review/test integrated candidate | Prior branch reports are non-integrated baselines | Execute complete integrated proof | DS-007 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `integration-strategy-analysis.md` | Strategy, authority, critical seam, resolution and verification details | All | Defines the implementation policy used below | Design-ready / approved by delegated direction |
| `merge-attempt.log` | Raw trial merge evidence | REQ-002; AC-002 | Grounds conflict measurement | Complete / N/A |
| `merge-conflict-inventory.txt` | Exact conflict classification | REQ-002, REQ-006 | Drives conflict resolution classes | Complete / N/A |
| `branch-overlap-inventory.txt` | Exact changed-both inventory | REQ-002, REQ-006 | Defines marker-free audit set | Complete / N/A |
| `integration-path-inventory.txt` | Add/modify/remove/regenerate inventory | REQ-003–REQ-007 | Concrete starting file inventory | Complete / N/A |

## Task Design Health Assessment

- Change posture: `Refactor` / integration of a completed larger requirement.
- Current design issue found: `Yes`, only at the branch-intersection boundary.
- Root cause classification: `Boundary Or Ownership Issue` and `Legacy Or Compatibility Pressure`.
- Refactor needed now: `Yes`, bounded to current activation/session/publication construction and identity adaptation.
- Evidence: directly selecting feature execution managers regresses Personal; using Personal defaults loses application-scoped publisher/session identity; the construction order otherwise cycles.
- Design response: keep current domain owners, extract one concrete activation-state owner required for acyclic application construction, and explicitly inject scoped dependencies.
- Refactor rationale: the application publisher must validate against the exact active run before provider factories and the full run manager exist. A narrow activation registry is the smallest truthful early owner.
- Intentional deferrals: no generalized runtime framework, no repository-wide execution rewrite, no public SDK expansion, and no application-owned external MCP provisioning. These are not needed for the integration.

## Terminology

- **Host:** Studio or standalone process boundary that selects and starts an application.
- **Application platform:** shared server capabilities required after host selection; returned as `ApplicationPlatformRuntime` with only four outward projections.
- **Application run scope:** the dependency family for runs created by application business behavior, distinct from deliberately process-wide/general runs.
- **Activation registry:** the concrete owner of pending activation claims and active run identity transitions. It is not a second run manager or service locator.
- **Canonical source:** editable `frontend-src`, `backend-src`, definitions/configuration, and source contracts from which package output is generated.
- **Derived output:** compiled/mirrored `ui`, `backend`, `dist`, vendored, and generated-client content.

## Design Reading Order

Follow the merge spine first, then the two host starts, then the shared run/return/cleanup spines. The ownership and file maps explain how those flows are implemented without reviving obsolete paths.

## Legacy Removal Policy

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove custom application builders, maintained mirrored source/output, old feature-era run/team registries when superseded by Personal, old broad runtime owners, version-suffixed in-scope code symbols, and any alias used only to bridge these internal seams.
- Do not restore Personal-deleted modules merely to compile a feature-era test; move the assertion to the current owner.
- Derived output is deleted and regenerated, never treated as an alternative implementation.

## Persisted Data / State Transition Decision

- Stored subject: Personal server DB/data root and per-application `app.sqlite`/`platform.sqlite`, package records, launch override rows, run history, event journal/cursors, artifact revisions, and provider configuration.
- Relevant change: internal construction and identity plumbing; no new stored schema.
- Normal behavior: Personal migrations/readers remain authoritative; feature package baselines remain computed from immutable definitions and are not seeded into a DB.
- Required invariants: no data reset/copy, no package mutation, no skipped migration, no launch override loss, no run/history corruption.
- Decision: `Directly Usable — No Migration`.
- Rationale: existing stored meanings remain readable by current Personal owners. A ticket-owned transformation offers no benefit and introduces avoidable I/O/corruption risk. Personal's tracked migrations still run before readiness.
- Supports: REQ-004–REQ-007; AC-005, AC-006, AC-009, AC-011.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-005 | Latest Personal ticket branch | Integrated source candidate | Integration change sequence | Prevents blind source selection and generated-file churn |
| DS-002 | Primary End-to-End | BEH-002, BEH-004 | Studio start/import/open | Shared application ready/business UI | `StudioServer` + application lifecycle | Proves hosted mode |
| DS-003 | Primary End-to-End | BEH-002, BEH-004 | `pnpm dev/start` | Standalone ready/business UI | `StandaloneApplicationServer` + application lifecycle | Proves standalone mode |
| DS-004 | Primary End-to-End | BEH-003 | Application business command | Current agent/team execution | Current run/team managers | Preserves Personal lifecycle and identities |
| DS-005 | Return-Event | BEH-003 | Run tool/message/event | Application projection/UI | Scoped MCP/publication/delivery owners | Proves the real useful return path |
| DS-006 | Bounded Local | BEH-003 | Prepare/activate/terminate run | Exact cleanup/revocation | `AgentRunManager` + activation registry | Prevents global fallback, leaks, or replacement races |
| DS-007 | Primary End-to-End | BEH-006 | Integrated source | Reviewed/tested/Electron candidate | Downstream review and coverage owners | Existing branch evidence is insufficient |

## Primary Execution Spine(s)

### DS-001 — Integration

`latest Personal branch -> one no-ff merge of finalized feature -> classify path -> resolve canonical source by authority -> remove legacy/derived paths -> compile -> regenerate packages -> integrated commit`

### DS-002 — Studio

`buildStudioServer -> Personal startup/migration/provider gates -> package registry/import -> catalog reconciliation -> ApplicationPlatformRuntime.start -> launch readiness -> iframe bootstrap -> shared application client -> application business command`

### DS-003 — Standalone

`autobyteus-app dev/start -> buildStandaloneApplicationServer -> selected package -> Personal required startup/migration gates -> launch readiness -> same-origin bootstrap -> shared application client -> application business command`

### DS-004 — Application execution

`application backend command -> launch/profile resolver -> application run service -> current AgentRunManager or AgentTeamRunManager -> current Codex/Claude/AutoByteus backend -> provider execution`

## Spine Narratives

| Spine | Narrative | Main Subjects | Governing Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Git combines histories once; canonical files are decided semantically; disposable output is rebuilt only after source passes. | refs, conflicts, canonical source, generated package | Implementation sequence | evidence capture, lockfile, docs |
| DS-002 | Studio retains its registry/iframe/multi-application shell, but after selection it calls the same shared application boundary as standalone. | package, selected application, runtime projections | Studio server + application lifecycle | provider migration, catalog refresh |
| DS-003 | Devkit selects one package and starts a narrow standalone server; normal business behavior starts only after the same readiness invariant passes. | package, standalone server, runtime projections | Standalone server + application lifecycle | static assets, loopback binding |
| DS-004 | Business demand creates/restores current Personal runs; construction itself creates none. Rooted member identity and current provider lifecycles are retained. | run config, candidate, active run, RootTeamRun | run/team managers | memory, files, capabilities |
| DS-005 | A scoped MCP request or run event uses the exact application run publisher, persists/projections, ensures the app worker, then streams/project results. | session, run, artifact/message, application binding | scoped session manager + publication/delivery | auth token, queues, worker restart |
| DS-006 | Private candidate state becomes active only through explicit publication; removal is identity-checked and all attached resources are released once. | claim, active run, resources | run manager + activation registry | observer detach, session revoke |
| DS-007 | Review/tests re-establish both branch baselines on one integrated commit. | source, package, server, Electron | downstream specialists | credentials/environment |

## Spine Actors / Main-Line Nodes

- `buildStudioServer`
- `buildStandaloneApplicationServer`
- `ApplicationPlatformRuntime` projections and `ApplicationPlatformLifecycle`
- `ApplicationLaunchConfigurationService`
- `AgentRunManager`, `AgentTeamRunManager`, `MixedTeamManager`
- proposed `AgentRunActivationRegistry`
- `AgentToolsMcpRuntime`, `ScopedAgentToolMcpSessionManager`
- `PublishedArtifactPublicationService`
- application artifact delivery/event owners
- application engine controller/launcher and selected application worker
- maintained application backend/frontend

## Ownership Map

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| `StudioServer` assembly root | Studio-only startup, registry/import, iframe, external gateway, current Personal process gates | Application business logic or standalone mode switches |
| `StandaloneApplicationServer` assembly root | one selected package, loopback/static/bootstrap, internal routes, start/stop | Studio registry, iframe, external gateway |
| `ApplicationPlatformLifecycle` | shared startup readiness/recovery/ordered stop | package registry or host UI |
| Runtime projections | exact REST, realtime, lifecycle, host-management contracts | private stores/managers or a 19-field service bag |
| `ApplicationLaunchConfigurationService` | package baseline, sparse override, effective profile, readiness/provenance | UI-side definition traversal or package mutation |
| `AgentRunActivationRegistry` | pending claims, active identity state, identity-checked transitions | backend construction, provider selection, lifecycle orchestration |
| `AgentRunManager` | prepare/restore/publish/abort/terminate and consume cleanup results | process-global fallback on application paths |
| `AgentTeamRunManager` | current root execution trees, persistence, team lifecycle | old flattened identities |
| Scoped MCP manager | application session issue/revoke using exact publisher | external Studio gateway or native provider tools |
| Publication/delivery owners | validate active run, persist/project, queue/ensure/invoke | selecting application packages or global run lookup |
| Devkit | source config, dev/start/pack/validate, deterministic generation | alternate manifest parser or maintained mirrored source |

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| REST registrar | `runtime.rest` subject contracts | HTTP adaptation | runtime stores or lifecycle |
| WebSocket registrar | `runtime.realtime` subject contracts | realtime transport adaptation | session/run construction |
| SDK startup provider | host bootstrap provider | normalize iframe/same-origin wire data | business behavior |
| Devkit CLI | devkit commands and config | native developer entrypoint | duplicate server implementation |

## Removal / Decommission Plan

| Item | Why Unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| `applications/*/scripts/build-package.mjs` | custom duplicated pack logic | devkit config/commands | In this change | removal wins despite changed-both classification |
| maintained `applications/*/ui`, `backend`, `dist` copies | generated/mirrored output | `frontend-src`, `backend-src`, build output | In this change | regenerate only |
| feature-era `ActiveAgentRunRegistry` implementation copied verbatim | targets older manager/resource contract | current-state `AgentRunActivationRegistry` adaptation | In this change | preserve invariants, not obsolete code |
| old feature persistent/task member registries where Personal replaced them | current team domain evolved | current Personal mixed-team owners | In this change | port injection into current owners |
| broad `ApplicationEngineHostService` and removed bind-once seams | final feature already replaced them | controller/launcher/closed delivery owners | In this change | do not restore via merge |
| version-suffixed in-scope code symbols | user-approved clean naming | unversioned names/current numeric wire values | In this change | no alias |
| obsolete durable tests importing removed source | tests implementation, not behavior | assertions through current owners | In this change | never restore source for tests |

## Return Or Event Spine(s)

### DS-005 — Tool/message/artifact return

`provider/native execution -> scoped Agent Tools descriptor -> authenticated /mcp/agent-tools/:sessionId -> exact catalog/dispatcher/provider -> send_message_to or publish_artifacts -> current run event pipeline -> durable snapshot/projection or team handoff -> application delivery queue -> engine launcher.ensureReady -> controller.invoke -> application backend/UI event`

- Native Codex/Claude file tools remain provider-owned and do not pass through the server MCP gateway.
- Studio external `/mcp/gateway` is a separate host integration and is absent from standalone.
- Event/publication failure after durable commit does not roll back persisted artifact state.

## Bounded Local / Internal Spines

### DS-006 — Activation and exact cleanup

Parent: `AgentRunManager` using `AgentRunActivationRegistry`.

`claim(runId) -> build backend/run privately -> attach application-scoped resources -> prepared candidate -> publish exact claim -> active map`

Removal:

`inactive discovery | explicit terminate | replacement | stop-all | registration rollback -> identity-checked removal result -> delete ownership -> revoke scoped sessions + detach file/artifact/memory observers -> aggregate cleanup result`

The registry does not call back into the manager. The manager owns orchestration and consumes explicit results. A stale completion cannot remove a replacement.

### Application lifecycle

`start prerequisites -> definitions/catalog -> platform ready -> listen -> recovery -> business demand` and `stop accepting -> drain transports/queues -> stop workers/runs -> revoke sessions -> close process owners`.

Construction creates no agent/team business run.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves Owner | Responsibility | Why It Exists | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Personal migrations/provider readability | DS-002, DS-003 | server/lifecycle | block readiness until current data/provider state is usable | current Personal invariant | bypassed migrations |
| Launch availability diagnostics | DS-002–DS-004 | launch resolver | retain invalid/unavailable selection and provenance | honest UI/startup | silent fallback |
| Capability token authorization | DS-005 | MCP runtime | scope requests to exact session | internal transport security | ambient tool authority |
| Artifact/event queues | DS-005 | delivery owners | per-run order, restart/ensure, retry/drain | acyclic reliable delivery | generic event bus/cycles |
| Generated package output | DS-001, DS-007 | devkit | deterministic distribution artifact | build-once parity | duplicate source truth |
| Observers/resources | DS-006 | run resource owner | file/artifact/memory/session cleanup | no leaks | bloated manager/callback cycles |

## Ownership Boundaries

Host-specific logic ends at normalized bootstrap and the four application runtime projections. Shared business behavior may not inspect whether it is in Studio or standalone. Process-wide Agent Tools infrastructure owns the route/registry/catalog/dispatcher mechanics; application scope owns issued sessions and the exact publication capability. Current run/team managers own lifecycle; application assembly supplies their scoped collaborators explicitly. Devkit owns packaging; maintained application source does not import server/web/Electron/devkit host internals.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Required Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `ApplicationPlatformRuntime` projections | stores, availability, run/session, engine, recovery | host builders/registrars | registrar receives whole runtime or private store | add subject method to exact projection |
| `ApplicationLaunchConfigurationService` | definition traversal, baseline/override/provenance | Studio/standalone readiness and business launch | UI recomputes baseline or business action supplies missing model | extend resolver projection |
| `AgentRunManager` | run lifecycle over activation registry | application/general run services | direct map mutation/provider factory default | add explicit lifecycle method |
| Scoped MCP session manager | application session issue/revoke | current provider bootstrappers | process/global session default in app path | add explicit scoped operation |
| Publication service | active-run validation and durable publication | publish adapter | global manager/publisher lookup | inject active-run reader/publisher |
| Devkit CLI/config | build/validate/start | maintained app scripts | custom builder or edited generated copy | extend devkit config |

## Dependency Rules

Allowed:

- Host builders depend on runtime builder and only consume the four outward projections.
- Runtime builder depends inward on stores, current managers, launch resolver, MCP runtime, engine/orchestration, and lifecycle.
- Application run construction explicitly injects current definition services, activation registry, scoped session manager, publisher/relay, memory/file observers, and current team-context owner.
- General-process assembly may use named default factories only in the exact process assembly files.
- Applications depend on SDK contracts, not server/web/Electron host internals.

Forbidden:

- `buildServer(mode)` or optional-field common server base.
- application construction calling `getInstance()`/default getters for graph-sensitive run/team/session/publication/context collaborators;
- a generic DI container, service locator, event bus, bind-later publisher, reverse cleanup callback, or silent fallback;
- UI traversal of agent/team definitions to reproduce server precedence;
- standalone registration of `/mcp/gateway`;
- maintained source importing generated mirrors;
- compatibility aliases for deleted internal names.

## Interface Boundary Mapping

| Interface / API | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `buildStudioServer(...)` | Studio server | assemble/start/stop Studio | process + package registry roots | explicit root |
| `buildStandaloneApplicationServer(...)` | standalone server | select one app and assemble/start/stop | packageRoot + applicationId | explicit root |
| runtime `rest` projection | application HTTP subjects | exact REST handlers | applicationId plus subject ID | no private runtime |
| runtime `realtime` projection | application realtime subjects | backend/notification/agent communication | applicationId/run binding | no private session store |
| runtime `hostManagement.catalogReconciliation` | catalog snapshot | reconcile host catalog | package/application identity | Studio host only |
| launch `evaluate/requireRunnable/preview` | execution resource config | baseline/override/readiness | slot + resource + rooted `memberAddress` | server authoritative |
| activation registry operations | agent run identity | claim/register/get/remove exact | `agentRunId` + expected object/token | internal |
| team manager | root team execution | create/restore/terminate | `teamRunId`, rooted `memberAddress` | Personal current model |
| MCP route/session | tool invocation | authenticate and dispatch | `sessionId`, token, run owner/team identity | internal both hosts |
| publication | artifact revision | validate/persist/event/project | `agentRunId`, revision/application binding | exact app publisher |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| four runtime projections | Yes | Yes | Low | retain exact fields |
| launch resolver | Yes | Yes | Medium | use current rooted identity only |
| activation registry | Yes | Yes | Medium | explicit result union, no callback |
| MCP scoped manager | Yes | Yes | Low | inject same session family into route/provider |
| publication | Yes | Yes | Medium | prohibit global fallback |
| devkit config | Yes | Yes | Low | current values, canonical source paths |

## Main Domain Subject Naming Check

| Subject | Name | Self-Descriptive? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Studio assembly | `StudioServer` / `buildStudioServer` | Yes | Low | retain |
| standalone assembly | `StandaloneApplicationServer` / builder | Yes | Low | retain |
| shared live capability bundle | `ApplicationPlatformRuntime` | Mostly; established by prior approved cleanup | Medium | document exact four-field meaning; no rename churn in integration |
| pending/active identity owner | `AgentRunActivationRegistry` | Yes | Low | use instead of ambiguous graph/authority |
| run lifecycle owner | `AgentRunManager` | Yes | Low | retain current Personal name |
| application session owner | `ScopedAgentToolMcpSessionManager` | Yes | Low | retain |
| package propagation | `ApplicationCatalogRefreshCoordinator` | Yes | Low | retain |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why | If New |
| --- | --- | --- | --- | --- |
| two host assembly | feature compositions | Reuse/adapt | already proven | N/A |
| current run lifecycle | Personal agent execution | Extend | preserve current candidates/identity | only activation registry extracted from current state |
| application session/publication | feature MCP/publication | Reuse/adapt | exact scoped behavior proven | N/A |
| current team identity | Personal team execution | Reuse | supersedes feature-era registries | N/A |
| package generation | feature devkit | Extend | native commands and canonical source | adapt contract values |
| model availability | Personal web/server | Extend | current selector retention/blocking | overlay sparse baseline semantics |

## Subsystem / Capability-Area Allocation

| Subsystem | Concerns | Spines | Owners | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Git/task integration | merge classification/resolution | DS-001, DS-007 | implementation/delivery | Extend | one merge commit |
| Server compositions | host-specific assembly | DS-002, DS-003 | two server builders | Extend | no mode switch |
| Application platform | shared projections/lifecycle | DS-002–DS-005 | runtime builder/lifecycle | Reuse/adapt | four fields |
| Agent execution | current run state/lifecycle | DS-004, DS-006 | manager + activation registry | Extend | preserve candidate semantics |
| Team execution | RootTeamRun/member identity | DS-004–DS-006 | current managers | Reuse | no old registry resurrection |
| Agent Tools MCP | route/session/provider | DS-005, DS-006 | process runtime + scoped manager | Reuse/adapt | route in both hosts |
| Launch configuration | package/override/readiness | DS-002–DS-004 | launch service | Reuse/adapt | current availability |
| Devkit/app packages | developer workflow/output | DS-001–DS-003, DS-007 | devkit | Reuse/adapt | remove mirrors |

## Draft File Responsibility Mapping

| Candidate File / Area | Subsystem | Owner / Boundary | Concern | Why One File/Area | Shared Structure |
| --- | --- | --- | --- | --- | --- |
| `.../agent-execution/runtime/agent-run-activation-registry.ts` | agent execution | activation registry | pending/active identity transitions | concrete early state owner | explicit transition result types |
| `.../agent-execution/services/agent-run-manager.ts` | agent execution | run manager | current lifecycle orchestration | existing domain owner | activation registry |
| `.../application-platform/runtime/create-application-run-services.ts` | application platform | application assembly | explicit acyclic construction | exact assembly root for scoped family | runtime contracts |
| `.../compositions/build-*.ts` | compositions | host roots | distinct host assembly | host-specific lifecycle | runtime projections |
| `.../agent-tools/mcp/*` | MCP | process/scoped owners | shared route mechanics + exact publisher | existing capability area | session identity |
| `.../application-platform/launch-configuration/*` | launch config | resolver | baseline/override/readiness | cohesive policy area | provenance/issue shapes |
| `autobyteus-application-devkit/**` | devkit | CLI/pack owner | commands/config/generation | existing package | contract readers |
| `applications/*/{frontend-src,backend-src,...}` | apps | package business code | canonical app source | maintained source | SDK contracts |

## Reusable Owned Structures Check

| Structure | Candidate Shared File | Owner | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| activation transition/removal result | activation registry file | agent execution | manager/publication need exact identity truth | Yes | Yes | generic registry framework |
| runtime projections | `application-platform-runtime-contracts.ts` | application platform | two hosts/registrars share exact boundary | Yes | Yes | service bag |
| launch provenance/issues | launch-config owned types | launch config | Studio/standalone consume same semantics | Yes | Yes | UI policy duplicate |
| bootstrap payload | SDK contract | frontend SDK/contracts | two providers normalize to same client | Yes | Yes | provider wire union in business code |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Meaning? | Redundant Removed? | Parallel Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| activation transition result | Yes | Yes | Low | include exact run/token/reason |
| rooted member launch identity | Yes | Yes | Medium | remove older `memberRouteKey` representation |
| runtime projection contracts | Yes | Yes | Low | freeze four fields |
| package baseline/host override/effective config | Yes | Yes | Medium | keep stages/provenance distinct |
| agent/team run binding | Yes | Yes | Low | retain `agentRunId` vs `teamRunId` distinction |

## Final File Responsibility Mapping

The exhaustive starting inventory is `integration-path-inventory.txt`. These are the governing dispositions:

| Disposition | Exact Files / Patterns | Target Responsibility |
| --- | --- | --- |
| Add/adapt | the 110 `[ADD_FEATURE_ONLY_CANONICAL]` paths, notably `autobyteus-server-ts/src/compositions/build-studio-server.ts`, `build-standalone-application-server.ts`, `application-platform/**`, `standalone-application-host/**`, devkit commands/config, frontend startup providers | Bring forward finalized dual-host behavior but update every interaction to current Personal owners/contracts |
| Modify semantically | all 77 `[MODIFY_BOTH_CANONICAL]` paths | Three-way audit using authority matrix; record resolution owner and protected IDs |
| Add/rename | `autobyteus-server-ts/src/agent-execution/runtime/agent-run-activation-registry.ts` (final path may reuse the feature path only after replacing obsolete semantics) | Current Personal pending/active identity owner required for acyclic application construction |
| Modify | `agent-run-manager.ts`, current Codex/Claude factories/bootstrap/session files, current mixed-team managers/handles/definition context, MCP session/runtime, publication/relay | Explicit application scope over current Personal lifecycle/identity; named general process remains separate |
| Modify | Brief/Socratic `package.json`, devkit config, canonical source, manifests/definitions | native commands, current contracts, Codex/Luna complete defaults |
| Remove | 16 `[REMOVE_LEGACY_CANONICAL]` paths | clean-cut obsolete owners/builders/tests; where also changed-both, removal wins |
| Remove/regenerate | 656 `[REGENERATE_OR_REMOVE_DERIVED]` paths | deterministic build products only |
| Modify/add tests | exact affected architecture/unit/integration/E2E paths in inventory | current-owner assertions, no removed-seam imports |

## Applied Patterns

- **Explicit composition roots:** separate Studio and standalone builders.
- **Narrow projections:** four outward application runtime contracts.
- **Registry plus manager:** early identity/state owner with lifecycle orchestration above it.
- **Scoped capability:** process MCP mechanics plus application-scoped session/publisher.
- **Closed queue:** exact artifact/event delivery, not a generic event bus.
- **Canonical source plus generated package:** one editable source of truth.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/compositions/` | Folder | server assembly | two explicit builders and process/general factories | top-level wiring | business rules, mode switch |
| `.../application-platform/runtime/` | Folder | shared application lifecycle/boundary | runtime contracts/build/lifecycle/reconciliation | platform-owned shared host layer | public private stores, host UI |
| `.../application-platform/launch-configuration/` | Folder | launch resolver | defaults/overrides/readiness/validation | one policy owner | UI rendering |
| `.../agent-execution/runtime/` | Folder | live run state | activation registry and general supervisor | runtime state depth | application package logic |
| `.../agent-execution/services/` | Folder | run control | current manager and run services | domain lifecycle | global fallback in app path |
| `.../agent-tools/mcp/` | Folder | MCP transport/session | process runtime, scoped manager, route | existing capability | external gateway policy mixed in |
| `.../standalone-application-host/` | Folder | standalone host | selection/config/static/bootstrap/transport | explicit host boundary | Studio registry/gateway |
| `autobyteus-application-devkit/` | Package | developer workflow | config/dev/start/pack/validate | reusable app tooling | duplicate server |
| `applications/<app>/frontend-src` | Folder | app UI | canonical UI business source | maintained source | host-specific branch |
| `applications/<app>/backend-src` | Folder | app backend | canonical backend business source | maintained source | compiled output |

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| compositions | assembly | Yes | Low | only roots/factories |
| application-platform | main control | Yes | Low | shared after host selection |
| agent execution | domain/runtime | Yes | Medium | registry vs manager responsibilities explicitly split |
| Agent Tools MCP | transport/capability | Yes | Medium | internal route vs external gateway documented |
| standalone host | transport/host | Yes | Low | isolated from shared behavior |
| app source vs output | domain vs derived | Yes | Low | devkit owns generation |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Host assembly | `buildStudioServer(...)` and `buildStandaloneApplicationServer(...)` both call shared runtime builder | `buildServer({mode})` with optional services | keeps host boundaries explicit |
| Run construction | activation registry -> publisher -> scoped sessions -> factories -> manager | manager singleton -> default publisher -> later rebind | acyclic exact authority |
| Identity | `{teamRunId, memberAddress, agentRunId}` where subjects differ | one `runId`/`memberRouteKey` for all subjects | prevents ambiguous routing |
| Generated conflict | delete and run devkit pack | manually merge `dist/**` | preserves one source of truth |
| Launch config | package baseline + sparse override -> effective/provenance | UI fills missing fields or silently defaults | one policy owner |

## Backward-Compatibility Rejection Log

| Candidate | Why Considered | Decision | Clean Replacement |
| --- | --- | --- | --- |
| Alias old versioned contract symbols | reduce merge edits | Rejected | update in-scope consumers to unversioned names/current values |
| Restore removed feature-era registries | easier feature cherry-pick | Rejected | adapt current Personal owners |
| Retain custom app builders/mirrors | avoid package conflict | Rejected | devkit and canonical source |
| Application fallback to process singletons | simplifies construction | Rejected | explicit activation/scoped-session construction |
| Bind-later/deferred publication proxy | breaks cycle cheaply | Rejected | early concrete activation registry |
| Dual old/new source tree | transitional convenience | Rejected | clean deletion/regeneration |

## Derived Layering

```text
Host assembly (Studio | standalone)
  -> application-platform public projections
    -> launch/orchestration/engine/run boundaries
      -> current agent/team domains + scoped MCP/publication
        -> provider, persistence, worker, transport adapters

Application canonical source + SDK contracts
  -> devkit build
    -> immutable generated/importable package
```

Dependencies point inward. Return events flow outward through explicit publisher/delivery contracts, not reverse imports.

## Change / Refactor Sequence

1. Reconfirm/fetch exact refs and reproduce one merge on the latest-Personal ticket branch.
2. Capture parents/conflicts; classify every path using the retained inventories.
3. Resolve/delete derived output and obsolete custom builders/mirrors first so they cannot influence source decisions.
4. Resolve contracts/SDK/devkit with current numeric values and unversioned in-scope symbols.
5. Bring forward the two explicit host roots, standalone host, frontend startup normalization, and four runtime projections while retaining Personal startup/migration gates.
6. Implement the current-state activation registry extraction; update current `AgentRunManager` without changing candidate semantics.
7. Construct application publication/scoped MCP/provider factories/current run manager in the approved acyclic order; preserve named process assembly separately.
8. Propagate current manager/context/session dependencies through current RootTeamRun/mixed-team/member paths using rooted identity.
9. Resolve launch configuration and Studio editors as feature sparse baseline/override plus current Personal availability/warning behavior; retain Codex/Luna defaults.
10. Resolve application canonical sources and current business changes; port tests off removed seams.
11. Audit all 77 marker-free canonical overlaps and record authority decisions.
12. Compile/typecheck before generation; fix source only.
13. Regenerate packages/output through devkit and prove reproducibility/parity.
14. Run implementation checks, source review, coverage investigation, full dual-host/API/E2E, durable-test review, docs/delivery, and Electron verification.
15. At delivery, refresh Personal again. If it moved, repeat an evidence-backed semantic refresh rather than force the old merge.

No temporary compatibility seam is retained after step 13.

## Key Tradeoffs

- A merge commit is less linear than rebase, but preserves the finalized checkpoint and reduces conflict handling to one auditable point.
- Extracting activation state adds one concrete type, but removes a real construction cycle and prevents application-to-global fallback. Folding everything into the manager would require a later-bound publisher or default singleton.
- Deleting generated artifacts creates a large apparent diff, but avoids parallel source truth and makes future application development simpler.
- Re-running complete dual-host/Electron validation costs time, but the combined state has no prior proof.

## Risks

- Auto-merged code may compile while selecting optional global defaults. Mitigation: exact injection obligations and synthetic omission tests.
- Personal's current lifecycle may have additional invariants not obvious from conflict paths. Mitigation: preserve current files as authority and run affected Personal suites.
- Identity conversion can mix old and current member keys. Mitigation: one rooted identity and removal of parallel representation.
- Generated outputs may hide stale imports. Mitigation: build only after source compiles and compare deterministic package contents.
- Personal may advance again. Mitigation: delivery refresh and repeat classification.
- Provider/Electron environment may be unavailable. Mitigation: truthfully block or record residual evidence gap; do not substitute mocks for the real journey.

## Guidance For Implementation

- Begin from the saved inventories; do not improvise a second integration strategy.
- Never resolve a canonical source directory wholesale with `ours` or `theirs`.
- For every changed-both canonical file, record owner, selected behavior, and BEH/REQ/AC protection in the implementation handoff.
- Treat Personal source as the default structural authority; add the feature behavior through current owners unless the authority matrix explicitly says otherwise.
- Do not port old feature run/team manager source verbatim.
- Make application-scoped dependencies required in the application assembly. Preserve general-process defaults only in named process factories.
- Keep construction free of business run creation.
- Delete generated output before resolving source, and regenerate only after builds pass.
- Do not create/update `implementation-handoff.md` during solution design; the implementation engineer owns it after implementation.
