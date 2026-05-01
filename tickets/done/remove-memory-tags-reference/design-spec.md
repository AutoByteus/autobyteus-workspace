# Design Spec

## Current-State Read

The current memory implementation has already simplified the compactor-facing contract, but lower-level memory models still carry low-value metadata fields.

Current native compaction path:

`MemoryManager raw traces -> CompactionWindowPlanner -> CompactionResponseParser -> CompactionResultNormalizer -> Compactor -> EpisodicItem/SemanticItem -> MemoryStore -> Retriever -> CompactionSnapshotBuilder -> next LLM prompt`

Current server-side external-runtime recording path:

`AgentRunMemoryRecorder -> RuntimeMemoryEventAccumulator -> RunMemoryWriter -> RawTraceItem -> RunMemoryFileStore -> AgentMemoryService / GraphQL / run-history projection`

Current ownership issues:

- `SemanticItem` still owns `reference`/`tags`, but the current parser and compactor do not produce meaningful values. The only behavior is stale `reference` rendering in `CompactionSnapshotBuilder`.
- `EpisodicItem.tags` has no current consumer.
- `RawTraceItem.tags` are written as labels, but current behavior is governed by explicit fields (`trace_type`, `source_event`, `correlation_id`, tool fields) and archive manifest metadata.
- `toolResultRef` is reference-style metadata with no current producer. The only consumer is a hypothetical prompt `ref=` suffix in tool-result digests.
- `RunMemoryFileStore` currently rewrites raw dictionaries during prune/archive operations. Architecture review noted that adding a sanitizer could strip stale old-shape raw fields during rewrites, but explicit architecture clarification rejects migration/scrubbing/sanitizer code for historical memory. Historical raw/episodic bytes are not a cleanup target for this ticket.
- Docs/tests still exercise removed or soon-to-be-removed shape, so they would keep the obsolete current contract alive if not updated.

Constraints to respect:

- Preserve native compaction, snapshot rebuild, retrieval ordering, and raw-trace archive/prune mechanics for current data.
- Preserve Codex/Claude storage-only recording, provider-boundary dedupe/rotation, active-plus-archive corpus reads, GraphQL/frontend inspection, and run-history fallback projection for current data.
- Use the existing compacted semantic-memory schema gate to drop/reset stale compacted semantic memory when it is not current.
- Do not add backward-compatibility wrappers, dual-path readers, migrations, scrubbers, sanitizers, or stale-file cleanup code for removed fields.

## Intended Change

Make the current memory schema facts/provenance-explicit instead of generic metadata-explicit:

- Semantic memory current contract becomes `id`, `ts`, `category`, `fact`, `salience` only.
- Episodic memory current contract becomes `id`, `ts`, `turn_ids`, `summary`, `salience` only.
- Raw trace current contract removes generic `tags` and `tool_result_ref`; provenance remains in explicit fields.
- Compaction and snapshot code stop carrying/rendering `reference`/`tags`/`ref=` metadata.
- Server runtime-memory input stops accepting/writing `tags` and `toolResultRef`.
- Compacted semantic-memory schema version is bumped and validation rejects stale semantic `reference`/`tags` fields so stale compacted semantic memory is dropped/reset.
- No raw/episodic migration, scrubber, sanitizer, or stale old-shape fixture behavior is introduced. Historical raw/episodic memory with old fields is not supported or cleaned up by this ticket.
- Tests and docs are updated to assert the simplified current contract.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `Current schema`: the fields written and projected by current code after this change.
- `Historical memory`: persisted data from an older schema. This ticket may drop/reset stale compacted semantic memory through the existing gate, but must not add migration or compatibility code for old raw/episodic files.

## Design Reading Order

Read this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. existing owned structure tightening
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove metadata fields from current types/writers/renderers/docs/tests; do not keep optional fields only to accept old behavior.
- Semantic compacted memory: use the existing schema-gate reset path for stale semantic records containing removed metadata. This drops stale compacted semantic memory; it does not migrate old fields.
- Raw/episodic memory: do not create migration, compatibility projection, scrubber, sanitizer, or old-shape cleanup tests. Current model objects and current serializers must not expose or write removed fields. Historical bytes are not a current-schema promise.
- The design is invalid if it preserves `reference`, `tags`, `toolResultRef`, or `tool_result_ref` as current memory-domain fields, or if it adds new code only to migrate/scrub old raw/episodic data.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Native recorded raw traces | Rebuilt LLM memory prompt | Memory compaction subsystem (`Compactor` + `CompactionSnapshotBuilder`) | Main path where semantic/episodic metadata removal must preserve compaction output and prompt rendering. |
| DS-002 | Primary End-to-End | Non-native runtime event / accepted command | Persisted raw trace + working context snapshot | Server agent-memory recorder (`RuntimeMemoryEventAccumulator` + `RunMemoryWriter`) | Main path where raw trace tag/tool-result-reference removal must preserve runtime memory recording for current writes. |
| DS-003 | Primary End-to-End | Provider compaction status event | Active raw trace marker + complete archive segment | `ProviderCompactionBoundaryRecorder` with `RawTraceArchiveManager` | Provider-boundary behavior currently writes tags but actually depends on explicit marker/archive fields. |
| DS-004 | Return-Event | Existing persisted compacted semantic data | Restored or dropped/rebuilt working-context snapshot | `CompactedMemorySchemaGate` + `WorkingContextSnapshotBootstrapper` | Defines how stale semantic `reference`/`tags` are dropped/reset without migration. |
| DS-005 | Return-Event | Persisted raw trace corpus | GraphQL/front-end/run-history inspection views | `AgentMemoryService` and run-history projection transformer | Confirms removed raw metadata is not part of current inspection/replay DTOs. |

