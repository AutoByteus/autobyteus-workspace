# Design Spec

## Current-State Read

The current classroom failure follows this path:

`Team launch preset -> Mixed team member config -> AgentRunConfig -> ClaudeSessionBootstrapper -> ClaudeSession -> ClaudeSdkClient -> @anthropic-ai/claude-agent-sdk -> Claude Code process`

The team run path correctly preserves the user's launch/runtime choices until Claude bootstrap. The defect begins at the Claude runtime boundary: `autoExecuteTools` is an AutoByteus approval policy, but `ClaudeSessionBootstrapper` calls `resolveClaudePermissionMode(autoExecuteTools)` and stores `autoExecuteTools=true` as Claude provider `permissionMode: "bypassPermissions"`. `ClaudeSession.executeTurn` then passes that mode to `ClaudeSdkClient`, which passes it to the SDK/Claude Code process. In the Docker all-in-one container the server process runs as `root`, and Claude Code v2.1.195 rejects dangerous skip/bypass permissions under root/sudo, exiting with code 1.

The current diagnostic boundary is also too thin. `ClaudeSdkClient` does not capture the SDK-supported `stderr` stream, so the user and server log see only `Claude Code process exited with code 1` instead of the root/sudo restriction. Separately, when Claude Code starts with safe `permissionMode: "default"` but auth is missing, the SDK emits a terminal `result` with `is_error: true` and `Not logged in · Please run /login`; current `isClaudeTurnTerminalChunk` treats all `type: "result"` chunks as successful completion candidates.

Follow-up investigation confirmed Claude's built-in sandbox is not enabled by default (`sandbox.enabled` defaults to false). The target design therefore intentionally does **not** enable Claude sandboxing; users who want sandbox isolation must configure Claude sandboxing or run in an explicit container/VM/sandbox runtime. The user accepted the `permissionMode: "default"` direction on 2026-06-29, with one requirement refinement: validation must prove the new default-mode callback auto-approval works for write/delete/shell-command cases both inside the workspace and against a safe outside-workspace scratch directory. This guards against the likely reason `bypassPermissions` was previously attractive: outside-workspace operations may otherwise have prompted or stalled.

## Intended Change

Decouple AutoByteus `autoExecuteTools` from Claude provider `permissionMode`. Standard Claude run/team launches should use safe provider `permissionMode: "default"` while preserving auto-approval through the existing Claude permission coordinator/SDK `canUseTool` callback. Add a bounded, redacted Claude process diagnostic capture path and classify SDK terminal error results as runtime errors.

Validation is part of the design, not an optional afterthought: tests must include permission-sensitive write/delete/shell scenarios in the run workspace and in a disposable outside-workspace scratch path, with `autoExecuteTools=true` auto-allowing them under default mode and `autoExecuteTools=false` preserving manual gating.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `claude-session-config.ts` encodes `autoExecuteTools=true` as `bypassPermissions`; current Docker root process and SDK probe show that provider mode fails before a turn can start. `ClaudeSessionToolUseCoordinator` already owns AutoByteus auto approval, so the current provider-mode coupling bypasses the healthier owner.
- Design response: Make auto approval an explicit Claude runtime-context/session policy; keep provider permission mode default for standard launches; route permission callbacks through the coordinator; add diagnostic capture and error-result classification.
- Refactor rationale: A root-only guard would leave the same boundary confusion and could re-break in other process contexts. The correct invariant is independent of root: AutoByteus auto approval is not Claude dangerous bypass mode.
- Intentional deferrals and residual risk, if any: A future explicit product setting for Claude provider permission modes is deferred. If needed, it must include root/sudo preflight and should not reuse `autoExecuteTools`.
- User-confirmed sandbox boundary: Claude sandboxing remains manual/opt-in; this fix must not silently enable or disable Claude sandbox settings.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission the old `autoExecuteTools -> permissionMode: "bypassPermissions"` mapping for standard Claude run/team launches.
- Treat removal as first-class design work: tests/docs that assert or teach the old mapping must be updated, not preserved behind a compatibility branch.
- Decision rule: the design must not retain a dual path where `autoExecuteTools` sometimes means provider dangerous bypass and sometimes means AutoByteus auto approval.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Team/standalone run launch config | Claude Code child process launch | Claude runtime session bootstrap + SDK client | Shows where `autoExecuteTools` currently crosses into provider permission mode. |
| DS-002 | Bounded Local | Claude SDK permission callback | AutoByteus approval/auto-approval decision | `ClaudeSessionToolUseCoordinator` | Preserves tool auto approval without provider bypass. |
| DS-003 | Return-Event | Claude process stderr / SDK error result | Runtime `ERROR` event and user-visible error status | `ClaudeSession` + `ClaudeSdkClient` diagnostics boundary | Makes startup/auth failures actionable. |
| DS-004 | Bounded Local | Controlled Claude permission-coverage harness | Sentinel side-effect / approval-gating assertion | Claude session tests / API-E2E coverage | Proves default-mode callback approval is not workspace-only and does not rely on provider bypass. |

