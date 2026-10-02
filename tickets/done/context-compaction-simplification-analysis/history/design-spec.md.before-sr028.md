# Context-compaction simplification — design spec

## Solution And Approval Basis

- Package/current round: `context-compaction-simplification-analysis` / **SR-019 technical basis / SR-020 validation disposition** (original full architecture SR-013).
- Approved requirements: **SR-012 plus SR-017 settings amendment**, REQ-001–009 / AC-001–012. Original SR-012 approval captured in SR-013 by user **“Correct. approve”** after the consolidated scope and first/repeated-compaction explanation.
- Approved behavior supplements: `proposed-compaction-prompt.md` (SR-008/prompt-v5, exact literal) and `output-format-and-coverage.md`. Approval includes useful-detail guidance, single tagged Markdown output, preservation and clean replacement. No new user behavior is introduced by this design.
- Design status: **Needs Revision for SR-021 new retry/error policy/replaceability and approved SR-022 removal of the prompt numeric size target.** SR-019 technical design below remains the historical independently reviewed/implemented basis (ARCH-REV-002/IR-003/CRR-005), not the completed design for the new request. SR-027 held-input continuation proposal is Ready for Approval; user-directed retention and SR-026 strategy-owned retries are recorded. SR-024 confirms the CompressionStrategy content-text -> compressed-text boundary; caller selection/rendering stays outside. This boundary still needs its technical design integration. See strategy-boundary-analysis.sr021.md for source investigation/options, not a finalized replacement API. No production/prompt/default/migration change or new architecture-complete handoff. SR-020 Qwen waiver/stop and parked v6 remain in force. API005 is interrupted for this intended-behavior revision; last completed API004Fail90.7, F006 assertion correction independently verified CRR007.
- Canonical evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/investigation-notes.md`, especially E13-1–6, E17-1–5 and E18-1–5 and E19-1–3.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`; branch `codex/context-compaction-simplification-analysis`; current refreshed base `origin/personal` at `8caa610ff438c288d9aca9f2efe2c33924fbf517`, HEAD `5cb7b049ae3158108bff2cb70ed80e89540586d9` (IR-003; base last refreshed SR-018; no new fetch this round); finalization target `origin/personal` via Delivery Engineer.

## Current queue investigation — SR-027

A shared per-AgentRun FIFO input admission owner already exists in server `AgentRun` / `AgentRunInputAdmissionState`, above the core inbox. Prefer investigating reuse, not another frontend delivery queue. Current terminal events remove entries, and native forwarded acknowledgment precedes actual parent dispatch; neither existing behavior supplies the requested compaction hold. Automatic drain on lifecycle settlement must not start unlimited recovery cycles. Frontend optimistic submission is not delivery proof, and the primary Running action is currently interrupt rather than a generic queue-send control.

Full evidence and proposed scope: `input-hold-proposal.sr027.md`, investigation E27. User wants A held; a concrete ordered A-then-B resumption policy is now Ready for Approval. No longer ask as if caching A had not been requested. Exact pause/non-delivery/status/identity/control integration remains to design after confirmation. Do not apply an existing append-rejection retry flag to start-turn compaction failures without tracing the different guarantees.

No new migration or durable offline outbox is proposed; current queues are in memory. Broad busy-send UI and cross-runtime behavior redesign are excluded from this bounded proposal. Design remains Needs Revision and not review-ready.

## Current retry ownership — SR-026 (approved direction)

The user explicitly assigns the retry sequence to CompressionStrategy. **One host call -> strategy attempts 1, 2, 3 -> first successful compressed text or final failure.** Three total attempts, not initial plus three retries. The host never adds an automatic retry loop around the strategy. Existing SDK automatic retries must not multiply the direct implementation’s three-request ceiling; scope any transport-control changes to compaction, not the shared parent model policy.

This supersedes all earlier proposed runtime/executor automatic-retry ownership in the SR021/SR025 investigation. Host responsibilities remain cycle admission (including a later user message), content preparation, cancellation, independent acceptance/commit, failure presentation and parent dispatch. The strategy owns generating/parsing its result and retrying failed compression attempts; it cannot install a result or clear pending state. No retry of committed work or caller persistence failures. Explicit cancellation stops the operation.

Content API remains text -> text, with execution controls bound separately. No new strategy setting, alternative production algorithm, numeric prompt target or migration. Concrete control/adapter/status/message integration still needs a complete aligned design. DEC-021-03 message delivery remains the only open product choice; no Architecture Design Complete claim. Full result: `solution-revision.sr026.md`.

## Current design investigation — SR-025

The user reconfirms prepared content at invocation; `CompressionStrategy.compress(content: string): Promise<string>` remains the approved content operation. The implementation-neutral spine is caller selection/preparation -> text compression -> existing acceptance/commit -> parent dispatch. This is confirmed responsibility scope, not a completed new execution API.

Fresh source tracing in `strategy-execution-investigation.sr025.md` / investigation E25 identifies concrete integration work: render before the strategy, leave direct model request wrapping/parsing inside its implementation, remove unused mandatory provider metadata from the candidate proposal, preserve per-execution current-parent resolution, and prevent nested SDK/application retry multiplication. Existing terminal-turn error projection is a reuse candidate, not yet a validated full UI journey. Raw trace recording is not a durable undispatched-message queue.

No migration is required by the text seam or prompt-envelope removal. Governing migration guideline was re-read; no new persisted-message contract or transition is invented before the A/B policy is approved. DEC-021-02 is settled by SR-026; only DEC-021-03 remains to confirm. **Design remains Needs Revision, not Architecture Design Complete**; historical design below is not implementation authority for the pending amendment.

## Current Approved Operating Assumption — SR-022

**ASM-022-01 — Natural summary compression.** For the long conversation histories that trigger compaction, we assume that an LLM given a clear summarization task will normally produce a substantially shorter continuation summary without being told a numeric token target. We rely on this behavior in the normal compaction path. The summary is not intended to reproduce the transcript or retain a fixed percentage of its tokens.

A long history contains repeated discussion, intermediate reasoning, superseded plans, repeated status messages, and verbose tool results. A continuation summary selects the current goal, still-applicable constraints, important decisions and findings, completed and pending work, and the exact references needed to resume. Much of the original volume is therefore not required in the replacement. Our input preparation also excerpts large tool results before they reach the summarizer. The summary's useful detail is driven by the task's state and remaining work, rather than by the length of the source history alone.

The practical basis is the user's extensive experience with LLM summarization: even very large histories ordinarily result in comparatively short summaries without a requested token count. For this design, that experience is sufficient to adopt natural compression as an operating assumption. We do not require an exact input-to-output ratio, a fixed output length, or further experiments to justify omitting a numeric prompt target. Illustrative input/output sizes are not acceptance thresholds.

**Design consequence:** ask for a concise but sufficiently detailed continuation summary using the approved content and output instructions. Do not add “approximately N tokens,” a word-count substitute, a fixed bullet quota, or a summary-size parameter to the replaceable transformation contract. Do not sacrifice important continuation information merely to hit an arbitrary target. On repeated compaction, the selected prefix already contains the prior summary once; the result is one updated replacement, not an accumulation of summaries.

