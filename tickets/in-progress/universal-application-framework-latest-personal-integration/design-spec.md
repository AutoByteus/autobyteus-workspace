# Design Spec — Universal Application Framework Latest-Personal Integration

## Current-State Read

Two valid but divergent states must be combined.

- **Previously integrated and verified checkpoint** (`a23849f...`) contains the completed dual-host feature plus Personal through `7edfb1625...`; it has passed architecture, source, API/E2E, provider, package, and Electron verification.
- **Newest Personal** (`c5b87df4d...`, v1.4.56) is 22 commits beyond the integrated base. Production/runtime semantics after `3ab4946c7...` are unchanged: that source state owns nested `TeamRunPhysicalScope`/memory migration and the completed provider-catalog/API-key refactor—network-free static catalogs, provider-keyed dynamic lifecycle, exact post-discovery identifier/endpoint availability, split credential/catalog contracts, snapshot-settled GraphQL/Pinia UI, and current media factory ownership. The six later commits add only an isolated non-workspace UI prototype and ticket/delivery records.
- **Finalized feature** (`a5ffd28...`) has 115 commits after the merge base and owns the proven Universal Application Dual-Host Foundation: one package in Studio and standalone, explicit host builders, one shared application platform boundary with four projections, standalone ingress, devkit workflow, package launch defaults/overrides/readiness, application-scoped Agent Tools publication, package-source cleanup, and real dual-host/Electron evidence.
- Latest Personal does not contain the dual-host foundation. Conversely, the feature's execution construction targets older run/team owners and cannot replace Personal's current implementations wholesale.
- The historical merge and first provider refresh are already resolved and verified. The latest non-mutating refresh preview produces five content conflicts and ten changed-both paths. The production conflict remains the leaf Agent physical-scope boundary; the new semantic integration also affects the application model/readiness adapter and shared Studio model picker because Personal deleted the aggregate provider API, discovers at provider granularity, and settles ordinary per-provider UI failures into snapshot state.
- The finalized required-tool loader has six server specs but labels them seven. The actual seventh source-backed unit is Core `registerTools()`, currently reached early through both provisioned Search and eager `defaultAgentFactory` construction; no independent Skills tool registrar exists.

The current task pressure is a **bounded runtime/data/provider integration boundary problem**, not evidence that the passed application-platform architecture should be reopened. Existing team/migration owners absorb physical scope; existing application policy/validator/credential-adapter/composable owners consume Personal's provider/model authorities. SR-007 removes one stale runtime-model cache and corrects UI return semantics without adding a catalog, lifecycle owner, or broad refactor.

## Intended Change

Merge `origin/personal@c5b87df4d...` once into protected checkpoint `a23849f...`. Accept non-overlapping provider/catalog and nested-team/history/migration changes, preserve the isolated `ui-prototypes/autobyteus-web-prototype` subtree exactly without adding it to the root workspace, resolve five conflicts and audit all ten overlaps through current owners, use complete `TeamRunPhysicalScope` through the injected application memory service, adapt application model/credential readiness to Personal's exact process owners, combine Studio inherited runtime with current background dynamic discovery, and re-prove the combined state.

No refresh production file is changed during solution design. Implementation and Electron rebuild begin only after architecture review.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger Or Contract | Existing Evidence | Approved Change Or Preserved Outcome | Target Path / Spine IDs |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-002; AC-001, AC-002, AC-014 | Refresh the verified checkpoint onto newest Personal | Protected checkpoint, new ref, merge-tree preview | Preserve both histories; merge the new Personal ref once without rewriting | DS-001, DS-010 |
| BEH-002 | User | REQ-003; AC-003, AC-004 | Run application commands from maintained folder | Package/tree comparison | Preserve devkit native workflow and build-once package behavior | DS-002, DS-003 |
| BEH-003 | System | REQ-004, REQ-005; AC-005–AC-008 | App launches agent/team and consumes return events | Personal current managers; feature final dual-host evidence | Use current Personal lifecycle/identity with exact application-scoped dependencies | DS-004–DS-006, DS-008 |
| BEH-004 | User/Contract | REQ-005, REQ-008; AC-006, AC-009, AC-012 | Evaluate package default, saved sparse override, Save, or direct launch | Current launch owner/store plus newest AutoByteus membership behavior | Retain exact stored value/provenance, block stale AutoByteus selection, and preserve external-runtime ownership | DS-002, DS-003, DS-009, DS-011 |
| BEH-005 | Operational | REQ-002, REQ-006, REQ-008; AC-002, AC-010, AC-014 | Resolve newest refresh | DR-004 conflict report plus 13-path changed-both audit | Resolve current source semantically; keep five retired/generated paths deleted | DS-010 |
| BEH-006 | Contract | REQ-007, REQ-008; AC-011, AC-015 | Review/test refreshed candidate | Passed checkpoint and newest-Personal reports are separate baselines | Execute focused refresh proof plus complete retained dual-host/Electron proof | DS-007, DS-010–DS-012 |
| BEH-007 | User/Contract | REQ-008; AC-013, AC-015 | Provider error reaches native and application consumers | Latest native error contract plus current v6 application stream | Native transport keeps safe metadata; application SDK carries only original safe message with exact identity | DS-012 |
| BEH-008 | System/Operational | REQ-004–REQ-005, REQ-009; AC-005, AC-008, AC-016–AC-020 | Nested configured/task execution or host upgrade/restart | Passed application graph-local lifecycle plus newest Personal physical-scope/migration evidence | Use exact containing-TeamRun scope without losing injection/activation/cleanup; migrate old flat nested memory before readiness | DS-004–DS-006, DS-008, DS-013–DS-014 |
| BEH-009 | System/User | REQ-005, REQ-008, REQ-010; AC-006, AC-009, AC-012, AC-021–AC-025 | Package/saved/Save/direct one-or-more-leaf AutoByteus selection or Studio model editing with provider failure | Current application configuration boundary plus Personal v1.4.56 provider/catalog/store owners and `ARCH-REV-006` evidence | Provider-granularity ensure plus fresh exact leaf model, adapter-owned credential equivalence, and settled snapshot/UI outcomes; no endpoint-local/eager/duplicate catalog | DS-002–DS-004, DS-009, DS-011, DS-015–DS-016 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `integration-strategy-analysis.md` | Strategy, authority, critical seam, resolution and verification details | All | Defines the implementation policy used below | Design-ready / approved by delegated direction |
| `integration-runtime-contracts.md` | Exact host lifecycle, current activation/provisioning adaptation, construction obligations, file dispositions, launch store/direct-use proof, and verification delta | REQ-004–REQ-007; AC-005–AC-011 | Normative detail for DS-002–DS-006 and the persisted-data decision | Design-ready / approved preserved-behavior precision |
| `latest-base-refresh-design-analysis.md` | Exact prior-base authority, current-model/error boundaries, conflict/overlap map, inventory, and verification delta | REQ-001–REQ-008; AC-001–AC-015 | Implemented/verified SR-004 authority for DS-010–DS-012 | Complete / passed historical baseline |
| `latest-base-refresh-round-2-design-analysis.md` | Exact nested physical-scope, migration, conflict/overlap, inventory, and verification delta | REQ-001–REQ-009; AC-001–AC-020 | Normative SR-005 delta for DS-013–DS-014 and current DS-001/DS-007 | Design-ready / pending architecture review |
| `latest-base-refresh-round-3-design-analysis.md` | Exact v1.4.56 provider/catalog/model/credential/UI and physical-scope integration | REQ-001–REQ-010; AC-001–AC-025 | Current normative SR-007 delta for DS-001, DS-007, DS-013–DS-016 | Design-ready / pending architecture re-review |
| `merge-attempt.log` | Raw trial merge evidence | REQ-002; AC-002 | Grounds conflict measurement | Complete / N/A |
| `merge-conflict-inventory.txt` | Exact conflict classification | REQ-002, REQ-006 | Drives conflict resolution classes | Complete / N/A |
| `branch-overlap-inventory.txt` | Exact changed-both inventory | REQ-002, REQ-006 | Defines marker-free audit set | Complete / N/A |
| `integration-path-inventory.txt` | Add/modify/remove/regenerate inventory | REQ-003–REQ-007 | Concrete starting file inventory | Complete / N/A |
| `latest-base-refresh-conflict-report.md` | Delivery-owned original refresh blocker | REQ-001–REQ-002, REQ-006–REQ-008; AC-001–AC-002, AC-010–AC-015 | Triggering Design Impact evidence retained untouched | Complete / N/A |
| `evidence/delivery/dr-004-base-refresh-and-integration.log` | Delivery-owned raw fetch/path/preview evidence | REQ-001–REQ-002, REQ-006; AC-001–AC-002, AC-010 | Grounds the original 31-commit measurement extended by the current-ref revalidation | Complete / N/A |
| `latest-base-refresh-round-2-conflict-report.md` | Delivery-owned DR-006 blocker | REQ-001–REQ-002, REQ-006–REQ-009; AC-001–AC-002, AC-016–AC-020 | Triggering evidence retained untouched | Complete / N/A |
| `evidence/delivery/dr-006-base-refresh-and-integration.log` | Delivery-owned current fetch/path/migration/preview evidence | REQ-001–REQ-002, REQ-006, REQ-009; AC-001–AC-002, AC-016 | Grounds the five-commit, three-conflict measurement | Complete / N/A |
| `evidence/solution/latest-base-refresh-round-3-{merge-preview.log,conflict-inventory.txt,overlap-inventory.txt,path-inventory.txt}` | Current exact refs/counts/merge/path evidence | REQ-001–REQ-002, REQ-006, REQ-010; AC-001–AC-002, AC-021–AC-025 | Grounds the five-conflict, ten-overlap, 2,194-path current target and the isolated post-`3ab` additions | Complete / N/A |