## Primary Execution Spine(s)

`Team launch preset / standalone run config -> AgentRunConfig -> ClaudeSessionBootstrapper -> ClaudeSession -> ClaudeSdkClient query options -> Claude Code process`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Run/team launch supplies model, workspace, runtime kind, and AutoByteus approval policy. Claude bootstrap builds runtime context. Claude session starts a turn and asks `ClaudeSdkClient` to launch the SDK query. The SDK client must pass safe provider options to Claude Code. | Launch config, `AgentRunConfig`, `ClaudeAgentRunContext`, `ClaudeSession`, `ClaudeSdkClient`, Claude Code process | Claude runtime bootstrap/session boundary | Workspace/skill materialization, model identifier, configured tools/MCP, auth env |
| DS-002 | When Claude asks whether a tool can be used, the permission callback enters the coordinator. If `autoExecuteTools` is true, the coordinator auto-approves and emits approval lifecycle; otherwise it waits for user approval. | SDK permission callback, `ClaudeSessionToolUseCoordinator`, runtime events | `ClaudeSessionToolUseCoordinator` | Tool invocation tracking, duplicate event suppression |
| DS-003 | Claude process stderr and terminal error chunks are captured/normalized by the SDK/session boundary. Generic process exits are enriched with sanitized diagnostics; SDK error results become runtime errors. | SDK stderr callback, diagnostic buffer, terminal result classifier, runtime `ERROR` event | `ClaudeSession` for turn classification; `ClaudeSdkClient` for process option/callback wiring | Redaction, bounded buffer, log formatting |
| DS-004 | Test coverage drives a controlled Claude session/SDK harness through representative permission requests and disposable sentinel side effects. Auto mode proves workspace and outside-scratch write/delete/shell cases are allowed without a manual stop; manual mode proves at least one outside-scratch case waits for approval. | Test harness, safe workspace path, safe outside scratch path, permission callback, side-effect assertion | Claude session tests / API-E2E engineer coverage | Scratch-directory creation and cleanup, fake/live-provider availability classification |

## Spine Actors / Main-Line Nodes

- Team/standalone launch surface
- `AgentRunConfig`
- `ClaudeSessionBootstrapper`
- `ClaudeAgentRunContext` / `ClaudeSessionConfig`
- `ClaudeSession`
- `ClaudeSdkClient`
- Claude Code process

## Ownership Map

