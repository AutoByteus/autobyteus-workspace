# Design Spec — Remote Collaboration Without Publishing (autobyteus-245)

## Solution And Approval Basis

- Current solution revision ID: `SR-005`
- Approved requirements baseline: `requirements-doc.md` at SR-003, approved by the User on 2026-10-21 (quotes in its Document Status)
- Behavior-defining supplements: None
- Design status: `Ready` (SR-005: ARCH-REV-001 AR-201 … AR-204)
- Canonical investigation notes: `investigation-notes.md` (S-01 … S-07; A-01 … A-05 below)
- Authorities read (2026-10-21): `references/architecture-design.md` (updated 2026-10-20), `references/design-principles.md` (updated), `references/finding-the-cause.md`, `/DESIGN.md` (rules 1–9), `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-10 … CM-12), `docs/design/data_migration_guideline.md` § 1–3; the slice 1 design (`tickets/done/cross-node-agent-communication/design-spec.md`) as context.
- Project design-principle conflicts: None.

## Current-State Read

- **Publishing (slice 1, merged `d51ef843f6`, never released, S-06).**
  - The owner publishes shared Agents with launch settings (`PublishedAgentService`, `published-agents.json`).
  - On node B, `RemoteDelegationReceiver.start` resolves `publishedAddress` among published Agents (`AGENT_NOT_PUBLISHED`), checks the stored settings (`PublishedLaunchCheck` → `AGENT_CANNOT_RUN`), then prepares a standalone run with them and `delegatedFrom`.
  - A GraphQL API and the web tab manage the published list.
- **Local catalog copies (S-03, S-04, A-01, A-02).**
  - `delegate_task(address)` → `CollaboratorAdmission.catalogTaskSource(port, {address})`.
  - The eligibility owner (`CollaboratorCandidatePolicy`) and address owner (`CatalogAddressMap.definitionFor`) find the definition: shared Agents and Agent Teams; never Orgs, built-ins or the viewer's own definition.
  - `CollaboratorEntryBuilder` builds an Agent or Team plan with each agent's default launch.
  - `CollaboratorLaunchResolver.resolve(plans, port.rootLaunchConfiguration())` picks, for each agent, the first usable layer: agent default → (Team members) the Team default → **inherited from the run root**. Workspace and auto-approve always come from the run root.
- On node B there is no run root: B is asked to start a run for a peer, so there is no inherited layer, and workspace and auto-approve need a rule (REQ-205, REQ-206).

## Intended Change

Node B resolves a remote target **exactly as a local catalog copy is resolved**, through the same eligibility, address, plan and launch owners. It does so with a port for "this node, no run", whose launch base is **defaults only**: no inherited layer, the temp workspace, auto-approve on. Publishing is removed.

## Change Scope (Mandatory)

- In scope: UC-201 … UC-204.
  - B's delegation receiver: it resolves through `CollaboratorAdmission` with a node catalog port.
  - The launch resolver's launch base: `inherited` or `defaults_only`.
  - The contract field `publishedAddress` → `address`; refusal codes.
  - Removal of the publish subsystem, its GraphQL API, the web publish UI, its tests and docs.
  - The availability note in the Remote Collaboration tab.
  - Contract CM-12 and the module docs.
- Deliberately left alone:
  - local delegation's launch layers (the `inherited` base keeps today's behavior exactly);
  - peers, the switch, the gateway order, links, `delegatedFrom`, messaging, Task closure, every slice 1 owner of messaging;
  - remote Agent Teams (autobyteus-247): B refuses a Team address with a specific code until then.
- Follow-ups: FU-001 (default workspace in definitions, sent 2026-10-21).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing | Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-201 | Operational | REQ-201, REQ-207, REQ-208; AC-206, AC-207 | Owner in the Nodes tab | Publish list | Removed; an availability note | DS-003 |
| BEH-202 | Contract | REQ-201; AC-201, AC-204 | `delegate_task({node, recipient_address})` | B looks up published Agents | B resolves the catalog address with the node catalog port | DS-001 |
| BEH-203 | Contract | REQ-202, REQ-205, REQ-206; AC-201, AC-205 | Same | Published settings | The agent default + temp workspace + auto-approve on (`defaults_only` base) | DS-001, DS-002 |
| BEH-204 | Contract | REQ-203, REQ-204; AC-202, AC-203 | Same | `AGENT_CANNOT_RUN` | `NO_DEFAULT_RUNTIME` / `AGENT_CANNOT_RUN` with reasons, refused before preparing | DS-001 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (feature simplification)
- Current design issue found: `Yes`, small. Slice 1 kept a second, parallel resolution for remote targets: published addresses, a second launch check (`PublishedLaunchCheck`) duplicating the resolver's runtime/model check, and its own eligibility (`isPublishable`) duplicating the candidate policy.
- Structural triggers:
  - **Repeated coordination (principle 13): fires.** Eligibility, addressing and launch checks existed twice.
  - **Legacy cleanup (principle 8): fires.** The publish subsystem becomes obsolete.
- Root cause classification: `Duplicated Policy Or Coordination`
- Refactor needed now: `Yes`. Remote targets use the single local owners, and the duplicates are removed (Removal Plan).
- Evidence: S-01, S-03, S-04, A-01 … A-03.
- Design response: one change point in a shared owner (the resolver's launch base) and one new small port. Everything else is removal.

## Terminology

- **Node catalog port**: a `CollaboratorRootPort` for "this node, no run". It has no own definition, no in-run placements, no addresses in use, is not application-bound, and its launch base is `defaults_only`.
- **Launch base**: what the resolver starts from. `inherited` (a run root's launch: today's behavior) or `defaults_only` (no inherited layer; a given workspace and auto-approve).

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-202/203/204 | A's agent calls `delegate_task({node, recipient_address, description})` | B prepares the run, or refuses with the reason; A's tool result | A: `dispatchTaskCopy`/`RemoteDelegation` (unchanged); B: `RemoteDelegationReceiver` | The handoff without publishing |
| DS-002 | Bounded local | BEH-203/204 | `catalogTaskSource(nodeCatalogPort, {address})` | A resolved task source or a refusal | `CollaboratorAdmission` + `CollaboratorLaunchResolver` | One resolution for local and remote |
| DS-003 | Primary | BEH-201 | The owner opens Nodes → Remote Collaboration | Switch and peers shown, plus the availability note | The web card | No publish step |

## Primary Execution Spine(s)

```text
DS-001  A: delegate_task({node, recipient_address:"/publisher", description}) → (slice 1, unchanged) RemoteDelegation.planActivation
        → PeerClient POST /rest/remote/delegated-runs {fromNodeId, toNodeId, address:"/publisher", delegator, coordinatingRun}
        B: PeerGateway (unchanged order) → RemoteDelegationReceiver.start
           → ref = CollaboratorAdmission.catalogDefinitionAt(nodeCatalogPort, address)     (the kind is decided first, AR-201)
               ├─ null                         → refuse AGENT_NOT_FOUND
               ├─ ref.kind = "agent_team"      → refuse REMOTE_TEAMS_NOT_SUPPORTED (targetName)   (until autobyteus-247; no launch is resolved)
               └─ ref.kind = "agent" → CollaboratorAdmission.catalogTaskSourceOf(nodeCatalogPort, {ref, address})   (DS-002)
                    ├─ CollaboratorNoDefaultLaunchError → refuse NO_DEFAULT_RUNTIME (targetName)
                    ├─ CollaboratorAddError         → refuse AGENT_CANNOT_RUN (targetName, message: the reason)
                    └─ Agent source {agentDefinitionId, launchConfiguration}
           → AgentRunService.prepareAgentRun({...launchConfiguration, delegatedFrom})   (temp workspace, autoExecuteTools: true)
        A: ← {accepted, nodeId, agentRunId} → (slice 1, unchanged) Task link → commit → work packet → tool result
           ← refusal → peerRefusalText(node, code, detail) → {delegated:false, message}

