# Delivery User Verification Rework — Task Trail New-Run Plus Button Regression

## Meta

- Ticket: `session-discovery-ui`
- Reported At: `2026-07-02 21:08 PDT`
- Reporter: User during post-ticket-branch-push visual verification
- Current branch: `codex/session-discovery-ui`
- Current local/remote ticket HEAD before this rework artifact: `0ecd631b`
- Mainline constraint still active: push/fix only the ticket branch; do **not** merge into `personal`/mainline unless the user later authorizes it.
- Classification: `Local Fix`
- Recommended recipient: `implementation_engineer`

## User Report

The user found a regression when running a task-trail/team task flow:

> 我发现了一个bug，当我们在run task的时候，这个时候如果点右上角+，不会再启动一个和上次配置一样的team，而是报错。

Additional context from the user:

> 因为新加了task management tools，而我这个task trail team里加载了这个tools，我感觉可能是这个原因。我给的prompt是“Give the student a hard middle school geometry question. Delegate the work to student and wait for answer; do not mark the task complete until has replied.”

## Screenshots / Evidence

- Before click: `/var/folders/_2/ptz5_h0s6gj1ycz63w470mv00000gn/T/TemporaryItems/NSIRD_screencaptureui_rBi8gA/Screenshot 2026-07-02 at 9.04.00 PM.png`
  - Workspaces shows a selected active team session titled `Give the student a hard mid...`.
  - The session subtitle is `task trail (2)`.
  - Expanded task-trail members include `homework_student` and selected `homework_teacher`.
  - Header shows `homework_teacher` and the top-right `+` control tooltip is `New Agent`.
- After click: `/var/folders/_2/ptz5_h0s6gj1ycz63w470mv00000gn/T/TemporaryItems/NSIRD_screencaptureui_EBOTkx/Screenshot 2026-07-02 at 9.04.22 PM.png`
  - Main pane changes to red text: `Error: Definition not found.`
  - The expected new run/config surface does not open.

## Reproduction Path

1. Start a team run that uses the new task management tools / task-trail behavior.
2. Use a prompt like:
   - `Give the student a hard middle school geometry question. Delegate the work to student and wait for answer; do not mark the task complete until has replied.`
3. Let the task trail team run so the Workspaces tree shows a `task trail (2)` team session with members such as `homework_student` and `homework_teacher`.
4. Select/focus the `homework_teacher` member in the active task-trail session.
5. Click the top-right `+` header action.

## Expected Behavior

- Clicking `+` from an active team/member context should prepare a new run using the same valid team configuration as the currently selected run, or otherwise open the correct run config flow for that team.
- It must not navigate to an unresolved definition view.
- It must not use task-agent/task-team runtime instance identifiers as catalog definition IDs.

## Actual Behavior

- The UI transitions to an error page/state: `Error: Definition not found.`
- The user cannot start another run with the previous task-trail/team configuration from the header `+` action.

## Initial Delivery Investigation Notes

Observed relevant code paths before routing:

- `components/workspace/team/TeamWorkspaceView.vue`
  - Header `+` uses `WorkspaceHeaderActions @new-agent="createNewTeamRun"`.
  - `createNewTeamRun()` currently does:
    - `teamRunConfigStore.setConfig(buildEditableTeamRunSeed(activeTeamContext.value.config))`
    - `agentRunConfigStore.clearConfig()`
    - `selectionStore.clearSelection()`
- `components/workspace/agent/AgentWorkspaceView.vue`
  - Agent equivalent uses `buildEditableAgentRunSeed(selectedAgent.value.config)`.
- `composables/useDefinitionLaunchDefaults.ts`
  - `buildEditableTeamRunSeed(config)` clones the existing `TeamRunConfig` and unlocks it.
- `stores/teamRunConfigStore.ts`
  - `setConfig(config)` sets the config buffer and expands the panel.

Hypothesis to validate:

- Task-trail / task-management-tool runtime teams may expose an `activeTeamContext.config` whose `teamDefinitionId`, member overrides, or member definition references are runtime/task-instance scoped rather than stable catalog definition IDs.
- The header `+` cloning path may therefore seed the run-config store with an ID that the definition catalog cannot resolve, producing `Definition not found.`
- The fix likely needs to normalize the source config for task-trail runtime contexts before opening the new-run config, or fall back to the original team definition/config metadata rather than task-instance/transient member IDs.
- Preserve the existing session-discovery UI behavior: session-first list, no source/member initials chips, `Team Name (N)` subtitles, compact guide, fixed disclosure lane, and title-row arrow/status-dot alignment.

## Acceptance Criteria For Fix

- From the reproduced task-trail team/member context, clicking the top-right `+` does not show `Definition not found.`
- The run config/new run flow is seeded with the same valid team setup that the user expects from the current/last run.
- The fix does not regress normal agent header `+` behavior.
- The fix does not regress normal team header `+` behavior for catalog-backed teams.
- Runtime/task-trail member or task-agent/task-team instance IDs are not treated as catalog definition IDs when creating a new run.
- Add or update durable coverage for this path, preferably near `TeamWorkspaceView`, `RunConfigPanel`, `useDefinitionLaunchDefaults`, `teamRunConfigStore`, and/or the relevant task-trail projection/config utilities once the root cause is confirmed.
- Continue to respect delivery constraint: push/finalize only on `codex/session-discovery-ui`; do not merge to `personal`/mainline without later user authorization.

## Suggested Files To Inspect

- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`
- `autobyteus-web/components/workspace/common/WorkspaceHeaderActions.vue`
- `autobyteus-web/composables/useDefinitionLaunchDefaults.ts`
- `autobyteus-web/stores/teamRunConfigStore.ts`
- `autobyteus-web/components/workspace/config/RunConfigPanel.vue`
- task-management/task-trail utilities and types that populate `AgentTeamContext.config`, member overrides, task-agent/task-team projection rows, and definition IDs.

## Routing Decision

- Classification: `Local Fix`
- Recommended recipient: `implementation_engineer`
- Rationale: the issue is a concrete runtime/config-seeding regression in source behavior discovered during user verification; requirements are clear enough and do not require redesign before implementation investigation.

## User Clarification — Origin Baseline Works

After the initial report, the user clarified:

> 我在origin上测试了，这个功能是好的，我觉得就是UI改动的时候引入的问题

Implication for implementation investigation:

- Treat this as a regression introduced on the `codex/session-discovery-ui` UI branch, not as an existing backend/task-management-tools defect.
- The task management tools / task-trail flow itself works on the origin baseline.
- Focus the root-cause search on frontend/UI state changes in this branch, especially the header `+` action, selection/focus state after session-first history changes, and how the active team/member context is converted into a new-run config.
- Compare against `origin/personal` behavior if needed to identify which UI path changed.
