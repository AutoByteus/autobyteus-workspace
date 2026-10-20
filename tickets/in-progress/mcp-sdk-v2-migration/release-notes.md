# Release Notes — MCP client v2

## What's Changed

- AutoByteus now connects to MCP servers with the new MCP TypeScript client (version 2). Stdio and remote (streamable HTTP) servers, configured headers and tokens, the redirect rule, tool calls, timeouts and stopping a run work as before, on every agent runtime.
- MCP servers that split their tool list into pages now show all their tools. Before, only the first page appeared.

## Changed Error Messages

The text of MCP connection errors in server preview and connection comes from the MCP client, so some of it reads differently:

- Remote server errors: `SdkHttpError: Error POSTing to endpoint: …` instead of `Streamable HTTP error: Error POSTing to endpoint: …`.
- A refused redirect to another site now also says to use that URL as the endpoint if it is the intended server.
- A local server that exits at start: `SdkError: Connection closed` instead of `McpError: MCP error -32000: Connection closed`.
- A local server that does not answer at start: `SdkError: Request timed out` instead of `McpError: MCP error -32001: Request timed out`. It still gives up after 60 seconds.

## Notes

- No settings or saved MCP server configurations change. Rolling back to an earlier version is possible.
