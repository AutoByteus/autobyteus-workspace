# Design Spec — Universal Application Framework Latest-Personal Integration

## Current-State Read

Two valid but divergent states must be combined.

- **Latest Personal** (`8ef282b...`) owns the current repository and product baseline. It has 238 commits after the merge base, including newer readable-provider/migration startup, provider preparation/publication, unavailable-model behavior, agent activation candidates, RootTeamRun execution trees, rooted `memberAddress` identity, current session and cleanup semantics, and current serialized application contracts.
- **Finalized feature** (`a5ffd28...`) has 115 commits after the merge base and owns the proven Universal Application Dual-Host Foundation: one package in Studio and standalone, explicit host builders, one shared application platform boundary with four projections, standalone ingress, devkit workflow, package launch defaults/overrides/readiness, application-scoped Agent Tools publication, package-source cleanup, and real dual-host/Electron evidence.
- Latest Personal does not contain the dual-host foundation. Conversely, the feature's execution construction targets older run/team owners and cannot replace Personal's current implementations wholesale.
- A real isolated merge produced 177 conflicts. 139 are generated/derived or obsolete builders; about 38 are source/test conflicts. Seventy-seven canonical files changed on both sides and require semantic audit even where Git auto-merged them.
- The finalized required-tool loader has six server specs but labels them seven. The actual seventh source-backed unit is Core `registerTools()`, currently reached early through both provisioned Search and eager `defaultAgentFactory` construction; no independent Skills tool registrar exists.

The task pressure is therefore an **integration boundary problem**, not evidence that either whole branch is wrong. The target must preserve both behavior authorities and adapt only the intersecting construction/identity seams.

## Intended Change

Create one integration commit on the dedicated latest-Personal-based ticket branch. Resolve canonical source by an explicit semantic authority matrix, remove derived/mirrored/obsolete paths, adapt the feature's application-scoped runtime construction to Personal's current run/team lifecycle and identities, regenerate package outputs, and re-prove the combined state.

No production file is changed during solution design. Implementation begins only after architecture review.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger Or Contract | Existing Evidence | Approved Change Or Preserved Outcome | Target Path / Spine IDs |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-002; AC-001, AC-002 | Integrate finalized feature onto latest Personal | Git refs, merge base, isolated trial merge | Keep Personal first-parent base and both immutable input histories | DS-001 |
| BEH-002 | User | REQ-003; AC-003, AC-004 | Run application commands from maintained folder | Package/tree comparison | Preserve devkit native workflow and build-once package behavior | DS-002, DS-003 |
| BEH-003 | System | REQ-004, REQ-005; AC-005–AC-008 | App launches agent/team and consumes return events | Personal current managers; feature final dual-host evidence | Use current Personal lifecycle/identity with exact application-scoped dependencies | DS-004–DS-006, DS-008 |
| BEH-004 | User/Contract | REQ-005; AC-006, AC-009 | Evaluate package default or Studio override | Feature launch service plus Personal model availability and stored current-rooted rows | Preserve package baseline/sparse override and current availability blocking through one direct-use store | DS-002, DS-003, DS-009 |
| BEH-005 | Operational | REQ-002, REQ-006; AC-002, AC-010 | Resolve merge | Conflict and overlap inventories | Resolve source semantically; remove/regenerate derived output | DS-001 |
| BEH-006 | Contract | REQ-007; AC-011 | Review/test integrated candidate | Prior branch reports are non-integrated baselines | Execute complete integrated proof | DS-007 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `integration-strategy-analysis.md` | Strategy, authority, critical seam, resolution and verification details | All | Defines the implementation policy used below | Design-ready / approved by delegated direction |
| `integration-runtime-contracts.md` | Exact host lifecycle, current activation/provisioning adaptation, construction obligations, file dispositions, launch store/direct-use proof, and verification delta | REQ-004–REQ-007; AC-005–AC-011 | Normative detail for DS-002–DS-006 and the persisted-data decision | Design-ready / approved preserved-behavior precision |
| `merge-attempt.log` | Raw trial merge evidence | REQ-002; AC-002 | Grounds conflict measurement | Complete / N/A |
| `merge-conflict-inventory.txt` | Exact conflict classification | REQ-002, REQ-006 | Drives conflict resolution classes | Complete / N/A |
| `branch-overlap-inventory.txt` | Exact changed-both inventory | REQ-002, REQ-006 | Defines marker-free audit set | Complete / N/A |
| `integration-path-inventory.txt` | Add/modify/remove/regenerate inventory | REQ-003–REQ-007 | Concrete starting file inventory | Complete / N/A |

