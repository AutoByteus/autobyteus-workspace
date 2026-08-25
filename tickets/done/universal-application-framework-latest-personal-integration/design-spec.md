# Design Spec — Universal Application Framework Latest-Personal Integration

## Current-State Read

Personal v1.4.58 and the Universal Application Framework are combined. SR-011 corrected the canonical Studio definition/run catalog design. SR-012 then corrected task execution to the exact member/root scope, and `ARCH-REV-012` accepted that ownership, session, dispatch, AutoByteus, lifecycle, and no-migration direction. One construction-completeness branch remains.

- **Current integrated branch** at reviewer HEAD `a5a613153...` contains Personal v1.4.58 through history-preserving merge `52ab1fe6f...`; `git merge-base --is-ancestor fb1335867... HEAD` succeeds. The merge is complete and is not repeated by SR-013.
- **Accepted SR-011 boundary:** one bound host Agent/Team definition catalog serves public definition APIs, explicit general-process run construction, application construction, and package/catalog refresh. General and application run managers and MCP session managers intentionally remain distinct.
- **ARCH-REV-011/012 / AR-007 evidence:** every Team member receives the server-owned `delegate_task`, with the other task lifecycle tools exposed only where already requested by current configured/task-member behavior. SR-012 correctly replaces process-general lookup with a root-local member capability. Re-review found that `GeneralProcessRunSupervisor` and application run construction each create a custom `MixedTeamManager`, while the mixed factory still permits `createBackend`/`restoreBackend` without callbacks through `noopCallbacks`; SR-012 did not exhaustively assign these and all direct construction fixtures.
- **Existing correct owner:** `RootTeamRun` already owns task command admission, task lifecycle, task execution routing, persistence, and close/fail-stop semantics. `AgentTeamRunManager.materializeRoot()` already creates root-local callbacks for inter-agent messaging and platform binding before the root is assigned, then binds them to the exact root. Task resolution belongs on the same root-local construction path.
- **Existing transport structure:** Studio and standalone use one internal Agent Tools route, catalog, dispatcher, executor, and task tool manifest. General and application scopes have separate scoped session managers. The external Studio `/mcp/gateway` remains unrelated.
- **AutoByteus path:** AutoByteus task tools are server-owned tools. Today they reconstruct only member identity from native custom data and call the same default task service; they must receive the same member-bound resolver as MCP-backed Codex/Claude sessions. Native Codex/Claude file tools are not modified.

The current task pressure is a **bounded medium construction-completeness correction** within the accepted authority design. The task service/router remains shared and stateless with respect to execution scope; the exact member/root capability is created by the RootTeamRun owner, propagated through immutable member context, and projected into each Team-member session or AutoByteus tool instance. SR-013 additionally makes executable mixed-factory callbacks required, forwards the resolver through both custom assembly managers, and exhaustively governs direct production/test constructions. No route, catalog, task system, manager, store, schema, migration, host mode, or business feature is added.

## Intended Change

Preserve the completed merge, accepted SR-011 host-definition design, and accepted SR-012 task-ownership design. Add one domain-owned `MemberTaskRootResolver` capability that can resolve only the exact active RootTeamRun captured during `AgentTeamRunManager.materializeRoot()`. Propagate that required capability through the existing mixed root/subteam/configured/task-member construction callbacks into `MemberTeamContext`. Both `GeneralProcessRunSupervisor` and `createApplicationRunServices` must forward the callback into their custom `MixedTeamManager`; the default mixed manager does the same.

At Agent Tools session issuance, create a tight discriminated execution-capability variant: ordinary Agent sessions carry the existing publication capability, while Team-member sessions additionally carry a frozen task-delegation context derived from the exact immutable member context. The task MCP adapter requires the Team-member variant; the existing task service/router resolves only through its supplied member capability and never imports `getTeamRunService()` or restores another root. AutoByteus tool instances receive the same bound context through explicit tool configuration and no longer parse identity-only native custom data.

`MixedTeamRunBackendFactory.createBackend` and `restoreBackend` require a complete `MixedTeamRunCallbacks` argument; `noopCallbacks` is removed. Context-only `buildTeamRunContext` remains usable without callbacks because it cannot create an executable root. Root construction, session issuance, and native tool creation fail closed on missing or inconsistent Team-member scope. Root closure and existing session revocation make later calls fail before task mutation. No production file is changed during solution design. Implementation and delivery resume only after SR-013 architecture review.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger Or Contract | Existing Evidence | Approved Change Or Preserved Outcome | Target Path / Spine IDs |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-002; AC-001, AC-002, AC-014 | Refresh the verified checkpoint onto newest Personal | Protected checkpoint, new ref, merge-tree preview | Preserve both histories; merge the new Personal ref once without rewriting | DS-001, DS-010 |
| BEH-002 | User | REQ-003; AC-003, AC-004 | Run application commands from maintained folder | Package/tree comparison | Preserve devkit native workflow and build-once package behavior | DS-002, DS-003 |
| BEH-003 | System | REQ-004, REQ-005; AC-005–AC-008 | App launches agent/team and consumes return events | Personal current managers; feature final dual-host evidence | Use current Personal lifecycle/identity with exact application-scoped dependencies | DS-004–DS-006, DS-008 |
| BEH-004 | User/Contract | REQ-005, REQ-008; AC-006, AC-009, AC-012 | Evaluate package default, saved sparse override, Save, or direct launch | Current launch owner/store plus newest AutoByteus membership behavior | Retain exact stored value/provenance, block stale AutoByteus selection, and preserve external-runtime ownership | DS-002, DS-003, DS-009, DS-011 |
| BEH-005 | Operational | REQ-002, REQ-006, REQ-010–REQ-011; AC-002, AC-026–AC-029 | Resolve v1.4.57 refresh | DR-008 plus solution-owned two-conflict/two-overlap evidence | Accept governed workspace production auto-merge and combine both form test contracts without weakening either owner | DS-001, DS-017 |
| BEH-006 | Contract | REQ-007–REQ-011; AC-011, AC-025–AC-029 | Review/test refreshed candidate | DR-007 and Personal v1.4.57 ticket evidence are separate baselines | Execute focused workspace/provider proof plus retained architecture/dual-host/package/Electron proof | DS-007, DS-017 |
| BEH-007 | User/Contract | REQ-008; AC-013, AC-015 | Provider error reaches native and application consumers | Latest native error contract plus current v6 application stream | Native transport keeps safe metadata; application SDK carries only original safe message with exact identity | DS-012 |
| BEH-008 | System/Operational | REQ-004–REQ-005, REQ-009; AC-005, AC-008, AC-016–AC-020 | Nested configured/task execution or host upgrade/restart | Passed application graph-local lifecycle plus newest Personal physical-scope/migration evidence | Use exact containing-TeamRun scope without losing injection/activation/cleanup; migrate old flat nested memory before readiness | DS-004–DS-006, DS-008, DS-013–DS-014 |
| BEH-009 | System/User | REQ-005, REQ-008, REQ-010; AC-006, AC-009, AC-012, AC-021–AC-025 | Package/saved/Save/direct one-or-more-leaf AutoByteus selection or Studio model editing with provider failure | Current application configuration boundary plus Personal v1.4.56 provider/catalog/store owners and `ARCH-REV-006` evidence | Provider-granularity ensure plus fresh exact leaf model, adapter-owned credential equivalence, and settled snapshot/UI outcomes; no endpoint-local/eager/duplicate catalog | DS-002–DS-004, DS-009, DS-011, DS-015–DS-016 |
| BEH-010 | User/System | REQ-007, REQ-010–REQ-011; AC-026–AC-029 | Studio Agent/Team draft selects New workspace, receives unrelated config/provider edits or delayed discovery, then launches | Personal v1.4.57 controlled workspace source/tests plus current provider-granular form/composable tests and round-4 merge evidence | One panel-owned workspace state survives, registers before launch, and relays through thin forms while provider rows/snapshots/settlement remain independent | DS-007, DS-017 |
| BEH-011 | System/Operational | REQ-004–REQ-007, REQ-009–REQ-012; AC-030–AC-035 | Application launches a nested Team or either host opens/restores historical TeamRun data | Personal v1.4.58 topology/planner/V2/migration source plus current application launch resolver and DR-010 evidence | Resolve complete application Team scopes and leaves once, validate all before planner-owned allocation, keep current runtime/history V2-only, and migrate V1 after physical-scope memory repair | DS-018–DS-023 |
| BEH-012 | User/Contract | REQ-004, REQ-005, REQ-007, REQ-012; AC-005, AC-032, AC-035 | Studio/public client creates/lists/updates/deletes and launches Agent/Team definitions in one process or after restart | CRR-020, API-REV-010 real built-server evidence, current composition/getter trace | One exact host definition family serves public definition APIs, general runs, application configuration/runs, and refresh; general/application run and session state remains isolated | DS-024 |
| BEH-013 | System/Contract | REQ-004, REQ-005, REQ-007; AC-005, AC-007–AC-008, AC-036 | Active general or application Team member invokes `delegate_task`, `submit_task_result`, or `review_task_result` through its authenticated session or AutoByteus tool instance | ARCH-REV-011 / AR-007 and exact source trace from automatic exposure through adapter/service/router to `getTeamRunService()` | Bind task execution to the exact member/root scope; general and application members mutate only their own RootTeamRun; missing/mismatched/closed/revoked scope fails before mutation | DS-025 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `integration-strategy-analysis.md` | Strategy, authority, critical seam, resolution and verification details | All | Defines the completed merge policy plus SR-011 host-definition and SR-012/SR-013 task-scope addenda | Revised SR-013 / approved preserved behavior |
| `integration-runtime-contracts.md` | Exact host lifecycle, activation/provisioning, construction obligations, launch/data contracts, canonical definition-service ownership, and verification | REQ-004–REQ-007, REQ-012; AC-005–AC-011, AC-032, AC-035–AC-036 | Sections 1–8 preserve implemented behavior; section 9 is normative for DS-024; section 10 is normative for DS-025 including SR-013 occurrence closure | Design-ready SR-013 |
| `latest-base-refresh-design-analysis.md` | Exact prior-base authority, current-model/error boundaries, conflict/overlap map, inventory, and verification delta | REQ-001–REQ-008; AC-001–AC-015 | Implemented/verified SR-004 authority for DS-010–DS-012 | Complete / passed historical baseline |
| `latest-base-refresh-round-2-design-analysis.md` | Exact nested physical-scope, migration, conflict/overlap, inventory, and verification delta | REQ-001–REQ-009; AC-001–AC-020 | Implemented SR-005 authority for DS-013–DS-014 | Complete / verified historical baseline |
| `latest-base-refresh-round-3-design-analysis.md` | Exact v1.4.56 provider/catalog/model/credential/UI and physical-scope integration | REQ-001–REQ-010; AC-001–AC-025 | Implemented SR-007 authority for DS-013–DS-016 | Complete / verified in DR-007 |
| `latest-base-refresh-round-4-design-analysis.md` | Exact v1.4.57 controlled-workspace/provider-form integration | REQ-001–REQ-002, REQ-007, REQ-010–REQ-011; AC-001–AC-002, AC-026–AC-029 | Implemented historical authority for DS-017 preserved by SR-009 | Complete / verified in DR-009 |
| `merge-attempt.log` | Raw trial merge evidence | REQ-002; AC-002 | Grounds conflict measurement | Complete / N/A |
| `merge-conflict-inventory.txt` | Exact conflict classification | REQ-002, REQ-006 | Drives conflict resolution classes | Complete / N/A |
| `branch-overlap-inventory.txt` | Exact changed-both inventory | REQ-002, REQ-006 | Defines marker-free audit set | Complete / N/A |
| `integration-path-inventory.txt` | Add/modify/remove/regenerate inventory | REQ-003–REQ-007 | Concrete starting file inventory | Complete / N/A |
| `latest-base-refresh-conflict-report.md` | Delivery-owned original refresh blocker | REQ-001–REQ-002, REQ-006–REQ-008; AC-001–AC-002, AC-010–AC-015 | Triggering Design Impact evidence retained untouched | Complete / N/A |
| `evidence/delivery/dr-004-base-refresh-and-integration.log` | Delivery-owned raw fetch/path/preview evidence | REQ-001–REQ-002, REQ-006; AC-001–AC-002, AC-010 | Grounds the original 31-commit measurement extended by the current-ref revalidation | Complete / N/A |
| `latest-base-refresh-round-2-conflict-report.md` | Delivery-owned DR-006 blocker | REQ-001–REQ-002, REQ-006–REQ-009; AC-001–AC-002, AC-016–AC-020 | Triggering evidence retained untouched | Complete / N/A |
| `evidence/delivery/dr-006-base-refresh-and-integration.log` | Delivery-owned current fetch/path/migration/preview evidence | REQ-001–REQ-002, REQ-006, REQ-009; AC-001–AC-002, AC-016 | Grounds the five-commit, three-conflict measurement | Complete / N/A |
| `evidence/solution/latest-base-refresh-round-3-{merge-preview.log,conflict-inventory.txt,overlap-inventory.txt,path-inventory.txt}` | Historical v1.4.56 refs/counts/merge/path evidence | REQ-001–REQ-002, REQ-006, REQ-010; AC-016, AC-021–AC-025 | Grounds the implemented five-conflict, ten-overlap, 2,194-path SR-007 target and isolated prototype additions | Complete / N/A |
| `latest-base-refresh-round-4-conflict-report.md` and `evidence/delivery/dr-008-base-refresh-and-integration.log` | Delivery-owned v1.4.57 blocker and raw evidence | REQ-001–REQ-002, REQ-007, REQ-011; AC-001–AC-002, AC-026 | Triggering Design Impact evidence retained untouched | Complete / N/A |
| `evidence/solution/latest-base-refresh-round-4-{merge-preview.log,conflict-inventory.txt,overlap-inventory.txt,path-inventory.txt}` | Historical exact v1.4.57 refs/counts/merge/path evidence | REQ-001–REQ-002, REQ-007, REQ-011; AC-001–AC-002, AC-026–AC-029 | Grounds the four-commit, 95-path, two-conflict/two-overlap target | Complete / N/A |
| `latest-base-refresh-round-5-design-analysis.md` | Exact v1.4.58 hierarchical Team launch, V2 migration, conflict/generated-output, file, sequence, and proof contract | REQ-001–REQ-012; AC-001–AC-035 | Implemented SR-010 authority for DS-018–DS-023 and all 13/30/50 dispositions, preserved by DS-024–DS-025 | Implemented and source-reviewed |
| `latest-base-refresh-round-5-conflict-report.md` and `evidence/delivery/dr-010-base-refresh-and-integration.log` | Delivery-owned v1.4.58 blocker and raw evidence | REQ-001–REQ-002, REQ-004–REQ-007, REQ-009–REQ-012; AC-030–AC-035 | Triggering Design Impact evidence retained untouched | Complete / N/A |
| `evidence/solution/latest-base-refresh-round-5-{merge-preview.log,conflict-inventory.txt,overlap-inventory.txt,path-inventory.txt}` | Current exact v1.4.58 refs/counts/merge/path evidence | REQ-001–REQ-002, REQ-006–REQ-007, REQ-012; AC-030–AC-035 | Grounds the 38-commit, 633-path, 13-content/30-generated/50-overlap target | Complete / N/A |