## Task Design Health Assessment

- Change posture: `Refactor` / integration of a completed larger requirement.
- Current design issue found: `Yes`, bounded to the physical-scope/data-migration intersection and provider/model/credential/UI consumption seam; the previously approved production architecture remains passed.
- Root cause classification: `Boundary Or Ownership Issue` plus `Persisted-Data Transition` and evolved dependency contract.
- Refactor needed now: `No broad refactor`; combine the existing leaf owner, adopt current Personal provider owners, and adapt the existing application policy/adapter/composable.
- Evidence: selecting either physical-scope side loses a proved invariant; retaining the ticket's static-only guard falsely rejects valid dynamic identifiers; retaining its aggregate credential call does not compile; runtime-only model caching can reject a later dynamically ensured leaf; and treating the settled Pinia action as normally rejecting contradicts Personal's store.
- Design response: keep current execution/migration/application configuration owners. Consume provider-granularity `ModelAvailabilityService`, perform a fresh exact model lookup after every leaf ensure, derive credential cache identity from the credential adapter, and re-read Pinia rows/status after settled provider attempts. Introduce no parallel catalog, provider facade, or eager startup discovery.
- Refactor rationale: the current owners already have the needed responsibilities; a new scope resolver, application migration coordinator, or compatibility read path would be empty/duplicated indirection.
- Intentional deferrals: no generalized runtime framework, no repository-wide execution rewrite, no public SDK expansion, and no application-owned external MCP provisioning. These are not needed for the integration.

## Terminology

- **Host:** Studio or standalone process boundary that selects and starts an application.
- **Application platform:** shared server capabilities required after host selection; returned as `ApplicationPlatformRuntime` with only four outward projections.
- **Application run scope:** the dependency family for runs created by application business behavior, distinct from deliberately process-wide/general runs.
- **Activation registry:** the concrete owner of tokenized pending activation claims, active run identity, admission during stop, and identity-checked state transitions. It is not a second run manager, backend owner, or service locator.
- **Application session scope:** the early application-owned index that records and revokes Agent Tools MCP session identities. It owns no dispatch or publication policy and exists before the scoped session manager to keep construction acyclic.
- **Canonical source:** editable `frontend-src`, `backend-src`, definitions/configuration, and source contracts from which package output is generated.
- **Derived output:** compiled/mirrored `ui`, `backend`, `dist`, vendored, and generated-client content.
- **Current-model selection policy:** stateless application policy that normalizes runtime, classifies canonical static/dynamic AutoByteus identifiers, invokes Personal's selected-provider availability boundary, and produces safe typed blocking outcomes. It owns no catalog, store, cache, lifecycle, credential, or external-runtime namespace; the host validator performs the fresh exact post-policy model lookup.
- **Catalog owner:** provider descriptor whose static or discovered source publishes a model snapshot; it is not necessarily the model creator in `model.provider_id`.
- **Serving runtime credential owner:** credential identity derived from the resolved model runtime (`API`, custom OpenAI-compatible, AutoByteus gateway, Ollama, or LM Studio), not from display grouping alone.

## Design Reading Order

Follow the merge spine first, then the two host starts, then the shared run/return/cleanup spines. The ownership and file maps explain how those flows are implemented without reviving obsolete paths.

## Legacy Removal Policy

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove custom application builders, maintained mirrored source/output, feature `ActiveAgentRunRegistry`, feature `mixed-persistent-member-registry`/`mixed-task-agent-instance-registry`, the Personal execution-resource configuration service/store/normalizer replaced by the single launch owner, old broad runtime owners, version-suffixed in-scope code symbols, and any alias used only to bridge these internal seams.
- Do not restore Personal-deleted modules merely to compile a feature-era test; move the assertion to the current owner.
- Derived output is deleted and regenerated, never treated as an alternative implementation.

## Persisted Data / State Transition Decision

