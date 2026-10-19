# Handoff Summary — mcp-sdk-1-32-upgrade

## Ticket

- Package: `mcp-sdk-1-32-upgrade`; Project Task `autobyteus-181` (FU-8 of `autobyteus-175`; autobyteus-179 follow-ups)
- Classification: `task_size=Medium`, `architectural_risk=Low`; route: direct low-risk (architecture, source and test-code review `Not Applicable`)
- Revisions: SR-001, IR-001, API-REV-001 (Pass, 95.6%), DR-001
- Archived ticket folder: `tickets/done/mcp-sdk-1-32-upgrade/` on `personal` (worktree removed after finalization)

## What Changed

- `@modelcontextprotocol/sdk` 1.30.0 → 1.32.1 in `autobyteus-ts` and `autobyteus-server-ts`; the lockfile resolves one 1.32.1 copy, also for the Claude Agent SDK and Google GenAI peers.
- Remote MCP requests keep the SDK's `redirectPolicy: 'same-origin'`: cross-origin redirects fail with a clear error and send nothing to the other origin; same-origin redirects work with credentials.
- Stdio and HTTP loaders use typed `import()` with the SDK's own types; `setSdkLoader` seams, `any` casts and fallbacks removed; mock tests replaced with real-server tests (stdio fixture with env/cwd, in-process HTTP).
- WebSocket MCP transport removed; `transport_type: websocket` is rejected with `Valid types are: stdio, streamable_http.`
- Durable e2e: `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts` (ungated; needs a current server build); helper `auth-required-mcp-server.ts` gained a redirect map.
- Docs: `autobyteus-server-ts/docs/modules/mcp_server_management.md` (Redirects, Supported Transports).

## Integration

- Merge of `origin/personal` @ `bf3c550c18` (14 commits ahead of bootstrap `436b85ce93`, including stable `v1.5.6` and a run-file-change fix) → `7d02301c3a`; no conflicts or overlapping files; `pnpm-lock.yaml` untouched by the base.
- Post-integration checks, all Pass: core build + MCP unit 73/73 (DR-01); server typecheck + build (DR-02); built-server redirect/transport and 179 credentials e2e 4/4, same observations as API-01/02 (DR-03); scripted AGY agent tool call (DR-04); server unit MCP management + run-file-changes 35/35 (DR-05).

## Verification

- Judged from the evidence; no user check needed. Details in `release-deployment-report.md`.

## Release

- Decision: `No release` (RELEASE.md default; not requested for this ticket). The Task says it ships with the next beta; a beta (`v1.5.7-beta.1` by the default numbering after stable `v1.5.6`) is available on request.

## Residual Risks And Follow-ups

- R-001: endpoints that redirect cross-origin now fail (intended; users configure the final URL).
- O-002: `ClaudeSdkClient.createMcpServer` is dead code.
- Unused `autobyteus-ts/tests/fixtures/certificates/cert.pem`.
- External-toy integration tests (`autobyteus-ts/tests/integration/tools/mcp/{stdio-managed-mcp-server,http-managed-mcp-server,tool-registrar}.test.ts`) fail with `ENOENT` in a worktree layout instead of skipping (IMP-03); replace with the new fixtures or skip when the toy repo is absent.
- GraphQL bulk import returns counts only; per-entry reasons are only in the server log (existing contract).
- `https`-upgrade redirect not exercised locally (SDK-internal).
- `autobyteus-182`: SDK v2 migration (separate Task).
