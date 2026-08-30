# Future Feature: Shared Member Instance Across Multiple Teams

## Status

Future feature / not part of the current nested mixed-Team implementation.

The current runtime gives each Agent placement one canonical structural path,
for example `/build_squad/review_lead`. It does not duplicate a child Team
coordinator into the parent as a communication representative. Instead, all
Team-bound Agents use the root topology and explicit logical addresses:

- one canonical absolute non-root `/...` address starts at the collaboration
  root; relative addresses and `/` are invalid;
- an Agent address targets that Agent;
- a Team address targets that Team through its exact direct Agent coordinator
  ingress; and
- bare names and synthetic representative aliases are invalid.

This document records a different future organization model in which one Agent
runtime instance could deliberately own multiple Team membership placements.

## Motivation

Some organizations want one person or Agent instance to participate in several
Teams without starting independent runtimes:

```text
ParentTeam
  program_manager

BuildSquad
  review_lead
  qa_specialist

Shared membership request:
  one review_lead runtime participates in both ParentTeam and BuildSquad
```

Current hierarchical addressing does not imply shared membership. From the
root, `/build_squad/review_lead` reaches the one nested Agent placement, while
`/program_manager` reaches the parent Agent. That already supports nested,
upward, and cross-branch messages without inventing a second membership node.

## Current Model

```text
ParentTeam
  program_manager                 -> /program_manager
  BuildSquad                      -> /build_squad
    review_lead                   -> /build_squad/review_lead
    qa_specialist                 -> /build_squad/qa_specialist
```

`send_message_to({recipient_address:"/build_squad/review_lead",...})` targets the
Agent placement directly. `send_message_to({recipient_address:"/build_squad",...})`
targets the Team and delivers through `/build_squad/review_lead` only when that
Agent is the Team's exact configured coordinator ingress. Sender and receiver
events retain the actual Agent placements; no parent alias rewrites identity.

Task delegation uses the same address parser and placement resolver but applies
an additional rule: the target must be a direct child of the caller's immediate
Team. This task eligibility rule is not shared-membership behavior.

The current shared runtime boundary deliberately stores only
`{rootTeamRunId,memberAddress}` for the caller and returns only Agent
`{kind,address}` or Team `{kind,address,ingressAddress}` placement values.
Immediate Team, path, basename, route, and task ownership are derived from the
canonical address or resolved inside the operation owner. A future
shared-membership design must redefine that canonical-placement relationship
explicitly instead of adding parallel owner/path aliases to the current values.

## Future Target Model

A true shared-membership feature would separate runtime instance identity from
membership placement identity.

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
  role?: "member" | "coordinator";
};
```

One `AgentMemberInstance` could then have two explicit membership records. Each
membership address would resolve to the same runtime instance, while events,
transcripts, approvals, metadata, lifecycle ownership, and restore would need a
defined canonical instance identity.

## Why This Is A Larger Refactor

The current implementation intentionally aligns these subjects:

```text
Agent placement path = runtime ownership = event source path = metadata path
```

True shared membership breaks that alignment and affects:

- AgentTeam definition schema and graph validation;
- lifecycle ownership and start/stop semantics;
- runtime member registries and concurrency rules;
- logical address resolution and ambiguity handling;
- TeamRun metadata and restore;
- event source placement versus canonical instance identity;
- Team Communication and task-delegation projections; and
- frontend tree, focus, history, and transcript hydration.

It must not be implemented by restoring flat recipient rosters, bare-name
fallback, parent representative descriptors, or route-prefix rewriting.

## Open Design Questions

- Which Team owns lifecycle when one instance has multiple memberships?
- Can runtime/model/workspace overrides differ by membership?
- How are duplicate membership names disambiguated in one Team?
- Are transcripts instance-owned or projected per membership context?
- How does restore handle a membership whose owning Team is not restored?
- How do handoff rules address one instance through multiple placements?

## Recommendation

Keep current nested execution on one canonical placement per Agent and use the
root logical-address contract for communication. Treat shared member instances
as a separate future feature with explicit requirements, persistence decisions,
design review, and executable coverage.
