# SR-015 — targeted prompt recovery proposal

## Status / approval request

**Ready for Approval — proposed behavior-supplement amendment only.** Approved REQ/AC intended behavior stays the same; current canonical prompt-v5 and SR-013 technical design remain authoritative. No prompt/default/model-support/source change has been made. The user is asked to approve the exact one-bullet candidate refinement below as the next revision to evaluate, with independent review/validation still required before release. Approval is not a claim of efficacy or permission to weaken ACs; do not promote a failing candidate. There is no blanket authorization for further prompt search/retries or unrelated model changes.

Canonical approved literal: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/proposed-compaction-prompt.md`.
Full unapproved candidate literal: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/compaction-prompt-v6-candidate.md`.
Exact diff: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr015/prompt-v5-to-v6-candidate.diff`.

## Evidence and conclusion

SR-014 API owner executed exactly four fixed-input A,B,B,A one-call generations, using production factory/summarizer and final SDK JSON capture. All retained the frozen prior summary, correction and exact prompt-v5; all other serialized fields match, same8192 cap/3000 target. Both current temperature0.7 and both temperature0 samples invent addition of the requested checkpoint. Claims appear in Completed work or Current state. Offline SR-015 reconciliation verifies records/hashes/input equality and quoted claims; no new generation.

Thus **do not select temperature0 as the remedy** on this evidence. This does not prove temperature never matters, prompt alone causes the failure, broad model incapability or a measured failure rate. The lower-temperature option simply has no successful result here. Configuration/model/prompt interactions and remote defaults remain partly unknown.

The original prompt already prohibits fabrication and confusing planned/completed work. The proposed clarification targets a narrower possible confusion: recording a changed requirement in the summary is not proof the target agent changed its plan/files. This is a testable hypothesis, not a proven prompt defect. Adding a local explanatory bullet preserves the user's tuned prompt and simple architecture rather than introducing agent/semantic-validation/repair infrastructure.

## Exact proposed addition

Insert immediately after the current planned/active/completed-work bullet; all other text, tags, headings and detail guidance unchanged:

> Treat a newly requested action as pending unless later supplied history reports that it was performed. Updating this summary is not evidence that the target agent updated a plan, changed a file, or performed an action. A changed requirement may be recorded as current without implying that the corresponding work was done. Apply this rule in every section, including Current state and Completed work.

No checkpoint ID, incident/file/test-string or required output answer is embedded; this is a generic rule. Completion may be supported by explicit source reporting, including assistant progress statements—not only tool calls. It does not require a new evidence schema or reject legitimate text-only work. New requirements/cancellations may be recorded as current decisions without implying their implementation.

## What would remain unchanged

One direct call; existing prefix/suffix/planner and history safety; Markdown tags/six headings; sufficient-detail rule; parser and persistence; model selection and inherited default temperature/cap; no additional generation, semantic validator, JSON category stores, strategy registry or support exclusion. REQ-006/AC-002/007 and all original cases/failed samples stay valid. This is not an API-F004 remedy.

## Evaluation after approval — proposal, not executed/authorized yet

One predeclared bounded campaign only, API-owned. Keep current0.7 default/model/cap; compare exact v5/v6 with all other controls fixed. Freeze the already failed prior-summary/correction for the regression comparison. Also include a paired contrast on an independently written synthetic history: a requested document update with no action versus the same request followed by explicit assistant/tool evidence of completion. Pre-register inputs and source-level expected facts before generation. Use no fixture checkpoint names in the prompt. The candidate must not fix fabrication by marking genuinely completed work pending or losing constraints/corrections/references. Preserve one-call and full-body manual semantic adjudication; a regex is not a truth oracle.

Suggested maximum **six direct calls**: four regression comparisons in v5,v6,v6,v5 order; one v6 held-out pending case and one v6 held-out completed case. No adaptive additions/substitution or new first-summary regeneration. Every output/error retained. A candidate failure rejects it for this campaign; successes are limited evidence, not a universal reliability guarantee or full acceptance. Exact experiment/owner route is finalized only after user approval. Technical integration of an approved candidate and any affected design/source follows configured review/validation; no direct production edit by Solution Designer.

## Separate continuation failure / validation limits

Original API-F004 remains unresolved. New one full-flow observation produced4turns/4tools/1summary with existing assertions, but temporary Vitest config omitted normal Prisma/global setup and logged TOKEN_USAGE_CURRENT_SCHEMA_REQUIRED. It is not fully environment-equivalent and cannot reconstruct the missing original exception. This new warning is not retrospectively assigned as the original cause. Capture now supports bounded all-exit observations; its stdout reconstruction and pristine wire file have separate provenance. Before future full acceptance, API owner must use normal equivalent setup and retain failure observations; any new execution needs a separately predeclared decision, not reuse exhausted SR-014 bounds.

API-REV-002 Fail82.9, API-F005/F004 Open and nine cumulative API-owned durable paths await recovery/acceptance and eventual proportional test review. No score/Delivery advancement. Other full-suite/typecheck/browser status/retry/resume/cloud/whole-transaction limits remain. Product N/A—not requested; Delivery N/A—not reached.

## Source / workspace context

Full current package/context: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-progress-result.md`. API packet: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/sr014-diagnostics/README.md`; semantic comparison: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/sr014-diagnostics/semantic-adjudication.md`; own reconciliation: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr015/evidence-reconciliation.json`. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`, branchcodex/context-compaction-simplification-analysis, HEADc948605e2aa5e9dac77b69819eb8f366226c4112, reviewed source7886aeb78449fa54a09ce715fc6e0d74134b386f, base046279298f53fb98d7688ee9dc2b2ba0fa827685; finalizationorigin/personal via Delivery. Existing owner changes/data/SDK outputs/shared LMStudio/user desktop/external WIP are untouched. Large/High cumulative solution classification unchanged; no completed revised architecture is claimed now.
