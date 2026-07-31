# Memory Context And Lineage Foundation Contract

## 1. Status And Authority

- Status: User-approved behavior; SR-010 technical correction ready for renewed architecture review after `ARCH-REV-005`
- Date: 2026-07-31
- Task: `memory-lineage-provenance-analysis`
- Implementation: SR-004 passed architecture and is implemented/validated. SR-006/SR-009 define the user-approved natural-count, exact-system-prompt, history-only payload, and canonical-turn change. SR-010 completes its accepted lineage path, prompt audit versioning, current-evidence basis, and message/lineage separation without changing that intent or launch configuration. Renewed architecture review is required before implementation.
- Governing requirements: REQ-001 through REQ-012
- Governing acceptance criteria: AC-001 through AC-016
- Governing spine/ownership supplement: `use-case-data-flow-spine-map.md`
- Governing exact prompt-content supplement: `memory-compactor-prompt-content-contract.md`
- Explicit exclusion: Work-evidence chunking and fine intra-input localization are not defined by this ticket.

This contract defines the behavioral meaning of raw activity traces, active trace projection, recurrent work evidence, quality-first compaction outputs with LLM-chosen natural episode/fact counts, working context, snapshots, compaction, provider rendering, and lineage. `use-case-data-flow-spine-map.md` is the normative path/ownership companion: it maps every use case below to a complete production or approved target-production spine. If a later design or implementation conflicts with either normative artifact, the conflict must return to requirements clarification rather than being resolved silently in code.

### 1.1 Exact ticket implementation boundary

The cumulative ticket owns seven behaviors; SR-004 already implements the baseline, while SR-010 changes only the bounded prompt/cardinality/canonical-turn/audit delta within them:

1. each successful native structured compaction archives exactly its selected raw records in one immutable raw-trace archive file, persists its output rows, and publishes one reference-only `CompactionLineageRecord` keyed by the existing successful `compactionId`, relating optional `previousCompactionId` plus that file's existing run-relative `file_name` to produced episode/semantic IDs; it repeats neither content nor raw IDs and introduces no parallel activity/generation ID;
2. the compactor strategy returns an IDless **complete replacement memory proposal** whose LLM-chosen natural episode/fact counts form the smallest sufficient semantic structure for reliable continuation; this ticket sets neither item-count targets nor an output-token ceiling, while `MemoryManager` retains the application-owned baseline lineage head, reuses the pending `compactionId`, assigns episode/semantic IDs, constructs/validates the accepted candidate, and records the relation;
3. an internal run-scoped resolver answers direct and recursive origin/time for current-format episode and semantic IDs, returns `not_found` for unknown artifacts, and treats a broken referenced chain as an integrity error;
4. replacement `WorkingContext` is canonically composed before snapshot/render, contains only the memory output listed by the last successful lineage record, and preserves compatible-user, assistant/tool, media, and message-local constituent boundaries;
5. one required idempotent startup app-data migration removes pre-lineage `episodic.jsonl`, `semantic.jsonl`, `working_context_snapshot.json`, and `compacted_memory_manifest.json` from standalone/team-member runs while retaining active/archive raw traces and manifests; normal runtime supports only schema-v5 message snapshots/current-format memory, and the absent/empty lineage file or its last successful record is the sole no-memory/current-memory authority; and
6. the compactable logical WorkingContext prefix—including the existing compacted-memory user region when present and the newly selected settled activity it influenced—is rendered in natural order inside exactly one application-owned `<conversation_history>...</conversation_history>` boundary, without a separate mechanical prior-memory section; every settled call/result group appears as one straightforward `Tool` block containing `name`, `status`, `arguments`, and exactly one `result` or `error`; and
7. native compaction and generated Work Evidence reuse a tight core-owned visible-value/readable-tool presentation capability for deterministic serialization, redaction, and configurable explicit head/tail omission, while WorkingContext planning/XML construction and raw historical replay/timestamped Markdown remain separately owned.

The **historical pre-SR-004** flow excluded current memory, performed strategy-owned writes, used mixed retrieval, and lacked lineage. That flow is removed and is not the current baseline.

The actual implemented SR-004 flow is:

```text
current lineage-tail output M(n-1) + selected raw-backed R(n)
-> reasoning-free XML-bounded conversation renderer
-> duplicated fixed-count system + operation policy
-> parser/normalizer/accepted builder enforce 1–3/20
-> manager-owned archive -> output -> lineage -> context -> v5 snapshot
-> lineage normalization independently enforces 1–3/20 and prompt version 1
```

The pending SR-010 target flow is:

```text
compactable logical WorkingContext prefix
  = projected compacted-memory user region for M(n-1), when present
  + selected settled natural activity R(n) in logical order
-> render one natural User/Assistant/Tool conversation history
     (each Tool = name + status + arguments + result-or-error)
     (no reasoning/work-notes/backend IDs or synthetic timestamps)
-> enclose the complete rendered prefix once in
   <conversation_history>...</conversation_history>
-> built-in Memory Compactor runs with its existing launch/provider configuration unchanged
-> LLM returns one complete replacement output M(n)
     (smallest sufficient episode set + continuation-critical facts; natural counts)
-> strategy returns one IDless content/selection/execution proposal
-> MemoryManager validates the proposal/baseline, reuses pending compactionId,
   retains/verifies the baseline lineage head, assigns episode/semantic IDs,
   and builds/validates the accepted candidate
-> archive R(n) exactly once in one complete immutable raw-trace archive file
-> persist episode/semantic output rows comprising M(n)
-> normalize and publish one reference-only CompactionLineageRecord C(n)
     (no upper output-membership count; promptContractVersion: 2)
     compactionId: C(n)
     inputs: optional previousCompactionId C(n-1)
             + raw_traces_XXXXXX.jsonl containing R(n)
     outputs: episode/semantic IDs comprising M(n)
-> append C(n) as the new lineage head
-> keep older compaction outputs immutable but inactive for default projection
-> install finalized WorkingContext containing M(n) + retained continuation
-> persist current-schema snapshot
-> renderer translates the same logical context
```

Raw activity capture, active-only Event Monitor behavior, generated Work Evidence source/timestamp/Markdown/file/manifest contracts, and storage-only external-runtime compaction behavior remain unchanged. SR-004 already replaced historical silent 20,000-character prefix-only clipping with explicit configurable head/tail omission. The generated Markdown file is not passed to the compactor; both consumers reuse only the core presentation capability through their own source adapters. SR-010 does not modify that delivered presentation boundary. This contract does not add a provenance screen to the frontend.

There is no separate tool-result condenser in the current production strategy or in this ticket. Settled tool-call/result groups are rendered directly into the natural compactor conversation history as `Tool` blocks; the latest live/incomplete tool group is protected from compaction. The implemented renderer uses deterministic variable-field head/tail omission with an explicit omitted-character marker/count.

## 2. Terminology Contract

| Term | Canonical meaning | Is original evidence? | May be compacted or rewritten? | Primary consumer |
| --- | --- | --- | --- | --- |
| Raw activity trace | One normalized observation of runtime activity: user input, assistant output, reasoning, tool call/result, boundary, or other retained event | Yes | The record identity/content must not be rewritten; physical active/archive membership may change | Audit, Event Monitor, work-evidence input, lineage |
| Active raw trace | The boundary-forward set of original raw activity records that have not been rotated/archived | Yes | File membership is rewritten after successful archive rotation; retained record identity/content stays unchanged | Event Monitor and current-activity inspection |
| Archived raw trace | A completed raw-trace archive file containing original raw records moved out of active storage | Yes | Completed archive-file records remain immutable subject to explicit retention/redaction policy | Provenance, work evidence, historical inspection |
| Work evidence | A canonical memory-ready view of selected original raw records. For provenance/origin and generated Work Evidence Markdown it is resolved from referenced raw-trace sources; for native compaction, newly selected activity is represented through the logical WorkingContext units that the model actually saw. It is not a copied content authority | Yes, through the referenced raw records | Raw record identity/content is not rewritten; derived consumer presentations may be redacted/bounded | Recurrent memory extraction, review, and origin inspection |
| Compactor conversation history | The ephemeral, consumer-bounded LLM-facing presentation of the compactable logical WorkingContext prefix. It places the projected compacted-memory user region, when present, and selected subsequent User/Assistant/Tool units in their natural order inside one `<conversation_history>...</conversation_history>` pair | No separate authority; the prior-memory constituent derives from durable memory and R(n) constituents derive from selected raw-backed WorkingContext units | Ephemeral per compaction task; it is not persisted in lineage or substituted for raw evidence | Memory Compactor LLM |
| Generated Work Evidence | Regenerable timestamped Markdown projected from explicitly enumerated raw archive-plus-active sources through historical replay | Yes, through its raw sources; the Markdown itself is derived | The Markdown is regenerated. Its source/order/file/manifest contract remains; oversized visible values use the shared head/tail omission policy | Explicit work-evidence consumers; the current caller remains unchanged |
| Readable Tool entry | A tight presentation value containing `name`, `status`, `arguments`, and exactly one outcome variant, `result` or `error`; it contains no source timestamps, raw IDs, tool-call IDs, file metadata, or WorkingContext mechanics | No | Built independently by each source adapter, then serialized/redacted/bounded by the core presentation capability | Compactor conversation history and generated Work Evidence |
| Compaction lineage record | One application-owned, immutable, reference-only derivation record keyed by the existing successful `compactionId`; it relates optional `previousCompactionId` and one completed raw-trace archive `file_name` to produced episode/semantic IDs | No | One record per successful native compaction; contains straightforward existing identifiers/metadata/hashes but no parallel activity/generation ID, repeated raw IDs, or copied evidence, memory, or prompt content | Compaction-output ownership and lineage |
| Compaction output bundle | The quality-first episode/semantic output of one successful compaction, with the natural number of items chosen by the LLM; the successful `compactionId` is its only bundle-level identity | No | The bundle listed by the last successful lineage record is current; older outputs remain immutable but inactive for default projection | WorkingContext projection and provenance |
| Episodic memory | One concise account in the smallest sufficient episode set of a successful compaction's replacement output | No | Its ID is listed once in the producing `CompactionLineageRecord`; content may become inactive when a newer compaction succeeds | Recall, recurrent compaction, lineage |
| Semantic memory | A continuation-critical categorized fact in the same successful compaction output | No | Its ID is listed once in the producing `CompactionLineageRecord`; content may become inactive when a newer compaction succeeds | Recall, recurrent compaction, lineage |
| Provenance resolver | Internal run-scoped read boundary that accepts explicit artifact kind + ID and traverses the matching current-format episode/fact output -> producing `compactionId` -> raw-trace archive file/`previousCompactionId` recursively | No | Read-only; returns complete recorded origin, `not_found`, or a current-state integrity error | Agent/backend origin questions |
| WorkingContext | The ordered provider-neutral `Message` sequence owned by `MemoryManager` and used to prepare the next LLM request | No | Replaced or appended as current operational state | Request assembly and compaction |
| Working-context snapshot | Persisted serialization of the current finalized `WorkingContext` messages | No | Latest snapshot is replaced on successful context mutation; schema v5 adds finalized message-local constituent ranges but no compaction, episode, semantic, lineage, or current-state identity. Pre-v5 snapshots are removed by the startup reset | Normal resume/reconstruction |
| Provider payload | Provider-specific wire representation rendered from finalized `WorkingContext` | No | Per-request derived value | LLM API |

