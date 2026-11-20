# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-architecture-design-complete.md` (SR-002, direct route) | DI-001 (raised by this round; resolved by SR-003) | `Initial Baseline` | SR-002, SR-003; ARCH N/A; CRR N/A; API-REV N/A; DR N/A | Implemented and validated; DI-001 resolved with no code change; to API/E2E |

## Revision Entries

### IR-001 — Media viewers show the download with its progress; the node declares file lengths

- Triggering role, report path, and round: Solution Designer, `handoff-architecture-design-complete.md` (SR-002, Medium / Low).
- Triggering finding IDs: N/A. Raised: DI-001 (REQ-002's relative paths are not file links in a conversation; see the handoff).
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implemented on `codex/chat-media-path-playback`; see `implementation-handoff.md`.
- Related solution revision IDs: SR-002.
- Related architecture-review revision IDs: N/A (direct route).
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation round of the approved design.
- Approved behavior or requirement IDs affected: REQ-001…REQ-006; AC-001…AC-006 (REQ-002's relative paths: DI-001).
- Implementation delta:
  - Server (commit `02320583a5`): `sendUserFile` sets `Content-Length` from a required `size`; 13 call sites pass the stat size or `null` (D-5).
  - Web (commits `d165d3143a`, and `04034bc797` for the audio spec's names): the progress-reading helper and its two callers (D-1); `loading`/`progress` and the players' order of states (D-2); `MediaLoadingState` (D-3); the phone node-file view (D-4); the audio failure + Retry (D-6); localization; durable probe cases MSP-89 and MSP-90 replacing the scratch MSP-572.
- Changed files or areas: see `implementation-handoff.md`, Key Files Or Areas.
- Local validation and result: see `implementation-handoff.md`, Checks Run (IMP-01…IMP-09).
- Next recipient or routing: Solution Designer (DI-001), which decided by SR-003 (`a301dcf60e`): absolute paths only, relative links FU-003, no implementation change. Then API/E2E (Medium / Low, direct). After SR-003 only MSP-89's comment changed, to cite the decision.
- Remaining limitations or risks: see `implementation-handoff.md`, Known Risks.
