# Solution Revision Record — autobyteus-316

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Evidence + Requirements baseline) | Task autobyteus-316; conversation with the user 2026-10-27/29 (relay of colleagues, summary per journal) | F-01…F-14 | N/A | Requirements Draft; no design | BEH-001…005, REQ-001…009, SCN-001…005 | Baseline and recommendation |
| SR-002 | Requirements | The user chose the central model on 2026-10-29: the next colleague reads and summarizes, one `run_summary.md` per run | DEC-1…DEC-6 | Draft | Approved (Solution Designer within the direction, user informed) | REQ-001…009, AC-001…007 | Requirements approved; design next |
| SR-003 | Requirements | User, 2026-10-29: one agent, runtime is a setting; switch it on the stopped run and chat | DEC-1, DEC-4 | Approved (SR-002) | Ready for Approval | BEH-001…006, REQ-001…011 | Same-run design; DEC-3, DEC-4 need the user |

## Revision Entries

### SR-001 — Baseline: hand-over to a new linked run, fact-based note first

- Classification: Initial Baseline
- Trigger: the Task, plus the user's framing in my conversation: each runtime is like a colleague who leaves the work journal; the next colleague continues; a summary per journal as the hand-over with details readable on demand; "the memory part is not completely done" (a runtime-neutral summary layer is missing, F-12).
- Challenges raised from evidence: (1) the journal alone is not enough: it cannot say why the run stopped (F-04), omits reasoning and open-call results (F-02), and is too large to hand over (F-03); (2) changed files cannot be read from notes (F-10b); (3) the stopped runtime cannot write the summary at the failure.
- Intended behavior changed: N/A (baseline). Approval: none yet.
- Next action: answer D-1…D-3 with the user; finish U-1…U-5; then design.

### SR-002 — Requirements approved within the direction

- Trigger: the user's messages of 2026-10-29: the next colleague summarizes from a starting message (DEC-2, his decision); a specific summary file per run (DEC-6, location adjusted by the designer because `work_journal/` is derived and deletable).
- Approval: Solution Designer within the direction; user informed in the conversation. No decision changes scope or conflicts with his words.
- Intended behavior changed: requirements written from the Task and the user's model.
- Design: not started. Next action: architecture investigation (U-1, U-2, U-5), then `design-spec.md`; the user approves the design before any build.

### SR-003 — Same agent, runtime switched in the run's settings

- Classification: Requirement Gap (user change to intended behavior)
- Trigger: the user's message of 2026-10-29: the user sees one agent; the runtime is like the model; stop, select another runtime, chat; no "continue" action.
- Prior: SR-002 Approved (new linked run, Continue action). Current: Ready for Approval; SR-002's approval does not cover this version.
- Changed: DEC-1 reversed by the user; BEH-001…006; REQ-001, 002, 010, 011 added or changed; trigger removed (no Continue button).
- Evidence added: F-15, F-16, F-17; U-6.
- Design: not started. Next action: user answers DEC-3 and DEC-4; then architecture investigation (U-1, U-2, U-6) and design.

### SR-003 note (2026-10-29)

- The user's model: one run, several backends contributing in turn to the same raw traces and journal. REQ-010 refined: a switch record inside the single stream drives the journal's per-record runtime, the chat marker (REQ-011) and the journal notice; no raw-trace rotation at a switch (replaces the earlier file-level idea). Still `Ready for Approval`; DEC-4 open.

### SR-003 note 2 (2026-10-29)

- The user left stream-versus-rotation to the simpler option. Decided DEC-7: rotate at the switch via the existing primitive; REQ-010 replaced (the in-stream idea of the previous note is withdrawn). DEC-4 still open.

### SR-003 note 3 (2026-10-30)

- The user: the agent may read the journal and summarize, "but we do not limit it". The `write_run_summary` tool, its size limit, header and headings are dropped; the notice only gives facts and pointers (contract 3.5, 3.7; REQ-002, REQ-005, REQ-006, DEC-2, DEC-6). I-9 reduced. Still `Ready for Approval`; DEC-4 open.

### SR-003 note 4 (2026-10-30)

- The user: do not repeat the last user message in the notice (the agent can read the journal; the user's message follows); describe the journals' format and order instead; say "previous agent", not "colleague". Contract 3.7 and REQ-002 updated. Still `Ready for Approval`; DEC-4 open.

### SR-003 note 5 (2026-10-30)

- The user: the reason a run stopped is not needed. DEC-5 reversed: no stop reason recorded, shown or sent. Removed: `pendingRuntimeSwitch.stopReason`, the record's `stop_reason`, the notice line, BEH-004, REQ-009, AC-005. Effect: FU-001 (failed-turn trace record) is no longer needed by this ticket; autobyteus-314 may still need it for the Model Router. Still `Ready for Approval`; DEC-4 open.

### SR-003 note 6 (2026-10-30)

- Journal neutrality (Task comment of 2026-10-30; user decisions): describe what was done in neutral words, not by tool name; converters live inside the journal module as independent strategies (no change to tools or runtimes); the existing contract's D1 (no labels for shared tools) is reversed. New supplement: `journal-neutrality-analysis.md` (evidence) and `work-journal-neutral-vocabulary-contract.md` (proposal; wording is the user's). Not yet part of an approved requirements baseline: it needs the user's wording decisions (N-1…N-5) and his go on scope (first slice N0 only, or N1).

