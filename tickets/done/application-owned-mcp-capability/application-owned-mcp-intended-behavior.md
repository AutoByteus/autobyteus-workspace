# Application-Owned MCP — Intended-Behavior Contract

## Status

`Approved by the user on 2026-08-27; amended by post-API direction; refined on 2026-08-28 so Agent prompts remain business-focused; reconciled with DR-004 latest-base run-session authority; corrected after API-REV-005 by explicit user direction to accept any authorized runtime foundation operation, including shell`

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
| MCP HTTP endpoint, local admission, active run-session registry, protocol dispatch | Process `AgentToolsMcpHost` | One dedicated process-wide `127.0.0.1` listener; deterministic tokenless run routes; no main-listener or per-application route/listener. |
| Platform/static tools | Existing platform tool owners | Remain shared and protected. |
| User/host-configured MCP tools | Existing global MCP configuration and registry owners | Remain process-owned and unchanged outside session composition. |
| Application tool metadata | Exact application package | Static, import-safe, versioned with the package. |
| Application tool handler/business state | Exact application backend worker | Runs with application storage and normal application capabilities. |
| Binding/producer authorization and worker routing | `ApplicationPlatformRuntime` application-tool boundary | Uses authoritative live activation/binding context; never a deterministic-route- or argument-supplied application ID. |
| Tool selection | Agent/Team definition `toolNames` for application business tools | Application-owned tools require explicit selection. Existing automatic native-foundation and Team-collaboration provisioning remains unchanged and additive. |
| Provider adaptation | Existing provider-neutral runtime boundary | Every supported runtime receives the same selected application-tool meaning and isolation. The later design may use the existing scoped MCP descriptor or a native bound-tool projection as appropriate, but must not duplicate application business policy. |
| Maintained application demonstration | Brief Studio package-owned Team/Agent prompts plus existing application workflow | A real configured Agent calls the read-only tool first, uses the result in the normal published artifacts, and the existing projection/UI makes the result-informed workflow observable. |
| Maintained role instruction | Brief Studio researcher/writer `agent.md` | Describe business calls, content, canonical artifact paths, publication, and handoff outcomes. Do not prescribe runtime foundation/provider operation names. |
| Runtime foundation capability selection | Selected runtime/provider plus the model | Each runtime supplies its ordinary authorized foundation capabilities automatically; the model may use any of them, including shell, to create the requested artifact. Application config and prompts do not provision or name them, and the chosen operation alone cannot decide acceptance. |
| Provider operation protocol and AutoByteus observability | Existing provider events and AutoByteus normalization | Optional diagnostics only. An operation label is not an application prompt, application tool, cross-runtime API contract, or pass/fail oracle. |
| Maintained cross-member/file publication | Existing Team handoff and `publish_artifacts` relative-path contract | Create and publish both canonical checkpoints and carry the complete research body in the handoff so the writer has no cross-member file dependency. |
| Proof observability | Existing access-controlled Agent run trace, application Team binding, artifact projection records, and browser surface | Correlate tool call/result and exact identity without copying generic application arguments/results into new process-wide operational logs. |

## Clarified Runtime Boundary

The feature distinguishes two tool families:

- **AutoByteus-native foundation tools** are already automatically provisioned for every eligible non-compactor native Agent: `run_bash`, `read_file`, `edit_file`, and `write_file`.
- **Automatic Team collaboration tools** are already added whenever member Team context exists: `get_handoff_rules`, `send_message_to`, and `delegate_task`.
- **Configured platform/global tools** remain additive to those automatic sets and are normalized/deduplicated under the existing rules.
- **Application-owned business tools** exist because the application's business needs exceed those fundamentals. The application declares and implements them, and the platform exposes selected tools through an exact application-scoped MCP capability.

Therefore, an eligible AutoByteus-native Agent running for an application receives its unchanged automatic foundation, any automatic Team tools for which it is eligible, configured platform/global tools, and its explicitly selected application-owned MCP tools. The built-in Memory Compactor remains the current exception and receives no tools. Application business tools never become automatic merely because the Agent belongs to an application or uses the native runtime.

