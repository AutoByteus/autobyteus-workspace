# Implementation Handoff — claude-sdk-builtin-tool-restriction

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct implementation route (Small + Low). Independent architecture review not selected.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/design-spec.md`
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/probe-evidence/` (the solution probes and the implementation probe outputs `impl-*`, `probe-summary-implementation-sdk-0.3.280.txt`)
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/solution-handoff.md`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

`ClaudeSdkClient.buildQueryOptions` now applies an explicit, product-constant built-in tool policy on every normal Claude turn:

- `tools: ["Bash","Read","Edit","Write","Glob","Grep","NotebookEdit","WebFetch","WebSearch","Skill"]` (`CLAUDE_BUILT_IN_TOOLS_ENABLED_BY_AUTOBYTEUS`)
- `disallowedTools: ["AskUserQuestion","Agent","Task","Workflow","SendMessage","ListAgents"]` (`CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS`)

Both constants are module-local and not exported. `ClaudeSdkStartQueryTurnOptions` is unchanged. Model discovery (`resolveContextCapacities` with `tools: []`, and `listModels` with no tools key) is untouched. `allowedTools`, `mcpServers`, `canUseTool`, `permissionMode`, `settingSources`, session/resume, env and `systemPrompt` handling are unchanged.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the change is one source file (+9 / −1 effective lines), one unit-test file and one docs paragraph, with no new modules, types, exports or call sites. None of the escalation triggers fired: (a) no server/web code depends on an excluded built-in (grep found no `Agent`/`Task`/`Workflow`/`ListAgents`/`TodoWrite`/plan-mode tool dependencies in `autobyteus-server-ts/src` or `autobyteus-web` beyond the new constants); (b) the real-CLI probe confirms that `tools` does not filter MCP tools or skills; (c) the pinned SDK (0.3.280) tool names match the list.
- Selected route: `Direct API/E2E` (subject to `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Yes`. I reviewed the diff against the design. It matches exactly, is local to the owner, emits only in `buildQueryOptions`, keeps the constants unexported, adds no toggle or fallback, and leaves no dead code.
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Explicit 10 built-ins + safety-net disallow list | `ClaudeSession.executeTurn → ClaudeSdkClient.startQueryTurn → buildQueryOptions` (`claude-sdk-client.ts`) emits `tools` + `disallowedTools` | Done. Unit tests assert exact arrays. The real CLI's `init.tools` and API tools = 10 built-ins + 3 MCP tools |
| BEH-002 | No agent listing in context | Follows from `Agent` being absent from `tools` | Probe: no agent/subagent mentions in the system prompt or messages; the project agent is not listed |
| BEH-003 | Forced native multi-agent calls error | Enforced by Claude Code | Probe: `Agent`, `Task`, `Workflow`, `SendMessage`, `ListAgents` → "No such tool available … disabled for this session" |
| BEH-004 | `AskUserQuestion` hidden | Still in the disallow list and not in `tools` | Unit assertion + probe (absent from tools) |
| BEH-005 | MCP/allowedTools/skills/model discovery preserved | No change to those fields; model discovery options untouched | Probe: MCP `send_message_to` executed, `Read` works, the skill is listed. Unit test: `allowedTools`/`mcpServers`/`settingSources` preserved. New AC-006 guard tests: `resolveContextCapacities` still passes `tools: []` / `mcpServers: {}` with no `disallowedTools` (no such unit test existed before); `listModels` options have no `tools`/`disallowedTools` |

## Key Files Or Areas

- `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`: the constants (around L102-110) and `tools` emission in `buildQueryOptions`
- `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`: `EXPECTED_ENABLED_BUILT_IN_TOOLS` / `EXPECTED_DISALLOWED_BUILT_IN_TOOLS`; exact assertions in the api-key-mode and query-options tests; model-discovery guards for `listModels` and a new `resolveContextCapacities` test (AC-006)
- `autobyteus-server-ts/docs/modules/agent_execution.md`: the policy paragraph was rewritten, and the superseded "do not use a `tools` allowlist" guidance was removed

## Important Assumptions

- ASM-001 (accepted by the user): the static description text of Bash/Glob/Grep ("Agent tool") and Skill ("subagent") still mentions agents. Confirmed in the probe; out of scope.

## Known Risks

- R-001: a future SDK rename of a listed built-in would silently drop it. Mitigations: the docs note, the code comment and the reusable probe.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the policy stayed inside the existing owner (`ClaudeSdkClient`) with no new boundary.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (no toggle or fallback to the default preset)
- Dead/obsolete code, tests and docs removed in scope: `Yes` (the `not.toHaveProperty("tools")` assertions and the superseded docs guidance)
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. `claude-sdk-client.ts` had 482 effective non-empty lines before the change and 491 after. The first draft (513, with one name per line and JSDoc) was compacted to stay under 500.
- Notes: the file is close to the 500-line limit; future additions there should consider a split.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes`
- Deviation: `None`

