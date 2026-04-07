# Future-State Runtime Call Stack Review

## Round 1

- Result: `Candidate Go`
- Coverage:
  - normalized `TURN_STARTED` / `TURN_COMPLETED` contract
  - Claude and Codex dual emission (`TURN_*` + `AGENT_STATUS`)
  - native AutoByteus turn lifecycle emission
  - websocket exposure of explicit turn lifecycle
  - Telegram reply publication on `TURN_COMPLETED(turnId)`
- Blocking findings: none
- Required artifact updates:
  - clarify the AutoByteus native turn completion boundary as the dispatched `AgentIdleEvent(turnId)` after the final LLM leg with no remaining tool work
- New use cases discovered:
  - web clients should accept `TURN_*` without protocol-mismatch warnings even if they do not yet fully depend on them

## Round 2

- Result: `Go Confirmed`
- Coverage re-check:
  - turn start boundary is native turn creation, not synthetic server inference
  - turn completion boundary is native runtime idle for that specific turn, not generic websocket idle inference
  - Telegram bridges can now prefer explicit turn completion while keeping safe compatibility fallback
- Blocking findings: none
- Required artifact updates: none
- New use cases discovered: none

## Round 3

- Result: `Go Confirmed`
- Coverage re-check:
  - reply publication must use only exact persisted `turnId` / `memberRunId` correlation plus `TURN_COMPLETED(turnId)`
  - direct and team bridges must ignore turnless `ASSISTANT_COMPLETE` and `AGENT_STATUS(IDLE)` for reply routing
  - AutoByteus turn allocation and completion cleanup must flow through one shared lifecycle owner so no secondary allocation path can skip `TURN_STARTED`
- Blocking findings: none
- Required artifact updates:
  - refresh requirements and implementation artifacts to remove compatibility fallback language and call out strict correlation ownership
- New use cases discovered:
  - accepted team receipts should never rely on anonymous pending-turn matching when dispatch already knows the target member run and turn

## Round 4

- Result: `Go Confirmed`
- Coverage re-check:
  - AutoByteus direct/team dispatch should stay enqueue-oriented rather than becoming acknowledgement APIs
  - accepted receipts should persist first and bind exact `turnId` later from runtime `TURN_STARTED(turnId)` events
  - late correlation must be deterministic so a single `TURN_STARTED` event binds only the oldest unmatched accepted receipt for the matching run/member
  - the post-LLM turn-finalization rule should remain behaviorally the same, but it should become a named runtime-owned helper instead of inline dispatcher-local coupling
  - downstream strict reply-routing stays unchanged and consumes the now-authoritative persisted correlation after `TURN_STARTED`
- Blocking findings: none
- Required artifact updates:
  - refresh investigation, requirements, and implementation artifacts for event-driven late correlation on `TURN_STARTED` and explicit turn-finalization ownership
- New use cases discovered:
  - focused regression coverage should prove deterministic oldest-receipt binding on both direct and team AutoByteus paths

## Round 5

- Result: `Go Confirmed`
- Coverage re-check:
  - the native first user-message continuation must be exact-turn-scoped, not inferred later from mutable `activeTurn`
  - new external-input events must remain queued while the current turn is still active or awaiting tool approval
  - the downstream late-correlation and strict `TURN_COMPLETED` reply-publication shape stays unchanged
  - oversized changed source owners should be decomposed as part of the same corrective pass
- Blocking findings: none
- Required artifact updates:
  - refresh implementation and future-state runtime call stack artifacts for turn-scoped `LLMUserMessageReadyEvent` handoff and active-turn input gating
- New use cases discovered:
  - focused regression coverage should enqueue two real user messages before the first internal continuation runs and prove exact turn ownership is preserved

## Round 6

- Result: `Candidate Go`
- Coverage re-check:
  - fresh accepted direct/team dispatch must pre-arm turn observation before enqueue so the first native `TURN_STARTED` cannot be missed by a later recovery timer
  - the short-lived dispatch-scoped capture path keeps enqueue-oriented command semantics while avoiding synchronous `turnId` return contracts
  - the accepted receipt may persist with exact `turnId` immediately when capture wins the race, or later by the same capture session after accepted receipt persistence
  - `AcceptedReceiptRecoveryRuntime` remains the restore/retry/backfill owner and is no longer treated as the only initial observer for freshly accepted dispatches
  - strict reply publication remains unchanged and still depends only on exact persisted correlation plus `TURN_COMPLETED(turnId)`
  - Stage 7 now explicitly requires a native-timing regression with immediate `TURN_STARTED`
- Blocking findings: none
- Required artifact updates: none
- New use cases discovered: none

## Round 7

- Result: `Go Confirmed`
- Coverage re-check:
  - direct capture cleanup on dispatch rejection does not persist false correlation
  - delayed first-turn start still converges into the same accepted-receipt correlation update path as immediate first-turn start
  - the team path preserves exact `memberRunId` authority while using the same pre-armed capture principle
  - restore-time accepted-receipt recovery remains a fallback safety net instead of a timing-critical first-dispatch observer
  - no stale design artifact still assumes that `registerAcceptedReceipt(..., 0)` is sufficient to catch the first bound native turn
- Blocking findings: none
- Required artifact updates: none
- New use cases discovered: none

## Round 8

- Result: `Candidate Go`
- Coverage re-check:
  - `AcceptedReceiptRecoveryRuntime` remains the only public boundary ingress uses for dispatch-scoped capture lifecycle
  - the former oversized correlation owner is split into:
    - a dispatch-capture owner for fresh accepted dispatches
    - a persistent unmatched-receipt observer owner for restore/retry correlation
  - the fresh-capture split does not change the functional race fix: subscribe-before-enqueue still catches the first native `TURN_STARTED`
  - restore/retry unmatched-receipt observation remains available after accepted receipt persistence
  - no future-state path still requires ingress to import an internal registry/coordinator type
- Blocking findings: none
- Required artifact updates:
  - refresh design basis and future-state call stack to show the recovery-runtime public capture contract and the two internal owners explicitly
- New use cases discovered: none

## Round 9

- Result: `Go Confirmed`
- Coverage re-check:
  - the future-state split remains below the prior oversized-owner shape and keeps the same event-driven behavior
  - the recovery runtime remains authoritative for both fresh dispatch capture preparation and restore/retry scheduling
  - direct and team paths still converge into the same strict exact-correlation reply-publication authority after accepted receipt persistence
  - no stale future-state path still assumes ingress talks to an internal correlation mechanism directly
- Blocking findings: none
- Required artifact updates: none
- New use cases discovered: none
