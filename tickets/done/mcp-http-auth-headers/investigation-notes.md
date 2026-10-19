# Investigation Notes — Authentication for remote (streamable HTTP) MCP servers

## Investigation Meta

- Package identifier: `mcp-http-auth-headers`
- Request / ticket: Project Task `autobyteus-179` (FU-1 of `autobyteus-175` / package `jira-mcp-server-presets`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-auth-headers`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-auth-headers`, branch `codex/mcp-http-auth-headers`
- Resolved base: `origin/personal` @ `d6f2d6ceb5933b441902eb5b1e4d67fca73658ac` (fetched 2026-10-19)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created from refreshed `origin/personal`. `git diff --stat e2e21402b1..d6f2d6ceb5` over `autobyteus-ts/src/tools/mcp`, `autobyteus-server-ts/src/mcp-server-management`, `autobyteus-server-ts/src/api/graphql`, `autobyteus-web/components/tools` and `autobyteus-web/graphql` is empty, so the predecessor's evidence applies unchanged.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md` (2026-10-19); `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2 (2026-10-19)
- Investigation status: Complete for design

## Initial Request And Clarifications

- Original request: the Task description (attached by the Project Task Manager); the user's decision "we should first fix this critical issue about the HTTP stuff, authentication stuff", and that the investigating team fixes it.
- Predecessor evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/jira-mcp-server-presets/tickets/in-progress/jira-mcp-server-presets/investigation-notes.md`. Probes: `…/jira-mcp-server-presets/probes/probe-headers.mjs` (P-001: AutoByteus sends no `Authorization` header) and `probe-headers-control.mjs` (P-002: the same request with `requestInit.headers` arrives and is accepted).

## Source Log

| Date | Type | Source | Finding |
| --- | --- | --- | --- |
| 2026-10-19 | Code | `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` L43-55 | `transportOptions = { url, headers }`; tries `new Transport(url, opts)`, then `new Transport(opts)`. |
| 2026-10-19 | Code | SDK 1.30.0 `dist/esm/client/streamableHttp.js` L25-73, L297-301, L438-440 | Reads `opts.requestInit` and `opts.authProvider`. `_commonHeaders()` merges `requestInit.headers` into every POST (requests and notifications) and the GET SSE stream. A top-level `headers` key is ignored. |
| 2026-10-19 | Code | `autobyteus-ts/src/tools/mcp/types.ts` L137-176 | `StreamableHttpMcpServerConfig` validates and stores `token` and `headers`. No reader of `token` in `src` (grep `config.token`, `.token`). |
| 2026-10-19 | Code | `autobyteus-ts/src/tools/mcp/server-instance-manager.ts` L100-101 | The only constructor of `HttpManagedMcpServer`, used for registration (`McpToolRegistrar`), preview (`listRemoteTools`) and tool calls. |
| 2026-10-19 | Code | `grep StreamableHTTPClientTransport` in `autobyteus-ts/src`, `autobyteus-server-ts/src` | Only `http-managed-mcp-server.ts`. No runtime (Claude, Codex, AGY, Grok) receives raw external HTTP configs (`docs/modules/agent_tools_mcp_server.md`). |
| 2026-10-19 | Code | `autobyteus-ts/src/tools/mcp/config-service.ts` `createSpecificConfig` | Import and parse pass `token` and `headers` through to the constructor. |
| 2026-10-19 | Code | `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts` `toStandardEntry` | HTTP entry written as `url`, `headers`, `enabled`, `tool_name_prefix`; **`token` omitted**. `parseEntry` spreads the stored entry, so a stored `token` would be read back. |
| 2026-10-19 | Code | `autobyteus-server-ts/src/api/graphql/types/mcp-server.ts` `createDomainConfigFromInput`; `converters/mcp-server-converter.ts` L40-41 | GraphQL input and output already carry `token` and `headers`; no schema change needed. |
| 2026-10-19 | Code | `autobyteus-web/components/tools/McpServerFormModal.vue` L241-270 (`updateJsonFromForm`), L341-360 (`buildInputFromJson`), L470-491 (`buildInputFromForm`) | Form save keeps headers (spread). JSON → form keeps headers. **Form → JSON omits headers**, so saving from the JSON tab after switching loses them. |
| 2026-10-19 | Code | `autobyteus-web/localization/messages/{en,zh-CN}/tools.generated.ts` | Two locales hold `token_optional`. |
| 2026-10-19 | Code | `autobyteus-ts/src/tools/mcp/server/websocket-managed-mcp-server.ts`; `file-provider.ts` `toStandardEntry` (non-HTTP → stdio shape) | WebSocket transport is not persisted, not offered in GraphQL or the UI; not a supported product path. |
| 2026-10-19 | Code | `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` | Mock SDK asserts `{url, headers}`; would keep passing with the bug. |
| 2026-10-19 | Code | `autobyteus-ts/tests/integration/tools/mcp/http-managed-mcp-server.test.ts` | Depends on an external Python toy server (`../autobyteus_mcps`, `uv`); not self-contained. |
| 2026-10-19 | Code | `autobyteus-server-ts/tests/integration/mcp-server-management/mcp-config-service.integration.test.ts` | Existing integration harness for the config service and file round-trip. |
| 2026-10-19 | Code | `grep console./logger.` in `autobyteus-ts/src/tools/mcp` | No header or token values logged. |

## Relevant Existing Behavior

BEH-001..BEH-005 as in `requirements-doc.md`, all High confidence (code plus probe P-001).

## Persisted Data And State Facts

- Subject: `<appDataDir>/mcps.json`, `{ "mcpServers": { "<id>": { "url", "headers"?, "enabled"?, "tool_name_prefix"? } } }` for HTTP entries. Volume: a handful of entries per user.
- Reader: `parseEntry` spreads the entry into the core parser, which accepts `token`.
- Existing entries never contain `token` (the writer never wrote it), so there is nothing to transform.
- Downgrade: an older build reading an entry with `token` accepts it (the constructor allows it) and ignores it, as today.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| R-001 | Risk | The token is now saved in plain text | Same as headers and env today; FU-2 moves them into the vault | Accepted (DEC-001) |
| R-002 | Risk | A future SDK changes its option shape | Real-SDK test fails loudly | Mitigated |
| O-001 | Observation | WebSocket transport probably drops headers the same way and is persisted as stdio | Not a supported product path; record as a follow-up note | Follow-up |

## Architecture Investigation Findings

Every connect path goes through one owner, `HttpManagedMcpServer`, created only by `McpServerInstanceManager`. The config type `StreamableHttpMcpServerConfig` is the one owner of a server's HTTP settings. Fixing the request headers in those two places covers registration, preview and tool calls for every runtime. Persistence is one function (`toStandardEntry`). The web form has one serializer for the JSON view (`updateJsonFromForm`).