**Separate boundary safeguards:** retain the provider's hard output cap, rejection of known incomplete output, and the existing final-context fit check before installing the replacement. These enforce resource and state boundaries; they are not instructions to produce a particular summary length. If a candidate fails those checks, retain the valid baseline and follow the approved failure policy. This operating assumption is not a promise about every possible input, and it does not justify removing those existing safeguards.

This is the current rationale for the numeric-target decision. It does not finalize the outstanding SR-021 retry/error/message design; the rest of the SR-019 architecture below remains its historical reviewed basis.

## Historical Current-State Read (SR-013 investigation basis)

Native runtime threshold observation requests compaction; the pending executor captures working context, selects a registered strategy (only `structured-json` ships), and invokes a separately launched compactor AgentRun. Its six-array JSON may receive one corrective generation. Normalized episodes/facts become stored rows and lineage membership, then are rendered into one text region and saved in the working-context snapshot. The next request already consumes that text region, not the category records.

Resume deserializes the saved v5 messages but additionally loads category membership to validate a lineage/summary-presence invariant. The result is not used to rebuild summary text. Commit currently prunes active traces before the replacement snapshot is durable. The same source also already supplies the useful window planner, tool-safe finalizer, snapshot serializer, raw archive primitives and failure gate that this design retains.

## Task Size And Architectural Risk (Mandatory)

- **task_size: Large.** This is a clean-cut core runtime refactor plus direct-provider response metadata, server model/settings wiring, current configuration/default handling without a legacy import, and limited frontend/settings/status cleanup. The initial source-reference inventory has 59 matched files, extended by a final shared-contract/history audit; not all are modifications, and source/test/content counts alone do not determine size.
- **architectural_risk: High.** Shared core configuration/result APIs change; restore loses a persisted-category dependency; commit ordering/commit point changes; seven direct adapter families need explicit completion status; a child-agent lifecycle is removed; model settings move ownership; current snapshot decoding/writing becomes version-agnostic while the released upgrader is pinned; exposed GraphQL strategy queries/deep exports disappear.
- Payload versus structure: the prompt is one unchanged approved text payload. The structural changes above—not that prompt or the volume of research—justify Large/High.
- Escalate if implementation finds another production category/lineage consumer, requires changed snapshot meaning or historical transformation beyond the version-agnostic projection below, needs cross-run retrieval, cannot honor a current-format user-selected model or the SR-017 parent-model default, or needs a new user-facing recovery/retention policy. Return to Solution Designer; do not silently add fallback algorithms or widen migration.

## Architecture Investigation Evidence

| Source / probe | Exact reference | Observation | Decision supported | Remaining uncertainty |
| --- | --- | --- | --- | --- |
| Post-approval core/provider/settings inspection | Investigation E13-1/2; `sr013-source-inventory.json` | Existing BaseLLM and availability/secret construction suffice; terminal metadata currently discarded | Fresh direct LLM per attempt; metadata belongs in adapters | No live-provider quality/cost benchmark |
| Commit/archive/restore source | E13-3 | Snapshot already holds text; archive copy can precede pruning | One snapshot authority; staged evidence copy and durable snapshot commit | Target fault tests still required |
| Six unchanged-source probes | E13-4; script/log/results under `design-investigation-probes/` | Representative snapshot reuse, old gate rejection, archive-copy sequencing and deduplicated corpus confirmed | No conversation-data migration; reuse current storage owners | Synthetic fixtures, not production census or crash/power-loss test |
| RPA server source, read-only | E13-2, external SHA/file hashes | Response schema has no stop reason; generation config is generic | Unknown status remains explicit; no provider exclusion or invented guarantee | Deployed hosts may differ |
| Current readers and startup | E13-1/5 | Historical category inspection independent; `setDurably` exists; builtin bootstrap overwrites template config | Historical evidence only: SR-017 now leaves old preferences inert and removes the import | External SDK consumers not enumerated |

## Intended Change

Replace the categorized/agent-based algorithm with one direct summary path:

```text
existing trigger and authorization
  -> existing history-window plan
  -> one direct LLM request with approved prompt
  -> extract one marked Markdown body
  -> validate finalized context
  -> safely replace saved working context
  -> continue the same run
```

No second algorithm, generic compaction framework, second summary file, category output or new long-term-memory subsystem. Keep data on disk independent from what is placed in the next model request.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | Approved IDs | Trigger / current basis | Change or preservation | Target path / spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001–006/008/009; AC-001/003–007/010/011 | Native run threshold/hard-cap observation; llm-phase and assembler | Automatic one-call summary, retained safe context | Run -> LLM phase -> MemoryManager/PendingExecutor -> direct summarizer -> commit -> dispatch; DS-001 |
| BEH-003 | System | REQ-001/003/006/009; AC-002/004/007/011 | Later threshold crossing after previous summary | Previous summary plus newly eligible history -> one replacement | Same DS-001; no extra loop |
| BEH-005 | System/user retry | REQ-004/005; AC-005/006/011 | Actual provider/output/precommit failure and existing user retry | Keep baseline; explicit failure; no autonomous correction | DS-001, DS-004 status/authorized retry |
| BEH-004 | User | REQ-007; AC-008 | Normal supported saved-context resume (including existing v5) | Restore saved text directly; no re-summary/category prerequisite | Resume service -> native factory -> snapshot bootstrap -> tool repair -> dispatch; DS-002 |
| BEH-002 | User | REQ-007/008; AC-009/010 | Existing Memory Inspector/settings | Old records remain readable; useful controls remain without algorithm/agent workflow | Inspector -> AgentMemoryService -> existing file readers; DS-003. Settings -> settings owner -> direct construction; DS-005 |

## Relevant Supplemental Task Artifacts

All owned paths are under the canonical ticket directory stated above.

| Artifact | Purpose / related IDs | Relationship / status |
| --- | --- | --- |
| `requirements-doc.md` | All intended behavior | Approved SR-012 plus SR-017; reaffirmed SR-018 |
| `proposed-compaction-prompt.md`, `output-format-and-coverage.md` | REQ-001/004–006/009, AC-002/005–007/011 | Approved literal and output/detail contract; do not rewrite during implementation |
| `compaction-prompt-proposal.md`, `prompt-refinement-notes.md` | Prompt rationale | Earlier feasibility is superseded by this spec where technical detail differs |
| `simplification-design-direction.md` | Keep/remove discussion | Direction accepted; this spec finalizes its previously pending technical choices |
| `design-investigation-probes/` | E13-4 and earlier four probes | Reproduction logs/source hashes; no target implementation claim |
| `analysis-report.md`, `history/`, `solution-revision-record.md` | Evolution | Historical, not competing current specs |
| External `memory-compaction-file-backed-redesign` ticket | Earlier three-output WIP | Read-only, premise superseded for this package. Its reviews do not approve this design; do not merge competing implementation |
| Product | N/A — not requested | No Product-owned artifact or redesign |
| Independent review artifacts | design-review-report.md / architecture-review-revision-record.md; code-review-report.md / code-review-revision-record.md | ARCH-REV-001 and CRR-001–004 are historical scoped evidence, not approval of SR-018. New architecture review pending |