- Team/standalone launch surface owns user-chosen runtime/model/workspace/auto-approval inputs.
- `AgentRunConfig` owns normalized run launch configuration independent of any one provider.
- `ClaudeSessionBootstrapper` owns translating generic run config into Claude runtime context, including configured skills/tools and workspace.
- `ClaudeAgentRunContext` owns Claude runtime state for a run: session config, configured tools/skills, member context, session id, active turn, and AutoByteus auto-approval policy.
- `ClaudeSession` owns turn lifecycle, active query resource, permission callback routing, terminal chunk classification, and runtime event emission.
- `ClaudeSessionToolUseCoordinator` owns permission approval/auto-approval decisions and tool lifecycle events.
- `ClaudeSdkClient` owns SDK module loading and provider query option construction, including executable path, env/auth shaping, setting sources, disallowed built-ins, MCP servers, and stderr callback wiring.
- Claude Code process owns provider CLI execution and emits stdout/stderr/process exit.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL/team launch mutations | `TeamRunService` / `AgentRunManager` | Public API entry for launch config | Claude provider permission-mode policy |
| `ClaudeAgentRunBackend` | `ClaudeSession` | Runtime backend interface for `AgentRun` | SDK option construction or process diagnostics |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `autoExecuteTools=true -> "bypassPermissions"` mapping in `resolveClaudePermissionMode` | It causes root Docker startup failure and confuses AutoByteus approval policy with provider dangerous mode | Explicit `autoExecuteTools` runtime-context field + coordinator auto approval | In This Change | Update/delete tests asserting old mapping. |
| `ClaudeAgentRunContext.autoExecuteTools` derived from `sessionConfig.permissionMode` | Auto approval must remain true while permission mode is `default` | Dedicated runtime-context/session-config field | In This Change | Avoid ambiguous state. |
| Success treatment for all Claude `type: "result"` chunks | `is_error` result chunks represent failed provider/runtime turns | Terminal error classifier in `claude-session-output-events.ts` / `ClaudeSession` | In This Change | Prevent auth failures from appearing as successful turns. |
| Generic-only process exit message in Claude session errors | Hides actionable stderr such as root/sudo restriction | Bounded redacted diagnostic buffer passed through SDK `stderr` option | In This Change | Do not log secrets. |
| README claim that Claude standard runtime is configured by `CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions` | Stale/misleading for Docker root and not reflected in current source search | Delivery docs update | In This Change or delivery no-impact decision | Delivery owns final docs sync. |

## Return Or Event Spine(s) (If Applicable)

