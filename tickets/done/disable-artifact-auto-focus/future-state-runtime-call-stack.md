# Future-State Runtime Call Stack — Disable Artifact Auto-Focus

## To-Be Spine: Live File Change Without Tab Focus Steal

### Spine ID: FS1 — FILE_CHANGE ingestion remains data-only for tab shell focus

1. Backend sends `FILE_CHANGE` over the agent or team WebSocket.
2. `AgentStreamingService.dispatchMessage(...)` or `TeamStreamingService.dispatchMessage(...)` routes the payload to `handleFileChange(...)`.
3. `handleFileChange(...)` normalizes the payload and calls `RunFileChangesStore.upsertFromLivePayload(...)`.
4. `RunFileChangesStore` upserts the artifact row and updates latest-visible artifact tracking as before.
5. `RightSideTabs.vue` does **not** subscribe to latest-visible artifact signals and does **not** call `setActiveTab('artifacts')` from artifact events.
6. The active right-side tab remains whatever the user or another intentional tab-switch rule selected.

### Spine ID: FS2 — User manually opens Artifacts and sees latest artifact

1. User selects the Artifacts tab in `RightSideTabs.vue` / `TabList`.
2. `handleTabSelect(...)` calls `setActiveTab('artifacts')` as an explicit user action.
3. `ArtifactsTab.vue` mounts/renders.
4. `ArtifactsTab.vue` reads `RunFileChangesStore.getArtifactsForRun(currentAgentRunId)`.
5. `ArtifactsTab.vue` watches `latestVisibleArtifactSignal` and selects the latest artifact row within the Artifacts tab.
6. `ArtifactContentViewer` displays the selected artifact using the existing preview route/buffer behavior.

### Spine ID: FS3 — Other tab-switch rules remain owned by right-side shell

1. Selection type changes may still switch to Team or Activity.
2. Visible-tabs validity watcher may still choose a valid tab if the current tab disappears.
3. Todo population may still switch to Activity.
4. File opening may still switch to Files.
5. Browser `open_tab` tool success may still switch to Browser through its dedicated handler.
6. None of these rules are changed by the artifact auto-focus removal.

## Ownership Boundaries

| Owner | Responsibility After Change |
| --- | --- |
| `RunFileChangesStore` | Artifact data and latest-visible signal for consumers that need artifact selection/refresh. |
| `ArtifactsTab.vue` | In-tab artifact row selection and viewer updates. |
| `RightSideTabs.vue` | User/intentional tab selection only; no artifact event focus policy. |
| Streaming handlers | Continue to ingest `FILE_CHANGE`; no UI focus side effects. |

## Off-Spine Concerns

- Repeated artifact events: still update store state, but no tab-focus loop exists.
- Active tab already Artifacts: no change required; Artifacts tab remains active because it was already active, not because an artifact event forced it.
- Hydration/reopen: `replaceRunProjection` does not announce latest-visible artifacts today; no change required.
- Accessibility/user agency: preserving active tab prevents focus stealing and improves control during long-running artifact-heavy tasks.