## Task Design Health Assessment (Mandatory)

- Posture: **Behavior Change / Refactor / Cleanup**.
- Issue: **Yes**. Root causes: boundary/ownership confusion, duplicated representations, overly category-specific shared structures, and unnecessary strategy/child-agent coordination.
- Refactor now: **Yes**. Adding only a text strategy leaves the accepted-result/category writer/restore coupling intact. Moving only the prompt leaves all unnecessary execution and persistence work.
- Response: one owner-controlled compaction sequence; direct generation; tight summary payload; snapshot authority; explicit removal inventory below.
- Preserve: distinct window planning, provider construction, structural validation, evidence storage and existing user retry. Simplification does not make the pending executor a provider/storage god object.
- Deferrals: genuine long-term memory, RPA protocol expansion, unrelated archive-format compatibility, power-loss durability improvements and global settings redesign. Residual model quality/provider visibility and external API consumer risk are disclosed below.

## Terminology

- **Continuation summary**: one Markdown body describing task state; not an episodic/semantic record or backup.
- **Snapshot**: existing serialized current working context, including summary, head/recent messages and provenance.
- **Attempt**: one authorized logical generation; transport retries inside the provider SDK are not additional compaction reasoning passes.
- **Archive preparation**: durable copy of selected evidence before removing it from active storage. A complete archive segment is evidence, not proof that a summary committed.

## Design Reading Order

Read intended flow and behavior map, persisted-state decision and DS-001 details, then ownership/removals, concrete interfaces/files and validation sequence. Repeated mandatory template checks below reference the same owners instead of introducing extra layers.

## Legacy Removal Policy (Mandatory)

**No backward-compatibility execution paths. Remove replaced code.** Preserve directly readable user data, not the old algorithm. No JSON-to-Markdown fallback, dual writers/readers selected by format, legacy strategy option, hidden child-agent retry, or compactor-agent lookup during normal execution. The current message representation is already sufficient. Keep it and the same file; read a projection of current fields, ignore obsolete root fields/version labels, and omit the version on future ordinary saves. No conversion sweep or legacy runtime decoder.

## Persisted Data / State Transition Decision

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

**Required durable implementation tests (not supplied as target tests yet):**
- In `autobyteus-server-ts/tests/unit/app-data-migrations/migrate-native-working-context-snapshots-v5-migration.test.ts`, exercise the actual eligible migration with snapshots emitted by the current target MemoryManager writer at zero, some and all batch-result boundaries, plus active raw results committed ahead of the snapshot. Each recognized versionless case retains summary/provenance and all snapshot/category/raw bytes; assert converter/raw-fact-loader/repair/write/cleanup were not invoked. Keep independent strict-v5 released-classifier/disposition fixtures unchanged.
- In `autobyteus-ts/tests/unit/memory/working-context-snapshot-bootstrapper.test.ts` and `memory-manager-working-context-snapshot-persistence.test.ts`, independently reopen the preserved writer-produced zero/partial/raw-ahead cases through normal bootstrap; require summary/native context preserved, existing active-raw repair and final full validation before dispatch. Do not replace actual writer cuts with only hand-edited JSON or count migration skip as successful resume.
- Negative recognition/disposition cases: wrong agent, missing/malformed known message/provenance fields, invalid ranges and arbitrary versionless root do not receive recognized-current success, do not get converted to empty, and remain unchanged with the existing scoped failure disposition. A fully complete successor is still recognized. No loosening of the final request validator.
- Existing runner terminal records still skip the old migration entirely; unfinished successor recognition adds no status reset or scan. A pending/failed historical migration beside new work is the relevant operational case, not an invented global startup prerequisite.

Source-characterization evidence in `solution-recovery-evidence/sr019/` is deliberately not a passing target-guard or full startup test. Implementation and API owners must provide the above durable coverage and applicable lifecycle validation; independent reviewer retains control of the review finding/verdict.

### Persisted-Data Guideline Check (SR-018)

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

| ID | Scope | Behaviors | Start -> end | Governing owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end | BEH-001/003/005 | Active native run -> one reduced valid next request | PendingCompactionExecutor with MemoryManager state boundary |
| DS-002 | Primary end-to-end | BEH-004 | Resume request -> restored native run ready for next request | Existing resume/factory and snapshot bootstrap |
| DS-003 | Primary end-to-end, preserved | BEH-002 | Memory Inspector -> stored historical/current content | AgentMemoryService |
| DS-004 | Return-event | BEH-001/005 | Attempt state -> existing progress/failure UI and user retry admission | CompactionRuntimeReporter + existing gate |
| DS-005 | Primary settings/configuration | BEH-001/005 via REQ-008 | Existing settings -> next direct model construction | ServerSettingsService / server compaction model factory |
| DS-006 | **Retired by SR-017** | REQ-008 / AC-012 | No old-settings conversion; no replacement startup flow | N/A — absence uses current defaults |
| DS-007 | Existing historical-upgrade integration, not a new upgrade | BEH-004 / REQ-007; governing migration guideline | Already-eligible native snapshot upgrade -> preserve current successor or original fixed conversion/result | Existing AppDataMigrationRunner + native-v5 migration; frozen migration-only shapes |

## Primary Execution Spine(s)

- DS-001: `Run / LLM phase -> threshold gate and request assembler -> PendingCompactionExecutor -> window planner -> DirectLlmCompactionSummarizer -> finalizer/validator -> MemoryManager commit -> parent dispatch`.
- DS-002: `Resume service -> native backend/factory -> SnapshotBootstrapper -> saved messages + active raw tool repair -> final validation -> next request`.
- DS-003: `Memory Inspector -> existing GraphQL/service -> AgentMemoryService -> existing snapshot/category/raw readers -> rendered view`.
- DS-007 (secondary operational path): `Existing eligible migration runner -> metadata-derived native location -> existing missing/lineage dispositions -> frozen successor recognition -> preserve-current skip OR frozen historical converter/fixed-v5 atomic write -> existing aggregate result`. Terminal-completed migrations bypass this path; no new registry entry or admission gate.
- DS-005: `CompactionConfigCard -> existing settings API -> validated durable model setting -> server LLM factory callback -> fresh direct LLM for next attempt`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Main subjects / governing owner | Off-spine concerns |
| --- | --- | --- | --- |
| DS-001 | Existing automatic gate authorizes an attempt. Capture immutable context/fingerprint. Plan settled prefix and protected retained suffix. Summarizer builds one request and returns validated body plus invocation metadata. Builder composes replacement; validator checks invariants. Commit prepares evidence, saves snapshot, installs state and cleans active duplicates. Parent continues only after commit | Attempt, context window, summary, accepted context; PendingExecutor and MemoryManager | Provider construction, prompt formatting, status, storage |
| DS-002 | Read the current-field projection from the same snapshot file, ignoring obsolete root/version fields. Validate identity, message/provenance shape and at-most-one summary. Do not read categories/lineage. Use existing raw-tool fact repair then validate/save as today. No model call just to resume | Saved working context; bootstrapper | Existing raw store and tool repair |
| DS-003 | Existing service directly reads requested category files and snapshot. No new writes means empty categories are ordinary; old content still reads | Run memory view; AgentMemoryService | Existing access/node routing unchanged |
| DS-004 | Preserve requested/started/completed/failed events and operation/turn correlation. Failure before commit keeps baseline and existing explicit user retry; no hidden repair generation. Cleanup warnings after commit do not relabel the accepted summary failed | Attempt state; reporter/gate | Frontend status presentation |
| DS-007 | Before evolving the normal codec, isolate the released fixed classifier/writer. An already-current versionless snapshot, including unfinished writer-produced tool groups, encountered during an eligible old upgrade is retained wholly without repair; other investigated released sources retain the old conversion/disposition rules. Current runtime never imports these shapes | Historical conversion; existing registered native-v5 migration | Frozen wire contracts, existing atomic snapshot writer; no extra scan/journal |
| DS-005 | Missing current setting uses the current parent model by default. Settings UI can save an explicit current model/config override. Each new attempt resolves current settings once; in-flight invocation does not change. No startup import or initialization step | Compaction model settings; server settings/factory | Model catalogue, availability, secrets, durable app config |

