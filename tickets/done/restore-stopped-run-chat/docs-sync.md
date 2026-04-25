# Docs Sync Report

## Scope

- Ticket: `restore-stopped-run-chat`
- Trigger: post-validation durable-validation re-review passed (`review-report.md`, latest round `Pass`, score `9.3/10`) after API/E2E validation passed and durable WebSocket integration coverage was re-reviewed.
- Bootstrap base reference: `origin/personal @ cef8446452af13de1f97cf5c061c11a03443e944`
- Integrated base reference used for docs sync: `origin/personal @ cef8446452af13de1f97cf5c061c11a03443e944`
- Post-integration verification reference: delivery refresh on 2026-04-25 fetched `origin` and confirmed `HEAD`, merge-base, and `origin/personal` all remained at `cef8446452af13de1f97cf5c061c11a03443e944` (`git rev-list --left-right --count HEAD...origin/personal` -> `0 0`). No new base commits were integrated, so the authoritative review/API-E2E checks still apply to the integrated state.

## Why Docs Were Updated

- Summary: promoted the implemented stopped-run follow-up recovery behavior into long-lived backend and frontend docs. The docs now state that WebSocket connect and `SEND_MESSAGE` resolve/restore stopped-but-persisted single-agent and team runs, while stop/tool-control messages remain active-only. They also record the frontend team termination cache update rule.
- Why this should live in long-lived project docs: this ticket changes durable runtime/API behavior at the WebSocket/run-service boundary and durable frontend lifecycle state semantics. Future stream-handler, run-history, and team UX work needs the recovery boundary documented outside ticket-local artifacts so the clean service-owned restore path is preserved and stale frontend-cache assumptions are not reintroduced.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Owns runtime behavior for `/ws/agent/:runId` and `/ws/agent-team/:teamRunId`. | `Updated` | Added restore-aware connection/`SEND_MESSAGE`, active-only control command, and close-code semantics. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Owns agent/team streaming operational notes. | `Updated` | Added service-owned restore boundary, recoverable chat command, active-only non-send commands, and not-found/stream-unavailable behavior. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Owns team restore and team runtime/service boundaries. | `Updated` | Added `TeamRunService.resolveTeamRun(...)` restore-aware boundary and team follow-up activity-recording rule. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Owns persisted resume metadata and active/inactive state truth. | `Updated` | Added active/inactive resume-config responsibility and successful-backend-termination-only team inactive marking. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Owns frontend store lifecycle and streaming orchestration. | `Updated` | Added frontend/backend stopped-run follow-up recovery model and team termination state behavior. |
| `autobyteus-web/docs/agent_teams.md` | Owns frontend team run lifecycle behavior. | `Updated` | Added stopped team follow-up and termination-state section. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Checked because single-agent stream recovery touches agent run execution/service ownership. | `No change` | Existing doc is intentionally high-level and delegates streaming detail to `agent_streaming.md`. |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | Checked because app integrations use the same streaming endpoints. | `No change` | Existing guide remains a minimal start/streaming guide; the durable recovery contract now lives in the architecture/protocol docs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | WebSocket protocol behavior | Added restore-aware connect/`SEND_MESSAGE`, active-only `STOP_GENERATION`/tool-approval commands, and error/close semantics. | Gives future API/WebSocket work one canonical protocol description for stopped-run recovery. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Backend operational notes | Documented run-service resolution, session rebinding before chat send, not-found/stream-unavailable close codes, and immediate activity recording on accepted team follow-up sends. | Prevents future handler changes from returning to active-only chat dispatch or frontend-only recovery assumptions. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team restore boundary | Documented `TeamRunService.resolveTeamRun(...)` as the allowed restore-aware lookup for connect/send, with active-only non-send controls. | Keeps team restore/persistence docs aligned with the implemented team WebSocket recovery path. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Resume state ownership | Added active/inactive resume-config truth and successful-backend-termination-only cache transition guidance. | Keeps run-history state semantics aligned with frontend team termination and backend restore behavior. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend lifecycle architecture | Documented single-agent/team follow-up recovery, explicit restore mutation use, backend WebSocket fallback recovery, active-only control commands, and team termination success/failure behavior. | Gives frontend store work durable guidance for stopped-run follow-up chat and team local-state teardown. |
| `autobyteus-web/docs/agent_teams.md` | Frontend team module behavior | Added stopped team follow-up and termination state section. | Keeps team UX docs aligned with restored follow-up chat and the no-fake-inactive-on-failed-termination rule. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Restore-aware WebSocket connect | `/ws/agent/:runId` and `/ws/agent-team/:teamRunId` resolve through `AgentRunService.resolveAgentRun(...)` / `TeamRunService.resolveTeamRun(...)` before binding sessions. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md`, `review-report.md` | `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-server-ts/docs/modules/agent_streaming.md` |
| Recoverable chat send | `SEND_MESSAGE` is the recovery-capable command; handlers re-resolve/rebind the runtime subject before posting follow-up user input to a stopped-but-persisted run/team. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-server-ts/docs/modules/agent_streaming.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Active-only non-send controls | `STOP_GENERATION`, `APPROVE_TOOL`, and `DENY_TOOL` intentionally do not restore stopped runs as a side effect. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md`, `review-report.md` | `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-server-ts/docs/modules/agent_streaming.md`, `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Team termination state parity | Persisted teams are torn down and marked inactive in frontend run history only after backend termination succeeds; failed termination leaves local stream/member state intact. | `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/agent_teams.md` |
| Team follow-up activity recording | Accepted restored team follow-up messages refresh team metadata/history with active status and latest activity summary. | `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/agent_streaming.md`, `autobyteus-server-ts/docs/modules/agent_team_execution.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Active-only stream-handler lookup for chat sends after stop/restart | Restore-aware `resolveAgentRun(...)` / `resolveTeamRun(...)` on connect and `SEND_MESSAGE`, with session subscription rebinding before posting. | `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-server-ts/docs/modules/agent_streaming.md` |
| Frontend cache as the only team stopped-run recovery path | Backend WebSocket connect/`SEND_MESSAGE` recovery as the authoritative final boundary, with frontend explicit restore still used when resume config is known inactive. | `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/agent_teams.md` |
| Local team inactive teardown before confirmed backend termination | Backend-success-first termination followed by local stream teardown, inactive resume-cache marking, and history refresh. | `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-web/docs/agent_teams.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed after confirming the ticket branch was current with `origin/personal`. Delivery can proceed to user-verification hold; no repository finalization, archival, release, or deployment should occur before explicit user verification.
