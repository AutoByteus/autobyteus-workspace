# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/code-review-report.md`
- Current Investigation Round: 1
- Trigger: `code_reviewer` passed the Workspaces-tree UX implementation and requested API/E2E coverage investigation/execution.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is a left/right ownership split:

- The global left Workspaces tree owns execution identity, hierarchy, and focus for stable durable members plus transient task-agent/task-team execution rows.
- Stable durable Workspaces rows must remain ordinary durable rows with solid avatar/normal background semantics.
- Transient task-agent/task-team/task-team-child projection rows must be pure derived display rows from live `AgentTeamContext.memberTree`, rendered inline at the runtime projection location with dashed/dotted circular treatment, light ghost background, explicit row-kind/test markers, and accessibility copy but no visible `Temp` wording.
- Clicking a transient Workspaces row must focus `teamRunId + memberRouteKey` through the existing team member focus path.
- Transient rows must disappear when the backing live projection node is removed; no history row should remain.
- The Workspaces tree must not render task body, references, raw task arguments, technical details, approval controls, or a full task-context block.
- The right Team -> Tasks section remains the task detail/content surface: task summaries/body, references, and technical details are allowed there, but actor/member execution hierarchy and right-side focus rows must not remain as the primary identity UI.
- The implementation handoff's Legacy / Compatibility Removal Check is clean: no compatibility mechanisms, no retained full global context tree, and no raw transient-as-stable row behavior.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Inline Workspaces task-agent projection row | Added | `REQ-TWU-001`, `AC-TWU-001`, design DS-TWU-001, implementation handoff "What Changed" | Must prove live placement, row kind, ghost/dashed visual semantics, and no detail fields. |
| Inline Workspaces task-team root and scoped child rows | Added | `REQ-TWU-002`, `AC-TWU-002`, design DS-TWU-001/DS-TWU-005 | Must prove root + child rows render inline as transient rows, not stable rows. |
| Stable durable rows remain stable-only | Preserved | `REQ-TWU-003`, `REQ-TWU-005`, design Legacy Removal Policy, code review structural checks | Existing durable stable-row filtering tests remain valid and must run. |
| Transient row click focuses execution target | Changed | `REQ-TWU-009`, `AC-TWU-005`, design DS-TWU-002, code review residual risk | Must prove Workspaces click emits focus identity and store selection reuses live context for transient route keys. |
| Projection cleanup removes transient Workspaces row | Added | `REQ-TWU-010`, `AC-TWU-008`, design DS-TWU-004, implementation downstream coverage hints | Existing coverage is not specific enough; add narrow durable component coverage. |
| Workspaces tree excludes task details | Preserved / Changed | `REQ-TWU-008`, `AC-TWU-007`, design forbidden dependencies | Must retain negative assertions for body/reference/raw args/technical/full context. |
| Right Team -> Tasks is detail/content-only | Changed | `REQ-TWU-006`, `REQ-TWU-007`, `AC-TWU-006`, implementation handoff | Existing component/workflow coverage remains valid and must run. |
| Rejected legacy paths: raw transient stable rows and full global `TeamActiveTaskContextTree` | Removed / Preserved Removed | design Backward-Compatibility Rejection Log, code review legacy verdict | Confirm no durable coverage or implementation path exists only for old behavior. |
| Browser-level rendered visual contrast and live projection timing | Added | code review residual risk; user explicitly requested a browser test against the Electron-started backend using the Nested Classroom Test Team | No repository browser E2E harness is present for durable automation, but the runtime can be exercised manually/temporarily through the real dev frontend and Electron backend. Run a temporary browser validation after code-level checks. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts` | Adapter preserves live placement, distinguishes stable/transient rows, includes task-agent/task-team/task-team-child rows, and excludes task detail fields from Workspaces rows. | `REQ-TWU-001`, `REQ-TWU-002`, `REQ-TWU-005`, `REQ-TWU-008`, DS-TWU-001/DS-TWU-005 | Still Valid | Test directly exercises `buildWorkspaceTeamExecutionDisplayRows()` with live task-agent and task-team projection nodes. | Run final focused suite. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | Component renders a task-agent transient row inline with dashed/ghost classes and emits focus identity on click. | `REQ-TWU-001`, `REQ-TWU-004`, `REQ-TWU-009`, `AC-TWU-001`, `AC-TWU-003`, `AC-TWU-005` | Needs Update | It covers task-agent rendering/click but not task-team root/child rendering or cleanup disappearance. | Add narrow durable cases for task-team root/child rows, Workspaces detail exclusion, and cleanup disappearance. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Panel-level Workspaces history behavior, stable team member click, and negative assertions against full active-task context/navigator/detail rows in the global tree. | `REQ-TWU-008`, rejected full context tree, stable click behavior | Needs Update | Existing negative scenario title says "free of active-task context", which is now ambiguous because identity rows are allowed; assertions remain valid for forbidden detail/full-context content. | Update scenario wording only; run final suite. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Regression coverage for live/history team row grouping and expansion behavior. | Stable Workspaces behavior, `AC-TWU-009` stable regression | Still Valid | Not directly changed by transient display rows; still guards stable rows. | Run final suite. |
| `autobyteus-web/stores/__tests__/runHistoryTeamRows.spec.ts` | Stable live context row builder filters transient task-run projections out of durable `TeamMemberTreeRow` output. | `REQ-TWU-005`, design stable-row boundary, no raw transient-as-stable legacy path | Still Valid | This is explicitly required to avoid restoring the confusing original raw stable-row behavior. | Run final suite. |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` | Run-history selection path opens/reuses team member contexts and focuses route keys. | `REQ-TWU-009`, DS-TWU-002 | Needs Update | Existing cases cover durable members and local contexts; no focused case proves a pure `TeamMemberFocusTarget` for a live transient task-agent route key. | Add narrow durable case for transient route-key focus target reuse. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts` | Right navigator renders task summaries, references, technical details, and no actor/member execution hierarchy rows/focus emit. | `REQ-TWU-006`, `REQ-TWU-007`, `AC-TWU-006` | Still Valid | Right detail-only behavior remains required. | Run final focused suite. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Right active tasks section owns task detail selection, references, body, split resize, no execution hierarchy rows/approvals. | `REQ-TWU-006`, `REQ-TWU-007`, `AC-TWU-006`, `AC-TWU-007` | Still Valid | Covers right task detail/content surface after hierarchy removal. | Run final focused suite. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Selecting task details on the right does not change focused send target or reintroduce right-side member navigation. | `REQ-TWU-007`, DS-TWU-003 | Still Valid | Guards right-side detail selection from becoming execution focus UI. | Run final focused suite. |
| Repository browser E2E / Playwright coverage | Full browser rendered Workspaces panel with live backend/task stream. | Code-review residual visual/runtime risk; user-requested browser validation | Needs Update | No durable Playwright/Cypress browser E2E harness was found in `autobyteus-web`, but the real runtime is available via `pnpm dev` pointed at the Electron backend. | Do not add durable browser harness in this task; execute a temporary browser validation against the live frontend/backend and record screenshots/runtime evidence. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceAgentRunsTreePanel.spec.ts` scenario wording "keeps the global Workspaces tree free of active-task context" | The wording could imply all active-task visibility is forbidden. | Current approved behavior allows transient execution identity rows in Workspaces while still forbidding task detail/full-context blocks. | `REQ-TWU-001`, `REQ-TWU-008`, design "Left Workspaces tree owns execution identity" | Rename scenario to clarify it forbids task detail/full-context UI, not transient identity rows. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `TWU-COV-001` | Live task-team root and scoped child rows render inline in Workspaces as transient rows and do not carry task body/reference/raw args/technical content. | `REQ-TWU-002`, `REQ-TWU-008`, `AC-TWU-002`, `AC-TWU-007`, DS-TWU-001/DS-TWU-005 | `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | Adapter coverage exists, but the actual Workspaces renderer needs durable proof for task-team root/child row rendering and forbidden detail content. |
| `TWU-COV-002` | Transient Workspaces row disappears when live projection cleanup removes backing node. | `REQ-TWU-010`, `AC-TWU-008`, DS-TWU-004 | `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | Cleanup disappearance is a named acceptance criterion and code-review coverage priority; component-level durable proof is warranted. |
| `TWU-COV-003` | `TeamMemberFocusTarget` with a live transient task-agent route key reuses the active local team context and calls `focusMemberAndEnsureHydrated`. | `REQ-TWU-009`, `AC-TWU-005`, DS-TWU-002 | `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` | Existing store tests prove durable member route-key focus; a transient route-key case closes the click-to-focus boundary. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `TWU-COV-004` | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` negative full-context scenario | Rename ambiguous scenario title to "free of active-task detail/full-context UI" while retaining negative selectors. | `REQ-TWU-008`, design Backward-Compatibility Rejection Log | Test assertion remains valid; only durable coverage wording changes. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | No existing relevant scenario asserts obsolete behavior strongly enough to remove. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TWU-TMP-001` | Static/rendered-class visual semantics probe against `WorkspaceTransientExecutionRow.vue` Tailwind classes and WCAG contrast approximations for the approved ghost/dashed treatment. | Confirms the row has dashed outer/inner markers, ghost background, focused ring, text contrast, and accessible sr-only/title semantics. | The repository has no browser visual E2E harness for this panel; durable component tests already assert classes. The numeric contrast calculation is a one-off evidence supplement, not product logic. |
| `TWU-TMP-002` | Final focused Vitest execution across Workspaces display rows, Workspaces section/panel, right Team Tasks, run-history stable filtering, and selection store tests. | Current valid durable coverage passes against the reviewed implementation plus coverage additions. | This is normal final execution evidence; no separate temporary files should remain. |
| `TWU-TMP-003` | Browser validation with Electron backend `http://127.0.0.1:29695`, dev frontend `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm dev --host 127.0.0.1 --port 3000`, Codex App Server runtime, `gpt-5.5`, and `Nested Classroom Test Team`. | Real task-team delegation produces Workspaces transient task-team root/child rows inline, click-to-focus works, cleanup removes rows after completion, Workspaces excludes task detail fields, and right Team -> Tasks shows task detail/content without execution hierarchy rows. | This is a manual/temporary browser runtime check requested for this UI update; the repo has no durable browser harness for retaining it as automated coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Durable automated browser E2E test committed to the repository | No existing browser E2E harness or Playwright/Cypress setup was found for `autobyteus-web`; adding one would be broad infrastructure work beyond the approved UX coverage change. | Manual browser evidence can regress without a future durable browser harness. | Record temporary browser evidence now; delivery/product may consider future browser E2E infrastructure separately. |
| Broad project TypeScript check | Implementation handoff and code review both record pre-existing unrelated `.vue` module/type issues. | Not a reliable signal for this change. | Do not treat as API/E2E blocker; keep project-wide type debt noted. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently | N/A | Upstream requirements/design/code review agree on left execution identity and right task detail split; no compatibility path observed in the changed scope. | N/A |

