# autobyteus-message-gateway

External messaging gateway for AutoByteus channels (WhatsApp, WeCom, WeChat personal, Discord bot, Telegram bot).

## Current status

Implemented:
- webhook ingress for WhatsApp Business + WeCom
- WhatsApp Personal session ingress bridge
- WeChat Personal session ingress bridge
- Discord bot ingress (Gateway API/WebSocket) + outbound send (REST API)
- Telegram bot ingress (Polling or Webhook) + outbound send (Bot API)
- signed forwarding to `autobyteus-server-ts`
- callback outbound delivery with retry + dead-letter + idempotency

Detailed design/runtime docs:

- `tickets/external_messaging_channel_bridge_ticket/MESSAGING_GATEWAY_DESIGN.md`
- `tickets/external_messaging_channel_bridge_ticket/MESSAGING_GATEWAY_RUNTIME_SIMULATION.md`

## Scripts

- `pnpm typecheck`
- `pnpm build`
- `pnpm test`

## Docker (recommended for always-on gateway)

1. Prepare container env:

```bash
cp docker/.env.docker.example docker/.env.docker
```

2. Update `docker/.env.docker` values for your setup:
   - `GATEWAY_SERVER_BASE_URL`:
     - use `http://host.docker.internal:8000` if `autobyteus-server-ts` runs on your host machine
     - use `http://<service-name>:8000` if it runs in Docker on the same network
   - set secrets/tokens (`GATEWAY_SERVER_SHARED_SECRET`, optional `GATEWAY_ADMIN_TOKEN`, webhook secrets)

3. Build and start in background:

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

4. Check health/logs:

```bash
curl http://localhost:8010/health
docker compose -f docker/docker-compose.yml logs -f message-gateway
```

5. Stop when needed:

```bash
docker compose -f docker/docker-compose.yml down
```

Notes:
- `restart: unless-stopped` is enabled, so the gateway starts again automatically when Docker restarts.
- Session/auth state under `memory/` is persisted via a bind mount.

## Docker (gateway + WeChat personal sidecar)

Use this stack when you want one command to run both services in Linux Docker:

- `message-gateway`
- `wechaty-sidecar` (`wechaty-puppet-service` by default)

1. Prepare env file:

```bash
cp docker/.env.docker.wechat-personal.example docker/.env.docker.wechat-personal
```

2. Generate and set shared secret:

```bash
docker/scripts/generate-sidecar-secret.sh
```

Put that value into `SIDECAR_SHARED_SECRET` in `docker/.env.docker.wechat-personal`.

3. Set required values in `docker/.env.docker.wechat-personal`:
   - `GATEWAY_SERVER_BASE_URL`
   - `GATEWAY_SERVER_SHARED_SECRET`
   - `WECHATY_PUPPET_SERVICE_TOKEN` (required for `wechaty-puppet-service`)

4. Start stack:

```bash
docker compose -f docker/docker-compose.wechat-personal.yml --env-file docker/.env.docker.wechat-personal up -d --build
```

5. Check status:

```bash
curl http://localhost:8010/health
curl http://localhost:8788/health
docker compose -f docker/docker-compose.wechat-personal.yml --env-file docker/.env.docker.wechat-personal logs -f message-gateway wechaty-sidecar
```

6. Stop stack:

```bash
docker compose -f docker/docker-compose.wechat-personal.yml --env-file docker/.env.docker.wechat-personal down
```

Notes:
- Sidecar-to-gateway auth uses `SIDECAR_SHARED_SECRET` (sidecar) == `GATEWAY_WECHAT_PERSONAL_SIDECAR_SHARED_SECRET` (gateway), wired automatically by compose.
- This Linux Docker path is best with token-backed providers (`wechaty-puppet-service`/service-style puppets).
- `wechaty-puppet-xp` is typically Windows-host oriented and not a good fit for Linux containers.

## Runtime setup

### Required base variables

- `GATEWAY_SERVER_BASE_URL` (default: `http://localhost:8000`)
- `GATEWAY_SERVER_SHARED_SECRET` (recommended; used for signed calls to server ingress)
- `GATEWAY_ADMIN_TOKEN` (optional; when set, channel-admin endpoints require `Authorization: Bearer <token>`)
- `GATEWAY_PORT` (default: `8010`)
- `GATEWAY_HOST` (default: `0.0.0.0`)

### WhatsApp Business webhook mode

