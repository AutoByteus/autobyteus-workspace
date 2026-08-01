# Memory Compaction Use-Case And Data-Flow Spine Map

## Status And Authority

- Status: Normative SR-015 forward-only migration correction approved by the user; ready for renewed architecture review.
- Base: merged `origin/personal@9615dcc88e73f0584e67623a3cfe1f0d2afd4617`; completed external-runtime simplification and final delivery records included.
- Purpose: map every in-scope use case through a complete current or approved target-production spine and authoritative owner.
- Scope: delivered native compaction/natural semantic sizing/prompt/rendering/lineage/origin, strict v5 snapshot restore, exact native-only tolerant-subset per-run migration, durable-compaction-aware request recovery, active-only Event Monitor, generated Work Evidence, and delivered external raw-only recording.
- Approval applicability: **Required.**
- Related authority: `requirements.md`, `memory-context-and-lineage-contract.md`, `memory-compactor-prompt-content-contract.md`.
- Evidence: `investigation-notes.md`, `provenance-methodology-analysis.md`, `compacted-memory-message-role-analysis.md`.

This map does not authorize implementation. SR-010 passed ARCH-REV-006, was implemented in IR-003, and completed review/API-E2E/delivery; it is the preservation baseline. ARCH-REV-008 gates the pending exact-native migration/strict-restore/recovery delta. User-approved SR-015 uses tolerant absent/empty-lineage projection with a metadata-identified empty-message v5 minimum, one typed identity/reference-fact seam, and no generated recovery content, Tool repair, or raw-evidence append. Every nonempty-lineage location skips byte-for-byte without validation. The completed corpus audit is sufficient; no new preflight, compatibility, or migration-recovery subsystem is proposed. Renewed architecture review is required.

## 1. Reading Rules

1. A **primary spine** starts at a supported user/system trigger or approved governing contract and ends at the meaningful product effect.
2. A **secondary spine** is a real adjacent flow that materially supports a primary path but does not own its main business sequencing.
3. A **return/event spine** records a meaningful failure, retry, cursor, or status propagation path.
4. A **bounded local spine** explains an internal algorithm or transition inside one owning node. It never substitutes for the longer primary spine.
5. Store/repository calls are shown on a primary spine only when the persisted effect is itself the meaningful outcome. Otherwise they are off-spine mechanisms serving an authoritative owner.
6. `compactionId` means the existing pending `CompactionOperationId` after the operation succeeds. There is no separate activity ID or generation ID.
7. The expressions M(n) and R(n) are descriptive:
   - M(n): the complete replacement output produced by successful compaction C(n), with the natural number of episodes and facts chosen by the LLM;
   - R(n): newly selected non-compacted-memory WorkingContext units backed by archive-eligible active raw evidence for C(n). After migration, only retained non-system units with truthful eligible-active backing may enter R(n); migration never creates substitute evidence.

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
| DF-P09 | External raw-only evidence capture | User runs supported Codex or Claude | Product launch -> external backend/session -> `ExternalRuntimeMemoryWriter` -> active/archive raw storage -> provider-specific/Event Monitor or evidence projection | External activity is recorded; no application WorkingContext snapshot exists | `ExternalRuntimeMemoryWriter` | Preserves the completed prerequisite and avoids false native semantics. |
| DF-P10 | Immediate compaction after a final no-tool response | A supported native LLM response completes with no tool invocation and budget evaluation requests compaction | Provider response -> `LlmPhase` ingests final assistant activity/context -> `evaluateLlmPhaseCompaction` retains pending `compactionId` -> `PendingCompactionExecutor` -> structured compaction proposal -> authoritative accepted-compaction commit through `MemoryManager` -> completed lifecycle/current snapshot | The just-completed turn is compacted immediately without another provider dispatch | `LlmPhase` owns the post-response trigger; `PendingCompactionExecutor` owns operation lifecycle; `MemoryManager` owns the state transition | Represents the real immediate path separately from pre-dispatch request preparation. |
| DF-P11 | Generated Work Evidence projection | A supported Work Evidence consumer requests current trace artifacts | Current caller/consumer -> `AgentWorkTraceProjectionService` -> `AgentWorkTraceSourceReader` -> explicit archive-plus-active source enumeration -> historical-replay normalization -> Work-Evidence source adapter -> shared readable presentation DF-L09 -> timestamped Markdown renderer -> generated work-trace files/manifest -> caller receives package paths/metadata | Readable evidence is regenerated from authoritative raw sources with existing source/order/timestamp/Markdown/file/manifest semantics and explicit head/tail omission for oversized values | `AgentWorkTraceProjectionService` | This is now an in-scope product behavior change, so its full path is primary rather than a local or comparison-only flow. The generated artifact remains separate from native compactor input. |
| DF-P12 | Request with pending compaction and recoverable provider dispatch | Native request preparation sees pending compaction | `LlmPhase` -> `LLMRequestAssembler` system/tool safety -> pending compaction through DF-P04 -> post-compaction recovery capture -> current-request mutation/render -> `RequestPackage` -> provider dispatch -> settle through DF-R03/success | Provider lifecycle has an opaque checkpoint matching the durable post-compaction base | `LLMRequestAssembler` owns stable-base capture; `LlmPhase` owns provider settlement | Prevents request recovery from restoring context behind an already-published lineage head. |

### 2.2 Secondary spines

