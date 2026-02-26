# OpenClaw WeChat Investigation (As Of 2026-02-09)

## Scope
Investigate how OpenClaw/OpenClaw-China integrates WeChat-related messaging, especially personal-user entry and any RPA-style approach.

## Sources
- OpenClaw WhatsApp channel docs (Baileys/web-session model):
  - https://github.com/openclaw/openclaw/blob/main/docs/channels/whatsapp.md
- OpenClaw channels index (no first-party WeChat channel in core list):
  - https://github.com/openclaw/openclaw/blob/main/docs/channels/index.md
- OpenClaw-China repository README (WeCom + WeCom-App features):
  - https://github.com/BytePioneer-AI/openclaw-china/blob/main/README.md
- OpenClaw-China WeCom App guide:
  - https://github.com/BytePioneer-AI/openclaw-china/blob/main/doc/guides/wecom-app/configuration.md
- OpenClaw-China WeCom App plugin implementation:
  - https://github.com/BytePioneer-AI/openclaw-china/tree/main/extensions/wecom-app
- WeCom developer docs landing (official enterprise API family):
  - https://developer.work.weixin.qq.com/document/
- WeChaty project (common personal-WeChat automation stack via puppet providers):
  - https://github.com/wechaty/wechaty
- WeChatFerry repo status (illustrative ecosystem instability):
  - https://github.com/lich0821/WeChatFerry

## Findings

1. OpenClaw core does not currently expose a first-party `wechat` channel in the same way as WhatsApp/Telegram.
- Inference from OpenClaw docs: WeChat integration is not a default core-channel path in `openclaw`.

2. OpenClaw-China integrates WeChat usage through WeCom plugins, not direct personal-account API in core.
- `wecom` (enterprise robot) and `wecom-app` (enterprise self-built app) are the primary channel plugins.
- `wecom-app` supports active sending and webhook callback handling.

3. OpenClaw-China provides a personal-WeChat entry route via WeCom "WeChat plugin" onboarding.
- Guide includes: personal WeChat scans an "invite/follow" QR from WeCom admin plugin section.
- This means "personal WeChat" access is mediated by enterprise WeCom app infrastructure.

4. Practical architecture in OpenClaw-China is API/webhook-first (enterprise APIs), not browser-RPA-first.
- The `wecom-app` flow requires token, AES key, corp id/secret, agent id, and webhook path.
- This is operationally closer to official callback/API integration than to local UI automation.

5. Personal-WeChat RPA ecosystem exists externally (e.g., Wechaty puppet providers), but is variable and often less stable.
- Wechaty supports multiple puppet providers/protocol backends; behavior depends heavily on selected puppet.
- Tooling/lifecycle instability risk exists in this space (example: WeChatFerry public repo states maintenance stopped).

## Implications For AutoByteus

1. There are two viable routes for "personal WeChat" product goals:
- Route A (recommended baseline): `WECOM_APP_BRIDGE` using enterprise WeCom app + personal WeChat entry.
- Route B (optional experimental): direct personal WeChat `PERSONAL_SESSION` via RPA adapter backend.

2. Route A is more suitable for production-compliant deployments.
- Clear webhook + signature + official API callback model.
- Better operational predictability and lower anti-automation risk.

3. Route B can improve local/home user onboarding but should be explicitly marked experimental.
- Requires stronger reconnect/session resilience and kill-switch controls.
- Requires risk gating and operator acknowledgement in setup UX.

## Decision For This Ticket
Design for both routes under one AutoByteus abstraction:
- Primary: `WECOM` + `BUSINESS_API` with app-account profile support (`mode=APP`).
- Optional extension: new provider `WECHAT` + `PERSONAL_SESSION` behind experimental feature flag.

This preserves separation of concerns:
- Server and web remain transport-agnostic.
- Gateway owns all provider protocol details.
- Shared types define canonical provider/transport contracts.