## Primary Execution Spine(s)

- DS-001: `RawTraceItem corpus -> CompactionWindowPlanner -> CompactionResponseParser -> CompactionResultNormalizer -> Compactor -> SemanticItem/EpisodicItem -> Retriever -> CompactionSnapshotBuilder -> LLM prompt`
- DS-002: `AgentRun event / accepted command -> RuntimeMemoryEventAccumulator -> RunMemoryWriter -> RawTraceItem -> RunMemoryFileStore -> memory files`
- DS-003: `Provider COMPACTION_STATUS event -> ProviderCompactionBoundaryRecorder -> RunMemoryWriter marker -> RunMemoryFileStore.rotateActiveRawTracesBeforeBoundary -> RawTraceArchiveManager manifest/segment`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Native compaction consumes raw traces, asks the compactor for facts-only semantic entries, normalizes category/salience, persists simplified semantic/episodic items, then rebuilds a prompt from summaries/facts plus raw frontier. | `RawTraceItem`, `CompactionResult`, `NormalizedCompactedMemoryEntry`, `SemanticItem`, `EpisodicItem`, `CompactionSnapshotBuilder` | Memory compaction subsystem | Parser tolerance for model extra keys, low-value noise filtering, semantic schema gate. |
| DS-002 | Server-side recording maps runtime events into explicit raw trace fields and working-context updates; generic tags/tool references disappear from the current write boundary. | `RuntimeMemoryEventAccumulator`, `RuntimeMemoryTraceInput`, `RunMemoryWriter`, `RawTraceItem` | Server agent-memory recorder | Timestamp normalization, sequence initialization, snapshot serialization. |
| DS-003 | Provider boundary recording writes one explicit boundary marker and rotates earlier active traces into a segmented archive using marker id and boundary key; tags do not participate. | `ProviderCompactionBoundaryRecorder`, `RunMemoryWriter`, `RunMemoryFileStore`, `RawTraceArchiveManager` | Provider boundary recorder for marker semantics; archive manager for segment state | Dedupe/retry state, archive manifest ownership, provider metadata payload. |
| DS-004 | Bootstrap checks whether compacted semantic memory is current; removed semantic metadata makes records stale, causing semantic reset and snapshot invalidation before rebuild. | `CompactedMemorySchemaGate`, `SemanticItem.isSerializedDict`, `WorkingContextSnapshotBootstrapper` | Compacted semantic schema gate | Manifest versioning, snapshot invalidation, rebuild planning. |
| DS-005 | Inspection/replay reads current explicit raw-trace fields from active/archive corpus and maps them to GraphQL/frontend/history views; tags remain absent from DTOs. | `AgentMemoryService`, `MemoryTraceEvent`, `MemoryViewConverter`, run-history transformer | Agent memory inspection service / run-history projection | GraphQL conversion, frontend display, fallback replay shaping. |

## Spine Actors / Main-Line Nodes

- `RawTraceItem`: current raw event/provenance record; owns explicit event fields, tool fields, media, correlation id, sequence, timestamp.
- `EpisodicItem`: current compacted narrative summary record; owns summary, turn ids, salience.
- `SemanticItem`: current compacted durable fact record; owns category, fact, salience, id/timestamp.
- `CompactionResultNormalizer`: turns parser facts into categorized/salient semantic item candidates.
- `Compactor`: commits normalized compaction output and prunes/archives eligible raw traces.
- `CompactionSnapshotBuilder`: renders current compacted memory and raw frontier for the next LLM prompt.
- `RuntimeMemoryEventAccumulator`: translates normalized runtime event streams into raw trace write operations.
- `RunMemoryWriter`: storage-only raw trace/snapshot writer for non-native runtimes.
- `ProviderCompactionBoundaryRecorder`: owns provider compaction boundary marker semantics.
- `RunMemoryFileStore`: owns active raw trace file mechanics and raw archive facade methods; it is not being extended into an old-data scrubber.
- `RawTraceArchiveManager`: owns segmented archive internals and manifest state.
- `CompactedMemorySchemaGate`: owns current compacted semantic schema acceptance/reset.

## Ownership Map

