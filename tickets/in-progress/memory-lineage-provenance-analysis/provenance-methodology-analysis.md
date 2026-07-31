# Memory Provenance And Lineage Methodology Analysis

## Status And Scope

- Status: Complete evidence supplement, SR-010 aligned. The direct relationship schema/methodology is unchanged; accepted lineage validation now removes a hidden count policy and prompt audit metadata advances from new-write value 1 to 2.
- Date: 2026-07-31
- Related requirements: REQ-001 through REQ-006, REQ-008, REQ-009, and REQ-012
- Related acceptance criteria: AC-001 through AC-006, AC-008 through AC-013, and AC-016
- Normative relationship: `requirements.md`, `memory-context-and-lineage-contract.md`, and `use-case-data-flow-spine-map.md` define intended behavior and execution/ownership constraints. This file records repository/methodology evidence and the implications of the user-directed recurrent and no-content-duplication decisions.

This analysis is limited to native memory compaction, automatic coarse direct and recursive provenance for episode/semantic outputs, origin/time queries, runtime-neutral raw identity, current-schema restore, and the required startup reset of disposable pre-lineage derived state. It does not define fine LLM citations, work-evidence chunking, byte-for-byte prompt replay, cross-run extraction, fact-level correction APIs, or filesystem crash recovery.

## Executive Conclusion

The target memory process is recurrent:

```text
M(n) = compact(M(n-1) + R(n))
```

where `M(n-1)` is the complete memory output listed by the last successful lineage record and `R(n)` is the newly selected settled natural-activity prefix. Provenance is recorded without copying content:

1. `MemoryManager` captures the current lineage head outside the LLM strategy; the planner identifies the compacted-memory message region by message-local kind/range and selects natural units whose exact raw-trace IDs are already known.
2. The compactor reads one naturally ordered logical WorkingContext prefix containing the current memory projection, when present, followed by those selected units, and returns one complete replacement output with the natural number of episodes and facts chosen by the LLM.
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

SR-010 changes semantic allocation and the truthful audit value, not the direct pointer relation or lineage record schema. System policy asks for the smallest sufficient natural structure. Parser, normalizer, accepted builder, and lineage normalization retain every structurally valid item without count maxima. The full accepted path must carry natural membership through output persistence, lineage append/read, current projection, and origin lookup. Existing prompt-contract value `1` remains truthful for SR-004 records; new target records use `2`; readers preserve supported `1 | 2` mixed chains. No migration, token ceiling, or launch change is required.

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

`RawTraceItem` and server-written raw records carry IDs, occurrence time, turn/per-turn order, type/payload, and relevant tool/media/correlation fields. Identity remains compound run/member scope plus raw trace ID. Timestamps, absolute paths, and mutable active/archive placement are not primary identity.

### 2. Implemented SR-004 already records the selected relationship

Current production is:

```text
WorkingContext planner includes projected M(n-1) plus natural R(n)
-> IDless strategy proposal
-> MemoryManager captures/verifies lineage head, assigns output IDs
-> committer archives R(n), persists output rows, appends lineage
-> tail loader projects exact current output
-> typed resolver traverses direct/recursive origin
```

The archive file owns exact R(n) membership/content; lineage stores its run-relative manifest filename, predecessor, and produced IDs only.

### 3. Implemented context and presentation boundaries are already current

Planner recurrence includes the compacted-memory unit. Snapshot v5 carries only finalized messages/message-local ranges. Current output comes from the lineage tail. The compactor renderer already emits one reasoning-free XML-bounded User/Assistant/Tool history with shared condensed Tool values and head/tail omission. Generated Work Evidence already uses the same low-level presentation under its own raw/timestamped Markdown envelope.

Pre-SR-004 evidence about excluded memory, top-K current projection, strategy-owned writes, v4 fallback, `Assistant work notes`, and server-local prefix slicing is historical rationale only.

### 4. Remaining cardinality enforcement reaches lineage after output writes

