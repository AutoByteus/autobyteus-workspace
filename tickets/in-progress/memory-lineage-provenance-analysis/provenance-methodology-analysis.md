# Memory Provenance And Lineage Methodology Analysis

## Status And Scope

- Status: Complete evidence supplement, aligned to recurrent replacement/reference-only lineage and SR-004 separation/current-head decisions
- Date: 2026-07-30
- Related requirements: REQ-001 through REQ-006, REQ-008, and REQ-009
- Related acceptance criteria: AC-001 through AC-006 and AC-008 through AC-013
- Normative relationship: `requirements.md`, `memory-context-and-lineage-contract.md`, and `use-case-data-flow-spine-map.md` define intended behavior and execution/ownership constraints. This file records repository/methodology evidence and the implications of the user-directed recurrent and no-content-duplication decisions.

This analysis is limited to native memory compaction, automatic coarse direct and recursive provenance for episode/semantic outputs, origin/time queries, runtime-neutral raw identity, current-schema restore, and the required startup reset of disposable pre-lineage derived state. It does not define fine LLM citations, work-evidence chunking, byte-for-byte prompt replay, cross-run extraction, fact-level correction APIs, or filesystem crash recovery.

## Executive Conclusion

The target memory process is recurrent:

```text
M(n) = compact(M(n-1) + R(n))
```

where `M(n-1)` is the bounded memory output listed by the last successful lineage record and `R(n)` is the newly selected settled natural-activity prefix. Provenance is recorded without copying content:

1. `MemoryManager` captures the current lineage head outside the LLM strategy; the planner identifies the compacted-memory message region by message-local kind/range and selects natural units whose exact raw-trace IDs are already known.
2. The compactor reads one naturally ordered logical WorkingContext prefix containing the current memory projection, when present, followed by those selected units, and returns one complete bounded replacement output.
3. Application code reuses the pending `compactionId` and assigns episode and semantic IDs.
4. After the strategy returns an IDless proposal, `MemoryManager` verifies/maps the captured baseline lineage head, assigns output IDs, and builds/validates the accepted candidate. Commit then archives exactly the selected raw records, persists output rows, and publishes one `CompactionLineageRecord`:

   ```text
   compactionId + optional previousCompactionId
   + run-relative raw-trace archive file_name
   -> produced episode/semantic IDs
   ```

5. Raw content remains only in active/archive raw traces. Prior/output memory content remains only in episodic/semantic storage.
6. The run-scoped resolver follows lineage records recursively and resolves authorized raw content from the authoritative raw store.

The LLM does **not** generate database pointers, raw IDs, compaction IDs, or fine evidence labels. The application already owns the pending compaction identity and assigns output artifact identities, so it creates the relation deterministically.

## Correction: Why A Content-Bearing Snapshot Is Wrong Here

An earlier draft proposed a content-bearing evidence-copy artifact containing prior-memory projection, selected message content, and rendered task content. That shape is rejected for this ticket because:

- selected activity content already exists in authoritative raw traces;
- prior and output memory content already exists in durable memory;
- copying it creates a third content authority and additional retention/redaction burden;
- exact rendered-prompt replay is not the requested product function; and
- a one-to-one content snapshot plus activity record adds unnecessary indirection.

The product need is a derivation relation, not a second evidence repository. The replacement `CompactionLineageRecord` therefore contains the existing successful `compactionId`, optional `previousCompactionId`, the existing run-relative `file_name` of the immutable raw-trace archive file containing exactly the selected records, produced episode/semantic IDs, and compact metadata. It repeats neither raw IDs nor content. It invents no activity, generation, or segment ID and does not expose the internal archive boundary key. Prompt/selection versions and optional hashes may support audit, but hashes do not replace explicit relations.

## Current Repository Findings

### 1. Raw traces already provide authoritative leaf content and identity

`RawTraceItem` and server-written raw records carry IDs, occurrence time, turn/per-turn order, type/payload, and relevant tool/media/correlation fields. Identity must be compound and run/member scoped:

