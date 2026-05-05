# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined - ready for architecture review. User-approved product direction on 2026-05-05: Team tab owns message-first team communication and message reference files; member Artifacts tab removes Sent/Received communicated-reference sections. No legacy duplicated UI path.

## Goal / Problem Statement

The current Artifacts tab can show communicated reference files as **Sent Artifacts** and **Received Artifacts**. That improved file discoverability, but it is still file-first: users can see that a file was sent or received, but not the inter-agent message context that explains why the file was referenced.

The product direction is to make team communication transparent in the **Team** tab. Inter-agent communication should be shown as message-first records: each message shows direction, counterpart, message type, preview/content, and the `reference_files` that belong to that message. Referenced files should be clickable from within the message block and previewable. Because communicated reference files semantically belong to messages, the Artifacts tab should no longer display Sent/Received Artifacts.

This is a clean-cut refactor. Do not keep legacy duplicated UI paths or compatibility display modes for Sent/Received Artifacts in the Artifacts tab.

## Investigation Findings

Initial bootstrap findings:

- The current branch is a new ticket worktree from latest `origin/personal` at `687b3fde` (`docs(ticket): record team message artifacts finalization`).
- The current Team right-panel tab is implemented by `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` and currently renders only `TaskPlanDisplay`.
- The current Artifacts UI combines focused-agent file changes with message-file-reference perspective items in `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` and `ArtifactList.vue`.
- The existing frontend message-reference store is file-reference-oriented (`messageFileReferencesStore.ts`), with Sent/Received grouping by focused member. This is useful evidence but is likely not the correct final UI source for a message-first Team Communication view.
- The live frontend already receives `INTER_AGENT_MESSAGE` payloads in `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts`, but they are currently appended to member conversation feeds rather than persisted as a team communication projection.
- Existing explicit `reference_files` contract should remain the authoritative source for communicated reference files; message content must not be scanned.
- API/E2E reroute artifact `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/team-message-referenced-artifacts/api-e2e-design-impact-reroute-artifacts-tab-ownership.md` confirms this is a requirements/design ownership correction, not an implementation bug in the finalized prior ticket.
- The explicit design decision for this ticket is the reroute's Option B: move team message references to the Team tab only and remove Sent/Received communicated-reference sections from the member Artifacts tab.
- A later API/E2E validation update after CR-009 confirmed executable validation passed for the prior ticket's test-only local fix, but the design-impact/requirement-gap remains unresolved in that old ticket until this new ownership refactor is implemented. The update again requested choosing between duplicate visibility and Team-tab-only ownership; this ticket explicitly chooses Team-tab-only ownership.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change + Refactor + UI feature.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Legacy Or Compatibility Pressure.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed.
- Evidence basis: The current Sent/Received Artifacts UI treats message-attached `reference_files` as standalone artifact rows in the Artifacts tab. The user clarified that reference files belong to the communication message itself and should be shown under team communication. Keeping both views would duplicate the same semantic data and preserve legacy behavior.
- Requirement or scope impact: Introduce message-first Team Communication UI/projection, move communicated reference-file display out of Artifacts, and explicitly remove/decommission Sent/Received Artifacts display paths rather than maintaining both.

## Recommendations

- Treat accepted `INTER_AGENT_MESSAGE` events as the source for team communication records.
- Model team communication as **messages first**; each message owns its child reference-file rows.
- In the Team tab, keep Task Plan visible but add a communication area that can show sent/received messages for the focused team member.
- The Team tab should follow the existing Activity tab's collapsible-section behavior: Task Plan and Messages are section headers with chevrons/counts, and the expanded section receives the usable height.
- The empty Task Plan state must not reserve a large fixed panel above Team Communication; when there is no plan, it should remain collapsed or compact unless the user opens it.
- Use a master/detail interaction adapted to the existing right-panel width:
  - compact email-like message rows show a sent/received direction icon, message type/title, inline counterpart metadata such as `to student` or `from student`, timestamp, truncated preview, and vertical reference-file list in a left pane;
  - selecting a message shows full message content in a right detail pane;
  - selecting a reference file previews its content in the right detail pane using the existing safe content-resolution behavior where possible.
