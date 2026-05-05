# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined - ready for architecture review. Revised on 2026-05-04 for the explicit `send_message_to.reference_files` refactor. This revision supersedes both the earlier receiver-scoped design and the intermediate content-scanning/Markdown-path-parser design.

## Goal / Problem Statement

Agents need a clean way to share files during team communication. The message body should remain natural, detailed, and self-contained, like an email body that still explains its attachments. Files that should appear in the Artifacts tab are additionally declared through an optional structured field on `send_message_to`.

The target behavior is:

- `send_message_to` accepts the existing `recipient_name`, `content`, and `message_type` arguments plus optional `reference_files`.
- `content` remains the complete communication: the sender should explain what is being handed off, why it matters, and naturally mention important file paths when those paths are part of the handoff.
- `reference_files` is an explicit attachment/reference list of absolute file paths the recipient may need to inspect, such as handoff documents, reports, logs, generated outputs, or validation evidence.
- The backend creates Artifacts-tab message-file-reference metadata only from the structured `reference_files` field on accepted inter-agent messages.
- The conversation still renders normal `INTER_AGENT_MESSAGE` content through the existing UI path; file paths in prose remain ordinary message text.
- The Artifacts tab projects one canonical team-level reference set as **Sent Artifacts** for the sender and **Received Artifacts** for the receiver.

`reference_files` is the preferred schema name over `attachments` because these are not uploaded file blobs; they are explicit local file references that the backend can later resolve through the persisted reference identity.

## Investigation Findings

- Dedicated ticket worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts`.
- Branch: `codex/team-message-referenced-artifacts`, tracking `origin/personal`.
- Existing generated file artifacts already use a backend event/projection/content pattern and must remain separate from message references.
- Current in-ticket UI work has improved the product by showing **Sent Artifacts** and **Received Artifacts** from team-level message-reference data.
- Runtime use showed that content-scanned references can work, but user review showed two product/design problems with that approach:
  - references appear for every absolute path mentioned in message prose, including upstream files that are useful context but not necessarily the sender's intended shared artifact list;
  - parsing file paths out of natural language/Markdown content is brittle and makes message prose an implicit API.
- Current send-message contracts do not yet expose a structured reference list. Relevant contract files include:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-argument-parser.ts`
  - `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts`
  - `autobyteus-ts/src/agent/message/send-message-to.ts`
  - `autobyteus-ts/src/agent-team/events/agent-team-events.ts`
  - `autobyteus-ts/src/agent/message/inter-agent-message.ts`
- Current in-ticket processor code derives references by scanning `INTER_AGENT_MESSAGE.payload.content` through `message-file-reference-paths.ts`; this is now the path to remove/refactor, not the target behavior to extend.
- Receiver-scoped reference storage/query/URL shapes remain obsolete: reference identity must stay team-level with sender/receiver as metadata and perspective inputs.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior change plus bounded refactor of an additive feature.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Legacy Or Compatibility Pressure.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now, bounded.
- Evidence basis: Natural message content, explicit file-reference intent, team-level artifact projection, and content serving have separate authorities. Content scanning makes prose double as a file-sharing API and causes noisy artifact rows; keeping both explicit references and content-scanning fallback would preserve two authorities for the same subject. The current receiver-scoped design also remains the wrong identity boundary.
- Requirement or scope impact: Add an explicit `reference_files` contract to send-message tools and delivery/events; remove content-path extraction as an artifact authority; keep the team-level Sent/Received projection/content endpoint.

## Recommendations

- Add optional `reference_files: string[]` to all `send_message_to` tool definitions and native/autobyteus send-message contracts.
- Describe `reference_files` positively as an optional attachment/reference list of absolute file paths the recipient may need to inspect.
- Keep `content` as the natural, self-contained communication body; schema/instruction examples should show agents explaining the handoff and mentioning important paths in `content`, the way an email body can describe attached files.
- Treat `reference_files` as the structured attachment/index list for Artifacts registration, not as a substitute for self-contained message content.
- Render accepted `reference_files` into the recipient-visible runtime input as a short generated **Reference files:** block, analogous to an email attachment list, so the recipient has an explicit attachment/index view in addition to the self-contained body.
- Carry normalized `reference_files` through `InterAgentMessageDeliveryRequest` and `INTER_AGENT_MESSAGE.payload.reference_files`.
- Keep `MessageFileReferenceProcessor` as the event-sidecar owner, but refactor it to read only `payload.reference_files`; remove the free-text path scanner.
- Keep one canonical team-level `message_file_references.json` per team run.
- Deduplicate canonical reference entries by `teamRunId + senderRunId + receiverRunId + normalizedPath`; repeated sends update timestamps/provenance but do not create duplicate rows or occurrence counts.
- Project canonical entries in the focused member's Artifacts tab:
  - if focused member is `senderRunId`: **Sent Artifacts** -> receiver/counterpart agent -> file rows;
  - if focused member is `receiverRunId`: **Received Artifacts** -> sender/counterpart agent -> file rows.
