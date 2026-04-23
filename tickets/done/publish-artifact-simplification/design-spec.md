# Design Spec

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Current-State Read

Today `publish_artifact` is not a clean runtime artifact boundary. It lives in application orchestration, accepts a rich app-owned payload (`contractVersion`, `artifactKey`, `artifactType`, `title`, `summary`, `artifactRef`, `metadata`, `isFinal`), and appends that payload into the application execution journal before returning success. That makes artifact publication:

- application-specific instead of runtime-wide,
- coupled to application-journal semantics,
- unavailable in Codex and Claude,
- and structurally different from the user’s product meaning of “artifact = the file the agent intentionally publishes at the end of its work.”

At the same time, the current product-facing Artifacts experience is owned by `run-file-changes`, not by explicit publication. `RunFileChangeService` watches generic run events, infers canonical file paths for `write_file`, `edit_file`, and generated outputs, persists `file_changes.json`, emits `FILE_CHANGE_UPDATED`, and the web Artifacts tab hydrates from `getRunFileChanges(runId)`. Current docs explicitly describe `ARTIFACT_PERSISTED` / `ARTIFACT_UPDATED` as compatibility noise while file changes are authoritative.

The current application framework also treats artifact business handling as an application-journal concern:

- `ApplicationExecutionEventIngressService.appendRuntimeArtifactEvent(...)` appends one `ARTIFACT` journal record,
- `ApplicationExecutionEventDispatchService` replays that journal into app `eventHandlers.artifact`,
- Brief Studio / Socratic project old payload fields from that app journal event.

That shape is wrong for this ticket for five reasons:

1. **Wrong authoring contract**: agents author application-management fields instead of publishing a file path.
2. **Wrong runtime coverage**: native AutoByteus can expose the tool, but Codex and Claude do not.
3. **Wrong artifact semantics**: generic file changes are treated as artifacts even though the user explicitly separated touched files from published artifacts.
4. **Wrong application boundary**: artifact business handling is coupled to application-journal append instead of consuming a shared published-artifact boundary directly.
5. **Wrong event semantics**: the authoritative published-artifact signal should be `ARTIFACT_PERSISTED` only.

The target design must therefore:

- make `publish_artifact` a runtime-wide file publication tool,
- keep run file changes as separate low-level telemetry,
- make published artifacts durable and queryable as first-class platform objects,
- emit `ARTIFACT_PERSISTED` as the single authoritative published-artifact event,
- and let applications consume that shared artifact boundary directly without redefining artifact truth through application-journal append/retry state.

## Intended Change

Introduce a new **published-artifacts subsystem** that owns explicit artifact publication as a file-based, runtime-wide capability.

The agent-facing tool becomes:

```json
{
  "path": "relative/path/to/file",
  "description": "optional short explanation"
}
```

Every successful tool call publishes one concrete file by:

1. resolving and validating the file path against the run workspace,
2. copying the file into a durable run-scoped published-artifact snapshot store,
3. recording/refreshing the latest artifact summary keyed by canonical published path,
4. recording one immutable revision for that publish operation,
5. emitting one authoritative runtime event: `ARTIFACT_PERSISTED`,
6. updating application/runtime artifact query/read surfaces from the durable published-artifact store,
7. and, when the run is application-bound, relaying that published-artifact event live to the bound application’s artifact handler **without** appending an artifact entry into the application execution journal.

Direct application-consumption policy:

- artifact publication success depends only on durable published-artifact persistence;
- live application artifact delivery is a best-effort low-latency relay, not a second durability contract;
- if live relay fails or the app worker is unavailable, the artifact remains published and queryable;
- applications recover missed artifact deliveries by reconciling from runtime-control published-artifact queries using `revisionId` as the idempotent business key.

Lifecycle journals remain for `RUN_STARTED`, `RUN_FAILED`, `RUN_TERMINATED`, and `RUN_ORPHANED`. Published artifacts leave that journal path entirely.

Run file changes remain separate and continue to own touched-file telemetry plus `FILE_CHANGE_UPDATED`; they are no longer allowed to define artifact semantics or emit artifact events.

The current frontend `Artifacts` tab is intentionally **not** repointed in this ticket. It remains a legacy/misnamed changed-files surface backed by `run-file-changes`. No published-artifact display is introduced in the web UI here; any future UI that shows published artifacts requires a separate design.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-PA-001 | Primary End-to-End | Agent runtime tool call | Durable published-artifact snapshot + `ARTIFACT_PERSISTED` emission | `PublishedArtifactPublicationService` | This is the new authoritative artifact publication spine. |
| DS-PA-002 | Return-Event | Bound run emits `ARTIFACT_PERSISTED` | Application artifact handler receives a live published-artifact callback | `ApplicationPublishedArtifactRelayService` | Bound applications still need live artifact awareness, but not through the application execution journal. |
| DS-PA-003 | Primary End-to-End | App lifecycle `onStart` / app-owned reconcile trigger | App projector catches up missed artifact revisions from durable published-artifact queries across relevant bindings, including terminated/orphaned bindings until catch-up is complete | application-specific artifact reconciliation owner | This is the consistency path when live artifact relay is missed or fails. |
| DS-PA-004 | Primary End-to-End | Application runtime-control artifact query | Published artifact summary or revision content | `PublishedArtifactProjectionService` | Applications and future explicitly designed consumers must read real published artifacts without reconstructing them from file changes; the current web UI is intentionally not a consumer in this ticket. |
| DS-PA-005 | Bounded Local | Generic run events | Run-file-change projection + `FILE_CHANGE_UPDATED` | `RunFileChangeService` | File-change telemetry remains alive, but explicitly separate from the published-artifact spine. |

