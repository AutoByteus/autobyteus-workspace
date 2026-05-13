# Implementation Plan — Disable Artifact Auto-Focus

## Design Basis / Solution Sketch

### Current Ownership

- `RunFileChangesStore` owns live/hydrated artifact rows and latest-visible artifact signals.
- `ArtifactsTab.vue` owns artifact list/viewer selection while the Artifacts tab is mounted.
- `RightSideTabs.vue` owns right-side tab shell selection and currently includes a watcher that turns artifact discoverability into global tab focus.

### Target Behavior

Artifact discoverability remains data-only at the shell level. New `FILE_CHANGE` events may update `RunFileChangesStore.latestVisibleArtifactSignal`, but the right-side tab shell must not interpret that signal as a command to switch tabs.

### Source Changes

1. `autobyteus-web/components/layout/RightSideTabs.vue`
   - Remove `useRunFileChangesStore` import and store initialization.
   - Remove `latestVisibleArtifactSignal` computed from the tab shell.
   - Remove the watcher that calls `setActiveTab('artifacts')` on artifact signals.
   - Keep other tab-selection watchers unchanged.

2. `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts`
   - Replace the old auto-switch assertion with regression coverage that an artifact signal does not call `setActiveTab('artifacts')` while a non-Artifacts tab is active.
   - Add repeated-signal coverage so repeated artifact updates do not steal focus.
   - Keep existing shell layout test.

3. `autobyteus-web/docs/agent_execution_architecture.md`
   - Update the RunFileChangesStore bullet from “auto-focus” to “in-tab latest artifact selection/refresh when the user opens Artifacts.”

### Validation Plan

- Run the targeted right-side tab component test.
- Run artifact tab tests to confirm in-tab latest artifact selection remains intact.
- Run file-change handler/store tests to confirm artifact ingestion still works.

## Execution Tracking

### Stage 6 Implementation Completed

Changed files:

- `autobyteus-web/components/layout/RightSideTabs.vue`
- `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts`
- `autobyteus-web/docs/agent_execution_architecture.md`

Implementation details:

- Removed the Artifacts auto-focus watcher from the right-side tab shell.
- Removed now-unused `RunFileChangesStore` dependency from `RightSideTabs.vue`.
- Updated component tests to assert artifact signals do not call `setActiveTab('artifacts')`, including repeated-signal coverage.
- Updated durable architecture documentation to describe latest-visible artifact tracking as in-tab selection/refresh, not focus stealing.

Stage 6 verification executed:

```bash
cd autobyteus-web && pnpm exec vitest run \
  components/layout/__tests__/RightSideTabs.spec.ts \
  components/workspace/agent/__tests__/ArtifactsTab.spec.ts \
  services/agentStreaming/handlers/__tests__/fileChangeHandler.spec.ts \
  stores/__tests__/runFileChangesStore.spec.ts
```

Result: Pass — 4 test files, 12 tests.

Environment setup note: the dedicated worktree needed `pnpm install --frozen-lockfile --prefer-offline` and `pnpm exec nuxi prepare` before tests because ignored dependency/generated directories are not copied into git worktrees.
