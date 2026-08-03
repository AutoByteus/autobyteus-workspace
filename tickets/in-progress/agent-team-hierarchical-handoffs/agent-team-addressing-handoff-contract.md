# AgentTeam Addressing And Handoff Contract

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-addressing-handoff-contract.md`
- Type: Intended-behavior contract supplement
- Scope: Ticket 1 — static AgentTeam definition/run behavior only
- Status: `Design-ready`; SR-005 shared-placement boundary tightening awaiting architecture re-review
- Approval applicability: The user approved the AgentTeam-first split, filesystem-like addressing, unchanged `from`/`to` handoff endpoints, sender-only rule retrieval, Team-as-coordinator-ingress targeting, clean removal of synthetic child-team representatives, and the same canonical recipient addressing for `send_message_to` and `delegate_task`. This file is the normative supplement for the current solution and downstream implementation/review.
- Related requirements: R-001 through R-027
- Related acceptance criteria: AC-001 through AC-022

## 1. Contract Purpose

An AgentTeam is a reusable, coordinator-led collaboration tree. Its member topology must be addressable without flattening child teams or pretending that a child coordinator is a direct member of its parent. The same topology supplies stable natural-language handoffs that an Agent can retrieve when deciding whether and where to pass work.

This contract deliberately separates four concepts:

1. **Topology** answers which Agent or AgentTeam placement an address denotes.
2. **Handoff guidance** tells a source Agent when it should send work to a target.
3. **Recipient addressing** resolves the same logical address to an Agent or Team placement for any supported recipient-oriented operation.
4. **Operation semantics** apply after resolution: `send_message_to` delivers an ordinary message, while `delegate_task` creates task execution for the resolved placement.

Handoffs are guidance, not access-control rules and not a framework-evaluated condition language.

## 2. Collaboration Tree Vocabulary

- **Collaboration root**: The outermost AgentTeam of one standalone AgentTeam run. It is denoted by `/`.
- **Team placement**: An AgentTeam member mounted at one path in the collaboration tree.
- **Agent placement**: An executable Agent leaf mounted at one path in the collaboration tree.
- **Immediate Team**: The Team placement that directly contains the calling Agent placement.
- **Team ingress**: Delivery to a Team placement, resolved to that Team placement's configured coordinator Agent.
- **Authored address**: An absolute address stored inside one reusable AgentTeam definition and interpreted from that definition's own root.
- **Effective address**: The authored address after the definition is mounted into the outer collaboration tree.

AgentTeam remains coordinator-led. Its configured coordinator must remain a direct Agent member of that Team definition. Ticket 1 does not turn AgentTeam into the coordinator-free AgentOrg subject planned for Ticket 2.

## 3. Runtime Address Grammar

### 3.1 Accepted forms

Both `send_message_to.recipient_name` and `delegate_task.recipient_name` accept the canonical logical address forms below for a Team-bound Agent. They use the same parser, caller-relative/root-absolute normalization, collaboration-root topology traversal, and typed Agent-or-Team placement result.

| Form | Starting point | Meaning |
| --- | --- | --- |
| `./` | Calling Agent's immediate Team | The immediate Team itself; deliver through its coordinator ingress. |
| `./segment[/segment...]` | Calling Agent's immediate Team | Resolve the relative child path from that Team. |
| `/` | Collaboration root | The root Team itself; deliver through its coordinator ingress. |
| `/segment[/segment...]` | Collaboration root | Resolve the absolute path from the outermost TeamRun. |

Every non-final segment must resolve to an AgentTeam placement. The final segment may resolve to an Agent placement or an AgentTeam placement.

### 3.2 Final placement and operation behavior

- Final **Agent**: resolve that exact Agent placement. Message delivery targets that Agent; task delegation starts a task-Agent for the same logical placement.
- Final **AgentTeam**: resolve that exact Team placement. Message delivery targets its configured coordinator Agent; task delegation starts a task-Team for that placement and sends its work packet through the same real coordinator ingress.
- `/` or `./`: resolve the corresponding Team placement. `send_message_to` may use its coordinator ingress. `delegate_task` then rejects it as outside the existing direct-child task eligibility of the caller's immediate Team.
- A Team-ingress operation must preserve the actual coordinator Agent identity; it must not create a synthetic representative Agent.

### 3.3 Invalid forms

The resolver rejects rather than guesses or normalizes:

- bare names such as `code_reviewer`;
- `../` or any parent-traversal segment;
- `.` or `..` as a member segment;
- backslashes;
- repeated separators such as `//`;
- a trailing separator except for the exact roots `/` and `./`;
- an Agent placement used as an intermediate segment;
- a missing target;
- an address that resolves back to the calling Agent, including a Team ingress whose coordinator is the caller.

