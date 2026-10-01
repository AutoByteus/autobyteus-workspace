> SR-022 approved update: no numeric summary-length instruction or summary-budget argument at the selected-history transformation boundary. Provider hard output cap and host planning/fit checks stay. Prior optional-size-target discussion below is superseded only in that respect.

# SR-021 — Original strategy boundary analysis and proposed replacement scope

## Status

Solution Designer investigation and requirements proposal, 2026-09-30. **Not an approved new architecture or implementation handoff.** Incorporates the explicit user replaceability direction and separate API-RQ-001 retry/error request. Current production remains SR-019/IR-003; changes need the completed requirements/approval/design route. Large/High retained, not reclassified from draft scope.

## What the original design actually did

Original source pinned at `046279298f53fb98d7688ee9dc2b2ba0fa827685`, under `autobyteus-ts/src/memory/compaction/`:

```text
pending executor
  -> resolver/registry constructs selected strategy
  -> strategy.propose(copy of WorkingContext)
       -> window planner
       -> child-agent summarizer
       -> categorized-output normalizer
       -> proposal
  -> accepted builder
       -> episodic/semantic records + rendered prompt summary + lineage
  -> output validator
  -> committer writes categories/lineage/context
```

The original `WorkingContextCompactionStrategy` really was an interface with `propose(workingContext)`. Calling it “not a real strategy” literally would be inaccurate. The concrete issue is that the supposedly interchangeable boundary and its callers assumed the categorized child-agent implementation:

| Coupling | Exact original evidence | Consequence for replacement |
| --- | --- | --- |
| Construction | `working-context-compaction-strategy.ts`: shared construction context requires `CompactionAgentRunner`; resolver passes that context to factories | Direct LLM or deterministic implementation inherits an irrelevant child-agent dependency |
| Output | `working-context-compaction-proposal.ts`: `output: NormalizedCompactionResult`, `execution: CompactionAgentExecutionMetadata` | Every replacement must supply the old category/child-execution shape, not just a usable continuation result |
| Diagnostics | Shared strategy diagnostics require `semanticFactCount`, `episodeSummaryLength` and child-agent execution metadata | Callers/reporting know implementation-specific artifacts |
| Error handling | `pending-compaction-executor.ts` imports/classifies `CompactionAgentRunnerError` and `CompactionResponseRepairExhaustedError` | Algorithm-specific child/repair failure types leak into stable orchestration |
| Acceptance and persistence | `accepted-compaction-builder.ts` requires an episode, constructs category items and lineage, renders a bundle; committer writes those artifacts | A new plain-summary strategy cannot remove long-term-memory writes by itself |

`StructuredJsonCompactionStrategy` also bundled selection, generation and normalization. That is a broader variation point, not inherently invalid. Its problem for this change was the leaked result/construction/storage assumptions, not the mere existence of the Strategy pattern. Separately, retiring category writes changes persistence semantics; no interface can make that independent requirement disappear without changing the category-dependent owners. Do not claim all past refactoring was caused only by an interface mistake.

## Current simplification: improvement and remaining coupling

Current source `ebaf3a78eff2d3147dc3f4f2eb63bf119d6547ad`, HEAD `5cb7b049ae3158108bff2cb70ed80e89540586d9`:

- Selection, final validation and commit now reside outside the direct summarizer, and the accepted builder consumes one summary rather than category records. This separation is useful and should not be discarded.
- `memory-compaction-configuration.ts` and `pending-compaction-executor.ts` still name `DirectLlmCompactionSummarizer` as their dependency. That class has private concrete constructor dependencies. A constructor parameter is not yet an implementation-neutral TypeScript contract.
- `DirectCompactionInput` and `CompactionExecutionMetadata` still expose direct-LLM identity assumptions, including mandatory provider/model fields. Merely adding an interface with these unchanged fields would leave avoidable coupling for a non-provider implementation.
- The concrete `DirectLlmCompactionSummarizer` reference in the server composition root is legitimate: something must construct the chosen implementation. The orchestrator and configuration contract, however, should not require that concrete class.
- Existing `CompactionLlmFactory` already allows model/provider construction changes. Choosing a better model is not a reason to create another compaction algorithm.

## The real replacement axis: two different contracts

### Recommended for this ticket: selected-history transformation

```text
stable runtime: trigger/admission -> capture baseline -> existing prefix/suffix planner
  -> shared history preparation: selected message units -> prepared prefix text
  -> replaceable summarization strategy: prepared prefix text -> candidate summary text
  -> stable runtime: build/validate -> durable commit -> normal parent dispatch
```

