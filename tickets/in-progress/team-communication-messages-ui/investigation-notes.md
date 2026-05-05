# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed - dedicated ticket worktree and artifact folder created.
- Current Status: Initial draft requirements captured; deeper architecture investigation pending.
- Investigation Goal: Design a clean-cut refactor that moves communicated reference-file context from the Artifacts tab into a message-first Team Communication view under the Team tab, without retaining legacy duplicated Sent/Received artifact UI.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The change affects frontend Team tab layout, Artifacts tab behavior, live streaming/hydration stores, likely server-side projection/API shape, tests, and docs, while reusing the existing explicit `send_message_to.reference_files` contract.
- Scope Summary: Add message-first Team Communication UI. Reference files are children of inter-agent messages. Remove Sent/Received Artifacts from the Artifacts tab. Preserve agent-created/touched artifacts and explicit reference-file semantics.
- Primary Questions To Resolve:
  - What durable source should back historical team communication: existing run event history, current message-file-reference projection, or a new message-centric projection?
  - How should the Team tab layout balance Task Plan and Messages inside the right-side panel?
  - Which existing content preview component/service can be reused without coupling Team Communication to the Artifacts tab's file-first model?
  - Which Sent/Received artifact code paths should be removed outright?

## Request Context

The previous `team-message-referenced-artifacts` ticket has been finalized and merged into latest `personal`. The user now wants a new refactoring ticket. Product direction from discussion:

- Team communication should be visible in the Team tab.
- Inter-agent messages should be shown message-first, with sent/received direction, counterpart, message type, content preview/full content, and reference files attached to the message block.
- Reference files semantically belong to the original message, not to a standalone Sent/Received Artifacts area.
- The Artifacts tab should no longer show Sent Artifacts or Received Artifacts once Team Communication exists.
- Do not keep legacy code or duplicated legacy UI paths.

