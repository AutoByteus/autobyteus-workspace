# Design Spec — Application Backend Context Capability Naming Refactor

## Current-State Read

The current framework boundary is structurally sound but its application-backend
context is not self-describing. `ApplicationHandlerContext.runtimeControl`
aggregates ten operations that actually belong to three capabilities:

1. launch and interact with application-bound agents/teams;
2. list/resolve configured agent resources;
3. list/read published artifacts.

The worker constructs that one object and forwards every operation through the
`invokeRuntimeControl` worker/host JSON-RPC method. The engine host dispatches to
`ApplicationOrchestrationHostService`, which already delegates to more focused
launch, binding, resource, and artifact owners. The aggregation problem is
therefore primarily at the public context and process-adapter boundary, not in
the agent/team runtime architecture.

The launch correlation is likewise obscure. `bindingIntentId` is an
application-generated key created before launch and echoed in the platform
binding so an interrupted cross-database handoff can be reconciled. It is not an
LLM/user intent. Current platform DDL/model code, lifecycle-journal JSON, and two
built-in app baseline SQL files use the old name.

The user has confirmed that the application feature is not live and has no
released application data. Repository code can materialize pre-release local or
test databases, but those stores are outside the compatibility contract and are
disposable. Therefore the target is a direct canonical source/schema-definition
cutover validated from fresh test storage—not a database migration. Existing
application storage lifecycle/version machinery remains unchanged; this ticket
introduces no version `2`, transform service, checkpoint, or appended rename
migration.

The relevant current paths and evidence are recorded as `BEH-001` through
`BEH-007` in `investigation-notes.md`. The exact approved public target is in
`application-context-api-contract.md`.

## Intended Change

Perform one clean backend contract cutover:

- replace `context.runtimeControl` with `agentExecution`, `agentResources`, and
  `publishedArtifacts`;
- split generic agent/team start into `startAgent` and `startAgentTeam`;
- rename launch correlation from `bindingIntentId` to `launchRequestId` and
  expose `findByLaunchRequestId`;
- advance backend definition compatibility from v2 to v3;
- rename the worker/host reverse-invocation protocol away from runtime-control
  terminology;
- update platform bootstrap/store DDL and built-in baseline SQL directly to
  launch-request names and validate fresh initialization;
- update source, templates, docs, tests, built application backends, and
  importable packages together;
- add no streaming or frontend transport capability.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | Contract | `REQ-001`, `REQ-005`; `AC-001`, `AC-005` | Any backend handler receives `ApplicationHandlerContext` | Investigation `BEH-001`; contract and worker context construction | Three named capability objects replace the broad property; other context members are unchanged | `DS-001`, `DS-004` |
| `BEH-002` | Contract/System | `REQ-002`, `REQ-006`; `AC-002`, `AC-006`, `AC-007` | Handler starts or interacts with an agent/team | Investigation `BEH-002`; launch/orchestration services and built-in apps | Explicit start operations; shared binding/input/termination behavior preserved | `DS-001`, `DS-002` |
| `BEH-003` | Contract | `REQ-003`, `REQ-006`; `AC-003`, `AC-006` | Handler lists/resolves resources | Investigation `BEH-003`; resource services | Named resource capability, same authoritative resource behavior | `DS-001` |
| `BEH-004` | Contract | `REQ-004`, `REQ-006`; `AC-004`, `AC-006` | Handler reads artifacts | Investigation `BEH-004`; artifact projection and reconciliation services | Named artifact capability, same authorization/values | `DS-001` |
| `BEH-005` | Contract/Operational | `REQ-002`, `REQ-005`, `REQ-007`; `AC-002`, `AC-005`, `AC-007`, `AC-008` | App persists a launch correlation before calling start | Investigation `BEH-005`; built-in correlation services and platform binding store | Rename the correlation and recovery API only; no new retry/idempotency semantics | `DS-002`, `DS-003` |
| `BEH-006` | Operational/Contract | `REQ-005`, `REQ-007`..`REQ-009`; `AC-005`, `AC-008`..`AC-011` | Build/load v3 code and initialize isolated fresh application storage | Investigation `BEH-006`; worker contract check, platform DDL/app baseline SQL, user no-live-data clarification | Source/generated packages and the one canonical fresh schema cut over together; no legacy product path exists | `DS-003`, `DS-004` |
| `BEH-007` | Contract | `REQ-010`; `AC-010` | App seeks runtime output | Investigation `BEH-007`; framework supplement | Explicitly unchanged and deferred | N/A; preserved absence |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| [`application-context-api-contract.md`](./application-context-api-contract.md) | Exact intended public API | `REQ-001`..`REQ-007`, `REQ-010`; `AC-001`..`AC-007`, `AC-010` | Normative names, signatures, mapping, launch-request semantics, and clean-cut rules | Approved with requirements basis |
| [`framework-understanding.md`](./framework-understanding.md) | Current architecture synthesis | `REQ-001`..`REQ-010`; `AC-001`..`AC-011` | Establishes server/worker/orchestration boundaries and why streaming remains separate | Evidence/context; approval `N/A` |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor`.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue` and `Shared Structure Looseness`.
- Refactor needed now: `Yes`.
- Evidence: `ApplicationRuntimeControl` mixes execution, resources, binding
  recovery, and artifacts; `createRuntimeControl` mirrors that mix over IPC;
  `bindingIntentId` cannot be understood without historical documentation.
