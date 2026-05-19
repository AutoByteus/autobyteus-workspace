# Docs Sync Report

## Scope

- Ticket: `individual-agent-initializing-status`
- Trigger: Post-validation durable-validation re-review passed for the post-delivery command-correlated overlay replacement package on `2026-05-18`.
- Bootstrap base reference: `origin/personal` at `bea1185cde5b77dde7a565983f103085cba8178a`.
- Latest tracked base reference used for integrated docs sync: `origin/personal` at `83d077d3f035f8517a80dd2a8470fa819e835f20`.
- Base advancement: `Yes`; `origin/personal` advanced by 3 commits after the prior delivery pass.
- Safety checkpoint before integration: local checkpoint commit `44a4fb2681950bd3f46c50fcc2487806f6b720b9` preserved the reviewed/validated candidate before merging the newer base.
- Integration method/result: merged `origin/personal` into `codex/individual-agent-initializing-status` with the default `ort` merge strategy; no conflicts; integrated local head `300cd30b8dd0b612742ae2151e88ae478bbb5ee7`.
- Integration evidence:
  - `tickets/in-progress/individual-agent-initializing-status/delivery-checks/integration-refresh-command-correlated-20260518.log`
  - `tickets/in-progress/individual-agent-initializing-status/delivery-checks/pre-integration-checkpoint-command-correlated-20260518.log`
  - `tickets/in-progress/individual-agent-initializing-status/delivery-checks/base-merge-command-correlated-20260518.log`
- Post-merge verification evidence:
  - `tickets/in-progress/individual-agent-initializing-status/delivery-checks/post-merge-command-correlated-e2e-20260518.log`
  - `tickets/in-progress/individual-agent-initializing-status/delivery-checks/post-merge-server-build-typecheck-20260518.log`

## Why Docs Were Updated

