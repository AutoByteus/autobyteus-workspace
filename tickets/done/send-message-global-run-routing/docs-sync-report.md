# Docs Sync Report

## Scope

- Ticket: `send-message-global-run-routing`
- Trigger: API/E2E coverage investigation/execution passed and post-API/E2E coverage-code re-review Round 2 passed; code review/docs-impact verdict required durable docs updates for public `send_message_to` selector semantics and Skill Self-Evolver helper-authored outcomes.
- Bootstrap base reference: `origin/personal` at `e76f16b3301e2003f3c715d0ff86661a8a3dbde1` (`v1.3.53`) from the upstream investigation context.
- Integrated base reference used for docs sync: `origin/personal` at `e76f16b3301e2003f3c715d0ff86661a8a3dbde1`, verified by `git fetch origin personal` on 2026-06-12; local ticket branch `HEAD` and latest tracked remote base were already identical (`ahead/behind 0/0`).
- Post-integration verification reference: no base commits were integrated in the original delivery refresh or the renewed Round 2 delivery refresh, so no implementation executable rerun was required by delivery; docs/artifact-only delivery edits were checked with `git diff --check` (passed).

## Why Docs Were Updated

- Summary: Long-lived server, frontend, and legacy-boundary docs now describe `send_message_to` as a shared agent-communication tool with selector-based routing: `recipient_name` is the team-local Team Communication route, while `target_agent_run_id` is an exact currently active `AgentRun.runId` direct route. Docs also now record that Skill Self-Evolver helpers use one grant-constrained `self_evolution_outcome` direct message and that delivery outcomes are recorded as sent/rejected/target-inactive/not-attempted.
- Why this should live in long-lived project docs: These are public model-facing tool semantics and operator/runtime expectations, not ticket-local implementation details. Future runtime adapter, Team Communication, artifact/reference, self-evolution, and frontend work must preserve the live-only direct route and must not accidentally restore old recoverable/lazy/team-projection behavior for public `target_agent_run_id` delivery.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Needed a canonical long-lived module doc for the new shared `src/agent-communication` boundary. | Updated | New module doc added. |
| `autobyteus-server-ts/docs/modules/README.md` | Module index should surface the new canonical agent communication doc. | Updated | Added Agent Communication row. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Public tool inventory needs the selector split and direct-route semantics. | Updated | Added server-owned agent communication tool section. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Existing team communication docs described `send_message_to` as team-delivery only. | Updated | Clarified `recipient_name` team route vs `target_agent_run_id` global live direct route. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Claude first-party MCP tool docs needed shared dispatcher/direct route wording. | Updated | Clarified handler calls shared dispatcher. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex dynamic-tool docs needed standalone/team selector semantics. | Updated | Clarified Codex `send_message_to` uses shared dispatcher. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Team Communication reference docs needed to exclude direct exact-run reference projection. | Updated | Clarified Team Communication references are for accepted `recipient_name` deliveries. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Feature design doc could otherwise imply all `send_message_to.reference_files` become Team Communication references. | Updated | Clarified direct exact-run references stay runtime input/event metadata. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Streaming protocol doc needed Team Communication processor input narrowed to team-route events. | Updated | Clarified direct exact-run events omit team projection fields. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Codex raw event mapping mentioned team `send_message_to` only. | Updated | Clarified shared agent-communication selector semantics. |
| `autobyteus-server-ts/docs/modules/self_evolution.md` | Skill Self-Evolver docs still described generic/system notification behavior. | Updated | Updated to helper-authored `self_evolution_outcome` and live-target checks. |
| `autobyteus-web/docs/skills.md` | Frontend skills docs included stale self-evolution completion notification wording. | Updated | Updated to helper-authored outcome summary. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture docs duplicated stale self-evolution and Team Communication reference wording. | Updated | Updated outcome and team-route reference semantics. |
| `autobyteus-web/docs/settings.md` | This doc duplicates relevant frontend architecture sections. | Updated | Kept duplicate durable docs in sync. |
| `autobyteus-web/docs/agent_artifacts.md` | Frontend artifact/reference doc needed to exclude direct exact-run messages from Team Communication references. | Updated | Clarified accepted `recipient_name` only. |
| `autobyteus-ts/docs/agent_team_design.md` | Legacy/native boundary doc should not imply `send_message_to` is only server team communication. | Updated | Clarified server-owned `recipient_name` and direct active-run routes. |
| `autobyteus-web/docs/agent_teams.md` | Checked for self-evolution target wording. | No change | Existing selected-active-member wording remains accurate. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Checked Team Communication projection wording. | No change | Existing team projection persistence wording remains accurate and does not describe direct route. |
| `autobyteus-web/docs/content_rendering.md` | Checked message-owned reference rendering wording. | No change | Existing wording concerns Team Communication `referenceFiles` rendering only. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | New canonical module doc | Added scope, selector semantics, team route, global direct route, grant policy, runtime projection, and out-of-scope boundaries. | Future agents need one durable source of truth for `src/agent-communication`. |
| `autobyteus-server-ts/docs/modules/README.md` | Index update | Added Agent Communication module row. | Make new doc discoverable. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Public tool contract update | Added `send_message_to` selector split and standalone direct-route availability. | Public tool behavior changed materially. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team route clarification | Reworded mixed-team communication contract around selector-based dispatch and direct route no-projection behavior. | Prevent future team work from reclaiming public `target_agent_run_id` direct delivery. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Claude runtime doc update | Clarified first-party MCP handler uses shared dispatcher. | Keep Claude lifecycle docs aligned with new shared boundary. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex runtime doc update | Clarified dynamic `send_message_to` uses shared dispatcher and works for configured standalone exact active-run delivery. | Keep Codex integration docs aligned. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Reference projection update | Clarified Team Communication references apply to accepted team-route messages only. | Direct exact-run references do not become Team tab reference rows. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Reference flow update | Clarified `recipient_name` route is the Team Communication reference flow and direct exact-run references stay runtime metadata. | Avoid stale artifact/reference mental model. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Streaming event contract update | Clarified Team Communication processor consumes team-route `INTER_AGENT_MESSAGE` events only. | Direct events intentionally omit projection fields. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Lifecycle mapping update | Clarified `send_message_to` is not team-only in Codex docs and selector behavior belongs to shared dispatcher. | Keep raw event mapping semantics current. |
| `autobyteus-server-ts/docs/modules/self_evolution.md` | Self-evolution runtime update | Added `send_message_to` requirement, live-target check, direct grant, exact final outcome call, and sent/rejected/inactive/not-attempted records. | Skill Self-Evolver behavior changed from generic notification to helper-authored outcome. |
| `autobyteus-web/docs/skills.md` | Frontend self-evolution update | Replaced stale completion notification wording with helper-authored outcome behavior. | Operator-facing skill docs must match backend behavior. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture update | Updated self-evolution outcome and Team Communication reference-store wording. | Frontend docs duplicated stale assumptions. |
| `autobyteus-web/docs/settings.md` | Frontend duplicate-doc update | Mirrored relevant `agent_execution_architecture.md` changes. | Keep generated/parallel docs consistent. |
| `autobyteus-web/docs/agent_artifacts.md` | Frontend artifact/reference update | Clarified Team Communication references are accepted `recipient_name` deliveries; direct exact-run messages do not create Team Communication rows. | Prevent UI work from projecting direct messages into Team tab. |
| `autobyteus-ts/docs/agent_team_design.md` | Native boundary update | Clarified native package does not own either server `send_message_to` route. | Keep decommissioned-native docs aligned with server-owned semantics. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Public `send_message_to` selector semantics | `recipient_name` is team-local; `target_agent_run_id` is global exact active `AgentRun.runId`; selectors are mutually exclusive and aliases reject. | Requirements doc, design spec, implementation handoff, code review report, API/E2E reports | `autobyteus-server-ts/docs/modules/agent_communication.md`, `agent_tools.md` |
| Live-only direct exact-run routing | Direct route resolves only through `AgentRunManager.getActiveRun`; inactive, unknown, preallocated, lazy-startable, and recoverable-only ids fail closed. | Requirements doc, design spec, API/E2E execution coverage report | `agent_communication.md`, `agent_tools.md`, `agent_team_execution.md` |
| Team Communication projection boundary | Only accepted `recipient_name` team-route messages create Team Communication rows/reference files; direct exact-run events omit `team_run_id` and projection fields. | Design spec, implementation handoff, API/E2E execution coverage report | `agent_communication.md`, `agent_artifacts.md`, artifact serving design, websocket protocol, frontend artifact docs |
| Runtime adapter ownership | AutoByteus, Codex, and Claude expose configured `send_message_to` through thin wrappers/registrations over the shared dispatcher. | Implementation handoff, code review report | `agent_communication.md`, `agent_execution.md`, `codex_integration.md` |
| Skill Self-Evolver final outcome | Helper receives a narrow grant and should send one `self_evolution_outcome` to the still-active target; records distinguish sent/rejected/target-inactive/not-attempted. | Requirements doc, implementation handoff, API/E2E execution coverage report | `self_evolution.md`, frontend skill/architecture docs |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Public `target_agent_run_id` as team-owned recoverable/lazy exact-run route | Global live-only direct route through `AgentRunManager.getActiveRun` | `autobyteus-server-ts/docs/modules/agent_communication.md`; `agent_tools.md`; `agent_team_execution.md` |
| All `send_message_to.reference_files` imply Team Communication reference projection | Only accepted `recipient_name` team-route messages project Team Communication references; direct exact-run references stay runtime metadata | `agent_communication.md`; `agent_artifacts.md`; `artifact_file_serving_design.md`; frontend artifact docs |
| Skill Self-Evolver generic/system completion notification as the primary completion report | Helper-authored `self_evolution_outcome` direct message plus persisted outcome status | `self_evolution.md`; `autobyteus-web/docs/skills.md`; frontend architecture/settings docs |
| Native `autobyteus-ts` ownership of `send_message_to` semantics | Server-owned `agent-communication` and server team delivery boundaries | `autobyteus-ts/docs/agent_team_design.md`; `autobyteus-server-ts/docs/modules/agent_communication.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — docs changes were required and completed.
- Rationale: N/A.


## Round 2 Coverage-Code Re-Review Reassessment

- Reassessment trigger: `code_reviewer` reported post-API/E2E durable coverage-code re-review Round 2 passed after API/E2E added `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`.
- Latest tracked base after renewed refresh: `origin/personal` at `e76f16b3301e2003f3c715d0ff86661a8a3dbde1`; local ticket `HEAD` remained identical (`ahead/behind 0/0`).
- Docs impact of Round 2 coverage addition: no additional long-lived docs changes required. The new durable E2E validates the already-documented public semantics (`target_agent_run_id` active-only direct route, no Team Communication projection, configured Codex runtime exposure) and does not change product/runtime behavior.
- Delivery artifact impact: update delivery/handoff reports to include Round 2 code review and the new durable E2E evidence.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed after verifying the ticket branch was already current with latest tracked `origin/personal`, and was reassessed after Round 2 coverage-code re-review. API/E2E added durable coverage before Round 2 code review; delivery itself changed only long-lived docs and delivery artifacts. Delivery remains ready for user verification hold.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A

## Finalization Note

User approved finalization on 2026-06-12 with no new release/version. This ticket artifact folder was moved to `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/done/send-message-global-run-routing/` before the final commit.
