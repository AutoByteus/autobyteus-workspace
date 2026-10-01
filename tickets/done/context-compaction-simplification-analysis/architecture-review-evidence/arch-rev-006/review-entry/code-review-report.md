# Code Review — CRR-015: API009-F001 failure origin

## Latest authoritative result

- **Fail — Local Fix, implementation-owned. API009-F001 confirmed and open.**
- Entry point: focused API/E2E failure-origin review; round 15, 2026-10-01, Code Reviewer.
- Origin: implementation integration defect in native history/live-input reconciliation, with an **earlier CRR014 source-review gap**. Not a stale test, runtime-only surprise, or evidenced post-review production change.
- Scenario and material-premise gates: **Pass** (supported and reached); behavior acceptance: **Fail**.
- Task **Large / High**, unchanged. Recommended sole owner: **`/implementation_engineer`**, subject to fresh handoff rules below.
- No full source scorecard repeated or numeric rescore invented. CRR014 source 9.40 is historical; its DI001.a no-duplicate closure and affected readiness/runtime rationale are corrected here. It is not current acceptance. API009's reported 77.9% is not a reviewer confidence score.
- Successful durable-test review and Delivery remain gated. `api-e2e-test-review-report.md` stays unchanged at pre-integration CRR013.

## Basis and bounded scope

Trigger: API-REV-009 integrated executable **Fail**, canonical `api-e2e-execution-coverage-report.md`, investigation, ledger, revision record and `api-e2e-evidence/api-rev-009/README.md`. Requirements Approved SR033 / design Ready SR035 / ARCH-REV005 / IR009 / DR002; upstream cross-scope Approved SR008 / Ready SR010. CRR001 baseline and all previous results remain in the cumulative record. Entry copies of the preceding canonical source report, record and test report are in `code-review-evidence/crr-015/`.

Reviewed the supported failing journey, captured public responses/DOM/native raw traces, actual new-document evidence, relevant source and one temporary captured-response probe. The 4,196 incoming references remain available; this is not a claim to reread all history or a general review of the three new durable server integration files. Existing passing suite totals and broader product observations remain API-owned evidence, with their disclosed seams and limits.

## Supported scenario and candidate gate — CG040 / API009-F001

| Required premise | Independent basis and finding |
| --- | --- |
| Actor / coherent goal | User returns to the same live hosted native Agent or Team lead to inspect a submitted input held by failed pre-parent compaction and decide whether to retry. |
| Initiating surface | Normal child composer submission, then desktop **View > Reload** while the same backend/native run remains alive; reopening the child hydrates its conversation. This is not a repeated-envelope API or contradictory multi-tab sequence. |
| Authority | REQ-012 preserves A identity/text/attachments; AC-014 prohibits repeated ingestion/replay; AC-017 requires truthful same-live-run pending projection. SR035 design DI001.a step 3 says apply live input state after saved conversation, with centralized identity upsert; verification row at design-spec.md:882 explicitly requires **A not duplicated**. |
| Scenario disposition | **Supported Explicit Edge Scenario (SCN005)**: approved compaction failure/recovery. Reload itself is ordinary. The supported premise is established before using the probe as corroboration. |
| Lifecycle reached | Both children await user recovery, held_turn/turn_0002, failureEpoch 2; same native instances, revision 12 and message identities before and after real renderer replacement. |
| Consequence | One accepted held input becomes two user bubbles: unlabelled history plus identity-bearing Held. Truthful pending presentation fails; no evidence of a second admission or parent dispatch. |
| Evidence / disposition | Actual new-document sentinel/timeOrigin, exact public snapshot equality, raw/history rows, DOM and screenshots, plus current source and independent 2-case repro. **Promote** bounded implementation finding. |

No unsupported scenario is used to demand concurrency machinery, queue persistence, migration, a new historical schema, or content-based deduplication. Double queue/execution and regression-introduction claims are not established and are not findings.

## Forward production trace and defect boundary

Paths below are relative to the worktree root. Source hashes and prior-round comparison: `code-review-evidence/crr-015/reviewed-source-pins.json`, `prior-review-source-comparison.json` and `upsert-head-comparison.json`.

