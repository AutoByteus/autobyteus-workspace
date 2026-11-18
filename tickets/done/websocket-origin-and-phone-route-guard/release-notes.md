## What's changed

- **Nodes refuse requests from other websites.** A web page you open in your browser can no longer reach an AutoByteus node on your machine or network: requests and live connections from a site other than the node itself, the desktop app or a local development page are refused. This closes a way a malicious page could open a terminal or start work on your node.
- **Paired phones are limited to the phone's features.** A paired phone's sign-in now works only for what the phone app shows: runs, teams, organizations, projects, files and the node desktop view. It is refused for the terminal, update notifications, applications and other desktop-only connections. The phone stays paired.
- The desktop app, the phone app over your LAN or Tailscale Serve, and nodes working together keep working as before.

## What you need to do

- Nothing, if you reach your node directly, through Tailscale Serve, or through a proxy that keeps the original host name (or sends `X-Forwarded-Host`).
- If your phone reaches the node through a gateway or proxy that rewrites the host name and does not send `X-Forwarded-Host`, add the phone URL's origin to the node setting `AUTOBYTEUS_ALLOWED_ORIGINS` (for example `AUTOBYTEUS_ALLOWED_ORIGINS=https://gateway.example.com` in the node's `.env`) and restart the node. Otherwise the phone shows the node as unreachable and the node logs `REMOTE_ACCESS_ORIGIN_REFUSED`.

## Rolling back

Rolling back is possible: this release stores no new data. Installing an earlier version removes the protection.
