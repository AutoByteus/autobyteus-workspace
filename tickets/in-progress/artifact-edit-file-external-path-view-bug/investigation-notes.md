# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Current
- Investigation Goal: Determine why `edit_file` artifacts render blank content for files outside the active run workspace and identify the narrowest safe fix.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: the failure is contained to artifact content resolution in the web client; no evidence currently requires a backend contract change.
- Scope Summary: fix artifact viewer workspace resolution for absolute file paths that belong to another known workspace root.

## Request Context

- The user reports that `edit_file` artifacts appear in the Artifacts tab but open as empty.
- The underlying files are not empty when opened directly.
- The failing case involves a file path outside the agent's current workspace.

## Bootstrap / Repository Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/artifact-edit-file-external-path-view-bug`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/artifact-edit-file-external-path-view-bug/tickets/in-progress/artifact-edit-file-external-path-view-bug`
- Current Branch: `codex/artifact-edit-file-external-path-view-bug`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/artifact-edit-file-external-path-view-bug`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --all --prune` succeeded on `2026-04-09`
- Task Branch: `codex/artifact-edit-file-external-path-view-bug`
- Bootstrap Blockers: None

## Current Behavior / Current Flow

- `SEGMENT_START(edit_file)` creates the touched-file row immediately.
- `ARTIFACT_UPDATED` later enriches the row with `workspaceRoot`.
- `ArtifactContentViewer.vue` treats `edit_file` text as workspace-backed only and refuses to render patch/diff payload fallback.
- The viewer currently resolves a workspace-backed URL by:
  - exact `workspaceRoot` -> loaded workspace absolute-path match, else
  - run context `workspaceId` fallback.
- If the artifact path is absolute and does not live under the chosen workspace's `absolutePath`, `artifactUrl` becomes `null` and the viewer stays blank.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | resolves and fetches selected artifact content | workspace lookup is too narrow for absolute paths outside the current run workspace | primary defect surface |
| `autobyteus-web/stores/workspace.ts` | stores loaded workspaces with `absolutePath` | the app can know about multiple workspaces, but the viewer does not search them by artifact path | viewer can fix this without backend changes |
| `autobyteus-web/services/runHydration/runContextHydrationService.ts` | resolves historical runs back to workspace ids | the app already has a pattern for ensuring workspace identity by root path | confirms multi-workspace resolution is an existing concept |
| `autobyteus-server-ts/src/api/rest/workspaces.ts` | serves file content only within a workspace boundary | server already supports content fetch for any registered workspace root | no new file-serving route is required if the correct workspace is selected |
| `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts` | emits artifact update metadata | `edit_file` only emits `workspace_root = context.workspaceRootPath`, not the actual containing root of an external absolute file | frontend must not assume `workspace_root` is always the fetch root |

## Findings From Code / Docs

- The prior `edit_file` blank-pane fix already handles late metadata refresh by watching `updatedAt`, `artifactUrl`, and retry signals.
- The remaining blank case occurs earlier than fetch: `artifactUrl` is never produced.
- `artifactUrl` returns `null` when:
  - there is no exact `workspaceRoot` match in loaded workspaces, and
  - the fallback run workspace does not contain the absolute artifact path.
- The workspace REST route is already capable of serving the file if the frontend picks the correct workspace id and relative path.
- The workspace store already holds `absolutePath` for all loaded workspaces, so path-prefix matching is feasible on the client.

## Root Cause

- The artifact viewer assumes the file being edited belongs either to:
  - the workspace whose root exactly matches `artifact.workspaceRoot`, or
  - the run's configured workspace id.
- That assumption fails when an `edit_file` artifact references an absolute file under a different known workspace root.
- Because `edit_file` deliberately suppresses patch/diff fallback, the lack of a resolved workspace URL leaves the pane empty.

## Narrowest Safe Fix Direction

- Resolve the artifact against the best matching known workspace root by absolute-path prefix, not only the run workspace.
- Prefer the longest matching workspace root when multiple workspaces could contain the file.
- If the workspace catalog has not been loaded yet, refresh it once before declaring the path unresolved.
- Preserve current behavior for:
  - in-workspace `edit_file`,
  - streaming `write_file`,
  - generated-output URLs.

## Open Unknowns / Risks

- If the edited file lives outside every registered workspace, the viewer will still be unable to fetch content without a broader product decision.
- Need to verify that refreshing the workspace catalog on demand does not cause redundant fetch loops in the viewer.
