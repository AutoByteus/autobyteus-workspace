# Design Impact Rework

## Trigger

On 2026-05-01, the implementation phase for the Claude Agent SDK Activity Arguments ticket exposed a broader design issue: the narrow fix restored lifecycle `arguments` for Claude tool calls, but Claude normal tools still did not produce the same segment-plus-lifecycle event shape as Codex normal tools.

The user explicitly instructed the team to continue the refactor in this same ticket rather than creating a follow-up ticket.

## Decision

Pull the broader cross-runtime tool event alignment into the current ticket.

The final target is a two-lane runtime-neutral contract:

1. `SEGMENT_START` / `SEGMENT_END` owns transcript/conversation structure for a tool call.
2. `TOOL_APPROVAL_*` and `TOOL_EXECUTION_*` owns Activity state, execution status, approval state, arguments, result/error, and durable tool traces.

Claude normal tools should synthesize both lanes from raw SDK `tool_use` / `tool_result`. The frontend should not need Claude-specific argument recovery or segment-created Activity cards.

## Why This Is Needed

The immediate missing-arguments bug could be solved with lifecycle events alone, but that leaves the system asymmetric:

- Codex normal tool calls already generally emit both segment and lifecycle events.
- Claude normal tool calls would remain lifecycle-only.
- The frontend would continue to compensate for provider differences by creating Activity entries from both segment handling and lifecycle handling.

That mixed ownership is the real long-term risk. Activity should have one authoritative owner: the lifecycle lane. Segment events should make the conversation transcript consistent.

## Superseded / Historical Artifacts

The previous narrow design review and implementation handoff remain useful evidence, but they are no longer sufficient for final delivery under the expanded scope.

- Previous narrow implementation fixed lifecycle arguments.
- Expanded scope now requires Claude normal tool segment synthesis and frontend Activity ownership cleanup.
- Updated requirements/design must go back through architecture review before implementation continues.

## Required Downstream Routing

1. Architecture reviewer reviews the refined requirements and design spec.
2. If approved, implementation engineer continues from the existing worktree and refactors in-place.
3. Code review and API/E2E validation must be rerun for the expanded implementation.
4. Prior delivery artifacts from the narrow implementation are historical and must be refreshed after the expanded implementation passes validation.

## Cumulative Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/in-progress/claude-sdk-tool-arguments-activity/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/in-progress/claude-sdk-tool-arguments-activity/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/in-progress/claude-sdk-tool-arguments-activity/design-spec.md`
- Previous design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/in-progress/claude-sdk-tool-arguments-activity/design-review-report.md`
- Previous implementation handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/in-progress/claude-sdk-tool-arguments-activity/implementation-handoff.md`
- Raw Claude SDK JSONL evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/in-progress/claude-sdk-tool-arguments-activity/logs/claude-raw-events/claude-run-12670a43-469e-4352-9b92-d37f5cd85384.jsonl`
- E2E/runtime log evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/in-progress/claude-sdk-tool-arguments-activity/logs/claude-tool-lifecycle-e2e.log`


## Additional Non-Regression Decision - History / Codex Activity

After the user asked whether the refactor could break Codex or historical-run Activity display, the design was tightened with explicit safeguards:

- Codex live Activity must still be created from lifecycle events for command execution, dynamic tool calls, and file changes after segment-created Activity is removed.
- Historical run Activity display must remain projection-hydrated through `projection.activities` and `hydrateActivitiesFromProjection`; it must not depend on live segment handling.
- Server projection must preserve complementary local-memory activities when runtime-specific providers return conversation-only data. This is especially important for standalone Claude runs because the current Claude session projection provider can return conversation with no tool activities.

These safeguards were added to the requirements, investigation notes, and design spec before implementation continues.
