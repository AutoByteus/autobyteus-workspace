## What you need to do

- Every request to an AutoByteus node now needs a key. The desktop app's own node needs nothing: it is connected when the app starts.
- Docker nodes, on the computer they run on: reinstall the Docker launcher with the same `curl … | bash -s -- install` line you first installed it with, bring the nodes to this version (`autobyteus-docker upgrade --all --tag latest`, or `--tag beta` on the beta track; a node on an older version cannot give a setup code), then run `autobyteus-docker setup-code --name <node>` for each node (the first time, this recreates the node once, keeping its data and port) and enter the code on the node's row in the desktop app's **Nodes** page. Docker nodes now accept connections only from this computer and its Tailscale address; for your local network, create a node with `autobyteus-docker new-container --allow-local-network`.
- A server you start yourself on another computer: run `node dist/node-access-cli.js setup-code --data-dir <data folder>` there and enter the code on the **Nodes** page.
- Linked nodes (remote collaboration): press **Pair again** on each linked node's row in **Nodes**.
- Phones on a company VPN or proxy network: list that network in the node setting `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS` (for example `10.20.0.0/16`). Phones over Tailscale or on a local network you allowed keep working.
- MCP clients of the MCP gateway: copy the gateway token from the **MCP Gateway** panel (Tools settings) into each client's `Authorization: Bearer` header; clients on this computer need it too.
- Update the Android app and every node you open from your phone together: the desktop app, and each Docker node (on the beta track: `autobyteus-docker upgrade --all --tag beta`). An updated app opening a node that still runs the older version stays on "Connecting to …" until that node is updated.
- For the phone's VNC Viewer full screen to turn the phone to landscape and hide Android's bars, install this release's Android APK and update the Docker node you view (on the beta track: `autobyteus-docker upgrade --all --tag beta`). With an older app, full screen still works inside the page, without turning the phone or hiding Android's bars.

**Full Changelog**: https://github.com/AutoByteus/autobyteus-workspace/compare/v1.5.12-beta.8...v1.5.12-beta.9

**Full Changelog**: https://github.com/AutoByteus/autobyteus-workspace/compare/v1.5.12-beta.8...v1.5.12-beta.9
