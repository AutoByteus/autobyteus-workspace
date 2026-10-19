# Handoff Summary — mcp-sdk-1-32-upgrade

## Ticket

- Package: `mcp-sdk-1-32-upgrade`; Project Task `autobyteus-181` (FU-8 of `autobyteus-175`; autobyteus-179 follow-ups)
- Classification:
  - Round 1: `task_size=Medium`, `architectural_risk=Low`.
  - Round 2: validation only, `task_size=Small`, `architectural_risk=Low`.
  - Route: direct low-risk (architecture, source and test-code review `Not Applicable`).
- Revisions: SR-001..003, IR-001..002, API-REV-001 (Pass, 95.6%), API-REV-002 (Pass, 95.4%), DR-001, DR-002
- Archived ticket folder: `tickets/done/mcp-sdk-1-32-upgrade/` on `personal` (worktrees removed after finalization)

## What Changed

Round 1 (merged in DR-001):
- `@modelcontextprotocol/sdk` 1.30.0 → 1.32.1 in `autobyteus-ts` and `autobyteus-server-ts`; the lockfile resolves one 1.32.1 copy, also for the Claude Agent SDK and Google GenAI peers.
- Remote MCP requests keep the SDK's `redirectPolicy: 'same-origin'`: cross-origin redirects fail with a clear error and send nothing to the other origin; same-origin redirects work with credentials.
- Stdio and HTTP loaders use typed `import()` with the SDK's own types; `setSdkLoader` seams, `any` casts and fallbacks removed; mock tests replaced with real-server tests.
- WebSocket MCP transport removed; `transport_type: websocket` is rejected with `Valid types are: stdio, streamable_http.`
- Durable e2e `mcp-http-redirect-and-transport.e2e.test.ts`; docs: Redirects, Supported Transports.

Round 2 (the user's regression request, DR-002):
- No product source change.
- Parity of SDK 1.30.0 (`bf3c550c18`) vs 1.32.1 (`f59055f13f`) in packaged isolated apps of both commits. Every check gave the same result:
  - real `uv` Python servers (VideoAudioServer 32 tools, media-downloader 2 tools), a token HTTP server, exit-at-start and hang-at-start servers;
  - `/mcp/gateway` calls;
  - runtime × {project tools, external stdio, external HTTP} for native, Claude, AGY (real CLI), Grok, and Codex through its own MCP client (live Codex turn blocked by the account usage limit on both sides);
  - old toy integration tests 4/4 on both;
  - no orphan processes after stop.
- New durable gated suite `autobyteus-server-ts/tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts`, mutation-proven.
- Docs: "Verifying An MCP SDK Upgrade" in `autobyteus-server-ts/docs/modules/mcp_server_management.md`.

## Integration

- Round 1: merge of `origin/personal` @ `bf3c550c18` → `7d02301c3a`; DR-01..05 Pass.
- Round 2: merge of `origin/personal` @ `f33dacc994` (one ticket-only delivery record ahead of `f59055f13f`) → `cec8ccdf89`.
  - Checks, all Pass:
    - DR-06: core + server build.
    - DR-07: matrix suite, scripted AGY cell. Task DONE, stdio env and cwd delivered, HTTP `tools/call` `expected`. With no gate, 6/6 skip.
    - DR-08: built-server credentials + redirect/transport e2e, 4/4.

## Verification

- Judged from the evidence; no user check needed. Optional for the user: repeat a live Codex model turn after its usage limit resets (25 Oct). Details in `release-deployment-report.md`.

## Release

- Round 1: `No release`.
- Round 2: `Beta` `v1.5.7-beta.1`. The user asked for a beta for the next version after the next ticket, and this round is that delivery. Release commit `f0a191455b`; 4/4 workflows succeeded; GitHub pre-release with 17 assets; Docker `:1.5.7-beta.1` and `:beta` published, `:latest` unchanged. Beta desktop users get it with **Settings > Updates > Receive beta updates**; Docker users with `autobyteus-docker upgrade --all --tag beta`.

## Residual Risks And Follow-ups

- R-001: endpoints that redirect cross-origin now fail (intended; users configure the final URL).
- O-002: `ClaudeSdkClient.createMcpServer` is dead code.
- Unused `autobyteus-ts/tests/fixtures/certificates/cert.pem`.
- External-toy integration tests fail with `ENOENT` in a worktree layout instead of skipping; they pass with a test-owned `autobyteus_mcps` layout (round 2).
- GraphQL bulk import returns counts only; per-entry reasons are only in the server log.
- Round-2 findings, pre-existing and identical on both SDK versions:
  - the user's VideoAudioServer setting points at a removed `server.py`;
  - bulk import rejects the app's own `mcps.json` shape (no `transport_type`);
  - per-run stdio MCP sessions outlive terminated runs until the app closes;
  - a hang-at-start server costs a 60 s preview wait.
- `https`-upgrade redirect not exercised locally.
- `autobyteus-182`: SDK v2 migration.