## Spine Actors / Main-Line Nodes

No new service hierarchy: retain MemoryManager as authoritative working-context/state entrypoint, its existing coordinator for gate/baseline/commit state, PendingCompactionExecutor for attempt sequencing, and the existing storage owners. Add only a concrete direct summarizer and small marked-output parser, with a factory callback at the existing dependency-construction boundary.

## Ownership Map

- **MemoryManager:** current context and raw evidence public boundary. Keeps all baseline/prepare/commit calls going through its coordinator. No public callers directly mutate its snapshot/archive stores.
- **MemoryManagerCompactionCoordinator:** pending state, baseline freshness and completion state. Remove lineage dependence; keep fingerprint and operation authorization checks before acceptance and commit.
- **PendingCompactionExecutor:** plan -> call -> validate -> commit -> status. Owns no model credentials, file paths or category schemas.
- **DirectLlmCompactionSummarizer:** approved prompt/input assembly, request budget preflight, one invocation, completion/framing extraction, per-attempt model cleanup. No run storage/tools/agent manager.
- **AcceptedCompactionBuilder / validator:** pure candidate construction and preserved head/tail/tool/budget invariants; no artifact IDs or category writes.
- **AcceptedCompactionCommitter:** bounded storage sequence behind coordinator; no inference/provider logic.
- **Server model factory:** settings + model availability + secret-aware LLM creation. No conversation summary persistence or parent LLM mutation.

## Thin Entry Facades / Public Wrappers

MemoryManager is not an empty wrapper: it owns working context and coordinates gate/storage state. The server-injected `createLlm` callback is a construction boundary, not a runtime algorithm selector. Existing GraphQL settings endpoints remain transport only. No new compaction repository facade or generic strategy adapter is justified.

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

## Return Or Event Spine(s)

DS-004 retains event phases, operation/turn IDs, timing/budget/selection sizes and errors. Replace child-run/task IDs, strategy names and episode/fact counts with model/provider, summary character/estimated-token counts and completion status. Update runtime reporter, shared strict presentation DTO, server event normalization and frontend typed consumers together. Detailed logs must not dump user history, summary or secrets by default; record counts and existing opt-in diagnostics policy. Reporter failures after commit must not revert or classify a committed summary as failed.

The shared `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` COMPACTION_STATUS schema is strict, with required nullable fields. Change it, its package tests, both team/collaboration projectors, and current web stream adapters as one contract change; dropping producer fields alone is invalid. Preserve unrelated provider/session/boundary/trigger fields used by other runtime backends. In contrast, existing historical raw-event projection and Event Monitor still read old fact counts: retain that historical read/display capability and optional history-view fields where used, with no new writes or dependency from live compaction. Do not delete historical data readers merely because names match the removal search. Historical decoding remains in the existing run-history owner, not a new legacy compaction path. Test both new live statuses and old stored event/history presentation.

## Bounded Local / Internal Spines

1. Pending owner retains existing initial-ready -> in-progress -> completed or awaiting-user-retry transition. No added semantic retry loop.
2. Direct summarizer: fresh LLM -> build/preflight -> send once -> evaluate terminal/framing result -> cleanup in finally. Parent AbortSignal is checked before call, after await and immediately before commit; a late provider result after cancellation cannot mutate state.
3. Committer: prevalidate/preallocate -> stage archive copy -> write snapshot -> install/complete -> prune archived duplicates. All commit steps after model await are synchronous local ownership operations; no new cross-run transaction engine.

## Off-Spine Concerns Around The Spine

| Concern | Spines / owner served | Decision / risk if misplaced |
| --- | --- | --- |
| Model catalogue, availability, keys, Gemini runtime | DS-001/005 server construction | Reuse createAvailableLlm; never embed credentials or model discovery in core memory |
| Input rendering and Unicode safety | DS-001 summarizer | Existing renderer/builder; role labels/history boundary remain source framing, not executable instructions |
| Parent and compactor request budgets | DS-001 executor/summarizer | Existing token estimates/capacity helpers, two distinct budgets; do not conflate replacement size with available summarizer input |
| Snapshot/archive persistence | DS-001/002 committer/bootstrap | Existing owners; no provider calls from storage |
| Historical inspection | DS-003 service | Preserve current read path; never make it an active compaction prerequisite |
| Default settings | DS-005 factory/UI | In-memory defaults when current setting is absent; no startup work or historical read |
| Status/diagnostics | DS-004 reporter | Preserve events without category/child metadata; no duplicate attempt state in UI |

## Ownership Boundaries

Generation returns a candidate, not authorization to commit. Coordinator verifies current fingerprint/operation remains valid. File stores own filesystem details; committer uses staged-archive and snapshot boundaries. Server factory owns current settings and existing secret ownership; the LLM phase supplies the current parent model identifier for each attempt, while core owns summary content and invocation safety. A callback is injected for testability/provider construction—not a registry or capability plugin.

## Boundary Encapsulation Map

| Boundary | Internal mechanisms | Callers / forbidden bypass |
| --- | --- | --- |
| MemoryManager | coordinator, working-context controller, commit storage | Executor uses capture/prepare/commit; must not write category/snapshot/archive files directly |
| DirectLlmCompactionSummarizer | prompt builder/parser, fresh BaseLLM | Executor supplies selected units/budget/signal; no AgentRunManager or tools |
| Server compaction model factory | settings reader + createAvailableLlm | Native backend config construction only; no direct vault/API-client bypass |
| ServerSettingsService | validation + durable AppConfig | Existing UI/API current-value saving only; no compaction-settings import or startup initialization |

## Dependency Rules

