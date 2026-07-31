# Memory Compaction Use-Case And Data-Flow Spine Map

## Status And Authority

- Status: User-approved normative supplement; SR-010 technical correction ready for renewed architecture review. The approved natural-count/prompt/canonical-turn intent is unchanged; the map now includes the complete lineage validator/store/committer path, prompt audit version transition, actual implemented SR-004 baseline, and message-only constituent boundary.
- Purpose: make every in-scope use case traceable through a complete production or approved target-production data-flow spine before implementation design begins.
- Scope: native AutoByteus working-context compaction, natural conversation-history rendering for the compactor, a shared core readable-tool/text presentation refactor used through source-specific adapters, recurrent memory replacement, reference-only compaction lineage, current-schema snapshot persistence/restore, active-only Event Monitor projection, explicit generated Work Evidence projection, and unchanged external-runtime evidence recording.
- Approval applicability: **Required.** This document constrains intended behavior, ownership, dependency direction, and the design-specification baseline.
- Related authoritative artifacts:
  - `requirements.md`
  - `memory-context-and-lineage-contract.md`
  - `memory-compactor-prompt-content-contract.md`
- Evidence supplements:
  - `investigation-notes.md`
  - `provenance-methodology-analysis.md`
  - `compacted-memory-message-role-analysis.md`

This map does not authorize implementation by itself. SR-004 is the implemented foundation; the user approved the SR-009 behavior. `ARCH-REV-005` requires SR-010 technical completeness before implementation resumes.

## 1. Reading Rules

1. A **primary spine** starts at a supported user/system trigger or approved governing contract and ends at the meaningful product effect.
2. A **secondary spine** is a real adjacent flow that materially supports a primary path but does not own its main business sequencing.
3. A **return/event spine** records a meaningful failure, retry, cursor, or status propagation path.
4. A **bounded local spine** explains an internal algorithm or transition inside one owning node. It never substitutes for the longer primary spine.
5. Store/repository calls are shown on a primary spine only when the persisted effect is itself the meaningful outcome. Otherwise they are off-spine mechanisms serving an authoritative owner.
6. `compactionId` means the existing pending `CompactionOperationId` after the operation succeeds. There is no separate activity ID or generation ID.
7. The expressions M(n) and R(n) are descriptive:
   - M(n): the complete replacement output produced by successful compaction C(n), with the natural number of episodes and facts chosen by the LLM;
   - R(n): newly selected settled raw-backed activity for C(n).

## 2. Spine Inventory

### 2.1 Primary spines

| Spine ID | Scope | Start | Main-line path | End | Governing owner | Why it matters |
| --- | --- | --- | --- | --- | --- | --- |
| DF-P01 | Original activity capture | Supported native runtime event | User/assistant/tool/runtime event -> runtime ingestion boundary -> run-scoped raw-trace recorder -> active raw-trace store -> immutable record identity/content becomes available | Original activity is durably recorded for the run | Raw-trace ingestion boundary; `MemoryManager` on the native path | Establishes the original-evidence leaf without calling it raw memory or mixing it with compacted context. |
| DF-P02 | Event Monitor open and active-only paging | User opens or pages the Event Monitor for a run | Event Monitor UI -> server run-history operation -> `LocalMemoryRunViewProjectionProvider` -> `AgentMemoryService` active snapshot read -> raw-trace event transformation/page policy -> projected UI events | Recent or earlier **active-file** events are displayed | `LocalMemoryRunViewProjectionProvider` | Proves that the activity UI is not a snapshot, durable-memory, or archive-history view. |
| DF-P03 | Provider request without compaction | User sends a request while no compaction is pending | Product dispatch -> runtime input processing -> `LLMRequestAssembler` -> `MemoryManager` canonical WorkingContext mutation -> current snapshot persistence -> provider renderer -> provider dispatch | Provider receives the same finalized logical context represented by the snapshot | `LLMRequestAssembler` for request preparation; `MemoryManager` is the authoritative context boundary | Preserves normal requests while making snapshot and rendered context semantically identical. |
| DF-P04 | Successful native compaction before dispatch | Supported compaction policy marks compaction required and a normal request/continuation reaches preparation | Runtime/policy trigger -> `MemoryManager` retains pending `compactionId` -> `PendingCompactionExecutor` -> planner selects one compactable logical WorkingContext prefix containing projected M(n-1) plus raw-backed R(n) -> natural conversation-history render -> structured compaction proposal -> authoritative accepted-compaction commit through `MemoryManager` -> canonical snapshot -> renderer/provider dispatch | One bounded successor M(n) is current and the request proceeds | `PendingCompactionExecutor` owns operation lifecycle; `MemoryManager` owns the authoritative state transition | This is the main changed business spine: M(n-1) + R(n) becomes M(n), with one archive file and one direct lineage record. |
| DF-P05 | Deferred compaction across a tool turn | Compaction becomes required while an assistant tool-call/result protocol group is still live | Tool-call response -> native tool/raw/context ingestion -> pending compaction retained while live suffix is protected -> next normal tool-continuation request -> `PendingCompactionExecutor` -> accepted-compaction commit -> provider renderer | Complete tool protocol survives and compaction occurs only at the supported preparation point | `PendingCompactionExecutor`, with tool-protocol invariants owned by `MemoryManager` | Prevents a local prefix algorithm from breaking the real runtime/tool continuation path. |
| DF-P06 | Recurrent compaction | A later supported compaction begins after a previous successful compaction is current | Normal preparation -> read M(n-1) from the lineage tail -> planner selects M(n-1) + newly settled R(n) -> compactor proposes complete M(n) -> accepted commit appends C(n) with `previousCompactionId` equal to the prior head -> canonical context projects only M(n) | Bounded current memory is replaced, not accumulated | `PendingCompactionExecutor` plus authoritative `MemoryManager` commit | Ensures the one-thousand-compaction case remains bounded and ancestry is direct rather than copied transitively. |
| DF-P07 | Direct current-schema restore | User sends a follow-up to an inactive native run with a valid schema-v5 snapshot | Follow-up/run activation -> agent bootstrap -> `WorkingContextSnapshotRestoreStep` -> schema-v5 deserialize -> `MemoryManager` install/tool-safety enforcement -> request preparation -> provider dispatch | Runtime resumes from exactly the prior finalized WorkingContext | `WorkingContextSnapshotBootstrapper` for restore selection; `MemoryManager` for installed context | Establishes the snapshot as LLM-continuation authority without making it activity evidence. |
| DF-P08 | Memory-origin lookup | Approved internal caller asks for the source of a typed episode or semantic artifact reference | Run/member scope + artifact kind + artifact ID -> current-format compaction-lineage resolver -> matching output-list lookup -> completed archive validation/read plus `previousCompactionId` traversal -> direct/root response assembly | Caller receives complete direct/root origin, `not_found`, or an integrity error | Compaction-lineage resolver | Makes provenance useful through an unambiguous subject selector without duplicating raw content, guessing historical sources, or asking the LLM to author detailed citations. |
| DF-P09 | External-runtime evidence capture — preservation only | User runs a supported storage-only Codex or Claude runtime | Product runtime launch -> external runtime/session adapter -> normalized trace/event recorder -> run-scoped active/archive raw storage -> active Event Monitor or explicit work-evidence consumer | External activity is recorded truthfully without AutoByteus semantic compaction claims | External runtime recording boundary | Audits the unchanged evidence boundary while keeping external provider/session memory behavior out of implementation scope. |
| DF-P10 | Immediate compaction after a final no-tool response | A supported native LLM response completes with no tool invocation and budget evaluation requests compaction | Provider response -> `LlmPhase` ingests final assistant activity/context -> `evaluateLlmPhaseCompaction` retains pending `compactionId` -> `PendingCompactionExecutor` -> structured compaction proposal -> authoritative accepted-compaction commit through `MemoryManager` -> completed lifecycle/current snapshot | The just-completed turn is compacted immediately without another provider dispatch | `LlmPhase` owns the post-response trigger; `PendingCompactionExecutor` owns operation lifecycle; `MemoryManager` owns the state transition | Represents the real immediate path separately from pre-dispatch request preparation. |
| DF-P11 | Generated Work Evidence projection | A supported Work Evidence consumer requests current trace artifacts | Current caller/consumer -> `AgentWorkTraceProjectionService` -> `AgentWorkTraceSourceReader` -> explicit archive-plus-active source enumeration -> historical-replay normalization -> Work-Evidence source adapter -> shared readable presentation DF-L09 -> timestamped Markdown renderer -> generated work-trace files/manifest -> caller receives package paths/metadata | Readable evidence is regenerated from authoritative raw sources with existing source/order/timestamp/Markdown/file/manifest semantics and explicit head/tail omission for oversized values | `AgentWorkTraceProjectionService` | This is now an in-scope product behavior change, so its full path is primary rather than a local or comparison-only flow. The generated artifact remains separate from native compactor input. |

