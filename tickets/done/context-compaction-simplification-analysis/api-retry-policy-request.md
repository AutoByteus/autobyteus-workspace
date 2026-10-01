# API-RQ-001 — User-requested compaction retry/error policy

2026-09-30. **Requirement Gap / Design Impact for Solution Designer; not a source defect against the previously approved contract.** Large/High unchanged. This interrupts API-REV-005 before completing its acceptance journey. Last completed validation is API-REV-004Fail90.7, not rescored. CRR007 confirms F006 local assertion correction resolved. No production/durable edits this round and no live provider calls.

## Direct user instruction
The user requests testing all relevant cases, especially compaction API failures, and says:
> “we should at least try three times. Only after three times it failed, and it should be failed.”
> “after three times, it still failed. And agent is just in error state.”
> “the next time the user send another message ... it should trigger compaction again. After compaction is done, the message was sent again.”
> “if it's not implemented in this way, I think you should send a request to a solution designer.”

Interpretation to formalize: at most three total automatic attempts (initial + two retries), stop earlier on success; after exhaustion no normal parent dispatch, preserve valid context/pending compaction, visibly fail but remain recoverable by a new user message; complete required compaction before the new message reaches the normal parent model. The user has requested this behavior, not merely a broader provider model comparison. No Qwen restart, candidate-v6, prompt change, semantic repair agent or model-support change requested.

## Current evidence — what exists versus what is missing
Six temporary offline probes pass in api-e2e-evidence/api-rev-005/retry-policy-probe.test.ts/.log, with production classes and an entirely in-memory fetch. No credentials or remote traffic.

1. **Selected transport retries already exist for DeepSeek:** its production DeepSeekLLM→OpenAICompatibleLLM leaves SDK maxRetries at installed default2. Synthetic503/503/200 makes exactly3HTTP attempts and succeeds. Persistent503 makes exactly3HTTP attempts then rejects. This is one compaction logical generation with provider-level transport retries, not a shared three-generation loop. Retry eligibility/backoff is SDK/provider dependent; do not add an outer3×inner3 loop accidentally.
2. **Not every failure gets three attempts:** synthetic401 makes1HTTP attempt. HTTP200 unusable summary makes1HTTP attempt and application rejects invalid_summary; no automatic fresh logical generation. Test does not decide whether such errors should become retryable under the new request.
3. **Shared compaction layer currently fails immediately when its single logical attempt rejects:** PendingCompactionExecutor catches, retains awaiting_user_retry, emits failed and throws CompactionPreparationError. DirectLlmCompactionSummarizer calls sendMessages once. There is no explicit common three-total-attempt compaction policy.
4. **Later distinct user retry already exists at domain/assembly boundary:** failed attempt leaves actual snapshot unchanged; non-user/same-turn admission is disallowed; a distinct user turn retries pending compaction. Successful retry clears gate and the new message is assembled exactly once only afterward. Existing durable executor/coordinator/scheduler tests and the new actual assembler probe establish these scoped mechanics. This does not yet prove UI composer/status and complete runtime dispatch after exhaustion.
5. **Current handled compaction failure is not the requested persistent AgentStatus.ERROR:** LlmPhase converts it to a diagnostic final response with isError=true; AgentTurnRunner returns completed, and AgentWorker applies AgentIdleEvent. A status-reducer replay of that event chain ends IDLE, not ERROR. Failed-compaction/error output may still be visible, but full UI semantics were not observed. Designer must distinguish a recoverable failed/awaiting-user-retry state from fatal runtime ERROR, which must not prevent the next user message.

Relevant source:
- autobyteus-ts/src/memory/compaction/direct-llm-compaction-summarizer.ts
- autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts
- autobyteus-ts/src/memory/memory-manager-compaction-coordinator.ts (beginPendingAttempt / retainFailure)
- autobyteus-ts/src/agent/compaction/compaction-retry-turn-admission-policy.ts
- autobyteus-ts/src/agent/llm-request-assembler.ts (compaction before appending new user message)
- autobyteus-ts/src/agent/loop/llm-phase.ts, agent-turn-runner.ts
- autobyteus-ts/src/agent/runtime/agent-worker.ts (completed/recovered→AgentIdleEvent)
- autobyteus-ts/src/agent/status/status-deriver.ts
- autobyteus-ts/src/llm/api/deepseek-llm.ts, openai-compatible-llm.ts
- installed autobyteus-ts/node_modules/openai/src/client.ts (default2retries and selected status rules; dependency evidence, not changed source)

