# Investigation Notes

## Investigation Meta

- Package identifier: `claude-sdk-builtin-tool-restriction`
- Request / ticket: Disable Claude Agent SDK native subagent / multi-agent tools in the AutoByteus Claude runtime.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction` on `codex/claude-sdk-builtin-tool-restriction`
- Resolved base remote / branch / revision: `origin/personal` @ `9267d11c8e82f9798b3870362b221edf39d3d7df` (fetched 2026-09-24)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree created from the fresh `origin/personal`. The shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` (branch `personal` @ `0f54978ba`, dirty) was only read, never written.
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Investigation status: Complete

## Initial Request And Clarifications

- Original request: "currently our server support claude agent sdk, but i dont want to use their subagent functionality … we support task tools, which are our own subagent tools. could you check whether claude agent sdk support disable certain internal tools?"
- Clarifications received (2026-09-24, in conversation):
  - Goal: "claude code does not even know there is such a tool".
  - The user agreed that `Workflow` and `SendMessage` are not needed because AutoByteus has its own equivalents.
  - The user reviewed and approved the explicit list `tools: [Bash, Read, Edit, Write, Glob, Grep, NotebookEdit, WebFetch, WebSearch, Skill]` plus `disallowedTools: [AskUserQuestion, Agent, Task, Workflow, SendMessage]`, after explanations of `NotebookEdit`, the `TaskCreate/Get/List/Update` to-do tools (not subagents; excluded) and `Cron*`/`ScheduleWakeup` (not subagents; excluded).
- User-supplied facts and constraints: AutoByteus task tools (`delegate_task`) are the intended subagent mechanism.
- Initial ambiguity: None remaining.

## Product And Domain Understanding

- Product area: `autobyteus-server-ts` Claude Agent SDK runtime backend.
- Affected actors or systems: Claude-runtime agents and team members.
- Relevant terminology: "built-in tools" = Claude Code's native tools. "AutoByteus MCP tools" = `mcp__autobyteus_agent_tools__*`, served over HTTP MCP.

## Source Log

