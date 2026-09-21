# Architecture Context-File Ownership Investigation

## Status and scope

Current: AD-REV-026 / CRR-081 / CR-FIND042; see the appended non-media
association evidence and decisions. The following AD-REV-025 scope and source
pins remain historical, not claims the exact-owner implementation is absent.

- Package AORG-FLAT-TEAM-001; Architecture recovery IR048-DI-001 / AD-REV-025.
- Approved authority RER-033@f84c5299f10898f49acff6a0e481d1cd61c769a9.
- Source checkpoint 6d77b3c8b2d3deeddd5c3392dc2ce69bc63b7982;
  incoming result 5636a1f3a7978cd280a85f7f4602c8db5c63b6ab.
- Last completed independent review ARCH-REV-021@93aafae8f13a239b382a5f3f246f10b661f90733
  on AD-REV-024@b26c90787cf5ded1da6364ca52e7ae1e6b635cba.
- Read-only Architecture investigation 2026-09-12. No source/test changes,
  migration execution, user-data mutation or browser/provider rerun.
- This evidence map supplements the canonical design. It is not a competing
  requirement or an executable pass. DS-041–043 own the proposed correction.

## Supported scenario and root cause

A user uploads to an exact configured Agent, sends, delegates supported work to
an Agent/Team at the same configured source address, and later opens a retained
attachment. A temporary execution has a distinct AgentRun ID even when its address
matches the configured source. The same collision applies across direct Org and
mounted/fresh-Team contexts. Task settlement preserves the indexed execution.
These are approved user/task/history paths, not scenarios justified merely by
constructing a synthetic tree.

IR-048's probe reproduces that supported state using actual strict tree/store,
location and owner resolver implementations. It does not exercise file upload or
write bytes. Its one passing observation asserts the broken rejection; it is not
a successful product test. It correctly returns the new API/identity issue to
Architecture rather than guessing at a Local Fix.

