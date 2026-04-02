# Docs Sync

## Scope

- Ticket: `preview-session-multi-runtime-design`
- Trigger Stage: `9`
- Workflow state source: `tickets/done/preview-session-multi-runtime-design/workflow-state.md`

## Why Docs Were Updated

- Summary:
  - The preview feature is now a durable browser-like subsystem in the product, not a temporary experiment.
  - The final implementation uses shell-embedded `WebContentsView` sessions, a stable eight-tool preview surface, strict preview contracts, and explicit shell-lease ownership.
- Why this change matters to long-lived project understanding:
  - Future work on preview tools, Electron shell embedding, runtime adapter behavior, and session ownership needs one stable document outside the ticket folder.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web/docs/agent_execution_architecture.md` | check whether preview-session runtime ownership already had a durable architecture home | `No change` | existing doc is broader agent-execution architecture and does not already describe the Electron preview subsystem |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web/docs/tools_and_mcp.md` | check whether preview tools should live in the MCP/tooling doc | `No change` | this doc is focused on MCP server configuration and tool preview, not the Electron preview-session subsystem |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web/docs/preview_sessions.md` | add one durable home for preview-session architecture and runtime flow | `Updated` | new long-lived source of truth for the preview subsystem |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web/docs/preview_sessions.md` | `New architecture doc` | documented the stable eight-tool surface, ownership model, shell-lease rules, runtime flow, renderer projection model, runtime adapter notes, and validation expectations | future readers need one durable explanation of how preview sessions work after the final shell-tab implementation |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Preview tool surface | the stable agent-facing preview subsystem exposes exactly eight session-oriented tools | `requirements.md`, `proposed-design.md`, `implementation.md` | `/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web/docs/preview_sessions.md` |
| Ownership model | Electron main owns session lifecycle and shell projection; renderer owns only UI projection; server owns tool parsing/dispatch | `proposed-design.md`, `future-state-runtime-call-stack.md`, `code-review.md` | `/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web/docs/preview_sessions.md` |
| Shell lease behavior | preview sessions are app-global, but shell projection is an explicit non-stealable lease | `proposed-design.md`, `implementation.md`, `code-review.md` | `/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web/docs/preview_sessions.md` |
| Runtime flow | open/follow-up preview operations flow through the server preview boundary into Electron main and not through renderer-owned page state | `future-state-runtime-call-stack.md`, `api-e2e-testing.md` | `/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web/docs/preview_sessions.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| separate preview-window-first mental model | shell-embedded preview sessions backed by `WebContentsView` | `/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web/docs/preview_sessions.md` |
| hidden native contract widening for booleans/integers | strict typed preview contract with no widening | `/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web/docs/preview_sessions.md` |
| implicit cross-shell preview transfer | explicit shell-lease ownership in `PreviewShellController` | `/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web/docs/preview_sessions.md` |

## Final Result

- Result: `Updated`
- If `Blocked` because earlier-stage work is required, classification: `N/A`
- Required return path or unblock condition: `N/A`
- Follow-up needed:
  - Stage 10 handoff / ticket finalization remains next.
