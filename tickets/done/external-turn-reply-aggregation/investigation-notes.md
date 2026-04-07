# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Triage Rationale: The bug spans runtime recovery, reply aggregation, outbox deduplication, and test expectations across `autobyteus-server-ts`, but it remains localized to the external-channel reply path and does not require a cross-repo protocol redesign.
- Investigation Goal: Determine why external channels receive only the first assistant leg of a same-turn tool-using reply and identify the owning fix path for one-publish-per-turn accumulated delivery.
- Primary Questions To Resolve:
  - Why does the accepted external-channel receipt publish before full-turn completion?
  - Why is the later same-turn continuation not delivered after the first publish?
  - Which tests currently encode the incorrect behavior?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-07 | Command | `git status --short --branch` | Confirm repo cleanliness before workflow bootstrap | Main repo worktree was clean on `personal` | No |
| 2026-04-07 | Command | `git symbolic-ref refs/remotes/origin/HEAD` | Resolve default remote base branch for Stage 0 | Remote default branch resolved to `origin/personal` | No |
| 2026-04-07 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating ticket branch/worktree | Fetch succeeded | No |
| 2026-04-07 | Command | `git worktree add -b codex/external-turn-reply-aggregation ... origin/personal` | Create dedicated ticket worktree required by workflow | Dedicated worktree and branch created successfully | No |
| 2026-04-07 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | Inspect accepted receipt processing order | `processReceipt()` calls `tryPublishPersistedReply()` before live observation, and `publishReply()` marks the receipt published on success or duplicate | Yes |
| 2026-04-07 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts` | Verify intended live observation contract | Live observation accumulates same-turn text and publishes only on `TURN_COMPLETED` | No |
| 2026-04-07 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts` | Check persisted turn-reply recovery semantics | Recovery merges any assistant traces for the turn; it does not require turn-completion evidence | Yes |
| 2026-04-07 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Verify when assistant traces are persisted | Each LLM leg persists an assistant response before the overall tool-using turn completes | No |
| 2026-04-07 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/memory/memory-manager.ts` | Verify raw trace semantics | Assistant raw traces are written with `traceType: 'assistant'` and `tags: ['final']` per LLM leg, making pre-tool text look externally recoverable | Yes |
| 2026-04-07 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` | Inspect callback deduplication contract | Callback publishing is keyed by one `callbackIdempotencyKey`; duplicate enqueue prevents a second same-turn publish | No |
| 2026-04-07 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-store.ts` | Confirm outbox behavior on repeated same-turn callback keys | Existing callback key returns duplicate and reuses the existing record instead of enqueuing a second publish | No |
| 2026-04-07 | Code | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-provider.ts` | Check receipt lifecycle after publication | `markReplyPublished()` moves the receipt from `ACCEPTED` to `ROUTED`, closing the receipt after the first publish | No |
| 2026-04-07 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/external-turn-reply-aggregation/autobyteus-server-ts/tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts` | See whether tests encode the problematic behavior | The first unit test explicitly expects immediate persisted reply publication for a newly accepted receipt | Yes |
| 2026-04-07 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/external-turn-reply-aggregation/autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts` | Check end-to-end harness assumptions | Current harness expects persisted recovery to be retried and used alongside live observation wiring | Yes |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `AcceptedReceiptRecoveryRuntime.registerAcceptedReceipt(...)`
  - `AcceptedReceiptRecoveryRuntime.processReceipt(...)`
- Execution boundaries:
  - receipt lifecycle state machine in external-channel runtime
  - live turn observation via `ChannelAgentRunReplyBridge`
  - persisted turn-reply recovery via `ChannelTurnReplyRecoveryService`
  - callback enqueue + delivery dedupe via `ReplyCallbackService` and `GatewayCallbackOutboxStore`
- Owning subsystems / capability areas:
  - `autobyteus-server-ts/src/external-channel/runtime`
  - `autobyteus-server-ts/src/external-channel/services`
  - `autobyteus-ts/src/memory`
- Optional modules involved:
  - none beyond the external-channel turn-reply path