| Node | Owns |
| --- | --- |
| `RawTraceItem` | Current raw trace serialization shape; explicit provenance/tool fields; no generic tags/tool-result reference metadata. |
| `EpisodicItem` | Current episodic summary serialization shape; no tag metadata. |
| `SemanticItem` | Current semantic fact serialization shape and schema validation; no reference/tag metadata. |
| `CompactionResultNormalizer` | Category/salience/id/ts normalization and low-value noise filtering; not source/reference metadata. |
| `Compactor` | Conversion from normalized result to current memory items and raw trace prune/archive command. |
| `CompactionSnapshotBuilder` | LLM-readable current memory rendering; fact-only semantic lines. |
| `RuntimeMemoryEventAccumulator` | Runtime-event-to-memory-operation sequencing and snapshot updates. |
| `RunMemoryWriter` | Server-side current raw trace construction and snapshot persistence through shared file store. |
| `ProviderCompactionBoundaryRecorder` | Provider boundary parsing/dedupe/marker write decisions. |
| `RunMemoryFileStore` | Active raw trace appends/reads/rewrite mechanics and archive facade. It must not gain migration/scrubber/sanitizer behavior for stale raw files. |
| `RawTraceArchiveManager` | Archive file/manifest format and idempotent segment writes. |
| `CompactedMemorySchemaGate` | Current semantic-memory schema version gate and stale semantic reset decision. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `FileMemoryStore` | `RunMemoryFileStore` for file IO; memory model classes for serialization | Native memory store facade for agent-root layout | Compatibility or migration behavior for removed metadata. |
| `AgentMemoryService` | `MemoryFileStore` / `RunMemoryFileStore` plus DTO mapping | Read-oriented inspection boundary | Hidden tag/reference interpretation. |
| GraphQL memory view resolver/converter | `AgentMemoryService` | Transport projection | Raw trace metadata fields that are not in the domain DTO. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `SemanticItem.reference` / option / serialization / deserialization projection | No compactor producer or retrieval consumer; snapshot rendering is obsolete leakage | `SemanticItem.fact` and category/salience fields | In This Change | `SemanticItem.isSerializedDict` must reject records containing this field so stale compacted semantic memory is dropped/reset. |
| `SemanticItem.tags` / option / serialization / deserialization projection | No current consumer | `SemanticItem.category` for typed semantic grouping | In This Change | Reject through semantic schema gate when present in persisted semantic records. |
| `EpisodicItem.tags` / option / serialization / deserialization projection | No current consumer | `EpisodicItem.summary`, `turnIds`, `salience` | In This Change | Do not add migration/scrubbing for old episodic JSONL files. |
| `RawTraceItem.tags` / option / serialization / deserialization projection | Redundant with explicit raw trace fields and archive manifest metadata | `traceType`, `sourceEvent`, `correlationId`, `tool*` fields, archive manifest | In This Change | Remove native/server writer tag arrays. Do not add scrubbers for historical raw JSONL files. |
| `RuntimeMemoryTraceInput.tags` and server writer pass-through | Input field only feeds removed raw trace tags | Explicit trace input fields | In This Change | Update accumulator/provider recorder call sites. |
| `RawTraceItem.toolResultRef` / `tool_result_ref` | No current producer/owner; hypothetical prompt reference only | Tool result content/error and future explicitly owned artifact-reference feature if needed | In This Change | Remove digest `reference` and prompt `ref=` suffix. Do not migrate/scrub historical raw JSONL. |
| Tests asserting empty tags/null references or tag-bearing examples | Keeps obsolete current contract alive | Tests for absence/simplified current shape and behavior through explicit fields | In This Change | Do not add old-shape raw/episodic compatibility fixtures. |
| Docs listing memory `tags`, semantic `reference`, `tool_result_ref` | Misleads current schema readers | Simplified memory schema docs | In This Change | Update both `agent_memory_design` docs and server module docs. |

## Return Or Event Spine(s) (If Applicable)

- DS-004 restore return path: `Persisted semantic.jsonl + manifest -> CompactedMemorySchemaGate -> reset/drop or backfilled manifest -> WorkingContextSnapshotBootstrapper -> restored snapshot or rebuilt snapshot`.
- DS-005 inspection return path: `raw_traces.jsonl + complete archive segments -> RunMemoryFileStore complete corpus -> AgentMemoryService.toTraceEvent -> GraphQL / run-history projection -> frontend/history consumers`.

## Bounded Local / Internal Spines (If Applicable)

