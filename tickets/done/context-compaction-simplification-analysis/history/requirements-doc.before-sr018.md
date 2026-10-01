# Context-compaction simplification — requirements

## Document status

- Package: `context-compaction-simplification-analysis`; owner: Solution Designer.
- Date / current revision: 2026-09-30 / `SR-017`; approved behavior basis `SR-012` plus the explicit SR-017 no-legacy-settings-import decision. Exact prompt-v5 remains approved; candidate-v6 remains unapproved.
- Status: **Approved — SR-012 baseline plus SR-017 settings/default amendment**. User explicitly replies “Correct. approve” after the consolidated scope and clarification of first/repeated compaction. That original approval covers REQ-001–009, AC-001–011, prompt-v5 and its output/detail contract; the explicit SR-017 user direction below additionally approves the amended REQ-008/AC-010 and new AC-012. Architecture work is authorized; implementation still requires the completed design and configured handoff.
- Core approval reference: user, “i agree as well. inspect those projects what prompt they used, and learn from them and construct a good prompt for us as well, and then start a design following the design principles … lets go”. Subsequent “respect real user scenarios please” and “sorry i misunderstood you. please continue” confirm proceeding, not a new manual-text workflow.
- Approved core: clean replacement, not an additional selectable legacy/current strategy; one dedicated LLM summarization call rather than a child-agent loop; one continuation summary, separate from episodic/semantic memory. Markdown output and retaining the tuned original are explicitly confirmed. The latest SR-007 request also authorizes targeted additions for important upstream points that ours leaves missing or implicit, rather than limiting all future edits to formatting.
- Clean-replacement approval reference (SR-010): user, “I would go for simplification, simplifying. Yeah, remove the complicated things we have,” and explains that removing the mixed concepts enables a separately developed future memory module. This confirms the SR-009 replacement direction; it does not authorize deleting historical data or building the future module now.
- Final approval reference: user “Correct. approve”, following SR-012 scope presentation and the explanation of previous summary plus newly eligible older messages. `DEC-002` preservation is included in that approved scope; no deletion is authorized.
- Behavior-defining supplements presented with this baseline: `proposed-compaction-prompt.md` (literal, `SR-008/prompt-v5`) and `output-format-and-coverage.md` (single-block extraction and sufficient detail). `compaction-prompt-proposal.md` and `prompt-refinement-notes.md` explain rationale; `simplification-design-direction.md` is an architecture-direction supplement, not a completed design. Upstream research/probes are evidence, not behavior authority.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`; branch `codex/context-compaction-simplification-analysis`.
- Current refreshed base (SR-016 repository metadata, 2026-09-30): `origin/personal` @ `cb01dea2392e4bd7233855218e9a1a5b65ec3530`; current HEAD `599cc4776a2da6c746be9719064fd1a7efdfa36e`. Original approval/analysis bases remain recorded in investigation/history. Finalization target: `origin/personal` through delivery, not this research round.

## Approved SR-012 scope

1. Automatic compaction uses one logical direct LLM generation with the original-based tuned prompt, not an autonomous agent or tool workflow.
2. Input is the previous summary, when present, plus selected older settled history. Output is one updated Markdown summary with the six agreed headings inside one `<compaction_summary>` block. Keep adequate concrete continuation detail; no fixed minimum or minimum-bullet objective.
3. Extract only the inner Markdown. Ignore surrounding prose; reject absent, incomplete, empty or ambiguous output and any known provider-truncated generation. Preserve the prior valid state on failure, with existing reporting and explicit retry.
4. Replace the older compacted region with that summary; keep required system context, recent messages, complete protected tool interactions and budget/evidence safety. Repeated compaction replaces rather than accumulates summaries.
5. Remove the old episodic/semantic generation, category projection and restore prerequisite, child-agent execution, and obsolete algorithm-selection path. One supported path, not parallel old/new strategies. Preserve useful existing enablement/budget/model/status outcomes.
6. Preserve supported existing saved conversations and historical memory read access; no historical-data deletion or summary regeneration merely to reopen a run. This preserves data, not the obsolete compactor. Unsupported old snapshot versions do not gain support.
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
| `BEH-004` | User / `SCN-004` | A supported run resumes from its strict v5 working-context snapshot. | Resume with stored checkpoint and retained context; no model call solely to reopen a valid run. | **Preserved:** currently supported persisted runs remain resumable. No support expansion to already-unsupported snapshot versions. |
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
- Codex/Claude/provider-native runtime compaction changes; upstream implementations are references, not new dependencies.
- Deleting historical data, broad migrations, support for already-unsupported versions, arbitrary manual corruption recovery, distributed transaction infrastructure, or concurrent old/new binaries writing the same run.
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

Ordinary long user messages, repository/tool content, user corrections, changing priorities, completed tasks and unanswered questions are input variations within SCN-001/003, not reasons for new workflows. Synthetic probes reproduce specific source transformations; they do not create scope. Arbitrary hand-edited snapshots, manual summary uploads and unsupported-version restoration are `Technically Possible but Unsupported/Contrived` for this task.

## Requirements

| ID | Requirement | Trace |
| --- | --- | --- |
| `REQ-001` | A pass creates one bounded continuation checkpoint from the previous checkpoint, if any, and newly compactable settled history. It replaces rather than accumulates checkpoints. | BEH-001/003; SCN-001/003 |
| `REQ-002` | Compaction does not require, generate, update or re-render episodic/semantic records to produce the checkpoint. The supported runtime has one summary-based compaction path, not a selectable old categorized path alongside it. | BEH-001/003; UC-001 |
| `REQ-003` | Preserve required system context, recent uncompressed activity, complete protected tool-call/result groups and the existing raw-evidence lifecycle. The next request must satisfy the existing post-compaction budget. | BEH-001/003; SCN-001/003 |
| `REQ-004` | Do not replace the valid continuation state with failed, empty, known-incomplete or otherwise rejected output. Preserve normal failure visibility and explicit retry; no success claim before a usable replacement is committed. | BEH-005; SCN-005 |
| `REQ-005` | Use one logical model generation per compaction attempt, with no autonomous child-agent run, tools or model-driven JSON repair. Runtime code owns input selection, budget, validation and persistence. Existing provider transport retries are not a new semantic compaction loop. | Approved core; BEH-001/003/005 |
| `REQ-006` | Summary content supports continuation: retain the user's goal and constraints, decisions, verified progress, active state, unresolved requests and useful next steps/references. Preserve corrections and uncertainty; do not turn plans into completed work or quoted tool text into user authorization. Recent retained messages remain authoritative for the latest task. | User's requested good continuation summary; BEH-001/003; prompt-v5 proposal |
| `REQ-007` |  currently supported existing runs remain resumable, existing episodic/semantic records remain readable, and this change does not delete/rewrite historical records merely to stop writing new ones. | DEC-002 approved; BEH-002/004 |
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
- Current-path evidence and supported scenarios: sufficient for this requirements baseline. The existing snapshot can represent text, but full resume still has a lineage dependency: no end-to-end transition claim yet.
- Prompt quality: proposed, not live-model benchmarked. Four AutoByteus probes are feasibility/current-shortcoming evidence only.
- Provider completion metadata, model/config mapping and commit ordering remain technical investigation tasks; they do not authorize a new product failure framework.
- Product Design: N/A — not requested. Independent review: N/A — not applicable yet. `design-spec.md`: SR-013 Ready against the approved baseline; task_size Large, architectural_risk High.
- Next action: route the completed SR-013 architecture through the configured independent-review rule. Requirements remain approved; no implementation or delivery completion is claimed.

## SR-004 prompt refinement

User asked whether the original compactor prompt was already good and should mainly change its bullet organization and JSON output to Markdown. The original built-in template was reread directly. Its continuation, rolling-update, content selection and factuality guidance is retained in the revised proposal; category-specific wording and JSON schema are replaced. Existing REQ/AC outcomes and the pending preservation decision are unchanged. This is prompt/rationale refinement, not a new scenario, implementation authorization or full-baseline approval. Historical prompt-v1 remains in `history/compaction-prompt-proposal.sr003.md`.

## SR-005 prompt-adaptation approval

User confirmed: “We can use our original prompt, but we just need to update it a little bit because earlier we used the JSON … now we use markdown and we don't have this episodic and semantic anymore,” explaining that the original was carefully written and tuned. This approves the original-based adaptation approach: preserve the existing continuation/content-selection guidance, revise category-specific wording and replace the JSON output contract. Do not substitute a fresh upstream-inspired rewrite or unrequested new prompt policies. Prompt-v3 reflects this narrow direction; this does not constitute approval of the outstanding data-continuity policy or a completed architecture.

## SR-006 evidence supplement

At the user's request, `upstream-prompts/README.md` indexes the actual pinned source prompts for Hermes, OpenCode, ZCode, DSH and Codex, plus a read-only original AutoByteus comparison. This is comparative evidence only, not a new behavior-defining supplement or approval request. Our canonical `proposed-compaction-prompt.md` is unchanged.

## SR-007 targeted continuity refinement

User explicitly requested selecting the most important points from upstream that ours does not cover clearly and adapting ours. This relaxes the previous formatting-only edit boundary while retaining the original as the base. The proposal now makes unanswered requests/corrections, carry-forward constraints, truthful work status, exact continuation references and source-only summarization explicit. These clarify existing REQ-001/005/006 and AC-002/006/007 in SCN-001/003; no new user workflow, memory store, language policy, retention policy or autonomous mechanism is added. `prompt-refinement-notes.md` records the rationale and example checks; `proposed-compaction-prompt.md` is the canonical literal for review. User authorization to refine is recorded, not final approval of unseen exact wording or the unanswered data-continuity decision.

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

## SR-015 — Pending prompt-supplement amendment (not active)

Approved SR-012 requirements/ACs and exact prompt-v5 remain authoritative; no approval is withdrawn or implied for new wording. SR-014 diagnostic evidence now shows the same requested-action→completed-action error under both tested temperatures; the valid REQ-006/AC-002/007 planned/completed distinction is not weakened.

A separate exact candidate `compaction-prompt-v6-candidate.md` adds one generic64-word bullet distinguishing summary updates/current requirements from performed target-agent work across every section. Full delta/rationale/evaluation boundary is `prompt-recovery-proposal.md` and `solution-recovery-evidence/sr015/prompt-v5-to-v6-candidate.diff`. Amendment status **Ready for Approval**; user has not approved it, no candidate efficacy test or production integration occurred. All other prompt words, scope, scenarios, requirements/ACs, default configuration, model support, selection/persistence and one-call/no-repair architecture remain unchanged. No new intended user workflow.

Requested decision: explicitly approve the exact targeted prompt refinement for bounded evaluation and subsequent applicable review/validation, not a release waiver or blanket prompt-tuning mandate. Current v5 remains active until authorized revision; an unsuccessful candidate must not be treated as a fix. API-F005 and separate API-F004 remain open. No implementation handoff arises from this approval hold.


## SR-017 — explicit no-import/default-parent decision

User explains that compaction naturally uses the same model as the parent, especially when that is the user's configured provider/key, and says: “Let's just consider that the user never said that before” and “We don't have to have this migration at all.” This explicitly approves abandoning carry-forward of **retired compactor-agent model/generation preferences**, following the prior explanation of that exact trade-off. Do not reinterpret it as permission to delete conversations, historical files or current-format settings.

Approved delta: no old settings import; no new migration for this ticket's settings; parent model/provider at each attempt by default, through the existing availability/credential path. No new key setup solely for compaction. Keep ratio controls. Already-approved optional current model/generation controls remain available and separate from strategy selection; the user's “maybe” wording is not an instruction to add an unrelated temperature UI or require an override. Same model does not mean copying parent system prompts, tools or mutable conversation, nor does it newly approve copying all parent sampling parameters. Unspecified generation options retain selected-model defaults with the existing compaction-owned prompt/output budget constraints.

Existing current-format settings are not erased or provenance-guessed; the removed importer is the only place that reads the old agent configuration. No new default value must be persisted just to make an absent setting valid. Current-format malformed/unsupported selections retain normal settings/attempt errors, never a legacy import gate. These are normal compaction/settings and ordinary upgrade variations within existing scenarios, not a migration-recovery product.

REQ-008/AC-010 amended, AC-012 added; other REQ/ACs and history-preservation DEC-002 unchanged. This targeted approval does not approve candidate-v6, change model support, waive semantic fidelity or authorize a release. No further model calls or production edits this round. The old migration rationale is superseded by this decision; historical approvals and snapshots remain linked.
