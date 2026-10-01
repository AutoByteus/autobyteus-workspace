# SR-022 — Bounded numeric-target removal comparison

> **Completed — bounds exhausted (2026-09-30).** Exactly four outbound generations, no remaining call allocation. API packet: `api-e2e-evidence/sr022-budget-diagnostics/README.md`; final manual judgment: `semantic-adjudication.md` in that packet. Both no-target samples usable; F-withTarget failed fidelity (SR022-Q01), R-withTarget usable. Not API005 acceptance or an implementation result. Original preregistered plan below is retained; returned evidence/disposition is in `solution-revision.sr022.md`.

## Authority and purpose

User requests removing prompt-level numeric summary budget and suggests experiments; clarification: “Of course, we don't remove from the provider's hard output cap, right? But we can remove that from the prompt.” This explicitly approves the bounded request-content change, not new provider defaults, a new algorithm, all-model reliability, or removal of runtime budget safety. Existing separate user permission permits DeepSeek v4 flash and repository credential import into an owned private test vault. API owns execution; no source env printing/editing, private history or production vault access. Qwen remains stopped; v6 remains parked.

This is a NEW evidence-only diagnostic plan, not reuse of exhausted SR014/DeepSeek campaigns, not the proposed production3-attempt policy, not an API acceptance/Delivery result. Prior failure/positive evidence and SR020 exception stay intact.

## Fixed scope and request budget

Maximum **four total outbound generation requests**, no network/model retries/substitutions/additional samples, no new first-summary generation. Two frozen synthetic source requests in `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr022/frozen-requests.json`:
1. F: actual earlier DeepSeek full-flow selected prefix, with its original8192 prompt target.
2. R: actual prior DeepSeek repeated request including its actual first summary exactly once plus correction, original3000 prompt target.

Fixed order: **F-withTarget, F-withoutTarget, R-withoutTarget, R-withTarget**. Each pair differs only by deletion of the leading `Summary budget: N tokens.\n\n` user-message prefix. Approved v5 system content, history, provider/model, temperature0.7, hard output cap8192, request structure and other generation controls remain identical within pairs. Effective wire controls captured; no claim remote sampling is deterministic. Verify source hashes and exact diff before any call.

Use existing production model factory/provider adapter and production tagged-summary parser where possible with these frozen rendered messages. Because the unimplemented change is deliberately at the rendered request boundary, a test-only replay of frozen requests is acceptable and must be disclosed: it does not validate planner/commit or claim the production summarizer was changed. Do not edit production source or global/user settings to run this comparison. Any test wrapper must record original and final requests and prove no change beyond the registered prefix. No parser/assertion weakening, semantic validator or repair generation.

## Prerequisites, stopping and observations

- Pre-register manifest/case inputs/expected critical facts and exact commands; confirm normal isolated setup and configured target before generation. Missing target/unsafe prerequisites -> stop, do not substitute a model.
- Enforce at most one outbound generation per arm, including SDK retries, and four total; request-guard proof offline first. Transport/auth/quota/timeout/cancellation/cap violation -> close campaign, keep partial evidence, no retry. Each call deadline at most400seconds, campaign at most1800seconds; lower current limits remain respected.
- A completed malformed/semantic-failing result is retained as a failure; only already-predeclared remaining arms may run, not adaptive additional attempts. No retry until green.
- Record exact safe synthetic request/response bodies, hashes, visible/body character counts, provider usage with reasoning separate, completion/stop status, structured extraction validity, elapsed time and sanitized error category. No auth headers/private history/raw hidden reasoning.
- Manual full-body factual review against frozen sources, before judging length: six headings, critical goals/constraints/references, corrected retention/export decision, pending approval/verification and action status. Do not mark a short but incomplete/invented summary good. Predeclare fixture-specific facts rather than copying expected answers into the prompt.
- Compare with/without length and fidelity; small sample is scoped evidence, not causality/rate/universal output-length proof. Report all four/partial outcomes. No installation into conversation state or unsafe parent action. No new full runtime/UI suite implied.
- Cleanup only owned test server/vault/db/key/runtime and retain evidence; no shared LMStudio/user desktop/SDK/external-WIP cleanup.

## Expected reply and limits

Return diagnostic packet, actual call counts/controls, all outputs and manual judgments to the existing Solution Designer. This does not resume API005 acceptance against still-Draft retry/boundary authority or create API006 automatically. No confidence rescore. If safe execution prerequisites or fixed diff cannot be met, report that precise limit without provider calls. Do not add tests/source fixes unrelated to this observation. Future successful acceptance still requires proportional durable-test review and Delivery gates.

Full current solution context: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-revision.sr022.md`. Approved no-numeric-target addition is recorded in requirements SR022; retry/message decisions from SR021 remain separate and unapproved. HEAD5cb7b049/sourceebaf3a78/base8caa610f; finalization origin/personal. Rules lookup after persistence; intended ordinary coordination with existing `/api_e2e_engineer`, not fresh delegation or formal Architecture Design Complete handoff.