The current system prompt and operation builder prescribe 1–3 episodes and 20 facts. Parser, normalizer, and accepted builder enforce those limits. Independently, `normalizeCompactionLineageRecord` rejects more than three episode IDs or twenty semantic IDs. `FileCompactionLineageStore.appendNext` normalizes every write/read, and `AcceptedCompactionCommitter` archives R(n) and writes output rows before append. Therefore natural-count provenance requires removing the lineage count gate and proving the full persistence/read/query path; stopping at parser or accepted builder is insufficient.

This count rule is not a provenance invariant. Retain at least one episode, array/ID uniqueness, safe run-relative archive filename, schema/scope/predecessor/time/execution/hash validation, and exact referenced-output checks.

### 5. Prompt contract version is producing-contract audit metadata

Current type/validation/write logic accepts literal `promptContractVersion: 1` only. Value 1 truthfully identifies the implemented SR-004 fixed-count system prompt plus duplicated operation instructions. The approved target is materially different: natural system policy, history-only operation payload, and canonical-turn rendering. New successful records therefore write value 2.

Both are the same current lineage schema and direct relationship shape. Readers accept and preserve supported `1 | 2`; they do not branch into alternate content decoders or rewrite immutable records. A normal SR-004 value-1 predecessor followed by an SR-010 value-2 head is `Directly Usable — No Migration`.

### 6. Message-local provenance does not own predecessor identity

A compacted-memory constituent records local kind/range only; retained/current natural constituents may carry their own raw refs. `MemoryManager` separately captures the lineage head before strategy invocation and maps it to `previousCompactionId` during acceptance. The predecessor belongs in the lineage record, never in prompt text, message provenance, or snapshot v5.

### 7. Failure and startup boundaries remain implemented and unchanged

Runner/parser rejection remains pre-write and retryable under the same pending compaction ID. The required startup reset/current-only restore/fail-closed `startConfiguredServer` path is implemented and validated. Natural-count output that reaches the hidden lineage validator is a separate accepted-publication path, not parser failure and not a reason to add a journal.

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
  - one of the model-selected outputs of one successful compaction; at least one episode is required, but no numeric maximum is part of provenance.
- `SemanticArtifact`
  - stable ID, category/fact/salience, derivation time;
  - one of the accepted continuation-critical facts from one successful compaction; no numeric maximum is part of provenance.

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
- selection-policy version plus the producing prompt-contract audit version (`1` for implemented SR-004 records, `2` for new target records); and
- optional rendered-input and canonical-record hashes.

It contains no parallel activity/generation ID, repeated raw-ID list, raw-message text, memory text, episode/fact text, tool output, media payload, rendered prompt, fabricated segment ID, or internal archive boundary key. Direct membership/count/time bounds come from the referenced raw-trace archive file and manifest entry.

### Current compaction state

One successful compaction has one complete output bundle with LLM-chosen natural item counts and one `compactionId`; no parallel bundle-level identity exists. The last successfully appended lineage record identifies the only successful compaction whose output is projected by default; absent/empty lineage means none.

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
| Replacement content | Compactor LLM | Return the smallest sufficient complete latest output bundle with a natural episode/fact count, not pointers |
| Compaction/output identity | `PendingCompactionExecutor` lifecycle plus `MemoryManager` accepted-compaction boundary | Reuse the pending `compactionId`; retain the baseline lineage head outside the proposal; assign episode/semantic IDs only during manager acceptance |
| Lineage relation | `MemoryManager` accepted-compaction boundary, served by record validator/store | Publish one reference-only record after output; retain natural membership; validate structure; write prompt audit 2 and preserve supported 1/2 on read |
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
  selectionPolicyVersion = 1, promptContractVersion = 2, optional hashes = ...
)

install WorkingContext(system + new output + retained suffix)
persist schema-v5 snapshot
clear pending compaction
```

Every accepted episode and semantic fact shares the same relation regardless of model-decided item count. The record validator/store must retain all output IDs; current projection and typed origin lookup consume that full membership. No per-item citation or copied input is required. Prior M(n-1) is a recurrent input but never counts as R(n), never makes a new operation eligible by itself, and is never archived again.

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

Reference-only records belong in run-scoped `compaction_lineage.jsonl`. Existing schema-v1 records with prompt audit value 1 and new records with value 2 are directly usable in one chain; new writes use 2 and readers preserve either supported value. The last record is current; absent/empty means none.

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
