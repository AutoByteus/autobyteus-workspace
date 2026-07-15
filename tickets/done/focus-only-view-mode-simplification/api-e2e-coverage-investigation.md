# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-focus-only-view-mode-simplification/tickets/done/focus-only-view-mode-simplification/requirements.md`
- Investigation Notes: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-focus-only-view-mode-simplification/tickets/done/focus-only-view-mode-simplification/investigation-notes.md`
- Design Spec: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-focus-only-view-mode-simplification/tickets/done/focus-only-view-mode-simplification/design-spec.md`
- Design Review Report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-focus-only-view-mode-simplification/tickets/done/focus-only-view-mode-simplification/design-review-report.md`
- Implementation Handoff: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-focus-only-view-mode-simplification/tickets/done/focus-only-view-mode-simplification/implementation-handoff.md`
- Code Review Report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-focus-only-view-mode-simplification/tickets/done/focus-only-view-mode-simplification/code-review-report.md`
- Current Investigation Round: `2`
- Trigger: Code review Round 2 passed after latest-base integration to `origin/personal` at `980e44d32015cf4e56c56e3a797f65da7734e9b0`; prior API/E2E evidence is stale because `TeamWorkspaceView.vue` now uses the latest typed `ConversationTargetAddress` flow.
- Prior Investigation Reviewed: `Round 1` in this same artifact; prior execution report and browser screenshot/JSON reviewed as stale context only.
- Latest Authoritative Investigation: `Round 2`

## Current Requirement And Design Basis

The approved product behavior is unchanged from Round 1: the team workspace is focus-only. Opening a team workspace must render the detailed focused-member monitor directly with no `Focus` / `Grid` / `Spotlight` segmented control or equivalent mode picker. No active interaction may switch to grid or spotlight. Active source must not retain the deleted mode store/type, grid/spotlight components, compact tile component, broader-mode hydration action, mode migration, or stale tests/docs/localization for those modes. Remaining behavior to preserve: focused-member header/status/avatar, `AgentTeamEventMonitor` as the only center-pane team monitor, focus selection/hydration via `focusMemberAndEnsureHydrated`, historical single-member lazy hydration, task execution/subteam child focus entrypoints, and focused-subteam shared composer behavior.

Round 2 adds one integrated-state validation basis: latest `origin/personal` introduced typed `ConversationTargetAddress` behavior, and conflict resolution preserved that flow while keeping focus-only removal. `TeamWorkspaceView.vue` now uses `resolveTeamConversationTargetAddress(...)` for composer visibility/title and the team run store uses `resolveTeamConversationTargetAddressResult(...)` to send typed target addresses. API/E2E must therefore validate the integrated HEAD `efd5a10f1ea742e1e5255a21bfda814f7bdb9814`, not reuse Round-1 browser evidence.

The implementation handoff's Legacy / Compatibility Removal Check remains clean: no backward-compatibility mechanisms introduced, no old-behavior retention in scope, and obsolete files/helpers/tests removed. Code review Round 2 also passed the no-compatibility/no-legacy checks and found no source-review findings.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Team workspace visible mode picker (`Focus` / `Grid` / `Spotlight`) | Removed | FR-002, AC-001, design removal plan, Round-2 code review no-legacy verdict | Revalidate no mode picker in DOM/browser and no active source references against integrated HEAD. |
| Grid/spotlight center-pane branches and components | Removed | FR-001/FR-003, AC-002/AC-004, implementation handoff, Round-2 static review | Static cleanup search and focus shell tests must remain valid after latest-base merge. |
| `teamWorkspaceViewStore` / `TeamWorkspaceViewMode` / mode migration | Removed | AC-003/AC-005, design dependency rules, implementation integration rework | Static cleanup search plus store tests must prove no obsolete mode state contract was reintroduced by merge. |
| Broader-mode all-member historical hydration | Removed | AC-006, design `ensureHistoricalMembersHydratedForView` removal, implementation handoff | Historical coverage must still prove initial member hydration and selected-member-on-demand hydration only. |
| Focused-member header/status/avatar and center focus monitor | Preserved | FR-004, AC-007, code review Round 2 | Existing durable component coverage remains valid; browser probe must refresh visible header/monitor evidence. |
| Remaining focus entrypoints: history/roster, task execution bar, subteam child rows | Preserved | UC-002/UC-003, code review residual risks | Existing durable store/history/task-bar coverage plus temporary browser probe should validate integrated UI response. |
| Subteam/task-team shared composer | Preserved/Changed | FR-005, AC-008, integration rework: shared composer shown only when resolved typed conversation target is an `agent_team` node | Durable component/store/target-address tests and temporary browser probe must validate resolved typed subteam and task-team targets. |
| Typed `ConversationTargetAddress` send path | Added from latest base / Preserved through integration | Code review Round 2 and integration rework mention `resolveTeamConversationTargetAddress(...)`, display labels, local target keys, and typed target docs | Execute current durable `agentTeamRunStore` and `teamConversationTargetAddress` coverage; browser probe should capture typed target address for shared composer submits. |
| Active docs/localization for modes and target addressing | Changed/Removed | FR-006, AC-009, integration rework/docs conflict resolution | Localization guards/audits and static search validate no active Grid/Spotlight mode copy remains; delivery will supersede blocked docs reports after API/E2E. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` | Focus-only shell renders `AgentTeamEventMonitor` directly; focused member header/status/avatar; subteam shared composer sends through team run store. | FR-001, FR-002, FR-004, FR-005; AC-001, AC-007, AC-008 | Still Valid | Integrated `TeamWorkspaceView.vue` has no mode imports/branches and uses typed target resolver for shared composer target/title. | Execute in final targeted suite. |
| `autobyteus-web/components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts` | Focus monitor passes focused member conversation/display/avatar to `AgentEventMonitor`, uses roster focus over active-execution fallback, and suppresses task-agent-only logical parent conversation. | FR-001, FR-004; AC-007 | Still Valid | Current focus monitor remains singular and mode-free after integration. | Execute in final targeted suite. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskExecutionsBar.spec.ts` | Task execution cards render and emit `select-member` with concrete task-agent route key. | UC-002, AC-007 remaining focus entrypoint | Still Valid | Task-entry focus remains in scope and is specifically called out for Round 2. | Execute in final targeted suite. |
| `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts` | `focusMemberAndEnsureHydrated` updates focus and triggers single-member historical hydration; create-run preserves nested topology and initial focus. | FR-004, AC-005, AC-006, AC-007 | Still Valid | Current store has no mode-store import and no `ensureHistoricalMembersHydratedForView` action. | Execute in final targeted suite. |
| `autobyteus-web/components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts` | Opening a historical team hydrates the initial focused member only, then selecting another historical member hydrates that member on demand and updates header. | UC-003, AC-006, AC-007 | Still Valid | Historical lazy hydration remains a changed boundary and no broad-mode preload should return. | Execute in final targeted suite. |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` focused team-member scenarios | Roster/history selection calls `focusMemberAndEnsureHydrated`, reuses existing team contexts, and hydrates only focused historical members. | UC-002/UC-003, AC-006, AC-007 | Still Valid | Round-2 reviewer included this suite and it remains relevant. | Execute in final targeted suite. |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` focused send / target-address scenarios | `sendMessageToFocusedMember` sends typed `ConversationTargetAddress` payloads, rejects stale focus, handles active-execution safety fallback, restores inactive teams, launches temporary teams, and preserves local submission/dedupe semantics. | FR-005, AC-008, Round-2 typed target-address integration | Still Valid | Integrated store uses `resolveTeamConversationTargetAddressResult` and stream `sendMessage(text, address, ...)`; code review Round 2 added this suite to checks. | Execute in final targeted suite. |
| `autobyteus-web/utils/__tests__/teamConversationTargetAddress.spec.ts` | Resolves leaf, subteam, task-agent, task-team, task-team child, nested stored segment, stale focus, and active-execution safety fallback target addresses. | FR-005, AC-008, Round-2 typed target-address integration | Still Valid | This is the durable unit boundary for the new typed address resolver used by `TeamWorkspaceView`/`agentTeamRunStore`. | Execute in final targeted suite. |
| `autobyteus-web/tests/integration/app-font-size-fixed-px-audit.integration.test.ts` | Audits active UI component fixed-px targets and no longer points at deleted tile component. | AC-009/AC-010 ancillary UI audit | Still Valid | Implementation updated target list; Round-2 reviewer reran successfully. | Execute in final targeted suite. |
| `autobyteus-web/components/workspace/team/__tests__/TeamGridView.spec.ts` | Former grid layout behavior through compact tiles. | Removed modes, FR-003, AC-002/AC-003 | Stale / Remove | Grid mode is intentionally removed by approved requirements/design. File remains deleted in integrated state. | No resurrection; static search verifies deletion. |
| `autobyteus-web/components/workspace/team/__tests__/TeamSpotlightView.spec.ts` | Former spotlight layout behavior through compact tiles. | Removed modes, FR-003, AC-002/AC-003 | Stale / Remove | Spotlight mode is intentionally removed. File remains deleted in integrated state. | No resurrection; static search verifies deletion. |
| `autobyteus-web/components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts` | Former compact multi-member tile behavior. | Removed grid/spotlight tile, FR-003, AC-003/AC-009 | Stale / Remove | Tile component only served removed modes. File remains deleted in integrated state. | No replacement durable coverage needed; focus monitor coverage replaces active behavior. |
| `autobyteus-web/stores/__tests__/teamWorkspaceViewStore.spec.ts` | Former per-team `focus`/`grid`/`spotlight` mode store behavior. | Removed mode state, FR-003, AC-002/AC-005 | Stale / Remove | Mode store/type are intentionally removed; no durable persistence/migration needed. File remains deleted in integrated state. | No replacement durable coverage; static search verifies deleted state boundary. |
| `pnpm` localization guards/audit (`guard:localization-boundary`, `audit:localization-literals`) | Localization source/generated boundaries and unresolved literals. | AC-009/AC-010 | Still Valid | Focus-only active strings and latest docs/localization boundaries must remain valid after integration. | Execute final guards/audit. |
| Browser/visual inspection of actual rendered team workspace header and shared composer | Header spacing, no mode picker, focus updates, and typed target-address shared composer behavior in a browser. | AC-001/AC-002/AC-007/AC-008; Round-2 residual risk | Needs Update | Round-1 screenshot/probe predates latest-base merge and typed target-address adoption. No permanent browser E2E harness/config exists. | Use a temporary Nuxt harness route and browser automation probe; remove harness afterward. Do not add durable coverage unless browser probe reveals a regression. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamGridView.spec.ts` | Grid-mode layout/tile rendering remains available. | Grid mode is intentionally removed. | FR-003, AC-002/AC-003, design removal plan. | Focus-only `TeamWorkspaceView` + `AgentTeamEventMonitor` coverage. | Keeping grid tests would preserve obsolete product behavior. |
| `autobyteus-web/components/workspace/team/__tests__/TeamSpotlightView.spec.ts` | Spotlight-mode layout/tile rendering remains available. | Spotlight mode is intentionally removed. | FR-003, AC-002/AC-003, design removal plan. | Focus-only `TeamWorkspaceView` + `AgentTeamEventMonitor` coverage. | Keeping spotlight tests would preserve obsolete product behavior. |
| `autobyteus-web/components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts` | Compact tile is an active team workspace component. | Tile served removed grid/spotlight layouts only. | Design removal/decommission plan; implementation handoff. | `AgentTeamEventMonitor` active empty-state key and focus monitor tests. | Detailed focus monitor is the replacement active surface. |
| `autobyteus-web/stores/__tests__/teamWorkspaceViewStore.spec.ts` | UI mode state and migration remain required. | Focus-only product has no mode state; no durable persistence found. | AC-005, design backward-compatibility rejection log. | Static no-reference search and store tests without mode coupling. | A replacement mode test would be a compatibility wrapper. |
| Round-1 browser probe artifacts (`api-e2e-browser-probe-results.json`, `api-e2e-focus-only-browser-harness.png`) | Final browser evidence for delivery. | Source/docs changed after latest-base integration; `TeamWorkspaceView.vue` adopted typed target-address resolver. | Code review Round 2 residual risk and trigger. | New Round-2 browser probe artifacts at the same canonical paths. | Prior artifacts remain stale context only until overwritten/updated by Round 2. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | Existing durable component/store/integration coverage already protects focus-only shell, focus monitor, focus/hydration store, history member selection, task-bar event emission, typed conversation-target addressing, team-run sends, subteam composer submit, localization, and static deletion checks. Browser-only visual assurance will be a temporary probe because the repository has no current browser E2E harness/config and the behavior is a focused integrated-state validation. | AC-001 through AC-010 plus Round-2 typed target-address integration | N/A | N/A |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None in API/E2E Round 2 | Reviewed implementation/integration already updated durable coverage before Round-2 code review. | N/A | N/A | If browser execution discovers a durable coverage gap that should live in the repo, this artifact must be updated and the task routed back through `code_reviewer`. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None in API/E2E Round 2 | Stale grid/spotlight/mode-store specs were removed before code review and remain deleted after integration. | FR-003, AC-002/AC-003/AC-005 | Static no-reference/no-file checks will validate those removals; no additional API/E2E removal planned. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| T-001 | Temporary Nuxt page `autobyteus-web/pages/__api-e2e-focus-only-team.vue` seeded with an active team context, opened in a real browser via Nuxt dev server; screenshot saved under ticket artifacts. | Header spacing with only avatar/title/status/header actions, direct focus monitor rendering, no visible `Focus`/`Grid`/`Spotlight` segmented control on integrated HEAD. | No existing browser E2E harness/config is present; temporary page is execution scaffolding and not product code. |
| T-002 | Browser DOM/script interactions against the temporary page: inspect DOM for removed labels/components, click a real subteam child button, click a real task-agent card, and verify header/focus monitor text updates. | No user path can switch modes; remaining subteam/task focus entrypoints update displayed focus. | Scenario validates browser integration for this task without adding a new E2E framework or durable harness. |
| T-003 | Browser DOM/script interactions against the temporary page: focus a structural subteam, fill shared composer, submit, and capture the typed resolver result used by `sendMessageToFocusedMember`. | Focused structural subteam shared composer submits with typed address `{segments:[{kind:'member', memberRouteKey:'review_subteam'}]}` and `targetKind:'subteam'`. | Temporary monkeypatch captures target details without backend dependency; durable store/util tests already cover typed send. |
| T-004 | Browser DOM/script interactions against the temporary page: focus a task-team root from the task bar, fill shared composer, submit, and capture typed resolver result. | Focused task-team shared composer stays available and submits typed address containing member + `task_team` segments. | Temporary monkeypatch captures target details without backend dependency; durable `teamConversationTargetAddress` and `agentTeamRunStore` tests cover persistent behavior. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full backend team execution / streaming API | Explicitly out of scope; change is frontend view-mode cleanup and typed target-address behavior is covered by current store/unit tests without needing a live backend stream. | Low for this task because no backend protocol implementation changed in this branch. | None. |
| Cross-browser visual matrix | Repository does not currently include browser E2E config; requirement asks for focused validation, not a release-wide visual matrix. | Low/medium: browser probe covers Chromium-like actual rendered layout only. | Delivery can decide if broader product visual QA is desired. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently identified | N/A | Upstream artifacts are explicit and Round-2 code review passed. | N/A |

