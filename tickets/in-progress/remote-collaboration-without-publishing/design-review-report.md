# Design Review Report — Remote Collaboration Without Publishing (autobyteus-245)

## Review Round Meta

- Upstream Requirements Doc: `…/requirements-doc.md` (Approved, SR-002 / SR-003)
- Upstream Investigation Notes: `…/investigation-notes.md` (S-01 … S-07, A-01 … A-05)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001 … SR-004)
- Reviewed Design Spec: `…/design-spec.md` at commit `8755a19305c6449517676ea0e0eb3581f7d0de0e` (SR-005)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001); the slice 1 package `origin/personal:tickets/done/cross-node-agent-communication/` as context
- Relevant Solution Revision IDs: SR-001 … SR-005
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: the Solution Designer's SR-005 (commit `8755a19305`), answering ARCH-REV-001 (AR-201 … AR-204)
- Prior Review Round Reviewed: round 1 (`ARCH-REV-001`, `Fail`)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: code read in the worktree at `707e8b6d95` (base `786055f3d7`, `autobyteus-server-ts/src`):
  - `agent-collaboration/collaborators/collaborator-admission.ts:100-124` (`catalogDefinitionAt`, `catalogTaskSource`);
  - `collaborator-candidate-policy.ts:101-210` (eligibility: `ownershipScope === "shared"`, built-ins excluded, `isApplicationBound`);
  - `collaborator-launch-resolver.ts:85-200` (`resolve`, `check`; the inherited launch is validated in the same batch);
  - `collaborator-root-port.ts:17-40`;
  - every `CollaboratorRootPort` implementation (`standalone-root-collaborators.ts`, `team-run-collaborators.ts`, `agent-org-run-collaborators.ts`, `api/graphql/services/collaborator-root-port-resolver.ts`);
  - `grep rootLaunchConfiguration` and `grep rootKind` across `src/`;
  - `remote-collaboration/domain/remote-refusals.ts:18-31` and `channel/peer-client.ts:140` (`detail` = the answer's `message`);
  - `config/app-config.ts:341-349` (`getTempWorkspaceDir` creates the directory).

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-collaboration-without-publishing/tickets/in-progress/remote-collaboration-without-publishing`

## Routing Classification Review

- Task size: `Medium`; architectural risk: `High`
- Classification rationale reviewed: yes. One additive mode in a shared resolver used by every local catalog copy, a contract field and refusal codes between nodes, a wider security posture (every shared Agent startable by peers, with auto-approve), and a large but mechanical removal.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (AR-204 resolved: the requirement text matches SR-003)
- Approved requirements / intended behavior understood:
  - no publish step; every shared Agent is available at its catalog address;
  - runtime and model come from the Agent's default; otherwise the delegation is refused with the user's wording, or with the specific reason;
  - the temp workspace and auto-approve always on;
  - Teams are refused until autobyteus-247;
  - publishing is removed; no migration.
- Relevant existing behavior and evidence confirmed: yes (A-01 … A-05, verified in the code). One correction: A-04 counts "14 readers" of `rootLaunchConfiguration`, but the port method has exactly one reader (AR-202).
- Scope guardrail confirmed: yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`.
- Remaining material ambiguity: none in intent; AR-204 is about text.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-201 | Operational | Pass | Pass | Pass | Confirmed | — (AR-204 resolved) |
| BEH-202 | Contract | Pass | Pass | Pass | Confirmed | — (AR-201 resolved) |
| BEH-203 | Contract | Pass | Pass | Pass | Confirmed | — (AR-202 resolved) |
| BEH-204 | Contract | Pass | Pass | Pass | Confirmed | — (AR-203 resolved) |

## Supplemental Artifact Coherence Verdict

None. No supplements; `follow-ups.md` FU-001 is consistent with DEC-202.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | § Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Duplicated Policy Or Coordination`: slice 1's `isPublishable` and `PublishedLaunchCheck` duplicate `CollaboratorCandidatePolicy` and `CollaboratorLaunchResolver` (S-01, A-01 … A-03) | — |
| Refactor decision is explicit | Pass | "Refactor needed now: Yes"; remote targets use the single local owners | — |
| Refactor decision is supported by the concrete design sections | Pass | Removal Plan; ownership map | — |

This is the right response, and a good one: remote targets now go through the same eligibility, address, plan and launch owners as local catalog copies.

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Governing Owner Clear? | Naming Clear? | Ownership Clear? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 remote delegation without publishing | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass (the kind is decided first: `catalogDefinitionAt` → Team refusal → `catalogTaskSourceOf`) |
| DS-002 catalog resolution without a run | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 Remote Collaboration card | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `CollaboratorAdmission` | Pass | Pass | Pass | Pass | B calls the same public method as local delegation; no second catalog lookup |
| `CollaboratorLaunchResolver` | Pass | Pass | Pass | Pass | One caller (admission); the base is passed in, not read elsewhere |
| `CollaboratorRootPort` | Pass | Pass | Pass | Pass | AR-202 resolved: `launchBase()` replaces `rootLaunchConfiguration()`; `rootKind` removed |
| `RemoteDelegationReceiver` | Pass | Pass | Pass | Pass | No longer knows publishing |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remote-collaboration/inbound` → `agent-collaboration/collaborators` (admission, node port) | Pass | Pass | Pass | Pass | Remote reuses the collaboration owners; never the reverse |
| `NodeCatalogPort` → `AppConfig.getTempWorkspaceDir()` (built by remote-collaboration services) | Pass | Pass | Pass | Pass | The workspace rule lives in one place |

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `CollaboratorRootPort.launchBase()` | Pass | Pass | Pass | Low | Pass |
| `CollaboratorAdmission.catalogDefinitionAt` / `catalogTaskSourceOf` | Pass | Pass | Pass | Low | Pass (`catalogTaskSource` = both in order; one code path) |
| `CollaboratorLaunchResolver.resolve(plans, base)` | Pass | Pass | Pass | Low | Pass |
| `CollaboratorNoDefaultLaunchError(name, kind)` | Pass | Pass | Pass | Low | Pass (a subclass of `CollaboratorAddError`, so local handling is unchanged) |
| `POST /rest/remote/delegated-runs` `address` | Pass | Pass | Pass | Low | Pass |
| Refusal answer `{accepted: false, nodeId, code, message, targetName?}` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Eligibility, addresses, plans | Pass | Pass | N/A | Pass | `CollaboratorCandidatePolicy` (`ownershipScope === "shared"` excludes team-local and application-owned; built-ins excluded), `CatalogAddressMap`, `CollaboratorEntryBuilder` |
| Launch checks | Pass | Pass | Pass | Pass | The resolver is extended by a base; `PublishedLaunchCheck` is removed |
| Temp workspace | Pass | Pass | N/A | Pass | `getTempWorkspaceDir()` creates the directory (`app-config.ts:347-348`) |
| Run preparation | Pass | Pass | N/A | Pass | Unchanged slice 1 path |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear? | Decision Sound? | Supports Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/collaborators/` (node port, base, error) | Pass | Pass | Pass | Pass | — |
| `remote-collaboration/` (receiver, refusals; publish removed) | Pass | Pass | Pass | Pass | — |
| `autobyteus-web` card | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Extraction Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Catalog resolution for local and remote | Pass | Pass | Pass | Pass | One owner instead of two |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core Vs Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CollaboratorRootPort` | Pass | Pass | Pass | N/A | Pass | AR-202 resolved |
| `CollaboratorLaunchBase` (`inherited` / `defaults_only`) | Pass | Pass | Pass | Pass | Pass | — |

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `node-catalog-port.ts` (new) | Pass | Pass | N/A | Pass | — |
| `collaborator-root-port.ts` | Pass | Pass | Pass | Pass | — |
| `remote-delegation-receiver.ts` | Pass | Pass | N/A | Pass | See AR-201 for the order |
| The rest | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear? | Folder Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/collaborators/node-catalog-port.ts` | Pass | Pass | Low | Pass | A collaborator port beside the others |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Publish subsystem, GraphQL, web, tests, docs | Pass | Pass | Pass | Pass | Thorough |
| `settings-file-schema.ts` "its published-agents part, if any" | Pass | N/A | Pass | Pass | Implementation confirms by search |
| Dead port member `CollaboratorRootPort.rootKind` (touched file) | Pass | N/A | Pass | Pass | Removed (AR-202) |
| `rootLaunchConfiguration()` on the port | Pass | Pass | Pass | Pass | Replaced by `launchBase()` |

## Legacy / Backward-Compatibility Verdict

| Area | Wrapper / Dual Path? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `publishedAddress` → `address` | No | Pass | Pass | Rule 9 |
| `published-agents.json` | No | Pass | Pass | Neither read nor written |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient? | Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `published-agents.json` | Not Affected (never released; left untouched) | Pass | Pass | N/A | Pass | S-06: no tag contains `d51ef843f6` |
| Trees, `delegatedFrom`, logs, `peers.json` | Not Affected | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1 … 6 | Pass | Pass | Pass | Pass. Step 1's "existing resolver tests pass unedited" is the right guard for the `inherited` path. |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| B's resolution, no-default refusal, workspace rule | Yes | Pass | Pass | Pass | — |
| Refusal answer carrying the name and reason | Yes | Pass | N/A | Pass | B's answer and A's tool result |

## Material Premise Validation

### `MP-201` — A peer delegates to the catalog address of a shared Agent Team before autobyteus-247

- Related requirement: requirements § Out Of Scope ("Until it lands, the catalog address of a shared Agent Team on B is refused with 'Agent Teams on another node are not supported yet', rather than 'not found'"); REQ-201; BEH-202.
- Initiating basis: `User`. An agent on A calls `delegate_task({node, recipient_address: "/<team>"})`, the documented tool form, naming a Team that exists on B.
- Forward path: DS-001 → `RemoteDelegationReceiver.start` → `catalogTaskSource(nodeCatalogPort, {address})` → `catalogDefinitionAt` (a Team ref) → `admissible` → `buildPlan` (Team plan) → `launches.resolve([plan], base)` with `defaults_only`. That resolution throws `CollaboratorNoDefaultLaunchError("…agent team…")` or `CollaboratorAddError` for a Team without usable defaults *before* the receiver sees a "Team source".
- Material consequence: the agent gets "no default runtime configured for the target agent team …" or "cannot run there: …" instead of "Agent Teams on another node are not supported yet". That is wrong guidance: the agent may ask the owner to configure defaults that would still not make the delegation work. It also runs a pointless resolution (runtime availability, model validation) for every Team member.
- Reachability: `Reachable`
- Review consequence: AR-201.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| A-04 "14 readers" of `rootLaunchConfiguration` | — | Corrected in SR-005 (one reader) | Resolved |

## Review Decision

`Pass`. AR-201 … AR-204 are resolved and verified in the current design and requirements. The design is ready for implementation.

## Findings

None blocking. Resolved in ARCH-REV-002:
- AR-201: B calls `catalogDefinitionAt(nodeCatalogPort, address)` first: `null` → `AGENT_NOT_FOUND`; `agent_team` → `REMOTE_TEAMS_NOT_SUPPORTED`, with no launch resolved. For an Agent it then calls the new `catalogTaskSourceOf(port, {ref, address})`. Local `catalogTaskSource` is the two in order, so local callers are unchanged.
- AR-202: `launchBase()` replaces `rootLaunchConfiguration()` on the port (its one reader); existing ports return `inherited`; the dead `rootKind` is removed; A-04 is corrected.
- AR-203: the refusal answer is `{accepted: false, nodeId, code, message, targetName?}`, with `targetName` for the three codes; A's texts use it; the example shows both sides.
- AR-204: UC-204, SCN-201, AC-206 and the DEC-203 row (Decided (c)) are aligned with SR-003; REQ-206's row is repaired.

### Implementation note (non-blocking)

- N-201: `REMOTE_TEAMS_NOT_SUPPORTED` carries `targetName`, but `catalogDefinitionAt` returns only a ref (`{kind, definitionId}`). Take the Team's name from the eligibility owner (`CollaboratorCandidatePolicy`, which returns the definition with its name), not from a second lookup in the receiver and not from launch resolution.

The round-1 text of the findings follows, kept for traceability.

### AR-201 (resolved) — The "Teams not supported yet" refusal comes after the Team's launch resolution

- Type: Design Impact
- Severity: Medium (blocking)
- Protects: requirements § Out Of Scope (the Team refusal text until autobyteus-247), REQ-201 / BEH-202, REQ-204 (truthful reasons)
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence: MP-201. DS-001 checks "Team source" on the *result* of `catalogTaskSource`, which first resolves launches for the Team and every member (`collaborator-admission.ts:118-122`).
- Required update: decide the kind before any launch resolution.
  - The receiver calls `CollaboratorAdmission.catalogDefinitionAt(nodeCatalogPort, address)` first:
    - `null` → `AGENT_NOT_FOUND`;
    - `kind: "agent_team"` → `REMOTE_TEAMS_NOT_SUPPORTED`;
    - otherwise `catalogTaskSource` → `NO_DEFAULT_RUNTIME` / `AGENT_CANNOT_RUN` / the Agent source.
  - Alternatively give admission one method that takes the resolved ref, so the address is not resolved twice. Either is fine; say which.
  - Update DS-001 and the receiver's ownership bullet. In autobyteus-247 the Team branch then becomes "go on to `catalogTaskSource`".
- Why proportionate: a reorder at one decision point.
- Recommended recipient: Solution Designer

### AR-202 (resolved) — `CollaboratorRootPort` would carry two members a "no run" port cannot answer: replace `rootLaunchConfiguration()` with `launchBase()`, and remove the dead `rootKind`

- Type: Design Impact
- Severity: Medium (blocking)
- Protects: REQ-202, REQ-205, REQ-206 (the launch base is the one source of the remote launch); preserved behavior (local catalog copies unchanged); design principles 11 (one meaning per member, no overlapping representations), 7 (no dead code in touched files) and 8 (clean cut)
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence:
  - The port method `rootLaunchConfiguration()` has exactly one reader, `collaborator-admission.ts:122`. The other `grep` hits are its four implementations and the construction options that feed them. The design adds `launchBase()` (roots return `{inherited, launch: rootLaunchConfiguration()}`) and keeps `rootLaunchConfiguration()` "for its other readers". So every root port would expose the same fact twice. `NodeCatalogPort` must still implement `rootLaunchConfiguration()`, with nothing truthful to return (it can only throw, like the GraphQL port's stub at `collaborator-root-port-resolver.ts:75`).
  - `readonly rootKind` on the port (`collaborator-root-port.ts:19`) is set by all four implementations and read by none (`grep rootKind`). `NodeCatalogPort` would have to invent a root kind for "no run".
- Required update:
  - **Replace** `rootLaunchConfiguration()` on `CollaboratorRootPort` with `launchBase(): CollaboratorLaunchBase`. Each root port returns `{kind: "inherited", launch: <its root launch>}`. Admission reads only `launchBase()`. The GraphQL port's stub moves to `launchBase()` unchanged in meaning.
  - **Remove** `rootKind` from the port and its four implementations, as dead code in a touched file (evidence: no reader).
  - Correct A-04, the ownership bullet "`rootLaunchConfiguration()` stays for its other readers", the file mapping and the escalation trigger's second clause.
- Why proportionate: the same files are already touched; it removes a member instead of adding a parallel one, and `NodeCatalogPort` then implements only truthful members.
- Recommended recipient: Solution Designer

### AR-203 (resolved) — The refusal answer doesn't say how B conveys the Agent's name and the reason

- Type: Design Impact
- Severity: Low (blocking; it is the contract between nodes and the user's exact wording)
- Protects: REQ-203 (the user's text, which names the Agent), REQ-204 (the reason, naming the Agent and the node), DEC-206 (the contract)
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence:
  - A composes the agent-facing text as `peerRefusalText(peer.name, code, detail)` with `detail = answer.message` (`peer-client.ts:140`).
  - The new texts need the Agent's *name* (`NO_DEFAULT_RUNTIME`: "…target agent <name> on node…") and, for `AGENT_CANNOT_RUN`, both the name and the reason. A knows only the address it sent.
  - The design says "detail: the target's name" and "detail: the reason", but the answer has a single `message` field and the text needs both.
- Required update: write the refusal answer shape for these codes, for example `{accepted: false, nodeId, code, message, targetName?}` with `message` = the reason for `AGENT_CANNOT_RUN`. Or define `message` as a structured pair. One explicit shape; add it to § Contract Between Nodes and the example.
- Why proportionate: one optional field or one stated convention.
- Recommended recipient: Solution Designer

### AR-204 (resolved) — The approved requirements still describe node settings that SR-002 / SR-003 removed

- Type: Requirement Gap (text only; the approved intent is clear, so no new user decision is needed)
- Severity: Low (blocking: AC-206 is a verification criterion)
- Protects: REQ-205, REQ-206, REQ-207 ("It has no new setting"); AC-206
- Scope status: Requirement Gap — text alignment with the approved SR-003; no new behavior
- Changes approved behavior: No
- Evidence (`requirements-doc.md`):
  - UC-204 "The owner configures the node-level rules for remote runs (DEC-202, DEC-203) in Nodes → Remote Collaboration";
  - SCN-201 "optionally set the node rule(s)";
  - AC-206 "the availability note and the node setting(s)";
  - DEC-203 row: status "Needs user", recommending (b), while REQ-206's row carries the decided (c) text pasted into extra columns.
- Required update: align UC-204, SCN-201, AC-206 and the DEC-203 row with SR-003 (no setting; auto-approve always on; temp workspace), and repair REQ-206's row. This is approval-neutral text alignment; record it in the revision record.
- Recommended recipient: Solution Designer

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

- RSK-201: auto-approve is always on for remote runs, and every shared Agent is startable by a registered peer. The user accepted this within the trusted-network scope; the switch (off by default) and peer registration stay the consent; permissions are S6.
- A shared Agent whose default runtime is a local CLI runtime (for example a Codex or Claude login on that machine) runs with that node's credentials for any registered peer. This is consistent with CM-12 ("a remote run uses its own node's … credentials") and RSK-201; worth a sentence in the module docs.
- The `inherited` path must stay byte-for-byte equivalent: the existing resolver and catalog-copy tests must pass unedited (step 1; the escalation trigger).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-201 resolved by AR-201)
- Notes: classification `Medium` / `High`. Design at commit `8755a19305` (SR-005). AR-201 … AR-204 are resolved; N-201 is an implementation note.
