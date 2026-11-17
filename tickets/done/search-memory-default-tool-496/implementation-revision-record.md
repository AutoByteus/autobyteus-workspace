# Implementation Revision Record

The current code and `implementation-handoff.md` are authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-implementation.md`, SR-004 | N/A | `Initial Baseline` | SR-004 | Implemented; direct API/E2E |

## Revision Entries

### IR-001 — Every agent run gets `search_memory` from the shared exposure rule

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/search-memory-default-tool-496/handoff-implementation.md`, initial round of SR-004
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A. The SR-003 package was withdrawn before any source change, so no code was written for it.
- Current authoritative result: implemented; `task_size=Small`, `architectural_risk=Low` confirmed; ready for direct API/E2E validation
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: N/A (ARCH-REV-001/002 reviewed the withdrawn SR-003)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation of SR-004
- Approved behavior or requirement IDs affected: REQ-001 to REQ-003; AC-001 to AC-003 (AC-004 left to API/E2E); BEH-001, BEH-006
- Implementation delta:
  - `PLATFORM_GIVEN_TOOL_NAMES = [search_memory]`, merged into `requestedToolNames` by `buildRuntimeAgentToolExposure`, deduplicated by the existing `Set`
  - updated module docs
  - updated exact-name test expectations in 10 test files
  - new tests for AC-001 (rule, native instance, MCP `tools/list`) and AC-003 (restore notice)
  - one baseline test fix not caused by this ticket (skill folder watcher timeout)
  - FU-005 recorded
- Changed files or areas:
  - `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts`
  - `docs/modules/memory_search.md`, `agent_tools_mcp_server.md`, `tool_list_updates.md`
  - 12 unit test files and 1 integration test file (listed in the handoff's Key Files)
  - commits `8a0858709f`, `d02b201e34`, `5cdd6faf81`
- Local validation and result (handoff Checks Run):
  - IMP-01: full unit run; 13 failures, all fixed
  - IMP-02: changed unit files, 186 passed
  - IMP-03: server typecheck, pass
  - IMP-04: web typecheck, pass
  - IMP-05: 7 integration files, 32 passed, 8 gated skips
- Next recipient or routing: `/api_e2e_engineer` (rule: Small or Medium and Low, direct API/E2E)
- Remaining limitations or risks:
  - AC-004 (real runtimes) not run here
  - privacy and prompt cost accepted by the user (FU-001, FU-002, FU-004)
  - FU-005: Claude tooling fallback list reached only by tests