| Parent Owner | Bounded Local Spine | Why It Matters |
| --- | --- | --- |
| `RuntimeMemoryEventAccumulator` | `Run event -> Resolve turn/segment/tool state -> Write raw trace operation -> Snapshot update` | Shows that `accepted`/`final` tags were side labels; state transitions and snapshot writes are controlled by event types and local maps. |
| `ProviderCompactionBoundaryRecorder` | `COMPACTION_STATUS payload -> parse boundary -> dedupe existing boundary -> append marker -> rotate if eligible` | Shows provider-boundary behavior survives because archive identity uses boundary key/correlation id, not tags. |
| `CompactedMemorySchemaGate` | `Read semantic dicts -> validate current schema -> clear/backfill manifest -> optional snapshot delete` | The correct bounded owner for stale semantic data dropping. |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Low-value fact filtering | DS-001 | `CompactionResultNormalizer` | Drop operational noise and assign salience | Keeps semantic facts concise | Putting it in `SemanticItem` would blur model vs policy. |
| Parser extra-key tolerance | DS-001 | `CompactionResponseParser` | Ignore LLM-returned extra keys while extracting facts | LLMs may produce extra keys despite current contract | Carrying extra keys forward would reintroduce removed fields. |
| Semantic schema gating | DS-004 | `CompactedMemorySchemaGate` | Drop/reset stale compacted semantic memory | Avoids compatibility loaders | If placed in `SemanticItem.fromDict`, direct deserialization becomes a hidden compatibility policy. |
| Timestamp/sequence normalization | DS-002 | `RunMemoryWriter` | Produce ordered raw trace records | Required for stable replay/archive | If mixed into `RawTraceItem`, the model becomes a writer. |
| Archive manifest state | DS-003 | `RawTraceArchiveManager` | Segment files, manifest, idempotent writes | Owns persistence internals | If provider recorder mutates archive internals directly, retry/dedupe fragments. |
| DTO projection | DS-005 | `AgentMemoryService` / converter | Convert raw dicts to inspection DTOs | Separates stored shape from API shape | If raw trace model owns API mapping, transport concerns leak into core memory. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Stale semantic memory handling | Compacted memory schema gate | Extend | Existing owner already clears semantic memory and invalidates snapshots by version/schema | N/A |
| Raw trace archive boundary behavior | `RunMemoryFileStore` + `RawTraceArchiveManager` | Reuse | Archive behavior already uses explicit boundary fields; no migration/scrubbing extension is allowed | N/A |
| Runtime event recording | Server `agent-memory` recorder | Extend | Existing event accumulator/writer own current recording path | N/A |
| Current model serialization | Memory model files | Extend/tighten | Fields live in existing model owners | N/A |
| Artifact/source references | None in current memory schema | Do not create | No current consumer; out of scope | Future work must define a real owner and visible consumer. |
| Raw/episodic historical-file cleanup | None | Do not create | Explicit no-migration/no-compatibility policy | Creating this would violate the architecture clarification. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/models` | Current raw/episodic/semantic model shapes and serialization | DS-001, DS-002, DS-004 | Memory model owners | Extend/tighten | Remove fields at the owning model boundary. |
| `autobyteus-ts/src/memory/compaction` | Parser/normalizer/compactor/tool digest prompt flow | DS-001 | Compaction subsystem | Extend/tighten | Keep facts-only shape through the full path. |
| `autobyteus-ts/src/memory/restore` | Semantic schema gate and snapshot bootstrap | DS-004 | Restore/bootstrap owner | Extend | Version bump + stricter semantic validation; stale semantic memory is dropped/reset. |
| `autobyteus-ts/src/memory/store` | File store and raw archive persistence mechanics | DS-001, DS-003, DS-005 | Storage/archive owners | Reuse | Do not create raw/episodic migration/scrubbing behavior. |
| `autobyteus-server-ts/src/agent-memory` | Non-native runtime memory recording and inspection | DS-002, DS-003, DS-005 | Server memory recorder/service | Extend/tighten | Remove metadata input/writer fields. |
| Memory docs/tests | Durable current-contract evidence | All | Current schema owners | Extend/tighten | Keep docs/tests aligned with current contract; no old-shape raw compatibility tests. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `models/semantic-item.ts` | Core memory models | Semantic model | Remove reference/tags and validate current semantic schema | Existing semantic owner | N/A |
| `models/episodic-item.ts` | Core memory models | Episodic model | Remove tags | Existing episodic owner | N/A |
| `models/raw-trace-item.ts` | Core memory models | Raw trace model | Remove tags/toolResultRef | Existing raw trace owner | N/A |
| `compaction/compaction-result-normalizer.ts` | Compaction | Normalizer | Remove normalized reference/tags fields | Existing normalized result owner | `SemanticItem` category constants |
| `compaction/compactor.ts` | Compaction | Committer | Construct simplified items | Existing compaction commit owner | Models |
| `compaction-snapshot-builder.ts` | Snapshot rendering | Prompt renderer | Render semantic facts only | Existing prompt renderer owner | `SemanticItem` |
| `compaction/tool-result-digest*.ts` | Compaction prompt digest | Tool digest | Remove digest reference | Existing digest owner | `RawTraceItem` |
| `compaction/compaction-task-prompt-builder.ts` | Compaction prompt | Task prompt renderer | Remove `ref=` suffix | Existing prompt owner | `ToolResultDigest` |
| `store/compacted-memory-manifest.ts` | Store/schema | Schema version | Bump current semantic schema version | Existing manifest owner | N/A |
| `restore/compacted-memory-schema-gate.ts` | Restore/schema | Schema gate | Drop/reset stale semantic records with removed metadata | Existing schema gate owner | `SemanticItem.isSerializedDict` |
| `memory-manager.ts` | Native memory recording | Native recorder | Remove tag writes | Existing native recorder owner | `RawTraceItem` |
| `agent-memory/domain/memory-recording-models.ts` | Server memory domain | Runtime input contract | Remove tags/toolResultRef input | Existing server domain owner | `RawTraceItem` media type |
| `agent-memory/store/run-memory-writer.ts` | Server memory store adapter | Writer | Remove pass-through | Existing writer owner | `RawTraceItem` |
| `agent-memory/services/runtime-memory-event-accumulator.ts` | Server memory recorder | Event accumulator | Remove `accepted`/`final` tags | Existing event owner | Runtime event types |
| `agent-memory/services/provider-compaction-boundary-recorder.ts` | Server memory recorder | Provider boundary recorder | Remove provider tags; keep explicit payload/correlation | Existing boundary owner | Archive/store boundary |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Semantic current schema validation | Keep in `SemanticItem.isSerializedDict` | Core memory models | Validation is unique to semantic current schema | Yes | Yes | A compatibility schema registry for removed metadata. |
| Raw trace provenance | Existing `RawTraceItem` fields | Core memory models | Existing explicit fields already carry provenance | Yes | Yes | A generic metadata/tag bag. |
| Provider boundary metadata | Existing provider marker `toolResult` payload + archive manifest | Server agent-memory/store | Boundary-specific metadata is already explicit | Yes | Yes | Free-form tag labels. |
| Raw/episodic old-data cleanup | None | N/A | Not shared because it must not exist | N/A | N/A | Migration/scrubber/sanitizer code. |

No new reusable owned file is needed. The correct action is semantic tightening of existing owned structures.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SemanticItem` | Yes after removal | Yes | Low | Keep category/fact/salience as the only domain fields. |
| `EpisodicItem` | Yes after removal | Yes | Low | Keep summary/turn ids/salience. |
| `RawTraceItem` | Yes after removal | Yes | Low | Keep explicit event/tool/media/correlation fields. |
| `RuntimeMemoryTraceInput` | Yes after removal | Yes | Low | Match `RawTraceItem` current writable fields. |
| `ToolResultDigest` | Yes after removal | Yes | Low | Keep trace/tool/status/summary only. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/models/semantic-item.ts` | Core memory models | Semantic model/schema | Current semantic item shape and validation; reject removed metadata fields | Existing semantic model owner | Category constants |
| `autobyteus-ts/src/memory/models/episodic-item.ts` | Core memory models | Episodic model | Current episodic item shape | Existing episodic model owner | N/A |
| `autobyteus-ts/src/memory/models/raw-trace-item.ts` | Core memory models | Raw trace model | Current raw trace item shape | Existing raw trace model owner | N/A |
| `autobyteus-ts/src/memory/compaction/compaction-result-normalizer.ts` | Compaction | Normalizer | Category/fact/salience/id/ts normalization only | Existing normalizer owner | Semantic category constants |
| `autobyteus-ts/src/memory/compaction/compactor.ts` | Compaction | Committer | Persist simplified episodic/semantic items | Existing compactor owner | Models |
| `autobyteus-ts/src/memory/compaction-snapshot-builder.ts` | Snapshot rendering | Prompt renderer | Render facts-only semantic sections | Existing renderer owner | Semantic categories |
| `autobyteus-ts/src/memory/compaction/tool-result-digest.ts` | Compaction | Digest type | Tool result digest without reference | Existing digest type owner | N/A |
| `autobyteus-ts/src/memory/compaction/tool-result-digest-builder.ts` | Compaction | Digest builder | Build digest without reference | Existing digest builder owner | Raw trace model |
| `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` | Compaction | Task prompt renderer | Render digest without `ref=` | Existing task prompt owner | Digest type |
| `autobyteus-ts/src/memory/store/compacted-memory-manifest.ts` | Store/schema | Manifest version | Increment semantic schema version | Existing manifest owner | N/A |
| `autobyteus-ts/src/memory/restore/compacted-memory-schema-gate.ts` | Restore/schema | Schema gate | Drop/reset stale semantic records via tightened validation/version | Existing restore owner | Semantic validation |
| `autobyteus-ts/src/memory/memory-manager.ts` | Native memory runtime | Native recorder | Emit current raw traces without tags | Existing native recorder owner | Raw trace model |
| `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts` | Server agent-memory | Runtime input contract | Remove tags/toolResultRef | Existing domain owner | RawTraceMedia type |
| `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | Server agent-memory | Writer adapter | Construct current raw traces | Existing writer owner | Raw trace model |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Server agent-memory | Event accumulator | Write accepted/assistant traces without tags | Existing accumulator owner | Runtime event parsing helpers |
| `autobyteus-server-ts/src/agent-memory/services/provider-compaction-boundary-recorder.ts` | Server agent-memory | Provider boundary recorder | Write boundary markers without tags; keep explicit metadata | Existing provider recorder owner | Writer/archive boundary |
| Focused tests/docs | Validation/docs | Current contract evidence | Replace metadata assertions/examples; do not add old raw/episodic compatibility fixtures | Existing test/doc owners | N/A |

