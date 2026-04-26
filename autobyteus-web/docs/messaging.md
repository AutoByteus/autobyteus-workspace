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
10. Click `Refresh Peers` and choose the discovered Telegram peer.
11. In `Channel Binding`, choose `Agent Definition` or `Agent Team`.
12. If you select `Agent Definition`, complete the launch preset and save the binding.
13. If you select `Agent Team`, choose a team definition, complete the team launch preset, and save the binding.
14. Team bindings send replies back through the coordinator or entry node only, not every member.
15. While the binding remains attached to the active run, later eligible coordinator or entry-node outputs are delivered back to Telegram even if they were triggered by internal team-member handoffs and the Telegram user has not sent a second message.
16. Open `Verify` and run setup verification.

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
- TEAM bindings target a team definition plus saved launch preset. The first inbound message creates the team run automatically, and later messages reuse the cached run only while that bot-owned run is still live in the current server session. While that route/run link is active, eligible coordinator or entry-node outputs from the run are delivered to Telegram without requiring another inbound Telegram message. After a restart or inactive cached run, the next inbound message starts a fresh team run for the binding.
- TEAM replies are emitted through the coordinator or entry node only; worker-only/internal coordination messages are not sent to the external peer.
- If `Refresh Peers` shows nothing, send another message to the bot and refresh again.

## Delivery Reliability And Heartbeat

Managed messaging does not rely only on an HTTP health check. The gateway keeps a file-backed reliability model:

- inbound messages are written into an inbox queue before forwarding to the server; server `ACCEPTED` ingress responses complete those records as accepted work rather than retrying them
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
4. A binding can be created for that peer by selecting either an agent definition plus launch preset or a team definition plus team launch preset.
5. `Run Verification` reports the setup as ready or shows actionable blockers only.
6. A follow-up Telegram message from the bound peer auto-starts or reuses the expected agent runtime while it stays live, or reuses the cached team run created from the selected team definition while that bot-owned run is still live in the current server session.
7. For team bindings, a coordinator response emitted after an internal member-to-coordinator handoff is delivered to Telegram without asking the Telegram user to send another message.

If you need engineering-level Telegram runtime details, see the gateway README:

- `../autobyteus-message-gateway/README.md`
