# Managed Messaging Setup

Messaging is a server-managed capability owned by the selected node. The frontend controls setup, but the messaging gateway runtime is installed, started, and supervised by the node's server.

## How The Managed Flow Works

When you open `Settings -> Messaging`, the page is split into four layers:

1. `Managed Messaging Gateway`
   - Shared runtime for all messaging providers on the selected node.
   - Install, start, restart, disable, and status live here.
2. `Provider Selection`
   - Choose WhatsApp Business, WeCom App, Discord Bot, or Telegram Bot.
3. `Provider Configuration`
   - The selected provider's configuration stays visible directly under the provider cards.
4. `Channel Binding`
   - Bind an external account/peer to an active agent or team runtime.
5. `Verify`
   - Run readiness checks after gateway and binding setup.

The runtime card at the top is global. Provider configuration sits below it and remains visible while you work through binding and verification.

## Managed Gateway Lifecycle

The primary action in the runtime card does more than just "enable":

1. Resolve the compatible `autobyteus-message-gateway` artifact for the selected node version.
2. Download it on demand if it is not already installed.
3. Verify and extract it into server-owned storage.
4. Start it as a managed child process.
5. Report lifecycle state, version, and diagnostics back to the UI.

The `Runtime Endpoint` field is diagnostic only. Users should not need to type a raw gateway URL or token during the managed setup flow.

## Recommended Telegram Setup

Telegram is the simplest provider for a mostly in-app setup, as long as you use polling mode.

### Before You Begin

Outside AutoByteus, create a Telegram bot with BotFather and copy the bot token.

### In-App Setup

1. Start the node you want to control.
   - In Electron, this is usually the bundled local server.
   - In a remote deployment, use the remote node that should own messaging.
2. Open `Settings -> Messaging`.
3. In `Managed Messaging Gateway`, click `Install and Start Gateway` or `Start Gateway`.
4. Wait until the runtime card reports:
   - `Runtime State: Running`
   - a non-empty `Active Version`
   - a non-empty `Runtime Endpoint`
5. Select `Telegram Bot` in the provider cards.
6. In the provider configuration card:
   - paste the bot token
   - enter a stable `Telegram account label`
7. Click `Save Configuration`.
   - Saving valid config makes Telegram active automatically.
8. Send a message to the bot from a real Telegram user/account.
9. Move to `Channel Binding`.
10. Click `Refresh Peers`, choose the discovered Telegram peer, then click `Refresh Targets`.
11. Select the target runtime and save the binding.
12. Open `Verify` and run setup verification.

### What `Telegram account label` Means

`Telegram account label` is a stable internal identifier used by AutoByteus channel bindings. It does not need to be a Telegram numeric ID.

Use a simple value that will remain stable over time, for example:

- `telegram-main`
- `support-bot`
- `ops-telegram`

Once you have created bindings for an account id, keep that value stable.

### Polling vs Webhook

Managed AutoByteus Telegram uses `polling` only.

- no public inbound URL is required
- the selected node keeps the gateway on loopback and supervises it locally
- the app does not expose managed Telegram webhook controls
- there is no extra Telegram-specific enable switch after saving valid config

The low-level standalone gateway still supports webhook mode for operator-managed deployments, but that is not the current managed product path.

## Telegram Limitations And Notes

- Telegram peer discovery becomes useful only after at least one real inbound message reaches the bot.
- Telegram bindings currently support `AGENT` targets only.
- If `Refresh Targets` shows nothing, start an agent runtime first and try again.
- If `Refresh Peers` shows nothing, send another message to the bot and refresh again.

## Delivery Reliability And Heartbeat

Managed messaging does not rely only on an HTTP health check. The gateway keeps a file-backed reliability model:

- inbound messages are written into an inbox queue before forwarding to the server
- outbound messages are written into an outbox queue before provider delivery
- workers retry transient failures with backoff
- terminal failures move into dead-letter storage instead of disappearing
- queue owner locks publish heartbeats so lock loss is detectable

The top runtime card exposes that state through:

- reliability state
- queue heartbeat timestamps
- inbound dead-letter count
- unbound inbound count
- outbound dead-letter count

If the reliability state turns `CRITICAL_LOCK_LOST`, restart the managed gateway before trusting new deliveries.

## How To Prove Telegram Works

Use this acceptance checklist:

1. Gateway runtime is `Running`.
2. Telegram provider configuration saves without an error.
3. `Refresh Peers` returns at least one Telegram peer after a real inbound message.
4. A binding can be created for that peer by selecting an agent definition plus launch preset in the app.
5. `Run Verification` reports the setup as ready or shows actionable blockers only.
6. A follow-up Telegram message from the bound peer auto-starts or reuses the expected agent runtime.

If you need engineering-level Telegram runtime details, see the gateway README:

- `../autobyteus-message-gateway/README.md`
