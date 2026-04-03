# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Small`
- Triage Rationale: the user-visible regression is concentrated in one backend workspace-listing contract and one already-existing frontend auto-select path
- Investigation Goal: determine why the run configuration opens on `New` with an empty existing workspace list instead of defaulting to the temp workspace
- Primary Questions To Resolve:
  - does the backend always create and expose the temp workspace before the UI fetches workspaces?
  - does the frontend already know how to default to the temp workspace when the store contains it?
  - is the failure backend creation, backend exposure, frontend timing, or frontend selection logic?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-03 | Code | `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | inspect how run config decides between `Existing` and `New` | selector fetches all workspaces on mount, auto-selects `tempWorkspaceId` when present, and falls back to `New` when no workspaces are loaded | No |
| 2026-04-03 | Code | `autobyteus-web/stores/workspace.ts` | inspect how temp workspace is derived in the client store | temp workspace is derived only from fetched GraphQL workspaces (`workspaceId === "temp_ws_default"` or `isTemp`) | No |
| 2026-04-03 | Code | `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | inspect GraphQL `workspaces` contract | resolver returns `workspaceManager.getAllWorkspaces()` only; it does not ensure the temp workspace exists before listing | Yes |
| 2026-04-03 | Code | `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | inspect temp-workspace lifecycle | `getOrCreateTempWorkspace()` creates and caches `temp_ws_default`; `getAllWorkspaces()` only returns currently active cached workspaces | No |
| 2026-04-03 | Code | `autobyteus-server-ts/src/server-runtime.ts` | inspect startup ordering | server starts listening before `await getWorkspaceManager().getOrCreateTempWorkspace()` runs | Yes |
| 2026-04-03 | Code | `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | inspect current backend test assumptions | existing temp-workspace GraphQL tests manually create the temp workspace before querying, which masks the weak resolver contract | Yes |
| 2026-04-03 | Command | `pnpm install --offline` in ticket worktree | prepare executable investigation in the fresh ticket worktree | worktree dependencies were installed successfully from cache | No |
| 2026-04-03 | Command | `pnpm -C autobyteus-ts build && pnpm -C autobyteus-server-ts run build:file` | build backend artifacts for runtime verification | backend build succeeded once shared package build prerequisite was satisfied | No |
| 2026-04-03 | Process | `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:18080 node autobyteus-server-ts/dist-file/app.js --host 127.0.0.1 --port 18080 --data-dir /tmp/autobyteus-temp-workspace-repro-data` | verify live startup behavior and GraphQL response | standalone server requires `.env` file presence and `AUTOBYTEUS_SERVER_HOST` as a full URL; after startup settles, GraphQL returns `temp_ws_default` | Yes |
| 2026-04-03 | Command | `curl -s http://127.0.0.1:18080/graphql -H 'content-type: application/json' --data '{"query":"query { workspaces { workspaceId absolutePath isTemp } }"}'` | verify live GraphQL behavior | steady-state backend returns the temp workspace correctly once it has been created | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-web/components/workspace/config/WorkspaceSelector.vue`
  - `autobyteus-server-ts/src/api/graphql/types/workspace.ts`
- Execution boundaries:
  - run-config form mount -> workspace store fetch -> GraphQL `workspaces` query -> workspace manager active cache
- Owning subsystems / capability areas:
  - `autobyteus-web/components/workspace/config`
  - `autobyteus-web/stores`
  - `autobyteus-server-ts/src/api/graphql`
  - `autobyteus-server-ts/src/workspaces`
- Optional modules involved:
  - none needed for this ticket
- Folder / file placement observations:
  - the bug can be fixed inside the existing GraphQL workspace resolver without adding a new boundary or moving files

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | `onMounted`, `maybeAutoSelectDefaultWorkspace`, `workspaceOptions` | fetch workspaces and select the temp workspace when the store exposes it | UI already contains the intended default-selection behavior; when no workspaces are fetched it switches to `New` | do not duplicate temp-workspace creation in the frontend |
| `autobyteus-web/stores/workspace.ts` | `fetchAllWorkspaces`, `tempWorkspaceId`, `tempWorkspace` | populate workspace store from GraphQL and derive temp workspace identity | client can only derive a temp workspace from backend results; it has no fallback creation path | backend must be authoritative |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | `WorkspaceResolver.workspaces()` | list current workspaces | returns active workspace cache only; does not ensure temp workspace exists first | this is the authoritative contract to strengthen |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | `getOrCreateTempWorkspace`, `getAllWorkspaces` | create/cache temp workspace and expose active workspaces | temp workspace exists only after explicit creation; listing alone is passive | resolver should call `getOrCreateTempWorkspace()` before listing |
| `autobyteus-server-ts/src/server-runtime.ts` | `startConfiguredServer` startup flow | boot the server and create temp workspace during startup | `app.listen()` happens before temp workspace creation; startup ordering alone cannot guarantee every early `workspaces` query sees the temp workspace | query contract should not depend solely on startup timing |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | temp-workspace GraphQL scenarios | verify GraphQL workspace behavior | current tests pre-create temp workspace and therefore do not protect the resolver contract the UI needs | update test to prove query-triggered temp exposure |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-03 | Setup | create isolated data dir with empty `.env` for standalone backend start | backend bootstrap requires `.env` file presence even when it is empty | not the run-config bug, but relevant to reproducible local backend startup |
| 2026-04-03 | Repro | start backend with `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:18080` and query GraphQL via `curl` | once startup settles, GraphQL returns `temp_ws_default` with backend-selected absolute path | backend steady state is correct |
| 2026-04-03 | Trace | inspect startup logs from `server-runtime.ts`-driven boot | server begins listening before temp workspace creation is awaited | resolver should not rely on startup ordering alone |

### External Code / Dependency Findings

- Upstream repo / package / sample examined:
  - none
- Version / tag / commit / release:
  - N/A
- Files, endpoints, or examples examined:
  - N/A
- Relevant behavior, contract, or constraint learned:
  - N/A
- Confidence and freshness:
  - N/A

### Reproduction / Environment Setup

- Required services, mocks, or emulators:
  - none beyond the local backend process
- Required config, feature flags, or env vars:
  - `.env` file must exist in the backend data dir
  - `AUTOBYTEUS_SERVER_HOST` must be a full absolute URL for standalone startup
- Required fixtures, seed data, or accounts:
  - none
- External repos, samples, or artifacts cloned/downloaded for investigation:
  - none
- Setup commands that materially affected the investigation:
  - `pnpm install --offline`
  - `pnpm -C autobyteus-ts build`
  - `pnpm -C autobyteus-server-ts run build:file`
  - standalone backend start and GraphQL `curl` query
- Cleanup notes for temporary investigation-only setup:
  - isolated `/tmp/autobyteus-temp-workspace-*-data` directories can be removed after validation

## Constraints

- Technical constraints:
  - temp workspace identity must stay backend-owned (`temp_ws_default`) and use backend-configured absolute path
  - frontend selector should not synthesize a client-only temp workspace
- Environment constraints:
  - standalone backend bootstrap requires a valid public host URL in `AUTOBYTEUS_SERVER_HOST`
- Third-party / API constraints:
  - none

## Unknowns / Open Questions

- Unknown: exact desktop startup timing that produced the empty selector in the user screenshot
- Why it matters: it decides whether the failure is an early query race, a transient fetch failure, or another bootstrap path
- Planned follow-up: remove the backend contract weakness so the UI no longer depends on startup timing for temp-workspace visibility

## Implications

### Requirements Implications

- requirements should state that the backend `workspaces` contract itself guarantees temp-workspace availability for new run configuration, rather than relying on a prior startup side effect

### Design Implications

- the smallest correct fix is to strengthen `WorkspaceResolver.workspaces()` so it calls `getOrCreateTempWorkspace()` before enumerating workspaces
- do not add frontend-only temp workspace fabrication or duplicate backend ownership logic

### Implementation / Placement Implications

- modify `autobyteus-server-ts/src/api/graphql/types/workspace.ts`
- update `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` so the GraphQL query itself proves temp-workspace exposure without a manual precreation step

## Re-Entry Additions

### 2026-04-03 Re-Entry Update

- Trigger: N/A
- New evidence: N/A
- Updated implications: N/A
