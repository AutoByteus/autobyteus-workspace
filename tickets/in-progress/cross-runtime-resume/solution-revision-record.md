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
