AUTHORING SNAPSHOT ONLY — authored before final user no-migration clarification; canonical design-spec.md SR038 is the sole normative design and supersedes this fragment.

## SR038 accepted-input identity — bounded completion of IR010-DI001

### Current state, intended delta and design health
**Bug Fix with narrow refactor; Missing Invariant / Boundary issue.** Admission already owns the accepted-input keys. Native recording drops them; saved projection cannot reconstruct them; the frontend builder also drops them. Fresh history and live Held state cannot join. E37 personally reproduced and isolated this, not merely a speculative source finding. No evidence establishes double admission/execution or that origin/personal introduced it. E38 identifies secondary dedupe/attachment risks before implementation.

**Refactor needed now, narrowly:** typed identity through existing owners, one pure comparison policy shared by server/browser presentation, and one pending-user upsert owner. Remove competing OR matchers and semantic fallback for identified inputs. Do not move the queue, raw store, root ownership or compaction state machine. The earlier no-storage-change assumption was incomplete; this is Design Impact, not a change to Approved Hold A then B.

| Approved behavior / trigger | Evidence | Preserved outcome / target spine |
|---|---|---|
| BEH005, SCN005, REQ012, AC014/017; ordinary input reaches pre-parent compaction failure, then View → Reload with same live backend | E37 one raw/history/live A, two rendered copies; exact-key intervention isolates cause | One historical A updated with live Held state; B separately queued if present; no resend/reingestion/parent execution; DS016–018 |
| BEH004 and upstream sender REQ014/AC016; select saved/live hosted Agent or Team member | E38 normal raw reader and sender-aware replay/conversation owners | History readable, attachments retained, inter-agent delivery not relabeled user, distinct accepted inputs stay distinct; DS016/017 |
| BEH005/007; later recovery or Stop | Existing SR030/SR034/SR035 lifecycle | No new retry, lifetime or status policy; only authoritative live state supplies badges, stale revisions rejected; DS018 |

No new scenario ID, prompt/model/provider budget, recovery trigger, native cold activity journal, command replay contract or Product redesign. Product supplement **N/A — not requested for this delta**; upstream externally owned UI/sender requirements remain. All cumulative supplements listed above and in E38 reference index retain scoped authority.

### Selected identity contract and concrete shapes
An **accepted input key** correlates presentations of one admitted input. It is not raw trace record ID, turn number, queue persistence or authorization. Keep RawTraceItem.id, correlationId, turnId, sequence and sender meanings unchanged. Do not persist arbitrary metadata or pass these keys into the model prompt.

1. At native ingestion, take message_id and dedupe_key from **original triggering AgentInputUserMessage.metadata**, alongside original attachments/sender, not rewritten LLM text. Carry optional typed messageId/dedupeKey through MemoryManager and native raw construction. Serialize only known nonblank fields as message_id/dedupe_key on user traces. Extend ordinary RawTraceItem round-trip and server normalizer. Missing/null/non-string/blank means **unknown**; never generate identity from text, time or position. Other trace kinds do not gain input keys.
2. Follow existing presentation normalization: trim surrounding whitespace; require nonempty string; preserve case/interior characters. Existing DTO nonEmptyStringSchema and frontend normalization already trim. The parked candidate's no-trim rule is rejected. This is projection identity, not a redesign of admission validation. Supported composers generate fresh nonblank IDs; arbitrary metadata does not establish supported retransmission.
3. Primary presentation identity is normalized **messageId**, otherwise normalized **dedupeKey**. Use a tagged key, e.g. ["messageId", value] versus ["dedupeKey", value], never cross-field string equality. Both sides must have the same primary key. Different message IDs **never merge**, even with equal text/time or shared secondary dedupe key. Two dedupe-only entries can match. An ID-bearing row and dedupe-only row do not automatically match: retain both rather than infer missing identity. This avoids transitive partial-key bridges.
4. Message ID identifies the accepted input; dedupe key is a producer correlation token, not authority to override a conflicting message ID. Current standalone submission can retarget dedupe key when a temporary run becomes permanent while retaining message ID. Same message ID with changed secondary key is therefore still one input. Preserve both known fields; absent values never erase known ones. Saved duplicates retain a known secondary value deterministically; authoritative live pending state may refresh it. No alias registry.
5. Scope equality to the **already validated node-bound recipient AgentRun conversation** and, for saved projections, same kind/role and exact sender provenance (senderId, senderAgentRunId, senderAddress; absence distinct from supplied value). Never join across recipient/node/user-vs-agent kind/different sender. Existing root/member routing owns this boundary; no global index.
6. Both server and browser saved-input dedupe use this policy **before** body/time equality. Identified inputs cannot enter semantic/time fallback, including against keyless rows. Two keyless rows retain existing semantic/time policy with equal sender provenance additionally required. This is single-current-schema optional semantics, not an old-version branch. Unrelated assistant/tool/activity dedupe stays unchanged.
7. Normal replay/conversation output uses typed camel-case keys for input entries, including sender-bearing user traces projected as inter_agent_message. Web saved-user construction copies keys onto UserMessage. Existing inter-agent segment construction may copy known messageId into its existing optional field; it preserves agent presentation/sender and never gains user pending badges. No new GraphQL endpoint or pending-state wire envelope.

