# Docs Sync Report

## Scope

- Ticket: `mixed-team-nested-agent-team`
- Trigger: Delivery Round 38 after status design rework, implementation fix, API/E2E Round 20 pass, and delivery latest-base refresh.
- Bootstrap base reference: `origin/personal @ be56cab9b41b850c92690d79a8dfa70c52c369a0` (original ticket bootstrap context)
- Integrated base reference used for docs sync: `origin/personal @ 5f6e8ddec70d365dcb4021e573c37e439e3dc4fb`
- Current integrated ticket-branch reference: `f231d0e299502d98f65132efb6af274c5816736a fix(status): keep team status active for nested turns`
- Branch state against tracked base after refresh: `git rev-list --left-right --count origin/personal...HEAD` => `0 32` (`behind 0`, `ahead 32`).
- Post-integration verification reference: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/delivery-round38-post-refresh-checks.log`

## Why Docs Were Updated

- Summary: No additional delivery-local long-lived documentation edits were needed in Round 38. The current integrated docs already cover canonical public statuses, startup `initializing`, team/member status separation, nested source/member route/path identity, active-work status precedence, route/path-only command identity, and recursive team history/restore.
- Why this should live in long-lived project docs: These are durable API/runtime/UI contracts. Delivery verified the current long-lived docs after API/E2E Round 20 and found the status-source-of-truth behavior already reflected in backend/frontend docs.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `README.md` | Root release/build context and desktop release workflow. | No change | Release flows remain separate from this local pre-verification build. |
| `autobyteus-web/README.md` | README-selected desktop/Electron build command. | No change | Documents `pnpm build:electron:mac`; this is the command used for the Round 38 macOS build. |
| `autobyteus-web/docs/electron_packaging.md` | Desktop packaging architecture and artifact naming. | No change | Current artifact naming matches `AutoByteus_<flavor>_macos-{arch}-{version}.dmg/.zip`. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Authoritative WebSocket command/status/interrupt protocol. | No change | Covers canonical public statuses, startup normalization to `initializing`, aggregate/member status separation, active-work precedence, and route/path identity fields. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Backend streaming module behavior. | No change | Covers status normalization at transport boundary, team aggregate precedence, nested event source paths, and command/approval route/path identity. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Nested/mixed team execution, roster, restore, and target identity. | No change | Covers nested team topology, representative routing, source/member identity, restore, and member-scoped interrupt behavior. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Recursive team history and migration/restore projection. | No change | Covers canonical `memberTree`, projection dedupe, represented-subteam communication, and child top-level history exclusion. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend streaming/status/approval architecture. | No change | Covers immediate local `initializing`, canonical status enums, member `AGENT_STATUS` authority, aggregate `TEAM_STATUS`, and no aggregate fan-out to all members. |
| `autobyteus-web/docs/agent_teams.md` | Frontend nested team launch/open/focus/display behavior. | No change | Covers recursive route-key context, represented-subteam Team Messages, nested activity identity, and nested workspace rendering. |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | Minimal frontend status bridge contract. | No change | Covers `offline`/`initializing`/`idle`/`running`/`error` status API and startup-token projection. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Provider lifecycle to server status projection. | No change | Covers provider startup statuses projecting to `initializing` with `can_interrupt=false`. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| N/A | N/A | No delivery-local long-lived docs edits were required in Round 38. | Current integrated docs already match the reviewed and validated implementation. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Initializing/status source of truth | Frontend may apply immediate local `initializing` during startup/restore, while backend/public WebSocket emits canonical public statuses only; team aggregate status must not go idle before active member turns complete. | `round35-initializing-status-design-rework-note.md`, `round36-backend-status-source-of-truth-design-rework-note.md`, `api-e2e-validation-report.md` | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `agent_execution_architecture.md`, `agent_integration_minimal_bridge.md` |
| Nested mixed-team status identity | Child subteam member status must be visible on the parent team stream with parent-rooted `member_path`/`member_route_key` and `source_path`/`source_route_key`. | `round36-backend-status-source-of-truth-design-rework-note.md`, `round38-live-status-validation-evidence.json`, `api-e2e-validation-report.md` | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `agent_teams.md` |
| Clean-cut command identity | Team commands and application runtime controls target members by route key/path/run identity; scalar name/id aliases are rejected or retained only as diagnostics/negative tests. | `command-api-clean-cut-design-rework-note.md`, `review-report.md`, `api-e2e-validation-report.md` | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `agent_team_execution.md` |
| App-data migration for team metadata | Legacy flat team metadata is migrated to canonical `memberTree` when safe; unsafe/degraded nested topology is reported with warnings and backup/idempotency behavior. | `app-data-migration-design-rework-note.md`, `api-e2e-validation-report.md`, `review-report.md` | `run_history.md` |
| Electron local verification build | Local macOS verification builds follow `autobyteus-web/README.md` and produce unsigned/not-notarized personal artifacts under `autobyteus-web/electron-dist`. | `electron-build-report.md`, `electron-build.log` | `autobyteus-web/README.md`, `autobyteus-web/docs/electron_packaging.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Frontend dependence on raw provider lifecycle tokens as public status values | Canonical public status payloads plus local startup projection to `initializing`. | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `agent_execution_architecture.md` |
| Aggregate `TEAM_STATUS` fan-out to every member row | Member status comes from member `AGENT_STATUS`; aggregate `TEAM_STATUS` is aggregate-only. | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `agent_execution_architecture.md` |
| Premature aggregate idle while a member/nested child turn is active | Active-work precedence and nested child status bridge into the parent stream. | `agent_websocket_streaming_protocol.md`, `agent_streaming.md` |
| Scalar member-name/member-id command target authority | Route-key/path selectors and structured runtime target fields. | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `agent_team_execution.md` |
| Flat mixed-team/run-history metadata as source of truth | Recursive `memberTree` and migration-safe restore/index behavior. | `agent_team_execution.md`, `run_history.md` |

## No-Impact Decision

- Docs impact: `No additional delivery-local docs changes needed`
- Rationale: The feature has documentation impact, and the current integrated source state already contains the long-lived docs updates required for the reviewed/API-E2E-passed behavior. Delivery reviewed the relevant backend/frontend/README docs after refreshing `origin/personal` and found no stale instructions that require another docs edit.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Continue to user-verification handoff. Repository finalization, ticket archive, merge, push, release, deployment, and cleanup remain held until explicit user verification.