| Spine ID | Scope | Start | Main-line path | End | Governing owner | Why it matters |
| --- | --- | --- | --- | --- | --- | --- |
| DF-S02 | Exact native WorkingContext migration | Startup reaches the registered new-ID migration after delivered external cleanup | `AppDataMigrationRunner` marks running -> `RuntimeMemoryLocationClassifier` exact targets + run/member snapshot identity -> native migration lineage gate -> any nonempty lineage skips untouched; absent/empty lineage enters DF-L06 typed per-run conversion/publication -> durable converted/warning status -> ordinary startup continues | Eligible absent/empty-lineage content yields current v5 by retaining valid sourceable units and omitting the rest; all nonempty lineage and all exclusions/raw traces stay untouched | Native migration owns target/lineage/files/status; pure converter owns identity/message/ref matching; runner owns its existing lifecycle | Isolates historical decode/current runtime with one structural eligibility gate and without a global preflight, repair, compatibility, or migration-recovery subsystem. |
| DF-S03 | Compaction lifecycle reporting | Pending compaction begins, completes, or fails | `PendingCompactionExecutor` -> `CompactionRuntimeReporter` -> run/runtime event transport -> observing UI/log consumer | The same `compactionId` and phase are observable | `PendingCompactionExecutor` | Preserves operation identity across normal success and supported retry. |

### 2.3 Return/event spines

| Spine ID | Scope | Start | Return/event path | End | Governing owner | Why it matters |
| --- | --- | --- | --- | --- | --- | --- |
| DF-R01 | Reachable compactor failure and retry | Configured compactor runner fails or its response parser rejects output | Compactor failure -> `PendingCompactionExecutor` failure classification -> failed lifecycle event -> immediate post-response caller records a diagnostic or pre-dispatch preparation aborts -> pending `compactionId` remains -> next normal request re-enters DF-P04 | No memory/archive/lineage/context write; lineage head is unchanged and the same operation is retried | `PendingCompactionExecutor` | Covers both current real callers while limiting consistency machinery to an observed product path instead of hypothetical interrupted filesystem publication. |
| DF-R02 | Active-page cursor expiry | A successful compaction/rotation rewrites the active raw-trace file while the UI holds an earlier-page cursor | Archive completes -> active file rewrites -> next Event Monitor page request -> active-generation comparison -> `EXPIRED` result -> UI reloads latest active projection | UI does not cross into archived history with a stale cursor | Active-trace page policy under `LocalMemoryRunViewProjectionProvider` | Preserves source consistency for the active-only activity view. |
| DF-R03 | Post-capture request failure | Assembly fails after capture or provider fails before usable response | assembler local failure -> restore once and rethrow; or provider failure -> `LlmPhase` restores package checkpoint once -> persist recovered v5/diagnostic | Request mutation is removed; durable compaction/current head remains | Assembler for local failure; `LlmPhase` for provider outcome; recovery boundary for state | Separates ephemeral request rollback from durable compaction. |

### 2.4 Bounded local spines

| Spine ID | Parent owner/path | Start | Local path | End | Why it matters |
| --- | --- | --- | --- | --- | --- |
| DF-L01 | Structured compaction planning inside DF-P04/DF-P05/DF-P06/DF-P10 | Baseline provider-neutral WorkingContext | Build semantic/constituent message units -> preserve leading system units -> protect live tool-protocol suffix -> choose retained recent suffix by budget/floor -> include optional projected compacted-memory constituent by message-local kind/range plus selected compactable natural prefix -> require non-empty raw-backed natural R(n) -> collect raw refs only from newly selected natural constituents | Exact strategy input: one ordered compactable logical WorkingContext prefix, retained continuation, and R(n) raw IDs to archive; `MemoryManager` retains the baseline lineage head outside the strategy | Makes the cut deterministic, prevents prior memory alone from creating another compaction, and ensures current prior memory influences the successor without being separately rendered or re-archived. |
| DF-L02 | Structured compaction proposal inside DF-P04/DF-P05/DF-P06/DF-P10 | Canonically rendered recurrent input from DF-L08 | Resolve compactor under unchanged launch -> runner -> all-entry parse -> cleanup/dedupe/noise/positive salience without count caps -> IDless proposal | Natural-count content/selection/execution proposal; no output IDs, prompt audit value, accepted candidate, or writes | LLM owns semantic allocation; application owns structure and accepted identity. |
| DF-L03 | Canonical context finalization inside DF-P03/DF-P04/DF-P05/DF-P06/DF-P10 | Optional current-compaction output, retained/protected continuation, and optional new user input | Preserve leading system messages -> when the lineage-head output exists, build one typed compacted-memory region with no lineage/output IDs -> otherwise build none -> merge only compatible adjacent user regions -> preserve separate message-local constituent ranges/raw provenance/media -> stop at assistant/tool boundaries -> validate tool protocol | One provider-neutral WorkingContext ready for snapshot and rendering | Prevents provider-specific renderers from owning memory/current-request semantics while keeping compaction/output identity solely in lineage. |
| DF-L04 | Accepted-compaction transition inside DF-P04/DF-P05/DF-P06/DF-P10 | Valid IDless proposal, unchanged pending/head, non-empty R(n) | `MemoryManager` maps head to predecessor -> assigns output IDs -> builds accepted candidate with prompt audit value 2 -> committer archives R(n) -> persists every output row -> lineage normalizer validates all non-cardinality invariants and preserves natural membership -> store appends/reads record (supported prompt versions 1/2) -> tail loader projects exact output -> install context -> v5 snapshot -> clear pending | Natural-count output becomes current once and remains origin-resolvable | Includes the complete existing validator/store/committer/read path; no post-output count rejection, new owner, or journal. |
| DF-L05 | Recursive lineage resolution inside DF-P08 | Producing compaction record | Validate scope and output membership -> return direct previous-compaction/archive relation -> validate completed archive filename through manifest -> read raw members/interval -> recurse through `previousCompactionId` with visited set -> deduplicate roots -> combine status | Cycle-safe direct and root provenance response | Keeps records small and direct while preserving recursive explainability. |
| DF-L06 | Native snapshot conversion/publication inside DF-S02 | One exact AutoByteus location with expected snapshot identity, lineage state, source bytes, and same-subject eligible-active reference facts | lineage nonempty -> skip byte-for-byte without state validation; lineage absent/empty -> pure converter validates parseable `agent_id`, matches stored message refs against supplied facts, retains valid system/sourceable complete units, omits unsupported/incomplete/ambiguous/old-compacted/unsourced units without repair, and uses expected identity + `messages: []` for parse-invalid/no survivor -> finalizer -> strict-v5 validate before snapshot replacement -> exact three-file cleanup -> itemized result | Durable strict-v5 context or truthful no-mutation rejection; bounded omission diagnostics; no raw or excluded-location mutation | Separates server identity/files from pure matching, validates before mutation, and avoids invalid-current reinterpretation, Tool repair, synthetic content, or duplicate planning machinery. |
| DF-L07 | Active paging inside DF-P02/DF-R02 | One active raw-trace snapshot plus optional cursor | Transform ordered events -> calculate active generation from file/manifest identity -> validate subject/generation/anchor -> select bounded page -> return valid or expired status | Stable active-only page response | Explains the cursor behavior without turning the page policy into the whole Event Monitor architecture. |
| DF-L08 | Natural compactor conversation-history rendering inside DF-P04/DF-P05/DF-P06/DF-P10 | Planned ordered compactable logical WorkingContext prefix containing optional projected M(n-1) plus selected R(n) | Flatten selected visible messages -> reuse the DF-L03 `WorkingContextFinalizer` composition boundary so a composed earlier summary plus adjacent compatible retained/current input remains one user turn -> adapt visible User/Assistant content and settled call/result groups -> DF-L09 serializes/redacts/bounds values and renders each call/outcome body as `name` + `status` + `arguments` + `result`-or-`error` -> add one `User`/`Assistant`/`Tool` label per canonical turn in logical order -> omit reasoning/backend IDs and synthetic timestamps -> escape source-originated reserved boundary sequences -> wrap the complete prefix once in `<conversation_history>...</conversation_history>` -> return that block as the complete operation user message | Bounded natural representation of the compactable context seen by the working LLM; no duplicated connector policy, consecutive artificial `User:` labels from one composed turn, separate memory section, `Assistant tool call` label, or persisted prompt copy | Preserves WorkingContext semantics while keeping constituent/provenance/storage mechanics out of the LLM-facing prompt and adding no second composition or condenser owner. |
| DF-L09 | Common condensed tool-call rendering inside DF-L08 and DF-P11 | `CondensedToolCallInput` containing only name, arguments, and `result(value)`, `error(value)`, or `no_outcome(status)`, plus the consumer's per-value character bound | Derive `success`/`error` for terminal outcomes or preserve the no-outcome status -> deterministically serialize visible values -> redact sensitive/backend text -> if over the consumer limit, preserve deterministic head and tail around one `… [N characters omitted] …` marker -> render only `name`, `status`, `arguments`, and `result`/`error`; `no_outcome` renders `result: not available` | Consumer-neutral Tool body string returned to the source adapter, with no Tool header, timestamp, XML/Markdown envelope, source ID, or file metadata | Centralizes the genuinely identical condensed Tool rendering policy in `autobyteus-ts`; source adapters still own call/result correlation, lifecycle interpretation, source selection, and their envelopes. |
| DF-L10 | Ephemeral request recovery inside DF-P03/DF-P12/DF-R03 | Stable post-safety/post-compaction canonical base | copy WorkingContext + pending state -> register active checkpoint -> request mutation/render -> restore once on failure or release once after retained outcome | Settled checkpoint; restored v5/diagnostic when applicable | One tight subject; no durable artifact identities or rollback. |

