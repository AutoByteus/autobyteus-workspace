# Autobyteus Agent Team Design

## 1. Purpose and Scope

Agent Teams provide the **multi-agent orchestration layer** in Autobyteus. A team is a managed graph of agents and sub-teams that:

- routes messages to the correct node,
- lazily starts agents/sub-teams on demand,
- coordinates task plans and optional system-driven notifications,
- aggregates events into a single team stream,
- and manages clean shutdown across all nodes.

This document focuses on the **agent-team** package and how it integrates with the runtime and event-driven core.

---

## 2. Core Concepts

### 2.1 Team Graph (Nodes)

Teams are defined as graphs of **TeamNodeConfig** objects. Each node is either:

- a single **AgentConfig** (agent node), or
- a full **AgentTeamConfig** (sub-team node).

Each node has a unique name enforced by the builder.

### 2.2 Team Facade vs Runtime

- **AgentTeam**: thin, user-facing API (`post_message`, `post_tool_execution_approval`, `start`, `stop`).
- **AgentTeamRuntime**: owns the team’s serialized async loop (mailbox), status manager, and multiplexer.

The facade forwards all calls to the runtime, ensuring concurrency and event-driven processing.

---

## 3. Team Construction Pipeline

### 3.1 Builder

`AgentTeamBuilder` is the fluent API for constructing a team:

- enforces unique node names,
- sets the coordinator,
- configures `TaskNotificationMode`.

The builder compiles everything into a single immutable **AgentTeamConfig**.

### 3.2 Factory

`AgentTeamFactory` assembles runtime components:

1. `AgentTeamRuntimeState`
2. `AgentTeamContext`
3. Default event handler registry
4. `AgentTeamRuntime`
5. `TeamManager`

The resulting `AgentTeam` facade is returned and cached by the factory.

---

## 4. Runtime Model

### 4.1 Serialized Team Loop (Mailbox)

Each team runs a serialized async loop with a mailbox on the shared Node.js event loop. Inside it:

- bootstrap steps run,
- the loop dispatches team events,
- shutdown steps run after stop.

### 4.2 Input Queues

`AgentTeamInputEventQueueManager` provides two queues:

- `user_message_queue`
- `internal_system_event_queue`

The loop waits on both using a `Promise.race(...)`-style wait for the first ready queue.

### 4.3 Event Dispatcher

`AgentTeamEventDispatcher` routes events to handlers and triggers status updates:

- `AgentTeamReadyEvent` -> `IDLE`
- Errors -> `ERROR`

**External status contract**

Teams emit status via the unified team stream. The payload is:

- `AgentTeamStatusUpdateData` with `new_status`, optional `old_status`, and optional `error_message`.

---

## 5. TeamManager (Node Lifecycle + Routing)

`TeamManager` is the **central orchestration layer** for nodes.

### 5.1 Lazy Creation

When a message targets a node, `ensure_node_is_ready()`:

- resolves the node by name (or agent_id),
- lazily instantiates the agent/sub-team if missing,
- starts the node if not running,
- waits until it is IDLE (agent or sub-team),
- registers event bridges via the multiplexer.

### 5.2 Routing

`TeamManager` is used by event handlers and tools to route messages:

- `ProcessUserMessageEvent` → to agent or sub-team
- `InterAgentMessageRequestEvent` → via send_message_to tool
- `ToolApprovalTeamEvent` → forwarded to target agent

This guarantees a consistent path for all intra-team communication.

---

## 6. Bootstrap Process (Team Lifecycle)

Team initialization runs inside the worker loop via `AgentTeamBootstrapper`:

1. **Queue initialization** (`AgentTeamRuntimeQueueInitializationStep`)
2. **TaskPlan setup + event bridging** (`TeamContextInitializationStep`)
3. **Optional notifier** (SYSTEM_EVENT_DRIVEN only)
4. **Final agent config preparation** (context injection + attach TeamManifestInjectorProcessor). The processor replaces `{{team}}` if present; otherwise it appends a Team Manifest section automatically.
5. **Coordinator initialization** (ensure coordinator starts early)

When complete, the worker enqueues `AgentTeamReadyEvent` and the status updates to IDLE.

---

## 7. Task Plan + Notification Modes

Teams can run in two modes (see `TaskNotificationMode`):
You can set the default via `AUTOBYTEUS_TASK_NOTIFICATION_MODE` (`agent_manual_notification` or `system_event_driven`).

### 7.1 AGENT_MANUAL_NOTIFICATION (default)

- Coordinator explicitly sends messages to agents using tools.
- TaskPlan is updated, but no automatic activation occurs.

### 7.2 SYSTEM_EVENT_DRIVEN

- `SystemEventDrivenAgentTaskNotifier` monitors TaskPlan events.
- `ActivationPolicy` tracks which agents have already been activated for a “wave”.
- `TaskActivator` ensures the agent is running and sends a generic “start work” message.
- Runnable tasks are marked `QUEUED` before activation.

This mode allows _fully automated_ task distribution with minimal coordinator overhead.

---

## 8. Inter-Agent Messaging

`send_message_to` is implemented as a tool. It:

- retrieves `team_context` injected into agent configs,
- uses `TeamManager` to dispatch `InterAgentMessageRequestEvent`,
- triggers on-demand startup for the recipient if needed.

This avoids direct agent-to-agent calls and keeps routing consistent.

---

## 9. Streaming + Observability

Agent Teams expose a unified stream via `AgentTeamExternalEventNotifier`:

- **TEAM**: status updates
- **AGENT**: re-broadcast agent events
- **SUB_TEAM**: re-broadcast sub-team streams
- **TASK_PLAN**: task plan updates

`AgentEventMultiplexer` manages bridges:

- `AgentEventBridge`: agent → team stream
- `TeamEventBridge`: sub-team → team stream

`AgentTeamEventStream` provides async consumption for UIs and dashboards.

For the full JSON wire format and data flow, see [Agent Team Streaming Protocol](agent_team_streaming_protocol.md).

---

## 10. Shutdown

`AgentTeamShutdownOrchestrator` runs inside the worker loop:

1. **Bridge cleanup** (stop event bridges)
2. **Sub-team shutdown**
3. **Agent shutdown**

This ensures the team fully tears down its resources and running nodes.

---

## 11. Key Files (Reference)

- Team facade: `src/agent-team/agent-team.ts`
- Builder + config: `src/agent-team/agent-team-builder.ts`, `src/agent-team/context/agent-team-config.ts`
- Runtime + worker: `src/agent-team/runtime/agent-team-runtime.ts`, `src/agent-team/runtime/agent-team-worker.ts`
- TeamManager: `src/agent-team/context/team-manager.ts`
- Bootstrap steps: `src/agent-team/bootstrap-steps/`
- Task notification: `src/agent-team/task-notification/`
- Streaming + multiplexer: `src/agent-team/streaming/`
- Shutdown steps: `src/agent-team/shutdown-steps/`

---

## 12. Extension Points

- **Custom team APIs**: subclass `BaseAgentTeam` to wrap `AgentTeam`.
- **Custom bootstrap steps**: pass new step lists to `AgentTeamBootstrapper`.
- **Task activation behavior**: override or replace `ActivationPolicy` / `TaskActivator`.
- **New stream payloads**: extend team stream payload definitions.
