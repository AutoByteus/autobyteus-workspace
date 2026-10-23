# Design Review Report — one-nodes-tab

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/requirements-doc.md` (Approved, SR-006; SR-007 changed no requirement)
- Upstream Investigation Notes: `.../one-nodes-tab/investigation-notes.md`
- Upstream Solution Revision Record: `.../one-nodes-tab/solution-revision-record.md` (SR-001 … SR-007)
- Reviewed Design Spec: `.../one-nodes-tab/design-spec.md` (SR-007, status `Ready`)
- Supplemental Task Artifacts Reviewed: the Product Team's approved package `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md` + VIS-001…031; `ui-sketch.md` (superseded); `follow-ups.md`; `handoff-architecture-review.md` (round 3 section)
- Relevant Solution Revision IDs: `SR-006`, `SR-007`
- Architecture Review Revision Record: `.../one-nodes-tab/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: Solution Designer round-3 handoff (SR-007), 2026-10-23
- Prior Review Round Reviewed: 2 (`ARCH-REV-002`, Fail, AR-007 … AR-010)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: the round-1 and round-2 code reads (worktree `ca1f09e52a`, unchanged since). Round 3 rechecked the canonical artifact text only, because SR-007 changes design text, not the current-state basis.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: three subsystems; GraphQL contract change; persisted desktop registry shape change; two-node write coordination with partial-failure semantics. Unchanged.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved requirements / intended behavior understood: as round 2 (SR-006, the Product package's requirement impacts, DEC-709 (b)). No requirement changed at SR-007.
- Relevant existing behavior and evidence confirmed: Yes.
- Scope guardrail confirmed: Yes; unchanged.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (none remain).
- Remaining material ambiguity: none.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-703 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-701/702 | User | Pass | Pass | Pass (AR-008 resolved) | Confirmed | — |
| BEH-704 | User | Pass | Pass | Pass (AR-007, AR-009 resolved) | Confirmed | — |
| BEH-705 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-706 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-707 | User | Pass | Pass | Pass | Confirmed | — |

## Prior Findings Recheck (detail in ARCH-REV-003)

| Finding | Status | Verified in |
| --- | --- | --- |
| AR-001 … AR-006 | Resolved (ARCH-REV-002) | Unchanged text still holds |
| AR-007 | Resolved | Design § Run Rules defines one rule per plan kind. `remove` continues to `removeFromList` and reports a failed `removeThere` with the spec's copy (UXJ-706). `connect`/`finish` stop; `disconnect` continues; `rename` and `changeAddress` stop. The DS-003 spine and narrative refer to it, and the Guidance lists the connector test. |
| AR-008 | Resolved | DS-002 narrative: on submit, the typed address is checked against every row's window address whatever the node's state, and the node ID is checked when the probe answers. A Guidance test is listed. |
| AR-009 | Resolved | DS-004: the window reads B's `peers` for every row it can reach. That gives the address B uses for this node and "registered only by the other node"; `peerNodeAvailability` is unchanged. A Guidance test is listed. |
| AR-010 | Resolved | Requirements Document Status: baseline SR-006, the Product package as the UI basis, the sketch as history, both approval references; Readiness "Product design integrated: Yes". Design: baseline line, the `resolvePeerAddress` row ("decided at SR-006"), Key Tradeoffs, the DS-003 write paths, `NodeChangeStep` (+`resolveHere`/`resolveThere`/`renameInList`), plan kinds (+`finish`, `rename`), Guidance (the spec's states). A grep finds no remaining "pending the user", "Recommended (b)", "(bound API)" or "sketch's states". |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Product `ui-ux-spec.md` + VIS-001…031 | Pass | Pass | Pass | Pass | Pass | — |
| `ui-sketch.md` | Pass | Pass | Pass | Pass | Pass | Superseded and stated as such in the requirements, the design and the inventory |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `Larger Requirement` | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Boundary Or Ownership Issue`; `NodeManager.vue` 381 lines inline | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Projection store, connector, the spec's component set, removal plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary: one list | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Primary: add | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Primary: connect / finish / disconnect / remove / rename / change address | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Return: direction states | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Bounded local: resolver | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `PeerDirectory` | Pass | Pass | Pass | Pass | Only writer of `peers.json` |
| `PeerAddressResolver` | Pass | Pass | Pass | Pass | — |
| `RemoteNodeDiscovery` (offer, availability) | Pass | Pass | Pass | Pass | Resolver never calls `PeerClient` directly |
| This node's peers / switch (`remoteCollaborationStore`, capability store) | Pass | Pass | Pass | Pass | One write path; forbidden shortcut explicit |
| `nodeListStore` | Pass | Pass | Pass | Pass | — |
| `nodeCollaborationConnector` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server `remote-collaboration` | Pass | Pass | Pass | Pass | No web/Electron imports; port types free of UI fields |
| Web connector | Pass | Pass | Pass | Pass | — |
| Window → other node | Pass | Pass | Pass | Pass | Offers never asked directly; no "register my caller" endpoint |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `addPeerNode({nodeId, name, baseUrl})` | Pass | Pass | Pass | Low | Pass |
| `changePeerAddress(nodeId, baseUrl)` (switch on) | Pass | Pass | Pass | Low | Pass |
| `resolvePeerAddress(nodeId, baseUrls)` (switch on) | Pass | Pass | Pass | Low | Pass |
| `peerAddressCandidates` | Pass | Pass | Pass | Low | Pass |
| `peerNodeAvailability(nodeId)` | Pass | Pass | Pass | Low | Pass |
| `peerNodeOffer(nodeId)` + `unreachableReason` | Pass | Pass | Pass | Low | Pass |
| Registry change `identify` (set or replace) | Pass | Pass | Pass | Medium (two IDs, explicitly named) | Pass |
| `connector.plan(kind,row)` / `run(plan)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Identity, own addresses, offers, switch, offer UI | Pass | Pass | N/A | Pass | — |
| Other-node GraphQL client, container check, transport classifier | Pass | Pass | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server `remote-collaboration`, `server-addressing`, Electron registry, web stores/services/components/utils | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Transport reason, plan/step types, error text | Pass | Pass | Pass | Pass | `NodeChangeStep` complete |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `NodeRow`, `NodeProfile`, settings error extensions | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server files | Pass | Pass | Pass | Pass | — |
| Web stores, connector, API, client, utils | Pass | Pass | Pass | Pass | Watch the 500-line limit in `nodeListStore` |
| Components (spec's set) | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/settings/nodes/`, `services/nodeCollaboration/`, `settings/peer-address-resolver.ts`, `server-addressing/runs-in-container.ts`, `localization/messages/*/nodesPage.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tab, card, peer section, `CurrentWindowNodeCard` | Pass | Pass | Pass | Pass | Grep-verified |
| `addRemoteNode`'s `openNodeWindow` | Pass | Pass | Pass | Pass | Only caller replaced |
| Probe utilities and fields, `AddPeerNodeInput {baseUrl,name}`, dead keys | Pass | Pass | Pass | Pass | Also update `types/__tests__/node.spec.ts` and the server two-server E2E `addPeerNode` calls |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `addPeerNode` input, `?nodeTab` alias, registry probe fields, this-node writes | No | Pass | Pass | DESIGN.md rule 9 respected |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `node-registry.v1.json` / `localStorage` | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Projection reader verified; absent ID truthful; `identify` replace rule; same-ID entries rule |
| `peers.json` | `Not Affected` | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server → registry → web data → web UI → removal → validation (two real servers, one in Docker) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Per-caller address, plan with B off, name collision, partial failure, join, derived name, loopback hint, run rules per kind | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

P-001 … P-005 were each found `Reachable` and drove AR-002, AR-003, AR-004, AR-007 and AR-008. All are resolved; the records are kept in ARCH-REV-001 and ARCH-REV-002. No in-scope machinery depends on an unsupported premise. No new premise this round.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- **`Pass`**: the behavior basis is confirmed, and AR-001 … AR-010 are all resolved in the canonical artifacts. The design is ready for implementation.

## Findings

None open.

Implementation note, not a finding: the Guidance bullet "Rename" lists the desktop entry first, while § Run Rules makes `rename` run `renameHere` (peer) then `renameInList` and stop on failure. Follow § Run Rules, so a refused peer name leaves both names unchanged (VIS-010).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

- RSK-701: unauthenticated settings writes on B, accepted under RSK-401 until the security slice. The confirmation states it.
- RSK-702: a black-holed candidate before the match can delay resolution up to 20 s. FU-002 would reduce it.
- RSK-703: partial connect plans stay visible, with no rollback (REQ-705).
- The Product risk: a node that only another node can address looks unreachable to this window. It is mapped: a peer-only row's dot comes from this node's server, and shows "Off on this node" while this node's switch is off.
- Window requests to other nodes' GraphQL (identity probes; B's peers) run while this node's switch is off. This matches TR-701 and the window-vs-server distinction.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: Classification Large / High confirmed. Code review is expected downstream for Large/High.