There is no short-name fallback, global leaf-name search, coordinator-name projection, caller-supplied target kind, or case-insensitive guessing. `delegate_task` may apply task-specific eligibility after a placement resolves, but it may not reinterpret the address or consult a second flat target authority.

### 3.4 Member-name invariants

Each authored `memberName` used as a path segment must:

- be non-empty and already trimmed;
- not equal `.` or `..`;
- contain neither `/` nor `\`;
- be unique among siblings, including rejection of sibling names that differ only by case.

Address resolution uses the exact stored spelling. The case-insensitive sibling uniqueness rule prevents two LLM-visible addresses that differ only by letter case.

## 4. Addressing Examples

Given this standalone Team:

```text
/                              product_team (root Team, coordinator: product_manager)
├── product_manager            Agent
├── research_team              AgentTeam (coordinator: research_lead)
│   ├── research_lead          Agent
│   └── field_team             AgentTeam (coordinator: field_lead)
│       ├── field_lead         Agent
│       └── interviewer        Agent
└── design_team                AgentTeam (coordinator: team_lead)
    ├── team_lead              Agent
    └── designer               Agent
```

| Caller | Recipient value | Result |
| --- | --- | --- |
| `/product_manager` | `./research_team` | Team ingress to `/research_team/research_lead`. |
| `/product_manager` | `./research_team/research_lead` | Exact delivery to `/research_team/research_lead`. |
| `/product_manager` | `./research_team/field_team/interviewer` | Exact nested delivery. |
| `/research_team/research_lead` | `./field_team` | Team ingress to `/research_team/field_team/field_lead`. |
| `/research_team/field_team/interviewer` | `/product_manager` | Exact upward/root delivery without parent projection. |
| `/research_team/field_team/interviewer` | `/design_team/team_lead` | Exact cross-branch delivery. |
| `/research_team/field_team/interviewer` | `/` | Root Team ingress to `/product_manager`. |
| `/research_team/research_lead` | `research_lead` | Rejected because bare names are invalid. |
| `/research_team/research_lead` | `../product_manager` | Rejected because parent traversal is invalid. |

If both `/research_team/team_lead` and `/design_team/team_lead` exist, their full paths remain unambiguous. No global uniqueness constraint applies to leaf names in different Team placements.

The same values identify task recipients:

```json
{
  "recipient_name": "./field_team",
  "description": "Conduct the approved field study."
}
```

For caller `/research_team/research_lead`, this resolves the same `/research_team/field_team` Team placement as `send_message_to` and starts a task-Team whose work packet enters through `/research_team/field_team/field_lead`. A direct peer Agent address would start a task-Agent. The caller does not supply `kind`; topology is authoritative. A valid address outside the caller's current direct task eligibility still resolves identically, then receives a task-specific `TASK_DELEGATION_TARGET_NOT_ELIGIBLE` rejection.

## 5. AgentTeam Definition Handoff Schema

`team-config.json` gains one optional top-level `handoffs` array beside `members` and `coordinatorMemberName`:

```json
{
  "coordinatorMemberName": "product_manager",
  "members": [],
  "handoffs": [
    {
      "from": "/product_manager",
      "to": "/research_team",
      "rules": [
        "When product planning needs research before it can continue."
      ]
    },
    {
      "from": "/research_team/research_lead",
      "to": "/product_manager",
      "rules": [
        "When an approved research result is ready for product planning."
      ]
    }
  ]
}
```

The JSON names remain exactly `from`, `to`, and `rules`.

### 5.1 Endpoint rules

- Authored `from` and `to` values must use an absolute definition-root address beginning with `/`; persisted `./` endpoints are invalid because a definition edge has no runtime caller-relative identity.
- `from` must resolve to an Agent placement. Handoff guidance is always retrieved and acted on from an actual Agent's perspective.
- `to` may resolve to an Agent placement or an AgentTeam placement.
- `to: "/"` means the current definition's Team ingress.
- `from: "/"` is invalid because the Team itself is not an Agent caller.
- `from` and `to` must not resolve to the same Agent after Team-ingress resolution.

### 5.2 Natural-language rule semantics

- `rules` is a non-empty array of non-empty, trimmed natural-language strings.
- The framework stores, validates, mounts, returns, and displays these strings but does not evaluate them.
- Each array entry is one independently sufficient handoff trigger; entries are alternatives.
- When several facts must all be true, the author states that conjunction inside one rule string.
- Multiple outgoing handoff edges from one source Agent are valid.
- More than one edge with the same effective `(from, to)` pair is invalid. Authors consolidate all alternative triggers for one pair into that edge's `rules` array.

Good:

```json
{
  "from": "/code_reviewer",
  "to": "/implementation_engineer",
  "rules": [
    "When a review finding is a bounded local implementation defect.",
    "When implementation evidence required by the review is missing."
  ]
}
```

Conjunctive condition in one rule:

```json
{
  "from": "/delivery_engineer",
  "to": "/requirement_engineer",
  "rules": [
    "When delivery is complete and the released outcome satisfies the approved requirement."
  ]
}
```

## 6. Reusable Definition Mounting And Composition

An AgentTeam definition owns a reusable subtree. Its authored `/` is its own definition root, not permanently the outermost runtime root.

Child definition:

```json
{
  "coordinatorMemberName": "research_lead",
  "handoffs": [
    {
      "from": "/research_lead",
      "to": "/field_team",
      "rules": ["When field research must be assigned."]
    },
    {
      "from": "/field_team/interviewer",
      "to": "/research_lead",
      "rules": ["When a field report is ready for research review."]
    }
  ]
}
```

When the child definition is mounted at `/research_team`, the effective edges are:

```json
[
  {
    "from": "/research_team/research_lead",
    "to": "/research_team/field_team",
    "rules": ["When field research must be assigned."]
  },
  {
    "from": "/research_team/field_team/interviewer",
    "to": "/research_team/research_lead",
    "rules": ["When a field report is ready for research review."]
  }
]
```

The parent definition may add cross-boundary edges using its own authored root:

```json
{
  "from": "/research_team/research_lead",
  "to": "/product_manager",
  "rules": ["When approved research is ready for product planning."]
}
```

At TeamRun launch, the runtime recursively:

1. builds the truthful member topology;
2. rebases each child definition's authored handoffs under its mounted Team path;
3. composes them with parent-authored handoffs;
4. rejects invalid endpoints and duplicate effective `(from, to)` pairs; and
5. snapshots the effective topology and handoffs for that TeamRun.

A child definition never names an unknown parent. Upward and cross-sibling edges belong to the parent definition that can truthfully see both endpoints.

## 7. Cross-Team Example Inside A Nested AgentTeam

An AgentTeam can contain two child AgentTeams only if the parent AgentTeam also retains its own direct Agent coordinator, as required by the AgentTeam domain:

```text
/ program_delivery_team (coordinator: program_manager)
├── program_manager
├── requirements_engineering
│   └── requirement_engineer (child coordinator)
└── software_engineering
    ├── architecture_designer (child coordinator)
    └── delivery_engineer
