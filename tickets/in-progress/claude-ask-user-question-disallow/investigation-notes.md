# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Design-ready
- Investigation Goal: Determine how to disable Claude Code's built-in `AskUserQuestion` tool for AutoByteus Claude Agent SDK runs while preserving AutoByteus MCP tools.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: Narrow SDK option addition and unit test update.
- Scope Summary: Hide one Claude built-in tool from context using bare `disallowedTools`, without enumerating all built-ins or changing MCP tool construction.
- Primary Questions To Resolve:
  - Does Anthropic support hiding a single built-in tool without enumerating all built-ins? Yes, bare `disallowedTools` removes the built-in from context.
  - Will this affect AutoByteus MCP tools like `send_message_to`? No expected impact; MCP tools are supplied via `mcpServers`, and docs distinguish MCP tools from built-in tool availability.

## Request Context

User observed Claude/Antigravity showing structured `askUserQuestions` / `AskUserQuestion` UI/tool calls and asked how to disable the annoying tool. After official-doc research, user confirmed the desired behavior: disallow `AskUserQuestion` so it does not appear in Claude context.

Reference image from user: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_15c7497f/solution_designer_55eec9e48da3de06/context_files/ctx_a1a3c607b7f6__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis/tickets/in-progress/claude-ask-user-question-disallow`
- Current Branch: `codex/claude-ask-user-questions-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-06.
- Task Branch: `codex/claude-ask-user-questions-analysis`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Current branch was created from refreshed `origin/personal`. Do not work in the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout for this task.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-06 | Command | `git fetch origin --prune` | Refresh base refs before task worktree creation | Succeeded | No |
| 2026-06-06 | Command | `git worktree add -b codex/claude-ask-user-questions-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis origin/personal` | Create dedicated task worktree | Worktree created from `origin/personal` | No |
| 2026-06-06 | Web | `https://code.claude.com/docs/en/tools-reference` | Verify official built-in tools and tool names | Official docs list `AskUserQuestion` as built-in: asks multiple-choice questions; exact names are used in permissions, subagent tool lists, hook matchers; docs say adding a tool name to deny disables it entirely | No |
| 2026-06-06 | Web | `https://code.claude.com/docs/en/agent-sdk/user-input` | Verify how clarifying questions are exposed | `AskUserQuestion` fires `canUseTool`; especially common in plan mode; if a `tools` array is specified, `AskUserQuestion` must be included for clarifying questions to work | No |
| 2026-06-06 | Web | `https://code.claude.com/docs/en/agent-sdk/custom-tools` | Verify availability vs permission semantics | `tools` and bare `disallowedTools` affect availability; `allowedTools` affects permission only. `tools` affects built-ins; MCP tools are unaffected. Bare `disallowedTools: ["AskUserQuestion"]` removes the built-in from context | No |
| 2026-06-06 | Command | `rg -n "claude-agent-sdk|allowedTools|disallowedTools|mcpServers|AskUserQuestion|canUseTool" autobyteus-server-ts autobyteus-ts autobyteus-web -S` | Locate Claude SDK launch/tool config | Relevant files found in `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` and Claude session/tooling files | No |
| 2026-06-06 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Inspect current query option construction | `buildQueryOptions` passes `allowedTools`, `mcpServers`, `canUseTool`/auto-exec, but not `tools` or `disallowedTools` | Yes: implementation should add bare `disallowedTools` here |
| 2026-06-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tooling-options.ts` | Inspect AutoByteus tool pre-approval name generation | AutoByteus tool names are collected into `allowedTools`, including `send_message_to`, `mcp__autobyteus_team__send_message_to`, browser/media/task/publish MCP tool names | No |
| 2026-06-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.ts` | Verify MCP server construction is separate from built-in tools | MCP servers are built separately for team, browser, media, and published artifacts | No |
| 2026-06-06 | Code | `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Locate unit coverage for SDK options | Existing tests assert stable query options for project skills, resume, MCP, and send_message_to tooling | Yes: update/add expectations |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `ClaudeSession.executeTurn` builds `toolingOptions`, `mcpServers`, and calls `ClaudeSdkClient.startQueryTurn`.
- Current execution flow:
  1. `ClaudeSession.executeTurn` resolves configured AutoByteus tool exposure.
  2. `resolveClaudeSessionToolingOptions` calculates `allowedTools` names.
  3. `buildClaudeSessionMcpServerConfig` / `buildClaudeSessionMcpServers` builds MCP server configs for AutoByteus tools.
  4. `ClaudeSdkClient.startQueryTurn` calls SDK `query({ prompt, options })` with model/cwd/env/permission/allowedTools/mcpServers/canUseTool.
- Ownership or boundary observations:
  - `ClaudeSdkClient` owns Anthropic SDK launch option shape.
  - Claude session/tooling files own AutoByteus MCP tool availability/pre-approval.
- Current behavior summary: Since no `tools` or `disallowedTools` availability filter is passed, Claude's default built-ins can include `AskUserQuestion`.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture evidence summary: The existing launch-owner boundary is correct. Add one vendor SDK option in the existing option builder.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `claude-sdk-client.ts` | Centralizes SDK query options | Correct owner for `disallowedTools` | Implement here |
| Anthropic custom tools docs | `allowedTools` is permission only; bare `disallowedTools` changes availability | Do not rely on `allowedTools` to hide `AskUserQuestion` | Add bare `disallowedTools` |
| Anthropic custom tools docs | MCP tools are unaffected by built-in `tools` availability list | AutoByteus MCP tools should be preserved | Regression test existing allowedTools remains |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Loads SDK and builds query options | No `disallowedTools` option today | Add constant/option here |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Orchestrates turn execution | Passes `allowedTools` and `mcpServers` to SDK client | No direct change required unless API needs plumbing |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tooling-options.ts` | Resolves AutoByteus allowed tool names | Existing behavior should remain | No change expected |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Unit coverage for SDK option construction | Existing stable options test is likely best place to assert `disallowedTools` | Update tests |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-06 | Static probe | `rg` searches listed above | Current code does not mention `AskUserQuestion` or `disallowedTools` in launch path | Single configuration addition needed |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Anthropic Claude Code Docs
- Version / tag / commit / freshness: Accessed 2026-06-06 through official `code.claude.com` docs.
- Relevant contract, behavior, or constraint learned:
  - `AskUserQuestion` is a built-in Claude Code tool.
  - Clarifying questions trigger `canUseTool` with `toolName === "AskUserQuestion"`.
  - Bare `disallowedTools` removes a built-in from context; scoped rules do not.
  - MCP tools are supplied separately and are not removed by built-in `tools` availability lists.
