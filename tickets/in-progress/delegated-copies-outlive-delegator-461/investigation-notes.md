# Investigation Notes

## Investigation Meta

- Package identifier: `delegated-copies-outlive-delegator-461`
- Request / ticket: Project Task `autobyteus-461` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461`
- Repository mode: `Git`
- Task worktree / branch: the workspace root above / `codex/delegated-copies-outlive-delegator-461`
- Resolved base remote / branch / revision: `origin` / `personal` / `aae0a53a81d136c733580841e16669961665a762` (fetched 2026-11-10)
- Finalization target remote / branch: `origin` / `personal` (release separately, on the user's word)
- Bootstrap result: worktree and branch created from `origin/personal`; ticket folder `tickets/in-progress/delegated-copies-outlive-delegator-461/`
- Bootstrap blocker: none
- Current solution revision ID: `SR-002`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md` (2026-11-10); project `DESIGN.md`, `autobyteus-server-ts/docs/design/collaboration_model.md` (2026-11-10)
- Investigation status: requirements investigation complete; architecture investigation starts after the requirements are approved

## Initial Request And Clarifications

- Original request: Task `autobyteus-461` as delegated by `/project_task_manager`. When the user stops an agent that delegated Tasks, its task agents and task agent teams must keep running. The user's decision (2026-11-10): "this doesn't make any sense, we have to fix this ... even though you delegated the task, they are running independently."
- Clarifications received: 2026-11-10, the user, on DEC-001: the platform's standard is to wake and resume a stopped agent, so a copy's message wakes its stopped delegator (option A). The Task still has no comments.
- User-supplied facts and constraints: keep the solution simple; design first, the user approves the direction before the build; do not merge with `autobyteus-460`; a message from a copy to a stopped delegator must not be lost; single-copy Stop and Task closure stay as today; server shutdown is a different case.
- Initial ambiguity: what happens to a copy's message while its delegator is stopped (wake or hold); who coordinates a copy when its delegator is stopped; delete/archive of a delegator with running copies; remote copies; where copies are listed.

## Product And Domain Understanding

