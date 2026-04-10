## Improvements
- Added advanced Remote Browser Sharing settings in Electron, including an advertised-host control for trusted LAN or local Docker pairing.
- Added per-node pair and unpair controls so a selected remote node can use the local Electron browser through an expiring bridge descriptor.

## Fixes
- Remote nodes can now receive browser-bridge access through runtime registration instead of depending only on the embedded Electron startup environment.
- Browser tool availability on paired remote nodes still remains gated by configured browser tool names, preventing accidental full browser exposure.
