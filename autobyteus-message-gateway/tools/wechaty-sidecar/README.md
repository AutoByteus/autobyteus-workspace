# Wechaty Sidecar (AutoByteus Gateway Contract)

This is a reference sidecar service that satisfies the gateway's WeChat personal contract.

A "Wechaty-compatible sidecar" in this project means an HTTP service that exposes:

- `POST /api/wechaty/v1/sessions/open`
- `GET /api/wechaty/v1/sessions/:sessionId/status`
- `GET /api/wechaty/v1/sessions/:sessionId/qr`
- `GET /api/wechaty/v1/sessions/:sessionId/peer-candidates`
- `POST /api/wechaty/v1/sessions/:sessionId/messages`
- `DELETE /api/wechaty/v1/sessions/:sessionId`

And pushes inbound events to gateway:

- `POST <gateway>/api/wechat-sidecar/v1/events`
- headers:
  - `x-autobyteus-sidecar-timestamp`
  - `x-autobyteus-sidecar-signature` where `signature = HMAC_SHA256(secret, "${timestamp}.${rawBody}")`

## 1) Setup

```bash
cd /Users/normy/autobyteus_org/autobyteus-message-gateway/tools/wechaty-sidecar
pnpm run setup
```

This will:

- create `.env` from `env.example` if missing
- generate a random `SIDECAR_SHARED_SECRET` if placeholder is still present
- install dependencies

## 2) Configure `.env`

Required keys:

- `GATEWAY_BASE_URL` (example: `http://localhost:8010`)
- `SIDECAR_SHARED_SECRET` (must equal gateway `GATEWAY_WECHAT_PERSONAL_SIDECAR_SHARED_SECRET`)
- `WECHATY_PUPPET`

If using `wechaty-puppet-service`, set token:

- `WECHATY_PUPPET_SERVICE_TOKEN=<token>`

## 3) Preflight

```bash
pnpm run preflight
```

## 4) Start sidecar

```bash
pnpm run start
```

Sidecar health:

```bash
curl http://localhost:8788/health
```

## 5) Start gateway with matching env

In `/Users/normy/autobyteus_org/autobyteus-message-gateway`:

```bash
pnpm build
GATEWAY_WECHAT_PERSONAL_ENABLED=true \
GATEWAY_WECHAT_PERSONAL_SIDECAR_BASE_URL=http://localhost:8788 \
GATEWAY_WECHAT_PERSONAL_SIDECAR_SHARED_SECRET=<same SIDECAR_SHARED_SECRET> \
GATEWAY_PORT=8010 \
node dist/index.js
```

Optional gateway callback probe (before real WeChat login):

```bash
cd /Users/normy/autobyteus_org/autobyteus-message-gateway/tools/wechaty-sidecar
pnpm run probe:gateway
```

## 6) Create WeChat personal session from gateway

```bash
curl -X POST http://localhost:8010/api/channel-admin/v1/wechat/personal/sessions \
  -H 'content-type: application/json' \
  -d '{"accountLabel":"wechat-home"}'
```

Then fetch QR/status:

```bash
curl http://localhost:8010/api/channel-admin/v1/wechat/personal/sessions/<SESSION_ID>/qr
curl http://localhost:8010/api/channel-admin/v1/wechat/personal/sessions/<SESSION_ID>/status
```

After login is successful, discover peers:

```bash
curl "http://localhost:8010/api/channel-admin/v1/wechat/personal/sessions/<SESSION_ID>/peer-candidates?limit=50&includeGroups=true"
```

## Provider Notes

- `WECHATY_PUPPET=wechaty-puppet-service`:
  - easiest cross-platform startup
  - usually requires token/service dependency
- `WECHATY_PUPPET=wechaty-puppet-xp`:
  - typically Windows-only runtime and pinned WeChat desktop compatibility
  - commonly used for local/PoC flows

If switching provider, install the puppet package in this sidecar folder and update `WECHATY_PUPPET`.

Examples:

```bash
pnpm add wechaty-puppet-xp
# or
pnpm add wechaty-puppet-padlocal
```

## Current Limitations

- Text messages are forwarded/sent; non-text payloads are skipped.
- This sidecar keeps session state in-memory; persistence is delegated to the puppet backend behavior.
- Real end-to-end verification still requires manual QR login and a live WeChat account.
