# Future-State Runtime Call Stack Review

## Round 1

- Result: `Pass with required updates`
- Finding 1:
  - The runtime-launch path fix alone is insufficient because persisted history would still remain stale in an already-mounted frontend until another user action occurs.
- Required update:
  - Add a bounded background refresh in the workspace history panel.

## Round 2

- Result: `Go Confirmed`
- Checks:
  1. Runtime selection remains binding-driven and runtime-generic.
  2. New messaging-created runs gain persisted history before the first UI discovery query.
  3. Frontend discovery path stays within the existing history-tree -> open-run hydration flow.
  4. No new provider-specific branching is introduced for Telegram, Codex, or Claude Agent SDK.

- Conclusion:
  - The planned implementation is small-scope, internally consistent, and ready for Stage 6 code edits.

## Round 3

- Result: `Pass with required updates`
- Re-entry Classification: `Requirement Gap`
- Finding 1:
  - The prior plan makes messaging-created runs discoverable and openable, but it still does not satisfy the newly explicit requirement that an already-open chat must mirror later messaging-originated user turns live.
- Finding 2:
  - Runtime raw user-message items are intentionally suppressed, so this cannot be solved by relying on existing runtime-event mapping alone.
- Required updates:
  - Extend requirements to include live mirrored external user turns for already-open runs.
  - Add a dedicated run-scoped websocket event path originating from the external-channel dispatch flow after successful `sendTurn(...)`.
  - Keep persisted history/projection as the reopen source of truth and treat websocket push as an augmentation for subscribed contexts only.

## Round 4

- Result: `Candidate Go`
- Checks:
  1. Discovery/reopen remains history/projection-based rather than runtime-memory discovery.
  2. Live user-turn mirroring is injected from the external-channel dispatch path after acceptance, not from suppressed runtime raw user-message events.
  3. The new event path is single-agent, run-scoped, provider-agnostic, and runtime-agnostic.
  4. No team-runtime coupling or provider-specific branching is introduced.
  5. The design preserves the existing keep-live-context behavior for already-subscribed active runs.

## Round 5

- Result: `Go Confirmed`
- Checks:
  1. The hybrid model is internally consistent: persisted history discovers runs; websocket events mirror live external turns for already-open runs.
  2. The new live path fits the existing typed websocket event architecture used by `INTER_AGENT_MESSAGE` and similar pushed notifications.
  3. Failure semantics stay clean: rejected external turns do not emit frontend user-turn events.
  4. Reopen semantics remain deterministic because projection/history is still authoritative.

- Conclusion:
  - The expanded scope remains small and is ready to resume Stage 6 implementation with code edits unlocked.

## Round 6

- Result: `Pass with required updates`
- Re-entry Classification: `Design Impact`
- Finding 1:
  - The current managed-gateway lifecycle treats restart-state loss as generic startup failure because it cannot reconcile an already-running reachable runtime after app/server restart.
- Finding 2:
  - The current binding flow still permits silent save failure because stale peer-selection errors are stored but not rendered, and the user is not given an in-flow recovery action.
- Required updates:
  - Extend the design basis to include managed-gateway runtime reconciliation and adopted-runtime shutdown support.
  - Extend the frontend UX scope to include actionable blocked-state messaging and manual peer-input fallback.

## Round 7

- Result: `Go Confirmed`
- Checks:
  1. Gateway recovery remains bounded to the existing managed-gateway/admin boundary and does not add provider-specific branching into the main messaging setup flow.
  2. Adopted-runtime reconciliation is scoped to the persisted host/port plus admin token for the same data root, avoiding broad process discovery.
  3. The frontend recovery UX stays compatible with the existing binding draft model and simply removes silent dead ends.
  4. The scope remains small enough to continue with focused backend/frontend tests and without a separate medium-scope design document.

- Conclusion:
  - The ticket can return to Stage 6 with code edits unlocked for the recovery UX and gateway reconciliation implementation.

## Round 8

- Result: `Pass with required updates`
- Re-entry Classification: `Design Impact`
- Finding 1:
  - The live frontend mirror path fixed UI visibility, but external runtimes still do not bind the accepted external turn to a receipt turn id because they bypass `ExternalChannelTurnReceiptBindingProcessor`.
- Finding 2:
  - External runtimes also bypass `ExternalChannelAssistantReplyProcessor`, so provider reply routing for `codex_app_server` / `claude_agent_sdk` cannot rely on the in-house `LLMCompleteResponseReceivedEventHandler`.
- Required updates:
  - Extend the design basis to move external turn receipt binding and outbound reply publication to a runtime-generic boundary.
  - Require external runtimes to surface accepted `turnId` values back through the runtime command result.
  - Add a runtime-native completion listener path for provider callback publication on Codex and Claude runtimes.

## Round 9

- Result: `Go Confirmed`
- Checks:
  1. The new design keeps provider reply routing tied to `(agentRunId, turnId)` instead of introducing provider-specific inference.
  2. The fix is runtime-generic for `codex_app_server` and `claude_agent_sdk` without disturbing the existing `autobyteus` processor path.
  3. Receipt binding happens immediately after accepted external-runtime ingress, so the later callback path has durable route context before the runtime completes.
  4. Runtime-native completion listeners stay bounded to the external turn and can be cleaned up after completion, avoiding a permanent global subscriber.

- Conclusion:
  - The ticket can return to Stage 6 with code edits unlocked for the runtime-generic external reply-routing fix.

## Round 10

- Result: `Pass with required updates`
- Re-entry Classification: `Design Impact`
- Finding 1:
  - The prior external-runtime callback fix assumes that callback publisher resolution can always infer a managed gateway endpoint from the in-memory process supervisor snapshot.
- Finding 2:
  - In the packaged-app recovery/adoption path, lifecycle/status can reconcile the gateway as `RUNNING` from persisted reachability while the in-memory supervisor snapshot still reports `running = false`, which leaves outbound callback publishing without a configured publisher.
- Required updates:
  - Extend the runtime model to include recovered/adopted managed-gateway callback resolution.
  - Ensure the callback publisher path uses the same reconciled runtime contract as managed-gateway recovery/status, not a narrower “current process spawned the child” signal.

## Round 11

- Result: `Go Confirmed`
- Checks:
  1. The new scope is still provider-agnostic and runtime-agnostic on the reply-routing side; it only corrects how the managed gateway endpoint is resolved.
  2. The proposed fix unifies lifecycle recovery and callback publishing around one reachability contract instead of introducing a second stale-state cache.
  3. The bounded change remains small-scope and does not require a new medium-scope design document.
  4. The design preserves the earlier turn-binding and runtime-native completion bridge work; it only removes the remaining `CALLBACK_NOT_CONFIGURED` gap for recovered runtimes.

- Conclusion:
  - The ticket can return to Stage 6 with code edits unlocked for the recovered-runtime callback-publisher fix.
