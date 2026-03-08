# Implementation Plan - file-explorer-move-stale-children

## Scope Classification

- Classification: `Small`
- Reasoning: the failure is localized to the backend watcher boundary and the workspace-create GraphQL response shape; no schema/storage change is required.
- Workflow Depth: `Small` path with solution sketch -> runtime call stack -> runtime review gate.

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/file-explorer-move-stale-children/workflow-state.md`
- Investigation notes: `tickets/done/file-explorer-move-stale-children/investigation-notes.md`
- Requirements: `tickets/done/file-explorer-move-stale-children/requirements.md` (`Design-ready`)

## Plan Maturity

- Current Status: `Draft For Runtime Review`
- Notes: this plan replaces the earlier move-bug design basis for the current performance/design re-entry.

## Solution Sketch

- Use Cases In Scope:
  - `UC-101`: add a large repository root without exhausting watcher handles on ignored/generated paths.
  - `UC-102`: honor nested `.gitignore` exclusions before watch registration.
  - `UC-103`: return a shallow initial `createWorkspace` file-explorer payload.
  - `UC-104`: preserve normal watcher events for non-ignored paths.
- Target Architecture Shape:
  - Introduce a shared workspace-ignore matcher that evaluates:
    - base ignore strategies,
    - root `.gitignore`,
    - nested `.gitignore` files up the directory chain.
  - Use that matcher in `chokidar.watch(..., { ignored: ... })` so ignored trees never consume watch handles.
  - Reuse the same matcher inside the watcher event handler as a second safety layer.
  - Make `createWorkspace` delegate to `WorkspaceConverter.toGraphql(...)` so the initial payload stays shallow and consistent with the workspace-listing path.
- Touched Files/Modules:
  - `autobyteus-server-ts/src/file-explorer/traversal-ignore-strategy/workspace-ignore-matcher.ts` (new)
  - `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts`
  - `autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts`
  - `autobyteus-server-ts/src/api/graphql/types/workspace.ts`
  - focused backend tests under `autobyteus-server-ts/tests/integration/file-explorer/` and `autobyteus-server-ts/tests/e2e/workspaces/`
- API/Behavior Delta:
  - `createWorkspace` returns the same shallow tree depth as normal workspace listing.
  - Ignored/generated paths are excluded at watch registration time instead of only being discarded after events arrive.
- Key Assumptions:
  - The existing ignore semantics are correct enough for this scope; the problem is where they are applied.
  - The frontend already supports shallow initial trees because workspace listing and folder-child loading follow that model.
- Known Risks:
  - Overly aggressive pre-watch filtering could hide legitimate watcher coverage if ignore semantics diverge from the current handler path.
  - Nested `.gitignore` evaluation must remain correct even when a `.gitignore` file changes after watcher startup.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `workspace-ignore-matcher.ts` | Existing ignore strategies | Establish one reusable ignore-evaluation boundary first |
| 2 | `watchdog-handler.ts` | `workspace-ignore-matcher.ts` | Keep runtime handler behavior aligned with the matcher |
| 3 | `file-system-watcher.ts` | `workspace-ignore-matcher.ts` | Move ignore evaluation to chokidar registration |
| 4 | `workspace.ts` GraphQL resolver | Existing `WorkspaceConverter` | Remove eager full-tree serialization and reuse the canonical shallow conversion path |
| 5 | Focused integration/e2e tests | Updated backend behavior | Prove the watch map and GraphQL payload shapes directly |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- |
| R-101 | AC-101, AC-102 | UC-101, UC-102 | T-101, T-102 | Watcher integration tests inspect chokidar watch map | AV-101, AV-102 |
| R-102 | AC-101, AC-102 | UC-101, UC-102 | T-101, T-102 | Watcher integration tests cover root + nested ignore rules | AV-101, AV-102 |
| R-103 | AC-103 | UC-104 | T-103 | Existing watcher move/add/modify coverage rerun | AV-103 |
| R-104 | AC-104 | UC-103 | T-104 | GraphQL e2e test parses createWorkspace payload | AV-104 |
| R-105 | AC-105 | UC-101, UC-102, UC-103, UC-104 | T-105 | Focused backend verification suite | AV-105 |

## Step-By-Step Plan

1. Add `workspace-ignore-matcher.ts` to centralize ignore evaluation with cached `.gitignore` parsing that can be reused across watcher phases.
2. Update `WatchdogHandler` to delegate ignore decisions to the shared matcher.
3. Update `FileSystemWatcher.start()` to pass `ignored` to chokidar and keep the existing handler-side checks as a defensive fallback.
4. Update `createWorkspace` to return `WorkspaceConverter.toGraphql(workspace)` instead of an eager `toJson()` payload.
5. Add focused watcher integration tests that inspect `getWatched()` for pre-existing ignored directories.
6. Add or update GraphQL e2e coverage for shallow `createWorkspace` payloads.
7. Rerun focused backend verification and capture residual risks in the ticket artifacts.

## Test Strategy

- New targeted backend proof:
  - watcher integration test proving pre-existing root `.gitignore` exclusions are absent from chokidar's watch map
  - watcher integration test proving pre-existing nested `.gitignore` exclusions are absent from chokidar's watch map
  - GraphQL e2e test proving `createWorkspace.fileExplorer` is shallow
- Regression coverage to rerun:
  - existing watcher add/modify/delete and move/rename tests
  - existing ignore tests for runtime event suppression
- Residual-risk note:
  - a real macOS `EMFILE` reproduction is not deterministic inside automated tests, so the strongest executable proof is the watch-map registration boundary plus unchanged non-ignored watcher coverage
