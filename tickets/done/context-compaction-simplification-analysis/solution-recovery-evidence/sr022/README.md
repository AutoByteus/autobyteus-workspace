# SR-022 — Numeric summary-target evidence

User explicitly directs removal of the numeric summary-length instruction while retaining the provider hard output cap. This is an approved bounded request-content change, not a claim all summaries are short or that all upstreams agree.

## Current rationale and historical boundary

The current rationale is ASM-022-01 in requirements/design. The earlier comparison section is no longer part of active documentation; its exact prior text remains in `../../history/solution-recovery-evidence__sr022__README.md.before-sr023.md` as historical investigation. No raw experiments, licenses or source provenance were changed.

## Actual retained DeepSeek outputs

`historical-measurements.json` derives counts from existing safe synthetic requests and outputs:

| Historical sample | Prepared user-message characters | Markdown body characters | Numeric target sent | Derived non-reasoning response tokens |
| --- | ---: | ---: | ---: | ---: |
| API003 first |1264|2473|3000|584|
| API003 repeated |3341|2844|3000|678|
| API004 full-runtime summary |9167|3559|8192|1013|

Non-reasoning counts are provider output minus reported reasoning, not exact standalone Markdown tokenizer counts; wrappers may be included. Headers/scaffolding included in prepared-message characters, not the system prompt. Sparse first fixture expands rather than shrinks, so do not generalize “every summary is shorter.” Full-runtime sample demonstrates substantial reduction and useful continuation, but its original complete test still had an independent assertion failure; no historical rescore. All three had numeric guidance, so they do not isolate its usefulness. No 60k-input observation in these historical samples; the separate completed diagnostic below supplies the no-target observations. User reports broader personal experiments; not independently rerun/counted here.

## Current AutoByteus behavior and precise proposed delta

`DirectLlmCompactionSummarizer` prepends `Summary budget: ${input.summaryBudgetTokens} tokens.\n\n` to rendered history. The approved system literal itself contains no numeric length target. Remove only this request prefix and the now-unneeded strategy-facing summary-budget parameter. Keep the tuned v5 system literal, detail/conciseness guidance, tags/headings, selected-prefix preparation, provider hard cap, input-capacity check, planner-internal reserve/budget math and final full-context validation. No hidden replacement word-count target, fixed bullet count, extra shortening pass or semantic-repair prompt.

The prior summary is already included once in the selected prefix. New public transformation remains selected history -> Markdown summary; budget math can remain internal to the host without becoming model instructions. This is approved intent pending consolidated technical design/review/implementation, not a production source edit in this round.


## Completed four-arm diagnostic — evidence incorporation

API-owned packet: `../../api-e2e-evidence/sr022-budget-diagnostics/README.md`; full manual/source assessment in that packet's `semantic-adjudication.md`, metrics in `comparison.json`, safe wire and all raw arm files unchanged. Solution Designer read all bodies and frozen inputs and corroborated the reported bounded conclusions, then checked stored-message equality, exact prefix-only delta, body code points, token arithmetic, arm-file hashes and nine durable-file hashes offline (`diagnostic-incorporation-audit.json`). No provider call/test rerun or source change. API execution/cleanup claims remain attributed to its retained evidence, not a new independent execution.

Exactly four registered outbound requests, same DeepSeek/temp0.7/hard8192/v5. F-withTarget 3869 code points, without 3410; R-withTarget 2875, without 2766. Both without-target outputs usable, as was R-withTarget. F-withTarget fails existing fidelity intent for invented broader raw-evidence/future-file rules (SR022-Q01); retained, not waived. Four complete/stop/parse successes are not four semantic Passes. F's shorter no-target body used more total and slightly more non-reasoning tokens. No general length, cause, reliability, cost or latency claim.

Continue the already-approved removal; no new numeric substitute, semantic remedy or further samples. Keep provider and runtime limits. Frozen replay bypasses planner/commit/parent, so future production correctness remains to validate after consolidated requirements/design. Q01 remains evidence for applicable quality review; no automatic runtime-defect attribution. API005 interrupted, API004 last completed, Qwen stopped, remaining SR021 decisions and review/Delivery gates unchanged.