```

Parent-authored cross-team handoffs:

```json
[
  {
    "from": "/requirements_engineering/requirement_engineer",
    "to": "/software_engineering/architecture_designer",
    "rules": [
      "When approved requirements are ready for software architecture design."
    ]
  },
  {
    "from": "/software_engineering/delivery_engineer",
    "to": "/requirements_engineering/requirement_engineer",
    "rules": [
      "When delivery is complete and the released behavior is ready for requirement closure."
    ]
  }
]
```

The two Agents communicate directly through their exact paths. Neither child coordinator is projected as a fake direct parent member.

## 8. `get_handoff_rules` Contract

### 8.1 Tool shape

- Canonical name: `get_handoff_rules`
- Arguments: none
- Context requirement: an active Team-bound Agent collaboration context
- Result: the calling Agent's effective absolute address and only its outgoing handoff edges, inside the canonical communication-tool envelope
- No incoming-edge projection
- No rule evaluation
- No mutation or `update_agent_team` behavior

Every provider-visible communication-tool result contains all four fields in this order:

```json
{
  "accepted": true,
  "code": "HANDOFF_RULES_RETRIEVED",
  "message": "Retrieved 2 outgoing handoff rule edges.",
  "result": {
    "member_address": "/software_engineering/code_reviewer",
    "handoffs": [
      {
        "from": "/software_engineering/code_reviewer",
        "to": "/software_engineering/implementation_engineer",
        "rules": [
          "When a review finding is a bounded local implementation defect."
        ]
      },
      {
        "from": "/software_engineering/code_reviewer",
        "to": "/program_manager",
        "rules": [
          "When the review exposes a requirement or cross-team design gap."
        ]
      }
    ]
  }
}
```

No outgoing handoffs is a successful empty result:

```json
{
  "accepted": true,
  "code": "HANDOFF_RULES_RETRIEVED",
  "message": "Retrieved 0 outgoing handoff rule edges.",
  "result": {
    "member_address": "/software_engineering/api_e2e_engineer",
    "handoffs": []
  }
}
```

Missing collaboration context uses the same shape:

```json
{
  "accepted": false,
  "code": "COLLABORATION_CONTEXT_REQUIRED",
  "message": "get_handoff_rules requires an active Team collaboration context.",
  "result": null
}
```

### 8.2 Exposure and prompt behavior

- `get_handoff_rules` follows the existing configured server-owned Agent tool policy: a runtime exposes it only when the Agent definition selects that tool and the Agent is Team-bound.
- AutoByteus, Codex App Server, Claude Agent SDK, and the server-hosted Agent Tools MCP surface expose the same logical contract.
- AutoByteus returns the compact JSON serialization of the envelope. MCP returns that same JSON in text content, the same object in `structuredContent`, and `isError: true` only for a rejected envelope.
- The runtime instruction may explain the stable communication protocol and tell an Agent to call `get_handoff_rules` when it needs to decide a handoff.
- The full natural-language rules are not copied into every user message or permanently duplicated in Agent instructions.
- External Agent package changes that add the tool name or remove hardcoded prose are a separate package task, not part of Ticket 1.

## 9. `send_message_to` Contract

`send_message_to` remains the single delivery tool and keeps exactly one selector:

- `recipient_name`: the hierarchical logical address defined here;
- `target_agent_run_id`: the existing exact, currently active AgentRun route.

The two selectors remain mutually exclusive. This ticket changes only the Team logical-address meaning of `recipient_name`; it must not route exact run IDs through Team topology.

Any Agent placement within the same collaboration root can address any valid Agent or Team placement in that root. Handoff edges guide LLM behavior but do not authorize or forbid delivery.

The runtime instruction must identify:

- the calling Agent's effective absolute address;
- its immediate Team address;
- the `/` and `./` grammar;
- Team-ingress behavior; and
- the separately scoped exact-run selector.

It must not advertise a synthetic flat recipient roster.

### 9.1 Provider-visible delivery result

`send_message_to` uses the same `{accepted, code, message, result}` envelope as `get_handoff_rules`, with `result: null` for success and rejection. Existing dispatcher/global-router codes are copied exactly, including the exact-run selector's codes.

```json
{
  "accepted": true,
  "code": "DELIVERED",
  "message": "Delivered message to ./implementation_engineer.",
  "result": null
}
```

```json
{
  "accepted": false,
  "code": "COLLABORATION_TARGET_NOT_FOUND",
  "message": "Collaboration target '/missing' was not found.",
  "result": null
}
```

```json
{
  "accepted": false,
  "code": "TARGET_AGENT_RUN_NOT_ACTIVE",
  "message": "Target AgentRun 'run-x' is not active.",
  "result": null
}
```

AutoByteus returns canonical JSON text rather than `Error: <message>` or message-only success. MCP text parses to the same object carried in `structuredContent`; rejected results alone set `isError: true`. If an internal send result omitted a code, the shared result normalizer uses `DELIVERED` for acceptance or `SEND_MESSAGE_TO_FAILED` for rejection. Adapters do not choose provider- or selector-specific replacement codes.

### 9.2 `delegate_task` shared-address contract and task-owned execution

`delegate_task` accepts the same logical recipient selector as message delivery:

```json
{
  "recipient_name": "./field_team",
  "description": "Conduct the approved interview set.",
  "reference_files": []
}
```

The old public `{target:{kind:"member"|"team",name}}` shape is removed. The common logical placement resolver, not the caller, determines whether the canonical address denotes an Agent or Team. The same parsed and normalized address must resolve to the same placement for `send_message_to` and `delegate_task`.

That placement is a deeply immutable logical-coordinate value only: canonical subject address, the exact root route key only when an Agent coordinate needs private message delivery, nullable logical owner Team plus owner-local direct path/route, and the exact canonical Agent ingress for a Team. Derivable root subject paths and Team route keys are omitted. It contains no TeamRun/member config, runtime/provider setting, handle, role/description, definition ID, member run ID, TeamRun ID, or active/template owner-run claim. Message delivery obtains runtime endpoint data privately inside the root manager; task delegation obtains execution identity from the caller's current canonical local TeamRun config.

Operation behavior starts only after common resolution:

- a direct Agent placement in the caller's immediate Team maps to task-owned `TaskDelegationMemberIdentity` and starts a task-Agent;
- a direct child Team placement in the caller's immediate Team maps to task-owned `TaskDelegationTeamIdentity`, obtains its real direct coordinator as `TaskDelegationTeamIngressIdentity`, and starts a task-Team;
- the caller Agent is rejected, and any otherwise valid non-direct/deeper/cross-branch placement is rejected with `TASK_DELEGATION_TARGET_NOT_ELIGIBLE` before activation;
- exact `target_agent_run_id` remains message-only and is not a task selector; and
- handoff edges remain guidance and never authorize delegation.

Any Agent or Team placement in the collaboration root is address-resolvable, so both tools agree on what a path denotes. Task eligibility remains the current lifecycle boundary rather than expanding silently: the resolved placement must be a direct target owned by the caller's immediate TeamRun. A task target manifest may list eligible canonical absolute addresses, roles, and descriptions for discovery, but it is not a resolver and must not advertise or accept flat names. Existing activation, review ownership, submission/review, and settlement semantics remain unchanged.

Removing synthetic communication representatives does not remove the real coordinator identity required by a resolved Team task target. The task-delegation subsystem maps the common typed placement into task execution identity from canonical runtime topology; it does not derive task targets from a communication roster.

Before task ingress is mapped, every child TeamRun config is recursively localized from its parent TeamRun namespace into one child-local namespace. Localization changes descendant member paths/routes and every nested Team coordinator route together. It resolves a Team coordinator against exactly one direct Agent in the source config, then assigns the paired localized Agent route; it never guesses whether a coordinator string is root-prefixed or already local.

Three-level example:

```text
Root TeamRun:
research_team                         Team; coordinator research_team/research_lead
├── research_team/research_lead       Agent
└── research_team/field_team          Team; coordinator research_team/field_team/field_lead
    └── research_team/field_team/field_lead  Agent