## Ownership Boundaries

- Model classes own current serialization shape. Callers must not keep removed metadata as optional model fields.
- Compaction owns LLM-facing semantic fact normalization/rendering. It must not route source/reference metadata through semantic memory.
- Server agent-memory owns storage-only external-runtime recording. It must not write tag labels when explicit trace fields already encode behavior.
- Store/archive classes own persistence mechanics, not old-schema cleanup policy. Do not extend them into migration/scrubber/sanitizer owners for historical raw/episodic files.
- Semantic schema gate owns stale compacted semantic drop/reset. Implementation must not add a second semantic compatibility path elsewhere.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SemanticItem` current schema | `toDict`, `fromDict`, `isSerializedDict` | `Compactor`, `Retriever`, schema gate | Callers passing/reading `reference` or `tags` | Add a new owned semantic field only with a current consumer and schema version. |
| `RunMemoryWriter` | `RawTraceItem` construction and sequence handling | `RuntimeMemoryEventAccumulator`, `ProviderCompactionBoundaryRecorder` | Callers writing current raw traces with tag/reference fields | Extend `RuntimeMemoryTraceInput` with explicit fields only when current behavior needs them. |
| `ProviderCompactionBoundaryRecorder` | Provider boundary parse/dedupe/marker decision | Runtime event accumulator | Archive behavior encoded through raw trace tags | Add explicit boundary payload/manifest fields. |
| `RawTraceArchiveManager` | Manifest/segment state | `RunMemoryFileStore` | Provider recorder manipulating archive files directly, or archive manager interpreting tags | Add explicit store/archive methods, not tag labels. |
| `CompactedMemorySchemaGate` | Semantic schema reset/backfill | `WorkingContextSnapshotBootstrapper` | Direct bootstrap ignoring stale semantic metadata | Tighten schema gate validation/version. |

## Dependency Rules

Allowed:

- Compaction code may depend on memory model classes and store interfaces.
- Server `agent-memory` may depend on exported `RawTraceItem`, `RawTraceMedia`, and `RunMemoryFileStore` from `autobyteus-ts`.
- Inspection services may read persisted dicts and project explicit current fields.
- Restore/bootstrap may use `SemanticItem.isSerializedDict` to judge compacted semantic current schema.

Forbidden:

- No caller may depend on both a current memory model and removed metadata fields as if they are still part of the model.
- No runtime recorder may encode behavior in `tags` instead of explicit fields.
- No compaction prompt builder may render `reference`/`ref=` from generic metadata.
- No migration, fallback, scrubber, sanitizer, or dual-path read should preserve or clean up `reference`, `tags`, `toolResultRef`, or `tool_result_ref` as an old-schema compatibility concern.
- No tests should seed old raw/episodic JSONL solely to validate migration/scrubbing behavior.
- No broad repository-level `tags`/`reference` edits outside memory-domain scope.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `new SemanticItem(options)` | Semantic memory item | Construct current semantic fact | `id + ts + category + fact + optional salience` | Remove `reference`/`tags` from options. |
| `SemanticItem.toDict/fromDict/isSerializedDict` | Semantic persisted schema | Serialize/deserialize/validate current semantic record | semantic record dict | Validation rejects removed semantic metadata fields. |
| `new EpisodicItem(options)` | Episodic memory item | Construct current summary record | `id + ts + turnIds + summary + optional salience` | Remove `tags`. |
| `new RawTraceItem(options)` | Raw trace item | Construct current raw trace | explicit event/tool/media/correlation fields | Remove `tags` and `toolResultRef`. |
| `RuntimeMemoryTraceInput` | Server raw trace write request | Storage-only runtime trace input | explicit event/tool/media/correlation fields | Match `RawTraceItem` writable current fields. |
| `RunMemoryWriter.appendRawTrace(input)` | Server writer | Construct and persist current raw trace | `RuntimeMemoryTraceInput` | No metadata pass-through. |
| `ProviderCompactionBoundaryRecorder.record(event)` | Provider boundary marker | Parse/dedupe/write/rotate provider boundary | event payload with boundary key/runtime/provider/source | Marker uses `correlationId` and toolResult payload, not tags. |
| `ToolResultDigestBuilder.build(trace)` | Tool digest | Build compaction prompt summary of tool result | raw trace id/tool fields/status/summary | Remove reference. |
| `CompactionSnapshotBuilder.build(...)` | Prompt snapshot | Render compacted memory and frontier | system prompt + memory bundle + plan | Render semantic facts only. |

Rule check: subject identities remain explicit (`runId`, `turnId`, `boundaryKey`, `traceId`, semantic item id); no generic metadata selector is introduced.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SemanticItem` | Yes | Yes | Low | Remove metadata options. |
| `RawTraceItem` | Yes | Yes | Low | Remove generic metadata bag. |
| `RuntimeMemoryTraceInput` | Yes | Yes | Low | Keep explicit fields only. |
| `ProviderCompactionBoundaryRecorder.record` | Yes | Yes | Low | Preserve boundary key/correlation id. |
| `CompactedMemorySchemaGate.ensureCurrentSchema` | Yes | Yes | Low | Bump version and tighten validation. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Semantic item | `SemanticItem` | Yes | Low | Keep name; tighten fields. |
| Episodic item | `EpisodicItem` | Yes | Low | Keep name; tighten fields. |
| Raw trace item | `RawTraceItem` | Yes | Low | Keep name; remove generic metadata. |
| Runtime memory input | `RuntimeMemoryTraceInput` | Yes | Low | Keep name; align fields. |
| Provider boundary recorder | `ProviderCompactionBoundaryRecorder` | Yes | Low | Keep name; explicit boundary metadata. |
| Tool result digest | `ToolResultDigest` | Yes | Low | Keep name; no reference field. |

