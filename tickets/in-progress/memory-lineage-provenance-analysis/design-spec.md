# Design Spec

## Status

`Ready for renewed architecture review — SR-010 technical correction of ARCH-F-006 through ARCH-F-009 over the user-approved SR-009 behavior (2026-07-31)`

This design preserves the implemented SR-004 lineage/context/startup baseline and the user-approved SR-009 natural sizing/prompt/canonical-turn intent. SR-010 supplies the missing technical completeness: full lineage validator/store/committer coverage, actual current-source evidence, truthful prompt-contract audit versioning, and strict separation between message-local provenance and manager-owned predecessor identity. The normative behavioral details remain in `memory-context-and-lineage-contract.md`; `use-case-data-flow-spine-map.md` owns path/ownership coverage; and `memory-compactor-prompt-content-contract.md` remains the exact LLM-facing wording authority.

Architecture round 1 found three design impacts. SR-002 resolved them and architecture round 2 (`ARCH-REV-002`) passed the package, authorizing implementation. Implementation work then began and remains present in the worktree. The user subsequently superseded the persisted-state basis with a clean reset and clarified the separation of current context, derived memory, and lineage. Architecture round 3 (`ARCH-REV-003`) failed SR-003 on the real startup caller and inaccurate solution chronology; SR-004 resolved both findings, and architecture round 4 (`ARCH-REV-004`) passed. Implementation, source review, API/E2E, and delivery work followed. API-REV-006 passed the then-approved fixed-count behavior at 98%, after which the user explicitly superseded only the compactor sizing policy. The solution designer then introduced an unrequested numeric token ceiling; the user rejected it. SR-006 preserves the passed lineage/context/startup architecture and introduces one bounded local behavior/refactor delta: remove fixed item counts and let the LLM choose natural episode/fact counts, with launch/provider output-token configuration unchanged. SR-007 added an exact prompt-content artifact; SR-008 removed leaked platform terminology from the system prompt and made the operation message exactly the renderer-produced history block. SR-009 aligns the target wording with origin/personal's concise natural style and prevents internal constituent ranges from becoming consecutive artificial `User:` entries. The user approved the cumulative revision and authorized architecture review:

| Finding / revision trigger | Resolution in the current cumulative package |
| --- | --- |
| User separation-of-concerns clarification | `compaction_lineage.jsonl` contains successful records only and its last record is the sole current compaction. Snapshot v5 owns finalized messages/message-local ranges only. No `compaction_state.json`, current pointer, `CompactedMemoryOrigin`, or replacement manifest exists. |
| User clean-cut decision superseding `ARCH-F-002` | One required startup app-data migration deletes pre-lineage episodic/semantic rows, WorkingContext snapshots, and compacted-memory manifests while preserving raw traces/manifests. Normal runtime has no historical reader or fallback. |
| `ARCH-F-003` | Keeps DF-L02 strictly IDless, assigns output IDs/builds the accepted candidate only in `MemoryManager`, changes the simplified publication order to archive -> output -> append lineage as head -> context -> message-only snapshot, and keeps DF-S02/DF-S03 as `Secondary`. |
| `ARCH-F-004` | `AppDataMigrationRunner.runPending()` persists all attempted required results and throws after any non-startable result. `ResetPreLineageMemoryAppDataMigration` returns `FAILED` for any discovery/deletion failure. The real `startConfiguredServer` caller logs and rethrows before `bootstrapBuiltInAgents`, `buildApp`, or `app.listen`; existing `SUCCEEDED`/`SUCCEEDED_WITH_WARNINGS` remain startable. |
| `ARCH-F-005` | Records the round-2 Pass and existing superseded implementation work explicitly. The implementation sequence begins with reconciliation: retain aligned SR-002 code, remove superseded seed/origin/pointer pieces, and implement only the approved deltas. |
| API-REV-006 design impact and user quality clarification | Preserves API-REV-006 as a Pass for the superseded fixed-count contract, then removes fixed item-count policy and lets the LLM choose the natural semantic structure. The user rejected a ticket-specific token ceiling; no launch/provider, lineage, persistence, snapshot, or primary-spine design changes occur. |
| `ARCH-F-006` through `ARCH-F-009` / `ARCH-REV-005` | Adds the hidden lineage membership validator and full commit/read/projection/origin path; refreshes pre-SR-004 claims as historical; writes prompt audit version 2 while directly reading version 1/2 mixed chains; and keeps `previousCompactionId` solely in manager-captured lineage state, never message constituents. |

## Current-State Read

### Actual implemented SR-004 baseline at current HEAD

1. `MemoryManager` records normalized activity, owns provider-neutral `WorkingContext`, captures the current lineage head before strategy execution, assigns output IDs, and coordinates accepted publication through `MemoryManagerCompactionCoordinator`/`AcceptedCompactionCommitter`.
2. `WorkingContextMessageWindowPlanner` builds typed units, includes the existing `compacted_memory` unit in `compactableUnits`, protects live tool protocol, retains a recent suffix, and collects archive-eligible raw IDs only from selected natural R(n) units.
3. `StructuredJsonCompactionStrategy` is side-effect-free and returns an IDless proposal. `AcceptedCompactionCommitter` performs archive -> output rows -> lineage append -> finalized context -> v5 snapshot -> pending clear.
4. `compaction_lineage.jsonl` contains successful records only; `FileCompactionLineageStore.readHead()` selects current output. `CurrentCompactionOutputLoader` loads exactly the tail-listed rows. `CompactionLineageResolver` provides typed direct and recursive origin.
5. Snapshot schema v5 persists finalized messages, media/tool structures, and message-local constituent ranges only. The required startup reset and `startConfiguredServer` fail-closed path are implemented; no old-schema runtime reader/gate/manifest authority remains.
6. `CompactionConversationHistoryRenderer` already emits one escaped `<conversation_history>` block with reasoning-free `User`/`Assistant`/`Tool` entries, shared `CondensedToolCallRenderer` bodies, and explicit per-value head/tail omission. Generated Work Evidence already uses the same core presentation capability under its own raw/timestamped Markdown envelope.

### Actual remaining SR-010 gaps

7. `agent.md` and `WorkingContextCompactionPromptBuilder` duplicate the fixed 1–3 episode / 20 fact policy. Parser slices to 3/20; normalizer slices again and enforces per-category caps; accepted builder rejects >3/>20.
8. `normalizeCompactionLineageRecord` independently rejects `episodeIds.length > 3` or `semanticIds.length > 20`. `FileCompactionLineageStore.appendNext()` invokes it after `AcceptedCompactionCommitter` has archived R(n) and persisted output rows, so stopping the delta at accepted-candidate construction would still reject normal natural-count output.
9. `CompactionLineageExecution.promptContractVersion` accepts only literal `1`, and `AcceptedCompactionBuilder` writes literal `1`. That value truthfully audits the implemented fixed-count/duplicated-operation SR-004 prompt contract, but cannot truthfully label the materially changed target contract.
10. `WorkingContextMessageUnitBuilder` expands a composed user message into separate constituent units. The renderer labels those units directly, so one canonical user turn can become consecutive artificial `User:` entries. `WorkingContextFinalizer` already owns the correct composition and must be reused before labels are emitted.

Pre-SR-004 observations about top-K current projection, strategy-side persistence, v4 restore, `Assistant work notes`, server-local redaction, excluded prior memory, and swallowed migration failure remain historical evidence for SR-004. They are not current source claims and must not drive SR-010 reimplementation.

Constraints the design must preserve:

- Event Monitor remains active-raw only; Work Evidence remains archive-plus-active raw replay; neither is changed.
- raw archive and durable output rows remain content authorities; lineage remains reference-only.
- manager-owned IDless proposal/accepted commit, tail-as-current, v5 message-only snapshot, current-only restore, origin resolver, and shared presentation remain unchanged.
- provider renderers own wire/tool/media encoding, not memory semantics; external storage-only runtimes remain out of semantic compaction scope.
- existing launch/provider output capacity remains unchanged; malformed/truncated model output remains a pre-write parser failure/retry.
- no transaction journal, compatibility reader, new schema field, new primary spine, or new subsystem is introduced.

## Intended Change

Preserve the implemented recurrent application-owned transition:

```text
M(n) = compact(M(n-1) + R(n))
```

`R(n)` is a non-empty newly selected raw-backed natural prefix. A successful operation uses its existing pending `compactionId`, archives exactly `R(n)` into one completed raw archive file, persists one complete replacement output with natural LLM-chosen item counts, and appends one immutable reference-only lineage record. That last successful record is the current compaction. The manager then installs one finalized canonical `WorkingContext` and writes message-only snapshot schema v5. The LLM generates only episode/fact content; application code owns all identifiers and relations.

The implemented SR-004 baseline already:

- makes the compaction strategy proposal-only;
- centralizes accepted publication behind `MemoryManager`;
- projects only the output listed by the lineage head;
- makes prior compacted memory a logical planner input without re-archiving it; `MemoryManager` captures the baseline lineage head outside the snapshot and strategy;
- adds typed, range-based constituent provenance so one physical user message can preserve memory/retained/current sections without duplicating message content;
- adds one required, idempotent startup app-data migration that deletes pre-lineage episode/semantic/snapshot/manifest files while preserving raw evidence, then removes every historical-format runtime reader/gate/fallback;
- adds a typed cycle-safe origin resolver;
- replaces compaction-specific/Work-Evidence-specific readable tool formatting with one tight core `CondensedToolCallRenderer`;
- removes private reasoning, backend IDs, synthetic timestamps, and silent prefix-only clipping from compactor input;
- keeps all out-of-scope product surfaces and external-runtime semantics unchanged.

### Pending SR-010 delta only