## Primary Execution Spine(s)

- `publish_artifact tool adapter -> PublishedArtifactPublicationService -> PublishedArtifactSnapshotStore + PublishedArtifactProjectionStore -> AgentRun.emitLocalEvent(ARTIFACT_PERSISTED)`
- `AgentRun.emitLocalEvent(ARTIFACT_PERSISTED) -> ApplicationPublishedArtifactRelayService -> ApplicationEngineHostService -> application artifact handler`
- `application lifecycle / reconcile trigger -> ApplicationRuntimeControl.listRunBindings(no active-only filter) + getRunPublishedArtifacts + getPublishedArtifactRevisionText -> app projector`
- `ApplicationRuntimeControl -> PublishedArtifactProjectionService -> projection store / revision reader`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-PA-001 | Runtime-specific tool adapters all call the same publication service. That service validates the requested workspace file, snapshots the file into durable artifact storage, updates the latest-by-path summary, writes an immutable revision record, and emits `ARTIFACT_PERSISTED` with the persisted artifact summary. | tool adapter, publication service, snapshot store, projection store, active run | `PublishedArtifactPublicationService` | tool argument parsing, file-kind derivation, path canonicalization |
| DS-PA-002 | For application-bound runs, artifact events are relayed live from the shared runtime artifact boundary into the bound application’s artifact handler. Relay is best-effort only: it never gates publish success and never becomes a second artifact durability path. | run event relay, app binding lookup, engine host, app artifact handler | `ApplicationPublishedArtifactRelayService` | producer derivation, handler-presence check, relay diagnostics |
| DS-PA-003 | Applications reconcile from durable published-artifact truth rather than from missed live relay state. On startup or an app-owned recovery trigger, the app lists all relevant bindings for the application, including terminated/orphaned bindings that are not yet marked catch-up complete, lists published artifacts for each run, reads missing revisions, and projects them idempotently by `revisionId`. A terminal binding leaves the reconciliation selector only after the app records that no unprojected revisions remain for that binding. | app lifecycle hook / reconcile trigger, runtime control, app projector, app DB | application-specific artifact reconciliation owner | binding selection across all statuses, terminal-binding catch-up checkpoint, processed-revision tracking |
| DS-PA-004 | Artifact consumers in scope query summaries or revision content from a single projection service that reads the persisted published-artifact manifest and revision snapshots. In this ticket, application runtime control goes through this query owner; the current web UI does not. | runtime control, projection service, stores | `PublishedArtifactProjectionService` | run metadata lookup, text/binary content reading |
| DS-PA-005 | File changes continue to listen to raw run events and emit `FILE_CHANGE_UPDATED`, but they no longer synthesize or own artifact semantics. Their responsibility is narrowed to touched-file telemetry only. | run-file-change service, file-change store, file-change consumers | `RunFileChangeService` | path inference, transient `write_file` buffering |

## Spine Actors / Main-Line Nodes

- runtime-specific `publish_artifact` tool adapters
- `PublishedArtifactPublicationService`
- `PublishedArtifactSnapshotStore`
- `PublishedArtifactProjectionStore`
- `AgentRun.emitLocalEvent`
- `ApplicationPublishedArtifactRelayService`
- `ApplicationEngineHostService`
- application artifact handler
- application-specific artifact reconciliation owner
- `PublishedArtifactProjectionService`

## Ownership Map