- Design response: split the public capability boundary, make launch subjects
  explicit, rename the correlation according to its actual lifecycle, and keep
  the existing deeper orchestration owners.
- Refactor rationale: adding streaming or more application capabilities atop the
  broad object would increase ambiguity. The clean naming prerequisite is
  bounded and behavior-preserving.
- Intentional deferrals and residual risk: application output streaming remains
  absent. The shared contract `index.ts` remains broad; fully decomposing all
  existing contract declarations is deferred because it is unrelated to the
  approved naming behavior. Any pre-release v2 application source must rebuild
  against v3; no compatibility runtime or data behavior is provided.

## Terminology

- **Agent execution:** the application-facing capability for starting and
  interacting with an application-bound standalone agent or agent team.
- **Launch request ID:** an app-generated, unique correlation ID for one launch
  request. It connects app-owned pending state to the eventual platform binding.
- **Binding ID:** the platform-created identity of the application-to-runtime
  binding; unchanged by this refactor.
- **Backend definition contract v3:** the backend handler-context contract in
  this ticket. It is distinct from the already-existing frontend iframe/SDK
  contract v3.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove public `ApplicationRuntimeControl`, `context.runtimeControl`,
  `ApplicationStartRunInput`, v2 backend-definition acceptance, and current
  `bindingIntentId`/pending-intent concepts.
- Do not add aliases, overloaded v2/v3 contexts, runtime dual reads, fallback
  JSON projection, or dual persistence writes.
- Because there is no released database/checksum compatibility obligation, edit
  and rename the pre-release built-in baseline SQL directly. Old terms may remain
  only in explicit v2 rejection fixtures or non-product ticket/review history.
- Do not add a platform v1→v2 migration, schema-version advance, migration-owned
  decoder, app checkpoint, appended rename migration, or runtime fallback.

## Persisted Data / State Transition Decision

- Repository code can create `platform.sqlite` binding/journal records and
  built-in `app.sqlite` pending/business correlations under the old names.
- Product-state evidence: the user explicitly confirmed that the application
  feature is not live and no released application data exists. Supported
  production volume is therefore zero; only disposable pre-release local/test
  storage may exist.
- Relevant source change: the canonical model field becomes `launchRequestId`;
  fresh indexed columns become `launch_request_id`; built-in baseline tables and
  columns become launch-request named.
- Decision: `Discard or Rebuild`.
- Rationale: transforming unsupported local/test state has no product benefit and
  would add a database version transition, legacy decoder, checkpoint protocol,
  failure paths, and test burden. Directly updating the pre-release canonical
  definitions is the proportionate clean cut.
- Supports: `REQ-007`..`REQ-009`; `AC-008`, `AC-009`, `AC-011`.

### Fresh-Storage Cutover Plan

- Backend contract version: advance application-backend definition compatibility
  from v2 to v3 because the JavaScript handler context changes incompatibly. This
  is a package/API version and is independent of database schema migration.
- Platform storage: update `ApplicationRunBindingStore` table/index setup,
  persistence, JSON model use, and launch-request lookup directly. Update the
  event journal writer to serialize the current binding model. Remove the
  existing old-column ALTER path and stale old-summary cleanup from the binding
  store so it defines one forward schema only. Do not create
  `ApplicationPlatformSchemaMigrationService` and do not advance the existing
  storage metadata version.
- Built-in app storage: rename/edit the existing pre-release baseline files
  (`Brief Studio 004`, `Socratic Math Teacher 002`) so fresh replay creates
  `pending_launch_requests` and `launch_request_id` directly. Rename the files to
  pending-launch-request terminology. Do not add later rename SQL files.
- Existing storage lifecycle boundary: `ApplicationMigrationService` and
  `ApplicationStorageLifecycleService` must have no ticket diff. Their generic
  behavior and the previously observed split ledger are outside this forward-only
  naming refactor.
- Test-state boundary: coverage must create isolated temporary application roots
  and fresh databases. Product code, runtime startup, and delivery logic add no
  migration, compatibility, rejection, or automatic deletion behavior for old
  pre-release storage; that state is outside the feature contract.
