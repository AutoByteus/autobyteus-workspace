# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/requirements.md`
- Task-Trail Header Plus Rework Request: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/delivery-user-verification-task-trail-new-run-bug.md`
- Arrow / Status Dot Alignment Rework Request: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/delivery-user-verification-arrow-dot-alignment-rework.md`
- Prior UI Rework Request: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/delivery-user-verification-rework.md`
- Delivery Base Integration Blocker: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/delivery-base-integration-conflict-blocker.md`
- Investigation Notes: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/investigation-notes.md`
- Design Spec: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/design-spec.md`
- Design Review Report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/design-review-report.md`
- Implementation Handoff: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/implementation-handoff.md`
- Code Review Report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/code-review-report.md`
- Current Investigation Round: `5`
- Trigger: Round 6 code review passed after the task-trail/team-task member-focus header `+` Local Fix. Prior API/E2E Round 4 evidence is stale because it predates the changed `TeamWorkspaceView.vue` and `useDefinitionLaunchDefaults.ts` behavior.
- Prior Investigation Reviewed: `Round 4` in this canonical artifact; it passed the arrow/status-dot alignment Local Fix before the task-trail header-plus behavioral rework.
- Latest Authoritative Investigation: `Round 5`

## Current Requirement And Design Basis

The current authoritative behavior is the original approved session-first Workspaces history redesign, the user-requested avatar/subtitle Local Fix, the latest-base transient-row integration, the arrow/status-dot alignment Local Fix, and the new task-trail header-plus Local Fix reviewed in code review Round 6:

- Workspaces remain the top-level scope, and expanded workspaces render a direct session-first list containing standalone agent sessions and team sessions.
- The old visible `Teams` heading, agent-definition rows, team-definition rows, `workspaceHistoryTeamDefinitionGroups` helper, source-avatar bindings, and old/new compatibility renderer remain removed.
- Row titles come from `runHistorySessionLabels` / `runHistorySessionProjection`; Vue templates use `session.displayLabel.title` and `session.displayLabel.subtitle`, not template-local raw `summary` formatting.
- Session rows do not show source avatar/initials chips, and team member rows do not show member avatar/initials chips.
- Team session subtitles are `Team Name (N)` when member count is positive and `Team Name` otherwise; `roles` and `coordinator:` subtitle text must not render.
- Member detail indentation remains reduced through a subtle vertical guide, and latest-base transient task-agent/task-team rows remain integrated inline under expanded team-member details.
- Arrow/status-dot alignment remains the Round 5 accepted behavior: every session row reserves a fixed leading disclosure lane, expandable team rows render an arrow inside that lane, non-expandable agent rows render an equal-width placeholder, the status-dot lane sits immediately to the right with fixed `ml-1.5` spacing, and arrow/status dot align to the title row (`h-5 items-center`) rather than the old full title+subtitle `h-9` lane.
- Team session selection/open/focus and member selection remain behind existing section action/store contracts. Stable and transient member focus use the explicit `{ teamRunId, memberRouteKey }` identity.
- Active/inactive/draft row actions and pending/disabled state remain available through existing mutation contracts.
- Header `+` behavior for a selected team/member context is now catalog-backed:
  - `TeamWorkspaceView.vue` must ensure the team-definition catalog is loaded before cloning a selected team run into a new editable config.
  - `TeamWorkspaceView.vue` must use `buildEditableCatalogTeamRunSeed(...)`, not a direct `buildEditableTeamRunSeed(activeTeamContext.value.config)` clone, before clearing selection and opening the config panel.
  - `buildEditableCatalogTeamRunSeed(...)` resolves the selected run config to a catalog `AgentTeamDefinition` by ID, then by name fallback when the stored/runtime ID is not a catalog ID.
  - The editable seed must be rewritten to the catalog team definition ID/name so `RunConfigPanel` does not navigate to `Error: Definition not found.` for task-trail runtime IDs.
  - Member overrides must be filtered to catalog leaf route keys so transient task-agent/task-team route keys such as `task-team-run-1/homework_teacher` are not carried into the new-run seed.
  - If no catalog definition can be resolved, `TeamWorkspaceView.vue` must keep the current selected view and must not set a team config, clear the agent config, or clear selection into an invalid `RunConfigPanel` state.
- Existing standalone agent header `+` behavior is preserved.
- Normal catalog-backed team header `+` behavior is preserved.
- Durable docs/final handoff/release reports are stale regarding this latest behavioral Local Fix and remain Delivery-owned after fresh API/E2E evidence.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Team header `+` ensures team-definition catalog availability before seeding config | Added by task-trail Local Fix | `delivery-user-verification-task-trail-new-run-bug.md`; implementation handoff task-trail section; code review Round 6 | Execute component coverage that starts with an empty catalog, loads definitions, then clicks the header action and verifies the seed. |
| Task-trail runtime team IDs canonicalize to catalog team definition ID/name | Added by task-trail Local Fix | User report showed `Error: Definition not found`; implementation handoff; code review Round 6 | Execute pure helper and component coverage with `teamDefinitionId: task-team-run-1`, `teamDefinitionName: task trail`, and catalog ID `catalog-task-trail-team`. |
| Transient task-agent/task-team route-key member overrides are pruned from cloned team seed | Added by task-trail Local Fix | Implementation handoff and code review Round 6 | Execute pure helper and component coverage that includes `task-team-run-1/homework_teacher` override and asserts it is absent from the seed. |
| Unresolved catalog state is a no-op, not selection/config clearing into an invalid view | Added by task-trail Local Fix | Acceptance criteria and code review Round 6 | Execute component coverage that no catalog definition resolves and asserts no store config clear/set or selection clear. |
| Normal catalog-backed team header `+` deep-clone behavior | Preserved | Existing tests plus Round 6 review | Execute the updated `TeamWorkspaceView` suite and `useDefinitionLaunchDefaults` helper suite. |
| Standalone agent header `+` behavior | Preserved | Code review Round 6 states unchanged; implementation handoff | Execute agent workspace regression coverage. |
| Session-first workspace history list and transient rows | Preserved | Requirements, design, latest-base integration, prior API/E2E | Rerun current session-history/transient regression suites because the task-trail fix interacts with selected team/member context and prior evidence is stale. |
| Previous API/E2E Round 4 evidence | Replaced | Code review Round 6 downstream note | Update canonical investigation/report to Round 5 and execute fresh coverage. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `composables/__tests__/useDefinitionLaunchDefaults.spec.ts` | Deep-clones agent/team configs, unlocks editable seeds, canonicalizes task-trail runtime team IDs to catalog definitions, prunes runtime-only member overrides, and returns `null` when no catalog definition resolves | Task-trail header-plus AC: valid new run config, no runtime/task-trail IDs as catalog IDs, no unresolved definition view | Still Valid | Current source inspection shows tests for `buildEditableCatalogTeamRunSeed(...)` with `task-team-run-1`, catalog `task trail`, and runtime override `task-team-run-1/homework_teacher`. | Retain and run focused and broader team/config suites. |
| `components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` | Header controls, catalog load before seeding from workspace-history context, task-trail runtime ID canonicalization, transient route-key pruning, no selection/config clearing when unresolved, normal team seed deep clone | Task-trail header-plus AC and preservation of normal team header `+` | Still Valid | Current source inspection shows updated component tests with header-action stub triggering `new-agent` and store assertions. | Retain and run focused and broader team/config suites. |
| `components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Active task execution section for transient task-team/task-agent rows | Latest-base transient task execution behavior; selected task-trail context around the reported bug | Still Valid | The Local Fix does not change section rendering, but it is part of the surrounding task-trail surface. | Retain and run broader team/config suite. |
| `components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Focus/send workflow around nested task-team/task-agent member routing | Latest-base transient focus behavior | Still Valid | Focus identity is a prerequisite for reproducing selected task-trail member context. | Retain and run broader team/config suite. |
| `components/workspace/config/__tests__/RunConfigPanel.spec.ts` | Config panel behavior for selected team/agent config state | Header `+` downstream error surface (`Definition not found`) | Still Valid | The bug manifested in the config panel after an invalid seed; current component/helper tests verify seed validity, while RunConfigPanel remains the downstream surface. | Retain and run broader team/config suite. |
| `components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | Team run config form behavior with selected team definitions/config | Header `+` downstream team config editing | Still Valid | Normal config form behavior remains required once a valid catalog-backed seed is set. | Retain and run broader team/config suite. |
| `stores/__tests__/agentTeamContextsStore.spec.ts` | Active team context and member focus state | Selected team/member context for header `+` | Still Valid | The Local Fix consumes `activeTeamContext` and selected/focused member state. | Retain and run broader team/config suite. |
| `stores/__tests__/teamRunConfigStore.spec.ts` | Team run config buffer state and expansion | Header `+` writes the new team seed into this store | Still Valid | The Local Fix still uses `teamRunConfigStore.setConfig(seed)`. | Retain and run broader team/config suite. |
| `components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts` | Standalone agent header `+` behavior remains unchanged | Task-trail fix must not regress normal agent header `+` | Still Valid | Code review Round 6 says agent path unchanged; execute regression. | Retain and run agent/running regression suite. |
| `components/workspace/running/__tests__/RunningTeamRow.spec.ts` | Running team row regression coverage around launch/focus surfaces | Existing running team behavior should remain unaffected | Still Valid | Code review Round 6 included it as a regression suite. | Retain and run agent/running regression suite. |
| `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Workspace expansion/fetch, direct session rows, no old grouping, no avatar chips, simplified subtitle, selection/member expansion, active/inactive/draft actions, fixed leading lane/placeholder/status lane | Original FR/AC, avatar/subtitle rework, arrow/dot rework | Still Valid | Task-trail header-plus fix does not change history rendering, but selected team/member context starts from this surface. | Retain and run session-history/transient regression suite. |
| `stores/__tests__/runHistorySessionProjection.spec.ts` | Label resolver strips wrappers/fallbacks, explicit titles win, team subtitle is `Team Name (N)`, projection merges/sorts sessions, source metadata is minimal | Original FR/AC and subtitle/avatar rework | Still Valid | Header-plus fix does not change projection/title policy. | Retain and run session-history/transient regression suite. |
| `components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | Inline transient execution rows, task-team collapse/expand, cleanup removal, transient focus identity through section contract | Latest-base transient behavior; selected task-trail member context | Still Valid | Important surrounding coverage for the reported task-trail/member-focus path. | Retain and run session-history/transient regression suite. |
| `utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts` | Stable/transient member rows merge in live placement order, transient identities are tight, task detail payloads do not leak | Latest-base transient behavior | Still Valid | Header-plus fix does not change utility logic, but transient route-key semantics are related. | Retain and run session-history/transient regression suite. |
| `utils/__tests__/workspaceStatusDotPresentation.spec.ts` | Shared status-dot classes and transient status SVG color mapping | Status-dot presentation utility; arrow/dot rework | Still Valid | Header-plus fix does not change status-dot classes. | Retain and run session-history/transient regression suite. |
| `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Historical regressions for team hydration, selected team expansion retention, draft removal | Original FR/AC and selection behavior | Still Valid | Selection/action behavior is preserved. | Retain and run session-history/transient regression suite. |
| `components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts` | Mocked GraphQL/store integration for historical team open/hydration/member focus | Original FR/AC and selected team/member context | Still Valid | Header-plus path starts from selected hydrated/focused team state. | Retain and run session-history/transient regression suite. |
| `composables/__tests__/useWorkspaceHistoryTreeState.spec.ts` | Workspace/session/member expansion and selected reveal logic | Original FR/AC and selection behavior | Still Valid | Header-plus fix does not change expansion state. | Retain and run session-history/transient regression suite. |
| `composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts` | Team selection resolves exact nested route keys and avoids duplicate bare-name ambiguity | Explicit member focus identity | Still Valid | Reported bug requires selected task-trail member context. | Retain and run session-history/transient regression suite. |
| `components/__tests__/AppLeftPanel.spec.ts` | Host left panel keeps workspace history run-selected hook and shell policy | Host boundary | Still Valid | Header-plus selection entry still depends on the host tree. | Retain and run session-history/transient regression suite. |
| `stores/__tests__/runHistoryStore.spec.ts` | Run-history fetch/read-model/selection/mutation behavior, including transient focus selection | Original FR/AC and latest-base transient selection identity | Still Valid | Required regression suite for selected transient/member context. | Retain and run store regression suite. |
| Previous `api-e2e-coverage-investigation.md` Round 4 decisions | Arrow/status-dot Local Fix coverage plan before task-trail header-plus rework | Superseded by Round 6 Local Fix | Replace | Code review Round 6 says prior API/E2E and delivery artifacts are stale after the behavioral Local Fix. | Replace with this Round 5 investigation. |
| Previous `api-e2e-execution-coverage-report.md` Round 4 evidence | Arrow/status-dot execution pass before task-trail header-plus rework | Superseded by Round 6 Local Fix | Replace | Current production source/tests changed after that report. | Update canonical execution report with Round 5 result. |
| `tests/integration/workspace-history-draft-send.integration.test.ts` | Older draft creation/first-send path below the sidebar | Not directly related to current task-trail header-plus Local Fix or session-discovery sidebar | Out Of Scope | Prior investigations classified stale workspace metadata mock failure as out of scope; Round 6 does not make it authoritative. | Do not include in final pass/fail. |
| Durable docs/final handoff/release reports | Docs/release artifacts need task-trail header-plus wording refresh | Delivery-owned work after API/E2E | Out Of Scope for API/E2E; delivery-owned | Code review Round 6 assigns docs/final handoff/release refresh to Delivery after API/E2E. | Mention in execution report/handoff; do not edit in API/E2E. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Previous Round 4 API/E2E execution evidence | API/E2E pass before `TeamWorkspaceView.vue` and `useDefinitionLaunchDefaults.ts` changed | It did not validate catalog-backed header `+` seeding, task-trail runtime ID canonicalization, transient member override pruning, or unresolved-catalog no-op behavior. | Code review Round 6 downstream note | Fresh Round 5 execution of focused task-trail header-plus suites, broader team/config regression, session-history/transient regression, agent/running regression, static source probes, hygiene checks, and broad typecheck attempt. | N/A |
| Any coverage that allows direct unsafe team-header cloning from `activeTeamContext.value.config` before catalog resolution | `TeamWorkspaceView` can call `buildEditableTeamRunSeed(activeTeamContext.value.config)`, clear selection, and rely on a previously mounted history panel to have loaded catalog definitions | The session-first UI branch removed the old implicit catalog-loading side effect; the header action now owns catalog readiness and seed canonicalization. | User rework request and implementation handoff | Static grep/source inspection plus component tests for `buildEditableCatalogTeamRunSeed(...)` through `TeamWorkspaceView`. | N/A |
| Runtime/task-trail IDs accepted as final `teamDefinitionId` in a new editable team seed | `teamDefinitionId: task-team-run-1` can be passed to the config panel | This produced `Error: Definition not found` for the user; the new seed must rewrite to catalog ID/name. | User rework request and code review Round 6 | Pure helper and component tests with `task-team-run-1` -> `catalog-task-trail-team`. | N/A |
| Transient route-key member overrides carried into a cloned new-run seed | Overrides such as `task-team-run-1/homework_teacher` remain in `memberOverrides` | Transient runtime/task-agent/task-team route keys must not leak into catalog-backed new-run setup. | Implementation handoff and code review Round 6 | Pure helper and component tests assert the runtime-only override is absent. | N/A |

## Durable Coverage To Add

No new API/E2E-owned durable coverage is planned in this round.

Rationale:

- Implementation already added or updated repository-resident durable coverage for the new behavior in `composables/__tests__/useDefinitionLaunchDefaults.spec.ts` and `components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`.
- Code review Round 6 reviewed and passed that durable coverage before API/E2E resumed.
- Source/test inspection confirms the user-reported failure shape is represented deterministically: task-trail runtime team ID, catalog name fallback, catalog ID/name rewrite, transient route-key pruning, and no selection/config clearing when unresolved.
- The repository does not expose a deterministic seeded browser/backend E2E harness for launching a live task-trail run, selecting `homework_teacher`, and clicking the header `+`; the closest deterministic executable substitute is the Nuxt/Vitest component/composable/store/integration coverage plus static source probes.

If final execution exposes a gap, API/E2E will either add/update durable coverage and return through `code_reviewer`, or reroute to the appropriate upstream owner with an execution finding.

## Durable Coverage To Remove

None.

## Temporary / Non-Durable Checks Planned

- Static source grep/probe to confirm `TeamWorkspaceView.vue` no longer uses the unsafe direct header path `buildEditableTeamRunSeed(activeTeamContext.value.config)` / `buildEditableTeamRunSeed(teamContext.config)` and instead imports/calls `buildEditableCatalogTeamRunSeed(...)` after `ensureTeamDefinitionsLoaded()`.
- Static source grep/probe to confirm `useDefinitionLaunchDefaults.ts` resolves catalog teams by ID/name, rewrites the seed to catalog ID/name, uses `resolveLeafTeamMembers(...)`, and filters `memberOverrides` to catalog leaves.
- Static grep/probe to confirm current task-trail tests include `task-team-run-1`, `catalog-task-trail-team`, and absence of `task-team-run-1/homework_teacher` in the seed.
- Static production grep for obsolete history-surface behavior remains valid as a regression check: no old `h-9` session-row lane, obsolete avatar/grouping helper paths, or source-avatar/chip copy in changed production history/session files.
- Anchored conflict-marker grep for changed source/test/rework files.
- Repository hygiene with `git diff --check`.
- Broad `pnpm exec nuxi typecheck` plus changed-path grep for `TeamWorkspaceView.vue`, `useDefinitionLaunchDefaults.ts`, and their updated tests. Broad failure is expected from unrelated repository debt; changed-path hits would be blocking.

## Execution Plan

Final pass/fail execution will run from `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web`:

1. `pnpm exec nuxi prepare`
2. Focused task-trail header-plus coverage:
   - `pnpm exec vitest run composables/__tests__/useDefinitionLaunchDefaults.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`
3. Broader team/config regression coverage:
   - `pnpm exec vitest run components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/teamRunConfigStore.spec.ts composables/__tests__/useDefinitionLaunchDefaults.spec.ts`
4. Session-history/transient regression coverage:
   - `pnpm exec vitest run stores/__tests__/runHistorySessionProjection.spec.ts components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts composables/__tests__/useWorkspaceHistoryTreeState.spec.ts composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts components/__tests__/AppLeftPanel.spec.ts utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts utils/__tests__/workspaceStatusDotPresentation.spec.ts stores/__tests__/runHistoryStore.spec.ts`
5. Agent/running regression coverage:
   - `pnpm exec vitest run components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts components/workspace/running/__tests__/RunningTeamRow.spec.ts`
6. Static source and test probes described above.
7. `git diff --check`
8. `pnpm exec nuxi typecheck` with changed-path grep classification.

## API/E2E / Browser Harness Decision

- A true live browser/backend reproduction of the exact user flow would require a seeded task-trail team definition with task management tools, a live run prompt, task delegation until `homework_teacher` is focusable, and a click on the application header `+`.
- Repository/package inspection in prior rounds did not find a deterministic seeded Playwright/Cypress workspace-history/task-trail E2E harness; current package scripts expose Nuxt/Vitest and Electron tests, not a seeded browser flow for this scenario.
- Therefore the closest deterministic executable substitute is accepted for API/E2E in this repository context: component tests exercise the header click through `TeamWorkspaceView`, pure helper tests exercise seed canonicalization/pruning, config-panel/store tests cover the downstream config state, session-history/transient tests cover the selected task-trail/team-member context, and static probes ensure the production source uses the fixed path.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in current implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`

Evidence from inspection:

- `TeamWorkspaceView.vue` imports and calls `buildEditableCatalogTeamRunSeed(...)`; no inspected production match exists for direct unsafe `buildEditableTeamRunSeed(activeTeamContext.value.config)`.
- `useDefinitionLaunchDefaults.ts` implements a catalog resolver contract, ID/name resolution, seed rewrite to catalog definition ID/name, and member override filtering to catalog leaf route keys.
- Tests use task-trail-shaped runtime IDs and assert the runtime-only route-key override is absent.

## Reroute Decision From Investigation

- Reroute required before execution: `No`
- Reason: The current durable coverage appears sufficient and aligned with the Round 6 code-reviewed implementation. Final execution is still required before Delivery resumes.
- Repository-resident durable coverage edits/removals planned by API/E2E before execution: `No`
- If execution later changes durable coverage, route after execution: `code_reviewer`
- If execution passes without API/E2E-owned durable coverage changes, route after execution: `delivery_engineer`
