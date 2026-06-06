# Design Spec

## Current-State Read

AutoByteus Claude runs are launched through `ClaudeSession.executeTurn`, which resolves configured AutoByteus tool exposure, builds in-process MCP servers for AutoByteus tools, and delegates provider startup to `ClaudeSdkClient.startQueryTurn`.

Current path:

`User turn -> ClaudeSession.executeTurn -> resolveClaudeSessionToolingOptions -> buildClaudeSessionMcpServerConfig -> ClaudeSdkClient.startQueryTurn -> Claude Agent SDK query`

Current ownership boundaries:

- `ClaudeSession` owns one Claude turn's runtime orchestration: prompt construction, tool exposure resolution, MCP server assembly, permission callback wiring, active query lifecycle, and event projection.
- `resolveClaudeSessionToolingOptions` owns AutoByteus tool pre-approval names (`allowedTools`) based on configured tool exposure and team context.
- `buildClaudeSessionMcpServerConfig` / `buildClaudeSessionMcpServers` owns AutoByteus MCP server construction for team communication, task delegation, browser, media, and published-artifact tools.
- `ClaudeSdkClient.buildQueryOptions` owns Anthropic SDK query option shape: model, cwd, env, settings sources, permission mode, resume id, `allowedTools`, `mcpServers`, abort controller, and `canUseTool` policy.

Constraint from current state: do not replace `allowedTools` with a restrictive `tools` allowlist. `allowedTools` currently pre-approves configured AutoByteus tools; it does not hide Claude built-ins. A full built-in allowlist would risk accidentally omitting Claude built-ins that AutoByteus has not explicitly modeled.

## Intended Change

Hide Claude Code's built-in `AskUserQuestion` tool from AutoByteus Claude Agent SDK sessions by adding a bare `disallowedTools: ["AskUserQuestion"]` SDK option in `ClaudeSdkClient.buildQueryOptions`.

This should be a constant product policy for AutoByteus Claude runs in this ticket. Preserve all existing `allowedTools`, `mcpServers`, permission mode, settings-source, resume, cwd, env, abort, explicit `canUseTool`, and auto-exec behavior.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No
- Evidence: `ClaudeSdkClient.buildQueryOptions` already centralizes SDK query options. AutoByteus MCP tools are already separately constructed through `mcpServers` and pre-approved through `allowedTools`. The missing behavior is one provider SDK availability option.
- Design response: Add one bare `disallowedTools` entry for `AskUserQuestion` at the Claude SDK option boundary, with unit coverage.
- Refactor rationale: No refactor needed. The existing owner, boundary, API shape, and file placement remain healthy for this scope.
- Intentional deferrals and residual risk, if any: No user-facing toggle is added. Residual risk is that some future workflow might want Claude clarifying-question UI; that should be a follow-up product setting if requested, not a compatibility branch now.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no legacy code path is being replaced in this narrow configuration change.
- The design must not add dual behavior, a compatibility wrapper, or a fallback branch that preserves `AskUserQuestion` exposure.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User turn entering Claude runtime | Claude Agent SDK `query` started with final options | `ClaudeSession` for turn orchestration, `ClaudeSdkClient` for provider query option boundary | Shows where built-in tool availability must be changed without disturbing MCP tools. |
| DS-002 | Bounded Local | `ClaudeSdkClient.startQueryTurn` | SDK `query({ prompt, options })` call | `ClaudeSdkClient` | The exact local boundary where `disallowedTools` belongs. |
| DS-003 | Return-Event | Claude SDK tool/permission callbacks | AutoByteus runtime event/tool coordinator | `ClaudeSessionToolUseCoordinator` | Confirms this task should avoid merely denying `AskUserQuestion` in callback after Claude has already seen/called it. |

## Primary Execution Spine(s)

