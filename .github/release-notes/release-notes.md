## What you need to do
- **Every AutoByteus node now needs a key.** Nodes refuse any request without one. The desktop app's own node needs nothing: it is connected when the app starts. Every other node shows "Needs connecting" on the **Nodes** page until you connect it once, as below.
- **Update everything together:** the desktop app, every Docker node and node on another computer, and the Android app. The phone's screens come from the node, and an updated Android app waits on "Connecting to …" for a node that still runs an older version.
- **Docker nodes: reinstall the launcher, upgrade, then connect each node with a setup code.** On the computer the nodes run on:

  ```bash
  curl -fsSL https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh | bash -s -- install
  autobyteus-docker upgrade --all --tag latest
  autobyteus-docker setup-code --name <node>
  ```

  Run `setup-code` for each node, after the upgrade: a node on an older version cannot give a code. Enter the code on that node's row in **Nodes**. Each node is recreated once and keeps its data, its settings and its Backend port. Docker nodes now publish only their Backend port, and accept connections only from this computer and its Tailscale address. To reach a Docker node from your local network, create it with `autobyteus-docker new-container --allow-local-network`.
- **A server you start yourself on another computer:** run `node dist/node-access-cli.js setup-code --data-dir <data folder>` there and enter the code on the **Nodes** page.
- **Linked nodes (Remote Collaboration):** press **Pair again** on each linked node's row in **Nodes**.
- **MCP clients of the MCP gateway:** copy the gateway token from the **MCP Gateway** panel (Tools settings) into each client's `Authorization: Bearer` header. Clients on this computer need it too.
- **Install this release's Android APK** (`AutoByteus_personal_android-1.5.12-release.apk`) for the one-step QR scan, your nodes by name, **Switch node**, landscape full screen in the VNC Viewer, and screens no longer drawn under Android 15's bars. It installs over your current app and keeps your pairing.
- **On macOS, the app may ask for access to its Keychain item** the first time it stores a node's key ("AutoByteus Safe Storage"). Choose **Always Allow**; the keys of your nodes are kept encrypted with it.
- **Phones over Tailscale need nothing.** Phones on your Wi-Fi or LAN are allowed after one "Allow phones on this network?" in Phone Setup (off until you answer, asked again on a new network). Phones on a company VPN or proxy network: list that network in the node setting `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS` (for example `10.20.0.0/16`).
- **If you reach a node by a public domain name**, add that name to the node setting `AUTOBYTEUS_ALLOWED_HOSTS` (comma-separated; `.example.com` covers every name under it) and restart the node. Until then its requests get `403 REMOTE_ACCESS_HOST_REFUSED`. IP addresses, `localhost`, `.local`, `.lan`, `.home.arpa`, `.internal`, dotless names, `*.ts.net` (Tailscale) and paired phones need nothing.
- **If one of your own local web pages calls a node** (for example `http://localhost:5173`), or your phone reaches the node through a proxy that rewrites the host name without `X-Forwarded-Host`, add that exact origin to `AUTOBYTEUS_ALLOWED_ORIGINS` and restart the node.
- **HTML previews now run sealed off.** Ordinary pages work as before. A page that needs JavaScript modules from the workspace, `fetch` of workspace files, workspace web fonts, Web Workers or browser storage no longer works in a preview: run it from a local server and open it in the in-app browser instead.

## Good To Know
- **A paired phone can read any file on its node by path, read-only,** when a conversation names it: it can never change, rename or delete a file there, and linked nodes cannot read files this way. A phone keeps this access until you revoke it in Phone Setup; phone keys do not expire yet.
- **The standalone application host** (a separate server for running one application, on this computer only by default) does not check keys yet. Keep it on `localhost`.
- **Rolling back to 1.5.11 is possible.** This release converts no stored data. Installing 1.5.11 again also removes the node keys and the other protections in this release. The desktop app never downgrades by itself; Docker users pin `autobyteus/autobyteus-server:1.5.11`.

