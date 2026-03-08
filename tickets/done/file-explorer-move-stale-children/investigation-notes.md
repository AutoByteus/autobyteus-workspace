# Investigation Notes

- Ticket: `file-explorer-move-stale-children`
- Date: `2026-03-08`
- Investigator: `Codex`
- Re-Entry Reason: `Large-workspace watcher scalability and eager initial load issue discovered during user verification`

## Scope Triage

- Confirmed classification: `Small`
- Rationale:
  - The root cause is clear and localized to the backend workspace-add path.
  - No schema or persistence-model change is required.
  - The expected fix is confined to watcher registration and the GraphQL create-workspace return path, with focused backend verification.

## User-Observed Repro

1. Start the backend and frontend app.
2. Add a large repository root such as `autobyteus-web` as a workspace.
3. Observe repeated backend errors: `Watcher error: Error: EMFILE: too many open files, watch`.
4. Observe that the server may shut down or abort requests while closing.

## Sources Consulted

- [`autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts`](../../../../autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts)
- [`autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts`](../../../../autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts)
- [`autobyteus-server-ts/src/file-explorer/directory-traversal.ts`](../../../../autobyteus-server-ts/src/file-explorer/directory-traversal.ts)
- [`autobyteus-server-ts/src/file-explorer/file-explorer.ts`](../../../../autobyteus-server-ts/src/file-explorer/file-explorer.ts)
- [`autobyteus-server-ts/src/file-explorer/traversal-ignore-strategy/default-ignore-strategy.ts`](../../../../autobyteus-server-ts/src/file-explorer/traversal-ignore-strategy/default-ignore-strategy.ts)
- [`autobyteus-server-ts/src/file-explorer/traversal-ignore-strategy/git-ignore-strategy.ts`](../../../../autobyteus-server-ts/src/file-explorer/traversal-ignore-strategy/git-ignore-strategy.ts)
- [`autobyteus-server-ts/src/api/graphql/types/workspace.ts`](../../../../autobyteus-server-ts/src/api/graphql/types/workspace.ts)
- [`autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts`](../../../../autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts)
- [`autobyteus-server-ts/src/workspaces/filesystem-workspace.ts`](../../../../autobyteus-server-ts/src/workspaces/filesystem-workspace.ts)
- [`autobyteus-server-ts/src/workspaces/workspace-manager.ts`](../../../../autobyteus-server-ts/src/workspaces/workspace-manager.ts)
- [`autobyteus-server-ts/tests/integration/file-explorer/file-system-watcher.integration.test.ts`](../../../../autobyteus-server-ts/tests/integration/file-explorer/file-system-watcher.integration.test.ts)
- [`autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`](../../../../autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts)
- [`autobyteus-web/.gitignore`](../../../../autobyteus-web/.gitignore)

## Module / Ownership Observations

- Watcher registration belongs in [`autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts`](../../../../autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts).
- Ignore rule evaluation currently lives in [`autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts`](../../../../autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts), but that placement is too late for OS-level watcher registration.
- Workspace creation payload shaping belongs in [`autobyteus-server-ts/src/api/graphql/types/workspace.ts`](../../../../autobyteus-server-ts/src/api/graphql/types/workspace.ts) and should stay aligned with [`autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts`](../../../../autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts).

## Code Path Traced

