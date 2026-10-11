# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial baseline (Project Task `project_task_1c0ac46f…`) | N/A | N/A | Ready for Approval | BEH-001..004; REQ-001..007; AC-001..008 | Presented to the user with DEC-001..004 |
| SR-002 | Requirements | User 2026-10-09: always use the agent's model; approval of the recommendations | N/A | Ready for Approval | Approved | BEH-002, REQ-001, REQ-002, REQ-004, REQ-005 (replaced), AC-005, AC-008; DEC-001..004 resolved | Approved basis for design |
| SR-003 | Design | Architecture design completed | N/A | Approved; no design | Approved; design Ready (Large/High) | All REQ/AC mapped | Routed to architecture review |
| SR-008 | Mixed (Requirements + Evidence + Design) | CRR-005 after API-REV-002 Fail (93 %); user delegation 2026-10-11 | F-3, F-4, F-5 | Approved; design Ready (SR-007) | Approved; design Ready (revised) | REQ-002 (per-model enablement), REQ-003 (v5), REQ-009 (new), AC-003 (scope), AC-008 (revised), AC-011 (new) | Routed to architecture review; follow-up Task requested |
| SR-009 | Design (+ requirements precision) | ARCH-REV-004 (Fail) | ARCH-005, ARCH-006 | Approved; design Ready (SR-008) | Approved; design Ready (revised) | REQ-009 (precise rule), AC-011 (worked examples), REQ-003 / Document Status (v5 single normative) | Returned to architecture review |
| SR-004 | Mixed (Requirements editorial + Design) | Architecture review ARCH-REV-001 (Fail) | ARCH-001, ARCH-002, ARCH-003 | Approved; design Ready | Approved; design Ready (revised) | BEH-001 (preserved isolation), BEH-002, UC-001, REQ-001, REQ-004, AC-001, AC-009 (new), SCN-002 | Returned to architecture review |
| SR-005 | Requirements | User 2026-10-10: summary quality must be tested | N/A | Approved | Approved | AC-003 (strengthened) | Validation scope increased; no design change |
| SR-006 | Requirements | User approval to the implementation engineer 2026-10-11 (IR-002): cached summary instruction rewritten in the agent's own voice | N/A | Approved | Approved | REQ-003 (wording), AC-003 checklist | Recorded; API/E2E informed; no design change |
| SR-007 | Mixed (Requirements + Evidence + Design) | CRR-003 after API-REV-001 Fail (93 %); user decisions 2026-10-11 | F-1, F-2, OBS-1, CR-002 | Approved; design Ready (SR-004) | Approved; design Ready (revised) | REQ-003 (nine-heading contract, normative texts), REQ-008 (new), AC-003 (pass conditions), AC-010 (new); problem/outcome cost corrected | Routed to architecture review |

## Revision Entries

### SR-001 — Compaction prompt-cache reuse requirements baseline

- Phase and classification: Requirements / `Initial Baseline`
- Trigger: Project Task from `/project_task_manager` (follow-up from `anthropic-prompt-caching`)
- Evidence: code read of the compaction pipeline; live probe `probes/fork-summary-probe-result.json` (fork reads 9.4k–10.9k cached tokens vs 8.3k uncached for the separate summarizer; no tool calls; valid summaries); metering gap (no compaction usage events).
- Prior status: N/A. Current: requirements `Ready for Approval`; design not created.
- Intended behavior changed: `Yes` (pending approval).
- Remaining gaps: DEC-001..004; ASM-001.
- Next action: user approval; then architecture design.

### SR-002 — Same-model compaction approved

- Trigger: the user said compaction should always use the agent's model ("if you don't use the same model, then you do not take advantage of the cache … It seems to be like a flexibility, but actually it's not"), confirming the recommendations.
- Changes:
  - REQ-005 now removes the compaction-model setting (UI, server setting, separate LLM creation; saved values ignored);
  - REQ-004: the fallback runs on the same model;
  - REQ-002: all native providers;
  - DEC-001 → A, DEC-002 → A, DEC-003 → yes, DEC-004 superseded.
- Intended behavior changed: `Yes` (approved).
- Next action: architecture design.

### SR-003 — Architecture design

