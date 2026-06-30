# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/implementation-handoff.md`
- Implementation Conflict Resolution Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/implementation-conflict-resolution-note.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Round 3 code review passed merge commit `c475bd14e6de2d1cafc4f45071fbb30473909043`; prior API/E2E/browser evidence predates the latest-base conflict-resolution merge and must be refreshed before delivery.
- Prior Investigation Reviewed: Round 1 in this artifact; prior execution report Round 1.
- Latest Authoritative Investigation: Round 2

## Investigation Round History

| Round | Trigger | Prior Investigation Reviewed | Durable Coverage Decision | Reroute Needed Before Execution | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial code-review pass plus user-requested browser validation | N/A | Add/update narrow durable frontend coverage | No | No | Added Workspaces task-team/cleanup tests, transient focus store test, and renamed ambiguous panel test; returned through code review. |
| 2 | Round 3 integrated latest-base conflict-resolution code review after merge commit `c475bd14` | Yes | No new repository-resident durable coverage planned in API/E2E | No | Yes | Refresh code-level and browser evidence against the integrated state. |

## Current Requirement And Design Basis

The approved behavior is still the left/right ownership split from the reviewed design, now combined with latest-base nested stable-member disclosure behavior:

- The global left Workspaces tree owns execution identity, hierarchy, and focus for stable durable members plus transient task-agent/task-team execution rows.
- Latest-base nested stable team-member disclosure/ancestor expansion must continue working for durable rows: stable nested children can expand/collapse and selecting a member expands its stable ancestors.
- Stable durable Workspaces rows must remain ordinary durable rows with solid avatar/normal background semantics; transient task-agent/task-team rows must not be promoted into durable history rows.
- Transient task-agent/task-team/task-team-child projection rows must be pure derived display rows from live `AgentTeamContext.memberTree`, rendered inline at the runtime projection location with dashed/dotted circular treatment, light ghost background, explicit row-kind/test markers, and accessibility copy but no visible `Temp` wording.
- Clicking a transient Workspaces row must focus `teamRunId + memberRouteKey` through the existing team member focus path and must compose with the latest-base ancestor expansion action path.
- Transient rows must disappear when the backing live projection node is removed; no history row should remain.
- The Workspaces tree must not render task body, references, raw task arguments, technical details, approval controls, or a full task-context block.
- The right Team -> Tasks section remains the task detail/content surface: task summaries/body, references, and technical details are allowed there, but actor/member execution hierarchy and right-side focus rows must not remain as the primary identity UI.
- The implementation handoff and conflict-resolution note both record no compatibility mechanisms and no old raw transient-as-stable or full global task-context-tree behavior.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Inline Workspaces task-agent projection row | Added | `REQ-TWU-001`, `AC-TWU-001`, design DS-TWU-001, implementation handoff | Existing durable coverage remains valid; refresh integrated-state suite and browser evidence. |
| Inline Workspaces task-team root and scoped child rows | Added | `REQ-TWU-002`, `AC-TWU-002`, design DS-TWU-001/DS-TWU-005 | Existing durable coverage remains valid; browser must revalidate live task-team projection after merge. |
| Stable durable rows remain stable-only | Preserved | `REQ-TWU-003`, `REQ-TWU-005`, conflict note durable stable-row boundary | Run stable filtering and nested stable disclosure coverage on integrated state. |
| Latest-base nested stable team-member disclosure and ancestor expansion | Changed / Preserved from latest base | Conflict-resolution note; Round 3 code review residual risk | Add this to API/E2E execution scope; no new durable coverage needed because latest-base/merged tests already cover it. |
| Transient row click focuses execution target | Changed | `REQ-TWU-009`, `AC-TWU-005`, conflict note says same action path extended to transient focus targets | Run store/composable coverage and browser click-to-focus against merge commit `c475bd14`. |
| Projection cleanup removes transient Workspaces row | Added | `REQ-TWU-010`, `AC-TWU-008`, implementation handoff and Round 3 residual risk | Existing durable cleanup coverage remains valid; browser must revalidate cleanup disappearance after merge. |
| Workspaces tree excludes task details | Preserved / Changed | `REQ-TWU-008`, design forbidden dependencies | Run panel/section negative coverage and browser DOM checks. |
| Right Team -> Tasks is detail/content-only | Changed | `REQ-TWU-006`, `REQ-TWU-007`, `AC-TWU-006`, implementation handoff | Run right-side detail-only coverage and browser DOM checks. |
| Rejected legacy paths: raw transient stable rows and full global `TeamActiveTaskContextTree` | Removed / Preserved Removed | design Backward-Compatibility Rejection Log, implementation handoff, conflict note | Confirm no compatibility/legacy-only implementation or coverage path is introduced by merge. |
| Browser-level rendered visual contrast and live projection timing | Added | code review residual risk; user-requested browser validation | Refresh temporary browser validation because prior screenshots predate merge commit `c475bd14`. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts` | Adapter preserves live placement, distinguishes stable/transient rows, includes task-agent/task-team/task-team-child rows, and excludes task detail fields from Workspaces rows. | `REQ-TWU-001`, `REQ-TWU-002`, `REQ-TWU-005`, `REQ-TWU-008`, DS-TWU-001/DS-TWU-005 | Still Valid | Pure display adapter boundary is unchanged by merge. | Run final focused suite. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | Renders task-agent/task-team transient rows inline, emits focus identity on click, excludes task details, supports cleanup disappearance, and uses latest nested-member section state contract. | `REQ-TWU-001`, `REQ-TWU-002`, `REQ-TWU-008`, `REQ-TWU-009`, `REQ-TWU-010`; conflict note | Still Valid | Round 1 added missing transient coverage; conflict resolution updated the fixture/state contract and Round 3 code review passed it. | Run final focused suite. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Panel-level Workspaces behavior including nested stable member disclosure/selection/ancestor expansion and negative assertions against task detail/full-context UI in global Workspaces. | `REQ-TWU-008`, stable Workspaces behavior, latest-base nested member expansion | Still Valid | Round 3 review identifies this as directly related conflict-resolution coverage. | Run final focused suite. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Regression coverage for live/history team row grouping and expansion behavior. | Stable Workspaces behavior, `AC-TWU-009` stable regression | Still Valid | Still guards stable rows/history grouping after merge. | Run final focused suite. |
| `autobyteus-web/stores/__tests__/runHistoryTeamRows.spec.ts` | Stable live context row builder filters transient task-run projections out of durable `TeamMemberTreeRow` output. | `REQ-TWU-005`, design stable-row boundary, no raw transient-as-stable legacy path | Still Valid | Still required to protect durable/transient boundary. | Run final focused suite. |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` | Run-history selection path reuses team contexts and focuses durable/transient route keys. | `REQ-TWU-009`, DS-TWU-002 | Still Valid | Round 1 added transient focus target case; integrated state keeps same contract. | Run final focused suite. |
| `autobyteus-web/composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts` | Workspaces selection actions expand stable ancestors and route team/member focus through store actions. | Latest-base nested member disclosure plus `REQ-TWU-009` focus path | Still Valid | Conflict-resolution note says transient focus targets were extended through same action path. | Run composables suite. |
| `autobyteus-web/composables/__tests__/useWorkspaceHistoryTreeState.spec.ts` | Workspaces tree expansion/collapse state for nested team members. | Latest-base nested stable member disclosure | Still Valid | This is the conflict-resolution state contract that must coexist with transient rows. | Run composables suite. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts` | Right navigator renders task summaries/references/technical details and no actor/member execution hierarchy rows/focus emit. | `REQ-TWU-006`, `REQ-TWU-007`, `AC-TWU-006` | Still Valid | Right detail-only behavior remains required. | Run final focused suite. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Right active tasks section owns task detail selection, references, body, split resize, no execution hierarchy rows/approvals. | `REQ-TWU-006`, `REQ-TWU-007`, `AC-TWU-006`, `AC-TWU-007` | Still Valid | Covers right task detail/content surface after hierarchy removal. | Run final focused suite. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Selecting task details on the right does not change focused send target or reintroduce right-side member navigation. | `REQ-TWU-007`, DS-TWU-003 | Still Valid | Guards right-side detail selection from becoming execution focus UI. | Run final focused suite. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Team overview/right panel auto-open and active task section behavior from latest base. | Latest-base team-tasks auto-open behavior that was merged with this branch | Still Valid | Round 3 code review included this file in integrated validation; it should be part of API/E2E code-level refresh. | Run final focused suite. |
| Repository browser E2E / Playwright coverage | Full browser rendered Workspaces panel with live backend/task stream. | Code-review residual visual/runtime risk; user-requested browser validation | Still Valid as temporary validation only; no durable harness | No durable Playwright/Cypress browser E2E harness exists in `autobyteus-web`; prior screenshots predate merge and are stale as final evidence. | Execute a fresh temporary browser validation against the live frontend/backend and record new screenshots/runtime evidence. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None in Round 2 | N/A | Round 1 stale wording was already resolved and code-reviewed; Round 3 merge did not introduce obsolete assertions. | Round 3 code review passed with no findings. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None in Round 2 | N/A | Existing durable coverage already covers the integrated conflict-resolution scope. | N/A | No repository-resident durable coverage changes are planned by API/E2E in this round. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None in Round 2 | N/A | N/A | N/A | Round 3 code review already reviewed conflict-resolution durable coverage/state contract changes. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TWU-TMP-004` | Integrated-state code-level execution: `pnpm exec nuxi prepare`, 10-file focused suite, composables suite, `git diff --check`, web/localization guards. | Current valid durable coverage passes against merge commit `c475bd14`, including latest-base nested stable member expansion/collapse plus this task's transient row boundary. | Normal API/E2E execution evidence; no temporary repository files needed. |
| `TWU-TMP-005` | Browser validation with Electron backend `http://127.0.0.1:29695`, dev frontend `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm dev --host 127.0.0.1 --port 3000`, Codex App Server runtime, `gpt-5.5`, and `Nested Classroom Test Team`. | Revalidates live task-team root/child transient rows, stable nested member expansion/collapse coexistence, transient click-to-focus evidence where available, and right task detail-only surface on merge commit `c475bd14`; cleanup disappearance remains revalidated by durable component coverage if the user stops the manual browser run before completion. | Manual/temporary browser runtime check; no durable browser harness exists in this repository and adding one is out of scope for this UX task. |
| `TWU-TMP-006` | Static/runtime visual check of transient row classes and screenshots from the integrated browser run. | Confirms ghost/dashed semantics and focus styling remain visually present after merge. | One-off evidence supplement; durable component tests already assert classes. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Durable automated browser E2E test committed to the repository | No existing browser E2E harness or Playwright/Cypress setup was found for `autobyteus-web`; adding one would be broad infrastructure work beyond the approved UX coverage change. | Manual browser evidence can regress without a future durable browser harness. | Record refreshed temporary browser evidence now; future browser E2E infrastructure can be considered separately. |
| Manual browser wait-through to projection cleanup after task completion | The user explicitly stopped further browser probing after observing and providing integrated-state screenshots that show the live transient rows and right task detail surface working. Round 2 still revalidated cleanup disappearance through durable component coverage. | Runtime cleanup timing is not independently screenshotted in Round 2, though code-level cleanup behavior passed and Round 1 had historical cleanup browser evidence. | Document this as an execution limitation, not a failure; no reroute is required unless delivery requires a fresh cleanup screenshot. |
| Broad project TypeScript check | Implementation handoff and code review record pre-existing unrelated `.vue` module/typecheck issues. | Not a reliable signal for this change. | Do not use as API/E2E blocker; keep project-wide type debt noted. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently | N/A | Requirements/design/code review and conflict note agree on preserving latest-base nested stable member disclosure with this task's transient Workspaces display rows; no compatibility path observed. | N/A |

