# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Root cause identified; requirements refined; design-ready
- Investigation Goal: Determine why Claude Agent SDK / Claude Code runtime exits with code 1 in the Docker/server environment, identify the root cause, and define the required code/design change.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The bug spans team launch config, Claude runtime session configuration, SDK process startup, Docker root execution constraints, and runtime diagnostics/error classification.
- Scope Summary: Classroom simulation team member configured with Claude Agent SDK fails with `Claude Code process exited with code 1`. The actionable hidden cause for the reported team member path is Claude Code rejecting `bypassPermissions` under root/sudo because AutoByteus maps `autoExecuteTools=true` to provider `permissionMode: "bypassPermissions"`.
- Primary Questions To Resolve:
  - Which backend code launches Claude Code / Claude Agent SDK runtime? Resolved.
  - What exact command/env/cwd is used in Docker and local runtime? Resolved sufficiently for design.
  - Where are process stderr/stdout/status logs persisted? Server log path and Claude debug/session paths found; default app does not capture child stderr for UI.
  - Is the root cause missing authentication, missing binary/dependency, wrong runtime command, or lifecycle handling? Primary code root cause is auto-approve-to-bypass under root; missing Claude auth is a separate currently present environment prerequisite.
  - What behavior and diagnostics should the system provide after the fix? Decouple auto approval from provider bypass and capture/classify process/auth diagnostics.

## Request Context

User reported a classroom simulation agent team bug. They selected the Claude Agent SDK runtime, but the UI reports `Error: Claude Code process exited with code 1`. The screenshot shows the terminal tab displaying `Welcome to Claude Code v2.1.195`, an interactive login method prompt, and the chat/error panel showing `An Error Occurred — Error: Claude Code process exited with code 1`.