- replace `agent.md` exactly and reduce the operation builder to renderer output only;
- pass selected visible messages through the existing finalizer before visible labels;
- remove count maxima from parser, normalizer, accepted builder, and lineage normalization while preserving all structural/per-entry safeguards;
- define `promptContractVersion` as producing-contract audit metadata, write value `2` for the approved target, accept/preserve supported values `1 | 2`, and leave schema/selection policy versions unchanged; and
- prove >3 episodes and >20 facts through accepted commit, output persistence, lineage append/read, current-head projection, and typed origin lookup.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002, REQ-008, REQ-009; AC-001–003, AC-009, AC-010 | Runtime activity and active Event Monitor use cases | Requirements current/desired table; investigation source log and active-only projection findings | Preserve immutable raw identity/content across active-to-archive movement; keep Event Monitor active-only | DF-P01, DF-P02, DF-R02, DF-L07 |
| BEH-002 | Contract | REQ-002–004; AC-003, AC-004, AC-006 | One successful native compaction | Implemented planner/strategy/manager/committer already publishes exact reference-only recurrent lineage; lineage normalization still caps output membership | Preserve relation/ownership; remove only the 3/20 lineage membership maximum | DF-P04, DF-L01, DF-L04 |
| BEH-003 | Contract | REQ-003–006; AC-004–006 | Accepted structured output | Implemented complete output/lineage path; count maxima remain in four application layers and prompt audit value is fixed at 1 | Preserve all natural accepted items; write prompt audit value 2 while directly reading existing value 1/2 records | DF-L02, DF-L04, DF-P08 |
| BEH-004 | System | REQ-003, REQ-006; AC-004, AC-012 | Typed internal origin lookup | Implemented resolver finds producing membership and direct/root origins | Preserve; prove natural-count membership and mixed prompt-version predecessors remain resolvable | DF-P08, DF-L05 |
| BEH-005 | System | REQ-007; AC-007 | Repeated native compaction and request assembly | Implemented exact-tail recurrence/finalization/v5 snapshot; compactor renderer may relabel split constituents as separate user turns | Reuse finalizer before renderer labels; keep predecessor outside messages/snapshot | DF-P03–DF-P06, DF-P10, DF-L01, DF-L03, DF-L08 |
| BEH-006 | Operational | REQ-006, REQ-008; AC-008, AC-009, AC-012 | Server startup and current-schema restore | Implemented reset/fail-closed startup/v5 restore exact-tail path | Preserve unchanged; current-schema prompt-version-1 lineage is directly usable with new version-2 records | DF-S02, DF-L06, DF-P07, DF-L03 |
| BEH-007 | Contract | REQ-009; AC-010 | Storage-only external runtime | Codex/Claude persist evidence/provider boundaries without native semantic compaction | Use runtime-neutral lineage scope for native compaction; preserve external behavior and do not attribute snapshots to it | DF-P01, DF-P09 |
| BEH-008 | Operational | REQ-004, REQ-007, REQ-008; AC-003, AC-011 | Runner/parser rejection and natural-count accepted publication | Pre-write retry is implemented; hidden lineage cap can reject later after archive/output writes | Preserve pre-write retry and remove the post-output count rule; retain structural failures/order | DF-R01, DF-L02, DF-L04 |
| BEH-009 | Contract | REQ-002, REQ-005, REQ-007, REQ-010, REQ-011; AC-006, AC-007, AC-014, AC-015 | Natural compactor request | Implemented renderer already includes prior memory, omits reasoning/IDs, uses XML/shared Tool/head-tail policy; builder duplicates policy and constituent labels can split a canonical turn | History-only builder plus finalizer-based canonical-turn labels; no lineage identity in constituents | DF-L01, DF-L08, DF-L09 |
| BEH-010 | User | REQ-002, REQ-010, REQ-011; AC-014, AC-015 | Generated Work Evidence request | Shared readable body/head-tail policy is implemented | Preserve unchanged | DF-P11, DF-L09 |
| BEH-011 | Contract | REQ-005, REQ-007, REQ-010, REQ-012; AC-006, AC-007, AC-014, AC-016 | UC-027 / any built-in native compaction | Fixed counts exist in prompts/parser/normalizer/accepted builder/lineage validator; current records audit version 1 | Exact natural prompt, history-only operation payload, no count caps, new-write audit value 2, mixed 1/2 direct use, and full accepted-path coverage | DF-P04–DF-P06, DF-P10, DF-L02, DF-L04, DF-L08 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `tickets/in-progress/memory-lineage-provenance-analysis/memory-context-and-lineage-contract.md` | Normative terminology, invariants, schemas, rendering contract, 27 use cases, exact prompt-content authority, and failure behavior | REQ-001–012; AC-001–016 | The design must implement this contract without weakening or extending it | User-approved / SR-010 aligned |
| `tickets/in-progress/memory-lineage-provenance-analysis/use-case-data-flow-spine-map.md` | Complete production/target spine, owner, dependency, reachability, and persisted-data map | REQ-001–012; AC-001–016 | Supplies the stable DF IDs and design-principles validation used here; SR-010 adds no new spine | User-approved / SR-010 aligned |
| `tickets/in-progress/memory-lineage-provenance-analysis/memory-compactor-prompt-content-contract.md` | Exact origin/personal-style target system-prompt file, history-only builder composition, and canonical user-turn rendering | REQ-005, REQ-007, REQ-010, REQ-012; AC-006, AC-007, AC-014, AC-016 | Wording/boundary authority; implementation copies it exactly and returns any requested wording change as a requirement gap | User-approved / SR-010 |
| `tickets/in-progress/memory-lineage-provenance-analysis/provenance-methodology-analysis.md` | Provenance methodology and repository evidence | REQ-001–006, REQ-008–009, REQ-012; AC-001–006, AC-008–013, AC-016 | Supports application-owned direct edges, recursive derivation, reference-only records, clean-epoch transition, lineage-tail current authority, accepted publication order, and the fact that variable item counts do not change lineage | Complete / SR-010 aligned; approval N/A (evidence) |
| `tickets/in-progress/memory-lineage-provenance-analysis/compacted-memory-message-role-analysis.md` | Provider-message, restore, prompt, natural semantic sizing, and Work Evidence investigation | REQ-007–012; AC-007–016 | Supports recurrent lineage-head input, canonical user composition, message-only snapshot ownership, fail-closed startup, shared rendering, and the quality-first prompt/enforcement ownership split | Complete / SR-010 aligned; approval N/A after normative extraction |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` plus bounded `Refactor` over implemented SR-004.
- Current design issue found: `Yes`, limited to the pending delta.
- Root cause classification: `Duplicated Policy Or Coordination` and `Missing Invariant`.
- Refactor needed now: `Yes`, proportionate extension of existing owners only.
- Evidence: count policy is duplicated across system prompt, operation builder, parser, normalizer, accepted builder, and lineage validator. The final lineage gate is reached after archive/output writes. Prompt audit value 1 cannot truthfully represent the changed producing contract. Constituent selection granularity leaks into visible turn labels despite an existing canonical finalizer.
- Design response: one natural semantic policy in `agent.md`; history-only builder; existing finalizer reused before labels; remove only count maxima at all structural gates; add supported audit value 2 for new writes while preserving direct-use value-1 records; carry natural membership through existing commit/store/projection/origin boundaries.
- Separation of concerns: message constituents retain local kind/range/raw refs only. `MemoryManager` separately captures/verifies the lineage tail and maps it to `previousCompactionId`. Lineage record owns audit version; prompt/renderer do not author storage identity.
- Refactor explicitly not needed: no change to manager/committer sequencing, lineage/snapshot/row schemas, current-output loader, resolver algorithm, startup/reset, Event Monitor, Work Evidence, provider launch, or external runtime boundaries.
- Proportionality: one prompt file, existing compaction parser/normalizer/builder/renderer, one lineage validator/type, one audit constant/value, and focused tests. No new service, file format, state file, migration, primary spine, or output-token policy.
- Residual risk: model semantic quality remains probabilistic and normal publication remains non-transactional; neither justifies new machinery in this ticket.

## Terminology

- **Raw trace**: immutable original activity record. It is evidence of what happened, not the agent's current memory.
- **R(n)**: non-empty newly selected raw-backed natural activity for compaction `n`.
- **M(n)**: complete replacement output produced from M(n-1) plus R(n), with the natural number of episodes and facts chosen by the LLM.
- **Compaction proposal**: validated content and selection facts held in memory; it has no durable side effects.
- **Accepted compaction**: proposal augmented by application-owned artifact IDs, the existing `compactionId`, explicit inputs, a finalized replacement context, and a lineage record candidate.
- **CompactionLineageRecord**: one immutable reference-only direct derivation record for one successful native compaction.
- **Current compaction / lineage head**: the last successfully appended `CompactionLineageRecord`; absent/empty lineage means no current compacted memory.
- **User constituent**: one typed logical region within a physical user message: compacted memory, retained historical user input, or current user input.
- **Compacted-memory constituent**: a message-local kind/range identifying the memory text within a finalized user message. It carries no compaction, episode, or semantic IDs.
- **Startup derived-memory reset**: one required app-data migration that deletes pre-lineage episode/semantic/snapshot/manifest files before agent runtime while preserving raw evidence.
- **Completed archive file**: immutable native-compaction raw-trace JSONL referenced by its run-relative manifest `file_name`; it owns selected raw membership and source interval.
- **Origin result**: complete recorded origin, `not_found`, or a current-state integrity error.
- **Condensed tool call**: consumer-neutral readable body containing name, derived/supplied status, arguments, and exactly one result/error representation.

## Design Reading Order

The remainder follows the mandated reasoning order: transition decision, spines, ownership, interfaces, capability/file allocation, examples, removal/compatibility decisions, and implementation sequence.

## Obsolete Path Removal Policy (Mandatory)

- Policy: `Current model only; no backward-compatible runtime code.`
- Replaced in-scope behavior is clean-cut: strategy mutation/ID assignment becomes IDless proposal-only; mixed retrieval no longer selects current memory; the old compactor response aliases and `episodic_summary` shape disappear; schema-v1-v4 snapshots never enter runtime restore; `CompactedMemorySchemaGate`, semantic clear/snapshot-delete behavior, global compacted-memory manifest authority, complete-corpus recovery, old-row readers, and loose provenance metadata disappear; server Work Evidence redaction/truncation is replaced by the core renderer.
- Pre-lineage `episodic.jsonl`, `semantic.jsonl`, `working_context_snapshot.json`, and `compacted_memory_manifest.json` are explicitly disposable. One registered startup migration removes them before agent runtime. Active/archive raw traces and raw-trace manifests are preserved.
- Historical filename knowledge exists only inside that migration. Normal memory models, stores, projector, resolver, snapshot serializer/bootstrapper, manager, strategy, and renderer expose only current types and behavior.
- No compatibility wrapper, dual reader/writer, optional historical source fields, fallback to arbitrary durable rows, or inferred provenance is permitted.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

| Stored subject and location | Change | Required semantics / constraints | Decision | Rationale and supported criteria |
| --- | --- | --- | --- | --- |
| `raw_traces_active.jsonl`, completed raw archive JSONL, raw-trace manifests | Successful compaction obtains one completed archive descriptor and asserts exact selected membership | Preserve original record IDs/content byte-for-byte; lineage references only manifest `file_name` | `Directly Usable — No Migration` | Existing authoritative evidence remains valid and is the accepted preservation boundary. AC-001–005, AC-009 |
| Pre-lineage `episodic.jsonl`, `semantic.jsonl` | Files lack trustworthy producing-compaction edges | Startup migration deletes each file; runtime never decodes or imports it | `Discard or Rebuild` | Structural conversion cannot reconstruct provenance; usage is sparse and user accepted loss. AC-009, AC-012 |
| New current-format episodic/semantic JSONL | Rows are app-ID-owned outputs listed by exactly one lineage record | Current reader/writer only; no historical fields or tolerant fallback | `Directly Usable — No Migration` after transition | The reset creates a clean epoch before any new row is written. AC-003–009 |
| `compaction_lineage.jsonl` | Existing schema-v1 record arrays allow natural membership; producing prompt audit changes from value 1 to new-write value 2 | Existing value-1 records remain immutable/truthful; normal reader accepts/preserves supported values `1` and `2`; no content interpretation or rewrite | `Directly Usable — No Migration` | Same physical/logical shape and direct relations. Mixed current-schema chains are a normal product path. AC-003–006, AC-016 |
| Pre-v5 `working_context_snapshot.json` | v5 adds typed message-local constituent ranges only | Startup migration deletes it; no content conversion or runtime decoder | `Discard or Rebuild` | The old snapshot may retain an orphan compacted-memory projection after its pre-lineage rows are removed; snapshot is disposable continuation state. AC-008, AC-009 |
| Schema-v5 `working_context_snapshot.json` | Canonical finalized messages plus message-local constituent ranges | Contains no compaction, episode, semantic, lineage, or current-state identity | `Directly Usable — No Migration` | Snapshot owns continuation messages only; lineage owns derived-memory relationships/current head. AC-007–009, AC-012 |
| `compacted_memory_manifest.json` | Existing schema/reset marker containing only `schema_version` and `last_reset_ts`; not lineage or current state | Startup migration deletes it; model/constant/store APIs and gate are removed; no replacement manifest exists | `Discard or Rebuild` | Current validity comes from the successful lineage tail plus referenced rows. AC-009, AC-012 |
| Generated Work Evidence Markdown/manifest | Visible value formatting changes | Regenerate normally from preserved raw evidence; no persisted-content conversion | `Discard or Rebuild` | Existing generated artifact contract already owns regeneration. AC-015 |

Data loss is intentional only for the four pre-lineage derived-state files. Unacceptable loss is any active/archive raw trace or raw-trace manifest mutation.

SR-010 changes allowed lineage membership cardinality and the producing prompt-audit enum, not the record schema. Existing prompt-contract value `1` remains truthful for SR-004 outputs; new outputs write `2`; both are directly usable in one chain. Episode/semantic, WorkingContext, snapshot, raw, reset, and Work Evidence persisted-data decisions remain unchanged.

### Migration Plan

`ResetPreLineageMemoryAppDataMigration` is a required startup definition registered in the existing `AppDataMigrationRegistry` and executed by `AppDataMigrationRunner` before built-in-agent/runtime bootstrap.

1. Discover every standalone and team-member run directory using a migration-owned filesystem scanner.
2. For each run, target exactly `episodic.jsonl`, `semantic.jsonl`, `working_context_snapshot.json`, and `compacted_memory_manifest.json`.
3. Remove each present target; report each absent target as an idempotent skip/no-op.
4. Never open, copy, rename, or delete active/archive raw traces or raw-trace manifests.
5. Record itemized migrated/skipped/failed details through the existing migration repository and log contract.
6. Any discovery or target-removal failure returns `FAILED`, never `SUCCEEDED_WITH_WARNINGS`, and remains retryable. Existing `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` results for other migrations remain startable.
7. `AppDataMigrationRunner.runPending()` persists every attempted required result and throws after processing if any required result is non-startable.
8. `startConfiguredServer` logs and rethrows that failure before `bootstrapBuiltInAgents`, `buildApp`, or `app.listen`; its programmatic promise rejects and the existing CLI `startServer().catch(...)` terminates the process.
9. After success, no migration marker is consulted by memory business logic. An absent/empty `compaction_lineage.jsonl` means no current compacted memory; the first successful record establishes the head.

Interruption is safe because deletion is idempotent: a rerun skips targets already absent and continues removing remaining targets. No backup/rollback is required because the user explicitly classified the four files as disposable; raw evidence is the retained recovery/audit asset.

## Data-Flow Spine Inventory

The approved DF IDs are retained so implementation and verification can trace directly to the foundation map.

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DF-P01 | Primary End-to-End | BEH-001, BEH-007 | Supported runtime activity | Original raw activity durably recorded | Raw ingestion / native `MemoryManager` boundary | Establishes original evidence |
| DF-P02 | Primary End-to-End | BEH-001 | Event Monitor open/page | Active-file projection returned | `LocalMemoryRunViewProjectionProvider` | Preserves activity-view source |
| DF-P03 | Primary End-to-End | BEH-005 | Native request without compaction | Finalized snapshot-equivalent provider request | `LLMRequestAssembler`; `MemoryManager` | Keeps normal preparation canonical |
| DF-P04 | Primary End-to-End | BEH-002, BEH-003, BEH-005, BEH-008, BEH-009 | Pending compaction at preparation | M(n) accepted/current and dispatch proceeds | `PendingCompactionExecutor`; `MemoryManager` | Main changed business flow |
| DF-P05 | Primary End-to-End | BEH-005, BEH-008 | Pending compaction during live tool turn | Tool protocol preserved, later compaction succeeds | Executor with manager invariants | Prevents invalid cuts |
| DF-P06 | Primary End-to-End | BEH-003–005, BEH-009 | Later compaction | Bounded M(n) replaces M(n-1) | Executor / manager | Makes compaction recurrent |
| DF-P07 | Primary End-to-End | BEH-006 | Follow-up with valid v5 snapshot | Exact finalized context restored | Snapshot bootstrapper / manager | Normal resume authority |
| DF-P08 | Primary End-to-End | BEH-004 | Typed artifact-origin query | Direct/root response with status | Lineage resolver | Makes lineage usable |
| DF-P09 | Primary End-to-End | BEH-001, BEH-007 | External runtime activity | Evidence recorded, external semantics unchanged | External runtime recorder | Prevents false authority |
| DF-P10 | Primary End-to-End | BEH-002, BEH-003, BEH-005, BEH-008, BEH-009 | Final no-tool response triggers compaction | Completed turn compacted immediately | `LlmPhase`; executor; manager | Covers real immediate path |
| DF-P11 | Primary End-to-End | BEH-010 | Work Evidence request | Regenerated package returned | `AgentWorkTraceProjectionService` | In-scope product rendering change |
| DF-S02 | Secondary | BEH-006 | Server startup finds pre-lineage derived-state files | Required reset succeeds before agent runtime | Startup app-data migration | Established pre-runtime transition path |
| DF-S03 | Secondary | BEH-008 | Compaction phase change | Observer receives lifecycle event | Executor/reporter | Preserves operation observability |
| DF-R01 | Return-Event | BEH-008 | Runner/parser failure | No writes; same pending ID retries | Executor | Reachable consistency boundary |
| DF-R02 | Return-Event | BEH-001 | Active rewrite invalidates cursor | `EXPIRED` and UI reload | Active page policy | Prevents archive crossover |
| DF-L01 | Bounded Local | BEH-002, BEH-005, BEH-009 | Baseline WorkingContext | Exact M(n-1)+R(n) plan | Structured planner | Governs the cut and raw refs |
| DF-L02 | Bounded Local | BEH-003, BEH-008, BEH-009, BEH-011 | Rendered input plus built-in prompt policy | IDless content/selection/execution proposal with natural LLM-chosen item counts and no count loss | Structured strategy; system-prompt policy owner | Separates LLM semantic judgment, application structural safeguards, and publication identity; launch/provider configuration is unchanged |
| DF-L03 | Bounded Local | BEH-005, BEH-006 | Optional current output/continuation/current input | Canonical finalized messages with message-local constituent ranges | Context finalizer | Prevents provider repair and false origin |
| DF-L04 | Bounded Local | BEH-002, BEH-003, BEH-005, BEH-008 | Valid IDless proposal and unchanged baseline | Manager-assigned accepted candidate; archive/output/new lineage head/context/message snapshot current | `MemoryManager`/internal committer | Centralizes identity, validation, and publication |
| DF-L05 | Bounded Local | BEH-004 | Producing lineage record | Cycle-safe direct/root origin | Lineage resolver | Preserves direct vs transitive |
| DF-L06 | Bounded Local | BEH-006 | Discovered standalone/team-member run directory | Exactly four obsolete derived-state files removed; raw evidence unchanged | Startup reset migration | Confines transition knowledge and keeps runtime current-only |
| DF-L07 | Bounded Local | BEH-001 | Active snapshot/cursor | Valid or expired page | Active page policy | Stable active-only paging |
| DF-L08 | Bounded Local | BEH-009, BEH-011 | Planned logical prefix | Reuse `WorkingContextFinalizer` over selected visible messages to restore canonical user turns -> render one bounded history-only message with canonical User/Assistant/Tool turns, no constituent-created consecutive `User:` labels, and no duplicate JSON/sizing policy | Compaction conversation renderer/prompt builder using the existing canonical-context boundary | Correct LLM-facing history without duplicating user-composition policy |
| DF-L09 | Bounded Local | BEH-009, BEH-010 | Tight tool input + bound | Consumer-neutral tool body | Core condensed renderer | One shared readable policy |

## Primary Execution Spine(s)

```text
DF-P04 / DF-P06
Policy/request preparation
-> MemoryManager pending compaction identity
-> PendingCompactionExecutor
-> WorkingContextMessageWindowPlanner (M(n-1) + R(n))
-> CompactionConversationHistoryRenderer
-> built-in Memory Compactor system policy + unchanged launch/provider configuration
-> configured compactor runner
-> parser/normalizer without item-count caps
-> proposal
-> MemoryManager.prepareAcceptedCompaction
-> validator
-> MemoryManager.commitAcceptedCompaction
-> completed raw archive + output rows + lineage record appended as current head
-> finalized WorkingContext + message-only v5 snapshot
-> provider renderer/dispatch
```

```text
DF-P10
Provider final no-tool response
-> LlmPhase raw/context ingestion
-> policy creates pending compactionId
-> same proposal/accept/commit spine
-> completed lifecycle without another provider dispatch
```

```text
DF-P08
Explicit run/member scope + typed artifact ref
-> server memory-location boundary
-> CompactionLineageResolver
-> lineage store/output membership
-> archive manifest/read
-> recursive previousCompactionId traversal
-> direct/root origin response
```

```text
DF-P11
Work Evidence caller
-> AgentWorkTraceProjectionService
-> archive-plus-active source reader
-> historical replay correlation
-> Work-Evidence adapter
-> core CondensedToolCallRenderer/readable-value policy
-> timestamped Markdown/files/manifest
```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DF-P04/DF-P06/DF-P10 | Executor holds the existing operation identity; strategy turns a deterministic logical prefix into an IDless complete proposal; manager accepts and publishes it as one recurrent state transition | pending compaction, selection plan, proposal, accepted compaction, current output, finalized context | Executor lifecycle; `MemoryManager` state | compactor launch/reporting, hashes, file I/O |
| DF-P03 | Request assembler asks manager to append/finalize current input, snapshots the exact provider-neutral form, then calls the provider renderer | current input, canonical context, snapshot, provider request | Request assembler / manager boundary | provider wire encoding |
| DF-S02 | Reset migration returns itemized status; runner persists all attempted required results and throws on non-startable status; `startConfiguredServer` rethrows before bootstrap/build/listen | run directory, reset targets, migration status, startup promise | Reset migration / runner / `startConfiguredServer` | filesystem discovery, retry/logging |
| DF-P07 | Bootstrap directly validates and installs schema-v5 messages; lineage-head lookup remains separate from snapshot restore | snapshot messages, message-local ranges, lineage head | Snapshot bootstrapper / lineage repository | tool-protocol repair, integrity checks |
| DF-P08 | Resolver starts from explicit scope/kind/ID, proves output membership, reads direct archive membership, walks prior compactions with a visited set, and reports completeness | artifact ref, lineage records, archive files, origin result | Lineage resolver | authorization/redaction, integrity hashes |
| DF-P11 | Projection retains raw replay/file ownership but delegates only visible-value and tool-body formatting to core | raw events, replay events, condensed body, Markdown package | Work Trace projection service | regeneration/cleanup |
| DF-P02 | Event Monitor always reads one active-file generation and expires cursors after active rewrite | active trace, cursor, UI page | Local projection provider | paging limits |
| DF-R01 | Runner/parser rejection returns before acceptance; executor reports failure and retains the same pending identity for the next normal entry | failure, pending compaction | Executor | diagnostics |

## Spine Actors / Main-Line Nodes

- `LLMRequestAssembler`
- `LlmPhase` post-response compaction trigger
- `MemoryManager`
- `PendingCompactionExecutor`
- `WorkingContextMessageWindowPlanner`
- `StructuredJsonCompactionStrategy`
- `CompactionConversationHistoryRenderer`
- built-in Memory Compactor system prompt
- compactor runner/parser/normalizer
- `AcceptedCompactionCommitter` behind `MemoryManager`
- `WorkingContextFinalizer`
- snapshot serializer/store/bootstrapper
- startup app-data reset migration
- `CompactionLineageStore` / file implementation
- `CompactionLineageResolver`
- raw-trace archive manager
- `AgentWorkTraceProjectionService`
- `AgentWorkTraceRenderer`
- core readable presentation renderers

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `PendingCompactionExecutor` | pending-operation lifecycle, request a baseline from `MemoryManager`, pass only the strategy input to the strategy, retain the manager-produced baseline for acceptance, reachable retry/reporting, calls into accepted-state boundary | lineage lookup, stores, raw archive internals, direct context mutation |
| built-in Memory Compactor `agent.md` | concise origin/personal-style natural summarization task, exact JSON response contract, and quality-first semantic policy | per-operation conversation history, model/runtime selection, output IDs, structural acceptance, or persistence |
| structured compaction strategy | planning, history-only operation-message construction, runner call, exact parser/normalizer, IDless content/selection/execution proposal | stable system-prompt task/semantic/schema policy, launch budgeting, output-ID assignment, baseline lineage-head lookup, accepted candidate construction, durable writes, snapshot, arbitrary historical retrieval |
| `MemoryManager` | sole live context mutation, pending identity, compaction-baseline WorkingContext/lineage-head capture and later verification, deterministic output-ID assignment, previous-head-to-lineage mapping, accepted candidate construction/validation, commit entrypoints, final installed state | provider wire, Event Monitor, recursive origin response |
| `AcceptedCompactionCommitter` | manager-internal normal publication sequence and store coordination | public lifecycle, retry policy, LLM calls |
| `WorkingContextFinalizer` | pure provider-neutral section coalescing, message-local range construction, raw provenance preservation, and tool/message validation | persistence, provider encoding, content selection |
| current-output loader/projector | load the exact output IDs listed by the lineage head and project one bounded memory region; return no bundle when lineage is absent/empty | ranking across history, historical-row decoding, or persisting a second current state |
| startup app-data reset migration | discover run directories, delete exactly four obsolete derived-state files, preserve raw evidence, record/retry outcomes | parsing removed content, runtime restore, lineage creation |
| lineage persistence | immutable direct records, exact output membership lookup, and append-order current-head lookup | content generation, ancestry traversal |
| lineage resolver | typed direct/root origin query, cycle/dedup/completeness/integrity semantics | mutation or source guessing |
| archive manager | exact selected record validation, one completed file, manifest lookup/read | lineage meaning |
| snapshot bootstrapper | schema-v5 direct message restore with message-local range/tool/media validation | Event Monitor, historical-format decode/reset, or generic disaster recovery |
| `CondensedToolCallRenderer` | deterministic visible serialization/redaction/bounds and body grammar | source lookup/correlation, envelope, IDs, timestamps |
| Work Evidence service/renderer | archive+active source enumeration, correlation, timestamped Markdown/file/manifest envelope | compaction selection/current context |
| provider renderer | provider-specific final wire/tool/media mapping | adjacent-user repair or memory selection |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MemoryManager.prepareAcceptedCompaction` / `commitAcceptedCompaction` | Manager context/state boundary and internal committer | Gives executor one authoritative accepted transition API | repository/path/file sequencing in executor |
| server `AgentMemoryOriginService.resolve` | core `CompactionLineageResolver` plus server memory-location service | Converts explicit product target to correct run-local store | guessed paths, GraphQL/UI policy, generic ID search |
| `WorkingContextCompactionStrategy.propose` | concrete structured strategy | Keeps registry/resolver pluggability while enforcing side-effect-free output | publication |
| `AgentWorkTraceProjectionService.generate` | source reader/renderer/store | Preserves current Work Evidence entrypoint | native compaction orchestration |