- Summary: The final reviewed implementation is a backend-owned standalone lifecycle architecture with command-correlated overlay replacement. A restored inactive standalone run must show `offline -> initializing -> running` for a resend; restored runtime readiness or an already-`running` restored status snapshot must remain internal until command-correlated post-handoff evidence arrives.
- Why this should live in long-lived project docs: The command overlay replacement boundary is a durable protocol/runtime contract. Future work must not reintroduce the old frontend local placeholder behavior, standalone restore-before-send orchestration, or the post-delivery restore-snapshot bridge that caused `offline -> initializing -> running -> initializing -> running` flicker.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Backend command coordinator and runtime lifecycle source of truth. | `Updated` | Documents command overlays, prepared identities, activation/cancel/cleanup, and command-correlated overlay replacement; restored runtime snapshots/readiness do not clear overlays. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Operational websocket/streaming notes. | `Updated` | Added explicit note that restored readiness/snapshot does not replace the overlay; replacement waits for command-correlated evidence. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Canonical transport protocol for websocket clients. | `Updated` | Documents `AGENT_COMMAND_ACK`, required command identity, idempotency, busy rejection, and command-correlated replacement rules. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Run-history projection and overlay precedence. | `Updated` | Documents `status`, `isActive`, `shouldConnectStream`, `statusSource`, command overlay precedence, and prepared identity metadata. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | External-channel messaging runtime spine. | `Updated` | Documents standalone external-channel dispatch through `AgentRunCommandCoordinator` with stable external command identity. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend store/streaming architecture. | `Updated` | Added frontend-facing command-correlated replacement guidance; clients must keep backend `initializing` visible until command-correlated evidence. |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | Minimal frontend bridge/integration guide. | `Updated` | Added bridge guidance not to treat restored readiness/snapshots as visible overlay replacements. |
| `autobyteus-web/docs/agent_teams.md` | Team-focused lifecycle guide. | `No change` | Team member initializing behavior remains accurate; this ticket preserves team-container ownership and changes standalone command overlay replacement. |
| `autobyteus-web/docs/messaging.md` | User-facing managed messaging docs. | `No change` | Durable external-channel dispatch detail belongs in server architecture docs; user-facing setup guidance remains accurate. |
| `README.md` and `autobyteus-web/README.md` | Delivery/release and Electron build instructions. | `No change` | Build instructions remain accurate; Electron flavor override is recorded in packaging docs and delivery artifacts for this ticket's personal test build. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Backend architecture update | Added/retained standalone command coordinator, registry idempotency/concurrency, command overlays, prepared-run activation, cancellation/cleanup, and command-correlated overlay replacement. | Captures backend as lifecycle source of truth and prevents restored runtime readiness from becoming visible status authority. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Operational protocol update | Added explicit restored-readiness/restored-snapshot non-replacement rule for `SEND_MESSAGE` overlays. | Prevents future stream handler work from clearing overlays on bind/restore alone. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Canonical protocol update | Added `AGENT_COMMAND_ACK`, `prepareAgentRun`, command identity, idempotent duplicate semantics, busy rejection, command overlays, and command-correlated replacement rules. | Makes the websocket command contract explicit for all clients. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Projection/metadata update | Added status projection fields and precedence plus explicit prepared identity metadata state. | Future history/status work must preserve command overlays and prepared identities. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | External-channel runtime update | Clarified `ChannelAgentRunFacade` uses the command coordinator with stable external `message_id` / `dedupe_key`. | External standalone dispatch inherits the same backend-owned lifecycle/idempotency behavior. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture update | Replaced standalone restore-before-send guidance with `PrepareAgentRun`, durable run identity connect, command identity, backend-owned status, and command-correlated overlay replacement guidance. | Keeps frontend implementation guidance aligned with the clean backend-owned lifecycle boundary. |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | Integration guide update | Added minimal bridge requirements for prepared identities, command identity, `AGENT_COMMAND_ACK`, non-restore standalone send flow, and command-correlated overlay replacement. | Helps downstream/minimal integrations avoid the superseded lifecycle split and flicker-prone restored-snapshot path. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Backend-owned standalone lifecycle | Backend `SEND_MESSAGE` owns restore/start/activation/send and publishes `Initializing`; frontend must not invent lifecycle status or restore before standalone send. | `requirements.md`, `design-spec.md`, `design-architecture-pivot-notes.md`, `implementation-handoff.md`, `review-report.md`, `api-e2e-validation-report.md` | `agent_execution.md`, `agent_streaming.md`, `agent_websocket_streaming_protocol.md`, `agent_execution_architecture.md`, `agent_integration_minimal_bridge.md` |
| Command-correlated overlay replacement | Runtime readiness, bind success, metadata active hints, and restored `running` snapshots are internal while an inactive-start command overlay is active. Visible replacement waits for `TURN_STARTED`, command-correlated `AGENT_STATUS`, terminal/error events after handoff, or coordinator failure handling. | `design-post-delivery-rework-notes.md`, `api-e2e-validation-report.md`, `review-report.md` | `agent_execution.md`, `agent_streaming.md`, `agent_websocket_streaming_protocol.md`, `agent_execution_architecture.md`, `agent_integration_minimal_bridge.md` |
| Durable E2E coverage | `agent-command-correlated-status.e2e.test.ts` verifies the restored/inactive resend sequence through the production Fastify websocket route: `offline -> initializing -> running` with no visible restored-snapshot `running` before command-correlated `TURN_STARTED`. | `api-e2e-validation-report.md`, `review-report.md` | This docs sync report and handoff summary; runtime contract docs above. |
| Command identity and idempotency | Standalone `SEND_MESSAGE` requires `message_id` and `dedupe_key`; `(runId, message_id)` is idempotent; different concurrent commands are rejected with `RUN_COMMAND_IN_PROGRESS`. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `agent_execution.md`, `agent_websocket_streaming_protocol.md`, `agent_integration_minimal_bridge.md` |
| Prepared run identities | New first-message flow prepares durable identity and metadata without starting runtime; first command activates it; abandoned prepared identities can be cancelled/cleaned. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `agent_execution.md`, `run_history.md`, `agent_websocket_streaming_protocol.md`, `agent_execution_architecture.md`, `agent_integration_minimal_bridge.md` |
| External-channel standalone dispatch | Standalone external-channel dispatch uses `AgentRunCommandCoordinator` with stable external message identity and inherits websocket command lifecycle semantics. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md`, `review-report.md` | `ARCHITECTURE.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Frontend standalone `RestoreAgentRun -> connect websocket -> SEND_MESSAGE` as lifecycle truth | Backend-owned standalone `SEND_MESSAGE` command coordinator with command overlays and prepared/historical activation | `agent_execution.md`, `agent_streaming.md`, `agent_websocket_streaming_protocol.md`, `agent_execution_architecture.md`, `agent_integration_minimal_bridge.md` |
| Frontend lifecycle-status placeholder for standalone accepted sends | Backend `AGENT_STATUS` / `AGENT_COMMAND_ACK.status` from command overlay and runtime status projection | Backend/frontend docs listed above |
| Restore-snapshot bridge / broad active-runtime snapshot replacement while command overlay is active | Command-correlated replacement only after accepted message handoff evidence | `agent_execution.md`, `agent_streaming.md`, `agent_websocket_streaming_protocol.md`, frontend docs listed above |
| Inferring prepared-new identity from missing `platformAgentRunId` | Explicit `activationState` metadata (`PREPARED`, `ACTIVATING`, `ACTIVATED`, `ACTIVATION_FAILED`) | `run_history.md`, `agent_execution.md` |
| Direct external-channel standalone `AgentRun.postUserMessage()` dispatch | `ChannelAgentRunFacade` dispatch through `AgentRunCommandCoordinator` | `ARCHITECTURE.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed after merging the latest tracked `origin/personal` and rerunning the command-correlated E2E plus server build-source typecheck. Repository finalization, ticket archival, push/merge to the target branch, release, deployment, and cleanup remain blocked pending explicit user verification/finalization authorization.

## Blocked Or Escalated Follow-Up

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
