# Design Spec

## Current-State Read

The Codex runtime currently has two separate configuration axes:

- `CODEX_APP_SERVER_SANDBOX` / `CodexThreadConfig.sandbox`, resolved by `normalizeSandboxMode()`, controls Codex App Server filesystem sandboxing. Valid values are `read-only`, `workspace-write`, and `danger-full-access`; default is `workspace-write`.
- `AgentRunConfig.autoExecuteTools` / `CodexThreadConfig.approvalPolicy`, resolved by `resolveApprovalPolicyForAutoExecuteTools(...)`, controls the Codex App Server approval policy. Current mapping is `true -> never`, `false -> on-request`.

The current server-request path is:

`CodexAppServerClient -> CodexClientThreadRouter -> CodexThread.handleAppServerRequest -> handleAppServerRequest(...) in codex-thread-server-request-handler.ts -> CodexThread approval records or dynamic handler execution`

Current approval handling is partial:

- `item/commandExecution/requestApproval`: handled by storing a `CodexApprovalRecord`, emitting a visible approval event, and waiting for `approveToolInvocation(...)`.
- `item/fileChange/requestApproval`: same visible approval flow.
- `mcpServer/elicitation/request`: manual visible approval when `autoExecuteTools=false`; auto-accept when `autoExecuteTools=true`.
- `item/tool/call`: backend dynamic tools execute immediately by invoking the registered handler. This path has no explicit `autoExecuteTools=false` gate.
- `item/permissions/requestApproval`: present in local Codex CLI `0.135.0` generated protocol schema, but unsupported by the backend handler.

This produces two user-visible gaps:

1. With `autoExecuteTools=true` and sandbox still `workspace-write`, Codex can be told not to ask for approval while still needing broader permission. If Codex emits or suppresses permission escalation, the user can see silent/internal failure instead of an automatically allowed action.
2. With `autoExecuteTools=false`, dynamic tools can execute once Codex sends `item/tool/call`, even though the operator expected manual approval.

The target design must preserve existing public approval entrypoints (`approveToolInvocation` over GraphQL/WebSocket), existing lifecycle events, and existing shell/file/MCP behavior while adding missing dynamic-tool and permission-request coverage.

## Intended Change

Make `autoExecuteTools` the authoritative Codex per-run tool-access policy across every Codex server-request tool surface:

- When `autoExecuteTools=true`, the backend treats the Codex run as high-trust auto-allowed mode:
  - effective Codex sandbox for that run becomes `danger-full-access` to avoid workspace-sandbox permission dead ends;
  - command/file approval requests are auto-accepted defensively if Codex still emits them;
  - MCP elicitations remain auto-accepted;
  - dynamic tool calls execute immediately;
  - permission-escalation requests are auto-granted with the requested permission profile.
- When `autoExecuteTools=false`, the backend gates every approval-capable Codex server-request surface consistently:
  - command/file/MCP requests continue to surface visible approval;
  - dynamic `item/tool/call` stores a pending approval and does not invoke the handler until approval;
  - permission-escalation requests store a pending approval and grant no permissions until approval.

Update docs/UI copy to make the trust boundary explicit: Codex auto-approve is not merely "skip prompts"; it automatically allows tool access/permissions for that run.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - `codex-thread-server-request-handler.ts` directly executes dynamic tools and lacks `item/permissions/requestApproval` handling.
  - `CodexThread.approveTool(...)` only understands decision and MCP elicitation response modes.
  - `CodexThreadConfig` has separate `sandbox` and `approvalPolicy`, but no effective per-run auto-approved access resolver.
- Design response:
  - Introduce a cohesive Codex approval owner around server-request classification, auto/manual decision, pending approval records, and approval-response dispatch.
  - Extend pending approval records to all Codex approval surfaces.
  - Resolve effective sandbox for auto-approved Codex runs as `danger-full-access`.
- Refactor rationale:
  - Adding dynamic manual approval and permission approval directly into the existing handler would deepen an already mixed file that currently owns classification, immediate execution, approval storage, protocol response shapes, and local event emission.
  - A small approval coordinator/record union keeps `autoExecuteTools` policy centralized and testable.
