# Design Spec — cross-scope-agent-mentions

## Solution And Approval Basis

- **Current solution revision ID:** `SR-010`. It revises SR-009 for ARCH-REV-003 (AR-006–AR-008).
- **Originally:** `SR-009`. This is a design revision for the approved requirements change SR-008 and
  RD-004.
  - It supersedes SR-005–SR-007. The SR-007 text is archived at `design-history/design-spec-SR-007.md`.
- **Approved requirements:** `requirements-doc.md`, Approved SR-008 (2026-10-01).
  - User approval of the requirements change: "approved. ask product prototyper to update UI thanks".
  - D-R1 and D-R2 were accepted as recommended.
  - RD-004 (REQ-014/AC-016) was agreed by the user in the Product review ("okayyyy. agreed").
- **Behavior-defining supplement:** the revised `ui-ux-spec.md` with VIS-001–015.
  - Path: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/`.
  - User confirmation (2026-10-01): "…If you checked yourself everything's right then you're done. Yeah, it's correct."
  - The SHA-256 hashes of the 15 references were verified.
- **User-confirmed technical shape**, decided in conversation on 2026-09-30 and 2026-10-01:
  - The tree field is `collaborators`.
  - The standalone folder is `collaboration/`.
  - There is **one instance per collaborator**. Its run IDs are stored **in the `collaborators` entry**, and not in
    `taskExecutions` ("no need to put in the task execution anymore").
  - Collaborators are reached with `send_message_to`. `delegate_task` stays available for an explicit extra copy.
- **Design status:** `Ready`.
- **Investigation notes:** `investigation-notes.md`, evidence E-01–E-20.
- **Workspace:**
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions`, branch
    `codex/cross-scope-agent-mentions`.
  - Base `origin/personal` @ `8caa610ff`. The implementation of SR-007 is at `5dcc5dc82` and is the starting point.
  - Finalization target: `personal`.

### SR-009 delta versus the implemented SR-007 (read this first)

| Area | SR-007 (implemented) | SR-009 (target) |
| --- | --- | --- |
| Collaborator entry | Definition, settings snapshot and layout; **no run IDs** | Same fields **plus its single execution identity**. Agent: `agentRunId`, `platformAgentRunId`. Team: `teamRunId`; `members[]` with `agentRunId`/`platformAgentRunId`; the Team's own `taskExecutions` |
| When the instance exists | At the agent's `delegate_task` (a task execution in root `taskExecutions`) | At **admission** (the user's send). Run IDs are allocated and persisted, and the handles are published Offline. The runtime starts on the first message (`ensureReady`) |
| How agents reach it | `delegate_task`; `send_message_to` to the address is rejected with a hint | `send_message_to` by address or run ID. It resolves like a configured member or a mounted Team, and teammates resolve to the same instance (fixes DI-001) |
| `delegate_task` to a collaborator address | Starts the collaborator | Starts an **extra copy**: an ordinary task execution with the system task notice (REQ-013) |
| Failure to add | `delegate_task` returns null; the client derives the notice | Admission checks runnability **before** committing. On failure the send is rejected with a typed result, nothing is posted, and the client keeps the draft and shows the notice (REQ-008, D-R1) |
| "In the run" (candidate policy) | A collaborator counts once it has a task execution | Every collaborator entry counts (an entry only exists after a successful add) |
| Hosting and routing | Root task lifecycle | Each root hosts collaborators **in the backend that already routes its commands** (AR-006): the Org and the Agent root use `rootAgents.prepareConfigured` / `teams.prepareConfigured` with `hostKind` routing; the Team root uses its root `FlatTeamExecutionManager` (collaborator Agents) and a collaborator TeamRun registry under it. See "Collaborator Hosting And Routing" |
| Agent-to-agent message display | User-style bubble | "From <Sender>:" live and after reopen (REQ-014). The sender is recorded on the stored user trace |
| Web rows | Collaborator rows came from task executions | Collaborator rows come from `collaborators`, with the approved task-row look and Offline status (D-R2). A Team collaborator is expanded once when it appears |

Everything else from SR-007 is unchanged and restated below:
- the `@` menu, chips and candidates query;
- the Agent root, its lifetime, host wake (DS-009), `resolveCommandReadyRoot` (AR-001) and context-file owners (AR-002);
- always-on tools and `teamScoped` (AR-003);
- the split between message and delegation resolution, and the per-root task source resolvers;
- the move of the Org hosting classes;
- `launchPurpose`;
- the persisted-data decision.

## Current-State Read

At `5dcc5dc82`, the SR-007 implementation is in place:
- `collaborators` lists without run IDs in Team, Org and Agent trees;
- the Agent root (`src/agent-run-collaboration/`);
- the collaborators module (`src/agent-collaboration/collaborators/`);
- the moved backends;
- the always-on exposure;
- the web menu, chips, rows and Team tab.

Code-review and API/E2E findings against it:
- **DI-001** (E-20): a collaborator Team's handoffs by address cannot be delivered.
- **CR-003:** a Team member's send that carries mentions never settles on the client. The settle is keyed on content,
  but the server rewrites the content.
- **CR-004** (F-02, F-03, F-04): rendering fidelity.

Product precedents that SR-009 reuses (E-08, E-13, E-19):
- An **Org** already hosts root-level configured Agents (`RootAgentExecutionRegistry.prepareConfigured`) and mounted Teams
  (`RootTeamExecutionDirectory.prepareConfigured` with `prepareConfiguredAgents: false`).
- Their run IDs are allocated at launch and persisted in the tree. They start on their first message
  (`ConfiguredAgentExecutionHandle.ensureReady`) and restore without preparing a runtime.
- Messages to their addresses resolve through `getConfiguredPlacement`, so mounted-Team members reach their teammates.
- RD-004 (E-20, Product finding): a `send_message_to` delivery reaches the receiver as `MEMBER_INPUT_MESSAGE` with
  `inputOrigin: "inter_agent_delivery"` and `senderAgentRunId`. The web `memberInputMessageHandler` renders it user-style.
  Stored conversations replay it as role `user`.
  - `RawTraceItem` already has an optional `senderId` (`autobyteus-ts/src/memory/models/raw-trace-item.ts`). Today it is
    used for system-task notifications only.
  - The web `InterAgentMessageSegment` ("From <sender>:") exists but is not fed for Team and Org deliveries.

## Task Size And Architectural Risk (Mandatory)

- **Task size:** `Large`. It is the SR-007 scope plus:
  - collaborator execution hosting in three roots;
  - admission-time allocation and validation;
  - entry and DTO shape changes;
  - message resolution;
  - RD-004 across memory recording, projections and web rendering.
- **Architectural risk:** `High`. Persisted shapes, shared contracts, runtime ownership (new hosted executions in Team and
  Agent roots), concurrency (admission plus publication plus first-message start) and a product-wide presentation change.
