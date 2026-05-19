## What's New

- Added Phone Access for pairing a phone/PWA to the desktop AutoByteus node over a reachable private network URL.
- Added backend-served mobile web entry at `/mobile` with QR/link pairing, persisted mobile session restore, and mobile unsupported-feature notices.

## Improvements

- Added app-level Remote Access authorization for protected REST, GraphQL, WebSocket, and resource routes so private-network reachability is not the only protection.
- Added paired-device management with per-phone revoke and revoke-all controls from Settings -> Nodes.
- Added provider-agnostic setup documentation for LAN, Tailscale/Headscale, company VPN, NetBird, Netmaker, and WireGuard-style private networks.

## Fixes

- Prevented mobile-facing generated URLs from falling back to unusable desktop loopback URLs when a paired private-network base is known.
- Hid or redirected desktop-only surfaces from the mobile shell instead of showing broken Electron-only controls on phones.
