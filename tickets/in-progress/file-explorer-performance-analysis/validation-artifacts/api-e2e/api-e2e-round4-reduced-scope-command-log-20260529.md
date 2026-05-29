# API/E2E round 4 reduced-scope command log
UTC 2026-05-29T16:50:36Z

## git diff --check
```console
$ git diff --check
```

## Backend TypeScript build config noEmit
```console
$ pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit
```

## Targeted backend unit suites
```console
$ pnpm -C autobyteus-server-ts test --run tests/unit/file-explorer/file-system-watcher-runtime.test.ts tests/unit/file-explorer/workspace-file-explorer.test.ts tests/unit/file-explorer/file-name-indexer.test.ts tests/unit/file-explorer/workspace-search-snapshot-controller.test.ts tests/unit/file-explorer/watcher-runtime-protocol.test.ts

> autobyteus-server-ts@0.1.1 pretest /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts
> pnpm prepare:shared


> autobyteus-server-ts@0.1.1 prepare:shared /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts
> pnpm -C .. --filter autobyteus-ts --filter @autobyteus/application-sdk-contracts --filter @autobyteus/application-backend-sdk build

Scope: 3 of 11 workspace projects
autobyteus-ts build$ tsc -p tsconfig.build.json && node ./scripts/verify-runtime-dependencies.mjs
autobyteus-application-sdk-contracts build$ tsc -p tsconfig.build.json
autobyteus-application-sdk-contracts build: Done
autobyteus-ts build: [verify:runtime-deps] OK
autobyteus-ts build: Done
autobyteus-application-backend-sdk build$ tsc -p tsconfig.build.json
autobyteus-application-backend-sdk build: Done

> autobyteus-server-ts@0.1.1 test /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts
> vitest --run tests/unit/file-explorer/file-system-watcher-runtime.test.ts tests/unit/file-explorer/workspace-file-explorer.test.ts tests/unit/file-explorer/file-name-indexer.test.ts tests/unit/file-explorer/workspace-search-snapshot-controller.test.ts tests/unit/file-explorer/watcher-runtime-protocol.test.ts


 RUN  v4.0.18 /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts

Prisma schema loaded from prisma/schema.prisma
Datasource "db": SQLite database "autobyteus-server-test.db" at "file:/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db"

Applying migration `20260203074245_init`
Applying migration `20260208094000_add_external_channel_tables`
Applying migration `20260209174500_add_channel_message_receipt_turn_id`
Applying migration `20260209213000_remove_agent_conversation_tables`
Applying migration `20260210101500_add_agent_avatar`
Applying migration `20260210192000_add_agent_team_avatar`
Applying migration `20260211214500_add_sync_columns_and_tombstones`
Applying migration `20260212070000_remove_workflow_definition`
Applying migration `20260309103000_add_channel_binding_launch_preset`
Applying migration `20260310153000_add_channel_binding_team_definition_id`
Applying migration `20260331102000_remove_channel_bindings_table`
Applying migration `20260331130000_receipt_lifecycle_and_remove_channel_idempotency`
Applying migration `20260517090000_add_app_data_migration_records`

Database reset successful

The following migration(s) have been applied:

migrations/
  └─ 20260203074245_init/
    └─ migration.sql
  └─ 20260208094000_add_external_channel_tables/
    └─ migration.sql
  └─ 20260209174500_add_channel_message_receipt_turn_id/
    └─ migration.sql
  └─ 20260209213000_remove_agent_conversation_tables/
    └─ migration.sql
  └─ 20260210101500_add_agent_avatar/
    └─ migration.sql
  └─ 20260210192000_add_agent_team_avatar/
    └─ migration.sql
  └─ 20260211214500_add_sync_columns_and_tombstones/
    └─ migration.sql
  └─ 20260212070000_remove_workflow_definition/
    └─ migration.sql
  └─ 20260309103000_add_channel_binding_launch_preset/
    └─ migration.sql
  └─ 20260310153000_add_channel_binding_team_definition_id/
    └─ migration.sql
  └─ 20260331102000_remove_channel_bindings_table/
    └─ migration.sql
  └─ 20260331130000_receipt_lifecycle_and_remove_channel_idempotency/
    └─ migration.sql
  └─ 20260517090000_add_app_data_migration_records/
    └─ migration.sql

stdout | tests/unit/file-explorer/file-system-watcher-runtime.test.ts > FileSystemWatcher runtime boundary > logical stop returns after requesting child stop without waiting for child stopped
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/watcher-runtime-unit-2afKAl' with ignore strategies: 

stdout | tests/unit/file-explorer/file-system-watcher-runtime.test.ts > FileSystemWatcher runtime boundary > logical stop returns after requesting child stop without waiting for child stopped
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/watcher-runtime-unit-2afKAl

stdout | tests/unit/file-explorer/file-system-watcher-runtime.test.ts > FileSystemWatcher runtime boundary > logical stop returns after requesting child stop without waiting for child stopped
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/watcher-runtime-unit-2afKAl

stdout | tests/unit/file-explorer/file-system-watcher-runtime.test.ts > FileSystemWatcher runtime boundary > ignores raw events whose watcher generation is stale
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/watcher-runtime-unit-Mfmhh5' with ignore strategies: 

stdout | tests/unit/file-explorer/file-system-watcher-runtime.test.ts > FileSystemWatcher runtime boundary > ignores raw events whose watcher generation is stale
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/watcher-runtime-unit-Mfmhh5

stdout | tests/unit/file-explorer/file-system-watcher-runtime.test.ts > FileSystemWatcher runtime boundary > ignores raw events whose watcher generation is stale
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/watcher-runtime-unit-Mfmhh5

 ✓ tests/unit/file-explorer/file-system-watcher-runtime.test.ts (2 tests) 59ms
stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > starts watcher when first watcher lease is acquired
Acquired file watcher lease for /fake/path (test); active leases: 1

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > starts watcher when first watcher lease is acquired
Released file watcher lease for /fake/path (test); active leases: 0

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > shares one watcher across multiple leases and stops after the final release
Acquired file watcher lease for /fake/path (first); active leases: 1

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > shares one watcher across multiple leases and stops after the final release
Acquired file watcher lease for /fake/path (second); active leases: 2

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > shares one watcher across multiple leases and stops after the final release
Released file watcher lease for /fake/path (first); active leases: 1

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > shares one watcher across multiple leases and stops after the final release
Released file watcher lease for /fake/path (second); active leases: 0

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > makes watcher lease release idempotent
Acquired file watcher lease for /fake/path (test); active leases: 1

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > makes watcher lease release idempotent
Released file watcher lease for /fake/path (test); active leases: 0

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > returns events from the active watcher
Acquired file watcher lease for /fake/path (test); active leases: 1

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > returns events from the active watcher
Released file watcher lease for /fake/path (test); active leases: 0

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > closes active watcher once and clears future subscriptions
Acquired file watcher lease for /fake/path (test); active leases: 1

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > renames files with valid leaf names
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-rename-leaf-fq9LTv' with max_depth=null

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > renames files with valid leaf names
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-rename-leaf-fq9LTv' completed in 0.0010 seconds.

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > rejects path-like rename names before filesystem mutation
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-rename-boundary-eSsyq8/ws' with max_depth=null

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > rejects path-like rename names before filesystem mutation
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-rename-boundary-eSsyq8/ws' completed in 0.0010 seconds.

 ✓ tests/unit/file-explorer/workspace-file-explorer.test.ts (11 tests) 31ms
stdout | tests/unit/file-explorer/file-name-indexer.test.ts > FileNameIndexer > builds the snapshot index on refresh
FileNameIndexer refreshing snapshot index...

stdout | tests/unit/file-explorer/file-name-indexer.test.ts > FileNameIndexer > builds the snapshot index on refresh
FileNameIndexer refreshed snapshot index with 1 entries

stdout | tests/unit/file-explorer/file-name-indexer.test.ts > FileNameIndexer > does not acquire a watcher lease when refreshing the snapshot index
FileNameIndexer refreshing snapshot index...

stdout | tests/unit/file-explorer/file-name-indexer.test.ts > FileNameIndexer > does not acquire a watcher lease when refreshing the snapshot index
FileNameIndexer refreshed snapshot index with 1 entries

stdout | tests/unit/file-explorer/file-name-indexer.test.ts > FileNameIndexer > replaces stale index entries on each refresh
FileNameIndexer refreshing snapshot index...

stdout | tests/unit/file-explorer/file-name-indexer.test.ts > FileNameIndexer > replaces stale index entries on each refresh
FileNameIndexer refreshed snapshot index with 1 entries

stdout | tests/unit/file-explorer/file-name-indexer.test.ts > FileNameIndexer > replaces stale index entries on each refresh
FileNameIndexer refreshing snapshot index...

stdout | tests/unit/file-explorer/file-name-indexer.test.ts > FileNameIndexer > replaces stale index entries on each refresh
FileNameIndexer refreshed snapshot index with 1 entries

stdout | tests/unit/file-explorer/file-name-indexer.test.ts > FileNameIndexer > uses an empty index when the current tree is unavailable
FileNameIndexer refreshing snapshot index...

stderr | tests/unit/file-explorer/file-name-indexer.test.ts > FileNameIndexer > uses an empty index when the current tree is unavailable
Tree not available for FileNameIndexer, using empty index.

stdout | tests/unit/file-explorer/file-name-indexer.test.ts > FileNameIndexer > uses an empty index when the current tree is unavailable
FileNameIndexer refreshed snapshot index with 0 entries

 ✓ tests/unit/file-explorer/file-name-indexer.test.ts (4 tests) 6ms
 ✓ tests/unit/file-explorer/workspace-search-snapshot-controller.test.ts (5 tests) 6ms
 ✓ tests/unit/file-explorer/watcher-runtime-protocol.test.ts (3 tests) 2ms

 Test Files  5 passed (5)
      Tests  25 passed (25)
   Start at  18:50:46
   Duration  1.37s (transform 199ms, setup 55ms, import 299ms, tests 105ms, environment 0ms)

```