- Generated packages: rebuild both built-in backends, vendored contract/backend
  SDK declarations, and importable packages after source/baseline SQL changes.

### Focused Fresh-Storage Test Matrix

| Scenario | Required Evidence |
| --- | --- |
| Fresh platform storage | Binding tables/indexes are created with `launch_request_id`; persisted/hydrated summaries contain `launchRequestId`; lookup by launch request works. |
| Fresh Brief Studio storage | Baseline replay creates `pending_launch_requests` and `brief_bindings.launch_request_id`; launch/finalization/reconciliation scenarios pass. |
| Fresh Socratic storage | Baseline replay creates `pending_launch_requests.launch_request_id`; launch/input/termination/reconciliation scenarios pass. |
| Repeated preparation of current fresh schema | Existing generic startup behavior remains stable; no new schema version, checkpoint, or rename migration is involved. |
| Repository inventory | Active source, baseline SQL, generated packages, and current docs contain no old context/intent tokens outside explicit v2 rejection or ticket-history allowlists. |

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `BEH-001`..`BEH-004` | App backend handler context call | Existing runtime/resource/artifact result returned to handler | `ApplicationOrchestrationHostService` behind the worker capability adapter | Proves naming changes without changing behavior/authority |
| `DS-002` | Primary End-to-End | `BEH-002`, `BEH-005` | App persists launch request and calls explicit start | Binding returned/finalized in app state | App correlation service + orchestration binding launch owner | Covers the real cross-database launch lifecycle |
| `DS-003` | Primary End-to-End | `BEH-006` | Build/package cutover plus isolated fresh application storage initialization | Current v3 worker and launch-request schema ready | Contract/package owners plus platform store and built-in baseline-SQL owners | Proves source-only cutover without inventing a legacy path |
| `DS-004` | Bounded Local | `BEH-001`..`BEH-006` | Worker context capability invocation | Host dispatch result/error returned | Application engine host/worker protocol | Makes the process boundary and type routing explicit |
| `DS-005` | Return-Event | `BEH-005`, `BEH-006` | Runtime lifecycle event with current binding | App event handler receives v3 binding | Execution journal/dispatch + engine worker | Ensures new event JSON is current-shaped and delivery remains valid |

## Primary Execution Spine(s)

### `DS-001` — Named context capability

```text
Application Handler
  -> ApplicationHandlerContext named capability
  -> Worker Context Capability Adapter
  -> Application Engine Host capability dispatcher
  -> ApplicationOrchestrationHostService
  -> existing launch/binding/resource/artifact owner
  -> typed result back to handler
```

### `DS-002` — Launch request and reconciliation

```text
App Business Service
  -> PendingLaunchRequest repository
  -> agentExecution.startAgent/startAgentTeam
  -> ApplicationRunBindingLaunchService
  -> platform binding(launchRequestId)
  -> returned binding / lifecycle event
  -> app finalization
```

Ambiguous handoff recovery:

```text
PendingLaunchRequest.launchRequestId
  -> agentExecution.findByLaunchRequestId
  -> ApplicationRunBindingStore
  -> existing binding
  -> app finalization without duplicate launch
```

### `DS-003` — Pre-release source and storage cutover

```text
Source/package cutover
  -> v3 contracts + backend SDK + worker/host protocol
  -> platform binding/journal current DDL
  -> built-in baseline SQL renamed/edited in place
  -> regenerate built-in packages/declarations
  -> isolated fresh test initialization
  -> v3 current-only stores/context
```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | A handler chooses one named capability; the worker maps it over one typed reverse invocation; the host delegates to the existing authoritative service and returns unchanged results. | Context capability, orchestration operation, binding/resource/artifact result | Orchestration host behind engine adapter | Contract v3 validation, error mapping |
| `DS-002` | The app writes a pending launch request before platform launch, then attaches the returned/found binding to its business object. | Pending launch request, binding, agent/team execution | App business correlation service plus binding launch service | App transaction, notification, lifecycle delivery |
| `DS-003` | The breaking source/package cutover updates canonical DDL and built-in baseline SQL directly. Development/tests validate isolated fresh initialization; no upgrade, reset, rejection, or compatibility path is added to product code. | Backend contract version, current binding/journal schema, built-in baseline schema | Contract/package owners plus platform/app schema-definition owners | Test isolation, generated package consistency |
| `DS-004` | One worker-local adapter turns capability methods into a discriminated IPC request and reconstructs the typed result/error. | Capability request/response | Application engine protocol/host | JSON-RPC transport |
| `DS-005` | A newly persisted current-shaped lifecycle binding JSON is dispatched through the existing at-least-once path to a v3 handler. | Journal record, event envelope, handler context | Execution event journal/dispatch | Delivery cursor/retry |

