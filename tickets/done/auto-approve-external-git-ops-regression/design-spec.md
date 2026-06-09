# Design Spec

## Current-State Read

The relevant current branch path is the Codex App Server backend used by both standalone Codex runs and Codex team-member runs created through the mixed team refactor:

`TeamRun -> MixedTeamManager -> MixedAgentMemberHandle -> AgentRunManager -> CodexAgentRunBackend -> CodexThreadBootstrapper -> CodexThreadManager -> Codex App Server`

`origin/personal` and the prior ticket `tickets/done/codex-runtime-access-mapping-analysis/` define the intended behavior: Codex `autoExecuteTools=true` is high-trust mode. The backend starts/resumes Codex with `approvalPolicy: "never"` and effective `sandbox: "danger-full-access"`, and request-time approval surfaces auto-accept/auto-grant if Codex still emits approval requests.

The current refactor branch added a team-member exception in two Codex-owned places:

1. `CodexThreadBootstrapper` now checks `memberTeamContext` and, for team-member runs, bypasses the high-trust effective access mapping. A team-member auto run stays on configured/default approval policy and `normalizeSandboxMode()` such as `workspace-write`.
2. `CodexToolApprovalCoordinator` now treats team-member auto runs as `shouldAutoDeclineRuntimeTool(...)`, responding with decline/no-grant for command/file/MCP/permission request surfaces.

This creates the observed UI failure. A delivery engineer Codex member is launched with a `workspace-write` sandbox rooted at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; Git writes in the external task worktree require approval; the coordinator declines/no-grants; the event converter reports `Tool execution denied.`.

The likely reason this change was introduced is visible in the current test names: the refactor attempted to “keep Codex team-member local runtime tools on the approval boundary” while preserving dynamic team-tool auto execution. That conflated two different ownership concerns:

- Codex runtime access policy for shell/file/permission requests, governed by `autoExecuteTools` and Codex backend owners.
- Team communication/task-delegation safety, governed by configured dynamic tool exposure and team-owned handlers.

The former must not be silently downgraded for team members after the user enables high-trust auto-approve.

## Intended Change

Restore `origin/personal` Codex high-trust behavior for both standalone and team-member Codex runs, and add a targeted audit guard for AutoByteus/Claude so analogous silent refactor regressions are caught instead of being normalized by stale tests:

Codex fix:

- `autoExecuteTools=true` always resolves to `approvalPolicy: CodexApprovalPolicy.NEVER`.
- `autoExecuteTools=true` always resolves to effective `sandbox: "danger-full-access"`.
- `autoExecuteTools=true` always auto-accepts command/file/MCP approval requests and auto-grants permission requests, including for runs with `memberTeamContext`.
- `autoExecuteTools=false` remains manual/gated.
- Team dynamic tools remain constrained by existing configured tool exposure and team communication/task-delegation handlers; do not use Codex shell/file approval policy as a team-routing safety mechanism.

Runtime audit/test authority guard:

- Claude bootstrap/permission behavior must be audited against `origin/personal`; initial investigation shows `ClaudeSessionBootstrapper` and `resolveClaudePermissionMode(...)` are unchanged and still map `autoExecuteTools=true` to `bypassPermissions` without a team-member exception.
- AutoByteus auto-execute behavior must be audited against `origin/personal`; initial investigation shows core `autobyteus-ts` `ToolPhase` is unchanged and `AutoByteusAgentRunBackendFactory` still passes `autoExecuteTools` into `AgentConfig`.
- If E2E expectations conflict with this approved behavior, treat those tests as stale unless new requirements prove otherwise; update tests, not source behavior, to match approved runtime semantics.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Regression fix.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Boundary Or Ownership Issue.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, narrowly.
- Evidence:
  - `origin/personal` has no team-member exception in `CodexThreadBootstrapper` or `CodexToolApprovalCoordinator`.
  - Current branch commit `244e1060185522b0ed4fb389b786ce33747a9469` added the team-member exception and auto-decline path.
  - Current README still documents high-trust auto mode as effective `danger-full-access`; current source contradicts that for team members.
  - User explicitly rejected the auto-decline behavior and approved restoring original high-trust behavior.
