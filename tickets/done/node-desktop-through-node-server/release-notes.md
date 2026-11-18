## What you need to do

- Docker nodes: the VNC Viewer now reaches a node's desktop through the node's own server, so the node must run this release too. Reinstall the Docker launcher (the install command in the Docker Guide), then run `autobyteus-docker upgrade --all` (on the beta track: `autobyteus-docker upgrade --all --tag beta`). Each node is recreated once and keeps its Backend port, its data and its settings. Until a node is updated, its VNC Viewer cannot connect.

## What's New

- The VNC Viewer shows a Docker node's desktop through the node's own address, the same one you added the node with, so it also works for nodes on other computers. There is nothing to configure.
- The viewer opens in View only: you can watch the agent work without touching it. Switch to Control to use the keyboard, mouse and clipboard on the node.

## Improvements

- Docker nodes publish only their Backend port. The desktop is no longer exposed on its own port.
- Viewing never changes the node's screen size, and several people can watch the same node.
- The viewer disconnects while its window is hidden or minimized and reconnects in View only when you come back.
- If the node's desktop or server restarts, the viewer says so and offers Reconnect.
- Settings: the "AutoByteus VNC Hosts" card is gone. A value you saved there shows as an ordinary custom setting that you can delete.
- The embedded node says "This node has no shared desktop".