Screenshot reference: `/home/autobyteus/data/memory/agent_teams/software_engineering_team_458d56da9c67428cae0dced36413acee/solution_designer_03a2ed0542c14aa8bd9eb7cf6b84b394/context_files/ctx_9f7987383348__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/home/autobyteus/workspace/autobyteus-workspace`
- Task Artifact Folder: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/claude-code-process-start-failure`
- Current Branch: `codex/claude-code-process-start-failure`
- Current Worktree / Working Directory: `/home/autobyteus/workspace/autobyteus-workspace`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --prune origin` succeeded on 2026-06-28; `origin/personal` advanced to `4938681a487331349cb04936c7977350b25d222d`.
- Task Branch: `codex/claude-code-process-start-failure` created from `origin/personal` at `4938681a487331349cb04936c7977350b25d222d`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Work and artifacts are in the dedicated task worktree, not the shared `/home/autobyteus/workspace/autobyteus-workspace` checkout. The running server code lives under `/app` in the current all-in-one container; the investigated source of truth is the refreshed worktree.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-28 | Command | `pwd; ls -la; find .. -maxdepth 2 -name .git -type d -print` | Discover workspace and repo layout | Root repository is `/home/autobyteus/workspace/autobyteus-workspace`; several sibling git repos exist | No |
| 2026-06-28 | Command | `git status --short --branch && git remote -v && git branch -vv && git symbolic-ref refs/remotes/origin/HEAD || true && git worktree list` | Identify current branch, remotes, base branch, and worktrees | Shared checkout on `personal`, remote default `origin/personal`; existing unrelated worktrees | No |
| 2026-06-28 | Command | `git fetch --prune origin && git rev-parse origin/personal && git rev-parse personal` | Refresh latest tracked remote before branch creation | Fetch succeeded; `origin/personal` is `4938681a...`; local `personal` was older `b9e046f...` | No |
| 2026-06-28 | Command | `git worktree add -b codex/claude-code-process-start-failure /home/autobyteus/workspace/autobyteus-workspace origin/personal` | Create dedicated ticket worktree/branch from latest base | Worktree and branch created at latest `origin/personal` | No |
| 2026-06-28 | Data | User screenshot at `/home/autobyteus/data/memory/agent_teams/software_engineering_team_458d56da9c67428cae0dced36413acee/solution_designer_03a2ed0542c14aa8bd9eb7cf6b84b394/context_files/ctx_9f7987383348__image.png` | Establish observed failure and visible terminal state | UI error says `Claude Code process exited with code 1`; terminal shows Claude Code v2.1.195 login prompt | No |
| 2026-06-28 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Inspect SDK query option construction | Passes `pathToClaudeCodeExecutable`, `permissionMode`, `cwd`, `env`, `disallowedTools`, `allowedTools`, `mcpServers`, `settingSources`, and optionally `canUseTool`/`autoExecuteTools` to SDK | Modify for stderr diagnostics if design accepted |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-config.ts` | Inspect auto approval to permission mapping | `resolveClaudePermissionMode(autoExecuteTools)` returns `"bypassPermissions"` for true and `"default"` otherwise | Must change |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Trace run config into Claude session config | `runContext.config.autoExecuteTools` is converted to `permissionMode` when building `ClaudeSessionConfig` | Must decouple |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Trace turn execution | `permissionMode !== "bypassPermissions"` uses `toolingCoordinator.handleToolPermissionCheck`; `bypassPermissions` passes `autoExecuteTools: true` to `ClaudeSdkClient` | Must route auto approve through coordinator/callback without bypass |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Check auto approval owner | Coordinator already has an `autoExecuteTools` branch that approves with reason `auto_execute_tools_enabled`, but `ClaudeAgentRunContext.autoExecuteTools` currently derives from `sessionConfig.permissionMode === "bypassPermissions"` | Keep coordinator owner; change context state source |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-context.ts` | Inspect runtime context data model | `autoExecuteTools` getter currently infers from provider permission mode | Must store/derive from run config separately |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`, `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Trace team launch preset to member run config | Team launch normalizes `autoExecuteTools`; mixed member builds `AgentRunConfig` with member `autoExecuteTools` and runtime kind | Preserve team path |
| 2026-06-28 | Log | `/home/autobyteus/data/logs/server.log` lines 20962-20972 | Find backend logs for the reported failure | Classroom team run created; professor Claude run created; turn failed with SDK stack `Claude Code process exited with code 1` | Improve diagnostics |
| 2026-06-28 | Data | `/home/autobyteus/data/memory/agent_teams/classroomsimulation_2ff73fe2fbb14f1cbd488b8971ead0c7/team_run_metadata.json` | Confirm failing member config | `professor` member has `runtimeKind: "claude_agent_sdk"`, `llmModelIdentifier: "default"`, `autoExecuteTools: true`, workspace `/home/autobyteus/workspace` | No |
| 2026-06-28 | Data | `/home/autobyteus/data/memory/agent_teams/classroomsimulation_2ff73fe2fbb14f1cbd488b8971ead0c7/professor_a3306d07a80e438880d0cf69fba14b9d/raw_traces.jsonl` | Check recorded runtime output | Only accepted user message `hello` was recorded; no assistant/runtime diagnostic reached durable raw trace | Improve error event/diagnostics |
| 2026-06-28 | Command | `ps -ef` | Confirm runtime process user and server command | Server runs as `root` (`node dist/app.js ...`) in all-in-one container | Root-specific Claude constraint applies |
| 2026-06-28 | Command | `which claude; claude --version; env | sort | rg -n "CLAUDE|ANTHROPIC|AUTOBYTEUS|CODEX|HOME"` | Check CLI availability and relevant env | `/usr/bin/claude`, version `2.1.195`; `HOME=/root`; no Anthropic/Claude auth env keys visible; `CLAUDE_AGENT_SDK_VERSION=0.2.71` | Auth must be configured separately |
| 2026-06-28 | Code | `/app/node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.2.71_zod@4.3.6/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` | Verify SDK options | SDK supports `canUseTool`, `permissionMode`, `allowDangerouslySkipPermissions`, `settingSources`, `debug`, `debugFile`, and `stderr` callback | Use `stderr` callback for diagnostics |
| 2026-06-28 | Trace | `/tmp/claude-sdk-probe-default.mjs` with `DEBUG_CLAUDE_AGENT_SDK=1 node /tmp/claude-sdk-probe-default.mjs` | Reproduce effective team launch mode (`permissionMode: bypassPermissions`) outside app | Captured stderr: `--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons`; SDK then threw `Claude Code process exited with code 1` | Fix autoApprove mapping |
| 2026-06-28 | Log | `/root/.claude/debug/sdk-e723114f-b911-4e0a-bca6-5fa169d739b7.txt` | Preserve exact probe debug evidence | Line 1 command includes `--permission-mode bypassPermissions`; line 57 has root/sudo restriction; line 59 process exit code 1 | No |
| 2026-06-28 | Trace | `/tmp/claude-sdk-probe-break.mjs` and `/tmp/claude-sdk-probe-default-model-default-perm.mjs` | Check behavior with `permissionMode: default` | Root/sudo restriction disappears, but current container lacks Claude auth; stream emits `Not logged in · Please run /login`, `error: "authentication_failed"`, `is_error: true` | Classify auth result as runtime error |
| 2026-06-28 | Log/Data | `/root/.claude/projects/-app-autobyteus-server-ts/919eed7e-a56b-4289-b3af-d128e1e4b965.jsonl`, `/root/.claude/projects/-home-autobyteus-workspace/*` | Find Claude-side session/error artifacts | Claude model discovery and probes record synthetic assistant `Not logged in · Please run /login` with `error: "authentication_failed"` | No secrets copied; use only sanitized messages |
| 2026-06-28 | Doc | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docs/modules/agent_execution.md` | Check documented Claude permission/auto-approval behavior | README still references `CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions`; module docs discuss Claude SDK tooling but not this Docker/root invariant | Delivery docs impact likely |
| 2026-06-28 | Web | Anthropic Claude Code docs: `https://code.claude.com/docs/en/permission-modes` | Verify current permission-mode semantics and root behavior | `bypassPermissions` skips prompts/safety checks, is for isolated containers/VMs, and is refused under root/sudo with the exact dangerous-skip error observed locally | Yes: encode root-incompatible bypass finding in design/tests |
| 2026-06-28 | Web | Anthropic Claude Code docs: `https://code.claude.com/docs/en/sandbox-environments` | Determine whether Claude sandbox is always applied and how it relates to permission modes | Permission modes decide run/prompt behavior; isolation/sandboxing separately limits what actions can reach after they run. Sandboxed Bash, sandbox runtime, dev/custom containers, and VMs are separate isolation options | Yes: do not describe `default` permission mode as sandboxed |
| 2026-06-28 | Web | Anthropic Claude Code settings docs: `https://code.claude.com/docs/en/settings` | Check sandbox enable/disable knobs | `sandbox.enabled` default is false; `allowUnsandboxedCommands` controls the `dangerouslyDisableSandbox` escape hatch; bypass-disabling settings are separate from sandbox settings | Yes: document permission/sandbox separation |
| 2026-06-28 | Web | Anthropic Agent SDK docs: `https://code.claude.com/docs/en/agent-sdk/user-input` and `https://code.claude.com/docs/en/agent-sdk/permissions` | Verify SDK approval integration point | `canUseTool` handles tool approvals and can return allow/deny; SDK permission docs describe `default` unmatched tools falling through to `canUseTool` and `bypassPermissions` auto-approving after deny/ask/hook checks | Yes: implement AutoByteus approval through callback |
| 2026-06-28 | Repo | `git blame -L 1,20 -- autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-config.ts`; `git show 4fb78f86 ...` | Find why/when bypass mapping was introduced | Mapping was introduced by `4fb78f8646` (`Refactor runtime execution and history stack`); no commit-local rationale found; refactor also tied `autoExecuteTools` getter to `permissionMode === "bypassPermissions"` | Yes: classify as implementation drift/boundary conflation |
| 2026-06-28 | Repo | `tickets/in-progress/claude-agent-sdk-runtime-support/{requirements.md,investigation-notes.md,implementation-plan.md}` | Check earlier intended Claude auto-approval design | Earlier artifacts specified `autoExecuteTools=true -> SDK canUseTool allow callback`, not provider bypass mode | Yes: align fix with earlier intended design |
| 2026-06-28 | Repo | `tickets/done/settings-basic-codex-claude-access-mode/*`, `tickets/done/codex-runtime-access-mapping-analysis/design-spec.md` | Check history around Codex sandbox/full-access and Claude scope | Codex auto-approve/full-access mapping was Codex-specific because Codex has a filesystem sandbox/permission request surface; prior ticket explicitly said Claude permission mode is not Codex sandbox | Yes: avoid copying Codex access semantics to Claude |
| 2026-06-29 | User clarification | User accepted `permissionMode: "default"` solution after confirming Claude sandbox is manual/opt-in; requested complete testing for write/delete and command behavior inside and outside the workspace | Refine requirements/design for coverage breadth | Testing must prove no hidden workspace-only permission dead end remains: auto-approved Claude operations should cover workspace paths and a safe outside-workspace scratch path, including write/delete and shell command cases; manual mode should still gate permission requests | Yes: update requirements/design and re-handoff |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: UI/team launch creates a mixed `ClassRoomSimulation` team run and posts `hello` to the coordinator member `professor`.
- Current execution flow:
  1. `TeamRunService.buildMemberConfigsFromLaunchPreset(...)` normalizes launch preset fields including `autoExecuteTools`.
  2. `MixedAgentMemberHandle.buildMemberRunConfig(...)` builds an `AgentRunConfig` for the member with `runtimeKind: CLAUDE_AGENT_SDK` and `autoExecuteTools: true`.
  3. `AgentRunManager.createAgentRun(...)` selects `ClaudeAgentRunBackendFactory`.
  4. `ClaudeSessionBootstrapper.bootstrapInternal(...)` builds `ClaudeSessionConfig` and maps `autoExecuteTools=true` to `permissionMode: "bypassPermissions"`.
  5. `ClaudeSession.sendTurn(...)` starts the turn; `executeTurn(...)` calls `ClaudeSdkClient.startQueryTurn(...)` with `permissionMode: "bypassPermissions"` and `autoExecuteTools: true`.
  6. `ClaudeSdkClient.buildQueryOptions(...)` passes `permissionMode: "bypassPermissions"` to `@anthropic-ai/claude-agent-sdk`, which spawns `/usr/bin/claude --permission-mode bypassPermissions ...`.
  7. Claude Code exits code 1 under Docker/root because dangerous skip permissions are forbidden with root/sudo.
