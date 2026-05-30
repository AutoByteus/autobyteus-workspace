# API/E2E command log
UTC 2026-05-29T15:23:05Z
## git diff --check
## TypeScript build config noEmit
## Targeted unit suites

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
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/watcher-runtime-unit-L3tnTD' with ignore strategies:

stdout | tests/unit/file-explorer/file-system-watcher-runtime.test.ts > FileSystemWatcher runtime boundary > logical stop returns after requesting child stop without waiting for child stopped
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/watcher-runtime-unit-L3tnTD

stdout | tests/unit/file-explorer/file-system-watcher-runtime.test.ts > FileSystemWatcher runtime boundary > logical stop returns after requesting child stop without waiting for child stopped
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/watcher-runtime-unit-L3tnTD

stdout | tests/unit/file-explorer/file-system-watcher-runtime.test.ts > FileSystemWatcher runtime boundary > ignores raw events whose watcher generation is stale
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/watcher-runtime-unit-bweaMr' with ignore strategies:

stdout | tests/unit/file-explorer/file-system-watcher-runtime.test.ts > FileSystemWatcher runtime boundary > ignores raw events whose watcher generation is stale
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/watcher-runtime-unit-bweaMr

stdout | tests/unit/file-explorer/file-system-watcher-runtime.test.ts > FileSystemWatcher runtime boundary > ignores raw events whose watcher generation is stale
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/watcher-runtime-unit-bweaMr

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
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-rename-leaf-HzQCEX' with max_depth=null

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > renames files with valid leaf names
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-rename-leaf-HzQCEX' completed in 0.0010 seconds.

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > rejects path-like rename names before filesystem mutation
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-rename-boundary-5PWLM2/ws' with max_depth=null

stdout | tests/unit/file-explorer/workspace-file-explorer.test.ts > WorkspaceFileExplorer > rejects path-like rename names before filesystem mutation
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-rename-boundary-5PWLM2/ws' completed in 0.0010 seconds.

 ✓ tests/unit/file-explorer/workspace-file-explorer.test.ts (11 tests) 27ms
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

 ✓ tests/unit/file-explorer/file-name-indexer.test.ts (4 tests) 5ms
 ✓ tests/unit/file-explorer/workspace-search-snapshot-controller.test.ts (5 tests) 5ms
 ✓ tests/unit/file-explorer/watcher-runtime-protocol.test.ts (3 tests) 2ms

 Test Files  5 passed (5)
      Tests  25 passed (25)
   Start at  17:23:09
   Duration  1.14s (transform 171ms, setup 45ms, import 254ms, tests 98ms, environment 0ms)

