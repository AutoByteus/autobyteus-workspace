# Implementation Revision Record — mcp-http-error-status

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-sr-001.md`, initial | N/A | `Initial Baseline` | SR-001 | Implemented; code `bb1d3cd28c`; checks IMP-00…IMP-08 pass |

## Revision Entries

### IR-001 — HTTP status in remote MCP connect errors

- Triggering role, report path, and round: Solution Designer, `handoff-sr-001.md`, initial
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: `HttpManagedMcpServer` rethrows `SdkHttpError` from `client.connect` as `Error("HTTP <status>[ <reason>]: <SDK message>", { cause })`; other errors unchanged
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation of the approved design
- Approved behavior or requirement IDs affected: BEH-001…BEH-005; REQ-001…REQ-006; AC-001…AC-006
- Implementation delta: try/catch around `client.connect` with `SdkHttpError.isInstance`, module-local `withHttpStatus`; real-SDK unit cases; new built-server e2e
- Changed files or areas: `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts`; `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts`; `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts` (new)
- Local validation and result: IMP-01 failing first (8 failed); IMP-02 15/15, IMP-03 94/94, IMP-04 22 passed + 1 gated skip, IMP-05 build + lazy load, IMP-06 server typecheck, IMP-07 e2e 5/5 across 3 files, IMP-08 probe after
- Next recipient or routing: direct API/E2E (Small / Low), via `get_handoff_rules`
- Remaining limitations or risks: HTTP/2 empty-reason branch checked by reading only; gated agent tool-call e2e not run (AC-006 covered at unit level)
