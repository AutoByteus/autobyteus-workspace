# Implementation Revision Record — mcp-http-auth-headers

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff.md` (Architecture Design Complete), round 1 | N/A | `Initial Baseline` | SR-001; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implementation complete; direct API/E2E route |

## Revision Entries

### IR-001 — Credentials reach remote streamable HTTP MCP servers

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-auth-headers/tickets/in-progress/mcp-http-auth-headers/handoff.md`, round 1
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: implementation commits `b109a62ea6` and `d89135a832` (web-only cleanup that keeps `McpServerFormModal.vue` at 500 effective lines) on `codex/mcp-http-auth-headers`. All implementation-scoped checks pass (see the handoff's Checks Run).
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A (Small / Low, direct route)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff
- Approved behavior or requirement IDs affected: BEH-001..BEH-005; REQ-001..REQ-007; AC-001..AC-006, AC-008 (AC-007 is for API/E2E)
- Implementation delta:
  - `StreamableHttpMcpServerConfig`: token trimmed, blank → `null`; token + `Authorization` header (any case) rejected with a value-free message; new `requestHeaders()`.
  - `HttpManagedMcpServer`: `new Transport(new URL(url), { requestInit: { headers: config.requestHeaders() } })`; removed the ignored `url`/`headers` options, the single-argument constructor fallback, the never-present `client.initialize()` branch, the client-constructor fallback and the SDK export-alias fallbacks.
  - `FileMcpServerConfigProvider.toStandardEntry`: writes `token` when set.
  - `McpServerFormModal.vue`: Form → JSON includes non-empty `headers`; token hint under the Token field (`aria-describedby`), en + zh-CN messages.
  - Docs note in `autobyteus-server-ts/docs/modules/mcp_server_management.md`.
  - Tests: real-SDK client test (replaces the mock-only test), config validation tests, import-path rejection test, file-provider save → reload test, web component tests.
- Changed files or areas: `autobyteus-ts/src/tools/mcp/{types.ts,server/http-managed-mcp-server.ts}`, `autobyteus-ts/tests/unit/tools/mcp/{http-managed-mcp-server,types,config-service}.test.ts`, `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts`, `autobyteus-server-ts/tests/unit/mcp-server-management/file-provider.http-auth.test.ts`, `autobyteus-server-ts/docs/modules/mcp_server_management.md`, `autobyteus-web/components/tools/McpServerFormModal.vue`, `autobyteus-web/components/tools/__tests__/McpServerFormModal.spec.ts`, `autobyteus-web/localization/messages/{en,zh-CN}/tools.generated.ts`
- Local validation and result: see the handoff's Checks Run (IMP-01..IMP-11); new tests were red on the base code and green after the change
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E for Small / Low)
- Remaining limitations or risks: R-001 plain-text token until FU-2; AC-007 (agent tool call through the AutoByteus server) left to API/E2E
