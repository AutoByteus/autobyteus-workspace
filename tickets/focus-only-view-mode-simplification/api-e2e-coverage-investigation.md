# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-focus-only-view-mode-simplification/tickets/focus-only-view-mode-simplification/requirements.md`
- Investigation Notes: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-focus-only-view-mode-simplification/tickets/focus-only-view-mode-simplification/investigation-notes.md`
- Design Spec: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-focus-only-view-mode-simplification/tickets/focus-only-view-mode-simplification/design-spec.md`
- Design Review Report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-focus-only-view-mode-simplification/tickets/focus-only-view-mode-simplification/design-review-report.md`
- Implementation Handoff: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-focus-only-view-mode-simplification/tickets/focus-only-view-mode-simplification/implementation-handoff.md`
- Code Review Report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-focus-only-view-mode-simplification/tickets/focus-only-view-mode-simplification/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Code review passed and routed to API/E2E for focus-only team workspace simplification validation.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `Round 1`

## Current Requirement And Design Basis

The approved behavior is a clean-cut focus-only team workspace. Opening a team workspace must render the detailed focused-member monitor directly with no `Focus` / `Grid` / `Spotlight` segmented control or equivalent mode picker. No active interaction may switch the team workspace into grid or spotlight. Active source must not retain the deleted mode store/type, grid/spotlight components, compact tile component, broader-mode hydration action, mode migration, or stale tests/docs/localization for those modes. Remaining behavior to preserve: focused-member header/status/avatar, `AgentTeamEventMonitor` as the only center-pane team monitor, focus selection/hydration via `focusMemberAndEnsureHydrated`, historical single-member lazy hydration, task execution/subteam child focus entrypoints, and the subteam-focused shared composer submission path.