- Intentional deferrals and residual risk, if any:
  - Persistent Codex exec/network policy amendments (`acceptForSession`, `acceptWithExecpolicyAmendment`, network amendments) remain out of scope. Existing UI has only approve/deny; this change implements the same binary approval intent for new request types.
  - Permission denial response shape must be validated. The design uses an empty/no-op granted permission profile for denial unless implementation testing finds Codex requires a different no-grant response.

## Terminology

- `Codex tool-access policy`: the per-run policy derived from `autoExecuteTools` that decides whether Codex tool requests are auto-allowed or must wait for user approval.
- `Permission escalation`: Codex App Server `item/permissions/requestApproval`, asking the client to grant additional filesystem/network permissions.
- `Dynamic tool`: backend-registered Codex tool invoked through `item/tool/call`, such as `send_message_to`, browser tools, media tools, or `publish_artifacts`.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the legacy direct dynamic-tool execution path for `autoExecuteTools=false`; dynamic execution must go through the unified Codex approval owner.
- Keep existing public approval APIs, but do not keep old partial behavior where only shell/file/MCP requests are approval-aware.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User starts/restores Codex run | Codex App Server receives thread config | Codex thread bootstrapper | Ensures `autoExecuteTools=true` produces effective full-access, auto-approved run config. |
| DS-002 | Primary End-to-End | Codex App Server sends server request | Tool executes/permission granted or waits for approval | Codex tool approval coordinator | Central behavior change for command/file/MCP/dynamic/permission requests. |
| DS-003 | Return-Event | User approves/denies pending request | Codex App Server receives response/result | Codex thread approval response boundary | Ensures manual approval resumes or denies the exact pending Codex action. |
| DS-004 | Bounded Local | Dynamic `item/tool/call` request | Handler result or denial result returned to Codex | Codex tool approval coordinator | Prevents dynamic handler execution before approval in manual mode. |
| DS-005 | Bounded Local | Permission request | Requested permission grant or no-grant response | Codex tool approval coordinator | Prevents silent permission failure and adds missing protocol handling. |

## Primary Execution Spine(s)

- Run config spine: `Launch Config -> AgentRunConfig -> CodexThreadBootstrapper -> CodexThreadConfig -> CodexThreadManager -> Codex App Server thread/start|resume`
- Server-request spine: `Codex App Server -> CodexClientThreadRouter -> CodexThread -> Codex Tool Approval Coordinator -> Pending Approval / Immediate Execution -> Codex App Server response`
- Manual approval return spine: `UI/API Approval -> AgentRun -> CodexAgentRunBackend -> CodexThread.approveTool -> Codex Tool Approval Coordinator -> Codex App Server response`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A run's `autoExecuteTools` field is converted into both the Codex approval policy and effective sandbox for that run before Codex App Server starts/resumes the thread. | Launch config, `AgentRunConfig`, `CodexThreadBootstrapper`, `CodexThreadConfig`, `CodexThreadManager` | `CodexThreadBootstrapper` | Server settings, sandbox normalizer, docs/UI copy. |
| DS-002 | Every Codex server request reaches one approval owner that classifies the method, decides auto vs manual from `autoExecuteTools`, and either responds immediately or records a pending approval. | Codex App Server, router, `CodexThread`, approval coordinator, dynamic handler/permission grant | Codex tool approval coordinator | Event conversion, pending record storage, dynamic handler map. |
| DS-003 | A user's approve/deny command finds the pending record, dispatches the correct response shape for that record type, and removes the pending record exactly once. | UI/API, `AgentRun`, backend, `CodexThread`, approval coordinator | `CodexThread` + approval coordinator | GraphQL/WebSocket transport, user-facing events. |
| DS-004 | Dynamic tool calls in manual mode become pending approvals instead of immediate handler calls; approval invokes the registered handler once and denial returns a failure result without invoking it. | Dynamic request, pending dynamic record, dynamic handler | Approval coordinator | Handler map, dynamic result formatting. |
| DS-005 | Permission escalation requests are no longer unsupported; auto mode grants the requested profile, manual mode waits, approval grants, denial returns no additional permission. | Permission request, pending permission record, permission response | Approval coordinator | Protocol schema normalization. |

## Spine Actors / Main-Line Nodes

- `AgentRunConfig`: carries per-run `autoExecuteTools`.
- `CodexThreadBootstrapper`: maps run config/settings into Codex thread config.
- `CodexThreadManager`: sends thread config to Codex App Server.
- `CodexClientThreadRouter`: routes app-server requests to the matching thread.
- `CodexThread`: runtime thread aggregate, pending approval store, public approval method.
- Codex tool approval coordinator: classifies and handles all tool approval/request methods.
- Codex App Server: external runtime protocol peer.