## Execution Plan

1. Run integrated-state code-level checks from the current valid coverage inventory:
   - `pnpm exec nuxi prepare`
   - 10-file focused suite covering Workspaces display rows, Workspaces section/panel, right Team Tasks/overview, run-history stable filtering, and store focus.
   - Composables suite for Workspaces selection actions/tree state.
   - `git diff --check`, `pnpm guard:web-boundary`, `pnpm guard:localization-boundary`, `pnpm audit:localization-literals`.
2. Verify Electron backend health and start the dev frontend against it.
3. Run a fresh browser validation with `Nested Classroom Test Team`, Codex App Server runtime, and `gpt-5.5`, explicitly checking:
   - nested stable durable member expansion/collapse in Workspaces;
   - live task-team transient root/child rows inline in Workspaces;
   - transient row click-to-focus;
   - right Team -> Tasks detail-only surface with forbidden hierarchy selectors absent;
   - cleanup disappearance after task completion when the manual browser run is allowed to finish; otherwise rely on the revalidated durable cleanup test and record the browser limitation.
4. Update the canonical API/E2E execution coverage report to Round 2 with integrated-state evidence.
5. If no repository-resident durable coverage is added/updated/removed by API/E2E Round 2 and all checks pass, route to `delivery_engineer` for integrated-state docs sync/final handoff. If durable coverage changes become necessary, route back to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Round 2 is an integrated-state revalidation round after code-reviewed conflict resolution. No new durable coverage change is planned; prior browser evidence is considered historical context only and must be refreshed.
