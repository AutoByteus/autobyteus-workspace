# Solution Revision Record — standalone-run-messages-565 (autobyteus-565)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-565 and its screenshot; investigation 2026-11-20 | — | N/A | Ready for Approval | BEH-001…006, REQ-001…007, AC-001…006, DEC-001…005 | DEC-001, DEC-002 put to the founder |
| SR-002 | Requirements | The founder's answers, 2026-11-20 | DEC-001, DEC-002, DEC-004 | Ready for Approval | Approved | DEC-001, DEC-002, DEC-004 | Approved as recommended; paging with "Load more" |
| SR-003 | Design | Architecture design | — | Approved | Approved; design Ready | all | `MessageViewScope`, `relation`, `counterpart` record, paged reader; Large/High |
| SR-004 | Design | ARCH-REV-001 (Fail) | AR-001 … AR-005 | Design Ready, review Fail | Design Ready for ARCH-REV-002 | DS-002, DS-003, DS-004, DEC-002, AC-006 | Parties on live events; publishing commits named; file mapping and collaborators; app-owned exclusion traced; old-line wording corrected |

## Revision Entries

### SR-001 — Messages for standalone runs (baseline)

- Phase and classification: Requirements, `Initial Baseline`.
- Trigger: Task autobyteus-565 (founder via the PM, 2026-11-20, phone screenshot).
- Findings that shaped it: the phone hides Messages for standalone runs; the desktop shows them only with an open delegated run; the stored read and the live feed leave out unrelated and cross-node messages; a cross-node counterpart's node is not recorded for unlinked messages; the PM's history is 5.4 MB.
- Approval: pending (DEC-001, DEC-002 Needs user). Design: not started.
- Next action: the founder's answers, approval, design.

- 2026-11-20 (within SR-001): the founder confirmed paging with "load more" (DEC-004 now his); DEC-001 and DEC-002 still open.

### SR-002 — Approved

- Trigger: the founder, 2026-11-20: paging ("when user click load more you'll load another certain amount of messages", DEC-004) and "I think you understand the project really well. I like your suggestion" (DEC-001 (a): Messages always shows, empty state when none; DEC-002: name with a node chip, node and address recorded from now on, older unlinked cross-node messages show the run ID and "another node").
- Approval: `User`; baseline `requirements-doc.md` SR-002. Next: architecture design.

### SR-003 — Design

- Design spec written (Ready): one view rule (`MessageViewScope`) for live and stored; `relation` replaces 492's `publishToViews`; cross-node and unrelated lines record the counterpart's address and node (optional key; released readers ignore unknown keys, Case 14 checked); paged reader (50, cursor) with counterpart identities; web store paging, desktop "Messages" tab (default stays Activity), phone ⋮ Messages.
- Evidence finding for the founder: older unlinked cross-node messages cannot get a node (nothing recorded it and it cannot be told from a deleted local run): they show the run ID without a chip, instead of "another node" (DEC-002 wording).
- Classification: `Large` / `High`. Next: architecture review.

### SR-004 — ARCH-REV-001 fixes

- AR-001: every publishing commit carries `parties` (both agents' address and node name, known at the commit); the web names an unknown counterpart from them on `append`; the reader falls back to a run-ID identity, so no row vanishes.
- AR-002: publishing commits named: `deliver`; the receiver's `acceptFromRun` (both chains); `commitSentToRemote` and `acceptFromRemote` (own chain); never `commitSentToRun`.
- AR-003: file responsibility mapping; reader and identities in `run-history/services/`; collaborators passed from the composition; the resolver's process instance justified.
- AR-004: DEC-002 and AC-006 corrected (older unlinked lines: run ID, no chip); founder informed 2026-11-20.
- AR-005: application-owned runs have no view (`standalone-agent-run-root-manager.ts:347`), so no Messages.
- Residual: one total order for page, cursor and web sort.
- Next: ARCH-REV-002.
