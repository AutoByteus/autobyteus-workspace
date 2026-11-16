# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/delegated-copies-outlive-delegator-461/requirements-doc.md` (SR-018, Approved)
- Upstream Investigation Notes: `.../investigation-notes.md` (including "Re-investigation after autobyteus-469")
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001 … SR-035)
- Reviewed Design Spec: `.../design-spec.md` (SR-035; commit `f86ad20aa4`), with contract revision 8, the walkthrough and the model. Round 10 rechecks AR-019, AR-020 and the round-9 model note
- Supplemental Task Artifacts Reviewed: `target-collaboration-contract.md` revision 5 (approved); `evidence/data-model-validation/*` (2026-11-11 outputs); `follow-ups.md`; `handoff-architecture-design-complete.md`
- Relevant Solution Revision IDs: SR-034, SR-035 (this round); SR-025 … SR-033 (round 9)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-066`
- Current Review Round: 10
- Trigger: SR-034 (AR-020) and SR-035 (the user's decision on AR-019)
- Prior Review Round Reviewed: 9 (`ARCH-REV-009`, `Fail`, AR-019, AR-020)
- Latest Authoritative Round: 10
- Current-State Evidence Basis: code at `827f1e68dc` (read with `git show`), under `autobyteus-server-ts/src`.
  - Round 10:
    - `solution-revision-record.md` SR-035 (the user's words), `requirements-doc.md:76` (the recorded exception)
    - `model.py` `_stop_runs_without_open_task` (the peer run is fenced) and `resolve` (step 2 by the run's entries)
    - `stories.py` S19
    - re-ran `walkthrough.py --check` (three "match" lines) and `validate_contract_examples.py` (0 findings) on the ticket folder only
  - Round 9:
    - Ran the package's checks on the ticket folder only. `walkthrough.py --check target-collaboration-contract.md` printed three "match" lines; `validate_contract_examples.py collaboration-walkthrough.md` printed 0 findings. `validate_every_case.py` was not re-run, because it reads the user's data.
    - Read `evidence/collaboration-model/model.py` (421 lines) whole, and the S16 … S21 entries of `stories.py`.
    - Compared against code at `827f1e68dc`: `agent-collaboration/execution/remote/remote-endpoint.ts:44-46, 98-100` (`closureFence`: "Nothing is released here; the run stops on its node when it goes idle") and `agent-collaboration/execution/task/root-task-execution-resource-scope.ts:85-106` (a closed Task's peer run is `fenced_remote`, not stopped).
    - `solution-revision-record.md` SR-025: "Intended behavior changed: `Yes` … decided … within the direction; the user is informed".
    - `requirements-doc.md:68` (out of scope: "Stop on Task closure across nodes") and `:76` (non-goal: "No change to what an agent reads … collaboration texts").
  - Round 8, at `827f1e68dc`:
    - `evidence/data-model-validation/team-run-shapes-2026-11-11.txt`
    - readers that equate a team's root address, or its team-level scope, with `/` (`git grep`):
      - server: `team-run-execution-tree-schema.ts:44`, `agent-team-execution/domain/team-run-config.ts:104, 142, 192`, `services/team-run-selection-mutator.ts:45`, `flat-team-topology-planner.ts:162`, `team-execution-index.ts:131`, `agent-collaboration/services/collaboration-launch-configuration-resolver.ts:45`, `agent-collaboration/execution/domain/member-instance-scope.ts:81`;
      - web: `components/workspace/config/ExistingRunConfigEditor.vue:344`, `stores/teamRunConfigStore.ts:125`, `composables/useDefinitionLaunchDefaults.ts:93`, `stores/runHistoryReadModel.ts:42`
    - handoff compilation: `agent-collaboration/definition/collaboration-handoff-compiler.ts:58-95` (`input.resolve(handoff.to)` at plan time), used by `flat-team-topology-planner.ts`
  - Round 6, `git grep delegatedFrom` at `827f1e68dc` outside migrations (readers that branch on its presence):
    - `standalone-agent-run-root/domain/standalone-agent-run-root.ts:148, 153`
    - `standalone-agent-run-root/services/standalone-agent-run-root-manager.ts:208-211, 345, 447-449`
    - `agent-team-execution/domain/root-team-run.ts:201`
    - `agent-team-execution/domain/team-run-remote-links.ts:23`
    - `agent-execution/services/standalone-agent-run-eligibility.ts:16`
    - `run-history/store/coordinating-tree-shapes.ts:35`
    - `agent-collaboration/execution/remote/remote-run-links.ts:94, 138` and `remote-endpoint.ts:139-147`
  - Round 5:
    - `app-data-migrations/app-data-migration-runner.ts:79-100` (`runPending` continues past a failed or held migration, in registration order) and `:59-77` (capability readiness)
    - `app-data-migrations/migrations/delegated-copy-own-file-complete-v1/delegated-copy-own-file-complete-v1-app-data-migration.ts:105-174`: a coordinating tree is read only for copies of configured places (team or org runs); a missing tree is the preserved warning `PRESERVED_PLACEMENT_MISSING`
    - no predecessor declares `holdsBackCapabilities` (grep)
  - Round 4:
    - `app-data-migrations/migrations/task-agent-own-run-v1/task-agent-own-run-v1-app-data-migration.ts:41-44, 102, 113-114, 129-132`: a per-run `FAILED_OPERATION` (or `WAITING_FOR_PREDECESSOR`) makes the whole migration `FAILED`
    - `app-data-migrations/app-data-migration-runner.ts:145-157, 190`: a held migration throws `AppDataMigrationPrerequisiteError`; `NOT_RUN`, `FAILED` and `RUNNING` are pending again at every start
    - `run-history/store/agent-run-metadata-store.ts` at base: today's reader decides "standalone" by the absence of `taskAgent`; the new reader drops that rule
  - Round 3:
    - `app-data-migrations/app-data-migration-runner.ts:135-157` (the prerequisite hold)
    - `agent-collaboration/execution/remote/remote-message-send.ts` (prepare → deliver → `commitSentToRemote`)
    - `projects/stores/task-execution-resource-schema.ts:17-66` (strict per-entry parse; one invalid entry fails the file)
    - `projects/services/task-execution-resource-service.ts:44-63, 207-246` (an invalid file marks its Task damaged; a damaged Task contributes nothing)
  - Round 2:
    - `agent-collaboration/execution/remote/remote-child-commands.ts:20-60`
    - `restart-resume/restart-notice.ts:15-30`
    - `agent-execution/events/processors/token-usage/token-usage-context-enricher.ts:30-45`
    - `token-usage/providers/token-usage-run-store.ts`
    - `agent-communication/services/global-agent-run-message-router.ts:50-115`
    - `services/agent-streaming/agent-collaboration-stream-handler.ts` (`readyRoot`)
    - `agent-team-execution/domain/root-team-run.ts:428-470`
    - `agent-collaboration/execution/services/active-collaboration-root-directory.ts`
    - `run-history/store/task-execution-tree-split.ts:191` (469 D-3)

  Also the round-1 reads. Nothing was run.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: confirmed. Persistence, ownership boundaries (no hosting for three root kinds), ordering, and the shared contracts of all three run kinds all change.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. User approval of the design is recorded as `Obtained`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. The intent is clear. The findings are in the target paths. One requirements-document coherence item is AR-015.
- Approved requirements / intended behavior understood: yes.
  - Every run is its own root and its life is bound to its Task.
  - The delegation is stored once, in the Task entry's `delegatedFrom` (TC-7, TC-10).
  - Messages are centered on the Task (DEC-011).
  - All three delegating run kinds are in scope (TC-4 revised).
  - The 15 legacy runs become ordinary runs (TC-9), and the 64 legacy messages they took part in would be refused under the new rule (DEC-011, decided by the user).
- Scope guardrail confirmed: yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`
- Remaining material ambiguity: none in intent.
- Statements about existing code the design relies on, opened at their cited lines:
  - "A local child is shown the way a remote child already is" (DS-8, U-B): the remote child path has no tool approval ("A run on another node approves its own tools", `remote-child-commands.ts:26-49`). See AR-011.
  - "Opening a view never starts a run (REQ-004, AR-008)": at `827f1e68dc` the collaboration stream's connect still calls `ensureHostReady` (`agent-collaboration-stream-handler.ts:59-62, 73, 148`), and no section changes it. See AR-008.
  - "Each run's own gate orders the run": standalone and org roots have `RootOperationGate`. The team root has `materializationGate` (`root-team-run.ts:434`). It exists, but the design does not name it.
  - Today's restart notice line for delegated runs comes from same-root entries (`restart-notice.ts:26-27`). See AR-004.
  - Today usage rows of copies hosted in a team root roll up to that team (`token-usage-context-enricher.ts:38-42`). See AR-012.

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001, BEH-002, BEH-004 | User | Pass | Pass | Pass (DS-4) | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass (round 3: AR-013, AR-014 resolved) | Confirmed | — |
| BEH-005 | Contract | Pass | Pass | Pass (DS-5, DS-6; the Task entry is the membership) | Confirmed | — |
| BEH-006 | Operational | Pass | Pass | Pass (round 3: AR-004 resolved) | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-009 | User | Pass | Pass | Pass (round 3: AR-008 resolved) | Confirmed | — |
| BEH-010 | Contract | Pass | Pass | Fail (round 3: Task entries of preserved runs damage their Task) | Needs Correction | AR-005 |
| BEH-011 | User | Pass | Pass | Pass (round 3: AR-011, AR-012 resolved) | Confirmed | — |

