# Design Spec — Compaction Lineage Origin Simplification

- Status: `Ready for architecture review`
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/requirements.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/investigation-notes.md`
- Persisted evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/persisted-lineage-inventory.md`

## Current-State Read

Native compaction has a healthy high-level proposal/accept/commit spine, but one future-facing provenance concern crosses two otherwise distinct owners:

1. `AcceptedCompactionBuilder` creates output rows, finalized WorkingContext, and every lineage field except `rawTraceArchiveFile`.
2. `AcceptedCompactionCommitter` calls the raw store, receives a completed archive descriptor, takes only its filename, patches the `lineageDraft`, and appends the resulting record.
3. `CompactionLineageResolver` later joins an output ID to its producing record, reads that archive, and walks predecessor records to report recursive raw roots.
4. Server `AgentMemoryOriginService` exists only to locate the correct run/member directory and construct that resolver.

The supported current-context path does not use the archive field or resolver. `MemoryManagerCompactionCoordinator` uses the lineage head for stable-baseline/concurrency checks and requires its exact output bundle. `CurrentCompactionOutputLoader` reads only `episodeIds` and `semanticIds`. The file lineage store uses `previousCompactionId` to validate a linear successful-head chain. Raw archival independently validates selected active raw IDs, writes a complete manifest/file segment, and rewrites active storage.

The design issue is therefore bounded but structural: a raw-storage locator crosses into the compacted-output record solely to support an unused origin subsystem. The target removes that concern rather than introducing a new provenance abstraction.

## Intended Change

- Contract `CompactionLineageRecord` so it contains current head/output/audit state but no raw archive locator.
- Make `AcceptedWorkingContextCompaction` carry a complete `lineageRecord`, eliminating the special draft type and commit-time field injection.
- Contract native exact raw archival to a command-style `archiveExactRawTraces(traceIds): void`. The raw store derives its own stable archive boundary key from selected raw IDs and retains internal completion validation; it returns no descriptor to compaction.
- Remove direct/recursive origin resolver/model files, origin-only lineage queries/exports, the server origin service, and origin-only coverage/documentation.
- Preserve existing lineage filename/schema version, scope, compaction/predecessor identity, exact output membership, derivation/execution audit metadata, current loader, raw archive storage, and compaction effect ordering.
- Read existing stored JSON supersets directly by projecting recognized target fields; perform no migration or rewrite.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002, REQ-005 / AC-001, AC-002, AC-003 | Native pending compaction must complete before the next LLM request | Investigation BEH-001; pending executor/coordinator/committer trace | Preserve full accepted lifecycle; archive and lineage become independent commit effects and the accepted record is complete before commit | DS-001, DS-003 |
| BEH-002 | System | REQ-001, REQ-004 / AC-001, AC-004, AC-006 | Native runtime with a current successful lineage head | Investigation BEH-002; loader/coordinator trace | Preserve exact head output loading with contracted record; no raw archive read | DS-002 |
| BEH-003 | Operational | REQ-002, REQ-005 / AC-002, AC-007 | Accepted compaction supplies unique selected new raw IDs | Investigation BEH-003; raw store/manager trace | Preserve exact archive movement; raw owner derives boundary identity and returns no locator | DS-001, BLS-001 |
| BEH-004 | Contract | REQ-003, REQ-005 / AC-005, AC-008 | No supported product trigger/caller exists; synthetic internal calls only | Investigation BEH-004 and repository-wide call graph | Remove the unsupported origin contract; no replacement path | Removed; no target spine |
| BEH-005 | Operational | REQ-004, REQ-006 / AC-003, AC-004, AC-006 | Target runtime reads valid existing schema-version-1 lineage JSONL | Investigation BEH-005 and persisted supplement | Project recognized retained fields, ignore obsolete stored extra, preserve all retained invariants, write contracted rows | DS-002, BLS-002 |
| BEH-006 | Contract | REQ-005 / AC-007, AC-008 | No current supported maintenance trigger | Investigation BEH-006; user direction | Preserve no current path; future memory maintenance remains separate | N/A |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/persisted-lineage-inventory.md` | Representative lineage/output/archive inventory and retained-shape direct-use probe | REQ-004, REQ-006 / AC-003, AC-004, AC-006, AC-007 | Proves the schema contraction is a stored-superset read, not a transformation/migration | Complete / approval N/A |

## Task Design Health Assessment

- Change posture: `Cleanup` / `Refactor`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`
- Evidence: `lineageDraft` is defined as the entire current record minus one raw-storage field; commit obtains a descriptor from `MemoryStore`, copies one field into lineage, and supports resolver/server code with no product consumer. Normal current-output loading never uses this coupling.
- Design response: remove the relation and every owner/API created only for it; complete the accepted record in the builder; turn exact raw archival into an independent storage command; keep current output/head and archive mechanisms with their existing authoritative owners.
- Refactor rationale: a field-only deletion without interface/type/service cleanup would leave responsibility drift and unused code. The full clean-cut removal is proportionate and removes roughly 706 direct resolver/service/test lines plus surrounding coupling.
- Intentional deferrals and residual risk: execution/audit fields remain although direct product reads are limited because the user did not approve their removal and they are a distinct operational concern. Future memory maintenance remains undesigned; its only preserved input is independent raw evidence.

