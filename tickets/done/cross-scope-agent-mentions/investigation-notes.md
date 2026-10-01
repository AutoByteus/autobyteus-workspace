# Investigation Notes — cross-scope-agent-mentions

## Bootstrap

- Package ID: `cross-scope-agent-mentions`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions`
- Branch: `codex/cross-scope-agent-mentions`
- Base: `origin/personal` @ `57df63f079363ccab4f2301213f9d8a3458f72fa` (fetched 2026-09-30)
- Finalization target: `personal` (tracked default)
- Status: requirements Draft; analysis stage (user asked for analysis of a broad idea)

## Original Request (summary)

User starts a standalone AgentTeam (e.g. Software Engineering Team), later realises
they need UI support from Product Prototyper, but Product Team is not in the same
root because they did not launch an AgentOrg. Proposal: a hidden global default
AgentOrg that implicitly contains every standalone Agent/Team run, so that `@` in
any chat can send a message to any other Agent/Team. Users can still create their
own Orgs.

## Current-State Evidence

### E-01 Two `send_message_to` selectors, different scopes
Source: `autobyteus-server-ts/docs/modules/agent_communication.md`,
`src/agent-communication/services/global-agent-run-message-router.ts`.
- `recipient_address` (logical `/team/agent`) resolves only within the caller's
  own collaboration root (standalone Team run or Org run). Can wake Offline members.
- `target_agent_run_id` is global: same-root targets go through root delivery
  (wakes shut-down delegated children); any other target must be **active now**
  in `AgentRunManager.getActiveRun`, else `TARGET_AGENT_RUN_NOT_ACTIVE`.
- Cross-root direct messages emit no Team Communication projection (no Org/Team
  tab row, no reference persistence).
- Conclusion: cross-root messaging mechanically exists, but (a) agents cannot
  discover other roots' run ids (no discovery API by design), (b) targets must
  already be running, (c) nothing is shown in the Org tab.

### E-02 AgentOrg is a configured, persistent composition root
Source: `tickets/done/flat-agent-organization-model/agent-org-contract.md`,
`autobyteus-server-ts/docs/modules/agent_orgs.md`.
- Org = fixed authored member list + handoff graph + one launch configuration +
  one lifecycle + one AgentOrg V1 persistence package. Standalone Team runs keep
  native Team V2 packages; "shared record shapes do not imply a generic persisted
  root union".
- ORG-CASE-021/025: "No global/unrelated-run lookup"; "no implicit cross-run routing".
- Addresses are placement names from the definition (`/software_engineering_team/...`),
  not run instances.
- Members are lazily started: Offline and provider-unbound until first work.

### E-03 `delegate_task` only instantiates definitions mounted in the same root
Source: tool contract + `agent_communication.md` "Communication Versus Task Execution".
- Runtime task Agents/Teams are allowed beneath a host scope and do not mutate
  configured membership (includes task Team under a standalone Team).
- A standalone SE Team has no mounted Product Team, so it cannot delegate to it.

### E-04 Chat `@` today is a launch-target picker, not a live mention
Source: `autobyteus-web/composables/chat/useChatComposerOptions.ts`,
`components/chat/ChatNewSurface.vue`, `components/chat/ChatComposer.vue`, `docs/chat.md`.
- `@` menu lists shared Agent definitions (except Daily Assistant) and shared
  Team definitions; "Agent Orgs are not addressable".
- Only `ChatNewSurface` passes `targetOptions`; run views pass `null`, so `@` is
  disabled in a live run composer. Selecting an option calls
  `chatDraftStore.setTarget` — it chooses what to launch.
- So "@ sends a message to that person in any chat room" is **new behavior**, not
  an extension of an existing live mention.

### E-05 Screenshot context
The screenshot shows the user inside an Org run (`New - AutoByteus Org`) that
already mounts `product team`; there, `/product_team` is already reachable. The
pain is specifically the standalone-launch case.

### E-06 How `delegate_task` is displayed today (answer to Product Prototyper, 2026-09-30)
Source: code and docs read at `origin/personal` @ `8caa610ff`. Not run live.
- The brief is not a Team Communication row. Activation publishes only
  `TASK_EXECUTION_STARTED` (`root-task-execution-lifecycle.ts`).
- In the child's conversation the brief is a `SYSTEM_TASK_NOTIFICATION` from sender
  system, with the text "Task delegator address / AgentRun ID / Description /
  Reference files" (`task-execution-input.ts`,
  `collaboration-agent-presentation-event-adapter.ts`). The frontend renders it as a
  `system_task_notification` segment, like ordinary chat content.
- The delegator's conversation gets only the tool call and its result
  `{ target_agent_run_id }`. The tree row comes from `TASK_EXECUTION_STARTED`.
- Later same-root run-ID `send_message_to` goes through `deliverExactAgentMessage`
  to `communication.deliver`, so it is recorded as Team Communication and shows in
  the Team/Org tab.
- Corrects E-01: "no projection" applies only to targets outside the sender's root.

### E-07 Where task children get their definition and settings (pre-approval architecture probe, 2026-09-30)
- `run-history/domain/run-execution-tree-shared-records.ts`: `TaskAgentExecution` and `TaskTeamExecution` store only
  `address`, run IDs, `delegatorAgentRunId` and `startedAt`. There is no definition ID and no launch config.
- `agent-team-execution/task-delegation/team-task-execution-adapter.ts` uses `findTaskConfigNode(config.rootTeam, address)`
  both to activate and to restore a child. The definition and launch config come from the configured node at the same
  address. This is the server side of F-001.
- `agent-collaboration/execution/domain/root-execution-identity.ts`: `RootSubjectKind = "agent_team" | "agent_org"`.
  There is no Agent root. This is F-005.
- The root task lifecycle (`RootTaskExecutionLifecycle`) and the communication engine (`RootCommunicationEngine`) are
  generic and use per-root adapters (`TeamTaskExecutionAdapter`, `AgentOrgTaskExecutionAdapter`).
- Codex receives the Agent Tools MCP server through thread-scoped `config.mcp_servers` (`docs/modules/agent_tools_mcp_server.md`).
  Adding tools mid-conversation for a standalone Agent is a runtime risk that has to be checked.

### Design direction (pre-approval sketch; not the design spec)
- The collaborator lives in the **root the user is already in**. It is not put into a Team, not put into an Org, and there is no global Org.
- A mention writes an **attached placement** into that root's run tree. This is a delegation-only, root-level
  placement: address, kind, definition ID, a snapshot of the root launch config taken when it is attached, a Team snapshot,
  and who attached it. It has no execution of its own and is kept separate from configured `members`, so the
  configured-topology invariants and handoff compilation are untouched.
- The collaborator is an ordinary task execution at that address. Existing activation, restore, idle shutdown, work
  packet, run-ID messaging and Team/Org tab projection all apply unchanged. `findTaskConfigNode` finds the
  attached placement as its source.
- Address: one root-level segment derived from the definition name (`/product_team`, `/computer_use_agent`), with a
  deterministic suffix if the name collides. Members of a task Team keep the existing rule (`/product_team/product_prototyper`).
  After delegation, agents talk to the collaborator by run ID, as today.
- Standalone Agent run: add a third root kind (`agent`). The Agent run owns a small collaboration package, created
  lazily on the first mention, and gets a third adapter for the generic lifecycle and communication engine.
  Runs that never have a mention stay byte-for-byte unchanged.
- Standalone Agent persistence today (`docs/modules/run_history.md`, `src/run-history/store/agent-run-metadata-types.ts`):
  `memory/agents/<runId>/run_metadata.json` holds resume/config facts, the host's raw traces sit next to it, and the
  catalog row lives in `memory/run_history_index.json`. There is no tree and no communication file. Team and Org runs keep
  their tree and messages under `memory/agent_teams/<id>/` and `memory/agent_orgs/<id>/`, with child memory nested by run ID.
- Sketch for the standalone Agent run: keep the run itself unchanged and add an optional `collaboration/` package under
  `memory/agents/<runId>/`, containing a tree (attached placements plus task executions), communication messages, and child
  memory. It is created on the first mention. Root identity is `{rootSubjectKind:"agent", rootRunId:<runId>}` and the host
  address is `/<agent_name>`. A third adapter plugs into the generic task lifecycle and communication engine. Stop, archive
  and delete cover the package. The history row stays the same Agent row, and children are projected under it.
  - Rejected: converting the run to a Team run on the first mention. That changes its history family, list section and
    memory paths, and needs a migration.
  - Rejected: making children separate standalone runs. They would get their own history rows, no root would own their
    lifecycle, and their messages would not be projected to the Team tab.
- Team tree evidence (`run-history/store/team-run-execution-tree-schema.ts`, `agent-team-execution/services/team-run-execution-tree-mutator.ts`):
  `rootTeam` has `members` (direct Agents only; the parent must be `/`) and `taskExecutions`. `addTaskExecutionToTree` appends
  to the owner Team's `taskExecutions`. `validateTaskExecutionDelegators` accepts any Agent run in the tree as delegator,
  including task-Team members.
- Sketch for the tree shape: add `rootTeam.attachedPlacements[]`, separate from `members`. Each entry holds kind, address,
  definition ID/name, the root launch snapshot, the Team snapshot (members, coordinator, Team-local handoffs), `attachedAt`
  and `attachedByAgentRunId`. Collaborators are ordinary entries in `rootTeam.taskExecutions` whose `delegatorAgentRunId`
  is whoever brought them in. Storage stays flat at the root, and nesting is shown through the delegator.
- Naming (user suggestion, Solution Designer agrees, 2026-09-30): the tree field is `collaborators` (formerly sketched as `attachedPlacements`).
  One entry is one collaborator of this run: address, kind, definition ID, the root launch snapshot, the Team layout, and
  `addedAt`/`addedByAgentRunId`. Its running instances stay in `taskExecutions`. The word `collaborator` is not used
  anywhere else in server code (one generic comment in `team-agent-platform-binding-committer.ts`), so the name does not clash.
- Collaborator entries hold no run IDs (user agreed, 2026-09-30). Run IDs stay in `taskExecutions`, linked by address.
  Reasons: the entry exists before any run (permission written at send; delegation may fail); one collaborator can have
  0..N runs, because `delegate_task` always starts a fresh copy, so run IDs on the entry would be duplicated; and all child
  lifecycle, streaming and UI code already reads `taskExecutions`.
- Lean entry (user direction): no role, description or display name. Names come from the catalog.
- Timing: attach and authorize at send. Attaching again is idempotent per definition. The run counts the definition as
  "in the run" (not offered again) once a task execution exists.

### E-08 What `send_message_to` starts or wakes (at 8caa610ff)
- By address: `RootTeamRun.deliverInterAgentMessage` → `resolveConfiguredRecipientIdentity` needs a configured
  placement in the index (`index.getConfiguredPlacement`). Otherwise it fails with `COLLABORATION_TARGET_NOT_FOUND`
  ("has no live configured Agent ingress"). For an Offline configured member,
  `ConfiguredAgentExecutionHandle.postMessage` → `ensureReady()` → `planner.prepare(...)` starts that member's
  runtime, using the run ID already stored in the tree.
- By run ID in the same root: `deliverExactAgentMessage` → `withLiveLease` restores a delegated child that was shut down.
- Neither path allocates a new run ID or adds an execution to the tree. `send_message_to` starts or wakes an existing
  entry; it never creates one. Only `delegate_task` (task lifecycle `prepareActivation`) allocates and records a new execution.
- Design consequence: `send_message_to("/product_team")` to a collaborator entry has no configured ingress and is rejected.
  The design should make that rejection say to use `delegate_task`.
- Correction to the earlier sketch: Org task activation uses the delegator's host
  (`AgentOrgTaskExecutionAdapter.prepareActivation`: `getIndex().requireAgent(identity.agentRunId).host`). Team
  activation uses the target's parent address (`TeamExecutionScopeResolver.resolveTargetOwner`), so a root-level
  collaborator is hosted at the root. Collaborators follow each root's existing host rule, and the `collaborators`
  entry itself always lives at the root.

### Architecture investigation (after approval, SR-004; base `origin/personal` @ `8caa610ff`, worktree rebased)
All paths below are relative to `autobyteus-server-ts/src/` or `autobyteus-web/`.
- **E-09 Tool exposure seam.** `agent-execution/shared/runtime-agent-tool-exposure.ts`:
  `buildRuntimeAgentToolExposure(toolNames, memberExecutionContext)` adds `AUTOMATIC_TEAM_TOOL_NAMES`
  (`get_handoff_rules`, `send_message_to`, `delegate_task`) whenever a member context exists. Every runtime calls it:
  Codex `codex-thread-bootstrapper.ts:242`, Claude `claude-session-bootstrapper.ts:70`, AutoByteus
  `autobyteus-runtime-tool-exposure.ts`, AGY and ACP backend factories, and restore via `agent-run-restore-context-factory.ts`.
  Codex fixes its MCP tool list at `thread/start` and `thread/resume` (`docs/modules/agent_tools_mcp_server.md`).
- **E-10 Helper runs use the user path.** `ServerCompactionAgentRunner` and
  `SkillImprovementImproverSessionService` call `AgentRunService.createAgentRun`, the same path user runs use. The improver's
  definition is chosen in settings (`retrospective-skill-improver-agent-settings-resolver.ts`), so the definition ID cannot
  tell a helper run apart. Application-owned runs carry `applicationExecutionContext` in `AgentRunConfig` and in
  `run_metadata.json`. `StandaloneAgentRunLifecycleService.buildConfig` builds every standalone `AgentRunConfig` from
  metadata with no member context.
- **E-11 Member-context consumers.** 36 server files use it. The ones that matter here: prompt composition
  (`carpenter-prompt-composer.ts` renders Team instruction plus AgentTeam Addressing/Collaboration), tool exposure,
  the token-usage enricher (only `agent_team` sets `root_team_run_id`), the compaction lineage resolver (only `agent_team`),
  the delegation tool context validator (`task-delegation-tool-contract.ts` accepts only `agent_team`/`agent_org`), and the
  global router's same-root path through `ActiveCollaborationRootDirectory`. Server files that switch on root kind
  (from a grep): root-execution-identity, collaboration-agent-presentation-adapter,
  collaboration-execution-location-service, task-delegation-command, compaction-lineage-scope-resolver,
  token-usage-context-enricher, runtime-memory-location-classifier, agent-memory-layout, team-run-context,
  application-agent-tool-capability, definition-admission-result, collaboration-run-history-index-repair,
  collaboration-run-history-catalog-core, root-run-package-current-validator, token-usage-display-field-capturer.
- **E-12 Where delegation finds its target and source.**
  - Team: `RootTeamRun.delegateTask` → `TeamRecipientResolver.resolve(index, address)` (configured placement only;
    `ResolvedTeamRecipient` is `kind:"agent"` only) → `TeamTaskExecutionAdapter.prepareActivation` →
    `findTaskConfigNode(config.rootTeam, address)`, which is also used on restore. The host is
    `TeamExecutionScopeResolver.resolveTargetOwner`, based on the target's parent address.
  - Org: `AgentOrgRun.resolveRecipient` (configured placement) → `AgentOrgTaskExecutionAdapter.prepareActivation` →
    `findAgentOrgConfiguredSourceNode`. The host is the delegator's host.
  - In both roots the same resolver serves `send_message_to` and `delegate_task`.
  - `TaskTeamRunIdentityFactory.create({source: TeamRunAgentTeamNode})` materializes fresh run IDs from a source node.
    `prepareTaskAgent({address, agentRunId, sourceNode})` takes a `TeamRunAgentNode`-shaped source.
- **E-13 Org hosting pieces are root-neutral in substance.** `AgentOrgRootAgentExecutionRegistry.prepareTask` and
  `AgentOrgTeamExecutionDirectory.prepareRootTaskTeam` take only a root identity, callbacks and a factory. Only their names
  and messages are Org-specific.
- **E-14 Tree readers.** `team-run-execution-tree-schema.ts` and `agent-org-run-execution-tree-schema.ts` read tolerantly
  (required keys plus invariants; unknown keys ignored) and write exactly. `data_migration_guideline.md` §3 (last changed in
  `380876bc0`): adding an optional field whose absence has a truthful meaning needs no migration.
  `agent-run-metadata-store.ts#normalizeMetadata` projects known fields, so it is tolerant.
