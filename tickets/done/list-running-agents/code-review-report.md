# Code Review Report — list-running-agents (autobyteus-492)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/list-running-agents/requirements-doc.md` (Approved; SR-006 baseline, SR-008 DEC-014)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited sections only)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-009)
- Supplemental Task Artifacts Reviewed As Context: None (none exist)
- Relevant Solution Revision IDs: SR-006 … SR-009
- Design Review Report Reviewed As Context: `design-review-report.md` (round 4, worktree copy with the reviewer's uncommitted edits)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (worktree copy)
- Relevant Architecture Review Revision IDs: ARCH-REV-003, ARCH-REV-004
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): `a4848a8441..5f89ecbdf5` changes 3 files only: the cross-node branch of `_admit` in the contract model (CR-001) and two comments (CR-002). No production logic, interface or data shape changed, so round 1's structural checks and scores carry forward except the rows these findings held down.
- Trigger: implementation engineer's IR-002 (fix `5f89ecbdf5`, documents `7e7e184787`); round 1 was IR-001 (`deacacf948`, base `origin/personal` `bd2053ee51`)
- Prior Review Round Reviewed: 1 (CRR-001)
- Latest Authoritative Round: 2
- Coverage Investigation / Execution Coverage / API-E2E records: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. 51 changed server source files across collaboration, communication, three root kinds, remote collaboration, tools/MCP and compositions; two new peer routes; the message contract (CM-5, CM-11, CM-13) changed.

## Review Scope

