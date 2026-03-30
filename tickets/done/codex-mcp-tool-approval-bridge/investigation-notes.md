# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Triage Rationale: `The change spans multiple Codex runtime and frontend streaming layers, adds unit and live websocket E2E coverage, and now includes a user-verified frontend visibility gap in the Codex auto-exec path that appears to have never been implemented correctly.`
- Investigation Goal: `Reconstruct and verify the implemented Codex MCP approval bridge for the real tts/speak tool, then explain why the auto-exec path runs audibly but does not appear in frontend Activity.`
- Investigation Goal: `Reconstruct and verify the implemented Codex MCP approval bridge for the real tts/speak tool, then explain why the auto-exec path first ran invisibly in Activity and now still settles at parsed instead of success after tool completion.`
- Primary Questions To Resolve:
  - `How does Codex represent MCP tool approval internally for the speak tool?`
  - `Where in our runtime do we map that internal request into public tool events?`
  - `What changes were made to support auto-exec and manual approval semantics?`
  - `Do durable tests prove both paths with the real Codex runtime?`
  - `Why does approvalPolicy="never" still show an internal server request?`
  - `Why does auto-executed Codex MCP activity remain invisible in the frontend even though the tool audibly runs?`
  - `Is the missing frontend Activity entry caused by missing public lifecycle events, wrong segment typing, or both?`
  - `Does Codex emit a completion signal for MCP tool calls that should allow the frontend to show success rather than parsed?`

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-03-30 | Repo | `git diff --stat -- autobyteus-server-ts/src/agent-execution/backends/codex autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts autobyteus-server-ts/tests/unit/agent-execution/backends/codex` | Quantify current change scope | 11 files changed, 550 insertions, 16 deletions in the relevant Codex runtime/test scope | No |
| 2026-03-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts` | Verify the new MCP approval bridge entrypoint | `mcpServer/elicitation/request` is recognized and bridged; auto mode replies `{ action: "accept" }`, manual mode emits a local tool-approval event | No |
| 2026-03-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Verify approval-response ownership | Manual approvals emit `LOCAL_TOOL_APPROVED`; approval records now carry response mode/tool metadata; pending MCP tool calls are tracked in-thread | No |
| 2026-03-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | Verify where pending MCP calls enter the bridge | `mcpToolCall` `item/started` notifications are tracked before approval resolution | No |
| 2026-03-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts` | Verify public event normalization | Local MCP approval events normalize into `TOOL_APPROVAL_REQUESTED` and `TOOL_APPROVED` | No |
| 2026-03-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Verify Codex startup config | `autoExecuteTools=true` maps to `approvalPolicy="never"`, and that policy is passed directly to `thread/start`/`thread/resume` | No |
| 2026-03-30 | Spec | `/tmp/codex_app_schema_out/v2/ThreadStartParams.json`, `/tmp/codex_app_schema_out/ServerRequest.json` (generated from `codex app-server generate-json-schema --out /tmp/codex_app_schema_out`) | Understand Codex protocol semantics | Local schema shows `approvalPolicy` supports a granular form with `mcp_elicitations`; `mcpServer/elicitation/request` is modeled as its own server-request type | No |
| 2026-03-30 | Log | `/tmp/codex-thread-events/codex-run-88d147a3-ff6f-4488-b3ce-9e349b64f2b3.jsonl` | Capture manual live `speak` trace | Manual run shows `mcpToolCall` start, local `toolApprovalRequested`, local `toolApproved`, `serverRequest/resolved`, `mcpToolCall` completion, and `function_call_output={"ok":true}` | No |
| 2026-03-30 | Log | `/tmp/codex-thread-events/codex-run-526fb360-3233-4955-a573-a08de5e1eb8a.jsonl` | Capture auto live `speak` trace | Auto run shows `mcpToolCall` start, `serverRequest/resolved`, `mcpToolCall` completion, and `function_call_output={"ok":true}`; no local/public approval-request event is surfaced | No |
| 2026-03-30 | Command | `RUN_CODEX_E2E=1 RUNTIME_RAW_EVENT_DEBUG=1 CODEX_THREAD_EVENT_DEBUG=1 CODEX_THREAD_RAW_EVENT_DEBUG=1 CODEX_THREAD_RAW_EVENT_LOG_DIR=/tmp/codex-thread-events pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "routes Codex MCP tool approval over websocket for the speak tool|auto-executes the Codex speak MCP tool without approval requests"` | Re-verify the real Codex speak-tool scenarios | Both live websocket E2Es passed against the real configured `tts/speak` MCP tool | No |
| 2026-03-30 | Command | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Verify unit-level bridge coverage | Unit coverage exists for auto-accept/manual MCP approval bridging and converter normalization | No |
| 2026-03-30 | Other | `User verification in the locally built Electron app` | Validate the real frontend behavior after Stage 10 handoff | Manual `autoExecuteTools=false` still shows `speak` in Activity with approval UI, but `autoExecuteTools=true` plays audio without any Activity entry | No |
| 2026-03-30 | Other | `User clarification after initial investigation reopen` | Correct whether the issue is new or pre-existing | User clarified this is not a newly introduced break; the auto-exec Activity path appears never to have been wired correctly for Codex | No |
| 2026-03-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | Check how Codex `mcpToolCall` items are classified into public segment types | `asSegmentType(...)` maps `functionCall` and `dynamicToolCall` to `tool_call`, but it does not map `mcpToolCall`, so `mcpToolCall` falls through to `text` | No |
| 2026-03-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts` | Verify the auto-approve public-event path | Auto mode immediately answers `{ action: "accept" }` and returns without emitting `LOCAL_TOOL_APPROVED` | No |
| 2026-03-30 | Code | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`, `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Verify what the frontend needs to create Activity entries | `segmentHandler` only adds Activity for `tool_call`/`write_file`/`run_bash`/`edit_file`, while `toolLifecycleHandler` can synthesize Activity from `TOOL_APPROVAL_REQUESTED` or `TOOL_APPROVED`; auto-exec currently supplies neither path reliably | No |
| 2026-03-30 | Code | `autobyteus-ts/src/agent/events/notifiers.ts`, `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Compare Codex auto-exec observability with existing runtime patterns | AutoByteus and Claude both preserve explicit `TOOL_APPROVED` plus `TOOL_EXECUTION_*` lifecycle events in their public contracts, even when permissions are bypassed/auto-executed | No |
| 2026-03-30 | Log | `/tmp/codex-thread-events-stage7-authoritative-final-1774883490/codex-run-41ed5c56-0df9-4acf-b445-20f3d3c701ca.jsonl`, `/tmp/codex-thread-events-stage7-authoritative-final-1774883490/codex-run-e299443d-4ec5-44ec-936e-81f0ea4f92f5.jsonl` | Determine whether Codex emits MCP tool completion signals for manual and auto speak-tool runs | Both manual and auto runs include `item/completed` for `mcpToolCall` with `item.status=\"completed\"`, `result.structuredContent={\"ok\":true}`, and a later `rawResponseItem/completed` `function_call_output`; Codex does emit completion, but our public converter currently reduces `mcpToolCall` completion to `SEGMENT_END` instead of `TOOL_EXECUTION_SUCCEEDED` | No |
| 2026-03-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-raw-response-event-converter.ts`, `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`, `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Explain why Activity ends as `parsed` instead of `success` | `TOOL_EXECUTION_SUCCEEDED` is only emitted for `commandexecution`; `mcpToolCall` completion currently emits `SEGMENT_END` and `TOOL_LOG`, and `TOOL_LOG` intentionally does not infer terminal success, so the segment finalizer leaves the visible tool state at `parsed` when no stronger success event arrives | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints: `CodexThreadManager.startRemoteThread`, `CodexThreadManager.resumeRemoteThread`, `CodexThread.handleAppServerRequest`, websocket runtime event conversion in `CodexThreadEventConverter`
- Execution boundaries: `thread/start` approval-policy setup, app-server `mcpServer/elicitation/request`, thread-local approval bookkeeping, public runtime-event normalization
- Owning subsystems / capability areas: `agent-execution/backends/codex/thread`, `agent-execution/backends/codex/events`, `tests/e2e/runtime`, `tests/unit/agent-execution/backends/codex`
- Optional modules involved: `thread` (approval bridge, pending-call tracking), `events` (local-to-public normalization), `runtime e2e tests` (live websocket contract verification)
- Folder / file placement observations: `thread` owns the server-request bridge and pending-call state; `events` owns normalization into public runtime events; tests are in the expected runtime/unit boundaries.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts` | `handleMcpToolApprovalRequest` | Bridges app-server requests into thread-local approval handling | This is the correct owner for converting Codex MCP elicitation into our runtime approval semantics | Keep request interpretation here |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | approval record storage + `approveTool` + pending MCP call registry | Thread-local state for approval lifecycle and app-server responses | Manual approval emits local approved event; auto mode currently responds directly without emitting a public approved event | Keep response ownership in thread |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | `item/started` tracking for `mcpToolCall` | Captures pending MCP tool call metadata early | Necessary so the later approval request can be matched to a tool invocation | Keep as notification-side tracking |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | local Codex event -> public runtime event mapping | Normalizes synthetic/local approval events | Correct place to convert `LOCAL_TOOL_APPROVAL_REQUESTED` and `LOCAL_TOOL_APPROVED` into public contract events | Keep event-shape logic here |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | `asSegmentType`, `resolveSegmentType` | Converts raw Codex item types into normalized public segment types | `mcpToolCall` is not currently recognized as `tool_call`, which explains why auto-exec can bypass frontend Activity creation | This file likely owns the missing type normalization |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | `handleSegmentStart` | Creates Activity entries from `SEGMENT_START` for tool segments only | If backend sends auto-exec `mcpToolCall` as `text`, the frontend intentionally does nothing for Activity | Frontend behavior matches the current contract and does not look like the root cause |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | `handleToolApprovalRequested`, `handleToolApproved` | Synthesizes tool segments/Activity when lifecycle events arrive before segments | Manual path works because `TOOL_APPROVAL_REQUESTED` hydrates Activity, while auto path currently has no matching `TOOL_APPROVED` emission | Auto-exec parity likely requires a public approval event or a correctly typed segment start |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | live websocket scenarios | End-to-end contract tests against real Codex runtime | Now covers real `tts/speak` manual and auto flows | Correct durable Stage 7 asset |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | `ITEM_COMPLETED` handling | Converts completed Codex items into public completion/lifecycle events | `commandexecution` emits `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED`, but `mcpToolCall` currently falls through to generic `SEGMENT_END` even when `item.status=\"completed\"` and a structured result is present | This is now the primary success-state gap |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-raw-response-event-converter.ts` | `RAW_RESPONSE_ITEM_COMPLETED` handling | Converts raw function call output into public log events | `function_call_output` becomes `TOOL_LOG` only; no success status is inferred from `{ \"ok\": true }` by design | Useful evidence, but not the right place to derive terminal success by itself |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-03-30 | Test | `RUN_CODEX_E2E=1 ... vitest run ... -t "routes Codex MCP tool approval over websocket for the speak tool|auto-executes the Codex speak MCP tool without approval requests"` | 2 live E2E tests passed | Manual and auto runtime contracts are executable today |
| 2026-03-30 | Log | Manual run JSONL sequences 26, 28, 31, 32, 34, 35 | Manual path shows local/public approval bridge before tool completion | Confirms the approval-request mapping path |
| 2026-03-30 | Log | Auto run JSONL sequences 106, 110, 112, 113 | Auto path skips the public approval-request event but still resolves the server request and completes the tool | Confirms internal request still exists but is auto-resolved |
| 2026-03-30 | Trace | Live debug stdout during the auto run | Codex still emitted `mcpServer/elicitation/request` before `serverRequest/resolved` even with `approvalPolicy="never"` | `never` does not eliminate the low-level MCP elicitation object in this Codex version; it only bypasses the user-visible pause in our integration |
| 2026-03-30 | Repro | `Locally built Electron app, temp workspace, Codex runtime, autoExecuteTools=true, user asks to call speak tool` | Audio plays and the assistant confirms success, but the Activity pane remains empty (`0 Events`) | The missing auto-exec Activity entry is user-visible and reproducible outside the test harness |
| 2026-03-30 | Trace | `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` helper `isMcpToolCallSegment(...)` | Existing live tests already recognize the raw Codex item type as `mcpToolCall` | Confirms the server receives the raw type we are currently failing to normalize into a frontend-visible `tool_call` segment |
| 2026-03-30 | Log | Manual JSONL sequence `33` and auto JSONL sequence `118` from `/tmp/codex-thread-events-stage7-authoritative-final-1774883490` | Both runs contain `item/completed` for `mcpToolCall` with `status=\"completed\"`, `error=null`, and `result.structuredContent.ok=true` | Codex provides enough provider-side completion data to emit a public success event |
| 2026-03-30 | Trace | `codex-item-event-converter.ts` `ITEM_COMPLETED` branch + frontend `toolLifecycleHandler.ts` success handling | Backend currently emits `SEGMENT_END` for completed `mcpToolCall`, while frontend only turns green on `TOOL_EXECUTION_SUCCEEDED` | The remaining status bug is in our normalization contract, not in Codex runtime output |

