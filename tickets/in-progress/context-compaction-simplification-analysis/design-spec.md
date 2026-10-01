# Context-compaction simplification — design spec

## Solution And Approval Basis

- Package `context-compaction-simplification-analysis`; Solution Designer; 2026-10-01; **SR-034 Ready / Architecture Design Complete; requirements Approved SR033 (SR028 plus REQ013/AC018)**.
- Canonical `requirements-doc.md` is consolidated Approved. Latest SR033 approval: **“approve this behavior.”**, following agreement on **Stopped**, no spinner, card retained; follow-up **“follow the design princiles for design thanks”**. Exact approval: solution-recovery-evidence/sr033/approval.json. Prior SR028 user: “Well, I think now you can continue with the design. Yeah, I agree with you. Hold A then B flow.” Approval covers `input-hold-proposal.sr027.md`, supplementing SR012/017/020/022/024/026. No pending retry-owner/content-boundary/A-B question.
- Exact v5/output contract, natural-compression assumption and no-import/preservation decisions remain. Prior draft ownership/interfaces are superseded by this complete design; original preserved at `history/design-spec.md.before-sr028.md`. Older evidence/reviews remain historical scoped authorities, not current implementation proof.
- Investigation authority: `investigation-notes.md`, especially E21–E34. SR030 corrects the real post-response failure path within the existing approved error/fresh-user policy. SR029 body and supported-ingress clarifications remain; its preservation of old post-response IDLE/different-turn authorization is superseded. ARCH-REV-003 subsequently passed this SR030 target. IR004 historically returned IR004-DI001; IR005/006 and CRR010 subsequently advanced the supported implementation. API006 is now incomplete pending this revised design, not a completed validation result. SR031 is an evidence/premise clarification, not a new target architecture or implementation acceptance. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`, branch `codex/context-compaction-simplification-analysis`, current HEAD `6908ccff483f1eca522caa65bfaaf6dcfcc26750`, last-refreshed base origin/personal `8caa610ff438c288d9aca9f2efe2c33924fbf517`. No fresh fetch. Delivery owns eventual origin/personal finalization.

## SR031 production-scenario premise clarification — no new architecture selected

The user clarified: **“real production path means that real user scenerios or real system behaviro could be triggered by real usage.”** Calling real handlers from a test does not by itself establish such a scenario. See investigation E31 and `production-scenario-clarification.sr031.md`.

IR004 correctly observes a missing shared duplicate check when the exact same Team/Org command identity is manually submitted again. Its narrow synthetic test reports 2 controls Pass / 2 duplicate cases Fail; preserve that evidence. However, the initiating duplicate-after-failure producer has **not** been established independently in supported real usage. Current Team/Org composer paths generate fresh message IDs per user action; Team coalesces a same-ID in-flight call, disconnect discards pending sends; Org timeout/disconnect rejects pending commands. Connection recovery restores transport/view, not outbound SEND_MESSAGE replay. Existing documented standalone idempotency is not proof of a Team/Org retransmission contract.

**Premise classification:** real ordinary A/B compaction recovery remains Supported Explicit Edge Scenario (SCN005). The manually repeated identical Team/Org envelope is Technically Possible, but its supported initiating scenario/contract is **Unclear—not established**. It cannot yet drive IR004-DI001 as a production blocker or new architecture. This does not assert impossible duplication, declare the failing tests Pass, or waive an established production contract.

The unhanded SR031 candidate that proposed shared command admission/claim tokens/full-live identity retention is **withdrawn** as premature. Its exact text is archived solely for truthful history at `history/design-spec.md.unhanded-sr031-candidate.md`; it is not implementation authority. Do not add that service/claim/lifetime/ACK machinery. The approved SR028 / reviewed SR030 target otherwise remains unchanged: existing standalone command dedupe, genuine later user recovery, one FIFO, three strategy attempts, held unsent messages and no duplicate dispatch by the runtime. Do not reinterpret the general no-duplicate requirement as unlimited protocol-wide same-ID retransmission support without a supported caller/contract.

Implementation should identify any concrete production producer/actor or applicable Team/Org contract for the precise same-ID resend after a completed send/recovery failure, with its forward path. Generic network possibility, the existence of identity fields, a callable send method or the synthetic test alone is insufficient. No new intended behavior is awaiting user approval. IR004 was incomplete when this clarification was issued; subsequent IR005/006 progress does not turn the unsupported diagnostic into acceptance evidence. Do not erase/relax the retained diagnostic.

## SR033 approved terminal-activity refinement — design completed by SR034

The final **SR033 terminal-activity design delta, refined SR034** section is part of this canonical spec. SR034 completes existing Team/Org successful-termination and retained-activity hydration paths for in-round ARCH-F003; it does not change Approved SR033 requirements or claim review closure. It replaces cancellation-status and native backend stream teardown/presentation behavior only; reviewed SR030 retry/hold/commit/queue boundaries remain. User approved exact **Stopped**. ARCH003 covers SR030, not this delta. API006 reload/reopen labels were not navigation proof: the owner withdrew those coverage claims and interim90.7. See E33 and the existing-history boundary below; do not add persistence from that mistaken premise.

## Current-State Read — SR028/SR030 design-entry baseline

The next three paragraphs describe the pre-IR005 investigation, not a claim that IR005/006 never implemented it. Current source facts are in E33/E34 and the final delta section.

Original WorkingContextCompactionStrategy was genuinely an interface, but its ecosystem coupled proposal construction/results/diagnostics to a child runner and category output. IR003 has already removed that machinery and implemented a concrete DirectLlmCompactionSummarizer. Executor and configuration still import that class, feed units/size budget and require provider metadata. The approved replaceable axis is now narrower: **compress already-prepared text to compressed text**, not choosing a context window or installing memory.

The server already has one AgentRunInputAdmissionState queue per live run. Native backend “forwarded” only means admission into core runtime, not parent-model consumption. Core input processing/raw ingestion precedes request assembly; compaction is before appending the current new user message and before parent dispatch. Current handled pre-parent compaction failure returns final/isError, then completed/IDLE, and server terminal handling removes A. Request assembly explicitly excludes tool continuations from compaction execution; a separate post-response compaction call exists after a response with no tool invocations. That latter call is not a pre-dispatch tool-continuation suspension point. Simply retrying A as a new turn would duplicate processing; simply requeueing it would create automatic recovery cycles.

The target separates **run-level pending-compaction failure** from **turn/input settlement**. Before A's first parent send, suspend its existing turn with prepared input; A is not resubmitted. After an already-consumed final response, complete A once and retain the recoverable run error/pending gate without an active A. In both cases only a genuinely later user admission authorizes one fresh operation; existing queue occupancy/turn identity cannot. No second input queue, durable outbox or replay ledger.

## Task Size And Architectural Risk (Mandatory)

- **task_size: Large.** Structural delta touches core strategy/configuration, adapter invocation controls, native turn lifecycle/admission, shared server queue/lifecycle, presentation contracts and minimal web projection. Cumulative ticket also replaces category/child execution and changes snapshot/commit ownership. Not sized from Markdown or fixture volume.
- **architectural_risk: High.** Changed public replacement contract, retry accounting across SDKs, asynchronous same-turn suspension/resume, input FIFO/identity and cancellation races, shared status semantics and live reconnect. Prior persistence changes remain in cumulative review scope.
- Payload changes are only deletion of numeric prompt-envelope text and documentation; exact v5 stays. Those alone would not imply Large/High. Runtime/contract ownership changes do.
- Escalate before expanding scope if safe suspension requires a durable queue, parent work replay, changed provider support/prompt, old-data rewrite or broad new UI. Do not silently weaken three-attempt ceiling or invariants to fit an adapter.

## Architecture Investigation Evidence

| Evidence | Inspected path (worktree-relative) | Fact / decision supported | Uncertainty retained |
| --- | --- | --- | --- |
| E21/E25 | core memory/compaction executor, configuration, summarizer, proposal, accepted builder | Concrete type and mandatory unused execution metadata; remove coupling, move content preparation out | New independent substitution not executed yet |
| E28-1 | core agent/loop/{llm-phase,agent-turn-runner}, agent-turn, runtime/agent-worker | Prepared nextInput lives in loop; failure currently becomes completed; pause exact phase instead of replaying input pipeline | New pause not implemented |
| E28-2/E29-3 | server agent-execution/domain/agent-run, input/agent-run-input-admission-state; configured handle and root communication builders | User postUserMessage admission is serialized; reservation commit/release callbacks are synchronous outside dispatchQueue and serve agent-origin communication | No genuine-user reservation/release path established; do not invent one |
| E28-3 | server lifecycle state, native status projector, core status deriver | Active turn currently projects running; error snapshot currently retires turn; both need explicit recoverable-block branch | Generic ERROR cannot safely stand in for block |
| E28-4 | core LLM adapters + installed SDK source | OpenAI/Anthropic per-request maxRetries; Mistral retries none; Gemini client-level options; local Ollama/remote client inspected | Client request ceiling not proof of remote service internals |
| E28-5 | web local submission, agentRunStore, status handler; server stream connect/shared schemas | Identity assignment gap, terminal error UI assumption, live reconnect status exists | End-to-end UI hold journey untested |
| E18/19/IR003 + E28 reread | server docs/design/data_migration_guideline.md; frozen native shapes/current readers | No new migration; preserve current meaning and frozen upgrade contract | No private installed-data census/power-loss proof |
| E29-1 | core agent/llm-request-assembler:53–62; loop/llm-phase:161–165, 367–397; loop/agent-turn-runner | Preparation executes only when not a tool continuation; separate post-response execution does not throw through the preparation catch | Remove unsupported continuation-block branch; retain no-replay invariant |
| E29-2 | core memory/compaction/compaction-summary-parser:11–37 | Parser consumes tagged provider text and returns trimmed six-heading body | Split pure body validation from envelope extraction; never double-parse |
| E30 | LlmPhase post-response catch; worker settlement; retry-turn admission policy/scheduler; core/server status owners | Normal threshold failure currently completes/IDLE; any prequeued USER can pass old retry gate | Replace erroneous preservation with run-level error/gate independent of completed A; deterministic integration tests required |

All observations are source/installed SDK inspection, not new runtime acceptance. No provider calls/tests in SR028/SR029/SR030.

## Intended Change

1. Replace concrete summarizer dependency with `CompressionStrategy.compress(content): Promise<string>`; operation-scoped construction binds cancellation and optional diagnostics separately.
2. Move selected-history rendering completely before strategy invocation. The prepared content contains the prior summary once; no separate previousSummary or numeric size target.
3. Direct strategy internally attempts compression at most three times, with single-attempt local provider transport, same content/system instructions and no repair prompt. Parent SDK behavior unchanged.
4. Required-compaction failure retains a run-level recoverable error/gate. Pre-parent: suspend current A/input and recover on later B, then A/B FIFO. Post-response: finish consumed A once, block subsequent queue dispatch until later user admission, then recover before the next FIFO input reaches the parent. No already-consumed work is replayed.
5. Preserve safe acceptance/commit, current settings, raw/history/upgrade behavior. No new migration or algorithm selector.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind / approved IDs | Trigger and existing basis | Target / preserved outcome | Spines |
| --- | --- | --- | --- | --- |
| BEH001/003 | System; REQ001/003/005/006/009/011; AC001–007/011/013/016 | Sustained/repeated native run crosses existing context threshold | Plan/render -> text compression -> acceptance/commit -> valid parent request; previous summary once | DS001/004/008/010 |
| BEH002 | User; REQ002/007; AC003/009 | Open Memory Inspector | Existing category/raw/current-context reads; no new category generation | DS003 |
| BEH004 | User/operational; REQ007/008; AC008/012 | Resume supported context; existing eligible historical migration | Current decode -> repair -> validation; frozen old conversion/current preservation; no model-only reopen | DS002/007 |
| BEH005 | User/system; REQ004/005/012; AC005/006/013/014/017 | Compaction failure and later user sends B | Run error survives both safe points; hold unsent A or settle consumed A; fresh-admission permit before subsequent parent work; FIFO/no autonomous cycle | DS004/008/009/010 |
| BEH006 | Contract; REQ010; AC015 | Maintainer replaces compression at composition | Independent implementation receives string/returns string, no concrete/provider/storage dependence | DS001/008 |
| BEH001/005 | Configuration; REQ008; AC010/012 | Default use or user sets current override | Current parent default + optional current tuple; no legacy import/selector | DS005 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose / IDs | Status / applicability |
| --- | --- | --- |
| proposed-compaction-prompt.md; output-format-and-coverage.md | Exact v5, tagged body/six headings; REQ006/009 | Approved, unchanged |
| input-hold-proposal.sr027.md | Bounded live held-A/B scope; REQ012 | Explicitly approved SR028; this spec chooses suspension mechanism |
| solution-revision.sr026.md; strategy-boundary-analysis.sr021.md; strategy-execution-investigation.sr025.md | Retry ownership, original/current coupling, feasibility; REQ005/010 | Approved intent consolidated here; old draft interfaces not implementation authority |
| api-retry-policy-request.md; code-review-design-request.strategy-boundary.md | Incoming user requests / evidence | Preserved provenance, not independent implementation authorization |
| acceptance-disposition.sr020.md | F005 accepted-known exception | Approved, not fixed/Pass; Qwen stopped |
| solution-revision.sr022.md; solution-documentation-cleanup.sr023.md; sr022 diagnostic README/manual/comparison | Target removal/assumption and bounded observations | Approved removal, historical measurements not universal proof or remedy |
| architecture-review-clarification.sr019.md; SR018/019 evidence; implementation-evidence/ir-003 | Current snapshot/frozen upgrade/commit closure | Preserved design and scoped earlier implementation evidence |
| design-review-report.md; architecture-review-revision-record.md; implementation/code/API reports and histories | Cumulative independent work / limitations | Basis-scoped; current SR028–SR030 review N/A — in progress, no completed verdict, not omitted-as-passed |
| solution-recovery-evidence/sr028/reference-index.json; architecture-review-clarification.sr029.md; architecture-review-clarification.sr030.md | Complete cumulative supplement/source/evidence paths and bounded review clarification | Inventory/context only; this canonical spec owns current technical decisions |
| Product/DR | N/A — not requested | No separate prototype/UI authority |

## Task Design Health Assessment (Mandatory)

Behavior Change + Refactor. **Boundary/ownership issue and missing approved lifecycle invariant; refactor needed now.** Evidence E25–28 shows structured concrete input/result coupling, SDK retry multiplication risk and terminalized failure that cannot implement held A. This is not a claim the original Strategy pattern was fictitious or prior code violated a later approval.

Response: narrow transformation interface; strategy-owned loop; explicit paused phase; reuse server input queue and core execution scope. Keep selection/acceptance/commit out of strategy, input ownership out of compression and SDK defaults out of attempt-count authority. Defer durable pending delivery, broad busy UI and future algorithms because not approved; residual backend-restart loss of pending queue is explicitly scoped, while persisted history remains protected.

## Terminology / Design Reading Order

Read spines, ownership, execution contracts, persistence, file mapping, then tests. **Attempt** = one internal compression attempt (may fail locally before outbound request). **Operation** = one authorized host call to `compress`, <=3 attempts. **Pending compaction** may outlive multiple user-authorized operations. **Held** is a nonterminal delivery/phase state, not a second copy of a message. **Failure epoch** identifies one exhausted/failed operation waiting for a later user trigger. **Forwarded** remains backend admission, never proof of model consumption.

## Legacy Removal Policy (Mandatory)

No backward compatibility; remove replaced legacy code paths. Preserve historical data/read capabilities, not obsolete generation or runtime decoders. Do not keep a `.summarize` compatibility alias, structured-input overload, direct-class `instanceof`, metadata cast or old selector alongside the new contract. Historical source artifacts are evidence, not a fallback.

## Persisted Data / State Transition Decision

**SR028 delta: Not Affected in persisted formats; no new migration.** Strategy controls, recovery permits/waiters and server queue are live in-memory state. Live input-status DTOs do not become a disk queue. No new SQL field, restart replay marker or historical message rewrite. Existing admitted command IDs already exist; attach the same identity to the optimistic UI message, not a backfill. Disconnect/reconnect to the same process queries live state; backend restart is outside queued-delivery guarantee. Original data-continuity policy remains below, including the already-implemented frozen released-upgrade isolation. This does not mean deleting already-released migrations.


| Subject / location | Existing shape, evidence and volume | Decision and required invariants |
| --- | --- | --- |
| Per-run `working_context_snapshot.json` | v5 `{schema_version,agent_id,messages}`; summary is ordinary text in existing provenance. Four earlier probes and six SR-013 probes; representative replacement 898 bytes. Production count/volume not sampled | **Directly Usable — No Migration.** Same file and message meanings; version-agnostic projected reader, exact `{agent_id,messages}` writer. Ignore obsolete root/version fields; validate 0 or 1 summary regions independent of category/lineage. No heading-based decoder. Preserve text, identity, provenance and tool structure |
| `episodic.jsonl`, `semantic.jsonl` | Existing independent Memory Inspector readers | **Not Affected in stored shape.** Stop compaction writes; retain historical files/readers. New runs may have none |
| `compaction_lineage.jsonl` | Only replaced runtime output membership dependency in inspected production callers | **Directly Usable as untouched historical data; unused by current compaction.** Remove active code/exports; do not delete or rewrite old files |
| Raw active/numbered segments/manifest | Existing normalized records and deduplicating corpus reader; synthetic 3 records/266-byte archive | **Not Affected in schema.** Write ordering changes, not historical serialization. Current segments are run-root `raw_traces_000001.jsonl`; old locations remain handled by existing unrelated archive reader |
| Retired builtin compactor model/configuration | At most one `agents/autobyteus-memory-compactor/agent-config.json`; no current-runtime consumer needed after removal | **No Migration — old preference carry-forward deliberately dropped (SR-017).** Leave source files untouched/inert; do not read/copy/validate them for compaction or startup. Absent current setting means parent-model defaults; explicit current-format settings remain authoritative |

No acceptable history loss. No bulk migration, network export or inspection of user content. Upgrade work is independent of the number of saved conversations. Snapshot/trace content keeps existing privacy/access boundaries. Concurrent old/new binaries writing one run are outside the approved scope; deploy coordinated versions with old processes stopped. Basic filesystem atomic-rename semantics are reused, not claimed to provide fsync/power-loss durability.

### Current Settings and Defaults — No Import (SR-017, finalized SR-018)

- Keep current optional setting `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS`, `{ "modelIdentifier": string|null, "llmConfig": object|null }`. Absence is a valid default, not incomplete initialization: same semantics as `{modelIdentifier:null,llmConfig:null}`. Do not persist a default merely to mark completion.
- Resolve the parent model identifier from the actual current parent LLM at each attempt. With no explicit current override, use that same model/provider via `createAvailableLlm` and existing credential ownership. No new credential store or secret copying, child run, reused parent conversation or parent-object mutation.
- Selected-model defaults supply unspecified generation options; keep existing compaction prompt, tool prohibition and output-cap rules. Existing current settings may explicitly override supported generation fields or model. This is not a requirement to copy the parent's entire LLM configuration or invent a universal temperature field for providers that do not support one.
- Keep ratio/budget/diagnostic controls and the existing optional model/config editor. Default label remains “inherit/use parent model.” A missing current setting renders that default and works without a Save/init step. User changes alone invoke normal validated durable saving; an existing current-format setting is not wiped or guessed to be legacy-imported.
- **Remove** `S/startup/compaction-model-settings-migration.ts`, its direct await/import in `S/application-platform/runtime/build-application-platform-runtime.ts`, and obsolete migration-specific tests. Do not register a replacement migration. Remove any requirement to initialize or validate this setting globally at startup.
- Never read the old builtin definition for selection. An old custom model/config is deliberately not carried forward. Do not delete the old definition, category/trace files, or old child histories.
- Missing current settings use defaults. Invalid current settings fail at normal settings/compaction use through existing error reporting, not application startup; valid but unavailable explicit choices remain explicit errors, not silent fallback. No new migration-status reader, readiness flag, sentinel value, recovery UI or initialization journal.
- Current setting read projects the two known tuple fields and ignores unrelated root extras, matching the web parser. Still validate known-field types, model availability at use and recursive credential exclusion inside the supported generation map. Normal persistence writes exactly those two tuple fields; no root extras or version field. No settings migration is needed to remove irrelevant extras.
- Strategy configuration remains removed; an old unused environment entry has no algorithm-selection meaning and needs no conversion.

### Snapshot Reader and Released Upgrade Boundary (SR-018)

Evidence E18-2/3 closes the prior audit. Current serializer rejects root extras and requires `schema_version===5`; bootstrap repeats that check. The released native-v5 converter and server migration import that evolving serializer for output and an already-current equivalence check. Changing only the serializer would silently change the released upgrader's target/classifier. A characterization probe also shows feeding a versionless current snapshot to that converter produces an empty candidate. Do not do either.

**Current runtime:** keep `WorkingContextSnapshotSerializer` as the one codec for ordinary working-context state. Read known root fields `agent_id` and `messages`; ignore `schema_version` and other unknown root fields without retaining them in metadata or later writes. Project message/tool/provenance fields through their current domain contracts. Preserve explicitly open payload maps (tool arguments/results, supported provider-native context, domain MessageMetadata) under their existing validation; do not mistake their semantic contents for obsolete snapshot envelope fields. Validate known types and identities; do not coerce malformed required facts or silently filter invalid messages into an apparently valid empty context.

- Remove runtime `CURRENT_SCHEMA_VERSION`, metadata's version property and callers supplying it; no replacement version/format marker.
- The safe decode/envelope phase validates current known shapes before installation but permits the same repairable unfinished tool-group cases as today. Then the existing active-raw tool repair and full protocol/provenance/finalizer validation run in their existing order. Preserve 0-or-1 summary-region and exact expected-agent checks. No change in historical admission timing, no exhaustive trace scan, no summary generation on reopen.
- Writer emits exactly `{agent_id,messages}` with the same message/provenance meanings, same file location and existing atomic writer. An existing supported v5 snapshot is directly readable; obsolete fields disappear only on an ordinary save already requested by the runtime. No startup rewrite, new store, upgrade marker or migration entry.
- A root version value alone neither admits nor rejects a payload. A truly old message shape lacking current provenance/identity/tool facts remains invalid at the current boundary; its interpretation stays in already-released migrations. Do not fabricate facts to broaden support.

**Existing upgrade code, not a new migration:** before changing the current codec, create migration-owned `M/migration/native-working-context-snapshot-shapes.ts` with a frozen strict v5 codec/classifier and a frozen exact versionless-successor recognizer. Pin the released wire fields, optional/null semantics, message/provenance/tool rules and representative fixtures at origin/personal `8caa610ff438c288d9aca9f2efe2c33924fbf517`; do not import the evolving current codec/validator to decide source identity or shape. Shared inert domain types may be used only where they do not change classification. Record hashes/provenance in code/tests, not a production per-run hash journal.

- Repoint the existing `NativeWorkingContextSnapshotV5Converter` candidate construction/validation and server `MigrateNativeWorkingContextSnapshotsV5Migration.isEquivalentStrictV5`/fixed-target writing to the frozen v5 boundary. The historical conversion still emits its fixed v5 target, which the current runtime reads directly. Preserve the existing investigated predecessor conversion, omissions, missing-snapshot/lineage skips and obsolete-file dispositions; do not reinterpret source using the new tolerant reader. A current validator may additionally validate conversion output, never replace the frozen source classifier.
- In that same existing registered migration, recognize a **versionless current-format snapshot for preservation**, including the writer-produced unfinished tool states specified below, with exact expected agent identity before loading raw facts or invoking the historical converter. Preserve it byte-for-byte and skip the whole location, including category cleanup. This bounds a real interaction: failed/pending historical upgrades can coexist with later new work because new work must not depend on all history succeeding. It is a keep-current guard, not runtime admission, a transformation, new migration ID, ledger reset or alternative runtime reader. Missing version alone is insufficient, but complete tool-call/result pairing is NOT a recognition condition. Do not call full `WorkingContextSnapshotSerializer.validate` (or its frozen final-protocol equivalent) for this guard. The historical versioned-source path remains governed by its original frozen rules.
- The runner already skips terminal SUCCEEDED/SUCCEEDED_WITH_WARNINGS records; do not reset/replay them. No new global gate, historical scan or source cleanup is added. Existing registered historical migrations elsewhere in the repository are not removed by “no migration in this ticket.”

This is the minimum dependency closure required by the touched-reader guideline: one current codec, one migration-owned fixed-shape file serving an existing upgrader. No generalized version registry or compatibility framework. Review this boundary carefully; implementation must stop for a design finding if preserving the fixed classifier requires widening historical conversion semantics.


#### Successor Preservation Predicate and Test Contract (SR-019)

The SR-018 phrase “fully valid … complete … tool shape” was insufficient and could incorrectly require dispatch readiness. Correct it explicitly; no target recognizer was implemented or tested in SR-018. The intended supported scenario is an ordinary process interruption after persisted tool intents or some results, not manually corrupted data. MemoryManager writes these intermediate snapshots before final protocol completion. E19-1–3 and four actual-writer/restore characterization cases confirm that the current full serializer validator rejects them while normal restore repairs them.

**Predicate owner and signature:** `recognizeVersionlessSnapshotForPreservation(payload: unknown, expectedAgentId: string): boolean`, in the already-proposed migration-only `M/migration/native-working-context-snapshot-shapes.ts`. It is a pure frozen shape/identity check, NOT a repair routine or request-readiness validator. Keep the strict released-v5 equivalence/output classifier separate; do not relax its historical role to solve this different question.

Predicate requirements:
1. Require an object with the exact successor root contract `agent_id` and `messages`, no version field; nonempty agent identity must exactly match the requested metadata-derived run. Require an array and validate every entry against the frozen known message-role/field/payload types; do not filter/coerce invalid entries or accept an arbitrary versionless object.
2. Require current provenance shapes with correctly typed raw IDs/turn IDs and valid within-message text/media ranges. Preserve the existing frozen optional/null rules and intentionally open tool/provider/metadata payload domains. Check individual call/result wire structure (including nonempty call IDs/names, distinct IDs within one call batch, provider-native structure) without inventing a result or authorization.
3. Do NOT require every assistant call to have a result or run the complete conversation-tool-protocol validator. In particular, recognize a snapshot ending after an assistant's tool-call batch, after any persisted subset of that batch's results, and a snapshot lagging already committed raw results. Do not add a rule permitting only a final open batch unless actual writer invariants independently justify it: format recognition is not cross-message protocol admission.
4. Do not read active/raw/archive/category data, finalize messages, run protocol repair, append interrupted results, rewrite the snapshot, create a completion marker or perform cleanup while recognizing/preserving. On true, return the existing preserved/SKIPPED location disposition, preserving the entire location byte-for-byte. This establishes format ownership only; usable-run/next-request checks remain independently required.
5. A versionless payload that fails the frozen shape/identity predicate must **not** fall through into the historical converter's unsupported-schema-to-empty behavior. Preserve it unchanged and use the existing item FAILED diagnostic for unsupported current shape/identity, scoped to that location; no cleanup or fabricated success. Versioned released inputs still use their investigated frozen conversion path. This is a no-destructive-fallthrough condition, not a new repair mechanism, runtime fallback or app-wide gate.

**Normal requested resume is unchanged:** safe current envelope/decode and exact identity -> install for existing active-raw protocol repair -> full structural/provenance/protocol validation -> normal save/dispatch. Committed results are reused; genuinely unfinished calls receive only the existing repair owner's interrupted-result treatment. Keep-current classification does not skip this flow or promise semantic/model acceptance.

**Preserved durable regression contract (implemented/reviewed in IR003/CRR005 and scoped API evidence; rerun proportionately for SR028):**
- In `autobyteus-server-ts/tests/unit/app-data-migrations/migrate-native-working-context-snapshots-v5-migration.test.ts`, exercise the actual eligible migration with snapshots emitted by the current target MemoryManager writer at zero, some and all batch-result boundaries, plus active raw results committed ahead of the snapshot. Each recognized versionless case retains summary/provenance and all snapshot/category/raw bytes; assert converter/raw-fact-loader/repair/write/cleanup were not invoked. Keep independent strict-v5 released-classifier/disposition fixtures unchanged.
- In `autobyteus-ts/tests/unit/memory/working-context-snapshot-bootstrapper.test.ts` and `memory-manager-working-context-snapshot-persistence.test.ts`, independently reopen the preserved writer-produced zero/partial/raw-ahead cases through normal bootstrap; require summary/native context preserved, existing active-raw repair and final full validation before dispatch. Do not replace actual writer cuts with only hand-edited JSON or count migration skip as successful resume.
- Negative recognition/disposition cases: wrong agent, missing/malformed known message/provenance fields, invalid ranges and arbitrary versionless root do not receive recognized-current success, do not get converted to empty, and remain unchanged with the existing scoped failure disposition. A fully complete successor is still recognized. No loosening of the final request validator.
- Existing runner terminal records still skip the old migration entirely; unfinished successor recognition adds no status reset or scan. A pending/failed historical migration beside new work is the relevant operational case, not an invented global startup prerequisite.

Source-characterization evidence in `solution-recovery-evidence/sr019/` is deliberately not a passing target-guard or full startup test. IR003/CRR005 and later API evidence supply scoped target coverage separately; the requirements above remain regression obligations, not a claim of new SR028 execution. Independent review retains control of its finding/verdict.

### Persisted-Data Guideline Check (SR-018; historical evidence, contract preserved)

Canonical authority: `autobyteus-server-ts/docs/design/data_migration_guideline.md`, reviewed on the refreshed base; exact hash in `solution-recovery-evidence/sr018/source-audit.json`. All ten section-2 checks apply proportionately:

1. **Need:** no new data migration. Old settings carry-forward is explicitly unwanted; existing current snapshots preserve meaning through tolerant root projection. Normal saves write exact current fields. No history conversion campaign.
2. **Availability:** remove the legacy settings importer/startup dependency. Missing current setting defaults to parent. Snapshot errors remain scoped to requested history/run; current credential/protocol admission remains. No new global prerequisite or re-audit of excluded history.
3. **Source/target:** inspected old builtin defaultLaunchConfig, current tuple, released native converter (schemas 1/3/4/5), nonempty-lineage and missing-snapshot skips, external-runtime snapshot cleanup and runner terminal statuses. Frozen target remains historical v5 inside that existing converter; normal writes are versionless. Sources/probes are repository/synthetic, not an installed private dataset census.
4. **Disposition:** old compactor preferences ignored/untouched, saved current overrides retained; supported existing snapshot meaningful fields retained, unknown envelope fields not projected. Existing native migration's excluded/current-lineage locations remain untouched; already-current versionless locations, including writer-produced unfinished tool states, are preserved wholly; malformed/unclassified versionless input is not sent to the legacy empty-candidate path. No new aggregate migration result; old ledger never grants runtime admission.
5. **Commit/retry:** ordinary setting uses `setDurably`, snapshot uses existing per-file atomic replacement, compaction retains staged-evidence-before-snapshot ordering. No new backup/journal/marker. Existing migration terminal skips and fixed conversion retry remain; no cross-file/power-loss transaction promise.
6. **Current-only:** remove settings converter; runtime never reads its old source. Version switches/strict released classifiers stay migration-owned; pin before current codec change. Same existing migration ID only receives dependency isolation/keep-current guard; no new transformation or terminal replay. No Prisma schema/drop operation.
7. **Cost:** zero old settings reads or initialization writes. Normal requested snapshot read/parse/projection and existing ordinary save only; no history-wide pass. Keep-current recognition occurs only inside an already-eligible historical migration and avoids raw-fact reading/conversion for that location; no recurring startup proof. No user-volume benchmark claimed.
8. **References:** parent/model identifier passes existing availability/secret owner. Snapshot identity matches exact run; message provenance/ranges/native tool context retained; existing tool repair controls its active-raw references. Old category membership no longer authorizes resume. Memory Inspector independently projects message content and does not require root version. No typed-reference owner is guessed or remapped.
9. **Evidence:** eight unchanged-source characterization probes and source audit establish the gap, not the target fix. Required target tests cover old/current shapes, exact writer keys, invalid required facts, fixed historical classifier/output, successor preservation and terminal skip. Refreshed checks: 42 Pass/2 Fail across five files; failures are separate test-support composition findings, not concealed by the count. No live generation or installed-data replay this round.
10. **Lessons/review:** learned frozen-classifier isolation from `app-data-migrations/legacy/released-run-package-shapes/`, existing native/external snapshot upgrades and runner. Avoid settings copy, version registry, speculative journals, ledger replay and lockout. Large/High independent architecture review requested; source/API/review/Delivery gates still apply.


## Data-Flow Spine Inventory

| ID | Scope / behaviors | Start -> meaningful end | Governing owner / reason |
| --- | --- | --- | --- |
| DS-001 | Primary, BEH001/003/006 | User run -> parent request with committed checkpoint and retained context | Native run/MemoryManager; actual compaction path |
| DS-002 | Primary, BEH004 | Resume request -> restored validated next request | Existing resume/bootstrap; no generation just to reopen |
| DS-003 | Primary preserved, BEH002 | Inspector -> historical/current view | AgentMemoryService |
| DS-004 | Return-event, BEH001/005 | Core progress/block/resume -> server lifecycle -> UI | Runtime fact plus server projection; truthful nonterminal error |
| DS-005 | Primary config, BEH001/005 | Settings/default -> attempt's fresh model | ServerSettingsService/current LLM factory |
| DS-006 | Retired SR017 | No old-settings import | N/A — not replaced with startup work |
| DS-007 | Existing operational upgrade, BEH004 | Eligible old migration -> fixed conversion or whole-current-location preservation | Existing runner/frozen shapes; no new migration |
| DS-008 | Bounded local, BEH001/005/006 | One compress(content) -> success string or exhausted error | DirectLlmCompressionStrategy, exactly one internal retry owner |
| DS-009 | Primary pre-parent recovery, BEH005 | Error-held A + later user B -> authorized compression -> A continuation -> B turn | AgentRun FIFO + native suspended initial phase, no resubmission |
| DS-010 | Primary post-response recovery, BEH001/005 | Completed parent response -> compaction exhaustion -> A settles/error persists -> later user admission -> next FIFO input compacts before parent | Same pending gate/queue owners, no suspension/replay of consumed A |

## Primary Execution Spine(s)

- DS001: `User -> AgentRun admission/native backend -> core turn/input pipeline -> LLMRequestAssembler -> pending executor (plan + render) -> CompressionStrategy -> MemoryManager acceptance/commit -> same phase parent dispatch -> normal turn completion`.
- DS009: `User sends B -> identified admission into existing AgentRun queue -> blocked-turn recovery authorization through native backend -> same A runner unblocks -> DS001 compression/commit -> A completes -> existing FIFO dispatches B`.
- DS010: `A normal final response/threshold -> post-response compression fails -> record run gate -> deliver final A/settle turn once, keep error -> genuine later user admission -> grant next-turn permit -> oldest pending input starts -> pre-parent compression/commit -> normal parent dispatch -> FIFO continues`.
- DS002: `User resume -> run service/native factory -> snapshot bootstrap -> current envelope/identity -> active-raw tool repair -> final validation -> normal next request`.
- DS003: `Memory Inspector -> existing API/service -> current snapshot/category/raw readers -> view`.
- DS005: `Settings card/default -> existing validated settings owner -> current model factory -> fresh direct LLM for each attempt`.
- DS007: `Already-eligible historical runner -> existing candidate/disposition -> frozen successor recognition OR frozen predecessor conversion -> fixed target/preserved location -> scoped result`. No new scans/gates.

## Spine Narratives (Mandatory)

DS001 selects compactable units from an immutable baseline, including the prior checkpoint where eligible. The caller renders them once into content. An operation-scoped strategy compresses only that content. The executor receives only text; its pure summary-body validator checks the returned untagged body, then candidate validation checks context freshness, provenance, protected tail/tool boundaries and fit before MemoryManager commits. Success resumes the same request assembly and appends the current user once.

DS008 is internal to direct compression: build fresh isolated LLM from current selection -> capacity preflight -> one SDK generation -> complete/tagged-body check -> cleanup. On compression failure wait briefly and repeat, with identical content/v5, up to three attempts. No host automatic loop or generation after a host commit failure.

DS009 preserves the already-processed input in A's running turn while awaiting recovery permission. A remains nonterminal, so FIFO does not dispatch B into core ahead of it. B's genuine admission after blockage authorizes one fresh strategy operation through a narrow native control, not an extra copy of A or B in core. Repeated failure opens a new epoch and waits for another later user action. A final normal completion removes A's queue entry once and permits B; B can itself encounter ordinary compaction and uses the same rules. Already completed tools/parent phases are never rerun.

DS010 handles the other actual execution callsite. A has already reached the parent, so its response and terminal event settle normally once. Failure persists as a run-level compaction gate, not an unfinished A. A prequeued B cannot drain/retry merely because A settled. A later C can authorize compaction for the oldest queued input (B then C); if none was queued the later B is that next input.

DS004 projects explicit recovery facts and the live pending-input view. In DS009 the held turn remains active; in DS010 A becomes completed and no active turn is fabricated. Neither terminal/status activity nor Error-is-terminal UI assumptions may clear the separate unresolved compaction error/gate. DS002/003/005/007 preserve the detailed current-schema/settings/history contracts above, rather than reintroducing old machinery to make recovery work.

## Spine Actors / Main-Line Nodes / Ownership Map

| Node | Concrete ownership |
| --- | --- |
| AgentRun | Authoritative per-run admission/FIFO and command observer lifecycle; serializes successful postUserMessage admissions, block facts and recovery claims; reservation callbacks are not recovery ingress |
| Native AgentRuntime / AgentTurnRunner | Owns normal turn settlement, pre-parent suspension and next-turn permit binding; no replay of completed A or parallel turns |
| MemoryManager / internal compaction coordinator | Pending operation/failure epoch/one-use authorization independently of turn lifetime, baseline freshness, accepted context and commit authority |
| PendingCompactionExecutor | One operation: plan, render, construct strategy via injection, compress once, validate, commit, report |
| CompressionStrategy / direct implementation | Content transformation and own internal attempts; no queue, memory mutation or context-window selection |
| Model factory / adapters | Current model/credentials, isolated provider invocation, normalized completion/usage and single-attempt transport |
| Existing builders/validator/committer | Pure candidate invariants and bounded storage sequence behind MemoryManager |
| UI | Pending/error/held projection and new user intent; not delivery authority or automatic resend owner |

## Thin Entry Facades / Public Wrappers

Agent.postUserMessage and new native retry-control method delegate to AgentRuntime; neither reads MemoryManager internals. Native backend exposes capability + forwards control to Agent. MemoryManager remains the sole public memory/gate entrypoint; internal coordinator/committer are not alternative public access. Settings and WebSocket routes validate/translate, never run retry loops.

## Removal / Decommission Plan (Mandatory)


All paths below are repository-relative; `C` = `autobyteus-ts/src/memory/compaction`, `M` = `autobyteus-ts/src/memory`, `S` = `autobyteus-server-ts/src`.

| Remove/decommission | Why / replacement | Scope |
| --- | --- | --- |
| C/agent-compaction-summarizer.ts, compaction-agent-runner.ts, structured-json-compaction-strategy.ts | DirectLlmCompactionSummarizer and direct executor plan; no child or algorithm wrapper | This change |
| C/compaction-response-parser.ts, compaction-result-normalizer.ts, compaction-result.ts; correction-prompt branch | Single tagged body parser; no six-array normalization or correction call | This change |
| C/default-working-context-compaction-strategy-registry.ts, working-context-compaction-strategy-registry.ts, working-context-compaction-strategy-resolver.ts, working-context-compaction-strategy.ts, working-context-compaction-strategy-setting.ts | One algorithm; useful diagnostics move to concrete compaction contract | This change |
| M/projection/compacted-memory-message-builder.ts, compacted-memory-context-projector.ts, compacted-memory-projection-bundle.ts, current-compaction-output-loader.ts | Summary text directly finalized; no category projection or restore gate | This change; final source-reference audit must find no live importer |
| M/lineage/* and M/store/file-compaction-lineage-store.ts; AgentConfig.compactionLineageScope and factory wiring | No categorized output lineage authority. Existing operation IDs and raw archive membership remain separate | This change; historical files untouched |
| S/agent-execution/compaction/server-compaction-agent-runner.ts, compaction-run-output-collector.ts, memory-compactor-agent-launch-resolver.ts | Server direct model creation; no launch/subscribe/post/wait/terminate child lifecycle | This change |
| S/agent-execution/backends/autobyteus/compaction-lineage-scope-resolver.ts | Compaction is local to already-identified run/store; not category membership per scope | This change; retain actual team execution identity elsewhere |
| S/config/working-context-compaction-strategy-setting.ts; S/api/graphql/types/working-context-compaction-strategy.ts and registration | Remove getWorkingContextCompactionStrategies/getEffectiveWorkingContextCompactionStrategyId | This change, coordinated client/server release |
| Web stores/workingContextCompactionStrategyCatalog.ts; selector/query/store/status references | Keep useful settings/status; remove nonexistent algorithm/child/fact data | This change |
| Builtin memory-compactor registry entry and template directory; recursion-disabling special case; related asset smoke assertions | Prompt becomes core literal module, not agent package | This change; old persisted definitions/history remain data |
| Obsolete exports/tests/docs for above | No empty facades, deprecated aliases, or tests pinning removed behavior | This change |

Retain `message-budget-strategy.ts`: it is an actual cost-calculation boundary, not an alternate compaction algorithm. Retain independent category item/read types and Memory Inspector readers; do not blanket-delete memory storage or retrieval code not required by this refactor.


SR028 additional clean cuts:
- Replace `direct-llm-compaction-summarizer.ts` with `direct-llm-compression-strategy.ts` implementing the new contract; no alias or dual class kept.
- Replace concrete `summarizer` configuration slot with operation-scoped `createCompressionStrategy`; remove structured `.summarize` input/result exports and mandatory proposal execution metadata.
- Move/rename WorkingContextCompactionPromptBuilder to `compaction-content-builder.ts`, callable by executor before compression; retain renderer/source framing/Unicode behavior. No duplicate history builder inside strategy.
- Delete numeric summary-budget prompt prefix/input field. Keep planner replacement reserve and provider hard cap, which have different responsibilities.
- Replace compaction-failure final/isError/completed branch with explicit blocked outcome and abortable wait; remove both turn-ID-difference and queued USER-origin as sufficient retry authorization, at both safe points. Post-response no longer replaces the valid final response with a compaction-error response or clears error via IDLE. No compatibility route that still terminalizes A.
- Remove in-scope UI inference that recoverably blocked Error means dead runtime/complete message; preserve genuine offline/fatal error semantics.

## Return Or Event Spine(s)

DS004 uses existing stream/event owners with typed `COMPACTION_BLOCKED` and `COMPACTION_RESUMED` facts. One run-scoped recovery identity is `{operationId, failureEpoch}`; execution/diagnostic turn identity is separate. Its recovery position is a discriminated union:

```ts
type CompactionRecoveryPosition =
  | { kind: 'held_turn'; turnId: string }
  | { kind: 'next_turn'; failedTurnId: string };
