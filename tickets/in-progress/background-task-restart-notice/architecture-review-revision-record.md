# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete, part 1 (Medium, High), 2026-11-17 | SR-001, SR-002 | N/A | Fail (Design Impact; one Requirement Gap) | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2 / SR-003 revision for ARCH-REV-001, 2026-11-17 | SR-003 | Fail | Pass | AR-001, AR-002, AR-003 resolved |
| ARCH-REV-003 | Round 3 / SR-004: DEC-008 reminder wording after an unexpected stop (from CRR-002 / API-E2E F-1), 2026-11-17 | SR-004 | Pass | Pass | None |

## Revision Entries

### ARCH-REV-001 — Part 1 initial review: sound structure, every recorded run must be told exactly once

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/design-review-report.md`
- Review round and trigger: round 1; `architecture-design-handoff.md` from the Solution Designer
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` (SR-002); N/A
- Relevant solution revision IDs: SR-001, SR-002
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: baseline. Behavior basis confirmed; Medium / High confirmed. Ownership, cause rule, reminder service wiring (Principle 16), persisted-data decisions and the empty indirection check pass. Findings:
  - AR-001: an update entry whose run takes input first gets no reminder (resumer L140/L166; the design excludes that case);
  - AR-002: the previous session can be lost to `record()` before the take (merge removed; cleanup installed before the take) or while it is held only in memory until after listen;
  - AR-003: requirements ACs still ask to name tasks, against DEC-003.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001, AR-002, AR-003
- Material classification changes: None
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: R-1 to R-5 in the report; AR-001 may become a question for the user if REQ-005 is read as "no message at all after other input"

### ARCH-REV-002 — SR-003 re-review: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/design-review-report.md`
- Review round and trigger: round 2; Solution Designer's SR-003 (`architecture-design-handoff.md` "Round 2 (SR-003)")
- Triggering role, report path, and finding IDs: Solution Designer, `solution-revision-record.md` SR-003; AR-001, AR-002, AR-003
- Relevant solution revision IDs: SR-003
- Prior authoritative decision: Fail (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: one delivery path through the reminder service (every entry pending at the take; wake claims; first input carries it); durable take before `setCleanup`; `record()` inert before `startSession()`; requirement text aligned with DEC-003 and REQ-005 clarified within DEC-001 B.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open | Resolved | SR-003; design DS-002/003/004, Interface rows (`claim`, `settleClaim`); REQ-005, AC-004 | Traced: input first → preface, claim null, no post; wake first → claimed, NOT_FIRST/failed → returned; exactly once |
| AR-002 | Open | Resolved | SR-003; DS-002 ordering, recorder ownership rule, ordering example | Take after `buildStudioServer` and before `setCleanup`; reminders persisted before the record is removed; `record()` inert before `startSession()`, waits for an in-flight tick |
| AR-003 | Open | Resolved | SR-003; requirements outcome, observable definition, AC-001, AC-003, AC-004 | Text matches DEC-003; AC-003 states the per-runtime check |

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: implementation engineer (primary); Solution Designer (informational)
- Remaining risks or uncertainty: R-3 (part 2), R-4, R-5, R-6 (disk failure at the take), R-7 (two stale file-mapping cells)

### ARCH-REV-003 — SR-004 re-review (DEC-008 wording): Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/design-review-report.md` (section "Round 3 (SR-004) Delta")
- Review round and trigger: round 3. Validation found a Requirement Gap (code review CRR-002, API/E2E F-1, `evidence/API-05-14-restart-suite/RR-02.json`): after a server SIGKILL a native background command survives while the reminder said it was stopped. The user decided DEC-008 (a): a cause-specific line.
- Triggering role, report path, and finding IDs: Solution Designer, `solution-revision-record.md` SR-004; CRR-002 / F-1 (not an architecture-review finding)
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: Pass (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result: the text-only change in `restart-notice.ts` is checked against RR-02. After a server SIGKILL only the server dies and the anchor exits on disconnect, so the background form's shells survive with the command. The pid the agent holds is findable with `ps`, and `kill <pid>` still stops the group. Structure, spines, interfaces and stored shapes are unchanged. FU-004 (stop survivors at the next start) is correctly a follow-up.

#### Prior Finding Resolution

None open (AR-001 to AR-003 were resolved in ARCH-REV-002).

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: implementation engineer (primary); Solution Designer (informational)
- Remaining risks or uncertainty: R-8 (REQ-002, BEH-001 and UC-001 text still say tasks "were stopped" for every cause; DEC-008 governs the text); R-3 to R-7 as before
