# Investigation Notes

## Status
- Completed for this iteration (re-open if live validation reveals new payload variants)

## Date
- 2026-02-25

## Problem Statement Snapshot
- User-observed behavior: Codex runtime can execute internal tools (for example shell/file operations), but the right-side Activity panel shows `0 Events` and no tool lifecycle appears.
- Target behavior: Codex tool lifecycle should map to canonical platform events and render in existing frontend Activity/segment UI without runtime-specific UI logic.
- Re-opened symptom (current iteration): Activity shows `edit_file` with `arguments.path=""` and `arguments.patch=""` even when file was actually created/edited.
- Re-opened symptom (latest iteration): Activity shows `run_bash` with `arguments.command=""` even when command executed and output was returned.

## Sources Consulted
- Backend adapter and runtime bridge:
  - `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
  - `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-method-normalizer.ts`
  - `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
- Frontend stream handlers and stores:
  - `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
  - `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`
  - `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`
  - `autobyteus-web/services/agentStreaming/handlers/toolLifecycleParsers.ts`
  - `autobyteus-web/services/agentStreaming/protocol/segmentTypes.ts`
  - `autobyteus-web/stores/agentActivityStore.ts`
- Existing tests and prior redesign artifacts:
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`
  - `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts`
  - `autobyteus-server-ts/tickets/codex-runtime-server-owned-redesign/*`
- Runtime payload capture (local script against codex app-server client):
  - `autobyteus-server-ts/dist/runtime-execution/codex-app-server/codex-app-server-client.js`

## Current Pipeline Findings

### 1. Activity creation depends on SEGMENT_START tool-like segment types
- Frontend Activity entries are created in `handleSegmentStart` only when `segment_type` is one of:
  - `tool_call`, `write_file`, `run_bash`, `edit_file`
- If Codex event mapping emits non-tool segment types (for example fallback `text`) or no segment start for a tool invocation, Activity entry is never created.

### 2. Tool lifecycle handlers require a pre-existing tool segment
- `toolLifecycleHandler.ts` uses `findSegmentById` and then requires segment type in tool lifecycle set.
- If no matching segment exists, or matching segment exists but type is not tool lifecycle, event is dropped with warning.
- Current behavior does not synthesize tool segment/activity on TOOL_* events.

### 3. Codex adapter item-type normalization is strict in some branches
- `asSegmentType` normalizes a finite set of exact aliases.
- Unknown/variant item types can degrade to `text`, which bypasses Activity creation.
- `item/added` mapping does not currently include aggressive string-shape normalization for item type variants beyond explicit aliases.

### 4. ID correlation risk exists between SEGMENT_START and TOOL_* payloads
- `SEGMENT_START` id for `item/added` is currently `resolveSegmentId(payload)`.
- TOOL_* events resolve `invocation_id` from broader fields including approval-derived values.
- If these ids diverge for the same logical invocation, lifecycle updates may not attach to an existing segment/activity.

### 5. Existing tests do not cover missing-segment tool lifecycle recovery
- Server mapper tests focus on method→message mapping correctness.
- Frontend tool lifecycle tests assume a pre-existing segment.
- No test currently validates a no-SEGMENT_START path where TOOL_EXECUTION_* still creates visible lifecycle UI.

### 6. File-change argument extraction drops real path/diff when placeholder args are present
- Codex file-change events can carry real file edit data in `item.changes[]` (for example `[{ path, diff }]`).
- Current adapter behavior preferred `payload.arguments` immediately when object keys exist.
- When runtime sends placeholder `arguments: { path: "", patch: "" }`, the adapter returned these empty values and never read `item.changes[]`.
- Result: frontend receives/keeps empty `edit_file` arguments and renders blank path/patch.

### 7. `run_bash` command lives in `payload.item.command`, but metadata did not carry it to Activity bootstrap
- Live payload capture showed command execution events with command under `payload.item.command` (for example `/bin/bash -lc 'python fibonacci.py'`).
- Frontend Activity row for `run_bash` is initialized from segment metadata at `SEGMENT_START`.
- Adapter previously did not always include normalized `metadata.command` for segment start/end in this path.
- Result: `run_bash` tool card rendered with parsed status but empty `command`.

## Constraints
- Keep strict separation of concerns:
  - backend adapter normalizes runtime-specific event shapes into canonical protocol;
  - frontend remains runtime-agnostic and only consumes canonical protocol.
- No legacy compatibility wrappers; clean canonical pipeline preferred.
- Frontend changes should be minimal and generic (not codex-specific branching in view layer).

## Root-Cause Hypothesis (High Confidence)
- Primary cause: missing/weak guarantee that each tool lifecycle invocation has a canonical tool segment anchor before TOOL_* updates.
- Contributing cause: item-type alias gaps can classify tool-like Codex items as `text`, preventing Activity bootstrap.
- Additional confirmed cause (current iteration): argument resolver trusted placeholder-empty explicit arguments and skipped `item.changes[]` fallback extraction.
- Additional confirmed cause (latest iteration): command extraction existed in payload but was not consistently surfaced as canonical segment metadata/args for the `run_bash` Activity bootstrap path.

## Unknowns
- Exact Codex payload variants for all tool item types in the wild (depends on app-server version).
- Frequency of invocation-id shape divergence in real runs (plain `itemId` vs `itemId:approvalId` forms).
- Whether some codex app-server versions emit multi-change edits that should be surfaced as aggregated patch or first-change patch in canonical payload.
- Whether future codex app-server variants place command only in action arrays (`commandActions[]`) and require fallback extraction precedence.

## Implications For Requirements/Design
- Requirements must explicitly state lifecycle-visibility guarantee independent of message ordering.
- Design must define a canonical "tool lifecycle anchor" strategy:
  - backend improves tool-item classification and id alignment;
  - frontend generic fallback upsert for TOOL_* when segment start is absent.
- Tests must include both normal path and no-segment-start path.
- Adapter design must treat empty-string arguments as non-authoritative and derive `edit_file.path/patch` from richer runtime structures (`change`, `file_change`, `changes[]`) before emitting canonical tool payloads.
- Adapter design must treat `run_bash.command` as canonical metadata and derive from `payload.command`, `item.command`, and command action variants so segment start/end both have non-empty command whenever present in runtime payload.