| Date | Type | Exact Source / Command | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-24 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` (base L102, L405-440) | Where SDK options are built | `buildQueryOptions` passes `disallowedTools: [...CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS]` (=`["AskUserQuestion"]`) and no `tools`. The model-discovery query (L245-252) passes `tools: []`. | Design owner |
| 2026-09-24 | Code | `src/agent-execution/backends/claude/session/claude-session.ts` L374-432; `claude-session-tooling-options.ts` | Session → client path | The session passes `allowedTools` (Skill + AutoByteus tool names, bare and `mcp__` form), `mcpServers`, `canUseTool` and a string `systemPrompt` | Preserve |
| 2026-09-24 | Code | `agent-tools-mcp/claude-agent-tools-mcp-materializer.ts` | MCP transport | AutoByteus tools are served as `type: "http"` MCP server `autobyteus_agent_tools` | Probe mirrors HTTP MCP |
| 2026-09-24 | Code | `claude-workspace-skill-materializer.ts` | Skills | Skills are materialized into `<workspace>/.claude/skills` | Probe includes a skill |
| 2026-09-24 | Code | `src/runtime-management/claude/client/claude-sdk-setting-sources.ts` | Settings | Runtime loads `user`, `project`, `local` settings, so project `.claude/agents/*` are loaded | Probe includes a project agent |
| 2026-09-24 | Code | `src/agent-execution/events/processors/file-change/file-change-tool-semantics.ts` L29-37; `file-change-event-payload-accessors.ts` L43-45 | Built-ins that the server special-cases | Only `Write`, `Edit`, `MultiEdit`, `NotebookEdit` (via `notebook_path`) and `Skill` are special-cased. Grep of server + web found no handling for `TaskCreate`, `Cron*`, plan/worktree, `TaskOutput`/`TaskStop`. | Safe to exclude those |
| 2026-09-24 | Code | `tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` L126, L204, L219 | Existing contract tests | Asserts `disallowedTools: ["AskUserQuestion"]` and `not.toHaveProperty("tools")` | Must be updated |
| 2026-09-24 | Doc | `autobyteus-server-ts/docs/modules/agent_execution.md` L438-446 | Docs | States "Do not replace this default with a Claude SDK `tools` allowlist…" | Must be rewritten (REQ-006) |
| 2026-09-24 | Doc | `tickets/done/claude-ask-user-question-disallow/requirements.md` L15, L46, L60; `design-spec.md` L18, L180 | Prior decision | Rejected a `tools` allowlist because of the risk of omitting wanted built-ins, scoped "to solve this ticket" | Superseded by user decision (DEC-004) |
| 2026-09-24 | Contract | SDK `sdk.d.ts` (`Options.tools`, `disallowedTools`, `allowedTools`, `toolAliases`) | Capability | `tools` = base built-in set (`[]` disables all). `disallowedTools` = "removed from the model's context and cannot be used" and also blocks harness-internal calls. `allowedTools` = auto-approve only. | Basis for design |
| 2026-09-24 | Contract | `autobyteus-server-ts/package.json` (base) | Pinned SDK | `@anthropic-ai/claude-agent-sdk` `0.3.280` (Claude Code 2.1.280). The shared checkout has 0.3.231. | Probe both |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Any Claude turn | `ClaudeSession.executeTurn` → `ClaudeSdkClient.startQueryTurn` → `buildQueryOptions` → SDK `query()` → Claude Code CLI → Messages API | Default preset built-ins minus `AskUserQuestion` | P-2, P-3 | High |
| BEH-002 | Contract | Same | Claude Code injects an agent-type listing reminder when `Agent` is available | Listing includes project agents | P-2, P-3 | High |
| BEH-003 | System | Model emits a native multi-agent `tool_use` | Claude Code executes it | Real background agent/workflow launched | P-3 | High |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Design Implication |
| --- | --- | --- | --- |
| `ClaudeSdkClient.buildQueryOptions` | Single builder of normal-turn SDK options | One place to add `tools` | Extend the local constants here |
| `ClaudeSdkClient.resolveContextCapacities` | Model-discovery probe with `tools: []` | Out of scope | Leave untouched |
| `ClaudeSessionToolingOptions.allowedTools` | Pre-approval of Skill + AutoByteus tools | Preserve | No change |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Two constant string arrays; one docs paragraph.

### Structural Surfaces

- `ClaudeSdkClient.buildQueryOptions` option object (provider launch contract). No shared types, APIs, persistence or routes are involved.

### Potential Structural Impacts To Investigate

- API or external-contract change: No (internal provider option only).
- Persistence: No.
- Security/privacy: Reduces tool surface; no new exposure.
- Concurrency/lifecycle: No.
- Deployment/ownership: No.
- Confirmed absent.

## Runtime, Probe, Or Reproduction Findings

Probe method: a Node script drives the real SDK `query()` and bundled Claude Code CLI. It sets `ANTHROPIC_BASE_URL` to a local fake Messages API with a dummy API key, so no credentials are used and nothing is billed. It also runs a local HTTP MCP server named `autobyteus_agent_tools` exposing `send_message_to`, `delegate_task`, `get_handoff_rules`, with production-shaped `allowedTools`, `settingSources: [user, project, local]`, a string `systemPrompt` and an allow-all `canUseTool`. The probe workspace has a project agent (`.claude/agents/reviewer.md`) and a project skill (`.claude/skills/probe-skill`). The fake API captures every request. In turn 1 it answers with forced `tool_use` blocks and records the resulting `tool_result`s. The fake API ignores user settings; the probe only reads them.

| ID | Method | Scenario | Observation | Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| P-1 | Early probe (`/tmp/claude-tool-probe/probe.mjs`, SDK 0.3.231) | disallow list variants | Blocking `Agent`+`Task` removes `Agent` and the agent listing, but `Workflow`/`SendMessage` remain. Explicit `tools` list works. | Each multi-agent tool must be named, or use an explicit list | conversation record |
| P-2 | `probe-evidence/probe2.mjs`, SDK 0.3.231 | current vs approved | Current: 26 built-ins incl. `Agent`, `Workflow`, `SendMessage`, `TaskOutput`; agent listing present; forced `Agent`/`Workflow` launched real work. Approved: exactly 10 built-ins + 3 MCP tools; no agent listing; forced calls error; MCP call executed; skill listed. | Plan correct on 0.3.231 | `probe-evidence/v2-*.json`, `probe-summary-sdk-0.3.231.txt` |
| P-3 | `probe-evidence/probe3.mjs` with SDK 0.3.280 (`/tmp/sdk280`) | current vs approved on the pinned SDK | Current adds new `ListAgents` built-in (`TaskOutput` gone). Approved: identical clean result as P-2. | The explicit list excluded `ListAgents` automatically, which confirms DEC-001 | `probe-evidence/v280-current.json`, `v280-approved.json`, `probe-summary-sdk-0.3.280.txt` |
| P-4 | `probe-evidence/probe4.mjs`, SDK 0.3.280, safety net incl. `ListAgents` | forced legacy `Task`, `ListAgents`, plus `Read` control | `Task` and `ListAgents` → "No such tool available … disabled for this session, in subagents as well as here". `Read` works. | REQ-002 and REQ-003 verified | `probe-evidence/v280-approved-aliases.json` |
| P-5 | `probe3.mjs` / `probe4.mjs` with SDK 0.3.281 (latest on npm 2026-09-24; `/tmp/sdk281`) | current vs approved; forced `Agent`, `Task`, `Workflow`, `SendMessage`, `ListAgents`, MCP `send_message_to` | The built-in set in the current config is the same as 0.3.280. Approved: 10 built-ins + 3 MCP tools, no agent listing. All 5 native multi-agent calls error; the MCP call executes. | The plan also holds on the next SDK release | `probe-evidence/v281-*.json`, `probe-summary-sdk-0.3.281.txt` |

Version note: the user's shared checkout (`personal` @ `0f54978ba`) is 14 commits behind `origin/personal` and still has SDK 0.3.231 committed and installed. The upgrade to 0.3.280 is commit `704e2108e`. P-1/P-2 used that stale install. P-3..P-5 used the pinned 0.3.280 and the latest 0.3.281, and they are the authoritative evidence.

Residual text on the approved config, which cannot be changed through SDK options: the `Bash`, `Glob` and `Grep` descriptions mention "the Agent tool", and the `Skill` description mentions "subagent". The system prompt and messages are clean (ASM-001).

To reproduce:
```
cd <ticket>/probe-evidence
PROBE_NM=<node_modules containing @anthropic-ai/claude-agent-sdk, @modelcontextprotocol/sdk, zod> node probe3.mjs <label> '<extra options JSON>'
python3 analyze2.py <label>
```
The probe expects its workspace at `/tmp/claude-tool-probe/ws`, containing `.claude/agents/reviewer.md` and `.claude/skills/probe-skill/SKILL.md`. It writes a transcript under `~/.claude/projects/-private-tmp-claude-tool-probe-ws`; delete that afterwards.

## Stakeholder And User Evidence

| Source | Need | Strength | Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (conversation 2026-09-24) | No Claude-native subagents; AutoByteus task tools are the mechanism | Explicit | REQ-001..003 | None |

## External Contracts, Standards, And Dependencies

| Contract | Version | Behavior | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Claude Agent SDK | 0.3.280 / Claude Code 2.1.280 | `tools`, `disallowedTools` semantics as above | sdk.d.ts; P-3, P-4 | Tool renames across SDK upgrades |

## Persisted Data And State Facts

- Not affected. The change affects per-turn provider launch options only.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

- N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | REQ / AC | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `probe-evidence/probe2.mjs`, `probe3.mjs`, `probe4.mjs`, `analyze2.py` | Solution Designer | Reproducible credential-free probe | AC-003..005 | REQ-001..005 | Current | Evidence only |
| `probe-evidence/*.json`, `probe-summary-*.txt` | Solution Designer | Captured requests/results | Same | Same | Current | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| R-001 | Risk | Future SDK versions may rename built-ins (e.g. `Grep` behavior on native builds, `Task`→`Agent`) | A renamed tool silently disappears from the list | Re-run the probe on SDK upgrades; docs note | Open (accepted) |
| ASM-001 | Assumption | Residual static description text is acceptable | Cannot be edited | User informed | Accepted |

## Architecture Investigation Findings

- There is a single owner for normal-turn options: `ClaudeSdkClient.buildQueryOptions`. It already holds the built-in policy constant, so the change is local.
- `tools` does not filter MCP tools (P-2/P-3: all 3 MCP tools present).
- `Skill` must be in `tools` for skills to work. The probe shows skill listing works when it is listed.
- `Glob`/`Grep` must be listed explicitly: native builds omit them from the default preset (sdk.d.ts note, and absent from the P-2/P-3 current config).
- `settingSources` still loads project agents (visible in `init.agents`), but with `Agent` unavailable no listing reaches the model (P-2/P-3).

## Requirement Implications

- The explicit list is justified by P-3 (`ListAgents` appeared between SDK versions).
- `ListAgents` is added to the safety net (DEC-003).

## Notes For Architecture Design

- Scenarios: SCN-001, SCN-002.
- Change `claude-sdk-client.ts` constants and `buildQueryOptions`. Update the three unit assertions and the docs paragraph.
