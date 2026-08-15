# Agent Communication

## Scope

`src/agent-communication` owns the shared public `send_message_to` and
`get_handoff_rules` contracts, argument parsing, selector dispatch, canonical
result envelopes, direct exact-run routing, and optional direct-message grants.
Runtime adapters and team execution code call this shared boundary instead of
owning provider-specific selector or result semantics.

## Public `send_message_to` Selectors

`send_message_to` accepts exactly one target selector:

- `recipient_address`: a rooted logical Agent-or-Team address. Use `/...` from the
  collaboration root or `./...` from the caller's immediate Team.
- `target_agent_run_id`: an exact, currently active `AgentRun.runId`.

Callers must not provide both selectors, omit both selectors, or use selector
aliases such as `recipient`, `recipientName`, or `targetAgentRunId`. `content`
must be a non-empty self-contained message body. Optional `reference_files` must
be an array of absolute local path strings and should be used in addition to, not
instead of, explanatory message content. Optional `message_type` defaults to
`agent_message` when omitted; runtime/provider traces must not require providers
to echo that optional field when the semantic delivery is otherwise valid.

Bare names, backslashes, repeated/trailing separators, and `.`/`..` path
segments are invalid. `/` addresses the root Team; `./` addresses the caller's
immediate Team. A Team address resolves to that Team's exact direct Agent
coordinator ingress, while an Agent address resolves to that Agent. The root
topology resolver supports nested, upward, sibling, and cross-branch Team
communication inside the same collaboration root. It rejects missing targets,
invalid traversal through an Agent, self-targets, and Teams without valid
ingress before recipient input or an accepted communication event is produced.

The shared collaboration boundary carries one canonical execution identity
rather than parallel path/owner caches. `TeamMemberExecutionIdentity` is exactly
the frozen `{rootTeamRunId, memberAddress, agentRunId}` shape. The caller's
logical placement, address segments, and basename are derived from
`memberAddress` through the strict address domain. Common placement resolution
returns only frozen Agent
`{kind:"agent",address}` or Team
`{kind:"team",address,ingressAddress}` values. Team ingress is retained because
it is configured topology, not derivable from the Team address; member paths,
route keys, owner coordinates, configs, handles, and runtime lifecycle identity
do not cross this shared message/task placement boundary.

## `recipient_address` Team Route

`recipient_address` is the logical Team route. It requires an active
`MemberTeamContext` with `send_message_to` enabled and delegates to the root
Team delivery boundary owned by `TeamRun` / `MixedTeamManager`. Child managers
forward root-bound delivery intent without rewriting it into flat names or
synthetic representative identities.

Accepted team-route deliveries are the only `send_message_to` path that creates
Team Communication projection:

- recipient input is admitted through the resolved member/team handle into the
  exact target AgentRun FIFO;
- accepted `INTER_AGENT_MESSAGE` events carry the team context needed by the Team
  Communication processor to build address-first `senderAddress` and
  `receiverAddress` values;
- `reference_files` become Team Communication child references persisted under
  the team run; and
- frontend Team tab sent/received perspectives hydrate from that projection and
  match the focused execution by exact normalized `TeamExecutionAddress`.

Acceptance means the live AgentRun owns one ordered, at-most-once forwarding
attempt. It does not mean a provider turn has completed and does not synchronously
wait for a next-turn-only backend. Team Communication/member-input projection is
created once at admission; forwarding and terminal lifecycle facts do not
republish it.

Team-owned internals may still use task-agent/recovery machinery for task
delegation workflows, but public logical delivery has one rooted address
authority and no flat-roster or bare-name fallback.

## `get_handoff_rules`

`get_handoff_rules` is a configured, read-only Team-member tool with no
arguments. It returns only the caller's ordered outgoing compiled handoff rules,
flattened into one condition and canonical destination per entry:

```json
{
  "handoffs": [
    {
      "when": "Delegate field verification when needed.",
      "recipient_address": "/research_team/field_team"
    }
  ]
}
```

An Agent with no outgoing edges succeeds with `handoffs: []`. A call without an
active Team collaboration context is rejected with
`COLLABORATION_CONTEXT_REQUIRED`. Handoff rules are launch-time guidance; reading
them does not authorize a message or task, and the normal target resolver and
task eligibility policy still apply.

## Result Shapes

`send_message_to` uses the canonical operation-result envelope:

```text
{ accepted, code, message, result }
```

Its successful result is `null`; exact-run operation codes pass through
unchanged. MCP `content` text parses to the same object as
`structuredContent`, and `isError` is set only for rejected outcomes.