## Task Design Health Assessment

- Change posture: post-integration bug fix with a bounded execution-scope refactor.
- Current design issue found: `Yes`; task-delegation dispatch bypasses the issuing application RootTeamRun owner and reaches a process-general run service.
- Root cause classification: `Boundary Or Ownership Issue` and `Missing Invariant`.
- Refactor needed now: yes, but only across the existing RootTeamRun -> member context -> session/native tool -> task service/router spine. The service/router is retained; the ambient Team service lookup is removed.
- Product reachability: `Reachable`. Application Team launch automatically exposes `delegate_task` to every member, and the authenticated application session uses the shared adapter in an ordinary supported run.
- Governing owner: `RootTeamRun` remains the sole task lifecycle owner. `AgentTeamRunManager` binds its exact root during materialization; `MemberTeamContext` carries the resulting narrow capability; session/native tool construction projects it; the shared task service/router executes against it.
- Design response: use a root-specific capability with no caller-selected root ID, no restore behavior, and no process/global lookup. Preserve one task domain and one transport surface while keeping general/application managers and sessions distinct.
- Refactor rationale: this strengthens the existing authoritative boundary and removes a fallback-by-omission path. It does not create a new coordinator or a generic scope-routing framework.
- Intentional deferrals: none on the in-scope path. External Studio MCP gateway configuration, native Codex/Claude file tools, provider/model behavior, Team V2 data, and broader runtime unification remain out of scope because they are neither causes nor required consequences.

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
- **Workspace selection state:** the complete transient Studio choice `{mode, existingWorkspaceId, newWorkspacePath}` owned by `RunConfigPanel`; it is not a persisted workspace record or a form/selector-local copy.
- **Application Team scope configuration:** one complete effective runtime/model value plus rooted Team identity/provenance for a configured Team definition. It is resolved by the application launch owner, not inferred by Team execution.
- **TeamRun V2:** Personal's sole current Team execution-tree package: complete default per configured Team, complete launch snapshot per configured Agent, rooted physical scope, and optional application binding. V1 is migration input only.
- **Host definition services:** one bound process-lifetime, bundle-aware Agent definition service plus one Team definition service built over the exact Agent service. They own the executable host catalog/cache identity used by all runtime definition consumers; they do not own run lifecycle, MCP sessions, or transient package validation.
- **Bundle-backed definition services:** a concrete unbound Agent/Team service pair over bundle-aware file/persistence providers. It is construction output, not a runtime owner; only host binding and standalone package validation may create it.

- **Member task root resolver:** an immutable root-specific capability created during RootTeamRun materialization. It has one operation, `resolveActiveRoot()`, accepts no arbitrary TeamRun ID, never restores, and fails when the captured root is unbound or inactive.
- **Team-member session capability:** the specialized Agent Tools session execution-capability variant containing the existing publisher plus the exact frozen task-delegation context. It is distinct from the ordinary Agent-session variant rather than adding nullable fields to a shared bag.

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
- Existing workspace registry rows, Agent/Team workspace IDs, and run history remain `Directly Usable — No Migration`. SR-008's `WorkspaceSelectionState` is transient frontend state; successful New registration continues through the existing `workspaceStore` and current launch owners.
- Historical TeamRun V1 packages are `Migration Required`: current Personal creation/catalog/history/location are V2-only, and retaining a V1 reader would create a compatibility path.
- Current TeamRun V2 packages are `Directly Usable — No Migration`; they preserve complete Team/Agent launch state, application binding, and physical scope.
- Agent/Team definition files are `Directly Usable — No Migration`: SR-011 changes in-memory service construction and cache identity only. Existing shared, team-local, and application-owned files remain at the same roots with the same IDs/JSON/package bytes and are repopulated into the one host cache family on startup. No copy, rewrite, seed, cache mirror, or compatibility lookup is permitted.
- Affected pre-refresh nested Team Agent memory is `Migration Required`: the old flat root-TeamRun location is not the current canonical path, cannot be rebuilt without losing user memory, and must not become a runtime fallback.
- Migration owner: the existing process `AppDataMigrationRunner` with registered `TeamAgentMemoryLayoutAppDataMigration` and `TeamRunExecutionTreeV2AppDataMigration`; both Studio and standalone invoke this runner before application lifecycle readiness.
- Ordering: TeamRun Execution Tree V1 -> Team Agent memory layout -> TeamRun Execution Tree V2 -> dependent external/native working-context snapshot/history migrations -> remaining process/application readiness.
- Transformation: enumerate nested Agent executions from current TeamRun V1, compute old flat and current physical-scope directories, rename the complete source directory only when the target is missing, then validate source/target postconditions. Never merge directories, overwrite a target, copy per file, or mutate runtime metadata.
- Completion/recovery: fresh/unmaterialized/current/direct-root cases skip; both directories are preserved with an explicit warning; unsupported/failed locations record a failure; the existing migration ledger and `ANYTIME` policy own retry. Historical-schema knowledge does not escape the migration.
- Required invariants: no launch-row rewrite, no memory loss, no partial per-file copy, no old/new runtime dual read, no package mutation, no second migration runner, no skipped prerequisite, and no application/global dependency fallback.
- Normative transition matrix: [latest-base-refresh-round-5-design-analysis.md](latest-base-refresh-round-5-design-analysis.md), persisted-data section; the round-2 memory migration remains its prerequisite.
- Supports: REQ-004–REQ-012; AC-005–AC-009, AC-011–AC-035.

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
| DS-017 | Primary + return/update | BEH-010 | Studio Agent/Team draft selects or edits a workspace | canonical workspace launch or preserved visible error state | `RunConfigPanel` with controlled selector/form relays | Preserves launch-what-is-shown while remaining independent from provider settlement |
| DS-018 | Primary End-to-End | BEH-011 | Application package/selected Team definition plus sparse host override | complete effective Team scopes and Agent leaves or exact issue | `ApplicationLaunchConfigurationService` + baseline/host validators | Makes application package precedence explicit and dynamic-Agent-safe |
| DS-019 | Primary End-to-End | BEH-011 | Runnable application Team command | validated current TeamRun V2 and provider execution | application run-binding adapter -> Personal `TeamRunService`/planner/allocator | Preserves validation-before-allocation and graph-local execution |
| DS-020 | Primary Startup/Data Transition | BEH-011 | Host starts with V1/current V2/fresh history | V2-only current catalog or explicit migration status | process migration runner + Personal V2 migration | Keeps V1 knowledge out of runtime |
| DS-021 | Bounded Local | BEH-011 | Stored memory/history location during migration | exact V2 physical path without live-manager fallback | stored-only execution-tree location/classifier | Preserves startup acyclicity and graph isolation |
| DS-022 | Primary + return/update | BEH-011 | Studio edits current or stored hierarchical Team config | current hierarchy or exact stored V2 values | Personal form hierarchy + existing workspace/provider owners | Composes new hierarchy without losing approved selection behavior |
| DS-023 | Operational/Build | BEH-001, BEH-005, BEH-011 | source merge and package build | canonical source plus disposable parity output | SDK/devkit build and package generation | Prevents 30 generated conflicts becoming source authority |
| DS-024 | Primary End-to-End + lifecycle | BEH-012 | Studio definition create/list/update/delete or host restart | same definition is launchable through general/application paths, or deleted definition fails truthfully | `HostDefinitionServices` + configured public APIs + explicit general/application consumers | Removes competing caches while preserving run/session isolation |
| DS-025 | Primary End-to-End + bounded capability | BEH-013 | Active Team member invokes a server-owned task tool | exact issuing RootTeamRun task state changes or the call fails before mutation | RootTeamRun + immutable member context + scoped session/native tool + shared task service/router | Removes process-general dispatch from application sessions without duplicating task infrastructure |

## Primary Execution Spine(s)

### DS-001 — Integration

`protected verified v1.4.57 ticket branch -> re-fetch exact v1.4.58 Personal -> one history-preserving merge -> classify 13 content + 30 generated modify/delete + 50 changed-both paths -> resolve by current owner -> regenerate disposable outputs -> focused/full proof -> reviewed integrated commit`

### DS-002 — Studio

`server-runtime logging/core migration/protected paths/Prisma/token schema/vault/app-data policy -> buildStudioServer(process MCP/general runs + registry/definitions/application platform + routes) -> ApplicationPlatformLifecycle.prepareBeforeListen -> listen -> Studio transports/internal URL/messaging -> ApplicationPlatformLifecycle.recoverAfterListen -> launch readiness -> iframe bootstrap -> shared application client -> application business command`

### DS-003 — Standalone

`autobyteus-app dev/start -> resolve/validate selected package and isolated root -> logging/core migration/protected paths/Prisma/token schema/vault/app-data policy -> process MCP/general runs + selected application platform -> buildStandaloneApplicationServer -> ApplicationPlatformLifecycle.prepareBeforeListen -> listen/internal URL -> recover selected application -> launch readiness -> same-origin bootstrap -> shared application client -> application business command`

### DS-004 — Application execution

`application backend command -> ApplicationLaunchConfigurationService.requireRunnableConfiguration -> current AgentRunProvisioningService or current team preparation -> current StandaloneAgentRunActivationService -> current AgentRunManager/AgentTeamRunManager -> current Codex/Claude/AutoByteus backend -> provider execution`

### DS-009 — Launch configuration and persistence

`immutable package resource/default definitions -> optional saved resource row from ApplicationLaunchOverrideStore -> selected-resource baseline -> current-rooted sparse override validation/overlay -> complete effective Team scopes plus Agent leaves (or one Agent) with provenance -> current host availability -> RUNNABLE or explicit blocking state`

Reads never write. Explicit Studio Save is the only upsert path; explicit Reset is the only delete path.

### DS-010 — Historical v1.4.56 Personal refresh

Historical SR-007 spine, now implemented and verified:

`protected checkpoint a23849f -> merge c5b87df4d -> provider/catalog + nested-team/history/migration integration -> five conflict/ten overlap resolution -> bounded application seam adaptations -> reviewed/tested DR-007 checkpoint`

### DS-011 — Current-model selection

`package baseline or saved sparse override -> ordered effective selection subjects (Team scopes and Agent leaves) -> per-subject shared current-model policy -> static AutoByteus membership OR canonical dynamic selected-provider ensure/exact endpoint post-check OR Codex/Claude bypass -> fresh exact runtime model lookup -> resolved credential authority/readiness -> next subject -> RUNNABLE or distinct blocking issue`

Explicit Save applies the same policy before upsert. Direct agent/team start applies it to all normalized configs before agent creation or team-run allocation. These are validation boundaries around one policy, not competing configuration authorities.

### DS-012 — Provider error return

`provider extractor/redactor -> canonical native ERROR(code + safe message + optional safe metadata) -> native consumers; canonical AgentRun/team event -> application projector -> diagnostic filter -> exact {type: ERROR, message} -> v6 envelope/strict SDK parser`

### DS-013 — Nested application execution and memory

`application business command -> current root TeamRun physical scope -> configured/task subteam factory appends containing teamRunId -> same graph-local MixedTeamManager family -> MixedAgentMemberHandle -> injected AgentMemoryLocationService({ ...teamContext.physicalScope, agentRunId }) -> prepareNewAgentRun -> durable publication/platform binding -> provider execution -> exact injected session cleanup on termination`

No Agent or Team run is created during host construction. The business action remains the trigger; physical scope only supplies canonical persistence identity when the current execution owner creates/restores the requested run.

### DS-014 — Nested memory startup migration

`Studio or standalone process start -> existing AppDataMigrationRunner.runPending -> TeamRun Execution Tree V1 prerequisite -> TeamAgentMemoryLayoutAppDataMigration -> classify current root/index and nested leaf -> old flat path/current physical path decision -> validated whole-directory rename or explicit skip/warning/failure -> migration ledger -> dependent snapshot migrations -> application lifecycle readiness`

### DS-015 — Current Personal model availability and application readiness

`effective Team scopes and Agent leaves in deterministic order -> per subject canonical static/dynamic classification -> static current-membership guard OR ModelAvailabilityService identifier-to-provider resolution + provider-granularity ensure + exact endpoint registration check -> fresh ModelCatalogService.listLlmModels(runtime) -> exact ModelInfo for that subject -> credential adapter resolves authority/equivalence key -> readiness -> next subject -> RUNNABLE, CURRENT_MODEL_SELECTION_REQUIRED, MODEL_UNAVAILABLE, or RUNTIME_AUTHENTICATION_UNAVAILABLE`

