# Docs Sync Report

## Scope

- Ticket: `status-lifecycle-hardening`
- Trigger: Delivery-stage docs synchronization after Round 5 code review passed following API/E2E Round 2 durable live streaming validation updates.
- Bootstrap base reference: `origin/personal` at `d2b4f4331e95e49a3109b851463b8bae0d48ecae`
- Integrated base reference used for docs sync: `origin/personal` at `d2b4f4331e95e49a3109b851463b8bae0d48ecae` after `git fetch origin personal` on 2026-05-18.
- Post-integration verification reference: ticket branch `codex/status-lifecycle-hardening`; `HEAD`, latest tracked `origin/personal`, and merge-base were all `d2b4f4331e95e49a3109b851463b8bae0d48ecae`, so no base commits were integrated before docs sync.

## Why Docs Were Updated

- Summary: The final reviewed implementation is no longer only a command-start overlay/projector refactor. It also includes the native status regression correction and the canonical status event cleanup: native AutoByteus runtime liveness status now flows through `AGENT_STATUS { status }`, `AGENT_STATUS_UPDATED` is removed from the canonical runtime/server/frontend path, `new_status` / `old_status` transition fields are removed from agent/team liveness status payloads, fine-grained native statuses remain internal, and server/frontend status remains coarse public `offline` / `initializing` / `idle` / `running` / `error`.
- Why this should live in long-lived project docs: This is a cross-package status contract affecting `autobyteus-ts`, `autobyteus-server-ts`, WebSocket consumers, and frontend bridge/state docs. Future runtime/status work needs to know which boundary owns fine-grained native status, where the public coarse projection happens, why mutable native snapshots cannot turn known live members offline, and that old liveness event/update-field names are intentionally obsolete rather than temporarily tolerated.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Canonical backend team execution/status/member identity doc. | Updated | Records overlay-store ownership, mixed subteam source-path `TEAM_STATUS`, native projector ownership, explicit native `AGENT_STATUS` precedence over stale snapshots, observed live-status fallback while active, inactive cleanup, fine-grained-to-coarse projection, and removal of `AGENT_STATUS_UPDATED` from the canonical path. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Canonical server WebSocket/GraphQL status transport contract. | Updated | Clarifies outbound agent/team status emits only current `status` plus documented metadata; not transition fields. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Detailed server WebSocket streaming protocol design. | Updated | Clarifies normalized status payload shape and excludes native runtime transition-field names from server transport. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Runtime-specific raw-to-normalized mapping reference. | Updated | Clarifies Codex public status projection does not emit legacy transition-field transport. |
| `autobyteus-ts/docs/lifecycle_event_sourced_engine_design.md` | Native AutoByteus lifecycle/event-sourced engine design. | Updated | Replaces external status contract from `AGENT_STATUS_UPDATED` / `AgentStatusUpdateData` to `AGENT_STATUS` / `AgentStatusData` with `status` and optional `previous_status`. |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | Native AutoByteus team streaming protocol. | Updated | Replaces team status payload fields from `new_status` / `old_status` to `status` / `previous_status`. |
| `autobyteus-ts/docs/agent_team_design.md` | Native AutoByteus team behavior design. | Updated | Updates team status payload description to `status`, optional `previous_status`, and optional `error_message`. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend status and event handling architecture. | Updated | Clarifies frontend receives coarse statuses and excludes legacy transition-field names / fine-grained runtime phases. |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | Minimal bridge guidance for consumers of agent/team streams. | Updated | Clarifies `AGENT_STATUS` carries current public status and no legacy transition-field names. |
| `README.md` | Root overview/release/build guidance. | No change | The status-event contract details are subsystem-level and belong in package/module docs, not root setup/release guidance. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | High-level backend architecture overview. | No change | Existing module/design docs are the durable location for this status contract detail. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Backend team status lifecycle / ownership invariant | Added `TeamCommandStatusOverlayStore` as the bounded pending command-start overlay owner; corrected mixed subteam status to represented-team/source-path `TEAM_STATUS`; added `AutoByteusTeamMemberStatusProjector`; added native explicit `AGENT_STATUS` precedence, observed active status fallback, inactive cleanup, fine-grained-to-coarse projection, and no `AGENT_STATUS_UPDATED` canonical path. | Future backend/runtime work must not reintroduce raw overlay maps, duplicated native identity policy, stale-snapshot false-offline behavior, or dual old/new liveness status event names. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Public server transport contract | Clarified agent/team status payloads emit current `status` plus documented metadata only. | WebSocket consumers must not expect native transition-field names. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Protocol detail | Clarified normalized `status` payload and excluded native runtime transition-field names from WebSocket status transport. | Keeps protocol guidance aligned with the final server contract. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Runtime mapping consistency | Reworded Codex status output to exclude legacy transition-field transport. | Keeps runtime mapping docs consistent with the one-current-status contract. |
| `autobyteus-ts/docs/lifecycle_event_sourced_engine_design.md` | Native runtime status event contract | Replaced `AGENT_STATUS_UPDATED` / `AgentStatusUpdateData` docs with `AGENT_STATUS` / `AgentStatusData` and `status` / optional `previous_status`. | Documents the canonical native runtime liveness status event name and payload. |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | Native team stream payload contract | Replaced `new_status` / `old_status` with `status` / `previous_status`. | Aligns native team stream docs with implementation and cleanup greps. |
| `autobyteus-ts/docs/agent_team_design.md` | Native team status payload description | Replaced status payload field names with current `status` and optional `previous_status`. | Avoids preserving obsolete liveness status payload names in design docs. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend status contract | Clarified frontend receives coarse public status and no legacy transition-field names. | Prevents frontend code from reasoning over native fine-grained statuses or obsolete transition fields. |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | Bridge integration guidance | Clarified `AGENT_STATUS` has no legacy transition-field names. | Keeps minimal bridge consumers aligned with server transport. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Pending team command-start overlay ownership | `TeamCommandStatusOverlayStore` owns only pending command-start overlays per backend/handle instance; it is not a global status manager and does not own target resolution or runtime startup/send sequencing. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Native AutoByteus status identity/projection | `AutoByteusTeamMemberStatusProjector` canonicalizes configured member run id, native agent id, member name, route key, member path, and runtime context for backend snapshots and native event processing. | `requirements.md`, `design-spec.md`, `native-status-regression-rework.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Native explicit status event precedence | Native runtime `AGENT_STATUS { status }` is the primary liveness status edge. Mutable native snapshots enrich/fallback only and must not convert known live active members to `offline` because a snapshot is stale/missing. | `native-status-regression-rework.md`, `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Observed status cache lifecycle | Known active native members may use observed live status when current snapshots are stale; observed overlays are skipped/cleared for inactive backend or terminal cleanup so statuses do not become immortal. | `native-status-regression-rework.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Fine-grained native status vs coarse public status | `autobyteus-ts` preserves fine-grained internal status vocabulary, while `autobyteus-server-ts` projects those states to coarse public app/WebSocket status. | `native-status-regression-rework.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-ts/docs/lifecycle_event_sourced_engine_design.md`, `autobyteus-server-ts/docs/modules/agent_streaming.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Canonical liveness status event name and payload | The canonical runtime/server/frontend liveness status event is `AGENT_STATUS` with current `status`; `AGENT_STATUS_UPDATED`, `agent_status_updated`, `AgentStatusUpdateData`, `new_status`, and `old_status` are not part of the in-repository liveness status path. | `requirements.md`, `design-spec.md`, `native-status-regression-rework.md`, `api-e2e-report.md`, `review-report.md` | `autobyteus-ts/docs/lifecycle_event_sourced_engine_design.md`, `autobyteus-ts/docs/agent_team_streaming_protocol.md`, `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-web/docs/agent_integration_minimal_bridge.md` |
| Mixed subteam startup status shape | Mixed subteam command startup is represented as team/source-path `TEAM_STATUS` and projected into the represented parent row, not as fabricated leaf-member `AGENT_STATUS`. | `requirements.md`, `design-spec.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `team-member-command-start-status-overlays.ts` helper around caller-owned maps | `team-command-status-overlay-store.ts` owning pending member and team/source-path overlay lifecycle | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Backend-local pending overlay maps and mixed-member local command status override fields | Per-backend/handle `TeamCommandStatusOverlayStore` instances | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Native AutoByteus member identity/projection duplicated in backend snapshot code and event processor code | `AutoByteusTeamMemberStatusProjector` | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Mutable native snapshot as an authoritative status override for explicit live status events | Explicit native `AGENT_STATUS { status }` primary, snapshot fallback/enrichment, observed live status fallback while active | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| `AGENT_STATUS_UPDATED` / `agent_status_updated` as canonical liveness status event | `AGENT_STATUS` | `autobyteus-ts/docs/lifecycle_event_sourced_engine_design.md`, `autobyteus-server-ts/docs/modules/agent_streaming.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| `new_status` / `old_status` liveness status fields | `status` / optional `previous_status` metadata | `autobyteus-ts/docs/agent_team_streaming_protocol.md`, `autobyteus-ts/docs/agent_team_design.md`, `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — long-lived docs were updated.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed after confirming the ticket branch was already current with latest tracked `origin/personal`. The earlier local Electron build from a prior delivery state was replaced by a fresh current-state macOS Electron build, with artifact manifest and checksums recorded under `validation-evidence/`.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
