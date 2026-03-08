# API / E2E Testing

- Ticket: `right-panel-scroll-decoupling`
- Last Updated: `2026-03-08`

## Acceptance Coverage

| Acceptance Criteria | Evidence | Result |
| --- | --- | --- |
| `AC-001` Center monitor stays stable after older tool-card click path | Center shell no longer remains scrollable; direct layout assertion added in `WorkspaceDesktopLayout.spec.ts` | `Pass` |
| `AC-002` Clicking a center tool card still routes to `Activity` highlight flow | Existing code path preserved; fix only changes scroll-owner shells and feed-local scrolling implementation | `Pass` |
| `AC-003` Highlight reveal scrolls only the activity feed viewport | `ActivityFeed.spec.ts` asserts direct feed-container scrolling and no `scrollIntoView` call on the item | `Pass` |
| `AC-004` Shared right-tab shell does not expose redundant outer scrolling | `RightSideTabs.spec.ts` asserts clipped shared shell contract | `Pass` |
| `AC-005` Progress tab internal scroll regions remain usable | `ActivityFeed` retained `overflow-y-auto`; `ProgressPanel` structure unchanged; regression test passed | `Pass` |
| `AC-006` Right-panel resizing and collapse behavior continue to work | No behavioral changes to `useRightPanel` or resize controls; shell-only class changes | `Pass` |
| `AC-007` Transcript auto-scroll semantics remain correct | Existing `AgentConversationFeed.spec.ts` near-bottom vs scrolled-away tests still pass after the layout fix | `Pass` |

## Executed Verification

```bash
pnpm exec vitest run components/layout/__tests__/WorkspaceDesktopLayout.spec.ts components/layout/__tests__/RightSideTabs.spec.ts components/progress/__tests__/ActivityFeed.spec.ts components/workspace/agent/__tests__/AgentConversationFeed.spec.ts
```

Result: `4` files passed, `10` tests passed.

## Notes

- Live browser automation against the running page was partially blocked because the browser MCP environment could not reach the local dev server directly, so executable acceptance evidence for this turn is from targeted component tests plus source-path validation.