The host validator removes `modelsByRuntime`; no runtime-only model snapshot survives a later provider mutation. Every Team scope and leaf receives the `ModelInfo` read immediately after its own policy/ensure step. Credential results may be reused only when the adapter returns the same resolved authority key. Read retains exact package/saved value and provenance. Save maps model-selection blocking outcomes before store upsert. Direct agent/team launch applies the same policy before any run allocation. Process start never ensures all dynamic providers.

### DS-016 — Studio runtime-scoped model selection

`stored runtime -> inherited runtime -> optional default -> no request if deliberately null -> fetch current runtime snapshot -> publish providersWithModelsForSelection(runtime) immediately -> background ensureMissingDynamicProviders(runtime) -> per-provider mutation writes READY/PARTIAL/ERROR/STALE_ERROR -> Promise.allSettled aggregate fulfills -> re-read same runtime rows and source statuses -> retain stale rows; unexpected aggregate rejection follows defensive log/re-read only`

### DS-017 — Controlled Studio workspace selection beside provider settlement

`RunConfigPanel authoritative WorkspaceSelectionState -> AgentRunConfigForm or TeamRunConfigForm thin relay -> controlled WorkspaceSelector -> complete replacement event -> same RunConfigPanel state`

Unrelated runtime/model/member edits and provider or workspace discovery do not replace that state. On accepted launch, New mode follows `trim path -> workspaceStore.createWorkspace on bound node -> canonical workspace ID/config -> existing Agent/Team launch owner -> history`. Failure returns to the same visible New/path plus error and invokes no stale Existing/Temp launch. The form presentation also continues the independent DS-016 path through `RuntimeModelConfigFields`; neither spine owns the other.

### DS-018 — Application Team launch resolution

`application-owned Team definitions -> rooted Team-scope baseline (own Team then outer Teams) + Agent-leaf baseline (inner Team -> outer Teams -> Agent) -> optional selected resource -> sparse host slot/team overlay across all scopes/leaves -> exact member overlay on leaf -> package/host/current-model/credential validation for every scope and leaf -> complete effective Team projection or explicit issue`

### DS-019 — Hierarchical Team run creation

`application business command -> requireRunnableConfiguration -> backend SDK maps teamScopes/member leaves -> ApplicationRunBindingLaunchService -> Personal TeamRunService.createTeamRun -> TeamDefinitionTopologyPlanner exact coverage/completeness -> TeamRunIdentityAllocator allocates root/nested Team and Agent IDs -> V2 package persistence + application binding -> current Team execution/provider path`

No application code allocates a Team ID or traverses definitions at this boundary. Preset launches use Personal's current root-inherited path; explicit application topology carries all scopes and leaves.

### DS-020 — TeamRun V2 startup migration

`host startup -> AppDataMigrationRunner -> TeamRun V1 prerequisite -> Team Agent memory-layout migration -> TeamRunExecutionTreeV2AppDataMigration -> direct coordinator snapshot per Team reconstructs complete default -> preserve applicationBinding/physical scope -> atomic write -> reread/admit V2 -> current V2 catalog/recovery`

### DS-021 — Stored-only memory/history location

`migration/classifier -> stored TeamRun execution-tree location service -> V2 package catalog/index -> physical scope -> canonical Agent memory location`

This path cannot consult the live process-global TeamRun manager; it operates before application graphs and recovery exist.

### DS-022 — Hierarchical Studio configuration

`editable definition/draft OR immutable stored V2 Team view -> Personal hierarchical Team/member controls -> existing controlled WorkspaceSelectionState relay + provider-granular runtime/model selection -> exact current or stored presentation -> Save/launch/history outcome`

### DS-023 — Source-to-package regeneration

`canonical SDK/application source -> SDK/devkit build -> disposable maintained package vendor/importable output -> validate both applications -> Studio/standalone parity -> clean generated output`

The 30 modify/delete paths remain deleted from source control; no conflict is resolved by restoring them.

### DS-024 — Canonical host definition-to-run lifecycle

Primary Studio Agent spine:

`public create/update/list Agent definition -> configured Studio Agent definition service -> shared/bundle-aware persistence + same cache -> configured public AgentRunService -> explicit AgentRunIdentityAllocator/backend bootstrapper using the same Agent definition service -> general AgentRunManager -> current run outcome`

Primary Studio Team spine:

`public create/update/list Team definition -> configured Studio Team definition service (built over the same Agent service) -> same Team cache -> configured public TeamRunService -> TeamDefinitionTopologyPlanner + AgentRunIdentityAllocator using the same Team/Agent services -> general AgentTeamRunManager -> current TeamRun outcome`

Application spine:

`application package/catalog refresh -> same host definition services -> ApplicationLaunchConfigurationService/readiness -> createApplicationRunServices receives the same definition objects -> separate application AgentRunManager/AgentTeamRunManager and MCP session scope -> application run outcome`

Lifecycle/return spine:

`host startup migrations (non-caching optional label lookup) -> create/bind HostDefinitionServices -> process Agent Tools -> explicit general run supervisor/services -> application runtime -> configure public API -> listen; close/reject -> stop application runs -> stop/release general runs/services -> close Agent Tools -> unconfigure public API -> stop remaining definition-consuming process owners -> release Team then Agent definition service -> vault/Prisma`

Delete has no fallback: the canonical service removes the file/cache entry; subsequent list omits it and subsequent launch fails through the same service. Restart reconstructs one service family from the unchanged roots. Active runs retain their already-materialized snapshot and are not mutated by later definition edits/deletes.

### DS-025 — Member-bound task delegation

Application MCP-backed Team member (primary spine `DS-025-A`):

`application business launch -> application AgentTeamRunManager.materializeRoot creates one root-local MemberTaskRootResolver -> application custom MixedTeamManager forwards callbacks.taskRootResolver -> mixed subteam/member construction -> MemberTeamContext(identity + resolver) -> application-scoped Agent Tools session issues Team-member capability -> authenticated shared task adapter -> shared stateless TaskDelegationToolService/router -> resolver.resolveActiveRoot() -> exact application RootTeamRun task command -> existing task persistence/event/member execution`

General MCP-backed Team member (primary spine `DS-025-G`):

`Studio/public Team launch -> GeneralProcessRunSupervisor's TeamRunService/AgentTeamRunManager -> materializeRoot creates one root-local MemberTaskRootResolver -> supervisor custom MixedTeamManager forwards callbacks.taskRootResolver -> mixed subteam/member construction -> MemberTeamContext(identity + resolver) -> general scoped Agent Tools session issues Team-member capability -> same authenticated adapter/service/router -> resolver.resolveActiveRoot() -> exact general RootTeamRun task command -> existing task persistence/event/member execution`

AutoByteus Team member (`DS-025-N`):

`same RootTeamRun/member context -> resolveAutoByteusAgentTools -> explicit bound ToolConfig(task-delegation context) -> registered task tool class -> same shared task service/router -> exact RootTeamRun`

Return/failure:

`RootTeamRun command -> existing TaskDelegationService queue/persistence/event -> tool result -> MCP/native caller`. If the root is not yet bound, session owner identity disagrees with member identity, root is closed, or the session is revoked, the path returns the existing structured task/session error before task mutation. The resolver does not accept an arbitrary ID and does not call a TeamRunService, manager, restoration path, registry lookup, or application-ID router.

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
| DS-017 | One panel-owned workspace value passes through thin forms and a controlled selector, then is resolved exactly once at launch; provider state remains in its existing sibling owner. | workspace mode, existing ID, New path, canonical registered workspace | `RunConfigPanel` | delayed discovery, registration error, history projection |
| DS-018 | Application launch resolution computes one complete authoritative hierarchy before readiness; no Team default is invented later. | Team scopes, Agent leaves, sparse override, provenance, issue | application launch configuration service | provider/credential lookup |
| DS-019 | The application adapter passes complete values to Personal; Personal validates topology before allocating identities and persists current V2. | complete Team/Agent configs, identities, binding, V2 package | TeamRun service/planner/allocator | provider execution, publication |
| DS-020 | Startup converts historical V1 only after physical memory is current, then all normal consumers see V2. | V1 package, memory layout, V2 package, migration ledger | app-data migration runner + V2 migration | diagnostics/retry |
| DS-021 | Migration-time location derives current physical paths from stored V2 data without accessing live application managers. | stored TeamRun package/index, physical scope, memory path | stored-only location/classifier | filesystem state |
| DS-022 | Current hierarchical Team editing and stored-history display share Personal controls while workspace/provider siblings retain their existing owners. | definition/draft, stored V2 view, workspace, model rows | Personal Team forms + existing presentation owners | async discovery/warnings |
| DS-023 | Canonical sources generate disposable package output for proof, then cleanup restores a single source of truth. | source, generated package, parity evidence | SDK/devkit build/pack | lockfiles/build cache |
| DS-024 | One host definition catalog serves public CRUD, general execution, application resolution/execution and refresh; lifecycle binding prevents an accidental default family while separate run/session owners preserve isolation. | Agent definition, Team definition, general run, application run | host definition services + existing subject run owners | migration label lookup, cache preload, package refresh |
| DS-025 | The root that creates a member supplies the only task-execution resolver; the issuing session/native tool carries it through one shared task service back to that same root. | RootTeamRun, member identity, scoped capability, task command | RootTeamRun + member task root resolver | session authentication/revocation, AutoByteus tool binding |

## Spine Actors / Main-Line Nodes

- `buildStudioServer`
- `buildStandaloneApplicationServer`
- `HostDefinitionServices` (one exact bound runtime Agent/Team definition pair per host process)
- `ApplicationPlatformRuntime` projections and `ApplicationPlatformLifecycle`
- `ApplicationLaunchConfigurationService`
- `ApplicationCurrentModelSelectionPolicy`, `ApplicationLaunchHostCapabilityValidator`, and provider credential readiness adapter
- Personal `ModelAvailabilityService`, `ModelCatalogService`, `LlmProviderService`, and runtime-scoped Pinia catalog store
- `AgentRunManager`, `AgentTeamRunManager`, `MixedTeamManager`
- `RootTeamRun`, `MemberTaskRootResolver`, immutable `MemberTeamContext`, and the shared `TaskDelegationToolService`/router
- `TeamRunContext` / `TeamRunPhysicalScope`, root and child TeamRun factories, and `MixedAgentMemberHandle`
- `AppDataMigrationRunner` / `TeamAgentMemoryLayoutAppDataMigration` / `TeamRunExecutionTreeV2AppDataMigration`
- `ApplicationLaunchResourceBaselineBuilder` Team-scope projection
- Personal `TeamDefinitionTopologyPlanner`, `TeamRunIdentityAllocator`, `TeamRunService`, and V2 package catalog
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
| bundle-backed definition constructor | concrete file/persistence provider and Agent-then-Team service-pair wiring for exactly runtime host binding and transient standalone package validation | process binding, CRUD policy, run lifecycle, cache synchronization, or additional callers |
| `HostDefinitionServices` | one bundle-aware runtime Agent definition service, one Team definition service built over it, fail-closed binding, exact identity, partial-unwind, and reverse release | provider wiring policy, run lifecycle, MCP sessions, package commands, cache mirroring, fallback reads, or generic service lookup |
| `GeneralProcessRunSupervisor` | explicitly constructed process Agent/Team managers, general AgentRunService/TeamRunService, exact definition/backend/allocator/context/session injection, stop and release | application-scoped managers/sessions/publication or definition persistence |
| configured Studio GraphQL service registration | exact public definition, package, general Agent run, and general Team run services for one built server; identity-checked unconfigure | constructing services, ambient global fallback, or application run selection |
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
| `RootTeamRun` / root `TaskDelegationService` | task admission, authorization, placement, lifecycle, persistence, events, settlement, fail-stop | transport/session selection or process/application mode routing |
| `MemberTaskRootResolver` | selector-free access to the exact active root captured during materialization | arbitrary root lookup, restore, task policy, session lifecycle, or manager selection |
| immutable `MemberTeamContext` | one rooted member identity, collaboration/instruction, and required root resolver | optional/global scope fallback or transport policy |
| shared task adapter/service/router | protocol translation, parsing, and dispatch using supplied task context | `getTeamRunService()`, manager/session ownership, root restoration, or task state |
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
| background Agent/Team definition preload blocks | duplicate phase-20 awaited `ApplicationDefinitionRuntimeReadiness` refresh and can race a fast host close | exact pre-listen definition readiness on the bound services | In SR-011 | retain unrelated MCP/model cache preloads; no new background supervisor |
| feature-era `active-agent-run-registry.ts` copied verbatim | active-only shape omits Personal pending claim/candidate state | current-state `agent-run-activation-registry.ts` plus adapted resource manager | In this change | preserve current candidate/provisioning invariants, not obsolete code |
| feature `mixed-persistent-member-registry.ts` and `mixed-task-agent-instance-registry.ts` | current Personal replaced their identity/lifecycle roles | current `mixed-configured-member-registry.ts`, `mixed-task-agent-execution-registry.ts`, and `mixed-task-team-execution-registry.ts` | In this change | these paths are explicitly removed from the target add/modify inventory |
| Personal `application-execution-resource-configuration-store.ts`, service, and launch-profile normalizer | compete with the launch service/store over the same table and full-profile semantics | one `ApplicationLaunchConfigurationService` + `ApplicationLaunchOverrideStore` using current rooted sparse shape | In this change | no dual reader/writer |
| broad `ApplicationEngineHostService` and removed bind-once seams | final feature already replaced them | controller/launcher/closed delivery owners | In this change | do not restore via merge |
| version-suffixed in-scope code symbols | user-approved clean naming | unversioned names/current numeric wire values | In this change | no alias |
| obsolete durable tests importing removed source | tests implementation, not behavior | assertions through current owners | In this change | never restore source for tests |
| task service/router process-general `getTeamRunService()` default | bypasses the issuing member/root owner | required `TaskDelegationToolContext.rootResolver` | In SR-012 | remove import, constructor fallback, and restore wording together |
| `task-delegation-autobyteus-context.ts` and its test | reconstruct identity only and still selects ambient process task scope | per-member bound AutoByteus `ToolConfig` and resolver/backend proof | In SR-012 | remove cleanly; no compatibility parser/alias |

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
| Migration definition-name lookup | DS-024 startup edge | history migrations | optional non-caching label enrichment with ID fallback | migrations run before bundle-aware host binding | premature default singleton/cache authority |
| Standalone package validation catalog | DS-003 pre-host validation edge | package validator | complete package-default resolution through a transient unbound read-only definition pair | validation occurs before host process resources/runtime catalog | publishing validation caches or accidentally binding process getters |