- `GATEWAY_WHATSAPP_BUSINESS_SECRET` (Meta webhook app secret)
- Configure WhatsApp webhook endpoint to:
  - `POST /webhooks/whatsapp`

### WeCom webhook mode

- `GATEWAY_WECOM_WEBHOOK_TOKEN` (token shared with WeCom webhook config)
- Configure WeCom webhook endpoint to:
  - `POST /webhooks/wecom`

### Discord bot mode

- `GATEWAY_DISCORD_ENABLED=true`
- `GATEWAY_DISCORD_BOT_TOKEN` (Discord bot token)
- `GATEWAY_DISCORD_ACCOUNT_ID` (required stable account identifier used in channel bindings)
- Optional discovery tuning:
  - `GATEWAY_DISCORD_DISCOVERY_MAX_CANDIDATES` (default: `200`)
  - `GATEWAY_DISCORD_DISCOVERY_TTL_SECONDS` (default: `604800`)
- Behavior notes:
  - `BUSINESS_API` is the internal AutoByteus transport label for Discord bot integration (Gateway + REST), not a separate Discord paid API tier.
  - No inbound webhook endpoint is required for Discord.
  - Gateway subscribes to Discord Gateway events and forwards inbound messages to `autobyteus-server-ts`.
  - Outbound messages are sent via Discord REST APIs.
  - Channel-admin capabilities endpoint includes `discordEnabled` and `discordAccountId`:
    - `GET /api/channel-admin/v1/capabilities`
  - Discord peer discovery endpoint:
    - `GET /api/channel-admin/v1/discord/peer-candidates?limit=50&includeGroups=true&accountId=<optional>`
    - returns `DISCORD_DISCOVERY_NOT_ENABLED` when Discord discovery is disabled

### Telegram bot mode

- `GATEWAY_TELEGRAM_ENABLED=true`
- `GATEWAY_TELEGRAM_BOT_TOKEN` (Telegram bot token from BotFather)
- `GATEWAY_TELEGRAM_ACCOUNT_ID` (required stable account identifier used in channel bindings)
- Polling vs webhook mode (exactly one must be true when Telegram is enabled):
  - `GATEWAY_TELEGRAM_POLLING_ENABLED` (default: `true`)
  - `GATEWAY_TELEGRAM_WEBHOOK_ENABLED` (default: `false`)
- Webhook mode security:
  - `GATEWAY_TELEGRAM_WEBHOOK_SECRET_TOKEN` (required when webhook mode is enabled)
- Behavior notes:
  - `BUSINESS_API` is the internal AutoByteus transport label for Telegram bot integration.
  - Polling mode: gateway long-polls Telegram Bot API (`getUpdates`) and forwards inbound messages.
  - Webhook mode: configure Telegram webhook endpoint to `POST /webhooks/telegram`.
  - When webhook secret token is configured, gateway verifies
    `x-telegram-bot-api-secret-token`.
  - Channel-admin capabilities endpoint includes `telegramEnabled` and `telegramAccountId`:
    - `GET /api/channel-admin/v1/capabilities`
  - Telegram peer discovery endpoint:
    - `GET /api/channel-admin/v1/telegram/peer-candidates?limit=50&includeGroups=true&accountId=<optional>`
    - returns `TELEGRAM_DISCOVERY_NOT_ENABLED` when Telegram discovery is disabled

### WhatsApp Personal session mode

- `GATEWAY_WHATSAPP_PERSONAL_ENABLED=true`
- Optional:
  - `GATEWAY_WHATSAPP_PERSONAL_QR_TTL_SECONDS` (default: `120`)
  - `GATEWAY_WHATSAPP_PERSONAL_AUTH_ROOT` (default: `<gateway-cwd>/memory/whatsapp-personal`)
  - `GATEWAY_WHATSAPP_PERSONAL_PEER_CANDIDATE_LIMIT` (default: `200`)
  - `GATEWAY_WHATSAPP_PERSONAL_RECONNECT_MAX_ATTEMPTS` (default: `5`)
  - `GATEWAY_WHATSAPP_PERSONAL_RECONNECT_BASE_DELAY_MS` (default: `1000`)
- Session lifecycle admin endpoints:
  - `POST /api/channel-admin/v1/whatsapp/personal/sessions`
  - `GET /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId/qr`
  - `GET /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId/status`
  - `GET /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId/peer-candidates?limit=50&includeGroups=true`
  - `DELETE /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId`

### WeChat Personal session mode (experimental)