## Task Design Health Assessment

- Change posture: `Refactor` / integration of a completed larger requirement.
- Current design issue found: `Yes`, only at the branch-intersection boundary.
- Root cause classification: `Boundary Or Ownership Issue` and `Legacy Or Compatibility Pressure`.
- Refactor needed now: `Yes`, bounded to current activation/session/publication construction and identity adaptation.
- Evidence: directly selecting feature execution managers regresses Personal; using Personal defaults loses application-scoped publisher/session identity; the construction order otherwise cycles. Separately, the feature readiness owner labels six server registrars as seven while Core is triggered through Search and eager factory construction before lifecycle readiness.
- Design response: keep current domain owners, extract one concrete activation-state owner required for acyclic application construction, explicitly inject scoped dependencies, and make `AgentToolRegistryReadiness` the sole application-host registration owner with Core first and provisioned Search last.
- Refactor rationale: the application publisher must validate against the exact active run before provider factories and the full run manager exist. A narrow activation registry is the smallest truthful early owner.
- Intentional deferrals: no generalized runtime framework, no repository-wide execution rewrite, no public SDK expansion, and no application-owned external MCP provisioning. These are not needed for the integration.

## Terminology

- **Host:** Studio or standalone process boundary that selects and starts an application.
- **Application platform:** shared server capabilities required after host selection; returned as `ApplicationPlatformRuntime` with only four outward projections.
- **Application run scope:** the dependency family for runs created by application business behavior, distinct from deliberately process-wide/general runs.
- **Activation registry:** the concrete owner of tokenized pending activation claims, active run identity, admission during stop, and identity-checked state transitions. It is not a second run manager, backend owner, or service locator.
- **Application session scope:** the early application-owned index that records and revokes Agent Tools MCP session identities. It owns no dispatch or publication policy and exists before the scoped session manager to keep construction acyclic.
- **Canonical source:** editable `frontend-src`, `backend-src`, definitions/configuration, and source contracts from which package output is generated.
- **Derived output:** compiled/mirrored `ui`, `backend`, `dist`, vendored, and generated-client content.

## Design Reading Order

Follow the merge spine first, then the two host starts, then the shared run/return/cleanup spines. The ownership and file maps explain how those flows are implemented without reviving obsolete paths.

## Legacy Removal Policy

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove custom application builders, maintained mirrored source/output, feature `ActiveAgentRunRegistry`, feature `mixed-persistent-member-registry`/`mixed-task-agent-instance-registry`, the Personal execution-resource configuration service/store/normalizer replaced by the single launch owner, old broad runtime owners, version-suffixed in-scope code symbols, and any alias used only to bridge these internal seams.
- Do not restore Personal-deleted modules merely to compile a feature-era test; move the assertion to the current owner.
- Derived output is deleted and regenerated, never treated as an alternative implementation.

## Persisted Data / State Transition Decision

- Stored subject: Personal server DB/data root and per-application `app.sqlite`/`platform.sqlite`, package records, launch override rows, run history, event journal/cursors, artifact revisions, and provider configuration.
- Relevant change: internal construction/identity adaptation and replacement of two semantic readers over the existing `__autobyteus_resource_configurations` table; there is no new physical schema.
- Single launch-row owner: target `application-launch-override-store.ts`; remove Personal `application-execution-resource-configuration-store.ts`, its service, and its launch-profile normalizer.
- Supported persisted value: `launch_profile_json` is a sparse `AGENT` or `AGENT_TEAM` host override. Team members use current rooted `memberAddress`, `displayName`, and `agentDefinitionId`; `memberRouteKey`/`memberName` are not a target contract.
- Direct-use proof: current Personal agent rows have the same target agent fields. Current rooted team rows have the same target team/default/member fields and are valid sparse overlays even when they enumerate every member. Null `resource_ref_json` continues to select the immutable package default; a saved shared resource first receives its own definition-derived baseline.
- Reader policy: store cells are safe-parsed as absent/parsed/malformed; `ApplicationLaunchConfigurationService` validates and evaluates. Read/list/preview never writes, deletes, seeds, normalizes, converts `launch_defaults_json`, or silently falls back. Invalid, stale, unavailable, legacy-default-only, or obsolete-member-field rows remain diagnosable and explicitly resettable.
- Writer policy: only explicit Studio Save writes the normalized current-rooted sparse shape and `NULL` legacy defaults; only explicit Reset deletes the row. Package defaults remain computed from immutable definitions and are never copied into a DB.
- Required invariants: no data reset/copy, no package mutation, no skipped migration, no launch override loss or silent repair, no run/history corruption.
- Decision: `Directly Usable — No Migration` for valid current Personal rows; malformed/obsolete rows are not transformed and remain explicit non-runnable saved state.
- Rationale: physical storage and current rooted semantics already fit the target. A migration or read-time compatibility branch adds risk without benefit. Personal's tracked migrations still run before readiness.
- Normative examples and outcome table: [integration-runtime-contracts.md](integration-runtime-contracts.md), section 3.
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
| DS-008 | Bounded Local | BEH-003 | Host process prerequisite entry | READY or reverse unwind | Explicit host starter + `ApplicationPlatformLifecycle` | Prevents skipped/duplicated current Personal phases across hosts |
| DS-009 | Primary End-to-End | BEH-004 | Package baseline or saved current-rooted row | Effective profile/readiness or explicit blocking issue | `ApplicationLaunchConfigurationService` + one override store | Proves Directly Usable — No Migration without fallback |