`get_handoff_rules` instead returns the read-only `{ handoffs }` object shown
above. Its AutoByteus JSON result and MCP `content`/`structuredContent` represent
that same object; it is not wrapped in an operation result.

## `target_agent_run_id` Global Direct Route

`target_agent_run_id` is a live-only global direct route. The value must be the
canonical server-side `AgentRun.runId` of a run that is active at delivery time.
Dispatch flows through:

`SendMessageToDispatcher -> GlobalAgentRunMessageRouter -> AgentRunManager.getActiveRun(...) -> AgentRun.postUserMessage(...)`

If `AgentRunManager.getActiveRun(targetAgentRunId)` returns no active run, the
delivery fails closed with `TARGET_AGENT_RUN_NOT_ACTIVE`. The route must not
search team rosters, scan `AgentTeamRunManager`, consult task-agent recovery
caches, use metadata-only lookup, resurrect inactive runs, or lazy-start
preallocated members.

Accepted direct-route deliveries:

- admit one model-visible `AgentInputUserMessage` into the active target run's
  AgentRun-owned FIFO;
- include sender run id/name, runtime kind, message type, target run id, and
  `reference_files` in the runtime input metadata;
- emit a direct `INTER_AGENT_MESSAGE` on the target run only after input
  admission acceptance, without waiting for provider forwarding; and
- intentionally omit `team_run_id` and other Team Communication projection
  fields.

Direct exact-run messages therefore do not create Team Communication rows or Team
tab reference entries. Their `reference_files` are visible to the target runtime
through the generated message block and metadata, but Team Communication
reference persistence remains exclusive to accepted team-route messages.

## Optional Direct-Message Grants

`DirectAgentRunMessageGrantRegistry` is an optional policy overlay for
server-created helper runs. A grant can narrow:

- allowed target run ids;
- allowed `message_type` values;
- allowed `reference_files` paths or roots;
- maximum accepted deliveries; and
- expiry time.

Grants do not discover, resolve, restore, or revive targets. Target liveness is
still decided only by `AgentRunManager.getActiveRun(...)`, and rejected grant
checks return typed delivery failures before the target receives input.

The Retrospective Skill Improver uses this seam to send at most one
`skill_update` message to the active target run after meaningful durable
skill package file changes. That message should explain what changed, why it
matters, and how the target should use or reload the updated guidance, while its
dynamic `reference_files` are absolute paths limited to changed or directly
relevant surviving files inside editable skill roots.

## Runtime Projection

Runtime adapters expose one logical `send_message_to` capability through their
native tool surfaces when effective runtime exposure includes it. Standalone
runs require explicit configuration; every valid team member context receives
`get_handoff_rules`, `send_message_to`, and `delegate_task` automatically, with
duplicates removed. The root topology resolver and active delivery binding
still authorize each team-route call:

- AutoByteus uses the server-owned local `BaseTool` wrapper.
- Codex App Server receives the first-party Agent Tools MCP server through
  thread-scoped `config.mcp_servers.autobyteus_agent_tools` generated from a
  private descriptor; the old dynamic `send_message_to` registration path is not
  retained as a fallback.
- Claude Agent SDK receives the first-party
  `mcp__autobyteus_agent_tools__send_message_to` tool by materializing the
  server-hosted `autobyteus_agent_tools` MCP descriptor; application surfaces
  still see canonical `send_message_to`.
- External process runtimes can receive a session-scoped
  `autobyteus_agent_tools` Streamable HTTP MCP descriptor from the Agent Tools
  MCP Server. That surface also reuses this shared contract and dispatcher, and
  its server-side session still gates exposure by the resolved effective
  AutoByteus tool set.

Explicitly configured standalone runs can use `target_agent_run_id` without team context.
They cannot use `recipient_address` unless they are running with an active
`MemberTeamContext`. Team members use the same shared dispatcher so selector
semantics stay identical across AutoByteus, Codex, Claude, and the
server-hosted Agent Tools MCP surface.

All runtime projections end at the same `AgentRun.postUserMessage(...)`
admission owner. Codex, Claude, AutoByteus, Team routing, external callers, and
the command registry do not select start/append/wait behavior themselves.

Configured Team members receive `get_handoff_rules` through the same runtime
projection: a bound AutoByteus local tool or the session-scoped
`autobyteus_agent_tools` MCP surface for Codex and Claude. The MCP adapter is
available only when the session sender has an active member collaboration
context.

## Out Of Scope

This module does not provide a distributed inbox, inactive-run message queue,
global run discovery API, cross-process routing, broad ACL system, or task result
/ review / acceptance protocol. Task delegation remains owned by the dedicated
task-delegation tools and services.