## Ownership Map

- `AgentRunConfig` owns launch-time per-run policy values. It should not interpret Codex protocol details.
- `CodexThreadBootstrapper` owns conversion from AutoByteus run config and server settings to Codex thread config. It should own effective sandbox resolution for auto-approved Codex runs.
- `CodexThreadManager` owns app-server thread lifecycle RPCs. It should not decide approval policy; it should pass finalized config.
- `CodexThread` owns runtime thread state, pending approval records, active turn id, and the `approveTool(...)` public backend boundary.
- Codex tool approval coordinator owns server-request classification, auto/manual approval decision, dynamic handler invocation gating, permission-grant response shapes, and approval-response dispatch for pending records.
- Event converters own translating local/Codex approval events into AutoByteus `AgentRunEvent`s; they must not decide approval policy.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `approveToolInvocation` | `AgentRun` -> runtime backend -> `CodexThread` | Public API for user approval/denial | Codex protocol response shapes or dynamic handler execution. |
| WebSocket `TOOL_APPROVAL` handlers | `AgentRun` / team run approval target | Streaming approval route | Codex approval policy. |
| `CodexClientThreadRouter` | `CodexThread` / approval coordinator | Routes app-server requests to correct thread | Server-request policy or response semantics. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Direct unconditional dynamic handler execution in `handleDynamicToolCallRequest` | Manual mode must gate dynamic tools before execution | Codex tool approval coordinator dynamic-tool path | In This Change | Auto mode may still execute immediately through the coordinator. |
| Unsupported fallback for `item/permissions/requestApproval` | Permission requests are in the current Codex protocol and must not be rejected as unknown | Codex permission approval path | In This Change | Unknown methods should still respond unsupported. |
| Binary-only `CodexApprovalRecord.responseMode` | Pending approvals now include decision, MCP, dynamic, and permission response shapes | Discriminated `CodexApprovalRecord` union | In This Change | Keep the file, tighten its type. |
| Documentation implication that auto-approve only skips prompts | New behavior auto-allows tool access/permissions | Updated docs/UI copy | In This Change / Delivery docs sync | Durable docs finalization belongs to delivery too. |

## Return Or Event Spine(s) (If Applicable)

- `LOCAL_TOOL_APPROVAL_REQUESTED -> CodexThreadEventConverter -> TOOL_APPROVAL_REQUESTED -> UI -> approveToolInvocation -> CodexThread.approveTool -> protocol response`
- `LOCAL_TOOL_APPROVED -> CodexThreadEventConverter -> TOOL_APPROVED -> UI/history`
- Dynamic approval return: `approveTool(dynamic) -> execute dynamic handler -> respondSuccess(DynamicToolCallResponse) -> Codex App Server emits item completion -> converter emits TOOL_EXECUTION_SUCCEEDED/FAILED`
- Permission approval return: `approveTool(permission) -> respondSuccess(PermissionsRequestApprovalResponse) -> Codex App Server continues with granted or no-grant permissions`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: Codex tool approval coordinator.
  - Dynamic tool call: `validate payload -> resolve handler -> auto? execute : record approval -> approve? execute : return denial result`.
  - Matters because handler execution must be delayed until approval in manual mode.
- Parent owner: Codex tool approval coordinator.
  - Permission request: `validate request -> auto? grant requested permissions : record approval -> approve? grant requested permissions : return no-grant profile`.
  - Matters because unsupported permission requests are the likely silent-failure source.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Server setting normalization | DS-001 | `CodexThreadBootstrapper` | Validate global sandbox setting | Keeps Settings validation out of thread runtime | Runtime lifecycle would own config parsing. |