- Permission callback return/event spine: `Claude Code permission request -> SDK canUseTool callback -> ClaudeSessionToolUseCoordinator -> TOOL_APPROVED or TOOL_APPROVAL_REQUESTED/APPROVED/DENIED events -> SDK allow/deny decision`.
- Error return/event spine: `Claude Code stderr/result/exit -> SDK query iteration or process error -> ClaudeSession diagnostic/classifier -> ClaudeSessionEventName.ERROR -> AgentRunEventType.ERROR + status error -> websocket/UI`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ClaudeSession`
  - `sendTurn -> create active turn -> start SDK query -> iterate chunks -> classify terminal result -> close query -> emit completed/error`.
  - This matters because terminal `result` chunks can be success or error; the local loop must branch before marking the turn completed.
- Parent owner: `ClaudeSessionToolUseCoordinator`
  - `permission callback -> identify invocation -> auto approve or await approval -> emit lifecycle -> return SDK decision`.
  - This matters because auto approval must be preserved without using provider bypass.
- Parent owner: Claude session/API-E2E test harness
  - `create disposable workspace + outside scratch -> drive representative permission requests -> assert auto-allow/manual-gate -> assert sentinel write/delete/shell side effects or non-execution -> cleanup`.
  - This matters because replacing `bypassPermissions` must not be validated only on workspace-local operations.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Workspace/skill materialization | DS-001 | `ClaudeSessionBootstrapper` | Prepare working directory and Claude skill files | Existing launch prep remains needed | Would obscure permission-policy fix |
| Auth env shaping | DS-001 | `ClaudeSdkClient` | Build env for CLI/API-key auth mode | Existing auth-mode boundary | Mixing into session would duplicate env policy |
| Process stderr diagnostic buffer | DS-003 | `ClaudeSession` / `ClaudeSdkClient` | Capture bounded redacted startup stderr | Needed for actionable error | If spread across logs/UI, errors stay generic |
| Terminal result error classifier | DS-003 | `ClaudeSession` | Detect `is_error`/auth failure result chunks | Needed after bypass fix reveals auth setup failures | If left to frontend, backend may persist false success |
| Disposable outside-workspace scratch path | DS-004 | Tests / API-E2E coverage | Provide safe non-workspace target for write/delete/shell validation | Needed to verify default-mode auto-approval is not workspace-only | If tests use real data/home paths, coverage becomes destructive or unsafe |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Auto approve Claude tool permissions | `ClaudeSessionToolUseCoordinator` | Reuse/Extend | Already owns manual approval and has auto-approval branch | N/A |
| SDK process option construction | `ClaudeSdkClient` | Extend | Already builds query options and has SDK boundary | N/A |
| Runtime error event emission | `ClaudeSession` + `ClaudeSessionEventConverter` | Reuse/Extend | Existing `ERROR` event path maps to status and UI error | N/A |
| Redacted stderr buffering | Claude runtime-management/session support | Create New small owned helper if needed | No existing reusable process diagnostic helper in Claude path | Keep local unless other runtimes need it later |
| Inside/outside workspace permission coverage | Existing Claude session/SDK unit/integration and API/E2E coverage areas | Extend | The behavior is owned by Claude session permission callback routing; tests should stay near session/SDK boundaries and API/E2E coverage should validate realistic launch paths | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude runtime session | Auto approval policy state, turn lifecycle, terminal error classification | DS-001, DS-002, DS-003 | `ClaudeSession` | Extend | Main behavior change lives here. |
| Claude SDK client/runtime management | SDK options, stderr callback wiring, executable/env/settings | DS-001, DS-003 | `ClaudeSdkClient` | Extend | Do not move session lifecycle here. |
| Agent/team execution | Passing `autoExecuteTools` from launch config to runtime | DS-001 | `TeamRunService`, `AgentRunManager` | Reuse | Should not gain provider-specific policy. |
| Documentation | User/admin setup guidance | DS-001 | Delivery | Extend/Update | Docs sync after implementation. |
| Durable tests / API-E2E coverage | Permission mapping, auto/manual approval, diagnostics, and safe inside/outside workspace operation scenarios | DS-001, DS-002, DS-004 | Code review + API/E2E | Extend | Must use disposable outside-workspace scratch paths and avoid sensitive persistent directories. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `claude-session-config.ts` | Claude runtime session | Session config shape | Store `model`, `workingDirectory`, `permissionMode`, and explicit `autoExecuteTools`; remove broken resolver | Existing config file | No |
| `claude-agent-run-context.ts` | Claude runtime session | Runtime context | Expose `autoExecuteTools` from explicit state/config | Existing context owner | No |
| `claude-session-bootstrapper.ts` | Claude runtime bootstrap | Bootstrap translation | Build config with `permissionMode: "default"` and `autoExecuteTools: runContext.config.autoExecuteTools` | Existing bootstrap owner | No |
| `agent-run-manager.ts` | Agent execution restore | Restore context construction | Build restored Claude runtime context with explicit `autoExecuteTools` and safe permission mode | Existing restore path | No |
| `claude-session.ts` | Claude runtime session | Turn lifecycle | Route permission callback through coordinator; pass stderr diagnostics; classify terminal error result | Existing turn owner | Maybe diagnostic helper |
| `claude-sdk-client.ts` | Claude SDK boundary | SDK query options | Accept/pass optional stderr callback/diagnostic sink; preserve direct SDK autoExecute fallback | Existing SDK owner | Maybe diagnostic type |
| `claude-session-output-events.ts` | Claude runtime session | Output chunk helpers | Add helpers for terminal error result and error message extraction | Existing terminal helper | No |
| Tests under `tests/unit` / `tests/integration` | Validation | Durable coverage | Update mapping tests; add diagnostics/error classification tests; add inside/outside workspace write/delete/shell permission coverage with disposable scratch paths | Existing test layout | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Claude process diagnostic buffering/redaction | `claude-process-diagnostics.ts` or local class in `claude-session.ts` if only one use | Claude runtime/session | Share between session and SDK callback if cleaner | Yes | Yes | A generic logging catch-all or secret sink |
| Terminal Claude error extraction | `claude-session-output-events.ts` | Claude runtime/session | Existing output helper file | Yes | Yes | Frontend-specific classifier |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ClaudeSessionConfig.autoExecuteTools` | Yes | Yes | Low | Field means AutoByteus auto approval only. |
| `ClaudeSessionConfig.permissionMode` | Yes | Yes | Medium currently | After change, field means provider permission mode only; do not derive auto approval from it. |
| Diagnostic summary | Yes | Yes | Medium | Keep bounded/redacted and do not store raw env/secrets. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-config.ts` | Claude runtime session | Session config shape | Add explicit `autoExecuteTools`; remove or redefine old resolver so auto approval no longer returns `bypassPermissions` | Existing config owner | No |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-context.ts` | Claude runtime session | Runtime context | `autoExecuteTools` getter reads explicit field | Existing runtime context owner | No |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Claude bootstrap | Run-config translation | Build safe default provider permission mode plus explicit auto approval | Existing bootstrap owner | No |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Agent execution restore | Restore context | Restore explicit auto approval state from `AgentRunConfig` | Existing restore owner | No |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude runtime session | Turn owner | Always use coordinator callback for permission decisions; pass diagnostics; emit error on terminal error result | Existing turn owner | Maybe diagnostics helper |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Claude SDK boundary | SDK client | Accept optional stderr callback/diagnostic sink and pass to SDK query options | Existing SDK owner | Optional diagnostics type |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-output-events.ts` | Claude runtime session | Output helper | Add `isClaudeTurnErrorResult` / message extraction | Existing helper owner | No |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-config.test.ts` | Tests | Config invariant | Update old assertion to new invariant | Existing test | N/A |
| Focused Claude session/SDK tests | Tests | Runtime behavior | Add mocked coverage for auto/manual approval, diagnostics, and auth error result | Existing test areas | N/A |

