## Improvements
- Added no-clone public Docker launcher install commands for macOS/Linux and Windows PowerShell so packaged app users can install `autobyteus-docker` without downloading the source repository.
- Added a Settings -> Nodes guide card with copyable install commands plus direct local commands for `start`, `start --new`, `urls`, `status`, `logs`, and `stop`.
- Split launcher update from server startup: `autobyteus-docker update` refreshes the local launcher only, while `autobyteus-docker start` checks/pulls the server image and starts or refreshes the Docker container as needed.
- Updated Docker documentation to make the install-once launcher the recommended startup path while keeping source-checkout helper and direct Docker usage clearly separated.

## Fixes
- Hardened the launcher startup path so stale saved ports that Docker rejects at bind time are retried with fresh ports before the Backend URL is printed.
