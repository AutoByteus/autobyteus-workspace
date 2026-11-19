# SR-003 spine re-walk: a send for every run kind and state (after ARCH-REV-001 AR-001)

Walked on design-spec.md (SR-003) against the base `914eb36577`. Changed from SR-002: the lost-in-flight rows (D-3, D-8); each fact about what a reconnect brings is cited.

## Routes

| Run kind | Send owner | Readiness (after) | Answer awaited | Failure → presentation |
| --- | --- | --- | --- | --- |
| Standalone agent run (live, stopped/offline resume, a new run's first message, New chat's first message via the same store) | `agentRunStore.sendUserInputAndSubscribe` | `whenBound(10 s)` | ack (D-2) | `failLocalSubmission` |
| Delegated agent run | same store (`delegatedRunsStore` agent route) | same | same | same |
| Peer (remote) run | `delegatedRunsStore` peer route | `whenBound(10 s)` on the peer service (`/ws/peer-run`: `CONNECTED` at once) | `sendMessageAwaitingAdmission` (existing) | `showMessageNotDelivered`; draft never cleared before success |
| Team member (own Team, delegated Team, launch draft first message) | `agentTeamRunStore.sendMessageToFocusedMember` | `ensureTeamStreamConnected` (unchanged: ready view) | Team admission (unchanged) | `failLocalSubmission` (`'returned_draft'` for classified transport failures) |
| Org member (live; stopped Org's first message) | `agentOrgContextsStore.submit` | `whenReady` / ready stream (unchanged) | Org ack (unchanged) | same |

## States

| State at Send | Agent / delegated | Peer | Team | Org |
| --- | --- | --- | --- | --- |
| Stream bound / ready | sent at once; ack | sent at once | sent | sent |
| Socket open, `CONNECTED` not yet (the defect) | waits for `CONNECTED`, then sends | waits (`CONNECTED` comes with the open) | n/a (waits for the view) | n/a |
| Not bound within 10 s | `not_sent`: message removed, draft back, notice (a) | notice (a), draft still there | `not_sent` (timeout) | not ready → `not_sent` |
| Socket throws on send | `not_sent` | `not_sent` | `not_sent` | `not_sent` |
| Lost after sending, retryable | held → after the snapshot (stored part `agent-stream-snapshot.ts:13-37`; `input_state` from `getInputStateSnapshot` `agent-run.ts:478` — D-8; turn frames): id present (stored, live turn, or queued by a native/AGY/ACP run while Running, `agent-run-input-admission-state.ts:157-185`) → shown, nothing else; missing → `not_sent`; run not active at the rebind (`storedRunSnapshot`, `input_state: null`) and missing → `unknown` | held as agent; peer snapshot `input_state: null` (`peer-agent-stream.ts:35`, D-8) → found or `unknown`, never `not_sent` | drained → `unknown`: draft back, notice (b) | closed → `unknown` |
| Closed for good after sending | `unknown` | `unknown` | `unknown` (disconnect drain) | `unknown` |
| Node rejects the message (ack rejected) | unchanged (projector's error); held sends: existing rejection | existing | existing | existing |
| Node restart between send and rebind | snapshot decides: the restored run's stored part and (if active) its input state; a stale `pendingInput` mark from before the loss is replaced by the node's input state (D-8) | `unknown` unless stored | `unknown` | `unknown` |

Gap check: every send ends in exactly one of: accepted / rejected by the node (existing presentation) / not delivered (draft + notice). No path leaves an empty box with no notice. ASM-001 (native runtime's stored message id) is the one premise to confirm in implementation.
