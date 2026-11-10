# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-002 (Pass), round 1 of implementation | N/A | `Initial Baseline` | SR-002, ARCH-REV-002; CRR/API-REV/DR: N/A | All 12 items implemented on `codex/small-follow-ups-batch-435` (commits `e5ca0e1da7`, `6ca743fee0`); ready for code review |

## Revision Entries

### IR-001 — Twelve follow-ups implemented (baseline)

- Triggering role, report path, and round: architecture reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/design-review-report.md` (ARCH-REV-002, Pass); first implementation round.
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implementation complete for REQ-001…REQ-012 at commits `e5ca0e1da7` and `6ca743fee0` (regenerated web GraphQL types for the digest field's description); implementation-scoped checks in `implementation-handoff.md` § Checks Run.
- Related solution revision IDs: `SR-002`.
- Related architecture-review revision IDs: `ARCH-REV-002`.
- Related code-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…BEH-012; REQ-001…REQ-012.
- Implementation delta: the design spec's change sequence, steps 1–8 (see the handoff's behavior trace and its "Implementation decisions inside the design" list).
- Changed files or areas: `autobyteus-web` (app shell, Nodes probe and words, live-stream lifecycle, five stream owners, five registries, phone navigation/opening/tree/restore/shell, Clipboard sheet, run-list refresh, probe), `autobyteus-server-ts` (root manager inactive digest, GraphQL description, key imports), `autobyteus-collaboration-stream-contracts` (key export, tracked `dist`), `autobyteus-android` (full-screen controller, insets, mapper words, pairing Retry), docs.
- Local validation and result: IMP-01 (reproduction fails on base: MSP-32 and 62 unknown browser errors); IMP-10 full phone probe `Pass` after; IMP-02…IMP-12 in the handoff (all `Pass` after the two fixes recorded there: socket doubles, GraphQL codegen).
- Next recipient or routing: code reviewer (Medium / High route), per `get_handoff_rules`.
- Follow-ups added: FU-004 (the browser's `/favicon.ico` request is answered 401; pre-existing).
- Remaining limitations or risks: see the handoff's Known Risks (emulator checks, the Electron-app check of item 2, item 11's live run, and other cutout devices are for API/E2E).
