# Implementation Revision Record — autobyteus-515 (`native-tool-search-515`)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 2 (pass) | N/A | `Initial Baseline` | SR-004, ARCH-REV-002 | Implemented design steps 1–6; ready for code review |

## Revision Entries

### IR-001 — Tool search on the native runtime, initial implementation

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md` (ARCH-REV-002, round 2, `Pass`)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation of design-spec steps 1–6 at commit `8065d773e0` (plus the ticket documents commit that carries this record); implementation-scoped checks in `implementation-handoff.md` Checks Run
- Related solution revision IDs: SR-001 (requirements), SR-003 (founder's agreement), SR-004 (design)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: first implementation round
- Approved behavior or requirement IDs affected: BEH-001, BEH-002, BEH-003, BEH-005; REQ-001…REQ-007 (implemented), REQ-008/REQ-009 (evaluation script written, full run left to API/E2E)
- Implementation delta:
  - `autobyteus-ts/src/agent/tool-search/` (new): `AgentToolSearch` (request tool set, frozen `search_tools` description, keyword search, the two runtime tools), `search-tools-tool.ts`, `call-tool.ts` (call-tool contract: `toCalledToolInvocation`, `toModelToolCall`, `toModelToolName`, the `call_tool` tool that answers malformed calls)
  - Wiring: `AgentConfig.listedToolNames` (+ `copy`), `AgentRuntimeState.toolSearch`, `AgentFactory` creates it, `AgentContext.toolSearch` (throws when missing) and `getTool` fallback to the runtime tools, `LlmPhase` asks `requestToolSchemas` and passes `toolSearchEnabled`, `LlmResponseStreamCollector`/`LlmStreamingResponseHandler` convert at stream end and name the real tool in END; `ToolInvocation.calledThrough`; `llm-phase-tools.ts` removed (no caller left)
  - Memory (DS-003): (a) `raw-trace-ingestion.ts` registration: raw `tool_call` real + `called_through`, working-context spec `toModelToolCall`, the same specs to `nativeTurnMetadata`; (b) `MemoryManager.ingestToolResults`: working-context result named `toModelToolName(rawCall.toolName, rawCall.calledThrough)`; (c) repairer: inserted result named by the working-context call, repair record carries `rawToolName`/`rawToolArgs` from the raw call fact (`ToolCallFact.toolArgs` added), `memory-manager-tool-protocol-safety.ts` writes the raw recovery trace from them; `CompletedToolResultFact.toolName` removed (no reader left); `RawTraceItem.calledThrough` / `called_through`
  - `ToolSchemaProvider.formatDefinitions`; OpenAI normalizer leaves an object without declared `properties` open (implementation decision, see handoff "Known Risks")
  - Server: `AutoByteusAgentRunBackendFactory` passes `AUTOBYTEUS_DEFAULT_TOOL_NAMES` as `listedToolNames`
  - Tests: new unit and integration tests, gated live suite; existing tests updated where the change replaced behavior (hand-built agent states get a tool search; repairer record fields; golden snapshot `calledThrough: null`; server e2e/live suites that read native request tools)
  - Docs: `GLOSSARY.md` (three terms), `autobyteus-ts/docs/tool_schema_and_configuration.md` (§4.4, §4.5, new §4.8)
  - Evaluation: `evidence/evaluate-tool-search.mjs`
- Changed files or areas: see `git show --stat 8065d773e0`
- Local validation and result: `implementation-handoff.md` Checks Run (IMP-01…)
- Next recipient or routing: code reviewer (Medium / High route)
- Remaining limitations or risks: `implementation-handoff.md` Known Risks; FU-003, FU-004
