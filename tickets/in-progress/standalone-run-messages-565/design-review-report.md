# Design Review Report — standalone-run-messages-565 (autobyteus-565)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/standalone-run-messages-565/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `tickets/in-progress/standalone-run-messages-565/investigation-notes.md`
- Upstream Solution Revision Record: `tickets/in-progress/standalone-run-messages-565/solution-revision-record.md` (SR-001 … SR-003)
- Reviewed Design Spec: `tickets/in-progress/standalone-run-messages-565/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts Reviewed: None (the Task screenshot is user evidence, not a behavior supplement); `handoff-architecture-review.md`; `follow-ups.md` (none)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `tickets/in-progress/standalone-run-messages-565/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff "Architecture Design Complete", `Large`/`High`, 2026-11-20
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565`, branch `codex/standalone-run-messages-565` at `9a18bcd873`; all code read at the committed base `a728fbcad3` with `git show`. Files opened:
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

- Overall Basis Status: `Confirmed`, with one contradiction between the requirements and the design (AR-004).
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
| BEH-001 | User | Pass | Pass | Fail | Needs Correction | AR-005 (application-owned exclusion not traced) |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Contract | Pass | Pass | Pass | Confirmed | Stored read: `MessageViewScope.participantFilter` + `CounterpartIdentities` |
| BEH-004 | Contract | Pass | Pass | Fail | Needs Correction | AR-001 (live row of a new counterpart is dropped), AR-002 (double publication) |
| BEH-005 | Contract | Fail | Pass | Pass | Needs Correction | AR-004 (DEC-002's outcome for old lines differs) |
| BEH-006 | Contract | Pass | Pass | Pass | Confirmed | Order matches the web's sort; see Residual Risks for the tie-break |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | § Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | Two view rules (feed `inViewOf`, read filter); no node on unlinked lines | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `relation` + `MessageViewScope` replace `publishToViews` and both copies of the rule | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ownership Map, removal plan, sequence step 1 pins Team/Org outcomes first | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Stored read, paged | Pass | Pass | Pass (resolver parses, reader owns) | Pass | Pass | Pass | Pass |
| DS-002 | Local message live | Pass | Pass | N/A | Pass | Fail | Pass | Fail: AR-002 (`commitSentToRun` listed as a publishing commit); AR-001 (the spine ends at `participant store.append`, and the identity a new counterpart's row needs is not on it) |
| DS-003 | Cross-node live | Pass | Pass | N/A | Pass | Fail | Pass | Fail: AR-001 (a live remote row from a counterpart not in the loaded page has no identity, so it is dropped) |
| DS-004 | Messages entry | Pass | Pass | N/A | Pass | Pass | Pass | Pass (AR-005: one kind untraced) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `MessageViewScope` | Pass | Pass | Pass | Pass | "Nothing else decides in-view": the feed and the reader both call it |
| `ParticipantMessagesReader` | Pass | Pass | Pass | Pass | The resolver only parses |
| Root port `publishMessage` | Pass | Pass | Pass | Pass | One call per publishing commit, but see AR-002 for which commits |
| Web participant store | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Feed → `MessageViewScope` ← reader | Pass | Pass | Pass | Pass | — |
| `ParticipantMessagesReader` / `CounterpartIdentities` → run records, delegated-run agents, `RemoteRunChannel.peerName` | Fail | Pass | Pass | Fail | AR-003: how the new owners obtain these collaborators is not stated. Today's resolver body reaches `getStudioDelegatedRunAgents()`, `getTeamCommunicationProjectionService()` and `AgentOrgRunManager.getInstance()` process-wide, and the new peer-name dependency has no stated source |

Composition root / Principle 16: `Fail`, through AR-003 only. The new owners' collaborators are not named; no new lookup is shown either.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| GraphQL `collaborationParticipantMessages(…, before?)` → `{messages, counterparts, hasMore}` | Pass | Pass | Pass | Low | Pass |
| Line field `counterpart {address, nodeId}` | Pass | Pass | Pass | Low | Pass |
| `RootCommunicationPort.publishMessage({message, relation, senderRun, receiverRun})` | Pass | Pass | Pass | Low | Pass |
| Remote `sender.address` / answer `receiverAddress` | Pass | Pass | Pass | Low | Pass (DESIGN.md rule 9: one release) |
| Web view `hasMore()`, `loadMore()`, identity kinds `run`, `remote` | Pass | Pass | Fail | Medium | Fail (AR-001: the source of a live row's identity is not defined) |

Empty indirection check: `Pass`. `MessageViewScope` is the one owner of a rule now copied in two places; `CounterpartIdentities` combines several sources.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| In-view rule | Pass | Pass | Pass | Pass | Extracted from the feed and the read |
| Paging | Pass | Pass | N/A | Pass | 50 rows, "Load more", as the conversation's earlier pages and the Work Journal |
| Peer name | Pass | Pass | N/A | Pass | `RemoteRunChannel.peerName` (`remote-run-channel.ts:120`) |
| Unknown-counterpart naming on the web | Fail | Fail | N/A | Fail | AR-001: `reloadNamingUnknown`/`namesUnknownAgent` exist, but they run only on a view rebuild or a tree change, not on a live append |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/delegation/` (`MessageViewScope`, feed) | Pass | Pass | Pass | Pass | — |
| Participant read (reader, identities) | Fail | Pass | Pass | Fail | AR-003: no folder or file is given |
| Engine / CrossRun / remote messaging | Pass | Pass | Pass | Pass | — |
| Web store, panels, phone | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| In-view rule (feed + read) | Pass | Pass | Pass | Pass | One `MessageViewScope` |
| Page cursor and order (server page, web sort) | Pass | N/A | Pass | Pass | Residual: one tie-break for both |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CollaborationCommunicationMessage` + `counterpart?` | Pass | Pass | Pass | N/A | Pass | Written only for counterparts outside the tree |
| `relation` union | Pass | Pass | Pass | N/A | Pass | Replaces the `publishToViews` boolean |
| DTO `counterparts` (`past` folded in) | Pass | Pass | Pass | Pass | Pass | — |

Derived consumers of a changed structure: `Pass` (§ Change Scope table: reader, validators, Team/Org stores, peer readers).

Vocabulary (Principle 15): `Pass`. "Own messages", "counterpart", "counterpart record" and "relation" are defined. "Standalone host" in `participantFilter` means the Agent root's own agent, which a task agent run also is; this is consistent with the live rule ("X is an Agent root").

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/delegation/message-view-scope.ts` (new) | Pass | Pass | N/A | Pass | — |
| `ParticipantMessagesReader`, `CounterpartIdentities` (new) | Fail | Pass | N/A | Fail | AR-003: no file paths |
| Changed files (engine, ports, CrossRun, remote send/receive, client/gateway, contracts DTO, web store/view/panels/phone, i18n) | Fail | Pass | N/A | Fail | AR-003: the design has no file responsibility mapping. Changed files are named only through cited lines |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `message-view-scope.ts` | Pass | Pass | Low | Pass | — |
| Reader and identities (moved out of `api/graphql/types/collaboration-participant-messages.ts`) | Fail | N/A | Medium | Fail | AR-003; `run-history/services/run-view-messages.ts` is a candidate home beside `composeRunViewMessages` |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `publishToViews` (4 sites) | Pass | Pass | Pass | Pass | All sites match the code at base |
| `RunMessagesFeed.inViewOf` | Pass | Pass | Pass | Pass | — |
| Filter in `collaboration-participant-messages.ts:81-88` | Pass | Pass | Pass | Pass | — |
| `hasDelegatedRuns` gate (and the getter if unused) | Pass | Pass | Pass | Pass | — |
| `MEMBER_KINDS`-only `showMessages` | Pass | Pass | Pass | Pass | — |
| `pastParticipants` DTO field (folded into `counterparts`) | Pass | Pass | Pass | Pass | Web `pastParticipantsOf` / `pastIdentityOf` follow it; implementation lists them |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| View rule | No | Pass | Pass | `publishToViews` is not kept beside `relation` |
| Peer fields | No | Pass | Pass | Rule 9 |
| Old log lines | No | Pass | Pass | The read derives what it can; no dual write |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Message log lines + `counterpart?` | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | The current reader and both released readers ignore unknown keys (verified with `git show` at `v1.5.13`, `v1.5.14-beta.3`), so a rollback reads new lines. Old lines are unchanged. A migration is rejected with a reason: it cannot be derived for unlinked remote lines |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Six steps; step 1 pins today's Team/Org outcomes live and stored before the change | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Entry forms for a standalone host (7 rows) | Yes | Fail | N/A | Fail | The "Identity" column gives the stored identity only; for forms 4–6 it does not say how a live row of a new counterpart is named (AR-001). Form 6 "old: run ID" conflicts with DEC-002 (AR-004) |
| Page and live merge | Yes | Pass | N/A | Pass | — |

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

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| DEC-002 says old unlinked cross-node lines show "the run ID and another node"; the design shows the run ID without a chip | An approved user outcome differs between the requirements and the design; AC-006 tests "per DEC-002" | AR-004 | Open |