- When the selected item is a reference file, the Team Communication-owned reference viewer should support maximize/restore using the same interaction pattern as the Artifacts content viewer: maximize button, restore button, Escape-to-restore, and Raw/Preview controls available while maximized.
- Do not keep an internal redundant `Team` header inside the Team tab; the right-side tab label already provides that context.
- Do not keep a visually heavy hierarchy of `Sent/Received -> counterpart group header -> message -> reference`. The left list should remain compact: `Sent` and `Received` are top-level sections, while counterpart direction appears inline in each message row.
- Reference-file child rows should use file-type icons where the reference type is known instead of a generic paperclip for every file.
- Selected message detail should render natural/self-contained message content with the shared Markdown renderer used by conversation/file preview paths, instead of a plain `<pre>` block.
- Remove Sent/Received Artifacts from the Artifacts tab; keep that tab focused on files created/touched by the focused agent.
- Treat the prior `team-message-referenced-artifacts` Sent/Received Artifacts requirements (`REQ-016`, `REQ-017`, `AC-008`, `AC-009`, `AC-011`) as intentionally superseded for this new ticket.
- Do not keep legacy duplicated Sent/Received artifact sections, fallback path scanning, or hidden compatibility rendering.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

Rationale: The change spans server/event projection or hydration, frontend stores, Team tab UI, Artifacts tab simplification, tests, and docs. It should reuse the existing explicit `reference_files` contract and content-preview services, so it is not a ground-up runtime redesign.

## In-Scope Use Cases

- UC-001: As a user viewing a team run, I can open the Team tab and see inter-agent messages for the focused team member.
- UC-002: As a user, I can see whether each message was sent to or received from a teammate, including the teammate name and message type.
- UC-003: As a user, I can scan a truncated message preview without the list being overwhelmed by very long message content.
- UC-004: As a user, I can select a message and read its full content.
- UC-005: As a user, I can see the message's referenced files listed vertically under that message.
- UC-006: As a user, I can click a referenced file from a message and preview its content or receive a graceful unavailable/deleted-file state.
- UC-007: As a user in the Artifacts tab, I see focused-agent created/touched artifacts without Sent/Received communicated-reference sections.
- UC-008: As a user opening historical team runs, I can hydrate and inspect team communication messages and their referenced files.

## Out of Scope

- Changing `send_message_to.reference_files` semantics.
- Reintroducing path scanning from message content.
- Uploading, copying, or snapshotting referenced file bytes during message delivery.
- Backfilling communication messages for legacy runs that lack accepted `INTER_AGENT_MESSAGE` event/projection data, unless the current durable run history already contains the needed data through the accepted event stream.
- New top-level application tabs outside the existing right-side Team tab.
- A separate chat composer or user ability to send inter-agent messages from this view.

## Functional Requirements

- REQ-001: The Team tab must include a Team Communication/messages area in addition to the existing Task Plan information.
- REQ-002: Team Communication must be message-first: each row/card represents one accepted inter-agent message, not one referenced file.
- REQ-003: Team Communication must show direction from the focused member perspective through top-level `Sent` and `Received` sections plus compact row-level direction metadata. The left list should not rely on prominent counterpart group headers; each message row must show inline `to <counterpart>` or `from <counterpart>` metadata beside the message title/type.
- REQ-004: Each message item must show message type and enough timestamp/order context to understand when the message occurred.
- REQ-005: Each message item must show a bounded preview of message content; long content must not expand the list indefinitely.
- REQ-006: Selecting a message must show the full message content in a detail/preview area.
- REQ-007: If a message has explicit `reference_files`, the files must be shown as a vertical child list within that message item, not as independent top-level artifacts.
- REQ-008: Selecting a reference file from a message must show its content in the detail/preview area using safe content resolution and existing graceful unavailable/deleted-file behavior where applicable.
- REQ-009: The Artifacts tab must stop rendering Sent Artifacts and Received Artifacts sections for message-file references.
- REQ-010: The Artifacts tab must remain focused on focused-agent created/touched file artifacts.
- REQ-011: Existing `send_message_to.reference_files` validation and event payload semantics must remain authoritative; message content must not be scanned to infer references.
- REQ-012: Live team streaming must update the Team Communication view as accepted inter-agent messages arrive.
- REQ-013: Historical team hydration must load the same message-first communication data needed for the Team tab.
- REQ-014: The message/reference data model must preserve the relationship between one message and its reference files.
- REQ-015: If a message references the same file multiple times in one accepted message, the UI must avoid duplicate child rows for that message.
- REQ-016: The implementation must remove/decommission obsolete Sent/Received artifact UI paths and tests rather than leaving hidden compatibility branches.
- REQ-017: Existing Agent conversation feeds may continue showing inter-agent messages where currently appropriate, but the Team tab must become the primary team communication/context view.
- REQ-018: The UI must handle empty states clearly: no task plan, no communication messages, no selected message/file, and unavailable referenced file content.
- REQ-019: The standalone message-file-reference artifact projection/event/API created to support Sent/Received Artifacts must be removed or replaced by a message-centric Team Communication projection/content boundary; frontend UI must not consume standalone message-reference artifact rows as artifacts.
- REQ-020: Agent/team instructions and docs must describe `reference_files` as files shown under Team Communication messages, not as Sent/Received Artifacts in the member Artifacts tab.
- REQ-021: Team Communication live frontend state must be updated from normalized `TEAM_COMMUNICATION_MESSAGE` events, not directly from raw `INTER_AGENT_MESSAGE` events. Raw `INTER_AGENT_MESSAGE` may continue feeding existing conversation displays.
- REQ-022: The Team tab must not render a redundant internal `Team` header row above Task Plan/Messages.
- REQ-023: Task Plan and Team Communication/Messages must use compact collapsible section headers modeled after the Activity tab; Messages must be the default expanded section, and an empty Task Plan must not consume a large fixed-height body.
- REQ-024: Team Communication message/reference selection must use an Artifacts-like left-list/right-detail layout so selected file content is previewed beside the message list, not squeezed underneath it.
- REQ-025: The Team Communication reference-file detail viewer must provide maximize/restore for selected reference files. The control must be owned by `TeamCommunicationReferenceViewer`, may reuse the Artifacts content viewer interaction pattern, and must not import/use `ArtifactContentViewer` or an artifact display-mode store.
- REQ-026: While a Team Communication reference file is maximized, Raw/Preview controls for supported text/markdown/html files must remain available, and pressing Escape must restore the normal Team tab layout.
- REQ-027: Message-detail maximize behavior must remain unchanged: maximize applies only to selected reference-file previews, not to plain selected message content unless separately designed later.
- REQ-028: Team Communication message rows must use a compact email-like hierarchy: direction icon, message title/type, inline `to/from <counterpart>`, timestamp, bounded preview, and reference child rows.
- REQ-029: Team Communication reference child rows must use file-type icons based on the reference file type when available; a generic paperclip must not be the only normal visual treatment.
- REQ-030: Selected message detail must render message content with the shared Markdown renderer so natural handoff content, lists, code fences, and links are readable. Plain `<pre>` rendering is not acceptable for the normal selected-message detail.