## Primary Execution Spine(s)

### DS-001 — Integration

`latest Personal branch -> one no-ff merge of finalized feature -> classify path -> resolve canonical source by authority -> remove legacy/derived paths -> compile -> regenerate packages -> integrated commit`

### DS-002 — Studio

`server-runtime logging/core migration/protected paths/Prisma/token schema/vault/app-data policy -> buildStudioServer(process MCP/general runs + registry/definitions/application platform + routes) -> ApplicationPlatformLifecycle.prepareBeforeListen -> listen -> Studio transports/internal URL/messaging -> ApplicationPlatformLifecycle.recoverAfterListen -> launch readiness -> iframe bootstrap -> shared application client -> application business command`

### DS-003 — Standalone

`autobyteus-app dev/start -> resolve/validate selected package and isolated root -> logging/core migration/protected paths/Prisma/token schema/vault/app-data policy -> process MCP/general runs + selected application platform -> buildStandaloneApplicationServer -> ApplicationPlatformLifecycle.prepareBeforeListen -> listen/internal URL -> recover selected application -> launch readiness -> same-origin bootstrap -> shared application client -> application business command`

### DS-004 — Application execution

`application backend command -> ApplicationLaunchConfigurationService.requireRunnableConfiguration -> current AgentRunProvisioningService or current team preparation -> current StandaloneAgentRunActivationService -> current AgentRunManager/AgentTeamRunManager -> current Codex/Claude/AutoByteus backend -> provider execution`

### DS-009 — Launch configuration and persistence

`immutable package resource/default definitions -> optional saved resource row from ApplicationLaunchOverrideStore -> selected-resource baseline -> current-rooted sparse override validation/overlay -> per-leaf effective profile/provenance -> current host availability -> RUNNABLE or explicit blocking state`

