# Release Notes — Docker Launcher UX Defaults

- Docker launcher install on macOS/Linux now prints clearer next steps, including a direct executable path, current-shell `PATH` export guidance, and duplicate-safe persistent profile setup or copy/paste setup commands.
- Fresh indexed Docker nodes now prefer easy-to-read sequential host ports when available, so `autobyteus-server-1` and later nodes follow the same friendly port pattern as `autobyteus-server-0`.
- Read-only Docker discovery commands now show all managed nodes by default for `urls`, `ports`, `workspace paths`, and `storage`, while explicit single-node selectors remain available.
- Mutating commands keep explicit safety boundaries: upgrade/destroy still require `--all`, workspace apply does not broaden silently, and logs remain single-node by default.
