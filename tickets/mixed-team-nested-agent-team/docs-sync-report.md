# Docs Sync Report

## Scope

- Ticket: `mixed-team-nested-agent-team`
- Trigger: Delivery docs sync after API/E2E Round 6 and code-review-passed Round 6 localization fix; docs impact remained `Yes` for nested mixed team launch/routing/restore behavior, selector command identity, event source paths, communication projections, and frontend recursive member context.
- Bootstrap base reference: `origin/personal @ be56cab9b41b850c92690d79a8dfa70c52c369a0`
- Integrated base reference used for current docs sync: `origin/personal @ aed54f77d0fbe10eea8ff67201375337b94ce362`
- Current integrated ticket-branch reference: `f80cde6688aebf6802be054f38806946377f240b`
- Handoff state current with latest tracked remote base: `Yes` (`git rev-list --left-right --count origin/personal...HEAD` => `0 4`).

## Why Docs Were Updated

- Summary: Long-lived server and frontend docs now describe recursive nested-team topology, path/route-key member identity, selector-based team commands, nested event source paths, recursive restore metadata, Team Communication participant projections, member input/external user message projection, and frontend recursive focus/opened-label state.
- Why this should live in long-lived project docs: These behaviors define durable runtime, transport, restore, and UI contracts. Keeping them only in ticket artifacts would leave future command/API/projection changes anchored to obsolete flat-member assumptions.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Primary backend team-run orchestration, mixed manager, command, restore, and history-listing module doc. | Updated | Added nested topology backend selection, `TeamMemberSelector`, subteam routing, member-input event behavior, recursive restore metadata, internal child team run history-listing rules, and source ownership. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | WebSocket command and event protocol doc contained obsolete bare-name routing wording and needed child transcript semantics. | Updated | Documented target/source path and route-key payloads, approval target resolution, emitted member input/external user messages, message/dedupe identity, and child transcript input origin. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Module summary for stream commands and emitted team event payloads. | Updated | Added selector normalization, nested approval targeting, source/member path fields, and member-input stream notes. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Run-history persistence/restore doc needed recursive metadata and projection truth. | Updated | Added `memberTree`, `memberKind`, path/route identity, subteam restore data, internal child team run listing rules, projection dedupe behavior, and no flat-metadata inference policy. |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` | Processing/projection doc needed nested source-path attribution and communication identity. | Updated | Added child event source-path prefixing and path-aware Team Communication projections. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Artifact vs Team Communication reference doc needed nested participant identity clarification. | Updated | Added path-aware participant metadata and mixed nested event bridge ownership. |
| `autobyteus-web/docs/agent_teams.md` | Frontend team launch/reopen doc needed route-keyed nested launch and stream identity notes. | Updated | Added recursive member override tree, route-keyed leaf config, nested backend `MIXED` launch, subteam target behavior, restored/opened labels, and metadata/source path identity. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend stream handler architecture needed the new external user/member input message handler entry. | Updated | Added `EXTERNAL_USER_MESSAGE` handler mapping. |
| `autobyteus-server-ts/docs/modules/agent_team_definition.md` | Definition model doc already covered nested refs and same-bundle integrity; execution semantics belong in execution docs. | No change | No stale execution/restore command wording found in this doc. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Runtime architecture / command contract | Documented recursive topology planning, nested definitions selecting `MIXED`, `TeamMemberSelector`, subteam posting, approval constraints, path-aware communication, recursive restore, internal child-team history suppression, and new source files. | Future execution changes need the authoritative backend contract instead of the old flat mixed-team model. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Transport protocol | Replaced bare-name team routing language with preferred path/route-key payloads, legacy alias limits, approval source identity, emitted source/member path fields, and member-input/external user message projection behavior. | Client and handler work must target stable nested identity. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Module summary | Added concise selector, approval, emitted nested path identity, and member-input stream notes. | Keeps the module index aligned with the detailed protocol doc. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Persistence / restore contract | Added recursive `memberTree`, `memberKind`, path/route identity, subteam metadata, child team listing rules, dedupe behavior, flattener guidance, Team Communication participant identity, and legacy flat-metadata rejection. | Restore/projection must not regress to flat metadata inference or stale duplicate display. |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` | Event processing / projection | Added mixed child event source-path prefixing and path-aware Team Communication projection details. | Event processors/projections need canonical source attribution. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Artifact/reference boundary | Added nested participant identity and mixed event bridge ownership; clarified message-owned, path-aware Team Communication projection. | Prevents future Artifacts/Team Communication boundary regressions. |
| `autobyteus-web/docs/agent_teams.md` | Frontend launch/reopen contract | Added recursive member override tree, route-keyed nested leaf config, backend mixed nested launch, top-level subteam target routing, recursive metadata, restored/opened labels, and stream source/member path notes. | Frontend launch/history work must preserve backend route/path identity. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend stream processing map | Added `EXTERNAL_USER_MESSAGE` handler entry. | Keeps the documented frontend event handler map aligned with member-input projection. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Nested team backend selection | Any definition containing an `agent_team` member launches through `TeamBackendKind.MIXED`, even if all leaves share a runtime. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md` | `agent_team_execution.md`, `autobyteus-web/docs/agent_teams.md` |
| Path/route member identity | `memberPath` and `memberRouteKey` are canonical for nested members; bare names are top-level/unambiguous aliases only. | `requirements-doc.md`, `design-spec.md`, `review-report.md` | `agent_team_execution.md`, `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `run_history.md` |
| Selector-based commands | `TeamMemberSelector` is the domain/backend command shape; transport strings are normalized at edges. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `agent_team_execution.md`, `agent_websocket_streaming_protocol.md`, `agent_streaming.md` |
| Subteam runtime boundary | Parent-to-subteam messages target the child team default/coordinator via a child `TeamRun`, not a flattened arbitrary leaf. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `agent_team_execution.md`, `autobyteus-web/docs/agent_teams.md` |
| Event source paths | Nested child events are prefixed into `TeamRunEvent.sourcePath`; `sub_team_node_name` is only a display alias. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `streaming_parsing_architecture.md` |
| Recursive team restore metadata | `TeamRunMetadata.memberTree` is canonical; flat leaf projections are derived and unsupported flat historical metadata is not inferred. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md` | `run_history.md`, `agent_team_execution.md`, `autobyteus-web/docs/agent_teams.md` |
| Team Communication path-aware participants | Communication projection stores sender/receiver kind, path, and route key, including subteam recipients. | `implementation-handoff.md`, `api-e2e-validation-report.md` | `streaming_parsing_architecture.md`, `artifact_file_serving_design.md`, `run_history.md`, `agent_team_execution.md` |
| Child transcript member input display | Parent/user input to a focused child/subteam appears as explicit member input/external user message rows with stable dedupe identity. | `api-e2e-validation-report.md`, `round5-live-transcript-projection-presentation-design-rework-note.md` | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `run_history.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Recursive frontend focus/open state | Frontend state uses route-keyed nested member context (`memberTree`, `memberNodesByRouteKey`, `leafAgentContextsByRouteKey`, `focusedMemberRouteKey`) and stable membership labels. | `api-e2e-validation-report.md`, `frontend-nested-team-ui-design-rework-note.md` | `autobyteus-web/docs/agent_teams.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Flat mixed-team execution over only per-member `AgentRun`s | Mixed top-level member handles where agent members own `AgentRun`s and subteam members own child `TeamRun`s. | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Bare `target_member_name` / `target_agent_name` as team command identity | `TeamMemberSelector` normalized from `target_member_path`, `target_member_route_key`, or limited bare-name aliases. | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `agent_team_execution.md` |
| `subTeamNodeName` as nested event identity | Canonical `sourcePath` / derived `source_route_key`; `sub_team_node_name` remains display-only compatibility data. | `agent_websocket_streaming_protocol.md`, `streaming_parsing_architecture.md`, `agent_streaming.md` |
| Flat team metadata as restore truth | Recursive `TeamRunMetadata.memberTree`; flat leaf projections only for projection/search consumers. | `run_history.md`, `agent_team_execution.md` |
| Receiver-run-scoped Team Communication reference assumptions | Message-owned Team Communication projection with sender/receiver kind/path/route metadata. | `artifact_file_serving_design.md`, `streaming_parsing_architecture.md`, `run_history.md` |
| Top-level-only frontend team context | Recursive route-keyed member context and `MemberOverrideTree.vue`. | `autobyteus-web/docs/agent_teams.md` |

## No-Impact Decision

- Docs impact: `N/A — docs updated`
- Rationale: The reviewed implementation changed durable runtime, transport, restore, and frontend presentation contracts, so long-lived docs required updates.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs were synchronized after integrating latest `origin/personal` and passing post-integration verification. Delivery remains on user-verification hold before archiving, final commit, push, merge, cleanup, or release/deployment work.

## Blocked Or Escalated Follow-Up

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A — docs sync completed`
