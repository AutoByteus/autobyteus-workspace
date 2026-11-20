# Design Review Report — standalone-run-messages-565 (autobyteus-565)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/standalone-run-messages-565/requirements-doc.md` (Approved, SR-002 basis; status SR-004 with DEC-002/AC-006 corrected)
- Upstream Investigation Notes: `tickets/in-progress/standalone-run-messages-565/investigation-notes.md`
- Upstream Solution Revision Record: `tickets/in-progress/standalone-run-messages-565/solution-revision-record.md` (SR-001 … SR-004)
- Reviewed Design Spec: `tickets/in-progress/standalone-run-messages-565/design-spec.md` (Ready, SR-004)
- Supplemental Task Artifacts Reviewed: None (the Task screenshot is user evidence, not a behavior supplement); `handoff-architecture-review.md`; `follow-ups.md` (none)
- Relevant Solution Revision IDs: SR-001 … SR-004
- Architecture Review Revision Record: `tickets/in-progress/standalone-run-messages-565/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-004 (commit `71c85a0381`), which revises the design for ARCH-REV-001. Round 1 reviewed SR-003 (`9a18bcd873`).
- Prior Review Round Reviewed: 1 (ARCH-REV-001, `Fail`)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565`, branch `codex/standalone-run-messages-565` at `71c85a0381`; round 2 also opened `remote-run-links.ts:155-160` (`deliver` answers `peerName`), `standalone-agent-run-root-manager.ts:340-350` (`getInspection` returns null for a run that is not collaboration-eligible), `agent-run-collaboration.ts:45-48`, `task-delegation-tool-service.ts:35` (`setProcessTaskDelegationToolService`) and engine `:90, :226` (`senderNodeName`); all code read at the committed base `a728fbcad3` with `git show`. Files opened:
  - Server: `collaboration-communication-message-schema.ts` (also at `v1.5.13` and `v1.5.14-beta.3`), `root-communication-engine.ts:80,295,352`, `root-communication-port.ts:65`, the three ports' `publishMessage` (standalone `:42`, Team `:65`, Org `:41`), `run-messages-feed.ts`, `cross-run-accept-input.ts:16`, `cross-run-message-delivery.ts:175`, `remote-run-channel.ts:120` (`peerName`), `collaboration-participant-messages.ts`.
  - Web: `agentRunCollaborationStore.ts:146-205`, `useAgentRunCollaborationSync.ts`, `collaborationParticipantMessages.ts`, `participantMessageRows.ts`.
  - `DESIGN.md` rules 9 and 10.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: a persisted line field (Case 14), the publication rule shared by every root kind, an inter-node request/answer change, and a shared query used by Team/Org Messages; changes span server, contracts package and web.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Round 2: AR-001 … AR-005 are resolved (evidence in the ARCH-REV-002 table of the revision record). The rest of this section records the round-1 basis, which still holds.
- Overall Basis Status: `Confirmed` (round 2). DEC-002/AC-006 now match the design.
- Approved requirements / intended behavior understood:
  - Every standalone agent run (not application-owned) offers Messages on desktop and phone, always (DEC-001).
  - It lists every message its own agent sent or received, newest first, with direction, the counterpart's identity, a node chip for another node, and time (REQ-002, REQ-003).
  - Rows appear live (REQ-004) and load in pages of 50 with "Load more" (DEC-004).
  - Cross-node messages record node and address from now on (REQ-007, DEC-002).
  - Team/Org Messages keep their rows (REQ-006).
- Relevant existing behavior and evidence confirmed:
  - Phone gate: `MobileRunTargetView.vue:73-77`. Desktop gate: `hasDelegatedRuns`, `agentRunCollaborationStore.ts:204`.
  - The stored read keeps only `isPublicMessage` messages or past participants.
  - The feed publishes once, at the receiver's commit, to both runs' chains (`run-messages-feed.ts:26-35`; class comment "the sender's later commit of the same message ID does not").
  - `publishToViews` sites: `cross-run-accept-input.ts:16`, `cross-run-message-delivery.ts:175`, engine `:80, :295`.
  - Remote commits publish nothing.
  - The line reader keeps seven fields and ignores other keys, also at `v1.5.13` and `v1.5.14-beta.3`.
  - `syncRun` attaches a view for every selected standalone run (`agentRunCollaborationStore.ts:146-151`), so DS-004's premise holds.
  - Web rows are already sorted newest first (`participantMessageRows.ts:32`).
  - A row whose counterpart has no identity is dropped (`participantMessageRows.ts:24-25`).