- **Escalation triggers:**
  - a runtime cannot start a lazily published collaborator handle in `fresh` mode on its first message;
  - `RunModelSelectionValidator` cannot validate a Team collaborator's members in one batch;
  - a runtime's user-trace recording cannot carry `senderId`.

## Architecture Investigation Evidence

| Source | Path / Reference | Observation | Decision | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Org hosting | `agent-collaboration/execution/backends/root-agent-execution-registry.ts#prepareConfigured`, `root-team-execution-directory.ts#prepareConfigured` (moved in SR-007); E-13 | Root-level configured Agents and mounted Teams with lazy activation already exist | The Org and Agent roots host collaborators in their existing `rootAgents`/`teams`; the Team root extends its root `FlatTeamExecutionManager` (AR-006) | None |
| Lazy start | `configured-agent-execution-handle.ts#ensureReady`; E-08 | Messaging starts an Offline configured member with its pre-allocated run ID | Collaborators use the same handles. `send_message_to` still allocates nothing | None |
| Launch validation | `agent-org-run-service.ts` → `RunModelSelectionValidator.validateMany` (`llm-management/services/run-model-selection-service.ts`) | Batch runtime/model/workspace validation per placement | Admission validates every new collaborator placement (an Agent, or each Team member, with the root settings) before committing | None |
| Run ID allocation | `AgentRunIdentityAllocator.allocateForAgentDefinition`; `team-run-id.ts#generateTeamRunIdForDefinitionName`; `TaskTeamRunIdentityFactory` | Existing allocators | Admission allocates through them; the three-family location service guarantees uniqueness | None |
| Message resolution | `root-team-run.ts#resolveMessageRecipient`, `agent-org-run.ts`, `agent-run-collaboration-recipient-resolver.ts`; E-20 | Configured or host only | Add collaborator executions to each root's index and resolver | None |
| DI-001 evidence | `api-e2e-evidence/c-02-observation.log` | Handoff to `/obs_team/mate` not found | Resolved by construction | None |
| CR-003 | `agent-team-stream-handler.ts:171-194`; web `TeamStreamingService.ts#resolveTeamSend` | Settle is keyed on content | Settle on (`agent_run_id`, `message_id`, `dedupe_key`) | None |
| RD-004 | `member-input-presentation-event-builder.ts`, `raw-trace-item.ts`, web `memberInputMessageHandler.ts`, `InterAgentMessageSegment.vue` | Sender is available live; no sender on stored user traces | Record `senderId` on inter-agent user traces; project and render "From <Sender>:" | Each runtime's recording path must be confirmed (escalation trigger) |
| Migration rules | `docs/design/data_migration_guideline.md` §3; E-14 | Tolerant read | No migration (see Persisted Data) | None |

## Intended Change

1. **Collaborator entries carry their execution.** Each root's `collaborators[]` entry is one instance:
   - Agent entry: `{kind:"agent", address, agentDefinitionId, agentRunId, platformAgentRunId, launchConfiguration,
     addedAt, addedViaAgentRunId}`.
   - Team entry: `{kind:"agent_team", address, teamDefinitionId, teamRunId, coordinatorAddress, defaultLaunchConfiguration,
     handoffs, members:[{address, agentDefinitionId, agentRunId, platformAgentRunId}], taskExecutions, addedAt,
     addedViaAgentRunId}`.
2. **Admission adds the instance at send time.** In the root operation gate:
   - validate the mentions (policy);
   - validate runnability with the root settings;
   - allocate run IDs;
   - commit all new entries in one tree write;
   - publish the hosted handles (Offline);
   - emit `collaborator_added`;
   - compose the mention note.

   The caller then posts the message. A failure rejects the whole send and nothing is posted.
3. **Collaborators are hosted** in each root's existing command-routing backend (see "Collaborator Hosting And Routing"):
   - Agent collaborators use configured-agent handles.
   - Team collaborators use a mounted-style `TeamRun` with lazily prepared members.
   - The host restores them with the root, without preparing a runtime, and terminates them with the root.
4. **Messaging resolves collaborators.** In each root, `resolveMessageRecipient` checks:
   1. the configured placement;
   2. a collaborator Agent;
   3. a collaborator Team, which goes to its coordinator;
   4. a collaborator Team member.

   Delivery goes through the existing communication engine and handles, so the first message starts the collaborator.
   Teammates inside a collaborator Team resolve to their own instance.
5. **Delegation:** `resolveDelegationPlacement` returns a configured placement or a collaborator. Delegating to a collaborator
   starts an **extra copy**: an ordinary task execution whose source is projected from the entry (REQ-013). A collaborator
   Team's own delegations go to that Team's `taskExecutions`, under the existing host rules.
6. **Standalone Agent root** (unchanged from SR-007): lazy package, lifetime, host wake, `resolveCommandReadyRoot`, context
   files.
7. **Always-on tools and `teamScoped`** (unchanged). Collaborator Team members are Team-scoped; a collaborator Agent directly
   under an Agent root is not.
8. **RD-004:** the sender is recorded on stored inter-agent user traces and projected into replay. The web renders every
   `inter_agent_delivery` member input with `InterAgentMessageSegment` ("From <Sender>:"). The sender's display name comes
   from the shared formatter.
9. **Frontend:**
   - rows come from `collaborators`, and a Team collaborator is expanded once (F-02);
   - one shared name formatter (F-03);
   - the collaborator view header controls and placeholder (F-04);
   - Team send settles on identity (CR-003);
   - the failure notice comes from the send rejection, and the draft is kept;
   - RD-004 rendering.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior & Evidence | Target Outcome | Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, AC-001/011 | `@` in a live composer | New chat only (E-04) | Server candidates; in-run = configured members plus all collaborator entries plus member Agents of collaborator Teams | DS-007 |
