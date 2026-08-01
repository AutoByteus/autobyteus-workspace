# Memory Provenance And Lineage Methodology Analysis

## Status And Scope

- Status: Complete evidence supplement, SR-015 aligned. Delivered SR-010 direct relationship/natural-count/audit remains unchanged. Pending work narrows conversion to exact native AutoByteus locations, uses tolerant current-shape per-run migration with omission rather than repair, preserves ordinary nonblocking startup, removes raw-history reconstruction, and prevents request recovery from crossing a durable compaction.
- Date: 2026-07-31
- Related requirements: REQ-001 through REQ-006, REQ-008, REQ-009, and REQ-012 through REQ-014
- Related acceptance criteria: AC-001 through AC-006, AC-008 through AC-013, and AC-016 through AC-018
- Normative relationship: `requirements.md`, `memory-context-and-lineage-contract.md`, and `use-case-data-flow-spine-map.md` define intended behavior and execution/ownership constraints. This file records repository/methodology evidence and the implications of the user-directed recurrent and no-content-duplication decisions.

This analysis is limited to native memory compaction, coarse direct/recursive provenance, origin/time, runtime-neutral raw identity, current-schema restore, exact native snapshot migration, and the interaction between durable compaction and ephemeral request recovery. It does not define fine LLM citations, work-evidence chunking, byte-for-byte prompt replay, cross-run extraction, fact-level correction APIs, or general filesystem crash recovery.

## Executive Conclusion

The target memory process is recurrent:

```text
M(n) = compact(M(n-1) + R(n))
```

where `M(n-1)` is the complete memory output listed by the last successful lineage record and `R(n)` is the newly selected non-compacted-memory WorkingContext prefix backed by archive-eligible active raw evidence. R(n) consists of settled original activity. The one-time migration retains a non-system unit only when it already has truthful eligible-active backing; it omits unmatched units instead of manufacturing evidence. Provenance is recorded without copying normal input content:

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

Delivered SR-010 changed semantic allocation and the truthful audit value, not the direct pointer relation or lineage record schema. Current system policy asks for the smallest sufficient natural structure. Current parser, normalizer, accepted builder, and lineage normalization retain every structurally valid item without count maxima; natural membership is already carried through output persistence, lineage append/read, current projection, and origin lookup. Existing prompt-contract value `1` remains truthful for SR-004 records; current writes use `2`; readers preserve supported `1 | 2` mixed chains. No lineage/output migration, token ceiling, launch change, or SR-015 compaction-path work is required.

The pending SR-015 package retains SR-012's separate persisted-data migration for the **347 exact metadata-classified native AutoByteus snapshots** remaining after the completed external cleanup (32,501,775 bytes; v1=1, v3=79, v4=267; zero audit parse failures; zero lineage; active raw present for all). Codex/Claude no longer write snapshots; imported, unsupported, unclassified, and conflicting locations are excluded. One shared classifier owns exact location identity and derives standalone `runId` or team `memberRunId` as the strict-v5 snapshot identity. The server passes that identity, source bytes, and bounded same-subject eligible-active reference facts through one typed input; the pure migration converter alone owns historical decode and message/ref matching. Conversion is attempted only when lineage is absent/empty; every nonempty-lineage location skips untouched. The converter retains valid current-representable system messages and complete non-system units/tool groups only when their stored references resolve truthfully to eligible active raw records; it ignores unknown optional fields and omits unsupported, incomplete, ambiguous, old-compacted-memory, or unsourced units. Parse-invalid or fully omitted input becomes strict v5 with `messages: []`. It validates each full candidate before snapshot replacement, then removes only obsolete pre-lineage episode/semantic/manifest files. It does not backfill historical lineage, create recovery text, synthesize Tool outcomes, or append/modify raw evidence. The completed audit is sufficient corpus evidence; no global preflight or prepared-plan path is added.

## Correction: Why A Content-Bearing Snapshot Is Wrong Here

