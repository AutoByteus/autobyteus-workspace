# SR-022 — Numeric summary-target evidence

User explicitly directs removal of the numeric summary-length instruction while retaining the provider hard output cap. This is an approved bounded request-content change, not a claim all summaries are short or that all upstreams agree.

## Upstream recheck (pinned inspected paths, not every mode/version)

| Project | Numeric size instruction in inspected prompt? | Distinct controls/evidence |
| --- | --- | --- |
| Hermes | Yes: dynamic target token count; saved first/repeated lean example also has a session-log allowance | Saved upstream-prompts/hermes.md; live pinned source confirms target interpolation. Counterexample to “none do this.” |
| OpenCode | No, template asks terse bullets and preservation | Core source separately sets request generation maxTokens up to4096. This is a provider hard cap, not numeric prompt guidance. |
| ZCode | No in inspected prompt.ts templates | This observation does not establish absence of provider/context limits elsewhere. |
| DSH | No, asks concise engineering prose | Summarizer separately passes config.maxTokens and rejects max-token termination. |
| Codex local default | No, requests a concise structured handoff | Only public default local prompt inspected; not private remote compaction or absence of runtime limits. |

Source URLs re-opened read-only via web in this round:
- https://raw.githubusercontent.com/NousResearch/hermes-agent/9fc7f17906eab1dd81ddfdf8a1edeecac1e79940/agent/context_compressor.py (target interpolation in prompt builder; line3736 as returned)
- https://raw.githubusercontent.com/anomalyco/opencode/696f41bc8e7586657375d53390925fc54c25d34c/packages/core/src/session/compaction.ts (template14–49; request175–194)
- https://raw.githubusercontent.com/zai-org/ZCode/29628c9acdb81b703bbd4080c207a0e7ce5e276e/apps/zcode-cli/packages/core/src/compact/prompt.ts
- https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/477b4f420553e8a52c2fbccc464d7561b239c443/packages/compaction/compaction-basic/src/summarizer.ts (instruction and options143–153)
- https://raw.githubusercontent.com/openai/codex/25270df2615eb4da5b9d4a9a392226933fb096c5/codex-rs/prompts/templates/compact/prompt.md

Original saved source-derived templates/licenses/extraction manifest remain untouched; previous temporary clone directory no longer exists, so new external corroboration used primary raw-source URLs rather than claiming a fresh clone/test. No updated-revision comparison or upstream model experiment.

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
