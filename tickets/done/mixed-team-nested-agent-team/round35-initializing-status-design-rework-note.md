> Superseded by `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/round36-backend-status-source-of-truth-design-rework-note.md`. Round 35 correctly identified the git regression, but its frontend accepted-startup guard framing has been replaced: backend runtime lifecycle is the only canonical status authority; frontend must not write canonical `initializing`.

# Round 35 Initializing Status Design Rework Note

Date: 2026-05-17
Owner: solution_designer
Status: Ready for architecture review

## Trigger

Delivery/user verification of the Electron candidate built from `codex/mixed-team-nested-agent-team` exposed a startup-status regression:

- Individual agent: visible `offline -> initializing -> offline/done` after user send.
- Team/nested member: does not consistently show the expected startup transition.
- Expected product behavior: accepted startup shows `offline -> initializing -> running`, then settles to `idle`/done only after the accepted input completes, or to `error`/`offline` only on explicit failure/termination.

The user asked to use git to compare what happened on `origin/personal` for agent status and decide whether the current branch needs an update.

## Git / Current-State Finding

The current branch has already merged the personal initializing UX work; the issue is not a stale base.

Key evidence:

- `origin/personal` includes `5f1c4408 Merge branch 'codex/agent-initializing-status-ux' into personal`.
- Current branch HEAD is `54cacc2a fix(status): remove provider lifecycle residue`.
- Current branch has post-personal status changes including `7ce0ea49 fix(status): reject removed lifecycle tokens` and `54cacc2a fix(status): remove provider lifecycle residue`.
- `runtimeStatusNormalization.ts` and `agent-status-payload.ts` were narrowed from broad startup/lifecycle mapping to mostly canonical-only mapping.
- `agentRuntimeStatusState.ts` still lets `applyLiveAgentStatusEvent()` blindly overwrite local `initializing` with any live/snapshot status.
- `AgentStreamHandler` sends an immediate `AGENT_STATUS activeRun.getStatusSnapshot()` on WebSocket connect, which can arrive after the frontend locally applies `initializing` but before the backend processes the outbound user message.
- Mixed team initial member status snapshots currently include `agent_id`/`agent_name` but need canonical `member_route_key`/`source_path` for strict nested routing.

Conclusion: the current branch needs a targeted status-spine integration update. Do not merely merge/revert. Reintegrate the personal initializing invariant under the nested-team route/path and clean public status contract.

## Design Decision

### 1. Public status contract remains canonical

The frontend/public wire status domain remains:

- `offline`
- `initializing`
- `idle`
- `running`
- `error`

Do not reintroduce raw provider lifecycle strings as public frontend statuses.

### 2. Provider lifecycle mapping is internal adapter behavior, not legacy public compatibility

Raw provider/backend states such as `bootstrapping`, `starting`, `startup`, and `uninitialized` are internal runtime facts. Provider-specific status projectors or the internal backend status normalizer must map them to canonical `initializing` before publication.

This is different from command API legacy cleanup. Rejecting scalar command aliases is still correct. Removing provider-edge startup translation is not correct because it erases the canonical `initializing` state.

### 3. Accepted startup intent has higher precedence than passive snapshots

When the frontend accepts a user send/start and marks a run/member as `initializing`, passive startup synchronization must not downgrade it to `offline` or `idle` before runtime activity starts.

Authoritative precedence:

1. Explicit `error` or explicit termination/offline may settle startup.
2. Live `running` or runtime activity moves startup to running.
3. Completion after observed runtime activity may settle to `idle`/done.
4. Initial WebSocket snapshots and history refreshes are passive; they can initialize idle screens but cannot overwrite a newer accepted startup with `offline`/`idle`.

Implementation may use explicit snapshot/source payload classification where available. If that is too large for this patch, centralize equivalent suppression inside the frontend runtime status owner rather than scattering guards in components.

### 4. Team and nested-team startup follows the same invariant

- Focused leaf send: set the leaf member and aggregate team to `initializing`.
- Focused subteam/group send: set the group node and aggregate team to `initializing`; do not pretend the group is an `AgentContext`.
- Backend-resolved child coordinator route/path events then drive the actual leaf (`BuildSquad/review_lead`) to `initializing`/`running`.
- Terminal cleanup settles leaf/group/team state only after real completion/error/termination.

### 5. Team status snapshots require canonical route/path identity

Initial team member status snapshots must include `member_route_key` and/or `source_path` so `TeamStreamingService` can route status updates through strict nested identity. `agent_name` and `agent_id` may remain metadata/fallback where safe, but they are not nested routing authority.

## Required Design/Data-Flow Spines Added

The authoritative design spec now includes:

- DS-031: individual accepted-startup status spine.
- DS-032: team/nested accepted-startup status spine.
- DS-033: provider canonical status projection spine.
- DS-034: passive snapshot/hydration guard spine.
- DS-035: team member status snapshot identity spine.

These spines were added to the inventory, use-case coverage, primary/return spine narratives, ownership map, off-spine concerns, subsystem allocation, interface checks, dependency rules, file mapping, and examples.

## Implementation Guidance

Likely code areas:

- Frontend status owner:
  - `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts`
  - `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts`
- Single-agent run path:
  - `autobyteus-web/stores/agentRunStore.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- Team/nested run path:
  - `autobyteus-web/stores/agentTeamRunStore.ts`
  - `autobyteus-web/stores/agentTeamContextsStore.ts`
  - `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- Backend status projection:
  - `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts`
  - provider status projector files under `autobyteus-server-ts/src/agent-execution/backends/**`
- History/hydration race:
  - `autobyteus-web/stores/runHistoryStore.ts`
  - `autobyteus-web/stores/runHistoryLoadActions.ts`

## Regression Expectations

Add/adjust tests so these scenarios are executable:

1. Individual agent send from offline:
   - local `initializing` appears immediately;
   - initial passive snapshot `offline`/`idle` does not downgrade it;
   - `running` moves it to running;
   - post-completion settles to `idle`/done.
2. Team focused leaf send:
   - leaf and aggregate team show initializing;
   - passive team snapshots do not clear startup;
   - live route/path status updates settle the member.
3. Team focused subteam/group send:
   - group/aggregate show initializing;
   - backend route/path events move resolved child coordinator leaf;
   - no assumption that the group has an `AgentContext`.
4. Provider startup states:
   - raw provider `bootstrapping`, `starting`, `startup`, `uninitialized` map to canonical `initializing` before publication.
5. Team status snapshots:
   - emitted snapshots include `member_route_key` or `source_path` and frontend dispatch works without bare display-name routing.

## Updated Artifacts

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/design-spec.md`
