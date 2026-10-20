# Handoff Summary — mcp-sdk-v2-migration

## Ticket

- Package: `mcp-sdk-v2-migration`; Project Task `autobyteus-182` (FU-9 of `autobyteus-175`)
- Classification: `task_size=Medium`, `architectural_risk=High`; route: reviewed (architecture review, source review, API/E2E, test-code review)
- Revisions: requirements SR-002 (approved by the user 2026-10-20), design SR-004; ARCH-REV-002 Pass; IR-001; CRR-001 Pass (no findings); API-REV-001 Pass (95.4%); CRR-002 Not Applicable (no durable test changed during API/E2E); DR-001
- Archived ticket folder: `tickets/done/mcp-sdk-v2-migration/` on `personal`

## What Changed

- The MCP client in `autobyteus-ts` and `autobyteus-server-ts` moved from `@modelcontextprotocol/sdk` 1.32.1 to `@modelcontextprotocol/client` 2.3.1 (exact pin). No AutoByteus code imports the v1 package. It stays in the lockfile only as the Claude Agent SDK / Google GenAI peer, which those packages use for types.
- Production change: the stdio and HTTP managed servers, plus the tool-call options position in `base-managed-mcp-server.ts`. The 6-minute timeout and the run's cancel signal reach the SDK call.
- The client keeps `legacy` negotiation (DEC-002): the 2025-11-25 `initialize` handshake, with one stdio start per connect.
- Approved differences:
  - DEC-003, error wording: `SdkHttpError: Error POSTing to endpoint: …`; the redirect refusal gains advice text; stdio `McpError: MCP error -32000: Connection closed` → `SdkError: Connection closed`; `-32001 … Request timed out` → `SdkError: Request timed out`.
  - DEC-004, tool listing: a paginating server shows all its tools.
- The dead Claude `createMcpServer` / `createToolDefinition` path and its test were removed (O-002).
- Test servers and clients moved to the v2 server packages. New durable cases cover the signal and timeout, the 2025 handshake (one start), paged listing, cancellation, and SDK clients in `auto` mode against our endpoints.
- Docs: `autobyteus-server-ts/docs/modules/mcp_server_management.md` and `agent_execution.md`. Implementation updated both; delivery added the error-text list.

## Integration

- `origin/personal` had moved from `dc530fdcb0` to `b7ea243953`: two merged tickets, including `mcp-test-launcher-and-test-residue`, which changed `mcp-test-server-launcher.ts`. No file overlaps with this ticket.
- Integration method: `git merge --no-ff origin/personal` → `f151ded614`, no conflicts.
- Post-integration checks, all Pass:
  - DEL-01: `autobyteus-ts` MCP unit, 87/87.
  - DEL-02: core MCP integration (uv Python + Node fixtures), 22 passed + 1 gated skip.
  - DEL-03: Agent Tools and gateway route integration, 15/15.
  - The counts equal API-01/02/03 after. The AC-001 grep is still empty on the integrated tree.

## Verification

- Judged from the evidence: sufficient. Every critical acceptance criterion is proven directly (details in `release-deployment-report.md`). Final confidence is 95.4% against the 95% target, with no category below 90%.
- The user's check: not needed. The user dropped it on 2026-10-20 ("Yeah, I think you should practice what the skill told you, right?"), after delivery explained that the skill asks for a user check only when the evidence can't reach something or when the user asked to check. REQ-012 / AC-011 still state the check; the Solution Designer is told.

## Release

- Decision: `Beta`, required by the approved requirements (REQ-012, the Task's Done-when).
- Outcome: `v1.5.8-beta.1`, release commit `89ce6ba93c`.
  - All 4 workflows succeeded (Desktop, Android, iOS/TestFlight, Server Docker).
  - GitHub pre-release with 17/17 assets.
  - Docker `:1.5.8-beta.1` and `:beta` published; `:latest` stays on 1.5.7.
  - Beta desktop users get it with **Settings > Updates > Receive beta updates**; Docker users with `autobyteus-docker upgrade --all --tag beta`.

## Final State

- `origin/personal`: merge `cb88162c0c`, release commit `89ce6ba93c`, delivery records on top. The ticket worktree and local branches are removed; `origin/codex/mcp-sdk-v2-migration` is kept.

## Residual Risks And Follow-ups

- RR-001: a server whose tool output schema declares JSON Schema draft-04 would fail v2's output validation. None of the user's servers or the published reference servers does (API-14).
- Not run: the tts and image-audio `uv` servers (download at start / no faithful copy) and a live Codex model turn. Codex's own MCP client path was covered instead.
- Follow-ups FU-001…FU-007 are in `follow-ups.md`; none blocks. The Solution Designer sends them.
