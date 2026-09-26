# Docs Sync Report — agy-empty-mcp-config-activation

## Scope

- Ticket: `agy-empty-mcp-config-activation`
- Trigger: API/E2E validation passed (API-REV-001) on the direct route. `task_size=Small`, `architectural_risk=Low`. Architecture Review, Code Review and test-code review are `Not Applicable`.
- Bootstrap base reference: `origin/personal` @ `a2694ed45`
- Integrated base reference used for docs sync: `origin/personal` @ `69006cc79`, merged into the ticket branch as `149112d21`
- Post-integration verification reference: `agy-run-capsule.test.ts` 10/10 pass on `149112d21`, and `tsc --noEmit -p tsconfig.build.json` reported 0 errors

## Why Docs Were Updated

- Summary: The AGY runtime doc said that activation does not write global AGY config. It did not say that activation reads the workspace and global `mcp_config.json` files to guard against a server-name collision. It also did not say how missing, empty, malformed or colliding files are handled. That precondition was the root cause of this ticket's user-facing failure.
- Why this should live in long-lived project docs: Anyone diagnosing "Failed to prepare agent run" on `antigravity_cli` needs to know which user files activation inspects and which conditions cause a failure.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Canonical AGY runtime doc; describes run-scoped MCP configuration | Updated | Added the collision-guard paragraph |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Describes the Agent Tools MCP server | No change | Does not describe AGY config file handling |
| `autobyteus-web/docs/settings.md` | Mentions MCP config | No change | Covers AutoByteus-managed MCP servers, not AGY user files |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Behavior clarification | New paragraph in "Run-owned project and workspace" covering the files inspected (read-only), how missing and empty/whitespace files are treated ("no servers", as `agy` treats them), the malformed-JSON failure and the `AGY_MCP_NAME_COLLISION` failure | Documents the final implemented behavior (REQ-001..REQ-003) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| AGY MCP collision guard | It reads the workspace `.agents/mcp_config.json` and the global `~/.gemini/config/mcp_config.json` and never modifies them. Empty files count as no servers. Malformed files and same-name servers fail activation. | `investigation-notes.md`, `design-spec.md` | `antigravity_cli_runtime.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Behavior where an empty config file was parsed as JSON and failed activation | Empty/whitespace config treated as "no servers" | `antigravity_cli_runtime.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: Handoff summary and user verification hold (AC-005)
- Notes: None