| Dynamic tool registration/filtering | DS-002, DS-004 | Approval coordinator / `CodexRunContext` | Provide handler map and specs | Tool exposure remains agent-definition driven | Approval owner would become tool catalog owner. |
| Event conversion | DS-002, DS-003 | UI/history streams | Convert local/Codex approval events | Keeps protocol events separate from approval policy | Approval coordinator would become UI renderer. |
| Permission profile normalization | DS-005 | Approval coordinator | Build grant/no-grant response payloads | Codex protocol shape is specialized and reusable | Ad hoc response objects would duplicate and drift. |
| Docs/UI copy | DS-001 | Operator mental model | Explain high-trust auto mode | Prevents surprise from auto full-access behavior | Backend behavior would remain hidden. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Pending approval storage | Codex thread aggregate | Extend | Existing `CodexThread.approvalRecords` already stores app-server request ids and invocation ids | N/A |
| Approval API transport | GraphQL/WebSocket approval handlers | Reuse | Existing UI/API already sends approve/deny by invocation id | N/A |
| Server-request handling | Codex thread server-request handler | Extend + split coordinator | Same routing path should remain, but policy needs one owner | N/A |
| Permission response shape | None | Create New helper under Codex thread area | Protocol-specific normalization not currently owned | Existing dynamic tool/result helpers do not model permission grants. |
| Effective sandbox resolution | Codex thread bootstrapper / sandbox setting | Extend | Bootstrapper already owns thread config construction | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/codex/backend` | Run bootstrap, effective thread config | DS-001 | `CodexThreadBootstrapper` | Extend | Add effective sandbox resolver for auto-approved runs. |
| `agent-execution/backends/codex/thread` | Thread state, server requests, pending approvals, approval responses | DS-002, DS-003, DS-004, DS-005 | `CodexThread`, approval coordinator | Extend | Main implementation area. |
| `agent-execution/backends/codex/events` | Event conversion to AutoByteus runtime events | DS-002, DS-003 | UI/history stream | Extend | Ensure local permission/dynamic approval payloads convert cleanly. |
| `autobyteus-web` run config components/localization | User-facing warning/copy | DS-001 | Operator setup UI | Extend | Keep minimal copy updates; no new setting. |
| Docs | Durable behavior explanation | DS-001 | Delivery/docs consumers | Extend | README/settings docs should describe auto-approved access semantics. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex-thread-bootstrapper.ts` | Codex backend bootstrap | Thread config builder | Resolve effective sandbox for auto-approved Codex runs | Existing file builds `CodexThreadConfig` | Uses sandbox constants. |
| `codex-thread-server-request-handler.ts` | Codex thread request handling | Server request entrypoint | Delegate request classification and handling to approval coordinator; keep unsupported fallback | Existing app-server request entrypoint | Uses coordinator. |
| `codex-tool-approval-coordinator.ts` | Codex thread request handling | Approval policy owner | Classify command/file/MCP/dynamic/permission requests; auto/manual handling; execute dynamic tools after approval | One cohesive policy owner | Uses approval records, permission helper, dynamic result helper. |
| `codex-approval-record.ts` | Codex thread state model | Pending approval model | Discriminated pending approval records for decision/MCP/dynamic/permission | Existing record file, tightened | Shared by thread and coordinator. |
| `codex-permission-approval-response.ts` | Codex thread protocol helper | Permission response normalizer | Build requested grant and no-grant response payloads | Permission protocol shape is distinct and reusable | Uses JSON object helpers. |
| `codex-thread.ts` | Codex thread aggregate | Thread runtime state and public approval method | Store records; delegate approval response to coordinator or dispatch helper; clear records | Existing aggregate | Uses approval records. |
| `codex-thread-event-name.ts` | Codex event constants | Event name catalog | Add permission request constant if raw event method needs enum reference | Existing event constants | N/A |
| `codex-item-event-converter.ts` | Codex event conversion | Tool event converter | Ensure local dynamic/permission approval payloads convert to `TOOL_APPROVAL_REQUESTED` | Existing converter handles local approval | Uses parser. |
| Tests under `tests/unit/agent-execution/backends/codex/...` | Unit validation | Request-handler and bootstrap tests | Cover auto/manual dynamic and permission paths | Existing test ownership | N/A |
| E2E/integration tests | Executable validation | Codex runtime behavior | Cover live/mocked API/E2E cases | Existing validation ownership | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Pending approval records by response mode | `codex-approval-record.ts` | Codex thread | Used by request handler/coordinator and `CodexThread.approveTool` | Yes | Yes | Generic all-runtime approval DTO. |
| Permission grant/no-grant response payload | `codex-permission-approval-response.ts` | Codex thread | Used in auto and manual approval/denial | Yes | Yes | Broad sandbox policy owner. |
| Dynamic tool call input/result handling | Coordinator using existing `codex-dynamic-tool.ts` | Codex thread/dynamic tool | Needed for auto and manual approval result dispatch | Yes | Yes | Duplicate dynamic tool registry. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `CodexApprovalRecord` union | Yes | Yes | Medium | Make `responseMode` a discriminant and keep per-mode fields specific. |
| `CodexPermissionApprovalResponse` helper payload | Yes | Yes | Low | Only model generated schema fields: `permissions`, `scope`, optional `strictAutoReview`. |
| Dynamic pending approval payload | Yes | Yes | Medium | Store only request id, call id, tool name, thread/turn ids, arguments; resolve handler at execution time from current runtime context. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex backend bootstrap | Thread config builder | Use `resolveEffectiveCodexSandboxMode(autoExecuteTools)` so auto-approved Codex runs use `danger-full-access` | Existing config builder | Sandbox constants. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts` | Codex thread | App-server request entrypoint | Parse app-server method and delegate to approval coordinator; keep unsupported method error | Existing request entrypoint | Coordinator. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-tool-approval-coordinator.ts` | Codex thread | Approval policy owner | Classify and handle command/file/MCP/dynamic/permission requests; enforce auto/manual policy; dispatch pending approval responses | Centralizes policy and protocol response shapes | Approval record union, dynamic helper, permission helper. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-approval-record.ts` | Codex thread | Pending approval model | Discriminated records for `decision`, `mcp_server_elicitation`, `dynamic_tool_call`, `permission_request` | Existing record owner, tightened | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-permission-approval-response.ts` | Codex thread | Permission protocol helper | Build grant/no-grant `PermissionsRequestApprovalResponse` payloads | Keeps permission protocol details out of coordinator branches | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Codex thread | Runtime aggregate | Store/find/delete approval records; `approveTool(...)` delegates response by record type | Existing state owner | Approval record union. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.ts` | Codex events | Event constants | Add permission request method constant if used | Existing enum | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Codex events | Runtime event conversion | Convert dynamic/permission local approval payloads using existing `LOCAL_TOOL_APPROVAL_REQUESTED` path | Existing converter | Existing parser. |
| `README.md`, `autobyteus-web/docs/settings.md`, relevant localization/components | Docs/UI | Operator contract | Clarify Codex auto-approve high-trust behavior and relation to full access | Durable explanation | N/A |

## Ownership Boundaries

- `CodexThreadBootstrapper` decides the finalized `CodexThreadConfig`; callers must not separately override sandbox after bootstrap.
- Codex tool approval coordinator decides how each Codex server request is handled; `CodexThread` should not duplicate per-method policy beyond delegating approval response.
- Dynamic tool registrations own their handler business logic; they do not decide whether a tool call is approved.
- UI/API approval entrypoints only carry user decisions; they do not construct Codex protocol responses.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CodexThreadBootstrapper.buildThreadConfig` | Sandbox/approval policy mapping | Backend factory | Thread manager recomputing sandbox/approval policy | Add explicit config fields/resolver in bootstrapper. |
| Codex tool approval coordinator | Request classification, pending record creation, auto/manual response | `codex-thread-server-request-handler.ts`, `CodexThread.approveTool` | Direct dynamic handler invocation in handler bypassing approval policy | Add coordinator method for the request type. |
| `CodexThread.approveTool` | Pending approval lookup/deletion | Backend/API approval calls | API constructing protocol response by request type | Extend pending record + coordinator response dispatch. |