API/E2E reroute from the finalized prior ticket is now explicit upstream evidence for this new ticket: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/team-message-referenced-artifacts/api-e2e-design-impact-reroute-artifacts-tab-ownership.md`. The reroute classifies the prior Sent/Received Artifacts ownership as `Design Impact` / `Requirement Gap` and recommends choosing between duplicate visibility and Team-tab-only ownership. This new ticket chooses Team-tab-only ownership.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui/tickets/in-progress/team-communication-messages-ui`
- Current Branch: `codex/team-communication-messages-ui`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-05-05; `origin/personal` resolved to `687b3fde`.
- Task Branch: `codex/team-communication-messages-ui`, created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal` / `personal`.
- Expected Finalization Target (if known): `personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This is a new ticket from latest personal; do not reuse prior merged ticket worktree. No legacy Sent/Received Artifacts UI should remain in the final implementation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-05 | Command | `git fetch origin personal` | Refresh base branch before worktree creation | Fetch succeeded; `origin/personal` at `687b3fde`. | No |
| 2026-05-05 | Command | `git worktree add -b codex/team-communication-messages-ui /Users/normy/autobyteus_org/autobyteus-worktrees/team-communication-messages-ui origin/personal` | Create dedicated ticket worktree from latest personal | Worktree created and branch tracks `origin/personal`. | No |
| 2026-05-05 | Command | `git log -1 --oneline --decorate --date=iso --format=... origin/personal` | Record bootstrap base commit | Base commit `687b3fde` (`docs(ticket): record team message artifacts finalization`). | No |
| 2026-05-05 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/team-message-referenced-artifacts/api-e2e-design-impact-reroute-artifacts-tab-ownership.md` | Incorporate API/E2E design-impact reroute from finalized prior ticket | Confirms existing prior-ticket requirements intentionally placed Sent/Received sections in member Artifacts tab, which conflicts with clarified product direction. Recommends Team-tab-only ownership if changing model. | Yes: supersede old ownership in this ticket design. |
| 2026-05-05 | Other | API/E2E validation update message from `api_e2e_engineer_2ac0c0a668be61a4` referencing `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/team-message-referenced-artifacts/api-e2e-validation-report.md` | Incorporate post-CR-009 validation/reroute status | CR-009 validation passed and no production/message-reference behavior changed, but delivery remains not ready while the Artifacts-tab ownership design-impact remains unresolved. The message again asks solution design to choose duplicate visibility or Team-tab-only ownership. | Yes: this ticket chooses Team-tab-only ownership and will route implementation accordingly after design review. |
| 2026-05-05 | Code | `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Inspect current Team tab content owner | Currently renders header + `TaskPlanDisplay` only. | Yes: decide layout extension/replacement. |
| 2026-05-05 | Code | `autobyteus-web/components/workspace/team/TaskPlanDisplay.vue` | Inspect current task plan display | Table/empty-state component for plan only. | Yes: decide whether to keep as section, compact summary, or reusable panel. |
| 2026-05-05 | Code | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Inspect current artifact composition | Combines agent file-change artifacts with message-reference items for focused member. | Yes: remove message references from artifacts composition. |
| 2026-05-05 | Code | `autobyteus-web/components/workspace/agent/ArtifactList.vue` | Inspect current Sent/Received Artifacts rendering | Renders `sentGroups` and `receivedGroups` from `message_reference` items. | Yes: remove/decommission Sent/Received artifact sections. |
| 2026-05-05 | Code | `autobyteus-web/stores/messageFileReferencesStore.ts` | Inspect current reference projection store | Store is file-reference/perspective oriented, not message-first. | Yes: decide whether to replace, narrow, or wrap with message projection. |
| 2026-05-05 | Code | `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts` | Inspect live inter-agent message handling | `INTER_AGENT_MESSAGE` payloads are converted into `InterAgentMessageSegment`s in member conversations. | Yes: decide Team Communication live store update path. |
| 2026-05-05 | Code | `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Inspect frontend streaming payload shape | `InterAgentMessagePayload` already includes `reference_files?: string[]`. | Yes: verify enough identity/timestamp fields for projection. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/services/message-file-references/*` | Inspect existing reference persistence/content services | Existing service persists file-reference projection and resolves content by reference id. | Yes: decide reuse vs replacement under message-first model. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` | Inspect event payload source | Synthetic accepted `INTER_AGENT_MESSAGE` includes content, message type, receiver and `reference_files`. | Yes: inspect whether event has durable timestamp/message id. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Inspect current agent-facing wording | Mentions `reference_files` for Sent/Received Artifacts. | Yes: update wording once UI concept changes. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User selects a team run; right-side `Team` tab renders `TeamOverviewPanel`; right-side `Artifacts` tab renders `ArtifactsTab`.
- Current execution flow:
  - `INTER_AGENT_MESSAGE` stream events are handled by `teamHandler.handleInterAgentMessage` and appended to focused/member conversation segments.
  - `MESSAGE_FILE_REFERENCE_DECLARED` events are handled separately and persisted in `messageFileReferencesStore`.
  - `ArtifactsTab` merges `runFileChangesStore` agent artifacts with `messageFileReferencesStore` sent/received perspective items.
  - `ArtifactList` renders Agent Artifacts plus Sent Artifacts and Received Artifacts groups.
- Ownership or boundary observations:
  - Message content and reference-file declarations are currently split across conversation rendering and artifact rendering.
  - The current Artifacts tab is being asked to represent communication context, which is a product/ownership mismatch.
  - The Team tab is currently underused and is the natural owner for team-level communication transparency.
- Current behavior summary: Communicated reference files are visible, but file-first and detached from the message that carried them.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change + Refactor + UI feature.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Legacy Or Compatibility Pressure.
- Refactor posture evidence summary: Sent/Received communicated references should move from the file/artifact UI boundary to a team communication boundary. Keeping both would preserve legacy duplicated behavior.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User discussion | Reference files belong to the original inter-agent message and should be shown under Team Communication. | UI/domain subject should be message-first, not file-first. | Yes |
| API/E2E reroute artifact | Prior ticket validation proves the old requirements explicitly required Sent/Received Artifacts in member Artifacts tab. The reroute classifies the new product direction as a requirements/design mismatch and recommends Team-tab-only ownership if changing. | This ticket should make a clean-cut ownership correction rather than treating old behavior as implementation error or preserving both surfaces. | Yes |
| API/E2E CR-009 validation update | Prior ticket's CR-009 validation passed with no production/message-reference/UI behavior change, but the design-impact remains unresolved. | Confirms this is not a runtime/test failure; it is a product ownership refactor to be handled by this new ticket. | Yes |
| `ArtifactsTab.vue` | Combines file-change artifacts and message-reference perspective items. | Current UI mixes agent-created artifacts with communicated references. | Yes |
| `ArtifactList.vue` | Explicit Sent/Received sections exist. | These sections are the legacy UI path to remove. | Yes |
| `teamHandler.ts` | Live inter-agent messages are already available to frontend handling. | Likely live communication store can be sourced from existing stream events. | Yes |
| `messageTypes.ts` | `InterAgentMessagePayload` includes `reference_files`. | Payload has direct child refs, but timestamp/message id needs verification. | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Right-side Team tab content | Only renders Task Plan today. | Extend/refactor to own team communication presentation. |
| `autobyteus-web/components/workspace/team/TaskPlanDisplay.vue` | Task plan table and empty state | Focused plan component; may remain reusable. | Keep but likely wrap with messages section/layout. |
| `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | File artifact tab composition/viewer | Merges agent artifacts and message-reference artifacts. | Remove message-reference merge; keep agent artifacts. |
| `autobyteus-web/components/workspace/agent/ArtifactList.vue` | Artifact list rendering | Renders Sent/Received Artifacts sections. | Decommission Sent/Received rendering. |
| `autobyteus-web/stores/messageFileReferencesStore.ts` | Team-level file-reference projection and focused-member perspective | Stores refs as standalone file artifacts. | May be replaced, narrowed, or used only for content resolution, depending on message projection design. |
| `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts` | Frontend handling for team-specific stream events | Converts inter-agent message payload into conversation segment. | Add/update Team Communication store path if design chooses frontend projection from stream. |
| `autobyteus-web/services/runHydration/messageFileReferenceHydrationService.ts` | Historical hydration for message-file references | Hydrates file-reference projection only. | Need message-first historical hydration equivalent. |
| `autobyteus-server-ts/src/services/message-file-references/*` | Backend reference projection and content resolution | File-reference projection/content service exists. | Reuse content safety; evaluate whether projection should become message-centric. |
| `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` | Builds accepted inter-agent payloads | Payload includes `reference_files`. | Source event likely needs stable message id/timestamp for message projection. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Agent-facing team send-message instructions | Mentions Sent/Received Artifacts. | Update wording to Team Communication/Reference files after design. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-05 | Setup | Dedicated worktree from `origin/personal` | New ticket branch is clean and based on finalized previous ticket. | Safe to investigate without touching merged ticket state. |