| BEH-002 | User | REQ-002, AC-002 | Send with chips | — | Structured `mentions`; server-composed note; inline chips | DS-001 |
| BEH-003 | System | REQ-003/004, AC-003/004 | Admission | Only configured members are reachable (E-08) | One instance per definition per run, allocated and published Offline before the agent's turn | DS-001 |
| BEH-004 | System | REQ-005, AC-005 | `send_message_to(collaborator address or run ID)` | Configured-only resolution (E-20) | Resolves to the collaborator; it starts on first message; the message is projected in the Team/Org tab | DS-002 |
| BEH-005 | System | REQ-003, AC-003 | A collaborator Team member's authored handoff | Not found (DI-001) | Resolves to a teammate in the same instance | DS-002 |
| BEH-006 | Operational | REQ-006, AC-006 | Stop, reopen, message | Configured-member restore (E-08) | Same run IDs, Offline, conversation continued | DS-004, DS-002 |
| BEH-007 | User/System | REQ-007, AC-007 | Standalone run with collaborators | (SR-007) | Agent root, package, stream, rows, Team tab | DS-004, DS-006 |
| BEH-008 | User | REQ-008, AC-008 | Unrunnable mention | (SR-007: `delegate_task` null) | Send rejected, draft kept, notice | DS-001, DS-008 |
| BEH-009 | User | REQ-009, AC-009 | Any task row | "Started by" line | Product-wide row change (SR-007 implemented) | DS-006 |
| BEH-010 | User | REQ-010, AC-010 | Keyboard | (SR-007) | Combobox semantics | DS-007 |
| BEH-011 | User | REQ-011, AC-012 | Open a collaborator and send | (SR-007) | Context from the entry; sending starts it if Offline | DS-006, DS-002 |
| BEH-012 | Contract | REQ-012, AC-014 | Bootstrap | (SR-007) | Unchanged | DS-005 |
| BEH-013 | System | REQ-013, AC-015 | `delegate_task(collaborator address)` | — | Extra task copy with the system task notice | DS-003 |
| BEH-014 | User | REQ-014, AC-016 | Any agent-to-agent delivery shown in a conversation | User-style (E-20) | "From <Sender>:" live and after reopen; old traces without a sender are unchanged | DS-010 |
| BEH-015 | Preserved | AC-013 | New chat `@`, old runs, Org task-Team copy addressing (E-20) | — | Unchanged | — |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Relationship | Status |
| --- | --- | --- | --- |
| `…/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` + VIS-001–015 | Normative UI | All UI must match. The prototype's local run is not architecture. Addresses in the spec prose are display renderings (see requirements) | Approved (user) 2026-10-01 |
| `…-sr008/prototype-ticket.md`, `prototype-change-log.md` (PC-028–032), `ui-behavior-test-matrix.md`; `/Users/normy/autobyteus_org/autobyteus-web-prototype/mock-boundaries.md` | Decisions RD-001–004, changes, behavior matrix, mocked boundaries | API/E2E input | Final |
| `code-review-report.md` (round 4), `api-e2e-execution-coverage-report.md`, `api-e2e-evidence/` | DI-001, CR-003, CR-004 evidence | Findings this revision addresses | Current |

## Task Design Health Assessment (Mandatory)

- **Change posture:** `Larger Requirement`, now a `Behavior Change` relative to the SR-007 implementation.
- **Current design issue found:** `Yes`.
- **Root cause classification:** `Missing Invariant`. "A collaborator in a run is a reachable member of that run" was
  missing. SR-007 modeled collaborators as delegation sources only, so their own Team workflow could not address
  teammates (DI-001).
- **Refactor needed now:** `Yes`. Collaborators move from task executions to hosted, configured-like executions. They reuse
  the Org hosting pieces through one root-neutral host. Admission gains allocation and runnability validation. Message
  resolution is extended in three roots.
- **Evidence:** E-08, E-13, E-19, E-20; DI-001.
- **Design response:** see Intended Change. The SR-007 pieces that are now obsolete are listed in the Removal plan.
- **Deferred:**
  - E-20: Org task-Team copies address the configured members. This is out of scope and a separate-ticket candidate.
  - Token roll-up for Agent-root collaborators.

## Terminology

- **Collaborator:** one instance of a shared Agent or Agent Team definition added to a run by a mention. It is recorded in
  `collaborators[]` with its run IDs. It is not configured membership and not a task execution.
- **Collaborator execution:** the hosted handle or handles of a collaborator. One configured-agent handle for an Agent; one
  `TeamRun` with member handles for a Team. They are Offline until first contact.
- **Extra copy:** a task execution started by `delegate_task` at a collaborator's address.
- **Agent root, host, mention note, eligible run:** as in SR-007. The mention note now says to use `send_message_to`.

## Design Reading Order

This document follows the template order.

## Legacy Removal Policy (Mandatory)

Policy: `No backward compatibility; remove legacy code paths.` The SR-007 implementation was never released. Its
collaborator-as-task-execution paths are replaced, not kept (see the Removal plan). The SR-007 removals (the
single-resolver split and the configured-only source lookups) stay done.

## Persisted Data / State Transition Decision (Mandatory)

- **Stored subjects:**
  - Team and Org trees (`collaborators` on the root);
  - the Agent-root package `memory/agents/<id>/collaboration/collaboration_tree.json` (`collaborators` plus
    `taskExecutions`), its `communication_messages.json` and child memory;
  - `run_metadata.json` (`launchPurpose`);
  - the standalone catalog (`hasCollaboration`);
  - **raw traces** (`raw_traces_*.jsonl`): the optional `senderId` on `user` traces.
- **Changes:**
  - Collaborator entries gain execution identity fields (required within an entry).
  - Inter-agent user traces gain `senderId`.
- **Readers and writers:**
  - Tree readers stay tolerant: a missing `collaborators` means `[]`. An entry missing required fields fails tree
    validation; this shape has never been released.
  - The raw-trace reader already projects the optional `senderId`.
- **Semantics:**
  - Absence of `collaborators` means none.
  - Absence of `senderId` on a `user` trace means a user message, or an older inter-agent message without a recorded
    sender. It is shown user-style; no sender is guessed (REQ-014).
- **Released predecessors:**
  - None for `collaborators`. Neither SR-007 nor SR-009 shapes were ever released; developer and test data from SR-007 is
    disposable.
  - Existing inter-agent traces: these are released history without a sender, kept as they are.
- **Decision:** `Directly Usable — No Migration`.
  - Data guideline §3: optional fields whose absence has a truthful meaning, and new families with no released predecessor.
  - Downgrade risk: an older build drops `collaborators` on save. Not supported (P-003).
- **Invariants checked by the tree readers** (reject the tree otherwise):
  - collaborator addresses are unique and do not collide with configured addresses;
  - run IDs are unique across members, collaborators and task executions;
  - a Team entry's coordinator is one of its members;
  - delegators of task executions resolve within the tree.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-002/003/008 | Send with mentions | Collaborators committed and published, content composed, or a typed rejection | The root | Authorization and creation happen before the agent's turn |
| DS-002 | Primary | BEH-004/005/006/011 | `send_message_to` by address or run ID, or a user send to a collaborator | Delivery (first message starts it) plus projection | Root communication engine and resolver | The way collaborators are reached |
| DS-003 | Primary | BEH-013 | `delegate_task(collaborator address)` | Extra task copy | Root task lifecycle | REQ-013 |
| DS-004 | Bounded | BEH-006/007 | Root restore or stop | Collaborator executions republished Offline, or terminated | Root and its hosting backends | Lifecycle |
| DS-005 | Bounded | BEH-012 | Config build | Tools and prompt | Standalone lifecycle and exposure builder | Unchanged from SR-007 |
| DS-006 | Return | BEH-007/009/011 | Snapshot or event or history | Rows and contexts | Web view indexes | F-001 |
| DS-007 | Primary | BEH-001/010 | `@` | Options | `CollaboratorCandidatePolicy` | Unchanged except the in-run rule |
| DS-008 | Bounded | BEH-008 | Typed admission rejection | Notice, draft kept | Web send path | D-R1 |
| DS-009 | Return | BEH-007 | Child message to the Agent-root host | Host woken and delivered | Agent root | Unchanged (SR-006) |
| DS-010 | Return | BEH-014 | Inter-agent delivery | "From <Sender>:" live and replay | Memory recording, projection, web handler | RD-004 |

