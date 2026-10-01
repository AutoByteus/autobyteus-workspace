from pathlib import Path
import json,hashlib
R=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis'); T=R/'tickets/in-progress/context-compaction-simplification-analysis'; E=T/'implementation-evidence/ir-010'
spans={
'autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts':[(39,49)],
'autobyteus-ts/src/memory/memory-manager.ts':[(105,113),(196,205)],
'autobyteus-ts/src/memory/raw-trace-ingestion.ts':[(140,161)],
'autobyteus-ts/src/memory/models/raw-trace-item.ts':[(11,31),(74,128)],
'autobyteus-ts/src/memory/turn-tracker.ts':[(1,17)],
'autobyteus-ts/src/agent/factory/agent-factory.ts':[(107,138),(184,196)],
'autobyteus-ts/src/agent/loop/agent-turn-runner.ts':[(37,64)],
'autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts':[(146,175)],
'autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts':[(199,219)],
'autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts':[(175,200),(295,315),(367,379)],
'autobyteus-server-ts/src/agent-memory/services/raw-trace-record-normalizer.ts':[(55,81)],
'autobyteus-server-ts/src/run-history/projection/historical-replay-event-types.ts':[(1,31)],
'autobyteus-server-ts/src/run-history/projection/run-projection-types.ts':[(30,50)],
'autobyteus-server-ts/src/run-history/projection/run-projection-dedupe.ts':[(39,87),(115,145)],
'autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts':[(178,192)],
'autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-conversation.ts':[(1,35)],
'autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts':[(40, sixty:=60)],
'autobyteus-web/services/runHydration/runProjectionConversation.ts':[(60,87),(338,351)],
'autobyteus-web/services/agentStreaming/handlers/userMessageProjection.ts':[(21,39),(65,99)],
'autobyteus-web/services/agentStreaming/handlers/agentInputStateHandler.ts':[(1,31)],
'autobyteus-web/services/agentCollaboration/agentRunCollaborationHydration.ts':[(84,109)],
'autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts':[(80,100)],
}
evidence=[]; chunks=[]
for p,ranges in spans.items():
 f=R/p;lines=f.read_text().splitlines();evidence.append({'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'line_ranges':ranges})
 chunks.append('\n## '+p+'\n'+''.join(f'{i}: {lines[i-1]}\n' for a,b in ranges for i in range(a,min(b,len(lines))+1)))
(E/'source-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n');(E/'source-excerpts.txt').write_text('Read-only current-source excerpts; no source edits.\n'+''.join(chunks))
limits='F005 remains accepted known/nonfixed/nonPass/Qwen STOP; F004 unknown; SR022 exhausted/v6 unapproved; CG033 unproved/not pump Pass; historical OOM and plain web tsc7078 non-green; 14 wider + 7 baseline failures unwaived. API006 withdrawn claims / API007 unsupported literal stay excluded. ARCH004/IR007/CRR011/API00895.0/CRR013 are pre-integration only. CRR0149.40 is historical, not current Pass; its affected no-duplicate closure was corrected by CRR015. API00977.9% is executable Fail, not semantic rescore. Initial ineffective location.reload claims remain withdrawn. No native cold-history, backend-restart pending queue, power-loss, full-suite, full web typing or semantic acceptance promise. No new provider budget. CRR014 overwrote two IR009 logs; original bytes unavailable, no reconstruction; present copies remain CRR014 replacement evidence.'
(E/'design-impact-request.md').write_text(f'''# IR010-DI001 — accepted-input identity across history and live state

**Design Impact; API009-F001 remains open. No production fix applied.**
Trigger: {T}/code-review-report.md, CRR015 / API-REV009. Governing intended behavior remains Approved SR033: REQ012, AC014, AC017, SCN005; Ready SR035 DI001.a, ARCH-REV005. Large / High unchanged. This is not a request to reopen the approved Hold A then B behavior.

## Concrete conflict requiring Solution Designer
SR035 `Design health / refactor and persisted-data decisions` expressly says **Stored data Not Affected**, and that current tree/message stores and sender-aware raw trace readers/writers remain unchanged. Earlier persisted-data table says raw active/numbered segments **Not Affected in schema**; SR028 says no historical message rewrite. DI001.a nevertheless requires saved conversation followed by exact-identity live upsert, with **A not duplicated**.

Source confirms that the accepted-input identity does not reach saved history. The straightforward repair—carry original message_id/dedupe_key through native ingestion, serialized raw user facts, normal reader, conversation projection and frontend builder—changes precisely the native writer/reader and stored-identity contract excluded by that decision. Even reusing raw `id` or `correlation_id` changes writer semantics; avoiding a new property name does not make that contract unchanged. I have not made that decision on the designer's behalf.

This is a newly concrete challenge to the stored-data/identity assumption, not a rejection of CRR015's implementation-defect finding. The code remains defective. The reviewer explicitly allowed routing an actual design-authority impact. Requirements need not change unless Designer identifies a changed intended outcome.

## Supported witness and independently repeated local observation
Ordinary single-user hosted Agent / hosted Team lead submission -> native input pipeline ingests A -> pre-parent compaction fails and holds A -> View > Reload replaces renderer while same native run lives -> saved member conversation -> live input snapshot -> two bubbles. CRR015/API009 own actual desktop, raw, response and DOM evidence; no new real-product run was made here.

IR010 independently reran the existing frozen-response probe against current production frontend functions, after reading its config and code. **2 Fail; expected1 / received2; exit1**. Own argv/cwd/time/log are `captured-response-probe-command.json`, `.log`, `.exit`; API outputs were not redirected over. This corroborates presentation failure, not duplicate admission/execution. Existing native raw and live entries remain one each in the captured evidence, and no held parent request was observed there.

## Current identity spine and missing invariant
| Stage | Current fact / owner |
|---|---|
| Child composer / server admission | Original metadata carries message_id and dedupe_key; pendingSnapshot exposes both plus associated turn_id. |
| Core MemoryIngestInputProcessor -> MemoryManager -> raw trace | Processed text, original attachments and sender provenance retained; accepted keys omitted. Raw `id` is a generated `rt_` timestamp, not the accepted message key. |
| Normal memory reader -> replay -> conversation | Existing raw identity/turn provenance is not accepted-input identity; user projection does not supply messageId/dedupeKey. |
| Browser saved conversation -> live input handler | Anonymous history user message cannot match exact-ID upsert, which correctly appends an unmatched accepted input. |

Exact current source pins and bounded line excerpts: `source-evidence.json`, `source-excerpts.txt` (22 paths). Existing history projection dedupe also has semantic/time equality when no explicit identity exists; the frontend projection builder currently compares content/media/time even for entries that might later gain accepted identity. A selected identity repair must preserve distinct accepted inputs through **both** projections, not merely add a field at the final handler. This is a source-derived repair obligation, not a separately executed product finding.

## Alternatives examined, not silently selected
- **Content/time matching:** rejected as requested; equal text is not identity, attachments must survive.
- **Raw trace ID or correlation_id reuse:** these are not currently the accepted key. Writing the accepted key there still changes the native writer's identity meaning and must be specified; do not reinterpret generated IDs by shape.
- **Turn-only live enrichment without persistent changes:** potentially a bounded alternative, but not yet an established identity contract. Native backend explicitly rejects active-turn append, which supports one external input per native turn. However `AgentFactory.restoreAgent` creates a fresh MemoryManager on the same run/memory location; MemoryManager creates `new TurnTracker()`, default counter1, and raw traces do not carry run_instance_id. Therefore `(runId, turnId)` is not established as a globally unique accepted-message identity across retained history. Generic server admission also supports append-to-active-turn for other runtimes. This is a source limitation on substituting keys, **not** a new restart/recovery product-failure claim or a demand to extend pending-queue lifetime. A native-only, scoped ephemeral correlation may be selected if Designer establishes its exact facts/owner/lifetime; I will not invent a latest-by-time/position fallback or shadow ledger.

## Requested bounded design completion
Specify the existing-owner correlation contract: what exact fact links saved user A to live accepted A, where it is produced/projected, and why distinct accepted identities cannot collapse. If choosing native accepted-key retention, revise the explicit unchanged-writers/stored-data decision and give a proportionate transition decision for identity-less existing rows (no blanket migration/backfill assumed). If choosing no stored change, establish unambiguous native live-to-history correlation and its lifetime without a new durable queue or heuristic matching. Preserve attachments and sender provenance, centralized pending reconciliation, and no-send hydration. Do not require a new schema version, migration, durable queue, cold-history mechanism or generic protocol dedupe solely because this gap exists.

After returned implementation-ready design: add focused regressions using native-produced serialized history plus live held state through hosted Agent and Team hydration; identical text with distinct accepted IDs must stay distinct, A one bubble with Held and attachments, queued B preserved, same-instance revisions respected, consumed entries not replayed and hydration no-send. Then source review -> integrated API/E2E (true same-process new renderer, retry continuation and outstanding negatives) -> proportional successful-test review -> Delivery. No gate waived by this handoff.

## Preservation / limits
No source, durable test, API/reviewer authority/evidence, built output or Git state intentionally changed. IR010 only owns its evidence and canonical implementation handoff/revision. Entry pins cover9,613 files; incoming CRR015 on-disk reference index has4,226 entries (message attached4,225; receipt now included). Final audit owns exact preservation claims.

{limits}
''')
(E/'README.md').write_text(f'''# IR-010 — history/live identity design-boundary investigation

Current result: **Design Impact IR010-DI001; API009-F001 open**, not implementation completion. Large / High unchanged. No source/durable-test changes.

- `design-impact-request.md`: concrete SR035 unchanged-writer/identity conflict, alternatives examined, bounded decision requested.
- `source-evidence.json` / `source-excerpts.txt`: current forward-path and candidate-key audit,22 files. Source facts distinguished from product evidence/inferences.
- `entry-*`:9,613 incoming/source pins, exact raw/logical Git state, prior canonical artifacts.
- `incoming-reference-index.json`: complete incoming CRR015 on-disk4,226 references.
- `captured-response-probe-command.json/log/exit`: exact local check,2Fail expected1/got2; no app/backend/provider, no API-owned output changed. It reruns the read-only-input API009 probe rather than invoking API's output-writing assert-evidence.mjs.
- `final-preservation.json`: completed preservation comparison; only two implementation authorities expected to differ among pinned files.
- `reference-index.json`, fresh rules/selection/receipt: cumulative package and sole selected outcome route.

Fresh frontend rendering not attempted: implementation is blocked at the identity contract and no frontend code changed. Existing desktop failure screenshots/DOM remain API009/CRR015 evidence, not new IR010 visual validation. New native-history regression authoring and successful rendered feedback remain pending implementation; no empty-history fixture used as closure.

No staging/reset/build/commit/push/release; merge remains in progress/uncommitted. {limits}
''')
(T/'implementation-handoff.md').write_text(f'''# Implementation Handoff — IR-010

## Current result
**Design Impact — IR010-DI001; API009-F001 remains open. Not ready for source acceptance, integrated API/E2E acceptance or Delivery.**
CRR015's implementation-owned duplicate history/live presentation is confirmed. Current code remains the integrated IR009 implementation plus API009's three durable integration files; **IR010 changes no source or durable tests**. Current worktree code and this handoff are authoritative. The preceding IR009 handoff is preserved at {E}/entry-implementation-handoff.md, not current acceptance.

## Basis / revision / cumulative package
- Rework triggered by code_reviewer **CRR015 / API-REV009 API009-F001**: {T}/code-review-report.md and code-review-revision-record.md; actual executable report {T}/api-e2e-execution-coverage-report.md.
- Approved **SR033** requirements: {T}/requirements-doc.md; investigation-notes.md and solution-revision-record.md remain canonical.
- **Ready SR035**, design-spec.md / architecture-integration-handoff.sr035.md; independent review **ARCH-REV005**, design-review-report.md / architecture-review-revision-record.md. Not N/A; all prior applicable supplements retained.
- Related: IR001–009, SR028–035 and cumulative earlier history, ARCH001–005, CRR001–015, API001–009, DR001/002. New finding **IR010-DI001**. Delivery integration DR002 still in progress.
- Upstream cross-scope-agent-mentions Approved SR008 / Ready SR010 and its applicable Product/review/history supplements remain included, not new compaction Product authority. Compaction Product supplement N/A.
- Complete cumulative current reference manifest: {E}/reference-index.json. Detailed impact: {E}/design-impact-request.md.

## Classification and design health
**task_size=Large; architectural_risk=High — confirmed, unchanged.** Current request is bounded implementation defect correction, but completing accepted-input identity retention challenges the explicit SR035 `Stored data Not Affected` / unchanged raw reader-writer decision. Root cause: missing identity invariant across the history/live boundary. Approved intended behavior is clear; this is **Design Impact, not Requirement Gap**. No behavior change or new user approval is assumed. Designer owns the correlation/transition decision; obtain renewed approval only if intended behavior changes.
Selected route: Solution Designer, subject to fresh rules. Direct-route lightweight review N/A. Candidate metadata retention is not implemented; turn-only correlation is not silently substituted for accepted identity. See impact record for exact source facts, native no-append evidence and non-global turn-counter limitation.

## Current implementation / behavior trace
| IDs | Current production path | Outcome |
|---|---|---|
| REQ012 / AC014 / AC017 / SCN005 / DI001.a | native input ingestion -> saved raw/replay/conversation -> AgentRunCollaborationHydration -> centralized handleAgentInputState/upsert | **Fail/open:** saved A lacks accepted ID; held snapshot appends second A. No evidence of double admission or execution. |
| DI001.a live snapshot plumbing / same-instance revisions | IR009 root collector/projector/strict DTO -> context input state | Existing scoped source/local checks retained; empty-history tests cannot establish history/live merge. |
| DI001.b/c / AC018 / BEH004/007 | IR009 host/child termination boundary, activity transaction, retained-context publication | No IR010 change; CRR015 retains unaffected prior source checks only within their limits. No new product Pass. |
| Existing history / attachment / sender behavior | core writer, ordinary reader and projection | Preserved untouched. Any accepted-key repair must retain attachments/sender semantics and distinct accepted inputs through server and frontend dedupe. |

Scope Guardrail preserved: no new intended behavior, durable queue, migration, provider policy, cold-history recovery or heuristic dedupe. No source cleanup/legacy change was attempted while design decision is outstanding; no wrappers, dual paths or shadow stores introduced. Source-size limits N/A this round (zero source delta), not a renewed whole-codebase size certification.

## Local implementation check
Exact argv/cwd/times/output: {E}/captured-response-probe-command.json, captured-response-probe.log, captured-response-probe.exit.
Existing API009 frozen-response probe invokes current production conversation builder and live handler: **2 Fail, expected1/received2, exit1** for hosted Agent and Team. This is a narrow local corroboration using captured responses, not native-producer coverage or a new desktop/reconnect execution. No tests added or weakened. Native-produced-history regressions requested by CRR015 remain to be authored after the design decision. No build/typecheck/full-suite/provider/app campaign this round because no source change was made.

## Persisted data / frontend feedback
Approved raw decision is Not Affected; source remains compliant only because no proposed persistence repair was applied. Straight accepted-key retention would change the excluded native writer/reader contract; transition decision is upstream, not automatically Migration Required. Existing turn/trace fields do not expose the accepted key to the current upsert. No backfill, version switch or historical rewrite introduced.
Fresh rendered feedback **not performed**: no frontend implementation change and the identity decision blocks repair. Actual duplicate DOM/screenshots belong to API009/CRR015. The local probe confirms model duplication, not a new visual inspection. API must repeat true same-process new-renderer reload, retry continuation and the full outstanding negative matrix after correction.

## Preservation / environment
{E}/entry-pins.json protects9,613 incoming/source files; incoming on-disk index4,226 paths. API's original15 durable files and all captured evidence/authorities are protected. Previous implementation handoff/record and governing artifacts have entry copies. Final exact comparison in final-preservation.json.
HEAD026476691c62bda309ce7f2a9342ebb444959f98 / MERGE_HEADd057801c89f26bc69a97331b59631c00519aec98, merge in progress/uncommitted. Preserve raw/logical index and stash; no stage/reset/clean/build/commit/push/release. IR009 source delta remains unstaged. Do not use the staged index alone for later review.

## Remaining gates / limits
{limits}

Next: Designer completes the bounded identity/correlation and persisted-transition authority; implementation then adds native-history+live-state regressions, local checks and rendered feedback. Source review and integrated API/E2E follow, including later successful-test review of API009's three files. No Delivery advancement. Fresh selected route and confirmed receipt are recorded under {E}; do not infer delivery from a planned recipient.
''')
p=T/'implementation-revision-record.md'; prior=p.read_text(); assert '## IR-010' not in prior
p.write_text(prior+f'''\n\n## IR-010 — CRR015/API009 identity correction investigation (2026-10-01)
- Trigger: code_reviewer CRR015 failure-origin review, **API009-F001**; prior IR009 implementation-complete-for-source-review result, subsequently CRR014 historical Pass corrected to CRR015 **Fail** and API009 **Fail77.9%**. Current result **Design Impact IR010-DI001**, defect open; no implementation acceptance.
- Authority: Approved SR033 / Ready SR035 / ARCH-REV005; related IR001–009, SR028–035/cumulative prior, ARCH001–005, CRR001–015, API001–009, DR001/002. Requirements unchanged; REQ012, AC014/017, SCN005, DI001.a affected. Large / High unchanged.
- Reason: straightforward accepted-key retention would modify native history readers/writers explicitly excluded by SR035 Not Affected. Current raw id/turn facts are not the accepted key; native-only turn enrichment examined, not selected without a bounded uniqueness/lifetime contract. Source shows native no active-turn append but fresh turn counter on factory restore; no new restart product defect claimed. Designer must select correlation/transition using existing owners, without heuristic dedupe or assumed migration.
- Delta: **zero production/durable-test changes**. Current code stays authoritative; canonical handoff updated, prior handoff/record preserved. Added {E}/design-impact-request.md, source pins/excerpts, own captured-response check and preservation/routing evidence.
- Validation: current production builder/handler + frozen API009 responses **2Fail expected1/got2, exit1**; own stdout paths, no API output overwritten. No native-producer or rendered/reconnect success claim; native-history regression work pending approved design completion.
- Preservation:9,613 pins; on-disk incoming4,226 refs (message attached4,225); exact final comparison owns claims. No source/test/API/reviewer/build/index/ref/stash mutation intended. Merge in progress/uncommitted; no staging/commit/push/release.
- Limits: {limits}
- Next: fresh rules, sole Design Impact owner; after return, implementation -> source review -> integrated API/E2E -> successful-test review -> Delivery. No duplicate informational recipient.
''')
print('IR010 documents written; no production edits')