| Evidence | Observed current responsibility / defect |
| --- | --- |
| `autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts` | Org draft has orgDraftId/address; final has orgRunId/address. Locator builders omit exact AgentRun ID. |
| `.../context-files/services/context-file-owner-resolver.ts` | Both async finalization and sync file-location paths pass root/address without agentRunId. Returned location includes agentRunId, but only after an ambiguous lookup. |
| `.../agent-org-execution/services/agent-org-execution-tree-location-service.ts` | Already accepts agentRunId and validates exactly one matching indexed execution across retained configured/task nodes. STORED_ONLY default does not activate a runtime. |
| `.../agent-collaboration/execution/services/collaboration-execution-location-service.ts` | Explicit family/root/AgentRun selection already composes existing strict readers. No new index needed. |
| `.../agent-memory/store/agent-memory-layout.ts` | Existing final physical path includes exact AgentRun ID and genuine Team ancestry. File bytes do not need re-keying for the new final locator. |
| `.../context-files/store/context-file-layout.ts` | Org draft directory is address-shared, unlike final exact physical storage. |
| `.../context-files/services/context-file-finalization-service.ts` | Resolve final owner, ensure directory, move/reuse each filename, emit final locators, prune draft. Needs matching exact Org owner-pair validation before mutation. |
| `.../context-files/services/context-file-upload-service.ts`, `context-file-read-service.ts` | Existing MIME/filename/TTL/read/delete owners are reusable. Draft admission must retain exact Org execution identity. |
| `.../api/rest/context-files.ts` | Org draft/final GET routes are address-only; Org draft DELETE is missing. Existing POST/delete errors400 and missing files404 provide current error grammar. |
| `.../context-files/services/context-file-local-path-resolver.ts` | Current regexes reconstruct address-only descriptors before provider normalization. Must change in lockstep with REST/builders. |
| `.../agent-execution/input/agent-run-provider-input-normalizer.ts` and `domain/agent-run.ts` | Provider dispatch uses a copied/normalized message; attachment owner correction must preserve original accepted URI and exact local file resolution, not mutate admission/ack policy. |
| `.../agent-memory/services/runtime-memory-event-payload.ts`, `runtime-memory-event-accumulator.ts` | Forwarded image/audio/video URIs persist in raw-trace media fields. |
| `.../run-history/projection/event-monitor-active-trace-page-projection.ts` and raw-trace transformer | Normal retained media projection carries saved URIs through to user attachment rendering. No current old-to-new URL transform exists. |
| `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | IR-048 connects Org chooser to existing draft upload but drops the captured AgentRun when building owner. Exact active target is already available. |
| `autobyteus-web/stores/agentOrgContextsStore.ts` | submitPreparedAgentMessage captures org ID, AgentRun, address and context; finalization builders currently discard AgentRun. Deliberate continuation and local-submission guards already exist. |
| `autobyteus-web/utils/contextFiles/contextFileOwner.ts`, `contextAttachmentModel.ts`, `composables/useContextAttachmentComposer.ts`, `stores/contextFileUploadStore.ts` | Builders, locator recognizers, owner equality, remove/clear and result hydration must agree. No durable Org draft-owner browser registry was found in these stores/composer. |

## Original Team comparison (read-only)

`git rev-parse origin/personal` returned 5645b49d6f51faa60bd3545bc8e3f0e7e3f96793;
no fetch or branch switch. `git show origin/personal:<path>` read:

- `autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts`:
  standalone final owner is runId; Team final owner is containing teamRunId/address.
- `.../context-files/services/context-file-owner-resolver.ts`: passes containing
  TeamRun ID and address to the location service.
- `.../run-history/services/team-run-execution-tree-location-service.ts`:
  filters index candidates and requires exactly one; agentRunId input already exists.
- `.../agent-team-execution/services/team-execution-index.ts`: task Team members
  belong to their fresh TeamRun; direct task Agents retain their actual owner Team.

Therefore the older Team contract distinguishes members in different fresh task
Teams, but can still be ambiguous for same-host/address task Agents. No claim of
an observed baseline failure or new Team correction is made. Current Org owner
uses only root/address and loses even the containing-Team distinction. The target
uses exact AgentRun ID with root membership validation, not a fake Team parent.

## Read-only persisted-data samples and limits

Two Python read-only walks inspected JSON/JSONL under the named roots, excluding
symlinks and files above 20MB. Broad string matches were refined to structured
string fields; conversation prose mentioning routes was excluded. Counts are
observations, not a production-wide cutover inventory. No attachment content,
credentials or user conversation text was copied into this artifact.

| Sample root | Observation |
| --- | --- |
| `/home/autobyteus/data` | 1325 JSON/JSONL files in bounded first walk; 178 context-file paths; zero Org trees. Broad route mentions were not treated as actual locators. |
| `/home/autobyteus/data/memory/agent_teams` | 166 actual server-relative Team final URLs in raw-trace `media.images[]`; 97 nested-root, 69 flat-root. Every URL's filename maps to exactly one physical context file in its root; all 166 also match the trace owner's directory. This latter observation is not a general permission to infer owner from viewer/record. |
| `/root/.autobyteus/server-data` | 99 JSON/JSONL files in bounded walk; 4 Org trees; zero context-file paths and no matching structured attachment locator fields. |
| `/tmp/autobyteus-dr009-user-test-20260911/server-data` | 29 JSON/JSONL files in bounded walk; 2 Org trees; zero context-file paths and no matching structured attachment locator fields. |

The 166 URLs occur in 77 trace files totaling 92,559,674 bytes; largest file 7,852,024
bytes. These metadata counts support a per-file transformation, not loading or
rewriting the entire history corpus.

The 166 saved URLs prove a concrete continuity issue: the family migration renames
nested Team packages to agent_orgs while their structured attachment locators
still name the Team route. The current Team route correctly resolves only Team
family locations. Existing migration source converts tree/sidecar envelopes and
moves directories; it does not rewrite these media locators. Existing context-file
bytes are correctly exact-AgentRun located and should stay so.

The normal path through raw-trace media serialization and history projection
establishes why the URI fields matter. Required initial conversion must preserve
usable links, not just byte-preserve a string that points to the wrong family.
This is separate from removing authored schemaVersion or renaming org_local.

## Additional evidence-only Implementation response

Implementation confirmed no prior real user/deployed Org attachment inventory.
The preservation hash inventory is not a content inventory. API29's particular
Org chooser attempts emitted zero uploads, but that does not prove global absence.
The owner variants/builders were introduced at 37d05c7f71df925dd6f36a4fb1668ef8e1cee450
(2026-09-01), which is source lineage, not deployment proof. DR009 is documented
local user-test exposure, not a public rollout or proof about shared data.
Architecture requested only existing provenance from Delivery; no new mutation,
rebuild or implementation task was assigned.

## Decisions and non-decisions

- Exact Org owner/locator is DS-041; shared-surface and service ownership DS-042.
- DS-043 isolates known saved-locator transformation in the existing initial
  family migration. It preserves original file bytes and exact source ownership.
- Do not add a new migration merely because local test artifacts used an older
  branch shape. Conversely, never assume saved attachment data absent from the
  definition-authoring first-run premise.
- A real cutover must record actual data roots, affected structured locator/draft
  cohorts and migration status. Unknown draft ownership or already-completed
  migration plus old locators is a concrete return condition, not permission to
  discard, reset/replay or add a permanent address-only reader.
- Existing RER033/AD024 naming and first-run target remain; no new Product or
  Requirements decision is invented. No architecture-created implementation
  handoff, source/test modification, native runtime action or validation pass.

## AD-REV-026 — CRR-081 / API33 Non-Media Association Recovery

### Authority, scope and method

Current recovery is CR-FIND042 / API-FIND035 under unchanged RER-033, following
AD-REV-025 / ARCH-REV-022 Pass. Source3d9a019d320878c421429f27c0f074f9a4c4c2f5;
artifactf8a3f37af0969748f05f0605e5fae1a1cc77f10f. The earlier sections retain
AD25's address-only-owner source evidence; that owner implementation is no
longer the current missing seam. The new failure is the absent original
non-media association between Send and history, not file storage or retrieval.

Read-only inspection: current source, CRR081 source/proof report, API33 actual
stored raw records and supplemental desktop screenshot. No application tests,
browser/provider/HTTP requests, migration, runtime or fixture mutations were
performed by Architecture. Reviewer/API live observations keep their ownership.
The screenshot shows retained Interrupted/Offline history with image-only
Context files; its recorded post-shutdown capture label is preserved.

### Producer/reader evidence map

Paths are relative to the canonical worktree; server abbreviates
`autobyteus-server-ts/src`, core abbreviates `autobyteus-ts/src`.

| Source | Current observation | Design consequence |
| --- | --- | --- |
| server `agent-execution/domain/agent-run.ts`, `agent-run-command-observer-dispatch.ts` | Backend gets a normalized copy; forwarded observer receives original input; observer delivery is isolated and not a new persistence ACK | Capture original refs at existing recorder, do not change command admission/failure semantics |
| server `agent-memory/services/runtime-memory-event-payload.ts:71–81`, `runtime-memory-event-accumulator.ts:50–62` | Pure extractor selects only image/audio/video; same user row has no non-media field | Shared disjoint media/file partition needed before append |
| server `agent-memory/domain/memory-recording-models.ts`, `store/external-runtime-memory-writer.ts` | User shares a non-tool arm; writer maps media into RawTraceItem | Tighten user-specific file facts and preserve in one append |
| core `memory/models/raw-trace-item.ts` | Versionless toDict/fromDict has media but no generic file facts | Optional non-media file_attachments, not a new ledger/file or version ladder |
| core `agent/input-processor/memory-ingest-input-processor.ts:39–40`, `memory/memory-manager.ts:196–215` | Native ingest reduces input to LLMUserMessage and records media only | Native path must receive original reference value through existing ingest, not a second external recorder |
| server `agent-execution/input/agent-run-provider-input-normalizer.ts`; core `agent/pipelines/agent-input-pipeline.ts` | Provider copy rewrites uri, and core pipeline clones via message toDict/fromDict before processors | Typed in-process recording snapshot must precede rewrite and survive clone |
| server `agent-memory/services/raw-trace-record-normalizer.ts`, domain/models | Read normalization retains only recognized media arrays | Carry validated optional file facts, no reconstruction from bytes |
| server `run-history/projection/providers/local-memory-run-view-projection-provider.ts:24–28` | App-owned local replay is display authority for Codex, Claude and native | Keep one history source; provider history is not a repair fallback |
| server replay types, both transformers, run-projection-types; web `runHydration/runProjectionConversation.ts` | Conversation projection and user hydration only carry media; equality also keys media | Carry files through every hop and include in equality/merge |
| server `event-monitor-active-trace-page-types.ts`, page projector, GraphQL type; web page query/browse presentation | Second supported earlier-message surface has a three-media-only attachment object | Generalize user attachment type/name coherently, retain actual media visuals |
| core `memory/store/run-memory-file-store.ts`, `raw-trace-archive-manager.ts`, manifest type | Raw objects serialize via RawTraceItem; complete archive segments have established manifest/path/membership and no per-content hash field | Preserve extension through roundtrip/rotation; use real complete segment enumeration, do not invent another archive |
| server `context-files/services/context-file-record-locators.ts` | Explicit known-field visitor skips trace rows with no media and enumerates root-level trace filenames | File-only rows need independent file_attachments visitor; complete manifest-backed archive segments remain part of DS043's required scope |

### Exact saved-record evidence and limits

Within API-owned `api-e2e-evidence/API-REV-033/runtime/server-data/memory/agent_orgs/`
under root `aorg_e2e_mixed_org_19ff35d0c89c46cbac607c9c4666f424`, Architecture
independently matched these two recorded user inputs at line4:

| AgentRun / trace ID | Physical relative path | Observed record / file hash |
| --- | --- | --- |
| aorg_e2e_analyst_26ca3c55f1934c32bd8834d3accfaeed / rt_1789223383442_b93cb086-3cdc-4d7a-bb38-abb511a101ce | aorg_e2e_analyst_26ca3c55f1934c32bd8834d3accfaeed/raw_traces_active.jsonl | 577-byte user row has id/ts/turn_id/seq/trace_type/content/source_event/media only; whole-file SHA256 589e0f1b182f051b391c1489cfd98e8ecf7204345017e7c688baf02322185658 |
| aorg_e2e_lead_80cf60f9dd7a42fa9dd4495d668c7fbd / rt_1789224695345_b3e832ee-a80e-4da1-960f-24ef528d1d3e | aorg_support_pair_880551f4ab6d4a6ca10a53ac466d4f7c/aorg_e2e_lead_80cf60f9dd7a42fa9dd4495d668c7fbd/raw_traces_active.jsonl | 574-byte user row has the same keys/media-only shape; whole-file SHA256 b62108d3301deb8f6f705ff673e830eee6ce53d8aa977ed6bf37b9a9acb25c01 |

Two records, not four independent Sends: CRR081/API33 view each at1502/390 after
Accepted/Interrupted. Reviewer independently matched physical and original/HTTP
file hashes; Architecture did not issue new GETs. Real chooser/one Send/provider
reply supplies product reachability; the extractor probe only isolates the loss.
No complete installation inventory or universal historical absence is inferred.

### Decision and alternatives

DS-044–046 extends one versionless user row with disjoint non-media references,
using existing ContextFile type/name/URI meaning. Retain media arrays and their
readers; add no parallel all-attachments durable copy. This avoids rewriting
valid old media records solely for representational cleanliness. Replacing all
media with a new all-file schema would require transformation without restoring
the missing text associations; the extra rollout cost does not solve this defect.
Adding text filenames to prompt prose or scanning the context_files directory
cannot establish which message owns an attachment and is rejected. Cached live
attachments mask cold failure and are not a source of durable truth.

Native and external recorders stay separate existing owners; a typed ephemeral
provider-copy recording value keeps canonical URI apart from provider-local path.
Core never calls a server resolver. Both projection forms reuse existing file
presentation; no new task/Org UI or file-access authorization policy.

Old records remain directly readable without a version branch or empty-field
rewrite. Known missing associations cannot be recovered from these authoritative
rows; preserve them and available bytes/cross-view references, disclose the
limitation, and do not consume test Send captures as a migration source. Extend
only the existing known-field locator visitor for genuine new stored facts and
DS043 initial transformation. No new migration, user data replay/reset or loss
of old evidence. IR049 actual cutover remains distinct from coding/disposable
validation; the recreated-container/missing-vnc-path explanation is not a
prerequisite or a negative attachment inventory.
