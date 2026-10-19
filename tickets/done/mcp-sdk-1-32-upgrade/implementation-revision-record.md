# Implementation Revision Record — mcp-sdk-1-32-upgrade

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff.md` (Architecture Design Complete), round 1 | N/A | `Initial Baseline` | SR-001; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implementation complete; direct API/E2E route |

## Revision Entries

### IR-001 — MCP SDK 1.32.1, typed loaders, WebSocket transport removed

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade/tickets/in-progress/mcp-sdk-1-32-upgrade/handoff.md`, round 1
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: implementation commit `4923d179c1` on `codex/mcp-sdk-1-32-upgrade`. See the handoff's Checks Run.
- Related solution revision IDs: SR-001
- Related architecture-review / code-review / API/E2E / delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff
- Approved behavior or requirement IDs affected: BEH-001..BEH-004; REQ-001..REQ-007; AC-001..AC-009 (AC-004 and AC-008 also need API/E2E for the live runtimes)
- Implementation delta:
  - SDK `1.30.0` → `1.32.1` (exact pin) in `autobyteus-ts` and `autobyteus-server-ts`. The lockfile holds one copy, and the Claude Agent SDK and GenAI peers resolve to it. `redirectPolicy` is not set.
  - `StdioManagedMcpServer` and `HttpManagedMcpServer` each have one typed lazy `import()` and one construction path. Removed: `setSdkLoader`/`sdkLoader`, the hand-written `ClientLike`/`SdkModule` types, `any` and `as unknown as` casts, the alias and constructor fallbacks, and the `initialize()` branch.
  - `BaseManagedMcpServer` (deviation from the spec's "left alone"; see the handoff):
    - `ClientSessionLike` becomes `Pick<Client, 'listTools' | 'callTool' | 'close'>`;
    - removed the legacy `callTool.length >= 2` branch, the array `listTools` branch and the optional-`close` guard.
  - WebSocket transport removed:
    - `McpTransportType.WEBSOCKET` and `WebsocketMcpServerConfig(Data)`;
    - the parser entries and the unreachable `Unsupported McpTransportType` throw;
    - the factory case;
    - `websocket-managed-mcp-server.ts`;
    - its exports;
    - its unit and integration tests.
  - Tests:
    - a real stdio fixture server (`tests/fixtures/mcp-stdio-fixture-server.mjs`) and test;
    - HTTP redirect tests;
    - `websocket` rejection test;
    - the instance-manager test now covers stdio and HTTP;
    - the base test loses its legacy-signature case.
- Changed files or areas: `autobyteus-ts/src/tools/mcp/**`, `autobyteus-ts/tests/unit/tools/mcp/**`, `autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs`, `autobyteus-ts/tests/integration/tools/mcp/websocket-managed-mcp-server.test.ts` (deleted), both `package.json` files, `pnpm-lock.yaml`
- Local validation and result: see the handoff's Checks Run. The cross-origin redirect test failed on 1.30.0 (IMP-00) and passes on 1.32.1.
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E for Medium / Low)
- Remaining limitations or risks: R-001 (cross-origin redirecting endpoints now fail; intended). R-002 (Claude Agent SDK peer). The live-runtime AC-004/AC-008 runs and the packaged builds are left to API/E2E.