- **Runtime tool adapters** own only transport adaptation for AutoByteus, Codex, and Claude. They must not own publication semantics, validation rules beyond shared parsing, persistence, or application business handling.
- **`PublishedArtifactPublicationService`** is the governing owner for publication lifecycle, path validation, artifact identity, immutable revision creation, durable snapshot persistence, summary upsert, and authoritative runtime event emission.
- **`PublishedArtifactSnapshotStore`** owns on-disk revision snapshot layout and content reads/writes.
- **`PublishedArtifactProjectionStore`** owns on-disk manifest persistence for latest artifact summaries and revision metadata.
- **`ApplicationPublishedArtifactRelayService`** owns best-effort live relay of `ARTIFACT_PERSISTED` from bound runs into application artifact handlers. It owns no durable artifact truth and no retry journal.
- **`ApplicationEngineHostService`** remains the authoritative boundary for invoking application worker handlers and runtime-control actions. It must not become the artifact persistence owner.
- **Application-specific artifact reconciliation owners** (for Brief Studio and Socratic Math) own missed-delivery catch-up using runtime control plus app DB idempotency keyed by `revisionId`, including app-owned terminal-binding catch-up completion state so terminated/orphaned bindings stay in scope until no published revisions remain unprojected.
- **`PublishedArtifactProjectionService`** owns read/query access to published artifacts for live runs, historical runs, and application runtime control. The current web UI is not a published-artifact consumer in this ticket.
- **`RunFileChangeService`** remains the owner of file-change telemetry only. It must not emit or define published-artifact semantics.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Native AutoByteus `publish_artifact` registry tool | `PublishedArtifactPublicationService` | Expose the shared tool to native AutoByteus agents | artifact semantics, app relay, or app projection logic |
| Codex dynamic tool registration | `PublishedArtifactPublicationService` | Expose the shared tool to Codex runtime threads | artifact storage or app business logic |
| Claude MCP/tool-definition wrapper | `PublishedArtifactPublicationService` | Expose the shared tool to Claude sessions | artifact storage or app business logic |
| Application runtime-control query entrypoints | `PublishedArtifactProjectionService` | Offer artifact reads to in-scope application consumers | direct store layout knowledge or path-resolution duplication |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `src/application-orchestration/tools/publish-artifact-tool.ts` old payload contract and rich validators | Old contract is application-specific and field-heavy | shared simple tool parser + `PublishedArtifactPublicationService` | In This Change | Delete after all callers migrate |
| `application-artifact-publication-validator.ts` and `application-artifact-ref-validator.ts` | Old payload validation model is removed | shared simple tool parser | In This Change | Delete after callers are migrated |
| Application execution journal `ARTIFACT` family and `appendRuntimeArtifactEvent(...)` | Applications should consume the shared artifact boundary directly, not through artifact journal append | `ApplicationPublishedArtifactRelayService` + runtime-control artifact queries | In This Change | Lifecycle journals remain |
| `AgentRunEventType.ARTIFACT_UPDATED` plus corresponding streaming/protocol handling | User explicitly wants one authoritative artifact event only | `ARTIFACT_PERSISTED` only | In This Change | Remove from enums, mappers, client protocol, and no-op handlers |
| Codex file-change synthesis of `ARTIFACT_PERSISTED` / `ARTIFACT_UPDATED` | Artifact events must no longer be inferred from file-change telemetry | `FILE_CHANGE_UPDATED` only for file changes; explicit publish service for artifacts | In This Change | Remove synthetic artifact event emission from file-change converters |
| Proposal to repurpose the current frontend `Artifacts` tab | Latest clarification says that would be a breaking change in this ticket | Keep the current `runFileChangesStore`-backed tab unchanged; defer any published-artifact web UI to a separate design | In This Change | Make the non-goal explicit in code/docs so implementation does not rewire the tab accidentally |
| Old app artifact payload fields (`artifactKey`, `artifactType`, `artifactRef`, `summary`, etc.) in Brief Studio / Socratic | App semantics move to path + producer + revision-based reads | app-specific projection/reconcile services using path conventions + revision content | In This Change | Includes schema/projection/frontend cleanup |

## Return Or Event Spine(s) (If Applicable)

- `PublishedArtifactPublicationService -> AgentRun.emitLocalEvent(ARTIFACT_PERSISTED)`
- `AgentRun.emitLocalEvent(ARTIFACT_PERSISTED) -> ApplicationPublishedArtifactRelayService -> ApplicationEngineHostService.invokeApplicationArtifactHandler(...) -> app projector`

## Bounded Local / Internal Spines (If Applicable)

- **Parent owner:** `PublishedArtifactPublicationService`
  **Arrow chain:** `normalize tool input -> resolve active run -> canonicalize workspace path -> verify file exists -> derive summary/revision ids -> copy snapshot -> update summary + revision -> emit local event`
  **Why it matters:** This is the critical local publication transaction. If split across multiple helpers without one owner, artifact identity, revision identity, success semantics, and event emission will drift.

- **Parent owner:** `ApplicationPublishedArtifactRelayService`
  **Arrow chain:** `receive bound-run artifact event -> resolve binding / producer -> check application artifact handler availability -> invoke handler live -> log relay failure if any`
  **Why it matters:** The live application callback is intentionally non-durable and non-blocking. One explicit owner keeps that policy clear and prevents journal semantics from leaking back in.

- **Parent owner:** application-specific artifact reconciliation owner
  **Arrow chain:** `list relevant bindings (all statuses, or nonterminal + terminal-not-caught-up) -> list published artifacts per run -> skip already-projected revisionIds -> read missing revision content -> project + persist revisionId -> mark terminal binding catch-up complete only when no missing revisions remain`
  **Why it matters:** This is the eventual-consistency path when live relay is missed. Keeping reconciliation explicit prevents hidden dependence on platform retry state and prevents terminated/orphaned bindings from dropping out before revision catch-up is complete.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Tool input parsing | DS-PA-001 | runtime tool adapters + publication service | reject extra fields, normalize `{ path, description? }` | One contract across runtimes | runtime adapters diverge |