- Product area: agent collaboration, delegated runs ("copies": task agents and task agent teams), run lifecycle (Stop), run history, the run tree in the web client (the phone apps show the same web client).
- Affected actors or systems: the user (stops and resumes runs), a delegating run (standalone Agent run, Team run, Org run), its delegated copies (local and on a peer node), the Task side (closing a Task stops its copies), restart resume.
- Existing user or operational purpose: Stop ends a run now and keeps its history; the next message resumes it with its conversation. The user stops the Project Task Manager to make it pick up changed configuration (a new skill, `autobyteus-460`), then resumes it with a message.
- Relevant terminology (`collaboration_model.md` § 1): **run**, **delegated run (copy)**, **coordinating run** (the topmost run of a delegation chain; it records and coordinates every copy in the chain, CM-7), **standing instance**, **link**. In code the coordinating run's in-process object is a **root** (`StandaloneAgentRunRoot`, `RootTeamRun`, `AgentOrgRun`); a standalone root's own agent is its **host**.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-10 | Other | `get_project_task(autobyteus-461)` | The direction | As recorded above; no comments | Read again before approval and before each handoff |
| 2026-11-10 | Doc | `DESIGN.md` | Project design rules | Smallest solution for supported behavior; preserve guarantees, not machinery; no speculative machinery | Applies to design |
| 2026-11-10 | Doc | `autobyteus-server-ts/docs/design/collaboration_model.md` | Canonical collaboration contract | CM-7: the coordinating run coordinates its copies' lifecycle (idle shutdown, wake on message, stop on Task closure). § 5: local copies are **hosted in the coordinating run's process**; remote copies are **linked, not hosted** (CM-10) | This ticket changes CM-7's Stop consequence; the document is updated in the same change |
| 2026-11-10 | Doc | `docs/modules/standalone_agent_run_root.md` | Standalone root mechanics | `stopRoot`: "ends every child, then the host, then unregisters". "A host crash does not end the root … Children keep running" and a child's `send_message_to` to the host makes the host ready again. The collaboration stream's connect "makes the host ready (a stopped run's host starts when its collaboration view is opened)" | The root already runs with its own agent offline |
| 2026-11-10 | Doc | `docs/modules/agent_team_execution.md` (§ Stop, § Delegated Child Lifecycle, § Team Runs Started By A Peer Node) | Team root mechanics | Stop "terminates every materialized configured Agent and task-scoped descendant"; public `isActive` is manager ownership of the root; "Root reopen: no handles exist after a restart, so every recorded child starts shut down" and is wakeable | Team Stop takes members and copies in one scope |
| 2026-11-10 | Doc | `docs/modules/agent_orgs.md` lines 332–342 | Org root mechanics | "Stop Org … terminates the entire materialized scope" | Same as Team |
| 2026-11-10 | Doc | `docs/modules/agent_communication.md` § "User Model Choice And Stop Of Copies" | Single-copy Stop | The user's Stop of one copy "stops the copy and the copies it started", leaves it "in the same state as idle shutdown: the copy stays indexed and offline, its Task stays open, and **its next message restores it with its conversation**" | The product's existing rule for a user-stopped copy is wake on its next message |
| 2026-11-10 | Doc | `docs/modules/remote_collaboration.md`, `collaboration_model.md` CM-10/CM-11 | Remote copies | The delegating node "never restores or idle-stops" a remote run; "it stops it only when its owner asks, through the link". An inbound peer message restores an inactive root and wakes its receiver | Remote copies already outlive their delegator's Stop |
| 2026-11-10 | Doc | `docs/modules/restart_resume.md` | Server restart | Only an update restart resumes busy runs; a plain restart resumes nothing. Step 6 skips "a run whose root was stopped on purpose (`terminatedAt`)" | A busy copy under a stopped delegator would not resume after an update |
| 2026-11-10 | Code | `src/standalone-agent-run-root/domain/standalone-agent-run-root.ts` (`stop`, `terminate`, `terminateOnce`) | Stop path | `stop()` = `terminate()` (fence, freeze `rootAgents` + `teams`, finish every child, unregister) then `host.terminate()` | — |
| 2026-11-10 | Code | `src/standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` (`stopRoot`, `endRoot`, `stopAll`, `getAgentStatuses`, `getInspection`) | Registry | `stopRoot` and `endRoot` both call `root.stop()` and unregister; `stopAll` (shutdown) calls `root.terminate()`; status reads answer live statuses only for a registered root | — |
| 2026-11-10 | Code | `src/standalone-agent-run-root/domain/standalone-host-agent-handle.ts`, `services/standalone-root-message-delivery.ts` (`wakeAndRun`, `readyHost`, `reserveAgentInput`) | Message to an offline host | "a message to a host that is not running makes it ready first (no special wake path)" | Wake on message exists for the host |
| 2026-11-10 | Code | `src/agent-execution/services/agent-run-service.ts` `terminateAgentRun` | Stop entry point | GraphQL `terminateAgentRun` → `standaloneRuns.stopRoot(runId)` | — |
| 2026-11-10 | Code | `src/agent-team-execution/domain/root-team-run.ts` (`terminate`, `runTermination`), `local/flat-team-execution-manager.ts` (`freezeForRootTermination`) | Team Stop | One frozen scope: configured member handles, task agent handles, task team runs; then the manager unregisters the root | Members and copies are in the same registries' scope |
| 2026-11-10 | Code | `src/agent-org-execution/domain/agent-org-run.ts` (`terminate`, `terminateOnce`) | Org Stop | Same frozen scope over `rootAgents` + `teams` | — |
| 2026-11-10 | Code | `src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts` (`releaseRuntimeForUserStop`, `startForInput`) | A member stopped while its root stays | "User Stop (DS-002): interrupt, then release the exact runtime with input left open (restorable)"; a member starts on its next input | The primitive for stopping an own agent while the root stays exists |
| 2026-11-10 | Code | `src/agent-collaboration/domain/delegated-stop-set.ts`, `src/run-history/services/delegated-launch-selection-service.ts` | Single-copy Stop | Stop set = the copy plus every copy whose recorded delegator is inside the set; refused with `ROOT_NOT_ACTIVE` when the root is not loaded | Stays as it is |
| 2026-11-10 | Code | `src/compositions/collaboration-root-resolver.ts`, `src/compositions/remote-collaboration-composition.ts:50` | Remote copy → stopped delegator | An inbound peer message calls `resolveOrRestore(root)`: a stopped Team or Org root is restored, then the receiver is woken | Precedent for wake on a copy's message |
| 2026-11-10 | Code | `src/services/agent-streaming/agent-collaboration-stream-handler.ts` (`readyRoot`) | Viewing a run's copies | Connect calls `root.ensureHostReady()`: opening the collaboration view starts a stopped host | Conflicts with "the delegator stays stopped while its copies are watched" |
| 2026-11-10 | Code | `src/run-history/services/standalone-run-liveness.ts` (`releaseForHistory`) | Delete / archive | Refused while the host is active; otherwise `endRoot` stops every child, then the history change runs | A loaded root's children are stopped by delete/archive |
| 2026-11-10 | Code | `src/agent-execution/runtime/general-process-run-supervisor.ts:405-432` | Server shutdown | Org roots, Team roots, standalone roots (children first), then agent runs | Unchanged by this ticket |
| 2026-11-10 | Code | `src/restart-resume/restart-resumer.ts:109-118` | Update restart | A recorded run is skipped unless its root's history state is `present` (not `terminated`, `archived`, `gone`) | See the restart-resume finding above |
| 2026-11-10 | Code | `autobyteus-web/stores/agentRunStore.ts` (`terminateRun`), `stores/agentRunCollaborationStore.ts` (`beginHostTermination`) | Web Stop flow | Before the Stop command the client detaches the collaboration stream; on success it sets the root inactive and every child terminal | The client assumes Stop ends every child |
| 2026-11-10 | Code | `autobyteus-ios/AutoByteusMobile/AutoByteusWebViewController.swift`; no run logic in `autobyteus-android` Kotlin | Phone | The phone apps show the web client in a web view | One client to change |
| 2026-11-10 | Data | `~/.autobyteus/server-data/memory/agents/project_task_manager_7c8dce0c…/` (`run_metadata.json`, `collaboration/collaboration_tree.json`), `memory/agent_teams/software_engineering_team_0218d0fd…/team_run_execution_tree.json` (read-only) | The user's real case | The Project Task Manager is a **standalone Agent run** (`agentDefinitionId: project-task-manager`); its tree has 144 `taskExecutions` links and no remote ones; this team's tree has `taskAgent.coordinatingRun {kind: "agent", runId: project_task_manager_7c8dce0c…}` | The real case is the standalone root |
| 2026-11-10 | Command | In the base checkout at `aae0a53a81`: `node_modules/.bin/vitest run tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts -t "Stop ends every child before the host\|stops every delegated copy only on an explicit Stop"` | Confirm today's contract | 2 passed: `stopRoot` finishes the child before the host and unregisters the root | The implementation starts from these tests |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Stop on a standalone Agent run that delegated | Every local copy of the run (at any depth) is interrupted and stopped, then the run's own agent; the root is unloaded | Copies' work is cut off; they keep their conversation and can be woken later | Code (`stopRoot`, `stop`); test run above (`Reproduced` at unit level with fake child handles); the user's report in the real app | High |
| BEH-002 | User | Stop on a Team run or an Org run whose members delegated | Members and every local copy stop in one scope; the root is unloaded | Same as BEH-001 | Code and module docs (`Read`) | High (read only, not run) |
| BEH-003 | System | A copy sends `send_message_to` to its delegator | Delivered to the delegator; a host that is not running is made ready first. After a Stop no local copy is alive to send | No message is lost today because the sender is stopped with the receiver | Code (`wakeAndRun`) (`Read`) | High |
| BEH-004 | User | Stop on one delegated copy | The copy and the copies it started stop; next message restores it | Works only while the root is loaded (`ROOT_NOT_ACTIVE` otherwise) | Doc and code (`Read`) | High |
| BEH-005 | Contract | A Task is closed (DONE / CANCELLED) | Its copies with no other open Task stop | Requested on every authority the root still holds | Doc (`Read`) | High |
| BEH-006 | Operational | Server shutdown or restart | Everything stops. Copies come back offline with their conversations; an update restart resumes busy runs, a plain restart resumes nothing; a copy is woken by its next message | — | Docs and code (`Read`) | High |
| BEH-007 | User | Archive or delete of a stopped run | Refused while its own agent is active; a root still loaded is ended first (children stopped) | — | Code (`Read`) | High |
| BEH-008 | System | Stop of a run that delegated to a peer node | The remote copy keeps running on its node; its later message restores the delegating root and wakes the receiver | Remote copies already outlive the Stop | Docs and code (`Read`) | Medium (not run across two nodes) |
| BEH-009 | User | Opening the collaboration view of a standalone run | The run's own agent is started when it is not running | Viewing resumes a stopped run | Code and doc (`Read`) | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `StandaloneAgentRunRoot` + `StandaloneHostAgentHandle` | The root hosts copies; the host is a separate handle; a root with an offline host is a supported state (host crash) | The standalone case can keep its root and stop only the host | Which end paths still end the root (delete/archive, shutdown) |
| `RootTeamRun` + `FlatTeamExecutionManager` (`configured`, `taskAgents`, `taskTeams` registries) | One termination scope for members and copies; public `isActive` = manager ownership | A stopped Team whose copies run needs the root kept and the Team shown as stopped | How "stopped by the user" is expressed while the root stays loaded (restore, stopped-run edit, archive/delete gates read manager ownership today) |
| `AgentOrgRun` (`rootAgents`, `teams`) | Same shape as the standalone root without a single host | Same as Team | Same |
| `ConfiguredAgentExecutionHandle.releaseRuntimeForUserStop` | Stops one agent and leaves its input open | Reusable for a run's own agents | — |
| `RootTaskExecutionLifecycle` | Copies' admission, idle shutdown, wake, Task closure, user Stop of copies | Unchanged while the root stays loaded | `closeExternalAdmission` must not run on a user Stop |
| `agent-collaboration-stream-handler.ts` `readyRoot` | Connect starts the host | Must not start a stopped run's own agent | Whether any path still needs the host for child commands (the handler already says child commands never need it) |
| `restart-resumer.ts` history pre-filter | Skips runs whose root is `terminated` | A busy copy under a stopped delegator should resume after an update | The filter applies to the recorded run's own place, not only to its root |
| Web `beginHostTermination` | Detaches the stream and marks every child terminal on Stop | The client keeps showing live copies after Stop | Team and Org stores have their own Stop flows to check |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: none identified that must change shape. The execution trees, message logs and Task resource records are unchanged; whether a Team/Org root needs a stored "stopped" fact beyond today's history `terminatedAt` is an architecture question.
- Existing readers, writers, or contracts that consume them: run history index (`terminatedAt`), collaboration stream snapshot (`is_active`), `agentRunCollaborationStatuses`.
- Evidence paths: see the source log.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: the three root kinds' Stop paths and their managers; the collaboration stream handlers; history liveness gates (archive, delete, stopped-run edit, restore); restart resume; the web stores' Stop flows.
- Existing structural surfaces that can support the approved behavior: a standalone root with an offline host; `releaseRuntimeForUserStop`; wake on message for hosts, members and copies; remote links.
- Evidence paths: see the source log.

