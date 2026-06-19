# Docs Sync Report

## Scope

- Ticket: `mcp-tool-exposure-docker`
- Trigger: Delivery-stage docs sync after API/E2E pass for MCP/browser tool exposure cleanup.
- Bootstrap base reference: `origin/personal` at `39449cfb9307c5dddcf24bc4c9710ccc8d8baf72` from `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/investigation-notes.md`.
- Integrated base reference used for docs sync: `origin/personal` at `79857c513dd6d6e25c4b7761cb5aa0d3a805c227` after `git fetch --prune origin` on 2026-06-18.
- Post-integration verification reference: ticket branch merge commit `a3791dc947f8e81f7e47fceca35b55abf0946772`; post-merge focused checks listed in the delivery report passed before docs edits started.

## Why Docs Were Updated

- Summary: Delivery found stale long-lived server/browser docs that still described remote host-browser bridge pairing and overly broad Agent Tools MCP collision behavior. Those docs were updated to match the integrated implementation: embedded Electron browser tools are env-bridge-only, Docker/remote browser automation comes from configured MCP-origin tools such as BrowserServer MCP, and Agent Tools MCP sessions snapshot source-aware routes with adapter-defined collision policy.
- Why this should live in long-lived project docs: Future implementers need the source ownership model, route/collision policy, and Docker-vs-Electron browser behavior outside ticket-local artifacts so new browser/MCP/runtime work does not reintroduce remote host pairing or inactive static-name reservation.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Canonical server module overview for browser-tool runtime gating and Agent Tools MCP projection. | `Updated` | Removed remote runtime browser registration guidance and documented MCP-origin Docker/remote browser path plus route/collision policy. |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Canonical Agent Tools MCP server lifecycle/source-boundary document. | `Updated` | Documented per-session route table, `static_adapter` vs `configured_mcp_tool`, protected adapter collisions, and browser configured-MCP precedence. |
| `autobyteus-web/docs/browser_sessions.md` | User/runtime-facing browser session ownership and runtime adapter notes. | `Updated` | Clarified Docker/remote BrowserServer MCP does not require the host Electron browser bridge and is selected as configured MCP-origin routes. |
| `autobyteus-web/docs/tools_and_mcp.md` | Frontend MCP management docs already describe MCP-origin registered names through Agent Tools MCP. | `No change` | Existing guidance remains accurate after the route-backed implementation. |
| `docs/future-tickets/mobile-backend-authorization-hardening.md` | Implementation touched this future-ticket doc to remove obsolete host-browser-pairing wording. | `No change` | Current wording about high-risk browser automation bridge/configuration capability remains valid for future mobile least-privilege authorization. |
| `autobyteus-web/docs/remote_access.md` | Search hit browser/mobile unsupported notes while checking for stale remote browser pairing guidance. | `No change` | Phone Access/mobile browser unsupported guidance is unrelated and still accurate. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Runtime/source model correction | Replaced remote in-memory browser registration guidance with two-source model: env-injected embedded Electron bridge vs configured MCP-origin Docker/remote browser tools. Added source-aware route/collision notes. | Prevents future work from treating remote host-browser pairing as an active product path. |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Agent Tools MCP source-boundary update | Documented per-session route snapshots, configured MCP eligibility, protected static collisions, browser `prefer_configured_mcp`, and `tools/list`/`tools/call` source consistency. | Captures the durable design invariant that fixed Docker BrowserServer MCP tool exposure. |
| `autobyteus-web/docs/browser_sessions.md` | Runtime adapter note update | Clarified Codex/Claude embedded browser tools require the Browser bridge while Docker/remote BrowserServer MCP tools route as configured MCP-origin tools. | Keeps browser session docs aligned with removed host pairing and configured MCP browser behavior. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Docker/remote browser source ownership | Docker and remote nodes do not pair back to the host Electron browser; they use configured MCP-origin browser tools inside the node/container or expose no browser tools. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/agent_tools.md`, `autobyteus-web/docs/browser_sessions.md` |
| Agent Tools MCP route table | Each Agent Tools MCP session stores one source-aware route per enabled wire tool so descriptor `enabledTools`, `tools/list`, and `tools/call` agree. | `design-spec.md`, `implementation-handoff.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |
| Collision policy | Protected first-party platform/control adapters block configured MCP collisions, but browser static adapters prefer configured MCP-origin overlaps such as BrowserServer `open_tab`. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/agent_tools.md`, `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Remote “Pair local browser” / runtime host-browser bridge registration for Docker/remote nodes | Configured MCP-origin browser tools inside the node/container, e.g. BrowserServer MCP, or no browser tools | `autobyteus-server-ts/docs/modules/agent_tools.md`, `autobyteus-web/docs/browser_sessions.md` |
| Global static adapter name reservation that suppressed configured MCP browser names | Per-session source-aware route table with adapter-defined collision policy | `autobyteus-server-ts/docs/modules/agent_tools.md`, `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |
| Runtime docs implying all browser tools require host Browser bridge support | Split docs: embedded Electron browser tools require bridge env vars; configured MCP-origin BrowserServer tools do not | `autobyteus-web/docs/browser_sessions.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

N/A — docs changes were needed and completed.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Long-lived docs now match the integrated, reviewed, and validated implementation state. Delivery can proceed to final handoff/user-verification hold. Repository finalization, push/merge, ticket archival, release, deployment, and cleanup remain blocked until explicit user verification/finalization instruction.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

N/A.
