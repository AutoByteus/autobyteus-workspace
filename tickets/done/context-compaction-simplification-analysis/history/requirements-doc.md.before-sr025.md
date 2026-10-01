# Context-compaction simplification — requirements

## Document status

- Package: `context-compaction-simplification-analysis`; owner: Solution Designer.
- Date / current revision: 2026-09-30 / `SR-024` (content-to-content compression boundary confirmed; SR-022 numeric-target removal approved; SR-021 retry/error/message details remain Draft); approved behavior basis `SR-012` plus the explicit SR-017 no-legacy-settings-import decision. Exact prompt-v5 remains approved; candidate-v6 remains unapproved and is now parked. SR-020 explicitly accepts the recorded Qwen fidelity failure as non-blocking for this ticket and selects DeepSeek for further provider validation.
- Status: **Draft — SR-021 retry amendment; explicit direction captured, error/message details pending confirmation; content-to-content boundary confirmed in SR-024.** Prior SR-012 + SR-017 production baseline and SR-020 Qwen exception remain approved for their recorded scope. The old one-logical-attempt policy is not approval of the newly requested three-attempt cycle. Affected architecture needs revision; no implementation-ready package until the consolidated intended behavior is approved.
- Core approval reference: user, “i agree as well. inspect those projects what prompt they used, and learn from them and construct a good prompt for us as well, and then start a design following the design principles … lets go”. Subsequent “respect real user scenarios please” and “sorry i misunderstood you. please continue” confirm proceeding, not a new manual-text workflow.
- Approved core: clean replacement, not an additional selectable legacy/current strategy; one dedicated LLM summarization call rather than a child-agent loop; one continuation summary, separate from episodic/semantic memory. Markdown output and retaining the tuned original are explicitly confirmed. The latest SR-007 request also authorizes targeted additions for important continuation requirements left missing or implicit, rather than limiting all future edits to formatting.
- Clean-replacement approval reference (SR-010): user, “I would go for simplification, simplifying. Yeah, remove the complicated things we have,” and explains that removing the mixed concepts enables a separately developed future memory module. This confirms the SR-009 replacement direction; it does not authorize deleting historical data or building the future module now.
- Final approval reference: user “Correct. approve”, following SR-012 scope presentation and the explanation of previous summary plus newly eligible older messages. `DEC-002` preservation is included in that approved scope; no deletion is authorized.
- Behavior-defining supplements presented with this baseline: `proposed-compaction-prompt.md` (literal, `SR-008/prompt-v5`) and `output-format-and-coverage.md` (single-block extraction and sufficient detail). `compaction-prompt-proposal.md` and `prompt-refinement-notes.md` explain rationale; `simplification-design-direction.md` is an architecture-direction supplement, not a completed design. Historical investigation records are not behavior authority.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`; branch `codex/context-compaction-simplification-analysis`.
- Current refreshed base (SR-018 repository metadata, 2026-09-30): `origin/personal` @ `8caa610ff438c288d9aca9f2efe2c33924fbf517`; current HEAD `5cb7b049ae3158108bff2cb70ed80e89540586d9` (IR-003; metadata rechecked on SR-022 diagnostic receipt, no new fetch/rebase). Original approval/analysis bases remain recorded in investigation/history. Finalization target: `origin/personal` through delivery, not this research round.

## Approved SR-012 scope

1. Automatic compaction uses one logical direct LLM generation with the original-based tuned prompt, not an autonomous agent or tool workflow.
2. Input is the previous summary, when present, plus selected older settled history. Output is one updated Markdown summary with the six agreed headings inside one `<compaction_summary>` block. Keep adequate concrete continuation detail; no fixed minimum or minimum-bullet objective.
3. Extract only the inner Markdown. Ignore surrounding prose; reject absent, incomplete, empty or ambiguous output and any known provider-truncated generation. Preserve the prior valid state on failure, with existing reporting and explicit retry.
4. Replace the older compacted region with that summary; keep required system context, recent messages, complete protected tool interactions and budget/evidence safety. Repeated compaction replaces rather than accumulates summaries.
5. Remove the old episodic/semantic generation, category projection and restore prerequisite, child-agent execution, and obsolete algorithm-selection path. One supported path, not parallel old/new strategies. Preserve useful existing enablement/budget/model/status outcomes.
6. Preserve supported existing saved conversations and historical memory read access; no historical-data deletion or summary regeneration merely to reopen a run. This preserves data, not the obsolete compactor. Unsupported old snapshot shapes requiring historical decoding do not gain a runtime fallback; a redundant version label is not the data meaning.
7. Long-term-memory design is separate future work. No new memory stores, speculative extension framework, manual summary-entry UI, or unrelated redesign in this task.

This consolidates the discussed behavior rather than adding a new workflow. User confirmation covers REQ-001–009, AC-001–011 and the current prompt/output supplements. Technical component/file/provider/commit choices are architecture-owned afterward.

## Problem and desired outcome

Context compaction currently generates categorized JSON, stores episodic/semantic records, and renders them into one prompt-facing summary. The user wants to remove this unnecessary coupling. The affected actor is an ordinary user continuing a long AutoByteus agent run; the compaction itself is an internal runtime event, not a separate user conversation.

Success: older settled working history becomes one useful, bounded continuation checkpoint. The agent continues with that checkpoint and recent messages, without a child agent, category-generation protocol, or compulsory long-term-memory writes.

## Relevant current and desired behavior

| ID | Kind / scenarios | Current | Desired | Intentionally preserved |
| --- | --- | --- | --- | --- |
| `BEH-001` | System / `SCN-001` | Budget-triggered helper-agent execution produces six-array JSON, category rows and a rendered summary. | One internal model call returns one Markdown checkpoint. | Automatic trigger, protected head/recent messages, tool-protocol integrity, budget checks and progress visibility. |
| `BEH-002` | User / `SCN-002` | Memory Inspector independently displays stored episodic/semantic records and working context. | New compactions produce no new category records. | **Preserved:** existing records remain readable; working-context view continues to show the actual prompt state. No new long-term-memory product. |
| `BEH-003` | System / `SCN-003` | Previous compacted-memory region participates in the next compactable prefix. | Merge previous checkpoint and newly compactable history into one replacement checkpoint. | Still-relevant goals/constraints, progress, unresolved work; recent uncompressed tail remains separate. |
| `BEH-004` | User / `SCN-004` | A supported run resumes from its strict v5 working-context snapshot. | Resume with stored checkpoint and retained context; no model call solely to reopen a valid run. | **Preserved:** currently supported persisted runs remain resumable. No runtime fallback for old shapes missing required current facts; current meaning, identity and protocol invariants remain required. |
| `BEH-005` | System and user retry / `SCN-005` | Failed compaction reports failure and uses the existing retry admission gate; current persistence order is not atomic across all stores. | Failed generation or rejected output does not become the continuation context. | Existing error/retry entry points; no autonomous repair-agent loop. The safe replacement invariant in REQ-004 must be designed, not claimed already perfect. |

Evidence is canonical in `investigation-notes.md`, SR-003 source log. Source mechanics do not themselves establish additional scenarios.

## Stakeholders and outcomes

- Run user: continue the requested work without restating earlier constraints or redoing completed actions.
- AutoByteus runtime: compact at a supported boundary and issue a valid next model request.
- Memory Inspector user: inspect existing records and current context, not manually author compaction output.
- Engineering: one compaction path, with long-term-memory ownership independent from context reduction.

## Scope guardrail

### In scope

- `UC-001`: ordinary automatic and repeated context compaction (`BEH-001`, `BEH-003`).
- `UC-002`: normal resume and historical inspection affected by the replacement (`BEH-002`, `BEH-004`, preservation approved).
- `UC-003`: existing compaction failure visibility and retry (`BEH-005`).
- Necessary removal of the helper-agent/category-generation path, and the prompt/configuration wiring required by its replacement. Preserve useful enablement, budget and the ability to choose current model/generation settings; do not create an unrelated settings redesign. SR-017 explicitly drops automatic preservation/import of the retired compactor agent's model/configuration; no legacy preference conversion is required.

### Out of scope / non-goals

- Designing episodic, semantic, vector, cross-run retrieval, or other long-term-memory management.
- A person submitting a summary, editing internal checkpoint files, or chatting with a compactor.
- Autonomous compactor tools, file-writing agents, JSON repair loops, multi-pass recursive summarization or fallback-agent chains.
- Changes to provider-native runtime compaction or introduction of new external compaction dependencies.
- Deleting historical data, broad migrations, runtime decoding of already-unsupported old shapes, arbitrary manual corruption recovery, distributed transaction infrastructure, or concurrent old/new binaries writing the same run.
- New UI/prototype work. Minimal existing-surface corrections required by the replacement are not a redesign.
- Perfect/lossless summarization or a claim of proven model quality based on deterministic probes.

### Preserved behavior and review authority

Preserve the explicit outcomes in BEH-001/003/005 and BEH-002/004. Keep source evidence available through the existing raw-trace lifecycle rather than treating the summary as a complete archive. Do not preserve obsolete category-generation machinery merely to preserve historical read access.

Every blocking downstream finding must trace to an approved REQ/AC/BEH. New product behavior, threat models, compatibility promises or operational machinery are requirement gaps requiring user approval, not automatic technical corrections.

## Relevant scenarios and journeys

| Scenario / validity | Actor or independent event and goal | Supported trigger and sequence | Outcome / relevant alternate | Basis |
| --- | --- | --- | --- | --- |
| `SCN-001` — Supported Normal Scenario | User is doing sustained work; runtime must stay within its model context budget. | User continues a run normally; accumulated conversation/tool evidence reaches the existing threshold; runtime selects settled older history, summarizes, retains recent activity, then continues. | One smaller continuation context; if generation fails, SCN-005. | Runtime LLM phase, request assembler and threshold observation path. |
| `SCN-002` — Supported Normal Scenario | User wants to inspect a run's memory. | Opens Memory Inspector; reads working context or historical category tabs through the existing server service. | Historical content remains readable under the approved preservation policy. Empty category tabs for runs with no records are ordinary, not an error. | `AgentMemoryService.getRunMemoryView`; existing Memory Inspector. |
| `SCN-003` — Supported Normal Scenario | A long run continues after an earlier compaction. | More user/agent/tool activity accumulates; another threshold crossing causes older checkpoint plus new settled history to be compacted. | Exactly one updated checkpoint; resolved work does not reappear as pending. | Existing unit builder and window planner already select the older compacted region. |
| `SCN-004` — Supported Normal Scenario | User returns to an existing supported run. | Uses normal resume; runtime restores the persisted working context and continues. | Same meaningful checkpoint/recent context without a summary-generation call merely for resume. | Server run-history resume configuration; runtime snapshot restore bootstrap step. Preservation approved. |
| `SCN-005` — Supported Explicit Edge Scenario | Runtime invokes the summarization provider, but cannot obtain usable output; user needs a truthful failure and later retry. | Actual compaction call errors, returns empty output, or reports output-limit termination; existing failure state is surfaced and existing user retry starts a new attempt. | Prior valid context stays usable; no partial summary replaces it and no hidden semantic-repair call occurs. | Existing executor/reporting/retry policy plus bounded provider generation. Native termination metadata currently needs investigation. Not established by human text submission. |

Ordinary long user messages, repository/tool content, user corrections, changing priorities, completed tasks and unanswered questions are input variations within SCN-001/003, not reasons for new workflows. Synthetic probes reproduce specific source transformations; they do not create scope. Arbitrary hand-edited snapshots, manual summary uploads and unsupported-shape restoration are `Technically Possible but Unsupported/Contrived` for this task.

## Requirements

| ID | Requirement | Trace |
| --- | --- | --- |
| `REQ-001` | A pass creates one bounded continuation checkpoint from the previous checkpoint, if any, and newly compactable settled history. It replaces rather than accumulates checkpoints. | BEH-001/003; SCN-001/003 |
| `REQ-002` | Compaction does not require, generate, update or re-render episodic/semantic records to produce the checkpoint. The supported runtime has one summary-based compaction path, not a selectable old categorized path alongside it. | BEH-001/003; UC-001 |
| `REQ-003` | Preserve required system context, recent uncompressed activity, complete protected tool-call/result groups and the existing raw-evidence lifecycle. The next request must satisfy the existing post-compaction budget. | BEH-001/003; SCN-001/003 |
| `REQ-004` | Do not replace the valid continuation state with failed, empty, known-incomplete or otherwise rejected output. Preserve normal failure visibility and explicit retry; no success claim before a usable replacement is committed. | BEH-005; SCN-005 |
| `REQ-005` | Use one logical model generation per compaction attempt, with no autonomous child-agent run, tools or model-driven JSON repair. Runtime code owns input selection, budget, validation and persistence. Existing provider transport retries are not a new semantic compaction loop. | Approved core; BEH-001/003/005 |
| `REQ-006` | Summary content supports continuation: retain the user's goal and constraints, decisions, verified progress, active state, unresolved requests and useful next steps/references. Preserve corrections and uncertainty; do not turn plans into completed work or quoted tool text into user authorization. Recent retained messages remain authoritative for the latest task. | User's requested good continuation summary; BEH-001/003; prompt-v5 proposal |
| `REQ-007` | Currently supported existing runs remain resumable, existing episodic/semantic records remain readable, and this change does not delete/rewrite historical records merely to stop writing new ones. | DEC-002 approved; BEH-002/004 |
| `REQ-008` | Compaction remains an internal runtime operation with useful enablement, budget, optional current model/generation and status/error controls. With no current override, use the parent agent's current model/provider through existing credential configuration, without separate compactor setup. Do not read/import the retired compactor agent's model or generation settings. Old files remain untouched; their prior custom choices are deliberately not carried forward (SR-017). No manual summary submission or compactor conversation. | BEH-001/005; user's real-scenario clarification |
| `REQ-009` | Return one Markdown continuation summary under the six agreed headings inside one complete `<compaction_summary>` block. Use only its nonempty inner body as the candidate; surrounding prose is excluded and missing/incomplete/ambiguous blocks are rejected. Do not reintroduce categorized JSON or model-driven repair. | BEH-001/003/005; SCN-001/003/005; prompt-v5/output supplement |

## Acceptance criteria and verification intent

| ID | Requirement / scenario | Observable criterion |
| --- | --- | --- |
| `AC-001` | REQ-001; SCN-001 | After first compaction, the next request contains one checkpoint and the retained recent messages, not the compacted-away detailed prefix. |
| `AC-002` | REQ-001/006; SCN-003 | Second compaction preserves still-relevant earlier constraints, incorporates newer progress/corrections and produces one replacement, not accumulated summary messages. |
| `AC-003` | REQ-002; SCN-001/003 | Successful compaction creates no new episodic/semantic rows and succeeds without categorized model output or category projection. No legacy categorized compactor remains as a supported selectable or fallback path. |
| `AC-004` | REQ-003; SCN-001/003 | Required head and retained tool groups remain intact and ordered; final context plus required overhead meets the existing computed target. Source evidence remains available under the raw-trace contract. |
| `AC-005` | REQ-004; SCN-005 | Generation failure, empty output or provider-reported truncation cannot become the installed checkpoint; failure is surfaced and the existing retry action works without losing the valid baseline. Commit tests separately verify safe replacement; do not infer atomicity from generation-only tests. |
| `AC-006` | REQ-005/008; SCN-001 | One logical model generation occurs with no child AgentRun, tool execution, JSON correction call or user summary-entry step. |
| `AC-007` | REQ-006; SCN-001/003 | Review first/repeated-compaction fixtures covering long instructions, corrections, completed versus pending work, unanswered user requests and retained-tail precedence. No fabricated approval/completion; critical constraints and exact continuation references survive. Live-model quality evaluation is reported separately from deterministic plumbing tests. |
| `AC-008` | REQ-007; SCN-004 | A currently supported previously compacted v5 run resumes with its saved checkpoint and recent context; no model call solely to transform it. DEC-002 approved. |
| `AC-009` | REQ-007; SCN-002 | Existing historical category records and working context remain viewable; newly compacted runs need not have category records. No historical-file deletion. DEC-002 approved. |
| `AC-010` | REQ-008; SCN-001/003/005 | Budget/model-generation controls and status/failure outcomes remain usable without a compactor-agent workflow. With absent current setting, each attempt selects the then-current parent model without prompting for a separate model/key or writing a default setting. A user-selected current override remains explicit and takes effect for later attempts; unavailable explicit selections do not silently fall back. |
| `AC-011` | REQ-009/004; SCN-001/003/005 | A valid six-heading marked summary with exterior commentary yields only its Markdown body. Missing closing tag, absent block, empty body or multiple/ambiguous blocks cannot replace valid context. Provider-truncated output remains rejected under AC-005 even if tags are present. |
| `AC-012` | REQ-008; SCN-001/003/004 | Having a retired compactor agent configuration, including a prior custom model/config, neither changes current defaults nor invokes any legacy-settings read/import on startup or compaction. No migration/default-initialization write, legacy-dependent startup gate, or historical-file deletion is added. Existing current-format settings explicitly saved in the new settings surface remain usable; this is not a wipe of current settings. |

## Decisions, evidence limits and readiness

- `DEC-001`: core simplified direction approved by the quoted agreement above; do not ask the user to approve that concept again.
- `DEC-002`: approved in the SR-012 scope by “Correct. approve”: preserve supported resume and historical read access without retaining the old categorized generation path or deleting historical records. Technical transition is architecture-owned.
- `DEC-003`: the latest requested target replaces the earlier three-output helper-agent approach **for this package**. Do not edit, merge or claim to cancel the externally owned unintegrated worktree; preserve its historical references. Coordination is required before any conflicting implementation is integrated.
- Current-path evidence and supported scenarios: sufficient. Historical pre-refactor restore had a lineage dependency; current implementation removed that dependency. SR-018 revises reader/default details against the current guidelines; target changes and full acceptance remain pending.
- Prompt quality: actual generated-summary failures remain open (API-F005; SR-014 diagnostics). Structural parser/unit passes do not establish fidelity. Exact prompt-v5 remains active; candidate-v6 unapproved/excluded.
- Provider completion, model/config construction and commit ordering are specified in the cumulative design and partly implemented; existing validation limits remain. No new product failure framework is authorized.
- Product Design: N/A — not requested. Independent reviews: historical ARCH-REV-001 and CRR-001–004, with their original bases and limits. `design-spec.md`: SR-018 Architecture Design Complete for re-review; task_size Large, architectural_risk High; implementation/acceptance not complete.
- Next action: route the completed revised SR-018 architecture through the configured independent-review rule, as explicitly requested by the user. Requirements remain approved; no implementation or delivery completion is claimed.

## SR-004 prompt refinement

User asked whether the original compactor prompt was already good and should mainly change its bullet organization and JSON output to Markdown. The original built-in template was reread directly. Its continuation, rolling-update, content selection and factuality guidance is retained in the revised proposal; category-specific wording and JSON schema are replaced. Existing REQ/AC outcomes and the pending preservation decision are unchanged. This is prompt/rationale refinement, not a new scenario, implementation authorization or full-baseline approval. Historical prompt-v1 remains in `history/compaction-prompt-proposal.sr003.md`.

## SR-005 prompt-adaptation approval

User confirmed: “We can use our original prompt, but we just need to update it a little bit because earlier we used the JSON … now we use markdown and we don't have this episodic and semantic anymore,” explaining that the original was carefully written and tuned. This approves the original-based adaptation approach: preserve the existing continuation/content-selection guidance, revise category-specific wording and replace the JSON output contract. Do not substitute a wholesale rewrite or unrequested new prompt policies. Prompt-v3 reflects this narrow direction; this does not constitute approval of the outstanding data-continuity policy or a completed architecture.

## SR-006 evidence supplement

This round collected background research without changing the canonical `proposed-compaction-prompt.md` or granting new behavior approval. Its detailed research record is historical, not part of the current design rationale. The pre-cleanup document is preserved in `history/requirements-doc.md.before-sr023.md`.

## SR-007 targeted continuity refinement

User explicitly requested making the most important missing continuation requirements explicit in our prompt. This relaxes the previous formatting-only edit boundary while retaining the original as the base. The proposal now makes unanswered requests/corrections, carry-forward constraints, truthful work status, exact continuation references and source-only summarization explicit. These clarify existing REQ-001/005/006 and AC-002/006/007 in SCN-001/003; no new user workflow, memory store, language policy, retention policy or autonomous mechanism is added. `prompt-refinement-notes.md` records the rationale and example checks; `proposed-compaction-prompt.md` is the canonical literal for review. User authorization to refine is recorded, not final approval of unseen exact wording or the unanswered data-continuity decision.

## SR-008 output extraction and coverage clarification

User raises two ordinary model-output concerns: surrounding commentary and too few useful items. These expose prompt/technical gaps under existing REQ-004/006 and AC-005/007, not a request to restore episodic/semantic memory. The draft now proposes one marked Markdown output block and coverage-first bullet wording; `output-format-and-coverage.md` is the linked behavior-defining proposal/rationale accompanying prompt-v5. Exact revised output handling is not yet approved or implemented. The core single-call/one-summary direction remains approved. No new actor workflow, fixed item minimum, repair loop or data-retention decision is added. Original JSON parser evidence shows six required arrays but only one required nonempty episode; format validity was never proof of adequate coverage.

## SR-009 clean-replacement proposal

User asks how the summary replaces the combined episodic/semantic output, whether the framework supports a new strategy, and reiterates that simplification is the objective. The source-grounded recommendation in `simplification-design-direction.md` is one replacement compaction path, not a second selectable legacy/current algorithm. Keep the required head/recent suffix, tool safety, budgets, raw-evidence lifecycle and context persistence; remove compulsory category generation/projection and child-run execution. The existing strategy selector currently has only one registered production algorithm, but its UI/API/export removal is explicitly surfaced here rather than silently approved. Useful threshold/context/model/status controls remain. This is a proposal for the full baseline, not a completed architecture or approval of historical-data handling. Existing REQ/AC IDs remain; no new product scenario is inferred from an extensible registry or test-only registration.


## SR-010 clean-replacement approval

The user explicitly chooses simplification and removal after the SR-009 discussion, to untangle compaction from a future independently developed memory module. Record this as approval of the replacement direction under REQ-002/005 and AC-003/006, not merely a preference for a new optional strategy. Keep one summary-based path; remove obsolete category-processing and child-agent execution rather than leaving dormant compatibility switches. Preserve real planning, context-budget, tool-boundary and persistence responsibilities. Do not build speculative long-term-memory interfaces, stores or hooks in this task.

This approval does not answer DEC-002, approve destruction of saved runs/history, or establish an end-to-end safe transition. The complete requirements/output supplement approval and final architecture are still outstanding. The focused remaining product question is whether existing supported saved runs must remain resumable and old memory records readable; the recommendation is yes, without retaining the old generation path. The prompt remains SR-008/prompt-v5.


## SR-011 saved-context and raw-trace explanation

User asks why restore reads categorized records if summary text is already saved, and what raw traces store. This is current-behavior investigation, not a new intended-behavior approval or a request for implementation. Detailed findings are in investigation notes: snapshot text is restored directly, category rows are read to enforce lineage membership/existence, and raw traces are normalized event evidence with an active/archive lifecycle, not the current prompt or a guaranteed byte-exact provider replay. Requirements and approval boundaries remain unchanged.


## SR-012 readiness assessment

The user asks whether requirements are now clear, summarizing the core as a simple LLM request followed by extraction and substantial simplification. The answer is yes: the behavior is clear enough for one final baseline confirmation. Existing explicit core and clean-replacement approvals stand; do not misrepresent this readiness question as blanket approval of every supplement or preservation outcome. REQ-009/AC-011 promote the already-discussed output contract from its supplement into the canonical testable tables. No prompt edit or new scenario.

Readiness checks: actors/triggers and normal/repeated/failure/resume/inspection scenarios grounded in current production paths; scope/non-goals stable; REQ/AC mapping explicit; output and detail requirements linked to literal prompt; preserved/loss boundaries explicit; no new Product surface or Product handoff requested. Model/provider construction, normalized completion metadata, safe snapshot/archive ordering and exact removals remain architecture investigation tasks, not unresolved user-facing purpose. No live-model quality proof or complete transition test exists.


## SR-013 explicit approval capture

User: “Correct. approve”, following the SR-012 scope and first/repeated-compaction clarification. Approval applies to the complete consolidated scope and current literal/output supplement, including supported resume/historical read preservation. No new requirement added by approval capture. Begin architecture; do not re-request approval of unchanged intent.

## SR-015 — Historical prompt-supplement proposal (not active; parked by SR-020)

Approved SR-012 requirements/ACs and exact prompt-v5 remain authoritative; no approval is withdrawn or implied for new wording. SR-014 diagnostic evidence now shows the same requested-action→completed-action error under both tested temperatures; the valid REQ-006/AC-002/007 planned/completed distinction is not weakened.

A separate exact candidate `compaction-prompt-v6-candidate.md` adds one generic64-word bullet distinguishing summary updates/current requirements from performed target-agent work across every section. Full delta/rationale/evaluation boundary is `prompt-recovery-proposal.md` and `solution-recovery-evidence/sr015/prompt-v5-to-v6-candidate.diff`. Amendment status **Parked by SR-020; no current approval request**; user has not approved it, no candidate efficacy test or production integration occurred. All other prompt words, scope, scenarios, requirements/ACs, default configuration, model support, selection/persistence and one-call/no-repair architecture remain unchanged. No new intended user workflow.

Requested decision: explicitly approve the exact targeted prompt refinement for bounded evaluation and subsequent applicable review/validation, not a release waiver or blanket prompt-tuning mandate. Current v5 remains active until authorized revision; an unsuccessful candidate must not be treated as a fix. API-F005 and separate API-F004 remain open. No implementation handoff arises from this approval hold.


## SR-017 — explicit no-import/default-parent decision

User explains that compaction naturally uses the same model as the parent, especially when that is the user's configured provider/key, and says: “Let's just consider that the user never said that before” and “We don't have to have this migration at all.” This explicitly approves abandoning carry-forward of **retired compactor-agent model/generation preferences**, following the prior explanation of that exact trade-off. Do not reinterpret it as permission to delete conversations, historical files or current-format settings.

Approved delta: no old settings import; no new migration for this ticket's settings; parent model/provider at each attempt by default, through the existing availability/credential path. No new key setup solely for compaction. Keep ratio controls. Already-approved optional current model/generation controls remain available and separate from strategy selection; the user's “maybe” wording is not an instruction to add an unrelated temperature UI or require an override. Same model does not mean copying parent system prompts, tools or mutable conversation, nor does it newly approve copying all parent sampling parameters. Unspecified generation options retain selected-model defaults with the existing compaction-owned prompt/output budget constraints.

Existing current-format settings are not erased or provenance-guessed; the removed importer is the only place that reads the old agent configuration. No new default value must be persisted just to make an absent setting valid. Current-format malformed/unsupported selections retain normal settings/attempt errors, never a legacy import gate. These are normal compaction/settings and ordinary upgrade variations within existing scenarios, not a migration-recovery product.

REQ-008/AC-010 amended, AC-012 added; other REQ/ACs and history-preservation DEC-002 unchanged. This targeted approval does not approve candidate-v6, change model support, waive semantic fidelity or authorize a release. No further model calls or production edits this round. The old migration rationale is superseded by this decision; historical approvals and snapshots remain linked.


## SR-018 — reaffirmed approval and independent re-review request

User: “I think the design, the requirement is clear. I think you need to do relevant updates and then send extra review.” This explicitly reconfirms SR-017's default-parent, optional controls, no legacy preference import and requests an additional architecture review. Ordinary users need no compaction setup; current saved settings persist. No strategy selector, settings migration, history rewrite or new UI design is added.

SR-012 + SR-017 remain the approved behavior basis. Snapshot-version language above is clarified to distinguish required current data meaning from an obsolete serialization label, in accordance with the user's requested migration-guideline audit. REQ-007/AC-008 continue to preserve supported saved context; no historical decoder, missing-provenance fabrication or new old-shape support is authorized. Version-agnostic current projection and exact normal writing are technical design choices, not a new upgrade workflow.

The literal active prompt remains v5. The separate v6 candidate has NOT been approved and is excluded from this implementation/review basis; requesting review does not approve unseen prompt amendments. REQ-006/AC-002/007 are not weakened and API-F005/F004 remain unresolved acceptance findings. Review may proceed on the completed structural revision without representing those findings as solved or authorizing additional provider experiments. Any actual prompt/configuration/support remedy still needs the applicable owner decision and approval.


## SR-020 — approved Qwen validation exception; continue with DeepSeek

Explicit user direction, 2026-09-30: “forget about the qwen failure please no need to care about it. if deepseek works, qwen will be successful as well.” Follow-up: “for qwen, i dont even have the endpoint, of course it might fail”. These authorize stopping Qwen investigation and no longer gating this ticket on correcting API-F005. The reported current endpoint unavailability is not independently verified and is not assigned as the cause of earlier successful-response fidelity failures.

Acceptance disposition for REQ-006 / AC-002/007, SCN-001/003: **API-F005 accepted known deviation/non-blocking for this ticket, not fixed or passed**. Retain every failed sample and truthful reports; use the available, separately authorized DeepSeek target for further provider validation. No more Qwen calls or tuning, including attempts to reproduce API-F004 on that target. Passing DeepSeek does not prove Qwen passes. This is a bounded user-approved validation exception, not a new assertion of all-model fidelity, removal of Qwen from product support, or weakening of the general summary-content contract.

Production behavior remains SR-012 + SR-017: parent model by default, optional current overrides, exact prompt-v5, one call, no legacy settings import/new migration, no semantic validator or repair generation. Candidate-v6 and its six-call proposal are parked/unapproved; no approval request or experimentation is required for them now.

API-F004 remains an unexplained historical full-runtime continuation observation, not an endpoint failure or a resolved defect. API/E2E owns assessment of any remaining product-level continuation coverage using DeepSeek, rather than requiring recovery of the unavailable Qwen environment. The two-call DeepSeek summary pair alone is not full runtime continuation acceptance. This direction does not declare the whole ticket Pass, waive unrelated coverage/review/delivery gates, rescore earlier reports, or authorize unbounded retries. Any new execution must be separately predeclared and bounded under the existing provider permission; previous campaign limits remain exhausted.


## SR-021 — new replaceable-strategy and retry/error amendment (Draft)

### User authority and scope

Incoming `api-retry-policy-request.md` records user requests for three total compaction/API attempts, error after exhaustion, and later user input retrying compaction before normal dispatch. Incoming `code-review-design-request.strategy-boundary.md` records user direction to keep a genuinely replaceable implementation boundary. User then directly asks Solution Designer to analyze the original implementation and identify the replaceable part with a clear boundary. These explicitly authorize investigation/refinement; they are not approval of unspecified error exceptions, message replay semantics or an unseen exact interface.

This changes earlier broad no-strategy wording: remove the old categorized implementation and obsolete selector/registry, **not the useful ability to inject a replacement behind a small contract**. One current direct-LLM production implementation remains. No restored settings selector, legacy fallback, second production algorithm or generic plugin framework. Approved v5, default-parent/current optional settings, no legacy preference migration, historical preservation and SR-020 remain unchanged.

### Behavior and scenario basis

- Existing BEH-005 / UC-003 / SCN-005 Supported Explicit Edge Scenario: ordinary compaction/API failure while a user continues a run. Desired revision is bounded automatic attempts, a visible recoverable failure after exhaustion, then new-user retry before normal parent work; stable context retained. New current observations and unknowns are E21-1–4, not evidence of an old approval violation.
- Proposed BEH-006 / UC-004: explicit engineering replacement contract, not a new UI journey. Maintainer substitutes another conforming summary producer at composition; normal/repeated compaction and failure safety remain unchanged (SCN-001/003/005). A test implementation proves the contract; no hypothetical future production algorithm is added.
- Preservation: trigger/selection/head/tail/raw evidence/validation/commit and normal saved-run read behavior remain as approved. Original failed user input and new input must not be silently discarded/duplicated; exact delivery policy is DEC-021-03 below.

### Requirement deltas (retry amendments Draft; REQ-010 confirmed in SR-024)

| ID | Proposed amendment | Trace |
| --- | --- | --- |
| REQ-004 | Preserve valid state, block normal parent/tool dispatch while required compaction has failed, expose a recoverable error, and allow a later distinct user message to start a fresh bounded cycle before normal dispatch. A committed compaction must never be retried because reporting/cleanup fails. | BEH-005 / SCN-005 |
| REQ-005 | No child agent/tools/semantic repair. Direct implementation makes one request per algorithm attempt, with a maximum of three actual outbound generation requests per authorized cycle, including any SDK transport retries; stop on first success. Eligible failure classes/early stops follow DEC-021-02. Separate subsequent user retry is a new cycle, not an unbounded automatic loop. | BEH-001/005 / SCN-001/005 |
| REQ-010 (confirmed SR-024) | Runtime depends on a replaceable CompressionStrategy whose content contract is text to be compressed -> compressed text. Use neutral content terminology, not prefix/working-context-specific input fields. In this ticket the caller selects and renders the prefix; direct LLM summarization is the sole production implementation. The strategy neither selects context nor installs/persists the result. Replacing a conforming implementation must not change orchestration or require the direct concrete class, child-agent/category types or compulsory provider metadata. | BEH-006 / UC-004; SCN-001/003/005 |

### Proposed acceptance deltas

- AC-005 / REQ-004: first/second/third eligible attempt may succeed; exhaustion shows recoverable compaction failure, unchanged baseline and no premature parent dispatch; next distinct user starts a fresh bounded cycle, no non-user automatic bypass. Verify input remains usable and no normal IDLE display falsely clears the failure.
- AC-006 / REQ-005: first success uses one generation; maximum three outbound generation attempts per cycle including SDK retries; no fourth, nested multiplication, child/tool/semantic-repair call. Literal prompt and model-default semantics unchanged.
- AC-013 (new) / REQ-004/005, SCN-005: deterministic transient/error/output fixtures verify approved eligibility, count, cancellation during call/wait, no late commit, and no generation retry for persistence/postcommit failures. Existing provider deadlines remain effective; concrete bounded wait/deadline policy must be specified in affected design, not provider defaults silently assumed uniform.
- AC-014 (new) / REQ-004, SCN-005: genuine new user input retries required compaction first; after successful commit the approved original/new-message policy holds exactly once. Failure keeps user input/evidence visible; test no loss/duplication/replay of already completed work. DEC-021-03 unresolved.
- AC-015 (new) / REQ-010, BEH-006: compile and run the real orchestration with an independent test implementation that does not inherit/import/cast to the direct concrete class or fabricate provider/category metadata; same planner/validation/commit/cancellation/retry invariants apply. No second production algorithm required.

### Decisions for focused confirmation

- DEC-021-01 — **settled in SR-024:** CompressionStrategy accepts content text and returns compressed text. Selection and preparation of the prefix are caller responsibilities. Direct LLM summarization implements the content transformation; generic parameter naming does not expand scope to selecting/storing context or additional production algorithms. Architecture must realize this contract without concrete-class coupling.
- DEC-021-02: recommend retrying temporary API failures and empty/malformed/truncated summaries up to three total requests; fail immediately for invalid credentials/configuration. Cancellation and storage/commit failures do not trigger more model calls. User policy confirmation requested via two concise questions; never infer exceptions from a provider SDK default.
- DEC-021-03: when A never reached the parent and B arrives after failure, recommend passing A then B once after successful compaction; alternative only B while A remains visibly failed. Explicit user choice requested. No new pending-input persistence/migration design is approved by this proposal; architecture must first inspect existing durable input contracts if restart continuity is affected.

Readiness: current behavior/source and request are grounded, scope/IDs/known preserved outcomes explicit. **Draft** because failure exceptions and message handling remain to confirm. The content-to-content replacement scope is settled in SR-024. Do not finalize affected architecture or route implementation before that decision. Unchanged parts retain prior approval; no request to reapprove the entire original ticket or parked v6.


## SR-022 — explicit removal of numeric summary target from prompt (Approved bounded delta)

User first says the summary budget/approximately3000-token prompt instruction is unnecessary and asks for supporting investigation and measurements. Then explicitly clarifies: “Of course, we don't remove from the provider's hard output cap, right? But we can remove that from the prompt.” This is approval of the precise prompt-envelope removal, not merely an unanswered proposal. No need to re-request approval for this bounded decision.

- **REQ-011 (new, approved):** Do not inject a numeric desired-summary-length instruction into the compactor prompt or require a summary-size target as part of the replaceable strategy input. The content input remains one selected-history prefix, already containing any previous summary. Keep the tuned v5 instructions for appropriate detail/conciseness and six tagged Markdown headings.
- **AC-016 (new, approved; REQ-011/003/009, SCN-001/003):** First and repeated compaction requests use the unchanged approved v5 system literal and prepared history without the extra `Summary budget: N tokens.` prefix or another numeric/word-count replacement instruction. No extra previous-summary duplication. Strategy callers do not supply the removed prompt-size target. Provider hard output cap, normal input-capacity and final-context budget checks remain; numeric prompt removal is not permission to accept known truncated/oversized output.
- Preserve runtime-only planner reserve/threshold/head-tail/budget calculations, provider generation controls/current model default, existing raw/persistence safety and input preparation. No added shortening pass, semantic repair or fallback algorithm. Existing optional generation settings remain.
- Rationale: ASM-022-01 below is the user-directed operating assumption for this decision, not imitation of another platform. Existing research and diagnostic outputs remain historical investigation evidence only; they do not define the contract or introduce an additional approval/proof gate.

The overall revised requirements remain **Draft only for outstanding SR-021 retry/error/input-message decisions; replacement scope settled in SR-024**. This numeric-target decision is settled. Affected authoritative technical design remains Needs Revision until the consolidated approved basis is complete. No production edit or delivery approval is inferred from this approval capture.

### Assumption for future maintainers (SR-022 clarification)

**ASM-022-01 — Natural summary compression.** For the long conversation histories that trigger compaction, we assume that an LLM given a clear summarization task will normally produce a substantially shorter continuation summary without being told a numeric token target. We rely on this behavior in the normal compaction path. The summary is not intended to reproduce the transcript or retain a fixed percentage of its tokens.

A long history contains repeated discussion, intermediate reasoning, superseded plans, repeated status messages, and verbose tool results. A continuation summary selects the current goal, still-applicable constraints, important decisions and findings, completed and pending work, and the exact references needed to resume. Much of the original volume is therefore not required in the replacement. Our input preparation also excerpts large tool results before they reach the summarizer. The summary's useful detail is driven by the task's state and remaining work, rather than by the length of the source history alone.

The practical basis is the user's extensive experience with LLM summarization: even very large histories ordinarily result in comparatively short summaries without a requested token count. For this design, that experience is sufficient to adopt natural compression as an operating assumption. We do not require an exact input-to-output ratio, a fixed output length, or further experiments to justify omitting a numeric prompt target. Illustrative input/output sizes are not acceptance thresholds.

**Design consequence:** ask for a concise but sufficiently detailed continuation summary using the approved content and output instructions. Do not add “approximately N tokens,” a word-count substitute, a fixed bullet quota, or a summary-size parameter to the replaceable transformation contract. Do not sacrifice important continuation information merely to hit an arbitrary target. On repeated compaction, the selected prefix already contains the prior summary once; the result is one updated replacement, not an accumulation of summaries.

**Separate boundary safeguards:** retain the provider's hard output cap, rejection of known incomplete output, and the existing final-context fit check before installing the replacement. These enforce resource and state boundaries; they are not instructions to produce a particular summary length. If a candidate fails those checks, retain the valid baseline and follow the approved failure policy. This operating assumption is not a promise about every possible input, and it does not justify removing those existing safeguards.

## SR-024 — User-confirmed content-to-content CompressionStrategy boundary

User confirms that compression here is summarizing supplied content and asks for the general names “compression strategy,” content to compress and compressed result, rather than a prefix-specific input. This follows the prior explanation of text in/text out with selection/rendering outside the strategy. Capture this as confirmation of that bounded replacement contract and naming direction (REQ-010 / DEC-021-01), not approval of the still-unsettled retry/error/message policies.

- Content input: one text string (`content`); content output: compressed text. Conceptual operation: `compress(content: string): Promise<string>`.
- The caller knows that, for context compaction, this content came from a selected and rendered prefix. The strategy does not need prefix/suffix, working-node, trace or persistence concepts in its content contract. Any prior summary appears once in the caller-prepared content.
- Direct LLM summarization remains the sole production implementation, subject to the existing approved summary content/output contract. No binary/lossless-compression promise, new registry or hypothetical second algorithm.
- Prefix selection/rendering, runtime admission/retry, output acceptance/commit and parent continuation remain outside. Cancellation and optional execution diagnostics are separate controls; final engineering API details must preserve this content abstraction.
- AC-015 gains this explicit check: a standalone strategy test supplies an ordinary content string and gets compressed text without constructing working-context/message-unit objects. Real orchestration substitution still uses an independent implementation without inheriting/casting to the direct class; no second production algorithm is needed.

Approved intent is updated; current source still takes structured units and renders internally. No implementation or new complete architecture is claimed. REQ-011/AC-016, ASM-022-01, exact v5, provider cap/defaults and existing preservation policy stay unchanged.