## Spine Actors / Main-Line Nodes

- App handler / built-in business service.
- `ApplicationHandlerContext` capability boundary.
- Worker context capability adapter.
- `ApplicationEngineHostService` reverse-call dispatcher.
- `ApplicationOrchestrationHostService` facade.
- Focused existing launch/binding/resource/artifact services and stores.
- Platform store and built-in baseline-SQL owners for fresh storage.

## Ownership Map

| Node | Owns | Explicit Non-Responsibility |
| --- | --- | --- |
| `ApplicationHandlerContext` | Public capability contract and discoverable names | Runtime execution, persistence, transport |
| Worker adapter | Public-method-to-IPC mapping and context construction | Business policy or persistence |
| Engine host | Worker lifecycle, application scoping, reverse-call admission/dispatch | Agent/team semantics |
| Orchestration host | Authoritative application runtime facade and availability/startup gates | Public frontend transport |
| Binding launch service | Validate resource/launch kind, launch agent/team, persist binding | App business correlation |
| Binding store | Current binding persistence/query by binding/launch request | Historical shape translation after startup |
| App correlation services | Pending request/business-object correlation and recovery sequencing | Platform binding persistence |
| Platform binding/event stores | Current launch-request model, fresh table/index DDL, persistence, and lookup | Old-row decoding or schema-version transitions |
| Built-in baseline SQL owners | Fresh app schema construction using launch-request names | Upgrade SQL for unsupported pre-release databases |

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `context.agentExecution` | Orchestration host + launch/binding owners | Stable app-author capability | Agent service internals or persistence |
| `context.agentResources` | Resource resolver/configuration service | Stable app-author resource capability | Resource catalog storage details |
| `context.publishedArtifacts` | Artifact projection service via orchestration | Stable app-author artifact reads | Artifact truth/publication |
| `ApplicationOrchestrationHostService` | Focused services/stores | One app-scoped engine entry boundary | New duplicate persistence/model logic |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationRuntimeControl` | Mixed public capability | Three focused capability types | In This Change | Remove export and generated declarations |
| `ApplicationStartRunInput` | Hides agent/team subject in union | `ApplicationStartAgentInput`, `ApplicationStartAgentTeamInput` | In This Change | Shared internal helpers allowed, not public union method |
| `context.runtimeControl` and `createRuntimeControl` | Ambiguous public/adapter name | Named capability properties/factories | In This Change | No alias |
| `invokeRuntimeControl` protocol method/types/handler | Carries obsolete boundary terminology | `invokeApplicationContextCapability` discriminated protocol | In This Change | Worker/host cut over atomically |
| Public/current `bindingIntentId` symbols and pending-intent baseline SQL/file names | Misleading semantic name | `launchRequestId` / pending launch request | In This Change | Old tokens isolated to explicit v2 rejection or ticket history only |
| Current pending-intent repositories/services/test names | Misdescribe launch correlation | Pending-launch-request names | In This Change | Rename files and exports |
| Backend definition contract v2 acceptance/constants in current API | Describes removed context | v3 only | In This Change | Explicit v2 rejection test remains |

## Return Or Event Spine(s)

`DS-005` remains the current durable event path:

```text
Agent/Team Lifecycle
  -> ApplicationExecutionEventIngressService
  -> ApplicationExecutionEventJournalStore(binding_json.launchRequestId)
  -> ApplicationExecutionEventDispatchService
  -> ApplicationEngineHostService
  -> v3 worker event handler context
```

No delivery semantics change. Newly written journal records serialize
`binding_json.launchRequestId`, and hydration reads that one v3 binding shape
directly. No old journal JSON is transformed, dual-read, or admitted.

## Bounded Local / Internal Spines

### `DS-004` — Worker/host capability dispatch

Parent: application engine.

```text
capability method
  -> { capability, operation, input }
  -> JSON-RPC reverse invocation
  -> host discriminated dispatch
  -> orchestration method
  -> result/error
