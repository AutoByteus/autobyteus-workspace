## What's New

- Added a mobile-safe Docker node profile for Android Phone Access, so phones can pair with a controlled Docker node instead of the embedded host desktop node.
- Added Phone Access setup in opened remote Docker node windows using launcher-generated node-admin claims.
- Added same-node verification for Docker-node QR creation so Android-facing HTTPS URLs must match the managed Docker node before pairing.

## Improvements

- Improved the Docker launcher guide with `new-container --profile mobile-safe` and node-admin claim show/rotate commands.
- Improved Phone Access setup guidance for Tailscale Serve/private HTTPS URLs and Android travel use.
- Stored Docker node-admin claims in Electron owner-side storage and exposed only redacted claim state to normal renderer UI.
- Documented the Phase Two mobile backend authorization, token, session, and secure-storage hardening roadmap.

## Fixes

- Removed the standard mobile Tools/Terminal/VNC page and terminal/VNC controls from `/mobile`.
- Prevented Docker bridge, LAN, or VPN peers from being treated as loopback owner trust for Phone Access management.
- Redacted node-admin claim and pairing credential names in URL/logging helpers.