Reads never write. Explicit Studio Save is the only upsert path; explicit Reset is the only delete path.

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
| DS-008 | Each host runs the exact Personal process prerequisites, then one shared application prepare/recovery sequence; failure reverses only constructed owners and close drains application owners before process/data owners. | process resources, readiness, listener, recovery, close | explicit host starter + application lifecycle | fatal translation, background scheduling |
| DS-009 | Current saved rows overlay a definition-derived selected baseline through one semantic owner; invalid state remains visible and resettable. | package baseline, stored row, effective profile | launch configuration service | safe JSON parse, availability diagnostics |

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
| Studio host starter / `buildStudioServer` assembly root | Starter owns Personal process prerequisites, post-listen Studio transports/background/fatal translation; builder owns registry/import, iframe-facing APIs, external gateway, process/application construction, routes/hooks | Application business logic, standalone mode switches, shared application readiness implementation |
| Standalone host starter / `buildStandaloneApplicationServer` assembly root | Starter owns selected package/root, Personal process prerequisites, listener/recovery/returned close; builder owns loopback/static/bootstrap/internal routes/hooks | Studio registry, iframe, external gateway, duplicated shared readiness |
| `ApplicationPlatformLifecycle` | workspace/customization/Core-plus-six-server-tool/session/catalog/built-in/definition readiness, application recovery, ordered application stop | process DB/vault/migrations, process transports/background work, package registry, host UI |
| `AgentToolRegistryReadiness` | one memoized process registration of Core, Browser, Task Delegation, Agent Communication, Published Artifact, Media, then provisioned Search | Skills, external MCP registration, AgentFactory construction, background retries, or business-run creation |
| Runtime projections | exact REST, realtime, lifecycle, host-management contracts | private stores/managers or a 19-field service bag |
| `ApplicationLaunchOverrideStore` | one physical table-row owner; safe parse and explicit upsert/delete only | baseline/overlay/readiness policy or read-time repair |
| `ApplicationLaunchConfigurationService` | package and selected-resource baselines, current-rooted sparse override validation, effective profile, readiness/provenance, explicit Save/Reset | UI-side definition traversal, second store, read-time rewrite, package mutation |
| `ApplicationAgentToolMcpSessionScope` | early session ownership index and exact revoke/block/close | route dispatch, catalog selection, publication |
| `AgentRunResourceManager` | attach/release file, artifact, memory observers and exact application session revocation | backend termination or active-map policy |
| `AgentRunActivationRegistry` | tokenized pending claims, active identity state, stop admission, identity-checked transitions | backend construction/termination, metadata, provider selection, lifecycle orchestration |
| `AgentRunManager` | prepare/restore backend and run privately, candidate callbacks, terminate, track in-flight preparation, consume registry/resource results | durable metadata commit or process-global fallback on application paths |
| `AgentRunProvisioningService` / `StandaloneAgentRunActivationService` | durable PREPARED lifecycle and metadata-before-publication activation/restore/quarantine respectively | active-map ownership or global application dependencies |
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
| direct `server-runtime.ts` Search registration and background Agent Tools task | create hidden/pre-readiness duplicate registration paths | lifecycle-owned `AgentToolRegistryReadiness` | In this change | Studio and standalone use the same awaited owner |
| `loadAllAgentTools` export/wrapper | empty second entrypoint around the readiness owner | direct `AgentToolRegistryReadiness` use | In this change | update the three current E2E setup callers; no compatibility alias |
| Search-to-Core chaining and `AgentFactory` Core-registration side effect | allow registry mutation before lifecycle readiness and obscure ownership | explicit Core unit first in `AgentToolRegistryReadiness`; Search-only replacement last | In this change | retain the existing Core registrar and AgentFactory behavior apart from the unrelated side effect |
| feature-era `active-agent-run-registry.ts` copied verbatim | active-only shape omits Personal pending claim/candidate state | current-state `agent-run-activation-registry.ts` plus adapted resource manager | In this change | preserve current candidate/provisioning invariants, not obsolete code |
| feature `mixed-persistent-member-registry.ts` and `mixed-task-agent-instance-registry.ts` | current Personal replaced their identity/lifecycle roles | current `mixed-configured-member-registry.ts`, `mixed-task-agent-execution-registry.ts`, and `mixed-task-team-execution-registry.ts` | In this change | these paths are explicitly removed from the target add/modify inventory |
| Personal `application-execution-resource-configuration-store.ts`, service, and launch-profile normalizer | compete with the launch service/store over the same table and full-profile semantics | one `ApplicationLaunchConfigurationService` + `ApplicationLaunchOverrideStore` using current rooted sparse shape | In this change | no dual reader/writer |
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

Parent: current provisioning/activation services and `AgentRunManager`, using `AgentRunActivationRegistry` and `AgentRunResourceManager`.

Fresh activation:

`validate/allocate -> durable PREPARED metadata -> claim(runId) before provider await -> private backend/run -> attach exact application resources -> AgentRunActivationCandidate -> validate provider identity -> durable started metadata -> synchronous publish(exact claim/run) -> active map`

Restore uses the same claim/private-candidate/publication path after current restore readiness and persisted provider-identity validation. Candidate abort releases resources and terminates the private run/backend; confirmed cleanup removes the claim, while indeterminate cleanup or metadata commit leaves the current quarantine outcome.

Removal:

`inactive discovery | explicit terminate | inactive replacement | stop-all | registration rollback -> removeIfCurrent(runId, expectedRun, reason) -> delete ownership -> revoke exact application sessions + detach memory/artifact/file observers -> structured cleanup result`

The registry owns tokenized `constructing|prepared|quarantined` claim state, active identity, and stop admission. It neither constructs nor terminates backends. The manager tracks in-flight preparations, blocks new claims during stop, waits for construction attempts to settle, terminates the registry snapshot, and consumes explicit results. The registry never calls back into the manager. A stale completion or cleanup cannot remove a replacement. Exact interfaces/results appear in [integration-runtime-contracts.md](integration-runtime-contracts.md), section 2.3.

### Application lifecycle

`host process prerequisites -> application prepare(workspace/customizations/Core + six server tool units/scoped session/catalog/built-ins/definitions) -> listen -> host post-listen work -> application recovery -> READY -> business demand`.

