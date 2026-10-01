# Design Spec — cross-scope-agent-mentions

## Solution And Approval Basis

- Current solution revision ID: `SR-007` (design revision for ARCH-REV-001 findings AR-001–AR-005). The requirements basis is `SR-004`.
- Approved requirements baseline: `requirements-doc.md`, Approved (SR-004, 2026-09-30).
  - Approval reference: the user replied "Yeah, I completely agree with you." to an explicit approval request covering
    REQ-001–012, AC-001–014, DEC-U1 and OQ-1/2/3.
- Behavior-defining supplements:
  - Product Prototyper's approved `ui-ux-spec.md` with VIS-001–014.
  - Path: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions/`.
  - User confirmation: "Okay, finally I confirm now. All good now." SHA-256 checked for all 14 references.
- Design decisions the user confirmed in conversation after approval. These are technical shape only; intended behavior is
  unchanged.
  - The tree field is named `collaborators`.
  - Collaborator entries hold no run IDs; runs stay in `taskExecutions`.
  - Entries are lean: IDs, addresses, the settings snapshot and the Team layout. No role, description or name.
  - The standalone folder is `collaboration/`.
  - First contact is `delegate_task`; after that, `send_message_to` by run ID. `send_message_to` never creates anything,
    and a message to a collaborator address gets a clear hint to use `delegate_task`.
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` (evidence E-01–E-17).
- Workspace:
  - Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions`.
  - Branch: `codex/cross-scope-agent-mentions`.
  - Base: `origin/personal` @ `8caa610ff` (v1.4.92-beta.4).
  - Finalization target: `personal`.

## Current-State Read

- **Two collaboration roots exist today: Team runs and Org runs.** Each owns:
  - one saved tree (`team_run_execution_tree.json` or `agent_org_run_execution_tree.json`);
  - one communication log;
  - a task lifecycle (`RootTaskExecutionLifecycle` plus a per-root adapter);
  - a communication engine (`RootCommunicationEngine` plus a per-root adapter);
  - one entry in `ActiveCollaborationRootDirectory`.
- **Delegated children are root-owned task executions** (E-07, E-12):
  - Their records hold only address, run IDs, delegator and start time.
  - Definition and settings are looked up at the configured placement with the same address, on start and on restore
    (`findTaskConfigNode`, `findAgentOrgConfiguredSourceNode`).
  - That lookup is the only reason `delegate_task` can reach mounted definitions only.
- **Messaging rules** (E-01, E-08):
  - `send_message_to` by address needs a configured ingress. It starts a configured member that is still Offline
    (`ensureReady`).
  - By run ID inside the same root, it wakes a delegated child that was shut down.
  - Across roots, it is live-only.
  - It never allocates a run or adds an execution.
- **Standalone Agent runs have no root** (E-15, F-005):
  - No member context, so no automatic `send_message_to`/`delegate_task`, no children and no Team tab.
  - Storage is `memory/agents/<runId>/run_metadata.json`, the raw traces and a catalog row.
- **Tool exposure has one seam** (E-09): `buildRuntimeAgentToolExposure`. It adds the collaboration tools only when a member
  context exists. Codex fixes its tool list at thread start.
- **The frontend resolves every task child through a configured member at the same address** (E-17, F-001). Task data
  carries no definition identity.
- **Design health:** the structure is sound. The pressure comes from assumptions baked into it:
  - "every delegation target is configured";
  - "every root is a Team or an Org";
  - some Org hosting code is root-neutral in substance but named and placed as Org-only (E-13).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale:
  - Server: a new third root kind with its own package, lifecycle binding, stream and GraphQL; `collaborators` in both
    existing tree families; resolver and adapter changes in both roots; the tool-exposure policy; the prompt; the
    standalone lifecycle; helper launch marking; memory layout, location and allocation.
  - Shared contracts: three packages (agent-presentation, team-stream, collaboration-stream).
  - Web: the live `@` menu, chips and message rendering; collaborator source lookup for Team and Org; a new standalone
    collaboration view, store and stream; new target kinds; history rows; the right tab; product-wide task-row changes;
    the failure notice; accessibility; localization.
  - Roughly 70–90 production files.
- Architectural risk: `High`
- Risk rationale:
  - New shared contracts and new persisted formats (optional tree field, new standalone package, optional metadata and
    catalog fields).
  - A new runtime owner (the Agent root) bound to the standalone lifecycle.
  - A security/ownership change: every user-facing agent always has `delegate_task`/`send_message_to`.
  - Concurrency: mention admission and delegation go through root gates, and the host terminates together with its children.
  - Prompt changes for every standalone agent, including Daily Assistant.
  - A refactor that moves Org hosting classes.
- Escalation trigger: return a `Design Impact` if implementation finds any of the following:
  - a runtime (Codex, Claude, AGY, ACP, AutoByteus) cannot expose the tools from session start for standalone runs;
  - an existing consumer relies on "a member context implies a Team/Org root" in a way not listed in E-11;
  - a history or streaming reader rejects the new optional fields.

## Architecture Investigation Evidence

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Tool exposure seam | `agent-execution/shared/runtime-agent-tool-exposure.ts`; E-09 | A member context adds all three collaboration tools; every runtime calls this one builder | Always-on tools come from giving eligible standalone runs a host member context; the host gets no `get_handoff_rules` | ACP/AGY MCP exposure for standalone runs needs one live check |
| Helper launches | `server-compaction-agent-runner.ts`, `skill-improvement-improver-session-service.ts`; E-10 | Helpers use the user `createAgentRun` path; the improver's definition is chosen by the user | Explicit `launchPurpose: "server_helper"` persisted in metadata, not a definition-ID list | None |
| Member-context consumers | E-11 list | 15 files switch on root kind | Add `"agent"` to `RootSubjectKind`; each switch gets an explicit agent branch | Covered by typecheck exhaustiveness |
| Delegation resolution | `team-recipient-resolver.ts`, `agent-org-run.ts#resolveRecipient`, the task adapters; E-12 | One resolver serves both message and delegation; the source comes from configured nodes only | Split message-recipient and delegation-placement resolution; add a per-root task source resolver that checks configured nodes, then collaborators | None |
| Org hosting pieces | `agent-org-root-agent-execution-registry.ts`, `agent-org-team-execution-directory.ts`; E-13 | Root-neutral in substance | Move them to `agent-collaboration/execution/backends/` for the Org and Agent roots to share | None |
| Tree readers and migration rules | the tree schemas; `docs/design/data_migration_guideline.md` §3; E-14 | Tolerant read, exact write | `collaborators` is read as optional (absent means `[]`) and always written; no migration | None |
| Standalone storage | `agent-memory-layout.ts`, `agent-run-history-catalog-service.ts#deleteRun`, `agent-run-identity-allocator.ts`; E-15 | Delete removes the run directory; allocation checks the Team/Org families | The package lives inside the run directory; a third location family joins the allocation check | None |
| Streams | `agent-stream-handler.ts`, `agent-team-stream-handler.ts`, `agent-org-stream-handler.ts`, the contract packages; E-16 | Three transport families; collaboration-stream contracts are root-kind generic | New `/ws/agent-collaboration/:runId` on the collaboration-stream contracts (root kind `agent`); `mentions` added to all SEND_MESSAGE payloads | None |
| Frontend lookups and rows | E-17 files | Source lookup is configured-only; "Started by" lines; standalone rows are inline | Shared source selectors that also check `collaborators`; a new standalone collaboration view; product-wide row changes | None |
| Messaging semantics | `root-team-run.ts`, `configured-agent-execution-handle.ts`; E-08 | Messaging never allocates | First contact is `delegate_task`; the collaborator-address hint | None |

## Intended Change

1. **Collaborator entries.**
   - Add an optional `collaborators[]` to the root of Team trees, Org trees and a new standalone collaboration tree.
   - An entry makes one shared Agent or Agent Team definition delegable in that run, at a root-level address, with a
     snapshot of the run's root settings.
2. **Mention intake.**
   - SEND_MESSAGE on every live transport accepts `mentions`.
   - The root admits them atomically: it validates, then adds or reuses entries.
   - It then delivers the user's text plus one server-composed mention note to the focused agent.
3. **Delegation to collaborators** uses the existing `delegate_task` lifecycle. Only the target and source resolution
   extends to collaborators. Messaging stays configured-only, with a helpful hint.
4. **Standalone Agent root.**
   - Every eligible standalone run (not a server helper, not application-owned) is a collaboration root of kind `agent`
     while active.
   - Its on-disk `collaboration/` package is created on the first mention.