## Terminology

- **Compaction lineage record:** the append-only successful-compaction record whose tail identifies the current output bundle and whose predecessor establishes ordered head history. It is not a raw provenance record after this change.
- **Current compacted-output bundle:** the exact episode and semantic rows named by the lineage tail and used as the complete current-context replacement.
- **Native exact archive command:** the raw-store operation that moves the selected new raw IDs from active storage into one complete archive segment. It owns storage boundary identity and does not return a locator to compaction.
- **Obsolete stored extra:** historical `rawTraceArchiveFile` JSON bytes left in existing rows and ignored by the target recognized-field normalizer.

## Design Reading Order

This design follows the template order: verified behavior and transition decisions first; compaction/load spines and owners second; then interfaces, concrete file responsibility, removals, and change sequencing.

## Legacy Removal Policy

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete in-scope paths: raw archive field/validation, lineage draft split, completed exact-archive descriptor exposed to compaction, direct/recursive resolver/model types, origin-only store queries/exports, server origin service, and origin-only tests/docs.
- Existing stored supersets are not a legacy code path. The one target normalizer remains schema-version-1/current-shape-only and generically selects recognized fields.
- No resolver stub, deprecated export, optional compatibility property, dual writer, schema-version branch, or app-data rewrite is permitted.

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume: run-local `compaction_lineage.jsonl`; current representative data has one 3,387-byte file and two schema-version-1 rows containing the target retained fields plus `rawTraceArchiveFile`. Related raw/output files remain independent.
- Relevant code-model, serialization, semantic, or physical-store change: remove the raw archive field from the recognized TypeScript/JSON shape and new writes. The record remains successful-head/output-membership state; no physical store changes.
- Normal reader/writer behavior and representative evidence: `normalizeCompactionLineageRecord` parses explicit known fields into a new object. The target stops requiring/returning the obsolete key. All representative rows pass target retained-field, chain, scope, and output checks; new writer serializes the contracted normalized object.
- Required semantics and invariants under direct use: schema version 1, scope, unique/nonempty compaction ID, linear predecessor, nonempty unique episode membership, unique semantic membership, ISO derivation time, supported execution/prompt versions, optional digest/integrity shape, and exact current output rows.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: lineage is append-only; raw archives are evidence and must not be rewritten. Removing inert filename bytes has no correctness/privacy benefit. Existing snapshot migration gates only on nonempty lineage file state.
- Decision: `Directly Usable — No Migration`
- Decision rationale: the stored object is a JSON superset of the target. Normal version-agnostic projection preserves required meaning without historical branching. Migration would add I/O, corruption/interruption exposure, rollback/deployment complexity, and no behavioral benefit.
- Acceptance criteria or design constraints supported: AC-003, AC-004, AC-006, AC-007; the target reader must not expose the ignored property, and the target writer must not emit it.

### Migration Plan

`N/A — decision is Directly Usable — No Migration.`

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003 | Pending native compaction before LLM request | Finalized current context/snapshot installed and pending cleared | `MemoryManagerCompactionCoordinator` through `MemoryManager` | Carries the supported successful-compaction behavior and exposes the archive/lineage separation. |
| DS-002 | Primary End-to-End | BEH-002, BEH-005 | Native baseline/restore/current-output request | Exact current episode/semantic bundle or integrity failure | `CurrentCompactionOutputLoader`, invoked behind `MemoryManager`/coordinator | Proves the contracted record remains sufficient for normal continuation and old-row direct use. |
| DS-003 | Return-Event | BEH-001 | Successful `commitAcceptedCompaction` return | Completed compaction status and next request dispatch | `PendingCompactionExecutor` | Preserves application continuation; removal must not produce false completion or block normal dispatch. |
| BLS-001 | Bounded Local | BEH-003 | Selected raw trace IDs enter `RunMemoryFileStore` | Complete archive segment plus active file without selected IDs | `RunMemoryFileStore` | Keeps raw storage exact and independent without exposing a descriptor to compaction. |
| BLS-002 | Bounded Local | BEH-005 | JSONL lines enter `FileCompactionLineageStore` | Normalized ordered records and tail | `FileCompactionLineageStore` | Establishes direct-use of old supersets and current invariant validation. |