Stop is `application stop accepting/drain/workers/runs/sessions/streaming -> host process transports/general runs/pipeline/vault/Prisma`. Exact Studio/standalone phase, failure, background, unwind, and close allocation is normative in [integration-runtime-contracts.md](integration-runtime-contracts.md), section 1.

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
| `ApplicationLaunchConfigurationService` | definition traversal, package/selected baseline, one-store override/provenance/readiness | Studio/standalone readiness and business launch | UI/store caller recomputes baseline, read-time repair, or business action supplies missing model | extend resolver projection |
| `AgentRunActivationRegistry` | tokenized claims, active lookup, exact identity transitions | run manager and publication lookup | direct map mutation or manager callback registered later | add explicit transition/result method |
| `AgentRunManager` | private backend/run preparation, candidate callbacks, termination/stop over registry/resource results | provisioning/activation/run/team services | direct registry mutation/provider factory default | add explicit lifecycle method |
| Scoped MCP session manager | application session issue/revoke | current provider bootstrappers | process/global session default in app path | add explicit scoped operation |
| Publication service | active-run validation and durable publication | publish adapter | global manager/publisher lookup | inject active-run reader/publisher |
| Devkit CLI/config | build/validate/start | maintained app scripts | custom builder or edited generated copy | extend devkit config |

## Dependency Rules

Allowed:

- Host builders depend on runtime builder and only consume the four outward projections.
- Host starters own the exact process prerequisites and post-listen work; `ApplicationPlatformLifecycle` owns the exact shared phases in `integration-runtime-contracts.md` section 1. Neither may duplicate the other's phase.
- Runtime builder depends inward on one launch store/service, current managers, MCP/session scope, engine/orchestration, and lifecycle.
- Application run construction follows the exact DAG and required-input table in `integration-runtime-contracts.md` sections 2.1 and 2.5: early session scope -> resource manager -> activation registry -> publisher -> scoped sessions -> provider factories -> manager -> provisioning/activation service -> team graph.
- General-process assembly may use named default factories only in the exact process assembly files.
- Applications depend on SDK contracts, not server/web/Electron host internals.

Forbidden:

- `buildServer(mode)` or optional-field common server base.
- application construction calling `getInstance()`/default getters for graph-sensitive run/team/session/publication/context collaborators;
- application construction omitting any nested provider factory/bootstrap/session or team handle dependency listed as Required in the normative obligation table;
- a generic DI container, service locator, event bus, bind-later publisher, reverse cleanup callback, or silent fallback;
- a second launch configuration store/reader, read-time normalization write/delete, `launch_defaults_json` conversion, or obsolete member identity branch;
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
| activation registry operations | agent run activation identity | `claim`, `markPrepared`, `publish`, `releaseClaim`, `releasePrepared`, `completeAbort`, `getActiveRun`, `removeIfCurrent`, stop admission/snapshot | `agentRunId` + exact claim token + expected run | internal; exact result union |
| team manager | root team execution | create/restore/terminate | `teamRunId`, rooted `memberAddress` | Personal current model |
| MCP route/session | tool invocation | authenticate and dispatch | `sessionId`, token, run owner/team identity | internal both hosts |
| publication | artifact revision | validate/persist/event/project | `agentRunId`, revision/application binding | exact app publisher |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| four runtime projections | Yes | Yes | Low | retain exact fields |
| launch resolver | Yes | Yes | Medium | use current rooted identity only |
| activation registry | Yes | Yes | Medium | exact state/result table, no callback, no backend ownership |
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
| activation provisioning/quarantine | Personal candidate/provisioning/activation services | Reuse/extend | these are current supported state owners | only the claim/active/resource mechanics are extracted |
| package generation | feature devkit | Extend | native commands and canonical source | adapt contract values |
| model availability and persisted launch rows | feature launch owner + Personal rooted row shape | Reuse/adapt | one physical table already fits; one semantic owner prevents dual paths | current-rooted sparse override validator/store only |

## Subsystem / Capability-Area Allocation

| Subsystem | Concerns | Spines | Owners | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Git/task integration | merge classification/resolution | DS-001, DS-007 | implementation/delivery | Extend | one merge commit |
| Server compositions | host-specific process/assembly | DS-002, DS-003, DS-008 | two host starters + two server builders | Extend | exact process/app phase split; no mode switch |
| Application platform | shared projections/lifecycle | DS-002–DS-005, DS-008 | runtime builder/lifecycle | Reuse/adapt | four fields; exact shared readiness/recovery/stop only |
| Required tool readiness | process tool-catalog bootstrap used by both application hosts | DS-002, DS-003, DS-008 | `AgentToolRegistryReadiness` | Refine | Core is the source-backed seventh unit; one awaited owner replaces Search/factory/background side effects |
| Agent execution | current run state/lifecycle | DS-004, DS-006 | manager + activation registry | Extend | preserve candidate semantics |
| Team execution | RootTeamRun/member identity | DS-004–DS-006 | current managers | Reuse | no old registry resurrection |
| Agent Tools MCP | route/session/provider | DS-005, DS-006 | process runtime + scoped manager | Reuse/adapt | route in both hosts |
| Launch configuration | package/selected baseline, one persisted override, readiness | DS-002–DS-004, DS-009 | launch service + launch override store | Reuse/adapt | current availability and current rooted row shape |
| Devkit/app packages | developer workflow/output | DS-001–DS-003, DS-007 | devkit | Reuse/adapt | remove mirrors |

