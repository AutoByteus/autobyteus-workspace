## What you need to do
- Every request to an AutoByteus node now needs a key. The desktop app's own node needs nothing: it is connected when the app starts.
- Docker nodes, on the computer they run on: reinstall the Docker launcher with the same `curl … | bash -s -- install` line you first installed it with, bring the nodes to this version (`autobyteus-docker upgrade --all --tag latest`, or `--tag beta` on the beta track; a node on an older version cannot give a setup code), then run `autobyteus-docker setup-code --name <node>` for each node (the first time, this recreates the node once, keeping its data and port) and enter the code on the node's row in the desktop app's **Nodes** page. Docker nodes now accept connections only from this computer and its Tailscale address; for your local network, create a node with `autobyteus-docker new-container --allow-local-network`.
- A server you start yourself on another computer: run `node dist/node-access-cli.js setup-code --data-dir <data folder>` there and enter the code on the **Nodes** page.
- Linked nodes (remote collaboration): press **Pair again** on each linked node's row in **Nodes**.
- Phones on a company VPN or proxy network: list that network in the node setting `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS` (for example `10.20.0.0/16`). Phones over Tailscale or on a local network you allowed keep working.
- MCP clients of the MCP gateway: copy the gateway token from the **MCP Gateway** panel (Tools settings) into each client's `Authorization: Bearer` header; clients on this computer need it too.

## What's New
- Every AutoByteus node now refuses any request without a key: the desktop app, phones, linked nodes and Memory Sync each hold their own, and connections from networks the node does not accept are refused before anything else.
- The Nodes page shows which nodes need connecting, connects a node with a one-time setup code, and disconnects this desktop from a node.
- Linking two nodes is one step: press **Pair** and both nodes are linked.
- The MCP Gateway panel shows the gateway token with Copy and Regenerate.

## Improvements
- Revoking a phone, disconnecting a desktop or removing a linked node ends its open connections at once.