- `GATEWAY_WECHAT_PERSONAL_ENABLED=true`
- Required:
  - `GATEWAY_WECHAT_PERSONAL_SIDECAR_SHARED_SECRET` (shared with sidecar callback signer)
- Optional:
  - `GATEWAY_WECHAT_PERSONAL_QR_TTL_SECONDS` (default: `120`)
  - `GATEWAY_WECHAT_PERSONAL_PEER_CANDIDATE_LIMIT` (default: `200`)
  - `GATEWAY_WECHAT_PERSONAL_SIDECAR_BASE_URL` (default: `http://localhost:8788`)
  - `GATEWAY_WECHAT_PERSONAL_STATE_ROOT` (default: `<gateway-cwd>/memory/wechat-personal`)
- Session lifecycle admin endpoints:
  - `POST /api/channel-admin/v1/wechat/personal/sessions`
  - `GET /api/channel-admin/v1/wechat/personal/sessions/:sessionId/qr`
  - `GET /api/channel-admin/v1/wechat/personal/sessions/:sessionId/status`
  - `GET /api/channel-admin/v1/wechat/personal/sessions/:sessionId/peer-candidates?limit=50&includeGroups=true`
  - `DELETE /api/channel-admin/v1/wechat/personal/sessions/:sessionId`

## Personal WhatsApp quick start

1. Build and start gateway with personal mode enabled:

```bash
pnpm build
GATEWAY_WHATSAPP_PERSONAL_ENABLED=true \
GATEWAY_WHATSAPP_PERSONAL_AUTH_ROOT=./memory/whatsapp-personal \
GATEWAY_PORT=8010 \
node dist/index.js
```

2. Create a personal session (returns `sessionId`, `accountLabel`, `status`):

```bash
curl -X POST http://localhost:8010/api/channel-admin/v1/whatsapp/personal/sessions \
  -H 'content-type: application/json' \
  -d '{"accountLabel":"home"}'
```

3. Get QR payload (replace `SESSION_ID`, response includes `code` and compatibility `qr`):

```bash
curl http://localhost:8010/api/channel-admin/v1/whatsapp/personal/sessions/SESSION_ID/qr
```

4. Poll status until it becomes `ACTIVE`:

```bash
curl http://localhost:8010/api/channel-admin/v1/whatsapp/personal/sessions/SESSION_ID/status
```

5. Stop session if needed:

```bash
curl -X DELETE http://localhost:8010/api/channel-admin/v1/whatsapp/personal/sessions/SESSION_ID
```

6. For UI-based setup, use `autobyteus-web`:
   - configure `MESSAGE_GATEWAY_BASE_URL` in `autobyteus-web/.env.local`
   - open `Settings -> External Messaging`
   - run gateway validation + personal session setup + binding setup + verification

7. Peer candidate discovery for binding setup:
   - send a WhatsApp message to the linked account from another contact/account
   - call:

```bash
curl \"http://localhost:8010/api/channel-admin/v1/whatsapp/personal/sessions/SESSION_ID/peer-candidates?limit=50&includeGroups=true\"
```

   - use returned `peerId` and optional `threadId` for channel binding

Notes:
- This personal mode is a real session-based integration, not a mock QR/session flow.
- The scanned WhatsApp account is persisted under `GATEWAY_WHATSAPP_PERSONAL_AUTH_ROOT`.
- Phase 1 supports one running personal session per gateway instance.
- If your package manager blocks dependency build scripts, run:
  - `pnpm approve-builds`

## Personal WeChat quick start (experimental)

1. Run a Wechaty-compatible sidecar exposing:
   - `POST /api/wechaty/v1/sessions/open`
   - `GET /api/wechaty/v1/sessions/:sessionId/qr`
   - `GET /api/wechaty/v1/sessions/:sessionId/status`
   - `GET /api/wechaty/v1/sessions/:sessionId/peer-candidates`
   - `POST /api/wechaty/v1/sessions/:sessionId/messages`
   - `DELETE /api/wechaty/v1/sessions/:sessionId`
   - push inbound events to gateway `POST /api/wechat-sidecar/v1/events`
     with:
     - `x-autobyteus-sidecar-signature: <hmac-sha256(timestamp.rawBody)>`
     - `x-autobyteus-sidecar-timestamp: <unix-seconds>`
   - reference implementation in this repo:
     - `tools/wechaty-sidecar/README.md`
     - quick start:
       - `cd tools/wechaty-sidecar`
       - `pnpm run setup`
       - `pnpm run preflight`
       - `pnpm run start`

