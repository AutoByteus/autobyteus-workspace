# Round 8 Design-Impact Rework: Authoritative Delivery-Intent Boundary

## Status

Drafted on 2026-06-08 after fresh code review reported `CR-006` as `Fail / Design Impact`.

This document does not change the Round 5 user-facing `send_message_to` selector model. It enforces it more strictly by removing the remaining pre-resolved recipient endpoint shape above the mixed delivery boundary.

## Design Decision

`send_message_to` must produce an **unresolved delivery intent**, not a pre-resolved delivery request.

Canonical public selector contract remains:

```ts
send_message_to({
  recipient_name?: string;
  target_agent_run_id?: string;
  content: string;
  message_type?: string;
  reference_files?: string[];
})
```

Validation remains:

```text
Exactly one of recipient_name or target_agent_run_id must be provided.
```

The important Round 8 tightening is:

```ts
// Tool/runtime-adapter output. No recipient endpoint here.
type InterAgentMessageDeliveryIntent = {
  teamRunId: string;
  sender: InterAgentMessageDeliveryEndpoint;
  target: TeamMessageTargetSelector;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
};

// Built only after TeamMessageRecipientResolver resolves the target.
type ResolvedInterAgentMessageDeliveryRequest = InterAgentMessageDeliveryIntent & {
  recipient: InterAgentMessageDeliveryEndpoint;
  resolvedTargetKind: "logical_member" | "agent_run" | "task_agent_run";
  targetAgentRunId: string;
  taskId?: string | null;
};
```

`InterAgentMessageDeliveryHandler` / `TeamRun.deliverInterAgentMessage` accepts the unresolved intent. The resolved request is an internal mixed-delivery object only.

## Why CR-006 Is Design Impact

The current implementation partially adopts Round 5 but leaves two target representations in one object:

```text
request.target              // Round 5 target selector
request.recipient.selector  // pre-resolved endpoint from the old shape
```

That violates the Authoritative Boundary Rule because target resolution happens both:

1. above mixed delivery in `inter-agent-message-delivery-request-builder.ts`, and
2. inside mixed delivery in `TeamMessageRecipientResolver`.

The concrete failure risk is a mismatched internal request:

```ts
{
  target: { kind: "recipient_name", recipientName: "reviewer" },
  recipient: endpointFor("worker")
}
```

The current resolver path can follow the endpoint selector instead of proving the target selector. The clean design makes that mismatch unrepresentable.

## Round 8 Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| R8-DS-001 | Primary End-to-End | runtime `send_message_to` tool call | unresolved `InterAgentMessageDeliveryIntent` enters `TeamRun.deliverInterAgentMessage` | runtime adapter + shared parser/intent builder | Keeps adapters thin and prevents pre-delivery recipient lookup. |
| R8-DS-002 | Primary End-to-End | `recipient_name` intent enters mixed delivery | logical local/subteam/parent-boundary recipient resolved or rejected | `TeamMessageRecipientResolver` | Makes roster-name resolution single-owner. |
| R8-DS-003 | Primary End-to-End | `target_agent_run_id` intent enters mixed delivery | exact local member/task-agent run resolved or rejected | `TeamMessageRecipientResolver` + `TaskAgentDirectory` | Keeps exact-run routing general but team-boundary scoped. |
| R8-DS-004 | Primary End-to-End | target belongs to reachable parent boundary | parent team run receives normalized unresolved intent and resolves it | `TeamMemberDeliveryCoordinator` + parent boundary delivery handler | Preserves nested-team messaging without resolving parent recipients in child adapters. |
| R8-DS-005 | Primary End-to-End | invalid hidden selector alias or ambiguous selector | rejected tool result before delivery | shared parser/validator | Removes compatibility/precedence behavior from target selectors. |
| R8-DS-006 | Return/Event | resolved target accepts input | committed Team Communication/member-input projection | `TeamMemberDeliveryCoordinator` | Projection remains truthful committed delivery. |

## Primary Spines

### R8-DS-001 — tool call to unresolved intent

```text
runtime send_message_to call
  -> parseSendMessageToToolArguments
  -> buildTeamMessageTargetSelector(canonical fields only)
  -> buildInterAgentMessageDeliveryIntent(MemberTeamContext sender + target)
  -> MemberTeamContext.deliverInterAgentMessage(intent)
  -> TeamRun.deliverInterAgentMessage(intent)
```

Invariant: the intent builder may build the sender endpoint because the sender is the current member identity. It must not read `communicationRecipients`, return `MemberTeamRecipientDescriptor`, call `memberRegistry.resolveContext`, or construct a recipient endpoint.

### R8-DS-002 — recipient-name resolution inside mixed delivery

```text
TeamRun.deliverInterAgentMessage(intent target=recipient_name)
  -> MixedTeamManager
  -> TeamMemberDeliveryCoordinator
  -> TeamMessageRecipientResolver.resolveByRecipientName(intent)
  -> derive sender context from intent.sender
  -> build/consult sender-specific communication roster inside mixed boundary
  -> exact recipient_name match
  -> resolved local/subteam target endpoint OR parent-boundary forward OR reject
```

Invariant: strict roster-name matching lives here, not in tool adapters or request builders.

### R8-DS-003 — exact-run resolution inside mixed delivery

