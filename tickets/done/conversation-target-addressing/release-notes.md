## What's New
- Added typed conversation targeting for team chats so messages can be sent from the normal composer to runtime task agents, task-team roots, and nested task-team members.

## Improvements
- Improved AutoByteus task-delegation context preservation so delegated subteams can be created, projected in the workspace, and addressed in follow-up chat.
- Updated team WebSocket targeting to use canonical `conversation_target_address` payloads while keeping existing flat structural target compatibility.

## Fixes
- Fixed stale or malformed runtime chat targets falling back to structural or coordinator routes; invalid runtime targets now fail explicitly instead of posting to the wrong participant.