## Applied Patterns (If Any)

- Schema gate: existing `CompactedMemorySchemaGate` remains the semantic schema-version gate and stale reset owner.
- Adapter: `RunMemoryWriter` remains the server-side adapter from runtime-event domain input to shared `RawTraceItem` persistence.
- Repository/store facade: `RunMemoryFileStore` / `RawTraceArchiveManager` remain persistence boundaries for active and archived raw traces, without adding migration/scrubber behavior.
- No new pattern should be introduced for this cleanup.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/models/semantic-item.ts` | File | Semantic model | Remove `reference`/`tags`; validate current schema | Existing owner | Compatibility fields or migration logic. |
| `autobyteus-ts/src/memory/models/episodic-item.ts` | File | Episodic model | Remove `tags` | Existing owner | Tag projection or migration. |
| `autobyteus-ts/src/memory/models/raw-trace-item.ts` | File | Raw trace model | Remove `tags`/`toolResultRef`/`tool_result_ref` | Existing owner | Generic metadata bag or old-data scrubber. |
| `autobyteus-ts/src/memory/compaction/compaction-result-normalizer.ts` | File | Compaction normalizer | Remove normalized metadata fields | Existing owner | Source/reference metadata. |
| `autobyteus-ts/src/memory/compaction/compactor.ts` | File | Compaction committer | Construct simplified items | Existing owner | Empty metadata placeholders. |
| `autobyteus-ts/src/memory/compaction-snapshot-builder.ts` | File | Prompt renderer | Render facts only | Existing owner | Semantic reference rendering. |
| `autobyteus-ts/src/memory/compaction/tool-result-digest.ts` | File | Digest type | Remove reference | Existing owner | Reference-style fields. |
| `autobyteus-ts/src/memory/compaction/tool-result-digest-builder.ts` | File | Digest builder | Stop reading `toolResultRef` | Existing owner | Artifact reference policy. |
| `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` | File | Task prompt renderer | Remove optional digest `ref=` rendering | Existing owner | Reference metadata rendering. |
| `autobyteus-ts/src/memory/store/compacted-memory-manifest.ts` | File | Schema manifest | Bump version | Existing owner | Migration policy. |
| `autobyteus-ts/src/memory/restore/compacted-memory-schema-gate.ts` | File | Schema gate | Drop/reset stale semantic metadata | Existing owner | Raw/episodic compatibility behavior. |
| `autobyteus-ts/src/memory/memory-manager.ts` | File | Native recorder | Remove tag writes | Existing owner | Generic tag labels. |
| `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts` | File | Server memory domain input | Remove `tags`/`toolResultRef` | Existing owner | Fields not accepted by current raw trace model. |
| `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | File | Server writer | Construct current raw traces | Existing owner | Metadata pass-through. |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | File | Runtime event recorder | Remove tag arrays | Existing owner | Hidden behavior labels. |
| `autobyteus-server-ts/src/agent-memory/services/provider-compaction-boundary-recorder.ts` | File | Provider boundary recorder | Remove tag arrays; keep explicit payload | Existing owner | Archive semantics encoded as tags. |
| `autobyteus-ts/docs/agent_memory_design.md` | File | Memory docs | Simplified schema/examples | Existing doc | Removed fields as current contract. |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` | File | Memory docs | Mirror simplified schema/examples | Existing doc | Removed fields as current contract. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | File | Server memory docs | Raw trace docs without tags | Existing doc | Tag claims. |
| Focused memory tests under `autobyteus-ts/tests` and `autobyteus-server-ts/tests/unit/agent-memory` | Files | Validation | Assert simplified current shape and preserved behavior | Existing tests | Old raw/episodic migration/scrubbing fixtures. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/models` | Main-Line Domain-Control | Yes | Low | Model files already own one current memory subject each. |
| `autobyteus-ts/src/memory/compaction` | Main-Line Domain-Control | Yes | Low | Compaction prompt/result/digest concerns are cohesive. |
| `autobyteus-ts/src/memory/store` | Persistence-Provider | Yes | Low | Store/archive behavior remains behind store owners; no old-data migration responsibility is added. |
| `autobyteus-ts/src/memory/restore` | Off-Spine Concern | Yes | Low | Schema/bootstrap handling serves memory restore and stale semantic dropping. |
| `autobyteus-server-ts/src/agent-memory` | Mixed Justified | Yes | Medium | Contains domain/service/store layers for server memory; this ticket changes existing owners only, no new folder split needed. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Semantic record | `{ id, ts, category, fact, salience }` | `{ id, ts, category, fact, reference: null, tags: [], salience }` | Empty optional metadata keeps an obsolete contract alive. |
| Raw provider boundary marker | `trace_type = provider_compaction_boundary`, `correlation_id = boundary_key`, `tool_result.semantic_compaction = false`, archive manifest `boundary_key` | `tags = ["provider_compaction_boundary", "rotation_boundary", ...]` as behavioral source | Explicit fields already own behavior; tags are redundant. |
| Tool result digest | `TOOL_RESULT_DIGEST: run_bash status=success summary=...` | `TOOL_RESULT_DIGEST: run_bash status=success ref=... summary=...` | `ref` has no current producer/owner and reintroduces reference metadata. |
| Stale semantic handling | Schema gate drops/resets record containing `reference`/`tags` under new manifest version | `fromDict` silently preserves or maps removed fields | Keeps no-compatibility policy clear and centralized. |
| Raw/episodic historical files | No special migration/scrubber code; current writers simply stop producing removed fields | Add tests/utilities to seed old raw records and verify scrubbed archive rewrites | The codebase should not grow old-schema cleanup paths for historical memory. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `reference`/`tags` optional on `SemanticItem` but stop writing them | Would reduce type breakage | Rejected | Remove fields and schema-gate/drop stale semantic records containing them. |
| Silently ignore semantic `reference`/`tags` as current schema | Would avoid clearing old semantic memory | Rejected | Treat presence as stale compacted-memory schema and reset/drop through existing gate. |
| Migrate semantic `reference` into fact text | Could preserve old source hints | Rejected | Do not preserve low-value metadata; future source pointers need explicit design. |
| Keep raw trace `tags` for debugging while not exposing them | Could preserve manual labels | Rejected | Use explicit fields/source events/tool payload/archive manifest for current debugging. |
| Keep `tool_result_ref` for future artifact references | Could support hypothetical future feature | Rejected | Remove now; future artifact references need a real owner and consumer. |
| Add raw/episodic migration/scrubber/sanitizer code | Could mutate old files to remove stale fields | Rejected | Current writers stop producing fields. Historical raw/episodic memory is not migrated or supported by cleanup code. |
| Add cleanup-guard tests with old raw fixtures | Could prove stale raw fields are scrubbed | Rejected | Do not add tests for migration/scrubbing behavior that should not exist. |

