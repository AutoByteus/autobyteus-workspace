# Investigation Notes

## Investigation Meta

- Package identifier: `agent-tools-mcp-tool-error-result` (Project Task `autobyteus-232`)
- Request / ticket: autobyteus-232 (FU-001 of autobyteus-223)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-tool-error-result`
- Repository mode: `Git`
- Task worktree / branch: the workspace root, branch `fix/agent-tools-mcp-tool-error-result`
- Resolved base: `origin/personal` @ `1138e8fbefadeb3b30fdb88eb4a5a09beaf372ea` (fetched 2026-10-24)
- Finalization target: `origin/personal`
- Bootstrap result: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` (the SDK `dist/` folders that appear are untracked build outputs; not committed)
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (2026-10-24): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`; design gate: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md`, `autobyteus-server-ts/AGENTS.md`
- Investigation status: complete

## Initial Request And Clarifications

- Original request: Task autobyteus-232 (see requirements doc).
- Clarifications: bundled with autobyteus-265, -238, -208 (independent). Related: autobyteus-179 (auth headers), 226 (our endpoints' protocol answer).

## Product And Domain Understanding

- Product area: the per-run Agent Tools MCP endpoint (`autobyteus_agent_tools`) that AGY, Codex and Claude runs use to reach AutoByteus tools, including configured MCP servers' tools.

## Source Log

| Date | Type | Source | Why | Finding | ID |
| --- | --- | --- | --- | --- | --- |
| 2026-10-24 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.ts:116-151,201-203` | Where the error is lost | `dispatchToolsCall` → `toolExecutor.executeAgentToolMcpCall`; `catch {}` → `-32603 "Internal error"` | E-01 |
| 2026-10-24 | Code | `src/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.ts:37-48` | The configured-MCP adapter | Throws "no longer available" (39-41); `tool.execute` failures propagate (43-46); results normalized (47) | E-02 |
| 2026-10-24 | Code | `src/agent-tools/mcp/providers/browser-tools-mcp-adapter-provider.ts`, `media-tools-mcp-adapter-provider.ts` | Sibling convention | Both catch in the adapter and return `createAgentToolsMcpErrorResult(...)` | E-03 |
| 2026-10-24 | Code | `src/agent-tools/mcp/agent-tool-mcp-tool-executor.ts` | Observer path | A returned result with `isError` → `onToolComplete({ accepted: false })`; a throw → `onToolError` (no implementer per FU-001) | E-04 |
| 2026-10-24 | Code | `autobyteus-ts/src/tools/mcp/tool.ts`, `server/proxy.ts`, `server/http-managed-mcp-server.ts:20-34`, `tools/base-tool.ts:278-285` | The message's origin | `GenericMcpTool._execute` → proxy → managed server; connect failure rethrown as `HTTP <status> <text>: <SDK message>`; `BaseTool.execute` does not wrap | E-05 |
| 2026-10-24 | Code | `node_modules/.pnpm/@modelcontextprotocol+client@2.3.1/.../dist/*.mjs` (searched for URL interpolation in error texts) | Credential-free premise | URL-bearing texts only in OAuth metadata discovery and a logging middleware, neither used by our header-based transport; `SdkHttpError` messages carry status text and the server's body text | E-06 |
| 2026-10-24 | Doc | `tickets/done/mcp-http-error-status/requirements-doc.md` BEH-005, REQ-005, QR-001 | Existing contract | "No message contains a token or header value", e2e-asserted | E-07 |
| 2026-10-24 | Code | `autobyteus-server-ts/tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` | Test to extend | Revoked case is native-only; header explains why (FU-001); runtimes gated | E-08 |
| 2026-10-24 | Code | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs:97-106,177-198` | Scripted AGY | `CALL_TOOLS:` calls the endpoint with the MCP client; a JSON-RPC error throws and fails the turn; a result is replied as `CALLED_ALL:[…]` | E-09 |
| 2026-10-24 | Command | `which codex claude` | Live gates possible | codex-cli 0.164.0, Claude Code 2.1.310 installed (sign-in not checked) | E-10 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Path | Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | External-runtime tool call | runtime → endpoint → dispatcher → executor → configured adapter → registry tool → MCP server (401) → throw → `Internal error` | Agent sees `Internal error`; scripted AGY turn errors | E-01, E-02, SD-01 | Reproduced |
| BEH-002 | Contract | Native tool call | native tool → same error text | `HTTP 401 Unauthorized: …` | E-05, autobyteus-223 | Read (+ autobyteus-223 evidence) |

## Relevant Codebase And Technical Facts

| Path | Responsibility | Implication | Design Implication |
| --- | --- | --- | --- |
| Configured adapter | Execute configured MCP tool for a session | Owns turning its call failure into a result | Fix here (E-03 convention) |
| Dispatcher | JSON-RPC protocol | Keep protocol errors | Unchanged |

## Structural And Payload Surface Inventory

- Structural: one adapter method; its unit test; one e2e file (new runtime cases, header).
- Contract change: the endpoint's answer for a failed configured tool call (JSON-RPC error → tool result with `isError`). Clean cut, no version handling (DESIGN.md rule 9).

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| SD-01: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/zz-probe-agy-revoked-mcp-tool.e2e.test.ts --no-watch` on base 1138e8fbef | SCN-001, scripted AGY, real local MCP server with token revoked | `ERROR {"code":"AGY_TURN_ERROR","message":"Internal error"}`; no reason on the wire | Reproduced | BEH-001 | `evidence/SD-01-repro-base.log` |
| SD-02: same, with a TEMPORARY diagnostic in the adapter returning the caught error as an `isError` result | Control | Pass: turn completes, wire contains `HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized`, no token | Reproduced | DEC-001 sufficient for AGY | `evidence/SD-02-control-iserror-result.log` |

- Temporary diagnostics: SD-02's try/catch in `configured-mcp-registry-tool-adapter.ts`; reverted with `git checkout` right after; never committed.
- Reproduction for implementation to start from: `evidence/repro-agy-revoked-mcp-tool.e2e.test.ts` (copy into `autobyteus-server-ts/tests/e2e/runtime/`, command as SD-01). Fails on base. The permanent test is the extended `mcp-http-auth-agent-tool-call.e2e.test.ts`.

## Persisted Data And State Facts

- Not affected.

## Product Design Request Context

- `Not stated`.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/repro-agy-revoked-mcp-tool.e2e.test.ts` | Solution Designer | Reproduction | SCN-001 | AC-001 | Current | Evidence |
| `evidence/SD-01-repro-base.log`, `evidence/SD-02-control-iserror-result.log` | Solution Designer | Outputs | — | — | Current | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| R-01 | Risk | A remote MCP server could put a secret in its own error body; the SDK text includes the body | Credential-free | Same as the native runtime today and accepted by autobyteus-223; outside our control; tests assert our dummy token never appears | Accepted |
| U-01 | Unknown | How live Codex and Claude present an `isError` result to their model (expected: as a tool error per MCP) | AC-002 | Live gated runs by API/E2E | Open (validation) |

## Architecture Investigation Findings

- The configured adapter is the only Agent Tools adapter that lets a call failure become a protocol error (E-02, E-03).

## Requirement Implications

- Fix in the adapter; keep the dispatcher's protocol behavior.

## Notes For Architecture Design

- Use `toAgentToolMcpToolResult({ content: [{ type: "text", text }], isError: true })`.
