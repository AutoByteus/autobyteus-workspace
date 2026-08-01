# Design Spec

## Current-State Read

Codex App Server and Claude Agent SDK own their continuation state through provider thread/session identities stored in run metadata. AutoByteus separately observes accepted user commands and normalized runtime events through `AgentRunMemoryRecorder`.

That recorder currently drives two parallel representations through `RuntimeMemoryEventAccumulator`, `RuntimeToolTraceSequencer`, and `RunMemoryWriter`:

1. canonical normalized `RawTraceItem` records, used for all-runtime normal run projection, active event-monitor paging, tool lifecycle reconstruction, provider-compaction archive rotation, and work evidence; and
2. an external `WorkingContext` transcript snapshot, reconstructed and rewritten only so the external writer can maintain the duplicate. The generic Memory Inspector can display this file, but provider continuation and normal run/event-monitor projection do not read it.

The current writer therefore mixes two subjects with different authority. It owns valid external raw persistence/sequence/archive operations and also imitates native AutoByteus WorkingContext ownership. The same snapshot filename is authoritative for native AutoByteus, so removal cannot happen inside the generic file store or through filename-only deletion.

Investigation also found an exact current cleanup boundary: standalone run metadata and recursive team-member metadata carry `RuntimeKind`; `AgentMemoryLayout` and `AgentMemoryLocationService` derive supported paths. Missing/unmatched metadata, imports, and historical task-agent directories do not all have authoritative persisted runtime identity and must remain untouched. See `investigation-notes.md`, BEH-001 through BEH-006, and the retained inventory.

CRR-001 / CR-001 later proved that an eligible non-`ENOENT` unlink failure retains the old file while startup continues, after which the unchanged generic Memory Inspector can still display it. The user explicitly accepts that rare stale optional display and delayed disk reclamation. The governing guarantees are no future external snapshot writes, healthy application/provider continuation, preserved raw recording/projection, truthful cleanup failure reporting, and safe retry/manual removal—not unconditional inspector absence after a failed physical delete.

### Decision Provenance

The cleanup-failure consequence was not approved at the moment the user said, “I'm not sure. That's why I want to discuss with you.” After the simplicity-first option and its physical-file consequence were explained, the user made the later final decision: **“yes. lets do it. but mostly it will be successful for removing. but i agree with your best approach”**. SR-004 records this complete chronology in response to CRR-002. It does not alter DS-006, DS-011, or any target implementation behavior from SR-003.

## Intended Change

Make the Codex/Claude recorder raw-trace-only:

- retain provider thread/session continuation unchanged;
- retain accepted/runtime-event normalization, queue ordering, reasoning/tool ordering, raw sequence hydration, tool lifecycle hydration, provider-boundary deduplication, and active-to-archive rotation;
- replace the mixed `RunMemoryWriter` with an explicitly named external-runtime raw memory writer that has no `WorkingContext`, `Message`, agent-ID, snapshot read, snapshot update, or snapshot write responsibility;
- remove the parallel snapshot update types and all accumulator/sequencer coordination that exists only to build that snapshot;
- use an explicit current external-runtime predicate for Codex and Claude rather than the future-open condition `runtimeKind !== AUTOBYTEUS`;
- register an idempotent startup cleanup that deletes only exact current-metadata-classified Codex/Claude standalone/team-member snapshot files and reports failures/skips without blocking startup;
- leave native AutoByteus, imports, unclassified history, normal projection, and the existing runtime-agnostic Memory Inspector contract unchanged. Successful file removal naturally yields `hasWorkingContext: false`/`workingContext: null`; a failed unlink may leave the stale snapshot visible until retry, while Raw Traces and application behavior remain unaffected.
- do not add runtime-qualified read filters, migration-status checks, or UI branches solely to hide a file whose deletion failure was already reported.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001; AC-001 | Create or restore a Codex/Claude run | Provider thread/session restoration; investigation production-path table | Preserve provider-owned continuation; never add local WorkingContext input | Run manager → runtime bootstrap → Codex thread resume / Claude session bootstrap; DS-001 |
| BEH-002 | System | REQ-002, REQ-005; AC-002, AC-003, AC-006 | Accepted user message or normalized assistant/reasoning/tool event | Recorder queue → accumulator/sequencer → mixed writer; source log | Preserve raw semantics and lifecycle hydration; remove parallel snapshot update | Recorder → accumulator/sequencer → `ExternalRuntimeMemoryWriter.appendRawTrace` → `RunMemoryFileStore`; DS-002, DS-007, DS-008 |
| BEH-003 | User | REQ-003; AC-004 | Open/reload normal run view or request earlier active events | Local projection explicitly requests raw only for every current runtime | Preserve all-runtime raw-backed conversation/activity projection and paging | `AgentRunViewProjectionService` → `LocalMemoryRunViewProjectionProvider` → active raw read → replay/event-monitor projection; DS-003 |
| BEH-004 | System/User | REQ-004, REQ-005, REQ-010, REQ-011, REQ-012; AC-005, AC-006, AC-010, AC-012, AC-013 | External recording and generic memory inspection | Mixed writer reads/writes duplicate snapshot; Memory Inspector generically reads a present file; CR-MP-001 proved failed cleanup can retain it | Remove Codex/Claude production/read-maintenance from the runtime. Successful cleanup yields inspector absence; reported failed cleanup may leave stale optional display until retry. Preserve Raw Traces and native/generic inspection | Raw-only DS-002 plus unchanged file-backed read DS-006 and accepted failure composition DS-011 |
| BEH-005 | System | REQ-006; AC-007 | Completed provider compaction boundary | Boundary recorder uses raw correlation state and archive store only | Preserve deduplication, retry, rotation, manifest, and active boundary marker | Accumulator → boundary recorder → external writer → raw archive manager; DS-004, DS-009 |
| BEH-006 | Operational | REQ-007, REQ-008, REQ-012; AC-008, AC-009, AC-013 | Registered startup app-data cleanup | IR-001 implements exact cleanup; non-`ENOENT` unlink failure reports and retains the file while startup continues | Preserve exact cleanup, exclusions, reporting, retry, and availability; no defensive read/UI response is required for retained data | Startup runner → cleanup migration → exact unlink/result ledger; DS-005, DS-010, DS-011 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| [`persisted-snapshot-inventory.md`](./persisted-snapshot-inventory.md) | Aggregate, content-safe local corpus evidence | REQ-007, REQ-008, REQ-012; AC-008, AC-009, AC-013 | Justifies disposal value, exact runtime classification, and native/import/unclassified exclusions | Complete / `N/A` evidentiary supplement |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`, `Refactor`, `Cleanup`, and `Performance`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, and `Shared Structure Looseness`
- Refactor needed now: `Yes`
- Evidence: `RunMemoryWriter` simultaneously owns external raw evidence and a derived `WorkingContext`; every ordinary event carries a raw trace plus an overlapping snapshot update; reasoning maintains extra per-turn state only for the duplicate. Provider continuation and normal projection use neither that state nor that file. The classified duplicate occupies approximately 3.18 GiB locally.
- Design response: Contract the external recording model to one authoritative activity representation, name its persistence owner explicitly, and isolate one-time disposal in the existing operational migration lifecycle above the generic store.
- Refactor rationale: Merely suppressing the final file write would leave duplicate types/state, an obsolete read path, and ambiguous writer ownership. Removing those together is the smallest coherent target.
- Intentional deferrals and residual risk: Metadata-unclassifiable historical snapshots remain as inert storage. Imported snapshots and task-agent history without stable runtime identity are out of scope. A rare reported unlink failure can also leave an eligible stale snapshot visible in the generic inspector until retry/manual removal. These residuals do not leave provider or raw runtime behavior on the old path and are explicitly accepted.

## Terminology

- **External runtime:** For this ticket, exactly `RuntimeKind.CODEX_APP_SERVER` or `RuntimeKind.CLAUDE_AGENT_SDK`.
- **External snapshot:** `working_context_snapshot.json` created by the external recorder as a derived transcript. It is not provider continuation state.
- **Native snapshot:** The same filename owned by native AutoByteus memory and used as authoritative WorkingContext state.
- **External raw corpus:** Active raw traces plus complete archived raw-trace segments. It owns external activity evidence and lifecycle reconstruction.
- **Eligible cleanup location:** An exact supported standalone or current recursive team-member location whose authoritative metadata identifies one of the two approved external runtime kinds.

## Design Reading Order

This design follows the template order: verified behavior and data decision first; then spines and ownership; then interfaces, subsystem/file allocation, removal sequence, and implementation constraints.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove external **recorder/runtime** snapshot reads and writes in the same change. Preserve the separate generic Memory Inspector's physical-file read contract.
- Remove `RuntimeMemorySnapshotUpdate`, `RuntimeMemoryWriteOperation`, `write(...)`, `writeSnapshotUpdate(...)`, `writeWorkingContextSnapshot(...)`, `workingContext`, `agentId`, and snapshot load/apply/persist methods from the external path.
- Remove `pendingReasoningByTurn`, snapshot-only reasoning consumption, and turn-completion snapshot writes. Preserve open reasoning-segment flushes because those enforce raw ordering.
- Do not keep aliases/re-export shims for `RunMemoryWriter`; update all production and test callers to `ExternalRuntimeMemoryWriter`.
- Do not add a flag, dual write, old-file fallback, or raw-to-WorkingContext reconstruction.
- Do not remove or weaken snapshot APIs in `autobyteus-ts/RunMemoryFileStore`; native AutoByteus still owns and uses them.
- Do not treat a stale generic inspector read after failed physical deletion as backward-compatible runtime behavior: no runtime owner loads, updates, or depends on that file.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: External `working_context_snapshot.json` files under local `agents/<run-id>/` and recursive `agent_teams/<root-team-id>/.../<member-run-id>/` locations. The probe classified 1,703 Codex files (~3.18 GiB) and 30 Claude files (~2.63 MiB).
- Relevant code-model, serialization, semantic, or physical-store change: Current external runtime code stops loading, constructing, and serializing `WorkingContext`. The file is removed only at exact eligible locations. Native serialization is unchanged.
- Normal reader/writer behavior and representative evidence: The mixed external writer is the producer/maintenance reader. Provider restore reads platform IDs; normal all-runtime run projection reads active raw traces with WorkingContext disabled; generic memory inspection optionally reads the file.
- Required semantics and invariants under direct use: Preserve provider continuation, raw trace identity/order/content, lifecycle reconstruction from active plus complete archives, provider-boundary rotation, memory metadata, artifacts, native WorkingContext, and generic file-backed inspection. New/successfully cleaned external runs have no snapshot; a failed delete may leave stale inspectable data without making it authoritative.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Use authoritative runtime metadata and layout-derived paths; never trust stored arbitrary `memoryDir` for deletion; do not follow directory symlinks; unlink only the target snapshot; do not log snapshot content; exclude imports and unmapped locations. Cleanup is best-effort and restart-safe.
- Decision: `Discard or Rebuild`
- Decision rationale: Provider sessions and the raw corpus preserve every approved continuation/activity outcome. Transforming or backing up a derived transcript would add I/O and retain private duplicate content without product benefit. Exact unlink has no application downtime beyond normal startup work. A partial failure is reported and recoverable by migration retry/manual removal; optional stale inspector visibility is accepted because no runtime owner consumes or updates the file.
- Acceptance criteria or design constraints supported by this decision: REQ-007, REQ-008, REQ-012; AC-008, AC-009, AC-013.

### Cleanup Lifecycle (Disposal, Not Schema Transformation)

The app-data migration framework is reused as a one-time operational cleanup ledger even though the data decision is `Discard or Rebuild`, not `Migration Required`.

- Migration ID: `20260731_remove_external_runtime_working_context_snapshots`
- Trigger: registered `requiredOnStartup = true` definition.
- Ordering: immediately after `TeamRunMetadataMemberTreeMigration` in the registry so canonical recursive team metadata is available.
- Classification inputs: current standalone run metadata and current recursive team-member metadata.
- Path inputs: `AgentMemoryLayout` and `AgentMemoryLocationService`; the cleanup ignores metadata-stored arbitrary `memoryDir` values for deletion.
- Physical inventory: inspect only snapshot files under local `agents` and `agent_teams` roots, without following symlink directories; `imports` is never traversed.
- Action: unlink one snapshot when its resolved absolute path equals an eligible metadata-derived path. `ENOENT` is `SKIPPED`; a successful unlink is `MIGRATED`; metadata/traversal/unlink problems are `FAILED`; present native/unclassified files are `SKIPPED`.
- Completion: standard app-data migration record and log. Any failures produce `SUCCEEDED_WITH_WARNINGS` when other items were processed, otherwise `FAILED`; startup continues under existing runner semantics. Both statuses remain manually retryable as supported by the runner.
- Backup/rollback: none. The approved outcome is disposal and authoritative data remains in provider/raw sources.
- Read/UI consequence: the migration does not publish status into memory reads. A retained failed item remains a normal physical snapshot to the generic inspector until retry/manual removal. This is the explicit simplicity tradeoff, not a compatibility path in external runtime code.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Run create/restore command | Provider thread/session resumed | Runtime-specific bootstrap/thread-session manager | Proves snapshot removal is independent of continuation |
| DS-002 | Return-Event | BEH-002, BEH-004 | Accepted command or runtime event | Raw trace appended | `AgentRunMemoryRecorder` with accumulator/sequencer and external writer | Main changed recording flow |
| DS-003 | Primary End-to-End | BEH-003 | Run view/event-monitor request | Conversation/activity page | `LocalMemoryRunViewProjectionProvider` | Proves all-runtime UI authority remains raw traces |
| DS-004 | Return-Event | BEH-005 | Provider compaction status event | Boundary marker and optional complete archive | `ProviderCompactionBoundaryRecorder` | Preserves archive/deduplication behavior |
| DS-005 | Primary End-to-End | BEH-006 | Server startup pending migrations | Cleanup result ledger/log | `RemoveExternalRuntimeWorkingContextSnapshotsMigration` | Owns safe one-time disposal |
| DS-006 | Primary End-to-End | BEH-004 | Memory Inspector query | File-backed WorkingContext result plus independently requested raws | `AgentMemoryService` / existing GraphQL/UI projection | Preserves the general inspector contract: absent after success, stale-visible after failed unlink |
| DS-007 | Bounded Local | BEH-002 | Event arrives at per-run queue | Accumulator mutation completes | `AgentRunMemoryRecorder` | Serializes event persistence per run |
| DS-008 | Bounded Local | BEH-002 | Segment/tool lifecycle observation | Ordered raw trace(s) | Accumulator and tool sequencer | Protects reasoning/tool ordering and restart hydration |
| DS-009 | Bounded Local | BEH-005 | Boundary key parsed | Deduplicated/retried rotation state | Boundary recorder | Protects idempotent archive lifecycle |
| DS-010 | Bounded Local | BEH-006 | Metadata/path inventory | Per-item migrated/skipped/failed result | Cleanup migration | Protects identity-to-path deletion invariant |
| DS-011 | Primary End-to-End | BEH-004, BEH-006 | Eligible unlink failure | Healthy application with reported residual file | Cleanup migration plus unchanged generic inspector | Makes the accepted cross-spine failure lifecycle explicit |

## Primary Execution Spine(s)

- DS-001: `Run create/restore → AgentRunService/manager → runtime restore context → Codex thread manager or Claude bootstrap → provider thread/session`
- DS-003: `Run view/event-monitor query → AgentRunViewProjectionService → LocalMemoryRunViewProjectionProvider → AgentMemoryService active raw read → raw-to-replay projection → frontend`
- DS-005: `ServerRuntime startup → AppDataMigrationRunner.runPending → cleanup definition → metadata/location classification → exact snapshot unlink/skip/fail → migration record/log`
- DS-006: `Memory Inspector query → GraphQL memory resolver → AgentMemoryService → optional file-backed snapshot/raw reads → present snapshot or null + independent raw results → existing UI`
- DS-011: `Eligible external unlink → non-ENOENT failure → FAILED/warning detail + file retained → startup continues → provider/raw paths work → optional inspector may display stale file → operator retry/manual removal`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A stored provider platform ID is restored into the runtime-specific provider client. Local WorkingContext never enters this flow. | run metadata, restore context, provider thread/session | Runtime bootstrap/thread-session manager | metadata validity, provider availability |
| DS-002 | The recorder accepts only the two explicit external kinds, serializes events per run, normalizes them, and directly appends one raw representation. | accepted message/event, trace input, `RawTraceItem` | Recorder plus accumulator/sequencer; writer owns persistence | missing memory directory, error logging, sequence hydration |
| DS-003 | The local projection provider reads active raw traces with other memory types disabled and converts them into replay and event-monitor views for every runtime. | active raw snapshot, replay event, projection | Local projection provider | cursor generation, recent-event policy |
| DS-004 | A normalized provider boundary is correlated against active/archive state, appended once, and rotates settled pre-boundary raws when eligible. | boundary payload/key, marker, archive segment | Boundary recorder | archive manifest integrity, retry |
| DS-005 | Startup cleanup builds exact eligible paths from authoritative metadata, inventories local snapshot files, and deletes only equality-matched external paths while recording every actionable outcome. | runtime metadata, memory location, snapshot path, migration detail | Cleanup migration | path safety, symlinks, privacy-safe logging |
| DS-006 | The existing memory query remains runtime-agnostic and file-backed: successful cleanup/new runs return null/false, retained failed items can still return stale content, and raw traces are independently readable. Native/imported/unclassified behavior is unchanged. | memory availability/view, snapshot-or-null, raws | AgentMemoryService and existing UI | file availability badges, no frontend contract change |
| DS-011 | Cleanup truthfully records an eligible unlink failure and retains the file; startup and provider/raw behavior continue. The generic inspector may display the stale copy until retry/manual removal, which the user accepts. | failed cleanup detail, retained file, healthy runtime, optional stale view | Cleanup migration owns failure; inspector remains generic | operator retry, delayed reclamation |

## Spine Actors / Main-Line Nodes

- Runtime-specific Codex/Claude bootstrap and provider thread/session owner.
- `AgentRunMemoryRecorder` as the external eligibility/queue facade.
- `RuntimeMemoryEventAccumulator` and `RuntimeToolTraceSequencer` as event-to-raw control owners.
- `ExternalRuntimeMemoryWriter` as raw sequence/persistence/archive access owner.
- `RunMemoryFileStore` / raw archive manager as physical raw persistence provider.
- `LocalMemoryRunViewProjectionProvider` as raw-to-UI projection owner.
- `RemoveExternalRuntimeWorkingContextSnapshotsMigration` as cleanup owner.
- Metadata stores, memory location service, and layout as cleanup identity/path providers.
- The existing Memory Inspector remains a generic physical-file reader; it does not own runtime cleanup policy or migration recovery.

## Ownership Map

- **Provider runtime:** continuation/session state and provider-side context compaction.
- **AgentRunMemoryRecorder:** public manager-facing observer, exact external-runtime eligibility, per-run recorder lifecycle, queue serialization, attach/detach.
- **RuntimeMemoryEventAccumulator:** turn/segment state, fallback turn identity, normalization dispatch, and reasoning segment flush ordering; no persisted transcript projection.
- **RuntimeToolTraceSequencer:** tool identity, call-before-result invariant, deduplication, interruption, and lifecycle hydration.
- **ExternalRuntimeMemoryWriter:** raw ID/timestamp/sequence creation, physical raw append, lifecycle index read, and provider-boundary archive access. It owns no native memory concept.
- **ProviderCompactionBoundaryRecorder:** boundary payload parsing, correlation deduplication, retry, and rotation decisions.
- **LocalMemoryRunViewProjectionProvider:** all-runtime active raw selection and raw-to-replay/event-monitor transformation.
- **Cleanup migration:** eligible-set construction, physical snapshot inventory, classification, unlink, and result reporting.
- **Runtime metadata/location/layout owners:** authoritative identity and safe path derivation; they do not decide deletion.
- **Native AutoByteus memory manager/store callers:** native WorkingContext lifecycle. This ticket must not enter or change that owner.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentRunMemoryRecorder` as `AgentRunCommandObserver` | Accumulator/sequencer and external writer | Integrates generic run manager callbacks and serializes per-run work | Provider continuation or WorkingContext construction |
| `AppDataMigrationRunner.runPending` | Cleanup migration definition | Provides startup ordering, ledger, retry, and logs | Runtime identity inference or deletion policy |
| GraphQL memory resolver/converter | `AgentMemoryService` and existing file store | Transports optional memory view/availability | Rebuilding missing external WorkingContext |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `src/agent-memory/store/run-memory-writer.ts` / `RunMemoryWriter` | Name and implementation mix raw evidence with duplicate context | `external-runtime-memory-writer.ts` / `ExternalRuntimeMemoryWriter` | In This Change | No alias/re-export shim |
| Writer `agentId`, `workingContext`, load/apply/persist/snapshot methods | Exist only to maintain duplicate | Direct raw append and existing raw store | In This Change | Remove Message/WorkingContext/path imports |
| `RuntimeMemorySnapshotUpdate` | Parallel content representation | `RuntimeMemoryTraceInput` only | In This Change | Delete union |
| `RuntimeMemoryWriteOperation` and writer `write` | Bundles canonical trace with duplicate update | `appendRawTrace(RuntimeMemoryTraceInput)` | In This Change | Update every caller |
| Accumulator `pendingReasoningByTurn`, consume/flush snapshot methods | Only associates raw reasoning with duplicate assistant snapshot | Existing reasoning raw trace plus segment flush ordering | In This Change | Do not remove `flushOpenReasoningSegments` |
| Tool call/result snapshot payload construction | Duplicate of raw tool traces | Sequencer direct raw append | In This Change | Preserve lifecycle IDs and result/error normalization |
| Existing eligible external snapshot files | Derived duplicates | Provider session + external raw corpus | In This Change | Exact startup cleanup; no backup |
| Tests/docs promising future external WorkingContext persistence | Obsolete contract | Raw-only, successful-cleanup absence, accepted failed-cleanup residual, and native-preservation coverage/docs | In This Change | Keep native/generic snapshot tests |