### Potential Structural Impacts To Investigate

- API or external-contract change: possibly the meaning of root lifecycle events sent to the client on Stop (design).
- Persistence schema or invariant change: none identified yet.
- Security or privacy boundary change: none.
- Concurrency or lifecycle change: **yes**, the root's lifetime is separated from its own agents' lifetime on a user Stop.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: CM-7's Stop consequence in `collaboration_model.md`.
- Confirmed absent, present, or unknown: lifecycle change present; the rest unknown until architecture investigation.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `vitest run tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts -t "Stop ends every child before the host\|stops every delegated copy only on an explicit Stop"` (base checkout, `aae0a53a81`) | Stop of a standalone run with one delegated copy | 2 passed: the child's finish runs before the host's terminate; `hasRoot` is false afterwards | `Reproduced` (unit level, fake child handles) | BEH-001 is the coded contract, not an accident | `autobyteus-server-ts/tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts` lines 201 and 570 |

- Temporary diagnostics: `None`.
- Reproduction for implementation to start from: the two tests above assert today's behavior; the implementation changes them to the new behavior. The Team and Org Stop paths, the remote path and the web flow were read, not run.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| The user (through the Task) | Stopping the manager to change its configuration killed several teams' hours-long work | Direct decision, quoted in the Task | REQ-001 | — |
| The user (through the Task) | A copy's message to a stopped delegator must not be lost | Direct | REQ-003 | Wake or hold (DEC-001) |
| The user (standing preference) | Keep the solution simple | Direct | Prefer existing mechanisms | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Collaboration Model | `collaboration_model.md` | CM-7 (the coordinating run coordinates its copies), CM-6 (Task closure stops copies), CM-10 (a remote run is owned by its node) | `Read` | CM-7 wording changes with this ticket |
| Agent runtimes (Claude Agent SDK, Codex, AutoByteus, AGY, ACP) | In-repo backends | A stopped agent is restored with its conversation on its next input | Module docs (`Read`) | Not re-verified per runtime; the wake path is the existing one |