- **E-15 Standalone storage and delete.** `AgentMemoryLayout.getRootExecutionDirPath` supports only team/org.
  `AgentRunHistoryCatalogService.deleteRun` removes `memory/agents/<runId>/` and refuses while the host is active.
  `AgentRunIdentityAllocator.hasCollision` checks active runs, metadata, the standalone directory and
  `CollaborationExecutionLocationService.containsRunId` (team and org families only).
- **E-16 Streams.**
  - Standalone: `/ws/agent/:runId` (`agent-stream-handler.ts`). Its SEND_MESSAGE payload is parsed loosely and posted
    through `AgentRunCommandCoordinator.postUserMessage`, which activates or restores the run.
  - Team: `/ws/agent-team/:id`. The strict `teamSendMessageClientPayloadSchema` lives in `autobyteus-team-stream-contracts`.
  - Org: `/ws/agent-org/:id`, using `autobyteus-collaboration-stream-contracts`. Root kind is `agent_team | agent_org`,
    with an org view (tree, communication messages, statuses) and events `agent_presentation`, `task_execution_started`
    and `communication`.
- **E-17 Frontend.**
  - Live composer: `components/agentInput/AgentUserInputTextArea.vue` (`/` via `useSkillTagMenu`, `detectMenuTrigger`).
  - New chat `@` menu: `ChatTargetMenu.vue` and `chatComposerMenus.ts`.
  - Skill tags travel in the content through `utils/skills/skillRequestInstruction.ts` (compose/parse); `UserMessage.vue`
    and `runTreeSummary.ts` parse them.
  - Task source lookup by configured address: `teamExecutionContextFactory.configuredAgentAtAddress`,
    `teamExecutionTreeSelectors.findConfiguredAgentByAddress`, `AgentOrgExecutionViewIndex` (`configured.get(address)`) and
    `utils/agentOrgHistoryRows.ts`.
  - Task rows: `WorkspaceTransientExecutionRow.vue` and `WorkspaceAgentOrgHistoryCollection.vue` ("Started by").
  - Standalone rows: `WorkspaceHistoryWorkspaceSection.vue`.
  - Right-tab label: `useRightSideTabs.ts` switches on `collaborationMessages.rootKind`.
  - Target kinds: `types/workspace/activeAgentWorkspaceTarget.ts`.