### 2.2 Secondary spines

| Spine ID | Scope | Start | Main-line path | End | Governing owner | Why it matters |
| --- | --- | --- | --- | --- | --- | --- |
| DF-S02 | Required startup derived-memory reset | Server startup runs registered app-data migrations before built-in-agent bootstrap | `startConfiguredServer` -> `AppDataMigrationRunner.runPending` -> discover standalone/team-member run directories -> per-run DF-L06 removal of episodic/semantic JSONL, WorkingContext snapshot, and compacted-memory manifest -> preserve raw traces/manifests -> persist all attempted required results -> runner throws on any non-startable required result -> caller logs/rethrows before bootstrap/build/listen | Every existing run starts the current model with no pre-lineage derived state | `ResetPreLineageMemoryAppDataMigration`; runner owns required-result enforcement; `startConfiguredServer` owns fail-closed propagation | Confines the one historical-format transition to an existing pre-runtime boundary and keeps all normal runtime code current-schema-only. |
| DF-S03 | Compaction lifecycle reporting | Pending compaction begins, completes, or fails | `PendingCompactionExecutor` -> `CompactionRuntimeReporter` -> run/runtime event transport -> observing UI/log consumer | The same `compactionId` and phase are observable | `PendingCompactionExecutor` | Preserves operation identity across normal success and supported retry. |

### 2.3 Return/event spines

| Spine ID | Scope | Start | Return/event path | End | Governing owner | Why it matters |
| --- | --- | --- | --- | --- | --- | --- |
| DF-R01 | Reachable compactor failure and retry | Configured compactor runner fails or its response parser rejects output | Compactor failure -> `PendingCompactionExecutor` failure classification -> failed lifecycle event -> immediate post-response caller records a diagnostic or pre-dispatch preparation aborts -> pending `compactionId` remains -> next normal request re-enters DF-P04 | No memory/archive/lineage/context write; lineage head is unchanged and the same operation is retried | `PendingCompactionExecutor` | Covers both current real callers while limiting consistency machinery to an observed product path instead of hypothetical interrupted filesystem publication. |
| DF-R02 | Active-page cursor expiry | A successful compaction/rotation rewrites the active raw-trace file while the UI holds an earlier-page cursor | Archive completes -> active file rewrites -> next Event Monitor page request -> active-generation comparison -> `EXPIRED` result -> UI reloads latest active projection | UI does not cross into archived history with a stale cursor | Active-trace page policy under `LocalMemoryRunViewProjectionProvider` | Preserves source consistency for the active-only activity view. |

### 2.4 Bounded local spines