Core memory may depend on existing core LLM/message/budget abstractions, never server/GraphQL/agent-manager modules. Server compaction construction may depend on core types and existing model/secret services, never on the old builtin agent at runtime. The executor must not know provider-specific stop-reason strings. Adapters normalize them. No business/runtime reader branches on old-vs-new summary headings. No caller bypasses MemoryManager to set a context during an attempt. Removing lineage does not remove baseline freshness, raw provenance or tool identity checks.

## Interface Boundary Mapping

### Tight core contracts

Names are concrete, not a second strategy API:

```ts
// memory-compaction-configuration.ts
// Existing disabled variant stays. Enabled config replaces runner with summarizer.
{ kind: 'enabled'; policy: CompactionPolicy; summarizer: DirectLlmCompactionSummarizer }

// direct-llm-compaction-summarizer.ts: constructor dependency, fresh instance per call
createLlm(input: { parentModelIdentifier: string }): Promise<BaseLLM>
// Resolve current settings and effective bounded config before construction.

summarize(input: {
  units: readonly WorkingContextMessageUnit[];
  summaryBudgetTokens: number;
  parentModelIdentifier: string;
  operationId: string;
  executionTurnId: string;
  signal: AbortSignal;
}): Promise<{ summary: string; execution: CompactionExecutionMetadata }>

// working-context-compaction-proposal.ts: one authoritative candidate
{
  selectedNewRawTraceIds: string[];
  retainedMessages: Message[];
  summary: string;
  budgetAssessment: CompactionBudgetAssessment;
  execution: CompactionExecutionMetadata;
}
// Accepted result retains operation/compaction ID, baseline fingerprint,
// selected raw IDs, finalizedContext, budgetAssessment; no category rows/lineage.
```

`CompactionExecutionMetadata` in `compaction-execution.ts`: model identifier, provider, attempt invocation identifier, completion status and existing usage observation if available. Keep operation/turn identity in the owner/request; do not duplicate parent IDs, child runtime IDs or prompt content into many shapes. Diagnostics share this type and reference actual invocation metadata, not last-run mutable state.

### Input and output details

- At attempt start, use the current LLM phase instance’s `llmInstance.model.modelIdentifier` as the parent identifier, not a run-creation-time capture. The factory reads the current model setting once: explicit model wins; null inherits this current parent. Null llmConfig uses selected-model defaults; explicit config uses existing normalized overrides, never parent tools/system/extensions. An in-flight attempt keeps its resolved model/config fixed. Test a parent model change between attempts and a settings change before a later attempt.
- Executor invokes existing planner directly with the captured baseline and planning budget; remove the StructuredJsonCompactionStrategy forwarding/normalizing layer rather than renaming it to another strategy.
- Preserve complete user/prior-summary and assistant natural-language content in rendering. Existing `maxItemChars` is restricted to tool argument/result presentation values (document this narrowed use); no blanket 2,000-character clipping of instructions or summary. Reuse Unicode-safe formatting. Preserve exact useful tool names/paths/IDs and label excerpting; raw full evidence remains stored.
- Render the **actual selected** prefix with existing source boundaries; never reread the full archive or include retained tail twice. First pass has no prior summary; later passes include the provenance-marked earlier summary once.
- Use the approved literal as the summarizer system instruction. Ship it as `compaction-summary-prompt.ts` string constant for normal TS packaging, with a test comparing its text to the approved fixture. No dependency on a builtin agent Markdown loader or prompt auto-generation.
- Task prompt may state the numeric summary budget from existing planning, separately from the unchanged literal. No unapproved extra semantic instructions, JSON repair text, tool schema or parent system prompt is installed as compactor authority.
- Compute summarizer input capacity from the **fresh compactor model/config**, not parent model metadata. Reuse resolveLlmRequestCapacity without the parent-only active-context override. Count rendered system+user request with existing estimator and safety margin. If unavailable capacity or oversized input, report `input_budget_exceeded`/`input_capacity_unavailable` before generation; do not silently drop user constraints, spawn a helper or recursively summarize chunks.
- Summary budget is the existing replacement reserve; final candidate still must meet the actual post-compaction target. The injected factory selects an explicit positive configured output cap, otherwise 8,192, clamped to the selected model maximum when known, before constructing the adapter (some adapters cache this value in their constructor). The summarizer inspects this already-effective config for capacity; it must not mutate a constructed adapter or create a second model merely to change its limit. Reserve that full generation allowance during request-capacity calculation (reasoning may consume output tokens). It is not proof of summary quality. Preserve provider generation settings except invocation-controlled system, tools, response format, stop sequences, conversation continuation, stream/count and output-limit keys. Enforce controlled request fields through existing provider request builders; adapter request tests prove extraParams cannot reintroduce tools/old response format or override the cap.
- Send one system message plus one source-history user message through `BaseLLM.sendMessages`; pass no tools. Generate unique logicalConversationId per attempt (not parent conversation ID), with the parent abort signal. Existing provider kwarg filtering handles identity for other adapters.
- Cleanup fresh LLM in finally; never cleanup/mutate the parent instance. Provider cleanup errors are diagnostics, do not mask the invocation error or discard a valid summary. Native remote cleanup is capped at 10 seconds per isolated conversation using AbortSignal.timeout and optional AutobyteusRequestOptions on client.cleanup, matching its other request methods; no cleanup retry scheduler. Fresh direct calls have one conversation to clean.
- Extract from **response.content**, never reasoning. Require exactly one literal opening and closing marker in correct order, one nonempty body, no nested/multiple blocks. Ignore exterior prose. Trim only outer body whitespace; preserve inner Markdown. Six exact level-2 headings must occur once, in the approved order, with content/bullets or `(none)` under each. Do not parse six arrays or create per-heading stores. Reject malformed structure rather than guessing or adding missing facts. Markers/headings do not establish semantic fidelity.

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

## Interface Boundary Check

| Interface | Singular / explicit identity | Risk / correction |
| --- | --- | --- |
| summarize(input) | Yes; operationId + executionTurnId, one run-bound summarizer | Low; unique remote invocation identity separate from parent |
| MemoryManager capture/prepare/commit | Yes; current run/store plus operation/fingerprint | Low after lineage removal; retain checks |
| prepareCompactionArchive / prune prepared archive | Yes; selected raw IDs / durable archive boundary | Verify membership, never accept an arbitrary filesystem path |
| Model settings value | Yes; one modelIdentifier or explicit inherit | Model identity is not runtime kind/agent definition |
| Existing inspection API | Unchanged supported run identity | Do not broaden selectors or access scope |

## Main Domain Subject Naming Check

Use “summary”, “attempt”, “working context”, “model settings” and “raw archive”. Keep serialized `compacted_memory` provenance name to avoid needless data transformation; its meaning is a compacted context region, not episodic/semantic ownership. Remove category/child names from current compaction execution contracts; existing historical view-only fields are not execution authority. `MessageBudgetStrategy` remains accurately named for its separate concern.

## Existing Capability / Subsystem Reuse Check