## 3. Use-Case-To-Spine Coverage

Every normative use case in `memory-context-and-lineage-contract.md` maps to at least one complete primary spine and, where relevant, its secondary, return, or bounded-local detail.

| Use case | Supported trigger / governing basis | Spine mapping | Governing owner and target consequence |
| --- | --- | --- | --- |
| UC-001 — Record native or external runtime activity | Supported runtime emits retained activity | native DF-P01; external DF-P09 | Native path owns raw + WorkingContext; `ExternalRuntimeMemoryWriter` owns raw traces only. |
| UC-002 — Open the recent Event Monitor | User opens the run activity surface | DF-P02 + DF-L07 | Run projection owner reads the active file only and returns the bounded recent window. |
| UC-003 — Browse earlier Event Monitor activity | User selects “load earlier” while an active cursor is valid | DF-P02 + DF-L07; rewrite branch DF-R02 | Page policy reads only the same active generation or expires the cursor. |
| UC-004 — Publish the compaction input/output lineage relation | Normal native compaction succeeds | DF-P04, DF-P05, or DF-P10 + DF-L01 + DF-L08 + DF-L02 + DF-L04 | Accepted-compaction commit publishes one completed raw archive file and one reference-only record keyed by the successful `compactionId`. |
| UC-005 — Assemble a request without compaction | Native user request with no pending compaction | DF-P03 + DF-L03 + DF-L10 | Assembler captures stable base before request mutation; package/phase settle it. |
| UC-006 — Immediate compaction after a completed no-tool assistant response | Post-response budget evaluation requests compaction and no tool invocation is pending | DF-P10 + DF-L01 + DF-L08 + DF-L02 + DF-L03 + DF-L04 | The just-ingested assistant turn is included, M(n) becomes current, and the completed state is snapshotted without waiting for another request. |
| UC-007 — Deferred compaction during a tool turn | Policy requests compaction while a tool protocol group is live | DF-P05 + DF-L01 + DF-L08 + DF-L02 + DF-L03 + DF-L04 | Live tool suffix is protected and the same pending operation executes at the next supported continuation preparation. |
| UC-008 — Compaction before a newly arrived user request | Current activity recorded; pending compaction exists | DF-P04 + DF-P12 + DF-L01/L03/L04/L10; failure DF-R03 | C(n) publishes first; recovery captures C(n) base; current request follows. |
| UC-009 — Retained continuation starts with user content | Planned retained suffix begins with a user message | DF-P04 + DF-L01 + DF-L03 | Compatible user regions are canonically combined while retaining distinct constituent provenance. |
| UC-010 — Retained continuation starts with assistant/tool content | Planned retained suffix begins at an assistant/tool boundary | DF-P05 + DF-L01 + DF-L03 | One standalone compacted-memory user region precedes the intact assistant/tool continuation. |
| UC-011 — Multimodal user content after compaction | User sends supported media plus text | DF-P03 or DF-P04 + DF-L03 + DF-P07 | Media stays attached to the real user constituent through composition, snapshot, restore, and provider translation. |
| UC-012 — Repeated compaction | A later compaction starts with a non-empty lineage whose last record is current | DF-P06 + DF-L01 + DF-L08 + DF-L02 + DF-L04 | C(n) directly references C(n-1), archives only new R(n), and projects only bounded M(n). |
| UC-013 — Persist a finalized WorkingContext | Any accepted context mutation or replacement completes | DF-P03/DF-P04/DF-P05/DF-P06 + DF-L03/DF-L04 | `MemoryManager` writes the exact finalized schema-v5 context used for rendering. |
| UC-014 — Resume from a valid snapshot | Follow-up activates a run with valid schema-v5 snapshot | DF-P07 | Bootstrap installs the exact context, repairs tool protocol if required, and continues normally. |
| UC-015 — Migrate exact native pre-lineage WorkingContext | Startup reaches pending new-ID native migration | DF-S02 + DF-L06 | Carry run/member snapshot identity, gate lineage, skip every nonempty-lineage location byte-for-byte, and for absent/empty lineage load source/reference facts, retain current-valid truthfully matched units, omit unsupported/incomplete units without repair, publish strict v5 (possibly metadata-identified `messages: []`), reject parseable identity conflict without mutation, and leave exclusions/raw traces untouched. |
| UC-016 — Render the provider request | Request preparation has a finalized provider-neutral context | DF-P03 or DF-P04/DF-P05 + DF-L03 | Renderer translates wire/tool/media details only; it does not decide memory semantics. |
| UC-017 — External runtime without native WorkingContext | Codex/Claude run | DF-P09 | External writer records/rotates raw only; no snapshot/native migration/recovery. |
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
| UC-028 — Provider failure after successful pending compaction | C(n) publishes during request preparation and provider then fails | DF-P12 + DF-L10 + DF-R03 | Restore removes failed request mutation but keeps C(n) context/snapshot, cleared pending state, archive/output/lineage; no duplicate retry. |
| UC-029 — Convert unsupported native content by omission | DF-L06 encounters absent/empty-lineage content that cannot satisfy current structure/provenance/tool invariants | DF-S02 + DF-L06 | Retain only current-valid truthfully matched units, omit the rest without Tool repair, use expected identity plus `messages: []` when needed, validate before mutation, and report `converted_with_omissions` without generated content or raw mutation. |