- Launch overrides remain `Directly Usable — No Migration`: `ApplicationLaunchOverrideStore` and `ApplicationLaunchConfigurationService` retain the current sparse rooted contract, side-effect-free reads, and explicit Save/Reset-only mutation described in [integration-runtime-contracts.md](integration-runtime-contracts.md), section 3.
- Provider credentials, custom-provider records, host settings, and saved model identifiers remain `Directly Usable — No Migration`. Personal changes their service/catalog projections and dynamic in-memory lifecycle, not their stored schemas. Dynamic source snapshots/status are reconstructed process state and are not copied into application storage.
- Current TeamRun V1 metadata/index packages remain directly usable. `TeamExecutionIndex.getTeamRunPhysicalScope(containingTeamRunId)` derives ordered current scope without rewriting those packages.
- Affected pre-refresh nested Team Agent memory is `Migration Required`: the old flat root-TeamRun location is not the current canonical path, cannot be rebuilt without losing user memory, and must not become a runtime fallback.
- Migration owner: the existing process `AppDataMigrationRunner` and registered `TeamAgentMemoryLayoutAppDataMigration`; both Studio and standalone already invoke this runner before application lifecycle readiness.
- Ordering: TeamRun Execution Tree V1 -> Team Agent memory layout -> dependent external/native working-context snapshot migrations -> remaining process/application readiness.
- Transformation: enumerate nested Agent executions from current TeamRun V1, compute old flat and current physical-scope directories, rename the complete source directory only when the target is missing, then validate source/target postconditions. Never merge directories, overwrite a target, copy per file, or mutate runtime metadata.
- Completion/recovery: fresh/unmaterialized/current/direct-root cases skip; both directories are preserved with an explicit warning; unsupported/failed locations record a failure; the existing migration ledger and `ANYTIME` policy own retry. Historical-schema knowledge does not escape the migration.
- Required invariants: no launch-row rewrite, no memory loss, no partial per-file copy, no old/new runtime dual read, no package mutation, no second migration runner, no skipped prerequisite, and no application/global dependency fallback.
- Normative transition matrix: [latest-base-refresh-round-2-design-analysis.md](latest-base-refresh-round-2-design-analysis.md), migration section.
- Supports: REQ-004–REQ-010; AC-005–AC-009, AC-011–AC-025.

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
| DS-010 | Primary End-to-End | BEH-001, BEH-005, BEH-006 | Protected verified checkpoint plus newest Personal ref | Refreshed reviewed/tested candidate | One history-preserving refresh merge and semantic resolution map | Prevents retired-owner resurrection and marker-free compile defects |
| DS-011 | Primary + bounded defense | BEH-004 | Package/saved/Save/direct runtime-model pair | RUNNABLE, exact blocking issue, or pre-side-effect rejection | `ApplicationCurrentModelSelectionPolicy` with current launch/run owners | Preserves latest AutoByteus selection behavior without taking Claude/Codex ownership |
| DS-012 | Return-Event | BEH-007 | Provider/runtime failure | Native client and closed application SDK error | Latest native error owners + `ApplicationAgentStreamEventProjector` | Preserves the safe original message without leaking metadata or breaking v6 identity |
| DS-013 | Primary End-to-End | BEH-008 | Application launches/restores nested configured/task execution | Leaf Agent uses canonical memory and exact scoped resources | current team factories/context + graph-local run services | Preserves both nested restart correctness and application isolation |
| DS-014 | Primary Startup/Data Transition | BEH-008 | Studio/standalone starts on existing or fresh data root | Current memory layout or explicit migration status before readiness | existing `AppDataMigrationRunner` + Team Agent memory migration | Keeps historical layout knowledge isolated and prevents silent memory loss |
| DS-015 | Primary + bounded defense | BEH-009 | Static/dynamic AutoByteus selection from package/saved/Save/direct launch | resolved exact model or distinct current-selection/model-unavailable issue | application current-model policy consuming Personal model availability | Preserves dynamic sources without eager/global discovery or stale-row repair |
| DS-016 | Primary + return/update | BEH-009 | Studio model editor with explicit/inherited runtime | immediate model options, then same-runtime dynamic refresh | runtime-scoped composable consuming Personal Pinia catalog store | Preserves sparse overrides and responsive current selection |

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

### DS-010 — Newest Personal refresh

`protected checkpoint a23849f -> re-fetch/confirm c5b87df4d -> one merge -> accept non-overlapping Personal provider/catalog, nested-team/history/migration, and isolated prototype additions -> resolve five conflicts and audit ten overlaps -> bounded application seam adaptations -> compile/test -> reviewed refreshed commit`

### DS-011 — Current-model selection

`package baseline or saved sparse override -> ordered effective leaves -> per-leaf shared current-model policy -> static AutoByteus membership OR canonical dynamic selected-provider ensure/exact endpoint post-check OR Codex/Claude bypass -> fresh exact runtime model lookup -> resolved credential authority/readiness -> next leaf -> RUNNABLE or distinct blocking issue`

Explicit Save applies the same policy before upsert. Direct agent/team start applies it to all normalized configs before agent creation or team-run allocation. These are validation boundaries around one policy, not competing configuration authorities.

### DS-012 — Provider error return

`provider extractor/redactor -> canonical native ERROR(code + safe message + optional safe metadata) -> native consumers; canonical AgentRun/team event -> application projector -> diagnostic filter -> exact {type: ERROR, message} -> v6 envelope/strict SDK parser`

### DS-013 — Nested application execution and memory

`application business command -> current root TeamRun physical scope -> configured/task subteam factory appends containing teamRunId -> same graph-local MixedTeamManager family -> MixedAgentMemberHandle -> injected AgentMemoryLocationService({ ...teamContext.physicalScope, agentRunId }) -> prepareNewAgentRun -> durable publication/platform binding -> provider execution -> exact injected session cleanup on termination`

No Agent or Team run is created during host construction. The business action remains the trigger; physical scope only supplies canonical persistence identity when the current execution owner creates/restores the requested run.

### DS-014 — Nested memory startup migration

`Studio or standalone process start -> existing AppDataMigrationRunner.runPending -> TeamRun Execution Tree V1 prerequisite -> TeamAgentMemoryLayoutAppDataMigration -> classify current root/index and nested leaf -> old flat path/current physical path decision -> validated whole-directory rename or explicit skip/warning/failure -> migration ledger -> dependent snapshot migrations -> application lifecycle readiness`

### DS-015 — Current Personal model availability and application readiness

`effective leaves in deterministic order -> per leaf canonical static/dynamic classification -> static current-membership guard OR ModelAvailabilityService identifier-to-provider resolution + provider-granularity ensure + exact endpoint registration check -> fresh ModelCatalogService.listLlmModels(runtime) -> exact ModelInfo for that leaf -> credential adapter resolves authority/equivalence key -> readiness -> next leaf -> RUNNABLE, CURRENT_MODEL_SELECTION_REQUIRED, MODEL_UNAVAILABLE, or RUNTIME_AUTHENTICATION_UNAVAILABLE`