```

The protocol union must be exhaustive. Unknown capability/operation values fail
with a context-capability error, not an obsolete runtime-control error.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Backend contract validation | `DS-001`, `DS-004` | Worker engine | Reject non-v3 definitions before handlers | Prevent delayed missing-property failure | Pollutes every handler invocation |
| Fresh-storage fixture | `DS-003` | Development/test setup | Start v3 validation from an isolated empty per-app storage root | Verifies the only supported forward schema | Product runtime gains legacy/reset policy |
| Current schema validation | `DS-003`, `DS-005` | Platform/app store owners | Prove fresh columns/tables/JSON use only launch-request names | Catches partial source cutover | Normal repositories gain legacy branches |
| Package regeneration | `DS-001` | App packages | Keep source/generated output consistent | Checked-in packages are executed/imported | Manual generated edits drift from source |
| Static old-term inventory | all | Review/coverage | Prove old terms are isolated | Clean-cut acceptance | Runtime code accidentally retains alias |

## Ownership Boundaries

- App authors depend only on the v3 handler context and backend SDK exports.
- Worker code maps context calls to the engine protocol; it does not call server
  orchestration internals directly.
- Engine host remains the only worker reverse-call entry and supplies
  `applicationId`; callers cannot choose another application.
- Orchestration remains authoritative for availability, resource validation,
  bindings, agent/team services, and artifact access.
- Platform store DDL and built-in baseline SQL directly define the only supported
  launch-request schema. Normal repositories are current-schema-only.
- Fresh isolated databases are a test/setup precondition, not a product runtime
  migration, reset, rejection, or deletion responsibility.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanisms | Upstream Callers | Forbidden Bypass | If API Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| v3 `ApplicationHandlerContext` | worker invoker/protocol | App handlers | importing server services | add a named capability operation |
| `ApplicationEngineHostService` | worker handle + reverse dispatch | worker protocol | worker calling orchestration modules | extend discriminated capability dispatch |
| `ApplicationOrchestrationHostService` | launch/binding/resource/artifact services | engine host | engine using stores/agent services directly | add focused facade method |
| Platform binding/event stores and built-in baseline SQL | current schema creation/persistence | storage lifecycle, orchestration, built-in repositories | old-schema translation, version advancement, or dual reads | change the canonical DDL/baseline source and validate fresh initialization |

## Dependency Rules

- Contracts may depend on execution-resource types; they must not import server
  implementation types.
- Backend SDK re-exports only v3 public types/helpers.
- Worker adapter depends on public contract types and internal protocol only.
- Engine host dispatches only through orchestration host, not directly to stores
  or agent/team services.
- No active product source or canonical baseline SQL may retain the old
  correlation names; there is no migration-owned exception in this ticket.
- Built-in apps depend on backend SDK capability names, never worker protocol or
  server orchestration modules.
- Frontend SDK/web host must not be changed for this ticket.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `agentExecution.startAgent` | Standalone agent launch | Create one bound agent execution | app-scoped `launchRequestId` + agent resource/launch | Reject team launch shape by type/runtime validation |
| `agentExecution.startAgentTeam` | Team launch | Create one bound team execution | app-scoped `launchRequestId` + team resource/launch | Reject agent launch shape |
| `agentExecution.sendInput` | Existing binding input | Send text/context/member target | `bindingId` plus optional member selector | No frontend authority added |
| `agentExecution.get/list/terminate` | Existing bindings | Query/list/terminate | `bindingId` or status filter | Existing null/status semantics |
| `agentExecution.findByLaunchRequestId` | Launch correlation | Nullable recovery lookup | one non-empty `launchRequestId` scoped by app | Not an idempotent start |
| `agentResources.listAvailable/getConfigured` | Agent/team resources | Discovery/configured slot resolution | filter or `slotKey` | Same authoritative services |
| `publishedArtifacts.list/readRevision` | Durable artifact read | Application-owned run/revision read | `runId`; `runId + revisionId` | Same ownership validation |

## Interface Boundary Check

| Interface | Responsibility Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `agentExecution` | Yes | Yes | Low | Explicit start methods and launch-request lookup |
| `agentResources` | Yes | Yes | Low | Keep resource filters/slot key typed |
| `publishedArtifacts` | Yes | Yes | Low | Keep run/revision IDs explicit |
| Context capability IPC | Yes | Yes | Low | Discriminated capability + operation union |

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| App execution capability | `agentExecution` | Yes | Low | Use for both agent and explicit agent-team methods |
| Resource capability | `agentResources` | Yes | Low | Document resources include agents and teams |
| Artifact read capability | `publishedArtifacts` | Yes | Low | Keep publication truth outside this reader |
| Launch correlation | `launchRequestId` | Yes | Low | Define once; ban “intent” in current code |
| Recovery lookup | `findByLaunchRequestId` | Yes | Low | `find` communicates nullable result |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Agent/team launch/control | Application orchestration | Reuse | Already authoritative | N/A |
| Resource resolution/config | Application orchestration resource services | Reuse | Existing validation/state | N/A |
| Artifact reads | Published artifact projection via orchestration | Reuse | Existing truth/auth | N/A |
| Worker reverse transport | Application engine protocol | Extend | Correct process boundary | N/A |
| Platform fresh schema | Application run-binding/event stores | Modify in place | Existing owners already define current DDL and persistence; no transition owner is needed | N/A |
| Built-in fresh schema | Existing baseline SQL files | Modify/rename in place | Pre-release replay is the canonical construction path; no appended transition SQL is justified | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns Which Concerns | Spine IDs | Governing Owners | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK contracts/backend SDK | v3 public shape/exports | `DS-001`, `DS-002` | Handler context contract | Extend | No frontend SDK change |
| Application engine | context construction and IPC | `DS-001`, `DS-004`, `DS-005` | Engine host | Extend | Rename protocol cleanly |
| Application orchestration | behavior behind capabilities | `DS-001`, `DS-002`, `DS-005` | Orchestration host/focused services | Reuse/rename | Preserve semantics |
| Application storage | current platform DDL and fresh test initialization | `DS-003` | Binding/event stores and test setup | Modify/no lifecycle redesign | No new migration, compatibility, reset, or schema version behavior |
| Built-in applications | current API usage, business correlation, and baseline SQL | `DS-002`, `DS-003` | App services/repositories/baseline SQL | Modify | Edit baseline; rebuild packages |
| Docs/tests/generated packages | teaching/evidence/distribution | all | Existing owners | Modify | Clean inventory with v2/ticket-history allowlist |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| contracts `src/index.ts` | contracts | public API | v3 constants/types/context and exact exported artifact summary | Existing canonical aggregate for current types | Yes |
| worker runtime | engine | context adapter | three capability factories + v3 validation | One worker context composition point | Yes |
| protocol | engine | IPC | discriminated context capability requests | Existing protocol owner | Yes |
| binding/event stores | storage/orchestration | current persistence | launch-request DDL, JSON, writes, lookup | Existing canonical owners | Yes |
| existing built-in baseline SQL files | app storage | fresh schema | create pending launch request tables/columns directly | Existing replay authority; pre-release files may be renamed/edited | App-local |
| binding store | orchestration | persistence | current launch-request binding schema | One binding repository | Yes |
| event journal store | orchestration | persistence | current binding JSON in events | One journal repository | Yes |
| built-in pending launch repository per app | app | business persistence | current app correlation state | App-owned schema differs by business ID | No cross-app shared file |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Start input shared fields | Public start input types in contracts | contracts | Agent/team inputs share correlation/resource/initial input | Yes; only launch type differs | Yes | Mostly-optional generic start union |
| Published artifact list item | `ApplicationPublishedArtifactSummary` in contract `src/index.ts` | contracts | `publishedArtifacts.list` and backend-SDK consumers need one exact public item model | Yes; replaces the current inline declaration without changing fields | Yes | A second projection shape or optional catch-all record |
| Context capability IPC envelope | engine `runtime/protocol.ts` | engine | Worker/host share exact discriminated union | Yes | Yes | `action: string` bag |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Meaning Per Field? | Redundant Removed? | Parallel Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationStartAgentInput` | Yes | Yes | Low | Agent launch only |
| `ApplicationStartAgentTeamInput` | Yes | Yes | Low | Team launch only |
| `ApplicationRunBindingSummary.launchRequestId` | Yes | Yes | Low | Remove `bindingIntentId` |
| `ApplicationPublishedArtifactSummary` | Yes | Yes | Low | Export the exact current fields: `id`, `runId`, `path`, `type`, literal `status`, `description`, `revisionId`, `createdAt`, `updatedAt` |
| Context capability IPC union | Yes | Yes | Low | Exhaustive capability/operation variants |