`User Turn -> ClaudeSession -> Tooling Options + MCP Server Config -> ClaudeSdkClient Query Options -> Claude Agent SDK query`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user message reaches `ClaudeSession.executeTurn`; the session constructs the prompt, resolves AutoByteus tools, builds MCP servers, then starts Claude via the SDK client. The target behavior is applied at SDK option construction so Claude never receives `AskUserQuestion` as an available built-in. | User turn, Claude session, tooling options, SDK client query options, provider query | `ClaudeSession` + `ClaudeSdkClient` | MCP server construction, permission callback, settings-source policy |
| DS-002 | The SDK client normalizes launch options into a plain object passed to `query`. Add the bare `disallowedTools` option here. | Start query request, query options, SDK call | `ClaudeSdkClient` | SDK module loading, working-directory guard, auto-exec callback injection |
| DS-003 | Tool calls and permission checks flow back through the tool coordinator. This remains unchanged because the goal is context removal, not post-call denial. | SDK can-use-tool callback, tool coordinator, runtime events | `ClaudeSessionToolUseCoordinator` | Approval UI, tool event projection |

## Spine Actors / Main-Line Nodes

- User turn: the external request content being processed.
- `ClaudeSession`: turn lifecycle/orchestration owner.
- Tooling options/MCP server config: AutoByteus tool exposure and provider-specific MCP setup.
- `ClaudeSdkClient`: provider SDK launch boundary.
- Claude Agent SDK `query`: Anthropic runtime entrypoint.

## Ownership Map

- `ClaudeSession` owns turn sequencing and delegates provider-specific option details to `ClaudeSdkClient`.
- `resolveClaudeSessionToolingOptions` owns the set of AutoByteus tools that should be pre-approved in `allowedTools`.
- `buildClaudeSessionMcpServerConfig` owns the MCP server map that exposes AutoByteus tools.
- `ClaudeSdkClient` owns final SDK option shape and is therefore the authoritative place to add `disallowedTools`.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ClaudeSdkClient.startQueryTurn` | `ClaudeSdkClient.buildQueryOptions` + SDK `query` | Public method used by Claude sessions to start one turn | AutoByteus tool exposure policy, which remains in session/tooling files except provider-level defaults such as disallowed built-ins. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `AskUserQuestion` built-in availability in AutoByteus Claude runs | Product no longer wants interruptive structured clarification-question tool calls | Bare `disallowedTools: ["AskUserQuestion"]` in `ClaudeSdkClient.buildQueryOptions` | In This Change | This is removal from Claude context, not deletion of local code. |

## Return Or Event Spine(s) (If Applicable)

No event spine changes. Existing `canUseTool`/tool-permission callbacks stay intact for normal tools. `AskUserQuestion` should not reach this path after the availability change.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ClaudeSdkClient`
- Chain: `startQueryTurn -> buildQueryOptions -> createSdkQuery -> SDK query`
- Why it matters: `disallowedTools` is a provider option and belongs in `buildQueryOptions`, before `createSdkQuery` calls the SDK.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| AutoByteus MCP server construction | DS-001 | `ClaudeSession` | Expose configured AutoByteus tools via in-process MCP servers | Tool availability for AutoByteus-owned capabilities | Mixing this with built-in disallow policy could accidentally remove custom tools. |
| `allowedTools` pre-approval | DS-001 | `ClaudeSession` / `ClaudeSdkClient` | Skip approval prompts for configured tools | Smooth product UX for known tools | Treating it as visibility control would fail to hide `AskUserQuestion`. |
| Tool permission callback | DS-003 | `ClaudeSessionToolUseCoordinator` | Approve/deny tool calls and emit tool lifecycle events | Runtime safety and UI visibility | Using this to block `AskUserQuestion` would still let Claude see/call it and waste a turn. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Add provider-level built-in disallow option | Claude SDK client/runtime management | Extend | Existing `ClaudeSdkClient.buildQueryOptions` owns query option shape | N/A |
| Preserve AutoByteus MCP tools | Claude session MCP server config | Reuse | Existing server builders already expose configured tools | N/A |
| Regression coverage | Claude SDK client unit tests | Extend | Existing test already verifies stable query options | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime Management / Claude SDK Client | Provider SDK loading and query options | DS-001, DS-002 | `ClaudeSdkClient` | Extend | Add `disallowedTools` here. |
| Claude Agent Execution Session | Turn orchestration and tool/MCP setup | DS-001, DS-003 | `ClaudeSession` | Reuse | No code change expected. |
| Tests / Runtime Management Unit Coverage | Query option contract tests | DS-002 | `ClaudeSdkClient` | Extend | Assert disallowed built-in plus preserved allowed tools. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Runtime Management / Claude SDK Client | `ClaudeSdkClient` | Add provider launch option `disallowedTools` with `AskUserQuestion` | This file already builds the final SDK option object | No new shared structure required |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Tests | Unit test boundary for SDK client | Assert query options include `disallowedTools` and existing tools remain | Existing stable options test is already scoped to this contract | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Single disallowed tool name `AskUserQuestion` | N/A or local constant in `claude-sdk-client.ts` | Runtime Management / Claude SDK Client | Not repeated enough for a new file | N/A | N/A | A global mixed provider-policy registry |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | Low | No shared data model changes. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Runtime Management / Claude SDK Client | `ClaudeSdkClient` | Include bare `disallowedTools: ["AskUserQuestion"]` in normal query options | It is the final provider query option construction boundary | Local constant acceptable |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Tests | SDK option contract test | Update/add expectation for `disallowedTools` | Existing test already covers stable query option surface | N/A |

