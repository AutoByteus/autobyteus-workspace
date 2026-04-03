# Investigation Notes

- Scope: `Small`
- Date: `2026-04-03`

## Findings

1. The touched-files frontend still duplicates invocation-alias normalization in two active owners:
   - `autobyteus-web/stores/agentArtifactsStore.ts`
   - `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`

2. `clearLatestVisibleArtifact(runId)` is still exported from `agentArtifactsStore`, but it has no active callers. That is dead public store surface.

3. The user added one explicit boundary requirement for this round: `autobyteus-web` must never depend directly on `autobyteus-ts`. Current active violations are in the web build/packaging boundary, not in the runtime UI source files:
   - `autobyteus-web/scripts/prepare-server.mjs` directly builds `autobyteus-ts` and directly imports `autobyteus-ts/task-management/task.js` during validation
   - `autobyteus-web/scripts/prepare-server.sh` directly builds `autobyteus-ts`
   - `autobyteus-web/README.md` still documents `autobyteus-ts` as a required sibling dependency for the web project

4. `autobyteus-web/scripts/guard-web-boundary.mjs` already blocks runtime/source imports from `autobyteus-ts`, but it currently scans only the app source folders. It does not guard the active `scripts/` build boundary, so the current script-level violations were not caught.

## Scope judgment

This is still a bounded cleanup round. The runtime product behavior stays the same. The work is to tighten existing ownership and dependency boundaries, remove dead public surface, and extend the web-side guard to the real active boundary.

## Design constraint

The web project may invoke the server project as an external packaging/build boundary, but it must not directly build, import, or validate `autobyteus-ts` itself. If `autobyteus-server-ts` needs `autobyteus-ts`, that dependency must stay owned by the server boundary.