Normative terminology decisions:

1. Raw traces are **activity**, not “raw memory.”
2. Work-evidence authority/content membership remains in the selected raw records and, after success, their immutable native-compaction raw-trace archive file. Canonical reasoning-free/redacted/bounded rendering is a consumer view, not another content authority. The compaction lineage record stores only the existing successful `compactionId`, optional `previousCompactionId`, that file's existing run-relative `file_name`, and produced episode/semantic IDs.
3. Working context is activated/current memory, not historical evidence.
4. A compacted-memory message is a projection of the one output bundle listed by the lineage head; it is not a new raw user event and does not carry the lineage/output IDs in the snapshot.
5. “Replacement” means current-projection replacement, not deletion or historical falsification: older successful compaction outputs remain immutable for origin traversal.
6. “Compactor conversation history” refers only to the bounded LLM-facing view of selected WorkingContext, not the generated Work Evidence Markdown or another store. Exactly one outer `<conversation_history>` pair identifies its extent.
7. “Readable Tool entry” is the shared presentation seam, not a shared source event. WorkingContext and raw historical replay each adapt into the tight entry independently; consumer timestamps, XML/Markdown envelopes, file metadata, and selection policy do not enter the shared shape.
8. “Smallest sufficient” optimizes reliable continuation, not the fewest possible objects in isolation: unrelated task phases remain distinct when merging them would obscure state/outcomes, while chatter, repetition, and obsolete state do not earn separate entries.
9. “Natural output sizing” means the LLM chooses how many episodes and facts are needed to preserve continuation-critical meaning. This ticket defines no item-count target and no numeric output-token ceiling; existing model/provider launch behavior remains unchanged.
10. “Prompt contract version” is immutable producing-contract audit metadata, not a lineage schema switch. Value `1` identifies the implemented SR-004 fixed-count system/duplicated-operation contract; value `2` identifies the approved natural system prompt, history-only operation payload, and canonical-turn contract. New records write `2`; readers accept and preserve supported `1 | 2` mixed chains without rewriting or decoding content differently.

## 3. Authoritative Boundaries

### 3.1 What happened

```text
runtime/provider activity
-> normalized raw activity record
-> active raw trace
-> immutable raw-trace archive file after rotation/compaction
```

Raw record identity and content answer “what happened?” Physical file names and `active`/archive membership do not define durable identity.

### 3.2 What evidence was used

```text
optional previousCompactionId selecting prior memory output
+ completed raw-trace archive file containing selected new raw-backed activity
-> one versioned reference-only CompactionLineageRecord
-> produced episode/semantic IDs
```

The lineage record answers “which authoritative inputs produced this output?” It stores the existing successful `compactionId`, optional `previousCompactionId`, the existing run-relative `file_name` of the completed immutable archive containing exactly R(n), and produced episode/semantic IDs. It never repeats the file's raw IDs or content or introduces a separate activity/generation ID. A resolver validates the file through `raw_traces_manifest.json`, reads it through the existing archive manager, and follows `previousCompactionId` through earlier lineage records. The run-scoped relative filename—not a machine-specific absolute path—is the straightforward locator.

The record is not current memory, a second WorkingContext snapshot, a raw backup, or an LLM input. The compactor conversation history is rendered from the planner-selected logical WorkingContext prefix and is not persisted in the lineage record. Generated Work Evidence is independently regenerated from raw historical replay and is likewise not lineage content. The lineage record's only product function is provenance/derivation linkage plus compact audit metadata. The next compaction directly consumes the one current M(n), not the lineage record itself.

### 3.3 What the agent learned

```text
C1(previousCompactionId: null; raw: R1; output: M1 current)
C2(previousCompactionId: C1; raw: R2; output: M2 current)
C3(previousCompactionId: C2; raw: R3; output: M3 current)
```

Explicit direct edges answer “what did this compaction consume?” Recursive traversal answers “which original raw work ultimately influenced this memory?” The system must not claim that C3 directly read R1; it read M2, whose recorded ancestry reaches R1.

### 3.4 What the LLM currently sees

```text
durable output listed by the last successful lineage record + retained canonical messages + current input
-> finalized WorkingContext
-> working_context_snapshot.json
-> provider renderer
-> provider payload
```

The finalized `WorkingContext` is the provider-neutral request authority. The working-context snapshot is its normal resume representation. Provider renderers translate wire format and provider-specific tool/media structures; they do not repair semantic message composition.

### 3.5 What the Event Monitor shows

```text
raw_traces_active.jsonl
-> active raw replay events
-> latest bounded Event Monitor window / active-only earlier pages
```

The Event Monitor shows recent activity, not current model memory. It does not use the working-context snapshot and does not cross into raw archive segments.

### 3.6 One successful native compaction, end to end

Compaction selection is based on provider-neutral `WorkingContext` sections and message/tool units, not by reading a raw-trace file from its first line. The planner:

- preserves the leading system-message head;
- includes the compacted-memory user region, identified only by its message-local kind/range, when present, as the first constituent of the compactable logical conversation prefix;
- selects an eligible settled prefix of new natural user/assistant units and settled tool-call/result groups;
- retains a recent natural suffix within the configured budget; and
- protects the latest live/incomplete tool-call/result group.

When a physical user message combines memory and retained/current user content, typed constituent provenance still separates them for planning: the memory constituent belongs to the compactable prefix, while each natural constituent is independently selected or retained. The LLM-facing renderer then reconstructs the selected constituents in their natural logical order rather than exposing those internal section mechanics. Role or text matching alone is insufficient.

The selected natural messages already carry raw-trace provenance. Their exact raw IDs drive creation of one native-compaction raw-trace archive file containing exactly R(n). The accepted lineage record stores that file's existing run-relative `file_name` rather than repeating its IDs/content or exposing the internal archive boundary key. The compacted-memory message constituent carries only its structural kind/range. The separate lineage tail identifies the current producing compaction and exact episode/semantic output IDs.

`MemoryManager` captures the current lineage head as application-owned baseline state before invoking the planner/strategy. That ID never enters the LLM prompt or the IDless strategy proposal. During acceptance, the manager verifies that the head is unchanged and maps it directly to `previousCompactionId`. When the lineage file is absent/empty, the first successful compaction uses `previousCompactionId: null`. A normal successful target flow is:

```text
baseline finalized WorkingContext
-> obtain pending compactionId C(n)
-> capture optional baseline lineage head C(n-1), or none
-> identify the compacted-memory message constituent already present in WorkingContext
   by message-local kind/range only; it carries no lineage/output IDs
-> plan one ordered compactable logical prefix:
     projected compacted-memory user region for M(n-1), when present
     + selected settled natural R(n)
-> render that prefix as one natural User/Assistant/Tool transcript
     each Tool block: name + status + arguments + result-or-error
   inside <conversation_history>...</conversation_history>
-> compactor returns a complete replacement output M(n)
     smallest sufficient episode set + continuation-critical facts
     with natural LLM-chosen episode and fact counts
-> strategy returns an IDless proposal:
     normalized content + selected new raw IDs + retained continuation
     + execution metadata
-> MemoryManager acceptance reuses C(n), assigns episode/semantic IDs,
     builds the accepted lineage/replacement-context candidate,
     and validates structurally correct output plus complete tool/message protocol
-> archive exactly R(n) in one complete immutable raw-trace archive file
-> persist episode/semantic output rows; retain older outputs as inactive history
-> publish one immutable reference-only CompactionLineageRecord C(n)
     compactionId C(n)
     + optional previousCompactionId C(n-1)
     + raw-trace archive file_name + produced episode/semantic IDs
-> append C(n) as the new lineage head
-> install/finalize replacement WorkingContext
-> persist schema-v5 working-context snapshot
-> clear the pending compaction request
```

The lineage append occurs only after the completed archive and output rows exist. A lineage record denotes a successfully accepted compaction; appending it makes it the sole current head. The store rejects a duplicate ID or a `previousCompactionId` that does not equal the prior tail. This is the normal in-process ordering invariant; it does not introduce a transaction journal or a process-crash recovery contract.

The compactor output is one self-contained summary of everything still needed to continue, not only the latest changes. Its prompt must preserve still-valid earlier information, incorporate new decisions/results, update understanding that is no longer correct, retain important open work/artifacts/preferences, and omit obsolete or resolved state. The prior compacted memory is not described to the compactor as a storage object or “memory to revise”; it appears as part of the same natural conversation history followed by R(n) in order. The application-owned baseline lineage head—not the prompt grammar or snapshot message—supplies `previousCompactionId`. `Message.reasoning_content`, raw reasoning records, `Assistant work notes`, raw/turn/tool-call IDs, backend bookkeeping, and timestamps not present in logical WorkingContext do not enter the rendered conversation history.

