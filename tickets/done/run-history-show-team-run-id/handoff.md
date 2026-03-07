# Handoff Summary

## Delivered Changes

- Team run-history row primary label now displays `teamRunId` instead of team definition name.
- Team ordering in history tree is now stable and no longer dynamically re-sorted by `lastActivityAt`.
- Added regression tests for:
  - team row run-id label rendering,
  - stable team order regardless of activity timestamps.

## Validation

- Command run:
  - `pnpm -C autobyteus-web exec vitest --run stores/__tests__/runHistoryStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- Result:
  - `2` test files passed, `45` tests passed.

## Final State

- Acceptance criteria status: all passed (`AC-001`..`AC-005`).
- Docs impact: no impact.
- Ticket location remains `tickets/in-progress/` pending explicit user completion confirmation.