## Acceptance Criteria

- AC-001: Given a focused team member has sent accepted inter-agent messages, the Team tab shows them under a `Sent` section with compact rows that include a sent direction icon and inline `to <counterpart>` metadata.
- AC-002: Given a focused team member has received accepted inter-agent messages, the Team tab shows them under a `Received` section with compact rows that include a received direction icon and inline `from <counterpart>` metadata.
- AC-003: Given a message has long content, the message list shows a truncated preview while selecting the message shows full content.
- AC-004: Given a message has `reference_files`, those files appear vertically under that message in the Team Communication list.
- AC-005: Given a referenced file is selected, the detail/preview area shows the file content or a graceful unavailable/deleted-file state.
- AC-006: Given a message has no reference files, the message still appears normally without an empty/noisy reference section.
- AC-007: Given the Artifacts tab is opened for a focused team member, Sent Artifacts and Received Artifacts sections are absent.
- AC-008: Given the Artifacts tab is opened for a focused team member with touched files, agent-created/touched artifacts still appear and remain previewable.
- AC-009: Given a live accepted message is processed into a `TEAM_COMMUNICATION_MESSAGE` with `referenceFiles`, the Team Communication view updates without requiring a page reload.
- AC-010: Given a historical team run is opened, the Team Communication view hydrates from durable state and displays message records and references when available.
- AC-011: Automated or review evidence proves no content-scanning fallback was added or retained for Team Communication references.
- AC-012: Automated or review evidence proves legacy Sent/Received Artifacts rendering paths are removed/decommissioned rather than hidden behind a flag.
- AC-013: Tests cover focused-member perspective grouping for sent and received messages.
- AC-014: Tests cover reference-file selection from inside a message and preview-state transitions.
- AC-015: Review or grep evidence proves old standalone `MESSAGE_FILE_REFERENCE_DECLARED` / `messageFileReferencesStore` / Sent-Received-Artifacts UI paths are removed or no longer used by product UI.
- AC-016: Docs/instructions no longer tell agents/users that `reference_files` appear as Sent/Received Artifacts in the Artifacts tab.
- AC-017: The Team tab has no redundant internal `Team` header; Task Plan and Messages render as collapsible headers with counts/chevrons.
- AC-018: With no task plan, the Task Plan section does not occupy a large empty area and Messages retains the primary usable height.
- AC-019: Selecting a message reference file shows the file preview in a right-side detail pane while the message/reference list remains visible on the left.
- AC-020: Automated or review evidence proves `teamCommunicationStore` live updates are driven by `TEAM_COMMUNICATION_MESSAGE`, not raw `INTER_AGENT_MESSAGE`.
- AC-021: Given a Team Communication reference file is selected, the reference viewer shows a maximize control; activating it displays the file in a full-window/zen shell and activating restore returns to the normal Team tab split.
- AC-022: Given a Team Communication reference file preview is maximized, pressing Escape restores the normal Team tab split.
- AC-023: Given a supported markdown/html/text reference is maximized, Raw/Preview controls remain usable and do not require leaving maximized view.
- AC-024: Review or automated evidence proves the maximize behavior is implemented in Team Communication-owned components without importing `ArtifactContentViewer` or artifact display-mode state.
- AC-025: Given a message row has references, each reference row shows a file-type-specific icon when the reference type is known.
- AC-026: Given a message is selected, the right detail pane renders the message body through the shared Markdown renderer rather than a plain `<pre>` block.
- AC-027: Review or component-test evidence proves the left list does not render a prominent extra counterpart group-header layer between `Sent`/`Received` and message rows.