```text
TeamRun.deliverInterAgentMessage(intent target=target_agent_run_id)
  -> MixedTeamManager
  -> TeamMemberDeliveryCoordinator
  -> TeamMessageRecipientResolver.resolveByTargetAgentRunId(intent)
  -> local active task-agent via TaskAgentDirectory, OR
  -> local active normal agent member run, OR
  -> reachable parent boundary forward, OR
  -> reject
```

Invariant: `target_agent_run_id` is never resolved through global `AgentRunManager` from a runtime adapter. It is scoped to the current team boundary plus explicitly reachable parent boundary.

### R8-DS-004 — parent-boundary forwarding preserves unresolved target

```text
child team intent
  -> child TeamMessageRecipientResolver determines target is parent-boundary reachable
  -> normalize sender into parent-rooted represented-subteam participant
  -> parentBoundary.deliverInterAgentMessage(parentIntent)
  -> parent MixedTeamManager resolves target selector in parent boundary
```

Invariant: the child team may decide that the parent boundary is reachable, but the parent team remains the owner that resolves the parent recipient or parent exact run.

### R8-DS-005 — canonical selector parsing

```text
raw tool args
  -> parser reads only recipient_name and target_agent_run_id for target selection
  -> rejects recipient, recipientName, targetAgentRunId as unsupported target selector fields
  -> validator enforces exactly-one canonical selector
```

Invariant: no hidden target selector aliases, no precedence behavior, no compatibility branch.

## Ownership Map

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| Runtime send-message adapters | Runtime tool mechanics, parser invocation, intent submission | Roster lookup, recipient endpoint construction, exact-run lookup |
| `parseSendMessageToToolArguments` / `TeamMessageTargetSelector` | Canonical target field parsing and XOR validation | Team roster or run reachability |
| `buildInterAgentMessageDeliveryIntent` | Sender endpoint construction and unresolved intent construction | `MemberTeamRecipientDescriptor`, recipient endpoint, target lookup |
| `TeamRun` / `MixedTeamManager` | Delivery boundary selection and parent-boundary reachability | Runtime-provider tool parsing |
| `TeamMessageRecipientResolver` | Sole target selector to resolved endpoint conversion | Projection publishing, provider runtime transport |
| `TaskAgentDirectory` | Active task-agent run addressability metadata | General roster-name resolution or runtime execution |
| `TeamMemberDeliveryCoordinator` | Resolve target, post target input, publish committed projection | Pre-resolving targets above mixed boundary |

## File Responsibility Changes

### Rename / replace

| Current Path | Target Responsibility |
| --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-delivery-request-builder.ts` | Replace/rename to intent builder. It builds `InterAgentMessageDeliveryIntent` only. It must not import `MemberTeamRecipientDescriptor`, call `communicationRecipients.find`, or construct `recipient`. |

### Modify

| Path | Required Change |
| --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts` | Split unresolved `InterAgentMessageDeliveryIntent` from resolved delivery request. Handler accepts intent. `recipient` exists only on resolved internal request. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-message-recipient-resolver.ts` | Resolve by `intent.target`, not `request.recipient.selector`; derive sender-specific roster inside mixed boundary; return local target, task-agent target, parent-boundary forward, or rejection. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-member-delivery-coordinator.ts` | Convert resolved target into `ResolvedInterAgentMessageDeliveryRequest`; build communication payload only after target is resolved and input acceptance is attempted. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-parent-boundary-delivery-request.ts` | Rename/adjust to normalize unresolved parent-boundary intent; do not normalize recipient endpoint. |
| AutoByteus/Codex/Claude send-message adapters | Call intent builder and deliver the intent. They do not inspect `MemberTeamContext.communicationRecipients` except for schema/prompt display. |
| `send-message-to-tool-argument-parser.ts` | Remove target selector aliases `recipient`, `recipientName`, and `targetAgentRunId`; target selection is canonical `recipient_name` XOR `target_agent_run_id`. |

### Remove / reject

| Item | Reason |
| --- | --- |
| `request.recipient` above mixed delivery boundary | Duplicates target selector and makes mismatches possible. |
| `findCommunicationRecipient(...)` in the intent builder | Roster-name resolution belongs to `TeamMessageRecipientResolver`. |
| Placeholder exact-run participant in the builder | Exact-run participant is unknown until the resolver validates reachability. |
| Hidden target selector aliases | They keep compatibility/precedence behavior outside the approved public contract. |

## Validation Plan

1. Intent builder tests prove:
   - it never reads `memberTeamContext.communicationRecipients` for target lookup;
   - it returns `target` but no `recipient` endpoint;
   - unknown `recipient_name` still produces an intent and is rejected only by mixed delivery.
2. Resolver tests prove:
   - `recipient_name` resolves by strict sender roster inside `TeamMessageRecipientResolver`;
   - mismatched target/endpoint is unrepresentable;
   - parent-boundary recipient names are forwarded unresolved to the parent boundary;
   - exact local task-agent and normal member run ids resolve;
   - external/settled run ids reject with no projection.
3. Parser tests prove:
   - canonical `recipient_name` only passes;
   - canonical `target_agent_run_id` only passes;
   - `recipient`, `recipientName`, and `targetAgentRunId` are rejected / ignored in a way that fails validation;
   - both canonical selectors reject.
4. Source scans prove:
   - no `communicationRecipients.find` or `MemberTeamRecipientDescriptor` import in the intent builder;
   - `InterAgentMessageDeliveryHandler` accepts intent without recipient;
   - runtime adapters do not construct recipient endpoints.
5. Existing task-delegation and live E2E matrix should resume only after architecture review, implementation, and code review confirm this boundary.
