# Design Review Report — Remote Discovery (autobyteus-261)

## Review Round Meta

- Upstream Requirements Doc: `…/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `…/investigation-notes.md` (E-01 … E-12)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001 … SR-003)
- Reviewed Design Spec: `…/design-spec.md` at commit `3024a61dce` (SR-003)
- Supplemental Task Artifacts Reviewed: the contract `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-12); `follow-ups.md`
- Relevant Solution Revision IDs: SR-001 … SR-003
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: `Architecture Design Complete` (SR-003)
- Prior Review Round Reviewed: N/A (first review of this package)
- Latest Authoritative Round: 1
- Current-State Evidence Basis: code read in the worktree at `3024a61dce` (base `8fbe77c461`):
  - `api/security/remote-access-route-policy.ts:71` (`/rest/remote/` prefix: the new routes are covered with no policy change);
  - `agent-collaboration/collaborators/collaborator-candidate-policy.ts:101-210` (`listEligible`; `isApplicationBound` → empty);
  - `collaborator-admission.ts:104` (`catalogDefinitionAt` → `null` for application-bound ports);
  - `node-catalog-port.ts:11`;
  - `agent-collaboration/execution/remote/remote-delegation.ts:41-80` (`delegationPlacement`: no application-bound gate);
  - `agent-team-execution/domain/root-team-run.ts:325`, `agent-org-execution/domain/agent-org-run.ts:102-113` (roots call `RemoteDelegation.delegate`);
  - `team-run-collaborators.ts:15`, `agent-org-run-collaborators.ts:30` (`isApplicationBound` from `applicationBinding`);
  - the investigation's E-04 / E-06 claims.

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-discovery/tickets/in-progress/remote-discovery`

## Routing Classification Review

- Task size: `Medium`; architectural risk: `High`
- Classification rationale reviewed: yes. Two new request kinds between nodes and a changed refusal field. A node's catalog becomes readable by registered peers. Approved agent-facing texts change. No persistence and no root changes.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood:
  - `list_available_nodes` (opt-in) gives `{name, status}`;
  - `list_available_agents {node}` gives a peer's offer, exactly what a delegation there accepts, with only name, kind, address and description;
  - the switch is required; nothing is cached;
  - Team-correct texts; `target {kind, name}`.
- Relevant existing behavior and evidence confirmed: yes. E-04 is verified: `listEligible(nodeCatalogPort)` and `catalogDefinitionAt(nodeCatalogPort, …)` share the policy and the address map. E-06 is verified: a new kind behind `PeerGateway.admit` and `PeerClient.call` inherits every node-state answer.
- Scope guardrail confirmed: yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none).
- Remaining material ambiguity: none.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-401 list nodes | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-402 list a peer's offer | Contract | Pass | Pass | Pass | Confirmed | FU-001 (pre-existing, outside this ticket) |
| BEH-402 preserved (local list) | Contract | Pass | Pass | Pass | Confirmed | DEC-405's one shape change is approved |
| BEH-404 Team-correct texts | Contract | Pass | Pass | Pass | Confirmed | — |

## The Four Points The Handoff Asks About

1. **The remote listing bypasses the roots: sound.**
   - What a peer offers is a node-level fact. On B it is `listEligible(NodeCatalogPort)`, which depends on nothing about the asking run.
   - On A, the only sender-dependent gates of a remote delegation are this node's switch and the peer lookup. Both are in `RemoteNodeDiscovery` (`RemoteDelegation.delegationPlacement` has no other gate, `remote-delegation.ts:41-56`).
   - Routing the listing through the three roots' delivery services would add the same pure forwarding three times. That is principle 13's empty indirection, and the design rightly avoids it.
   - The tool still requires a collaboration context for its exposure, as today.
   - One adjacent point is pre-existing, not caused by this design. Application-owned Team and Org runs get an empty local list and are refused local catalog delegation (`isApplicationBound`). Their members can nevertheless delegate to a peer's catalog, because `RemoteDelegation` has no such gate, and now they can list it too. Discovery is consistent with remote delegation, which is what REQ-402 asks. Whether application-owned runs should reach peers at all is a policy question for the user: FU-001.
2. **The new port beside `RemoteRunChannel`: sound.**
   - `RemoteDiscoveryChannel` is a separate subject: read-only queries about peers, with no run, link or Task.
   - It follows the established inversion: the port is owned by `agent-collaboration`, implemented by `remote-collaboration`, and bound by the composition.
   - Extending `RemoteRunChannel` instead would mix a run-scoped delivery port with node-level queries (principle 10).
3. **Every non-accepted outcome maps to `unavailable`: sound.**
   - `available` means "it answers and admits this node's requests now". That is exactly a passed `PeerGateway.admit` (identity, switch, registration), the same preconditions a delegation has.
   - Collapsing the rest is the user's direction (DEC-402). The reason stays worded in one place: `list_available_agents` with that node returns the same refusal a delegation would.
   - A 404 from an older build is `unavailable`, consistent with rule 9.
   - Bounded fan-out (20 s per peer, in parallel) meets QR-401.
4. **The one entry builder: sound.** One owner of the entry shape for the local list, B's answer and A's result, ready for 260 to take over. The only local effect, dropping an empty `description`, is approved (DEC-405). See N-401 for one guard.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose Clear? | Linked? | Complete? | Consistent? | Status Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `collaboration_model.md` CM-12 | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | § Task Design Health Assessment | — |
| Root cause explicit and evidence-backed | Pass | `No Design Issue Found`: the gateway, the client and the eligibility policy absorb the feature (E-04, E-06, verified) | — |
| Refactor decision explicit | Pass | No refactor; the root bypass is explained | — |
| Supported by concrete sections | Pass | Ownership, dependency rules, interfaces | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative? | Facade Vs Owner? | Naming? | Ownership? | Off-Spine? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 list nodes | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 list a peer's offer | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 kind-correct refusal | Return | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 gateway admission | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary | Entry Clear? | Internals Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `PeerGateway` (two more kinds through `admit`) | Pass | Pass | Pass | Pass | One inbound entry kept (REQ-114 of 191) |
| `PeerClient` (two more calls through `call`) | Pass | Pass | Pass | Pass | One outbound transport |
| `RemoteDiscoveryChannel` → `RemoteNodeDiscovery` | Pass | Pass | Pass | Pass | Tools never reach `PeerClient` or `PeerDirectory` (forbidden, explicit) |
| `CollaboratorCandidatePolicy` | Pass | Pass | Pass | Pass | `RemoteCatalogLister` reads definitions only through it |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools` → `agent-collaboration`; `remote-collaboration` → `agent-collaboration`; `compositions` → both | Pass | Pass | Pass | Pass | Slice 1's direction kept |

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `list_available_nodes` (no arguments) | Pass | Pass | Pass | Low | Pass |
| `list_available_agents {node?}` | Pass | Pass | Pass | Low | Pass (one optional selector with one meaning: which node's offer) |
| `RemoteDiscoveryChannel.listNodes` / `listAvailableAgents(node)` | Pass | Pass | Pass | Low | Pass |
| `POST /rest/remote/availability`, `/available-agents` | Pass | Pass | Pass | Low | Pass (two kinds, not one generic query) |
| Refusal `target?: {kind, name}` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Admission, transport, eligibility, texts, tool exposure | Pass | Pass | N/A | Pass | All reused |
| Route policy | Pass | Pass | N/A | Pass | `/rest/remote/` prefix already covers the new routes (`remote-access-route-policy.ts:71`) |
| `RemoteNodeDiscovery`, `RemoteCatalogLister` | Pass | Pass | Pass | Pass | Each owns one new concern |

## Subsystem / Capability-Area Allocation Verdict

| Area | Clear? | Sound? | Supports Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remote-collaboration/discovery/` (new folder) | Pass | Pass | Pass | Pass | The asking-node owner |
| `remote-collaboration/inbound/remote-catalog-lister.ts` | Pass | Pass | Pass | Pass | Beside the other inbound handlers |
| `agent-collaboration/collaborators/available-collaborator-entry.ts` | Pass | Pass | Pass | Pass | Next to the eligibility owner |

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AvailableCollaboratorEntry` builder | Pass | Pass | Pass | Pass | N-401 |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning? | Redundant Removed? | Overlap Controlled? | Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AvailableNode {name, status}` | Pass | Pass | Pass | N/A | Pass | — |
| `AvailableCollaboratorEntry {name, kind, address, description?}` | Pass | Pass | Pass | N/A | Pass | — |
| `target {kind, name}` replacing `targetName` | Pass | Pass | Pass | N/A | Pass | Clean cut |

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All rows of § Final File Responsibility Mapping | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Clear? | Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New files | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `targetName`; the per-entry mapping in `listAvailableAgentsFor` | Pass | Pass | Pass | Pass | Dead-code check at implementation |

## Legacy / Backward-Compatibility Verdict

| Area | Wrapper / Dual Path? | Clean Cut? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `targetName` → `target`; no "older version" detection | No | Pass | Pass | Rule 9 |

## Persisted-Data Transition Verdict

N/A: no persisted data changes (REQ-407; nothing stored).

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1 … 6 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool answers, the delegation that follows, old and new texts | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

### `MP-401` — An application-owned run's member lists a peer's offer

- Initiating basis: `User` / `System`. A member of a Team or Org run with an `applicationBinding` has `list_available_agents` (opt-in) and the switch is on.
- Path: the tool with `node` → `RemoteDiscoveryChannel` (no root, so no `isApplicationBound` gate) → the peer's offer. Locally the same member gets an empty list (`collaborator-candidate-policy.ts:110`). Its `delegate_task` with `node` already reaches the peer's catalog: `RemoteDelegation.delegationPlacement` has no application-bound gate.
- Reachability: `Reachable`, and **pre-existing** for delegation (191/245). This design makes discovery consistent with it.
- Consequence: no defect against this ticket's approved behavior (REQ-402: "exactly what a delegation to that node accepts"). The open question is whether application-owned runs should reach peers at all. That is a product policy question → FU-001, not a finding here.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The design is small, owner-aligned and well evidenced. Each of the four points the handoff raises holds up against the code.

## Findings

None.

### Notes (non-blocking)

- N-401: the entry builder shapes both the agent-facing entry and B's wire answer. That is fine under rule 9. A must still read the wire strictly (REQ-403: no extra fields; the design already says "A reads the answer strictly"). So `PeerClient`'s parser, not the builder, decides what is accepted from a peer, and a later 260 change to the builder cannot widen what a peer may send. Add one unit case: an answer with an extra field (for example `members`) is refused as malformed.
- N-402: `RemoteNodeDiscovery` lists peers "in `peers.json` order", and the port comment says "registration order". Keep one wording; `PeerDirectory.list()` order is the owner.

## Follow-ups

- FU-001 (recorded in `follow-ups.md`): application-owned Team and Org runs can delegate to, and now list, a peer's catalog, although they are excluded from the local catalog. This is pre-existing (191/245). Decide with the user whether `isApplicationBound` should also gate remote delegation and discovery.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

- RSK-401: the catalog's names, kinds, addresses and descriptions are readable by any registered peer, and identity is claimed, not proven, until S6. Accepted.
- RSK-402: `list_available_nodes` can take up to 20 s with a black-holing peer. Accepted (QR-102 of 191).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-401 reachable, pre-existing, routed to FU-001)
- Notes: classification `Medium` / `High` confirmed. Design at commit `3024a61dce` (SR-003).
