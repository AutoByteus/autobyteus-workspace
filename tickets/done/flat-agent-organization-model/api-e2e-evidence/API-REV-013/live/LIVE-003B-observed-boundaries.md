# LIVE-003B — IR-030 Real-Process Derived-Index Failure

- Artifact: `e3b3a840052cdb6cb8c552b3bf9d66ee233fc3bb`
- Source: `d741874e9a35367d0c64b57a8e7e4cd15e0e93c5`
- Server: production-built `dist/app.js`, isolated data, `127.0.0.1:8697`
- Runtime/model: real `codex_app_server` / `gpt-5.6-sol`
- Result: **Pass**

## Observed boundary facts

1. A fresh AgentOrg `/lead` message returned `AGENT_COMMAND_ACK state=accepted` while the derived `agent_org_run_history_index.json` target had intentionally been replaced by a directory.
2. The server logged exactly one caught `EISDIR` for that exact Org. The WebSocket remained `OPEN`; GraphQL remained reachable with HTTP 200; Node stayed alive.
3. Restoring the index produced the exact pre-injection SHA-256. The failed Org summary remained empty, proving no replay or relabel.
4. A second fresh Org then wrote through the same physical index path. Its accepted ACK, GraphQL row and physical JSON row all contained `APIREV13 later same-path write persists after contained failure`.
5. The first failed Org still had an empty summary after the later successful write. No `unhandled`, `uncaught`, or `fatal` marker appeared and no failed writer temp file remained.
6. Direct application-owned `SIGTERM` completed with `Server closed cleanly` and process exit `0`.

The first probe attempt observed the same successful production behavior but its final local assertion looked for GraphQL `root_run_id` keys in the camelCase physical JSON index. The corrected rerun used `orgRunId` and all eight assertions passed; no source change was made.

## Evidence

- `metadata-failure-fixed-result.json`
- `failure-contained.json`
- `later-success.json`
- `index-before-injection.json`
- `index-restored-before-later-write.json`
- `index-after-later-success.json`
- `metadata-failure-fixed-probe-rerun.log`
- `post-fix-process-and-log-check.log`
- `server.log`