// recoverableBlock: { operationId, failureEpoch, position, state, code, message }
// state: 'awaiting_user' | 'authorized' | 'recovering'
```

`held_turn` means an unsent initial-phase input remains active. `next_turn` means the failed post-response turn may be settling or already retired; it is correlation, not a turn to resume. No tool-continuation phase variant. The MemoryManager gate owns epoch/permit state; runtime callsite supplies execution position as part of the same recovery transition, not a second retry authority. Add an internal executor input `executionSite: before_parent_request|after_final_response` at the two existing callsites; pass it into retainFailure so epoch + held_turn/next_turn position are recorded atomically before diagnostics, snapshot reads or awaits. This is host execution context, never a field of CompressionStrategy.compress. Snapshots/events project these facts and can have a block with `currentTurn:NONE`. A grant changes awaiting_user to authorized; only binding/starting the retry operation yields recovering. Successful commit clears the gate; failure creates a new epoch; cancellation revokes permits, never marks compaction successful.

Core phase progression and visible status must be separated narrowly at the existing status owner: normal response pipeline/lifecycle hooks still run exactly once, but effective published status is recoverable ERROR while the gate is awaiting_user/authorized. During actual recovery it is running/compacting. `AgentIdleEvent`, LLM response processing, normal TURN_COMPLETED, generic activity and snapshot reads cannot clear unresolved compaction error. Preserve genuine fatal/offline precedence and ordinary non-compaction status behavior. Do not freeze phase transitions at ERROR and accidentally suppress AFTER_LLM_RESPONSE processors; block-only status updates must not fabricate/repeat lifecycle callbacks. Update status deriver/update-utils/manager together to project the authoritative recovery facts without a second failure latch owner.

Server lifecycle/status reconciliation handles this recovery projection before generic error->retire/active->running logic. DS009 keeps the held turn. DS010 **does** retire/complete A on its real terminal fact and removes its command entry, but retains the run gate/error. An event about next_turn.failedTurnId is not stale solely because A is retired: validate current run-instance/operation/epoch snapshot instead; old epochs still rejected. A final A assistant-complete/turn-complete is correct for DS010, forbidden while held in DS009. COMPACTION_RESUMED is recovery progress, not permission to erase the gate or replay A. Reconnect uses the live authoritative snapshot for both positions, not message history inference.

The server input owner emits a live `AGENT_INPUT_STATE` projection (shared presentation contract) with run-instance ID + monotonic revision and pending entries keyed by existing message ID (internal sequence for entries without public message IDs): `queued`, `held` or `forwarded`, associated turn when known, plus the separate run-level recovery block. A completed post-response input is not present as held; queued inputs can coexist with currentTurn:NONE and recoverable error. It carries only identity/status and already-authorized display content/attachment references needed to reconcile queued B after reconnect, never provider-resolved paths/secrets. Same-process initial stream subscription supplies an atomic snapshot and subsequent revisions through AgentRun's serialized dispatch owner; ignore lower/equal revisions and reset on new run-instance identity. Do not infer pending delivery by scanning history.

Use the existing presentation DTO ownership, strict server/web/team/collaboration schemas and stream projectors together. Extend standalone connect and live team/org subscription paths to send this **transient** projection for the exact subscribed run; do not persist it in Team/Org execution trees or introduce a second disk authority. Feed existing UI per-run state from the same projection. Ordinary terminal input/queue removal clears status but retains conversation history. Historical event readers retain their old category fields as read-only history, not a legacy compactor.

## Bounded Local / Internal Spines

1. **Memory coordinator:** initial_ready -> operation_in_progress -> committed, or awaiting_user_retry(epoch, position). One fresh-user grant may be bound to the held turn or next eligible FIFO turn, then consumed once by its executor. State outlives post-response turn settlement; no turn-ID/origin-only fallback, no saved credits from in-progress arrivals.
2. **Direct strategy:** attempt1 -> success OR abortable 1s wait -> attempt2 -> success OR abortable 2s wait -> attempt3 -> success/exhausted. Cancellation exits immediately, cleanup bounded separately. No jitter/settings/UI needed for this small fixed policy.
3. **Native runner (pre-parent DS009):** prepare external input ONCE -> phase -> blocked => await user permit without settling turn -> SAME phase/input -> normal final/tool continuation. Memory request assembly executes again only after permission, not input pipeline or completed tool batches.
4. **AgentRun:** admit B -> retain B FIFO -> if already-blocked native run and genuine post-block user admission, claim one recovery permit -> call backend outside dispatch lock -> reconcile acknowledgment/facts under lock. For held_turn wake A; for next_turn allow only one next FIFO dispatch after acknowledged grant and actual A settlement. Ordinary drain remains gated without a grant even when no active turn exists. No lock held across provider work.
5. **Post-response runner (DS010):** retain epoch/next_turn gate -> final pipeline/turn settle once -> worker stays alive with no active turn, effective ERROR -> await fresh-admission grant -> one new FIFO turn bound to grant -> normal pre-parent executor.
6. **Commit:** preserved staged archive copy -> atomic snapshot commit -> no-fail install -> best-effort prune/report; no automatic generation retry beyond this boundary.

## Off-Spine Concerns Around The Spine

| Concern | Serves owner / reuse | Forbidden confusion |
| --- | --- | --- |
| Content renderer / Unicode-safe finalization | Executor, existing renderer + renamed builder | Strategy must not get units, reread archive or reselect history |
| Prompt + tagged-body parser | Direct strategy; envelope extraction stays inside direct strategy; shared pure body validation guards host acceptance | Parser proves shape, not semantic fidelity; no repair generation |
| Parent/final and compactor input budgets | Executor validator vs fresh adapter preflight | Numeric prompt target is gone; reserve/cap are not the same thing |
| Credential/model/runtime resolution | Server compaction factory / existing LLM availability | No credential values in contract/events or inherited parent tool/system state |
| Retry timing, per-attempt observer | Direct strategy / small owned mechanism | Observer errors cannot retry valid content or invalidate commit |
| Phase recovery waiter | AgentRuntime/turn, existing execution scope | Not an input queue, scheduler, persistent journal or second operation-state owner |
| Input/status views | AgentRun projection -> existing streams/UI | Not frontend authoritative resend or another shared pending-input store |
| Snapshots/archive | MemoryManager/committer | No provider or queue knowledge in storage |

## Ownership Boundaries / Boundary Encapsulation Map / Dependency Rules

| Authoritative boundary | Encapsulates | Callers | Forbidden bypass |
| --- | --- | --- | --- |
| AgentRun.postUserMessage | Queue admission and recovery eligibility | Standalone commands and Team/Org user post_message via configured handles | Web/native adapters editing queue arrays or issuing automatic resends |
| Agent.authorizeCompactionRetry -> AgentRuntime | Run-level pending gate, held-phase wakeup or next-turn grant validation | Native backend only for admitted user; core own user submission path | Arbitrary WebSocket retry token accepted as authority; reaching context coordinator directly |
| MemoryManager pending/prepare/commit methods | Coordinator permits, baseline, committer/store | Executor/runtime through narrow facade | Public caller mutating pending fields/snapshot/archive |
| CompressionStrategy.compress | Text compression and internal attempts | Executor through interface | Concrete class imports, `.execution` required, host retry loop |
| BaseLLM.sendMessages options | Local provider single-attempt policy/cancel | Direct strategy | Mutating parent client/global SDK settings, provider switch in memory executor |

Strengthen those boundaries rather than exposing their internals. Runtime may call MemoryManager for operation/permit state but server must use native Agent control API, not import core coordinator. Presentation fields are derived; they do not grant retry. A strategy may depend on LLM/parser but never MemoryManager, AgentRun, command registry or disk stores.

## Interface Boundary Mapping / Interface Boundary Check

```ts
// memory/compaction/compression-strategy.ts — essential public content contract
export interface CompressionStrategy {
  compress(content: string): Promise<string>;
}