## Primary Execution Spine(s)

**DS-001 — accepted compaction**

`LlmPhase / LLMRequestAssembler -> PendingCompactionExecutor -> MemoryManager public compaction API -> MemoryManagerCompactionCoordinator -> AcceptedCompactionBuilder -> output validator -> AcceptedCompactionCommitter -> independent Raw MemoryStore command + output persistence + CompactionLineageStore append -> finalized WorkingContext/snapshot/pending clear`

**DS-002 — current output load**

`Native baseline/restore/current projection -> MemoryManager / MemoryManagerCompactionCoordinator -> CurrentCompactionOutputLoader -> CompactionLineageStore.readHead -> MemoryStore exact episode/semantic lookups -> CompactedMemoryProjectionBundle / WorkingContext invariant`

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A pending operation captures a stable current-context/head baseline, receives a strategy proposal, builds deterministic output rows plus a complete contracted record, validates the candidate, and commits ordered effects. Raw archive completion and lineage append are sibling effects; no data flows from the former into the latter. | pending compaction; accepted replacement; current head; finalized context | `MemoryManagerCompactionCoordinator` | strategy selection/LLM, status reporting, raw archive persistence, output persistence, snapshot persistence |
| DS-002 | A native consumer asks for current compacted output. The loader gets the normalized tail and fetches exact output rows. Old stored extra attributes have already disappeared at the store normalization boundary. | current head; output membership; projection bundle | `CurrentCompactionOutputLoader` behind `MemoryManager` | JSONL parsing, scope/chain validation, output row persistence |
| DS-003 | After commit returns, the pending executor reports `completed`; failure still throws/report-fails before provider dispatch. | compaction lifecycle result | `PendingCompactionExecutor` | runtime reporter/notifier |
| BLS-001 | The raw store normalizes unique IDs, derives its own stable selection boundary key, validates active membership, archives selected rows, verifies a result, and rewrites active storage. | raw selection; archive segment; active corpus | `RunMemoryFileStore` | generic `RawTraceArchiveManager` manifest/file mechanics |
| BLS-002 | The lineage store parses every JSONL line, projects recognized target fields, validates scope/IDs/predecessors, and returns the tail. Historical extra keys never enter the in-memory record. | stored record; normalized record; ordered head | `FileCompactionLineageStore` | filesystem/JSONL parser |

## Spine Actors / Main-Line Nodes

- `PendingCompactionExecutor`: initiates and reports the pending operation around the authoritative memory boundary.
- `MemoryManager` / `MemoryManagerCompactionCoordinator`: own baseline identity, concurrency invariants, acceptance, commit entry, and current-output invariant.
- `AcceptedCompactionBuilder`: owns deterministic output identity, finalized context, and the complete accepted record.
- `AcceptedCompactionCommitter`: owns the irreversible accepted-effect sequence, not the semantics of the individual stores.
- `RunMemoryFileStore`: owns exact raw selection archival and active-file rewrite.
- `FileCompactionLineageStore`: owns normalized ordered successful records and tail selection.
- `CurrentCompactionOutputLoader`: owns hydration/validation of the tail's exact replacement bundle.

## Ownership Map

| Node | Concrete Ownership |
| --- | --- |
| `PendingCompactionExecutor` | strategy resolution/execution lifecycle, output validation call, completed/failed status and request-blocking result |
| `MemoryManagerCompactionCoordinator` | pending operation identity, WorkingContext fingerprint, lineage-head baseline, concurrency checks, accepted commit authority, current-output invariant |
| `AcceptedCompactionBuilder` | deterministic episode/semantic IDs and rows, execution audit validation, finalized WorkingContext, complete `CompactionLineageRecord` value |
| `AcceptedCompactionCommitter` | order of raw archive, output persistence/verification, lineage append, context install, snapshot write, and pending clear |
| `RunMemoryFileStore` | selected-ID normalization, active membership, archive boundary identity, generic archive delegation, active rewrite, completion failure |
| `RawTraceArchiveManager` | manifest segment indexing/status, generic boundary idempotency, archive file write/read/path safety |
| `FileCompactionLineageStore` | recognized-field normalization, run scope, unique IDs, linear predecessor chain, append/head/list persistence |
| `CurrentCompactionOutputLoader` | exact tail-output hydration/order validation and projection bundle mapping |