## Targeted watcher integration suite

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
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-6iX2zw' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-6iX2zw' completed in 0.0010 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-6iX2zw' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-6iX2zw

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-pw6nli' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-pw6nli' completed in 0.0090 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-pw6nli' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-pw6nli

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-pw6nli

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing root .gitignore excluded directories
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-6iX2zw

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-kLirNB' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-kLirNB' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-kLirNB' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-kLirNB

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MQqMXY' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MQqMXY' completed in 0.0020 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MQqMXY' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MQqMXY

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MQqMXY

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > does not emit events for pre-existing nested .gitignore excluded directories
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-kLirNB

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vYh9Fk' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vYh9Fk' completed in 0.0010 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vYh9Fk' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vYh9Fk

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vYh9Fk/watch.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Watcher detected modification: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vYh9Fk/watch.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Watcher detected deletion: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vYh9Fk/watch.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits add + modify + delete events
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vYh9Fk

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > returns one idle event stream without stopping other subscribers
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MRE1cs' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > returns one idle event stream without stopping other subscribers
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MRE1cs' completed in 0.0010 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > returns one idle event stream without stopping other subscribers
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MRE1cs' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > returns one idle event stream without stopping other subscribers
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MRE1cs

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > returns one idle event stream without stopping other subscribers
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MRE1cs/second-subscriber-still-live.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > returns one idle event stream without stopping other subscribers
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-MRE1cs

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-JdLCGi' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-JdLCGi' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-JdLCGi' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-JdLCGi

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-JdLCGi/source.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
Watcher detected move from /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-JdLCGi/source.txt to /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-JdLCGi/renamed.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits move/rename event
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-JdLCGi

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits file creation event with node metadata
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-teWlmr' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits file creation event with node metadata
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-teWlmr' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits file creation event with node metadata
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-teWlmr' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits file creation event with node metadata
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-teWlmr

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits file creation event with node metadata
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-teWlmr/new_file.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits file creation event with node metadata
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-teWlmr

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BgGrlT' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BgGrlT' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BgGrlT' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BgGrlT

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BgGrlT/new_folder

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BgGrlT' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BgGrlT' completed in 0.0010 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Watcher detected deletion: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BgGrlT/new_folder

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits folder creation and deletion events
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BgGrlT

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores default strategy paths like __pycache__
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-bBnocj' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores default strategy paths like __pycache__
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-bBnocj' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores default strategy paths like __pycache__
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-bBnocj' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores default strategy paths like __pycache__
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-bBnocj

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores default strategy paths like __pycache__
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-bBnocj

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores specific folders like .git and their contents
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-5I0UN9' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores specific folders like .git and their contents
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-5I0UN9' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores specific folders like .git and their contents
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-5I0UN9' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores specific folders like .git and their contents
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-5I0UN9

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > ignores specific folders like .git and their contents
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-5I0UN9

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-QlVIzB' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-QlVIzB' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-QlVIzB' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-QlVIzB

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-QlVIzB/project

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-QlVIzB/project/.gitignore

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-QlVIzB/project/main.ts

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects nested .gitignore files
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-QlVIzB

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects root .gitignore files
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BHRmJg' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects root .gitignore files
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BHRmJg' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects root .gitignore files
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BHRmJg' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects root .gitignore files
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BHRmJg

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects root .gitignore files
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BHRmJg/.gitignore

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > respects root .gitignore files
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-BHRmJg

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vlDpAX' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vlDpAX' completed in 0.0010 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vlDpAX' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vlDpAX

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vlDpAX/another_folder

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vlDpAX/another_file.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > captures rapid changes without dropping events
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-vlDpAX

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Nc6Uay' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Nc6Uay' completed in 0.0010 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Nc6Uay' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Nc6Uay

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Nc6Uay/.gitignore

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Nc6Uay/main.js

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Watcher detected deletion: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Nc6Uay/main.js

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > treats moves into ignored directories as deletes from the visible tree
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-Nc6Uay

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-lKbsKj' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-lKbsKj' completed in 0.0010 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
FileSystemWatcher initialized for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-lKbsKj' with ignore strategies: SpecificFolderIgnoreStrategy, GitIgnoreStrategy

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Started filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-lKbsKj

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Watcher detected creation: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-lKbsKj/ghost_file.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Starting directory traversal for: '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-lKbsKj' with max_depth=null

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Directory traversal for '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-lKbsKj' completed in 0.0000 seconds.

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Watcher detected deletion: /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-lKbsKj/ghost_file.txt

stdout | tests/integration/file-explorer/file-system-watcher.integration.test.ts > FileSystemWatcher integration > emits delete events even if the in-memory node is missing
Logically stopped filesystem watcher for workspace /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-server-ts-watch-lKbsKj

 ✓ tests/integration/file-explorer/file-system-watcher.integration.test.ts (14 tests) 16882ms
     ✓ does not emit events for pre-existing root .gitignore excluded directories  1154ms
     ✓ does not emit events for pre-existing nested .gitignore excluded directories  1113ms
     ✓ emits add + modify + delete events  1585ms
     ✓ returns one idle event stream without stopping other subscribers  524ms
     ✓ emits move/rename event  986ms
     ✓ emits file creation event with node metadata  518ms
     ✓ emits folder creation and deletion events  783ms
     ✓ ignores default strategy paths like __pycache__  847ms
     ✓ ignores specific folders like .git and their contents  1648ms
     ✓ respects nested .gitignore files  2263ms
     ✓ respects root .gitignore files  1524ms
     ✓ captures rapid changes without dropping events  314ms
     ✓ treats moves into ignored directories as deletes from the visible tree  2554ms
     ✓ emits delete events even if the in-memory node is missing  1068ms

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  17:23:11
   Duration  17.44s (transform 140ms, setup 17ms, import 134ms, tests 16.88s, environment 0ms)

## Build

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

✔ Generated Prisma Client (v5.22.0) to ./../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client in 71ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Want real-time updates to your database without manual polling? Discover how with Pulse: https://pris.ly/tip-0-pulse


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
(node:2832) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
Built-in agents bootstrap smoke check passed.