- Phase: Design / `Initial Baseline`.
- `design-spec.md` created. Key decisions:
  - core-owned `CompactionSummarizer` using an agent-provided `ConversationSummaryPort`;
  - cached summary request (the agent's own request + instruction), with a same-model transcript fallback;
  - prefix guard before and after compaction;
  - per-attempt compaction usage events (`autobyteus_compaction`);
  - end-to-end removal of the compaction-model setting and the server-injected strategy/LLM factories.
- Persisted data: leftover setting key inert (`Directly Usable — No Migration`); no other changes.
- Classification: `task_size=Large`, `architectural_risk=High`.
- Handoff: `solution-handoff.md`; route per `get_handoff_rules` → `/software_engineering_team/architecture_reviewer`.

### SR-004 — Architecture review ARCH-REV-001 resolution

- Trigger: `/software_engineering_team/architecture_reviewer` ARCH-REV-001 (Fail, Design Impact). Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
- ARCH-001 (High): each summary attempt now uses its own conversation id `compaction_<operationId>_<attempt>` and releases it through a new provider-neutral `BaseLLM.releaseConversation` (default no-op; `AutobyteusLLM` override calls `client.cleanup(id)`). The agent's session and LLM are untouched. Requirements state the existing isolation as preserved behavior (BEH-001); AC-009 added.
- ARCH-002 (Medium, editorial): requirements aligned with REQ-005 and the recorded approval (BEH-002 row repaired; UC-001, REQ-001, AC-001, SCN-002 and REQ-004 trace corrected); investigation-notes header updated.
- ARCH-003: both port requests pass `retryMode: 'single_attempt'`; REQ-004 states the attempt budget.
- Residuals adopted: the budget check includes the output reservation. Non-Anthropic validation, the server projection test and the summary/tail overlap stay as recorded.
- Intended behavior changed: `No` (restates the recorded decision and preserved behavior; no renewed approval needed).
- Classification unchanged (`Large`/`High`). Next action: architecture re-review.

### Review receipt — ARCH-REV-002 (informational)

- 2026-10-09: `/software_engineering_team/architecture_reviewer` ARCH-REV-002 **Pass** on SR-004. The reviewer routed the package to `/software_engineering_team/implementation_engineer`. Report: `design-review-report.md`.
- Non-blocking N-1 (given to the implementer by the reviewer): release each attempt's compaction conversation in a `finally`, using its own bounded controller rather than the possibly aborted operation signal, and test the abort case.
- DEC-001's option text still mentions "when the compaction model equals the agent model". It is historical and non-governing; REQ-001, REQ-002 and REQ-005 govern.
- No requirement or design change.

### SR-005 — Summary-quality validation strengthened

- Trigger: the user asked about summary quality ("I'm just wondering whether the effect, the summarization effect is good or not … I think this should be tested, right?") after reviewing the exact instruction text.
- Change: AC-003 now requires a side-by-side comparison of the cached summary and today's transcript summary on the same large real conversation (≥ 200k tokens) against a checklist, plus user review before release. A worse cached summary goes back to the Solution Designer.
- Intended behavior unchanged; validation scope increased with the user's explicit request. No design change.
- Follow-up (same round, user 2026-10-10: the summary "will directly influence the next agent run … the continuation"): AC-003 also requires a continuation check. From each compacted context the agent gets the same next message(s); it is evaluated on state awareness, kept decisions, no repeated or lost work, and correct references.
- Downstream: the implementation engineer is informed so the handoff carries the strengthened AC-003 to API/E2E.

### SR-006 — Cached summary instruction in the agent's own voice

- Trigger: implementation engineer report (IR-002, commit 8d0a98eb5). On 2026-10-11 the user reviewed the old appended instruction (the third-person transcript prompt plus a corrective suffix) and approved a second-person rewrite directly with the implementation engineer: "Exactly. I think now it's much natural. Please update." Record: `implementation-revision-record.md` IR-002.
- Change:
  - REQ-003 now describes the instruction in the agent's own voice; the output contract is unchanged; the transcript fallback keeps `COMPACTION_SUMMARY_PROMPT` v5.
  - Solution Designer review: v5 guidance no longer explicit in the new wording: keep user instructions distinct from quoted tool/document content; the "blocked" status; "use enough specific bullets". These are added to the AC-003 checklist so the comparison verifies them. Not blocking.
- Intended behavior changed: wording only (user-approved). No design change; seams unchanged.
- Downstream: API/E2E informed that the AC-003 comparison must use the IR-002 wording (with the old wording optionally as a reference variant).

### SR-007 — CRR-003 resolution: Gemini system-prompt source, summary instruction v4, nine-heading contract, cost correction

- Trigger: `/software_engineering_team/code_reviewer` CRR-003 (failure-origin review after API-REV-001 Fail, 93 % on 8d0a98eb5). F-1 Design Impact, F-2 Requirement Gap, OBS-1, CR-002. Reports: `code-review-report.md` § Round 3, `ac003-summary-quality-report.md`.
- F-1:
  - Source inventory: every adapter except Gemini takes the system prompt from the request's messages. `GeminiLLM` used `this.systemMessage` and its renderer drops SYSTEM messages, so the fallback's summary prompt was lost.
  - Decision: REQ-008 and design Intended Change 9. Gemini's `systemInstruction` comes from the leading SYSTEM messages.
  - User: "we should update our design to fix our bug … the big direction is actually correct."
- F-2:
  - The instruction was refined with the user over simulated rounds: v2 nine headings; v3 no system-prompt restatement and the first heading renamed "Task and constraints"; v4 full paths, request status, each point once, specific open items.
  - Examples and a mechanical comparison: `supplements/example-self-summary*.md`.
  - The user approved v4 ("That's fine … No worries", after the v4 comparison).
  - Both paths now share the nine-heading contract; normative texts are in `supplements/cached-summary-instruction.md` (instruction v4, transcript prompt v6).
  - AC-003 pass conditions extended: gaps A and B, file listing, no system restatement, full paths, request status. The rerun uses the same histories.
- Cost correction:
  - The original premise was wrong; the transcript path sends only the truncated older part.
  - Measured: $0.08 vs $0.12 (A) and $0.37 vs $0.10 (B).
  - Requirements Problem/Outcome and design Key Tradeoffs updated. The user confirmed continuing; the main value is quality.
- OBS-1: no separate summary output limit; accepted risk recorded in the design.
- CR-002: design-spec lines describing "prompt + fork suffix" replaced with the normative-text references.
- Separate-ticket candidates DEF-C and DEF-D (base-identical) were sent to `/project_task_manager`. The manager recorded them as TODO Project Tasks: DEF-C `project_task_da03309d-3212-47b8-a428-4c807076b0cc`, DEF-D `project_task_bb82b2ef-e102-4d1e-92e3-1e14d7f740eb`.
- Intended behavior changed: `Yes`, user-approved: the summary format and texts, and the Gemini system-prompt source. Classification unchanged (`Large`/`High`).
- Next action: architecture review (`get_handoff_rules`).

### Review receipt — ARCH-REV-003 (informational)

- 2026-10-11: `/software_engineering_team/architecture_reviewer` ARCH-REV-003 **Pass** on SR-007. The reviewer routed the package to `/software_engineering_team/implementation_engineer`. Report: `design-review-report.md`.
- ARCH-004 (Low, editorial) was fixed right away as factual corrections, with no change in intent:
  - Out Of Scope and BEH-001 now reflect the approved format change;
  - REQ-003 says "v4, approved";
  - REQ-003's whole-conversation scope is limited to the cached path (the fallback summarizes the compactable part);
  - design § Persisted Data explains why the format change needs no transition.

### SR-008 — CRR-005 resolution: per-model cached summary, output-limit floor, instruction v5

- Trigger: `/software_engineering_team/code_reviewer` CRR-005 (API-REV-002 Fail at 93 % on 1153984ee; no implementation defect). F-3 and F-4 are Design Impact; F-5 is a Requirement Gap. Reports: `code-review-report.md` § Round 5, `ac003-summary-quality-report.md` § Round 2.
- User direction (2026-10-11):
  - "Follow your reasoning skill … make the reasonable decision for me";
  - "we cannot sacrifice every provider";
  - different strategies per model belong in a follow-up ticket;
  - "the main goal is that the cache are being correctly used during compaction";
  - "as long as the DeepSeek … problems [are] fixed … this is accomplished";
  - Gemini quality goes to the follow-up.
- Decisions:
  - REQ-002: the cached summary is enabled per model through the catalog value `compactionSummaryMode`. Anthropic models now; DeepSeek if its v5 rerun passes; everything else, including Gemini, keeps the transcript summary.
  - REQ-009 / Intended Change 11: a summary output-limit floor of 16,384 tokens (capped at the model maximum), through the provider-neutral `LLMInvocationOptions.maxOutputTokens`. This fixes F-3 on both paths and supersedes OBS-1.
  - REQ-003 / Intended Change 12: instruction v5 with self-exclusion, earlier decisions, open doubts, commit hashes and no unseen names or paths. This fixes F-4 and targets the DeepSeek and Opus residuals.
- AC-003 rerun: Opus 5.5, one more Anthropic model and DeepSeek, with v5. AC-008 revised. AC-011 added (1,024-token compaction succeeds; Anthropic cache read unchanged).
- Follow-up Task requested from `/project_task_manager`: model-specific compression strategies, starting with Gemini's cached-note quality. Recorded as `project_task_9bf18aea-19a3-4086-8c86-e84a45bdbf78` (TODO; depends on this Task landing).
- Intended behavior changed: `Yes` (user-delegated). Classification unchanged (`Large`/`High`).
- Next action: architecture review.

### SR-009 — ARCH-REV-004 resolution: safe output-limit rule, single normative v5

- Trigger: `/software_engineering_team/architecture_reviewer` ARCH-REV-004 (Fail). ARCH-005 is High (the floor could make compaction impossible on local models without output metadata; the meaning of `agentLimit` was unclear). ARCH-006 is Medium editorial (normative instruction version conflict).
- ARCH-005, the new rule (REQ-009, design Intended Change 11):
  - R = the agent's resolved limit, `config.maxTokens ?? model.maxOutputTokens`;
  - if R is unknown or ≥ 16,384, there is no override (today's behavior);
  - otherwise L = max(R, min(16,384, model max if known, ⌊context ÷ 4⌋ if known));
  - the reservation follows L.
  - The worked examples (Opus at 1,024 / no limit; Ollama with 8k/32k context, with and without a limit; budget-thinking Sonnet 4.6; DeepSeek) are in the design and in AC-011.
  - This refines the user-delegated SR-008 decision without changing its intent: no model regresses.
- ARCH-006: v5 is the single normative instruction everywhere (supplement header, REQ-003, Document Status, design). v4 and the proposal table are marked as history.
- Non-blocking items adopted: a failed DeepSeek rerun goes back to the Solution Designer rather than API/E2E flipping the catalog value; N-1 still applies.
- Intended behavior changed: no new intent (made precise). Classification unchanged (`Large`/`High`). Next action: architecture re-review.

### Review receipt — ARCH-REV-005 (informational)

- 2026-10-11: `/software_engineering_team/architecture_reviewer` ARCH-REV-005 **Pass** on SR-009, with no open findings. The reviewer routed the package to `/software_engineering_team/implementation_engineer`. Report: `design-review-report.md`.
- Still standing: N-1, and a failed DeepSeek rerun goes back to the Solution Designer.
- No requirement or design change.

### Note — per-model summary output floor deferred (2026-10-11)

- The user proposed making the summary output floor configurable per model, with a global default. After the Solution Designer's assessment (it fits the observed per-model differences: thinking use, note length, small local contexts), the user decided: "If we have a second follow-up task, maybe we can do it there."
- This Task keeps the fixed default `FLOOR = 16,384` (design Intended Change 11). The follow-up Task `project_task_9bf18aea-19a3-4086-8c86-e84a45bdbf78` gets the scope: an optional per-model catalog value `compactionSummaryMinOutputTokens` (next to `compactionSummaryMode`), with a global default of 16,384 and the same caps (model maximum, context ÷ 4, never below the agent's limit).
- No change to the current requirements or design.
- Update (same day): at the user's direction ("create it afterwards after we finish the dependency tickets"), `/project_task_manager` cancelled `project_task_9bf18aea…` for now. It keeps the full scope (Gemini cached-summary quality, model-specific strategies, and the per-model floor `compactionSummaryMinOutputTokens`) and will create the follow-up afresh after this Task lands.
- Correction (same day): at the user's request, `project_task_9bf18aea-19a3-4086-8c86-e84a45bdbf78` is TODO again. It has the full scope, including the per-model floor, and is not dispatched; it depends on this Task landing.

### SR-010 — CRR-006 CR-004 resolution: summary output limit fitted to the room left

- Trigger: `/software_engineering_team/code_reviewer` CRR-006 (IR-004 `13648b147`, Fail with one Design Impact). CR-004 (Medium): the transcript summary request reserves R in its input check but sends L, so for inputs in `(context − L − margin, context − R − margin]` input plus output exceeds the context. This hits the design's own Ollama worked examples and regresses models that compact today. Reports: `code-review-report.md` § Round 6; implementer's note in `implementation-handoff.md` § Important Assumptions (IR-004).
- Prior status: SR-009, ARCH-REV-005 Pass, IR-004 implemented. Current status: design `Ready` (SR-010).
- Root cause: `Missing Invariant`. The REQ-009 guarantee ("no model may lose today's behavior") was not carried into the budget rule. SR-009 reserved L on the cached path only. Reserving L on both paths would trade the overflow for `input_budget_exceeded`, which also blocks compaction.
- Decision (Solution Designer, under the user's SR-008 delegation):
  - L stays the ceiling;
  - each summary request sends `L_eff = max(R, min(L, context − E − margin))`;
  - both paths accept inputs with the agent's own input budget;
  - the "reserve L" budget is removed.

  Effects:
  - the summary always accepts exactly the inputs it accepts today and never sends less than today's limit;
  - the cached path no longer falls back to the transcript just because of the raised limit.
- Changed:
  - `requirements-doc.md`: Document Status SR-010, REQ-009 (rule text), AC-011 (boundary outcome);
  - `design-spec.md`: header, Authorities read (re-read 2026-10-11), Intended Change 11 (fitted limit, budget, owner, why not reserve L, boundary examples table), file mapping row, Guidance § SR-010;
  - `investigation-notes.md` § CR-004 Evidence.
- Affected IDs: REQ-009, AC-011, BEH-001, SCN-001, DS-002.
- Intended behavior changed: no. This restores the approved intent, so no renewed approval is needed (the user delegated these decisions on 2026-10-11).
- Interface impact: none. `ConversationSummaryPort`, the summarizer, the adapters and `LLMInvocationOptions.maxOutputTokens` are unchanged; only `LlmPhaseSummaryPort` internals and tests change.
- Classification unchanged (`Large`/`High` for the package). The SR-010 delta itself is small and local to one owner.
- Still open, API/E2E-owned: CR-001 / C-020 (OLR-E2E-010 must assert the REQ-009 limit and the per-model mode), CR-003, the DeepSeek AC-003 rerun, AC-010 and AC-011 live.
- Next action: per `get_handoff_rules`.


### Review receipt — ARCH-REV-006 (informational)

- 2026-10-11: `/software_engineering_team/architecture_reviewer` ARCH-REV-006 **Pass** on SR-010, no findings. The reviewer recomputed the boundary rows and verified that input + output ≤ context − margin, that no model gets less input or output than today, and that the cached path keeps cache reuse at the boundary. It routed the package to `/software_engineering_team/implementation_engineer`. Report: `design-review-report.md`.
- Implementation note N-2: compute E with the same estimator and the same request contents as the matching budget check. This is consistent with design § Guidance SR-010.
- No requirement or design change.

### SR-011 — CRR-008 resolution: unwrapped summary accepted, cached models final, quality gaps to the follow-up

- Trigger: `/software_engineering_team/code_reviewer` CRR-008 after API-REV-003 (Fail / 92 % on `97fd9a814`). There is no implementation defect.
  - F-6, Design Impact: under v6, Sonnet 5 and DeepSeek drop the summary markers, so the transcript summary is rejected and compaction blocks.
  - F-7, Requirement Gap: DeepSeek fails the REQ-002 quality gate (gap A), but its transcript path was unusable.
  - F-8, Requirement Gap: the Sonnet 5 family check shows gap A.
  - Reports: `code-review-report.md` § Round 8, `ac003-summary-quality-report.md` § Round 3.
- Resolved in round 3: F-3 / AC-011 live, F-4, CR-004 live, C-020, and Opus gap A.
- User direction (2026-10-11): "for this version, we don't overcomplicate things … in the future … the compaction needs to be able to configure it … different types of compaction for different provider, even for different model … for Gemini, let's use the fallback version … use your reasoning skill to do the logical design reasonable design". This is a delegation of the decisions, consistent with SR-008.
- Decisions (Solution Designer):
  - **F-6:** `parseCompactionSummary` also accepts a reply with no markers that is a valid nine-heading summary on its own. The prompt texts are unchanged. Evidence: 5 of the 6 recorded rejected replies pass the unchanged body rules.
    - Rejected alternative: rewording v6, which is model-dependent and needs a new quality round.
    - Rejected alternative: per-model prompts, which belong to the follow-up.
  - **F-7 / F-8:** DeepSeek and all Anthropic catalog models stay `cached_conversation`; Gemini and all others stay on the transcript summary.
  - **AC-003 release bar:** Opus quality, already met; for the other cached models, parse plus cache; transcript acceptance on Sonnet and DeepSeek. Gap A on DeepSeek and Sonnet goes to the follow-up Task `project_task_9bf18aea-19a3-4086-8c86-e84a45bdbf78` (per-model strategies and configuration).
- Changed:
  - `requirements-doc.md`: Document Status, REQ-002, REQ-003, AC-003;
  - `design-spec.md`: header, Intended Change 8 (unwrapped reply) and 10 (DeepSeek final), reuse and file-mapping rows, Guidance § SR-011;
  - `investigation-notes.md` § Round 3 Findings;
  - supplement note (no wording change).
- Intended behavior changed: yes, under user delegation (REQ-002 gate, REQ-003 parse acceptance, AC-003 bar). Classification unchanged: `Large`/`High` for the package; the SR-011 delta is small (parser, one catalog comment, tests).
- Next action: per `get_handoff_rules`. Also tell `/project_task_manager` that the follow-up Task scope gains gap A for DeepSeek and Sonnet 5.


### Receipt — follow-up scope recorded (informational)

- 2026-10-11: `/project_task_manager` added AC-003 gap A (DeepSeek and Sonnet 5 cached notes sometimes state an unchecked claim as fact) to follow-up Task `project_task_9bf18aea-19a3-4086-8c86-e84a45bdbf78` as outcome 2, part of its done condition. It attached durable copies of this record and of `ac003-summary-quality-report.md` (round 3). The Task stays TODO until this Task lands.
- No requirement or design change.

### Review receipt — ARCH-REV-007 (informational)

- 2026-10-11: `/software_engineering_team/architecture_reviewer` ARCH-REV-007 **Pass** on SR-011. It routed the package to `/software_engineering_team/implementation_engineer`. Report: `design-review-report.md`.
- ARCH-007 (Low, editorial), resolved now: the REQ-002 rationale no longer says "Never worse than today, per model". It states the accepted gap-A trade-off for DeepSeek and Sonnet 5 and the follow-up Task. Wording only; no change of intended behavior or design.
- N-3 (residual, non-blocking): a truncated unwrapped reply from a provider that reports completion `'unknown'` (AutoByteus) could still pass validation, because there is no closing marker. Assessment: this is not established as reachable. The validator still needs all nine headings in order with bullets, so a truncation can pass only inside the last section, "Essential references". The loss is then limited to the tail of that section. Accepted as a residual risk; no machinery is added (DESIGN.md rule 1).

### SR-012 — CRR-010 resolution: explained empty section accepted

- Trigger: `/software_engineering_team/code_reviewer` CRR-010 after API-REV-004 (Fail / 94 % on `090353579`, IR-006). F-9, Design Impact: Sonnet 5's transcript summary of history B is never accepted. All 6 replies explain the empty "Files created or changed" section, and the bare-`(none)` rule rejects them. There is no implementation defect. Everything else met the SR-011 bar live (F-6 resolved; cache 96–97 %; the 1,024 scenario passed 3/3).
- Root cause: SR-007 added a heading that is often legitimately empty, while the body rule (older than this ticket) and the v6 wording allow only a bare `(none)`. SR-011 saw this once and wrongly judged it occasional.
- Decision (Solution Designer, under the user's SR-011 delegation): a section is empty when its first line starts with `(none`, optionally with an explanation. Bullets are required otherwise. All other checks are unchanged, and the prompts are unchanged.
  - Rejected: rewording ("write exactly (none) on its own line"). F-6 showed that format adherence to wording is unreliable, and rewording would need a new quality round.
- Changed:
  - `requirements-doc.md`: Document Status, REQ-003;
  - `design-spec.md`: header, Intended Change 8, Guidance § SR-012;
  - `investigation-notes.md` § Round 4 Finding F-9.
- The summary output approach comparison proposal is renumbered SR-013 (still Ready for Approval, pending the user's answer). The supplement is renamed accordingly.
- Intended behavior: REQ-003 parse acceptance widened under delegation. Classification unchanged (`Large`/`High` package); the SR-012 delta is one validator rule and its tests.
- Non-blocking: a server unit test (`native-compaction-terminal-drain.test.ts`) is load-sensitive. It is recorded by code review for delivery's final run.
- Next action: per `get_handoff_rules`.


### Review receipt — ARCH-REV-008 (informational)

- 2026-10-11: `/software_engineering_team/architecture_reviewer` ARCH-REV-008 **Pass** on SR-012. It checked the regex boundaries and routed the package to `/software_engineering_team/implementation_engineer`. SR-013 was not reviewed, because it is pending the user's approval.
- The reviewer lists ARCH-007 as still open. The REQ-002 rationale was already reworded at the ARCH-REV-007 receipt: "Never worse than today, per model" was replaced by the accepted gap-A trade-off. Verified in `requirements-doc.md`, REQ-002 row; the old phrase no longer occurs. It is closed as far as the Solution Designer is concerned.