If a current user input was recorded as raw activity before pending compaction but was not yet appended to `WorkingContext`, it is not part of R(n) or the archival set. After compaction, it is appended through canonical composition and the final schema-v5 snapshot is updated again before rendering.

The replacement context normally contains:

```text
leading system message(s)
+ one current compacted-memory user region from M(n)
+ retained/protected natural suffix
+ current input when applicable
```

“The first message is a user message” is not the invariant: leading system messages remain first. The first non-system memory bridge is user-role. It may be combined with compatible retained/current user content while preserving separate constituent provenance.

### 3.7 Multiple compactions in one run

Reference-only lineage records form an append-only recurrent compaction chain:

```text
C1(previous null; input raw R1; output M1 current)
C2(previous C1; input M1 + raw R2; output M2 current; M1 inactive)
C3(previous C2; input M2 + raw R3; output M3 current; M2 inactive)
...
C1000(previous C999; input M999 + raw R1000; output M1000 current)
```

After C3, the lineage tail is C3 and WorkingContext contains M3, not `M1 + M2 + M3` and not a top-K mixture across compaction outputs. Older outputs remain persisted for provenance/audit but are not included by default in the current LLM context.

Each successful compaction produces one complete replacement response with LLM-chosen natural episode and fact counts. M1000 does not grow merely because C1–C999 exist: it replaces rather than concatenates older outputs. This ticket introduces no numeric output-token ceiling and leaves existing model/provider output behavior unchanged. Each lineage record remains small because it stores one optional `previousCompactionId`, one raw-trace archive `file_name`, and produced episode/semantic IDs—not raw membership/content or a copied transitive ancestor list.

Recursive origin follows direct edges with cycle protection and deduplication:

```text
C3 -> [R3, C2]
C2 -> [R2, C1]
C1 -> [R1]
```

Direct relations are authoritative. An implementation may cache a derived root interval or closure for performance, but such a cache is rebuildable and is not provenance identity.

The design selects one run-local append-only `compaction_lineage.jsonl`. It contains successful records only and its last valid record is the current compaction; an absent/empty file means no current compacted memory. No `compaction_state.json`, current pointer, or replacement manifest is persisted. The repository may cache the tail in memory or read it efficiently, but a convenience lookup must not create a second durable truth.

### 3.8 Restart and UI source separation

After application restart, different consumers intentionally use different persisted authorities:

| Consumer | Resume/projection source |
| --- | --- |
| Native agent runtime preparing its next LLM request | Valid schema-v5 `working_context_snapshot.json`; absence after the one-time reset starts a no-memory current context |
| Event Monitor and normal run-history projection | Active raw traces only |
| Explicit raw-history/evidence inspection | Selected active or archived raw records |
| Episodic/semantic recall | Output IDs listed by the lineage tail select the exact projection; older compaction outputs remain historical |
| Origin lookup | Episode/semantic ID -> producing compaction record -> raw-trace archive filename/`previousCompactionId`, traversed recursively to original roots |

The frontend Event Monitor is therefore not reconstructed from `working_context_snapshot.json`. A memory-inspection surface may read snapshot or durable-memory data explicitly, but that is a separate view and does not change Event Monitor authority.

## 4. Global Invariants

- INV-001 — Original raw record IDs and retained content never change when records move from active to archive.
- INV-002 — Active-file rewrite occurs only after the corresponding archive segment is complete/readable when archival is required.
- INV-003 — The Event Monitor reads active raw traces only; archived traces never become an implicit UI fallback.
- INV-004 — Work-evidence and the run-scoped provenance resolver may read specifically referenced archive and active evidence because their purpose is source reconstruction, not recent UI display; a general historical browsing UI is not introduced.
- INV-005 — `MemoryManager` is the sole live `WorkingContext` mutation/replacement boundary.
- INV-006 — A valid schema-v5 working-context snapshot is the normal resume source for finalized messages. It contains message-local constituent ranges but no compaction, episode, semantic, lineage, or current-state identity. Pre-v5 snapshots and pre-lineage derived-memory files are removed by the required startup reset before agent runtime.
- INV-007 — The `WorkingContext` supplied to a provider renderer is already semantically finalized and provider-neutral.
- INV-008 — Compacted memory and real user content retain distinct provenance/section identity even when represented as one canonical user message.
- INV-009 — Provider renderers may own provider-specific tool/media/wire encoding, but not memory-versus-current-request semantic merging.
- INV-010 — Complete tool-call/result groups remain ordered and provider-renderable; no merge crosses an assistant/tool protocol boundary.
- INV-011 — Every repeated compaction consumes the output listed by the prior lineage head as a direct input and produces one complete replacement output; only the output of the newly appended successful head is projected afterward.
- INV-012 — Each successful native compaction creates exactly one immutable raw-trace archive file and publishes exactly one reference-only input/output lineage record using that file's run-relative `file_name`; its outputs share that relation without repeated raw IDs/content, fabricated locator types, or per-record LLM citation work.
- INV-013 — The natural raw archive set contains only raw refs of newly selected natural units. Prior-memory ancestry is lineage input, never re-archived as though it were newly selected raw activity.
- INV-014 — A compactor-runner failure or invalid compactor response leaves the lineage head, baseline WorkingContext/snapshot, memory, and raw active/archive state unchanged; the pending in-memory `compactionId` remains available for the next normal-request retry.
- INV-015 — System messages, multimodal parts, tool payloads, and typed message-local constituent ranges survive context copy, compaction retention, snapshot persistence, restore, planning, and final render. Compaction/output identity remains solely in lineage; it is never duplicated into a message constituent or snapshot root.
- INV-016 — Older successful compaction outputs remain immutable historical derivations after becoming inactive; projection supersession does not delete, rewrite, or invalidate their recorded content or lineage.
- INV-017 — Recursive origin distinguishes direct input from transitive roots. Unknown artifacts return `not_found`; missing/inconsistent state inside a referenced current-format chain fails integrity validation rather than fabricating ancestry.
- INV-018 — Every successful compaction has a non-empty newly selected raw-backed natural input R(n). The prior output M(n-1) is a recurrent seed but never by itself makes a new compaction eligible and is never re-archived.
- INV-019 — The compactor receives one naturally ordered rendering of the compactable logical WorkingContext prefix, not separate prior-memory and evidence sections. Exactly one application-generated `<conversation_history>...</conversation_history>` pair encloses the projected compacted-memory user region, when present, followed by selected R(n); source content cannot create or close that boundary because reserved delimiter sequences are escaped. The enclosed history uses visible `User`, `Assistant`, and `Tool` entries and reflects canonical turns rather than internal constituent splits: an earlier summary composed with adjacent compatible retained/current user content is one `User:` entry, never two consecutive artificial `User:` labels. Each `Tool` entry contains only `name`, `status`, `arguments`, and exactly one `result` or `error`; it is not labeled as an assistant tool call. The history never includes provider-private reasoning, `Assistant work notes`, synthetic timestamps, or backend/raw/tool-call IDs, and never silently discards an oversized field's tail.
- INV-020 — Native compaction and generated Work Evidence share only a tight core presentation capability for visible-value serialization/redaction, readable Tool-body formatting, and configurable head/tail omission. WorkingContext selection/XML task composition and raw historical replay/timestamped Markdown/file generation remain separately authoritative; neither consumer reads the other's output or imports its orchestration.
- INV-021 — The startup reset removes only pre-lineage episodic/semantic JSONL, WorkingContext snapshots, and compacted-memory manifests. It preserves raw traces/manifests, is idempotent, blocks agent runtime on a failed removal, and is the only component that knows the obsolete derived-state format.
- INV-022 — `compaction_lineage.jsonl` contains successful compactions only. Its last valid record is the sole current compaction; an absent/empty file means none. Appending requires a unique `compactionId` and `previousCompactionId` equal to the prior head, so no `compaction_state.json`, current pointer, snapshot identity, or replacement manifest duplicates that state.
- INV-023 — Compaction semantic sizing is quality-first and cardinality-free. `agent.md` owns the complete natural summarization task and stable JSON/quality contract; the operation user message is exactly one renderer-produced conversation-history block; parser, normalizer, accepted builder, and lineage record normalization retain every structurally valid item without episode, total-fact, per-category, or output-membership count truncation/rejection. At least one episode, exact fields, per-entry safeguards, cleanup/deduplication/noise filtering, deterministic positive salience, unique IDs, safe archive filename, scope/predecessor/time/execution/integrity validation remain required. Launch/provider configuration remains unchanged.
- INV-024 — Message-local constituents carry only local kind/range plus raw-backed natural refs. `MemoryManager` separately captures/verifies the lineage head and maps it to `previousCompactionId`. Prompt contract version 1/2 lives only in lineage execution audit metadata; new records use 2, and readers preserve supported mixed values.

## 5. Canonical Message Composition Contract

Every finalized message remains a provider-neutral `Message`. When one physical user message contains more than one logical source, schema v5 stores message-local constituent ranges only:

```ts
type WorkingContextUserConstituent =
  | { kind: "compacted_memory"; textRange: TextRange }
  | { kind: "retained_user"; textRange: TextRange; rawTraceIds: string[] }
  | { kind: "current_user"; textRange: TextRange; rawTraceIds: string[] };
```

Normative rules:

- the snapshot serializes messages and their message-local structure; it stores no compaction ID, episode ID, semantic ID, lineage record, or current-state field;
- `kind: "compacted_memory"` marks which text belongs to the recurrent memory input but does not identify its producing record;
- `MemoryManager` obtains the prior `compactionId` only from the lineage tail and retains that baseline outside the LLM strategy;
- raw-backed retained/current constituents preserve only the raw-trace identifiers already needed for selection and archival;
- current-output loading obtains episode/semantic IDs only from the lineage head; and
- physical message text/media remains in the message and is never copied into lineage.

### 5.1 Memory section wording

Compacted memory is context, not a new request. Its wording must clearly establish that role, for example:

```text
You are continuing an ongoing task. Here is a concise summary of earlier work to help you resume.
Use it as context for previous reasoning, actions, findings, decisions, constraints, and open work.

Earlier progress:
1. <earlier-work summary>
```

