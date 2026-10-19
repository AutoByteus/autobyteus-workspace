## Fixes

- Remote (Streamable HTTP) MCP servers that require authentication now connect. The headers you configure, such as `Authorization: Basic …`, are sent on every request: connecting, previewing and listing tools, and every tool call your agents make, on every agent runtime.
- The Token field for a remote MCP server is now saved and sent as `Authorization: Bearer <token>`. A hint under the field explains this and points to the JSON view for other schemes, such as Basic.
- Switching an MCP server from the Form view to the JSON view now shows its headers, and saving from the JSON view keeps them.
- A server that sets both a token and an `Authorization` header is now rejected with a clear message on save, preview and import, instead of one silently replacing the other.

## Notes

- Existing MCP server entries load unchanged. Servers without credentials, and local (stdio) servers, behave as before.
- Tokens and headers are stored on this device in the MCP server configuration file, as headers and environment values already are.
- Rolling back to an earlier build is possible: it still loads the saved configuration, but it does not send the credentials, so authenticated remote servers stop connecting again, and it drops a saved token the next time that server is saved.
