# Requirement Gap Rework: Uniform Task Activation Notification

## Trigger

User tested the Electron build and found the visible system task notification for a task delegated to an agent team still contains:

```text
New delegated team task.
Accountable team:
StudentStudyGroup
```

## Root Cause

The implementation followed an ambiguous part of the earlier requirement/design that still allowed accountable-team language when considered useful for team context.

Code evidence:

- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-visible-notification-renderer.ts`
  - `renderActivation(...)` adds `Accountable team:` and the target name for `record.target.kind === "team"`.
  - It also changes the header to `New delegated team task.` for team targets.
- `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts`
  - Unit test asserts `teamActivationDisplay` contains `New delegated team task.`, `Accountable team:`, and `design_team`.

## Corrected Requirement

Visible activation notification content must be uniform for individual-agent and agent-team targets. The immediate runtime recipient has a task to execute; the UI should not expose whether the original target was a member or a team.

Allowed visible activation content:

```text
You have a new task.

Task ID: task_0001

Task:
<task description>

Reference files:
- <reference>
```

Forbidden visible activation content:

- `New delegated team task`
- `Accountable team`
- `Logical member`
- target/team/member names as target labels
- delegator/sender/reviewer names
- task-agent/task-team run ids
- task-team instance ids
- execution kind
- lifecycle/tool protocol examples

## Required Design/Implementation Change

- Update `TaskDelegationVisibleNotificationRenderer.renderActivation(...)` to use one template for both target kinds.
- Remove `getTaskDelegationTargetName(...)` from visible activation rendering unless needed elsewhere.
- Update tests to assert team-target activation uses the same visible content shape as member-target activation and does not contain `New delegated team task`, `Accountable team`, or the team target name as a target label.
- Keep team target identity in metadata/events/tool results for routing/diagnostics, not visible copy.
