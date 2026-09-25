# External Messaging Integration Product Model Analysis

## Status And Authority

`Proposed intended-behavior supplement — revised after integration/MCP brainstorm; approval pending.`

This file explains the product model. `requirements.md` remains authoritative for verifiable behavior and acceptance criteria.

## Executive Conclusion

The correct model is a **run-attached integration**, not a channel binding and not merely an MCP tool.

The user’s two intuitions are both important:

1. **An external platform is an integration/capability.** A WeChat integration should expose operations and data much like an MCP server.
2. **A new group message is pushed.** A dedicated group-manager agent should not have to poll a tool continuously to discover that someone spoke.

Those imply two interfaces:

```text
INPUT SIDE (push)
provider webhook/polling or MCP resource update
  -> AutoByteus integration host
  -> durable normalized event
  -> active run attachment policy
  -> external-human turn on an already-running agent/team

CAPABILITY SIDE (agent initiated)
agent MCP resource/tool call
  -> read/search history, send, reply, react, moderate
```

The agent/team is started normally. At launch, the run explicitly opts into selected integration sources. New messages may then notify that active run and, depending on its delivery policy, become user-like turn inputs. The message never creates, restores, or starts the run.

## What Was Wrong In The Two Earlier Models

### Legacy channel binding

```text
channel route owns target definition + launch preset + cached run
  -> incoming message launches/reuses execution
  -> message becomes user turn
  -> eligible run output is sent back automatically
```

This lets transport configuration own execution lifecycle and outbound authority.

### Context-only source subscription

The previous refinement overcorrected by saying no external event should ever start a turn. That protects autonomy but fails the factual requirement of a group-manager or auto-reply agent: if the already-running agent is responsible for the group, a new message is an input notification and should be able to schedule work.

The missing distinction is:

- **lifecycle trigger:** create/restore/start an agent run — always forbidden for provider traffic;
- **turn trigger:** queue an input on an already-running opted-in run — allowed according to the run’s delivery policy.

An agent can be autonomous and still receive events. Autonomy means it owns its lifecycle, capabilities, and policy; it does not mean it must poll everything.

## Why “Just An MCP Tool” Is Incomplete

MCP tools are model-controlled calls. They are ideal for:

- `list_groups`;
- `get_messages` / `search_messages`;
- `send_message`;
- `reply_to_message`;
- `react_to_message`;
- group moderation or management operations.

But a tool does nothing until the model calls it. If no turn is running, the model cannot decide to call `get_new_messages`.

MCP has a closer primitive for the input side: **resources** are application-controlled, and servers may support resource subscriptions. A server can emit `notifications/resources/updated` when a subscribed URI changes. The host can then read/normalize the changed resource and decide what to do.

That still does not directly “send a user message to the model.” The notification identifies changed data; the AutoByteus host must:

1. maintain the MCP/integration session;
2. know which active run attached that source;
3. retrieve/normalize the message;
4. enforce actor/source permissions and deduplication;
5. apply delivery mode;
6. queue a typed external-human input when policy selects it.

So the best MCP framing is:

> **Messaging integration = MCP resources/subscriptions for observable data + MCP tools for actions, hosted by an AutoByteus run-attachment router.**

Native provider adapters may implement the same contract when MCP resource subscriptions are unavailable or insufficient.

## The Ownership Model

### `MessagingIntegration`

Server-owned provider/MCP configuration.

Owns:

- credentials and connection health;
- provider/MCP session supervision;
- source discovery;
- receive/send capability reporting;
- raw provider event normalization boundary.

Must not own:

- agent/team definition target;
- agent run ID;
- model, workspace, runtime, or launch preset;
- automatic assistant-output destination.

### `ExternalMessageSource`

A provider-scoped group, channel, DM peer, or thread.

Owns:

- integration/source identity and display facts;
- verified visibility such as full, addressed-only, degraded, or unavailable;
- provider receive position and durable normalized events;
- source retention and health.

It does not point to an agent. It may exist with zero active run attachments.

### `ExternalInputAttachment`

Created by normal agent/team launch and owned by that run.

Owns:

- active run/team-run identity;
- selected source(s);
- allowed actors and message filters;
- delivery mode;
- backlog behavior and cursor;
- external-input owner for a team;
- enablement and live subscription state.

It is the routing association required for push delivery, but it is intentionally inverted from the current binding:

```text
wrong:  source -> target definition -> launch execution
right:  already-running execution -> opts into source input
```

Stopping the run unregisters live delivery. Restoring the same run may restore its attachment from run metadata after re-authorization. A new run has no attachment unless explicitly selected.

### `ExternalMessageEvent`

A canonical provider message fact containing:

- integration/source and provider identities;
- event/message identity;
- author identity and display name;
- provider and ingest timestamps;
- text/media;
- reply/thread/quote relationship;
- DM/mention/reply/command addressed facts;
- edit/delete/revision semantics;
- bot/self/loop-prevention facts.

### `ExternalHumanMessageReceived`

A typed turn trigger produced only after an active attachment selects an event. It is human input and can reuse normal turn execution, but must retain its external author/source/reply identity.

It differs from today’s generic flattening because:

- the run already exists;
- attachment policy, not channel binding, selected it;
- the transport event remains durable and identifiable;
- reply capability is not inferred from generic output;
- multi-party author identity is preserved.

### Integration tools/resources

The agent definition can select integration tool names like any other MCP tools. A specialized `WeChat Group Manager` definition can therefore carry instructions and default capabilities.

Actual source access remains a launch/runtime authorization decision. Possessing `wechat_send_message` must not automatically subscribe the run to every group or grant unrestricted send rights.

## Launch-Time User Model

### Integration setup

Configure once:

- WeChat/MCP connection;
- credentials;
- connection and observation health;
- discovered groups/channels;
- available resources/tools.

No agent/team target is chosen here.

### Agent definition

Optionally define a reusable specialized agent:

- name: `WeChat Group Manager`;
- role/instructions;
- selected MCP tool names;
- recommended delivery-mode default;
- relevant skills/processors.

This is capability and behavior definition, not a concrete group subscription.

### Normal run launch

Alongside model/workspace/runtime configuration, optionally choose:

- `Allow external inputs`;
- integration connection;
- group/channel source(s);
- allowed senders;
- delivery mode;
- backlog start position;
- outbound permissions;
- for teams, manager/entry owner.

The run starts for the same reason and through the same lifecycle path as any other run. The attachment is installed after/with normal activation; the integration never calls the activation path.

## Delivery Modes

### `EVERY_MESSAGE`

Every permitted human event starts one queued external-human turn. Appropriate for a dedicated auto-reply bot or low-volume group manager. Potentially costly/noisy.

### `ADDRESSED_ONLY`

Only DM, direct mention, reply-to-bot, or explicit command starts a turn. Ambient events remain available through history/context resources. Strong general-assistant default candidate.

### `BATCHED`

Permitted events within a configured window become one bounded multi-author turn. Appropriate for high-volume monitoring, summarization, and moderation.

### `CONTEXT_ONLY`

Events remain in the integration/source history and may produce health/unread indicators, but never start turns. The agent accesses them during other work through resources/tools.

These are agent/run policy, not provider policy. Provider capability determines what is observable; delivery policy determines what an active run does with observed events.

## Busy, Stopped, And Restored Runs

### Busy run

Selected inputs queue behind the active turn in stable order and are deduplicated. `BATCHED` may coalesce them. They do not interrupt a turn unless a separate explicit priority design authorizes that behavior.

### No active eligible run

Provider ingestion may continue into the integration/source log, but it creates/restores/starts no run. Source retention/backlog policy determines whether a later explicitly attached run can consume retained events.

### Stopped run

Its live input attachment is unregistered. Stopping the run does not delete global integration/source configuration.

### Restored same run

The attachment may be restored from that run’s metadata after confirming current credentials, source access, and permission. This is run restoration, not provider-triggered restoration.

### New run of same agent definition

It receives no input automatically unless the launch explicitly selects an attachment or the user intentionally applies a saved launch preset. The source still has no pointer to the definition.

## Outbound Semantics

Outbound remains explicit:

```text
agent invokes send/reply MCP tool
  -> tool instance carries run identity
  -> authorization checks run attachment/source permission
  -> provider outbox sends idempotently
```

Do not use:

```text
agent turn completes
  -> take assistant final text
  -> infer provider destination from last input
  -> send automatically
```

Explicit tools make “no reply” a valid outcome, allow an agent to choose source/thread, support delayed/background sends, and prevent native UI or unrelated autonomous work from leaking externally.

## Team Semantics

The attachment belongs to the team run and selects one manager/entry member as ingress owner.

```text
external event
  -> team-run attachment policy
  -> one turn at manager/entry owner
  -> normal internal delegation
  -> explicit external tool action if needed
```

Do not fan out one group message to every member. Do not expose internal delegation or coordinator output automatically.

## Current-Code Fit

### Reusable

- managed gateway/provider supervision;
- provider clients and discovery;
- durable inbox/outbox, retry, lease, idempotency;
- signed gateway/server transport;
- agent-definition tool selection;
- MCP tool discovery/registration/call path;
- normal agent/team preparation and activation;
- long-lived agent worker and queued turn scheduler;
- provider delivery evidence.

### Must change or be replaced

- `ChannelBinding` target/launch/run/output aggregate;
- binding-driven run launcher;
- mention gate as forward-or-drop authority;
- generic envelope-to-user-message dispatch before active-run opt-in;
- open route-to-run output delivery;
- Settings/API that configure runtime launch inside a channel binding;
- MCP managed client interface limited to `listTools`/`callTool` if MCP resources/subscriptions are used;
- agent turn-trigger contract limited to generic user/inter-agent inputs.

### Important current MCP constraint

AutoByteus currently creates managed MCP instances per agent ID and often lazily through tool execution/prewarming. An always-on messaging receiver may need a server-owned integration session distinct from per-agent tool instances. Otherwise a local MCP connector would not be alive to ingest messages when no agent has invoked a tool.

## Transition

### Phase 0 — Disable legacy semantics

Disable binding CRUD, binding-driven ingress/run launch, output restoration/publication, and legacy setup UI while preserving stored files.

### Phase 1 — Integration and source foundation

Create target-free connector/MCP integration, source discovery, canonical event ingest, and capability reporting.

### Phase 2 — Normal-launch run attachment

Add external-input selection to normal agent/team launch, attachment lifecycle, delivery modes, and typed external-human turn input without any provider-triggered run activation.

### Phase 3 — MCP resources and explicit actions

Where applicable, support MCP resource list/read/subscribe plus notifications, retain existing MCP tool assignment, and enforce attachment-aware send/read permissions.

### Phase 4 — Provider proof and expansion

Prove one provider end to end, then add adapters without changing run ownership.

## Final Recommendation

Approve this hybrid integration model:

1. integrations and sources are configured independently and target no agent;
2. agent/team runs start normally;
3. the launch explicitly attaches allowed source inputs;
4. push notifications can create turns only on already-running attached runs and only under the selected delivery mode;
5. MCP resources/subscriptions or equivalent adapters provide the input/context side;
6. MCP tools provide read/action/send capabilities;
7. external traffic never creates/restores execution;
8. final assistant output is never automatically mirrored;
9. legacy binding is disabled and replaced, not extended.