DS-002  catalogTaskSourceOf(port, {ref, address}) → policy.requireAdmissible(port, ref)
        → entries.build(definition) → launches.resolve([plan], port.launchBase())
        (catalogTaskSource(port, {address}) for local delegation = catalogDefinitionAt → catalogTaskSourceOf: one code path, no duplicate)
```

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A's side is unchanged except the request field name. B resolves the address as a local catalog copy would, through the same owners, with the node catalog port. Every refusal happens before a run is prepared, so a refusal leaves nothing on B, and nothing on A (it comes before A's Task link, SR-014 of slice 1) | `RemoteDelegation`, `PeerClient`, `PeerGateway`, `RemoteDelegationReceiver`, `CollaboratorAdmission` | B: `RemoteDelegationReceiver` | Refusal texts on A |
| DS-002 | The one catalog resolution, now also used without a run. `catalogTaskSource` is split into `catalogDefinitionAt` (address → ref, which already exists) and `catalogTaskSourceOf` (ref → source), so B can decide the kind before any launch is resolved (AR-201); local delegation calls both in order, as today. The `defaults_only` base removes the inherited layer, so an agent's own default (or, for Team members, the Team default) is the only source | `CollaboratorAdmission`, `CollaboratorCandidatePolicy`, `CatalogAddressMap`, `CollaboratorEntryBuilder`, `CollaboratorLaunchResolver` | `CollaboratorAdmission` | Runtime availability, model validation (existing) |
| DS-003 | The card shows the switch, the peers and a note: "With remote collaboration on, registered peers can start any shared Agent of this node. It runs with its own default runtime and model, in this node's temp workspace, with tools auto-approved." | Card, store | Web card | Localization |

## Ownership Map

- **`RemoteDelegationReceiver`** (B, `remote-collaboration/inbound/`; modified): handles `startDelegatedRun`. With the node catalog port, it first resolves the address to a definition (`catalogDefinitionAt`) and refuses a missing one or a Team before any launch is resolved (AR-201). For an Agent it resolves the source with `catalogTaskSourceOf`, maps each result or error to a refusal code, and prepares the run from the resolved agent source (launch configuration as resolved, plus `delegatedFrom`). It no longer knows about publishing.
- **`NodeCatalogPort`** (new, `agent-collaboration/collaborators/node-catalog-port.ts`): the `CollaboratorRootPort` of "this node, no run".
  - `ownDefinition()` → `null`; `inRunPlacementsByDefinition()` → empty; `addressesInUse()` → empty; `isApplicationBound` → `false`;
  - `launchBase()` → `{kind: "defaults_only", workspaceRootPath: <the node's temp workspace dir>, autoExecuteTools: true}`.

  It's built by the remote-collaboration services with `appConfigProvider.config.getTempWorkspaceDir()`. **The single place of the workspace and auto-approve rule** (REQ-205, REQ-206); FU-001 changes only this.
- **`CollaboratorRootPort`** (modified, AR-202):
  - **`rootLaunchConfiguration()` is replaced by `launchBase(): CollaboratorLaunchBase`.** Its only reader was `CollaboratorAdmission` (`collaborator-admission.ts:122`). Every existing port implementation returns `{kind: "inherited", launch: <the root's launch configuration>}`, so local behavior is unchanged. The roots keep their own launch-configuration options; only the port method changes.
  - **`rootKind` is removed.** All four implementations write it and nothing reads it: it is dead code in a touched file (principle 7).
- **`CollaboratorLaunchResolver`** (modified): `resolve(plans, base)`.
  - `inherited`: exactly today's code.
  - `defaults_only`:
    - configured candidates get the base's workspace and auto-approve;
    - the base's workspace is the model-validation context;
    - there is no inherited layer: an agent (or a Team member that neither its own nor the Team's default covers) with no usable layer fails;
    - with no configured layer, or only an `incomplete` one, it fails with **`CollaboratorNoDefaultLaunchError(name, kind)`**: "There is no default runtime configured for the target agent <name>" / "… agent team <name>";
    - with a configured but unusable layer (runtime unavailable, model unavailable, settings invalid), it fails with today's `CollaboratorAddError(name, <the layer's reason>)`.
- **`CollaboratorAdmission`** (modified): `catalogTaskSource(port, {address})` becomes `catalogDefinitionAt` then the new `catalogTaskSourceOf(port, {ref, address})`, which calls `launches.resolve([plan], port.launchBase())`. Local callers are unchanged.
- **A side, unchanged:** `RemoteDelegation`, `PeerClient` (only the request field name), `peerRefusalText` (new codes, below).

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| `remote-collaboration/domain/published-agent.ts` | Publishing removed | — | In This Change |
| `remote-collaboration/settings/published-agent-service.ts`, `published-agent-store.ts` | Same | Node catalog port + `CollaboratorAdmission` | In This Change |
| `remote-collaboration/settings/published-launch-check.ts` | Duplicated the resolver's runtime/model check | `CollaboratorLaunchResolver` (`defaults_only`) | In This Change |
| `settings-file-schema.ts`: its published-agents part, if any (it is also used by `peer-store.ts`) | Dead for publishing | — | In This Change (keep what `peer-store.ts` uses) |
| GraphQL `publishedAgents`, `publishAgent`, `updatePublishedAgent`, `unpublishAgent`, `PublishedAgentGql`, `PublishedAgentInput` (`api/graphql/types/remote-collaboration-settings.ts`) | Same | — | In This Change |
| `remote-collaboration-services.ts`: the `published` service and its wiring | Same | the node catalog port and admission wiring | In This Change |
| `RemoteCollaborationSettingsError` codes `AGENT_ALREADY_PUBLISHED`, `AGENT_NOT_PUBLISHED`, `LAUNCH_SETTINGS_INVALID`, `AGENT_NOT_FOUND` (settings) | Same | — | In This Change (keep the peer codes) |
| Refusal code `AGENT_NOT_PUBLISHED` and its text | Same | `AGENT_NOT_FOUND` | In This Change |
| Web: `RemoteCollaborationPublishedAgentsSection.vue`, `RemoteCollaborationPublishForm.vue`, the published parts of `remoteCollaborationStore.ts`, `graphql/queries|mutations/remoteCollaboration*.ts`, localization keys (en, zh-CN), and their tests | Same | the availability note | In This Change |
| Tests: publish cases in `remote-collaboration-settings.test.ts`, `peer-gateway.test.ts`, `peer-client.test.ts`, the two-server E2E (publishing steps and AC-103 cases) | Dead with the code | New cases AC-201 … AC-205 | In This Change |
| Docs: the publishing sections of `remote_collaboration.md`, `autobyteus-web/docs/settings.md`; CM-12 wording | Untrue | The new wording | In This Change |

Dead-code check in touched files: implementation confirms by search and typecheck that nothing else imports the removed modules.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `<data>/remote-collaboration/published-agents.json` (slice 1).
- Decision: `Not Affected` for released data (it was never released, S-06). On development and test machines the file is left untouched and is never read or written (DEC-204). No migration.
- Unchanged: `peers.json`, trees, `delegatedFrom`, message logs.

## Contract Between Nodes (change)

- `POST /rest/remote/delegated-runs` body: `{fromNodeId, toNodeId, address, delegator: {agentRunId}, coordinatingRun: {kind, runId}}`. `address` replaces `publishedAddress`; it's the target's catalog address on B. This is a clean cut (DESIGN.md rule 9).
- Answers (AR-203):
  - accepted: `{accepted: true, nodeId, agentRunId}`;
  - refused: `{accepted: false, nodeId, code, message, targetName?}`, where `message` is B's detail (the reason) and `targetName` is the target definition's name on B. `targetName` is present for `REMOTE_TEAMS_NOT_SUPPORTED`, `NO_DEFAULT_RUNTIME` and `AGENT_CANNOT_RUN`, and absent otherwise.
  - `PeerClient` passes both to `peerRefusalText(node, code, message, targetName)`, so A's text names the Agent, which A knows only by its address.
- Refusal codes on this request (`remote-refusal-codes.ts`, agent-facing text composed on A by `peerRefusalText` with this owner's peer name):

| Code | When (B) | Text on A |
| --- | --- | --- |
| `AGENT_NOT_FOUND` (replaces `AGENT_NOT_PUBLISHED`) | No eligible definition at the address (unknown, built-in, Org, team-local, application-owned) | `Node "<node>" has no Agent at <address> that can be delegated to.` |
| `REMOTE_TEAMS_NOT_SUPPORTED` (new; removed again by autobyteus-247) | The address is a shared Agent Team (decided before any launch is resolved) | `<targetName> on node "<node>" is an Agent Team; Agent Teams on another node are not supported yet.` |
| `NO_DEFAULT_RUNTIME` (new) | `CollaboratorNoDefaultLaunchError` | `There is no default runtime configured for the target agent <targetName> on node "<node>".` (the user's wording; "agent team" in 247) |
| `AGENT_CANNOT_RUN` (kept) | `CollaboratorAddError`, or preparing failed | `The Agent <targetName> on node "<node>" cannot run there: <message>` |

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `CollaboratorRootPort.launchBase()` (replaces `rootLaunchConfiguration()`; `rootKind` removed) | A root's or the node's launch base | Gives the resolver its base | — | Existing ports: `inherited`; `NodeCatalogPort`: `defaults_only` |
| `CollaboratorAdmission.catalogDefinitionAt(port, address)` (existing) / `catalogTaskSourceOf(port, {ref, address})` (new) | Address → ref; ref → task source | Lets B decide the kind first | Address; `CatalogDefinitionRef` | `catalogTaskSource` = both in order |
| `CollaboratorLaunchResolver.resolve(plans, base: CollaboratorLaunchBase)` | Launch per agent | Layer order; `defaults_only` without the inherited layer | — | One caller (`CollaboratorAdmission`) |
| `CollaboratorNoDefaultLaunchError(name, kind)` | Error | "No default runtime configured" | Name, `agent` \| `agent_team` | Subclass of `CollaboratorAddError`, so existing local handling still sees an add failure |
| `RemoteDelegationReceiver.start(request, from)` | B's start | Resolve, map, prepare | `address` | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Eligibility | `CollaboratorCandidatePolicy` | Reuse (through the port) |
| Address → definition | `CatalogAddressMap.definitionFor` | Reuse |
| Plans for an Agent and a Team | `CollaboratorEntryBuilder` | Reuse (Team for 247) |
| Launch layers, runtime and model checks | `CollaboratorLaunchResolver` | Extend (launch base) |
| Run preparation | `AgentRunService.prepareAgentRun` | Reuse (unchanged) |
| Temp workspace | `AppConfig.getTempWorkspaceDir()` | Reuse |

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `src/agent-collaboration/collaborators/node-catalog-port.ts` | Add | `NodeCatalogPort` (the workspace and auto-approve rule for remote runs) |
| `src/agent-collaboration/collaborators/collaborator-root-port.ts` | Modify | `launchBase()` replaces `rootLaunchConfiguration()`; `rootKind` removed; `CollaboratorLaunchBase` type |
| `src/agent-collaboration/collaborators/collaborator-launch-resolver.ts` | Modify | `resolve(plans, base)`; `defaults_only` |
| `src/agent-collaboration/collaborators/collaborator-errors.ts` | Modify | `CollaboratorNoDefaultLaunchError` |
| `src/agent-collaboration/collaborators/collaborator-admission.ts` | Modify | `catalogTaskSourceOf`; `catalogTaskSource` composed of `catalogDefinitionAt` + `catalogTaskSourceOf`; `port.launchBase()` |
| Every `CollaboratorRootPort` implementation: `standalone-root-collaborators.ts`, `team-run-collaborators.ts`, `agent-org-run-collaborators.ts`, `api/graphql/services/collaborator-root-port-resolver.ts` | Modify | `launchBase()` → `{kind: "inherited", launch: <root launch>}` instead of `rootLaunchConfiguration()`; `rootKind` removed |
| `src/remote-collaboration/inbound/remote-delegation-receiver.ts` | Modify | Resolve through admission; map refusals; prepare |
| `src/remote-collaboration/remote-collaboration-services.ts` | Modify | Wire the port and admission; remove `published` |
| `src/remote-collaboration/domain/remote-requests.ts`, `src/agent-collaboration/execution/remote/remote-run-channel.ts`, `remote-delegation.ts`, `remote-collaboration/channel/peer-client.ts`, `peer-gateway.ts` | Modify | `address` field |
| `src/agent-collaboration/execution/remote/remote-refusal-codes.ts`, `src/remote-collaboration/domain/remote-refusals.ts` | Modify | Codes and texts (table above) |
| Removed files | Remove | Removal Plan |
| `autobyteus-web/components/settings/RemoteCollaborationCard.vue`, `stores/remoteCollaborationStore.ts`, `graphql/…`, localization | Modify / Remove | The note; publishing removed |
| Docs: `docs/design/collaboration_model.md` (CM-12, § 5 row), `docs/modules/remote_collaboration.md`, `docs/modules/agent_communication.md` (launch layers: the `defaults_only` base), `autobyteus-web/docs/settings.md` | Modify | Including one sentence in `remote_collaboration.md` and the Nodes tab note: an Agent whose default runtime uses a local CLI login (Codex, Claude) runs with this node's credentials for any registered peer, consistent with CM-12 ("a remote run uses its own node's … credentials") |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| B's resolution | `catalogTaskSource(nodeCatalogPort, {address: "/publisher"})`, the same call local delegation makes | A second remote-only lookup over the catalog |
| No default | B answers `{accepted: false, nodeId: "srv_B…", code: "NO_DEFAULT_RUNTIME", message: "Publisher has no default runtime and model.", targetName: "Publisher"}`; the `delegate_task` result on A is `{delegated: false, message: "There is no default runtime configured for the target agent Publisher on node \"docker\"."}` | Silently picking some model on B |
| Workspace rule | `NodeCatalogPort.launchBase()` is the only place that says "temp workspace, auto-approve on" | Constants spread over the receiver and the resolver |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Keep reading `published-agents.json` as a fallback for launch settings | Rejected | Agent defaults (DEC-201) |
| Accept both `publishedAddress` and `address` | Rejected (rule 9) | `address` only |

## Change / Refactor Sequence

1. The resolver launch base, the port method, the three roots' `inherited`, and `CollaboratorNoDefaultLaunchError`, with unit tests: `inherited` unchanged (the existing resolver tests pass as is); `defaults_only` covers no default, incomplete, unavailable runtime, unavailable model, Team-default coverage.
2. `NodeCatalogPort`; the receiver through admission; refusal codes and texts; the `address` field.
3. Removal: the publish subsystem, GraphQL, web, tests, docs.
4. Web: the availability note.
5. Docs: CM-12, module docs.
6. Two-server E2E: AC-201 … AC-205 replace the publishing cases; the rest of the slice 1 suite stays.

## Key Tradeoffs

- **Reusing local resolution on B** (a port for "no run") vs. a separate remote resolver: one owner of eligibility, addresses and launch checks for every target. The cost is one port method across three roots.
- **The temp workspace for all remote runs** is simple and works everywhere. A per-definition default is FU-001.

## Risks

- RSK-201: auto-approve is always on for remote runs. Accepted by the user within the trusted-network scope.
- RSK-202 → resolved: the resolver can run without an inherited layer through the launch base (A-03).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`. One shared resolver change (an additive mode), a new small port, the receiver rewritten through existing owners, a contract field rename, and a large but mechanical removal (server, GraphQL, web, tests, docs).
- Architectural risk: `High`.
  - **Contract:** the inter-node request field and refusal codes change.
  - **Shared behavior:** the shared launch resolver, used by every local catalog copy, gains a mode.
  - **Security posture:** every shared Agent becomes startable by peers, with auto-approve on (RSK-201, accepted).
- Escalation trigger: the resolver's `inherited` path cannot stay byte-for-byte equivalent, or a reader of `CollaboratorRootPort.rootLaunchConfiguration()` / `rootKind` other than the ones named here turns up.

## Guidance For Implementation

- Reproduction to start from: `None` (a simplification). Start from the slice 1 two-server E2E harness (`tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`).
- Keep the `inherited` path identical: the existing resolver and catalog-copy tests must pass without edits.
