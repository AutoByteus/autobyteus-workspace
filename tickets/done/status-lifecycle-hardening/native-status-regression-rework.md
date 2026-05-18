# Native AutoByteus Status Regression Rework Report

## Status

Design-impact re-entry prepared for architecture review / implementation correction.

## User-Observed Bug

In the delivery-built Electron app, the native AutoByteus `ClassRoomSimulation` team shows professor/student members as `Running` during work, then the focused member drops to `Offline` immediately after response completion while the native member is still live.

Expected behavior: a live native member should settle to `Idle` after completion, or remain `Running` while an active turn is still in progress. It should not become `Offline` unless the backend/team/member is actually inactive or explicitly terminated.

## Why This Is A Design Impact

The original design correctly extracted pending command-start overlays and native identity projection, but it did not include a dedicated data-flow spine for native steady-state status events after command-start overlay replacement. In particular, it did not specify the precedence between:

1. the current legacy native `AGENT_STATUS_UPDATED` event payload status (`new_status`, `status`, etc.), which the target design replaces with `AGENT_STATUS { status }`,
2. active-turn lifecycle evidence,
3. mutable native `team.context.agents` snapshots, and
4. the projector's observed status cache.

That omission left room for an implementation where a mutable snapshot miss becomes `offline` even during a live native status event.

## Current Implemented Flow Finding

Relevant implemented files:

- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-event-processor.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-member-status-projector.ts`

The fragile flow is:

`Native AGENT_STATUS_UPDATED event -> AutoByteusStreamEventConverter ignores event.data.new_status -> converter calls projector.projectMemberStatusSnapshot -> projector returns offline if native member lookup misses -> false offline AGENT_STATUS is recorded and sent to frontend`.

Additional detail: `AutoByteusTeamRunEventProcessor` wires the converter status provider to `projector.projectMemberStatusSnapshot({ memberRunId, memberName })`. That direct single-member method currently does not apply the projector's observed status cache before returning offline. The observed cache is applied only by `projectMemberStatusSnapshots()` collection projection.

## Corrected Data-Flow Spines

### DS-006 — Native turn starts

`Native TURN_STARTED -> AutoByteusStreamEventConverter observes active turn -> default lifecycle pipeline derives AGENT_STATUS running -> AutoByteusTeamMemberStatusProjector records running -> TeamStreamingService applies Running to member context -> UI shows Running`

### DS-007 — Native explicit status update

`Native AGENT_STATUS { status } -> Converter reads explicit event status first -> Projector canonicalizes member identity and payload -> Backend records observed status -> UI applies status`

Mutable snapshots may enrich identity/can-interrupt but must not turn an explicit live status update into offline.

### DS-008 — Native turn completes but member remains live

`Native TURN_COMPLETED / ASSISTANT_COMPLETE / AGENT_STATUS(idle) -> Converter/pipeline produces idle -> Projector records idle -> backend snapshots fall back to observed idle if native member snapshot is stale/missing -> UI shows Idle`

### DS-009 — Native inactive/terminal cleanup

`Backend terminate / inactive team / explicit terminal/offline event -> projector/store clear or record terminal -> UI shows Offline/Error as appropriate`

This separate spine prevents the fix from making observed live status immortal.

## Required Design Correction

Native status event payloads are authoritative status edges. For `AGENT_STATUS`, conversion must use explicit event status payload first and snapshot fallback second.

A missing native member in `team.context.agents` is not sufficient to emit `offline` for a known observed member while the backend remains active.

## Required Implementation Correction

A valid fix should do all of the following:

1. Update `AutoByteusStreamEventConverter` and/or the native projector integration so `AGENT_STATUS` reads explicit event data `status` before snapshot fallback.
2. Preserve active-turn correction: stale `idle`/`offline`/`initializing` status while a turn is active should still project as `running`.
3. Update `AutoByteusTeamMemberStatusProjector.projectMemberStatusSnapshot` or add an equivalent single-member projection API so known observed live members do not return `offline` only because current native member lookup misses.
4. Preserve true offline transitions for inactive backend/team termination and explicit terminal/offline events.
5. Keep `TeamCommandStatusOverlayStore` unchanged in responsibility: pending command-start overlays only.

## Required Tests

- Unit: `AGENT_STATUS { status: "idle" }` with stale/missing native snapshot produces canonical `idle`, not `offline`.
- Unit: active-turn stale idle remains `running`.
- Unit: projector single-member snapshot returns observed `idle`/`running` for a known member when native snapshot is missing and backend is active.
- Integration-style: classroom native team sequence for professor and student; both go `running -> idle`, not `running -> offline`, after completion.
- Cleanup: backend inactive/terminate still leads to offline/cleared observed state.

## Artifact Updates

The following upstream artifacts now include this rework addendum:

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening/tickets/done/status-lifecycle-hardening/requirements.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening/tickets/done/status-lifecycle-hardening/investigation.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening/tickets/done/status-lifecycle-hardening/design-spec.md`

## Recommended Routing

Route through `architecture_reviewer` because this is a design-impact correction to the approved design. After approval, send the cumulative package plus this rework report to `implementation_engineer` for a targeted fix.

## Addendum — Simplify to One Status Event Name (2026-05-18)

The design now includes a cleanup/refactor decision: remove `AGENT_STATUS_UPDATED` from the canonical status path and use only `AGENT_STATUS` for current status reporting. This is feasible but not a trivial rename because `autobyteus-ts` currently exposes `agent_status_updated` in its runtime event enum, stream event enum, payload class, CLI consumers, and tests. The server and frontend already use `AGENT_STATUS` as the app-facing concept, so the cleanup aligns AutoByteus runtime naming with the rest of the product.

Target shape:

```text
AutoByteus status manager
  -> StreamEventType.AGENT_STATUS { status }
  -> AutoByteusStreamEventConverter
  -> AgentRunEventType.AGENT_STATUS { status }
  -> ServerMessageType.AGENT_STATUS
  -> frontend status state
```

The converter must no longer special-case `AGENT_STATUS_UPDATED` or replace explicit status payloads with mutable snapshots. `AGENT_STATUS_UPDATED` must be removed from the canonical path. Snapshot status remains fallback/enrichment only.

## Addendum — Fine-Grained Internal Status Is Preserved (2026-05-18)

The cleanup removes `AGENT_STATUS_UPDATED`, not AutoByteus's fine-grained internal status model.

Correct target flow:

```text
AutoByteus internal status manager
  -> AGENT_STATUS { status: AgentStatus }        # fine-grained internal status
  -> AutoByteusStreamEventConverter
  -> autobyteus-status-projector
  -> AgentRunEventType.AGENT_STATUS { status: AgentApiStatus }  # coarse public status
  -> ServerMessageType.AGENT_STATUS
  -> frontend status display
```

The frontend/public product status is coarse. The native AutoByteus runtime status remains fine-grained for internal control, CLI/internal consumers, diagnostics, and future behavior. This boundary must be visible in implementation and tests so one event name does not become one flattened enum.
