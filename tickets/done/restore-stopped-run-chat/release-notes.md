## What's New
- Updated hosted application iframe startup to the v3 launch contract, using a clearer iframe launch identity for embedded app sessions.

## Improvements
- Refreshed built-in application packages so Brief Studio and Socratic Math Teacher use the current iframe launch contract.
- Improved team run stop handling so run history is marked inactive only after the backend confirms termination.

## Fixes
- Fixed follow-up chat after stopping or reopening single-agent runs by restoring persisted runs before delivering the next message.
- Fixed follow-up chat after stopping or reopening team runs, including member-targeted messages and restored stream updates.
- Fixed failed team termination attempts so they no longer tear down the active local team state or mark the team inactive incorrectly.
