# Solution Design Rework Note: Include `submit_task_result`

## Trigger

Downstream code review reported a user follow-up after the initial two-tool cleanup implementation: the user wants `submit_task_result` to receive the same meaningful public tool-result cleanup philosophy as `delegate_task` and `review_task_result`.

## Upstream Package Revised

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/design-spec.md`

## Refined Scope

All three task lifecycle public tool results are now in scope:

- `delegate_task`
- `submit_task_result`
- `review_task_result`

Input schemas remain unchanged for all three tools.

## Added `submit_task_result` Requirement

Target public success result:

```ts
{
  task_id: string;
  status: "awaiting_review";
}
```

Target public result when the submission records successfully but reviewer/delegator notification delivery fails:

```ts
{
  task_id: string;
  status: "awaiting_review";
  message: string;
}
```

The public `submit_task_result` response must no longer expose:

- `submission_id`
- `notification_delivered`
- `warnings`
- internal route keys or run ids through warning payloads

## Added `review_task_result` Tightening

After seeing the current result display, the user also clarified that `review_task_result` should not return `decision`.

Reason: `decision` is selected by the calling agent in the input arguments. The same calling agent receives the tool result, so echoing `decision` is redundant. The meaningful output is the resulting task status:

```ts
// accept
{
  task_id: string;
  status: "accepted";
}

// request_revision
{
  task_id: string;
  status: "active";
}

// revision notification delivery issue
{
  task_id: string;
  status: "active";
  message: string;
}
```

Internal review records/events still keep `decision` for audit and lifecycle event payloads.

## Internal Payload Preservation

The cleanup is only for agent-facing public tool results. Internal lifecycle/event/notification payloads must keep rich details such as submission id, execution identities, notification metadata, route keys, and warning details for routing, UI projection, diagnostics, and audit.

## Current User Review State

The refined requirements/design were **approved by the user on 2026-07-01**. A later same-day clarification removed `decision` from the public `review_task_result` output. Route the latest revised package to architecture review before implementation resumes.