5. **Always-on tools** come from the host member context:
   - Every eligible agent gets `send_message_to` and `delegate_task` from session start.
   - `get_handoff_rules` rule (AR-003), stated once: it is exposed **only when the member's collaboration context is
     Team-scoped**. That means a member of a Team root or an Org root (configured or task), or a member of a task Team in
     any root, including an Agent root. It is not exposed to the Agent-root host or to a task Agent directly under an Agent
     root, because neither belongs to any Team. The member-context builders set this through an explicit
     `MemberExecutionContext.teamScoped: boolean`, which `automaticCollaborationToolNames(context)` reads.
6. **Candidates** come from one server policy, exposed through a GraphQL query and re-checked at admission.
7. **Frontend:**
   - the live `@` menu, chips and inline message rendering;
   - collaborator-aware source lookup;
   - the standalone collaboration view, stream, rows and Team tab;
   - the failure notice;
   - product-wide task-row changes;
   - combobox accessibility.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger / Contract | Existing Behavior & Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, AC-001/011 | `@` typed at a word start in a live composer | `@` only in New chat (E-04, E-17) | Menu lists outside-run shared Agents, then Teams, from the server candidate policy | DS-007 |
| BEH-002 | User | REQ-002, AC-002 | Send with chips | Skill tags go through the content prefix (E-17) | Structured `mentions` plus a server-composed note; inline chip rendering | DS-001 |
| BEH-003 | System | REQ-003/004, AC-003/004 | Admission, then the agent's `delegate_task` | Delegation reaches configured placements only (E-12) | A collaborator entry authorizes delegation in its run only; the task lifecycle is unchanged | DS-001, DS-002 |
| BEH-004 | System | REQ-005, AC-005 | Collaborator runs | Brief is a system notice; same-root run-ID messages are projected (E-06) | Unchanged for collaborators | DS-002, DS-003 |
| BEH-005 | Operational | REQ-006, AC-006 | Stop, reopen, wake | Tree-recorded children restore shut down and wake on message (E-07) | Entries plus source resolution make collaborators restorable; other roots cannot reach them (live-only global route) | DS-002, DS-004 |
| BEH-006 | User/System | REQ-007, AC-007 | Standalone run with collaborators | No root (F-005) | Agent root, package, stream, rows, Team tab | DS-004, DS-006 |
| BEH-007 | User | REQ-008, AC-008 | `delegate_task` returns no run ID for a collaborator address | Tool card only | Failure notice derived on the client | DS-008 |
| BEH-008 | User | REQ-009, AC-009 | Any task row | "Started by" line, dotted ring | Product-wide row change | DS-006 |
| BEH-009 | User | REQ-010, AC-010 | Keyboard or screen reader | New chat combobox only | Run composer combobox semantics | DS-007 |
| BEH-010 | User | REQ-011, AC-012 | Click a collaborator row | Configured-address resolution (F-001) | Collaborator-aware context creation | DS-006 |
| BEH-011 | Contract | REQ-012, AC-014 | Any eligible run bootstrap | Tools only with a member context (E-09) | Host member context gives always-on tools; helpers and application-owned runs unchanged | DS-005 |
| BEH-012 | Contract | Preserved (E-08) | `send_message_to` to a collaborator address | Generic not-found | Rejected with a `delegate_task` hint; nothing is created | DS-003 |
| BEH-013 | Preserved | AC-013 | New chat `@`, old runs | — | Unchanged; old data read without migration | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `…/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions/ui-ux-spec.md` + `visual-references/` | Normative UI | REQ-001–011 | All UI in this design must match VIS-001–014; the prototype's `run-mentions` code is not architecture | Approved (user) |
| `…/prototype-ticket.md`, `ui-behavior-test-matrix.md` (ticket folder) and `/Users/normy/autobyteus_org/autobyteus-web-prototype/mock-boundaries.md` (prototype repository root) | Decisions DEC-001–006, behavior matrix, mocked boundaries | — | The test matrix is input for API/E2E validation | Final |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant` together with `File Placement Or Responsibility Drift`
  - Missing invariant: "a delegation source is not always a configured node", and "a root is not always a Team/Org".
  - Placement drift: the Org hosting classes are root-neutral but live in the Org module.
- Refactor needed now: `Yes`
- Evidence: E-12 (one resolver serves both message and delegation; the source lookup is configured-only in two
  adapters, on start and restore), E-13, E-11.
- Design response:
  - Split recipient resolution by subject: message ingress versus delegation placement.
  - Introduce one task source resolver per root that checks configured nodes, then collaborators.
  - Move the Org root-hosting registry and directory to root-neutral `agent-collaboration/execution/backends/`.
  - Add the `agent` root kind with explicit branches in every root-kind switch.
- Refactor rationale:
  - Without the split, a collaborator address would become a message target or the hint could not be given.
  - Without the move, the Agent root would depend on the Org module.
- Intentional deferrals and residual risk:
  - Token-usage analytics attribute collaborator runs in an Agent root by their own run ID. There is no roll-up to the host.
  - Linking runs across roots stays out of scope.

## Terminology

- **Collaborator (entry):** a root-level record in a run's tree that makes one shared Agent or Agent Team definition
  delegable in that run. It has no run of its own.
- **Collaborator run:** a task execution (task Agent or task Team) at a collaborator's address.
- **Agent root:** a collaboration root of kind `agent` whose host is one standalone Agent run. It exists in memory while
  the host is active. Its package is `memory/agents/<hostRunId>/collaboration/`.
- **Host:** the standalone AgentRun at the Agent root. It is owned by `AgentRunManager` and the standalone lifecycle, not by
  the root.
- **Mention note:** the server-composed block appended to the user's text, listing each mentioned collaborator's name,
  kind and address. Its wording has one owner.
- **Eligible run:** a standalone run whose `launchPurpose` is not `server_helper` and which has no
  `applicationExecutionContext`.

## Design Reading Order

This document follows the template order.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete paths in scope:
  - the single shared `resolveRecipient` for both messaging and delegation (Team and Org);
  - configured-only source lookup at each call site (`findTaskConfigNode` for delegation and restore in the Team adapter;
    `findAgentOrgConfiguredSourceNode` in the Org adapter);
  - the Org-named hosting classes after their move;
  - the visible "Started by" lines in tree task rows;
  - `configuredAgentAtAddress` and `findConfiguredAgentByAddress` used as task-source lookups on the frontend.
- None are kept as wrappers.

## Persisted Data / State Transition Decision (Mandatory)

- **What is stored:**
  - (a) Team trees `memory/agent_teams/<id>/team_run_execution_tree.json` and Org trees
    `memory/agent_orgs/<id>/agent_org_run_execution_tree.json`: one per root run, a few KB, up to hundreds per install.
  - (b) `memory/agents/<runId>/run_metadata.json`, one per standalone run.
  - (c) The standalone catalog `memory/run_history_index.json`.
  - (d) New: `memory/agents/<runId>/collaboration/`.
- **Changes:**
  - (a) Optional root field `collaborators`.
  - (b) Optional `launchPurpose: "server_helper"`.
  - (c) Optional row field `hasCollaboration: true`.
  - (d) A new package: `collaboration_tree.json` plus `communication_messages.json`, plus child memory directories.
- **Readers and writers:**
  - Tree readers read tolerantly and write exactly (E-14). Missing `collaborators` becomes `[]`; writers always emit it.
  - The metadata reader projects known fields; the new field is optional. `isExactTarget` compares whole metadata, so the
    field must be carried through.
  - Catalog rows get an optional field.
- **Required semantics:**
  - A missing `collaborators` truthfully means none were added.
  - A missing `launchPurpose` means a user run; this is true for all existing user runs. Old helper runs are ephemeral
    (compaction runs are terminated; improver runs are replaced per session).
  - A missing `hasCollaboration` means none.
  - A new-package invariant: task executions whose address is a collaborator must resolve to that collaborator, and a
    collaborator address must not collide with configured addresses. Readers reject the tree otherwise, the same way they
    handle handoff endpoint checks.
- **Constraints:** none on privacy or rebuild. The data is local memory.
- **Decision:** `Directly Usable — No Migration`.
- **Rationale:** guideline §3 applies: only optional fields with truthful absence are added, plus a new family with no
  predecessor. No startup gate is needed.
  - Downgrade risk: an older build ignores `collaborators` and would drop it on its next save of that tree. A collaborator
    run in that tree then cannot be restored (`TASK_EXECUTION_CONTEXT_UNAVAILABLE`). This affects only downgraded installs;
    no data is deleted.
- **Supports:** AC-006 and AC-013.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002/003 | Composer send with mentions | Focused agent receives text plus mention note | The root (`RootTeamRun` / `AgentOrgRun` / `AgentRunCollaborationRoot`) | Authorization happens before the agent sees the note |
| DS-002 | Primary End-to-End | BEH-003/004/005 | Agent `delegate_task(collaborator address)` | Collaborator run started, brief delivered | The root task lifecycle | Reuses delegation unchanged; only resolution extends |
| DS-003 | Return-Event | BEH-004/012 | `send_message_to` by run ID or address | Delivery plus projection, or a hinted rejection | The root communication engine | Existing path; hint for collaborator addresses |
| DS-004 | Bounded Local | BEH-005/006 | Standalone host activation or termination | Agent root registered or terminated with its children | `AgentRunCollaborationRootManager` | New lifecycle binding |
| DS-005 | Bounded Local | BEH-011 | Run config build | Runtime tool list and prompt | `StandaloneAgentRunLifecycleService.buildConfig` → exposure builder | Always-on tools from session start |
| DS-006 | Return-Event | BEH-006/008/010 | Stream snapshot or event, or history query | Tree rows and agent contexts | Frontend view indexes and stores | F-001 and F-005 on the client |
| DS-007 | Primary End-to-End | BEH-001/009 | `@` typed | Menu options | `CollaboratorCandidatePolicy` (server) | One owner of eligibility |
| DS-008 | Bounded Local | BEH-007 | `delegate_task` result with no run ID | Failure notice | Frontend notice derivation | No new server event |
| DS-009 | Return-Event | BEH-004/005/006 | Child `send_message_to(host run ID)` or `(host address)` | Host receives the message, restored first if its runtime is not active | `AgentRunCollaborationRoot` → `StandaloneAgentRunLifecycleService.resolveCommandReadyAgentRun` | Host wake, the counterpart of `ConfiguredAgentExecutionHandle.ensureReady` for Team/Org members |

## Primary Execution Spine(s)

- **DS-001:** `AgentUserInputTextArea → target interaction port → SEND_MESSAGE{mentions} → stream handler (or
  AgentRunCommandCoordinator for standalone) → Root.admitCollaboratorMentions → CollaboratorMentionAdmission →
  root tree commit → collaboratorMentionNote.compose → returns {content, collaborators}` → the **caller** posts through its
  existing command path. Team and Org stream handlers post through `root.executeAgentCommand(focused, post_message)`. The
  standalone path posts inside `AgentRunCommandCoordinator.postUserMessage` so that command-record dedupe and the status
  overlay still apply. Admission never posts.
- **DS-002:** `delegate_task tool → MemberTaskCommandCapability → Root.delegateTask →
  Root.resolveDelegationPlacement (configured | collaborator) → RootTaskExecutionLifecycle.delegate →
  <Root>TaskExecutionAdapter.prepareActivation → <Root>TaskSourceResolver → prepareTaskAgent / taskTeams.create +
  prepareTaskTeam → one tree write → TASK_EXECUTION_STARTED → work packet`
- **DS-007:** `@ trigger → useRunMentionMenu → GraphQL collaboratorMentionCandidates(root) →
  CollaboratorCandidatePolicy(root port, catalogs) → options`

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Nodes | Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user sends a message with chips. The client sends the text plus structured `mentions: [{kind, definition_id}]` on its normal transport. In one root operation gate, the root runs admission: it checks each mention against the candidate policy, then either reuses the existing entry for that definition or allocates an address, builds an entry from the definition and the root settings, and commits the new entries in one atomic tree write. Admission returns the composed content (user text plus mention note). The caller posts it through its existing command path; admission itself never posts. For Team and Org this is the stream handler's `executeAgentCommand`. For standalone runs, `AgentRunCommandCoordinator` activates or restores the host, which ensures the Agent root, then runs admission, then posts inside the coordinator so dedupe and the overlay apply. For an Agent-root child, the collaboration stream handler runs admission on the Agent root and posts through `root.executeAgentCommand(child, post_message)`. | Transport, root, admission, note composer | The root | Address allocation, entry building, note wording, catalog flag |
| DS-002 | The agent calls `delegate_task("/product_team", brief)`. The root resolves a delegation placement: a configured placement if one exists, otherwise a collaborator entry. It never resolves the root itself or a self-target. The unchanged lifecycle prepares the child. The adapter's source resolver projects the collaborator entry into the same runtime source-node shape that configured placements produce, so preparation, identity allocation, the tree write, publication and the work packet are all unchanged. Restore uses the same resolver. | Root, lifecycle, adapter, source resolver | Root task lifecycle | Host rule unchanged per root |
| DS-003 | Unchanged run-ID messaging. By address, the resolver returns only configured ingress. If the address is a collaborator, the rejection says to use `delegate_task` or message an existing run by run ID. | Root, communication engine | Root | Hint text |
| DS-004 | When a standalone run is activated or restored and it is eligible, the manager creates or loads the Agent root (idempotent; returns the existing root if present): it reads the package if one exists, registers the root in `ActiveCollaborationRootDirectory`, and serves the host member context. The root's lifetime follows the **explicit** standalone lifecycle, not the host runtime's liveness. It ends only on `AgentRunService.terminateAgentRun` (user Stop) or server shutdown: the root fences, shuts down every child and unregisters, and then the host terminates. If the host's runtime dies or exits on its own while the root is registered, the root stays registered and its children keep running. The next delivery to the host wakes it (DS-009). The package is written only when admission first adds a collaborator. That write also sets the catalog flag. | Manager, root, persistence coordinator | `AgentRunCollaborationRootManager` | Catalog flag, location index |
| DS-005 | `buildConfig` attaches a host `MemberExecutionContext` for eligible runs. The exposure builder adds `send_message_to` and `delegate_task` for every member context, and `get_handoff_rules` only when `context.teamScoped` is true (see Intended Change 5). The prompt composer renders a short standalone collaboration section for the host, and the existing Team sections for everyone else. | Lifecycle, exposure builder, prompt composer | Standalone lifecycle | Helper and application exclusions |
| DS-006 | Team and Org view indexes and context factories resolve an agent's source by address: first configured members, then collaborator entries. The standalone view index does the same over the Agent-root tree. Rows reuse the existing task-row components with the product-wide changes. | View indexes, row components | Frontend stores | Localization |
| DS-007 | On `@`, the composer asks the server for candidates for the current root (active or stored). The policy excludes Orgs, Daily Assistant, internal built-ins, non-shared and application-owned definitions, and everything in the run. The result is cached per root and invalidated on `collaborator_added` or `task_execution_started`. | Menu, GraphQL resolver, policy | `CollaboratorCandidatePolicy` | Root port |
| DS-009 | A child reports back with `send_message_to` using the host's run ID, which is the same-root path, or the host's address. The Global router resolves the sender's root, the Agent root, through `ActiveCollaborationRootDirectory`. The root's `deliverExactAgentMessage` finds the target in its index. For the host, it calls `StandaloneAgentRunLifecycleService.resolveCommandReadyAgentRun(hostRunId)`: an active host is returned as is, and a host whose runtime died or exited is restored in `restore` mode through the existing standalone transition lane. The root then posts the message and records the communication. For a child target, the existing live lease wakes a child that was shut down. The root never creates or terminates the host itself; waking goes through the standalone lifecycle. | Global router, Agent root, standalone lifecycle | `AgentRunCollaborationRoot` | Lock ordering (root gate, then lifecycle lane; `ensureRoot` takes no root gate) |
| DS-008 | While the focused agent's turn is visible, the client watches its `delegate_task` tool results. A result `{target_agent_run_id: null, message}` whose `recipient_address` matches a collaborator entry raises the notice. The next send in that conversation clears it. | Conversation projection, notice | Frontend | — |

## Spine Actors / Main-Line Nodes

Composer and interaction ports; the three stream handlers and `AgentRunCommandCoordinator`; roots (`RootTeamRun`,
`AgentOrgRun`, `AgentRunCollaborationRoot`); `CollaboratorMentionAdmission`; `RootTaskExecutionLifecycle` with the per-root
adapters and source resolvers; `RootCommunicationEngine`; `AgentRunCollaborationRootManager`; `CollaboratorCandidatePolicy`;
the frontend view indexes.

## Ownership Map

- **Roots:**
  - own their tree, including `collaborators`;
  - own the operation gate, admission ordering, delegation-placement and message-recipient resolution, and termination;
  - are the only writers of collaborator entries.
- **`CollaboratorMentionAdmission`:** a stateless coordinator.
  - It validates mentions through the policy, reuses or builds entries, and returns the delivery summary.
  - It never writes. It returns the entries to commit, and the root commits them.
- **`CollaboratorCandidatePolicy`:** the single owner of eligibility and "in the run" rules.
- **`CollaboratorEntryBuilder`:** builds definition-to-entry snapshots.
  - Agent: definition ID plus the root settings.
  - Team: the layout from `FlatTeamDefinitionResolver` (mount path `[segment]`) plus rebased handoffs from
    `CollaborationHandoffCompiler.compileTeam`.
- **`CollaboratorAddressAllocator`:** the segment from the definition name via `assertValidAgentTeamMemberName`
  normalization, with deterministic `_2`, `_3` suffixes against addresses in use.
- **Per-root `TaskSourceResolver`:** maps an address to a runtime source node (configured, then collaborator). It is used on
  activation and restore.
- **`collaboratorMentionNote` (shared contract):** the only owner of the mention-note wording (compose and parse).
- **`AgentRunCollaborationRootManager`:** owns the Agent root's lifetime relative to its host.
- **`AgentRunCollaborationRoot`:** owns the Agent root's tree, communication log, children registries and gates. It does
  not own the host run.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind It | Why | Must Not Secretly Own |
| --- | --- | --- | --- |
| Stream SEND_MESSAGE handlers (team, org, agent, agent-collaboration) | Root admission and delivery | Transport parsing | Eligibility, entry building, note wording |
| GraphQL `collaboratorMentionCandidates`, `agentRunCollaboration` | Policy / root or stored package reader | Client queries | Policy logic |
| `AgentRunCommandCoordinator.postUserMessage` (mentions) | Host activation, then Agent root admission | Standalone command path | Admission rules |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `RootTeamRun.resolveRecipient` / `TeamRecipientResolver.resolve` used for both subjects | Messages and delegation need different subjects | `resolveMessageRecipient` (configured ingress plus hint) and `resolveDelegationPlacement` (configured, then collaborator) | In This Change | Update all callers |
| `AgentOrgRun.resolveRecipient` used for both subjects | Same | Same split in the Org root | In This Change | |
| Direct `findTaskConfigNode` calls in `team-task-execution-adapter.ts` for source and restore | Source may be a collaborator | `TeamTaskSourceResolver` | In This Change | `findTaskConfigNode` stays only inside the resolver |
| `findAgentOrgConfiguredSourceNode` as the adapter's source | Same | `AgentOrgTaskSourceResolver` | In This Change | |
| `agent-org-execution/services/agent-org-root-agent-execution-registry.ts` | Root-neutral | `agent-collaboration/execution/backends/root-agent-execution-registry.ts` (`RootAgentExecutionRegistry`) | In This Change | Move; drop Org wording |
| `agent-org-execution/services/agent-org-team-execution-directory.ts` | Root-neutral | `agent-collaboration/execution/backends/root-team-execution-directory.ts` | In This Change | Move |
| Visible "Started by" spans in `WorkspaceTransientExecutionRow.vue`, `WorkspaceAgentOrgHistoryCollection.vue` | REQ-009 | Accessible label only | In This Change | Also remove their `data-test` hooks |
| Frontend `configuredAgentAtAddress` / `findConfiguredAgentByAddress` as task-source lookup | Collaborators | `agentSourceAtAddress` selectors (Team DTO, Org DTO, Agent DTO) | In This Change | Configured-only uses (for example the configuration view) keep a clearly named configured selector |
| `AUTOMATIC_TEAM_TOOL_NAMES` as one fixed set | Host excludes `get_handoff_rules` | `automaticCollaborationToolNames(context)` | In This Change | |

## Return Or Event Spine(s)

- **`collaborator_added`:** a new event on the Team stream, the Org collaboration stream and the Agent collaboration stream.
  It carries the full entry and is emitted after the admission commit. Clients add the entry to their tree view before any
  `task_execution_started` that references its address. The root publisher orders them.
- **Existing events unchanged:** `task_execution_started`, `communication` and `agent_presentation`.

## Bounded Local / Internal Spines

- **Agent root lifetime (parent: `AgentRunCollaborationRootManager`):**
  `host activation or restore published → ensureRoot(runId) (idempotent, no root gate) → load package? → reserve+commit directory → serve`,
  then `AgentRunService.terminateAgentRun | server shutdown → root.terminate() (fence → shut down children → drain) → unregister → host terminate`.
  - A host runtime that dies or exits by itself does **not** end the root. The root keeps its children, and the host is woken on
    the next delivery (DS-009). This mirrors Team/Org, where a dead configured member is re-activated on its next message.
  - After a server restart no root is active. Children are stored shut down. The next user send restores the host, which
    re-creates the root, so no live child can ever target a host that has no root.
  - Children never outlive an explicit Stop.
- **Admission (parent: root operation gate):**
  `validate all → plan entries (reuse or new) → single tree commit → publish collaborator_added → compose → post`.
  All mentions are admitted or none; the message is posted only after the commit.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Address allocation | DS-001 | Root | Unique, stable, valid segment | Collisions | Silent retargeting |
| Entry building (Team layout, handoffs) | DS-001 | Root | Snapshot definitions | Reopen must not depend on current definition files | Drift after edits |
| Mention-note wording | DS-001, DS-006 | Root, UI | Compose and parse | Agent-visible text and UI chips must agree | Mismatched chips |
| Catalog `hasCollaboration` flag | DS-004, DS-006 | History | Show children of stored runs | Avoid reading every package | Slow history |
| Location index (third family) | DS-002 | Allocator, restore | `containsRunId` / `findAgent` | Unique run IDs | ID collision |
| Memory layout for the agent kind | DS-002 | Memory locator | `agents/<host>/collaboration/...` | Child memory placement | Children misclassified as standalone runs |
| Localization | DS-006/007 | UI | en and zh-CN strings | Spec | — |

## Ownership Boundaries

- **Only a root mutates its tree.** Admission returns a plan, and the root commits it through its existing persistence
  coordinator (Team `TeamRunPersistenceCoordinator`, Org `AgentOrgRunPersistenceCoordinator`, Agent
  `AgentRunCollaborationPersistenceCoordinator`).
- **The Agent root never creates, restores or terminates the host directly.** The standalone lifecycle and
  `AgentRunService` do.
  - The root delivers to the host through `StandaloneAgentRunLifecycleService.resolveCommandReadyAgentRun(hostRunId)`, which
    restores the host if its runtime is not active. It then calls `postUserMessage` and publishes the communication record.
  - A plain `AgentRunManager.getActiveRun` delivery is forbidden, because it would drop messages to a crashed host.
  - Lock order: root operation gate → standalone transition lane. The lifecycle's activation hook calls
    `ensureRoot`, which returns the registered root without taking its gate, so there is no deadlock.
- **Policy and admission live in `agent-collaboration/collaborators/`** and depend only on read ports (definition catalogs,
  root port). Roots depend on them, not the other way round.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `Root.admitCollaboratorMentions(focusedAgentRunId, content, mentions)` | Policy check, entry plan, commit, event, compose | Stream handlers, command coordinator | Handlers writing trees or composing notes | Add parameters to the root API |
| `Root.resolveDelegationPlacement` / `resolveMessageRecipient` | Configured and collaborator lookup | `delegateTask` / `deliverLogicalMessage` | Using one resolver for both | — |
| `<Root>TaskSourceResolver.resolve(address)` | Configured node, then collaborator projection | Task adapter (activate, restore) | Calling `findTaskConfigNode` directly | — |
| `AgentRunCollaborationRootManager` (`ensureRoot`, `resolveCommandReadyRoot`, `terminateRoot`) | Root creation, lookup, termination; command-ready restore through the standalone lifecycle | Standalone lifecycle hook (`ensureRoot`), `AgentRunService` (`terminateRoot`), the collaboration stream and the command coordinator (`resolveCommandReadyRoot`), GraphQL (lookup) | Constructing roots elsewhere; a stream handler restoring the host directly | — |
| `CollaboratorCandidatePolicy` | Eligibility | GraphQL candidates, admission | UI-only filtering as authority | — |

## Dependency Rules

- `agent-collaboration/collaborators/*` must not import from `agent-team-execution`, `agent-org-execution` or
  `agent-run-collaboration`. Roots implement `CollaboratorRootPort`.
- `agent-run-collaboration/*` may import `agent-collaboration/*`, `agent-execution/services` (`AgentRunManager`, run
  lookup), `run-history/store` and `agent-team-execution/local` (flat Team execution factory for task Teams, as the Org does
  today). It must not import `agent-org-execution/*`.
- `agent-org-execution/*` imports the moved root-neutral backends from `agent-collaboration/execution/backends/`.
- The web client never composes the mention note or decides eligibility. It only renders or parses the note and shows
  server candidates.
- `send_message_to` code paths must never allocate or record executions.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| SEND_MESSAGE payload `mentions` (agent, team and collaboration streams) | Mention intent | Name the definitions the user mentioned | `{kind: "agent" \| "agent_team", definition_id}[]`, max 8, unique by (kind, id) | Optional; absent means none |
| `collaboratorMentionCandidates(root_subject_kind, root_run_id)` | Candidate list | Ordered options | `{kind, definition_id, name, description, member_count?, coordinator_name?}[]` plus `availability: AVAILABLE \| UNAVAILABLE_APPLICATION_ROOT` | Works for active and stored roots |
| `agentRunCollaboration(run_id)` | Stored or active Agent-root view | History rows, inspection | Agent root view DTO | Null when no package |
| `/ws/agent-collaboration/:runId` | Agent-root live view | Snapshot, events, child commands | collaboration-stream contracts with `root_subject_kind:"agent"` | `connect` → `resolveCommandReadyRoot` (restores the host if needed); host commands stay on `/ws/agent/:runId` |
| `AgentRunCollaborationRootManager.resolveCommandReadyRoot(hostRunId)` | Command-ready Agent root | Restore the host through the lifecycle, ensure the root, return it | Host run ID | Lane released before any root gate |
| `Root.admitCollaboratorMentions` | Admission | See above | `focusedAgentRunId` plus mentions | Returns `{content, collaborators: {name, kind, address}[]}` or a typed rejection |
| `Root.resolveDelegationPlacement(address)` | Delegation target | `agent`, `agent_team{coordinatorAddress}` | Canonical non-root address | Team root gains the `agent_team` kind |
| `Root.resolveMessageRecipient(address)` | Message ingress | Configured ingress only | Canonical address | Collaborator address → `COLLABORATION_TARGET_NOT_FOUND` with the hint |
| `collaboratorMentionNote.compose/parse` | Note wording | Server compose, web parse | `{name, kindLabel, address}[]` | In `@autobyteus/agent-presentation-contracts` |
| `AgentRunConfig.memberExecutionContext` (host) | Host identity | Root `{agent, runId}`, `memberAddress` = host address, `agentRunId` = runId | — | Only for eligible standalone runs |
| `CreateAgentRunInput.launchPurpose` | Helper marker | `"user"` (default) or `"server_helper"` | — | Persisted as optional metadata |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `mentions` payload | Yes | Yes | Low | Server re-validates |
| `resolveDelegationPlacement` / `resolveMessageRecipient` | Yes (after split) | Yes | Low | Split replaces one ambiguous resolver |
| Agent collaboration stream | Yes | Yes (`root_subject_kind`) | Low | Host commands are not accepted on it |
| Candidates query | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Tree list | `collaborators` | Yes | Readers may expect run IDs | Doc comment: "no run of its own; runs are task executions at its address" |
| Standalone package | `collaboration/`, `collaboration_tree.json`, `communication_messages.json` | Yes | — | — |
| Root kind | `"agent"` | Yes | Confusion with the kind of an execution | The type is always `RootSubjectKind` |
| New module | `agent-run-collaboration` | Yes | — | Parallels `agent-org-execution` |
| Entry field | `addedViaAgentRunId` | Yes | — | "The focused agent whose user message carried the mention" |
| Metadata | `launchPurpose` | Yes | — | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Task start, restore, idle shutdown, work packet | `RootTaskExecutionLifecycle`, adapters | Reuse | Unchanged semantics |
| Communication projection | `RootCommunicationEngine`, v1 message schema | Reuse | Same record format; subjectKind `agent` |
| Task Team materialization | `TaskTeamRunIdentityFactory`, flat Team factory | Reuse | Given a source node |
| Team layout and handoffs | `FlatTeamDefinitionResolver`, `CollaborationHandoffCompiler.compileTeam` | Reuse | Mount path gives rebased addresses |
| Root-level task hosting | Org registry and directory | Extend (move to root-neutral) | Shared by Org and Agent roots |
| Atomic package writes | `atomic-run-package-file-commit-writer.ts` | Reuse | — |
| Menu UI | `ChatTargetMenu.vue`, `detectMenuTrigger`, popover | Extend (variant) | One visual frame |
| Task rows, branches | `WorkspaceTransientExecutionRow.vue`, `WorkspaceHierarchyBranches.vue` | Reuse (+ REQ-009 change) | — |
| Collaboration stream contracts | `autobyteus-collaboration-stream-contracts` | Extend | Root-kind generic |
| Candidate policy, admission, note | — | Create New | No existing owner |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `agent-collaboration/collaborators/` (server) | Policy, admission, entry building, address allocation, source projection, root port | DS-001/002/007 | Create New |
| `agent-collaboration/execution/backends/` | Root-neutral root-level task hosting | DS-002 | Extend (moved files) |
| `agent-team-execution` | Team root: collaborators field, resolver split, source resolver, admission entry | DS-001/002/003 | Extend |
| `agent-org-execution` | Same for the Org root | DS-001/002/003 | Extend |
| `agent-run-collaboration` (new server module) | Agent root domain, manager, adapters, persistence, index, host context, location | DS-001–004 | Create New |
| `agent-execution` | Standalone lifecycle hook, `launchPurpose`, coordinator mentions, exposure, prompt | DS-004/005 | Extend |
| `run-history` | Tree schemas, metadata, catalog flag, Agent-root package store | DS-004/006 | Extend |
| `services/agent-streaming`, `api/*` | Mentions in handlers, Agent collaboration stream, GraphQL | DS-001/006/007 | Extend / Create |
| Contract packages | `mentions`, `collaborators`, `collaborator_added`, agent root view, mention note | all | Extend |
| `autobyteus-web` | Menu, chips, rendering, lookups, standalone view, rows, notice, a11y | DS-006–008 | Extend / Create |

## Draft File Responsibility Mapping

The final mapping below absorbs this pass. Draft notes that changed on the way to the final mapping:
- Admission was first placed inside each root. It was extracted as a shared stateless coordinator to avoid three copies.
- Candidate filtering was first on the client. It moved to the server policy for one owner.

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why Shared | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Collaborator entry type and schema | `run-history/domain/run-execution-tree-shared-records.ts`, `run-history/store/run-execution-tree-shared-record-schemas.ts` | run-history | Three tree families | Yes | Yes | A run container |
| Entry → runtime source node | `agent-collaboration/collaborators/collaborator-source-projector.ts` | collaborators | Three roots' source resolvers | Yes | Yes | A second config tree |
| Mention note | `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` | contracts | Server and web | Yes | Yes | A UI formatter |
| Mention and collaborator DTOs | Contract packages | contracts | Three streams | Yes | Yes | — |
| Frontend source selector | `autobyteus-web/services/collaborators/agentSourceSelectors.ts` | web | Team, Org and Agent trees | Yes | Yes | — |

## Shared Structure / Data Model Tightness Check

`CollaboratorEntry` is a discriminated union on `kind`:
- Agent: `{kind:"agent", address, agentDefinitionId, launchConfiguration, addedAt, addedViaAgentRunId}`.
- Team: `{kind:"agent_team", address, teamDefinitionId, coordinatorAddress,
  members:{address, agentDefinitionId}[], handoffs, defaultLaunchConfiguration, addedAt, addedViaAgentRunId}`.

Checks:
- One meaning per field: Yes. The Team members' settings are the Team's `defaultLaunchConfiguration`; there is no
  per-member copy.
- No run IDs, role, description or names: Yes.
- Overlap risk is Low. `members` in a Team entry are layout only; that is documented.

## Final File Responsibility Mapping

### Server — shared collaborators (`autobyteus-server-ts/src/agent-collaboration/collaborators/`, new)

| File | Concern |
| --- | --- |
| `collaborator-root-port.ts` | Port each root implements: `rootKind`, `isApplicationBound`, `rootLaunchConfiguration()`, `inRunDefinitionIds()`, `collaborators()`, `addressesInUse()` |
| `collaborator-candidate-policy.ts` | Eligible shared definitions (catalog read ports) minus exclusions (Orgs, `DAILY_ASSISTANT_AGENT_DEFINITION_ID`, internal built-ins, non-shared, application-owned) minus in-run IDs. Ordering is Agents then Teams, in catalog order. `assertAdmissible(mention)` gives typed reasons. **In-run definition IDs (AR-004):** the root's own definition (root Team, Org, or Agent-root host), every configured member's definition (for an Org, its direct Agents, mounted Teams and their Agents), and every collaborator definition **that has at least one task execution at its address**, plus the member Agent definitions of such collaborator Teams. A collaborator entry with no task execution (a failed or not-yet-attempted add) is **not** in the run. It stays offerable, and admission reuses that entry instead of allocating a new address. This keeps "Nothing was added" true (REQ-008). |
| `collaborator-address-allocator.ts` | Slug and suffix rule |
| `collaborator-entry-builder.ts` | Agent and Team entry snapshots (uses `FlatTeamDefinitionResolver`, `CollaborationHandoffCompiler`) |
| `collaborator-mention-admission.ts` | `plan(port, focusedAgentRunId, mentions, now)` returns `{newEntries, resolved[]}`. Reuses the existing entry per definition. All or nothing |
| `collaborator-source-projector.ts` | Agent entry → `TeamRunAgentNode` source (placeholder run ID replaced at allocation). Team entry → `TeamRunAgentTeamNode` source |
| `collaborator-errors.ts` | `COLLABORATOR_MENTION_INVALID`, `COLLABORATOR_MENTION_UNAVAILABLE`, and the address hint message builder |

### Server — shared domain and infrastructure changes

| File | Change |
| --- | --- |
| `run-history/domain/run-execution-tree-shared-records.ts` | `CollaboratorEntry` types |
| `run-history/store/run-execution-tree-shared-record-schemas.ts` | `parseCollaborators` (optional → `[]`), address-uniqueness invariant helper |
| `agent-collaboration/execution/domain/root-execution-identity.ts` | `RootSubjectKind` adds `"agent"`; `createAgentRootExecutionIdentity` |
| `agent-collaboration/execution/domain/member-execution-context.ts` | Derived `isAgentRootHost` |
| `agent-collaboration/execution/backends/root-agent-execution-registry.ts` | Moved from the Org module (`RootAgentExecutionRegistry`) |
| `agent-collaboration/execution/backends/root-team-execution-directory.ts` | Moved from the Org module |
| `agent-collaboration/execution/services/collaboration-execution-location-service.ts` | Third family, `agents` |
| `agent-memory/store/agent-memory-layout.ts` | Agent kind → `agents/<rootRunId>/collaboration/<ancestors>/<agentRunId>` |
| `agent-memory/services/runtime-memory-location-classifier.ts` | Classify the collaboration subtree |
| `agent-tools/task-delegation/task-delegation-tool-contract.ts` | Accept the `agent` root kind |
| `agent-execution/shared/runtime-agent-tool-exposure.ts` | `automaticCollaborationToolNames(context)` |
| `agent-execution/prompt/carpenter-prompt-composer.ts` + new `agent-run-collaboration/prompt/standalone-collaboration-instruction.ts` | Host section; others unchanged |
| Other root-kind switches (E-11 list: presentation adapter, task-delegation-command, compaction lineage, token display-field capturer, token enricher, team-run-context, run-history catalog core, repair, current validator, application-agent-tool-capability, definition-admission-result) | Explicit `agent` branch. Token enricher: the host keeps standalone attribution; Agent-root children use their own run ID |
| Additional switch sites (AR-002, E-18) | `context-files/services/context-file-owner-resolver.ts`: new `agent_collaboration_member_*` branch (see Context files). `agent-tools/mcp/agent-tool-mcp-session-service.ts`: **unchanged**; its generic kind-equality check already covers `agent`. `application-platform/execution/application-execution-scope.ts#requireLiveTeamMember`: **unchanged**; application scopes admit Team members only, and application-owned runs are excluded from Agent roots. `run-history/services/root-run-package-readiness-index.ts` / `RootRunPackageFamily`: **unchanged families**; an Agent-root child is admitted when its host's standalone package (`agent` family) is admitted and the location family resolves it; the collaboration package is not a separate family. `agent-collaboration/execution/task/task-delegation-command.ts#RootTaskPersistenceFinalizationIndeterminateError.rootSubjectKind`: widen the type to `RootSubjectKind` |

### Server — Team root (`agent-team-execution`)

| File | Change |
| --- | --- |
| `domain/team-run-execution-tree.ts` | `rootTeam.collaborators` |
| `run-history/store/team-run-execution-tree-schema.ts` | Optional read; invariants (no collision with configured addresses) |
| `services/team-run-execution-tree-mutator.ts` | `addCollaboratorsToTree` |
| `services/resolved-team-recipient.ts` | Add `agent_team` with `coordinatorAddress` |
| `services/team-recipient-resolver.ts` | `resolveMessageRecipient` and `resolveDelegationPlacement` |
| `task-delegation/team-task-source-resolver.ts` (new) | Configured node (via `findTaskConfigNode`), then collaborator projection |
| `task-delegation/team-task-execution-adapter.ts` | Use the source resolver for activation and restore; the `agent_team` placement path uses the Team entry's handoffs |
| `domain/root-team-run.ts` | `admitCollaboratorMentions`, port implementation, resolver split, `collaborator_added` publish |
| `services/team-execution-index.ts` | Index collaborator addresses for the hint and resolution |
| `services/agent-streaming/agent-team-stream-handler.ts` | Parse `mentions`, call admission, post the composed content |
| `services/agent-streaming/team-execution-view-projector.ts` | Project `collaborators`, `collaborator_added` |

### Server — Org root (`agent-org-execution`)

| File | Change |
| --- | --- |
| `domain/agent-org-run-execution-tree.ts`, `run-history/store/agent-org-run-execution-tree-schema.ts`, `services/agent-org-run-execution-tree-mutator.ts` | `rootOrg.collaborators` read, invariant, mutation |
| `domain/agent-org-run.ts` | Resolver split, admission, port |
| `services/agent-org-task-source-resolver.ts` (new; replaces the use of `findAgentOrgConfiguredSourceNode` as the source) | Source resolution |
| `services/agent-org-task-execution-adapter.ts` | Use the resolver and the moved backends |
| `services/agent-org-run-manager.ts`, `services/agent-org-execution-scope-builder.ts` | Import the moved backends |
| `services/agent-streaming/agent-org-stream-handler.ts`, `agent-org-execution-view-projector.ts` | `mentions`, `collaborators`, `collaborator_added` |

### Server — Agent root (`autobyteus-server-ts/src/agent-run-collaboration/`, new)

| File | Concern |
| --- | --- |
| `domain/agent-run-collaboration-tree.ts` | `{subjectKind:"agent", createdAt, host:{address, agentRunId, agentDefinitionId}, collaborators, taskExecutions}` |
| `domain/agent-run-collaboration-root.ts` | Root: gate, port, admission, `resolveDelegationPlacement` (collaborators only), `resolveMessageRecipient` (host only), `deliverExactAgentMessage` (host via `AgentRunManager`; children via the registry), `delegateTask`, the snapshot connection, `terminate` |
| `services/agent-run-collaboration-root-manager.ts` | Ensure, get, terminate; bound to host activation and termination; directory registration |
| `services/agent-run-collaboration-host-context-builder.ts` | Host `MemberExecutionContext`; host address from the package, else derived from the definition name |
| `services/agent-run-collaboration-task-execution-adapter.ts` | `RootTaskExecutionAdapter` over the moved backends; the host is always the root |
| `services/agent-run-collaboration-task-source-resolver.ts` | Collaborators only |
| `services/agent-run-collaboration-communication-adapter.ts` | `RootCommunicationAdapter`; v1 messages with subjectKind `agent` |
| `services/agent-run-collaboration-persistence-coordinator.ts` | Lazy package creation, atomic writes, catalog `hasCollaboration` flag |
| `services/agent-run-collaboration-execution-index.ts` | Host, children, chains |
| `services/agent-run-collaboration-location-service.ts` | Stored lookup for the location family |
| `prompt/standalone-collaboration-instruction.ts` | Host prompt section |
| `run-history/store/agent-run-collaboration-tree-schema.ts`, `-store.ts`, `-path.ts` | Package reader and writer |
| `services/agent-streaming/agent-collaboration-stream-handler.ts`, `agent-collaboration-view-projector.ts`; `api/websocket/agent.ts` route | Stream |
| `api/graphql/types/agent-run-collaboration.ts` | `agentRunCollaboration`, `collaboratorMentionCandidates` (all root kinds) |

### Server — standalone integration

| File | Change |
| --- | --- |
| `agent-execution/services/standalone-agent-run-lifecycle-service.ts` | `buildConfig` attaches the host context when eligible; ensure the root after publish |
| `agent-execution/services/agent-run-service.ts` | `terminateAgentRun` terminates the root first; `CreateAgentRunInput.launchPurpose` |
| `agent-execution/services/agent-run-provisioning-service.ts`, `run-history/store/agent-run-metadata-types.ts`, `agent-run-metadata-store.ts` | Persist and read `launchPurpose` |
| `agent-execution/services/agent-run-command-coordinator.ts`, `services/agent-streaming/agent-stream-handler.ts` | Mentions → Agent-root admission after activation |
| `agent-execution/compaction/server-compaction-agent-runner.ts`, `skill-improvement/services/improver-session/skill-improvement-improver-session-service.ts` | `launchPurpose:"server_helper"` |
| `run-history/store/agent-run-history-index-record-types.ts`, `run-history/services/agent-run-history-catalog-service.ts`, the standalone history GraphQL type | `hasCollaboration` |
| `agent-execution/services/agent-run-identity-allocator.ts` | Uses the three-family location service |

### Server — Agent-root command entry and stream (AR-001)

| File | Change |
| --- | --- |
| `agent-run-collaboration/services/agent-run-collaboration-root-manager.ts` | **`resolveCommandReadyRoot(hostRunId)`** is the single owner of "an Agent root ready for a command". It calls `StandaloneAgentRunLifecycleService.resolveCommandReadyAgentRun(hostRunId)`: an active host is returned; a stopped or crashed host is restored in its transition lane, and the lane's activation hook calls `ensureRoot`, which takes no root gate. The lane is released when that call returns. The method then returns the registered root. The root gate is taken only afterwards, by the command itself, so the two are never nested. It rejects with `AGENT_ROOT_UNAVAILABLE` for ineligible runs (helper or application-owned). This mirrors `TeamRunService.resolveActiveTeamRun` |
| `services/agent-streaming/agent-collaboration-stream-handler.ts` | `connect(hostRunId)` calls `resolveCommandReadyRoot`, the same as Team stream `connect` → `resolveActiveTeamRun`, then sends the snapshot. Child commands (SEND_MESSAGE with optional mentions, INTERRUPT, APPROVE/DENY) run `root.executeAgentCommand(childRunId, …)`. SEND_MESSAGE wakes a child that was shut down under the existing live lease. Host targets are rejected (`AGENT_ROOT_HOST_COMMAND_REJECTED`); host commands stay on `/ws/agent/:runId` |
| `api/graphql/types/agent-run-collaboration.ts` | `agentRunCollaboration(runId)` serves the **stored** view (tree plus communication messages, all statuses `offline`) from the package when no root is active, or the live root snapshot when one is. It never restores. It returns null when the package is absent |
| `agent-run-collaboration/services/agent-run-collaboration-member-view-projection-service.ts` (new) | Stored conversation projection for an Agent-root child. Resolves the memory directory through the location family; mirrors `agent-org-member-run-view-projection-service.ts` |

**When the client connects (AR-001):**
- While a standalone run with `hasCollaboration` is **inactive**, the client uses `agentRunCollaboration` for the rows and
  the stored child projection for child conversations. It opens no stream.
- The client opens `/ws/agent-collaboration/:hostRunId` in two cases:
  - (a) the host is active and either the run has `hasCollaboration` or the client has just had a SEND_MESSAGE with
    `mentions` accepted on the host stream (an accepted ack means admission committed; no new ack field is needed);
  - (b) the user sends from a collaborator's composer while the run is stopped. The composer target for a stored child is
    `continuable`, and its continuation opens the stream. `connect` restores the host and ensures the root, then the queued
    SEND_MESSAGE is sent.
- The Stop → reopen → send-to-child journey therefore always has one named owner.

### Server — Context files for Agent-root members (AR-002)

| File | Change |
| --- | --- |
| `context-files/domain/context-file-owner-types.ts` | New `AgentCollaborationMemberDraftContextFileOwner {kind:"agent_collaboration_member_draft", hostRunId, agentRunId}`, `AgentCollaborationMemberFinalContextFileOwner {kind:"agent_collaboration_member_final", hostRunId, agentRunId}` and resolved `{…, rootSubjectKind:"agent", rootRunId, ancestorTeamRunIds, memoryDir}`. Exact-key parsing, as for the Org kinds. The host itself keeps `agent_draft`/`agent_final`, unchanged |
| `context-files/services/context-file-owner-resolver.ts` | `validateDraftOwner`/`Sync` resolve the matching final owner (the Org pattern). `lookup` → `{rootSubjectKind:"agent", rootRunId: hostRunId, agentRunId}` through the three-family location service. `result` checks the kind, root and run, then returns `memoryDir` (under `agents/<host>/collaboration/…`). Also requires `readiness.isAdmitted("agent", hostRunId)` |
| `context-files/store/context-file-layout.ts` | Draft dir `draft_context_files/agent-collaborations/<hostRunId>/agent-runs/<agentRunId>/context_files`. The final dir is `<memoryDir>/context_files` through the existing generic branch |
| `api/rest/context-files.ts` | Unchanged routes; the descriptor parsers accept the new kinds |
| web `utils/contextFiles/contextFileOwner.ts`, `composables/agentInput/useComposerTarget.ts#resolveDraftOwner` | `buildAgentCollaborationMemberDraftContextFileOwner(hostRunId, agentRunId)` for the target kinds `agent_run_task_agent` / `agent_run_task_team_member`, plus the matching final-owner builder used at finalization |

### Contracts

| Package / File | Change |
| --- | --- |
| `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` | compose/parse (new) |
| `autobyteus-team-stream-contracts/src/team-control-message-dtos.ts`, `team-execution-view-dtos.ts`, `team-stream-server-message.ts` | `mentions`, `collaborators`, `collaborator_added` |
| `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts`, `root-execution-view-dtos.ts`, new `agent-run-collaboration-dtos.ts` | Org `collaborators`, `collaborator_added`; root kind `agent` view and events; client `mentions` |

### Web (`autobyteus-web/`)

| File | Change |
| --- | --- |
| `components/agentInput/AgentUserInputTextArea.vue` | `@` menu (all live targets), chip row, combobox attributes |
| `composables/agentInput/useRunMentionMenu.ts` (new) | Trigger, query, choose, remove semantics per spec |
| `components/chat/ChatTargetMenu.vue` | `variant: 'launch' \| 'run'` strings and footer |
| `components/agentInput/MentionChipRow.vue` (new) | Chips |
| `services/collaborators/collaboratorCandidatesService.ts` (new) | GraphQL fetch, cache, invalidation |
| `types/agent/AgentContext.ts` | `requestedMentions` draft state |
| `stores/agentRunStore.ts`, `agentTeamRunStore.ts`, `agentOrgRunStore.ts`, new `agentRunCollaborationStore.ts` | Send `mentions`; local submission carries names for chips |
| `components/conversation/UserMessage.vue`, `utils/runTreeSummary.ts` | Parse the note; inline chips; strip from summaries |
| `services/collaborators/agentSourceSelectors.ts` (new) | Configured-then-collaborator source lookup for the Team, Org and Agent tree DTOs |
| `services/teamExecution/teamExecutionContextFactory.ts`, `teamExecutionTreeSelectors.ts`, `services/runHydration/teamRunContextHydrationService.ts`, `teamMemberProjectionHydrationService.ts`, `services/agentOrgExecution/agentOrgExecutionViewIndex.ts`, `utils/agentOrgHistoryRows.ts` | Use the selectors; handle `collaborator_added` |
| `services/agentCollaboration/*` (new: view index, streaming service, context hydration, inspection) | Standalone Agent root |
| `types/workspace/activeAgentWorkspaceTarget.ts`, `stores/activeContextStore.ts` | `standalone_agent` gains optional `collaborationMessages`; new kinds `agent_run_task_agent`, `agent_run_task_team_member` |
| `components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Task rows under standalone run rows; run-row click returns to the host |
| `components/workspace/history/WorkspaceTransientExecutionRow.vue`, `WorkspaceAgentOrgHistoryCollection.vue` | REQ-009 row changes |
| `composables/useRightSideTabs.ts` | rootKind `agent` → "Team" label |
| `components/agentInput/CollaboratorAddFailureNotice.vue` (new), plus its derivation in the conversation projection | REQ-008 |
| `localization/messages/{en,zh-CN}/*` | Spec strings |

## Applied Patterns

- **Port/adapter:** `CollaboratorRootPort` and the per-root task and communication adapters.
- **Registry/manager:** `AgentRunCollaborationRootManager`.
- **Strategy:** the per-root `TaskSourceResolver`.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `src/agent-collaboration/collaborators/` | Folder | Shared collaborator policy | Policy, admission, building, allocation, projection | Root or transport code |
| `src/agent-collaboration/execution/backends/` | Folder | Root-neutral hosting | Registries and directories shared by roots | Org or Agent specifics |
| `src/agent-run-collaboration/{domain,services,prompt}/` | Module | Agent root | Everything specific to the Agent root | Host lifecycle ownership |
| `src/run-history/store/agent-run-collaboration-*` | Files | Persistence | Package I/O | Business rules |
| `autobyteus-web/services/collaborators/`, `services/agentCollaboration/` | Folders | Web | Candidates and selectors; standalone root view | Eligibility authority |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-collaboration/collaborators/` | Off-Spine Concern | Yes | Low | Stateless, port-based |
| `agent-run-collaboration/` | Main-Line Domain-Control | Yes | Low | Mirrors `agent-org-execution` |
| `agent-collaboration/execution/backends/` | Main-Line | Yes | Low | Already holds root-neutral handles |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Tree | `rootTeam: {…, members:[…], collaborators:[{kind:"agent_team", address:"/product_team", …}], taskExecutions:[{address:"/product_team", teamRunId, …, delegatorAgentRunId}]}` | Run IDs inside `collaborators`; collaborators inside `members` | 0..N runs; Team invariants |
| Standalone package | `memory/agents/<id>/collaboration/{collaboration_tree.json, communication_messages.json, <childRunId>/…}` | Converting the run to a Team run | History continuity |
| Mention note | `…text\n\n[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team\nUse delegate_task with the address to bring one into this run; afterwards message the started instance with send_message_to and its run ID.` | Client-composed note; a note without addresses | Server-owned addresses |
| Resolver split | `send_message_to("/product_team")` → `COLLABORATION_TARGET_NOT_FOUND: "/product_team is a collaborator with no running instance; use delegate_task…"` | Lazily starting on message | Messaging creates nothing |
| Admission idempotency | Second `@Product Team` (for example from another chat) → reuse the entry, no new address | `/product_team_2` for the same definition | One entry per definition per run |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `resolveRecipient` and add a flag | Minimal diff | Rejected | Split methods |
| Leave Org hosting classes and import them from the Agent root | Minimal diff | Rejected | Move to root-neutral backends |
| Migration that writes `collaborators: []` into every tree | Uniform files | Rejected | Tolerant optional read (guideline §3) |
| A hardcoded list of helper definition IDs | Simple | Rejected | `launchPurpose` marker |
| Client-side candidate filtering as authority | No round trip | Rejected | Server policy; the client caches |

## Change / Refactor Sequence

1. **Contracts:** `mentions`, `collaborators`, `collaborator_added`, the agent root kind view and events, and the mention
   note (compose/parse with tests).
2. **Shared records and schemas:** `CollaboratorEntry`; optional read; invariants; writer key-set tests.
3. **Root identity `agent` and memory layout:**
   - add the kind, the memory layout, the classifier and the location family;
   - make every E-11 switch exhaustive (typecheck guard).
4. **Move the Org hosting classes** to `agent-collaboration/execution/backends/` and rewire the Org. No behavior change;
   run the Org suites.
5. **Collaborators module:** policy, allocator, builder, admission, projector (unit-tested with fake ports).
6. **Team root:** resolver split, source resolver, `agent_team` placement, admission, tree mutation, projector, stream
   handler.
7. **Org root:** the same steps.
8. **Standalone:**
   - `launchPurpose` on helper launches;
   - metadata;
   - the Agent-root module (tree store, root, manager, adapters, persistence, index, host context);
   - lifecycle hooks and termination;
   - coordinator mentions;
   - `resolveCommandReadyRoot`, the collaboration stream (connect semantics) and GraphQL (stored view);
   - Agent-root context-file owner kinds (server and web);
   - the stored child conversation projection;
   - catalog flag;
   - allocator.
9. **Tool exposure and prompt:** automatic tool rule; host prompt section; verify each runtime bootstrap (AutoByteus,
   Codex, Claude, AGY, ACP) exposes both tools to an eligible standalone run from its first turn.
10. **Web:**
    - selectors and collaborator-aware lookups for Team and Org, with `collaborator_added` handling;
    - the standalone collaboration store, stream, rows and tab;
    - the menu, chips, send, `UserMessage` and summary;
    - the failure notice;
    - task-row changes;
    - accessibility;
    - localization.
11. **Remove** the obsolete paths from the decommission table and update the docs:
    - server `docs/modules/agent_communication.md`, `agent_team_execution.md`, `agent_orgs.md`, `run_history.md`,
      `agent_tools.md`;
    - a new `agent_run_collaboration.md`;
    - web `docs/chat.md`, `agent_orgs.md`, `agent_teams.md`.

## Key Tradeoffs

- **The Agent root lives only while the host is active.** This is simpler than a root that is independent of the host.
  Children can never wait on a stopped host. Cost: stopping the host stops all its collaborators.
- **The host stays on its own stream,** and children use a new collaboration stream. This avoids rewriting the standalone
  stream. Cost: the client joins two streams for a standalone run with collaborators.
- **Entries snapshot the settings and the Team layout** (stable reopen) rather than following later definition edits.
- **All-or-nothing admission for multiple mentions.** Clearer errors, at the cost of rejecting a partly valid send.

## Risks

- **Runtime tool exposure for standalone runs** on AGY and ACP is unverified live. It is the escalation trigger.
- **Prompt change for every eligible standalone agent,** including Daily Assistant. Keep the section short; test with
  prompt snapshots.
- **Downgrade** drops `collaborators` from Team and Org trees (see the persisted-data decision).
- **Token analytics:** collaborator runs in an Agent root are not rolled up to the host (deferred).
- **Concurrency:** admission and delegation must share each root's existing operation gate (Team `materializationGate`,
  Org `operationGate`, and the Agent root's own gate). Host termination must fence the Agent root before terminating the
  host. A host wake (DS-009) takes the root gate and then the standalone transition lane. It must not run from inside a
  lifecycle transition, which would reverse the lock order.
- **Crash vs Stop:** only an explicit Stop cascades to the children. A host crash wakes the host on the next message
  instead. Tests must cover both.

## Guidance For Implementation

- **Visual fidelity:** follow the approved UI/UX spec and VIS-001–014 exactly. Treat the prototype's
  `prototype/run-mentions/*` as behavior evidence only.
- **Server tests:**
  - admission idempotency and all-or-nothing behavior;
  - address collisions;
  - the resolver split and hint;
  - delegation and restore of collaborator Agents and Teams in all three roots;
  - Org host rule preserved (a task under a mounted-Team member stays under that Team);
  - Agent-root lazy package, termination cascade on explicit Stop, and the catalog flag;
  - host wake: a child message to a host whose runtime died restores the host (`restore` mode) and delivers; the root
    survives the host crash; a user send after restart re-creates the root with children shut down and wakeable;
  - **Stop → reopen → send to a child (AR-001):** the stream connect restores the host, ensures the root, the child wakes
    and replies, and no lane or gate is nested;
  - `agentRunCollaboration` serves the stored view without restoring;
  - **context files (AR-002):** draft upload, finalization and read for an Agent-root child resolve under
    `agents/<host>/collaboration/<child>/context_files`, and are rejected for a wrong host or child;
  - **`get_handoff_rules` (AR-003):** exposed for Team/Org members and task-Team members in every root; not exposed for the
    Agent-root host or a task Agent directly under an Agent root;
  - **candidate policy (AR-004):** after a failed add the definition is still offered, and a second mention reuses the entry
    (same address);
  - `launchPurpose` exclusion;
  - exposure for host, children, helpers and application-owned runs;
  - optional-read and exact-write key sets for all three tree families;
  - memory classification of `collaboration/` subtrees;
  - allocator collision across the three families.
- **Web tests:** the menu (states, keyboard, empty), chips removal semantics, inline chip parsing, selectors, standalone
  rows and tab, the failure notice, row changes.
- **Candidates:** do not add Daily Assistant or internal built-ins to the candidates, even if they are shared in the catalog.
- **The `send_message_to` code paths must stay free of allocation.** Add an explicit test that messaging a collaborator
  address creates nothing.