## Why owner revision is needed
Current REQ005 and design Attempt definition prescribe one logical generation per authorized attempt, explicitly distinguishing existing provider transport retries; SCN005/REQ004/AC005 preserve existing failure/explicit user retry. A universal three-attempt contract, output-validation retry policy, recoverable error-state semantics and message continuation behavior must be made explicit in requirements/architecture before changing runtime or forcing tests to expect it. Do not treat the successful old-policy diagnostic tests as approval of the new policy.

Please formalize the new user direction, capture any necessary focused clarification/approval, revise affected authority and route implementation proportionately. Key decisions:
- Three **total** outbound transport attempts versus three logical generations; ownership must prevent compounded SDK retries.
- Transient timeout/connection/429/5xx versus permanent401/403/invalidmodel/config, output-format/empty/truncated response, cancellation and persistence/commit failures. Recommended review: never retry cancellation or already committed compaction; classify permanent errors explicitly rather than blindly replaying them.
- Bounded backoff/Retry-After and cancellation/deadline; statuses during retries and after exhaustion.
- Preserve the last valid baseline with zero parent/tool dispatch while compaction remains required. Define whether the original failed-turn message and a newer user message are retained/combined/superseded; do not silently lose or duplicate either.
- Recoverable error UI keeps user input usable; the later user message starts a fresh bounded cycle, success then dispatches exactly once. Already queued agent/system activity cannot bypass the gate.

## Requirement-linked edge-case matrix to complete after authority
1. First success: one attempt/one commit.
2. One transient failure then success; two failures then third success: no extra attempt, no early parent dispatch.
3. Three eligible failures: no fourth automatic request, explicit recoverable failure, valid snapshot/raw baseline intact.
4. New user after exhaustion: compaction runs first; success then normal message once; repeat exhaustion remains failed without data loss.
5. Cancellation during call/backoff and late result: no future retry/commit.
6. 429 Retry-After, timeout/connection/5xx; permanent failure classification and actual total request cap including SDK retries.
7. Empty/malformed/truncated output under the newly decided policy; no corrupted snapshot or semantic-repair prompt.
8. Persistence failure, postcommit reporting failure and restart/resume: no duplicate generation/commit or fake success.
9. Integrated renderer/backend status, input availability, retry and resumed context, with deterministic injected transport faults plus separately bounded DeepSeek normal-path observation.

“All cases” means explicit supported equivalence classes and boundaries, not every possible model string or an unbounded live sampling campaign. Fault behavior can be tested deterministically without hoping a paid provider fails.

## Execution/cleanup and carry-forward
C01 fresh3files28Pass; six focused temporary probesPass. Isolated worktree desktop build/start also succeeded using documented command; readiness only, no UI journey/provider access. User request arrived during build. Owned iso-64217-1323 stopped gracefully afterward, auto data root removed, bothports64217/64218released; no user's desktop touched. No vault import/providerbudget in API005. Build outputs retained; generated SDK/externalWIP not cleaned. API-C08 newfullflow and C09 fullstatus/retry/resume not executed under revised policy.

API-F005 stays SR020 acceptedknown/nonblocking, not fixed/Pass; Qwen stopped. F004 causehistoricalunknown; no reproduction requested. F006CRR007resolved; no arbitrary glyphassertions reintroduced. API001→004/CRR001→007 histories preserved. Product/DR N/A. Eventual nine-path successful-test review and Deliveryorigin/personal remain required. Canonical API artifacts carry interruption truthfully, no new overallPass/score.

## Route
get_handoff_rules: select most-specific prevalidation RequirementGap/DesignImpact rule to /solution_designer. This is the user's requested behavior-change recovery, not an execution failure against old approved requirements and not duplicate forwarding of waivedF005. Single recipient; complete package attached. Receipt follows confirmation.

API-RQ-001 requirement/design-impact handoff confirmed accepted=true / DELIVERED to sole /solution_designer, run solution_designer_e86db51ce2a24b15abe56a98c9c8114f,269references attached. API005acceptance incomplete/no rescore; no additional recipient or Delivery. Receipt api-e2e-evidence/api-rev-005/requirement-handoff-receipt.json. Stage stops pending owner revision.
