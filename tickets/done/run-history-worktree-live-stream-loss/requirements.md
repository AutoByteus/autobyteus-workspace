# Requirements

- Status: `Design-ready`
- Ticket: `run-history-worktree-live-stream-loss`
- Last Updated: `2026-03-10`

## Goal / Problem Statement

In the frontend workspaces work tree and run history area, selecting older historical agent-team runs can cause an actively running team entry to disappear from the tree until the Electron window is force reloaded. After reload, the running team may reappear in the tree, but the main event monitor / live streaming message area no longer tracks the active team member stream even while the activity panel still shows live execution.

The same work tree area also fails to provide a valid removal path for newly created draft agent runs and draft team runs that have not sent their first message yet.

## Confirmed User Intent

- Use a dedicated git worktree based on the current `personal` branch.
- Create a dedicated ticket branch for the fix.
- Investigate root cause rather than patching symptoms blindly.
- Fix the frontend behavior so active team runs remain visible and their live event stream remains attached while the user clicks historical runs.
- Also fix the inability to remove newly created draft agent/team runs before the first message is sent.

## Observed Reproduction Notes

- Start an agent team run, for example the Bible learning team.
- While that team is still running, click into other historical team runs in the work tree that are not currently running.
- Intermittently, the actively running team disappears from the work tree.
- A manual Electron force reload makes the team appear again.
- After reload, the activity panel can still reflect ongoing work, but the main event/message monitor for the previously running member no longer live-updates.
- If a user creates an agent draft or a team draft but never sends the first message, the work tree does not offer a working removal path for that local draft entry.

## In-Scope Use Cases

- `UC-001`: User starts a new agent-team run and sees it in the work tree immediately.
- `UC-002`: While that team is still running, user clicks historical team runs or historical team members in the work tree.
- `UC-003`: The active run remains visible in the work tree and is not removed by historical selection changes.
- `UC-004`: The main event/message monitor can return to the actively running team member and still receives live updates.
- `UC-005`: Activity-side panels and main event/message monitor stay consistent instead of diverging into different run contexts.
- `UC-006`: User creates an agent draft run but sends no first message and can remove that draft from the work tree cleanly.
- `UC-007`: User creates a team draft run but sends no first message and can remove that draft from the work tree cleanly.

## Out Of Scope

- Backend runtime execution bugs if the frontend state is already receiving correct live updates.
- New work tree UX or redesign unrelated to this disappearance / live-stream tracking bug.
- Manual run recovery tools beyond preserving existing active-run visibility/tracking and draft removal.

## Functional Requirements

- `R-001`: Clicking a team row in the work tree must resolve to a usable team context, not only to a raw `selectedRunId` with no matching `activeTeamContext`.
- `R-002`: Historical team-row selection must route through the same team history open path used for member-row hydration, using the team’s focused/default member when needed.
- `R-003`: Once a team has been selected/opened in the work tree, its expanded member list must remain visible while the user selects a different team unless the user explicitly collapses it.
- `R-004`: Selecting another team history row must not remove or invalidate the still-running team context already held in memory.
- `R-005`: Team workspace center content, team event monitor, and right-side activity feed must always derive from a loaded team/member context after team-row navigation.
- `R-006`: Existing member-row selection behavior for both live and historical team runs must remain intact.
- `R-007`: Draft agent runs (`temp-*`) with no first message must expose a local removal path that clears the local context without calling persisted-history delete APIs.
- `R-008`: Draft team runs (`temp-team-*`) with no first message must expose a local removal path that clears the local context without calling persisted-history delete APIs.
- `R-009`: Persisted-history delete behavior for real non-temp run IDs must remain unchanged.

## Non-Functional Requirements

- `NFR-001`: Keep the fix frontend-only unless investigation later proves backend state is incorrect.
- `NFR-002`: Preserve existing run-history store/composable layering rather than introducing a separate team-history state owner.
- `NFR-003`: Avoid legacy fallback behavior where a team row can appear selected without a usable loaded context.
- `NFR-004`: Add focused automated regression coverage for the team-row selection and tree-expansion behavior.
- `NFR-005`: Keep draft removal logic scoped to existing local run/team context stores and avoid backend coupling for temp IDs.

## Acceptance Criteria

- `AC-001`: Clicking a historical team row hydrates/selects a usable team context through the run-history open path instead of leaving the team workspace blank.
- `AC-002`: After selecting one team and then another, the previously opened team’s member list remains visible in the tree until the user explicitly collapses it.
- `AC-003`: Selecting a historical team row does not remove the live team context already in memory for another still-running team.
- `AC-004`: After navigating between historical and live teams, the center event monitor and right-side activity feed remain tied to the currently loaded focused member context rather than a missing selection target.
- `AC-005`: Clicking a team member row continues to work for both live and historical teams.
- `AC-006`: Removing a draft agent run before the first message clears it from local UI/state without attempting persisted-history deletion.
- `AC-007`: Removing a draft team run before the first message clears it from local UI/state without attempting persisted-history deletion.
- `AC-008`: Real non-temp history deletion behavior remains unchanged.
- `AC-009`: Focused regression tests cover historical team-row selection, multi-team expansion visibility, and draft agent/team removal behavior.

## Constraints / Dependencies

- The affected code is expected to live in the frontend workspace, likely under `autobyteus-web`.
- Existing run-history and active-runtime state may already be split across different stores or composables.
- The bug appears intermittent, so source-level reasoning and targeted test coverage are likely required.

## Resolved Analysis Notes

- The main frontend bug is not a backend run-loss problem.
- The current team-row click path writes selection state without guaranteeing a loaded team context.
- The current expansion model causes selected teams to auto-expand transiently but not stay expanded once selection moves elsewhere.
- Draft removal is currently split between UI affordances and store methods in a way that rejects temp IDs instead of clearing local draft state.

## Requirement Coverage Map

- `R-001` -> `UC-002`, `UC-004`, `UC-005`
- `R-002` -> `UC-002`, `UC-004`
- `R-003` -> `UC-002`, `UC-003`
- `R-004` -> `UC-003`, `UC-004`
- `R-005` -> `UC-004`, `UC-005`
- `R-006` -> `UC-002`, `UC-004`
- `R-007` -> `UC-006`
- `R-008` -> `UC-007`
- `R-009` -> `UC-006`, `UC-007`

## Acceptance Criteria Coverage Map

- `AC-001` -> `AV-001`
- `AC-002` -> `AV-002`
- `AC-003` -> `AV-003`
- `AC-004` -> `AV-004`
- `AC-005` -> `AV-005`
- `AC-006` -> `AV-006`
- `AC-007` -> `AV-007`
- `AC-008` -> `AV-008`
- `AC-009` -> `AV-009`

## Scope Triage

- Confirmed classification: `Medium`
- Rationale:
  - The fix crosses shared work tree selection/expansion composables, work tree mutation handling, and temp run/team lifecycle cleanup.
  - The bugs are frontend-only but span multiple stores/components.
  - Regression coverage is required because both failures come from interaction between local UI state and run/team lifecycle rules.
