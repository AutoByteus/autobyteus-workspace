# SR-021 — Retry/strategy revision intake and investigation result

## Classification and next decision

Package context-compaction-simplification-analysis; owner Solution Designer; 2026-09-30. **Requirements amendment Draft / affected Design Needs Revision.** User explicitly requests a replaceable strategy boundary and three-total-attempt/recoverable-error/new-user-retry behavior. Source analysis complete enough to distinguish current behavior from proposed behavior, but failure exceptions/message policy/replacement scope are not silently approved. No new implementation or independent-review handoff yet. Large/High retained provisionally from the cumulative solution.

Full analysis and candidate boundaries: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/strategy-boundary-analysis.sr021.md`. Canonical proposal: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/requirements-doc.md`, SR-021; original/current evidence `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/investigation-notes.md`, E21-1–4. Technical design `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/design-spec.md` is marked Needs Revision; approved earlier source basis remains preserved, not relabeled complete for new work. Cumulative index `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-revision-record.md`.

## Requests and findings

Read incoming `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/api-retry-policy-request.md` and `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/code-review-design-request.strategy-boundary.md` before acting. User directly adds: “analyze the original implementation ... what is actually the replaceable part and have a clear boundary.” Original strategy interface was real but category/child-run assumptions leaked through construction, result/diagnostics/errors and downstream persistence. Current refactor removes much coupling but still types configuration/executor against the direct concrete class with mandatory provider metadata. Recommend a narrow selected-history-to-summary strategy with stable planner/admission/retry/validation/commit outside; broader selection replacement is a different contract, not promised by renaming.

Current API-owned6 offline probes and inspected production flow show SDK transient retries are not a universal application policy, may multiply under another loop, and handled compaction error currently returns toIDLE. Raw user input may be recorded before failed assembly, but that is not proof original input is replayed to the parent. Proposed failure exceptions and A-then-B delivery versus only-B need explicit user decisions. Questions have been sent; no reply received at persistence.

## Preserved constraints / approvals

Prior SR012+017 behavior/exactv5 and SR020 accepted Qwen deviation remain applicable to unchanged scope. The new amendment changes old single-attempt and no-strategy-blanket wording only through explicit requirements/approval/design work. No old algorithm/settings registry, category writes, semantic repair, v6 tuning, default-provider switch or migration introduced. Qwen stopped; F005 accepted/nonblocking/notfixed. F004 historicalcauseunknown; no reproduction. Prompt-v5/parent-model default/support/legacy-settings-no-import remain. User confirmation here is not an independent review bypass or release authorization.

## Expected next work

Confirm focused replacement/failure/message policy; finalize amended requirements and capture exact approval. Then investigate adapters/status/input/persistence contracts proportionately, complete technical ownership and cancellation/backoff/deadline/count semantics, reclassify finished design and route using current rules. Do not implement now or request another live sample. No new provider budget. Subsequent implementation/API validation and eventual nine-path successful-test review remain specialist-owned. Product N/A—not requested; Delivery N/A—not reached.