## Final File Responsibility Mapping

| File | Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/index.ts` | contracts | public API | v3 constants, focused capability interfaces, renamed binding field, exported `ApplicationPublishedArtifactSummary` with the preserved nine fields | Existing canonical export surface; full file split deferred | Yes |
| `autobyteus-application-backend-sdk/src/index.ts` | backend SDK | app-author facade | re-export v3 capability/input/artifact summary types | Thin public facade | Yes |
| `autobyteus-server-ts/src/application-engine/runtime/protocol.ts` | engine | IPC boundary | discriminated context capability protocol | One worker/host protocol owner | Yes |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | engine | worker adapter | construct v3 contexts and map capabilities | One context composition point | Yes |
| `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts` | engine | host dispatcher | app-scoped capability dispatch | Existing reverse-call authority | Yes |
| `application-run-binding-store.ts` | orchestration | current persistence | launch-request-only binding schema/query | Existing binding owner | Yes |
| `application-execution-event-journal-store.ts` | orchestration | current persistence | launch-request-only event binding JSON | Existing journal owner | Yes |
| orchestration host/launch service files | orchestration | behavior | explicit agent/team start and renamed correlation lookup | Existing behavior owners | Yes |
| built-in app correlation repository/service files | app | app business | pending launch request and recovery | Separate business IDs/schema | App-local |
| `applications/brief-studio/backend-src/migrations/004_pending_launch_requests.sql` | app storage | Brief baseline schema | directly create pending request and binding correlation with launch-request names | Renamed/edited pre-release baseline file | App-local |
| `applications/socratic-math-teacher/backend-src/migrations/002_pending_launch_requests.sql` | app storage | Socratic baseline schema | directly create pending request with launch-request names | Renamed/edited pre-release baseline file | App-local |

## Applied Patterns

- **Named capability façade:** handler context offers three subject-specific
  façades while the orchestration host remains the deeper governing owner.
- **Discriminated process protocol:** capability and operation select the only
  valid input/output route; no generic string action bag.
- **Pre-release baseline cutover:** canonical DDL/baseline SQL are updated
  directly and validated from fresh test storage; no old schema enters
  current runtime paths.
- **App-owned correlation:** launch request remains app-generated and business
  mapping remains in each application's database.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/index.ts` | File | public contracts | v3 API/model names and exact artifact-summary declaration/export | Current contract authority | Server implementation or parallel artifact item shapes |