## Environment Or Dependency Notes

- The worktree needed `pnpm install`, then `pnpm prepare:shared` and `prisma generate` in `autobyteus-server-ts` before the unit suites could load. `prepare:shared` produced untracked `autobyteus-application-sdk-contracts/dist/` and `autobyteus-application-backend-sdk/dist/`. Those build outputs are not committed.
- The installed `@anthropic-ai/claude-agent-sdk` is `0.3.280` (pinned).

## Local Implementation Checks Run

- `claude-sdk-client.test.ts`: 18/18 pass.
- `pnpm exec vitest run tests/unit/runtime-management tests/unit/agent-execution/backends/claude`: 145 passed, 2 failed. Both failures also occur on the unchanged base with my changes stashed:
  - `claude-session.test.ts > switches an opened but unconfirmed first query to exact resume after interrupt` (3/3 runs). It does not exercise SDK query options.
  - `codex-app-server-client.test.ts > uses an explicitly supplied Codex environment without applying the governed-launcher policy`. This is the Codex runtime and unrelated.
- `pnpm exec tsc -p tsconfig.build.json --noEmit`: pass.
- `pnpm typecheck` (`tsconfig.json`): 748 errors, all `TS6059` (`tests/**` outside `rootDir`). That config issue already exists; there are 0 non-TS6059 errors.
- Implementation-scoped runtime sanity probe (credential-free, fake Messages API, real bundled Claude Code CLI, SDK 0.3.280). The `tools`/`disallowedTools` values came from the real `ClaudeSdkClient.startQueryTurn` → `buildQueryOptions` output (`probe-evidence/impl-build-query-options.json`), not hand-copied. Results are in `probe-evidence/probe-summary-implementation-sdk-0.3.280.txt` and `impl-v280-p3.json` / `impl-v280-p4.json`:
  - The init and API tool list is exactly the 10 built-ins + `mcp__autobyteus_agent_tools__{delegate_task,get_handoff_rules,send_message_to}`.
  - There are no agent/subagent mentions in the system prompt or messages, and the project agent is not listed. The project skill is listed.
  - Forced `Agent`/`Task`/`Workflow`/`SendMessage`/`ListAgents` calls → `is_error`, "No such tool available". Forced `Read` and MCP `send_message_to` succeed, and the MCP server recorded the call.
  - This is implementation self-validation only, not API/E2E sign-off. Probe transcripts under `~/.claude/projects/` were deleted afterwards.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. This is a backend-only change to provider launch options, with no rendered UI change.

## Downstream Coverage Hints / Suggested Scenarios

- Re-run `probe-evidence/probe3.mjs` / `probe4.mjs` with `PROBE_NM=<worktree>/autobyteus-server-ts/node_modules` and the options from `impl-build-query-options.json`. The fixture workspace must be at `/tmp/claude-tool-probe/ws` with `.claude/agents/reviewer.md` and `.claude/skills/probe-skill/SKILL.md`; see `investigation-notes.md` § Runtime findings.
- Team-run scenario: a Claude-runtime team member should still use AutoByteus `send_message_to` / `delegate_task` (MCP) and must not see or be able to invoke Claude's native `Agent`/`Workflow`/`SendMessage`.
- Resume scenario: an existing Claude session resumed after the change gets the new tool set on its next turn.
- Skills scenario: a workspace-materialized skill is still listed and invocable via `Skill`.
- Model discovery and context-capacity resolution still work (unchanged options).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent API/E2E validation of AC-001..AC-007 by `api_e2e_engineer`, including the scenarios above and, if feasible, the 0.3.281 re-check.