`MemoryManager` remains the thin public facade over the governing coordinator for compaction methods; it must not expose raw archive internals or origin lookup.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MemoryManager` compaction methods | `MemoryManagerCompactionCoordinator` | Stable runtime-facing API and composition root | archive filenames, JSONL parsing, strategy internals, origin traversal |
| `FileMemoryStore.archiveExactRawTraces` | `RunMemoryFileStore` | Adapts generic `MemoryStore` to run-local file storage | compaction/head identity or output record construction |

## Removal / Decommission Plan

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `CompactionLineageRecord.rawTraceArchiveFile` and safe-path validation | No supported current-head/output behavior uses it | Independent `RunMemoryFileStore` archive ownership; contracted record | In This Change | Old stored extra ignored generically. |
| `AcceptedCompactionLineageDraft` and `lineageDraft` | Accepted record no longer depends on archive result | `AcceptedWorkingContextCompaction.lineageRecord: CompactionLineageRecord` | In This Change | Mechanical rename in builder/committer/test. |
| `CompletedRawTraceArchiveDescriptor` and high-level return | No caller needs raw archive metadata after field removal | `archiveExactRawTraces(traceIds): void`; internal archive result remains | In This Change | Do not remove generic manager result types used by provider flows/tests. |
| `CompactionLineageStore.getByCompactionId` | Used only for recursive origin traversal | None | In This Change | Keep `list`, `readHead`, `appendNext`. |
| `CompactionLineageStore.findProducingRecord` | Used only for output-origin lookup | None | In This Change | Removes `MemoryArtifactRef` dependency. |
| `compaction-lineage-resolver.ts` | Unsupported direct/recursive origin capability | None | In This Change | Delete file. |
| `memory-origin-resolution.ts` | Shapes/errors only for removed capability | None | In This Change | Delete file. |
| Origin exports in `memory/index.ts` | Expose removed capability | None | In This Change | No deprecated aliases. |
| Server `agent-memory-origin-service.ts` and empty origin-only folder | No supported server caller or remaining responsibility | None | In This Change | Delete source; no GraphQL replacement. |
| Core/server dedicated origin tests | Assert removed behavior | None | In This Change | Delete suites. |
| Origin block in broader tool lifecycle integration | Asserts removed behavior inside retained scenario | Existing archive/current-output assertions | In This Change | Edit, do not delete whole suite. |
| Origin/schema statements in four durable docs | Would describe nonexistent behavior | Current head/output + independent raw archive documentation | In This Change | Delivery may refine wording against integrated state. |

## Return Or Event Spine(s)

**DS-003:** `AcceptedCompactionCommitter.commit returns -> MemoryManagerCompactionCoordinator.commit returns -> PendingCompactionExecutor emits completed -> LLM request assembly/provider dispatch continues`.

The refactor must not move completed reporting before commit, swallow archive/output/lineage errors, or clear pending on failure. No new event is added for removed origin capability.

## Bounded Local / Internal Spines

- Parent owner: `RunMemoryFileStore`
  - BLS-001: `normalize unique selected IDs -> derive raw-selection boundary key -> index active rows -> reject missing/duplicate membership -> archiveAndRewriteActive -> require non-null completed segment -> return void`
  - Why it matters: this keeps storage correctness and idempotency metadata entirely inside the raw owner.
- Parent owner: `FileCompactionLineageStore`
  - BLS-002: `read JSONL -> normalize recognized target fields -> assert scope -> assert unique compaction IDs -> assert predecessor continuity -> return list/tail`
  - Why it matters: the same current path reads both historical JSON supersets and new contracted rows without schema-version branches.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Compaction strategy/LLM | DS-001 | `PendingCompactionExecutor` | Produce ID-less normalized proposal | Model work remains replaceable before acceptance | Could assign storage/output identity or publish partial state |
| Runtime status reporter | DS-003 | `PendingCompactionExecutor` | Emit requested/started/completed/failed diagnostics | User/system lifecycle visibility | Could become commit authority or falsely report success |
| Raw archive manager | DS-001, BLS-001 | `RunMemoryFileStore` | Generic manifest/file archive mechanics | Shared by native and external/provider boundary storage | If on compaction spine, archive details leak into output schema again |
| Execution audit metadata | DS-001, DS-002 | `AcceptedCompactionBuilder` / record normalizer | Preserve runtime/provider/model/policy/prompt facts | Existing operational audit contract | Removing or expanding it here would mix a separate decision into origin cleanup |
| Snapshot store | DS-001 | `AcceptedCompactionCommitter` | Persist finalized WorkingContext | Existing-run resume | If treated as lineage authority, current state would have overlapping representations |

## Ownership Boundaries

1. **MemoryManager boundary:** runtime callers request/capture/prepare/commit/load through `MemoryManager`; the coordinator remains internal owner of compaction state and invariants.
2. **Raw MemoryStore boundary:** committer submits only selected raw IDs. `RunMemoryFileStore` decides storage boundary identity, archive path/manifest, completion, and active rewrite. No archive identifier crosses upward.
3. **LineageStore boundary:** committer submits an already complete current-schema record plus expected predecessor. Store normalizes/validates/persists it. It does not locate raw origins.
4. **Current output boundary:** loader receives a normalized head and uses output IDs. It does not bypass into raw archive manager.
5. **Server boundary:** no server-level memory-origin boundary remains. Run/member location services continue serving their other owners; they are not invoked for origin.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MemoryManager` compaction API | coordinator, builder, committer, current loader | pending executor/runtime | runtime constructs record/store effects directly | strengthen named MemoryManager method, not expose internals |
| `MemoryStore.archiveExactRawTraces(ids)` | run store, archive manager, manifest/files, active rewrite | accepted committer | committer calls archive manager and then patches lineage | strengthen raw command internally; never return path upward |
| `CompactionLineageStore.appendNext/readHead/list` | JSONL parsing, normalization, scope/chain validation | coordinator, committer, loader, limited audit/tests | caller parses lineage JSONL or origin-searches it | add a current-state lineage operation only if a real supported need emerges |
| `CurrentCompactionOutputLoader.loadCurrent` | head read + exact output lookup/order validation | coordinator/projection paths | caller reads head and memory rows separately | extend loader's current-output contract, not raw origin |