Coverage result: **UC-001 through UC-029 are all mapped.** UC-028 carries request recovery; UC-029 carries exceptional migration usability through existing DF-S02/DF-L06; the remaining use cases retain their mapped compaction, migration, projection, and origin spines.

## 4. Ownership And Authoritative Boundaries

| Owner | Owns | Does not own |
| --- | --- | --- |
| Raw-trace ingestion boundary | Runtime-event normalization, original record identity/order, active raw persistence | Semantic memory, current WorkingContext, compaction-lineage selection |
| `LocalMemoryRunViewProjectionProvider` | Active-only Event Monitor projection and paging entrypoints | Snapshot restore, archived evidence browsing, episodic/semantic recall |
| `AgentWorkTraceProjectionService` | Explicit generated Work Evidence regeneration from enumerated raw sources; historical-replay adapter invocation; timestamped Markdown/file/manifest contract | Native compactor input selection, current LLM context, or shared low-level presentation policy |
| `LLMRequestAssembler` | Stable request-base order: system/tool safety, pending compaction, post-compaction recovery capture, request mutation/render, local post-capture restore, package carriage | Provider stream settlement or durable-compaction rollback |
| `PendingCompactionExecutor` | Pending-operation lifecycle, strategy invocation, supported failure/retry reporting, success handoff | Direct WorkingContext field mutation, direct repository/file coordination |
| Structured compaction strategy | Planning, history-only operation-message construction from selected WorkingContext units, compactor invocation, and valid IDless content/selection/execution proposal construction | Stable task/semantic/output-shape policy, model launch budgeting, assigning output IDs, reading/validating the lineage head, building accepted lineage/context candidates, or publishing raw archive/memory/lineage/snapshot |
| Built-in Memory Compactor system prompt | Stable semantic extraction and exact response-shape contract | Per-operation source history, launch/model selection, structural acceptance, or persistence |
| `MemoryManager` | Sole live WorkingContext boundary; accepted compaction; lineage-head baseline; focused recovery facade over copied context/pending state | Provider wire, recursive query, or durable rollback through request recovery |
| Canonical context projector/composer | Pure provider-neutral transformation of the lineage-head output plus continuation, preserving message-local constituent ranges without duplicating producing/output IDs; no lineage head means no memory region | Selecting arbitrary durable rows, persistence, provider wire policy |
| Compactor conversation-history renderer | Flatten planner-selected visible messages; reuse the canonical context finalizer rather than inventing user connector text; adapt the resulting turns into visible User/Assistant values and settled Tool values; preserve logical order; emit one `User:` label for a composed earlier-summary/compatible-input turn; omit reasoning/backend IDs and synthetic timestamps; add exactly one application-owned `<conversation_history>` boundary; escape reserved-delimiter collisions; choose visible-value bounds; and return the complete operation-user payload | User-message composition policy, stable task/JSON/sizing policy, raw-record reconstruction, shared redaction/serialization/omission mechanics, lineage identity, generated Work Evidence ownership, or semantic condensation |
| Common `CondensedToolCallRenderer` | Tight result/error/no-outcome input, terminal-status derivation, deterministic visible-value serialization, sensitive/backend-text redaction, Tool-body rendering, configurable explicit head/tail omission, and omitted-character counting | Call/result correlation, waiting, WorkingContext or raw-event selection, timestamps, XML/Markdown envelopes, source IDs, file/manifest metadata, orchestration, or persistence |
| Raw-trace archive manager | One complete immutable archive file and manifest validation/read by run-relative `file_name` | Provenance semantics or recursive ancestry |
| Compaction-lineage record/persistence boundary | Structural record validation without count maxima; supported prompt audit values 1/2; append/read tail and output-membership lookup | Semantic sizing, message composition, LLM content, or recursive response assembly |
| Compaction-lineage resolver | Run-scoped direct/root provenance query, cycle protection, deduplication, completeness status | Mutating lineage, raw archives, or memory output |
| Working-context snapshot bootstrapper | Direct strict-v5 message restore only; validates message-local ranges/raw refs and tool/media structure; fails when an explicit restore has no snapshot | Lineage/current-output lookup, Event Monitor history, historical decoding, raw-history reconstruction, generic corruption recovery, or migration |
| Native WorkingContext migration | Exact target/identity classification, lineage gate, source/fact loading, converter delegation, complete per-run validation, bounded diagnostics, snapshot publication, and exact cleanup | Message/ref matching, external cleanup policy, normal restore, lineage creation, any raw mutation, synthetic content/repair, global preflight, custom filesystem recovery, or startup blocking |
| Native migration converter | Historical decode, parseable source-identity validation, message/content/media/tool/ref matching against supplied facts, omission, finalization, strict-v5 candidate/identity rejection | Filesystem/store reads, target classification, publication, repair, synthetic content, or normal runtime behavior |
| `AppDataMigrationRunner.runPending` | Ordered required attempts; mark/run each migration through the existing contract; persist/return aggregate status; retry `FAILED`; treat `SUCCEEDED_WITH_WARNINGS` as completed | Native conversion/degradation policy, compatibility restore, prepared-plan orchestration, or ticket-specific global startup block |
| `RuntimeMemoryLocationClassifier` | Exact current metadata-derived standalone/team-member location, subject, runtime kind, and diagnostics | Snapshot content, migration action, arbitrary path inference |
| `LlmRequestRecoveryBoundary` | Ephemeral WorkingContext/pending copy and one-settlement restore/release | Raw/archive/output/lineage/tool-fact rollback |
| `LlmPhase` | Provider lifecycle and settlement of package checkpoint after failure/success/retained interruption | Capture timing or coordinator internals |
| `ExternalRuntimeMemoryWriter` | Codex/Claude raw trace append/rotation only | WorkingContext snapshot/native compaction |
| Provider renderers | Provider-specific wire, tool, and media translation | Memory/current-request selection or merging |

