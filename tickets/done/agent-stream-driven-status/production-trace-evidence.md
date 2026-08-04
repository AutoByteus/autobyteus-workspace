# Production Trace Evidence — Stream-Driven Agent Status And Interrupt

## Artifact Metadata

- Purpose: Retain the exact user-visible and live-runtime evidence for the reported `Running`/non-interruptible contradiction and the related overlapping-send risk.
- Scope: Evidence only. Intended behavior remains authoritative in `requirements.md`.
- Status: Complete for requirements refinement; additional implementation-time probes may extend it.
- Approval applicability: `N/A`.
- Related behaviors/requirements/criteria: `BEH-001` through `BEH-005`; `REQ-001` through `REQ-012`; `AC-001` through `AC-015`.
- Core artifact links: [`requirements.md`](./requirements.md), [`investigation-notes.md`](./investigation-notes.md).

## User-Supplied Visual Evidence

Source:

`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png`

Observed state:

- The selected `solution_designer` header shows a blue dot and `Running`.
- The response surface is visibly receiving/has received current-turn output and shows `Thinking` activity.
- The composer primary action is the blue paper-airplane/send icon, not the red stop/interrupt icon.
- Current source selects the icon from `activeContextStore.canInterrupt`, which is stored separately from `currentStatus`; therefore the screenshot is consistent with the contradictory local state `currentStatus=running`, `canInterrupt=false`.

## Matched Production Team And Turn

The visible SenseVoice text matches this live team:

- Team run: `software_engineering_team_96f09bad9be2477bbba1882c070d6957`
- Metadata: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_96f09bad9be2477bbba1882c070d6957/team_run_metadata.json`
- Selected member run: `solution_designer_cbb9cac3558e4622a3f0a1564abe963a`
- Runtime: `codex_app_server`
- Trace: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_96f09bad9be2477bbba1882c070d6957/solution_designer_cbb9cac3558e4622a3f0a1564abe963a/raw_traces_active.jsonl`
- Active visible turn: `019fbe9d-e2bb-7fd3-b57d-dc722b3309b1`

Relevant event sequence from the trace:

| Local timestamp | Turn ID | Sequence | Event | Meaning |
| --- | --- | ---: | --- | --- |
| 2026-08-01 20:37:26 | `019fbe9d...` | 1 | User input | The active design turn was submitted. |
| 2026-08-01 20:37:39 | `019fbe9e...` | 1 | Second user input | A second command was admitted/recorded for the same member while the first turn was still active. |
| 2026-08-01 20:37:45 | `019fbe9d...` | 2 | Reasoning segment | Current-turn stream activity continued for the first turn. |
| 2026-08-01 20:37:49 | `019fbe9d...` | 3 | Assistant segment | Exact screenshot text beginning `Understood. I’m recording this as approval...`. |
| 2026-08-01 20:38:12 onward | `019fbe9d...` | 4+ | Reasoning/tool events | The first turn continued executing for many minutes. |

The second turn has only its submitted user trace in the inspected file; the first turn continued producing the work shown in the screenshot. This is consistent with the primary composer having failed to switch to interrupt behavior during active execution. It also exposes a separate local UI guard defect: `handleKeyDown` calls `handlePrimaryAction()` without honoring the button's `isActionDisabled` state, so Enter can invoke send even when the button element is disabled.

## Live WebSocket Snapshot Probe

Probe date: 2026-08-01.

Method: connect read-only to `ws://127.0.0.1:29695/ws/agent-team/software_engineering_team_96f09bad9be2477bbba1882c070d6957`, collect only `CONNECTED`, `AGENT_STATUS`, and `TEAM_STATUS`, send no client command, and close after 1.5 seconds.

Relevant snapshot:

```json
{
  "type": "AGENT_STATUS",
  "payload": {
    "status": "running",
    "can_interrupt": true,
    "agent_id": "solution_designer_cbb9cac3558e4622a3f0a1564abe963a",
    "agent_name": "solution_designer",
    "member_route_key": "solution_designer",
    "member_path": ["solution_designer"]
  }
}
```

The team snapshot also reported `TEAM_STATUS { "status": "running" }`.

Implication: at probe time, the backend could compute the correct active-turn snapshot, while the screenshot frontend had previously rendered `Running` without the interrupt action. The defect is therefore not simply “the runtime cannot know interruptibility.” Sparse/racy status projection and the separate frontend `canInterrupt` field allow temporary or persistent disagreement even though a later reconnect snapshot can be correct.

## Source-Level Contradiction And Race Evidence

- `autobyteus-web/types/agent/AgentRunState.ts` stores `currentStatus` and `canInterrupt` independently.
- `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` grants interrupt only when both `status === running` and `payload.can_interrupt === true`.
- `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` renders stop from `canInterrupt`, while the header renders `currentStatus`; this directly permits `Running` plus send icon.
- `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/lifecycle-status-event-transformer.ts` synthesizes any derived `running` status with `canInterrupt: false`, including the `TURN_STARTED` fallback path.
- `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts` can synthesize a `running` replacement using the prior snapshot's `can_interrupt`. During asynchronous start reconciliation, that snapshot can still be `initializing/can_interrupt=false`.
- Runtime-specific projectors later derive `can_interrupt=true` from active-turn identity, so ordering among command acknowledgement, derived lifecycle status, and runtime status can change the final frontend value until another status message repairs it.
- Current frontend tests intentionally assert that `isSending` or ordinary activity cannot show stop when `canInterrupt=false`; they do not cover the invariant that visible `running` must never remain non-interruptible for an open supported turn.

## Constraint From Earlier Production Evidence

The completed `agent-idle-status-lifecycle` ticket proved that provider/tool events can arrive minutes after their original turn completed. Therefore the safe form of “streaming means busy” is:

> Current-turn-correlated streaming means the current turn is busy; an event from a retired/completed turn does not reopen busy state.

The target must retain late content/tool events for transcript and activity rendering while pairing them with the lifecycle status of the actual current turn (idle, running for a newer turn, error, or offline).