| Spine ID | Parent owner/path | Start | Local path | End | Why it matters |
| --- | --- | --- | --- | --- | --- |
| DF-L01 | Structured compaction planning inside DF-P04/DF-P05/DF-P06/DF-P10 | Baseline provider-neutral WorkingContext | Build semantic/constituent message units -> preserve leading system units -> protect live tool-protocol suffix -> choose retained recent suffix by budget/floor -> include optional projected compacted-memory constituent by message-local kind/range plus selected compactable natural prefix -> require non-empty raw-backed natural R(n) -> collect raw refs only from newly selected natural constituents | Exact strategy input: one ordered compactable logical WorkingContext prefix, retained continuation, and R(n) raw IDs to archive; `MemoryManager` retains the baseline lineage head outside the strategy | Makes the cut deterministic, prevents prior memory alone from creating another compaction, and ensures current prior memory influences the successor without being separately rendered or re-archived. |
| DF-L02 | Structured compaction proposal inside DF-P04/DF-P05/DF-P06/DF-P10 | Canonically rendered recurrent input from DF-L08 | Resolve compactor under unchanged launch -> runner -> all-entry parse -> cleanup/dedupe/noise/positive salience without count caps -> IDless proposal | Natural-count content/selection/execution proposal; no output IDs, prompt audit value, accepted candidate, or writes | LLM owns semantic allocation; application owns structure and accepted identity. |
| DF-L03 | Canonical context finalization inside DF-P03/DF-P04/DF-P05/DF-P06/DF-P10 | Optional current-compaction output, retained/protected continuation, and optional new user input | Preserve leading system messages -> when the lineage-head output exists, build one typed compacted-memory region with no lineage/output IDs -> otherwise build none -> merge only compatible adjacent user regions -> preserve separate message-local constituent ranges/raw provenance/media -> stop at assistant/tool boundaries -> validate tool protocol | One provider-neutral WorkingContext ready for snapshot and rendering | Prevents provider-specific renderers from owning memory/current-request semantics while keeping compaction/output identity solely in lineage. |
| DF-L04 | Accepted-compaction transition inside DF-P04/DF-P05/DF-P06/DF-P10 | Valid IDless proposal, unchanged pending/head, non-empty R(n) | `MemoryManager` maps head to predecessor -> assigns output IDs -> builds accepted candidate with prompt audit value 2 -> committer archives R(n) -> persists every output row -> lineage normalizer validates all non-cardinality invariants and preserves natural membership -> store appends/reads record (supported prompt versions 1/2) -> tail loader projects exact output -> install context -> v5 snapshot -> clear pending | Natural-count output becomes current once and remains origin-resolvable | Includes the complete existing validator/store/committer/read path; no post-output count rejection, new owner, or journal. |
| DF-L05 | Recursive lineage resolution inside DF-P08 | Producing compaction record | Validate scope and output membership -> return direct previous-compaction/archive relation -> validate completed archive filename through manifest -> read raw members/interval -> recurse through `previousCompactionId` with visited set -> deduplicate roots -> combine status | Cycle-safe direct and root provenance response | Keeps records small and direct while preserving recursive explainability. |
| DF-L06 | Per-run obsolete derived-state removal inside DF-S02 | Discovered standalone/team-member run directory | Resolve exactly four target filenames -> remove any existing episodic JSONL, semantic JSONL, WorkingContext snapshot, and compacted-memory manifest -> never open or alter raw-trace files/manifests -> record migrated/skipped/failed details -> return `FAILED` for any discovery/deletion failure -> leave migration retryable | Run directory has no pre-lineage derived state before current runtime | Keeps deletion bounded, idempotent, auditable, and separate from runner-wide status enforcement and every current runtime reader/writer. |
| DF-L07 | Active paging inside DF-P02/DF-R02 | One active raw-trace snapshot plus optional cursor | Transform ordered events -> calculate active generation from file/manifest identity -> validate subject/generation/anchor -> select bounded page -> return valid or expired status | Stable active-only page response | Explains the cursor behavior without turning the page policy into the whole Event Monitor architecture. |
| DF-L08 | Natural compactor conversation-history rendering inside DF-P04/DF-P05/DF-P06/DF-P10 | Planned ordered compactable logical WorkingContext prefix containing optional projected M(n-1) plus selected R(n) | Flatten selected visible messages -> reuse the DF-L03 `WorkingContextFinalizer` composition boundary so a composed earlier summary plus adjacent compatible retained/current input remains one user turn -> adapt visible User/Assistant content and settled call/result groups -> DF-L09 serializes/redacts/bounds values and renders each call/outcome body as `name` + `status` + `arguments` + `result`-or-`error` -> add one `User`/`Assistant`/`Tool` label per canonical turn in logical order -> omit reasoning/backend IDs and synthetic timestamps -> escape source-originated reserved boundary sequences -> wrap the complete prefix once in `<conversation_history>...</conversation_history>` -> return that block as the complete operation user message | Bounded natural representation of the compactable context seen by the working LLM; no duplicated connector policy, consecutive artificial `User:` labels from one composed turn, separate memory section, `Assistant tool call` label, or persisted prompt copy | Preserves WorkingContext semantics while keeping constituent/provenance/storage mechanics out of the LLM-facing prompt and adding no second composition or condenser owner. |
| DF-L09 | Common condensed tool-call rendering inside DF-L08 and DF-P11 | `CondensedToolCallInput` containing only name, arguments, and `result(value)`, `error(value)`, or `no_outcome(status)`, plus the consumer's per-value character bound | Derive `success`/`error` for terminal outcomes or preserve the no-outcome status -> deterministically serialize visible values -> redact sensitive/backend text -> if over the consumer limit, preserve deterministic head and tail around one `… [N characters omitted] …` marker -> render only `name`, `status`, `arguments`, and `result`/`error`; `no_outcome` renders `result: not available` | Consumer-neutral Tool body string returned to the source adapter, with no Tool header, timestamp, XML/Markdown envelope, source ID, or file metadata | Centralizes the genuinely identical condensed Tool rendering policy in `autobyteus-ts`; source adapters still own call/result correlation, lifecycle interpretation, source selection, and their envelopes. |

## 3. Use-Case-To-Spine Coverage

Every normative use case in `memory-context-and-lineage-contract.md` maps to at least one complete primary spine and, where relevant, its secondary, return, or bounded-local detail.