### 5.2 First retained continuation is a compatible user message

When the first non-system retained message is a compatible user message, compacted memory and that message are represented as one canonical user turn:

```text
You are continuing an ongoing task. Here is a concise summary of earlier work to help you resume.
Use it as context for previous reasoning, actions, findings, decisions, constraints, and open work.

Earlier progress:
1. <earlier-work summary>

The next retained user message was:

<retained user content>
```

The retained message's media remains structured. The merged message retains separate memory and retained-input provenance sections.

### 5.3 First retained continuation is not a user message

When the first retained continuation is assistant/tool history, insert one standalone compacted-memory user message before the retained continuation. Do not merge through the assistant/tool boundary.

### 5.4 No retained continuation and a current user request follows

When compaction produces system + compacted memory and request assembly then appends the current user input, compose one canonical user turn:

```text
You are continuing an ongoing task. Here is a concise summary of earlier work to help you resume.
Use it as context for previous reasoning, actions, findings, decisions, constraints, and open work.

Earlier progress:
1. <earlier-work summary>

The user's current message is:

<current user content>
```

The current input's media remains structured and associated with the current-input section.

### 5.5 General adjacent-user rule

Before snapshot publication and provider rendering, adjacent compatible user messages are coalesced without reordering and with provenance section boundaries preserved. Historical retained inputs and the active current input must be labeled according to their actual role; a historical message must not be called the current request.

Do not coalesce:

- across an assistant message;
- across a logical tool-call/result boundary;
- when doing so would invalidate provider-native tool continuation;
- by flattening media or tool structures into lossy text;
- when one source boundary cannot be represented unambiguously.

### 5.6 Compactor input rendered conversation history

The server invokes the Memory Compactor with one user message. The complete natural task plus stable JSON/schema/sizing policy lives only in the product-managed system prompt. The operation user message contains only the compactable logical WorkingContext prefix enclosed once by an XML-style outer boundary:

```text
<conversation_history>
User:
You are continuing an ongoing task. Here is a concise summary of earlier work to help you resume.
Use it as context for previous reasoning, actions, findings, decisions, constraints, and open work.

Earlier progress:
1. <projected compacted-memory episode>

The user's current message is:
<adjacent selected current-user content>

Assistant:
<selected visible assistant content>

Tool:
name: run_bash
status: success
arguments:
  <visible/redacted/bounded arguments>
result:
  <visible/redacted/bounded result>
</conversation_history>
```

For a first compaction, there is no compacted-memory user region; the history begins with the first selected natural user/assistant/tool unit.

Normative rules:

- The rendered content is the **compactable logical conversation prefix**, not a dump of storage objects and not the entire provider request. Leading system messages, retained recent suffix, a current user input not yet appended to WorkingContext, and live/incomplete tool protocol remain outside the compactor input according to the planner contract.
- When M(n-1) exists, its projected compacted-memory user region is included in its actual first non-system logical position, followed by selected R(n). It is not extracted, duplicated, or labeled as “current memory,” “memory to revise,” or a separate evidence seed.
- Rendering preserves canonical message turns. If the projected earlier-summary constituent and adjacent compatible retained/current user constituent were composed into one canonical user turn, they appear under one `User:` label with their natural retained/current framing. The renderer must not expand those internal constituent ranges into consecutive artificial `User:` entries. An intervening assistant or tool turn remains a real boundary.
- Internal typed constituent provenance identifies only message-local kind/ranges and the independently selected natural constituents' raw refs. It carries no producing or previous compaction identity. Separately, `MemoryManager` captures/verifies the lineage head and maps it to `previousCompactionId` during acceptance. The continuous LLM-facing transcript does not weaken that application-owned lineage/archive distinction.
- Exactly one application-generated `<conversation_history>` opening tag and one matching closing tag wrap the complete selected prefix. Entries inside it are not individually wrapped. The tag is a prompt boundary, not a persisted evidence format.
- Before insertion, source-originated literal `<conversation_history>` and `</conversation_history>` sequences are escaped so user, assistant, or tool content cannot imitate or prematurely close the application-owned boundary. Boundary escaping affects only the rendered prompt view.
- Visible user and assistant content remains. `Message.reasoning_content`, raw reasoning, provider-private thinking, and the label `Assistant work notes` are excluded. Provider-required reasoning may remain in WorkingContext/provider continuation state; exclusion here does not mutate it.
- Each selected settled tool call and its corresponding terminal outcome becomes one natural `Tool` block with `name`, `status`, `arguments`, and exactly one `result` or `error`. The prompt does not label it `Assistant tool call`. Correlation occurs before display, so call IDs are not needed in LLM-facing text. Incomplete/live tool protocol remains outside the selected prefix.
- Raw trace IDs, turn IDs, sequence numbers, tool-call IDs, source/correlation/provider event IDs, other backend bookkeeping, and timestamps not present in the logical WorkingContext are not rendered.
- Generated Work Evidence Markdown is not read by native compaction. Both consumers use the same core visible-value/readable-tool presentation capability, but native compaction adapts selected WorkingContext while Work Evidence adapts raw historical replay.
- Shared redaction runs before length budgeting. The compactor's configured bound applies independently to each variable message, argument, result, or error value—not to the whole Tool block—using deterministic head-and-tail preservation around exactly one `… [N characters omitted] …` marker. `N` equals the length removed from the redacted serialized value. Prefix-only or silent clipping is forbidden.
- This is deterministic presentation/budget protection. It does not call another model, create a tool-result summary, persist a new evidence copy, or change coarse whole-input provenance.
- The complete natural target `agent.md` and exact history-only builder composition live in `memory-compactor-prompt-content-contract.md`. The operation user message contains no task text, JSON schema, episode/fact sizing policy, or platform-internal terminology, preventing drift between prompt and payload.

### 5.7 Structured compactor output

The target LLM response is content-only and quality-first, with the natural number of episodes and facts chosen by the LLM:

```json
{
  "episodes": [
    { "summary": "one coarse episode summary" }
  ],
  "critical_issues": [{ "fact": "string" }],
  "unresolved_work": [{ "fact": "string" }],
  "durable_facts": [{ "fact": "string" }],
  "user_preferences": [{ "fact": "string" }],
  "important_artifacts": [{ "fact": "string" }]
}
```

Normative rules:

- the compactor input is one natural rendering of the selected logical WorkingContext prefix: projected M(n-1) user region when present, followed by selected settled R(n);
- the response is one complete replacement output, not a delta against the prior memory;
- the system prompt directs the LLM to retain still-valid prior state, integrate new work, and express the latest consolidated understanding without returning old/new bundle identifiers;
- `episodes` contains at least one non-empty summary and uses the smallest sufficient set to preserve distinct task phases, important outcomes, and current state; unrelated work must not be conflated merely to reduce count, while chatter/repetition must not create episodes;
- fact counts are chosen naturally by the LLM. Preserve continuation-critical facts, prioritizing constraints, decisions and rationale, unresolved work, user preferences, and important artifacts; retain deterministic category/entry normalization and existing per-entry safeguards;
- `agent-config.json`, runtime/model resolution, and provider output-token configuration remain unchanged; this ticket adds no numeric completion ceiling;
- the response contains no raw IDs, snapshot IDs, activity IDs, evidence labels, timestamps, or source citations;
- `MemoryManager` captures/verifies the lineage head, reuses the pending `compactionId`, assigns episode/semantic IDs, builds the accepted candidate, records direct-input edges, and records source/derivation times; and
- a missing/empty/malformed episode list is rejected through the existing parser-failure path. Structurally valid entries are not silently dropped or rejected by cardinality; a token-truncated malformed response follows the same zero-write retry path.

### 5.8 Tool-call and tool-result handling

- Internally, a settled tool-call/result group is one assistant tool-call payload whose selected calls have corresponding terminal tool result or error payloads.
- The normal compaction planner may select a settled group as one indivisible message unit.
- Canonical conversation-history rendering emits one `Tool` block per correlated call/outcome in call order. Each block contains `name`, `status`, `arguments`, and exactly one `result` or `error`; backend call IDs and the phrase `Assistant tool call` are absent.
- For a terminal interaction, the common renderer derives `status` from the outcome: `result` means `success`, and `error` means `error`. For a genuine `no_outcome`, the source adapter supplies the truthful lifecycle status.
- Assistant visible content remains its own `Assistant` entry. Assistant reasoning/work notes are not rendered.
- The compactor-specific bound applies separately to variable arguments, result, error, and message content through explicit head/tail preservation; structural labels and status are retained.
- A latest live, incomplete, or unconsumed tool-call/result group is protected as continuation and is not compacted, split, or removed.
- This ticket does not introduce a separate tool-result condenser or a second LLM call dedicated to tool output.

### 5.9 Shared readable presentation capability

The reuse boundary is deliberately smaller than either consumer:

```text
planner-selected WorkingContext units
-> compaction-owned source adapter
                                \
                                 -> core readable presentation capability
                                /      visible-value serialization
raw-backed historical replay events    redaction
-> Work-Evidence-owned source adapter   Tool body rendering
                                       configurable head/tail omission
```

The common renderer has one tight input and one consumer-neutral string output:

```ts
type CondensedToolCallInput = {
  name: string;
  arguments: unknown;
  outcome:
    | { kind: "result"; value: unknown }
    | { kind: "error"; value: string }
    | { kind: "no_outcome"; status: string };
};

type CondensedToolCallRenderOptions = {
  maxValueChars: number | null;
};

render(input, options) -> string
```

The returned string is only the body beneath a consumer-owned Tool header:

```text
name: run_bash
status: success
arguments:
  {
    "command": "..."
  }
result:
  ...
```

A genuine unavailable outcome renders:

```text
name: run_bash
status: interrupted
arguments:
  {
    "command": "..."
  }
result: not available
```

Normative rules:

- visible-value serialization preserves the established Work Evidence rule: strings remain their text, `null`/`undefined` become `null`, JSON-serializable non-strings use indented JSON, and non-serializable fallbacks use their stable string form;
- `result` derives `status: success`; `error` derives `status: error`; terminal status is not an independent input that could contradict the outcome;
- native compaction accepts only `result` or `error` outcomes because its planner selects settled call/result groups;
- generated Work Evidence normally correlates a terminal result or error before rendering. It may use `no_outcome` only when no terminal raw record genuinely exists; that variant preserves the source-supplied truthful status and renders the exact line `result: not available`;
- waiting, call/result correlation, lifecycle interpretation, and the decision that no terminal record genuinely exists belong to the source adapter, not the renderer;
- consumer source models, timestamps, XML/Markdown envelopes, file/manifest metadata, selection, ordering, and persistence do not enter the shared Tool value;
- the core formatter returns readable body content; compaction adds `Tool:` inside its one conversation-history boundary, while Work Evidence adds its timestamped `tool:` Markdown header;
- the core bound is configurable per consumer. Compaction retains its tighter prompt budget; generated Work Evidence retains its larger visible-value budget;
- values at or below the configured bound remain complete after redaction;
- oversized values preserve deterministic non-empty head and tail around one explicit omitted-character marker/count;
- omission applies independently to user/assistant content and to each Tool `arguments`, `result`, or `error` value, never to the complete structural Tool block; and
- `autobyteus-ts` owns this concern-neutral presentation capability. `autobyteus-server-ts` may consume it, but core code never imports server Work Evidence code.

### 5.10 Startup derived-memory reset

Before agent runtime or WorkingContext restore, DF-S02 runs one registered app-data migration over standalone and team-member run directories:

- remove `episodic.jsonl`;
- remove `semantic.jsonl`;
- remove `working_context_snapshot.json`;
- remove `compacted_memory_manifest.json`;
- preserve `raw_traces_active.jsonl`, every completed raw-trace archive file, and every raw-trace manifest;
- treat an absent target file as an idempotent no-op;
- record each run/file outcome through the existing app-data migration result/log contract;
- return `FAILED`, never `SUCCEEDED_WITH_WARNINGS`, when run discovery or any required deletion fails;
- remain retryable after `FAILED`;
- require `AppDataMigrationRunner.runPending()` to persist the result of every attempted required definition, then throw if any required result is non-startable;
- preserve `SUCCEEDED` and the existing `SUCCEEDED_WITH_WARNINGS` status as startable for other registered migrations;
- require `startConfiguredServer` to log and rethrow the runner failure before `bootstrapBuiltInAgents`, `buildApp`, or `app.listen`; the existing CLI `startServer().catch(...)` remains responsible for process exit; and
- never parse, transform, project, or backfill the removed content.

After success, an absent/empty `compaction_lineage.jsonl` means no current compacted memory. The normal runtime contains no old-schema DTO, row reader, fallback, state file, manifest, or format branch. The first later successful compaction establishes C1 using only newly selected raw-backed activity and `previousCompactionId: null`.

## 6. Detailed Use-Case Contract

### Activity And Projection

#### UC-001 — Record native or external runtime activity

**Trigger:** A supported runtime emits a user, assistant, reasoning, tool, boundary, or other retained event.

**Data-flow spine:** DF-P01; external-runtime variant DF-P09.

**Handling:** The runtime/memory writer normalizes the event and assigns a run-scoped stable trace ID, observed timestamp, turn identity, sequence, type, and payload. Provider-private transport/reasoning material outside retention policy is not required.

**Outcome:** The original record is appended to the active raw trace and is available for current activity projection and later evidence lineage.

#### UC-002 — Open the recent Event Monitor

**Trigger:** A user opens a standalone or team-member run.

**Data-flow spine:** DF-P02 with bounded paging flow DF-L07.

**Handling:** Run-history projection reads `raw_traces_active.jsonl` only, reconstructs active replay events, selects the bounded recent window, and returns current conversation/activity visuals.

**Outcome:** Fast recent-activity display; no archive read and no working-context snapshot interpretation.

#### UC-003 — Browse earlier Event Monitor activity

**Trigger:** The user requests earlier activity from the current monitor window.

**Data-flow spine:** DF-P02 with DF-L07; active-rewrite return path DF-R02.

**Handling:** Paging stays within the same active-file generation, uses stable active-event identity/cursor semantics, and stops at the beginning of the active trace.

**Outcome:** Archived segments remain unreachable from this UI path. Active-file replacement expires the old cursor instead of falling back to archives.

#### UC-004 — Publish the compaction input/output lineage relation

**Trigger:** Normal native compaction planning identifies the current prior-memory output when present and selects a non-empty exact settled raw-backed natural `WorkingContext` prefix R(n) to consolidate with it.

**Data-flow spine:** Successful compaction may enter through DF-P04, DF-P05, or DF-P10; each uses planning DF-L01, proposal DF-L02, and accepted commit DF-L04.

**Handling:** Before generation, `MemoryManager` captures the optional lineage-head ID as baseline state and the planner retains the pending `compactionId` plus raw IDs selected for R(n). The strategy returns normalized content/retained continuation/execution metadata and selected raw IDs but no compaction/output IDs or accepted candidate. `MemoryManager` verifies the pending state and unchanged lineage head, maps the baseline head to `previousCompactionId`, assigns output IDs, and builds/validates the accepted candidate. Commit then creates one complete immutable native-compaction raw-trace archive file from R(n), persists output rows, and publishes exactly one immutable/versioned `CompactionLineageRecord` containing `compactionId`, optional `previousCompactionId`, the completed file's existing run-relative `file_name`, every produced episode/semantic ID, execution/version metadata, and optional hashes. Lineage normalization retains all natural-count membership, validates the remaining structural invariants, and new records use prompt contract version 2. It repeats no raw IDs/content, prior/output content, rendered prompt, ancestral refs, parallel activity/generation ID, fabricated segment ID, or internal boundary key.

**Outcome:** A successful compaction publishes one small reference-only lineage record shared by every generated episode and semantic fact; runner/parser failure publishes none.

### Normal Request And Compaction

#### UC-005 — Assemble a request without compaction

**Trigger:** A normal user request arrives and no compaction is pending.

**Data-flow spine:** DF-P03 with canonical finalization DF-L03.

**Handling:** The original user input is recorded as a raw activity event, then appended/finalized through `MemoryManager` in `WorkingContext`; tool-protocol safety runs; the finalized context is snapshotted; and those same logical messages are rendered.

**Outcome:** Snapshot and rendered logical input represent the same finalized provider-neutral context.

#### UC-006 — Immediate compaction after a completed no-tool assistant response

**Trigger:** Post-response budget evaluation requests compaction and no tool execution is pending.

**Data-flow spine:** Immediate post-response path DF-P10 with DF-L01, DF-L02, DF-L03, and DF-L04.

**Handling:** Compaction runs against a detached copy of the complete current `WorkingContext`, after the assistant response has been committed. It combines the current prior-memory output, when present, with the eligible settled natural prefix and asks for one quality-first complete replacement; the LLM chooses the natural number of episodes and facts needed for continuation, while recent natural context is retained.

**Outcome:** A validated replacement output becomes current and is installed/snapshotted without waiting for another user message.

#### UC-007 — Deferred compaction during a tool turn

**Trigger:** A tool-calling assistant response crosses the compaction threshold.

**Data-flow spine:** DF-P05 with DF-L01, DF-L02, DF-L03, and DF-L04.

**Handling:** Mark compaction pending, execute and ingest matching tool results, protect the latest unconsumed assistant tool-call/result group, and execute compaction before the same-turn continuation request.

**Outcome:** The next provider request retains a complete native tool protocol suffix.

#### UC-008 — Compaction before a newly arrived user request

**Trigger:** Current user input has been recorded as a raw trace and request assembly finds pending compaction.

**Data-flow spine:** DF-P04 with DF-L01, DF-L03, and DF-L04.

**Handling:** The compaction plan is based on the pre-input `WorkingContext`; therefore the newly recorded raw input is not in the compacted units or archival set. Install the replacement context, then append/finalize the current user input through the canonical adjacent-user composition rule and persist the final snapshot before rendering.

**Outcome:** Older selected raw events are archived unchanged, the current user raw event remains active, and the LLM receives compacted memory plus the current request naturally.

#### UC-009 — Retained continuation starts with user content

**Trigger:** Compaction retains a first non-system user message.

**Data-flow spine:** DF-P04 with planning DF-L01 and canonical composition DF-L03.

**Handling:** Compose compacted memory and the retained user message into one canonical user turn with distinct provenance sections.

**Outcome:** No provider dependency on consecutive compatible user messages.

#### UC-010 — Retained continuation starts with assistant/tool content

**Trigger:** Compaction retains assistant/tool history as the first continuation.

**Data-flow spine:** DF-P05 with planning DF-L01 and canonical composition DF-L03.

**Handling:** Insert one standalone compacted-memory user message before the retained history and preserve the structured assistant/tool sequence unchanged.

**Outcome:** Natural memory injection without crossing protocol boundaries.

#### UC-011 — Multimodal user content after compaction

**Trigger:** The retained or current user message contains image/audio/video parts.

**Data-flow spine:** DF-P03 or DF-P04 with DF-L03; persistence/restore continuation DF-P07.

**Handling:** Merge only textual framing/content while retaining the media as structured user content associated with the correct provenance section. Do not stringify locators into summary text unless the normal provider contract already requires that representation.

**Outcome:** Same media reaches the renderer with clear compacted-memory/current-input semantics.

#### UC-012 — Repeated compaction

**Trigger:** A context that already contains a current compacted-memory output crosses the threshold again, including a long-lived run that repeats the operation many times.

**Data-flow spine:** DF-P06 with DF-L01, DF-L02, and DF-L04.

**Handling:** Extract the prior memory region by its message-local constituent kind/range even when it shares one physical user message with separately identified retained/current user sections. Separately, `MemoryManager` captures the lineage head before planning. A successful repetition requires a non-empty newly selected raw-backed natural prefix R(n). Combine the prior memory region with R(n) and produce one complete bounded replacement output. During manager acceptance, the unchanged baseline head supplies the new record's `previousCompactionId`. Append the new record only after output persistence; it then becomes the current head, while earlier output remains immutable but inactive. Archive only R(n)'s selected natural raw refs; prior memory alone is not a successful compaction input.