## What's New
- **Nodes are protected by keys.** The desktop app, phones, linked nodes, Memory Sync and MCP clients each hold their own key, and connections from networks a node does not accept are refused first. The **Nodes** page shows which nodes need connecting, connects one with a one-time setup code and disconnects this desktop from a node. Revoking a phone, disconnecting a desktop or removing a linked node ends its open connections at once.
- **Linking two nodes is one step:** press **Pair** and both nodes are linked.
- **Connect a phone in one step.** Nodes › Phone Setup shows the ways a phone can reach the node (Same Wi-Fi or LAN, Tailscale, Your VPN, Company address), finds and checks the address itself and marks the best way "Recommended". Press **Show QR code** and scan it with the Android app. It works for Docker nodes and nodes on other computers too.
- **Several nodes on one phone.** The Android app opens on a list of your nodes by name, shows which are online, and **Switch node** moves to another with one tap.
- **A rebuilt phone app around your runs.** The phone opens on the same run list as the desktop, with each run's delegated work as a tree. Tap a row to talk to that agent. One ⋮ menu opens Artifacts, Files, Messages and Activity; **+** starts a new agent run. The phone's Home screen, "Switch work" and bottom tabs are gone; starting Team or Org runs, Stop, Archive, Delete and Attach stay on the desktop.
- **Watch and control a Docker node's desktop**, from the desktop app's VNC Viewer and now from your phone: open **VNC Viewer** in a run's ⋮ menu. It opens in View only; switch to **Control** to tap, type and paste. On the phone, **Full screen** turns the phone to landscape, and a double tap switches between Fit and Fill. The viewer reaches the node through its own address, so it works for nodes on other computers.
- **Files named in a conversation open on the phone**, wherever they are on the node's computer, read-only and full screen. A missing file or a folder says so.
- **Open runs keep up after a lost connection.** On the phone and in the desktop window, an open run keeps reconnecting while it is on screen, catches up with what it missed, and catches up again when you return to the phone app.
- **The MCP Gateway panel** shows the gateway token with Copy and Regenerate.
- **DeepSeek Harness** (DeepSeek's own agent program, `dsh`, a developer preview you install yourself) can run agents. Its model calls use your DeepSeek key from Settings → API Keys without ever holding it.
- **A Runs view in the left panel**, next to Workspaces and Projects, and delegated rows show in place when you expand a run.

## Improvements
- **Nodes refuse other websites and DNS-rebinding pages.** A web page in your browser, or on another local port, can no longer use a node with your rights; files a node serves open walled off from it.
- **A paired phone's key works only for what the phone app shows**: runs, teams, organizations, projects, files and the node desktop view. It is refused for the terminal, applications and other desktop-only features.
- **Phone privacy:** the phone shows your nodes only by name, never by their network address, so screenshots no longer show your computer's or Tailscale network's name. A node that cannot be reached shows "Can't reach <node>" with Retry.
- **The phone shows what the node said about it:** a revoked phone returns to its pairing screen; with Phone access off it shows "Phone access off" and keeps its pairing.
- **Delegated work shows its live state everywhere**, in the Runs view, the Workspaces tree and the phone, even when the parent run is not open.
- **The Android app keeps your page** and what you typed when the phone rotates or the keyboard opens, and comes back to the same node page after Android closed it in the background.
- **Agent Runtimes** show full runtime versions, prereleases included.
- **A message sent during a busy turn shows once** on other phones and windows.
- **Clear answers for a folder typed by path**, such as "No folder at this path."; the node no longer records such a path as a workspace.
- **Dates and numbers follow the app's language.**

## Fixes
- **A run can switch back to Antigravity** after it was switched to another runtime.
- **Dev servers that agents start no longer take the app's backend port.**
- **No lasting "Automatic update failed"** on a node that was updated another way, and **automatic node updates no longer fail right after a release**: a desktop is offered a version only once its nodes' server update is published.
- **Files named in a conversation open on the phone again**, and a finished conversation explains a file link it cannot open.

## Upgrade Notes
- **Docker.** The server image is `autobyteus/autobyteus-server:1.5.12`; `:latest` and `:beta` point to it. If you follow the beta track, `autobyteus-docker upgrade --all --tag latest` returns your nodes to stable: this release is the same software as 1.5.12-beta.11.
- **Desktop.** Installs on the beta track that already have a 1.5.12 beta are offered this release as an update too.