1. Workspace creation starts in [`autobyteus-server-ts/src/api/graphql/types/workspace.ts`](../../../../autobyteus-server-ts/src/api/graphql/types/workspace.ts).
2. [`autobyteus-server-ts/src/workspaces/workspace-manager.ts`](../../../../autobyteus-server-ts/src/workspaces/workspace-manager.ts) creates a [`FileSystemWorkspace`](../../../../autobyteus-server-ts/src/workspaces/filesystem-workspace.ts).
3. [`autobyteus-server-ts/src/workspaces/filesystem-workspace.ts`](../../../../autobyteus-server-ts/src/workspaces/filesystem-workspace.ts) initializes the file explorer shallowly, then starts a background full traversal.
4. The underlying watcher starts in [`autobyteus-server-ts/src/file-explorer/file-explorer.ts`](../../../../autobyteus-server-ts/src/file-explorer/file-explorer.ts) via [`autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts`](../../../../autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts).
5. The watcher currently registers `chokidar.watch(workspaceRootPath, ...)` without an `ignored` predicate.
6. Ignore evaluation only occurs later inside [`autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts`](../../../../autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts) when an event already exists.
7. The GraphQL mutation currently overrides the shallow domain initialization by calling `fileExplorer.toJson()` and returning the full serialized tree.

## Findings

### 1. Ignored paths are filtered too late

- [`autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts`](../../../../autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts) starts chokidar with:
  - `chokidar.watch(this.fileExplorer.workspaceRootPath, { ignoreInitial: true, ... })`
- No `ignored` predicate is supplied.
- That means chokidar attempts to register watchers across the full workspace tree, including folders that existing ignore rules would later discard.
- This explains why the user sees `EMFILE` first and only later log lines like `Ignoring path ... due to local .gitignore`.

### 2. The ignore logic we need already exists, but only in the handler path

- [`autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts`](../../../../autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts) already combines:
  - `DefaultIgnoreStrategy`
  - explicit root ignore strategies such as `.git`
  - root `.gitignore`
  - nested `.gitignore` scanning up the directory chain
- This is the correct source of truth for ignored-path semantics.
- The design flaw is that the logic is not reusable at watch-registration time.

### 3. The workspace create path defeats the existing shallow initialization

- [`autobyteus-server-ts/src/workspaces/filesystem-workspace.ts`](../../../../autobyteus-server-ts/src/workspaces/filesystem-workspace.ts) initializes with `buildWorkspaceDirectoryTree(1)` first, then performs a background full initialization.
- [`autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts`](../../../../autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts) already returns `toShallowJson(1)` for normal workspace listing.
- [`autobyteus-server-ts/src/api/graphql/types/workspace.ts`](../../../../autobyteus-server-ts/src/api/graphql/types/workspace.ts) is inconsistent: it calls `toJson()` during `createWorkspace`, forcing the full tree into the initial GraphQL response.
- This adds avoidable latency and memory pressure exactly when the user adds a large root.

### 4. The problem is backend boundary design, not frontend rendering

- The visible symptom appears during workspace add, before the user even interacts deeply with the tree.
- The failing surface is the backend watcher boundary plus initial GraphQL payload shape.
- No frontend refactor is required to solve this performance issue.

## Open Unknowns / Risks

- The default ignore strategy includes broad patterns that may deserve future cleanup, but changing its semantics is unnecessary for this bug fix.
- Background full initialization may still be expensive for very large non-ignored trees; that is a follow-up concern if the current fix does not meet user expectations.

## Decision

- Re-enter through design, not a narrow local patch.
- Extract or centralize ignore matching so the same rules can be used both:
  - before chokidar registers watchers, and
  - again at event-handling time as a defensive layer.
- Align `createWorkspace` with the existing workspace converter so the initial payload is shallow.

## Planned Fix Direction

1. Move ignore evaluation into a reusable matcher that can be used by both chokidar registration and the watcher event handler.
2. Pass that matcher into `chokidar.watch(..., { ignored: ... })` so ignored/generated trees never consume watch handles.
3. Keep handler-side ignore checks as a second safety boundary for runtime events.
4. Make `createWorkspace` use the same shallow GraphQL conversion path as normal workspace listing.
5. Add focused automated coverage that proves:
  - ignored directories are absent from chokidar's registered watch map before any events occur,
  - nested `.gitignore` exclusions are honored pre-watch,
  - non-ignored watcher behavior still works,
  - `createWorkspace` returns a shallow explorer payload.