- **E-18 Context files and other root-kind sites (ARCH-REV-001 AR-002).**
  - `context-files/domain/context-file-owner-types.ts` has one owner kind per family: `agent_*`, `team_member_*` and
    `org_member_*` (exact-key parsing).
  - `context-files/services/context-file-owner-resolver.ts` checks standalone owners through `RootRunPackageReadinessIndex.isAdmitted("agent")`
    and resolves Team and Org owners through the location service, returning `memoryDir`.
  - `context-files/store/context-file-layout.ts` places drafts under `draft_context_files/{agent-runs,team-runs,agent-org-runs}`
    and final files under `<memoryDir>/context_files`.
  - Web `utils/contextFiles/contextFileOwner.ts` holds the builders.
  - Other switch sites: `agent-tool-mcp-session-service.ts:101` (a generic kind-equality check),
    `application-execution-scope.ts:69` (application scopes admit Team members only),
    `root-run-package-readiness-index.ts` (families), and
    `task-delegation-command.ts:32` (`rootSubjectKind: "agent_team" | "agent_org"`).
- **E-19 Command-ready root precedent (AR-001).** `AgentTeamStreamHandler.connect` → `teamRunService.resolveActiveTeamRun`
  (it may restore an unmanaged persisted root) → `root.executeAgentCommand`. `AgentOrgStreamHandler.connect` requires an
  active Org. `StandaloneAgentRunLifecycleService.resolveCommandReadyAgentRun` restores inside `withTransition` and releases
  the lane when it returns.