- Fetch referenced content through `/team-runs/:teamRunId/message-file-references/:referenceId/content`.
- Remove receiver-scoped reference storage/query/URL identity and any message-content path-scanning fallback.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Preserve existing inter-agent message display behavior in the conversation.
- UC-002: Allow an agent to call `send_message_to` with optional explicit `reference_files`.
- UC-003: Deliver a self-contained natural message plus a generated reference-files attachment/index block to the recipient runtime when explicit references exist.
- UC-004: Derive team-level referenced-artifact metadata from accepted `INTER_AGENT_MESSAGE.payload.reference_files`.
- UC-005: Display references for the focused sender under **Sent Artifacts**, grouped by receiver/counterpart agent.
- UC-006: Display the same canonical references for the focused receiver under **Received Artifacts**, grouped by sender/counterpart agent.
- UC-007: Open referenced artifacts from the Artifacts tab through a backend content endpoint.
- UC-008: Keep current-run **Agent Artifacts** separate from message-derived **Sent Artifacts** and **Received Artifacts**.
- UC-009: Hydrate persisted message references after app/server restart.

## Out of Scope

- Changing the visual behavior of `InterAgentMessageSegment` except for guard tests proving no raw-path linkification or reference-store coupling was introduced.
- Removing `INTER_AGENT_MESSAGE`, replacing inter-agent display with a new conversation model, or reducing the natural detail allowed in message `content`.
- Scanning message `content` to create artifact rows.
- Keeping a compatibility fallback that creates references from paths found only in message prose.
- Making raw file paths in messages clickable.
- Global file-path linkification in ordinary user/assistant/thinking text, activity logs, terminal output, file previews, or Markdown generally.
- Uploading file bytes through `send_message_to`; `reference_files` are path references only.
- Editing referenced files from the Artifacts preview.
- Creating a broad local file browser or a raw path-only content endpoint.
- Backfilling references from old historical message text.
- Agent-to-user message reference extraction.
- Showing mention counts, occurrence history, or “received N times” UI.

## Functional Requirements

