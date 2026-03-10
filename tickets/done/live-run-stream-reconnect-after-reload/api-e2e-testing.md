# API / E2E Testing

- Ticket: `live-run-stream-reconnect-after-reload`
- Last Updated: `2026-03-10`

## Acceptance Coverage

| Acceptance Criteria | Evidence | Result |
| --- | --- | --- |
| `AC-001` After reload, each active single-agent run reconnects to its live stream without a new send action | `stores/__tests__/runHistoryStore.recovery.spec.ts` recovers a history-reported active agent run into live context and reconnects an existing local active agent context in place | `Pass` |
| `AC-002` After reload, each active team run reconnects to its live team stream without a new send action | `stores/__tests__/runHistoryStore.recovery.spec.ts` recovers a history-reported active team run into live context and reconnects an existing local active team context in place | `Pass` |
| `AC-003` Selecting a recovered active run renders against live-updating monitor state | `stores/__tests__/runHistoryStore.recovery.spec.ts` ensures background recovery does not require selection; `components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` and `components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts` remain green against focused-member conversation state | `Pass` |
| `AC-004` Reconnected active team runs keep activity and middle-pane conversation aligned to the same focused member | `stores/__tests__/agentTeamRunStore.spec.ts` + `services/agentStreaming/__tests__/TeamStreamingService.spec.ts` validate context reattachment; `components/progress/__tests__/ActivityFeed.spec.ts` and `components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts` remain green | `Pass` |
| `AC-005` Inactive history reopen remains projection-only and non-streaming | Existing `stores/__tests__/runHistoryStore.spec.ts` inactive history-open coverage remains green, and `stores/__tests__/runHistoryStore.recovery.spec.ts` asserts inactive rows do not trigger recovery connections | `Pass` |
| `AC-006` Regression coverage exists for the split path that previously allowed activity updates without middle-pane conversation updates | New recovery store spec plus team-stream context-reattachment tests cover the lost-live-monitor failure chain directly | `Pass` |
| `AC-007` Recovery remains correct with bounded frontend retention | Recovery coverage uses existing store/component surfaces without changing retention ownership; no regression was introduced in monitor/activity suites | `Pass` |

## Executed Verification

```bash
pnpm -C autobyteus-web test:nuxt stores/__tests__/runHistoryStore.spec.ts stores/__tests__/runHistoryStore.recovery.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/agentRunStore.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts components/progress/__tests__/ActivityFeed.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts --run
```

Result: `8` files passed, `56` tests passed.

## Notes

- This ticket is frontend-only, so Stage 7 evidence is targeted store/component regression coverage on the exact recovery and rendering paths rather than a new server/API or browser-harness suite.
- I did not run a packaged Electron click-through in this turn. Manual desktop verification is still the final confirmation step for the original reload symptom.