- Folder / file placement observations:
  - the bug is server-side in external-channel recovery semantics, not in `autobyteus-ts` turn management itself

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | `processReceipt`, `tryPublishPersistedReply`, `publishReply` | Converts accepted receipts into externally published replies | Calls persisted reply recovery before live observation and closes the receipt on the first publish attempt | Primary fix owner |
| `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts` | `handleRuntimeEvent`, `publishPendingTurnReply` | Accumulates live same-turn assistant text and resolves final reply at `TURN_COMPLETED` | Already matches the desired “accumulate then publish once” behavior | Preserve behavior |
| `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts` | `resolveReplyText` | Reconstructs a turn reply from persisted raw traces | Treats any assistant trace from the turn as reply-ready, even if the turn is still in progress | Secondary hardening point |
| `autobyteus-ts/src/memory/memory-manager.ts` | `ingestAssistantResponse` | Persists assistant raw traces | Persists each LLM leg as an `assistant` trace with `tags: ['final']` | Expected internal behavior; external recovery must not misinterpret it |
| `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` | `publishAssistantReplyToSource` | Enqueues outbound callback payloads | One callback key per turn; later same-turn publishes become duplicates | Confirms one-publish-per-turn contract |
| `autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-provider.ts` | `markReplyPublished` | Advances receipt state after reply publication | Moves the receipt to `ROUTED`, preventing further same-turn accepted processing | Explains why later continuation is suppressed |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-07 | Trace | Static code trace of `AcceptedReceiptRecoveryRuntime.processReceipt()` | Processing attempts persisted recovery before checking or starting live observation | Partial persisted assistant text can win the race before the turn completes |
| 2026-04-07 | Trace | Static code trace of `ChannelAgentRunReplyBridge.handleRuntimeEvent()` | Live bridge aggregates `SEGMENT_CONTENT` and `SEGMENT_END`, then resolves only on `TURN_COMPLETED` | The intended accumulation model already exists in the live path |
| 2026-04-07 | Trace | Static code trace of callback/outbox path | Same `callbackIdempotencyKey` is reused for the turn; duplicate enqueue blocks another callback | Early publish necessarily suppresses later same-turn publish under current contract |

## Constraints

- Technical constraints:
  - Current external-channel delivery contract is effectively one publish per logical turn.
  - Deduplication is keyed by `external-reply:<runId>:<turnId>`.
  - Receipts transition to `ROUTED` after first successful or duplicate publish handling.
- Environment constraints:
  - Fix is in a git worktree branch `codex/external-turn-reply-aggregation` based on `origin/personal`.
- Third-party / API constraints:
  - None required for the analysis; this is internal runtime logic.

## Unknowns / Open Questions

- Unknown: whether `ChannelTurnReplyRecoveryService` should be hardened now to require explicit turn-completion evidence, or whether deferring persisted recovery until after live observation and later retry is sufficient for the current bug.
- Why it matters: this affects how much of the fix belongs in runtime ordering versus recovery semantics.
- Planned follow-up: decide in Stage 2/3 whether to change only `AcceptedReceiptRecoveryRuntime` ordering or also narrow persisted recovery eligibility.

## Implications

### Requirements Implications

- The external contract should remain one publish per turn, but that publish must contain the accumulated same-turn assistant-visible text across tool boundaries.
- Persisted partial assistant traces from an in-progress turn must not be treated as final externally deliverable replies.

### Design Implications

- `AcceptedReceiptRecoveryRuntime` should prefer live observation for accepted active turns with known `turnId` and only fall back to persisted recovery when observation cannot resolve the reply or when a retry occurs after observation failure/timeout.
- The dedupe and receipt state machinery can stay one-shot if the runtime waits to publish the fully accumulated reply.

### Implementation / Placement Implications

- Production changes should land in `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts`, with regression coverage in the matching unit and integration tests.
- `ChannelTurnReplyRecoveryService` may need a small hardening change if design review concludes the runtime ordering fix alone is insufficient.

## Re-Entry Additions

None yet.