## Draft File Responsibility Mapping

| Candidate File / Area | Subsystem | Owner / Boundary | Concern | Why One File/Area | Shared Structure |
| --- | --- | --- | --- | --- | --- |
| `.../agent-execution/runtime/agent-run-activation-registry.ts` | agent execution | activation registry | pending/active identity transitions | concrete early state owner | explicit transition result types |
| `.../agent-execution/services/agent-run-resource-manager.ts` | agent execution | run resources | exact attach/release/session revoke | independent early cleanup owner | `AgentRunResourceReleaseResult` |
| `.../agent-execution/services/agent-run-manager.ts` | agent execution | run manager | current lifecycle orchestration | existing domain owner | activation registry |
| current activation candidate/provisioning/activation/run service files | agent execution | current lifecycle collaborators | private handle, durable PREPARED state, metadata commit/quarantine, public run service | existing current owners remain distinct | exact application dependencies |
| `.../application-platform/runtime/create-application-run-services.ts` | application platform | application assembly | explicit acyclic construction | exact assembly root for scoped family | runtime contracts |
| `.../compositions/build-*.ts` | compositions | host roots | distinct host assembly | host-specific lifecycle | runtime projections |
| `.../startup/agent-tool-loader.ts` | startup readiness | required tool owner | memoized Core-first/Search-last registration and diagnostics | one concrete readiness policy | Skills, background retries, or a compatibility wrapper |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | agent execution | agent factory | agent construction without tool-registry mutation | factory concern stays separate from process startup | hidden Core registration |
| `.../agent-tools/mcp/*` | MCP | process/scoped owners | shared route mechanics + exact publisher | existing capability area | session identity |
| `.../application-platform/launch-configuration/*` | launch config | resolver | baseline/override/readiness | cohesive policy area | provenance/issue shapes |
| `.../application-orchestration/stores/application-launch-override-store.ts` | launch persistence | one store | safe JSON cells plus explicit upsert/delete over current table | physical persistence concern separate from policy | current-rooted sparse override |
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

The exhaustive target inventory is `integration-path-inventory.txt`. Raw Git evidence remains in the conflict/overlap artifacts; this inventory removes rejected feature-only owners and adds Personal-only files that the semantic target must change.

