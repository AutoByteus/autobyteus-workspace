# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready / Approved by user on 2026-06-30.

## Goal / Problem Statement

Improve the left-sidebar workspace history so previous sessions are easy to find. The current hierarchy exposes implementation groupings before the user’s retrieval target: `workspaces -> teams/agents -> sessions -> roles`. Team sessions are especially hidden under a `Teams` heading and a team-definition row before the actual session appears. Session row labels are also raw, prompt-derived summaries, so truncated rows often show only the first words of the original instruction instead of a useful task/session identity.

The target UX should make sessions the first-class object under each workspace, while preserving team identity and role/member access when a team session is opened.

## Investigation Findings

- The screenshot surface is `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`, mounted from `autobyteus-web/components/AppLeftPanel.vue`.
- The per-workspace renderer is `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`.
- Current visible hierarchy inside an expanded workspace is:
  - standalone agents: agent definition row -> agent run rows;
  - teams: `Teams` heading -> team definition row -> team run rows -> member/role rows.
- Current row text comes from `summary` on `RunTreeRow` / `TeamTreeNode`; the component strips a `[User Requirement]` prefix but otherwise displays the prompt-derived `summary` directly.
- Front-end read models currently preserve the grouping shape:
  - standalone runs are projected by `autobyteus-web/utils/runTreeProjection.ts` and `autobyteus-web/stores/runHistoryReadModel.ts` as workspace -> agent -> runs;
  - team runs are projected by `autobyteus-web/stores/runHistoryTeamHelpers.ts` as workspace -> team definitions -> team runs -> members.
- Backend history APIs expose separate agent and team groups in `listWorkspaceRunHistory` / `workspaceRunHistory` (`autobyteus-web/graphql/queries/runHistoryQueries.ts`, server resolver `autobyteus-server-ts/src/api/graphql/types/run-history.ts`).
- Backend summaries are currently compacted from initial/first user input and stored as `summary` in agent/team run history index records. There is no distinct persisted session-title/display-title field today.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: The UI rendering layer follows backend/history grouping (`agentDefinitions`, `teamDefinitions`) instead of a session-first user retrieval model. The same `summary` field is used as both raw prompt summary and row identity/title, which makes labels semantically loose.
- Requirement or scope impact: The target should introduce a session-list projection/read model and a distinct session display-label concept rather than only changing CSS/indentation.

## Recommendations

1. Replace the team/agent-definition-first history tree under each expanded workspace with a direct `Sessions` list.
   - A workspace remains the scoping parent.
   - Each session row represents either an agent run or a team run.
   - Team identity is shown as a leading symbol/avatar chip on the session row, not as a parent row.
2. Use a structured session row instead of a single prompt sentence:
   - leading status dot;
   - leading agent/team avatar or initials (`SE`, `DA`, etc.);
   - primary title (`Improve session history navigation`);
   - secondary metadata (`Software Engineering Team · 7 roles · coordinator: solution_designer` or `Daily Assistant · agent session`);
   - right-aligned relative time and existing action buttons.
3. Keep role/member rows as details of a team session, not as a required navigation layer.
   - Clicking a team session opens/focuses the coordinator/default member as today.
   - Expanding the team session reveals members one level below that session row.
4. Stop treating `summary` as the session title. Add a session display label/title concept in the history read model.
   - Preferred future data shape: `displayTitle` (or `sessionTitle`) separate from `summary`.
   - Existing rows without a title must still render through a sanitized fallback, but the UI should depend on a session-label projection, not directly on raw `summary`.
5. Do not keep a dual old/new tree. Make the session-first list the history surface for this sidebar and remove/decommission the `Teams` heading and team-definition history grouping from this view.

Example target rows:

```text
[blue dot] [SE] Improve session history navigation                         8m
          Software Engineering Team · 7 roles · coordinator: solution_designer

[gray dot] [DA] Research agent memory options                              3w
          Daily Assistant · agent session
```

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User opens a workspace and scans previous sessions directly without first expanding a team/agent definition.
- UC-002: User distinguishes team sessions from agent sessions by a leading symbol/avatar and metadata.
- UC-003: User opens a team session and can still inspect/select the team’s role/member rows when needed.
- UC-004: User sees a useful row title/line that is not merely the first few words of the prompt when better title data exists.
- UC-005: Existing active, inactive, archived/deletable, and draft/local history states still expose their existing safe actions.

## Out of Scope

- Global search/filtering across all workspaces.
- A full redesign of the primary navigation (`Agents`, `Agent Teams`, `Skills`, `Memory`, `Nodes`).
- A complete launch-flow redesign for creating new agent/team runs. If current quick-create affordances are removed from the history tree because they are definition rows rather than sessions, a replacement launch affordance should be handled only to the extent necessary to avoid a dead end.
- Manual session renaming UI unless implementation finds an existing lightweight path.
- Retitling every historical session with a new LLM call. Existing history can use deterministic/sanitized display-title fallback.

## Functional Requirements