| Use case | Supported trigger / governing basis | Spine mapping | Governing owner and target consequence |
| --- | --- | --- | --- |
| UC-001 — Record native or external runtime activity | A supported runtime emits user, assistant, tool, or lifecycle activity | DF-P01; external variant DF-P09 | Runtime recording boundary writes original run-scoped evidence without memory semantics. |
| UC-002 — Open the recent Event Monitor | User opens the run activity surface | DF-P02 + DF-L07 | Run projection owner reads the active file only and returns the bounded recent window. |
| UC-003 — Browse earlier Event Monitor activity | User selects “load earlier” while an active cursor is valid | DF-P02 + DF-L07; rewrite branch DF-R02 | Page policy reads only the same active generation or expires the cursor. |
| UC-004 — Publish the compaction input/output lineage relation | Normal native compaction succeeds | DF-P04, DF-P05, or DF-P10 + DF-L01 + DF-L08 + DF-L02 + DF-L04 | Accepted-compaction commit publishes one completed raw archive file and one reference-only record keyed by the successful `compactionId`. |
| UC-005 — Assemble a request without compaction | Normal user request with no pending compaction | DF-P03 + DF-L03 | Request assembler obtains the already finalized context from `MemoryManager`; snapshot and renderer see the same logical messages. |
| UC-006 — Immediate compaction after a completed no-tool assistant response | Post-response budget evaluation requests compaction and no tool invocation is pending | DF-P10 + DF-L01 + DF-L08 + DF-L02 + DF-L03 + DF-L04 | The just-ingested assistant turn is included, M(n) becomes current, and the completed state is snapshotted without waiting for another request. |
| UC-007 — Deferred compaction during a tool turn | Policy requests compaction while a tool protocol group is live | DF-P05 + DF-L01 + DF-L08 + DF-L02 + DF-L03 + DF-L04 | Live tool suffix is protected and the same pending operation executes at the next supported continuation preparation. |
| UC-008 — Compaction before a newly arrived user request | User activity is recorded before pending compaction but has not yet entered WorkingContext | DF-P04 + DF-L01 + DF-L03 + DF-L04 | New raw activity is not falsely included in R(n); it is appended after accepted compaction and snapshotted before render. |
| UC-009 — Retained continuation starts with user content | Planned retained suffix begins with a user message | DF-P04 + DF-L01 + DF-L03 | Compatible user regions are canonically combined while retaining distinct constituent provenance. |
| UC-010 — Retained continuation starts with assistant/tool content | Planned retained suffix begins at an assistant/tool boundary | DF-P05 + DF-L01 + DF-L03 | One standalone compacted-memory user region precedes the intact assistant/tool continuation. |
| UC-011 — Multimodal user content after compaction | User sends supported media plus text | DF-P03 or DF-P04 + DF-L03 + DF-P07 | Media stays attached to the real user constituent through composition, snapshot, restore, and provider translation. |
| UC-012 — Repeated compaction | A later compaction starts with a non-empty lineage whose last record is current | DF-P06 + DF-L01 + DF-L08 + DF-L02 + DF-L04 | C(n) directly references C(n-1), archives only new R(n), and projects only bounded M(n). |
| UC-013 — Persist a finalized WorkingContext | Any accepted context mutation or replacement completes | DF-P03/DF-P04/DF-P05/DF-P06 + DF-L03/DF-L04 | `MemoryManager` writes the exact finalized schema-v5 context used for rendering. |
| UC-014 — Resume from a valid snapshot | Follow-up activates a run with valid schema-v5 snapshot | DF-P07 | Bootstrap installs the exact context, repairs tool protocol if required, and continues normally. |
| UC-015 — Reset pre-lineage derived memory before runtime | Server startup discovers pre-lineage derived files in standalone/team-member run directories | DF-S02 + DF-L06 | Required migration removes exactly the obsolete derived files, preserves raw evidence, and blocks runtime on failure. |
| UC-016 — Render the provider request | Request preparation has a finalized provider-neutral context | DF-P03 or DF-P04/DF-P05 + DF-L03 | Renderer translates wire/tool/media details only; it does not decide memory semantics. |
| UC-017 — External runtime without AutoByteus semantic WorkingContext compaction | User runs a supported storage-only external runtime | DF-P09 | Adapter records activity and provider/session boundaries; no false native lineage-head, episodic/semantic, or snapshot ownership is claimed. |
| UC-018 — Create one episode from one compaction input | Accepted compactor output contains one episode because one coherent episode is sufficient | DF-P04, DF-P05, or DF-P10 + DF-L08 + DF-L02 + DF-L04 | `MemoryManager` acceptance assigns the episode ID and the one producing `compactionId` relates it to direct inputs. |
| UC-019 — Create multiple episodes from one extraction | Accepted output contains multiple episodes because distinct task phases or unrelated work should remain separate | DF-P04, DF-P05, or DF-P10 + DF-L08 + DF-L02 + DF-L04 | All produced episode IDs share one producing record; no duplicate evidence references are stored per episode. |
| UC-020 — Create semantic facts from the compaction input | Accepted output contains the natural set of continuation-critical semantic facts chosen by the LLM | DF-P04, DF-P05, or DF-P10 + DF-L08 + DF-L02 + DF-L04 | `MemoryManager`-assigned IDs and one producing record establish provenance; the LLM/strategy supply content only. |
| UC-021 — Ask where a memory came from | Approved internal caller submits run/member scope plus explicit artifact kind and ID | DF-P08 + DF-L05 | Resolver searches only the matching output subject and returns producing compaction, direct inputs, recursive roots, intervals, and completeness status. |
| UC-022 — Query an unknown or inconsistent current-format artifact | Caller supplies an unknown typed ID or traversal finds a broken referenced current-format relation | DF-P08 + DF-L05 | Resolver returns `not_found` or an integrity error and never reads discarded row files or invents edges. |
| UC-023 — Reachable compactor failure before writes | Configured runner fails or response parser rejects output | DF-R01 + DF-S03 | Executor publishes failure, aborts dispatch, preserves the same pending `compactionId`, and leaves all durable/current state unchanged. |
| UC-024 — Active trace is rewritten while Event Monitor paging is in progress | Successful archive/rewrite changes active generation | DF-R02 + DF-P02 + DF-L07 | Cursor expires and UI reloads active latest; it never continues into an archive. |
| UC-025 — Render selected compaction input as natural conversation history | DF-L01 selects one ordered prefix containing optional projected M(n-1) plus non-empty raw-backed R(n) on a normal compaction path | DF-P04, DF-P05, DF-P06, or DF-P10 + DF-L08 + DF-L09 + DF-L02 | The runner receives one task with exactly one natural `<conversation_history>...</conversation_history>` block containing M(n-1) in its model-visible user-role position followed by selected User/Assistant/Tool content. Each Tool block contains `name`, `status`, `arguments`, and `result` or `error`; source delimiter collisions are escaped and reasoning/synthetic timestamps/work-note/backend/tool-call IDs and `Assistant tool call` labels are absent. |
| UC-026 — Render oversized visible values in generated Work Evidence | A supported Work Evidence package request encounters a visible message, tool argument, result, or error beyond the configured Work Evidence bound | DF-P11 + DF-L09 | The generated raw-backed timestamped Markdown retains its source/order/file/manifest contract while oversized values preserve explicit head and tail around the shared omitted-character marker/count instead of silently retaining only the prefix. |
| UC-027 — Preserve a long, multi-threaded history without fixed item counts | Normal native compaction selects a large diverse history | DF-P04/P05/P06/P10 + DF-L01/L08/L02/L04/L05 | Natural items survive parse/normalize/accept, output persistence, lineage append/read, exact-head projection, and origin lookup; new record audit version is 2; launch/provider capacity remains unchanged; SCN-019 prescribes no item count. |

Coverage result: **UC-001 through UC-027 are all mapped.** UC-025 is carried by normal native-compaction primary spines, UC-026 by the supported Work Evidence primary spine, and UC-027 by the existing native-compaction spines plus DF-L02; no new primary spine or subsystem is justified.

## 4. Ownership And Authoritative Boundaries

