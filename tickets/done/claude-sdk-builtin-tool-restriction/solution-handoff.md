# Solution Handoff — claude-sdk-builtin-tool-restriction

- Result classification: `Architecture Design Complete`
- Package identifier: `claude-sdk-builtin-tool-restriction`
- Current solution revision: `SR-002`
- Classification: `task_size=Small`, `architectural_risk=Low` (rationale in `design-spec.md` § Task Size And Architectural Risk)
- Selected route: direct implementation (handoff rule: Small/Medium + Low → `/implementation_engineer`). Independent architecture review artifacts: `N/A — not applicable`.
- Approval state: requirements Approved by the user on 2026-09-24 ("sounds good. i approved your proposed plan. lets do it."). SR-002 is an evidence-only refinement with no intended-behavior change.

## Original Request And Goal

The user asked: "currently our server support claude agent sdk, but i dont want to use their subagent functionality … we support task tools, which are our own subagent tools. could you check whether claude agent sdk support disable certain internal tools?" Clarified goal: Claude Code should not even know that native subagent/multi-agent tools exist. AutoByteus' own `delegate_task` / `send_message_to` / team tools are the mechanism.

## What To Implement (summary; the design spec is authoritative)

In `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`:
- Add `CLAUDE_BUILT_IN_TOOLS_ENABLED_BY_AUTOBYTEUS = ["Bash","Read","Edit","Write","Glob","Grep","NotebookEdit","WebFetch","WebSearch","Skill"]`.
- Extend `CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS` to `["AskUserQuestion","Agent","Task","Workflow","SendMessage","ListAgents"]`.
- Emit `tools: [...ENABLED]` in `buildQueryOptions` only. Leave model discovery (`resolveContextCapacities`, `tools: []`) unchanged.

Also:
- Update `tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`: replace `not.toHaveProperty("tools")` (L126, L219) with exact `tools` assertions, and update the `disallowedTools` expectation (L204).
- Rewrite the `autobyteus-server-ts/docs/modules/agent_execution.md` L438-446 paragraph. It currently says not to use a `tools` allowlist, which is superseded (DEC-004).

## Constraints

- Preserve `allowedTools`, `mcpServers`, `canUseTool`, `permissionMode`, `settingSources`, session/resume, env and `systemPrompt` behavior (REQ-004, REQ-005).
- No toggle or fallback to the default preset. Add no new fields to `ClaudeSdkStartQueryTurnOptions`.
- Scope excludes: editing built-in description text, per-agent configurability, migrating `Skill` to the SDK `skills` option, other runtimes.

## Evidence

- The real Claude Code CLI was probed against a local fake Messages API (no credentials, no billing), with a production-shaped HTTP MCP server, a project skill and a project agent.
- Pinned SDK 0.3.280 (P-3, P-4) and latest SDK 0.3.281 (P-5): the approved options produce exactly the 10 built-ins + all MCP tools, with no agent listing. Forced `Agent`/`Task`/`Workflow`/`SendMessage`/`ListAgents` calls fail with "No such tool available"; the MCP `send_message_to` call executes; the skill is listed.
- The current config on 0.3.280/0.3.281 exposes 26 built-ins incl. `Agent`, `Workflow`, `SendMessage`, `ListAgents`. Forced `Agent`/`Workflow` calls launched real background work.
- Reusable probe: `probe-evidence/probe3.mjs`, `probe4.mjs`, `analyze2.py`. Usage is in `investigation-notes.md` § Runtime findings.
- Note: the user's shared checkout (`personal` @ `0f54978ba`) is 14 commits behind `origin/personal` and still has SDK 0.3.231. This worktree is based on `origin/personal` (0.3.280). Run `pnpm install` in the worktree before testing.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction`
- Branch: `codex/claude-sdk-builtin-tool-restriction`
- Base: `origin/personal` @ `9267d11c8e82f9798b3870362b221edf39d3d7df`
- Finalization target: `origin/personal`
- Ticket folder: `tickets/in-progress/claude-sdk-builtin-tool-restriction/` (the documents are not yet committed)

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/solution-revision-record.md`
- Probe evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/probe-evidence/`
- Architecture review report: `N/A — not applicable` (direct route)

## Open Risks

- R-001: future SDK tool renames. Re-run the probe on SDK upgrades.
- ASM-001 (accepted by the user): static Bash/Glob/Grep/Skill description text still mentions "the Agent tool"/"subagent".

## Next Expected Action

Implementation Engineer implements per the design spec, runs the implementation-scoped checks and continues the team workflow.

## Routing Record

- `get_handoff_rules` returned three rules. The matching rule is "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/implementation_engineer`.
