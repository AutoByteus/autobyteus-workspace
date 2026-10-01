# Context-compaction simplification — current rationale

Documentation revision SR-028. This explanatory document does not supersede `requirements-doc.md`, the exact prompt, or `design-spec.md`. The complete earlier assessment is preserved in `history/analysis-report.md.before-sr023.md`; its former research comparisons are not current rationale.

## Why simplify

The original implementation asked a child compactor to produce categorized JSON, constructed episodic/semantic records, and rendered those records back into one prompt-facing continuation checkpoint. The next parent request needed the checkpoint, not the intermediate categorization. Historical inspection remains useful but does not require every new compaction to produce long-term-memory records.

The approved direction is one direct LLM summary over selected settled history, producing one replacement Markdown checkpoint. Long-term memory is separate future work. Preserve historical read access and supported saved runs; do not delete history or require a model call merely to reopen a valid run.

## What remains outside summary generation

The runtime owns the trigger, prefix selection, protected head/recent tail and complete tool interactions, input preparation, candidate validation, failure admission, safe persistence and parent continuation. A simple output does not remove these responsibilities. Current work also defines an implementation-neutral summary-production boundary, without reintroducing a strategy registry or a second production algorithm.

## Why there is no numeric summary target

ASM-022-01 in `requirements-doc.md` and `design-spec.md` records the operating assumption: long conversation histories naturally condense into substantially shorter task-continuation summaries. Repetition, obsolete intermediate detail and verbose evidence need not be reproduced; selected tool results are already excerpted. Essential continuation information determines useful detail. The user's practical experience supports relying on this behavior without an explicit token quota.

Remove the numeric prompt target and its strategy argument. Keep qualitative conciseness and fidelity guidance, the provider hard output cap, incomplete-output rejection and final-context fit checks. The selected prefix already contains any prior summary once; repeated compaction yields one updated replacement.

## Current state

SR-028 requirements are Approved and design is Ready for independent architecture review. Content is prepared before `CompressionStrategy.compress(content)`; it returns compressed text and owns three total internal attempts. No numeric target, new migration or strategy selector. The existing run queue holds A on pre-parent compaction failure; a later admitted B authorizes recovery; continue A then B without resubmission. The target keeps A's native turn paused at its blocked phase, not a new queue/replay ledger. No source implementation or new API acceptance result in this design round. See canonical requirements/design and `solution-progress-result.md` for authority and remaining gates.