The host validator removes `modelsByRuntime`; no runtime-only model snapshot survives a later provider mutation. Every leaf receives the `ModelInfo` read immediately after its own policy/ensure step. Credential results may be reused only when the adapter returns the same resolved authority key. Read retains exact package/saved value and provenance. Save maps model-selection blocking outcomes before store upsert. Direct agent/team launch applies the same policy before any run allocation. Process start never ensures all dynamic providers.

### DS-016 — Studio runtime-scoped model selection

`stored runtime -> inherited runtime -> optional default -> no request if deliberately null -> fetch current runtime snapshot -> publish providersWithModelsForSelection(runtime) immediately -> background ensureMissingDynamicProviders(runtime) -> per-provider mutation writes READY/PARTIAL/ERROR/STALE_ERROR -> Promise.allSettled aggregate fulfills -> re-read same runtime rows and source statuses -> retain stale rows; unexpected aggregate rejection follows defensive log/re-read only`

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
| DS-013 | Current root/child factories carry immutable containing-TeamRun physical scope while the existing application manager factory recursively supplies one exact graph-local service family; the leaf handle derives memory and activates only on business demand. | TeamRun scope, member, AgentRun, memory/session resources | current team factories/context + member handle | memory layout, prepared activation, cleanup |
| DS-014 | Existing process migration authority transforms only affected old flat nested memory before either host declares application readiness; normal runtime sees only the current layout. | TeamRun index, AgentRun directory, migration status | app-data migration runner + Team Agent memory migration | bounded diagnostics, ledger, filesystem rename |
| DS-015 | Application policy delegates selected-provider availability; the validator performs a fresh exact model lookup per leaf and caches credentials only by adapter-resolved authority. | identifier, provider owner, fresh resolved model, credential authority, issue | application current-model policy/validator/credential adapter + Personal availability/catalog owners | safe diagnostics, endpoint identity |
| DS-016 | Studio publishes current rows quickly, awaits settled provider attempts, then converges from snapshot rows/status while preserving sparse runtime inheritance. | effective runtime, provider snapshots/source states, model options | runtime-scoped composable + Personal Pinia store | loading/error presentation |

## Spine Actors / Main-Line Nodes

- `buildStudioServer`
- `buildStandaloneApplicationServer`
- `ApplicationPlatformRuntime` projections and `ApplicationPlatformLifecycle`
- `ApplicationLaunchConfigurationService`
- `ApplicationCurrentModelSelectionPolicy`, `ApplicationLaunchHostCapabilityValidator`, and provider credential readiness adapter
- Personal `ModelAvailabilityService`, `ModelCatalogService`, `LlmProviderService`, and runtime-scoped Pinia catalog store
- `AgentRunManager`, `AgentTeamRunManager`, `MixedTeamManager`
- `TeamRunContext` / `TeamRunPhysicalScope`, root and child TeamRun factories, and `MixedAgentMemberHandle`
- `AppDataMigrationRunner` / `TeamAgentMemoryLayoutAppDataMigration`
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
| `ApplicationCurrentModelSelectionPolicy` | runtime normalization; canonical static/dynamic AutoByteus classification; selected-provider availability invocation; safe typed unavailable outcome shared by readiness, Save, and direct launch | stores, source lifecycle, credentials, package mutation, model remapping, model-list caching, eager all-provider discovery, or Claude/Codex model ownership |
| `ApplicationLaunchHostCapabilityValidator` | ordered leaf validation, fresh exact post-policy `ModelInfo` lookup, issue mapping, and credential reuse only by adapter-resolved authority key | provider lifecycle, runtime-only model cache, creator-based credential equivalence, or persistence |
| Personal `ModelCatalogService` / `ModelAvailabilityService` | process-local static snapshots, provider-keyed dynamic lifecycle, selected identifier-to-provider resolution, provider ensure, and exact identifier/endpoint registration | application launch persistence, application-specific cache, endpoint-local application lifecycle, or all-provider startup gating |
| Application provider credential readiness adapter | native Codex/Claude auth checks, network-free AutoByteus serving-runtime credential-owner mapping, and stable equivalence key for the resolved authority | model discovery, provider catalog ownership, secret persistence, or creator/provider guessing for gateway/local runtimes |
| runtime-scoped model-selection composable | stored/inherited/default runtime precedence, immediate snapshot publication, settled dynamic-provider convergence, and defensive unexpected-rejection handling | provider lifecycle, normal provider-error synthesis, server definition traversal, or application override persistence |
| `ApplicationAgentToolMcpSessionScope` | early session ownership index and exact revoke/block/close | route dispatch, catalog selection, publication |
| `AgentRunResourceManager` | attach/release file, artifact, memory observers and exact application session revocation | backend termination or active-map policy |
| `AgentRunActivationRegistry` | tokenized pending claims, active identity state, stop admission, identity-checked transitions | backend construction/termination, metadata, provider selection, lifecycle orchestration |
| `AgentRunManager` | prepare/restore backend and run privately, candidate callbacks, terminate, track in-flight preparation, consume registry/resource results | durable metadata commit or process-global fallback on application paths |
| `AgentRunProvisioningService` / `StandaloneAgentRunActivationService` | durable PREPARED lifecycle and metadata-before-publication activation/restore/quarantine respectively | active-map ownership or global application dependencies |
| `AgentTeamRunManager` | current root execution trees, persistence, team lifecycle | old flattened identities |
| `TeamRunContext` / physical scope and root/child factories | immutable root plus ordered containing-TeamRun ancestry; root creation and exactly-once child-scope extension | AgentRun identity, memory I/O, host mode, or application service lookup |
| `MixedAgentMemberHandle` | leaf Agent preparation/use/termination using its supplied team context and exact injected run/session/memory collaborators | scope reconstruction, process-global application dependency lookup, migration, or business-run creation before demand |
| Scoped MCP manager | application session issue/revoke using exact publisher | external Studio gateway or native provider tools |
| Publication/delivery owners | validate active run, persist/project, queue/ensure/invoke | selecting application packages or global run lookup |
| `AppDataMigrationRunner` / Team Agent memory migration | ordered startup execution/ledger and isolated old-flat-to-current-physical memory transformation | runtime dual reads, team execution, directory merge/overwrite, or application-specific orchestration |
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
| Physical memory layout migration | DS-014 | app-data migration owner | one-time current-layout transformation and diagnostics | required persisted-data correctness | runtime compatibility branches or application-specific migration |

## Ownership Boundaries

