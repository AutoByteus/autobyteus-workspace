## Improvements
- Added no-clone public Docker launcher commands for macOS/Linux and Windows PowerShell so packaged app users can start the published AutoByteus server Docker node without downloading the source repository.
- Added a Settings -> Nodes guide card with copyable `start`, `start --new`, and `urls` commands plus clear next-step guidance to paste the printed Backend URL into Add Remote Node.
- Clarified user-facing wording so plain `start` is the idempotent default-node path and `start --new` creates a new isolated Docker node with automatic naming and ports.
- Updated Docker documentation to make the public launcher the recommended startup path while keeping source-checkout helper and direct Docker usage clearly separated.

## Fixes
- Hardened the launcher startup path so stale saved ports that Docker rejects at bind time are retried with fresh ports before the Backend URL is printed.