## External / Public Source Findings

No external sources consulted during bootstrap. This is a local product/UI architecture refactor.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: To be determined during deeper investigation.
- Required config, feature flags, env vars, or accounts: None identified during bootstrap.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin personal`; `git worktree add -b codex/team-communication-messages-ui ... origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

Initial code findings are recorded in the Source Log and Relevant Files sections. Deeper investigation should inspect backend GraphQL/API endpoints for run history, team memory projection storage, streaming payload timestamp/message identity, and frontend component reuse for file preview.

## Constraints / Dependencies / Compatibility Facts

- Existing `reference_files` contract is already merged and should remain explicit-reference-only.
- No fallback path scanning should be introduced.
- No legacy Sent/Received Artifacts UI should remain after refactor.
- Existing message-file-reference content service may be reused if it stays behind a message-first boundary; avoid making Team Communication depend on both a message owner and its file-reference internals in a mixed-level way.

## Open Unknowns / Risks

- Whether accepted `INTER_AGENT_MESSAGE` events have stable durable IDs/timestamps in current storage.
- Whether a new `team_communication_messages.json` projection is needed.
- Whether `message_file_references.json` should be removed/replaced or retained only as a lower-level content-reference index.
- How to preserve historical file preview behavior if the referenced file was later moved/deleted.
- Exact responsive behavior for the right-side Team tab at narrow widths.

## Notes For Architect Reviewer

This ticket is intentionally a clean-cut refactor. The design should explicitly name obsolete Sent/Received Artifacts UI/store paths for removal and should not keep hidden compatibility switches. The target subject is **Team Communication Message**, with `reference_files` as child references attached to the message.

## Deep Investigation Addendum - 2026-05-05

### Additional Current-State Findings

- `autobyteus-server-ts/src/services/message-file-references/message-file-reference-service.ts` currently attaches to active `TeamRun` events and persists standalone `MESSAGE_FILE_REFERENCE_DECLARED` events into `message_file_references.json` at the team memory level.
- `autobyteus-server-ts/src/services/message-file-references/message-file-reference-projection-service.ts` serves the standalone projection for active or historical team runs through GraphQL.
- `autobyteus-server-ts/src/api/graphql/types/message-file-references.ts` exposes `getMessageFileReferences(teamRunId)`.
- `autobyteus-server-ts/src/api/rest/message-file-references.ts` exposes `/team-runs/:teamRunId/message-file-references/:referenceId/content` and resolves file content through the standalone reference projection.
- The current standalone reference identity is file-reference-first: `teamRunId + senderRunId + receiverRunId + path`. It does not preserve one-message-to-many-reference ownership as the governing UI subject.
- `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` hydrates `messageFileReferencesStore` for live and historical team runs, independent of message content hydration.
- `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` converts `messageFileReferencesStore` perspective groups into `message_reference` artifact viewer items, which is the duplicated member Artifacts-tab UI ownership to remove.
- `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` contains an artifact-specific branch for `message_reference` content routes. If Team Communication becomes the owner, this branch should not stay in the agent artifact viewer.
- `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` already includes `InterAgentMessagePayload.reference_files`; the payload should be tightened with message id, receiver id/name, and timestamp for projection/hydration.
- `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` already builds accepted `INTER_AGENT_MESSAGE` payloads with content, message type, receiver, and `reference_files`; this is the right source to enrich with stable message identity and created timestamp.
- The historical run projection path (`team-member-local-run-projection-reader.ts` -> raw trace transformer -> conversation projection) is member-conversation oriented and does not provide a team-level message-first projection. A dedicated Team Communication projection is the cleaner durable owner.

