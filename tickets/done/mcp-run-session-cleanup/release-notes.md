## Fixes

- MCP servers started for an agent run now shut down when the run ends. Before, every local (stdio) MCP server process an agent used stayed running until you quit the app, so a long session could pile up idle server processes. Now they close when a run is stopped, deleted, or when a delegated copy finishes after its idle period, on every agent runtime. A run you reopen later starts its MCP servers again on its next tool call. Other running agents keep their servers.

## Notes

- No settings or stored data change. Rolling back to an earlier build is possible.