- Ownership or boundary observations:
  - AutoByteus `autoExecuteTools` is a run/team launch approval policy, already consumed by `ClaudeSessionToolUseCoordinator`.
  - Claude Code `permissionMode` is provider process policy. It should not be the authoritative storage for AutoByteus auto-approval state.
  - `ClaudeSdkClient` owns SDK option construction and can capture stderr through SDK-supported `stderr` callback.
- Current behavior summary: the process exits before useful runtime events are emitted, the server logs only the SDK generic process exit, and the UI shows only `Claude Code process exited with code 1`.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: A small internal refactor is needed to separate `autoExecuteTools` from `permissionMode`; a one-line conditional workaround would preserve the confused boundary and leave diagnostics/auth classification weak.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `claude-session-config.ts` | `autoExecuteTools` directly maps to `bypassPermissions` | Run-level approval policy is encoded as provider dangerous permission mode | Decouple fields |
| `claude-agent-run-context.ts` | `autoExecuteTools` getter derives from provider permission mode | Runtime context cannot express auto approval with safe provider permission mode | Add/store independent policy |
| Probe debug log | Claude Code rejects bypass under root/sudo | Current mapping is incompatible with Docker root server | Stop passing bypass for auto approve |
| `claude-session-tool-use-coordinator.ts` | Auto approval logic already exists in the coordinator | Existing owner can absorb correct behavior | Route SDK `canUseTool` through coordinator for auto/manual |
| Default-permission auth probe | Missing auth yields `Not logged in · Please run /login` with `is_error: true` | Error-result classification is also needed after root bypass is fixed | Add terminal error detection |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Build leaf member configs from team launch preset | Preserves `autoExecuteTools` from launch preset | Team path should stay unchanged |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Build member `AgentRunConfig` and create/restore runtime runs | Passes member `autoExecuteTools` to agent run config | Keep as upstream source of approval policy |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Build Claude runtime context/session config | Converts `autoExecuteTools` to provider `permissionMode` | Must pass/store approval policy separately |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-config.ts` | Claude session config shape/helpers | `resolveClaudePermissionMode(true) => "bypassPermissions"` | Remove/decommission incorrect mapping |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-context.ts` | Claude runtime context | `autoExecuteTools` derived from `permissionMode` | Add real auto-approval field/getter |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Turn lifecycle, SDK query, event emission | Uses bypass branch to pass `autoExecuteTools: true`; manual branch uses coordinator | Use coordinator for both auto/manual; classify terminal error results |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Claude permission callback and tool lifecycle coordination | Already auto-approves if runtime context says autoExecuteTools | Correct owner for auto approval |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | SDK module loading and query option construction | Can pass SDK options but does not capture stderr diagnostics | Extend with bounded redacted stderr callback support |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-output-events.ts` | Terminal/result chunk helpers | Treats any `type: "result"` as successful terminal chunk | Add error-result helper/classification |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-config.test.ts` | Current permission-mode mapping test | Expects old broken mapping | Update to new invariant |
| `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | Live SDK client checks | Already demonstrates lower-level `permissionMode: "default"` + `autoExecuteTools: true` shape | Useful target behavior reference |
| `README.md`, `autobyteus-server-ts/README.md` | User/admin runtime settings docs | Mention `CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions` despite no current source support and root-incompatible default | Delivery docs review/update needed |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-28 | Log | `nl -ba /home/autobyteus/data/logs/server.log | sed -n '20955,20975p'` | Server created classroom team and Claude `professor` run, then logged `Claude Code process exited with code 1` with SDK stack | Confirms backend failure source and log location |
| 2026-06-28 | Probe | `DEBUG_CLAUDE_AGENT_SDK=1 node /tmp/claude-sdk-probe-default.mjs` | With `permissionMode: bypassPermissions`, SDK debug log captured `--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons` | Exact hidden process error found |
| 2026-06-28 | Probe | `DEBUG_CLAUDE_AGENT_SDK=1 node /tmp/claude-sdk-probe-default-model-default-perm.mjs` | With `permissionMode: default`, no root/sudo error; stream reached init then auth failed (`Not logged in · Please run /login`) | Decoupling fixes root failure; auth remains prerequisite |
| 2026-06-28 | Probe | `node /tmp/claude-sdk-probe-break.mjs` | Breaking on the SDK `result` chunk exits without throwing; result has `is_error: true` and auth failure message | App must inspect terminal error result instead of treating all result chunks as success |
| 2026-06-28 | Command | `ps -ef` | Server process PID 49 runs as root | Docker/root invariant is active |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Installed `@anthropic-ai/claude-agent-sdk@0.2.71` package files under `/app/node_modules/.pnpm/...`; official Claude Code / Agent SDK docs checked at:
  - `https://code.claude.com/docs/en/permission-modes`
  - `https://code.claude.com/docs/en/agent-sdk/permissions`
  - `https://code.claude.com/docs/en/agent-sdk/user-input`
  - `https://code.claude.com/docs/en/sandbox-environments`
  - `https://code.claude.com/docs/en/settings`
