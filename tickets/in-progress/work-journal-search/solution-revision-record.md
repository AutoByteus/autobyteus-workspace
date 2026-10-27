# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements, then Design round 1) | Initial coherent baseline after investigation and experiments (2026-10-21 → 2026-10-26) | N/A | N/A | Approved; refined in place the same day (UD-016) | BEH-001 to BEH-005; R-001 to R-016; AC-001 to AC-013; UD-001 to UD-015; DEC-001, DEC-002 | Requirements approved by the user; Product Design requested for the Memory page (R-014); architecture design started |
| SR-002 | Mixed (Product design integrated; requirements refinement; Design round 2) | Product Team: Design Completed, approved by the user 2026-10-26 | N/A | SR-001 Approved | Approved | R-002, R-009, R-013, R-014; UD-017; design § Product Design Integration, Change Scope, Removal Plan, Interfaces, Tool Contract | The complete package goes to architecture review |
| SR-003 | Design | Architecture review ARCH-REV-001: Fail, Design Impact | AR-001, AR-002, AR-003 | SR-002 Approved (requirements); design Needs Revision | Requirements Approved (unchanged); design Ready for re-review | DS-001, DS-003, DS-006, § Meaning Step Rules, § Tool Contract, § Removal Plan | Corrections made; back to the architecture reviewer |
| SR-004 | Mixed (requirements decision; design rule) | Code review CRR-001: CR-003 Requirement Gap; reviewer judgement notes | CR-003 | Requirements Ready for Approval (UD-018 proposed) | Approved (Solution Designer under the user's delegation) | UD-018, UD-019; AC-007; design § Tool Contract (strength, masking order) | Rework round to implementation with CR-001 and CR-002 |
| SR-005 | Design | API/E2E F-001 → code review CRR-003: Design Impact | F-001 (CRR-003) | Requirements Approved; design Needs Revision | Requirements Approved (AC-007 set widened within intent); design Ready for re-review | design § Meaning Strength (SR-005), Interfaces (`nearest`), Tool Contract, Risks; AC-007 | Targeted architecture re-review, then implementation |
| SR-005c | Design | Implementation R-9 escalation on LEAF-IR (IMP-21) | — | Design: merge of a match found by both tiers undefined | Rule B; per-model calibration table | design § Meaning Strength; AC-001 scope note | Back to implementation |
| SR-006 | Mixed (requirements decision by the user; design) | The user's decision UD-020 after the strength calibration rounds (SR-005, SR-005b, SR-005c) showed thin margins | — (F-001 lineage) | SR-005c Approved; implementation paused | Requirements Approved (UD-020); design Ready for Product revision, then targeted architecture re-review | R-002, R-009, AC-007; UD-017 (strength part), UD-019 superseded; design § Match Facts (SR-006), Tool Contract, Removal Plan, Risks, Product Design Integration #4 | Product Team revises the approved spec; then architecture re-review; then implementation |

## Revision Entries

### SR-001 — Memory search over Work Journals: approved requirements baseline

- **Phase and classification:** Requirements, Initial Baseline.
- **Trigger:** Project Task `autobyteus-185` (read in full with `get_project_task` on 2026-10-25 and 2026-10-26; no comments), the user's direction in conversation 2026-10-21 → 2026-10-26, and the Project Task Manager's relayed use cases (2026-10-21/22).
- **Triggering finding IDs:** N/A.
- **Prior authoritative status:** N/A.
- **Current status:** requirements `Approved`; design in progress.
- **IDs affected:** all of `requirements-doc.md`.
- **Scenario basis:**
  - DDNS on this node (`codex_45ce…`, 2026-08-25). The Task's original DDNS story happened on another machine (the user, 2026-10-25), so it is out of reach by design (CM-10).
  - Fresh copy in another workspace (PTM input 2026-10-22).
  - The 31-question known-answer set (private evidence).
- **Why recorded:** the first coherent baseline after the experiments (`memory-search-evaluation-report.md`) and all user decisions.
- **Canonical sections:** `requirements-doc.md` (all); `investigation-notes.md` (all, including Experiment Results, Design Validation, Two-Gate Evaluation, Baseline Without The Index, Scenario sections); `memory-search-evaluation-report.md`; `follow-ups.md` (FU-001, FU-002, FU-003, FU-005).
- **Supplemental artifacts:**
  - `memory-search-evaluation-report.md` (evidence);
  - `probes/` (scripts, public question categories, results by ID);
  - `product-design-request.md` (Product Design brief).
- **Product design evidence:** none yet; requested (R-014).
- **Intended behavior changed:** N/A (baseline).
- **Approval:** the user, 2026-10-26: "do you think we're ready for the design? … If you were ready for the design, please". This followed the consolidated requirements and the additions R-013 (pipeline), R-016 (quality check) and UD-013 to UD-015. Individual decisions are dated in `requirements-doc.md` § Decisions.
- **Supplement versions:** as in this worktree on 2026-10-26.
- **Design or review basis invalidated:** N/A.
- **Task size and risk:** N/A before design completion.
- **Handoff:**
  - Product Design Requested → `/product_team` (the user approved the Product Team for the Memory page design on 2026-10-23); brief `product-design-request.md`. Delegated 2026-10-26 with `delegate_task`: team run `product_team_f4c754df20bf4af0adb9563f9b2e28da`, coordinator `product_ui_ux_designer_6ed6962b6cab4337bd683b3b652952b1`; no separate Task (the Solution Designer works on a delegated Task).
  - Architecture design continues in parallel.
- **Downstream impact:** the Memory page UI follows the Product Team's approved specification; the backend design does not depend on its visual choices.
- **Refinement, same day (2026-10-26, before any design was authoritative):** UD-016, the user. Memory Compactor runs are indexed like any other run, replacing DEC-001. Affected: R-004, R-016, AC-006. Intended behavior changed: Yes, small; approved by the user in conversation.
- **Remaining gaps:** none blocking.
- **Next action:** design spec; integrate the Product outcome; classify and hand off.

### SR-001, Design Round 1 — Architecture Design (2026-10-26)

- **Phase:** Design (first complete architecture design on the approved SR-001 requirements).
- **Artifacts:**
  - `design-spec.md` (new);
  - `investigation-notes.md` § Architecture Investigation Findings (AE-01 to AE-21);
  - `follow-ups.md` (FU-003 narrowed).
- **Key decisions:**
  - new `memory-search` subsystem with one public boundary (`MemorySearch`);
  - indexing pipeline: Find runs → Journals → Text index (contentless FTS5) → Meaning index (journal cards, `EmbeddingIndex`);
  - search: interleaved tiers, grouped per run, newest part first, snippets through the journal service, secrets masked;
  - boundary additions: `WorkJournalTarget.runtimeKind` nullable, journal change notification, journal entry reader and read API, `EmbeddingIndex.nearest`;
  - tool `search_memory` in the manifest pattern (native and MCP; asking run excluded);
  - Memory page API split by subject plus `RUN_FOLDER`;
  - `TaskTeamRootMemorySource` for task teams (UD-008; AE-20, AE-21);
  - removal of the per-run episodic/semantic server path and tabs;
  - `GLOSSARY.md` Memory section.
- **Classification:** `task_size=Large`, `architectural_risk=High` (design § Task Size And Architectural Risk).
- **Product design:** requested; the web mapping completes from the approved Product spec (expected SR-002).
- **Intended behavior changed:** No (realizes SR-001).
- **Design approval:** the user, 2026-10-26: "Yes … show me your data flow spine".
- **Handoff:** `handoff-architecture-review.md` → `/software_engineering_team/architecture_reviewer` (rule: Large/High).
- **Review on hold (2026-10-26):** the user: "you should wait until the product team finished the ui design". The reviewer was asked to hold. The package goes to review once, complete, after the Product spec is integrated (SR-002).
- **Next action:** wait for the Product Team's approved UI/UX design; integrate it (SR-002); then send the complete package to architecture review.

### SR-002 — Product Design Integrated (2026-10-26)

- **Classification:** Refinement (behavior-defining supplement approved).
- **Trigger:** the Product UI/UX designer's Design Completed message (run `product_ui_ux_designer_6ed6962b6cab4337bd683b3b652952b1`). The user approved the UI after four review rounds: "Oh, I think that the UI is correct now. I feel it's good."
- **Supplement:** `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/work-journal-search/ui-ux-spec.md`, VIS-001 to VIS-024, design repository `personal` @ `d01192275c`.
- **Requirements refined (UD-017):**
  - R-002: three strength levels, Strong / Fair / Weak;
  - R-009: search available once the Text index has content;
  - R-014: Browse · Search · Index; run detail Work Journal and Raw Traces; **Working Context removed**; exception-only badges; task-team tag.
- **Intended behavior changed:** Yes (approved by the user through the Product design).
- **Design changed:**
  - answers to the spec's eight open points;
  - `EmbeddingIndex.nearest` relevance in three values;
  - index status shape;
  - journal file listing fields;
  - result subject with `agentDefinitionId`;
  - Working Context removal path (memory view and run-history call);
  - availability with `hasWorkJournal`;
  - `isTaskTeam` and `startedByAgentName`;
  - explicit "embedding model changed" rule;
  - web file mapping.
- **Delegation:** the Product delegation has no Task of its own to close (the Solution Designer works on a delegated Task).
- **Classification:** unchanged, `task_size=Large`, `architectural_risk=High`.
- **Handoff:** `handoff-architecture-review.md` (updated for SR-002) → `/software_engineering_team/architecture_reviewer`.

### SR-003 — Architecture Review Corrections (2026-10-26)

- **Classification:** Design Impact (ARCH-REV-001: Fail; no Requirement Gap; Large/High confirmed).
- **Trigger:** `design-review-report.md` (architecture reviewer run `architecture_reviewer_a0649733ed664b98994f7a77b7dcdce1`).
- **Corrections:**
  - **AR-001:** the Meaning step always syncs the complete card set; when it may run (no download outside the user's click); DS-003 and DS-006 in call order; `nearest` defined for every readiness case; the meaning job after a restart is created by the first search or live update, not at server start.
  - **AR-002:** ordered pointer rule for meaning matches, card parts with line ranges stored, evaluation check.
  - **AR-003:** `memory.generated.ts` keys removed in both languages.
  - **Non-blocking notes R-1 to R-4:** answered in § Review Corrections.
- **Intended behavior changed:** No. Requirements unchanged (SR-002 approval stands).
- **Classification:** unchanged, Large/High.
- **Handoff:** re-review of AR-001 to AR-003 and the sections they touch → `/software_engineering_team/architecture_reviewer`.

### SR-003 Addendum — Architecture Review Pass (2026-10-26)

- **ARCH-REV-002: Pass.** The reviewer delivered the package to `/software_engineering_team/implementation_engineer` (no duplicate forwarding by the Solution Designer).
- **Non-blocking notes applied to the design text (no behavior change):**
  - R-5: an explicit `collection: "notSynced"` result from `nearest`;
  - R-7: matches newest first within a run.
- **R-6 (Work Journal empty-state copy):** to be recorded as a requirements decision with the user's confirmation before code review.

### SR-004 — Code Review Requirement Gap Resolved (2026-10-26)

- **Trigger:** `code-review-report.md` CRR-001 (code reviewer run `code_reviewer_cbd4eb1d7fd64728ac4114c14a22416d`): CR-003 Requirement Gap (the Work Journal empty-state copy); CR-001 and CR-002 are Local Fixes owned by implementation.
- **The user's delegation (2026-10-26):** "you can decide… You don't have to come to me… you propose your recommendations". The Solution Designer decided:
  - **UD-018:** the empty-state copy as built;
  - **UD-019:** the text-match strength is weighted by term rarity, and the off-topic questions must come out only-weak (AC-007 extended). This answers the reviewer's judgement note on off-topic cues.
  - **Design text:** § Tool Contract, the strength rule and the masking order (C-06).
- **Not changed (judgement):** self-references. With the asking run excluded, as the tool does, #1 rises from 11 to 18 and both gates pass either way. Marking self-references stays a later R-016 candidate.
- **Architecture review:** not repeated. No boundary, ownership, contract or persistence changed; the strength rule is internal to `MemorySearchService`, and the targeted code review covers it.
- **Classification:** unchanged, Large/High.
- **Handoff:** the rework round (CR-001, CR-002, UD-018 confirmed, UD-019, C-06) → `/software_engineering_team/implementation_engineer`, then targeted code review.

### SR-004b — Off-Topic Check Refined (2026-10-26)

- **Trigger:** the implementation engineer's Design Impact on the extended AC-007 (`evidence/IMP-15-evaluation-gates-weighted-strength.log`): N01 and N03 failed the off-topic check under UD-019.
- **Finding:** my off-topic questions were not off-topic. "kubernetes" occurs in 301 runs and "打印机" in 9 (counts on the isolated copy, 2026-10-26). Their fair ratings are honest. Raising the fair threshold to 0.5 or 0.6 would give false only-weak notes on Q12, Q29 and Q31 (and Q06).
- **Decision (Solution Designer, under the user's delegation): option (a).**
  - UD-019 stays at 2/3 and 1/3.
  - N01 and N03 are reclassified as partial matches, outside the check.
  - New off-topic questions with key words verified absent: N04 (English, aquarium) and N05 (Chinese, 鱼缸 / 加热棒).
  - AC-007 is refined to off-topic cues verified absent, plus no false only-weak note on answerable questions.
- **CJK weighting:** the implementer may compute term weights for CJK bigrams over Chinese chunks only. Keep it only if N05 then ends only-weak **and** none of the 5 answerable Chinese questions gets a false note; otherwise the gate covers English off-topic only, and CJK weighting becomes a follow-up.
- **Files:**
  - private question file updated; a copy of the previous version is in `queries.before-SR-004b.json` in the private folder;
  - `probes/questions-public.json` updated.
- **Lesson:** a known-answer set's "absent" cases are verified by count before use, like its answers.

### SR-005 — Meaning Strength Rule (2026-10-26)

- **Classification:** Design Impact (code review CRR-003 on API/E2E F-001; owner: Solution Designer).
- **Evidence:** `evidence/api-e2e/F-001-01`, `-02`, `-03`:
  - 8 of 10 gated off-topic cues got 4–10 Meaning/Strong matches;
  - off-topic best 0.745–0.804 (flat, gap ≤ 0.018), real answers 0.890–0.933 (gap 0.10–0.12);
  - the same with LEAF-IR.
- **Decision (Solution Designer, under the user's delegation):**
  - meaning strength = lift over the query's own rank-*k* baseline, owned by `MemorySearchService`, calibrated by the evaluation under three hard constraints (off-topic only-weak; no false only-weak on answerable questions; gates unchanged), verified on Granite and LEAF-IR;
  - `nearest` returns scores only (three-value relevance removed as dead);
  - the Project Task relevance rule is unchanged;
  - the off-topic set widened with API/E2E's verified cues (OT-C1…OT-T3; OT-T2 partial);
  - tool description says when to use the tool (O-1).
- **Not a user decision:** the visible labels and their meaning (Strong / Fair / Weak, the only-weak note) are unchanged; only the calibration behind them changes. The user delegated such decisions (2026-10-26).
- **Follow-ups added:** FU-007 (self-references, O-3), FU-008 (index size, O-2), FU-009 (switch dialog copy, O-4).
- **Classification:** unchanged, Large/High.
- **Next:** targeted architecture re-review (the embedding layer's `nearest` contract and the strength ownership changed), then implementation, then targeted code review and API/E2E for F-001.

### SR-005 Addendum — Architecture Review Pass (2026-10-26)

- **ARCH-REV-003: Pass**; the reviewer delivered to implementation (no duplicate forwarding).
- **Notes applied to the design text (no behavior change):**
  - R-8: two stale `relevance` references fixed;
  - R-9: infeasible calibration is an escalation (Design Impact), never a relaxed constraint;
  - R-10: below full meaning coverage, the coverage note replaces the only-weak note when every match is weak; a partial-coverage evaluation case;
  - R-11: the baseline is computed before the asking run's cards are removed; tested.

### SR-005b — Calibration Escalation Resolved (2026-10-26)

- **Trigger:** the implementation engineer's R-9 escalation (`evidence/IMP-18-meaning-strength-calibration.log`). No k, Ls or Lf met constraint 1, because of OT-T3, whose blocker is a **text** match rated fair.
- **Finding:** OT-T3 ("…sauerkraut supplier contract?") is not off-topic by the SR-004b count rule: "supplier" df 34, "decide" and "contract" present; only "sauerkraut" is absent. Its fair rating is honest.
- **Decision (Solution Designer, under the user's delegation): option (a).**
  - OT-T3 reclassified as partial (private question file).
  - Implement the lift rule with k = 200, Lf = 0.0477 (widest margin, ±0.0057), and Ls in the upper range of the answerable lifts, recorded with margins.
  - Verify on LEAF-IR (download and about 1 h of embedding on the isolated copy); a per-model table only if LEAF-IR fails.
  - Option (b), a new text-tier rule for absent words, is rejected for now: there is no evidence it is needed, and it risks paraphrase questions.
- **Risk recorded:** thin margins (design § Risks); the evaluation re-check and the R-9 escalation stay the guard.
- **EmbeddingGemma 2:** not verified in this ticket (no index; noted).

### SR-005c — Merge Rule And Per-Model Calibration (2026-10-26)

- **Trigger:** the implementation engineer's second R-9 escalation (`evidence/IMP-20`, `IMP-21`). The default model meets all three constraints. On LEAF-IR, Q08 gets a false only-weak note for any values, because a meaning pointer that resolves to a listed text match's lines was dropped (an undefined merge; the IR-001 choice).
- **Decision (Solution Designer, under the user's delegation):**
  - **Rule B for every model:** one match for those lines, with the stronger strength, labelled by the tier that gave it.
  - **Recalibrate:** Granite k 200, Lf ≈ 0.0689 (±0.0078), Ls in the upper range.
  - **LEAF-IR row:** k 20, Lf ≈ 0.0429 (±0.0022). Thin margin and Q14's gate-1 miss are recorded as LEAF-IR limits.
  - **Models without a row:** use the default row, and are reported as unverified.
  - Options (2) and (3) are rejected, because the merge rule must not depend on the model.
- **Visible behavior:** within the approved labels. A match found by both tiers shows the stronger evidence. The gates are acceptance-measured on the default model (AC-001 scope note).

### SR-006 — Strength Labels Removed; Results State Facts (2026-10-27)

- **Trigger:** the user's question "is it really possible to know strong or weak match using embedding?" and decision "yess. lets remove it. otherwise later during testing we still fail" (UD-020).
- **Why:** embedding scores have no reliable absolute meaning; off-topic and real results overlap (F-001; evaluation report § 5.3; `autobyteus-71` FO-001). Three calibration rounds passed the known set only with margins of ±0.0078 (Granite) and ±0.0022 (LEAF-IR), with a model-specific table. A label that a new question or a growing memory can flip is not a behavior we can promise.
- **Origin of the labels (for the record):** the Task asked for "how strong and by what kind of match (text or meaning)"; the Solution Designer carried it into R-002 without challenging feasibility although the evidence was already at hand; the Product design made it three levels (decision 7), approved under UD-017. **Lesson:** a requirement that grades results from embedding scores needs a feasibility check against measured score distributions before it is approved.
- **Requirements:** R-002 (matches carry found words, or no label for a meaning match; no strength), R-009 (a checked note naming query words found in no journal), AC-007 (the note is checked against independent counts). UD-019 and UD-017's strength part are superseded.
- **Design:** § Match Facts (SR-006): `matchedWords`, `wordsNotFound` (an exact `MATCH` per term), the note rule, the incomplete-Text-step rule; the full removal list (strength rules, calibration table, merge rule B, `chunk_vocab`, evaluation checks). Ranking and the gates are unchanged.
- **Product:** the approved spec's decision 7 (strength chips) and the weak-only note need the Product Team's revision before the web part changes.
- **Classification:** unchanged, Large/High. **Next:** Product revision → targeted architecture re-review → implementation (resumes from 9fa2e072ba) → targeted code review → API/E2E re-run of AC-001, AC-002, AC-007.

- **Process lesson (the user, 2026-10-27):** the Solution Designer owns taking the requirements to 100%. It fills in what is missing and challenges, with evidence and an alternative before approval, any requested outcome its investigation shows is infeasible. This applies whoever wrote the requirement. After a second failed fix of the same behavior, it re-examines the requirement instead of tuning again. A skill change was requested from the Project Task Manager (`skill-improvement-request.md`).
  - **Created:** `autobyteus-agents-67` (AutoByteus Agents project, dispatched to the Agent Package Creator), 2026-10-27. **Pending for this side:** once the Project Task Manager reports the package merged, add the AutoByteus case (`autobyteus-185`, UD-020, strength labels from embedding scores) to the product repository's `docs/design-cases.md`; the package keeps a neutral example.

### SR-006 Addendum — Product Revision Integrated (2026-10-27)

- **Product Team: Design Completed**, approved by the user 2026-10-27 ("its done"); design repository `personal` @ `a0b6410395` (revision `a55923a3f2`). VIS-001 to VIS-026 are normative.
- **Integrated:**
  - meaning matches carry no page label;
  - the none-found note without the method sentence (the tool's `note` aligned to it);
  - gray and amber notes, both hidden while the Text step is incomplete;
  - card cleanup (UD-021, page only).
- **Product question answered:** `wordsNotFound` is one list on the whole search response (`MemorySearchResult`), not per run.
- **Requirements:** R-002 and R-009 wording aligned; UD-021 added. **Design:** § Match Facts and § Product Design Integration updated.
- **Next:** targeted architecture re-review (Large/High rule).

### SR-006 Addendum 2 — Architecture Review Pass (2026-10-27)

- **ARCH-REV-004: Pass.** No findings; R-8 to R-11 are obsolete. The reviewer delivered to implementation (no duplicate forwarding).
- **Notes applied (design text, no behavior change beyond what is stated):**
  - R-12: one wording, no label for a meaning match;
  - R-13: the live-debounce window accepted and documented ("no indexed journal"), not suppressed; a unit test;
  - R-14: the evaluation's independent count is tokenizer-aware; off-topic key words are single tokens;
  - R-15: the asking run's journal counts for absence; a unit test.
- **Design case:** `design-case-entry.md` goes into `docs/design-cases.md` at finalization (the Project Task Manager's request; skill change `autobyteus-agents-67`).
- **R-010 reviewed (UD-022, 2026-10-27):** kept on measured evidence (Q26–Q29). The tool description now says "open a run's first match (its newest)" instead of "the best match", because without grades "best" has no meaning within a run.
