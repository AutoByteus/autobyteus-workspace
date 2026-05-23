# Release Notes: Phone Setup and Tailscale Mobile Access

## What's New

- Added a dedicated **Settings → Nodes → Phone Setup** experience for mobile setup, Tailscale guidance, and phone pairing.
- Added copyable macOS Tailscale app commands for Serve foreground/background, Serve status, and Serve reset.
- Added clear MagicDNS guidance for creating a phone QR code from an HTTPS `/mobile` URL.

## Improvements

- Phone QR creation now requires HTTPS for desktop-created pairing sessions.
- HTTP and IP address candidates are shown as diagnostics only, instead of being auto-selected for QR creation.
- Active paired phones and revoked/history records are separated so retained revoked devices are visible without being actionable.

## Fixes

- Fixed revoked phone records appearing in the active paired-phone list.
- Fixed pairing URL handling so `/mobile` links are shown to phones while the backend stores the canonical server base URL.
- Removed stale macOS Tailscale wrapper/installer guidance from the Phone Setup flow.