- Version / tag / commit / freshness: Installed package in the running container; CLI `claude --version` reports `2.1.195 (Claude Code)`; docs checked on 2026-06-28.
- Relevant contract, behavior, or constraint learned: SDK `sdk.d.ts` documents `permissionMode`, `canUseTool`, `allowDangerouslySkipPermissions`, `settingSources`, `debug`, `debugFile`, and `stderr`; official docs and runtime probe show Claude Code rejects dangerous skip/bypass under root/sudo; official docs distinguish permission modes from sandbox/isolation mechanisms and list sandbox settings separately.
- Why it matters: The code can preserve auto approval through `canUseTool` and capture process diagnostics via `stderr` without provider bypass. The bug fix should not treat Claude `default` permission mode as sandboxed, and should not use `bypassPermissions` as a sandbox-disable mechanism.

## Follow-Up: Why `bypassPermissions` Was Used, And Claude Permission vs Sandbox Semantics

User follow-up on 2026-06-28 asked why AutoByteus previously mapped Claude auto approval to `bypassPermissions`, whether that was required for normal/non-root users, and whether Claude always applies a sandbox. The findings below refine the original root-cause analysis.

### Answer Summary

- `bypassPermissions` was likely chosen because it superficially matches the product intent "do not ask the user for tool approvals". It also worked on non-root developer machines / isolated environments before Claude Code's root guard was visible in this Docker path.
- I did **not** find a reviewed requirement saying AutoByteus auto-approval must become Claude provider `bypassPermissions`. The strongest prior ticket evidence points the other direction: Claude auto-approval was originally specified as `autoExecuteTools=true -> SDK canUseTool allow callback`.
- Therefore the current mapping appears to be implementation drift introduced during the runtime execution/history refactor, probably by conflating:
  1. AutoByteus run-level auto approval (`autoExecuteTools`),
  2. Claude provider permission mode (`default`/`acceptEdits`/`bypassPermissions`/etc.), and
  3. Codex filesystem sandbox/full-access behavior.