The implementation handoff's Legacy / Compatibility Removal Check is clean: no backward-compatibility mechanisms introduced, no old-behavior retention in scope, and obsolete files/helpers/tests removed. Code review also passed the no-compatibility/no-legacy checks and found no source-review findings.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Team workspace visible mode picker (`Focus` / `Grid` / `Spotlight`) | Removed | FR-002, AC-001, design removal plan, implementation handoff `What Changed` | Validate no mode picker in DOM/browser and no active source references. |
| Grid/spotlight center-pane branches and components | Removed | FR-001/FR-003, AC-002/AC-004, code review no-legacy verdict | Static cleanup search and focused shell tests must prove only `AgentTeamEventMonitor` remains. |
| `teamWorkspaceViewStore` / `TeamWorkspaceViewMode` / mode migration | Removed | AC-003/AC-005, design dependency rules, implementation handoff | Static cleanup search plus store tests must prove no obsolete mode state contract remains. |
| Broader-mode all-member historical hydration | Removed | AC-006, design `ensureHistoricalMembersHydratedForView` removal, implementation handoff | Historical coverage must prove initial member hydration and selected-member-on-demand hydration only. |
| Focused-member header/status/avatar and center focus monitor | Preserved | FR-004, AC-007, code review scope | Existing durable component coverage remains valid; browser probe should confirm visible header/monitor. |
| Remaining focus entrypoints: history/roster, task execution bar, subteam child rows | Preserved | UC-002/UC-003, downstream coverage hints | Existing store/history/task-bar coverage plus temporary browser probe should validate end-to-end UI response. |
| Subteam-focused shared composer | Preserved/Changed | FR-005, AC-008, design example: shared composer only for focused subteam | Durable component test and temporary browser probe should validate text submission path. |
| Active docs/localization for modes | Changed/Removed | FR-006, AC-009, implementation handoff | Localization guards/audits and static search validate no active Grid/Spotlight mode copy remains. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` | Focus-only shell renders `AgentTeamEventMonitor` directly; focused member header/status/avatar; no token usage chip; subteam shared composer sends through team run store. | FR-001, FR-002, FR-004, FR-005; AC-001, AC-007, AC-008 | Still Valid | Current spec contains `renders the focused monitor directly`, header/status/avatar cases, and `preserves the shared composer only for a focused subteam`. | Retain and execute in final targeted suite. |
| `autobyteus-web/components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts` | Focus monitor passes focused member conversation/display/avatar to `AgentEventMonitor`, uses roster focus over active-execution fallback, and suppresses task-agent-only logical parent conversation. | FR-001, FR-004; AC-007 | Still Valid | Current spec asserts focus monitor classes/props and new active `AgentTeamEventMonitor.no_activity_yet` key. | Retain and execute in final targeted suite. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskExecutionsBar.spec.ts` | Task execution cards render and emit `select-member` with concrete task-agent route key. | UC-002, AC-007 remaining focus entrypoint | Still Valid | Existing spec checks `task-agent-entity-card` click emits the member route key. | Execute in final targeted suite because downstream focus includes task-bar selection. |
| `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts` | `focusMemberAndEnsureHydrated` updates focus and triggers single-member historical hydration; create-run preserves nested topology and initial focus. | FR-004, AC-005, AC-006, AC-007 | Still Valid | Current spec has no mode-store mock/import and calls `ensureHistoricalTeamMemberHydrated` for selected member only. | Retain and execute in final targeted suite. |
| `autobyteus-web/components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts` | Opening a historical team hydrates the initial focused member only, then selecting another historical member hydrates that member on demand and updates header. | UC-003, AC-006, AC-007 | Still Valid | Current integration expects projection calls `['solution_designer']`, then `['solution_designer', 'architect_reviewer']` after member selection. | Retain and execute in final targeted suite. |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` focused team-member scenarios | Roster/history selection calls `focusMemberAndEnsureHydrated`, reuses existing team contexts, and hydrates only focused historical members. | UC-002/UC-003, AC-006, AC-007 | Still Valid | Current grep/inspection shows focused member selection assertions and `openTeamMemberRun hydrates only the focused historical member`. | Retain and execute in final targeted suite. |
| `autobyteus-web/tests/integration/app-font-size-fixed-px-audit.integration.test.ts` | Audits active UI component fixed-px targets and no longer points at deleted tile component. | AC-009/AC-010 ancillary UI audit | Still Valid | Implementation updated target list; code review ran it successfully. | Retain and execute in final targeted suite. |
| `autobyteus-web/components/workspace/team/__tests__/TeamGridView.spec.ts` | Former grid layout behavior through compact tiles. | Removed modes, FR-003, AC-002/AC-003 | Stale / Remove | Grid mode is intentionally removed by approved requirements/design. File is deleted in reviewed implementation. | No resurrection; static search verifies deletion. |
| `autobyteus-web/components/workspace/team/__tests__/TeamSpotlightView.spec.ts` | Former spotlight layout behavior through compact tiles. | Removed modes, FR-003, AC-002/AC-003 | Stale / Remove | Spotlight mode is intentionally removed by approved requirements/design. File is deleted in reviewed implementation. | No resurrection; static search verifies deletion. |
| `autobyteus-web/components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts` | Former compact multi-member tile behavior. | Removed grid/spotlight tile, FR-003, AC-003/AC-009 | Stale / Remove | Tile component only served removed modes; surviving empty string moved to `AgentTeamEventMonitor`. File is deleted in reviewed implementation. | No replacement durable coverage needed; focus monitor coverage replaces active behavior. |
| `autobyteus-web/stores/__tests__/teamWorkspaceViewStore.spec.ts` | Former per-team `focus`/`grid`/`spotlight` mode store behavior. | Removed mode state, FR-003, AC-002/AC-005 | Stale / Remove | Mode store/type are intentionally removed; no durable persistence/migration needed. File is deleted in reviewed implementation. | No replacement durable coverage; static search verifies deleted state boundary. |
| `pnpm` localization guards/audit (`guard:localization-boundary`, `audit:localization-literals`) | Localization source/generated boundaries and unresolved literals. | AC-009/AC-010 | Still Valid | Implementation moved no-activity key and deleted stale tile keys. | Execute final guards/audit. |
| Browser/visual inspection of actual rendered team workspace header | Header spacing and absence of mode picker in a browser. | AC-001/AC-002; residual risk from requirements/code review | Needs Update | No repository E2E harness or Playwright config was found; existing component tests do not render actual Tailwind layout in a browser. | Use a temporary Nuxt harness route and browser automation probe; remove harness afterward. Do not add durable coverage unless browser probe reveals a regression. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamGridView.spec.ts` | Grid-mode layout/tile rendering remains available. | Grid mode is intentionally removed. | FR-003, AC-002/AC-003, design removal plan. | Focus-only `TeamWorkspaceView` + `AgentTeamEventMonitor` coverage. | Keeping grid tests would preserve obsolete product behavior. |
| `autobyteus-web/components/workspace/team/__tests__/TeamSpotlightView.spec.ts` | Spotlight-mode layout/tile rendering remains available. | Spotlight mode is intentionally removed. | FR-003, AC-002/AC-003, design removal plan. | Focus-only `TeamWorkspaceView` + `AgentTeamEventMonitor` coverage. | Keeping spotlight tests would preserve obsolete product behavior. |
| `autobyteus-web/components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts` | Compact tile is an active team workspace component. | Tile served removed grid/spotlight layouts only. | Design removal/decommission plan; implementation handoff. | `AgentTeamEventMonitor` active empty-state key and focus monitor tests. | Detailed focus monitor is the replacement active surface. |
| `autobyteus-web/stores/__tests__/teamWorkspaceViewStore.spec.ts` | UI mode state and migration remain required. | Focus-only product has no mode state; no durable persistence found. | AC-005, design backward-compatibility rejection log. | Static no-reference search and store tests without mode coupling. | A replacement mode test would be a compatibility wrapper. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | Existing durable component/store/integration coverage already protects focus-only shell, focus monitor, focus/hydration store, history member selection, task-bar event emission, subteam composer submit, localization, and static deletion checks. Browser-only visual assurance will be a temporary probe because the repository has no current browser E2E harness/config and the behavior is a one-off layout validation for this cleanup. | AC-001 through AC-010 | N/A | N/A |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None in API/E2E round | Reviewed implementation already updated durable coverage before code review. | N/A | N/A | If browser execution discovers a durable coverage gap that should live in the repo, this artifact must be updated and the task routed back through `code_reviewer`. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None in API/E2E round | Reviewed implementation already removed stale grid/spotlight/mode-store specs before code review. | FR-003, AC-002/AC-003/AC-005 | Static no-reference/no-file checks will validate those removals; no additional API/E2E removal planned. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| T-001 | Temporary Nuxt page `autobyteus-web/pages/__api-e2e-focus-only-team.vue` seeded with an active team context, opened in a real browser via Nuxt dev server; screenshot saved under ticket artifacts; remove page afterward. | Header spacing with only avatar/title/status/header actions, direct focus monitor rendering, no visible `Focus`/`Grid`/`Spotlight` segmented control. | No existing browser E2E harness/config is present; temporary page is execution scaffolding and not product code. |
| T-002 | Browser DOM/script interactions against the temporary page: inspect DOM for removed labels/components, click a real subteam child button, click a real task execution card, and verify header/focus monitor text updates. | No user path can switch modes; remaining focus entrypoints update displayed focus. | Scenario validates browser integration for this task without adding a new E2E framework or durable harness. |
| T-003 | Browser DOM/script interactions against the temporary page: focus a subteam, fill shared composer, submit, and read temporary page capture of `sendMessageToFocusedMember`. | Focused-subteam shared composer submits the expected text against the current focused subteam target path. | Temporary monkeypatch captures submission without backend dependency; durable component test already covers store call. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full backend team execution / streaming API | Explicitly out of scope; change is frontend view-mode cleanup with no backend protocol changes. | Low for this task because no API contract changed. | None. |
| Cross-browser visual matrix | Repository does not currently include browser E2E config; requirement asks for focused validation, not a release-wide visual matrix. | Low/medium: browser probe covers Chromium-like actual rendered layout only. | Delivery can decide if broader product visual QA is desired. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently identified | N/A | Upstream artifacts are explicit and code review passed. | N/A |