## Primary Execution Spine(s)

- **DS-001:**
  `composer → transport SEND_MESSAGE{mentions} → handler / AgentRunCommandCoordinator → Root.admitCollaboratorMentions`
  → `[gate: CollaboratorMentionAdmission.plan → CollaboratorRunnabilityValidator → CollaboratorIdentityAllocator →
  root tree commit → root.publishCollaborators(new entries) (per-root backends, lazy) → publish collaborator_added]`
  → `{content}` or `COLLABORATOR_ADD_FAILED` → the caller posts or rejects.
- **DS-002:**
  `send_message_to(address) → Root.resolveMessageRecipient (configured | collaborator agent | collaborator team → coordinator
  | collaborator team member) → RootCommunicationEngine.deliver → handle.postMessage → ensureReady (fresh/restore) → AgentRun`.
- **DS-003:**
  `delegate_task(collaborator address) → resolveDelegationPlacement → RootTaskExecutionLifecycle → <Root>TaskSourceResolver
  (projects the entry) → prepareTaskAgent / taskTeams.create → tree write → TASK_EXECUTION_STARTED`.
- **DS-010:**
  `communication deliver → AgentInputUserMessage{metadata.input_origin:"inter_agent_delivery", sender_agent_id}`
  → `runtime memory recording writes a user trace with senderId → replay projection emits an inter-agent item {senderAgentRunId,
  senderAddress}`. Live: `MEMBER_INPUT_MESSAGE(inter_agent_delivery) → web memberInputMessageHandler → InterAgentMessageSegment`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | In one root operation gate: the policy checks each mention. Existing collaborator entries for the same definition are reused (no new allocation). For new ones, the runnability validator runs `RunModelSelectionValidator.validateMany` over every new placement (the Agent, or each Team member) with the root launch configuration, and checks that definitions resolve (the Team through `FlatTeamDefinitionResolver`). Any failure returns `COLLABORATOR_ADD_FAILED {name, reason}` before any write. Otherwise identities are allocated, all entries are committed in one atomic tree write, the root's hosting backends publishes Offline handles (no runtime preparation), and `collaborator_added` is emitted. Admission returns `{content: text + mention note}`. The caller posts through its existing command path: Team and Org through `executeAgentCommand`, standalone inside `AgentRunCommandCoordinator`, Agent-root children through the collaboration stream handler. If the post fails after a successful admission, the collaborator stays; it is valid and reusable. | The root |
| DS-002 | The resolver maps the address to exactly one execution: a configured member, a collaborator Agent's run, a collaborator Team (its coordinator) or a collaborator Team member (that member's run). A run-ID target in the same root resolves the same way through the index. Delivery uses the existing communication engine. The handle's `ensureReady` starts an Offline collaborator in `fresh` mode on its first message, or in `restore` mode after it has been published once, the same as Org members. Teammates inside a collaborator Team are executions of the same `TeamRun`, so authored handoffs resolve (DI-001). The communication record goes to the Team/Org tab. | Root communication engine |
| DS-003 | Unchanged lifecycle. The source resolver projects the collaborator entry into a source node with fresh identities. The copy is an ordinary task execution under the existing host rules, with the system task notice. | Root task lifecycle |
| DS-004 | Root restore: the root rebuilds collaborator executions in its hosting backends from the entries in `restore` mode without preparing runtimes (the Org restore rule) and publishes them Offline. Root stop: those executions join the root's frozen termination scope. The Agent root follows its SR-006/007 lifetime. | Root, the root's hosting backends |
| DS-008 | Transports return a typed rejection: the Team/Org stream error and the agent-stream `AGENT_COMMAND_ACK` with code `COLLABORATOR_ADD_FAILED` and payload `{collaborator_name, reason}`. For a send carrying `mentions` only (AR-007; sends without mentions are unchanged, AC-013), the web send path does not clear the composer until acceptance. On this rejection it keeps the text and chips, shows the notice, and creates no local user message. | Web send path |
| DS-010 | The root's inter-agent runtime message builders already set `input_origin` and `sender_agent_id` in the metadata (`inter-agent-message-runtime-builders.ts`, `root-communication-runtime-builder.ts`). Native AutoByteus memory recording and the server's external-runtime recording (`runtime-memory-event-accumulator.ts`) copy `sender_agent_id` into the user trace's `senderId` when `input_origin` is `inter_agent_delivery`. The run-view projections (agent, Team member, Org member, Agent-root member) emit an inter-agent conversation item when a user trace has `senderId`, resolving `senderAddress` through the root's location index. On the web, `memberInputMessageHandler` (live) and the replay hydration route `inter_agent_delivery` inputs to the inter-agent segment. The display name comes from the shared name formatter, applied to the sender address basename or the tree context. | Memory recording, projections, web |

## Spine Actors / Main-Line Nodes

Transports; `AgentRunCommandCoordinator`; roots (`RootTeamRun`, `AgentOrgRun`, `AgentRunCollaborationRoot`);
`CollaboratorMentionAdmission`; `CollaboratorRunnabilityValidator`; `CollaboratorIdentityAllocator`;
root hosting backends; root resolvers; `RootCommunicationEngine`; `RootTaskExecutionLifecycle`; memory recorders;
run-view projections; web send path and handlers.

## Ownership Map

- **Root:**
  - owns its tree, including `collaborators` and their execution identity;
  - owns the operation gate and the admission ordering;
  - owns message and delegation resolution;
  - owns publication and termination.
- **`CollaboratorMentionAdmission`:** stateless. It returns `{reuse[], plan[]}` and never writes, allocates or posts.
- **`CollaboratorRunnabilityValidator`** (new): checks that a planned entry can run with the root settings, and returns a
  typed reason.
- **`CollaboratorIdentityAllocator`** (new): turns a plan into an entry with execution identities, using the existing
  allocators.
- **Each root's hosting backends** own the collaborator handles and TeamRuns. Org and Agent root: `rootAgents` and
  `teams`. Team root: the root `FlatTeamExecutionManager` and its `CollaboratorTeamExecutionRegistry`. The root owns
  publication, restore and termination; the backends own no tree writes.
