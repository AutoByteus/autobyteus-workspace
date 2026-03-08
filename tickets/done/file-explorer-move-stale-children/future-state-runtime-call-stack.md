# Future-State Runtime Call Stack - file-explorer-move-stale-children

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v2`
- Requirements: `tickets/done/file-explorer-move-stale-children/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/done/file-explorer-move-stale-children/implementation-plan.md`
- Source Design Version: `v2`

## Use Case Index

| use_case_id | Source Type | Requirement ID(s) | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- |
| UC-101 | Requirement | R-101, R-102 | Register a large workspace watcher without subscribing to ignored/generated trees | Primary |
| UC-102 | Requirement | R-101, R-102 | Honor nested `.gitignore` exclusions before watcher registration | Primary |
| UC-103 | Requirement | R-104 | Return a shallow file-explorer payload from `createWorkspace` | Primary |
| UC-104 | Requirement | R-103 | Continue emitting watcher events for non-ignored filesystem changes | Primary + Regression |

## Use Case: UC-101 Register a large workspace watcher without subscribing to ignored/generated trees

### Goal

Prevent ignored/generated directories from consuming watcher handles during workspace startup.

### Primary Runtime Call Stack

```text
[ENTRY] FileExplorer.startWatcher()
└── FileSystemWatcher.start()
    ├── WorkspaceIgnoreMatcher.createChokidarIgnoredPredicate() [STATELESS HELPER]
    ├── chokidar.watch(workspaceRootPath, { ignored: predicate, ... })
    ├── chokidar walks the existing tree
    ├── predicate resolves target path kind and checks ignore rules before registration
    └── ignored/generated subtrees are skipped and never enter the watch map [STATE]
```

## Use Case: UC-102 Honor nested `.gitignore` exclusions before watcher registration

### Goal

Apply the same ignore semantics for nested `.gitignore` files during the initial watcher crawl, not only after events arrive.

### Primary Runtime Call Stack

```text
[ENTRY] chokidar ignored predicate receives targetPath during startup crawl
└── WorkspaceIgnoreMatcher.shouldIgnoreForWatch(targetPath, stats?)
    ├── apply base ignore strategies (default + root-level configured strategies)
    ├── walk from dirname(targetPath) up to workspace root
    ├── load cached GitIgnoreStrategy for each existing .gitignore file
    ├── evaluate targetPath against the nearest and ancestor .gitignore rules
    └── return true before watcher registration when any matching ignore rule is found
```

### Error Path

```text
[ERROR] .gitignore file changes after startup
WatchdogHandler.shouldIgnore(targetPath, isDirectory)
└── WorkspaceIgnoreMatcher rechecks .gitignore metadata and reloads changed files before applying runtime ignore logic
```

## Use Case: UC-103 Return a shallow file-explorer payload from `createWorkspace`

### Goal

Avoid eager full-tree serialization when the user adds a workspace.

### Primary Runtime Call Stack

```text
[ENTRY] GraphQL WorkspaceResolver.createWorkspace(input)
└── WorkspaceManager.createWorkspace(config)
    ├── FileSystemWorkspace.initialize()
    │   ├── LocalFileExplorer.buildWorkspaceDirectoryTree(1) [STATE]
    │   └── background full initialization starts asynchronously
    └── WorkspaceConverter.toGraphql(workspace)
        ├── fileExplorer.toShallowJson(1)
        └── GraphQL response returns only the shallow initial tree [STATE]
```

## Use Case: UC-104 Continue emitting watcher events for non-ignored filesystem changes

### Goal

Preserve normal watcher behavior for paths that are not ignored.

### Primary Runtime Call Stack

```text
[ENTRY] filesystem mutation on a non-ignored path
└── chokidar emits add/change/unlink/addDir/unlinkDir
    └── FileSystemWatcher.handleAdd/handleModify/handleUnlink(...)
        ├── WatchdogHandler.shouldIgnore(targetPath, isDirectory)
        ├── non-ignored path proceeds to synchronizer
        ├── AddNodeSynchronizer / ModifyNodeSynchronizer / MoveNodeSynchronizer / RemoveNodeSynchronizer
        └── FileSystemChangeEvent is pushed to subscribers [STATE]
```