> **Round 3 note:** the structural verdict tables below were completed in round 2.
> - Rows marked `Fail` for AR-004, AR-008, AR-011, AR-012, AR-013, AR-014 and AR-015 are resolved in round 3; see "Round 3: The Round-2 Findings Rechecked".
> - Only the rows for AR-005 (DS-10, the persisted-data transition) remain `Fail`.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked? | Internally Complete? | Consistent With Core Artifacts? | Status / Approval Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Contract revision 5 | Pass | Pass | Pass | Pass | Pass | — |
| `evidence/data-model-validation/*` (2026-11-11) | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass | Fail (the requirements doc still lists FU-002 … FU-005 as current) | Pass | AR-015 |
| Requirements doc, Supplemental Artifacts table | Pass | Pass | Fail | Fail (names contract "Revision 2, approved (TC-1 … TC-6)") | Fail | AR-015 |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | "The Idea", "Scope" | — |
| Root-cause classification is evidence-backed | Pass | Hosting couples the index with life control (current-state table) | — |
| Refactor decision is explicit | Pass | All hosting removed (TC-4 revised) | — |
| Refactor decision is supported by concrete sections | Fail | The duties hosting performed are mostly reassigned. Still not reassigned: commands to a hosted child, team roll-up, the notice line and the connect path | AR-004, AR-008, AR-011, AR-012 |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade/Owner Clear? | Naming Clear? | One Owner Per Node, In Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-1 Delegate | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass (see the AR-001 residual note on the role decision) |
| DS-2 By run ID | Primary | Pass | Pass | Pass | Pass | Fail (the receiver's gate writes both logs) | Pass | Fail (AR-013, AR-014) |
| DS-3 By address | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-4 Stop | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-5 Closure | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-6 Reopen / follow-up | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-7 Idle | Bounded local | Pass | Pass | Pass | Pass | Pass (name the team's `materializationGate`) | Pass | Pass |
| DS-8 View | Primary | Pass | Fail (commands to a child absent; connect path unnamed) | Pass | Pass | Fail | Pass | Fail (AR-008, AR-011) |
| DS-9 Restart | Operational | Pass | Fail (notice content) | Pass | Pass | Pass | Pass | Fail (AR-004) |
| DS-10 Migration | Operational | Pass | Fail (step 5/6 dispositions; guideline checklist) | Pass | Pass | Pass | Pass | Fail (AR-005) |
| DS-11 Run list | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Task side port (four questions) | Pass | Pass | Pass | Pass | Index private to `projects/services` |
| `TaskMessageScope` | Pass | Pass | Pass | Pass | One owner for admission and route |
| `TaskDelegation`, `DelegatedRunStarter` | Pass | Pass | Pass | Pass | Extracted from the peer path |
| A run's root (log, gate) | Pass | Fail | Fail | Fail | DS-2 has the receiver's gate write the sender's log (AR-013) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Collaboration → Task side via port | Pass | Pass | Pass | Pass | — |
| Roots → `TaskDelegation` → `DelegatedRunStarter` | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `runOfAgent(agentRunId)` | Pass | Pass | Fail (no stated source for agents of a stopped delegating team/org run) | Medium | Fail (AR-014) |
| `delegationOf(run)`, `assigningRunOf(taskId)`, `openRunsDelegatedFrom(run)` | Pass | Pass | Pass | Low | Pass |
| Root `stopForTaskClosure()` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Sound? | New Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Run with its own root, idle shutdown, wake | Pass | Pass | N/A | Pass | The peer path is the model |
| Child observation in a view | Pass | Fail | N/A | Fail | Reuses the remote child path, which lacks tool approval (AR-011) |
| Root ordering | Pass | Pass | N/A | Pass | The existing gates |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear? | Decision Sound? | Serves Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `projects/services` (Task side, index) | Pass | Pass | Pass | Pass | — |
| `agent-collaboration/communication`, `execution/task`, `execution/delegation` | Pass | Pass | Pass | Pass | — |
| `restart-resume` | Fail | Fail | Fail | Fail | AR-004 |
| `token-usage` (team/org attribution) | Fail | Fail | Fail | Fail | AR-012 |
| `services/agent-streaming` (connect, child commands) | Fail | Fail | Fail | Fail | AR-008, AR-011 |
| `app-data-migrations` | Pass | Fail | Pass | Fail | AR-005 |

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `delegatedFrom { delegatingRun, delegatorAgentRunId, nodeId? }` | Pass | Pass | Pass | Pass | One name for both places (TC-10) |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundancy Removed? | Overlap Controlled? | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Task entry | Pass | Pass (`hostRoot`, `assignedBy` replaced) | Pass | N/A | Pass | `delegatedFrom` repeated per entry, equal by rule (contract §3) |
| Agent run file | Pass | Pass (`taskAgent` removed; `address` added) | Pass | N/A | Pass | — |

Derived consumers listed with a decision for each: `Fail`. The token-usage attribution for team/org roots (AR-012), the stream connect (AR-008) and the child-command path (AR-011) are missing.

One vocabulary: `Pass`.

## File Responsibility Mapping Verdict

| File / Group | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New owners (`TaskMessageScope`, `TaskDelegation`, `DelegatedRunStarter`, idle shutdowns) | Pass | Pass | N/A | Pass | — |
| Files to change for AR-004, AR-008, AR-011, AR-012 | Fail | Fail | N/A | Fail | Not named |

## Subsystem / Folder / File Placement Verdict

| Path | Clear? | Matches Boundary? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/delegation/`, `.../communication/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Hosting machinery of three roots, the lifecycle, registries, adapters | Pass | Pass | Pass | Pass | — |
| Standalone tree file, team/org lists, `taskAgent`, `hostRoot`, `assignedBy`, `userLaunchSelection` | Pass | Pass | Pass | Pass | Migration disposition: AR-005 |
| `readyRoot` → `ensureHostReady` on connect | Fail | Fail | Fail | Fail | AR-008 |

## Legacy / Backward-Compatibility Verdict

| Area | Retention? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Hosting | No | Pass | Pass | No in-between state (TC-4) |
| `coordinatingRun` on the wire | No | Pass | Pass | Renamed `delegatingRun` |

## Persisted-Data Transition Verdict

| Subject | Decision | Evidence Sufficient? | Proportionate? | Migration Safety Complete? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Task entries (E1 … E4) | Migration Required | Pass | Pass | Pass | Pass | 406 of 406 computed |
| `taskAgent` (E6), history rows (step 8) | Migration Required | Pass | Pass | Pass | Pass | — |
| Standalone tree files (E8), team/org lists (E9) | Migration Required (remove) | Fail | Pass | Fail | Fail | They may hold entries a released migration still owns (AR-005) |
| Busy-run record (step 7) | Migration Required | Pass | Pass | Pass | Pass | — |
| Guideline §2 checklist | — | Fail | — | Fail | Fail | Not answered for this migration (AR-005) |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1 … 10 | Pass (they ship together; separate commits with tests) | Pass | Fail (AR-008) | Fail |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Records, scenario as data, message walk | Yes | Pass | Pass | Pass | Contract §2, §4, §12 |

## Material Premise Validation

### `MP-A` — A tree file or list removed by DS-10 still holds an entry a released migration owns

- Related contract: REQ-011, QR-003, AC-014; Data Migration Guideline §2 item 5; 469 D-3 (SR-008).
- Initiating basis kind: `Operational`.
- Trigger: on data where `20261017_task_agent_own_run_v1` left a per-run `FAILED_OPERATION`, 469's save keeps the full record, or a link whose run has no own file, byte-for-byte. The app keeps running. On upgrade, DS-10 steps 5 and 6 remove the standalone `collaboration_tree.json` and the team/org `taskExecutions` lists.
- Consequence: the kept record is the only copy of that run's facts and would be destroyed.
- Reachability: `Reachable`. It is the exact state 469 AR-002 was raised for, and the design's own fixture line names it.
- Review consequence: AR-005.

### `MP-B` — A delegated run replies by run ID to a non-delegator member of its stopped assigning team

- Related contract: DEC-011 rule (b); REQ-003.
- Initiating basis kind: `System`.
- Trigger:
  1. A member Tm of a team run T, which the user started, messages a run A that T assigned. Rule (b) allows it.
  2. The user stops T.
  3. A replies to Tm's run ID, as the sender run ID in a message instructs.
- Path: `TaskMessageScope.route` → `runOfAgent(Tm)`. Tm is not an entry agent and not a member of a delegated team. Contract §10.5 says only "an agent of a run the user started: that run", with no source.
- Reachability: `Reachable`.
- Review consequence: AR-014.

## Unresolved Approved-Behavior Or Current-State Gaps

None beyond the findings.

## Round 3: The Round-2 Findings Rechecked

| Finding | SR-019 answer | Verified against | Status |
| --- | --- | --- | --- |
| AR-004 Notice line | A resumed run's notice lists the resumed runs whose entry names it as `delegatingRun` (one hop) | `restart-notice.ts:26-27` | Resolved |
| AR-005 Migration | Prerequisites declared; the runner holds the migration (`app-data-migration-runner.ts:145-157`). Trees holding a kept entry are left untouched. Retry recognition per step; §2 checklist; fixtures | Runner; 469 D-3 | **Still open, narrowed** (below) |
| AR-008 Connect starts the host | `readyRoot` without `ensureHostReady`, for the three stream kinds; removal plan; step 7 | `agent-collaboration-stream-handler.ts:59-62, 73, 148` | Resolved |
| AR-011 Commands to a local child | `DelegatedRunCommands`: message (`resolveOrRestore`), interrupt and tool approval (live root), Stop, each to the child's own root, in all three views | `remote-child-commands.ts:26-49` (the remote path stays) | Resolved |
| AR-012 Token totals | Every total covers its own agents plus the runs delegated from it, recursively, from open and closed entries, each record once; capture attribution is the run's own root; REQ-009 states it | `token-usage-context-enricher.ts:38-42` | Resolved |
| AR-013 Logs across roots | The receiver's root writes its own log in its gate, then the sender's root writes its own (`commitSent`). A refusal writes nothing. A failed sender write after acceptance means delivered, plus the sender's fail-stop | `remote-message-send.ts` (same order) | Resolved |
| AR-014 Agents of stopped delegating runs | The index maps every agent of every run named by an entry or as a `delegatingRun`, read once from its own file | Contract §10.5 | Resolved |
| AR-015 Stale requirements | Supplements, follow-ups, SCN-002, REQ-005, REQ-009, unknowns, ASM-003; org roots in the Ownership Map | `requirements-doc.md` | Resolved |
| Residuals | DS-1: role (`subWork` of the newest open Task, else `assigned`), owned-sender refusal, history row at creation; the team gate named | — | Resolved |

## Round 66 (narrow): SR-090, a peer row's Retry over the status connection

- **Change reviewed** (commit `d4bec3a702`; IMP-RETRY; 3c under G-A3).
  - The client sends `RETRY_PEERS { runIds }` on `/ws/run-status` for peer runs it subscribes to, from any shown tree.
  - `RunStatusService.retryPeers` retries, then re-tells each run's state even if unchanged, so "Checking {node}…" always settles.
  - Reachability and the notice title come from the row's `peer`.
  - `REFRESH_REMOTE_TASK_EXECUTIONS` is removed, and tests are added.
- **Judgement: sound.**
  - The Retry belongs to the owner of peer statuses, `RunStatusService`, now that statuses left the views, so it works from every tree.
  - Re-telling an unchanged state is harmless for latest-value statuses, and it is the only way "Checking" can settle for a node that stays down.
  - Removing the dead view command follows the "no unused path" rule.
  - Options (B) and (C) are rightly rejected: (B) would work only from an open view, and (C) would lose base's behavior.
- **Note (not blocking).**
  - Say that a retry re-opens the shared peer observation that has ended, since `observe` never reconnects (DEC-807).
  - Coalesce concurrent retries for the same peer run (one in flight; later requests join its answer), so several clients pressing Retry produce one peer call.
- **Decision:** `Pass` unchanged.

## Round 65 (narrow): SR-089, every `AgentRun` gets a stream sequence (answers AR-032)

- **Change reviewed** (commit `cfd807f127`; 3b "Scope", 3c G-D1). Option (a): an `AgentStreamSequence`, with its turn buffer and exclusion snapshot, is attached to every `AgentRun` (standalone agents, team members and org agents). Node B serves a peer team's coordinator and members through the same `agentStreamSnapshot` / `observeAgentStream`. A team's or org's own view keeps its stream. There is a test for AC-016.
- **Verified on the branch:**
  - a team member is an `AgentRun` (`flat-team-agent-execution-handle.ts:71`, `getOrCreateAgentRun`);
  - every `AgentRun` is attached in one place: `AgentRunActivationRegistry.markPrepared` (`:125-133`) calls `AgentRunResourceManager.attach(run)`, which attaches `streamSequences.attachToRun(run, memoryRecorder)` (`agent-run-resource-manager.ts:64`, attach `:74-100`).
- **AR-032: resolved.** One rule now covers every `AgentRun`, and every peer row opens through one path. The buffer's cost is bounded by in-flight turns, as before.
- **Note (confirm with a test).** The attach covers a member only if team and org members are activated through `AgentRunActivationRegistry`, like standalone runs. Make the AC-016 test, or a unit test, assert that a team member's and an org agent's `AgentRun` has a sequence, including an org agent that starts lazily.
- **Decision:** `Pass`. The cumulative package (through SR-089) is ready for implementation.

## Round 64 (narrow): SR-088, a peer agent's conversation is node B's own agent stream

- **Change reviewed** (commit `095fa03ca4`; IMP-G-D1; 3c G-D1). Node B serves `agentStreamSnapshot(targetRoot, agentRunId)` and `observeAgentStream(targetRoot, agentRunId)` from that agent's `AgentStreamSequence`, under the back-link check. Node A's `/ws/peer-run` relays them one for one in the `/ws/agent` protocol. The run-level `observe` stays for statuses and summaries, and REQ-013 names the two additions.
- **Judgement on the agent case: sound.** The run-level observation mixes root-synthesized statuses and `MEMBER_INPUT`, which have no place in an agent's sequence, so taking the snapshot and the frames from one source, node B's own agent stream, is right. The web reusing `AgentStreamingService` unchanged is the right symmetry.
- **Not sound (AR-032, Design Impact): a peer team's members have no agent stream on node B.**
  - 3b's scope (`design-spec.md:303`) says: "A team's member uses the team stream's existing connection." So `AgentStreamSequence` exists only for an agent run's own stream, not for a team's members.
  - A peer team row targets its coordinator (`openTargetOf`), and a peer member row targets a member. Both are team members on node B. So `agentStreamSnapshot` and `observeAgentStream` for them have no sequence and no 3b snapshot to serve.
  - AC-016 covers a peer Team child explicitly: its live status and its stored conversation, opened with the delegator stopped.
  - **Needed:** decide the source for a peer team member's conversation, and test it. Either:
    - (a) extend 3b's `AgentStreamSequence`, with its turn buffer and exclusion snapshot, to every agent run, team members included. Node B serves members by the same two requests, and node B's own team view keeps its team stream;
    - (b) relay node B's team stream for that member, with the team stream's snapshot connection and sequence, in the `/ws/team` protocol, so the web opens it with `TeamStreamingService`.

    (a) keeps one peer path, the `/ws/agent` relay, for every peer row, which seems simpler. The choice is the designer's.
- **Decision:** `Fail` (AR-032, Design Impact). The agent case needs no change.

## Round 63 (narrow): AR-031 answered, the stored filter by `turn_id`

- **Change reviewed** (commit `b3b509cc53`; 3b step 2).
  1. **The turn key** is the raw trace's `turn_id`, and `RunProjectionConversationEntry` gains a server-side `turnId`.
  2. **The rule is exclusion with a watermark:** an entry is kept if its turn predates this sequence or was confirmed at the base. "Predates" is the set of turn IDs stored when the `AgentRun` activated, taken from the restore's memory load, active and archived traces alike, because compaction rewrites `raw_traces`.
  3. **Entries with no turn** are always kept and matched by `messageId`.
  4. **A stopped run** is read unfiltered.

  Tests cover a restore, a stopped run, an interrupted earlier turn, and the write-before-frame order.
- **Verified:**
  - **The turn key exists at its sources:** `turn_id` in the raw trace item (`raw-trace-item.ts:14, 86`), `turnId` in `runtime-memory-event-accumulator.ts:40, 72`, and the replay identity (`historical-replay-event-identity.ts:22-26`).
  - **The "to verify" item holds at base:**
    - `memberInputMessageHandler.ts:29-30` skips an inter-agent message whose `messageId` the conversation already holds;
    - `userMessageProjection.ts:31-72` merges a user message by `messageId` / `dedupeKey`.

    So turnless entries kept on both sides appear once. The item can be closed.
- **AR-031: resolved.**
  - Exclusion with a set of turn IDs taken at activation keeps every earlier turn: a restored run's history and an earlier interrupted turn.
  - The set is ID-based, not a file position, so compaction cannot break it.
  - A stopped run is read whole.
  - The write-before-frame case is excluded correctly.
- **Decision:** `Pass`. The cumulative package (through SR-087) is ready for implementation.

## Round 62: SR-087, each turn from one source (answers IMP-3b)

- **Change reviewed** (commit `761da92499`; the Implementation Engineer's IMP-3b Design Impact). Stored segments have no matchable ID, and writes and segment ends come in either order, so offsets can't make the stored read exact.
  - A turn is "confirmed" once `TURN_COMPLETED` is seen and its writes are durable (`whenPersisted(turnId)`).
  - `AgentStreamSequence` buffers every unconfirmed turn's frames while the run is active, regardless of sessions.
  - The snapshot runs in four steps:
    1. one synchronous step: the base, the confirmed set and a copy of the buffer;
    2. the stored read, *filtered to that confirmed set*;
    3. `AGENT_STREAM_SNAPSHOT { stored, turnFrames, … }`;
    4. the frames after the base.
  - Offsets are withdrawn.
  - G-D1: node A takes node B's own snapshot (`agentStreamSnapshot`), and node B's observed frames carry its sequence number.
- **Judgement on the approach: right.**
  - IMP-3b's evidence is sound: the stored projection has no segment or turn ID the web can match (`run-projection-types.ts:30-48`), and its write timing differs by runtime. So a turn should come from one source, stored or frames, never both. That is cleaner than offsets.
  - Buffering unconfirmed turns regardless of sessions is the necessary consequence. It is bounded by in-flight turns, so the reversal of my G-G1 note is right.
  - G-D1 reusing node B's own snapshot and numbering is the right symmetry.
- **Not sound as written (AR-031, Design Impact): the stored filter.**
  1. **It needs a turn key that stored entries lack.** Step 2 keeps "those turns' assistant and tool entries". `RunProjectionConversationEntry` (`run-projection-types.ts:30-48`) has `ts`, `invocationId` and `messageId`, but no turn ID (IMP-3b `:20-26`). The design must name the server-side key that maps a stored entry to its turn: one already in the raw memory or traces, or a `turnId` the writers add to entries. It must also say how entries with no turn are treated.
  2. **"Filtered to the confirmed set" drops every turn this sequence never saw.** The set lives in an `AgentStreamSequence` that exists only while the current `AgentRun` is active. So:
     - a run restored after an idle shutdown or a restart, opened while it is live, would lose all its earlier conversation from the snapshot, because none of those turns are in the new sequence's set;
     - a turn interrupted without `TURN_COMPLETED` in an earlier instance is never confirmed;
     - for a stopped run there is no sequence at all.

     Define the filter by exclusion instead. Leave out only the stored entries of turns that were unconfirmed at the base (in the buffer copy), and of turns that started after the base. Turns that predate this sequence are included: record a watermark when the sequence starts, such as the stored conversation's last turn or entry at the `AgentRun`'s activation. With no active sequence, the stored read is unfiltered.
  - **Needed:** state the turn key, the exclusion rule with its watermark, and the stopped-run case. Add tests:
    - a restored live run's snapshot keeps its whole earlier conversation;
    - a stopped run's snapshot is its full stored conversation;
    - an interrupted earlier turn appears once.
- **Checks:** `walkthrough.py --check` passes.
- **Decision:** `Fail` (AR-031, Design Impact). The rest of SR-087 needs no change.

## Round 61 (narrow): AR-030 answered, offsets from node B

- **Change reviewed** (commit `1b814aa084`; item 3c G-D1; REQ-013).
  - Node B sends the segment offset as an additive field on its observed appending `AgentPresentationMessage` frames: the same offsets its own agent stream has from 3b.
  - Node A applies only what lies beyond the segment's length in `readConversation`'s snapshot.
  - Both nodes run the same release.
  - A frame without an offset falls back to bracketing (at most three re-reads, then an in-order append, logged).
  - REQ-013 records the one additive field, and the user is informed.
  - Applied from my last note: an idle `AgentStreamSequence` is released.
- **AR-030: resolved.** Node B is the only node that can count its segments' offsets, and it already counts them for its own stream. Carrying them on observed frames gives the peer stream the same exactness as a local run.
- **Correction of my round 60.** I raised "a peer on an older version would send no offsets". `DESIGN.md` rule 9 (`:74-82`) says the nodes run one release, with "no fallback for a client or server that does not know a new route or field", and that reviewers do not raise a mismatched version. That part of AR-030 should not have been raised.
- **Note (follows from rule 9).** Remove the no-offset bracketing fallback and its test. Under rule 9 a frame without an offset is a contract violation: log it, but don't build a supported path for it. One exactness rule, offsets, is simpler and is what both nodes run.
- **Decision:** `Pass`. The cumulative package (through SR-086) is ready for implementation.

## Round 60: SR-086, the view spines walked again (item 3c)

- **Change reviewed** (commit `a95a108253`; `evidence/spine-validation/spine-walk-2026-11-15.md`). The walk covers six view spines and closes ten gaps:
  - **status connection:** G-A1 (reconnect with a fresh snapshot), G-A2 (`not_found`), G-A3 (`unreachable`), G-A4 (a team's or org's own status computed by its root);
  - **launch:** G-B1 (a save notifies `ChildRowsFeed`), G-B2 (a peer row's launch from its summary);
  - **lists:** G-C1 (listed teams and orgs expand);
  - **peer conversation:** G-D1 (a peer run opens by its own identity on `/ws/peer-run`);
  - **Task card:** G-F1 (`TaskRootView.openTarget`);
  - **agent stream:** G-G1 (`AgentStreamSequence`'s lifetime).
- **Judgement: the walk is the right check, and nine of the gaps are answered soundly.**
  - G-A4 moves the last client derivation of a run's facts, `TeamAggregateStatusDot`, to the server under the run's own ID.
  - G-B1 replaces SR-085's removed overlay with a real change signal.
  - G-A1 to G-A3 give the status connection defined failure answers.
  - G-D1's direction completes REQ-013: a peer run's conversation is no longer relayed through its delegator's view.
- **Not sound as written (AR-030, Design Impact): where G-D1's offsets come from.**
  - G-D1 says the peer stream's frames carry "offsets as in 3b". An offset is a position in a segment as the run's own node counts it, and the snapshot here is node B's projection (`agentProjection`).
  - Node A cannot compute such offsets for frames it receives from `observeRun`, which at base are plain `AgentPresentationMessage`s (`remote-run-channel.ts:72-77`). Counting from the start of the observation does not line up with node B's projection.
  - So either node B's presentation frames carry the offsets, which is an additive change on the wire, or the peer stream needs another exactness rule.
  - REQ-013 says "the peer protocol [is] unchanged", and a peer on an older version would send no offsets.
  - **Needed:** state the source of the peer frames' offsets.
    - If node B sends them (the natural choice, since its agent stream gains offsets in 3b anyway), record the additive wire field as REQ-013's exception, with the user's approval if needed. Say what node A does when a peer sends none: for example, base's behavior, or snapshot bracketing.
    - Otherwise, use (c), bracketing: read the projection, check that no frame arrived during the read, and retry if one did.

    Add a test for a delta during the remote projection read.
- **Note (G-G1 lifetime).** An `AgentStreamSequence` per agent run that lasts as long as the process is small, but it is never released. Releasing it when no session holds it would also give a fresh `liveSequenceId`, which the client already handles. That is optional.
- **Checks:** `walkthrough.py --check` passes.
- **Decision:** `Fail` (AR-030, Design Impact). The other nine gaps need no change.

## Round 59 (narrow): AR-029 answered, offsets on appending frames

- **Change reviewed** (commit `03c2d50a67`; item 3b). Option (b) is chosen.
  - Every appending frame (`SEGMENT_CONTENT`, and the reasoning and tool-output deltas) carries its offset in its segment. The web applies only what lies beyond the segment's current length, and skips a frame that ends at or before it.
  - Non-appending frames are idempotent by their IDs.
  - There are tests for a delta published during the read and for a partial overlap.
  - Numbering owner: a separate per-agent-run `AgentStreamSequence` with its own `liveSequenceId`.
- **Verified at `827f1e68dc`:**
  - `appendContentToSegment` (`segmentHandler.ts:317-345`) appends every type to one raw field: text and think to `content`, tool_call to `rawContent`, write_file and edit_file to `originalContent`, terminal_command to `command`. So "current length" has a single meaning per segment type.
  - The base `AgentStreamingService` uses no `liveSequenceId`, so the separate sequence cannot mix with the view's participant message positions.
- **AR-029: resolved.** Offsets make content frames idempotent independently of where the persisted and live parts meet, which is the robust choice.
- **Note (the unit and the source of "current length").** Compare an offset with the length of the same raw field the server counted, in the same unit. Both ends are TypeScript, so use string length in UTF-16 code units. For a segment still open at snapshot time, the snapshot's projection must carry that raw field at its server length. A projection that rebuilds the segment from stored traces in another form, such as parsed tool arguments without `rawContent`, would otherwise give a wrong length and double or drop text. State this in item 3b, and include an open tool-call segment in the partial-overlap test.
- **Decision:** `Pass`. The cumulative package (through SR-085) is ready for implementation.

## Round 58: SR-085, the frontend's named losses, and a run's own stream with a snapshot

- **Change reviewed** (commit `c4f8abe877`; the code reviewer's addendum to SR-084, which the user confirmed).
  - **Item 3** names what the frontend loses: the builders and per-view open logic; Settings' assembly, its per-row `runLaunch` and its save overlay; and every hosted-copy rule.
  - **Item 3b:** each agent run's own stream numbers its frames. On connect, the session takes the base in one synchronous step, then reads the conversation projection behind the queue, then sends `AGENT_STREAM_SNAPSHOT`, then the queued and live frames. The web applies it and reopens on a gap, and CR-461-098's re-read and heuristic go.
- **Item 3: sound.** Naming the losses makes the "clients only display" rule checkable, and Settings showing the next tree answer's `launch` after a save removes the overlay.
- **Item 3b's goal is right.** A sequenced connect replaces a heuristic.
- **Not sound as written (AR-029, Design Impact): the projection is read behind the queue, but agent content frames are not idempotent.**
  - AR-026 put the Team tab's log read after the base *because* messages are deduplicated by message ID. It kept rows at the base *because* rows are not.
  - Agent stream frames are like rows. The base web's `SEGMENT_CONTENT` handler appends each delta to its segment (`segmentHandler.ts:180-205`, `appendContentToSegment`), with no position check.
  - A delta published while the projection is being read is numbered after the base and queued. If the projection, live or stored, already includes it, the web appends it twice, and the user sees duplicated text. The same holds for any other appending frame.
  - **Needed:** decide how the projection is exact for the frames after its base. For example:
    - (a) capture the live part of the projection (the in-flight turn and segments, in memory) in the same synchronous step as the base, after any async read of the persisted part, with the persisted part ending where the in-memory part begins;
    - (b) make content frames idempotent: each `SEGMENT_CONTENT` carries its offset in the segment, and the web applies only what lies beyond the segment's current length;
    - (c) base's checkpoint bracketing for team members: read, re-check the sequence, and retry if it moved.

    (b) is the most robust, because it doesn't depend on where the persisted and live parts meet. The choice is the designer's.
  - Add a test: a content delta published during the projection read appears once.
- **Note (numbering owner).** "Each agent run's stream numbers its frames": name the owner. Either it is the run's `RunViewStream`, one sequence and one `liveSequenceId` per run, or a separate per-agent-run sequence. If separate, say how its `liveSequenceId` and the view's relate, since the web keys message positions by `liveSequenceId`.
- **Checks:** `walkthrough.py --check` passes.
- **Decision:** `Fail` (AR-029, Design Impact). Item 3 and the rest of SR-085 need no change.

## Round 57: SR-084, the server-built run tree reinstated

- **Change reviewed** (commit `9cf42c1890`; the user's decision of 2026-11-15, after code review rounds 13–14 found more client-side rebuilding defects: F-60, F-69, F-73, after F-54 … F-64).
  - `RunTreeView` and `runTree(run)` return, as passed in ARCH-REV-054 / 055, with the same delivery: on the view stream, and `RUN_TREE_CHANGED { runId }` on `/ws/run-status` for listed runs.
  - Rows keep SR-083's `openTargetOf`, and carry `statusIds` and `launch` as the run has it now (with the `"settings"` origin). `runLaunch` and the Settings assembly fold into `launch`.
  - The run list's top level is unchanged (DS-11).
  - Clients only display: the four builders, the hosted-copy follower path, the phone projection and the Settings assembly are removed.
  - Settings' target is a row key.
  - Rule 3 excepts trees and statuses, REQ-014 is restored, and FU-034 is moved in.
- **Judgement: sound.** The structure is the one ARCH-REV-054/055 passed, and SR-083's server `openTarget` carries into it. The new evidence is that the client builders kept producing defects after SR-083. That answers SR-083's cost-benefit judgment: the decision is the user's, and the review has no objection. Folding `runLaunch` and the Settings assembly into the row's `launch` removes two more client-side derivations.
- **Note 1 (stable row keys).** Settings now keeps its target as a row key across refreshes (`:276`), but the design never defines `key`. Define it from identities, for example a run's kind and run ID, plus the agent run ID for a member row, never from position or depth. Then a refresh that adds or removes other rows keeps the same key on the same row. Add that to the `RunTreeView` tests.
- **Note 2 (follow-ups text).** `follow-ups.md:136` (SR-083's update, "FU-034 … stays a follow-up") now contradicts `:135` (SR-084, moved in). Mark `:136` superseded.
- **Checks:** `walkthrough.py --check` passes.
- **Decision:** `Pass` unchanged.

## Round 56 (narrow): SR-083, SR-082 narrowed, rows carry `openTarget`

- **Change reviewed** (commits `1911158acf`, `7c1f215eb8`; the user asked whether the server-built tree is worth it and told the designer to decide on the benefit).
  - **Stands from SR-082:** statuses by run ID (`RunStatusService`, `/ws/run-status`, `RUN_TREE_CHANGED`, the exact subscribe, the counted lifetime), the removal of the relay and the poll, and `openRunTarget`.
  - **Withdrawn:** `RunTreeView` and `runTree(run)`. The current endpoints and shapes stay, and every server-built row gains `openTarget` through one helper, `openTargetOf(row)`. A team's target is its coordinator, with no `members[0]` fallback.
  - The four client builders stay, but only display.
  - FU-034 returns to a follow-up, and rule 3 excepts statuses only.
- **Judgement: sound, and proportionate.**
  - Statuses by run ID remove the relay class of findings, which was the actual source of the defects.
  - The cross-view inconsistency (FU-031, FU-024) came from each client deciding what a row opens. A server-computed `openTarget`, through one helper, fixes that without a new API or a web rewrite.
  - Keeping base's row shapes keeps rule 3's characterization valid for rows.
  - The full server tree remains a cleaner end state, so it is right as a follow-up, not lost.
  - The review checks still hold: clients derive no target and no run facts, and every fact comes from the run or from server rows.
- **Note (bookkeeping).** `follow-ups.md:134` still says FU-024, FU-026, FU-031 and FU-034 are moved into this ticket and "not to be sent as separate Tasks". Update it so FU-034 is sent when the ticket leaves the team. Otherwise the deferred work is lost.
- Round 55's stale-wording note is applied (`:373`, `:434`, marked superseded).
- **Decision:** `Pass` unchanged.

## Round 55 (narrow): AR-028 answered, live tree changes for listed runs

- **Change reviewed** (commit `f9b9ef147f`).
  - `/ws/run-status` also carries `RUN_TREE_CHANGED { runId }` for a subscribed ID whose tree changed, fed by `ChildRowsFeed` for the run and every ancestor. The client subscribes to its listed runs and re-reads `runTree(run)` for an expanded run. There is a test.
  - Notes applied: an exact subscribe (`:250`); a lifetime counted by subscribers (`:251`); rule 3's acceptance for trees and statuses (`:270`).
- **AR-028: resolved.** Base's live re-read of a listed run's children is kept, by a push signal instead of a poll, from the one owner that knows each change.
- **Note 1 (stale text, superseded by SR-082).** These passages still describe statuses inside the view stream:
  - `:379`, `PeerChildObservation` caching statuses for the snapshot;
  - `:402`, SR-063's synchronous step reading "the observed statuses (`LocalChildObservation`'s cache)";
  - `:416`, the SR-044 row's "the rows and the statuses";
  - `:440`, the Team tab snapshot's step 1, "the rows and the statuses".

  Mark them superseded for statuses, or reword them to "rows", so the implementation doesn't keep a status read that SR-082 removes.
- **Note 2 (client).** On repeated `RUN_TREE_CHANGED` signals, apply only the newest `runTree(run)` answer: ignore a response that arrives after a later request was sent.
- **Decision:** `Pass`. The cumulative package (through SR-082) is ready for implementation.

## Round 54: SR-082, the run-tree view and statuses by run ID

- **Change reviewed** (commit `0e5fb9bfbf`; REQ-014 / AC-017; the user's decision of 2026-11-14; FU-024, FU-026, FU-031 and FU-034 folded in). This supersedes rule 1 for run trees and their statuses only.
  1. **`RunTreeView`:** one backend builder, with rows `{ key, parentKey, depth, kind, name, address, openTarget, statusIds, launch? }`. A team's target is its coordinator, with no `members[0]` fallback. Rows are delivered on the view stream (`RUN_TREE_SNAPSHOT`, then `RUN_TREE_CHANGED`) and by the query `runTree(run)` for listed runs that are not open.
  2. **`RunStatusService` plus `/ws/run-status`:** statuses by run ID, from each run itself. This removes the status relay, `LocalChildObservation`, the view's status frames, the Org correlation, the list poll `agentRunCollaborationStatuses` and the web's merging of relayed statuses.
  3. **Clients only display**, through one open path, `openRunTarget`. The four client builders are removed. Settings takes its rows and liveness from the run itself.
- **Judgement on the structure: sound, and simpler.**
  - It removes the shared cause of about ten findings: a delegated run's facts derived from its delegator. A status is a value of the run, so it comes from the run, by run ID, over one multiplexed connection. A row is built once, on the server.
  - Taking statuses out of the numbered view stream is right. A status is latest-value state, not an ordered event, so SR-063's synchronous status read and the relay's cache are no longer needed.
  - The review checks in item 4 (facts from the run, no client copies, one builder) are the right guard.
  - The user decided the scope; the design states the order of work and the reruns.
- **Not sound (AR-028, Design Impact): listed runs that are not open lose live tree changes.**
  - At base, the listed-run poll (`agentRunCollaborationStore.ts:208-245`, `refreshListedStatuses`) also re-read a listed run's view when its local children changed (`sameLocalChildren`) or its closed-set digest changed (autobyteus-435, -446).
  - SR-082 removes the poll, and reads `runTree(run)` only on expand or list load. So, under a listed expanded run that is running but not open, a new delegation, a closure or a reopen no longer shows until the user collapses and expands it, or reloads.
  - `ChildRowsFeed` already knows each change and the runs it concerns (X and its ancestors), so a small signal closes it. Let `/ws/run-status` also carry `RUN_TREE_CHANGED { runId }` for a subscribed run ID whose tree changed; the client re-reads `runTree(run)` for an expanded run. Or offer an equivalent that the design names.
  - **Needed:** name the mechanism, and add a test: a listed, expanded, not-open run gets a new delegated row without a reload.
- **Note 1 (subscription exactness).** `SUBSCRIBE` answers `RUN_STATUS_SNAPSHOT` and then changes. Read the current value and register the listener in one synchronous step, from the service's in-memory answer, so no change falls between them.
- **Note 2 (lifetime).** `RunStatusService` should hold an answer, and a peer observation, only while some connection subscribes to that ID (counted), and release the peer's `observe` with the last subscriber. Otherwise it grows with every run ever shown.
- **Note 3 (acceptance).** Rule 3's characterization at base no longer covers run trees and statuses. Item 5's tests are their acceptance now. Say so in rule 3.
- **Checks:** `walkthrough.py --check` passes.
- **Decision:** `Fail` (AR-028, Design Impact). The rest of SR-082 needs no change.

## Round 53 (narrow): SR-081, the old-name correction before step 2 (reverses ARCH-REV-011)

- **Change reviewed** (commit `7163160ece`; CRR-043 CR-461-081, F-63, live LE-O1). A delegated team's member that writes an address under its own delegated name (its `recipientAddress`, or that name itself) is corrected *before* address step 2, so the address is never delivered to the assigner's agent of the same name. That agent stays reachable by run ID. The model's `resolve`, the new O9, O7's text, contract §2.3 and the design's reach line are updated.
- **Evidence:** in the live run, a copy of an org's mounted `/squad` wrote `/squad/mate` and reached the *org's own* mounted mate, while the copy's own mate never started. That is a silent wrong delivery.
- **Judgement: sound, and my ARCH-REV-011 ruling was wrong for this case.**
  - I asked for the correction after step 2 so that it could never hide an assigner's agent. The only assigner agent it can hide is one at an address under the copy's own delegated name. That is exactly the case where the copy's member, writing its pre-TC-12 prefix, means its own teammate: at base, a hosted copy's members wrote that prefix for their teammates. So correction-first keeps base's intent, and the shadowed agent stays reachable by run ID.
  - The scope is unchanged: only team runs (`kind == "agent_team"`), and only when the remainder is one of the run's own agents, or the name itself.
  - A ruling holds across rounds unless new evidence answers it. This live failure is such evidence.
- **Checks:** `walkthrough.py --check` prints three "match" lines, and the validator finds 0 issues. No other state changed.
- **Decision:** `Pass` unchanged.

## Round 52: SR-079, every late predecessor

- **Change reviewed** (commit `b0e0da52cb`; CRR-036 CR-461-074 / F-53; DS-10, "Every late predecessor, not only the `FAILED` ones").
  - A predecessor can run after ours in two cases: when it is `FAILED` and retried, or when it is `NOT_RUN` behind a failed prerequisite.
  - Every earlier migration is classified as a writer, a reader, a rebuilder or none.
  - One definition, `PreservedItemsFollowUp(predecessor, steps)`, has one instance per writer and per reader. Its prerequisites are that predecessor and our main migration, and it waits on `FAILED` or `NOT_RUN`.
  - Ours preserves items only for readers, here 20261020.
  - A registry test requires the classification.
- **Verified on the branch** (`app-data-migration-registry.ts`):
  - the order is predecessors (`:80-167`), then our migration (`:90` of the excerpt), then `createDelegatedRunsPreservedItemsMigrations` (`:93`). So in one `runPending` pass, every predecessor that can run does so before any follow-up;
  - `AgentOrgFlatTeamFamiliesV1` follows `TokenUsageRunRecordsV1`, as cited;
  - F-53's evidence shows the late org tree keeping `taskExecutions`.

  The runner treats `NOT_RUN` as incomplete (`assertPrerequisites`), so the follow-up's wait follows from the runner.
- **Judgement: sound.** It generalizes AR-027's form to every way a predecessor can be late:
  - one parameterized definition instead of special cases;
  - a classification enforced by a test, so a new migration can't slip past it;
  - rebuilders correctly left alone.

  Late output is never half-converted (rule 7), and the main migration still has no hold.
- **Note 1 (classification coverage).** The search terms (`taskExecutions`, `taskAgent`, `hostRoot`, `collaboration_tree`, logs in `collaboration/`, history indexes) find list and field names. They don't find the **address and path shapes** 461 also changes: a delegated team's members rebased to `/` (step 4, TC-12), logs moved to a run's own folder (step 5b, TC-13), and the run folders. Three registered migrations work on exactly those:
  - `TeamAgentMemoryLayoutAppDataMigration` (member memory paths);
  - `TeamContextFileExecutionLocatorsV1AppDataMigration` (execution locators);
  - `TeamCommunicationProjectionAddressMigration` (message addresses).

  If one of them ran late, it could write old-prefixed addresses or old paths for a delegated team. Classify these three with that question asked explicitly, and add the address and path shapes to the search the test cites. The design already has the engineer confirm each classification against the code; this names what to look for.
- **Note 2 (stale text).** The paragraph after the section, "When a predecessor later finishes an item … the tree is not read … This migration is terminal by then … The residue is inert", now contradicts SR-078 and SR-079, which convert that output through the follow-ups. Update or remove it.
- **Checks:** `walkthrough.py --check` passes.
- **Decision:** `Pass` unchanged.

## Round 51 (narrow): CR-461-073, an unconvertible root's connect answers the reason

- **Change reviewed** (commit `958880cde0`; "A root its migration could not convert"). When the restore admission refuses, the view connect answers with the admission's own code and text (`TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED` / `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED`, or the org's counterparts, with base's restore texts) and closes. The first message keeps the reason for a run that passed admission.
- **Verified at `827f1e68dc`:**
  - the base web sent a stopped team's first message through `RestoreAgentTeamRun` (`agentTeamRunStore.ts:306`, the same line the designer cites at `3d738de6e6`), so the user saw the admission's reason on send;
  - no base web code reads `TEAM_NOT_FOUND` (the only matches are outside `stores` and `services`).
- **Judgement: sound.** SR-078's two answers could not both be reached: a connect closed with `TEAM_NOT_FOUND` leaves no first message to carry the reason. With the stopped run's view as its stream (SR-045 / SR-046), the connect is where the base user's "reason on send" now appears. The code and text are base's, and no schema text reaches the user. A connect that closes is base's behavior for a refused view.
- **Note (citation):** cite the ticket's base `827f1e68dc` (`agentTeamRunStore.ts:306`) rather than `3d738de6e6`, which is not this ticket's base.
- **Decision:** `Pass` unchanged.

## Round 50 (narrow): AR-027 answered, a follow-up migration

- **Change reviewed** (commit `6e777ed697`; DS-10, "After the predecessor finishes the item: a follow-up migration"). `ensureRunHistoryRow` is withdrawn. `20261114_delegated_runs_preserved_items_v1`:
  - `requiredOnStartup`, with no `holdsBackCapabilities`;
  - its prerequisites are our main migration and 20261017, 20261018 and 20261019, and it is registered after them;
  - while one is `FAILED`, it waits and startup continues;
  - in the start where they succeed, it applies steps 4, 5b and 8 to each `PRESERVED_UNFINISHED_PREDECESSOR` item, with our migration's builders, idempotently, and then it is terminal.
- **AR-027: resolved.** The runtime reads only the target again, and the runner's own retry does the late work. Adding steps 4 and 5b improves on my rows-only proposal: without them, a finished item's own file would keep the pre-target shape.
- **Note (not blocking; the designer's call): the follow-up waits for all three predecessors together.** The runner's prerequisite check is per migration, not per item (`assertPrerequisites`, `:144-157`). If one predecessor stays `FAILED` for an unrelated item (for example, 20261018 with one JSON log it can never convert), the copies whose own predecessor, say 20261017, has finished are never converted. That leaves REQ-011's promise unmet for them, although their data is whole. Two ways out:
  - one follow-up per predecessor, each with only its own predecessor and our main migration as prerequisites, each handling the preserved items that predecessor left;
  - or state the coupling as accepted, with its reason.
- **Decision:** `Pass`. The cumulative package (through SR-078 as revised) is ready for implementation.

## Round 49 (narrow): SR-078, a preserved copy's history row; an unconvertible root

- **Change reviewed** (commit `d4f448b161`; CRR-033 CR-461-068 / F-49, CR-461-069 / F-51):
  - (a) before the predecessor's retry, a preserved copy's Settings save answers base's `INTERNAL_ERROR`;
  - (b) after the retry writes the copy's own file, a runtime owner, `ensureRunHistoryRow(run)`, writes the copy's history row with step 8's builder the first time a listed operation needs it: its Settings save or read, its open, or its listing through its delegator's rows or its Task page;
  - the new section "A root its migration could not convert".
- **CR-461-069: sound.** The view connect asks base's restore admission before it parses, and answers `TEAM_NOT_FOUND` as base did (`agent-team-stream-handler.ts:247`). The first message, now the restore, answers the admission's reason codes. No schema error reaches the user (rule 7). (a) is also sound.
- **Not sound (AR-027, Design Impact): (b) puts a migration's residue repair into the runtime.**
  - **Concrete problems:**
    1. **The triggers are a list, and the list is incomplete.** A preserved copy that is top-level (its delegator deleted, DS-13 / T-8) is absent from the run list (DS-11) until someone opens it from its Task page. Archive, delete, token totals and the history read are not triggers either. Every later operation on a run must remember to call `ensureRunHistoryRow`, so runtime code permanently carries "a run may lack its row".
    2. **It contradicts DS-10's own boundary and the guideline.** DS-10 checklist item 6 says "current code reads only the target". Guideline §7, "Correcting a released migration", says: "If successful installations need another persisted transformation, decide that as a separate new migration." Writing a history row is a persisted transformation, and the guideline's "checks for a specific requested read, write or import" are checks, not writes.
  - **The runner already supports the guideline's form, without a hold on usability.** I checked the branch's `app-data-migration-runner.ts`:
    - `assertPrerequisites` (`:144-157`) throws `AppDataMigrationPrerequisiteError` while a prerequisite is not a success;
    - `runPending` (`:80-100`) catches it, reports it in the status, and continues with startup;
    - capability readiness counts only `holdsBackCapabilities` (`:63-78`).

    So a second, small migration works: requiredOnStartup, no `holdsBackCapabilities`, its prerequisites the predecessors that can leave preserved copies, and itself registered after them.
    - While a predecessor is `FAILED`, it waits, and the app stays fully usable. 461's main migration keeps converting every Task entry with no hold, as SR-021 decided.
    - At the start where the predecessor finishes, the follow-up runs in the same `runPending` pass. It writes the missing rows with step 8's builder, idempotently, and becomes terminal.
    - The runtime then reads only the target: a run has its row, or it is a copy still preserved and answered as base answers a run with no own file.

    This is not the "prerequisite hold" of AR-005 (round 2): that hold would have stopped Task conversion. This one holds only the late rows, which nothing else needs.
  - **Needed:** replace `ensureRunHistoryRow` with the follow-up migration, or give a concrete reason it cannot be done. Keep (a). Tests:
    - with the predecessor `FAILED`, the follow-up is reported as waiting and the node is usable;
    - after the predecessor finishes, the copy is listed (top-level or nested) and its Settings save succeeds, in that same start;
    - a later start changes nothing.
- **Decision:** `Fail` (AR-027, Design Impact). CR-461-069 and (a) need no change.

## Round 48 (narrow): SR-074, one in-view rule for the Team tab

- **Change reviewed** (commit `a683a21b90`; CRR-025 CR-461-056).
  - The read and the live path use one rule, base's `isMessageOfView(message, own(X), tree(X))`: both agents in `tree(X)`, or one in `own(X)`. Here `tree(X)` is `own(X)` plus the agents of X's open subtree.
  - The read composes the logs of X and of its *open* subtree, correcting SR-072's "open or closed".
  - Adopted from code review: CR-461-051's unreadable-record check runs before the root loads.
- **Verified at `827f1e68dc`.** `run-history/store/task-agent-message-logs.ts:133-147` (`isMessageOfView`, with DEC-001's own-agent clause) and its `composeMessageLogs`, documented as "its own log and its open delegated runs' logs".
- **Judgement: sound.** It is base's rule, with the open subtree in place of the open hosted tree, applied the same way to the read and to the live path, so the two can no longer disagree. A closed run's messages with X's own agents stay through X's own log, as at base. Moving the record check before the root loads follows ARCH-REV-044's placement.
- **Note (not blocking): one tree per snapshot.** Bind the snapshot's log filter to the `tree(X)` read in SR-063's synchronous step, the same set as the snapshot's rows, not to the tree at the time of the async log read. A row that closes during the read then leaves through its own frame after the snapshot, and the rows and the messages describe the same moment.
- **Decision:** `Pass` unchanged.

## Round 47 (narrow): AR-026 answered, the log read after the base

- **Change reviewed** (commit `fc02c0b46a`; "The Team tab's messages" → "The snapshot"). The snapshot now runs in three steps:
  1. one synchronous step: the base, the rows and the statuses;
  2. the async log read, behind the queue;
  3. the queued message frames, numbered after the base, with "a frame whose message ID is already in the read … dropped".

  The test now covers a message committed during the read, and `:315`'s wording is fixed.
- **AR-026: resolved.** The order now matches base's snapshot connection, and the reason (rows are not deduplicated, messages are) is stated.
- **Note (must be honored in implementation): "dropped" must not drop a numbered frame.** `RunViewStream` numbers every frame of the view once, for all its connections. A queued frame already has its number when it is queued. If the server drops it for one connection, that connection sees a gap and reopens (`advanceSequencedStream`). Base never dropped from its queue: it delivered every queued event, and the client ignores a repeated message ID while still advancing the sequence:
  - `collaborationParticipantMessages.ts:44-45, 101` deduplicate by message ID;
  - `teamExecutionViewState.ts:432-440` advances `changeSequence` on every `TEAM_COMMUNICATION_MESSAGE`.

  So deliver every queued frame, and let the client's existing dedupe drop the repeat. The design's test ("exactly once … with no reopen") would catch an implementation that drops. Change the word in the design.
- **Decision:** `Pass`. The cumulative package (through SR-072) is ready for implementation.

## Round 46: SR-072, the Team tab's messages, and CR-461-055's decisions

- **Change reviewed** (commit `7f3bd40a41`; CRR-024 CR-461-054 / F-26, CR-461-055).
  - **The Team tab:** the view of X composes X's log and the log of every run in `subtreeOf(X)` with base's `composeMessageLogs`.
    - Live messages come through a node-level `RunMessagesFeed`, published at the receiver's commit and numbered by each open `RunViewStream` whose set contains either run. They move `lastMessageChangeSequence`.
    - Snapshot: "the logs are read before the synchronous base step. A message published during that read is queued … and delivered after the snapshot, unless its message ID is already in it."
    - Accepted difference: a refused message is never written.
  - **F-23 … K-13:** decided as listed in SR-072.
- **Judgement on the composition: sound.** It is base's composition over the subtree instead of the hosted tree. Rows at every depth show messages at every depth, and one feed published at the receiver's commit keeps each message single. The accepted difference follows from the order "the receiver checks before writing", and it is asserted by a test.
- **Judgement on the decisions: sound.**
  - **F-23:** a DONE Task is not reopened by a message (REQ-003 covers open Tasks), and the base text was an artifact of release.
  - **F-24:** follows REQ-009.
  - **F-27:** follows AR-016.
  - **F-30:** "works" includes idle, as the model reads it.
  - **F-36:** follows TC-12 option 1.
  - **F-31** (inheritance from the immediate delegator) is a behavior change. It follows from "each run owns its configuration" (REQ-002, P6), and the user is informed. I raise no finding on it. If the user objects, it is theirs to reverse.
- **Not sound as written (AR-026, Design Impact): the order of the snapshot's log read.** SR-063 reads the base, the rows and the statuses in one synchronous step, and then captures the run's own parts behind base's queue. Base's queue (`root-event-publisher.ts:82-116`) holds events numbered *after* the base. SR-072 reads the logs *before* that step:
  - A message committed after its log was read but before the base step is numbered at or below the base, which is before it. It is not in the snapshot and not among the frames after it, so it is lost from the open view until a reload.
  - If instead the queue opens when the read starts, its frames carry numbers at or below the base. Base's clients then see a sequence gap or a repeat, and reopen (`advanceSequencedStream`).
  - Rows needed the read *at* the base, because base's Team client does not deduplicate a started row. Messages are different: base deduplicates them by message ID, which the design relies on. So the logs belong *after* the synchronous step, like the run's own parts: base, rows and statuses in one step; then the async log read behind the queue; then the queued message frames, numbered after the base, with any already in the read deduplicated by message ID.
  - **Needed:** state this order in "The snapshot" bullet, and change the test "a message published during a snapshot appears once" to cover a message committed during the log read.
- **Note (wording):** the sequencing test at `design-spec.md:315` still says `lastMessageChangeSequence` "moves only with the run's own message events". `:309` now counts the composed messages.
- **Checks:** `walkthrough.py --check` prints three "match" lines (49 states), and the validator finds 0 issues.
- **Decision:** `Fail` (AR-026, Design Impact). The rest of SR-072 needs no change.

## Round 45 (narrow): SR-071, refusals in base's order, codes and texts

- **Change reviewed** (commit `cff8db5358`; CRR-021 CR-461-045 / F-18, CR-461-046 / F-19):
  1. The order is R-6, then R-8, then R-7. A receiver whose Tasks are all closed gets `TASK_AGENT_RESOURCE_CLOSED`, whoever sends; only after that does a run of a different open Task get `TASK_AGENT_RESOURCE_CONFLICT`.
  2. New R-12: a team run's ID as `target_agent_run_id` gets `TARGET_IS_TEAM_RUN` with the coordinator's run ID, before R-9 / R-11.
  3. `delegate_task` refusals keep base's texts.

  The contract §2.2, the model's `_admit`, S20, the new U9 and U10 and DS-2 are updated.
- **Verified at `827f1e68dc`:**
  - `reactivateClosedTarget` (`task/root-task-execution-lifecycle.ts:306-313`) answers a closed target before delivery;
  - `global-agent-run-message-router.ts:89-97` gives `TARGET_IS_TEAM_RUN` with base's text before `TARGET_AGENT_RUN_NOT_ACTIVE`;
  - `existing-copy-target.ts:13` has the `delegate_task` text.

  The model's `_admit` puts the closed check before the Task-scope check, and answers a stored team run's ID with its entry agent.
- **Judgement: sound.**
  - The closed answer comes first, which is also the more useful order: a receiver with no open Task has no Task scope to conflict with.
  - R-12 answers "whether the team runs or not". Base only found active teams, but at base a hosted team shared its sender's root, so a running sender never met a stopped copy team. Since a message now restores a stopped team (DS-2), pointing to the coordinator is the base-equivalent answer.
  - The design takes a peer team's coordinator from its index entry. The model checks only local files, which is consistent, because the model has no peer case for R-12.
- **Checks:** `walkthrough.py --check` prints three "match" lines (45 states), and the validator finds 0 issues.
- **Decision:** `Pass` unchanged.

## Round 44 (narrow): SR-070, DS-15 and the closed-Task input fence (G-4)

- **Change reviewed** (commit `2211bec711`). New spine DS-15, the user's message to a delegated run (agent, team member, peer). G-4: a delegated run's own root again refuses input when the run has Task entries and none is open, with base's `TASK_AGENT_RESOURCE_CLOSED` text. The check runs in the root's gate, before restoring. A run no Task names is not fenced. The fence covers user input, application input and restart resume. The assigner's R-6 reopens through DS-2 first, and a peer run fences on its own node.
- **Verified:**
  - At `827f1e68dc` the host root's `assertExecutionInputAllowed` → `taskExecutions.assertInputAllowed` (`standalone-agent-run-root.ts:240-243`) fenced every input to a hosted copy.
  - The branch's `currentTaskOf` (`delegation-index.ts:247-251`) is "the newest open entry, else the newest entry". So "its current entry is closed" means "no open entry", which is 469's closed set and holds for a run on several Tasks.
- **Judgement: sound.** It restores a base guarantee that hosting gave for free, and REQ-005 needs it now that a closed run is reachable from its Task's page. The fence belongs to the run's own root, so it holds for every input path, not only the web's.
- **Note (not blocking): "not restored" should include the root.** On the agent path the fence sits in `postToHost`, after `AgentRunCommandCoordinator` resolves the root. If a fully stopped run's root is restored and registered before the refusal, then `ActiveCollaborationRootDirectory` reports it active for a moment. That flickers the run list's and the delegator view's status (rule 1, `LocalChildObservation`), and binds open streams (SR-064). Check before the root is resolved, or make DS-15's test assert that no registration change and no status frame occur on a refused message.
- **Decision:** `Pass` unchanged.

## Round 43 (narrow): SR-069, a peer row's `@` mentions

- **Change reviewed** (commit `972ba9fef4`; code review CRR-017 CR-461-035): a peer run takes no `@` mentions, as at base. The branch's `REMOTE_RUN_MENTIONS_UNSUPPORTED` refusal stays as a guard, with a characterization test.
- **Verified at `827f1e68dc`:**
  - the web gives a run on another node no mention scope (`composables/agentInput/useComposerTarget.ts:68-69`, autobyteus-278);
  - the server's `resolveCollaboratorMentions` refuses an agent that is not in the root's index (`root-team-run.ts:292-298`), so a peer agent got `RUN_NOT_FOUND`.

  The branch guard is `PEER_MENTIONS_REFUSAL` (`peer-runs.ts:55`).
- **Judgement: sound.** No behavior changes, and the web never offers `@` there. A note composed on this node would name addresses resolved in this node's spaces, which the peer run cannot reach. The guard makes base's accidental refusal explicit. Rule 3 holds, because the web receives nothing different.
- **Decision:** `Pass` unchanged.

## Round 42 (narrow): SR-068, `hasCollaboration` returns

- **Change reviewed** (commit `bed9dcc7ac`; "The frontend contract" item table). `hasCollaboration` returns on the agent run history item, read from the stored row, as at base. The rest of the engineer's codegen list is confirmed:
  - the org's `closed_task_executions` and `agentRunCollaborationStatuses` return;
  - `isTaskTeam` / `startedByAgentName` stay removed;
  - `hostRoot` → `delegatingRun`;
  - the standalone member file-change and trace queries stay removed under rule 2.
- **Verified at `827f1e68dc`:** the base web gates a listed agent run's stored rows on the flag (`AgentRunTaskRows.vue:62-64`, `ensureStoredView(runId, hasCollaboration)`; `composables/mobile/useMobileRunTree.ts:61`; `RunListRow.vue:105`). Contract §3.5 (`:318`) keeps the stored flag, set by the first delegation.
- **Judgement: sound.** SR-061's "stay removed" contradicted the contract and rule 3, and returning the flag is the rule-1 answer. A run whose delegated runs all closed keeps the flag and loads an empty stored view, as at base.
- **Note (not blocking): rule 2 and the panels.** The branch web still has `GetAgentRunCollaborationMemberFileChanges(hostRunId, memberAddress, agentRunId)` (`collaboratorQueries.ts:66`) and `GetAgentRunCollaborationMemberEventMonitorActiveTracePage` (`runHistoryQueries.ts:236`). With the server queries removed, rule 2's web change must cover the file-change and trace panels of a delegated row. They should read:
  - for an agent child, by its own run ID (`GetRunFileChanges`, `GetRunEventMonitorActiveTracePage`);
  - for a delegated team's member, through its own team's member queries, with the child team's run ID, never the delegator's.

  Name this in "What the web still changes", item 2, and delete the two web queries.
- **Decision:** `Pass` unchanged.

## Round 41: SR-067, every data-flow spine walked for every case

- **Change reviewed** (commit `d3d7929755`, at the user's instruction).
  - `evidence/spine-validation/spine-walk-2026-11-12.md` walks 19 spines (DS-1 … DS-14, with DS-8 in six parts). Each step names its owner and its file, across the delegator's kind, the delegated run's kind, the node, and each run's state.
  - The spine list gains DS-12 Settings, DS-13 Archive/delete and DS-14 peer-started.
  - Three gaps were found and answered:
    - **G-1:** the archive/delete guard now asks a peer run's `status()`.
    - **G-2:** `DelegationIndex.runDeleted`; the model gains S26 and S27 (T-5, T-8, R-11).
    - **G-3:** an agent stream binds to the current root at connect.
  - Stale text is corrected, and AC-008 is extended.
- **Judgement: sound.** The walk is the validation the view contract lacked before SR-061, and it found real gaps.
  - **G-1** follows from REQ-007 with REQ-013. Treating an unreachable node as not blocking, and naming that run in the result, is the right trade: otherwise the run could never be deleted. The guard checks one hop, which is correct, because a delete only changes its direct children's parent.
  - **G-2** is the most important of the three. Without it, a deleted run's agents stayed reachable by address step 2, listed in the `@` note and `list_available_agents`, and a message to one went to a run with no files. The rule (the entries stay as the record, and the tree skips a run that is not stored) is applied by both the model's tree build and `delete_run`. It holds at startup too (DS-13, "a restart keeps all of this").
  - **G-3** completes SR-064, matching base's connect-time bind (`agent-stream-handler.ts:154-155`).
  - Keeping the tree on archive matches base, where the copies were hidden with their host.
- **Note (not blocking): the window in a delete.** DS-13 calls `runDeleted(X)` after X's files are gone. A message or step-2 resolution in between still finds X in the tree, and `resolveOrRestore` then meets a run with no files. Either tell the index first (a failed file removal is corrected by the next startup build, which reads the stored runs), or have a restore of a run with no files answer R-11's `TARGET_AGENT_RUN_NOT_ACTIVE` rather than an internal error.
- **Checks:** `walkthrough.py --check` prints three "match" lines (43 states), and `validate_contract_examples.py` finds 0 issues.
- **Decision:** `Pass` unchanged.

## Round 40: SR-066, a peer child reached by its own identity

- **Change reviewed** (commits `716367c9a3`, `40fc728d2d`; the user's direction of 2026-11-12, relayed by this reviewer):
  - **Requirements:** REQ-013 and AC-016. They were approved within the user's explicit direction, and the user was informed.
  - **`PeerAgentRun` / `PeerTeamRun`:** stateless handles, built from the tree's `PeerRunLink` and the process channel, with `terminate`, `postMessage`, `interrupt`, `readConversation` and `observe`. `peerRunOf(runId)` finds one through the `DelegationIndex`, without a root.
  - **Stop:** one path, the standard terminate by run ID. `stopDelegatedExecution`, `PeerChildStop` and `DelegatedLaunchSelectionService` are removed.
  - **Commands and conversation:** the web keeps base's shapes, and the server calls the handle.
  - **`PeerChildObservation`** is owned by `RunViewStream`. It numbers the observed frames in the view's sequence and caches statuses for the synchronous snapshot step.
  - **What stays in the roots:** the agents' own collaboration with peer runs.
- **Verified:**
  - At `827f1e68dc` the channel is per process (`remote-run-channel.ts:125`), and a command is `ownerCommand(nodeId, targetRoot, agentRunId, command)` (`:106`). Node B admits an owner command by the run's back-link (`remote-run-links.ts:57, 144`). The delegator's root was needed only to look up the link, so removing it from the route needs no protocol change.
  - On the branch, the roots' `RemoteRunLinks` are already built from the index (`peerRunLinksOf(root, delegationIndex)`, `agent-org-run.ts:86`, `remote-run-links.ts:64-67`). The handles and the agents' own peer collaboration therefore read the same link facts from one owner.
- **Judgement: sound, and simpler.**
  - Rule 2 now holds for every delegated run. Stop has one path, and the delegator-based user routes and the three roots' remote branches go.
  - The handles are honest: there is no shared base class with the local run, because a peer run lacks tool approval and Settings and has a "Couldn't reach" failure the local run doesn't.
  - Keeping the agents' own peer collaboration in the roots is correct. It belongs to the root's operation (sends, reports, delegation), not to the user's reach.
  - REQ-013 is not a regression fix: base also refused when the delegator was stopped. It is needed because this ticket makes a stopped delegator with working children normal.
- **Notes (not blocking):**
  1. **One observation per peer run, shared.** With rows at every depth, a peer row shows in X's view and in its ancestors' open views. If each `RunViewStream` opens its own `observe`, node B serves one stream per open view for the same run, where base opened one per hosting root. Let `PeerChildObservation` hold one observation per peer run, counted by the views that use it, with each view numbering the frames in its own sequence. Do the same in `LocalChildObservation` if it is not shared already.
  2. **One builder of the link.** `peerRunOf` and the roots' `RemoteRunLinks` should both use `peerRunLinksOf`, the one builder of `PeerRunLink` from the index, so the facts cannot drift apart.
- **Checks:** `walkthrough.py --check` passes.
- **Decision:** `Pass` unchanged.

## Round 39: SR-064 and SR-065, rule 2's open parts (IR-013)

- **Change reviewed** (commits `c585770866`, `ae63786f6a`):
  - **SR-064, an agent run's own stream follows its run.** An open session binds when the run becomes active, whoever restored it. The trigger is `ActiveCollaborationRootDirectory.onRegistrationChanged`, or the root's ready-host hook. The binding happens once the `AgentRun` is ready and before anything is posted to it. The session unbinds on stop and stays open, and binding is idempotent.
  - **SR-064, a child's Settings save** is composed by the editor from each run's own stopped-run save. SR-039's behavior is kept: check first, apply in row order, report a partial failure. The server composition is removed.
  - **SR-065, a peer child keeps base's route.** Its Stop is `stopDelegatedExecution` narrowed to peer rows (`PeerChildStop`). A local reference gives `NOT_FOUND`, and a stopped delegator gives `ROOT_NOT_ACTIVE`. Each local child's model options come from its own queries. `delegatedLaunchModelOptions`, `updateDelegatedLaunchSelections` and `DelegatedChildLaunches` are removed.
- **Verified at `827f1e68dc`:**
  - `agent-stream-handler.ts:154-155` binds at connect only if the run is already active, and `:381` binds on the session's own send (`onActiveRunReady`).
  - `standalone-root-message-delivery.ts:75` has the ready-host hook (`onHostReady`).
  - `stopRemoteChild` (`remote-child-commands.ts:59`) is the remote branch of the team and org roots' Stop.
- **Judgement: sound.**
  1. The stream rule is the one the team and org sessions already follow (SR-046), applied to the agent stream. A restore by someone else is new, and it is a consequence of this ticket, so the rule belongs here. Rejecting a timing-dependent web reconnect is right, and the bind-before-post invariant has a test.
  2. The Settings save composed from each run's own save follows rule 2. The editor only iterates rows the server gives it, so it makes no relationship decisions. Each run's own `RUN_ACTIVE` refusal keeps the race safe.
  3. For a peer child, "unchanged" is the requirement (BEH-008, and the out-of-scope remote steps). This node has no path to a peer run except its delegator's link, so keeping base's route is correct. The cases a stopped delegator refuses match base.
- **Notes (not blocking):**
  1. **Keep the peer child's commands too.** "A child on a peer node keeps base's route" names the conversation, the summary and Stop. A peer child's message and interrupt also go through the delegator's root: `executeRemoteChildCommand`, team `root-team-run.ts:319` and org `agent-org-run.ts:349` on the branch. Name that branch as kept, so removing `DelegatedRunCommands` does not take it.
  2. **Line references:** `stopRemoteChild` is at `remote-child-commands.ts:59` at base (the design says `:54`), and the ready-host hook is `onHostReady` (`:75`).
  3. **One binding source.** The design lets the implementation choose between the registration event and the ready-host hook. Pick one, so a bind is not attempted twice, even though binding is idempotent.
- **Checks:** `walkthrough.py --check` passes.
- **Decision:** `Pass` unchanged.

## Round 38: SR-063, `RunViewStream` is base's publisher moved out of the root (answers AR-025)

- **Change reviewed** (commit `e9b75a20f9`; "The view's sequence"). `RunViewStream` is base's `RootEventPublisher`, with all its duties:
  - `liveSequenceId`, one per instance and lasting as long as the process, so a stop and a restore share it and a server restart starts another;
  - `lastMessageChangeSequence`, counting the run's own message events only;
  - the snapshot connection, made exact by option (i). In one synchronous step it reads the base, the tree's rows and the observed statuses from memory. Then it captures the run's own parts as base did: a live root's in its gate with base's queue, a stopped run's from its files.

  The SR-044 row is corrected, and tests are added.
- **Verified against base.** `RootTeamRun.openPackageSnapshotConnection` (`root-team-run.ts:401-407`) calls `openSnapshotConnection(() => persistence.readConsistent(...))`. That is: read the base synchronously, then capture with the queue. The run's own parts are captured exactly as at base.
  - The tree's rows and statuses are now read in the same synchronous step as the base. Every row or status frame numbered after it is a change the snapshot does not hold.
  - Base's Team client, which does not deduplicate started rows, therefore receives each row once.
- **AR-025: resolved.** All three duties move with the sequence. `liveSequenceId` has the sequence's new lifetime, so the web's participant positions stay keyed as at base. AR-024 is fully resolved.
- **Note (wording).** DS-8's "Switching modes" (`design-spec.md:302`) still says a mode switch sends "a fresh snapshot … a new base for the team stream's `change_sequence`". Under SR-062/063 (`:229`), a switch is "ordinary frames in the same sequence, with no new base". Say instead that the in-band live snapshot, if one is still sent, is taken through the same snapshot connection at the current view sequence, under the same `liveSequenceId`. `:231` ("What this replaces") could also say the hold now lives in the snapshot connection.
- **Checks:** `walkthrough.py --check` passes, and `validate_contract_examples.py` finds 0 issues.
- **Decision:** `Pass`. The cumulative package (SR-060 … SR-063) is ready for implementation.

## Round 37: SR-062, one view sequence per run (answers AR-024)

- **Change reviewed** (commit `1887ba822a`; "The frontend contract" → "The view's sequence"):
  - `RunViewStream`, one per run, comes from the composition root's view stream registry. It numbers every frame of the run's view in one order: the run's own events, which the live root hands over; `ChildRowsFeed`'s row events; and `LocalChildObservation`'s status events.
  - Snapshots carry the base, and a stored/live switch stays in the same sequence.
  - A checkpoint answers the view's sequence and the run's own open work.
  - SR-044's hold and idempotence are "replaced".
- **AR-024: resolved in substance.**
  - The designer's reason for rejecting my option (a) is right. At base, `hydrateTeamRunContextForStreamRecovery` (`teamRunContextHydrationService.ts:358-372`) brackets the hydration between two checkpoints and resumes at `before.changeSequence`. The sequence must therefore be the run's, shared by its stream and its checkpoint, not a connection's.
  - One numbering owner per run that outlives the root is the right structure. Base clients then take the row events unchanged.
  - A child's status frame now moves the sequence, so a recovery that spans one asks the user to select again (`…CHECKPOINT_CHANGED`). That is no worse than base, where a hosted copy's every frame moved the root's sequence.
- **Not sound as written (AR-025, Design Impact): what moves with the numbering.** At `827f1e68dc` the root's sequence owner is `RootEventPublisher` (`root-event-publisher.ts`). It does three more things, and the web depends on each of them:
  1. **The snapshot barrier** (`openSnapshotConnection`, `:82-116`). The base is taken, events published while `capture()` runs are queued, and on subscribe they are delivered after the snapshot. At base this was exact, because a root's own changes run in its gate, so nothing in the snapshot changed during capture.

     The tree's row and status events do not run in any root's gate. A row change during an async capture (a stored snapshot reads files) can therefore be both in the snapshot and in the frames after its base. Base's Team client does not deduplicate `TASK_EXECUTION_STARTED` (`teamExecutionViewState.ts:385-393`: it inserts every started entry), so the row appears twice.

     SR-062 says SR-044's hold and idempotence are "replaced" because "a numbered stream already gives the frames after the snapshot". That is true only if the snapshot is read at exactly its base.
  2. **`liveSequenceId`** (`:40`, "a stop/resume or a restart starts another"). The web's participant message store keys its position by run, `liveSequenceId` and sequence (`collaborationParticipantMessages.ts:19-23`; `TeamStreamingService.ts:321, 354`; `agentRunCollaborationStreamingService.ts:246`; `agentOrgStreamingService.ts:350`). A sequence that now spans stop and restore needs an ID with the same lifetime, owned by `RunViewStream`, not by the root.
  3. **`lastMessageChangeSequence`** (`:43, 67`), carried by the snapshot and the history read (`team-run-history-service.ts:92`). It must stay in the view's numbers, counting the run's own message events only.
- **Needed:** state that `RunViewStream` is base's `RootEventPublisher` moved out of the root, with its `liveSequenceId` (one per stream instance), its `lastMessageChangeSequence` and its snapshot connection. Then decide how a snapshot stays exact for events from outside the root. Either:
  - (i) the capture's async reads complete first, and the base, the tree's rows and the observed statuses are read in one synchronous step, so no outside frame falls inside a capture; or
  - (ii) keep the idempotent application of started, closed and reopened in the three clients. That is SR-061's third web change, kept.

  Correct the SR-044 row and add a test of a row change during an async stored capture.
- **Checks:** `walkthrough.py --check` passes.
- **Decision:** `Fail` (AR-025, Design Impact). AR-024 is resolved by the per-run sequence, apart from these three points.

## Round 36: SR-061, the frontend contract in base's shapes

- **Change reviewed** (commit `0b161817f0`; the user's direction of 2026-11-12; the design's "The frontend contract", before DS-8; contract §4):
  - rule 1: the views and lists get base's shapes, built from each run's `CollaborationTree`;
  - rule 2: a delegated run is reached through its own standard path, by its run ID;
  - rule 3: a per-story characterization at `827f1e68dc` of what the web receives is the acceptance check;
  - every earlier web-facing item is decided: stays, goes or returns;
  - the web keeps three changes;
  - the renames `DelegationIndex` and `CollaborationTree`.
- **Judgement: the direction is right.**
  - Rule 2 removes a whole class of relay code: `DelegatedRunCommands`, the child acknowledgement, and the child `@` handling. That code existed only because a copy used to be hosted. A child is an ordinary run, so reaching it by its own path is the simpler model.
  - Rule 1 with rule 3 fixes the view contract that SR-039 … SR-059 kept changing. It puts the web back on base's tested row builders, which already nested copies of copies.
  - The item table is complete against the SR history.
  - The names say what each thing is: an index of runs, and a tree per run.
- **Not sound in one place (AR-024, Design Impact): how base's sequenced events are delivered.**
  - **Base:** the three clients take `task_execution_started` / `TASK_EXECUTION_STARTED`, `task_executions_closed` and `task_executions_reopened` *inside* the root's sequenced stream. The root numbered them in its own `change_sequence`.
  - **Base web:** each client calls `advanceSequencedStream`, and a gap or an unnumbered frame forces a reopen:
    - `agentRunCollaborationContext.ts:158-161`;
    - `agentOrgExecutionContext.ts:232-235`;
    - `teamExecutionViewState.ts:371`.

    The agent-run client also reopens on a `task_executions_closed` that names a row it does not hold (`:173-180`).
  - **SR-061** returns those events "in base's shapes", which carry `change_sequence`, and keeps SR-044 "applied to base's events". But SR-044 makes the row events *unsequenced* (DS-8, `design-spec.md:330`: "The event carries no `change_sequence` … does not advance or check its `changeSequence`"). It did so for a concrete reason: the tree, not the delegator's root, produces them, and a stopped delegator has no root to number them.
  - **The two cannot both hold with base's web.** If the events are numbered, nothing says who numbers them: the live root's own events and the tree's row events interleave on one connection, and the session of a stopped run (SR-045 / SR-046) has no root. If they are unnumbered, every base client needs a change to accept them outside its sequence and to apply closed and reopened idempotently. That is a fourth web change in three clients, beyond "the Team client's `TASK_EXECUTION_STARTED` is idempotent". Rule 3's equality would then not hold for those frames.
  - The checkpoint reads (`getTeamRunExecutionCheckpoint`, `getAgentOrgExecutionCheckpoint`: `changeSequence`, `hasOpenExecutionWork`) belong to the same question: whose sequence, and whose open work, now that the copies are not in the root.
  - **Needed:** decide one, and state it in "The frontend contract" with its tests. For example:
    - (a) the stream session numbers every frame it sends on a connection from its snapshot's base, root events and tree events alike, so base's checks hold unchanged in live and stored mode, and the checkpoint answers in the same terms;
    - (b) the row events stay unsequenced, and the section lists the client changes in all three clients and the closed and reopened idempotence, with rule 3's exception for those frames.

    (a) keeps the web on base and fits the session's existing ownership of the hold and the mode-switch snapshots. The choice is the designer's.
- **Checks:** `walkthrough.py --check` passes, and `validate_contract_examples.py` finds 0 issues.
- **Decision:** `Fail` (AR-024, Design Impact). Everything else in SR-061 is sound and needs no change.

## Round 35: SR-060, one delegation tree per top run, and each run's collaboration map

- **Change reviewed** (commit `4e43b030ae`; the user's direction of 2026-11-12):
  - contract §4: the `DelegationTree` becomes a forest, one tree per run the user started, with `byAgentRunId` and `byRunId`;
  - `RunCollaborationMap` (`mapOf(run)`, derived, never stored) answers every cross-run question: reach in one enumeration, the addresses in use, the sender address, the rows, the collaboration context, `canMessage`, and the subtree;
  - the five separate owners fold into it: `CrossRunAddressResolution` keeps only the message route, and `ReachableAgents`, `RunCollaborationContext` and the separate row sources go;
  - the design adds a method-by-method inventory of the three base indexes;
  - `model.py` gives each node its `tree`.
- **Verified:**
  - **The inventory is complete.** Every public method of `standalone-root-execution-index.ts`, `team-execution-index.ts` and `agent-org-execution-index.ts` at `827f1e68dc` falls in a row of the table: lookups, copies and their chain, navigation, reach and CM-1, physical scope and memory placement. The table splits them correctly: a run's own parts stay with its own index, and only the cross-run part moves.
  - **`byAgentRunId` adds no new I/O.** It is the branch's existing `runOfAgent`: a lookup filled from each run's file, read once, and re-read on a miss (`delegation-tree.ts:292`).
  - **The model change** is a label derived by walking up the edges. `walkthrough.py --check` prints three "match" lines, and `validate_contract_examples.py` finds 0 issues.
- **Judgement: sound, and an improvement.**
  - It removes the cause of the recent findings, not only their symptoms. Five owners each re-derived part of one picture, a run's place among the other runs, and their details disagreed (ARCH-REV-034's two notes were such disagreements). One derived owner per run is Principle 11's "one picture, one builder".
  - It does not bring back hosting: the map holds no run's life and stores nothing.
  - The map answers eight questions, but all of them are about one thing, that run's relations to other runs. That makes it cohesive, not a catch-all. A run's own parts stay outside it.
  - ARCH-REV-034's notes are resolved by the structure: one step-2 enumeration in §4's table (open Tasks by ID, else all; assigner order; first match), and the addresses in use are taken from the reach.
  - Proportionate: the folded owners exist on the branch, and the inventory gives the Implementation Engineer a checklist with an escalation rule.
- **Note 1** (derive a node's `tree`, don't store it). A node's parent edge is fixed, but a parent can stop being a node: if all of its Task entries are deleted, it leaves the tree while a child still named by another Task stays. The model then makes that child a top. Keep this as the rule, "a node whose parent is not a node is the top of its tree". Compute `tree` when asked, or recompute it for the affected subtree in the same `entriesChanged`, so a deletion never leaves a stale label in `byAgentRunId`.
- **Note 2** (steps 1 and 3 from two sources). The map reads steps 1 and 3 from the run's file, while a loaded root resolves them from its live index. The design says the two agree because both come from the same file. That holds while a run's addresses are fixed at launch, which they are at base: an org's agents get only their run IDs late, and those are re-read on a miss. Keep one test where a loaded run's map and its own root give the same step-1 answer.
- **Note 3** (optional). If `CrossRunAddressResolution` ends up as a pass-through to the map, it may fold into the dispatcher. Keep it only if it still owns something, for example the refusal texts.
- **Decision:** `Pass`. The cumulative package is ready for implementation of SR-060.

## Round 34 (narrow): SR-059, a run's in-run set is what it reaches by address

- **Change reviewed** (commit `9bec10150c`, design "What a delegated run sees as in its run", before DS-4; the Implementation Engineer's Design Impact on CR-461-032). `ReachableAgents` computes a run's in-run set as §2.3's reach: its own team, its Task's assigner's standing agents, and its own run's agents. Three readers use it:
  - the `@` note (`run_agent` / `in_run`);
  - `list_available_agents`;
  - `delegate_task`'s in-run placements.

  The root port's in-run read becomes async. A characterization test at `827f1e68dc` captures base's answers.
- **Base verified:**
  - `CollaboratorRootPort.inRunPlacementsByDefinition` (`collaborator-root-port.ts:49`) feeds three things: `resolveMentions` (`collaborator-admission.ts:91`), the list's in-run addresses, and `requireAdmissible`'s "already in the run" refusal (`collaborator-candidate-policy.ts:97, 134`).
  - A hosted copy used its host root's port, so the delegator's placements were in its run.
- **Judgement:** sound. Without hosting, base's in-run set is exactly the agents the run can reach, so "what an agent is told it can talk with" and "what it can reach" become one fact. That holds the non-goal "no change to what an agent reads". The async change is local, because every caller is already async.
- **Note 1** (keep the two readings of §2.3 from diverging). The branch's step 2 (`cross-run-address-resolution.ts`, `assignersAgent`) reads the run's *open* Tasks in Task-ID order, *else all its Tasks*, with assigners in run order and the first match winning. The design text gives `ReachableAgents` "`assignersOf` its open Tasks" only. If the two enumerate differently, then for a run whose Tasks are all closed, a send to `/project_task_manager` still resolves while the note and the list say it is not in the run.
  - Fix: let one enumeration serve both. Either the resolution looks up `ReachableAgents`' address map, or both call one step-2 method.
  - When a definition sits at two reachable addresses, the preferred placement follows §2.3's order (own team before the assigner).
- **Note 2** (base's `addressesInUse`). At base a hosted copy's `addressesInUse()` was its host's, so a catalog address was never allocated onto a delegator's agent address. Take that read from the same set. Otherwise `list_available_agents` can offer a different definition at an address that step 2 already resolves.
- Both notes are about implementation precision and fit the design's one-owner decision. They do not block.
- `walkthrough.py --check` passes. The model does not cover mentions or lists. **Decision:** `Pass` unchanged.

## Round 33 (narrow): SR-058, a run's collaboration context, and rows at every depth

- **Basis:** the shared design principles as updated in the agents repository (commit `fb7be3d` and follow-ups, re-read 2026-11-12):
  - one picture shown in several places is derived by one owner (Principle 11);
  - a required collaborator is a required parameter (Principle 16).
- **Change reviewed** (commit `ae3bdc30ba`, DS-8; code review CRR-016, CR-461-030 and CR-461-033).
  1. **`RunCollaborationContext`**, asked by every kind's member context builder, derives what hosting used to decide:
     - the task-agent role (from `delegatedFrom`);
     - the organization line (when the run's Task's assigner is an org, exactly when address step 2 reaches it);
     - for a copy of an org's configured agent (its `recipientAddress`), that address's handoff rules and the org's authored instruction, read at use from the org's file through the tree.

     Nothing new is stored. Tests check base's texts (CPW rows 2–5 and 8).
  2. **Rows at every depth:**
     - views, `ChildRowsFeed` and the poll carry X's open subtree (`subtreeOf` over open entries), each row with its parent and delegator, nested by the one row builder;
     - the feed reports to X and its ancestors;
     - peer rows are not expanded beyond their members, as at base;
     - the team DTO's always-empty `task_executions` is removed.
- **Judgement:** sound.
  - (1) keeps the non-goal "no change to what an agent reads" with one owner of the derivation and no stored copy.
  - (2) follows REQ-002 ("shown under the run that delegated it"; base nested copies of copies). Contract revision 8 states "one hop" for the stored edge only (`delegatedFrom`, §4 Edge), not for views. One builder serves the view, the feed and the poll (Principle 11, as updated).
  - Row identity comes from the tree and the launch is read fresh (SR-056), so a deeper subtree adds no per-poll file reads.
  - An open run under a closed one does not arise, because sub-work joins its creator's Task.
- **Note (wording):** the DS-8 spine (`design-spec.md:154`) still says "`openChildrenOf(X)` (one hop; the run's own file gives address and members)". Update it to the subtree rule and to SR-056's identity from the tree.
- `walkthrough.py --check` passes (re-run). **Decision:** `Pass` unchanged.

## Round 32 (narrow): SR-057, peer children in the listed-runs poll

- **Change reviewed** (DS-8; code review CRR-013, CR-461-027: a listed, not-open run no longer showed its peer children). SR-055's answer carried local children only and withdrew the stored-view read.
  - The poll's answer now includes each peer child.
  - Its `row` identity comes from `DelegationTree.peerChildrenOf(X)`, in memory: the entry's `nodeId`, `recipientAddress`, `members`, delegator and `linkedAt`.
  - It has no statuses, and nothing is requested from the peer per poll.
  - The web shows the peer row under its delegator, marked with its node; an open view keeps the remote observation.
- **Verified at `827f1e68dc`:**
  - A peer row's title and reachability reach `remoteRunsStore` only through a root's stream: `summary` events, with `refreshOnStream` asking that stream (`remoteRunsStore.ts:32-33, 78-80, 95`).
  - Without a stream, `reachable` stays `null`, which `useMobileRunTree.ts:78` treats as reachable, and the title stays empty.
  - So at base a listed, not-open run showed its peer rows without live status. SR-057 matches that (REQ-009).
- **Judgement:** sound. The rows come from data this node already holds (the Task entry), and no per-poll call goes to another node.
- `walkthrough.py --check` passes (re-run). **Decision:** `Pass` unchanged.

## Round 31 (narrow note): SR-056, the row projection split by data lifetime

- **Change reviewed** (DS-8). The Implementation Engineer found that the view's row projection reads the full row from the child's file, including `source` (the launch), and a Settings save (SR-039) rewrites the launch. My ARCH-REV-030 note had assumed the whole row was fixed for the run's life; for the launch it is not.
  - The **identity** (address, run reference, members with addresses, delegator, `startedAt`, definition IDs) is fixed for the run's life. It is built by one shared builder from the `DelegationTree`'s per-run data, read once, and the poll's `row` is the identity.
  - The **view** adds `source`, read fresh when a snapshot or feed event is built, as today.
- **Verified at `827f1e68dc`:** the run list's delegated rows display no launch details. The `source` in `runHistoryNavigationProjection.ts:106, 166` is a different field (`history` / `draft`); `RunListRow.vue` and `mobileRunTreeProjection.ts` show titles and remote status. So identity-only poll rows lose nothing the list shows.
- **Judgement:** sound. Splitting by lifetime keeps the cheap poll and never caches a fact that can change. The list and the view agree through the shared identity builder.
- `walkthrough.py --check` passes (re-run). **Decision:** `Pass` unchanged.

## Round 30 (narrow): SR-055, one listed-runs poll for every kind, carrying the rows

- **Change reviewed** (commit `a8a6495d2c`, DS-8; code review CRR-012, CR-461-021: a listed team or org that is not open never listed its delegated runs).
  - `runCollaborationStatuses(runs: [{kind, runId}])` replaces `agentRunCollaborationStatuses` for every kind, as a clean cut.
  - Its answer carries, for each open local child, the row record from the view's own projection function (shared with the view and `ChildRowsFeed`), plus its agents' statuses.
  - The web builds every listed, not-open run's delegated rows from that answer, desktop and phone. The re-read rule of SR-040/041 is withdrawn.
  - Tests cover each kind, a closure and a reopen within one poll, and the 100-run limit.
- **Judgement:** sound.
  - One capability has one path, with an explicit compound identity `{kind, runId}` (Principle 10).
  - Rows come from one projection, so the list and the open view agree by construction.
  - Nothing is restored (REQ-004); team and org hubs now list their children (REQ-002, DS-11).
  - Withdrawing the re-read removes a mechanism the answer no longer needs.
- **Note (non-blocking; cost):** the poll covers up to 100 runs every 5 seconds. DS-8 says the view's projection reads a child's address and members from its own file. Build the poll's row records from the `DelegationTree`'s per-run data (read once per run), not from a file read per child per tick. A delegated run's address and members do not change.
- `walkthrough.py --check` passes (re-run). **Decision:** `Pass` unchanged.

## Round 29 (narrow note): SR-054, the contract follows today's results

- **Change reviewed** (commit `5a84b71feb`; code review CRR-008's Requirement Gaps):
  - three delivery texts (by address; by run ID on this node; to another node);
  - peer delegation by description only, with a saved Task refused (S17, S25);
  - `delegate_task` refusals shaped `{ delegated: false, message }`;
  - the org story using a copy of the org's in-run mounted team that carries the org's handoffs (O5–O7);
  - the compiler keeping an outside `to` only when planning a delegated team.
- **Verified at `827f1e68dc`:**
  - the peer delivery text (`remote-refusal-codes.ts:37`);
  - the saved-Task refusal to a peer (`remote-refusal-codes.ts:31`);
  - the address fallback in the dispatcher (`send-message-to-dispatcher.ts:101`).

  `walkthrough.py --check` passes, and `validate_contract_examples.py` shows 0 findings (re-run).
- **Judgement:** sound.
  - Correcting the contract to today's results is what REQ-009 asks; no intended behavior changes.
  - The org story now follows a real path.
  - Limiting the external handoff target to delegated-team planning keeps today's validator check for user-started teams and saved definitions.
- **Decision:** `Pass` unchanged.

## Round 28 (narrow note): SR-053, a narrow Task port for the run services

- **Change reviewed** (commit `3b4599da72`; composition steps 3, 5 and 6). It breaks the second cycle: run services (step 3) → `TaskExecutionResourcePort`, implemented only by `ProjectTaskService` (step 5) → `TaskRunControl` (step 4) → run services.
  - Roots, which do not delegate since SR-049, take a narrow `RunTaskRecords` port: `isOpen` from step 1's `TaskExecutionResourceService`, and `statusChanged` through the Task change marks, both created before step 3.
  - `ProjectTaskService` is created at step 5 with `TaskRunControl`.
  - `TaskDelegation` and the cross-run owners take the full port at step 6.
- **Judgement:** sound.
  - Splitting out a narrower collaborator is the cycle resolution Principle 16 prescribes, and declining a closure listener or a setter (late bindings) was right.
  - `isOpen` reads the same records `ProjectTaskService` wraps, so the gate-head re-check still reads the authority (AR-017), and the records keep one owner (Principle 11).
- **Decision:** `Pass` unchanged.

## Round 27 (narrow note): SR-052, the application host composes the same steps 1–8

- **Change reviewed:** SR-052 replaces SR-050 and SR-051.
  - The application host composes the same steps 1–8 as the studio.
  - At base it binds the Task records and runs the hosting lifecycle; application-owned team members, who are offered `delegate_task`, are refused at placement with base's texts (self, own team, `delegationTargetUnavailableMessage`).
  - `TASKS_UNAVAILABLE_TEXT` there was the branch's regression from not composing delegation. `UnavailableTaskDelegation` and the null collaborators are withdrawn.
- **Judgement:** sound, and better than SR-050.
  - One composition for both hosts means base behavior holds by construction: the application-bound rule stays in placement, with base's texts.
  - No special stand-ins are needed (Principles 13 and 16), and the agent reads today's texts (the non-goal).
  - The characterization test at `827f1e68dc`, with the same texts asserted in the branch, settles the round-25 and round-26 note.
  - A non-application run's delegation and closure in the application host are tested.
- **Note (non-blocking):** the application host lacks some studio pieces (no credential proxy, possibly no peer collaboration or web view streams). Where a step's collaborator does not exist there, pass the host's real equivalent explicitly (for example an empty stream session registry, or the absent peer channel as at base), never a lookup.
- **Decision:** `Pass` unchanged.

## Round 26 (narrow note): SR-051, the application host's refusal text

- **SR-051's claim:** "at `827f1e68dc` every application-host `delegate_task` is answered `TASKS_UNAVAILABLE_TEXT` right after the identity check (`authorizeIdentity` → `delegateThrough`)". On that basis it keeps `UnavailableTaskDelegation` answering that text to every call.
- **Re-checked at `827f1e68dc`:**
  - `delegateThrough` does not exist at base. It is a branch construct, so the claim describes the branch, not base.
  - At base the application host **binds** the Task resources and passes them to its runtime (`start-standalone-application-host.ts:242, ~265`, `taskExecutionResources`).
  - The base lifecycle resolves the work and its Task through `port()` first, then places the run (`root-task-execution-lifecycle.ts:140-165`). The application-bound rule refuses at placement (`collaborator-admission.ts:112` returns no source).
  - So at base an application-owned run's `delegate_task` does not get "Tasks are not available here" (`root-task-execution-resource-scope.ts:43`, raised only when no resources are bound). It gets the placement refusal, after the Task step.
- **My round-25 note was imprecise as well:** there is no separate root-level application refusal; `UNAVAILABLE_APPLICATION_ROOT` belongs to the `@` candidate list. The note's aim stands: an application-owned agent should read today's text.
- **Restated note (non-blocking):** take the exact text an application-owned run's `delegate_task` gets at `827f1e68dc` from a test run on the base revision, and assert that same text in the branch test. If it differs from `TASKS_UNAVAILABLE_TEXT`, `UnavailableTaskDelegation` answers with base's text. If application-owned agents are not offered `delegate_task` at all, record that, and the text question is moot.
- **Decision:** `Pass` unchanged.

## Round 25 (narrow note): SR-050, the application host's composition

- **Change reviewed:** the second composition root, the application host (`start-standalone-application-host.ts:242-268`), composes steps 1–3 through the same composition file. It passes explicit null collaborators that keep today's behavior:
  - `UnavailableTaskDelegation` (with `TASKS_UNAVAILABLE_TEXT`);
  - a run control that releases nothing and reports no status;
  - no cross-run delivery;
  - no local children.

  A test asserts each answer.
- **Verified at `827f1e68dc`:** an application-owned run has an empty catalog, and collaborator admission returns null for it (`collaborator-admission.ts:112`; `collaborator-candidate-policy.ts:110-175`, `UNAVAILABLE_APPLICATION_ROOT`). So application-host runs cannot delegate today, and the null collaborators preserve that (REQ-010, DEC-006).
- **Judgement:** sound. The null objects are passed by the composition root and give their own explicit results, so they are visible collaborators, not absence fallbacks (Principles 13 and 16).
- **Note (non-blocking; agent-facing text):** today an application-owned run's `delegate_task` is refused by the application-root rule. Keep that order: the root's own refusal (`delegationSource`) is answered before `UnavailableTaskDelegation`'s `TASKS_UNAVAILABLE_TEXT`. Otherwise the agent reads a different text, against the non-goal "no change to what an agent reads". Make the test assert the exact text an application-owned run gets.
- **Decision:** `Pass` unchanged.

## Round 24 (narrow): SR-049, a root does not delegate; the tool path orchestrates

- **Change reviewed** (commit `ebcb3a0f52`; DS-1, DS-3, the composition section). This resolves the cycle the Implementation Engineer found: roots, created by the run services, called the delegation owners through `delegateThrough`.
  - `delegate_task` tool service → `TaskDelegation` → the sender's root, asked in its gate only for its own facts (`delegationSource`).
  - `send_message_to` dispatcher → the root (step 1, and step 3 with no Task), and `CrossRunAddressResolution` (step 2).
  - `TaskWorkerStatusNotice` takes the Task side, and `TaskRunControl.statusChanged` goes.
  - `GlobalAgentRunMessageRouter` is constructed by the composition root (its getter's callers are FU-011).
  - The steps move to a dedicated composition file, called twice in order.
- **Judgement:** sound.
  - It brings delegation in line with Principle 13: `TaskDelegation` now calls each mechanism itself, in order, instead of a root reaching it through a passed-in function.
  - Dependencies run one way: tool services → delegation and cross-run owners → root resolver → run services.
  - The round-22 notes are applied: the stream session registry is its own owner before `ChildRowsFeed` and the handlers, and a Task change without an entries listener fails.
- **Checked for a remaining cycle:** run services → agents → tools → tool services → `TaskDelegation` → run services. At `827f1e68dc` the agents' tools come from the framework's `defaultToolRegistry`, and reach their dispatchers through existing initializers (`send-message-to.ts:40`, `getSendMessageToDispatcher()`; the task-delegation tool router).
  - That is the framework-edge case Principle 16 allows.
  - The section's rule ("a consumer created by an older singleton receives the owner through its existing initialization call") covers it.
  - Step 8 installs them before any run can call a tool, since restart resume runs after the composition.
  - So there is no construction cycle.
- **Notes (non-blocking):**
  1. State this tool path explicitly in the composition section: framework registry → existing dispatcher and router initializers, installed at step 8.
  2. Step 8 lists `GlobalAgentRunMessageRouter` twice; keep one bullet.
- `walkthrough.py --check` passes (re-run). **Decision:** `Pass` unchanged.

## Round 23 (narrow note): SR-048, restore, switch to live, then post

- **Change reviewed** (commit `cd1a170883`, DS-8): a member message that restores a stopped team now goes restore → switch to live (in-band snapshot, then subscribe) → post. So the `MEMBER_INPUT_MESSAGE` echo is an ordinary live event after the snapshot's base. No contract change.
- **Verified at `827f1e68dc`:**
  - A team send settles in the `teamSends` tracker by identity (`agentRunId`, `messageId`, `dedupeKey`) when the echo is applied (`TeamStreamingService.ts:356-358`; `teamSendAdmission.ts:60-70`). It does not depend on `pendingInput`.
  - Only the manual recovery drains `teamSends` (`enterReopenRequired`); a snapshot doesn't.
  - So the new order settles the first message, and posting before the switch could lose the echo, as SR-048 says.
- **Judgement:** sound. Rejecting option (b), a contract change for an ordering problem, and option (c), behavior by absence, is right.
- **Note (wording):** the round-21 residual (the restore snapshot must carry the member's input state) is superseded by this order. The snapshot now precedes the post, and `pendingInput` is set afterwards by the input-state events. DS-8 line 199 still says the snapshot "keeps the restoring member's input state … (`teamExecutionViewState.ts:335-338`)", but that code clears `pendingInput` (harmlessly here). Reword it to name the send tracker that settles the send.
- `walkthrough.py --check` passes (re-run). **Decision:** `Pass` unchanged.

## Round 22 (narrow): SR-047, Principle 16 (visible dependencies, one composition root)

- **Basis:** the updated shared `design-principles.md` (Core Principle 16, "Hidden dependency" trigger) and the report template's new check line, re-read on 2026-11-11 (skill update, commit `3bd963e` of the agents repository).
- **Change reviewed** (commit `07e2a5f81a`, design "Dependency Rules And The Composition Root"):
  - the trigger fired and was recorded with evidence: seven process bindings this ticket added, and nine `find…()?.… ?? fallback` sites;
  - none is kept;
  - one composition root, `build-studio-server.ts`, creates the owners in a written order without a cycle (`ProjectTaskService` after `TaskRunControl`, which splits `composeProjectTaskExecutionResources`), and lists the consumers that receive each owner;
  - a missing owner is a startup error; tests build owners with constructor fakes; release runs in reverse order;
  - FU-011 is narrowed to the older lookups the change only uses.
- **Verified:** 469's `OpenDelegatedRunSource` binding no longer exists in the worktree's `autobyteus-server-ts/src` (grep), so this change replaced it.
- **Principle 16 check line:** owners receive their collaborators from the composition root; no process-wide lookup hands out an owner this ticket adds; no missing collaborator becomes a silent no-op or fallback: `Pass`.
- **Notes (non-blocking; correct in the spec and the code):**
  1. **Order:** step 2 calls `childRowsFeed.follow(delegationTree)`, but `ChildRowsFeed` is created at step 7. Move the follow to step 7. Name the stream session registry as an owner created before both `ChildRowsFeed` and the three stream handlers, and pass it to both, so the feed does not need the handlers that receive it.
  2. **The setter:** `taskExecutionResources.setEntriesListener(delegationTree)` wires a notification listener after construction. That is acceptable as a narrow collaborator in the composition root (Principle 13 allows callbacks for notifications). But a Task change while no listener is set must fail, not skip, to match "a missing owner is a startup error". Alternatively pass the listener at construction and build the tree after `load()`.
- `walkthrough.py --check` passes (re-run). **Decision:** `Pass` unchanged.

## Round 21 (narrow): SR-046, the view session serves a stopped run without restoring it

- **Change reviewed** (commit `d95ed86fa7`, DS-8). No stream kind restores or starts its run to serve a view.
  - The standalone stream is as before.
  - Team and org view sessions have two modes, owned by the session:
    - **stored**, while the run is not managed: a snapshot from the run's own stored file through the same view projection, child rows from the tree, `ChildRowsFeed` events and the children's output, child commands to the child's own root; a message to one of its own members restores the run through its ordinary service;
    - **live**, while it is managed: today's session.
  - The session switches modes on the run's lifecycle, sending a fresh in-band snapshot with a new `change_sequence` base.
- **Verified:** the Team client applies an in-band `TEAM_EXECUTION_VIEW_SNAPSHOT` mid-stream and takes its `base_change_sequence` (`teamExecutionViewState.ts:330-333`, at `827f1e68dc`), so a mode switch can't cause a gap. The team service already exposes `subscribeToLifecycle` (`team-run-service.ts:81, 258`).
- **Judgement:** sound, and it resolves AR-023. A stopped team or org stays unmanaged ("active" keeps meaning "running"), so its stopped-run Settings and archive gates hold (REQ-006 / AC-010, REQ-007), watching starts nothing (REQ-004), and the child rows and output are live (AC-007, SCN-005). The "active vs managed" split is correctly not taken.
- **Residual (test):** on a snapshot the Team client clears a member's pending input when that member has no input state in it (`teamExecutionViewState.ts:335-338`). The live snapshot sent when a member's message restores the run must carry that member's input state, so the triggering message keeps its pending state. Make the "continuing after one snapshot" test assert it.
- `walkthrough.py --check` passes (re-run).

## Round 20 (narrow): SR-045, a view's stream lives with the open view

- **Change reviewed** (commit `e664c088ef`, DS-8; code review CRR-005, CR-461-006):
  - every client (agent-run, org, team, phone) keeps a view's stream while the view is open, active or stopped;
  - a stopped run's snapshot is ordinary;
  - readiness is the stream's own;
  - child commands go to the child's own root;
  - server: "a view stream's connect never starts or restores the run".
- **Sound on the web side, and for the standalone server:**
  - the rule, readiness, and child commands that never start the delegator (REQ-004);
  - the standalone connect's `readyRoot` loads the root without starting the host, and the stopped-run gates there ask the host (`standalone-stopped-run-selection-updater.ts:59`, `getActiveRun`; `standalone-run-liveness.ts`), so a loaded root does not make the run look active.
- **Not sound for the team and org servers (AR-023).** At `827f1e68dc`:
  - **Team:** the stream connect calls `teamRunService.resolveActiveTeamRun` (`agent-team-stream-handler.ts:64, 240`), which **restores** a stopped team (`team-run-service.ts:215-219`, `restoreTeamRun`). A managed team counts as active: `getLifecycleSnapshot` returns `isActive: hasManagedTeamRun`, `updateStoppedRunLaunchChanges` refuses with `RUN_ACTIVE` when managed, and the archive and delete gate answers "managed" (investigation notes, standalone design investigation; `agent-team-run-manager.ts`).
  - **Org:** the stream connect serves only an active run (`agent-org-stream-handler.ts:53`, `service.getActive`), so a stopped org's view stream cannot open at all.
  - So the design's server line holds for the standalone stream only.
- `walkthrough.py --check` passes (re-run).

## Round 19 (narrow): SR-044, unsequenced and idempotent child-row events

- **Change reviewed** (commit `93af93a01f`, DS-8). `CHILD_RUNS_CHANGED` carries no `change_sequence`, and the Team client neither checks nor advances its sequence for it. It applies the event by membership:
  - an `added` row the view already holds is skipped;
  - a `removed` row it doesn't hold is ignored;
  - a row that left and came back ends as the event says.

  The stream session (every connection, all three kinds) owns the order against the snapshot: an event published while a snapshot is built is held and sent right after it, and the snapshot reads the tree when built.
- **Judgement:** sound, and it resolves AR-022.
  - Child-row membership belongs to the `DelegationTree`, so it does not need a team root that is stopped.
  - Every ordering against the snapshot gives the same result: the change is either in the snapshot (the held event is a no-op) or applied after it. Duplicates and unknown rows are no-ops. No gap and no recovery is possible.
  - The tests cover a stopped team's open view, a change racing a snapshot, and duplicate and unknown rows.
- `walkthrough.py --check` passes (re-run).

## Round 18 (narrow): SR-043, the Team view applies child-row changes in place

- **Change reviewed** (commit `bc83ed7ea4`):
  - `child_runs_changed` / `CHILD_RUNS_CHANGED` carries `{ run_id, added: [row records], removed: [run references] }`, built with the view's own projection function;
  - the Team client inserts (`insertTaskExecution`), removes subtrees (new `removeTaskExecution`), hands back focus and reconciles navigation in place, never through `team_stream_recovery_required`;
  - the agent-run and org clients keep their automatic `checkpoint_required`;
  - a test covers a pending send and approval surviving a change.
- **Sound:** the payload, the in-place apply and the corrected DS-8 sentence answer round 17. `walkthrough.py --check` passes (re-run).
- **Remaining gap (AR-022, narrowed again): the Team stream's sequencing.** The Team client accepts a sequenced event only at exactly `changeSequence + 1`, and a gap is rejected (`TEAM_EXECUTION_CHANGE_SEQUENCE_GAP`) into the manual recovery (`teamExecutionViewState.ts:290-291, 370-371`, at `827f1e68dc`). An event without `change_sequence` skips the check (`:371`), but then it can race the snapshot, and `insertTaskExecution` throws on a run the view already holds (noted in 469 D-8). DS-8 does not say:
  - whether `CHILD_RUNS_CHANGED` is sequenced;
  - who allocates its `change_sequence`, given that `ChildRowsFeed` publishes "whether or not X's own run is active" and a stopped team run has no loaded root to own its sequence;
  - how a duplicate `added` row, or a `removed` row the view does not hold, is applied.

## Round 17 (narrow): SR-042, live child rows in an open view

- **Change reviewed** (commit `567416afc0`, DS-8 "Live child rows in an open view"):
  - the `DelegationTree` reports `childRowsChanged(X)` synchronously inside each Task change;
  - `ChildRowsFeed`, the one listener, publishes `child_runs_changed` / `CHILD_RUNS_CHANGED` `{ run_id }` on every open view stream of X, active or not, never starting X;
  - the web answers with `checkpoint_required` and re-reads the view;
  - the four hosting-era events are replaced; `remote_task_execution_summary` stays.
- **Sound:** the source (the tree, already current inside the Task change), the single owner (`ChildRowsFeed`), publishing after the tree update, one event per X, never starting X (REQ-004). For the **agent-run and org views** the answer is right: they reload themselves on `checkpoint_required` today.
- **Not sound for the Team view.** The claim "the web answers it as today's `task_execution_started` is answered, with `checkpoint_required`" does not hold there:
  - At `827f1e68dc` the Team client has no `checkpoint_required`. Today it answers `TASK_EXECUTION_STARTED` by inserting the event's record (`teamExecutionViewState.ts:385-402`).
  - Its only re-read path is `team_stream_recovery_required` → `TeamStreamingService.enterReopenRequired` (`TeamStreamingService.ts:364-427`). That path disconnects, cancels pending interrupts and team sends, clears the approval tracker, and raises the recovery the user resolves by hand. This is the manual step that 469's CR-003 found and 469 D-8 avoided by carrying records in the event.
  - See AR-022.
- `walkthrough.py --check` passes (re-run).

## Round 16 (narrow): SR-041, answer to AR-021

- **AR-021 resolved:**
  - The poll answers no digest, and the web re-reads only on a difference in active state or local children.
  - Each former FU-008 item is removed in this ticket, with its contract, readers and files listed in the removal plan (its producer is removed or touched here). FU-008 is withdrawn.
- **The round-15 residual is resolved:** the `DelegationTree` keeps each run's agents by run ID and address, read once (contract §4, the model). `walkthrough.py --check` passes (re-run).
- **New gap surfaced by the removal (AR-022):** the removal plan says "a reopened child comes back through the view's child list". DS-8 builds that list when the view is opened (`openChildrenOf`). For a view that stays open, the design names no path by which its child rows follow later tree changes: a new delegation, a closure, a reopen, a deletion.
  - Today the hosting lifecycle pushed `task_execution_started`, `task_executions_closed` and `task_executions_reopened` to the root's stream.
  - That producer is removed, `TASK_EXECUTIONS_REOPENED` is removed (SR-041), and the history poll covers only listed runs that are **not** open (DS-8).

## Round 15 (narrow): SR-040, the history poll `agentRunCollaborationStatuses`

- **Change reviewed** (commit `02494288ec`; code review CRR-003, CR-461-002): the poll is a second consumer of the view's projection (DS-8).
  - Server, for active and stopped runs alike, never restoring: `isActive`; the agents of the view's local child rows (`openChildrenOf`, one hop), each with its address and its status from the child's own root, else `offline`; and `closedTaskExecutionsDigest`, which is constant because closed children leave the view.
  - Web: one rule for every hub. Re-read when the active state, the local children or the digest differ, at most once per distinct answer; otherwise apply the statuses. The stopped-host branch goes.
- **Sound:**
  - one projection for the view and the poll, so they agree by construction;
  - nothing is restored (REQ-004);
  - removing the stopped-host branch is correct now that children outlive a stopped delegator (REQ-001, REQ-002);
  - the once-per-answer guard ends a re-read loop.
- **Not sound:** the digest. See AR-021.
- `walkthrough.py --check` passes (re-run).

## Round 14 (narrow note): SR-039, a stopped child's launch edited in its delegator's Settings

- **Change reviewed** (commit `394bb81719`): `updateDelegatedLaunchSelections` routes each child `change` to that child's own ordinary stopped-run save, by its identity, as `DelegatedRunCommands` routes Stop: an agent child through `AgentRunService.updateStoppedSelection`; a team child's team-level or member row through the child team's own stopped save. This replaces `userLaunchSelection` in the delegator's tree (removed by TC-5). Order: check every child first (stopped, else `COPY_RUNNING`; every patch valid), then apply the parent's own patches, then each child in row order. A failure after a write reports the runs saved and the one that failed, and the editor reloads. The web is unchanged.
- **Judgement:** sound. It keeps REQ-009 (the edit stays available) and the ownership rule (no run writes another run's file).
  - The loss of one atomic write is a proportionate trade-off. The check-first step leaves only a write error, or a child that starts between the check and its save, to cause a partial result. Each saved run's file stays its own truth.
  - Today's Save is not fully atomic either: the host's own model is written separately after the tree (`standalone-agent-run-root-manager.ts:350-355`).
- **Note (non-blocking):** since the web is unchanged, report a partial failure through an outcome the editor already shows, for example `PERSISTENCE_FAILED` with a message naming the runs saved, so no new client branch is needed.
- `walkthrough.py --check` passes (re-run). **Decision:** `Pass` unchanged.

## Round 13 (narrow note): SR-038, a peer child row's launch details

- **Change reviewed** (commit `6c19bc7e83`): a peer child row's launches (REQ-009) are read from the peer while the view is open; nothing is stored on the delegating node. The peer's run summary gains `launches` per agent, read from the run's own file on its node, and `remote-task-execution-dto-projection.ts` reads them from that answer. Contract §3.1 and DS-8 are updated; the model is unchanged; `walkthrough.py --check` passes (re-run).
- **Verified:** the peer's summary path is read-only today (`peer-gateway.ts:231-234`, autobyteus-278). Reading the launches from the stored file restores nothing, so REQ-004 holds. 0 of the 2 stored peer links hold launches, so dropping them in migration E3 loses nothing.
- **Judgement:** sound. There is one owner of the fact (P4, CM-10), and nothing is stored that could go stale. The change to the summary payload between nodes is a clean cut, because both nodes run the same release (`DESIGN.md` rule 9). A peer that cannot answer shows no launches, the same way it degrades for the title and statuses.
- **Decision:** `Pass` unchanged.

## Round 12 (narrow note): SR-037, a run never delegates to its own definition

- **Change reviewed** (commit `0420f7e0f4`): SR-025's DL-11 "new copy" is withdrawn as a misreading of today's behavior. `delegate` in `model.py` refuses the sender run's own definition; U7 is that refusal; new state U8 is a description-only delegation (DL-8). The requirements' exception and the design's test line are corrected.
- **Verified:** today's code refuses a run's own definition (`collaborator-candidate-policy.ts:181`, `ownDefinitionError`, at `827f1e68dc`), as autobyteus-455 AC-006 requires. `walkthrough.py --check` passes (re-run).
- **Judgement:** correct, and it brings the model back to today's behavior. The user's approved exception (SR-035) only narrows: the new copy is gone and the refusal text inside a delegated team changes to the own-definition text other teams already give. Informing the user is sufficient.
- **Decision:** `Pass` unchanged.

## Round 11 (narrow note): SR-036, how members learn their new addresses

- **Decision reviewed** (commit `218e1d3dde`): nothing is stored and nothing is notified. An address under the team's `recipientAddress` (the old prefix) is refused with a correction naming the address to use; the team's old address names the coordinator. Contract §2.3, A-5, A-6 and S24; `model.py` `resolve`; the requirements' exception text. `walkthrough.py --check` passes (re-run).
- **Judgement:** sound. It is computed from the Task entry, adds no stored marker and no prompt text, and keeps working after the migration. It is less agent-visible than the "told once" the user approved at SR-035, so it stays within that decision; the user is informed (SR-036).
- **Note (non-blocking):** in `model.py` `resolve` the correction runs after step 1 and **before step 2** (the assigner's standing agents). It can shadow a real step-2 target only if a delegated team's `recipientAddress` equals a standing address of its assigner. The delegator's catalog address map avoids addresses in use (`catalog-address-map.ts`), so this should not arise. Checking the correction after step 2 removes the question at no cost; otherwise add a test that a delegated team's `recipientAddress` never equals one of its assigner's standing addresses.
- **Decision:** `Pass` unchanged.

## Round 10: Answers To Round 9 (SR-034, SR-035)

| Finding | Answer | Verified against | Status |
| --- | --- | --- | --- |
| AR-019 | The user decided option 1 (every team at its own root `/`). His words are in SR-035: "Option 1 actually makes sense … When I address my team member, I should feel like I'm on the root"; "we definitely use option one". The requirements' non-goal records the approved exception: teammates' addresses, the one-time notice, and DL-11's new copy. The TC-12 row is decided by the user | `solution-revision-record.md` SR-035; `requirements-doc.md:76` | Resolved |
| AR-020 | The model fences a peer's run on Task closure. Nothing is sent to node B; messages are refused with the closed-Task text; the run stops by its own idle shutdown. S19 and T-1 are corrected, with "Today: the same" now true | `model.py` `_stop_runs_without_open_task`; `stories.py` S19; base `remote-endpoint.ts:44-46` | Resolved |
| Round-9 note | Address step 2 applies by the run's Task entries; a run of a deleted Task uses step 3 (§5.4.4) | `model.py` `resolve` | Resolved |
| AR-018 | Stands: TC-12 revised is now approved | — | Resolved |

## Round 9: SR-025 … SR-033

- **AR-018, technically resolved.** Every team run is rooted at `/` (TC-12 revised), so no reader of `/` changes. The delegation address moves to the Task entry's `recipientAddress`. The handoff compiler keeps a delegated team's outside `to` as an external target, resolved when sent. Migration step 4 rebases 153 of 153 teams without a collision. The intent behind it is AR-019.
- **TC-13** (one log location per agent run; step 5b moves 8 logs; an unfinished `20261018_…` item is left for its own retry), **the peer member addresses** (team-local on both nodes; 4 stored addresses lose their prefix in step 3) and **contract §2.4** (`task_id` refused for a run that works on a Task; sub-work joins the newest open entry, refused when none is open): sound and consistent with the model. §2.4 equals today's `new-copy-work.ts` and `ownerOf` behavior.
- **The executable model.** A good reference. `model.py` expresses §2 … §4 faithfully: `can_message` is rules (a) and (b); `resolve` is the address steps; `delegate` is §2.4; the reactivation goes through the last `assigned` entry; the tree is derived from the entries. The checks pass, and the stories cover the user-started kinds, nesting, closure, reopen, deletion, a peer node and refusals. Two notes:
  - `resolve` chooses address step 2 by the presence of the sender run's own `delegatedFrom` (`model.py:170`). For a run whose Task was deleted, that sends it to step 2 with no entries and returns "not found". The readers rule says routing reads the Task entries. Make the model choose by the run's entries (or by `isDelegated`, stated in §2.3) so the reference and the readers table agree.
  - **S19 / `model.py:401-404` stop a peer's run on Task closure** and state "Today: the same". That is not today, and it contradicts the requirements. See AR-020.
- **Known limits** (the migration is not a story; peer delegation from an org or a delegated team; idle, restart and legacy in prose): acceptable as follow-ups. The migration keeps its own fixtures (DS-10).

## Round 8: TC-12 (SR-024)

- **The decision is sound.** One team file shape, whose root address is the team's own address: `/` when the user started it, the delegation address when delegated.
  - It keeps every stored member address (770 agents keep their names), which beats rebasing to `/`, and is one model rather than two.
  - The measurements support it: 153 of 153 delegated teams are rooted at their delegation address with members under it, and 601 of 601 user-started teams at `/`.
  - The migration of `teamDefinitionName`, `followsTeam` and the selections, and the member's optional `launchSource`, are consistent with TC-5.
- **Gap (AR-018):** the change touches more than the schema. Until now a top-level team run was always rooted at `/`, because even the peer path creates `/`. The code equates "the root team" and "the team-level scope" with `/` in many places, and compiles handoffs against the team's own topology at plan time. The design names only the schema.

## Round 7: Answers To Round 6 (SR-023)

| Finding | SR-023 answer | Verified against | Status |
| --- | --- | --- | --- |
| AR-016 | Two named tests, `isDelegated(run)` (`delegatedFrom` present) and `isPeerStarted(run)` (`nodeId` present), in contract §2.4. Decisions per reader: peer endpoint and channel (`standalone-agent-run-root.ts:148`, manager `:208-211, 345`, `team-run-remote-links.ts:23`) → `isPeerStarted`; idle shutdowns (`:153`, `root-team-run.ts:201`) → `isDelegated`; runtime-switch exclusion (`standalone-agent-run-eligibility.ts:16`) → `isPeerStarted`; back-link message view (manager `:447-449`) and `storedBackLink` (`coordinating-tree-shapes.ts:35`) → removed, because 469's view rule needs no back-link. Tests for DS-2 to the delegator, the idle shutdown and the runtime switch | The round-6 reader list at `827f1e68dc` | Resolved |
| AR-017 | `entriesChanged(taskId)` is called synchronously inside the Task's ordered change, before it resolves and before that Task's next change; the tree re-reads from the port's memory. The gate-head re-check reads the Task side's port (`isOpen`), the authority. Interleaving test in both orders | Ordering table row 1; contract §2.6 | Resolved |

- **Contract §13 (every case as JSON):** consistent with §2 … §11. For example, D7 (peer-started) is recognized by `nodeId`, with no Task entry and no tree node on the receiving node. No rule changed.
- **DS-10:** only a non-empty `collaborators` list counts as a predecessor's unfinished item. The 39 empty lists are current residue and are not read. Correct.

## Round 6: Contract Revision 6 (SR-022)

- **TC-10 revised, two stored copies of `delegatedFrom`.** Accepted as the user's decision. The value is fixed at creation, written by one owner (`TaskDelegation`), and equal by rule (validated 181 of 181). The readers are split: routing, placement and lifecycle read the Task entries; the label, the Memory page and a test read the run's copy.
  - **Gap:** the readers table says "only these read it", but at base at least eight code paths read a run file's `delegatedFrom` and treat its presence as "a peer started this run". See AR-016.
- **TC-11, `DelegationTree` owned by collaboration.** Sound:
  - one structure for views, totals, the notice and `canMessage`;
  - the Task side notifies; the dependency on the Task port is one way;
  - validated as a forest (183 nodes, no second parent, 0 cycles), with `canMessage` equal to the record rule for 230 of 230 pairs.
  - **Gap:** whether the tree is current when a gate head re-checks the rule. See AR-017.
- **`CrossRunMessageDelivery`:** same order as SR-021 (receiver accepts and logs, then the sender logs). Unchanged and sound.
- **DS-10 step 4** (`taskAgent` → the run's `delegatedFrom`): consistent. A preserved run keeps `taskAgent` and has no copy, so it shows no label.

## Round 5: DS-10 (SR-021)

- **Route (a) adopted, for all four predecessors.**
  - No `prerequisiteMigrationIds`; the migration is registered after the four. `runPending` runs every pending migration in order and continues past a failure (`app-data-migration-runner.ts:79-100`), so this migration runs in every start.
  - Every Task entry is converted in every case, so the target-only runtime never meets an old-shape Task. MP-C is closed.
- **Each predecessor's status rule was traced** (FAILED on any failed item; retried at every start), and none of them touches Task records. The premise is reconciled: the preserved states arrive with the predecessor FAILED.
- **A predecessor finishing an item later is coherent:**
  - v1 re-reads ownership from the own files this migration leaves untouched.
  - v2 reads a coordinating tree only for copies of configured places, which are team and org trees whose member parts step 6 keeps (`…-app-data-migration.ts:111-113, 164-174`).
  - What they write later (`taskAgent` on an own file, a link in a kept tree) is ignored or not read. The child's Task entry is already current.
- **Tests:** each predecessor FAILED → this migration → node usable; a predecessor finishing later; the tolerant read of `taskAgent`.

## Round 4: DS-10 (SR-020)

- **Route (a) is adopted.** Step 1 converts every Task entry, including a preserved run's, from its own file, else from the kept full record through a frozen reader, else from `assignedBy`. A Task file therefore never mixes shapes; this closes ARCH-REV-003's narrow case. The fixture for it is added.
- **A preserved run's own file keeps `taskAgent`.** Read as an ordinary run, it is a generic tolerant read: the new reader drops every `taskAgent` reader, and an unknown extra field is not a compatibility branch (Principle 5). Implementation must assert this in a test. The run's next metadata write drops the field; the tree's kept record remains the recovery copy.
- **The `TaskRunIndex` residual is resolved.** Standalone and team runs never gain agents, and an org run is re-read on a lookup miss.
- **New gap in DS-10's premise (AR-005, below).** The state the preserved branch is written for arrives with `20261017_task_agent_own_run_v1` **FAILED**, not with a warning success. In that state the prerequisite hold keeps this migration from running at all.

## Material Premise Validation (round 4)

### `MP-C` — This migration is held because `20261017_task_agent_own_run_v1` is `FAILED`

- Related contract: REQ-011 ("the app starts and stays usable"), AC-014 ("the app starts in every case"), QR-003; Data Migration Guideline (no lockout; lessons of v1.4.87).
- Initiating basis kind: `Operational`.
- Trigger: MP-A's trigger. One run's v1 step ends `FAILED_OPERATION`, for example "'<target>' already exists; it is never overwritten", which re-fails at each start.
- Path:
  1. v1 records `FAILED` (`task-agent-own-run-v1-app-data-migration.ts:129-132`), and the runner treats `FAILED` as pending again at every start (`app-data-migration-runner.ts:190`).
  2. This migration declares v1 as a prerequisite, so the runner refuses it (`:145-157`), again at every start, until v1 succeeds.
  3. The new runtime then starts on data that still has the old shapes. Every Task record has `hostRoot` and no `delegatedFrom`. The strict per-entry parse (`task-execution-resource-schema.ts:19-66`) marks every Task damaged (`task-execution-resource-service.ts:56-63`).
  4. Every delegation answer, view row, message admission between runs and Task closure fails. Every delegated run file still has `taskAgent`, every tree still has its lists, and there are no history rows for delegated runs.
- Consequence: a lockout of the Task and collaboration features on the whole node for as long as one released item keeps failing.
- Reachability: `Reachable` (the same per-run failure as MP-A).
- Also: with v1 `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`, `reduceTree` has reduced every record whose descendants are all owned. The "warning success leaves a kept entry" branch of DS-10 therefore covers a state that the released code does not obviously produce, while the state it does produce (v1 `FAILED`) is held out.

## Review Decision

`Pass`. AR-032 is resolved (round 65). AR-001 … AR-032 are resolved, and the design is ready for implementation.

## Findings

None open.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). The Solution Designer is informed.

## Residual Risks

Non-blocking.

- **Round 66 note:** a retry re-opens the ended shared observation; coalesce concurrent retries.
- **Round 65 note:** assert that team-member and org-agent `AgentRun`s, lazily started ones included, have a sequence.
- **Round 52 notes:** classify the address and path migrations; the stale "residue is inert" paragraph.
- **Round 48 note:** bind the snapshot's log filter to the tree of the synchronous step.
- **Round 47 note:** deliver every queued message frame.
- **Round 44 note:** a refused input must not register the root.
- **Earlier notes:** rule 2's panels; one binding source; the DS-8 `:302` wording; derive `tree`; the step-1 agreement test; the residuals of earlier rounds.
- **Recommendation:** implement the snapshot-connection rule once, shared by the view, agent and peer streams.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: SR-090 was reviewed in round 66 (narrow). No open findings.
