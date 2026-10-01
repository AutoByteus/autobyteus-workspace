# Design Spec — agent-initiated-collaborators

## Solution And Approval Basis
- **Current solution revision ID:** `SR-005`. It revises SR-004 after the user narrowed REQ-003 (SR-005) and for
  ARCH-REV-002 (AR-005). The requirements basis is `SR-005`.
- **Approved requirements:** `requirements-doc.md` (Approved, SR-002). The user said "all clear right? then i approve"
  (2026-10-01).
- **Supplements:** none new. The UI reuses the predecessor's approved VIS-001–015
  (`…/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/`).
- **Design status:** `Ready`.
- **Investigation notes:** `investigation-notes.md` (E-01–E-12).
- **Workspace:**
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators`, branch
    `codex/agent-initiated-collaborators`.
  - Base `origin/personal` @ `84224a58d`. Finalization target: `personal`.

## Current-State Read
The predecessor (`cross-scope-agent-mentions`) shipped:
- `collaborators[]` instances in Team, Org and Agent roots;
- one admission path (E-01), triggered only by the user's `@`;
- per-root message and delegation resolvers (E-03, E-04);
- always-on `send_message_to` and `delegate_task`.

Gaps for this ticket:
- **No discovery.** There is no tool for an agent to find agents and teams (E-02 is UI-only).
- **Admission is tied to `@`.** It is user-triggered only, and it is coupled to note composition (E-09).
- **Delegation stops at the run.** It reaches in-run placements only (E-04).
- **Allocation is order-dependent** (E-08).
- **Resolution is run-wide, not relative to the sender's team instance.** Task-copy handoffs fail, or leak into the
  mounted team in an Org (E-05).
- **Catalog copies have no persisted source** (E-11).

## Task Size And Architectural Risk (Mandatory)
- **Task size:** `Large`.
  - A new tool across all runtimes (registry, exposure, MCP adapter).
  - Admission split, used by three roots and the send path.
  - Deterministic address mapping.
  - Bring-in inside message delivery, and catalog delegation with persisted sources, in three roots.
  - Instance-relative resolution in three roots, which changes Org behavior.
  - Contract and prompt wording.
  - Web source selectors for catalog copies.
- **Architectural risk:** `High`.
  - The shared tool contract meaning changes (`send_message_to` can now create).
  - A persisted record shape changes (optional task-copy `source`).
  - Org behavior changes (REQ-007).
  - Concurrency: admission runs inside delivery, under the root gate.
- **Escalation trigger:** a root's delivery path cannot run admission without re-entering its own gate; or a runtime's
  MCP surface cannot expose an opt-in tool bound to the sender's member context.

## Architecture Investigation Evidence
| Source | Path | Observation | Decision |
| --- | --- | --- | --- |
| Admission | `agent-collaboration/collaborators/collaborator-mention-admission.ts` (E-01, E-09) | Ensure and note are coupled; only `@` triggers it | Split into `ensureCollaborators` (shared) and note composition (`@` only) |
| Allocation | `collaborator-address-allocator.ts` (E-08) | First free `_2`; order-dependent | Deterministic `CatalogAddressMap` (see Addressing) |
| Resolution | Team, Org and Agent recipient resolvers and indexes (E-03, E-10) | Run-wide; ancestry is available | A sender-relative first step, in a shared resolver helper |
| Task records | `run-execution-tree-shared-record-schemas.ts` (E-11) | Tolerant reader | Optional `source` on catalog task copies |
| Opt-in tool | `publish-artifacts-tool.ts`, `runtime-agent-tool-exposure.ts`, `publish-artifacts-mcp-adapter-provider.ts` (E-06, E-12) | Registry, exposure flag, MCP provider | Same path for `list_available_agents` |
| Contract text | `agent-team-collaboration-llm-contract.ts`, `standalone-collaboration-instruction.ts`, tool descriptions (E-07) | Text says "already existing" | New wording (REQ-009) |

## Intended Change
1. **`list_available_agents` tool** (REQ-001, REQ-002): opt-in, registered like `publish_artifacts`. It is bound to the
   sender's member context and calls `Root.listAvailableAgents(sender)`. That method returns
   `{name, kind, address, description}` for every eligible definition. Eligibility uses the same policy kinds and
   exclusions as `@`; in-run definitions are included with their in-run address, and the root's own definition is
   excluded.
2. **Deterministic addressing** (REQ-003):
   - One `CatalogAddressMap` per run computes the address of every eligible catalog definition that is not in the run,
     from the eligible catalog and the addresses in use: the base slug if unique, otherwise `base_<hash6>` for every
     colliding definition. It is pure and deterministic.
   - `@` admission and bring-in store the allocated address on the collaborator entry. Stored addresses never change.
   - **No issued bindings** and no stale-address machinery. Mid-run rename, unshare or delete followed by name reuse is
     `Technically Possible but Unsupported/Contrived` under design principle 6, and the user confirmed they would never
     do it (P-001 reclassified; see the Material Premise note).
   - An address that maps to nothing returns the normal "not found".
   - **In-run entries (AR-002):** a definition already in the run is listed once, at its in-run address, chosen by a
     fixed precedence (see the Final File Responsibility Mapping, policy row).
   - **Listing never writes** to any tree or package. That resolves AR-005 by construction: a standalone run that only
     lists gets no `collaboration/` package and no `hasCollaboration` flag.
3. **Admission split** (E-09): `CollaboratorAdmission.ensure(root, senderRunId, definitions)` validates, allocates
   (addresses from the map), commits, hosts Offline and emits `collaborator_added`. It is idempotent per definition. `@`
   calls `ensure` plus the note; the send path calls `ensure` only.
4. **`send_message_to` bring-in** (REQ-004): the root's message resolution is
   1. sender-relative (REQ-007), then
   2. run-wide (configured, collaborator, collaborator member), then
   3. **catalog**: if the map resolves the address to an eligible definition, call `ensure` under the gate the root
      already holds, then deliver to the new instance (the first message starts it).

   A failure returns `COLLABORATOR_ADD_FAILED {reason}`. By run ID it is unchanged.
5. **Catalog delegation** (REQ-005, Q-1): `resolveDelegationPlacement` checks configured placements, then collaborators,
   then the **catalog**.
   - A catalog placement carries a **source snapshot** (definition, Team layout and handoffs, root launch settings)
     built with the existing entry builder, with no identities.
   - The task lifecycle prepares the copy from that source and persists the source on the task record (`source` field).
   - Restore reads `source` when present. No collaborator entry is created.
6. **A team instance is one unit** (REQ-007): a shared `resolveWithinSenderTeamInstance(index, sender, address)`.
   - For each of the sender's containing team instances, deepest first, skipping the root `/`:
     - `address === team.address` → that instance's coordinator;
     - `address` is inside `team.address` (prefix `team.address + "/"`) → that instance's member at that address.
   - **No fall-through (AR-003):** an address inside the sender's own team-instance prefix resolves **only** within that
     instance. A miss returns `COLLABORATION_TARGET_NOT_FOUND`, never run-wide and never catalog. Two copies therefore can
     never cross, even if one copy's snapshot lacks a member.
   - Addresses outside every containing instance's prefix continue to step 2 (run-wide), then step 3 (catalog).
   - All three roots use it as the first step.
7. **Anyone in the run** (REQ-006): no permission check beyond existing sender authorization. `addedViaAgentRunId` is the
   sender.
8. **Contracts and prompt** (REQ-009): new wording for the `send_message_to` and `delegate_task` tool descriptions, the
   shared team collaboration block, the standalone instruction, the mention-note guidance line, and the new tool's
   description.
9. **Web** (REQ-011): task-copy rows and contexts resolve a catalog copy's source from its `source` field (an extension
   of `agentSourceSelectors`). The tool picker lists the new tool automatically through the registry. No new UI
   components.

## Relevant Behavior And Production-Path Map (Mandatory)
| BEH | Req / AC | Trigger | Target path | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001/002, AC-001/002 | Agent calls `list_available_agents` | Tool → Root.listAvailableAgents → policy + CatalogAddressMap | DS-001 |
| BEH-002 | REQ-003, AC-003 | List, then call | CatalogAddressMap (deterministic; collision ⇒ id-hash suffix; unknown ⇒ not found) | DS-001/002 |
| BEH-003 | REQ-004/010, AC-004/010 | `send_message_to(catalog address)` | Resolver step 3 → ensure → deliver | DS-002 |
| BEH-004 | REQ-005, AC-005 | `delegate_task(catalog address)` | Placement(catalog source) → lifecycle → task record with `source` | DS-003 |
| BEH-005 | REQ-007, AC-007 | Teammate handoff inside any team instance | Resolver step 1 | DS-002 |
| BEH-006 | REQ-006/008, AC-006/008 | Any sender, any run type | Same code in Team, Org and Agent roots | DS-002/003 |
| BEH-007 | REQ-009, AC-009 | Bootstrap | Prompt and tool descriptions | DS-004 |
| BEH-008 | REQ-011, AC-011 | Snapshot or events | Web selectors (`source` for catalog copies) | DS-005 |
| BEH-009 | AC-012 | `@`, configured messaging, Org configured handoffs | Unchanged (step 1 yields the same result for configured instances) | — |

## Relevant Supplemental Task Artifacts
Predecessor UI/UX spec (VIS-001–015) for rows and tabs. Not changed.

## Task Design Health Assessment (Mandatory)
- **Change posture:** `Larger Requirement`.
- **Current design issue found:** `Yes`.
- **Root cause classification:** `Missing Invariant` together with `Duplicated Policy Or Coordination`.
  - Missing invariant: "a team instance resolves its own members" (E-05), and "addresses are a deterministic function of
    the catalog" (E-08).
  - Coupling: admission is coupled to the note (E-09).
- **Refactor needed now: `Yes`, bounded.**
  - **R-1:** split admission into ensure and note.
  - **R-2:** replace the order-dependent allocator with `CatalogAddressMap`.
  - **R-3:** move per-root resolution steps into a shared, ordered resolver helper, so the three roots don't each grow
    their own copy, and keep message-routing logic out of `root-team-run.ts`, which is at its size limit.
- **Deferred, with residual risk:**
  - **D-1:** an explicit collaborator-agent registry in Team roots, in place of pushing into `memberContexts`. It works
    and is untouched by this change. It is a candidate follow-up.
  - **D-2:** turning standalone runs into true roots (`RootAgentRun`), removing the Agent-root "holder" shape. The user
    parked it. It doesn't block this change: catalog bring-in and delegation use the existing Agent root.

## Terminology
- **The collaborator:** the single instance at an address (`collaborators[]`), created by `@` or by the first
  `send_message_to` to a listed address.
- **Task copy:** a fresh instance per `delegate_task` call (`taskExecutions[]`), reached by run ID.
- **Catalog address:** the address `CatalogAddressMap` assigns to an eligible catalog definition in this run.

## Material Premise Classification (Principle 6)
- **P-001** (ARCH-REV-001): "the user renames, unshares or deletes a listed definition while the run is live, and reuses
  its name for another definition".
  - Classification: `Technically Possible but Unsupported/Contrived`. There is no coherent user goal, and the user
    confirmed: "you can almost like assume I will never do that".
  - Drives no requirement or machinery. The AR-001 bindings were removed; AR-005 is obsolete.
- **Same-name definitions existing in the catalog:** `Supported Normal Scenario` (a static catalog fact). Handled by the
  hash suffix.

## Design Reading Order
Template order.

## Legacy Removal Policy (Mandatory)
`No backward compatibility; remove legacy code paths.` In scope:
- `allocateCollaboratorAddress` (first-free) is replaced by `CatalogAddressMap`;
- `CollaboratorMentionAdmission.admit`'s combined ensure-plus-compose is split;
- the "already existing" contract wording is replaced.

Nothing is kept as a wrapper.

## Persisted Data / State Transition Decision (Mandatory)
- **Stored subjects:**
  - Team, Org and Agent-root trees: an optional `source` on task-copy records (agent and team);
  - collaborator addresses for new adds come from `CatalogAddressMap`.
- **`source` shape:**
  - Agent: `{kind:"agent", agentDefinitionId, launchConfiguration}`.
  - Team: `{kind:"agent_team", teamDefinitionId, coordinatorAddress, members:[{address, agentDefinitionId}], handoffs,
    defaultLaunchConfiguration}`.
  - Present only for catalog copies.
- **Readers:** the tree readers already tolerate unknown fields; they now parse `source` when present. Its absence means
  the source is resolved from configured placements or collaborators, which is true for every existing record.
- **Existing collaborator entries** keep their stored addresses; the map treats them as in use.
- **Decision:** `Directly Usable — No Migration` (data guideline §3: an optional field whose absence is truthful).
- **Downgrade:** an older build ignores `source`, so restoring a catalog copy fails as "context unavailable". Not
  supported (as in the predecessor).

## Data-Flow Spine Inventory
| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | `list_available_agents` call | List of {name, kind, address, description} | Root (`listAvailableAgents`) |
| DS-002 | Primary | `send_message_to(address)` | Delivered to one instance (brought in if needed) or a typed failure | Root communication path |
| DS-003 | Primary | `delegate_task(address)` | New task copy (with `source` if from the catalog) | Root task lifecycle |
| DS-004 | Bounded | Session bootstrap | Tool exposed and wording projected | Exposure builder and prompt composer |
| DS-005 | Return | Snapshot or events | Rows and contexts for catalog copies | Web selectors |

## Primary Execution Spine(s)
- **DS-001:** `Tool (AutoByteus local / Agent Tools MCP) → MemberExecutionContext → Root.listAvailableAgents(sender) →
  CollaboratorCandidatePolicy.listEligible(port) + CatalogAddressMap.addressFor(def) → result`.
- **DS-002:** `send_message_to → Root.deliverLogicalMessage(sender, address) [gate] → MessageRecipientResolution:
  (1) sender team instance → (2) run-wide → (3) catalog → CollaboratorAdmission.ensure (same gate) →
  RootCommunicationEngine.deliver → handle.ensureReady → AgentRun`.
- **DS-003:** `delegate_task → Root.delegateTask [gate] → resolveDelegationPlacement: configured | collaborator | catalog(source)
  → RootTaskExecutionLifecycle → adapter.prepareActivation(source) → one tree write (record + source) →
  TASK_EXECUTION_STARTED → work packet`.

## Spine Narratives (Mandatory)
| Spine | Narrative |
| --- | --- |
| DS-001 | The tool handler resolves the sender's root from its member context and asks the root for available agents. The root builds its `CollaboratorRootPort` and calls `policy.listEligible`: the same kind exclusions as `@`, but in-run definitions are kept and marked with their in-run address. Every other entry gets `CatalogAddressMap.addressFor(definitionId)`. In-run entries are listed once, at the address chosen by the in-run precedence (AR-002). **No write of any kind** (AR-005). |
| DS-002 | Under the root gate, `MessageRecipientResolution` tries, in order: the sender's own team instance (deepest first, skipping the root `/`); the run-wide index; then a catalog hit, where `CatalogAddressMap.definitionFor(address)` names an eligible definition; otherwise the normal not found. A sender-instance prefix match never falls through (AR-003). For a catalog hit it calls `CollaboratorAdmission.ensure(…, senderRunId)` through a gate-internal variant (no re-acquire). That validates runnability, allocates identities, commits one tree write and hosts Offline handles, after which the address resolves run-wide to the new instance. Delivery then proceeds unchanged, and the first message starts it. Admission failure: `COLLABORATOR_ADD_FAILED`, with nothing written or delivered. |
| DS-003 | Placement order: configured, collaborator, catalog. A catalog placement builds a source snapshot with `CollaboratorEntryBuilder` (no identities) and the root launch configuration. The lifecycle's adapter prepares the copy from the placement's source (agent: `prepareTaskAgent`; team: `taskTeams.create`, then `prepareTaskTeam` with the source handoffs). The tree write records the task execution with `source`. On restore, the per-root task source resolver uses the record's `source` first, then configured or collaborator. The host rule is unchanged. |
| DS-004 | The exposure builder adds `list_available_agents` when the definition's `toolNames` include it and a member context exists (eligible runs only). MCP adapter provider: `list-available-agents-mcp-adapter-provider.ts`. Prompt and tool descriptions are updated in one shared contract module. |
| DS-005 | Task-copy DTOs carry the optional `source`. `agentSourceSelectors` resolves a copy's definition and settings from `source` when present. Rows and contexts render as for other task copies. |

## Spine Actors / Main-Line Nodes
- Tool handlers (local and MCP);
- roots (`RootTeamRun`, `AgentOrgRun`, `AgentRunCollaborationRoot`);
- `MessageRecipientResolution` (shared);
- `CatalogAddressMap`;
- `CollaboratorAdmission`;
- `RootCommunicationEngine`;
- `RootTaskExecutionLifecycle` with the per-root adapters and source resolvers;
- web selectors.

## Ownership Map
- **Root:** owns its gate, its tree writes, and the order of resolution and admission.
- **`CollaboratorAdmission`:** owns ensure semantics: validate, allocate, commit through the root's persistence callback,
  host, emit. It is stateless and idempotent per definition.
- **`CatalogAddressMap`:** a pure function of `(eligible catalog, in-use addresses)`. It owns the address-to-definition
  mapping and is the only allocator.
- **`MessageRecipientResolution`:** a pure, ordered resolver over a root-supplied index port. It owns the
  sender-instance-first rule.
- **Task source resolvers (per root):** own a copy's source on activation and restore. A record's `source` is
  authoritative when present.

## Thin Entry Facades / Public Wrappers
| Facade | Owner | Must Not Own |
| --- | --- | --- |
| `list_available_agents` handlers | `Root.listAvailableAgents` | Policy and address logic |
| `send_message_to` / `delegate_task` handlers | Root delivery and delegation | Admission and resolution logic |

## Removal / Decommission Plan (Mandatory)
| Item | Replaced By | Scope |
| --- | --- | --- |
| `allocateCollaboratorAddress` (first free `_2`) | `CatalogAddressMap` | In This Change |
| `CollaboratorMentionAdmission.admit` combined ensure-plus-compose | `CollaboratorAdmission.ensure` plus note composition at the `@` call sites | In This Change |
| Per-root inline resolution order (`getMessagePlacement` call sites in resolvers) | Shared `MessageRecipientResolution` with root index ports | In This Change |
| "Already existing" wording in tool and prompt text | New wording | In This Change |

## Return Or Event Spine(s)
`collaborator_added` (existing) is emitted for agent-initiated adds as well. `task_execution_started` (existing) carries
`source` for catalog copies.

## Bounded Local / Internal Spines
- **Gate-internal admission:**
  `deliverLogicalMessage [gate held] → resolution miss → catalog hit → admission.ensure(gateHeld=true) → commit → host
  → index refresh → resolve again → deliver`.
  - It never re-enters the gate.
  - Two concurrent first messages to the same address serialize on the gate; the second finds the instance.

## Off-Spine Concerns Around The Spine
| Concern | Owner Served | Note |
| --- | --- | --- |
| Description text for list entries | DS-001 | From the definition's description (Team: its description) |
| Hash suffix | `CatalogAddressMap` | `base_<6 lowercase hex of sha256(definitionId)>`, applied to every colliding definition |
| Localization | Web | None new (tool cards are generic) |

## Ownership Boundaries
- Only roots write trees.
- Admission commits through the root's persistence callback (as today).
- The resolver and the address map are pure.
- Tool handlers never touch indexes directly.

## Boundary Encapsulation Map
| Boundary | Encapsulates | Forbidden Bypass |
| --- | --- | --- |
| `Root.deliverLogicalMessage` / `delegateTask` / `listAvailableAgents` | Resolution, admission, the gate | Handlers calling admission or the map directly |
| `CollaboratorAdmission.ensure` | Validation, allocation, commit and hosting | Roots allocating addresses themselves |
| `CatalogAddressMap` | All catalog addressing | Any other allocator |

## Dependency Rules
- `MessageRecipientResolution` and `CatalogAddressMap` live in `agent-collaboration/collaborators/` (or
  `agent-collaboration/execution/`). They depend only on ports.
- Roots depend on them, not the other way round.
- The `send_message_to` path by run ID never calls admission.

## Interface Boundary Mapping
| Interface | Shape | Note |
| --- | --- | --- |
| `list_available_agents()` → | `{ agents: [{ name, kind: "agent" \| "agent_team", address, description }] }` | No arguments. Same JSON for native and MCP |
| `send_message_to` result | Existing flat result. New code `COLLABORATOR_ADD_FAILED` with the reason in `message` | Additive |
| `delegate_task` result | Unchanged union | Catalog targets allowed |
| `CatalogAddressMap` | `addressFor(definitionId)`, `definitionFor(address)` → `{kind, definitionId} \| null` | Built per call from the port |
| `CollaboratorRootPort.inRunPlacementsByDefinition()` (AR-002) | → `Map<definitionKey, address[]>` covering configured Agents, Org mounted Teams, collaborator entries and collaborator-Team members (task copies excluded) | New port operation in all three roots |
| `MessageRecipientResolution.resolve(port, sender, address)` | → placement \| `{catalog: def}` \| not found | Shared |
| `CollaboratorAdmission.ensure(port, {senderRunId, definitions, gateHeld})` | → entries \| `CollaboratorAddError` | Shared |
| Task record `source` | Optional; see Persisted Data | Contracts updated |

## Interface Boundary Check
All interfaces have a singular responsibility and an explicit identity shape. Ambiguity risk is Low: an address maps to
exactly one thing (an in-run instance, or one catalog definition).

## Main Domain Subject Naming Check
| Name | Note |
| --- | --- |
| `list_available_agents` | User's choice; lists agents and teams |
| `CatalogAddressMap` | The catalog's address space within a run |
| `CollaboratorAdmission.ensure` | Replaces `CollaboratorMentionAdmission` (renamed; it is no longer mention-only) |
| `MessageRecipientResolution` | Ordered resolution steps |
| Task record `source` | Definition snapshot for a catalog copy |

## Existing Capability / Subsystem Reuse Check
| Need | Reuse |
| --- | --- |
| Eligibility | `CollaboratorCandidatePolicy` (extended: `listEligible` keeps in-run entries) |
| Entry and source building | `CollaboratorEntryBuilder` |
| Validation | `RunModelSelectionValidator` |
| Hosting | Existing per-root collaborator hosting (predecessor SR-010) |
| Copy activation | Task lifecycle and adapters |
| Tool exposure | The `publish_artifacts` pattern |

## Subsystem / Capability-Area Allocation
| Area | Owns | Decision |
| --- | --- | --- |
| `agent-collaboration/collaborators/` | Admission (split), address map, resolution helper, policy listing | Extend |
| `agent-tools/` (new `agent-discovery/`) | `list_available_agents` tool and MCP provider | Create |
| Team, Org and Agent roots | Gate wiring; resolver use; catalog placements; source on records | Extend |
| `run-history` schemas and contracts | Task `source` | Extend |
| `agent-execution` exposure and prompt; the collaboration LLM contract | Exposure flag; wording | Extend |
| Web | Selectors for `source` | Extend |

## Draft File Responsibility Mapping
Folded into the final mapping below.

## Reusable Owned Structures Check
| Structure | File |
| --- | --- |
| `CatalogAddressMap` | `agent-collaboration/collaborators/catalog-address-map.ts` |
| `MessageRecipientResolution` | `agent-collaboration/collaborators/message-recipient-resolution.ts` |
| `TaskExecutionSource` type and schema | `run-history/domain/run-execution-tree-shared-records.ts` (+ schemas) |

## Shared Structure / Data Model Tightness Check
`TaskExecutionSource` has one meaning: a definition snapshot for a catalog copy. Its fields match the collaborator
entry's definition fields without identities. No overlap: it never appears on configured or collaborator-sourced copies.

## Final File Responsibility Mapping
### Server
| File | Change |
| --- | --- |
| `agent-collaboration/collaborators/catalog-address-map.ts` (new) | Deterministic mapping. Base slug if unique among the eligible catalog and not in use by another definition; otherwise `base_<hash6>` for every colliding definition. In-run definitions map to their stored address |
| `agent-collaboration/collaborators/collaborator-address-allocator.ts` | Removed (keeping only `collaboratorSegmentForName`, which moves into the map) |
| `agent-collaboration/collaborators/collaborator-mention-admission.ts` → `collaborator-admission.ts` | `ensure`. The note composition moves to the `@` callers (team, org and agent-collaboration stream handlers, `AgentRunCommandCoordinator`) |
| `agent-collaboration/collaborators/collaborator-candidate-policy.ts` | `listEligible(port)`: the kind exclusions of `@`, with in-run entries kept. **In-run address rule (AR-002):** one entry per definition; its address is chosen from `inRunPlacementsByDefinition()` by precedence: a configured Agent placement or Org mounted Team, then a collaborator entry, then a collaborator-Team member. Ties go to the lexicographically smallest address |
| `agent-collaboration/collaborators/message-recipient-resolution.ts` (new) | Ordered steps 1–3; index port interface |
| `agent-team-execution/services/team-recipient-resolver.ts`, `team-execution-index.ts` | Implement the index port (`teamInstancesOf(sender)`, `memberOfInstance(teamRunId, address)`, `getMessagePlacement`); delegation adds the catalog placement |
| `agent-team-execution/domain/root-team-run.ts` | Delegate resolution to the helper; gate-internal ensure; `listAvailableAgents`. **Net size must not grow**: move delivery and resolution code into `services/team-run-message-delivery.ts` (new) |
| `agent-org-execution/domain/agent-org-run.ts`, `agent-org-execution-index.ts`, `agent-org-task-source-resolver.ts` | Same as the Team root |
| `agent-run-collaboration/domain/agent-run-collaboration-root.ts`, `services/agent-run-collaboration-recipient-resolver.ts`, `-execution-index.ts`, `-task-source-resolver.ts` | Same; the host stays reachable by its address |
| `agent-team-execution/task-delegation/team-task-source-resolver.ts`, `team-task-execution-adapter.ts`; Org and Agent adapters | `source` first; persist `source` on the record |
| `run-history/domain/run-execution-tree-shared-records.ts`, `run-history/store/run-execution-tree-shared-record-schemas.ts` | `TaskExecutionSource`; optional parse; exact write |
| `agent-tools/agent-discovery/list-available-agents-tool.ts`, `…-contract.ts` (new) | Local tool (registry) bound to the member context |
| `agent-tools/mcp/providers/list-available-agents-mcp-adapter-provider.ts` (new) | MCP exposure |
| `agent-execution/shared/runtime-agent-tool-exposure.ts`; Claude and Codex tooling options | `listAvailableAgentsEnabled` |
| `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`, `agent-run-collaboration/prompt/standalone-collaboration-instruction.ts`, `send-message-to-tool-contract.ts`, `task-delegation-tool-contract.ts`, `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` (guidance line) | REQ-009 wording |
| Contracts: `autobyteus-team-stream-contracts`, `autobyteus-collaboration-stream-contracts` | Task DTO `source` |

### Web
| File | Change |
| --- | --- |
| `services/collaborators/agentSourceSelectors.ts` | A task copy's `source` is the first source |
| Team, Org and Agent-root view indexes, hydration | Pass `source` through |

## Applied Patterns
- **Port:** the resolution index port.
- **Pure mapper:** `CatalogAddressMap`.
- **Strategy:** source resolvers (existing).

## Target Subsystem / Folder / File Mapping
As in the final mapping. New folder: `agent-tools/agent-discovery/` (it owns the discovery tool, a separate concern from
communication and delegation tools).

## Folder Boundary Check
- `agent-tools/agent-discovery/` is a transport/tool layer with a clear boundary. Low risk.
- The new collaborator helpers are off-spine, pure and port-based. Low risk.

## Concrete Examples / Shape Guidance
| Topic | Good | Avoided |
| --- | --- | --- |
| Address map | Catalog has "Code Reviewer" (def A) and "Code Reviewer" (def B) → `/code_reviewer_3f9a1c`, `/code_reviewer_b20e77`. Only one exists → `/code_reviewer` | First-free `_2` (order-dependent) |
| Unknown address | `send_message_to("/no_such_team")` → normal not found | Stale-address machinery for unsupported mid-run catalog edits |
| Instance-relative | Copy #1's `solution_designer` → `/software_engineering_team/implementation_engineer` → copy #1's member; copy #2 the same for its own | Run-wide or mounted-team resolution |
| Bring-in | `send_message_to("/product_team")` (not in run) → ensure → Offline row → start → deliver → `target_agent_run_id` = coordinator | A separate `add_collaborator` step |
| Catalog delegation | `delegate_task("/product_team")` ×2 → two task copies with `source`; no collaborator row | Creating the collaborator as a side effect |

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Decision |
| --- | --- |
| Keep the first-free allocator for `@` | Rejected: one map for all |
| A migration to add `source` to old copies | Rejected: absence is truthful |
| Preserve Org copy → mounted-team routing | Rejected: user-approved behavior change (REQ-007) |

## Derived Layering
Unchanged.

## Change / Refactor Sequence
1. Contracts and records: task `source`; DTOs; `COLLABORATOR_ADD_FAILED` in the `send_message_to` result.
2. `CatalogAddressMap` (pure, with tests); remove the allocator; `@` admission uses the map.
3. Admission split (`ensure`, plus the note at the `@` call sites). `@` behavior unchanged (regression tests).
4. `MessageRecipientResolution` plus index ports in the three roots. Implement step 1 (instance-relative) first and
   verify the Org behavior change; then steps 2–3.
5. Gate-internal ensure in the delivery paths. Extract `team-run-message-delivery.ts`.
6. Catalog delegation: placements, sources, adapters, restore.
7. `list_available_agents`: local tool, MCP provider, exposure, `Root.listAvailableAgents`.
8. Wording (REQ-009) on every runtime.
9. Web selectors.
10. Docs:
    - `agent_communication.md`: the new `send_message_to` meaning and instance-relative resolution;
    - `agent_tools.md`: the new tool;
    - `agent_team_execution.md` and `agent_orgs.md`: the REQ-007 behavior change;
    - `agent_run_collaboration.md`.

## Key Tradeoffs
- **A hash suffix only on collision** keeps most addresses readable (`/product_team`) and distinct. Colliding names
  get less pretty addresses.
- **A per-copy `source` snapshot** duplicates definition data across copies. Each copy is self-contained and records the
  exact definition it ran with. This was preferred over a shared table.
- **Admission inside delivery** lengthens the first message (one tree write). It only happens once per collaborator.

## Risks
- Gate re-entry or deadlock if the internal ensure path isn't used (escalation trigger).
- The Org behavior change (REQ-007) could surprise authored Org workflows that relied on copies reaching the mounted team.
  It is documented and user-approved.
- MCP exposure of a context-bound opt-in tool on AGY and ACP must be verified live.
- Prompt-change regressions: the existing prompt snapshot tests are updated.

## Guidance For Implementation
Tests:
- **The address map:** unique names, collisions (all colliding entries get suffixes). Listing twice with an unchanged catalog gives identical addresses. An unknown address returns not found. **AR-005:** a standalone run that only lists has no `collaboration/` package and no `hasCollaboration` flag. **AR-002:** in-run precedence and one entry per definition, in-run stored
  addresses win.
- **`@` regression:** same instance, note unchanged.
- **First `send_message_to` to a listed address:** brings in (Offline, then starts) and delivers. A second message
  reaches the same run IDs. Two concurrent first messages produce one instance. A failure returns
  `COLLABORATOR_ADD_FAILED` and writes nothing. By run ID, an unknown run creates nothing.
- **Catalog `delegate_task` ×3:** three copies with `source`, no collaborator. Restore after Stop and reopen.
- **AR-003:** an address inside the sender's instance prefix that has no member returns not found, with no run-wide or catalog fall-through, and never reaches another copy.
- **REQ-007 in Team, Org and Agent roots:** collaborator team, task copy, two parallel copies, and an Org copy of a mounted
  team all stay within their own instance. Outside-team addresses are unchanged. Configured Org handoffs are unchanged.
- **Anyone:** a collaborator member and a copy member can each bring in and delegate.
- **`list_available_agents`:** exposure only when selected, on every runtime. Output shape. Exclusions equal to `@`.
  In-run addresses.
- **Wording:** snapshots of the prompt and tool descriptions on every runtime.
- **Web:** a catalog copy's rows and context come from `source`.