## Ownership Boundaries

Host-specific logic ends at normalized bootstrap and the four application runtime projections. Shared business behavior may not inspect whether it is in Studio or standalone. After pre-host validation/migrations complete, each host process binds one runtime definition catalog family before constructing either run scope. Definition services are shared runtime catalog owners; they are not a shared run container. General-process execution and application execution consume the same definition objects but retain distinct managers, sessions, publication state, and shutdown owners. Process-wide Agent Tools infrastructure owns route/registry/catalog/dispatcher mechanics; application scope owns issued sessions and exact publication capability. Devkit owns packaging; maintained application source does not import server/web/Electron/devkit host internals.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Required Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `ApplicationPlatformRuntime` projections | stores, availability, run/session, engine, recovery | host builders/registrars | registrar receives whole runtime or private store | add subject method to exact projection |
| bundle-backed definition constructor | exact file/persistence-provider and Agent-then-Team service-pair construction | host definition binding owner; standalone package validator | any third production caller, process binding, cache publication, or run behavior | extend the concrete constructor only when both governed contexts require identical provider wiring |
| `HostDefinitionServices` | exact runtime Agent/Team service identity, process binding, partial unwind, and release | Studio/standalone assembly; general supervisor, application runtime and refresh receive its exact services | caller binds another definition family, mirrors caches, or lazily falls back after binding | add exact binding/lifecycle behavior here; add CRUD behavior to the subject service, not a facade |
| configured Studio API registration | exact public definition/package/general run services for one server | public GraphQL resolvers | resolver calls ambient run/definition getter or constructs a service | add a subject getter to the registration |
| `GeneralProcessRunSupervisor` | process managers plus explicitly bound AgentRunService/TeamRunService and their exact definition dependencies | Studio/standalone assembly; general process getters/consumers | application runtime uses supervisor managers/sessions or supervisor defaults a definition dependency | add explicit constructor input/returned service |
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
- Both host roots create `HostDefinitionServices` after required migrations and bundle construction but before Agent Tools/general/application run construction. The same exact Agent/Team objects are passed to `GeneralProcessRunSupervisor`, `buildApplicationPlatformRuntime`, and catalog refresh.
- Standalone package validation may call `createBundleBackedDefinitionServices` before host resources exist, but that pair remains method-local, unbound, read-only, and unreachable from process getters/routes/runs/refresh. Only the validator and `HostDefinitionServices` may import that constructor.
- `HostDefinitionServices` binds `AgentDefinitionService` first, then `AgentTeamDefinitionService` built over that exact Agent service. Binding fails if either process singleton already exists; partial Team failure releases the exact Agent instance. Close releases Team then Agent only when identities match.
- `GeneralProcessRunSupervisor` explicitly constructs AutoByteus/Codex/Claude definition readers, Agent identity/history/provisioning services, member context, Team planner/service, and the general AgentRunService/TeamRunService with the host definition objects. It binds the two general service getters before public routes can be registered.
- Studio GraphQL definition and run resolvers receive subject services from one configured registration. General non-GraphQL process consumers may retain existing process getters because those getters are explicitly bound to the supervisor services before use.
- Application run construction continues explicit injection of the same definition objects and creates its own managers/session/publication family. Object-identity tests require same definitions and different managers/session managers.
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
- `ApplicationDefinitionRuntimeReadiness` is the only Agent/Team definition preload/refresh owner on composed hosts. Post-ready `runCachePreloading` retains MCP/model work but may not resolve Agent/Team definition services.
- Applications depend on SDK contracts, not server/web/Electron host internals.

Forbidden:

- `buildServer(mode)` or optional-field common server base.
- application construction calling `getInstance()`/default getters for graph-sensitive run/team/session/publication/context collaborators;
- host construction after any default Agent/Team definition or general AgentRunService/TeamRunService has already been lazily created; fail rather than replace/synchronize;
- public Studio definition or run resolvers calling ambient definition/run getters instead of the configured subject service registration;
- cache mirroring, cross-cache refresh, fallback definition reads, or general/application run-manager/session unification;
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
| `createBundleBackedDefinitionServices(...)` | concrete definition pair | construct exact bundle/file-backed Agent/Team services | app config + bundle service | exactly host binding plus transient package validation callers |
| `createHostDefinitionServices(...)` | runtime host definition catalog | bind/close exact Agent/Team services | app config + bundle service | one bound runtime pair per host process; not application-only |
| `AgentDefinitionService.bindProcessInstance/releaseProcessInstance` | process Agent definition identity | fail-closed bind/release | exact service / expected instance | `getInstance` returns this exact object after bind |
| `AgentTeamDefinitionService.bindProcessInstance/releaseProcessInstance` | process Team definition identity | fail-closed bind/release over exact Agent service | exact service / expected instance | released before Agent service |
| `bindProcessAgentRunService/releaseProcessAgentRunService` and Team equivalent | general process run-service identity | bind current process getters to supervisor-built services | exact service instance | no lazy default in composed host |
| configured Studio API Agent/Team definition/run getters | public Studio subjects | supply exact services to resolvers | configured server registration | unconfigured by exact close token |
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
| host definition services | Yes | Agent vs Team explicit | Medium | one bundle-aware pair, Team built over exact Agent, fail-closed lifecycle |
| configured Studio API services | Yes | subject-specific getter | Low | add run services and identity-checked close; forbid ambient resolver fallback |

## Main Domain Subject Naming Check

| Subject | Name | Self-Descriptive? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Studio assembly | `StudioServer` / `buildStudioServer` | Yes | Low | retain |
| standalone assembly | `StandaloneApplicationServer` / builder | Yes | Low | retain |
| shared live capability bundle | `ApplicationPlatformRuntime` | Mostly; established by prior approved cleanup | Medium | document exact four-field meaning; no rename churn in integration |
| bundle-backed definition constructor | `createBundleBackedDefinitionServices` | Yes | Low | concrete construction role; exactly two governed callers |
| host definition catalog resource | `HostDefinitionServices` / `createHostDefinitionServices` | Yes | Low | explicitly names executable-host binding/lifecycle rather than package validation |
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
| host definition catalog | existing Agent/Team definition services + file/bundle providers | Reuse/adapt | exact domain services already own CRUD/cache; only concrete pair wiring and executable-host binding/lifecycle are missing | rename the existing constructor for concrete bundle backing and add one host binding handle, not a generic catalog facade |
| general public run services | existing general supervisor + AgentRunService/TeamRunService | Extend | supervisor already owns process run lifecycle and can absorb explicit construction/release | no peer coordinator or application manager reuse |

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
| Host definitions | shared/application-owned Agent/Team runtime catalog plus isolated package validation | DS-002–DS-004, DS-018–DS-019, DS-024 | bundle-backed constructor + existing definition services + `HostDefinitionServices` binding resource | Refine | one bound process cache identity; transient validator pair is not runtime; unchanged file roots |
| General process execution | public/general Agent/Team runs | DS-024 | `GeneralProcessRunSupervisor` + current run services/managers | Refine | explicit definitions/services; separate from application graph |

## Draft File Responsibility Mapping

| Candidate File / Area | Subsystem | Owner / Boundary | Concern | Why One File/Area | Shared Structure |
| --- | --- | --- | --- | --- | --- |
| `.../agent-execution/runtime/agent-run-activation-registry.ts` | agent execution | activation registry | pending/active identity transitions | concrete early state owner | explicit transition result types |
| `.../agent-execution/services/agent-run-resource-manager.ts` | agent execution | run resources | exact attach/release/session revoke | independent early cleanup owner | `AgentRunResourceReleaseResult` |
| `.../agent-execution/services/agent-run-manager.ts` | agent execution | run manager | current lifecycle orchestration | existing domain owner | activation registry |
| current activation candidate/provisioning/activation/run service files | agent execution | current lifecycle collaborators | private handle, durable PREPARED state, metadata commit/quarantine, public run service | existing current owners remain distinct | exact application dependencies |
| `.../application-platform/runtime/create-application-run-services.ts` | application platform | application assembly | explicit acyclic construction | exact assembly root for scoped family | runtime contracts |
| `.../compositions/build-*.ts` | compositions | host roots | distinct host assembly | host-specific lifecycle | runtime projections |
| `.../application-platform/definitions/create-bundle-backed-definition-services.ts` | definition composition | concrete pair constructor | build bundle-aware providers and exact Agent-then-Team service pair | shared mechanics for exactly host binding and package validation | process binding, run lifecycle, third production caller |
| `.../compositions/host-definition-services.ts` | compositions | host definition resource | fail-closed bind exact runtime Agent/Team services, partial unwind, reverse release | owns real executable-host identity/lifecycle shared by both roots | provider/CRUD policy, run lifecycle, service locator, or cache mirroring |
| Agent/Team definition service files | definition domains | process definition identity | add exact bind/release around existing exact services | named subject lifecycle, within the owning definition domains | host/package assembly or run lifecycle |
| general supervisor + AgentRunService/TeamRunService files | general process execution | process run lifecycle | explicit service/backends/allocator/context construction and bind/release | existing owner absorbs missing lifecycle | application managers/sessions or default definition omission |
| Studio configured API service file + four resolvers | public GraphQL boundary | configured subject services | exact definition and general run consumption, identity-checked unconfigure | one built-server registration | construction or ambient global fallback |
| two history-index V2 migration files | app-data migration | optional label enrichment | direct non-caching persistence lookup with current ID fallback | keeps pre-host migration isolated | process singleton/cache initialization |
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
| controlled workspace selection | `autobyteus-web/types/workspace/WorkspaceSelectionState.ts` | Studio workspace configuration | panel/forms/selector need the same exact transient value | Yes | Yes | persisted workspace model or generic form-state bag |
| member task root resolver / session variants | Team task domain + MCP session type files | RootTeamRun/task execution and scoped session boundary | general/application/native/MCP paths need the same exact root capability without sharing state | Yes | Yes | arbitrary manager router or nullable capability bag |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Meaning? | Redundant Removed? | Parallel Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| activation transition result | Yes | Yes | Low | include exact run/token/reason |
| rooted member launch identity | Yes | Yes | Medium | remove older `memberRouteKey` representation |
| runtime projection contracts | Yes | Yes | Low | freeze four fields |
| package baseline/host override/effective config | Yes | Yes | Medium | keep stages/provenance distinct |
| agent/team run binding | Yes | Yes | Low | retain `agentRunId` vs `teamRunId` distinction |
| workspace mode/existing ID/New path | Yes | Yes | Low | one complete value with `mode` as the active discriminator; no parallel local selector state |
| ordinary/Team-member session execution capability | Yes | Yes | Low | discriminated variants; only Team-member variant carries exact task context |

## Final File Responsibility Mapping