## Removal / Decommission Plan (Mandatory)

Rows marked `Implemented SR-004` are delivered cumulative cleanup. The final row is the only pending decommission set for SR-010.

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| strategy calls to `MemoryStore.add` and `pruneRawTracesById` | Violated proposal/commit ownership and pre-write failure proof | `MemoryManager` + `AcceptedCompactionCommitter` | Implemented SR-004 | Store dependency removed from strategy |
| top-K `Retriever` inside `CompactedMemoryContextProjector` for normal current projection | Mixed outputs across successful compactions | `CurrentCompactionOutputLoader` + explicit bundle projector | Implemented SR-004 | Retriever may remain for unrelated general recall only |
| planner exclusion of `compacted_memory` | Broke recurrent semantics | constituent-aware unit builder/planner | Implemented SR-004 | Prior memory is selected logically and never added to raw archive refs |
| `Assistant work notes`, call-ID prompt lines, whole-line prefix clamp | Leaked reasoning/backend details and lost suffix silently | conversation renderer + core per-value renderer | Implemented SR-004 | No second condenser |
| singular `episodic_summary` result and old response aliases | Conflicted with exact target schema | exact `episodes` parser/result/normalizer | Implemented SR-004 | Clean-cut response contract |
| loose `message-provenance.ts` shape | Could not model composed user sections tightly | `working-context-provenance.ts` discriminated types/ranges | Implemented SR-004 | Current readers/writers use one message-local shape |
| `CompactedMemorySchemaGate`, semantic clear/replace helpers, compacted-memory manifest model/constant/export/store APIs, and all historical snapshot/row readers | Conflicted with current-only lineage/output authority | startup reset migration + schema-v5 message validators + lineage-head output loader | Implemented SR-004 | Code/tests/APIs removed; migration owns obsolete persisted filenames |
| new-output `EpisodicItem.turnIds` and semantic `reference`/`tags` handling | Loose unscoped metadata was not target lineage | exact current-schema models/readers/writers | Implemented SR-004 | Pre-lineage row files are removed; no tolerant reader remains |
| v1-v4 snapshot restore/rebuild | v5 is sole current schema | startup reset + v5 bootstrapper | Implemented SR-004 | Pre-v5 snapshots are deleted before runtime |
| complete archive-plus-active raw recovery and textual tool reconstruction | Replayed already compacted history and weakened tool structure | no-memory startup after reset or exact schema-v5 direct restore | Implemented SR-004 | Tool repair remains only for valid v5 context |
| `autobyteus-server-ts/.../agent-work-trace-redactor.ts` | Duplicated redaction and silently truncated prefixes | core readable-value/condensed renderer | Implemented SR-004 | Server adapter retains Work Evidence envelope |
| provider-side adjacent-user semantic repair | Canonical state must equal snapshot and rendered meaning | `WorkingContextFinalizer` before both | Implemented SR-004 | Provider-specific wire mapping remains provider-owned |
| fixed 1–3 episode, 20-fact, and per-category/member caps plus duplicated operation policy | Conflicts with user-approved natural semantic sizing and truthful prompt audit | exact `agent.md`; history-only builder; uncapped parser/normalizer/accepted/lineage structural validators | Pending SR-010 | Retain at least one episode and every non-cardinality invariant; new records audit prompt contract 2 |

