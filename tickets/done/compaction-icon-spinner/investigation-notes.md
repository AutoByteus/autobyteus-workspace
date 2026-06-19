# Investigation Notes

## Goals / Questions

- Identify the frontend component(s) that render the compaction two-arrow/sync icon shown in the supplied screenshots.
- Confirm which compaction phase represents active processing.
- Determine whether the animation should apply only to the right-side Activity feed or also to the centered conversation compaction row.
- Keep the change small and localized.

## Scope Triage

- Classification: `Small`
- Rationale: this is a visual state refinement for existing frontend components. It does not change streaming, projection, data persistence, backend contracts, or compaction lifecycle semantics.

## Sources Consulted

### User evidence

- Screenshot 1: frontend Activity panel and centered compaction row both show the two-curly-arrow compaction icon as static while status is `COMPACTING`.
- Screenshot 2: close-up of static two-curly-arrow icon.
- User clarification: “its on the frontend”.

### Local files and symbols

- `autobyteus-web/utils/compactionActivityPresentation.ts`
  - `getCompactionPhasePresentation()` maps phase `started` to label `Compacting`, icon `heroicons:arrow-path-solid`, tone `blue`.
- `autobyteus-web/components/progress/CompactionActivityItem.vue`
  - Renders compaction rows in the right-side Activity feed.
  - Previously passed only the tone color class to the Icon component.
- `autobyteus-web/components/workspace/agent/CompactionStatusRow.vue`
  - Renders centered compaction status rows in the conversation feed.
  - Previously passed only the tone color class to the Icon component.
- `autobyteus-web/components/progress/ActivityFeed.vue`
  - Routes compaction activities to `CompactionActivityItem`.
- `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue`
  - Routes in-feed compaction status rows to `CompactionStatusRow` for `started`, `completed`, and `failed` phases.
- `autobyteus-web/services/agentStreaming/handlers/compactionActivityProjection.ts`
  - Confirms the frontend activity model uses phase `started` for in-progress/compacting status.

### Commands run

- `rg -n "CompactionActivityItem|CompactionStatusRow|getCompactionPhasePresentation|phase === 'started'|motion-safe:animate-spin|compaction-status-row|compaction-activity-item" autobyteus-web/components autobyteus-web/utils autobyteus-web/services autobyteus-web/stores -S --glob '!node_modules'`
  - Confirmed both compaction icon renderers and that active compaction maps to `phase === 'started'`.
- `rg -n "\\S" <source-file> | wc -l`
  - `CompactionActivityItem.vue`: 98 effective non-empty lines after current diff.
  - `CompactionStatusRow.vue`: 71 effective non-empty lines after current diff.
- `git diff --numstat origin/personal -- <changed-files>`
  - `CompactionActivityItem.vue`: 11 insertions, 2 deletions.
  - `CompactionStatusRow.vue`: 11 insertions, 2 deletions.

## Current Entrypoints / Boundaries / Owners

- Compaction lifecycle status is projected upstream and already represented by `CompactionActivity.phase`.
- UI presentation is owned by two component boundaries:
  - Activity feed compaction card: `components/progress/CompactionActivityItem.vue`.
  - Conversation feed compaction status row: `components/workspace/agent/CompactionStatusRow.vue`.
- The existing presentation utility owns icon identity, label, and tone. The animation should remain local to renderers because it is a view-state styling choice based on phase.

## Runtime / Probe Findings

- The active compaction phase is `started`, displayed to users as `Compacting`.
- Completed and failed states use different icons (`check-circle`, `x-circle`) and should not spin.
- Queued/requested uses a clock icon and should not spin.
- Tailwind already supports `motion-safe:animate-spin`; using this class respects users who prefer reduced motion.

## Constraints / Unknowns / Design Implications

- No backend/API changes are required.
- The safest visual behavior is to animate only while `activity.phase === 'started'`.
- Both visible desktop compaction surfaces should behave consistently.
- Mobile activity list currently renders status chips rather than the two-arrow icon, so it is outside this requested visual scope.
- Existing unrelated untracked files `.article-work/` and `docs/articles/` are present in the worktree and are out of scope.