```text
(runtime-neutral run/member identity, raw trace ID)
```

Timestamps, absolute JSONL paths, and mutable `active` membership are not primary identity. Individual raw records use run/member scope plus raw trace ID. The coarse compaction relation uses the same run/member scope plus the completed archive manifest's existing run-relative `file_name`.

### 2. Current compaction already knows the selected raw inputs

The production path is:

```text
provider usage observation
-> threshold/pending request
-> WorkingContextMessageWindowPlanner
-> selected natural message/tool units
-> collectMessageRawTraceIds(...)
-> StructuredJsonCompactionStrategy
```

The planner already returns `rawTraceIdsToArchive`, and `pruneRawTracesById(..., true)` archives exactly those removed records in one `native_compaction` archive file. Internally, the archive manager calls this file a segment and uses a boundary key for idempotency. The target lineage record stores only the completed manifest entry's existing run-relative `file_name`. The archive file owns exact membership/content and the manifest entry owns count/time bounds, so lineage needs no repeated raw-ID list, content copy, fabricated segment ID, exposed boundary key, semantic matching, or second LLM pass.

### 3. Current planner drops the memory input that influenced later work

`WorkingContextMessageUnitBuilder` identifies `sourceKind: "compacted_memory"`, and `WorkingContextMessageWindowPlanner` excludes that unit from natural candidates. Current sequential compaction therefore summarizes only later natural units even though those activities occurred while the agent used the memory projection.

The target includes the compacted-memory constituent in the selected logical conversation prefix using only its message-local kind/range. Separately, `MemoryManager` captures the lineage tail and maps that application-owned baseline to `previousCompactionId`; the snapshot and strategy proposal carry no compaction/output IDs. When lineage is absent/empty, there is no current derived-memory output. The LLM-facing history does not label this application mechanic or copy prior-memory text into lineage.

### 4. Current projection mixes outputs from multiple successful compactions

`CompactedMemoryContextProjector` currently retrieves the latest three episodic rows and at most twenty semantic rows across the durable store. It does not preserve a producing-compaction identity.

The target treats each successful `compactionId` as the identity of its one output bundle and projects only the bundle listed by the last successful lineage record. Older rows remain immutable history and are reached through lineage.

### 5. Current derived memory loses available lineage

`StructuredJsonCompactionStrategy` currently creates one episode with unscoped turn IDs and semantic rows without source refs. Their timestamp is derivation time, not source occurrence. Neither the direct selected raw IDs nor prior-memory identity survives in a durable input/output relation.

### 6. Readable work-trace Markdown is not the compaction authority

`AgentWorkTraceProjectionService` regenerates Markdown/manifest output from archive plus active raw sources. Its current production caller belongs to an excluded workflow. Native memory compaction does not consume this package. The target lineage resolver may materialize a readable evidence view from referenced raw records, but it does not make mutable Markdown the source identity.

### 7. Snapshot and raw evidence remain separate

Raw traces answer what happened. `WorkingContext` and `working_context_snapshot.json` answer what the native model currently sees/resumes from. A lineage record answers which existing inputs generated which output. None replaces another.

A valid v5 snapshot restores finalized messages, media/tool payloads, and message-local constituent ranges only; it contains no compaction/output/current-state identity. Before any runtime restore, the required startup migration removes `episodic.jsonl`, `semantic.jsonl`, `working_context_snapshot.json`, and `compacted_memory_manifest.json` from pre-lineage standalone/team-member run directories while preserving active/archive raw traces and their manifest. Normal runtime supports only v5 plus the current lineage/output model: absent/empty lineage means no current derived memory, while the last valid record lists the exact current outputs.

### 8. Reachable failure ends before current writes

A runner exception or response-parser rejection is reachable through normal pending compaction. The executor keeps the pending `compactionId` and retries on the next normal request. Target failure additionally publishes no lineage record and leaves the lineage head unchanged.

Interrupted filesystem publication and custom/test-only invalid strategies do not justify a transaction journal in this ticket.

