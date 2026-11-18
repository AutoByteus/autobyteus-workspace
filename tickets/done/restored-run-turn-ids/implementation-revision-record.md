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

### IR-002 — SR-002 "One identity per notice" (Design Impact from API/E2E F-1)

- Triggering role, report path, and round: architecture reviewer, `design-review-report.md` ARCH-REV-001 (Pass at SR-002); origin API/E2E F-1 (`api-e2e-execution-coverage-report.md`, API-REV-001) and CRR-001 (failure origin: Design Impact).
- Triggering finding IDs: F-1
- Classification: Design Impact resolved by SR-002; Medium / High
- Prior authoritative result: IR-001 (SR-001 validated: AC-001, AC-003; AC-002 failed: the reminder card twice live, V-03 / V-04)
- Current authoritative result: every platform notice has one id on every copy; the web shows a notice id once; MSP-75 passes.
- Related solution revision IDs: SR-001, SR-002
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: SR-002's steps 1 to 7, with the reviewer's R-1 and R-2.
- Approved behavior or requirement IDs affected: REQ-002, AC-002.
- Implementation delta: preface `notice_id`; notice traces keep `message_id`; each producer one id for its message and its published notice; the external-runtime recorder, projection and three wire routes carry it (contract field required, nullable); the web handler shows an id once; hydration sets it; R-1's two producers send null. SR-001's code kept.
- Changed files or areas: the handoff's "Key Files Or Areas" (SR-002 line). Commits `6517199e36`, `289e3e1539`, `491395b89f`.
- Local validation and result: IMP-05 to IMP-08.
- Next recipient or routing: code reviewer (Medium / High), per `get_handoff_rules`.
- Remaining limitations or risks: notices stored before this change carry no id and are shown as before; the desktop V-04 journey and DEC-003 are API/E2E's.