## Review Decision

`Fail`.

## Findings

### AR-001 — A live row whose counterpart the loaded list does not know is dropped

- Type: `Design Impact`; severity: High.
- Protects: REQ-004 / AC-003; REQ-002 / REQ-003 / AC-002 (every message, with identity); the founder's success case (a message from the Linux PM appears without a reload).
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Problem:
  - The identities of `run` and `remote` counterparts come only from the stored read's `counterparts`.
  - A live message from a counterpart outside the tree and outside the loaded page has no identity, and `participantMessageRows` drops rows without one.
  - The existing reload that names unknown agents does not run on an append.
  - The same gap hides an older row whenever the reader returns no identity for its counterpart (form 6 old lines, deleted runs). Without an explicit fallback identity, REQ-002's "every message" fails for those rows too.
- Evidence: MP-001; `participantMessageRows.ts:24-25`; `collaborationParticipantMessages.ts:35-40, 118-127`.
- Required update: state on DS-002/DS-003 who names a live row's counterpart, and the order. Two possible shapes (the designer chooses):
  - (a) The committing root's event carries the line's counterpart record, and the peer name is resolved on the server.
  - (b) The store's `append` starts the list's existing reload when the appended message names an unknown agent (reuse `namesUnknownAgent`), and the row shows with a run-ID identity meanwhile.
  - Also state that the reader returns an identity for every counterpart on a page (at least `run` with its run ID), so no stored row is dropped. Add the live identity to forms 4–6 in the entry-form table.