The cumulative implemented inventory remains `integration-path-inventory.txt` plus the round-specific evidence. The v1.4.57 and v1.4.58 rows below are retained historical mapping; the current authoritative delta is the SR-012/SR-013 inventory later in this document and the SR-013 addendum in `integration-path-inventory.txt`; the accepted SR-011 inventory remains its preserved prerequisite. All passed Personal/application owners remain unchanged unless DS-024 or DS-025 names an exact edge.

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
| Accept Personal for SR-008 | `WorkspaceSelectionState.ts`, `WorkspaceSelector.vue`, `AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, `RunConfigPanel.vue`, `WorkspaceSelector.spec.ts`, `RunConfigPanel.spec.ts` | controlled workspace state/relay, context reset, delayed-discovery preservation, register-before-launch, and failure/no-fallback behavior |
| Modify two SR-008 conflicts | `AgentRunConfigForm.spec.ts`, `TeamRunConfigForm.spec.ts` | combine complete controlled workspace props/events/assertions with callable provider rows/snapshots/dynamic-settlement fixtures; remove neither concern's coverage |

## Applied Patterns

- **Explicit composition roots:** separate Studio and standalone builders.
- **Narrow projections:** four outward application runtime contracts.
- **Registry plus manager:** early identity/state owner with lifecycle orchestration above it.
- **Scoped capability:** process MCP mechanics plus application-scoped session/publisher.
- **Closed queue:** exact artifact/event delivery, not a generic event bus.
- **Canonical source plus generated package:** one editable source of truth.
- **Controlled input:** `RunConfigPanel` owns complete workspace state; selector/forms render and propose replacements only.
- **Bound process resource:** one host definition-service pair is explicitly initialized/released; consumers share its identity without sharing run state.
- **Root-scoped capability:** one selector-free resolver closes over the exact RootTeamRun and is projected into immutable member/session/native-tool context; the shared task service remains scope-stateless.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `server-runtime.ts` and `.../standalone-application-host/start-standalone-application-host.ts` | Files | host process coordinators | exact process prerequisites, listener/post-listen work, fatal/reject/unwind, outer close | host policy differs and remains explicit | shared application readiness duplicated inline |
| `autobyteus-server-ts/src/compositions/` | Folder | server assembly | two explicit builders, routes/hooks, process/general construction | top-level wiring | migrations, business rules, mode switch |
| `autobyteus-server-ts/src/compositions/host-definition-services.ts` | File | host definition resource | bundle-aware provider construction, exact Agent/Team process binding, partial unwind, idempotent reverse close | the concern exists only at host assembly depth and serves both explicit roots | CRUD rules, run state, generic registry/container |
| Agent/Team definition service files | Files | definition domain owners | existing CRUD/cache plus fail-closed process instance lifecycle | exact subjects retain lifecycle identity | bundle assembly or run orchestration |
| `.../agent-execution/runtime/general-process-run-supervisor.ts` | File | general process execution | exact manager/service/backend/definition construction and reverse stop/release | current owner of process run lifetime | application-scoped run/session state |
| `.../api/graphql/studio-application-api-services.ts` | File | Studio public service registration | exact package/definition/general-run services and identity-checked unconfigure | one server registration boundary | service construction or ambient fallback |
| `.../application-platform/runtime/` | Folder | shared application lifecycle/boundary | runtime contracts/build plus exact application prepare/recovery/stop | platform-owned shared host layer | DB/vault/process transports/background, host UI |
| `.../startup/agent-tool-loader.ts` | File | required tool readiness | one memoized seven-unit process registration, Core first and provisioned Search last | existing startup capability with real order/failure policy | Skills, general MCP registration, AgentFactory construction, or background retry |
| `.../application-platform/launch-configuration/` | Folder | launch resolver | defaults/overrides/readiness/validation | one policy owner | UI rendering |
| `.../llm-management/services/` current catalog/availability/lifecycle files | Folder/files | process provider capability | network-free snapshots, provider-keyed dynamic lifecycle, selected-provider ensure and exact post-check | Personal current capability area | application store/cache, endpoint-local app lifecycle, or global eager reload |
| `.../llm-management/llm-providers/services/llm-provider-service.ts` | File | provider configuration | exact network-free credential setting and explicit commands | current provider owner | aggregate model rows in credential responses |
| `autobyteus-web/stores/llmProviderConfig.ts` | File | Studio provider catalog state | runtime snapshots, exact provider ensure/reload, `Promise.allSettled` missing-provider convergence and safe source states | current Pinia owner | application override precedence |
| `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | File | application setup UI adapter | sparse runtime precedence, immediate options, and post-settlement row/status re-read | shared application editor boundary | provider lifecycle, normal provider-error synthesis, or definition traversal |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | File | Studio workspace launch owner | own complete transient workspace state, context reset, registration-before-launch, and failure/no-fallback behavior | existing Run action/coordinator boundary | provider lifecycle or selector-local fallback policy |
| `autobyteus-web/components/workspace/config/{AgentRunConfigForm,TeamRunConfigForm,WorkspaceSelector}.vue` | Files | thin workspace form relays and controlled input | render/relay complete `WorkspaceSelectionState` while composing existing runtime/model controls | existing workspace config capability | independent workspace state, launch sequencing, or provider-store ownership |
| `autobyteus-web/types/workspace/WorkspaceSelectionState.ts` | File | workspace configuration contract | exact transient mode/existing-ID/New-path value shared by panel/forms/selector | current workspace type area | persistence behavior or generic form state |
| `.../application-orchestration/stores/application-launch-override-store.ts` | File | launch persistence | safe parse and explicit row upsert/delete over existing table | physical store concern | baseline/readiness or read-time rewrite |
| `.../agent-execution/runtime/` | Folder | live run state | activation registry and general supervisor | runtime state depth | application package logic |
| `.../agent-execution/services/` | Folder | run control | current manager and run services | domain lifecycle | global fallback in app path |
| `.../agent-tools/mcp/` | Folder | MCP transport/session | process runtime, scoped manager, route | existing capability | external gateway policy mixed in |
| `.../agent-team-execution/task-delegation/member-task-root-resolver.ts` | File | root-specific task access | one selector-free active-root capability created by the root manager | task lifecycle domain owns root selection | task policy, manager lookup, restore, or transport |
| `.../agent-tools/task-delegation/` | Folder | shared task tool protocol/dispatch | manifest, parsing, stateless service/router, registered/bound AutoByteus tools | existing server-owned task capability | process Team service lookup or duplicate task state |
| `.../agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.ts` | File | authenticated task transport adapter | translate the Team-member session capability into shared task dispatch | existing MCP adapter boundary | scope reconstruction, global lookup, task lifecycle |
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
| Definition ownership | `HostDefinitionServices -> exact Agent/Team services -> {public definitions, general runs, application config/runs, refresh}` while run managers/sessions branch below | Studio definition cache + process run cache + cache sync/fallback | one catalog authority with explicit execution isolation |

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
| Keep partial WorkspaceSelector props/events beside the controlled state | reduce two test edits | Rejected | update both form tests and remove the retired seam cleanly |
| Let provider refresh or Team config replacement reset workspace state | simplifies watchers | Rejected | stable draft/context identity and panel-owned state preserve explicit New intent |
| Redirect only public run resolvers | smallest source diff | Rejected | configure exact run services and bind all general process consumers to the same definition family |
| Mirror/synchronize Studio and process definition caches | retain both constructors | Rejected | one host definition-service pair; delete duplicate construction path |
| Share application and general run managers/sessions | one service family appears simpler | Rejected | share definitions only; retain graph-local application managers/sessions/publication |
| Let migrations initialize the default definition cache before host assembly | preserves two dynamic getters | Rejected | migration-local non-caching persistence lookup; host binding remains fail-closed |

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

## Historical Cumulative Change / Refactor Sequence — Completed Through DR-007

The following sequence records how the current verified v1.4.56 checkpoint was built. It is retained for ownership context and must not be replayed for SR-008.

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

No temporary compatibility seam was retained after step 14.

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

The implemented SR-007 merge had five conflicts and ten changed-both paths. Their historical per-path semantic decisions remain normative in `latest-base-refresh-round-3-design-analysis.md`. In summary:

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

## SR-008 Personal v1.4.57 Controlled-Workspace Delta

### Current/Target Boundary

The DR-007 checkpoint already implements and verifies SR-007. Personal v1.4.57 changes only the Studio workspace-selection boundary and its completed ticket package. Production auto-merges because the workspace and provider concerns already have separate owners:

`RunConfigPanel -> WorkspaceSelectionState -> Agent/Team form -> WorkspaceSelector -> complete replacement -> RunConfigPanel`

beside:

`Agent/Team form -> RuntimeModelConfigFields -> useRuntimeScopedModelSelection -> callable provider rows/snapshots/settlement`

The only conflicts are the two form tests where these fixture contracts meet.

### Exact Current Change Inventory

| Disposition | Paths | Contract |
| --- | --- | --- |
| Accept Personal production/type | `WorkspaceSelectionState.ts`, `WorkspaceSelector.vue`, `AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, `RunConfigPanel.vue` | one panel-owned state, controlled selector, thin complete-state relays, register-before-launch |
| Accept Personal adjacent tests | `WorkspaceSelector.spec.ts`, `RunConfigPanel.spec.ts` | explicit New preservation, delayed discovery, Temp proposal, launch sequencing, failure/no-fallback, read-only behavior |
| Resolve semantically | `AgentRunConfigForm.spec.ts`, `TeamRunConfigForm.spec.ts` | controlled workspace props/events/defaults/relay plus callable provider selection rows, `providerSnapshots`, and `ensureMissingDynamicProviders` |
| Accept remaining non-overlap | other paths in `evidence/solution/latest-base-refresh-round-4-path-inventory.txt` | completed Personal ticket evidence/docs and v1.4.57 metadata; no application-platform ownership |
| Remove/do not restore | partial `workspaceId`/`initialPath`, `select-existing`, and `workspace-input-change` test contracts | clean-cut controlled seam; no compatibility alias |

### Current Implementation Sequence

1. Re-fetch and require exact `origin/personal@389748b0b9f0dea051aaed18641de131cf0adbbb`; stop before merge if it moved.
2. Preserve protected `95c63b5a...` and all owner-specific evidence.
3. Perform one history-preserving merge and record both parents.
4. Review and accept the clean production/type auto-merge against DS-017; do not add a new owner.
5. Resolve both conflicted tests exactly as specified in `latest-base-refresh-round-4-design-analysis.md`; never choose one whole side.
6. Run the four focused workspace suites, provider store/composable/runtime-model suites, affected/full web checks, and Git integrity checks.
7. Route source through code review, then API/E2E coverage investigation/execution and proportional durable-test review. Re-prove the real Studio New-workspace Team journey and retain the dual-host/package-parity/cleanup baseline.
8. Delivery re-fetches Personal, proves ancestry, rebuilds Electron v1.4.57, and records the final integrated state.

### Data And Verification

Workspace registry, saved configuration, and run history are `Directly Usable — No Migration`; the new state is transient. Provider data/contracts and the already-registered nested-memory/token migrations remain unchanged. Exact proof is AC-026–AC-029 and the round-4 supplement verification matrix.

## SR-009 Personal v1.4.58 Hierarchical Team/V2 Delta — SR-010 Exact-Projection Correction

### Authoritative Combined Boundary

Personal is authoritative below the run-binding seam: Team topology, exact coverage, complete selection validation, identity allocation, V2 persistence/history/location, and V1-to-V2 migration. The application framework is authoritative above that seam: application-owned definition traversal, package/selected baseline, sparse host overlay, provenance, package/host/current-model/credential readiness, and business binding. Neither owner may infer or recompute the other's result.

The exact effective Team scope is discriminated, complete, and identical to the round-5/runtime-contract definition:

```ts
type ApplicationEffectiveTeamLaunchProfile = Readonly<{
  teamAddress: string;
  displayName: string;
  teamDefinitionId: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string;
  provenance: Readonly<{
    runtimeKind: ApplicationLaunchValueSource;
    llmModelIdentifier: ApplicationLaunchValueSource;
    llmConfig: ApplicationLaunchValueSource | null;
    workspaceRootPath: "HOST_OVERRIDE" | "APPLICATION_RUNTIME";
  }>;
}>;

type ApplicationEffectiveTeamLaunchConfiguration = Readonly<{
  slotKey: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  resourceDefinitionId: string;
  resourceKind: "AGENT_TEAM";
  teamScopes: readonly ApplicationEffectiveTeamLaunchProfile[];
  leaves: readonly ApplicationEffectiveLeafLaunchProfile[];
}>;
```

The SDK explicit Team launch mirrors that projection through concrete `ApplicationTeamScopeLaunchConfig[]` and `ApplicationTeamMemberLaunchConfig[]`, both with required runtime, model, resolved workspace, host tool policy, and optional cloned atomic `llmConfig`. `teamAddress`/`memberAddress` and member definition identity cross the wire. Team `displayName`, Team definition ID, and all field provenance remain diagnostic/evaluation-only; member `displayName` remains an application-wire diagnostic and is removed before Personal `TeamRunMemberConfigInput`. The request contains neither `teamDefinitionId` nor `applicationBinding`; the server derives those from the selected resource and launch seed. It removes `teamDefaultConfig` from the explicit branch rather than retaining two root authorities. The generic/preset branch remains Personal's separate root-inherited path. The exact wire declarations and per-field mapping table are normative in `integration-runtime-contracts.md` section 8.2 and `latest-base-refresh-round-5-design-analysis.md`.

### Exact Precedence And Readiness

- Team scope: that Team's application-owned default, then outer Team defaults nearest-first.
- Agent leaf: containing/innermost Team, then outer Teams nearest-first, then Agent definition.
- Host slot/team fields: sparse overlay across every Team scope and leaf.
- Exact host member fields: sparse overlay on that leaf only.
- Runtime/model select one effective pair; `llmConfig` is atomic for that pair, resolved `workspaceRootPath` is required, and provenance records package/selected/host/application-runtime source through the effective boundary.
- Package build/validate rejects any standalone-capable Team with an incomplete effective Team scope or leaf.
- Startup/readiness/current-model/credential validation evaluates every scope and leaf. Team scopes matter even when no current configured leaf consumes them because dynamic task Agents inherit them.
- Maintained Brief and Socratic root Team definitions carry `codex_app_server` + `gpt-5.6-luna`, matching their existing application-owned leaf defaults.

### Construction And Lifecycle

`create-application-run-services.ts` constructs the graph-local Personal Team service with an explicit `TeamRunIdentityAllocator`, run/session/memory/context dependencies, and current application publication/binding dependencies. The architecture omission guard adds the allocator as a required nested construction obligation. `ApplicationRunBindingLaunchService` does not allocate IDs and does not traverse definitions; it validates current-model outcomes for the complete mapped input and delegates.

Both host starters retain the ticket's explicit Studio/standalone lifecycle, readable-provider gate, unwind, recovery, and ordered stop. Their migration registry/status source is updated to Personal V2. The exact migration order is V1 -> nested memory layout -> V2 -> later snapshot/history phases -> application readiness.

### Exact Conflict, Output, And Test Contract

The 13 content conflicts, 30 generated-output modify/delete paths, seven clean overlaps, complete Add/Modify/Remove inventory, and exact per-file result are normative in `latest-base-refresh-round-5-design-analysis.md`. Key rules:

- current SDK/run-binding/history/location/server owners are adapted; removed/older owners are not restored;
- Personal hierarchical/stored UI is retained with the ticket's nullable-runtime, effective-runtime provider, controlled-workspace, and provider-settlement corrections;
- all 30 generated SDK/vendor/importable paths stay deleted and are rebuilt only for parity proof;
- current V2 durable tests replace V1 runtime assumptions while migration tests retain V1 fixtures only at the migration boundary;
- no package-byte, manifest-version, database-schema, launch-row, provider-row, or workspace-row migration is introduced.

### Implementation Sequence

1. Re-fetch and require `origin/personal@fb1335867a4223b2499e4513f58c609b6ac33ab4`; stop if it moved.
2. Preserve checkpoint `c6d74710a...` and all delivery/review-owned artifacts; perform one history-preserving merge.
3. Resolve Personal Team/V2/migration/history source first and register V1 -> memory -> V2 order.
4. Extend source SDK/application effective Team shapes and complete maintained root defaults.
5. Update baseline/overlay/package/readiness/current-model/credential validators for Team scopes plus leaves.
6. Adapt backend SDK/run binding to `teamConfigs` + `memberConfigs`, explicitly inject the Team allocator, and remove application-side Team allocation.
7. Resolve stored-only V2 location/server lifecycle and the three web junctions.
8. Keep 30 generated paths deleted; build/pack/validate disposable outputs and verify exact parity/cleanup.
9. Execute the AC-030–AC-035 source, migration, package, dual-host, review, API/E2E, durable-test, and Electron gates.

### No Additional Migration Or Compatibility

Launch overrides, provider/credential/model settings, workspace rows, and current V2 packages are directly usable. Historical V1 TeamRun packages and old flat nested memory use the two existing isolated forward migrations. No V1 current reader, V1/V2 union, read-time rewrite, compatibility alias, package-ID case, global fallback, or generated source authority is permitted.

## SR-011 Canonical Host Definition-Service Boundary

### Current Defect And Target Boundary

Current Studio composition has two main-line definition owners:

```text
public definition CRUD -> configured bundle-aware definition services/cache A
public run mutation -> ambient general run service -> allocator/planner -> lazy definition services/cache B
```

This violates the Authoritative Boundary Rule and demonstrably rejects a definition just created and listed by the same server. The target has one catalog boundary and two execution scopes:

```text
                                         +-> public definition APIs
                                         +-> general run services -> general managers/sessions
