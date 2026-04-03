# Implementation

- Ticket: `frontend-boundary-cleanup`
- Scope: `Small`
- Date: `2026-04-03`

## Solution Sketch

### Spine inventory

1. `Touched-files invocation identity spine`
   - Start: streaming handler or store needs to compare one invocation id with alias variants
   - End: one web-owned invocation-alias utility answers alias expansion and matching
   - Owner: `autobyteus-web/utils/invocationAliases.ts`
   - Why it matters: the same identity policy should not be duplicated across multiple frontend owners

2. `Web prepare-server packaging spine`
   - Start: `autobyteus-web` build command calls `prepare-server`
   - End: bundled server files are produced in `autobyteus-web/resources/server`
   - Owner: web `prepare-server` script boundary delegating to the server project boundary
   - Why it matters: the web project should depend on the server boundary, not on the server boundary and the server boundary's internal shared dependency at the same time

3. `Web boundary-guard spine`
   - Start: web build/test workflow runs `guard:web-boundary`
   - End: direct active-code dependency on `autobyteus-ts` is blocked before packaging/runtime work proceeds
   - Owner: `autobyteus-web/scripts/guard-web-boundary.mjs`
   - Why it matters: the project rule must be enforced where regressions can actually be introduced

### Boundary / ownership rules

- `autobyteus-web` owns only web-side packaging orchestration. It may call into `autobyteus-server-ts`, but it must not directly build, import, or validate `autobyteus-ts`.
- Shared invocation-id alias policy belongs in one web utility file and is reused by higher owners instead of copied.
- `agentArtifactsStore` should expose only active public store operations; dead public methods are removed instead of retained.
- The boundary guard owns active-code enforcement for this rule and should scan both runtime source folders and web build scripts.

### Change Inventory

- Add: one reusable web invocation-alias utility
- Add: focused unit coverage for invocation-alias behavior
- Modify: touched-files store and lifecycle handler to reuse the shared utility
- Modify: web prepare-server scripts to depend only on the server boundary
- Modify: web boundary guard to scan the active script boundary
- Modify: active web docs to remove direct `autobyteus-ts` requirement wording
- Remove: unused `clearLatestVisibleArtifact` action

## Execution Notes

Implemented in:
- `autobyteus-web/utils/invocationAliases.ts`
- `autobyteus-web/utils/__tests__/invocationAliases.spec.ts`
- `autobyteus-web/stores/agentArtifactsStore.ts`
- `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`
- `autobyteus-web/scripts/prepare-server.mjs`
- `autobyteus-web/scripts/prepare-server.sh`
- `autobyteus-web/scripts/guard-web-boundary.mjs`
- `autobyteus-web/README.md`

Result:
- invocation alias policy is now owned once in a reusable web utility
- the unused touched-files store action is removed
- the active web prepare-server boundary no longer directly builds or imports `autobyteus-ts`
- the web boundary guard now scans active scripts, not only runtime/source folders
