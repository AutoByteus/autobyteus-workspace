# Implementation Design Impact Note

## Status

Implementation paused on 2026-04-28 because the user challenged a core architecture assumption from the reviewed design.

## Trigger

During implementation, the implementation attempted to add generic internal-task/hidden-run semantics into the existing agent-run framework and backend bootstrap path so compactor-agent runs would not appear as normal user-facing runs. The user objected that this likely invades an already-mature agent-run framework and may be unnecessary.

## User Feedback Summary

The user's current preference/concern:

- A compactor agent can be treated as a normal agent run through the existing top-level agent-run API/service.
- Existing `AgentRunManager` / backend / bootstrap framework should remain unaware of whether a run is for compaction or another purpose.
- The compaction feature should not force changes into mature Codex/backend bootstrap internals unless absolutely necessary.
- Showing the compactor run on the frontend/run history may be acceptable or even desirable, because it lets the user inspect whether compaction is working well.
- If the hidden/internal-run requirement came from the design rather than an explicit user requirement, the design should be revisited.

## Design Conflict

The current reviewed design and architecture review explicitly required:

- hidden/internal child compactor runs;
- no normal user-facing history pollution;
- no streaming child internals to user-facing surfaces;
- explicit tool/capability suppression for compactor internal tasks;
- backend/internal-run seams as needed.

This conflicts with the user's newly expressed acceptance/preference for normal visible agent-run behavior and avoidance of backend-framework changes.

## Implementation Risk If Continued Without Redesign

Continuing with the current reviewed design may:

- over-couple compaction requirements to the generic agent-run framework;
- add internal-run behavior to Codex/Claude/AutoByteus bootstrap paths that the user does not want;
- violate the user's preference to use existing top-level run APIs as-is;
- create a larger framework change than required for agent-based compaction.

## Proposed Redesign Question

Please re-evaluate whether the target design should change from:

`Compaction -> hidden/internal one-shot run -> backend-specific internal-task semantics`

To a simpler visible-run design such as:

`Compaction -> ServerCompactionAgentRunner -> existing AgentRunService/AgentRunManager public run path -> collect final output -> optionally terminate/leave visible run`

Key decisions needed:

1. Should compactor-agent runs be normal visible agent runs?
2. Should compactor-agent runs appear in frontend/run history for audit/debugging?
3. Is tool suppression still required, or should the selected compactor agent's normal tool configuration apply?
4. If tools must be suppressed, where should that policy live without invading backend bootstrap internals?
5. Should implementation avoid modifications to Codex/Claude backend bootstrap/thread/session managers entirely?

## Current Partial Implementation Note

Partial local changes were made before this concern was raised, including internal-task fields and backend bootstrap adjustments. These should not be treated as final implementation direction until the design is clarified.
