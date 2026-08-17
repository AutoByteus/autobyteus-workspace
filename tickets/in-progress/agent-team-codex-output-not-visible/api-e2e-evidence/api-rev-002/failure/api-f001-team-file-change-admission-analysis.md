# API-F-001 — Team FILE_CHANGE rejects the current internal AgentRun payload

## Result

- Scenario IDs: `API-RUNTIME-TEAM-009B`, `API-RUNTIME-TEAM-009C`
- Result: **Fail**
- Preliminary owner: implementation source, pending `code_reviewer` failure-origin review
- Reproduced through: real checked-disposable Team launches in AutoByteus `open_tab`
- Providers/runtimes: AutoByteus / `deepseek-v4-flash`; Claude Agent SDK / configured `deepseek-v4-flash`
- Standalone comparison: all three Daily Assistant runtime rows passed; the failure is specific to Team event admission/projection.

## Expected

A real Team member file write should produce one admitted Team `FILE_CHANGE` event, project its canonical Team wire DTO, and render without a red rejection.

## Observed

Both the AutoByteus and Claude Team journeys rendered:

`Rejected FILE_CHANGE: file_change_id is required`

The Claude classroom still completed its business round trip and emitted `CLASSROOM_CLAUDE_OK`; the red rejection nevertheless proves that the supported Team file-change user surface is not clean. AutoByteus encountered the same rejection during the Student write.

## Source-boundary evidence

The current internal producer is `FileChangePayloadBuilder`. It truthfully creates `AgentRunFileChangePayload` with:

- `id`
- `runId`
- `path`
- `type`
- `status`
- `sourceTool`
- `sourceInvocationId`
- `content` when present
- `createdAt`
- `updatedAt`

`TeamAgentEventAdapter`, which consumes that internal AgentRun event, instead requires wire-shaped `file_change_id`/`fileChangeId` and `file_type`/`fileType`. Therefore the actual producer output cannot satisfy the adapter, and admission fails before `TeamAgentEventWebsocketProjector` can perform its proper snake-case wire projection.

Relevant paths:

- `autobyteus-server-ts/src/agent-execution/events/processors/file-change/file-change-payload-builder.ts`
- `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-agent-event-adapter.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-agent-event-websocket-projector.ts`

Focused source audit: `api-f001-file-change-id-source-audit.log`.

## Failure-origin assessment

This is preliminarily an implementation integration defect in the shared Team adapter boundary, not independent provider failures. AutoByteus and Claude both reach the same adapter with the same current internal payload contract, explaining the identical rejection. The reasonable clean-cut correction is for the internal adapter to consume the canonical internal payload once, while the existing WebSocket projector remains the sole wire naming owner. `code_reviewer` must confirm the exact source owner and ensure no compatibility alias/dual reader is introduced.

## Non-finding clarification

The Claude nested `TaskOutput` response (`No task found with ID ...`) is retained only as a provider/model behavior observation. The exact delegation, peer request, reverse reply, and teacher result all succeeded, and the user explicitly does not classify that provider-native tool choice as a product defect. It is not `API-F-001`.

## Evidence

- `../live/browser/classroom-autobyteus-deepseek-file-change-failure.png`
- `../live/browser/classroom-claude-deepseek-file-change-failure.png`
- `../live/browser/classroom-claude-deepseek-final-with-file-change-errors.png`
- `../live/provider/classroom-autobyteus-deepseek-failure.json`
- `../live/provider/classroom-claude-deepseek-final.json`
- `../live/provider/runtime-browser-matrix-summary.json`
- `api-f001-file-change-id-source-audit.log`

All screenshots above were captured through the real `open_tab` browser session and visually inspected. The target used only the owned disposable database/runtime and was removed after evidence capture; operational data was not accessed.