### External Code / Dependency Findings

- Upstream repo / package / sample examined: `local Codex app-server generated JSON schema`
- Version / tag / commit / release: `local installed codex app-server schema as of 2026-03-30`
- Files, endpoints, or examples examined: `/tmp/codex_app_schema_out/v2/ThreadStartParams.json`, `/tmp/codex_app_schema_out/ServerRequest.json`
- Relevant behavior, contract, or constraint learned: `approvalPolicy` supports a granular form including `mcp_elicitations`, and `mcpServer/elicitation/request` is a distinct request type in the Codex protocol`
- Confidence and freshness: `High / generated locally on 2026-03-30`

### Reproduction / Environment Setup

- Required services, mocks, or emulators: `local Codex app-server runtime and configured tts MCP server`
- Required config, feature flags, or env vars: `RUN_CODEX_E2E=1`, `RUNTIME_RAW_EVENT_DEBUG=1`, `CODEX_THREAD_EVENT_DEBUG=1`, `CODEX_THREAD_RAW_EVENT_DEBUG=1`, `CODEX_THREAD_RAW_EVENT_LOG_DIR=/tmp/codex-thread-events`
- Required fixtures, seed data, or accounts: `standard runtime test database reset used by the existing Vitest E2E harness`
- External repos, samples, or artifacts cloned/downloaded for investigation: `none`
- Setup commands that materially affected the investigation: `codex app-server generate-json-schema --out /tmp/codex_app_schema_out`
- Cleanup notes for temporary investigation-only setup: `schema and raw-event logs remain in /tmp for review; safe to remove after ticket closes`

## Constraints

- Technical constraints: `Codex app-server surfaces MCP tool approval through a generic elicitation request object rather than through the existing command/file approval methods.`
- Environment constraints: `Live runtime verification requires a working local Codex environment and the configured tts MCP server.`
- Third-party / API constraints: `Codex protocol behavior around approval policy and MCP elicitations is defined by the installed app-server, not solely by our wrapper.`

## Unknowns / Open Questions

- Unknown: `Should auto-exec also emit a public TOOL_APPROVED event for observability symmetry?`
- Why it matters: `It affects whether clients can observe auto-approval explicitly or must infer it from later tool lifecycle events.`
- Planned follow-up: `Re-evaluate during this re-entry because frontend parity now depends on whether auto-exec should synthesize approval visibility or rely only on segment normalization.`

- Unknown: `Is recognizing Codex mcpToolCall as tool_call sufficient for frontend parity, or do we also need explicit auto-mode TOOL_APPROVED emission to match existing auto-exec UX?`
- Why it matters: `Recognizing the segment type would restore Activity visibility, but it may still leave auto-exec status progression weaker than non-Codex runtimes.`
- Planned follow-up: `Compare the restored segment-only behavior against frontend expectations and existing non-Codex auto-exec lifecycles before finalizing the implementation path.`

- Unknown: `Why did the visible Activity card in the user's latest screenshot settle at parsed instead of approved before completion, even though the backend emits TOOL_APPROVED in the single-agent auto path?`
- Why it matters: `The green success gap is explained by the missing success event, but the exact parsed-vs-approved downgrade may still involve team-member routing or timing differences.`
- Planned follow-up: `Inspect the latest member-stream path separately if needed, but this does not change the confirmed missing-success-event root cause.`

