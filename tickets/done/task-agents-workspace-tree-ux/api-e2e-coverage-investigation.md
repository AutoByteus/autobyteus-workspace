# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/design-spec.md`
- UX Recommendation: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/ux-recommendation.md`
- Design Rework Artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/design-rework-transient-status-icon-semantics.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/implementation-handoff.md`
- Implementation Clean Summary Rework Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/implementation-team-tasks-clean-summary-rework-note.md`
- Implementation Explicit Dot-Ring Visual Validation: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/implementation-transient-dot-ring-visual-validation.md`
- Delivery Blocker Artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/delivery-unreviewed-source-blocker.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/code-review-report.md`
- Current Investigation Round: 6
- Trigger: Round 7 code review passed the right Team -> Tasks clean-summary local fix at commit `c9ccd1d66c7456992df2e439c5b9f448d63b5f2a`; prior API/E2E/browser evidence predates this right-side source/test state.
- Prior Investigation Reviewed: Rounds 1-5 in this artifact; prior execution report Rounds 1-5.
- Latest Authoritative Investigation: Round 6

## Investigation Round History

| Round | Trigger | Prior Investigation Reviewed | Durable Coverage Decision | Reroute Needed Before Execution | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial code-review pass plus user-requested browser validation | N/A | Add/update narrow durable frontend coverage | No | No | Added Workspaces task-team/cleanup tests, transient focus store test, and renamed ambiguous panel test; returned through code review. |
| 2 | Round 3 integrated latest-base conflict-resolution code review | Yes | No new repository-resident durable coverage planned in API/E2E | No | No | Refreshed code-level and browser evidence against the integrated state. |
| 3 | Round 4 transient single-marker/disclosure rework | Yes | No API/E2E-owned durable coverage; post-review source/test changes required code re-review | No | No | Validated dotted marker current worktree and routed back to code review because source/durable tests had changed after Round 4. |
| 4 | Round 5 thick dotted transient status-dot polish code review | Yes | No new repository-resident durable coverage planned in API/E2E | No | No | Refreshed focused code-level and browser evidence against reviewed HEAD `4897588d`, then routed to delivery. |
| 5 | Round 6 explicit eight-dot SVG ring rework code review | Yes | No new repository-resident durable coverage planned in API/E2E | No | No | Refreshed code-level and browser evidence against reviewed HEAD `37991840`, then routed to delivery. |
| 6 | Round 7 clean right Team -> Tasks summary row code review | Yes | No new repository-resident durable coverage planned in API/E2E | No | Yes | Refresh focused Team task tests and browser evidence against reviewed HEAD `c9ccd1d`; if pass with no API/E2E durable changes, route to delivery. |

## Current Requirement And Design Basis

The approved behavior is still the Workspaces/Team ownership split, with Round 7 clean right-side task summary rows now authoritative:

- The global left Workspaces tree owns execution identity, hierarchy, focus, and status awareness for stable durable members plus transient task-agent/task-team execution rows.
- Transient Workspaces rows continue to use exactly one leading explicit eight-dot SVG ring status marker, light ghost background, no task body/details, and no visible `Temp`/`Temporary` row-body text.
- The right Team -> Tasks section owns task detail/content only. It may list/select active task summaries, task references, and technical details, but it must not show actor/member execution hierarchy rows or emit member-focus actions.
- Right Team -> Tasks task summary rows now render the task summary text directly, without a leading `StatusDot` and without a visible status label such as `ACTIVE`, `RUNNING`, or `awaiting_review` inside the summary row.
- Task reference rows remain selectable below the summary in message style, but the extra visible `References` heading is removed.
- Technical details remain available under the existing collapsed disclosure.
- Selecting a task summary switches the right-side task detail body; selecting a reference switches the right pane to the task-owned reference preview; neither action focuses execution targets.
- The implementation handoff's `Legacy / Compatibility Removal Check` remains clean: no backward-compatibility mechanisms, no legacy old-behavior retained, and replaced right-side actor/member hierarchy paths removed. Round 7 code review additionally confirms no dual right-side status row mode, feature flag, or hidden compatibility branch remains.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Right Team -> Tasks task summary rows | Changed | Round 7 code review and clean-summary rework note | Revalidate focused Team task coverage and live browser right-panel presentation. |
| Leading status dot in right summary row | Removed | `TeamActiveTaskNavigator.vue` no longer imports/renders `StatusDot`; Round 7 review | Browser should confirm no leading status dot exists in right summary rows. |
| Visible right summary status label (`ACTIVE`, `RUNNING`, `awaiting_review`, etc.) | Removed | Round 7 review and tests | Browser should confirm no visible status label in summary rows. |
| Visible `References` heading above task reference rows | Removed | Round 7 review and tests | Browser/durable coverage should confirm reference rows stay message-style without a visible heading. |
| Task reference rows and selection | Preserved | Round 7 rework note and tests | Focused tests must prove references remain selectable; browser should attempt live/reference evidence if a reference-bearing task is available. |
| Technical details disclosure | Preserved | Round 7 rework note and tests | Focused tests and browser should confirm the disclosure remains present/collapsed. |
| Right-side actor/member hierarchy and member focus | Preserved absent | Original requirements/design plus Round 7 review | Revalidate tests and browser DOM absence. |
| Left Workspaces transient explicit dot-ring execution/status surface | Preserved | Round 6/Round 7 code review | Browser should recheck at least one transient Workspaces row still shows the execution/status marker while right rows stay content-only. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts` | Direct navigator assertions: summary row contains task summary text without visible status label; references remain selectable; technical details remain collapsed/available; actor/member hierarchy rows absent; task-team selection emits `select-task` and never `select-member`. | `REQ-TWU-006`, `REQ-TWU-007`, `REQ-TWU-011`, Round 7 clean summary behavior | Still Valid | Passed Round 7 code review; source inspection confirms current assertions match the right-side cleanup. | Run focused suite. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Parent section behavior: clean summary rows, references in navigator and reference preview, no focus/actor/member rows, no approval controls, technical details behavior. | `REQ-TWU-006`, `REQ-TWU-007`, `AC-TWU-006`, `AC-TWU-007`, Round 7 behavior | Still Valid | Passed Round 7 code review; source inspection confirms right-side content-only and reference-selection coverage. | Run focused suite. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` and `StatusDot.vue` / status presentation tests | Left Workspaces transient explicit dot-ring marker, no task details in Workspaces, collapse/focus/cleanup. | `REQ-TWU-001`-`REQ-TWU-005`, `REQ-TWU-008`-`REQ-TWU-020` | Still Valid | Round 6 and API/E2E Round 5 passed; Round 7 did not change Workspaces marker files. | Recheck in browser; focused tests not required unless browser reveals regression. |
| Repository browser E2E / Playwright coverage | Full browser rendered Workspaces + Team panel with live backend/task stream. | Code-review residual runtime risk; user-requested browser validation | Still Valid as temporary validation only; no durable harness | No durable Playwright/Cypress browser E2E harness exists in `autobyteus-web`; prior screenshots predate Round 7 right-summary cleanup. | Execute fresh temporary browser validation against live frontend/backend and record screenshots/runtime evidence. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None in Round 6 API/E2E | N/A | Round 7 code review already reviewed implementation-owned durable coverage updates that removed right-side status summary expectations. | Code review Round 7 passed with no findings. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None in Round 6 API/E2E | N/A | Existing post-Round-7 durable coverage already covers the current right-side summary cleanup scope. | N/A | No repository-resident durable coverage changes are planned by API/E2E in this round. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None in Round 6 API/E2E | N/A | N/A | N/A | Round 7 code review already reviewed implementation-owned source and durable coverage updates. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TWU-TMP-013` | Round 7 code-level execution: `pnpm exec nuxi prepare`, focused Team active-task navigator/section suite, `git diff --check`, web/localization guards. | Current durable coverage passes against reviewed HEAD `c9ccd1d`, including clean summary rows, reference selection, collapsed technical details, and no right-side hierarchy/focus rows. | Normal API/E2E execution evidence; no temporary repository files needed. |
| `TWU-TMP-014` | Browser validation with Electron backend `http://127.0.0.1:29695`, dev frontend `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm dev --host 127.0.0.1 --port 3000`, Codex App Server runtime, `gpt-5.5`, and `Nested Classroom Test Team`. | Revalidates live clean right task summary rows, no right status dot/status label/References heading, references/technical details when available, no right actor/member hierarchy or focus actions, and left Workspaces transient dot-ring execution/status surface. | Manual/temporary browser runtime check; no durable browser harness exists in this repository and adding one is out of scope for this UX task. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Durable automated browser E2E test committed to the repository | No existing browser E2E harness or Playwright/Cypress setup was found for `autobyteus-web`; adding one would be broad infrastructure work beyond the approved UX coverage change. | Manual browser evidence can regress without a future durable browser harness. | Record refreshed temporary browser evidence now; future browser E2E infrastructure can be considered separately. |
| Broad project TypeScript check | Implementation handoff/code review record pre-existing unrelated `.vue` module-resolution/typecheck issues. | Not a reliable signal for this change. | Do not use as API/E2E blocker; keep project-wide type debt noted. |
| Further growth of `WorkspaceHistoryWorkspaceSection.vue` during API/E2E | Code review notes the file is 496 effective non-empty lines and close to the 500-line source guardrail. | Adding source changes in this round could force extraction or reroute. | Avoid API/E2E source edits unless a real failure requires reroute. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently | N/A | Requirements/design/code review agree that right Team -> Tasks is content-only and left Workspaces is execution/status-aware. Round 7 specifies clean right task summary rows. | N/A |

