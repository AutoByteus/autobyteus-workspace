# Docs Sync Report

## Scope

- Ticket: `conversation-target-addressing`
- Trigger: Delivery-stage docs impact from code review, then supplemental live-browser/live-UI evidence. Latest trigger was API/E2E PASS from the resumed real `open_tab` live UI validation after Code Review Round 5.
- Bootstrap base reference: `origin/personal` at `820bce314520` during bootstrap.
- Integrated base reference used for docs sync: `origin/personal` at `7b61278ca90a`, fetched on 2026-06-27 and merged into `codex/conversation-target-addressing` by local integration merge `2fa908b6ade5` after safety checkpoint `1b7312e35889`.
- Post-integration verification reference: Base had advanced by 4 commits since the prior delivery integration. Delivery merged the latest tracked base and reran focused checks. PASS: server build typecheck; focused server conversation/AutoByteus suite (6 files / 56 tests); focused task-delegation suite (4 files / 23 tests); focused frontend suite (3 files / 65 tests); `git diff --check`; local unsigned macOS Electron build.

## Why Docs Were Updated

- Summary: Long-lived frontend and server docs were updated from the old structural route-key-only user-message targeting model to the implemented recursive `ConversationTargetAddress` model. They also now record the AutoByteus native task-delegation context invariant required by the live UI `delegate_task -> task-team projection -> child chat` path: the native context must preserve typed member/team rows, team-definition ids, coordinator/ingress identity, and runtime run ids so visible team targets such as `BuildSquad` remain resolvable during local AutoByteus tool execution.
- Why this should live in long-lived project docs: Team chat target routing and server-owned task delegation are durable frontend/backend/runtime behavior. Future maintainers need to know that runtime task-team/task-agent participants are first-class ordinary chat targets through typed segments, and that AutoByteus task-delegation wrappers must round-trip the same typed team roster advertised in prompts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/agent_execution_architecture.md` | Frontend store/composer docs named the removed route-only resolver and old text-send target behavior; later base merge also touched this doc. | Updated | Documents `resolveTeamConversationTargetAddressResult(...)`, typed runtime projection targets, local target key ownership, and `SEND_MESSAGE.conversation_target_address`. Rechecked after latest-base merge and Round 6 `open_tab` evidence. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/settings.md` | Duplicate frontend architecture/settings doc carried the same stale route-only resolver text; later base merge also touched this doc. | Updated | Kept in sync with `agent_execution_architecture.md`; duplicate sync check passed after latest-base merge. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/agent_teams.md` | Team-focus docs described user-message focus as a route key and outbound sends as `target_member_route_key`. | Updated | Separates roster focus, `ConversationTargetAddress` user-message focus, and active-execution command focus. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/modules/agent_streaming.md` | Server streaming docs described team `SEND_MESSAGE` as normalized to `TeamMemberSelector` from flat fields only. | Updated | Documents canonical nested address payloads, flat structural compatibility normalization, scalar rejection, and no structural fallback. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team execution docs needed the durable boundary between structural selectors, chat addresses, exact runtime task ids, and native AutoByteus task-delegation context. | Updated | Adds `ConversationTargetAddress` as team chat contract and documents typed AutoByteus `teamContext` round-trip for `delegate_task` team-target resolution. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime/tool-family docs mention AutoByteus task-delegation tools and `MemberTeamContext`. | Updated | Records that AutoByteus native execution round-trips task-delegation context through `initialCustomData.teamContext` and must preserve typed `agent` / `agent_team` rows and ingress identity. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | WebSocket protocol docs described only flat team target fields for team runs. | Updated | Adds canonical `conversation_target_address` example, segment rules, flat compatibility, and invalid-target/no-fallback constraints. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/ARCHITECTURE.md` | Searched because it mentions team dispatch remaining team-container-owned. | No change | Statement remains accurate and does not describe flat-selector-only user-message targeting. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/agent_integration_minimal_bridge.md` | Searched because it documents `SEND_MESSAGE` and team metadata. | No change | It did not contain stale team chat or AutoByteus native task-delegation context details requiring update. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/modules/codex_integration.md` | Reviewed for task-delegation context notes. | No change | Codex-specific statement remains accurate; the Round 5 fix is AutoByteus-native-context specific. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture behavior | Replaced `resolveTeamUserMessageTarget(...)` / route-key-only text-send description with typed address resolver, runtime projection targets, local target key, and canonical payload. | Matches implemented frontend resolver/service/store behavior and browser-captured frames. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/settings.md` | Frontend architecture behavior | Mirrored the same frontend text-send and resolver update. | Keeps duplicate doc accurate. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/docs/agent_teams.md` | Team UX and target model | Updated focus model from route-key user-message focus to typed `ConversationTargetAddress`; recorded local target key vs backend routing address. | Prevents maintainers from rebuilding route-only targeting or hiding runtime projections from ordinary chat. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/modules/agent_streaming.md` | Server streaming protocol/runtime | Updated team `SEND_MESSAGE` normalization and dispatch docs from `TeamMemberSelector` flat fields to `ConversationTargetAddress`. | Documents handler/parser boundary and no-fallback invalid target behavior. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/modules/agent_team_execution.md` | Domain/runtime architecture | Added chat-address segment contract and exact task runtime id routing; narrowed `TeamMemberSelector` to structural/control identities; documented typed AutoByteus `teamContext` preservation for team-target `delegate_task`. | Promotes design/runtime invariants proven by Round 6 `open_tab` evidence into canonical team execution docs. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/modules/agent_execution.md` | Tool/runtime architecture | Added AutoByteus native task-delegation context round-trip requirement. | Prevents regression to primitive native context that drops `agent_team` rows and blocks live task-team creation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | WebSocket protocol | Added `conversation_target_address` JSON example, segment order rules, flat compatibility, scalar rejection, and runtime invalid-target handling. | Makes the external team WebSocket protocol durable and testable. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Recursive team chat target contract | Ordinary team chat is addressed by a typed path rooted at the WebSocket-bound parent team run. | Requirements, design spec, implementation handoff, API/E2E report, live browser smoke report, live UI open-tab report | Server protocol/streaming/team execution docs |
| Frontend resolver split | The frontend resolver returns both backend `ConversationTargetAddress` and local target key; active-execution command focus remains separate. | Design spec, implementation handoff, live browser/open-tab evidence | Frontend architecture/team docs |
| Flat selector compatibility boundary | `target_member_route_key` / `target_member_path` are parser-bound compatibility input for structural sends only and normalize to one `member` segment. | Requirements, design spec, API/E2E report | Server protocol/streaming/team execution docs |
| Runtime no-fallback invariant | Stale/missing/malformed task-team/task-agent runtime segments fail as invalid targets and must not fall back to structural templates or coordinator routes. | Requirements, code review report, API/E2E report, live browser/open-tab evidence | Server protocol/streaming/team execution docs |
| AutoByteus native task-delegation context | Native AutoByteus tool execution must preserve typed member/team delegation roster entries from `MemberTeamContext` so visible team targets can be resolved during `delegate_task`. | Design impact response, implementation handoff, code review Round 5, API/E2E Round 6 report | `agent_team_execution.md`, `agent_execution.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `resolveTeamUserMessageTarget(...)` route-only frontend resolver | `resolveTeamConversationTargetAddressResult(...)` and `ConversationTargetAddress` segment construction | Frontend docs listed above |
| Outbound route-key-only team chat (`SEND_MESSAGE.target_member_route_key` as the frontend routing contract) | Canonical `SEND_MESSAGE.conversation_target_address` with parser-bound flat structural compatibility | Server protocol/streaming docs and frontend docs listed above |
| Runtime task ids encoded or implied through route keys/fallbacks | Explicit `task_team` / `task_agent` segments with exact run ids and invalid-target no-fallback behavior | Server protocol/streaming/team execution docs |
| Primitive AutoByteus native task-delegation context that drops subteam metadata | Typed `TaskDelegationContextMember` roster with `agent_team` rows, `teamDefinitionId`, coordinator/ingress identity, and runtime ids | `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `autobyteus-server-ts/docs/modules/agent_execution.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete against the integrated/latest-base state. Repository finalization remains intentionally held until explicit user verification.