HostDefinitionServices (Agent + Team) ---+-> application config/run services -> application managers/sessions
                                         +-> package/catalog refresh and process definition consumers
```

`HostDefinitionServices` owns only executable-host binding, exact service identity, partial unwind, and reverse release. Existing `AgentDefinitionService` and `AgentTeamDefinitionService` continue to own CRUD, graph validation, cache behavior, and persistence. A narrowly reusable bundle-backed constructor owns only the concrete provider/service-pair wiring shared by runtime assembly and standalone package validation. `GeneralProcessRunSupervisor` continues to own general run lifecycle and absorbs explicit service construction. The application runtime continues to own graph-local execution. No new facade sits between callers and definition services.

### Exact Construction Contracts

The old application-runtime factory is cleanly replaced by two role-specific boundaries:

```ts
type BundleBackedDefinitionServices = Readonly<{
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
}>;

createBundleBackedDefinitionServices(input: {
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
}): BundleBackedDefinitionServices;
```

`createBundleBackedDefinitionServices` owns only the existing file-provider -> persistence-provider -> Agent service -> Team service construction sequence. Its governed callers are exactly (1) `HostDefinitionServices` and (2) standalone package validation. Validation uses a short-lived read-only pair, never binds it to process getters, never exposes it to routes or run construction, and releases all references before executable-host assembly begins. This off-spine validation pair does not compete with the runtime catalog.

The executable-host wrapper is:

```ts
type HostDefinitionServices = Readonly<{
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  close(): void; // idempotent; Team release then Agent release
}>;

createHostDefinitionServices(input: {
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
}): HostDefinitionServices;
```

The wrapper creates one bundle-backed pair, calls `AgentDefinitionService.bindProcessInstance(exactAgent)`, then `AgentTeamDefinitionService.bindProcessInstance(exactTeam)`. Either bind fails if its process instance already exists. If Team binding fails, the wrapper releases the exact Agent instance before rethrowing. `close()` releases the exact Team instance then exact Agent instance once. It never clears or replaces a different instance.

Both definition services add the same narrow lifecycle shape already used by process run managers:

```ts
static bindProcessInstance(instance: ExactService): void;
static releaseProcessInstance(expected: ExactService): void;
```

Existing `getInstance()` remains the established process consumer API, not a compatibility alias. After explicit host binding it must return the exact bound service. In composed Studio/standalone startup, any earlier lazy default makes binding fail closed; host assembly never silently adopts, replaces, or synchronizes it. Non-host isolated library/tests may retain their established lazy construction, but the executable architecture guard governs both host roots and all application construction-critical paths.

`GeneralProcessRunSupervisor` changes to:

```ts
createGeneralProcessRunSupervisor({
  appConfig,
  agentToolsSessionManager,
  agentDefinitionService,
  agentTeamDefinitionService,
}): GeneralProcessRunSupervisor
```

It explicitly constructs and owns:

1. AutoByteus backend factory with exact Agent definitions;
2. Codex bootstrapper/factory with exact Agent definitions and general MCP sessions;
3. Claude session manager/bootstrapper/factory with exact Agent definitions and general MCP sessions;
4. process AgentRunManager;
5. Agent history/metadata, exact AgentRunIdentityAllocator, provisioning/activation, and AgentRunService;
6. MemberTeamContextBuilder with exact Team definitions, mixed Team manager/factory, and process AgentTeamRunManager;
7. TeamRunService with exact Team definitions, the exact Agent allocator, current Team allocator/history/workspace/memory/readiness dependencies;
8. fail-closed binding of the exact AgentRunService and TeamRunService to their existing process getters through named `bindProcessAgentRunService` / `bindProcessTeamRunService` and exact-identity release functions.

The supervisor exposes read-only `agentRunService` and `teamRunService` for public API registration. Close is idempotent and exact: stop Team runs -> stop Agent runs -> release TeamRunService -> AgentRunService -> Team manager -> Agent manager. A construction failure releases only successfully bound/constructed owners in reverse order. Application services never consume these manager/session objects.

### Public API, Refresh, And Runtime Consumption

`configureStudioApplicationApiServices` receives the exact host definitions and supervisor run services together. It returns an identity-checked idempotent registration handle whose `close()` unconfigures only that exact service set. Add `getStudioAgentRunService()` and `getStudioTeamRunService()`; Agent/Team run resolvers use those configured getters rather than `getAgentRunService()` / `getTeamRunService()`. Definition resolvers retain configured getters, so all four public subjects share one built-server registration.

`ApplicationCatalogRefreshCoordinator` receives the exact host definition services. Its existing bundle -> Agent definition -> Team definition ordering refreshes those same caches. Application configuration/readiness and `createApplicationRunServices` receive the same exact services. The latter remains explicitly constructed and must continue to inject them into every backend/allocator/context/planner while constructing non-identical application managers/session managers.

Existing non-GraphQL general process consumers may call `AgentDefinitionService.getInstance`, `AgentTeamDefinitionService.getInstance`, `getAgentRunService`, or `getTeamRunService`; the explicit bindings guarantee those getters return the host/supervisor objects. New application-path getter usage remains forbidden.

Definition mutation semantics remain current:

- create/update/delete writes through the canonical cached service and existing provider;
- lists and launch reads observe that same cache family;
- update affects later launches but does not mutate an active run snapshot;
- delete removes the current definition; later launch fails truthfully, with no package/default fallback;
- package install/remove performs ordered bundle/Agent/Team refresh against the same services;
- restart reconstructs one family from the unchanged data roots before public routes listen.

### Existing Definition-Getter Consumer Disposition

The current 31 production `AgentDefinitionService.getInstance()` / `AgentTeamDefinitionService.getInstance()` occurrences are not left as an informal assumption. The architecture guard classifies them by supported lifecycle:

| Category | Exact current consumers | Target disposition |
| --- | --- | --- |
| Pre-host migration calls | Agent and Team run-history index V2 migrations | remove singleton calls; use migration-local non-caching persistence reads |
| Pre-host package validation | standalone validator currently calls the application definition factory | use the transient bundle-backed pair directly; no process getter call/bind |
| Composition-critical definition consumers | `AgentTeamDefinitionService` construction, `MemberTeamContextBuilder`, `TeamRunService`, `AgentRunIdentityAllocator`, AutoByteus backend factory, Codex bootstrapper, Claude bootstrapper, general/application history and run construction | pass the exact host definitions explicitly; omission/null/undefined is forbidden in both general and application assembly |
| Invocation-time process consumers | Agent/Team management tools, skill-improvement resolvers, built-in-agent bootstrapper, agent-package refresh callbacks, history lookup fallback | retain the established getter only because invocation occurs after host binding; every call resolves the exact bound pair |
| Host-scoped presentation/capture | external-channel setup resolver and Team-definition options service | construct only after host binding as part of the current GraphQL/server scope; stop accepting and close that host before definition release |
| Named general-process child execution | `MemoryCompactorAgentLaunchResolver` and `ServerCompactionAgentRunner.getAgentRunService()` | retain as the existing general-process compaction boundary. Each runner is created on demand after binding, uses the canonical host definitions/general run service, terminates its child run, and never substitutes an application manager/session. |
| Redundant post-ready background calls | Agent/Team branches in `startup/cache-preloader.ts` | remove; phase-20 application definition readiness already refreshes the exact bound pair before listen |

The guard has a current-tree occurrence assertion: an added getter use fails until it is placed in one of these categories with a supported trigger and allowed lifetime. A composition-critical caller may not be reclassified as invocation-time merely to preserve an optional constructor default.

### Startup, Unwind, And Stop Allocation

Studio target order after existing required migrations/process gates:

```text
package registry + bundle service
  -> HostDefinitionServices bind
  -> AgentToolsMcpRuntime
  -> GeneralProcessRunSupervisor and bound general run services
  -> ApplicationPlatformRuntime with same definitions and separate run/session state
  -> catalog refresh/package commands
  -> configured Studio API registration
  -> Fastify routes/listen/application recovery
```

Standalone target order after package validation and existing required migrations/process gates:

```text
validated selected bundle
  -> HostDefinitionServices bind
  -> AgentToolsMcpRuntime
  -> GeneralProcessRunSupervisor and bound general run services
  -> selected ApplicationPlatformRuntime with same definitions and separate run/session state
  -> standalone Fastify/listen/application recovery
```

Before those host bindings, `RunHistoryIndexV2Migration` and `TeamRunHistoryIndexV2Migration` replace their dynamic definition-service singleton lookup with their existing persistence-provider contract instantiated as a migration-local non-caching reader. The lookup remains optional label enrichment and preserves direct stored name -> persistence name -> ID fallback and existing warning behavior. It is not exposed outside migration and does not refresh or cache.

On supported close, the listener has stopped accepting new work before service release. Ordered teardown is:

```text
application lifecycle stop/drain
  -> general supervisor stop/release
  -> Agent Tools runtime close
  -> Studio API registration close (Studio only)
  -> existing event/external/managed-messaging process consumers close
  -> HostDefinitionServices close
  -> vault/Prisma resources close