- **E-20 How task-Team members resolve teammate addresses (DI-001, at `5dcc5dc82`).**
  - Live evidence: `api-e2e-evidence/c-02-observation.log` (Claude). The collaborator Team coordinator's
    `get_handoff_rules` returns `/obs_team/mate`, `send_message_to("/obs_team/mate")` returns
    `COLLABORATION_TARGET_NOT_FOUND`, and the coordinator reports "Cannot complete handoff rule".
  - Code:
    - Agent root: `agent-run-collaboration-recipient-resolver.ts#resolveMessageRecipient` accepts the host only.
    - Team: `RootTeamRun.deliverInterAgentMessage` → `resolveMessageRecipient` → `resolveConfiguredRecipientIdentity`
      (configured only).
    - Org: `AgentOrgRun.deliverLogicalMessage` → `resolveRecipient` → `resolveRecipientIdentity` (configured only).
  - **Pre-existing Org behavior:** a task Team delegated at a mounted Team's address (e.g. `/se_team`) has members whose
    `send_message_to("/se_team/mate")` reaches the **configured** `/se_team/mate`, not the task Team's own `mate`.
    No document states this as intended behavior (grep of `docs/modules/agent_team_execution.md`, `agent_orgs.md` and
    `agent_communication.md`).
  - Before this ticket, Team roots had no reachable task Teams (`ResolvedTeamRecipient` was Agent-only).