### Design Implication

The target should replace the standalone message-file-reference projection/UI owner with a Team Communication Message projection. The Team Communication owner should consume accepted `INTER_AGENT_MESSAGE` events directly and persist messages with child reference-file entries. Referenced-file preview should resolve through the message-centric boundary, not through the old standalone Sent/Received artifact reference boundary.

### Additional Source Log Rows

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-05 | Code | `autobyteus-server-ts/src/services/message-file-references/message-file-reference-service.ts` | Inspect current standalone reference persistence owner | Persists derived `MESSAGE_FILE_REFERENCE_DECLARED` events into team-level `message_file_references.json`. | Yes: replace/decommission for Team Communication. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/api/graphql/types/message-file-references.ts` | Inspect historical reference API | Exposes file-reference-first query `getMessageFileReferences(teamRunId)`. | Yes: replace with message-centric query. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/api/rest/message-file-references.ts` | Inspect content route | Resolves content by standalone reference id. | Yes: replace with message/message-reference content route. |
| 2026-05-05 | Code | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Inspect frontend content preview coupling | Has `message_reference` branch and route construction in artifact viewer. | Yes: remove from artifact viewer and move preview to Team Communication. |
| 2026-05-05 | Code | `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | Inspect historical team hydration | Hydrates standalone message-file references separately from messages. | Yes: hydrate team communication messages instead. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/run-history/services/team-member-local-run-projection-reader.ts` | Check whether current history can derive team communication | Current reader builds member run conversation projections from raw traces, not a team message-first projection. | Yes: create dedicated projection. |

## Post-Implementation UI Review Addendum - 2026-05-05

User reviewed the Electron build produced from the implementation state and reported that the Team tab implementation is functionally present but visually/interaction-wise poor. I inspected the current implementation in the ticket worktree to ground the design correction.

Sources inspected:

- `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue`
- `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue`
- `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue`
- `autobyteus-web/components/progress/ProgressPanel.vue`
- `autobyteus-web/components/workspace/agent/TodoListPanel.vue`
- `autobyteus-web/components/progress/ActivityFeed.vue`
- `autobyteus-web/components/workspace/agent/ArtifactsTab.vue`
- `autobyteus-web/components/workspace/agent/ArtifactList.vue`

Findings:

1. `TeamOverviewPanel.vue` currently renders a redundant internal header row:
   - `h3` text `Team` on the left;
   - team name on the right.
   The right-side tab already says `Team`, so this row consumes height without adding a distinct action or useful hierarchy.

2. `TeamOverviewPanel.vue` currently allocates a fixed/large task-plan region:
   - `section class="max-h-[34%] min-h-[8rem] ..."`.
   When there is no task plan, the empty state still occupies a significant portion of the Team tab, pushing Team Communication into a smaller viewport.

3. `TeamCommunicationPanel.vue` currently stacks message list and detail/file preview vertically:
   - message list area: `max-h-[52%] min-h-[8rem]`;
   - selected message/reference detail underneath.
   This causes selected file content to be squeezed below messages, as shown in the user's screenshot. The behavior is unlike the Artifacts tab, where the file list remains on the left and preview occupies the right pane.

4. `ProgressPanel.vue`, `TodoListPanel.vue`, and `ActivityFeed.vue` already provide a better local pattern:
   - section header rows with chevron, title, and count;
   - collapsed sections take only header height;
   - expanded section receives `flex-1 min-h-0`.
   This is the correct reference pattern for Task Plan + Messages in the Team tab.

5. `ArtifactsTab.vue` already provides the correct preview ergonomics:
   - left selectable list with fixed/resizable width;
   - right content viewer with full available height;
   - a divider/resizer.
   Team Communication should reuse this interaction shape for message/reference selection while keeping message references owned by Team Communication, not Agent Artifacts.

