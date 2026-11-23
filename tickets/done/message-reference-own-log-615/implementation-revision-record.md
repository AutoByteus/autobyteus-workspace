# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record indexes the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-001 (pass); SR-002 from the Solution Designer during implementation | N/A | `Initial Baseline` | SR-001, SR-002, ARCH-REV-001 | Implemented; handed to code review |

## Revision Entries

### IR-001 — One reader of a view's messages, one reference route, one web link builder

- Triggering role, report path, and round: the architecture reviewer, `design-review-report.md` (ARCH-REV-001, Pass, notes N-1 to N-3), round 1. SR-002 from the Solution Designer added AC-007 and the F13–F15 move to the test plan; the design is unchanged.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: `implementation-handoff.md` at this commit. Code commits `aff155fceb` (server), `1b1be2e822` (web), `0629b5c631` (AC-007 E2E).
- Related solution revision IDs: SR-001, SR-002
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: REQ-001 to REQ-006; AC-001 to AC-007 (AC-008 is the API/E2E engineer's); BEH-001 to BEH-005; SCN-004.
- Implementation delta:
  - `RunViewMessagesReader` extracted, without `records` or `delegatedRunAgents` in the participant reader's constructor (N-1).
  - `MessageReferenceContentReader` and the one route `GET /rest/collaboration-messages/:rootKind/:rootRunId/messages/:messageId/references/:referenceId/content`.
  - The kind-neutral `messageReferenceId` (N-2).
  - The three routes, two services, `resolveReference` and `projectMessage` removed.
  - Web: `participantMessagesView` returns `referenceContentPath`, and the hand-written links are removed. The viewer reads the 404's `code` (DEC-003, en and zh-CN). The phone prefix is updated.
  - The permanent AC-007 E2E.
- Changed files or areas: `implementation-handoff.md`, "Key Files Or Areas".
- Local validation and result: IMP-01 to IMP-14 in `implementation-handoff.md` "Checks Run". All pass, or have an explained failure outside this change: FU-002, the TMPDIR form; FU-003, three E2E files that fail on the base. Each check has a negative control that fails as expected: IMP-10, IMP-12, IMP-14. Rendered on the desktop (IMP-07) and on the phone (IMP-08, N-3).
- Next recipient or routing: `/code_reviewer` (Medium / High).
- Remaining limitations or risks: the handoff's Known Risks (one view read per click; an unreadable view answers 500), and the six notes on deviations from the design's file list.