- Why proportionate: one ownership decision and one fallback; no new store.
- Recipient: Solution Designer.

### AR-002 — DS-002 lists `commitSentToRun` as a publishing commit

- Type: `Design Impact`; severity: Medium.
- Protects: REQ-004 / AC-003 ("once"), REQ-005; preserved feed invariant: one publication per message, at the receiver's commit (`run-messages-feed.ts` class comment).
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Problem: DS-002 reads `engine.deliver | acceptFromRun({relation}) | commitSentToRun → port.publishMessage(...)`. The receiver's commit already fans out to both runs' chains, so a second publication at the sender's commit doubles the stream events (MP-002). The Ownership Map's engine line ("every publishing commit, including `commitSentToRemote` and `acceptFromRemote`") does not say which local commits publish.
- Required update: name the publishing commits explicitly:
  - same-root `deliver`;
  - the receiver's `acceptFromRun` (any relation), which fans out to both chains;
  - for remote, each node's own commit (`commitSentToRemote`, `acceptFromRemote`) to its own run's chain;
  - never `commitSentToRun`.
  - Correct DS-002 and add a test asserting one event per local cross-run message per view.
- Recipient: Solution Designer.

### AR-003 — No file mapping, placement or collaborator wiring for the new reader and identities

- Type: `Design Impact`; severity: Medium.
- Protects: REQ-002, REQ-005 (the read DS-001 serves); Principles 12, 14 and 16.
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Problem:
  - The design has no file responsibility mapping for a change across server, contracts and web. `ParticipantMessagesReader` and `CounterpartIdentities` have no path; today the body lives in a GraphQL type file.
  - Their collaborators are not stated: run records per root kind, delegated-run agents, `RemoteRunChannel.peerName`. Today's body reaches them through process-wide getters (`getStudioDelegatedRunAgents()`, `getTeamCommunicationProjectionService()`, `AgentOrgRunManager.getInstance()`), and the new peer-name dependency has no source.
  - An implementer has to invent the placement and the wiring, and a code reviewer has no target to compare the code with.
