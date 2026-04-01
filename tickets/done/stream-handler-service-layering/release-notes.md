## What's New
- Team run approval routing now resolves the correct member identity from the active team run, keeping approval actions aligned with the visible team member name in live sessions.

## Improvements
- Agent and team live stream handlers now resolve active runs through the owning run services, which keeps websocket session handling aligned with the same service boundary used by the rest of the runtime.

## Fixes
- Fixed local monorepo server Docker builds so patched workspace dependencies are included again during image creation.
- Fixed the local Docker start helper so `ps` and `logs` work correctly even when no extra arguments are passed.