## Analysis Of The Proposal

### Literal "hidden global default Org" — concerns
1. Concept mismatch: an Org owns a fixed member list, one lifecycle, one launch
   config, one persistence package. A global org would have an unbounded, changing
   set of independent runs with independent lifecycles — it would be a directory,
   not an Org. Making it a real Org implies migrating every run to one package.
2. Address ambiguity: two runs of the same Team → `/software_engineering_team`
   is ambiguous; definitions that are not running have no address at all.
3. Not-running targets: Product Prototyper is usually not running; "send to" must
   become "start and send", i.e. the delegate_task path.
4. Isolation: every agent could reach every run across unrelated projects and
   workspaces — noise, accidental cross-talk, larger prompt-injection surface.
   Contradicts the approved Org contract.
5. History: cross-root messages have no projection today; each side's Org tab
   would miss the exchange.

### Alternatives identified
- A. Literal global default Org (above).
- B. Per-run implicit/ad-hoc scope ("every run is its own open, growable
  workspace"): user `@`-mentions a catalog Agent/Team inside a live run; system
  starts a fresh instance as a runtime child of the current root (reusing the
  delegated-child machinery), delivers the message, and it becomes addressable by
  the root's members and visible in the Org tab. Persistence stays in the host package.
- C. Cross-root link: `@` an already-running run from another root; creates an
  explicit link so both sides can exchange messages; needs discovery UI, wake
  semantics and dual-sided history.
- D. Promote a standalone Team run into an Org run and add members: persistence
  family conversion; heaviest.

## Open Questions
- Q1 `@` meaning in a live run: send directly to X, or tell the focused agent to
  involve X (focused agent receives message + X's handle)?
- Q2 Fresh instance only (B), or also existing running runs (C)?
- Q3 Runtime/model/workspace for the new collaborator: inherit host root config or
  prompt the user?
- Q4 Should Orgs themselves become `@`-addressable (e.g. `@AutoByteus Org`)?
- Q5 After adding, may host agents message the guest without user involvement
  (recommended: yes, within the root)?

## Solution Designer Recommendations (2026-09-30, not yet user-approved)
- Q1: (b). The message goes to the agent you're talking to. The mention makes the
  definition available to that run for delegation. The focused agent then
  calls `delegate_task` with a full brief. Once the new member exists in the tree,
  the user can focus it and talk to it directly.
- Q2: Fresh copies only, as children of the current run. Linking to runs in other
  roots is deferred: it is live-only, has no discovery, splits history and has
  no clear lifecycle owner.
- Q3: Copy the current run's runtime, model and workspace settings. This matches
  the Org rule that definition defaults do not override the active scope. Editable
  afterwards through the existing per-member settings. Fail visibly if not runnable.
- Q4: No. An Org has no coordinator, so it has no one to receive the message, and
  putting an Org inside a run would nest Orgs, which is forbidden.
- Q5: Yes, only inside the same run and in both directions, using the existing
  address/run-id messaging. No automatic handoff rules. Not visible to other runs.
- Extra: mentioning the same definition again should not create a copy
  automatically. The agent chooses between `send_message_to` to the existing run
  and a new `delegate_task`.

## Supplement Inventory
| Supplement | Owner | Purpose | Related IDs | Status | Approval applies |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions/ui-ux-spec.md` + `visual-references/` (VIS-001–014, SHA-256 verified) | Product Prototyper | Normative UI/UX | REQ-001–011 | Approved (user) | Yes, part of the SR-004 basis |
| `…/tickets/done/cross-scope-agent-mentions/prototype-ticket.md`, `prototype-change-log.md`, `ui-behavior-test-matrix.md` | Product Prototyper | Decisions, change history, behavior matrix | — | Final | Evidence |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/mock-boundaries.md` (prototype repository root) | Product Prototyper | Mocked boundaries | — | Current | Evidence |
| `product-design-request-handoff.md`, `architecture-design-handoff.md` (this folder) | Solution Designer | Handoffs | — | Final | N/A |
| `design-review-report.md`, `architecture-review-revision-record.md` (this folder) | Architecture Reviewer | Review ARCH-REV-001 | — | Fail (ARCH-REV-001) | N/A |