| `autobyteus-application-backend-sdk/src/index.ts` | File | backend SDK | v3 re-exports including artifact summary | App author entrypoint | Compatibility aliases |
| `autobyteus-server-ts/src/application-engine/runtime/protocol.ts` | File | engine IPC | context capability protocol | Existing transport boundary | Orchestration policy |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | File | worker adapter | context construction | Worker execution boundary | Runtime business logic |
| `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts` | File | engine host | scoped dispatch | Existing host authority | Direct store access |
| `autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts` | File | current binding persistence | launch-request DDL/index/write/lookup/JSON; remove old-column ALTER and stale-summary cleanup | Existing binding authority | Old-row cleanup/translation, version branching, or dual reads |
| `autobyteus-server-ts/src/application-orchestration/stores/application-execution-event-journal-store.ts` | File | current event persistence | serialize current binding with `launchRequestId` | Existing journal authority | Old JSON conversion |
| `autobyteus-server-ts/src/application-orchestration/**` named files | Folder/files | orchestration | current launch/binding/event API | Existing behavior authority | Old terminology/fallbacks |
| `applications/*/backend-src/repositories/pending-launch-request-repository.ts` | Files | app persistence | current pending correlation | App-owned schema | Platform storage access |
| `applications/brief-studio/backend-src/migrations/004_pending_launch_requests.sql` | File | Brief baseline schema | direct pending/binding launch-request tables | Existing pre-release construction step | Rename-from-old transition SQL |
| `applications/socratic-math-teacher/backend-src/migrations/002_pending_launch_requests.sql` | File | Socratic baseline schema | direct pending launch-request table | Existing pre-release construction step | Rename-from-old transition SQL |
| `applications/*/backend/**`, `applications/*/dist/importable-package/**` | Generated folders | package output | regenerated v3 executable/package | Checked-in distribution model | Manual-only divergence |

The established folder layout remains clearer than introducing a transition
subsystem for unreleased data. Current platform DDL stays with its store owners;
built-in baseline SQL stays with each app. `ApplicationMigrationService` and
`ApplicationStorageLifecycleService` retain their baseline behavior and are not
modified for this naming cutover.

## Folder Boundary Check

| Path / Folder | Structural Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `application-engine/runtime` | Transport | Yes | Low | Protocol only |
| `application-engine/worker` | Boundary adapter | Yes | Low | Worker context/invocation |
| `application-storage/services` | Off-spine lifecycle | Yes | Low | Existing behavior retained; no ticket-specific service added |
| `application-orchestration/services` | Main-line domain-control | Yes | Medium | Broad host remains façade; focused services stay owners |
| `application-orchestration/stores` | Persistence | Yes | Low | Current-schema-only repositories |
| built-in app `repositories`/baseline SQL | Persistence/construction | Yes | Low | Existing app-owned split; pre-release source edited directly |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Public capability | `context.agentExecution.startAgentTeam(...)` | `context.runtimeControl.startRun({kind:"AGENT_TEAM"})` | Domain and action are inferable |
| Recovery | `findByLaunchRequestId(id)` after ambiguous handoff | retrying start and assuming ID is idempotency key | Preserves actual semantics |
| IPC | `{capability:"agentExecution", operation:"sendInput", input}` | `{action:string,input:unknown}` named runtime control | Exhaustive routing and clearer errors |
| Pre-release schema | edit baseline to create `launch_request_id` → validate from isolated fresh storage | add a version-2 transform/checkpoint for unreleased data | Keeps the ticket forward-only and current-only |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep `runtimeControl` alias | Easier external upgrade | Rejected | v3 named capabilities; rebuild apps |
| Accept backend v2 and v3 | Gradual rollout | Rejected | v3 only; explicit early rejection |
| Map old/new protocol method names | Mixed worker/host versions | Rejected | worker/host ship atomically |
| Current store reads `bindingIntentId` or `launchRequestId` | Tolerate stale pre-release DBs | Rejected | one current-only reader; old storage has no product path |
| Write both old/new columns/properties | Tolerate stale pre-release DBs | Rejected | direct canonical DDL/baseline update |
| Platform v1→v2 transform service | Preserve nonexistent released data | Rejected | directly update the single forward schema |
| Appended rename SQL/checkpoint redesign | Preserve old app DBs | Rejected | edit/rename pre-release baseline SQL; leave generic migration framework unchanged |