1. **Identity is present at admission.** `autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts:105` sends message_id/dedupe_key; `autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-stream-handler.ts:128-139` constructs native input metadata with both. `.../agent-execution/input/agent-run-input-admission-state.ts:367-377` projects that identity and associated turn in the pending snapshot. The captured server state contains one held entry per child, not two.
2. **Native ingestion occurs before the blocked parent phase.** `autobyteus-ts/src/agent/loop/agent-turn-runner.ts:43-64` runs the input pipeline before the LLM phase/recovery wait. `.../agent/input-processor/memory-ingest-input-processor.ts:41-48` passes processed text, turn, original recording attachments and sender provenance into memory, but not message_id/dedupe_key. `.../memory/memory-manager.ts:199-204` and `.../memory/raw-trace-ingestion.ts:142-157` create a native user trace with turn/sequence/raw id, not accepted-input identity. This explains why A can already be in history while it has never reached a parent request; repeated ingestion is not needed to produce the defect.
3. **Stored projection carries no matching input identity.** The child projection service (`autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-member-view-projection-service.ts:50-65`) uses the normal memory view. `.../run-history/projection/providers/local-memory-run-view-projection-provider.ts:40-57` reads active raw traces, builds replay events and conversation; `.../transformers/raw-trace-to-historical-replay-events.ts:178-189` and `.../transformers/historical-replay-events-to-conversation.ts:22-30` yield user content/media/attachments/time without the pending input's message/dedupe identity. Raw turn/trace identity is not equivalent to an exposed accepted-input key. Actual GraphQL responses confirm the omission; this is not only a client fixture omission.
4. **Rehydration creates the first anonymous bubble.** `autobyteus-web/services/agentCollaboration/agentRunCollaborationHydration.ts:84-106` fetches each child projection and builds its saved conversation before constructing the collaboration context. `.../runHydration/runProjectionConversation.ts:340-349` creates user text/timestamp/attachments with neither messageId nor dedupeKey.
5. **Live state creates the second bubble.** `.../agentCollaboration/agentRunCollaborationContext.ts:96-98` applies each snapshot via `.../agentStreaming/handlers/agentInputStateHandler.ts:16-27`. That handler correctly limits merging to matching messageId/dedupeKey; `.../handlers/userMessageProjection.ts:21-38,65-98` appends when no matching key exists. Neither layer supplies the missing correlation to the anonymous history row. Revision fencing cannot repair this: a fresh renderer has no previous input projection. Both hosted Agent and Team lead traverse this same path.

**Finding API009-F001 — preserve one identity-bearing presentation across the history/live merge.** This is a bounded implementation integration correction, not a request to change intended behavior. Complete correlation across the existing native history/projection/hydration owners and centralized live reconciliation so one accepted input is represented once with its truthful pending label and attachments. The exact repair belongs to Implementation; this review does not prescribe storing new fields, suppressing all history, matching by text/time, or reconstructing a persisted queue. Equal content is not input identity. If investigation shows an actual required change to an approved ownership/transition contract, return that design impact to Solution Designer rather than silently expanding the scope.

## Independent evidence and reproduction

`code-review-evidence/crr-015/captured-observations.json` was produced by the read-only-input `check-evidence.py`:
- Compared actual before/after responses, not merely the API's comparison summary: two exact child input snapshots equal, each one held entry; native instance/revision/message unchanged.
- New-document timeOrigin **1790859976183.3 -> 1790860118043.5**, sentinel absent. Earlier ineffective scripted location.reload claims remain withdrawn.
- Each child's owned raw trace has exactly one matching user row in turn_0002 and no accepted-input message/dedupe identity; each public history has one matching anonymous row; DOM has two matching leaf bubbles, only one labelled Held. Both screenshots were visually inspected.
- Neither held input appears as the latest user input in a captured parent request. This bounds the finding to presentation, not double execution.

| Child | Native instance | Accepted held message |
| --- | --- | --- |
| api9_reviewer_5d6ebf31c2ab46c9a7107528e6da6f2d | 94e7a2fb-ea81-402a-8d78-e057e3f47d6d | 482afc18-2a66-440a-8f83-2b4d5c089e40 |
| api9_lead_3a6a5e7b787943b594a6461899fe6043 | 0e8c27fd-a6fb-4695-a5a4-a9a2da1be54f | 9e504a42-e7bb-4491-ad1b-a712727162b5 |

Independent command, from worktree root:
```sh
pnpm -C autobyteus-web exec vitest run --config <ticket>/api-e2e-evidence/api-rev-009/finding/vitest.config.mjs --no-watch
```
Exact absolute argv/cwd/time/exit is `code-review-evidence/crr-015/captured-response-probe-command.json`; fresh output is `captured-response-probe.log`, exit **1**, **2 tests Fail: expected 1 / received 2**. Config/probe inspected first. It calls production builder and handler with captured responses and no network; it does not execute the whole Electron path or mock the missing identity into existence. Text equality selects the unique diagnostic marker for counting, not a proposed production dedupe algorithm. The subsequent identity assertion is not reached because count fails. No permanent test or production changes were made.

API's original `product/assert-evidence.mjs` was read, not executed: it writes an API-owned result path. Its 13 strict snapshots/153 frames remain API-attributed; reviewer checks above are narrower and independently recorded. Evidence consistency Pass is never product Pass.

## Failure-origin determination and earlier review correction