**Outcome:** After any number of compactions, WorkingContext contains one bounded latest output. The previous memory remains causally represented through recursive lineage rather than being appended beside the replacement or ignored by the compactor.

### Snapshot, Resume, And Rendering

#### UC-013 — Persist a finalized WorkingContext

**Trigger:** `MemoryManager` successfully appends, repairs, or replaces current context.

**Data-flow spine:** DF-P03, DF-P04, DF-P05, or DF-P06 with DF-L03/DF-L04 as applicable.

**Handling:** Serialize the finalized provider-neutral messages, including role, content, reasoning, media, tool payloads, and typed message-local constituent ranges, to `working_context_snapshot.json` using schema v5. Persist no compaction ID, output ID, lineage record, or current-state field in the snapshot.

**Outcome:** The snapshot is the normal continuation/resume representation of current model context.

#### UC-014 — Resume from a valid snapshot

**Trigger:** Runtime bootstrap finds a valid snapshot in the new current schema.

**Data-flow spine:** DF-P07.

**Handling:** Validate message-local ranges and tool/media structures, deserialize directly into `WorkingContext`, run bounded tool-protocol safety, persist any legitimate repair, and continue. Separately, the lineage repository reads the absent/empty state or last valid record for current-output lookup. Do not rebuild from Event Monitor data, resummarize raw history, or infer lineage from snapshot text.

**Outcome:** The model resumes with the same logical context that was previously maintained.

#### UC-015 — Reset pre-lineage derived memory before runtime

**Trigger:** Server startup runs required app-data migrations before built-in-agent bootstrap and discovers one or more run directories containing pre-lineage derived-memory files.

**Data-flow spine:** Startup-reset secondary spine DF-S02 with per-run reset DF-L06.

**Handling:** The registered reset migration discovers standalone and team-member run directories and applies §5.10. It deletes only `episodic.jsonl`, `semantic.jsonl`, `working_context_snapshot.json`, and `compacted_memory_manifest.json`; it preserves active/archive raw traces and raw-trace manifests. Missing targets are idempotent no-ops. It records itemized outcomes through the existing migration repository/log and returns `FAILED` for any discovery/deletion failure. `AppDataMigrationRunner.runPending()` persists all attempted required results and throws after processing when one is non-startable. `startConfiguredServer` logs and rethrows that failure before `bootstrapBuiltInAgents`, `buildApp`, or `app.listen`; the existing CLI rejection handler terminates the process. `SUCCEEDED` and existing `SUCCEEDED_WITH_WARNINGS` remain startable. On success, normal bootstrap sees absent/empty lineage, installs no compacted-memory constituent, and creates only current-schema state going forward.

**Outcome:** Every upgraded run begins a clean lineage epoch without runtime format branches. Its first successful new compaction creates C1 with `previousCompactionId: null`.

#### UC-016 — Render the provider request

**Trigger:** Request assembly has a finalized `WorkingContext`.

**Data-flow spine:** DF-P03, DF-P04, or DF-P05 with canonical finalization DF-L03.

**Handling:** Provider renderer translates roles, tool payloads, media, and provider-native context into its wire format. It does not perform memory/current-input semantic repair. The logical message list passed to the renderer is the same finalized list represented by the latest successful snapshot mutation.

**Outcome:** Cross-provider payloads share one semantic context while retaining legitimate wire differences.

#### UC-017 — External runtime without AutoByteus semantic WorkingContext compaction

**Trigger:** Codex/Claude or another storage-only runtime records activity/provider compaction.

**Data-flow spine:** DF-P09.

**Handling:** Preserve normalized raw activity and provider/session compaction boundaries exactly as today. Event Monitor remains active-raw based. New lineage identities remain runtime-neutral, but this ticket does not run AutoByteus episodic/semantic compaction or persist AutoByteus WorkingContext snapshots for the external session.

**Outcome:** Cross-runtime evidence is unified without inventing a false working-context authority.

### Compacted-Memory Provenance

#### UC-018 — Create one episode from one bounded compaction input

**Trigger:** Structured compaction returns exactly one valid episode entry for a selected message/evidence window.

**Data-flow spine:** DF-P04, DF-P05, or DF-P10 with proposal DF-L02 and accepted commit DF-L04.

**Handling:** The strategy returns episode content without an output ID. `MemoryManager` acceptance reuses the pending `compactionId`, assigns the episode ID, maps the unchanged baseline lineage head to `previousCompactionId`, and builds the accepted candidate. Commit persists the output row before appending the lineage record as the new head. The LLM returns summary content only.

**Outcome:** The episode resolves deterministically to its producing `compactionId`, all recorded direct inputs, and complete original-root evidence/source intervals through recursive `previousCompactionId` edges; content is loaded from authoritative stores only when requested.

#### UC-019 — Create multiple episodes from one extraction

**Trigger:** One valid structured compaction response contains multiple non-empty episode entries for the same selected input.

**Data-flow spine:** DF-P04, DF-P05, or DF-P10 with proposal DF-L02 and accepted commit DF-L04.

**Handling:** The strategy returns episode content with an LLM-chosen natural item count and no output IDs. Parser, normalizer, and acceptance retain every structurally valid episode; no fourth-or-later item is discarded or rejected by count. `MemoryManager` acceptance assigns every episode ID and records all episodes in the accepted candidate as outputs of the same `compactionId`. Commit persists the rows before the one reference-only lineage record, whose append makes it the new head. Fine intra-file localization is not required by this ticket.

**Outcome:** Every episode from the same response—including a fourth or later episode—persists, appears in the appended/read lineage record, participates in exact-head projection when current, and resolves through the one producing compaction record. No episode repeats raw pointers.

#### UC-020 — Create semantic facts from the compaction input

**Trigger:** The normal structured compaction response includes zero or more valid semantic facts alongside its non-empty model-decided episode set.

**Data-flow spine:** DF-P04, DF-P05, or DF-P10 with proposal DF-L02 and accepted commit DF-L04.

**Handling:** The strategy returns accepted fact content without output IDs. `MemoryManager` acceptance assigns each semantic artifact ID and lists every fact in the accepted candidate as an output of the same `compactionId` used for the episode outputs. Commit persists semantic rows before lineage/current publication. The LLM returns fact content only; it does not select fine evidence labels or storage pointers.

**Outcome:** Every valid semantic fact—including a twenty-first or later fact—persists, appears in appended/read lineage membership, participates in current projection when current, and resolves to the successful compaction input without LLM evidence labels or copied source text.

#### UC-021 — Ask where a memory came from

**Trigger:** An authorized agent/backend caller supplies run/member scope and a typed `MemoryArtifactRef` with explicit `kind: "episode" | "semantic"` plus `id` to the provenance resolver.

**Data-flow spine:** DF-P08 with recursive resolution DF-L05.

**Handling:** Use the explicit kind to search only `episodeIds` or only `semanticIds`; never guess between subjects. Locate the `CompactionLineageRecord` listing the supplied artifact ID, return its producing `compactionId`, validate its run-relative raw-trace archive `file_name` through the archive manifest, and return that completed file's raw membership/time bounds plus optional direct `previousCompactionId`. Recursively follow `previousCompactionId` records with cycle protection and deduplication. Return the directly referenced file's raw-source interval and transitive-root interval separately from derivation time. Read authorized raw content through the existing archive manager; never persist or accept an absolute machine-specific path.

**Outcome:** Deterministic explanation of both the direct input actually read and the original work that ultimately influenced it.

#### UC-022 — Query an unknown or inconsistent current-format artifact

**Trigger:** The provenance resolver receives a typed episode/semantic reference not listed by any current-format lineage record, or traversal encounters missing/inconsistent state inside a referenced current-format chain.

**Data-flow spine:** DF-P08 with recursive resolution DF-L05.

**Handling:** If no current-format lineage record lists the explicit typed ID, return `not_found` without searching discarded row files or guessing by ID shape/content. If a listed output's producing record, prior record, output row, or referenced completed archive is missing or inconsistent, return an integrity error naming the broken current-format relation. Do not silently downgrade, repair, or infer an edge.

**Outcome:** Origin results are complete for valid current-format chains and explicit for unknown or corrupted state, with no compatibility branch.

### Failure And Consistency

#### UC-023 — Reachable compactor failure before writes

**Trigger:** Normal pending-compaction execution calls the configured compactor runner, and that runner fails or returns a response rejected by `CompactionResponseParser`.

**Data-flow spine:** Failure/retry return path DF-R01 with lifecycle reporting DF-S03.

**Handling:** Emit failure for the same in-memory `compactionId`, discard any unpublished output/lineage candidate, keep the lineage head, installed/snapshotted baseline context, and raw/memory storage unchanged, and keep the pending request. The next normal user request retries the same pending `compactionId`, matching the existing product path.

**Outcome:** A reachable compactor failure cannot create new work-evidence, memory, lineage, or archive state and cannot dispatch a provider request.

#### UC-024 — Active trace is rewritten while Event Monitor paging is in progress

**Trigger:** Successful compaction/rotation replaces the active file generation.

**Data-flow spine:** Cursor return path DF-R02 with DF-P02 and bounded paging DF-L07.

**Handling:** Existing visible UI content may remain, but the earlier-page cursor expires. The UI returns to/reloads latest active projection; it never opens archives to continue the cursor.

**Outcome:** Event Monitor remains source-consistent and active-only.

### Compaction Input Rendering

#### UC-025 — Render the selected compaction input as natural conversation history

**Trigger:** DF-L01 has selected a non-empty raw-backed R(n) and optional current M(n-1) for a normal immediate, pre-dispatch, tool-continuation, or repeated compaction.

**Data-flow spine:** Compaction input-rendering local spine DF-L08 inside DF-P04, DF-P05, DF-P06, or DF-P10.

