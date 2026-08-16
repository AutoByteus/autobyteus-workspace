# API-F-006 — Codex Team TOOL_LOG admission rejects a real provider event

## Result

- API/E2E revision: `API-REV-005`
- Scenario: `API-UTD-CODEX-EVENT-006`
- Result: `Fail`
- Preliminary failure origin: implementation source at the Codex raw-response-to-Team-event boundary
- Design impact: none currently identified; the existing one-projector/strict-admission architecture remains the intended owner

## Expected

A real Codex Team turn may emit provider tool-output/log events. Every admitted Team event must carry the exact fields required by the strict Team adapter and projector, so the browser receives a contiguous truthful stream without a terminal `TEAM_AGENT_EVENT_ADMISSION_FAILED` error.

## Observed

The current checked-disposable Codex Team row used a real root Team, real Codex sessions, the exact production task tools, and the current Team WebSocket. The coordinator delegated `/worker`; the fresh task Agent called `submit_task_result`; the coordinator called `review_task_result`; and the task durably reached `accepted` with one submission and one review. During that same valid turn, the WebSocket emitted:

```text
ERROR
code: TEAM_AGENT_EVENT_ADMISSION_FAILED
message: Rejected TOOL_LOG: tool_name is required
error_scope: runtime
error_effect: terminal
agent_run_id: utd_coordinator_api_rev_005_1786807916040_9617c71255164105adb0af2508161105
```

The runner consequently observed no coordinator `TURN_COMPLETED`, even though the exact formal task lifecycle later committed and settled. This is not model call-election variance: the required tool calls succeeded, and the failure is a deterministic strict event-admission mismatch.

## Source-boundary correlation

`codex-raw-response-event-converter.ts` creates `AgentRunEventType.TOOL_LOG` for a completed `functioncalloutput` with `log_entry` and optional `tool_invocation_id`, but it does not derive or include `tool_name`. `team-agent-event-adapter.ts` requires non-empty `tool_name` for every `TOOL_LOG` and converts its absence into the terminal admission error observed on the wire.

The strict Team adapter must not be weakened and no alias/fallback should be added. The bounded correction should make the authoritative Codex native/provider conversion supply the truthful tool name when it creates a Team-admissible tool log, or omit a raw response event that is not a valid current tool log according to the approved event lifecycle. The code reviewer should confirm the exact owner and correction shape.

## Fixture correction distinguished from the product failure

The first disposable definitions omitted configured `submit_task_result` and `review_task_result`, while current design intentionally auto-adds only `get_handoff_rules`, `send_message_to`, and `delegate_task`. API/E2E corrected those disposable definitions through the normal GraphQL update boundary and created fresh runs. After correction, AutoByteus, Codex, and Claude each completed real delegate -> submit -> accept. Therefore the earlier missing-tool observation is an API/E2E fixture issue and is not this finding.

## Evidence

- `../live/provider/universal-delegation-fixture-tools-update.json`
- `../live/provider/fixture-codex-tool-configured-create.json`
- `../live/provider/fixture-codex-formal-lifecycle.json`
- `../live/provider/fixture-codex-formal-lifecycle.log`
- `api-f006-source-boundary-audit.log`
- `api-f006-evidence.sha256`
- `../live/browser/desktop-codex-tool-log-admission-failure.png`

## Safety

The row used only the API-REV-005 checked disposable runtime, database, Team definitions, Agents, workspace, and ports. Operational database action: `NONE`. Protected port/process action on `60004`/`31004`: `NONE`.