An earlier draft proposed a content-bearing evidence-copy artifact containing prior-memory projection, selected message content, and rendered task content. That shape is rejected for this ticket because:

- selected activity content already exists in authoritative raw traces;
- prior and output memory content already exists in durable memory;
- copying it creates a third content authority and additional retention/redaction burden;
- exact rendered-prompt replay is not the requested product function; and
- a one-to-one content snapshot plus activity record adds unnecessary indirection.

The product need is a derivation relation, not a second evidence repository. The replacement `CompactionLineageRecord` therefore contains the existing successful `compactionId`, optional `previousCompactionId`, the existing run-relative `file_name` of the immutable raw-trace archive file containing exactly the selected records, produced episode/semantic IDs, and compact metadata. It repeats neither raw IDs nor content. It invents no activity, generation, or segment ID and does not expose the internal archive boundary key. Prompt/selection versions and optional hashes may support audit, but hashes do not replace explicit relations.

## Current Repository Findings

### 1. Raw storage already provides authoritative typed leaf content and identity

`RawTraceItem` and server-written raw records carry IDs, occurrence time, turn/per-turn order, type/payload, and relevant tool/media/correlation fields. Ordinary user/assistant/tool rows are immutable original activity; existing operational boundary rows remain explicitly typed evidence rather than user activity. Native snapshot migration creates no raw row. Identity remains compound run/member scope plus raw trace ID. Timestamps, absolute paths, and mutable active/archive placement are not primary identity.

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

### 4. Delivered natural-cardinality path

Before SR-010, the system prompt, operation builder, parser, normalizer, accepted builder, and lineage normalizer duplicated 1–3 episode / 20-fact limits, including a late lineage gate after archive/output writes. That evidence motivated ARCH-F-006 and IR-003. Current source has removed those limits from every layer and API-REV-007 proves the complete persistence/read/projection/origin path. The current provenance invariant is structural, not cardinality-based: retain at least one episode, array/ID uniqueness, safe run-relative archive filename, schema/scope/predecessor/time/execution/hash validation, and exact referenced-output checks.

### 5. Delivered prompt-contract audit semantics

Before SR-010, type/validation/write logic accepted literal `promptContractVersion: 1` only. Value 1 remains truthful for immutable records produced by the SR-004 fixed-count system prompt plus duplicated operation instructions. Current SR-010 writes value 2 for the natural system policy, history-only operation payload, and canonical-turn rendering.

Both values use the same current lineage schema and direct relationship shape. Current readers accept and preserve supported `1 | 2`; they do not branch into alternate content decoders or rewrite immutable records. A normal value-1 predecessor followed by a value-2 head is `Directly Usable — No Migration`.

### 6. Message-local provenance does not own predecessor identity

A compacted-memory constituent records local kind/range only; retained/current natural constituents may carry their own raw refs. `MemoryManager` separately captures the lineage head before strategy invocation and maps it to `previousCompactionId` during acceptance. The predecessor belongs in the lineage record, never in prompt text, message provenance, or snapshot v5.

### 7. Failure, startup, and exact classification boundaries

Runner/parser rejection remains pre-write and retryable under the same pending compaction ID. The registered destructive reset is superseded by exact ID `20260731_migrate_native_working_context_snapshots_v5`. The existing runner/server lifecycle remains nonblocking and the ticket-owned global exception/rethrow is removed. Snapshot content-shape problems yield `converted_with_omissions` and a valid v5, including `messages: []`. Conversion is attempted only for absent/empty lineage; every nonempty-lineage location skips untouched. Filesystem behavior remains owned by the existing runner and gains no ticket-specific branch. Natural-count lineage validation is already a separate delivered accepted-publication path.

### 8. Migration omission avoids historical lineage invention