## Dependency Rules

- `AcceptedCompactionCommitter` may call the raw archive command, output `MemoryStore`, lineage store, context hook, and snapshot store in order.
- It must not receive/import a raw archive descriptor or add archive data to `lineageRecord`.
- `AcceptedCompactionBuilder` may depend on lineage record/scope types and output/finalizer owners; it must not depend on raw archive manager/manifest types.
- `CompactionLineageRecord` and `CompactionLineageStore` must not import raw trace/archive or origin-resolution types.
- `FileCompactionLineageStore` may parse/normalize/validate the current record only; it must not search by episode/semantic origin.
- `CurrentCompactionOutputLoader` may depend on lineage head and memory output store only; raw archive access is forbidden.
- `RunMemoryFileStore` may derive native archive boundary identity from the selected raw IDs. It must not accept compaction output IDs or a lineage record.
- External/provider raw archive flows keep using generic `RawTraceArchiveManager` / existing run-store boundary operations unchanged.
- Server source must not recreate origin resolution through direct deep imports after the service deletion.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `MemoryStore.archiveExactRawTraces(traceIds): void` | native raw selection retirement | archive exact unique selected rows and remove them from active storage | ordered readonly raw trace ID list | No compaction/output/archive locator argument or return. |
| `CompactionLineageStore.appendNext(expectedPreviousCompactionId, record): void` | successful current-output head | atomically validate expected tail and append one complete record | nullable expected compaction ID + contracted record | Existing method retained. |
| `CompactionLineageStore.readHead()` | current successful head | return normalized tail | run-local store scope fixed at construction | Existing method retained. |
| `CompactionLineageStore.list()` | ordered successful records | return normalized validated chain for store validation/audit/tests | run-local store scope fixed at construction | Retained; no artifact-origin selector. |
| `CurrentCompactionOutputLoader.loadCurrent()` | current compacted-output bundle | hydrate exact head output rows | store-fixed run scope | No raw archive dependency. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `archiveExactRawTraces` | Yes | Yes | Low | Remove `compactionId`/descriptor so only raw selection crosses. |
| `appendNext` | Yes | Yes | Low | Retain complete record and explicit expected predecessor. |
| `readHead` / `list` | Yes | Yes | Low | Remove origin query siblings. |
| `loadCurrent` | Yes | Yes | Low | Preserve exact output subject. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| persisted successful head history | `CompactionLineageRecord` | Yes | Low | Keep name; predecessor/output lineage remains real. |
| accepted record property | `lineageDraft` -> `lineageRecord` | Yes after change | Current: Medium | Rename and delete draft alias. |
| exact raw archive command | `archiveExactRawTraces` | Yes | Low | Keep method name; contract return/input only. |
| removed origin resolver/service | deleted | N/A | None | Do not replace with vague helper. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| exact raw retention | `RunMemoryFileStore` + `RawTraceArchiveManager` | Reuse/contract | Already owns validation, manifest/file completion, idempotency, active rewrite | N/A |
| current head persistence | lineage record/store | Reuse/contract | Already owns correct subject once origin field/queries removed | N/A |
| current output hydration | `CurrentCompactionOutputLoader` | Reuse | Already independent and exact | N/A |
| output-to-raw origin | removed | Do not create | No supported behavior requires it | N/A |
| old-row migration | normal record normalizer | Reuse | Generic recognized-field projection is sufficient | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Native memory compaction | proposal acceptance, deterministic outputs, effect sequence, current context | DS-001, DS-003 | coordinator/committer | Contract | Complete record before commit. |
| Compaction lineage/current output | ordered successful head, exact output membership, current load | DS-001, DS-002, BLS-002 | lineage store/current loader | Contract | No raw origin queries. |
| Raw memory storage/archive | exact selection archive, manifest/files, active rewrite | DS-001, BLS-001 | run store/archive manager | Contract high-level API; reuse internals | External/provider generic archive paths unchanged. |
| Server memory location | standalone/team run path resolution | N/A after origin removal | other server features | Reuse unchanged | No origin composition responsibility. |
| Future memory maintenance | N/A | N/A | N/A | Do not create | Separate future ticket. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `lineage/compaction-lineage-record.ts` | lineage/current output | record schema | contracted type and recognized-field validation | one canonical persisted shape | scope type |
| `lineage/compaction-lineage-store.ts` | lineage/current output | persistence interface | append/list/head only | one subject boundary | record type |
| `store/file-compaction-lineage-store.ts` | lineage/current output | file adapter | JSONL normalization/order/head | one storage provider | record normalizer |
| `compaction/working-context-compaction-proposal.ts` | native compaction | proposal/accepted shapes | complete `lineageRecord` property | existing compact type file | record type |
| builder + committer files | native compaction | acceptance / effect sequence | build full record; persist independent effects | already split by pure build vs side effects | accepted shape |
| base/file/run stores | raw storage | raw command boundary/provider | `void` exact archive API and selected-ID-owned identity | established inheritance/provider split | generic archive manager |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| accepted lineage shape | existing `compaction-lineage-record.ts` | lineage/current output | builder, committer, store share one canonical record | Yes — raw archive field removed | Yes — draft alias removed | a union of legacy/current shapes |
| raw archive segment mechanics | existing `raw-trace-archive-manager.ts` | raw storage | native/external flows share generic manifest/file operations | Yes — unused completed descriptor removed | Yes at high-level boundary | compaction/output owner |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `CompactionLineageRecord` | Yes | Yes | Low | Remove archive locator; retain one head/output/audit meaning. |
| `AcceptedWorkingContextCompaction` | Yes | Yes | Low | Use one complete `lineageRecord`, no draft/patch split. |
| raw exact archive command | Yes | Yes | Low | Selected IDs in, no descriptor out; internal segment stays raw-owned. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-record.ts` | lineage/current output | persisted schema | retained record type and strict recognized-field normalizer | canonical current record | scope normalization |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-store.ts` | lineage/current output | persistence interface | append/list/head contract | singular store boundary | record type |
| `autobyteus-ts/src/memory/store/file-compaction-lineage-store.ts` | lineage/current output | file adapter | current JSONL append/read/chain/head | singular provider | record normalizer |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-proposal.ts` | native compaction | data contract | proposal and accepted candidate with complete record | tightly related operation shapes | record type |
| `autobyteus-ts/src/memory/compaction/accepted-compaction-builder.ts` | native compaction | acceptance builder | deterministic outputs/finalized context/full record | pure candidate construction | record type |
| `autobyteus-ts/src/memory/compaction/accepted-compaction-committer.ts` | native compaction | effect sequencer | independent raw command, outputs, record, context/snapshot/pending | one ordered commit boundary | accepted shape/store interfaces |
| `autobyteus-ts/src/memory/store/base-store.ts` | raw storage | abstract store | command signature | shared polymorphic boundary | N/A |
| `autobyteus-ts/src/memory/store/file-store.ts` | raw storage | file facade | forward exact archive command | established provider adapter | run store |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | raw storage | run-local owner | selected-ID boundary key, exact archive, active rewrite | owns physical run state | archive manager |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | raw storage | generic provider | generic segment result/manifest/file mechanics | used by native and external flows | manifest types |
| `autobyteus-ts/src/memory/index.ts` | memory package | public barrel | retained exports only | existing package boundary | N/A |

## Applied Patterns

- **Proposal / Accept / Commit:** retained. Builder creates a complete accepted candidate; committer sequences effects.
- **Command boundary:** native exact raw archival becomes a command with no result because callers require completion/failure only.
- **Recognized-field normalization:** retained as the one current reader shape; old stored supersets naturally project into it.
- **Append-only current-head log:** retained for ordered compaction history and current output membership.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/lineage/` | Folder | lineage/current output | contracted record, scope, store interface | existing cohesive area remains readable after two origin files are deleted | raw archive readers, artifact-origin response types |
| `.../lineage/compaction-lineage-resolver.ts` | File | removed | delete | no supported owner remains | stub/deprecation |
| `.../lineage/memory-origin-resolution.ts` | File | removed | delete | no supported owner remains | compatibility types |
| `autobyteus-ts/src/memory/compaction/` builder/committer/type files | File | native compaction | complete candidate and independent effect sequence | existing concern split is healthy after contraction | archive locator/model |
| `autobyteus-ts/src/memory/store/` base/file/run/archive files | File | raw/lineage persistence | contracted native command and retained provider internals | existing storage depth is appropriate | compacted output-origin relation |
| `autobyteus-server-ts/src/memory-lineage/services/agent-memory-origin-service.ts` | File | removed | delete | folder has no remaining responsibility | replacement facade |
| affected test paths | File | test ownership | delete origin-only suites; update retained scenarios/fixtures | proportionate durable coverage | tests for removed contract |
| four affected docs | File | durable architecture/module docs | describe contracted lineage + independent raw archives | existing documentation owners | origin promises |

