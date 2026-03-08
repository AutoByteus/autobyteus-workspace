# API / E2E Testing - file-explorer-move-stale-children

## Coverage Rules

- Scope classification: `Small`
- Goal: close the acceptance criteria for the large-workspace watcher/performance issue with focused backend integration and GraphQL e2e proof.
- Full browser/Electron automation is not required for this pass because the defect is in the backend watcher boundary and workspace-create payload shape.

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-101 | R-101, R-102 | pre-existing root ignored directories are absent from the watch map | AV-101 | Passed | 2026-03-08 |
| AC-102 | R-101, R-102 | pre-existing nested `.gitignore` exclusions are absent from the watch map | AV-102 | Passed | 2026-03-08 |
| AC-103 | R-103 | non-ignored paths still produce watcher events | AV-103, AV-104 | Passed | 2026-03-08 |
| AC-104 | R-104 | `createWorkspace` returns a shallow file-explorer payload | AV-105 | Passed | 2026-03-08 |
| AC-105 | R-105 | focused automated tests exist and pass for the watcher boundary and create-workspace payload | AV-101, AV-102, AV-103, AV-104, AV-105 | Passed | 2026-03-08 |

## Scenario Catalog

| Scenario ID | Source Type | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level | Expected Outcome | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AV-101 | Requirement | AC-101, AC-105 | R-101, R-102, R-105 | UC-101 | Backend Integration | root `.gitignore` excluded directories such as `.nuxt/` and `node_modules/` are absent from chokidar's registered watch map before events occur | Passed |
| AV-102 | Requirement | AC-102, AC-105 | R-101, R-102, R-105 | UC-102 | Backend Integration | nested `.gitignore` excluded directories such as `project/build/` are absent from chokidar's registered watch map before events occur | Passed |
| AV-103 | Requirement | AC-103, AC-105 | R-103, R-105 | UC-104 | Backend Integration | non-ignored add/modify/delete and move/rename flows still emit watcher events | Passed |
| AV-104 | Requirement | AC-103, AC-105 | R-103, R-105 | UC-104 | Backend Integration | moving a visible file into an ignored directory produces the correct visible-tree outcome: a delete event for the source path | Passed |
| AV-105 | Requirement | AC-104, AC-105 | R-104, R-105 | UC-103 | GraphQL E2E | `createWorkspace.fileExplorer` contains only the shallow initial tree, not nested descendants | Passed |

## Commands Run

- `pnpm -C autobyteus-server-ts exec vitest --run tests/integration/file-explorer/file-system-watcher.integration.test.ts tests/e2e/workspaces/workspaces-graphql.e2e.test.ts tests/integration/file-explorer/file-explorer.integration.test.ts tests/integration/file-explorer/nested-folder-move-watcher.integration.test.ts`
- `pnpm -C autobyteus-server-ts build`
- `node --input-type=module ... FileSystemWorkspace(new WorkspaceConfig({ rootPath: "../autobyteus-web" })) ...`
- `node --input-type=module ... graphql(createWorkspace(rootPath: "../autobyteus-web")) ...`

## Results

- Focused backend test suite: `Pass` (`24` tests)
- Backend build: `Pass`
- Real `autobyteus-web` workspace-create path: `Pass`
  - watcher started successfully
  - watched directory count: `257`
  - `.nuxt`, `node_modules`, and `dist` were not watched
  - `EMFILE` errors observed: `0`
- Real `autobyteus-web` GraphQL `createWorkspace` path: `Pass`
  - initial payload was shallow
  - sampled first folder had `children_loaded: false` and `0` children in the initial response

## Environment Constraints

- The automated proof uses chokidar's `getWatched()` map rather than trying to force an actual macOS `EMFILE` exhaustion inside the test harness.
- Background full initialization still runs after workspace creation; that is outside the acceptance scope for this ticket because the verified defect was ignored-path watcher registration plus eager create-response serialization.