Examples within one recipient/sender scope:
- history messageId=A + pending message_id=A → one A with Held.
- IDs A/B with identical text/time/files, even shared secondary key → two messages.
- Neither has message ID, same dedupe key → one; different tagged-key types → no automatic join.
- Old keyless history + identified live entry → no guessed join. Correctness for new inputs comes from retaining identity at the producer, not falsifying old facts.

### Persisted data / state transition decision
**Stored data affected additively; Directly Usable — No Migration.** Supersedes only SR035's unchanged raw writer/reader/stored-identity decision and earlier raw-schema exclusion. Native pending/recovery/activity state retains the approved in-memory lifetime.

- Subject: per-run active/numbered raw JSONL, traversed through existing manifest/layout. New user rows add at most two optional strings. E38's own sample: 42,338 bytes / 6 rows / 3 user rows without keys. E36 separately inspected 5 test-owned active/numbered files / 191,815 bytes / 44 rows. Neither is a private installed-data census.
- Ordinary writer/reader: RunMemoryFileStore appends RawTraceItem.toDict and reads through fromDict; rotation preserves complete record objects/segment bytes. Server normalizer maps recognized fields. Extend these codecs, not storage algorithms. No new mandatory fact is needed to preserve existing text/media/files/sender/order/inspectability.
- Old absence truthfully means identity was not recorded. It cannot be uniquely recovered; no backfill using hashes, timestamps, turn IDs or raw IDs. Retain old history exactly. Known new keys survive ordinary archive/current reads and existing record rewrites.
- Benefit/cost: exact new-history/live correlation without scanning/replacing old conversations, extra queue, schema marker or recovery journal. No volume-dependent startup work; only optional strings per new input. No disposal/rebuild authorized. Keys confer no access/path authority; existing run/node/privacy boundaries remain.
- Coordinated core/server/contracts/web cutover, with old process stopped before new writer owns its paths. No promise of hot-upgrading an already-held old-writer input or preserving pending queue through backend restart. Frozen old captures remain keyless and may still demonstrate the historical defect; do not modify them to claim a fix. Acceptance must use fresh **native-produced** history from corrected code.
- Manifest/layout/snapshot/settings/tree/message formats, schema versions and migration registration stay unchanged. No new global/capability/run startup gate for optional-key absence. Unrelated corruption retains existing validation, not permissive data repair.

**Migration convention/predecessor check:** E38 rereads autobyteus-server-ts/docs/design/data_migration_guideline.md and released raw-trace-rotation-layout-migration-run.ts, alongside E36 current-read/admission investigation. The predecessor copies authoritative complete segments; missing complete source errors; pending residue is preserved/excluded; missing pending sources can be discarded as nonfacts; orphan segments without authoritative manifest are not promoted. New fields neither reclassify sources nor make all history a startup/new-work dependency. Frozen migrations/source dispositions stay intact.

Convention checklist: owner/invariants identified; installed-data census unavailable, not fabricated; representative old/new/mixed rows required below; source dispositions retained; normal reader version-agnostic; admission unchanged/scoped by current owners; no transformation/completion ledger; no new backup/journal/recovery workflow; no cross-root reference changes; coordinated rollout and regression checks. Migration plan/steps **N/A — no conversion required**. Existing per-file semantics are not a transaction or power-loss guarantee.

