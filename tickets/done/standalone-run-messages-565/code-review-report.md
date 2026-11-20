# Code Review Report — standalone-run-messages-565 (autobyteus-565)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved SR-002; DEC-002 correction SR-004)
- Investigation Notes Reviewed As Context: cited sections only
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: None (none exist)
- Relevant Solution Revision IDs: SR-002 … SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (worktree copy, with the reviewer's uncommitted round-2 edits)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (worktree copy)
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: IR-001. Commits `56e39312b0` (pins), `ffec4d785d` (implementation), `143edb93f8` (integration test), `66f5e7b324` (documents). Branch `codex/standalone-run-messages-565`, base `origin/personal` `a728fbcad3`.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High`; Selected route: `Implementation Review`; Independent source review required: `Yes`.
- Classification evidence: confirmed. The change touches a persisted line field, the view rule shared by every root kind, an inter-node request/answer change, a shared query and the contracts package, across server, contracts and web (61 source files).

## Review Scope

- Changed implementation reviewed: every non-test, non-generated file of `a728fbcad3..143edb93f8`. That covers server (69 files in the diffstat with web and contracts), contracts `src`, web store/view/components/composables, and docs.
- Read in full: `message-view-scope.ts`, `message-publication.ts`, `run-messages-feed.ts`, `participant-messages-reader.ts`, `counterpart-identities.ts`, `run-records-source.ts`, the resolver, `collaborationParticipantMessages.ts` (web store), `participantMessageRows.ts`, `agentRunCollaborationContext.ts` messages view.
- Read as diffs: engine, ports, CrossRun, schema, remote endpoint, send, links, channel, peer client, gateway, receiver, composition, events and projectors, contracts DTOs, panel, phone view, tab composable, store gate.
- Compared against base: `inViewOf` (`run-messages-feed.ts`), `isPublicMessage` and the read filter (`collaboration-participant-messages.ts:66-95`).
- Explicit exclusions: tests, except where an assertion was needed (panel spec, store doc); the generated `graphql.ts`; contracts `dist/`; E2E and probe code (API/E2E's, listed in the handoff).
- Checks: I reran none. IMP-01 … IMP-11 ran at or after the final source state, and no code changed after them.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Every standalone run has Messages (DEC-001) listing all its own agent's messages (REQ-002/DEC-005). Rows carry identity and a node chip (DEC-002 with the SR-004 correction). Messages are live (REQ-004) and paged 50 newest first with Load more (DEC-004). Team/Org rows are unchanged (REQ-006), and new cross-node lines record their counterpart (REQ-007).
- Design-spec behavior map verified against the implementation: Yes (DS-001 … DS-004; entry forms 1–7).
- Design review report and round confirmed: ARCH-REV-002 Pass. Its residual notes are addressed in the code or the docs, or deliberately handled (Deviation 1, below).
- Behavior-basis status: `Confirmed`. Changed or newly discovered behavior: None. Remaining ambiguity: None.

| Behavior ID | Status | Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| BEH-001 | Confirmed | `MobileRunTargetView.vue` `showMessages = 'collaborationMessages' in target`; `runMessagesView` without the `hasDelegatedRuns` gate (`agentRunCollaborationStore.ts`). An application-owned run has no context (design AR-005), so no entry |
| BEH-002 | Confirmed | `useRightSideTabs.ts`: label "Messages" for `rootKind 'agent'`; default Activity |
| BEH-003 | Confirmed | `ParticipantMessagesReader.read` → `participantFilter` (`isOwnAgentList` → all; else base rule, identical to `isPublicMessage \|\| past`) → newest 50 after the cursor → `CounterpartIdentities.of` |
| BEH-004 | Confirmed | Publishing commits pass `relation` and parties: `deliver` (same_run), `acceptFromRun` (related/unrelated), `commitSentToRemote` and `acceptFromRemote` (remote). They go through `port.publishMessage` → `RunMessagesFeed.publish` → `MessageViewScope.inView` → `standaloneRootMessageEvent({message, parties})` → web `append(…, parties)`. `commitSentToRun` still never publishes (AR-002) |
| BEH-005 | Confirmed | `transmission(message, senderAddress)` → `sender.address` on both requests (gateway `senderRef`, nullable but required); answers carry `receiverAddress` (client reads it strictly); the engine writes `counterpart {address, nodeId}` on both sides; `encodeLine` writes it |
| BEH-006 | Confirmed | Server `participantMessageOrder` + strict cursor + `hasMore`; web `loadMore` (one at a time, generation-guarded), `mergeById`, buffered first load |
| REQ-006 | Confirmed | Live: for `same_run`/`related`, `inView` equals base `inViewOf`; `unrelated`/`remote` reach only an Agent root that is a side. Base published neither to any view. Stored: the non-own filter equals base. Team/Org events carry no parties. Rows are dropped for unnamed counterparts as before |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related | Kind | Actor | Goal | Entry | Shape | Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001/002 | BEH-001…003, 006 | User | Founder | Read a standalone run's history | Desktop tab / phone ⋮ | Normal | DS-004 → DS-001 | Newest 50, Load more, identities, chip | REQ-001…003, 005; founder | Supported Normal | Use |
| UC-003 | BEH-004 | User/System | Founder viewing; agents messaging | See a message live | Open Messages | Normal | DS-002/DS-003 | Row once, named | REQ-004 | Supported Normal | Use |
| UC-004 | BEH-005 | System | Two PMs on two nodes | Know the other agent and node | `send_message_to(node, …)` | Normal | DS-003 | Both lines recorded; chip | REQ-007, DEC-002 | Supported Normal | Use |
| PRES-1 | REQ-006 | User | Team/Org viewer | Same rows as before | Team/Org tab | Normal | feed + read | Unchanged rows, paged | REQ-006 | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Trigger | Path / Consequence | Evidence | Disposition | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `agentAddress` added to the shared `AgentOperationResult` (Deviation 4) | Principle 11; tool result contract | — | Set only on accepted message results; CrossRun strips it; the agent-facing `send_message_to` result is a strict whitelist (`send-message-to-tool-result-contract.ts:7-34`), so it never reaches an agent. It joins `agentRunId`/`displayName` (the accepting agent's identity) | grep of all readers | Reject (deviation reason holds) | — |
| C-02 | Process reader `get/setProcessParticipantMessagesReader` (Deviation 2) | Principle 16 | — | Set in `composeCollaboration` before the server listens; a missing reader throws; no cycle; the resolver is framework-created. The design itself named this choice | `participant-messages-reader.ts:96-108`; composition | Reject (reason holds; the design approved it) | — |
| C-03 | Parties only on the Agent root event; live names kept in `liveCounterparts`, own lists only (Deviation 1) | REQ-006 | — | Team/Org live rows keep base naming, so no row shows live that a reload hides. For an own list, a live-named counterpart makes `namesUnknownAgent` true, so the next tree change reloads that list's newest page from the server (an extra read, by design) | store `:69-92, :190-201` | Reject (reason holds) | — |
| C-04 | After any reload (`reloadRoot`, `reloadNamingUnknown`) a list holds its newest page again; older pages loaded earlier must be loaded again with Load more | REQ-005 ("every message stays reachable") | A Task closes while the user reads older pages | Messages stay reachable; documented in the store's doc comment; base reloaded the whole list | store `:105-111, :218-249` | Reject (no requirement broken; a paging consequence of DEC-004) | Noted under Residual Risks |
| C-05 | A recorded-after-durable-write refusal records the unrelated counterpart with `address: null`; as the newest record it would hide `run_metadata.json`'s name | AR-013 race | Receiver stops between its durable write and commit | Requires a narrow timing race; consequence is a run-ID label | `cross-run-message-delivery.ts:179-187`, identities precedence 2 | Reject (artificial timing; P6) | — |
| C-06 | A run with delegated runs now opens on Activity instead of its former "Team" tab (Deviation 8) | Design § Change Scope ("Default desktop tab: standalone runs: Activity") | — | Matches the design's explicit decision; REQ-006 covers Team/Org Messages, not a standalone run's former tab | `useRightSideTabs.ts:115-119` | Reject (follows the design) | Noted for the Solution Designer and delivery under Residual Risks |
| C-07 | Tab scope key `standalone:<rootRunId>` for every `rootKind 'agent'` (Deviation 8); phone Messages for task-agent targets (Deviation 9) | DEC-001; design removal row | — | Consistent with the desktop; keeps the chosen tab when selecting a delegated run | diff | Reject (follows design) | — |
| C-08 | `isPublicMessage` file removed; `pastParticipants` replaced by `counterparts` | Principle 7/8 | — | No remaining reader in `src` or web runtime code (grep); E2E/probe readers listed for API/E2E | grep | Reject (correct removal) | — |
| C-09 | A delegated agent run selected under its delegator uses key `(agent, R, R)`, an own list, so it shows R's unrelated and remote messages too | Design residual note; CM-13 docs | — | R's own Messages, read from R's log; the delegator's own list still holds only its own messages (non-goal kept) | `delegatedRunSubjects.ts:33-35`, `isOwnAgentList` | Reject (intended, documented) | — |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Three view-rule copies → `MessageViewScope`; `publishToViews` → `relation` | — |
| Matches approved behavior-defining supplements | Pass | None exist | — |
| Data-flow spine inventory | Pass | DS-001 … DS-004 match the code | — |
| Ownership boundary preservation | Pass | Scope owns in-view, live and stored; reader owns paging; identities own naming; resolver only parses | — |
| Off-spine concern clarity | Pass | `RunRecordsSource` moved unchanged; peer name via the channel | — |
| Existing capability reuse | Pass | `composeRunViewMessages`, `DelegatedRunAgentsReader`, `RemoteRunChannel.peerName`, `RemoteNodeChip` reused | — |
| Reusable owned structures | Pass | `MessagePublication`/`MessageParty` one file; `messageFields` keeps events to seven fields | — |
| Shared-structure tightness | Pass | Counterpart DTO is a `kind` union; the line record is two nullable fields | — |
| Repeated coordination ownership | Pass | One rule for feed and read | — |
| Empty indirection | Pass | No forwarding-only layer | — |
| Separation of concerns / file responsibility | Pass | — | — |
| Ownership-driven dependency | Pass | Reader in run-history depends on the collaboration scope type only | — |
| Visible dependencies (P16) | Pass — deviation recorded, reason holds | C-02 | — |
| Authoritative Boundary Rule | Pass | — | — |
| File placement | Pass | — | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | `before` cursor explicit; `counterparts` per kind; party shape explicit | — |
| Naming / one vocabulary | Pass | "Messages" for a standalone run; `counterpart`, `relation`, `parties` defined in the design and the docs | — |
| No unjustified duplication | Pass | Paging order is one function (server); the web sort mirrors it, as base did | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files | Pass | `inViewOf`, `isPublicMessage`, `publishToViews`, `hasDelegatedRuns`, `MEMBER_KINDS`, `pastParticipants` removed | — |
| Test scenarios requirement-aligned | Pass | Step-1 pins before the change; mutation IMP-08 fails 11 | — |
| Test fixtures/helpers reusable | Pass | `participantMessagesStub` pages like the server; `testViewStreams` uses the real scope | — |
| No stale tests in changed scope | Pass (unit) | E2E/probes listed for API/E2E | — |
| API/E2E readiness | Pass | Two-node scenarios and stale E2E lines listed | — |

## Source File Size And Structure Audit

All changed source files are under 500 non-empty lines. No file grows by 220 lines.

| Source File | Before | After | `>500` | `>220` Delta | Classification |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain/root-team-run.ts` | 457 | 457 | Pass | Pass | — |
| `remote-collaboration/channel/peer-client.ts` | 424 | 429 | Pass | Pass | — |
| `execution/communication/root-communication-engine.ts` | 369 | 407 | Pass | Pass | — |
| `CollaborationMessagesPanel.vue` | 335 | 365 | Pass | Pass | — |
| New files (scope, publication, reader, identities, records source) | — | ≤ 108 | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No version handling for peers (DESIGN.md rule 9) |
| No legacy retention | Pass | `publishToViews` replaced, not kept beside |
| Dead code removed in touched files | Pass | — |
| Persisted-data decision followed | Pass | `Directly Usable — No Migration`. Optional `counterpart` is read when present; old lines read as before; the released reader ignores the key |
| No dual reads/writes or old-shape fallback | Pass | Old lines derive names from the Task entry and run metadata. That reader policy is not an old-shape branch |
| Transition mechanics | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, already done: `collaboration_model.md` (CM-9, CM-13), `agent_communication.md`, `remote_collaboration.md`, web `chat.md`, `agent_execution_architecture.md`, `agent_artifacts.md`.

## Additional Material Premise Validation

| Premise ID | Current Status | Notes |
| --- | --- | --- |
| MP-001, MP-002 (architecture review) | Confirmed | No change |

No new premises; C-05 is rejected as a timing race.

## Review Scorecard (Mandatory)

- Overall score: 9.4/10 (simple average; not the decision rule)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Each publishing commit states relation and parties; one feed call per message | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One view rule for live and stored; reader/identities/records split by concern; resolver thin | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Cursor, counterparts union, party shape and wire fields explicit and strict | `AgentOperationResult` gains a message-specific optional field (C-01, reason holds) | — |
| 4 | Separation of Concerns and File Placement | 9.4 | New files where their owners live | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | `messageFields` keeps the log's record out of events; DTO unions per kind | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Clear vocabulary and docs | Long doc comments in the store | — |
| 7 | API/E2E Readiness | 9.3 | In-process both directions with real client/gateway/receiver; stale E2E/probe lines listed | Two-node HTTP unverified (UNK-001) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Team/Org outcomes pinned before the change and unchanged; own list complete live and stored; dedup by ID; paging ties handled | Reload drops loaded older pages (C-04, acceptable) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut on the wire and in the rule | — | — |
| 10 | Cleanup Completeness | 9.5 | All replaced rule copies and gates removed | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.

## Classification

- N/A (Pass).

## Recommended Recipient

- API/E2E engineer (primary), then the implementation engineer (informational).

## Residual Risks

- Two-node behavior over HTTP (forms 5 and 6, the chip, both lines' `counterpart`) is unverified until the two-server E2E (UNK-001).
- E2E and probe code still on the old wire/page shape (listed in the handoff) must be rewritten to the new shape by API/E2E, not loosened.
- A run that delegated used to open on its "Team" tab; it now opens on Activity, as the design decided (C-06). Worth naming in the release notes.
- After a reload of a root's context (a Task closing, a resume), a list shows its newest page again; older pages come back with Load more (C-04).
- An older peer breaks cross-node messaging both ways (DESIGN.md rule 9; one release).
- The server still reads the whole log per page; the measured first page is 6–9 ms for 2,500 messages.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10; every category ≥ 9.3.
- Recommended Recipient: API/E2E engineer
- Notes: the handoff's nine deviations hold. Of the five the engineer asked about: parties for own lists only (C-03), the process reader (C-02), `agentAddress` (C-01), `moreStatus()` (it gives a failed page its reason), and the tab key and Activity default (C-06, C-07).
