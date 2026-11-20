# Design Spec — standalone-run-messages-565 (autobyteus-565)

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (ARCH-REV-001 findings AR-001 … AR-005 and the residual ordering note)
- Approved requirements: `requirements-doc.md` SR-002, approved by the founder 2026-11-20 (DEC-001, DEC-002, DEC-004 in his words; DEC-003, DEC-005 by the Solution Designer within the direction).
- Behavior-defining supplements: None. User approval of the design: `Not required`.
- Design status: `Ready`
- Investigation notes: `tickets/in-progress/standalone-run-messages-565/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md` (in full, this conversation, 2026-11-18); `DESIGN.md` (root, unchanged since; read 2026-11-18); `docs/design-cases.md` (Cases 1–8, 14; the base's additions to Cases 5 and 21 read 2026-11-20); `TESTING.md` (base diff read 2026-11-20); `collaboration_model.md`, `remote_collaboration.md` (read for autobyteus-492).
- Conflicts: None. Every statement about existing code below was read at the committed base `a728fbcad3` (Case 5, autobyteus-492 AR-008).

## Current-State Read

- **Stored messages.** Each run's own log holds every message its agents sent and received (CM-9): `message-log.ts:118-121` reads each line through `validateCollaborationCommunicationMessage` (`collaboration-communication-message-schema.ts:31-46`), which keeps seven fields and ignores any other key — also in `v1.5.13` and `v1.5.14-beta.3` (checked with `git show`). A line has no node.
- **Stored read.** `readCollaborationParticipantMessages` (`api/graphql/types/collaboration-participant-messages.ts:66-95`) returns one participant's messages, all at once, keeping those whose two agents are in the run's tree (`isPublicMessage`, `services/agent-streaming/public-message-scope.ts:10-13`) or whose counterpart is a past participant (`getStudioDelegatedRunAgents().forAgentRunIds`, delegated runs only).
- **Live.** A root's commit publishes through its port: `publishMessage(message, senderRun)` → `RunMessagesFeed.publish({message, senderRun, receiverRun: thisRoot})` (`standalone-root-communication-port.ts:42`, Team `team-communication-port.ts:65`, Org likewise) → each open view of either run's chain whose in-view rule holds (`run-messages-feed.ts:26-43`). The engine publishes only when given `publishFrom` (`root-communication-engine.ts:310-352`): same-root `deliver`, and `acceptFromRun` when `publishToViews` (autobyteus-492 DEC-014: `true` for Task-related, `false` for unrelated; `cross-run-message-delivery.ts:175`). `acceptFromRemote` and `commitSentToRemote` publish nothing.
- **Web.** The view contract `CollaborationMessagesContextView` (`types/workspace/collaborationMessagesContextView.ts`) already has `rootKind: 'agent'`; counterpart identities are `configured`, `delegated`, `past`. The participant store (`services/collaborationMessages/collaborationParticipantMessages.ts`) loads a whole list and merges live messages by ID. A selected standalone run always attaches its collaboration view (`composables/agentCollaboration/useAgentRunCollaborationSync.ts`), but `runMessagesView` returns one only when `hasDelegatedRuns` (`stores/agentRunCollaborationStore.ts:202-205`, `agentRunCollaborationContext.ts:55`). Desktop tab `teamMembers` shows when the target has `collaborationMessages` (`composables/useRightSideTabs.ts:36-75`), labelled Team/Org; its contextual default is Team members when messages exist, else Activity (`:113`). Phone: `MobileRunTargetView.vue:73-77` shows Messages for member kinds only; `MobileMessages.vue` renders every message in full.
- **Existing paging pattern.** Conversation pages of 50 (`active-trace-event-page-policy.ts:4`, `ACTIVE_TRACE_EARLIER_PAGE_SIZE`); Work Journal's "Load earlier" button (`WorkJournalTab.vue:86`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large` — server (message record, engine publish points, feed rule, participant read with paging and identities, remote request/answer fields), contracts package (DTO), web (store paging, view contract, desktop tab and panel, phone menu and view), docs.
- Architectural risk: `High` — a persisted message-line field (rollback-relevant, Case 14), the run-view publication rule shared by every root kind, an inter-node request/answer change, and a shared query used by Team/Org Messages.
- Escalation trigger: a released reader that rejects the new field; any Team/Org row change; a need to scan run folders to name a counterpart.

## Intended Change

A standalone agent run's Messages show every message its own agent sent and received, live and in pages from history, with the other agent's identity and node; Team/Org Messages are unchanged except for the shared paging.

## Change Scope (Mandatory)

- In scope: UC-001 … UC-004.
- Derived consumers:

| Changed structure / rule | Consumer | Decision |
| --- | --- | --- |
| Message line + optional `counterpart` | `message-log.ts` reader (tolerant; released readers too), package validators (endpoints), Team/Org stores | Field read by the validator into an optional property; validators unaffected (run IDs unchanged) |
| Publication rule (feed) | Team/Org views | Their in-view outcome unchanged (Task-related as today; unrelated and remote not in them) |
| Participant read (paging, identities) | Team/Org Messages (desktop, phone) | Same rows; newest 50 first with "Load more" when longer |
| `collaborationParticipantMessagesDtoSchema` | web store, phone, desktop | New fields optional where the server always sends them; one release (DESIGN.md rule 9) |
| Remote request/answer | `PeerClient` strict readers, `PeerGateway` parsers | `sender.address` on `messages` and `run-messages`; `receiverAddress` on their answers |
| Default desktop tab | standalone runs | Stays Activity (the Messages tab no longer implies a collaboration scope) |
| Docs | `collaboration_model.md` (views), `remote_collaboration.md`, `agent_communication.md`, web `docs/` for the Messages panel | Updated |

- Left alone: what is stored (the run's own log, one line per message); message delivery rules (autobyteus-492); Team/Org in-view rule; the run tree.
- Follow-ups: None yet.

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | REQ / AC | Trigger | Target path / spine |
| --- | --- | --- | --- |
| BEH-001 | REQ-001; AC-001 | Phone ⋮ menu | DS-004 |
| BEH-002 | REQ-001; AC-001 | Desktop right panel | DS-004 |
| BEH-003 | REQ-002, 003; AC-002 | Open Messages | DS-001 |
| BEH-004 | REQ-004; AC-003 | A message is sent or received | DS-002, DS-003 |
| BEH-005 | REQ-003, 007; AC-006 | A cross-node message | DS-003 |
| BEH-006 | REQ-005, 006; AC-004, AC-005 | Load more | DS-001 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`. Current design issue found: `Yes`.
- Triggers:
  - **Several kinds or forms (P1):** messages a standalone host exchanges come by five paths (same root; Task-related run; unrelated local run; linked remote; unlinked remote), sent or received. Entry-form table below.
  - **Derived data / one owner per fact (P11):** "which messages a view shows" exists twice today (feed `inViewOf`; read `isPublicMessage` + past) and must agree live and stored. Response: one rule owner, `MessageViewScope`, used by both.
  - **Behavior by absence (P13):** today a remote message stays out of views because the engine is given no `publishFrom`. Response: an explicit `relation` on each committed message (`same_run` | `related` | `unrelated` | `remote`) decided by the delivering owner, and the scope rule decides per view.
  - **Persisted-data transition (P5, Case 14):** fires; decision below.
  - **Global work (DESIGN.md rule 3):** naming a counterpart must not scan 784 team folders; response: the line records the counterpart's address and node.
- Deviations: None.
- Root cause: `Duplicated Policy Or Coordination` (two in-view rules) and `Missing Invariant` (no node recorded for cross-node messages).
- Refactor needed now: `Yes` — the 492 `publishToViews` flag and the absent publication for remote messages are replaced by `relation` + `MessageViewScope`.

## Terminology

- **Own messages** (of a standalone run): every message its own agent sent or received.
- **Counterpart:** the other agent of a message. **Counterpart record:** `{ address: string | null, nodeId: string | null }` stored with a line whose counterpart is outside the run's tree; `nodeId` set only for another node.
- **Relation** (of a committed message to the committing run): `same_run`, `related` (a Task relates the runs), `unrelated`, `remote`.

## Legacy Removal Policy (Mandatory)

- Replaced: `publishToViews` (`RunAcceptInput`, `cross-run-accept-input.ts`, `cross-run-message-delivery.ts:175`, engine `:295`) by `relation`; the in-view logic in `run-messages-feed.ts:37-43` and the filter in `collaboration-participant-messages.ts:81-88` by `MessageViewScope`.
- Compatibility paths kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Subject: per-run message logs (`communication_messages_*.jsonl`); the founder's PM 2,506 lines, 7.3 MB.
- Change: new optional key `counterpart` on new lines (only where the counterpart is outside the committing run's tree).
- Readers: the one line reader (`message-log.ts`) validates through `validateCollaborationCommunicationMessage`, which ignores unknown keys in the current code and in the released `v1.5.13` and `v1.5.14-beta.3` (Case 14 checked: a rollback reads new lines and drops the key).
- Decision: `Directly Usable — No Migration`. Old lines have no `counterpart`; the read derives what it can (Task entries for linked remote runs, the agent run's own `run_metadata.json` for a local agent run) and otherwise shows the run ID (no node chip: an old unknown counterpart cannot be told from a deleted local run).
- Note for the founder's decision DEC-002: it said older unlinked cross-node messages show "the run ID and another node"; the evidence above shows the node cannot be known for them, so they show the run ID without a chip (stated in the result).

## Data-Flow Spine Inventory

| Spine | Scope | BEH | Start | End | Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | 003, 006 | User opens Messages / Load more | Page of rows with identities | `ParticipantMessagesReader` (server) / participant store (web) |
| DS-002 | Primary | 004 | A local message commits (any of the four local relations) | Row appears in each view the scope admits | `RootCommunicationEngine` → port → `RunMessagesFeed` |
| DS-003 | Primary | 004, 005 | A cross-node message commits (sent or received) | Row with node chip, live | engine (`commitSentToRemote` / `acceptFromRemote`) → feed |
| DS-004 | Primary | 001, 002 | User opens a standalone run | Messages entry present | web target (`activeContextStore`) |

## Primary Execution Spine(s)

- DS-001: `Messages panel / MobileMessages → participant store.load(key, cursor?) → fetchParticipantMessages(rootKind, rootRunId, agentRunId, before?) → GraphQL collaborationParticipantMessages → ParticipantMessagesReader.read → root records (log) → MessageViewScope.filter → page (newest 50 before cursor) → CounterpartIdentities.of(page) → DTO {messages, counterparts, hasMore}`
- DS-002: `send_message_to → (route as autobyteus-492) → publishing commit: engine.deliver (same run) | the receiver's engine.acceptFromRun({relation, parties}) (it fans out to both runs' chains; `commitSentToRun` never publishes, AR-002) → port.publishMessage({message, relation, parties, senderRun, receiverRun}) → RunMessagesFeed.publish → MessageViewScope.inView(X, …) per open stream → stream event {message, parties} → web AgentRunCollaborationContext.applyEvent → participant store.append(message, parties)`
- DS-003: `RemoteMessageSend: links.deliver → answer {peerName, receiverAddress} → engine.commitSentToRemote(prepared, {address: receiverAddress, nodeId, nodeName: peerName}) | receiving root: engine.acceptFromRemote({…, senderAddress, senderNodeName}) → line with counterpart {address, nodeId} → port.publishMessage({message, relation: "remote", parties, localRun}) → feed → MessageViewScope (only an Agent root's own chain view) → web append(message, parties)`. Publishing commits on this spine: `commitSentToRemote` and `acceptFromRemote`, each to its own run's chain only.
- DS-004 (an application-owned run has no collaboration root: `getInspection` returns null for a run that is not collaboration-eligible, `standalone-agent-run-root-manager.ts:347`, so `agentRunCollaboration` answers null, `agent-run-collaboration.ts:45-48`, no context exists and no Messages entry shows; AR-005): `useAgentRunCollaborationSync (attaches the selected run's view, as today) → agentRunCollaborationStore.runMessagesView(runId) (no hasDelegatedRuns gate) → activeContextStore target.collaborationMessages → desktop tab "Messages" (rootKind agent) / phone ⋮ Messages (standalone_agent)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | The read loads the run's records, keeps what `MessageViewScope` admits for that participant (all own messages for a standalone host; today's rule otherwise), returns the newest 50 before the cursor, and names each counterpart once. | `ParticipantMessagesReader` |
| DS-002 | The delivering owner states the relation; the engine passes it with the commit; the feed asks the scope rule for every open view of either run's chain. | engine (order), feed (fan-out), scope (rule) |
| DS-003 | Both sides record the counterpart's node and address on the line and publish to their own run's views; only an agent root's own view admits it. | engine |
| DS-004 | Every selected standalone run already has a live view; its messages view is offered whenever the view exists. | web store |

## Ownership Map

- **`MessageViewScope`** (new, `agent-collaboration/delegation/message-view-scope.ts`): the one rule of which messages a run view shows. `inView({ view: X, viewIsAgentRoot, message sides: {run | remote}, relation, treeOf })`: Task-related and same-run messages by today's tree rule (both sides in X's tree, or one side X); `unrelated` and `remote` only when X is an Agent root and one side is X. `participantFilter(...)` for the stored read: a standalone host's own messages all; otherwise today's (both in tree, or a past participant). Used by `RunMessagesFeed` and the reader; nothing else decides in-view.
- **`ParticipantMessagesReader`** (new, from the body of `readCollaborationParticipantMessages`): records, scope, page (`limit` 50, cursor `{createdAt, messageId}` newest-first), identities. The GraphQL resolver only parses arguments and calls it.
- **`CounterpartIdentities`** (new, beside the reader): names counterparts outside the tree: the newest line's `counterpart` record (address; `nodeId` → this node's peer name through `RemoteRunChannel.peerName`); else the Task entry (linked remote: `nodeId`, `recipientAddress`); else a local agent run's own `run_metadata.json` (one file by ID); else none (run ID). Past participants as today (`forAgentRunIds`). No folder scans.
- **Engine** (`root-communication-engine.ts`): order unchanged; passes `relation` to the port on every publishing commit, including `commitSentToRemote` and `acceptFromRemote` (local side only), and writes `counterpart` on lines with a remote or unrelated counterpart.
- **`CrossRunMessageDelivery`**: states `relation` (`related` / `unrelated`) instead of `publishToViews`, and passes the counterpart's address to both sides: the sender's from its identity (`memberAddress`) into `acceptFromRun`; the receiver's from `acceptFromRun`'s accepted answer (target: the receiving root adds its agent's address to the answer) into `commitSentToRun`.
- **`RemoteMessageSend` / `RemoteMessageReceiver` / `PeerClient` / `PeerGateway`**: carry `sender.address` and `receiverAddress`.
- **Parties of a live message (AR-001)**: every publishing commit attaches `parties: {sender: Party, receiver: Party}`, `Party = {agentRunId, address: string | null, nodeName: string | null}`, known at the commit without a lookup: a local agent's own `memberAddress`; the other run's agent's address from the delivering owner (CrossRun: sender identity, receiver identity in `acceptFromRun`); a remote side's address from the request (`sender.address`) or answer (`receiverAddress`) and its node name from the commit's own peer name (`RemoteAcceptInput.senderNodeName`; `RemoteRunLinks.deliver`'s `peerName`, `remote-run-links.ts:157`). The stream's message event carries `parties`.
- **Web participant store**: pages per list (stored pages + live, merged by ID), `loadMore(key)`; on `append`, a counterpart the list does not know is named from the event's `parties` (kind `run`, or `remote` with `nodeName`), so the first live message from the Linux PM shows at once (`participantMessageRows.ts:24-25` drops a row without identity today). `CollaborationMessagesContextView` gains `hasMore()`, `loadMore()`, counterpart identity kinds `run` and `remote`.
- **Every counterpart on a page has an identity (AR-001)**: `CounterpartIdentities` falls back to `{kind: "run", agentRunId, address: null}` (label: the run ID) for a counterpart it cannot name (old, deleted), so no row vanishes.

## File Responsibility Mapping (AR-003)

| File | Change | Owner / concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-collaboration/delegation/message-view-scope.ts` | Add | `MessageViewScope`: `inView`, `participantFilter` |
| `autobyteus-server-ts/src/agent-collaboration/delegation/run-messages-feed.ts` | Modify | `publish({message, relation, parties, …})`; uses the scope; `inViewOf` removed |
| `autobyteus-server-ts/src/agent-collaboration/execution/communication/root-communication-engine.ts`, `root-communication-port.ts`, `root-message-append.ts` | Modify | `relation` + `parties` on publishing commits; `counterpart` on lines; `publishToViews` removed; `commitSentToRemote` takes the receiver party |
| `…/execution/communication/collaboration-communication-message.ts`, `collaboration-communication-message-schema.ts` | Modify | optional `counterpart` read and written |
| `…/communication/cross-run-message-delivery.ts`, `cross-run-accept-input.ts` | Modify | `relation`, parties |
| `…/execution/remote/remote-message-send.ts`, `remote-run-links.ts` (`deliver` answer), `remote-run-channel.ts` (transmission and receipt types) | Modify | sender address out; `receiverAddress` back |
| `autobyteus-server-ts/src/remote-collaboration/domain/remote-requests.ts`, `channel/peer-client.ts`, `channel/peer-gateway.ts`, `inbound/remote-message-receiver.ts` | Modify | `sender.address`, `receiverAddress` (strict readers) |
| Root ports: `standalone-agent-run-root/services/standalone-root-communication-port.ts`, `services/team-communication/team-communication-port.ts`, `agent-org-execution/services/agent-org-communication-port.ts`; roots' `acceptRemoteMessage`/`acceptPeerRunMessage`/`acceptFromRun` (three roots) | Modify | pass parties; answer with the receiving agent's address |
| `autobyteus-server-ts/src/run-history/services/participant-messages-reader.ts` | Add | `ParticipantMessagesReader` (beside `run-view-messages.ts`): records per kind, scope, page, identities |
| `autobyteus-server-ts/src/run-history/services/counterpart-identities.ts` | Add | `CounterpartIdentities` |
| `autobyteus-server-ts/src/api/graphql/types/collaboration-participant-messages.ts` | Modify | resolver parses args (`before`) and calls the reader; the record reads per kind move into the reader's collaborator `RunRecordsSource` (the existing `readRunRecords` body, unchanged) |
| `autobyteus-server-ts/src/compositions/collaboration-composition.ts` | Modify | creates the reader with its collaborators |
| `autobyteus-collaboration-stream-contracts` (participant DTO, message event) | Modify | `counterparts`, `hasMore`, `before`; event `parties` |
| `autobyteus-web/services/collaborationMessages/collaborationParticipantMessages.ts`, `participantMessagesQuery.ts`, `participantMessageRows.ts` | Modify | paging, `loadMore`, parties, fallback identity |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts`, team/org contexts' `applyEvent` | Modify | pass `parties` to `append` |
| `autobyteus-web/types/workspace/collaborationMessagesContextView.ts` | Modify | `hasMore`, `loadMore`, identity kinds |
| `autobyteus-web/stores/agentRunCollaborationStore.ts` | Modify | `runMessagesView` without the gate |
| `autobyteus-web/composables/useRightSideTabs.ts` | Modify | label "Messages" for `rootKind: 'agent'`; default stays Activity for standalone |
| `autobyteus-web/components/workspace/collaboration/CollaborationMessagesPanel.vue`, `components/mobile/views/MobileMessages.vue`, `components/mobile/runScreen/MobileRunTargetView.vue` | Modify | node chip, "Load more", phone menu entry |
| `autobyteus-web/localization/messages/{en,zh-CN}/…` | Modify | "Messages", "Load more", node chip text |

**Collaborators (Principle 16).** `ParticipantMessagesReader` is created in `collaboration-composition.ts` and receives: `records: RunRecordsSource` (the per-kind reads now in the GraphQL file: standalone `getCollaborationRecordsSnapshot`, Team and Org stores), `scope: MessageViewScope`, `tree: Pick<DelegationIndex, …>`, `identities: CounterpartIdentities`. `CounterpartIdentities` receives `delegatedRunAgents` (today `getStudioDelegatedRunAgents()`, passed in), `peerName: (nodeId) => Promise<string>` from the composition's `input.remoteChannel` (`RemoteRunChannel.peerName`, `remote-run-channel.ts:120`; no channel → the node ID), `runMetadata: Pick<AgentRunMetadataStore, "readMetadata">`, `tree` (Task entries: `nodeId`, `recipientAddress`). The GraphQL resolver reaches the reader the way the other composed services are reached today (a process instance set by the composition, as `setProcessTaskDelegationToolService`): it is set before the server listens, a missing one throws, and it hides no cycle.

## Paging Order (residual)

One total order everywhere: `createdAt` descending, then `messageId` ascending (as `participantMessageRows.ts:32`). The cursor is the last row's `{createdAt, messageId}`; the next page is the rows strictly after it in that order, so ties are neither skipped nor repeated.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `publishToViews` (engine `RunAcceptInput:80`, `cross-run-accept-input.ts:16`, `cross-run-message-delivery.ts:175`) | A boolean per caller instead of one rule | `relation` + `MessageViewScope` |
| `RunMessagesFeed.inViewOf` (`run-messages-feed.ts:37-43`) | Second copy of the view rule | `MessageViewScope.inView` |
| Filter lines in `collaboration-participant-messages.ts:81-88` | Third copy | `MessageViewScope.participantFilter` in the reader |
| `hasDelegatedRuns` gate in `runMessagesView` (`agentRunCollaborationStore.ts:204`) and the getter if then unused | DEC-001 (always) | — |
| `MEMBER_KINDS`-only `showMessages` (`MobileRunTargetView.vue:73-77`) | DEC-001 | target has `collaborationMessages` |

## Off-Spine Concerns

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Peer name for a node ID | `CounterpartIdentities` | `RemoteRunChannel.peerName` (existing) |
| Labels and node chip | desktop panel, phone view | existing label helpers + chip |
| Localization (en, zh-CN) | web | "Messages" tab, "Load more", empty state |

## Interface Boundary Mapping

| Interface | Shape | Notes |
| --- | --- | --- |
| GraphQL `collaborationParticipantMessages(rootKind, rootRunId, agentRunId, before?: {createdAt, messageId})` | `{messages (newest first, ≤ 50), counterparts: [{agentRunId, kind: "past" \| "run" \| "remote", address?, nodeName?}], hasMore}` | `pastParticipants` folds into `counterparts` (`kind: "past"`) |
| Line field `counterpart` | `{address: string \| null, nodeId: string \| null}` | Only when outside the tree |
| `RootCommunicationPort.publishMessage` | `({message, relation, senderRun, receiverRun})`, a remote side as `{nodeId}` | One call per commit |
| Remote `messages` / `run-messages` request | `sender: {agentRunId, address}` | `address` of the sending agent in its own run |
| Their accepted answer | `{accepted: true, nodeId, receiverAddress}` | Read strictly |
| Web `CollaborationMessagesContextView` | + `hasMore()`, `loadMore()`; identity kinds `run` `{address,label}`, `remote` `{address \| null, label, nodeName \| null}` | `remote` with `nodeName` shows the chip |

## Concrete Examples / Shape Guidance

Entry forms for a standalone host H (Principle 1):

| # | Form | Recorded counterpart | Live in H's view | In stored read | Identity |
| --- | --- | --- | --- | --- | --- |
| 1 | H ↔ an agent of its own run | — | yes (same_run) | yes | configured |
| 2 | H ↔ its task agent / team, open Task | — | yes (related, as today) | yes | delegated |
| 3 | same, Task closed | — | yes | yes | past |
| 4 | H ↔ an unrelated local run (other PM, a task agent of another Task) | `{address, nodeId: null}` | yes (unrelated, H is an agent root) | yes | run |
| 5 | H ↔ linked remote run | `{address, nodeId}` (old lines: Task entry) | yes (remote) | yes | remote + chip |
| 6 | H ↔ unlinked remote run (PM ↔ Linux PM) | `{address, nodeId}` (old lines: none) | yes (remote) | yes | remote + chip (old: run ID) |
| 7 | A Team/Org member ↔ unrelated or remote | recorded | no (not an agent root) | no | — (Team/Org unchanged) |

Page: `[newest … 50th]` + "Load more" → next 50 before the 50th's `{createdAt, messageId}`; a live row arriving meanwhile is merged by ID, never doubled.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep `publishToViews` beside `relation` | Rejected: one rule |
| Version check for peers without `receiverAddress` | N/A (DESIGN.md rule 9) |
| Migrating old lines to add `counterpart` | Rejected: not derivable for unlinked remote; read derives what it can |

## Change / Refactor Sequence

1. `MessageViewScope` + tests reproducing today's Team/Org outcomes (live and stored) before any change.
2. `relation` through CrossRun, engine, ports, feed; remove `publishToViews` and `inViewOf`.
3. `counterpart` on lines (schema reads it), remote request/answer fields, CrossRun addresses.
4. `ParticipantMessagesReader` + `CounterpartIdentities` + paging; DTO in `@autobyteus/collaboration-stream-contracts`.
5. Web: store paging, view contract, `runMessagesView` gate removal, desktop tab label "Messages" (default stays Activity), phone menu and `MobileMessages` with chip and "Load more"; desktop panel with chip and "Load more".
6. Docs; tests: server unit (scope, reader paging/identities, engine relation), two-server E2E (forms 5, 6 live and stored, node chip data), web component tests (desktop tab, phone menu, Load more, chip), payload measured on a 2,500-message fixture (first page size).

## Key Tradeoffs

- One scope rule over adding another flag: the 492 flag is replaced, so Team/Org behaviour is decided in one place.
- Recording the counterpart on the line (a few bytes) over scanning run folders to name it.
- The server still reads the whole log to serve a page (as today); the network and the phone get 50 rows. Measure; optimize only if slow (DESIGN.md phase 2).

## Risks

- Team/Org regression through the shared rule and paging: step 1 pins today's outcomes in tests first.
- Old unlinked cross-node lines show only a run ID (5 on the founder's PM).

## Guidance For Implementation

- Reproduction: the founder's screenshot case as a phone component test (standalone target → no Messages today); a server test where a standalone host exchanges forms 4 and 6 and the stored read drops them today.
- Read all existing code at the committed state; the worktree is shared with nobody yet, but follow Case 5's note.
