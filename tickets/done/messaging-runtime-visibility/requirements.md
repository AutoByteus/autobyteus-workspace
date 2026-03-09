# Requirements

- Ticket: `messaging-runtime-visibility`
- Status: `Design-ready`
- Last Updated: `2026-03-09`

## User Intent

The messaging integrations should be able to start agents with the same runtime coverage expected in the main product, specifically including Codex runtime and cloud agent SDK runtime where technically supported.

The frontend should also be able to show agent runs that are started from messaging channels such as Telegram instead of treating them as background-only work that is invisible in the Electron/web UI.

When a messaging-originated user message is delivered to a run that is already open in the Electron/web frontend, that user turn should also appear in the frontend conversation without waiting for the user to reopen the run from persisted history.

When messaging setup or managed gateway lifecycle problems happen, the user should get an actionable recovery path inside the product instead of a silent save failure or a generic blocked badge.

## Working Questions

1. Which runtimes are currently supported by the messaging entrypoints, especially Telegram?
2. Does the messaging stack already support Codex runtime, cloud agent SDK runtime, only the in-house runtime, or some subset?
3. Why are runs started from messaging not visible in the frontend agent/run views?
4. What architecture or product changes are required to make messaging-started runs visible in the UI?
5. Can messaging-originated user turns be pushed into an already-open frontend conversation in real time?

## Refined Requirements

1. Managed messaging bindings must continue to accept runtime-generic launch presets instead of forcing the in-house runtime.
2. Messaging-created agent runs must persist the same run-history primitives as the frontend create flow:
   - run manifest
   - run-history index row
3. Persisted history for messaging-created runs must preserve the selected runtime kind and runtime reference so active Codex and Claude Agent SDK runs can be reopened from the UI.
4. The frontend workspace history UI must refresh often enough to discover background-created runs without requiring a full page reload.
5. The fix must preserve the current messaging target model (`AGENT` bindings only) and must not introduce team-runtime coupling in this round.
6. If a messaging-originated user turn is accepted for a run that currently has an open frontend agent stream subscription, the frontend must receive a pushed event and render that user turn in the conversation immediately.
7. The live user-turn event path must be provider-agnostic and runtime-agnostic:
   - not Telegram-specific,
   - not Codex-specific,
   - not Claude-specific,
   - not dependent on raw runtime user-message events.
8. Persisted run history and run projection remain the source of truth for discovery and reopen; live push augments the already-open conversation view and must not replace history/projection hydration.
9. Managed gateway lifecycle must reconcile a still-healthy runtime after app/server restart instead of blindly attempting a second conflicting start.
10. If the managed gateway can be reached through its persisted bind host/port and admin token, disable/update/restart flows must still be able to stop and restart it cleanly even when the current server process did not spawn it.
11. Gateway status UI must expose actionable recovery semantics:
   - show the specific failure detail,
   - show provider-level blocked reasons when available,
   - offer a recovery-oriented primary action when lifecycle state is blocked.
12. Binding setup must never fail silently when peer discovery state is stale or unavailable.
13. When manual peer entry is supported, the binding flow must offer a clear recovery path back to manual input instead of trapping the user in a stale dropdown state.
14. Messaging reply routing must continue to work when the bound runtime is `codex_app_server` or `claude_agent_sdk`, not only for the in-house `autobyteus` runtime.
15. External-channel turn-to-receipt binding and outbound reply callback publication must not depend exclusively on the in-house agent processor chain.
16. Outbound reply callback publishing for `codex_app_server` and `claude_agent_sdk` must resolve callback configuration when the assistant reply is ready, not only once during server-start singleton construction.

## Constraints

1. The current `personal` checkout has uncommitted changes and must remain untouched.
2. Investigation and any implementation should happen on a dedicated worktree branched from the latest `origin/personal`.

## Acceptance Criteria

1. Investigation artifacts document that messaging bindings are runtime-generic and can launch `codex_app_server` or `claude_agent_sdk` when those runtimes are enabled on the selected node.
2. A messaging-created agent run persists `run_manifest.json` and a run-history row before or during first dispatch so `listRunHistory` can discover it.
3. The persisted manifest for a messaging-created run records:
   - `agentDefinitionId`
   - `workspaceRootPath`
   - `llmModelIdentifier`
   - `runtimeKind`
   - `runtimeReference`
4. The frontend workspace history surface refreshes background run history automatically while mounted.
5. Focused automated coverage exists for the new backend persistence path and the frontend auto-refresh behavior.
6. When a run is already open in the frontend and a new external message is accepted for that run, the frontend conversation appends a user message within the live stream path without requiring manual reopen.
7. Focused automated coverage exists for the new backend live-publish path and the frontend live user-message handler.
8. After app/server restart or service reset, a healthy managed gateway already running on the persisted preferred port is reported as running instead of remaining stuck in `BLOCKED`.
9. Managed gateway disable/update/restart can stop a reachable adopted runtime and return it to a clean running state.
10. The managed gateway card shows actionable recovery details for blocked lifecycle states instead of only the generic blocked badge/message.
11. Binding setup surfaces stale peer-selection failures and offers a manual recovery path when peer discovery is unavailable.
12. Focused automated coverage exists for the managed-gateway recovery/adoption path and the frontend recovery UX states.
13. When a messaging binding uses `codex_app_server` or `claude_agent_sdk`, the accepted external turn is bound to a `turnId` and the assistant reply is published back through the provider callback path.
14. Focused automated coverage exists for the runtime-generic external turn binding and outbound reply callback path on external runtimes.
15. When the managed gateway is enabled after server startup, `codex_app_server` and `claude_agent_sdk` still resolve a callback publisher at reply-publication time and do not skip with `CALLBACK_NOT_CONFIGURED`.

## Explicit Findings

1. Telegram is not hard-wired to the in-house runtime; it flows through the same `binding.launchPreset.runtimeKind` path as other providers.
2. The current product-wide messaging binding target model is `AGENT` only.
3. The main defect is visibility: messaging launch bypasses run-history persistence, and the frontend tree does not perform background refreshes after mount.
4. The current single-agent websocket protocol has no server-to-client user-message event, so an already-open chat cannot currently mirror messaging-originated user turns live.
5. Raw runtime user-message items are explicitly suppressed in the method-runtime event adapter, so the live frontend mirror must originate from the external-channel ingress/dispatch path instead of relying on runtime raw events.
6. `ExternalChannelTurnReceiptBindingProcessor` and `ExternalChannelAssistantReplyProcessor` currently run only in the `autobyteus` processor chain; `codex_app_server` and `claude_agent_sdk` bypass that path via `RuntimeCommandIngressService`.
7. `getDefaultChannelIngressRouteDependencies()` constructs the runtime-native external turn bridge during server startup, and before this fix the bridge cached one `ReplyCallbackService` too early while the in-house runtime created that service later per response.