```

Equivalent reverse unwind applies at every construction failure. Definition services remain alive until both execution scopes, Agent Tools, and every other process consumer that may resolve definitions are closed. No definition service is released while a dependent manager, session, tool, channel, or event owner remains active.

### Allowed And Forbidden Dependencies

Allowed:

- explicit host roots -> `HostDefinitionServices`;
- public definition resolvers -> configured Agent/Team definition service;
- public run resolvers -> configured general AgentRunService/TeamRunService;
- general supervisor -> exact host definitions + general session manager;
- application runtime -> exact host definitions + its own run/session/publication owners;
- package refresh -> exact host definitions;
- migration -> direct non-caching persistence lookup for optional labels only.

Forbidden:

- another bundle-aware or default definition-service construction inside one host;
- public resolver, general supervisor, or application construction relying on an omitted definition argument;
- cache copy/synchronization, fallback-to-other-definition-family, or stale dual reads;
- application runtime consuming general managers, general MCP sessions, or general publication;
- general process consuming application managers, sessions, publication, or private runtime projections;
- service locator, generic DI container, generic catalog facade, mode-switched builder, or compatibility wrapper;
- migration binding or refreshing the process definition cache.

### Exact Add / Modify / Rename / Remove Inventory

| Disposition | Exact path(s) | Responsibility |
| --- | --- | --- |
| Rename/move | `application-platform/runtime/create-application-definition-services.ts` -> `application-platform/definitions/create-bundle-backed-definition-services.ts` | reusable concrete bundle/file-provider service-pair construction for exactly host binding and isolated package validation; no old alias |
| Add | `compositions/host-definition-services.ts` | one executable-host runtime catalog binding, identity, partial unwind, and close owner |
| Modify | Agent and Team definition service files | fail-closed exact process bind/release lifecycle |
| Modify | `compositions/build-studio-server.ts`; `standalone-application-host/start-standalone-application-host.ts` | new construction/unwind/close order and exact shared definition inputs |
| Modify | `application-platform/launch-configuration/application-standalone-package-validator.ts` | use the transient unbound bundle-backed pair only; prove no process getter/catalog mutation |
| Modify | `startup/cache-preloader.ts` | remove redundant Agent/Team imports and preload blocks; retain MCP/model cache behavior |
| Modify | `agent-execution/runtime/general-process-run-supervisor.ts` | explicit definitions, backends, allocators, general run services, binding, stop/release |
| Modify | `agent-execution/services/agent-run-service.ts`; `agent-team-execution/services/team-run-service.ts` | exact named process service bind/release; no lazy default during composed startup |
| Modify | `api/graphql/studio-application-api-services.ts`; `api/graphql/types/agent-run.ts`; `api/graphql/types/agent-team-run.ts` | configured exact run services and close token; definition resolver behavior unchanged |
| Modify | `app-data-migrations/migrations/run-history-index-v2-migration.ts`; Team counterpart | non-caching migration-local definition-name persistence lookup |
| Verify/no production change | `application-platform/runtime/create-application-run-services.ts`; package refresh coordinator; definition resolver files | exact same definition object identity and unchanged graph-local application construction/CRUD |
| Add/modify tests | host composition/integration, definition service lifecycle, general supervisor/run services, configured API holder/resolvers, migration tests, application framework boundary guard, public Agent/Team GraphQL E2E | exact identity, full getter-occurrence classification, omission, lifecycle, supported CRUD/launch/restart, isolation, and no-fallback proof |
| Remove | old `create-application-definition-services.ts` path/imports and direct ambient run-service imports from public run resolvers | clean replacement, no alias/dual path |

No database, definition-file, package, manifest, launch-row, SDK, GraphQL, or migration-data transformation is introduced: `Directly Usable — No Migration`.

### Change Sequence And Validation

1. Add fail-closed definition and general run-service bind/release APIs with isolated exact-identity/release tests.
2. Rename/move the bundle-backed constructor, add the host binding owner, update the package validator and both host roots, and remove the old path in the same change.
3. Refactor general supervisor to explicit definitions, backends, allocators, Agent/Team run services, and reverse release.
4. Configure public run services beside public definition services; remove ambient run imports from resolvers and add registration close/unwind.
5. Replace both pre-host migration singleton lookups with non-caching persistence readers.
6. Extend AFB/current-tree guards for host binding order, exact constructor inputs, same-definition/different-run-session identity, no duplicate factory, no ambient resolver imports, and a complete classification of all definition getter consumers; remove the redundant background Agent/Team preload path.
7. Run focused unit/integration source checks, then built Studio public Agent and Team CRUD -> launch -> update-next-launch -> delete-fails -> restart-visible/launchable journeys.
8. Re-run standalone and Studio application configuration/real Brief/Socratic execution, publication/handoff/projection/recovery/cleanup, package parity, provider/workspace/Team V2/migration suites, full source review, corrected API/E2E F006 sequence, proportional durable-test review, and Electron/delivery gates.

Required negative proof includes: early default definition/service construction makes host initialization fail; omitting any exact definition/backend/allocator/service input fails the architecture fixture; deleting a definition never falls back; closing twice is idempotent; partial Team binding unwinds Agent; a second same-process host build after full close succeeds; application/general manager and MCP-session identities remain different.

## SR-011 Design-Principles Self-Validation

| Principle / Gate | Evidence-backed validation | Result |
| --- | --- | --- |
| Approved behavior and Product-Reachability Gate | A real built Studio public client creates and lists Agent/Team definitions, then the same supported public run mutations fail. The trigger is not synthetic or file-mutation-only. | Pass: the design corrects a reachable preserved behavior, not an aesthetic concern. |
| Primary-spine completeness | Agent and Team spines cover public mutation, configured definition service, exact allocator/planner/backend, general manager, and run result. Application spines cover the same definitions through launch/readiness and separate application managers. | Pass: no main-line ownership gap remains. |
| Return/event spine completeness | Create/update/delete/list results return through the same configured API boundary; active runs retain materialized snapshots; later launches observe canonical catalog changes; restart reconstructs the same catalog before listen. | Pass. |
| Authoritative Boundary Rule | One bound runtime Agent/Team catalog pair serves all executable-host consumers. The validation-only pair is transient, unbound, not published, and has exactly one separate purpose. | Pass: no competing runtime cache or synchronization path. |
| Clear ownership and encapsulation | Bundle-backed construction owns provider wiring; `HostDefinitionServices` owns process binding/unwind; definition services own CRUD/cache; general supervisor owns general execution; application runtime owns application execution; configured Studio API owns public selection. | Pass: each boundary has one concrete lifecycle responsibility. |
| Dependency direction | Host roots construct inward; public APIs depend on configured subject services; general/application execution depend on definitions; definitions never depend on run managers; migrations use direct persistence only. | Pass: acyclic and explicitly forbidden in reverse. |
| Off-spine concern control | Pre-host package validation and history-label migration reads are narrow, local, unbound/non-caching, and cannot bind or refresh the runtime catalog. The duplicate post-ready Agent/Team preloader is removed in favor of awaited definition readiness. | Pass: local loops do not become hidden runtime owners. |
| Empty-indirection control | `HostDefinitionServices` is not a pass-through facade: it owns exact binding, partial unwind, identity-safe release, and second-build correctness. The bundle-backed constructor removes duplicated provider wiring for exactly two callers. | Pass. |
| Clean replacement | The old application-runtime factory path and ambient public run-service imports are removed in the same change. No alias, dual path, cache mirror, read fallback, or compatibility wrapper remains. | Pass. |
| Data transition proportionality | Definition/package files are directly usable; no bytes or schemas change. Existing V1/memory migrations remain isolated and unchanged. | Pass: `Directly Usable — No Migration`. |
| Scope proportionality | Changes are limited to definition/run composition, configured public service selection, two migration-local lookups, and focused proof. Routes, GraphQL/SDK contracts, package schema, models, workspaces, provider behavior, and application business logic do not change. | Pass. |
| Forbidden architecture shortcuts | No service locator, generic DI container, generic event bus, generic catalog facade, mode-switched server builder, singleton fallback in application construction, compatibility alias, or manager/session unification. | Pass. |

## SR-012/SR-013 Member/Session-Bound Task-Delegation Authority

### Current Defect And Target Boundary

Current supported path:

```text
application Team launch
  -> application AgentTeamRunManager / RootTeamRun
  -> immutable Team member identity
  -> application-scoped Agent Tools session
  -> shared TaskDelegationToolsMcpAdapterProvider
  -> default TaskDelegationToolService
  -> TaskDelegationToolRunRouter
  -> process-general getTeamRunService()
  -> wrong manager / root not found
```

Target path:

```text
AgentTeamRunManager materializes exact RootTeamRun
  -> root-local MemberTaskRootResolver
  -> mixed member construction
  -> MemberTeamContext(identity + resolver)
  -> exact Team-member session/native tool capability
  -> shared task adapter/service/router
  -> resolver.resolveActiveRoot()
  -> exact RootTeamRun
```

The target shares the task implementation but not mutable execution state. General members capture roots from the general manager; application members capture roots from their graph-local application manager. No runtime mode switch is needed because the member already carries the correct root-local capability. SR-013 makes this construction exhaustive: the default mixed manager, general supervisor custom manager, and application custom manager all receive the exact callback resolver, and no executable factory method can synthesize missing callbacks.

### Exact Domain And Session Contracts

```ts
export type MemberTaskRootResolver = Readonly<{
  resolveActiveRoot(): Promise<RootTeamRun>;
}>;

export class MemberTeamContext {
  readonly identity: TeamMemberExecutionIdentity;
  readonly authoredTeamInstruction: string | null;
  readonly collaboration: MemberCollaborationContext;
  readonly taskRootResolver: MemberTaskRootResolver;
}

export type TaskDelegationToolContext = Readonly<{
  identity: TeamMemberExecutionIdentity;
  rootResolver: MemberTaskRootResolver;
}>;

type AgentSessionExecutionCapabilities = Readonly<{
  kind: "agent";
  publishedArtifactPublisher: PublishedArtifactPublisher;
}>;

type TeamMemberSessionExecutionCapabilities = Readonly<{
  kind: "team_member";
  publishedArtifactPublisher: PublishedArtifactPublisher;
  taskDelegation: TaskDelegationToolContext;
}>;
```

Contract rules:

1. `MemberTaskRootResolver` is task-domain-owned and root-specific. It accepts no TeamRun ID, application ID, session ID, or generic selector.
2. `AgentTeamRunManager.materializeRoot()` creates it beside the existing root-local message/platform callbacks. Until `root` is bound, it rejects `TEAM_ROOT_NOT_BOUND`; after root closure it rejects `TEAM_RUN_NOT_ACTIVE`. It never restores a run.
3. `MixedTeamRunCallbacks` carries this one exact resolver through every root, configured subteam, task team, configured Agent, restored Agent, and task Agent construction path. It remains the same resolver for all descendants of one root. `createBackend` and `restoreBackend` require the complete callbacks argument; `noopCallbacks()` is removed. The default mixed manager copies `input.callbacks.taskRootResolver`; the custom managers in `GeneralProcessRunSupervisor` and `createApplicationRunServices` copy `callbacks.taskRootResolver` explicitly.
4. `MemberTeamContextBuilder.build()` requires the resolver and constructs one frozen context. `MemberTeamContext` does not offer an optional or default resolver.
5. `AgentToolMcpSessionServiceDeps` carries a tight composition-scoped base capability containing only `publishedArtifactPublisher` (or `null` for the existing revoke-only scope service), not a prebuilt final session variant; each issuing service derives its exact union variant. Session issuance compares `owner.runId` and `owner.teamIdentity` with the immutable member identity. A Team-member sender produces the specialized variant; missing or inconsistent identity/capability rejects issuance. A non-Team Agent produces the tight ordinary variant.
6. The session registry freezes/clones value fields but retains the exact resolver capability identity. Capability tokens, session scoping, revocation, route security, and publisher identity remain unchanged.
7. `TaskDelegationToolsMcpAdapterProvider` requires `kind === "team_member"` and consumes only `session.executionCapabilities.taskDelegation`; it does not rebuild scope from `sender`, application ID, or global services.
8. `TaskDelegationToolRunRouter` becomes stateless with respect to execution scope and calls only `context.rootResolver.resolveActiveRoot()`. `TaskDelegationToolService` retains task method dispatch but contains no `getTeamRunService()` import or constructor fallback.
9. AutoByteus task tool classes receive a required bound `TaskDelegationToolContext` through explicit `ToolConfig` when `resolveAutoByteusAgentTools` creates the member's tool instances. Registration registers definitions only; the old native custom-data identity parser is removed. A task tool cannot be instantiated for execution without the bound context.
10. Root task methods and `TaskDelegationService` remain the sole validation/mutation/persistence/event owners. The resolver selects the owner; it does not implement task policy.

The repeated execution capability is intentionally a meaningful specialized variant, not a base with optional task fields. Identity remains singular in `MemberTeamContext`; session/tool projections clone the identity for boundary integrity but do not create a second identity authority.

### Construction, Lifecycle, And Failure Semantics

Construction stays acyclic:

```text
AgentTeamRunManager
  -> creates root-local callbacks over one later-assigned local `root`
  -> MixedTeamRunBackendFactory (callbacks required for executable create/restore)
  -> default, general-supervisor custom, or application custom MixedTeamManager
  -> member registries and handles
  -> MemberTeamContextBuilder
  -> AgentRunConfig
  -> AgentRunManager/provider backend
  -> scoped session or AutoByteus bound tool

