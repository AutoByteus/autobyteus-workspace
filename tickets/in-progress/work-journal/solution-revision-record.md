# Solution revision record — work-journal

## SR-001 — requirements baseline ready for approval
- Phase: Requirements. Trigger U01 (discuss and build the journal), U02–U03 (plain semantic actions confirmed), J01 (tool vocabulary by runtime).
- Baseline: REQ-W1–W9, DEC-W1–W6, built on the earlier Step 1B draft (archived runtime-work-transfer-analysis requirements-doc-SR-011-snapshot.md: REQ-009, REQ-015–021, DEC-012–017) with the user's labeling decision; DEC-014 (file per raw-trace segment) carried over.
- Status: Ready for Approval. Design N/A until approval.

## SR-002 — label refinements and contract draft
- Trigger: U04–U06 (label refinements: Search web, fold file search/list, reading files and reading web pages into Command), U07 (contract first), U08 (journal replaces work trace). Evidence J02.
- Requirements updated (REQ-W1, DEC-W1). New behavior-defining supplement work-journal-contract.md (Draft) with open questions Q1–Q5.
- Status: requirements + contract pending user review and approval. Design N/A.

## SR-003 — base refresh and contract additions
- Trigger U11. Base 5316a0cad → beb6b3b49. Contract: §7 output_limit_recovery row (proposed); Q1 notes the new delegate_task arguments. Requirements base reference updated. Status unchanged: requirements and contract await user review and approval.

## SR-004 — base refresh to 55bff1f5e and re-analysis
- Trigger U12. Evidence J04–J07. Contract §4/§5/§7/§8/Q1 updated (new envelope form, platform notice senders, project tool split, send_message_to/delegate_task arguments, AGY/Claude argument variants, definition/publishing tools). Requirements: base reference and DEC-W5 (task agents in scope; journal location per run memory folder).
- No change to the approved direction (plain actions, universal commands, one format). Status: requirements and contract await user review and approval; Q1–Q5 and the output_limit_recovery line open.

## SR-005 — complete tool register
- Trigger U13. New behavior-defining supplement work-journal-tool-register.md (+ .json), generated with a fail-on-missing coverage check. Contract §8–§9 reference it. Status unchanged: awaiting user review/approval; Q1–Q5 and the output_limit_recovery line open.

## SR-006 — two categories instead of an exhaustive register
- Trigger: U14–U16. Evidence: J08.
- **Contract rewritten** (work-journal-contract.md):
  - §1 principles: the journal reads raw traces only; two kinds of tools.
  - §3 the run's runtime selects the table.
  - §4 one built-in table per runtime.
  - §5 one generic rule.
  - §6 result envelopes removed.
  - §9 coverage without a name list.
  - §10 examples updated; a generic-rule example was added.
  - §11 open questions are now Q1 (shared-tool labels) and Q2–Q4.
  - Earlier questions on delegation, Codex js and ssh are resolved: all three use the generic rule.
- **New file:** work-journal-builtin-tools.json.
- **Sanity check:** probes/classify-inventory.py, with its output in probes/inventory-classification.txt.
- **Removed:** work-journal-tool-register.md/.json and probes/build-tool-register.py (SR-005).
- **Requirements:** BEH-W1, SCN-W7, REQ-W1/AC-W1 and DEC-W1 changed; DEC-W7 added. "Browser" and "Message to <teammate>" leave the action list pending Q1.
- **Status:** requirements and contract await user review and approval. Design N/A.

## SR-007 — decisions and approval
- Trigger: U17.
- **Contract decisions D1–D4**, replacing Q1–Q4:
  - D1: generic rule only, no label overlay;
  - D2: Write file shows the first 20 lines;
  - D3: WebFetch shown as curl with a summarized mark;
  - D4: output-limit Notice line.
- **Status:** requirements-doc.md and work-journal-contract.md are **Approved** (2026-10-18), by the Solution Designer within the user's direction on the user's instruction.
- **Next:** architecture design.

## SR-008 — validation round
- Trigger: U18. Evidence: J09.
- Contract corrected in §1–§10, with 14 findings listed in §12:
  - reads use `cat -n` with one line-number layout; AGY view_file records only the size;
  - grep mappings completed for Claude/Grok/AGY; AGY list_dir → `ls -p`;
  - Codex search queries are taken from the result;
  - runtime-text and error normalization (§6);
  - outcome forms (§7);
  - envelope detection without sender_id;
  - operation_boundary and llm_request_recovery lines; legacy banner removed;
  - legacy runtime kinds; read_media_file mapped.