## Implications

### Requirements Implications

- Requirement implication: `Manual and auto Codex MCP approval paths are separate observable contracts and both need dedicated acceptance criteria.`
- Requirement implication: `The public contract should be described in terms of normalized runtime events, not raw Codex internal requests.`

### Design Implications

- Design implication: `The bridge belongs in the Codex thread server-request handler because that is where request metadata, thread state, and runtime config meet.`
- Design implication: `Synthetic local approval events are the right normalization boundary before public runtime conversion.`
- Design implication: `Auto-exec semantics should be defined as immediate approval handling, not as absence of all low-level internal Codex request objects.`
- Design implication: `Frontend Activity visibility depends on the auto-exec path emitting at least one frontend-recognized tool entrypoint: either a correctly typed SEGMENT_START(tool_call) or a public tool lifecycle event such as TOOL_APPROVED.`
- Design implication: `For runtime parity, Codex should not be materially thinner than AutoByteus or Claude in the public auto-exec contract unless the frontend is explicitly designed for that difference.`

### Implementation / Placement Implications

- Implementation implication: `Pending MCP tool calls must be tracked from notification time so later approval requests can be correlated without stringly typed global lookups.`
- Implementation implication: `Event conversion should stay centralized in Codex event-converter files; tests should remain split between live runtime contract tests and unit bridge tests.`