- Why it matters: Confirms the minimal safe implementation is `disallowedTools: ["AskUserQuestion"]`, not full `tools` enumeration.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Unit tests only for implementation-scoped verification; optional manual Claude run if validation environment has credentials.
- Required config, feature flags, env vars, or accounts: None for unit tests.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Created task worktree from `origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

The task should not use `tools: [...]` because that creates an allowlist of built-in tools and risks accidental omissions. The narrow approach is a bare `disallowedTools` entry on every Claude SDK query launched by AutoByteus.

## Constraints / Dependencies / Compatibility Facts

- Exact tool name is `AskUserQuestion`.
- The current server dependency is `@anthropic-ai/claude-agent-sdk` in `autobyteus-server-ts/package.json`.
- If the SDK type surface is not locally available or TypeScript types are not installed in the worktree, implementation can still add the option structurally in the plain object and validate through existing test mocks.

## Open Unknowns / Risks

- Whether the installed runtime SDK version in every deployment honors `disallowedTools`. Mitigation: dependency is modern; official docs support it. If a deployment has an older SDK, the option may be ignored rather than harmful.

## Notes For Architect Reviewer

Recommend approving a localized change in `ClaudeSdkClient.buildQueryOptions`: include a constant bare `disallowedTools: ["AskUserQuestion"]` in the SDK options, preserving all existing `allowedTools`, `mcpServers`, `canUseTool`, permission mode, cwd, env, and resume handling.