**Handling:** Take the planner-selected logical WorkingContext constituents in order: the projected M(n-1) earlier-summary region when present, followed by selected settled R(n). Flatten the selected visible messages and reuse the canonical `WorkingContextFinalizer` composition boundary before adding visible labels; the compactor renderer must not own duplicate connector wording. If that summary region and adjacent compatible retained/current user content belong to one composed user message, render both under one `User:` label with their natural framing rather than exposing constituent ranges as consecutive user turns. Preserve real assistant/tool boundaries. Render visible `User`/`Assistant` content and one `Tool` block per correlated call/outcome directly from those canonical turns. Each Tool block contains `name`, `status`, `arguments`, and exactly one `result` or `error`; no `Assistant tool call` label or backend call ID appears. Use the core presentation capability to serialize/redact each variable value and apply deterministic head/tail omission. Escape source-originated reserved boundary sequences, then wrap the complete selected prefix in exactly one application-generated `<conversation_history>...</conversation_history>` pair. Do not separate M(n-1), add mechanical memory/provenance labels, inject raw occurrence timestamps, re-read generated Work Evidence Markdown, or persist the rendered prompt as lineage content.

**Outcome:** The compactor reasons over one clearly bounded, natural representation of the compactable conversation context that influenced the working LLM, while application-owned metadata continues to distinguish prior-memory lineage from newly archived R(n).

### Generated Work Evidence Rendering

#### UC-026 — Render oversized visible values in generated Work Evidence

**Trigger:** A supported Work Evidence consumer requests the normal archive-plus-active package and historical replay contains user/assistant content or a Tool entry whose arguments, result, or error exceeds the configured Work Evidence visible-value limit. The current product caller's behavior is otherwise unchanged.

**Data-flow spine:** Work-evidence projection spine DF-P11 with shared presentation local spine DF-L09.

**Handling:** `AgentWorkTraceProjectionService` retains its existing source enumeration and historical-replay transformation. Its source adapter first correlates each Tool call with its terminal result/error when one exists, then maps the completed interaction to the common `CondensedToolCallRenderer`. If no terminal record genuinely exists, it maps the call to `no_outcome(status)`; the renderer emits the supplied truthful status and `result: not available`. Shared redaction runs before deterministic per-value head/tail omission. `AgentWorkTraceRenderer` then adds the existing timestamped lowercase `user:`, `assistant:`, `tool:`, or `trace_event:` Markdown envelope and writes the existing files/manifest. It does not read WorkingContext or a compactor prompt, and the common renderer performs no trace lookup or lifecycle coordination.

**Outcome:** Generated Work Evidence preserves its raw-backed timestamped Markdown contract and consumer path while no oversized visible message, argument, result, or error silently loses its tail.

### Quality-First Compactor Sizing

#### UC-027 — Produce a continuation-faithful replacement from a diverse long history

**Trigger:** Normal native compaction selects a large logical prefix containing multiple distinct task phases, outcomes, decisions, constraints, unresolved items, user preferences, and important artifacts, plus chatter/repetition that is not continuation-critical.

**Data-flow spine:** Existing compaction path DF-P04, DF-P05, or DF-P10 with rendering DF-L08, proposal DF-L02, and accepted commit DF-L04; no new primary spine.

**Handling:** The product-managed `agent.md` supplies the complete natural summarization task and stable quality/JSON contract. The operation user message supplies exactly one natural conversation-history block and no other text. The LLM chooses the natural number of episodes and facts, keeps unrelated phases distinct when needed for continuation, omits chatter/repetition/obsolete state, and prioritizes continuation-critical facts. Parser/normalizer/acceptance retain all structurally valid items without count caps and preserve existing non-cardinality safeguards. Launch and provider output-token configuration remain unchanged.

**Outcome:** The next agent can recover independently verifiable anchors from every continuation-critical phase and continue correctly. Success is evaluated by retained meaning and current state, not by requiring or forbidding a particular item count.

## 7. Provenance Identity And Time Contract

### 7.1 Raw source identity

Use compound identity:

```text
(runtime-neutral target/run/member identity, raw trace ID)
```

An absolute filesystem path, mutable `active` label, or timestamp is not a primary raw-record locator. For this ticket's coarse compaction relation, the record's run/member scope plus the completed archive manifest's existing run-relative `file_name` identifies the file containing the exact selected raw-record set.

Exact trace-ID sets are authoritative today. Contiguous ranges may be added only when a stable immutable run-global stream position exists.

### 7.2 Compaction lineage identity

The existing pending `compactionId` becomes the durable identity of a successful compaction and its one output bundle. Episode and semantic artifacts retain their own IDs. No separate activity or generation ID exists. Every successful native compaction publishes one immutable reference-only lineage record with explicit direct inputs and produced outputs. The last successfully appended record is the sole current head and selects the newest accepted output; older successful compaction outputs remain addressable but inactive for default projection.

The following is the logical record shape. It fixes the required information, not the final filename, store technology, or exact field spelling:

```json
{
  "schemaVersion": 1,
  "compactionId": "compaction_operation_0002",
  "scope": {
    "targetKind": "agent_or_team_member",
    "runId": "run-123",
    "memberId": "member-optional"
  },
  "previousCompactionId": "compaction_operation_0001",
  "rawTraceArchiveFile": "raw_traces_000002.jsonl",
  "episodeIds": ["episode-0002"],
  "semanticIds": ["semantic-0002"],
  "derivedAt": "2026-07-29T12:00:00.000Z",
  "execution": {
    "runtimeKind": "autobyteus",
    "provider": "provider-id",
    "model": "model-id",
    "selectionPolicyVersion": 1,
    "promptContractVersion": 2,
    "renderedInputSha256": "optional-integrity-hash"
  },
  "integrity": {
    "recordSha256": "optional-canonical-record-hash"
  }
}
```

Origin lookup uses an explicit subject selector rather than one generic ambiguous ID:

```json
{
  "kind": "episode",
  "id": "episode-0002"
}
```

`promptContractVersion: 2` is the new-write value for the approved target prompt/payload contract. Existing schema-v1 lineage records with `promptContractVersion: 1` remain valid and immutable; the reader accepts/preserves either supported value in one chain and performs the same structural decoding. Unknown values remain unsupported.

`kind: "semantic"` searches only `semanticIds`. The resolver never guesses artifact kind from ID shape or searches two subject stores through one ambiguous selector.

The record contains **no separate activity/generation ID, raw-ID list, message text, prior-memory text, episode/fact text, tool output, media payload, or rendered prompt**. The referenced completed raw-trace archive file owns selected raw membership/content and its manifest entry owns count/first-last IDs/time bounds; durable memory owns memory content. `rawTraceArchiveFile` is the existing manifest `file_name`, scoped by the record's run/member identity. It is not an absolute path. `renderedInputSha256` may verify a reconstructed input but cannot replace the explicit relations.

For the first compaction, `previousCompactionId` is `null`. Every later successful compaction maps the application-owned baseline lineage head to one non-null direct predecessor:

```text
lineage head C(n-1)
  -> previousCompactionId = C(n-1)

absent/empty lineage
  -> previousCompactionId = null
```

The manager retains this application-owned baseline outside the strategy proposal and verifies it again during acceptance while assigning produced output IDs.

Direct edges are authoritative. Recursive raw-root lookup follows `previousCompactionId` and referenced completed raw-trace archive files; it never relabels an ancestor as a direct raw input of a later compaction. `raw_traces_manifest.json` validates that each recorded `file_name` is complete and supplies its metadata. The archive `boundary_key` remains an internal idempotency mechanism and is not a lineage attribute.

### 7.3 Time fields

Keep separate:

- `observed_at`: original raw event occurrence;
- `recorded_at`: raw persistence time when separately available;
- `direct_raw_source_interval`: minimum/maximum occurrence over this compaction's referenced raw-trace archive file, resolved from the file/manifest rather than copied into the lineage record;
- `root_source_interval`: rebuildable minimum/maximum occurrence over all recursively resolved raw roots;
- `derived_at`: episode/semantic-artifact and successful-compaction creation time; and
- append order: the record's physical/logical JSONL position establishes when it became the current head; a separate activation timestamp or state file is not required by this ticket.

Every valid current-format chain resolves a complete root interval. An unknown artifact returns `not_found`; a broken referenced relation is an integrity error.

## 8. Reachable Compaction Failure Contract

A normal compaction attempt follows this reachable sequence:

```text
capture baseline WorkingContext and exact selected provenance refs
-> require non-empty newly selected raw-backed natural input R(n)
-> run compactor
-> parse and normalize output
-> strategy returns IDless content/selection/execution proposal
-> MemoryManager verifies the pending/baseline state
-> MemoryManager reuses compactionId, assigns episode/semantic IDs,
   builds the accepted lineage/replacement-context candidate
-> finalize and validate the accepted context/tool protocol
-> archive exactly R(n)
-> persist episode/semantic output rows
-> append the lineage record as the new head
-> install finalized context, persist v5 snapshot, clear pending
```

The required failure scenario is limited to a compactor-runner failure or a response rejected by `CompactionResponseParser`, both reached through normal pending-compaction execution before strategy writes. The existing pending operation remains in memory and the next normal user request retries it; no new raw-trace archive file, memory output, lineage record, or context/snapshot state is written. Deterministic normalizer or output-validator failures are not treated as product scenarios because no supported built-in path was found that produces them. This ticket does not add staged files, an operation journal, or crash-recovery semantics for hypothetical interrupted filesystem publication.

## 9. Required Scenario Coverage