## Ownership Boundaries

- `AgentRunConfig.autoExecuteTools` remains the authoritative public run-level approval policy.
- `ClaudeSessionConfig.permissionMode` is provider-specific and must not be the source of truth for AutoByteus approval behavior.
- `ClaudeSessionToolUseCoordinator` is the authoritative boundary for approval decisions and lifecycle events.
- `ClaudeSdkClient` is the authoritative boundary for provider process/query options and should not decide user/team approval policy.
- `ClaudeSession` is the authoritative owner for turn terminal classification and should emit `ERROR` vs `TURN_COMPLETED` before frontend or memory layers see the result.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ClaudeSessionToolUseCoordinator` | Auto/manual approval wait/decision, invocation tracking | `ClaudeSession` SDK `canUseTool` callback | `ClaudeSession` bypassing coordinator by mapping auto approval to provider `bypassPermissions` | Pass explicit auto policy into runtime context and route callback through coordinator |
| `ClaudeSdkClient` | SDK query options, process stderr callback | `ClaudeSession`, model catalog | Session or frontend directly constructing Claude Code CLI command | Add typed option fields/callbacks to SDK client |
| `ClaudeSession` | Active turn state and terminal success/error classification | Backend, `AgentRun` | Frontend interpreting provider `is_error` result as error after backend marked turn complete | Add backend terminal error classifier |

## Dependency Rules

- Team/agent launch code may pass `autoExecuteTools` through `AgentRunConfig`; it must not know Claude provider permission modes.
- Claude bootstrap may translate generic run config into Claude runtime context; it must not collapse distinct policies into one field.
- `ClaudeSession` may call `ClaudeSdkClient` and `ClaudeSessionToolUseCoordinator`; `ClaudeSdkClient` must not depend on session/coordinator internals.
- `ClaudeSessionToolUseCoordinator` may read `runContext.runtimeContext.autoExecuteTools`; it must not inspect provider permission mode to decide AutoByteus policy.
- Frontend/websocket layers consume normalized `AgentRunEventType.ERROR` and status; they must not parse raw Claude SDK stderr or result chunks.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildClaudeSessionConfig(input)` | Claude session config | Build typed config with explicit auto policy | model string, working directory path, permission mode, auto flag | Add required/optional `autoExecuteTools`. |
| `ClaudeAgentRunContext.autoExecuteTools` | Claude runtime context | Expose AutoByteus auto approval policy | Boolean | No longer derived from provider mode. |
| `ClaudeSdkClient.startQueryTurn(options)` | SDK query | Launch SDK query | `ClaudeSdkStartQueryTurnOptions` | Add optional `stderr`/diagnostic callback if needed. |
| `ClaudeSessionToolUseCoordinator.handleToolPermissionCheck(...)` | Tool approval | Decide allow/deny and emit lifecycle | run context, tool name, input, tool use id | Use for both auto and manual. |
| `isClaudeTurnTerminalChunk` / new error helper | Terminal chunk classification | Classify result chunk | raw SDK chunk | Split success vs error decisions. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ClaudeSessionConfig` | No currently | Yes | Medium | Separate `autoExecuteTools` from `permissionMode`. |
| `ClaudeSdkStartQueryTurnOptions` | Yes | Yes | Low | Add diagnostics callback without approval policy decisions. |
| `ClaudeSessionToolUseCoordinator` | Yes | Yes | Low | Keep approval decisions here. |
| Terminal chunk helper | No currently | N/A | Medium | Add error-result classification. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| AutoByteus auto approval policy | `autoExecuteTools` | Yes | Low | Preserve meaning. |
| Provider permission mode | `permissionMode` | Yes | Medium | Stop using it to encode auto approval. |
| Process diagnostics | `ClaudeProcessDiagnostics` / `ClaudeRuntimeDiagnostics` | Yes | Low | Name by concrete concern if file/helper added. |

## Applied Patterns (If Any)

- Adapter: `ClaudeSdkClient` adapts AutoByteus runtime options to Anthropic SDK query options.
- State machine/turn lifecycle: `ClaudeSession` maintains active/idle/error state and terminal turn transitions.
- Coordinator: `ClaudeSessionToolUseCoordinator` owns permission approval sequencing.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-config.ts` | File | Claude session config | Config shape and safe provider permission default | Existing config path | Generic launch/team config logic |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-context.ts` | File | Claude runtime context | Runtime state including explicit auto approval | Existing runtime context path | SDK option construction |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | File | Claude turn lifecycle | Permission callback routing, diagnostics, terminal classification | Existing turn owner | Team launch config normalization |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-output-events.ts` | File | Claude output helpers | Terminal/error helper logic | Existing output helper path | UI-specific rendering |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | File | SDK client | Pass stderr callback and safe options to SDK | Existing SDK boundary | Tool approval policy decisions |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | File | Agent run manager | Restore path state construction | Existing restore owner | New Claude policy beyond passing config |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `backends/claude/session` | Main-Line Domain-Control | Yes | Low | Session turn lifecycle and output helpers already live here. |
| `runtime-management/claude/client` | Provider Adapter | Yes | Low | SDK option construction belongs here. |
| `agent-execution/services` | Main-Line Domain-Control | Yes | Low | Restore config construction remains in manager. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Auto approval vs provider mode | `permissionMode: "default"` + `canUseTool: coordinator.handleToolPermissionCheck(...)`; coordinator auto-approves when `autoExecuteTools=true` | `autoExecuteTools=true` -> `permissionMode: "bypassPermissions"` | Prevents Docker/root failure and keeps ownership clear. |
| Auth error classification | SDK result `{ type: "result", is_error: true, result: "Not logged in · Please run /login" }` -> runtime `ERROR` | Treat every `{ type: "result" }` as `TURN_COMPLETED` | Prevents false success after bypass fix. |
| Process diagnostics | Stderr ring buffer summary: `Claude Code startup failed: --dangerously-skip-permissions cannot be used with root/sudo privileges...` | UI only `Claude Code process exited with code 1` | Gives user actionable setup/fix reason. |
| Complete permission coverage | Test-created workspace file and `/tmp/autobyteus-claude-permission-*/outside.txt` are written/deleted through auto-approved permission requests while SDK options remain non-bypass | Only test a read or write inside the workspace and assume outside paths are equivalent | Prevents reintroducing hidden outside-workspace prompts that `bypassPermissions` may have masked. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `bypassPermissions` for non-root while falling back to default on root | It would preserve old behavior on developer machines | Rejected | `autoExecuteTools` always uses AutoByteus approval callback; provider bypass requires future explicit setting. |
| Add Docker-only special case in `ClaudeSdkClient` | Minimal local patch | Rejected | Fix the source policy mapping in Claude runtime context/session. |
| Let auth failure render as assistant text with completed turn | Avoids new error branch | Rejected | Classify `is_error` result as runtime error. |

