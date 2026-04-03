# Docs Sync

## Scope

- Ticket: `electron-browser-tool-refactor`
- Trigger Stage: `9`
- Workflow state source: [workflow-state.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/workflow-state.md)

## Why Docs Were Updated

- Summary:
  - the old Preview-named durable documentation is now a Browser-named durable architecture doc, the refactor tightened the authoritative rule for optional tool exposure so `toolNames` controls browser tools and `send_message_to`, and the Browser shell UX is now documented as a permanent manually operable Browser surface
- Why this change matters to long-lived project understanding:
  - future work on browser capabilities, optional runtime tool exposure, agent bootstrap/session policy, and the desktop Browser shell UX needs one stable durable explanation outside the ticket folder

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| [browser_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/docs/browser_sessions.md) | canonical durable doc for the Electron-backed browser subsystem | Updated | reflects browser/tab naming, strict browser contract, shell-lease rules, popup/new-tab behavior, and validation expectations |
| [tools_and_mcp.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/docs/tools_and_mcp.md) | check whether the optional browser tool exposure policy needed a second durable home | No change | current ticket-specific browser/bootstrap policy is sufficiently documented in the browser architecture doc |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| [browser_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/docs/browser_sessions.md) | Architecture/runtime terminology and Browser shell UX update | documents the Browser tab surface, stable browser tool names, `tab_id`, strict typed contract, explicit shell leases, popup/new-tab behavior, permanent Browser shell visibility, manual Browser chrome, full-view behavior, Browser runtime-unavailable surfacing, and validation expectations | keep the durable doc truthful after the preview-to-browser rename, popup/browser behavior work, and the Browser shell UX expansion |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Browser naming and tool surface | the Electron-backed browser subsystem now uses browser/tab terminology (`open_tab`, `list_tabs`, `tab_id`, `Browser` UI) instead of Preview naming | [requirements.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/requirements.md), [proposed-design.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/proposed-design.md), [implementation.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/implementation.md) | [browser_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/docs/browser_sessions.md) |
| Optional tool exposure policy | configured optional tools are derived from `AgentDefinition.toolNames`, and browser/send-message exposure must follow one authoritative resolved decision | [proposed-design.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/proposed-design.md), [code-review.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/code-review.md) | [browser_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/docs/browser_sessions.md) |
| Claude authoritative boundary | Claude session owns the final exposure decision for prompt guidance, MCP projection, and `allowedTools`; lower transport layers consume resolved policy as data | [future-state-runtime-call-stack.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/future-state-runtime-call-stack.md), [code-review.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/code-review.md), [api-e2e-testing.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/api-e2e-testing.md) | [browser_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/docs/browser_sessions.md) |
| Browser shell UX | Browser is a permanent shell capability with manual open/navigate/refresh/close, full-view mode, and explicit runtime-unavailable error surfacing, all over the same native browser-session model | [requirements.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/requirements.md), [implementation.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/implementation.md), [code-review.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/code-review.md) | [browser_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/docs/browser_sessions.md) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Preview-named durable architecture wording | Browser/browser-tab durable architecture wording | [browser_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/docs/browser_sessions.md) |
| implicit runtime-specific optional tool normalization | one shared configured-tool exposure owner feeding runtime bootstrap/session owners | [browser_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/docs/browser_sessions.md) |
| prompt text advertising `send_message_to` independently of actual exposure | session-owned exposure-aware prompt guidance | [browser_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/docs/browser_sessions.md) |

## Final Result

- Result: `Updated`
- If `Blocked` because earlier-stage work is required, classification: `N/A`
- Required return path or unblock condition: `N/A`
- Follow-up needed:
  - Stage 10 handoff/finalization and user verification remain next.
