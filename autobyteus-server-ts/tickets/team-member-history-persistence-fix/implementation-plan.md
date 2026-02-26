# Implementation Plan - team-member-history-persistence-fix

## Small-Scope Solution Sketch
- Add resolver helper to build runtime member configs with deterministic `memberRouteKey` + `memberAgentId` based on generated `teamId`.
- Replace `createTeamRun` calls with `createTeamRunWithId` in creation/lazy-create paths.
- Build manifest from the same resolved member configs to guarantee ID parity.
- Remove forced member `memoryDir` in continuation restore to avoid path mismatch.

## Tasks
1. Implement runtime member config resolver helper in `agent-team-run.ts`.
2. Update create and lazy-create GraphQL flows to use `createTeamRunWithId` and resolved configs.
3. Update continuation restore member-config mapping.
4. Update unit tests for resolver and continuation service.
5. Run targeted server unit/integration tests.

## Verification Strategy
- Unit: resolver test asserts `createTeamRunWithId` payload contains deterministic member IDs and manifest parity.
- Unit: continuation service test asserts restore member config does not force divergent memoryDir.
- Integration/E2E: team-run restore lifecycle e2e remains green.