- Design response:
  - Remove the team-member special case from Codex thread access resolution.
  - Remove the team-member auto-decline branch from Codex approval coordination.
  - Replace current tests that assert team-member downgrade/decline with regression tests asserting parity with standalone auto mode.
  - Record targeted AutoByteus and Claude audits in implementation/validation evidence.
  - Treat stale E2E expectations as test debt, not as authorization to change runtime behavior.
- Refactor rationale:
  - The current branch added extra policy branching inside the correct Codex owners but made the policy inconsistent by subject (`memberTeamContext`). The simpler and correct design is to keep one run-level Codex auto-approve invariant and leave team dynamic tool routing safety to its separate owners.
- Intentional deferrals and residual risk, if any:
  - No new policy setting is introduced. If product later wants a separate “team members may not use shell/file even in auto mode” safety control, that must be designed explicitly as a separate requirement, not hidden behind `Auto approve tools`.

## Terminology

- `Codex high-trust auto mode`: `autoExecuteTools=true` for Codex; the run is allowed to auto-approve tool/access/permission requests and gets effective full filesystem access.
- `Team-member run`: an `AgentRunConfig` with non-null `memberTeamContext`, created as a member of a server team.
- `Runtime local tools`: Codex App Server shell/file/MCP/permission request surfaces such as `run_bash`, file change, and `request_permissions`.
- `Dynamic team tools`: backend-registered tools such as `send_message_to` and task delegation tools, exposed through configured tool registration and team-owned handlers.

## Design Reading Order

Read this design from the access-policy spine first, then request-time approval handling, then tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the current branch compatibility/safety branch that silently changes auto-approve semantics for Codex team members.
- Do not preserve dual behavior where standalone auto runs get high-trust access but team-member auto runs get auto-decline/no-grant.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Team run launch with Codex member auto-approve enabled | Codex App Server thread started/resumed with effective high-trust access | `CodexThreadBootstrapper` | This is where the regression downgrades team-member access to `workspace-write`. |
| DS-002 | Primary End-to-End | Codex App Server approval/permission request | Accept/grant response or visible manual approval event | `CodexToolApprovalCoordinator` | This is where the regression auto-declines team-member runtime tools. |
| DS-003 | Primary End-to-End | Codex dynamic team tool call | Team-owned handler execution / response | Configured dynamic tool handlers + team communication/task delegation owners | Ensures restoring shell/file auto-approval does not bypass team communication ownership. |
| DS-004 | Return-Event | Codex declined/completed item event | UI Activity tool status/result | Codex event converter | Explains the observed `Tool execution denied.` symptom. |
| DS-005 | Bounded Local | Runtime audit source comparison | Audit evidence / routed follow-up | Solution/implementation validation owner | Prevents analogous AutoByteus/Claude regressions and stale-test-driven source changes. |

## Primary Execution Spine(s)

DS-001:

`TeamRun launch -> MixedTeamManager member config -> AgentRunConfig(autoExecuteTools=true, memberTeamContext) -> CodexThreadBootstrapper -> CodexThreadConfig(approvalPolicy=never, sandbox=danger-full-access) -> CodexThreadManager thread/start|resume`

DS-002:

`Codex App Server approval request -> CodexClientThreadRouter -> CodexThread.handleAppServerRequest -> CodexToolApprovalCoordinator -> auto accept/grant when autoExecuteTools=true`

DS-003:

