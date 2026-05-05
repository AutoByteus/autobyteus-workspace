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
- Use a master/detail interaction adapted to the existing right-panel width:
  - compact message list/cards show direction, counterpart, message type, truncated preview, and vertical reference-file list;
  - selecting a message shows full message content;
  - selecting a reference file previews its content using the existing safe content-resolution behavior where possible.
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
- REQ-003: Each message item must show direction from the focused member perspective: `Sent to <member>` or `Received from <member>`.
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

## Acceptance Criteria

- AC-001: Given a focused team member has sent accepted inter-agent messages, the Team tab shows those messages as `Sent to <member>` message cards/rows.
- AC-002: Given a focused team member has received accepted inter-agent messages, the Team tab shows those messages as `Received from <member>` message cards/rows.
- AC-003: Given a message has long content, the message list shows a truncated preview while selecting the message shows full content.
- AC-004: Given a message has `reference_files`, those files appear vertically under that message in the Team Communication list.
- AC-005: Given a referenced file is selected, the detail/preview area shows the file content or a graceful unavailable/deleted-file state.
- AC-006: Given a message has no reference files, the message still appears normally without an empty/noisy reference section.
- AC-007: Given the Artifacts tab is opened for a focused team member, Sent Artifacts and Received Artifacts sections are absent.
- AC-008: Given the Artifacts tab is opened for a focused team member with touched files, agent-created/touched artifacts still appear and remain previewable.
- AC-009: Given a live `INTER_AGENT_MESSAGE` with `reference_files` arrives, the Team Communication view updates without requiring a page reload.
- AC-010: Given a historical team run is opened, the Team Communication view hydrates from durable state and displays message records and references when available.
- AC-011: Automated or review evidence proves no content-scanning fallback was added or retained for Team Communication references.
- AC-012: Automated or review evidence proves legacy Sent/Received Artifacts rendering paths are removed/decommissioned rather than hidden behind a flag.
- AC-013: Tests cover focused-member perspective grouping for sent and received messages.
- AC-014: Tests cover reference-file selection from inside a message and preview-state transitions.
- AC-015: Review or grep evidence proves old standalone `MESSAGE_FILE_REFERENCE_DECLARED` / `messageFileReferencesStore` / Sent-Received-Artifacts UI paths are removed or no longer used by product UI.
- AC-016: Docs/instructions no longer tell agents/users that `reference_files` appear as Sent/Received Artifacts in the Artifacts tab.

## Constraints / Dependencies

- Base branch: `origin/personal` at bootstrap commit `687b3fde`.
- The existing explicit `send_message_to.reference_files` contract is already merged and should be reused.
- Referenced files remain local path references; content may be unavailable if files are deleted or moved.
- The Team tab lives in the right-side panel, so the design must remain usable in a constrained width.
- No legacy code retention for the old Sent/Received Artifacts UI.
- The finalized previous ticket remains historical evidence; this ticket owns the corrective refactor and should not reopen or preserve the old UI contract.

## Assumptions

- The focused team member remains the natural perspective for `Sent to` and `Received from` labels.
- The message-first view should use accepted inter-agent messages, not raw tool-call activity cards.
- Existing safe file content viewer/resolution behavior can be reused or adapted for message reference previews.
- Task Plan remains part of the Team tab, but the final layout may choose compact, collapsible, or sectioned presentation based on design investigation.

## Risks / Open Questions

- Need to verify whether current durable run history stores enough accepted `INTER_AGENT_MESSAGE` data to build historical Team Communication without introducing a new projection.
- Need to decide whether to replace `message_file_references.json` with a message-centric projection or keep it as an internal/content-resolution support structure while adding a new message projection.
- Need to define exact detail-pane behavior when both a message and a child reference file can be selected.
- Need to ensure the right-side Team tab remains usable at narrow widths.

## Requirement-To-Use-Case Coverage

- UC-001 -> REQ-001, REQ-012, REQ-013, REQ-018, REQ-019
- UC-002 -> REQ-002, REQ-003, REQ-004
- UC-003 -> REQ-005
- UC-004 -> REQ-006
- UC-005 -> REQ-007, REQ-014, REQ-015
- UC-006 -> REQ-008, REQ-018
- UC-007 -> REQ-009, REQ-010, REQ-016, REQ-019, REQ-020
- UC-008 -> REQ-013, REQ-014

## Acceptance-Criteria-To-Scenario Intent

- AC-001, AC-002 -> Validate focused-member sent/received message perspective.
- AC-003 -> Validate long-content list usability.
- AC-004, AC-006 -> Validate references as message children, including no-reference messages.
- AC-005, AC-014 -> Validate clickable preview behavior.
- AC-007, AC-008, AC-012 -> Validate clean-cut Artifacts tab refactor without legacy Sent/Received sections.
- AC-009, AC-010 -> Validate live and historical data paths.
- AC-011 -> Preserve explicit-reference-only invariant.
- AC-015 -> Validate clean removal of standalone message-reference artifact UI/event/store ownership.
- AC-016 -> Validate docs/instruction ownership language.
- AC-013 -> Validate grouping/perspective logic.

## Approval Status

Approved for design by user direction in the 2026-05-05 discussion. The user explicitly confirmed Team-tab ownership and asked to finish the design and trigger architecture review.
