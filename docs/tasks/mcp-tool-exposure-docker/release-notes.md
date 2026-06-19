# Release Notes: Browser MCP exposure and Linux ARM64 desktop packaging

- Fixed Docker/remote Codex browser tool exposure so configured BrowserServer MCP tools such as `open_tab` can be listed and called through Agent Tools MCP instead of being hidden by inactive embedded Electron browser adapters.
- Removed the remote “Pair local browser” host-bridge flow from backend, Electron, and Nodes UI; Docker/remote browser automation should be configured as MCP tools inside the node/container.
- Added Linux ARM64 Electron packaging/startup support with architecture-specific Linux AppImages (`linux-x64` and `linux-arm64`) and matching updater metadata (`latest-linux.yml` and `latest-linux-arm64.yml`).
- Fixed packaged Linux ARM64 embedded-server startup by selecting bundled ARM64-compatible Prisma engines for migrations.
- Updated the desktop release workflow to build/validate Linux x64 and Linux ARM64 artifacts, including AppImage architecture, Prisma engines, updater metadata, and packaged server health.
- Corrected Linux AppImage update metadata expectations: AppImage blockmaps are embedded and represented by `blockMapSize` in `latest-linux*.yml`; standalone Linux `*.AppImage.blockmap` assets are not published.