## Derived Layering (If Useful)

- Core memory model layer: `RawTraceItem`, `EpisodicItem`, `SemanticItem`.
- Compaction layer: parser/normalizer/compactor/snapshot/digest.
- Persistence layer: `MemoryStore`, `RunMemoryFileStore`, `RawTraceArchiveManager`.
- Server adapter layer: `RuntimeMemoryEventAccumulator`, `RunMemoryWriter`, `ProviderCompactionBoundaryRecorder`.
- Inspection/projection layer: `AgentMemoryService`, GraphQL converter, frontend raw trace view, run-history projection.

Layering is explanatory only; the authoritative ownership is the spine and boundary model above.

## Migration / Refactor Sequence

This section describes refactor order only. It must not introduce migration code.

1. Tighten model shapes:
   - Remove `reference`/`tags` from `SemanticItemOptions`, class state, `toDict`, and `fromDict`.
   - Update `SemanticItem.isSerializedDict` to require current fields and reject presence of removed semantic metadata fields.
   - Remove `tags` from `EpisodicItem`.
   - Remove `tags` and `toolResultRef` from `RawTraceItem`.
2. Update semantic schema version:
   - Bump `COMPACTED_MEMORY_SCHEMA_VERSION` from `2` to the next version.
   - Keep reset/drop ownership in `CompactedMemorySchemaGate`.
   - Do not migrate old semantic fields into new fields.