## Return Or Event Spine(s) (If Applicable)

- DS-002: `AgentRun.postUserMessage acceptance or subscribed AgentRunEvent → per-run recorder queue → accumulator dispatch → reasoning/tool/boundary owner → external writer → raw file`
- DS-004: `COMPACTION_STATUS event → boundary parser → physical correlation lookup → marker append → optional archive rotation → active boundary retained`

Errors stay at their current ownership boundaries: per-run recorder work logs and continues its queue; cleanup produces per-item migration details and standard migration status.

## Bounded Local / Internal Spines (If Applicable)

- **DS-007 / parent `AgentRunMemoryRecorder`:** `enqueue → previous promise settles → current work → catch/log → next work`. This preserves per-run event ordering without putting queue logic in the writer.
- **DS-008 / parent accumulator/sequencer:** `segment start/content/end → flush raw reasoning/text`; and `tool observation → resolve compound (turnId, toolCallId) identity → flush open reasoning → append call → append terminal result`. Snapshot-only reasoning association is removed, not raw ordering.
- **Writer sequence hydration:** `construct → read active raws → read complete archive raws → remember max sequence per turn → next append`. This remains inside the external writer.
- **DS-009 / parent boundary recorder:** `parse key → inspect complete segment/active marker/in-memory seen set → skip, retry, or append/rotate`.
- **DS-010 / parent cleanup migration:** `load metadata → derive eligible/native path sets → inventory local snapshot paths → classify exact path → unlink/skip/fail → summarize`. No runtime content decoder participates.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Exact runtime-kind predicate | DS-002, DS-005 | Recorder and cleanup | Closed Codex/Claude classification | Prevents future runtimes from inheriting behavior | `!== AUTOBYTEUS` silently broadens contract |
| Safe memory layout | DS-005 | Cleanup | Normalize segments and keep paths under roots | Prevents traversal/arbitrary metadata path deletion | Native or unrelated file deletion |
| Metadata topology read | DS-005 | Cleanup | Supply current recursive member identity/runtime | Team layouts are nested | Filename/path guessing |
| Migration ledger/log | DS-005 | Cleanup | Durable status, retry, and actionable item results | Startup cleanup is best-effort | Silent partial deletion or false success |
| Raw archive manager | DS-002, DS-004 | External writer/boundary recorder | Complete segments, manifests, active rewrite | Provider compaction rotates evidence | Coupling cleanup to raw retention |
| Memory availability | DS-006, DS-011 | Inspector | Derive has/no memory from physical files | Preserves one general UI rule for native/imported/unclassified and retained failures | Runtime/migration-specific UI policy and defensive complexity |
| Native snapshot owner | DS-005, DS-006 | Native AutoByteus | Preserve authoritative WorkingContext | Same filename has different semantics | Catastrophic continuation loss |
| Cleanup failure recovery | DS-005, DS-011 | Operator/app-data runner | Report exact failure and allow retry/manual removal | Rare data reclamation failure must not stop application | Coupling provider/raw operation to optional stale data |