## Execution Plan

1. Apply the narrow durable coverage updates recorded above: add Workspaces section task-team/root-child + cleanup cases, add run-history selection transient focus case, and rename the ambiguous panel negative scenario.
2. Run formatting/diff checks relevant to durable coverage edits.
3. Run the focused valid frontend suite:
   - `pnpm test:nuxt run utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts stores/__tests__/runHistoryStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
4. Run repository guard checks that are in scope for this frontend coverage pass: `git diff --check`, `pnpm guard:web-boundary`, `pnpm guard:localization-boundary`, and `pnpm audit:localization-literals`.
5. Run the temporary visual-semantics/contrast probe and remove any temporary scaffolding.
6. Read the frontend README/setup notes, verify the Electron backend health, start the dev frontend against that backend, and run the requested browser validation with `Nested Classroom Test Team`, Codex App Server runtime, and `gpt-5.5`.
7. Write the canonical API/E2E execution coverage report.
8. Because repository-resident durable coverage will be updated after the earlier code review, route the cumulative package back to `code_reviewer` for coverage-code re-review rather than directly to delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: No implementation/design reroute is needed from investigation. The only required source changes are narrow durable coverage updates; therefore the task must return to `code_reviewer` after execution. User-requested browser validation is temporary runtime evidence, not additional durable repository coverage.
