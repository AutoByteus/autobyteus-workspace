# SR-002 spine re-walk: Stop for every run kind and state

> Superseded by `sr-003-stop-spines-by-run-kind.md`: its connection-loss rows and "Restart / reconnect" section were wrong (ARCH-REV-001 AR-001: pending Stops are drained at the drop, not at the rebind). Kept as the SR-002 record.

Walked on the design (design-spec.md, SR-002) against the base code cited there. Every row starts at the composer
(`AgentUserInputTextArea`, the same component on desktop and phone: `MobileRunTargetView.vue:26` → `AgentEventMonitor`
→ `AgentUserInputForm` → `useComposerTarget` → `activeContextStore.interruptGeneration`).

## Routes (DS-001 → DS-004)

| Run kind | Web route (`interaction.interrupt()`) | Stream | Node handler (DS-004) | Not-running answer | Result through `userInterruptOutcome` |
| --- | --- | --- | --- | --- | --- |
| Standalone agent run | `agentRunStore.interruptGeneration(runId)` → `AgentStreamingService` | `/ws/agent` | `agent-stream-handler.ts:389` | `!activeRun` → `NOTHING_TO_INTERRUPT` | `activeRun.interrupt(null)` |
| Team member (own Team run) | `agentTeamRunStore.interruptFocusedMemberGeneration` → `TeamStreamingService` | `/ws/agent-team` | `team-interrupt-generation-command-handler.ts` | `!activeRun` (Team) → accepted ack | `executeAgentCommand(interrupt)` (member handle with no AgentRun already accepted) |
| Org member, direct or in an Org-internal Team | `orgInterruptOutcome(AgentOrgStreamingService)` | `/ws/agent-org` | `agent-org-stream-handler.ts:139-157` | stopped Org + interrupt → accepted (tool approval keeps `AGENT_ORG_STOPPED`) | `run.executeAgentCommand(target, interrupt)` |
| Org peer row | same | `/ws/agent-org` | peer branch `:131-137` | peer's `RUN_NOT_ACTIVE` | `executePeerCommand` result |
| Delegated agent (task agent on this node) | `delegatedRunsStore` agent route → `agentRunStore.interruptGeneration` | `/ws/agent` (its own run) | as standalone | as standalone | as standalone |
| Delegated Team member | `delegatedRunsStore` Team route → `agentTeamRunStore` | `/ws/agent-team` (its own Team) | as Team | as Team | as Team |
| Peer (remote) run | `delegatedRunsStore` peer route → peer `AgentStreamingService` (no stream → `not_sent`) | `/ws/peer-run` | `peer-run-stream-session.ts:112` | peer node `notLiveRefusal` → `RUN_NOT_ACTIVE` | receipt |
| Collaboration-root peer row | (no web sender today) | `/ws/agent-collaboration` | `agent-collaboration-stream-handler.ts:185` | — | peer result |

## States (DS-002, DS-003) — same for every kind

| State when pressed | Node answer | Outcome | Stopping | Message |
| --- | --- | --- | --- | --- |
| Turn running | accepted (turn ends; status arrives before the ack on Claude/AGY, after on Codex) | `accepted` | until status ≠ Running | none |
| Second press while Stopping | — (primary action `stopping`, nothing sent) | — | unchanged | none |
| Turn ended on the node, page still Running (race) | accepted (nothing to stop) | `accepted` | ends when the already-sent status lands (or at once if it landed) | none |
| Stale `Running` placeholder on open (idle run) | accepted | `accepted` | ends with the status sent on bind | none |
| Turn ended inside the runtime first (Claude/Codex/native/ACP/AGY) | backend `NO_ACTIVE_TURN` → accepted | `accepted` | status | none |
| AGY: run goes offline after the Stop; stream rebinds | accepted or none before the drop | `accepted` or `connection_lost` | status (`offline`) | none |
| Run/Team/Org not running | accepted | `accepted` | status | none |
| Not connected when pressed | not sent | `not_sent` | ends | "Stop was not sent: not connected to the node…" |
| Runtime fails to interrupt / peer unreachable | failed/rejected | `refused` | ends; Stop available again | "Could not stop {name}. Please try again." |
| Org command times out (15 s) | — | `refused` | ends | same |
| Malformed command / target not a member | rejected | `refused` | ends | same (a defect; not reachable from the composer) |

## Restart / reconnect

- A rebind of the stream drains pending commands as `connection_lost`; the status sent on bind decides the button.
- A context replaced by hydration starts with `interruptPending = false`; the old context's watch ends at its next status write or is dropped with it.

No gap found.