Design impact:

- This is not a backend data issue. The UI defects are caused by layout decisions in `TeamOverviewPanel.vue` and `TeamCommunicationPanel.vue`.
- Requirements/design must be tightened so implementation does not preserve the initial vertical stacked layout.
- Target correction:
  - remove the redundant internal Team header;
  - use Activity-style collapsible `Task Plan` and `Messages` sections, defaulting Messages expanded;
  - keep empty Task Plan compact/collapsed so it does not reserve large height;
  - render Team Communication as Artifacts-like left message/reference list + right selected message/file detail pane.

## UI Label Refinement - 2026-05-05

User clarified the left message list should not repeat direction words inside group labels. Since the list already has top-level `Sent` and `Received` sections, child group labels should be counterpart agent/member names only.

Target example:

```text
Sent
  architecture_reviewer
    Design review request
      design-spec.md

Received
  api_e2e_engineer
    Validation update
      api-e2e-validation-report.md
```

Avoid:

```text
Sent
  To architecture_reviewer
Received
  From api_e2e_engineer
```

Rationale: `Sent` already implies `to`; `Received` already implies `from`. Removing redundant words improves scanability in the constrained right-side panel.

## Team Communication Reference Maximize Addendum - 2026-05-05

Implementation engineer requested a design/addendum decision after user feedback on the Round 3 implementation. The user likes the current Team tab message/reference split and asked whether selected reference files can get a maximize/fullscreen/restore control similar to the Artifacts content viewer.

Classification:

- Small local UX implementation addendum under the existing Team Communication reference viewer boundary.
- Not a backend projection or ownership redesign.
- Requirements/design text is still useful because the implementation must reuse only the interaction pattern from Artifacts, not artifact ownership or artifact state.

Current implementation evidence:

- `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` already implements the desired interaction pattern:
  - `Teleport to="body"`;
  - `fixed inset-0 z-[120]` full-window shell when maximized/zen;
  - maximize/restore icon button;
  - preview/edit controls while maximized;
  - Escape-to-restore;
  - cleanup on unmount.
- `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue` already owns Team Communication reference preview and uses `FileViewer`, with Raw/Preview mode for supported text/markdown/html, but lacks maximize/restore and Escape handling.

Design decision:

- Add maximize/restore to `TeamCommunicationReferenceViewer` only, or a Team Communication-owned child/composable.
- Do not import/use `ArtifactContentViewer`.
- Do not use artifact display-mode store/state.
- Raw/Preview controls must remain available while maximized.
- Escape restores the normal Team tab split.
- Maximize behavior applies only to selected reference-file previews for this addendum; selected message detail does not get maximize in this scope.
- Add focused component tests for maximize, restore, Escape, and Raw/Preview controls while maximized.

## Compact Email-Like Message Row Addendum - 2026-05-05

Implementation engineer requested a design/addendum decision after user feedback on the Round 3 Team Communication list hierarchy.

User feedback:

- Current left list is too visually layered: `Sent/Received` -> counterpart agent name -> message type/title -> reference file.
- Preferred list should be more email-like:
  - top-level `Sent` and `Received` sections can remain;
  - each message row should carry its own direction icon;
  - message type behaves like the row title;
  - counterpart metadata appears inline, e.g. `Direct Message · to student` or `Solution Submission · from student`;
  - timestamp stays on the row;
  - references remain under the message preview, but should use file-type icons rather than one generic paperclip.
- Selected message detail should render nicely like other content previews; current plain `<pre>` is not good enough for natural/self-contained message content.

Current implementation evidence:

- `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` currently renders sections -> groups -> message buttons -> reference buttons. Group headers are visible via `counterpartLabel(group)`.
- The same component currently renders selected message body as a plain `<pre>`.
- Shared renderer exists at `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` and is already used by conversation segments and markdown preview paths.

Classification:

- Frontend presentation addendum only.
- No backend projection/API change expected.
- Design update is needed because it revises the previously documented visible hierarchy from counterpart group headers to compact email-like rows.

Design decision:

- Keep top-level `Sent` and `Received` sections.
- Remove the prominent counterpart group-header layer or make grouping visually implicit.
- Each message row should show:
  - sent/received direction icon;
  - message type/title;
  - inline `to/from <counterpart>` metadata;
  - timestamp;
  - bounded preview;
  - child reference rows with file-type icons.
- Selected message detail should use shared `MarkdownRenderer` instead of a normal plain `<pre>` block.
- This remains Team Communication frontend presentation. Message rows and reference rows must not become Agent Artifact rows.