then materializeRoot assigns RootTeamRun to the local closure
```

This is the established narrow root-binding pattern already used for messaging and platform binding, not a generic deferred container. There is no reverse dependency from RootTeamRun to session infrastructure.

The `MixedTeamRunBackendFactory` constructor may still omit a custom `createTeamManager` because its built-in manager is a real implementation, not a callback fallback. `buildTeamRunContext()` may still be used by context-only tests without callbacks because it constructs immutable context only. Any path that calls `createBackend`, `restoreBackend`, or `createBackendForNode` is executable and must supply the complete callbacks, including the resolver.

Lifecycle rules:

| State / trigger | Required result |
| --- | --- |
| Member creation before local root bind | member/session/tool construction fails closed; no task command is accepted |
| Team-member session issue with absent/mismatched owner identity | session issue fails; no descriptor is returned |
| Active general member | resolver returns only its general RootTeamRun; application manager is untouched |
| Active application member | resolver returns only its graph-local application RootTeamRun; general manager is untouched |
| Root enters termination/fail-stop | existing RootTeamRun/TaskDelegationService admission closes; resolver or root command fails before mutation |
| Agent/member cleanup | existing scoped session manager revokes the session; later route resolution rejects before adapter execution |
| Root termination completes | local resolver sees inactive/closed captured root and never asks a service to restore it |
| Host/application stop | existing manager/session shutdown order remains authoritative; no new close owner exists |

No stored task record, Team execution tree, application binding, launch profile, SDK/GraphQL/MCP wire shape, or route changes. Persisted-data decision: `Directly Usable — No Migration`.

### Ownership And Dependency Rules

| Subject | Owner | Allowed callers/dependencies | Forbidden dependency or responsibility |
| --- | --- | --- | --- |
| task lifecycle/state/persistence/events | exact `RootTeamRun` / root `TaskDelegationService` | shared task service after exact root resolution | adapter/session implementing task policy |
| root-specific task access | `MemberTaskRootResolver` created by `AgentTeamRunManager.materializeRoot()` | member context builder and resulting Team-member session/native tool | arbitrary root ID, service lookup, restoration, process/application mode switch |
| member identity/capability | immutable `MemberTeamContext` | provider bootstrappers, session issuance, AutoByteus tool resolution | process custom-data reconstruction or optional fallback |
| session execution projection | scoped `AgentToolMcpSessionService` + registry | MCP adapter after authenticated session resolution | application/global lookup at request time |
| tool protocol and parsing | existing manifest/service/router | MCP and AutoByteus adapters | manager/session ownership or duplicate task implementation |
| general execution state | `GeneralProcessRunSupervisor` managers/sessions | general members only | application manager/session state |
| application execution state | application run services/managers/scoped sessions | application members only | general manager/session/global fallback |

Allowed direction:

`root owner -> root resolver -> immutable member context -> scoped session/native tool -> shared task adapter/service/router -> root resolver -> same root owner`.

The return edge is a capability invocation back to the same root owner, not a dependency from the domain owner on transport. Forbidden: service locator, generic DI container, generic event bus, app-ID-to-manager map, mutable singleton replacement, duplicate route/catalog/task system, manager unification, nullable task capability, inactive-root restoration, compatibility wrapper, or `getTeamRunService()` anywhere in the task tool execution spine.

### Exhaustive Current-Tree Construction Occurrence Map

This table is normative for reviewer HEAD `a5a613153...`. The architecture test asserts the count and category; a new occurrence is not silently accepted.

| Construct / call family | Production occurrences | Test/fixture occurrences | Target obligation |
| --- | --- | --- | --- |
| `new MixedTeamManager` | `mixed-team-run-backend-factory.ts`; `agent-execution/runtime/general-process-run-supervisor.ts`; `application-platform/runtime/create-application-run-services.ts` | `mixed-team-manager.test.ts`; `team-manager-member-interrupt.test.ts`; `team-run-resolver-configured-overlap.test.ts` | All six pass a non-null `taskRootResolver`. Default/general/application production paths each have a positive identity assertion. |
| `new MixedTeamRunBackendFactory` | cached default in the factory file; general supervisor; application run services | three integration factory cases; two unit factory cases; one configured-overlap case; two context-only subteam-factory cases | Executable factory calls require full callbacks. The two named context-only cases may construct the factory without callbacks only because they call `buildTeamRunContext`; any executable call fails the guard. |
| `MixedTeamRunCallbacks` producer/capture | sole producer in `AgentTeamRunManager.materializeRoot()` | typed fake/capture in `agent-team-run-manager.integration.test.ts`; explicit callbacks in factory/configured-overlap tests | Add required resolver; fresh and restore paths preserve the exact reference. No no-op producer remains. |
| `MemberTeamContextBuilder.build` | one call in `mixed-agent-member-handle.ts` | four calls in `member-team-context-builder.test.ts`; one Brief prompt integration call | Every call supplies the exact resolver. Builder proof asserts reference identity and omission/null/undefined rejection. |
| direct `new MemberTeamContext` | one constructor inside `member-team-context-builder.ts` | shared `current-team-run-fixtures.ts`; Codex thread manager test; Codex thread test; token-usage enrichment test | Resolver is required. Test-only construction uses a clearly named explicit resolver fixture; there is no production default or nullable field. |

The test fixture in `tests/fixtures/current-team-run-fixtures.ts` may expose a narrow `testMemberTaskRootResolver` that either returns an explicitly supplied root or throws a test-only unavailable error. It exists solely to make non-task prompt/event fixtures satisfy the real required domain shape without `as never`, null, or a fake production fallback. Task behavior tests use a real/root-returning resolver and assert mutation identity.

### Exact Add / Modify / Remove Inventory

| Disposition | Exact path(s) | Responsibility |
| --- | --- | --- |
| Add | `autobyteus-server-ts/src/agent-team-execution/task-delegation/member-task-root-resolver.ts` | exact root-specific resolver contract; no generic lookup |
| Modify | `agent-team-execution/services/agent-team-run-manager.ts` | create the root-local resolver beside existing callbacks; fail closed before bind/after close |
| Modify | `agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts`; `mixed-team-manager.ts`; `members/mixed-configured-member-registry.ts`; `members/mixed-task-agent-execution-registry.ts`; `members/mixed-agent-member-handle.ts` | propagate the exact resolver through root/subteam/configured/restored/task Agent construction; remove `noopCallbacks`; require callbacks on executable create/restore while retaining context-only build |
| Modify | `agent-execution/runtime/general-process-run-supervisor.ts`; `application-platform/runtime/create-application-run-services.ts` | both supported custom `MixedTeamManager` constructors forward `callbacks.taskRootResolver`; keep managers/sessions non-identical and all prior explicit dependencies unchanged |
| Modify | `agent-team-execution/domain/member-team-context.ts`; `services/member-team-context-builder.ts` | require/freeze resolver beside exact identity; no default getter |
| Modify | `agent-tools/mcp/agent-tool-mcp-session.ts`; `agent-tool-mcp-session-service.ts`; `agent-tool-mcp-session-registry.ts`; `agent-tools-mcp-runtime.ts` | separate base publisher input from final discriminated ordinary/Team-member session capability, derive per issue, validate identity, preserve exact capability; revoke-only scope service remains non-issuing |
| Modify | `agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.ts` | consume only authenticated Team-member session capability |
| Modify | `agent-tools/task-delegation/task-delegation-tool-contract.ts`; `task-delegation-tool-run-router.ts`; `task-delegation-tool-service.ts` | carry exact resolver in tool context; remove ambient TeamRunService lookup and restore language |
| Modify | `agent-tools/task-delegation/delegate-task.ts`; `submit-task-result.ts`; `review-task-result.ts`; `register-task-delegation-tools.ts`; `agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts` | definition-only registration plus required per-member bound ToolConfig; all three task tools use the same context |
| Remove | `agent-tools/task-delegation/task-delegation-autobyteus-context.ts` | delete identity-only custom-data reconstruction; no fallback/alias |
| Modify tests — mixed construction | `tests/unit/agent-team-execution/member-team-context-builder.test.ts`; `mixed-team-run-backend-factory.test.ts`; `mixed-team-manager.test.ts`; `team-manager-member-interrupt.test.ts`; `team-run-resolver-configured-overlap.test.ts`; `tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts`; `agent-team-run-manager.integration.test.ts`; `tests/integration/application-backend/brief-package-team-prompt.integration.test.ts` | exact resolver propagation in all direct manager/factory/builder/callback constructions; executable callback omission rejected; general/application fresh/restore identity proved |
| Modify test fixture/direct contexts | `tests/fixtures/current-team-run-fixtures.ts`; `tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts`; `codex-thread.test.ts`; `tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts` | explicit test resolver for every direct `MemberTeamContext`; no null/default/`as never` escape |
| Verify context-only tests | `tests/unit/agent-team-execution/mixed-sub-team-run-factory.test.ts` | its two factory constructors may remain unchanged only while they call `buildTeamRunContext`; guard forbids executable create/restore from this category |
| Modify tests — session/tool | `tests/unit/agent-tools/task-delegation/task-delegation-tool-run-router.test.ts`; `tests/unit/agent-tools/mcp/agent-tools-mcp-runtime.test.ts`; `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` | capability variants, bound AutoByteus tools, no ambient lookup |
| Remove/replace test | `tests/unit/agent-tools/task-delegation/task-delegation-autobyteus-context.test.ts` -> bound AutoByteus task-tool coverage in the resolver/backend-factory tests | clean replacement proof, not compatibility coverage |
| Modify durable proof | `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`; `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`; `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`; `tests/architecture/application-framework-boundaries.test.ts` | real general/application root isolation, route authentication/revocation, lifecycle, exact occurrence counts/categories, `noopCallbacks` absence, and omission/null/undefined checks |

No application package, web UI, database, migration, SDK, GraphQL schema, MCP route, or external gateway file changes.

### Change Sequence And Validation

1. Add `MemberTaskRootResolver`; require it in `MemberTeamContextBuilder`/`MemberTeamContext`; add unit proof for exact identity, root-specific no-selector shape, and no default.
2. Create the resolver in `AgentTeamRunManager.materializeRoot()` and add it to required `MixedTeamRunCallbacks`. Remove `noopCallbacks`; require complete callbacks for executable `createBackend`/`restoreBackend`; forward the resolver through the default manager plus the custom general-supervisor and application managers and all mixed root/subteam/configured/restored/task-Agent construction paths.
3. Tighten session capability types and issuance: exact publisher remains, Team-member identity produces the specialized task context, and owner mismatch/missing scope rejects issuance. Preserve token/revocation behavior.
4. Refactor the MCP adapter, task context, service, and router to supplied scope only; remove `getTeamRunService()` and restoration behavior in the same change.
5. Bind all three AutoByteus task tools through explicit `ToolConfig`, change registration to definitions-only, remove the custom-data parser and its test, and prove no task tool executes without member scope.
6. Update every direct constructor/builder/fake occurrence in the exhaustive table. Use the explicit test-only resolver fixture for non-task contexts; retain the two named context-only factory constructions only while they do not call executable methods.
7. Add architecture occurrence counts and forwarding-shape assertions for default/general/application managers, typed fake callbacks, direct contexts, and builder calls. Add omission/null/undefined fixtures for executable callbacks and member resolver inputs; forbid `noopCallbacks` and new unclassified occurrences.
8. Run focused source/unit/integration/e2e cases for configured, restored, task-Agent, nested-subteam, general-process, and application Team members; verify exactly one root changes per command.
9. Re-run the full source review, API/E2E matrix (including corrected migration sequence), durable-test review, dual-host real Brief/Socratic publication/handoff/projection/recovery/cleanup, package parity, provider/workspace/Team V2/migration, and Electron/delivery gates.

Required negative proof:

- architecture/source search finds no `getTeamRunService` import in `agent-tools/task-delegation/**`, the task MCP provider, or application execution paths;
- current-tree counts classify all three production/six test `MixedTeamManager` constructors, three production/eight test mixed-factory constructors, one production/five test builder calls, one production/four test direct contexts, and the typed fake callback capture; an added occurrence fails until classified;
- no `noopCallbacks` symbol remains; executable factory callback omission/null/undefined and resolver omission/null/undefined fail, while the two named context-only factory constructions remain non-executable;
- omitting/nulling the resolver at the manager -> mixed callbacks -> member builder, session issue, or AutoByteus tool creation boundary fails the focused fixture;
- application task execution leaves the general root task snapshot/event count unchanged, and the converse general case leaves the application root unchanged;
- owner/member root, address, or AgentRun identity mismatch rejects before descriptor/tool execution;
- revoked session, inactive root, pre-bind root, and root fail-stop reject before task persistence/event mutation;
- nested configured members and dynamically delegated task Agents/Teams resolve the same root-specific capability;
- one route, catalog, task manifest/service, and task persistence owner remain.

## SR-013 Design-Principles Self-Validation

| Principle / Gate | Evidence-backed validation | Result |
| --- | --- | --- |
| Product-Reachability Gate | Automatic Team-member tool exposure plus an ordinary application Team launch reaches the faulty adapter/service/global lookup. | Pass: corrects approved production behavior, not a hypothetical mechanism. |
| Primary and return spines | DS-025 covers business launch through root construction, member/session/tool dispatch, exact task mutation, persistence/event, result, revocation, and close. | Pass. |
| Authoritative boundary | RootTeamRun remains the sole task owner; the resolver is only a narrow capability back to that exact owner. | Pass: no competing task service or manager. |
| Scope identity | Root selection is fixed at construction; no caller-provided root/app ID and no registry/service lookup can redirect execution. | Pass. |
| Shared-structure tightness | Ordinary and Team-member session capabilities are meaningful discriminated variants; task fields are not nullable kitchen-sink additions. | Pass. |
| Construction and lifecycle | The design extends the established root-local callback closure, propagates forward, and uses existing root/session close owners. | Pass: acyclic, no generic deferred container or new lifecycle owner. |
| General/application propagation completeness | The source occurrence audit assigns every default/custom manager, executable factory, builder, direct context, and typed callback fixture; executable no-op callbacks are removed. | Pass: no implementation inference or fallback-by-omission remains. |
| Existing capability reuse | One route, catalog, dispatcher, task manifest/service/router, RootTeamRun task service, session manager pattern, and AutoByteus registry remain. | Pass: extension rather than duplicate infrastructure. |
| Clean replacement | Ambient `getTeamRunService()` and identity-only AutoByteus parser are removed; no fallback, alias, restore, or dual path remains. | Pass. |
| Host/application isolation | General and application members receive capabilities from their own roots while managers/sessions remain non-identical. | Pass. |
| Data proportionality | No wire or persisted bytes change; task/Team/application data are directly usable. | Pass: no migration. |
| Naming and placement | `MemberTaskRootResolver` states subject and role and lives with Team task execution; session variants live with MCP sessions; transport adapter remains thin. | Pass. |
| Scope proportionality | A bounded focused source/test set changes along one execution spine; no platform-wide runtime redesign or native-provider change. | Pass. |

## Guidance For Implementation

- Treat the v1.4.58 merge, SR-010 implementation, accepted SR-011 definition design, and accepted SR-012 task-ownership direction as current source; do not repeat the historical merge or reopen the catalog boundary. Implement only the SR-013-complete task-scope inventory after architecture Pass.
- Create/bind host definitions before any general/application execution owner. Pass exact services explicitly and fail closed on prior default construction; do not synchronize or fall back.
- Share only definition services. Preserve non-identical general/application run managers, Agent Tools session managers, publication services, and stop owners.
- Create task scope only at RootTeamRun materialization, propagate it through immutable member context, and project it into the issuing session/native tool. The default, general-supervisor custom, and application custom mixed managers all forward the same callback resolver; executable factory methods have no default callbacks. Do not infer scope from application ID, sender IDs alone, or any process getter.
- Keep the shared task service/router stateless with respect to execution scope. Remove `getTeamRunService()` and inactive-root restoration; do not replace them with another singleton, registry, or manager map.
- Keep native Codex/Claude file tools and the external Studio MCP gateway unchanged. AutoByteus task tools are server-owned and must receive the same exact member-bound context.
- Public Studio run resolvers must consume the configured general run services paired with the configured definition services. Remove their ambient service imports rather than retaining dual access.
- Keep optional migration label lookup non-caching and migration-local; do not move host catalog binding before required migrations or add dependent migration cascade behavior.
- Treat SR-001–SR-008 as implemented historical authority preserved by the DR-009 checkpoint. Use `latest-base-refresh-round-5-design-analysis.md` as the exact current SR-009 merge/source/test resolution map.
- Do not reopen the application-platform architecture. The approved SR-009 production changes are the application Team-scope projection/adapters, Personal Team/V2/migration integration, exact web junctions, and source-derived package regeneration.
- In hierarchical Agent/Team/member form tests, retain callable provider rows/snapshots/settlement and complete controlled workspace state while adopting Personal current hierarchy/stored-view contracts. Preserve nullable/effective runtime handling exactly.
- Construct one explicit current-model policy and inject it into all three application validation boundaries; consume Personal selected-provider availability and do not duplicate provider lifecycle or add optional/global defaults. In the host validator, resolve a fresh exact `ModelInfo` after each leaf policy step and never cache a runtime model list across leaves.
- Resolve and validate every application Team scope and leaf before launch; pass complete `teamConfigs`/`memberConfigs` to Personal, inject its allocator explicitly, and never allocate a Team ID or infer a Team default in the application run-binding service.
- Keep TeamRun V1 knowledge inside the V2 migration and old flat memory knowledge inside the memory migration; normal history/location/runtime code is V2/current-layout only.
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
