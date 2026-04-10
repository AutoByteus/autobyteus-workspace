# Implementation

## Scope Classification

- Classification: `Large`
- Reasoning: the redesign changes durable receipt shape, workflow ownership, ingress handoff, turn binding, long-lived observation, degraded recovery, and the regression harness across direct and team dispatch paths.

## Upstream Artifacts

- Workflow state: `tickets/in-progress/external-channel-receipt-state-machine/workflow-state.md`
- Investigation notes: `tickets/in-progress/external-channel-receipt-state-machine/investigation-notes.md`
- Requirements: `tickets/in-progress/external-channel-receipt-state-machine/requirements.md`
- Proposed design: `tickets/in-progress/external-channel-receipt-state-machine/proposed-design.md`
- Future-state runtime call stack: `tickets/in-progress/external-channel-receipt-state-machine/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/external-channel-receipt-state-machine/future-state-runtime-call-stack-review.md`

## Document Status

- Current Status: `Stage 6 Complete`
- Notes: the final implementation moved beyond the earlier `v5` no-fallback design and closed the last same-run concurrency hole. The accepted workflow now starts only with an authoritative `turnId`, delayed turn capture stays at the external-channel facade boundary, and same-run dispatches are serialized there so one dispatch-scoped listener cannot steal another dispatch's `TURN_STARTED`.

## Stage 6 Round Goal

Complete the final authoritative binding implementation:

- preserve generic runtime/core turn events
- preserve generic shared run APIs
- keep immediate `turnId` threading when a runtime already knows it during dispatch
- bind delayed AutoByteus turns with a dispatch-scoped listener owned by the external-channel dispatch facades
- record accepted receipts only after an authoritative `turnId` exists
- remove chronology-based pending-turn assignment and the run-wide queued-signal registry
- keep only known-turn reply recovery after authoritative binding
- serialize same-run dispatch attempts at the facade boundary so delayed turn capture remains authoritative under concurrency

## Current Round Work Table

| Change ID | Owner | Intended Outcome | Status | Evidence |
| --- | --- | --- | --- | --- |
| `T-301` | authoritative dispatch contract | require an exact `turnId` before `recordAcceptedDispatch()` and remove nullable accepted-dispatch turn binding from the business path | Completed | `src/external-channel/runtime/channel-run-dispatch-result.ts`, `src/external-channel/services/channel-ingress-service.ts`, `src/external-channel/providers/file-channel-message-receipt-provider.ts` |
| `T-302` | dispatch capture cleanup | remove timeout/null capture behavior and make dispatch-scoped capture authoritative for AutoByteus direct/team facades | Completed | `src/external-channel/runtime/channel-dispatch-turn-capture.ts`, `src/external-channel/runtime/channel-agent-run-facade.ts`, `src/external-channel/runtime/channel-team-run-facade.ts` |
| `T-303` | receipt workflow simplification | remove `TURN_PENDING`, pending-turn matching, and the run-wide queued-signal observation registry from the accepted workflow | Completed | `src/external-channel/domain/models.ts`, `src/external-channel/runtime/receipt-workflow-runtime.ts`, `src/external-channel/runtime/receipt-effect-runner.ts`, `src/external-channel/runtime/receipt-workflow-persistence.ts` |
| `T-304` | provider/service cleanup | remove pending-dispatch lookup APIs and chronology-order helpers that only served the guessed live-path binding rule | Completed | `src/external-channel/providers/channel-message-receipt-provider.ts`, `src/external-channel/providers/file-channel-message-receipt-provider.ts`, `src/external-channel/providers/file-channel-message-receipt-row.ts`, `src/external-channel/services/channel-message-receipt-service.ts` |
| `T-305` | recovery narrowing | keep only known-turn reply recovery and remove chronology-based completed-turn lookup from the active workflow | Completed | `src/external-channel/services/channel-turn-reply-recovery-service.ts`, `src/external-channel/runtime/receipt-effect-runner.ts` |
| `T-306` | regression coverage | update tests to prove authoritative dispatch binding, no pending-turn fallback, known-turn recovery only, repeated distinct inbound messages on the same thread/run, and restore-after-termination on the next same-thread inbound message | Completed | `tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts`, `tests/unit/external-channel/runtime/channel-team-run-facade.test.ts`, `tests/unit/external-channel/runtime/receipt-workflow-runtime.test.ts`, `tests/unit/external-channel/services/channel-ingress-service.test.ts`, `tests/unit/external-channel/services/channel-message-receipt-service.test.ts`, `tests/unit/api/rest/channel-ingress.test.ts`, `tests/integration/api/rest/channel-ingress.integration.test.ts` |
| `T-307` | dispatch concurrency hardening | serialize same-run dispatches at the facade boundary so one delayed-turn listener cannot misbind another dispatch's `TURN_STARTED` | Completed | `src/external-channel/runtime/channel-dispatch-lock-registry.ts`, `src/external-channel/runtime/channel-agent-run-facade.ts`, `src/external-channel/runtime/channel-team-run-facade.ts`, `tests/unit/external-channel/runtime/channel-dispatch-lock-registry.test.ts` |

## Completed Change Inventory

- Added `ReceiptWorkflowRuntime` family and removed the old accepted-receipt runtime family in the retained earlier round.
- Added `channel-dispatch-turn-capture.ts` as the facade-owned one-shot listener helper for delayed turn binding.
- Added `channel-dispatch-lock-registry.ts` so same-run direct/team dispatches are serialized at the external-channel facade boundary.
- Updated `ChannelAgentRunFacade` and `ChannelTeamRunFacade` to:
  - resolve the target run first,
  - acquire a run-scoped exclusive dispatch slot,
  - start a short-lived dispatch capture listener before posting the external message,
  - persist exact `turnId` only when the dispatch path knows it immediately or when the one-shot listener captures it authoritatively.
- Restored shared server and runtime boundaries so the external-channel client concern no longer leaks into:
  - `autobyteus-ts` turn lifecycle events,
  - shared `AgentRunBackend` / `TeamRunBackend` dispatch method signatures.
- Preserved the generic `turnId` field on `AgentOperationResult` because it is runtime-domain data, not external-channel data.
- Removed the run-wide pending-turn owner and the old accepted-receipt runtime family, leaving `ReceiptWorkflowRuntime` as the sole durable workflow owner.
- Narrowed recovery to known-turn evidence only after authoritative binding.
- Extended the ingress integration harness so one backend instance can emit a distinct turn lifecycle per posted user message, proving that two separate inbound messages on the same thread reuse one bound run but still produce two distinct routed receipts and two final publishes.
- Made the fake agent backend lifecycle truthful for restore-path validation: `terminate()` now makes the fake run inactive, `restoreBackend()` reactivates the same persisted run id, and the ingress integration suite now proves the second same-thread inbound message restores a terminated run before dispatching a new turn.

## Previous Round Outcome Retained

The earlier Stage 6 rework remains valid and retained:

- receipt workflow ownership stays in `ReceiptWorkflowRuntime`
- legacy accepted-runtime files remain removed
- persistence still rejects runtime legacy fallback
- no chronology-based turn binding remains in either the active or degraded business path

## Current Status

- Source code changes for the current slice: `Complete`
- Stage 6 exit gate: `Pass`
- Stage 7 executable validation: `Pass`
- Stage 8 code review: `Pass`
- Next execution step: `Stage 9 docs sync`
