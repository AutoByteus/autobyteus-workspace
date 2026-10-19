# Implementation Revision Record — mcp-sdk-1-32-upgrade

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff.md` (Architecture Design Complete), round 1 | N/A | `Initial Baseline` | SR-001; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implementation complete; direct API/E2E route |
| IR-002 | Solution Designer, `handoff-sr-002.md` (SR-002 validation round, extended by SR-003), round 2 | N/A (the user's regression request) | `Validation only` (no code change) | SR-002, SR-003; DR-001 (prior delivery); ARCH-REV N/A; CRR N/A; API-REV N/A | Check 1 the same before and after; checks 2–3 and the SR-003 matrix to API/E2E |

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

### IR-002 — Regression parity, check 1: toy integration tests before and after

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade-parity/tickets/in-progress/mcp-sdk-1-32-upgrade/handoff-sr-002.md` (sections SR-002 and "SR-003 addition"), round 2
- Triggering finding IDs: N/A (the user's request: "we have to make sure that the mcp upgrade doesn't break")
- Classification: validation only; no product code change (Small / Low, as designed)
- Prior authoritative result: IR-001 (`4923d179c1`, merged as `6990940b8d`, delivered DR-001)
- Current authoritative result: no code delta. Check 1 (AC-010) gives the same result on before (`bf3c550c18`, SDK 1.30.0) and after (`f59055f13f`, SDK 1.32.1). See `implementation-handoff.md` → "IR-002 — SR-002/SR-003 parity round".
- Related solution revision IDs: SR-002, SR-003
- Related architecture-review / code-review / API/E2E revision IDs: N/A
- Related delivery revision IDs: DR-001 (prior delivery of IR-001)
- Why this revision is recorded:
  - the SR-002 validation round assigned check 1 to implementation;
  - it also corrects a factual error in IR-001's handoff about why the toy tests fail.
- Approved behavior or requirement IDs affected: BEH-001 (preserved); REQ-008, AC-010; REQ-010 (safety)
- Implementation delta: none to product code or tests. Documentation-only correction to `implementation-handoff.md` follow-up 3 (the toy-path cause).
- Changed files or areas: `implementation-handoff.md`, this record, `evidence/IMP-SR2-01-toy-integration-{before,after}.log`
- Local validation and result: `IMP-SR2-01` on both commits.
  - `pdf_mcp` stdio: 4 of 4 pass on both.
  - HTTP toy: cannot run on either (the toy exists nowhere; same `ENOENT`).
  - WebSocket toy: cannot run on before (the toy exists nowhere); the test was removed in after by IR-001.
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E for Small / Low) for checks 2–3 and the SR-003 runtime × MCP matrix
- Remaining limitations or risks:
  - `pdf_mcp` had to be restored from the toy repo's history (`e259f54^`) into test-owned copies; it is no longer in `autobyteus_mcps`.
  - Its Python dependencies came from PyPI per its `uv.lock` (`pymupdf` was not in the local uv cache).