| Scenario ID | Contract use cases | Required proof |
| --- | --- | --- |
| SCN-001 | UC-001–UC-003 | Event Monitor reads/pages active traces only and never opens archive files |
| SCN-002 | UC-004 | Successful normal native compaction requires non-empty raw-backed R(n), archives exactly R(n) in one complete immutable raw-trace archive file, and publishes exactly one reference-only lineage record keyed by the existing `compactionId`, relating optional `previousCompactionId` and that file's run-relative `file_name` to produced episode/semantic IDs; M(n-1) alone is not eligible and is never re-archived; the record has no repeated raw IDs/content or prompt content, parallel activity/generation ID, fabricated segment ID, or boundary key; runner/parser failure creates neither |
| SCN-003 | UC-005, UC-016 | No-compaction request snapshot and renderer receive the same finalized logical context |
| SCN-004 | UC-006, UC-008, UC-009 | Compaction plus current/retained user content produces natural canonical message composition |
| SCN-005 | UC-007, UC-010 | Tool-call/result suffix survives compaction and provider rendering unchanged |
| SCN-006 | UC-011 | Multimodal input survives composition, snapshot, restore, and renderer translation |
| SCN-007 | UC-012 | Repeated compaction, including a one-thousand-operation long-run case, requires non-empty raw-backed R(n), consumes M(n-1) listed by the prior lineage head plus R(n), produces one complete M(n) with LLM-chosen natural item counts, appends the successful record as the new head, keeps older outputs immutable/inactive, and archives only R(n); M(n-1) alone is a no-op eligibility state |
| SCN-008 | UC-013–UC-016 | The real `startConfiguredServer -> AppDataMigrationRunner.runPending` path scans standalone/team-member runs before agent bootstrap, removes exactly pre-lineage episodic/semantic JSONL, v1-v4 snapshots, and compacted-memory manifests, preserves active/archive raw traces and manifests byte-for-byte, and treats missing targets idempotently. Discovery/deletion failure is recorded as `FAILED`; the runner persists all attempted required results and throws; `startConfiguredServer` rethrows; bootstrap/build/listen mocks prove they were not called. Existing startable statuses still proceed. Current v5 message snapshots then resume directly; absent/empty lineage has no current derived memory, while its last valid record lists the exact current output |
| SCN-009 | UC-017 | External-runtime storage behavior is represented honestly without false AutoByteus context semantics |
| SCN-010 | UC-018–UC-019 | A deterministic response with more than three valid episodes survives parser, normalizer, accepted builder, archive/output persistence, lineage normalization/append/read, exact-head projection, and typed origin membership without count loss; at least-one, unique-ID, safe-record, predecessor/scope, and output-existence invariants still hold |
| SCN-011 | UC-020 | More than twenty valid facts, including category counts above former limits, survive parser/normalizer/acceptance, output persistence, lineage append/read, exact-head projection, and typed origin membership under the same `compactionId`; no LLM-selected labels or application count truncation occur |
| SCN-012 | UC-021–UC-022 | The internal run-scoped resolver reports direct input and recursively deduplicated raw roots for valid current-format IDs, returns `not_found` for unknown typed IDs, and reports a current-state integrity error for a broken referenced chain without guessed edges or row-store fallback |
| SCN-013 | UC-023 | A compactor-runner failure or invalid compactor response leaves the lineage head and baseline state unchanged, and the next normal user request retries the same pending in-memory `compactionId` |
| SCN-014 | UC-024 | Active rewrite expires UI cursor without archive fallback |
| SCN-015 | UC-025 | A recurrent input containing the projected M1 earlier-summary constituent composed with adjacent compatible retained/current user content, later selected R2 user/assistant content, separate reasoning, a settled multi-call tool group, an error, a long command/result, redactable text, and literal source-provided `<conversation_history>`/`</conversation_history>` strings is sent as exactly one naturally ordered application-owned conversation-history block; the composed M1/user turn has one `User:` label rather than constituent-created consecutive labels, M1 is not separated or mechanically relabeled, source delimiter strings are escaped, reasoning/synthetic timestamps/work-note/backend/tool-call IDs and `Assistant tool call` labels are absent, every correlated call/outcome is one Tool block with `name`, `status`, `arguments`, and `result` or `error`, secrets are redacted, and each oversized variable field retains deterministic head and tail around an explicit omitted-character count |
| SCN-016 | UC-026 | A normal generated Work Evidence projection over raw-backed short and oversized message/tool values plus one tool call with no terminal record preserves existing source enumeration, timestamps, ordering, lowercase Markdown labels, filenames, and manifest shape; reasoning remains absent; short values remain complete after redaction; every oversized message, argument, result, or error uses the shared deterministic head/tail omission marker/count rather than silent 20,000-character prefix-only slicing; and the outcome-less call preserves its truthful status and renders `result: not available` through the same common renderer |
| SCN-019 | UC-027 | Canonical prompt/history/canonical-turn and unchanged-configuration coverage remains; deterministic coverage proves >3 episodes and >20 facts survive the complete accepted publication/read/projection/origin path; new records write prompt contract version 2; a mixed version-1 predecessor/version-2 head chain preserves both audit values and resolves recursively; an unsupported prompt audit value is rejected without rewrite or historical decoder; a long multi-thread journey preserves phase-specific continuation anchors without exact-count assertions |

SCN-017 and SCN-018 are retained as the downstream API-REV-006 canonical Qwen/DeepSeek evidence IDs and are not redefined by this upstream contract revision.

## 10. Explicit Non-Goals

- Treating Event Monitor output as the LLM continuation source.
- Treating the working-context snapshot as original activity evidence.
- Injecting compacted-memory checkpoint rows into raw activity traces.
- Showing archived raw traces through the current Event Monitor paging path.
- Making provider renderers infer or repair memory/current-request semantics.
- Default per-token/per-sentence/raw-row citations for every episode.
- Fine LLM-selected evidence labels or citations.
- Work-evidence chunk design or intra-file localization within one work-evidence file.
- A duplicate persisted copy of selected raw-message, prior-memory, output-memory, media/tool, or rendered-prompt content inside lineage records.
- Byte-for-byte historical compactor-prompt replay; this ticket preserves input/output identity, versions, and optional hashes instead.
- Changes to generated Work Evidence source enumeration, timestamp/order semantics, lowercase Markdown labels, filenames/manifest contract, or its improvement-flow consumer. The visible oversized-value change from silent prefix-only clipping to shared explicit head/tail omission is in scope.
- A new frontend provenance/origin screen.
- AutoByteus episodic/semantic compaction or WorkingContext snapshots for storage-only external runtimes.
- A separate tool-result condenser or second tool-output summarization pass.
- Successful compaction with no episode/memory output; the structured response contract requires a non-empty episode.
- Prescribing a preferred, minimum, or maximum episode/fact count or a ticket-specific numeric output-token ceiling. The LLM chooses the natural semantic structure under unchanged launch/provider behavior.
- Separate fact-level correction APIs, invalidation/deletion/redaction tombstones, or reverse-impact traversal. Recurrent compaction may update the latest consolidated understanding, and prior-output projection supersession is explicitly in scope.
- Cross-run extraction or one compaction combining independent previous-compaction outputs from multiple runs. One optional `previousCompactionId` plus one new run-local prefix is the only recursive input shape in scope.
- Interrupted filesystem publication, crash recovery, operation journals, or partial-write retry deduplication.
- Using timestamps, paths, or content hashes alone as derivation proof.

## 11. Approval Record

Approved as the intended-behavior foundation together with `requirements.md` and `use-case-data-flow-spine-map.md` on 2026-07-30, when the user confirmed that the requirements are clear and directed continuation under the design principles. The approved package removes `Assistant work notes`/private reasoning and the mechanical separate prior-memory section from compactor input. The planner includes projected M(n-1) plus selected R(n) as one compactable logical WorkingContext prefix, rendered naturally inside exactly one application-owned `<conversation_history>...</conversation_history>` boundary. Both native compaction and generated Work Evidence use one general `CondensedToolCallRenderer`; a genuine `no_outcome(status)` renders that status and `result: not available`. Their sources, envelopes, timestamps, bounds, and persistence remain separately owned. The contract uses a reference-only compaction-lineage record with authoritative content remaining in raw/durable stores, and every use case is mapped to a complete spine.

Architecture round 1 (`ARCH-REV-001`) identified implementation-critical contradictions in the earlier persisted-state treatment. SR-002 resolved them; architecture round 2 (`ARCH-REV-002`) returned `Pass`, and implementation began. The user then superseded that preservation basis with a simpler clean-cut policy: one startup migration deletes pre-lineage derived memory/snapshots/manifests while retaining raw evidence, and all normal runtime code is current-schema-only. SR-004 removed the superseded compatibility and duplicate-state designs and retained the aligned proposal ownership/publication order: IDless strategy -> `MemoryManager` acceptance -> archive -> output rows -> append lineage as head -> context -> message-only snapshot. It also made required startup failure propagate through `startConfiguredServer` before bootstrap/build/listen. Architecture round 4 passed SR-004; implementation and downstream validation then completed.

On 2026-07-31 the user superseded the fixed cardinality portion after API-REV-006 and requested review before architecture handoff. The solution designer then introduced an unrequested numeric token ceiling. The user rejected it and clarified that the LLM must choose the natural number of episodes and facts. SR-006 removes fixed item counts from both prompt layers and every enforcement layer, introduces no token ceiling, and leaves launch/provider output-token configuration unchanged. That correction subsequently received the SR-007 through SR-009 wording and canonical-turn refinements described below and is now user-approved for architecture review.

During SR-006 review the user requested a separate exact-content artifact so downstream implementation would not invent the system prompt or operation user message. SR-007 added that draft. The user then rejected platform-internal defensive language in the LLM prompt and confirmed that a clear system prompt makes per-operation task text redundant. SR-008 therefore made `memory-compactor-prompt-content-contract.md` the authority for a natural system prompt and a user message that byte-equals only the renderer-produced conversation-history block. During review the user identified that one example expanded a composed summary/current-request user turn into two consecutive `User:` labels and asked that the target wording remain as natural as origin/personal. SR-009 aligns the exact system prompt with that style and requires the renderer to preserve one canonical model-visible user turn while retaining constituent boundaries only for application planning. It does not edit production source or change SR-006 behavior. The user approved SR-009 and authorized architecture review.

Architecture round 5 (`ARCH-REV-005`) passed the material-premise gate but found four technical design gaps in SR-009. SR-010 preserves the approved prompt text and behavior while completing the full accepted path: it removes the hidden lineage membership cap, distinguishes prompt audit value 1 (implemented SR-004 contract) from new-write value 2 (approved natural/history-only/canonical-turn contract) with direct-use mixed chains, refreshes current evidence to actual SR-004 source, and keeps predecessor identity solely in manager-captured lineage state rather than message constituents. Renewed architecture review is required before SR-010 source implementation.