The current layout remains flat within the small `lineage` capability area because record, scope, and store interface are one structural depth. Additional folders would over-split three cohesive files.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `memory/lineage` | Main-Line Domain-Control | Yes | Low after removal | only record/scope/store contract remain |
| `memory/compaction` | Main-Line Domain-Control | Yes | Low | pure builder vs effect committer split retained |
| `memory/store` | Persistence-Provider | Yes | Medium but established | multiple store providers share one existing area; no new folder needed for this contraction |
| server `memory-lineage` | Off-Spine Concern | N/A after deletion | None | remove empty origin-only source path |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Accepted record | `accepted.lineageRecord` is complete before `commit()` | `lineageDraft` plus `rawTraceArchiveFile` patched from storage | Prevents unrelated store output from completing domain state. |
| Raw archive boundary | `archiveExactRawTraces(selectedIds): void` | return descriptor -> committer -> lineage field | Keeps archive identity encapsulated. |
| Existing row read | `{...recognized fields, rawTraceArchiveFile: 'old'}` -> normalized recognized record | `if (version===1) delete field; else ...` | Generic projection avoids compatibility branches. |
| Removal | delete resolver/service/exports/tests | leave throwing `resolveOrigin()` or deprecated aliases | Unsupported future machinery should not survive cleanup. |
| Future memory work | later ticket starts from raw corpus/Work Evidence requirements | add empty provenance interface now | Avoids pre-designing an unknown subsystem. |

