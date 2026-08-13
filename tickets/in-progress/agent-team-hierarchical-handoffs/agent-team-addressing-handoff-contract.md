# AgentTeam Addressing And Handoff Contract

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-addressing-handoff-contract.md`
- Type: Intended-behavior contract supplement
- Scope: Ticket 1 collaboration protocol with the SR-025 exact Agent-facing prompt copy and SR-026 AgentRun input-admission linkage
- Status: `Refined — SR-026 input-admission linkage aligned; addressing and handoff protocol unchanged`
- Approval applicability: The user approved the AgentTeam-first split, filesystem-like addressing, unchanged authored `from`/`to` handoff endpoints, sender-only rule retrieval, AgentTeam-as-coordinator targeting, clean removal of synthetic child-Team representatives, the same canonical `recipient_address` for `send_message_to` and `delegate_task`, the minimal SR-006 caller/recipient values, and the SR-010 LLM contract. SR-011 additionally requires later three-runtime live proof through an imported nested-classroom Team. SR-012 changed only the separate application SDK compatibility design, and SR-013 changes only the persisted predecessor migration interpretation and sequencing. SR-014 introduced one exact natural Agent-facing renderer template; SR-025 refines only that copy and presentation into two naturally ordered sibling sections without changing protocol behavior. SR-026 keeps the same address/resolver/delivery path and assigns post-resolution active-input acceptance/sequencing solely to AgentRun.
- Related requirements: R-001 through R-031, R-043, R-047, and R-057
- Related acceptance criteria: AC-001 through AC-025, AC-039, AC-043, and AC-052
- Related comprehensive identity supplement: [team-run-canonical-identity-refactor.md](./team-run-canonical-identity-refactor.md)
- Related live-validation supplement: [nested-classroom-live-validation-contract.md](./nested-classroom-live-validation-contract.md)
- Exact system-instruction copy: [agent-team-collaboration-system-instruction.md](./agent-team-collaboration-system-instruction.md)

## 1. Contract Purpose

An AgentTeam is a reusable, coordinator-led collaboration tree. Its member topology must be addressable without flattening child teams or pretending that a child coordinator is a direct member of its parent. The same topology supplies stable natural-language handoffs that an Agent can retrieve when deciding whether and where to pass work.

This contract deliberately separates five concepts:

1. **Topology** answers which Agent or AgentTeam placement an address denotes.
2. **Handoff guidance** tells a source Agent when it should send work to a target.
3. **Recipient addressing** resolves the same logical address to an Agent or Team placement for any supported recipient-oriented operation.
4. **Operation semantics** apply after resolution: `send_message_to` delivers an ordinary message, while `delegate_task` creates task execution for the resolved placement.
5. **Identity derivation** stores one canonical absolute logical address after mounting; segments, parents, local names, breadcrumbs, and storage encodings are boundary-derived views rather than parallel identities.

Handoffs are guidance, not access-control rules and not a framework-evaluated condition language.

## 2. Collaboration Tree Vocabulary

- **Collaboration root**: The outermost AgentTeam of one standalone AgentTeam run. It is denoted by `/`.
- **Team placement**: An AgentTeam member mounted at one path in the collaboration tree.
- **Agent placement**: An executable Agent leaf mounted at one path in the collaboration tree.
- **Immediate Team**: The Team placement that directly contains the calling Agent placement.
- **Coordinator targeting**: Addressing an AgentTeam resolves ordinary message delivery to that AgentTeam's configured direct coordinator Agent.
- **Authored address**: An absolute address stored inside one reusable AgentTeam definition and interpreted from that definition's own root.
- **Effective address**: The authored address after the definition is mounted into the outer collaboration tree.
- **Canonical logical address**: The single absolute `/...` identity assigned to a mounted Agent or Team placement. `./...` is only a caller-relative request expression and is never stored as placement identity.

AgentTeam remains coordinator-led. Its configured coordinator must remain a direct Agent member of that Team definition. Ticket 1 does not turn AgentTeam into the coordinator-free AgentOrg subject planned for Ticket 2.

## 3. Runtime Address Grammar

### 3.1 Accepted forms

Both `send_message_to.recipient_address` and `delegate_task.recipient_address` accept the logical address forms below for a Team-bound Agent. The public field is named **address** because it identifies the recipient's logical location; the filesystem metaphor defines its grammar, not a physical-path field. Before resolution its value is a `RecipientAddressExpression`. Both tools use the same parser, caller-relative/root-absolute normalization, rooted TeamRun traversal, and typed Agent-or-AgentTeam recipient result.

```ts
declare const recipientAddressExpressionBrand: unique symbol;