## Return Or Event Spine(s) (If Applicable)

- **DF-R01:** runner/parser error -> executor failure classification/report -> caller abort/diagnostic -> pending state remains -> next normal request re-enters DF-P04. No acceptance API is called.
- **DF-R02:** completed archive rewrites active generation -> later Event Monitor page detects generation mismatch -> returns `EXPIRED` -> UI reloads latest active view.

DF-S03 remains a **secondary** observability spine: executor phase change -> `CompactionRuntimeReporter` -> existing runtime event transport -> observer. It uses the same `compactionId`; the reporter never creates an identity.

## Bounded Local / Internal Spines (If Applicable)

| Spine | Parent Owner | Arrow Chain | Why It Matters |
| --- | --- | --- | --- |
| DF-L01 | Structured planner | context -> constituent units -> protect systems/live tool suffix -> budget retained suffix -> select optional compacted-memory region by kind/range + natural prefix -> require raw-backed R(n) -> plan; manager retains lineage head separately | Separates logical prior memory from archive-eligible new activity |
| DF-L02 | Structured strategy | plan -> render exactly one history-only operation message -> apply built-in natural task/schema/quality system policy under unchanged launch/provider configuration -> runner -> exact all-entry parse -> cleanup/deduplicate/noise-filter/positive-salience normalize without count caps -> IDless proposal | Ensures semantic counts are model-decided while application structure, output identity, and accepted state remain separately owned |
| DF-L03 | `MemoryManager` via finalizer | optional current output + continuation/current input -> compatible user coalescing -> message-local ranges/raw provenance/media -> tool validation | Makes one canonical state for snapshot, later planning, and render |
| DF-L04 | `MemoryManager` plus internal committer/lineage store | verify pending/head -> assign IDs/map head to predecessor/build accepted candidate (new prompt audit value 2) -> exact archive -> output rows -> normalize/append lineage with natural-count membership -> read head/exact output -> install context -> v5 snapshot -> clear pending | One normal acceptance/publication sequence behind one owner; no post-output count rejection |
| DF-L05 | Resolver | prove artifact membership -> direct archive -> previous record -> visited set -> dedupe -> intervals/status | Keeps records direct and queries recursive |
| DF-L06 | Startup reset migration | discover run -> remove four obsolete derived files -> preserve raw evidence -> record status -> retry/block on failure | Handles the one approved persisted-data transition outside runtime |
| DF-L07 | Active page policy | active snapshot/generation -> cursor validation -> page or expired | Keeps UI active-only |
| DF-L08 | Conversation renderer | planned units -> flatten visible messages -> `WorkingContextFinalizer` canonical turns -> common values/tool bodies -> labels/order -> escape -> one XML boundary | Makes the history semantically natural without duplicating user-composition policy |
| DF-L09 | Core presentation | tight input -> derive status -> serialize/redact -> head/tail bound -> body | Prevents duplication without merging consumer orchestration |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| runtime/model execution metadata | DF-P04, DF-P06, DF-P10 | accepted compaction | Capture resolved runtime/model/provider identity and policy/prompt versions | Audit derivation context | Strategy or LLM could invent storage metadata |
| lifecycle reporting | DF-S03, DF-R01 | executor | existing started/completed/failed events | Observability | Reporter could become operation owner |
| authorization/scope resolution | DF-P08 | server origin service | resolve explicit standalone/team-member target to allowed memory location | Tenant/member isolation | Core resolver could infer paths or authorization |
| canonical hashing | DF-L04, DF-L08 | lineage store/renderer | optional rendered-input and record integrity hashes | Verification only | Hash could be mistaken for evidence relation |
| redaction | DF-L08, DF-L09, DF-P11 | core presentation | remove sensitive/backend text before length budgeting | Consistent safe display | Consumer-specific divergent leakage |
| provider wire translation | DF-P03–DF-P06 | provider renderer | encode finalized context | Providers differ | Renderer could repair semantic context invisibly |
| paging limits/generation | DF-P02, DF-R02 | active projection | bounded active pages and stale cursor detection | UI consistency | UI could start reading archives |
| generated artifact cleanup | DF-P11 | Work Evidence store | replace/regenerate derived package | Files are derived | Cleanup could delete raw authority |
| startup reset filesystem scanner/remover | DF-S02, DF-L06 | app-data migration | discover standalone/team-member runs, delete four exact derived filenames, preserve raw evidence, report outcomes | Clean current runtime epoch | Broad deletion or startup continuation after failure could corrupt/mix state |

## Ownership Boundaries

1. **Request/lifecycle to accepted state:** executor may ask a strategy for a proposal and ask `MemoryManager` to accept/commit it. It never coordinates files.
2. **LLM/strategy content to application identity:** `agent.md` defines the complete concise natural task plus stable JSON/quality policy; the operation user message supplies only rendered canonical history turns; parser/normalizer preserve every structurally valid entry while enforcing per-entry/cleanup rules; and the strategy returns content plus input selection only. `MemoryManager` acceptance derives episode/semantic IDs deterministically from `compactionId` and stable output order and creates the accepted relation/context candidate without cardinality policy. Lineage normalization validates relation structure, not semantic item maxima; it preserves the supported producing prompt audit value.
3. **Live context to persistence:** only `MemoryManager` installs/replaces/finalizes `WorkingContext`. Snapshot store serializes the installed candidate; it does not choose or repair it.
4. **Lineage record to evidence content:** lineage stores direct references. Archive manager owns raw membership/content; episodic/semantic stores own derived content.
5. **Product target to filesystem scope:** server memory-location services map explicit standalone or team-member target identities to the correct memory root. The core resolver receives an already explicit scope/store; it never parses an absolute path into identity.
6. **Shared presentation to consumer envelope:** core owns safe bounded visible body; compaction owns logical selection/XML/task; Work Evidence owns raw correlation/timestamps/Markdown/files.
7. **Canonical context to provider wire:** provider renderers translate but do not merge semantic user sections or select memory.
8. **Pre-lineage persisted data to current runtime:** the startup migration owns the only historical filename knowledge and deletes those derived files before bootstrap. `AppDataMigrationRunner.runPending()` owns required-startup success enforcement and throws after persisting results if any required definition ends in a non-startable status; the actual `startConfiguredServer` caller logs and rethrows the runner failure before `bootstrapBuiltInAgents`, `buildApp`, or `app.listen`. Normal current loaders never inspect or guess from old files.
9. **Stable compactor policy to one operation:** the built-in system prompt owns the complete concise natural task and exact JSON/semantic quality; `WorkingContextFinalizer` remains the one canonical user-composition owner; the operation renderer reuses that boundary over selected visible messages and byte-emits only canonical history turns, never one composed user turn as consecutive `User:` labels; parser/normalizer own structural/non-cardinality cleanup; and acceptance owns application invariants. Launch/provider output-token configuration remains unchanged. None may duplicate another layer's concern or reintroduce cardinality policy.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MemoryManager` accepted-compaction API | ID assignment, baseline-head validation, finalizer, internal committer, snapshot coordination | executor, bootstrap/install paths | strategy/executor calling raw/memory/lineage/snapshot stores | enrich accepted candidate/result types, not caller-side coordination |
| `CompactionLineageStore` | append-only successful-record file, output lookup index/scan, efficient tail lookup | committer, resolver, current-output loader | direct JSON/file writes | add singular typed methods |
| `RawTraceArchiveManager.archiveExact` | selected-ID validation, completed file/manifest creation/read | committer/resolver | lineage or strategy fabricating filenames/membership | return a typed completed descriptor |
| `WorkingContextFinalizer.finalize` | user compatibility, natural retained/current framing, message-local range/raw/media provenance, and canonical user-turn reconstruction from selected constituent messages | manager, bootstrapper, and compaction conversation renderer | provider/compaction renderer inventing connector text or concatenation policy | add a focused pure selected-message input if the existing method is too broad; do not duplicate composition rules |
| `AppDataMigrationRunner.runPending` | ordered required-startup migration execution, durable status, and startability decision | `startConfiguredServer` | server runtime interpreting individual migration details or continuing after required failure | return statuses on success; persist failure details then throw one typed required-migration failure |
| `ResetPreLineageMemoryAppDataMigration.execute` | discover run directories, delete exact derived-state targets, preserve raw evidence, report retryable outcome | server startup migration runner | runtime reader fallback, broad directory deletion, raw-trace mutation | keep filename/scanning policy inside migration-owned files |
| `CondensedToolCallRenderer.render` | serialization/redaction/bounds/body grammar | compaction and Work Evidence adapters | consumer-local clipping/body format | extend tight options only when common |
| built-in Memory Compactor definition | stable `agent.md` JSON/quality policy | server compactor launch path | operation prompt redefining policy, code enforcing hidden item counts, or ticket-specific token configuration | revise the canonical prompt and focused structural validators, not launch configuration or a new policy service |
| `AgentMemoryOriginService.resolve` | product target authorization/location and core resolver construction | future internal callers | caller passing arbitrary memory path | split explicit target union further |

## Dependency Rules

Allowed direction:

```text
server product target/location
  -> autobyteus-ts lineage interfaces/resolver
     -> run-local lineage/archive/memory stores
```

```text
request/lifecycle
  -> PendingCompactionExecutor
     -> proposal-only strategy
     -> MemoryManager accepted-state boundary
        -> manager-internal committer
           -> raw archive + output + lineage + snapshot stores
```

```text
compaction adapter --------\
                            -> autobyteus-ts presentation
Work Evidence adapter -----/
```

Forbidden:

- `autobyteus-ts` importing `autobyteus-server-ts`;
- strategy or executor directly writing archive/memory/lineage/snapshot files;
- strategy assigning produced artifact IDs or building an accepted lineage/context candidate;
- normal projection using top-K retrieval when a lineage head exists;
- runtime restore/projection using Retriever or historical rows/snapshots, or appending lineage before referenced output exists;
- snapshot bootstrap reaching through `MemoryManager.store`; current-output reads use an injected focused loader, while `MemoryManager` remains the install boundary;
- resolver scanning both artifact lists through one ambiguous ID or guessing scope/path;
- lineage duplicating raw IDs, prompt, message, memory, media, tool output, or archive boundary key;
- finalizer importing provider renderers;
- provider renderers repairing adjacency or choosing compacted memory;
- Work Evidence reading `WorkingContext`, or compaction reading generated Markdown;
- common renderer looking up/correlating raw/tool records or adding timestamps/XML/Markdown/files;
- old snapshot/result/provenance shapes or tolerant historical dictionaries entering current runtime through aliases or fallback;
- operation prompts duplicating the stable JSON/sizing policy from `agent.md`; or
- parser, normalizer, or acceptance silently truncating/rejecting valid output by episode, total-fact, or category count.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `MemoryManager.captureCompactionBaseline()` | compaction attempt baseline | atomically expose the strategy input and the application-owned lineage-head baseline before strategy invocation | current pending `compactionId` + explicit lineage scope | executor may retain the returned baseline but passes only its strategy-input portion to `propose`; strategy never sees the lineage-head field |
| `WorkingContextCompactionStrategy.propose(input)` | compaction proposal | plan/render/run/parse/normalize without writes or produced IDs | baseline context + pending operation execution context | returns IDless content, selected R(n), retained continuation, and execution metadata; manager retains baseline lineage head separately |
| `MemoryManager.prepareAcceptedCompaction(baseline, proposal)` | accepted candidate | verify pending state and unchanged lineage head, map head to `previousCompactionId`, assign output IDs, build/finalize/validate lineage/context candidate | manager-produced baseline + current pending `compactionId` + explicit lineage scope | pure/in-memory until commit; rejects a baseline from another operation/scope |
| `MemoryManager.commitAcceptedCompaction(candidate)` | accepted transition | validate baseline and run normal publication sequence | same pending ID and expected previous-head ID captured in candidate | returns installed context and newly appended lineage head |
| `RawTraceArchiveManager.archiveExact(input)` | completed archive | assert exact selected IDs and return manifest descriptor | non-empty raw ID set + internal boundary key | boundary key never leaves archive layer |
| `CompactionLineageStore.appendNext(expectedPreviousCompactionId, record)` | immutable lineage and current-head transition | verify the observed tail equals the manager-captured expected predecessor, verify the record carries that same predecessor, then append exactly one schema-v1 successful record | explicit `CompactionLineageScope` + unique `compactionId` | rejects duplicate ID, changed/forked predecessor, or missing referenced output |
| `CurrentCompactionOutputLoader.loadCurrent()` | current M(n) | return null when lineage is absent/empty; otherwise load exact episode/semantic rows listed by the tail record and return one projection bundle | run-local store/scope/lineage tail | no ranking or historical fallback; bundle IDs exactly match lineage lists |
| `CompactedMemoryContextProjector.project(input)` | projected compacted-memory region | render one lineage-head output bundle as a compacted-memory message region without copying its compaction/content IDs into the message | current-output bundle + continuation | no source selection, ranking, or message-level output-ID arrays |
| `WorkingContextFinalizer.finalize(input)` | canonical context or selected-prefix canonical turn sequence | coalesce compatible adjacent user sections, apply natural framing, and emit/preserve message-local ranges plus raw-backed provenance | typed memory/retained/current sections or planner-selected constituent messages | pure deterministic; no lineage lookup; renderer uses this boundary rather than reconstructing connectors itself |
| `WorkingContextSnapshotSerializer.serialize/deserializeV5` | snapshot v5 | exact finalized message and message-local constituent round-trip | v5 messages with typed message-local ranges | contains no compaction/output/current-state identity |
| `AppDataMigrationRunner.runPending()` | startup transition gate | execute all `requiredOnStartup` definitions, persist each result, and refuse startup when any required result is not startable | ordered registry definitions + durable migration records | `SUCCEEDED` and existing `SUCCEEDED_WITH_WARNINGS` are startable; `ResetPreLineageMemoryAppDataMigration` must return `FAILED`, never warnings, when any target discovery/deletion fails; throw after records/logs exist |
| `ResetPreLineageMemoryAppDataMigration.execute()` | startup reset | delete exactly four derived-state filenames across discovered runs and report itemized results | configured memory root + migration ID | idempotent; must not touch raw evidence |
| `CompactionLineageResolver.resolve(input)` | origin response | typed direct/root traversal | explicit scope + artifact kind (`episode` or `semantic`) + ID | no generic ID |
| `CondensedToolCallRenderer.render(input, options)` | readable Tool body | safe deterministic body | tight discriminated outcome + per-value bound | `no_outcome` -> exact `result: not available` |
| `AgentMemoryOriginService.resolve(input)` | product-scoped origin | authorize/locate then delegate | explicit standalone run or team member target + artifact ref | internal service only in this ticket |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| strategy `propose` | Yes | Yes | Low | No store dependency or produced IDs |
| manager accept/commit | Yes | Yes | Low | Candidate captures expected pending/current baseline |
| archive `archiveExact` | Yes | Yes | Low | Reject missing/extra selected records |
| lineage append/head | Yes | Yes | Low | Last successful record is current; reject forked predecessor and duplicate ID |
| origin resolver | Yes | Yes | Low | Kind and scope mandatory |
| startup reset migration | Yes | Yes | Low | Exact four-file deletion boundary; no content decoder |
| compacted-memory projector | Yes | Yes | Low | Accept one lineage-head output bundle and emit message text/ranges without output IDs |
| context finalizer | Yes | Yes | Low | Typed message-local ranges and raw provenance; no lineage identity |
| v5 serializer | Yes | Yes | Low | Round-trip finalized messages/ranges only; no current state |
| condensed renderer | Yes | Yes | Low | Terminal status derived, not independently supplied |
| server origin service | Yes | Yes | Low | Two explicit product target variants; no arbitrary path |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| original activity | `RawTraceItem` / raw trace | Yes | Low | Do not call it raw memory |
| successful relation | `CompactionLineageRecord` | Yes | Low | Do not introduce WorkEvidenceSnapshot, generation, activity, or segment IDs |
| current selection | lineage tail / current head | Yes | Low | Last successful record is current; do not add a second mutable selector |
| LLM result before writes | `WorkingContextCompactionProposal` | Yes | Low | Reserve “accepted” for application-enriched candidate |
| composed logical region | `UserConstituent` | Yes | Low | Use section kind, not generic metadata blobs |
| compacted-memory message region | `UserConstituent(kind: "compacted_memory")` | Yes | Low | Structural range only; compaction/output IDs stay in lineage |
| persisted-data transition | `ResetPreLineageMemoryAppDataMigration` | Yes | Low | Names the exact disposable subject and pre-runtime owner |
| completed raw source | `rawTraceArchiveFile` | Yes | Low | Value is existing manifest `file_name`, never absolute path |
| shared tool body | `CondensedToolCallRenderer` | Yes | Low | It is not a tool condenser agent or Work Evidence renderer |
| origin query selector | `MemoryArtifactRef` | Yes | Low | Keep kind discriminant |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| exact raw archiving | `RawTraceArchiveManager` | Reuse unchanged | Implemented SR-004 owner of exact immutable files/manifest | N/A |
| live context/pending identity | `MemoryManager` | Reuse unchanged | Implemented authoritative state/acceptance owner | N/A |
| strategy registry/selection | compaction strategy registry | Reuse | Pluggability remains valid after API changes | N/A |
| current output loading | `CurrentCompactionOutputLoader` plus projection bundle | Reuse unchanged | Implemented exact lineage-tail output loading already separates selection from formatting | N/A |
| lineage persistence/resolution | `memory/lineage` plus `FileCompactionLineageStore` | Extend in place | Implemented relation/current-head/traversal owners exist; only record membership and prompt-audit value domains change | N/A |
| canonical user composition | `WorkingContextFinalizer` | Reuse at compactor-view boundary | Implemented pure cross-provider composition owner already governs context/snapshot/provider messages | N/A |
| readable values/tools | `memory/presentation` core renderers | Reuse unchanged | Implemented tight shared value/Tool capability already serves both consumers with separate sources/envelopes | N/A |
| compactor semantic/output policy | built-in Memory Compactor template (`agent.md`) | Extend in place | This is the persisted canonical child-agent system contract used by every normal server compaction | N/A |
| persisted-data reset | server app-data migrations | Reuse unchanged | Implemented required reset/runner/startup path already fails closed | N/A |
| product scope/path | `AgentMemoryLocationService` | Reuse | Already understands standalone/team layout | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory/compaction` | planning, operation rendering adapter, runner/parser/normalizer, proposal, executor | DF-P04–P06, P10, DF-R01, DF-L01/02/08 | executor/strategy | Refactor | No persistence; no stable system-policy duplication or item-count caps |
| server built-in Memory Compactor template | exact JSON/quality system policy from `memory-compactor-prompt-content-contract.md` | DF-P04–P06, P10, DF-L02 | built-in agent definition | Modify | Existing capability; no new runtime owner; `agent-config.json` and launch/provider settings remain unchanged |
| `memory/context` (existing root WorkingContext files) | typed message-local constituent ranges/raw provenance and finalization | DF-P03–P07, DF-L03 | `MemoryManager` | Extend | Keep close to WorkingContext; no derived-memory IDs |
| `memory/lineage` | scope, successful records, persistence/current-head contract, resolver/result | DF-P08, DF-L04/05 | manager/resolver | Focused extension | Already implemented; remove the record-level count maximum and support prompt audit values 1/2 |
| `memory/store` | current file implementations, raw archive, exact output lookup, snapshot | DF-L04/05 | manager/bootstrap/resolver | Reuse + verify | Existing store normalizes append/read; cover natural membership and mixed audit versions through it |
| `memory/projection` | explicit current-output load and one current bundle projection | DF-P03–P07 | manager/bootstrap | Reuse + verify | Exact-tail selection already implemented; prove all natural membership survives |
| `memory/restore` | schema-v5 direct restore only | DF-P07 | bootstrapper | Reuse unchanged | No old-schema decode or complete-corpus fallback |
| `memory/presentation` | safe visible values and condensed Tool body | DF-L08/09, DF-P11 | both adapters | Reuse unchanged | Tight concern-neutral core already implemented |
| server `app-data-migrations` | one-time deletion of obsolete derived state | DF-S02, DF-L06 | server startup | Reuse unchanged | Implemented historical-file owner; no content decoder |
| server `agent-work-traces` | raw replay adapter and existing envelope/files | DF-P11 | projection service | Reuse unchanged | Already imports core presentation |
| server memory origin service | explicit product target/location adapter | DF-P08 | internal caller | Reuse + verify | Existing internal facade; no public GraphQL/UI |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `working-context-compaction-proposal.ts` | compaction | strategy/executor boundary | IDless proposal with selected raw IDs, retained messages, normalized content, and execution metadata | One shared boundary model; baseline head remains manager-owned | Yes |
| `accepted-compaction-committer.ts` | compaction | manager internal | normal publication sequence | Sequencing is cohesive and testable | Yes |
| `compaction-conversation-history-renderer.ts` | compaction | prompt adapter | selected constituent messages -> `WorkingContextFinalizer` -> labeled history/XML | Keeps planning granularity from leaking into model-visible turn structure without duplicating composition policy | Yes |
| `working-context-provenance.ts` | context | manager/finalizer | discriminated message/constituent ranges and raw-backed provenance | Shared schema for planner/snapshot/finalizer; no lineage/output identity | Yes |
| `working-context-finalizer.ts` | context | manager | deterministic coalescing/ranges | One pure invariant owner | Yes |
| `compaction-lineage-record.ts` | lineage | persistence/resolver | immutable successful-record structural validation plus supported prompt audit values 1/2; no count maximum | One direct-relation subject | Yes |
| `compaction-lineage-resolver.ts` | lineage | query owner | traversal/status/result | One graph-query owner | Yes |
| `file-compaction-lineage-store.ts` | store | persistence provider | successful-record JSONL plus efficient tail/read/find operations | One physical capability and one truth | Yes |
| `current-compaction-output-loader.ts` | projection | selection owner | lineage tail -> exact output rows | Focused alternative to Retriever | Yes |
| `compacted-memory-projection-bundle.ts` | projection | loader/projector boundary | tight transient lineage-head record plus output-row content | Lets loader validate exact rows while projector emits no IDs into messages | Yes |
| `reset-pre-lineage-memory-app-data-migration.ts` | server migration | startup transition owner | exact run discovery, four-file deletion, raw-evidence preservation, status/retry | Keeps transition out of runtime models/loaders | Yes |
| `readable-value-renderer.ts` | presentation | common | serialization/redaction/head-tail bound | Shared primitive | Yes |
| `condensed-tool-call-renderer.ts` | presentation | common | tool body | Depends on readable value primitive | Yes |
| server Work Evidence renderer changes | Work Evidence | existing renderer | adapt replay tool event to common input | Keeps envelope local | Yes |
| server origin service | memory product adapter | server boundary | target/location -> core resolver | Product identity differs from filesystem | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| user-section ranges and raw provenance | `working-context-provenance.ts` | WorkingContext | planner, finalizer, snapshot, and restore need one message-local shape | Yes | Yes | compaction/output IDs or duplicated constituent content |
| selected compacted-memory content bundle | `projection/compacted-memory-projection-bundle.ts` | projection | lineage-head loader, projector, and message builder share one transient source/content shape | Yes | Yes | second persisted memory/state store |
| compaction proposal/candidate | `working-context-compaction-proposal.ts` | compaction | strategy, executor, manager share transition boundary | Yes | Yes | produced-ID owner or persistence repository |
| lineage scope | `lineage/compaction-lineage-scope.ts` | lineage | record/query/server adapter need same explicit identity | Yes | Yes | filesystem path parser |
| artifact ref/origin result | `lineage/memory-origin-resolution.ts` | lineage | resolver and caller need exact query/result | Yes | Yes | generic mixed artifact response |
| visible serialization/redaction/bounds | `presentation/readable-value-renderer.ts` | presentation | both consumers require identical policy | Yes | Yes | broad event renderer |
| condensed tool body | `presentation/condensed-tool-call-renderer.ts` | presentation | identical grammar/status rules | Yes | Yes | source correlator or envelope |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `CompactionLineageScope` | Yes | Yes | Low | exact target union; no absolute path |
| `CompactionLineageRecord` | Yes | Yes | Low | optional previous ID only; no historical-input variant, raw list/content, or boundary key |
| `MemoryArtifactRef` | Yes | Yes | Low | kind required |
| `WorkingContextCompactionProposal` | Yes | Yes | Low | keep selected raw IDs, retained messages, normalized content, and execution metadata only; baseline head/produced IDs/persistence details remain manager-owned |
| `CompactedMemoryProjectionBundle` | Yes | Yes | Low | transiently carries the lineage-head record and exact content rows; projector does not copy IDs into messages |
| `UserConstituent` ranges | Yes | Yes | Low | validate non-overlap/in-bounds and slice physical message; do not copy text |
| `CondensedToolCallInput` | Yes | Yes | Low | result/error derive status; no_outcome alone accepts status |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-proposal.ts` | compaction | strategy/executor/manager boundary | IDless proposal and manager-built accepted-candidate types | Transition vocabulary is cohesive; produced IDs exist only on the accepted side | lineage/context types |
| `.../working-context-compaction-strategy.ts` | compaction | strategy interface | side-effect-free `propose` contract | Existing abstraction remains | proposal |
| `.../structured-json-compaction-strategy.ts` | compaction | concrete strategy | plan/render/run/parse/normalize proposal | One strategy implementation | planner, renderer, proposal |
| `.../pending-compaction-executor.ts` | compaction | lifecycle | request manager-produced baseline, pass only strategy input to proposal call, return baseline plus proposal to manager acceptance, failure/retry | Existing lifecycle owner; no direct lineage/store read | proposal |
| `.../accepted-compaction-committer.ts` | compaction | manager internal | preserve archive -> output -> lineage -> context -> snapshot order; exercise natural membership through append | Separates file coordination from manager state API | lineage/archive/snapshot |
| `.../compaction-conversation-history-renderer.ts` | compaction | source adapter | flatten selected visible unit messages, reuse `WorkingContextFinalizer` for canonical user turns, then render ordered User/Assistant/Tool history, escaping, and one XML boundary | Consumer-specific envelope; one `User:` label per canonical turn; owns no connector wording | finalizer + common presentation |
| `.../working-context-compaction-prompt-builder.ts`; `autobyteus-ts/src/memory/index.ts` | compaction | history-only operation-message adapter and public export | return exactly one complete canonical-turn rendered history with no static prefix/suffix; remove `COMPACTION_RESULT_SHAPE` and its unused public export | Per-operation source payload remains separate from stable system policy | conversation renderer |
| `.../compaction-result.ts`, parser, normalizer | compaction | output structure and cleanup | exact fields, all-entry parse, existing per-entry bounds, deduplication/noise filtering, deterministic ordering, positive salience; no item-count caps | Existing cohesive files; no new result field | N/A |
| `.../accepted-compaction-builder.ts` | compaction | manager acceptance helper | require at least one episode, validate accepted references/structure without count maxima, and write current prompt contract version 2 | Existing acceptance boundary | proposal/lineage/context types/current prompt-version constant |
| `.../working-context-message-unit.ts`, builder, planner | compaction | selection | constituent-aware logical units and R(n) cut | Existing planning capability | context provenance |
| `autobyteus-ts/src/memory/working-context-provenance.ts` | context | shared schema | discriminated single/composed message-local provenance and ranges | One authoritative type model for planner/finalizer/snapshot; no compaction/output IDs | N/A |
| `.../working-context-finalizer.ts` | context | canonical composition boundary used by `MemoryManager`, bootstrap, and compaction rendering | canonical adjacent-compatible user composition and natural retained/current framing | Singular invariant reused rather than reimplemented | provenance |
| `.../memory-manager.ts` | context/state | authoritative boundary | pending identity, baseline-head capture/verification, accept/commit/install/finalize | Existing governing owner | committer/finalizer |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-scope.ts` | lineage | identity | runtime-neutral explicit scope union | Reused without paths | N/A |
| `.../lineage/compaction-lineage-record.ts` | lineage | record model | immutable direct record; retain structural/uniqueness/scope/predecessor/time/execution/integrity checks; remove only upper membership counts; accept/preserve prompt contract values `1` and `2` and export current value 2 | Historical relation subject and producing-contract audit authority | scope |
| `.../lineage/compaction-lineage-store.ts` | lineage | persistence interface | append-next/read-head/read-by-ID/find-output methods | One capability contract; head derives from successful-record order | record |
| `.../lineage/memory-origin-resolution.ts` | lineage | query contract | artifact ref, status, direct/root response | Shared typed boundary | scope |
| `.../lineage/compaction-lineage-resolver.ts` | lineage | query owner | membership, manifest, traversal, integrity | One cycle-safe algorithm | query/store/archive |
| `autobyteus-ts/src/memory/store/file-compaction-lineage-store.ts` | store | provider | append/read normalized successful-record JSONL, tail lookup, output-membership lookup; accept natural membership and mixed prompt versions through the record validator | One physical capability; no second state file | lineage types |
| `.../store/raw-trace-archive-manager.ts` | store | archive boundary | exact archive API and typed completed descriptor | Existing file authority | N/A |
| `.../store/memory-file-names.ts`, `run-memory-file-store.ts`, `file-store.ts`, `base-store.ts` | store | file composition | new lineage filename/store wiring and exact output-row lookup; remove gate/manifest/dictionary-reset/state APIs | Existing storage composition | lineage store |
| `autobyteus-ts/src/memory/models/episodic-item.ts` | memory model | current episodic row | current recognized fields and writer without `turn_ids` | One current row model | N/A |
| `autobyteus-ts/src/memory/models/semantic-item.ts` | memory model | current semantic row | exact current fields only; never emit or tolerate removed historical fields | One current row model | N/A |
| `autobyteus-ts/src/memory/projection/compacted-memory-projection-bundle.ts` | projection | source/projector boundary | transient lineage-head record plus exact output content | One tight validated selection result; not persisted in snapshot | lineage record |
| `.../projection/current-compaction-output-loader.ts` | projection | selection | absent/empty lineage -> null; lineage tail -> exact projection bundle | Selection is not projection text; no historical mode | lineage/content stores |
| `.../projection/compacted-memory-message-builder.ts` | projection | display transform | current projection bundle -> natural bounded compacted-memory content | Existing message wording/grouping owner | projection bundle |
| `.../projection/compacted-memory-context-projector.ts` | projection | pure projector | explicit projection bundle -> memory text/constituent range + continuation, without identity fields | Removes Retriever ownership | projection bundle/finalizer |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | restore | decision owner | schema-v5 message restore or no-snapshot initialization | Existing entrypoint | finalizer |
| `.../restore/working-context-recovery-projector.ts` | restore | current initialization transform | system + active current continuation when no v5 snapshot exists after reset | One bounded current-only transform | finalizer |
| Historical `.../restore/compacted-memory-schema-gate.ts` and its tests | restore | removed in SR-004 | no current file/runtime responsibility | Delivered removal; do not recreate destructive semantic clearing/snapshot deletion | N/A |
| Historical `.../store/compacted-memory-manifest.ts`, `COMPACTED_MEMORY_MANIFEST_FILE_NAME`, public export, and gate-only store APIs | store/restore | removed/decommissioned in SR-004 | no current runtime responsibility; persisted filename knowledge belongs only to startup migration | Delivered removal; no replacement manifest | N/A |
| `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts` | snapshot | v5 schema | exact typed message/message-local-range round-trip | Existing serializer authority; no lineage/output IDs | provenance |
| `autobyteus-ts/src/memory/presentation/readable-value-renderer.ts` | presentation | common | stable serialization, redaction, head/tail omission/count | Primitive shared policy | N/A |
| `.../presentation/condensed-tool-call-renderer.ts` | presentation | common | exact body grammar and status derivation | Tight shared formatter | readable value |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts` | Work Evidence | envelope/adapter | map correlated event, timestamps, Markdown headers, common body | Existing output contract | core renderer |
| Historical `.../agent-work-trace-redactor.ts` | Work Evidence | removed in SR-004 | no current file/runtime responsibility | Delivered removal; shared core presentation is current | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` and config/factory wiring | server launch | scope injection | build explicit lineage scope from run/member context | Launch already owns product identity | scope |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | built-in agent | stable semantic/output policy | exact complete origin/personal-style file content from `memory-compactor-prompt-content-contract.md`; no implementation-authored wording, internal product terminology, duplicate policy, or numeric item counts | One canonical product-managed system contract restored at startup | N/A |
| `autobyteus-server-ts/src/agent-execution/compaction/memory-compactor-agent-launch-resolver.ts` and `server-compaction-agent-runner.ts` | server launch | unchanged execution metadata/configuration | preserve current provider/runtime/model and output-token behavior | Explicit non-change verified by focused coverage | guessed provider strings |
| `autobyteus-server-ts/src/memory-lineage/services/agent-memory-origin-service.ts` | server memory lineage | product facade | explicit target authorization/location then core resolve | Keeps paths/server identity out of core | core resolver |
| `autobyteus-server-ts/src/app-data-migrations/migrations/reset-pre-lineage-memory-app-data-migration.ts` plus focused file-discovery helper | server migration | startup transition | discover standalone/team-member runs, delete four exact derived-state files, preserve raw evidence, report itemized outcomes | Existing migration boundary and retry/log infrastructure | runtime memory models |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | server startup | transition registration | register the reset as `requiredOnStartup` | Existing definition authority | result persistence or server continuation |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-runner.ts` | server startup | required-result enforcement | execute all required definitions, persist every attempted result, preserve existing startable statuses, then throw typed failure when any required result is non-startable | Existing migration lifecycle owner | bootstrap/build/listen |
| `autobyteus-server-ts/src/server-runtime.ts` (`startConfiguredServer`) | server startup | implemented fail-closed caller | await runner, log and rethrow required-migration failure before `bootstrapBuiltInAgents`, `buildApp`, or `app.listen` | Delivered SR-004 production boundary; unchanged in SR-010 | migration-specific deletion/result persistence |