### 9. Existing manifest and startup migration behavior do not provide current-compaction state

On `origin/personal@1b8d8c2f22c5f846dd82cdd706f594103d1b4e1e`, `compacted_memory_manifest.json` has only:

```text
{
  "schema_version": 3,
  "last_reset_ts": <Date.now() epoch milliseconds>
}
```

It is a semantic-schema reset marker used by `CompactedMemorySchemaGate`, not a compaction list, lineage record, output selector, or current-compaction authority. The target reset deletes it and adds no replacement manifest or one-field state file.

The same branch's real server path is `startConfiguredServer -> AppDataMigrationRunner.runPending -> bootstrapBuiltInAgents -> buildApp -> app.listen`. Today `startConfiguredServer` catches/logs a runner throw and continues. Therefore fail-closed startup requires both boundaries: the runner persists all attempted required results and throws after any non-startable result; `startConfiguredServer` logs and rethrows before bootstrap/build/listen. The reset returns `FAILED` for every discovery/deletion failure, while existing `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` remain startable.

## Methodology Comparison

| Method | What it provides | Fit for this ticket |
| --- | --- | --- |
| Explicit artifact/activity relations | Records actual direct input/output IDs | Adopt as authority |
| Recurrent derivation chain | Represents `M(n-1) + R(n) -> M(n)` truthfully | Adopt |
| Existing `compactionId`/`previousCompactionId` plus run-relative raw-trace archive `file_name` | Resolves inputs/outputs without parallel identities or repeated evidence | Adopt |
| Cycle-safe recursive traversal | Resolves ultimate raw roots without flattening every ancestor | Adopt |
| Reference-resolved evidence view | Loads raw content only when an authorized caller asks | Adopt |
| Rebuildable root index/cache | Speeds long-chain queries without becoming identity | Optional design optimization |
| Content hash | Detects change or verifies reconstructed input | Optional integrity only |
| Absolute path or filename not validated against the run's completed archive manifest | Identifies a storage location without trustworthy run/completion scope | Reject |
| Content-bearing work-evidence copy | Enables independent replay but duplicates authoritative content | Reject for this ticket |
| Post-hoc semantic similarity | Finds related text | Not provenance |
| Fine LLM-selected citations | Lets a model identify detailed support rows | Deferred and unnecessary |

W3C PROV and ML Metadata support the chosen activity/input/output relation and recursive origin. Generative Agents demonstrates recursive memory pointers, but the target avoids its detailed LLM citation workload and does not copy the cited records into each derived record.

## Required Logical Model

### Authoritative content artifacts

- `RawTraceRecord`
  - authoritative original activity content;
  - addressed by compound run/member plus raw trace ID;
  - may move from active to archive without identity/content change.
- `EpisodeArtifact`
  - stable ID, summary, derivation time;
  - one of one through three outputs of one successful compaction.
- `SemanticArtifact`
  - stable ID, category/fact/salience, derivation time;
  - one of at most twenty accepted facts from one successful compaction.

The authoritative artifact-to-compaction relation is the single `CompactionLineageRecord` output list (plus a rebuildable lookup index), not a second independently writable producing-compaction field on every content row.

### Reference-only derivation record

`CompactionLineageRecord` contains:

- schema version;
- existing successful `compactionId`;
- run/member scope;
- optional `previousCompactionId`;
- existing run-relative `file_name` of the completed raw-trace archive file containing exactly this operation's selected raw records;
- produced episode and semantic IDs;
- derivation time;
- runtime/provider/model context;
- selection-policy and prompt-contract versions; and
- optional rendered-input and canonical-record hashes.

It contains no parallel activity/generation ID, repeated raw-ID list, raw-message text, memory text, episode/fact text, tool output, media payload, rendered prompt, fabricated segment ID, or internal archive boundary key. Direct membership/count/time bounds come from the referenced raw-trace archive file and manifest entry.

### Current compaction state

