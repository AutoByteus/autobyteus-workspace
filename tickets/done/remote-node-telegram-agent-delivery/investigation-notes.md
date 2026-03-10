# Investigation Notes

- Ticket: `remote-node-telegram-agent-delivery`
- Date: `2026-03-10`
- Scope: Determine why Telegram messages configured on the Docker-hosted remote node do not create/show the bound Codex agent in the remote Electron window.

## Environment Observed

- Remote node endpoint in Electron: `http://localhost:60634`
- Docker container: `autobyteus-server-autobyteus-server-1`
- Container server process: `node dist/app.js --host 0.0.0.0 --port 8000 --data-dir /home/autobyteus/data`
- Managed messaging gateway process: `/home/autobyteus/data/extensions/messaging-gateway/versions/0.1.0/dist/index.js`

## Evidence Collected

### 1. The remote binding is persisted correctly on the Docker-hosted server

From the container database (`/home/autobyteus/data/db/production.db`):

- `provider`: `TELEGRAM`
- `transport`: `BUSINESS_API`
- `account_id`: `autobyteus`
- `peer_id`: `8438880216`
- `target_type`: `AGENT`
- `agent_definition_id`: `codex`
- `workspace_root_path`: `/home/autobyteus/data/temp_workspace`
- `llm_model_identifier`: `gpt-5.4`
- `runtime_kind`: `codex_app_server`
- `auto_execute_tools`: `true`
- `skill_access_mode`: `PRELOADED_ONLY`
- `target_node_name`: `null`

Conclusion: the remote node window is saving the Telegram binding to the correct remote server, and the launch preset looks valid.

### 2. No Telegram ingress receipts or Telegram-created runs were recorded on the remote server

- `channel_message_receipts` in the remote container DB is empty.
- `/home/autobyteus/data/memory/run_history_index.json` contains only one manual Codex run:
  - `runId`: `d2838be4-0ba3-42cf-83c2-7be45299cc52`
  - summary: `write a fibonacchi series in python`

Conclusion: inbound Telegram messages never reached successful server-side dispatch on the remote node.

### 3. The managed gateway did receive Telegram updates, but dead-lettered them

From `/home/autobyteus/data/extensions/messaging-gateway/runtime-data/reliability-queue/inbox/inbound-inbox.json`:

- Multiple Telegram updates for peer `8438880216` were stored.
- Records include messages such as `hello`, `Hey how are you doing`, `Hello`.
- All of those records reached `status: DEAD_LETTER`.
- Every dead-letter record shows `lastError: "fetch failed"`.

Conclusion: Telegram ingress reached the managed gateway, but the gateway failed while forwarding the inbound envelope to the server.

### 4. The managed gateway is configured to call the wrong server URL from inside Docker

From `/home/autobyteus/data/extensions/messaging-gateway/config/gateway.env`:

- `GATEWAY_SERVER_BASE_URL=http://localhost:60634`

From `/home/autobyteus/data/.env`:

- `AUTOBYTEUS_SERVER_HOST=http://localhost:60634`

From source code:

- [`managed-messaging-gateway-runtime-env.ts`](/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-telegram-agent-delivery/autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts) sets `GATEWAY_SERVER_BASE_URL` from `appConfigProvider.config.getBaseUrl()`.
- [`app-config.ts`](/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-telegram-agent-delivery/autobyteus-server-ts/src/config/app-config.ts) defines `getBaseUrl()` from `AUTOBYTEUS_SERVER_HOST`, which is the server's public URL.

Container reachability test:

- `http://localhost:60634/graphql` from inside the container: `connection refused`
- `http://127.0.0.1:8000/graphql` from inside the container: `HTTP 200`

Conclusion: the managed gateway is using the server's public host-mapped URL, not a process-local URL reachable from inside the same container. This makes every inbound forward to `/rest/api/channel-ingress/v1/messages` fail.

## Root Cause

Primary root cause:

- The managed messaging gateway runtime is bootstrapped with `GATEWAY_SERVER_BASE_URL` set to the server's public URL (`AUTOBYTEUS_SERVER_HOST`).
- In the Docker-hosted remote-node deployment, that public URL is `http://localhost:60634`, which is valid from the host machine and Electron, but invalid from inside the container.
- As a result, Telegram updates are accepted by the gateway, then dead-lettered with `fetch failed` before the remote server can create a run or publish activity to the remote UI.

## Secondary Finding

From `/home/autobyteus/data/logs/messaging-gateway/stderr.log`:

- Repeated Telegram disconnects are logged with:
  - `TELEGRAM_API_ERROR: Conflict: terminated by other getUpdates request; make sure that only one bot instance is running`

Interpretation:

- The same Telegram bot token is likely active in another polling runtime somewhere else (for example the embedded host node or another instance).
- This is a separate operational hazard from the base-URL bug.
- Even after the base-URL fix, only one active Telegram polling instance can own the token at a time.

## Additional UX Gap

Current managed status exposed by GraphQL on the remote server:

- `lifecycleState: RUNNING`
- `lastError: null`
- runtime reliability state: `HEALTHY`
- inbound dead-letter count: `6`

But the gateway logs show repeated Telegram disconnect errors, and the dead-letter queue already contains failed ingress records.

Conclusion:

- The current managed messaging status does not surface provider session supervisor failures/disconnect reasons.
- This makes the remote node appear healthy even when Telegram polling is broken or contested.

## Recommended Fix Direction

Primary fix:

- Stop deriving `GATEWAY_SERVER_BASE_URL` from the public `AUTOBYTEUS_SERVER_HOST` for the colocated managed gateway.
- Use an internal server URL reachable from the same machine/process namespace instead, for example `http://127.0.0.1:<server-listen-port>`.

Secondary improvement:

- Expose provider session supervisor state and `lastError` through the server-managed messaging status so the UI can show polling conflicts such as Telegram `getUpdates` contention.