## Explicit Change Inventory

The cumulative ticket contains substantial SR-004 work already delivered. The only pending SR-010 source delta is:

| Change Kind | Pending Files / Areas | Intended Result |
| --- | --- | --- |
| Modify | `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | Copy the exact user-approved natural prompt from `memory-compactor-prompt-content-contract.md`; no fixed item counts or platform terminology |
| Modify / remove unused export | `working-context-compaction-prompt-builder.ts`; `autobyteus-ts/src/memory/index.ts` | Return only the renderer-owned history block and remove `COMPACTION_RESULT_SHAPE` plus its unused export |
| Modify | `compaction-conversation-history-renderer.ts` and focused tests | Reuse `WorkingContextFinalizer` over selected visible messages before labels, preserving assistant/tool/media boundaries and one canonical `User:` turn |
| Modify | `compaction-response-parser.ts`; `compaction-result-normalizer.ts`; `accepted-compaction-builder.ts` | Remove item-count truncation/rejection/category caps; retain schema, per-entry, cleanup, dedupe/noise, positive-salience, and at-least-one-episode invariants; new accepted records use prompt audit value 2 |
| Modify | `compaction-lineage-record.ts` | Remove only upper episode/semantic membership maxima; retain every structural/reference invariant; accept/preserve prompt audit values 1/2 and expose current new-write value 2 |
| Test existing path | `accepted-compaction-committer.ts`; `file-compaction-lineage-store.ts`; current-output projection; origin resolver and their tests | Prove >3/>20 survives output persistence, lineage append/read, exact-head projection, and typed origin lookup; prove a mixed v1->v2 chain reads directly |

The following implemented SR-004 capabilities are preserved rather than added/refactored again: IDless proposal/manager acceptance, exact raw archiving, accepted committer order, lineage store/resolver/tail-as-current, current-output loader/projector, current episode/semantic models, message-local provenance, WorkingContext finalizer and snapshot v5, startup reset/fail-closed server path, core readable-value/Tool renderers, generated Work Evidence adapter, and server origin facade.

## Applied Patterns (If Any)

- **Proposal/accept/commit:** isolates model-generated content from application identity and side effects.
- **Immutable successful-record log with tail-as-head:** `compaction_lineage.jsonl` preserves derivations and its last valid record selects the active output.
- **Direct-edge provenance graph:** records only immediate previous/archive inputs; resolver computes transitive roots.
- **Pure finalizer:** canonical context invariants are deterministic and testable before snapshot/provider render.
- **Source adapter + shared formatter:** compaction and Work Evidence retain separate source/envelope ownership while sharing only the identical readable body policy.
- **Startup migration boundary:** destructive historical cleanup is isolated before agent runtime; current models remain current-only.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/` | Folder | executor/strategy | proposal lifecycle, planning, compactor rendering/output | Existing domain-control area | file repositories, server paths |
| `.../compaction/accepted-compaction-committer.ts` | File | manager internal | normal publication coordination | Closest to compaction transition while hidden behind manager | retry or LLM calls |
| `autobyteus-ts/src/memory/lineage/` | Folder | lineage capability | scope, successful record/head contract, store interface, origin contract/resolver | Meaningful new domain depth | raw/memory content copies |
| `autobyteus-ts/src/memory/store/` | Folder | persistence providers | lineage JSONL, archive/snapshot file operations | Existing provider layer | origin traversal policy |
| `autobyteus-ts/src/memory/presentation/` | Folder | shared off-spine capability | safe readable values and tool bodies | Concern-neutral core reuse | Work Evidence or XML orchestration |
| `autobyteus-ts/src/memory/projection/` | Folder | explicit current projection | load exact current output and project canonical memory | Existing projection capability | top-K or historical selection |
| `autobyteus-ts/src/memory/restore/` | Folder | bootstrap | v5 direct restore and current no-snapshot initialization | Existing lifecycle boundary | old-schema decode, Event Monitor, or current-output ranking |
| `autobyteus-server-ts/src/app-data-migrations/` | Folder | startup transition | versioned one-time derived-memory reset | Existing pre-runtime migration capability | normal memory behavior |
| `autobyteus-server-ts/src/agent-work-traces/services/` | Folder | Work Evidence | raw replay, adapter, timestamped Markdown/files | Existing server product capability | WorkingContext compaction |
| `autobyteus-server-ts/src/memory-lineage/services/` | Folder | server product facade | explicit target/location to core resolver | Server owns product identity and authorization | graph algorithm or public UI |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `memory/compaction` | Main-Line Domain-Control | Yes | Low | Existing area; remove persistence dependencies |
| `memory/lineage` | Main-Line Domain-Control | Yes | Low | Relation/query is distinct from content stores |
| `memory/store` | Persistence-Provider | Yes | Medium | Keep only file mechanics and store interfaces; resolver stays outside |
| `memory/presentation` | Off-Spine Concern | Yes | Low | Exactly two tight files; do not broaden |
| `memory/projection` | Main-Line Domain-Control | Yes | Low | Explicit selection/project only |
| `memory/restore` | Main-Line Domain-Control | Yes | Low | Current-schema restore only |
| server `app-data-migrations` | Secondary Transition | Yes | Low | Historical knowledge confined before runtime |
| server `agent-work-traces` | Mixed Justified | Yes | Low | Existing cohesive product projection/service/store boundary |
| server `memory-lineage` | Transport/Product Adapter | Yes | Low | Small internal facade; no endpoint added |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