- Claude sandboxing is **not always applied**. Official Claude docs describe permission modes and sandboxing as separate concepts. Permission modes decide whether a tool call is allowed / prompts; isolation limits what a command/process can reach after it runs.
- Claude has separate sandbox controls. The built-in Bash sandbox can be enabled with settings such as `sandbox.enabled`; default is false. Claude also has a separate sandbox runtime wrapper and can be run inside dev/custom containers or VMs.
- `default` permission mode does **not** mean "use a sandbox". It means standard permission behavior. In the SDK, unmatched tool calls can be routed to `canUseTool`; AutoByteus can auto-return allow there when `autoExecuteTools=true`.
- In a root-running AutoByteus Docker container, `bypassPermissions` is not viable because Claude Code refuses dangerous skip permissions under root/sudo unless it detects a recognized sandbox. Using `default + canUseTool auto-allow` is the compatible path.

### Evidence From Current Code History

- `git blame` shows `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-config.ts` and the `autoExecuteTools ? "bypassPermissions" : "default"` mapping were introduced by commit `4fb78f8646199f83201295ddf7c3e367dd1d56c5` (`Refactor runtime execution and history stack`, 2026-03-30).
- The same commit created `ClaudeAgentRunContext.autoExecuteTools` as a getter derived from `sessionConfig.permissionMode === "bypassPermissions"`.
- This refactor also had an SDK-client fallback helper `allowToolUseWithoutPrompt`, but the Claude session path only used the coordinator callback when `permissionMode !== "bypassPermissions"`; when bypassing it passed `autoExecuteTools: true` directly.
- I found no commit-local rationale explaining why `autoExecuteTools` was encoded as provider bypass rather than as the already available `canUseTool` approval callback.