## Persisted Data And State Facts

- Affected stored or external subject: none must change shape for the requirements.
- Location and representative shape: `memory/agents/<run>/collaboration/collaboration_tree.json` (`taskExecutions` links), copies' own run files with a `taskAgent` section.
- Approximate volume: the real manager run holds 144 copy links.
- Current readers and writers: the roots' persistence coordinators and package stores.
- Current unknown/extra-field behavior: trees are read tolerantly and written exactly.
- Required semantics or data that must be preserved: every run's conversation, message logs, Task records.
- Acceptable loss, reset, rebuild, or regeneration: none.
- Privacy, retention, compliance, downtime, or operational constraints: none.
- Remaining evidence gap: whether a Team/Org root needs a new stored fact (architecture phase).

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- User's requested outcome, in the user's own terms: N/A
- Requirement / behavior IDs involved: N/A
- Product decision, uncertainty, or experience to understand or evolve: N/A — the run tree already shows a run with its copies and each copy's status and Stop; no new screen is proposed.
- Critical journey and states: N/A
- Known constraints and non-goals: N/A
- Relevant existing-product or frontend context supplied or established: see the web rows of the source log.
- Product Design request artifact / message reference: N/A
- Established separate design repository/root and ticket reference, when applicable: N/A

## Product Design Findings