## Dependency Rules

- `codex-thread-server-request-handler.ts` may call the approval coordinator; it must not own per-request policy itself.
- The approval coordinator may read `codexThread.runContext.config.autoExecuteTools`, `codexThread.runContext.runtimeContext.dynamicToolHandlers`, and use `codexThread.client.respondSuccess/respondError`.
- Dynamic tool handlers must only be invoked through the coordinator path.
- Event converters must not inspect `autoExecuteTools`.
- The bootstrapper may depend on sandbox constants/normalizers; thread manager must only use the finalized config.
- Frontend docs/copy must not introduce a second field or alias for Codex auto-approve.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `resolveApprovalPolicyForAutoExecuteTools(autoExecuteTools)` | Codex approval policy | Map boolean to Codex approval policy | boolean | Existing, keep or extend if granular policy is introduced. |
| `resolveEffectiveCodexSandboxMode(autoExecuteTools)` | Codex sandbox | Map run policy + server setting to effective sandbox | boolean + env setting | New/changed helper; auto true returns `danger-full-access`. |
| `handleAppServerRequest(...)` | Codex server request | Route method to coordinator or unsupported fallback | request id, method, params, thread | Existing exported boundary. |
| `handleOrQueueDynamicToolCall(...)` | Dynamic tool request | Execute or record approval based on policy | request id + params | New coordinator method/branch. |
| `handlePermissionApprovalRequest(...)` | Permission escalation | Grant, queue, or no-grant response | request id + params.permissions | New coordinator method/branch. |
| `approveTool(invocationId, approved)` | Pending Codex approval | Resume/deny exact pending action | invocation id + boolean | Existing public backend method. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `approveTool(invocationId, approved)` | Yes | Yes | Medium | Invocation id can represent different pending record kinds; discriminated record resolves the subject. |
| `handleAppServerRequest` | Yes | Yes | Low | Method string classifies protocol request; unsupported fallback remains. |
| Dynamic handler map lookup | Yes | Yes | Low | Tool name is explicit. |
| Permission response helper | Yes | Yes | Low | Input is a permission profile, not a generic tool args object. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Approval policy owner | `CodexToolApprovalCoordinator` | Yes | Low | Name reflects Codex-specific tool approval/access policy. |
| Permission helper | `codex-permission-approval-response.ts` | Yes | Low | Keep scoped to response payloads. |
| Effective sandbox resolver | `resolveEffectiveCodexSandboxMode` | Yes | Low | Avoid vague `fullAccess` because it derives from auto policy + setting. |

