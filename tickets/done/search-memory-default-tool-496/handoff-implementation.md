# Handoff: Architecture Design Complete (SR-004), direct implementation: search-memory-default-tool-496

- Package: `search-memory-default-tool-496`; Project Task `autobyteus-496`, requested by `/project_task_manager`. The user revised it directly on 2026-11-17.
- Status: `Architecture Design Complete`, SR-004. Requirements `Approved` by the user (his words are quoted in requirements-doc.md).
- Classification: `task_size=Small`, `architectural_risk=Low` → direct implementation (handoff rule: Small/Medium and Low). Implementation self-checks and API/E2E validation still apply.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-memory-default-tool-496`, branch `codex/search-memory-default-tool-496`, base `origin/personal` @ `a781007713`; finalization target `origin/personal`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-memory-default-tool-496/tickets/in-progress/search-memory-default-tool-496/`

## What changed

- The SR-003 package (own-definition scope, filtered search, native exposure holder, `memorySearchEnabled` switch) is **withdrawn**. Do not implement it, and drop any code written for it.
- The user's decision: keep it simple and give every agent the tool; privacy is deferred to later memory-scope work (FU-001, FU-004).

## The work

- In `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts`, `buildRuntimeAgentToolExposure` adds `search_memory` (`SEARCH_MEMORY_TOOL_NAME`) to `requestedToolNames` for every run, deduplicated. Nothing else changes in production code.
- Update the tests that assert exact exposure names (7 files; see the design's Evidence).
- Add tests for AC-001 to AC-003:
  - exposure for a definition with and without the tool;
  - native tool instance;
  - MCP `tools/list`;
  - the restore notice.
- Docs: `memory_search.md` (Entry Points) and `agent_tools_mcp_server.md` (effective set).
- Real-runtime check AC-004 is API/E2E's.

## Documents

- `requirements-doc.md`, `design-spec.md`, `investigation-notes.md`, `solution-revision-record.md`, `follow-ups.md`

## Route record

- `get_handoff_rules` → rule "Small or Medium and Low" → `/software_engineering_team/implementation_engineer`