Target record shape:

```ts
type CompactionLineageRecord = {
  schemaVersion: 1;
  scope: CompactionLineageScope;
  compactionId: string;
  previousCompactionId: string | null;
  episodeIds: string[];
  semanticIds: string[];
  derivedAt: string;
  execution: CompactionLineageExecution;
  integrity?: { recordSha256: string };
};
```

Target commit shape:

```ts
this.store.archiveExactRawTraces(accepted.selectedNewRawTraceIds);
this.store.add([...accepted.episodicItems, ...accepted.semanticItems]);
this.lineageStore.appendNext(
  accepted.expectedPreviousCompactionId,
  accepted.lineageRecord,
);
```

## Backward-Compatibility Rejection Log

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `rawTraceArchiveFile?: string` | Would let type/read path represent old and new rows | Rejected | Target type excludes it; normalizer generically ignores stored extra. |
| Add lineage schema version 2 and accept 1/2 | Conventional schema contraction option | Rejected | Same record subject/invariants remain; would force dual runtime logic or migration with no benefit. Keep current schema version 1. |
| Rewrite old JSONL rows | Removes obsolete bytes physically | Rejected | Direct use preserves all semantics; no migration. |
| Keep resolver/service as deprecated throwing stubs | Avoid possible external import failures | Rejected | No supported consumer; delete files/exports/tests/docs. |
| Keep origin-only store queries | Might support future maintenance | Rejected | No current owner; future subsystem designs its own boundary from requirements. |
| Keep exact archive descriptor return | Might be generally useful | Rejected | No current caller after contraction; keep only generic raw manager result internally. |
| Build replacement Work Evidence/origin API | Could prepare future memory management | Rejected | Explicit non-goal and unknown future design. |

## Derived Layering

`Runtime orchestration -> MemoryManager compaction authority -> accepted build/commit -> independent persistence boundaries (raw store, output store, lineage store, snapshot store)`.