- Scope guardrail confirmed: UC-001…004 are in scope. Out of scope: Team/Org view changes, sending from the view, search, release. Preserved: Team/Org rows, 492's rules, existing log lines.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (AR-001 → REQ-002/003/004, AC-002/003; AR-002 → REQ-004/005, AC-003 "once"; AR-003 → Principles 12/14/16 for REQ-002/005).
- Remaining material ambiguity: AR-004 (the outcome for old unlinked cross-node lines).
- Statements about existing code the design relies on, opened at their cited lines: all match, except that DS-002's list of publishing commits includes `commitSentToRun`, which does not publish today and must not (AR-002).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | AR-005 resolved: `getInspection` returns null for an application-owned run, so it has no view |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Contract | Pass | Pass | Pass | Confirmed | Stored read: `MessageViewScope.participantFilter` + `CounterpartIdentities` |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | AR-001 resolved (`parties` on the event); AR-002 resolved (publishing commits named) |
| BEH-005 | Contract | Pass | Pass | Pass | Confirmed | AR-004 resolved (DEC-002/AC-006 corrected, founder informed) |
| BEH-006 | Contract | Pass | Pass | Pass | Confirmed | § Paging Order: one total order for the page, the cursor and the web sort |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | § Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | Two view rules (feed `inViewOf`, read filter); no node on unlinked lines | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `relation` + `MessageViewScope` replace `publishToViews` and both copies of the rule | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ownership Map, File Responsibility Mapping, removal plan; sequence step 1 pins Team/Org outcomes first | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Stored read, paged | Pass | Pass | Pass (resolver parses, reader owns) | Pass | Pass | Pass | Pass |
| DS-002 | Local message live | Pass | Pass | N/A | Pass | Pass | Pass | Pass (round 2: one publication, at `deliver` or the receiver's `acceptFromRun`; the event carries `parties`; `append(message, parties)`) |
| DS-003 | Cross-node live | Pass | Pass | N/A | Pass | Pass | Pass | Pass (round 2: each node's own commit publishes to its own chain; the remote party comes from the request or answer and `peerName`/`senderNodeName`, with no lookup) |
| DS-004 | Messages entry | Pass | Pass | N/A | Pass | Pass | Pass | Pass (round 2: application-owned runs traced) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `MessageViewScope` | Pass | Pass | Pass | Pass | The feed and the reader both call it; nothing else decides in-view |
| `ParticipantMessagesReader` | Pass | Pass | Pass | Pass | The resolver only parses arguments |
| Root port `publishMessage` | Pass | Pass | Pass | Pass | Publishing commits named |
| Web participant store | Pass | Pass | Pass | Pass | Names an unknown counterpart from `parties` on `append` |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Feed → `MessageViewScope` ← reader | Pass | Pass | Pass | Pass | — |
| `ParticipantMessagesReader` / `CounterpartIdentities` → `RunRecordsSource`, scope, tree, delegated-run agents, `peerName`, run metadata | Pass | Pass | Pass | Pass | Passed in from `collaboration-composition.ts` (§ File Responsibility Mapping, Collaborators) |

Composition root / Principle 16: `Pass`. The new owners receive their collaborators from the composition. The resolver reaches the reader through a process instance set by the composition, as `setProcessTaskDelegationToolService` (`task-delegation-tool-service.ts:35`) does. The design states the three conditions: it is set before the server listens, a missing one throws, and it hides no cycle.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| GraphQL `collaborationParticipantMessages(…, before?)` → `{messages, counterparts, hasMore}` | Pass | Pass | Pass | Low | Pass |
| Line field `counterpart {address, nodeId}` | Pass | Pass | Pass | Low | Pass |
| `RootCommunicationPort.publishMessage({message, relation, parties, senderRun, receiverRun})` | Pass | Pass | Pass | Low | Pass |
| Stream message event `{message, parties}`, `Party {agentRunId, address, nodeName}` | Pass | Pass | Pass | Low | Pass |
| Remote `sender.address` / answer `receiverAddress` | Pass | Pass | Pass | Low | Pass (DESIGN.md rule 9: one release) |
| Web view `hasMore()`, `loadMore()`, identity kinds `run`, `remote` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| In-view rule | Pass | Pass | Pass | Pass | Extracted from the feed and the read |
| Paging | Pass | Pass | N/A | Pass | 50 rows, "Load more" |
| Peer name | Pass | Pass | N/A | Pass | `RemoteRunChannel.peerName` (`remote-run-channel.ts:120`; the design cites `:107`, which is off by a few lines) and `RemoteRunLinks.deliver`'s `peerName` (`remote-run-links.ts:159`) |
| Live naming of a new counterpart | Pass | Pass | N/A | Pass | `parties` known at the commit; no reload on append |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/delegation/` (scope, feed) | Pass | Pass | Pass | Pass | — |
| `run-history/services/` (reader, identities) | Pass | Pass | Pass | Pass | Beside `run-view-messages.ts` |
| Engine / CrossRun / remote messaging / gateway / client | Pass | Pass | Pass | Pass | — |
| Contracts package; web store, panels, phone | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| In-view rule (feed + read) | Pass | Pass | Pass | Pass | One `MessageViewScope` |
| Page order (server page, cursor, web sort) | Pass | N/A | Pass | Pass | § Paging Order |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CollaborationCommunicationMessage` + `counterpart?` | Pass | Pass | Pass | N/A | Pass | Stored. `parties` is live only (not stored), so the two do not overlap: `counterpart` names the other side in the stored line; `parties` names both sides in the event |
| `relation` union | Pass | Pass | Pass | N/A | Pass | Replaces `publishToViews` |
| DTO `counterparts` (`past` folded in) | Pass | Pass | Pass | Pass | Pass | — |

Derived consumers of a changed structure: `Pass`. Vocabulary (Principle 15): `Pass` ("party" for a side of a live event, "counterpart" for the other side; both are defined).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New: `message-view-scope.ts`, `participant-messages-reader.ts`, `counterpart-identities.ts` | Pass | Pass | N/A | Pass | — |
| Changed server, contracts, web, i18n files | Pass | Pass | N/A | Pass | § File Responsibility Mapping |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/delegation/message-view-scope.ts` | Pass | Pass | Low | Pass | — |
| `run-history/services/participant-messages-reader.ts`, `counterpart-identities.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `publishToViews` (4 sites) | Pass | Pass | Pass | Pass | — |
| `RunMessagesFeed.inViewOf` | Pass | Pass | Pass | Pass | — |
| Filter in `collaboration-participant-messages.ts:81-88` | Pass | Pass | Pass | Pass | — |
| `hasDelegatedRuns` gate; `MEMBER_KINDS`-only `showMessages` | Pass | Pass | Pass | Pass | — |
| `pastParticipants` DTO field (folded into `counterparts`) | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| View rule; peer fields; old log lines | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Message log lines + `counterpart?` | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | The current reader and both released readers ignore unknown keys (verified with `git show` at `v1.5.13`, `v1.5.14-beta.3`); old lines are unchanged |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Six steps; step 1 pins today's Team/Org outcomes | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Entry forms (7 rows) + parties on events + fallback identity | Yes | Pass | N/A | Pass | — |
| Page, cursor and live merge | Yes | Pass | N/A | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A live message from a counterpart the loaded list does not know

- Related approved requirement: REQ-004 / AC-003 ("Both rows appear without reload, once"), REQ-002 / REQ-003 (every message, with identity).
- Relevant behavior ID(s): BEH-004.
- Initiating basis kind: `User` / `System`.
- Trigger: the founder's PM has Messages open. For the first time, the Linux PM (unlinked remote, form 6) or another local PM (form 4) sends it a message — the founder's own example of success.
- Forward path (target design):
  1. The PM's root runs `acceptFromRemote` (or `acceptFromRun`, unrelated).
  2. `port.publishMessage({relation})` → the feed → `MessageViewScope` admits the PM's own view.
  3. The web `applyEvent` → participant store `append` → rows built by `participantMessageRows`, which calls `identityOf(counterpart)`.
  4. The counterpart is not held by the view (not in its tree), not a past participant, and not in the loaded page's `counterparts`, so `identityOf` returns `null` and the row is dropped (`participantMessageRows.ts:24-25`).
  5. `reloadNamingUnknown` runs only on a view rebuild or a tree change (`collaborationParticipantMessages.ts:118-127`), not on an append.
- Consequence: the live row never appears until a reload. The founder's success case and AC-003 fail for forms 4–6.
- Reachability: `Reachable`.
- Review consequence: AR-001.

### `MP-002` — A local cross-run message published at both commits

- Related approved requirement: REQ-004 / AC-003 ("once"), REQ-005 ("no message … doubled").
- Trigger: the PM messages an unrelated local PM (form 4) with Messages open on both.
- Forward path (DS-002 as written): the receiver's `acceptFromRun` publishes to both runs' chains (`run-messages-feed.ts:26-35`), and `commitSentToRun` is also listed as a publishing commit, so the sender's root publishes the same message ID again.
- Consequence: two stream events per message, and each view's `lastMessageChangeSequence` moves twice. The web merges rows by ID, so the row is not doubled, but the one-publication invariant the feed documents is broken, and the stream position the participant store follows (`advance`) counts a second event.
- Reachability: `Reachable` as DS-002 is written.
- Review consequence: AR-002.

MP-001 and MP-002 (round 1) are now handled: the live event carries `parties`, and `commitSentToRun` never publishes.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` (round 2). The upstream behavior basis is confirmed, the design is ready for implementation, and no in-scope machinery or finding depends on an unsupported material premise.

## Findings

None open. AR-001 … AR-005 are resolved (see ARCH-REV-002 in the revision record).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer (primary). Solution Designer (informational).

## Residual Risks

These are for implementation and validation; none blocks.

- Citation nit: `RemoteRunChannel.peerName` is at `remote-run-channel.ts:120`, not `:107`.
- Team/Org live rows: `append` now names an unknown counterpart from `parties` (for example, a run that left the tree when its Task closed). The row is the one a reload shows today, so REQ-006 holds. Step 1's tests should cover it.
- Live and stored must agree: a live row named from `parties` and the same row after a reload (named by `CounterpartIdentities`) should give the same identity. Test forms 4–6 both ways.
- The server reads the whole log for each page (measure on the 2,500-message fixture; DESIGN.md phase 2).
- A task agent run is an Agent root, so its own view now shows its unrelated and remote messages too; mention this in the docs.
- Two-node behavior (form 6 and the chip) stays unverified until the two-server E2E runs (UNK-001).

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-002)
- Material-Premise Gate: `Pass`. MP-001 and MP-002 are handled.
- Notes: `task_size=Large`, `architectural_risk=High`. The package is ready for implementation at SR-004 (`71c85a0381`).