type RecipientAddressExpression = string & Readonly<{
  [recipientAddressExpressionBrand]: true;
}>;
```

The external JSON field is a string. Only the shared strict parser may construct the opaque `RecipientAddressExpression`, and only the validated `/...` and `./...` forms below inhabit it. The resolver immediately converts it to canonical absolute `AgentTeamAddress`; the expression is never persisted as node identity.

| Form | Starting point | Meaning |
| --- | --- | --- |
| `./` | Calling Agent's immediate Team | The immediate Team itself; deliver through its configured coordinator. |
| `./segment[/segment...]` | Calling Agent's immediate Team | Resolve the relative child path from that Team. |
| `/` | Collaboration root | The root Team itself; deliver through its configured coordinator. |
| `/segment[/segment...]` | Collaboration root | Resolve the absolute path from the outermost TeamRun. |

Every non-final segment must resolve to an AgentTeam placement. The final segment may resolve to an Agent placement or an AgentTeam placement.

### 3.2 Final placement and operation behavior

- Final **Agent**: resolve that exact Agent placement. Message delivery targets that Agent; task delegation starts a task-Agent for the same logical placement.
- Final **AgentTeam**: resolve that exact Team placement. Message delivery targets its configured coordinator Agent; task delegation starts a task-Team for that placement and sends its work packet through the same real configured coordinator.
- `/` or `./`: resolve the corresponding Team placement. `send_message_to` may use its configured coordinator. `delegate_task` then rejects it as outside the existing direct-child task eligibility of the caller's immediate Team.
- An AgentTeam-target operation must preserve the actual coordinator Agent identity; it must not create a synthetic representative Agent.

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
- an address that resolves back to the calling Agent, including an AgentTeam target whose coordinator is the caller.

There is no short-name fallback, global leaf-name search, coordinator-name projection, caller-supplied target kind, or case-insensitive guessing. `delegate_task` may apply task-specific eligibility after a placement resolves, but it may not reinterpret the address or consult a second flat target authority.

### 3.4 Member-name invariants

Each authored `memberName` used as a path segment must:

- be non-empty and already trimmed;
- not equal `.` or `..`;
- contain neither `/` nor `\`;
- be unique among siblings, including rejection of sibling names that differ only by case.

Address resolution uses the exact stored spelling. The case-insensitive sibling uniqueness rule prevents two LLM-visible addresses that differ only by letter case.

### 3.5 One canonical address and derived views

Definition mounting determines the canonical address by concatenating the parent mount address and each `memberName`. Once the rooted AgentTeam is fixed, a placement has exactly one canonical logical address:

```text
mounted AgentTeam: /research_team/research_lead
canonical address: /research_team/research_lead
```

The shared caller coordinate is exhaustive:

```ts
type MemberLogicalAddressContext = Readonly<{
  rootTeamRunId: string;
  memberAddress: AgentTeamAddress;
}>;
```

`rootTeamRunId` selects the concrete run snapshot; `memberAddress` selects the logical Agent placement inside it. The context contains no supplied member path, immediate-Team path/address, route key, owner coordinate, target list, handoffs, or operation state.

The shared `AgentTeamAddress` capability derives:

```text
segments(/research_team/research_lead)
  = [research_team, research_lead]

basename(/research_team/research_lead)
  = research_lead

parentAddress(/research_team/research_lead)
  = /research_team

storageSegments(/research_team/research_lead)
  = [research_team, research_lead]
```

These functions return values, not stored identity fields. `storageSegments` is available only to storage encoders and does not recreate a public route key. Collaboration owns strict `RecipientAddressExpression` parsing and resolves that expression to `AgentTeamAddress`. A provider adapter may clone the field/value but must not rename it to `recipient_name`, add `recipient_path`, reconstruct a parallel path array, or parse independently. Rooted-tree lookup, not string syntax, determines whether an address exists, whether it denotes an Agent or AgentTeam, and which configured Agent coordinates an AgentTeam.

The shared placement result is likewise exhaustive:

```ts
type ResolvedTeamRecipient =
  | Readonly<{
      kind: "agent";
      address: AgentTeamAddress;
    }>
  | Readonly<{
      kind: "agent_team";
      address: AgentTeamAddress;
      coordinatorAddress: AgentTeamAddress;
    }>;
