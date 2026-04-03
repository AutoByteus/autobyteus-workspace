# API/E2E Testing

## Validation Meta

- Ticket: `codex-mcp-tool-approval-bridge`
- Current Validation Round: `3`
- Latest Authoritative Round: `3`
- Trigger Stage: `6`
- Final Authoritative Evidence Directory: `/tmp/codex-thread-events-stage7-mcp-success-7490`

## Scenario Catalog

| Scenario ID | Mode | Objective | Result |
| --- | --- | --- | --- |
| AV-001 | `autoExecuteTools=false` | prove manual `tts/speak` approval reaches the public websocket contract and ends in terminal tool success | Passed |
| AV-002 | `autoExecuteTools=true` | prove auto-executed `tts/speak` stays visible, skips the public approval stop, and ends in terminal tool success | Passed |

## Acceptance Criteria Coverage

| Acceptance Criteria ID | Result | Evidence |
| --- | --- | --- |
| AC-001 | Passed | manual live run exposed the matching `invocation_id`, `tool_name="speak"`, and expected `text` argument for the real `tts/speak` MCP call |
| AC-002 | Passed | manual live run emitted `TOOL_APPROVAL_REQUESTED`, accepted `APPROVE_TOOL`, emitted `TOOL_APPROVED`, then emitted `TOOL_EXECUTION_SUCCEEDED` for the same invocation |
| AC-003 | Passed | auto live run emitted no public `TOOL_APPROVAL_REQUESTED` |
| AC-004 | Passed | auto live run emitted `SEGMENT_START` with `segment_type="tool_call"`, so the frontend-visible Activity contract is populated |
| AC-005 | Passed | manual and auto live runs emitted `TOOL_EXECUTION_SUCCEEDED` with matching `invocation_id`, `tool_name="speak"`, and `result.structuredContent.ok=true` |
| AC-006 | Passed | live auto run now emits the terminal success event the frontend expects, and `toolLifecycleHandler.spec.ts` proves `TOOL_EXECUTION_SUCCEEDED` drives the Activity entry to `success` instead of leaving it at `parsed` |
| AC-007 | Passed | targeted backend unit coverage, frontend lifecycle unit coverage, and live Codex websocket E2E now cover the real `tts/speak` manual and auto terminal-success paths |

## Final Authoritative Commands

```bash
RUN_CODEX_E2E=1 \
RUNTIME_RAW_EVENT_DEBUG=1 \
CODEX_THREAD_EVENT_DEBUG=1 \
CODEX_THREAD_RAW_EVENT_DEBUG=1 \
CODEX_THREAD_RAW_EVENT_LOG_DIR=/tmp/codex-thread-events-stage7-mcp-success-7490 \
pnpm -C autobyteus-server-ts exec vitest run \
  tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts \
  -t 'routes Codex MCP tool approval over websocket for the speak tool|auto-executes the Codex speak MCP tool without approval requests'
```

```bash
pnpm -C autobyteus-web exec vitest run \
  services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts
```

Result:
- Live Codex websocket E2E: `2 passed | 12 skipped`
- Frontend lifecycle unit: `1 file passed`, `10 tests passed`

## Observed Public Contract

- Manual path:
  - `SEGMENT_START` for raw `mcpToolCall` arrives as `segment_type="tool_call"`
  - `TOOL_APPROVAL_REQUESTED`
  - `TOOL_APPROVED`
  - `TOOL_EXECUTION_SUCCEEDED`
  - `SEGMENT_END`
  - `TOOL_LOG`
- Auto path:
  - internal Codex `mcpServer/elicitation/request` still occurs
  - public stream emits `SEGMENT_START` with `segment_type="tool_call"`
  - public stream emits `TOOL_APPROVED`
  - public stream emits `TOOL_EXECUTION_SUCCEEDED`
  - no public `TOOL_APPROVAL_REQUESTED`
  - `SEGMENT_END`
  - `TOOL_LOG`
- Key ordering proof:
  - the backend emits terminal `TOOL_EXECUTION_SUCCEEDED` before `SEGMENT_END`, so the frontend keeps the stronger terminal lifecycle state instead of falling back to `parsed`

## Raw Evidence Files

- `/tmp/codex-thread-events-stage7-mcp-success-7490/codex-run-36f4de10-09ea-4ec7-b21f-6aa81be9146f.jsonl`
- `/tmp/codex-thread-events-stage7-mcp-success-7490/codex-run-604aaf7d-a3a8-414b-9df6-666caafc9833.jsonl`

## Round History

| Round | Reason | Result | Notes |
| --- | --- | --- | --- |
| 1 | reopened visibility fix validation | Pass | proved the visibility fix before the parsed-state follow-up was discovered |
| 2 | final authoritative rerun on the visibility-fix source revision | Pass | authoritative Stage 7 evidence for the visible tool-activity fix |
| 3 | terminal-success re-entry validation | Pass | authoritative Stage 7 evidence for generic Codex MCP terminal completion normalization |

## Gate Decision

- Stage 7 complete: `Yes`
- All in-scope acceptance criteria passed: `Yes`
- All relevant executable spines passed: `Yes`
- Ready for Stage 8 code review: `Yes`