## Execution Plan

1. Run Round 7 code-level checks:
   - `pnpm exec nuxi prepare`
   - `pnpm test:nuxt run components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts`
   - `git diff --check`, `pnpm guard:web-boundary`, `pnpm guard:localization-boundary`, `pnpm audit:localization-literals`.
2. Verify Electron backend health and GraphQL smoke query, then start the dev frontend against it.
3. Run a fresh browser validation with `Nested Classroom Test Team`, Codex App Server runtime, and `gpt-5.5`, checking:
   - right Team -> Tasks summary row text appears content-first with no leading status dot and no visible status label;
   - no visible `References` heading in the right task navigator;
   - task references remain selectable when a reference-bearing task is available, and durable tests cover this path if the live delegated task has no reference files;
   - technical details are present and collapsed;
   - right-side actor/member hierarchy rows, member-focus buttons/actions, and approval controls remain absent;
   - left Workspaces transient rows still show the explicit eight-dot SVG ring execution/status marker and transient task-team disclosure behavior.
4. Update the canonical API/E2E execution coverage report to Round 6 with clean-summary evidence.
5. If no repository-resident durable coverage is added/updated/removed by API/E2E Round 6 and all checks pass, route to `delivery_engineer` for final docs/handoff regeneration. If durable/source changes become necessary, route back to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Round 6 is a post-code-review validation round after implementation-owned right Team -> Tasks source and durable coverage changes. API/E2E plans no source or durable coverage edits; prior browser evidence is historical and stale for final signoff on the clean right task summary rows.
