# Design Impact Rework Note

## Trigger

Delivery paused after the user clarified an additional in-scope requirement: the right-side Activity area should show a tool invocation as soon as the middle transcript/tool card appears, not only after the tool finishes or a later lifecycle event arrives.

## Classification

- Requirement Gap
- Design Impact
- Required owner: `solution_designer`

## Key New Evidence

Git history confirms the suspected earlier behavior change:

- Commit: `29247822c24ee3f9e9afab130e789f37f4d1ec35`
- Subject: `fix(claude): split tool transcript and activity lanes`
- Effect: removed `useAgentActivityStore` writes from `segmentHandler.ts` and introduced tests asserting tool-call segments are created without Activity state.
- Before that commit, `handleSegmentStart` added Activity entries for `tool_call`, `write_file`, `run_bash`, and `edit_file`, and `handleSegmentEnd` synchronized Activity status/name/arguments.

## Revised Design Direction

Do not simply paste the old segment Activity code back into `segmentHandler.ts`. Instead:

1. Keep the backend Codex `search_web` lifecycle fan-out already implemented in this ticket.
2. Extract shared Activity projection/upsert logic from `toolLifecycleHandler.ts` into a reusable helper, proposed path:
   - `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts`
3. Make `segmentHandler.ts` call the shared helper when an eligible tool-like `SEGMENT_START` creates or enriches a middle tool segment.
4. Make `toolLifecycleHandler.ts` use the same helper for lifecycle Activity updates.
5. Update tests that currently encode the old lifecycle-only invariant.

## Updated Artifacts

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/tickets/done/codex-search-web-activity-visibility/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/tickets/done/codex-search-web-activity-visibility/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/tickets/done/codex-search-web-activity-visibility/design-spec.md`
