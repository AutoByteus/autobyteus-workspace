# Application-Owned MCP — Intended-Behavior Contract

## Status

`Draft — intended-behavior supplement pending user approval`

## Purpose And Authority

This supplement clarifies what “application MCP” means for the current ticket. It is part of the requirements basis and is authoritative together with `requirements.md` after explicit user approval. It does not define implementation structure; the later design spec will map these outcomes onto current owners and files.

## Product Boundary

### Included now

An application declares business-specific **agent tools** and implements them in its existing backend worker. AutoByteus exposes the selected tools to that application's Agents through the existing shared authenticated Agent Tools MCP endpoint.

Conceptually:

`Application package declaration + application worker handler -> platform-authorized application tool -> existing Agent Tools MCP session -> owning application Agent`

### Not included now

The application does not bundle or start its own arbitrary MCP network/`stdio` server, install third-party MCP dependencies at import time, or own remote MCP credentials. Those capabilities have different trust, process, dependency, credential, and lifecycle requirements and are not authorized by this ticket.

## Ownership Decision

| Concern | Owner | Required Outcome |
| --- | --- | --- |
| MCP HTTP endpoint, bearer authentication, session registry, protocol dispatch | Process `AgentToolsMcpHost` | One shared physical host; no per-application listener. |
| Platform/static tools | Existing platform tool owners | Remain shared and protected. |
| User/host-configured MCP tools | Existing global MCP configuration and registry owners | Remain process-owned and unchanged outside session composition. |
| Application tool metadata | Exact application package | Static, import-safe, versioned with the package. |
| Application tool handler/business state | Exact application backend worker | Runs with application storage and normal application capabilities. |
| Binding/producer authorization and worker routing | `ApplicationPlatformRuntime` application-tool boundary | Uses authoritative session/binding context; never an argument-supplied application ID. |
| Tool selection | Agent/Team definition `toolNames` | Explicit opt-in only. |
| Provider adaptation | Existing provider-neutral MCP descriptor path | No application-specific Codex/Claude/AutoByteus branch. |

## Visibility And Collision Rules

1. A general-process session sees no application tool.
2. An App A session can resolve only App A declarations; it cannot resolve App B declarations.
3. The same local tool name may exist in App A and App B because the internal route identity also contains the exact application identity.
4. An application declaration may not collide with a platform/static Agent Tools MCP tool name. The application is not ready until the declaration is corrected.
5. In an application session, the application's declaration is authoritative over a host-configured MCP tool with the same name. In general and other-application sessions, the configured MCP tool keeps its current meaning.
6. A declared tool is still unavailable unless the Agent/Team member explicitly selects its name.

## Invocation Contract

The application handler receives:

- validated JSON-object arguments;
- immutable caller identity: `applicationId`, `bindingId`, producer `agentRunId`, and Team `memberAddress` when applicable;
- the existing application handler context for its own storage, notifications, application Agent operations, application resources, and published artifacts.

The application handler does not receive:

- the raw MCP bearer/session;
- a process-global tool registry;
- Agent/Team run managers;
- a caller-supplied application identity used for routing;
- another application's storage or worker handle.

The return value is a JSON-serializable, bounded MCP-safe tool result supporting text/rich content, optional structured content, and explicit error status. A thrown handler/transport error is a sanitized execution failure and is never automatically retried by the platform.

## Lifecycle Contract

| Transition | Required Behavior |
| --- | --- |
| Package scan | Read static declarations only; do not import/execute the backend entry module. |
| Application readiness | Validate selected names against platform/global plus the exact application catalog; fail closed on missing/invalid tools. |
| Worker load | Validate the handler map exactly matches the static declarations before marking the worker ready. |
| Session issue | Capture an immutable selected route containing application/binding/producer identity and declaration fingerprint. |
| Normal call | Revalidate current binding ownership, declaration fingerprint, application availability, and worker; then invoke once and await completion. |
| Normal reload | Block new calls, drain admitted calls, stop/reload, validate the new catalog/worker, and reopen. No local fixed completion timeout. |
| Declaration unchanged | An older session may invoke the current code-only-updated handler after successful reentry. |
| Tool added | Existing sessions do not gain it; newly issued sessions may. |
| Tool removed or declaration changed | Existing route fails closed; it is not silently rebound to the new contract. |
| Worker crash/removal | Pending/new calls fail explicitly; the platform does not retry a possibly mutating handler. |
| Run/session termination | Existing bearer capability becomes unusable through current session revocation. |
| Platform shutdown | Tool admission closes before workers stop; cleanup is idempotent and preserves process/application owner order. |

## Representative Maintained Proof

At least one maintained application will expose a real read-only tool backed by its own durable business data. Its package-owned Agent/Team member will select and call the tool through the shared MCP endpoint. The proof must show:

- exact caller binding ownership;
- correct application worker and application database;
- no visibility from a general session or the other maintained application;
- identical Studio and standalone behavior;
- reload/stale-route and cleanup behavior.

The sample is proof of the platform capability, not a new application UI workflow.

## Contract Transition

- The application package and backend-definition contracts move to one current representation for declarations and handlers.
- Maintained generated/importable package artifacts are rebuilt from source.
- Durable application databases, platform binding/journal state, Agent/Team definitions, and global MCP configuration are not migrated or rewritten.
- No compatibility alias, dual handler location, global-registration fallback, or old/new runtime branch is retained.

## Explicit Approval Question

Approve this ticket on the following interpretation:

> Applications own in-worker business tools, and AutoByteus exposes those tools through its one shared authenticated Agent Tools MCP host with exact application/binding/session isolation. Arbitrary application-bundled MCP server processes and the broader external developer SDK journey remain deferred.
