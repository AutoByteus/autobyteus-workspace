## Improvements

- Bulk Import of MCP servers now shows which entries failed and why. Each failed entry is listed under the Import button with its name and the reason, and the view stays open so you can fix them. The reasons never show your env, header or token values.
- You can now paste the content of an AutoByteus `mcps.json` into Bulk Import, for example to move your MCP servers to another install. Entries without a `transport_type` are read as remote (HTTP) when they have a `url` and local (stdio) when they have a `command`, the same way the app reads its own file.
- After an import, the server list refreshes whenever at least one server was imported, and the message tells a full import, a partial import and a failed import apart.

## Notes

- No settings or stored data change. Rolling back to an earlier build is possible.