// memory/compaction/memory-compaction-configuration.ts — integration construction
// Not content input: binds controls for this authorized operation, no global mutable state.
type CompactionCompressionExecution = {
  signal: AbortSignal;
  operationId: string;
  executionTurnId: string;
  getParentModelIdentifier: () => string; // current phase/runtime lookup, not run-creation capture
  observe?: (event: CompressionAttemptObservation) => void;
};
// Existing disabled variant retained; enabled uses:
{ kind: 'enabled'; policy: CompactionPolicy;
  createCompressionStrategy: (execution: CompactionCompressionExecution) => CompressionStrategy }
```

Each invocation constructs an operation-scoped implementation and calls `compress(content)` once. The integration factory can ignore execution metadata for a non-LLM implementation; a test strategy needs only text->text. Cancellation is bound through `signal`; all implementations must honor stop or at minimum cannot outlive caller acceptance/commit permission. Host checks abort after await and before commit independently. No size target, units, prior-summary field, credentials or required provider result escapes into the content method. The factory is dependency injection, not selector/registry. Only server composition imports the direct class; other embedding callers may construct it at their own composition boundary.

`CompressionAttemptObservation` has attempt ordinal and started/succeeded/failed outcome; optional model/provider/invocation/completion/usage fields when actually known. Keep this under compaction execution diagnostics. No mandatory fake provider metadata for test/non-LLM strategy, no lastResult mutable field. Observer exceptions are swallowed/reported safely and cannot influence success/count. Proposal contains selected raw IDs, retained messages, summary text, budget assessment; remove `execution` from proposal/acceptance authority.

Recovery interfaces are a distinct subject:
- Native capability `compactionRecovery: supported|unsupported`; supported method `authorizeCompactionRetry({block:{operationId,failureEpoch}, userAdmissionId}) -> accepted|stale|stopped`. Core reads its authoritative position; caller cannot choose held versus next or override the active turn. Expose a narrow runtime recovery snapshot through Agent/native backend, not server access to MemoryManager internals.
- The server constructs userAdmissionId from run-instance + successful immediate postUserMessage entry sequence after observing current failure. USER origin from supported ingress required; all reservation callbacks, agent/system messages, duplicate/rejected commands and prequeued/during-operation inputs cannot grant recovery. No release epoch added.
- MemoryManager removes both `lastFailedExecutionTurnId != turnId` and `entry.origin === user` as sufficient authorization. A fresh one-use grant authorizes the pending operation, not a particular message's content. Runtime binds that grant to the retained held turn, or to one next FIFO turn at start; executor consumes it for that exact operation/epoch/turn before compression. Arbitrary subsequent turns cannot reuse it.
- Next-turn grant may arrive while consumed A is still completing: latch it without waking/re-running A; wait for A's real settlement, then claim one next FIFO input. Grant identity survives that settlement; a terminal fact is not failure clearance. If no eligible queue head is dispatchable yet (e.g. existing reservation ordering), keep the same grant pending, no background generation. New arrivals during authorized/recovering state do not create additional credits.
- Core embedding submission uses its existing inbox, not a new queue: capture an awaiting-user epoch at genuine USER enqueue, retain a successful unique entry receipt, then authorize only that captured epoch. The enqueue/receipt must not retrospectively qualify a message received while compression was in progress merely because an await resumed after failure. Existing queued entries cannot self-authorize by origin or new turn IDs. Server-managed B remains server-side and uses the control, never a second copy in core.
- Scheduler/worker keep lifecycle/stop lanes dispatchable. When awaiting_user, no turn_start entry is dispatchable; with a next-turn grant, claim only the oldest otherwise eligible entry and bind the grant at actual turn start, not in polling/peek predicates. Do not skip older entries to pick the authorizing user. The grant came from genuine user intent even if an earlier queued entry is agent-origin; that earlier entry itself never grants recovery. Only one active native turn exists. Parent assembly remains the independent last guard before dispatch.
- Native control also supports `revokeUnusedCompactionRetry({block,userAdmissionId,reason}) -> revoked|stale|in_use` for a server dispatch proven not delivered before a turn binds the grant. It only revokes that exact unused permission and publishes a new awaiting-user epoch; never cancels/rolls back an already-bound turn or committed checkpoint. If normalization/start dispatch fails before core admission, do this instead of letting another queued entry inherit permission. If delivery is uncertain, retain the server claim/gate and reconcile authoritative grant/turn state; do not blindly retry dispatch, grant another permit or declare B undelivered. Explicit stop remains the cancellation owner for active work. No generic delivery recovery service is added.
- Failure/abort/stop revoke the grant. If the bound new turn fails/cancels during its input pipeline before reaching the executor, revoke it and leave the compaction requirement blocked with a fresh epoch/diagnostic; don't let the next queued input inherit it. No generation retry for that unrelated input-pipeline failure, and no replay of that failed turn. Stop cleans waiter/permit; backend restart has no persisted grant or queue replay.

All interfaces have one subject/explicit identity: content, compaction operation, agent input, or runtime block. Do not use message ID as turn ID, assume backend forwarded means parent consumed, or guess owners from strings. Identity ambiguity Low after this split; concurrency remains High risk requiring tests.

### Prepared content and direct strategy execution

Executor uses plan.compactableUnits and existing maxItemChars to build complete content once. Retain current introduction/separators/source role labels and provider-safe Unicode finalization; move the whole builder before `compress` to avoid changing approved prompt semantics. The direct implementation sends exact v5 as system and supplied content as user. The only request-text deletion is `Summary budget: N tokens.\n\n`; no replacement quota, separate previous summary or new semantic bullet. Preserve full user/prior-summary/assistant text; excerpt only tool values under existing renderer rules.

For each of up to three attempts: check cancellation, resolve then-current parent identifier/current settings, construct a fresh isolated LLM with compaction-controlled cap/fields, preflight its actual input capacity, send once with single-attempt transport, reject known incomplete response, parse body from response.content, emit safe observation, cleanup fresh instance in finally (existing 10s cleanup ceiling). Fresh logical conversation/invocation ID each time; same content and v5 across attempts. Current explicit settings can change between attempts, but no automatic change of model/config/prompt and no mutable parent conversation reuse. In-flight attempt keeps its resolved config.

All failed compression attempts — local construction/credentials/capacity, API errors including permanent rejection, timeout under existing adapter policy, empty/malformed/known-incomplete output — advance the uniform three-attempt loop. Local failure need not emit a network request. User abort/termination is not retryable; check bound signal before construction/call, after response and during wait, regardless of provider error wrapping. Host content rendering, final candidate invariants/fit, archive/snapshot/commit failures are outside this loop. They enter the corresponding run-level failure path (hold only unsent input; otherwise settle consumed response and gate subsequent work), but do not spend three extra generations or attempt a smaller repair summary.

Timing: 1s then 2s abortable waits, no extra outer SDK wait/retry. Preserve existing provider request timeout policies; no new total-operation wall-clock SLA. In particular current remote client timeout 0 means cancellation, not an invented finite network deadline. Tests must exercise adapter timeout rejection and user cancellation independently. Timeout/abort must not leave an unnoticed second generation running; consume/discard late responses and fence commit. After success cleanup/reporting failure is only diagnostic. Three attempts do not mean three model calls after successful output.

### Exact text result and body acceptance contract (SR029)

`CompressionStrategy` is a text-to-text boundary. For its use in this compaction host, the **successful returned string is the untagged Markdown summary body**, not the provider response, a tagged envelope, JSON, or a result object. The approved six headings/body grammar are the compaction host's content requirement, not LLM/provider metadata or a numeric obligation added to the generic interface. An independent strategy used here must return that body; it need not use v5, tags, an LLM or the direct strategy's parser internally.

Refactor the existing `C/compaction-summary-parser.ts` without changing accepted provider-envelope semantics:
- Extract/export `validateCompactionSummaryBody(content: string): string`: runtime string check, trim boundary whitespace, require nonempty body beginning at the first approved heading, exactly the six existing ordered level-2 headings, and the existing per-section bullet-or-`(none)` predicate. Reject embedded exact opening/closing compaction markers; existing one-pair provider extraction already excludes those. Return the validated trimmed body, otherwise throw `CompactionSummaryValidationError`. Do not rewrite bullets, truncate text, infer facts or add a token target.
- Keep `parseCompactionSummary(providerContent: string): string` for the direct provider envelope only: require exactly one ordered opening/closing pair, extract inner text, call the body validator, return its body. Exterior prose is ignored exactly as approved. Direct strategy invokes this parser after completion checks **inside each attempt**; malformed provider output can therefore fail that attempt and enter its internal retry policy.
- PendingCompactionExecutor, after the single `compress(content)` call and abort check, invokes **only `validateCompactionSummaryBody(result)`**, then prepares the candidate and runs existing context/provenance/tool/final-fit acceptance. It never invokes `parseCompactionSummary` on strategy output and never wraps an independent strategy result in synthetic tags. Shared pure body validation at two trust boundaries is intentional; envelope extraction occurs once.
- A malformed independent strategy return is a host acceptance rejection: unchanged baseline, safe hold at the supported safe point, no host retry/re-invocation. No provider completion field is required from that independent strategy. Direct strategy separately rejects known incomplete provider responses before returning success.

Contract tests: tagged provider text plus exterior prose -> extracted body -> host acceptance; independent valid body through real executor -> acceptance without any tag parsing; tagged/empty/wrong-heading/malformed body returned by a test strategy -> host rejection with one call and no commit. Preserve existing parser fixtures for duplicate/reversed/missing markers and section grammar. A body validator is format validation, not semantic fidelity verification.

### Single-attempt local transport, not parent retry policy

Add `LLMInvocationOptions.retryMode?: 'single_attempt'` (absence keeps current behavior). Direct strategy always sets it. This is transport execution policy, not an LLM generation/config field, so extraParams cannot override it or serialize it into model prompts.

| Family | Target control / inspected support | Verification requirement |
| --- | --- | --- |
| OpenAI-compatible including DeepSeek/LM Studio subclasses; Responses | Request options `maxRetries:0` alongside signal, only when single_attempt | Actual SDK fetch interception: 503/429/timeout causes one request per internal attempt; parent absence retains current retry |
| Anthropic | Same per-request `maxRetries:0` | SDK fake transport, not only inspecting options |
| Gemini | Extend owned client initialization with optional transport override; single-attempt isolated client uses `httpOptions.retryOptions.attempts:1` at **client construction** for all configured Gemini runtimes | Installed SDK apiCall reads clientOptions; request-only config insufficient. Separate cache/mode or operation-local client, never mutate shared parent/multimedia client. Control applied after user extras; fake transport count |
| Mistral | Request options `retries:{strategy:'none'}` plus signal | SDK fake transport verifies option reaches generated call |
| Ollama | Inspected local chat->fetch path has no retry loop; honor same no-retry contract | Fake fetch count/cancel; no global abort of parent because instance is fresh |
| AutoByteus remote adapter | Existing one client.sendMessage/axios request, no local retry interceptor observed; preserve auth/cleanup | Count client outbound generation requests; do not claim visibility/control over remote host's internal processing or portable hard-cap enforcement |

Adapter layer owns mappings and complete/incomplete/unknown status. Core memory owns no provider switch. Protect controlled tools/format/cap/stream/conversation/retry options against kwargs/extraParams overrides using existing controlled request builders. Fixed attempt contract applies to this process's outbound generation calls; authentication and cleanup requests are not new compression generations. A provider that cannot satisfy the client-side bound is a design-impact finding, not permission to remove it silently from support.

### Completion status contract

Extend `CompleteResponse` only with `completionStatus: 'complete' | 'incomplete' | 'unknown'` (default unknown) and nullable `completionReason` for diagnostics. No streaming redesign is required: compaction uses the non-streaming methods. Existing callers may ignore this additive metadata. Each direct adapter sets it from its provider response; no compaction-owned provider switch.

| Adapter family | Normalize for this direct text call |
| --- | --- |
| OpenAI-compatible and subclasses | `stop` -> complete; length/content_filter/tool_calls/function_call or observed non-text tool output -> incomplete; absent/unrecognized -> unknown |
| OpenAI Responses | completed without refusal/tool output -> complete; incomplete/failed/cancelled or incomplete_details -> incomplete; other/missing -> unknown |
| Anthropic | end_turn or stop_sequence -> complete; max_tokens/model_context_window_exceeded/tool_use/pause_turn/refusal -> incomplete; unknown stays unknown |
| Gemini | STOP with text/no tool call -> complete; known non-STOP finish/block reason -> incomplete; absent/unspecified -> unknown |
| Mistral | stop -> complete; length/model_length/tool_calls/error -> incomplete; unknown stays unknown |
| Ollama | done+stop with no tool call -> complete; length or unfinished response/tool call -> incomplete; absent information -> unknown |
| AutoByteus RPA | current documented local response has no terminal reason -> unknown; network/explicit errors fail normally. No claim of portable generation-cap enforcement across RPA hosts |

Reject incomplete even when the closing tag is present. Unknown remains eligible only if framing/content/budget checks pass, matching the approved **known-incomplete** rejection requirement. Do not infer natural stop from token counts or claim tags detect every truncation. No remote RPA contract change or model exclusion in this task.

### Candidate construction and safe commit

Builder uses the baseline's preserved system messages, directly creates the summary user region with `createCompactedMemoryUserMessage`, marks the existing retained natural messages, applies the existing provider-native stale-thinking cleanup, and finalizes. Preserve the leading system head exactly and existing handling of other system messages (the current builder gathers system messages before the summary), with finalizer/planner ownership unchanged; do not promise unchanged original positions or invent a new role protocol.

Validator checks unchanged baseline/fingerprint, no input alias/mutation, exactly one new summary, structural/provenance validity, protected retained content/tool identities and parent post-compaction budget. Provider-native thinking redaction remains the explicit existing exception; no other tail changes. Selected raw IDs must equal the planner's selected source set, be unique/nonempty and exclude retained raw IDs.

Safe commit order, entirely behind MemoryManager:

1. Assert pending operation/authorized attempt, non-aborted signal and unchanged fingerprint. Validate/serialize candidate and preallocate the isolated in-memory WorkingContext copy before I/O.
2. `store.prepareCompactionArchive(selectedIds)` validates active membership and durably creates/reuses the selected evidence archive COPY **without pruning active data**. Keep current associated system-instruction archival policy. Return its boundary identity and archived IDs. Verify reused archive membership actually contains every selected trace; never trust boundary-name equality alone.
3. Write candidate through existing atomic snapshot-store replacement. This is the durable **commit point**. Before it succeeds, any error leaves old snapshot and active traces usable. The prepared archive may remain as an extra evidence copy and is safely reusable.
4. Install the preallocated context with a no-I/O, no-copy/no-callback operation; clear pending/advance existing threshold state using validated values. No fallible work that could pretend the previous snapshot remains authoritative after this point.
5. Best-effort prune only records proven present in that completed archive and not referenced by the committed snapshot. Pruning failure leaves duplicates and a warning, not a failed compaction or second model invocation. Corpus reader already deduplicates by ID.
6. Emit completed status safely and allow parent dispatch. Reporter failure is diagnostic; it cannot undo committed state.

Restart: old snapshot before commit, new snapshot after commit. If pruning failed, duplicate active/archive evidence may remain after restart. It does not change the restored snapshot, and corpus reads deduplicate IDs. Do not add an archive-wide restore scan, cleanup queue or durable journal merely to remove these copies. Normal successful commits prune their prepared selection; a completed boundary can be reused if that same selection is attempted after a precommit failure. Report retained duplicate bytes/cleanup failure as a diagnostic where known. No automatic inference re-run on restart.


### Held A, queued B — exact state transitions

**Do not requeue/repost A.** In LlmPhase, classify only `CompactionPreparationError` from the required-compaction assembly boundary as `compaction_blocked`, with current pending operation/failure epoch and the initial request phase identity. AgentTurnRunner retains `nextInput` and suspends on an abortable recovery waiter; it does not run response pipeline, notify completion, settle AgentTurn or clear active turn. Register the wait/block synchronously before publishing so a fast B cannot be lost. An early permit is latched once until consumed. MemoryManager remains authoritative for pending state; the runtime waiter only owns waiting/wakeup, not a second pending-operation record.

**Supported safe-point scope (SR029):** preserve `!identity.isToolContinuation` around assembler compaction execution. LlmPhase derives continuation from `turn.toolInvocationBatches.length > 0`; no independent supported path was found to a required-compaction block before a later tool-continuation send. Remove that branch, its phase enum/UI label, extra dispatch-crossed state and positive continuation-hold tests. Do not remove the gate or run compaction mid-tool continuation just to make a test reachable. The held A path is before its first parent dispatch. No repeated initial input processing or replay of already consumed parent/tool work remains a regression invariant.

The separate post-response executor is a real safe point, not the removed pre-tool-continuation branch. Its failure must obey the **same approved recoverable-error/fresh-admission policy**. SR029 preservation of its old final/isError -> IDLE and different-turn retry was incorrect and is superseded. See DS010 below: finish consumed A once, preserve run error, gate all queued work until a genuinely later user grants recovery. No post-response exception, suspended consumed A or new tool safe point. Generic parent API/tool errors remain outside compaction recovery.

| Event/state | Core turn/coordinator | Server queue/command/status | Next dispatch |
| --- | --- | --- | --- |
| A admitted/forwarded | Process A once; pending compaction operation starts | A forwarded, turn association retained; forwarded observer once | Parent still behind compaction |
| Operation fails before commit | New failure epoch; blocked phase awaits permission; active turn alive | Match turn; A held before its first parent send, not failed/completed; status recoverable error | No parent call, no drain/retry from existing queue |
| Existing queued B or unrelated activity | No permit | Keep queue, do not infer fresh recovery authorization | None |
| Genuine B admitted after block | Backend control validates exact live block; one permit consumed atomically | B appended behind A, command admitted; one recovery claim per epoch | Resume A's same phase, new strategy operation <=3 attempts |
| C arrives during recovery | Queue only, no saved future permit | C behind B; no overlapping claims | Current A recovery only |
| Recovery fails | New epoch, old permit revoked; retain same input | A/B/C held/queued; error again | Wait for another later genuine user admission |
| Recovery commits | Clear block, same initial phase appends A once | A remains same command/turn; do not emit forwarded twice | A normal parent request; B still waits |
| A normal final completion | Existing completion/settlement | Remove A once; existing FIFO selects B | B turn normally; no batch/simultaneous A+B merge |
| Interrupt/stop | Abort call/wait/permit; ordinary interrupted turn, no late install | Existing interruption/fence/cancel semantics; never reauthorize cancelled A | No resume of cancelled work; terminate closes admission and cancels queued entries |

**Actual recovery admission/linearization (SR029):** supported standalone user submission reaches AgentRun.postUserMessage through AgentRunCommandCoordinator; Team/Org user `SEND_MESSAGE` becomes `post_message` and reaches ConfiguredAgentExecutionHandle.postMessage -> the same AgentRun.postUserMessage. These routes build SenderType.USER input (Team/Org also record input_origin=user_message); ordinary RootCommunicationEngine delivery builds SenderType.AGENT input and uses reservations instead. The API class name `AgentInputUserMessage` does not make agent-origin input a user action.

Within the existing dispatchQueue callback, first reconcile a newly observed block and capture its entry-sequence high-water cut. Then `inputAdmissionState.admit` synchronously reserves/commits/releases the new input. **Only successful return of this immediate admit**, qualifying genuine-user origin and a live unclaimed blocked epoch allows the recovery claim, before ordinary input dispatch selection. Construct the admission identity from this newly admitted entry, not by scanning arbitrary queued/reserved entries. No await between admission and claim; mark the epoch claimed under the queue lock, then issue the native control outside the lock and reconcile under it. In held_turn, B stays queued while A remains active and is resumed. In next_turn, admission still does not dispatch immediately: wait for acknowledged grant and consumed A settlement, then allow one oldest FIFO entry through the independent core gate. No grant means no drain even with currentTurn:NONE. Concurrent B/C cannot both claim; during-operation C has no saved future credit. On each newly observed failure capture a new cut; do not reprocess old admissions. A duplicate/rejected command grants nothing. Core consumes the exact permit before compress; stale controls are no-ops/rejections, never an automatic retry on communication failure. Reconcile the live block when acknowledgment is uncertain rather than forwarding B.

`entry.sequence` is allocated at reserve, not at release. That is sufficient **only for this immediate postUserMessage admission path**, where reserve/commit/release occur synchronously in its serialized callback. It is not a universal successful-release clock. `reserveUserMessage` exposes synchronous commit/release callbacks outside dispatchQueue; inspected production callers are inter-agent deliveries. Their release can awaken the ordinary queue drain but must never mint a recovery claim, even if reserved before a block and released after it. No genuine-user reservation/release recovery ingress is established. Do not add release epochs, callback serialization changes, reservation-to-user promotion, or a positive reserve-before/release-after recovery test. Preserve reservation transaction/FIFO semantics. If a future supported user ingress actually uses reservations, investigate its origin and admission contract before broadening eligibility.

Use actual standalone/Team/Org user commands in positive integration tests, including B admitted while A is held; use actual agent-origin reservation release as a negative/no-wakeup test. Method names and test-only forged calls are not scenario evidence.

Existing input entry gains derived held status/fact while keeping its original message/turn association. The command registry treats held as outstanding (not FAILED/COMPLETED; not subject to terminal-record expiry); resume returns it to forwarded without repeating user-message-forwarded/history observers. Preserve early lifecycle-vs-dispatch-ack buffering for held facts just as current pending terminal handling handles races. Retirement only on actual turn completion/interruption/failure/termination, never a recoverable block alone. For a next_turn block, the real completion of consumed A must remove A without clearing the separate run gate.

Cancellation/termination: core waiter uses existing TurnExecutionScope signal and is cleared in finally. Explicit `prepareTermination` cannot simply quiesce and await a permanently held turn: fence new admissions, cancel queued entries per existing shutdown owner, interrupt the held turn, then wait for settlement using the existing stop deadline. Root shutdown uses the same fence. Ordinary interrupt semantics for other queued messages remain existing behavior; it must not resume cancelled A or consume a stale recovery permit. If only the active held/recovery turn is interrupted while the runtime stays live, retire that input under existing interruption semantics and move the still-required compaction gate to next_turn with a fresh epoch; it must not retain a waiter/held reference to the cancelled turn or let old queued work auto-retry. A future genuine user admission may recover for subsequent input, never resume cancelled A. Stopped/restarted runtime does not reconstruct pending A/B from raw history.

### Post-response exhaustion — exact path and gate (SR030 / prospective ARCH-F002)

This is SCN001's normal observed-threshold path plus SCN005 failure, not a new product scenario. LlmPhase has already streamed/ingested A's final answer and released its request snapshot when it evaluates compaction. Preserve that safe point and successful response.

1. Post-response executor fails after strategy exhaustion or precommit host rejection: retain valid memory and install `awaiting_user_retry` with a new epoch and `position:next_turn, failedTurnId:A`. Record that state **before** emitting diagnostic/block facts or returning final. Re-check interruption; user cancellation follows interruption, not a fabricated normal completion. No parent resend or second final-response generation.
2. Emit a separate scoped compaction diagnostic and typed block; return the **already-produced completeResponse**, not an error string masquerading as A's answer. Run its ordinary final response pipeline/lifecycle effects and ASSISTANT_COMPLETE/TURN_COMPLETED once. Worker clears settled activeTurn normally; its Idle/status event cannot clear the recovery projection. A's command becomes completed, not held or replayable. Public run status remains recoverable error with pending compaction and currentTurn:NONE after settlement.
3. AgentRun reconciles the pending gate before every claim/drain, including terminal-event and dispatch-ack drains; status error alone is not the gate. With next_turn.awaiting_user, `claimNextInput` returns no new native dispatch although A is gone. Core scheduler independently rejects every turn_start without a grant, including prequeued USER messages. Worker remains alive (its loop is governed by stopRequested, not the public ERROR label); lifecycle/stop lanes continue normally, no fatal exception/global error terminalization. No fabricated active A is needed to block FIFO.
4. A genuinely later user admission grants the exact epoch through the same authoritative path described above. Acknowledged grant permits one next FIFO input to enter core once A has settled; existing older queued entries keep their order. If B was already queued before failure and C is the fresh trigger: C authorizes; B is processed before C. If none was queued: new B authorizes and is next. That distinction separates **who authorizes recovery** from **which input is delivered next**, without a new queue or user-visible reordering policy.
5. Core binds grant to that next turn; external input pipeline runs once. At its existing initial pre-parent assembly, executor consumes the grant, compacts, validates and commits before appending/sending this input to the parent. Grant/start never clears the pending gate early. Success clears the exact epoch, normal parent processing/FIFO continues. If compression fails here, the new input is still unsent: create a new **held_turn** epoch and enter DS009. Consumed A remains completed. Inputs already queued or admitted during the failed recovery cannot authorize another cycle.
6. Fast B after failure but before A's terminal event is a valid new admission: latch next-turn permission; do not wake A's LlmPhase. A terminal received before the block event must still consult the authoritative snapshot so it cannot drain queued input; block/reconnect correlation is operation/epoch, not 'failedTurnId must still be active'. Duplicate/late terminal/status/block/resume cannot clear a newer epoch or emit another answer.
7. Stop/termination fences queue and revokes grants. With no active turn there is no A waiter to interrupt; proceed with existing resource shutdown instead of waiting for synthetic quiescence. With a newly started recovery turn, use existing turn signal/fence. An explicit interrupt before a granted next turn starts revokes unused permission and leaves context blocked; it must not authorize queue drain. No backend-restart persistence/migration or automatic recovery from historical messages.

| Arrival / transition | Post-response outcome |
| --- | --- |
| B queued before compaction or during its three attempts | A completes after failure; B stays queued; error stays; zero automatic retry |
| Fresh B after recorded exhaustion, before/after A settles | One next-turn grant; A finishes once; B compacts before its parent send |
| Prequeued B, fresh C after exhaustion | C supplies permission; B then C follow existing FIFO; no reorder/duplicate |
| C arrives while next-turn grant pending/recovery active | Queue only; no future credit if that recovery fails |
| Recovery fails before next input's parent send | New held_turn epoch for that input, visible error, require later fresh user again |
| Already-consumed A completion/late idle/reconnect | A remains completed; same live run error/gate remains until real recovery or stop |

This replaces two unsafe old policies, not compaction timing: clearing failure on turn settlement and treating a different queued user turn as proof of fresh intent. No extra compression operation outside the existing two safe points is introduced.

### Minimal UI projection

Bind messageId/dedupeKey to the optimistic standalone message before sending, as well as team/member submissions. Use exact run + message identity to merge live pending projection; do not add another bubble for A on recovery. Preserve original recording attachment locators and user-visible attachment references; no re-upload or provider-path ownership bypass. B may be shown queued as soon as admitted; acknowledgment clears submissionPending independently of eventual forwarding, permitting another later input after error.

Existing error UI distinguishes positions: held_turn shows A “Held — waiting for compaction” and no false AI completion; next_turn retains A's actual completed answer and shows a run-level “Compaction failed — send a message to retry” error without labelling A unsent. Remaining inputs show “Queued”. Keep a usable composer in both recoverable error states; do not reactivate/create another backend merely because status is Error or no turn is active. Use recoverableBlock + runtime availability (not active-turn presence) to distinguish this from offline/fatal error. During recovery retain existing Running/interrupt primary-action behavior; no new general busy-send control. On same-live-run reconnect, merge server pending snapshot and revision, not automatic SEND_MESSAGE replay. On backend restart, stale pending badges are no longer authoritative; show no promise of resumption and retain history. Minimal component styling follows existing message/status conventions; no Product redesign handoff requested.

## Operating Assumption


**ASM-022-01 — Natural summary compression.** For the long conversation histories that trigger compaction, we assume that an LLM given a clear summarization task will normally produce a substantially shorter continuation summary without being told a numeric token target. We rely on this behavior in the normal compaction path. The summary is not intended to reproduce the transcript or retain a fixed percentage of its tokens.

A long history contains repeated discussion, intermediate reasoning, superseded plans, repeated status messages, and verbose tool results. A continuation summary selects the current goal, still-applicable constraints, important decisions and findings, completed and pending work, and the exact references needed to resume. Much of the original volume is therefore not required in the replacement. Our input preparation also excerpts large tool results before they reach the summarizer. The summary's useful detail is driven by the task's state and remaining work, rather than by the length of the source history alone.

The practical basis is the user's extensive experience with LLM summarization: even very large histories ordinarily result in comparatively short summaries without a requested token count. For this design, that experience is sufficient to adopt natural compression as an operating assumption. We do not require an exact input-to-output ratio, a fixed output length, or further experiments to justify omitting a numeric prompt target. Illustrative input/output sizes are not acceptance thresholds.

**Design consequence:** ask for a concise but sufficiently detailed continuation summary using the approved content and output instructions. Do not add “approximately N tokens,” a word-count substitute, a fixed bullet quota, or a summary-size parameter to the replaceable transformation contract. Do not sacrifice important continuation information merely to hit an arbitrary target. On repeated compaction, the selected prefix already contains the prior summary once; the result is one updated replacement, not an accumulation of summaries.

**Separate boundary safeguards:** retain the provider's hard output cap, rejection of known incomplete output, and the existing final-context fit check before installing the replacement. These enforce resource and state boundaries; they are not instructions to produce a particular summary length. If a candidate fails those checks, retain the valid baseline and follow the approved failure policy. This operating assumption is not a promise about every possible input, and it does not justify removing those existing safeguards.


## Main Domain Subject Naming Check

CompressionStrategy is content transformation, not a context planner. DirectLlmCompressionStrategy names its implementation. CompactionContentBuilder names prepared content. AgentRunInputAdmissionState remains queue authority. CompactionRecoveryController (new small runtime-owned waiter/control) owns phase wakeup, not messages. No new “Manager/Support/GenericStrategyRegistry” indirection. Names natural; no invented multi-algorithm product.

## Existing Capability / Subsystem Reuse Check / Subsystem Allocation

| Need | Decision / subsystem owner | Reason |
| --- | --- | --- |
| FIFO/input identity/command dedupe | Extend existing server agent-execution input/domain/services | Already authoritative; no frontend/core duplicate queue |
| Phase wait/cancel | Extend core agent runtime/turn + small compaction recovery controller | Existing execution scope can suspend without re-ingestion; no durable scheduler |
| Compression algorithm | Introduce interface + replace existing direct class in memory/compaction | True narrow replacement axis; no algorithm registry |
| Transport no-retry | Extend existing LLMInvocationOptions + adapters | Provider translation belongs there, not executor |
| Live status/input state | Extend existing presentation contracts/streaming/UI state | Single producer-owner, multiple typed projections; not disk schema |
| Snapshot/archive/settings | Reuse current IR003 owners unchanged | New behavior does not need a new persisted format |

## Draft File Responsibility Mapping -> Reusable Owned Structures Check

Initially placing all logic into PendingCompactionExecutor would mix retry policy, provider construction, input delivery and status. Instead extract only the true shared contracts: `compression-strategy.ts` for text; `compaction-execution.ts` for optional attempt observations/errors; runtime `compaction-recovery-controller.ts` for held-wait/next-turn binding lifecycle; existing server input contract for held facts; shared presentation DTO for wire input-state projection. No one all-optional “compaction context” carrying stores, messages, credentials and provider results.

| Shared structure | Tightness / redundancy decision |
| --- | --- |
| CompressionStrategy | One text input/output; no duplicate previousSummary or size target |
| CompactionCompressionExecution | Operation binding only, no content; typed callback, no model credentials |
| Block identity / permit | Run boundary plus exact turn/operation/epoch; not message ID reused as turn identity; permit private and one-use |
| Input lifecycle state | Original entry identity and one state; held not copied into another queue |
| Input presentation snapshot | Revisioned projection, not new authority; no duplicate canonical message text store |
| Compaction proposal | Delete mandatory provider execution; only memory replacement facts needed by acceptance |

## Final File Responsibility Mapping / Target Subsystem-Folder-File Mapping

Paths below are relative to worktree. `C=autobyteus-ts/src`, `S=autobyteus-server-ts/src`, `W=autobyteus-web`. Existing files altered unless marked new/move/delete. Detailed preserved removal table above remains cumulative scope, not a request to reintroduce already-deleted files.

| Paths | Concrete responsibility / why here | Must not contain |
| --- | --- | --- |
| C/memory/compaction/compression-strategy.ts (new) | Minimal content interface | Units/provider/storage state |
| C/memory/compaction/direct-llm-compression-strategy.ts (replace old summarizer file) | Three-attempt direct transformation, framing/completion/capacity/cleanup | Planner, queue, persistence |
| C/memory/compaction/compaction-summary-parser.ts | Provider-envelope parser plus extracted shared pure six-heading body validator | Host parsing tags from strategy result or format repair |
| C/memory/compaction/compaction-content-builder.ts (rename old prompt builder); existing history renderer | Prepared selected content before strategy | Retry/LLM creation |
| C/memory/compaction/{memory-compaction-configuration,pending-compaction-executor,working-context-compaction-proposal,compaction-execution}.ts; C/memory/index.ts; agent/config references | Factory interface wiring, one-call orchestration, metadata removal/exports | Concrete class outside composition |
| C/memory/{memory-manager,memory-manager-compaction-coordinator}.ts | Failure epoch/permit consumption exposed through owner | Server queue authority |
| C/agent/compaction/compaction-recovery-controller.ts (new); compaction-preparation-error; retry-turn-admission-policy | Abortable held wait, next-turn grant binding; remove queued-user/different-turn proxy for both paths | Generic input queue or timer auto-retry |
| C/agent/{agent,agent-turn}.ts; context state; loop/{llm-phase,agent-turn-runner}; runtime/{agent-runtime,agent-worker} | Native control facade, phase suspend, prepared input retention, initial-phase hold and real post-response response settlement/run gate; continuation safe-point exclusion preserved; stop cleanup | Input replay through pipeline on resume |
| C/agent/event-inbox/{agent-event-scheduler,agent-event-inbox}; runtime worker | FIFO claim/grant binding, successful enqueue receipt for core embedding, no prequeued-origin bypass | New input queue or grant consumed by peek/poll |
| C/agent/events/{agent-events,notifiers}; status/{status-deriver,status-update-utils,manager}; streaming/events and notifier/event mappings | Typed run block/resume and effective status projection independent of phase hooks/turn completion | Generic fatal event or suppressed/duplicate final-response hooks |
| C/llm/base.ts; api/{openai-compatible-llm,openai-responses-llm,anthropic-llm,gemini-llm,mistral-llm,ollama-llm,autobyteus-llm}; C/utils/gemini-helper.ts | Invocation-local single-attempt controls, SDK mapping/cancel | Global parent retry changes or retry strategy loop |
| S/agent-execution/backends/autobyteus/*factory.ts; agent-execution/compaction model factory | Construct operation-scoped direct implementation, current parent getter/settings | Old-agent settings lookup |
| S/agent-execution/backends/agent-run-backend.ts; native backend and events/{autobyteus-stream-event-converter,autobyteus-status-projector} | Capability/authorize control, typed block fact translation, active-availability error snapshot with or without active turn | Queue mutations or copied messages |
| S/agent-execution/input/{agent-run-input-contract,agent-run-input-admission-state}; domain/agent-run | Original entry held projection, post-block admission cut/claim, snapshot revision, FIFO gate even after A retires, acknowledged one-next-turn dispatch and fence | New persistent queue/repost A |
| S/agent-execution/domain/{agent-runtime-lifecycle-snapshot,agent-run-event,agent-status-payload}; events/processors/lifecycle-status | Recoverable run error independent of currentTurn; settle real consumed A without clearing gate | Retiring active blocked turn on generic Error test |
| S/agent-execution/services/{agent-run-command-coordinator,agent-run-command-registry}; shutdown owners | Outstanding held command, no terminal TTL/duplicate forwarded; held-turn stop | Generation retries or durable outbox |
| autobyteus-agent-presentation-contracts/src/*; team-stream/collaboration-stream contracts and current projectors | Tight live DTOs and exhaustive routing | Historical schema conversion or dropped unrelated backend fields |
| S/services/agent-streaming/{agent-stream-handler,agent-team-stream-handler,agent-org-stream-handler}; applicable application-agent-streaming projectors | Exact live run subscription snapshot/revision + events; scoped routing | Cross-run/unauthorized pending content |
| W/types/{conversation,agent/AgentContext}; services/runSubmission/localUserSubmission; stores/agentRunStore and team/member submission seams | Optimistic identity assignment, admitted/held pending state, no false reactivation | Authoritative queue/resend |
| W/services/agentStreaming/{protocol,handlers,projectors,AgentStreamingService,TeamStreamingService}; services/runStatus/agentRuntimeStatusState | Typed state reconciliation, recoverable-error nonterminal handling | Treating forwarded ACK as parent consumption |
| W/components/conversation/UserMessage.vue and existing compaction status/input components | Minimal held/queued label and recoverable error composer | Queue editor/busy-send redesign |
| Existing colocated/core/server tests; TESTING.md surfaces | Cases below, contract build/typecheck/source audit | Provider retry-until-green, unapproved v6, user private history |

## Folder Boundary Check / Applied Patterns / Derived Layering

Keep memory transformation/commit under existing memory/compaction; runtime waiting under agent/compaction; queue under server agent-execution/input, transport projection under streaming/contracts, view state under web. No new broad subsystem/folder hierarchy. Runtime controls are not placed in strategy merely because both mention compaction. Dependency injection + Strategy are genuine; the one small phase waiter is a runtime mechanism, not a second scheduler. Existing FIFO/state machines/atomic writer are reused. Extra layer taxonomy N/A — spines already expose ownership.

## Concrete Examples / Shape Guidance

Good: executor builds `content`, factory binds controls, `const summary = await strategy.compress(content)`, host accepts/commits. Test implementation is `{async compress(content) { return fixtureSummary; }}`; no BaseLLM inheritance, provider metadata or WorkingContext argument.

Good: A input pipeline runs once -> blocked wait -> B server admission -> permit -> same phase -> A parent response -> A completion -> B dispatch. Bad: `postUserMessage(A)` again, synthesize B as A's replacement, or `while(queue.length) retry()`.

Good: same operation content + three fresh client calls with SDK retries off. Bad: host three attempts × SDK three attempts, automatic v6/shorter prompt on failure, or retrying a committed checkpoint because cleanup threw.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision / clean cut |
| --- | --- |
| Original categorized interface + compatibility implementation wrapper | Rejected: new text contract, old types removed; historical original still acknowledged as real interface |
| `.summarize` alias / structured overload alongside `.compress` | Rejected: migrate workspace callsites/tests together |
| Registry/strategy settings/old-agent fallback | Rejected: one injected direct implementation, current optional model settings only |
| Dual retry owner or optional host fallback | Rejected: strategy internal attempts; explicit new-user permit only outside |
| Generic failed-message replay or second frontend queue | Rejected: retain same active phase/input and reuse AgentRun queue |
| Version marker/new bulk migration/durable retry journal | Rejected: current semantics directly usable, live pending queue not persisted |
| Remove historical categories/old diagnostics to simplify readers | Rejected: preservation approved; only current-generation dependence removed |

## Change / Refactor Sequence

1. Characterize exact current v5/rendered request, candidate/commit and input queue behavior; freeze SR028 approved expectations with SR029 supported-path/output clarifications. Preserve IR003/CRR/API artifacts and source hashes. No new provider observation needed for the deterministic architecture changes.
2. Introduce text interface + operation construction, move renderer/builder, replace direct class and proposal metadata. Implement internal 3-attempt loop and invocation-local adapter controls together. Do not temporarily ship 3x3 behavior. Delete old contract/aliases.
3. Add coordinator permit/failure epoch and native phase recovery controller; replace false final/completed outcome with abortable same-turn suspension. Preserve prepared initial input and no-compaction-on-tool-continuation gate. Correct post-response path to retain normal answer/complete A but latch run error and require a genuine fresh-admission permit. Remove origin-only/different-turn fallback in core admission; no continuation-block variant or duplicate raw/history writes. Cancellation/shutdown tests first.
4. Extend native backend control + shared server queue/lifecycle/status contracts atomically. Add fresh-user admission cut/claim and held outstanding command projection. Test early events/ACK, consumed A completion before/after block delivery, prequeued/during-operation arrivals, duplicate B, same-turn and next-turn permits, repeated failure and termination.
5. Extend shared presentation DTOs and all existing live stream paths; minimal frontend ID/status/held/queued handling and same-live-run reconnect. No durable queue schema. Keep external runtime append/wait behavior unchanged; unsupported capability never calls native recovery.
6. Re-run preserved settings/snapshot/frozen-upgrade/commit fixtures proportionately; source/build/type checks plus core-server-web integrated scenarios below. No claims from compile alone. Docs sync later owned by Delivery; architecture review precedes implementation.
7. Coordinated core/contracts/server/web release only after normal downstream gates; stop old writers. No dual wire/runtime compatibility branch. Recheck origin/personal as required at finalization, protect pending work; no SD commit/push/rebase/release in this round.

## Key Tradeoffs / Risks

Same-turn suspension for unsent input avoids raw-ingest replay, ID reassociation and provider/tool duplicates, but keeps one live turn pending until recovery or explicit stop; shutdown must abort it rather than wait forever. Queue is in memory: no backend-restart delivery promise. User gets error plus a usable composer, which requires removing only the recoverable-error terminal assumption, not redefining all status semantics.

Uniform three-attempt policy can repeat permanent API failures and consume cost; explicitly approved, not optimized away by status classification. Provider calls may be slow under existing timeouts. Local single-attempt transport bound requires actual SDK tests (Gemini client-level handling is especially easy to get wrong). Remote internal work cannot be counted from client metadata. Shape/fit checks do not prove summary truth; accepted Qwen deviation remains recorded, not a remedy claim.

Host acceptance/commit failure is not a compression retry: preserve pending run gate and wait for user, holding only input not yet sent. Run error can legitimately coexist with a completed A and no active turn. Atomic snapshot boundary remains the only installed-state authority; postcommit warnings cannot re-open failure. Protocol/contracts changes need all typed routes updated, including Team/Org/native attachment ownership; a standalone unit test is not full integration evidence. Historical runtime/readers remain supported without global migration gate. No private dataset or full power-loss evidence claimed.

## Guidance For Implementation / Verification Matrix

| Layer / IDs | Required cases |
| --- | --- |
| Strategy contract AC015/016 | Plain string-in/string-out; independent test implementation through actual executor/config; no concrete imports/provider fields; selected previous summary once, exact v5, numeric prefix absent, tool excerpt/full user text unchanged; direct parser->body->host and independent body->host succeed; tagged/invalid independent result rejected with one call |
| Direct attempts AC006/013 | Success 1/2/3, fail3/no4; API401/429/5xx/timeout, empty/malformed/known-incomplete, local config/capacity failure; identical content/prompt, unique invocation IDs; cancel before/during call/waits, safe cleanup/report failure; no repair/host retry |
| Adapter transport AC006/010/013 | Actual installed SDK fake fetch per family, one outbound generation each call incl transient/permanent errors; parent retry defaults unchanged; Gemini client override correct, no extraParams bypass; no real provider calls required |
| Memory AC001–005/011 | First/repeated one-summary context, safe head/tail/tool groups/final fit; injected oversized or malformed strategy result rejected; archive/snapshot faults unchanged baseline; prune/report failures after commit not retries |
| Core phase AC005/013/014 | Input pipeline/raw ingest once; register-block-before-wake; same turn/prepared input resumes; no false final/IDLE; no parent until commit; tool continuation skips compaction execution and replays no tools; post-response failure preserves final answer/normal hooks and completion once while effective error persists; late output cannot commit after abort |
| Post-response/core AC005/006/013/014/017 | Actual normal no-tool response crosses threshold, compression fails3/no4, answer completes once/no replay, ERROR survives settlement; prequeued USER and agent/system inputs cannot self-retry; later user grant binds oldest FIFO turn, compacts before parent; failure becomes held new input; phase hooks once; cancelled input pipeline revokes unused grant; known-undelivered server normalization/dispatch revokes exact unused permission, uncertain dispatch is not replayed |
| Queue/server AC014/017 | Actual AgentRun with native backend core: A held, B queued/new-user permit, A then B; duplicate B, early block before dispatch ACK, C during retry, repeated failure with no saved credits, stale block/resume, other-run isolation; actual standalone/Team/Org user ingress wakes A without forwarding B; agent-origin reservation release does not authorize recovery; next_turn/no-active gate blocks terminal drains, prequeued B + fresh C executes B then C, fresh grant before A completion latches only; forwarded/history observer once; held registry not terminal-expired |
| Shutdown/resume AC008/013/017 | Interrupt blocked/active recovery, explicit/root termination without quiescence deadlock, no cancelled A resume; same-live-process reconnect correct revisioned pending view; backend restart does not fabricate queue replay; existing stored context resume intact |
| UI/stream AC014/017 | Real submitted text + admitted attachment, optimistic ID, error/held A, usable composer, B queued, success clears hold without duplicate bubbles; no forced backend reactivation on recoverable error; strict DTOs standalone/Team/Org routing; held phase not marked final; post-response A correctly completed while run error/composer remains, no forced reactivation with currentTurn:NONE; existing busy UI unchanged |
| Preserved AC008–012 | Current default parent/settings tuple, no import/default write, historical inspector; current/frozen snapshots, writer cuts/raw-ahead repair and scoped migration dispositions unchanged |
| Regression / boundaries | Other runtime append and undeliveredRetryAsStart behavior unchanged; no new migration/selector/legacy import/child compactor; build shared contracts/core/server/web, targeted tests and realistic isolated desktop/API/UI under root TESTING.md |
| Quality / prior gates | No rescore by SD. Future representative DeepSeek validation separately predeclared by API owner; STOP Qwen; exact v5. Preserve SR022-Q01 and all prior failures; eventual nine API-path successful-test review and Delivery/user verification still required |

Use tests for evidence, not to redefine approved scope. No live provider calls or credential access authorized by this design handoff. No new API acceptance round/result is claimed; API005 remains interrupted pending revised implementation. API004 Fail90.7 remains historical last complete; F005 accepted known/nonblocking/not fixed; F004 unknown; F006 corrected. Prior ARCH002/CRR0059.40 apply only to earlier structure. Ongoing independent architecture review includes SR030 correction for prospective ARCH-F002; reviewer owns final finding/verdict. Rule classification remains Large/High; implementation/source/API/Delivery follow their own gates.


## SR033 terminal-activity design delta, refined SR034 (authoritative)

### Approval / intended change / current-state evidence
REQ013/AC018, BEH007, SCN006 are Approved. Exact English status and primary terminal copy: **Stopped**, no suffix or animation. Preserve identity and factual metadata; no success, retry-exhaustion or rollback fiction. Already-known completed/failed results stay. This is native operation presentation, not a new recovery/dispatch policy. Product Design/prototype: N/A — existing card, neutral stopped treatment, no new workflow/layout.

E33 traces the native/standalone path; E34 completes the existing Team/Org paths, correcting the standalone-only response reconciliation omission in the initial SR033 design. Native executor catch reports abort as failed. TurnExecutionScope.runAbortable can settle the turn before an underlying provider promise settles. Native backend closes/unsubscribes the stream before removing/stopping the agent; its detached pump checks a shared closed flag and can discard already-enqueued events. Core AgentEventStream.close already enqueues a FIFO sentinel. AgentRun awaits backend termination OUTSIDE dispatchQueue, then performs final queued cleanup/Offline/unsubscribe. Client success teardown removes its WebSocket listener. Producer settlement, server queue drain and client receipt are therefore distinct boundaries.

API log at22:12:32.471 records failed/cancelled for operation compaction_operation_muonu3xf_3/turn0013; stream close at22:12:32.473 precedes factory removal/worker stop. This supports the boundary finding, NOT a claim that the precise lost network packet was independently traced. Corrected API evidence establishes successful Terminate/abort/no H dispatch and stale same-tab card, not durable native replay or renderer reconnect.

### Behavior and production-path map
| Behavior / approved IDs | Trigger and preserved outcome | Spines |
| --- | --- | --- |
| BEH007 / REQ013 / AC018 / SCN006 | Normal native-run Terminate, directly or through the existing containing Team/Org root Terminate control: Offline, retained non-active historical Stopped card, cancelled input not dispatched | DS011, DS011T/DS011O command, DS012 return/event |
| BEH005 / REQ004/005/012 / AC005/013/017 | Actual cancellation before late result: no late commit/new attempt/recovery credit; existing fresh-user policy remains | DS012a bounded execution |
| BEH004/007 / REQ007/013 / AC008/018 | Inspect/reopen saved run then optionally send new message: no generation merely to inspect, no old operation resurrected | DS013 existing hydration |

### Design health / refactor posture
Posture: bounded behavior clarification and lifecycle correctness fix. Root cause: **Missing Invariant / Boundary Or Ownership Issue**: no stopped phase, and event consumer disposal can precede final producer events. Persistence is NOT demonstrated as the cause.
**Refactor needed now: Yes, narrowly** — explicit native stream/pump lifetime and one renderer phase vocabulary/terminal projection. Reuse executor/reporter, AgentRun serialization, adapters and activity store. No new coordinator, queue, registry, retry owner or provider framework. SR034 also corrects the native activity source-coverage mismatch at the existing atomic activity replacement boundary. Do not redesign general shutdown, external-provider telemetry or the bounded activity-window lifecycle. Exact packet-loss timing and real reopened-view proof remain executable evidence gaps, not an intended-behavior decision.

### Persisted data / state transition / history boundary
**Not Affected for stored formats; no migration or new native activity persistence in SR033.** Native CompactionRuntimeReporter logs/notifies, not writes. AgentRunMemoryRecorder deliberately excludes native runs. Normal local-memory replay maps provider_compaction_boundary, not native status. Captured native terminated/final raw files contain user/assistant/operation_boundary/system_instruction, no compaction-status record.

Preservation means **do not delete the displayed card to hide the defect and do not rewrite historical facts**. Set Stopped on the card retained by the current activity window. SR034 changes guarded projection replacement to retain already-known terminal native compaction activities that the native saved projection does not cover (rule9); ordinary100-item eviction, explicit clear/release and process lifetime remain. This is reconciliation of existing in-memory presentation, not native cold reconstruction or a second activity cache. Native cold hydration must not invent an absent activity, infer an outcome from Offline, or add a durable journal. It must preserve the meaning of actual saved records and cannot resurrect a terminated operation as active. New work must not relabel a retained old card. This is not a new guarantee to reconstruct every live native card after browser/process loss: that is not the existing native history contract and the corrected evidence supplies no such premise. The actual saved-reopen/no-generation check remains required under existing history semantics. A test deleting the card, skipping real hydration, or merely returning a “reload” string is not proof of preservation.

Guideline reread: autobyteus-server-ts/docs/design/data_migration_guideline.md. Native snapshot/raw/archive/settings formats and frozen released converters stay unchanged. No transformation/admission gate; new migration steps/source-dispositions/startup marker N/A. Prior SR018/019 upgrade dispositions and tests remain. No private installed-data census, new startup scan or global readiness dependency. If an additional expectation requires new native activity persistence, return Requirement Gap/Design Impact rather than silently add it or claim durable replay was proved.

### Spines, narratives and owners
| Spine | Scope / arrow chain | Narrative / governing owner |
| --- | --- | --- |
| DS011 | Primary: Terminate UI -> existing API/service/root preparation -> AgentRun committed termination -> native backend -> factory -> runtime/worker | Existing lifecycle owners perform shutdown. Compaction is not a second shutdown authority; successful command result, not clicking/disconnection, confirms termination. Root/configured readiness remains intact. |
| DS011T | Primary: TeamMembersPanel Terminate+confirm / workspace-history Team Terminate -> agentTeamRunStore.terminateTeamRun -> GraphQL/team-run-service -> AgentTeamRunManager -> RootTeamRun frozen descendant scope -> configured handle -> AgentRun/native stop -> successful root response -> member activity reconciliation -> stream disconnect/Offline -> card | Root lifecycle remains server-owned. Renderer root store applies confirmed evidence to all retained exact native member contexts, not only the focused member. |
| DS011O | Primary: workspace-history Org Terminate -> useWorkspaceHistorySubjectActions(action=stop) -> agentOrgContextsStore.stopAndInspect (retire old stream) -> agentOrgRunStore/GraphQL/service/manager -> AgentOrgRun frozen root-agent and Team scopes -> member AgentRun/native stop -> success -> retained activity reconciliation -> markHistorical -> readInspection/stage/publish -> card | Org contexts store owns command/view sequencing. Retire-before-request remains intentional; successful response is essential for the initiating view. Lower transport store stays transport-only. |
| DS012 | Return/event: turn AbortSignal -> executor terminal fact -> reporter/notifier -> AgentEventStream -> native backend converter/pump -> serialized AgentRun -> existing standalone/Team/Org projection -> activity store -> card | Core knows cancellation/commit; backend drains final events; normal adapters transport them. Successful backend-command reconciliation covers the unresolved matching card before terminal view/inspection publication: standalone/Team before owned disconnect; Org after its intentional earlier disconnect. |
| DS012a | Bounded local: register abort -> execute/validate/commit or stop -> one terminal emission -> detach listener | Per authorized executor call, not an operation ledger. Abort race can settle the turn before the provider promise rejects. |
| DS012b | Bounded local: stop producer subscription with sentinel -> consume queue -> finish source listeners -> dispose pump | Native backend owns its concrete stream session. Never await provider generation or browser ACK for presentation drain; never hold AgentRun dispatch lock while waiting. |
| DS013 | Secondary: successful Org Stop or saved selection -> existing inspection/projection -> native raw replay -> stage activities -> atomic revision-guarded replacement retaining uncovered terminal native facts -> adopt/publish contexts -> render; later send -> ordinary activation | Saved reader owns actual stored facts; activity store owns already-retained native terminal cards. Neither fabricates missing native history. No generation to inspect; no retry permission/FIFO reconstructed; no durable replay claim from same-tab retention. |

Off-spine concerns: phase vocabulary/formatting serve presentation; operation/turn identity serves correlation; stream resource cleanup serves native backend; memory persistence remains unchanged. Public termination facade stays thin over existing lifecycle owner. Frontend cannot call factory/MemoryManager, executor cannot call server/activity store, backend cannot mutate Vue or fabricate a memory result.

### Interfaces and precise lifecycle rules
1. **Phase contract:** add stopped to native CompactionStatusPhase; use existing COMPACTION_STATUS and operation/requested/execution turn IDs and known metadata. No new event kind/version/terminal boolean, provider-boundary impersonation or error-string parsing. Core transport carries string phase and shared strict presentation DTO phase is a nullable non-empty string: no new schema key is needed. Verify strict Team/Org forwarding unchanged.
2. **Emission ownership:** in PendingCompactionExecutor.executeIfAuthorized register a scoped abort listener before awaited work and handle an already-aborted signal. On actual owner signal abort, promptly emit stopped with known identity/facts even if provider ignores cancellation. A local call emits at most one terminal completed/failed/stopped. Remove listener in finally; suppress later contradictory/duplicate terminal emissions. Existing signal checks/commit fence remain. Successful synchronous commit wins over subsequent abort and stays completed. Ordinary provider/format/storage/timeout failure without owner abort remains failed. Do not infer cancellation from substrings. Keep existing recovery/revoke/retire semantics and error propagation; no new retry or revival of a retired input.
3. **Execution versus gate:** failed/stopped terminate the reported execution, not necessarily the pending gate lifetime. A later genuinely authorized same-live-run recovery may use that gate's existing operation ID and emit started again. Do NOT install a universal terminal-phase monotonicity rule. After normal Terminate, a new runtime uses a separate operation ID; do not correlate by reset turn number or latest-row position. Never bulk overwrite completed/failed cards.
4. **Backend shutdown:** retain the pump Promise and concrete stream/session identity. Keep subscription alive while core shutdown is requested/completed, then close producer subscription/enqueue existing sentinel and drain queued events/source-listener promises before final disposal. Do not set the consumer discard flag before drain. No new subscriptions after terminating/terminated; old pump finally must not close a replacement. Last-subscriber disposal is cleanup, not user-termination evidence. AgentRun keeps backend await outside dispatchQueue and final cleanup/unsubscribe after it. Source listeners cannot await their own pump or termination from inside the queue.
5. **Bounded drainage:** use one native termination deadline (existing10s budget), covering removal and graceful event drain, forwarding remaining timeout through the existing native factory callback if necessary. No extra repeated10s wait. At remaining-budget expiry, dispose the projection stream and diagnose incomplete delivery; do not block confirmed resource shutdown forever waiting for presentation. Keep command/resource outcome truthful: projection loss does not undo successful shutdown, resource failure does not become success, timeout proves no provider result. No browser ACK protocol or generation/termination retry.
6. **Backend-confirmation race — common contract, all three existing command owners:** server drain cannot order HTTP response against WebSocket receipt; Org intentionally removes its listener before issuing Terminate. Successful termination evidence must reach presentation at standalone agentRunStore.terminateRun, Team agentTeamRunStore.terminateTeamRun, and Org agentOrgContextsStore.stopAndInspect. No standalone activation bypass. The detailed root flow below is mandatory.
   - Capture the request's existing root/context and stream ownership, bound-node revision, member run IDs/addresses and native activity IDs before await; capture each available inputProjection.runInstanceId and state object. Use current native operation-derived identities, not a turn-number/latest-row guess. This is a bounded call-local snapshot of existing data, discarded on return, not a retained command ledger.
   - After the actual matching backend success only, ask the existing activity store to settle still-unresolved (requested/started) eligible native activities and return the matching current-status projection. Completed/failed/stopped facts are unchanged. Preserve original timestamps, identity and factual metadata. Backend success establishes that the execution is no longer running, not compaction success/exhaustion/rollback.
   - A same-owner native activity first observed while the request is pending may also qualify; never include a new runtime or another root/member. A different non-null run-instance ID, replaced context/state/transport or changed node binding rejects broad current-state reconciliation/teardown. Null after ordinary terminal input cleanup is not itself evidence of a new runtime: retain the captured identity and require unchanged enclosing ownership and exact native operation identity. When proof is absent do not guess or mark a replacement Offline.
   - Apply reconciliation synchronously before owned disconnect/Offline cleanup or hydration, guarding teardown/history mutation as well as the card. Do not place this in generic applyOfflineOrTerminalCleanup, setActive(false), markHistorical or a stream-disconnect callback; those have non-command callers. Failed/partial/unaccepted termination, temp close, arbitrary Offline/idle and transport loss confer no root-wide stopped result. Independently received real compaction final events remain valid even if the enclosing command later fails.
   - Repeated confirmation is idempotent; no activity creation when absent, no second terminal timestamp on repeats, no new provider call, generation credit or queue mutation.
7. **Rendering:** stopped is center-feed-visible and complete for window eviction. Status and primary text are **Stopped**, no suffix/spinner; neutral gray/static stop icon in existing row. Preserve turn/model/count metadata; no invented count or success/cancellation detail and no old exhaustion error as primary stopped text. Existing completed/failed styling stays. No new button or layout.
8. **One frontend vocabulary and projection boundary:** types/activity/compactionPhase.ts owns five phase values and type/active/complete predicates. State, payload, live projection, hydration and window policy import it; remove duplicated unions/guards. Existing compactionActivityProjection remains the event-to-activity identity owner. Replace the unimplemented SR033 compactionActivityTerminalization.ts proposal with one pure services/activity/nativeCompactionActivityReconciliation.ts, owned by the activity capability: native identity eligibility, confirmed-termination transformation and retaining terminal native facts during saved-projection reconciliation. It imports types/predicates, not Pinia/network/context/root owners. The activity store calls it; lifecycle stores call public activity-store actions, not the helper as a second boundary.
   - A public store action (e.g. applyConfirmedNativeTermination(runId, activityIds, currentStatus, at)) updates matching existing activities through normal revision/window mutation and returns the matching current-status projection for its context owner to assign synchronously. It does not find roots, dispatch termination, decide success, change input gates or hold contexts. Callers establish command ownership and pass only eligible exact native IDs. Current status is an existing view, not new authority or a parallel stored copy.
   - Native eligibility uses current operation identity (activityId = compaction:operation:<compactionOperationId>, nonempty operation ID) and excludes provider-boundary identity/metadata; command caller also checks the existing autobyteus runtime configuration. summarizerProvider is ordinary native metadata, not an external-runtime marker. No legacy turn-ID fallback, provider-status heuristic expansion or error-string parsing.
9. **Retained native history at the existing activity store:** replaceProjectionActivitiesIfRevisions must still validate all run revisions/duplicates before publishing any run. Within that same synchronous atomic replacement, compose incoming projected activities with existing same-run native compaction activities whose current phase is completed, failed or stopped and whose identity is absent from the projection. Those facts are already in the bounded activity store, whereas native saved projections do not contain them. Keep the actual record fields/timestamps/IDs; one record per identity, chronological stable ordering, then the existing100-item window/highlight/approval rules. Do not copy tool/provider/system activities from the old store under this policy. Do not retain unresolved native cards merely because the run is Offline; no conversion during hydration. Exact duplicate IDs remain single records, and a retained terminal native record must not become nonterminal from a saved projection. A genuine subsequent live started event may still update the same pending gate under rule3; this is NOT universal terminal-phase monotonicity.
   - Do not clear activities before staging, reinstall them after the atomic commit, or keep a separate root cache/receipt table. A revision conflict still rejects the entire staged commit with no partial publication. A retry reads current facts. Explicit clear and ordinary eviction remove cards normally; cold empty stores reconstruct only actual stored records, never these missing native events.
   - This store-level composition covers Org stop-followed-by-inspection, later Org stream hydration, Team root/member hydration, and standalone saved projection using the same public replacement action. It preserves the displayed approved history without modifying native raw writers, persisted schemas, user messages or current runtime-status snapshots. It does not manufacture generation-free-reopen evidence.


### Supported root scope and exact success/inspection sequencing (SR034 / ARCH-F003)
**Scope basis:** REQ013 applies to native activity of the terminated execution, not only a standalone screen. SCN006 names the normal Terminate control without a standalone exclusion; REQ005/AC013 already require termination to stop compaction. Existing Team and Org controls terminate those same member AgentRuns. There is no approved standalone-only exception to cite. This is a missing target path within Approved SR033, not a new product behavior or universal external-provider cancellation policy. Requirements remain byte-identical; no renewed approval is needed.

**Server success meaning (reuse, do not redesign):** Team closes/drains materialization, freezes configured/prepared/task descendants, fences member input/interrupts, drains existing task/persistence work and finishes descendant handles before accepted=true/unregistration. Org does the analogous operation gate/frozen direct-agent+Team scope. Configured handles wait for AgentRun prepared termination finish before disposal. Unaccepted/failing members cannot produce successful root mutation. This supplies root-wide confirmation for retained native members. Do not reinterpret a lifecycle Offline notification as equivalent: Org can publish inactive even when local finish returned an error.

**Team target:** capture the mounted Team context/view, current service, node binding and member identities before the existing mutation. On success, while those owners still match, enumerate view.listAgentContextEntries(), using exact run ID/address/context membership, not selection or only listLiveAgentContextEntries(). Include retained task Agents/Team members and members published by that same root/service before its shutdown freeze; no new materialization solely to settle cards. Call the common public activity-store action for each eligible native member and assign only its matching current status, then disconnect the captured service, mark that owned root inactive and perform existing member Offline cleanup/history update. Known final phases are untouched. Stale success cannot disconnect or mark a replacement root/view/stream inactive. No loaded context/card means nothing to invent; retain normal root command/history handling only if its ownership is still current.

**Org target:** stopAndInspect remains the command/view owner; agentOrgRunStore remains a transport facade. Before retireStream, capture the current Org context/view/member identities, available run instances, node binding and that request's existing operations[id]='stop' ownership. Keep generations.delete and retireStream BEFORE the request: the old transport must not republish even on rejected Stop. Therefore success guard expects the service to remain absent after that intentional retirement, not to equal the now-retired service. Current context ownership, existing stop exclusion and binding must still match. Normal open/continuation is already excluded by operations and old inspection/stream generations are invalidated; no new general operation registry.
After the actual terminate promise succeeds, reconcile captured native member cards through the public activity store BEFORE markHistorical can clear input identity. Then markHistorical and readInspection in the existing order. Failed mutation leaves last-known cards unmodified by command confirmation and existing reopen-required/error semantics. Successful termination followed by inspection failure retains Stopped cards and historical/read-only state; show the inspection error without undoing successful termination or restoring a spinner. Do not use the low-level terminate facade's duplicate-call early return as proof of success: the supported sole production caller is serialized by stopAndInspect's existing operations guard; no new duplicate ledger is required.

**Org publication boundary:** stageAgentOrgExecutionContext fetches exact member projections and stages activities; publish validates retained addresses and invokes commitActivities before adoptLocalContexts. adoptLocalContexts replaces old.context.state with staged state; it does NOT retain activities. Rule9 therefore belongs in the existing atomic activity replacement, not in context adoption and not an after-publish patch. Keep projected conversation/state authoritative and retain only the uncovered terminal native activity records in that store. Member list is all indexed exact entries (direct configured/task Agents and Agents hosted by configured/task Teams), not only the current selection. A stale generation/candidate must not publish partial activity or context changes.

Example: Org member M has native operation X/started. The user clicks Org Terminate. Old stream is retired; backend success returns; X becomes Stopped without changing facts. The final inspection has no native activity for X; atomic replacement retains X beside projected history; context adoption cannot erase it. Later new work uses Y; X stays Stopped. If X was already completed/failed, retain that actual result instead. If the command rejects, X is not qualified Stopped by the click/disconnect/Offline value. A brand-new browser with an empty store does not invent X from an inactive Org.

If implementation finds unavoidable lock inversion or different root termination authority, return Design Impact with the supported caller rather than bypass configured activation or add another coordinator.

### Boundary checks / subsystem reuse
| Boundary | Explicit subject / identity | Singular responsibility / forbidden bypass |
| --- | --- | --- |
| Existing API -> AgentRun | AgentRunId; root wrappers retain typed root IDs | Termination; no compaction policy in GraphQL |
| Executor -> reporter | Native operation ID and turn IDs | Observed phase publication, not persistence |
| Native source subscription | Concrete backend run/stream session | Drain/dispose that session, no shared global pump or second queue |
| Activity projection/store | Run ID + operation-derived activity ID; callers retain root/context ownership | Single bounded displayed-activity store, confirmed evidence and source-aware atomic replacement; no Offline/latest-row inference |
| Root UI command owners | Exact Team/Org root, member addresses/run IDs, service/operation generation and node binding | Establish successful command correlation; call activity-store boundary before teardown/inspection; no direct calls into its helper |
| Saved projection/hydration | Canonical saved-run subject + actual traces | Existing replay contract, not runtime reconstruction |

Reuse native reporter, existing FIFO sentinel, AgentRun event pipeline, presentation adapters and activity store. No new subsystem hierarchy. The only new activity helper has pure native projection/reconciliation policy; the phase file removes actual duplicated vocabulary. Folder depth already separates engine, backend, transport, and presentation.

### Draft-to-final file mapping / change inventory
Draft responsibilities: executor phase finalization, backend lifetime, presenter display, root command evidence and in-memory history reconciliation; stored history formats unchanged. Extract repeated frontend phase definitions before final placement.

| Change | Workspace-relative path | Final concern / limit |
| --- | --- | --- |
| Modify | autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts | Per-call abort emission/latch/listener cleanup; keep memory/commit/retry authority |
| Modify | autobyteus-ts/src/agent/compaction/compaction-runtime-reporter.ts | stopped phase vocabulary; logs/notifier only |
| Verify only unless typing requires | autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.ts | Existing string phase forwarding |
| Modify | autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts | Concrete stream/pump lifetime, ordered bounded shutdown |
| Modify as needed | autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts | Forward remaining timeout through existing removal callback; no generic provider framework |
| Verify, not redesign | autobyteus-server-ts/src/agent-execution/domain/agent-run.ts; existing Team/Org adapters | Lock order and final event forwarding through actual owners |
| Add | autobyteus-web/types/activity/compactionPhase.ts | Tight phase vocabulary and predicates |
| Modify | autobyteus-web/types/agent/AgentRunState.ts; services/agentStreaming/protocol/compactionTypes.ts | Consume that type, no parallel state |
| Modify | autobyteus-web/services/agentStreaming/handlers/compactionActivityProjection.ts; handlers/agentStatusHandler.ts | Recognize stopped, preserve identity/facts, normal mutation |
| Add (replaces unimplemented SR033 helper proposal) | autobyteus-web/services/activity/nativeCompactionActivityReconciliation.ts | Pure native identity/terminal projection and retained-source composition; used below activity-store boundary, no Pinia/network/root dependencies |
| Modify | autobyteus-web/stores/agentRunStore.ts | Public activity-store reconciliation only after actual success/before disconnect; guard context/stream/binding |
| Modify | autobyteus-web/stores/agentTeamRunStore.ts | Existing root-success owner: exact retained members, same-owner receipt guard, common store action before owned teardown |
| Modify | autobyteus-web/stores/agentOrgContextsStore.ts | Existing stopAndInspect owner: capture before intentional retire, settle only after actual success before markHistorical/readInspection |
| Verify unchanged | autobyteus-web/stores/agentOrgRunStore.ts; composables/useWorkspaceHistorySubjectActions.ts; existing root UI controls | Transport/actual supported entry, existing exclusion semantics; no new root orchestration |
| Modify | autobyteus-web/stores/agentActivityStore.ts | Public confirmed-native-termination projection; atomic revision-guarded replacement retains uncovered terminal native activities, bounded window, no shadow cache |
| Modify | autobyteus-web/services/activity/runActivityWindowPolicy.ts; services/runHydration/runProjectionActivityHydration.ts | Reuse phase predicates; ordinary100-item window unchanged |
| Verify unchanged orchestration | autobyteus-web/services/agentOrgExecution/{agentOrgContextHydration,agentOrgExecutionContext}.ts; services/runHydration/{teamRunHydrationCommit,teamMemberProjectionHydrationService}.ts; services/runOpen/agentRunOpenCoordinator.ts | Stage/atomic commit/adopt paths consume corrected store action; do not patch context adoption or add retained-card side caches |
| Modify | autobyteus-web/utils/compactionActivityPresentation.ts; components/workspace/agent/CompactionStatusRow.vue | One-word neutral non-animated presentation |
| Verify unchanged | autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts and Team/Org projection | Phase string already supports stopped; strict envelope preserved |
| Remove in place | Abort-as-failed presentation; close-before-stop/discard-before-drain; repeated frontend phase guards | Clean-cut replacement, no flags/compatibility branches |
| N/A | Persisted readers/writers/migrations, prompt/strategy API, input admission/command registry | No SR033/SR034 changes |

Tests stay in existing core pending-executor/runtime, server backend/recovery/stream, and web activity/handler/store/row/hydration suites. Independent API owns durable system coverage. Solution Designer changes none.

### Removal and compatibility rejection
No backward compatibility for aborted-as-failed display. Remove the old normal-graceful discard route, standalone-only success-reconciliation assumption and projection-complete assumption that discards uncovered terminal native records. Do not add the unimplemented SR033 compactionActivityTerminalization.ts alongside its pure replacement. Reject Offline guessing, arbitrary UI timers, error-message matching, blanket historical reclassification, client-persisted shadow history, new raw-trace journal and per-handler registries. Provider-boundary history remains a distinct supported subject, not a fallback. Missing native history events are not old schema to migrate.

### Sequence / examples / verification guidance
1. Extend stopped contract and per-call abort emission. Test already-aborted signal, provider/backoff wait, late success/rejection, observer error and completion-before-abort. No additional model calls.
2. Refine native pump with existing queue primitives. Prove final event order before unsubscribe; no self-await/deadlock, duplicate termination, post-termination resubscribe or old-pump/new-session mix. Test delayed listener/deadline and distinguish resource failure from projection drain loss.
3. Unify phase predicates and pure native activity reconciliation below the store boundary. Implement all three command-owner call sites and atomic source-aware replacement together; a standalone-only fix is incomplete. Test HTTP success before/after event, late event after disconnect, changed context/service/node while awaiting request, other-run/member isolation and rejected/partial mutation/disconnection. Never overwrite a received completed/failed outcome.
4. Test actual root store actions: Team multiple native members (including retained task member), response before event; Org pre-retired transport, mutation success followed by real staged empty-native projection/commit/adopt, and separately mutation failure versus successful termination plus inspection failure. Verify100-item window, duplicate/revision conflict atomicity across members, known completed/failed facts, external-provider exclusion, absent-card/no creation, cold empty store and later new operation. Then run current native recovery/stop/late-commit/FIFO regressions, strict standalone/Team/Org transport and focused renderer tests. Exact v5,3-attempt ceiling and existing hold semantics stay.
5. API reproduces normal standalone and supported Team/Org Terminate controls in the documented isolated app: exact Stopped/no spinner, retained metadata/card, no cancelled dispatch. Capture backend event and command return separately. Actually execute reconnect and saved-run selection/hydration, retaining action/navigation or execution-context evidence and projection response; prove no generation caused merely by that action. Record in-memory retention versus absent native cold replay honestly. Later new message has a separate operation identity. No card deletion workaround. This design grants no new provider campaign/budget.

| Scenario / AC | Oracle |
| --- | --- |
| H active then Terminate / AC013/018 | stopped event/Stopped card, no active animation, H never parent-dispatched; no late commit |
| Completed or ordinary failed result already known / AC018 | Retain that result and facts |
| Stop then genuinely fresh retry / AC013/017 | Report cancelled execution; existing gate can later recover without replaying cancelled input |
| Response before event / AC018 | Standalone/Team qualify matching unresolved native cards before owned teardown; no claim of unknown provider result |
| Org Terminate with no client listener / AC018 | Success settles exact member native cards before markHistorical/readInspection; inspection commit/adopt retains them |
| Root command fails, or succeeds then inspection fails / AC018 | No success-inference in first case; truthful stopped retained state plus inspection error in second |
| Atomic member hydration / AC018 | All revisions checked, no partial publication on conflict; completed/failed/stopped native facts retained once, tool/provider projection unchanged; no cold reconstruction |
| Disconnect alone / AC017/018 | No fabricated Stopped; normal reconnect semantics |
| Saved view / AC008/018 | Real hydration causes no generation; no activity invented from Offline; retained old card never active |
| New runtime I / AC018 | Separate operation ID/card despite reset turn numbering |

### Tradeoffs, risks and completed classification
Prompt abort fact plus ordered drainage is smaller/more authoritative than a parallel status ledger. Successful-command reconciliation handles the real two-channel boundary using backend confirmation, not local intent. Preserve existing native persistence semantics rather than silently add a feature based on an unproved reload. Exact lost-packet timing, actual renderer reconnect/saved hydration and full Team/Org UI remain unproved, not Pass.

**task_size=Large / architectural_risk=High for the completed cumulative package.** Core/server/web strategy/recovery and retained persistence-boundary scope remains Large/High. SR033/SR034 terminal delta is Medium scope but High risk from cancellation/commit timing, pump/lock lifetime, root response/teardown ownership and atomic projection receipt semantics. Markdown/reference count does not determine classification. ARCH003 applies to SR030 only. Escalate before a new queue/ledger, native activity persistence, broad provider shutdown contract, changed runtime policy or relaxed cancellation/attempt ceiling. Independent review must cover SR033 as corrected by SR034, including in-round ARCH-F003. No reviewer finding is self-declared closed.

**Architecture Design Complete**, not implemented/validated/delivered. API006 incomplete; latest completed API005Fail78.6. F007 desktop closure and346 repository Pass remain scoped. Corrected API006 interim90.7 is withdrawn, no replacement score. Ten-path successful-test review,14 inherited/7baselinecontract/webtypecheck6836/full-suite/current semantic/crash/Delivery/user gates remain. F005 accepted known/nonblocking not fixed/Pass/QwenSTOP; F004 unknown; F006 corrected; SR022 exhausted1fidelityFail/3scopedusable; v6 unapproved. SR031 same-ID machinery stays withdrawn.