### Evidence From Prior Ticket History

- `tickets/in-progress/claude-agent-sdk-runtime-support/requirements.md` acceptance criterion `AC-019` explicitly states: `autoExecuteTools=true -> SDK auto-allow callback; false -> no auto-allow callback`.
- `tickets/in-progress/claude-agent-sdk-runtime-support/investigation-notes.md` re-entry delta (2026-03-03) says the SDK supports `canUseTool` and that this allows an SDK-native "auto approve" path without unsupported runtime approve-tool command handling.
- `tickets/in-progress/claude-agent-sdk-runtime-support/implementation-plan.md` Batch L says: `autoExecuteTools=true -> SDK canUseTool allow callback`.
- `tickets/done/settings-basic-codex-claude-access-mode/investigation-notes.md` says Claude permission mode is not equivalent to Codex filesystem sandbox mode and that Claude has separate sandbox concepts/settings.
- `tickets/done/codex-runtime-access-mapping-analysis/design-spec.md` intentionally maps Codex `autoExecuteTools=true` to effective `danger-full-access` because Codex has a separate filesystem sandbox and permission escalation request surface. That design is Codex-specific and should not be copied to Claude provider permission mode.
- `tickets/done/docker-volume-mount-ux` and `tickets/done/server-docker-codex-claude-cli` confirm the current public Docker image/server commonly runs as `root`, persists `/root`, and documents root-owned bind-mount risk. This makes the Claude root/bypass invariant operationally relevant.

### Official Claude Permission/Sandbox Semantics Checked On 2026-06-28

- Claude permission modes: official docs describe `default` as reads-only without asking, `acceptEdits` as auto-approving edits/common filesystem commands, `auto` as classifier-backed, `dontAsk` as pre-approved-only, and `bypassPermissions` as everything in isolated containers/VMs only. `bypassPermissions` disables prompts/safety checks and should only be used in isolated environments.
- Root/sudo guard: official docs state Claude Code refuses `--dangerously-skip-permissions` / `bypassPermissions` on Linux/macOS when running as root or under sudo, with the exact error observed in this container: `--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons`.
- Permission modes vs isolation: official sandbox environment docs state permission modes decide whether a tool call runs/prompts; isolation restricts what it can access once it runs. They are separate controls that can be layered.
- Sandboxing is not automatic: official settings docs list `sandbox.enabled` with default `false`. Therefore, if the user does not explicitly turn Claude sandboxing on through Claude Code settings or launch Claude inside a separate sandbox/container/VM, Claude's built-in sandbox is not active by default. The built-in sandbox isolates Bash commands; it does not automatically sandbox all file tools/MCP/hooks unless using sandbox runtime, dev/custom container, or VM around the whole Claude Code process.
- Current container check: `/root/.claude/settings.json` currently contains only `{ "theme": "auto" }`; no `sandbox.enabled` setting was observed there, and no workspace `.claude/settings.json` was found under the checked workspace search. Docker itself remains an outer container boundary, but Claude did not explicitly enable its own built-in sandbox from these settings.
- Sandbox escape/disable controls exist only in the sandbox feature context: settings include `excludedCommands` and `allowUnsandboxedCommands`, which controls whether commands can use the `dangerouslyDisableSandbox` escape hatch. If sandboxing is not enabled, there is no sandbox to disable.
- SDK approval callback: official Agent SDK docs say `canUseTool` is invoked for tool approval / user input and can return `{ behavior: "allow", updatedInput }` or `{ behavior: "deny", message }`. That is the correct integration point for AutoByteus auto/manual approval.

