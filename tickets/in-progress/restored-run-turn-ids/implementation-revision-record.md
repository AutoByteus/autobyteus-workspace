# Implementation Revision Record — autobyteus-526 (`restored-run-turn-ids`)

### IR-001 — Round 1: unique turn ids across restores; the reminder card's local time

- Triggering role, report path, and round: Solution Designer, `handoff.md` / `design-spec.md` (SR-001), round 1.
- Triggering finding IDs: N/A (first implementation)
- Classification: Medium / Low, direct route
- Prior authoritative result: none
- Current authoritative result: a restored native run continues its `turn_NNNN` numbering after its stored turns; the restart reminder card shows its time in the viewer's zone (agent text UTC).
- Related solution revision IDs: SR-001
- Related architecture-review, code-review, API/E2E, delivery revision IDs: N/A
- Why this implementation revision is recorded: the round's implementation.
- Approved behavior or requirement IDs affected: BEH-001 to BEH-003; REQ-001 to REQ-003.
- Implementation delta: `TurnTracker.continuingAfter`; `MemoryManager` seeds from the stored corpus it reads once; `utils/restartReminderLocalTime.ts` and the card's reminder branch; tests; two doc passages.
- Changed files or areas: listed in the handoff's "Key Files Or Areas". Commits `10217e9a0b`, `cbea910d08`.
- Local validation and result: IMP-00 to IMP-04 (red on base / green; typechecks; autobyteus-ts unit; server and web suites; rendered card).
- Next recipient or routing: API/E2E engineer (Medium / Low), per `get_handoff_rules`.
- Remaining limitations or risks: runs restored before the fix keep duplicate stored ids (DEC-003, report in validation); AC-002 is live validation.
