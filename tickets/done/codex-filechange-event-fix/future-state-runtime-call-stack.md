# Future-State Runtime Call Stack

## Primary end-to-end spine: Codex `apply_patch` / `fileChange`

1. Codex raw event arrives at `CodexThreadEventConverter`
2. `convertCodexItemEvent(...)` recognizes `item.type = fileChange`
3. The converter emits normalized events in this order:
   - on `item/started(fileChange)`:
     - `SEGMENT_START(edit_file)`
     - `TOOL_EXECUTION_STARTED(edit_file)`
     - `ARTIFACT_UPDATED(path, type=file)`
   - on `item/fileChange/outputDelta`:
     - `TOOL_LOG(edit_file)`
   - on `item/completed(fileChange)`:
     - terminal lifecycle event (`TOOL_EXECUTION_SUCCEEDED` or `TOOL_EXECUTION_FAILED`)
     - success case also emits `ARTIFACT_PERSISTED(path, type=file)`
     - `SEGMENT_END(edit_file)`
4. `CodexAgentRunBackend` dispatches each normalized event sequentially to runtime listeners
5. Frontend segment/activity/artifact handlers consume the normal runtime events without Codex-specific special cases

## Why this shape is correct

- One authoritative owner interprets raw `fileChange` items.
- The frontend receives the same normalized event subjects it already owns: segment, lifecycle, artifact, and log.
- The touched-files row and the activity row no longer depend on malformed or missing Codex event translations.
