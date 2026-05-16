# Docs Sync Report

## Scope

- Ticket: `mixed-team-nested-agent-team`
- Trigger: Delivery docs sync after API/E2E Round 7 and code review Round 14 for upward nested-team reporting, representative participant addressing, bridge source-path/source-root corrections, and represented-subteam projection/display.
- Bootstrap base reference: `origin/personal @ be56cab9b41b850c92690d79a8dfa70c52c369a0`
- Integrated base reference used for current docs sync: `origin/personal @ b056b5f809dacb27524e492f3acef16630969e1b`
- Current integrated ticket-branch reference: `d76f8ee803904bde51609cfefe9ea42aeb04e646`
- Handoff state current with latest tracked remote base: `Yes` (`git rev-list --left-right --count origin/personal...HEAD` => `0 6`).

## Why Docs Were Updated

- Summary: Long-lived server and frontend docs now describe recursive nested-team topology, path/route-key member identity, selector-based team commands, nested event source paths, recursive restore metadata, member input/external user message projection, scoped representative communication rosters, upward child-to-parent reporting, represented-subteam Team Communication metadata, and frontend recursive focus/opened-label state.
- Why this should live in long-lived project docs: These behaviors define durable runtime, transport, restore, and UI contracts. Keeping them only in ticket artifacts would leave future command/API/projection changes anchored to obsolete flat-member and top-down-only communication assumptions.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Primary backend team-run orchestration, mixed manager, command, communication, restore, and history-listing module doc. | Updated | Added nested topology backend selection, `TeamMemberSelector`, subteam routing, member-input event behavior, representative communication rosters, upward reporting, represented-subteam metadata, recursive restore metadata, internal child team run history-listing rules, and source ownership. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | WebSocket command and event protocol doc needed path-aware Team Communication, member input, and represented-subteam transport semantics. | Updated | Documented target/source path and route-key payloads, approval target resolution, emitted member input/external user messages, message/dedupe identity, child transcript input origin, and `representedSubTeam`/`represented_sub_team` metadata. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Module summary for stream commands and emitted team event payloads. | Updated | Added selector normalization, nested approval targeting, source/member path fields, and member-input stream notes. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Run-history persistence/restore doc needed recursive metadata and projection truth. | Updated | Added `memberTree`, `memberKind`, path/route identity, subteam restore data, internal child team run listing rules, projection dedupe behavior, represented-subteam communication projection, and no flat-metadata inference policy. |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` | Processing/projection doc needed nested source-path attribution and representative communication identity. | Updated | Added child event source-path prefixing and path-aware/representative-aware Team Communication projections. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Artifact vs Team Communication reference doc needed nested participant identity clarification. | Updated | Added path-aware and representative-aware participant metadata plus mixed nested event bridge ownership. |
| `autobyteus-web/docs/agent_teams.md` | Frontend team launch/reopen doc needed route-keyed nested launch, representative communication, and stream identity notes. | Updated | Added recursive member override tree, route-keyed leaf config, nested backend `MIXED` launch, subteam target behavior, representative/upward communication, restored/opened labels, represented-subteam Team Messages display, and metadata/source path identity. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend stream handler architecture needed the new external user/member input message handler entry. | Updated | Added `EXTERNAL_USER_MESSAGE` handler mapping. |
| `autobyteus-server-ts/docs/modules/agent_team_definition.md` | Definition model doc already covered nested refs and same-bundle integrity; execution semantics belong in execution docs. | No change | No stale execution/restore command wording found in this doc. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Runtime architecture / command / communication contract | Documented recursive topology planning, nested definitions selecting `MIXED`, `TeamMemberSelector`, structural subteam posting, scoped representative rosters, parent-to-representative routing, upward child-to-parent reporting, represented-subteam communication metadata, approval constraints, recursive restore, internal child-team history suppression, and new source files. | Future execution and communication changes need the authoritative backend contract instead of the old flat/top-down-only mixed-team model. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Transport protocol | Replaced bare-name team routing language with preferred path/route-key payloads, legacy alias limits, approval source identity, emitted source/member path fields, member-input/external user message projection behavior, and represented-subteam metadata in Team Communication payloads. | Client and handler work must target stable nested and representative identity. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Module summary | Added concise selector, approval, emitted nested path identity, and member-input stream notes. | Keeps the module index aligned with the detailed protocol doc. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Persistence / restore / projection contract | Added recursive `memberTree`, `memberKind`, path/route identity, subteam metadata, child team listing rules, dedupe behavior, flattener guidance, represented-subteam Team Communication participant identity, and legacy flat-metadata rejection. | Restore/projection must not regress to flat metadata inference, stale duplicate display, or top-down-only communication assumptions. |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` | Event processing / projection | Added mixed child event source-path prefixing and path-aware/representative-aware Team Communication projection details. | Event processors/projections need canonical source attribution and representative display metadata. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Artifact/reference boundary | Added nested and representative participant identity and mixed event bridge ownership; clarified message-owned, path-aware Team Communication projection. | Prevents future Artifacts/Team Communication boundary regressions. |
| `autobyteus-web/docs/agent_teams.md` | Frontend launch/reopen/display contract | Added recursive member override tree, route-keyed nested leaf config, backend mixed nested launch, top-level subteam target routing, representative/upward communication behavior, recursive metadata, restored/opened labels, represented-subteam Team Messages display, and stream source/member path notes. | Frontend launch/history/team-message work must preserve backend route/path and representative identity. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend stream processing map | Added `EXTERNAL_USER_MESSAGE` handler entry. | Keeps the documented frontend event handler map aligned with member-input projection. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Nested team backend selection | Any definition containing an `agent_team` member launches through `TeamBackendKind.MIXED`, even if all leaves share a runtime. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md` | `agent_team_execution.md`, `autobyteus-web/docs/agent_teams.md` |
| Path/route member identity | `memberPath` and `memberRouteKey` are canonical for nested members; bare names are top-level/unambiguous aliases only. | `requirements-doc.md`, `design-spec.md`, `review-report.md` | `agent_team_execution.md`, `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `run_history.md` |
| Selector-based commands | `TeamMemberSelector` is the domain/backend command shape; transport strings are normalized at edges. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `agent_team_execution.md`, `agent_websocket_streaming_protocol.md`, `agent_streaming.md` |
| Structural subteam runtime boundary | User/composer messages targeted to a structural top-level subteam create/restore the child team and let its configured default/coordinator handle the input. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `agent_team_execution.md`, `autobyteus-web/docs/agent_teams.md` |
| Representative communication rosters | Normal `send_message_to` visibility exposes subteam coordinators/representatives as scoped recipients, not abstract subteam nodes or hidden reply aliases. | `requirements-doc.md`, `upward-nested-team-reporting-design-rework-note.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `agent_team_execution.md`, `autobyteus-web/docs/agent_teams.md` |
| Upward child-to-parent reporting | A represented child coordinator can send to exposed immediate parent-boundary recipients, with the sender preserved as the child representative path and represented subteam. | `requirements-doc.md`, `upward-nested-team-reporting-design-rework-note.md`, `api-e2e-validation-report.md` | `agent_team_execution.md`, `run_history.md`, `streaming_parsing_architecture.md`, `autobyteus-web/docs/agent_teams.md` |
| Event source paths | Nested child events are prefixed into `TeamRunEvent.sourcePath`; `sub_team_node_name` is only a display alias. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `streaming_parsing_architecture.md` |
| Recursive team restore metadata | `TeamRunMetadata.memberTree` is canonical; flat leaf projections are derived and unsupported flat historical metadata is not inferred. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md` | `run_history.md`, `agent_team_execution.md`, `autobyteus-web/docs/agent_teams.md` |
| Team Communication path-aware participants | Communication projection stores sender/receiver kind, path, route key, and represented-subteam metadata for representative cases. | `implementation-handoff.md`, `api-e2e-validation-report.md` | `streaming_parsing_architecture.md`, `artifact_file_serving_design.md`, `run_history.md`, `agent_team_execution.md` |
| Child transcript member input display | Parent/user input to a focused child/subteam appears as explicit member input/external user message rows with stable dedupe identity. | `api-e2e-validation-report.md`, `round5-live-transcript-projection-presentation-design-rework-note.md` | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `run_history.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Recursive frontend focus/open state | Frontend state uses route-keyed nested member context and stable membership labels, including represented-subteam Team Messages display. | `api-e2e-validation-report.md`, `frontend-nested-team-ui-design-rework-note.md` | `autobyteus-web/docs/agent_teams.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Flat mixed-team execution over only per-member `AgentRun`s | Mixed top-level member handles where agent members own `AgentRun`s and subteam members own child `TeamRun`s. | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Bare `target_member_name` / `target_agent_name` as team command identity | `TeamMemberSelector` normalized from `target_member_path`, `target_member_route_key`, or limited bare-name aliases. | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `agent_team_execution.md` |
| Top-down-only nested communication | Scoped communication rosters with parent-to-representative delivery and bounded child-to-parent upward reports. | `agent_team_execution.md`, `autobyteus-web/docs/agent_teams.md` |
| Abstract subteam node as normal `send_message_to` recipient | Representative leaf recipients with optional `representedSubTeam` metadata; structural subteam composer target remains separate. | `agent_team_execution.md`, `streaming_parsing_architecture.md`, `run_history.md`, `autobyteus-web/docs/agent_teams.md` |
| Hidden reply alias / stateful reply target | Explicit visible parent-boundary recipient descriptors. | `agent_team_execution.md`, `autobyteus-web/docs/agent_teams.md` |
| `subTeamNodeName` as nested event identity | Canonical `sourcePath` / derived `source_route_key`; `sub_team_node_name` remains display-only compatibility data. | `agent_websocket_streaming_protocol.md`, `streaming_parsing_architecture.md`, `agent_streaming.md` |
| Flat team metadata as restore truth | Recursive `TeamRunMetadata.memberTree`; flat leaf projections only for projection/search consumers. | `run_history.md`, `agent_team_execution.md` |
| Receiver-run-scoped Team Communication reference assumptions | Message-owned Team Communication projection with sender/receiver kind/path/route/represented-subteam metadata. | `artifact_file_serving_design.md`, `streaming_parsing_architecture.md`, `run_history.md` |
| Top-level-only frontend team context | Recursive route-keyed member context and `MemberOverrideTree.vue`. | `autobyteus-web/docs/agent_teams.md` |

## No-Impact Decision

- Docs impact: `N/A — docs updated`
- Rationale: The reviewed implementation changed durable runtime, transport, restore, communication, and frontend presentation contracts, so long-lived docs required updates.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs were synchronized after integrating latest `origin/personal` and passing post-integration verification. Delivery remains on user-verification hold before archiving, final commit, push, merge, cleanup, or release/deployment work.

## Blocked Or Escalated Follow-Up

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A — docs sync completed`