| Need | Reuse/extend | New code only where justified |
| --- | --- | --- |
| Trigger/window/head/tail | Existing policy/gate/planner/unit builder/budget | None |
| Summarization | BaseLLM, existing renderer/Unicode helpers | Concrete direct summarizer + small tagged-body parser + literal prompt module |
| Persistence | Snapshot controller/store, raw store/archive owner | Two-phase archive API on existing owner; no new storage subsystem |
| Provider completion | Existing direct adapters/CompleteResponse | Two additive fields, not a provider framework |
| Model settings/UI | ServerSettingsService, durable AppConfig, current catalogue and ModelConfigSection/SearchableGroupedSelect | One current-setting codec/factory with absence defaults; no migration or algorithm selector |
| Status/history | Current reporter and AgentMemoryService | Remove stale fields, preserve actual outcomes |

## Subsystem / Capability-Area Allocation

Core memory/compaction owns attempt and summary transformation. Core memory/store owns evidence and snapshot filesystem operations. Core llm owns provider normalization. Server agent-execution/compaction owns dependency construction; server settings owns explicit current configuration; no compaction-specific startup transition. Existing web settings/status components own presentation. No new top-level subsystem or speculative future-memory extension points.

## Draft File Responsibility Mapping

Initial candidates were a Markdown strategy, separate summary store and server child-agent adapter replacement. Tightening removes the first two: executor directly plans, existing snapshot remains authority. The final mapping below uses only a direct summarizer, output parser, literal module and server current-setting codec/factory as focused responsibilities; remove the earlier proposed importer. Existing builder/committer remain because candidate construction and durable commit are distinct real policies.

## Reusable Owned Structures Check

`working-context-compaction-proposal.ts` owns the one summary proposal/accepted result. `compaction-execution.ts` owns invocation metadata/diagnostics formerly trapped in strategy/agent types. `CompleteResponse` owns provider completion status; no duplicate compaction-specific response object with provider strings. Archive preparation identity belongs to existing store contracts, not the public summary DTO.

## Shared Structure / Data Model Tightness Check

No parallel summary+episodes+facts fields, child IDs, category lineage or copied serialized snapshot on proposal. `summary` is the candidate body; accepted state contains the finalized context rather than another duplicate summary string. Budget assessment retains existing orthogonal measurements. Model settings use one compound value so ordinary user saves update model/config together; absence supplies defaults without writes. Completion status and native reason are separate normalized meaning versus diagnostic provenance, not two authorities.

## Final File Responsibility Mapping

| File/group | Owner / concrete responsibility | Change |
| --- | --- | --- |
| C/direct-llm-compaction-summarizer.ts | One model request, preflight, abort/cleanup, parse result | Add, replaces child summarizer |
| C/compaction-summary-parser.ts | Exact marked-body/heading validation with typed errors | Add, replaces six-array parser/normalizer |
| C/compaction-summary-prompt.ts | Approved literal exported as runtime constant | Add; remove agent template dependency |
| C/compaction-execution.ts | Direct invocation metadata and plan/result diagnostics | Add; extracts useful types from removed strategy/runner files |
| C/pending-compaction-executor.ts | Existing attempt sequence; direct planner/summarizer; safe status handling | Modify |
| C/working-context-compaction-proposal.ts, accepted-compaction-builder.ts, accepted-compaction-committer.ts | Tight summary candidate, pure finalized construction, safe evidence/snapshot commit | Modify |
| C/memory-compaction-configuration.ts, compaction-runtime-settings.ts | Enabled direct summarizer; existing controls without strategy ID | Modify |
| C/working-context-compaction-prompt-builder.ts, compaction-conversation-history-renderer.ts | Source framing; remove correction path, limit excerpts only to tool values | Modify |
| C/working-context-compaction-output-validator.ts | Existing and strengthened retained-context/single-summary checks; rename strategy-specific diagnostics | Modify |
| M/memory-manager.ts, memory-manager-compaction-coordinator.ts, memory-manager-working-context-controller.ts | Public ownership, lineage removal, preallocated install after snapshot commit | Modify |
| M/store/base-store.ts, file-store.ts, run-memory-file-store.ts, raw-trace-archive-manager.ts | Stage/reuse validated copies, prune the prepared selection behind owner | Modify; existing manifest schema |
| M/restore/working-context-snapshot-bootstrapper.ts, working-context-provenance.ts | Category-independent, version-agnostic restore and summary-region count; same tool-repair order | Modify |
| M/working-context-snapshot-serializer.ts; M/memory-manager-working-context-controller.ts; M/store/run-memory-file-store.ts callers/tests | Current-field projection; exact versionless snapshot writer; remove version metadata/argument propagation | Modify; same message meanings/file/atomic writer |
| M/migration/native-working-context-snapshot-shapes.ts | Frozen strict released-v5 codec and pure versionless-format preservation predicate (unfinished tool groups allowed), migration-only | Add; no runtime imports |
| M/migration/native-working-context-snapshot-v5-converter.ts; S/app-data-migrations/migrations/migrate-native-working-context-snapshots-v5-migration.ts | Preserve fixed historical conversion/classification, preserve recognized successor before conversion | Modify existing migration dependency boundary; no new ID/transformation |
| Core agent/context/agent-config.ts, agent/factory/agent-factory.ts, agent/loop/llm-phase.ts, agent/llm-request-assembler.ts, agent/compaction/compaction-runtime-reporter.ts | New dependency wiring, no lineage construction, signal propagation and current status | Modify |
| Core llm/utils/response-types.ts and seven direct adapters | Normalize nonstreaming completion status; no parent streaming redesign | Modify; subclasses inherit shared OpenAI-compatible behavior |
| Core clients/autobyteus-client.ts and llm/api/autobyteus-llm.ts | Bounded cleanup request options for isolated direct-call lifecycle | Modify; no remote API schema change |
| S/agent-execution/compaction/compaction-llm-factory.ts | Current-setting + availability/secret-aware LLM construction, controlled config | Add |
| S/config/compaction-model-settings.ts; Web utils/compactionModelSettings.ts | Current tuple known-field projection, exact saving, secret-safe generation map | Add/modify; remove strict unknown-root rejection in current server codec |
| S/startup/compaction-model-settings-migration.ts; autobyteus-server-ts/tests/unit/startup/compaction-model-settings-migration.test.ts | Obsolete old preference import and import-specific tests | Remove (SR-017, relative to current branch) |
| S/services/server-settings-service.ts; S/application-platform/runtime/build-application-platform-runtime.ts | Keep explicit current setting validation/saving; remove import/await of old settings converter from platform preparation | Modify |
| S/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts | Inject direct summarizer factory for runs/team members; no builtin recursion exception | Modify |
| S/built-in-agents/built-in-agent-registry.ts; GraphQL schema/queries; asset-copy/smoke scripts | Stop registering/syncing compactor; remove algorithm endpoints and obsolete assets | Modify/removals listed above |
| Web components/settings/CompactionConfigCard.vue; stores/serverSettings.ts; graphql/queries/server_settings_queries.ts; localization/messages/{en,zh-CN}/settings.ts | Remove strategy control/read gating, add direct model/inherit selection and generation-config reuse; retain other controls | Modify |
| autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts and tests/agent-presentation-contracts.test.mjs | Current strict COMPACTION_STATUS contract and schema tests; remove obsolete live fields and add direct-summary diagnostics | Modify with all producers/consumers; rebuild shared package |
| S/services/agent-streaming/team-agent-event-websocket-projector.ts; S/agent-collaboration/execution/events/{agent-presentation-event,agent-presentation-message-projector,collaboration-agent-presentation-adapter}.ts; S/agent-team-execution/domain/team-agent-event.ts | Current event-to-presentation mapping | Modify with strict DTO, not independently |
| Web services/agentStreaming/{teamStreamDtoAdapters,handlers/compactionActivityProjection}.ts and related status handlers/types/components | Present current direct-summary status; no child-flow expectation | Modify; preserve optional historical display fields actually consumed |
| S/run-history/projection/{historical-replay-event-types,run-projection-types,event-monitor-active-trace-page-projection,transformers/raw-trace-to-historical-replay-events}.ts and related Event Monitor API/web presentation | Independent existing historical metadata reader | Preserve historical meaning/read path; audit shared type seams, not blanket-delete fact fields |
| test-support/live-e2e/live-e2e-harness.ts and compaction scenario/result fixtures/callers | Realistic long-run/constraint-retention validation | Replace child-run/JSON-repair assertions with one direct-call/summary continuation assertions; retain useful evidence and Unicode fixtures |
| Tests/docs/export files | Match the single implemented path and approved prompt; delete removed-API tests | Modify/remove; exact validation guidance below |