### Refined Behavioral Matrix

| Scenario | `permissionMode: "bypassPermissions"` | `permissionMode: "default"` + AutoByteus `canUseTool` |
| --- | --- | --- |
| Root Docker server | Fails at Claude startup with root/sudo dangerous-skip rejection | Starts past permission-mode check; then requires valid Claude auth/settings |
| Non-root isolated container/VM | May work if explicitly enabled and user accepts risk | Works; AutoByteus can still auto-approve through callback |
| Non-root host without isolation | May work but is unsafe because it bypasses prompts/safety checks on host | Safer default; user can choose AutoByteus auto/manual approval behavior |
| Need no UI clicks for tools | Achieved by bypassing provider checks, but dangerous and root-incompatible | Achieved by `canUseTool` returning allow when `autoExecuteTools=true` |
| Need to disable Claude sandbox problems | Not the right control; `bypassPermissions` is permission/safety bypass, not sandbox-disable | Use Claude sandbox settings (`sandbox.enabled`, `excludedCommands`, `allowUnsandboxedCommands`) or avoid enabling the sandbox |

### Resulting Design Implication

The design should keep the original recommendation: decouple AutoByteus `autoExecuteTools` from Claude provider `permissionMode`. Standard AutoByteus Claude launches should use `permissionMode: "default"` and route SDK permission checks through `ClaudeSessionToolUseCoordinator`. When `autoExecuteTools=true`, the coordinator auto-allows without user clicks; when false, it emits the normal approval request. If product later wants a true Claude dangerous-bypass mode for non-root isolated containers, that should be an explicit advanced provider setting with a root preflight and warning, not the meaning of `autoExecuteTools`.

### Practical Purpose Of Sandbox Versus Auto-Approve

User follow-up on 2026-06-28 asked why sandboxing is useful if AutoByteus auto-approve lets the agent write/run tools without user clicks.

Short answer: auto-approve and sandbox protect different boundaries.

- Auto-approve is a **decision/prompt policy**: whether the system says yes to a requested tool call without asking the user.
- Sandbox/isolation is an **execution boundary**: what the already-approved command/process can actually read, write, delete, or reach on the network.

Therefore, auto-approve does not make sandbox useless. If a sandbox is active, an auto-approved command can still fail or be constrained by the sandbox. Analogy: auto-approve is saying "yes, run the command"; sandbox is the locked room in which the command runs.

Useful cases for sandboxing:

1. **Model mistake containment**: If Claude proposes an overly broad command, auto-approve may allow it, but sandbox can prevent writes outside allowed paths or block network egress.
2. **Prompt-injection containment**: If repository content or a website instructs Claude to exfiltrate secrets or delete data, a sandbox can block access even when the approval layer is permissive.
3. **Untrusted code containment**: Build scripts, tests, package install hooks, and shell commands can do unexpected filesystem/network operations. Sandbox limits side effects.
4. **Unattended/background work**: The fewer prompts a run has, the more valuable isolation becomes because humans are not reviewing each step.
5. **Host protection**: Docker/VM/dev-container isolation protects the host even if the agent has broad permissions inside the isolated environment.

Important caveat for Claude specifically: not every Claude sandbox mechanism has the same coverage.

- Claude's built-in Bash sandbox focuses on Bash commands and child processes; it is not the same as sandboxing every possible file/MCP/tool surface.
- The sandbox runtime, dev container, custom container, and VM approaches provide broader process/environment isolation.
- A Docker container is already a sandbox relative to the host, but only to the extent its mounts, credentials, user, and network policy are constrained.

In the current AutoByteus Docker image, the server runs as `root` inside the container and has access to mounted/persisted locations such as `/home/autobyteus/workspace`, `/home/autobyteus/data`, and `/root`. If no additional Claude sandbox is enabled, AutoByteus auto-approve can let Claude modify anything the root server process can modify inside that container and its mounted volumes. This may be acceptable for a deliberately dedicated, high-trust container, but it is not the same as having a sandbox that limits blast radius.

This is why the current bug fix must not conflate three concepts:

- AutoByteus `autoExecuteTools=true`: no user-click approval at the AutoByteus layer.
- Claude `permissionMode: "bypassPermissions"`: dangerous provider-level permission/safety bypass, root-incompatible unless Claude recognizes a sandbox. This mode does **not** turn on Claude sandboxing.
- Claude/container sandboxing: actual isolation boundary; optional and separately configured. Docker may provide outer isolation relative to the host, and Claude can also load separately configured sandbox settings from Claude Code settings sources, but the previous AutoByteus `bypassPermissions` mapping did not itself enable either one.

