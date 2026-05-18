# Future Feature: Shared Member Instance Across Multiple Teams

## Status

Future feature / not part of the current nested mixed-team implementation.

The current implementation should keep one canonical structural runtime path for a nested member, for example `BuildSquad/review_lead`, and expose that member to the parent through representative communication descriptors. This document records the cleaner long-term organization model where one agent member instance can belong to multiple teams at the definition/construction level.

## Motivation

Real organizations often have a person who belongs to more than one team:

```text
ParentTeam
  program_manager
  review_lead        # BuildSquad representative in the parent team

BuildSquad
  review_lead        # same person, coordinator of BuildSquad
  qa_specialist
```

The important product idea is that `review_lead` is not two agents. It is one member instance with multiple team memberships. The parent team sees the person directly, while the child team also sees the same person as its coordinator.

## Current Near-Term Model

The nested mixed-team design currently keeps structural execution tree identity simple:

```text
ParentTeam
  program_manager
  BuildSquad
    review_lead
    qa_specialist
```

Runtime identity, metadata identity, event source path, and frontend tree path all point to one canonical nested route:

```text
BuildSquad/review_lead
```

Parent communication visibility exposes `review_lead` as the `BuildSquad` representative, but this is a communication roster/exposure edge, not a second structural membership node. This gives the required communication behavior with less risk:

- parent can message `review_lead`;
- `review_lead` can message parent member `program_manager`;
- `review_lead` can message local child teammate `qa_specialist`;
- one runtime instance owns the transcript, lifecycle, and platform run id.

## Future Target Model

A fuller organization model would split runtime instance identity from team membership identity.

### Core Concepts

```ts
type AgentMemberInstance = {
  memberInstanceId: string;
  agentDefinitionId: string;
  runtimeOwnershipTeamId: string;
};

type TeamMembership = {
  teamId: string;
  memberName: string;
  memberInstanceId: string;
  role?: 'member' | 'coordinator' | 'representative';
  representsTeamId?: string | null;
};
```

Under this model, `review_lead` has one `AgentMemberInstance` and two membership edges:

```text
AgentMemberInstance: review_lead_instance

TeamMembership:
  teamId: ParentTeam
  memberName: review_lead
  memberInstanceId: review_lead_instance
  role: representative
  representsTeamId: BuildSquad

TeamMembership:
  teamId: BuildSquad
  memberName: review_lead
  memberInstanceId: review_lead_instance
  role: coordinator
```

### Identity Rule

The canonical runtime identity becomes `memberInstanceId`, not only `memberRouteKey`.

Membership paths become aliases or contextual addresses:

```text
ParentTeam/review_lead      -> review_lead_instance
BuildSquad/review_lead      -> review_lead_instance
```

Events, transcripts, approvals, metadata, and lifecycle ownership must resolve both membership paths to the same runtime instance.

## Why This Is A Larger Refactor

Today the implementation largely assumes this equivalence:

```text
team member node path = runtime identity = event source path = metadata path = UI tree path
```

True shared membership breaks that equivalence. It requires a new identity layer and touches many core boundaries:

- agent-team definition schema;
- topology planning and validation;
- duplicate-name and duplicate-membership handling;
- runtime member registry and handle lifecycle;
- AgentRun ownership and start/stop semantics;
- run metadata and restore;
- event `sourcePath` versus canonical instance id;
- `send_message_to` recipient resolution;
- team communication projections;
- tool approval routing;
- frontend tree, focus, history, and transcript hydration.

This should not be added as a small extension to nested team routing. It should be designed as a dedicated organization-membership model.

## Future Data-Flow Spines

### Definition To Runtime Construction

```text
AgentTeamDefinition with shared member references
-> TeamDefinitionTopologyPlanner builds membership graph
-> AgentMemberInstance registry deduplicates runtime instances
-> TeamRun construction creates one handle per instance
-> TeamMembership indexes expose contextual team rosters
```

### Communication Resolution

```text
send_message_to('review_lead') in ParentTeam
-> current team membership roster resolves ParentTeam/review_lead
-> membership address maps to review_lead_instance
-> runtime delivery uses the single member instance
-> communication projection records contextual sender/receiver membership plus canonical instance id
```

### Event Projection

```text
AgentRun event from review_lead_instance
-> runtime event carries canonical memberInstanceId
-> projection attaches all relevant contextual membership addresses
-> frontend displays event under the focused team context without duplicating the transcript
```

## Open Design Questions

- Which team owns lifecycle for a shared member instance when multiple teams include it?
- Can a shared member have different runtime/model/workspace overrides per membership, or must those be instance-owned?
- How should user-visible duplicate names be handled when two shared members appear in one team context?
- Should transcripts be strictly instance-owned, or should each membership context have a filtered view over the same transcript?
- How should metadata restore handle a team that references a member instance whose owning team is not restored?
- Should shared membership be allowed only for subteam coordinators/representatives first, or for arbitrary members?

## Recommendation

Keep the current nested mixed-team implementation on the simpler representative-exposure model. It provides the needed parent/child communication behavior now without changing the whole identity system.

Treat true shared member instances across multiple teams as a future feature with its own requirements, design review, migration plan, and validation matrix.