## Targeted watcher integration suite
```console
$ pnpm -C autobyteus-server-ts test --run tests/integration/file-explorer/file-system-watcher.integration.test.ts

> autobyteus-server-ts@0.1.1 pretest /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts
> pnpm prepare:shared


> autobyteus-server-ts@0.1.1 prepare:shared /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts
> pnpm -C .. --filter autobyteus-ts --filter @autobyteus/application-sdk-contracts --filter @autobyteus/application-backend-sdk build

Scope: 3 of 11 workspace projects
autobyteus-ts build$ tsc -p tsconfig.build.json && node ./scripts/verify-runtime-dependencies.mjs
autobyteus-application-sdk-contracts build$ tsc -p tsconfig.build.json
autobyteus-application-sdk-contracts build: Done
autobyteus-ts build: [verify:runtime-deps] OK
autobyteus-ts build: Done
autobyteus-application-backend-sdk build$ tsc -p tsconfig.build.json
autobyteus-application-backend-sdk build: Done

> autobyteus-server-ts@0.1.1 test /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts
> vitest --run tests/integration/file-explorer/file-system-watcher.integration.test.ts


 RUN  v4.0.18 /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts

Prisma schema loaded from prisma/schema.prisma
Datasource "db": SQLite database "autobyteus-server-test.db" at "file:/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db"

Applying migration `20260203074245_init`
Applying migration `20260208094000_add_external_channel_tables`
Applying migration `20260209174500_add_channel_message_receipt_turn_id`
Applying migration `20260209213000_remove_agent_conversation_tables`
Applying migration `20260210101500_add_agent_avatar`
Applying migration `20260210192000_add_agent_team_avatar`
Applying migration `20260211214500_add_sync_columns_and_tombstones`
Applying migration `20260212070000_remove_workflow_definition`
Applying migration `20260309103000_add_channel_binding_launch_preset`
Applying migration `20260310153000_add_channel_binding_team_definition_id`
Applying migration `20260331102000_remove_channel_bindings_table`
Applying migration `20260331130000_receipt_lifecycle_and_remove_channel_idempotency`
Applying migration `20260517090000_add_app_data_migration_records`

Database reset successful

The following migration(s) have been applied:

migrations/
  └─ 20260203074245_init/
    └─ migration.sql
  └─ 20260208094000_add_external_channel_tables/
    └─ migration.sql
  └─ 20260209174500_add_channel_message_receipt_turn_id/
    └─ migration.sql
  └─ 20260209213000_remove_agent_conversation_tables/
    └─ migration.sql
  └─ 20260210101500_add_agent_avatar/
    └─ migration.sql
  └─ 20260210192000_add_agent_team_avatar/
    └─ migration.sql
  └─ 20260211214500_add_sync_columns_and_tombstones/
    └─ migration.sql
  └─ 20260212070000_remove_workflow_definition/
    └─ migration.sql
  └─ 20260309103000_add_channel_binding_launch_preset/
    └─ migration.sql
  └─ 20260310153000_add_channel_binding_team_definition_id/
    └─ migration.sql
  └─ 20260331102000_remove_channel_bindings_table/
    └─ migration.sql
  └─ 20260331130000_receipt_lifecycle_and_remove_channel_idempotency/
    └─ migration.sql
  └─ 20260517090000_add_app_data_migration_records/
    └─ migration.sql

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-ZaJ8vD' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-ZaJ8vD' completed in 0.0020 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-ZaJ8vD' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-ZaJ8vD

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-mKcPbl' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-mKcPbl' completed in 0.0120 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-mKcPbl' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-mKcPbl

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-mKcPbl

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-ZaJ8vD

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-FpTslg' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-FpTslg' completed in 0.0010 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-FpTslg' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-FpTslg

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-NkrQyD' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-NkrQyD' completed in 0.0010 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-NkrQyD' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-NkrQyD

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-NkrQyD

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-FpTslg

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-D7C0x6' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-D7C0x6' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-D7C0x6' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-D7C0x6

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-D7C0x6/watch.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Watcher detected modification: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-D7C0x6/watch.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Watcher detected deletion: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-D7C0x6/watch.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-D7C0x6

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > returns one idle event stream without stopping other subscribers
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-XyjrLM' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > returns one idle event stream without stopping other subscribers
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-XyjrLM' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > returns one idle event stream without stopping other subscribers
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-XyjrLM' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > returns one idle event stream without stopping other subscribers
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-XyjrLM

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > returns one idle event stream without stopping other subscribers
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-XyjrLM/second-subscriber-still-live.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > returns one idle event stream without stopping other subscribers
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-XyjrLM

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-yo7MzT' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-yo7MzT' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-yo7MzT' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-yo7MzT

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-yo7MzT/source.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
Watcher detected move from /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-yo7MzT/source.txt to /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-yo7MzT/renamed.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-yo7MzT

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits file creation event with node metadata
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-aGTcTQ' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits file creation event with node metadata
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-aGTcTQ' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits file creation event with node metadata
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-aGTcTQ' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits file creation event with node metadata
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-aGTcTQ

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits file creation event with node metadata
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-aGTcTQ/new_file.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits file creation event with node metadata
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-aGTcTQ

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Rz8hUA' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Rz8hUA' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Rz8hUA' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Rz8hUA

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Rz8hUA/new_folder

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Rz8hUA' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Rz8hUA' completed in 0.0010 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Watcher detected deletion: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Rz8hUA/new_folder

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Rz8hUA

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores default strategy paths like __pycache__
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BHPf7u' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores default strategy paths like __pycache__
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BHPf7u' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores default strategy paths like __pycache__
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BHPf7u' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores default strategy paths like __pycache__
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BHPf7u

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores default strategy paths like __pycache__
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BHPf7u

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores specific folders like .git and their contents
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-HyArhz' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores specific folders like .git and their contents
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-HyArhz' completed in 0.0010 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores specific folders like .git and their contents
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-HyArhz' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores specific folders like .git and their contents
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-HyArhz

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores specific folders like .git and their contents
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-HyArhz

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MLZe7k' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MLZe7k' completed in 0.0010 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MLZe7k' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MLZe7k

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MLZe7k/project

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MLZe7k/project/.gitignore

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MLZe7k/project/main.ts

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MLZe7k

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects root .gitignore files
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-ZunMLb' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects root .gitignore files
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-ZunMLb' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects root .gitignore files
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-ZunMLb' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects root .gitignore files
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-ZunMLb

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects root .gitignore files
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-ZunMLb/.gitignore

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects root .gitignore files
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-ZunMLb

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-seFBc1' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-seFBc1' completed in 0.0010 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-seFBc1' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-seFBc1

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-seFBc1/another_folder

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-seFBc1/another_file.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-seFBc1

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-NsvJNT' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-NsvJNT' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-NsvJNT' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-NsvJNT

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-NsvJNT/.gitignore

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-NsvJNT/main.js

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Watcher detected deletion: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-NsvJNT/main.js

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-NsvJNT

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-3aGMD3' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-3aGMD3' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-3aGMD3' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-3aGMD3

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-3aGMD3/ghost_file.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-3aGMD3' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-3aGMD3' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Watcher detected deletion: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-3aGMD3/ghost_file.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-3aGMD3

 ✓ tests/integration/file-explorer/file-system-watcher.integration.test.ts (14 tests) 17051ms
     ✓ does not emit events for pre-existing root .gitignore excluded directories  1184ms
     ✓ does not emit events for pre-existing nested .gitignore excluded directories  1125ms
     ✓ emits add + modify + delete events  1607ms
     ✓ returns one idle event stream without stopping other subscribers  528ms
     ✓ emits move/rename event  996ms
     ✓ emits file creation event with node metadata  527ms
     ✓ emits folder creation and deletion events  790ms
     ✓ ignores default strategy paths like __pycache__  857ms
     ✓ ignores specific folders like .git and their contents  1661ms
     ✓ respects nested .gitignore files  2262ms
     ✓ respects root .gitignore files  1529ms
     ✓ captures rapid changes without dropping events  331ms
     ✓ treats moves into ignored directories as deletes from the visible tree  2564ms
     ✓ emits delete events even if the in-memory node is missing  1089ms

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  18:50:54
   Duration  17.76s (transform 161ms, setup 19ms, import 157ms, tests 17.05s, environment 0ms)

```

