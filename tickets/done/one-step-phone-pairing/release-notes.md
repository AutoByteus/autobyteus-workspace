## What's New

- **Connect a phone in one step.** Nodes › Phone Setup now shows the ways a phone can reach the node as tabs: Same Wi-Fi or LAN, Tailscale, Your VPN and Company address. AutoByteus finds and checks the address itself and marks the best way "Recommended". Press **Show QR code**, scan it with the AutoByteus Android app, and the phone is connected. There is no address to type or choose, no extra checkbox on the phone and no device name to fill in.
- **Works for every node.** The same panel works in the window of a Docker node on this computer and of a node on another machine. Every address in a QR is checked to reach that exact node.
- **Same Wi-Fi asks once per network.** Phones on your local Wi-Fi or LAN are allowed after one "Allow phones on this network?". The answer is kept for that network, and AutoByteus asks again on a new network. Tailscale and VPN connections need no question.
- **Several nodes on one phone.** Each node shows on the phone under its own name: the desktop's own node under this computer's name, every other node under its name from the Nodes page. The Android app opens on a scan-first list of your nodes that shows which ones are online. **Switch node** in a node's connection sheet moves to another node with one tap.
- **A tidier phones list.** Connected phones show how they connect and when they were last seen, each with its own **Revoke**. Revoked phones are kept under a collapsed History. A **Phone access** switch at the top turns phone access for the node off and on.
- **No app yet?** Scanning the QR with the phone's camera opens the node in the browser. One **Connect to <node>** tap connects it there, and the page offers the Android app.

## Improvements

- The QR code is shown on request with its remaining time, and closing it discards the code.
- An optional "Advanced" command in the Tailscale tab gives the node a secure `https://` address on your tailnet. AutoByteus shows the command and never runs it.
- Phones that were already connected keep working without connecting again.

## What you need to do

- **Update your Docker nodes and your nodes on other machines to this version before you connect a new phone to them.** The new Phone Setup panel needs the node's new server. On a node that is not updated yet, Phone Setup shows an error instead of the ways to connect. Phones that are already connected keep working either way. To update Docker nodes on the beta track, run `autobyteus-docker update --all`. Nodes on the `latest` track get this change with the next stable release.
- **Install the new Android app** to get the one-step scan, node names and Switch node. The current app still connects with a QR from the new desktop.