This is explanatory only. No caller may skip `MemoryManager` to coordinate compaction internals, and the committer may not bypass `MemoryStore`/`CompactionLineageStore` providers.

## Change / Refactor Sequence

1. Contract `CompactionLineageRecord` and normalizer by deleting `rawTraceArchiveFile` type/read/validation/return while retaining schema version and every other invariant.
2. Replace `AcceptedCompactionLineageDraft` / `lineageDraft` with complete `lineageRecord`; update builder to construct it and committer to append it unchanged.
3. Contract native exact archive interface across `MemoryStore`, `FileMemoryStore`, and `RunMemoryFileStore` to selected IDs only and `void`; derive the native boundary key inside the run store and continue requiring a completed internal archive result. Remove `CompletedRawTraceArchiveDescriptor` only after references reach zero.
4. Remove origin-only methods from `CompactionLineageStore` and `FileCompactionLineageStore`.
5. Delete core resolver/model files and remove barrel exports.
6. Delete server origin service/source folder and dedicated server test.
7. Delete core dedicated resolver tests; update store fixtures and retained tests. Add explicit old-superset direct-read coverage and new-row no-origin assertion. Remove only the origin block/imports from broad integration coverage.
8. Update durable docs to describe contracted lineage and independent raw archives; remove the direct/recursive origin section/service claims.
9. Run format/type/build and focused compaction/lineage/raw archive tests. Search for every removed symbol/field and verify only historical ticket artifacts or deliberately documented test fixture text remain.
10. Do not add a migration, schema-version branch, compatibility stub, or future memory subsystem at any step.

No temporary dual path is required. The code compiles only after the coordinated source/type/test contraction is complete on the ticket branch.

## Key Tradeoffs

- **Keep `previousCompactionId`:** it might look origin-related, but it remains live head-order/concurrency state. Removing it would weaken current compaction correctness.
- **Keep episodic/semantic IDs and files:** they are current replacement membership, not optional provenance. Removing them would break continuation.
- **Keep raw archives:** they are independent original evidence and support archive/history behavior. The simplification removes only output linkage.
- **Keep schema version 1:** avoids unnecessary migration/dual version while remaining truthful for the same record subject. Old extra fields are ignored; unsupported versions still fail.
- **Derive raw boundary identity inside the raw store:** this removes compaction/output identity from the raw command at the cost of making the storage key non-human semantic metadata. The boundary key is already internal idempotency state, so encapsulation is preferable.
- **Delete rather than deprecate:** potential unknown wildcard consumers receive a compile/import break, but no supported consumer exists and the team's clean-cut rule prohibits speculative compatibility.

## Risks

- Over-contracting generic raw archive APIs could affect external/provider compaction-boundary recording. Mitigation: change only native `archiveExactRawTraces`; preserve `RawTraceArchiveManager.archiveRecords`, run-store generic boundary methods, manifest shape, and server external-runtime code.
- A selection-derived boundary key must be stable for the same normalized ID set and sufficiently collision-resistant under existing storage conventions. Implementation should use a deterministic SHA-256 digest of sorted unique IDs within `RunMemoryFileStore`, not compaction/output identity.
- A test may accidentally assert object equality including removed fields or keep deep imports. Mitigation: compile plus removed-symbol search and focused suite.
- Existing old rows still contain archive filenames physically. This is acceptable by approved contract; UI/API/business code must not expose them.
- Broader docs contain historical language in completed ticket artifacts. Those immutable historical artifacts need not be rewritten; current durable project docs must be updated.

## Guidance For Implementation

- Keep the source change mechanical around the reviewed ownership model; do not rename the lineage file/folder or remove audit fields opportunistically.
- Implement the raw boundary key locally as a full SHA-256 of sorted normalized selected IDs (for example `native_compaction_selection:<64-hex>`). Reuse a small local function; do not expose the key or store it in the accepted record.
- In `RunMemoryFileStore.archiveExactRawTraces`, keep all existing selected-ID/active-membership validation and require the internal archive result before returning `void`.
- Preserve `AcceptedCompactionCommitter` effect order and exceptions. Do not catch/ignore archive failures.
- The target normalizer should simply stop reading the obsolete field; do not special-case its presence or absence.
- Store test coverage should write at least one old-style JSONL row manually, read it through the normal store, assert retained values/head, and assert the returned object lacks the obsolete property. This is the durable evidence for AC-006.
- Keep raw archive assertions in runtime/snapshot/tool-lifecycle integration tests. Delete only resolver construction and origin expectations.
- After deletions, use repository-wide search excluding immutable completed-ticket evidence to confirm no active source/test/doc contract remains.