- **`collaboratorMentionNote`:** owns the note wording, which now says `send_message_to`.
- **Memory recorders:** own `senderId` on user traces.
- **Projections:** own the replay item kind.
- **Web:** owns rendering. It never decides eligibility or composes notes.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind | Must Not Own |
| --- | --- | --- |
| Stream SEND_MESSAGE handlers; `AgentRunCommandCoordinator` (mentions) | `Root.admitCollaboratorMentions` | Validation, allocation, note wording |
| GraphQL `collaboratorMentionCandidates`, `agentRunCollaboration` | Policy; root or stored package | Policy logic |
| `AgentRunCollaborationRootManager.resolveCommandReadyRoot` | Standalone lifecycle plus root | Host restore logic |

## Removal / Decommission Plan (Mandatory)

| Item (SR-007 implementation) | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| Collaborator runs as root `taskExecutions` started by `delegate_task` | Collaborators are hosted instances | Per-root hosting backends; entry identities | In This Change |
| `collaboratorAddressMessageHint` and its rejection in `resolveMessageRecipient` (Team, Org, Agent root) | Collaborator addresses now resolve | Collaborator resolution | In This Change |
| The "in-run = has a task execution" rule in `CollaboratorCandidatePolicy` | Entries exist only after a successful add | Any entry counts | In This Change |
| Web failure-notice derivation from `delegate_task` null results | Failure moves to admission | Typed send rejection (DS-008) | In This Change |
| Web collaborator rows derived from `taskExecutions` | Rows come from `collaborators` | Selectors over `collaborators` | In This Change |
| The "use `delegate_task`" wording in the mention note and the standalone prompt section | `send_message_to` is primary | New wording | In This Change |
| Web content-keyed Team send settle (`TeamStreamingService.resolveTeamSend`) | CR-003 | Identity-keyed settle | In This Change |
| Per-surface name formatting (`a7b4ae621` Agent-root-only) | F-03 | One shared formatter | In This Change |
| User-style rendering of `inter_agent_delivery` inputs | REQ-014 | Inter-agent segment | In This Change |

## Return Or Event Spine(s)

- **`collaborator_added`** (Team stream, Org collaboration stream, Agent collaboration stream). It carries the full entry,
  including run IDs. It is published after the commit and before any presentation event for those runs. The client adds
  the rows (Offline) and the contexts, and expands a Team once.
- **Statuses of collaborator executions** use the existing agent status events and snapshots (Offline until started).
- **The extra copy's `task_execution_started`** is unchanged.

## Bounded Local / Internal Spines

- **Admission (root gate):**
  `plan → validate(new) → allocate(new) → commit tree → root.publishCollaborators(new) → emit collaborator_added → compose`.
  It is all-or-nothing. Publication happens only after a durable commit. If publication fails after the commit, the root
  fail-stops, following the existing root rule for indeterminate publication.
- **Agent-root lifetime and host wake:** as in SR-006/007. Collaborator executions in the Agent root belong to its
  `rootAgents` and `teams` backends and are part of the root's termination scope.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Address allocation | Admission | Unique, stable segment (unchanged) |
| Entry building | Admission | Snapshot of the definition, layout, handoffs and settings (unchanged) plus identities |
| Runnability validation | Admission | `RunModelSelectionValidator` batch plus definition resolution |
| Mention note | Admission and web | Wording; parse for chips |
| Memory layout | Hosting | Agent-root collaborator memory goes under `agents/<host>/collaboration/<teamRunId?>/<agentRunId>`. Team and Org follow the existing rooted layout with the collaborator `TeamRun` as an ancestor |
| Location index (three families) | Allocation, context files, projections | Include collaborator executions |
| Shared name formatter | Web | One function for rows, the Team/Org tab and "From" labels |
| Localization | Web | New strings |

## Collaborator Hosting And Routing (AR-006)

Rule: **collaborators are hosted in the backend that already routes commands, input, liveness and authorization in
that root**, so every existing root operation reaches them without a parallel path.