Host-specific logic ends at normalized bootstrap and the four application runtime projections. Shared business behavior may not inspect whether it is in Studio or standalone. Process-wide Agent Tools infrastructure owns the route/registry/catalog/dispatcher mechanics; application scope owns issued sessions and the exact publication capability. Current run/team managers own lifecycle; application assembly supplies their scoped collaborators explicitly. Devkit owns packaging; maintained application source does not import server/web/Electron/devkit host internals.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Required Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `ApplicationPlatformRuntime` projections | stores, availability, run/session, engine, recovery | host builders/registrars | registrar receives whole runtime or private store | add subject method to exact projection |
| `ApplicationLaunchConfigurationService` | definition traversal, package/selected baseline, one-store override/provenance/readiness | Studio/standalone readiness and business launch | UI/store caller recomputes baseline, read-time repair, or business action supplies missing model | extend resolver projection |
| Personal model availability/catalog | static registrations, provider-keyed lifecycle/status, selected identifier-to-provider mapping, provider ensure, and exact post-check | application current-model policy/validator, provider GraphQL/store, AutoByteus/media construction | application-local catalog, endpoint-local lifecycle, eager all-provider readiness, deleted aggregate provider | extend provider operation/status in Personal owner |
| Provider credential setting | provider descriptor + configured status independent of models | application credential adapter and settings UI | credential adapter lists/ensures models or infers gateway credential from creator | add exact network-free credential read |
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
- Team graph construction must pass one immutable `TeamRunPhysicalScope`: roots use `createRootTeamRunPhysicalScope`; every configured/task child uses `createChildTeamRunPhysicalScope(parentContext.physicalScope, childTeamRunId)`; leaf handles consume `teamContext.physicalScope` and may not reconstruct ancestry from addresses or global indexes.
- Application team-manager recursion must retain the exact graph-local `AgentRunManager`, `AgentToolMcpSessionManager`, `AgentMemoryLocationService`, definition/context/workspace services, and cleanup semantics at every nesting depth.
- Both host starters invoke only the existing app-data migration runner before application lifecycle readiness; the Team Agent memory migration depends on TeamRun V1 and precedes working-context snapshot migrations.
- Static provider/model initialization stays network-free. For each canonical dynamic AutoByteus leaf, application policy calls the process-owned availability service, which resolves one provider and executes that provider's own discovery breadth. The host validator then reads a fresh runtime model list and selects the exact identifier for that leaf; it never retains `modelsByRuntime` across later provider mutation.
- After exact model resolution, application credential readiness maps `ModelInfo.runtime` to the credential owner and calls only Personal's network-free exact credential setting; Codex and Claude retain native authentication owners. Credential-result reuse is keyed only by the adapter-resolved provider/workspace/process/no-credential authority.
- Studio application model selection calls the Personal runtime snapshot store and `ensureMissingDynamicProviders`. The composable alone supplies sparse stored/inherited/default runtime precedence, re-reads rows/source status after the store's settled provider attempts, and treats aggregate rejection only as defensive.
- General-process assembly may use named default factories only in the exact process assembly files.
- Applications depend on SDK contracts, not server/web/Electron host internals.

Forbidden:

