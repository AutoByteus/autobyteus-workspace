# Solution Design Decision — Packaged Electron ClassRoomSimulation Direct Send

## Status

- Date: 2026-06-04
- Owner: `solution_designer`
- Classification: **Local implementation defect exposed by the current strict identity refactor**
- Design impact: **No broad requirement redesign required**. The existing strict logical-member identity requirement is correct. The implementation missed the normal temporary-team-create/send promotion path.
- Route: **implementation_engineer** for local fix, then code review/API-E2E before delivery resumes.

## User-Reported Symptom

In the packaged Electron UI built from the current ticket branch, the user created/sent a `ClassRoomSimulation` prompt to `professor`:

```text
give student a hard math problem to solve
```

The screenshot after send showed:

- `professor • Offline`
- only the local user message visible in professor conversation
- no visible professor response, `send_message_to` activity, team message, or student response

The user stated the same flow works on `origin/personal`.

## Evidence From The Actual Reported Run

The screenshot-selected run maps to the recent packaged Electron run:

```text
teamRunId: team_classroomsimulation_b3bb4088
professor memberRunId: professor_50e0abe1bfe7eb6d
student memberRunId: student_2efc213be4f36f70
createdAt: 2026-06-04T03:20:14.691Z
```

Backend/runtime evidence shows the backend did **not** fail to execute:

- `team_communication_messages.json` contains the professor → student direct message.
- `professor_50e0abe1bfe7eb6d/raw_traces.jsonl` contains:
  - user input
  - `send_message_to` tool call
  - successful `send_message_to` tool result
  - professor assistant completion
- `student_2efc213be4f36f70/raw_traces.jsonl` contains:
  - received message from professor
  - student assistant solution
- Electron app log around `2026-06-04T03:20:17Z` shows:
  - professor tool invocation finalized
  - student runtime started on-demand
  - direct message posted successfully
  - team communication projection inserted
  - professor assistant complete / turn completed
- Live GraphQL projection for the same run returns the full professor conversation and activity:
  - `getTeamMemberRunProjection(teamRunId: "team_classroomsimulation_b3bb4088", memberRouteKey: "professor")` returns user message, `send_message_to` tool call/result, and professor assistant completion.
- `listWorkspaceRunHistory` reports the same run as active/idle with both members idle.

Therefore the reported screenshot is not evidence of a backend execution failure. It is evidence that the packaged frontend's live context for the newly created run did not route/render the live stream events and remained at the optimistic local user-message state.

## Root Cause

The current ticket intentionally introduced strict frontend stream routing:

- task-agent events must carry explicit task-agent identity;
- identity-less logical-member messages are routed only when logical route/path and `agent_id` are consistent with the existing logical member context;
- generated-run-ID substring heuristics were removed.

That strict rule is correct and matches `REQ-005`.

The uncovered defect is in the **temporary team run promotion path** for a normal newly-created packaged Electron team run:

1. `agentTeamContextsStore.createRunFromTemplate(...)` creates temporary member contexts with run IDs derived from the local conversation ID, for example:

   ```text
   temp-team-...::professor
   ```

2. `agentTeamRunStore.sendMessageToFocusedMember(...)` creates the real backend team run via `createAgentTeamRun`.

3. `promoteTemporaryTeamRunId(temporaryTeamRunId, permanentTeamRunId)` only replaces the temporary team prefix in the local conversation/run IDs, producing:

   ```text
   team_classroomsimulation_b3bb4088::professor
   ```

4. The backend's actual logical member run ID in team metadata is different:

   ```text
   professor_50e0abe1bfe7eb6d
   ```

5. The websocket `AGENT_STATUS` / segment / tool events from the backend carry:

   ```text
   member_route_key: professor
   agent_id: professor_50e0abe1bfe7eb6d
   ```

6. `resolveTeamStreamMemberContext(...)` route-resolves to `professor`, sees the existing local context run ID is `team_classroomsimulation_b3bb4088::professor`, detects the mismatch with `agent_id`, and correctly returns `null`.

7. Result: the frontend skips live professor/student events. The local optimistic user message remains visible, while backend execution actually completes.

This explains why API/E2E's GraphQL-created/dev-frontend replay passed: that path hydrated the team context from backend metadata, so the frontend member context already had `state.runId = professor_...`, matching websocket `agent_id`.

