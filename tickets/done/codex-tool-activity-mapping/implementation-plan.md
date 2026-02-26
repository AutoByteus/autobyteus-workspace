# Implementation Plan

## Inputs
- Requirements: `tickets/in-progress/codex-tool-activity-mapping/requirements.md` (`Refined`)
- Design: `tickets/in-progress/codex-tool-activity-mapping/proposed-design.md` (`v3`)
- Call stack review: `tickets/in-progress/codex-tool-activity-mapping/future-state-runtime-call-stack-review.md` (`Go Confirmed`)

## Tasks
| Task ID | Description | Files | Change IDs | Verification |
| --- | --- | --- | --- | --- |
| T-001 | Harden Codex tool-like segment type classification for item variants | `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts` | C-001 | backend unit tests |
| T-002 | Add generic lifecycle-anchor upsert in frontend tool lifecycle handler for missing SEGMENT_START | `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | C-002 | frontend unit tests |
| T-003 | Extend backend mapper tests for tool item variant classification | `autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts` | C-003 | backend unit tests |
| T-004 | Extend frontend lifecycle tests for TOOL_* without prior segment | `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` | C-004 | frontend unit tests |
| T-005 | Run regression subsets for streaming handlers/mappers and report results | test commands only | C-001..C-004 | backend + frontend test run |
| T-006 | Normalize `edit_file` argument extraction from nested file-change payloads and sanitize placeholder-empty arguments | `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts` | C-005 | backend unit tests |
| T-007 | Add mapper regression tests for `item.changes[]` fallback and empty-placeholder argument handling | `autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts` | C-005 | backend unit tests |
| T-008 | Hydrate `run_bash.command` from canonical metadata across segment start/end and activity argument projection | `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts`, `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`, `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | C-006 | backend + frontend unit tests |
| T-009 | Add/execute live codex websocket E2E for non-empty `run_bash` command metadata | `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts` | C-007 | live Codex E2E |
| T-010 | Map Codex `webSearch` lifecycle to canonical `tool_call` (`search_web`) and suppress mirror `codex/event/web_search_*` noise | `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts` | C-008 | backend unit tests + live log validation |
| T-011 | Hydrate generic `tool_call` arguments from canonical metadata arguments/query fields at segment start/end | `autobyteus-web/services/agentStreaming/protocol/segmentTypes.ts`, `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | C-009 | frontend unit tests |
| T-012 | Add regression tests for web-search canonical lifecycle + mirror suppression + tool_call argument hydration | `autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`, `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | C-010 | backend + frontend unit tests |

## Execution Order
1. T-001
2. T-003
3. T-002
4. T-004
5. T-005
6. T-006
7. T-007
8. T-008
9. T-009
10. T-010
11. T-011
12. T-012

## Risks / Mitigations
- Risk: duplicate activity entries on late SEGMENT_START.
- Mitigation: keep activity add idempotent by invocation id and avoid duplicate synthetic insertion.

## Done Criteria
- All acceptance criteria AC-001..AC-009 satisfied.
- New tests pass.
- No regression in existing targeted streaming tests.