**The proposed content input is one prepared selected-prefix text string.** Selection initially produces typed message units; shared history preparation renders that selected prefix before the strategy call. When a previous summary exists, the current planner already includes its compacted-memory unit in that prefix. Do not add a separate previousSummary field or prepend it a second time. “Previous summary + selected older history” described the contents of that prefix, not two independently supplied inputs. The strategy transforms the prefix into one replacement continuation summary. This directly serves the user's original request to change compaction generation while preserving prefix/suffix selection, history preparation and safety. It supports replacing the **summary-producing implementation** without changing orchestration. It does not promise interchangeable arbitrary selection or memory/storage algorithms.

Keep one production implementation: direct LLM using approved prompt-v5. Keep a small constructor-injected contract, not a registry, selector setting, old fallback, second production strategy or plugin framework. Naming the contract `CompactionSummarizationStrategy` or `CompactionSummarizer` is less misleading than claiming it replaces the entire memory lifecycle; exact exported naming is a later technical design choice.

### Broader alternative: full proposal algorithm

A strategy could instead receive a context snapshot plus constraints and propose selected/retained units and a summary. This makes selection policy replaceable too. It is closer to the old `propose` operation, but would require independent runtime validation of selection/provenance/protected boundaries and budget claims. Moving the current planner inside a new strategy while trusting its own plan is not sufficient independent validation. The current validator compares retained/selected data against a runtime-owned `MessageCompactionPlan`; changing that ownership is a real additional design responsibility.

No user scenario currently requires a different selection algorithm; the user previously expressly preserves it. Therefore do not broaden the seam merely because another algorithm is imaginable. If replacing selection is part of the intended new scope, obtain that decision explicitly and design the broader proposal contract rather than pretending a summarizer seam covers it.

## Proposed neutral contract obligations — direction, not finalized API

- **Input:** one immutable prepared-prefix text string, rendered from the selected message units and already containing the previous summary when present. SR-022 explicitly removes the summary-size target from this strategy contract and its model instructions; operation/attempt identity and cancellation remain execution controls. Runtime planning/fit checks and provider hard output cap are separate and retained. No live MemoryManager/store/worker, category stores, child-agent runner or credentials. The string itself is immutable; selection/rendering still use an isolated baseline so the strategy never receives live message objects.
- **Result:** one nonempty normalized Markdown summary candidate. Direct LLM owns its prompt and `<compaction_summary>` extraction; callers do not consume raw provider text. Shared acceptance still checks the required body/continuation structure and final context invariants; a different strategy does not bypass them.
- **Metadata:** common attempt identity/outcome; provider/model/token usage only when applicable and separately scoped. A deterministic test implementation must not fabricate provider, model, child-run, episodes or semantic facts just to satisfy the contract. No arbitrary mandatory provider payload bag.
- **Errors:** implementation-neutral failure categories with enough information for a single retry owner to decide retryable/permanent/cancelled. Provider-specific decoding stays at the implementation/provider boundary. Do not require `instanceof` the concrete strategy or its SDK error in runtime orchestration.
- **Cancellation:** the caller can stop the attempt/backoff; no later result can cause commit. Strategy cannot clear pending state or mark the run successful.
- **Side effects:** strategy creates a candidate only; it does not mutate live context, archive raw traces, write the snapshot, choose UI status, run parent tools, or perform its own semantic repair loop.

## Ownership alongside the new retry request

| Concern | Stable owner / proposed boundary |
| --- | --- |
| Trigger, pending authorization, attempt cycle and later-user admission | Runtime/coordinator, not strategy |
| Prefix/suffix selection, complete protected groups and budget plan | Existing planner outside the recommended strategy seam |
| Render the selected message units as prepared prefix text, preserving roles/order and established tool excerpts | Shared history preparation before the strategy boundary |
| Add model-specific instruction/envelope, run one direct generation, parse its wrapper | Direct LLM implementation only |
| Maximum attempts, waiting/cancellation, exhaustion and recoverable error | One runtime policy owner; SDK retries must not multiply the outbound cap |
| Build final context, independently validate body/tool/provenance/budget, atomic replacement | Existing memory acceptance/commit owners, not strategy |
| Parent dispatch after success and pending user-message handling | Existing turn/input owners, revised only after message policy is approved |

The retry request is an actual intended-behavior change, not an old-contract source defect. API's six offline current-policy checks show SDK503/503/200 gives three HTTP calls already,401 gives one, invalid summary gives one, and current handled error eventually becomes IDLE. Those probes were read, not rerun here. A new outer three-attempt loop over the current SDK retries would allow nine requests; the revised contract must prevent this. Storage/postcommit/cancellation must not enter a model-regeneration loop.

