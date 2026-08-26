# Adjacent Application Agent Addressing Evaluation

## Decision

`Investigated — Separate ticket recommended.`

This concern is evidence-backed and potentially worthwhile, but it is a versioned public SDK/protocol/data-shape change. Combining it with the application-execution ownership refactor would mix two independent authoritative boundaries, enlarge the transition and verification surface, and prevent the execution-scope change from remaining behavior-neutral.

Approval applicability: `N/A` for this ticket. This artifact records evidence and a follow-up recommendation; it does not authorize an address/schema change.

## Current Evidence

| Current shape | Evidence | Assessment |
| --- | --- | --- |
| `ApplicationAgentTargetAddress` contains `bindingId` plus `target.kind` (`AGENT_RUN`, `AGENT_TEAM_RUN`, or `AGENT_TEAM_MEMBER` with `agentRunId`) | `autobyteus-application-sdk-contracts/src/application-agent-bindings.ts` | root Agent-vs-Team classification duplicates the already authorized binding subject |
| Binding runtime already has `runtime.subject: AGENT_RUN | TEAM_RUN` | same contracts and server binding store/authorization | authoritative source exists after binding authorization |
| Every production Team binding member is written as `runtimeKind: AGENT_TEAM_MEMBER` | `application-run-binding-launch-service.ts` | `ApplicationAgentTeamBindingMember.runtimeKind` is currently redundant |
| Application events already carry `runtimeSubject`; event mapping implies Agent producer for AGENT_RUN and Team-member producer for TEAM_RUN Agent events | event contracts and stream mapper | `ApplicationExecutionProducer.runtimeKind` appears derivable |
| Socratic application looks up `/tutor` and manually copies its exact `agentRunId` into the transport address | `applications/socratic-math-teacher/backend-src/domain/lesson-model.ts` | application business code is forced to repeat binding-owned resolution |
| Frontend validator/connection and URL codec require and compare the current shape | frontend SDK contracts/validator/connection | change is cross-package and must be cleanly versioned |
| Binding summary is JSON, but `__autobyteus_run_binding_members.runtime_kind` is a physical required column; event journals store producer JSON | `ApplicationRunBindingStore` schema/read/write path | field removal needs a deliberate physical persistence decision, not an incidental edit |

## Candidate Clean Target For A Separate Ticket

Application-facing address:

```ts
type ApplicationAgentTargetAddress = Readonly<{
  bindingId: string;
  memberAddress?: AgentTeamAddress;
}>;
```

- Omitted `memberAddress` addresses the bound subject: standalone Agent or Team root.
- `memberAddress` is valid only for a Team binding and must exact-match a binding-owned nested logical address.
- Binding authorization produces a private exact target:

```ts
type ResolvedApplicationAgentTarget =
  | { subject: "AGENT_RUN"; agentRunId: string }
  | { subject: "TEAM_RUN"; teamRunId: string; memberAgentRunId: string | null };
```

Exact run IDs remain mandatory internally for dispatch, event subscription, identity correlation, and fail-closed authorization.

## Required Separate-Ticket Spine

`application business code -> SDK address builder -> transport/URL codec -> binding authorization -> exact memberAddress resolution -> private exact run target -> input/stream dispatch -> event/READY equality`

Return path:

`exact run event -> event mapper derives classification from runtimeSubject -> protocol event -> frontend validator/connection -> application consumer`

## Required Consumer Inventory

- SDK contracts, backend address builders, target URL codec, frontend validator and connection equality.
- Server target authorization, orchestration input dispatch, stream source, event mapper, engine protocol.
- Brief and Socratic application projections/reconciliation.
- Vendored/generated application package copies and all durable contract tests.
- Binding/member physical store and event-journal persistence.

## Persistence Decision Still Required

The separate ticket must choose one clean outcome:

1. keep the physical member `runtime_kind` column as a deliberately derived storage index while removing it from public/domain JSON, with current writers supplying the single value; or
2. remove the physical column through the repository's registered migration mechanism.

It must not introduce runtime dual reads, compatibility aliases, or two public address systems. Evidence is presently insufficient to choose between those physical outcomes, so the persistence decision for that future ticket is `Undetermined`.

## Boundary With This Ticket

The future binding/address resolver belongs **above** `ApplicationExecutionScope`. It authorizes `bindingId`/`memberAddress`, creates a private exact run target, then calls the scope's narrow input/stream capability. The scope must not know the public address representation or perform application-ID/member-address routing.