## Ownership Boundaries

The provider option boundary is authoritative in `ClaudeSdkClient`; callers should not individually know how Anthropic names or hides built-in tools. `ClaudeSession` should continue passing semantic AutoByteus tooling data (`allowedTools`, `mcpServers`, permission callbacks) and should not need to know about `AskUserQuestion` unless a future product toggle is added.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ClaudeSdkClient.startQueryTurn` | SDK query option construction, SDK module call, cwd guard | `ClaudeSession` and runtime-management callers | Callers constructing raw Anthropic SDK query options independently | Add typed options to `ClaudeSdkStartQueryTurnOptions` only when caller variability is required. |
| `buildClaudeSessionMcpServerConfig` | In-process MCP server builders | `ClaudeSession` | Adding MCP tool definitions directly inside `ClaudeSdkClient` | Extend MCP server builder inputs. |

## Dependency Rules

- `ClaudeSession` may depend on `ClaudeSdkClient.startQueryTurn` and pass already-resolved AutoByteus tool/MCP inputs.
- `ClaudeSdkClient` may know provider-specific option names such as `disallowedTools`.
- `ClaudeSdkClient` must not take over AutoByteus tool exposure policy currently owned by session/tooling files.
- Do not add a `tools` allowlist to solve this ticket.
- Do not block `AskUserQuestion` only in `canUseTool`; that leaves the tool visible and allows wasted tool-call attempts.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ClaudeSdkClient.startQueryTurn(options)` | One Claude SDK query turn | Accept semantic launch inputs and call SDK `query` with normalized options | `ClaudeSdkStartQueryTurnOptions` with optional session id, model string, cwd, mcp server map, allowed tool names | No new public input needed for this constant policy. |
| `ClaudeSdkClient.buildQueryOptions(options)` | Provider query option object | Convert internal launch inputs into Anthropic SDK option object | Plain object for SDK | Add `disallowedTools` here. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `startQueryTurn` | Yes | Yes | Low | None. |
| `buildQueryOptions` | Yes | Yes | Low | Add constant option only. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Claude SDK client | `ClaudeSdkClient` | Yes | Low | None. |
| Disallowed built-in tools local constant | e.g. `CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS` or inline `disallowedTools` | Yes if local and explicit | Low | Prefer a narrow local constant if implementation wants clarity. |

## Applied Patterns (If Any)