- Changed implementation and behavior reviewed: the whole `bd2053ee51..deacacf948` diff of `autobyteus-server-ts/src` (51 files), the changed unit tests, the contract fixture and its generator model (`tickets/done/delegated-copies-outlive-delegator-461/evidence/collaboration-model/{model.py,stories.py}`), and the four changed module and design docs.
- Files / areas reviewed: `agent-collaboration/running/*`; `communication/cross-run-message-delivery.ts`, `cross-run-accept-input.ts`; `execution/communication/root-communication-engine.ts`; `execution/remote/{remote-endpoint,remote-message-send,remote-run-links,remote-run-channel,remote-refusal-codes,peer-discovery-channel}.ts`; `execution/services/active-collaboration-root-directory.ts`; `agent-communication/services/*` (router, parser, dispatcher, contract); the three roots and their message deliveries; `remote-collaboration/{channel,inbound,discovery,domain}`; `run-history/store/run-own-agents-reader.ts`; `agent-tools/agent-discovery/list-running-agents-*`, the MCP provider and exposure; the four compositions and `running-agents-composition.ts`.
- Explicit exclusions: E2E suites (API/E2E's, listed in the handoff); `typecheck-baseline.json` (generated); ticket documents.

Checks: round 1 did not rerun IMP-01 … IMP-07 (no code changed after them); it ran one probe of its own for CR-001, `/tmp/cr492/probe_row13.py` against the updated model. Round 2 reran that probe and `export_contract_states.py … --check` against `5f89ecbdf5` (results under CR-001), and read IMP-08 (`evidence/IMP-08-row13-probe.{py,log}`).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. The run ID is the address (DEC-001, DEC-002). An unrelated message reaches only a running agent and wakes nothing (DEC-003). Task wake, reopen and CLOSED are preserved, including the fenced peer run for every sender on the node that holds the Task (DEC-011). A team is reached through its coordinator (DEC-012). Unrelated messages stay out of run views (DEC-014). The list holds running Agent and Team roots a person started (DEC-004, DEC-013).
- Design-spec behavior map verified against the implementation: Yes, every spine DS-001 … DS-006 and entry-form rows 1–14 (below).
- Design review report and round confirmed: ARCH-REV-004 Pass. AR-008 (resolveActive) is implemented in `compositions/collaboration-root-resolver.ts:28-32, 82-88`.
- Behavior-basis status: `Confirmed`.
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-002 | Confirmed | `RunningAgentsListing.list` (`running-agents-listing.ts:34-71`): live roots minus Org and caller; `listingFactsOf` (`run-own-agents-reader.ts:139-152`), `startedByPerson = !delegatedFrom` (local and peer); entry agent must be non-offline; entry builder `running-agent-entry.ts:49-54`. Peer: `PeerNodeDiscovery.listRunningAgents` → `PeerClient.runningAgents` (strict `runningAgentsOf`) → `PeerGateway.listRunningAgents` (admit first). IMP-06 AC-001/AC-004 | — |
| BEH-003 | Confirmed | `CrossRunMessageDelivery.route` → `admit` returns `unrelated` (`:197-220`) → `deliverUnrelated` (`:153-164`): `RunningAgents.rootOf` → `activeReceiverRoot` (`resolveActive`, never restores) → prepare/accept(`publishToViews: false`)/commit. PRB-002 green in IMP-06 | — |
| BEH-004 | Confirmed | Router `deliverToPeer` (`global-agent-run-message-router.ts:188-205`): `findPeer` → `closedPeerRunRefusal` → root `deliverToPeerRun` → `RemoteMessageSend.sendToPeerRun`/`choose` (`remote-message-send.ts:40-53`) → `/rest/remote/run-messages` → `RemoteMessageReceiver.acceptRunMessage` (`remote-message-receiver.ts:385-401`) → root `acceptPeerRunMessage` (in-gate liveness) → `engine.acceptFromRemote` | — |
| BEH-005 | Confirmed | `admit` unchanged for related/reopened/closed; `closedPeerRunRefusal` (`:141-147`) called from the router's `node` path and `route`'s peer-run branch (`:106-108`); the linking root's own `assertDeliveryAllowed` still fences linked and unlinked sends (`prepareRemoteSend`). The contract model agrees since round 2 (CR-001 resolved) | — |
| BEH-006 | Confirmed | Local: router `:116-119`; peer: `acceptRunMessage` → `RunningAgents.teamCoordinatorOf` (team's own root only); A's wording `remote-refusals.ts` `TARGET_IS_TEAM_RUN` | — |
| BEH-007 | Confirmed | Every new path ends in `commitReserved` (engine), the reservation path | — |
| BEH-008 | Confirmed | `delegate_task` not touched | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry | Shape | Forward Path | Expected Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001/002 | BEH-002; AC-001…004 | Contract | Agent with the tool | See what runs here / on a peer | `list_running_agents` | Normal | DS-001, DS-002 | Live user-started roots, strict peer answer | REQ-001…007, founder | Supported Normal | Use |
| SCN-003 | BEH-003; AC-005 | Contract | PM root | Message another root | `send_message_to(run ID)` | Normal | DS-003 | Delivered both ways, both logs, no run view | PRB-002, DEC-001 | Supported Normal | Use |
| SCN-004 | BEH-004; AC-006 | Contract | Any agent on A | Message a running agent on B | `send_message_to(node, run ID)` | Normal | DS-004/005 | Delivered; reply with `node` | DEC-001/002/007 | Supported Normal | Use |
| SCN-005 | BEH-005; AC-007 | Contract | Any agent | Message a stopped run | `send_message_to` | Explicit Edge | router → not running | Refused, not woken | DEC-003 | Supported Explicit Edge | Use |
| SCN-006 | BEH-005; AC-008, rows 13/14 | Contract | Task agent / another agent of A | Message a running agent outside its Task; a fenced peer run | `send_message_to` | Normal / Explicit Edge | DS-003; `closedPeerRunRefusal` | Delivered; fenced peer run: CLOSED for every sender on A | REQ-011, DEC-011, AR-001, AR-007 | Supported | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The updated contract model delivers a message from a non-delegator agent of node A to A's fenced run on B | SCN-006, row 13; REQ-011, DEC-011, CM-13 | M closes T7 (S19); another agent of A (`solution_designer_65a9`) messages `lead_0c11` | `model.py:323-327`: the cross-node branch returns `"unrelated"` for any sender other than the delegator before reading A's closed entry (`:328-330`) → delivered while it runs. The code refuses CLOSED (`closedPeerRunRefusal`, tested). The executable authority of the collaboration contract (header of `export_contract_states.py`; `collaboration-contract-stories.e2e.test.ts:15-18`) now contradicts the approved rule, the code and `collaboration_model.md` CM-13 | Probe output: `solution_designer_65a9 -> DELIVERED … lead_0c11 on node "node-b"`; M → CLOSED | Promote | This ticket (the change edited the model) | CR-001 |
| C-02 | Comments still say the Task-scope refusal covers "a different Task" | Approved contract CM-13 (no such refusal) | — | `root-communication-engine.ts:127` (touched file), `root-message-append.ts:14`: the comments describe the removed rule and mislead the next reader of the refusal path | grep | Promote | This ticket (the change made them false) | CR-002 |
| C-03 | Process binding `bindProcessRunningAgentsListing` (deviation 2) | Principle 16; design § Dependency Rules | — | Bound in `composeCollaboration` before any run starts; `getProcessRunningAgentsListing` throws when missing; no cycle (the listing has no tool-side dependency); tool definitions are created without a composition, the same as `findProcessPeerDiscoveryChannel` | `running-agents-listing.ts:74-91`, `collaboration-composition.ts:270-271` | Reject (deviation reason holds) | — | — |
| C-04 | `RunningAgents`/listing created in a new `running-agents-composition.ts` (deviation 1) | Principle 16 (one composition root) | — | Remote collaboration is composed before `composeCollaboration` (`build-studio-server.ts:303-322`); one instance passed to both; order visible in the host | diff | Reject (reason holds) | — | — |
| C-05 | `allowsSender` kept; endpoint union split (deviations 3, 6) | Removal plan | — | `RemoteMessageSend.choose` reads it; `LinkedRemoteEndpoint` keeps `unlinked_run` out of `RemoteRunLinks` by type | `remote-message-send.ts:49-52`, `remote-run-links.ts` | Reject (reason holds) | — | — |
| C-06 | The per-kind status selection (`pairedAgents` per kind, a second `AgentOrgAgentStatuses`) is written in both `running-agents-composition.ts` and `collaboration-composition.ts` | Principle 11/13 | — | Both select the same stateless owners; no rule, nothing to drift but a one-line wiring choice | `running-agents-composition.ts:28-33`, `collaboration-composition.ts:205-207` | Reject (wiring, not a policy) | — | — |
| C-07 | Race between the running check and the reservation (local unrelated has no in-gate re-check) | MP-003 | — | Design records it as not a supported scenario | design § Risks; ARCH-REV MP-003 | Reject | — | — |
| C-08 | `teamCoordinatorOf?.()` optional call on a resolved Team boundary | Principle 16 | — | The optional member is the existing boundary type's; a Team root implements it; `null` means "not a team here", which is the rule | `active-collaboration-root-directory.ts` | Reject | — | — |
| C-09 | The collaboration contract's executable model lives in an archived ticket's evidence folder, so every contract change edits a done ticket | Maintainability | — | Pre-existing placement; this change only follows it (deviation 10) | `export_contract_states.py:1-10` | Promote | Follow-up | FU-004 |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | CONFLICT branch, R-9 and the outbound pair refusal replaced, not wrapped | — |
| Matches approved behavior-defining supplemental artifacts | Pass | None exist | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-006 match the code paths in the basis table | — |
| Ownership boundary preservation and clarity | Pass | `RunningAgents` the one "running" owner (deviation 3 gives the listing one boundary); roots reached via `deliverToPeerRun`/`acceptPeerRunMessage` | — |
| Off-spine concern clarity | Pass | Strict reader, run-file facts, catalog/Project lookups each owned | — |
| Existing capability reuse | Pass | `PairedAgentAccess`, `findPeer`, `PeerDiscoveryChannel`, `RunOwnAgentsReader`, engine reused | — |
| Reusable owned structures | Pass | One `RunningAgentEntry` + builder + field set used by builder, wire and reader | — |
| Shared-structure tightness | Pass | Entry is a `kind` union; `publishToViews` one boolean | — |
| Repeated coordination ownership | Pass | Endpoint choice in `RemoteMessageSend.choose` only; closed-peer rule one method, two callers | — |
| Empty indirection | Pass | `RunningAgents` combines two owners for three consumers; `RemotePeerRunRoot` is a narrowed type | — |
| Separation of concerns / file responsibility | Pass | New `running/` folder, three small files | — |
| Ownership-driven dependency | Pass | router → collaboration only; remote-collaboration → collaboration ports | — |
| Visible dependencies (P16) | Pass — deviation recorded, reason holds | Handoff deviation 2; C-03 | — |
| Authoritative Boundary Rule | Pass | No caller reads the directory and `pairedAgentStatuses` together for "running" | — |
| File placement | Pass | — | — |
| Flat-vs-over-split | Pass | — | — |
| Interface/API boundary clarity | Pass | `/run-messages` vs `/messages` split by subject; `node` only with run ID | — |
| Naming / one vocabulary | Pass | `unlinked_run`, `run_message`, entry IDs as `delegate_task`'s; CR-002 resolved in round 2 | — |
| No unjustified duplication | Pass | Three roots' one-call delivery methods follow the existing per-root pattern | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files | Pass | `ownershipChain`, `refusals`, `notPermitted`, `OTHER_TASK_REFUSAL`, CONFLICT in the engine removed; no remnant in `src` | — |
| Test scenarios and assertions requirement-aligned | Pass | IMP-06 drives real roots, router, client, gateway, receiver; old CONFLICT/R-9 tests rewritten | — |
| Test fixtures/helpers reusable, structure coherent | Pass | — | — |
| No stale/compatibility-only tests in changed scope | Pass (unit) | Stale E2E assertions listed for API/E2E in the handoff | API/E2E updates them |
| API/E2E readiness | Pass | Two-server scenarios and stale E2E lines listed | — |

## Source File Size And Structure Audit

All changed source files stay under 500 non-empty lines; no file grows by more than 220 lines.

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain/root-team-run.ts` | 445 | 454 | Pass | Pass | Pass | Pass | — | — |
| `compositions/build-studio-server.ts` | 435 | 441 | Pass | Pass | Pass | Pass | — | — |
| `remote-collaboration/channel/peer-client.ts` | 403 | 424 | Pass | Pass | Pass | Pass | — | — |
| `agent-collaboration/communication/cross-run-message-delivery.ts` | 164 | 216 | Pass | Pass | Pass | Pass | — | — |
| `remote-collaboration/channel/peer-gateway.ts` | 267 | 299 | Pass | Pass | Pass | Pass | — | — |
| New files (`running/*`, tool, MCP provider, answer reader, composition) | — | ≤ 91 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No version handling for peers (DESIGN.md rule 9) |
| No legacy old-behavior retention | Pass | CONFLICT path removed, not bypassed |
| Dead code removed in touched files | Pass | See checks |
| Persisted-data decision followed | Pass | `Not Affected`; existing message-log shape |
| No dual reads/writes or old-shape fallback | Pass | — |
| Transition mechanics | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None (CR-002's stale comments are corrected in round 2).

## Docs-Impact Verdict

- Docs impact: `Yes` (done in this change)
- Why: CM-13 and § 1 terms in `collaboration_model.md`; `agent_communication.md`, `agent_tools.md`, `remote_collaboration.md` updated. CM-13 and the executable model now both state row 13 (CR-001 resolved).
- Files or areas likely affected: none outstanding.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | Code: `closedPeerRunRefusal` on the `node` path |
| MP-002 | Confirmed | `RunningAgents.teamCoordinatorOf` from the team's own root (unit test) |
| MP-003 | Confirmed (not supported) | — |
| MP-004 | Confirmed | Code: `route`'s peer-run branch; the model agrees since round 2 (CR-001 resolved) |

No new premises.

## Review Scorecard (Mandatory)

- Overall score: 9.4/10 (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | Each spine maps to one call chain; unlinked endpoint is data, one owner of the send order | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | One "running" owner; roots reached through their boundaries; closed-peer rule one method | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Linked vs unlinked routes split by subject; `LinkedRemoteEndpoint` typing; `node` rules explicit | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | New `running/` area; compositions show order | Per-kind status wiring written twice (C-06, wiring only) | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | One entry union, one field set for builder and strict reader | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Vocabulary consistent with CM-13 and `delegate_task`; CR-002's comments corrected | — | — |
| 7 | API/E2E Readiness | 9.3 | In-process two-node test; E2E work listed precisely | Two-server E2E pending (UNK-001) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Production code follows every entry-form row, tested; the contract model now refuses row 13 for every sender on the Task's node (CR-001 resolved, probe and IMP-08) | Two-node HTTP behavior still unverified (UNK-001, API/E2E's) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut; no version handling | — | — |
| 10 | Cleanup Completeness | 9.4 | Removal plan done and verified; no stale "different Task" wording left in `src` | — | — |

## Findings

No open findings. Both round-1 findings are resolved; see `code-review-revision-record.md` CRR-002.

### CR-001 — Resolved (round 2)

- Fix: `model.py:323-336` (`5f89ecbdf5`). The closed-entry list is read first. A sender other than the delegator, on the node that holds the Task (`a[0] == local[0]`), is refused `TASK_AGENT_RESOURCE_CLOSED` when that node's entries for the peer run exist and are all closed. Otherwise the message is "unrelated": an open entry, or a sender on the run's own node (row 14). The delegator's path is unchanged.
- Verification:
  - My probe after S19 now gives `solution_designer_65a9` → CLOSED and M → CLOSED.
  - IMP-08: four senders of A are DELIVERED after S18 (entry open) and CLOSED after S19.
  - `export_contract_states.py … --check`: "contract-states.json matches the model".
  - This matches `closedPeerRunRefusal` in the code and CM-13.

### CR-002 — Resolved (round 2)

- `root-communication-engine.ts:127` and `root-message-append.ts:14` now say a closed Task. A grep of `src` finds no comment that still names a "different Task" refusal.

## Follow-ups

- Follow-ups this review added: FU-004 (the contract's executable model lives in an archived ticket's evidence folder).

## Classification

- N/A: the review passes.

## Recommended Recipient

- API/E2E engineer (implementation review passed), the recipient `get_handoff_rules` returns for a pass; then the implementation engineer, informational.

## Residual Risks

- Two-node behavior over real HTTP stays unverified until the two-server E2E (UNK-001).
- E2E assertions still written for the old rule (listed in the handoff) must be rewritten by API/E2E before the ticket can pass.
- `workspace` sends a local path to a paired peer, by the founder's decision (DEC-013).
- The contract-story U9 timing (idle shutdown before the step) is API/E2E's to confirm.

## Latest Authoritative Result

- Review Decision: `Pass` (round 2, CRR-002)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10 overall; every category is at least 9.3.
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: the production code is unchanged since round 1 apart from two comments, and every recorded deviation's reason holds. API/E2E must also rewrite the stale E2E assertions the handoff lists, and run the two-server E2E (UNK-001). The model's inbound direction (a fenced run on B messaging a non-delegator of A) is not specified by the requirements, which cover senders on the Task's node only. It was not reviewed as a behavior.