## Re-Entry Additions

### 2026-03-30 Re-Entry Update

- Trigger: `Retrospective workflow audit requested after implementation already existed.`
- New evidence: `Live E2E rerun, raw event logs, and local Codex schema generation were captured as ticket evidence.`
- Updated implications: `The current implementation is functionally correct for manual and auto runtime contracts; the remaining design question is explicit auto-approval observability.`

### 2026-03-30 User Verification Re-Entry

- Trigger: `User verification of the locally built Electron app found that Codex auto-executed speak-tool calls play audio but do not appear in frontend Activity.`
- New evidence: `Frontend screenshots, local packaged-app repro, and direct code-path comparison across Codex parser/server/frontend handlers.`
- Updated findings:
  - `mcpToolCall` is a real raw Codex item type in our live E2E helpers, but the current Codex item payload parser does not normalize it to tool_call.`
  - `segmentHandler` only creates Activity for tool-related segment types, so an auto-exec mcpToolCall mislabeled as text becomes invisible in Activity.`
  - `autoExecuteTools=true` currently returns early after app-server accept and does not emit LOCAL_TOOL_APPROVED, so the auto path also misses the synthetic lifecycle fallback that manual mode uses.`
  - `Existing AutoByteus and Claude runtime contracts are more explicit: they expose TOOL_APPROVED and TOOL_EXECUTION_* events even for auto/bypass flows, so the current Codex auto path is weaker than established runtime behavior in this project.`
- Working hypothesis: `This is a real pre-existing gap in our Codex auto-exec visibility contract. The likely primary implementation fault is missing mcpToolCall -> tool_call normalization, with a secondary observability gap from missing public TOOL_APPROVED on auto-accept.`

### 2026-03-30 Parsed-Status Re-Entry

- Trigger: `User verification after the visibility fix showed the Codex speak tool in Activity, but the final state remained parsed instead of a green success state.`
- New evidence:
  - `Both manual and auto raw Codex JSONL logs contain item/completed for mcpToolCall with status=completed, error=null, and structured result { ok: true }.`
  - `The backend currently emits TOOL_EXECUTION_SUCCEEDED only for commandexecution and falls through to SEGMENT_END for completed mcpToolCall.`
  - `The frontend intentionally does not infer success from TOOL_LOG and only marks success on TOOL_EXECUTION_SUCCEEDED.`
- Updated findings:
  - `Codex does emit a usable MCP tool completion event after execution in both manual and auto modes.`
  - `Our public runtime contract is currently under-normalizing that completion event for mcpToolCall.`
  - `The remaining green-status gap is therefore in our backend event conversion, not in Codex provider output.`
- Working hypothesis: `The next fix should normalize completed mcpToolCall items into TOOL_EXECUTION_SUCCEEDED / TOOL_EXECUTION_FAILED using the same provider-side completion payload we already receive, while retaining SEGMENT_END for segment finalization.`