## Ownership Boundaries

1. The run manager calls `AgentRunMemoryRecorder`; it does not construct writers or append traces directly.
2. The recorder decides supported external eligibility using an explicit shared runtime-kind predicate. The accumulator/sequencer decide normalized event ordering; neither owns physical files.
3. The external writer is the only external recorder boundary that creates and appends raw items or accesses raw archive lifecycle state. It exposes no WorkingContext operation.
4. `RunMemoryFileStore` remains a generic physical provider. Its snapshot support remains for native consumers and is not evidence that the external writer may use it.
5. Cleanup policy lives only in the app-data migration. Metadata and layout components provide identity/path facts; generic stores do not decide whether a snapshot is disposable.
6. Normal projection remains raw-backed. Memory Inspector remains a generic read-side owner that reflects physical file presence and never recreates the file; it is intentionally unaware of runtime kind and migration status.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRunMemoryRecorder` | state map, queues, attach/detach, accumulator construction | `AgentRunManager`, command observer integration | Manager creates writer or filters with its own runtime rules | Extend recorder eligibility/lifecycle API |
| `ExternalRuntimeMemoryWriter` | sequence hydration, raw item construction, store/archive access | accumulator, sequencer, boundary recorder, test seed paths | Caller writes JSONL or manipulates seq/archive directly | Add a subject-specific writer method |
| `ProviderCompactionBoundaryRecorder` | payload parsing, correlation, retry/rotation decision | accumulator | Accumulator rotates raw files itself | Extend boundary recorder input/result |
| Cleanup migration `execute` | candidate classification, inventory, exact unlink, summary | app-data runner | Runtime writer deletes legacy files on attach; generic file store deletes by kind guess | Add migration-local classification helper |
| `LocalMemoryRunViewProjectionProvider` | active raw selection and replay projection | view projection service | Frontend/provider reads snapshot for normal history | Extend projection provider contract |

## Dependency Rules

- `agent-execution` may depend on the recorder facade, not its accumulator/writer internals.
- Recorder services may depend on the explicit runtime-kind predicate and external writer.
- Accumulator/sequencer/boundary recorder may call only external writer raw/lifecycle methods; they must not import `WorkingContext`, `Message`, snapshot serializers, or snapshot file names.
- External writer may depend on `RuntimeMemoryTraceInput`, `RawTraceItem`, lifecycle index, and `RunMemoryFileStore`; it must not call any WorkingContext snapshot method.
- Cleanup migration may depend on runtime classification, run/team metadata stores, memory location/layout, the snapshot filename constant, and Node filesystem APIs. It must not accept a caller-supplied arbitrary run directory or use metadata `memoryDir` as a deletion target.
- Cleanup may compare normalized absolute paths derived under owned roots. It must not delete from `imports`, follow symlink directories, infer runtime from names, or recurse-delete directories.
- Projection/Memory Inspector dependencies remain unchanged. No runtime-kind, cleanup-ledger, or failure-specific frontend/read branch is added.
- Native memory may continue to use generic snapshot store APIs. External removal must not modify the shared serialized schema or native compaction.
- An eligible unlink failure must retain truthful failure evidence and the file for retry. It must not block provider continuation, raw recording, run projection, or server startup solely to force inspector absence.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `isExternalProviderRuntimeKind(runtimeKind)` | Current supported external runtime set | Exact Codex/Claude classification | `RuntimeKind` enum value | Explicit equality, false for native/future values |
| `AgentRunMemoryRecorder.attachToRun/onUserMessageAccepted` | External recorder lifecycle/input | Filter, attach, enqueue | run ID + enum runtime kind + config memory dir | Existing public facade |
| `ExternalRuntimeMemoryWriter.appendRawTrace(input)` | One normalized external trace | Assign ID/timestamp/turn seq and append | discriminated `RuntimeMemoryTraceInput` | Sole event persistence write |
| `ExternalRuntimeMemoryWriter.readToolTraceLifecycleGroups()` | Physical tool lifecycle corpus | Hydrate sequencer across restart | writer-owned run directory | Reads active + complete archives |
| External writer provider-boundary methods | One boundary/archive lifecycle | Query correlation state, remove already archived active records, rotate eligible raws | boundary key + marker trace ID/type | Kept explicit rather than generic store exposure to services |
| Cleanup migration `execute()` | One-time external snapshot disposal | Classify, delete, summarize | constructor-owned memory root; metadata runtime identity + layout path | No arbitrary selector API |
| `AgentMemoryService.getRunMemoryView` | Optional physical memory read view | Return requested present-file WorkingContext/raw data | run ID + include options | Unchanged; absent snapshot returns null, retained failed-cleanup file remains readable |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| External runtime predicate | Yes | Yes | Low | Keep exhaustive explicit equality |
| Recorder facade | Yes | Yes | Low | Retain missing-memory-dir validation |
| External writer raw append | Yes | Yes | Low | Remove parallel write-operation wrapper |
| External writer boundary methods | Yes | Yes | Low | Retain typed boundary key/marker contract |
| Cleanup `execute` | Yes | Yes | Low | Derive targets internally; never accept file path input |
| Generic memory read | Yes | Yes | Low | Keep physical-file semantics; do not add runtime/migration selector |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Mixed writer | `RunMemoryWriter` → `ExternalRuntimeMemoryWriter` | Yes after rename | High currently: implies generic/native ownership | Rename file/class and update all callers, no alias |
| Normalized raw input | `RuntimeMemoryTraceInput` | Yes | Low | Retain discriminated trace-specific fields |
| Snapshot update | `RuntimeMemorySnapshotUpdate` | N/A after removal | High if retained | Delete |
| Recorder facade | `AgentRunMemoryRecorder` | Yes at manager boundary | Low | Explicit eligibility helper/documentation makes its filtering contract clear |
| Cleanup | `RemoveExternalRuntimeWorkingContextSnapshotsMigration` | Yes | Low | Name states operation and subject |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| External runtime classification | `runtime-management/runtime-kind-enum.ts` | Extend | Enum owner should expose exact classification once | N/A |
| Raw persistence/archives | `RunMemoryFileStore` and raw archive manager | Reuse | Already own physical trace semantics | N/A |
| Runtime-to-memory location | Metadata stores, `AgentMemoryLocationService`, `AgentMemoryLayout` | Reuse | Already model supported standalone/nested team paths | N/A |
| One-time cleanup status/retry | App-data migration registry/runner/repository | Extend | Existing startup lifecycle and logs fit disposal | N/A |
| Generic snapshot display/absence | Memory service/GraphQL/Memory Inspector | Reuse | Physical presence already gives one general rule; user rejects rare-failure-specific policy | N/A |
| Cleanup policy | No existing owner | Create New | Deletion eligibility is ticket-specific operational policy, not a store concern | Generic file store and runtime writer would cross ownership boundaries |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime management | Exact current external kind classification | DS-002, DS-005 | Recorder, cleanup | Extend | Small exported predicate in enum module |
| Agent memory recording services | Event queue, normalization, reasoning/tool/boundary sequencing | DS-002, DS-004, DS-007–009 | Recorder/accumulator/sequencer | Refactor existing | Remove snapshot coordination |
| Agent memory persistence | Raw item/sequence/lifecycle/archive access | DS-002, DS-004 | External writer | Refactor existing | Rename and contract writer |
| App-data migrations | Metadata-classified snapshot disposal and result ledger | DS-005, DS-010 | Cleanup migration/runner | Extend | New definition registered in existing order |
| Run-history projection | Active raw-to-view conversion | DS-003 | Local projection provider | Reuse unchanged | Regression authority |
| Memory exploration | Optional file-backed view/availability | DS-006, DS-011 | Memory service and UI | Reuse unchanged | Successful cleanup yields absence; failed cleanup may yield accepted stale display |
| Native memory | AutoByteus WorkingContext lifecycle | N/A preserved boundary | Native memory manager | Reuse unchanged | Explicit non-impact |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `runtime-kind-enum.ts` | Runtime management | Runtime kind contract | Enum plus exact external predicate | Same canonical concept | Enum |
| `external-runtime-memory-writer.ts` | Agent memory persistence | External writer | Raw construction, seq hydration, lifecycle/archive access | Cohesive persistence owner | Raw input/store |
| `memory-recording-models.ts` | Agent memory domain | Trace contract | Raw trace input and provider boundary payload only | Shared across recording owners | Raw media |
| Accumulator/sequencer/boundary files | Agent memory services | Event control owners | Preserve their distinct state machines, use raw writer | Existing separations are meaningful | External writer |
| Cleanup migration file | App-data migrations | Cleanup owner | Candidate construction, inventory, classification, unlink, summary | One bounded operational lifecycle | Metadata/location/layout/runtime kind |
| Migration registry | App-data migrations | Registry | Ordered startup registration | Existing composition root | Migration definition |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Codex/Claude exact kind check | Existing `runtime-kind-enum.ts` | Runtime management | Recorder and cleanup must not diverge | Yes | Yes | Capability registry or future-open `not native` check |
| Normalized raw input union | Existing `memory-recording-models.ts` | Agent memory domain | Accumulator, sequencer, boundary, writer share it | Yes after write wrapper removal | Yes after snapshot union removal | Generic bag of optional fields |
| Migration summary construction | Keep local in cleanup migration | App-data migration definition | Only one new owner needs it | N/A | N/A | Premature cross-migration helper abstraction |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `RuntimeMemoryTraceInput` discriminated union | Yes | Yes | Low | Retain trace-type-specific `never` fields; do not wrap in operation |
| `ProviderCompactionBoundaryPayload` | Yes | Yes | Low | Retain because parser/rotation share provider provenance |
| `RuntimeKind` + external predicate | Yes | Yes | Low | Explicit equality for two current values |
| `RuntimeMemorySnapshotUpdate` | No | No | High | Delete entirely |
| `RuntimeMemoryWriteOperation` | No | No | High | Delete entirely; append trace directly |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/runtime-management/runtime-kind-enum.ts` | Runtime management | Runtime kind contract | Enum parsing and exact current external predicate | Single runtime classification authority | N/A |
| `src/agent-memory/domain/memory-recording-models.ts` | Agent memory domain | External trace contract | Tight trace input union and provider-boundary payload | Shared stable shapes only | Raw trace media |
| `src/agent-memory/store/external-runtime-memory-writer.ts` | Agent memory persistence | External writer | Raw construction, sequence hydration, lifecycle index, boundary/archive store access | One persistence subject | Domain trace input, file store |
| `src/agent-memory/services/agent-run-memory-recorder.ts` | Agent memory services | Recorder facade | Exact eligibility, state/queue, accumulator creation | One manager-facing lifecycle | Predicate, writer |
| `src/agent-memory/services/runtime-memory-event-accumulator.ts` | Agent memory services | Accumulator | Segment/turn dispatch and raw ordering | Bounded event state machine | Writer, sequencer |
| `src/agent-memory/services/runtime-tool-trace-sequencer.ts` | Agent memory services | Tool lifecycle owner | Call/result identity/order/hydration | Bounded tool state machine | Writer, lifecycle index |
| `src/agent-memory/services/provider-compaction-boundary-recorder.ts` | Agent memory services | Boundary owner | Boundary parse/dedup/retry/rotation | Distinct lifecycle | Writer, payload |
| `src/app-data-migrations/migrations/remove-external-runtime-working-context-snapshots-migration.ts` | App-data migrations | Cleanup owner | Exact classification, safe inventory/unlink, results | One operational transaction boundary | Predicate, metadata/location/layout |
| `src/app-data-migrations/app-data-migration-registry.ts` | App-data migrations | Composition root | Ordered registration after team metadata migration | Existing registry responsibility | Cleanup definition |

