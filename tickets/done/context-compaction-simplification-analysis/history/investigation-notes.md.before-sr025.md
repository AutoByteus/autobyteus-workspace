> SR-023 reading note: this is the cumulative factual investigation record. Earlier research remains historical evidence, not current design rationale. Current decisions and expanded ASM-022-01 are in requirements/design; current result is solution-documentation-cleanup.sr023.md.

# Context-compaction simplification — investigation notes

## Bootstrap

- Package: `context-compaction-simplification-analysis`
- Request: analyze whether AutoByteus runtime context compaction is over-engineered by coupling a JSON episodic/semantic split to prompt continuation; compare simpler summary-based approaches.
- Git worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`
- Branch: `codex/context-compaction-simplification-analysis`
- Initial base: `origin/personal` @ `a2694ed453e353550d8b345fa82ef489634dcaf2` (SR-001/SR-002). Current base refreshed and fast-forwarded on 2026-09-26 to `046279298f53fb98d7688ee9dc2b2ba0fa827685` for SR-003; worktree/branch unchanged.
- Finalization target: `origin/personal` if a later approved change is delivered.
- Existing work: earlier `compression-current-behavior` investigation and active `memory-compaction-file-backed-redesign` worktree. Both are external historical/WIP packages, not this package's authority; do not edit them.
- Bootstrap blocker: none.
- Current status: `SR-013`; requirements SR-012 explicitly Approved; architecture investigation completed; saved-context, restore checks and raw-trace contents explained; user previously confirmed clean replacement and future-memory separation; output-extraction/detail proposal under discussion; source collection complete and user-requested targeted prompt refinement proposed; original-prompt assessment and minimal prompt refinement completed; requested prompt proposal and further feasibility investigation complete. Core one-call/one-summary direction explicitly approved. Complete requirements preservation boundary is Ready for Approval; no authoritative architecture/implementation handoff yet. Earlier sections below preserve the historical evidence and decision state of their rounds.

## Evidence and uncertainty to resolve

- Current selected-message planning, helper prompt/response, persisted artifacts, next-request projection, repeated compaction, and failure gates.
- Whether episodic and semantic storage serve any independent current production consumer beyond reconstructing the compacted prompt.
- What raw trace, lineage, and snapshot provide independently of the categorized result.
- Comparison limited to primary public documentation/source. User's names `dsh` and `zcode` may be speech transcription ambiguity; do not attribute behavior to them without identification.

## Initial source log

| Date | Source | Finding |
| --- | --- | --- |
| 2026-09-25 | `git fetch origin personal`, `git worktree add ...` | Isolated task workspace on current tracked `origin/personal`. |
| 2026-09-25 | `tickets/done/agent-based-compaction/*`; earlier `compression-current-behavior` worktree | Prior current-state and file-backed analysis exists; earlier target still retained episodic/semantic concepts. |
| 2026-09-25 | `autobyteus-ts/src/memory/compaction/*`, projection/store/lineage files | Direct code inspection in progress. |
| 2026-09-25 | `autobyteus-ts/src/memory/compaction/structured-json-compaction-strategy.ts`, `working-context-compaction-prompt-builder.ts`, `agent-compaction-summarizer.ts`, `compaction-response-parser.ts`, `compaction-result-normalizer.ts` | Default compaction strategy packages selected history inline; helper returns strict six-array JSON; parser/normalizer and one correction attempt enforce that representation. |
| 2026-09-25 | `autobyteus-ts/src/memory/compaction/accepted-compaction-builder.ts`, `accepted-compaction-committer.ts`, `autobyteus-ts/src/memory/projection/compacted-memory-message-builder.ts` | Accepted JSON becomes episodic/semantic rows, then a single compacted-memory user message; commit writes rows, lineage and snapshot and archives selected raw traces. |
| 2026-09-25 | `autobyteus-ts/src/memory/compaction/working-context-message-window-planner.ts`, `working-context-message-unit-builder.ts`, `autobyteus-ts/src/memory/working-context-finalizer.ts` | Prior compacted-memory constituent participates in later compactable prefix, not recent retained suffix; protected tool tail and recent suffix are preserved. Adjacent user messages may be composed with provenance. |
| 2026-09-25 | `rg -n '\bRetriever\b|\.retrieve\(' autobyteus-ts/src autobyteus-server-ts/src`; server Memory Inspector API and web tabs | `Retriever` is exported but no runtime production caller found in this source search. Server/UI do expose episodic/semantic records for inspection, so they are not literally unused. |
| 2026-09-25 | `autobyteus-ts/src/memory/store/memory-file-names.ts`, `autobyteus-ts/src/memory/lineage/compaction-lineage-record.ts`, `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | Shipped persisted shape includes episodic/semantic JSONL, snapshot JSON and lineage JSONL; restart validates compacted-memory region against lineage. |
| 2026-09-25 | `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-compaction-file-backed-redesign/tickets/in-progress/memory-compaction-file-backed-redesign/requirements.md` and `memory-layer-taxonomy-design-clarification.md` | Existing unintegrated redesign requires three Markdown memory outputs and describes legacy-data migration; its latest requirement revision is pending user review. This package is read-only evidence, not this analysis's authority. |
| 2026-09-25 | [Hermes compression docs](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/context-compression-and-caching.md), [Hermes persistent-memory docs](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/memory.md), [Hermes micro-compaction docs](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/micro-compaction.md) | Context checkpoint is a structured natural-language summary with prior-summary integration and retained tail; persistent memory is a separate facility. Hermes algorithm itself is nontrivial. |
| 2026-09-25 | [Codex CLI `compact.rs`](https://github.com/openai/codex/blob/main/codex-rs/core/src/compact.rs), [OpenAI API compaction docs](https://developers.openai.com/api/docs/guides/compaction) | Codex CLI builds replacement history around summary plus preserved user messages; API server-side compaction may be opaque. Avoid claiming all Codex compaction is plain text. |
| 2026-09-25 | User follow-up: “episodic and semantic belongs to long-term memory management, but compaction is not about that … create a really good summary so that the agent can continue after the compaction is done” | Direct user articulation of the desired conceptual boundary. This clarifies the candidate direction, but does not yet explicitly approve the scope, persisted-data treatment, or revision of the existing redesign. |
| 2026-09-25 | User follow-up: compaction reduces “very big … working evidence into smaller one, and then into smaller one”; an agent may do compaction, but “there's no need … to introduce a semantic memory and episodic memory” | Confirms iterative continuation-checkpoint outcome and rejects mandatory episodic/semantic output for compaction itself. Still no direction on old data, Inspector/API, or existing redesign package transition. |

## Supported current scenario and behavior

| ID | Kind | Trigger | Current product/runtime sequence | Outcome | Evidence |
| --- | --- | --- | --- | --- | --- |
| `SCN-001` / `BEH-001` | System | A supported AutoByteus agent run reaches the compaction budget after a provider response | Runtime plans settled old context, invokes configured helper, parses six-array output, writes episodic/semantic and lineage, rebuilds context as compacted-memory message + recent retained messages | Next provider request receives a smaller prompt while preserved head/tool-safe tail remain | `pending-compaction-executor.ts`; planner, builder, committer above |
| `SCN-002` / `BEH-002` | User | User opens the Memory Inspector for a run | Server reads episodic and semantic JSONL into Memory View; web renders separate tabs | User can inspect those memory kinds | `agent-memory-service.ts`; `MemoryInspector.vue` |
| `SCN-003` / `BEH-003` | System | A previous compacted run needs another compaction | Prior compacted memory is included in the selected prefix for the new summary pass | New output is a replacement current summary, not direct addition of prior rows to the prompt | unit builder and window planner; compactor template |

## Evidence-backed assessment

- The category split and re-rendering is a real output-model cycle, not just a naming concern. It adds schema parsing, categorization, persistence, and projection to achieve one prompt message.
- No independent runtime retrieval use was found for current episodic/semantic rows. The Memory Inspector is an independent UI reader; external consumers were not audited.
- The representation could be simplified without discarding distinct safety boundaries: message/window planning, tool protocol integrity, budget validation, trace archive, lineage, snapshot recovery.
- Output simplification alone does not address inline-history prompt capacity or helper-agent recursion. These are separate known risks in the earlier `compression-current-behavior` assessment; this round did not reproduce them.
- No production traces, live-model summary benchmark, or A/B quality comparisons were run; quality and operational upside remain hypotheses. SR-002 adds deterministic/mock-provider contract evidence, not quality evidence.

## Persisted data and transition uncertainty

- Shipped paths: `episodic.jsonl`, `semantic.jsonl`, `working_context_snapshot.json`, `compaction_lineage.jsonl` under run memory storage; raw traces may be archived separately.
- Legacy episodic/semantic rows may be nonempty. The active redesign's investigation reports sampled nonempty local records, but this analysis did not inspect user content or independently measure volume.
- Requirements decision needed: historical visibility/retention, new checkpoint bootstrap for existing runs, Memory Inspector/API compatibility, and whether categorized records continue in any separate memory product. Do not silently drop or reconstruct these from heuristics.

## SR-001 historical decisions / risks

| ID | Type | Description | Owner / next step |
| --- | --- | --- | --- |
| `DEC-001` | Intended behavior | User clearly states one iterative continuation checkpoint and separate long-term memory; full requirements baseline remains unapproved | Requirements baseline approval before design |
| `DEC-002` | Data continuity | Fate of existing JSONL and inspection/API views | User approval before design |
| `DEC-003` | Package authority | Revise/supersede unintegrated file-backed redesign | User direction before editing that package |
| `RISK-001` | Quality | Free-text summary could lose factual salience/retrievability; current JSON taxonomy has not been shown superior by benchmark here | Evaluate repeated-compaction recall if approved |
| `RISK-002` | Capacity | Inline selected history can exceed helper model context regardless of output format | Separate execution design investigation if approved |

## SR-001 historical supplement inventory

| Artifact | Purpose | Status | Approval |
| --- | --- | --- | --- |
| `analysis-report.md` | Evidence-backed assessment, comparison, recommendation, complete result context | Complete | Not behavior-defining approval |
| `solution-revision-record.md` | Cumulative index of Draft requirements direction | `SR-001` recorded | Requirements approval still pending |

## Product Design

Not requested. No UI or prototype scope.

## 2026-09-26 upstream source experiments — completed in SR-002

- User explicitly requested cloning Hermes, OpenCode, ZCode, DSH, and Codex into a temporary folder and analyzing/running experiments against their compaction code. This authorizes research/probes, not AutoByteus implementation or a behavior change.
- Temporary research root: `/tmp/autobyteus-compaction-research-20260926.kVSGz5`.
- Repositories resolved from primary sources: `NousResearch/hermes-agent`, `anomalyco/opencode`, `zai-org/ZCode` (likely requested Z.ai project), `deepseek-ai/deepseek-harness` (README explicitly calls it `dsh`), `openai/codex`.
- Method: shallow clones, record exact commit pins; trace trigger/input/model-facing output/persisted envelope/repeated-compaction/reinjection/long-term-memory coupling; run isolated deterministic or mock-provider probes where feasible. No unrequested live paid model calls, real user histories, or credentials in fixtures.
- Existing isolated reporting worktree reused; requirements, report, revision record, and investigation notes read before resuming. AutoByteus base remains the previously inspected `a2694ed4`; no claim of freshly revalidating all AutoByteus runtime code this round.
- Comparison will not assume that a simple model-facing output implies a small implementation, nor confuse JSON persistence with a JSON response contract.

### SR-002 results and supplement inventory

- Complete source-pinned comparison, command context, caveats, constraints and next action: `upstream-compaction-research.md` (Solution Designer; explanatory evidence, not behavior-defining approval).
- Five clean clones: Hermes `9fc7f179`, OpenCode `696f41bc`, ZCode `29628c9a`, DSH `477b4f42`, Codex `25270df2`; full manifest `upstream-experiments/repositories.json`.
- Model output: one structured text checkpoint in the inspected text-summary paths. ZCode asks for text tags; OpenCode and DSH request Markdown; Hermes iterative natural-language template; Codex local handoff text. No mandatory episodic/semantic output in these paths.
- Qualification: Hermes `_pre_compress_memory_context` has optional/configurable required memory-provider checkpoint coordination. Codex remote-v2 accepts one opaque compaction item; server internals are not available. Avoid blanket absence-of-memory or all-plain-text claims.
- Hermes canonical runner: 42 tests passed in four focused files; isolated Python 3.11.15 environment. Initial missing-ruamel collection failure followed by successful dependency-corrected run; both retained.
- TypeScript source-declaration probes: 19 passed, including fresh/iterative prompt construction and valid/invalid synthetic model output. Actual DSH assembler used; no live model. Boundaries documented in `upstream-experiments/README.md` and script.
- Codex static inspection only; Rust/Cargo unavailable. Full upstream app/integration suites and live-model quality benchmarks not run.
- `upstream-experiments/` is a reproducibility/evidence supplement owned by Solution Designer, scope SR-002 investigation only, no approval applicability.
- Intended behavior remains unchanged from SR-001 Draft; no design or migration chosen. The next action for this user request is to return the research, not initiate implementation.


## SR-003 — Prompt synthesis and current-runtime feasibility (2026-09-26)

### Trigger, approval and real-scenario boundary

User explicitly agreed with the single-call recommendation and asked to inspect the upstream prompts, construct an AutoByteus prompt and start design under the design principles. Subsequent messages asked to respect real user scenarios and clarified that the earlier misunderstanding was resolved: “sorry i misunderstood you. please continue”. Record the core approval; do not continue claiming the user only requested research.

The reference to accepting text means runtime acceptance of LLM-generated output, not a human submitting a summary. No such UI/API workflow is introduced. Automatic compaction, repeated compaction, normal resume, existing inspection and supported failure/retry are the scenario basis. Four synthetic probes reproduce transformations within those paths, not new product requirements. No general manual-corruption or distributed crash-recovery scope is inferred.

A preservation question was already sent asynchronously: keep currently resumable runs and historical records readable, or make a clean break. No answer has been received. Conservative preservation is recommended; deletion is not authorized. Requirements now separate the explicitly approved core from this remaining scope decision rather than treating all approval as absent.

### Workspace and reproducibility

- Read canonical requirements/history/investigation and bundled solution-designer standards before continued authoring. Reused the isolated task worktree; shared integration checkout not edited.
- `git fetch origin personal` succeeded, then `git merge --ff-only origin/personal` moved the clean tracked branch to `046279298f53fb98d7688ee9dc2b2ba0fa827685`. Refresh output was captured at `/tmp/compaction-design-base-refresh.log`; task documents remain untracked in the task worktree. No feature source edits.
- Core compaction source is unchanged from the earlier analyzed baseline; server/web memory surfaces had evolved, so server readers were rechecked at the refreshed revision.
- All five previously pinned clones retained and their relevant prompt files reread. No new upstream branch-tip claim. Exact source links and adaptation rationale are in `compaction-prompt-proposal.md`.
- Source searches include `rg` for `CompleteResponse`, termination/status fields, `sendMessages`, current-compaction-output callers, snapshot/provenance and archival methods. A guessed-path lookup for former event handlers/resume service failed; `rg --files` resolved the actual current loop and restore paths listed below. No failed lookup was used as evidence of absence.

### Source observations (paths relative to task worktree)

| Evidence | Observation / consequence | Confidence / limit |
| --- | --- | --- |
| `autobyteus-ts/src/agent/loop/llm-phase-compaction.ts`, `agent/loop/llm-phase.ts`, `agent/llm-request-assembler.ts`; `memory/compaction/pending-compaction-executor.ts` | Threshold observation and next-request preparation invoke existing pending compaction under its admission gate; started/completed/failed reporting already exists. This is an internal continuation flow. | Actual source; no live run executed. |
| `memory/compaction/working-context-message-unit-builder.ts`, `working-context-message-window-planner.ts`, `compaction-conversation-history-renderer.ts`; `memory/policies/compaction-policy.ts` | Structured provenance distinguishes previous compacted region from recent natural user content. Current max-item default is 2,000 characters and clips user/assistant/old checkpoint text as well as tool evidence. | Probes reproduce middle-constraint loss; not a production incidence estimate. |
| `memory/working-context-snapshot-serializer.ts`, `working-context-finalizer.ts`, `working-context-provenance.ts` | v5 snapshot root contains schema_version, agent_id, messages. A composed-user constituent stores compacted text by range; model-generated category IDs are not necessary to serialize that text. Arbitrary message metadata is retained. | Serializer/finalizer/unit-builder probes pass; does not prove full restore. |
| `memory/restore/working-context-snapshot-bootstrapper.ts`; `agent/bootstrap-steps/working-context-snapshot-restore-step.ts`; `memory/projection/current-compaction-output-loader.ts` | Normal restore validates strict v5 shape then queries categorized lineage output to require exactly one compacted region iff a head exists. This dependency must change for category-free compaction. | Clear current runtime dependency; transition design remains open. |
| `memory/compaction/accepted-compaction-committer.ts`; `memory/store/working-context-snapshot-store.ts`; `memory/memory-manager-working-context-controller.ts` | Current commit archives selected raw traces, writes category rows, appends lineage, installs in-memory context, then saves snapshot. Snapshot file write itself is temp+rename; entire multi-store operation is not atomic. | Do not claim existing whole-operation rollback or propose a general journal without a supported need. |
| `memory/store/run-memory-file-store.ts:archiveCompactedRawTraces`, `memory/store/raw-trace-archive-manager.ts` | Exact archive requires selected IDs still active; repeat call after a successful archive fails. Existing archive boundary/manifest helpers can recognize completed segments. | Candidate snapshot/trace ordering must account for this; no new mechanism chosen. |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts` | Inspector reads snapshot.messages and category files independently; it does not reconstruct current context from lineage. | Historical reads need not imply continued category writes. External consumers were not audited. |
| `autobyteus-ts/src/llm/base.ts`, `llm/utils/response-types.ts`, seven direct adapter files under `llm/api/` | A direct call is already available. CompleteResponse has content/reasoning/usage/media/native-turn but no completion reason; raw provider status is discarded by current adapters. | No new provider status mapping implemented or certified. |
| `llm/api/autobyteus-llm.ts` | Native direct adapter requires a nonempty logicalConversationId and owns cleanup of used conversation IDs. Nonstream output selects response/content/message and usage, without terminal status. | External native model-server terminal contract remains unknown; do not promise a universal empty-kwargs direct call. |
| `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts`, `memory-compactor-agent-launch-resolver.ts`, `compaction-run-output-collector.ts`; backend factory | Existing path creates a helper AgentRun, resolves its definition/model, collects output, and terminates it. Recursion prevention is helper-specific. | Remove run lifecycle rather than imitate it in a direct-call service. Model availability/secret resolution remains owned by existing LLM construction. |
| `autobyteus-ts/src/agent/token-budget.ts`, `memory/compaction/compaction-planning-budget.ts`, output validator | Existing code computes input/output reservation and post-compaction target and validates composed context/tool safety. | Reuse ownership; a text prompt target alone is not capacity enforcement. |

Paths beginning `memory/` or `llm/` in this table are under `autobyteus-ts/src/`.

### Executed additional probes

Copied the actual-source script, log and result manifest into `design-investigation-probes/` for downstream reproducibility. Four passes: Markdown snapshot round-trip; category-rendered text snapshot round-trip; reproduction of middle-constraint clipping in old checkpoint; reproduction in long user text. Details, source hashes, Node/TypeScript versions and limitations are in the supplement. These are not implementation checks or live-model quality tests. The two loss reproductions indicate a current shortcoming, not success of a fix. Earlier 42 Hermes tests and 19 TypeScript probes remain distinct results; do not count reruns as additional cases.

No paid/live provider generation, full application test suite, production run-content sampling, or representative persisted-volume census occurred. Data continuity remains a requirements decision; any eventual no-migration claim needs evidence beyond serializer feasibility.

### Prompt synthesis and feasibility conclusions

- Prompt-v1 intentionally has six prose headings, not six machine-validated memory categories. It tells the model to update older context, preserve important constraints/corrections, distinguish plans/results/approval, and not answer or act on the supplied history.
- Do not copy ZCode's requested analysis block/full user-message inventory or combine all upstream headings. Do not claim hosted Codex is fully inspected or Hermes entirely independent of memory hooks.
- One existing snapshot containing a checkpoint is a stronger simplification candidate than adding another summary-file authority. Current restore-lineage and commit ordering prevent declaring that transition finished.
- Stop-reason handling belongs at the provider response boundary; it is about a real bounded model output, not a human text-validation workflow. Unknown native-provider semantics are a technical gap, not grounds to silently narrow provider support.
- Prompt quality remains a hypothesis until first/repeated-compaction outputs are evaluated. A concise fixture rubric is supplied; no new evaluation platform is proposed.

### Current decision state and supplement inventory

`DEC-001` resolved: core one-call/one-summary target approved. `DEC-002` pending: recommended preserve supported resume and historical read access; no destructive assumption. `DEC-003` resolved for this package's target: latest request supersedes the prior three-output design premise, without editing or canceling that external worktree. No final architecture risk/size classification before full design.

| Artifact | Owner / purpose | Scope / status | Approval applicability |
| --- | --- | --- | --- |
| `analysis-report.md` | Solution Designer; historical initial assessment | SR-001/SR-002 evidence | Explanatory, not current requirements authority |
| `upstream-compaction-research.md` | Solution Designer; five pinned code comparisons | SR-002 complete | Evidence only |
| `upstream-experiments/` | Solution Designer; scripts/pins/logs | SR-002 reproducibility | Evidence only |
| `compaction-prompt-proposal.md` | Solution Designer; original prompt-v1, rationale, real-scenario evaluation rubric and lean feasibility | SR-003 proposed | Prompt continuation semantics accompany the requirements baseline; not an approved design spec |
| `design-investigation-probes/` | Solution Designer; current-source feasibility and clipping reproducers | SR-003, four passes | Evidence only, no model-quality claim |
| `solution-revision-record.md` | Solution Designer; cumulative status and approval index | Through SR-003 | Index, not an additional behavioral authority |
| `solution-progress-result.md` | Solution Designer; complete current round/route context | SR-003 approval hold | Handoff/result context, not implementation authorization |

Product artifacts and independent architecture/code-review artifacts: `N/A — not applicable` at this stage.


## SR-004 — Preserve the original prompt's useful guidance

- Trigger: user asked whether the original compactor prompt was already good and primarily needed bullet/output changes from JSON to Markdown; explicitly scoped the question to the prompt.
- Read current requirements, revision history, current prompt proposal and actual built-in source. Worktree/base unchanged (`046279298f53fb98d7688ee9dc2b2ba0fa827685`); no production source changes.
- Exact source: `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md:8–37`. This is the repository template, not a sample of a custom persisted agent definition. Lines 8–10 already state continuation and rolling-summary updates; line 12 has broad resume-relevant information; lines 14–16 contain good anti-noise guidance expressed as episode/fact counting; line 18 forbids invention; lines 20–37 require the categorized JSON object.
- `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` separately adds history separators and a JSON-specific correction message. `agent-compaction-summarizer.ts` parses/corrects output. Changing the model prompt alone will not remove runtime parser/store dependencies; user correctly scoped this discussion to prompt content.
- Assessment: original content guidance is strong as written; no live-model evidence establishes prompt-v1 rewrite as superior. Prefer retaining the original continuation, update, salience and factuality paragraphs. Replace episode/fact-count wording with concise non-overlapping bullets, replace JSON schema with Markdown headings, and retain only small task-boundary/budget clarifications. This is an engineering assessment, not a benchmark result.
- Current supplement: `compaction-prompt-proposal.md` now `SR-004/prompt-v2`, original-derived. Historical exact SR-003 proposal preserved at `history/compaction-prompt-proposal.sr003.md` (Solution Designer; historical rationale; not current behavior authority). Other inventory supplements remain relevant unchanged.
- Requirements/ACs/scenarios: unchanged. No additional approval is needed to answer this assessment or refine a proposed prompt. Full requirements preservation confirmation remains pending; do not turn a format question into approval of data policy.
- No tests executed this round: source/prompt comparison only; previous four probes and upstream counts not repeated or inflated. No provider call, implementation or Product/reviewer artifact edits.

## SR-005 — User confirms tuned-original preservation

User states the original prompt was carefully written and tuned and explicitly directs reusing it with small JSON/category-to-Markdown changes. This is user-provided provenance, not independent model-quality evidence. Prompt-v3 retains the original continuation, rolling-update, content-selection and factuality paragraphs verbatim; only episode/fact-output wording and final format change. Removed the extra task-boundary/token-target prose added in the previous proposal; runtime control responsibilities are unchanged. Historical prompt-v2 archived at `history/compaction-prompt-proposal.sr004.md` (Solution Designer; historical, non-authoritative). Requirements record approval of this adaptation boundary, not unrelated data policy. No production changes, tests or new research this round.

### SR-005 standalone reading file

User requested the proposed prompt in a file to read later. Extracted the current prompt verbatim into `proposed-compaction-prompt.md` and replaced the inline duplicate in `compaction-prompt-proposal.md` with a link. This is the canonical literal prompt; Solution Designer owns it, scope/status SR-005/prompt-v3, proposed wording under the already approved minimal-adaptation approach. No behavioral, approval, design or implementation change. Requirements supplement inventory and result link updated.


## SR-006 — Source-faithful prompt files for comparison

- User request: save the other platforms' compaction prompts in files so they can compare. Interpreted “problems” in the transcribed sentence as prompts, as explicitly specified in the following sentence.
- Reused all five pinned clones from SR-002; checked each HEAD against `upstream-experiments/repositories.json`. All five were clean at the source check. No need to move the research to a newer revision or change the proposal.
- Created `upstream-prompts/README.md` plus `hermes.md`, `opencode.md`, `zcode.md`, `dsh.md`, `codex.md`, and historical `autobyteus-original.md`. Each identifies sources/revisions, extracted layer/variant, and provenance. Preserved upstream root licenses and available notices.
- Hermes: called the actual imported `_build_summary_prompt` without running a constructor/provider. Rendered first/repeated, has_user_turn=True, default lean mode, illustrative summary-budget argument 4096, no optional focus/memory context. History/prior summary use visible placeholders; the clock helper is bound to `{{CURRENT_DATE}}`. Isolated HOME/HERMES_HOME and cleared inherited environment; no credentials or model call. Not an exhaustive collection of optional/no-user/legacy-mode variants.
- OpenCode: actual application instruction plus unchanged core buildPrompt declarations rendered with placeholder history for first/repeated requests. Kept the application/core layer distinction explicit.
- ZCode: actual default buildCompactPrompt(undefined), including preamble/reminder and requested analysis/summary tags. These are copied prompt instructions, not generated reasoning and not a recommendation to adopt those tags.
- DSH: actual evaluated array/join instruction and separate checkpoint preamble; final-user-message placement documented.
- Codex: verbatim public default local prompt and separate summary prefix; no claim to know the private remote prompt or every custom override.
- AutoByteus comparison: original built-in definition copied as a clearly labelled read-only source snapshot; current proposed prompt linked to its canonical file, not duplicated or changed.
- Reproduction: `upstream-prompts/extract-hermes.py`, `extract-prompts.cjs`, machine-readable Hermes output and `extraction-manifest.json`. Manifest records source/output SHA-256 hashes, exact pins, Node/TypeScript versions and extraction settings. Verified output hashes, fences and local per-project links. Successful extraction is not a summary-quality experiment or additional upstream test count.
- Inventory addition: `upstream-prompts/` (Solution Designer; SR-006 comparative evidence; no behavior approval applicability). Previous supplements remain relevant. No implementation source modifications, paid/provider generation, full integration test run or quality benchmark.
- Approval state unchanged: original-based Markdown direction confirmed; remaining data-continuity policy still unanswered. No architecture-complete classification, independent review or implementation handoff applies to this request.


## SR-007 — Add only important missing or implicit continuity guidance

- Trigger: user explicitly asks to take important upstream points ours may have missed and adapt ours. Latest direction permits focused substantive additions; do not keep treating SR-005's formatting-only boundary as immutable.
- Re-read canonical literal/rationale, requirements/history, and the saved source-faithful prompts from all five pinned projects. No upstream revision changes or new claims about hosted behavior.
- Gap analysis: original already covers continuation, previous-summary updating, information salience, concision and no invention. Five selected additions clarify unanswered requests/cancellations, older constraints not repeated, completed/planned/blocked state, exact continuation references and source-only summarization. OpenCode/Hermes/DSH provide the most direct evidence; ZCode reinforces alignment with the current request; Codex's concise checklist is already covered and adds no necessary rule.
- Scenario basis: ordinary questions/approval waits/corrections during work; repeated compaction where constraints are not restated; proposed versus executed validation; precise artifact references; internal summarizer sees a conversation rather than becoming its next answering agent. Existing SCN-001/003 and REQ-001/005/006 apply. User reopening resolved work remains allowed. No new manual-text-entry or threat-model scenario is introduced.
- Added one short five-bullet block to the canonical literal; preserved all earlier text and six headings. Previous literal archived at `history/proposed-compaction-prompt.sr005.md`; exact diff at `history/prompt-v3-to-v4.diff`.
- Supplement inventory: `prompt-refinement-notes.md` (Solution Designer; SR-007/prompt-v4 rationale, source mapping, included/excluded points and proposed example checks; supports review of the current behavior-defining prompt). Historical literal/diff are evidence of revision, not alternative current authorities.
- Verification: additive edit-integrity and unchanged-heading checks only. No actual summarization calls, live-model recall/quality evaluation, implementation tests or production source edits. Prompt quality remains to be evaluated, not assumed improved because more instructions were added.
- Approval: adaptation work explicitly requested; draft wording returned for review. Overall existing data-preservation decision still unanswered. No Architecture Design Complete or downstream-ready classification.

### SR-007 clarification: input separators versus output headings

User asked whether Markdown output is enclosed in separators. Rechecked `working-context-compaction-prompt-builder.ts`: START/END OF TARGET AGENT CONVERSATION HISTORY markers enclose the source history sent to the compactor, not its returned summary. Original built-in prompt asks for one bare JSON object; current proposed prompt asks for one bare Markdown summary under six headings, without a code fence or surrounding commentary. No outer output marker is proposed; a dedicated call returns the summary body. No prompt, requirement or design change; evidence-only clarification.


## SR-008 — Extraction guarantees versus summary completeness

- User feedback: a model may prepend commentary before Markdown and may produce too few entries; user recalls the earlier array structure encouraging fuller content. These are actual output-contract/quality concerns within ordinary SCN-001/003/005, not manual text submission.
- Re-read `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` and `compaction-result-normalizer.ts` at the unchanged recorded base. Current parser explicitly attempts full response, JSON fences and balanced object extraction, requires six arrays, permits one nonempty episode plus five empty arrays, and rejects multiple distinct valid objects. The normalizer cleans/deduplicates/filters, not semantic coverage. No claim that it enforces multiple entries per category.
- Correction to earlier explanation: “the whole returned text is the summary” was too strong as a reliability claim. Dedicated purpose and prompt instructions do not guarantee absence of surrounding prose.
- Prompt fidelity correction: original minimum-episode guidance was separate from source-dependent fact counts. Rewording it as minimum bullets changed its effect by minimizing every output item. Prompt-v5 instead asks for enough concrete bullets; existing non-repetition and no-invention guidance remains.
- Proposed response: one explicit output block, extract a single complete nonempty body, reject malformed/ambiguous candidates rather than guessing, and retain provider truncation/budget checks. Markers do not prove meaningful completeness. A single JSON summary envelope is discussed only as an unselected alternative; provider-wide strict structured-output support is not asserted.
- Inventory: `output-format-and-coverage.md` (Solution Designer; SR-008 proposed response/detail semantics and real-scenario verification examples; accompanies the current prompt for review), prior literal `history/proposed-compaction-prompt.sr007.md` and diff `history/prompt-v4-to-v5.diff`. The latter are historical evidence, not competing current prompts.
- Prompt remains draft; no production code, parser implementation, model quality evaluation or tests executed this round. Full requirements baseline is not Approved. Existing pending continuity decision remains separate; do not infer approval from the user asking how extraction works.


## SR-009 — Strategy support and clean-cut simplification

- Trigger: user asks for the solution design, identifies replacing the combined episodic/semantic message, preserving prefix/recent context and simplifying the agent path; asks whether another strategy is supported, then emphasizes simplification over adding machinery.
- Canonical requirements/history/result read; same isolated workspace/source base. Read web AGENTS.md before inspecting the settings surface. No application source edits.
- `autobyteus-ts/src/memory/compaction/default-working-context-compaction-strategy-registry.ts`: only production registration found is `structured-json`. Registry/register/list and resolver code support extensibility in principle. Source search across core/server/web did not find a second production registration; this is not an audit of external library consumers.
- `working-context-compaction-strategy.ts` construction/diagnostics embed child-runner and episode/semantic concepts. `working-context-compaction-proposal.ts` output is `NormalizedCompactionResult`; accepted output includes category records/lineage. `accepted-compaction-builder.ts` requires episodes, creates IDs/items and calls the category renderer. Therefore another strategy cannot simply return text and bypass the shared category path.
- `message-budget-strategy.ts` provides `EstimatedMessageBudgetStrategy`, consumed by the window planner: this is internal cost calculation, not a second full compaction algorithm. Do not remove budgeting merely because its type contains Strategy.
- Current call wiring: `autobyteus-ts/src/agent/loop/llm-phase.ts` constructs resolver/registry context and emits child-agent/episode/fact diagnostics; pending executor invokes the resolved strategy. Planner already separates system, compacted region, retained/protected suffix and selected trace IDs.
- Server settings/catalogue: `autobyteus-server-ts/src/config/working-context-compaction-strategy-setting.ts`, `src/services/server-settings-service.ts`, `src/api/graphql/types/working-context-compaction-strategy.ts`, GraphQL schema. Web: `components/settings/CompactionConfigCard.vue`, `stores/serverSettings.ts`, strategy-catalog store and server-settings queries. Strategy-selection removal has actual API/UI wiring; retain threshold/context/debug controls rather than deleting the card indiscriminately.
- Child execution: `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` creates/posts/subscribes/collects/terminates a separate run; launch resolver and output collector are specific to that mechanism. `backends/autobyteus/available-llm-construction.ts` already owns availability plus provider secret/Gemini resolution for direct model creation. Reuse that boundary, not raw provider clients or a renamed child-agent workflow.
- Proposal: replace one compaction path and simplify its shared output boundary; retain clear planner/summarizer/context-commit responsibilities instead of either dual algorithms or one oversized new class. Candidate removal map and scope distinctions in `simplification-design-direction.md`. That document is discussion/feasibility, not an authoritative completed design-spec.
- Persistence implications were not re-proven by this read: existing v5 stores text but restore/category-lineage and archive/commit ordering still need final design. Historical read access does not require continuing old generation. Data-policy approval remains pending; no migration-free claim.
- Inventory addition: `simplification-design-direction.md` (Solution Designer; SR-009 behavior-to-flow/refactor proposal; surfaced settings/strategy-removal boundary for review; not implementation-ready). All earlier prompt/evidence supplements remain relevant; prompt-v5 unchanged in this round.
- No live model, implementation test, integration validation or formal size/risk classification; no independent specialist-owned artifact edits. Next result is explain clean replacement and required retained safeguards to the user.


## SR-010 approval evidence — replacement, not another strategy

- Source: latest user message explicitly selects simplification/removal and says clearing mixed concepts will allow a future memory module to be developed separately.
- Interpretation/authority: the user approves the SR-009 replacement direction. Canonical intended behavior is recorded in requirements, not inferred from the source call graph. No approval of historical-data deletion or final technical transition is implied.
- Artifact-only round: reread current requirements, direction, result and revision history; confirmed isolated workspace status (only ticket artifacts untracked). Updated approval references and removal boundary; no fresh source findings, model generation, execution test, production change or quality claim.
- Remaining evidence gaps unchanged: provider completion metadata/lifecycle, exact model/configuration mapping, safe snapshot/trace commit and category-independent restore. Data-continuity decision remains pending.


### SR-010 clarification: resume risk is conditional, not demonstrated

Re-read `working-context-snapshot-bootstrapper.ts` and `current-compaction-output-loader.ts`. Restore deserializes the saved context, loads categorized output by lineage membership and checks summary-region/lineage-head agreement. A mismatch or removed backing rows can reject restore; changing future summary generation alone does not invalidate an intact existing snapshot. No post-refactor failure exists because no implementation has occurred. The earlier preservation question must not imply inherent incompatibility or a need to keep the old algorithm. A category-independent restore design still needs meaningful snapshot/protocol validation and tests. User asks for explanation, not permission for data loss; approval state unchanged.


## SR-011 — Saved context, categorized restore gate and raw trace contents

### Scope and observations

User asks why episodic/semantic data is read when a saved summary exists, and what the raw trace contains. Rechecked native AutoByteus runtime source at `046279298f53fb98d7688ee9dc2b2ba0fa827685`; this is not an assertion about every provider-native runtime. “Reopen” here means restoring the execution to continue work, not merely displaying the chat-history screen.

Persisted artifacts have distinct roles:
- `working_context_snapshot.json`: strict v5 envelope (`schema_version`, `agent_id`, `messages`). Serialized messages include roles, text, media, tool payloads and metadata/provenance. The combined summary is already stored as text in the marked compacted-memory region, possibly physically composed with adjacent user content; required context and retained messages are also present. It is the saved current working context, not the whole historical transcript.
- `episodic.jsonl`: generated episode records; `semantic.jsonl`: generated categorized fact records. These are derived outputs, not raw evidence.
- `compaction_lineage.jsonl`: records compaction identity/previous identity, exactly which episode/semantic IDs form its output, time and execution metadata. It is compaction bookkeeping, not another copy of the summary.
- `raw_traces_active.jsonl` and completed numbered raw-trace segments with archive manifest (SR-013 correction: current segments are run-root `raw_traces_000001.jsonl` files; the reader also supports historical locations): normalized chronological event evidence. Compaction archives selected older source records; removing them from the active set does not mean deleting the archived corpus.

### Actual restore path and limits

1. `WorkingContextSnapshotRestoreStep` invokes the bootstrapper when runtime restore options exist.
2. Bootstrapper reads strict v5 snapshot, validates envelope/run identity and deserializes messages.
3. `loadCurrentCompactionOutput()` reads the latest lineage head, finds exactly its listed episodic/semantic rows, and enforces ordered ID membership. File-store exact lookup rejects missing or duplicate referenced rows.
4. Bootstrapper only uses the returned bundle as a non-null boolean. It requires exactly one compacted-memory region when a lineage head exists, and no such region when absent. It does not re-render or regenerate saved summary text from those rows.
5. It installs the saved working context, checks/repairs tool protocol using active raw-trace facts, validates the resulting snapshot and persists it.

The category reads therefore enforce a structural invariant of the existing multi-artifact design; they are not necessary because text is unavailable. The inferred rationale is detecting orphaned/inconsistent compaction artifacts, not a documented author intention newly established by this inspection. Important limit: these checks do not compare the saved summary's text with a freshly rendered category bundle or prove semantic fidelity; they are existence/membership/region-count checks. Removing this dependency while keeping snapshot identity/schema/provenance and tool-protocol checks is consistent with the already selected simplification direction, but still needs complete design and tests.

### Raw-trace contents

Normal turn-scoped records have `id`, `ts`, `turn_id`, per-turn `seq`, `trace_type`, `content`, `source_event`, plus optional fields for the event:
- `user`: processed LLM-user-message text, image/audio/video URL values, and original non-media file references (`uri`, `file_type`, `file_name`). References are not an independent copy of the attached file bytes.
- `assistant`: response content; a separate `reasoning` record is stored when the provider response supplies reasoning text. No claim that providers always expose it.
- `tool_call`: tool name, call ID and arguments. Main `content` may be empty; payload is in typed tool fields.
- `tool_result`: result value, error/denial and IDs/arguments as applicable; not just a rendered chat string. Runtime interruption/recovery may also produce explicit terminal tool-result records.
- `operation_boundary`: native runtime interruption/cancellation note, written by the turn runner.
- The same raw JSONL stream also contains `system_instruction` records for captured supplied system instructions; these have their own smaller schema without turn ID/sequence. Repeated identical active system-instruction capture is deduplicated. Turn-specific readers intentionally filter these records out.

“Raw” means recorded event-level evidence rather than an LLM-generated memory summary. It does not mean a byte-for-byte record of every original UI input, hidden provider state or HTTP request/response. User text is already processed; provider-native replay metadata is not wholly represented by these generic raw fields. Do not claim exact request reconstruction from the raw corpus alone. Normal restore requires the snapshot rather than rebuilding all history from raw traces, although raw tool facts have an independent repair role.

### Sources and validation

- `autobyteus-ts/src/agent/bootstrap-steps/working-context-snapshot-restore-step.ts`: restoreOptions guard and call.
- `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts:35–90`: saved-text restore, category gate and active-trace tool repair.
- `autobyteus-ts/src/memory/projection/current-compaction-output-loader.ts:11–39`: exact referenced category load; no summary rendering.
- `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts:30–109`: snapshot representation and validation.
- `autobyteus-ts/src/memory/lineage/compaction-lineage-record.ts` and `compaction/accepted-compaction-committer.ts`: membership schema and current multi-store write ordering.
- `autobyteus-ts/src/memory/models/raw-trace-item.ts`; `raw-trace-ingestion.ts:13–158`: normal recorded fields and native event constructors.
- `autobyteus-ts/src/memory/store/run-memory-file-store.ts:167–213,274–295,348–395,455–470`: system capture, corpus/active distinction, archiving, exact category lookup.
- `autobyteus-ts/src/memory/models/system-instruction-trace.ts`; `agent/bootstrap-steps/system-prompt-processing-step.ts:29–41`: separate system trace schema and capture caller.
- `autobyteus-ts/src/agent/loop/agent-turn-runner.ts:126–155`; `memory/memory-manager-tool-protocol-safety.ts:37–103`: interruption records and tool repair evidence.
- Inspected, not executed: `autobyteus-ts/tests/unit/memory/working-context-snapshot-bootstrapper.test.ts` (direct restore, strict v5/no raw replay, absent-lineage rejection); `current-compaction-output-loader.test.ts` (exact category membership/no raw archive access). Two initial guessed source/test paths were absent; actual paths found through repository search.

No production edits, new experiments/test execution, live-model calls or user-data inspection this round. Working tree remains ticket-only untracked changes. No new user approval, final architecture or forward-ready classification.


## SR-012 — Requirements consolidation, no new implementation evidence

User asks whether the requirements are now clear. Re-read canonical requirements, current output-contract supplement, latest result and skill readiness standard. Consolidated previously discussed one-call/tagged-summary/clean-replacement behavior, preserved safety/resume/history and separate future-memory scope into one approval baseline. Added REQ-009/AC-011 for traceability of the existing tagged-output contract, not new user workflow. Prompt-v5 unchanged. Status Ready for Approval; prior core approvals retained, complete-baseline approval not fabricated. No fresh production source findings, tests, model calls or data inspection. Isolated working tree remains only untracked ticket artifacts. Technical design gaps retain their existing evidence/ownership; no final architecture or risk classification.


## SR-013 — Post-approval architecture investigation

Approval: user “Correct. approve” covers SR-012 requirements/ACs and prompt-v5/output supplement after the repeated-compaction clarification. No new intended behavior introduced below. Workspace remains isolated at `046279298f53fb98d7688ee9dc2b2ba0fa827685`; source unchanged.

### E13-1: direct generation and configuration

- Re-read core BaseLLM.sendMessages/cleanup, response-types, seven direct adapter families and request capacity. BaseLLM already accepts AbortSignal/turnId; logicalConversationId is an internal kwarg filtered from provider request bodies except the owning AutoByteus adapter. A fresh per-attempt LLM avoids sharing parent system prompt/extensions or remote conversation identity. Core completion response currently drops terminal reason; direct adapters have the raw data except AutoByteus RPA.
- Server createAvailableLlm owns model availability + LLMFactory + secret resolver + Gemini runtime resolver. Reuse this construction, not ad-hoc clients or secret lookup. Existing compactor defaultLaunchConfig supplies model/config overrides and otherwise parent-model fallback; no reason to keep a runtime/agent definition lookup in the new execution path.
- BuiltInAgentBootstrapper unconditionally copies templates, including null-defaultLaunchConfig memory-compactor config, during application preparation. Preserve a currently present override before that phase through a bounded one-time settings migration; do not carry a permanent legacy reader. AppConfig.setDurably already atomically persists a setting and only then updates runtime config. Ordinary set() can silently retain session-only values after write failure, so it is not appropriate for the migration completion marker.
- Startup integration is `application-platform/runtime/build-application-platform-runtime.ts` preparation hook before builtin bootstrapping and definition readiness. One compound non-secret setting suffices for modelIdentifier + llmConfig; its valid persisted presence is the migration completion marker. Existing `.env` file is authoritative; no second settings store.
- Exact source inventory/hash supplement: `design-investigation-probes/sr013-source-inventory.json`; matched references are an audit index, not blanket deletion permission. AgentConfig/factory, server backend construction, GraphQL/catalog/settings, frontend status types and tests reference old types. SDK wildcard exports expose deep paths: coordinated breaking replacement is required, not compatibility wrappers. No external SDK consumers audited; rollout/docs must identify removed APIs.

### E13-2: provider completion evidence and bounded inference

- Direct OpenAI-compatible response: choices[0].finish_reason. Mistral SDK uses choices[0].finishReason (installed declaration includes stop/length/model_length/tool_calls/error). Anthropic: stop_reason. Gemini: candidates[0].finishReason and promptFeedback. Ollama: done/done_reason. OpenAI Responses: status/incomplete_details and output item kinds. Map at each existing adapter, not a compaction-owned provider switch. Preserve unknown as unknown, never fabricate successful terminal status.
- Official primary references checked 2026-09-26: [OpenAI Chat completion](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [Claude stop reasons](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons), [Gemini GenerateContent](https://ai.google.dev/api/generate-content), [Mistral chat](https://docs.mistral.ai/api/endpoint/chat), [Ollama chat](https://docs.ollama.com/api/chat). OpenAI Responses web open returned an internal error; used installed official SDK response declarations and actual adapter source rather than claiming the page was read. Research excluded non-primary results.
- Additional read-only external repository: `/Users/normy/autobyteus_org/autobyteus_rpa_llm_workspace/autobyteus_rpa_llm_server`, HEAD `8c1051780b30dc6ece9464a5c234b476469d7ddd`, file hashes in inventory. Its `services/llm_service.py:52–100` and `api/schemas.py:37–44` expose content/reasoning/media, no completion reason, token usage explicitly null. Generation config is a generic extra-params map; no portable max-token enforcement is established for all RPA providers. This is local contract evidence, not verification of every deployed host. Keep AutoByteus support with unknown completion status, unique request conversation and cleanup; validate returned framing and accepted-context budget. No new RPA server/API change or claim of universal truncation detection.

### E13-3: safe snapshot and raw-evidence replacement

- Existing committer archives/prunes active records, writes category rows/lineage, installs context, then writes snapshot. It can fail after active mutation. Current context controller.replace similarly installs before persistence. Do not copy that ordering into the simplified flow.
- RawTraceArchiveManager.archiveRecords can persist a complete archive COPY independently of active pruning and reuses a completed boundary key. RunMemoryFileStore exposes readCompleteSegmentTraceIds and removal by boundary. Corpus reader deduplicates active/archive records by ID. Reuse those owners: stage complete archive copy without deleting active -> validate/prebuild candidate -> atomic snapshot write (commit point) -> no-I/O install/complete -> best-effort prune already archived IDs. Precommit failure leaves old snapshot and active records; postcommit pruning failure leaves duplicate evidence, not a failed summary.
- Do not add a compaction transaction journal, second summary file or category lineage replacement. A process stop before snapshot commit leaves the old active context; after commit it restores the new snapshot. Cleanup uses snapshot raw provenance and archived membership, never removes a trace still referenced by restored context. This needs target implementation fault/cancellation tests, not merely the probes.
- Physical-location correction to earlier explanation: current archiveManager.resolveNewSegmentPath writes numbered segments under run root and current manifest is raw_traces_manifest.json. Its existing reader also handles older manifest/locations; that unrelated already-existing archive compatibility is not removed in this task.

### E13-4: executed design probes and representative data

`node design-investigation-probes/sr013-persistence-probes.cjs <task-worktree> <shared-workspace>` transpiles unchanged selected TS modules and exercises actual serializer, file snapshot store, raw archive owner and raw store on isolated synthetic data. Six PASS results: old category-rendered v5 text directly readable without category files; current bootstrap rejects absent lineage; staging copies leaves active/snapshot intact; stop after staging retains baseline and deduplicated corpus; completed boundary reuse creates no second segment; replacement snapshot then pruning preserves retained trace and full corpus, with idempotent repeated prune. Temporary data removed.

Files: script, log and sr013-persistence-results.json (source hashes, Node v22.23.1, TypeScript 5.9.3). Representative fixture: 3 traces, 898-byte replacement snapshot, 266-byte archive. Not production volume sampling, actual crash/power-loss test, typecheck, provider integration or implemented target tests. Earlier four source probes and 42 Hermes/19 upstream TS probe results remain unchanged.

### E13-5: transition decisions and residuals

- Strict supported v5 snapshots: directly usable, no schema bump/rewrite/re-summary. Both old combined and new Markdown text are ordinary strings under the SAME existing provenance representation; normal reader validates schema/message identity/protocol without consulting category files or branching on text headings. Earlier serializer probes plus E13-4 show representative preservation; target end-to-end verification is still required.
- Historical episodic/semantic files: retained unchanged for existing independent Memory Inspector readers; no new writes from compaction. Historical lineage files left as unused data, no active dependency. Raw record/manifest schemas unchanged; current archive placement corrected above. Deployed history volume unknown, but no upgrade traversal/rewrite proportional to it is designed.
- Model settings: one bounded migration of at most one prior builtin config (source preserved), because its model/config value otherwise would be stranded when child-agent wiring is removed. No run-memory migration. Default template contains null override. New valid setting wins; absent setting imports model/config or explicit inherit default, then durably marks completion. Runtime kind/tools/skills/old compactor prompt do not govern the new direct invocation. Old invalid model remains explicit/unavailable until changed, never silently replaced.
- No live-model quality guarantee, exhaustive external-consumer census or universal provider completion visibility. These are disclosed validation/rollout risks, not grounds for another strategy or an autonomous fallback.

### Supplement inventory additions

| Path | Owner/purpose | Related IDs | Status |
| --- | --- | --- | --- |
| design-spec.md | Solution Designer, complete technical architecture against approved baseline | all BEH/REQ/AC | design completion recorded in result |
| design-investigation-probes/sr013-persistence-probes.cjs + .log + sr013-persistence-results.json | Solution Designer, six reproducible unchanged-source feasibility probes | REQ-003/004/007; AC-004/005/008/009 | executed PASS, not target implementation evidence |
| design-investigation-probes/sr013-source-inventory.json | Solution Designer, affected-reference/source hashes and external RPA contract pin | REQ-002/005/008 | evidence-only, not a deletion command |

### E13-6: final current-model and shared-contract audit

- `autobyteus-ts/src/llm/models.ts:185` exposes `modelIdentifier`; `agent/loop/llm-phase.ts` owns the current `llmInstance` per invocation. Direct factory inheritance must receive that current identifier per attempt, not capture it at run creation. Explicit compactor selection still wins; settings are resolved once at attempt start. This tightens technical realization of approved model behavior, not scope.
- Repository-wide search extends the initial 59-file core/server/web reference scan: `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts:53–78` has a strict COMPACTION_STATUS schema with required nullable obsolete child/fact fields. Update its tests and team/collaboration/web adapters in the same change. Shared-package build is part of coordinated validation/release. `test-support/live-e2e/live-e2e-harness.ts:700–990` contains child-compactor configuration and result assertions; retain the realistic retention fixture but rework those assertions for direct compaction. These tests were read, not run.
- Distinguish live execution from historical readers: raw-trace-to-historical-replay-events.ts:133, event-monitor-active-trace-page-projection.ts:135, web Event Monitor mapping and CompactionActivityItem currently preserve/display old semantic fact counts. Do not blanket-remove these historical read/display fields under a grep cleanup. Keep the existing historical boundary without a new writer or legacy algorithm. The design explicitly separates removed current live fields from preserved historical view-only fields.
- Final audit file hashes are under `finalAuditFiles` in sr013-source-inventory.json. No production edits or additional runtime tests.

## SR-014 — CRR-004 recovery investigation (API-F005 / API-F004)

Incoming code-review-report.md and crr-004 evidence read before work. Cumulative ARCH-REV-001 Pass, IR-001/002, CRR-001→004 and API-REV-001/002 reports/history/source/retained observations reviewed. Canonical requirements and exact prompt remain approved SR-012/prompt-v5; SR-013 design unchanged. Large/High retained. No new user intent inferred from the specialist finding. Delivery/acceptance is on hold.

### E14-1: confirmed observation versus causal uncertainty

API-F005 retained repeated source contains the actual first summary (no APPROVAL-73), then the user request to add that checkpoint, with no subsequent assistant/tool work. The output nevertheless claims checkpoint added and plan updated under Completed work. This is a fidelity failure under REQ-006/AC-002/007; valid markers and complete/stop do not waive it. The isolated live fixture did not execute planner/commit, so this exact body's installation or unsafe parent action is not established. Earlier sample correctly retains pending checkpoint; both outcomes remain evidence. No failure-rate, model-incapability or prompt-causation claim.

The approved prompt expressly distinguishes planned/completed work and source material from instructions to execute. One possible interpretation error is confusing a corrected requirement in the summary with an already edited target plan. This is a hypothesis, not an identified prompt defect: model sampling and provider-owned settings remain competing explanations. No semantic runtime validator/repair generation/default change/support exclusion is justified by current evidence.

### E14-2: executed current configuration reconstruction

Actual source inspected: core llm/lmstudio-provider.ts, utils/llm-config.ts, api/openai-compatible-request-builder.ts, api/openai-compatible-llm.ts; server compaction-llm-factory.ts and available-llm-construction.ts; direct summarizer/prompt builder; API quality fixture. Two no-provider probes PASS under solution-recovery-evidence/sr014 (script/config/log/results). Discovery fetch is stubbed and settings/availability isolated; no remote generation, secrets or private histories.

Current LMStudio discovery constructs default LLMConfig temperature0.7/maxTokensnull. configureCompactionLlm sets cap8192 and exact prompt, preserving0.7. Actual request builder emits model/messages/temperature0.7/max_completion_tokens8192; it does not explicitly send top_p, seed, tools, response_format or stop. The parent full-flow0/1024 config is not inherited by the summarizer. An explicit test-owned temperature0 override preserves the8192 cap. This narrows app-controlled configuration uncertainty but is NOT a historical failed-run wire capture or remote effective-settings reconstruction, and it does not show0.7 caused the error or0 would remedy it. Quantization/backend/template/thinking/sampling defaults remain unobserved.

Freeze retained first summary and exact correction through current production builder: frozen-repeated-input.json includes exact content/hashes and3000-token target. Do not regenerate a prior summary when comparing configuration, which would change two variables. No live sample generated this round.

### E14-3: separate continuation evidence gap

API-F004 historical failed full-flow attempt lacks original final parent content/low-level exception. Current diagnostic output in live-e2e-harness occurs after postAndWait and before artifact read; real-e2e-provider-capabilities safeExternalOperation wraps nonallowlisted errors. These are bounded observation gaps, not proof of the failure cause. Missing historical data cannot be recreated by later success. Request sanitized on-all-exits capture before cleanup and one predeclared full-flow observation, with original behavior/criteria unchanged.

### Recovery decision and supplementary artifact ownership

No requirement gap or inadequate architecture is established. Keep intended behavior, exact prompt, production defaults/model support and prior valid mechanical evidence; keep API-F005/F004 open. Recovery remedy selection remains Unclear pending discriminating evidence. recovery-investigation-plan.md owns a bounded diagnostic request (four fixed-input direct samples A,B,B,A; current defaults versus existing explicit temperature0 in owned test settings; separate one full-flow observation). It is not deployment/default authorization, another compaction strategy or retry-until-green. API/E2E owns executable provider/acceptance evidence and any durable tests. Reapproval is required for any later proposed change to exact literal/default/intended support behavior; none proposed as the current fix.

New supplements: recovery-investigation-plan.md (Solution Designer, REQ-006/AC-002/007 investigation-only), solution-recovery-evidence/sr014/README.md + source-and-input-audit.json + two no-provider probes/log + configuration-reconstruction.json + frozen-repeated-input.json (evidence-only). Existing upstream prompt/licenses/history and design/architecture/implementation/review/API evidence remain relevant, not duplicated. Product N/A—not requested; Delivery N/A—not reached.

## SR-015 — Bounded diagnostic return and candidate prompt amendment

### E15-1: returned evidence, independent reconciliation and limits

Read api-e2e-evidence/sr014-diagnostics/README.md, semantic-adjudication.md, direct-comparison.json, full-comparison.json, final-audit.json and manifest before work; inspected actual direct diagnostic implementation and all four pristine D*.jsonl records. Offline reconciliation verifies exactly four distinct one-request invocations in A,B,B,A order, exact frozen source/prompt messages, cap8192/target3000 and all non-temperature serialized controls equal. Reported summary hashes and false-completion quotations match the retained bodies. Both B0 summaries are byte-identical, not proof of deterministic behavior. Reconciliation is under solution-recovery-evidence/sr015; no provider call, implementation re-review or acceptance rescore.

All four bodies assert the newly requested checkpoint was added: D01/D04 in Completed work, D02/D03 in Current state. Source only requests the action; no later performance evidence. Other source constraints, approvals, unrun verification, corrections/references and structure survived. Do not treat a manual semantic failure as Pass because diagnostic commands completed. Temperature0 did not remedy the failure in either observation; no global temperature/model/prompt causation, reliability rate or support exclusion follows. API-F005 remains Open under REQ-006/AC-002/007. No demonstrated production transport/parser omission or mutation.

### E15-2: separate full-flow evidence and setup deviation

One new full flow reports4turns/4tools/1summary,8parent+1compactor requests, current request controls and unchanged assertions. However its temporary Vitest config omitted normal Prisma/global setup, producing TOKEN_USAGE_CURRENT_SCHEMA_REQUIRED absent in the prior positive log. Treat as scoped positive evidence, not an environment-equivalent reproduction or SQL-persistence proof; do not assign that warning to historical API-F004. Original failed parent response/low-level exception remain missing, so API-F004 cause remains unresolved. All-exit large stdout record required five-fragment deterministic reconstruction; pristine independent full-wire.jsonl is a distinct evidence source. No independent reconstruction/SQL test executed by Solution Designer.

API owner reports instrumentation2files7Pass and durable owner regression3files26Pass; no blanket reproduction by Solution Designer. Nine cumulative API-owned durable paths now include safe-error helper and observation tests. Eventual proportional review remains required. Owner cleanup audit reports unique runtime/db/port/full-flow-root removed; shared LMStudio/user desktop preserved. No further calls authorized under exhausted SR-014 bounds.

### E15-3: recovery decision and approval boundary

Do not choose temperature0 as a demonstrated fix. Preserve original simple architecture, exact v5 baseline, model defaults/support and valid ACs. Propose one generic prompt bullet distinguishing a summary's update to current requirements from actual target-agent plan/file/action completion, applying across every heading. This addresses a plausible interpretation error, not a proven prompt-caused defect or guaranteed fix. Original prompt already forbids fabrication; no evidence supports a second call, runtime semantic checker or categorical memory fallback.

Separate compaction-prompt-v6-candidate.md (one64-word bullet) and full prompt-v5-to-v6-candidate.diff created; canonical proposed-compaction-prompt.md remains byte-unchanged. No fixture names/answers added. prompt-recovery-proposal.md is Ready for Approval as a behavior-supplement amendment to evaluate, not an active approved prompt or completed revised architecture. User explicit approval is required before adopting revised literal/design; intent REQ/AC baseline remains Approved. Proposed bounded evaluation includes original regression plus an independent pending/completed contrast; no run yet, no acceptance/perfect-reliability promise. API-F004 is separate and not claimed addressed by the prompt.

Supplements: API sr014-diagnostics packet (API-owned evidence); solution-recovery-evidence/sr015/README.md + evidence-reconciliation.json + diff (Solution Designer evidence); compaction-prompt-v6-candidate.md and prompt-recovery-proposal.md (Solution Designer, REQ-006/AC-002/007, Ready for Approval/unapproved). Existing all other evidence/supplements retain ownership and scope.


## SR-016 — repository refreshes and outstanding migration-policy finding

### E16-1: workspace/base preservation

At the user's explicit requests, the branch was refreshed first to f7b4f7f4 (2026-09-27), then 8900e786b (2026-09-28), and now `cb01dea2392e4bd7233855218e9a1a5b65ec3530` (2026-09-30). Earlier interrupted work persisted evidence but had not completed this SR index entry; no earlier completion/handoff is invented. Current HEAD `599cc4776a2da6c746be9719064fd1a7efdfa36e`; four task commits rebased across 131 new upstream commits this round. Eight conflict paths resolved preserving new Daily Assistant and background-task behavior while retaining the approved removal of child-compactor machinery. All 267 pending files restored byte-identically. Full evidence and conflict rationale: `solution-recovery-evidence/sr016/refresh-3/README.md`, manifest, range-diff, restoration verification and final audit. Earlier preserved backup branches/stashes remain; no push/release or live-profile access.

### E16-2: narrow rebase checks

Presentation package build/3 tests PASS; two focused server files/18 tests PASS after frozen-lockfile dependency sync. Initial missing ACP SDK collection error and the temporary conflict-script syntax error are retained with corrected reruns; neither is represented as product acceptance. Standard test-owned Prisma setup used; no provider/UI/full-suite/typecheck. Source-only smoke syntax check PASS, not executed built-server smoke. Install warned about missing app-devkit CLI build links. No full validation transfer from old reviewed SHAs to the new baseline.

### E16-3: migration question and previously investigated policy gap

The user's prior migration-guideline request and subsequent question were answered: this ticket introduces only an old compactor model/configuration → current server setting import. Supported v5 saved summaries/conversations are directly usable without a new history conversion; historical episodic/semantic/raw records are not rewritten by this ticket. Existing upstream migrations are not claimed absent. No import was executed on live user data.

Previous source/policy investigation (2026-09-27/28, before this refresh) identified an unresolved design mismatch: `src/startup/compaction-model-settings-migration.ts` is directly awaited by shared builtin preparation, is unregistered with app-data migrations, and propagates parse/read/write failures into pre-listener lifecycle failure. The then-current guideline requires registered legacy interpretation and rejects unnecessary app-wide lockout. This finding is independent from API-F005/F004. Original 14 settings-import unit tests pass but deliberately assert throwing behavior; they do not establish guideline compliance. Logs under SR-016 and refresh-2 retain those outcomes.

Ordinary settings delete is already rejected (`isDeletable: false`); the API test confirms that. Earlier concern that normal deletion might intentionally mean inherit was not established and is resolved by this source evidence. However runtime and UI currently interpret missing current setting as inherit; simply catching an import error could silently change the old model choice. Proposed recovery was a small registered copy with scoped compaction configuration failure and in-app save, not a global gate. The user has neither approved this recovery behavior nor approved dropping the old model selection. No remedy is implemented/architecture-complete. The current request authorizes only updating the worktree, not prompt changes, data loss, a migration redesign or new model experiments.

Supplement ownership: SR-016 evidence is Solution Designer repository/investigation evidence, not API acceptance or independent review. REQ-001–009/AC-001–011 remain approved; pending v6 and migration recovery remain separate. Product N/A—not requested; Delivery N/A—not reached.


## SR-017 — user rejects old preference import; default to current parent model

### E17-1: approval and consequence

User explicitly says the compactor should naturally use the parent model/provider, notes the single configured API-key case, rejects migrating the earlier selection, and asks to regard it as unset/default. This answers the previously presented trade-off: old compactor-agent custom model/config carry-forward is no longer required. Capture only that intended behavior; retain old files, current user overrides, conversation/history preservation and the separately unapproved candidate-v6. Optional ratio/current model/generation controls already exist in the approved scope; “maybe” does not add a new global temperature-control feature.

### E17-2: current code supports the simpler default

Read `S/agent-execution/compaction/compaction-llm-factory.ts`, its unit test, current tuple codec, web `CompactionModelSettings.vue` and absence parser, platform import and canonical design. Factory `current === undefined ? DEFAULT : parse(current)` selects `settings.modelIdentifier ?? parentModelIdentifier`; current parent identifier is supplied per attempt, not cached at launch. `createAvailableLlm` retains current availability/secret ownership. No second API key or parent conversation reuse is required. Unspecified generation parameters use selected-model defaults, not automatically parent tools/system/sampling state. Source unit test covers parent-a then parent-b, but no new test executed here.

The old converter is therefore not needed to initialize defaults. Remove its single platform-preparation call and source/import tests; do not replace it with a registered migration, default-write marker or status admission gate. Existing current-format override values remain current settings, not provenance-guessed imports; no wiping authorized. Current factory/UI absent behavior already provides the normal path.

### E17-3: refreshed policy and remaining audit

Reread current canonical migration guideline sections 1–4 and mandatory section-2 checklist on the refreshed base. It now explicitly prioritizes no migration, tolerant projections, exact writers and removal of strict version checks when touching formats. SR-017 settings no-import decision conforms to no needless transformation and removes its legacy startup dependency. The larger design still contains strict-v5 snapshot assumptions from an earlier guideline basis; record a focused reader/frozen-predecessor-dependency audit as remaining before claiming full revised architecture ready. Do not silently broaden supported data, change a frozen migration classifier, or introduce a history conversion as a workaround. That wider audit is not completed by this settings decision.

No production/durable-test/provider/profile changes; no further fetch/rebase or release. Requirements REQ-008/AC-010 amended, AC-012 added; core design settings/data-transition/DS-006/removal/file/validation sections updated, not merely the revision log. Previous requirement/design snapshots saved under history. Overall solution recovery remains open (API-F005/F004, candidate-v6, latest format-policy alignment and new-base review). No new Product request.


### E17-4: current settings clarification (2026-09-30)

User reconfirms no legacy import and asks which settings are actually available/necessary. Reread `autobyteus-web/components/settings/CompactionConfigCard.vue`, `CompactionModelSettings.vue`, server compaction factory and `autobyteus-ts/src/agent/token-budget.ts` on HEAD599cc477. Current panel exposes model selection (inherit default), model-schema generation fields, trigger percentage, effective context token override and detailed logs. No strategy selector. Temperature is schema-dependent, not a universal independent field. Absent current model setting resolves to the current parent; a saved explicit model overrides it. Ordinary current settings persist, so “start from defaults” does not mean resetting on every restart.

Trigger ratio controls when to compact, not summary compression size: threshold=floor(ratio*usable input budget). Panel fallback displays80%; runtime precedence remains run config, runtime setting, model default, policy fallback. No mandatory settings interaction is needed. Recommendation only: ratio is the main ordinary tuning control; retain optional model selection and treat generation/context/debug as advanced concerns. No UI rearrangement/removal or additional approval inferred. No source/test/provider changes. SR-017 no-import implementation and all existing recovery holds remain pending.


### E17-5: user-provided audience rationale

User describes compaction configuration as primarily useful to platform experimenters and not something ordinary users should need to understand. This is a stated product expectation, not usage telemetry. It supports zero mandatory setup and optional tuning under unchanged SR-017, with no legacy preference import. No new advanced-panel redesign or removal of current controls approved.


## SR-018 — requirements reaffirmed; completed revised architecture for re-review

### E18-1: approval, latest base and preservation

User says requirements/design are clear and requests relevant updates plus extra review. This reconfirms SR-017 no-import/default-parent behavior; v6 wording has not been approved and remains excluded. Investigated on isolated task worktree. `git fetch origin personal` resolved newer origin/personal8caa610ff438c288d9aca9f2efe2c33924fbf517,17 commits beyond priorcb01. Rebased four existing task commits; HEAD9f3b7984a0bbb4a1b09ea249958c64f635c4cd2e. Backup branch `codex/backup-compaction-before-sr018-20260930t104013z`, retained/applied-not-dropped stash86fa5f5445364220cb5c4e3b55fa5040a329f6ea and full pending-file tar/patches under `/tmp/autobyteus-compaction-sr018-20260930T104013Z` preserve prior state.

286 pending paths restored:284 byte-identical; two API-owned files merged only upstream removal of `skillAccessMode` (one import and two option fields in harness; one expected null field in unit test). Exact before/after diffs retained. Eight rebase conflicts: seven modify/delete retired child-compactor source/tests retained as deletions, one builtin-registry conflict removed only Memory Compactor while retaining upstream Skill Improver/Daily Assistant and new registry shape. No algorithm/prompt/failure fix smuggled into rebase. No unmerged entries, upstream ancestry and `git diff --check` passed. No push, integration merge, new implementation commit, release or live profile access. Rebased commits have new hashes, not new solution implementation.

### E18-2: current snapshot reader and fixed migration dependency

Read/hash `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts`, bootstrapper, working-context controller, run store, provenance/finalizer/validator, server native-v5 migration, core native-v5 converter and types, external-runtime snapshot cleanup, runner and frozen released-run-package shapes. Current serializer validates exact root keys and numeric5; bootstrap repeats that version gate. Decoder projects message fields but exposes version metadata; controller supplies version. Memory Inspector reads messages independent of root version. Current model-settings server codec rejects unknown tuple-root fields, while web parser projects known fields.

Native converter explicitly recognizes schemas1/3/4/5, source-backed meanings and known omissions; it imports current serializer for fixed-target generation/validation. Server migration imports same serializer for writing and strict already-current equivalence. Missing snapshots/nonempty lineage are preserved skips. Identity mismatch fails without writing. Historical conversion removes its known obsolete category files after its existing target write; those released semantics are not a new ticket deletion policy. External-runtime migration preserves native/unclassified snapshots. Runner skips terminal SUCCEEDED/SUCCEEDED_WITH_WARNINGS but can revisit an eligible failed definition on restart. Therefore a runtime codec change must first isolate frozen released shapes and protect new versionless current snapshots from historical conversion. Do not make new work depend on old history success to avoid that interaction.

### E18-3: eight unchanged-source characterization probes

`node tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr018/reader-investigation.cjs "$PWD" "$PWD" "$PWD/tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr018/reader-investigation.json"` ->8 checks PASS. Existing supported v5 text reads without category files; stripping only version or adding root extras currently rejects; wrong known-field type/missing provenance still fails; feeding a versionless payload to existing legacy converter yields empty context; settings codec rejects root extras; null/null defaults valid. Script uses transpiled unchanged production modules and records hashes. The fixture is a synthetic current-shape characterization, not an installed/released-data acceptance fixture; no claim of actual migration occurrence or data loss. No model/network/application bootstrap/private-data access.

Target design is one tolerant current root projection/exact versionless writer, plus a migration-owned frozen fixed-v5 codec and exact successor recognizer used only by the existing upgrade. This removes obsolete version gates without new conversion or historical decoding in runtime. Existing current data meanings/provenance/tool/identity remain mandatory. Implementation tests must use faithful pinned released fixtures and fixed upgrade dispositions, not only this current-generated characterization.

### E18-4: guideline and scope conclusion

Reread current `autobyteus-server-ts/docs/design/data_migration_guideline.md`, all ten checklist items and sections3/4/7/9/10. No legacy settings import, default-initialization write, new migration ID, history conversion campaign, global gate, journal or version registry. Existing upstream migration code still exists; pinning its contract and adding a preserve-already-current guard is a dependency correction, not a new transformation. Settings current-reader root projection likewise needs no rewrite. Exact guideline/source hashes in source-audit.json. Canonical design now maps DS-001–005 plus existing-upgrade DS-007; DS-006 remains retired. File/removal inventory, sequence and validation updated. Governing rules explain tolerating obsolete root fields; this is not permission to coerce missing facts or widen historical runtime support.

### E18-5: refreshed checks and honest unresolved gates

Ran five relevant server unit files with normal Vitest `--no-watch`:42PASS/2FAIL across5files (3passed,2failed). Builtin/bootstrap/backend and compaction-boundary checks pass; two API-owned harness/observation cases fail before intended execution with `ERR_INVALID_ARG_TYPE` at `path.resolve(undefined)`. Source shows `ContextFileOwnerResolver({locations,memoryDir})` now requires memoryDir, but test-support wrapper passes only locations. Record SR018-OBS-001; no source/test patch by Solution Designer. API owner must reconcile current exact owner/readiness composition and rerun; missing root is not retrospective proof of API-F004. Neither failure is relabeled a provider failure, and historical API confidence remains unchanged. Test-owned Prisma setup ran, no user database. Smoke-script syntax and diff checks pass; no built-server smoke/fullsuite/typecheck/desktop/provider run.

API-F005 fidelity failure and API-F004 unknown continuation cause remain open; SR-014 bounded calls exhausted. Candidate-v6 remains unapproved, excluded from active design. Review is requested on completed structural design, not a claim of accepted delivery or proven quality. Nine API-owned durable paths await later proportional review; no specialist report/evidence edited. Product N/A—not requested; Delivery N/A—not reached.


## SR-019 — successor recognition versus dispatch readiness

### E19-1: reviewer question and source correction

Architecture Reviewer, existing run architecture_reviewer_589564a0573e47b8b09f3e098800233f, points out that SR-018 promises envelope -> repair -> full validation on normal restore but says successor recognition requires fully valid complete tool shape. Read the referenced SR-018 handoff and canonical design/approval before acting. This is a genuine technical underspecification with Design Impact, not a requirement gap or a fabricated final reviewer verdict. “Fully valid” must not mean next-request-ready; supported ordinary interruption must retain current snapshot bytes.

Trace: MemoryManager.persistNormalizedToolIntents stores call traces then appendWorkingContextMessage -> controller.append/finalizer/persist. Finalizer validates composed-user ranges/summary count, not call-result completeness. ingestToolResults persists all accepted raw results before its per-result working-context appends. Current snapshot full validate invokes assertWorkingContextMessagesStructurallyValid -> assertCompleteToolProtocol, rejecting missing results. Bootstrap validates envelope/identity first, then existing active-raw protocol repair, then full validation/save. Therefore current writers legitimately produce snapshots that full validate rejects until requested resume repairs them.

### E19-2: actual writer cut-point characterization

No-provider probe uses unchanged actual MemoryManager, FileMemoryStore, snapshot store and bootstrapper in a unique owned temporary directory, synthetic summary and two inspect calls. Four cases:0 snapshot/0 raw results;1/1;2/2;0 snapshot/2 committed raw results using the supported appendToWorkingContext:false ingestion option. First three model ordinary per-message cut points; last represents the real raw-write-before-snapshot interval without process kill. Envelope accepts all; full validator accepts only2/2 before repair; all four normal restores finish fully valid with summary preserved. Four checks PASS; original three-case run also retained, not presented as separate reliability samples. All temporary files removed in finally. Script/JSON/log and loaded source hashes under solution-recovery-evidence/sr019. No target predicate implementation, actual startup/migration execution, live model or user-data experiment.

### E19-3: bounded correction and verification contract

Canonical design now explicitly names the migration-only pure preservation predicate, validates known root/message/provenance/individual tool shapes and expected run identity but does not require pair completion or run repair/reads. Recognized current snapshots are preserved wholly; requested normal resume remains the existing active-raw repair/full-validation owner. False classification is not authorization to feed unclassified versionless data to the legacy unsupported-schema-to-empty converter: preserve bytes and report existing scoped item failure. No new migration ID, transform, journal, runtime decoder, global gate, validator relaxation, or prompt change.

Durable target test locations and zero/partial/complete/raw-ahead plus negative predicate/disposition cases specified in design §Successor Preservation Predicate and Test Contract. Actual migration no-mutation/no-raw-read test and separate restore correctness test are both required; neither substitutes for the other. Classification Large/High unchanged. Same approved REQ-007/AC-008 preservation and no-import intent; no renewed user approval required for technical correction. Original API-F005/F004/SR018-OBS-001 and candidate-v6 exclusion remain; reviewer alone assigns formal finding/result.


### SR-019 post-review coordination: provider-test permission reported by API owner

Existing API owner reports user's permission for LM Studio/DeepSeek v4 flash and optional pnpm importer into private test vault from the user-specified source env. No source env/credentials inspected here. Exact approval reference and any separately declared bounded manifest remain API-owned. Existing CRR-005 structural validation continues first; missing memoryDir and fixture readiness remain prerequisites. No new provider calls reported, no rescore or remedy inferred, exhausted SR-014 not reopened. Candidate-v6 remains unapproved/excluded and API-F005/F004 open.

Read incoming API report/recovery plan and current downstream reports: ARCH-REV-002 Pass, IR-003 source ebaf3a78e / HEAD5cb7b049a, CRR-005 structural Pass9.40 with its confirmed existing API handoff. Record these scope-limited results without duplicate forwarding or source review. Full coordination note api-validation-coordination.sr019.md; original goals/approval/workspace and ownership remain. No source/test/profile/provider work by Solution Designer.


## SR-020 — user-directed validation disposition after CRR-006

- **E20-1 — evidence:** Read latest CRR-006 canonical report/README, API-REV-003 report, DeepSeek manual adjudication and current approval/design history. Positive DeepSeek first/repeated pair is scoped; prior Qwen response fidelity failures and unknown-cause continuation observation remain recorded.534 fresh structural passes/build/process evidence is attributed to API, not rerun here. SR018-OBS-001 resolved; no new implementation defect established.
- **E20-2 — user authority, not empirical proof:** User explicitly says to forget Qwen failure/no need to care; then reports not having its endpoint. Accept Qwen-specific API-F005 as a known non-blocking deviation and stop Qwen investigation. Current availability not checked; earlier generated response failures are not connection failures by retroactive assumption. DeepSeek success cannot prove Qwen success.
- **E20-3 — bounded recovery decision:** Requirements SR-020 records the explicit validation exception; exact v5/runtime/support/defaults unchanged. Candidate-v6 and proposed campaign parked, not approved. No new architecture/source change; existing ARCH-REV-002/IR-003/CRR-005 bases retained. API-F004 remains historical unexplained continuation evidence; any remaining product-level acceptance is assessed using DeepSeek, without further Qwen work or unbounded retries.
- **Artifact inventory:** acceptance-disposition.sr020.md is the full current decision, approval and existing-owner coordination context; solution-recovery-evidence/sr020 contains offline state/ownership audit. Previous owned docs in history/*.before-sr020.md. Code/API reports and failed samples remain owner-managed, not rewritten as Pass. Product/Delivery N/A. No provider/test/source/private-data operation this round.


## SR-021 — original strategy and retry-policy investigation

- **E21-1 / original code, not inference from naming:** Read original strategy interface, structured implementation, resolver, proposal, accepted builder and committer at046279298f53fb98d7688ee9dc2b2ba0fa827685. Interface/propose is real; construction requires child runner, result/diagnostics require categories/child metadata, generic executor recognizes child/repair failures, downstream builder/committer create category/lineage artifacts. Therefore direct substitution without adapting those contracts cannot remove categorized storage. Some refactoring is independently required by changed persistence intent; do not claim the whole original Strategy pattern was fictitious.
- **E21-2 / current code:** Direct summarizer configuration/executor depend on the concrete class, mandatory model/provider metadata remains. Planner/build/validation/commit already separate; the server composition root legitimately constructs the concrete implementation. Current validator trusts runtime-owned plan when checking retained/selected content; moving selection into a generic proposal would require genuinely independent selection checks, not self-comparison.
- **E21-3 / current failure/input flow:** API-owned6 offline production-class/in-memory-fetch probes read, not rerun. SDK default2 selected transport retries produces3 total503 requests;401 and invalid output get1. Shared executor has no universal loop; failure moves to awaiting_user_retry. Assembler runs compaction before appending its current message; input processor previously records raw trace. Distinct-user retry already exists in runtime domain, but raw trace retention is not proof the failed original message reaches the next parent request. LlmPhase error-final -> completed turn -> AgentIdleEvent yields IDLE; user requests visible recoverable failure instead. No new source-defect claim against old approval.
- **E21-4 / proposal and unanswered decisions:** recommend selected-history transformation seam, sole direct production implementation, stable planner/retry/lifecycle/validation/commit outside; provider details optional, cancellation/errors neutral, alternate test implementation proves substitutability. Three-total-request/error exceptions and original/new input policy need focused confirmation. User asked to analyze original/clear boundary; no unseen API or broadened future selection behavior approved. Two concise policy questions sent; no answer yet at persistence.
- Commands: pinned git show for original files; cat/sed/rg current source/reports. Exploratory unmatched glob/guessed type filename misses resolved to existing source paths, not runtime/test failures. Input/current pins and read hashes: solution-recovery-evidence/sr021/input-audit.json. No live provider, executable tests, credential/user-history access or production/test edits by designer.
- Supplement inventory: strategy-boundary-analysis.sr021.md (full analysis/options/proposed direction; REQ010/REQ004/005 and pending decisions; not approved design); solution-revision.sr021.md (full intake/result/context); API-owned api-retry-policy-request.md and reviewer-owned code-review-design-request.strategy-boundary.md are incoming request evidence; old artifacts/history preserved.

SR-021 evidence-only clarification: user asks the strategy input/output. Explained selected older history including optional prior summary -> one normalized replacement Markdown body, with budget/cancellation as constraints/controls, not selection/commit/state ownership. Full explanation in solution-revision.sr021.md; no new approval or technical design completion.

SR-021 prefix/budget clarification: current planner excludes old compacted-memory from retained candidates, so prior summary is already selected once. Corrected proposed input to one selectedHistory prefix, not duplicate previousSummary+prefix. Size budget is a runtime-derived output constraint, separate from evidence and provider hard output cap; full-context validation remains. Exact illustration/source references in solution-revision.sr021.md. No new behavior approval/source/provider activity.

SR-021 budget explanation: current direct summarizer sends the summary size target as prompt text, not directly as a provider hard output-limit option. Separate provider configuration and rebuilt-context budget validation remain. No new investigation or behavior change; source previously read this round.


## SR-022 — user-approved numeric prompt budget removal and evidence recheck

- **E22-1 upstream facts:** Re-read saved templates/index/extraction manifest; previous temp clones absent. Re-opened five pinned primary raw-source paths. Codex local/OpenCode/ZCode/DSH inspected prompts lack a numeric length instruction; Hermes dynamic prompt includes one. OpenCode separately caps request output at up to4096; DSH passes configured hard maxTokens. No universal “upstreams have no budgets” claim. URLs/limits in solution-recovery-evidence/sr022/README.md.
- **E22-2 retained outputs, not new calls:** Actual DeepSeek first/repeated body2473/2844characters, prepared user inputs1264/3341; full-flow input9167 -> body3559characters. Soft targets3000/3000/8192 respectively, hard cap8192. Provider output counters include reasoning; separately derived non-reasoning response584/678/1013 not exact Markdown body tokens. Sparse case expands; no blanket shorter-output guarantee. All had numeric guidance and do not isolate its effect. Full-flow historical assertion failure not retroactively passed. Exact derived measurements in historical-measurements.json.
- **E22-3 approval:** User explicitly removes prompt instruction while retaining provider hard cap. New approvedREQ011/AC016, no system-v5 literal edit. Removing DirectCompactionInput's prompt-budget data and request prefix belongs to later consolidated design/implementation. Internal planner reserves/context/input/output safety stay; not a new migration. Earlier size-option recommendation superseded at the contract boundary, not hidden in a footnote.
- **E22-4 bounded diagnostic:** Frozen actual synthetic F/R requests and candidates differ only by numeric prefix deletion; four total outbound generations maximum, fixedFwith/Fwithout/Rwithout/Rwith order, no first-summary regeneration, no SDK retry multiplication/Qwen/newv6. Existing API owner receives separately bounded plan under user's DeepSeek/private-test-vault permission; no provider call by Solution Designer. Only scoped size/fidelity evidence, not API acceptance. Pending retry/message-policy decisions remain independent.
- Supplements: summary-budget-removal-experiment.sr022.md (new bounded observation plan, not productionretry policy); solution-revision.sr022.md (full context/result); solution-recovery-evidence/sr022/{README.md,historical-measurements.json,frozen-requests.json}. Prior owned docs savedhistory/*.before-sr022.md; current reports/tests/source untouched. Browser primary-source reads not a new model experiment.

### SR-022 returned diagnostic (same round; no new behavior approval)

- **E22-5 — receipt and bounded checks:** Read `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/sr022-budget-diagnostics/README.md`, semantic-adjudication.md, comparison.json, final-audit.json and all four unchanged bodies against the two full frozen inputs. Offline exact-message/prefix-only checks, arm hashes, code-point counts and usage arithmetic agree; all nine API durable hashes match, HEAD5cb7b049 and production diff empty. Stored in solution-recovery-evidence/sr022/diagnostic-incorporation-audit.json. Source/core reports were not edited; no executable test or provider call by designer. Requirements metadata's stale pre-IR003 HEAD corrected to the observed current HEAD, not a branch update.
- **E22-6 — observed outputs:** API reports exactly four requests in fixed order, HTTP200/complete/stop/tag contract accepted, same DeepSeek0.7/hard8192/v5. F with/without body code points3869/3410; R with/without2875/2766. Manual full-source assessment: both without-target samples and R-withTarget usable; F-withTarget SR022-Q01 invents a verbatim-all-raw-results rule and all-future-file read-only/anchor policy. It keeps immediate8anchors/pendingB; not fabricated completion or an observed runtime failure. Corroborated by reading here, not a new general quality score. Q01 remains a diagnostic failure under existing REQ006/AC007; no waiver/fix inferred.
- **E22-7 — limits/setup:** One sample per arm; no causal/reliability/universal compression or cost/latency conclusion. F without target uses2508 total/1532reason/976derivednonreason versus1396/435/961 with, despite shorter characters. Derived counters include tags, not exact Markdown tokenizer; raw recorder usesUTF16, comparison adds code points. Replay bypasses builder/planner/commit/parent. API's10offline guards precede generation; initial temporary import collection failure produced0calls and is preserved; offline import correction then fresh normalsetup gave sole campaign. API's ownedcleanup audit retained, not rerun here.
- **E22-8 — disposition:** Already-approved numeric-prefix/contract-budget removal stands, supported on these sampled histories; keep hardcap and runtime safety, v5 byte-identical. No fresh generation budget, Qwen, v6, repair or implementation. Q01 preserved for subsequent applicable validation/review, not proof of cause/remedy or new accepted deviation. API005 still interrupted and API004Fail90.7 lastcomplete; SR021 policy decisions still pending, design Needs Revision. Full current result solution-revision.sr022.md; owned pre-incorporation snapshots history/*.before-sr022-diagnostic-result.md.

- **E22-9 — practical recommendation clarification:** User asks safer approach, not universal proof. Re-read pinned DSH/ZCode source: neither inspected prompt specifies numeric token length; DSH separately passes hard maxTokens and rejects truncation. Recommend approved no-target prompt plus existing provider/runtime enforcement, not another experiment/reliability gate. Full explanation/source applicability in solution-revision.sr022.md. Intent and production unchanged.

- **E22-10 — assumption provenance:** User explicitly directs recording natural substantial LLM summary compression as an operating assumption for long histories, grounded in their extensive experience, rather than external-platform precedent. Recorded ASM-022-01 in requirements/current design rationale; illustrative input/output numbers are not exact guarantees or acceptance bounds. Earlier upstream/diagnostic evidence preserved as history. No new empirical claim, test or source change; REQ011/AC016 and retained cap/runtime safety unchanged.


## SR-023 — Documentation assumption and current-rationale cleanup

- **E23-1 / user direction:** user requests a longer operating assumption and removal of references to other solutions from ticket documentation. This is rationale/documentation scope, not changed behavior or an instruction to rewrite failed experiment/review evidence.
- **E23-2 / authored result:** expanded identical ASM-022-01 in requirements/design, describing ordinary long-history compression, information salience, prior tool excerpting, user practical experience, no numeric quota/strategy budget, repeated-summary replacement and separate hard-cap/completion/fit checks. Removed comparison sections/citations from current owned rationale; current progress is concise, with full old text preserved in history.
- **E23-3 / preservation:** exact prior edited documents captured before changes; old revision entries, research provenance/licenses, raw experiments and specialist records preserved. No new browsing, provider/sample/test execution, source change or migration. Only documentation/hash checks; no new approval/review score or fixed fidelity claim. Audit and exact changed-file scope: solution-recovery-evidence/sr023/documentation-audit.json.
- **Status:** REQ011/AC016 intent unchanged, overall SR021 Draft/Design Needs Revision; no current design/implementation handoff. Full context and next action: solution-documentation-cleanup.sr023.md. Previously recorded API/exception/remaining verification gates remain.

- **E23-4 / current text boundary:** re-read PendingCompactionExecutor, DirectLlmCompactionSummarizer, WorkingContextCompactionPromptBuilder, CompactionConversationHistoryRenderer and WorkingContextMessageUnit. Current call accepts typed units and renders inside direct implementation; output contains normalized summary plus execution metadata. User asks text-in/text-out; recommended candidate seam moves shared rendering before strategy while preserving model-specific prompt/parsing inside. Corrected proposal ownership table, not production. No extra previous summary/size target or new policy approval.


## SR-024 — CompressionStrategy content abstraction confirmed

- E24-1 user authority: after agreeing with text input/output and caller preparation, user asks for a compression strategy accepting content to compress and returning compressed content, not a prefix-specific field. Confirms REQ010/DEC02101's narrow content transformation and terminology; not approval of unsettled retry/message behavior.
- E24-2 evidence distinction: previous read shows production accepts WorkingContextMessageUnit arrays and renders within the direct implementation. That remains unchanged. Proposed caller-prepared content string boundary removes those types from the replaceable contract; direct provider instruction/parsing stays implementation-owned.
- No new source/provider/test activity. Requirements/current status/proposed boundary updated; detailed full result solution-revision.sr024.md. Prior docs snapshotted in history/*before-sr024.md. No external-product comparisons introduced.
