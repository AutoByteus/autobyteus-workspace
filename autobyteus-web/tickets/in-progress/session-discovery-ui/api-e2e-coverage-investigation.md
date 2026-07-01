# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/requirements.md`
- Rework Request: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/delivery-user-verification-rework.md`
- Investigation Notes: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/investigation-notes.md`
- Design Spec: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/design-spec.md`
- Design Review Report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/design-review-report.md`
- Implementation Handoff: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/implementation-handoff.md`
- Code Review Report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/code-review-report.md`
- Current Investigation Round: `2`
- Trigger: Round 3 code review passed after delivery/user-verification Local Fix rework; prior API/E2E evidence predates the rework and is stale.
- Prior Investigation Reviewed: `Round 1` in this canonical artifact; it passed at that time but expected session/member source avatar chips and predated the Local Fix rework.
- Latest Authoritative Investigation: `Round 2`

## Current Requirement And Design Basis

The current authoritative behavior combines the original approved session-first history redesign with the later user-verified Local Fix rework:

- Workspaces remain the top-level scope, and expanded workspaces render a direct list of sessions containing standalone agent sessions and team sessions.
- The old visible `Teams` heading, agent-definition rows, team-definition rows, and definition expansion state remain removed. There must be no old/new toggle or compatibility renderer.
- Row titles come from the session display-label projection: explicit `displayTitle` / `sessionTitle` first, then sanitized summary, then safe untitled fallback. Vue templates must not format raw `summary` directly.
- Team sessions preserve existing selection/open/focus behavior: selecting a team session opens the team and focuses the coordinator/default member via existing selection actions.
- Team member rows remain available only as details under an expanded/selected team session, and member selection still routes through existing history selection actions.
- Active/inactive/draft row actions remain available with pending/disabled state through existing mutation contracts.
- Local Fix rework overrides the earlier visual-source-chip requirement: session rows no longer show standalone/team source avatar/initials chips, and team member rows no longer show member avatar/initials chips.
- Team subtitles are simplified to `Team Name (N)` when member count is positive and `Team Name` when no member count is available; `roles` and `coordinator:` subtitle text must not render.
- Member detail indentation is reduced and represented with a subtle vertical guide line; session status dots are vertically centered against the two-line title/subtitle stack.
- Durable docs and prior delivery artifacts are stale regarding avatar/initials chips; code review assigned docs sync to `delivery_engineer` after fresh API/E2E.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Session rows remain direct children under workspace with no `Teams`/definition grouping | Preserved from original change | Requirements FR-002/FR-003/AC-001/AC-012; design removal plan; code review round 3 | Existing direct-session component and projection tests remain valid and must be rerun. |
| Session source avatar/initials chips are removed from standalone agent and team rows | Removed by Local Fix | Rework AC-RW-001/AC-RW-004; implementation handoff Local Fix bullets; code review scope | Existing avatar-positive expectations would be stale; current durable tests must assert absence. Static grep should confirm obsolete avatar wiring is gone. |
| Team member avatar/initials chips are removed | Removed by Local Fix | Rework AC-RW-002; implementation handoff; code review scope | Current durable component coverage should assert absence of member avatar images/chips. Static grep should confirm member avatar helper removal. |
| Team subtitle simplified to `Team Name (N)` or `Team Name`; no `roles`/`coordinator:` subtitle | Changed by Local Fix | Rework AC-RW-003; implementation handoff; code review scope | Projection label tests and component tests must assert simplified subtitle and absence of stale text. |
| Team member hierarchy uses reduced indentation and subtle vertical guide | Changed by Local Fix | Rework AC-RW-005; implementation handoff; code review source review | Static/source validation should confirm guide/indent classes; durable behavioral tests still cover disclosure/selection. |
| Session status dot vertically centers against title/subtitle stack | Changed by Local Fix | Rework AC-RW-006; implementation handoff; code review source review | Static/source validation should confirm centered wrapper classes; functional tests still cover status/action presence. |
| Selection/open/focus for agent/team/member rows | Preserved | Requirements FR-006/FR-007/FR-008/AC-004/AC-005; implementation handoff; code review | Existing component/composable/integration coverage remains valid and must be rerun. |
| Active/inactive/draft row actions and pending state | Preserved | Requirements FR-009/AC-010/AC-011; previous API/E2E durable coverage; code review | Existing active team terminate pending, inactive archive/delete, and draft remove coverage remains valid and must be rerun. |
| Previous API/E2E Round 1 evidence | Removed as authoritative | Code review round 3 downstream note says prior evidence is stale | Canonical investigation/report must be updated to round 2 and final execution must be fresh. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `stores/__tests__/runHistorySessionProjection.spec.ts` | Label resolver strips wrappers/fallbacks, team subtitle is `Team Name (N)`, projection merges/sorts sessions, source metadata is minimal, explicit title fields win | FR-010/FR-011/FR-012/FR-013; AC-006/AC-007/AC-008/AC-009; rework AC-RW-003 | Still Valid | Current source asserts `Software Engineering Team (1)`, `Team Alpha (7)`, explicit title threading, active-first order, and minimal source fields. | Retain and run final targeted suite. |
| `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Workspace expansion/fetch, direct session rows, no old grouping, no session/member avatar images, simplified team subtitle, selection/member details, active team terminate pending, inactive/draft actions | FR-001 through FR-015 as modified by rework AC-RW-001 through AC-RW-008 | Still Valid | Current tests include `does not render session source avatar or initials chips`, `renders simplified team subtitle...`, `does not render team member avatar...`, direct rows, team selection, and active team terminate pending. | Retain and run final targeted suite. |
| `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Historical regression coverage for team top-row persisted member hydration path, selected team expansion retention, draft agent/team removal | FR-006/FR-007/FR-009/FR-014; AC-004/AC-005/AC-010/AC-011; rework AC-RW-007 | Still Valid | Rework does not change selection or mutation owners; code review verified preservation. | Retain and run final targeted suite. |
| `components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts` | Mocked GraphQL/store integration: sidebar historical team open hydrates resume config and only selected member projection, then focuses subsequent member | FR-006/FR-007; AC-004/AC-005; rework AC-RW-007 | Still Valid | This exercises the real run-history/team-context path and is unaffected by avatar/subtitle presentation changes. | Retain and run final targeted suite. |
| `composables/__tests__/useWorkspaceHistoryTreeState.spec.ts` | Workspace/session/member expansion and selected reveal logic | FR-001/FR-007/FR-014; DS-004; rework AC-RW-005/AC-RW-007 | Still Valid | Rework keeps session/member expansion semantics; no old definition expansion should be restored. | Retain and run final targeted suite. |
| `composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts` | Team selection resolves exact nested route keys and avoids duplicate bare-name ambiguity | FR-006/FR-007; AC-004/AC-005; rework AC-RW-007 | Still Valid | Selection logic remains behavior-authoritative after visual rework. | Retain and run final targeted suite. |
| `components/__tests__/AppLeftPanel.spec.ts` | Host left panel keeps workspace history run-selected hook and no obsolete run-created hook | FR-001; clean-cut removal of history quick-create/definition rows | Still Valid | Local Fix does not affect host wiring except preserving the same run-selected boundary. | Retain and run final targeted suite. |
| `stores/__tests__/runHistoryStore.spec.ts` | Store regression coverage for run-history fetch/read-model/selection/mutation behavior | FR-001/FR-008/FR-009; store facade/read-model boundary | Still Valid | Code review round 3 reran 57 passing tests; rework source still depends on `getWorkspaceSessionNodes`. | Retain and run final store regression suite. |
| Previous `api-e2e-coverage-investigation.md` round 1 decisions | Pre-rework coverage plan; included avatar/source-chip expectations and round 1 test counts | Superseded by Local Fix rework | Replace | Code review says prior API/E2E evidence is stale after production/test rework. | Replace with this round 2 investigation as latest authoritative. |
| Previous `api-e2e-execution-coverage-report.md` round 1 evidence | Pre-rework execution pass | Superseded by Local Fix rework | Replace | Round 1 evidence predates removal of avatar chips/simplified subtitles and is no longer final-delivery evidence. | Update canonical execution report with round 2 result after fresh execution. |
| `tests/integration/workspace-history-draft-send.integration.test.ts` | Older draft creation/first-send path below the sidebar | Not directly related to session-first/reworked visual history surface | Out Of Scope | Round 1 exploratory run failed on stale workspace metadata mock; scenario does not assert current sidebar behavior and history quick-create was intentionally removed. | Do not include in final session-discovery pass/fail. |
| Durable docs `docs/agent_execution_architecture.md`, `docs/settings.md` | Previously synced docs still mention source avatar/initials chips | Docs sync follow-up after rework | Out Of Scope for API/E2E coverage; delivery-owned | Code review round 3 explicitly assigned docs correction to `delivery_engineer` after fresh API/E2E. | Mention in execution report/handoff; do not edit in API/E2E. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Previous round 1 API/E2E evidence in `api-e2e-execution-coverage-report.md` | Pre-rework pass with source avatar/initials-chip expectations | Local Fix removed avatar/initials chips and simplified subtitles after that execution. | Rework request AC-RW-001 through AC-RW-008; code review round 3 downstream note | Fresh round 2 execution of current targeted suite and static checks. | N/A |
| Any positive session/member avatar-chip expectations | Session/member rows render avatar or initials chips | User explicitly requested removal and code review confirmed production removal. | Rework AC-RW-001/AC-RW-002; implementation handoff; code review | Current component tests assert absence; static grep checks obsolete helper removal. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None in API/E2E round 2 | N/A | Current durable tests already cover rework-specific absence/subtitle/action/selection behaviors; no coverage gap requiring an API/E2E-authored repository change was found. | N/A | N/A |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None in API/E2E round 2 | N/A | No API/E2E-authored durable coverage update planned. | N/A | Implementation rework already updated durable coverage and passed code review round 3. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None in API/E2E round 2 | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TMP-001` | Static production grep for obsolete avatar/grouping/helper paths: `useRunHistoryAvatarState`, `WorkspaceHistoryAvatarBindings`, `showAgentAvatar`, `showTeamAvatar`, `showTeamMemberAvatar`, `getTeamMemberInitials`, `initialsSubject`, `coordinator:`, ` roles`, `workspaceHistoryTeamDefinitionGroups` | Confirms removed visual/helper paths did not remain as compatibility or dormant production code | Static command evidence plus durable negative component tests are sufficient; no new repository test needed. |
| `TMP-002` | Static source inspection/grep for vertical guide and status-dot centering classes in `WorkspaceHistoryTeamMemberRows.vue` / `WorkspaceHistorySessionRow.vue` | Confirms current rework style hooks are present for reduced indentation/guide and centered status dot | CSS-class probes are brittle as durable tests; behavior is visual and code review already source-reviewed it. |
| `TMP-003` | `git diff --check` | Confirms repository diff hygiene after rework/API-E2E artifact updates | Hygiene command; not product behavior coverage. |
| `TMP-004` | `pnpm exec nuxi typecheck` plus changed-path grep if broad failures persist | Confirms no changed-path typecheck errors if full repo typecheck remains blocked | Broad typecheck is known to fail on unrelated repo debt; changed-path grep is the useful task-specific signal. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live browser E2E against seeded backend history | Repo still has no Playwright/Cypress harness or deterministic seeded backend fixture for workspace history. | A purely live visual mismatch could escape the mocked component/integration suite. | Delivery/user verification can perform live UI verification; not a blocker for API/E2E because Nuxt/Vitest component/integration coverage exercises the practical boundary available in this repo. |
| Durable docs updated to remove avatar-chip wording | Delivery-owned docs sync after API/E2E per code review. | Docs remain stale until delivery sync. | Route to `delivery_engineer` with explicit docs-sync note on pass. |
| Rich generated/persisted session titles | Explicitly deferred by requirements/design; current task only creates/respects the display-label boundary. | Legacy rows still rely on sanitized summaries when no explicit title exists. | Future title pipeline feature/design. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Earlier requirements/design still mention source avatar/initials chips, but user rework explicitly removed them | No reroute; Local Fix rework is authoritative for current UI polish | `delivery-user-verification-rework.md` AC-RW-001/002/004 and code review round 3 confirm this is an accepted Local Fix, not an ambiguity. | N/A |
| None otherwise | N/A | No compatibility branch, old grouping, or obsolete avatar path found during investigation. | N/A |

## Execution Plan

1. Run `pnpm exec nuxi prepare`.
2. Run current targeted session-history suite:
   - `stores/__tests__/runHistorySessionProjection.spec.ts`
   - `composables/__tests__/useWorkspaceHistoryTreeState.spec.ts`
   - `composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts`
   - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
   - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
   - `components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts`
   - `components/__tests__/AppLeftPanel.spec.ts`
3. Run store regression suite: `pnpm exec vitest run stores/__tests__/runHistoryStore.spec.ts`.
4. Run static production grep for obsolete avatar/grouping/helper paths.
5. Run static source probe for current vertical-guide and status-dot centering classes.
6. Run `git diff --check`.
7. Run broad `pnpm exec nuxi typecheck`; if it fails on known unrelated repo debt, grep `/tmp/session-discovery-api-e2e-r2-typecheck.log` for changed session-history/AppLeftPanel/store paths and classify accordingly.
8. Update the canonical execution coverage report to round 2 and route to `delivery_engineer` if no API/E2E-authored durable coverage changes are made and all current valid coverage passes.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Current durable coverage was already updated during the implementation rework and passed code review round 3. API/E2E round 2 will not change repository-resident durable coverage unless final execution reveals a current-valid failure.
