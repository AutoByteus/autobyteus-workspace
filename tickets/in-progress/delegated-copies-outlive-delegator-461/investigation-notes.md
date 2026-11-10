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
- Current solution revision ID: `SR-011`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md` (2026-11-10); project `DESIGN.md`, `autobyteus-server-ts/docs/design/collaboration_model.md` (2026-11-10)
- Investigation status: requirements and architecture investigation done for the contract's first step; revised after architecture review ARCH-REV-001 (see "Investigation for the architecture review's findings"). Sections above the contract work (SR-001 … SR-003) are history: U-001, U-002 and R-001 belong to the superseded small design

## Initial Request And Clarifications

- Original request: Task `autobyteus-461` as delegated by `/project_task_manager`. When the user stops an agent that delegated Tasks, its task agents and task agent teams must keep running. The user's decision (2026-11-10): "this doesn't make any sense, we have to fix this ... even though you delegated the task, they are running independently."
- Clarifications received: 2026-11-10, the user, on DEC-001: the platform's standard is to wake and resume a stopped agent, so a copy's message wakes its stopped delegator (option A). The Task still has no comments. 2026-11-10, the user again, confirming the same rule: a stopped agent resumes on a message "just like others", and it does not matter whether the message comes from the user, another agent or a system notification. Verified for the user's message and another agent's message (source log); which system notices reach a stopped agent was not checked and is not changed by this ticket. 2026-11-10, the user, after the SR-003 design was presented: the copies are "more or less independent", the manager is not a parent, and the server's organization of runs has a design issue; then the decision: "we should start to refactor in this ticket instead of just try to fix the bug … the data model is very very important, we should put the data model correct and then the upper layer source code should reflect the data model, the reality" (DEC-010).
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
| `target-collaboration-contract.md` | Solution Designer | The delegation contract (words, rules, records with example JSON, cases, attribute check, existing data, simulations, decisions TC-1 … TC-6) | All run kinds | All | Revision 2 | Behavior-defining; approved by the user, 2026-11-10 (its message-scope row follows requirements DEC-011 once decided) |
| `follow-ups.md` | Solution Designer | Follow-ups: FU-002, FU-003, FU-004, FU-005 (FU-001 withdrawn) | — | REQ-010 | Current | Not behavior-defining |
| `handoff-architecture-design-complete.md` | Solution Designer | The handoff of SR-009 | — | All | Superseded by the next handoff after SR-010 | — |
| `design-review-report.md`, `architecture-review-revision-record.md` | Architecture reviewer | Review round 1 (ARCH-REV-001, Fail, AR-001 … AR-010) | `design-spec.md` at SR-009 | All | Current | Reviewer-owned |
| `evidence/data-model-validation/validate_nested_chains.py`, `nested-counts-2026-11-10.txt`, `measure_cross_run_messages.py`, `cross-run-messages-2026-11-10.txt`, `measure_non_pair_messages.py`, `non-pair-messages-2026-11-10.txt` | Solution Designer | Read-only counts for AR-005 and AR-002 | The user's stored data, counts only | REQ-005, REQ-011 | Current | Evidence |
| `evidence/data-model-validation/validate_delegation_shapes.py` and `counts-2026-11-10.txt` | Solution Designer | The read-only data check of the contract and its result | The user's stored data, counts only | All | Current | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | How a Team or Org root expresses "stopped by the user" while it stays loaded for its copies (restore, stopped-run edit, archive/delete read manager ownership today) | Decides the size of the Team/Org part | Sized in Architecture Investigation Findings; the design waits for DEC-009 | Sized |
| U-002 | Unknown | Whether every web flow (Team and Org stores, Task page) assumes that Stop ends every copy | Client scope | Standalone flows read (design-spec D-7, D-8); Team and Org flows are FU-001; the Task page's status comes from the server's `taskExecutionStatus`, live while the root is loaded | Resolved for this scope |
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
- **Standalone design investigation (after DEC-009 = A), all `Read`:**
  - Stop result: `StandaloneRootStopResult.rootEnded` decides "host already down, root ended → record terminated" in `agent-run-service.ts:137-142`; `terminateHost` records `terminatedAt` itself (`standalone-agent-run-lifecycle-service.ts:113-123`).
  - A run a peer started is marked by `options.delegatedFrom` (`standalone-agent-run-root.ts:134`); its owner's `terminate` and its node's own Stop both reach `stopRoot` (`standalone-paired-agent-access.ts:76`, `agent-run-service.ts:132`).
  - `onRunEnded` has one subscriber, the peer observation stream (`standalone-paired-agent-access.ts:69`).
  - `isHostLive` has one production caller, the stream snapshot (`grep -rn "isHostLive\|host\.readiness" src tests`).
  - `RootOperationGate.run` counts admitted operations and refuses once closed; it does not serialize (`root-operation-gate.ts`).
  - `hasOpenExecutionWork()` of a standalone root covers copies only (the host is a separate handle): task agents `initializing` or `running`, and Team copies (`root-agent-execution-registry.ts:66-70`).
  - Web: the copy Stop icon and status read the collaboration context's child states (`delegatedCopyLiveness.ts`); `refreshListedStatuses` polls listed runs whose context is active; the client's stream service disconnects on an inactive snapshot (`agentRunCollaborationStreamingService.ts:227-228`); `setActive(false)` cleans every child (`agentRunCollaborationContext.ts:228-234`); the archive/delete actions drop the server's message (`runHistoryMutationActions.ts:134-137,168-171`; `useWorkspaceHistoryMutations.ts:129-134,190-194`).
  - The phone apps load the web client (`autobyteus-ios/AutoByteusMobile/AutoByteusWebViewController.swift`); the mobile run tree reads the same collaboration store (`composables/mobile/useMobileRunTree.ts:47-48`).
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

### Stored shapes read for DEC-010 (2026-11-10, `Read`)

- A local copy's own run file carries `taskAgent { coordinatingRun {kind, runId}, delegatorAgentRunId, address, launchSource, userLaunchSelection, pendingRuntimeSwitch }` (`run-history/store/agent-run-metadata-types.ts:51-83`); the type's comment: the coordinating run "records the link, hosts, idles, wakes and stops it". `coordinatingRun` is the topmost run of the delegation chain (CM-7), not the run of the agent that delegated.
- A run a peer started carries a different back-link, `delegatedFrom { nodeId, coordinatingRun, delegatorAgentRunId }` (lines 57-67), and is "a normal standalone run of this node with its own root".
- The coordinating run's tree keeps local links in `taskExecutions` (composed with each copy's own file on load; nested under Team nodes for older records) and remote links in a second list, `remoteTaskExecutions`, whose entries add `nodeId` (`run-history/domain/run-execution-tree-shared-records.ts:55,117-201`).
- The Task side records a copy by `hostRoot` plus its execution reference (`task-execution-resource-port.ts:19-34`).
- So one concept, a delegated run and its link, has two stored shapes (local and remote), and the local shape and the Task record both encode hosting.
- The hosting machinery, by file (lines): `root-task-execution-lifecycle.ts` 509, the three subject adapters 435 + 361 + 446, `root-agent-execution-registry.ts` 351, `root-team-execution-directory.ts` 346, `task-agent-execution-registry.ts` 298, `task-team-execution-registry.ts` 232, and the `execution/task` folder's other files; the link machinery for remote runs: `execution/remote/*` (about 1,100 lines) and `remote-collaboration/inbound/*`.

### How a run started by a peer works (the model for every delegated run), 2026-11-10, `Read`

- The user's confirmation of the target, 2026-11-10: delegated agent runs and agent team runs "are their own runs … their life cycle is dependent on the task itself because it's been created based on the delegated task … it's a normal run … you can start it, stop it like you do with any other ones", with the relationship "displayed on the UI"; and: "we always start with the contract … put the contract itself into the right shape and then the upper layer … will reflect this relationship".
- `remote-collaboration/inbound/remote-delegation-receiver.ts`: for an Agent, an ordinary standalone run is prepared (`agentRuns.prepareAgentRun`) with the resolved launch and `delegatedFrom`; for an Agent Team, `RemoteTeamRunStarter` creates a top-level Team run (`TeamRunService.createTeamRun`) with `delegatedFrom` on its tree. The work packet then starts the Agent or the Team's coordinator.
- `agent-collaboration/execution/remote/remote-run-channel.ts`: the delegating side's operations on a linked run are an interface (`startDelegatedRun`, `deliverMessage`, `runSummaries`, `agentProjection`, `ownerCommand`, `observeRun`), implemented by the peer client. `remote-delegation.ts`: the delegating root plans (asks for the run), records the link in one tree write, then sends the work packet.
- Such a run has its own idle shutdown (`StandaloneHostIdleShutdown`, `RemoteTeamIdleShutdown`) and is restored by an inbound message (`CollaborationRootResolver.resolveOrRestore`).
- What a linked run does not have today, and a local delegated run has: a saved Task and reference files (refused for a remote target, `remote-delegation.ts` `delegationPlacement`), the Project's folder and the delegating run's launch inheritance (a peer-started run uses its node's defaults, the temp workspace and auto-approve), stop on Task closure and reactivation (`collaboration_model.md` § 4, "later steps").
- Task side: `projects/domain/task-execution-resources.ts` records `hostRoot` with each run; message scope by Task is checked in each root's `RootCommunicationEngine` (`docs/modules/agent_communication.md` "Task-linked message scope").

### Data-level validation of the contract, 2026-11-10 (`Measured`)

- The user, 2026-11-10: first validate that the data structure is reasonable and works, with no redundant attributes; and: do it as the earlier model document did, every case with example JSON, so the data level has no ambiguity. Model found: `tickets/done/delegated-copy-own-run-memory/memory-layout-contract.md` (revision 5; records with JSON, a who-delegates table, every existing shape with counts, operations, validation, simulations).
- Command: `python3 -I evidence/data-model-validation/validate_delegation_shapes.py ~/.autobyteus/server-data` (reads only; prints counts). Result in `counts-2026-11-10.txt`:
  - 528 agent run files, 754 team trees, 24 org trees. 196 delegated runs (43 agent, 153 team); 0 runs started by a peer.
  - Today's `coordinatingRun`: 170 a standalone run, 20 a team run, 6 an org run; 1 is no longer stored (detached), and 1 delegated run is linked by no stored tree.
  - One-hop delegating run: the same run as today's `coordinatingRun` for 159; a different one for 32 (the delegator is a part of another delegated run); 4 records have no delegator; for 1 the delegator's run is not stored. For 142 the delegating run is a standalone run whose ID equals the delegator's.
  - 197 links: 195 local (43 agent, 152 team), 2 with `nodeId`; 2 stored under an org member; 0 local links carry any field besides `address`, the run ID, `delegatorAgentRunId`, `startedAt`. Address, delegator and holder agree with the linked run's own file in 195 of 195.
  - A team run's `taskAgent.address` equals its own `rootTeam.address` in 153 of 153. An agent run's address differs from `/<definition id>` in 6 of 43 (renamed or team-local definitions).
  - `launchSource` on 24 agent and 109 team sections; `userLaunchSelection` on 3 and 6; `pendingRuntimeSwitch` on 0.
  - 407 Task record entries in 361 files (377 assigned, 28 delegated, 2 broughtIn). `hostRoot` equals the run's own `coordinatingRun` in 405 of 405 entries of runs stored on this node; the other 2 are the 2 remote runs (their `hostRoot` is a standalone run). `assignedBy` equals the run's delegator in 375 of 375; `recipientAddress` equals the run's address in 370 of 370 entries that carry it.
- Code readers of the fields that change (`grep -rlE` in `autobyteus-server-ts/src`, non-migration + migration files): `hostRoot` 14 + 0, `taskAgent` 11 + 15, `coordinatingRun` 18 + 10, `delegatedFrom` 22 + 6, `TaskAgentRunMetadata` 7 + 10, `remoteTaskExecutions` 34 + 11. `hostRoot` has five uses (`project-task-execution-resource-composition.ts:60-64`, `task-execution-resource-service.ts:187-212`, `task-execution-resource-release.ts:15-29`, `project-task-service.ts:199-214`, `project-change-messages.ts:24,71`): stop on Task closure, a root's closed set, the Task page's run status, deleting the Tasks with no Project of a deleted run, the client's locator.
- Not run: any code on the target shape.

- The user, 2026-11-10, on the Task record's roles: asked the difference between `assigned` and `delegated`, and decided that the sub-work role is named `subWork` (contract TC-6). Source of the role meanings: `agent-collaboration/execution/task/task-execution-resource-port.ts:12-27` (`TaskExecutionRole`, `NewTaskExecutionLinkInput`), `docs/modules/agent_communication.md` "Task-linked message scope", `docs/modules/agent_team_execution.md` "Delegated Child Lifecycle" ("Helpers stay closed").

- The user, 2026-11-10: "I agree with your decision one and three" (contract TC-1: no cascade on Stop; TC-4: delivery in steps, this ticket = delegations from a standalone agent run), and asked what the second (TC-3, a delegated run whose delegating run was deleted) means. TC-3 stays open.

- The user, 2026-11-10, on TC-3 after its explanation (a delegated run whose delegating run was deleted; cost: deleting the hub would list its 144 delegated runs): "I like your recommendation" → listed as a run of its own. With TC-1, TC-3, TC-4 and TC-6 decided by the user and TC-2, TC-5 by the Solution Designer, the contract is approved; the requirements were rewritten on it (SR-007).

### Architecture investigation for the contract's first step (delegations made from a standalone agent run), 2026-11-10

Reading gate for this phase: `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md`, `collaboration_model.md`, `docs/design/data_migration_guideline.md` (all sections), the earlier `memory-layout-contract.md`. All findings below are `Read` unless marked.

**F-1 The server has two delegation paths in one adapter.** `StandaloneRootTaskExecutionAdapter.planActivation` / `beginActivation` (`standalone-root-task-execution-adapter.ts:110-178`) branch on the placement: `remote_agent` goes to `RemoteDelegation` (ask the other node for a run, record a link, send the work packet); `agent` and team placements are hosted in the root (`rootAgents.beginTaskPreparation`, `teams.beginRootTaskTeam`). The same `RootTaskExecutionLifecycle` and Task linking (`root-task-dispatch.ts`) run both.

**F-2 The link machinery is complete for a linked run.** `agent-collaboration/execution/remote/`:
- `remote-run-links.ts` (`RemoteRunLinks`): the root's endpoints from its links and its back-link; inbound checks (`inboundEndpoint`, `admitsWorkPacket`, `admitsOwner`, also against stored links before a restore); `deliver`; `ownerCommand`.
- `remote-endpoint.ts`: three endpoint kinds: `delegated_run`, `delegated_team` (one per member), `delegator` (from `delegatedFrom`); the pair rule (only the delegator and the delegated run or team message each other); each endpoint's Task ownership chain; the closure fence text.
- `remote-run-channel.ts` (`RemoteRunChannel`, an interface): `startDelegatedRun`, `deliverMessage`, `runSummaries`, `agentProjection`, `ownerCommand` (`post_message`, `interrupt`, `terminate`), `observeRun`. One implementation today, the peer client.
- Inbound: `remote-collaboration/inbound/remote-message-receiver.ts` checks the stored links, resolves or restores the target root (`CollaborationRootResolver`), then `acceptRemoteWorkPacket` or `acceptRemoteMessage`; `remote-delegation-receiver.ts` creates the run (`prepareAgentRun` with `delegatedFrom`, or `RemoteTeamRunStarter` → `TeamRunService.createTeamRun` with `delegatedFrom`).
- A root with `delegatedFrom` has its own idle shutdown (`StandaloneHostIdleShutdown`, `RemoteTeamIdleShutdown`).

**F-3 What a local delegated run has that a linked run lacks today** (each is work of the first step):
1. a saved Task and reference files (`remote-delegation.ts` `delegationPlacement` refuses both); a follow-up Task by run ID (`root-task-execution-lifecycle.ts:186-190` refuses a remote target);
2. a launch resolved by the delegating side (the Project's folder, inheritance from the delegating run, tool approval); a peer-started run uses its node's defaults;
3. stop on Task closure (a remote run is only fenced: `closureFence`, `task-execution-resource-release.ts:25`) and reactivation;
4. messages by run ID between runs of the same Task that are not delegator and delegated run (the pair rule refuses them; `docs/modules/agent_communication.md` "Task-linked message scope" allows them);
5. a message by address to the delegating run's standing instances (CM-5), and the delegator in `list_available_agents` and `@`;
6. in the client, a local run needs no relay: it is a run of this node and can be opened as one.

**F-4 Consequence for the Task side in this step.** `hostRoot` is how the Task side reaches the root that runs a delegated run (`project-task-execution-resource-composition.ts:60-64`). While team and org runs still host, the field is kept for every record with one meaning, "the root that runs it": the hosting run for a hosted run, the run's own root for an independent run, the link holder for a run on a peer (today's value). It is removed when nothing is hosted (FU-005). The role rename (`subWork`) is independent of hosting and is done now.

**F-5 Nested runs in this step.** A delegated team run of a standalone run becomes a top-level team run with `delegatedFrom`. Delegations by its members are then delegations made from a team run: hosted by that team run (existing code path for any top-level team run), until FU-003. Their links move from the standalone run's tree into that team run's tree and their `taskAgent.coordinatingRun` becomes that team run (32 runs in the user's data).

**F-6 History.** A delegated team run has no history row today (a tree with a `taskAgent` section is not admitted as a team run; the earlier contract's guard G2) and a delegated agent run is not returned by the standard metadata reader (G1). As ordinary runs they are admitted and need history rows; the migration adds them. A run with `delegatedFrom` on this node is listed under its delegating run when that run is stored, otherwise as a run of its own (a run a peer started is already listed that way).

**Design direction that follows (to be written as the new `design-spec.md`):** local delegation from a standalone run uses the link machinery. The channel gets a second implementation for this node (in-process), the link owner and its types lose the word "remote", and the hosted path leaves the standalone root. F-3's six items are the added capabilities; F-4 … F-6 the data and history consequences.

**Not read yet:** the Task side's release and status code in detail; the stream and view DTOs of a standalone root; the history index code; the web client's tree and stores for delegated runs; the standalone root's creation of the collaboration package for a delegated agent run (contract V-10); the earlier ticket's DEC-005 (V-9); released migrations that read these shapes (V-11).

- Contract V-9 (why the Settings edit was kept beside the started launch), `Read`: `tickets/done/delegated-copy-model-change/requirements-doc.md` REQ-005 and DEC-005 (after Save the row shows the model like any edited member; the origin text stays only on untouched agents), and `tickets/done/delegated-copy-own-run-memory/requirements-doc.md` DEC-015 U-1 (the composed record had to round-trip). Consequence in the design (D-10): the edit writes the run's own launch fields and removes its `launchSource`.
- `canSwitchRuntime` excludes a run with `delegatedFrom` (`agent-execution/services/standalone-agent-run-eligibility.ts:15-16`); a local delegated copy can switch today through `taskAgent.pendingRuntimeSwitch` (0 records carry one). Design D-10 admits a run with a back-link on this node.
- The web client builds a standalone run's delegated rows from its collaboration view: `components/workspace/history/AgentRunTaskRows.vue:62-95`, `stores/agentRunCollaborationStore.ts` (`taskRows`, `selectTaskRow`, `childTargetFor`), `composables/mobile/useMobileRunTree.ts:47-57`, `components/runList/RunListRow.vue:187`.

- The user, 2026-11-10, after the design direction and its visible effects were presented: a delegated run's model is changed in its own Settings ("it's independent agent run now … it's setting … I think that makes sense what you have proposed"). Recorded as the user's approval of the design direction.
- Searches that closed the design's file-level parts (at `aae0a53a81`): `grep -rlE "taskAgent\b|coordinatingRun|hostRoot" --include=*.ts autobyteus-server-ts/src` outside `app-data-migrations` (file lists in `design-spec.md` C-1); imports of current modules from `app-data-migrations/` (only paths inside `frozen/server/`; `tests/architecture/app-data-migration-boundaries.test.ts` enforces the sealed area); `ls app-data-migrations/frozen` (holds `task-agent-own-run-v1`, `released-run-package-shapes`, `server/`); web files that use the standalone collaboration store and services (`grep -rlE "useAgentRunCollaborationStore|agentCollaboration/|agentRunCollaboration"` in `autobyteus-web`, outside tests and generated code; list in C-4).
- Read but not run: everything in the design. Read in part only: `task-execution-resource-service.ts`, the history catalog services, the web files below `agentRunCollaborationStore.ts`.

### Investigation for the architecture review's findings (ARCH-REV-001), 2026-11-10

Review read first: `design-review-report.md` (Fail; AR-001 … AR-010, all `Design Impact`; AR-002 and AR-007 conditionally `Requirement Gap`).

- **AR-005, nested runs** (`Measured`): `python3 -I evidence/data-model-validation/validate_nested_chains.py ~/.autobyteus/server-data` → `nested-counts-2026-11-10.txt`: 32 nested runs, all at depth 1; the delegator is in a delegated team run for 31 and in a delegated agent run for 1 (contract D6 exists); 29 under a standalone top run, 3 under a team top run; every intermediate holder is stored. No delegated agent run has a `collaboration_tree.json` (43 of 43), no delegated run has a history row (0 and 0), no `busy-runs.json` is present. The 4 records without a delegator are held by team runs (2) and org runs (2) (inline check of `taskAgent` sections).
- **AR-002, who messages whom** (`Measured`): `measure_cross_run_messages.py` over 838 log files: 13,142 messages inside one run; 1,600 between two runs: 737 delegator → delegated run, 819 delegated run → its delegator, 44 others. `measure_non_pair_messages.py` on the 44: 32 between two runs delegated by the same run (all 2026-10; no shared Task record), 4 from a delegated team run to the host of its standalone top run that is not its delegator and 2 the other way (2026-10: 4, 2026-11: 2), 1 + 1 the same with a team top run (2026-10), 3 + 1 on records without a delegator (2026-08, 2026-09).
- **AR-001** (`Read`): `root-task-execution-resource-scope.ts` (whole file): ownership is `adapter.ownershipChainFor(agent)` asked of the Task side; `assertInputAllowed`, `assertMessageScope`; `closedTaskExecutions` = `listClosedTaskExecutions` over `closedTaskExecutionsIn(root)` filtered by the tree; `releaseTaskExecutions` fences a remote endpoint and releases hosted runs, where "no authority" counts as stopped; `discardReleasedExecution`. `root-task-execution-lifecycle.ts:228-321`: `deliverToExactTarget` → `reactivateClosedTarget` (needs `ownerOf(target)`, `taskExecutionWithIngress(target)`, `assertReopenable`, the queue's `prepareClosedCopyForResume`, `reopenAssignment`, the reopened event). `compositions/project-task-execution-resource-composition.ts:59-66`: the release request and the worker status both resolve `hostRoot` in the active root directory.
- **AR-003** (`Read`): `standalone-root-location-service.ts` (`findAgent`, `listAgents`, `listHostRunIds`; "the third location family: children of Agent roots"); its consumers by search: `run-last-activity-reader.ts`, `collaboration-execution-location-service.ts`, `api/graphql/types/token-usage-stats.ts`, `api/rest/context-files.ts`, `general-process-run-supervisor.ts`, `standalone-root-member-view-projection-service.ts`.
- **AR-004** (`Read`): `restart-resume/busy-run-record.ts` (entry: `root`, `agentRunId`, `place`, `status`, `recordedAt`, `version`), `restart-notice.ts:26-27` (the "These runs you delegated…" line for an entry that is not `delegated`), `restart-resumer.ts:92-130`.
- Nothing was run on the target shape.

### Communication, for the contract's §10 (2026-11-10, `Read`)

- The user, 2026-11-10, on DEC-011: asked what "which runs can message each other" means, asked for the code behind today's direct route, observed that independence does not have to change communication ("we can still achieve the same communication"), recalled that `@` reaches others in the path, and asked that how communication works be written down in the contract as before. No decision on A or B yet; the Solution Designer's recommendation moved to B (the Task's record as the lookup) after the user's points that communication should stay and that the Task manages the runs working on it.
- Today's direct route, three pieces: every new delegated run is recorded at the top run (`standalone-root-task-execution-adapter.ts:112-114`); the top run indexes every agent in it (`standalone-root-execution-index.ts:77,83`); a run-ID message is delivered to anything in that index (`standalone-root-message-delivery.ts:175-178`); the only limit is the Task scope (`root-task-execution-resource-scope.ts:72-78`).
- Address resolution today (`docs/modules/agent_communication.md:354-383`): the sender's own team instances first, with no fall-through; then run-wide standing placements (a configured placement, or an Agent root's host); any other address is `COLLABORATION_TARGET_NOT_FOUND` with guidance; a message never starts a run; a run-ID target in the sender's root is woken, one outside it must be active.
- `@` today (`docs/modules/standalone_agent_run_root.md:109-121, 169-176`): resolution adds nothing and posts a note steering the focused agent; the host is offered to every viewer below it, so "a member of any delegated copy … can `@` the host" and then reaches it with `send_message_to(<host address>)`.

### The user's direction on links, the Task's record and scope (2026-11-10, after contract revision 3 was proposed)

Recorded from the Solution Designer's conversation; not yet written into the contract or the requirements (next revision).

- The user's understanding, confirmed: previously the top run hosted every task agent and task agent team below it, also as stored attributes (`taskExecutions` in its collaboration tree, filled in from each run's own file on load); with independent runs a relationship must be written somewhere: the link or the Task's record.
- The user: "the agent or agent team is connected with the task"; "we don't have to really keep all those task agent or agent teams into the collaboration tree because when the task is finished … it is just dismissed". Direction taken from it: (1) the receiver of a message is found through the link **and** through the Task's record (DEC-011 = B; the Solution Designer's recommendation after the user's points); (2) a link exists only while a Task it serves is open; closing the Task removes it, reopening or a follow-up Task adds it back; the Task's record is the lasting record; (3) both in this ticket. The user did not object when these three were put to him and went on to extend the scope (next point); to be confirmed when the revised contract is presented.
- The user: "I guess we could do the same thing for teams and organization as well if it fits in a ticket … so we don't get into this intermediary state". This reopens TC-4 (delivery in steps). Not sized yet: the team and org hosting code was read only in part (`flat-team-execution-manager.ts` in part, `root-team-run.ts`, `agent-org-run.ts`; not `team-task-execution-adapter.ts`, `agent-org-task-execution-adapter.ts`, the registries, or the web's team and org stores).
- The user's question on temporary Tasks (a Task with no Project, created by a description-only delegation, which its creator normally never closes): with links tied to an open Task such a link would never go; should the system close it itself after a time?
- `Measured` (read-only, counts only), the manager's link list: `collaboration_tree.json` 39,840 bytes, 145 links from 2026-10-08 to 2026-11-10 (about 274 bytes each); 134 belong to closed Tasks, 11 to open ones, 0 to no Task; loading the run today also reads 143 own files of linked runs (1,570,039 bytes); its message log 6,295,598 bytes in 2 files.
- `Measured`, Task records: 346 Project Tasks with runs (336 with every run closed, 10 with an open run); 15 temporary Tasks (14 closed, 1 open: assigned by the Project Task Manager, 19 days old). Run entries: Project Tasks 352 assigned closed, 10 open, 26 sub-work closed, 1 open, 2 `broughtIn` closed; temporary Tasks 14 assigned closed, 1 open, 1 sub-work closed.