## Applied Patterns

Frozen shape boundary only inside an existing released upgrade; no generalized migration abstraction. Factory callback at server construction; provider adapters at existing LLM boundary; existing state gate for attempts; existing storage ownership. No compaction registry, generic workflow engine, new repository facade or memory plug-in framework.

## Target Subsystem / Folder / File Mapping

Use existing `memory/compaction`, `memory/store`, `memory/restore`, `llm/api`, server `agent-execution/compaction`, `config` and existing web settings folders; remove the obsolete compaction-specific `startup` module. The final table provides exact file paths; removal table is equally normative. The approved prompt is embedded in a TS constant so package build does not need a new Markdown-copy pipeline. Keep core exports and server asset smoke checks consistent; no dead imports or alias exports.

## Folder Boundary Check

| Folder | Structural depth / check |
| --- | --- |
| Core memory/compaction | Domain transformation/control with focused policy files; no raw provider clients or category stores |
| Core memory/store and restore | Persistence and lifecycle respectively; existing separation retained |
| Core llm/api | Provider boundary; completion mapping stays here |
| Server agent-execution/compaction | Construction only; not child-runtime management |
| Server config | Current-setting codec/defaults only; no historical translation or new startup owner |
| Web settings | Presentation and existing setting interaction; no migration or summary parsing |

No new one-folder-per-step decomposition. Existing layout is readable once obsolete strategy/category/agent modules are removed.

## Concrete Examples / Shape Guidance

- Repeated pass: `[summary A, messages 101–160, recent 161–180]` -> summarize `A + 101–160` once -> `[summary B, recent 161–180]`. Numbers illustrate selection, not a new fixed window rule.
- Response `Here is the summary\n<compaction_summary>...six headings...</compaction_summary>\nDone` -> store only the inner body. Two blocks or known incomplete status -> failure; do not pick the first valid-looking answer.
- Old saved `## Episodic memory ... ## Semantic memory ...` remains ordinary snapshot text on resume. New compaction later updates it through the same direct summarizer; no old parser, re-render or version branch.
- After archive copy but before snapshot rename: resume old snapshot; active records still present. After rename but before pruning: resume new snapshot; duplicate raw evidence is harmless and cleanup is local.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Add markdown strategy alongside structured-json | Rejected | Remove algorithm registry/path and shared categorized result |
| Accept old six-array JSON as fallback | Rejected | One tagged Markdown contract; existing user retry on invalid output |
| Keep child agent only for exceptional models/repair | Rejected | Existing direct adapters, known/unknown completion handling, normal failure |
| Runtime reads old builtin config if new setting absent | Rejected | Use current parent/model defaults without reading legacy data |
| Preserve retired model choice through startup copy or a newly registered migration | Rejected by explicit SR-017 decision | Leave old files inert; current settings begin at defaults unless explicitly set |
| New snapshot version plus bulk summary conversion | Rejected as unnecessary | Version-agnostic current-field projection, same text/provenance meaning and category-independent validation; no bulk rewrite |
| Separate summary file plus snapshot copy | Rejected | Existing snapshot is single continuation authority |
| Delete old records to prove simplification | Rejected | Stop new category processing; retain independent historical data |

## Derived Layering

N/A — the ownership and production paths above explain the change without another layer taxonomy.

## Change / Refactor Sequence

1. Pin approved prompt in core runtime module and fixtures. Define tight direct summary/result/metadata/config contracts. Add provider nonstreaming completion metadata with isolated adapter tests; do not alter parent output parsing/streaming semantics.
2. Implement direct summarizer, controlled configuration, accurate input preflight, tagged output validation, cancellation and cleanup. Replace executor strategy resolution with direct planning/invocation.
3. Pin released snapshot shapes/classification before modifying the current serializer; add the already-current successor preservation check inside the existing migration, not a new startup flow. Make current snapshot reads version-agnostic/exact writes while preserving identity, provenance and tool repair. Simplify accepted builder/coordinator; remove category/lineage dependencies. Implement staged raw copy and atomic-snapshot commit, preallocated install, postcommit cleanup/status isolation; implement category-independent restore.
4. Remove the earlier startup model-settings importer and its call/tests. Keep direct server construction with absence defaults and optional current settings/UI controls. Verify no old-config access/default-persist step on startup or attempt. Do not migrate run histories. Validate node binding/load/error/save semantics without a strategy catalogue.
5. Delete all replaced modules, exports, GraphQL strategy queries, builtin package and stale live-status fields together. Rebuild shared presentation contracts and update server/web adapters atomically. Keep history readers/data, including historical Event Monitor metadata. Update tests/docs/build smoke wiring. Intermediate compile seams may exist during implementation but no dual runtime remains in the completed package.
6. Validate the complete single path before handoff. Delivery performs coordinated shared-contract/server/core/web integration and release. Stop old processes before activating new ones; do not deploy old server with new web or vice versa. Old code rollback after new compactions is not guaranteed because old lineage gates reject new snapshots; keep a release rollback/data backup plan rather than a runtime fallback.

## Key Tradeoffs

A single marked Markdown payload is much smaller operationally than six-array generation/storage/projection, but cannot guarantee factual completeness. Keeping context planner/validator/store ownership preserves necessary safety without keeping obsolete categories. The same message/provenance meaning plus tolerant root reading avoids history migration; it does not justify unsafe write ordering. SR-017 deliberately drops old compactor preference carry-forward, eliminating the settings migration and all agent-definition dependence; current model controls remain optional. RPA unknown status preserves provider coverage without pretending its API exposes information it does not.