| Disposition | Exact Files / Patterns | Target Responsibility |
| --- | --- | --- |
| Add/adapt | 109 `[ADD_OR_ADAPT_CANONICAL]` paths, notably both compositions, `application-platform/**`, standalone host, devkit/startup providers, `agent-run-activation-registry.ts`, resource manager, application session scope/scoped manager, one launch override store, and the required-tool readiness unit test | Bring forward finalized dual-host behavior while updating every interaction to current Personal owners/contracts |
| Modify semantically | all 75 `[MODIFY_BOTH_CANONICAL]` paths after removing the two rejected feature member registries | Three-way audit using authority matrix; record resolution owner and protected IDs |
| Modify Personal-only | 12 `[TARGET_PERSONAL_ONLY_MODIFY]` paths, including current candidate/provisioning/activation/run services, current mixed registries, and process migration/readiness owners | Preserve current behavior while making the application construction and lifecycle allocation exact |
| Modify integration-only | 9 `[TARGET_INTEGRATION_ONLY_MODIFY]` paths that neither raw changed-both list captured nor the feature could resolve alone: tool readiness/background/index, Search registration, AgentFactory, and their direct test callers | Establish one lifecycle-owned registration path and remove the hidden/empty alternatives |
| Retain as explicit dependency | 2 `[TARGET_EXPLICIT_RETAIN_DEPENDENCY]` paths: the unchanged AutoByteus backend factory import edge and `autobyteus-ts/src/tools/register-tools.ts` | Keep the backend's default-factory identity while making that eager instance registry-pure; retain `registerTools` as the idempotent Core registrar called only by readiness in repository production paths |
| Add | `autobyteus-server-ts/src/agent-execution/runtime/agent-run-activation-registry.ts` and adapted resource manager/test | Current Personal pending/active identity owner and exact resource release required for acyclic application construction |
| Modify | `agent-run-manager.ts`, current Codex/Claude factories/bootstrap/session files, current mixed-team managers/handles/definition context, MCP session/runtime, publication/relay | Exact application scope over current Personal lifecycle/identity; named general process remains separate; all obligations follow supplement section 2.5 |
| Modify | Brief/Socratic `package.json`, devkit config, canonical source, manifests/definitions | native commands, current contracts, Codex/Luna complete defaults |
| Remove | 17 `[REMOVE_LEGACY_CANONICAL]` paths, including the Personal execution-resource configuration store/service/normalizer | clean-cut obsolete owners/builders/tests; where also changed-both, removal wins |
| Do not add | 3 `[TARGET_EXPLICIT_DO_NOT_ADD]` feature paths: active-only run registry and the two old member registries | current activation and current configured/task execution owners supersede them |
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
| `server-runtime.ts` and `.../standalone-application-host/start-standalone-application-host.ts` | Files | host process coordinators | exact process prerequisites, listener/post-listen work, fatal/reject/unwind, outer close | host policy differs and remains explicit | shared application readiness duplicated inline |
| `autobyteus-server-ts/src/compositions/` | Folder | server assembly | two explicit builders, routes/hooks, process/general construction | top-level wiring | migrations, business rules, mode switch |
| `.../application-platform/runtime/` | Folder | shared application lifecycle/boundary | runtime contracts/build plus exact application prepare/recovery/stop | platform-owned shared host layer | DB/vault/process transports/background, host UI |
| `.../startup/agent-tool-loader.ts` | File | required tool readiness | one memoized seven-unit process registration, Core first and provisioned Search last | existing startup capability with real order/failure policy | Skills, general MCP registration, AgentFactory construction, or background retry |
| `.../application-platform/launch-configuration/` | Folder | launch resolver | defaults/overrides/readiness/validation | one policy owner | UI rendering |
| `.../application-orchestration/stores/application-launch-override-store.ts` | File | launch persistence | safe parse and explicit row upsert/delete over existing table | physical store concern | baseline/readiness or read-time rewrite |
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
| Lifecycle allocation | host starter process gates -> shared application prepare -> listen/post-listen -> shared recovery | migrations/tools/recovery partly in builder, lifecycle, and background task | every phase has one owner/failure/stop policy |
| Run construction | early application session scope -> resource manager -> claim/active registry -> publisher -> scoped sessions -> current factories -> current manager -> current activation/team services | manager singleton -> default publisher -> later rebind or old active-only registry | acyclic exact authority while preserving Personal candidates/quarantine |
| Identity | `{teamRunId, memberAddress, agentRunId}` where subjects differ | one `runId`/`memberRouteKey` for all subjects | prevents ambiguous routing |
| Generated conflict | delete and run devkit pack | manually merge `dist/**` | preserves one source of truth |
| Launch config | current-rooted stored row -> selected baseline + sparse override -> effective/provenance, with no read write | `memberRouteKey` compatibility conversion, second store, or silent package fallback | one policy/identity owner and direct-use data |

## Backward-Compatibility Rejection Log

