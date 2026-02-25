# Future-State Runtime Call Stack

## Scope
- Ticket: `codex-tool-activity-mapping`
- Design basis: `tickets/in-progress/codex-tool-activity-mapping/proposed-design.md` (`v3`)
- Requirements: `tickets/in-progress/codex-tool-activity-mapping/requirements.md` (status `Refined`)

## UC-001 Codex Tool-Like Item Classification
- use_case_id: `UC-001`
- requirement_ids: `R-001`, `R-005`

### Primary Path
1. Codex app server emits `item/added` with `params.item.type` variant (for example `command_execution_call`, `file_change`, `function_call`).
2. `RuntimeEventMessageMapper.map()` routes non-autobyteus event to `CodexRuntimeEventAdapter.map()`.
3. Adapter `resolveSegmentType()` applies normalized classification rules and infers canonical segment type.
4. Adapter emits `ServerMessage(type=SEGMENT_START, payload={id, segment_type, metadata})`.
5. Frontend `AgentStreamingService.dispatchMessage()` sends message to `handleSegmentStart()`.
6. `segmentHandler` creates tool segment and sidecar Activity row.

### Error Path
1. `item.type` is unknown and has no tool signal.
2. Adapter falls back to `segment_type=text`.
3. No Activity is created (expected for non-tool).

## UC-002 TOOL_* Arrives Before SEGMENT_START
- use_case_id: `UC-002`
- requirement_ids: `R-002`, `R-003`, `R-005`

### Primary Path
1. Frontend receives `TOOL_EXECUTION_STARTED`/`TOOL_APPROVAL_REQUESTED` for invocation id with no existing segment.
2. `handleTool*` parser validates canonical payload (`invocation_id`, `tool_name`, optional args).
3. `ensureToolLifecycleSegment()` detects missing segment and creates synthetic canonical segment:
   - `terminal_command` for `run_bash` or command args,
   - `edit_file` for `edit_file` or patch/path args,
   - `write_file` for `write_file`,
   - otherwise `tool_call`.
4. Helper also creates Activity entry for that invocation id.
5. Original lifecycle transition logic is applied (status/log/result/error).
6. UI renders tool segment + Activity feed row in same run.

### Fallback Path
1. Later `SEGMENT_START` arrives for same invocation id.
2. Existing segment lookup resolves already-created segment; no duplicate activity row is created.

### Error Path
1. TOOL_* payload missing required fields (for example empty invocation id/tool name).
2. Parser returns null.
3. Handler logs malformed payload and drops event.

## UC-003 Approval Lifecycle
- use_case_id: `UC-003`
- requirement_ids: `R-003`, `R-004`, `R-005`

### Primary Path
1. Backend emits canonical `TOOL_APPROVAL_REQUESTED`.
2. Frontend upserts segment/activity if needed.
3. Segment transitions to `awaiting-approval`; Activity mirrors status.
4. `TOOL_APPROVED` or `TOOL_DENIED` transitions to `approved` or terminal `denied`.

### Error Path
1. Denied payload lacks reason and error.
2. Parser rejects payload; no invalid state transition occurs.

## UC-004 Execution Logs And Terminal State
- use_case_id: `UC-004`
- requirement_ids: `R-003`, `R-005`

### Primary Path
1. Backend emits `TOOL_EXECUTION_STARTED` -> `TOOL_LOG`* -> `TOOL_EXECUTION_SUCCEEDED`.
2. Frontend lifecycle handler merges args, appends logs, and sets terminal `success` + result.
3. Activity store reflects logs/result/status and keeps invocation-level consistency.

### Error Path
1. Backend emits `TOOL_EXECUTION_FAILED`.
2. Frontend sets segment/activity status to `error`, stores error message.

## UC-005 Non-Tool Event Isolation
- use_case_id: `UC-005`
- requirement_ids: `R-004`, `R-005`

### Primary Path
1. Backend emits text/reasoning/user lifecycle events.
2. Adapter keeps canonical non-tool segment mapping.
3. Frontend tool lifecycle fallback is never invoked.
4. Existing text/reasoning UX remains unchanged.

## UC-006 File-Change Placeholder Argument Recovery
- use_case_id: `UC-006`
- requirement_ids: `R-006`, `R-005`

### Primary Path
1. Codex emits `item/fileChange/requestApproval` (or alias) with `arguments: { path: "", patch: "" }` and nested edit payload in `item.changes[]`.
2. `RuntimeEventMessageMapper.map()` routes event into `CodexRuntimeEventAdapter.map()`.
3. Adapter `resolveToolArguments(..., "edit_file")` sanitizes empty-string placeholders and checks nested file-change structures (`change`, `file_change`, `changes[]`).
4. Adapter derives canonical arguments:
   - `path` from first non-empty file-change path,
   - `patch` from first non-empty diff/patch content.
5. Adapter emits canonical `TOOL_APPROVAL_REQUESTED` (or other tool lifecycle event) with non-empty `arguments.path` and `arguments.patch`.
6. Frontend lifecycle parser ingests canonical arguments and segment/activity display path/patch correctly.

### Fallback Path
1. Explicit arguments already contain non-empty values.
2. Adapter keeps explicit values as authoritative and still sanitizes empty fields.

### Error Path
1. Runtime payload provides no non-empty path/patch in any inspected location.
2. Adapter emits minimal sanitized arguments object without fabricated values.

## UC-007 Run-Bash Command Argument Recovery
- use_case_id: `UC-007`
- requirement_ids: `R-007`, `R-005`

### Primary Path
1. Codex emits command-execution item lifecycle (`item/added`, `item/completed`, or command method alias) with command text under `payload.item.command` (or direct command/action variants).
2. `RuntimeEventMessageMapper.map()` routes runtime event to `CodexRuntimeEventAdapter.map()`.
3. Adapter `resolveCommandValue()` derives command from prioritized runtime fields and emits canonical `run_bash` metadata/arguments with non-empty `command`.
4. Frontend `handleSegmentStart()` initializes terminal-command segment and Activity row with metadata command.
5. Frontend `handleSegmentEnd()` merges end metadata into segment/activity arguments so command remains populated across lifecycle completion.

### Fallback Path
1. Start event lacks metadata command but end event has it.
2. Frontend end-finalization hydrates missing command from end metadata and updates Activity arguments.

### Error Path
1. Runtime payload does not contain command text in any inspected location.
2. Adapter emits minimal sanitized payload without fabricated command.
