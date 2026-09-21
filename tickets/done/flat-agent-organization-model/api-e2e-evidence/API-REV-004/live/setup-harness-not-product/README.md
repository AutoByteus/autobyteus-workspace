# Evidence-only execution harness correction

A first restart used a detached `nohup` child inside the command runner. The runner reaped that child after its parent command exited, so the immediate GraphQL request received connection refused. The already-open browser also attempted to reconnect a previously active standalone Team during the brief listener window. This is an API/E2E harness artifact, not product evidence. The canonical restart closes the browser first, runs the server as an owned persistent PTY session, and makes the mixed-history query before opening a new browser tab.