For the desired current behavior (agent can control its dedicated Docker container without user clicks), the right default is `permissionMode: "default"` plus AutoByteus `canUseTool` auto-allow, with Claude sandboxing left off unless explicitly configured. If a future mode wants safer unattended execution, use real sandbox/container/VM controls rather than provider `bypassPermissions` as a substitute for sandbox configuration.

### 2026-06-29 Testing Scope Clarification

The user accepted the `permissionMode: "default"` + AutoByteus `canUseTool` auto-allow solution after confirming Claude's built-in sandbox is not enabled by default and must be turned on manually if desired. The user also clarified that the validation must be broader than a workspace-only happy path.

Required coverage implication:

- Auto-approved Claude permission flow must be exercised for write, delete, and shell-command cases inside the run workspace.
- Auto-approved Claude permission flow must also be exercised against a safe outside-workspace scratch directory, for example a test-created directory under `/tmp` or another disposable test root, not production paths such as `/root` or `/home/autobyteus/data`.
- At least one shell-command case should target or run against the outside-workspace scratch path.
- Coverage should verify the behavior happens without `permissionMode: "bypassPermissions"` and without a public manual approval stop when `autoExecuteTools=true`.
- Manual mode (`autoExecuteTools=false`) should still prove the same kind of permission-gated operation is blocked pending user approval rather than silently executing.

Rationale: prior use of `bypassPermissions` may have masked prompts for operations outside the workspace. The replacement must prove `default` permission mode plus callback auto-approval does not reintroduce hidden prompts or permission dead ends for trusted, dedicated-container operations that intentionally reach outside the workspace.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Running all-in-one server container; no Docker CLI available inside this container.
- Required config, feature flags, env vars, or accounts: `RUN_CLAUDE_E2E` not used for probes. Current environment has Claude CLI installed but no visible `ANTHROPIC_API_KEY`/Claude auth env and `/root/.claude` contains settings/session folders but no usable auth for SDK turns.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Created dedicated git worktree; wrote temporary probe scripts under `/tmp` only.
- Cleanup notes for temporary investigation-only setup: `/tmp/claude-sdk-probe*.mjs` and `/root/.claude/debug/sdk-*.txt` were created by probes. They are not repository artifacts.

## Findings From Code / Docs / Data / Logs

- The runtime executable exists: `/usr/bin/claude`, `2.1.195 (Claude Code)`.
- The SDK dependency exists in the running image: `@anthropic-ai/claude-agent-sdk@0.2.71`.
- The class/team failure is not a missing binary; it is process startup rejection caused by passing `--permission-mode bypassPermissions` while running as root.
- The visible Claude login prompt in the screenshot aligns with the separate finding that the container lacks usable Claude auth, but the exact logged class/team member failure is explained by `autoExecuteTools=true` -> `bypassPermissions` -> root/sudo rejection.
- Current durable memory for the failed professor run recorded only the user message, confirming no useful error detail was persisted through runtime events.

## Constraints / Dependencies / Compatibility Facts

- Docker/server process runs as root today. Changing the image user is a larger packaging change and not necessary for this bug if approval policy is decoupled from provider bypass.
- `autoExecuteTools` is a public AutoByteus run/team launch policy used by Codex, AutoByteus, Claude, teams, applications, and tests; do not redefine it as a Claude-only provider permission mode.
- No backward-compatible dual path should retain the old auto-approve-to-bypass mapping for standard launches.
- Live Claude success still requires user/container auth. The fix should make missing auth explicit, not hide it or try to invent credentials.

## Open Unknowns / Risks

- If users intentionally need Claude `bypassPermissions` on non-root hosts, a future explicit provider permission setting may be needed, but that is outside this fix.
- Some live tests may have relied on `bypassPermissions` behavior on non-root developer machines; they should be adjusted to assert AutoByteus auto approval, not provider bypass.
- The exact UI rendering of runtime `ERROR` payloads should be verified downstream; the backend should provide the actionable message.

## Notes For Architect Reviewer

The target design should be a local boundary refactor, not a Docker user change. The governing owner for AutoByteus auto approval is the Claude session/tool permission coordinator; `ClaudeSdkClient` owns provider SDK option construction and process stderr capture. The broken `resolveClaudePermissionMode(autoExecuteTools)` mapping should be removed/decommissioned rather than guarded only for root.
