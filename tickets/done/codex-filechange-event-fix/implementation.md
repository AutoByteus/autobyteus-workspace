# Implementation

- Ticket: `codex-filechange-event-fix`
- Scope: `Small`
- Date: `2026-04-02`

## Solution Sketch

### Spine inventory

1. `Raw Codex fileChange item -> normalized segment spine`
   - Start: raw `item/started(fileChange)`
   - End: normalized `SEGMENT_START/SEGMENT_END(edit_file)`
   - Owner: Codex item event converter

2. `Raw Codex fileChange item -> normalized tool lifecycle spine`
   - Start: raw `item/started(fileChange)`
   - End: normalized `TOOL_EXECUTION_STARTED` then terminal `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED`
   - Owner: Codex item event converter

3. `Raw Codex fileChange item -> touched-file artifact projection spine`
   - Start: raw `item/started(fileChange)`
   - End: normalized `ARTIFACT_UPDATED` then `ARTIFACT_PERSISTED` with explicit `path` / `type=file`
   - Owner: Codex item event converter

4. `Raw Codex fileChange log spine`
   - Start: raw `item/fileChange/outputDelta`
   - End: normalized `TOOL_LOG`
   - Owner: Codex item event converter

### Boundary / ownership rules

- Raw Codex event interpretation remains in `autobyteus-server-ts/src/agent-execution/backends/codex/events/`.
- The item converter owns the `fileChange` raw-item fan-out because that is the authoritative boundary for Codex item events.
- The backend dispatcher may forward multiple normalized events for one raw Codex event, but higher layers still only depend on normalized `AgentRunEvent`s.
- No frontend workaround should infer tool success from artifact availability.

## Change Inventory

- Modify: Codex thread backend event dispatch to forward multiple normalized events per raw Codex event.
- Modify: Codex item-event conversion to fan out `fileChange` raw items into segment, lifecycle, artifact, and log events.
- Modify: Codex raw turn mapping to stop using malformed legacy diff-event names in changed scope.
- Add/modify: focused unit + integration validation for the corrected `fileChange` path.

## Execution Notes

Implemented:
- `codex-thread-event-name.ts`
- `codex-item-event-converter.ts`
- `codex-turn-event-converter.ts`
- `codex-thread-event-converter.ts`
- `codex-agent-run-backend.ts`
- focused unit/integration tests

Result:
- `fileChange` start now emits normalized segment + lifecycle + artifact events.
- `fileChange` completion now emits normalized terminal lifecycle + persisted artifact + segment end.
- backend artifact payloads now carry `agent_id` and `workspace_root` for Codex file-change projections.

## Re-Entry Note

- `2026-04-02`: broader Codex validation exposed a pre-existing failing unit suite in `tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts`.
- The provider under test was not changed in this ticket; the failure is stale test input shape against the current provider contract (`input.source.*`).
- Local fix scope: update that unit suite only, keep the Codex fileChange converter boundary unchanged, and rerun the broader Codex sweep.
- Completed local fix:
  - added `createProjectionInput(...)` to the unit suite so one owned helper constructs the current provider contract,
  - updated all five test cases to call `buildProjection(...)` through that authoritative helper,
  - left production run-history projection code untouched.