- `buildServer(mode)` or optional-field common server base.
- application construction calling `getInstance()`/default getters for graph-sensitive run/team/session/publication/context collaborators;
- application construction omitting any nested provider factory/bootstrap/session or team handle dependency listed as Required in the normative obligation table;
- a generic DI container, service locator, event bus, bind-later publisher, reverse cleanup callback, or silent fallback;
- a second launch configuration store/reader, read-time normalization write/delete, `launch_defaults_json` conversion, or obsolete member identity branch;
- an application-local provider catalog/source lifecycle, endpoint-local application discovery, eager all-provider readiness in either host startup, restored aggregate provider API, runtime-only model-list cache, model alias/fallback, or credential-owner inference from creator identity for gateway/local serving runtimes;
- root-only memory coordinates for nested members/tasks, runtime old/new memory-path fallback, duplicate migration runner, directory merge/overwrite, or Personal-side global session/memory lookup on application paths;
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
| `ModelAvailabilityService.ensureModelAvailable` | selected dynamic model capability | parse identifier, resolve provider ID, ensure that provider catalog, verify exact registration/endpoint | model identifier + model kind + runtime | provider-granularity process owner; no package/store mutation |
| `ModelCatalogService.listLlmModels` after policy | exact leaf `ModelInfo` | fresh post-policy lookup for the current leaf | normalized runtime + exact model identifier | called per leaf by host validator; no runtime-only cache |
| `LlmProviderService.getProviderCredentialSetting` | provider credential readiness | network-free descriptor/configured status | serving credential-owner provider ID + runtime | separate from model snapshots |
| credential readiness `resolveAuthority/getReadiness` | credential equivalence and check | map resolved model/workspace to provider, Codex workspace, Claude process, local no-credential, or unsupported authority; check it | exact resolved `ModelInfo` + workspace | validator caches only non-null stable authority key |
| Pinia runtime catalog snapshot/actions | Studio model options | current snapshot, exact provider ensure, settled missing-provider convergence and safe source state | runtime + owner provider | composable preserves application runtime inheritance |
| activation registry operations | agent run activation identity | `claim`, `markPrepared`, `publish`, `releaseClaim`, `releasePrepared`, `completeAbort`, `getActiveRun`, `removeIfCurrent`, stop admission/snapshot | `agentRunId` + exact claim token + expected run | internal; exact result union |
| team manager | root team execution | create/restore/terminate | `teamRunId`, rooted `memberAddress` | Personal current model |
| MCP route/session | tool invocation | authenticate and dispatch | `sessionId`, token, run owner/team identity | internal both hosts |
| publication | artifact revision | validate/persist/event/project | `agentRunId`, revision/application binding | exact app publisher |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| four runtime projections | Yes | Yes | Low | retain exact fields |
| launch resolver | Yes | Yes | Medium | use current rooted identity only |
| model availability/catalog | Yes | Yes | Medium | selected-provider ensure plus exact post-check; prohibit application copy/endpoint lifecycle/global reload |
| credential setting | Yes | Yes | Low | map from serving runtime, not creator grouping |
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
| model availability and persisted launch rows | feature launch owner + Personal rooted row shape + Personal exact availability/catalog | Reuse/adapt | one physical table already fits; process catalog remains singular; one application policy prevents dual paths | current-rooted sparse override validator/store only |
| provider credential readiness | Personal exact credential setting + existing application adapter | Adapt | credential and model catalogs are intentionally separate; serving runtime determines the credential owner | no new service; update adapter dependency/mapping |
| Studio model choices | Personal Pinia snapshot store + existing application composable | Adapt | store owns catalogs; composable owns application runtime inheritance | no UI-side catalog or definition traversal |

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
| Provider/model capability | static/dynamic catalogs, exact selected-model ensure, credentials | DS-002–DS-004, DS-011, DS-015–DS-016 | Personal catalog/availability/provider services + application policy/adapter | Reuse/adapt | process owner shared by Studio applications and standalone process; no eager discovery |
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
| `.../agent-team-execution/domain/team-run-physical-scope.ts` and `team-run-context.ts` | team execution | physical persistence identity | normalized root/ordered ancestor scope plus containing-TeamRun invariant | current Personal domain owner | host/application mode or memory migration logic |
| root/subteam mixed factories and member registries/handles | team execution | current execution construction | propagate exact physical scope and graph-local collaborators; leaf memory derivation | existing root/recursive owners | scope reconstruction from address, global fallback, or migration |
| `.../app-data-migrations/migrations/team-agent-memory-layout-app-data-migration.ts` | app-data migrations | isolated persisted-data transition | move/validate affected complete nested AgentRun directories and report bounded outcomes | existing migration capability | runtime reads, directory merge/overwrite, package branches |
| `.../application-platform/launch-configuration/*` | launch config | resolver | baseline/override/readiness | cohesive policy area | provenance/issue shapes |
| `.../llm-management/services/{model-catalog-service,model-availability-service,dynamic-model-source-lifecycle}.ts` | provider/model capability | Personal process owner | static snapshots, provider-keyed lifecycle, selected-provider ensure and exact registration/endpoint post-check | current provider capability area | application-local catalog, endpoint-local app lifecycle, or eager startup discovery |
| `.../application-platform/launch-configuration/application-launch-host-capability-validator.ts` | launch readiness | application validator | ordered per-leaf policy, fresh exact `ModelInfo` lookup, issue mapping, credential authority reuse | existing host-capability seam | `modelsByRuntime`, source lifecycle, or persistence |
| `.../application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts` | launch readiness | application adapter | native runtime auth, serving-runtime credential authority mapping, and equivalence key | existing host-capability seam | model discovery, creator-based cache identity, or secret persistence |
| `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | Studio launch editing | application UI adapter | sparse runtime precedence, immediate rows, settled snapshot/status convergence, defensive unexpected rejection | one shared app editor composable | catalog ownership, normal failure synthesis, or server definition traversal |
| `.../application-orchestration/stores/application-launch-override-store.ts` | launch persistence | one store | safe JSON cells plus explicit upsert/delete over current table | physical persistence concern separate from policy | current-rooted sparse override |
| `autobyteus-application-devkit/**` | devkit | CLI/pack owner | commands/config/generation | existing package | contract readers |
| `applications/*/{frontend-src,backend-src,...}` | apps | package business code | canonical app source | maintained source | SDK contracts |
| `ui-prototypes/autobyteus-web-prototype/**` | isolated prototype | newest Personal prototype baseline | independent approved UI parity package, outside root pnpm workspace | one self-contained Personal-owned subtree | no production/application-platform import, workspace membership, or semantic merge edit |

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

The cumulative target inventory is `integration-path-inventory.txt`; the exact current 2,194-path delta is `evidence/solution/latest-base-refresh-round-3-path-inventory.txt`. Raw Git evidence remains in the conflict/overlap artifacts; target dispositions remove rejected feature-only/deleted aggregate owners, preserve the isolated prototype unchanged, and name every application seam adaptation.

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
| Add/accept from newest Personal | `team-run-physical-scope.ts`, Team Agent memory migration, their unit tests, nested history restart E2E, and completed nested-history production/docs/frontend changes | current physical-scope/history/migration behavior |
| Accept from Personal v1.4.56 | all 2,194 paths in `evidence/solution/latest-base-refresh-round-3-path-inventory.txt`, including current provider catalog/availability/credential/GraphQL/Pinia/media owners and the isolated non-workspace prototype subtree | current Personal behavior, subject to exact conflict/overlap decisions; prototype content remains byte-identical and outside application-platform ownership |
| Verify isolated Personal content | `ui-prototypes/autobyteus-web-prototype/**`, its three task records, and root `pnpm-workspace.yaml` | prove the subtree matches Personal, has no conflict/changed-both edit, remains outside the root workspace, and is not imported by production; do not make this ticket own or rerun the separately approved prototype parity program |
| Modify for SR-007 seam | current-model policy/guard, host capability validator (`modelsByRuntime` removal/fresh per-leaf lookup), provider credential readiness adapter (authority union/key), orchestration construction, runtime-scoped model composable (settled store convergence), five conflict paths, and remaining changed-both paths | exact current provider/application integration without a new owner |
| Add/modify SR-007 proof | model availability provider-granularity test; provider credential authority unit test; two-leaf host validator/launch/direct-run tests; Personal Pinia settled-failure and composable tests; exact conflict/overlap tests | provider/fresh-model/authority/snapshot-settlement and no-fallback proof |
| Keep removed | Personal-deleted aggregate/cached provider/media owners and old aggregate GraphQL/store APIs | clean-cut one provider/catalog architecture; no compatibility alias |
| Modify semantically for SR-005 | `mixed-agent-member-handle.ts` plus the two conflicted memory/activation tests | exact scope through injected memory service; preserve graph-local MCP cleanup and atomic activation |
| Retain audited auto-merges for SR-005 | execution-tree location service, MCP cleanup test, termination test | current physical-scope fixtures/lookup plus ticket stored-only and exact cleanup behavior |

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
| `.../llm-management/services/` current catalog/availability/lifecycle files | Folder/files | process provider capability | network-free snapshots, provider-keyed dynamic lifecycle, selected-provider ensure and exact post-check | Personal current capability area | application store/cache, endpoint-local app lifecycle, or global eager reload |
| `.../llm-management/llm-providers/services/llm-provider-service.ts` | File | provider configuration | exact network-free credential setting and explicit commands | current provider owner | aggregate model rows in credential responses |
| `autobyteus-web/stores/llmProviderConfig.ts` | File | Studio provider catalog state | runtime snapshots, exact provider ensure/reload, `Promise.allSettled` missing-provider convergence and safe source states | current Pinia owner | application override precedence |
| `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | File | application setup UI adapter | sparse runtime precedence, immediate options, and post-settlement row/status re-read | shared application editor boundary | provider lifecycle, normal provider-error synthesis, or definition traversal |
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
| Dynamic model | canonical identifier -> exact Personal source ensure -> exact membership -> serving-runtime credential check | scan/reload every provider, alias by display name, or infer credential owner solely from creator | responsive and truthful current capability |
| Studio picker | initial runtime snapshot -> immediate options -> background missing-source convergence | wait for all remote sources before any option appears | preserves sparse inheritance and Personal performance behavior |

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
| Restore aggregate/cached provider APIs | reduces v1.4.56 integration edits | Rejected | current Personal catalog, availability, credential setting and snapshots |
| Discover all dynamic providers at host/application startup | makes old list behavior easy | Rejected | static network-free startup plus exact/on-demand discovery |
| Application-local model catalog | isolates app code from Personal changes | Rejected | consume singular process provider capability through explicit policy/adapter |

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

1. Reconfirm/fetch exact `origin/personal@c5b87df4d...`; stop for renewed analysis if it moved, then reproduce one merge on the latest-Personal ticket branch.
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
12. Apply the SR-007 provider integration: retain Personal provider/catalog deletions and new owners; adapt current-model policy/guard/host validator, exact credential adapter/construction, and the runtime-scoped model composable; resolve all five conflicts and audit all ten changed-both paths.
13. Audit the cumulative target changed-both canonical paths plus the Personal-only target modifications and record authority decisions. Verify the isolated prototype subtree is byte-identical to Personal, absent from root workspace membership, and unused by production; do not semantically edit or absorb it.
14. Compile/typecheck before generation; fix source only.
15. Regenerate packages/output through devkit and prove reproducibility/parity.
16. Run implementation checks, source review, coverage investigation, full Personal provider + physical-scope + dual-host/API/E2E, durable-test review, docs/delivery, and Electron verification.
17. At delivery, refresh Personal again. If it moved, repeat an evidence-backed semantic refresh rather than force the old merge.

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
- Nested scope can be correct while the application leaf silently falls back to process services. Mitigation: combined unit/integration assertions require the exact injected manager/session/memory instances at root and nested depth.
- A migration can preserve the source but leave ambiguous duplicate paths. Mitigation: never merge/overwrite; record bounded warning/failure outcomes and keep runtime canonical-only.
- A static-only application guard can reject a valid dynamic identifier before its provider is loaded. Mitigation: classify canonical dynamic identifiers and delegate to Personal's selected-provider availability owner before a fresh exact lookup.
- A second dynamic leaf can be checked against a model list captured before its provider mutated the registry. Mitigation: remove `modelsByRuntime`, list and exact-match immediately after every leaf policy/ensure, and prove two leaves backed by distinct dynamic providers.
- The newly tracked prototype contains a large copied/vendored frontend snapshot and could be mistaken for production or pulled into root tooling. Mitigation: preserve it byte-for-byte under `ui-prototypes`, assert root workspace membership is unchanged, and forbid production/application-platform imports from it.
- Credential checks or caches can confuse model creator/runtime with serving credential authority. Mitigation: adapter-owned authority union/key plus network-free credential-setting tests for provider, Codex workspace, Claude process, and no-credential local runtimes.
- Studio can lose sparse inherited runtime, treat normal per-provider failure as aggregate rejection, or regress to blocking all discovery. Mitigation: store/composable tests for inherited/null precedence, immediate rows, `Promise.allSettled` fulfillment, `ERROR`/`STALE_ERROR` retention, and defensive aggregate rejection only.

## SR-004 Latest-Base Refresh Delta

### Authoritative Boundary Decisions

1. Latest Personal remains authoritative for its provider catalog, pricing, missing-key, provider error extraction/redaction, canonical native error fields, and native client behavior.
2. The verified ticket remains authoritative for launch baseline/overlay/readiness/store semantics, exact v6 application identity, Studio/standalone boundaries, and message-only application SDK shape.
3. `ApplicationCurrentModelSelectionPolicy` is the single new policy. `create-application-orchestration-services.ts` constructs it with an explicit AutoByteus membership function and passes the same instance to launch configuration, host capability validation, and direct run binding. No optional default or process lookup is permitted in those application constructors.
4. Saved stale AutoByteus values stay structurally visible; readiness maps the exact latest Personal code/message to `HOST_REQUIREMENT_MISSING`. Save blocks before upsert; direct start blocks before allocation. Codex/Claude skip only the AutoByteus membership guard and retain existing host/factory validation.
5. The native error branch retains safe metadata. The application branch carries only the safe nonblank `message`, filters diagnostics, preserves exact producer `agentRunId`, and rejects extra provider/native fields.
6. The three retired configuration paths and two generated SDK declaration paths remain absent. No alias, wrapper, migration, or restored predecessor test is allowed.

### Exact Conflict And File Contract

The normative 11-path conflict decisions, two marker-free overlap decisions, Add/Modify/Remove inventory, and implementation order are in `latest-base-refresh-design-analysis.md`. That supplement is part of this design; implementers must not substitute a whole-file side choice.

### No-Data-Migration Decision

No table, column, JSON shape, package schema, or contract version changes. Removed AutoByteus identifiers remain stored as entered and are rejected at evaluation/Save/run time. Reads never write; explicit Save and Reset remain the only launch-row mutations. Current pricing/error additions follow latest Personal's already-reviewed persistence behavior. Outcome: `Directly Usable — No Migration`.

### Required Verification

- exact policy unit tests for current/stale AutoByteus and external-runtime bypass;
- launch read/Save/reset and direct agent/team pre-side-effect tests;
- native provider error and strict application message-only projection tests;
- exact current SDK types, URL codec, producer identity, no retired imports, no tracked generated application SDK declarations;
- latest Personal provider/catalog/pricing/redaction suites;
- retained architecture/source gates, real Studio/standalone Codex/Luna journeys, Agent Tools/publication/projection/recovery/cleanup, package parity, and a new Electron build/smoke.

## SR-005 Nested Physical-Scope And Memory-Migration Delta

### Current/Target Runtime Spine

Current ticket-only branch behavior uses the correct graph-local application dependency family but passes root-only memory coordinates to nested leaf Agents. Newest Personal uses the correct containing-TeamRun physical scope but its conflicted leaf handle selects process-default memory/session owners. The target is the intersection, not either whole file:

`business demand -> root/child TeamRun factory -> TeamRunContext.physicalScope -> recursively injected MixedTeamManager family -> MixedAgentMemberHandle -> injected memory service with complete scope -> prepared activation/durable publication/platform binding -> exact injected session revocation`

### Exact Conflict Decisions

1. `mixed-agent-member-handle.ts`: retain the ticket constructor options, activation mode, prepared activation, platform binding, injected `AgentToolMcpSessionManager`, injected `AgentMemoryLocationService`, and `revokeAgentToolMcpSessionsForRun`; replace only root-plus-empty-ancestors memory input with `{...teamContext.physicalScope, agentRunId}`.
2. `mixed-agent-member-handle-memory-invariant.test.ts`: use newest Personal root/child physical-scope fixtures and expected nested path; retain ticket `prepareNewAgentRun`, explicit injected service, platform binding, commit/abort, and no-global-fallback proof.
3. `mixed-team-member-registry-task-agent-memory.test.ts`: use a nested containing TeamRun and newest expected path; retain ticket prepare/seal/durable-commit/release-work sequencing, platform binding, and exact application service injection.

The three marker-free overlaps retain their auto-merged combined semantics after focused review: current execution-tree physical-scope lookup plus stored-only manager construction, and physical-scope fixtures plus exact MCP cleanup/termination assertions.

### Migration Contract

`TeamAgentMemoryLayoutAppDataMigration` is registered once after TeamRun V1. It enumerates only current V1 roots and nested leaf Agents, calculates old flat and current scoped locations, and performs a whole-directory rename only for `source directory + missing target`. Missing/missing and missing/current are skips. Existing target plus flat source/residue is preserved with warning. Unsupported targets/sources or operation failure are explicit failures. It does not merge, overwrite, delete conflicts, change DB/package schemas, or add runtime compatibility.

### Bounded Implementation Sequence

This historical SR-005 sequence is superseded by the current SR-007 sequence below and must not be executed against `a00f0d...`. Its physical-scope steps remain required.

1. Re-fetch and confirm the current architecture-reviewed Personal ref; stop if the ref moved.
2. Merge once into protected `a23849f...`; preserve delivery artifacts.
3. Accept clean latest-Personal physical-scope, migration, history, memory-sync, frontend, docs, and durable-test changes.
4. Resolve the one production and two test conflicts exactly above; retain the three audited auto-merges.
5. Compile and run focused scope/activation/session/migration/history/frontend tests before broader suites.
6. Repeat source review, coverage investigation, current Personal nested-history/migration proof, existing application architecture proof, real Studio/standalone journeys, durable-test review, delivery refresh, and Electron rebuild/smoke.

No other production refactor, new maintained application fixture, public contract change, or data-schema change is authorized by SR-005. The complete file and evidence contract is in `latest-base-refresh-round-2-design-analysis.md`.

## SR-006/SR-007 Personal v1.4.56 Provider/Catalog Delta

### Current/Target Capability Spine

Current Personal owns one process provider capability: static factory rows and descriptors are available without network, dynamic state is keyed by provider/kind, and `ModelAvailabilityService` resolves a canonical selected identifier to a provider, invokes that provider's discovery breadth, then verifies exact identifier/endpoint registration. The ticket owns the application semantic boundary but its current implementation assumes all AutoByteus models are already registered, caches a runtime list across leaves, and assumes provider credentials and models share one aggregate response.

Target:

`package/saved/Save/direct leaves -> for each leaf: application current-model policy -> static exact membership OR canonical dynamic Personal selected-provider ensure + exact endpoint post-check -> fresh listLlmModels(runtime) -> exact leaf ModelInfo -> adapter-resolved credential authority/equivalence -> network-free credential/native-auth status -> next leaf -> exact application readiness/run outcome`

The policy/adapter consume Personal owners; they do not become catalog or credential authorities.

### Exact Conflict And Overlap Contract

The current merge has five conflicts and ten changed-both paths. Their per-path semantic decisions are normative in `latest-base-refresh-round-3-design-analysis.md`. In summary:

1. Preserve SR-005 physical scope plus graph-local injection/cleanup in the three member/memory conflicts.
2. Move Qwen E2E to current credential/catalog GraphQL shapes while retaining current GLM identifier/value/context proof.
3. Accept the current provider-keyed `ModelCatalogService` test; never restore the deleted aggregate catalog/provider test owner.
4. Combine tool-readiness setup with current model snapshot query in mixed-task delegation.
5. Combine Personal runtime snapshot/`Promise.allSettled` missing-provider convergence with ticket stored/inherited/optional-default runtime semantics in `useRuntimeScopedModelSelection`.

### Exact Application Adaptation

- `ApplicationCurrentModelSelectionPolicy`: explicit injected selected-provider `ensureAutoByteusModelAvailable` plus `requireCurrentAutoByteusModelIdentifier`; static/dynamic classification uses Personal canonical parsers; safe dynamic unavailability is distinct from removed static selection.
- current-model guard and host validator: map removed static to `CURRENT_MODEL_SELECTION_REQUIRED`, dynamic failure to `MODEL_UNAVAILABLE`, remove `modelsByRuntime`, perform `listLlmModels(runtime)` plus exact match immediately after every leaf policy/ensure, and pass that fresh `ModelInfo` forward. Existing pre-upsert/pre-allocation behavior remains exact.
- provider credential readiness adapter: depend on `getProviderCredentialSetting`; expose one resolved credential-authority contract/key; map API/custom/AutoByteus/Ollama/LM Studio by `ModelInfo.runtime`; retain Codex/Claude native checks; cache only identical authority keys.
- orchestration construction: inject `getModelAvailabilityService`, `LLMFactory` exact membership, current model catalog, exact provider credential service, and native clients explicitly at the existing application composition point.
- Studio composable: callable runtime getter, immediate current snapshot, background missing-provider ensure, post-settlement row/source-status re-read, inherited/no-default-null semantics, and defensive-only aggregate rejection handling.

### Data And Verification

Provider credentials/settings/custom records/saved identifiers are directly usable; dynamic source state is in-memory. SR-006/SR-007 add no schema or migration. The SR-005 nested memory migration remains unchanged.

Required proof covers Git 5/10 disposition, Personal provider-granularity discovery, exact endpoint post-check, snapshot-settled failure, application static/dynamic/credential outcomes, two leaves backed by distinct dynamic providers with fresh model reads and exact credential authorities, pre-upsert/pre-allocation failure ordering, Studio inherited/background selection, the entire SR-005 physical-scope/migration matrix, all application architecture gates, real Studio and standalone journeys, package parity/recovery/cleanup, and a new Electron build/smoke.

## Guidance For Implementation

- Treat `latest-base-refresh-design-analysis.md` as the implemented SR-004 authority, preserve the SR-005 physical-scope decisions in `latest-base-refresh-round-2-design-analysis.md`, and use revised `latest-base-refresh-round-3-design-analysis.md` as the exact current SR-007 merge/application resolution map.
- Construct one explicit current-model policy and inject it into all three application validation boundaries; consume Personal selected-provider availability and do not duplicate provider lifecycle or add optional/global defaults. In the host validator, resolve a fresh exact `ModelInfo` after each leaf policy step and never cache a runtime model list across leaves.
- Keep native provider metadata native and the application SDK message-only.
- Preserve every delivery/review-owned file/evidence while implementing; do not stage or rewrite another owner's current dirty records.
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
- For nested team execution, propagate `TeamRunPhysicalScope` from root/child factories and use it only through the injected memory service; do not reconstruct it in application code or replace the injected session/memory owners with Personal's process defaults.
- Keep old flat nested-memory knowledge inside `TeamAgentMemoryLayoutAppDataMigration`; no runtime dual read, alias, compatibility directory, or second migration pass.
- Keep provider startup network-free for static catalogs. Delegate only the selected identifier's owning provider to Personal; accept that provider's existing configured-host/kind breadth, but never enumerate every provider or create endpoint-local application lifecycle state.
- Use the resolved model serving runtime for credential ownership and call only the network-free credential setting. Do not restore aggregate provider settings or treat gateway model creator identity as secret ownership. Reuse a result only for the adapter's identical resolved authority key.
- Merge the runtime-scoped model composable deliberately: preserve inherited/no-default runtime, publish current rows before background missing-provider discovery settles, and re-read Personal source statuses after `Promise.allSettled`; do not use `.catch` as the normal provider-failure path.
- Delete generated output before resolving source, and regenerate only after builds pass.
- Do not create/update `implementation-handoff.md` during solution design; the implementation engineer owns it after implementation.