| Owner | Owns | Does not own |
| --- | --- | --- |
| Raw-trace ingestion boundary | Runtime-event normalization, original record identity/order, active raw persistence | Semantic memory, current WorkingContext, compaction-lineage selection |
| `LocalMemoryRunViewProjectionProvider` | Active-only Event Monitor projection and paging entrypoints | Snapshot restore, archived evidence browsing, episodic/semantic recall |
| `AgentWorkTraceProjectionService` | Explicit generated Work Evidence regeneration from enumerated raw sources; historical-replay adapter invocation; timestamped Markdown/file/manifest contract | Native compactor input selection, current LLM context, or shared low-level presentation policy |
| `LLMRequestAssembler` | One request's preparation order and final renderer invocation | Compaction persistence, memory-selection policy, provider-specific memory merging |
| `PendingCompactionExecutor` | Pending-operation lifecycle, strategy invocation, supported failure/retry reporting, success handoff | Direct WorkingContext field mutation, direct repository/file coordination |
| Structured compaction strategy | Planning, history-only operation-message construction from selected WorkingContext units, compactor invocation, and valid IDless content/selection/execution proposal construction | Stable task/semantic/output-shape policy, model launch budgeting, assigning output IDs, reading/validating the lineage head, building accepted lineage/context candidates, or publishing raw archive/memory/lineage/snapshot |
| Built-in Memory Compactor system prompt | Stable semantic extraction and exact response-shape contract | Per-operation source history, launch/model selection, structural acceptance, or persistence |
| `MemoryManager` | Sole live WorkingContext boundary; separately capture/verify lineage head; map it to `previousCompactionId`; assign output IDs; build/apply accepted candidate and current prompt audit value | Message constituents never carry predecessor identity; manager does not own provider wire or recursive query |
| Canonical context projector/composer | Pure provider-neutral transformation of the lineage-head output plus continuation, preserving message-local constituent ranges without duplicating producing/output IDs; no lineage head means no memory region | Selecting arbitrary durable rows, persistence, provider wire policy |
| Compactor conversation-history renderer | Flatten planner-selected visible messages; reuse the canonical context finalizer rather than inventing user connector text; adapt the resulting turns into visible User/Assistant values and settled Tool values; preserve logical order; emit one `User:` label for a composed earlier-summary/compatible-input turn; omit reasoning/backend IDs and synthetic timestamps; add exactly one application-owned `<conversation_history>` boundary; escape reserved-delimiter collisions; choose visible-value bounds; and return the complete operation-user payload | User-message composition policy, stable task/JSON/sizing policy, raw-record reconstruction, shared redaction/serialization/omission mechanics, lineage identity, generated Work Evidence ownership, or semantic condensation |
| Common `CondensedToolCallRenderer` | Tight result/error/no-outcome input, terminal-status derivation, deterministic visible-value serialization, sensitive/backend-text redaction, Tool-body rendering, configurable explicit head/tail omission, and omitted-character counting | Call/result correlation, waiting, WorkingContext or raw-event selection, timestamps, XML/Markdown envelopes, source IDs, file/manifest metadata, orchestration, or persistence |
| Raw-trace archive manager | One complete immutable archive file and manifest validation/read by run-relative `file_name` | Provenance semantics or recursive ancestry |
| Compaction-lineage record/persistence boundary | Structural record validation without count maxima; supported prompt audit values 1/2; append/read tail and output-membership lookup | Semantic sizing, message composition, LLM content, or recursive response assembly |
| Compaction-lineage resolver | Run-scoped direct/root provenance query, cycle protection, deduplication, completeness status | Mutating lineage, raw archives, or memory output |
| Working-context snapshot bootstrapper | Direct current-schema message restore only; validates message-local ranges and tool/media structure | Lineage/current-output lookup, Event Monitor history, old-schema decoding, generic corruption/crash recovery, or app-data reset |
| Startup app-data reset migration | Discover run directories, remove exactly the four obsolete derived-state files, preserve raw evidence, return itemized `SUCCEEDED` or `FAILED`, and remain idempotent/retryable | Deciding global startup continuation, parsing removed content, current runtime restore, lineage creation, or raw-trace mutation |
| `AppDataMigrationRunner.runPending` | Execute all required definitions, persist every attempted result, treat existing `SUCCEEDED`/`SUCCEEDED_WITH_WARNINGS` as startable, and throw after processing if any required result is non-startable | Server bootstrap/build/listen sequencing or migration-specific deletion mechanics |
| `startConfiguredServer` | Invoke the migration runner before built-in-agent bootstrap, log and rethrow a required-migration failure, and therefore prevent `bootstrapBuiltInAgents`, `buildApp`, and `app.listen` | Persisting migration results or converting a failure into warning-success |
| Provider renderers | Provider-specific wire, tool, and media translation | Memory/current-request selection or merging |

### 4.1 Required dependency direction

Allowed:

```text
Runtime/request caller
  -> LLMRequestAssembler
     -> PendingCompactionExecutor
        -> structured compaction strategy
        -> MemoryManager accepted-compaction boundary
           -> owned persistence/archive concerns
     -> MemoryManager context commands/queries
     -> provider renderer
```

```text
Internal origin caller
  -> compaction-lineage resolver
     -> compaction-lineage persistence boundary
     -> raw-trace archive manager
```

```text
Event Monitor
  -> run projection provider
     -> active raw-trace read boundary
```

```text
Structured compaction strategy
  -> planned WorkingContext message/constituent units
  -> compactor conversation-history renderer
     -> core readable presentation capability
  -> CompactionAgentRunner

AgentWorkTraceProjectionService
  -> raw source reader
  -> existing historical-replay transformation
  -> Work-Evidence source adapter
     -> core readable presentation capability
  -> server Markdown renderer/store
```

### 4.2 Forbidden shortcuts

