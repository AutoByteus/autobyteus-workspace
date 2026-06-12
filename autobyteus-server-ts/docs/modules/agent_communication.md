# Agent Communication

## Scope

`src/agent-communication` owns the shared public `send_message_to` contract,
argument parsing, selector dispatch, direct exact-run routing, and optional
direct-message grants. Runtime adapters and team execution code call this shared
boundary instead of owning their own selector semantics.

## Public `send_message_to` Selectors

`send_message_to` accepts exactly one target selector:

- `recipient_name`: a logical name from the current team roster.
- `target_agent_run_id`: an exact, currently active `AgentRun.runId`.

Callers must not provide both selectors, omit both selectors, or use selector
aliases such as `recipient`, `recipientName`, or `targetAgentRunId`. `content`
must be a non-empty self-contained message body. Optional `reference_files` must
be an array of absolute local path strings and should be used in addition to, not
instead of, explanatory message content.

## `recipient_name` Team Route

`recipient_name` remains the team-local semantic route. It requires an active
`MemberTeamContext` with `send_message_to` enabled and delegates to the team
delivery handler owned by `TeamRun` / `MixedTeamManager`.

Accepted team-route deliveries are the only `send_message_to` path that creates
Team Communication projection:

- recipient input is delivered through the resolved member/team handle;
- accepted `INTER_AGENT_MESSAGE` events carry the team context needed by the Team
  Communication processor;
- `reference_files` become Team Communication child references persisted under
  the team run; and
- frontend Team tab sent/received perspectives hydrate from that projection.

Team-owned internals may still use their own task-agent/recovery machinery for
task-delegation workflows, but the public `recipient_name` selector is the only
model-facing roster route.

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

- post a model-visible `AgentInputUserMessage` to the active target run;
- include sender run id/name, runtime kind, message type, target run id, and
  `reference_files` in the runtime input metadata;
- emit a direct `INTER_AGENT_MESSAGE` on the target run only after input
  acceptance; and
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

The Skill Self-Evolver uses this seam to let its visible helper run send at most
one `self_evolution_outcome` message to the active target run with references
limited to editable skill roots.

## Runtime Projection

Runtime adapters expose one logical `send_message_to` capability through their
native tool surfaces when the current agent/tool configuration includes it:

- AutoByteus uses the server-owned local `BaseTool` wrapper.
- Codex receives dynamic tool registration/specs built from the shared contract.
- Claude receives the first-party MCP tool/handler built from the shared
  contract.

Standalone configured runs can use `target_agent_run_id` without team context.
They cannot use `recipient_name` unless they are running with an active
`MemberTeamContext`. Team members use the same shared dispatcher so selector
semantics stay identical across AutoByteus, Codex, and Claude.

## Out Of Scope

This module does not provide a distributed inbox, inactive-run message queue,
global run discovery API, cross-process routing, broad ACL system, or task result
/ review / acceptance protocol. Task delegation remains owned by the dedicated
task-delegation tools and services.
