# User-directed design revision — replaceable compaction boundary

2026-09-30. **New user request → Solution Designer**, using the Design Impact routing destination. This is forwarding architectural intent, not a completed source/failure-origin review, new defect finding or implementation authorization. CRR-007 remains the latest completed review; no new CRR score/result is invented for this coordination.

## User direction

The user asked whether the old strategy could be replaced by the direct-LLM implementation while retaining a genuinely replaceable boundary for future implementations. Following discussion, they explicitly requested:

> “send it to the solution designer, ask to solution designer to continue updates the design so that we can replace.”

> “If the original has a good boundary and we can simply remove that strategy and replace a new one, right?”

Intent: keep the useful Strategy pattern / injected abstraction, remove the old implementation, and make the surrounding compaction runtime depend on a clean contract rather than concrete algorithm details. Do not solve this by merely renaming the direct summarizer or restoring the entire old registry/settings framework.

## Source-grounded context, not a retrospective defect verdict

- Original `WorkingContextCompactionStrategy` really was a strategy interface (`propose(workingContext)`). Its implementation `StructuredJsonCompactionStrategy` combined planning, agent summarization and result normalization. The surrounding construction context required `CompactionAgentRunner`; diagnostics/result expectations included semantic/episode data. Therefore the old ecosystem was coupled to implementation-specific child-agent/category assumptions; changing algorithms was not simply substituting the current direct summarizer under that exact contract.
- Original source available at `046279298f53fb98d7688ee9dc2b2ba0fa827685`, under `autobyteus-ts/src/memory/compaction/{working-context-compaction-strategy,structured-json-compaction-strategy,working-context-compaction-strategy-resolver}.ts`.
- Current `memory-compaction-configuration.ts` and `pending-compaction-executor.ts` accept the concrete `DirectLlmCompactionSummarizer`. The server composition constructs it explicitly. `CompactionLlmFactory` already makes model/provider construction replaceable; `MessageBudgetStrategy` remains independently injectable. A stronger model alone does not require a new compaction strategy.
- This does not establish that the original pattern was “not a real strategy,” that the entire design was wrong for prior requirements, or that current reviewed code violates the old approval. This is an explicit new maintainability/replacement requirement from the user. No current runtime incident is attributed to this boundary.

## Requested Solution Designer work

1. Capture/refine the user's replaceability requirement and affected acceptance criteria, using the current cumulative package and normal requirements/design approval sequence.
2. Investigate and explicitly define the intended axis of replacement: summary generation on selected history, or the broader compaction proposal/selection algorithm. Do not silently promise every hypothetical future algorithm fits one unchanged interface.
3. Define implementation-neutral input/output/error/cancellation/metadata contracts and ownership. A small injected summarizer/strategy interface with direct LLM as the only current implementation is a candidate discussed with the user, not a reviewer-authored final design.
4. Keep invariant runtime responsibilities at appropriate established owners: pending authorization/lifecycle, preservation, validation and durable commit. Decide the planner boundary explicitly. Avoid child-agent/category fields leaking into the new generic contract. No legacy fallback or speculative plugin registry/UI selection framework is requested.
5. Make substitutability demonstrable through a contract-level alternate test implementation while keeping production limited to the approved direct-LLM behavior. This is a design acceptance proposal, not a request to invent a second production algorithm, run models or relax fidelity/commit guarantees.
6. Reconcile with the **separate user retry-policy request API-RQ-001** already at Solution Designer (`api-retry-policy-request.md`): automatic-attempt/error-state/retry ownership must remain explicit and not be duplicated between strategy, executor and provider. Do not freeze the older single-attempt policy as if it overrode that new request. Its unresolved decisions remain solution-owner work.
7. Update the canonical requirements/investigation/design/solution revision record, obtain applicable approval for changed intended behavior and route the finished package by team rules. Large/High is unchanged at this intake; reclassify only with evidence. No implementation task is issued by Code Reviewer here.

## Current cumulative state / exclusions

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`, branch `codex/context-compaction-simplification-analysis`; HEAD `5cb7b049ae3158108bff2cb70ed80e89540586d9`, reviewed source `ebaf3a78eff2d3147dc3f4f2eb63bf119d6547ad`, refreshed base `8caa610ff438c288d9aca9f2efe2c33924fbf517`.

SR012/SR017 approved behavior + SR020 accepted deviation; design SR018 corrected SR019 / ARCH002; IR001→003 / CRR001→007. Last completed API result API004Fail90.7, not rescored. API005 is interrupted for API-RQ-001, not a new overall result. F006 assertion correction verified; eventual nine-path successful-test review still pending. F005 accepted known deviation/non-blocking/not fixed: **Qwen stays stopped**, candidate-v6 parked, no waived-fidelity remedy. F004 historical cause unknown. Prompt-v5, provider/default/support and preservation behavior are not implicitly changed by this request. Product/DR N/A; eventual Delivery target origin/personal.

Only this request/routing evidence written by reviewer. No source/durable-test edit, new test/model call, private-data access, commit/push/merge/release or cleanup. Existing Solution Designer execution is the sole recipient; no new delegation or duplicate API/implementation handoff.