## Execution Plan

1. Execute current valid durable coverage in `autobyteus-web`: targeted Nuxt/Vitest suite including `TeamWorkspaceView`, `AgentTeamEventMonitor`, `TeamActiveTaskExecutionsBar`, `agentTeamContextsStore`, `HistoricalTeamLazyHydration`, `runHistoryStore`, and fixed-px audit.
2. Execute localization guards/audit and static cleanup searches for removed mode artifacts and team workspace mode literals.
3. Execute build/type-equivalent check with `pnpm -C autobyteus-web build` unless an environmental blocker appears.
4. Create temporary Nuxt browser harness page, run Nuxt dev server, open it with browser automation, capture DOM/screenshot evidence for header spacing/no mode picker, focus subteam child and task card, submit focused-subteam composer, and record results.
5. Remove temporary harness page and stop dev server; verify `git status` has no temporary browser scaffolding left.
6. Write the execution coverage report. If no repository-resident durable coverage is added/updated/removed in this API/E2E round and all validation passes, hand off to `delivery_engineer`. If durable coverage is changed, reroute to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing stale durable coverage was already removed/updated by the reviewed implementation. This API/E2E round will add no durable coverage unless execution reveals a current-behavior gap; browser/visual validation will use temporary scaffolding that must be deleted before handoff.