## Applied Patterns (If Any)

- Discriminated union for pending approval records: keeps response-specific fields tight and avoids optional-field record drift.
- Coordinator pattern inside one runtime owner: centralizes policy without making `CodexThread` a protocol-policy god object.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread` | Folder | Codex thread runtime | Thread request/approval state and protocol response handling | Existing Codex thread protocol area | UI docs or server settings UI logic. |
| `.../thread/codex-tool-approval-coordinator.ts` | File | Codex approval policy | Unified auto/manual handling for server-request tool surfaces | Sits next to thread request handler and records | Dynamic tool business logic. |
| `.../thread/codex-permission-approval-response.ts` | File | Permission protocol helper | Grant/no-grant response construction | Protocol-specific helper near request handling | General sandbox config parsing. |
| `.../thread/codex-approval-record.ts` | File | Pending approval model | Discriminated union records | Existing approval model file | Runtime event conversion. |
| `.../backend/codex-thread-bootstrapper.ts` | File | Thread config builder | Effective sandbox and approval policy config | Existing bootstrap owner | Request-time approval policy. |
| `autobyteus-web/components/workspace/config/*RunConfigForm.vue`, `components/mobile/MobileLaunchRunOptionsCard.vue` | Files | Run setup UI | Add concise high-trust auto-approve copy if needed | Existing UI controls | New backend config fields. |
| `README.md`, `autobyteus-web/docs/settings.md` | Files | Durable docs | Explain auto-approve/full-access relationship | Existing docs | Implementation-specific test details. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/backends/codex/thread` | Main-Line Domain-Control | Yes | Medium | It already contains thread state and protocol handling. Adding small approval files is clearer than a new folder for this scope. |
| `agent-execution/backends/codex/backend` | Main-Line Domain-Control | Yes | Low | Bootstrapper remains config owner. |
| `autobyteus-web/components/...` | UI Presentation | Yes | Low | Only copy/help text changes, not backend policy. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Auto-approved permission request | `permission request -> auto true -> respond { permissions: requested, scope: "session" }` | `permission request -> unsupported method -> silent/opaque failure` | Shows the missing access path is explicitly handled. |
| Manual dynamic tool request | `item/tool/call -> auto false -> record pending -> TOOL_APPROVAL_REQUESTED -> approve -> handler executes once` | `item/tool/call -> handler executes immediately while auto false` | Captures the dynamic-tool bug. |
| Effective sandbox | `autoExecuteTools=true -> sandbox danger-full-access` | `autoExecuteTools=true -> approvalPolicy never + workspace-write sandbox` | Avoids suppressed prompts plus blocked access. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep dynamic tools always immediate and only document the exception | Minimal code change | Rejected | Dynamic tools must obey `autoExecuteTools=false` approval boundary. |
| Keep `workspace-write` sandbox when auto true and only handle permission requests | Preserves separation from full-access setting | Rejected as insufficient | Auto true must not silently fail if permission prompts are suppressed or incomplete; effective sandbox becomes `danger-full-access` defensively. |
| Add a second `autoApprovePermissions` setting | More granular security | Rejected for this scope | User expectation is one auto-approve control; avoid duplicated policy. |
| Compatibility wrapper around old `CodexApprovalRecord` shape | Easier migration | Rejected | Clean-cut discriminated record union. |

## Derived Layering (If Useful)

- Transport/API layer: GraphQL/WebSocket approval entrypoints.
- Runtime aggregate layer: `CodexThread` state and public approval method.
- Protocol-policy layer: Codex tool approval coordinator and permission response helper.
- External runtime layer: Codex App Server JSON-RPC requests/responses.

## Migration / Refactor Sequence

1. Extend `CodexApprovalRecord` into a discriminated union with decision, MCP, dynamic-tool, and permission-request records.
2. Add permission response helper for requested grant and no-grant payloads.
3. Add Codex tool approval coordinator and move current command/file/MCP request handling into it without behavior change.
4. Add auto-accept handling for command/file requests when `autoExecuteTools=true` as defensive coverage.
5. Add dynamic tool manual gating:
   - auto true: execute immediately;
   - auto false: record pending approval and emit `LOCAL_TOOL_APPROVAL_REQUESTED`;
   - approve: execute handler once and respond;
   - deny: respond with failed dynamic result without executing handler.
6. Add permission request handling:
   - auto true: grant requested permissions with session scope;
   - auto false: record pending approval and emit `LOCAL_TOOL_APPROVAL_REQUESTED`;
   - approve: grant requested permissions with turn scope;
   - deny: return no-grant profile.
7. Update `CodexThread.approveTool(...)` to dispatch all record response modes and delete records exactly once after successful response/denial dispatch.
8. Update effective sandbox resolution in bootstrapper so `autoExecuteTools=true` yields `danger-full-access` for Codex thread config.
9. Update event conversion only if current local approval conversion does not include correct dynamic/permission tool names/arguments.
10. Add unit/integration tests.
11. Add API/E2E tests for dynamic and permission approval behavior.
12. Update docs/UI copy.

## Key Tradeoffs

- Effective full access for `autoExecuteTools=true` is stronger than the old interpretation, but it matches the clarified operator expectation and avoids silent failure caused by suppressed prompts under `workspace-write`.
- Manual gating for dynamic tools may introduce approval prompts for tools that previously ran immediately. That is intentional because `autoExecuteTools=false` should mean visible approval before tool execution.
- Permission-denial response uses no-grant semantics instead of a `decision: decline` field because the Codex protocol response schema does not expose a decision field for permission requests.

## Risks

- Auto true + effective `danger-full-access` is security-sensitive. Documentation and UI copy must be explicit.
- Codex App Server may have nuanced semantics for empty permission grants; implementation must validate with generated schema and tests.
- Dynamic tool manual gating changes timing. Ensure pending approval records are cleared on thread close and that denial produces a result Codex can consume.
- Live Codex tests may require `RUN_CODEX_E2E=1`; pair live E2E with deterministic unit tests for handler behavior.

## Guidance For Implementation

- Keep `autoExecuteTools` as the only approval-policy input; do not add a parallel config alias.
- Prefer small helper functions with explicit response shapes over ad hoc objects in switch branches.
- Emit local approval requests with `tool_name` and `arguments` populated:
  - dynamic: actual dynamic tool name and tool arguments;
  - permission: `tool_name: "request_permissions"`, arguments containing requested permission profile, `cwd`, and optional `reason`.
- For dynamic denial, return `createCodexDynamicToolTextResult("Tool execution denied by user.", false)` or equivalent clear failure text.
- For permission denial, return no additional permissions (`{ permissions: { fileSystem: null, network: null }, scope: "turn" }`) unless implementation validation finds Codex expects a different no-grant shape.
- Unit tests should verify handler invocation counts so dynamic handlers cannot execute before approval.
- API/E2E tests should cover the user-observable event stream, not only internal handler calls.
