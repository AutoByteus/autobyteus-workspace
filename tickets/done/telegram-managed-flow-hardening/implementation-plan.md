# Implementation Plan

## Slice 1: Managed Telegram Polling-Only Product Path

- Remove managed webhook controls from the Telegram UI.
- Add polling-only explanatory copy.
- Normalize managed Telegram config on the server side so webhook flags are not active in managed mode.

## Slice 2: Provider Scope Synchronization

- Add a synchronization path from managed gateway status into provider scope state.
- Ensure Telegram binding/account hints update immediately after provider config save.

## Slice 3: Inferred Provider Activation

- Remove the extra per-provider enable toggle from the managed UI for non-WeChat providers.
- Default non-WeChat provider flags to enabled internally.
- Normalize persisted non-WeChat provider flags into the inferred-enable model on the server.
- Ensure configured providers restore active automatically after managed gateway restart.

## Slice 4: Verification Hardening

- Extend verification model with a provider-readiness check.
- Make Telegram readiness failures actionable.

## Slice 5: Reliability Visibility

- Preserve current reliability machinery.
- Surface compact reliability information where low-risk and update docs if needed.

## Slice 6: Test And Validation

- Fix stale gateway Telegram-focused tests.
- Add focused coverage for inferred provider activation and restart restoration behavior.
- Rerun focused gateway, server, and web Telegram slices.
- Keep any remaining real-bot gap explicit in handoff notes.

## Slice 7: Managed Outbound Callback Recovery

- Remove the managed-flow dependency on a manually configured `CHANNEL_CALLBACK_BASE_URL` for outbound assistant replies.
- Resolve the gateway callback destination lazily from the running managed gateway runtime when no explicit callback override is configured.
- Keep the explicit callback env path for operator-managed external gateway deployments.
- Re-run focused server validation and a managed Telegram reply smoke check after the fallback is implemented.
