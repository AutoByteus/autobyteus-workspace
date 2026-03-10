# API / E2E Testing

- Ticket: `run-history-worktree-live-stream-loss`
- Last Updated: `2026-03-10`

## Acceptance Coverage

| Acceptance Criteria | Evidence | Result |
| --- | --- | --- |
| `AC-001` Clicking a historical team row hydrates/selects a usable team context | `WorkspaceAgentRunsTreePanel.regressions.spec.ts` asserts top-row click delegates through `runHistoryStore.selectTreeRun` with the focused member row | `Pass` |
| `AC-002` Previously opened team rows remain visible while another team is selected | `WorkspaceAgentRunsTreePanel.regressions.spec.ts` asserts the previously selected live team member row remains visible after opening another team | `Pass` |
| `AC-003` Historical selection does not remove the live team context already in memory | Sticky-expansion regression plus unchanged store ownership confirm no live team context removal path was introduced during team-row selection | `Pass` |
| `AC-004` Center team pane and right activity feed stay aligned to loaded focused-member context | Post-change `TeamWorkspaceView.spec.ts`, `AgentTeamEventMonitor.spec.ts`, `ActivityFeed.spec.ts`, and `WorkspaceDesktopLayout.spec.ts` all pass | `Pass` |
| `AC-005` Team member row selection still works for live and historical teams | Existing `WorkspaceAgentRunsTreePanel.spec.ts` member-row hydration test still passes | `Pass` |
| `AC-006` Draft agent runs can be removed before first message | `WorkspaceAgentRunsTreePanel.regressions.spec.ts` asserts local draft-agent removal uses `closeAgent(..., { terminate: false })` and skips persisted delete | `Pass` |
| `AC-007` Draft team runs can be removed before first message | `WorkspaceAgentRunsTreePanel.regressions.spec.ts` plus `agentTeamRunStore.spec.ts` assert local draft-team discard skips terminate/delete APIs | `Pass` |
| `AC-008` Persisted history delete behavior remains unchanged | Existing `WorkspaceAgentRunsTreePanel.spec.ts` persisted delete tests and `runHistoryStore.spec.ts` temp-ID rejection tests still pass | `Pass` |
| `AC-009` Regression coverage exists for team hydration, sticky expansion, and draft removal | New companion regression spec plus updated store spec are green | `Pass` |

## Executed Verification

```bash
pnpm -C autobyteus-web test:nuxt components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/agentRunStore.spec.ts stores/__tests__/runHistoryStore.spec.ts --run
```

Result: `5` files passed, `67` tests passed.

```bash
pnpm -C autobyteus-web test:nuxt components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts components/progress/__tests__/ActivityFeed.spec.ts components/layout/__tests__/WorkspaceDesktopLayout.spec.ts --run
```

Result: `4` files passed, `17` tests passed.

## Notes

- This ticket is frontend-only and does not introduce new backend API surface, so Stage 7 evidence is targeted frontend acceptance coverage rather than new server/API scenarios.
- No browser-harness E2E suite was added in this turn; the acceptance gate is satisfied by focused component/store regression coverage on the exact state paths involved in the bug.
