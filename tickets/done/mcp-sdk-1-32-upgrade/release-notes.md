## Improvements

- AutoByteus now uses version 1.32.1 of the MCP library for all MCP servers, on every agent runtime, in the desktop app and in the server Docker image.

## Security

- Credentials for a remote MCP server no longer follow a redirect to another site. If a remote MCP server redirects to a different host or port, connecting, previewing tools or calling a tool fails with a message saying the redirect was not followed, and nothing is sent to the other site. Redirects within the same site still work. If you see this message, use the server's final address instead.

## Changes

- The unused WebSocket transport for MCP servers has been removed. It was never offered in Settings, and servers configured with it were not kept after a restart. Importing MCP JSON that uses `websocket` now fails for that entry instead of being silently accepted. Local (stdio) and remote (Streamable HTTP) servers work as before.

## Notes

- Existing MCP server configuration loads unchanged. Rolling back to an earlier build is possible; it reads the same configuration.