The product-reachability witness is concrete: built-Electron existing-run activation reaches strict snapshot restore and rejects schema v4. Normal agent creation persists snapshots; no supported action was found that removes one from an existing restorable run. Therefore the required response is snapshot migration plus removal of the last-twelve/raw-history fallback—not a generalized recovery path.

The migration preserves only context it can represent and source truthfully. It does not pretend to know which original pre-lineage raw records produced an old summary. Exact active-raw references are retained only when truthful; otherwise the non-system unit is omitted. Existing raw records are never appended, rewritten, archived, or deleted by migration. Absent/empty lineage still truthfully means that no current-format compaction has yet succeeded, and the first later compaction can consume only retained units already backed by eligible active evidence.

### 9. External cleanup supplies the authoritative native boundary

The completed prerequisite establishes `ExternalRuntimeMemoryWriter` as raw-only and removed every exact classified Codex/Claude snapshot. Therefore a snapshot file is not enough to infer native ownership. `RuntimeMemoryLocationClassifier` must derive exact standalone/team-member subject, directory, and runtime kind from current metadata/location services. External cleanup and native conversion reuse that result but retain separate eligibility/action policy.

### 10. Request recovery is not lineage rollback

Latest origin captures an LLM request recovery checkpoint before `LLMRequestAssembler`, while the assembler can durably accept pending compaction. The supported path `pending C(n) -> archive/output/lineage/context/v5 -> provider failure` can therefore restore a pre-C(n) context/pending flag behind current lineage. The target captures after pending compaction and before request mutation, carries the checkpoint in `RequestPackage`, and settles it through assembler/`LlmPhase`. It contains WorkingContext plus pending state only; provenance remains durable and untouched.

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
  - authoritative typed leaf evidence: normally original activity, or an explicitly identified operational/migration fact;
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
- selection-policy version plus the producing prompt-contract audit version (`1` for implemented SR-004 records, `2` for current SR-010+ records); and
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
| Raw identity/content | Existing raw writer/store only; native snapshot migration is read-only with respect to raw storage | Preserve existing run-scoped identity/content through active/archive movement; migration retains only truthfully backed units and never invents evidence |
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
- The exact native startup migration converts a readable eligible AutoByteus snapshot to strict v5 before exact three-file cleanup. Historical decoding is migration-only. All excluded location classes remain untouched; normal restore has no old-schema/raw-history branch.
- A migrated old compacted summary is omitted because no producing current-format lineage record or truthful active source exists.
- Explicit existing-run restore without a snapshot fails. No supported product path justifies reconstructing exact WorkingContext from a last-N raw window.
- Request recovery captures the post-compaction canonical base and restores/releases only copied WorkingContext/pending state. It never changes lineage/current output.

## Persisted Schema Implications

Lineage capture remains prospective from a clean current-format boundary. Existing original raw records and raw-trace manifests are directly usable and preserved. Pre-lineage episodic rows, semantic rows, and compacted-memory manifests are disposable, but WorkingContext snapshots are continuation authority and are `Migration Required`. One required idempotent startup migration converts an exact eligible native pre-lineage snapshot to strict v5 by retaining only current-valid truthfully sourceable units and omitting the rest; parse-invalid or fully omitted input becomes `messages: []`. Only after the v5 snapshot is durable does it delete the three obsolete files. The migration never mutates raw storage, no historical compaction lineage is backfilled, and normal runtime contains no old-schema branch.

Every nonempty-lineage location is outside this transition and is skipped byte-for-byte without state validation. An already-valid strict-v5/no-lineage snapshot with no compacted-memory constituent is directly retained only when every non-system logical unit has at least one truthful eligible-active raw reference; only its obsolete pre-lineage files need cleanup. If any unit is unsourced, it follows tolerant conversion and omission even when other references are individually valid. An exact native location without a snapshot is skipped by migration; excluded runtime/location classes are never conversion candidates; no context or cleanup flow is invented for it because no supported existing-run restore path produces that premise. Explicit restore without a snapshot fails its invariant.

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
