> SR-026 current ownership: CompressionStrategy owns up to three total compression attempts inside one call. Runtime owns admission of a later user retry, not an outer automatic retry loop. DEC02102 is settled; DEC02103 message delivery alone remains pending. Earlier contrary recommendations are superseded.

> SR-024 confirmed direction: `CompressionStrategy.compress(content)` transforms content text to compressed text. Prefix selection/rendering belongs to the caller; remaining error/message policies are separate.

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

### Confirmed scope: content-to-content compression, with caller-prepared history

```text
stable runtime: trigger/admission -> capture baseline -> existing prefix/suffix planner
  -> shared history preparation: selected message units -> prepared prefix text
  -> CompressionStrategy: content text -> compressed text
  -> stable runtime: build/validate -> durable commit -> normal parent dispatch
```

**The contract input is a content text string, not a prefix-specific type or field.** For this caller, that content is the prepared selected prefix. Selection initially produces typed message units; shared history preparation renders that selected prefix before the strategy call. When a previous summary exists, the current planner already includes its compacted-memory unit in that prefix. Do not add a separate previousSummary field or prepend it a second time. “Previous summary + selected older history” described the contents of that prefix, not two independently supplied inputs. The strategy transforms the prefix into one replacement continuation summary. This directly serves the user's original request to change compaction generation while preserving prefix/suffix selection, history preparation and safety. It supports replacing the **summary-producing implementation** without changing orchestration. It does not promise interchangeable arbitrary selection or memory/storage algorithms.

Keep one production implementation: direct LLM using approved prompt-v5. Keep a small constructor-injected contract, not a registry, selector setting, old fallback, second production strategy or plugin framework. User-selected terminology is `CompressionStrategy`, with a conceptual `compress(content: string): Promise<string>` content operation. For this ticket the compressed result is a continuation summary. The name does not give the strategy ownership of the surrounding memory lifecycle.

### Considered but not selected: full proposal algorithm

A strategy could instead receive a context snapshot plus constraints and propose selected/retained units and a summary. This makes selection policy replaceable too. It is closer to the old `propose` operation, but would require independent runtime validation of selection/provenance/protected boundaries and budget claims. Moving the current planner inside a new strategy while trusting its own plan is not sufficient independent validation. The current validator compares retained/selected data against a runtime-owned `MessageCompactionPlan`; changing that ownership is a real additional design responsibility.

No user scenario currently requires a different selection algorithm; the user previously expressly preserves it. Therefore do not broaden the seam merely because another algorithm is imaginable. SR-024 settles the narrower content transformation; do not reopen selection replacement merely because the contract has a general name.

## Proposed neutral contract obligations — direction, not finalized API

- **Input:** one immutable `content` text string. Its source and preparation are caller concerns; the context-compaction caller renders selected units, including any prior summary once, before invoking the strategy. SR-022 explicitly removes the summary-size target from this strategy contract and its model instructions; operation/attempt identity and cancellation remain execution controls. Runtime planning/fit checks and provider hard output cap are separate and retained. No live MemoryManager/store/worker, category stores, child-agent runner or credentials. The string itself is immutable; selection/rendering still use an isolated baseline so the strategy never receives live message objects.
- **Result:** compressed text. In this ticket it is one nonempty normalized Markdown summary candidate. Direct LLM owns its prompt and `<compaction_summary>` extraction; callers do not consume raw provider text. Shared acceptance still checks the required body/continuation structure and final context invariants; a different strategy does not bypass them.
- **Metadata:** common attempt identity/outcome; provider/model/token usage only when applicable and separately scoped. A deterministic test implementation must not fabricate provider, model, child-run, episodes or semantic facts just to satisfy the contract. No arbitrary mandatory provider payload bag.
- **Errors:** strategy owns its internal failure/attempt sequence and returns a final implementation-neutral failure to the host; explicit cancellation stops attempts. Provider-specific decoding stays at the implementation/provider boundary. Do not require `instanceof` the concrete strategy or its SDK error in runtime orchestration.
- **Cancellation:** the caller can stop the attempt/backoff; no later result can cause commit. Strategy cannot clear pending state or mark the run successful.
- **Side effects:** strategy creates a candidate only; it does not mutate live context, archive raw traces, write the snapshot, choose UI status, run parent tools, or perform its own semantic repair loop.

## Ownership alongside the new retry request

| Concern | Stable owner / proposed boundary |
| --- | --- |
| Trigger, pending authorization and later-user cycle admission | Runtime/coordinator; not automatic compression retries |
| Prefix/suffix selection, complete protected groups and budget plan | Existing planner outside the recommended strategy seam |
| Render the selected message units as prepared prefix text, preserving roles/order and established tool excerpts | Shared history preparation before the strategy boundary |
| Add model-specific instruction/envelope, run one direct generation, parse its wrapper | Direct LLM implementation only |
| Three total compression attempts, internal waits and final rejection | CompressionStrategy; no host automatic loop or SDK multiplication. Host retains cancellation authority and recoverable error presentation |
| Build final context, independently validate body/tool/provenance/budget, atomic replacement | Existing memory acceptance/commit owners, not strategy |
| Parent dispatch after success and pending user-message handling | Existing turn/input owners, revised only after message policy is approved |

The retry request is an actual intended-behavior change, not an old-contract source defect. API's six offline current-policy checks show SDK503/503/200 gives three HTTP calls already,401 gives one, invalid summary gives one, and current handled error eventually becomes IDLE. Those probes were read, not rerun here. A new outer three-attempt loop over the current SDK retries would allow nine requests; the revised contract must prevent this. Storage/postcommit/cancellation must not enter a model-regeneration loop.

## Substitutability acceptance proposed

At compile time and through the real executor/configuration, inject a small deterministic test strategy without importing/subclassing/casting to `DirectLlmCompactionSummarizer`, creating a provider, or inventing provider/category metadata. Exercise successful replacement, classified retry failure, cancellation and late result. The same runtime continues to enforce planner decisions, context budget, tool/provenance safety, one commit and no premature parent dispatch. No second production algorithm is required. Model-specific direct-LLM prompt/parse tests remain separate.

## Pending decisions / no silent scope expansion

1. Replacement axis confirmed in SR-024: content text -> compressed text; prefix preparation/selection outside. No further confirmation needed for that bounded decision.
2. Settled SR-026: three total compression attempts inside the strategy, stop on first success and reject after third failure; no outer automatic loop. Earlier proposed permanent-API-error early stopping is withdrawn. Cancellation stops work; caller persistence/commit failures do not trigger new generation. SDK retries cannot multiply the direct-provider request cap.
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


SR-024 terminology clarification: the prior “prefix text” explanation described this caller's source data, not the general strategy interface. User explicitly wants `content` and compressed result, named CompressionStrategy. Keep these terms in the target contract; the implementation uses direct LLM summarization and does not own preparation or installation. Earlier source observations remain true; no code has been changed.


## SR-025 continuation

User again confirms preparation precedes `compress(content)` and asks to continue. This boundary and no numeric target are settled; no further question is needed for either. `strategy-execution-investigation.sr025.md` provides the fresh source trace and change/verification map for rendering, proposal metadata, current-parent binding, retry transport count, recoverable turn errors and input disposition. It is feasibility evidence, not finalized execution API or approval of the two remaining retry/message choices.