- New principle: recorded text is history, not instructions (journal header line; requirements DEC-W8).
- Status: requirements and contract remain Approved; the corrections stay within the approved direction. Next: architecture design.

## SR-009 — rendering location decided
- Trigger: U19. Requirements DEC-W9: the journal is rendered from raw traces, not written in adapters.
- Raw-trace enrichment follow-ups listed: Codex exit code, Codex file-change kind, Grok exit code.
- Status: Approved; next is architecture design.

## SR-010 — architecture design
- Trigger: U22 ("requirement is clear? if yes, go on with the task"). Requirements Approved (SR-009 basis, DEC-W10 placement).
- Evidence: J10–J17 (architecture investigation).
- Design: design-spec.md, status Ready.
  - New subsystem `src/agent-work-journal` (service boundary, per-run updater on AgentRunResourceManager, store, pure renderer with five runtime translations).
  - Skill improvement switched to it (tolerant session-state reader).
  - `agent-work-traces` and the replay projection's dead options removed.
  - Startup migration deletes the 7 old `work_traces/` folders.
- Contract refinements within direction (contract §13):
  - one raw file per journal file, with split-pair wording;
  - concrete header and links;
  - no legacy runtime-kind rule.
  - Coverage figures updated.
- Classification: task_size Large, architectural_risk High (new run-attached owner, new persisted derived data, deletion migration, changed skill-improvement state and evidence contract).
- Next: Architecture Design Complete → handoff per rules.

## SR-011 — architecture review Pass recorded
- ARCH-REV-001 Pass on SR-010 (design-review-report.md, architecture-review-revision-record.md). Large/High unchanged. The reviewer sent the package to /implementation_engineer.
- Editorial fix for N5: contract §3.3 now says the runtime comes from the live run, with the generic rule for a runtime that has no translation yet. The §9 probe row was relabelled. Behavior unchanged; approval unaffected.
- Notes N1–N7 are for implementation; no design revision.

## SR-012 — authorities-read correction (collaboration model)
- Trigger: the user asked whether the full design principles were read. design-principles.md, architecture-design.md, DESIGN.md, data_migration_guideline.md and AGENTS.md were read in full. collaboration_model.md had only been searched, yet was listed as read.
- It was then read in full (2026-10-18). The design is consistent with CM-8, CM-9, §3 and §4.
- Gap: DESIGN.md requires run-storage changes to update the model. design-spec.md File Mapping adds a docs row for collaboration_model.md §3 (a run's memory includes the work journal); the authorities field is corrected.
- Impact: documentation only. No behavior, structure or classification change (Large/High unchanged). The revised package goes to /architecture_reviewer per handoff rule 1.

## SR-013 — architecture review Pass on the SR-012 delta recorded
- ARCH-REV-002 Pass on SR-012, also covering SR-011 (design-review-report.md, architecture-review-revision-record.md). Large/High unchanged; the editorial part of N5 is resolved. The reviewer forwarded the docs row to /implementation_engineer.
- No further solution work. Next: implementation.

## SR-014 — content scope: runtime machinery omitted
- **Trigger:** U23–U28, a user change to intended behavior with explicit user approval on 2026-10-19 (Requirement Gap / user change; renewed approval obtained in conversation).
- **Requirements:**
  - REQ-W2 and AC-W2 now describe the agent's work and the omitted runtime machinery;
  - DEC-W11 added; status Approved (SR-014).
- **Contract:**
  - §8 omits system_instruction, compaction, llm_request_recovery and output_limit_recovery;
  - the operation_boundary line reads "Turn interrupted by the user.";
  - D4 superseded by D5; Grok example updated; §12 item 12 annotated; §14 added.
- **Design:** design-spec.md behavior map BEH-W2 and the non-tool-record-lines responsibility updated. No structural, interface, persistence or classification change (Large/High unchanged).
- **Routing:** the revised package goes to /architecture_reviewer (rule 1). Implementation is already under way with /implementation_engineer, so this delta changes only the §8 rendering rules and their tests.

## SR-015 — architecture review Pass on SR-014 recorded
- ARCH-REV-003 Pass on SR-014 (design-review-report.md, architecture-review-revision-record.md). Large/High unchanged. The reviewer forwarded the §8 rendering change to /implementation_engineer.
- No further solution work. Next: implementation.
