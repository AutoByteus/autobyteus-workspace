# Release Notes

## What's New

- Added a first-class mobile Tools view with Terminal and VNC access for paired Phone Access sessions.
- Mobile Switch Work can now start from agent and team definitions even when there is no active or recent run.

## Improvements

- Mobile run setup opens directly with the selected agent or team preselected, including team first-message target selection.
- Mobile Files now defaults to a simpler browse-first layout with advanced filters behind a secondary control.
- Mobile Activity no longer presents Terminal/VNC as unsupported phone features.

## Fixes

- Fixed false `No matching agents` / `No matching teams` states by showing truthful loading, error, retry, and empty catalog states.
- Terminal sessions on mobile use the selected workspace and authenticated Phone Access WebSocket credential path.
- VNC now explains when configured hosts need phone-reachable LAN, VPN, or overlay addresses.
