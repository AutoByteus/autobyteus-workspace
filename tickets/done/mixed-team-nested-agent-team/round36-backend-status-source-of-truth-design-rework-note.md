# Round 36 Backend Status Source-of-Truth Design Rework Note

Date: 2026-05-17
Owner: solution_designer
Status: Ready for architecture review

## Trigger

After Round 35, the user correctly challenged the frontend-startup-guard framing. The user clarified that runtime status should be backend-driven and asked whether a refactor is needed. I reloaded the design principles and applied the Authoritative Boundary Rule: canonical runtime status is a backend/runtime lifecycle concern, not a frontend optimistic UI concern.

## Corrected Decision

Backend is the sole authority for canonical runtime status:

```ts
"offline" | "initializing" | "idle" | "running" | "error"
```

Frontend may own local UX state only:

- pending submit / `isSending`
- disabled controls
- optimistic user message row
- spinner copy while waiting for backend status

Frontend must not write canonical `currentStatus = initializing` on local accepted send/start.

## Current-Code Evidence

Current frontend code does write canonical initializing:

- `autobyteus-web/stores/agentRunStore.ts` calls `beginLocalUserSubmission(... applyInitializing ...)`.
- `autobyteus-web/stores/agentTeamRunStore.ts` calls the team equivalent.
- `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` has `applyAcceptedStartupStatus()` and `applyAcceptedTeamMemberStartupStatus()` that mutate `context.state.currentStatus = AgentStatus.Initializing`.

Backend already defines canonical public status:

- `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` defines `AgentApiStatus = "offline" | "initializing" | "idle" | "running" | "error"`.

The problem is therefore not that backend cannot be the status source of truth. The problem is that the branch currently has mixed status authorship and missing backend lifecycle invariants for accepted startup.

## Required Refactor

### 1. Backend runtime lifecycle status owner

When backend accepts create/restore/send/start work for a run/member that is offline or idle, the backend owner must set canonical status to `initializing` before acknowledging the accepted operation and before any status snapshot/event that represents the accepted startup.

For individual agents this likely belongs around the `AgentRun` / provider backend lifecycle boundary and provider status projectors.

For mixed teams this belongs around `MixedTeamManager`, `MixedAgentMemberHandle`, and `MixedSubTeamMemberHandle` so leaf members, subteam/group handles, aggregate team status, and resolved child coordinators are backend-status-driven.

### 2. Snapshot correctness

`getStatusSnapshot()` is backend truth. If startup has been accepted and is in progress, snapshot must return `initializing`; it must not return `offline` or `idle` and rely on frontend to hide that.

This applies to:

- `AgentStreamHandler` initial `AGENT_STATUS` snapshot.
- `TeamRuntimeStatusSnapshotService` member/team snapshots.
- Mixed member status snapshots, which must include canonical `member_route_key` and/or `source_path`.

### 3. Provider-edge canonicalization

Provider raw states such as `bootstrapping`, `starting`, `startup`, and `uninitialized` are internal provider lifecycle states. They must map to canonical backend `initializing` before public WebSocket/GraphQL/frontend payloads.

This is not public backward compatibility. Frontend should not accept these raw strings as public status API.

### 4. Frontend status renderer / pending UI separation

Refactor frontend status helpers so they no longer author canonical `initializing`.

- Remove or repurpose `applyAcceptedStartupStatus()` and `applyAcceptedTeamMemberStartupStatus()` so they do not mutate `currentStatus`.
- `beginLocalUserSubmission()` may still create optimistic messages and pending UI state.
- `agentRunStore.ts` and `agentTeamRunStore.ts` should rely on backend status events/snapshots for runtime status.
- Run-history refresh must not overwrite a newer live backend status with stale history rows, but this is a read-model freshness rule, not frontend ownership of canonical status.

## Data-Flow Spines Updated

The design spec now updates DS-031..DS-035 to reflect backend source of truth:

- DS-031: individual backend-owned startup status spine.
- DS-032: team/nested backend-owned startup status spine.
- DS-033: provider-edge canonical status projection spine.
- DS-034: backend snapshot correctness plus frontend stale-history merge spine.
- DS-035: team member snapshot route/path identity spine.

## Regression Expectations

1. Individual agent send from offline:
   - frontend does not set canonical initializing locally;
   - backend accepted operation emits/snapshots `initializing`;
   - backend later emits `running`;
   - backend settles to `idle`/done, `error`, or `offline` only after real completion/failure/termination.
2. Team leaf send:
   - backend mixed member status emits/snapshots `initializing` by route/path;
   - frontend renders backend status only.
3. Subteam/group send:
   - backend group/subteam status emits/snapshots `initializing`;
   - resolved child coordinator leaf emits/snapshots route/path `initializing`/`running`;
   - frontend does not infer status from focus or flat `agent_name`.
4. Provider raw startup status tests:
   - backend projects raw provider startup states to canonical `initializing` before publication.
5. Frontend tests:
   - local submission helpers no longer mutate canonical `currentStatus`;
   - backend status payloads are the only way canonical status changes to `initializing`.

## Updated Artifacts

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/design-spec.md`
- Superseded Round 35 note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/round35-initializing-status-design-rework-note.md`