Changing a bound application Agent's supported runtime does not change which selected application-owned business tool it means. Runtime adapters may provision the capability differently, but every call remains bound to the same exact application declaration and worker handler.

The physical MCP endpoint remains platform-hosted: one process-wide dedicated loopback listener serves deterministic tokenless run routes. Application ownership is represented by declarations, worker handlers, and exact live route snapshots rematerialized during run activation, not by a separate listener, bearer, persisted session record, or application process.

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

- the raw MCP run-session or deterministic route ID;
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
| Run-session activation | Derive the deterministic route from normalized run ID and materialize an immutable selected route containing current application/binding/producer identity and declaration fingerprint. The live capability/route is not persisted. |
| Normal call | Revalidate current binding ownership, declaration fingerprint, application availability, and worker; then invoke once and await completion. |
| Normal reload | Block new calls, drain admitted calls, stop/reload, validate the new catalog/worker, and reopen. No local fixed completion timeout. |
| Declaration unchanged | An active older route may invoke the current code-only-updated handler after successful reentry. Package reentry does not deactivate its containing run session. |
| Tool added | Existing active records do not gain it; a newly activated/restored run session may. |
| Tool removed or declaration changed | Existing route fails closed; it is not silently rebound to the new contract. |
| Worker crash/removal | Pending/new calls fail explicitly; the platform does not retry a possibly mutating handler. |
| Run stop | Exact-run resource finalization deactivates the whole active run session. The tokenless route becomes inactive; application transition code does not own this step. |
| Run restore | Activate the same deterministic route URL with fresh current sender/owner/execution context, capability, routes, fingerprints, sources, and observer. No live route/capability is restored from storage. |
| Platform shutdown | Block run activation, drain application calls, stop workers, finalize runs/sessions, close the application capability, and finally close the process-owned local listener through existing owners. |

Package/application transition and run-session activation are deliberately orthogonal. Reentry may close an application's call lane and replace its catalog/worker without tearing down the provider's run session, because that session also owns platform/static/Team routes and its deterministic URL is cached for the run history. Exact-run stop is the only normal whole-session deactivation. Restore rematerializes current application routes at the same URL; a deterministic ID alone never recreates authorization.

## Representative Maintained Proof

Brief Studio exposes the real read-only `get_brief_context` tool backed by its own durable business data. Its maintained `codex_app_server` / `gpt-5.6-luna` researcher and writer roles each select it and, for a fresh draft run, each individual `agent.md` requires exactly one successful call as that role's first business tool action. The researcher calls before creating or publishing the research artifact; the writer calls after receiving the handoff and before creating or publishing the final artifact. The roles reuse the returned `briefId`, title, and status and include the exact compact-JSON line `Brief context: {"briefId":"…","title":"…","observedStatus":"…"}` (fixed key order and JSON-escaped values) in their normal published artifact. A missing/error result or cross-member brief mismatch stops normal publication rather than allowing guessed identity.

The role configs select only routed application/collaboration/publication business capabilities. Runtime foundation operations are neither configured nor named in either `agent.md`. After context validation, the researcher is told to produce and publish `brief-studio/research.md` with the required business content, then send the writer the exact marker, canonical path, and complete research checkpoint body. The writer consumes that body without a cross-member file dependency, copies at least one complete non-marker `Key findings` bullet verbatim into the final brief's `Key evidence`, and produces/publishes `brief-studio/final-brief.md`. The fixed Codex runtime automatically supplies its normal authorized foundation facilities and Luna may choose any of them, including shell, to fulfill the artifact request. Provider/normalized operation activity may be retained for diagnostics, but is not acceptance evidence. Artifact creation, publication, or handoff failure yields a truthful blocker; fabricated, missing, out-of-workspace, unauthorized, unpublished, or causally unjoined output cannot pass verification. Shell use alone is valid.

The proof must use a real configured model-backed Agent/Team, not a direct MCP caller or mocked decision, and must show:

