# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

When an agent is run through the Claude Agent SDK runtime, tool-call cards in the UI Activity panel can show only `Result` and omit `Arguments`. The same Activity panel shows arguments for Codex runtime tool calls. Investigation must determine whether this is upstream Claude SDK behavior or our runtime/event/UI handling, then define a fix so Claude SDK tool calls expose invocation arguments consistently.

## Investigation Findings

The issue is from our side, not from missing Claude SDK data.

- The local Claude Agent SDK package is `@anthropic-ai/claude-agent-sdk@0.2.71`; its emitted assistant messages include `tool_use` blocks whose `input` contains the tool arguments.
- A Claude runtime e2e run with raw-event logging captured non-empty arguments in raw SDK events, e.g. a `Bash` tool_use block with `input.command` and a `Write` tool_use block with `input.file_path`/`input.content`.
- Our `ClaudeSessionToolUseCoordinator.processToolLifecycleChunk` currently tracks assistant `tool_use` arguments internally but does not emit `ITEM_COMMAND_EXECUTION_STARTED` for those observed tool_use blocks. It emits `ITEM_COMMAND_EXECUTION_COMPLETED` on the later `tool_result` without including the tracked arguments.
- When the SDK permission callback runs, `handleToolPermissionCheck` emits started/approval events with `arguments`, so those tool calls can show arguments. When a tool is executed without that permission callback path (safe built-in call, auto-allowed call, or result-only observed path), the frontend first sees only `TOOL_EXECUTION_SUCCEEDED`; `handleToolExecutionSucceeded` creates a synthetic activity with `{}` arguments and the Activity item hides the Arguments section.
- The current Claude e2e test also has a fragility: it picks the first `TOOL_EXECUTION_SUCCEEDED`, which can be an unapproved preliminary tool such as `Bash pwd`, then waits for `TOOL_APPROVED` for that unrelated invocation. The test command therefore failed after producing useful evidence; the failure is not the user-facing root cause.

Evidence files:

- Raw Claude SDK JSONL log: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/in-progress/claude-sdk-tool-arguments-activity/logs/claude-raw-events/claude-run-12670a43-469e-4352-9b92-d37f5cd85384.jsonl`
- E2E/runtime console log: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/in-progress/claude-sdk-tool-arguments-activity/logs/claude-tool-lifecycle-e2e.log`

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: Raw Claude SDK `tool_use.input` contains arguments; our coordinator records but does not emit a started event for observed tool_use blocks, and completion payloads omit tracked args. Frontend already renders arguments when a started/approval event carries them.
- Requirement or scope impact: Fix the Claude runtime tool lifecycle normalization boundary; keep frontend changes minimal and only add regression coverage where needed.

## Recommendations

- Make `ClaudeSessionToolUseCoordinator` the single owner of observed Claude tool invocation lifecycle state: when it observes an assistant `tool_use`, it should emit a normalized started event with arguments unless that invocation has already emitted a started event via `handleToolPermissionCheck`.
- Preserve/send the tracked arguments on completion/failure events as a defensive fallback so result-first consumers, memory persistence, and history projection can recover the arguments even if a started event is missed or arrives out of order.
- Keep the existing frontend Activity rendering model; it should not need a Claude-specific side channel.
- Add unit regression coverage for the observed `tool_use -> tool_result` path and update the Claude e2e test to assert arguments on both started/approval and Activity-producing websocket messages without picking an unrelated preliminary success.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- Claude SDK emits an assistant `tool_use` block followed by a user `tool_result`, without the permission callback being invoked for that tool call.
- Claude SDK permission callback path emits started/approval events with arguments and must not create duplicate started/activity records for the same invocation.
- Frontend Activity panel receives Claude runtime tool lifecycle websocket messages and shows `Arguments` for tool calls with non-empty arguments.
- Historical/memory projection should retain arguments for Claude tool calls when it receives normalized lifecycle events.
- Existing Codex runtime tool-call argument rendering must continue to work.

## Out of Scope

- Changing Claude model/tool-selection behavior.
- Redesigning the Activity panel visual layout.
- Replacing the runtime event model or adding a Claude-only frontend side channel.
- Making empty-object arguments visually prominent; empty arguments can remain hidden if the payload is truly empty.

## Functional Requirements