### Spines, actors, ownership and return flow
| ID / scope | Arrow chain / narrative | Governing boundaries |
|---|---|---|
| DS016 / primary recording | composer/admission → native original input → MemoryIngestInputProcessor → MemoryManager.ingestUserMessage → buildNativeUserMessageTrace → RawTraceItem → raw store | Admission owns accepted identity/queue. Ingestion retains two facts with sender/files. MemoryManager is recording facade, not identity allocator. Same-turn recovery never reruns ingestion. |
| DS017 / return/read | raw store → normalizer → replay → conversation transform → server input dedupe → member projection JSON → web input dedupe/builder | Mappers preserve keys/sender. Existing per-run reader owns selection/windowing. No sidecar/lookup ledger. Archive/current share codecs, no parallel old/new path. |
| DS018 / bounded presentation | validated root/member hydration → saved conversation → input-state handler → pending-user upsert → same message with Held/Queued | Handler owns instance/revision/block and obsolete-badge clearing. User-message projection owns lookup/construction/merge. No send/admission/inference/execution. Live events use the same path as snapshots. |

No new event-loop/worker spine; SR030 suspension/resume remains. Off-spine: attachment construction in existing context-attachment utilities; sender resolution in existing collaboration/history presentation; scope/liveness/revision exclusion in root/context owners; physical layout in memory store. Moving these into a generic dedupe manager would obscure authority.

### Pending overlay, attachments and boundary encapsulation
Identity retention makes a secondary source-derived risk reachable: pending payload has non-media file references, current handler mapping discards file_name, and generic upsert can replace executable/media attachments. Correct joining must **not erase saved attachments because a live overlay omitted them**.

- Extend existing userMessageProjection.ts with a named **pending-user upsert**, e.g. upsertPendingUserMessage, alongside accepted-echo upsert. This is policy in the existing owner, not new service/options framework.
- Handler delegates pending lookup/construction/merge; remove its second OR-based find. Keep same-instance revision guards, recoverable status, user-only filter and pending-badge clearing. No badge on agent/system delivery.
- Pending upsert uses primary identity, preserves existing timestamp and mention/sender presentation facts, overlays live original text/current pending state, and preserves known identity when incoming value is absent. An unmatched identified user appends once.
- Map pending file_attachments.uri/file_type/file_name with existing attachment hydrator. Matched overlay preserves media/files, adds known incoming files, fills missing names without replacing a richer explicit name with a generated/absent value.
- Attachment union dedupes by exact normalized **locator + type**, not basename/attachment.id alone; two locators with same filename remain distinct. No invented draft→final locator mapping, changed finalization owner or file read/fetch during reconciliation.
- Server/browser saved exact-input duplicate merges likewise retain keys/provenance/content and union media/files. Empty/absent arrays do not delete known attachments. Deterministic order/timestamp; live overlay cannot replace history timestamp with "now."
- **Do not globally apply pending union to accepted echoes.** Existing member echo tests deliberately drop stale executable attachments but preserve non-executable references. Retain separate echo policy inside same owner; Org/standalone submission/echo ownership unchanged.

Boundary check: ingestion passes original facts through MemoryManager, never direct server/UI raw writes; saved projection read-only; pending upsert accepts already-routed context+entry, not run resolver; root hydration remains thin caller, never reimplements matching. Interfaces have singular subjects/explicit scope. No private-context-map bypass or global/cross-node search.

### Reuse, shared structures, final file and folder mapping
Draft alternatives: per-consumer key helpers or new live-correlation registry. Final tightening: one small pure presentation key policy; existing models/transforms; core independent of presentation packages. No parallel authoritative input object or generic utility module.