## Substitutability acceptance proposed

At compile time and through the real executor/configuration, inject a small deterministic test strategy without importing/subclassing/casting to `DirectLlmCompactionSummarizer`, creating a provider, or inventing provider/category metadata. Exercise successful replacement, classified retry failure, cancellation and late result. The same runtime continues to enforce planner decisions, context budget, tool/provenance safety, one commit and no premature parent dispatch. No second production algorithm is required. Model-specific direct-LLM prompt/parse tests remain separate.

## Pending decisions / no silent scope expansion

1. Confirm the recommended summary-generation replacement axis; broader selection replacement is explicitly not promised by it.
2. Three total request attempts per retry cycle is the proposed precise reading of the user request, stopping early on success. Recommend retrying transient API failures plus empty/malformed/truncated output, but immediately stopping invalid credentials/configuration; never regenerate for cancellation or persistence/commit failure. User confirmation of error-class exceptions is pending.
3. If original user message A was never dispatched and user later sends B, choose whether to deliver A then B exactly once after successful compaction, or deliver only B while keeping A visibly failed. Recommendation A then B; user choice pending. No replay of already dispatched/completed work. The input processor writes a raw user trace before assembly, but current assembly appends only its current message after compaction; raw evidence preservation alone is not parent delivery.
4. Error means visible/recoverable compaction failure with new input enabled, not blindly reusing a fatal worker-error path. Exact status/event/UI integration, bounded wait/deadline values and adapter request-count enforcement are architecture investigation after requirements are approved.

These are one consolidated solution revision; approved prompt-v5/default-parent/no legacy import remain unchanged. Candidate-v6 parked, Qwen stopped, API-F005 accepted/non-blocking, API-F004 historical unknown. No provider calls, production/test changes, new migrations, or acceptance/Delivery result claimed.

## References and workspace

Canonical authority/investigation/design/history and the two incoming requests are in this ticket. Original sources are the seven files named above at the pinned original commit; current read source hashes and API evidence references are in `solution-recovery-evidence/sr021/input-audit.json`. The source reads used `git show <original>:<path>`, `cat`, `sed` and `rg`; a few exploratory globs/one guessed type filename did not exist and were replaced with actual paths. They are search misses, not production/test failures. No new executable tests ran.

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`, branch `codex/context-compaction-simplification-analysis`; HEAD5cb7b049ae3158108bff2cb70ed80e89540586d9, base last refreshed origin/personal8caa610ff438c288d9aca9f2efe2c33924fbf517. No new fetch/rebase/source change; finalization origin/personal remains Delivery-owned. API005 interrupted, last completed API004Fail90.7; CRR007 F006 correction verified, not a new package Pass. Product/Delivery N/A; nine API-owned durable paths still require eventual proportional successful-test review.


## Text-to-text clarification after SR-023

User asks whether the strategy input is the already-prepared prefix and output the summary. Recommended answer: **yes, the replaceable content transformation is prepared prefix text -> normalized summary text**. Cancellation, attempt identity, errors and optional execution diagnostics remain controls/observability, not extra history inputs. The precise exported interface is not finalized by this conceptual illustration.

Current-source distinction: `PendingCompactionExecutor` passes `plan.compactableUnits`, typed as `WorkingContextMessageUnit[]`, to `DirectLlmCompactionSummarizer`. Those units contain messages/provenance/tool grouping; they are not already a string. The direct class currently calls `WorkingContextCompactionPromptBuilder`, which invokes `CompactionConversationHistoryRenderer.render` to turn them into role-labelled text with tool excerpts. Its output is parsed summary text plus execution metadata. Therefore the desired text boundary requires moving shared history rendering before the strategy invocation; it is not already the current method signature. Model-specific summarization instructions/request wrapping and response parsing can remain inside the direct implementation. Shared renderer output is source history, not the summarizer's instruction prompt.

This tightens the proposed replacement seam without moving selection/commit into the algorithm or adding a separate previous-summary input, numeric target, strategy registry or second production algorithm. User is discussing/asking confirmation of the boundary; do not infer approval of the unresolved retry/error/message policies or an unseen final architecture. No source/test/provider change. Current source read: direct-llm-compaction-summarizer.ts, pending-compaction-executor.ts, working-context-compaction-prompt-builder.ts, compaction-conversation-history-renderer.ts and working-context-message-unit.ts under autobyteus-ts/src/memory/compaction/.