| Candidate | Why Considered | Decision | Clean Replacement |
| --- | --- | --- | --- |
| Alias old versioned contract symbols | reduce merge edits | Rejected | update in-scope consumers to unversioned names/current values |
| Restore removed feature-era registries | easier feature cherry-pick | Rejected | adapt current Personal owners |
| Retain custom app builders/mirrors | avoid package conflict | Rejected | devkit and canonical source |
| Application fallback to process singletons | simplifies construction | Rejected | explicit activation/scoped-session construction |
| Bind-later/deferred publication proxy | breaks cycle cheaply | Rejected | early concrete activation registry |
| Dual old/new source tree | transitional convenience | Rejected | clean deletion/regeneration |
| Convert `launch_defaults_json` or `memberRouteKey` rows while reading | makes historical rows appear valid | Rejected | valid current-rooted rows direct-use; invalid rows block and explicit Reset owns deletion |
| Keep both configuration stores over the shared table | reduces merge edits | Rejected | one launch override store and one launch configuration service |

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
5. Reconcile Studio and standalone startup exactly by `integration-runtime-contracts.md` section 1: process prerequisites/status policies in each host starter; shared workspace/customization/Core-plus-six-server-tool/session/catalog/built-in/definition readiness and recovery/stop in `ApplicationPlatformLifecycle`; remove duplicates before advancing.
6. Bring forward the two explicit host builders, standalone routes/static/bootstrap, frontend startup normalization, and four runtime projections; implement the exact post-listen, failure-unwind, and close sequences.
7. Add the early application session scope, adapted resource manager, and current-state activation registry; update current `AgentRunManager` while retaining current candidate, provisioning, activation, durable commit, provider identity, and quarantine semantics.
8. Construct application publication/scoped MCP/provider factories/current manager/services through the exact DAG and obligations in supplement section 2; preserve the named process assembly and only its enumerated exemptions.
9. Propagate the exact manager/context/session/workspace/memory dependencies through current RootTeamRun/mixed configured/task/subteam owners using rooted identity; do not add the two feature-era member registries.
10. Select `ApplicationLaunchOverrideStore` as the only physical owner; remove the Personal configuration store/service/normalizer; adapt target contracts/normalizer/UI to current `memberAddress`/`displayName`; prove current valid rows direct-use with no read-time writes/fallback; retain Codex/Luna defaults and Personal availability warnings.
11. Resolve application canonical sources and current business changes; port tests off removed seams.
12. Audit the 75 target changed-both canonical paths plus the 12 Personal-only target modifications and record authority decisions.
13. Compile/typecheck before generation; fix source only.
14. Regenerate packages/output through devkit and prove reproducibility/parity.
15. Run implementation checks, source review, coverage investigation, full dual-host/API/E2E, durable-test review, docs/delivery, and Electron verification, including the supplement section 4 delta.
16. At delivery, refresh Personal again. If it moved, repeat an evidence-backed semantic refresh rather than force the old merge.

No temporary compatibility seam is retained after step 14.

## Key Tradeoffs

- A merge commit is less linear than rebase, but preserves the finalized checkpoint and reduces conflict handling to one auditable point.
- Extracting activation state adds one concrete type, but removes a real construction cycle and prevents application-to-global fallback. Folding everything into the manager would require a later-bound publisher or default singleton.
- Retaining an early session ownership scope plus separate resource manager adds two narrowly owned collaborators, but each owns real state/cleanup and makes publisher/session/manager construction acyclic. Neither is a pass-through facade.
- Removing Core registration from `AgentFactory` makes process readiness explicit instead of preserving a surprising construction side effect. The factory still creates the same agents from resolved tool instances; the existing public `registerTools()` remains the direct bootstrap API for non-server library callers that need the global catalog.
- Treating obsolete/legacy-only launch rows as explicit invalid saved state is stricter than read-time conversion, but it honors the clean-current-contract rule, prevents hidden writes, and preserves explicit Reset. Valid current Personal rows require no migration.
- Deleting generated artifacts creates a large apparent diff, but avoids parallel source truth and makes future application development simpler.
- Re-running complete dual-host/Electron validation costs time, but the combined state has no prior proof.

## Risks

- Auto-merged code may compile while selecting optional global defaults. Mitigation: exact injection obligations and synthetic omission tests.
- Personal's current lifecycle may have additional invariants not obvious from conflict paths. Mitigation: preserve current files as authority and run affected Personal suites.
- Identity conversion can mix old and current member keys. Mitigation: one rooted identity and removal of parallel representation.
- Lifecycle reconciliation can skip or double-run a current phase. Mitigation: normative per-phase allocation and once/order/failure/unwind tests from supplement section 1.
- Core or provisioned Search can register early, twice, or in the wrong order through legacy side effects. Mitigation: remove every alternate caller, memoize one readiness promise, assert the seven ordered unit keys, and scan production call sites.
- A parent factory can be explicit while a nested defaulting provider/team owner still falls back globally. Mitigation: every nested application obligation and exact general-process exemption is listed and omission-tested.
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
- Implement every host phase, transition method/result, constructor obligation, store behavior, and file disposition exactly as specified in `integration-runtime-contracts.md`; do not summarize that supplement into a looser implementation.
- For phase 16, use Core as the source-backed seventh unit, keep Skills outside tool registration, remove `loadAllAgentTools` and every early/duplicate registration side effect, and preserve Core-first/Search-last ordering.
- Keep `AgentRunActivationCandidate`, `AgentRunProvisioningService`, and `StandaloneAgentRunActivationService` current. The new registry does not replace their responsibilities.
- Keep `ApplicationLaunchOverrideStore` as the only row owner. Reading/evaluating an override must be side-effect free; only explicit Save/Reset writes.
- Keep construction free of business run creation.
- Delete generated output before resolving source, and regenerate only after builds pass.
- Do not create/update `implementation-handoff.md` during solution design; the implementation engineer owns it after implementation.
