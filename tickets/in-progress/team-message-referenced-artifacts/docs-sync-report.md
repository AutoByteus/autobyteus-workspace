# Docs Sync Report

## Scope

- Ticket: `team-message-referenced-artifacts`
- Trigger: Delivery-stage docs sync after API/E2E validation round 3 passed following the runtime parser/logging Local Fix.
- Bootstrap base reference: `origin/personal` at `1bed2087bc583add5f07d61a1e7fd61da28a4a2a`
- Integrated base reference used for docs sync: `origin/personal` at `1bed2087bc583add5f07d61a1e7fd61da28a4a2a` after `git fetch origin personal` (already current; no merge/rebase needed)
- Post-integration verification reference: `git diff --check` passed; stale long-lived-doc grep passed for obsolete receiver-owned/generic-reference surfaces; `pnpm -C autobyteus-web audit:localization-literals` passed with zero unresolved findings.

## Why Docs Were Updated

- Summary: The final implementation changes the Artifacts tab and supporting protocol/API from a produced-file-only surface to a three-section surface: **Agent Artifacts** from `FILE_CHANGE`/`runFileChangesStore`, plus message references projected as **Sent Artifacts** and **Received Artifacts** from canonical team-level `MESSAGE_FILE_REFERENCE_DECLARED` metadata. Round 3 also fixes runtime extraction for Markdown/AI-wrapped absolute paths and adds concise `[message-file-reference]` diagnostics.
- Why this should live in long-lived project docs: Future frontend/backend contributors need the team-level message-reference authority, event names, persistence file, hydration query, content route, Sent/Received UI perspectives, parser wrapper support, diagnostic logging constraints, and non-linkification boundary to remain clear so stale receiver-owned routes/stores, chat parsing, or verbose message-content logging are not reintroduced.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_artifacts.md` | Primary frontend Artifacts tab documentation. | Updated | Now documents **Agent Artifacts**, **Sent Artifacts**, and **Received Artifacts**, including store owners, routes, team-level persistence, hydration, viewer behavior, Markdown-wrapped extraction, diagnostics, and tests. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend streaming/service/sidecar-store architecture. | Updated | Documents `MESSAGE_FILE_REFERENCE_DECLARED` handler and dedicated team-level message-reference sidecar store contract. |
| `autobyteus-web/docs/agent_teams.md` | Team frontend runtime and hydration overview. | No change | Existing team config/reopen content remains accurate; detailed message-reference behavior belongs in Artifacts and streaming architecture docs. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Canonical server-side module ownership for Artifacts. | Updated | Added message-reference domain, processor, service, projection store/service, content service, REST/GraphQL route, synthetic-event seam, Markdown wrapper normalization, diagnostics, and removed stale authority notes without preserving stale literals. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Server feature design for Artifacts serving. | Updated | Split Agent Artifact and Sent/Received message-reference source-of-truth, flow, storage, route semantics, parser wrapper support, diagnostics, and removed/non-authoritative paths. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Server streaming protocol behavior. | Updated | Documents sidecar reference event semantics, team-level content-route split, and focused-member Sent/Received projection rule. |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` | Server event-pipeline/customization boundary. | Updated | Clarified references are derived by the event pipeline, support Markdown/AI path wrappers, use concise diagnostics, and are not `send_message_to` handler or frontend-renderer work. |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | Team stream protocol notes consumed by SDK/framework readers. | Updated | Added derived artifact sidecar note, Markdown wrapper behavior, and Sent/Received frontend projection behavior. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_artifacts.md` | Product/frontend runtime documentation | Replaced produced-file-only wording with Agent/Sent/Received Artifacts, added `MessageFileReferenceArtifact`, data flow, backend/frontend owners, persistence, viewer routes, reopen behavior, Markdown wrapper extraction, diagnostics, and tests. | User-visible Artifact categories and frontend ownership changed; round-3 runtime parser behavior is durable. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture documentation | Added message-reference sidecar in architecture diagram, dispatch table, and Sidecar Store Pattern section. | Future event-routing work must keep references out of chat parsing and run-file-change state. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Backend module documentation | Added TS owners for message-reference domain/processor/service/projection/content route; documented team-level persistence, active-read consistency, Markdown wrapper normalization, and concise diagnostics. | Backend ownership, persistence, parser, logging, and immediate-open consistency changed. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Backend feature design documentation | Added message-reference flow, `MESSAGE_FILE_REFERENCE_DECLARED` semantics, source-of-truth, content route statuses, durable storage, parser wrapper support, diagnostic constraints, guarantees, and non-authoritative paths. | Developers need exact serving and parser semantics for both artifact classes. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Streaming protocol documentation | Added accepted `INTER_AGENT_MESSAGE` sidecar event behavior and split Agent Artifact/message-reference content routes. | Clients need protocol-level guidance for the new event. |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` | Event-pipeline boundary documentation | Added message-reference pipeline paragraph with Markdown wrapper and diagnostic behavior. | Keeps extraction out of customization processors, `send_message_to`, and frontend rendering. |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | Team streaming protocol documentation | Added derived artifact sidecar note and Markdown wrapper behavior. | Team-stream readers need to know the sidecar event can accompany accepted inter-agent messages. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Artifact category separation | **Agent Artifacts**, **Sent Artifacts**, and **Received Artifacts** have different state sources and presentation rules. | Requirements, design spec, implementation handoff, validation report | `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| Team-level reference authority | Message references persist once per team run and hydrate by `teamRunId`, with sender/receiver as metadata used for focused-member projections. | Requirements, design spec, implementation handoff, API/E2E validation report | `autobyteus-server-ts/docs/modules/agent_artifacts.md`; `autobyteus-web/docs/agent_artifacts.md` |
| Reference derivation boundary | References are backend-derived from accepted `INTER_AGENT_MESSAGE` events through the event pipeline, not `send_message_to` handlers, frontend Markdown, or clicks. | Requirements, design spec, review report | `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md`; `autobyteus-server-ts/docs/modules/agent_artifacts.md` |
| Markdown/AI wrapper parsing | Full absolute paths wrapped in inline code, emphasis/bold, link targets, blockquotes/lists, quotes, or parentheses should derive references with the unwrapped normalized path. | Runtime investigation report, API/E2E validation report | `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`; `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md`; `autobyteus-ts/docs/agent_team_streaming_protocol.md` |
| Diagnostic logging | `[message-file-reference]` logs should be concise event-level diagnostics and must not log full inter-agent message content by default. | Runtime investigation report, API/E2E validation report | `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-server-ts/docs/modules/agent_artifacts.md`; `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| Referenced content identity | Referenced content opens by `teamRunId + referenceId`; there is no raw-path-only or receiver-owned content authority. | Design spec, implementation handoff, API/E2E validation report | `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| Immediate-open consistency | Active reference reads wait for pending same-team projection updates so just-declared references can open immediately. | Review report, API/E2E validation report | `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-server-ts/docs/modules/agent_artifacts.md` |
| Non-linkification guarantee | Raw paths in inter-agent message text remain normal chat text. | Requirements, review report, API/E2E validation report | `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`; `autobyteus-ts/docs/agent_team_streaming_protocol.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Produced-file-only Artifacts tab docs | Three-section Agent/Sent/Received Artifacts model | `autobyteus-web/docs/agent_artifacts.md` |
| Receiver-owned reference authority | Canonical team-level projection with focused-member Sent/Received selectors | `autobyteus-server-ts/docs/modules/agent_artifacts.md`; `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| Raw-path or message-click reference authority | Backend event-pipeline sidecar derivation from accepted inter-agent messages | `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` |
| Markdown decoration blocking absolute path extraction | Parser-supported wrapper normalization with unwrapped persisted path | `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`; `autobyteus-ts/docs/agent_team_streaming_protocol.md` |
| Produced-artifact content route as a catch-all viewer boundary | Separate produced-file and team-level message-reference content routes | `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| Single generic reference UI grouping | **Sent Artifacts** and **Received Artifacts**, grouped by counterpart | `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-ts/docs/agent_team_streaming_protocol.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A - docs were updated`
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against a ticket branch already current with `origin/personal` at `1bed2087bc583add5f07d61a1e7fd61da28a4a2a`. `git diff --check`, stale long-lived-doc grep, and `pnpm -C autobyteus-web audit:localization-literals` passed. Repository finalization remains blocked pending explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
