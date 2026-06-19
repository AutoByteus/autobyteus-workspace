# Release Notes: Docker/remote browser MCP tool exposure

- Fixed Docker/remote Codex browser tool exposure so configured BrowserServer MCP tools such as `open_tab` can be listed and called through Agent Tools MCP instead of being hidden by inactive embedded Electron browser adapters.
- Removed the remote “Pair local browser” host-bridge flow from backend, Electron, and Nodes UI; Docker/remote browser automation should be configured as MCP tools inside the node/container.
- Preserved desktop Electron embedded browser tools through the local Browser bridge environment injected into the bundled server.
