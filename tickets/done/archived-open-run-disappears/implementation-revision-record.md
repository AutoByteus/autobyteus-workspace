# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `solution_designer` / `handoff-architecture-design-complete.md` / initial | N/A | `Initial Baseline` | `SR-003`; ARCH-REV `N/A`; CRR `N/A`; API-REV `N/A`; DR `N/A` | Implemented; local checks pass; ready for direct API/E2E validation |

## Revision Entries

### IR-001 — Removing an open run closes it to the workspace empty view

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/handoff-architecture-design-complete.md`, initial implementation round.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Implemented per design spec SR-003. Local implementation checks pass (see handoff).
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: N/A (independent architecture review not selected: Small + Low)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001, BEH-002, BEH-005, BEH-006 (changed); BEH-003, BEH-004 (preserved); REQ-001..REQ-008; AC-001..AC-009.
- Implementation delta:
  - `agentContextsStore.removeRun`: clears the selection when the removed run was selected; the auto-select of another loaded run is removed.
  - `agentTeamContextsStore.removeTeamContext`: clears the selection when the removed team was selected; the select-next-team branch is removed.
  - `agentRunOpenCoordinator`: new exported `ArchivedAgentRunOpenError { runId }`; `openAgentRun` throws it when resume config reports `modelConfigEditability.reason === 'RUN_ARCHIVED'` and `isActive === false`, before any Activity/context/selection/stream change.
  - `pages/chat.vue`: new local `leaveToWorkspace()` (clear selection + `router.replace({ path: '/workspace' })`). The displayed-context vanish watcher leaves to workspace for a stored run instead of re-opening it (draft `temp-*` ids keep returning to New chat; promotion unchanged). `ensureRunOpen` maps `ArchivedAgentRunOpenError` to `leaveToWorkspace()` after the `openGeneration` check.
- Changed files or areas: `autobyteus-web/pages/chat.vue`, `autobyteus-web/stores/agentContextsStore.ts`, `autobyteus-web/stores/agentTeamContextsStore.ts`, `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts`; specs `pages/__tests__/chat.spec.ts`, `stores/__tests__/agentContextsStore.spec.ts`, `stores/__tests__/agentTeamContextsStore.spec.ts`, `services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts`, new `stores/__tests__/runHistoryOpenRunRemoval.integration.spec.ts`.
- Local validation and result: see `implementation-handoff.md` → Local Implementation Checks Run.
- Next recipient or routing: per `get_handoff_rules` (Small + Low → direct API/E2E).
- Remaining limitations or risks: see `implementation-handoff.md` → Known Risks and Frontend Rendered-Result Check.
