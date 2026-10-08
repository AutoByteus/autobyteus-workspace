# Investigation Notes

## Investigation Meta

- Package identifier: `delegated-team-member-lazy-activation`
- Request / ticket: Project Task Manager delegation (2026-10-08) — "Delegated team copy: every member shows as active (green Idle) as soon as the team is delegated"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation` / `codex/delegated-team-member-lazy-activation`
- Resolved base remote / branch / revision: `origin` / `personal` / `4a51482a5ef8c678d69a3ffc995d6876fd170a2f` (fetched 2026-10-08)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Pass — dedicated worktree created from freshly fetched `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-004`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-08). Architecture gate: `references/architecture-design.md`, `design-principles.md`, repo `DESIGN.md` (2026-10-08)
- Investigation status: Complete (requirements + architecture). Base refreshed to `origin/personal` `ace86bf1f` before architecture investigation.

## Initial Request And Clarifications

- Original request: After `delegate_task` spawned a `/software_engineering_team` copy (coordinator `solution_designer_6004ee5e9d3743a09b969fc8772280ba`), every member in the Workspaces sidebar showed a green dot ("Idle"), including delivery engineer, which had received nothing. api e2e engineer showed blue (running). Find out whether members are actually started or only displayed as active; fix the root cause so members start only when work reaches them and the UI shows their true state; explain the api e2e engineer state.
- Clarifications received: None yet.
- User-supplied facts and constraints: Activate-on-work principle — a member becomes active only when work reaches it (teammate message or user). Green must mean really running. Both "all started" and "UI lies" are bugs.
- Initial ambiguity: Which of the two it is (answered below: members are actually started). Exact presentation wording for a never-started member (open decision DEC-001).

## Product And Domain Understanding

- Product area: Agent collaboration runtime — delegated task copies (`delegate_task`), Team member lifecycle/status, Workspaces sidebar and member header status.
- Affected actors or systems: Any agent that delegates to a Team (Project Task Manager, standalone agents, Team members, Org members); the delegated Team copy's members; the user observing status.
- Existing user or operational purpose: Delegating a Team copy gives the Team's coordinator the work; the rest of the Team collaborates via messages/handoffs.
- Relevant terminology: *task execution / task copy* = the copy spawned by `delegate_task`; *configured member* = member of a Team as defined; *activation* = creating the member's live AgentRun and provider session/thread; *idle* = live AgentRun with no turn (green); *offline* = no live AgentRun (gray).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-collaboration/execution/backends/root-team-execution-directory.ts:137-156` (`beginRootTaskTeam`) | How a root-hosted delegated Team copy is materialized | Calls `factory.beginMaterialization({ activationMode: "fresh", prepareConfiguredAgents: true })` | Root cause |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-team-execution/local/registries/task-team-execution-registry.ts:76-88` (`beginPreparation`) | Team-hosted delegated Team copy (a Team member delegates a Team) | Same: `activationMode: "fresh", prepareConfiguredAgents: true` | Same root cause, second entrypoint |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-factory.ts:114-160` | What `prepareConfiguredAgents` does | `prepare()` calls `manager.prepareConfiguredActivation()` when true | — |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-manager.ts:91-96`; `prepare-flat-team-configured-activation.ts` | Scope of eager preparation | Iterates **every** member context and calls `handle.prepareConfiguredActivation()` | — |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts:167-200, 260-330` | What member activation does | `prepareConfiguredActivation` builds AgentRunConfig, begins a candidate AgentRun via `AgentRunManager.beginActivation`, stages provider binding; `commitAfterDurability` publishes the live AgentRun and binds its events. The lazy path (`ensureReady` from `postMessage`/`reserveInput`) does the same on first work | Lazy path already exists |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts:48,185` | Provider cost of activation (Codex) | Activation of a new Codex member calls app-server `thread/start` | Real provider resource per member |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts:26-55` | Provider cost of activation (Claude Agent SDK) | Activation materializes workspace skills and creates a Claude run session (session id); `query()` process starts on first input (doc `agent_execution.md:608`) | Real local resources per member |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-team-execution/local/flat-team-agent-execution-handle.ts:50-58` | Status of a never-activated member | `getLeafAgentStatusSnapshots()` reports `offline` when no handle/run exists | With lazy activation the backend already reports offline |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-root-materializer.ts:98`; `local/registries/collaborator-team-execution-registry.ts:50`; `root-team-execution-directory.ts:96` | Other Team entrypoints | Team started from UI (fresh/restore) and collaborator Teams (`send_message_to` a Team) use `prepareConfiguredAgents: false` → lazy | Not affected |
| 2026-10-08 | Code | `root-team-execution-directory.ts:240-260` (`restoreRootTaskTeam`); `task-team-execution-registry.ts:53` | Restored (after idle shutdown / restart) delegated Team copy | `activationMode: "restore", prepareConfiguredAgents: false` — "members activate lazily on input" | Lazy path for task-Team members already exercised in production |
| 2026-10-08 | Code | `agent-org-execution/services/agent-org-task-execution-adapter.ts:120` | Org-hosted delegation of a Team | Uses the same `teams.beginRootTaskTeam` | Covered by same fix |
| 2026-10-08 | Code | `standalone-agent-run-root/services/standalone-root-builder.ts:74-96`; `domain/standalone-agent-run-root.ts:295-308`; `services/standalone-root-tree-mutator.ts:96-116` | Can a late (first-work) provider binding of a task-Team member be persisted? | One callback set serves collaborator and task Teams; `commitAgentPlatformBindingChange` → `adoptStandaloneRootPlatformBinding` maps over all agents in the root tree; `platformAgentRunId` is nullable in task records (`run-execution-tree-shared-records.ts`) | Feasible; verify for Team and Org roots in architecture |
| 2026-10-08 | Code | `agent-collaboration/execution/task/root-task-dispatch.ts`; `root-team-execution-directory.ts:180-187` | How the coordinator receives the work | After commit, `acceptSeed` → `teamRun.postMessage(workPacket, coordinatorAgentRunId)` → coordinator handle `postMessage` → `ensureReady` | Coordinator activates via the work itself under a lazy policy |
| 2026-10-08 | Code | `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` (`onAgentStatus`, idle schedule) | Idle-shutdown interaction | Grace timers arm/cancel per task copy from member statuses; unactivated members report offline | Verify in architecture that an all-offline-but-coordinator copy still shuts down correctly |
| 2026-10-08 | Doc/Ticket | `tickets/done/collaboration-follow-up-fixes/investigation-notes.md` (BEH-001, ASM-002) | Prior user decision on the same principle | User decision: "unused configured Agents remain unstarted until required work; no cosmetic color" | Principle already approved for configured Teams/Orgs |
| 2026-10-08 | Doc/Ticket | `tickets/done/flat-agent-organization-model-follow-up/design-spec.md:14-16, 68-82, 220, 275-277` | Why delegated Teams were left eager | Fix explicitly scoped to configured roots: "Keep prepareTask eager", "preserve eager task candidate staging"; notes the deferred-failure consequence of lazy activation | The delegated-Team gap was a deliberate scope boundary, not a reviewed product decision for task Teams |
| 2026-10-08 | Data | `~/.autobyteus/server-data/memory/agents/project_task_manager_7c8dce0c4a8b44f88e776a83809dee03/collaboration/collaboration_tree.json` | Ground truth for the user's run | Both delegated `/software_engineering_team` copies (`…1779585d…` started 03:58:07Z, `…281f7ebf…` started 05:16:34Z) persist a `platformAgentRunId` for **all six** members, runtime `claude_agent_sdk` / `opus` | Members that never received work (architecture reviewer, code reviewer, delivery engineer) were activated at delegation time |
| 2026-10-08 | Data | Same dir, `software_engineering_team_1779585d…/` listing | Which members did work | Memory dirs exist only for solution designer, implementation engineer, api e2e engineer | Others had a provider session but no conversation |
| 2026-10-08 | Data | Same dir, `communication_messages.json` | Why api e2e engineer was blue | 04:14Z, 04:18Z, 04:21Z solution designer → implementation engineer ("direct route: Medium/Low"); 04:54:37Z implementation engineer → api e2e engineer "Implementation Complete … direct route"; api e2e traces until ~05:19Z (07:19 local) | api e2e engineer was legitimately running |
| 2026-10-08 | Code | `autobyteus-web/utils/workspaceStatusDotPresentation.ts`; `composables/useStatusVisuals.ts`; `components/workspace/agent/AgentStatusDisplay.vue` | Current presentation of states | idle → green, running → blue pulse, initializing → amber pulse, offline → gray + "Offline" | Existing state set is sufficient if unstarted = offline |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | `delegate_task` to a Team address (by a standalone Agent, a Team member, or an Org member; description- or task_id-based; also a Team helper brought in for Task work) | Copy planned → every member's AgentRun + provider session/thread is created and published (eager) → durable tree records each member's binding → coordinator receives the work packet | Every member is live and reports `idle` (green) immediately; unused members hold provider resources until the copy's idle shutdown | Source rows above; user's tree data | High |
| BEH-002 | User | User starts a Team from the UI (fresh or restore) | Team root admitted; members activate on first message/handoff | Unused members are `offline` (gray) | `team-root-materializer.ts:98`; ticket `collaboration-follow-up-fixes` | High |
| BEH-003 | System | `send_message_to` a collaborator Team address (brought in on first use) | Collaborator Team prepared without member activation; coordinator activates on the message | Unused members `offline` | `collaborator-team-execution-registry.ts:50`; `root-team-execution-directory.ts:96` | High |
| BEH-004 | System | Delegated Team copy restored after idle shutdown or app restart, then messaged | Restore mode, members activate lazily on input | Unused members `offline` | `root-team-execution-directory.ts:240-260` | High |
| BEH-005 | System | Member of a delegated copy receives a teammate message/handoff | Member handle `postMessage` → (already live) → turn starts → `running` (blue) → `idle` | Accurate per-member status | `configured-agent-execution-handle.ts` | High |
| BEH-006 | System | `delegate_task` to a single Agent | Agent activated and immediately given the work packet | Correct: the agent receives work at once | `root-agent-execution-registry.ts:140` | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `root-team-execution-directory.ts` `beginRootTaskTeam` | Root-hosted task Team, eager | Must become activate-on-work | Remove eager flag; staged-binding plumbing for task Teams may become empty — keep or simplify |
| `task-team-execution-registry.ts` `beginPreparation` | Team-hosted task Team, eager | Same | Same |
| `FlatTeamAgentExecutionHandle` / `ConfiguredAgentExecutionHandle.ensureReady` | Lazy activation and late binding commit already implemented | Reuse; no new mechanism | Verify late binding for Team-root and Org-root task copies |
| `flat-team-agent-execution-handle.ts:50-58` | Unactivated member → `offline` snapshot | Display fix follows from the runtime fix | No frontend change needed if unstarted = offline (DEC-001) |
| Failure timing | Eager: an unusable member (e.g. provider error) fails the whole `delegate_task`. Lazy: failure surfaces when work reaches that member (its sender gets a delivery error) | Behavior change to record explicitly (REQ-005) | Same as configured Teams today |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records: per-root `collaboration_tree.json` task Team records (`members[].platformAgentRunId`, nullable).
- Existing readers/writers: root persistence coordinators; tree mutators adopt bindings later.
- Evidence paths: `run-history/domain/run-execution-tree-shared-records.ts`, `standalone-root-tree-mutator.ts`.

