## What's New
- Task-delegation system notifications now show task-centered, human-readable content for delegated work, result review, and revision requests instead of exposing internal lifecycle identifiers, target kind/name labels, or tool protocol text.

## Improvements
- Member and team-target activation notifications now use the same visible task template.
- `review_task_result` now uses the `comment` field for review feedback and revision instructions, keeping review comments distinct from ordinary inter-agent messages.
- Task-delegation stream/status payloads now report acceptance feedback as `acceptanceComment`.
- Live mixed-runtime task-delegation coverage now guards the improved notification copy and canonical review-comment fields.

## Fixes
- Prevented task-delegation system notifications from duplicating runtime/model instruction packets into the visible conversation transcript.