## Current workspace/evidence and complete references

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`, branchcodex/context-compaction-simplification-analysis; currentHEAD5cb7b049ae3158108bff2cb70ed80e89540586d9/sourceebaf3a78eff2d3147dc3f4f2eb63bf119d6547ad; lastrefreshedorigin/personal8caa610ff438c288d9aca9f2efe2c33924fbf517. Local refs reconfirmed, no new fetch/rebase/commit/push/merge/release. Finalizationorigin/personal viaDelivery. Originalsource046279298f53fb98d7688ee9dc2b2ba0fa827685 inspectedread-only.

Latest API005interrupted fornewpolicy, nooverallresult; lastcompleteAPI004Fail90.7 unchanged. CRR007F006 localassertioncorrectionverified; no new reviewscore. Current API/code reports read forstatus, not edited. Cumulative authority/supplement/source/license/research/probe/failure indexes: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/api-rev-005/reference-index.json` and `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/code-review-evidence/crr-007/reference-index.json`; earlierSR/ARCH/IR/CRR/API histories retained. Approved literal `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/proposed-compaction-prompt.md` and outputcontract `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/output-format-and-coverage.md` unchanged. Parkedv6/proposal remains historical, not a pendingrequiredremedy. Current/audit evidence `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr021/input-audit.json`; owned predecessorversions history/*.before-sr021.md.

No production/durable-test edits, new executabletests/provider/credential/historyaccess/processcleanup bySolutionDesigner. Source inspection only; sixoffline probes are API's earlier execution. No privateenv/vault/userdesktop/externalWIP/SDKcleanup. No new migrationdesigned; if pending-message durability changes require persistedformatwork, governingmigrationguideline investigation is mandatory before thatdesign.

## Routing

get_handoff_rules fetched after persistence. No rule matches this Draft/clarification hold: no Architecture Design Complete or Delivery receipt. No recipient/delegation/duplicate downstream handoff. Return analysis and focused questions to user. Source/authority hash check unchanged; no new acceptance claim.


## SR-021 input/output clarification (user follow-up)

User asks what the strategy's input and output are. This is clarification of the proposed selected-history transformation boundary, not blanket approval of the outstanding retry/message policy or a finalized interface.

Essential input: selected older settled history, including the previous compaction summary when present. Conceptually previousSummary(optional) + selectedOlderMessages; do not include the same previous summary twice. These are runtime-prepared message/evidence data, not manually submitted user text. Summary token budget constrains the transformation; cancellation/attempt identity are execution controls. Model/provider/credential construction belongs to the concrete direct-LLM implementation/composition and must still honor the parent-model default, not become compulsory fields for every alternative algorithm.

Essential output: one replacement Markdown continuation summary incorporating still-relevant prior summary facts and selected newer evidence. The strategy returns the normalized inner body, not wrapper tags, raw provider response, episodic/semantic JSON or a rewritten live context. Optional execution diagnostics do not change this essential transformation. The direct-LLM implementation owns its tagged prompt/extraction; shared runtime retains acceptance checks.

Recent retained messages and required system context remain outside this strategy transformation. The runtime selects history, runs the bounded attempt lifecycle, validates/rebuilds the full context and commits it. A rejected/cancelled operation returns an explicit failure, not a partial state change. Full-plan/selection replacement would be a different broader input/output contract, not silently included here.

Illustrative example: previous summary says inspect migration; selected older messages show inventory completed and approval still pending; output retains the goal, records completed inventory and pending approval. It does not claim implementation occurred. Finalized request remains required system context + replacement summary + retained recent history, not the strategy's output alone.

No new requirements approval, source/test/prompt/provider/default change, experiment or architecture completion. Prior SR-021 pending decisions remain. Existing full workspace/evidence/approval context above applies. Rule lookup follows this persisted clarification; do not repeat a downstream handoff.

Input/output clarification routing: get_handoff_rules queried after persistence; none matches unchanged-boundary explanation with pending requirements decisions. No handoff; return explanation to user.


## SR-021 correction/clarification — prefix already contains the previous summary

User correctly points out that the next selected prefix already contains the last summary. Current source confirms it: WorkingContextMessageWindowPlanner excludes compacted_memory units from retained recent candidates, then partition selects non-system/non-protected/non-retained units, including that prior summary. PromptBuilder consumes the resulting units once. There is no separate previous-summary load/append needed at the strategy boundary. Earlier “previous summary + older history” phrasing described prefix contents and could misleadingly imply a separate input; corrected in the analysis itself.

Illustration excluding preserved system messages: [A,B,C,D] -> select[A,B], retain[C,D] -> [S1,C,D]; after more work [S1,C,D,E,F] -> select[S1,C,D], retain[E,F] -> [S2,E,F]. There is no summarize(S1,[S1,C,D]) duplication, separate summary regeneration call, or accumulation of S1 and S2.

Size budget answers a different question: how much space the replacement should aim to occupy. Runtime planning reserves replacementMemoryReserveTokens while fitting system context, retained suffix and overhead into postCompactionTargetTokens. Direct summarizer currently expresses that target to the model; a model can miss it, so final full-context budget validation still applies. It is neither input history nor a fixed bullet-count target, nor identical to provider maximum output tokens. An illustrative60k-token prefix producing20k rather than intended3k may free too little space. One selectedHistory payload plus an output-size option keeps the abstraction simple; exact signature is not finalized, and no approved runtime budget removal occurs in this explanation.

Source checks: current window planner partition/selectRecentSuffix; EstimatedMessageBudgetStrategy.calculate; WorkingContextCompactionPromptBuilder.buildTaskPrompt. Read-only, no tests/provider calls or source changes. Replacement-axis and retry/message approval status otherwise unchanged. No new completed SR/design or downstream task.

Prefix/budget explanation routing: rules queried after persistence; no condition matches this clarification of the still-proposed interface. No recipient or duplicate handoff. Return corrected explanation to user.


## SR-021 size-budget versus provider-cap clarification

User asks whether this budget limits the summarizing LLM output tokens. Current DirectLlmCompactionSummarizer writes `Summary budget: N tokens.` into the request prompt; it does not map that number directly to the provider output-limit option. Thus it is a soft target for the resulting summary. The selected model/provider generation configuration separately supplies its hard output-token cap. Those are related but distinct controls; a provider may count reasoning tokens within its output allowance, so a provider cap is not necessarily exactly the visible summary length. Runtime also validates the rebuilt context against its post-compaction budget. Known provider-incomplete output is rejected rather than installed. No size-budget/provider-cap setting change, approval, test/provider call or completed-design claim in this explanation; pending SR-021 decisions remain.

Size-budget clarification routing: fresh rules lookup after persistence; no matching completion/receipt rule. No handoff; return explanation only.