- `LLMRequestAssembler` or runtime callers must not coordinate memory rows, archive files, or lineage records directly.
- A compaction strategy must not both return a candidate context and mutate memory/archive stores before the executor validates the candidate.
- A compaction strategy must not assign produced episode/semantic IDs or construct the accepted lineage/context candidate; those belong to `MemoryManager` acceptance.
- `PendingCompactionExecutor` must not bypass `MemoryManager` to replace its private WorkingContext or write its snapshot.
- A lineage record must not be appended until its completed archive and output rows exist; append order is the sole current-head authority.
- The context projector must not query an unscoped top-K mixture across all historical outputs; its input is the exact output listed by the lineage head.
- A lineage resolver must not open an arbitrary filesystem path supplied by a caller; it resolves the run-relative manifest `file_name` inside the recorded scope.
- Event Monitor projection must not fall back to archives or `working_context_snapshot.json`.
- Provider renderers must not infer how to merge memory and current user content.
- Message constituents and snapshot v5 must not carry `previousCompactionId`; only `MemoryManager`'s separately captured lineage head supplies it during acceptance.
- Work-trace Markdown must not become the compactor's authoritative evidence input.
- `autobyteus-ts` must not import `autobyteus-server-ts`. The core readable presentation capability belongs in `autobyteus-ts`; both compaction and server Work Evidence may depend on it through separate adapters.
- The shared presentation shape must not become a broad event DTO containing timestamps, raw IDs, WorkingContext metadata, historical-replay metadata, XML/Markdown envelopes, file paths, or mostly optional source-specific fields.
- Compactor input rendering must not expose `Message.reasoning_content`, raw reasoning events, `Assistant work notes`, raw/turn/tool-call/provider bookkeeping IDs, or unredacted secret patterns.
- Neither consumer formatter may clip a whole Tool block or silently retain only a prefix; structural labels/status remain and each oversized variable value preserves explicit head and tail around one `… [N characters omitted] …` marker.
- Compactor input must render each correlated settled call/outcome as `Tool` with `name`, `status`, `arguments`, and `result` or `error`; it must not add `Assistant tool call` labels. Generated Work Evidence retains its existing timestamped lowercase `tool:` envelope over the same core Tool body.
- A compactor formatter must not emit separate memory/evidence sections or an entry-by-entry wrapper. Exactly one application-generated `<conversation_history>...</conversation_history>` pair encloses the complete selected logical prefix, and source-provided instances of the reserved delimiter are escaped before insertion.
- The per-operation user prompt must not duplicate the stable JSON schema or semantic sizing policy from the Memory Compactor system prompt.
- Parser, normalizer, acceptance, and lineage normalization must not impose numeric episode, total-fact, category, or output-membership caps. Structural/per-entry/record safeguards remain; no output-token ceiling is introduced.
- Work Evidence callers must not read the compactor prompt or treat its stricter bound/XML envelope as the generated Markdown contract. The Work Evidence adapter supplies its own larger bound and timestamped Markdown envelope.
- Normal restore, projection, retrieval, and lineage code must not decode pre-lineage rows/snapshots, branch on historical fields, fall back to arbitrary durable rows, or infer a producing compaction. Only DF-S02/DF-L06 may know and delete the obsolete filenames.

The mixed-level strategy-write path is historical pre-SR-004 evidence and is already removed. SR-010 preserves the implemented IDless strategy/manager boundary and corrects only the remaining prompt/cardinality/audit/rendering gaps.

## 5. Off-Spine Concerns

| Concern | Serves owner/path | Responsibility |
| --- | --- | --- |
| Message-unit builder and token budget policy | Structured compaction strategy / DF-L01 | Build indivisible semantic/tool units and calculate the retained-suffix budget. |
| Compactor conversation-history renderer | Structured compaction strategy / DF-L08 | Reuse DF-L03's canonical composition boundary over planner-selected visible messages; preserve one `User:` label for a composed earlier summary plus compatible adjacent input and preserve real User/Assistant/Tool boundaries; omit reasoning/backend fields and synthetic timestamps; choose compactor bounds; use DF-L09; escape reserved boundary collisions; and emit exactly one natural outer conversation-history block. |
| Common `CondensedToolCallRenderer` | Compactor renderer and Work Evidence adapter / DF-L09 | Accept only name, arguments, discriminated result/error/no-outcome, and the value bound; derive/preserve status; serialize/redact/bound values; and return the tight Tool body. It owns no correlation, waiting, source selection, or consumer envelope. |
| Work Evidence source adapter/Markdown renderer | `AgentWorkTraceProjectionService` / DF-P11 | Adapt raw historical replay values to DF-L09, select the Work Evidence bound, and retain timestamped lowercase Markdown/file/manifest behavior. |
| Memory Compactor `agent.md` | Built-in compactor / DF-L02 | Match the complete exact file in `memory-compactor-prompt-content-contract.md`; own the stable exact JSON contract and quality-first semantic policy with no fixed episode/fact count. |
| Operation prompt builder | Structured compaction strategy / DF-L08 and DF-L02 | Return exactly one selected renderer-produced `<conversation_history>` payload with no static prefix or suffix; do not restate task/schema/sizing policy, and remove the redundant `COMPACTION_RESULT_SHAPE` constant/export. |
| Compactor runner and response parser/normalizer | Structured compaction strategy / DF-L02 | Invoke the configured compactor; parse all structurally valid entries; retain existing per-entry content bounds; and normalize/deduplicate/noise-filter with positive salience, without hidden item-count truncation. |
| Accepted-compaction builder | `MemoryManager` accepted-compaction boundary / DF-L04 | Enforce at least one episode and all structural/reference invariants; it does not reject a proposal merely because it has more than a prescribed number of episodes or facts. |
| Startup app-data reset migration | Server startup / DF-S02 and DF-L06 | Discover supported run directories, remove exactly four obsolete derived-state files, preserve raw traces/manifests, and return `FAILED` for any discovery/deletion failure. It does not decide aggregate startup eligibility. |
| App-data migration runner | Server startup / DF-S02 | Execute every required migration that needs an attempt, persist each attempted result, preserve `SUCCEEDED`/existing `SUCCEEDED_WITH_WARNINGS` as startable, and throw after aggregation if any required result is non-startable. It does not expose the server. |
| `startConfiguredServer` | Server startup / DF-S02 | Own the exposure boundary: log and rethrow required-migration failure before `bootstrapBuiltInAgents`, `buildApp`, or `app.listen`. It does not reinterpret migration details. |
| Runtime reporter | `PendingCompactionExecutor` / DF-S03 and DF-R01 | Emit lifecycle metadata using the same pending `compactionId`. |
| Durable episode/semantic store | `MemoryManager` accepted-compaction boundary / DF-L04 | Persist content artifacts by their own IDs; it does not decide which output is current. |
| Raw-trace archive manager | `MemoryManager` accepted-compaction boundary / DF-L04 | Archive the exact selected raw set once and return the completed manifest entry. |
| Lineage repository | `MemoryManager` commit and lineage resolver / DF-L04 and DF-L05 | Persist/query direct reference-only records and expose the last successful record as the current head. |
| Snapshot serializer/store | `MemoryManager` and snapshot bootstrapper / DF-P03, DF-L04, DF-P07, DF-L06 | Serialize/write/read finalized provider-neutral messages, media/tool structures, and message-local constituent ranges only. It owns no compaction, output, lineage, or current-state identity. |
| Tool-protocol safety/repair | `MemoryManager` / DF-L03 and restore paths | Preserve valid assistant tool-call/result structure at supported boundaries. |
| Raw-trace transformer/page policy | Run projection provider / DF-L07 | Convert active records and validate bounded cursors. |

No new generic “memory coordinator,” “support,” evidence-copy store, segment identity, activity identity, or generation identity is justified.

## 6. Persisted-Data Decisions