2. Start gateway with WeChat personal enabled:

```bash
pnpm build
GATEWAY_WECHAT_PERSONAL_ENABLED=true \
GATEWAY_WECHAT_PERSONAL_SIDECAR_BASE_URL=http://localhost:8788 \
GATEWAY_WECHAT_PERSONAL_SIDECAR_SHARED_SECRET=<shared-secret> \
GATEWAY_WECHAT_PERSONAL_STATE_ROOT=./memory/wechat-personal \
GATEWAY_PORT=8010 \
node dist/index.js
```

3. Create a personal WeChat session:

```bash
curl -X POST http://localhost:8010/api/channel-admin/v1/wechat/personal/sessions \
  -H 'content-type: application/json' \
  -d '{"accountLabel":"home-wechat"}'
```

4. Poll status until `ACTIVE`:

```bash
curl http://localhost:8010/api/channel-admin/v1/wechat/personal/sessions/SESSION_ID/status
```

5. Discover peer candidates after an inbound message:

```bash
curl "http://localhost:8010/api/channel-admin/v1/wechat/personal/sessions/SESSION_ID/peer-candidates?limit=50&includeGroups=true"
```

## Start

```bash
pnpm build
node dist/index.js
```

## Discord quick start

1. Start gateway with Discord enabled:

```bash
pnpm build
GATEWAY_DISCORD_ENABLED=true \
GATEWAY_DISCORD_BOT_TOKEN=<your-discord-bot-token> \
GATEWAY_DISCORD_ACCOUNT_ID=discord-acct-1 \
GATEWAY_PORT=8010 \
node dist/index.js
```

2. Verify gateway capabilities include Discord:

```bash
curl http://localhost:8010/api/channel-admin/v1/capabilities
```

3. Discover Discord peer candidates after at least one inbound message to the bot:

```bash
curl "http://localhost:8010/api/channel-admin/v1/discord/peer-candidates?limit=50&includeGroups=true"
```

4. Configure channel binding in `autobyteus-server-ts` / web UI using:
   - `provider=DISCORD`
   - `transport=BUSINESS_API`
   - `accountId=<must match GATEWAY_DISCORD_ACCOUNT_ID>`
   - choose `peerId`/`threadId` from discovery response (recommended), or enter manually with format:
     - `user:<snowflake>` for DM
     - `channel:<snowflake>` for guild channel
   - optional `threadId=<snowflake>` only when `peerId=channel:<snowflake>`

5. Send inbound Discord message to the bot (DM or configured channel) and verify it routes through gateway -> server.

## Telegram quick start (polling mode)

1. Start gateway with Telegram polling enabled:

```bash
pnpm build
GATEWAY_TELEGRAM_ENABLED=true \
GATEWAY_TELEGRAM_BOT_TOKEN=<your-telegram-bot-token> \
GATEWAY_TELEGRAM_ACCOUNT_ID=telegram-acct-1 \
GATEWAY_TELEGRAM_POLLING_ENABLED=true \
GATEWAY_TELEGRAM_WEBHOOK_ENABLED=false \
GATEWAY_PORT=8010 \
node dist/index.js
```

2. Verify gateway capabilities include Telegram:

```bash
curl http://localhost:8010/api/channel-admin/v1/capabilities
```

3. Send a Telegram message to your bot, then query discovery candidates:

```bash
curl "http://localhost:8010/api/channel-admin/v1/telegram/peer-candidates?limit=50&includeGroups=true"
```

4. Use returned `peerId` and optional `threadId` in external-channel binding setup.

## Telegram quick start (webhook mode)

1. Start gateway with Telegram webhook mode:

```bash
pnpm build
GATEWAY_TELEGRAM_ENABLED=true \
GATEWAY_TELEGRAM_BOT_TOKEN=<your-telegram-bot-token> \
GATEWAY_TELEGRAM_ACCOUNT_ID=telegram-acct-1 \
GATEWAY_TELEGRAM_POLLING_ENABLED=false \
GATEWAY_TELEGRAM_WEBHOOK_ENABLED=true \
GATEWAY_TELEGRAM_WEBHOOK_SECRET_TOKEN=<your-webhook-secret-token> \
GATEWAY_PORT=8010 \
node dist/index.js
```

2. Configure Telegram webhook URL to your public gateway endpoint:

```text
https://<your-host>/webhooks/telegram
```

3. Configure the same secret token in Telegram webhook settings so gateway can verify
`x-telegram-bot-api-secret-token`.
