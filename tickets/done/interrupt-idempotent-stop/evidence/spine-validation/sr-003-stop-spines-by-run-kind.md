# SR-003 spine re-walk: Stop for every run kind and state (after ARCH-REV-001 AR-001)

Walked on design-spec.md at SR-003 against the base code at `bd2053ee51`. Changed spines: DS-002 (return), DS-002b (connection
loss, new), DS-003 (status watch now from the press). DS-001 and DS-004 are unchanged; their route table is repeated so this
file stands alone. Every row starts at the composer (`AgentUserInputTextArea`, the same on desktop and phone:
`MobileRunTargetView.vue:26` → `AgentEventMonitor` → `AgentUserInputForm` → `useComposerTarget` →
`activeContextStore.interruptGeneration`).

## Routes (DS-001 → DS-004), unchanged

| Run kind | Web route | Stream / service | Node handler | Not-running answer | Rebind signal for D-W7 (code) |
| --- | --- | --- | --- | --- | --- |
| Standalone agent run | `agentRunStore.interruptGeneration` | `/ws/agent`, `AgentStreamingService` (same instance reconnects: `agentRunStreamReconnection.ts`, first retry 1 s) | `agent-stream-handler.ts:389` | `NOTHING_TO_INTERRUPT` | first `AGENT_STATUS` after the new `CONNECTED` (server sends both on every open, `agent-stream-handler.ts:150-155`) |
| Team member (own Team) | `agentTeamRunStore.interruptFocusedMemberGeneration` | `/ws/agent-team`, `TeamStreamingService` | `team-interrupt-generation-command-handler.ts` | accepted | the snapshot that sets `ready` (`TeamStreamingService.ts:312-323`; the snapshot carries `agent_statuses`, applied at `teamExecutionViewState.ts:279`) |
| Org member (direct or Org-internal Team) | `orgInterruptOutcome` | `/ws/agent-org`, `AgentOrgStreamingService` | `agent-org-stream-handler.ts:139-157` | accepted (stopped Org) | the snapshot that sets `ready` (`agentOrgStreamingService.ts:312`) |
| Org peer row | same | same | peer branch `:131-137` | peer `RUN_NOT_ACTIVE` | same |
| Delegated agent | `delegatedRunsStore` → `agentRunStore` | `/ws/agent` of its own run | as standalone | as standalone | as standalone |
| Delegated Team member | `delegatedRunsStore` → `agentTeamRunStore` | `/ws/agent-team` of its own Team | as Team | as Team | as Team |
| Peer (remote) run | `delegatedRunsStore` peer route | `/ws/peer-run`, `AgentStreamingService` (same instance reopens after 1 s, `peerRunStreams.ts:10,32-35`) | `peer-run-stream-session.ts:112` | peer `RUN_NOT_ACTIVE` | first `AGENT_STATUS` (the relay sends the peer's status before its snapshot, `peer-run-stream-session.ts:78`) |

## States (DS-002, DS-002b, DS-003), every kind

| State when pressed / what happens | Node answer | Outcome | Stopping | Message |
| --- | --- | --- | --- | --- |
| Turn running | accepted | `accepted` | ends when status ≠ Running (watch from the press; frame order irrelevant) | none |
| Second press while Stopping | — (nothing sent) | — | unchanged | none |
| Turn ended on the node, page still Running | accepted | `accepted` | ends with the status | none |
| Stale `Running` placeholder on open | accepted | `accepted` | ends with the bind's status | none |
| Turn already gone inside the runtime | `NO_ACTIVE_TURN` → accepted | `accepted` | status | none |
| Run / Team / Org not running | accepted | `accepted` | status | none |
| **Stream drops (retryable) while the Stop waits** (AGY run going offline, network, gap reopen, resynchronize) | — (ack lost) | held; after the reconnect and the rebind's status: `connection_lost` | **stays Stopping through the reconnect window (≥1 s)**; a press there is refused by the primary action and sends nothing; status ≠ Running before the rebind (never: no frames arrive) | none |
| …rebind brings `running` | — | `connection_lost` | ends; Stop enabled (the turn really is still running) | none |
| …rebind brings `idle` / `offline` / `error` | — | `connection_lost` (DS-003 may already have ended Stopping on the same status) | ended; Send per the draft | none |
| Stream closed for good while the Stop waits or is held (agent `disconnect()` or a non-retryable loss; Team `disconnect()`; Org intentional close / release / credential refusal; peer `closeAll`) | — | `connection_lost` at once | ends; the view is being closed or cannot reconnect | none |
| Not connected when pressed (Stopping not active) | not sent | `not_sent` | ends | "Stop was not sent: not connected to the node…" |
| Runtime fails / peer unreachable | failed/rejected | `refused` | ends; Stop available again | "Could not stop {name}. Please try again." |
| Org command times out (15 s, connection open) | — | `refused` | ends | same |

## Restart / reconnect

- A retryable loss holds waiting Stops; the same service reconnects (agent/peer ≥1 s, then backoff; Team and Org recover through
  their own schedulers) and settles them after the rebind's status is applied. Nothing drains them at the drop any more.
- A context replaced by hydration during the reconnect starts with `interruptPending = false`; the old context's runInterrupt ends
  when the held Stop settles.
- Node restart: the stream drops (retryable), the reconnect binds to the restored or offline run; its status decides.

Gap check: the only exit from "held" besides the rebind is a final close, and both settle exactly once. No gap found.