## Derived Layering (If Useful)

- Launch/API layer: GraphQL/team/agent launch surfaces collect and normalize `autoExecuteTools`.
- Runtime domain layer: `AgentRunConfig`, `ClaudeAgentRunContext`, and `ClaudeSession` carry and execute the policy.
- Provider adapter layer: `ClaudeSdkClient` translates to Anthropic SDK options and captures provider process diagnostics.
- Streaming/UI layer: consumes normalized runtime events only.

## Migration / Refactor Sequence

1. Update `ClaudeSessionConfig` to include explicit `autoExecuteTools` and remove/redefine `resolveClaudePermissionMode` so standard launch no longer maps auto approval to `bypassPermissions`.
2. Update `ClaudeSessionBootstrapper` and `AgentRunManager.buildRestoreRuntimeContext` to populate `autoExecuteTools` from `AgentRunConfig` and use safe provider `permissionMode: "default"` for standard launches.
3. Update `ClaudeAgentRunContext.autoExecuteTools` to return the explicit policy.
4. Update `ClaudeSession.executeTurn` to route SDK permission checks through `ClaudeSessionToolUseCoordinator` for both auto and manual modes; the coordinator's existing auto branch should approve without public approval stop.
5. Extend `ClaudeSdkClient` options to pass an optional stderr/diagnostic callback through to SDK query options.
6. Add bounded redacted diagnostic collection in the Claude session turn and include the summary when emitting/logging generic startup/process errors.
7. Add terminal error-result detection in `claude-session-output-events.ts` and use it in `ClaudeSession.executeTurn` to emit `ERROR` instead of `TURN_COMPLETED` for `is_error`/auth failures.
8. Update unit/integration tests for config mapping, permission callback behavior, diagnostics, auth error result classification, and complete inside/outside workspace permission-sensitive operation coverage. The outside path must be a disposable scratch directory and include write, delete, and shell-command cases for auto mode plus at least one manual-gated outside case.
9. Remove/update stale docs/tests that teach `autoExecuteTools -> bypassPermissions` or Docker `CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions` as the normal path.