### 4.1 Required dependency direction

Allowed:

```text
Runtime/request caller
  -> LLMRequestAssembler
     -> PendingCompactionExecutor -> MemoryManager accepted-compaction boundary
     -> MemoryManager request-recovery boundary
     -> provider renderer/package
  -> LlmPhase provider settlement
```

```text
Server app-data migration runner
  -> delivered external cleanup
  -> native migration
     -> RuntimeMemoryLocationClassifier
     -> for each exact native target: convert/finalize/strict-validate in memory
     -> per-run validated strict-v5 publication + cleanup
  -> persist aggregate converted/warning/failure status
  -> ordinary server startup continues
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
- Request recovery must not capture before pending compaction or restore raw/archive/output/lineage/tool facts; `LlmPhase` must not bypass `MemoryManager` for coordinator internals.
- Migrations must not guess runtime ownership from paths/snapshot files; native conversion must not touch external/imported/unsupported/unclassified/conflicting locations.
- Runner/server must not turn one native conversion failure into a ticket-specific global startup exception/rethrow.
- The native migration must gate lineage before conversion, skip every nonempty-lineage location byte-for-byte without inspecting its state, and construct/finalize/strict-validate the complete candidate before replacing an absent/empty-lineage snapshot.
- API/E2E/delivery must not implement a second classifier/converter or repeat the completed structural audit; validation uses representative production-converter fixtures plus the retained audit evidence.
- The native converter must not classify omitted unsupported content as hard failure. It returns the retained current-valid subset or metadata-identified `messages: []`; omission is reported as warning. Parseable identity conflict is a typed rejection. Ordinary filesystem errors are left to existing runner behavior, not a custom recovery branch.
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
- Normal restore, projection, retrieval, and lineage code must not decode pre-lineage rows/snapshots, branch on historical fields, fall back to arbitrary durable rows, reconstruct context from raw traces, or infer a producing compaction. Only DF-S02/DF-L06 may decode historical snapshots or know obsolete filenames.

The mixed-level strategy-write path is historical pre-SR-004 evidence and is already removed. Delivered SR-010 preserves the IDless strategy/manager boundary and has already corrected prompt/cardinality/audit/canonical rendering; SR-015 does not reopen it.

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
| Native WorkingContext migration | Server startup / DF-S02, DF-L06 | Own exact eligibility, lineage gate, source/fact loading, complete candidate validation before snapshot replacement, bounded diagnostics, and exact cleanup; it delegates matching and never creates content or mutates raw traces. |
| Native migration converter | Core migration / DF-L06 | Own the typed expected-identity/source-byte/reference-fact seam, historical decode, identity/message/ref matching, omission, finalization, and candidate/identity-rejection result. |
| Runtime memory-location classifier | Both migrations / DF-S02 | Current metadata/location -> exact typed runtime locations, standalone `runId`/team `memberRunId` snapshot identity, and diagnostics only. |
| App-data migration runner / `startConfiguredServer` | Server startup / DF-S02 | Use the existing nonblocking lifecycle. Neither interprets native degradation details nor adds a ticket-global throw, prepared-plan lifecycle, compatibility branch, or ticket-specific migration-recovery path. |
| Runtime reporter | `PendingCompactionExecutor` / DF-S03 and DF-R01 | Emit lifecycle metadata using the same pending `compactionId`. |
| Request recovery boundary | Assembler/`LlmPhase` / DF-P03, DF-P12, DF-R03, DF-L10 | Copy/restore/release WorkingContext + pending state once; persist recovered v5 and diagnostic; no durable rollback. |
| Durable episode/semantic store | `MemoryManager` accepted-compaction boundary / DF-L04 | Persist content artifacts by their own IDs; it does not decide which output is current. |
| Raw-trace archive manager | `MemoryManager` accepted-compaction boundary / DF-L04 | Archive the exact selected raw set once and return the completed manifest entry. |
| Lineage repository | `MemoryManager` commit and lineage resolver / DF-L04 and DF-L05 | Persist/query direct reference-only records and expose the last successful record as the current head. |
| Snapshot serializer/store | `MemoryManager`, snapshot bootstrapper, and migration converter / DF-P03, DF-L04, DF-P07, DF-L06 | Serialize/write/read finalized provider-neutral messages, media/tool structures, and message-local constituent ranges/raw refs only. It owns no compaction, output, lineage, or current-state identity. |
| Tool-protocol safety/repair | `MemoryManager` / DF-L03 and restore paths | Preserve valid assistant tool-call/result structure at supported boundaries. |
| Raw-trace transformer/page policy | Run projection provider / DF-L07 | Convert active records and validate bounded cursors. |

No new generic “memory coordinator,” “support,” evidence-copy store, segment identity, activity identity, or generation identity is justified.

## 6. Persisted-Data Decisions

| Persisted subject | Decision | Evidence and target handling |
| --- | --- | --- |
| Existing active raw traces and completed raw archive files/manifests | **Directly Usable — No Migration** | Existing IDs/content and completed archive `file_name` remain authoritative. Native snapshot migration never appends, rewrites, archives, or deletes raw records/manifests. |
| Pre-lineage episode/semantic rows and compacted-memory manifest | **Discard or Rebuild** | Required startup migration deletes `episodic.jsonl`, `semantic.jsonl`, and `compacted_memory_manifest.json`. It does not parse, transform, preserve, or backfill them. Current runtime has no reader for their schema. |
| `compaction_lineage.jsonl` | **Directly Usable — No Migration** | Schema/relations stay unchanged. Existing prompt audit value-1 records remain truthful; new records use 2; current reader accepts/preserves supported 1/2 mixed chains. Natural membership widens existing arrays; no rewrite/state file exists. |
| Exact metadata-classified native AutoByteus snapshots v1-v4 and historical/no-lineage v5 | **Migration Required**, except direct retention of strict natural v5 whose every non-system unit already has truthful eligible-active backing | The 347 audited native snapshots (v1=1, v3=79, v4=267) are all migratable through tolerant projection. Retain current-valid truthfully sourceable units, omit unsupported units, and use `messages: []` when nothing survives. Normal runtime stays strict v5. |
| Valid lineage-aware working-context snapshot v5 | **Directly Usable — No Migration** | Directly restores finalized messages and message-local constituent ranges/raw refs. It contains no compaction/output IDs or current-state field; current output lookup belongs to the lineage tail. |
| Any nonempty lineage | **Directly usable / outside this transition** | The migration checks only whether lineage is absent/empty. Any nonempty file marks the location outside the pre-lineage conversion target, so the complete location is skipped byte-for-byte without validation, cleanup, repair, or recovery. |
| Generated Work Evidence Markdown/manifest | **Discard or Rebuild / No Migration** | It is regenerated from raw sources by its existing projection owner and is not a compactor authority. Source enumeration, timestamps, ordering, lowercase labels, filenames, and manifest remain; current regenerated bodies already use shared explicit head/tail omission. |
| External runtime raw traces and snapshot locations | **Raw traces directly usable; snapshots not native migration targets** | Completed prerequisite makes Codex/Claude raw-only and removed exact classified duplicate snapshots. Imported/unsupported/unclassified/conflicting locations are untouched. |

One bounded exact-native snapshot migration is required. Request recovery is ephemeral state, not persisted-data migration. No dual runtime reader, lineage backfill, operation journal, global startup gate, or rewrite of existing raw/archive content is required.

## 7. Product-Reachability Validation

| Premise | Classification | Complete witness | Design consequence |
| --- | --- | --- | --- |
| Normal native compaction before a user/tool-continuation request | Reachable | Supported policy calls `MemoryManager.requestCompaction`; `LLMRequestAssembler` calls `PendingCompactionExecutor.executeIfRequired` during normal preparation | Governs DF-P04/DF-P05 and the recurrent target change. |
| Runner failure or parser-rejected response | Reachable | Configured compactor call in the structured strategy throws/rejects; executor reports failure; immediate `LlmPhase` records a diagnostic or normal request preparation aborts before dispatch; the pending operation remains | Requires DF-R01 and no writes before accepted proposal. |
| A successful compaction has current M(n-1) but no newly selected raw-backed natural R(n) | Not Reachable under the current planner or approved target contract | Current planner requires an eligible compactable natural unit. The target adds M(n-1) as a seed but explicitly retains non-empty R(n) as a success precondition because every success has one newly selected archive file. | Preserve the eligibility invariant; do not add a special state machine or recovery path. M(n-1) alone is neither re-archived nor sufficient for success. |
| Active Event Monitor cursor invalidated by successful archive/rewrite | Reachable | Successful native compaction archives selected active rows and rewrites the file; page policy includes manifest/file generation in cursor validation | Requires expiration/reload behavior, not archive fallback. |
| Valid snapshot direct restore | Reachable | User follows up to an inactive persisted run; activation executes `WorkingContextSnapshotRestoreStep`; valid payload deserializes | Snapshot remains the normal continuation authority. |
| Codex/Claude application WorkingContext snapshot after prerequisite | Not Reachable in target lifecycle | `ExternalRuntimeMemoryWriter` is raw-only; exact classified old duplicates were removed by delivered migration | Exclude external locations from native conversion; preserve DF-P09. |
| Provider failure after pending compaction succeeds during assembly | Reachable | Normal native request -> assembler executes pending compaction -> archive/output/lineage/context/v5 commit -> package/provider stream -> provider throws | Requires DF-P12/DF-R03/DF-L10 post-compaction capture; durable compaction cannot be rolled back. |
| Existing native run restores a pre-lineage snapshot | Reachable and observed | User activates AutoByteus run -> restore bootstrap -> strict bootstrapper; Electron log records schema-v4 rejection. Post-prerequisite audit: 347 exact native snapshots, all known structures, zero lineage, active raw present | Requires DF-S02/DF-L06 conversion before DF-P07; tolerant projection guarantees strict v5 while truthfully reporting omissions. |
| Eligible snapshot contains a unit that cannot satisfy current structure/provenance/tool invariants | Reachable within the observed migration corpus | The audit found 1,801 unsourced non-system messages, six old compacted-memory units, and 23 result-less Tool calls | DF-L06 omits those units, may yield `messages: []`, and reports bounded omission diagnostics; it creates no notice, repair, raw evidence, or runtime compatibility branch. |
| Natural compactor conversation-history rendering | Reachable and delivered | Current planner includes memory; builder returns renderer-only reasoning-free XML/shared Tool history; finalizer preserves canonical user turns | Preserve delivered SR-010 DF-L08; no pending implementation. |
| Oversized generated Work Evidence values | Reachable; already implemented/validated | Current Work Evidence calls the shared core head/tail renderer under its own envelope | Preserve SR-004 unchanged. |
| Long/multi-threaded output beyond former counts | Reachable and delivered | Current prompt/builder/parser/normalizer/accepted builder/lineage path has no count cap; projection/origin preserves membership; API-REV-007 proves it | Preserve delivered DF-L04/DF-L05 behavior. |
| Existing prompt-version-1 record followed by current prompt-version-2 record | Reachable and delivered | Ordinary historical SR-004 value-1 compaction may precede current SR-010 value-2 compaction | Current writers use 2; reader preserves 1/2; tail/projector/origin work across the mixed chain; no migration. |
| One-thousand successive compactions | Reachable under approved target contract | The normal compaction path may repeat without a product-specified lifetime limit; AC-007/SCN-007 explicitly require bounded behavior | Requires replacement M(n), not concatenated M1..Mn or a historical top-K mixture. |
| Internal memory-origin lookup | Reachable under approved target contract | REQ-006/UC-021 establish the run-scoped query contract; its caller supplies run/member scope plus explicit artifact kind and ID | Requires one resolver with direct and recursive results; no frontend is implied. |
| Arbitrary snapshot deletion/corruption/manual file mutation | Not Reachable as a ticket premise | Internal files are not a supported user surface and no applicable operational contract was established | Cannot justify generic recovery or duplicate-history prevention machinery. |
| Existing-run restore without any snapshot | Not Reachable under supported lifecycle evidence | `restoreAgent` is the only restore caller; normal create does not enter restore bootstrap and normal context mutations persist snapshots. No supported action removes the file | Remove `WorkingContextRecoveryProjector`; explicit restore absence is an invariant failure, not a recovery use case. |
| API/E2E migration success recorded in the product database for a temporary memory root | Not a supported product state; observed test-environment contamination | Production `AppConfig` binds memory and DB to one app-data root; the mismatched row/log path came from test setup | Use isolated app-data/DB in API/E2E and a new migration ID. Do not add runtime multi-root compatibility logic. |
| Built-in normalizer/output-validator produces an invalid context in normal configuration | Not Reachable on current evidence | No supported built-in result path was found; test-only construction is insufficient | Do not add state or recovery behavior for it. Normal validation remains defensive. |

## 8. Design-Principles Validation

### Principle 1 — Approved behavior and production reality

**Foundation result: Satisfied; approved behavior basis recorded.**

- Current, target, preserved, and out-of-scope behavior are separated in `requirements.md`.
- The native-compaction change is traced from real request/post-response triggers through accepted context and provider effects, and the Work Evidence presentation change is traced from its current consumer request through generated package delivery.
- The native snapshot restore failure, post-compaction provider failure, and compactor failure premises have concrete product witnesses; external snapshot ownership is excluded by delivered source/evidence.

### Principle 2 — Data-flow spine inventory and clarity

**Foundation result: Satisfied.**

- Twelve primary spines include the reachable pending-compaction/request-recovery path DF-P12. Native migration remains the existing secondary DF-S02 with bounded local DF-L06.
- Two secondary, three return/event, and ten bounded-local spines are explicit.
- Every primary path shows trigger, authoritative boundary, critical dependency/effect, and meaningful end.
- UC-001 through UC-029 are mapped; UC-028 is carried by DF-P12/DF-R03/DF-L10 and UC-029 by DF-S02/DF-L06.

### Principle 3 — Ownership clarity and boundary encapsulation

**Target constraint: Satisfied; SR-010 is delivered and the pending SR-015 owners are explicit.**

- `MemoryManager` remains the sole live WorkingContext mutation/replacement boundary.
- `PendingCompactionExecutor` owns operation lifecycle and supported retry.
- Strategy code proposes; the accepted-compaction boundary publishes.
- The system prompt owns the complete natural task and stable semantic/output policy, the operation user message owns only the current rendered history payload, and parser/normalizer/acceptance own structural correctness without semantic-count policy. Launch/provider output-token configuration remains unchanged.
- The core readable presentation capability owns only serialization, redaction, Tool-body formatting, and head/tail omission. WorkingContext and historical replay remain authoritative at their separate adapters, preventing a mixed-level dependency or kitchen-sink shared event.
- Delivered SR-010 keeps the strategy IDless/side-effect-free, gives `MemoryManager` plus the accepted committer publication ownership, keeps predecessor identity outside message constituents, and reuses the finalizer for compactor-visible turns.
- `RuntimeMemoryLocationClassifier` owns exact location and run/member snapshot identity; the native migration owns lineage/files/status; the pure converter owns historical identity/message/ref matching; external/native migrations retain distinct action policies. `LLMRequestAssembler` owns stable-base capture and `LlmPhase` owns provider settlement through the manager recovery boundary.
- Allowed dependencies and forbidden bypasses are explicit.

### Principle 4 — Off-spine concerns

**Foundation result: Satisfied.**

- Planning, rendering, exact migration classification/conversion/publication, request recovery, persistence, reporting, and provider settlement each serve a named main-line owner.
- Existing archive, snapshot, reporting, tool-safety, and projection capabilities are reused. Generated Work Evidence already retains raw-backed authority and its envelope over the shared explicit head/tail omission capability; compaction renders its own selected WorkingContext source.
- No content-copy snapshot, generic coordinator, or artificial identifier layer is introduced.

### Principle 5 — Current-schema runtime and persisted-data transition

**Foundation result: Satisfied.**

- Each affected persisted subject has an explicit decision.
- Raw traces/manifests remain directly usable and are explicitly preserved.
- Pre-lineage derived files are disposable; exactly classified native WorkingContext snapshots are continuation state and are migrated once. Tolerant projection retains only current-valid truthfully sourceable units and may produce `messages: []`. External/imported/unsupported/unclassified/conflicting locations remain outside.
- New lineage data is prospective current-schema state; no current-pointer file exists.
- Normal runtime contains no historical decoder, dual read/write, raw-history context fallback, or compatibility object.
- Generated Work Evidence is already rebuildable and its SR-004 presentation change required no migration; SR-010 leaves it unchanged.
- Migration is justified by observed restore failure and unacceptable loss of run availability. Complete per-run candidate validation prevents invalid partial replacement; omission rather than synthetic evidence keeps prospective first-compaction provenance truthful without fabricating historical lineage or adding a legacy runtime path.

### Principle 6 — Product-reachability gate

**Foundation result: Satisfied.**

- Every material failure or recovery premise is classified with a trigger, concrete path, state, and consequence.
- Only established native-compaction, Work Evidence, runner/parser failure, cursor expiry, observed native restore, exact startup classification/migration, and post-compaction provider-failure paths affect the target.

### Derived structural checks

- **Shared-structure tightness:** `CompactionLineageRecord` has one existing `compactionId`, one optional direct predecessor, one existing run-relative archive filename, and separate produced episode/semantic ID arrays. It has no historical-input variant, duplicate content, raw-ID list, boundary key, activity ID, generation ID, or copied transitive closure.
- **No empty indirection:** proposed owners each own policy, state, transformation, or persistence; no pass-through service is required.
- **No mixed-level dependency:** callers use the compaction operation/context boundary rather than coordinating its repositories; core compaction does not import server projection code.
- **Source-aligned rendering:** compaction renders selected WorkingContext constituents as the natural model-visible conversation it owns; server Work Evidence projection independently remains a raw-backed generated artifact. They reuse only one tight readable presentation primitive, not source normalization, selection, timestamps, envelopes, or orchestration.
- **Shared-base tightness:** `CondensedToolCallInput` contains only name, arguments, one explicit result/error/no-outcome variant, and render options containing the per-value bound. Terminal status is derived; no-outcome carries its truthful status and renders `result: not available`. The shared renderer does not accumulate timestamps, trace IDs, WorkingContext metadata, historical-replay metadata, XML/Markdown wrappers, file attributes, waiting, or correlation.
- **Removal is explicit:** later compaction no longer excludes current memory; strategy-owned output-ID assignment/persistence is removed; semantic schema-gate/global manifest authority and normal old-schema branches remain removed; the destructive reset, global migration exception/server rethrow, pre-assembly recovery capture, and `WorkingContextRecoveryProjector` are removed/decommissioned; native historical conversion exists only in the migration boundary; prior clipping paths stay replaced by shared bounded-value policy.
- **Folder/file mapping:** intentionally owned by the mandatory `design-spec.md`, so physical structure follows these spines and owners rather than leading them.

## 9. Foundation Gate Result

The user-approved SR-015 package is:

- behaviorally complete for 29 use cases;
- mapped to 12 primary, 2 secondary, 3 return/event, and 10 bounded-local spines;
- explicit about exact native migration/classifier/converter ownership, standalone/team-member snapshot identity, and excluded location classes;
- explicit that every eligible source is convertible by retaining current-valid truthfully sourceable units, omitting unsupported units, and using `messages: []` when needed;
- explicit that migration creates no recovery notice, placeholder, Tool repair, synthetic Tool outcome, baseline/repair evidence, or raw mutation;
- explicit that each complete candidate validates before that run's mutation and no duplicate probe/prepared-plan subsystem is introduced;
- explicit that request recovery starts after durable compaction and owns no durable rollback;
- current-schema-only after migration and filtered through product reachability; and
- preservation-only on delivered SR-010 natural prompt/item-count behavior.

Historical SR-004 fail-closed/destructive decisions remain accurately recorded in revision/review history. SR-012 superseded that target after external-runtime simplification; ARCH-REV-007 then required the migration safeguard to be normative. SR-013 drafted a notice/baseline/repair form, and the user explicitly simplified it. SR-014 records the approved tolerant-subset/empty-v5 rule. SR-015 preserves that rule, removes the last contradictory repair prose, adds one exact typed identity/reference-fact seam, links BEH-013 to DF-S02/DF-L06, and limits conversion to absent/empty lineage while skipping every nonempty location untouched. It is ready for renewed architecture review.