| Concern | Org root | Agent root | Team root |
| --- | --- | --- | --- |
| Collaborator Agent handle | `rootAgents.prepareConfigured(sourceNode, mode)`, where `sourceNode` is projected from the entry with its stored `agentRunId`/`platformAgentRunId`. Index host = `{hostKind:"root"}` | Same | Root `FlatTeamExecutionManager` (the root TeamRun): a new `addCollaboratorAgent(sourceNode, mode)` registers the node with `FlatTeamMemberConfigResolver` (configured children first, then collaborator nodes) and creates the handle lazily through `ConfiguredAgentExecutionRegistry.getOrCreate`. Index: `executionKind:"collaborator"`, `containingTeamRunId` = root `teamRunId` |
| Collaborator Team | `teams.prepareConfigured({teamNode, mode, prepareConfiguredAgents:false})`. Index host for members = `{hostKind:"team", hostRunId: teamRunId}` | Same | New `agent-team-execution/local/registries/collaborator-team-execution-registry.ts` under the root `FlatTeamExecutionManager`. It is modelled on `RootTeamExecutionDirectory.prepareConfigured` and restore: lazy members, **no idle shutdown**. Its TeamRuns are registered with `teamRunResolver.registerManaged` so `requireTeamRun` finds them. Index: team `executionKind:"collaborator"`; members `executionKind:"collaborator_team_member"`, `containingTeamRunId` = collaborator `teamRunId` |
| `executeAgentCommand` (post, interrupt, approve tool) | Existing `hostKind` routing (`agent-org-run.ts`) | Existing `hostKind` routing | Existing `requireContainingTeamRun(agentRunId).executeDirectAgentCommand`. The root TeamRun finds collaborator Agents through `getConfiguredAgent`; a collaborator TeamRun serves its own members |
| `reserveInput` / `deliverToDirectAgent` | Existing | Existing | Same path as `executeAgentCommand` (`reserveDirectAgentInput` / `deliverToDirectAgent`) |
| Liveness (`isLiveAgent`) and `withLiveLease` | Existing (`rootAgents.isActive` / team active) | Existing | `isLiveAgent`: non-task kinds (`configured`, `collaborator`, `collaborator_team_member`) are live when the containing TeamRun is active. The live lease is a no-op for non-task executions (empty task chain) |
| Authorization (`isCurrentAgent`) | Index plus liveness (existing) | Existing | Unchanged code: an index entry plus `isLiveAgent` now covers collaborators |
| `requireTeamRun` | — | — | `executionKind:"collaborator"` → active TeamRun, otherwise `rootFlatTeam.requireCollaboratorTeam(teamRunId)` (restore), parallel to `requireConfigured` |
| Physical scope and memory | Root-level Agent: `[root]`; Team members: `[teamRunId]` | `agents/<host>/collaboration/...` (SR-007 layout) | Collaborator Agent: root scope (`agent_teams/<root>/<agentRunId>`); Team members: `ancestorTeamRunIds:[collaboratorTeamRunId]` |
| Platform-binding commits | `commitAgentPlatformBindingChange` → `adoptAgentOrgPlatformBinding`, extended to find collaborator entry nodes | Agent-root mutator, same extension | `adoptAgentPlatformBindingInTree`, extended to collaborator entry nodes (Agent and Team members) |
| Status snapshots, events, tokens | Existing root aggregation includes `rootAgents`/`teams` | Existing | `getLeafAgentStatusSnapshots` includes collaborator handles and TeamRuns. Events carry `agent_execution` identities from the index. The token enricher keeps `root_team_run_id` for all Team-root executions |
| Restore | Rebuild from entries in `restore` mode, `prepareConfiguredAgents:false` (the Org rule) | Same | Same, through `addCollaboratorAgent(…, "restore")` and `CollaboratorTeamExecutionRegistry.restore` |
| Termination | Part of `freezeForRootTermination` of `rootAgents`/`teams` | Same | The root TeamRun's `freezeForRootTermination` includes collaborator Agents and collaborator TeamRuns |
| **Extra-copy host rule** (`delegate_task` by a collaborator or to a collaborator address) | Delegator's host (existing): root for a collaborator Agent; the collaborator TeamRun for its members | Same | `TeamExecutionScopeResolver.resolveTargetOwner` (existing): the containing ancestor whose address is the target's parent, else the root. A **root-hosted collaborator Agent** delegating anywhere at root level → root TeamRun (`rootTeam.taskExecutions`). A **collaborator Team member** delegating to `/product_team/*` → that collaborator TeamRun (its entry's `taskExecutions`) |

Tests (in addition to the Guidance list), on a **collaborator Agent and a collaborator Team member in a Team run**:
- a user send starts it and delivers;
- its `send_message_to` report back is authorized and delivered;
- interrupt;
- tool approval and denial;
- `reserveInput` with context files;
- Stop → reopen → send.

## Ownership Boundaries

- Only the root writes its tree. The hosting backends hold handles and never persist.
- A collaborator handle's platform-binding commits use the root's existing `commitAgentPlatformBindingChange` path against
  the entry's member nodes, exactly as configured members do.
- The Agent root still never creates, restores or terminates its host directly (SR-006).

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `Root.admitCollaboratorMentions(focusedAgentRunId, content, mentions)` | Policy, validation, allocation, commit, publication, event, compose | Transports, coordinator | Handlers allocating, publishing or composing |
| `Root.resolveMessageRecipient` / `resolveDelegationPlacement` | Configured and collaborator lookup | Communication, delegation | Direct host lookups by handlers |
| Root hosting backends (`rootAgents`/`teams`; Team root: root `FlatTeamExecutionManager` and `CollaboratorTeamExecutionRegistry`) | Collaborator handles and TeamRuns | The root only | Other code preparing collaborator handles |
| `<Root>TaskSourceResolver` | Source projection (configured or collaborator) | Task adapters | Direct `findTaskConfigNode` |

## Dependency Rules

- `agent-collaboration/collaborators/*` stays port-based. The validator and allocator receive the
  `RunModelSelectionValidator` and allocators as injected ports.
- Collaborator hosting reuses the root-neutral backends (Org, Agent root) or extends the Team root's
  `agent-team-execution/local` registries. There is no new cross-root hosting class.
- `send_message_to` paths never allocate identities. Allocation happens only in admission and in delegation.
- Web: no eligibility logic, no note composition.

## Interface Boundary Mapping

| Interface | Subject | Shape | Notes |
| --- | --- | --- | --- |
| SEND_MESSAGE `mentions` | Mention intent | `{kind, definition_id}[]`, max 8 | Unchanged |
| Admission rejection | Failed add | `COLLABORATOR_ADD_FAILED` with `{collaborator_name, reason}` (agent-stream ack; Team/Org stream error; Agent collaboration stream ack) | New |
| `CollaboratorEntry` DTOs (Team, Org, Agent tree DTOs) | Collaborator instance | As in Intended Change 1 (snake case in the Team DTO, camel case in Org/Agent, as for each family's existing nodes) | Changed |
| `collaborator_added` | Event | `{entry}` | Now carries identities |
| Replay inter-agent item | Stored conversation | `{kind:"inter_agent_message", content, senderAgentRunId, senderAddress, receivedAt, contextFilePaths}` | New item kind in the run-view projection DTOs |
| `Root.publishCollaborators(entries)` / restore wiring | Hosting | Per root (see "Collaborator Hosting And Routing") | Root-internal |
| `collaboratorMentionCandidates`, `agentRunCollaboration`, `/ws/agent-collaboration/:runId`, `resolveCommandReadyRoot`, context-file kinds, `launchPurpose` | — | Unchanged from SR-007 | — |

## Interface Boundary Check

All interfaces have singular responsibilities and explicit identity shapes. Ambiguity risk is Low. Message resolution maps
every address to exactly one execution, because there is one instance per collaborator.

## Main Domain Subject Naming Check

| Subject | Name | Note |
| --- | --- | --- |
| Tree list | `collaborators` | Doc comment: "one instance per entry; its runs are recorded in the entry" |
| Hosting | (no new class) | Reuses the Org's root registry and directory; the Team root gets `CollaboratorTeamExecutionRegistry` |
| Rejection | `COLLABORATOR_ADD_FAILED` | Matches the notice "Couldn't add" |
| Extra copy | (task execution) | No new term |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Hosting lazily started members and Teams | `RootAgentExecutionRegistry.prepareConfigured`, `RootTeamExecutionDirectory.prepareConfigured`, `ConfiguredAgentExecutionHandle`; Team root `ConfiguredAgentExecutionRegistry` / `FlatTeamMemberConfigResolver` | Reuse (Org, Agent root); extend (Team root) |
| Validation | `RunModelSelectionValidator.validateMany` | Reuse |
| Allocation | `AgentRunIdentityAllocator`, `generateTeamRunIdForDefinitionName` | Reuse |
| Delivery and projection | `RootCommunicationEngine` | Reuse |
| Extra copies | Task lifecycle plus source resolvers (SR-007) | Reuse |
| Sender on traces | `RawTraceItem.senderId` | Extend its use |
| "From" rendering | `InterAgentMessageSegment.vue` | Reuse |

## Subsystem / Capability-Area Allocation

| Area | Owns | Decision |
| --- | --- | --- |
| `agent-collaboration/collaborators/` | Policy, admission plan, entry builder, address allocator, **runnability validator, identity allocator**, source projector | Extend |
| `agent-collaboration/execution/backends/` | Existing root-neutral backends (unchanged API) | Reuse |
| `agent-team-execution/local` | Root `FlatTeamExecutionManager` collaborator Agents; `CollaboratorTeamExecutionRegistry` | Extend |
| `agent-team-execution`, `agent-org-execution`, `agent-run-collaboration` | Each root: tree, host instance, resolvers, admission, restore and stop wiring | Extend |
| `agent-memory`, `autobyteus-ts` memory | `senderId` on inter-agent user traces | Extend |
| `run-history` projections | Inter-agent replay item | Extend |
| Contracts | Entry DTOs, rejection, replay item | Extend |
| `autobyteus-web` | Rows from `collaborators`, send rejection, CR-003, F-02/03/04, RD-004 rendering | Extend |

## Draft File Responsibility Mapping

Folded into the final mapping. While drafting, a per-root collaborator hosting class was considered and rejected in favor of
one root-neutral host, to avoid three copies.

## Reusable Owned Structures Check

| Structure | File | Note |
| --- | --- | --- |
| `CollaboratorEntry` (with identities) | `run-history/domain/run-execution-tree-shared-records.ts` + schemas | One definition for three families |
| Shared name formatter | `autobyteus-web/utils/collaboration/memberDisplayName.ts` | Used by rows, the tab and "From" |
| Mention note | `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` | Wording updated |

## Shared Structure / Data Model Tightness Check

- **One meaning per field: Yes.** A Team entry's `members[]` now holds layout plus identity. This is the same shape as
  `ConfiguredAgentExecutionNode` without per-member launch configuration; members use the Team's
  `defaultLaunchConfiguration`.
- **Overlap: Low.**
  - Collaborator runs never appear in root `taskExecutions`.
  - Extra copies never appear in `collaborators`.
  - A collaborator Team's own delegations live in its `taskExecutions`.

## Final File Responsibility Mapping

### Server — collaborators module (`src/agent-collaboration/collaborators/`)

| File | Change |
| --- | --- |
| `collaborator-candidate-policy.ts` | In-run = root definition plus configured definitions plus all collaborator entries plus member Agents of collaborator Teams |
| `collaborator-mention-admission.ts` | Plan only; reuse by definition; returns the new plans |
| `collaborator-runnability-validator.ts` (new) | Batch validation of the new placements |
| `collaborator-identity-allocator.ts` (new) | Allocates `agentRunId`, `teamRunId` and member run IDs; produces complete entries |
| `collaborator-entry-builder.ts` | Plan entries (without identities) feed the allocator |
| `collaborator-source-projector.ts` | Extra-copy source from an entry (fresh identities) |
| `collaborator-errors.ts` | `COLLABORATOR_ADD_FAILED`; remove the address hint |
| `collaborator-root-port.ts` | `collaborators()` returns full entries |

### Server — shared records, backends and recording

| File | Change |
| --- | --- |
| `run-history/domain/run-execution-tree-shared-records.ts`, `run-history/store/run-execution-tree-shared-record-schemas.ts` | Entry identity fields; Team entry `taskExecutions`; invariants |
| `agent-collaboration/execution/backends/root-agent-execution-registry.ts`, `root-team-execution-directory.ts` | Unchanged API; used by the host |
| `agent-memory/services/runtime-memory-event-accumulator.ts` (+ the recording path it feeds), `autobyteus-ts` native memory user-trace recording | `senderId` from `metadata.sender_agent_id` when `input_origin` is `inter_agent_delivery` |
| `run-history/services/agent-run-view-projection-service.ts`, `team-member-run-view-projection-service.ts`, `agent-org-member-run-view-projection-service.ts`, `agent-run-collaboration/services/agent-run-collaboration-member-view-projection-service.ts` | Inter-agent replay item with sender address |
| `agent-collaboration/execution/services/collaboration-execution-location-service.ts` and the three family location services | Index collaborator executions (for allocation, context files and projections) |

### Server — roots

| Root | Files | Change |
| --- | --- | --- |
| Team | `domain/root-team-run.ts`, `local/flat-team-execution-manager.ts` (`addCollaboratorAgent`, `requireCollaboratorTeam`, routing and termination include collaborators), `local/registries/flat-team-member-config-resolver.ts` (collaborator nodes), `local/registries/collaborator-team-execution-registry.ts` (new), `services/team-run-resolver.ts` (register collaborator TeamRuns), `services/team-root-materializer.ts`, `services/team-execution-index.ts`, `services/team-recipient-resolver.ts`, `services/team-run-execution-tree-mutator.ts`, `task-delegation/team-task-source-resolver.ts`, `task-delegation/team-task-execution-adapter.ts`, `services/agent-streaming/agent-team-stream-handler.ts`, `team-execution-view-projector.ts` | Host instance; admission per DS-001; collaborator message resolution; restore and stop wiring; index containing-Team ancestors include collaborator `TeamRun`s (host rule); rejection on the stream |
| Org | `domain/agent-org-run.ts`, `services/agent-org-run-manager.ts`, `agent-org-execution-index.ts`, `agent-org-run-execution-tree-mutator.ts`, `agent-org-task-source-resolver.ts`, `agent-org-stream-handler.ts`, `agent-org-execution-view-projector.ts` | Same |
| Agent | `agent-run-collaboration/domain/agent-run-collaboration-root.ts`, `services/agent-run-collaboration-root-builder.ts`, `-execution-index.ts`, `-recipient-resolver.ts` (collaborators become message targets), `-tree-mutator.ts`, `-task-execution-adapter.ts` (extra copies only), `-collaborators.ts`; `services/agent-streaming/agent-collaboration-stream-handler.ts`; `agent-execution/services/agent-run-command-coordinator.ts` (rejection ack); `agent-run-collaboration/prompt/standalone-collaboration-instruction.ts` (wording) | Same, plus the host-specific SR-006/007 pieces unchanged |

### Contracts

| Package | Change |
| --- | --- |
| `autobyteus-team-stream-contracts` | Collaborator entry DTO identities; `collaborator_added`; SEND_MESSAGE error code |
| `autobyteus-collaboration-stream-contracts` | Org and Agent entry DTOs; rejection ack code |
| `autobyteus-agent-presentation-contracts` | Mention-note wording; replay inter-agent item |

### Web (`autobyteus-web/`)

| Area | Files | Change |
| --- | --- | --- |
| Rows and contexts | `services/collaborators/agentSourceSelectors.ts`, `services/teamExecution/*`, `services/runHydration/*`, `services/agentOrgExecution/*`, `utils/agentOrgHistoryRows.ts`, `services/agentCollaboration/*`, `components/workspace/history/*` | Collaborator rows and contexts from `collaborators` (approved look, Offline); expand a Team collaborator once (F-02) |
| Names | `utils/collaboration/memberDisplayName.ts` (new) plus all row, tab and "From" call sites | F-03 |
| Agent-root child view | Center header components for collaborator targets | ⚙ and + controls; "Message <name>…" placeholder (F-04, VIS-013) |
| Send | `services/agentStreaming/TeamStreamingService.ts`, `stores/agentTeamRunStore.ts`, `agentOrgRunStore.ts`, `agentRunStore.ts`, `agentRunCollaborationStore.ts`, `services/runSubmission/localUserSubmission.ts` | Identity-keyed settle (CR-003). **Only for a send that carries `mentions` (AR-007):** no composer clear and no local message until acceptance; rejection → notice and keep the draft. Sends without mentions keep today's behavior (AC-013) |
| Notice | `components/agentInput/CollaboratorAddFailureNotice.vue` | Fed by the rejection |
| RD-004 | `services/agentStreaming/handlers/memberInputMessageHandler.ts`, replay hydration, `components/conversation/segments/InterAgentMessageSegment.vue` | Route `inter_agent_delivery` to the segment with the formatted sender |

## Applied Patterns

- **Port/adapter:** roots and collaborators.
- **Registry:** `CollaboratorTeamExecutionRegistry` (Team root).
- **Strategy:** source resolvers.

## Target Subsystem / Folder / File Mapping

As in the final mapping. New files: `collaborator-runnability-validator.ts`, `collaborator-identity-allocator.ts`,
`agent-team-execution/local/registries/collaborator-team-execution-registry.ts` and web `memberDisplayName.ts`. No new folders.

## Folder Boundary Check

No change from SR-007; each new file sits in an existing folder with a matching ownership depth.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Team tree | `rootTeam.collaborators:[{kind:"agent_team", address:"/product_team", teamRunId:"product_team_9d01", coordinatorAddress:"/product_team/product_prototyper", members:[{address:"/product_team/product_prototyper", agentDefinitionId:"product-prototyper", agentRunId:"product_prototyper_33cc", platformAgentRunId:null}, …], handoffs:[…], defaultLaunchConfiguration:{…}, taskExecutions:[], addedAt, addedViaAgentRunId}]`, with root `taskExecutions` holding only ordinary copies | Collaborator runs in root `taskExecutions`; run lists per entry |
| Message | `send_message_to("/product_team/prototype_bootstrapper")` from the coordinator → `prototype_bootstrapper_44dd` (starts if Offline) | Scope-relative special rules; a not-found hint |
| Failure | Send `@Marketing Team …` → `COLLABORATOR_ADD_FAILED{collaborator_name:"Marketing Team", reason:"…"}`; the composer keeps the text and chip | Posting the message without the collaborator |
| Note | `[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team\nMessage a collaborator with send_message_to and its address; it starts on its first message.` | Suggesting `delegate_task` |
| RD-004 | Live and replay: "From Researcher:" plus content in the product prototyper's conversation | A user bubble with no sender |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Keep SR-007 task-execution collaborators alongside hosted ones | Rejected | Hosted only; extra copies are ordinary tasks |
| A migration for SR-007 developer data | Rejected (never released) | — |
| Guessing senders for old inter-agent traces | Rejected | Old traces stay user-style |
| A scope-relative message rule (DI-001 option 1 or 2) | Rejected | One instance per collaborator removes the need |

## Derived Layering

Unchanged from SR-007.

## Change / Refactor Sequence

1. **Contracts:**
   - entry DTO identities and invariants;
   - `COLLABORATOR_ADD_FAILED`;
   - the replay inter-agent item;
   - mention-note wording.
2. **Shared records and schemas:** entry identities, Team entry `taskExecutions`, invariants; key-set tests.
3. **Collaborators module:** the runnability validator and identity allocator; admission plan reuse; policy in-run rule;
   remove the hint.
4. **Team-root hosting:** collaborator Agents in the root `FlatTeamExecutionManager` and `CollaboratorTeamExecutionRegistry`
   (publish lazily, restore, freeze, route).
5. **Roots, in the order Org (closest precedent), Team, then Agent root.** For each:
   - host instance;
   - admission per DS-001;
   - resolver changes;
   - index (including containing-Team ancestors for host rules);
   - restore and stop;
   - binding commits;
   - stream rejection.
   - Remove collaborator task-execution paths.
6. **RD-004 server:** `senderId` recording (native AutoByteus plus the external-runtime accumulator); projections.
7. **Web:**
   - selectors and rows from `collaborators` (F-02);
   - formatter (F-03);
   - F-04;
   - the send path (CR-003, rejection, keep the draft);
   - notice;
   - RD-004 rendering.
8. **Docs:** update the SR-007 docs to the new model: `agent_communication.md` (collaborator addresses resolvable),
   `agent_team_execution.md`, `agent_orgs.md`, `agent_run_collaboration.md`, `run_history.md` (`senderId`), and web
   `chat.md`.

## Key Tradeoffs

- **A single instance per collaborator** (the user's choice) gives a simple mental model and authored workflows that work.
  The cost is one more hosted execution kind per root. The extra-copy path stays for parallel work.
- **Validation at send** blocks the user's message on failure (D-R1). This is clearer than silently delivering the message
  without the collaborator.
- **No sender guessing for old traces.** Historical messages stay user-style.

## Risks

- Publication after the commit must be atomic with respect to other root operations (inside the gate). Fail-stop on
  indeterminate publication.
- **Team roots** gain root-level hosted executions outside the root `FlatTeamRun` for the first time. Status snapshots,
  token attribution (`root_team_run_id`), the event correlation (`agent_execution` identity) and the frontend Team view
  index must include them. Tests are required.
- **RD-004 depends on every runtime's user-trace path carrying `senderId`.** This is an escalation trigger.
- **Org task-Team copies (E-20)** keep addressing configured members. This is documented as known behavior.

## Guidance For Implementation

- Start from `5dcc5dc82`. Remove the collaborator task-execution paths rather than layering on top of them.
- **Tests:**
  - admission validates, allocates, commits, publishes and emits in order;
  - a failure writes nothing and posts nothing;
  - re-mention reuses identities;
  - a collaborator Agent or Team starts on its first `send_message_to` (`fresh`), and after Stop and reopen in `restore`
    mode with the same run IDs;
  - **DI-001 replay:** a collaborator Team coordinator's authored handoff reaches its teammate (live check on Claude, as
    in `c-02-observation.log`);
  - an extra copy via `delegate_task` gets the system task notice and its own run IDs;
  - message resolution maps each address to exactly one execution;
  - candidate policy: entries count as in the run, and a failed add is still offered;
  - CR-003: an echo with composed content settles by identity;
  - the rejection keeps the draft and shows the notice (VIS-007);
  - F-02, F-03 and F-04 rendering against VIS-004, VIS-013 and VIS-015;
  - RD-004 live and replay in Team, Org and Agent-root runs; an old trace without a sender stays user-style;
  - Team-root status, token and view-index inclusion of collaborator executions.
- Keep all SR-007 tests for the unchanged pieces: the Agent root, `resolveCommandReadyRoot`, context files, `teamScoped`,
  `launchPurpose` and the menu.