- REQ-001: Existing `INTER_AGENT_MESSAGE` event emission, frontend handling, and `InterAgentMessageSegment` conversation display must remain behaviorally unchanged for message content.
- REQ-002: Raw file paths inside inter-agent message text must remain ordinary text and must not become clickable links as part of this feature.
- REQ-003: `send_message_to` tool schemas for Codex, Claude, and native/autobyteus execution must expose optional `reference_files` as an array of absolute file path strings.
- REQ-004: The `reference_files` schema description must be positive and usage-oriented: it should tell agents to include files the recipient may need to inspect, such as handoff docs, reports, logs, evidence, generated outputs, or related project files. It must also preserve the email-like mental model: write complete message content and use `reference_files` as the attachment/reference list. It must not add noisy defensive wording to the natural message body.
- REQ-005: Send-message argument parsing must normalize `reference_files` by trimming strings, normalizing separators where appropriate, removing duplicates within one call, and accepting omitted or empty lists as no referenced files.
- REQ-006: If `reference_files` is present but malformed, non-string, relative, protocol/URL-shaped, null-byte-containing, or otherwise not an absolute local path list, the tool call must fail validation with a concise corrective error before delivery.
- REQ-007: The accepted delivery request, recipient-visible runtime input metadata, and synthetic `INTER_AGENT_MESSAGE` payload must carry `reference_files` as the explicit reference source.
- REQ-008: When explicit `reference_files` exist, the recipient-visible runtime message must append a generated **Reference files:** block listing those paths, analogous to an email attachment list. This block supplements the self-contained `content`; it must not be framed as a replacement for explaining the files in the message body.
- REQ-009: The backend must derive `MESSAGE_FILE_REFERENCE_DECLARED` metadata from accepted `INTER_AGENT_MESSAGE.payload.reference_files` through an event-processor-style sidecar, not inside provider-specific `send_message_to` handlers and not inside frontend rendering.
- REQ-010: Message content must not be scanned to create message-file-reference metadata. If `reference_files` is omitted or empty, no referenced-artifact row is created even when the content prose contains absolute file paths.
- REQ-011: Reference derivation must perform no filesystem existence or content checks during message delivery or event processing.
- REQ-012: Derived references must preserve canonical provenance: `teamRunId`, `senderRunId`, sender member name when available, `receiverRunId`, receiver member name when available, message type, stable reference id, path, artifact type, and timestamps.
- REQ-013: Derived references must be persisted as metadata in one team-level projection file under the team run memory directory.
- REQ-014: The projection must deduplicate repeated explicit references by `teamRunId + senderRunId + receiverRunId + normalizedPath` and update the existing row rather than creating repeated visible rows.
- REQ-015: The frontend must store referenced artifacts in a dedicated message-reference store and must not add them to `runFileChangesStore`.
- REQ-016: The Artifacts tab must show **Agent Artifacts**, **Sent Artifacts**, and **Received Artifacts** as separate top-level sections for the active/focused member.
- REQ-017: **Sent Artifacts** and **Received Artifacts** must group rows by counterpart agent name/run identity, with file rows under that counterpart; the visible UI must not show counts or occurrence history.
- REQ-018: Selecting a referenced artifact must fetch content from `/team-runs/:teamRunId/message-file-references/:referenceId/content`, not from `/runs/:runId/file-change-content` and not from a raw path-only URL.
- REQ-019: The referenced-artifact content boundary must stream read-only file bytes only after resolving a persisted team-level reference and validating the stored path as an existing file.
- REQ-020: Missing, moved, invalid, directory, denied, or unreadable referenced files must fail gracefully in the Artifacts viewer without affecting chat rendering.
- REQ-021: Performance must remain good: no frontend render-time scans of all message text, no backend content scanning for paths, and no backend file IO during message delivery/rendering.
- REQ-022: Live websocket handling and historical hydration must use the same canonical message-reference data shape so restart does not create a second representation.
- REQ-023: The refactored implementation must not retain receiver-scoped reference authorities such as `getMessageFileReferences(teamRunId, receiverRunId)`, `/team-runs/:teamRunId/members/:receiverRunId/message-file-references/:referenceId/content`, member-level `message_file_references.json`, frontend `entriesByReceiver`, or a single **Referenced Artifacts** UI section.
- REQ-024: The refactored implementation must remove/decommission the free-text message path scanner and its Markdown-wrapper extraction tests rather than extending that scanner.
- REQ-025: Runtime diagnostics must be concise and structured around explicit references: accepted message with reference count, invalid reference-list validation failures, skipped missing-metadata cases, projection insert/update, and content resolve failures. Logs must not dump full message content by default.

## Acceptance Criteria