### Structural Surfaces

- Runtime modules: task Team preparation in `RootTeamExecutionDirectory` and `TaskTeamExecutionRegistry`; flat Team factory; configured handle.
- Existing structural surfaces that can support the approved behavior: lazy `ensureReady` + `commitPlatformBindingChange` path, already used for configured, collaborator and restored task Teams.

### Potential Structural Impacts To Investigate

- API or external-contract change: None expected (`delegate_task` result unchanged).
- Persistence schema or invariant change: None expected (binding already nullable); new records will carry `null` bindings for unused members.
- Security or privacy boundary change: None.
- Concurrency or lifecycle change: Yes — member activation moves from dispatch commit to first work; verify seed delivery, idle shutdown, DONE/release, restore with mixed bound/unbound members.
- Deployment/migration: None (existing eagerly bound records remain valid; restore handles both).
- Confirmed absent/present/unknown: architecture to confirm.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Python dump of `collaboration_tree.json` | User's delegated Team copies | All 6 members of both copies have a `platformAgentRunId`; only 3 have memory dirs | Members were actually activated, not just mis-displayed | `~/.autobyteus/server-data/memory/agents/project_task_manager_7c8dce0c4a8b44f88e776a83809dee03/collaboration/` |
| Python scan of `communication_messages.json` | Message chronology of copy `…1779585d…` | api e2e engineer received "Implementation Complete" at 04:54:37Z (06:54 local) on the direct route | Blue dot was legitimate work | same |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (task description) | Activate-on-work; green only when really running; unstarted members shown as not started and not running | Explicit | REQ-001..004 | DEC-001 wording |
| User (prior decision, `collaboration-follow-up-fixes` ASM-002) | Unused members remain unstarted; no cosmetic color | Explicit, prior | Same principle for configured Teams; consistency | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| `delegate_task` tool contract | server tool manifest | Spawns a copy and gives its coordinator the work as first message; returns coordinator run ID | `task-delegation-tool-contract.ts` | No change |