`Codex App Server dynamic tool call -> CodexToolApprovalCoordinator -> registered dynamic tool handler -> team communication/task delegation owner -> result response`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A mixed team launches a Codex member. The member's `AgentRunConfig` carries the same `autoExecuteTools` setting as standalone runs. The bootstrapper must resolve one effective Codex thread access policy without downgrading because `memberTeamContext` exists. | `TeamRun`, `MixedTeamManager`, `AgentRunConfig`, `CodexThreadBootstrapper`, `CodexThreadConfig`, `CodexThreadManager` | `CodexThreadBootstrapper` | Saved sandbox setting for manual runs; model/session options. |
| DS-002 | If Codex still emits approval/permission requests, the coordinator answers from the same run-level high-trust policy. Team membership is not a reason to decline after auto-approve is enabled. | `CodexClientThreadRouter`, `CodexThread`, `CodexToolApprovalCoordinator`, Codex response | `CodexToolApprovalCoordinator` | Approval event emission for manual mode; permission response shape. |
| DS-003 | Dynamic team tools are still dispatched through registered handlers and team-owned service boundaries. This separate spine keeps team communication safety out of shell/file approval policy. | `CodexToolApprovalCoordinator`, dynamic tool handler, `MixedTeamManager`/task delegation service | Dynamic tool handlers and team owners | Configured tool exposure, recipient validation, task-agent lifecycle. |
| DS-004 | Declined runtime-tool items are converted into tool-denied UI events. Fixing DS-001/DS-002 prevents the false decline source. | Codex item event, event converter, UI projection | Codex event converter | No change expected. |

## Spine Actors / Main-Line Nodes

- `TeamRun` / `MixedTeamManager`: creates team-member `AgentRun`s; does not own Codex approval policy.
- `AgentRunConfig`: carries `autoExecuteTools` and `memberTeamContext`.
- `CodexThreadBootstrapper`: owns effective Codex thread config, including `approvalPolicy` and `sandbox`.
- `CodexThreadManager`: forwards resolved config to `thread/start` / `thread/resume`.
- `CodexClientThreadRouter` / `CodexThread`: route App Server requests to the active thread.
- `CodexToolApprovalCoordinator`: owns request-time approval/permission response policy.
- Dynamic tool handlers / team services: own team tool semantics separately from runtime shell/file permissions.

## Ownership Map

