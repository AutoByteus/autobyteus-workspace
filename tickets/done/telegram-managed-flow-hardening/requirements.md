# Requirements

## Status

- Current Status: `Design-ready`
- Previous Status: `Draft`

## Goal / Problem Statement

The managed Telegram setup path is close, but not yet at the product bar required for user testing.

The target experience is:

- the user creates or already has a Telegram bot in BotFather
- the user comes back to AutoByteus
- the user enables messaging, configures Telegram, binds the peer, and verifies setup from the app
- the managed node/server handles install, runtime lifecycle, and message delivery reliably

This round hardens the managed Telegram path across:

- `autobyteus-message-gateway`
- `autobyteus-server-ts`
- `autobyteus-web`

It also reviews and tightens the runtime-delivery/reliability story so the system can explain and defend how inbound/outbound messages are delivered and how failures are surfaced.

This re-entry also fixes a managed-provider lifecycle mismatch discovered during live Telegram testing:

- users should not need an extra per-provider enable click after entering valid provider configuration
- supported managed providers other than `WECHAT` should remain available by default
- once a provider has valid saved configuration, it should come back active automatically whenever the managed gateway restarts

## Scope Classification

- Classification: `Medium`
- Rationale:
  - The issue is cross-layer across gateway runtime, server-managed orchestration, and frontend UX.
  - Some problems may be local fixes, but at least one discovered gap affects architecture assumptions for Telegram webhook mode and delivery verification.

## In-Scope Use Cases

- `UC-000`: Re-investigate the managed Telegram setup path and delivery guarantees from gateway to server to frontend.
- `UC-001`: Polling-mode Telegram can be configured from the app after BotFather setup and completed end to end without manual gateway administration.
- `UC-002`: After saving Telegram provider config, channel binding automatically reuses the configured Telegram account scope instead of requiring confusing manual refresh/re-entry.
- `UC-003`: The UI and verification flow make it obvious whether the managed gateway is running and whether Telegram setup is actually ready.
- `UC-004`: Delivery/reliability mechanisms for inbound and outbound messaging are explicitly analyzed and, where needed, strengthened or surfaced in the product.
- `UC-005`: The product either supports managed Telegram webhook mode correctly or clearly constrains/disables it instead of presenting a broken option.
- `UC-006`: Focused automated coverage exists for the hardened Telegram setup and delivery path.
- `UC-007`: The managed polling-mode path remains node-owned and works the same way for Electron-hosted local nodes and remote nodes.
- `UC-008`: Managed providers other than `WECHAT` do not require a second enable toggle beyond saving valid configuration.
- `UC-009`: After gateway restart/app restart, previously configured managed providers become active again automatically without extra user action.

## Out Of Scope / Non-Goals

- No WeChat expansion in this round.
- No broad redesign of non-Telegram providers unless required by shared runtime hardening.
- No claim of live third-party proof without running a real credentialed Telegram test.

## Acceptance Criteria

1. Managed Telegram polling mode is complete enough that a user can create a bot in BotFather, then finish the remaining setup from AutoByteus.
2. The frontend/provider/binding flow no longer leaves the user guessing about the Telegram account scope or runtime readiness.
3. Managed Telegram webhook mode is not exposed as a normal product path unless the managed server truly owns a public ingress/proxy for it.
4. After provider config save, the Telegram account scope used by binding and verification reflects the saved configuration without requiring a full page bootstrap.
5. Verification checks provider readiness in addition to generic gateway/binding/runtime checks.
6. Delivery/reliability behavior is documented and backed by code evidence, including how inbound messages are accepted, queued, forwarded, retried, or surfaced as failures.
7. Focused server/web/gateway validation for the Telegram path is passing after the hardening work.
8. Remaining residual risk is explicitly documented if live real-bot proof is still missing.
9. The managed UI no longer requires a separate per-provider enable checkbox for WhatsApp, WeCom, Discord, or Telegram.
10. Existing saved provider configs that were blocked only by `...Enabled=false` recover into the new inferred-enable behavior on next load/save/restart.

## Constraints / Dependencies

- Continue in the existing worktree:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution`
- Respect unrelated uncommitted changes already present in the worktree.
- Do not weaken the managed node-owned messaging boundary.
- Prefer solving Telegram UX gaps without introducing Electron-only behavior.

## Assumptions

- Polling mode is the intended default for managed Telegram.
- The highest-value product path is local/Electron or managed-node polling mode, not public webhook exposure.
- Delivery reliability likely depends on the gateway queue/runtime-reliability layer rather than a simple heartbeat alone.
- It is acceptable for direct gateway/operator docs to keep webhook instructions, as long as the managed product path is polling-first and unambiguous.
- The managed product does not need an explicit per-provider disable control in this round; clearing required config is sufficient to make a provider inactive.

## Open Questions / Risks

1. Should managed Telegram webhook mode be hidden completely or shown as an advanced not-supported-yet path?
2. Is current runtime reliability sufficient for product confidence, or only for diagnostics until more of it is surfaced in the UI?
3. Are stale gateway Telegram tests purely maintenance debt, or do they reveal product regressions that must be closed in this round?

## Requirement IDs

- `R-000`: Re-audit the managed Telegram runtime/control-plane UX and reliability path before implementation continues.
- `R-001`: Managed Telegram polling setup is usable as an app-driven flow after BotFather setup.
- `R-002`: Telegram binding/account-scope ergonomics are consistent across provider config, peer discovery, and binding.
- `R-003`: Managed Telegram webhook mode is either correctly supported or explicitly constrained out of the normal product path.
- `R-004`: Delivery/reliability guarantees and limitations are explicit in code and documentation.
- `R-005`: Focused automated validation passes for the hardened path.
- `R-006`: Verification reflects provider-specific readiness rather than only generic gateway/binding scaffolding.
- `R-007`: Non-WeChat managed providers become active based on valid saved configuration rather than a second provider-specific enable flag.
- `R-008`: Managed provider activation persists across managed gateway restart and application restart without extra per-provider interaction.
