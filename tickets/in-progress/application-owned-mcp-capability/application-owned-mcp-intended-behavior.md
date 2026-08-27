# Application-Owned MCP — Intended-Behavior Contract

## Status

`Approved by the user on 2026-08-27`

## Purpose And Authority

This supplement clarifies what “application MCP” means for the current ticket. It is part of the requirements basis and is authoritative together with `requirements.md` after explicit user approval. It does not define implementation structure; the later design spec will map these outcomes onto current owners and files.

## Product Boundary

### Included now

An application declares business-specific **agent tools** and implements them in its existing backend worker. AutoByteus exposes the selected application-tool capability to that application's Agents, independent of whether the Agent configuration selects AutoByteus, Claude, or Codex as its supported runtime. Runtime-specific provisioning is an implementation concern; it must preserve the one application-owned contract and the current native automatic-tool behavior.

Conceptually:

`Application package declaration + application worker handler -> platform-authorized application tool -> runtime projection (native bound tool or Agent Tools MCP session) -> owning application Agent`

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
| Tool selection | Agent/Team definition `toolNames` for application business tools | Application-owned tools require explicit selection. Existing automatic native-foundation and Team-collaboration provisioning remains unchanged and additive. |
| Provider adaptation | Existing provider-neutral runtime boundary | Every supported runtime receives the same selected application-tool meaning and isolation. The later design may use the existing scoped MCP descriptor or a native bound-tool projection as appropriate, but must not duplicate application business policy. |

## Clarified Runtime Boundary

The feature distinguishes two tool families:

- **AutoByteus-native foundation tools** are already automatically provisioned for every eligible non-compactor native Agent: `run_bash`, `read_file`, `edit_file`, and `write_file`.
- **Automatic Team collaboration tools** are already added whenever member Team context exists: `get_handoff_rules`, `send_message_to`, and `delegate_task`.
- **Configured platform/global tools** remain additive to those automatic sets and are normalized/deduplicated under the existing rules.
- **Application-owned business tools** exist because the application's business needs exceed those fundamentals. The application declares and implements them, and the platform exposes selected tools through an exact application-scoped MCP capability.

Therefore, an eligible AutoByteus-native Agent running for an application receives its unchanged automatic foundation, any automatic Team tools for which it is eligible, configured platform/global tools, and its explicitly selected application-owned MCP tools. The built-in Memory Compactor remains the current exception and receives no tools. Application business tools never become automatic merely because the Agent belongs to an application or uses the native runtime.

Changing a bound application Agent's supported runtime does not change which selected application-owned business tool it means. Runtime adapters may provision the capability differently, but every call remains bound to the same exact application declaration and worker handler.

The physical MCP endpoint remains platform-hosted and shared; application ownership is represented by its declarations, worker handlers, and exact scoped session routes rather than by a separate listener process.

## Visibility And Collision Rules

1. A general-process session sees no application tool.
2. An App A session can resolve only App A declarations; it cannot resolve App B declarations.
3. The same local tool name may exist in App A and App B because the internal route identity also contains the exact application identity.
4. An application declaration may not collide with a platform/static Agent Tools MCP tool name. The application is not ready until the declaration is corrected.
5. In an application session, the application's declaration is authoritative over a host-configured MCP tool with the same name. In general and other-application sessions, the configured MCP tool keeps its current meaning.
6. A declared tool is still unavailable unless the Agent/Team member explicitly selects its name.

## Invocation Contract

The application handler receives:

- JSON-object arguments validated against the package-declared input schema;
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

## Approval Record

Approved by the user on 2026-08-27 on the following interpretation. After the runtime/provisioning discussion, the user confirmed that the design was clear and asked the solution designer to proceed with design:

> Existing automatic native-foundation and Team-collaboration provisioning remains unchanged. Applications explicitly select their additional configured and business tools. Application-owned in-worker business tools use one runtime-neutral, application-scoped capability with exact application/binding/run isolation across supported runtimes. Runtime-specific provisioning must not change that behavior. Arbitrary application-bundled MCP server processes and the broader external developer SDK journey remain deferred.