## Backend build
```console
$ pnpm -C autobyteus-server-ts build

> autobyteus-server-ts@0.1.1 prebuild /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts
> pnpm prepare:shared && pnpm exec prisma generate --schema ./prisma/schema.prisma


> autobyteus-server-ts@0.1.1 prepare:shared /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts
> pnpm -C .. --filter autobyteus-ts --filter @autobyteus/application-sdk-contracts --filter @autobyteus/application-backend-sdk build

Scope: 3 of 11 workspace projects
autobyteus-ts build$ tsc -p tsconfig.build.json && node ./scripts/verify-runtime-dependencies.mjs
autobyteus-application-sdk-contracts build$ tsc -p tsconfig.build.json
autobyteus-application-sdk-contracts build: Done
autobyteus-ts build: [verify:runtime-deps] OK
autobyteus-ts build: Done
autobyteus-application-backend-sdk build$ tsc -p tsconfig.build.json
autobyteus-application-backend-sdk build: Done
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v5.22.0) to ./../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client in 80ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate


> autobyteus-server-ts@0.1.1 build /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts
> pnpm run build:full


> autobyteus-server-ts@0.1.1 build:full /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts
> node ./scripts/clean-build-output.mjs && tsc -p tsconfig.build.json && node ./scripts/copy-managed-messaging-assets.mjs && node ./scripts/smoke-built-in-agents-bootstrap.mjs

Successfully registered tool definition: 'read_file'
Successfully registered tool definition: 'write_file'
Successfully registered tool definition: 'edit_file'
Successfully registered tool definition: 'replace_in_file'
Successfully registered tool definition: 'insert_in_file'
Successfully registered tool definition: 'load_skill'
Successfully registered tool definition: 'run_bash'
Successfully registered tool definition: 'start_background_process'
Successfully registered tool definition: 'get_background_processes'
Successfully registered tool definition: 'get_process_output'
Successfully registered tool definition: 'stop_background_process'
Successfully registered tool definition: 'search_web'
Successfully registered tool definition: 'read_media_file'
Successfully registered tool definition: 'download_media'
Successfully registered tool definition: 'read_url'
Successfully registered tool definition: 'send_message_to'
Successfully registered tool definition: 'assign_task_to'
Successfully registered tool definition: 'create_tasks'
Successfully registered tool definition: 'create_task'
Successfully registered tool definition: 'get_my_tasks'
Successfully registered tool definition: 'get_task_plan_status'
Successfully registered tool definition: 'update_task_status'
Successfully registered tool definition: 'add_todo'
Successfully registered tool definition: 'create_todo_list'
Successfully registered tool definition: 'get_todo_list'
Successfully registered tool definition: 'update_todo_status'
AgentFactory (Singleton) initialized.
AgentTeamFactory (Singleton) initialized.
Platform detection: Windows=false
App root directory: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts
App data directory: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-server-ts
(node:73128) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
Built-in agents bootstrap smoke check passed.
```