- AC-001: Given an inter-agent message is received, it still appears in the conversation with the same personal-branch inter-agent display behavior for the message body.
- AC-002: Given an inter-agent message contains `/absolute/path/report.md` as prose in `content`, the displayed message text is not converted into a clickable file link by this feature.
- AC-003: Given `send_message_to` is called with `reference_files: ["/absolute/path/report.md"]` and the recipient accepts the message, the backend emits and persists one `MESSAGE_FILE_REFERENCE_DECLARED` declaration for `/absolute/path/report.md`.
- AC-004: Given `send_message_to` is called with detailed prose content and no `reference_files`, no referenced-artifact row is created from paths mentioned only in the prose.
- AC-005: Given `reference_files` contains duplicate instances of the same normalized absolute path in one call, one declaration/projection row is created for that sender/receiver/path.
- AC-006: Given `reference_files` contains a relative path, URL, null-byte path, or non-string entry, the tool call fails validation with a concise corrective error and does not deliver a partial message.
- AC-007: Given explicit references exist, the recipient runtime input includes the self-contained natural message plus a generated **Reference files:** block listing those paths.
- AC-008: Given the sender's Artifacts tab is focused, the derived reference appears under **Sent Artifacts**, grouped below the receiver/counterpart agent.
- AC-009: Given the receiver's Artifacts tab is focused, the same derived reference appears under **Received Artifacts**, grouped below the sender/counterpart agent.
- AC-010: Given the same sender sends the same explicit path to the same receiver multiple times, the relevant Sent/Received UI shows one file row and updates its timestamp instead of duplicate rows or counts.
- AC-011: Given both generated file changes and message references exist, generated artifacts remain under **Agent Artifacts** and message references remain under **Sent Artifacts** / **Received Artifacts**.
- AC-012: Given the user selects a referenced artifact row, file content is fetched through the team-level referenced-artifact content endpoint and displayed when the stored file exists.
- AC-013: Given the stored referenced file is missing, a directory, invalid, or unreadable, the viewer shows an unavailable/error state and the conversation remains unaffected.
- AC-014: Given app/server restart, persisted referenced-artifact rows hydrate back into Sent/Received sections without changing inter-agent message display semantics.
- AC-015: Tests prove no referenced-artifact row is created by frontend Markdown parsing, message clicks, `InterAgentMessageSegment` rendering, or backend content scanning.
- AC-016: Tests or review evidence prove `InterAgentMessageSegment` and `teamHandler.handleInterAgentMessage` are preserved for existing display behavior.
- AC-017: Tests, grep evidence, or review evidence prove the receiver-scoped content URL, receiver-scoped GraphQL query argument, member-level projection file location, frontend receiver-keyed store API, and single **Referenced Artifacts** section have been replaced by the team-level Sent/Received design.
- AC-018: Tests, grep evidence, or review evidence prove `extractMessageFileReferencePathCandidates` and content-based parser fallback are removed/decommissioned, and reference declarations are sourced from `payload.reference_files` only.
- AC-019: Runtime or automated-test evidence proves accepted `send_message_to` messages with explicit `reference_files` create message-file references and log concise explicit-reference diagnostics.
- AC-020: Review evidence proves tool schema/instruction examples use self-contained email-like `content` that explains the handoff and naturally mentions important referenced paths, plus `reference_files` as the structured attachment/reference list.

## Constraints / Dependencies

- Existing file-change artifacts and `/runs/:runId/file-change-content` remain the authority for **Agent Artifacts**.
- Existing inter-agent message display is protected behavior; this ticket must not regress it.
- Message references must be derived from explicit backend events/projections, not frontend message-click behavior.
- Reference metadata persistence should live under the existing team memory layout as a team-level projection file.
- The content endpoint must be read-only and must use persisted reference identity.
- Synthetic `INTER_AGENT_MESSAGE` events currently bypass the normal event pipeline, so implementation needs a bounded shared processing seam for explicit reference declaration events.
- Multiple send-message implementations exist (Codex, Claude, native/autobyteus) and must share one normalized argument/delivery shape.

## Assumptions

- The model will reliably use an optional structured array when the tool schema and instructions explain it with concrete examples.
- Accepted synthetic `INTER_AGENT_MESSAGE` events can be augmented with non-breaking `reference_files` and provenance fields such as `team_run_id`; frontend display handlers ignore unknown fields.
- Absolute paths in `reference_files` are local paths relevant to the server/user filesystem context.
- Existing team member run ids are stable enough to compute sender/receiver projections.

## Risks / Open Questions

- Agents may still mention helpful paths in prose without adding them to `reference_files`; that is acceptable because the explicit list is the artifact-sharing contract.
- Provider-specific tool schema/instruction wording must be clear enough that agents both keep `content` self-contained and populate `reference_files` for handoff packages.
- Implementation must avoid double-processing runtime events that already pass through `AgentRunEventPipeline`.
- Historical backfill is explicitly out of scope; old messages will not create new referenced rows unless separately approved.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001
- REQ-002 -> UC-001
- REQ-003 -> UC-002
- REQ-004 -> UC-002
- REQ-005 -> UC-002
- REQ-006 -> UC-002
- REQ-007 -> UC-002, UC-003, UC-004
- REQ-008 -> UC-003
- REQ-009 -> UC-004
- REQ-010 -> UC-004
- REQ-011 -> UC-004, UC-009
- REQ-012 -> UC-004, UC-005, UC-006, UC-007
- REQ-013 -> UC-009
- REQ-014 -> UC-005, UC-006
- REQ-015 -> UC-005, UC-006, UC-008
- REQ-016 -> UC-005, UC-006, UC-008
- REQ-017 -> UC-005, UC-006
- REQ-018 -> UC-007
- REQ-019 -> UC-007
- REQ-020 -> UC-007
- REQ-021 -> UC-001, UC-002, UC-004, UC-005, UC-006
- REQ-022 -> UC-005, UC-006, UC-009
- REQ-023 -> UC-005, UC-006, UC-007, UC-009
- REQ-024 -> UC-004
- REQ-025 -> UC-002, UC-004, UC-007
- REQ-026 -> UC-004, UC-008, UC-009
- REQ-027 -> UC-004
- REQ-028 -> UC-001, UC-004