| Path (worktree-relative) | Final action / responsibility | Owner / placement / exclusion |
|---|---|---|
| autobyteus-agent-presentation-contracts/src/accepted-input-identity.ts (new), src/index.ts | Pure normalized tagged-primary-key function/types; export and focused contract tests | Shared presentation contract; no state/store/network/framework; server/browser consumers only |
| autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts | Take two original metadata keys; pass with sender/files | Native input owner; no LLM metadata injection or presentation dependency |
| autobyteus-ts/src/memory/memory-manager.ts and raw-trace-ingestion.ts | Typed optional identity into existing user trace builder | Small explicit argument, e.g. Pick of raw options; no arbitrary metadata/new allocator; sender parameter meaning unchanged |
| autobyteus-ts/src/memory/models/raw-trace-item.ts | Optional camel model fields, ordinary snake serialization/deserialization on user records | Persistence model; no version switch/raw-ID repurpose; primitive normalization obeys stated convention without presentation dependency |
| autobyteus-server-ts/src/agent-memory/domain/models.ts and services/raw-trace-record-normalizer.ts | Typed optional trace-event keys; normal raw mapping | Existing memory reader, no sidecar scan |
| autobyteus-server-ts/src/run-history/projection/historical-replay-event-types.ts, transformers/raw-trace-to-historical-replay-events.ts, transformers/historical-replay-events-to-conversation.ts, run-projection-types.ts | Carry keys on input events/conversation, including agent-origin; retain kind/sender/files | Existing read transforms; no send/lifecycle authority |
| autobyteus-server-ts/src/run-history/projection/run-projection-dedupe.ts | Typed scoped input identity before semantic fallback; lossless exact-input merge | Shared key policy; retain unrelated assistant/tool/activity behavior; remove untyped input metadata aliases only |
| autobyteus-web/services/runHydration/runProjectionConversation.ts | Typed keys; same input/sender dedupe policy; lossless merge; copy user keys/known agent messageId | Existing saved builder; preserve windowing/tool/sender display |
| autobyteus-web/services/agentStreaming/handlers/userMessageProjection.ts | Shared key consumption; pending-user upsert/attachment overlay; separate accepted-echo policy | Existing projection owner, not queue/command; existing attachment hydrator |
| autobyteus-web/services/agentStreaming/handlers/agentInputStateHandler.ts | Delegate pending projection; remove duplicate matcher; keep revision/status/lifetime | Remains small live-state handler; no root-store/component copies |
| Existing focused core/contract/server/web tests + native-root integration fixtures | Producer→serialized history→live tests and identity/sender/attachment/no-send controls | Implementation checks; preserve API-owned files/evidence; no SD test-authority overwrite |
| Existing memory/history/chat docs, if wording needs sync | Accepted-vs-consumed and optional history correlation | Delivery documentation sync; no new Product UI layout/copy/prompt |

Draft/final allocation is consolidated rather than duplicate tables: extend existing subsystems, create only pure contract helper. Reusable-structure check: message identity and producer dedupe token have distinct meanings; neither duplicates raw ID. Typed fields replace metadata peeking rather than coexist as another authoritative representation. Normalization at actual raw/wire boundary is not a legacy decoder.

Naming check: accepted-input identity/raw trace/saved conversation/pending overlay are natural distinct subjects. Folder check: existing native-input, persistence, history-transform, frontend-projection folders already separate layers; pure helper belongs to presentation-contract package. No new hierarchy justified.

Dependencies: server/browser may import pure comparison policy; core may not import server/frontend presentation packages. Raw store never imports live admission; UI never reads raw files or Sends during hydration; root stores use public projection functions. Helper must not grow a registry/cache/transport wrapper. Existing models/attachment subsystem are reused, not cloned.

### Removal / decommission and compatibility rejection
| Remove / reject | Reason / replacement | Scope |
|---|---|---|
| Independent input-handler OR matcher; conflicting message IDs overridden by equal dedupe key in user upsert | One primary-identity rule and pending merge owner | In this change |
| Semantic/time fallback for identified inputs in both saved projections | Can collapse distinct inputs; scoped tagged-key comparison instead | In this change |
| Untyped input identity aliases in server projected metadata/snake fields | Typed camel output, normalize only at actual raw/wire boundaries | In this change; legitimate unrelated invocation identity stays |
| Pending mapping discarding file_name / deleting existing media | Named pending overlay with truthful attachment union | In this change |
| Text/time/latest-row join; turn-only correlation; raw-ID/correlation-ID overloading | Not accepted identity; restores reuse turn labels; equal messages valid | Rejected, no fallback |
| Live association registry/raw-trace-ID feedback event | Could be made unambiguous, but adds association lifetime/event/lookup contract versus retaining already-owned keys | Not selected; no speculative shadow ledger |
| Version switches/backfill/dual writer/restart-durable queue | No semantic need; unknown historical fact cannot be guessed | Rejected; optional ordinary codec only |
| Parked no-trim/partial-key design as another path | Inconsistent normalization/ambiguous equality | Historical only |