| Node | Ownership |
| --- | --- |
| `MixedTeamManager` | Team-member lifecycle, communication routing, task-agent lifecycle; not Codex access policy. |
| `AgentRunConfig.autoExecuteTools` | Run-level high-trust approval/access intent. |
| `CodexThreadBootstrapper` | Mapping run config + server sandbox setting to effective Codex thread config. |
| `CodexThreadManager` | Transport of already-resolved config to Codex App Server. |
| `CodexToolApprovalCoordinator` | Classification and response for Codex approval-capable server requests. |
| Dynamic tool registration/handlers | Which dynamic tools a member may call and how those calls execute. |
| Event converters | UI/history projection of Codex events; not approval policy. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamRun` launch path | `MixedTeamManager` + `AgentRunManager` | Public team-run start/restore boundary | Codex sandbox/approval semantics. |
| `CodexThreadManager.startRemoteThread/resumeRemoteThread` | `CodexThreadBootstrapper` | Sends JSON-RPC request to Codex App Server | Recompute or override access policy. |
| GraphQL/UI approval APIs | `CodexToolApprovalCoordinator` via `CodexThread.approveTool` | Manual approval input path | High-trust auto-mode downgrade. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `resolveEffectiveCodexSandboxModeForRunConfig(...)` team-member branch | It downgrades auto-approved team members and contradicts the high-trust invariant | Existing `resolveEffectiveCodexSandboxMode(autoExecuteTools)` | In This Change | Function may be removed or simplified to delegate directly by `autoExecuteTools`. |
| `resolveApprovalPolicyForRunConfig(...)` team-member branch | It ignores `autoExecuteTools=true` for team members | Existing `resolveApprovalPolicyForAutoExecuteTools(autoExecuteTools)` plus optional configured policy only for manual runs if retained | In This Change | Avoid environment override making auto mode non-high-trust. |
| `shouldAutoDeclineRuntimeTool(...)` | It is the direct source of false declines/no-grants | `autoExecuteTools` direct auto-approve logic | In This Change | Do not preserve as compatibility path. |
| Current tests named `keeps Codex team-member local runtime tools on the approval boundary in auto mode` and `auto-declines Codex local runtime tools for team members...` | They encode the regression as expected behavior | New parity regression tests | In This Change | Replace, do not skip. |

## Return Or Event Spine(s) (If Applicable)

DS-004 remains unchanged:

`Codex item/completed(status=declined) -> CodexItemEventConverter -> TOOL_DENIED(reason="Tool execution denied.") -> Activity/UI projection`

The fix should prevent trusted auto-approved team-member requests from producing declined items for permission/shell approval causes.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: validation/audit pass
  - `origin/personal runtime behavior -> current AutoByteus/Claude source comparison -> test expectation review -> evidence or routed requirement gap`
  - Why it matters: the user explicitly warned that stale E2E tests may have caused source behavior to be changed. This audit prevents tests from becoming an unnoticed behavior owner.

- Parent owner: `CodexToolApprovalCoordinator`
  - `request method -> classify request type -> if autoExecuteTools true accept/grant -> else record approval -> later approveTool responds`
  - Why it matters: all approval-capable Codex server requests must follow the same policy.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Saved Codex sandbox setting | DS-001 | `CodexThreadBootstrapper` | Provide sandbox for non-auto-approved/manual runs | Operators can choose `read-only`, `workspace-write`, or `danger-full-access` | If applied to auto mode, high-trust can still fail silently. |
| Configured dynamic tool exposure | DS-003 | Dynamic tool handlers / team services | Limit which backend tools are available to the member | Team safety and capability scoping | If confused with shell/file approval, team members get unexpected runtime denials. |
| Team communication recipient validation | DS-003 | `MixedTeamManager` and communication services | Validate recipients/target run ids/reference files | Prevents routing bypass | If moved into Codex approval policy, policy becomes too broad and brittle. |
| UI event projection | DS-004 | UI/history consumers | Show approved/denied/failed state | User observability | Must not be treated as policy owner. |
| Runtime source audit | DS-005 | Implementation/validation handoff | Compare AutoByteus and Claude against `origin/personal`, especially Claude bootstrapper and AutoByteus tool phase | Catches silent refactor regressions | If omitted, stale E2E expectations can silently rewrite behavior. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Effective Codex access config | Codex backend bootstrapper | Reuse/Simplify | Existing personal-branch owner is correct | N/A |
| Approval request handling | Codex tool approval coordinator | Reuse/Simplify | Existing prior-ticket owner is correct | N/A |
| Dynamic team tool safety | Configured tool exposure + team communication/task delegation services | Reuse | Already owns the team-specific concerns | N/A |
| Regression tests | Existing Codex backend unit tests | Extend/Replace | Current tests already isolate bootstrapper and coordinator | N/A |
| AutoByteus/Claude audit | Existing source comparison + focused tests | Reuse/Extend | No new subsystem needed; evidence belongs in validation/handoff | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/codex/backend` | Effective thread config bootstrap | DS-001 | `CodexThreadBootstrapper` | Reuse/Simplify | Remove team-member access-policy special case. |
| `agent-execution/backends/codex/thread` | App Server request approval coordination | DS-002 | `CodexToolApprovalCoordinator` | Reuse/Simplify | Remove team-member auto-decline. |
| `agent-execution/backends/codex/team-communication` | Codex dynamic team tool schema/handler | DS-003 | Team communication services | Reuse | No change except validation if needed. |
| `agent-team-execution` | Team communication and task delegation | DS-003 | `MixedTeamManager` | Reuse | Do not mix into Codex runtime approval. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex-thread-bootstrapper.ts` | Codex backend | Bootstrapper | Resolve approval policy and sandbox from run config | Existing owner | Existing helpers |
| `codex-tool-approval-coordinator.ts` | Codex thread | Approval coordinator | Respond to App Server approval requests | Existing owner | Existing permission response builders |
| `codex-thread-bootstrapper.test.ts` | Tests | Bootstrapper contract | Team-member auto mode config parity | Existing focused tests | Test helpers |
| `codex-thread.test.ts` | Tests | Approval coordinator contract through `CodexThread` | Team-member auto mode accept/grant parity | Existing focused tests | Test helpers |

## Reusable Owned Structures Check

No new reusable owned structures are needed. The correct fix is simplification/removal of the current branch's redundant team-member policy helpers.

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Codex auto-approve policy | Existing bootstrapper/coordinator helpers | Codex backend/thread | Already centralized enough for this scope | Yes | Yes | A team-vs-standalone split policy hidden behind one UI toggle |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRunConfig.autoExecuteTools` | Yes: high-trust auto tool/access policy | Yes | Medium in current branch | Remove team-member alternate interpretation. |
| `memberTeamContext` | Yes: identifies team membership/context | Yes | Medium in current branch | Do not use it to redefine Codex auto-approve semantics. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex backend | `CodexThreadBootstrapper` | Map all Codex run configs to effective `approvalPolicy` and `sandbox`; auto true always high-trust | Existing owner; remove over-specialization | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-tool-approval-coordinator.ts` | Codex thread | `CodexToolApprovalCoordinator` | Auto-accept/grant when `autoExecuteTools=true`; manual approval otherwise | Existing owner; remove auto-decline branch | Yes |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | Tests | Bootstrapper contract | Assert standalone and team-member auto mode use `never` + `danger-full-access`; manual still configured/default | Existing test file | N/A |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | Tests | Approval coordinator behavior | Assert team-member auto terminal and permission requests accept/grant; manual still queues/denies by user action | Existing test file | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Claude backend | Audit subject | Should remain unchanged in auto permission mapping unless a separate approved requirement exists | User specifically requested checking nearby Claude bootstrapper code | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-config.ts` | Claude backend | Audit subject | `resolveClaudePermissionMode(true) -> bypassPermissions` | Confirms no analogous team-member downgrade | N/A |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` and AutoByteus factory | AutoByteus runtime/backend | Audit subject | AutoByteus waits for approval only when `autoExecuteTools=false`; server passes flag into `AgentConfig` | Confirms no analogous auto approval regression | N/A |

## Ownership Boundaries

- `MixedTeamManager` owns team membership and routing. It must not redefine Codex runtime access policy.
- `CodexThreadBootstrapper` owns effective Codex App Server thread config. It must not treat `memberTeamContext` as a reason to ignore `autoExecuteTools=true`.
- `CodexToolApprovalCoordinator` owns App Server approval responses. It must not auto-decline because a run is a team member.
- Dynamic team tool handlers own team communication/task-delegation safety. They remain the boundary for team actions.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CodexThreadBootstrapper` | Approval policy + sandbox resolution | `CodexAgentRunBackend` create/restore | `MixedTeamManager` or team-member context altering Codex sandbox semantics | Add explicit bootstrapper input/policy, not hidden team-member branch. |
| `CodexToolApprovalCoordinator` | Request classification, auto/manual approval response, pending approval records | `CodexThread.handleAppServerRequest` | Team membership causing silent runtime-tool decline despite auto mode | Add explicit policy if product needs it. |
| Team communication/task delegation services | Recipient validation, delivery, task lifecycle | Dynamic tool handlers | Shell/file approval policy blocking/owning team communication | Extend configured exposure/handler policy. |