## Applied Patterns (If Any)

- **Clean-cut contraction:** remove the parallel snapshot representation rather than conditionally suppressing it.
- **Thin facade with bounded owners:** recorder integrates manager callbacks; accumulator/sequencer/writer govern their own state and invariants.
- **Explicit capability classification:** closed runtime predicate replaces negative inference.
- **Metadata-derived destructive action:** deletion policy derives exact eligible paths from authoritative identities, then matches physical files.
- **Idempotent operational ledger:** existing app-data migration result/retry/log pattern records best-effort disposal.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts` | File | Runtime kind contract | Add exact Codex/Claude external predicate | Classification is runtime-domain policy | Memory file paths/deletion |
| `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts` | File | Trace contract | Delete snapshot/update operation types; retain raw/boundary types | Domain shapes shared by recording services | WorkingContext projection |
| `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | File | Obsolete mixed writer | Delete after replacement | Removal is explicit | Alias/re-export |
| `autobyteus-server-ts/src/agent-memory/store/external-runtime-memory-writer.ts` | File | External raw persistence | Raw append/sequence/lifecycle/archive methods only | Existing store layer fits physical writer | Message, WorkingContext, snapshot APIs |
| `autobyteus-server-ts/src/agent-memory/services/agent-run-memory-recorder.ts` | File | Recorder facade | Explicit external eligibility and new writer construction | Existing manager integration | Negative `not native` eligibility |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | File | Event accumulator | Direct raw append; remove snapshot reasoning state | Existing bounded event owner | Snapshot updates |
| `autobyteus-server-ts/src/agent-memory/services/runtime-tool-trace-sequencer.ts` | File | Tool sequencer | Direct raw call/result append | Existing lifecycle owner | Snapshot tool payloads |
| `autobyteus-server-ts/src/agent-memory/services/provider-compaction-boundary-recorder.ts` | File | Boundary owner | Update writer type/import only; preserve behavior | No new subsystem needed | Cleanup policy |
| `autobyteus-server-ts/src/app-data-migrations/migrations/remove-external-runtime-working-context-snapshots-migration.ts` | File | Cleanup owner | New exact, idempotent deletion and summary | Operational migrations own one-time cleanup | Content parsing, arbitrary paths, imports traversal |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | File | Migration composition root | Register cleanup immediately after team metadata normalization | Guarantees dependency ordering | Cleanup logic |
| `autobyteus-server-ts/tests/unit/agent-memory/external-runtime-memory-writer.test.ts` | File | Writer regression | Rename/rework writer tests for raw/sequence/lifecycle/archive and snapshot absence | Mirrors production owner | Snapshot success assertions |
| `autobyteus-server-ts/tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` | File | Accumulator regression | Replace WorkingContext assertions with raw content/order/absence | Existing unit scope | Obsolete snapshot construction |
| `autobyteus-server-ts/tests/unit/agent-memory/runtime-tool-trace-sequencer.test.ts` | File | Tool lifecycle regression | Preserve call/result/order/hydration; snapshot absent | Existing unit scope | Snapshot payload expectations |
| `autobyteus-server-ts/tests/unit/agent-memory/agent-run-memory-recorder.test.ts` | File | Recorder regression | Codex/Claude accepted, AutoByteus/future-unknown rejected, raw-only behavior | Existing unit scope | Broad `not native` assumption |
| `autobyteus-server-ts/tests/unit/app-data-migrations/remove-external-runtime-working-context-snapshots-migration.test.ts` | File | Cleanup regression | Exact standalone/nested member deletion; native/import/unknown/task/symlink exclusion; ENOENT/failure/retry summary and retained-file result | New owner deserves focused tests | Real user memory root |
| `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts` and `memory-explorer-graphql.e2e.test.ts` | Files | Inspector contract regression | New/successfully cleaned external absence with raws; retained failure may remain file-backed without affecting application; native controls | Encodes clarified optional display contract | Runtime-qualified hiding assertion |
| `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` | File | Imported-history control | Preserve imported file-backed snapshot/raw inspection | Guards approved import boundary | Local cleanup behavior |
| Existing integration/E2E run-history and runtime tests identified in investigation | Files | Cross-boundary regression | Update writer imports/direct appends; retain raw projection/provider continuation/native assertions under successful and failed cleanup | Existing scenarios already cover realistic boundaries | Blanket test deletion |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | File | Durable memory architecture docs | Distinguish native snapshot and external raw-only contracts | Primary memory documentation | Claim every runtime writes snapshot |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | File | Codex integration docs | Provider continuation + AutoByteus raw evidence | Runtime-specific documentation | External snapshot promise |
| `autobyteus-server-ts/docs/modules/run_history.md` | File | Run-history docs | Clarify raw projection for all runtimes and runtime-specific artifacts | Projection documentation | Generic snapshot authority claim |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | File | Execution docs | Clarify recorder as external raw activity observer if needed | Cross-reference remains accurate | Native continuation conflation |