## Constraints / Dependencies

- Base branch: `origin/personal` at bootstrap commit `687b3fde`.
- The existing explicit `send_message_to.reference_files` contract is already merged and should be reused.
- Referenced files remain local path references; content may be unavailable if files are deleted or moved.
- The Team tab lives in the right-side panel, so the design must remain usable in a constrained width.
- No legacy code retention for the old Sent/Received Artifacts UI.
- The finalized previous ticket remains historical evidence; this ticket owns the corrective refactor and should not reopen or preserve the old UI contract.

## Assumptions

- The focused team member remains the natural perspective for `Sent` and `Received` sections; section names imply coarse direction, while rows include concise inline `to/from <counterpart>` metadata because prominent counterpart group headers are no longer the target hierarchy.
- The message-first view should use accepted inter-agent messages, not raw tool-call activity cards.
- Existing safe file content viewer/resolution behavior can be reused or adapted for message reference previews.
- Task Plan remains part of the Team tab, but the final layout must use compact collapsible section presentation based on current UI review.
- The Artifacts content viewer maximize behavior is a UI interaction pattern that can be copied/adapted for Team Communication reference files, but ownership must stay separate.

## Risks / Open Questions

- Need to verify whether current durable run history stores enough accepted `INTER_AGENT_MESSAGE` data to build historical Team Communication without introducing a new projection.
- Need architecture review to approve the final `TEAM_COMMUNICATION_MESSAGE` event naming and live fanout split.
- Need implementation to verify the Artifacts-like split remains usable at the narrowest supported right-side Team tab width.
- Need implementation to verify maximize/restore works for Team Communication reference files without coupling to Agent Artifacts state.

## Requirement-To-Use-Case Coverage

- UC-001 -> REQ-001, REQ-012, REQ-013, REQ-018, REQ-019, REQ-021, REQ-023
- UC-002 -> REQ-002, REQ-003, REQ-004
- UC-003 -> REQ-005
- UC-004 -> REQ-006, REQ-024, REQ-030
- UC-005 -> REQ-007, REQ-014, REQ-015, REQ-028, REQ-029
- UC-006 -> REQ-008, REQ-018, REQ-024, REQ-025, REQ-026, REQ-027
- UC-007 -> REQ-009, REQ-010, REQ-016, REQ-019, REQ-020
- UC-008 -> REQ-013, REQ-014

## Acceptance-Criteria-To-Scenario Intent

- AC-001, AC-002 -> Validate focused-member sent/received message perspective.
- AC-003 -> Validate long-content list usability.
- AC-004, AC-006 -> Validate references as message children, including no-reference messages.
- AC-005, AC-014 -> Validate clickable preview behavior.
- AC-007, AC-008, AC-012 -> Validate clean-cut Artifacts tab refactor without legacy Sent/Received sections.
- AC-009, AC-010 -> Validate live and historical data paths.
- AC-017, AC-018 -> Validate compact Team tab section layout.
- AC-019 -> Validate Artifacts-like reference preview ergonomics.
- AC-020 -> Validate processor-boundary live frontend ingestion.
- AC-021, AC-022, AC-023, AC-024 -> Validate Team Communication-owned reference maximize/restore behavior and ownership separation from Agent Artifacts.
- AC-025 -> Validate reference child row visual clarity.
- AC-026 -> Validate selected message readability.
- AC-027 -> Validate compact email-like left-list hierarchy.
- AC-011 -> Preserve explicit-reference-only invariant.
- AC-015 -> Validate clean removal of standalone message-reference artifact UI/event/store ownership.
- AC-016 -> Validate docs/instruction ownership language.
- AC-013 -> Validate grouping/perspective logic.

## Approval Status

Approved for design by user direction in the 2026-05-05 discussion. The user explicitly confirmed Team-tab ownership and asked to finish the design and trigger architecture review.