### SR-003 note 7 (2026-10-30)

- The user delegated the neutral-vocabulary wording decisions ("you know the best"): N-1…N-6 decided as recommended and N-7 added: no migration, renderer revision bump, fingerprint includes the revision (`work-journal-neutral-vocabulary-contract.md` §10). The neutral-vocabulary work is a separate piece from the runtime switch and can be built first; the user still approves the design before any build.

### SR-004 (2026-10-30) — requirements approved within the direction; design started

- Trigger: the Project Task Manager relayed the user's decision on DEC-4 (first delivery = a single standalone Agent; "we should work on it now"), with the instruction to run the folder test on a copy, write the design for the user's approval before any build, record the team case as a follow-up, and keep "the user has verified" out of Done-when.
- Prior status: requirements `Ready for Approval` (SR-003), DEC-4 open. Current: requirements `Approved` (Solution Designer within the direction; the user is informed in my message presenting the design). Design: `design-spec.md` written, `Draft` until the user approves it.
- Changed in `requirements-doc.md`: status and approval; first delivery scope (single standalone Agent; members, Org members, delegated copies, application-/system-owned runs out, REQ-013); REQ-001 (fresh-selection validation, pending switch, undo), REQ-002 ("previous agent"), REQ-007 (settings no longer show sizes, DEC-10), REQ-010 rewritten (switch made at the first input; marker + rotation, retry-safe), REQ-012 added (journal file translated with its own raw file's runtime), REQ-013 added; BEH-007, SCN-006, AC-009 added; DEC-4 decided by the user, DEC-8…DEC-10 decided by me.
- Evidence: investigation notes F-23…F-32 (folder test reproduced; journal per-file runtime needed and measured safe on 823 of 825 real journals; settings, activation, notice and web seams read).
- Contract: `run-runtime-switch-contract.md` v2 (marker as a platform notice record, boundary type `runtime_switch`, per-file journal runtime, pending switch holds the whole previous binding).
- Follow-ups recorded: FU-003 (teams, Org members, delegated copies), FU-004 (agent-/Router-started switch), FU-005 (order with the restart notice).
- Approval impact: the requirements basis is approved; the DESIGN needs the user's approval before any build (Task constraint). Remaining gaps: U-2 (file tool access per runtime) and U-4 (quality of a real continuation) are checked in the real run.

### SR-004 note 1 (2026-10-30)

- The user: no round summary for now ("I don't want to have complexity"). Removed: the optional `run_summary.md` (contract 3.5, I-9, layout line), the notice line pointing at it, REQ-005 (withdrawn), BEH-003 (withdrawn), UC-003, AC-003, DEC-6 (withdrawn), follow-up FU-002 (a system-made summary is not asked for). DEC-2 now says: no summary tool, no summary file, no limits. Contract sections renumbered (3.5 = files of one backend, 3.6 = hand-over notice, I-9 = journal runtime per file). Intended behavior narrowed, not widened; design status stays `Draft` (awaiting the user's approval).

### SR-004 note 2 (2026-10-30) — design audited against the design principles

- Trigger: the user asked for a strict check of the design against the design principles (future use: the Model Router moving the same agent to another runtime when a limit is reached).
- The user also closed U-2/U-4: every runtime can read files with a shell command; the notice only says where the journals are; continuation quality is the model's work. Withdrawn: REQ-008 (excerpt fallback), BEH-006, SCN-004; no quality claim remains.
- Audit result (design-spec.md, section "Design Principles Check"): 7 corrections — agent runtime names per GLOSSARY.md (no short forms) in marker, notice and requirements; DS-001 owner "A + B" fixed; dependency direction fixed with two ports owned by agent-execution; one owner for the switch's key/names/marker sentence (`runtime-switch.ts`); previous binding is a `Pick` of the metadata type; activation branches on the explicit pending field, not on a missing session ID; "crash" tests replaced by failure-and-resend tests (process crash is not a supported scenario). Also a premise fixed: the `persistAndPublish` retry check is prepared-run-only (design now passes it in). Two documented vocabulary discrepancies for the user (stored runtime spelling: FU-006; `ModelConfig` in the edit's names: FU-007). New words added to GLOSSARY.md in the same change.
- Approval impact: intended behavior narrowed only; requirements stay `Approved`; design stays `Draft`, awaiting the user.

### SR-004 note 3 (2026-10-30)

- The user: the next agent does not need to know the previous or its own agent runtime. The hand-over notice no longer names any agent runtime or model, and the file list shows file, period and size only (contract 3.6; REQ-002; `listJournalFiles` unchanged). The chat marker for the user still names both runtimes and models (DEC-3). Intended behavior narrowed; design stays `Draft`.

### SR-004 note 4 (2026-10-30)

- The user: remove the "Not in the journals" lines (the previous agent's private reasoning, results of tool calls still running). Removed from the hand-over notice (contract 3.6); REQ-006 withdrawn; REQ-002 and AC-004 updated. Intended behavior narrowed; design stays `Draft`.
