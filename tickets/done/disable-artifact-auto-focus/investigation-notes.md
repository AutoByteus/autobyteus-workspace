# Investigation Notes — Disable Artifact Auto-Focus

## Scope

Investigate why the right-side tab panel switches to Artifacts when agent file changes arrive, then identify the minimal safe fix that preserves artifact data visibility without stealing tab focus.

## Current Runtime Path

1. Agent/team streaming receives a backend `FILE_CHANGE` event.
   - Single-agent dispatch: `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
   - Team dispatch: `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
2. Both dispatchers call `handleFileChange(...)`.
   - `autobyteus-web/services/agentStreaming/handlers/fileChangeHandler.ts`
3. `handleFileChange(...)` maps the payload to a `RunFileChangeArtifact` and calls `runFileChangesStore.upsertFromLivePayload(...)`.
4. `upsertFromLivePayload(...)` updates artifact rows and announces latest-visible artifacts:
   - new row: calls `announceLatestVisibleArtifact(...)`
   - existing row with a changed `sourceInvocationId`: calls `announceLatestVisibleArtifact(...)`
5. `RightSideTabs.vue` computes `latestVisibleArtifactSignal` for the active agent run and watches it.
6. The watcher calls `setActiveTab('artifacts')` whenever the signal is non-null and the active tab is not already `artifacts`.

## Root Cause

`components/layout/RightSideTabs.vue` contains an explicit auto-switch watcher:

```ts
watch(latestVisibleArtifactSignal, (newSignal) => {
  if (newSignal && activeTab.value !== 'artifacts') {
    setActiveTab('artifacts');
  }
});
```

This is intentional current behavior, not an accidental side effect of the generic file explorer watcher. It is triggered by the run-file-change/artifact sidecar store and can repeatedly pull focus back to Artifacts while a run emits many file changes.

## Related Behavior That Should Remain

- `RunFileChangesStore` should continue to ingest `FILE_CHANGE` rows.
- `ArtifactsTab.vue` should continue to watch `latestVisibleArtifactSignal` internally and select the latest artifact while the Artifacts tab is mounted/open.
- Manual tab selection should still work.
- Existing profile-selection behavior can continue to choose Team or Activity when switching selected context.
- File explorer open-file auto-switch is out of this request unless separately changed.

## Tests Found

`autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts` currently has tests asserting the undesired behavior:

- `switches to Artifacts when a touched file becomes newly visible`
- `does not reswitch when the artifacts tab is already active`

These tests need to be updated to assert that artifact signals do not call `setActiveTab('artifacts')` and do not interrupt the current tab.

## Documentation Impact

`autobyteus-web/docs/agent_execution_architecture.md` currently says the store tracks latest-visible discoverability so Artifacts can auto-focus. This durable documentation must be updated to reflect the new behavior: latest-visible discoverability drives in-tab selection/refresh only, not right-side tab focus stealing.

## Recommendation

Remove the `RightSideTabs.vue` artifact auto-switch watcher and its now-unused `useRunFileChangesStore`/`currentAgentRunId`/`latestVisibleArtifactSignal` dependencies from that shell component. Keep `ArtifactsTab.vue` unchanged so manual Artifacts opening still shows/selects newly visible rows.