3. Update compaction path:
   - Remove `reference`/`tags` from `NormalizedCompactedMemoryEntry` and normalizer output.
   - Remove empty episodic tags and semantic metadata pass-through in `Compactor`.
   - Render semantic facts only in `CompactionSnapshotBuilder`.
   - Remove `ToolResultDigest.reference`, `ToolResultDigestBuilder` reference extraction, and task prompt `ref=` rendering.
4. Update native/server recording path:
   - Remove native `MemoryManager` tag writes.
   - Remove `RuntimeMemoryTraceInput.tags` and `toolResultRef`.
   - Remove pass-through from `RunMemoryWriter`.
   - Remove tag arrays from `RuntimeMemoryEventAccumulator` and `ProviderCompactionBoundaryRecorder`.
5. Do **not** add raw/episodic old-file migration/scrubbing:
   - Do not add a raw trace rewrite sanitizer for historical `tags`/`tool_result_ref`.
   - Do not add old-shape raw/episodic fixtures to prove scrub behavior.
   - Do not add compatibility readers that preserve or map removed fields.
6. Update tests:
   - Replace assertions that check `reference === null` / `tags.length === 0` with absence/simplified current-shape checks.
   - Update schema-gate tests to verify stale semantic `reference`/`tags` triggers reset/drop under the new version.
   - Update provider-boundary tests to assert explicit fields/manifest behavior without tag setup.
   - Update tool digest/prompt tests to assert no `ref=`/`tool_result_ref` path.
   - Add/adjust tests only for current writes/projections; do not add migration/scrubber tests for historical raw/episodic files.
7. Update docs:
   - Remove memory-domain `tags`, semantic `reference`, and `tool_result_ref` from current model docs/examples.
   - Keep compactor facts-only guidance.
8. Run validation in a prepared dependency environment:
   - `autobyteus-ts` focused memory unit tests and memory compaction integration tests.
   - `autobyteus-server-ts` agent-memory recorder/provider-boundary tests.
   - Typecheck/build as practical for changed packages.

## Key Tradeoffs

- Dropping/resetting stale compacted semantic memory can discard old compacted facts, but this preserves a clean current semantic contract and uses the existing gate.
- Historical raw/episodic JSONL files may still physically contain old keys. This is acceptable because historical memory is not a current compatibility target and adding scrubbers would make the codebase messier.
- Removing `tool_result_ref` closes a hypothetical extension point; this is acceptable because it lacks a current producer/owner.
- Exported TypeScript model shape changes may affect external consumers, but preserving dead fields would contradict the requested cleanup and no-compatibility policy.

## Risks

- Broad `tags`/`reference` search results include many unrelated repository concepts; implementation must scope removals narrowly.
- Test dependencies are not installed in the ticket worktree at design time, so downstream must establish validation environment before relying on green tests.
- The duplicate/mirrored memory docs (`agent_memory_design.md` and `agent_memory_design_nodejs.md`) can drift if only one is updated.
- If implementation forgets to make semantic validation reject removed fields, stale semantic records with `reference` may still render incorrectly or silently persist.
- If implementation adds raw/episodic stale-file cleanup utilities, it violates the explicit no-migration/no-compatibility clarification.

## Guidance For Implementation

- Prefer deletion over replacement placeholders. Do not keep `tags: []`, `reference: null`, or `toolResultRef: null`.
- Do not add migration/scrubber/sanitizer code for raw/episodic historical files.
- Do not add old-shape raw/episodic fixtures whose purpose is to verify cleanup/migration behavior.
- Use exact-scope searches after editing:
  - `rg -n "\b(reference|tags|toolResultRef|tool_result_ref)\b" autobyteus-ts/src/memory autobyteus-server-ts/src/agent-memory autobyteus-ts/tests/unit/memory autobyteus-ts/tests/integration/agent/memory-compaction* autobyteus-server-ts/tests/unit/agent-memory autobyteus-ts/docs/agent_memory_design*.md autobyteus-server-ts/docs/modules/agent_memory.md -S`
- Expected remaining matches after implementation should be only intentional parser-tolerance or schema-gate reset tests/docs statements about removed stale fields, if any. Current schemas/writers/docs examples should not list the removed fields.
- Do not edit unrelated release tags, XML tags, skill references, or app/team references.
- Validate provider-boundary behavior by asserting marker trace type/correlation id and archive manifest fields, not tags.
- Validate stale semantic handling through `CompactedMemorySchemaGate` and manifest version, not through direct preservation in `SemanticItem.fromDict`.