- REQ-001: Every Claude SDK tool invocation with arguments available in a raw `tool_use.input`/`tool_use.arguments` block must produce a normalized tool lifecycle event containing those arguments before or no later than completion.
- REQ-002: The Claude runtime must avoid duplicate `TOOL_EXECUTION_STARTED`/activity creation for the same invocation when both raw `tool_use` observation and the SDK permission callback observe the same call.
- REQ-003: `TOOL_EXECUTION_SUCCEEDED` and `TOOL_EXECUTION_FAILED` emitted by the Claude runtime should include tracked arguments when available as a defensive recovery path.
- REQ-004: The frontend Activity detail panel must show the existing `Arguments` section for Claude SDK tool calls with non-empty argument payloads using the runtime-agnostic `arguments` field.
- REQ-005: Existing Codex runtime Activity argument rendering must remain unchanged.
- REQ-006: Executable validation must include a Claude SDK fixture or e2e-derived raw event path proving `tool_use.input` maps to normalized lifecycle `arguments`.

## Acceptance Criteria

- AC-001: A Claude SDK raw assistant `tool_use` fixture for `Bash` with `{ command: "pwd" }` produces a normalized `TOOL_EXECUTION_STARTED` event with `payload.arguments.command === "pwd"` even when no permission callback is involved.
- AC-002: A Claude SDK raw assistant `tool_use` fixture for `Write` followed by permission callback handling does not emit duplicate started events for the same `invocation_id`, and the activity store has one activity with arguments.
- AC-003: A Claude SDK `tool_result` completion event includes the previously tracked arguments on the normalized success/failure payload when available.
- AC-004: A frontend handler/store regression test shows that a Claude `TOOL_EXECUTION_STARTED` followed by success creates an Activity item whose `arguments` include the expected non-empty payload.
- AC-005: The Claude e2e tool-lifecycle test, when enabled with `RUN_CLAUDE_E2E=1`, asserts that the approved target invocation's `TOOL_EXECUTION_STARTED`/`TOOL_APPROVAL_REQUESTED` payloads contain non-empty arguments and no longer fails by selecting an unrelated preliminary success.
- AC-006: Existing Codex tool lifecycle/unit tests still pass.

## Constraints / Dependencies

- Runtime boundary must stay provider-normalized: frontend should consume `TOOL_EXECUTION_*`/`TOOL_APPROVAL_*` with `arguments`, not Claude SDK raw messages.
- Debug logging must remain opt-in through existing env vars (`CLAUDE_SESSION_RAW_EVENT_LOG_DIR`, `CLAUDE_SESSION_RAW_EVENT_DEBUG`, `RUNTIME_RAW_EVENT_DEBUG`) and must not enable broad raw-event logging by default.
- Do not introduce backward-compatible dual event shapes; use the existing `arguments` field.
- Tests may require `pnpm install --frozen-lockfile --offline` and `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` in a fresh worktree before e2e execution.

## Assumptions

- The screenshots are from the same Activity component; the UI can already render arguments when normalized runtime messages provide non-empty `arguments`.
- Claude SDK safe/auto-allowed tool calls may not invoke our `canUseTool` permission callback, so raw assistant `tool_use` observation must be treated as an authoritative invocation source.

## Risks / Open Questions

- Need to confirm exact duplicate-suppression state shape during implementation; a simple per-run/per-invocation `startedEmitted` flag attached to observed invocation state should be sufficient.
- Claude session cleanup should clear any new emitted-start tracking state with the existing per-run observed invocation state.
- If Claude SDK emits partial stream events in a future mode, this design should still rely on complete assistant messages unless partial event support is intentionally enabled later.

## Requirement-To-Use-Case Coverage

- Raw `tool_use -> tool_result` without permission callback: REQ-001, REQ-003, REQ-006
- Permission callback duplicate avoidance: REQ-002
- Frontend Activity rendering: REQ-004
- Codex no-regression: REQ-005

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates the root cause path found in raw logs.
- AC-002 validates duplicate suppression across raw observation and permission callback paths.
- AC-003 validates defensive argument preservation on completion.
- AC-004 validates user-visible Activity data state.
- AC-005 validates live/e2e behavior and fixes the current e2e matcher fragility.
- AC-006 validates cross-runtime parity.

## Approval Status

Proceeding from direct user instruction to investigate and start work on this issue; no open user clarification is required for design.