## Dependency Rules

Allowed:

- `CodexThreadBootstrapper` may inspect `autoExecuteTools` to resolve effective Codex thread access.
- `CodexThreadBootstrapper` may carry `memberTeamContext` through run config for team context, but not use it to downgrade high-trust Codex access.
- `CodexToolApprovalCoordinator` may inspect `autoExecuteTools` to decide auto/manual approval.
- Dynamic tool handlers may use `memberTeamContext` and configured tool exposure to perform team-specific actions.

Forbidden:

- No team-member-only auto-decline/no-grant branch for Codex runtime local tools when `autoExecuteTools=true`.
- No hidden alternate meaning of `Auto approve tools` for team members.
- No recomputation of Codex thread sandbox in `CodexThreadManager` or team managers.
- No team communication recipient routing inside Codex shell/file approval handling.
- No source-code behavior changes solely to satisfy stale E2E tests; update stale tests to approved behavior instead.
- No AutoByteus/Claude permission-mode changes without an explicit routed requirement/design update.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `resolveApprovalPolicyForAutoExecuteTools(autoExecuteTools)` | Codex approval policy | Map run auto flag to Codex approval policy | boolean | Should remain subject-specific and simple. |
| `resolveEffectiveCodexSandboxMode(autoExecuteTools)` | Codex sandbox | Map run auto flag + saved setting to effective sandbox | boolean | Auto true returns `danger-full-access`. |
| `handleCodexToolApprovalRequest(...)` | Codex request-time approval | Dispatch App Server request to right approval handler | method + request id + params | Uses run config, not team membership, for auto/manual decision. |
| Dynamic tool handlers | Team tool execution | Execute configured backend dynamic tools | tool name + call id + arguments | Separate from runtime shell/file approval. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveEffectiveCodexSandboxMode` | Yes | Yes | Low after fix | Use for all Codex runs. |
| Current `resolveEffectiveCodexSandboxModeForRunConfig` | No | Yes | Medium | Remove or simplify; do not branch by `memberTeamContext`. |
| `shouldAutoDeclineRuntimeTool` | No | Yes | High | Remove. |
| Dynamic tool handlers | Yes | Yes | Low | Leave unchanged. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `autoExecuteTools` | Keep | Yes, but docs clarify high-trust | Medium due current branch | Restore one meaning. |
| `memberTeamContext` | Keep | Yes | Low | Do not overload as access-policy signal. |
| `shouldAutoDeclineRuntimeTool` | Remove | No | High | It encodes wrong behavior. |

## Applied Patterns (If Any)

- Policy resolver: `CodexThreadBootstrapper` resolves one effective policy from run config and saved settings.
- Coordinator: `CodexToolApprovalCoordinator` coordinates request-time approvals for multiple Codex App Server request types.

Both patterns already exist; the design simplifies them rather than adding a new layer.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | File | Codex bootstrapper | Effective Codex thread config | Existing Codex backend config owner | Team-member access downgrade. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-tool-approval-coordinator.ts` | File | Codex approval coordinator | Request-time approval responses | Existing App Server request owner | Team-member auto-decline. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | File | Test | Bootstrapper regression coverage | Existing focused tests | Regression expectations. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | File | Test | Approval request regression coverage | Existing focused tests | Regression expectations. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/backends/codex/backend` | Main-Line Domain-Control | Yes | Low | Thread config belongs in backend bootstrap. |
| `agent-execution/backends/codex/thread` | Main-Line Domain-Control / Transport-adjacent | Yes | Low | App Server request handling belongs near thread. |
| `agent-team-execution` | Main-Line Domain-Control | Yes | Low | Team routing remains here, not in Codex approval policy. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Team-member auto config | `autoExecuteTools=true -> approvalPolicy=never, sandbox=danger-full-access` | `memberTeamContext ? workspace-write : danger-full-access` | Avoids hidden different meaning for the same UI toggle. |
| Request-time approval | `if autoExecuteTools then grant requested permission` | `if autoExecuteTools && memberTeamContext then no-grant` | Directly fixes outside-workspace Git operations. |
| Team tool safety | `send_message_to -> dynamic handler -> team recipient resolver` | `block all team-member run_bash/file permissions to protect team routing` | Keeps separate ownership concerns separate. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Preserve current team-member auto-decline while adding another exception for Git | Might narrowly fix screenshot | Rejected | Restore original high-trust auto mode for all Codex runs. |
| Keep standalone/team-member different semantics behind same `Auto approve tools` label | Current branch behavior | Rejected | One `autoExecuteTools` meaning across Codex standalone and team members. |
| Add a second hidden env override for team members | Could explain safety intent | Rejected for this bug | If needed later, design explicit product setting and UI copy. |

## Derived Layering (If Useful)

- Team layer: `TeamRun` / `MixedTeamManager` creates member runs and routes team messages.
- Agent runtime layer: `AgentRunManager` selects Codex backend.
- Codex backend layer: bootstrapper and approval coordinator govern Codex App Server access semantics.
- Projection layer: event converters and UI display results.

The fix stays in the Codex backend layer.

## Migration / Refactor Sequence

1. In `codex-thread-bootstrapper.ts`, remove or simplify `resolveApprovalPolicyForRunConfig(...)` so `autoExecuteTools=true` always returns `CodexApprovalPolicy.NEVER` for team-member and standalone runs.
2. In `codex-thread-bootstrapper.ts`, remove or simplify `resolveEffectiveCodexSandboxModeForRunConfig(...)` so `autoExecuteTools=true` always returns `danger-full-access` for team-member and standalone runs.
3. In `codex-tool-approval-coordinator.ts`, remove `isTeamMemberRun`, `shouldAutoApproveRuntimeTool`, and `shouldAutoDeclineRuntimeTool`, or simplify request handlers to check only `codexThread.runContext.config.autoExecuteTools` for auto-accept/auto-grant.
4. Replace bootstrapper test that expects team-member `untrusted`/`workspace-write` with a test expecting `never`/`danger-full-access` for create and restore.
5. Replace thread test that expects team-member auto-decline with tests for:
   - command approval request -> accept + local approved event;
   - permission request -> requested permissions + `scope: "session"`.
6. Record a targeted Claude audit: verify `ClaudeSessionBootstrapper` has no `memberTeamContext` permission-mode exception and `resolveClaudePermissionMode(true)` remains `bypassPermissions`.
7. Record a targeted AutoByteus audit: verify core `ToolPhase` and server `AgentConfig(autoExecuteTools)` propagation still match `origin/personal`.
8. Review changed E2E expectations for stale-test risk; update tests to approved behavior instead of adapting source to stale expectations.
9. Run focused Codex backend tests, then broader relevant server tests if dependency setup allows.

## Key Tradeoffs

- Simpler policy vs hidden safety branch: choose simpler policy because the UI/user contract explicitly says high-trust auto-approve grants effective full access.
- Team-member parity vs special containment: choose parity; containment should be explicit through separate settings/tool exposure, not by silently declining runtime tool requests.
- Minimal code change vs broad refactor: choose minimal change in the two owners because the existing prior-ticket architecture is already correct.

## Risks

- If someone intentionally added the current branch exception for safety, removing it may reveal their unstated concern. That concern should be captured as a new explicit product requirement if still desired.
- Stale E2E tests may encode wrong current-branch behavior. Implementation and validation must not treat those tests as authoritative without requirements evidence.
- AutoByteus/Claude initial audit found no analogous bootstrap/approval downgrade, but validation should still record evidence because the surrounding team refactor touched their team communication paths.
- Fresh task worktree lacks dependencies; validation may need setup.
- Full UI reproduction may still be useful after focused tests to prove the Activity denial no longer occurs.

## Guidance For Implementation

- Prefer restoring `origin/personal` behavior rather than inventing a new policy.
- Avoid adding another branch keyed by `memberTeamContext` in Codex approval code.
- Update tests by changing the current regression-encoding assertions, not by deleting coverage.
- Keep dynamic team tool tests green; if any fail, inspect configured exposure/handler routing rather than weakening the high-trust Codex shell/file policy.
