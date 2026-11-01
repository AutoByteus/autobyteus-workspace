# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-006` (after CRR-004 CR-003: the Team open reads its live sequence; SR-005: after ARCH-REV-004 AR-005: the consistent-through sequence is scoped to one live sequence; SR-004 after CRR-003 CR-002: a running root reloaded its lists on every publication; SR-003 after IR-001: QR-004 missed; SR-002 after ARCH-REV-001)
- Approved requirements baseline: `requirements-doc.md` SR-001, approved by the Solution Designer within the direction (the user informed in the conversation, 2026-11-01)
- Behavior-defining supplements: none
- User approval of the design, when the direction requires it: `Not required` (the Task asks for none)
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/large-runs-load-less/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md` (this conversation), `DESIGN.md` (rules 3, 5, 7, re-read 2026-11-01), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §6 ("Don't validate history at startup")
- Project design-principle conflicts: none

## SR-006 Revision Summary (CRR-004, CR-003: a running Team's open forgets its live position)

- **Finding.** The Team open and resume read (`getTeamRunResumeConfig` → `teamRunContextHydrationService` → `teamRunHydrationCommit.ts`, from `teamRunOpenCoordinator.ts`) names no live sequence. It commits `reloadRoot('agent_team', …, { liveSequenceId: null, baseChangeSequence: 0 })`, so the live snapshot that follows reloads a Team-tab list loaded in between: two fetches per running-Team open, against SR-004's "one rule for hub, Team and Org".
- **Decision, option (a), the same rule as hub and Org.**
  - `getTeamRunResumeConfig` (`api/graphql/types/team-run-history.ts:94`) adds `liveSequenceId` and `baseChangeSequence`. For an active Team they come from the root's `RootEventPublisher` (the same values its stream snapshot reports); for a stopped Team they are `null` and `0`.
  - The open commit passes them to `reloadRoot` as a live rebuild. The snapshot that follows has the same ID and B ≤ C, so it keeps the list.
  - The `'stored_rebuild'` path stays only for a stopped Team.
  - Option (b) was rejected because it would give Team its own timing rule; option (c) because a running Team's open is a normal path (the user's PM works in Teams).
- **Test:** opening a running Team with its Team tab loaded in between gives 1 participant fetch; a stopped Team gives 1. API/E2E rechecks the API-08 counts for Team.

## SR-005 Revision Summary (ARCH-REV-004, AR-005: C must belong to one live sequence)

- **Finding.** The live change sequence belongs to one `RootEventPublisher` instance and starts at 0 for each (`root-event-publisher.ts:23,56`), and stored inspections report 0. After a stop and resume, or a server restart, a new instance's B can be at or below a stale C. The lists would then be kept and miss the messages the new instance produced before the client attached.
- **Decision, option (b): an explicit live-sequence identity.**
  - `RootEventPublisher` gets `liveSequenceId`, a random ID made once per instance.
  - Every active view and live snapshot carries it as `live_sequence_id` (stored views: `null`). This applies to the Agent-root, Team and Org view contracts (`autobyteus-collaboration-stream-contracts`) and their projectors.
  - `CollaborationParticipantMessages` keeps C together with the `live_sequence_id` it belongs to.
  - `reloadRoot(rootKind, rootRunId, { liveSequenceId, baseChangeSequence })` keeps the lists only when `liveSequenceId` is non-null, equals the kept one, and `baseChangeSequence <= C`. Any other rebuild reloads: a stored view, another publisher, or B past C.
  - This holds whatever the client observed in between: stop, resume, restart or a lost connection.
  - Option (a) was rejected: it depends on the client seeing every lifecycle change, which a hub stopped and resumed while not selected does not give.
- **Tests (added to SR-004's four):**
  - stop → resume with a message produced before the client's attach: reloads, and the message is in the list;
  - a reconnect to a new publisher (simulated server restart) with B ≤ the old C: reloads.
- The API-08 savings are unchanged: selection and checkpoint reopen stay within one publisher.

## SR-004 Revision Summary (CRR-003, CR-002: repeated reloads on running roots)

- **Finding** (code review, from API-08). A running hub fetched its participant lists again on every context publication. That was twice per selection (the inspection, then the attach snapshot), and once per new child or settings Save (the `checkpoint_required` reconnect). The hub's own list is nearly its whole log, so this is repeated full-history transfer (`DESIGN.md` rule 3). The cause is DS-002's "every rebuild reloads" rule.
- **Decision, option (b), one rule for hub, Team and Org.** The Team tab only needs a reload when it could have missed a message, and it could only have missed one if the root's change sequence moved while it was not listening. `CollaborationParticipantMessages` keeps, per root, the sequence its lists are consistent through (C):
  - every applied stream event sets C to the event's last sequence;
  - a single `checkpoint_required` event (`change_sequence === change_sequence_through`) also sets C to its sequence, because it was seen and carries no message, although the context does not advance on it (`agentRunCollaborationContext.ts:130-185`);
  - a load's result is consistent with C at the time its request was sent, plus its merged buffer.

  `reloadRoot(rootKind, rootRunId, rebuild)` takes the rebuilt context's `isActive` and `base_change_sequence` (B):
  - a rebuild from an **active** view or snapshot reloads only when `B > C`, and otherwise keeps the loaded lists and their in-flight loads;
  - a rebuild from an **inactive (stored) view** reloads its lists, because stored views carry no live sequence. The first load on selection is the only fetch there;
  - a gap reopen reloads by definition (`B > C`).
- **Expected counts** (API-08 rechecks): selecting a running hub gives 1 list fetch; a new child or settings Save with no message in the reconnect window gives 0; a message in that window gives 1. Team and Org follow the same rule.
- Tests: inspect→attach with an equal sequence keeps the list; checkpoint reconnect with B = checkpoint sequence keeps it; B > C reloads; a stored rebuild reloads.

## SR-003 Revision Summary (IR-001, QR-004 missed)

- **Finding** (implementation, IR-001). With at most one layout read per frame (DS-006 as designed), opening the long-token copy still takes 85,946 ms, as 23 forced layouts of 3.9–7.1 s each. The number of reads is not the problem; each layout is.
- **Cause, measured** (investigation-notes M-163b): text shaping of 60 KB single-word runs in the system UI font with kerning and ligatures. A relayout of the loaded conversation takes 86 s as it is, 48–87 ms with kerning and ligatures off, and 45–83 ms in Arial. Line breaking is secondary (`break-all`: 43 s); `white-space`, `display` and `min-width` make no difference.
- **Decision (DEC-004, no visible change):** text that contains a very long unbroken run is shaped without kerning and ligatures. Normal messages keep their typography. DS-006 stays: it bounds the number of layouts while a conversation streams in. DEC-001 (b), collapsing long messages, is not needed.

## SR-002 Revision Summary (ARCH-REV-001)

| Finding | Resolution | Where |
| --- | --- | --- |
| AR-001 (inspections still read and validate the log) | Inspections read and validate the **tree only**. The snapshots that feed views drop `messages`: `StandaloneRootPackageSnapshot`, the org inspection snapshot, and the team stream snapshot. Live roots keep their communication engines internally. Tree-plus-messages validation moves to the one per-root **records owner**: `getCollaborationRecordsSnapshot(rootRunId)` (live engine, or the stored log validated with the tree). The participant query, reference content and resume all read through it. A damaged log fails only these reads, with the reason; the run's view still opens (AC-006) | DS-001, DS-002, DS-005; Removal plan; mapping |
| AR-002 (reload trigger too narrow) | (1) Buffering starts **before** the request is sent. (2) Merge by message ID; `baseChangeSequence` is removed from the query result (unused: IDs are unique). (3) Every root-context rebuild calls `CollaborationParticipantMessages.reloadRoot(rootKind, rootRunId)`, which abandons in-flight loads (generation bump) and reloads loaded lists. Rebuilds are reconnect, sequence-gap reopen, `checkpoint_required` reopen, stream recovery and stop/inspect. Named call sites are in DS-002. (4) Tests: a gap reopen during a load and after a load | DS-002 |
| AR-003 (MemberLoader and the other hydration forms) | A rule per entry form: hydration state belongs to the member **context instance** and to `MemberLoader`'s per-root generation. Every rebuild (initial open, stream recovery, org `source: 'stream'`, gap/checkpoint reopen) bumps the root's generation. Only the focused member is loaded, exactly (recovery: between the two checkpoints, as today, but for the focused member only); every other member is not hydrated and loads on open. A test: a member hydrated before a stream failure is reloaded on its next open, not shown stale | DS-003 |
| AR-004 (remote) | No query for a remote focused participant: its Team tab is empty, as today (`agentOrgExecutionContext.ts:421-423`; `agentRunCollaborationIndex.ts:82-84`). The server query rejects a non-participant. No remote fetching | DS-002; Risks |

## Current-State Read

Every run root has one view: hub (Agent root), team or org. The view is built as a complete snapshot of the root: structure, statuses, input states, and its whole message log (E-01; org: `agent-org-execution-view-projector.ts`; team: the team stream snapshot `payload.messages`, and the team open fetches `getTeamCommunicationMessages` whole, E-04). Live streams resend the snapshot on (re)connect and append `communication` events.

The web keeps that log in each root's context. The only consumer is one seam, `CollaborationMessagesContextView.listMessages()`, which the Team tab (`RightSideTabs.vue`) and the mobile message screens read. It is filtered to the focused participant in each root (hub `agentRunCollaborationContext.ts:357-394`, team `activeContextStore.ts:75-92`, org `agentOrgExecutionContext.ts:415`).

Opening a team or org run also stages every member's projection and file changes (E-04). The on-demand alternative exists twice: the team fallback (`teamMemberProjectionHydrationService.ts`) and a hub's copies (`agentRunCollaborationChildHydration.ts`). Both are built on `memberRunStateHydration.ts` (E-05).

Settings for a stopped hub reads the full view again (E-06). The run-history readiness scan validates every root's message log, at the first access and on every new root (E-03). The conversation feed forces a full layout after every update (M-163).

These are design causes, not slow code: one snapshot serves every screen, and validation runs up front. They break `DESIGN.md` rule 3 ("a new-row update must not trigger avoidable repeated full-history transfer") and data-migration guideline §6.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale:
  - the three root view contracts (`autobyteus-collaboration-stream-contracts`);
  - server projectors, one new GraphQL query and the readiness scan;
  - the web contexts of three root kinds, the Team tab seam, team and org hydration with a shared member loader, Settings, and the conversation feed.

  About 40–60 files including tests.
- Architectural risk: `High`
- Risk rationale:
  - a shared streaming and view contract changes for every root kind, live and stored;
  - message completeness and ordering under live append is a correctness invariant;
  - the readiness admission changes the startup safety boundary (rule 7).
- Escalation trigger:
  - a consumer of the view's message log beyond the Team-tab seam;
  - a live ordering case the load-and-merge rule cannot keep;
  - QR-004 missed after DS-007, which makes DEC-001 (b) a question for the user.

## Architecture Investigation Evidence

| Source | Reference | Observation | Decision Supported |
| --- | --- | --- | --- |
| Code | E-01, `root-execution-view-dtos.ts:71-89,111,173`, `agent-run-collaboration-dtos.ts:42-51`, `agent-org-execution-dtos.ts:267-281` | The view contracts require `communication_messages` and correlate them | Remove the field from the three view contracts |
| Code | `teamExecutionViewState.ts:90,135,333,437-441,510` | The team view state holds `messages` from the snapshot and live events | The same removal |
| Code | `activeContextStore.ts:75-92`, `agentRunCollaborationContext.ts:357-394`, `agentOrgExecutionContext.ts:148,164,415`, `RightSideTabs.vue:134`, `MobileTeamMessages.vue:94`, `MobileActivityDigest.vue:97` | Every consumer reads through `listMessages()` / `listCommunicationMessages()` | The seam becomes a loaded list |
| Code | `team-communication.ts:50-56` | `getTeamCommunicationMessages(teamRunId)` returns the whole team log | Replaced by one participant query for all root kinds |
| Code | E-03 | The scan reads messages; `admitCurrent` rescans everything | Structure-only scan; per-run admission |
| Code | E-06, E-07 | Settings reads its own view | It reuses the collaboration store's view |
| Profile | M-163 (`evidence/M-163-unbroken-open.cpuprofile`) | 88.8 of 89.9 s in `getDistanceFromBottom` (`AgentConversationFeed.vue:279`), called from `onUpdated(syncAutoScrollIfPinned)` (`:450-482`): a forced synchronous layout after every update | Coalesce the check to at most one layout read per frame, after the frame's DOM work |

## Intended Change

Each screen asks for what it shows:
- views and snapshots carry structure and statuses;
- the Team tab loads its participant's messages when shown;
- a team or org run loads only the focused member until another is opened, through one shared member loader;
- Settings reuses the hub's view;
- the history readiness scan checks structure only, and a run's messages are validated where they are read;
- the conversation feed checks its scroll position at most once per frame.

## Change Scope (Mandatory)

- In scope: UC-001…UC-005; the areas in Final File Responsibility Mapping.
- Derived consumers of the removed `communication_messages` / `messages` fields:
  - the three view schemas and their correlation checks;
  - server projectors;
  - the team stream snapshot;
  - web root contexts (correlation, live append);
  - `listMessages()` / `listCommunicationMessages()` callers (Team tab, mobile message screens, the test fixture page);
  - the probes that read `communication_messages` (`delegated-copies-large-hub-probe.mjs` and its message-log check: it reads the new query).

  Each consumer moves to the participant list or is deleted with the field.
- Deliberately left alone:
  - the stored formats (message logs, trees);
  - a single member's projection (no paging);
  - items 161, 200 and 118;
  - other teams' Tasks.
- Follow-ups: none so far.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Trigger | Change | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-002; AC-001, AC-002 | Hub open; Team tab | The view drops the log; the Team tab loads the participant's messages | DS-001, DS-002 |
| BEH-002 | REQ-001, REQ-002; AC-003 | Team or org open; member click | The focused member only; others on open; Team-tab messages on show | DS-002, DS-003 |
| BEH-003 | REQ-003; AC-004 | Hub click | Settings reuses the view | DS-004 |
| BEH-004 | REQ-004; AC-005, AC-006 | Start; new root; Team tab; resume | Structure-only scan; validated where read | DS-005 |
| BEH-005 | REQ-005; AC-007 | Copy open | Cheap shaping of very long unbroken runs; one layout read per frame | DS-006, DS-007 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Relationship |
| --- | --- | --- |
| `evidence/probes/*.mjs`, the seed probe commands, `evidence/M-*` | Before measurements and reproductions | The build reruns them after the change |

## Task Design Health Assessment (Mandatory)

- Change posture: `Performance` (with a `Behavior Change` of loading moments only)
- Current design issue found: `Yes`
- Structural triggers:
  - *One structure serves many consumers with different needs*: the root view is both the row/status model and the message log, which only the Team tab reads.
  - *Duplicated policy*: on-demand member loading exists twice, and team and org runs use neither for their initial load.
  - *Validation in the wrong lifecycle*: history is validated at startup and on every new root.
  - *Repeated global work per update*: a forced layout runs on every component update.
- Root cause classification: `Boundary Or Ownership Issue` (the view owns data that belongs to the Team tab), plus `Duplicated Policy Or Coordination` (member loading).
- Refactor needed now: `Yes`. The message log leaves the view for a participant query with one client owner; one shared member loader; per-run admission.
- Design response: Spines DS-001…DS-006.
- Intentional deferrals: none.

## Terminology

- **Participant messages**: the messages a root's member sent or received, the set the Team tab shows for that member.
- **Member loader**: the shared on-demand loader of a member's projection and file changes.

## Legacy Removal Policy (Mandatory)

- Obsolete paths in this scope:
  - `communication_messages` in the Agent-root and org view contracts;
  - `messages` in the team view and stream snapshot;
  - `getTeamCommunicationMessages(teamRunId)` (whole log);
  - the hydration of all members in `teamRunContextHydrationService.ts` and `agentOrgContextHydration.ts`;
  - the message reads and `validate*StatePackage({ … communicationMessages })` in the readiness scan;
  - `existingRunConfigStore`'s own view read;
  - the per-update `onUpdated(syncAutoScrollIfPinned)` forced read.
- Compatibility wrappers kept: `None`. The web and server ship together, and the remote-node case is checked in Risks.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. No stored file changes; only views, queries and reads change.

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Governing Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, BEH-002 | A root view or live snapshot requested | The view without messages | each root's view projector |
| DS-002 | Primary | BEH-001, BEH-002 | The Team tab is shown for a participant | Its messages, complete and live | `CollaborationParticipantMessages` (web) + `collaborationParticipantMessages` query (server) |
| DS-003 | Primary | BEH-002 | A team or org run opened; a member opened | The focused member staged; others on open | `MemberLoader` (web, shared) |
| DS-004 | Bounded | BEH-003 | A hub selected | One view read shared by the rows and Settings | `agentRunCollaborationStore` |
| DS-005 | Primary | BEH-004 | First history access; a new root; messages read; resume | Structure-only admission; per-run message validation | `RootRunPackageReadinessIndex` / validator; each root's message reader |
| DS-006 | Bounded | BEH-005 | Feed updates | At most one scroll-position read per frame | `AgentConversationFeed.vue` |
| DS-007 | Bounded | BEH-005 | A text block is rendered | A block with a very long unbroken run is shaped without kerning and ligatures | `hasLongUnbrokenRun` + the `long-unbroken-text` class |

## Primary Execution Spine(s)

- DS-001: `GraphQL view query / stream snapshot -> root manager inspection (tree read and validated; no message read) -> view projector -> view DTO (schema without communication_messages)`. The live path: `openPackageSnapshotConnection().snapshot` without `messages`.
- DS-002: `Team tab shown (focused participant; skipped for a remote participant) -> CollaborationParticipantMessages.load(key): start buffering this root's live communication events, then send collaborationParticipantMessages(rootKind, rootRunId, agentRunId) -> resolver: reject a non-participant -> the root's records owner getCollaborationRecordsSnapshot(rootRunId) (live engine, or the stored log validated with the tree) -> filter to the participant (Agent root: the public scope) -> list -> merge the buffer by message ID`. Live: `stream communication event -> root context -> CollaborationParticipantMessages.append`. Rebuild: `root context rebuilt -> CollaborationParticipantMessages.reloadRoot(rootKind, rootRunId, { isActive, baseChangeSequence })`. It keeps the lists only within the same live sequence (`live_sequence_id`) when `baseChangeSequence` has not passed the sequence they are consistent through. Otherwise it reloads, abandoning in-flight loads (SR-004, SR-005). Call sites: `agentRunCollaborationStore` `publish` of a new context instance (inspect, attach, gap `requireReopen` then reopen); `agentTeamRunStore.replaceFailedTeamStream` and the team open commit; `agentOrgStreamingService.reopenOwned` and the org context commit.
- DS-003: `root opened or rebuilt (initial open, stream recovery, org source 'stream', gap/checkpoint reopen) -> MemberLoader.beginRoot(root) (new generation: no member hydrated) -> the focused member loaded (exactly between checkpoints on recovery) -> member opened -> MemberLoader.ensure(context, agentRunId) (loads when not hydrated in the current generation) -> projection + file changes -> commit`.
- DS-004: `hub selected -> agentRunCollaborationStore.inspect (one in-flight or settled view) -> rows; Settings -> agentRunCollaborationStore.viewFor(hostRunId) (awaits the same inspection) -> tree, closed and remote executions`.
- DS-005: `first access / new root -> RootRunPackageCurrentValidator.scan (tree + manifest + log file presence; no log read)`; `admitCurrent(family, id) -> validates that one package's structure and adds it (no rescan)`; `inspection -> the tree only`; `records owner (participant query, reference content, resume/activation) -> strict validation of that run's tree and log -> error with the reason on failure (rule 7: contained to that run's read)`.
- DS-006: `onUpdated -> scheduleAutoScrollCheck() (one requestAnimationFrame per frame) -> syncAutoScrollIfPinned (one scrollHeight read)`.
- DS-007: `text block render (user message text, markdown html segment, inter-agent message text, Team-tab message row) -> hasLongUnbrokenRun(text) (a run of at least 1,000 non-whitespace characters) -> class long-unbroken-text { font-kerning: none; font-variant-ligatures: none; font-feature-settings: normal; text-rendering: optimizeSpeed }`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | The three view projectors stop putting the log in the view. The view keeps everything else: tree, statuses, input states, closed and remote executions, `base_change_sequence`. Snapshots on reconnect are the same view | projectors |
| DS-002 | `CollaborationParticipantMessages` (web) is the one owner of loaded message lists, keyed by root kind, root run and participant. It starts its load when the Team tab (or a mobile message screen) asks for that participant's list, but never for a remote participant (empty, as today). It starts buffering the root's live `communication` events before it sends the request, then merges by message ID, so nothing is lost or doubled. The list order is the existing perspective order (newest first, then ID). A failed load shows the tab's existing error state with the reason, and opening the tab again retries. Every rebuild of the root context calls `reloadRoot`: reconnect, gap or checkpoint reopen, recovery and stop/inspect. It reloads only when a message could have been missed: a stored rebuild, a different live sequence (`live_sequence_id`: another publisher after a stop/resume or restart), or a base sequence past the sequence the lists are consistent through (SR-004, SR-005). Otherwise the lists and in-flight loads are kept. The server query reads through the root's records owner: the live engine when active, else the stored log validated with the tree (DS-005) | `CollaborationParticipantMessages`; query resolver |
| DS-003 | One `MemberLoader` replaces the two copies. It holds a generation per root, which every rebuild bumps, and "hydrated" is per member context within the current generation. It dedupes in flight and commits through `commitMemberRunStates`. Initial open, stream recovery (exact, between the checkpoints, as today), org `source: 'stream'` and reopen all stage only the focused member; every other member loads on open via `MemberLoader.ensure`, so a member hydrated before a failure is never shown stale. The hub's copies use the same loader. Status, Task summaries and live events come from the view and stream as today | `MemberLoader` |
| DS-004 | Settings takes the hub's view from the collaboration store, which reads it once per selection (its in-flight inspection or its published context). It no longer reads it itself | collaboration store |
| DS-005 | The scan admits a team or org package from its tree, its manifest and the presence of its log file, and reads no log. `admitCurrent` validates the one new package and adds it, without rebuilding the snapshot. Inspections read and validate the tree only. A run's log is strictly validated, with its tree, only in the records owner: the participant query, reference content, and resume/activation. A damaged log fails those reads with the reason, and the run's view and rows still open (rule 7: contained to that run's read) | readiness index; message readers |
| DS-006 | `onUpdated` no longer reads layout. It schedules one `requestAnimationFrame` check per frame, which reads `scrollHeight` once and scrolls if pinned. Behavior (stick to bottom, unseen activity) is unchanged | the feed |
| DS-007 | One pure helper decides whether a text has a run of at least 1,000 non-whitespace characters, in one linear scan. The four text renderers add the `long-unbroken-text` class to that block only. The class turns off kerning and ligatures, the measured cost. The implementation may drop any of the four properties that the measurement shows is not needed, and records which. Wrapping (`break-words`), copy and search are untouched | `utils/text/longUnbrokenRun.ts` and the renderers |

## Spine Actors / Main-Line Nodes

The view projectors (agent, team, org); the `collaborationParticipantMessages` resolver; `CollaborationParticipantMessages` (web); `MemberLoader` (web); `agentRunCollaborationStore`; `RootRunPackageCurrentValidator` / `RootRunPackageReadinessIndex`; `AgentConversationFeed.vue`.

## Ownership Map

- `CollaborationParticipantMessages`: loaded lists, in-flight loads, the live buffer, merge, the per-root consistent-through sequence and the `live_sequence_id` it belongs to, `reloadRoot` on root-context rebuilds when a message could have been missed (DS-002, SR-004), errors.
- `MemberLoader`: in-flight member loads and commit, and the "hydrated" state per context.
- Root contexts: structure, statuses and focus. They forward `communication` events to `CollaborationParticipantMessages`, and no longer hold messages.
- Readiness index: structure-only admission and per-run admission.
- Each root's message reader: strict log validation where read.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner Behind It | Must Not Own |
| --- | --- | --- |
| `CollaborationMessagesContextView.listMessages()` (kept as the seam; now returns the loaded list, or a loading/error state) | `CollaborationParticipantMessages` | Fetching policy |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `communication_messages` in the Agent-root and org views (`agent-run-collaboration-dtos.ts:42-51`, `agent-org-execution-dtos.ts:267-281`, the correlation in `root-execution-view-dtos.ts:71-89,111,173`); `messages` in the team view and snapshot | REQ-002 | DS-002 |
| `getTeamCommunicationMessages` (`team-communication.ts:50-56`) and `fetchTeamCommunicationForTeam` (`teamCommunicationHydrationService.ts`) | The whole team log at open | `collaborationParticipantMessages` |
| Messages kept in `teamExecutionViewState.ts` (`:90,135,333,437-441,510`), `agentRunCollaborationContext.ts` (`:74,89,192-194,383-394`), the org context | REQ-002 | DS-002 |
| Hydration of all members in `teamRunContextHydrationService.ts:287-318` and `agentOrgContextHydration.ts:77,148-165`; the duplicate loaders in `teamMemberProjectionHydrationService.ts` and `agentRunCollaborationChildHydration.ts` | REQ-001 | `MemberLoader` |
| Message reads and the message part of `validate*StatePackage` in `root-run-package-current-validator.ts:157-163,189-195`; the full rebuild in `admitCurrent` (`root-run-package-readiness-index.ts:48-53`) | REQ-004 | DS-005 |
| `readAgentRunCollaboration` in `existingRunConfigStore.ts:202` | REQ-003 | DS-004 |
| The message read and `validateAgentOrgStatePackage` with messages in the org inspection (`agent-org-run-manager.ts:189-197`); `readMessages` in the hub inspection (`standalone-agent-run-root-manager.ts:282`); `messages` in `StandaloneRootPackageSnapshot`, the org snapshot and the team stream snapshot | AR-001: views no longer need them | The records owners (DS-002, DS-005) |
| The hub reference route reading `getInspection().snapshot.messages` (`agent-collaboration-references.ts:17-20`) | AR-001 | The hub `getCollaborationRecordsSnapshot` |
| `onUpdated(syncAutoScrollIfPinned)` (`AgentConversationFeed.vue:482`) | REQ-005 | DS-006 |

## Return Or Event Spine(s) (If Applicable)

Live `communication` events per root: `stream -> root context -> CollaborationParticipantMessages.append` (DS-002).

## Bounded Local / Internal Spines (If Applicable)

- `CollaborationParticipantMessages` per key: `idle -> loading (buffering live events) -> loaded (append live) | error (retry on next show)`; on reconnect, `loaded -> loading`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Responsibility |
| --- | --- | --- |
| Public scope of Agent-root messages | DS-002 | `isPublicMessage`, applied in the query as the projector does today |
| Reference-file links | DS-002 | The existing reference content paths, unchanged |
| Probes | all | The seed probe's message-log check reads the new query |

## Ownership Boundaries

Views never carry messages. Only `CollaborationParticipantMessages` fetches them on the client, and only the new query serves them. Member details are fetched only through `MemberLoader`. Settings never reads a view itself.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `collaborationParticipantMessages` | each root's live engine and stored reader, validation, scope | the web owner | A view or snapshot carrying messages again |
| `MemberLoader` | projection + file-change fetch, commit, dedupe | team, org and hub contexts | Hydration code fetching members directly |

## Dependency Rules

The web root contexts depend on `CollaborationParticipantMessages` and `MemberLoader`, never on their queries directly. The server resolver depends on the three root managers' readers.

## Interface Boundary Mapping

| Interface | Subject | Identity |
| --- | --- | --- |
| `collaborationParticipantMessages(rootKind: "agent" \| "agent_team" \| "agent_org", rootRunId, agentRunId) -> { messages }` (rejects a non-participant) | one participant's messages of one root | root kind + root run + participant |
| `getCollaborationRecordsSnapshot(rootRunId)` on the hub manager (new, as the org manager's `agent-org-run-manager.ts:148`) and the team equivalent; the org one gains the tree-plus-messages validation now in its inspection (`:189-197`) | a root's whole log, validated | root run |
| `CollaborationParticipantMessages.list(key) / load(key) / append(rootKind, rootRunId, message, changeSequenceThrough) / observeSequence(rootKind, rootRunId, sequence) / reloadRoot(rootKind, rootRunId, { isActive, baseChangeSequence })` | loaded lists and their consistent-through sequence | key = root kind + root run + participant |
| `MemberLoader.beginRoot(root)` / `ensure(context, agentRunId)` | a root's generation; one member's details | root; the context + agent run |
| `RootRunPackageReadinessIndex.admitCurrent(family, id)` (one package, no rescan) | admission | family + id |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Risk |
| --- | --- | --- | --- |
| `collaborationParticipantMessages` | Yes | Yes (compound) | Low |
| `MemberLoader.ensure` | Yes | Yes | Low |

## Main Domain Subject Naming Check

| Subject | Name | Glossary-Consistent? |
| --- | --- | --- |
| participant messages | `collaborationParticipantMessages` | Yes ("collaboration", "message") |
| member loader | `MemberLoader` | Yes ("member") |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Member loading | `memberRunStateHydration.ts`, the two on-demand loaders | Extract one (`MemberLoader`) |
| Team-tab filter | the three `perspective` functions | Reuse as the list order and shape |
| Log readers and validation | the three package stores and their validators | Reuse in the query and resume |

## Subsystem / Capability-Area Allocation

| Area | Owns | Decision |
| --- | --- | --- |
| `autobyteus-collaboration-stream-contracts` | view schemas | Extend (remove fields) |
| server `services/agent-streaming/*` projectors; `api/graphql/types/` | views; the new query | Extend |
| server `run-history/services/` | admission | Extend |
| web `services/collaborationMessages/` (new) | `CollaborationParticipantMessages` | Create New |
| web `services/runHydration/memberLoader.ts` (new) | `MemberLoader` | Create New (replaces two) |
| web contexts, stores, `RightSideTabs.vue`, mobile message screens, `existingRunConfigStore.ts`, `AgentConversationFeed.vue` | consumers | Extend |

## Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `autobyteus-collaboration-stream-contracts/src/{agent-run-collaboration-dtos,agent-org-execution-dtos,root-execution-view-dtos}.ts` and the team view schema | Remove the message fields and correlation; add `live_sequence_id: string \| null` (SR-005) |
| server `agent-collaboration/execution/services/root-event-publisher.ts` and the three view projectors and snapshot paths | `liveSequenceId` per publisher instance; carried in active views and snapshots, `null` in stored views (SR-005) |
| server `services/agent-streaming/agent-collaboration-view-projector.ts`, `agent-org-execution-view-projector.ts`, the team stream snapshot projector | No log in views |
| server `api/graphql/types/collaboration-participant-messages.ts` (new) | The query |
| server `run-history/services/root-run-package-current-validator.ts`, `root-run-package-readiness-index.ts` | Structure-only scan; per-package admission |
| server `agent-org-execution/services/agent-org-run-manager.ts` (inspection tree-only; records owner validates), `standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` (inspection tree-only; new `getCollaborationRecordsSnapshot`), the team communication projection service (records owner), `agent-org-reference-content-service.ts`, `api/rest/agent-collaboration-references.ts`, `api/rest/team-communication.ts` | Records owners validate tree plus log; reference content reads through them; resume as today |
| server snapshot types (`standalone-agent-run-root.ts:80,114,420`; the org and team root snapshot types) | No `messages` in view snapshots |
| web `services/collaborationMessages/collaborationParticipantMessages.ts` (new) | The client owner |
| web `services/runHydration/memberLoader.ts` (new) | The shared member loader |
| server `api/graphql/types/team-run-history.ts` and the run model config service: `getTeamRunResumeConfig` adds `liveSequenceId` and `baseChangeSequence` (SR-006); web `services/runHydration/teamRunHydrationCommit.ts`: a live rebuild for an active Team (SR-006) |
| web `services/runHydration/teamRunContextHydrationService.ts` (initial and recovery: focused only), `services/runOpen/teamRunOpenCoordinator.ts`, `services/agentOrgExecution/agentOrgContextHydration.ts` (initial and `source: 'stream'`: focused only), `services/agentOrgExecution/agentOrgStreamingService.ts` (reopen calls `reloadRoot` and `beginRoot`), `teamMemberProjectionHydrationService.ts`, `services/agentCollaboration/agentRunCollaborationChildHydration.ts` | `MemberLoader` generations; focused member only; `reloadRoot` on every rebuild |
| web `services/teamExecution/teamExecutionViewState.ts`, `services/agentCollaboration/agentRunCollaborationContext.ts`, `services/agentOrgExecution/agentOrgExecutionContext.ts`, `stores/activeContextStore.ts` | No messages held; forward live events; `listMessages()` from the owner |
| web `components/layout/RightSideTabs.vue` (Team tab), `components/mobile/MobileTeamMessages.vue`, `MobileActivityDigest.vue` | Ask the owner on show; loading and error states |
| web `stores/existingRunConfigStore.ts`, `stores/agentRunCollaborationStore.ts` | Settings reuses the view |
| web `components/workspace/agent/AgentConversationFeed.vue` | One check per frame |
| web `utils/text/longUnbrokenRun.ts` (new) and a shared `long-unbroken-text` style; `components/conversation/UserMessage.vue`, `components/conversation/segments/renderer/MarkdownRenderer.vue` (html segment), `components/conversation/segments/InterAgentMessageSegment.vue`, the Team-tab message row | DS-007 |
| `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` | Reads messages through the new query |

## Target Subsystem / Folder / File Mapping

| Path | Kind | Responsibility |
| --- | --- | --- |
| `autobyteus-web/services/collaborationMessages/` | Folder | Participant message lists for every root kind |
| `autobyteus-web/services/runHydration/memberLoader.ts` | File | The shared member loader |
| `autobyteus-server-ts/src/api/graphql/types/collaboration-participant-messages.ts` | File | The query |

## Folder Boundary Check

| Path | Depth | Clear? | Risk |
| --- | --- | --- | --- |
| `services/collaborationMessages/` | Off-Spine Concern | Yes | Low |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Messages | The Team tab asks `load({ rootKind: "agent", rootRunId: hub, agentRunId: copy })` when shown | Every view and snapshot carrying the log "in case" |
| Live merge | Buffer during the load, merge by ID | Dropping events that arrive mid-load, or refetching on every event |
| Admission | One package admitted on create | A full rescan per new run |
| Scroll | `requestAnimationFrame` once per frame | A layout read in every `onUpdated` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Plan |
| --- | --- | --- |
| Keep `communication_messages` optional in the views for old clients | Rejected | Web and server ship together |
| Keep `getTeamCommunicationMessages` beside the new query | Rejected | Removed |

## Change / Refactor Sequence

1. Server: the records owners (hub: new; org: gains validation; team: existing) and the `collaborationParticipantMessages` query on them (non-participants rejected; the public scope for Agent roots); inspections tree-only; view snapshots without `messages`; reference content through the records owners. Tests on seeded logs, including a damaged log: the view opens, the query and resume fail with the reason.
2. Contracts and projectors: remove the message fields; the team snapshot too.
3. Web: `CollaborationParticipantMessages`; the contexts forward live events and call `reloadRoot` on every rebuild; the Team tab and the mobile screens ask on show. Completeness and order tests (AC-002): a live message during the load, a reconnect, and a gap reopen during and after a load.
4. Web: `MemberLoader` with per-root generations; every hydration form (initial, team recovery, org stream, reopen) stages only the focused member; the copies use it (AC-003). Test: a member hydrated before a stream failure reloads on its next open.
5. Web: Settings reuses the view (AC-004).
6. Server: structure-only scan; per-package `admitCurrent`; damaged-log reporting where read (AC-005, AC-006).
7. Web: the feed's per-frame check (DS-006, done) and the long-run shaping class (DS-007), with a unit test of the helper and a component test that a long-token block gets the class and a prose block does not. Measure L-010 unbroken (QR-004 under 1 s) and L-010 words (no regression); if QR-004 is still missed, stop and return to the Solution Designer.
8. Update the probe; rerun every `M-*` measurement after; docs; suites from a clean clone.

## Key Tradeoffs

- The Team tab shows a short loading state the first time per participant, in exchange for views that do not grow with history.
- A reconnect reloads the loaded lists once (simple and correct), instead of reconciling a partial snapshot.

## Risks

- Remote runs (AR-004): a remote focused participant gets no query; its Team tab stays empty, as today (`agentOrgExecutionContext.ts:421-423`, `agentRunCollaborationIndex.ts:82-84`). The server query rejects a non-participant. No remote fetching.
- Ordering under bursts: covered by buffer-then-merge and a test with live events during the load.
- QR-004 depends on the measured cause; this is the escalation trigger.

## Guidance For Implementation

- Reproduction to start from: the seed (`node autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs --seed-to <dir> --teams 50 --unrelated 300`), the S, L-001 and L-010 `--large-shape unbroken` cases, `evidence/probes/startup-scan-probe.mjs`, and `evidence/M-*` for before values. Large team and org runs for AC-003 are seeded through the public APIs the same way (TESTING.md), never from the user's data.