- Required update:
  - Add a file mapping: new files with paths, and the changed files per area (engine, ports, CrossRun, remote send/receive, client/gateway, contracts DTO, web store/view/panels/phone, i18n, docs).
  - Place the reader and identities, for example beside `composeRunViewMessages` in `run-history/services/`.
  - State how they get their collaborators: passed in from the composition root (the resolver gets the reader), or which existing getters stay as they are under Principle 16's conditions.
- Recipient: Solution Designer.

### AR-004 — Old unlinked cross-node lines: the design's outcome differs from the founder's DEC-002

- Type: `Requirement Gap`; severity: Low (5 messages on the founder's PM).
- Protects: DEC-002, REQ-003, AC-006.
- Scope status: `Requirement Gap — User Approval Required` (DEC-002 is the founder's decision).
- Problem: DEC-002 (founder-approved) says older unlinked cross-node messages show "the run ID and 'another node'". The design shows the run ID without a chip, because such a line cannot be told from a line of a deleted local run (§ Persisted Data, note). The requirements doc and AC-006 still say "per DEC-002". The evidence is sound; but the approved outcome has to change in the requirements with the founder's approval (or at least his knowledge, recorded), not only in the design and the revision record.
- Required update: update DEC-002/AC-006 to the feasible outcome and record the founder's answer. Until then, the design's outcome is not authoritative.
- Recipient: Solution Designer.

### AR-005 — REQ-001's exclusion of application-owned runs is not traced

- Type: `Design Impact`; severity: Low.
- Protects: REQ-001 ("not application-owned"); Principle 1 (each kind traced).
- Problem: DS-004 removes the `hasDelegatedRuns` gate and shows Messages for every selected standalone run (`syncRun` attaches for any selected `agent` run except `temp-` IDs). The design does not say where an application-owned run is excluded: whether such runs never reach the workspace selection, or the view refuses them.
- Required update: one line in DS-004 with the evidence for where the exclusion holds, and a test if it is a new check.
- Recipient: Solution Designer.

## Classification

`Design Impact` (AR-001, AR-002, AR-003, AR-005) and `Requirement Gap` (AR-004). Route: Solution Designer.

## Recommended Recipient

Solution Designer.

## Residual Risks

- Page order: the web sorts by `createdAt` descending, then `messageId` ascending (`participantMessageRows.ts:32`). The server's page and its cursor `{createdAt, messageId}` must use the same total order, or rows that share a millisecond can be skipped or repeated at a page boundary. State one order for both.
- The server still reads the whole log (and the open subtree's logs) for each page; the design measures and defers optimization (DESIGN.md phase 2).
- A task agent run is also an Agent root, so its own view now shows its unrelated and remote messages too. This is consistent with the rule; mention it in the docs.
- Two-node behavior (form 6 and the chip) stays unverified until the two-server E2E runs (UNK-001).

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass`. MP-001 and MP-002 are reachable, each with a forward witness.
- Notes: The core shape is sound: one `MessageViewScope` for live and stored, `relation` in place of the 492 flag, the `counterpart` line field with a verified rollback, and shared paging. The findings concern the live identity of new counterparts (High), which commits publish, the missing file mapping and wiring, the DEC-002 wording, and one untraced kind.
