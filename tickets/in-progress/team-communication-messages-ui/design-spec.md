# Design Spec

## Current-State Read

The current merged code is based on the finalized `team-message-referenced-artifacts` ticket. It has the correct explicit `send_message_to.reference_files` tool contract, but its UI ownership is now product-wrong for the clarified direction.

Current behavior and ownership:

- `send_message_to` carries explicit `reference_files` through accepted `INTER_AGENT_MESSAGE` payloads.
- `MessageFileReferenceProcessor` derives `MESSAGE_FILE_REFERENCE_DECLARED` sidecar events from `INTER_AGENT_MESSAGE.payload.reference_files`.
- `MessageFileReferenceService` listens to team events, persists standalone file-reference rows to `message_file_references.json`, and exposes them through:
  - GraphQL `getMessageFileReferences(teamRunId)`;
  - REST `/team-runs/:teamRunId/message-file-references/:referenceId/content`.
- Frontend `messageFileReferencesStore` stores standalone sent/received reference rows grouped by focused member.
- `ArtifactsTab.vue` combines focused-run file changes from `runFileChangesStore` with those message-reference rows.
- `ArtifactList.vue` renders **Agent Artifacts**, **Sent Artifacts**, and **Received Artifacts**.
- `ArtifactContentViewer.vue` knows how to fetch both run file-change content and standalone `message_reference` content.
- `TeamOverviewPanel.vue` currently renders only task-plan content and does not own team communication.

Post-implementation UI review evidence from the Electron build showed additional layout defects that the target design must correct:

- `TeamOverviewPanel.vue` currently adds an internal `Team` header row even though the right-side tab itself is already titled **Team**. This consumes vertical space without adding useful action or hierarchy.
- `TeamOverviewPanel.vue` gives the task plan section `max-h-[34%] min-h-[8rem]`; when there is no task plan, a large empty state still occupies a major portion of the tab.
- `TeamCommunicationPanel.vue` uses a vertical list/detail split, so long message lists and selected reference previews fight for height. A clicked file preview is squeezed below the message list instead of behaving like the Artifacts tab.
- `ProgressPanel.vue` / `TodoListPanel.vue` / `ActivityFeed.vue` already provide a better local pattern: collapsible section headers with chevrons, counts, and only the expanded section taking flexible height.
- `ArtifactsTab.vue` already provides the better file-preview interaction: a left selectable list and right content preview pane with a resizable divider.
- `ArtifactContentViewer.vue` also provides a proven large-file reading interaction: maximize/restore control, `Teleport to="body"` full-window shell, Escape-to-restore, and preview/edit controls that remain usable while maximized.
- `TeamCommunicationReferenceViewer.vue` already uses `FileViewer` and owns Team Communication reference content, but currently lacks maximize/restore and Escape behavior.

The clarified product model is different: `reference_files` are child references of an inter-agent message. The user should see the message context first, then the files referenced by that message. Therefore the Team tab should own team communication and the Artifacts tab should return to a produced/touched-files-only meaning.

## Intended Change

Create a message-first **Team Communication** experience under the Team tab:

- Team tab displays inter-agent messages from the focused member perspective.
- Each message card/row shows:
  - top-level `Sent` or `Received` section;
  - counterpart member as the group header under that section, without redundant `to`/`from` wording;
  - message type;
  - timestamp/order;
  - bounded content preview;
  - vertical list of referenced files attached to that message.
- Selecting a message shows the full message in the detail pane.
- Selecting a referenced file shows the file content through a message-centric content endpoint.
- The Artifacts tab shows only produced/touched focused-run artifacts.
- Remove/decommission the standalone Sent/Received Artifacts UI and the standalone message-file-reference projection/event/API that exists only to support that file-first model.
- Keep the useful event-processor decoupling pattern, but replace the old file-reference processor with a message-centric processor:
  - `INTER_AGENT_MESSAGE` remains the raw accepted communication event used by existing conversation flows.
  - A new `TeamCommunicationMessageProcessor` consumes accepted `INTER_AGENT_MESSAGE` events and emits one normalized team-communication message event/record per accepted message.
  - The processor output preserves the message as the governing subject and keeps `reference_files` as child rows; it never emits one standalone artifact/reference event per file.
- Use the existing Activity/Artifacts interaction patterns rather than the first implementation's stacked layout:
  - no redundant internal Team header row;
  - `Task Plan` and `Messages` are collapsible sections with chevrons/counts, modeled after `ProgressPanel`;
  - the task plan is collapsed or compact when empty and must not reserve a large empty body;
  - the Messages section is expanded by default and owns the available height;
  - selected message/reference details render in a right-side detail pane, like Artifacts, not below the list.
- Add a Team-Communication-owned maximize/restore interaction for selected reference files:
  - implemented in `TeamCommunicationReferenceViewer.vue` or a Team Communication-owned child/composable;
  - modeled after `ArtifactContentViewer.vue`'s maximize/restore behavior;
  - keeps Raw/Preview controls available while maximized;
  - Escape restores the normal split layout;
  - does not import `ArtifactContentViewer` or use artifact-owned display-mode state.

This is a clean-cut replacement. Do not keep duplicate visibility or compatibility switches for the old member-Artifacts Sent/Received model.

## Task Design Health Assessment (Mandatory)

