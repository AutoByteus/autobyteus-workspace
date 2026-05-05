# Docs Sync Report

## Scope

- Ticket: `team-communication-messages-ui`
- Trigger: Delivery-stage refresh after API/E2E validation passed for latest reviewed commit `2c1b2bbd Fix nested team communication controls`.
- Bootstrap base reference: requirements recorded the ticket branch starting from `origin/personal` at `687b3fde5efc9b03a50f6a4b2ca1fa100176b0c3`.
- Integrated base reference used for docs sync: `origin/personal` at `1e63654e174de9600dde3016a7d8486020414ff3` after `git fetch origin personal` on 2026-05-05; ticket branch `HEAD` is `2c1b2bbd7e705e3213168b356c9528c2b1372b1a` and `git rev-list --left-right --count HEAD...origin/personal` returned `6 0`.
- Post-integration verification reference: no merge/rebase was needed because the ticket branch already contained the latest tracked base. Delivery checks run after the refresh included focused Team Communication panel and reference viewer Vitest coverage, a clean personal Electron macOS build from `2c1b2bbd`, `git diff --check`, `git diff --cached --check`, and trailing-whitespace checks for delivery-touched artifacts.

## Why Docs Were Updated

- Summary: The implemented ownership model moves communicated reference files out of the member Artifacts tab and into message-first Team Communication records in the Team tab. The Artifacts tab is produced/touched-file only. The latest validated addenda add compact Team Communication rows, sibling message/reference controls to avoid nested interactive elements, Markdown message detail, and local maximize/restore behavior for the Team Communication reference viewer.
- Why this should live in long-lived project docs: Future work on team messaging, run history, Artifacts, or reference-file serving must preserve the ownership split: produced files are Agent Artifacts; communicated references are child rows of Team Communication messages. Future Team UI work also needs to preserve the non-nested control model and the viewer-state boundary: Team reference maximize/restore is local to `TeamCommunicationReferenceViewer`, not part of the Agent Artifact viewer state model.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Canonical server-side Artifacts ownership. | Updated in implementation | States Artifacts are produced/touched files only and `reference_files` belong to Team Communication. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Content-serving design for produced files and references. | Updated in implementation | Documents the Team Communication reference route and removal of Artifacts-tab Sent/Received ownership. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Stream protocol for accepted inter-agent messages. | Updated in implementation | Records Team Communication projection from accepted `INTER_AGENT_MESSAGE` payloads. |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` | Event/parsing architecture boundary. | Updated in implementation | Records Team Communication projection as message-owned metadata, not prose scanning. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team execution/runtime ownership. | Updated in implementation | Clarifies runtime team context needed by Team Communication projection. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Historical persistence and hydration. | Updated in implementation | Documents `team_communication_messages.json`, `getTeamCommunicationMessages(teamRunId)`, and message-owned content route hydration/read notes. |
| `autobyteus-web/docs/agent_artifacts.md` | Primary frontend doc for Artifacts, Team Communication references, and viewer ownership. | Updated in delivery | Added compact row/sibling-control/Markdown detail behavior and Team reference viewer inline/maximized state. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend streaming/store/hydration architecture. | Updated in delivery | Replaced stale diagram references to `Message File References Store` with `Team Communication Store`. |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | SDK/native team stream protocol. | Updated in implementation | Documents Team Communication references under accepted inter-agent messages. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Server module documentation | Reframed Artifacts as produced/touched files only and Team Communication as reference owner. | Preserve the ownership correction and avoid resurrecting Sent/Received Artifacts in the member Artifacts tab. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Feature design documentation | Documented Team Communication reference flow and message-owned REST route. | Future serving work must use the new route/identity boundary. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Protocol documentation | Documented accepted `INTER_AGENT_MESSAGE` projection into Team Communication. | Message references now live under their source messages. |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` | Pipeline architecture documentation | Documented message-first Team Communication projection and no content scanning. | Preserve the parser/event boundary. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Runtime/team execution documentation | Clarified team context for produced files and Team Communication projection. | Avoid confusing member-run produced artifacts with message-owned references. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Historical read/hydration documentation | Added Team Communication persisted file, GraphQL hydration, message-owned content route, and Team-pane hydration note. | API/E2E added durable historical hydration validation, and run history docs needed the canonical file/read path. |
| `autobyteus-web/docs/agent_artifacts.md` | Frontend product/runtime documentation | Documented Team Communication References, stores, routes, UI owners, removed legacy Sent/Received Artifacts ownership, compact row/sibling-control behavior, Markdown message detail, and inline/maximized Team reference viewer behavior. | Future frontend work needs the product ownership split, accessible/non-nested control structure, and viewer-state boundary. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture documentation | Documented Team Communication store/hydration and corrected the overview diagram to point at `TeamCommunicationStore` instead of the removed message-reference store. | Preserve streaming/hydration ownership and remove stale architecture terminology. |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | SDK/protocol documentation | Documented Team Communication references under message metadata. | Keep native/SDK authors aligned with message-owned references. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Team tab owns communicated references | `send_message_to.reference_files` are child rows of Team Communication messages, not member Artifacts-tab rows. | Requirements, design spec, implementation handoff, API/E2E validation report, review report | `autobyteus-web/docs/agent_artifacts.md`; server Artifacts/serving docs |
| Artifacts tab ownership | The member Artifacts tab displays produced/touched Agent Artifacts only. | Requirements, API/E2E validation report | `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-server-ts/docs/modules/agent_artifacts.md` |
| Message-owned persisted identity | Team communication messages persist to `agent_teams/<teamRunId>/team_communication_messages.json`; references open by `teamRunId + messageId + referenceId`. | Design spec, API/E2E validation report | `autobyteus-server-ts/docs/modules/run_history.md`; serving/protocol docs |
| Compact, non-nested Team Communication controls | Message row shells are non-interactive containers; message summary buttons and reference row buttons are siblings, so reference controls are not nested inside message summary controls. | API/E2E validation report for `2c1b2bbd`; review report | `autobyteus-web/docs/agent_artifacts.md` |
| Markdown message detail and raw-path non-linkification | Selecting a message renders readable Markdown detail while raw absolute paths remain plain text. Selecting a reference switches the pane to the message-owned reference viewer. | API/E2E validation report for `2c1b2bbd` | `autobyteus-web/docs/agent_artifacts.md` |
| Team reference viewer maximize/restore | `TeamCommunicationReferenceViewer` owns local inline/maximized preview state, keeps Raw/Preview controls available while maximized, and restores via control or `Escape`. | API/E2E validation reports for `099ac092` and `2c1b2bbd`; browser evidence screenshots | `autobyteus-web/docs/agent_artifacts.md` |
| No legacy compatibility UI | Old Sent/Received Artifacts product surfaces and old standalone message-file-reference routes/stores are intentionally removed. | Requirements, review report, API/E2E validation report | Artifacts docs and serving docs |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Member Artifacts tab **Sent Artifacts** / **Received Artifacts** sections | Team tab Team Communication messages with child reference-file rows | `autobyteus-web/docs/agent_artifacts.md` |
| Standalone `messageFileReferencesStore` frontend ownership | `teamCommunicationStore` with message-owned reference children | `autobyteus-web/docs/agent_execution_architecture.md`; `autobyteus-web/docs/agent_artifacts.md` |
| `/team-runs/:teamRunId/message-file-references/:referenceId/content` | `/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content` | `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`; `autobyteus-web/docs/agent_artifacts.md` |
| `agent_teams/<teamRunId>/message_file_references.json` | `agent_teams/<teamRunId>/team_communication_messages.json` | `autobyteus-server-ts/docs/modules/run_history.md` |
| Message-reference processor / `MESSAGE_FILE_REFERENCE_DECLARED` event path | Team Communication projection from accepted `INTER_AGENT_MESSAGE` payload metadata | Streaming protocol and parsing architecture docs |
| Artifact viewer display-mode ownership for Team references | `TeamCommunicationReferenceViewer` local Raw/Preview and maximize/restore state | `autobyteus-web/docs/agent_artifacts.md` |
| Nested Team Communication reference controls inside a message summary button | Non-interactive row shell with sibling message summary and reference row buttons | `autobyteus-web/docs/agent_artifacts.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A - docs were updated`
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against ticket branch `2c1b2bbd7e705e3213168b356c9528c2b1372b1a`, current with latest tracked `origin/personal` at `1e63654e174de9600dde3016a7d8486020414ff3`. Repository finalization, ticket archive move, push/merge, release, deployment, and cleanup remain blocked pending explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
