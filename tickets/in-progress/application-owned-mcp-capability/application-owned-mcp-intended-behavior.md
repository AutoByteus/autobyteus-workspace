# Application-Owned MCP — Intended-Behavior Contract

## Status

`Approved by the user on 2026-08-27; amended by explicit post-API user direction and technically corrected within approved Option A after CR-DI-002 / CR-MP-001 and CR-MP-002 on 2026-08-27`

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
| Maintained application demonstration | Brief Studio package-owned Team/Agent prompts plus existing application workflow | A real configured Agent calls the read-only tool first, uses the result in the normal published artifacts, and the existing projection/UI makes the result-informed workflow observable. |
| Maintained Luna model-facing file instruction | Current built-in `apply_patch` operation | Each role tells the fixed `gpt-5.6-luna` model to use built-in `apply_patch` for its canonical checkpoint; this is a provider/model instruction, not a routed tool registration. |
| Codex file-change protocol and AutoByteus observability | Codex `item/fileChange` / `file_change`, existing AutoByteus normalization to `edit_file` | Retain native file-change start/completion and normalized successful `edit_file` lifecycle as execution evidence; never use normalized `edit_file` as though it were the model-facing operation name. |
| Maintained cross-member/file publication | Existing Team handoff and `publish_artifacts` relative-path contract | Create both checkpoints without configured ordinary registry file tools or shell fallback; carry the complete research body in the handoff so the writer does not need `read_file`. |
| Proof observability | Existing access-controlled Agent run trace, application Team binding, artifact projection records, and browser surface | Correlate tool call/result and exact identity without copying generic application arguments/results into new process-wide operational logs. |

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

Brief Studio exposes the real read-only `get_brief_context` tool backed by its own durable business data. Its maintained `codex_app_server` / `gpt-5.6-luna` researcher and writer roles each select it and, for a fresh draft run, each individual `agent.md` requires exactly one successful call as that role's first tool action. The researcher calls before any file change or publication; the writer calls after receiving the handoff and before any file change or publication. The roles reuse the returned `briefId`, title, and status and include the exact compact-JSON line `Brief context: {"briefId":"…","title":"…","observedStatus":"…"}` (fixed key order and JSON-escaped values) in their normal published artifact. A missing/error result or cross-member brief mismatch stops normal publication rather than allowing guessed identity.

The role configs select only the routed application/collaboration/publication names that Codex can actually receive; they do not select ordinary registry `read_file`/`write_file`, built-in `apply_patch`, or normalized `edit_file`. After context validation, the researcher instructs Luna to use its built-in `apply_patch` operation—never `run_bash`—to create `brief-studio/research.md`, publishes that workspace-relative path, and sends the writer the exact marker, canonical path, and complete research checkpoint body. The writer consumes that body without `read_file`, copies at least one complete non-marker `Key findings` bullet verbatim into the final brief's `Key evidence` section, instructs Luna to use built-in `apply_patch`—never `run_bash`—to create `brief-studio/final-brief.md`, and publishes that workspace-relative path. A successful checkpoint is evidenced by Codex native `item/fileChange` / `file_change` activity and the corresponding AutoByteus normalized successful `edit_file` lifecycle for the same member run. If Luna reports built-in patch execution unavailable or failed, or routed publication/handoff is unavailable or fails, the role reports a blocker and stops rather than manufacturing a file or normal final publication. Independently, retained evidence must reject any purported success that lacks the native/normalized event pair.

The proof must use a real configured model-backed Agent/Team, not a direct MCP caller or mocked decision, and must show:

- exact caller binding ownership;
- correct application worker and application database;
- no visibility from a general session or the other maintained application;
- identical Studio and standalone behavior;
- reload/stale-route and cleanup behavior;
- one paired `get_brief_context` call/result trace per participating member, joined by `toolCallId` and member `agentRunId` to the exact application, binding, and canonical member address;
- the same `briefId` carried from the tool result into the research/final artifact marker and from publication into Brief Studio's application-owned projection;
- browser evidence on the supported Brief Studio surface that the same selected brief reaches `in_review`, workflow diagnostics show the same launch binding, and the final artifact body visibly contains the same marker.
- actual provider trace evidence that each role's context call precedes its model-facing built-in `apply_patch` instruction and resulting Codex `fileChange`; that AutoByteus records the corresponding normalized `edit_file` lifecycle under the same member run; that both canonical relative paths resolve inside the corresponding run workspace; and that successful traces contain no `run_bash`, `read_file`, or `write_file` invocation.

`get_brief_context` remains read-only. Its call alone does not mutate Brief Studio or change the UI. The observable state change remains the existing `Luna built-in apply_patch -> Codex item/fileChange or file_change -> AutoByteus normalized edit_file evidence -> publish_artifacts(workspace-relative path) -> artifact relay/reconciliation -> ready-for-review notification -> GraphQL refresh -> UI` workflow. The three names belong to different boundaries and are not interchangeable: `apply_patch` is the current model-facing instruction, `fileChange`/`file_change` is Codex protocol activity, and `edit_file` is AutoByteus's normalized observability label. No new mutation tool, platform-wide Codex file adapter/dynamic registry-tool projection, database field, GraphQL operation, or UI workflow is introduced. Existing access-controlled Agent traces may retain the provider-visible call/result under their normal policy; new process-wide payload logging is forbidden. If no real provider is usable, this expanded live proof is blocked rather than replaced by a mock, while the earlier direct-MCP proof remains valid lower-level evidence.

## Contract Transition

- The application package and backend-definition contracts move to one current representation for declarations and handlers.
- Maintained generated/importable package artifacts are rebuilt from source.
- Durable application databases, platform binding/journal state, Agent/Team definitions, and global MCP configuration are not migrated or rewritten.
- No compatibility alias, dual handler location, global-registration fallback, or old/new runtime branch is retained.

## Approval Record

Initially approved by the user on 2026-08-27 on the following interpretation. After the runtime/provisioning discussion, the user confirmed that the design was clear and asked the solution designer to proceed with design:

> Existing automatic native-foundation and Team-collaboration provisioning remains unchanged. Applications explicitly select their additional configured and business tools. Application-owned in-worker business tools use one runtime-neutral, application-scoped capability with exact application/binding/run isolation across supported runtimes. Runtime-specific provisioning must not change that behavior. Arbitrary application-bundled MCP server processes and the broader external developer SDK journey remain deferred.

Post-API amendment on 2026-08-27: the user explicitly authorized improving the Brief Studio demonstration and its individual maintained Agent prompts so an actual application Agent reliably calls `get_brief_context` and uses the result. This approves the read-only Option A above: the tool informs the existing artifact publication/projection/UI workflow; it does not directly mutate application/UI state.

Post-failure technical correction on 2026-08-27: API-REV-002/CRR-005 proved the real Codex members can call the application tool but cannot receive configured ordinary registry `read_file`/`write_file`. That correction preserved the approved Option A outcome but incorrectly used normalized `edit_file` as the model-facing name. API-REV-003/CRR-007 then reproduced that failure twice and established the exact current chain: instruct Luna with built-in `apply_patch`; require Codex `item/fileChange` / `file_change`; observe it through AutoByteus normalized `edit_file`. This SR-008 correction keeps existing workspace-relative publication and complete Team handoff and does not authorize broader provider tool exposure, a runtime/model change, or a generic platform `apply_patch` API.
