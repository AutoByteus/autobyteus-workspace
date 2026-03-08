# Requirements

- Status: `Design-ready`
- Ticket: `file-explorer-move-stale-children`
- Last Updated: `2026-03-08`

## Goal / Problem Statement

Adding a large repository root such as `autobyteus-web` as a workspace can flood the backend file-system watcher with ignored/generated paths and produce `EMFILE: too many open files, watch`. At the same time, the GraphQL `createWorkspace` path eagerly serializes the full file tree even though the domain workspace initializes shallowly first. The workspace add flow must exclude ignored paths before OS-level watch registration and must return a shallow initial file-explorer payload.

## Reproduction Snapshot

1. Start the backend and open the Electron file explorer workspace flow.
2. Add a large repository root such as `autobyteus-web` while generated folders like `.nuxt/` and `node_modules/` exist.
3. Observe repeated backend watcher errors like `EMFILE: too many open files, watch`.
4. Observe that the server can become unstable or abort requests while closing.
5. Inspect the current implementation and note that ignored paths are filtered after events arrive, not before watcher registration, and `createWorkspace` serializes the full tree on creation.

## In-Scope Use Cases

- `UC-101`: Add a large repository root with a root `.gitignore` that excludes generated folders such as `.nuxt/`, `node_modules/`, `dist/`, or `logs/`.
- `UC-102`: Add a repository that contains nested `.gitignore` files which exclude subtree folders such as `project/build/`.
- `UC-103`: Receive the initial `createWorkspace` GraphQL response for a newly added workspace.
- `UC-104`: Continue receiving watcher events for non-ignored paths after the watcher boundary is tightened.

## Out of Scope

- Redesigning the entire search/indexing subsystem.
- Raising OS `ulimit` values as the primary fix.
- Changing user-visible ignore semantics outside the existing ignore-strategy boundaries unless required for consistency.

## Requirements

- `R-101`: The file-system watcher must exclude ignored paths before chokidar registers OS-level watchers for those paths.
- `R-102`: Pre-watch ignore evaluation must honor the existing ignore behavior for root ignore strategies, root `.gitignore`, and nested `.gitignore` files.
- `R-103`: Non-ignored files and folders must continue to produce add, modify, move, rename, and delete watcher updates.
- `R-104`: `createWorkspace` must return a shallow initial file-explorer payload that is consistent with the normal workspace-listing converter path instead of eagerly serializing the full tree.
- `R-105`: The fix must be covered by automated tests that verify watcher registration excludes ignored trees and that the GraphQL workspace-create response remains shallow.

## Acceptance Criteria

- `AC-101`: When a workspace already contains ignored directories before the watcher starts, those ignored directories are absent from the watcher's registered directory map.
- `AC-102`: When a nested `.gitignore` excludes a subtree before watcher startup, that excluded subtree is absent from the watcher's registered directory map.
- `AC-103`: After the fix, non-ignored paths still produce watcher events in the focused integration suite.
- `AC-104`: The GraphQL `createWorkspace` response returns only the shallow file-explorer tree expected for initial workspace rendering instead of the full nested tree.
- `AC-105`: Focused automated tests pass for the watcher registration boundary and the shallow workspace-create payload.

## Constraints / Dependencies

- Reuse the existing ignore-strategy rules rather than introducing a second, divergent ignore configuration.
- Keep the initial workspace create payload compatible with the current frontend tree-loading model.
- Preserve the watcher as the source of external filesystem updates for non-ignored paths.

## Assumptions

- The large-workspace failure is primarily caused by over-registration of watcher handles on ignored/generated trees rather than by the GraphQL transport itself.
- Returning a shallow initial tree is sufficient for the current frontend, because deeper folder expansion already uses on-demand child loading.

## Open Questions / Risks

- The current default ignore strategy is broader than `.gitignore` and may deserve follow-up review, but that cleanup is out of scope unless it blocks the fix.
- Background full-tree initialization may still be expensive on very large non-ignored repositories even after watcher registration is fixed.
- Chokidar behavior can vary by platform, so the strongest proof available in this environment is the registered watch map plus integration-event coverage.

## Requirement Coverage Map (Requirement -> Use Case)

- `R-101` -> `UC-101`, `UC-102`
- `R-102` -> `UC-101`, `UC-102`
- `R-103` -> `UC-104`
- `R-104` -> `UC-103`
- `R-105` -> `UC-101`, `UC-102`, `UC-103`, `UC-104`

## Acceptance Criteria Coverage Map (AC -> Stage 7 Scenario Placeholder)

- `AC-101` -> `AV-101`
- `AC-102` -> `AV-102`
- `AC-103` -> `AV-103`
- `AC-104` -> `AV-104`
- `AC-105` -> `AV-105`

## Scope Triage

- Confirmed classification: `Small`
- Rationale: the fix is localized to the backend watcher boundary and workspace GraphQL create path, with focused integration/e2e verification and no schema or persistence change.
