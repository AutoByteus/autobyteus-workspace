# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/requirements.md`
- Arrow / Status Dot Alignment Rework Request: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/delivery-user-verification-arrow-dot-alignment-rework.md`
- Prior UI Rework Request: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/delivery-user-verification-rework.md`
- Delivery Base Integration Blocker: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/delivery-base-integration-conflict-blocker.md`
- Investigation Notes: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/investigation-notes.md`
- Design Spec: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/design-spec.md`
- Design Review Report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/design-review-report.md`
- Implementation Handoff: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/implementation-handoff.md`
- Code Review Report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/code-review-report.md`
- Current Investigation Round: `4`
- Trigger: Round 5 code review passed after the arrow/status-dot alignment Local Fix. Prior API/E2E Round 3 evidence is stale because it still recorded the old `h-9` full title+subtitle status-dot centering lane.
- Prior Investigation Reviewed: `Round 3` in this canonical artifact; it passed the latest-base integrated state before the arrow/status-dot alignment rework.
- Latest Authoritative Investigation: `Round 4`

## Current Requirement And Design Basis

The current authoritative behavior is the original approved session-first history redesign, plus the user-requested Local Fix removals, plus latest-base transient-row integration, plus the new arrow/status-dot alignment rework reviewed in Round 5:

- Workspaces remain the top-level scope, and expanded workspaces render a direct session-first list containing standalone agent sessions and team sessions.
- The old visible `Teams` heading, agent-definition rows, team-definition rows, `workspaceHistoryTeamDefinitionGroups` helper, source-avatar bindings, and old/new compatibility renderer remain removed.
- Row titles come from `runHistorySessionLabels` / `runHistorySessionProjection`; Vue templates use `session.displayLabel.title` and `session.displayLabel.subtitle`, not template-local raw `summary` formatting.
- Session rows do not show source avatar/initials chips, and team member rows do not show member avatar/initials chips.
- Team session subtitles are `Team Name (N)` when member count is positive and `Team Name` otherwise; `roles` and `coordinator:` subtitle text must not render.
- Member detail indentation remains reduced through a subtle vertical guide, and latest-base transient task-agent/task-team rows remain integrated inline under expanded team-member details.
- Arrow/status-dot alignment rework supersedes the previous two-line status-dot centering behavior for session rows:
  - every session row reserves the same fixed leading disclosure lane;
  - expandable team rows render the disclosure arrow inside that lane;
  - non-expandable agent rows render an equal-width invisible placeholder in that lane;
  - the status-dot lane sits immediately to the right with fixed `ml-1.5` spacing;
  - arrow and status dot align to the title/session-name row (`h-5 items-center`), not to the combined title+subtitle block;
  - the old session-row `h-9` status-dot centering lane must not remain in production.