## Targeted frontend reconnect/live-stream suite
```console
$ pnpm -C autobyteus-web test:nuxt --run stores/__tests__/workspaceStore.reconnect-resync.spec.ts stores/__tests__/workspaceStore.spec.ts services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts

> autobyteus@1.3.32 test:nuxt /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-web
> cross-env NUXT_TEST=true vitest --run stores/__tests__/workspaceStore.reconnect-resync.spec.ts stores/__tests__/workspaceStore.spec.ts services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts

isElectronBuild false
[Electron Module] Skipping electron module setup: BUILD_TARGET is not electron

 RUN  v3.2.4 /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-web

stderr | stores/__tests__/workspaceStore.spec.ts
Warning: KaTeX doesn't work in quirks mode. Make sure your website has a suitable doctype.

stderr | stores/__tests__/workspaceStore.reconnect-resync.spec.ts
Warning: KaTeX doesn't work in quirks mode. Make sure your website has a suitable doctype.

stderr | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts
Warning: KaTeX doesn't work in quirks mode. Make sure your website has a suitable doctype.

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts
serverStore: Initializing server config
serverStore: Not in Electron environment. Skipping server initialization.

stdout | stores/__tests__/workspaceStore.reconnect-resync.spec.ts
serverStore: Initializing server config
serverStore: Not in Electron environment. Skipping server initialization.

stdout | stores/__tests__/workspaceStore.spec.ts
serverStore: Initializing server config
serverStore: Not in Electron environment. Skipping server initialization.

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > constructor > uses provided wsEndpoint
[FileExplorerStreaming] Connecting to ws://custom:9000/ws/file-explorer/workspace-1...

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > constructor > URL-encodes deterministic workspace ids when opening the websocket
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/root%3A%2Ftmp%2Fmy%2Fworkspace...

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > connect > creates WebSocket connection with correct URL
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/workspace-123...

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > connect > sets state to connecting
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/workspace-1...

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > connect > does not reconnect if already connected to same workspace
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/workspace-1...
[FileExplorerStreaming] WebSocket connected
[FileExplorerStreaming] Session established: sess-1

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > message handling > calls onConnect with session ID on CONNECTED message
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/workspace-1...
[FileExplorerStreaming] WebSocket connected
[FileExplorerStreaming] Session established: sess-123

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > message handling > calls onFileSystemChange on FILE_SYSTEM_CHANGE message
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/workspace-1...
[FileExplorerStreaming] WebSocket connected
[FileExplorerStreaming] Session established: sess-1

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > message handling > calls onError on ERROR message
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/workspace-1...
[FileExplorerStreaming] WebSocket connected

stderr | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > message handling > calls onError on ERROR message
[FileExplorerStreaming] Server error: { code: 'WORKSPACE_NOT_FOUND', message: 'Not found' }

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > disconnect > closes WebSocket connection
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/workspace-1...
[FileExplorerStreaming] WebSocket connected
[FileExplorerStreaming] WebSocket disconnected: 1000 Normal closure
[FileExplorerStreaming] Disconnected

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > disconnect > resets state to disconnected
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/workspace-1...
[FileExplorerStreaming] WebSocket connected
[FileExplorerStreaming] Session established: sess-1
[FileExplorerStreaming] WebSocket disconnected: 1000 Normal closure
[FileExplorerStreaming] Disconnected

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > disconnect > calls onDisconnect callback when connection closes
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/workspace-1...
[FileExplorerStreaming] WebSocket connected
[FileExplorerStreaming] Session established: sess-1
[FileExplorerStreaming] WebSocket disconnected: 1000 Normal closure

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > state property > returns connecting after connect called
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/ws-1...

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > state property > returns connected after CONNECTED message
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/ws-1...
[FileExplorerStreaming] WebSocket connected
[FileExplorerStreaming] Session established: s1

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > retry policy > does not retry when closed with non-retryable close code
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/ws-1...
[FileExplorerStreaming] WebSocket connected
[FileExplorerStreaming] WebSocket disconnected: 4004 Workspace not found

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > retry policy > does not retry when server sends non-retryable error code before close
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/ws-1...
[FileExplorerStreaming] WebSocket connected
[FileExplorerStreaming] WebSocket disconnected: 1011 Rejected

stderr | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > retry policy > does not retry when server sends non-retryable error code before close
[FileExplorerStreaming] Server error: { code: 'WORKSPACE_NOT_FOUND', message: 'Workspace ws-1 not found' }

stdout | services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts > FileExplorerStreamingService > retry policy > keeps backoff progression when transport opens but protocol never connects
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/ws-1...
[FileExplorerStreaming] WebSocket connected
[FileExplorerStreaming] WebSocket disconnected: 1011 Transient
[FileExplorerStreaming] Scheduling reconnection in 1000ms (attempt 1)
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/ws-1...
[FileExplorerStreaming] WebSocket connected
[FileExplorerStreaming] WebSocket disconnected: 1011 Transient again
[FileExplorerStreaming] Scheduling reconnection in 2000ms (attempt 2)
[FileExplorerStreaming] Connecting to ws://localhost:8000/ws/file-explorer/ws-1...

 ✓ services/fileExplorerStreaming/__tests__/FileExplorerStreamingService.spec.ts (18 tests) 12ms
stdout | stores/__tests__/workspaceStore.reconnect-resync.spec.ts > workspaceStore File Explorer reconnect snapshot refresh > does not duplicate the initial snapshot refresh on first connect
[Workspace] Connecting to file system changes for workspace: ws-1

stdout | stores/__tests__/workspaceStore.reconnect-resync.spec.ts > workspaceStore File Explorer reconnect snapshot refresh > does not duplicate the initial snapshot refresh on first connect
[Workspace] Connected to file system changes: initial-session

stdout | stores/__tests__/workspaceStore.reconnect-resync.spec.ts > workspaceStore File Explorer reconnect snapshot refresh > refreshes the File Explorer snapshot when the live stream reconnects after an abnormal close
[Workspace] Connecting to file system changes for workspace: ws-1

stdout | stores/__tests__/workspaceStore.reconnect-resync.spec.ts > workspaceStore File Explorer reconnect snapshot refresh > refreshes the File Explorer snapshot when the live stream reconnects after an abnormal close
[Workspace] Disconnected from file system changes: File Explorer event queue overflow; reconnect required
[Workspace] Connected to file system changes: reconnected-session

 ✓ stores/__tests__/workspaceStore.reconnect-resync.spec.ts (2 tests) 9ms
stderr | stores/__tests__/workspaceStore.spec.ts > workspaceStore > createWorkspace > throws error if mutation fails
Error creating workspace metadata: Error: GraphQL Error
    at Proxy.createWorkspace (/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-web/stores/workspace.ts:174:17)
    at processTicksAndRejections (node:internal/process/task_queues:105:5)

stdout | stores/__tests__/workspaceStore.spec.ts > workspaceStore > createWorkspace > replaces stale metadata entries with the same root path and clears file-explorer state
[Workspace] Disconnected from file system watcher for workspace: stale-ws

stderr | stores/__tests__/workspaceStore.spec.ts > workspaceStore > fetchAllWorkspaces > ignores stale query results when backend binding revision changes mid-flight
[Workspace] Ignoring workspace query result for stale revision 1; current revision is 2

stdout | stores/__tests__/workspaceStore.spec.ts > workspaceStore > resetWorkspaceStateForBackendContextChange > disconnects all streams and clears metadata/file-explorer state without reload
[Workspace] Resetting workspace state due to backend_context_changed
[Workspace] Disconnected from file system watcher for workspace: ws-1

stdout | stores/__tests__/workspaceStore.spec.ts > workspaceStore > file explorer live sessions > opens one stream for multiple visible consumers and disconnects after final release
[Workspace] Connecting to file system changes for workspace: ws-1
[Workspace] Disconnected from file system watcher for workspace: ws-1

stdout | stores/__tests__/workspaceStore.spec.ts > workspaceStore > file explorer live sessions > returns an idempotent release function for duplicate consumer acquisition
[Workspace] Connecting to file system changes for workspace: ws-1
[Workspace] Disconnected from file system watcher for workspace: ws-1

stdout | stores/__tests__/workspaceStore.spec.ts > workspaceStore > file explorer live sessions > refreshes already-open folders in fileExplorerStore when a visible file explorer is reacquired
[Workspace] Connecting to file system changes for workspace: ws-1

stdout | stores/__tests__/workspaceStore.spec.ts > workspaceStore > file explorer live sessions > aborts snapshot refresh generation and ignores late folder responses after final release
[Workspace] Connecting to file system changes for workspace: ws-1
[Workspace] Disconnected from file system watcher for workspace: ws-1

 ✓ stores/__tests__/workspaceStore.spec.ts (12 tests) 33ms

 Test Files  3 passed (3)
      Tests  32 passed (32)
   Start at  18:51:27
   Duration  5.46s (transform 2.92s, setup 14.22s, collect 166ms, tests 54ms, environment 645ms, prepare 515ms)

```

## Web boundary guard
```console
$ pnpm -C autobyteus-web guard:web-boundary

> autobyteus@1.3.32 guard:web-boundary /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/autobyteus-web
> node ./scripts/guard-web-boundary.mjs

[guard:web-boundary] Passed.
```

## Scope-reduction grep (source only; removed semantic/invalidation scope must be absent)
```console
$ grep -R -n -E 'SemanticFileEventReconciler|ReconciledFileExplorerEvent|FILE_SYSTEM_INVALIDATED|FILE_SYSTEM_RESYNC_REQUIRED|filesystem identity|stale-scope|staleScope|targeted invalidation|targeted-invalidation|targetedInvalidation' autobyteus-server-ts/src autobyteus-web/stores
No removed-scope source terms found.
```

## Direct chokidar import grep
```console
$ grep -R -n -E "from ['\"]chokidar|require\(['\"]chokidar" autobyteus-server-ts/src
autobyteus-server-ts/src/file-explorer/watcher/runtime/chokidar-watcher-runtime.ts:1:import chokidar, { type FSWatcher } from "chokidar";
Direct chokidar import isolated to child runtime adapter.
```