- exact caller binding ownership;
- correct application worker and application database;
- no visibility from a general session or the other maintained application;
- identical Studio and standalone behavior;
- reload/stale-route and cleanup behavior;
- one paired `get_brief_context` call/result trace per participating member, joined by `toolCallId` and member `agentRunId` to the exact application, binding, and canonical member address;
- the same `briefId` carried from the tool result into the research/final artifact marker and from publication into Brief Studio's application-owned projection;
- browser evidence on the supported Brief Studio surface that the same selected brief reaches `in_review`, workflow diagnostics show the same launch binding, and the final artifact body visibly contains the same marker.
- evidence that each role's context call precedes creation/publication of its canonical business artifact; that both relative paths resolve inside the corresponding member workspace; and that the normal result is real, authorized, published, and causally joined rather than fabricated. The foundation operation used to create the artifact, including shell, is immaterial; provider/normalized events are optional diagnostics only.

`get_brief_context` remains read-only. Its call alone does not mutate Brief Studio or change the UI. The observable state change remains `required business artifact -> publish_artifacts(workspace-relative path) -> artifact relay/reconciliation -> ready-for-review notification -> GraphQL refresh -> UI`. Runtime foundation operations and provider event labels are implementation/observability details below that business spine. No new mutation tool, platform-wide Codex file adapter/dynamic registry-tool projection, database field, GraphQL operation, or UI workflow is introduced. Existing access-controlled Agent traces may retain provider-visible activity under their normal policy; new process-wide payload logging is forbidden. If no real provider is usable, this expanded live proof is blocked rather than replaced by a mock, while the earlier direct-MCP proof remains valid lower-level evidence.

## Contract Transition

- The application package and backend-definition contracts move to one current representation for declarations and handlers.
- Maintained generated/importable package artifacts are rebuilt from source.
- Durable application databases, platform binding/journal state, Agent/Team definitions, and global MCP configuration are not migrated or rewritten.
- No compatibility alias, dual handler location, global-registration fallback, or old/new runtime branch is retained.

## Approval Record

Initially approved by the user on 2026-08-27 on the following interpretation. After the runtime/provisioning discussion, the user confirmed that the design was clear and asked the solution designer to proceed with design:

> Existing automatic native-foundation and Team-collaboration provisioning remains unchanged. Applications explicitly select their additional configured and business tools. Application-owned in-worker business tools use one runtime-neutral, application-scoped capability with exact application/binding/run isolation across supported runtimes. Runtime-specific provisioning must not change that behavior. Arbitrary application-bundled MCP server processes and the broader external developer SDK journey remain deferred.

Post-API amendment on 2026-08-27: the user explicitly authorized improving the Brief Studio demonstration and its individual maintained Agent prompts so an actual application Agent reliably calls `get_brief_context` and uses the result. This approves the read-only Option A above: the tool informs the existing artifact publication/projection/UI workflow; it does not directly mutate application/UI state.

Post-failure technical correction on 2026-08-27: API-REV-002/CRR-005 proved the real Codex members can call the application tool but cannot receive configured ordinary registry file tools. API-REV-003/CRR-007 isolated provider vocabulary and SR-008/API-REV-004 proved the current provider path. On 2026-08-28 the user clarified the stable abstraction: the maintained role prompt describes the business artifact and lets the capable LLM select automatically supplied runtime tools; it does not name `apply_patch`, `edit_file`, or other foundation mechanics. Provider events remain verifier evidence only.

Latest-base reconciliation on 2026-08-28: after the user requested alignment with advanced `personal`, DR-004 found that finalized `agent-tools-mcp-session-resume` supersedes the ticket's bearer-session seam. The approved application behavior now composes with deterministic tokenless `activateForRun`/`deactivateForRun`, the dedicated loopback listener, fresh restore materialization, and exact-run cleanup. This is an upstream architecture reconciliation, not approval to weaken application isolation or alter package/business behavior.

Post-API-REV-005 correction on 2026-08-28: the actual latest-base Codex/Luna Team completed the required application call, result use, workspace artifacts, relative publication, handoff, same-brief reconciliation, and browser UI while selecting its automatically supplied shell capability. The user explicitly rejected the solution-authored rule that failed this correct run: any already-authorized runtime foundation operation, including shell, is acceptable. The proof continues to reject fabricated, missing, outside-workspace, unauthorized, unpublished, or unjoined output. This correction changes no production architecture, runtime capability policy, application prompt choreography, or business/UI flow.