## Derived Layering (Explanatory Only)

```text
App Author Contract
  -> Worker Process Adapter
  -> Engine Host Boundary
  -> Application Orchestration
  -> Agent/Team, Resource, Binding, Artifact Owners

Storage Preparation
  -> Fresh Current Schema Definitions
  -> Current-Only Repositories
```

No layer may bypass the owning boundary immediately below it.

## Change / Refactor Sequence

1. Add v3 contract constant/types and exact capability interfaces, including the
   exported preserved `ApplicationPublishedArtifactSummary`; rename the binding
   correlation field; remove v2/current public types.
2. Update backend SDK exports, bundle manifest compatibility type/writer/parser,
   devkit validation/template, and focused contract/devkit tests.
3. Remove/revert any partial ticket work that introduced
   `ApplicationPlatformSchemaMigrationService`, app migration checkpoints,
   lifecycle reconciliation changes, or appended rename SQL; retain the baseline
   generic migration/lifecycle implementation.
4. Convert binding/event stores and orchestration domain/services to
   `launchRequestId`; remove old store schema setup and lookup names.
5. Replace worker context factory and reverse protocol with the three named
   capabilities/discriminated dispatcher; update engine tests.
6. Convert built-in app source to pending launch requests and named capabilities;
   rename/edit Brief `004` and Socratic `002` baseline SQL directly and remove the
   partial appended rename SQL files.
7. Advance built-in backend definitions/manifests to v3; rebuild contract/backend
   SDK declarations, app backends, vendored SDK declarations, and importable
   packages using existing scripts.
8. Update current docs/READMEs and focused test files/symbols; do not add
   customer migration or compatibility guidance.
9. Run focused builds/unit/integration tests from isolated empty storage and a
   repository inventory that permits old tokens only in explicit v2 rejection
   or ticket-history allowlists.
10. Do not begin output-stream implementation in this change.

Temporary compile failures during steps 1–7 are acceptable only within the
implementation branch; no intermediate compatibility API is committed as the
target. Final code must have one v3 path.

## Key Tradeoffs

- A backend contract bump is more disruptive than an alias but produces the
  clarity requested and prevents permanent dual vocabulary.
- Explicit agent/team start methods add two small adapters but remove a public
  union/branch from app-author discovery.
- Direct baseline editing intentionally discards any unsupported pre-release
  schema history and keeps every normal repository current-only.
- Keeping `ApplicationRunBindingSummary` and `bindingId` limits scope; those names
  describe the architectural application/runtime binding and were not rejected.
- Full contract-file decomposition is deferred to avoid turning a naming ticket
  into a broad package reorganization.

## Risks

- Missing one binding JSON producer or generated bundle would produce a delayed
  runtime error; fresh-storage and inventory tests must cover both.
- External v2 packages will stop loading until rebuilt; docs must state this
  intentional cutover.
- Generated importable packages are numerous; source-only changes are incomplete.

## Guidance For Implementation

- Follow `application-context-api-contract.md` exactly; do not invent synonyms.
- Keep `findByLaunchRequestId` nullable and application-scoped. Do not treat the
  ID as permission to retry launch idempotently.
- Runtime validation should still verify resource kind matches `startAgent` or
  `startAgentTeam`, even though TypeScript separates inputs.
- Declare and export `ApplicationPublishedArtifactSummary` exactly as specified;
  do not retain a second inline artifact-list item type.
- Keep old JSON/column/table translation out of current stores.
- Rename/edit the pre-release baseline SQL directly; do not append rename SQL.
- Do not add or retain ticket-created platform schema migration/checkpoint logic,
  and do not advance the existing application platform schema metadata from `1`.
- Use isolated fresh temporary storage in tests; add no product runtime behavior
  for migrating, rejecting, or deleting old application databases.
- Regenerate checked-in outputs through app build scripts.
- Treat any necessary frontend/streaming change as a requirement gap and return
  it to solution design rather than expanding scope.
