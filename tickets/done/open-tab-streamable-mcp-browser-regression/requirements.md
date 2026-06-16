# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

When an agent calls the `open_tab` in-app browser MCP tool from the Electron app built from the `codex/streamable-mcp-runtime-tools` worktree, the tool returns success and a `tab_id`, but the right-side Browser panel remains empty and does not show the opened URL. The same symptom occurs from a software-engineering team coordinator member and from the Daily Assistant. The target behavior is that successful browser tool calls open or update the visible in-app Browser surface.

## Investigation Findings

Initial user-provided screenshots show tool calls succeeding (`open_tab · https://example.com`, `open_tab · https://www.google.com`) while the Browser tab still displays the empty-state text: "Open a URL to start browsing in the Browser tab." Persisted raw traces confirm that `open_tab` returns an MCP content envelope containing JSON text with `tab_id`, rather than a canonical direct browser result object. A direct `list_tabs` probe confirms Electron browser sessions were created, so the failure is in result canonicalization / Browser-shell focus triggering, not browser session creation.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant with a boundary/ownership aspect.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, narrowly, to share/centralize known-browser-tool MCP result normalization between runtime converters instead of moving MCP parsing into the renderer.
- Evidence basis: User screenshots; raw traces where `open_tab` success result is `{ content: [{ type: "text", text: "{ ... tab_id ... }" }], structuredContent: null, _meta: null }`; direct `list_tabs` probe showing browser sessions exist; frontend handler only accepts direct `{ tab_id }` or JSON-string result.
- Requirement or scope impact: Requirements must enforce canonical browser event result shape before renderer focus handling, not merely successful MCP tool execution.

## Recommendations

Fix the server-side Agent Tools MCP event conversion so known browser tool success events expose canonical browser result objects with direct `tab_id`. Reuse/extract the existing Claude-style MCP content-envelope parser for Codex rather than teaching the renderer to own runtime-specific MCP envelopes.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A focused single-agent run calls `open_tab`; the Browser panel opens or updates to that URL.
- UC-002: A software-engineering team member run calls `open_tab`; the team-member-scoped Browser panel opens or updates to that URL.
- UC-003: Reusing an existing tab by normalized URL still updates/reflects visible browser state.

## Out of Scope

- General browser rendering fixes unrelated to MCP-triggered tab creation.
- Redesigning the whole in-app browser UX.
- Changing the semantics of unrelated MCP tools.

## Functional Requirements

- REQ-001: A successful `open_tab` MCP call must create or reuse a browser tab in the backend browser/session state and stream a canonical `TOOL_EXECUTION_SUCCEEDED` payload whose `result.tab_id` is directly available to renderer Browser focus handling.
- REQ-002: The Streamable MCP refactor must preserve the same browser tool side effects that existed on the original personal branch, including canonical browser result shapes before frontend routing/focus code runs.
- REQ-003: `open_tab` success responses must not be reported as fully successful if the request cannot be associated with a browser surface context required for UI synchronization.
- REQ-004: The fix must work for both single-agent and agent-team member tool calls.

## Acceptance Criteria

- AC-001: Calling `open_tab` with `https://example.com` from a Daily Assistant run emits `TOOL_EXECUTION_SUCCEEDED` with `tool_name: "open_tab"` and direct `result.tab_id`, then results in the visible Browser tab displaying `https://example.com/` or a loaded browser surface for that URL.
- AC-002: Calling `open_tab` with `https://example.com` from `solution_designer` in a software-engineering team run emits canonical direct `result.tab_id`, then results in that team member's visible Browser tab displaying `https://example.com/` or a loaded browser surface for that URL.
- AC-003: When `reuse_existing=true`, the tool may return `status: reused`, but the Browser panel still reflects/selects the reused tab for the active run/member context.
- AC-004: If a call lacks the required run/session/browser-surface context, the implementation logs and/or returns a diagnostic error instead of silently returning success while no UI update can occur.

## Constraints / Dependencies

- The application is currently an Electron build from `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools` on branch `codex/streamable-mcp-runtime-tools`.
- The branch refactors server-side agent tools to Streamable MCP.
- Need preserve the in-app browser tool contract exposed by `mcp__autobyteus_agent_tools.open_tab`.

## Assumptions

- The screenshots accurately represent the regression in the Electron UI.
- The original `personal` branch did update the visible Browser panel on the same user action.

## Risks / Open Questions

- The regression may span backend MCP session context, event publication, and frontend subscription/routing.
- The current tool may create browser state under a global or wrong session identifier, making it invisible to the active run UI.
- Need verify whether the backend state changes at all or only the frontend event path is broken.

## Requirement-To-Use-Case Coverage

- REQ-001 covers UC-001, UC-002, UC-003.
- REQ-002 covers UC-001 and UC-002.
- REQ-003 covers diagnostic handling across all use cases.
- REQ-004 covers UC-001 and UC-002.

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates the single-agent visible side effect.
- AC-002 validates the team-member visible side effect.
- AC-003 validates tab reuse visibility.
- AC-004 validates failure-mode observability.

## Approval Status

Approved by user on 2026-06-16 via instruction: "since you found the problem, then kick off the task".
