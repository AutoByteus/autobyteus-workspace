# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-designer-handoff.md`, initial | N/A | `Initial Baseline` | SR-001 | Implemented; scripted AGY and unit checks pass; ready for direct API/E2E |

## Revision Entries

### IR-001: configured MCP tool failures as `isError` results

- Triggering role, report path, and round: Solution Designer, `solution-designer-handoff.md`, initial
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation at `253854bf8d`; IMP-00…IMP-04 as in the handoff
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: initial implementation handoff
- Approved behavior or requirement IDs affected: BEH-001 (changed), BEH-002/BEH-003 (preserved); REQ-001…003; AC-001, AC-003, AC-004 (AC-002 left to API/E2E)
- Implementation delta: `ConfiguredMcpRegistryToolAdapter.execute` returns an `isError` `mcp_tool_result` (failure message) for a thrown call and for a tool no longer available, instead of throwing. New adapter unit test. The e2e revoked case runs per runtime, with external runtimes also asserting no ERROR and TURN_COMPLETED; header updated.
- Changed files or areas: `configured-mcp-registry-tool-adapter.ts`, `tests/unit/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.test.ts` (new), `tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts`
- Local validation and result: see the handoff's Checks Run
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E for Small + Low)
- Remaining limitations or risks: live Codex/Claude (U-01) not run here
