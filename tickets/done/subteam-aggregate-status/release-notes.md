# Release Notes

## Improvements

- Nested Teams in the Workspaces history tree now show a live status dot that
  summarizes the highest-priority Agent state in their subtree.
- The nested-Team status remains visible while collapsed and updates from
  existing live execution data without a new request.
- Recursive configured members and task-scoped Agent work are included while
  adjacent Teams remain isolated.

## Preserved Behavior

- Root Team activity remains a binary active/inactive cue; the nested summary
  does not change Team lifecycle, readiness, interrupt, archive, or delete
  behavior.
- English and Simplified Chinese accessible status labels are included.