One successful compaction has one bounded output bundle and one `compactionId`; no parallel bundle-level identity exists. The last successfully appended lineage record identifies the only successful compaction whose output is projected by default; absent/empty lineage means none.

## Authoritative Relations

```text
CompactionLineageRecord identifiedBy compactionId
CompactionLineageRecord hasPreviousCompaction previousCompactionId
CompactionLineageRecord hasDirectRawTraceArchiveFile RunRelativeFileName
CompactionLineageRecord produced EpisodeArtifact/SemanticArtifact IDs
```

The canonical `raw_traces_manifest.json` validates that the recorded run-relative `file_name` belongs to a completed immutable archive file and records first/last trace/time/count metadata. Recursive origin follows `previousCompactionId -> CompactionLineageRecord` until every branch terminates at referenced raw-trace archive files. A graph database is unnecessary for this run-local chain.

## Relationship Construction Ownership

| Step | Owner | Required behavior |
| --- | --- | --- |
| Raw identity/content | Existing raw writer/store | Preserve run-scoped identity/content through active/archive movement |
| Previous compaction identity | `MemoryManager` plus lineage repository | Capture the current lineage head before planning, verify it before acceptance, and map it to `previousCompactionId` without placing it in the snapshot or strategy proposal |
| Natural prefix | Compaction planner | Select settled units and expose raw IDs used to build one raw-trace archive file |
| Raw-trace archive file | Raw archive manager | Archive exactly the selected records and return the completed manifest entry, including its existing run-relative `file_name` |
| Replacement content | Compactor LLM | Return a complete bounded latest output bundle, not pointers |
| Compaction/output identity | `PendingCompactionExecutor` lifecycle plus `MemoryManager` accepted-compaction boundary | Reuse the pending `compactionId`; retain the baseline lineage head outside the proposal; assign episode/semantic IDs only during manager acceptance |
| Lineage relation | `MemoryManager` accepted-compaction boundary, served by the lineage persistence boundary | Publish one reference-only record only after accepted output |
| Current state | Lineage repository, coordinated by `MemoryManager` | Expose the last successfully appended record as the sole current head; persist no second pointer/state file |
| Origin resolution | Run-scoped resolver | Traverse relations and load authorized raw content on demand |

## Recurrent Compaction Contract

```text
compaction_id = pending compaction ID
baseline_head = current lineage tail compaction ID or null
prior = projected compacted-memory constituent identified by message-local kind/range
plan = selected settled natural prefix + retained/protected suffix
raw_refs = exact provenance refs from selected units
require raw_refs is non-empty and comes only from selected natural units

result = compactor.generate(prior.projection, plan.selectedNatural)
proposal = IDless(selected raw refs, retained messages, normalized result, execution metadata)
output_ids = MemoryManager assigns episode/semantic IDs
accepted = MemoryManager verifies/maps baseline_head, builds/finalizes/validates lineage/context candidate
archive_file = archive exactly raw_refs under the native-compaction boundary
persist output artifacts
persist CompactionLineageRecord(
  compaction_id = compaction_id,
  previous_compaction_id = baseline_head,
  raw_trace_archive_file = archive_file.file_name,
  episode_ids = output_ids.episodes,
  semantic_ids = output_ids.semantics,
  metadata_versions_and_optional_hashes = ...
)

install WorkingContext(system + new output + retained suffix)
persist schema-v5 snapshot
clear pending compaction
```

All one through three episodes and at most twenty accepted semantic facts share the same relation. No per-item citation or copied input is required. Prior M(n-1) is a recurrent input but never counts as R(n), never makes a new operation eligible by itself, and is never archived again.

Runner/parser failure publishes no outputs, lineage record, archive movement, replacement context, or snapshot update; the existing lineage head remains current.

## Time Contract

Keep distinct:

- `observed_at`: original raw occurrence;
- `recorded_at`: raw persistence time when separately available;
- `direct_raw_source_interval`: min/max occurrence over the referenced raw-trace archive file, resolved from the file/manifest rather than copied into lineage;
- `root_source_interval`: rebuildable min/max over recursively resolved roots;
- `derived_at`: output/successful-compaction creation; and
- append order: the lineage record's position establishes when it became the current head; no separate activation field is required.

