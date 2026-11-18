# Handoff — Architecture Design Complete, SR-015 (autobyteus-32, Model Router core), review round 2

- Package: `delegated-runtime-model-routing`, Project Task **autobyteus-32** in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- From: Solution Designer (run `solution_designer_ab383b2a28394f6ba52dde1f7083f5bd`); To: Architecture Reviewer (run `architecture_reviewer_0fda00a36595499d940b4fb4017ee06f`)
- Date: 2026-10-26; Solution revision **SR-015**, answering **ARCH-REV-001** (Fail, Design Impact: AR-001, AR-002); the SR-014 handoff (`handoff-architecture-review-router-sr014.md`) still holds for everything not listed here
- Classification: `Architecture Design Complete`, task_size **Large**, architectural_risk **High** (unchanged)
- Task re-read with `get_project_task` 2026-10-26: no new comments. **Done-when** (carry forward): "…covered by tests, and the user has verified it in the desktop app."

## Resolution of ARCH-REV-001

| Finding | Resolution | Where |
| --- | --- | --- |
| AR-001 (High) router run becomes a collaboration member | `AgentRunMetadata.systemRunOwner: "model_router"`, set only by `ModelRouterAgent` at creation, kept on restore; `isCollaborationEligibleStandaloneRun` returns false for it, so no member context and no automatic collaboration tools; Agent Tools MCP still serves it (`kind: "agent"`). Test per runtime: tools = template list + the runtime's file tools. REQ-004 and AC-011 state it. | design-spec Ownership Map, Interface Boundary Mapping, Persisted Data, File Mapping, Guidance; requirements REQ-004, AC-011 |
| AR-002 (Medium) Claude write confinement bypassed by settings allow rules | Verified wider (A-32): project/local settings come from the router's own writable workspace (allow rules and hooks). Confined Claude runs: setting sources `["user"]` only; shell tools in `disallowedTools` (bare names remove them); a programmatic `PreToolUse` hook denies Write/Edit/MultiEdit/NotebookEdit outside the workspace root — hooks run before every other step and a hook deny applies even in `bypassPermissions` (Claude Agent SDK permissions doc, quoted in A-32). Owner: Claude session tooling from `toolConfinement`. Live check with a user-level allow rule for Write and a workspace `.claude/settings.json`. Codex live check adds a workspace `.codex/config.toml`. | design-spec Ownership Map (confinement), File Mapping, Guidance; AC-011 |
| Residual: B records before the work packet | B keeps the records with the prepared run and writes them when A's work packet arrives; an abandoned start leaves no record | design-spec DS-002 chain and narrative |
| Residual: Codex temp roots | Stated for the module doc | Ownership Map |
| Residual: FU-002 ≤ 60 s | Now ≤ 40 s | follow-ups.md |

## Also changed (user, 2026-10-26)

The user asked that "conversation" not be used: the product says agent and agent run everywhere. One owner `ModelRouterAgent` (`model-routing/services/model-router-agent.ts`: the agent's run — ensure/restore/create —, its workspace, knowledge read) replaces `ModelRouterRun` and `ModelRouterWorkspace`; state file `model-router-agent.json`; GraphQL `openModelRouterAgent` (the UI reference's mock name is not normative), status `agentRunId`. Requirements, supplement and design use "the Model Router agent" throughout.

Design case added: `docs/design-cases.md` Case 9 (a new kind of run classified by a rule it never met).

## Artifacts (absolute paths)

- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/requirements-doc.md (SR-015)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/launch-selection-order.md (SR-015)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/investigation-notes.md (A-01…A-32)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/design-spec.md (SR-015; previous `history/design-spec-sr014.md`)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/solution-revision-record.md (SR-015)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/follow-ups.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/docs/design-cases.md (Case 9)
- UI/UX specification (linked, Product-owned): /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-runtime-model-routing/ui-ux-spec.md

## Workspace and constraints

Unchanged from the SR-014 handoff (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing`, branch `codex/delegated-runtime-model-routing`, base `origin/personal` `d74f75a51a`; documents uncommitted; test vault only; no release unless asked; the user's desktop check is part of Done-when).

## Next expected action

Architecture review round 2; on Pass, the reviewer's route to implementation.

## Route taken

- 2026-10-26: rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
