## What you need to do

- Docker nodes: to stop an existing node from publishing its desktop and browser-debug ports to your network, reinstall the Docker launcher (the install command in the Docker Guide), then run `autobyteus-docker upgrade --all`. Each node is recreated once and keeps its Backend and VNC Viewer ports, its data and its settings.

## Improvements

- Docker nodes publish only the ports they need. The Backend port stays open to other devices, so you add the node the same way. The VNC Viewer port is open only to the computer the node runs on, where the AutoByteus desktop app's VNC Viewer uses it. The node's raw VNC and Chrome DevTools ports are no longer published, so a separate VNC app or `chrome://inspect` can no longer reach a node from another computer.
- The launcher, `docker-start.sh` and the Docker Guide show the Backend, GraphQL and VNC Viewer addresses, and mark the VNC Viewer as "this computer only".
