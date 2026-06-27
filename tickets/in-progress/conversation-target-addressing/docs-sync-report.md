# Docs Sync Report

## Scope

- Ticket: `conversation-target-addressing`
- Trigger: Delivery-stage docs impact from code review, then supplemental Round 4 code-review handoff requiring reconciliation with API/E2E Round 2 live browser evidence.
- Bootstrap base reference: `origin/personal` at `820bce314520` during bootstrap.
- Integrated base reference used for docs sync: `origin/personal` at `ad4c1d690c5d`, fetched on 2026-06-27 and merged into `codex/conversation-target-addressing` by local integration merge `54aa1a617eeb` after local safety checkpoint `ef601628bd0f`.
- Post-integration verification reference: Base had advanced by 4 commits since bootstrap/initial delivery refresh, so delivery merged the latest tracked base and reran focused checks. PASS: focused server suite (6 files / 52 tests), focused frontend suite (3 files / 65 tests), and `git diff --check`.

## Why Docs Were Updated

- Summary: Long-lived frontend and server docs were updated from the old structural route-key-only user-message targeting model to the implemented recursive `ConversationTargetAddress` model. The docs now distinguish ordinary team chat addressing from active-only control-command targeting, describe parser-bound flat selector compatibility, and record no-fallback behavior for malformed/stale runtime segments. Supplemental live browser evidence corroborated this documented behavior, so no additional long-lived docs changes were required after Round 4 beyond reconciling ticket delivery artifacts.
- Why this should live in long-lived project docs: Team chat target routing is a durable frontend/backend protocol and runtime behavior. Future maintainers need to know that runtime task-team/task-agent participants are first-class ordinary chat targets through typed segments, not encoded route strings or lifecycle-command side effects.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/agent_execution_architecture.md` | Frontend store/composer docs named the removed route-only resolver and old text-send target behavior. | Updated | Documents `resolveTeamConversationTargetAddressResult(...)`, typed runtime projection targets, local target key ownership, and `SEND_MESSAGE.conversation_target_address`. Rechecked after Round 4 live-browser evidence and latest-base merge; still accurate. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/settings.md` | Duplicate frontend architecture/settings doc carried the same stale route-only resolver text. | Updated | Kept in sync with `agent_execution_architecture.md`; duplicate sync check passed after latest-base merge. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/agent_teams.md` | Team-focus docs described user-message focus as a route key and outbound sends as `target_member_route_key`. | Updated | Separates roster focus, `ConversationTargetAddress` user-message focus, and active-execution command focus. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/modules/agent_streaming.md` | Server streaming docs described team `SEND_MESSAGE` as normalized to `TeamMemberSelector` from flat fields only. | Updated | Documents canonical nested address payloads, flat structural compatibility normalization, scalar rejection, and no structural fallback. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team execution docs needed the durable boundary between structural selectors, chat addresses, and exact runtime task ids. | Updated | Adds `ConversationTargetAddress` as team chat contract and keeps `TeamMemberSelector` scoped to structural/control identities. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | WebSocket protocol docs described only flat team target fields for team runs. | Updated | Adds canonical `conversation_target_address` example, segment rules, flat compatibility, and invalid-target/no-fallback constraints. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/ARCHITECTURE.md` | Searched because it mentions team dispatch remaining team-container-owned. | No change | Statement remains accurate and does not describe flat-selector-only user-message targeting. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/agent_integration_minimal_bridge.md` | Searched because it documents `SEND_MESSAGE`. | No change | It is standalone-agent focused and did not contain stale team targeting details. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/live-browser-smoke-report.md` | Reviewed as supplemental evidence source for docs truthfulness. | No change | Ticket evidence confirms browser-emitted canonical typed addresses and backend invalid-target/no-fallback behavior. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture behavior | Replaced `resolveTeamUserMessageTarget(...)` / route-key-only text-send description with typed address resolver, runtime projection targets, local target key, and canonical payload. | Matches implemented frontend resolver/service/store behavior and Round 4 browser-captured frames. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/settings.md` | Frontend architecture behavior | Mirrored the same frontend text-send and resolver update. | Keeps duplicate doc accurate. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/agent_teams.md` | Team UX and target model | Updated focus model from route-key user-message focus to typed `ConversationTargetAddress`; recorded local target key vs backend routing address. | Prevents maintainers from rebuilding route-only targeting or hiding runtime projections from ordinary chat. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/modules/agent_streaming.md` | Server streaming protocol/runtime | Updated team `SEND_MESSAGE` normalization and dispatch docs from `TeamMemberSelector` flat fields to `ConversationTargetAddress`. | Documents handler/parser boundary and no-fallback invalid target behavior. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/modules/agent_team_execution.md` | Domain/runtime architecture | Added chat-address segment contract and exact task runtime id routing; narrowed `TeamMemberSelector` to structural/control identities. | Promotes design invariant into canonical team execution docs. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | WebSocket protocol | Added `conversation_target_address` JSON example, segment order rules, flat compatibility, scalar rejection, and runtime invalid-target handling. | Makes the external team WebSocket protocol durable and testable. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Recursive team chat target contract | Ordinary team chat is addressed by a typed path rooted at the WebSocket-bound parent team run. | Requirements, design spec, implementation handoff, API/E2E report, live browser smoke report | `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-server-ts/docs/modules/agent_streaming.md`, `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Frontend resolver split | The frontend resolver returns both backend `ConversationTargetAddress` and local target key; active-execution command focus remains separate. | Design spec, implementation handoff, live browser smoke report | `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_teams.md` |
| Flat selector compatibility boundary | `target_member_route_key` / `target_member_path` are parser-bound compatibility input for structural sends only and normalize to one `member` segment. | Requirements, design spec, API/E2E report | Server protocol/streaming/team execution docs |
| Runtime no-fallback invariant | Stale/missing/malformed task-team/task-agent runtime segments fail as invalid targets and must not fall back to structural templates or coordinator routes. | Requirements, code review report, API/E2E report, live browser smoke report | `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-server-ts/docs/modules/agent_streaming.md`, `autobyteus-server-ts/docs/modules/agent_team_execution.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `resolveTeamUserMessageTarget(...)` route-only frontend resolver | `resolveTeamConversationTargetAddressResult(...)` and `ConversationTargetAddress` segment construction | `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_teams.md` |
| Outbound route-key-only team chat (`SEND_MESSAGE.target_member_route_key` as the frontend routing contract) | Canonical `SEND_MESSAGE.conversation_target_address` with parser-bound flat structural compatibility | Server protocol/streaming docs and frontend docs listed above |
| Runtime task ids encoded or implied through route keys/fallbacks | Explicit `task_team` / `task_agent` segments with exact run ids and invalid-target no-fallback behavior | `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-server-ts/docs/modules/agent_streaming.md`, `autobyteus-server-ts/docs/modules/agent_team_execution.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete against the integrated/latest-base state. Repository finalization remains intentionally held until explicit user verification.