- FR-001: The workspace history sidebar must keep workspaces as the top-level scope and preserve existing workspace expand/collapse, add-workspace, remove-workspace, loading, empty, and error states.
- FR-002: Under an expanded workspace, the history surface must present sessions directly in a single session-first list. It must not require users to expand a `Teams` heading or a team-definition row before seeing team sessions.
- FR-003: The session-first list must include both standalone agent sessions and team sessions.
- FR-004: Each session row must show the session source at the beginning of the row using the existing agent/team avatar when available or initials when not available. Team rows must show the team symbol/initials at the beginning of the session row.
- FR-005: Each session row must expose structured content: status, source symbol/avatar, primary display title, secondary source metadata, relative time, and applicable run actions.
- FR-006: Team session rows must preserve current team-open behavior: selecting the row opens the team and focuses the coordinator/default member chosen by existing selection logic.
- FR-007: Team role/member rows must remain available, but only as details under the corresponding expanded/selected team session row. The role/member rows must not be a required layer before selecting the session.
- FR-008: Standalone agent sessions must preserve current open/select behavior.
- FR-009: Existing run/team actions must remain available where currently valid: terminate active runs/teams, remove drafts, archive inactive history, delete inactive history, and show pending/disabled state while mutations are in flight.
- FR-010: The session row primary label must be read from a dedicated session-display-label projection, not directly from raw `summary` in the component template.
- FR-011: The display-label projection must prefer an explicit/persisted session title when available, then fall back to a sanitized legacy/current summary, then to a safe fallback such as `Untitled session` / `Untitled team session`.
- FR-012: Summary/title cleanup must strip known prompt wrappers such as `[User Requirement]`, collapse whitespace, and avoid rendering an empty or wrapper-only label.
- FR-013: Session ordering must support session discovery. Active/running sessions should stay easy to find, and inactive sessions should be ordered by most recent activity/creation within each workspace unless implementation uncovers a stronger existing ordering invariant that must be preserved.
- FR-014: The selected session must remain visibly highlighted. Expanded team-session details must not obscure which session row is selected.
- FR-015: The implementation must update or replace tests that assert the old team-definition/agent-definition grouping and add tests for session-first rows, team-member detail expansion, and display-title fallback.

## Acceptance Criteria

- AC-001: Given a workspace with one `Software Engineering Team` team run, expanding the workspace shows that team run as a direct session row under the workspace/session list; the user does not have to expand a `Teams` heading or `Software Engineering Team (n)` group first.
- AC-002: Given multiple team runs from the same team definition, each run appears as its own session row with the `Software Engineering Team` symbol/initials at the start and the team name in metadata.
- AC-003: Given standalone agent runs, those runs appear in the same workspace session list as team sessions and include their agent avatar/initials and agent name metadata.
- AC-004: Given a team session row, clicking the row calls the existing team selection/open path and focuses the coordinator/default member, matching current historical team open behavior.
- AC-005: Given an expanded/selected team session, its role/member rows are rendered below that session row and can be clicked to focus/open the member run.
- AC-006: Given a session with an explicit session title/display title, the row primary text displays that title instead of the raw prompt-derived summary.
- AC-007: Given a legacy/current session with no explicit title and summary `**[User Requirement]** Build the demo fruit shop`, the row primary text displays `Build the demo fruit shop` and never displays the wrapper text.
- AC-008: Given a session with an empty/blank/wrapper-only title and summary, the row primary text displays a safe untitled fallback and the row remains selectable.
- AC-009: Given active and inactive sessions in the same workspace, active sessions remain discoverable and inactive sessions sort by recency according to the target ordering rule.
- AC-010: Given an active team session, its terminate action remains available and disabled/pending state is shown during termination.
- AC-011: Given an inactive historical session, archive/delete actions remain available with existing confirmation behavior.
- AC-012: Given screenshots equivalent to the supplied examples, the visual hierarchy depth from workspace to session is reduced by at least one level for team sessions: `workspace -> session -> roles/details`, not `workspace -> teams -> team-definition -> session -> roles`.

## Constraints / Dependencies

- Preserve workspace scoping and lazy per-workspace history fetching.
- Preserve active-run reconciliation and historical run hydration behavior.
- Preserve existing team member selection/focus behavior.
- Use existing avatar helpers where possible.
- Avoid a parallel old tree and new tree in the same sidebar.
- Existing history data lacks a distinct title field; implementation must either add one to the read model/API or compute a dedicated display label from existing data without leaving raw `summary` in component templates.

## Assumptions

- The left sidebar shown in the supplied screenshots is the target surface.
- Workspace remains the correct top-level scope because users may have many project roots and temp workspaces.
- Team identity should remain visible but should not be the primary grouping for history discovery.
- Session title generation can start with deterministic/sanitized fallback and later be improved with a richer generated title pipeline if needed.

## Risks / Open Questions

- Whether quick-create buttons currently attached to agent/team definition rows need an immediate replacement in the session-first view.
- Whether sorting active sessions before all history could surprise users who expect strict recency ordering.
- Whether adding a persisted `sessionTitle` / `displayTitle` field to backend history index records is desired in this iteration or whether the first implementation should keep it as a front-end read-model projection.
- Whether future search/filtering should be added after the session-first hierarchy lands.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | FR-001, FR-002, FR-003, FR-013, FR-014 |
| UC-002 | FR-004, FR-005, FR-010, FR-011, FR-012 |
| UC-003 | FR-006, FR-007, FR-014 |
| UC-004 | FR-010, FR-011, FR-012 |
| UC-005 | FR-008, FR-009, FR-015 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Verifies team sessions are no longer hidden by team grouping layers. |
| AC-002 | Verifies multiple runs from one team remain separate sessions. |
| AC-003 | Verifies agent and team sessions share one discovery surface. |
| AC-004 | Verifies team session selection behavior is preserved. |
| AC-005 | Verifies member/role detail access is preserved but moved below session. |
| AC-006 | Verifies explicit display title outranks raw prompt summary. |
| AC-007 | Verifies known prompt wrappers are stripped. |
| AC-008 | Verifies blank title fallback. |
| AC-009 | Verifies discoverable ordering. |
| AC-010 | Verifies active team actions. |
| AC-011 | Verifies inactive history actions and confirmation path. |
| AC-012 | Verifies the supplied visual pain point is resolved. |

## Approval Status

Approved by user on 2026-06-30 (user message: "approve, p l s").