## Classification

This is a **local implementation defect in normal temporary-team-create/send/open identity reconciliation**, not a new task-agent design requirement and not an Electron backend packaging failure.

More precise categories:

- Missing implementation step: temporary frontend team members must be reconciled with backend-assigned member run IDs immediately after the real team run is created and before stream events are expected to route.
- Boundary preserved: strict resolver behavior should remain. Do **not** reintroduce `isTaskAgentRunId(...)` or arbitrary logical run-ID overwrites to mask this.
- Separate issue: persisted AutoByteus team communication route/path fields being null is still a separate follow-up candidate. It did not cause this direct-send failure because projections and raw traces prove the message persisted and GraphQL returns it.

## Required Fix Shape

Implementation should keep the strict stream resolver and fix the promotion/hydration path.

Acceptable implementation directions:

1. **After `createAgentTeamRun` succeeds, fetch backend metadata before connecting/sending**
   - Use `GetTeamRunResumeConfig` / existing hydration utilities or a narrower metadata fetch.
   - Build a `memberRunIdByRouteKey` map from metadata `memberTree` leaf members.
   - Reconcile local promoted member contexts:
     - keep local optimistic conversations/attachments;
     - keep conversation IDs in the team/member conversation namespace if desired;
     - set `memberContext.state.runId` to the backend `memberRunId` for each logical member;
     - update member nodes' `memberRunId` to backend IDs if the node still has temporary IDs.

2. **Or extend the create mutation result to include member identities**
   - This is acceptable only if it remains a thin transport improvement and does not move runtime policy into the frontend.
   - It is probably heavier than needed because `GetTeamRunResumeConfig` already exists.

3. **Do not weaken `resolveTeamStreamMemberContext(...)`**
   - The resolver should continue rejecting identity-less routed messages with mismatched logical `agent_id`.
   - The fix is to make the logical context's run ID correct before the event arrives.

4. **Ensure ordering**
   - The member ID reconciliation must happen before `ensureTeamStreamConnected(finalTeamRunId)` and `service.sendMessage(...)`, or at least before live events are allowed to route.

## Required Tests

Add durable tests for the normal direct-create/send path that API/E2E previously missed:

1. Frontend unit/store test for temporary team launch:
   - temp professor starts with `state.runId = temp-team-...::professor`;
   - `createAgentTeamRun` returns `team-1`;
   - backend metadata has `professor.memberRunId = professor-real-run`;
   - after send setup, professor context `state.runId` is `professor-real-run`, not `team-1::professor`;
   - `TeamStreamingService.sendMessage(...)` still targets route key `professor`.

2. Resolver regression test or integrated store/resolver test:
   - after promotion/reconciliation, an identity-less logical `AGENT_STATUS` with `member_route_key: professor` and `agent_id: professor-real-run` routes to the professor context;
   - the old unreconciled `team-1::professor` state would fail this test.

3. API/E2E/package validation:
   - packaged Electron normal UI path, not only dev frontend / GraphQL-created run;
   - create `ClassRoomSimulation`, send the prompt to `professor`, verify professor goes running/idle, `send_message_to` activity appears, team message appears, and student response appears or is retrievable after focus/hydration.

## Not A Fix

Do not fix this by:

- reintroducing generated-ID heuristics;
- letting the resolver overwrite any routed logical member's run ID with arbitrary `agent_id`;
- treating `teamRunId::memberRouteKey` as a valid backend logical member run ID after backend creation;
- moving task or runtime policy into `TeamRun` or frontend routing.

## References

- Reroute artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor/tickets/in-progress/task-agent-identity-projection-refactor/api-e2e-classroom-electron-direct-send-reroute.md`
- Reported run data: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_classroomsimulation_b3bb4088`
- Frontend promotion code: `autobyteus-web/stores/agentTeamContextsStore.ts`
- Frontend send path: `autobyteus-web/stores/agentTeamRunStore.ts`
- Frontend strict resolver: `autobyteus-web/services/agentStreaming/teamStreamMemberContextResolver.ts`
- Backend projection query verified live: `getTeamMemberRunProjection(team_classroomsimulation_b3bb4088, professor)`