## Risks

- Semantic loss remains possible despite tags/headings; compare first/repeated summaries on representative histories. No quality superiority claim from source inspection.
- Token counts are estimates; provider limits/unknown completion differ. Do not retry with silent truncation or another algorithm. Surface failure with model/budget diagnostics.
- Input expansion after removing blanket clipping may reveal undersized compactor models; fail explicitly before dispatch rather than lose constraints. Users retain model choice.
- Staged archive copies may temporarily duplicate data. Cleanup is guarded by actual committed-snapshot provenance; storage leak is preferable to deleting required evidence after a failed commit.
- Power-loss/fsync behavior and concurrent old/new writers are not redesigned. Existing per-file atomic replacement is the stated guarantee.
- External deep-import consumers may break. Audit known workspace callers, document removed APIs and use independent review; no compatibility facade.
- External old file-backed redesign must not be merged into this implementation. Independent reviewer receives this approved basis, not stale review artifacts.

## Guidance For Implementation

Implement only this approved scope. Do not perform new live-model calls against user histories without an appropriate controlled test setup. Use synthetic/consented fixtures and preserve provenance of expected facts.

| Validation | Required observations / approved IDs |
| --- | --- |
| Prompt/parser unit | Exact approved literal; one block/six sections; exterior prose ignored; absent/empty/multiple/nested/incomplete marker rejected; content never taken from reasoning. AC-011 |
| One-call lifecycle | Current-parent inheritance versus explicit override across attempts; fresh LLM, no child AgentRun/tools/category parser; one logical call; provider request cannot override system/tools/cap; signal abort and cleanup paths. AC-006 |
| Provider adapter units | complete/incomplete/unknown mappings for each family including closing-tag+length result rejected; RPA unknown explicit; no assumption of RPA output cap/stop metadata. AC-005 |
| Input rendering/capacity | Long user/prior summary middle constraints survive; tool excerpts labeled; actual rendered input+reserved output fits selected compactor model or fails pre-call. AC-004/007 |
| First/repeated compaction integration | One summary, unchanged required head/recent/tool groups (except existing native thinking cleanup), previous constraints/corrections preserved; final budget; no new category/lineage files. AC-001–004/007 |
| Commit fault injection | Failure during archive prepare or snapshot write leaves old snapshot+active; completed archive reused; abort before commit blocks mutation; after commit pruning/reporter failure cannot trigger semantic retry or claim rollback; retained evidence never pruned. AC-005 |
| Resume/history integration | Supported old combined-summary snapshot with old files; same valid current message shape without category/lineage files; new versionless Markdown snapshot; all use one current reader without generation. Ignore obsolete root/version extras and exclude them on normal save. Reject missing current facts, identity/protocol/range errors; retain native provider context. Historical category and raw views remain. AC-008/009 |
| Frozen upgrade regression | Released predecessor fixtures and omissions/dispositions unchanged; fixed strict-v5 output/classifier independent of current root tolerance; eligible upgrade preserves current-format versionless successor bytes/summary/category residue before raw reads, including zero/partial/raw-ahead tool-result states; recognition is separate from final dispatch validation; invalid identity/shape is preserved with scoped failure, never converted to empty; terminal ledger never replayed. No new migration ID or runtime legacy import. AC-008/009 |
| Settings/default/API/startup | Absent current key needs no Save/setup/write and uses each attempt's actual parent model/provider; old valid/custom/malformed config never read or imported and stays byte-unchanged; startup does not invoke converter; explicit current model/config saving survives restart; unrelated root extras ignored/projected out, known invalid fields and credentials rejected; unavailable selection errors without fallback. No fresh compactor credentials required for inherited model. AC-010/012 |
| Settings/status UI | No strategy catalogue blocking controls; inherited/model selection and config, threshold/override/debug, current node binding, loading/errors/saves; progress/failure display has no child-run/fact links. AC-010 |
| Source/build audit | Removed symbols have no production imports/exports; server/core build and builtin assets smoke pass; native run and team-member construction use same direct path; independent inspection still works |
| Model quality | Report separately from deterministic plumbing. On controlled histories evaluate first/repeated critical constraints, latest requests, approvals, exact references, honest completion, enough detail and compression size. No claims of guaranteed semantic completeness |

Use repository Vitest non-watch commands and web tests with `--run`; record exact commands/results. Original SR-013 evidence was six design probes plus earlier research. Later implementation/source/API reports and SR-016 rebase checks retain their scoped historical results; SR-018 has source characterization and refreshed-base narrow checks, not target implementation acceptance. See E18-1–5 and the SR-018 handoff. Architecture Reviewer independently reviews this High-risk package; subsequent routing is determined by tools, not this document.


## SR-018/SR-019 Review Scope, Open Acceptance Findings and Authority

The revised structural design is complete against approved SR-012+SR-017 intended behavior and literal prompt-v5. Candidate-v6 is **excluded**, not silently approved or necessary to understand this architecture. Do not integrate it, change temperature/model support, add semantic validators/repair calls, or run more providers under exhausted SR-014 bounds. Architecture review can assess this completed structural package while semantic acceptance remains failed; a structural Pass does not close that failure or authorize release.

- API-F005: actual summary promoted a requested plan edit to completed/current work. Four bounded diagnostic A/B/B/A outputs failed at temperatures0.7 and0. A faithful summary remains required by REQ-006/AC-002/007. No proven prompt/model/config remedy; candidate-v6 remains separately Ready for Approval. Retain every failure/positive sample and limits.
- API-F004: original three-tool continuation failure lacked retained low-level cause; later four-tool passes do not explain it. The later SR-014 observation also lacked normal Prisma setup. Retain as separate unresolved acceptance evidence.
- SR018-OBS-001: refreshed-base five-file no-provider check reports42Pass/2Fail. `ContextFileOwnerResolver` now requires `{locations,memoryDir}`; the API-owned harness wrapper supplies only `{locations}` at line112. Both failed tests encounter `path.resolve(undefined)` before their intended path. This is observed test-support composition drift, not retrospective proof of API-F004's cause. API/E2E owns the harness/tests and subsequent execution; Implementation/Reviewer coordinate through their normal boundaries, not a Solution Designer source fix. Do not weaken owner/admission checks to make tests pass. Even after supplying the owned root, requested file-owner/readiness semantics require revalidation; no claim of a one-line complete remedy.
- Nine API-owned durable paths remain pending eventual proportional successful-test review. SourcePass9.40, API-REV-002 Fail82.9 and earlier scoped results remain historical, not rescored. Refreshed base/conflict resolutions require current review/validation. No Delivery result.

Review requested especially for no-import completeness, default-parent/current override behavior, unchanged selection/history semantics, root-reader/frozen-upgrader separation, preservation/cost/admission, absence of new unnecessary machinery, and the adequacy of the explicit open-gate plan. If these choices require a behavior change or more historical conversion, return to Solution Designer rather than broaden scope. Large/High classification stands from actual cross-runtime/persistence/contracts scope, not document volume.