Clean-cut legacy policy: replace affected comparison once, no feature flag/compatibility wrapper running old+new matching. Truly keyless data has optional semantics in the single current schema, not version-dependent legacy logic. No whole-file removal beyond obsolete local matching code justified.

### Change sequence, verification obligations and risks
1. Preserve current merge/index and owner evidence. Implement raw optional fields, codec and native plumbing with round-trip checks. Add pure presentation identity contract; normal generated-output builds under implementation ownership.
2. Extend normal memory/replay/conversation types/mappers and server input dedupe/merge. No current-runtime migration decoder import.
3. Extend web saved builder/dedupe and pending upsert; remove duplicate matcher; retain echo policy. Hosted Agent/Team hydration reuses same owner, no special-case repair.
4. Native-produced history regressions, focused checks and rendered feedback; then selected source review → integrated API/E2E actual renderer journeys → successful-test review → Delivery. Historical passes/diagnostics do not replace these.

| Required proposed-code check (not yet executed) | Oracle |
|---|---|
| Actual native ingestion → serialized raw → ordinary reader → saved projection → web builder + actual live Held state, hosted Agent and Team lead | One A with Held, original text/files/sender; producer-generated keys, not repaired hand-authored history |
| A held/B queued, later successful recovery | Distinct identities, FIFO/one consumption each, no replay/extra compaction permit; existing revision/native-instance guards |
| Identical text/time/files with IDs A/B; shared secondary key; different senders/recipients | Distinct through server AND browser dedupe; exact primary identity at same scope joins once |
| Dedupe-only pairs, ID-only pairs, whitespace, malformed/missing optional keys, mixed keyless+identified | Stated tagged-key/unknown policy; no heuristic join/alias peeking |
| Rich history + pending subset/omitted media/filename | Media/files/explicit names survive, same filename at distinct locators preserved; echo stale-file behavior unchanged |
| Old keyless + new keyed active/archive rows, repeat reads/rotation/rewrite | Existing meanings readable, new known keys survive codecs/store; no backfill/startup lockout; existing scoped admission still allows valid old data alongside unrelated invalid-root fixtures |
| Actual isolated packaged Agent + Team View → Reload, same backend/native instance, repeated, attachment | Real renderer replacement and rendered single message; no admission/model send on hydration; API also completes retry continuation/negative matrix |
| Inter-agent sender, standalone/host/Team/Org echo and Stop/status/window regressions | Kinds/sender preserved; no user badge on agent/system; unrelated tool/activity/window behavior unchanged |

Risks: producer/reader/build mismatch; semantic collapse of distinct inputs; pending erasure of media; matcher regression in echo callers. Controls above address each. Old-writer held input cannot be repaired exactly after the fact; explicit transition scope, not data-loss workaround. Generic same-ID command replay and external-runtime recording are not expanded. Unknown: proposed-code checks and corrected desktop result unexecuted; no concurrent-writer/backend-restart/power-loss claim.

**Completed classification: task_size=Large; architectural_risk=High.** Cumulative solution spans core/runtime/server/contracts/web. This bounded repair crosses native persistence and saved/live presentation; optional serialization and shared equality materially change contracts even without migration. Document/reference volume is not rationale. Escalate before new allocator/registry, queue lifetime, migration/startup gate, authorization, generic retransmission policy or changed intended behavior. Approved SR033 unchanged.

**Architecture Design Complete for selected independent review**, not implementation/validation closure. Technical answer to IR010-DI001 supplied; reviewer has not closed it. CRR015/API009-F001 remains open. ARCH005 covers SR035 only. API00977.9% executable Fail unchanged; CRR0149.40 historical/corrected; pre-integration passes scoped. F005 accepted-known/nonfixed/nonPass/Qwen STOP; F004 unknown; SR022 exhausted/v6 unapproved; CG033 unproved/not pump Pass; OOM/webtsc7078 non-green;14 wider+7 baseline unwaived. API006 withdrawn/API007 unsupported excluded. API009 three files still need successful-test review after successful validation. Two overwritten IR009 logs remain CRR014 replacements, originals unavailable. No source/durable test/build/provider campaign or Delivery/finalization performed by SD in SR038.