### 1. Reference-only lineage and tail-derived current head

```ts
type CompactionLineageScope =
  | { targetKind: "agent_run"; runId: string; memberId: null }
  | { targetKind: "team_member"; runId: string; memberId: string };

type CompactionLineageRecord = {
  schemaVersion: 1;
  scope: CompactionLineageScope;
  compactionId: string;
  previousCompactionId: string | null;
  rawTraceArchiveFile: string;
  episodeIds: string[];
  semanticIds: string[];
  derivedAt: string;
  execution: {
    runtimeKind: string;
    provider: string;
    model: string;
    selectionPolicyVersion: 1;
    promptContractVersion: 1 | 2;
    renderedInputSha256?: string;
  };
  integrity?: { recordSha256: string };
};

```

For `agent_run`, `runId` is that standalone/task agent run ID and `memberId` is always `null`. For `team_member`, `runId` is the team run ID and `memberId` is the member agent run ID from `MemberTeamContext`. Neither variant is inferred from a directory path.

Good: the file contains successful records only. C2 references `previousCompactionId: C1` and its own archive file; appending C2 makes it the current head. Resolver walks C1 when roots are requested. An absent/empty file means no current compacted memory. Prompt version `1` truthfully audits records produced by the implemented SR-004 fixed-count/duplicated-operation contract. Prompt version `2` audits records produced by the approved natural system prompt plus history-only canonical-turn operation payload. New writes use `2`; readers accept/preserve `1 | 2`; the field does not switch structural decoding.

Avoid: copying C1's raw IDs into C2, storing selected message content again, naming a new `generationId`, using `segment-000001`, or persisting a duplicate `compaction_state.json`.

### 2. IDless proposal versus accepted candidate

```ts
type WorkingContextCompactionProposal = {
  selectedNewRawTraceIds: string[];
  retainedMessages: Message[];
  output: NormalizedCompactionOutput; // content only
  execution: CompactionAgentExecutionMetadata;
};
```

The proposal contains no prior/current compaction ID, produced episode ID, produced semantic ID, lineage record, or accepted context. Before strategy invocation, the manager captures `baselineLineageHeadId: string | null` as application-owned attempt state. During acceptance it verifies the head is unchanged, maps it to `previousCompactionId`, reuses the pending `compactionId`, assigns deterministic artifact IDs such as `episode_<safe-compaction-id>_001` and `semantic_<safe-compaction-id>_001`, builds the lineage/context candidate, validates it, and then commits. The strategy never receives a repository.

### 3. Typed composed user provenance without duplicated content

```ts
type TextRange = { start: number; end: number };

type UserConstituent =
  | {
      kind: "compacted_memory";
      textRange: TextRange;
    }
  | {
      kind: "retained_user" | "current_user";
      textRange: TextRange | null;
      rawTraceIds: string[];
      turnId: string | null;
      imageRange: { start: number; end: number };
      audioRange: { start: number; end: number };
      videoRange: { start: number; end: number };
    };

type WorkingContextMessageProvenance =
  | { kind: "single"; rawTraceIds: string[]; turnId: string | null }
  | { kind: "composed_user"; constituents: UserConstituent[] };
```

Ranges index the actual physical message content/media arrays. They are ordered, non-overlapping, and in bounds. They do not repeat constituent text in metadata. The planner can slice logical constituents, include compacted memory in M(n-1), and collect archive refs from natural R(n) only. Snapshot v5 stores this message-local structure and no compaction, episode, semantic, lineage, or current-state identity.

The transient source-to-projector boundary carries the already-authoritative lineage-head record with the content rows it selects:

```ts
type CompactedMemoryProjectionBundle = {
  lineageHead: CompactionLineageRecord;
  episodes: ProjectedEpisode[]; // each has id, ts, summary
  semantics: ProjectedSemantic[]; // each has id, ts, group, fact, salience
};
```

`CurrentCompactionOutputLoader` validates that the row IDs exactly match the lineage-head output lists. `CompactedMemoryContextProjector` renders rows in deterministic order but writes no IDs into the message. Empty or mismatched bundles are rejected. The projection DTO is in-memory only; lineage and row stores remain the persisted relationship/content authorities, while v5 remains the message authority.

### 4. Common condensed tool renderer

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
```

```text
name: run_bash
status: success
arguments:
  {"command":"prefix … [2400 characters omitted] … suffix"}
result:
  prefix … [8000 characters omitted] … suffix
```

For a genuine outcome-less historical call:

```text
name: run_bash
status: interrupted
arguments:
  {"command":"..."}
result: not available
```

Compaction adds `Tool:` and the one XML conversation envelope. Work Evidence adds its timestamped `tool:` Markdown header. Neither behavior belongs in the common renderer.

### 5. Recurrent compaction

```text
C1 input: R1
C1 output/current: M1

C2 input rendered to LLM: M1 in its user-role context, then R2
C2 archive: R2 only
C2 lineage direct inputs: previousCompactionId=C1 + archiveFile(R2)
C2 output/current: M2 only
```

After C1000, default projection loads M1000 only. C1–C999 remain immutable and reachable through lineage, not concatenated into the working context.

### 6. Current-schema restore and empty current state

```text
inactive run + follow-up after required startup migration
-> if a valid v5 snapshot exists: validate and restore it directly
-> else if lineage is absent/empty: build from system + active continuation,
   with no compacted-memory constituent
-> else: fail current-state integrity because current lineage exists without
   its required message snapshot
-> finalize/repair -> install -> persist v5 when no-memory initialization is required
```

Snapshot restore validates messages/ranges/tool/media structure only and never infers lineage from text. Current-output loading independently validates the lineage tail and its output rows. It does not rank arbitrary rows, replay archived compacted inputs, or interpret historical formats. The startup migration ensures pre-lineage snapshots and rows never reach this runtime boundary.

### 7. Required startup derived-memory reset

The server registers one versioned `ResetPreLineageMemoryAppDataMigration` in the existing app-data migration registry. It runs before built-in-agent bootstrap and native runtime creation.

For every discovered standalone run directory and team-member run directory, the migration deletes exactly these files when present:

- `episodic.jsonl`
- `semantic.jsonl`
- `working_context_snapshot.json`
- `compacted_memory_manifest.json`

Missing targets are successful no-ops, so retry is idempotent. The migration does not open, rewrite, or delete active raw traces, archived raw traces, or `raw_traces_manifest.json`. It records `SUCCEEDED` only after all discovered targets are absent. A target discovery/deletion failure produces `FAILED` rather than `SUCCEEDED_WITH_WARNINGS`. `AppDataMigrationRunner.runPending()` persists every attempted required result and then throws a typed required-migration error if any result is non-startable. The actual `startConfiguredServer` caller logs and rethrows before `bootstrapBuiltInAgents`, `buildApp`, or `app.listen`; its programmatic promise rejects and the existing CLI rejection handler exits. Existing `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` remain startable. No content migration, lineage backfill, or backup copy is required because the user classified these four derived files as disposable and the original raw evidence remains intact.

### 8. Quality-first semantic sizing and prompt ownership

`memory-compactor-prompt-content-contract.md` is the exact wording authority:

- its section 1 contains the complete origin/personal-style natural target `agent.md`, including frontmatter, self-contained-summary semantics, smallest-sufficient episode guidance, natural fact selection, and the exact JSON schema without platform-internal defensive wording;
- its section 2 makes the operation user message exactly one complete `CompactionConversationHistoryRenderer` output, with no static prefix or suffix, and requires internal constituent ranges to reconstitute canonical turns rather than consecutive artificial `User:` entries;
- its operation message contains no task instruction, duplicate JSON schema, sizing policy, token policy, or platform-internal terminology; and
- it requires removal of the redundant builder-owned `COMPACTION_RESULT_SHAPE` constant and public export when no caller remains.

Implementation copies those strings exactly rather than paraphrasing them. Launch/provider output-token configuration remains unchanged; the ticket sets no numeric token ceiling. Parser, normalizer, and acceptance retain all structurally valid returned items without count caps.

## Current-Only Replacement Log (Mandatory)

This is the cumulative clean-cut decision log. Every row except the fixed-count prompt/parser/normalizer/acceptance/lineage-validator row was implemented in SR-004 and is retained here as delivered design history, not pending SR-010 work.

| Obsolete / Candidate Mechanism | Why It Was Considered | Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| parse both `episodic_summary` and `episodes`, snake/camel aliases | Old compactor response/tests | Rejected | exact target schema and updated prompt/tests |
| fixed one-to-three episode, twenty-total-fact, and per-category/membership count policy in prompts/parser/normalizer/acceptance/lineage validator | Earlier attempt to constrain output | Rejected | one quality-first system contract, natural LLM-chosen item counts, all-entry structural parsing/normalization, no count rejection anywhere in accepted publication, and unchanged launch/provider token configuration |
| normal restore or rebuild of schema-v1-v4 snapshots | Existing persisted snapshots | Rejected | required startup reset deletes them before runtime; bootstrap accepts only schema v5 |
| compaction/output IDs inside message provenance or snapshot root | Couple continuation messages to derived-memory relationship state | Rejected | message-local compacted-memory kind/range only; lineage tail owns identity |
| destructive `CompactedMemorySchemaGate` and global compacted-memory manifest authority | Reject older rows before fallback | Rejected | startup migration deletes the four obsolete derived files; normal runtime has neither gate nor manifest authority |
| decode historical loose fields through current `EpisodicItem`/`SemanticItem` models | Preserve prior derived memory | Rejected | files are disposable and deleted; current models accept/write only current schema |
| dual loose/range message provenance | Existing metadata readers | Rejected | replace all current readers/writers with one discriminated v5 model |
| separate `compaction_state.json` current pointer | Make current lookup superficially direct | Rejected | successful lineage records are linear; last valid record is current, avoiding a duplicate truth |
| inferred historical lineage backfill | Pre-lineage rows lack source edges | Rejected | delete those rows; first post-reset compaction is C1 with `previousCompactionId: null` |
| preserve strategy store mutation while also writing lineage | Smaller edit | Rejected | proposal-only strategy and manager-owned commit |
| keep server redactor plus core renderer | Reduce Work Evidence change | Rejected | delete server duplicate and use common policy |
| include old and new compacted memories together | Preserve all summaries | Rejected | each output is one complete replacement with natural LLM-chosen item counts |
| generic origin query exposing one ambiguous artifact ID | Simpler query API | Rejected | explicit artifact kind + ID |
| transaction journal for possible process interruption | Multi-file publication | Rejected | no supported product path; preserve reachable pre-write retry only |

## Derived Layering (If Useful)

```text
Server product adapters
  launch scope / memory location / Work Evidence / internal origin service
      ↓
Core application/domain control
  request assembler / executor / strategy / MemoryManager / bootstrapper / resolver
      ↓
Core pure structures and transformations
  proposal / lineage schemas / provenance ranges / finalizer / presentation
      ↓
Persistence providers
  raw archive / memory rows / lineage JSONL / snapshot
      ↓