## Persisted Data And State Facts

- Affected stored subject: task Team member `platformAgentRunId` in root collaboration trees.
- Representative shape: `{address, agentRunId, platformAgentRunId: string|null}`.
- Current readers and writers: root persistence + restore (`restoreTaskTeamNode`).
- Required semantics to preserve: existing records with bindings for never-used members must still restore correctly.
- Acceptable loss: None required.
- Remaining evidence gap: restore of a member with a binding but no conversation is handled by `replace_external_without_conversation` (planner) — architecture to confirm for task Teams.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

N/A — not requested.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Whether all three root kinds (Agent, Team, Org) persist a late binding for a task-Team member | Lazy activation must still record continuation bindings | Architecture investigation: all three root mutators adopt bindings across the whole tree incl. task executions (see AINV-002) | Resolved (prove by test AC-003) |
| R-001 | Risk | Failure of an unused member now surfaces at first work, not at delegation | Changes when errors are seen | REQ-005, approved | Accepted |
| R-002 | Risk | Copies already delegated before the fix keep their eagerly started members until idle shutdown/restart | Existing live copies will still show green until shut down | Out of scope (natural expiry), approved | Accepted |

## Architecture Investigation Findings

| ID | Source | Observation | Design implication |
| --- | --- | --- | --- |
| AINV-001 | `grep -rn "prepareConfiguredAgents" src` (2026-10-08, base `ace86bf1f`) | `true` only at `root-team-execution-directory.ts:155` and `task-team-execution-registry.ts:88`; `false` at 6 other sites; factory default is `!== false` (true when omitted) | After the fix no caller needs the option → remove it and the eager branch |
| AINV-002 | `standalone-root-tree-mutator.ts:75-116`; `team-run-execution-tree-mutator.ts:108+`; `agent-org-run-execution-tree-mutator.ts:94+`; root callbacks `standalone-root-builder.ts:86`, `team-root-materializer.ts:87`, `agent-org-execution-scope-builder.ts:111` | Each root adopts a binding by mapping every agent in the tree incl. task-execution members; accepts null → value | Late binding works in all roots; U-001 resolved |
| AINV-003 | `grep -rn "\.stagedPlatformBindings\|stagedNoConversationBindingReplacements" src` | `PreparedFlatTeamExecution` staged fields read only by the two task-Team preparations; task adapters iterate `prepared.stagedPlatformBindings` generically (also used by single-Agent tasks) | Remove the flat-Team fields; task-Team preparations return `[]`; adapters unchanged |
| AINV-004 | `root-task-dispatch.ts`; `root-team-execution-directory.ts:174-187` | `replaceTree` + publication happen in `commitAfterDurability` before `acceptSeed`; seed posts to coordinator | Coordinator activates inside seed; its binding commit finds it in the tree |
| AINV-005 | `RootOperationGate.run` | Counter-based, re-entrant while open | Binding commit inside delegation does not deadlock |
| AINV-006 | `ConfiguredAgentActivationPlanner.resolvePlan` | restore + external + no conversation + prior binding → `replace_external_without_conversation` | Legacy eagerly bound copies need no migration |
| AINV-007 | `FlatTeamAgentExecutionHandle.tryPrepareTerminationIfQuiescent` / `prepareTermination` | No handle → completed termination | Idle shutdown/DONE tolerate never-started members |
| AINV-008 | `grep -rln "prepareConfiguredAgents\|beginRootTaskTeam\|beginTaskTeam" tests` | 10 test/fixture files touch the eager path or assert the option | Listed in design Guidance for update |
| AINV-009 | `root-communication-engine.ts:54-57`; code review CRR-001 path trace | Teammate `send_message_to` reaches members via `reserveRecipientInput → … → ConfiguredAgentExecutionHandle.reserveInput`, not `postMessage`; engine maps `reserved:false` but not thrown errors | DS-002 corrected; failure must be a typed result on the reserve path |
| AINV-010 | `grep -rn "readiness_failure" autobyteus-server-ts/src autobyteus-web` (2026-10-08, HEAD `d30c11204`) | Only producer (`configured-agent-execution-handle.ts:331`) and type (`collaboration-agent-execution-event.ts:30`); tests reference it | **Superseded by AINV-013 (wrong):** a string grep missed the implicit fall-through consumer |
| AINV-011 | `grep -rn "COLLABORATION_AGENT_..." src`; `agent-collaboration-stream-handler.ts:157-164`; `agent-team-stream-handler.ts:215` | No production code branches on activation codes; stream handlers forward code+message for display; team handler branches only on `TARGET`/`RUN_NOT_FOUND` | Safe to unify the code as `AGENT_RUN_ACTIVATION_FAILED` with cause in message |
| AINV-012 | `configured-agent-execution-handle.ts` `ensureReady` (first line runs `assertInputAllowed`) ; `root-task-agent-resource-scope.ts:59-69`; engine `assertDeliveryAllowed` | Input-fence rejection surfaces through `ensureReady`; upstream checks normally reject closed members first | Closed-input branch in DS-005 so a fence rejection is not reported as activation failure |
| AINV-013 | Implementation DI-001 (`implementation-design-impact-ir-003.md`); verified by Solution Designer: `collaboration-agent-presentation-event-adapter.ts:86-97` (final fall-through), used by `standalone-agent-run-root.ts`, `agent-org-run.ts`, `team-flat-execution-callbacks.ts:41-70`; web `agentStreamMessageProjector.ts:198`, `agentStatusHandler.ts:122-161` | `readiness_failure` becomes an `ERROR` presentation event → a visible error card in the member's conversation, in every root, including UI-started Teams/Orgs | Keep the event as the conversation-card channel (SR-004); make the adapter branch explicit; method lesson: check event consumers by type/exhaustiveness, not by string grep |

## Requirement Implications

- Root cause is a real runtime activation, so the fix is in the backend activation policy; the green dot is the truthful consequence. No display-only fix is acceptable.
- Only delegated Team copies (task Teams, root- or Team-hosted, including Org and helper paths) are affected; UI-started Teams, collaborator Teams and restored copies already behave correctly.
- api e2e engineer's blue state was legitimate.

## Notes For Architecture Design

- Approved scenarios to map: SCN-001..SCN-005 (see requirements).
- Verify: seed/coordinator activation order and binding durability; late binding for Team and Org roots; idle-shutdown with unactivated members; DONE/release and reactivation with mixed members; restore of legacy eagerly-bound unused members; removal or retention of staged-binding plumbing for task Teams; tests that assert eager task-Team preparation.