```

For an AgentTeam, `coordinatorAddress` is retained because it is configured data, not syntactically derivable from the AgentTeam address. Subject wrappers, owner objects, path arrays, route keys, metadata nodes, config objects, handles, and lifecycle IDs are forbidden in this shared value.

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
| `/product_manager` | `./research_team` | AgentTeam coordinator entry to `/research_team/research_lead`. |
| `/product_manager` | `./research_team/research_lead` | Exact delivery to `/research_team/research_lead`. |
| `/product_manager` | `./research_team/field_team/interviewer` | Exact nested delivery. |
| `/research_team/research_lead` | `./field_team` | AgentTeam coordinator entry to `/research_team/field_team/field_lead`. |
| `/research_team/field_team/interviewer` | `/product_manager` | Exact upward/root delivery without parent projection. |
| `/research_team/field_team/interviewer` | `/design_team/team_lead` | Exact cross-branch delivery. |
| `/research_team/field_team/interviewer` | `/` | Root AgentTeam coordinator entry to `/product_manager`. |
| `/research_team/research_lead` | `research_lead` | Rejected because bare names are invalid. |
| `/research_team/research_lead` | `../product_manager` | Rejected because parent traversal is invalid. |

If both `/research_team/team_lead` and `/design_team/team_lead` exist, their full paths remain unambiguous. No global uniqueness constraint applies to leaf names in different Team placements.

The same values identify task recipients:

```json
{
  "recipient_address": "./field_team",
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
- `to: "/"` means the current definition's AgentTeam coordinator entry.
- `from: "/"` is invalid because the Team itself is not an Agent caller.
- `from` and `to` must not resolve to the same Agent after AgentTeam-coordinator-entry resolution.

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

### 8.1 Tool shape and projection

- Canonical name: `get_handoff_rules`
- Arguments: none
- Availability: intrinsic to every active Team-bound Agent; absent from a standalone non-Team Agent unless another supported context explicitly provides a different capability
- Result: only the caller's ordered, actionable handoff choices
- No incoming-edge projection
- No framework rule evaluation
- No mutation or `update_agent_team` behavior
- Tool description: explain that the call returns the current Agent's possible handoffs as `when` conditions and canonical `recipient_address` destinations; do not mention an acceptance envelope or require arguments

The model-visible success type is deliberately smaller than the authored graph and smaller than a generic service result:

```ts
type HandoffInstruction = Readonly<{
  when: string;
  recipient_address: AgentTeamAddress;
}>;

type GetHandoffRulesResult = Readonly<{
  handoffs: readonly HandoffInstruction[];
}>;
```

Caller binding and tool projection have separate singular owners:

```text
compiled metadata handoffs
  -> Team collaboration-context builder retains edges where edge.from === caller.memberAddress
  -> immutable caller.outgoingHandoffs
  -> handoff guidance projector visits each edge in authored/compiled order
  -> for each edge.rules item in rule order
  -> emit {when: ruleText, recipient_address: edge.to}
```

The context builder is the only caller filter; neither the tool service nor provider adapters re-filter or receive the full graph. `from` is omitted because the caller is already bound. `to` becomes `recipient_address` so it can be passed directly to `send_message_to`. Each `rules[]` item becomes one scalar `when`, which gives the LLM one condition and one destination per decision row. The service must not return `accepted`, a success `code`, a generic `message`, a `result` wrapper, `member_address`, `from`, `to`, or a nested `rules` array.

For the example below, assume the collaboration root mounts a `/software_engineering` child AgentTeam containing the listed direct Agents. The result shape is independent of that particular topology:

```json
{
  "handoffs": [
    {
      "when": "The design is complete and ready for architecture review.",
      "recipient_address": "/software_engineering/architecture_reviewer"
    },
    {
      "when": "A downstream finding exposes a requirement or design gap.",
      "recipient_address": "/software_engineering/solution_designer"
    }
  ]
}
```

Multiple rule strings on one authored edge become multiple adjacent rows with the same `recipient_address`. No outgoing handoffs is exactly:

```json
{
  "handoffs": []
}
```

There is no normal non-Team result. Provider catalogs/materializers do not expose this Team-bound adapter without a valid collaboration binding. If an internal caller violates that invariant, the service raises a typed `COLLABORATION_CONTEXT_REQUIRED` tool failure for diagnostics; adapters use their native tool-error channel and must not fabricate `{handoffs:[]}` or a success envelope.

### 8.2 Intrinsic exposure

Team collaboration is a runtime protocol, not an optional package convention:

- after package-configured tools are resolved, Team runtime adds `get_handoff_rules` and `send_message_to` to every Team-bound Agent and de-duplicates their canonical names;
- both tools bind to the exact caller collaboration context before provider materialization;
- AutoByteus, Codex App Server, Claude Agent SDK, and server-hosted Agent Tools MCP expose the same two Team capabilities regardless of whether the underlying Agent package listed them in `toolNames`;
- standalone non-Team Agents keep the normal configured-tool policy and do not receive this Team-only handoff tool automatically; and
- authored handoffs remain guidance, not authorization: intrinsic `send_message_to` permits ordinary Team communication even when no handoff condition exists.

This removes an invalid state in which the system prompt requires a handoff lookup but the Agent package omitted the tool needed to perform it.

### 8.3 Provider-visible representation

- AutoByteus returns the compact JSON serialization of `GetHandoffRulesResult`.
- MCP returns the same JSON in `content[0].text` and the deep-equal object in `structuredContent`.
- A successful empty list is not an error.
- A genuine internal invariant failure uses the provider tool-error channel; it is not encoded as a successful result object.
- `send_message_to` retains its separate code-preserving delivery result defined in §9.1. The two tools do not share a generic response envelope because their LLM-facing decisions differ.

### 8.4 System-instruction protocol

Every Team-bound Agent receives two provider-neutral sibling sections—`AgentTeam Addressing` followed by `AgentTeam Collaboration`—at the provider's established system-instruction seam. They appear after the optional authored Team instruction and before working-environment guidance, with no `Team Runtime` wrapper. Providers may differ in bootstrap timing and outer message representation, but not in wording, order, or meaning. The authoritative implementation-copy template and provider injection matrix are defined only in [agent-team-collaboration-system-instruction.md](./agent-team-collaboration-system-instruction.md).

The renderer substitutes only the caller's canonical absolute address. The first section explains the general directory/file/subdirectory analogy and `/`/`./` grammar before locating the current Agent within that model and giving examples. The second section explains how the Agent uses addresses for messaging and direct-child task delegation, then how it checks configured handoff rules when finished or blocked and notifies each applicable recipient through accepted delivery. It must not inject the full member roster, rooted topology, or natural-language handoff set. A separate future directory/discovery tool may expose broader topology if product behavior requires it; `get_handoff_rules` remains caller-action-specific.

## 9. `send_message_to` Contract

`send_message_to` remains the single delivery tool and keeps exactly one selector:

- `recipient_address`: the hierarchical logical address defined here;
- `target_agent_run_id`: the existing exact, currently active AgentRun route.

The two selectors remain mutually exclusive. `recipient_address` replaces the implemented flat-roster name `recipient_name` cleanly; no alias is accepted. It must not route exact run IDs through the AgentTeam tree.

```ts
type SendMessageToToolArguments =
  | Readonly<{
      recipient_address: string;
      target_agent_run_id?: never;
      content: string;
      message_type?: string;
      reference_files?: readonly string[];
    }>
  | Readonly<{
      recipient_address?: never;
      target_agent_run_id: string;
      content: string;
      message_type?: string;
      reference_files?: readonly string[];
    }>;
```

The shared input parser converts `recipient_address` to internal `{recipientAddress: RecipientAddressExpression}` before dispatch. Provider adapters must not bypass that parser or create their own expression type.

Any Agent placement within the same collaboration root can address any valid Agent or Team placement in that root. Handoff edges guide LLM behavior but do not authorize or forbid delivery.

`content` remains a required self-contained message body. `reference_files`, when present, remains an absolute-local-path attachment/reference list in addition to that explanation; it is not a substitute for telling the recipient what was completed, blocked, or requested.

The runtime instruction must identify:

- the calling Agent's canonical absolute address;
- the `/` grammar and that `./` starts from the calling Agent's parent/immediate AgentTeam;
- AgentTeam-coordinator-entry behavior; and
- the separately scoped exact-run selector.

It must not advertise a synthetic flat recipient roster.

### 9.1 Provider-visible delivery result

`send_message_to` retains its delivery-oriented `{accepted, code, message, result}` envelope, with `result: null` for success and rejection. `get_handoff_rules` deliberately does not share this envelope. Existing dispatcher/global-router codes are copied exactly, including the exact-run selector's codes.

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

`delegate_task` accepts the same `recipient_address` selector as message delivery:

```json
{
  "recipient_address": "./field_team",
  "description": "Conduct the approved interview set.",
  "reference_files": []
}
```

The old public `{target:{kind:"member"|"team",name}}`, `recipient_name`, and `recipient_path` shapes are removed. The common recipient resolver, not the caller, determines whether the canonical address denotes an Agent or AgentTeam. The same parsed and normalized address must resolve to the same recipient for `send_message_to` and `delegate_task`.

That recipient is exactly Agent `{kind:"agent",address}` or AgentTeam `{kind:"agent_team",address,coordinatorAddress}`. It contains no subject wrapper, owner coordinate, path array, route key, TeamRun node/config, runtime/provider setting, handle, role/description, definition ID, or run/task lifecycle identity. Message delivery maps the selected effective Agent address through the root manager's private address/handle boundary. Task delegation derives direct-parent facts from the recipient address, then selects the exact node and genuine Agent launch facts from the caller's rooted TeamRun tree. Neither operation reads a localized tree or reconstructs a route key.

Operation behavior starts only after common resolution:

- derive `callerTeamAddress = parentAddress(caller.memberAddress)` and `targetOwnerAddress = parentAddress(placement.address)`;
- only exact equality of those canonical addresses makes the placement a candidate direct task target; root Team has no parent and is ineligible;
- a direct Agent placement must exist as a direct Agent node under `callerTeamAddress`; that node's genuine Agent fields provide task launch input while task execution allocates its own run ID;
- a direct child AgentTeam placement must exist as a direct `agent_team` node, requires `parentAddress(coordinatorAddress) === placement.address`, and maps the configured coordinator to exactly one direct Agent node;
- the caller Agent is rejected, and any otherwise valid non-direct/deeper/cross-branch placement is rejected with `TASK_DELEGATION_TARGET_NOT_ELIGIBLE` before activation;
- exact `target_agent_run_id` remains message-only and is not a task selector; and
- handoff edges remain guidance and never authorize delegation.

Any Agent or Team placement in the collaboration root is address-resolvable, so both tools agree on what a path denotes. Task eligibility remains the current lifecycle boundary rather than expanding silently: the resolved placement's derived parent must be the caller's derived immediate Team. A task target manifest may list eligible canonical absolute addresses, roles, and descriptions for discovery, but it is not a resolver and must not advertise or accept flat names.

Removing synthetic communication representatives does not remove the real coordinator identity required by a resolved AgentTeam task target. That relationship is the AgentTeam node's configured `coordinatorAddress`. The task-delegation subsystem maps the common typed recipient into its own minimal task execution identity; it does not derive targets from a communication roster.

Three-level example:

```text
One rooted TeamRun tree:
/
└── /research_team                          AgentTeam; coordinator /research_team/research_lead
    ├── /research_team/research_lead        Agent
    └── /research_team/field_team           AgentTeam; coordinator /research_team/field_team/field_lead
        └── /research_team/field_team/field_lead  Agent
```

The root TeamRun and persistent/restored `/research_team` and `/research_team/field_team` children reference the same rooted metadata/index and select by absolute Team address. A task AgentTeam materializes fresh kind-specific run IDs from the selected source subtree while preserving every absolute node/coordinator address. Direct-member selection is `teamRunTreeIndex.getDirectChildren(teamAddress)`, and coordinator lookup is `teamRunTreeIndex.getCoordinator(teamAddress)`. No execution receives a child-local address tree, and there is no prefix stripping, path rebasing, coordinator rewrite, basename-based global lookup, or root/local fallback.

For caller `/research_team/research_lead`, `delegate_task({recipient_address:"./field_team"})` resolves `/research_team/field_team`, proves that its parent is `/research_team`, and starts the task AgentTeam through configured coordinator `/research_team/field_team/field_lead`. The task identity and active task execution retain the new concrete `taskTeamRunId`; logical addresses remain unchanged.

That task coordinator relation:

- is configured on the rooted AgentTeam node and selected after the common resolver identifies the AgentTeam placement;
- is consumed by task activation/lifecycle paths and by ordinary AgentTeam-target message delivery;
- is not a second address alias or a participant identity invented by `send_message_to`;
- remains non-null for every valid AgentTeam node; and
- is validated during TeamRun-tree compilation and legacy-data migration before old representative, coordinator-route, and localized config structures are removed.

## 10. TeamRun Snapshot And Definition Refresh Behavior

Ticket 1 is static per TeamRun:

- Launch compiles the definition graph and Agent launch input directly into one immutable schema-v3 `rootTeam` execution tree with top-level `handoffs` and typed run IDs on nodes.
- Root, persistent child, and restored TeamRun execution contexts reference that same rooted metadata/index and select their direct members by canonical Team address.
- An active TeamRun keeps that snapshot even if a definition file or definition catalog later changes.
- A restored TeamRun receives the same schema-v3 snapshot persisted for that run; restoration does not compile current definitions into old history.
- A task AgentTeam is a new execution and materializes fresh kind-specific run IDs from the selected subtree without changing any absolute address. No persistent-child tree copy, local path/route form, prefix strip, rebase, or recursive localizer exists.
- A newly launched TeamRun uses the latest explicitly refreshed/cached definitions available at launch.
- No file-system watching, live AgentTeam reconciliation, rule-change notification, or in-place member addition/removal is included.

Those dynamic behaviors belong to the later AgentOrg ticket.

## 11. Existing Data Behavior

- Existing `team-config.json` without `handoffs` normalizes to `handoffs: []`.
- Legacy recursive `team_run_metadata.json` is migrated to schema v3 before the current TeamRun reader runs. An absent legacy handoff snapshot becomes an empty `handoffs` array during that migration.
- Structured communication/task records, token usage, external bindings, and application launch/run stores migrate to the canonical execution/address model as specified in [team-run-canonical-identity-refactor.md](./team-run-canonical-identity-refactor.md) §§11–12.
- Derived indexes rebuild. Physical Agent memory directories and stable context-file paths remain directly usable and are not relocated.
- The required canonical-identity migration is ordered, backup-producing or transactional, idempotent, and blocking: incomplete conversion prevents server bootstrap/listen.
- Normal runtime readers/writers accept only the target current schema; old-schema knowledge is confined to migration input modules and fixtures.
- New definition and TeamRun writes include the canonical handoff field/snapshot.
- Missing handoffs never cause the runtime to derive rules from arbitrary Agent instructions or skills.
- Old `recipient_name`, proposed `recipient_path`, and bare-name values are not retained as fields or fallbacks.
- Opaque provider raw tool arguments are retained as historical display payloads but are never interpreted as active Team routing identity.

## 12. Error Expectations

`send_message_to` rejects invalid delivery input with the required `{accepted:false,code,message,result:null}` envelope. `delegate_task` retains its task-owned outer result/error container while exposing the same shared address-resolution code for the same syntax/topology failure and the task-specific eligibility codes below. `get_handoff_rules` success is the minimal §8 object; an impossible missing Team binding is a provider tool error carrying typed internal diagnostics. No delivery/task adapter may collapse a stable operation code into message-only output or silent fallback:

| Cause | Stable code |
| --- | --- |
| Address does not start with `/` or `./` | `COLLABORATION_ADDRESS_INVALID` |
| `../`, repeated slash, backslash, trailing slash, or invalid segment | `COLLABORATION_ADDRESS_INVALID` |
| Missing segment | `COLLABORATION_TARGET_NOT_FOUND` |
| Agent appears before final segment | `COLLABORATION_TRAVERSAL_INVALID` |
| Final AgentTeam has no resolvable direct coordinator | `COLLABORATION_TEAM_INGRESS_INVALID` |
| Target resolves to caller | `COLLABORATION_SELF_TARGET_REJECTED` |
| Handoff `from` resolves to AgentTeam | `COLLABORATION_HANDOFF_SOURCE_INVALID` |
| Blank/invalid rule | `COLLABORATION_HANDOFF_RULE_INVALID` |
| Duplicate effective `(from, to)` | `COLLABORATION_HANDOFF_DUPLICATE` |
| Internal `get_handoff_rules` materialization without Team context (not normally provider-visible) | `COLLABORATION_CONTEXT_REQUIRED` |
| `delegate_task` resolves to the caller Agent | `TASK_DELEGATION_SELF_TARGET_NOT_ALLOWED` |
| `delegate_task` resolves to a valid but non-direct/deeper/cross-branch placement | `TASK_DELEGATION_TARGET_NOT_ELIGIBLE` |
| Resolved AgentTeam task target has no exact direct coordinator | `TASK_TEAM_TARGET_INGRESS_NOT_FOUND` |

Existing exact-run codes, including `TARGET_AGENT_RUN_NOT_ACTIVE` and grant-rejection codes, remain unchanged in the same envelope.
The two pre-existing machine codes containing `INGRESS` remain byte-stable for operation compatibility; they are not target field/type terminology and do not authorize an `ingressAddress` alias.

## 13. Use-Case And Behavioral-Span Matrix

This matrix states the minimum end-to-end span that the solution and downstream implementation must preserve. It is intentionally owner-oriented rather than file-prescriptive.

| Use Case | Trigger | Required behavioral span | Observable outcome |
| --- | --- | --- | --- |
| UC-001 Define handoffs | File or GraphQL AgentTeam create/update | Input contract -> definition validation -> canonical persistence -> definition read | `from`/`to`/`rules` round-trip unchanged. |
| UC-002 Local Agent delivery | Agent calls `send_message_to({recipient_address:"./peer"})` | Tool adapter -> shared dispatcher -> address parser/resolver -> TeamRun member delivery -> recipient input/event | Exact local Agent receives once. |
| UC-003 Nested Agent delivery | Agent calls a multi-segment relative or absolute address | Shared dispatcher -> rooted topology traversal -> recursive Team member handle(s) -> exact Agent input/event | Exact nested Agent receives once; no representative. |
| UC-004 AgentTeam coordinator targeting | Final address denotes AgentTeam or `/`/`./` | Address resolver -> AgentTeam coordinator invariant -> exact coordinator delivery | Coordinator Agent receives once; AgentTeam target is not treated as a fake Agent. |
| UC-005 Cross-branch/upward delivery | Nested Agent uses `/...` | Child Agent binding -> collaboration-root resolver -> destination branch traversal -> exact Agent input/event | Any valid placement in the same root is reachable. |
| UC-006 Retrieve handoffs | Team-bound Agent reaches completion or blocked termination and calls `get_handoff_rules` | Intrinsic runtime tool -> bound collaboration snapshot -> outgoing-edge filter -> ordered rule flattening -> minimal provider projection | Only caller-specific `{when,recipient_address}` rows are returned; an empty set is exactly `{handoffs:[]}`. |
| UC-007 Compile nested handoffs | TeamRun launch | Recursive definition topology -> authored-edge validation -> child rebase -> graph composition -> immutable run snapshot | Effective addresses are deterministic; duplicates fail before run use. |
| UC-008 Restore | Restore existing TeamRun | Required legacy conversion -> strict schema-v3 rooted-tree read -> derived address index -> TeamRun execution context -> collaboration context | Mounted Team/history meaning is unchanged; historical absent handoffs become empty during migration. |
| UC-009 Exact-run delivery | Agent calls `send_message_to({target_agent_run_id})` | Existing shared dispatcher -> global active-run router -> AgentRun input/event -> canonical envelope | Existing exact-run semantics, exact code, and no Team projection remain unchanged. |
| UC-010 Invalid address | Agent supplies malformed/unresolvable address | Shared parser/resolver -> typed rejection -> canonical envelope | No recipient input, no accepted Team Communication event, no fallback; code remains machine-readable. |
| UC-011 Runtime parity | Team-bound member runs on AutoByteus, Codex, or Claude | Team runtime intrinsic exposure -> provider instruction/tool materialization -> same collaboration binding -> operation-specific result projection | Equivalent tool availability, filesystem-like completion protocol, minimal handoff object, and send delivery semantics. |
| UC-012 Team default entry | User posts to TeamRun without explicit member target | Existing TeamRun default-target selection -> root coordinator Agent | Existing coordinator-led Team entry remains unchanged. |
| UC-015 Hierarchical Agent task delegation | Agent calls `delegate_task({recipient_address:"./peer",...})` | Shared parser -> shared root placement resolver -> direct-target eligibility -> current TeamRun task-agent activation -> existing task lifecycle | The same Agent placement selected by message addressing receives one managed task execution. |
| UC-015 Hierarchical AgentTeam task delegation | `/research_team/research_lead` calls `delegate_task({recipient_address:"./field_team",...})` | Shared parser -> shared root recipient resolver -> direct-child eligibility -> exact configured coordinator -> task-AgentTeam materialization -> existing task lifecycle | The same AgentTeam placement selected by message addressing receives one task AgentTeam through its real coordinator. |
| UC-016 Canonical-address derivation | Any persistent/restored/task member invokes a recipient operation | Rooted TeamRun tree -> `{rootTeamRunId,memberAddress}` -> address parent/basename derivation -> minimal recipient -> operation policy | No duplicate path/owner/route identity crosses the shared boundary; existing operation result is preserved. |
| UC-017 Rooted child/task-AgentTeam materialization | Resolved task address denotes a direct child AgentTeam of the caller at any root nesting level | Root recipient -> rooted node/coordinator lookup -> task-AgentTeam factory -> fresh typed run IDs with unchanged addresses -> active task execution registration | Eligible AgentTeam target retains its configured coordinator and distinct task run identity; no localization or root/local fallback exists. |
| UC-018 Structured restore migration | Server starts against legacy TeamRun/history/task records | Required migration gate -> store-owned validation/conversion -> backup/transaction -> completion record -> strict current reader | Equivalent identity becomes canonical address/execution address; contradictions block startup with actionable evidence. |
| UC-019 Production contract round trip | Web/SDK client launches or hydrates persistent/task execution | GraphQL/REST/WebSocket -> project SDK -> address-keyed topology plus execution-address-keyed runtime state -> command/event return | No route/path compatibility map; same logical address may retain distinct concrete executions. |
| UC-023 Imported three-runtime live proof | API/E2E imports the staged nested-classroom package and launches a fresh TeamRun for each runtime row | public package import -> runtime/model launch -> intrinsic tool/prompt -> message/task/restore spines -> redacted evidence | AutoByteus, Codex, and Claude prove the same canonical collaboration contract under the required live matrix; no skipped row is Pass. |
| UC-029 Active exact-recipient input | Any supported caller reaches an idle or active exact AgentRun through `recipient_address`, `target_agent_run_id`, browser/external command, application, compaction, or skill input | caller-owned validation/routing -> exact AgentRun admission -> one run-local FIFO -> explicit provider start/append mechanics -> typed internal settlement -> operation-owned result/event projection | The caller receives one truthful admission result without waiting for next-turn forwarding; the message is attempted at most once in FIFO order, and Team delivery projects once without retry. |

## 14. SR-026 Post-Resolution Input Admission

Addressing ends when the shared resolver identifies the exact recipient AgentRun. Both logical `recipient_address` and exact `target_agent_run_id` delivery then call the same `AgentRun.postUserMessage()` boundary. The collaboration layer does not inspect active turns, queue, retry, or choose a provider operation.

For a valid live recipient, `accepted:true` means that AgentRun owns one FIFO, at-most-once forwarding attempt. `send_message_to` preserves its established `DELIVERED` success code/message; AgentRun adds no competing success code. Team `COMMUNICATION` and `MEMBER_INPUT` publish once from that admission result. If the recipient runtime cannot append to its current turn, the call still returns without waiting for that turn to complete, and AgentRun starts one later turn after canonical terminal. Later forwarding or terminal facts do not republish delivery or retry through another route. The exact owner/state/provider contract is [agent-run-input-admission-contract.md](./agent-run-input-admission-contract.md).

## 15. Explicit Non-Goals

- AgentOrg domain definitions, runs, APIs, visualization, or dynamic refresh
- automatic file-system watching
- live mutation of an active AgentTeam topology or handoff snapshot
- handoff condition evaluation by the framework
- handoff authorization/ACL enforcement
- a handoff-update tool
- a compatibility branch for old bare recipient names
- a `recipient_name` or `recipient_path` compatibility field/alias
- a compatibility branch for old `delegate_task target.kind/name` inputs
- changes to external repository-owned Agent/AgentTeam text packages
- changes to task submission, review, settlement, or exact task-run messaging semantics beyond routing the newly resolved logical placement
- native AgentOrg domain, live topology mutation/reconciliation, or cross-process messaging
- physical relocation of Agent memory directories or stable final context files
- rewriting opaque provider raw tool-argument/history payloads as if they were active structured routing identity
- product behavior expansion beyond the identity, contract, persistence, SDK/integration, and production-frontend cleanup defined in the SR-013 requirements and comprehensive/live-validation supplements
