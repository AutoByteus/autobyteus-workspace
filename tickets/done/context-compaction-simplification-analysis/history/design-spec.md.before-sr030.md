# Context-compaction simplification — design spec

## Solution And Approval Basis

- Package `context-compaction-simplification-analysis`; Solution Designer; 2026-09-30; **SR-029; design Ready / Architecture Design Complete; requirements approval remains SR-028**.
- Canonical `requirements-doc.md` is consolidated Approved. Latest user: “Well, I think now you can continue with the design. Yeah, I agree with you. Hold A then B flow.” Approval covers `input-hold-proposal.sr027.md`, supplementing SR012/017/020/022/024/026. No pending retry-owner/content-boundary/A-B question.
- Exact v5/output contract, natural-compression assumption and no-import/preservation decisions remain. Prior draft ownership/interfaces are superseded by this complete design; original preserved at `history/design-spec.md.before-sr028.md`. Older evidence/reviews remain historical scoped authorities, not current implementation proof.
- Investigation authority: `investigation-notes.md`, especially E21–E29. SR029 resolves three bounded technical questions from the ongoing SR028 review; it does not record a reviewer verdict or reopen approved behavior. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`, branch `codex/context-compaction-simplification-analysis`, HEAD `5cb7b049ae3158108bff2cb70ed80e89540586d9`, last-refreshed base origin/personal `8caa610ff438c288d9aca9f2efe2c33924fbf517`. No fresh fetch. Delivery owns eventual origin/personal finalization.

## Current-State Read

Original WorkingContextCompactionStrategy was genuinely an interface, but its ecosystem coupled proposal construction/results/diagnostics to a child runner and category output. IR003 has already removed that machinery and implemented a concrete DirectLlmCompactionSummarizer. Executor and configuration still import that class, feed units/size budget and require provider metadata. The approved replaceable axis is now narrower: **compress already-prepared text to compressed text**, not choosing a context window or installing memory.

The server already has one AgentRunInputAdmissionState queue per live run. Native backend “forwarded” only means admission into core runtime, not parent-model consumption. Core input processing/raw ingestion precedes request assembly; compaction is before appending the current new user message and before parent dispatch. Current handled pre-parent compaction failure returns final/isError, then completed/IDLE, and server terminal handling removes A. Request assembly explicitly excludes tool continuations from compaction execution; a separate post-response compaction call exists after a response with no tool invocations. That latter call is not a pre-dispatch tool-continuation suspension point. Simply retrying A as a new turn would duplicate processing; simply requeueing it would create automatic recovery cycles.

The target instead **suspends the existing native turn at its blocked LLM phase**, retaining prepared input in that turn. A is not resubmitted. B remains in the existing server queue and its new user admission authorizes resuming that blocked phase. This needs a real nonterminal recoverable-block state across core/server/UI; it is not equivalent to generic ERROR or turn completion. No second input queue, durable outbox or invented replay ledger.

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

All observations are source/installed SDK inspection, not new runtime acceptance. No provider calls/tests in SR028/SR029.

## Intended Change

1. Replace concrete summarizer dependency with `CompressionStrategy.compress(content): Promise<string>`; operation-scoped construction binds cancellation and optional diagnostics separately.
2. Move selected-history rendering completely before strategy invocation. The prepared content contains the prior summary once; no separate previousSummary or numeric size target.
3. Direct strategy internally attempts compression at most three times, with single-attempt local provider transport, same content/system instructions and no repair prompt. Parent SDK behavior unchanged.
4. Required-compaction failure suspends the current phase, surfaces recoverable error and retains input; later admitted user B authorizes one fresh strategy operation. Continue A without rerunning input processing, then B in FIFO order.
5. Preserve safe acceptance/commit, current settings, raw/history/upgrade behavior. No new migration or algorithm selector.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind / approved IDs | Trigger and existing basis | Target / preserved outcome | Spines |
| --- | --- | --- | --- | --- |
| BEH001/003 | System; REQ001/003/005/006/009/011; AC001–007/011/013/016 | Sustained/repeated native run crosses existing context threshold | Plan/render -> text compression -> acceptance/commit -> valid parent request; previous summary once | DS001/004/008 |
| BEH002 | User; REQ002/007; AC003/009 | Open Memory Inspector | Existing category/raw/current-context reads; no new category generation | DS003 |
| BEH004 | User/operational; REQ007/008; AC008/012 | Resume supported context; existing eligible historical migration | Current decode -> repair -> validation; frozen old conversion/current preservation; no model-only reopen | DS002/007 |
| BEH005 | User/system; REQ004/005/012; AC005/006/013/014/017 | Compaction failure and later user sends B | Recoverable phase suspension, A retained, B queues; authorized retry, A then B; no autonomous cycle | DS004/008/009 |
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
| design-review-report.md; architecture-review-revision-record.md; implementation/code/API reports and histories | Cumulative independent work / limitations | Basis-scoped; current SR028/SR029 review N/A — in progress, no completed verdict, not omitted-as-passed |
| solution-recovery-evidence/sr028/reference-index.json; architecture-review-clarification.sr029.md | Complete cumulative supplement/source/evidence paths and bounded review clarification | Inventory/context only; this canonical spec owns current technical decisions |
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
| DS-009 | Primary recovery, BEH005 | Error-held A + later user B -> authorized compression -> A continuation -> B turn | AgentRun FIFO + native suspended phase, no resubmission |

## Primary Execution Spine(s)

- DS001: `User -> AgentRun admission/native backend -> core turn/input pipeline -> LLMRequestAssembler -> pending executor (plan + render) -> CompressionStrategy -> MemoryManager acceptance/commit -> same phase parent dispatch -> normal turn completion`.
- DS009: `User sends B -> identified admission into existing AgentRun queue -> blocked-turn recovery authorization through native backend -> same A runner unblocks -> DS001 compression/commit -> A completes -> existing FIFO dispatches B`.
- DS002: `User resume -> run service/native factory -> snapshot bootstrap -> current envelope/identity -> active-raw tool repair -> final validation -> normal next request`.
- DS003: `Memory Inspector -> existing API/service -> current snapshot/category/raw readers -> view`.
- DS005: `Settings card/default -> existing validated settings owner -> current model factory -> fresh direct LLM for each attempt`.
- DS007: `Already-eligible historical runner -> existing candidate/disposition -> frozen successor recognition OR frozen predecessor conversion -> fixed target/preserved location -> scoped result`. No new scans/gates.

## Spine Narratives (Mandatory)

DS001 selects compactable units from an immutable baseline, including the prior checkpoint where eligible. The caller renders them once into content. An operation-scoped strategy compresses only that content. The executor receives only text; its pure summary-body validator checks the returned untagged body, then candidate validation checks context freshness, provenance, protected tail/tool boundaries and fit before MemoryManager commits. Success resumes the same request assembly and appends the current user once.

DS008 is internal to direct compression: build fresh isolated LLM from current selection -> capacity preflight -> one SDK generation -> complete/tagged-body check -> cleanup. On compression failure wait briefly and repeat, with identical content/v5, up to three attempts. No host automatic loop or generation after a host commit failure.

DS009 preserves the already-processed input in A's running turn while awaiting recovery permission. A remains nonterminal, so FIFO does not dispatch B into core ahead of it. B's genuine admission after blockage authorizes one fresh strategy operation through a narrow native control, not an extra copy of A or B in core. Repeated failure opens a new epoch and waits for another later user action. A final normal completion removes A's queue entry once and permits B; B can itself encounter ordinary compaction and uses the same rules. Already completed tools/parent phases are never rerun.

DS004 projects explicit block/resume facts and the live pending-input view. Core turn identity remains active even while status is error. Neither server terminal handlers nor UI Error-is-terminal assumptions may erase it. DS002/003/005/007 preserve the detailed current-schema/settings/history contracts above, rather than reintroducing old machinery to make recovery work.

## Spine Actors / Main-Line Nodes / Ownership Map

| Node | Concrete ownership |
| --- | --- |
| AgentRun | Authoritative per-run admission/FIFO and command observer lifecycle; serializes successful postUserMessage admissions, block facts and recovery claims; reservation callbacks are not recovery ingress |
| Native AgentRuntime / AgentTurnRunner | Executes and suspends/resumes one phase of one turn; owns prepared input and interruption; no parallel A/B execution |
| MemoryManager / internal compaction coordinator | Pending operation, failure epoch/one-use authorization, baseline freshness, accepted context and commit authority |
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
- Replace compaction-failure final/isError/completed branch with explicit blocked outcome and abortable wait; replace turn-ID-difference as the sole proxy for held-turn authorization; preserve the existing separate next-user-turn retry after a completed response (see safe-point scope below). No compatibility route that still terminalizes A.
- Remove in-scope UI inference that recoverably blocked Error means dead runtime/complete message; preserve genuine offline/fatal error semantics.

## Return Or Event Spine(s)

DS004 uses existing stream/event owners, adding typed `COMPACTION_BLOCKED` and `COMPACTION_RESUMED` facts (not generic terminal ERROR). Their payload is `{turnId, operationId, failureEpoch, code, message}` for block; resume identifies the same epoch. They represent only the supported pre-first-parent-dispatch hold. There is no `continuation` phase variant or extra parent-consumption tracking field. Core registers the blocked phase before publishing. Server matches exact run + active turn + epoch and rejects stale facts. Existing requested/started/completed/failed compaction status remains progress/diagnostics, not the queue's retry authority.

Project an explicit optional recoverableBlock in native lifecycle snapshot/status so reconnect/status reads agree with events. Handle it **before** current `phase:error -> retire turn` and `activeTurn -> running` branches. While blocked, unrelated/late activity or idle cannot clear error; only matching resume, successful phase progression or real interruption/termination can. Recovery in progress projects running/compacting, not completed. No extra TURN_STARTED, TURN_COMPLETED, ASSISTANT_COMPLETE or generic terminal error on hold/resume.

The server input owner emits a live `AGENT_INPUT_STATE` projection (shared presentation contract) with run-instance ID + monotonic revision and pending entries keyed by existing message ID (internal sequence for entries without public message IDs): `queued`, `held` or `forwarded`, associated turn when known, plus blocked epoch. It carries only identity/status and already-authorized display content/attachment references needed to reconcile queued B after reconnect, never provider-resolved paths/secrets. Same-process initial stream subscription supplies an atomic snapshot and subsequent revisions through AgentRun's serialized dispatch owner; ignore lower/equal revisions and reset on new run-instance identity. Do not infer pending delivery by scanning history.

Use the existing presentation DTO ownership, strict server/web/team/collaboration schemas and stream projectors together. Extend standalone connect and live team/org subscription paths to send this **transient** projection for the exact subscribed run; do not persist it in Team/Org execution trees or introduce a second disk authority. Feed existing UI per-run state from the same projection. Ordinary terminal input/queue removal clears status but retains conversation history. Historical event readers retain their old category fields as read-only history, not a legacy compactor.

## Bounded Local / Internal Spines

1. **Memory coordinator:** initial_ready -> operation_in_progress -> committed, or awaiting_user_retry(epoch). A validated fresh user permit permits a new operation_in_progress. One permit consumed once; no allowance accumulated during in-progress work.
2. **Direct strategy:** attempt1 -> success OR abortable 1s wait -> attempt2 -> success OR abortable 2s wait -> attempt3 -> success/exhausted. Cancellation exits immediately, cleanup bounded separately. No jitter/settings/UI needed for this small fixed policy.
3. **Native runner:** prepare external input ONCE -> phase -> blocked => await user permit without settling turn -> SAME phase/input -> normal final/tool continuation. Memory request assembly executes again only after permission, not input pipeline or completed tool batches.
4. **AgentRun:** admit B -> retain B FIFO -> if already-blocked native run and genuine post-block user admission, reserve one recovery permit -> call backend outside dispatch lock -> reconcile acknowledgment/facts under lock. Ordinary drain stays gated while A active/blocked. No lock held across provider work.
5. **Commit:** preserved staged archive copy -> atomic snapshot commit -> no-fail install -> best-effort prune/report; no automatic generation retry beyond this boundary.

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
| Agent.authorizeCompactionRetry -> AgentRuntime | Existing blocked phase and control validation | Native backend only for admitted user; core own user submission path | Arbitrary WebSocket retry token accepted as authority; reaching context coordinator directly |
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
- Runtime block identity `{turnId, operationId, failureEpoch}`; one live failure epoch at a time. Native capability `compactionRecovery: supported|unsupported`, optional method required when supported: `authorizeCompactionRetry({block, userAdmissionId}) -> accepted|stale|stopped`.
- The server constructs userAdmissionId from its run-instance + the successfully admitted postUserMessage entry sequence, with the recovery claim made in that same serialized callback after reconciling the live block. The message itself stays queued. SenderType.USER from supported user ingress is required; a method name, message body or metadata string alone is not authority. Deduplicated/rejected commands, all reservation commit/release callbacks, inter-agent/system messages and admissions before/during the failed operation are not recovery triggers. No release ordinal or reservation wakeup protocol is introduced.
- Core embedding `postUserMessage` keeps the new message in the existing core inbox, and only after admission can authorize the currently blocked phase. Native server path instead calls the control while keeping B server-side, so B is not enqueued twice. No public client can choose a failure epoch/permit to bypass admission.
- MemoryManager exposes permit validation/consumption for a suspended turn: exact pending operation/failure epoch + one-use fresh-user authorization permits the same execution turn to resume instead of rejecting it solely because its turn ID is unchanged. Non-user/stale permission cannot. Old permit is revoked on failure, commit, cancellation or stop. This same-turn route does not remove the existing separate later-user-turn retry for pending failures after a completed response; no suspended turn exists on that path (safe-point scope below).

All interfaces have one subject/explicit identity: content, compaction operation, agent input, or runtime block. Do not use message ID as turn ID, assume backend forwarded means parent consumed, or guess owners from strings. Identity ambiguity Low after this split; concurrency remains High risk requiring tests.

### Prepared content and direct strategy execution

Executor uses plan.compactableUnits and existing maxItemChars to build complete content once. Retain current introduction/separators/source role labels and provider-safe Unicode finalization; move the whole builder before `compress` to avoid changing approved prompt semantics. The direct implementation sends exact v5 as system and supplied content as user. The only request-text deletion is `Summary budget: N tokens.\n\n`; no replacement quota, separate previous summary or new semantic bullet. Preserve full user/prior-summary/assistant text; excerpt only tool values under existing renderer rules.

For each of up to three attempts: check cancellation, resolve then-current parent identifier/current settings, construct a fresh isolated LLM with compaction-controlled cap/fields, preflight its actual input capacity, send once with single-attempt transport, reject known incomplete response, parse body from response.content, emit safe observation, cleanup fresh instance in finally (existing 10s cleanup ceiling). Fresh logical conversation/invocation ID each time; same content and v5 across attempts. Current explicit settings can change between attempts, but no automatic change of model/config/prompt and no mutable parent conversation reuse. In-flight attempt keeps its resolved config.

All failed compression attempts — local construction/credentials/capacity, API errors including permanent rejection, timeout under existing adapter policy, empty/malformed/known-incomplete output — advance the uniform three-attempt loop. Local failure need not emit a network request. User abort/termination is not retryable; check bound signal before construction/call, after response and during wait, regardless of provider error wrapping. Host content rendering, final candidate invariants/fit, archive/snapshot/commit failures are outside this loop. They enter the same visible safe-block path before the next parent request, but do not spend three extra generations or attempt a smaller repair summary.

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

The existing separate `LlmPhase` post-response compaction call (when the returned response has no tool invocations) remains a real safe point. It can follow earlier tool batches, but the parent response has already been consumed/ingested; it is **not** the claimed pre-continuation block. Preserve its current final-response/diagnostic/pending-failure handling and existing later distinct user-turn retry. It uses the shared strategy-owned three attempts, but does not create a held-unsent A or loop/replay the already-consumed LLM phase. When adapting coordinator authorization, retain that existing new-user-turn path separately from same-turn held recovery; non-user work cannot retry its failure. This bounded clarification adds no post-response suspension or new final-response lifecycle policy. Generic parent API/tool errors also remain outside the held-input mechanism.

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

Within the existing dispatchQueue callback, first reconcile a newly observed block and capture its entry-sequence high-water cut. Then `inputAdmissionState.admit` synchronously reserves/commits/releases the new input. **Only successful return of this immediate admit**, qualifying genuine-user origin and a live unclaimed blocked epoch allows the recovery claim, before ordinary input dispatch selection. Construct the admission identity from this newly admitted entry, not by scanning arbitrary queued/reserved entries. No await between admission and claim; mark the epoch claimed under the queue lock, then issue the native control outside the lock and reconcile under it. B stays queued; A remains the active held turn; ordinary drain cannot dispatch B. Concurrent B/C cannot both claim; during-operation C has no saved future credit. On each newly observed failure capture a new cut; do not reprocess old admissions. A duplicate/rejected command grants nothing. Core consumes the exact permit before compress; stale controls are no-ops/rejections, never an automatic retry on communication failure. Reconcile the live block when acknowledgment is uncertain rather than forwarding B.

`entry.sequence` is allocated at reserve, not at release. That is sufficient **only for this immediate postUserMessage admission path**, where reserve/commit/release occur synchronously in its serialized callback. It is not a universal successful-release clock. `reserveUserMessage` exposes synchronous commit/release callbacks outside dispatchQueue; inspected production callers are inter-agent deliveries. Their release can awaken the ordinary queue drain but must never mint a recovery claim, even if reserved before a block and released after it. No genuine-user reservation/release recovery ingress is established. Do not add release epochs, callback serialization changes, reservation-to-user promotion, or a positive reserve-before/release-after recovery test. Preserve reservation transaction/FIFO semantics. If a future supported user ingress actually uses reservations, investigate its origin and admission contract before broadening eligibility.

Use actual standalone/Team/Org user commands in positive integration tests, including B admitted while A is held; use actual agent-origin reservation release as a negative/no-wakeup test. Method names and test-only forged calls are not scenario evidence.

Existing input entry gains derived held status/fact while keeping its original message/turn association. The command registry treats held as outstanding (not FAILED/COMPLETED; not subject to terminal-record expiry); resume returns it to forwarded without repeating user-message-forwarded/history observers. Preserve early lifecycle-vs-dispatch-ack buffering for held facts just as current pending terminal handling handles races. Retirement only on actual turn completion/interruption/failure/termination, never recoverable block.

Cancellation/termination: core waiter uses existing TurnExecutionScope signal and is cleared in finally. Explicit `prepareTermination` cannot simply quiesce and await a permanently held turn: fence new admissions, cancel queued entries per existing shutdown owner, interrupt the held turn, then wait for settlement using the existing stop deadline. Root shutdown uses the same fence. Ordinary interrupt semantics for other queued messages remain existing behavior; it must not resume cancelled A or consume a stale recovery permit. Stopped/restarted runtime does not reconstruct pending A/B from raw history.

### Minimal UI projection

Bind messageId/dedupeKey to the optimistic standalone message before sending, as well as team/member submissions. Use exact run + message identity to merge live pending projection; do not add another bubble for A on recovery. Preserve original recording attachment locators and user-visible attachment references; no re-upload or provider-path ownership bypass. B may be shown queued as soon as admitted; acknowledgment clears submissionPending independently of eventual forwarding, permitting another later input after error.

Existing error UI shows a recoverable compaction explanation and A's “Held — waiting for compaction” state; B shows “Queued”. Keep a usable composer in recoverable error, do not mark the AI turn complete, and do not reactivate/create another backend merely because status is Error. Use recoverableBlock + active runtime evidence to distinguish this from offline/fatal error. During recovery retain existing Running/interrupt primary-action behavior; no new general busy-send control. On same-live-run reconnect, merge server pending snapshot and revision, not automatic SEND_MESSAGE replay. On backend restart, stale pending badges are no longer authoritative; show no promise of resumption and retain history. Minimal component styling follows existing message/status conventions; no Product redesign handoff requested.

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

Initially placing all logic into PendingCompactionExecutor would mix retry policy, provider construction, input delivery and status. Instead extract only the true shared contracts: `compression-strategy.ts` for text; `compaction-execution.ts` for optional attempt observations/errors; runtime `compaction-recovery-controller.ts` for wait/control lifecycle; existing server input contract for held facts; shared presentation DTO for wire input-state projection. No one all-optional “compaction context” carrying stores, messages, credentials and provider results.

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
| C/agent/compaction/compaction-recovery-controller.ts (new); compaction-preparation-error; retry-turn-admission-policy | Abortable wait/control, typed failure identity; replace different-turn proxy | Generic input queue or timer auto-retry |
| C/agent/{agent,agent-turn}.ts; context state; loop/{llm-phase,agent-turn-runner}; runtime/{agent-runtime,agent-worker} | Native control facade, phase suspend, prepared input retention, initial-phase hold only, existing continuation gate and post-response path preserved, stop cleanup | Input replay through pipeline on resume |
| C/agent/events/{agent-events,notifiers}; status/status-deriver; streaming/events and notifier/event mappings | Typed block/resume and snapshot projection | Generic terminal outcome for recoverable block |
| C/llm/base.ts; api/{openai-compatible-llm,openai-responses-llm,anthropic-llm,gemini-llm,mistral-llm,ollama-llm,autobyteus-llm}; C/utils/gemini-helper.ts | Invocation-local single-attempt controls, SDK mapping/cancel | Global parent retry changes or retry strategy loop |
| S/agent-execution/backends/autobyteus/*factory.ts; agent-execution/compaction model factory | Construct operation-scoped direct implementation, current parent getter/settings | Old-agent settings lookup |
| S/agent-execution/backends/agent-run-backend.ts; native backend and events/{autobyteus-stream-event-converter,autobyteus-status-projector} | Capability/authorize control, typed block fact translation, active error snapshot | Queue mutations or copied messages |
| S/agent-execution/input/{agent-run-input-contract,agent-run-input-admission-state}; domain/agent-run | Original entry held projection, post-block admission cut/claim, snapshot revision, FIFO and fence | New persistent queue/repost A |
| S/agent-execution/domain/{agent-runtime-lifecycle-snapshot,agent-run-event,agent-status-payload}; events/processors/lifecycle-status | Recoverable active-turn error; nonterminal block/resume handling | Retiring active blocked turn on generic Error test |
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
3. Add coordinator permit/failure epoch and native phase recovery controller; replace false final/completed outcome with abortable same-turn suspension. Preserve prepared initial input, the no-compaction-on-tool-continuation gate and existing post-response pending retry; no continuation-block variant, no duplicate raw/history writes. Cancellation/shutdown tests first.
4. Extend native backend control + shared server queue/lifecycle/status contracts atomically. Add fresh-user admission cut/claim and held outstanding command projection. Test early events/ACK, duplicate B, same-turn stable identity, repeated failure and termination.
5. Extend shared presentation DTOs and all existing live stream paths; minimal frontend ID/status/held/queued handling and same-live-run reconnect. No durable queue schema. Keep external runtime append/wait behavior unchanged; unsupported capability never calls native recovery.
6. Re-run preserved settings/snapshot/frozen-upgrade/commit fixtures proportionately; source/build/type checks plus core-server-web integrated scenarios below. No claims from compile alone. Docs sync later owned by Delivery; architecture review precedes implementation.
7. Coordinated core/contracts/server/web release only after normal downstream gates; stop old writers. No dual wire/runtime compatibility branch. Recheck origin/personal as required at finalization, protect pending work; no SD commit/push/rebase/release in this round.

## Key Tradeoffs / Risks

Same-turn suspension avoids raw-ingest replay, ID reassociation and provider/tool duplicates, but keeps one live turn pending until recovery or explicit stop; shutdown must abort it rather than wait forever. Queue is in memory: no backend-restart delivery promise. User gets error plus a usable composer, which requires removing only the recoverable-error terminal assumption, not redefining all status semantics.

Uniform three-attempt policy can repeat permanent API failures and consume cost; explicitly approved, not optimized away by status classification. Provider calls may be slow under existing timeouts. Local single-attempt transport bound requires actual SDK tests (Gemini client-level handling is especially easy to get wrong). Remote internal work cannot be counted from client metadata. Shape/fit checks do not prove summary truth; accepted Qwen deviation remains recorded, not a remedy claim.

Host acceptance/commit failure is not a compression retry: block safely and wait for user. Atomic snapshot boundary remains the only installed-state authority; postcommit warnings cannot re-open failure. Protocol/contracts changes need all typed routes updated, including Team/Org/native attachment ownership; a standalone unit test is not full integration evidence. Historical runtime/readers remain supported without global migration gate. No private dataset or full power-loss evidence claimed.

## Guidance For Implementation / Verification Matrix

| Layer / IDs | Required cases |
| --- | --- |
| Strategy contract AC015/016 | Plain string-in/string-out; independent test implementation through actual executor/config; no concrete imports/provider fields; selected previous summary once, exact v5, numeric prefix absent, tool excerpt/full user text unchanged; direct parser->body->host and independent body->host succeed; tagged/invalid independent result rejected with one call |
| Direct attempts AC006/013 | Success 1/2/3, fail3/no4; API401/429/5xx/timeout, empty/malformed/known-incomplete, local config/capacity failure; identical content/prompt, unique invocation IDs; cancel before/during call/waits, safe cleanup/report failure; no repair/host retry |
| Adapter transport AC006/010/013 | Actual installed SDK fake fetch per family, one outbound generation each call incl transient/permanent errors; parent retry defaults unchanged; Gemini client override correct, no extraParams bypass; no real provider calls required |
| Memory AC001–005/011 | First/repeated one-summary context, safe head/tail/tool groups/final fit; injected oversized or malformed strategy result rejected; archive/snapshot faults unchanged baseline; prune/report failures after commit not retries |
| Core phase AC005/013/014 | Input pipeline/raw ingest once; register-block-before-wake; same turn/prepared input resumes; no false final/IDLE; no parent until commit; tool continuation skips compaction execution and replays no tools; existing post-response execution is not converted into held-input replay; late output cannot commit after abort |
| Queue/server AC014/017 | Actual AgentRun with native backend core: A held, B queued/new-user permit, A then B; duplicate B, early block before dispatch ACK, C during retry, repeated failure with no saved credits, stale block/resume, other-run isolation; actual standalone/Team/Org user ingress wakes A without forwarding B; agent-origin reservation release does not authorize recovery; forwarded/history observer once; held registry not terminal-expired |
| Shutdown/resume AC008/013/017 | Interrupt blocked/active recovery, explicit/root termination without quiescence deadlock, no cancelled A resume; same-live-process reconnect correct revisioned pending view; backend restart does not fabricate queue replay; existing stored context resume intact |
| UI/stream AC014/017 | Real submitted text + admitted attachment, optimistic ID, error/held A, usable composer, B queued, success clears hold without duplicate bubbles; no forced backend reactivation on recoverable error; strict DTOs standalone/Team/Org routing; held phase not marked final; existing busy UI unchanged |
| Preserved AC008–012 | Current default parent/settings tuple, no import/default write, historical inspector; current/frozen snapshots, writer cuts/raw-ahead repair and scoped migration dispositions unchanged |
| Regression / boundaries | Other runtime append and undeliveredRetryAsStart behavior unchanged; no new migration/selector/legacy import/child compactor; build shared contracts/core/server/web, targeted tests and realistic isolated desktop/API/UI under root TESTING.md |
| Quality / prior gates | No rescore by SD. Future representative DeepSeek validation separately predeclared by API owner; STOP Qwen; exact v5. Preserve SR022-Q01 and all prior failures; eventual nine API-path successful-test review and Delivery/user verification still required |

Use tests for evidence, not to redefine approved scope. No live provider calls or credential access authorized by this design handoff. No new API acceptance round/result is claimed; API005 remains interrupted pending revised implementation. API004 Fail90.7 remains historical last complete; F005 accepted known/nonblocking/not fixed; F004 unknown; F006 corrected. Prior ARCH002/CRR0059.40 apply only to earlier structure. New independent architecture review required by rule classification; implementation/source/API/Delivery follow their own gates.
