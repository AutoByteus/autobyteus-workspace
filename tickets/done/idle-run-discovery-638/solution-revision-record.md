# Solution Revision Record — autobyteus-638

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial investigation and options report | N/A | N/A | Ready for Approval | BEH-001..004, REQ-001..007, DEC-001..007 | Sent to the founder for DEC-003, DEC-005 |
| SR-002 | Mixed | Founder's alternative (bring idle runs back after a restart), approved 2026-11-24; design | N/A | Ready for Approval | Approved; design Ready | All REQ/AC rewritten; DEC-002..005 | Medium / High; to architecture review |

| SR-003 | Design | ARCH-REV-001 Fail (Design Impact) | AR-001; residuals R-1..R-3 | design Ready (SR-002) | design Ready (SR-003) | REQ-001, REQ-002, SCN-002, DEC-003 | Restore window owned; to ARCH-REV-002 |
## Revision Entries

### SR-001 — Investigation, cause and options

- Phase and classification: Requirements, Initial Baseline
- Trigger: autobyteus-638 from `/project_task_manager`, with the founder's comment of 2026-11-24
- Current status: Ready for Approval; no design (the Task requires the founder's approval first)
- Finding: the cause differs from the Task's premise. The user's Project Task Managers were unloaded by the restart for the 1.5.14 update; the 10-minute timer applies only to delegated runs (investigation-notes §1). The founder's direction still fits
- Needs user: DEC-003 (a run the person stopped), DEC-005 (the tool's name)
- Next action: the founder's decisions, then the design (the data contract first)

### SR-002 — Approach B: a restart keeps a person's runs running

- Phase and classification: Mixed, Requirement change by the user, then design
- Trigger: the founder asked whether idle runs could be brought back after a restart, then approved "the simple approach … earlier it's idle, after restart it's also idle" (2026-11-24, this conversation)
- Prior status: SR-001 Ready for Approval (approach A)
- Current status: requirements Approved SR-002 (rewritten); design-spec.md Ready
- IDs affected: all requirements rewritten (REQ-001..005, AC-001..006, SCN-001..003). SR-001's DEC-003 (a person's Stop) and DEC-005 (the tool rename) are moot
- Intended behavior changed: Yes. The founder approved it
- Decision within the direction: DEC-003. Only the runs that were running at the stop come back, not every unarchived run (memory ≈270–330 MB per runtime process, notes §3a). The founder's words describe exactly this. I had offered the other variant first; the founder is told and can switch
- Classification: Medium / High (startup lifecycle on every node; a new transient record; resource use)
- Next: architecture review

### SR-003 — The restore window has an owner (ARCH-REV-001)

- Phase and classification: Design, Design Impact
- Trigger: ARCH-REV-001 AR-001. `take()` removed the file before the background restore, and the recorder recorded only live roots, so a stop or crash mid-restore lost the runs not yet brought back
- Change:
  - `take()` reads without removing, and the taken runs are `pending` in the restorer until each is restored, skipped or failed;
  - the recorder, still the only writer, records `running ∪ pending`, also in its final write.
  - Residuals taken in:
    - R-1: the final write awaits in-flight startedByPerson reads, bounded at 1 s;
    - R-2: an `error` entry agent is recorded and comes back (documented);
    - R-3: `agent_org` roots are skipped explicitly.
  - New walk 4b and the AR-001 test.
- Intended behavior changed: No (makes REQ-001/SCN-002 hold)
- Classification: unchanged, Medium / High
- Next: ARCH-REV-002