- Change posture: Behavior Change + Refactor + UI Feature.
- Current design issue found: Yes.
- Root cause classification: Boundary Or Ownership Issue + Legacy Or Compatibility Pressure.
- Refactor needed now: Yes.
- Evidence:
  - `ArtifactsTab.vue` currently mixes produced/touched file changes with communicated references.
  - `messageFileReferencesStore.ts` is file-reference-first and groups by sender/receiver, losing message ownership as the primary subject.
  - `message_file_references.json` rows are keyed around `teamRunId + senderRunId + receiverRunId + path`, not one message with child references.
  - The API/E2E reroute explicitly identifies the old Sent/Received Artifacts requirements as conflicting with the new Team-tab ownership direction.
- Design response:
  - Introduce **Team Communication Message** as the governing product/domain subject.
  - Add a message-centric event processor that converts accepted `INTER_AGENT_MESSAGE` events into normalized Team Communication Message records.
  - Persist processor output into a message-centric team projection.
  - Move reference-file content resolution behind Team Communication.
  - Remove Sent/Received artifact rendering and the standalone message-reference artifact pipeline.
- Refactor rationale:
  - Keeping both Team Communication and Sent/Received Artifacts would create duplicate UI ownership and make the same `reference_files` look like both message attachments and standalone artifacts.
- Small local implementation addendum:
  - Team Communication reference maximize/restore is a local UX enhancement under the existing Team Communication reference viewer boundary.
  - It does not change backend projection shape or message/reference ownership.
  - It needs explicit requirements/design text only to prevent accidental coupling back to Agent Artifacts.
- Intentional deferrals and residual risk:
  - No historical backfill for runs that never recorded accepted `INTER_AGENT_MESSAGE` events or message reference metadata. Existing runs with new projection data hydrate; older runs can show an empty communication state.

## Terminology

- **Team Communication Message**: one accepted inter-agent communication event between two team members.
- **Reference file**: one absolute local file path listed in `send_message_to.reference_files`, displayed as a child of the message that declared it.
- **Agent Artifact**: a produced/touched file from the focused agent run, derived from file-change events. This remains the Artifacts tab subject.
- **Reference maximize mode**: a temporary full-window view for a selected Team Communication reference file. It is a viewing state, not a new artifact state or persisted projection state.

## Design Reading Order

1. Team Communication event/projection spine.
2. Team tab message/detail UI spine.
3. Artifacts tab removal spine.
4. Backend/frontend file mapping and decommission plan.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- The old **Sent Artifacts** / **Received Artifacts** member Artifacts-tab UI is removed in this change.
- The old standalone message-file-reference artifact event/projection/API is removed or replaced by the Team Communication projection/content boundary.
- The design rejects flags, dual views, or fallback UI that keeps Sent/Received Artifacts around after Team Communication owns the same data.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Accepted `INTER_AGENT_MESSAGE` | Durable Team Communication projection | Team Communication processor + service | Creates the message-first source of truth while preserving processor decoupling. |
| DS-002 | Primary End-to-End | Team tab focused member | Rendered message list and detail selection | Team Communication UI/store | Gives users transparent team communication context. |
| DS-003 | Return-Event | Click message reference file | File content or graceful unavailable state | Team Communication Content boundary | Keeps reference-file preview under message ownership. |
| DS-004 | Cleanup/Refactor | Artifacts tab data composition | Agent-artifacts-only view | Agent Artifacts UI | Removes duplicate Sent/Received ownership. |
| DS-005 | Bounded Local | Live team streaming `TEAM_COMMUNICATION_MESSAGE` | Frontend team communication store update | Team streaming handlers | Keeps live Team tab in sync without reload while preserving the processor boundary. |
| DS-006 | Bounded Local | Historical team hydration | Frontend team communication store replacement | Run hydration service | Makes historical Team tab usable. |

## Primary Execution Spine(s)

- DS-001: `send_message_to accepted -> INTER_AGENT_MESSAGE payload -> TeamCommunicationMessageProcessor -> TEAM_COMMUNICATION_MESSAGE payload -> TeamCommunicationService -> team_communication_messages.json -> GraphQL projection query`
- DS-002: `Team tab -> collapsible Task Plan/Messages sections -> Messages expanded -> teamCommunicationStore perspective -> left message/reference list -> selected message/reference -> right detail pane`
- DS-003: `Reference row click -> TeamCommunicationReferenceContentViewer -> /team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content -> TeamCommunicationContentService -> FileViewer`
- DS-004: `ArtifactsTab -> runFileChangesStore only -> ArtifactList agent rows -> ArtifactContentViewer run-file-change content`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Every accepted inter-agent message is transformed by a message-centric processor into one Team Communication Message and then persisted with child reference files. | Inter-agent message, Team Communication processor output, Team Communication projection | TeamCommunicationMessageProcessor + TeamCommunicationService | ID generation, path normalization, artifact type inference, projection persistence |
| DS-002 | The Team tab shows compact collapsible Task Plan and Messages sections; Messages expands into a left message/reference list and right detail pane. The left list uses `Sent`/`Received` section headers, counterpart-name group headers, then message rows and child reference rows. | Focused member perspective, message card, reference child, detail selection | TeamCommunicationPanel/store | Member display names, truncation, empty states, resizable split |
| DS-003 | A reference child is selected from inside a message and resolved through the Team Communication content endpoint. | Message reference child, content stream | TeamCommunicationContentService | Mime detection, readability checks, unavailable/deleted state |
| DS-004 | The Artifacts tab stops reading team message references and displays only run file-change artifacts. | Agent artifact | ArtifactsTab / RunFileChangesStore | Keyboard order, existing file-change viewer behavior |
| DS-005 | Live streaming updates the message store only from normalized `TEAM_COMMUNICATION_MESSAGE` payloads; raw `INTER_AGENT_MESSAGE` remains available for conversation display. | Live Team Communication Message | TeamStreamingService/team handler | Payload mapping, active team id, dedupe |
| DS-006 | Historical team hydration fetches the message-centric projection and populates the same store. | Historical Team Communication projection | Team run hydration service | GraphQL query, network failure empty state |

