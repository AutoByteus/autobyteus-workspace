# Implementation Revision Record — mcp-sdk-v2-migration

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md` round 2 (Pass) → initial implementation | N/A | `Initial Baseline` | SR-004 (requirements SR-002), ARCH-REV-002; CRR/API-REV/DR `N/A` | Implemented; ready for code review |

## Revision Entries

### IR-001 — MCP client on `@modelcontextprotocol/client` 2.3.1; v2 test servers; O-002 removed

- Triggering role, report path, and round: architecture reviewer, `design-review-report.md`, round 2 (`ARCH-REV-002`, Pass)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete at `ae7e907bf2` (code `bc8c1d72f3` + e2e assertion fix `ae7e907bf2`) on `codex/mcp-sdk-v2-migration`; implementation-scoped checks pass
- Related solution revision IDs: SR-004 (design), SR-002 (approved requirements)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: first implementation of the reviewed design
- Approved behavior or requirement IDs affected: REQ-001…REQ-008, REQ-011 (BEH-001…BEH-010); REQ-009/REQ-012/REQ-013 are validation and delivery owned
- Implementation delta:
  - Manifests and root lockfile per the design's Dependency Rules; v1 SDK only as the Claude Agent SDK / GenAI peer.
  - The three managed-server files import `@modelcontextprotocol/client` (lazy `import()`), set no client options, and pass `{ timeout, signal }` as the second `callTool` argument. The old three-argument shape was first shown to lose the signal (IMP-01).
  - Test servers and test clients moved to the v2 packages. New cases: one stdio start per connect, `initialize` first with `2025-11-25` over HTTP, paged `tools/list`, abort signal on a real call, signal in the SDK options, and v2 `auto` clients against both real routes.
  - O-002 removed: `createMcpServer`, `createToolDefinition`, `callSdkFunction`, and the `createSdkMcpServer` union and type members, plus the live integration case and its now-unused `zod` import.
  - Docs updated: `mcp_server_management.md` and `agent_execution.md`.
  - Two corrections to the design's expected values, with evidence: the real routes negotiate `2025-03-26`, not `2025-11-25` (IMP-06), and line 152 of the redirect e2e also needed the v2 wording split (IMP-10).
- Changed files or areas: see `implementation-handoff.md`, Key Files Or Areas
- Local validation and result: IMP-01…IMP-11 in `implementation-handoff.md` Checks Run; all pass except IMP-01, which is the expected failure that proves the call shape
- Next recipient or routing: Code Reviewer (`task_size=Medium`, `architectural_risk=High`)
- Remaining limitations or risks: R-002 (packaging) and R-003 (strictness, including RR-001) are left to the API/E2E parity run; follow-ups FU-004 and FU-005 recorded