| Persisted subject | Decision | Evidence and target handling |
| --- | --- | --- |
| Active raw traces and completed raw archive files/manifests | **Directly Usable — No Migration** | Existing IDs/content and completed archive `file_name` already provide authoritative selected evidence. Target lineage references them; it does not rewrite or copy them. |
| Pre-lineage episode/semantic rows and compacted-memory manifest | **Discard or Rebuild** | Required startup migration deletes `episodic.jsonl`, `semantic.jsonl`, and `compacted_memory_manifest.json`. It does not parse, transform, preserve, or backfill them. Current runtime has no reader for their schema. |
| `compaction_lineage.jsonl` | **Directly Usable — No Migration** | Schema/relations stay unchanged. Existing prompt audit value-1 records remain truthful; new records use 2; current reader accepts/preserves supported 1/2 mixed chains. Natural membership widens existing arrays; no rewrite/state file exists. |
| Working-context snapshots v1-v4 | **Discard or Rebuild** | Required startup migration deletes them with no content conversion. Normal runtime never sees or decodes them. |
| Working-context snapshot v5 | **Current Schema** | Directly restores finalized messages and message-local constituent ranges. It contains no compaction/output IDs or current-state field; current output lookup belongs to the lineage tail. |
| Generated Work Evidence Markdown/manifest | **Discard or Rebuild / No Migration** | It is regenerated from raw sources by its existing projection owner and is not a compactor authority. Source enumeration, timestamps, ordering, lowercase labels, filenames, and manifest remain; current regenerated bodies already use shared explicit head/tail omission. |
| External-runtime raw/session records | **Not Affected** | Recording and provider/session boundaries remain unchanged; target native lineage is not fabricated for them. |

One bounded destructive app-data reset is required. No content migration, dual lineage format, operation journal, or archive-content rewrite is required.

## 7. Product-Reachability Validation

| Premise | Classification | Complete witness | Design consequence |
| --- | --- | --- | --- |
| Normal native compaction before a user/tool-continuation request | Reachable | Supported policy calls `MemoryManager.requestCompaction`; `LLMRequestAssembler` calls `PendingCompactionExecutor.executeIfRequired` during normal preparation | Governs DF-P04/DF-P05 and the recurrent target change. |
| Runner failure or parser-rejected response | Reachable | Configured compactor call in the structured strategy throws/rejects; executor reports failure; immediate `LlmPhase` records a diagnostic or normal request preparation aborts before dispatch; the pending operation remains | Requires DF-R01 and no writes before accepted proposal. |
| A successful compaction has current M(n-1) but no newly selected raw-backed natural R(n) | Not Reachable under the current planner or approved target contract | Current planner requires an eligible compactable natural unit. The target adds M(n-1) as a seed but explicitly retains non-empty R(n) as a success precondition because every success has one newly selected archive file. | Preserve the eligibility invariant; do not add a special state machine or recovery path. M(n-1) alone is neither re-archived nor sufficient for success. |
| Active Event Monitor cursor invalidated by successful archive/rewrite | Reachable | Successful native compaction archives selected active rows and rewrites the file; page policy includes manifest/file generation in cursor validation | Requires expiration/reload behavior, not archive fallback. |
| Valid snapshot direct restore | Reachable | User follows up to an inactive persisted run; activation executes `WorkingContextSnapshotRestoreStep`; valid payload deserializes | Snapshot remains the normal continuation authority. |
| Startup encounters pre-lineage derived files | Reachable; already implemented/validated | Implemented `startConfiguredServer -> runner -> reset` blocks exposure on failure and preserves raw evidence | Preserve SR-004 unchanged; not an SR-010 delta. |
| Natural compactor conversation-history rendering | Reachable on every normal native compaction | Implemented planner includes memory and renderer emits reasoning-free XML/shared Tool history; builder duplicates static policy and constituent expansion can split one canonical user turn | Requires only history-only builder and finalizer reuse in DF-L08. |
| Oversized generated Work Evidence values | Reachable; already implemented/validated | Current Work Evidence calls the shared core head/tail renderer under its own envelope | Preserve SR-004 unchanged. |
| Long/multi-threaded output beyond former counts | Reachable on canonical product path | Prompt/builder/parser/normalizer/accepted builder and lineage validator all participate; lineage gate is reached after archive/output; projection/origin consume membership later | Requires cap removal and >3/>20 proof through DF-L04/DF-L05, not only proposal construction. |
| Existing prompt-version-1 record followed by a target prompt-version-2 record | Reachable | Ordinary successful SR-004 compaction may be followed after upgrade by ordinary successful SR-010 compaction in the same current-schema run | New writes use 2; reader preserves 1/2; tail/projector/origin work across the mixed chain; no migration. |
| One-thousand successive compactions | Reachable under approved target contract | The normal compaction path may repeat without a product-specified lifetime limit; AC-007/SCN-007 explicitly require bounded behavior | Requires replacement M(n), not concatenated M1..Mn or a historical top-K mixture. |
| Internal memory-origin lookup | Reachable under approved target contract | REQ-006/UC-021 establish the run-scoped query contract; its caller supplies run/member scope plus explicit artifact kind and ID | Requires one resolver with direct and recursive results; no frontend is implied. |
| Interrupted filesystem publication or process crash between commit writes | Not Reachable as a ticket premise | No supported user/operational action or established contract was found that makes this a required current scenario; only mechanical filesystem possibility exists | Does not justify a journal, staged transaction, or crash-recovery protocol in this ticket. |
| Arbitrary snapshot deletion/corruption/manual file mutation | Not Reachable as a ticket premise | Internal files are not a supported user surface and no applicable operational contract was established | Cannot justify generic recovery or duplicate-history prevention machinery. |
| Built-in normalizer/output-validator produces an invalid context in normal configuration | Not Reachable on current evidence | No supported built-in result path was found; test-only construction is insufficient | Do not add state or recovery behavior for it. Normal validation remains defensive. |

## 8. Design-Principles Validation

### Principle 1 — Approved behavior and production reality

**Foundation result: Satisfied; approved behavior basis recorded.**

- Current, target, preserved, and out-of-scope behavior are separated in `requirements.md`.
- The native-compaction change is traced from real request/post-response triggers through accepted context and provider effects, and the Work Evidence presentation change is traced from its current consumer request through generated package delivery.
- The startup reset and compactor failure premises have concrete product witnesses.
- Unsupported corruption, crash, arbitrary deletion, and test-only invalid-output premises do not drive the design.

### Principle 2 — Data-flow spine inventory and clarity

**Foundation result: Satisfied.**

