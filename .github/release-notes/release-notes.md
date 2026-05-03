## Fixes
- Fixed Claude Agent SDK team runs so sending a follow-up message after pressing stop/interrupt no longer fails with `spawn EBADF`.
- Fixed stop/interrupt handling so the app waits for the backend to finish cancelling the active Claude turn before treating the input as ready for the next message.

## Improvements
- Added durable validation for the common Claude team flow: send a message, interrupt it, then send another message in the same team session.