Every current-format lineage branch must terminate in referenced raw evidence. Missing or cyclic referenced state is an integrity error; the resolver never guesses a source interval.

## Origin Query Contract

For a new episode or semantic artifact, the resolver accepts a typed `MemoryArtifactRef` (`kind: "episode" | "semantic"` plus `id`) and:

1. authorizes the run/member scope;
2. uses `kind` to search only the matching `episodeIds` or `semanticIds` relation, locates the lineage record, and returns its producing `compactionId`;
3. validates the directly recorded raw-trace archive `file_name` through the manifest and returns the file's raw membership/time bounds plus optional `previousCompactionId`;
4. iteratively follows `previousCompactionId` records with a visited set;
5. deduplicates raw roots;
6. reads authorized raw content from referenced immutable raw-trace archive files only when requested;
7. returns direct/root intervals and derivation time; and
8. reports `complete`, `not_found`, or an integrity error.

Status meaning:

- `complete`: all recursive branches reach recorded raw leaves;
- `not_found`: the typed artifact ID appears in no current-format lineage output relation;
- integrity error: a referenced current-format record, archive, output, or predecessor is absent, mismatched, or cyclic.

Do not infer artifact kind from ID shape, or infer ancestry from timestamps, similar text, turn IDs, physical filenames, or nearby records.

## WorkingContext And Restore Implications

- Exactly one successful compaction output is current and represented by one typed memory section.
- Snapshot v5 persists finalized messages and message-local constituent ranges only. It contains no compaction/output/current-state identity; current output lookup belongs to the lineage tail.
- Provider renderers translate rather than repair composition.
- Raw traces never receive synthetic compaction-output rows.
- Lineage records are never projected to the LLM.
- The required startup migration deletes pre-lineage derived rows, snapshots, and compacted-memory manifests before runtime. Restore has no old-schema reader, row-selection fallback, or archive-corpus replay branch.

## Persisted Schema Implications

Lineage capture is prospective from a clean epoch boundary. Existing raw traces and raw-trace manifests are directly usable and preserved. Pre-lineage episodic rows, semantic rows, WorkingContext snapshots, and compacted-memory manifests are disposable and deleted by one required, idempotent startup migration. No content transformation or lineage backfill occurs, and normal runtime contains no old-schema branch.

New reference-only records belong in run-scoped `compaction_lineage.jsonl`. Its last successful record is current and an absent/empty file means none. The first successful post-reset compaction is C1 with `previousCompactionId: null`; its output and v5 message snapshot are current-format state.

## Storage Recommendation

The logical model requires:

- immutable `compaction_lineage_record` entries that reference completed raw-trace archive files by their existing run-relative `file_name`;
- append-order current-head lookup from the same lineage file; and
- a resolver/index capable of mapping output artifact ID to its producing record and raw ID to active/archive location.

One append-only run-local `compaction_lineage.jsonl` is the selected physical representation. It contains successful records only; the last valid record is current; the repository may cache or efficiently read that tail without writing a second state file. A rebuildable output/root index may support long chains. Do not introduce a duplicate evidence-content store, graph database, cross-run catalog, or publication journal without separate requirements.

## External Methodology Sources

- [W3C PROV-DM](https://www.w3.org/TR/prov-dm/Overview.html): entities, activities, usage, generation, derivation, and revision.
- [TensorFlow ML Metadata](https://www.tensorflow.org/tfx/guide/mlmd): artifacts, executions, contexts, input/output events, and recursive origin.
- [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442): reflections retain pointers to supporting memory records and recursively form trees.
- Official `joonspk-research/generative_agents` implementation at commit `fe05a71d3e4ed7d10bf68aa4eda6dd995ec070f4`: model-returned local ordinals are mapped by application code to persistent node IDs; investigated as a fine-citation technique but not adopted here.