No new architectural pattern. This is a provider adapter option default.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | File | `ClaudeSdkClient` | Add `disallowedTools` to the SDK query options | Existing SDK option construction owner | AutoByteus MCP tool-definition construction |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | File | Test boundary | Verify query options include `disallowedTools` and preserve existing tool options | Existing SDK client unit test location | E2E-only assumptions |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/runtime-management/claude/client` | Provider client boundary | Yes | Low | Provider SDK option belongs here. |
| `tests/unit/runtime-management/claude/client` | Unit coverage for provider client boundary | Yes | Low | Existing contract test location. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Hide only one built-in | `options: { allowedTools, mcpServers, disallowedTools: ["AskUserQuestion"] }` | `options: { tools: ["Read", "Write", "Bash", ...] }` | Bare `disallowedTools` avoids risky built-in enumeration. |
| Preserve AutoByteus tools | Keep `allowedTools: toolingOptions.allowedTools` and `mcpServers` unchanged | Replacing `allowedTools` with `tools` and forgetting `mcp__autobyteus_team__send_message_to` | MCP tools and pre-approval remain separate concerns. |
| Avoid post-call denial | Hide with bare `disallowedTools` | `canUseTool` denies `AskUserQuestion` after Claude calls it | Visibility removal prevents wasted attempts and UI noise. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| User-configurable toggle to preserve `AskUserQuestion` | Some workflows might like clarifying questions | Rejected for this ticket | Apply product default: always disallow `AskUserQuestion`. Add a future setting only if requested. |
| Deny in `canUseTool` callback only | Quick to implement | Rejected | Use bare `disallowedTools` so tool is removed from context. |
| Full `tools` built-in allowlist | Also hides unlisted built-ins | Rejected | Use bare `disallowedTools` to avoid omissions. |

## Derived Layering (If Useful)

Layer shape is unchanged:

`Agent Execution Session -> Runtime Management Claude SDK Client -> Anthropic Claude Agent SDK`

MCP tool construction remains adjacent to agent execution; provider launch options remain in runtime management.

## Migration / Refactor Sequence

1. Add a local constant or inline bare `disallowedTools: ["AskUserQuestion"]` in `ClaudeSdkClient.buildQueryOptions`.
2. Update `ClaudeSdkStartQueryTurnOptions` only if TypeScript typing needs an internal field; preferred design does not require caller plumbing.
3. Update `claude-sdk-client.test.ts` to assert the SDK `query` options contain `disallowedTools: ["AskUserQuestion"]`.
4. Run the targeted unit test for `ClaudeSdkClient`.
5. If typecheck is practical in implementation scope, run server TypeScript typecheck or at least the relevant unit test compilation path.
6. No legacy cleanup beyond removing `AskUserQuestion` availability from the query option context.

## Key Tradeoffs

- Bare `disallowedTools` vs full `tools` allowlist: choose bare `disallowedTools` because it hides only `AskUserQuestion` and preserves provider defaults.
- Constant policy vs product setting: choose constant policy because the user requested disabling the annoying tool and the scope is intentionally simple.
- Availability removal vs permission denial: choose availability removal to keep the tool out of Claude's context.

## Risks

- An older Claude Agent SDK version might ignore `disallowedTools`; dependency currently uses `@anthropic-ai/claude-agent-sdk` and official docs support the option. Unit tests can verify our option construction even if SDK runtime validation requires live credentials.
- Future product needs may want interactive clarifying questions; this should be handled as a future configurable product requirement, not included in this simple change.

## Guidance For Implementation

- Prefer the minimal code change in `ClaudeSdkClient.buildQueryOptions`:

```ts
const CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS = ["AskUserQuestion"];

// inside returned query options
return {
  model: options.model,
  pathToClaudeCodeExecutable,
  permissionMode: options.permissionMode ?? "default",
  disallowedTools: CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS,
  ...
};
```

- If the implementation uses a constant array, avoid mutating/reusing caller-owned arrays.
- Do not remove or change `allowedTools`, `mcpServers`, or `canUseTool` behavior.
- Update `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` with `disallowedTools: ["AskUserQuestion"]` in the stable options assertion.
- Recommended targeted validation:

```bash
pnpm -C autobyteus-server-ts exec vitest --run tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts
```