## Execution Plan

1. Execute current valid durable coverage in `autobyteus-web`: targeted Nuxt/Vitest suite including `TeamWorkspaceView`, `AgentTeamEventMonitor`, `TeamActiveTaskExecutionsBar`, `agentTeamContextsStore`, `HistoricalTeamLazyHydration`, `runHistoryStore`, `agentTeamRunStore`, `teamConversationTargetAddress`, and fixed-px audit.
2. Execute localization guards/audit, `git diff --check origin/personal...HEAD`, and static cleanup searches for removed mode artifacts and team workspace mode literals.
3. Execute build/type-equivalent check with `pnpm -C autobyteus-web build` unless an environmental blocker appears.
4. Create temporary Nuxt browser harness page for integrated HEAD, run Nuxt dev server, open it with browser automation, capture DOM/screenshot evidence for header spacing/no mode picker, focus subteam child and task cards, submit structural subteam and task-team shared composer messages, and record typed target-address results.
5. Remove temporary harness page and stop dev server; verify `git status` has no temporary browser scaffolding left.
6. Update the canonical execution coverage report with Round 2. If no repository-resident durable coverage is added/updated/removed in this API/E2E round and all validation passes, hand off to `delivery_engineer`. If durable coverage is changed, reroute to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Prior Round-1 browser artifacts are stale after latest-base integration. Round 2 will overwrite/update the canonical API/E2E artifacts for the integrated state. Temporary browser scaffolding must be deleted before handoff.