| File-kind derivation | DS-PA-001, DS-PA-004 | publication/query owners | derive renderer/preview kind from path/content | Removes `artifactType` from the tool | generic tool grows app semantics |
| App binding / producer derivation | DS-PA-002 | relay service | resolve the bound application + producer for the artifact event | App relay still needs business provenance | publication service couples directly to app bindings |
| App-owned processed-revision tracking | DS-PA-003 | app reconciliation owner | persist projected `revisionId`s or use them as natural unique keys | Missed live relay must be recoverable without duplicates | platform grows app-specific dedupe logic |
| Terminal-binding catch-up completion state | DS-PA-003 | app reconciliation owner | keep terminated/orphaned bindings in reconciliation scope until no unprojected revisions remain | Missed live relay can outlive run activity | active-only selectors permanently miss revisions |
| Live relay diagnostics | DS-PA-002 | relay service | record/log failed live deliveries without changing artifact truth | Best-effort delivery still needs observability | fake durability expectations or silent app staleness |
| Current web artifact-tab preservation | DS-PA-005 | web file-change UI owner | keep the existing `Artifacts` tab backed by run file changes and prevent accidental published-artifact rewiring in this ticket | avoids a breaking semantic/UI change while backend artifact truth is being corrected first | implementation silently repurposes the legacy tab |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Runtime-wide artifact publication | `src/application-orchestration/tools` old artifact tool | Create New | Old owner is application-specific and payload-heavy | Existing area is the wrong subject boundary |
| Published-artifact reads | run-history/read-style services | Extend | Existing query surfaces can host artifact list/read APIs | New storage/read owner is still needed |
| Application live handler invocation | `ApplicationEngineHostService` | Reuse / Extend | It already invokes app worker handlers | No need for a second worker RPC owner |
| Application startup reconciliation hook | application worker `lifecycle.onStart` + `runtimeControl` | Reuse / Extend | Already the right app-owned catch-up boundary, but it must enumerate all relevant bindings rather than active-only bindings | No platform retry journal needed for artifact flow |
| Binding selection for artifact catch-up | `ApplicationRunBindingStore.listBindings(...)` plus app-owned terminal catch-up completion state | Reuse / Extend | `listBindings(...)` already returns all statuses, while `listNonterminalBindings(...)` is intentionally narrower and unsafe for artifact catch-up | No new platform replay owner is needed; the app just needs the correct selector |
| File-change telemetry | `RunFileChangeService` | Reuse / Narrow | Still useful for touched-file telemetry | Must not remain the artifact truth path |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `services/published-artifacts` | artifact persistence, identity, revision snapshots, event emission, query shapes | DS-PA-001, DS-PA-004 | publication + query owners | Create New | New authoritative artifact subsystem |
| runtime-specific tool surfaces | native/Codex/Claude exposure | DS-PA-001 | publication owner | Extend | Thin adapters only |
| `application-orchestration/services` | bound-run live artifact relay + runtime-control artifact reads | DS-PA-002, DS-PA-004 | relay owner + app read boundary | Extend | Artifact leaves application journal path |
| application framework contracts / engine runtime | app artifact handler surface + runtime-control methods | DS-PA-002, DS-PA-003 | app relay + app reconciliation | Extend | Needs clean separation from lifecycle journals |
| app-specific backends (`brief-studio`, `socratic-math-teacher`) | artifact projection + reconciliation by revisionId | DS-PA-003 | app business owners | Extend | App semantics stay app-owned |
| `services/run-file-changes` | touched-file telemetry only | DS-PA-005 | file-change owner | Reuse / Narrow | No artifact semantics |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/services/published-artifacts/published-artifact-tool-contract.ts` | published-artifacts | shared contract owner | validate/normalize `{ path, description? }` | one runtime-wide tool contract | Yes |
| `src/services/published-artifacts/published-artifact-publication-service.ts` | published-artifacts | governing publication owner | validate request, persist snapshot/summary/revision, emit event | one publication transaction owner | Yes |
| `src/services/published-artifacts/published-artifact-snapshot-store.ts` | published-artifacts | snapshot owner | persist/read immutable revision content | one storage concern | Yes |
| `src/services/published-artifacts/published-artifact-projection-store.ts` | published-artifacts | manifest owner | persist latest artifact summaries + revision metadata | one storage concern | Yes |
| `src/run-history/services/published-artifact-projection-service.ts` | run-history / artifact query | query owner | list published artifacts and read revision content | one read boundary | Yes |
| `src/application-orchestration/services/application-published-artifact-relay-service.ts` | application orchestration | live relay owner | relay bound-run `ARTIFACT_PERSISTED` events into app artifact handlers | one non-durable relay policy owner | Yes |
| `autobyteus-application-sdk-contracts/src/index.ts` | application framework contracts | shared contract owner | artifact handler event type + runtime-control artifact reads | shared app-facing contract file | Yes |
| `src/application-engine/runtime/protocol.ts` + `worker/application-worker-runtime.ts` | application engine | worker RPC owner | invoke artifact handler + expose runtime-control artifact actions | protocol + worker belong together | Yes |
| `applications/brief-studio/backend-src/services/*` | Brief Studio | app reconcile/project owner | derive brief semantics from producer + path + revision text, and keep terminal bindings in catch-up scope until complete | app business concern | Yes |
| `applications/socratic-math-teacher/backend-src/services/*` | Socratic | app reconcile/project owner | derive lesson semantics from path + revision text, and keep terminal bindings in catch-up scope until complete | app business concern | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| published artifact summary + revision metadata | `published-artifact-types.ts` | published-artifacts | shared by publication, query, relay, and application runtime control | Yes | Yes | a clone of old payload fields |
| simple publish tool input parsing | `published-artifact-tool-contract.ts` | published-artifacts | one contract across runtimes | Yes | Yes | runtime-specific parser copies |
| application published-artifact callback payload | `application-sdk-contracts` artifact event type | application framework | relay + app handlers need one meaning | Yes | Yes | a journal envelope clone |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `PublishArtifactToolInput` | Yes | Yes | Low | Keep only `path` + optional `description` |
| `PublishedArtifactSummary` + `PublishedArtifactRevision` | Yes | Yes | Low | Keep latest-summary and immutable-revision split |
| `ApplicationPublishedArtifactEvent` | Yes | Yes | Low | Keep it revision-scoped and file-based, not journal-scoped |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-tool-contract.ts` | published-artifacts | shared contract owner | runtime-wide simple tool input parsing/validation | one user-facing contract | published artifact types |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts` | published-artifacts | governing command owner | execute one publish operation and emit `ARTIFACT_PERSISTED` | one publication owner | all shared types |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-snapshot-store.ts` | published-artifacts | snapshot owner | persist/read immutable revision bytes | one storage owner | revision type |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-projection-store.ts` | published-artifacts | manifest owner | persist latest summaries + revision metadata | one storage owner | summary/revision types |
| `autobyteus-server-ts/src/run-history/services/published-artifact-projection-service.ts` | run-history / artifact query | authoritative read owner | run-scoped artifact list/read methods | one query boundary | summary/revision/query types |
| `autobyteus-server-ts/src/application-orchestration/services/application-published-artifact-relay-service.ts` | application orchestration | live relay owner | relay bound-run artifact events directly to app artifact handlers | one live relay owner | app artifact event type |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | application orchestration | app runtime-control boundary | expose published-artifact list/read runtime-control methods | one host boundary | summary/revision query types |
| `autobyteus-server-ts/src/application-engine/runtime/protocol.ts` | application engine | worker RPC contract owner | artifact handler invocation protocol + runtime-control actions | one engine contract file | app artifact event type |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | application engine | worker runtime owner | call application artifact handler + expose runtime-control artifact actions | one worker owner | protocol + app contracts |
| `applications/brief-studio/backend-src/services/brief-artifact-reconciliation-service.ts` | Brief Studio | app reconcile owner | reconcile/project brief artifacts by `revisionId` and record terminal-binding catch-up completion | one app concern | app artifact event type |
| `applications/socratic-math-teacher/backend-src/services/lesson-artifact-reconciliation-service.ts` | Socratic | app reconcile owner | reconcile/project lesson artifacts by `revisionId` and record terminal-binding catch-up completion | one app concern | app artifact event type |

## Ownership Boundaries

The key authoritative boundary is the **published-artifact publication service**. All runtimes must publish through it. No runtime adapter, application service, or file-change service may create published-artifact persistence records directly.

A second authoritative boundary exists for **published-artifact queries**. All in-scope artifact readers—application runtime control and application reconciliation owners—must read through the published-artifact projection service instead of inspecting run file changes or raw snapshot folders. Any future published-artifact web/API surface must also use this boundary, but it is out of scope for this ticket.

For application-bound runs, a third authoritative boundary exists for **live application artifact relay**. That boundary owns only live callback delivery. It is not allowed to redefine publish success, create a second durability contract, or rebuild artifact truth in application-journal state.

Application-side eventual consistency belongs to the **application itself**. Apps must reconcile from runtime-control published-artifact queries, persist their own processed `revisionId` state or equivalent idempotent keying, and keep terminated/orphaned bindings in reconciliation scope until an app-owned checkpoint proves that no unprojected revisions remain for that binding.

The run-file-change subsystem remains intact but encapsulated behind its own telemetry boundary. Artifact consumers must not bypass the new query owner and infer artifacts from `FILE_CHANGE_UPDATED` or `file_changes.json`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `PublishedArtifactPublicationService.publishForRun(...)` | path validation, snapshot copy, manifest upsert, local event emission | native tool, Codex adapter, Claude adapter | runtime-specific code writing manifest/snapshots directly or appending app artifacts directly | expand this service, not the runtime adapter |
| `PublishedArtifactProjectionService` | manifest reads, revision reads, active/historical run resolution | application runtime control, app reconciliation, future explicit consumers | reading `published_artifacts.json` or snapshot files directly from callers | add explicit query/read methods here |
| `ApplicationPublishedArtifactRelayService` | binding lookup, live handler invocation, relay diagnostics | application-bound run observation only | tool adapters or app projectors invoking worker handlers ad hoc from multiple places | extend this service, not runtime adapters or app projectors |
| application-specific reconciliation owner | runtime-control artifact list/read + app DB idempotent projection + terminal-binding completion checkpoint | app `onStart` / app-owned reconcile triggers | platform owning app business replay state or app code using active-only binding selectors | strengthen app reconcile service, not platform relay |
| `RunFileChangeService` | file-change telemetry only | file-change consumers only | artifact UI or app projectors treating file changes as artifacts | create/extend published-artifact query/read path instead |

## Dependency Rules

- Runtime-specific tool adapters may depend on the shared tool-contract parser and the publication service. They must not depend directly on application-journal ingress or app projectors.
- The publication service may depend on snapshot/projection stores, workspace/path helpers, and active run lookup.
- The publication service must emit only `ARTIFACT_PERSISTED` for published-artifact transport.
- `ApplicationPublishedArtifactRelayService` may depend on run/binding lookup, engine host, and the published-artifact event payload. It must not persist artifact truth or gate publish success.
- Application reconciliation owners may depend on runtime control plus app DB/repositories. They must not depend on raw artifact snapshot folders or run-file-change stores.
- Application reconciliation owners must not scope artifact catch-up to active/nonterminal bindings only; they must use all relevant bindings or an equivalent selector that keeps terminated/orphaned bindings until catch-up is complete.
- `RunFileChangeService` must not emit `ARTIFACT_PERSISTED` and must not synthesize published-artifact semantics from generic file changes.
- The existing frontend `Artifacts` tab and related web file-viewing behavior must remain on `runFileChangesStore` in this ticket; do not wire published-artifact queries/live events into the current web UI.
- App projectors must derive app semantics from producer + published path conventions and read revision content through runtime control; they must not depend on removed fields like `artifactType` or `artifactRef`.
- Application execution journals remain for lifecycle events only. Artifact handling must not append into that journal under a new wrapper.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `publish_artifact` tool | runtime artifact publication | publish one file artifact | `{ path: string, description?: string | null }` | Reject extra fields |
| `PublishedArtifactPublicationService.publishForRun` | runtime artifact publication | execute one publish command | `{ runId: string, path: string, description?: string | null }` | Requires active run + durable memory dir |
| `ApplicationRuntimeControl.listRunBindings` | application runtime control | enumerate bindings eligible for artifact catch-up | optional status filter; for artifact catch-up use no status filter or an equivalent selector that still includes terminal bindings until catch-up completes | Do not narrow missed-delivery recovery to active-only bindings |
| `getRunPublishedArtifacts(runId)` | published artifact query | list latest artifact summaries for one run | `runId` | Consumed by application runtime control in this ticket; future explicit consumers may reuse it later |
| `getPublishedArtifactRevisionText({ runId, revisionId })` | published artifact query | read text content for one persisted revision | compound `{ runId, revisionId }` | Apps read exact published content through this boundary |
| `ApplicationPublishedArtifactRelayService.relayIfBound(...)` | application live artifact relay | invoke bound application artifact handler with one published artifact event | `{ runId, revisionId }` plus resolved producer/binding context | Non-blocking best-effort only |
| `ApplicationRuntimeControl.getRunPublishedArtifacts` / `getPublishedArtifactRevisionText` | application runtime control | let app backends list published artifact summaries and read persisted revision text | explicit `runId` and compound `{ runId, revisionId }` | Replaces inline-body artifact payload dependence; artifact catch-up must pair this with `listRunBindings()` over all relevant statuses |
| `ApplicationBackendDefinition.artifactHandlers.persisted` | application framework | handle one live published-artifact callback | `ApplicationPublishedArtifactEvent` | Separate from lifecycle journal handlers |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `publish_artifact` tool | Yes | Yes | Low | Keep only `path` + optional `description` |
| `publishForRun` | Yes | Yes | Low | Keep run-scoped command explicit |
| artifact reconciliation binding selector | Yes | Yes | Low | Use `listRunBindings()` over all relevant statuses plus app-owned terminal-binding completion state |
| `getRunPublishedArtifacts` | Yes | Yes | Low | Summary list only |
| `getPublishedArtifactRevisionText` | Yes | Yes | Low | Use `runId + revisionId`, not path-only |
| live app artifact handler | Yes | Yes | Low | Keep it revision-scoped and separate from journal lifecycle handlers |
| application runtime-control published-artifact reads | Yes | Yes | Low | Keep `runId` and `revisionId` explicit |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| generic touched-file subsystem | `RunFileChangeService` | Yes | Low | Keep as telemetry owner |
| explicit artifact subsystem | `PublishedArtifactPublicationService` / `PublishedArtifactProjectionService` | Yes | Low | Use “published artifact” consistently to distinguish it from file changes |
| app live relay helper | `ApplicationPublishedArtifactRelayService` | Yes | Low | Makes the non-durable app callback role explicit |
| app catch-up logic | `*ArtifactReconciliationService` | Yes | Low | Keep reconciliation clearly app-owned and terminal-binding-safe |
| revision identity | `revisionId` | Yes | Low | Do not overload path or `artifactId` with event-specific content identity |

## Applied Patterns (If Any)

- **Latest summary + immutable revision pattern** in `services/published-artifacts`: one artifact summary per canonical published path, plus one immutable revision per publish operation. This allows latest-list UX and exact event-specific reads without reintroducing agent-facing artifact keys.
- **Thin runtime adapters** for Codex/Claude/native AutoByteus: each runtime exposes the same contract but delegates immediately to the shared publication owner.
- **Best-effort live relay + app-owned reconciliation** for application-bound runs: the platform gives live callbacks for responsiveness, while applications own catch-up correctness from durable artifact reads.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/published-artifacts/` | Folder | published-artifacts subsystem | core artifact publication + persistence logic | New authoritative artifact subsystem | runtime-specific tool wrappers or app-specific rules |
| `autobyteus-server-ts/src/agent-tools/published-artifacts/` | Folder | native tool entrypoints | native AutoByteus tool registration + shared input contract | Aligns with existing startup tool-loader groups | application-orchestration payload validation |
| `autobyteus-server-ts/src/agent-execution/backends/codex/published-artifacts/` | Folder | Codex adapter | Codex dynamic tool registration | Runtime-specific exposure only | artifact persistence logic |
| `autobyteus-server-ts/src/agent-execution/backends/claude/published-artifacts/` | Folder | Claude adapter | Claude tool definition / handler / MCP server builder | Runtime-specific exposure only | artifact persistence logic |
| `autobyteus-server-ts/src/run-history/services/published-artifact-projection-service.ts` | File | run-history query boundary | run-id-based artifact list/read owner | Same layer as other run-history readers | direct runtime tool code |
| `autobyteus-server-ts/src/application-orchestration/services/application-published-artifact-relay-service.ts` | File | application artifact relay | direct live artifact callback into bound applications | App-specific off-spine concern with no durability contract | artifact snapshot persistence or app DB rules |
| `applications/brief-studio/backend-src/services/brief-artifact-reconciliation-service.ts` | File | app reconcile owner | reconcile/project brief artifact revisions and manage terminal-binding catch-up completion | Brief Studio semantics are app-owned | generic artifact publication logic |
| `applications/socratic-math-teacher/backend-src/services/lesson-artifact-reconciliation-service.ts` | File | app reconcile owner | reconcile/project lesson artifact revisions and manage terminal-binding catch-up completion | Socratic semantics are app-owned | generic artifact publication logic |

Rules:
- If the design has meaningful structural depth, usually reflect it in folders rather than flattening everything into one mixed directory.
- Do not place transport entrypoints, main-line domain/control nodes, persistence, adapters, and unrelated off-spine concerns in one flat folder when that hides ownership or structural depth.
- A compact layout is acceptable when it remains easy to read for the scope. If you keep it flatter, state why that is the clearer tradeoff.
- Folder boundaries should make ownership and structural depth easier to read, not hide them.
- Shared-layer, feature-oriented, runtime-oriented, and hybrid projections can all be valid when they make the intended ownership and flow easier to understand.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/services/published-artifacts/` | Main-Line Domain-Control + Persistence-Provider | Yes | Low | Core publication owner plus its internal stores belong together |
| `src/agent-tools/published-artifacts/` | Transport | Yes | Low | Native tool exposure only |
| `src/agent-execution/backends/*/published-artifacts/` | Transport | Yes | Low | Runtime-specific adapters stay thin |
| `src/application-orchestration/services/` additions | Off-Spine Concern | Yes | Low | Relay owner + runtime-control extensions remain application-specific |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| repeated publish of the same path | Publish `reports/final.md` twice -> stable `artifactId` from canonical path, new `revisionId` for each publish, one latest summary row, both apps read exact revision content | Overwrite one current file reference and make apps read “whatever is on disk now” | Same path reuse is normal; revision identity prevents racey projections |
| file changes vs artifacts | `write_file reports/draft.md` emits `FILE_CHANGE_UPDATED`; later explicit `publish_artifact({ path: 'reports/final.md' })` emits `ARTIFACT_PERSISTED` | Treat every `edit_file` or generated output as an artifact automatically | This is the core product distinction the user asked for |
| application live relay | Bound run publishes `brief-studio/final-brief.md` -> artifact is durably persisted -> `ARTIFACT_PERSISTED` emits -> relay invokes Brief Studio artifact handler if the app is live | Persist artifact and then append a second artifact record into the application execution journal | Shows the new direct-consumption boundary |
| missed live relay | Bound run publishes while app worker is restarting -> run terminates before app restart finishes -> Brief Studio `onStart` lists all bindings, including terminated bindings not yet marked catch-up complete -> sees the missing `revisionId` -> projects it exactly once -> marks that terminal binding catch-up complete | Publish success depends on application journal retry or active-only binding scans | Shows why reconciliation must stay app-owned and terminal-binding-safe |
| Brief Studio path rules | Researcher publishes only `brief-studio/research.md` or `brief-studio/research-blocker.md`; writer publishes only `brief-studio/brief-draft.md`, `brief-studio/final-brief.md`, or `brief-studio/brief-blocker.md` | Let agents improvise arbitrary file names and then guess semantics later | Brief Studio needs deterministic app-owned semantics without `artifactType` |
| Socratic path rules | Tutor publishes `socratic-math/lesson-response.md` for normal turns and `socratic-math/lesson-hint.md` for hint turns | Keep a generic `latest-tutor-turn.md` and re-infer hint-vs-response through old artifact metadata | Socratic needs deterministic response-kind derivation from file publication alone |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old rich `publish_artifact` payload and auto-convert to the new model | Easier migration for existing apps and prompts | Rejected | Remove old fields completely; update all callers and app projectors in this ticket |
| Keep `ARTIFACT_UPDATED` alongside `ARTIFACT_PERSISTED` | Existing enums/protocol already have both names | Rejected | Collapse authoritative artifact transport to `ARTIFACT_PERSISTED` only |
| Repurpose the current frontend `Artifacts` tab to published artifacts in this ticket | Might align naming immediately | Rejected | Keep the current tab on `runFileChangesStore`; any published-artifact web UI must come from a separate design/ticket |
| Keep artifact business handling on the application execution journal | Reuses existing at-least-once dispatch infrastructure | Rejected | Move artifacts to direct shared-boundary consumption plus app-owned reconciliation |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

1. **Runtime transport layer**: native tool registry, Codex dynamic tool, Claude tool definition.
2. **Published-artifact main-line layer**: publication service.
3. **Published-artifact persistence layer**: snapshot store + manifest store.
4. **Read/query layer**: projection service + application runtime-control entrypoints.
5. **Application live-consumption layer**: relay service + app artifact handlers.
6. **Application catch-up layer**: app-owned reconciliation from runtime-control published-artifact reads.
7. **Separate telemetry layer**: run-file-change service plus the unchanged legacy web changed-files tab.

## Migration / Refactor Sequence

1. **Create the published-artifacts subsystem** with shared types, path identity, snapshot store, projection store, and publication service.
2. **Move native tool ownership** out of application orchestration into `agent-tools/published-artifacts`, using the new simple contract.
3. **Add Codex and Claude adapters** so the same tool is exposed across all runtimes.
4. **Change runtime artifact event semantics**:
   - publication service emits only `ARTIFACT_PERSISTED`
   - remove `ARTIFACT_UPDATED` from server/client enums and handlers
   - remove Codex file-change synthesis of artifact events
5. **Add published-artifact query surfaces for in-scope consumers**:
   - run-history projection service
   - application runtime-control list/read methods
   - no current web/UI hydration surface in this ticket
6. **Redesign the application framework artifact path**:
   - remove `ARTIFACT` from application execution journal semantics
   - add direct application artifact handler contract
   - add live relay service from bound runs into app artifact handlers
7. **Keep lifecycle journals only for lifecycle events** and remove artifact append through `ApplicationExecutionEventIngressService`.
8. **Redesign Brief Studio**:
   - update agent instructions to fixed published-path conventions
   - migrate projection logic to producer+path derivation
   - read persisted revision text via runtime control
   - reconcile/project by `revisionId`
   - keep terminated/orphaned bindings in catch-up scope until terminal binding catch-up is complete
   - migrate DB schema/repo/frontend off old artifact fields
9. **Redesign Socratic Math Teacher**:
   - update tutor instructions/prompt conventions to published file paths
   - derive lesson response vs hint from path convention
   - read persisted revision text via runtime control
   - reconcile/project by `revisionId`
   - keep terminated/orphaned bindings in catch-up scope until terminal binding catch-up is complete
10. **Explicitly preserve the current frontend artifact boundary**:
   - keep the existing `Artifacts` tab on `runFileChangesStore`
   - do not add published-artifact hydration, viewer routing, or source-of-truth rewiring in this ticket
   - document that any published-artifact web UI requires a separate design
11. **Delete legacy publication code and docs assumptions**:
   - old app payload validators/ref validators/tool owner
   - artifact journal append path
   - docs that describe artifact events as compatibility noise or file changes as the artifact source of truth

## Key Tradeoffs

- **Immutable revisions add storage cost but solve correctness.** Without revision snapshots, repeated publishes of the same path would make app projections and artifact previews race on current file state.
- **Best-effort live app relay is simpler than artifact-specific journal retry.** The cost is that apps must own reconciliation explicitly.
- **App-owned reconciliation is more work for Brief Studio and Socratic, but it keeps artifact truth in one shared place.** The platform stops pretending to know each app’s business durability model.
- **Deferring published-artifact web UI keeps semantics split temporarily but avoids a breaking frontend change.** This ticket fixes artifact truth at the backend/app boundary first; a later separate UI design can introduce a dedicated published-artifact surface deliberately.
- **App-specific path conventions push semantics into apps instead of the generic tool.** This is the right tradeoff because the tool stays simple while apps still keep workflow meaning.

## Risks

- Brief Studio path conventions must be explicit enough that researcher/writer outputs are unambiguous without reviving `artifactType` under a different name.
- Socratic hint-vs-response derivation must stay deterministic when old metadata is removed.
- Application reconciliation must be explicit enough that a missed live artifact callback does not leave app state silently stale, especially after the producing run has already terminated or become orphaned.
- Removing `ARTIFACT_UPDATED` requires coordinated enum/protocol/test cleanup across server and web.
- Persisting snapshots assumes run memory directories are available for all supported runs; publication must fail clearly if persistence cannot be guaranteed.

## Guidance For Implementation

- Treat the published-artifact subsystem as the only artifact owner.
- Do not let runtime adapters, app relays, or app projectors grow their own artifact validation/persistence logic.
- Remove legacy fields and event paths early so later code does not accidentally dual-write.
- Keep live application artifact relay explicitly best-effort; do not let journal or retry semantics creep back into artifact truth.
- Make application reconciliation visible and deliberate: apps should reconcile by `revisionId`, not by path-only guessing.
- For artifact catch-up, prefer `listRunBindings()` over all relevant statuses plus an app-owned terminal-binding completion checkpoint; do not use active-only selectors such as `listNonterminalBindings()` as the sole recovery path.
- Keep file-change telemetry working, but explicitly separate it in names, docs, and consumers.
- Do not repurpose the current frontend `Artifacts` tab; it remains the changed-files view until a separate published-artifact UI design exists.
- When redesigning apps, prefer fixed path conventions plus persisted revision reads over any new semantic payload field.