## Spine Actors / Main-Line Nodes

- `INTER_AGENT_MESSAGE` accepted event payload.
- `TeamCommunicationMessageProcessor`.
- `TEAM_COMMUNICATION_MESSAGE` derived event/payload.
- `TeamCommunicationService`.
- `TeamCommunicationProjectionStore`.
- GraphQL `getTeamCommunicationMessages` query.
- Frontend `teamCommunicationStore`.
- `TeamOverviewPanel` / `TeamCommunicationPanel`.
- `TeamTaskPlanSection` / collapsible section behavior.
- `TeamCommunicationReferenceContentViewer`.
- Agent Artifacts tab after cleanup.

## Ownership Map

- `INTER_AGENT_MESSAGE` event payload owns the accepted message contract: sender, receiver, content, message type, reference files, message id, timestamp.
- `TeamCommunicationMessageProcessor` owns event-shape translation from raw accepted `INTER_AGENT_MESSAGE` into normalized Team Communication Message payloads.
- `TEAM_COMMUNICATION_MESSAGE` owns the normalized message projection contract emitted by the processor.
- `TeamCommunicationService` owns live observation of processor output and durable projection updates.
- `TeamCommunicationProjectionService` owns active/historical reads and hides whether data comes from an active in-memory service or disk.
- `TeamCommunicationContentService` owns resolving file content for a reference child inside a message.
- `teamCommunicationStore` owns frontend normalized team message state and focused-member perspective grouping.
- `TeamOverviewPanel` owns only top-level collapsible section composition and must not add a redundant Team header row.
- `TeamCommunicationPanel` owns message/reference list and right-side detail UI behavior for the Team tab.
- `ArtifactsTab` owns only focused-run produced/touched artifacts.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `getTeamCommunicationMessages` | TeamCommunicationProjectionService | Frontend historical/live hydration query | Projection normalization or UI perspective logic |
| REST team communication content route | TeamCommunicationContentService | Streams selected reference file content | File path policy outside the service |
| `TeamOverviewPanel` | Collapsible Task Plan section + TeamCommunicationPanel | Right-side Team tab composition | Redundant title/header, backend projection semantics |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `MESSAGE_FILE_REFERENCE_DECLARED` event as product UI source | Standalone reference artifact rows are no longer the UI subject | `INTER_AGENT_MESSAGE` -> `TeamCommunicationMessageProcessor` -> `TEAM_COMMUNICATION_MESSAGE` | In This Change | Remove from default event pipeline if no remaining non-legacy consumers. |
| `MessageFileReferenceProcessor` | It derives the old standalone artifact/reference model and emits one file-first sidecar row per reference | `TeamCommunicationMessageProcessor` derives one message-first event/record with child references | In This Change | Keep explicit path validation by moving it to a non-legacy owner. |
| `services/message-file-references/*` projection/content service | File-reference-first projection duplicates message-centric ownership | `services/team-communication/*` | In This Change | Remove old route/query/tests/docs. |
| GraphQL `getMessageFileReferences` | UI should hydrate team messages, not standalone references | `getTeamCommunicationMessages` | In This Change | Update frontend queries/types. |
| REST `/team-runs/:teamRunId/message-file-references/:referenceId/content` | Content should resolve by message/reference child | Team communication content route | In This Change | No compatibility route. |
| `messageFileReferencesStore.ts` | Store shape is standalone file-reference perspective | `teamCommunicationStore.ts` | In This Change | Remove tests asserting sent/received artifact sections. |
| `ArtifactsTab.vue` message-reference merge | Duplicates Team tab ownership | Agent artifact-only composition | In This Change | Imports of `messageFileReferencesStore` removed. |
| `ArtifactList.vue` Sent/Received sections | Legacy UI path | TeamCommunicationPanel message list | In This Change | Artifact list becomes simpler. |
| `artifactViewerItem.ts` `MessageReferenceArtifactViewerItem` | Message references no longer artifact viewer items | Team communication reference item type | In This Change | Agent artifacts only remain. |
| `ArtifactContentViewer.vue` `message_reference` branch | Artifact viewer must not own team message content | TeamCommunicationReferenceContentViewer | In This Change | Existing FileViewer logic can be reused/extracted. |
| Agent/team wording mentioning Sent/Received Artifacts | Wrong product ownership language | Team Communication wording | In This Change | Update docs and instruction composer. |

## Return Or Event Spine(s) (If Applicable)

- Live event: `Agent runtime publishes accepted INTER_AGENT_MESSAGE -> TeamCommunicationMessageProcessor emits TEAM_COMMUNICATION_MESSAGE -> TeamCommunicationService persists -> WebSocket sends TEAM_COMMUNICATION_MESSAGE -> frontend handler upserts teamCommunicationStore`.
- Content return: `reference content route -> content service -> fs stream or typed content error -> frontend viewer loading/deleted/error state`.

## Bounded Local / Internal Spines (If Applicable)