- Team session selection/open/focus and member selection remain behind existing section action/store contracts. Stable and transient member focus use the explicit `{ teamRunId, memberRouteKey }` identity.
- Active/inactive/draft row actions and pending/disabled state remain available through existing mutation contracts.
- Durable docs/final handoff artifacts are stale regarding both avatar-chip removal and the new alignment behavior; delivery owns refresh after fresh API/E2E.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Fixed disclosure lane for all session rows | Added by arrow/dot Local Fix | `delivery-user-verification-arrow-dot-alignment-rework.md` AC-AD-001/003/007; implementation handoff; code review Round 5 | Current component assertions and static source probe must verify `workspace-session-leading-lane`, `h-5`, and equal placeholder behavior. |
| Arrow/status dot align to title row, not full title+subtitle row | Changed by arrow/dot Local Fix | AC-AD-002/004/005; implementation handoff says earlier two-line centering is superseded; code review Round 5 | Prior API/E2E h-9 evidence is stale. Static grep/probe must confirm no production `h-9` lane and current `h-5`/`ml-1.5` lane. |
| Session-first workspace history list | Preserved | Requirements FR-002/FR-003/AC-001/AC-012; design; code review Round 5 | Existing session projection/panel coverage remains valid and must be rerun. |
| No session/member avatar chips and simplified team subtitle | Preserved | Prior rework AC-RW-001..008; implementation handoff; code review Round 5 | Negative avatar/subtitle tests and static production grep remain valid and must be rerun. |
| Latest-base transient task execution rows under expanded team member details | Preserved | Integration blocker/resolution; implementation handoff latest-base section; code review Round 5 | Section, display-row utility, status-dot utility, selection, and store coverage remain valid and must be rerun. |
| Previous API/E2E Round 3 evidence | Replaced | Code review Round 5 downstream note | Update canonical investigation/report to Round 4 and execute fresh coverage. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Workspace expansion/fetch, direct session rows, no old grouping, no avatar chips, simplified subtitle, selection/member expansion, active/inactive/draft actions, and new fixed leading lane/placeholder/status-lane assertions | FR-001 through FR-015 as modified by rework AC-RW-001..008 and AC-AD-001..007 | Still Valid | Current grep shows assertions for `workspace-session-leading-lane`, `workspace-session-disclosure-placeholder`, `workspace-session-status-dot`, `h-5`, `ml-1.5`, and absence of `h-9`. | Retain and run final targeted suite. |
| `stores/__tests__/runHistorySessionProjection.spec.ts` | Label resolver strips wrappers/fallbacks, explicit titles win, team subtitle is `Team Name (N)`, projection merges/sorts sessions, source metadata is minimal | FR-010/FR-013; AC-006/AC-009; rework AC-RW-003 | Still Valid | Alignment rework does not change projection/title policy. | Retain and run final targeted suite. |
| `components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | Section-contract rendering of transient execution rows inline under expanded team session details, transient task-team collapse/expand, cleanup removal, transient focus identity | Latest-base integration behavior; selection-action ownership; no old grouping | Still Valid | Alignment rework is confined to session-row leading lanes and should not affect section transient detail behavior. | Retain and run final targeted suite. |
| `utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts` | Stable/transient member rows merge in live placement order, transient identities are tight, task detail payloads do not leak, stable-only fallback works | Latest-base integration behavior | Still Valid | Alignment rework does not change display-row utility logic. | Retain and run final targeted suite. |
| `utils/__tests__/workspaceStatusDotPresentation.spec.ts` | Shared status-dot classes and transient status SVG color mapping | Status-dot presentation utility; transient visual semantics | Still Valid | Alignment rework changes session-row lane placement, not status-dot class mapping. | Retain and run final targeted suite. |
| `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Historical regression coverage for team top-row hydration, selected team expansion retention, draft agent/team removal | FR-006/FR-007/FR-009/FR-014; rework AC-RW-007 | Still Valid | Selection/action behavior is preserved. | Retain and run final targeted suite. |
| `components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts` | Mocked GraphQL/store integration: sidebar historical team open hydrates resume config and selected member projection | FR-006/FR-007; AC-004/AC-005 | Still Valid | Alignment rework does not change historical hydration path. | Retain and run final targeted suite. |
| `composables/__tests__/useWorkspaceHistoryTreeState.spec.ts` | Workspace/session/member expansion and selected reveal logic | FR-001/FR-007/FR-014; rework AC-RW-005/007 | Still Valid | Alignment rework does not change expansion state. | Retain and run final targeted suite. |
| `composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts` | Team selection resolves exact nested route keys and avoids duplicate bare-name ambiguity | FR-006/FR-007; explicit member focus identity | Still Valid | Selection action still uses route-key identity. | Retain and run final targeted suite. |
| `components/__tests__/AppLeftPanel.spec.ts` | Host left panel keeps workspace history run-selected hook and shell policy | FR-001 and host boundary | Still Valid | Host wiring remains required. | Retain and run final targeted suite. |
| `stores/__tests__/runHistoryStore.spec.ts` | Store regression coverage for run-history fetch/read-model/selection/mutation behavior, including live transient focus | FR-001/FR-008/FR-009; latest-base transient selection identity | Still Valid | Alignment rework is presentational only. | Retain and run final store regression suite. |
| Previous `api-e2e-coverage-investigation.md` Round 3 decisions | Latest-base integrated coverage plan before alignment rework | Superseded by arrow/status-dot rework | Replace | Code review Round 5 says prior API/E2E reports are stale after alignment rework. | Replace with this Round 4 investigation. |
| Previous `api-e2e-execution-coverage-report.md` Round 3 evidence | Integrated execution pass with old `h-9` status-dot centering evidence | Superseded by arrow/status-dot rework | Replace | Current execution report still referenced `WorkspaceHistorySessionRow.vue:43` `h-9`; Round 5 explicitly removed that production path. | Update canonical execution report with Round 4 result. |
| `tests/integration/workspace-history-draft-send.integration.test.ts` | Older draft creation/first-send path below the sidebar | Not directly related to the session-first/reworked/alignment surface | Out Of Scope | Prior investigations classified stale workspace metadata mock failure as out of scope; alignment rework does not make this scenario authoritative. | Do not include in final session-discovery pass/fail. |
| Durable docs/final handoff/release reports | Docs/release artifacts need alignment wording refresh | Delivery-owned work after API/E2E | Out Of Scope for API/E2E; delivery-owned | Code review Round 5 assigns docs/final handoff refresh to delivery after API/E2E. | Mention in execution report/handoff; do not edit in API/E2E. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Previous Round 3 API/E2E execution evidence | `WorkspaceHistorySessionRow.vue:43` uses `h-9` to center the session status dot against the full title+subtitle block | The accepted arrow/dot rework intentionally aligns arrow and status dot to the title row and removes the old `h-9` production lane. | `delivery-user-verification-arrow-dot-alignment-rework.md` AC-AD-004; implementation handoff arrow/dot section; code review Round 5 | Fresh Round 4 execution and static source/grep evidence for `h-5`, `ml-1.5`, placeholder lane, and no production `h-9`. | N/A |
| Any restored old session/member avatar-chip expectation | Avatar/initials chips render before session/member labels | Still intentionally removed by prior user rework and preserved through Round 5. | Prior rework AC-RW-001/002; code review Round 5 | Current component tests and static grep. | N/A |
| Old team-definition grouping/compatibility renderer | Restoring `Teams`/definition rows | Requirements forbid dual old/new tree; latest-base transient rows remain under session details. | Requirements FR-002/AC-012; code review Round 5 | Current panel/section tests and static grep. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None in API/E2E Round 4 | N/A | Implementation already added durable component assertions for the arrow/dot alignment and code review Round 5 passed them. | N/A | No coverage gap requiring an API/E2E-authored repository change was found before final execution. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None in API/E2E Round 4 | N/A | No API/E2E-authored durable coverage update planned. | N/A | Durable tests were updated by implementation and reviewed by code review Round 5. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None in API/E2E Round 4 | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TMP-001` | Static production grep for obsolete avatar/grouping/helper paths, stale source-avatar/chip copy, and old session-row `h-9` lane in `components/workspace/history`, `composables`, `stores`, and `utils` excluding tests. | Confirms alignment rework did not retain the old `h-9` lane and did not restore removed avatar/grouping paths. | Static command evidence plus durable component tests are sufficient; no new repository test needed. |
| `TMP-002` | Static source probes for `workspace-session-leading-lane`, `workspace-session-disclosure-placeholder`, `workspace-session-status-dot`, `h-5`, `ml-1.5`, and placeholder/status lane widths in `WorkspaceHistorySessionRow.vue`. | Confirms current arrow/status-dot layout hooks are present. | CSS-class/source probes are brittle as durable tests; durable component assertions already cover these hooks. |
| `TMP-003` | Anchored conflict-marker grep `^(<<<<<<<|=======|>>>>>>>)` in changed source/test/rework files. | Confirms rework left no conflict markers. | Merge/rework hygiene command; not product behavior coverage. |
| `TMP-004` | `git diff --check`. | Confirms diff hygiene after rework/API-E2E artifact updates. | Repository hygiene command; not product behavior coverage. |
| `TMP-005` | `pnpm exec nuxi typecheck` plus changed-path grep if broad failures persist. | Confirms no changed-scope typecheck errors if full repo typecheck remains blocked. | Broad typecheck is known to fail on unrelated repo debt; changed-path grep is the task-specific signal. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Pixel-level screenshot comparison of arrow/status-dot baseline alignment | Repo has no deterministic visual regression harness for the Workspaces history sidebar; current validation uses durable component assertions plus static source probes. | A purely visual metric mismatch could escape class-level assertions. | Delivery/user verification should visually verify the alignment in the running app; not a blocker for API/E2E because current repo coverage is the practical executable path. |
| Live browser E2E against seeded backend history including transient rows | Repo still has no Playwright/Cypress script or deterministic seeded workspace-history backend fixture. | A live backend mismatch could escape mocked component/integration coverage. | Delivery/user verification should perform live UI verification; not a blocker for API/E2E. |
| Durable docs/final handoff wording for fixed disclosure lane/title-row alignment | Delivery-owned docs sync after API/E2E per code review. | Docs remain stale until delivery sync. | Route to `delivery_engineer` with explicit docs/final handoff refresh note on pass. |
| Rich generated/persisted session titles | Explicitly deferred by requirements/design. | Legacy rows still rely on sanitized summaries when no explicit title exists. | Future title pipeline feature/design. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Earlier implementation/API evidence mentioned full two-line status-dot centering, but latest user rework supersedes it | No reroute; latest Local Fix is authoritative | `delivery-user-verification-arrow-dot-alignment-rework.md` AC-AD-004 and code review Round 5 confirm the intended change. | N/A |
| Earlier requirements/design still mention source avatar/initials chips, but prior user rework explicitly removed them | No reroute; prior Local Fix remains authoritative | `delivery-user-verification-rework.md` AC-RW-001/002/004 and Round 5 code review confirm preservation. | N/A |
| None otherwise | N/A | No compatibility branch, old grouping, obsolete avatar path, old `h-9` production lane, or conflict marker found during investigation. | N/A |

## Execution Plan

1. Run `pnpm exec nuxi prepare`.
2. Run current targeted session-history/transient suite:
   - `stores/__tests__/runHistorySessionProjection.spec.ts`
   - `components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`
   - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
   - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
   - `components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts`
   - `composables/__tests__/useWorkspaceHistoryTreeState.spec.ts`
   - `composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts`
   - `components/__tests__/AppLeftPanel.spec.ts`
   - `utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts`
   - `utils/__tests__/workspaceStatusDotPresentation.spec.ts`
3. Run store regression suite: `pnpm exec vitest run stores/__tests__/runHistoryStore.spec.ts`.
4. Run static production grep for old session-row `h-9`, obsolete avatar/grouping/helper paths, and stale source-avatar/chip copy.
5. Run static source probes for the fixed leading lane, placeholder lane, status-dot lane, `h-5`, and `ml-1.5` hooks.
6. Run anchored conflict-marker grep in changed source/test/rework files.
7. Run `git diff --check`.
8. Run broad `pnpm exec nuxi typecheck`; if it fails on known unrelated repo debt, grep `/tmp/session-discovery-api-e2e-r4-typecheck.log` for changed session-discovery/workspace-history/AppLeftPanel/store/util paths and classify accordingly.
9. Update the canonical execution coverage report to Round 4 and route to `delivery_engineer` if no API/E2E-authored durable coverage changes are made and all current valid coverage passes.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Current durable coverage was already updated during the arrow/status-dot alignment implementation and passed code review Round 5. API/E2E Round 4 will not change repository-resident durable coverage unless final execution reveals a current-valid failure.
