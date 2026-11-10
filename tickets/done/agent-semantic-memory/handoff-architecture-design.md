# Handoff — Architecture Design Complete (agent-semantic-memory)

- Package: `agent-semantic-memory`; Project Task `autobyteus-12` (Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`), requested by `/project_task_manager` on the user's direction.
- Result: `Architecture Design Complete`, current revision `SR-004` (sent at SR-003; SR-004 added the prompt contract before the review result).
- Classification: task_size `Large`, architectural_risk `High` (shared contracts `agent-config.json`, `personal-settings.json`, GraphQL `AgentDefinition`; Codex/Claude write-access boundary; all runtimes' instructions). Evidence: `design-spec.md` § Task Size And Architectural Risk.
- Route: independent architecture review (`/software_engineering_team/architecture_reviewer`), by the handoff rule for Large or High.

## Original request and goals

Give agents semantic memory: an optional per-agent, system-owned private folder outside every Project workspace and package, told to every run of the agent in its instructions, shared by all its runs (any Project, team, delegation); documents organized by the agent and its skills. Done when merged on `personal` and verified: path in instructions, write from Project A, read from Project B and as a team member; agents without it unchanged; follow-ups recorded. No release.

## Approval basis

- Requirements approved by the User on 2026-11-10 in the Solution Designer conversation (SR-002): location `<data-dir>/memory/semantic/<agent>/`; run folders not renamed; minimal instruction section (path, ownership, reusable knowledge goes there, organization up to the agent/skills); no history; switch + path in the app; no Memory page/search.
- SR-003: REQ-002 refined and DEC-012 added by the Solution Designer within the direction (the app's switch is a personal setting for package/built-in agents), user informed.

## Design summary

- New owner `AgentSemanticMemory` (`agent-memory/services/agent-semantic-memory.ts`): `folderOf(definition)` (pure) and `prepareForRun(definition)` (mkdir). Folder name from `AgentMemoryLayout`: `memory/semantic/<encodeURIComponent(definitionId)>`.
- Composer requires `semanticMemoryPath: string | null`; renders `## Semantic Memory` after the Project section.
- Backends (AutoByteus, Codex, Claude, ACP = Grok + DeepSeek harness, Antigravity) call `prepareForRun` once per create/restore and pass the path to the composer.
- Write access: Codex — `sandbox_workspace_write.writable_roots` (reproduced need and fix: investigation AF-01/AF-02), one builder owns the whole `sandbox_workspace_write` object (integration builder no longer emits it); Claude — SDK `additionalDirectories`; AutoByteus, Grok, Antigravity — no change needed; DeepSeek harness — sandbox-escalation approval (FU-007).
- Setting `semanticMemoryEnabled`: `agent-config.json` (written only when true), domain, both readers, GraphQL (+ computed `semanticMemoryPath`), fifth personal setting `SEMANTIC_MEMORY`, web field component + detail line.
- No migration (optional fields). `agent-definition-service.ts` helpers extracted to stay ≤500 lines.

## Artifacts (absolute paths)

- `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/requirements-doc.md`
- `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/investigation-notes.md`
- `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/design-spec.md`
- `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/solution-revision-record.md`
- `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/follow-ups.md` (FU-001..FU-009)

## Workspace

- Worktree `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory`, branch `codex/agent-semantic-memory`, base `origin/personal` at `f78b60ddd`; finalization target `origin/personal`.

## Open risks

- Codex app-server honoring `writable_roots` in thread `config` is shown with the Codex CLI sandbox, to be confirmed in real-runtime E2E (use a data dir outside `/tmp`, AF-03).
- DeepSeek harness not installed here (FU-007).

## Expected next action

Architecture review of the package. Findings: requirement/design/unclear → Solution Designer; Pass → implementation per the reviewer's route.

## Route Applied

- 2026-11-10: handoff rule "task_size=Large or architectural_risk=High" matched; sent to `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_10c7315fd51048c3873b8b6fffa6924c`), delivered.
- 2026-11-10: architecture review `ARCH-REV-001` Pass on SR-004, no findings (`design-review-report.md`); the reviewer routed the package to `/software_engineering_team/implementation_engineer`. Recorded only; no forwarding by the Solution Designer.