## Key Tradeoffs

- Not changing Docker to non-root is a smaller, safer fix and addresses the real policy bug. Running non-root may still be desirable later but is not required for this ticket.
- Not enabling Claude sandbox by default preserves the user's desired dedicated-container behavior. Users who want stricter blast-radius control can enable Claude sandbox settings or use stronger container/VM isolation separately.
- Preserving provider `bypassPermissions` as an implicit auto-approve behavior would maintain legacy semantics but would keep a dangerous/root-incompatible provider mode coupled to a generic AutoByteus approval flag.
- Capturing stderr must be bounded and redacted; this gives better diagnostics without turning logs into a secret sink.

## Risks

- Existing tests may assume `bypassPermissions` in system/init payloads for auto-execute Claude runs and will need updates.
- Live Claude validation can still fail if the container is not authenticated; expected post-fix behavior in that environment is an actionable auth error, not successful response.
- If Claude SDK changes stderr/debug behavior in future versions, diagnostic capture should remain best-effort and not be required for turn lifecycle correctness.
- Outside-workspace tests can be destructive if they use real server/home/data paths; coverage must allocate and clean a disposable scratch directory.

## Guidance For Implementation

- Prefer a clean removal of the old resolver mapping over conditional root checks.
- Keep `autoExecuteTools` as a boolean policy on the Claude runtime context; do not infer it from `permissionMode`.
- Use the existing `ClaudeSessionToolUseCoordinator` auto branch so approval lifecycle events remain normalized.
- Treat inside/outside workspace permission coverage as required. Use safe sentinel files and shell commands in a test-created scratch directory outside the run workspace, not `/root`, `/home/autobyteus/data`, repository control directories, or host production mounts.
- When constructing user-visible error messages from stderr, redact env-like tokens and keep only the last bounded diagnostics; preserve the original error class/code in logs if useful.
- Add tests that use mocked SDK query streams/process diagnostics rather than live Claude credentials for the new regression cases.