Persistent/restored research_team child:
research_lead                         Agent
field_team                            Team; coordinator field_team/field_lead
└── field_team/field_lead             Agent

Persistent/restored or task field_team child:
field_lead                            Agent; child root coordinator field_lead
```

The same child factory and localization operation govern persistent create, restore, and task Team child creation. Restore runtime state and task identity are applied after the topology shape is canonical. For a direct eligible target, task ingress mapping performs exact equality in the caller's current TeamRun canonical local config; it has no parent/root prefix fallback.

That task ingress:

- is derived after the common resolver has selected a Team placement;
- is consumed only by task activation, identity, and lifecycle paths;
- is not a second address alias or a participant identity invented by `send_message_to`;
- remains non-null for every eligible resolved Team target; and
- is established before `SubTeamRepresentativeDescriptor`, generic member descriptors, flat task target names, and native `representative` fallbacks are removed.

## 10. TeamRun Snapshot And Definition Refresh Behavior

Ticket 1 is static per TeamRun:

- Launch compiles the definition graph into one effective topology and handoff snapshot.
- An active TeamRun keeps that snapshot even if a definition file or definition catalog later changes.
- A restored TeamRun receives the same snapshot persisted for that run; restoration does not compile current definitions into old history.
- When a persisted child is materialized during create or restore, its parent-context topology is transformed through the same strict recursive localizer before its `TeamRunConfig` is built; restore state does not bypass or alter localization.
- A newly launched TeamRun uses the latest explicitly refreshed/cached definitions available at launch.
- No file-system watching, live AgentTeam reconciliation, rule-change notification, or in-place member addition/removal is included.

Those dynamic behaviors belong to the later AgentOrg ticket.

## 11. Existing Data Behavior

- Existing `team-config.json` without `handoffs` normalizes to `handoffs: []`.
- Existing current-format `team_run_metadata.json` without a handoff snapshot restores with an empty snapshot.
- No bulk rewrite is required.
- New writes include the canonical handoff field/snapshot.
- Missing handoffs never cause the runtime to derive rules from arbitrary Agent instructions or skills.
- Old bare `recipient_name` delivery is not retained as a fallback.
- Existing task records already persist canonical conversation addresses and typed receiver kind; changing the live `delegate_task` selector does not require rewriting historical task records.

## 12. Error Expectations

The communication tools reject invalid input with the required `{accepted:false,code,message,result:null}` envelope. `delegate_task` retains its task-owned outer result/error container, while exposing the same shared address-resolution code for the same syntax/topology failure and the task-specific eligibility codes below. No adapter may collapse a stable code into message-only output or silent fallback:

| Cause | Stable code |
| --- | --- |
| Address does not start with `/` or `./` | `COLLABORATION_ADDRESS_INVALID` |
| `../`, repeated slash, backslash, trailing slash, or invalid segment | `COLLABORATION_ADDRESS_INVALID` |
| Missing segment | `COLLABORATION_TARGET_NOT_FOUND` |
| Agent appears before final segment | `COLLABORATION_TRAVERSAL_INVALID` |
| Final Team has no resolvable coordinator | `COLLABORATION_TEAM_INGRESS_INVALID` |
| Target resolves to caller | `COLLABORATION_SELF_TARGET_REJECTED` |
| Handoff `from` resolves to Team | `COLLABORATION_HANDOFF_SOURCE_INVALID` |
| Blank/invalid rule | `COLLABORATION_HANDOFF_RULE_INVALID` |
| Duplicate effective `(from, to)` | `COLLABORATION_HANDOFF_DUPLICATE` |
| `get_handoff_rules` outside Team context | `COLLABORATION_CONTEXT_REQUIRED` |
| `delegate_task` resolves to the caller Agent | `TASK_DELEGATION_SELF_TARGET_NOT_ALLOWED` |
| `delegate_task` resolves to a valid but non-direct/deeper/cross-branch placement | `TASK_DELEGATION_TARGET_NOT_ELIGIBLE` |
| Resolved Team task target has no exact direct coordinator ingress | `TASK_TEAM_TARGET_INGRESS_NOT_FOUND` |

Existing exact-run codes, including `TARGET_AGENT_RUN_NOT_ACTIVE` and grant-rejection codes, remain unchanged in the same envelope.

## 13. Use-Case And Behavioral-Span Matrix

This matrix states the minimum end-to-end span that the solution and downstream implementation must preserve. It is intentionally owner-oriented rather than file-prescriptive.

| Use Case | Trigger | Required behavioral span | Observable outcome |
| --- | --- | --- | --- |
| UC-001 Define handoffs | File or GraphQL AgentTeam create/update | Input contract -> definition validation -> canonical persistence -> definition read | `from`/`to`/`rules` round-trip unchanged. |
| UC-002 Local Agent delivery | Agent calls `send_message_to({recipient_name:"./peer"})` | Tool adapter -> shared dispatcher -> address parser/resolver -> TeamRun member delivery -> recipient input/event | Exact local Agent receives once. |
| UC-003 Nested Agent delivery | Agent calls a multi-segment relative or absolute address | Shared dispatcher -> rooted topology traversal -> recursive Team member handle(s) -> exact Agent input/event | Exact nested Agent receives once; no representative. |
| UC-004 Team ingress | Final address denotes Team or `/`/`./` | Address resolver -> Team coordinator invariant -> exact coordinator delivery | Coordinator Agent receives once; Team target is not treated as a fake Agent. |
| UC-005 Cross-branch/upward delivery | Nested Agent uses `/...` | Child Agent binding -> collaboration-root resolver -> destination branch traversal -> exact Agent input/event | Any valid placement in the same root is reachable. |
| UC-006 Retrieve handoffs | Team-bound Agent calls `get_handoff_rules` | Runtime tool adapter -> bound collaboration snapshot -> outgoing-edge filter -> canonical envelope -> provider projection | Only caller's outgoing effective edges are returned with code `HANDOFF_RULES_RETRIEVED`. |
| UC-007 Compile nested handoffs | TeamRun launch | Recursive definition topology -> authored-edge validation -> child rebase -> graph composition -> immutable run snapshot | Effective addresses are deterministic; duplicates fail before run use. |
| UC-008 Restore | Restore existing TeamRun | Metadata read/normalization -> run config/context reconstruction -> collaboration binding | Persisted snapshot is unchanged; historical absent field becomes empty. |
| UC-009 Exact-run delivery | Agent calls `send_message_to({target_agent_run_id})` | Existing shared dispatcher -> global active-run router -> AgentRun input/event -> canonical envelope | Existing exact-run semantics, exact code, and no Team projection remain unchanged. |
| UC-010 Invalid address | Agent supplies malformed/unresolvable address | Shared parser/resolver -> typed rejection -> canonical envelope | No recipient input, no accepted Team Communication event, no fallback; code remains machine-readable. |
| UC-011 Runtime parity | Configured Team member runs on AutoByteus, Codex, or Claude | Provider adapter/MCP -> same shared contracts, collaboration binding, and envelope mapper | Equivalent tool names, envelope objects, resolution, and delivery semantics. |
| UC-012 Team default entry | User posts to TeamRun without explicit member target | Existing TeamRun default-target selection -> root coordinator Agent | Existing coordinator-led Team entry remains unchanged. |
| UC-015 Hierarchical Agent task delegation | Agent calls `delegate_task({recipient_name:"./peer",...})` | Shared parser -> shared root placement resolver -> direct-target eligibility -> current TeamRun task-agent activation -> existing task lifecycle | The same Agent placement selected by message addressing receives one managed task execution. |
| UC-015 Hierarchical Team task delegation | `/research_team/research_lead` calls `delegate_task({recipient_name:"./field_team",...})` | Shared parser -> shared root placement resolver -> direct-child eligibility -> exact task-owned Team ingress -> current TeamRun task-team activation -> existing task lifecycle | The same Team placement selected by message addressing receives one task-Team through its real coordinator. |
| Preserved recursive task-Team materialization | Resolved task address denotes a direct child Team of the caller at any root nesting level | Root placement -> owning current-local subteam config -> strict recursive child localization -> exact coordinator ingress -> task-team factory | Eligible Team target retains non-null real ingress after communication representatives are removed; no root/local fallback exists. |

## 14. Explicit Non-Goals

- AgentOrg domain definitions, runs, APIs, visualization, or dynamic refresh
- automatic file-system watching
- live mutation of an active AgentTeam topology or handoff snapshot
- handoff condition evaluation by the framework
- handoff authorization/ACL enforcement
- a handoff-update tool
- a compatibility branch for old bare recipient names
- a compatibility branch for old `delegate_task target.kind/name` inputs
- changes to external repository-owned Agent/AgentTeam text packages
- frontend work
- changes to task submission, review, settlement, or exact task-run messaging semantics beyond routing the newly resolved logical placement