- Eleven primary spines cover activity, UI projection, normal request preparation, pre-dispatch compaction, tool deferral, recurrence, restore, origin lookup, external-runtime evidence, immediate post-response compaction, and generated Work Evidence; SR-006 reuses these spines; SR-010 completes the same bounded prompt/cardinality/audit/canonical-turn delta within existing owners.
- Two secondary, two return/event, and nine bounded-local spines are explicit.
- Every primary path shows the initiating trigger, orchestration/boundary crossing, authoritative owner, critical dependency/effect, and meaningful end.
- UC-001 through UC-027 are mapped; UC-025 is carried by the normal DF-P04/P05/P06/P10 trigger paths plus DF-L08/DF-L09, UC-026 is carried by DF-P11 plus DF-L09, and quality scenario UC-027 remains inside the same native-compaction paths plus DF-L02.

### Principle 3 — Ownership clarity and boundary encapsulation

**Target constraint: Satisfied; bounded SR-010 gaps explicitly identified.**

- `MemoryManager` remains the sole live WorkingContext mutation/replacement boundary.
- `PendingCompactionExecutor` owns operation lifecycle and supported retry.
- Strategy code proposes; the accepted-compaction boundary publishes.
- The system prompt owns the complete natural task and stable semantic/output policy, the operation user message owns only the current rendered history payload, and parser/normalizer/acceptance own structural correctness without semantic-count policy. Launch/provider output-token configuration remains unchanged.
- The core readable presentation capability owns only serialization, redaction, Tool-body formatting, and head/tail omission. WorkingContext and historical replay remain authoritative at their separate adapters, preventing a mixed-level dependency or kitchen-sink shared event.
- Implemented SR-004 already keeps the strategy IDless/side-effect-free and gives `MemoryManager` plus the accepted committer publication ownership. SR-010 preserves that sequencing; its only ownership correction is to keep predecessor identity outside message constituents while reusing the existing finalizer for compactor-visible turns.
- Allowed dependencies and forbidden bypasses are explicit.

### Principle 4 — Off-spine concerns

**Foundation result: Satisfied.**

- Planning, natural conversation-history rendering, core readable presentation, Work Evidence adaptation/Markdown rendering, parsing, persistence, archive handling, reporting, serialization, and provider rendering each serve a named main-line owner.
- Existing archive, snapshot, reporting, tool-safety, and projection capabilities are reused. Generated Work Evidence already retains raw-backed authority and its envelope over the shared explicit head/tail omission capability; compaction renders its own selected WorkingContext source.
- No content-copy snapshot, generic coordinator, or artificial identifier layer is introduced.

### Principle 5 — Current-schema runtime and persisted-data transition

**Foundation result: Satisfied.**

- Each affected persisted subject has an explicit decision.
- Raw traces/manifests remain directly usable and are explicitly preserved.
- Pre-lineage derived memory, snapshots, and manifests are explicitly disposable and removed once through the existing app-data migration boundary.
- New lineage data is prospective current-schema state; no current-pointer file exists.
- Normal runtime contains no historical decoder, dual read/write, fallback, or compatibility object.
- Generated Work Evidence is already rebuildable and its SR-004 presentation change required no migration; SR-010 leaves it unchanged.
- The reset is justified by the impossibility of reconstructing truthful lineage and the user's accepted low usage/data-loss profile, not representational cleanliness.

### Principle 6 — Product-reachability gate

**Foundation result: Satisfied.**

- Every material failure or recovery premise is classified with a trigger, concrete path, state, and consequence.
- Only established native-compaction, Work Evidence projection, runner/parser failure, active-cursor expiry, valid current-schema restore, and required server-startup migration paths affect the target.
- Speculative interrupted-write and arbitrary-file-loss scenarios remain excluded.

### Derived structural checks

- **Shared-structure tightness:** `CompactionLineageRecord` has one existing `compactionId`, one optional direct predecessor, one existing run-relative archive filename, and separate produced episode/semantic ID arrays. It has no historical-input variant, duplicate content, raw-ID list, boundary key, activity ID, generation ID, or copied transitive closure.
- **No empty indirection:** proposed owners each own policy, state, transformation, or persistence; no pass-through service is required.
- **No mixed-level dependency:** callers use the compaction operation/context boundary rather than coordinating its repositories; core compaction does not import server projection code.
- **Source-aligned rendering:** compaction renders selected WorkingContext constituents as the natural model-visible conversation it owns; server Work Evidence projection independently remains a raw-backed generated artifact. They reuse only one tight readable presentation primitive, not source normalization, selection, timestamps, envelopes, or orchestration.
- **Shared-base tightness:** `CondensedToolCallInput` contains only name, arguments, one explicit result/error/no-outcome variant, and render options containing the per-value bound. Terminal status is derived; no-outcome carries its truthful status and renders `result: not available`. The shared renderer does not accumulate timestamps, trace IDs, WorkingContext metadata, historical-replay metadata, XML/Markdown wrappers, file attributes, waiting, or correlation.
- **Removal is explicit:** later compaction no longer excludes the current compacted-memory unit; generic historical top-K projection is removed from the current-context path; strategy-owned output-ID assignment/persistence before manager acceptance is removed; the semantic schema gate/global compacted-memory-manifest runtime authority and all old-schema restore/read branches are removed; one startup reset deletes their persisted artifacts; compactor whole-line prefix clamping and Work Evidence's server-local silent 20,000-character prefix slice are replaced by the shared bounded-value policy.
- **Folder/file mapping:** intentionally owned by the mandatory `design-spec.md`, so physical structure follows these spines and owners rather than leading them.

## 9. Foundation Gate Result

The revised requirements package is now:

- behaviorally complete for the 27 enumerated use cases;
- mapped to complete production/target-production spines;
- explicit about authoritative owners and forbidden bypasses;
- explicit about persisted-data treatment;
- filtered through product reachability; and
- free of unrelated memory-evolution scope, content-bearing evidence snapshots, artificial segment identities, and parallel activity/generation identities.

The user approved the original foundation on 2026-07-30, explicitly replaced its persisted-data handling with the clean startup reset/current-only runtime policy, and then fixed the final separation: snapshot owns messages/ranges; derived stores own memory content; successful lineage records own relationships/history; the tail alone is current. SR-004 assigned reset-result truth, aggregate required-result startability, and fail-closed server exposure to three explicit owners and subsequently passed architecture review. SR-006 adds one bounded behavior change: remove fixed episode/fact/category counts and let the LLM choose a natural semantic structure. SR-008 makes the system prompt natural and the operation user message history-only. SR-009 approved that prompt/turn behavior; SR-010 adds full lineage-path count removal, prompt audit value 2 with mixed value-1 direct use, and restores the message-only predecessor boundary. Neither introduces a token ceiling, owner, primary spine, or launch/provider change. The user approved the cumulative correction and authorized architecture review.
