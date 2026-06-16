# Docs Sync Report

## Scope

- Ticket: `agent-tools-mcp-session-lifetime`
- Trigger: Delivery-stage docs sync after post-API/E2E coverage-code re-review passed for owner-lifetime Agent Tools MCP sessions.
- Bootstrap base reference: `origin/codex/streamable-mcp-runtime-tools` at `c3cc4d0d49db1146c18a3c251518041ee233c512` (`c3cc4d0d49db`), recorded in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/bootstrap-handoff.md` and investigation notes.
- Integrated base reference used for docs sync: `origin/codex/streamable-mcp-runtime-tools` at `c3cc4d0d49db1146c18a3c251518041ee233c512` after delivery `git fetch origin --prune` on 2026-06-16; `HEAD`, remote base, and merge-base were identical, with ahead/behind `0 / 0` before delivery-owned edits.
- Post-integration verification reference: no base commits were integrated, so the API/E2E and code-review validation package remained current. Delivery hygiene checks passed: `git diff --check`; in-scope active-TTL leftover search over changed MCP/Claude/Codex source, tests, and updated long-lived docs returned no matches.

## Why Docs Were Updated

- Summary: Long-lived docs still described Agent Tools MCP sessions as having an expiry time and a default 12-hour TTL. They now describe the final reviewed behavior: active session validity is owner-lifetime and process-memory scoped, requiring registry presence, non-revoked state, and matching bearer auth; process restart/registry reset invalidates old descriptors; restored/resumed/new runtime owners must materialize fresh descriptors in the current process.
- Why this should live in long-lived project docs: Agent Tools MCP is shared infrastructure for Codex App Server, Claude Agent SDK, and future external-process runtimes. Future runtime/materializer, operations, and debugging readers need the durable lifetime/security contract outside ticket-local artifacts, especially because the removed fixed TTL was a cross-runtime failure mode.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Canonical module doc for Agent Tools MCP route, session registry, descriptor materialization, lifecycle, and security. | `Updated` | Replaced stale `expiry time` / default `12 hours` claims and Claude refresh-by-expiry wording with owner-lifetime memory/revoke/bearer semantics and restart/fresh-descriptor behavior. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Higher-level server-owned tool module summary that points readers to the Agent Tools MCP server contract. | `Updated` | Added concise owner-lifetime/process-memory validity summary so readers do not infer a TTL from `session-scoped`. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime execution doc references unified Agent Tools MCP descriptors for Codex and Claude. | `No change` | Existing text says runtime materializers create a live descriptor and does not mention fixed TTL, expiry refresh, or old descriptor reuse. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex runtime doc references thread-scoped Agent Tools MCP config and secret redaction. | `No change` | Existing text already says Codex materializes a live descriptor through `thread/start` / `thread/resume` and does not state old TTL behavior. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Shared `send_message_to` runtime projection doc references Agent Tools MCP descriptor use. | `No change` | Existing `expiry time` reference is for direct-message grants, not Agent Tools MCP sessions. Agent Tools MCP text remains accurate. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Memory doc references sanitized route-backed Agent Tools MCP lifecycle events. | `No change` | Existing text already says MCP session IDs and bearer/header details must not enter memory; no lifetime claim changed. |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Adjacent MCP module doc distinguishes imported external MCP servers from Agent Tools MCP. | `No change` | Existing pointer to Agent Tools MCP Server remains accurate after the canonical doc update. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Durable runtime/security contract update | Removed fixed active-session TTL wording; documented registry validity as process-memory presence + non-revoked state + matching bearer token; documented run/member revocation, restart old-descriptor denial, and fresh descriptor materialization for restored/resumed/new owners; changed Claude materialization from create/refresh-by-expiry to live descriptor reuse per `ClaudeSession`. | This is the canonical long-lived home for Agent Tools MCP session lifetime and route behavior. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Summary alignment update | Added a short owner-lifetime/process-memory validity summary and restart/fresh-descriptor note in the Server-Hosted Agent Tools MCP Server section. | This prevents readers of the top-level Agent Tools module from retaining the old TTL mental model before following the detailed doc link. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Owner-lifetime Agent Tools MCP validity | Active sessions do not expire by a fixed 12-hour wall clock. They are valid only while present in current process memory, not revoked, and bearer-token matched. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md`, `code-review-report.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/agent_tools.md` |
| Explicit lifecycle revocation | Run-scoped revocation occurs through `AgentRunManager` termination/unregister cleanup; mixed-member cleanup revokes member-run sessions and remains idempotent. | `design-spec.md`, `implementation-handoff.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |
| Memory-only restart semantics | Server/process restart or registry reset drops old sessions; old descriptors fail with redacted `404 session_unavailable`; restored/resumed/new owners must get fresh current-process descriptors. | `requirements-doc.md`, `design-spec.md`, `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/agent_tools.md` |
| Claude live descriptor cache | Claude reuses a private descriptor while the `ClaudeSession` object remains live and does not refresh solely because an expiry elapsed; new/restored sessions materialize fresh descriptors. | `design-spec.md`, `implementation-handoff.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |
| Bearer and redaction behavior preserved | Bearer `Authorization` remains mandatory for non-`OPTIONS` requests; unavailable/revoked/mismatched/reset sessions remain redacted and do not reveal token/session validity. | `requirements-doc.md`, `api-e2e-execution-coverage-report.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Fixed active-session TTL / default 12-hour Agent Tools MCP expiry | Owner-lifetime process-memory validity: session present, not revoked, bearer hash matches | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/agent_tools.md` |
| Active-session `expiry time`, `expiresAt`, `ttlMillis`, `expired` resolve failures, and purge-by-expiry mental model | `createdAt`, optional `revokedAt`, explicit owner cleanup, and future owner-aware GC only if separately designed | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |
| Claude descriptor refresh based on expiry | Live `ClaudeSession` descriptor reuse; fresh descriptor on new/restored Claude session | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |
| Reusing old bearer descriptors across process restart | Old descriptors fail after registry reset/restart; current-process owners materialize fresh descriptors | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/agent_tools.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A - docs impact existed and was updated`
- Rationale: `N/A`

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against the latest tracked base. Delivery is now at the user-verification hold; no ticket archival, final commit, push, target-branch merge, release, deployment, or cleanup has been performed.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
