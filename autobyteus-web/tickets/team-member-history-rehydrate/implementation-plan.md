# Implementation Plan - team-member-history-rehydrate

## Small-Scope Solution Sketch
- Reuse single-agent projection parser for team-member conversation hydration.
- In team open flow, fetch `GetRunProjection` for each member agent ID.
- Build member `Conversation` from projection before creating `AgentContext`.
- Keep fallback empty conversation when projection is unavailable.

## Tasks
1. Export reusable projection parser from `services/runOpen/runOpenCoordinator.ts`.
2. Update `stores/runTreeStore.ts` to query member projections during `openTeamMemberRun`.
3. Populate member conversations from projections and preserve existing stream-connection behavior.
4. Extend store tests to validate team-member hydration behavior.
5. Run targeted Vitest for run-tree store and relevant regression suite.

## Verification Strategy
- Unit: `stores/__tests__/runTreeStore.spec.ts` team history open test asserts hydrated messages for members.
- Integration: Existing workspace history integration tests must remain green.
- E2E feasibility: Manual UI verification feasible in current local environment; automated browser E2E can be added later.

## Cleanup (No Legacy Retention)
- Remove duplicated projection parsing logic by reusing existing parser.
- Do not keep team open path that initializes all member conversations to empty by default when projection exists.
