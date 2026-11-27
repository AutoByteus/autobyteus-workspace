# Design Review Report: autobyteus-581

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/sandbox-provider-relay-581/requirements-doc.md`. Approved by the user: REQ-001 to REQ-018, with DEC-110 to DEC-114. DEC-111 was revised to option B on 2026-11-26.
- Upstream Investigation Notes: `…/investigation-notes.md` (P-1 to P-14)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001 to SR-007)
- Reviewed Design Spec: `…/design-spec.md` (SR-007, status Ready)
- Supplemental Task Artifacts Reviewed: `handoff-architecture-review-round3.md`, `follow-ups.md` (FU-581-01 to 06), `history-484/*`
- Relevant Solution Revision IDs: SR-006, SR-007
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: Solution Designer handoff for round 3, 2026-11-26 (SR-007)
- Prior Review Round Reviewed: 2 (ARCH-REV-002, Fail: AR-007)
- Latest Authoritative Round: 3
- Current-State Evidence Basis:
  - **Base drift.** The worktree is at `9f803aa84d`. `origin/personal` is 20 commits ahead (autobyteus-652, web Memory page only), the same as in round 2. `git diff --stat` again shows no change under `autobyteus-server-ts/src`, `autobyteus-ts/src` or `autobyteus-web/electron`.
  - **Round 1 and 2 reads:** still valid.
  - **New read in this round:** `remote-collaboration/settings/peer-pairing-service.ts:60-160`. The invites are a map in memory (hash → expiry), and the exchange calls `savePairedPeer`. R-H's "the invite carries the role and the exchange saves it with the peer" fits this shape.

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Both are unchanged and still justified.
- Removing the sandbox route rule (DEC-111, option B) does not lower the risk. The cross-node credential route, login tokens, the container lifecycle and five runtime launch paths remain.
- Independent Architecture Review required: `Yes`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved requirements understood: Yes. Changes since round 2:
  - **DEC-111, revised to option B:** a sandbox is a normal paired peer. The user accepted the risk; FU-581-06 records it.
  - **REQ-017, AC-009 and AC-015:** rewritten to match.
  - **DEC-114:** any paired peer may use the relay. REQ-002 is unchanged.
- Scope guardrail: unchanged, plus FU-581-06, the restricted sandbox mode, which is out of scope.
- Every prospective blocking `Design Impact` finding traces to an approved ID: `Yes`. There are none.
- Remaining material ambiguity:
  - **The approved behavior:** none.
  - **Requirements text:** one stale phrase, N-3 (REQ-018 says a sandbox "cannot" reach the host's other runs).
- Statements about existing code: the round 1 and 2 checks stand. New in this round: invite storage and the exchange (`peer-pairing-service.ts:67-141`). **True.**

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | User (agent) | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | Contract | Pass | Pass | Pass | Confirmed | A normal peer plus the lifecycle mark (C11) |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| history-484/* | Pass | Pass | Pass | Pass | Pass | — |
| probes/* | Pass | Pass | Pass | Pass (the inventory now lists P-14) | Pass | — |
| follow-ups.md (FU-581-01 to 06) | Pass | Pass | Pass | Pass | Pass | — |

Stale text in the core documents (non-blocking, N-3). The DEC-111 revision left traces of option A:
- design line 54 still says "P-1 to P-13";
- the naming check still lists `SANDBOX_PEER_ROUTE_REFUSED`;
- Dependency Rules still say that `SandboxManager` receives "the peer directory (role write)", although the exchange now writes the role;
- the macOS row of § Platforms still says "C11 applies";
- REQ-018 still lists "the host's other runs" among what a sandbox cannot do. Under option B that is false.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present | Pass | design-spec § Task Design Health Assessment | — |
| Root cause is evidence-backed | Pass | Static `providerRelayId`, the singletons, the one-relay holder | — |
| Refactor decision is explicit | Pass | Three items | — |
| Reflected in the design sections | Pass | Consumer table, C3, removal plan | — |

## Data Contract Verdict

| Record / Message | Each Field Has A Meaning, A Writer And A Reader? | Identities, Relationships And Lifecycle Are Explicit? | Each In-Scope Flow Walked, With An Example Per Case? | Checked Against Existing Data And Real Dependencies? | Layers Above Follow It Without Mappings Or Second Copies? | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| C1 to C10 | Pass | Pass | Pass | Pass (P-1 to P-14) | Pass | Pass. Unchanged since round 2, except: C4 gains a row for any other unmarked status (N-1 resolved), and C7 an extended refusal list (R-G resolved) |
| C11 `role: "sandbox"` (lifecycle mark) | Pass. The writer is the pairing exchange, from the role stored with the invite in memory. The readers are the start sweep and the Nodes page | Pass. It is saved atomically with the peer and removed with it | Pass ("pairing with role"; "sandbox answers its delegator, with a file") | Pass (`peer-pairing-service.ts`, `peer-store.ts`) | Pass. One gap in the derived-consumer list (N-4) | Pass |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | Pass | Pass | Pass. Native goes through `routeForNativeProvider` (N-2 resolved) | Pass | Pass |
| DS-002 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Primary | Pass | Pass | Pass | Pass | Pass. The role is set inside pairing | Pass | Pass |
| DS-005 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

DS-007 is removed together with the rule it described (DEC-111, option B).

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProviderRelayAccess` | Pass | Pass | Pass | Pass | — |
| `ProviderRelayPeerHandler` | Pass | Pass | Pass | Pass | — |
| `SandboxManager` | Pass | Pass | Pass | Pass | — |
| `PeerPairingService` (invite with role) | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Launch owners → `ProviderRelayAccess` | Pass | Pass | Pass | Pass | — |
| Singletons → read-only `isRelayed` + slot | Pass | Pass | Pass | Pass. The deviation is recorded and its reason holds | — |
| `SandboxManager` → `PeerPairingService` (invite with role) | Pass | Pass | Pass | Pass | Remove the stale "peer directory (role write)" (N-3) |

Composition root / Principle 16: `Pass`.

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `routeFor(runtimeKind)`, never `autobyteus` | Pass | Pass | Pass | Low | Pass |
| `routeForNativeProvider(provider)` | Pass | Pass | Pass | Low | Pass |
| `prepareForRun`, `prepareForNode`, `statusOf`, `isRelayed` | Pass | Pass | Pass | Low | Pass |
| `PeerRelayClient.relay` | Pass | Pass | Pass | Low | Pass |
| `PeerPairingService.createInvite({ role })` | Pass | Pass | Pass | Low | Pass |
| `SandboxManager.create/runIn/destroy` | Pass | Pass | Pass | Low | Pass |

Empty-indirection check: `Pass`.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Relay owner, forwarder, signing | Pass | Pass | N/A | Pass | — |
| Sandbox answers to its delegator | Pass | Pass (the existing peer routes and link checks, unchanged) | N/A | Pass | — |
| Pairing with a lifecycle mark | Pass | Pass (extends the invite) | N/A | Pass | — |
| Docker | Pass | Pass | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `credential-proxy/*`, `remote-collaboration/*`, `sandboxes`, `agent-tools/sandboxes`, autobyteus-ts, Electron, `autobyteus-skills` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Credential source per runtime | Pass | Pass | Pass | Pass | — |

## Shared Structure Tightness Verdict

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunPassHolder`, `ProviderRelay`, C1 | Pass | Pass | Pass | Pass | Pass | — |
| `StoredPeer.role` | Pass | Pass | Pass | — | Pass | — |

Derived consumers listed with a decision: `Pass`, with note N-4. The Nodes page label needs `role` on `PeerNode` (`peer-directory.ts:21`, `toPeerNode`), on the API that lists peers, and on the web Nodes page component. The file mapping lists none of these.

One vocabulary: `Pass`. "Sandbox peer" now means only a normal peer with a lifecycle mark.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches The Intended Owner? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All mapped files | Pass | Pass | N/A | Pass | N-4 adds the Nodes-page chain |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All mapped paths | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant Piece Named? | Replacement Clear? | Removal Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| The relay pieces (holder field, profile field, single route and consumer, forwarder token, Claude vault branch, fixed URLs) | Pass | Pass | Pass | Pass | — |
| Pieces never built (`ProviderRelayRouting`, egress, the SR-006 C11 rules) | Pass | N/A | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| All | No | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| New files, vault ID, settings | Not Affected | Pass | Pass | N/A | Pass | — |
| `peers.json` gains an optional `role` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1 to 8 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Example Was Needed? | Example Is Present And Clear? | Bad Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Mixed C1; reply origin; one relay owner; tool payloads; pairing with role | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

- **MP-001** (a sandbox agent starts host runs over the peer channel): `Reachable`. The user accepted it as product behavior under DEC-111 (option B), so it drives no finding. FU-581-06 records it.
- **MP-002, MP-003:** served (C1, C4).
- **MP-004** (files from a sandbox): served. The files take the normal peer path, with no special rule (option B).
- No new premise.

## Unresolved Approved-Behavior Or Current-State Gaps

None. N-3 is stale text, not an open behavior.

## Review Decision

**Pass.**

## Findings

None blocking.

- **AR-007: Obsolete.** The user's DEC-111 revision (option B) removed the rule the finding was about.

Non-blocking notes for implementation. They need no further review round:

- **N-3, stale option-A text.**
  - **REQ-018:** the phrase "what a sandbox cannot do (… the host's other runs)" is superseded by DEC-111 (option B). The `autobyteus-sandboxes` skill must **not** claim that a sandbox cannot reach the host's other runs. It may say that a sandbox is a normal peer of its host.
  - **design-spec:** fix line 54 ("P-1 to P-13"), the naming check (`SANDBOX_PEER_ROUTE_REFUSED`), the Dependency Rules ("peer directory (role write)") and § Platforms ("C11 applies"). Implementation follows C11 as written: there is no route rule.
- **N-4, the Nodes page label chain.** Carry `role` through `PeerNode` / `toPeerNode` (`peer-directory.ts:21`), through the peer list the web reads, and into the Nodes page component, so that AC-015 ("the host's Nodes page labels the peer as a sandbox") holds.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`). The Solution Designer gets an informational notification.

## Residual Risks

- **Accepted by the user:**
  - **DEC-111 (option B):** an evaluated agent can start or message host agents. FU-581-06 records it.
  - **DEC-114:** any paired peer may use the relay node's credentials. C5 logs each call.
  - **DEC-110:** full network; FU-581-05 records it.
- **Proven in validation (DEC-108):** U-1 (Codex login token, including whether Codex parses the node pass as a JWT) and U-2 (the Grok login variable). If either fails, that runtime's login-token mode is reported to the user and marked "not supported".
- **Testing:** R-1 (`NODE_USE_ENV_PROXY`) no longer applies, since there is no proxy under DEC-110. Codex ChatGPT mode's side calls must fit C3's paths; check this live. R-E (native availability without local keys) is a step-4 test.

## Latest Authoritative Result

- Review Decision: **Pass**
- Material-Premise Gate: `Pass`
- Notes: AR-001 to AR-006 are resolved (ARCH-REV-002). AR-007 is obsolete (DEC-111, option B). N-3 and N-4 are carried into implementation.