Filesystem
```

Provider renderers branch from finalized core context and do not sit between context construction and snapshot persistence.

## Change / Refactor Sequence

Steps 1–16 record the SR-004 reconciliation sequence already implemented and validated. Steps 17–23 are the pending SR-010 implementation over the user-approved SR-009 intent; they must not begin until renewed architecture `Pass`.

1. Reconcile the existing worktree created after the `ARCH-REV-002` Pass. Preserve aligned proposal/accept/commit, lineage-record/resolver, renderer, and finalizer work; remove or reshape superseded historical-seed/origin/current-pointer pieces including `legacy-compacted-memory-seed-reader.ts`, `CompactedMemoryOrigin`, `compaction_state.json`, pointer APIs, and snapshot identity fields. Do not discard and reimplement aligned work wholesale.
2. Add/register `ResetPreLineageMemoryAppDataMigration`; make it return `FAILED` for any discovery/deletion failure. Change `AppDataMigrationRunner.runPending()` to persist all attempted required results and throw after a non-startable result. Change the real `startConfiguredServer` catch to log and rethrow before bootstrap/build/listen. Cover existing startable statuses, standalone/team-member discovery, exact deletion, raw preservation, idempotent retry, and fail-closed product behavior.
3. Remove the semantic schema gate, compacted-memory manifest model/store/runtime authority, historical row/snapshot readers, complete-corpus recovery, reset-only APIs, and all old-schema fixtures/aliases. Make message-only snapshot v5 the only runtime schema.
4. Add tight core presentation primitives and tests for stable serialization, redaction-before-bounds, deterministic head/tail omission, status derivation, and exact `result: not available`.
5. Adapt Work Evidence to the common renderer while preserving its external timestamp/Markdown/file/manifest contract; delete `agent-work-trace-redactor.ts`.
6. Replace compactor result/prompt contract with exact `episodes` schema and quality-first natural-count normalization. Add the compaction-owned conversation renderer and remove work notes/IDs/prefix-only clamp.
7. Introduce typed message-local WorkingContext provenance and the finalizer; update ingestion/request append/projector paths so every installed/snapshotted/rendered context is finalized. Update planner units to expand composed user constituents while the manager retains the baseline lineage head outside the IDless proposal.
8. Add/tighten lineage scope/record/query types, store contract, JSONL file provider, tail lookup, exact output lookup, and archive-manager `archiveExact` completed descriptor. Do not create a state type/file.
9. Add current-output loader and change compacted-memory projector to accept one explicit lineage-head bundle. Keep Retriever only for unrelated general recall; it never selects current compaction output.
10. Change strategy API from `compact` to side-effect-free `propose`; remove `MemoryStore` from strategy construction and direct writes from the structured strategy.
11. Add accepted candidate construction and manager-internal committer. Wire executor -> manager acceptance/validation/commit. Use the existing pending `compactionId`, captured lineage-head baseline, and deterministic output IDs.
12. Upgrade snapshot serializer/bootstrapper to message-only v5 with typed message-local provenance and no compaction/output/current-state identity. Initialize a no-memory v5 context from system plus active continuation only when lineage is absent/empty.
13. Add cycle-safe lineage resolver and server internal explicit-target facade. Do not add GraphQL/UI.
14. Update launch/factory wiring to pass explicit standalone/team-member lineage scope and resolved runtime/model/provider metadata where available.
15. Remove all obsolete aliases, historical restore/rebuild paths, complete-corpus fallback, loose provenance, mixed current retrieval, strategy-store seams, gate/manifest/state authority, and duplicate tool renderers. Run structural searches proving forbidden paths are gone.
16. Validate every UC/DF path, persisted-data decision, and clean-cut removal against AC-001–016.
17. SR-006/SR-009 incremental reconciliation: replace canonical `agent.md` with the complete origin/personal-style natural exact file in `memory-compactor-prompt-content-contract.md`. Leave `agent-config.json` and launch/provider output-token configuration unchanged.
18. Reduce `WorkingContextCompactionPromptBuilder` to returning exactly one complete rendered conversation-history block with no static prefix or suffix; make the renderer reuse `WorkingContextFinalizer` over selected visible messages so a composed earlier-summary plus compatible retained/current input reconstitutes as one canonical `User:` entry instead of exposing constituent ranges as consecutive artificial turns; remove duplicate task/schema/sizing text, `COMPACTION_RESULT_SHAPE`, and its unused public export.
19. Remove episode, total-fact, and category-count slices/rejections from parser, normalizer, and accepted builder. Retain at least one episode, exact fields, per-entry bounds, cleanup/deduplication/noise filtering, deterministic ordering, positive salience, and malformed/truncated-output failure.
20. Update `compaction-lineage-record.ts`: remove only upper membership-count rejection; retain arrays, non-empty episode membership, ID uniqueness, safe archive filename, schema/scope/predecessor/time/execution/hash validation; define supported prompt audit values `1 | 2`, export current value `2`, preserve the observed reader value, and make new accepted builds use `2`.
21. Add deterministic >3/>20 coverage through accepted builder -> committer archive/output -> lineage append/read -> current-head exact projection -> typed episode/semantic origin lookup. Add a mixed `v1 -> v2` chain proving audit values are preserved, v2 is current, and recursive origin traverses v1; prove an unsupported prompt audit value is rejected without rewrite or compatibility decoding. Keep unchanged-launch/configuration and canonical-turn coverage plus SCN-019 without exact-count assertions.
22. Run structural searches proving no fixed-count enforcement remains in current source and no message/snapshot constituent carries `previousCompactionId`; allow fixed counts only in explicitly historical evidence/tests where applicable.
23. Re-run implementation source review and API/E2E through the normal rework flow.

Temporary seams are allowed only within an implementation commit while tests are being updated. The final tree must not retain dual strategy APIs, dual snapshot schemas, historical readers, dual provenance shapes, or two readable tool formatters.

## Key Tradeoffs

- **Reference-only lineage over a duplicated compaction-input snapshot:** substantially less storage and clearer authority; exact prompt replay is intentionally unavailable. The referenced archive file plus prior compaction edge is sufficient for coarse origin.
- **Lineage tail over a separate pointer:** because the chain is linear and contains successful compactions only, append order already defines current state. This removes a one-field file and a cross-file consistency invariant; rollback/branch selection would require a future explicit state design.
- **Range-based constituents over copied constituent content:** prevents message duplication and keeps physical provider content authoritative, at the cost of strict range validation.
- **Direct edges plus recursive traversal over flattened ancestors:** keeps every record bounded across 1,000 compactions, at the cost of resolver traversal and cycle checks.
- **Application-owned deterministic IDs over LLM citations/IDs:** makes relationships reliable and cheap, while intentionally providing only coarse compaction-level provenance.
- **Shared low-level renderer over shared broad event model:** eliminates duplicated policy without coupling WorkingContext and raw replay sources.
- **Destructive derived-state reset over historical readers/backfill:** yields one clean current runtime and truthful prospective lineage at the intentional cost of discarding sparse pre-lineage derived memory; active/archive raw evidence remains preserved.
- **No transaction journal:** proportional to verified product paths, but normal multi-file publication is not crash-atomic.
- **Natural LLM-chosen cardinality over item or token ceilings:** lets the model preserve semantic structure appropriate to the selected history and avoids forced merging/loss. Existing provider/model response constraints remain operational concerns rather than ticket-authored semantic policy.

## Risks

1. **Commit ordering under unexpected process termination:** the ticket does not promise crash recovery. Archive and output rows must exist before the lineage append that makes a record current; implementation must not imply stronger multi-file atomicity.
2. **Canonical-turn reconstitution:** reusing `WorkingContextFinalizer` over selected compactor-visible messages must preserve assistant/tool/media boundaries and the existing constituent ranges. Focused tests must prove it does not mutate the installed/snapshotted context.
3. **Semantic allocation quality:** removing numeric item caps avoids forced semantic loss but cannot guarantee that every model chooses an optimal semantic structure. Deterministic tests prove prompt policy, unchanged launch configuration, and no hidden count loss; SCN-019 checks independently verifiable continuation anchors and phase separation without asserting a particular item count. Token-truncated malformed JSON remains a pre-write compactor failure/retry.
4. **Mixed prompt audit history:** readers must not normalize a value-1 record into value 2 or reject a valid mixed chain. Focused record/store/projection/resolver coverage protects truthful immutable audit metadata.
5. **Post-output structural rejection remains possible:** removing the count-only lineage gate does not make multi-file publication transactional or waive other lineage invariants. Structurally invalid records remain rejected under the existing ordered commit contract; this ticket does not add a recovery journal without a supported product path.

Exact archive membership, deterministic output IDs, provider metadata resolution, startup migration safety, shared redaction/head-tail presentation, v5-only restore, and explicit team-member scope wiring were implemented and validated in SR-004. They are preserved invariants, not pending SR-010 refactors.

## Guidance For Implementation

- Treat the foundation contract as normative. If implementation exposes a missing invariant or design impact, route back to `solution_designer`; do not silently improvise a broader schema.
- Keep `MemoryManager` as the public authority even if `AcceptedCompactionCommitter` performs file coordination internally.
- Make proposal and finalizer functions deterministic and unit-testable. No proposal method may write storage.
- Keep message-local provenance structural: compacted-memory constituents carry only kind/ranges; retained/current constituents may carry the raw IDs needed for selection. No snapshot/message field carries compaction, episode, semantic, lineage, or current-state identity.
- The strategy returns only selected new raw IDs, retained messages, normalized content, and execution metadata. `MemoryManager` retains the baseline lineage head outside the proposal. The strategy must not assign output IDs or build accepted lineage/context.
- Preserve the implemented provider resolution through `LLMFactory.getProvider(modelIdentifier)` and `CompactionAgentExecutionMetadata`; do not alter launch or output-token configuration.
- Validate lineage on write: non-empty R(n), completed archive manifest entry, at least one non-empty episode, unique produced IDs, safe run-relative archive filename, exact output existence, predecessor/scope/time/execution/integrity correctness, and no duplicate `compactionId`. Do not impose episode/semantic/category maxima. `promptContractVersion` is audit metadata: accept/preserve supported values 1/2 and write current value 2.
- Commit a normal accepted compaction in this exact order: archive R(n), persist output rows, append the unique next lineage record as the current head, install the finalized context, persist message-only v5 snapshot, then clear pending state. Append must reject a duplicate ID or predecessor unequal to the prior tail.
- Validate state on read: the lineage tail and all output rows it lists must exist in the same scope. Missing referenced current state is an integrity failure, not a fallback to top-K history.
- Preserve the implemented startup reset, runner aggregation/throw, and `startConfiguredServer` log/rethrow boundary unchanged. No current runtime file may recreate `CompactedMemorySchemaGate`, manifest authority, historical dictionary access, or pre-v5 restore behavior.
- Preserve the delivered product-path reset/v5 restore coverage; SR-010 does not rewrite or broaden it.
- Cover the lineage store directly: absent/empty -> no head; first append requires both expected predecessor and record predecessor `null`; later append requires both to equal the prior tail; the appended record becomes the new read tail; duplicate `compactionId`, stale expected predecessor, mismatched record predecessor, and fork attempts are rejected without a write. Prove no `compaction_state.json` or replacement manifest is created.
- Make origin traversal iterative or recursion-bounded with a visited set. A cycle or missing referenced current record/archive/output is an integrity error; an unknown typed output ID is `not_found`.
- For user constituent ranges, define whether indices are JavaScript UTF-16 code-unit offsets and test multi-byte/emoji content consistently. The finalizer and serializer must use the same convention.
- Redact before calculating omission. The marker count is the number of characters removed from the redacted serialized value. Preserve non-empty head and tail when the limit permits; retain complete values at or below the limit.
- Native compaction passes only settled result/error outcomes. Work Evidence may pass `no_outcome` only after its source adapter has proven no terminal record exists.
- `agent.md` owns the complete concise origin/personal-style natural task plus exact JSON and quality-first semantic contract; the operation user message must byte-equal exactly one selected rendered history as defined by `memory-compactor-prompt-content-contract.md`, with one `User:` entry per canonical user turn rather than per internal constituent. `agent-config.json`, launch resolution, and provider output-token configuration remain unchanged.
- Parse every structurally valid returned episode/fact instead of slicing by count. Keep per-entry character limits, exact fields, cleanup, deduplication, noise filtering, deterministic order, and positive salience such as `Math.max(1, base - index)`. Accepted and lineage validation require at least one episode and structural/reference correctness, not maximum item counts. Prove persistence/read/projection/origin rather than stopping at proposal construction.
- The compactor gets one task-level user message containing exactly one escaped `<conversation_history>` boundary. It never gets `Assistant work notes`, LLM reasoning, raw IDs, timestamps, call IDs, or generated Work Evidence Markdown.
- Escape source-originated exact `<conversation_history>` and `</conversation_history>` sequences after redaction/head-tail bounding by replacing their angle brackets with `&lt;`/`&gt;`. The application-owned wrapper is added only after every source value has been escaped, so exactly one unescaped opening and closing boundary remain. XML tag matching is case-sensitive; tests must cover both literal reserved sequences and oversized values.
- Keep existing Event Monitor active-only calls and Work Evidence archive-plus-active calls separate. Searches/tests should prove no snapshot fallback enters Event Monitor and no WorkingContext enters Work Evidence.
- Preserve provider-native structured tool/media state through canonical finalization and v5 snapshot round-trip. Provider renderers should become thinner, not gain repair branches.
- Update/remove only tests and exports affected by the SR-010 prompt/count/audit delta; do not retain production aliases solely to keep old fixtures passing.
