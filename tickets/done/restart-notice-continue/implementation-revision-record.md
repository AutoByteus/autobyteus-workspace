# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-sd-to-implementation.md`, round 1 | N/A | `Initial Baseline` | `SR-001`; ARCH-REV `N/A`; CRR `N/A`; API-REV `N/A`; DR `N/A` | Implemented and locally checked; ready for direct API/E2E |

## Revision Entries

### IR-001 — Every platform notice is its own labelled row

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-notice-continue/tickets/in-progress/restart-notice-continue/handoff-sd-to-implementation.md`, round 1
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: see `implementation-handoff.md` (IMP-01..IMP-06)
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: initial implementation of the design
- Approved behavior or requirement IDs affected: BEH-001..BEH-004; REQ-001..REQ-005; AC-001..AC-007
- Implementation delta:
  - The row builder turns notice segments into `notice` items and adds `showsUsage`.
  - The usage total and the witness follow `showsUsage`.
  - New `EventMonitorLatestRow.vue` draws one latest-feed row, moved out of the feed so the feed stays under 500 lines (deviation, see the handoff).
  - The notice component is laid out as a turn and labels every notice.
  - The dead notice branch in `AIMessage.vue` is removed, along with the dead fallback catalog key.
  - New en and zh-CN keys; phone CSS; docs; specs.
  - Phone case MSP-99 and the desktop probe `test:e2e:notice-row-presentation`.
- Changed files or areas: `autobyteus-web` only (see handoff Key Files)
- Local validation and result: IMP-01..IMP-06 in the handoff
- Next recipient or routing: direct API/E2E (`Small`/`Low`)
- Remaining limitations or risks: see the handoff's Known Risks