## Acceptance-Criteria-To-Scenario Intent

- AC-001 -> Preserve existing inter-agent display.
- AC-002 -> No raw message path linkification.
- AC-003 -> Explicit reference source creates declaration and team-level persistence.
- AC-004 -> Message prose alone is not a reference authority.
- AC-005 -> Per-call duplicate normalization.
- AC-006 -> Tool-boundary validation of explicit reference list.
- AC-007 -> Recipient agent receives usable reference context.
- AC-008 -> Sender-side Sent Artifacts display.
- AC-009 -> Receiver-side Received Artifacts display.
- AC-010 -> Repeated explicit reference dedupe without count UI.
- AC-011 -> Artifact category separation.
- AC-012 -> Referenced content happy path.
- AC-013 -> Referenced content failure handling.
- AC-014 -> Reference hydration.
- AC-015 -> Guard against frontend/click/content-scan authority.
- AC-016 -> Guard against over-refactoring message display.
- AC-017 -> Guard against retaining the receiver-scoped prior implementation.
- AC-018 -> Guard against retaining the implicit path parser.
- AC-019 -> Guard against missing explicit-reference diagnostics.
- AC-020 -> Guard against agents writing thin/non-self-contained messages because references moved into a structured field.
- AC-021 -> AutoByteus file-change runtime parity.
- AC-022 -> AutoByteus message-reference runtime parity.
- AC-023 -> AutoByteus no duplicate inter-agent display.


## Runtime Investigation Addendum: AutoByteus Reference Files Not Showing

Runtime investigation on 2026-05-04 found that AutoByteus `send_message_to.reference_files` reaches the recipient runtime input and the recipient can read the file, but no Artifacts rows are created. The root cause is not the tool schema: the successful AutoByteus message includes `reference_files`. The missing piece is AutoByteus team event-pipeline parity. AutoByteus converted native member events are currently published directly to team listeners without running through the default `AgentRunEventPipeline`, so neither `FileChangeEventProcessor` nor `MessageFileReferenceProcessor` emits derived events for AutoByteus team runs.

Additional requirements from this finding:

- REQ-026: AutoByteus team member events that are converted into server `AgentRunEvent`s must be enriched with team/member provenance and processed through the default `AgentRunEventPipeline` before team-event fanout, so derived `FILE_CHANGE` and `MESSAGE_FILE_REFERENCE_DECLARED` events are produced consistently with Codex and Claude.
- REQ-027: AutoByteus converted `INTER_AGENT_MESSAGE` events must carry enough provenance for message-reference processing: `team_run_id`, `sender_agent_id`, receiver run id, receiver member name, message type, content, and `reference_files`.
- REQ-028: The AutoByteus fix must not duplicate conversation messages. The native converted `INTER_AGENT_MESSAGE` should be published once, with derived sidecar events added by the pipeline.

Additional acceptance criteria:

- AC-021: Given an AutoByteus team member successfully writes a file, the Artifacts tab receives the normal file-change/touched-file artifact for that member.
- AC-022: Given an AutoByteus team member successfully sends `send_message_to` with an absolute `reference_files` path, the team-level message-reference projection is written and the Artifacts tab can show the referenced file according to the current UI model.
- AC-023: Given the AutoByteus referenced message is delivered, the conversation displays one inter-agent message, not a duplicate source message plus synthetic copy.

## Approval Status

Requirements refined on 2026-05-04 after explicit user discussion and updated after AutoByteus runtime investigation. The user approved another refactoring design round and agreed the target should use an optional explicit `reference_files`/attachment-list field instead of scanning paths out of message content. The user also clarified that `content` must remain self-contained, like an email body that still explains and naturally mentions its attachments.