N/A — no Product Design was requested.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | How a Team or Org root expresses "stopped by the user" while it stays loaded for its copies (restore, stopped-run edit, archive/delete read manager ownership today) | Decides the size of the Team/Org part | Sized in Architecture Investigation Findings; the design waits for DEC-009 | Sized |
| U-002 | Unknown | Whether every web flow (Team and Org stores, Task page) assumes that Stop ends every copy | Client scope | Architecture investigation | Open |
| R-001 | Risk | With wake on message, a stopped run resumes when one of its copies reports | Visible behavior; the user decides (DEC-001) | The user | Open |
| R-002 | Risk | A remote copy's behavior was read, not run on two nodes | REQ-006 relies on it | API/E2E where a second node is available; otherwise stated as read | Open |
| A-001 | Assumption | An application-owned run's termination by its application is not the user's Stop | Keeps that path unchanged | Solution Designer (DEC-006) | Decided |

## Architecture Investigation Findings

Feasibility investigation for DEC-009, 2026-11-10 (all `Read`; architecture reading gate passed: `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md`).

- **One primitive stops any agent and leaves it restorable.** `ConfiguredAgentExecutionHandle.releaseRuntimeForUserStop()` (`configured-agent-execution-handle.ts:216`): interrupt, release the runtime, input stays open; the next input restores it (`startForInput`, line 172). `FlatTeamAgentExecutionHandle.releaseRuntimeForUserStop()` (`flat-team-agent-execution-handle.ts:123`) forwards to it. Today only copies use it (`task-agent-execution-registry.ts:275`, `root-agent-execution-registry.ts:288`).
- **Standalone:** the root (`StandaloneAgentRunRoot`) and its host (`StandaloneHostAgentHandle`) are separate; `getActive(hostRunId)` (root loaded) and `isHostLive()` (own agent running) are separate facts already. A Stop that ends only the host leaves an existing state (the host-crash state). Paths that read "root loaded" as "run active" and need a decision: `DelegatedLaunchSelectionService.update` (a loaded root refuses the run's own settings with `RUN_ACTIVE`, `delegated-launch-selection-service.ts:86-88`), `updateStoppedDelegatedLaunchSelections` (`RUN_ACTIVE` when `hasRoot`), `releaseForHistory` (ends the root), the collaboration stream's connect (`ensureHostReady`), restart resume's filter, the web `beginHostTermination`.
- **Team:** `AgentTeamRunManager.getLifecycleSnapshot` reports `isActive: hasManagedTeamRun` (`agent-team-run-manager.ts:326-329`); `restoreTeamRun` throws "already managed" (line 177); `updateStoppedRunLaunchChanges` refuses with `RUN_ACTIVE` when managed (line 284); `withInactiveHistoryMutation` answers `managed` (line 254); `FlatTeamExecutionManager` has one lifecycle for members and copies (`freezeForRootTermination`, `releaseOwnedRuntime`, lines 210-294). Keeping the root for its copies needs a new "the Team is stopped while its root is loaded" fact that every one of these reads.
- **Org:** the same shape (`AgentOrgRun.terminate`, `agent-org-run.ts:359-398`; `AgentOrgRunManager`, 501 lines).
- **File sizes (500-line limit):** `standalone-agent-run-root.ts` 521, `root-team-run.ts` 538, `agent-org-run-manager.ts` 501, `agent-team-run-manager.ts` 491, `agent-org-run.ts` 460. New code goes into properly owned files, not into these.
- **Conclusion:** the standalone part is contained; the Team/Org part is a lifecycle change in the two most guarded Stop paths plus two more client flows. Recorded as DEC-009 for the user.

## Requirement Implications

- The real case (the Project Task Manager) is a standalone Agent run, whose root already works with its own agent offline: stopping only the run's own agent is close to an existing state.
- Team and Org roots stop members and copies in one scope and equate "active" with "the root is loaded"; the same rule there needs the root kept while the run shows as stopped.
- Wake on message is the product's existing rule in three places (a user-stopped copy, a crashed host, a remote copy's message to a stopped delegator), so a copy's message to a stopped delegator can be delivered with no new store.
- Viewing a run's copies starts its own agent today; that must stop, or watching the copies of a stopped manager would resume it.
- A busy copy under a stopped delegator would be skipped by update-restart resume; the rule must look at the copy.
- The phone apps are the web client, so one client change covers both.

## Notes For Architecture Design

- Scenario IDs to realize: SCN-001 … SCN-008 of the requirements doc.
- Verified facts: see the source log. Open technical questions: U-001, U-002.
- `collaboration_model.md` (CM-7 and § 5) and the three root module docs change in the same change.