No `autobyteus-web` production file change is designed: the existing UI generically reflects snapshot file presence and exposes Raw Traces independently. Downstream coverage may update assertions for successful-cleanup absence and accepted failed-cleanup stale visibility.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent-memory/domain` | Main-Line Domain-Control | Yes | Low | Retains only shared trace contracts |
| `src/agent-memory/services` | Main-Line Domain-Control | Yes | Medium | Multiple bounded owners share event flow; existing separate files keep roles visible |
| `src/agent-memory/store` | Persistence-Provider | Yes after rename | Low | External writer wraps generic raw store without native state |
| `src/app-data-migrations/migrations` | Off-Spine Concern | Yes | Low | One cleanup definition fits existing operational pattern |
| `src/runtime-management` | Mixed Justified | Yes | Low | Small enum/predicate contract does not justify a deeper folder |
| `tests/unit/app-data-migrations` | Off-Spine Concern | Yes | Low | Mirrors migration owner |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Event persistence | `writer.appendRawTrace({ traceType: "assistant", ... })` | `writer.write({ trace, snapshotUpdate })` or flag-controlled dual write | One accepted event has one authoritative application record |
| Runtime classification | `kind === CODEX_APP_SERVER || kind === CLAUDE_AGENT_SDK` via shared predicate | `kind !== AUTOBYTEUS` | A future runtime must opt in deliberately |
| Cleanup target | Metadata says Codex + layout derives `/agents/<id>` + exact snapshot path match → unlink file | `find memory -name working_context_snapshot.json -delete` or use stored arbitrary `memoryDir` | Prevents native/imported/path-injection deletion |
| Reasoning order | Flush open reasoning segment to raw before first tool call | Remove all reasoning state/flushes because snapshot reasoning was removed | Some reasoning coordination serves raw ordering, not duplication |
| Inspector behavior | Successful delete/missing file → null/false; failed delete/present file → generic stale display; raw read independent in both | Rebuild from raw or add runtime/migration-specific hiding logic | Encodes the explicit simplicity tradeoff and avoids defensive policy |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Stop writes but continue external recorder loading of old snapshot | Could preserve runtime state temporarily | Rejected | Remove recorder reader/writer state together. The separate generic inspector may still display a physically retained file after reported cleanup failure, but runtime code never consumes it |
| Feature flag or staged dual write | Could stage rollout | Rejected | Provider/raw authorities already support direct clean cut |
| Rebuild snapshots from raw traces | Could preserve old file/UI behavior | Rejected | External WorkingContext is not an approved product requirement |
| Keep `RunMemoryWriter` alias/re-export | Could reduce import edits | Rejected | Update callers so source naming reflects ownership |
| Delete every matching filename | Could reclaim more historical space | Rejected | Delete only exact metadata-classified eligible paths; leave inert residual |
| Back up external snapshots before delete | Could enable rollback | Rejected | Retains duplicate private data and I/O with no authoritative-state benefit |
| Add runtime-qualified Memory Inspector suppression | Could force null even when unlink fails | Rejected | User accepts the rare stale optional display; keep the inspector file-backed and recover through retry/manual removal |

## Derived Layering (If Useful)

The resulting main recording layer is:

`agent-execution manager (integration caller) → recorder facade (eligibility/queue) → accumulator or bounded sequencer (event control) → external writer (persistence owner) → generic raw file/archive provider`.

Cleanup is a separate off-spine operational layer:

`server startup → migration runner → cleanup owner → metadata/location/layout providers → filesystem unlink → migration ledger`.

Projection remains a separate read-side layer and does not cross into recording or cleanup ownership.

## Change / Refactor Sequence

1. Add the exact external runtime-kind predicate and prove current two-value inclusion/native exclusion.
2. Introduce `ExternalRuntimeMemoryWriter` by moving only raw ID/timestamp/sequence, lifecycle index, and provider-boundary archive methods from the mixed writer.
3. Contract `memory-recording-models.ts` by deleting snapshot/update-operation types. Update accumulator, tool sequencer, recorder, boundary recorder, and raw-seeding tests to direct raw append.
4. Remove snapshot-only accumulator reasoning state while preserving open reasoning segment flush and tool ordering. Delete the old writer file with no alias.
5. Add focused raw-only structural/unit/integration coverage, including no snapshot creation or recorder read and active-plus-archive restart hydration. Preserve native/generic inspector snapshot tests.
6. Add the cleanup migration using exact metadata/layout classification, safe physical inventory, per-item results, and no backup. Register it immediately after team metadata member-tree normalization and add idempotence/exclusion/failure tests.
7. Update cross-runtime and gated live expectations: provider continuation/raw traces remain; new/successfully cleaned external WorkingContext is absent; a reported failed unlink may leave stale generic inspector content; native/imported controls remain file-backed. API/E2E owns final durable test validity and execution breadth.
8. Synchronize durable docs and run structural search to prove removed symbols/imports/docs promises no longer exist in the external path.
9. Run implementation-scoped checks, then source review before API/E2E. The same deployed server version both stops writes and runs cleanup at startup; no temporary dual-path seam is needed.

## Key Tradeoffs

- Exact cleanup leaves some unclassifiable duplicates but eliminates the large proven corpus without risking native/imported data.
- Renaming the writer causes test/import churn but prevents the resulting raw-only owner from remaining misleadingly generic.
- Reusing the app-data migration framework calls a disposal task a migration operationally, but gains established startup ordering, durable results, logging, and manual retry without introducing a new maintenance system.
- Keeping the frontend/read service unchanged means a rare failed deletion can leave stale optional content visible, but avoids runtime-specific inspector policy and matches the user's application-availability priority.

## Risks

- **Native data deletion:** Mitigated by exact enum classification, metadata run/member identity, layout-derived paths, imports exclusion, no arbitrary stored memory directory, and native fixtures.
- **Future runtime accidentally admitted:** Mitigated by the shared explicit two-value predicate and negative tests.
- **Raw ordering regression:** Mitigated by retaining segment reasoning flushes and replacing snapshot assertions with sequence/content/tool-order assertions.
- **Restart/tool duplication regression:** Mitigated by preserving physical active-plus-complete-archive lifecycle hydration and dedicated tests.
- **Provider-boundary rotation regression:** Mitigated by leaving boundary owner/store behavior unchanged except the writer type and covering retry/dedup/rotation.
- **Partial cleanup:** Standard warning/failure details and manual retry/removal remain available. Provider and raw runtime behavior is safe because they do not read the old snapshot; optional generic inspection may still read it by explicit user choice.
- **Memory Inspector confusion:** New/successfully cleaned runs show absence, while retained failed items may still show stale content. Docs and executable evidence must state this physical-presence rule rather than promise unconditional absence.
- **Large migration detail logs:** Inventory is a few thousand files in observed data; details must contain only IDs/paths/status, never payload content. If implementation finds materially larger scale, keep summary truthful without weakening per-failure evidence.

## Guidance For Implementation

- Treat the approved distinction literally: normal run/event-monitor projection is raw-backed for all runtimes; only Codex/Claude snapshot recording/cleanup changes.
- Preserve the exact raw field construction in the current writer, including timestamp normalization, ID format, trace-type-specific fields, turn sequence, correlation IDs, and archive state calls.
- Do not remove `flushOpenReasoningSegments`; remove only snapshot association (`pendingReasoningByTurn`, consumption, snapshot-only completion write).
- Keep tool identity compound (`turnId`, `toolCallId`) and hydrate from the physical raw corpus before accepting new events.
- The cleanup must derive standalone paths from directory/run identity via `AgentMemoryLayout`, not `AgentRunMetadata.memoryDir`. For team members, use parsed current metadata plus `AgentMemoryLocationService.listTeamMemberLocationsFromMetadata`.
- Validate metadata identity against the directory/root being processed before eligibility. Treat missing, invalid, mismatched, native, imported, and future-runtime data as non-deletable.
- Do not follow symlink directories or recursively delete. Unlink only the exact snapshot file and treat `ENOENT` as idempotent skip.
- Reuse standard `AppDataMigrationExecutionResult`/summary/detail/status patterns and export the migration ID for tests.
- On non-`ENOENT` unlink failure, retain the file, report the exact failure, continue startup, and leave generic inspection unchanged. Do not add runtime-kind/migration-status filtering in service, GraphQL, or frontend solely for this edge.
- Do not change shared native snapshot serialization/store APIs or add frontend runtime branches.
- Implementation and test owners should use the exact test/document impact inventory in `investigation-notes.md`; any discovered requirement or cross-cutting design gap returns to solution design.
