# Implementation Revision Record — A remote run's title (autobyteus-269)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-implementation.md` (direct route, SR-003) | N/A | `Initial Baseline` | SR-003 | Implemented; to API/E2E |
| IR-002 | Solution Designer, round 2 (SR-004, design `d7c2a3b7ee`), from API/E2E round 1 | F-001 (API/E2E) | `Design Revision Implementation` | SR-004 | Implemented in `2aefde62d5`; to API/E2E |

## Revision Entries

### IR-001 — Title a peer-started run with its delegated description

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/remote-run-title/handoff-implementation.md` (design commit `bbad8d5f38`, SR-003; direct route, Small / Low).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented in `05be574608`; checks IMP-01 … IMP-03.
- Related solution revision IDs: SR-001 … SR-003
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation handoff baseline.
- Approved behavior or requirement IDs affected: BEH-601; REQ-601 … REQ-604; AC-601 … AC-604.
- Implementation delta:
  - `RemoteRunTitles` and the trigger after an accepted work packet in `RemoteMessageReceiver`;
  - `AgentRunService.recordRunTitle` and `TeamRunService.recordRunTitle`, with `recordRunActivity` delegating to them;
  - the composition wiring;
  - tests and docs.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: IMP-01 and IMP-02 pass; IMP-03, the full server unit suite: 6473 tests pass.
- Next recipient or routing: API/E2E (direct route, after the lightweight self-review).
- Remaining limitations or risks: the open-run sidebar overlay noted in the handoff's Known Risks (existing web behavior, out of scope); the two-server assertions and AC-605 remain.

### IR-002 — The window's stored title wins (SR-004)

- Triggering role, report path, and round: Solution Designer, round 2 (design `d7c2a3b7ee`, SR-004, § Window Title Rule), after API/E2E round 1 F-001.
- Triggering finding IDs: F-001 (API/E2E: the sidebar showed the work packet wrapper for an active peer-started Agent run)
- Classification: `Design Revision Implementation`
- Prior authoritative result: IR-001 (`05be574608`); its server change stands with no rework.
- Current authoritative result: implemented in `2aefde62d5`; checks IMP-04 … IMP-06.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: API/E2E round 1 (F-001)
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the window replaced the stored title with the live first user message, which for a peer-started run is the packet.
- Approved behavior or requirement IDs affected: BEH-601 (window), REQ-602 / AC-603 (user-started rows unchanged).
- Implementation delta (`autobyteus-web`):
  - `utils/runTreeLiveStatusMerge.ts`: the live summary only for an empty stored summary;
  - `composables/chat/useStandaloneRunTitle.ts`: stored title first;
  - `stores/runHistoryNavigationPatches.ts` `patchStandalone`: no overwrite of a history row's stored title (a third window writer, not named in the design, under the same rule);
  - `utils/skills/skillRequestInstruction.ts`: `parseSingleLine`; `utils/runTreeSummary.ts`: `resolveStoredTitleSummary`; applied in `utils/runTreeProjection.ts` and the header;
  - docs: `agent_execution_architecture.md` § Workspace History Row Titles;
  - handoff corrections: Assumption 3 and the Known Risk.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: IMP-04 (9 specs, 90 tests; the 4 rule cases fail on the old source), IMP-05 guards, IMP-06 full web suite (4661 tests) pass.
- Next recipient or routing: API/E2E (direct route, Small / Low), including the SR-004 durable browser probe.
- Remaining limitations or risks: the Team navigation patch residual (handoff § Known Risks); the browser probe and the two-server assertions remain with API/E2E.