- TeamCommunicationMessageProcessor local transform:
  - `INTER_AGENT_MESSAGE -> validate required metadata -> normalize/dedupe reference_files within the message -> emit TEAM_COMMUNICATION_MESSAGE`.
  - This keeps event interpretation in the processor pipeline and avoids making the projection service parse raw runtime details.
- TeamCommunicationService persistence queue:
  - `TEAM_COMMUNICATION_MESSAGE -> load cached projection -> upsert -> write team_communication_messages.json`.
  - This mirrors the current processor/service decoupling pattern but owns messages, not standalone files.
- Frontend selection state:
  - `message card click/reference click in left pane -> selected item id/type -> right detail pane mode -> content fetch if reference`.
- Collapsible section state:
  - `Task Plan header click / Messages header click -> expanded section -> only expanded section receives flex height`.
  - Default state: Messages expanded; Task Plan collapsed when empty so an empty task plan never consumes the primary Team tab height.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Message/reference ID builder | DS-001, DS-003 | TeamCommunicationMessageProcessor | Stable ids for messages and child refs | Dedupe and content addressing | UI/service invents unstable ids |
| Reference path normalization/type inference | DS-001, DS-003 | TeamCommunicationMessageProcessor/ContentService | Normalize paths and infer file type | Consistent display/content behavior | Duplicate path logic across frontend/backend |
| Member display name resolution | DS-002 | TeamCommunicationPanel | Show readable counterpart labels | UX clarity | Store becomes presentation-specific |
| Direction label economy | DS-002 | TeamCommunicationPanel | Use `Sent`/`Received` section headers and counterpart-name-only group headers | Avoid redundant `to`/`from` copy in constrained space | UI becomes noisy and less scannable |
| File content MIME/readability | DS-003 | TeamCommunicationContentService | Stream file safely | Graceful errors and mime handling | UI or route bypasses policy |
| Artifact list keyboard behavior | DS-004 | ArtifactList | Preserve simple file navigation | Existing usability | Team refs leak back into artifact order |
| Collapsible section expansion | DS-002 | TeamOverviewPanel | Allocate height between Task Plan and Messages | Prevent empty Task Plan from crowding communication | Fixed-height empty bodies waste the tab |
| Resizable message/detail split | DS-002, DS-003 | TeamCommunicationPanel | Match Artifacts preview ergonomics | File previews need width and height | Vertical stacking squeezes previews |
| Reference maximize state | DS-003 | TeamCommunicationReferenceViewer | Temporary full-window preview, restore, Escape handling | Larger files need reading space | Using artifact display state couples Team Communication to Agent Artifacts |
| Localization strings | DS-002, DS-004 | UI components | Copy for messages/empty states | Usable UI | Hard-coded text drift |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Event-to-derived-domain decoupling | AgentRunEventProcessor pattern | Reuse Pattern | The processor pattern is useful and should stay; only the old file-first processor subject is wrong. | Old `MessageFileReferenceProcessor` owns file-reference rows, not messages. |
| Persist team-level event-derived projection | MessageFileReferenceService pattern | Create New using pattern | The service/persistence pattern is useful, but subject changes to messages. | Old service owns file-reference rows, not messages. |
| Reference content streaming | MessageFileReferenceContentService / ArtifactContentViewer logic | Create/Extract | Reuse MIME/readability approach. | Old boundary resolves standalone reference ids; Team Communication needs message child identity. |
| Agent file artifacts | RunFileChangesStore/ArtifactsTab | Reuse and simplify | Correct owner for produced/touched files. | N/A |
| Team tab composition | TeamOverviewPanel/TaskPlanDisplay | Extend with Activity-style collapsible section pattern | Existing right-side Team tab owner; first implementation's fixed task-plan body wastes space. | N/A |
| Team Communication file preview layout | ArtifactsTab/ArtifactContentViewer pattern | Reuse Pattern | A left list and right preview pane already works well for file content. | Do not make message references artifact rows; reuse the interaction shape, not the artifact owner. |
| Reference maximize/restore interaction | ArtifactContentViewer zen/maximize pattern | Reuse Pattern Only | The interaction is proven and useful for reading larger files. | Do not import `ArtifactContentViewer` or artifact display-mode store; implement the interaction in Team Communication-owned code. |
| Live team stream handling | TeamStreamingService/teamHandler | Extend | Existing live event boundary; must route raw and processed events to distinct consumers. | N/A |
| Historical hydration | teamRunContextHydrationService | Extend | Existing team-history hydration boundary. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Team Communication backend | Message processor output, projection, query, content route | DS-001, DS-003 | TeamCommunicationMessageProcessor + TeamCommunicationService | Create New | Replaces message-file-reference subsystem while retaining processor decoupling. |
| Team Communication frontend | Store, message list/detail, reference viewer | DS-002, DS-003, DS-005, DS-006 | TeamCommunicationPanel/store | Create New | Lives under Team tab. |
| Agent Artifacts frontend | Produced/touched artifacts only | DS-004 | ArtifactsTab | Reuse/Simplify | Remove Sent/Received. |
| Team run streaming/hydration | Live and historical message store population | DS-005, DS-006 | TeamStreamingService/hydration service | Extend | Adds message projection handling. |
| Team send-message delivery | Message id/timestamp in accepted event payloads | DS-001 | Runtime builders/managers | Extend | Preserve `reference_files` semantics. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/events/processors/team-communication/team-communication-message-event-processor.ts` | Team Communication backend | Event processor | Consume `INTER_AGENT_MESSAGE` and emit one `TEAM_COMMUNICATION_MESSAGE` event | Processor owns event-shape translation, not persistence | Yes |
| `services/team-communication/team-communication-types.ts` | Team Communication backend | Shared model | Projection/message/reference types | One type contract for service/API | Yes |
| `services/team-communication/team-communication-identity.ts` | Team Communication backend | Identity helper | Message/reference id/path normalization | Keeps ids consistent | Yes |
| `services/team-communication/team-communication-normalizer.ts` | Team Communication backend | Normalizer | Convert processor/projection data to tight model | Avoid scattered normalization | Yes |
| `services/team-communication/team-communication-projection-store.ts` | Team Communication backend | Persistence | Read/write `team_communication_messages.json` | Storage concern only | Yes |
| `services/team-communication/team-communication-service.ts` | Team Communication backend | Live owner | Attach to TeamRun and persist messages | Event-to-projection owner | Yes |
| `services/team-communication/team-communication-projection-service.ts` | Team Communication backend | Read boundary | Active/historical projection reads | Query owner | Yes |
| `services/team-communication/team-communication-content-service.ts` | Team Communication backend | Content boundary | Resolve message reference file content | Content safety owner | Yes |
| `api/graphql/types/team-communication.ts` | API | GraphQL facade | `getTeamCommunicationMessages` | Transport only | Yes |
| `api/rest/team-communication.ts` | API | REST facade | Message reference content endpoint | Transport only | Yes |
| `stores/teamCommunicationStore.ts` | Frontend Team Communication | UI state | Store messages and perspective lists | One UI state owner | Yes |
| `components/workspace/team/TeamTaskPlanSection.vue` or equivalent section inside `TeamOverviewPanel.vue` | Frontend Team tab | Collapsible task plan section | Activity-style header/count/empty-state behavior | Keeps task plan compact and optional | Yes |
| `components/workspace/team/TeamCommunicationPanel.vue` | Frontend Team Communication | Panel owner | Resizable left message/reference list and right detail composition | Main Team UI component | Yes |
| `components/workspace/team/TeamCommunicationList.vue` | Frontend Team Communication | Left list view | Message cards and vertical reference child rows | Focused display concern | Yes |
| `components/workspace/team/TeamCommunicationDetail.vue` | Frontend Team Communication | Right detail view | Full message or selected reference preview | Selection display concern | Yes |
| `components/workspace/team/TeamReferenceFileViewer.vue` / `TeamCommunicationReferenceViewer.vue` | Frontend Team Communication | Content viewer | Fetch/display reference file; own maximize/restore and Escape behavior | Team-owned equivalent of old artifact branch and artifact viewer interaction pattern | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Message/reference payload type | `team-communication-types.ts` | Team Communication | Used by service/API/frontend typing | Yes | Yes | Generic artifact item |
| Reference path normalization/type inference | `team-communication-identity.ts` | Team Communication | Used by service/content/query | Yes | Yes | Old message-file-reference identity clone |
| Content fetch display logic | `TeamReferenceFileViewer.vue` or extracted composable | Team Communication frontend | Used only in Team Communication detail | Yes | Yes | Artifact viewer dependency leak |
| Reference maximize interaction | Team Communication viewer-local state or Team-owned composable | Team Communication frontend | Used only by selected message reference file previews | Yes | Yes | Shared artifact display-mode state |
| Explicit send-message reference validation | Move from `message-file-references` to send-message/team-communication owned file | Team communication / send-message delivery | Still needed by tool parser | Yes | Yes | Legacy message-reference subsystem anchor |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamCommunicationMessage` | Yes | Yes | Low | One row = one accepted message. |
| `TeamCommunicationReferenceFile` | Yes | Yes | Low | Child of one message; id includes message ownership. |
| Frontend selected detail item | Yes | Yes | Low | Use discriminated union `message` / `reference`. |
| Agent artifact viewer item | Yes after cleanup | Yes | Low | Remove `message_reference` variant. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts` | Team send-message delivery | Delivery DTO | Add optional message metadata fields if needed | Contract extension | TeamCommunication identity |
| `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` | Team send-message delivery | Accepted event builder | Populate `message_id`, `created_at`, receiver fields, references | One accepted-message shaper | TeamCommunication identity |
| `autobyteus-server-ts/src/agent-execution/events/processors/team-communication/team-communication-message-event-processor.ts` | Team Communication backend | Event processor | Emit one normalized `TEAM_COMMUNICATION_MESSAGE` per accepted `INTER_AGENT_MESSAGE` | Preserves processor decoupling and avoids service parsing raw runtime events | TeamCommunication normalizer/identity |
| `autobyteus-server-ts/src/agent-team-execution/backends/*/*team-manager*.ts` | Runtime managers | Delivery coordinators | Ensure one normalized message metadata instance is used for input/event | Prevent id/timestamp drift | Runtime builders |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | AutoByteus bridge | Event enrichment | Ensure native converted `INTER_AGENT_MESSAGE` has message id/timestamp/reference fields | AutoByteus parity owner | TeamCommunication identity |
| `autobyteus-ts/src/agent/message/inter-agent-message.ts` and related events/handlers | Native runtime | Native message contract | Propagate optional message id/created timestamp where available | Prevent native drift | TeamCommunication payload |
| `autobyteus-server-ts/src/services/team-communication/*` | Team Communication backend | New service boundary | Types, identity, normalization, projection, content | Dedicated message subject | Yes |
| `autobyteus-server-ts/src/api/graphql/types/team-communication.ts` | API | GraphQL facade | Query team communication messages | Transport mapping | Yes |
| `autobyteus-server-ts/src/api/rest/team-communication.ts` | API | REST facade | Stream message reference content | Transport mapping | Yes |
| `autobyteus-web/stores/teamCommunicationStore.ts` | Frontend Team Communication | State owner | Store/hydrate/upsert messages and focused perspective | Single UI state owner | Yes |
| `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts` | Streaming frontend | Event mapper | Upsert Team Communication store from `TEAM_COMMUNICATION_MESSAGE`; keep raw `INTER_AGENT_MESSAGE` for conversation segment behavior only | Existing event boundary | Yes |
| `autobyteus-web/services/runHydration/teamCommunicationHydrationService.ts` | Hydration frontend | Hydration boundary | Fetch/hydrate team messages | Mirrors current hydration pattern | Yes |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Team tab | Composition owner | Compose collapsible Task Plan and Messages sections; no redundant Team header | Current Team tab owner | Yes |
| `autobyteus-web/components/workspace/team/TeamCommunication*.vue` | Team Communication UI | UI owner | Left message/reference list, right message/file detail, resizable divider | Clear component split | Yes |
| `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue` | Team Communication UI | Reference content viewer | Fetch selected reference content, Raw/Preview controls, maximize/restore, Escape-to-restore | Reference viewing belongs to message-owned Team Communication | FileViewer |
| `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Agent Artifacts UI | Artifact tab owner | Agent file changes only | Removes mixed subject | RunFileChangesStore |
| `autobyteus-web/components/workspace/agent/ArtifactList.vue` | Agent Artifacts UI | Artifact list | Agent artifacts only | Removes sent/received sections | Agent artifact item |
| `autobyteus-web/components/workspace/agent/artifactViewerItem.ts` | Agent Artifacts UI | Item mapper | Agent artifact item only | Removes message reference variant | RunFileChangeArtifact |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Agent Artifacts UI | Content viewer | Run file-change content only | Removes team communication content | FileViewer |

## Ownership Boundaries

- Team Communication is the authoritative boundary for inter-agent message history and message reference files.
- Agent Artifacts is the authoritative boundary for produced/touched files from a run.
- Send-message delivery remains the authoritative boundary for accepting and shaping raw inter-agent message payloads; the Team Communication processor consumes accepted events, not raw tool-call arguments.
- TeamCommunicationService must consume normalized Team Communication processor output rather than parsing raw runtime events itself, except for tests/fallback-free fixture normalization inside the processor.
- Team Communication content resolution must not call the old message-file-reference projection because that would preserve the old owner as an internal dependency. It should resolve from message projection.
- Team Communication reference maximize/restore is owned by the Team Communication viewer. It may copy the ArtifactContentViewer interaction pattern but must not depend on artifact viewer ownership or artifact display-mode state.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| TeamCommunicationProjectionService | Projection store, active service, normalizer | GraphQL resolver, hydration service | Frontend reading `message_file_references.json` shape | Add query fields/mappers |
| TeamCommunicationContentService | Message projection lookup, file readability/mime | REST route, TeamReferenceFileViewer | Artifact viewer building message-file-reference URLs | Add content route capabilities |
| ArtifactsTab | Run file changes store/viewer | Right-side Artifacts tab | Combining `messageFileReferencesStore` rows | Route message references to Team tab |
| TeamCommunicationMessageProcessor | Raw `INTER_AGENT_MESSAGE` mapping, reference dedupe, derived event payload | TeamCommunicationService, streaming handlers | Service parsing raw message payloads or emitting file-first rows | Add fields to processor output |
| TeamCommunicationReferenceViewer | FileViewer, local maximized/restore state, keyboard handling | TeamCommunicationDetail | ArtifactContentViewer or artifact display-mode store controlling team reference preview | Add Team-owned viewer state/composable |
| Send-message runtime builder | Payload ids/timestamps/reference list | Runtime managers/backends | Managers creating mismatched ids/timestamps | Strengthen builder API |

## Dependency Rules

Allowed:

- TeamCommunicationMessageProcessor may read accepted `INTER_AGENT_MESSAGE` payloads and emit normalized `TEAM_COMMUNICATION_MESSAGE` payloads.
- TeamCommunicationService may subscribe to TeamRun events and read normalized `TEAM_COMMUNICATION_MESSAGE` payloads.
- TeamCommunicationProjectionService may read active service state or persisted team communication projection.
- TeamCommunicationContentService may depend on TeamCommunicationProjectionService.
- Team tab frontend may depend on `teamCommunicationStore` and Team Communication content route.
- Artifacts tab may depend on `runFileChangesStore` only.
- `TeamCommunicationReferenceViewer` may depend on `FileViewer`, `Teleport`, and local or Team-owned maximize state.

Forbidden:

- Artifacts tab must not import `messageFileReferencesStore`, `teamCommunicationStore`, or message-reference artifact item types.
- Team Communication UI must not reuse `ArtifactContentViewer` if that keeps artifact/message reference coupling.
- Team Communication UI must not import/use `ArtifactContentViewer` or artifact display-mode stores for maximize behavior.
- No content scanning from `content` to create reference files.
- No dual display of the same message references in both Team tab and Artifacts tab.
- No compatibility route/query/store kept only for Sent/Received Artifacts.
- TeamCommunicationService must not become a raw event parser when the event-processor pipeline can own that translation.
- Team Communication store must not upsert from raw `INTER_AGENT_MESSAGE`; that would bypass the processor boundary. Raw inter-agent messages may continue to feed existing member conversation display only.
- Team tab must not use a fixed/min-height empty Task Plan body that crowds Messages.
- Team Communication must not vertically stack a file preview under the message list as the primary layout; it must use a left-list/right-detail interaction like Artifacts.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `getTeamCommunicationMessages(teamRunId)` | Team communication messages | Return message projection | `teamRunId` | Replaces `getMessageFileReferences`. |
| `GET /team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content` | One reference file under one message | Stream content | `teamRunId + messageId + referenceId` | Message child identity is explicit. |
| `teamCommunicationStore.getPerspectiveForMember(teamRunId, memberRunId)` | Focused-member message perspective | Sent/received message groups/list | `teamRunId + memberRunId` | Message-first, not file-first. |
| `ArtifactsTab` props/store reads | Agent artifacts | Render produced/touched files | `runId` | No team reference identity accepted. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `getTeamCommunicationMessages` | Yes | Yes | Low | N/A |
| Team communication content route | Yes | Yes | Low | Include both messageId and referenceId. |
| ArtifactsTab artifact list | Yes after cleanup | Yes | Low | Remove message_reference item shape. |
| `send_message_to.reference_files` | Yes | Yes | Low | Keep explicit list semantics. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Message projection | `TeamCommunicationMessage` | Yes | Low | Use consistently. |
| Child reference | `TeamCommunicationReferenceFile` | Yes | Low | Avoid generic `artifact` in Team UI. |
| Old standalone refs | `MessageFileReference*` | No for target | High | Remove/decommission. |
| Agent file artifacts | `AgentArtifactViewerItem` | Yes | Low | Keep for Artifacts tab. |

## Applied Patterns (If Any)

- Projection service pattern: used for Team Communication as a team-level event-derived projection, similar structurally to the old reference service but with the correct message subject.
- Master/detail UI pattern: Team tab uses compact message list and detail pane, matching the successful right-panel split interaction while keeping the left list message-first.
- Discriminated selection union: detail pane selection is either full message or reference file.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/team-communication/` | Folder | Team Communication backend | Message projection and content services | New backend subject | Agent artifact UI logic |
| `autobyteus-server-ts/src/api/graphql/types/team-communication.ts` | File | GraphQL API | Query message projection | Existing GraphQL folder pattern | Projection persistence |
| `autobyteus-server-ts/src/api/rest/team-communication.ts` | File | REST API | Stream selected reference content | Existing REST route pattern | Path policy outside service |
| `autobyteus-web/stores/teamCommunicationStore.ts` | File | Frontend state | Team message projection and perspective | Existing Pinia store pattern | Artifact viewer item mapping |
| `autobyteus-web/components/workspace/team/` | Folder | Team tab UI | Team communication components | Current Team UI home | Agent artifact sections |
| `autobyteus-web/components/workspace/agent/` | Folder | Agent artifact UI | Produced/touched artifacts only | Existing artifact UI home | Team message reference rows |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `services/team-communication` | Persistence/Provider + domain helpers | Yes | Low | Mirrors existing service folders but with correct subject. |
| `components/workspace/team` | UI feature | Yes | Low | Team tab owns communication UI. |
| `components/workspace/agent` | UI feature | Yes after cleanup | Low | Agent artifacts only. |
| `api/rest` / `api/graphql/types` | Transport | Yes | Low | Thin facades only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Message-first UI | `Sent` section -> `architecture_reviewer` group -> message preview -> `Reference files` vertical rows | `Sent to architecture_reviewer` repeated for every group/message, or `Sent Artifacts` -> `design-spec.md` detached from message | Keeps files in communication context while avoiding redundant direction words. |
| Projection shape | `{ messageId, senderRunId, receiverRunId, content, referenceFiles: [{ referenceId, path }] }` | `{ referenceId, senderRunId, receiverRunId, path }` as primary UI data | Message is the domain subject. |
| Artifact tab | Agent file changes only | Agent + Sent + Received sections | Avoids duplicate ownership. |
| Content route | `/team-communication/messages/:messageId/references/:referenceId/content` | `/message-file-references/:referenceId/content` | Route identity reflects message ownership. |
| Live fanout split | `INTER_AGENT_MESSAGE` continues to conversation feed; `TEAM_COMMUNICATION_MESSAGE` updates Team Communication store/service | Team Communication store reading raw `INTER_AGENT_MESSAGE` directly | Preserves processor boundary and avoids duplicate team records. |
| Team tab sections | Collapsible `Task Plan` and `Messages` headers like Activity; Messages expanded by default | Redundant `Team` header plus fixed 34% empty task-plan section | Maximizes useful communication space. |
| Reference preview | Left message/reference list + right file/message preview | Message list on top and file preview squeezed below | Matches Artifacts ergonomics while preserving Team ownership. |
| Reference maximize | Selected `math_solution.txt` in Team Communication -> maximize button -> full-window Team-owned FileViewer -> Escape restores split | Import `ArtifactContentViewer` or use artifact zen-mode store for Team references | Reuses proven UX without crossing ownership boundaries. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep Sent/Received Artifacts while adding Team Communication | Would avoid changing old UI tests | Rejected | Remove Sent/Received from Artifacts tab. |
| Keep `messageFileReferencesStore` for Team UI | Existing store already hydrates references | Rejected | New `teamCommunicationStore` with message-first shape. |
| Keep old GraphQL/REST APIs as hidden fallback | Existing content route works | Rejected | New message-centric query/content route. |
| Keep `MESSAGE_FILE_REFERENCE_DECLARED` event for old projection | Existing pipeline emits it | Rejected unless another non-legacy consumer is found | New processor emits one message-centric `TEAM_COMMUNICATION_MESSAGE` event instead. |
| Use content path scanning as fallback | Could backfill missing refs | Rejected | Explicit `reference_files` only. |

## Derived Layering (If Useful)

- Runtime/event layer: accepted `INTER_AGENT_MESSAGE` events and derived `TEAM_COMMUNICATION_MESSAGE` processor events.
- Projection/service layer: TeamCommunicationService and projection/content services.
- Transport layer: GraphQL/REST facades.
- Frontend state layer: teamCommunicationStore.
- Frontend presentation layer: Team tab collapsible Task Plan/Messages sections, message left-list/right-detail panel, and simplified Artifacts tab.

## Migration / Refactor Sequence

1. Add Team Communication backend types/identity/normalizer/projection/content services.
2. Enrich accepted `INTER_AGENT_MESSAGE` payloads with `message_id`, `created_at`, `receiver_run_id`, receiver name, and normalized `reference_files` consistently across Codex, Claude, AutoByteus, and mixed paths.
3. Add/register `TeamCommunicationMessageProcessor` in the agent-run event processor registry; it emits one `TEAM_COMMUNICATION_MESSAGE` event per accepted `INTER_AGENT_MESSAGE`.
4. Attach TeamCommunicationService to active team runs in `AgentTeamRunManager` and make it persist `TEAM_COMMUNICATION_MESSAGE` events.
5. Add GraphQL query and REST content route for Team Communication.
6. Add frontend protocol/types/store/hydration for team communication messages.
7. Build Team tab message-first UI with Activity-style collapsible Task Plan/Messages sections, Messages expanded by default, no redundant internal Team header, and Artifacts-style left-list/right-detail preview behavior.
8. Add TeamCommunicationReferenceViewer-owned maximize/restore, Escape-to-restore, and Raw/Preview controls while maximized.
9. Simplify Artifacts tab/list/viewer to agent file-change artifacts only.
10. Remove/decommission message-file-reference processor/event/service/routes/frontend store/tests/docs that exist only for old Sent/Received Artifacts.
11. Update agent/team instruction wording and docs.
12. Add/update tests, including absence of Sent/Received in Artifacts tab and presence of message references under Team Communication.

## Validation Plan

- Backend unit tests:
  - TeamCommunicationMessageProcessor emits one message-centric event per accepted `INTER_AGENT_MESSAGE` and no standalone per-file events.
  - TeamCommunication normalizer dedupes refs within a message.
  - TeamCommunicationService persists normalized `TEAM_COMMUNICATION_MESSAGE` events.
  - Content service returns file stream and graceful errors.
- Backend integration/API tests:
  - `getTeamCommunicationMessages(teamRunId)` active/historical reads.
  - Team communication content route resolves by `teamRunId + messageId + referenceId`.
  - Old `getMessageFileReferences`/message-file-reference route removed if no non-legacy consumer remains.
- Frontend store tests:
  - focused member sent/received perspectives.
  - live upsert from `TEAM_COMMUNICATION_MESSAGE`.
  - no Team Communication store upsert from raw `INTER_AGENT_MESSAGE`.
  - historical replace hydration.
- Frontend component tests:
  - Team tab renders collapsible Task Plan/Messages section headers; empty Task Plan does not consume large body space by default.
  - Team tab renders message previews, full detail, vertical reference rows in the left pane, and selected message/reference content in the right pane.
  - Reference selection fetches preview state.
  - TeamCommunicationReferenceViewer maximize button enters full-window mode and restore returns to normal pane.
  - Escape restores from maximized Team Communication reference view.
  - Raw/Preview controls remain available and functional while maximized.
  - Tests or review evidence prove TeamCommunicationReferenceViewer does not depend on `ArtifactContentViewer` or artifact display-mode store.
  - Artifacts tab renders only agent artifacts and no Sent/Received sections.
- Grep/review checks:
  - no UI copy telling users `reference_files` appear as Sent/Received Artifacts;
  - no artifact viewer `message_reference` branch;
  - no content scanning fallback.

## Documentation / Instruction Updates

- Update `member-run-instruction-composer.ts` wording from Sent/Received Artifacts to Team Communication messages.
- Update frontend docs around agent artifacts to say Artifacts tab is produced/touched files only.
- Add/adjust docs for Team Communication reference files.

## Open Questions / Review Focus

- Derived event name decision: use `TEAM_COMMUNICATION_MESSAGE`.
- Whether to remove the `MESSAGE_FILE_REFERENCE_DECLARED` enum/protocol entirely or keep it only if a non-legacy backend/internal consumer exists. Current investigation found only old standalone reference projection/UI consumers, so the design expects removal.
- UI review focus: ensure the implementation follows the Activity-style collapsible section behavior and the Artifacts-style left-list/right-detail preview behavior instead of the initial fixed-height vertical stack.
- Reference viewer addendum decision: add maximize/restore to `TeamCommunicationReferenceViewer` as a small local UX addendum. It may copy/adapt the ArtifactContentViewer pattern, but ownership remains Team Communication-only.
- Whether the Team Communication file viewer should extract common content-viewing logic from `ArtifactContentViewer` or implement a small dedicated viewer using `FileViewer`. Either is acceptable if artifact/message ownership remains separated; direct `ArtifactContentViewer` reuse is not acceptable.