- **Implementation defect: confirmed.** The existing approved exact-identity/no-duplicate contract is not completed across saved history plus live input. No requirement ambiguity or mandatory architecture change has been established; route Local Fix, not speculative Design Impact.
- **Earlier review gap: confirmed, CRR014.** Its CG035 / DI001.a source closure established snapshot plumbing and exact child ownership but did not prove that the saved user message supplied the key consumed by identity upsert. The invariant that should have been checked is: *the historical representation of held A and its pending entry must correlate to the same accepted input before the two representations are merged*. The source omission was reasonably detectable by following the now-documented forward path.
- Existing `agentRunCollaborationContext.spec.ts:15-25,105-129` constructs empty child conversations and then hydrates A/B input state; it covers pending labels/revisions, not history/live reconciliation. Its passing assertions are not invalid, but could not support that stronger closure. This is a coverage/review gap accompanying the source defect, not an API fixture defect to route instead.
- **Changed after review: not evidenced.** Nineteen relevant source/test files exactly match CRR014 entry pins. The additional upsert helper was not pinned then but matches unchanged HEAD 026476691c62bda309ce7f2a9342ebb444959f98. No new API production edit caused this. No pre-merge execution baseline was established, so do not claim when the bug was introduced or that the merge newly regressed it.
- Correct only affected rationale: CRR014 category 7 (API/E2E readiness), category 8 (runtime fidelity), and CG035/DI001.a broad no-duplicate closure no longer support Pass. Snapshot schema/collector plumbing and unaffected ownership/termination/atomicity checks are not invalidated by this defect. No repeated structural audit or retroactive numeric rewrite.

## Required follow-through and preserved limits

Implementation should correct the identity boundary under existing authority, add focused implementation regression coverage that includes a real-produced native user history plus its live held state for hosted Agent and Team (not an empty history), and preserve distinct accepted-input identities, attachments and no-send hydration. Then **source review -> integrated API/E2E again -> separate proportional successful-test review -> Delivery**. API must repeat the true new-renderer same-process journey; retry continuation after the failed reconnect remains untested, and cannot be inferred from earlier A/B success. Other required negative product cases remain as classified in API009, not silently waived here.

Preserve the complete cumulative package. API009 scoped passes, 45 local requests (17 parent / 28 compaction), no remote inference/new budget, owned isolated cleanup and build-output backup are API-owned facts, not rerun here. Source report is now Fail; ARCH004/IR007/CRR011/API00895.0/CRR013 remain pre-integration only.

Historical limits unchanged: F005 accepted known/nonfixed/nonPass/Qwen STOP; F004 unknown; SR022 exhausted/v6 unapproved; CG033 unproved/not fixed/not pump Pass; historical OOM and plain web tsc7078 non-green; 14 wider + 7 baseline failures unwaived. API006 withdrawn claims / API007 unsupported literal stay excluded. No native cold-history, backend restart, power-loss, full-suite, full web typing or semantic-quality acceptance claim.

CRR014 reviewer-owned provenance incident remains: original IR009 `server-overlap-final.log` and `web-overlap-final.log` were overwritten by reviewer reruns; known original bytes unavailable, no reconstruction. Current copies are CRR014 replacement evidence, not original IR009 raw logs; original hashes/disclosure remain in CRR014 incident and cumulative record. No score deduction against Implementation for that incident.

This review preserves API-owned evidence/authorities and the canonical test report; no app/provider campaign, staging/reset/merge/commit/push/release. Entry pin audit: 4,196 files; reviewed source supplement: 20 paths. Final audit and exact route/receipt are under `code-review-evidence/crr-015/`. Git HEAD/MERGE_HEAD remain 026476691c62bda309ce7f2a9342ebb444959f98 / d057801c89f26bc69a97331b59631c00519aec98; merge remains in progress/uncommitted. Logical index/stash and raw index preservation are checked separately; no byte-identical index claim is inferred from logical equality.

## Routing

Fresh rule selection and confirmed delivery receipt will be recorded below after completion of this result. No successful-test/Delivery advance and no duplicate informational outcome recipient.

Fresh `get_handoff_rules` selected **“When API/E2E failure-origin review confirms that the owning problem is an implementation defect.”** -> sole **/implementation_engineer**. This focused failure-origin rule is more specific than generic source Local Fix. No API-owned correction, upstream design/requirement change, successful-test or Delivery condition applies. Final preservation audit: 4,197 incoming/reviewed pins, only the two reviewer authorities changed; no missing/unexpected differences; canonical test/API artifacts unchanged. Logical index, raw index, HEAD/MERGE_HEAD and stash unchanged during CRR015. Confirmed receipt follows only after successful send.

Confirmed **accepted=true / DELIVERED** to sole **/implementation_engineer**, exact AgentRun **implementation_engineer_d565b3adf8074d59878dc089de6d3df1**, **4225** cumulative/current references attached. Receipt: `code-review-evidence/crr-015/handoff-receipt.json`. No duplicate recipient or Delivery advance. Review stops after this confirmed handoff; implementation correction and subsequent gates remain pending.
