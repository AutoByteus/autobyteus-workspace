## What's New

- Added Phone Access for pairing a phone/PWA to the desktop AutoByteus node over a reachable private-network URL.
- Added backend-served mobile web entry at `/mobile` with QR/link pairing, persisted mobile session restore, and mobile unsupported-feature notices.
- Added a phone-first mobile shell for practical work journeys: Home status/recent work, Chat, Runs, Files, Activity, agent/team continuation, new run launch, file preview, file attachment, and mobile send/launch flows.

## Improvements

- Added app-level Remote Access authorization for protected REST, GraphQL, WebSocket, and resource routes so private-network reachability is not the only protection.
- Added paired-device management with per-phone revoke and revoke-all controls from Settings -> Nodes.
- Added provider-agnostic setup documentation for LAN, Tailscale/Headscale, company VPN, NetBird, Netmaker, and WireGuard-style private networks.
- Preserved the desktop/web boundary: `/mobile` owns the phone shell, while normal desktop `/workspace` and browser desktop flows continue to use the desktop shell.

## Fixes

- Prevented mobile-facing generated URLs from falling back to unusable desktop loopback URLs when a paired private-network base is known.
- Hid or redirected desktop-only surfaces from the mobile shell instead of showing broken Electron-only controls on phones.
- Avoided mobile-only workarounds for the Round 10 command-identity symptom; the refreshed latest-base branch already contains the shared fix, and Round 11 live Codex/GPT-5.5 send validation passed.

## Non-blocking Follow-up Polish

- UX-MRA-050 through UX-MRA-054 remain later mobile UX polish: clearer runtime/model/default-source copy, calmer mixed-status wording, richer Activity drill-in ergonomics, larger attachment removal affordance, and stronger launch-summary prominence.
- These follow-ups are mobile-shell/user-experience refinements only; they should not alter normal desktop/web workflows, add provider/API-key preflight, or fork shared streaming/transport behavior.
