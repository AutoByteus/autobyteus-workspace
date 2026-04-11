# Handoff Summary

- Ticket: `memory-projection-layer-refactor`
- Last Updated: `2026-04-11`
- Stage: `10`
- Current Status: `Released in workspace version 1.2.73`
- User Verification Status: `Completed`

## What Changed

- Removed canonical replay ownership from `agent-memory` so raw memory and replay projection no longer share the same contract.
- Made `run-history` the sole owner of the historical replay bundle used for reopen.
- Split reopened historical UI hydration into sibling `conversation` and `activities` read models instead of deriving the right pane from the middle pane.
- Fixed the reopen regression where historical activities were present in the backend projection payload but never hydrated into the frontend activity store.

## Files Changed

- `autobyteus-server-ts/src/agent-memory/domain/models.ts`
- `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`
- `autobyteus-server-ts/src/api/graphql/types/run-history.ts`
- `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts`
- `autobyteus-server-ts/src/run-history/projection/run-projection-types.ts`
- `autobyteus-server-ts/src/run-history/projection/run-projection-utils.ts`
- `autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts`
- `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts`
- `autobyteus-server-ts/src/run-history/projection/providers/claude-run-view-projection-provider.ts`
- `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`
- `autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-activities.ts`
- `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts`
- `autobyteus-server-ts/src/run-history/services/team-member-local-run-projection-reader.ts`
- `autobyteus-web/services/runHydration/runContextHydrationService.ts`
- `autobyteus-web/services/runHydration/runProjectionConversation.ts`
- `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts`
- `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts`
- `autobyteus-web/graphql/queries/runHistoryQueries.ts`
- `autobyteus-server-ts/docs/modules/run_history.md`

## Validation Completed

- Server targeted validation:
  - unit coverage around replay providers, replay utilities, team-member replay, and GraphQL boundary
  - integration coverage for memory layout plus projection reconstruction
- Web targeted validation:
  - `services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts`
  - `services/runHydration/__tests__/runProjectionActivityHydration.spec.ts`
- Live validation:
  - backend restart + reopen verified by user
  - user confirmed the middle conversation and right-side Activity reconstruction both work after reopen
  - direct Codex `thread/read` probe captured and archived

## Release Notes Status

- Release notes required: `Yes`
- Release notes artifact: `tickets/done/memory-projection-layer-refactor/release-notes.md`
- GitHub release: `Tag pushed as v1.2.73; publication workflows are still in progress`

## Finalization Record

- Archived ticket path: `tickets/done/memory-projection-layer-refactor`
- Finalization target: `origin/personal`
- Ticket commit: `e04add95` (`refactor(run-history): separate replay projection from memory views`)
- Merge commit: `6db09d74` (`Merge branch 'codex/memory-projection-layer-refactor' into personal`)
- Release commit: `24a5ad60` (`chore(release): bump workspace release version to 1.2.73`)
- Release tag: `v1.2.73`
- Remote tag verification: `git ls-remote --tags origin v1.2.73`
- GitHub Actions status at handoff:
  - `Release Messaging Gateway`: `in_progress`
  - `Desktop Release`: `in_progress`
  - `Server Docker Release`: `in_progress`
