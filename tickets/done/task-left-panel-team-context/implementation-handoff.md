# Implementation Handoff — Corrected Active Task UI Container

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/investigation-notes.md`
- Corrected design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/design-spec.md`
- Supporting product analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/analysis-recommendation.md`
- Solution design-impact rework: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/solution-design-impact-rework.md`
- API/E2E design-impact reroute: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/api-e2e-design-impact-reroute.md`
- Authoritative round-3 design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/design-review-report.md`

## Implementation Summary

Implemented the round-3 corrected design after the API/E2E design-impact reroute. The previous implementation embedded active-task context in the global Workspaces/run-history tree; this correction removes that wrong cross-surface path and restores the active-task UI to the Team tab's `TeamActiveTasksSection.vue` master/detail surface.

The implemented shape is now:

- Workspaces/run-history tree: workspace/run/team/member navigation and status only; no active-task summaries, references, technical details, or task selection bindings.
- Team Active Tasks section: left task navigator plus right detail/reference pane.
- Left task navigator row hierarchy:
  - text-only task summary row;
  - responsible agent/team actor row with tiny status dot and no root indent;
  - indented task-team member rows with tiny status dots;
  - References header and file rows;
  - collapsed Technical details metadata.
- Right detail pane: props-driven selected task body or selected task-owned reference preview only; no actor/team header, Focus button, roster, reference list, or technical metadata duplication.
- Task summary and reference clicks select content only. They do not focus the center composer/subteam. Actor/member rows in the left navigator are the only active-task controls that emit member focus.
- Follow-up simplification from user feedback: the right content area now shows only task content/reference content, and reference-file rows were restyled closer to the original personal-branch row treatment for clarity.

## Key Files Or Areas

Added / renamed for the corrected Team-owned UI:

- `autobyteus-web/components/workspace/team/TeamActiveTaskNavigator.vue`
- `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts`

Modified:

- `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue`
  - Restored local active-task split ownership.
  - Owns `selectedTaskRouteKey`, `selectedReferenceId`, and `referenceRefreshSignal`.
  - Derives `ActiveTaskEntry[]` from the active team context and validates local selection when team/entry/reference identity changes.
  - Composes `TeamActiveTaskNavigator.vue` and `TeamActiveTaskDetailPane.vue`.
- `autobyteus-web/components/workspace/team/TeamActiveTaskDetailPane.vue`
  - Refactored to explicit props: selected entry, selected reference, and refresh signal.
  - Removed global store access, entry derivation, the team/actor name header, status chip, waiting notice, and right-side Focus button.
- `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue`
  - Restored local Messages/Active Tasks section ownership and Messages-first team-run reset.
- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - Removed active-task derivation, selection, activation, and bindings from the global Workspaces tree.
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
  - Removed active-task rendering from expanded team rows.
- `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts`
  - Removed `WorkspaceHistoryActiveTaskBindings`.
- `autobyteus-web/composables/useRightPanel.ts`
  - Removed `openRightPanel()` because its only remaining use was the decommissioned wrong activation path.
- Relevant unit/component tests under `components/workspace/team`, `components/workspace/history`, and `composables`.

Removed / decommissioned:

- `autobyteus-web/components/workspace/team/TeamActiveTaskContextTree.vue`
- `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskContextTree.spec.ts`
- `autobyteus-web/stores/teamActiveTaskSelectionStore.ts`
- `autobyteus-web/stores/teamOverviewSectionStore.ts`
- `autobyteus-web/composables/useTeamActiveTaskRightDetailActivation.ts`

Retained as valid presentation/projection support from the prior work:

- `autobyteus-web/components/workspace/common/StatusDot.vue`
- `autobyteus-web/utils/workspaceStatusDotPresentation.ts`
- `autobyteus-web/utils/teamActiveTaskTechnicalDetails.ts`
- `autobyteus-web/utils/teamActiveTaskEntries.ts`

## Important Boundary Notes

- `teamActiveTaskSelectionStore` no longer exists. Task/reference selection is local to `TeamActiveTasksSection.vue`.
- `teamOverviewSectionStore` no longer exists. Team overview section visibility is local to `TeamOverviewPanel.vue`, preserving existing Messages-first behavior.
- `useTeamActiveTaskRightDetailActivation` no longer exists. There is no global-tree task/reference activation path.
- `openRightPanel()` was removed from `useRightPanel.ts` because it had no valid caller after the wrong activation path was removed.
- Shared status-dot extraction remains presentation-only. Workspaces history components use `StatusDot.vue` for status display but do not import active-task projection, navigator, detail, or selection code.
- Left reference-file rows keep the new required navigator hierarchy but use the clearer original row scale/interactions: `text-sm`, `gap-2`, 16px icon, white hover/focus background, and selected white/indigo/shadow treatment.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature / behavior change with design-impact correction.
- Reviewed root-cause classification: Boundary / ownership issue and file placement / responsibility drift.
- Reviewed refactor decision: Refactor Needed Now.
- Implementation matched the corrected round-3 design assessment: Yes.
- Evidence / notes: Removed the global Workspaces-tree active-task path, restored local Team active-task split ownership, made the detail pane props-driven/content-only, and added tests that assert task summary/reference selection does not focus while actor/member controls do.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None.
- Legacy old-behavior retained in scope: No.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes.
- Shared structures remain tight: Yes; status-dot reuse is presentation-only and active-task ownership remains inside Team components.
- Changed source implementation files stayed within proactive size-pressure guardrails: Yes.

## Local Implementation Checks Run

Passed:

- `pnpm --filter autobyteus exec vitest run components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts components/workspace/team/__tests__/TeamOverviewPanel.spec.ts components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts composables/__tests__/useRightPanel.spec.ts utils/__tests__/workspaceStatusDotPresentation.spec.ts` — 8 files / 71 tests passed.
- `pnpm --filter autobyteus run guard:web-boundary`
- `pnpm --filter autobyteus run guard:localization-boundary`
- `pnpm --filter autobyteus run audit:localization-literals`
- `git diff --check`

Attempted but blocked by pre-existing repository-wide issues:

- Earlier `pnpm --filter autobyteus exec nuxi typecheck` failed with existing repo-wide TypeScript errors outside the changed files. A follow-up grep of that captured typecheck log found no hits for the changed active-task/history/right-panel files. A later post-simplification typecheck attempt hit Node heap OOM before producing useful diagnostics, so typecheck is still not claimed as a successful check.

## Downstream Coverage Hints / Suggested Scenarios

- Browser/API-E2E should verify the active-task navigator is inside the Team Active Tasks section, not under expanded Workspaces history team rows.
- In the Team tab, open Active Tasks and verify each task renders summary -> actor/team row -> members -> References -> file rows -> collapsed Technical details.
- Click task summaries and reference rows and confirm only the right task detail/reference preview changes; the focused center composer/subteam should not change.
- Confirm the right task detail area starts directly with task content and does not show a duplicated team/actor title or Focus button.
- Click actor/team/member rows in the left navigator and confirm existing focus behavior still routes to the selected member/team.
- Click the same reference row repeatedly and confirm the right reference viewer refresh signal path still works.
- Confirm the global Workspaces tree still renders workspace/run/team/member rows and status dots without active-task summaries, references, or technical metadata.

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E and broader executable coverage investigation/execution remain required downstream. This handoff records implementation-scoped correction and local checks only.
